require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ssi_smart_mfg' // Default from database.js
});

(async () => {
    try {
        console.log("Checking database...");
        const [rows] = await pool.query("SHOW TABLES LIKE 'shifts'");
        if (rows.length === 0) {
            console.log("ERROR: Table 'shifts' does not exist!");
        } else {
            console.log("Table 'shifts' exists.");
            const [data] = await pool.query("SELECT * FROM shifts");
            console.log("Data in shifts:", data);
        }
    } catch (e) {
        console.error("Database connection error:", e);
    }
    process.exit();
})();
