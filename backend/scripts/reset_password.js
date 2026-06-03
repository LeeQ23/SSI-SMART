const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ssi_smart_mfg',
    multipleStatements: true
};

async function reset() {
    console.log("--- SCRIPT START ---");
    let pool;
    try {
        console.log("Creating Pool...");
        pool = mysql.createPool(dbConfig);
        console.log("Pool created. Getting connection...");
        const conn = await pool.getConnection(); // Use pool like server.js
        console.log("Connection acquired.");

        const hash = await bcrypt.hash('pass123', 10);
        console.log("New Hash:", hash);

        // Update Admin
        const [resAdmin] = await conn.query('UPDATE users SET password = ? WHERE username = ?', [hash, 'admin']);
        console.log("Admin Update:", resAdmin.info);

        // Update Op1
        const [resOp] = await conn.query('UPDATE users SET password = ? WHERE username = ?', [hash, 'op1']);
        console.log("Op1 Update:", resOp.info);

        // Verify
        const [rows] = await conn.query('SELECT username, password FROM users');
        console.log("VERIFICATION DUMP:");
        rows.forEach(r => console.log(`${r.username}: ${r.password.substring(0, 20)}...`));

        conn.release();
        console.log("Connection released.");
    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        if (pool) await pool.end();
        console.log("--- SCRIPT END ---");
    }
}

reset();
