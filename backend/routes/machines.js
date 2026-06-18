const express = require('express');
const router = express.Router();
const pool = require('../database');
const config = require('../config');
const authenticateToken = require('../utils/auth');
const { getShift } = require('../utils/shift');
const { initMachineState, checkAndResetShift } = require('../stateManager');
const socketManager = require('../socketManager');
const settingsManager = require('../settingsManager');

// Get all machines
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM machines');
        res.json(rows);
    } catch (e) {
        res.sendStatus(500);
    }
});

// 1. Signal Endpoint (From IR Sensors or Relay Contacts)
router.post('/signal', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== config.FIRMWARE_API_KEY) return res.sendStatus(401);

    const { type, machine_id = 1 } = req.body; 

    if (!type || (type !== 'good' && type !== 'ng')) {
        return res.status(400).send('Invalid signal type');
    }

    try {
        const shift = await getShift();
        checkAndResetShift(shift.id);
        await pool.query('INSERT INTO production_events (signal_type, shift_id, machine_id) VALUES (?, ?, ?)', [type, shift.id, machine_id]);

        const io = socketManager.getIO();
        
        // Broadcast distinct event for frontend animation/updates
        io.emit('signal_event', { type, machine_id, timestamp: Date.now() });

        // Update in-memory count for dashboard efficiency
        const mState = initMachineState(machine_id);
        // Calculate timeSinceSignal BEFORE updating lastSignalTime
        const timeSinceSignal = Date.now() - mState.lastSignalTime;
        
        mState.lastSignalTime = Date.now();
        if (type === 'good') mState.good++;
        else mState.ng++;

        const currentThreshold = settingsManager.getSetting('CURRENT_THRESHOLD') || config.CURRENT_THRESHOLD;
        const isRunningTarget = (mState.current > currentThreshold) || (timeSinceSignal <= 60000);
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
router.post('/machine-status', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== config.FIRMWARE_API_KEY) return res.sendStatus(401);

    const { current, machine_id = 1 } = req.body;

    if (current === undefined) return res.sendStatus(400);

    const val = parseFloat(current);
    
    // Update in-memory for instant feedback
    const mState = initMachineState(machine_id);
    mState.current = val;
    
    const timeSinceSignal = Date.now() - mState.lastSignalTime;
    const currentThreshold = settingsManager.getSetting('CURRENT_THRESHOLD') || config.CURRENT_THRESHOLD;
    const newState = (val > currentThreshold) || (timeSinceSignal <= 60000) ? 'running' : 'downtime';

    if (newState !== mState.state) {
        mState.state = newState;
        mState.lastStateChange = Date.now();
        try {
            await pool.query('INSERT INTO machine_logs (machine_current, state, machine_id) VALUES (?, ?, ?)', [val, newState, machine_id]);
        } catch (e) {
            console.error("Machine Log Error", e);
        }
    }

    const io = socketManager.getIO();
    io.emit('machine_update', { machine_id, ...mState });
    res.sendStatus(200);
});

// 3. USR-M100 Edge Computing Endpoint (Modbus RTU to JSON)
router.post('/usr-gateway', async (req, res) => {
    // USR-M100 might use query params if custom headers aren't supported
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey !== config.FIRMWARE_API_KEY) {
        console.warn('USR-M100 Gateway auth failed. Provided key:', apiKey);
        return res.sendStatus(401);
    }

    console.log('\n--- USR-M100 EDGE COMPUTING PAYLOAD RECEIVED ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log(JSON.stringify(req.body, null, 2));
    console.log('------------------------------------------------\n');

    // TODO: Map Modbus JSON to 'good'/'ng'/'running' once the structure is known
    
    // Always return 200 OK so the gateway knows it was received
    res.sendStatus(200);
});

module.exports = router;
