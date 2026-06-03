const axios = require('axios');

const BASE_URL = 'http://localhost:5003/api';
let token = '';

async function verifySync() {
    console.log("Starting Sync Verification (Overview vs Detail)...");

    try {
        // 1. Login
        console.log("Logging in...");
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            username: 'admin',
            password: 'pass123'
        });
        token = loginRes.data.token;
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Start a fresh session for Machine 1
        console.log("Starting a new session for Machine 1...");
        await axios.post(`${BASE_URL}/session/edit`, {
            password: 'admin123',
            machine_id: 1,
            product_id: 'VERIFY-SYNC',
            target_qty: 100,
            shift_name: 'Morning',
            operator_name: 'Verifier',
            operator_nim: '00000000'
        }, authHeader);

        // 3. Send signals
        console.log("Sending 3 good signals...");
        for(let i=0; i<3; i++) {
            await axios.post(`${BASE_URL}/signal`, { type: 'good', machine_id: 1 });
        }

        // 4. Check Detail View
        const detailRes = await axios.get(`${BASE_URL}/dashboard?machine_id=1`, authHeader);
        const detailGood = detailRes.data.good;
        console.log(`Detail View Good Count: ${detailGood}`);

        // 5. Check Overview View
        const overviewRes = await axios.get(`${BASE_URL}/dashboard/all`, authHeader);
        const m1Overview = overviewRes.data.find(m => m.id === 1);
        const overviewGood = m1Overview ? m1Overview.good : null;
        console.log(`Overview View Good Count: ${overviewGood}`);

        // 6. Assert
        if (detailGood === 3 && overviewGood === 3) {
            console.log("\n✅ SUCCESS: Counts are synchronized!");
        } else {
            console.error("\n❌ FAILURE: Counts are NOT synchronized or incorrect.");
            console.error(`Detail: ${detailGood}, Overview: ${overviewGood}`);
        }

    } catch (e) {
        console.error("Verification failed with error:", e.response?.data || e.message);
    }
}

verifySync();
