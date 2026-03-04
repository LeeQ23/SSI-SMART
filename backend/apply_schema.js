const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg',
    multipleStatements: true // Enable multiple statements for SQL script
};

async function applySchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database.");

        const sqlPath = path.join(__dirname, 'schema_updates.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing schema updates...");
        await connection.query(sql);
        console.log("Schema updates applied successfully.");

        await connection.end();
    } catch (error) {
        console.error("Error applying schema:", error);
        process.exit(1);
    }
}

applySchema();
