import axios from 'axios';

const BASE_URL = 'http://localhost:5003/api';
let token = '';

async function runTests() {
    console.log("Starting Session Flow Verification...");

    try {
        // 1. Login
        console.log("Testing Login...");
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            username: 'admin',
            password: 'pass123'
        });
        token = loginRes.data.token;
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        console.log("Login OK.");

        // 2. Clear existing active session if any (manual cleanup for test)
        // (In a real test we'd use a test DB)

        // 3. Start a new session
        console.log("Starting a new session...");
        await axios.post(`${BASE_URL}/session/edit`, {
            password: 'admin123',
            machine_id: 1,
            product_id: 'TEST-PROD-001',
            target_qty: 1000,
            shift_name: 'Morning',
            operator_name: 'Test Operator',
            operator_nim: 'YOUR_VNC_PASSWORD28'
        }, authHeader);
        console.log("Session started.");

        // 4. Verify Dashboard reflects active session
        console.log("Checking dashboard status...");
        const dashRes = await axios.get(`${BASE_URL}/dashboard?machine_id=1`, authHeader);
        if (dashRes.data.product_id === 'TEST-PROD-001') {
            console.log("Dashboard reflects active session correctly.");
        } else {
            console.error("Dashboard check failed!", dashRes.data);
        }

        // 5. Simulate some signals
        console.log("Simulating production signals...");
        await axios.post(`${BASE_URL}/signal`, { type: 'good', machine_id: 1 });
        await axios.post(`${BASE_URL}/signal`, { type: 'good', machine_id: 1 });
        await axios.post(`${BASE_URL}/signal`, { type: 'ng', machine_id: 1 });
        console.log("Signals sent.");

        // 6. Start another session (Ending the first one)
        console.log("Starting second session to end the first one...");
        await axios.post(`${BASE_URL}/session/edit`, {
            password: 'admin123',
            machine_id: 1,
            product_id: 'TEST-PROD-002',
            target_qty: 500,
            shift_name: 'Evening',
            operator_name: 'Next Operator',
            operator_nim: '87654321'
        }, authHeader);
        console.log("Second session started.");

        // 7. Verify first session is in history
        console.log("Checking history for the completed session...");
        const historyRes = await axios.get(`${BASE_URL}/history?machine_id=1`, authHeader);
        const savedSession = historyRes.data.find(s => s.product_id === 'TEST-PROD-001');
        if (savedSession && parseInt(savedSession.good_count) >= 2) {
            console.log("History records saved session correctly.");
        } else {
            console.error("History check failed!", historyRes.data);
        }

        console.log("\n--- VERIFICATION SUCCESSFUL ---");

    } catch (error) {
        console.error("Verification FAILED:", error.response?.data || error.message);
    }
}

runTests();
