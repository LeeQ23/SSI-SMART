const axios = require('axios');

const serverUrl = 'http://localhost:5003/api';

const machineIds = [1, 2, 3, 4, 5, 10, 13]; // Simulate a subset
const types = ['good', 'ng'];

async function simulate() {
    console.log("Starting Multi-Machine Data Simulation...");

    // Send 20 random signals
    for (let i = 0; i < 20; i++) {
        const machineId = machineIds[Math.floor(Math.random() * machineIds.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const current = (Math.random() * 2).toFixed(2);

        try {
            // Signal
            await axios.post(`${serverUrl}/signal`, { type, machine_id: machineId });
            // Status/Current
            await axios.post(`${serverUrl}/machine-status`, { current, machine_id: machineId });

            console.log(`Sent: Machine ${machineId} - ${type.toUpperCase()} @ ${current}A`);
        } catch (err) {
            console.error(`Failed to send data for Machine ${machineId}`);
        }

        // Wait 500ms between signals
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("Simulation Finished!");
}

simulate();
