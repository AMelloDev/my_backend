require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("❌ Unexpected PG Error", err);
});

module.exports = pool;