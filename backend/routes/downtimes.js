const express = require('express');
const router = express.Router();
const pool = require('../database');
const authenticateToken = require('../utils/auth');

// Start a downtime
router.post('/start', authenticateToken, async (req, res) => {
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
router.post('/end', authenticateToken, async (req, res) => {
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
router.get('/', authenticateToken, async (req, res) => {
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
router.get('/active/:machine_id', authenticateToken, async (req, res) => {
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

module.exports = router;
