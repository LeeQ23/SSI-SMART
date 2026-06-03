const pool = require('./database');

async function verify() {
    try {
        console.log("Verifying machine name for ID 1...");
        const [rows] = await pool.query("SELECT id, code FROM machines WHERE id = 1");
        if (rows.length > 0) {
            console.log("Success! Machine ID 1 is now:", rows[0].code);
        } else {
            console.warn("No machine found with ID 1.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Verification error:", err);
        process.exit(1);
    }
}

verify();
