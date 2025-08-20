const express = require('express')
const bcrypt= require('bcrypt')
const client= require('./index')

// criando usuários para testar
const app = express()
app.use(express.json())

//fazendo o request de users
app.get('/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários');
  }
});

//Criar user
app.post('/users', async (req, res) => {
  try {
    const { name, password, email } = req.body;

    if (!name || !password || !email) {
      return res.status(400).send('Todos os campos são obrigatórios');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query(
      "INSERT INTO users (name, password, email) VALUES ($1, $2, $3)",
      [name, hashedPassword, email]
    );

    res.status(201).send("Usuário criado com sucesso");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao criar usuário");
  }
});

app.post('/users/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).send('Nome e senha são obrigatórios');
    }

    const result = await client.query(
      "SELECT * FROM users WHERE name = $1",
      [name]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(400).send('Usuário não encontrado');
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);

    if (!senhaCorreta) {
      return res.status(401).send('Senha incorreta');
    }

    res.send('Seja bem-vindo(a)!');
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao logar");
  }
});

app.listen(3000)