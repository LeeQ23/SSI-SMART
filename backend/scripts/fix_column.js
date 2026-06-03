const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg'
};

async function fixColumn() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database.");

        console.log("Renaming column 'type' to 'signal_type' in production_events...");
        try {
            await connection.query("ALTER TABLE production_events CHANGE type signal_type ENUM('good', 'ng') NOT NULL");
            console.log("Column renamed successfully.");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log("Column 'type' not found. checking if 'signal_type' already exists...");
                const [rows] = await connection.query("SHOW COLUMNS FROM production_events LIKE 'signal_type'");
                if (rows.length > 0) {
                    console.log("Column 'signal_type' already exists. No action needed.");
                } else {
                    console.error("Unknown error:", err);
                }
            } else {
                throw err;
            }
        }

        await connection.end();
    } catch (error) {
        console.error("Error fixing column:", error);
    }
}

fixColumn();
