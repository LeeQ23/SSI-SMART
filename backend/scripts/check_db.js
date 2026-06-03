const mysql = require('mysql2/promise');

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'ssi_smart_mfg'
};

const fs = require('fs');
async function check() {
    let log = "Connecting to DB at localhost...\n";
    try {
        const conn = await mysql.createConnection(dbConfig);
        log += "Connected. Querying users...\n";
        const [rows] = await conn.query('SELECT id, username, password, role FROM users');
        log += "CURRENT USERS IN DB:\n";
        rows.forEach(r => {
            log += `User: ${r.username}, Pwd: ${r.password.substring(0, 15)}...\n`;
        });
        await conn.end();
        fs.writeFileSync('sanity_test.log', log);
    } catch (e) {
        log += "ERROR: " + e.message + "\n";
        fs.writeFileSync('sanity_test.log', log);
    }
}
check();
