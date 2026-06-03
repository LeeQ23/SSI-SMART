require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 5003,
    JWT_SECRET: process.env.JWT_SECRET || 'YOUR_API_KEY',
    FIRMWARE_API_KEY: process.env.FIRMWARE_API_KEY || 'default_secret_key',
    CURRENT_THRESHOLD: 0.5, // Amps
    IDEAL_CYCLE_TIME: 12, // Seconds
};
