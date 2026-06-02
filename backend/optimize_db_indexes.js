const pool = require('./database');

async function optimizeIndexes() {
    try {
        console.log("Starting Database Index Optimization...");

        // production_events index
        console.log("- Adding index on production_events(machine_id, timestamp)...");
        try {
            await pool.query('ALTER TABLE production_events ADD INDEX idx_machine_time (machine_id, timestamp)');
            console.log("  -> Index added to production_events successfully.");
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log("  -> Index already exists on production_events.");
            } else {
                throw e;
            }
        }

        // machine_logs index
        console.log("- Adding index on machine_logs(machine_id, timestamp)...");
        try {
            await pool.query('ALTER TABLE machine_logs ADD INDEX idx_machine_time (machine_id, timestamp)');
            console.log("  -> Index added to machine_logs successfully.");
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log("  -> Index already exists on machine_logs.");
            } else {
                throw e;
            }
        }

        console.log("Database Index Optimization COMPLETED successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Optimization ERROR:", err);
        process.exit(1);
    }
}

optimizeIndexes();
