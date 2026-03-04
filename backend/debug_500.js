const pool = require('./database');

async function debugQuery() {
    console.error("DEBUG: Starting Query Check...");
    const start = '2026-01-26T13:26:00';
    const end = '2026-02-02T13:26:00';

    try {
        console.error("DEBUG: Running Event Query...");
        const [events] = await pool.query(`
            SELECT signal_type, COUNT(*) as count
            FROM production_events
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY signal_type
        `, [start, end]);
        console.error("DEBUG: Events Result:", events);

        console.error("DEBUG: Running Machine Logs Query...");
        const [logs] = await pool.query(`
            SELECT state, timestamp
            FROM machine_logs
            WHERE timestamp BETWEEN ? AND ?
            ORDER BY timestamp ASC
        `, [start, end]);
        console.error("DEBUG: Machine Logs Count:", logs.length);

        console.error("DEBUG: Success! No DB Error found.");

    } catch (e) {
        console.error("DEBUG: CRITICAL DB ERROR:", e.message);
        console.error("DEBUG: SQL State:", e.sqlState);
        console.error("DEBUG: SQL Message:", e.sqlMessage);
    } finally {
        process.exit();
    }
}

debugQuery();
