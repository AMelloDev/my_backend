const express = require('express');
const router = express.Router();
const client = require('../index'); 
const bcrypt = require('bcrypt');

router.post('/', async (req, res) => {
  try {
    const { name, password } = req.body;

    // Busca o usuário
    const result = await client.query(
      'SELECT id_users, hashed_password, "quantidade_de_logins" FROM users WHERE user_name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(401).send('Usuário não encontrado');
    }

    const user = result.rows[0];

    // Verifica senha
    const match = await bcrypt.compare(password, user.hashed_password);

    if (!match) {
      return res.status(401).send('Usuário ou senha incorretos');
    }

    // Se for o primeiro login
    if (user.quantidade_de_logins === 0) {
      return res.status(200).json({
        message: 'Primeiro login! Por favor, altere sua senha.',
        firstLogin: true,
        userId: user.id_users,
      });
    }

    // Atualiza o número de logins
    await client.query(
      'UPDATE users SET "quantidade_de_logins" = "quantidade_de_logins" + 1 WHERE id_users = $1',
      [user.id_users]
    );

    res.json({ message: 'Seja bem-vindo!' });

  } catch (err) {
    console.error('Erro ao tentar recuperar usuário:', err.message);
    res.status(500).send('Erro interno no servidor');
  }
});

module.exports = router;
