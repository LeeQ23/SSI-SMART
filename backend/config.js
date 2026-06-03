require('dotenv').config();

if (!process.env.JWT_SECRET) {
    console.error("CRITICAL ERROR: JWT_SECRET environment variable is missing. Check your .env file.");
    process.exit(1);
}

module.exports = {
    PORT: process.env.PORT || 5003,
    JWT_SECRET: process.env.JWT_SECRET,
    FIRMWARE_API_KEY: process.env.FIRMWARE_API_KEY || 'default_secret_key',
    CURRENT_THRESHOLD: 0.5, // Amps
    IDEAL_CYCLE_TIME: 12, // Seconds
};
