const axios = require('axios');

const BASE_URL = 'http://localhost:5003'; // Adjust if port is different

async function testAPIs() {
    console.log("Testing APIs for Timeline and Product Events...");

    try {
        // 1. Login to get token (assuming admin:pass123 exists from seed)
        console.log("Logging in...");
        const loginRes = await axios.post(`${BASE_URL}/api/login`, {
            username: 'admin',
            password: 'pass123'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Test Dashboard API
        console.log("Testing /api/dashboard...");
        const dashRes = await axios.get(`${BASE_URL}/api/dashboard?machine_id=1`, config);
        if (dashRes.data.timeline && dashRes.data.productionEvents) {
            console.log("✅ Dashboard API returns timeline and productionEvents");
            console.log(`   Timeline length: ${dashRes.data.timeline.length}`);
            console.log(`   Events length: ${dashRes.data.productionEvents.length}`);
        } else {
            console.log("❌ Dashboard API missing timeline or productionEvents");
        }

        // 3. Test Analytics API
        console.log("Testing /api/analytics...");
        const now = new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        const end = now.toISOString().slice(0, 16);

        const analyticsRes = await axios.get(`${BASE_URL}/api/analytics?start=${start}&end=${end}&machine_id=1`, config);
        if (analyticsRes.data.timeline && analyticsRes.data.productionEvents) {
            console.log("✅ Analytics API returns timeline and productionEvents");
            console.log(`   Timeline length: ${analyticsRes.data.timeline.length}`);
            console.log(`   Events length: ${analyticsRes.data.productionEvents.length}`);
        } else {
            console.log("❌ Analytics API missing timeline or productionEvents");
        }

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

testAPIs();
