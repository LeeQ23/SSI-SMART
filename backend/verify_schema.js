const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg'
};

async function verifySchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database.");

        const tables = ['production_events', 'machine_logs'];

        for (const table of tables) {
            console.log(`Checking table: ${table}`);
            const [rows] = await connection.query(`DESCRIBE ${table}`);
            console.log(rows);
        }

        await connection.end();
    } catch (error) {
        console.error("Error verifying schema:", error);
    }
}

verifySchema();
