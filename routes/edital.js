const express = require('express');
const router = express.Router();
const pool = require('../db');


router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edital');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar editais');
  }
});


router.post('/', async (req, res) => {
  try {
    const {
      edital_name,
      edital_year,
      link_one,
      link_two,
      status
    } = req.body;

    if (!edital_name || !edital_year || !status) {
      return res.status(400).send('Campos obrigatórios: Nome do edital, Ano do edital, Status do edital');
    }

    const result = await pool.query(
      'INSERT INTO edital (edital_name, edital_year, link_one, link_two, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [
      edital_name,
      edital_year,
      link_one,
      link_two,
      status
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao criar edital');
  }
});

router.get('/country/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edital WHERE edital_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Edital não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar edital');
  }
});

router.put('/:id', async (req, res) => {
  try {
    
    const {
      edital_name,
      edital_year,
      link_one,
      link_two,
      status
    } = req.body;
    const id = parseInt(req.params.id, 10);
    const result = await pool.query(
      `UPDATE edital SET edital_name = $1, edital_year = $2, link_one = $3, link_two = $4, status = $5 WHERE edital_id = $6 RETURNING *`,
      [
        edital_name,
        edital_year,
        link_one,
        link_two,
        status,
        id
      ]
    );

    if (result.rows.length === 0) return res.status(404).send('Edital não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar edital');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM edital WHERE edital_id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Edital não encontrado');
    res.json({ message: 'Edital removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao deletar edital');
  }
});

module.exports = router;
