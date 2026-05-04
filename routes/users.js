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

router.post('/', async (req, res) => {
  try {
    console.log("BODY RECEBIDO NO POST /users:", req.body);

    let {
      name,
      password,
      email,
      institution,
      Institution,
      inst_dest,
      user_type,
      status = true,
      projects,
      edital_id,
      phone
    } = req.body;

    institution = institution || Institution;

    if (!name || !password || !email || !institution || !user_type || !inst_dest) {
      return res.status(400).send('Campos obrigatórios: name, password, email, institution, user_type, inst_dest');
    }

    if (user_type === 'alun' && (!projects || !edital_id)) {
      return res.status(400).send('Aluno precisa ter projeto e edital');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users 
      (
        user_name,
        email,
        hashed_password,
        institution,
        inst_dest,
        user_type,
        status,
        projects,
        edital_id,
        quantidade_de_logins,
        phone
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name,
        email,
        hashedPassword,
        institution,
        inst_dest,
        user_type,
        status,
        projects ?? null,
        edital_id ?? null,
        0,
        phone ?? null
      ]
    );

    console.log("USUÁRIO INSERIDO:", result.rows[0]);

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
    console.error("ERRO NO POST /users:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "email_exists",
        message: "Este e-mail já está cadastrado."
      });
    }

    return res.status(500).json({
      message: 'Erro ao criar usuário ou enviar e-mail',
      details: err.message
    });
  }
});

router.get('/institution/:institution', async (req, res) => {
  try {
    const institution = decodeURIComponent(req.params.institution);

    console.log('🔍 Buscando usuários da instituição:', institution);

    const result = await pool.query(
      `SELECT id_users, user_name, email, institution, user_type, status
      FROM users
      WHERE LOWER(TRIM(institution)) = LOWER(TRIM($1))
      ORDER BY user_name ASC`,
      [institution]
    );

    console.log('📊 Resultado da busca:', result.rows.length, 'usuários encontrados');

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar usuários da instituição:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários da instituição' });
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

router.get('/aluno/:instituicao', async (req, res) => {
  try {
    const instituicao = decodeURIComponent(req.params.instituicao);

    console.log('🔍 Buscando alunos da instituição:', instituicao);

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(TRIM(institution)) = LOWER(TRIM($1))',
      [instituicao]
    );

    if (result.rows.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado para:', instituicao);
      return res.status(404).json({ message: 'Nenhum usuário encontrado' });
    }

    console.log('📊 Encontrados:', result.rows.length, 'usuários');
    res.json(result.rows);

  } catch (err) {
    console.error('❌ Erro ao buscar usuários:', err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
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
      institution,
      inst_dest,
      user_type,
      Status,
      projects,
      phone
    } = req.body;

    const id = parseInt(req.params.id, 10);

    const result = await pool.query(
      `UPDATE users 
       SET 
         user_name = $1,
         email = $2,
         institution = $3,
         inst_dest = $4,
         user_type = $4,
         Status = $5,
         projects = $6,
         phone = $7,
         updated_at = NOW()
       WHERE id_users = $8
       RETURNING *`,
      [
        user_name,
        email,
        institution,
        inst_dest,
        user_type,
        Status,
        projects,
        phone,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

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

    const result = await pool.query(
      `UPDATE users 
       SET status = false, updated_at = NOW()
       WHERE id_users = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.json({
      message: 'Usuário desativado com sucesso',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Erro ao desativar usuário:', err.message);
    res.status(500).send('Erro interno no servidor');
  }
});

module.exports = router;