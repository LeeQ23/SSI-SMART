const pool = require('./database');

const machines = [
    ['20A1', 'mechanical'], ['20A2', 'mechanical'], ['40A1', 'mechanical'], ['40A2', 'mechanical'],
    ['100A1', 'mechanical'], ['100A2', 'mechanical'], ['200A1', 'mechanical'], ['200A2', 'mechanical'],
    ['200A3', 'mechanical'], ['300C', 'hydraulic'], ['500C', 'hydraulic'], ['500X', 'cnc'], ['750C', 'hydraulic']
];

async function migrate() {
    try {
        console.log("Starting Migration with current database.js configuration...");

        // Test connection first
        const [test] = await pool.query('SELECT 1 + 1 AS result');
        console.log("Connection verified:", test[0].result);

        // 1. Create machines table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS machines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(10) NOT NULL UNIQUE,
                type ENUM('mechanical', 'hydraulic', 'cnc') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("- Created 'machines' table");

        // 2. Insert machines
        for (const [code, type] of machines) {
            await pool.query('INSERT IGNORE INTO machines (code, type) VALUES (?, ?)', [code, type]);
        }
        console.log("- Inserted 13 machines");

        // 3. Add columns to existing tables
        const tables = ['production_events', 'machine_logs', 'targets'];
        for (const table of tables) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE 'machine_id'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN machine_id INT DEFAULT 1`);
                await pool.query(`ALTER TABLE ${table} ADD FOREIGN KEY (machine_id) REFERENCES machines(id)`);
                console.log(`- Added 'machine_id' to ${table}`);
            } else {
                console.log(`- 'machine_id' already exists in ${table}`);
            }
        }

        console.log("Migration COMPLETED successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration ERROR:", err);
        process.exit(1);
    }
}

// Timeout to prevent hanging
setTimeout(() => {
    console.error("Migration timed out after 10 seconds.");
    process.exit(1);
}, 10000);

migrate();
burial: "2026-02-05T11:47:59+07:00"
