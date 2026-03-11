const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg'
};

async function migrate() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database.");

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
    } catch (error) {
        console.error("Migration error:", error);
        process.exit(1);
    }
}

migrate();
