const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ssi_smart_mfg',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0
});

pool.on('error', (err) => {
  console.error('MySQL Pool Error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    console.error('Database connection was closed or lost. The pool will attempt to automatically reconnect.');
  }
});

module.exports = pool;
