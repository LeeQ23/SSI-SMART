const pool = require('./database');

async function fix() {
    try {
        console.log("Fixing machine name: 20A1 -> 200A1 (ID: 1)...");

        // Using the central pool ensure we hit the correct database
        const [result] = await pool.query("UPDATE machines SET code = '200A1' WHERE id = 1");

        console.log("Affected rows:", result.affectedRows);

        if (result.affectedRows > 0) {
            console.log("Fix COMPLETED successfully! Machine ID 1 is now 200A1.");
        } else {
            console.warn("No machine found with ID 1 to update.");
        }
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("Fix FAILED:", err);
        process.exit(1);
    }
}

fix();
