const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const pool = require('./database');

const SERVER_PORT = 5003;
const LOG_FILE = 'verification_result.txt';
const PROGRESS_FILE = 'verif_progress.txt';

function logProgress(msg) {
    fs.appendFileSync(PROGRESS_FILE, msg + '\n');
    console.log(msg);
}

async function run() {
    logProgress("Script started.");

    // Check if port is in use first?
    // No, just try to start server.

    logProgress("Spawning server...");
    const server = spawn('node', ['server.js'], { stdio: 'pipe' });
    let serverOutput = '';

    server.stdout.on('data', (data) => {
        serverOutput += data.toString();
        // logProgress(`[SERVER OUT]: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logProgress(`[SERVER ERR]: ${data}`);
    });

    server.on('error', (err) => {
        logProgress(`[SERVER SPAWN ERROR]: ${err.message}`);
    });

    // Wait for server to start
    logProgress("Waiting 5s for server...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        logProgress("Sending test request...");
        const testCurrent = 7.77; // Unique value
        try {
            await axios.post(`http://localhost:${SERVER_PORT}/api/current`, {
                current: testCurrent
            });
            logProgress("Request sent.");
        } catch (e) {
            logProgress(`Request failed: ${e.message}`);
            throw new Error(`Failed to send request: ${e.message}`);
        }

        // Wait for DB write
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check Current Logging
        logProgress("Checking current_logs...");
        const [rows] = await pool.query('SELECT * FROM current_logs WHERE machine_current = ? ORDER BY id DESC LIMIT 1', [testCurrent]);

        if (rows.length > 0) {
            logProgress(`SUCCESS: Current log found.`);
        } else {
            const failMsg = `FAILURE: Current log NOT found.`;
            logProgress(failMsg);
            throw new Error(failMsg);
        }

        // Test Production Logging
        logProgress("Sending production data...");
        const testGood = 999;
        const testNg = 111;
        await axios.post(`http://localhost:${SERVER_PORT}/api/production`, {
            good: testGood,
            ng: testNg
        });

        // Wait for DB write
        await new Promise(resolve => setTimeout(resolve, 2000));

        logProgress("Checking production_logs...");
        const [prodRows] = await pool.query('SELECT * FROM production_logs WHERE good_count = ? AND ng_count = ? ORDER BY id DESC LIMIT 1', [testGood, testNg]);

        if (prodRows.length > 0) {
            const successMsg = `SUCCESS: Production log found.`;
            logProgress(successMsg);
            fs.writeFileSync(LOG_FILE, "VERIFICATION PASSED: Both endpoints logging correctly.");
        } else {
            const failMsg = `FAILURE: Production log NOT found.`;
            logProgress(failMsg);
            fs.writeFileSync(LOG_FILE, failMsg);
        }

    } catch (error) {
        const errorMsg = `ERROR: ${error.message}\nServer Output:\n${serverOutput}`;
        logProgress(`Catch block: ${error.message}`);
        fs.writeFileSync(LOG_FILE, errorMsg);
    } finally {
        logProgress("Killing server...");
        server.kill();
        await pool.end();
        logProgress("Done.");
        process.exit(0);
    }
}

run();
