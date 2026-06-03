const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg'
};

async function migrate() {
    try {
        console.log("Connecting to database...");
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected successfully.");

        console.log("Creating 'downtimes' table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS downtimes (
              id INT AUTO_INCREMENT PRIMARY KEY,
              machine_id INT NOT NULL,
              reason TEXT NOT NULL,
              start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              end_time TIMESTAMP NULL,
              operator_id INT,
              FOREIGN KEY (machine_id) REFERENCES machines(id),
              FOREIGN KEY (operator_id) REFERENCES users(id)
            )
        `);
        console.log("Table 'downtimes' created successfully.");

        await connection.end();
        console.log("Connection closed.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exit(1);
    }
}

migrate();
