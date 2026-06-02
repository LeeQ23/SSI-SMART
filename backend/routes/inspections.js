const express = require('express');
const router = express.Router();
const pool = require('../database');
const authenticateToken = require('../utils/auth');
const socketManager = require('../socketManager');

router.post('/', async (req, res) => {
    const { id, operator_name, operator_nim, product_id, inspection_type, criteria, start_time, end_time, total_ok, total_ng, status } = req.body;
    
    try {
        await pool.query(
            `INSERT INTO quality_inspections 
             (measure_session_id, operator_name, operator_nim, product_id, inspection_type, criteria, start_time, end_time, total_ok, total_ng, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, operator_name, operator_nim, product_id, inspection_type, criteria, start_time, end_time, total_ok, total_ng, status]
        );
        
        const io = socketManager.getIO();
        io.emit('inspection_received', req.body);
        res.sendStatus(201);
    } catch (e) {
        console.error("Quality Inspection Insert Error", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM quality_inspections ORDER BY received_at DESC LIMIT 50');
        res.json(rows);
    } catch (e) {
        console.error("Quality Inspection Fetch Error", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
