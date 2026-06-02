const express = require('express');
const router = express.Router();
const pool = require('../database');
const authenticateToken = require('../utils/auth');
const settingsManager = require('../settingsManager');

// Get all settings
router.get('/', authenticateToken, (req, res) => {
    // Return cached settings for speed
    res.json(settingsManager.getAllSettings());
});

// Update settings (Manager only)
router.put('/', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.sendStatus(403);
    
    const settingsToUpdate = req.body; // e.g. { CURRENT_THRESHOLD: 0.8, IDEAL_CYCLE_TIME: 15 }
    
    try {
        const promises = Object.keys(settingsToUpdate).map(key => {
            return pool.query(
                'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
                [settingsToUpdate[key].toString(), key]
            );
        });
        
        await Promise.all(promises);
        
        // Force the cache to reload
        await settingsManager.reloadSettings();
        
        res.json({ message: 'Settings updated successfully', settings: settingsManager.getAllSettings() });
    } catch (e) {
        console.error("Settings Update Error", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
