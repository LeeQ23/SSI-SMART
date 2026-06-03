const pool = require('./database');

async function setupTables() {
    try {
        const connection = await pool.getConnection();
        console.log("Connected to database.");

        // Create production_logs table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS production_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                good_count INT DEFAULT 0,
                ng_count INT DEFAULT 0,
                machine_current FLOAT DEFAULT 0.0,
                state VARCHAR(50),
                shift_id INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Verified 'production_logs' table.");

        // Create current_logs table for high-frequency logging
        await connection.query(`
            CREATE TABLE IF NOT EXISTS current_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                machine_current FLOAT NOT NULL,
                state VARCHAR(50),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Verified 'current_logs' table.");

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error("Error setting up tables:", error);
        process.exit(1);
    }
}

setupTables();
