const express = require('express');
const router = express.Router();
const pool = require('../database');
const authenticateToken = require('../utils/auth');
const { getShift } = require('../utils/shift');
const { initMachineState } = require('../stateManager');
const { calculateSessionStats } = require('../services/statsService');
const settingsManager = require('../settingsManager');

// Data API - Detailed view for one machine (Shift-based counts, with Session info)
router.get('/', authenticateToken, async (req, res) => {
    const machine_id = req.query.machine_id || 1;
    try {
        const [sessions] = await pool.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
        let session = sessions[0];
        
        const now = new Date();
        const currentShift = await getShift();
        const sessionStart = session ? session.start_time : currentShift.start;
        
        const stats = await calculateSessionStats(machine_id, sessionStart, now);
        const mState = initMachineState(machine_id);
        
        const [eventLogs] = await pool.query(`
            SELECT signal_type, timestamp 
            FROM production_events 
            WHERE machine_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        `, [machine_id, sessionStart]);

        // Bucket events into 5-minute intervals to reduce payload
        const BUCKET_SIZE_MS = 5 * 60 * 1000;
        let bucketedEvents = [];
        
        if (eventLogs.length > 0) {
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);
            const graphStartTs = startOfToday.getTime();
            const endTimeToRender = now.getTime();
            
            let cumGood = 0;
            let cumNG = 0;
            let eventIndex = 0;
            
            for (let bucketTime = graphStartTs; bucketTime <= endTimeToRender; bucketTime += BUCKET_SIZE_MS) {
                while (eventIndex < eventLogs.length && new Date(eventLogs[eventIndex].timestamp).getTime() <= bucketTime) {
                    if (eventLogs[eventIndex].signal_type === 'good') cumGood++;
                    else cumNG++;
                    eventIndex++;
                }
                bucketedEvents.push({
                    time: bucketTime,
                    good: cumGood,
                    ng: cumNG
                });
            }
        }

        const [stateLogs] = await pool.query(`
            SELECT state, timestamp 
            FROM machine_logs 
            WHERE machine_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        `, [machine_id, sessionStart]);

        res.json({
            product_id: session ? session.product_id : '-',
            target: session ? session.target_qty : 0,
            shift: currentShift.name,
            operator: session ? session.operator_name : '-',
            operator_nim: session ? session.operator_nim : '-',
            lot_number: session ? session.lot_number : '-',
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
            targetCycleTime: settingsManager.getSetting('IDEAL_CYCLE_TIME'),
            timeline: stateLogs,
            productionEvents: bucketedEvents,
            session_start: sessionStart
        });
    } catch (e) {
        console.error("Dashboard Error", e);
        res.sendStatus(500);
    }
});

// Overview Grid for all machines
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const currentShift = await getShift();
        const [rows] = await pool.query(`
            SELECT 
                m.id, m.code, m.type,
                COUNT(CASE WHEN pe.signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN pe.signal_type = 'ng' THEN 1 END) as ng
            FROM machines m
            LEFT JOIN active_sessions axs ON m.id = axs.machine_id
            LEFT JOIN production_events pe ON m.id = pe.machine_id AND pe.timestamp >= COALESCE(axs.start_time, ?)
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

module.exports = router;
