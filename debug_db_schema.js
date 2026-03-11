const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ssi_smart_mfg'
};

async function check() {
    try {
        console.log("Connecting to:", dbConfig.host);
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connection successful.");

        const [tables] = await connection.query("SHOW TABLES");
        console.log("Tables in database:", tables.map(t => Object.values(t)[0]));

        const [schema] = await connection.query("DESCRIBE downtimes");
        console.log("Downtimes Schema:", schema);

        await connection.end();
    } catch (err) {
        console.error("DEBUG ERROR:", err.message);
    }
}

check();
