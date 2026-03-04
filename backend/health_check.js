const pool = require('./database');
const bcrypt = require('bcrypt');

async function verify() {
    console.log("--- HEALTH CHECK ---");
    try {
        const [users] = await pool.query('SELECT username, password FROM users');
        console.log(`Found ${users.length} users in database.`);
        for (const user of users) {
            const isMatch = await bcrypt.compare('pass123', user.password);
            console.log(`User: ${user.username}, Password 'pass123' match: ${isMatch}`);
        }
        process.exit(0);
    } catch (e) {
        console.error("Health Check Failure:", e);
        process.exit(1);
    }
}
verify();
