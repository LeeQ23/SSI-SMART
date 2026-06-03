const pool = require('./database');

async function run() {
    try {
        const query = `
        CREATE TABLE IF NOT EXISTS quality_inspections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            measure_session_id INT NOT NULL,
            operator_name VARCHAR(255),
            operator_nim VARCHAR(255),
            product_id VARCHAR(255),
            inspection_type ENUM('weight', 'dimension'),
            criteria VARCHAR(255),
            start_time DATETIME,
            end_time DATETIME,
            total_ok INT DEFAULT 0,
            total_ng INT DEFAULT 0,
            status VARCHAR(50),
            received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
        await pool.query(query);
        console.log("Table 'quality_inspections' created successfully.");
    } catch (e) {
        console.error("Error creating table:", e);
    } finally {
        process.exit(0);
    }
}

run();
