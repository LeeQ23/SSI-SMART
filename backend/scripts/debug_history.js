const pool = require('./database');

async function debug() {
    try {
        const [rows] = await pool.query(`
            SELECT 
                DATE(timestamp) as date, 
                shift_id,
                COUNT(CASE WHEN signal_type = 'good' THEN 1 END) as good,
                COUNT(CASE WHEN signal_type = 'ng' THEN 1 END) as ng
            FROM production_events
            GROUP BY DATE(timestamp), shift_id
        `);

        console.log("Found rows:", rows.length);
        const [shifts] = await pool.query('SELECT * FROM shifts');

        for (const row of rows) {
            const sDef = shifts.find(x => x.id === row.shift_id);
            const dateStr = row.date.toISOString().split('T')[0];
            console.log(`Checking Window: ${dateStr} for Shift ${row.shift_id}`);

            if (sDef) {
                const start = `${dateStr} ${sDef.start_time}`;
                const end = `${dateStr} ${sDef.end_time}`;
                console.log(`Querying BETWEEN ${start} AND ${end}`);

                const [logs] = await pool.query(`
                    SELECT state, timestamp FROM machine_logs
                    WHERE timestamp BETWEEN ? AND ?
                    ORDER BY timestamp ASC
                `, [start, end]);

                console.log(`Logs found: ${logs.length}`);
                if (logs.length > 0) {
                    console.log(`First log: ${logs[0].timestamp}, state: ${logs[0].state}`);
                }
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
