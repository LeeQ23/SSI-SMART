const pool = require('../database');

async function migrate() {
    try {
        console.log("Starting Migration: Creating system_settings table...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value VARCHAR(255) NOT NULL,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("-> Table system_settings ensured.");

        // Insert defaults if not exists
        await pool.query(`
            INSERT IGNORE INTO system_settings (setting_key, setting_value, description)
            VALUES 
            ('CURRENT_THRESHOLD', '0.5', 'Threshold in Amps to consider the machine running.'),
            ('IDEAL_CYCLE_TIME', '12', 'Ideal Cycle Time in seconds for OEE performance calculation.')
        `);
        console.log("-> Default settings inserted.");

        console.log("Migration COMPLETED successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration ERROR:", err);
        process.exit(1);
    }
}

migrate();
