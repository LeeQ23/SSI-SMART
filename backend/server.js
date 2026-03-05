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
    const machineId = req.query.machine_id || 1;
    try {
        const shift = await getShift();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const shiftStartStr = `${todayStr} ${shift.start_time}`;

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
            `, [shift.id, machineId, shiftStartStr]),
            pool.query(`
                SELECT state, timestamp 
                FROM machine_logs 
                WHERE machine_id = ? AND timestamp >= ?
                ORDER BY timestamp ASC
            `, [machineId, shiftStartStr]),
            pool.query(`
                SELECT signal_type, timestamp 
                FROM production_events 
                WHERE machine_id = ? AND timestamp >= ?
                ORDER BY timestamp ASC
            `, [machineId, shiftStartStr])
        ]);

        const good = counts.find(c => c.signal_type === 'good')?.count || 0;
        const ng = counts.find(c => c.signal_type === 'ng')?.count || 0;

        // 2. Calculate Running Time & Downtime
        let runningTime = 0;
        let downtime = 0;
        if (stateLogs.length > 0) {
            for (let i = 0; i < stateLogs.length - 1; i++) {
                const s = new Date(stateLogs[i].timestamp);
                const e = new Date(stateLogs[i + 1].timestamp);
                const duration = (e - s) / 1000;
                if (stateLogs[i].state === 'running') runningTime += duration;
                else downtime += duration;
            }
            const lastLog = stateLogs[stateLogs.length - 1];
            const durationSinceLast = (now - new Date(lastLog.timestamp)) / 1000;
            if (lastLog.state === 'running') runningTime += durationSinceLast;
            else downtime += durationSinceLast;
        }

        const target = 1000; // Default target

        // 3. Calculate OEE
        const totalCount = good + ng;
        const plannedTime = 8 * 3600; // Assume 8h shifts for now
        const availability = plannedTime > 0 ? (runningTime / plannedTime) : 0;
        const performance = runningTime > 0 ? ((IDEAL_CYCLE_TIME * totalCount) / runningTime) : 0;
        const quality = totalCount > 0 ? (good / totalCount) : 0;
        const oee = (availability * performance * quality) * 100;

        const mState = initMachineState(machineId);
        res.json({
            shift: shift.name,
            machine_id: machineId,
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
        const [machines] = await pool.query('SELECT * FROM machines');
        const shift = await getShift();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const shiftStartStr = `${todayStr} ${shift.start_time}`;

        const results = await Promise.all(machines.map(async (m) => {
            // Get basic stats for each machine
            const [counts] = await pool.query(`
                SELECT signal_type, COUNT(*) as count FROM production_events 
                WHERE machine_id = ? AND timestamp >= ? GROUP BY signal_type
            `, [m.id, shiftStartStr]);

            const good = counts.find(c => c.signal_type === 'good')?.count || 0;
            const ng = counts.find(c => c.signal_type === 'ng')?.count || 0;

            const mState = initMachineState(m.id);
            return {
                id: m.id,
                code: m.code,
                type: m.type,
                good,
                ng,
                state: mState.state,
                current: mState.current
            };
        }));
        res.json(results);
    } catch (e) {
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
        const machineId = req.query.machine_id;
        let query = `
            SELECT 
                DATE(timestamp) as date, 
                shift_id,
                COUNT(CASE WHEN signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN signal_type = 'ng' THEN 1 END) as ng
            FROM production_events
        `;
        let params = [];
        if (machineId) {
            query += ` WHERE machine_id = ? `;
            params.push(machineId);
        }
        query += `
            GROUP BY DATE(timestamp), shift_id
            ORDER BY date DESC, shift_id DESC
            LIMIT 30
        `;
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
                const start = `${dateStr} ${sDef.start_time}`;
                let end = `${dateStr} ${sDef.end_time}`;

                // Fix for shifts crossing midnight (e.g. 23:00 to 07:00)
                if (sDef.end_time < sDef.start_time) {
                    const nextD = new Date(d);
                    nextD.setDate(nextD.getDate() + 1);
                    const nextDateStr = nextD.getFullYear() + '-' +
                        String(nextD.getMonth() + 1).padStart(2, '0') + '-' +
                        String(nextD.getDate()).padStart(2, '0');
                    end = `${nextDateStr} ${sDef.end_time}`;
                }

                // Fetch machine logs for this specific shift window
                let logQuery = 'SELECT state, timestamp FROM machine_logs WHERE timestamp BETWEEN ? AND ?';
                let logParams = [start, end];
                if (machineId) {
                    logQuery += ' AND machine_id = ?';
                    logParams.push(machineId);
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
        const machineId = req.query.machine_id;

        // 1. Get Production Counts (Good/NG)
        let eventQuery = `
            SELECT signal_type, CAST(COUNT(*) AS UNSIGNED) as count
            FROM production_events
            WHERE timestamp BETWEEN ? AND ?
        `;
        let eventParams = [start, end];
        if (machineId) {
            eventQuery += ' AND machine_id = ?';
            eventParams.push(machineId);
        }
        eventQuery += ' GROUP BY signal_type';
        const [eventRows] = await pool.query(eventQuery, eventParams);

        const good = Number(eventRows.find(r => r.signal_type === 'good')?.count || 0);
        const ng = Number(eventRows.find(r => r.signal_type === 'ng')?.count || 0);

        // 2. Get Machine State Logs
        let stateQuery = 'SELECT state, timestamp FROM machine_logs WHERE timestamp BETWEEN ? AND ?';
        let stateParams = [start, end];
        if (machineId) {
            stateQuery += ' AND machine_id = ?';
            stateParams.push(machineId);
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

        // 3. Get Production Event Logs
        let eventLogQuery = 'SELECT signal_type, timestamp FROM production_events WHERE timestamp BETWEEN ? AND ?';
        let eventLogParams = [start, end];
        if (machineId) {
            eventLogQuery += ' AND machine_id = ?';
            eventLogParams.push(machineId);
        }
        eventLogQuery += ' ORDER BY timestamp ASC';
        const [productionEvents] = await pool.query(eventLogQuery, eventLogParams);

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
            productionEvents
        });

    } catch (e) {
        console.error("Analytics Error", e);
        res.status(500).json({ error: e.message });
    }
});





const PORT = process.env.PORT || 5003;

const startServer = (port) => {
    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        try {
            const fs = require('fs');
            fs.writeFileSync('server_status.txt', `[${new Date().toISOString()}] Server successfully listening on port ${port}\n`);
        } catch (e) { console.error("Log failed", e); }
    }).on('error', (err) => {
        const fs = require('fs');
        try {
            fs.appendFileSync('server_startup_error.log', `[${new Date().toISOString()}] Error on port ${port}: ${err.code} - ${err.message}\n`);
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
