const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../database');
const config = require('../config');
const authenticateToken = require('../utils/auth');

// Auth Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log(`Processing login for ${username}...`);
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            console.log(`Login failed: User ${username} not found`);
            return res.status(401).json({ error: 'Invalid credentials: User not found' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            console.log(`Login failed: Invalid password for ${username}`);
            return res.status(401).json({ error: 'Invalid credentials: Password incorrect' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, config.JWT_SECRET, { expiresIn: '365d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create User
router.post('/users', authenticateToken, async (req, res) => {
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

// Seed Endpoint (for demo)
router.post('/seed', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.sendStatus(403);
    const hashedPassword = await bcrypt.hash('pass123', 10);
    await pool.query('INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'manager']);
    await pool.query('INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['op1', hashedPassword, 'operator']);
    res.send('Seeded');
});

module.exports = router;
