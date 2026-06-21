const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();

const emailUser = (process.env.EMAIL_USER || '').trim();
const emailPass = (process.env.EMAIL_PASS || '').replace(/\s/g, '');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

router.post('/', async (req, res) => {
  try {
    const { name, password } = req.body;

    const result = await pool.query(
      'SELECT id_users, hashed_password, user_type, institution, inst_dest, "quantidade_de_logins" FROM users WHERE user_name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ auth: false, message: 'Preencha os campos corretamente' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.hashed_password);

    if (!match) {
      return res.status(401).json({ auth: false, message: 'Usuário ou senha incorretos' });
    }

    await pool.query(
      'UPDATE users SET "quantidade_de_logins" = "quantidade_de_logins" + 1 WHERE id_users = $1',
      [user.id_users]
    );

    const firstLogin = user.quantidade_de_logins === 0;

    return res.json({
      auth: true,
      firstLogin,
      message: firstLogin
        ? 'Primeiro login! Por favor, altere sua senha.'
        : 'Seja bem-vindo!',
      user: {
        id: user.id_users,
        name,
        type: user.user_type,
        institution: user.institution,
      },
    });

  } catch (err) {
    console.error('Erro ao tentar recuperar usuário:', err.message);
    res.status(500).json({ auth: false, message: 'Erro interno no servidor' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      'SELECT id_users, user_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email não encontrado'
      });
    }

    const user = result.rows[0];

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE id_users = $3',
      [code, expires, user.id_users]
    );

    await transporter.sendMail({
      from: `"Projeto Exchange" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Recuperação de senha 🔐',
      text: `Olá ${user.user_name},

Seu código para redefinir a senha é: ${code}

Esse código expira em 15 minutos.`,
    });

    return res.json({
      success: true,
      message: 'Código enviado para o email'
    });

  } catch (err) {
    console.error('Erro forgot-password:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const result = await pool.query(
      'SELECT id_users, reset_code, reset_code_expires FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = result.rows[0];
    const codigoLimpo = String(code).trim();

    if (!user.reset_code || String(user.reset_code).trim() !== codigoLimpo) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido'
      });
    }

    if (!user.reset_code_expires || new Date(user.reset_code_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Código expirado'
      });
    }

    const novaHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET hashed_password = $1,
           reset_code = NULL,
           reset_code_expires = NULL
       WHERE id_users = $2`,
      [novaHash, user.id_users]
    );

    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });

  } catch (err) {
    console.error('Erro reset-password:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno'
    });
  }
});

module.exports = router;
