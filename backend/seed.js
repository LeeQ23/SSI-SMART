const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
};

async function seed() {
    const connection = await mysql.createConnection(dbConfig);

    console.log('Creating Database...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ssi_smart_mfg`);
    await connection.query(`USE ssi_smart_mfg`);

    console.log('Creating Tables...');
    const fs = require('fs');
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    await connection.query(schema);

    console.log('Seeding Users...');
    const hashedPassword = await bcrypt.hash('pass123', 10);
    await connection.query('INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'manager']);
    await connection.query('INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['op1', hashedPassword, 'operator']);

    console.log('Database Setup Complete.');
    process.exit();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
