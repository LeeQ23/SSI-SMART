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

const calculateSessionStats = async (machine_id, start_time, end_time) => {
    const [
        [counts],
        [stateLogs]
    ] = await Promise.all([
        pool.query(`
            SELECT signal_type, COUNT(*) as count 
            FROM production_events 
            WHERE machine_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY signal_type
        `, [machine_id, start_time, end_time]),
        pool.query(`
            SELECT state, timestamp 
            FROM machine_logs 
            WHERE machine_id = ? AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp ASC
        `, [machine_id, start_time, end_time])
    ]);

    const good = counts.find(c => c.signal_type === 'good')?.count || 0;
    const ng = counts.find(c => c.signal_type === 'ng')?.count || 0;
    const totalCount = good + ng;

    let runningTime = 0;
    let downtime = 0;
    if (stateLogs.length > 0) {
        let prevTs = new Date(stateLogs[0].timestamp);
        // Add duration from start_time to first log if first log is later
        const sTime = new Date(start_time);
        if (prevTs > sTime) {
           // We don't know the state before the first log in this window, 
           // but usually it's better to start from the first log.
        }

        for (let i = 0; i < stateLogs.length - 1; i++) {
            const currentTs = new Date(stateLogs[i + 1].timestamp);
            const duration = (currentTs - prevTs) / 1000;
            if (stateLogs[i].state === 'running') runningTime += duration;
            else downtime += duration;
            prevTs = currentTs;
        }
        const eTime = new Date(end_time);
        const durationSinceLast = (eTime - prevTs) / 1000;
        if (stateLogs[stateLogs.length - 1].state === 'running') runningTime += durationSinceLast;
        else downtime += durationSinceLast;
    }

    const availability = (runningTime + downtime) > 0 ? (runningTime / (runningTime + downtime)) : 0;
    const performance = runningTime > 0 ? ((IDEAL_CYCLE_TIME * totalCount) / runningTime) : 0;
    const quality = totalCount > 0 ? (good / totalCount) : 0;
    const oee = (availability * performance * quality) * 100;

    return {
        good,
        ng,
        runningTime: Math.round(runningTime),
        downtime: Math.round(downtime),
        oee: Math.min(oee, 100).toFixed(1),
        availability: (availability * 100).toFixed(1),
        performance: (performance * 100).toFixed(1),
        quality: (quality * 100).toFixed(1)
    };
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

// Data API - Detailed view for one machine (Session-based)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    const machine_id = req.query.machine_id || 1;
    try {
        const [sessions] = await pool.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
        
        let session = sessions[0];
        if (!session) {
            // If no active session, create a default one or return empty
            // For now, let's just return a placeholder or handle it
            return res.json({
                noActiveSession: true,
                machine_id
            });
        }

        const now = new Date();
        const stats = await calculateSessionStats(machine_id, session.start_time, now);

        const mState = initMachineState(machine_id);
        
        // Fetch production events for current session
        const [eventLogs] = await pool.query(`
            SELECT signal_type, timestamp 
            FROM production_events 
            WHERE machine_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        `, [machine_id, session.start_time]);

        // Fetch state logs for timeline
        const [stateLogs] = await pool.query(`
            SELECT state, timestamp 
            FROM machine_logs 
            WHERE machine_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        `, [machine_id, session.start_time]);

        res.json({
            product_id: session.product_id,
            target: session.target_qty,
            shift: session.shift_name,
            operator: session.operator_name,
            operator_nim: session.operator_nim,
            machine_id: machine_id,
            good: stats.good,
            ng: stats.ng,
            current: mState.current,
            state: mState.state,
            runningTime: stats.runningTime,
            downtime: stats.downtime,
            oee: stats.oee,
            avgCycleTime: (stats.good + stats.ng) > 0 ? (stats.runningTime / (stats.good + stats.ng)).toFixed(2) : "0.00",
            availability: stats.availability,
            performance: stats.performance,
            quality: stats.quality,
            timeline: stateLogs,
            productionEvents: eventLogs,
            session_start: session.start_time
        });
    } catch (e) {
        console.error("Dashboard Error", e);
        res.sendStatus(500);
    }
});

// Overview Grid for all machines
app.get('/api/dashboard/all', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                m.id, m.code, m.type,
                COUNT(CASE WHEN pe.signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN pe.signal_type = 'ng' THEN 1 END) as ng
            FROM machines m
            LEFT JOIN active_sessions as s ON m.id = s.machine_id
            LEFT JOIN production_events pe ON m.id = pe.machine_id AND (s.start_time IS NOT NULL AND pe.timestamp >= s.start_time)
            GROUP BY m.id
        `);

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
            SELECT ps.*, m.code as machine_code
            FROM production_sessions ps
            JOIN machines m ON ps.machine_id = m.id
            WHERE 1=1
        `;
        let params = [];
        if (machine_id) {
            query += ` AND ps.machine_id = ? `;
            params.push(machine_id);
        }
        if (start_date) {
            query += ` AND DATE(ps.start_time) >= ? `;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND DATE(ps.start_time) <= ? `;
            params.push(end_date);
        }

        // Sorting
        const allowedSort = ['start_time', 'product_id', 'good_count', 'ng_count', 'oee'];
        const sortCol = allowedSort.includes(orderBy) ? orderBy : 'ps.start_time';
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

// --- Session Management APIs ---

app.post('/api/session/edit', authenticateToken, async (req, res) => {
    const { 
        password, 
        machine_id, 
        product_id, 
        target_qty, 
        shift_name, 
        operator_name, 
        operator_nim 
    } = req.body;

    if (password !== 'admin123') {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    if (!machine_id || !product_id || !target_qty || !shift_name || !operator_name || !operator_nim) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Check for current active session
            const [activeSessions] = await connection.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
            const now = new Date();

            if (activeSessions.length > 0) {
                const session = activeSessions[0];
                // 2. Calculate stats for the session that is ending
                const stats = await calculateSessionStats(machine_id, session.start_time, now);

                // 3. Save to production_sessions history
                await connection.query(`
                    INSERT INTO production_sessions 
                    (machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, 
                     start_time, end_time, good_count, ng_count, running_duration_sec, downtime_duration_sec, 
                     oee, availability, performance, quality) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    machine_id, session.product_id, session.target_qty, session.shift_name, session.operator_name, session.operator_nim,
                    session.start_time, now, stats.good, stats.ng, stats.runningTime, stats.downtime,
                    stats.oee, stats.availability, stats.performance, stats.quality
                ]);

                // 4. Remove from active_sessions
                await connection.query('DELETE FROM active_sessions WHERE machine_id = ?', [machine_id]);
            }

            // 5. Create new active session
            await connection.query(`
                INSERT INTO active_sessions 
                (machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, start_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, now]);

            await connection.commit();
            res.json({ message: 'Session updated successfully' });
            
            // Broadcast update
            io.emit('data_updated', { machine_id });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (e) {
        console.error("Session Edit Error", e);
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
