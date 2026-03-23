const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const bcrypt = require('bcrypt');

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

module.exports = router;
