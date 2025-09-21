require('dotenv').config();
const { Client } = require('pg');

// Cria a conexão
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


client.connect()
  .then(() => console.log("Conectado ao banco de dados"))
  .catch(err => console.error("Erro de conexão:", err.stack));

module.exports = client;