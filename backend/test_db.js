const pool = require('./database');

async function test() {
    try {
        console.log("Testing DB connection...");
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log("DB Connection OK. Result:", rows[0].result);

        console.log("Checking tables...");
        const [tables] = await pool.query('SHOW TABLES');
        console.log("Tables found:", tables.map(t => Object.values(t)[0]));

        process.exit(0);
    } catch (err) {
        console.error("DB Test Failed:", err);
        process.exit(1);
    }
}

test();
