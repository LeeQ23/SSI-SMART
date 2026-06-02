require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 5003,
    JWT_SECRET: process.env.JWT_SECRET || 'YOUR_API_KEY',
    CURRENT_THRESHOLD: 0.5, // Amps
    IDEAL_CYCLE_TIME: 12, // Seconds
};
