const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function run() {
    console.log("Starting standalone fix (IPv4)...");
    try {
        const pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'ssi_smart_mfg'
        });

        console.log("Pool created. Hashing password...");
        const hash = await bcrypt.hash('pass123', 10);

        console.log("Updating database...");
        const [result] = await pool.query('UPDATE users SET password = ? WHERE username IN (?, ?)', [hash, 'admin', 'op1']);
        console.log("Update Result:", result);

        await pool.end();
        console.log("Done.");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
