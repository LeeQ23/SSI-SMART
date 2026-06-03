const pool = require('./database');

async function swapBack() {
    try {
        console.log("Reversing swap: 200A1 (ID 1) <-> 20A1 (ID 7)...");

        // 1. Move ID 7 to a temp name to avoid unique constraint
        await pool.query("UPDATE machines SET code = 'TEMP_SWAP' WHERE id = 7");

        // 2. Put 20A1 into ID 1
        await pool.query("UPDATE machines SET code = '20A1' WHERE id = 1");

        // 3. Put 200A1 into ID 7
        await pool.query("UPDATE machines SET code = '200A1' WHERE id = 7");

        const [rows] = await pool.query("SELECT id, code FROM machines WHERE id IN (1, 7)");
        console.table(rows);

        console.log("SWAP REVERSED! 20A1 is now ID 1 and 200A1 is now ID 7.");

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("Swap-back error:", err);
        process.exit(1);
    }
}

swapBack();
