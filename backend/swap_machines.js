const pool = require('./database');

async function swap() {
    try {
        console.log("Detecting machine IDs for 20A1 and 200A1...");

        // 1. Find the current IDs
        const [m20] = await pool.query("SELECT id FROM machines WHERE code = '20A1'");
        const [m200] = await pool.query("SELECT id FROM machines WHERE code = '200A1'");

        if (m20.length === 0) {
            console.warn("20A1 not found. Maybe already changed?");
        }

        if (m200.length > 0) {
            const id200 = m200[0].id;
            console.log(`Found 200A1 at ID: ${id200}. Swapping with ID 1...`);

            // 2. Perform swap using a TEMP name to avoid UNIQUE constraint errors
            await pool.query("UPDATE machines SET code = 'TEMP_SWAP' WHERE id = ?", [id200]);
            await pool.query("UPDATE machines SET code = '200A1' WHERE id = 1");
            await pool.query("UPDATE machines SET code = '20A1' WHERE id = ?", [id200]);

            console.log("SWAP COMPLETED! Machine ID 1 is now 200A1.");
        } else {
            // If 200A1 doesn't exist at all, just rename 1
            console.log("200A1 not found in DB. Renaming ID 1 directly...");
            await pool.query("UPDATE machines SET code = '200A1' WHERE id = 1");
            console.log("Renamed ID 1 to 200A1.");
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("Swap error:", err);
        process.exit(1);
    }
}

swap();
