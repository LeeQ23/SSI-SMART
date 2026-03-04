const mysql = require('mysql2/promise');
const fs = require('fs');

async function upgradePrecision() {
    let connection;
    let log = "Starting database upgrade...\n";
    try {
        log += "Connecting to database at localhost...\n";
        connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'ssi_smart_mfg',
            connectTimeout: 5000
        });

        log += "Upgrading database timestamp precision to millisecond (6)...\n";

        // 1. Update production_events
        log += "- Updating production_events.timestamp...\n";
        await connection.query('ALTER TABLE production_events MODIFY timestamp TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6)');

        // 2. Update machine_logs
        log += "- Updating machine_logs.timestamp...\n";
        await connection.query('ALTER TABLE machine_logs MODIFY timestamp TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6)');

        log += "Database upgrade COMPLETED successfully.\n";
        await connection.end();
        fs.writeFileSync('backend/precision_upgrade_internal.log', log);
        process.exit(0);
    } catch (err) {
        log += "Database upgrade ERROR: " + err.message + "\n";
        fs.writeFileSync('backend/precision_upgrade_internal.log', log);
        if (connection) await connection.end();
        process.exit(1);
    }
}

upgradePrecision();
