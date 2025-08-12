require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Conectado ao Neon DB");

    // Teste: pegar data/hora do servidor
    const res = await client.query('SELECT NOW()');
    console.log("🕒 Hora no banco:", res.rows[0]);

  } catch (err) {
    console.error("❌ Erro de conexão:", err);
  } finally {
    await client.end();
  }
}

main();

