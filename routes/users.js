const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const pool = require('../db');  
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// Buscar todos os usuários
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários');
  }
});

// Criar usuário
router.post('/', async (req, res) => {
  try {
    const { name, password, email, Institution, user_type, Status } = req.body;

    if (!name || !password || !email || !Institution || !user_type) {
      return res.status(400).send('Campos obrigatórios: name, password, email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (user_name, email, hashed_password, Institution, user_type, Status, quantidade_de_logins) VALUES ($1, $2, $3, $4, $5, $6, 0) RETURNING *',
      [
        name, 
        email, 
        hashedPassword,
        Institution,
        user_type,
        Status
      ]
    );

    await transporter.sendMail({
      from: `"Equipe do Projeto" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Conta criada com sucesso! 🎉',
      text: `Olá ${name}, sua conta foi criada com sucesso!

Aqui estão seus dados de acesso:
- Usuário: ${email}
- Senha temporária: ${password}

Por favor, mantenha esta senha em segurança.`,
    });

    return res.status(201).json({
      message: 'Usuário criado e e-mail enviado com sucesso!',
      user: result.rows[0],
    });

  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "email_exists",
        message: "Este e-mail já está cadastrado."
      });
    }

    return res.status(500).send('Erro ao criar usuário ou enviar e-mail');
  }
});

//Alterar a senha
router.put('/senha/:id', async (req, res) => {
  try {
    const { password, novaSenha } = req.body;
    const id = parseInt(req.params.id, 10);

    if (!password) return res.status(400).json({ message: "Insira a senha atual" });
    if (!novaSenha) return res.status(400).json({ message: "Insira a nova senha" });

    const user = await pool.query(
      'SELECT hashed_password FROM users WHERE id_users = $1',
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const match = await bcrypt.compare(password, user.rows[0].hashed_password);

    if (!match) {
      return res.status(401).json({ message: "Senha atual incorreta" });
    }

    const novaHash = await bcrypt.hash(novaSenha, 10);

    await pool.query(
      'UPDATE users SET hashed_password = $1, updated_at = NOW() WHERE id_users = $2',
      [novaHash, id]
    );

    return res.status(200).json({
      success: true,
      message: "Senha atualizada com sucesso!"
    });

  } catch (err) {
    console.error("Erro ao atualizar senha:", err);
    res.status(500).json({ message: "Erro interno ao atualizar a senha" });
  }
});

// buscar usuário por id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id_users = $1',
      [
        req.params.id
      ]);
    if (result.rows.length === 0) return res.status(404).send('Preencha os campos corretamente');
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
      user_name,
      email,
      Institution,
      user_type,
      Status
    } = req.body;
    const id = parseInt(req.params.id, 10);
    const result = await pool.query(
      `UPDATE users 
      SET 
        user_name = $1,
        email = $2,
        Institution = $3,
        user_type = $4,
        Status = $5,
        updated_at = NOW()
      WHERE id_users = $6
      RETURNING *`,
      [
        user_name,
        email,
        Institution,
        user_type,
        Status,
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

//Deletar user
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
    return res.status(400).send('ID inválido');
  }


    const result = await pool.query(
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