console.log("Starting server.js...");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
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
            lastStateChange: Date.now(),
            lastSignalTime: 0
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
const getCurrentShiftWindow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;
    
    // Morning: 07:25 (445 min) to 19:25 (1165 min)
    const morningStart = 7 * 60 + 25;
    const morningEnd = 19 * 60 + 25;
    
    let shiftStart = new Date(now);
    let shiftEnd = new Date(now);
    let shiftName = '';
    let shiftId = 1;

    if (timeInMinutes >= morningStart && timeInMinutes <= morningEnd) {
        shiftName = 'Morning';
        shiftId = 1;
        shiftStart.setHours(7, 25, 0, 0);
        shiftEnd.setHours(19, 25, 59, 999);
    } else {
        shiftName = 'Night';
        shiftId = 2;
        if (timeInMinutes > morningEnd) {
            shiftStart.setHours(19, 26, 0, 0);
            shiftEnd.setDate(shiftEnd.getDate() + 1);
            shiftEnd.setHours(7, 24, 59, 999);
        } else {
            shiftStart.setDate(shiftStart.getDate() - 1);
            shiftStart.setHours(19, 26, 0, 0);
            shiftEnd.setHours(7, 24, 59, 999);
        }
    }
    return { id: shiftId, name: shiftName, start: shiftStart, end: shiftEnd };
};

const getShift = async () => {
    return getCurrentShiftWindow();
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
        mState.lastSignalTime = Date.now();
        if (type === 'good') mState.good++;
        else mState.ng++;

        const timeSinceSignal = Date.now() - mState.lastSignalTime;
        const isRunningTarget = (mState.current > CURRENT_THRESHOLD) || (timeSinceSignal <= 60000);
        const newState = isRunningTarget ? 'running' : 'downtime';
        
        if (newState !== mState.state) {
            mState.state = newState;
            mState.lastStateChange = Date.now();
            pool.query('INSERT INTO machine_logs (machine_current, state, machine_id) VALUES (?, ?, ?)', [mState.current, newState, machine_id]).catch(console.error);
        }

        io.emit('data_updated', { machine_id });
        io.emit('machine_update', { machine_id, ...mState });

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
    
    // Update in-memory for instant feedback
    const mState = initMachineState(machine_id);
    mState.current = val;
    
    const timeSinceSignal = Date.now() - mState.lastSignalTime;
    const newState = (val > CURRENT_THRESHOLD) || (timeSinceSignal <= 60000) ? 'running' : 'downtime';

    if (newState !== mState.state) {
        mState.state = newState;
        mState.lastStateChange = Date.now();
        try {
            await pool.query('INSERT INTO machine_logs (machine_current, state, machine_id) VALUES (?, ?, ?)', [val, newState, machine_id]);
        } catch (e) {
            console.error("Machine Log Error", e);
        }
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

// Data API - Detailed view for one machine (Shift-based counts, with Session info)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    const machine_id = req.query.machine_id || 1;
    try {
        const [sessions] = await pool.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
        let session = sessions[0];
        
        const now = new Date();
        const currentShift = getCurrentShiftWindow();
        
        const stats = await calculateSessionStats(machine_id, currentShift.start, now);

        const mState = initMachineState(machine_id);
        
        const [eventLogs] = await pool.query(`
            SELECT signal_type, timestamp 
            FROM production_events 
            WHERE machine_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        `, [machine_id, currentShift.start]);

        const [stateLogs] = await pool.query(`
            SELECT state, timestamp 
            FROM machine_logs 
            WHERE machine_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        `, [machine_id, currentShift.start]);

        res.json({
            product_id: session ? session.product_id : '-',
            target: session ? session.target_qty : 0,
            shift: currentShift.name,
            operator: session ? session.operator_name : '-',
            operator_nim: session ? session.operator_nim : '-',
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
            session_start: session ? session.start_time : currentShift.start
        });
    } catch (e) {
        console.error("Dashboard Error", e);
        res.sendStatus(500);
    }
});

