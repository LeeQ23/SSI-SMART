const pool = require('./database');

async function listTables() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log("Database Tables Audit:");
        console.log("----------------------");
        for (const t of tables) {
            const tableName = Object.values(t)[0];
            const [count] = await pool.query(`SELECT COUNT(*) as c FROM ${tableName}`);
            console.log(`- ${tableName}: ${count[0].c} rows`);
        }
        console.log("----------------------");
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
listTables();
