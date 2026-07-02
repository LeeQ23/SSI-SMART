const express = require('express');
const router = express.Router();
const pool = require('../database');
const authenticateToken = require('../utils/auth');
const socketManager = require('../socketManager');
const { calculateSessionStats } = require('../services/statsService');
const { resetMachineStateCounts, getMachineState } = require('../stateManager');

router.post('/edit', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager access required' });

    const { 
        machine_id, 
        product_id, 
        target_qty, 
        shift_name, 
        operator_name, 
        operator_nim,
        lot_number,
        save_and_reset
    } = req.body;

    if (!machine_id || !product_id || !target_qty || !shift_name || !operator_name || !operator_nim || !lot_number) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [activeSessions] = await pool.query('SELECT * FROM active_sessions WHERE machine_id = ?', [machine_id]);
        
        if (save_and_reset && activeSessions.length > 0) {
            // Calculate stats for current session prior to saving
            const session = activeSessions[0];
            const now = new Date();
            const stats = await calculateSessionStats(machine_id, session.start_time, now);

            // Save current session metrics to production_sessions history
            await pool.query(`
                INSERT INTO production_sessions 
                (machine_id, product_id, lot_number, target_qty, shift_name, operator_name, operator_nim, 
                 start_time, end_time, good_count, ng_count, running_duration_sec, downtime_duration_sec, 
                 oee, availability, performance, quality) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                machine_id, session.product_id, session.lot_number || '-', session.target_qty, 
                session.shift_name, session.operator_name, session.operator_nim,
                session.start_time, now, stats.good, stats.ng, stats.runningTime, stats.downtime,
                stats.oee, stats.availability, stats.performance, stats.quality
            ]);

            // Reset in-memory telemetry counts for this machine
            resetMachineStateCounts(machine_id);

            // Update active session with new parameters and reset start_time to now
            await pool.query(`
                UPDATE active_sessions 
                SET product_id = ?, target_qty = ?, shift_name = ?, operator_name = ?, operator_nim = ?, lot_number = ?, start_time = NOW()
                WHERE machine_id = ?
            `, [product_id, target_qty, shift_name, operator_name, operator_nim, lot_number, machine_id]);
        } else {
            // Edit Only (Typo Correction Mode) or active session did not exist
            if (activeSessions.length > 0) {
                await pool.query(`
                    UPDATE active_sessions 
                    SET product_id = ?, target_qty = ?, shift_name = ?, operator_name = ?, operator_nim = ?, lot_number = ?
                    WHERE machine_id = ?
                `, [product_id, target_qty, shift_name, operator_name, operator_nim, lot_number, machine_id]);
            } else {
                await pool.query(`
                    INSERT INTO active_sessions 
                    (machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, lot_number, start_time) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                `, [machine_id, product_id, target_qty, shift_name, operator_name, operator_nim, lot_number]);
            }
        }

        res.json({ message: 'Parameters updated successfully' });
        
        // Broadcast update to all clients
        const io = socketManager.getIO();
        io.emit('data_updated', { machine_id });

        if (save_and_reset) {
            const mState = getMachineState(machine_id);
            if (mState) {
                io.emit('machine_update', { machine_id, ...mState });
            }
        }

    } catch (e) {
        console.error("Session Update Error", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
