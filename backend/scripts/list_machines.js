const pool = require('./database');

async function list() {
    try {
        console.log("Current Machines in Database:");
        const [rows] = await pool.query("SELECT * FROM machines");
        console.table(rows);
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("List error:", err);
        process.exit(1);
    }
}

list();
