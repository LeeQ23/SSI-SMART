const pool = require('./database');

async function verify() {
    try {
        console.log("Checking Machine Order (Top 10)...");
        const [rows] = await pool.query("SELECT id, code, type FROM machines ORDER BY id LIMIT 10");
        console.table(rows);

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("Verification error:", err);
        process.exit(1);
    }
}

verify();
