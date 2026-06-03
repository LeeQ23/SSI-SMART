const mysql = require('mysql2/promise');

const passwords = ['', 'root', 'admin', 'password', '123456', 'mysql'];
const ports = [3306, 3307, 3308];

async function tryConnect(port, password) {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: password,
            port: port,
            connectTimeout: 5000
        });
        console.log(`[SUCCESS] Connected! Port: ${port}, Password: '${password}'`);
        await connection.end();
        return true;
    } catch (err) {
        // console.log(`Failed: Port ${port}, Password '${password}' - ${err.message}`);
        return false;
    }
}

async function run() {
    console.log("Searching for working database credentials...");
    for (const port of ports) {
        for (const password of passwords) {
            console.log(`Trying Port: ${port}, Password: '${password}'...`);
            const success = await tryConnect(port, password);
            if (success) {
                console.log("\nFOUND IT!");
                console.log(`PORT: ${port}`);
                console.log(`PASSWORD: '${password}'`);
                process.exit(0);
            }
        }
    }
    console.log("\n[FAILURE] Could not connect with common credentials.");
    process.exit(1);
}

run();
