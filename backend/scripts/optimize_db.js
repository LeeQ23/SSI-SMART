const pool = require('./database');

async function optimize() {
    console.log("Starting Database Optimization...");
    const connection = await pool.getConnection();
    
    try {
        console.log("Adding index to machine_logs (this may take a minute due to 1.2M rows)...");
        // We use machine_id first because it's usually highly selective, then timestamp for the range
        await connection.query('ALTER TABLE machine_logs ADD INDEX idx_machine_time (machine_id, timestamp)');
        console.log("Index added to machine_logs.");

        console.log("Adding index to production_events...");
        await connection.query('ALTER TABLE production_events ADD INDEX idx_machine_time (machine_id, timestamp)');
        console.log("Index added to production_events.");

        console.log("\n--- OPTIMIZATION COMPLETE ---");
        console.log("The database queries should now be significantly faster.");
    } catch (error) {
        console.error("Optimization failed:", error.message);
        if (error.message.includes("Duplicate key name")) {
            console.log("Indexes already exist.");
        }
    } finally {
        connection.release();
        process.exit(0);
    }
}

optimize();
