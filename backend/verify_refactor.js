const axios = require('axios');
const pool = require('./database');
const fs = require('fs');

const SERVER_PORT = 5003;
const BASE_URL = `http://localhost:${SERVER_PORT}/api`;
const LOG_FILE = 'refactor_verification.txt';

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function runTest() {
    log("Starting Refactor Verification...");
    try {
        // 1. Simulate "Good" Signal
        log("1. Sending /api/signal { type: 'good' }...");
        await axios.post(`${BASE_URL}/signal`, { type: 'good' });
        log("   -> Signal Sent.");

        // 2. Simulate "NG" Signal
        log("2. Sending /api/signal { type: 'ng' }...");
        await axios.post(`${BASE_URL}/signal`, { type: 'ng' });
        log("   -> Signal Sent.");

        // 3. Simulate Machine Status
        log("3. Sending /api/machine-status { current: 1.5 }...");
        await axios.post(`${BASE_URL}/machine-status`, { current: 1.5 });
        log("   -> Status Sent.");

        // Wait for processing
        await new Promise(r => setTimeout(r, 1000));

        // 4. Check Dashboard
        log("4. Fetching /api/dashboard...");

        // Need to simulate Login first to get token!
        // or bypass if we didn't mock auth.
        // Wait, authentication is required for dashboard.
        // Let's seed a user or use existing admin
        const loginRes = await axios.post(`${BASE_URL}/login`, { username: 'admin', password: 'pass123' }); // Assuming password reset worked
        const token = loginRes.data.token;
        log("   -> Logged in.");

        const dashRes = await axios.get(`${BASE_URL}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = dashRes.data;
        log("   -> Dashboard Data Received:");
        log(JSON.stringify(data, null, 2));

        // Assertions
        if (data.good > 0 && data.ng > 0 && data.state === 'running' && data.current === 1.5) {
            log("SUCCESS: Dashboard reflects all inputs!");
        } else {
            log("FAILURE: Dashboard data missing or incorrect.");
        }

    } catch (error) {
        log("ERROR: " + error.message);
        if (error.response) {
            log("Response: " + JSON.stringify(error.response.data));
        }
    } finally {
        process.exit(0);
    }
}

runTest();
