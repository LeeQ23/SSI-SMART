const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: '127.0.0.1', // Force IPv4
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg'
};

async function checkUsers() {
    try {
        console.log("Connecting to 127.0.0.1...");
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
