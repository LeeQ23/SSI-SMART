const pool = require('./database');
const config = require('./config');

// In-memory cache for settings so we don't query the DB on every single socket event
let settingsCache = {
    CURRENT_THRESHOLD: config.CURRENT_THRESHOLD,
    IDEAL_CYCLE_TIME: config.IDEAL_CYCLE_TIME
};

const loadSettings = async () => {
    try {
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
        rows.forEach(row => {
            // Convert numeric values properly
            if (row.setting_key === 'CURRENT_THRESHOLD' || row.setting_key === 'IDEAL_CYCLE_TIME') {
                settingsCache[row.setting_key] = parseFloat(row.setting_value);
            } else {
                settingsCache[row.setting_key] = row.setting_value;
            }
        });
        console.log("Settings loaded from DB:", settingsCache);
    } catch (e) {
        console.error("Failed to load dynamic settings from DB (maybe table not migrated yet?), using defaults.", e.message);
    }
};

const getSetting = (key) => {
    return settingsCache[key];
};

const getAllSettings = () => {
    return settingsCache;
};

// Force a reload (called after settings are updated via API)
const reloadSettings = async () => {
    await loadSettings();
};

module.exports = {
    loadSettings,
    getSetting,
    getAllSettings,
    reloadSettings
};
