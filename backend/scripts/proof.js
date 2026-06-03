const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

try {
    const results = {
        hostname: os.hostname(),
        platform: os.platform(),
        user: os.userInfo().username,
        time: new Date().toLocaleString(),
        directoryContents: fs.readdirSync('.').slice(0, 10),
        nodeVersion: process.version
    };

    fs.writeFileSync('command_proof.json', JSON.stringify(results, null, 2));
    console.log('Proof written to command_proof.json');
} catch (e) {
    fs.writeFileSync('command_proof.json', JSON.stringify({ error: e.message }));
}
