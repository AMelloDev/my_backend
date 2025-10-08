const express = require('express');
const router = express.Router();
const client = require('../index'); // conexão com o banco
const bcrypt = require('bcrypt');

// Buscar todos os usuários
router.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários');
  }
});

// Criar usuário
router.post('/', async (req, res) => {
  try {
    const {name, password, email } = req.body;

    if (!name || !password || !email) {
      return res.status(400).send('Campos obrigatórios: name, password, email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO users (user_name, email, hashed_password) VALUES ($1, $2, $3) RETURNING *',
      [
        name, 
        email, 
        hashedPassword
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao criar usuário');
  }
});

// buscar usuário por id
router.get('/:id', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users WHERE id_users = $1',
      [
        req.params.id
      ]);
    if (result.rows.length === 0) return res.status(404).send('Usuário não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuário');
  }
});

//alterar usuário
router.put('/:id', async (req, res) => {
  try {
    
    const {
      name,
      email,
    } = req.body;
    const id = parseInt(req.params.id, 10);
    const result = await client.query(
      'UPDATE users SET user_name=$1, email=$2, updated_at = now() WHERE id_users=$3 RETURNING *',
      [
        name,
        email,
        id
      ]
    );

    if (result.rows.length === 0) return res.status(404).send('Usuário não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar usuário');
  }
});

//Alterar a senha
router.put('/senha/:id', async (req, res) =>{
  try{
    const { password, novaSenha}= req.body;
    const id = parseInt(req.params.id, 10);


    if (!password) return res.status(400).send("Insira a senha atual");
    if (!novaSenha) return res.status(400).send("Insira a Nova senha");

    const equal = await client.query('SELECT hashed_password FROM users WHERE id_users= $1', [id]);
    if (equal.rows.length === 0) {
      return res.status(401).send('É uma pena não encontramos o seu usuário');
    }

    const hashedPassword = equal.rows[0].hashed_password;
    const match = await bcrypt.compare(password, hashedPassword);
    
    if(!match){
       return res.json({ message: 'Senha atual incorreta' });
    }

    const novaSenha_hash = await bcrypt.hash(novaSenha, 10);
    const update = await client.query(
      'UPDATE users SET hashed_password =$1, updated_at = now() WHERE id_users=$2 RETURNING *',
      [
        novaSenha_hash,
        id
      ]
    );

    res.json('Que maravilha!Sua senha foi atualizada');
  } catch (err) {
      console.error('Erro ao atualizar senha:', err.message);
      res.status(500).send('Erro ao atualizar senha');
    }
});

//Deletar user
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
    return res.status(400).send('ID inválido');
  }


    const result = await client.query(
      'DELETE FROM users WHERE id_users = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.json({ mensagem: 'Usuário deletado com sucesso', usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err.message);
    res.status(500).send('Erro interno no servidor');
  }
});

module.exports = router;