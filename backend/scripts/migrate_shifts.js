const pool = require('../database');

async function fixShifts() {
    try {
        console.log("Updating legacy shifts in database...");
        
        // Convert Morning to Day Shift
        const [res1] = await pool.query("UPDATE production_sessions SET shift_name = 'Day Shift' WHERE shift_name = 'Morning'");
        console.log(`Updated ${res1.affectedRows} 'Morning' sessions to 'Day Shift'`);
        
        // Convert Evening and Night to Night Shift
        const [res2] = await pool.query("UPDATE production_sessions SET shift_name = 'Night Shift' WHERE shift_name IN ('Evening', 'Night')");
        console.log(`Updated ${res2.affectedRows} 'Evening/Night' sessions to 'Night Shift'`);

        console.log("Shift migration complete.");
    } catch (e) {
        console.error("Error migrating shifts:", e);
    } finally {
        process.exit(0);
    }
}

fixShifts();
