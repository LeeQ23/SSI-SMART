const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ssi_smart_mfg',
    });

    try {
        const [machines] = await pool.query('SELECT COUNT(*) as count FROM machines');
        console.log('Machines count:', machines[0].count);

        const [logs] = await pool.query('SELECT COUNT(*) as count FROM machine_logs');
        console.log('Logs count:', logs[0].count);

        const [events] = await pool.query('SELECT COUNT(*) as count FROM production_events');
        console.log('Events count:', events[0].count);

        const [latestLog] = await pool.query('SELECT MAX(timestamp) as latest FROM machine_logs');
        console.log('Latest log timestamp:', latestLog[0].latest);

        const [latestEvent] = await pool.query('SELECT MAX(timestamp) as latest FROM production_events');
        console.log('Latest event timestamp:', latestEvent[0].latest);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
