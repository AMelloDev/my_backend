const express = require('express');
const router = express.Router();
const pool = require('../db'); 


router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM type_users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar tipos de usuário');
  }
});

module.exports = router;