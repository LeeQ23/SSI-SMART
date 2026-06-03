const pool = require('../database');

async function migrate() {
    console.log("Starting Migration: Adding lot_number to session tables...");

    try {
        // 1. Add to active_sessions
        try {
            await pool.query(`ALTER TABLE active_sessions ADD COLUMN lot_number VARCHAR(100) DEFAULT '-' AFTER product_id`);
            console.log("-> Added lot_number to active_sessions.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("-> lot_number already exists in active_sessions.");
            } else {
                throw err;
            }
        }

        // 2. Add to production_sessions
        try {
            await pool.query(`ALTER TABLE production_sessions ADD COLUMN lot_number VARCHAR(100) DEFAULT '-' AFTER product_id`);
            console.log("-> Added lot_number to production_sessions.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("-> lot_number already exists in production_sessions.");
            } else {
                throw err;
            }
        }

        console.log("Migration COMPLETED successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration ERROR:", err);
        process.exit(1);
    }
}

migrate();
