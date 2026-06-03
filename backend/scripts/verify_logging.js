const axios = require('axios');
const pool = require('./database');

async function testLogging() {
    try {
        console.log("Sending test data to /api/current...");
        const testCurrent = 5.5; // Distinctive value

        try {
            await axios.post('http://localhost:5003/api/current', {
                current: testCurrent
            });
            console.log("Request sent successfully.");
        } catch (error) {
            console.error("Error sending request:", error.message);
            if (error.response) console.error("Response data:", error.response.data);
            process.exit(1);
        }

        // Wait a moment for async DB write
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("Checking database for log entry...");
        const [rows] = await pool.query('SELECT * FROM current_logs WHERE machine_current = ? ORDER BY id DESC LIMIT 1', [testCurrent]);

        if (rows.length > 0) {
            console.log("SUCCESS: Log entry found!");
            console.log(rows[0]);
        } else {
            console.error("FAILURE: No log entry found.");
            process.exit(1);
        }

        pool.end();
    } catch (error) {
        console.error("Test failed:", error);
        pool.end();
        process.exit(1);
    }
}

testLogging();
