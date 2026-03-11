const axios = require('axios');

const API_URL = 'http://localhost:5003/api';
let token = '';

async function test() {
    try {
        console.log("Starting Downtime API Test...");

        // 1. Login to get token
        console.log("Logging in...");
        const loginRes = await axios.post(`${API_URL}/login`, {
            username: 'admin',
            password: 'pass123'
        });
        token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log("Logged in successfully.");

        // 2. Start Downtime
        console.log("Starting downtime for Machine 1...");
        await axios.post(`${API_URL}/downtime/start`, {
            machine_id: 1,
            reason: 'Test Downtime: Toilet Break'
        }, config);
        console.log("Downtime started.");

        // 3. Check Active Downtime
        console.log("Checking active downtime for Machine 1...");
        const activeRes = await axios.get(`${API_URL}/downtime/active/1`, config);
        console.log("Active Downtime:", activeRes.data);
        if (!activeRes.data || activeRes.data.reason !== 'Test Downtime: Toilet Break') {
            throw new Error("Active downtime not found or incorrect reason");
        }

        // 4. End Downtime
        console.log("Ending downtime for Machine 1...");
        await axios.post(`${API_URL}/downtime/end`, {
            machine_id: 1
        }, config);
        console.log("Downtime ended.");

        // 5. Verify in History
        console.log("Checking downtime history...");
        const historyRes = await axios.get(`${API_URL}/downtimes`, config);
        const lastDowntime = historyRes.data[0];
        console.log("Last recorded downtime:", lastDowntime);
        if (lastDowntime.reason !== 'Test Downtime: Toilet Break' || !lastDowntime.end_time) {
            throw new Error("Downtime history verification failed");
        }

        console.log("All Downtime API tests passed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

test();
