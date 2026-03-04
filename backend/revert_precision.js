const mysql = require('mysql2/promise');
const fs = require('fs');

async function revertPrecision() {
    let connection;
    let log = "Starting database precision REVERT...\n";
    try {
        log += "Connecting to database at localhost...\n";
        connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'ssi_smart_mfg',
            connectTimeout: 5000
        });

        log += "Reverting database timestamp precision to default (0)...\n";

        // 1. Revert production_events
        log += "- Reverting production_events.timestamp...\n";
        await connection.query('ALTER TABLE production_events MODIFY timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

        // 2. Revert machine_logs
        log += "- Reverting machine_logs.timestamp...\n";
        await connection.query('ALTER TABLE machine_logs MODIFY timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

        log += "Database REVERT COMPLETED successfully.\n";
        await connection.end();
        fs.writeFileSync('backend/precision_revert_internal.log', log);
        process.exit(0);
    } catch (err) {
        log += "Database REVERT ERROR: " + err.message + "\n";
        fs.writeFileSync('backend/precision_revert_internal.log', log);
        if (connection) await connection.end();
        process.exit(1);
    }
}

revertPrecision();
