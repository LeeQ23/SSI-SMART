const express = require('express');
const router = express.Router();
const pool = require('../database');
const authenticateToken = require('../utils/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [shifts] = await pool.query('SELECT * FROM shifts');
        res.json(shifts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.sendStatus(403);
    const { start_time, end_time } = req.body;
    try {
        await pool.query('UPDATE shifts SET start_time = ?, end_time = ? WHERE id = ?', [start_time, end_time, req.params.id]);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
