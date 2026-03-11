console.log("Starting server.js...");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_API_KEY';
const CURRENT_THRESHOLD = 0.5; // Amps
const IDEAL_CYCLE_TIME = 12; // Seconds

// In-memory state for real-time calculation (persisted to DB periodically)
let machinesState = {};

// Helper to initialize machine state if not exists
const initMachineState = (id) => {
    if (!machinesState[id]) {
        machinesState[id] = {
            current: 0,
            good: 0,
            ng: 0,
            lastPulse: Date.now(),
            state: 'downtime',
            lastStateChange: Date.now()
        };
    }
    return machinesState[id];
};

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Helper Functions ---
const getShift = async () => {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const [rows] = await pool.query('SELECT * FROM shifts WHERE ? BETWEEN start_time AND end_time OR (start_time > end_time AND (? >= start_time OR ? <= end_time))', [timeString, timeString, timeString]);
    return rows[0] || { id: 3, name: 'Night' }; // Default fallback
};

// --- Routes ---



// Auth
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log(`Processing login for ${username}...`);
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        console.log(`Login attempt for ${username}: Found ${users.length} users`);
        if (users.length > 0) console.log(`Stored Hash: ${users[0].password.substring(0, 20)}...`);

        if (users.length === 0) {
            console.log(`Login failed: User ${username} not found`);
            return res.status(401).json({ error: 'Invalid credentials: User not found' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        console.log(`Password check for ${username}: ${validPassword}`);

        if (!validPassword) {
            console.log(`Login failed: Invalid password for ${username}`);
            return res.status(401).json({ error: 'Invalid credentials: Password incorrect' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. Signal Endpoint (From IR Sensors or Relay Contacts)
app.post('/api/signal', async (req, res) => {
    const { type, machine_id = 1 } = req.body; // Default to machine 1 if not provided

    if (!type || (type !== 'good' && type !== 'ng')) {
        return res.status(400).send('Invalid signal type');
    }

    try {
        const shift = await getShift();
        await pool.query('INSERT INTO production_events (signal_type, shift_id, machine_id) VALUES (?, ?, ?)', [type, shift.id, machine_id]);

        // Broadcast distinct event for frontend animation/updates
        io.emit('signal_event', { type, machine_id, timestamp: Date.now() });

        // Update in-memory count for dashboard efficiency
        const mState = initMachineState(machine_id);
        if (type === 'good') mState.good++;
        else mState.ng++;

        io.emit('data_updated', { machine_id });

        res.sendStatus(200);
    } catch (e) {
        console.error("Signal Log Error", e);
        res.sendStatus(500);
    }
});

// 2. Machine Status Endpoint (From PZEM)
app.post('/api/machine-status', async (req, res) => {
    const { current, machine_id = 1 } = req.body;

    if (current === undefined) return res.sendStatus(400);

    const val = parseFloat(current);
    const newState = val > CURRENT_THRESHOLD ? 'running' : 'downtime';

    // Update in-memory for instant feedback
    const mState = initMachineState(machine_id);
    mState.current = val;
    mState.state = newState;
    mState.lastStateChange = Date.now();

    try {
        await pool.query('INSERT INTO machine_logs (machine_current, state, machine_id) VALUES (?, ?, ?)', [val, newState, machine_id]);
    } catch (e) {
        console.error("Machine Log Error", e);
    }

    io.emit('machine_update', { machine_id, ...mState });
    res.sendStatus(200);
});

// Deprecated/Legacy aliases if needed
app.post('/api/current', (req, res) => {
    // Redirect logic currently handled by /api/machine-status logic
    // We'll keep it compatible for now if firmware isn't updated instantly
    return app._router.handle({ ...req, url: '/api/machine-status' }, res);
});

// Data API - Detailed view for one machine
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    const machine_id = req.query.machine_id || 1;
    try {
        const shift = await getShift();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        let shiftStartStr = `${todayStr} ${shift.start_time}`;

        // Handle midnight-crossing shifts: if current time is before end_time but after 00:00:00,
        // and end_time < start_time, the shift actually started yesterday.
        if (shift.end_time < shift.start_time) {
            const timeString = now.toTimeString().split(' ')[0];
            if (timeString <= shift.end_time) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                shiftStartStr = `${yesterdayStr} ${shift.start_time}`;
            }
        }

        // 1. Fetch all data in parallel
        const [
            [counts],
            [stateLogs],
            [eventLogs]
        ] = await Promise.all([
            pool.query(`
                SELECT signal_type, COUNT(*) as count 
                FROM production_events 
                WHERE shift_id = ? AND machine_id = ? AND timestamp >= ?
                GROUP BY signal_type
            `, [shift.id, machine_id, shiftStartStr]),
            pool.query(`
                SELECT state, timestamp 
                FROM machine_logs 
                WHERE machine_id = ? AND timestamp >= ?
                ORDER BY timestamp ASC
            `, [machine_id, shiftStartStr]),
            pool.query(`
                SELECT signal_type, timestamp 
                FROM production_events 
                WHERE machine_id = ? AND timestamp >= ?
                ORDER BY timestamp ASC
            `, [machine_id, shiftStartStr])
        ]);

        const good = counts.find(c => c.signal_type === 'good')?.count || 0;
        const ng = counts.find(c => c.signal_type === 'ng')?.count || 0;

        // 2. Calculate Running Time & Downtime
        let runningTime = 0;
        let downtime = 0;
        if (stateLogs.length > 0) {
            let prevTs = new Date(stateLogs[0].timestamp);
            for (let i = 0; i < stateLogs.length - 1; i++) {
                const currentTs = new Date(stateLogs[i + 1].timestamp);
                const duration = (currentTs - prevTs) / 1000;
                if (stateLogs[i].state === 'running') runningTime += duration;
                else downtime += duration;
                prevTs = currentTs;
            }
            const durationSinceLast = (now - prevTs) / 1000;
            if (stateLogs[stateLogs.length - 1].state === 'running') runningTime += durationSinceLast;
            else downtime += durationSinceLast;
        }

        const target = 4320; // Default target

        // 3. Calculate OEE
        const totalCount = good + ng;
        const plannedTime = 8 * 3600; // Assume 8h shifts for now
        const availability = plannedTime > 0 ? (runningTime / plannedTime) : 0;
        const performance = runningTime > 0 ? ((IDEAL_CYCLE_TIME * totalCount) / runningTime) : 0;
        const quality = totalCount > 0 ? (good / totalCount) : 0;
        const oee = (availability * performance * quality) * 100;

        const mState = initMachineState(machine_id);
        res.json({
            shift: shift.name,
            machine_id: machine_id,
            target,
            good,
            ng,
            current: mState.current,
            state: mState.state,
            runningTime: Math.round(runningTime),
            downtime: Math.round(downtime),
            oee: Math.min(oee, 100).toFixed(1),
            avgCycleTime: totalCount > 0 ? (runningTime / totalCount).toFixed(2) : "0.00",
            availability: (availability * 100).toFixed(1),
            performance: (performance * 100).toFixed(1),
            quality: (quality * 100).toFixed(1),
            timeline: stateLogs, // Reuse stateLogs for timeline
            productionEvents: eventLogs
        });
    } catch (e) {
        console.error("Dashboard Error", e);
        res.sendStatus(500);
    }
});

// Overview Grid for all machines
app.get('/api/dashboard/all', authenticateToken, async (req, res) => {
    try {
        const shift = await getShift();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        let shiftStartStr = `${todayStr} ${shift.start_time}`;

        if (shift.end_time < shift.start_time) {
            const timeString = now.toTimeString().split(' ')[0];
            if (timeString <= shift.end_time) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                shiftStartStr = `${yesterdayStr} ${shift.start_time}`;
            }
        }

        const [rows] = await pool.query(`
            SELECT 
                m.id, m.code, m.type,
                COUNT(CASE WHEN pe.signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN pe.signal_type = 'ng' THEN 1 END) as ng
            FROM machines m
            LEFT JOIN production_events pe ON m.id = pe.machine_id AND pe.timestamp >= ?
            GROUP BY m.id
        `, [shiftStartStr]);

        const results = rows.map(r => {
            const mState = initMachineState(r.id);
            return {
                id: r.id,
                code: r.code,
                type: r.type,
                good: parseInt(r.good) || 0,
                ng: parseInt(r.ng) || 0,
                state: mState.state,
                current: mState.current
            };
        });
        res.json(results);
    } catch (e) {
        console.error("Dashboard All Error", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/machines', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM machines');
        res.json(rows);
    } catch (e) {
        res.sendStatus(500);
    }
});

app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const { machine_id, limit, start_date, end_date, orderBy, orderDir } = req.query;
        let query = `
            SELECT 
                DATE(timestamp) as date, 
                shift_id,
                COUNT(CASE WHEN signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN signal_type = 'ng' THEN 1 END) as ng
            FROM production_events
            WHERE 1=1
        `;
        let params = [];
        if (machine_id) {
            query += ` AND machine_id = ? `;
            params.push(machine_id);
        }
        if (start_date) {
            query += ` AND DATE(timestamp) >= ? `;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND DATE(timestamp) <= ? `;
            params.push(end_date);
        }

        query += ` GROUP BY DATE(timestamp), shift_id `;

        // Sorting
        const allowedSort = ['date', 'shift_id', 'good', 'ng'];
        const sortCol = allowedSort.includes(orderBy) ? orderBy : 'date';
        const sortDir = orderDir === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortCol} ${sortDir}, shift_id ${sortDir} `;

        if (limit) {
            query += ` LIMIT ? `;
            params.push(parseInt(limit));
        } else {
            query += ` LIMIT 25 `;
        }
        const [rows] = await pool.query(query, params);

        // 2. Fetch shift definitions to calculate time boundaries
        const [shifts] = await pool.query('SELECT * FROM shifts');

        // 3. Enrich each row with shift names and calculated durations
        const history = await Promise.all(rows.map(async (row) => {
            const sDef = shifts.find(x => x.id === row.shift_id);

            // Manual local date string extraction (YYYY-MM-DD)
            const d = new Date(row.date);
            const dateStr = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');

            // Default durations
            let runTime = 0;
            let downTime = 0;

            if (sDef) {
                // Construct search window for this shift on this date
                const start = `${dateStr} ${sDef.start_time} `;
                let end = `${dateStr} ${sDef.end_time} `;

                // Fix for shifts crossing midnight (e.g. 23:00 to 07:00)
                if (sDef.end_time < sDef.start_time) {
                    const nextD = new Date(d);
                    nextD.setDate(nextD.getDate() + 1);
                    const nextDateStr = nextD.getFullYear() + '-' +
                        String(nextD.getMonth() + 1).padStart(2, '0') + '-' +
                        String(nextD.getDate()).padStart(2, '0');
                    end = `${nextDateStr} ${sDef.end_time} `;
                }

                // Fetch machine logs for this specific shift window
                let logQuery = 'SELECT state, timestamp FROM machine_logs WHERE timestamp BETWEEN ? AND ?';
                let logParams = [start, end];
                if (machine_id) {
                    logQuery += ' AND machine_id = ?';
                    logParams.push(machine_id);
                }
                logQuery += ' ORDER BY timestamp ASC';
                const [logs] = await pool.query(logQuery, logParams);

                // Calculate durations based on log intervals
                if (logs.length > 1) {
                    for (let i = 0; i < logs.length - 1; i++) {
                        const s = new Date(logs[i].timestamp);
                        const e = new Date(logs[i + 1].timestamp);
                        const diff = (e - s) / 1000; // seconds
                        if (logs[i].state === 'running') runTime += diff;
                        else downTime += diff;
                    }
                }
            }

            const good = Number(row.good);
            const ng = Number(row.ng);
            const totalParts = good + ng;
            const totalTime = runTime + downTime;

            // OEE Calculation: (Good * Ideal Cycle) / Total Time
            let oee = 0;
            if (totalTime > 0) {
                oee = (good * IDEAL_CYCLE_TIME) / totalTime;
            }

            return {
                ...row,
                shift_name: sDef ? sDef.name : 'Unknown',
                good,
                ng,
                log_count: totalParts,
                runTime: Math.round(runTime),
                downTime: Math.round(downTime),
                oee: (oee * 100).toFixed(1)
            };
        }));

        res.json(history);
    } catch (e) {
        console.error("History API Error", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.sendStatus(403);
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
        res.sendStatus(201);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/shifts', async (req, res) => {
    try {
        const [shifts] = await pool.query('SELECT * FROM shifts');
        res.json(shifts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/shifts/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.sendStatus(403);
    const { start_time, end_time } = req.body;
    try {
        await pool.query('UPDATE shifts SET start_time = ?, end_time = ? WHERE id = ?', [start_time, end_time, req.params.id]);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Downtime Recording APIs ---

// Start a downtime
app.post('/api/downtime/start', authenticateToken, async (req, res) => {
    const { machine_id, reason } = req.body;
    const operator_id = req.user.id;

    if (!machine_id || !reason) {
        return res.status(400).send('Machine ID and Reason are required');
    }

    try {
        await pool.query(
            'INSERT INTO downtimes (machine_id, reason, operator_id) VALUES (?, ?, ?)',
            [machine_id, reason, operator_id]
        );
        res.sendStatus(201);
    } catch (e) {
        console.error("Downtime Start Error", e);
        res.status(500).json({ error: e.message });
    }
});

// End a downtime
app.post('/api/downtime/end', authenticateToken, async (req, res) => {
    const { machine_id } = req.body;

    if (!machine_id) {
        return res.status(400).send('Machine ID is required');
    }

    try {
        await pool.query(
            'UPDATE downtimes SET end_time = CURRENT_TIMESTAMP WHERE machine_id = ? AND end_time IS NULL',
            [machine_id]
        );
        res.sendStatus(200);
    } catch (e) {
        console.error("Downtime End Error", e);
        res.status(500).json({ error: e.message });
    }
});

// Get downtime history
app.get('/api/downtimes', authenticateToken, async (req, res) => {
    try {
        const { machine_id, limit, start_date, end_date, orderBy, orderDir } = req.query;
        let query = `
            SELECT d.*, m.code as machine_code, u.username as operator_name
            FROM downtimes d
            JOIN machines m ON d.machine_id = m.id
            LEFT JOIN users u ON d.operator_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (machine_id) {
            query += ` AND d.machine_id = ? `;
            params.push(machine_id);
        }
        if (start_date) {
            query += ` AND d.start_time >= ? `;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND d.start_time <= ? `;
            params.push(end_date);
        }

        // Sorting
        const allowedSort = ['start_time', 'end_time', 'machine_code', 'reason'];
        const sortCol = allowedSort.includes(orderBy) ? orderBy : 'd.start_time';
        const sortDir = orderDir === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortCol} ${sortDir} `;

        if (limit) {
            query += ` LIMIT ? `;
            params.push(parseInt(limit));
        } else {
            query += ` LIMIT 25 `;
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (e) {
        console.error("Downtime History Fetch Error", e);
        res.status(500).json({ error: e.message });
    }
});

// Get active downtime for a machine
app.get('/api/downtime/active/:machine_id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM downtimes WHERE machine_id = ? AND end_time IS NULL LIMIT 1',
            [req.params.machine_id]
        );
        res.json(rows[0] || null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Seed Endpoint (for demo)
app.post('/api/seed', async (req, res) => {
    const hashedPassword = await bcrypt.hash('pass123', 10);
    await pool.query('INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'manager']);
    await pool.query('INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['op1', hashedPassword, 'operator']);
    res.send('Seeded');
});

// Analytics API
app.get('/api/analytics', authenticateToken, async (req, res) => {
    const { start, end } = req.query;

    if (!start || !end) {
        return res.status(400).send('Start and End dates required');
    }

    try {
        const machine_id = req.query.machine_id;

        // 1. Get Production Counts (Good/NG)
        let eventQuery = `
            SELECT signal_type, CAST(COUNT(*) AS UNSIGNED) as count
            FROM production_events
            WHERE timestamp BETWEEN ? AND ?
            `;
        let eventParams = [start, end];
        if (machine_id) {
            eventQuery += ' AND machine_id = ?';
            eventParams.push(machine_id);
        }
        eventQuery += ' GROUP BY signal_type';
        const [eventRows] = await pool.query(eventQuery, eventParams);

        const good = Number(eventRows.find(r => r.signal_type === 'good')?.count || 0);
        const ng = Number(eventRows.find(r => r.signal_type === 'ng')?.count || 0);

        // 2. Get Machine State Logs
        let stateQuery = 'SELECT state, timestamp FROM machine_logs WHERE timestamp BETWEEN ? AND ?';
        let stateParams = [start, end];
        if (machine_id) {
            stateQuery += ' AND machine_id = ?';
            stateParams.push(machine_id);
        }
        stateQuery += ' ORDER BY timestamp ASC';
        const [stateLogs] = await pool.query(stateQuery, stateParams);

        let runTimeSec = 0;
        let downTimeSec = 0;
        let timeline = stateLogs.map(l => ({
            state: l.state,
            timestamp: l.timestamp
        }));

        // Calculate durations
        if (stateLogs.length > 0) {
            for (let i = 0; i < stateLogs.length - 1; i++) {
                const s = new Date(stateLogs[i].timestamp);
                const e = new Date(stateLogs[i + 1].timestamp);
                const duration = (e - s) / 1000;
                if (stateLogs[i].state === 'running') runTimeSec += duration;
                else downTimeSec += duration;
            }
        }

        const totalTime = runTimeSec + downTimeSec;
        const totalParts = good + ng;

        // Correct OEE calculation
        const availability = totalTime > 0 ? runTimeSec / totalTime : 0;
        const performance = runTimeSec > 0 ? (totalParts * IDEAL_CYCLE_TIME) / runTimeSec : 0;
        const quality = totalParts > 0 ? good / totalParts : 0;
        const oee = availability * performance * quality;

        // 3. Get Production Event Logs (for tiny dots in timeline)
        let eventLogQuery = 'SELECT signal_type, timestamp FROM production_events WHERE timestamp BETWEEN ? AND ?';
        let eventLogParams = [start, end];
        if (machine_id) {
            eventLogQuery += ' AND machine_id = ?';
            eventLogParams.push(machine_id);
        }
        eventLogQuery += ' ORDER BY timestamp ASC';
        const [productionEvents] = await pool.query(eventLogQuery, eventLogParams);

        // 4. Get Downtime Events for this period (Requested by user)
        let downtimeLogQuery = `
            SELECT d.*, m.code as machine_code, u.username as operator_name
            FROM downtimes d
            JOIN machines m ON d.machine_id = m.id
            LEFT JOIN users u ON d.operator_id = u.id
            WHERE d.start_time BETWEEN ? AND ?
        `;
        let downtimeLogParams = [start, end];
        if (machine_id) {
            downtimeLogQuery += ' AND d.machine_id = ?';
            downtimeLogParams.push(machine_id);
        }
        downtimeLogQuery += ' ORDER BY d.start_time DESC';
        const [downtimeEvents] = await pool.query(downtimeLogQuery, downtimeLogParams);

        res.json({
            metrics: {
                good,
                ng,
                oee: (oee * 100).toFixed(1),
                availability: (availability * 100).toFixed(1),
                performance: (performance * 100).toFixed(1),
                quality: (quality * 100).toFixed(1),
                runTime: runTimeSec,
                downTime: downTimeSec
            },
            timeline,
            productionEvents,
            downtimeEvents
        });

    } catch (e) {
        console.error("Analytics Error", e);
        res.status(500).json({ error: e.message });
    }
});





const PORT = process.env.PORT || 5003;

const startServer = (port) => {
    server.listen(port, () => {
        console.log(`Server running on port ${port} `);
        try {
            const fs = require('fs');
            fs.writeFileSync('server_status.txt', `[${new Date().toISOString()}] Server successfully listening on port ${port} \n`);
        } catch (e) { console.error("Log failed", e); }
    }).on('error', (err) => {
        const fs = require('fs');
        try {
            fs.appendFileSync('server_startup_error.log', `[${new Date().toISOString()}] Error on port ${port}: ${err.code} - ${err.message} \n`);
        } catch (fse) { }

        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${parseInt(port) + 1}...`);
            startServer(parseInt(port) + 1);
        } else {
            console.error(err);
        }
    });
};

startServer(PORT);
