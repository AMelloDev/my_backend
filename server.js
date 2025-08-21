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
      "INSERT INTO users (user_name, hashed_password, email) VALUES ($1, $2, $3)",
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
      "SELECT * FROM users WHERE user_name = $1",
      [name]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(400).send('Usuário não encontrado');
    }

    const senhaCorreta = await bcrypt.compare(password, user.hashed_password);

    if (!senhaCorreta) {
      return res.status(401).send('Senha incorreta');
    }

    res.json({
    message: "Seja bem-vindo(a)!",
    user: { id: user.id, name: user.user_name, email: user.email}
    })

  } catch (err) {
    if(err.code == '23505'){
      return res.status(400).send("Email já cadastrado");
    }
    console.error(err);
    res.status(500).send("Erro ao logar");
  } 
  
});

app.listen(3000)