const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg'
};

async function checkUsers() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database.");

        const [rows] = await connection.query('SELECT id, username, password, role FROM users');
        console.log("Current Users:");
        console.log(rows);

        await connection.end();
    } catch (error) {
        console.error("Error checking users:", error);
    }
}

checkUsers();