// Overview Grid for all machines
app.get('/api/dashboard/all', authenticateToken, async (req, res) => {
    try {
        const currentShift = getCurrentShiftWindow();
        const [rows] = await pool.query(`
            SELECT 
                m.id, m.code, m.type,
                COUNT(CASE WHEN pe.signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN pe.signal_type = 'ng' THEN 1 END) as ng
            FROM machines m
            LEFT JOIN production_events pe ON m.id = pe.machine_id AND pe.timestamp >= ?
            GROUP BY m.id
        `, [currentShift.start]);

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
        const [activeSessions] = await pool.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
        
        if (activeSessions.length > 0) {
            // Update existing
            await pool.query(`
                UPDATE active_sessions 
                SET product_id = ?, target_qty = ?, shift_name = ?, operator_name = ?, operator_nim = ? 
                WHERE machine_id = ?
            `, [product_id, target_qty, shift_name, operator_name, operator_nim, machine_id]);
        } else {
            // Insert if missing
            await pool.query(`
                INSERT INTO active_sessions 
                (machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, start_time) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [machine_id, product_id, target_qty, shift_name, operator_name, operator_nim]);
        }

        res.json({ message: 'Parameters updated successfully' });
        
        // Broadcast update
        io.emit('data_updated', { machine_id });

    } catch (e) {
        console.error("Session Update Error", e);
        res.status(500).json({ error: e.message });
    }
});

// --- Scheduled Tasks ---
const saveShiftHistory = async () => {
    console.log(`[${new Date().toISOString()}] Auto-saving shift history...`);
    try {
        const [machines] = await pool.query('SELECT id FROM machines');
        const now = new Date();
        const shiftWindow = getCurrentShiftWindow(); 
        
        for (const m of machines) {
            const machine_id = m.id;
            const [activeSessions] = await pool.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
            
            let session = activeSessions[0];
            let product_id = session ? session.product_id : 'N/A';
            let target_qty = session ? session.target_qty : 0;
            let shift_name = shiftWindow.name; 
            let operator_name = session ? session.operator_name : 'N/A';
            let operator_nim = session ? session.operator_nim : 'N/A';

            const stats = await calculateSessionStats(machine_id, shiftWindow.start, now);

            await pool.query(`
                INSERT INTO production_sessions 
                (machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, 
                 start_time, end_time, good_count, ng_count, running_duration_sec, downtime_duration_sec, 
                 oee, availability, performance, quality) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                machine_id, product_id, target_qty, shift_name, operator_name, operator_nim,
                shiftWindow.start, now, stats.good, stats.ng, stats.runningTime, stats.downtime,
                stats.oee, stats.availability, stats.performance, stats.quality
            ]);
        }
        console.log(`[${new Date().toISOString()}] Auto-save completed.`);
    } catch (e) {
        console.error("Failed to auto-save shift history:", e);
    }
};

// Schedule history save based on shift times (Server local time matches standard)
cron.schedule('24 7 * * *', saveShiftHistory);
cron.schedule('25 19 * * *', saveShiftHistory);

// --- Machine State Watcher ---
setInterval(() => {
    const now = Date.now();
    for (const [id, mState] of Object.entries(machinesState)) {
        const timeSinceSignal = now - mState.lastSignalTime;
        const isRunningTarget = (mState.current > CURRENT_THRESHOLD) || (timeSinceSignal <= 60000);
        const newState = isRunningTarget ? 'running' : 'downtime';
        
        if (newState !== mState.state) {
            mState.state = newState;
            mState.lastStateChange = now;
            pool.query('INSERT INTO machine_logs (machine_current, state, machine_id) VALUES (?, ?, ?)', [mState.current, newState, id]).catch(console.error);
            // It uses machine_id for socket listeners
            io.emit('machine_update', { machine_id: id, ...mState });
        }
    }
}, 5000);

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

// --- Quality Inspection APIs (From SSI Measure) ---

app.post('/api/inspections', async (req, res) => {
    const { id, operator_name, operator_nim, product_id, inspection_type, criteria, start_time, end_time, total_ok, total_ng, status } = req.body;
    
    try {
        await pool.query(
            `INSERT INTO quality_inspections 
             (measure_session_id, operator_name, operator_nim, product_id, inspection_type, criteria, start_time, end_time, total_ok, total_ng, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, operator_name, operator_nim, product_id, inspection_type, criteria, start_time, end_time, total_ok, total_ng, status]
        );
        
        io.emit('inspection_received', req.body);
        res.sendStatus(201);
    } catch (e) {
        console.error("Quality Inspection Insert Error", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/inspections', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM quality_inspections ORDER BY received_at DESC LIMIT 50');
        res.json(rows);
    } catch (e) {
        console.error("Quality Inspection Fetch Error", e);
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
