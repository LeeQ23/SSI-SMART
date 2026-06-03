const axios = require('axios');

async function testAnalytics() {
    try {
        // 1. Login
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:5003/api/login', {
            username: 'admin',
            password: 'pass123'
        });
        const token = loginRes.data.token;
        console.log("Login successful. Token obtained.");

        // 2. Call Analytics
        const start = '2026-01-26T13:26';
        const end = '2026-02-02T13:26';
        console.log(`Requesting Analytics for ${start} to ${end}...`);

        const url = `http://localhost:5003/api/analytics?start=${start}&end=${end}`;
        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Analytics Data:");
        console.log(JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.error("ERROR:");
        if (e.response) {
            console.error(`Status: ${e.response.status}`);
            console.error("Data:", e.response.data);
        } else {
            console.error(e.message);
        }
    }
}

testAnalytics();
