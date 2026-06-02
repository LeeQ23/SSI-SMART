const express = require('express');
const router = express.Router();
const pool = require('../database');
const authenticateToken = require('../utils/auth');
const socketManager = require('../socketManager');

router.post('/edit', authenticateToken, async (req, res) => {
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
        const io = socketManager.getIO();
        io.emit('data_updated', { machine_id });

    } catch (e) {
        console.error("Session Update Error", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
