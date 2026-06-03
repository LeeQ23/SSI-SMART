require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ssi_smart_mfg'
});

(async () => {
    try {
        console.log("Seeding shifts...");

        // Create table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shifts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL
            )
        `);

        // Check if empty
        const [rows] = await pool.query("SELECT * FROM shifts");
        if (rows.length === 0) {
            console.log("Table empty. Inserting defaults...");
            await pool.query("INSERT INTO shifts (name, start_time, end_time) VALUES ('Shift 1 (Morning)', '07:00:00', '15:00:00')");
            await pool.query("INSERT INTO shifts (name, start_time, end_time) VALUES ('Shift 2 (Afternoon)', '15:00:00', '23:00:00')");
            await pool.query("INSERT INTO shifts (name, start_time, end_time) VALUES ('Shift 3 (Night)', '23:00:00', '07:00:00')");
            console.log("Shifts seeded.");
        } else {
            console.log("Shifts already match existing data.");
        }

    } catch (e) {
        console.error("Seeding error:", e);
    }
    process.exit();
})();
