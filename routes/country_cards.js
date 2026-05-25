const express = require('express');
const router = express.Router();
const pool = require('../db');

async function canManageCards(userId) {
  const result = await pool.query(
    'SELECT user_type FROM users WHERE id_users = $1',
    [userId]
  );

  if (result.rows.length === 0) return false;

  return ['prof', 'mng0'].includes(result.rows[0].user_type);
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cc.*,
        u.user_name AS created_by_name,
        i.institution_name AS destination_institution_name
      FROM country_cards cc
      LEFT JOIN users u ON u.id_users = cc.created_by
      LEFT JOIN institutions i ON i.id_institution = cc.destination_institution_id
      ORDER BY cc.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar cards:', err);
    res.status(500).json({ error: 'Erro ao buscar cards' });
  }
});

router.get('/student/:userId', async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT 
        cc.*
      FROM users u

      LEFT JOIN institutions i
        ON i.id_institution = u.inst_dest

      LEFT JOIN country_cards cc
        ON cc.country_code = i.institution_country_code

      WHERE u.id_users = $1
        AND cc.status = true

      ORDER BY cc.created_at DESC
    `, [req.params.userId]);

    res.json(result.rows);

  } catch (err) {

    console.error('Erro ao buscar cards do aluno:', err);

    res.status(500).json({
      error: 'Erro ao buscar cards do aluno',
      details: err.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      country_code,
      destination_institution_id,
      created_by,
      status
    } = req.body;

    if (!title || !content || !country_code || !created_by) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, content, country_code, created_by'
      });
    }

    const allowed = await canManageCards(created_by);

    if (!allowed) {
      return res.status(403).json({
        error: 'Apenas professores e managers podem criar cards'
      });
    }

    const result = await pool.query(
      `INSERT INTO country_cards
       (title, content, country_code, destination_institution_id, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        content,
        country_code,
        destination_institution_id || null,
        created_by,
        status ?? true
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar card:', err);
    res.status(500).json({ error: 'Erro ao criar card' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      content,
      country_code,
      destination_institution_id,
      status,
      updated_by
    } = req.body;

    const allowed = await canManageCards(updated_by);

    if (!allowed) {
      return res.status(403).json({
        error: 'Apenas professores e managers podem editar cards'
      });
    }

    const result = await pool.query(
      `UPDATE country_cards SET
        title = $1,
        content = $2,
        country_code = $3,
        destination_institution_id = $4,
        status = $5,
        updated_at = NOW()
       WHERE id_country_card = $6
       RETURNING *`,
      [
        title,
        content,
        country_code,
        destination_institution_id || null,
        status,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar card:', err);
    res.status(500).json({ error: 'Erro ao atualizar card' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { updated_by } = req.body;

    const allowed = await canManageCards(updated_by);

    if (!allowed) {
      return res.status(403).json({
        error: 'Apenas professores e managers podem desativar cards'
      });
    }

    const result = await pool.query(
      `UPDATE country_cards
       SET status = false, updated_at = NOW()
       WHERE id_country_card = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card não encontrado' });
    }

    res.json({ message: 'Card desativado com sucesso' });
  } catch (err) {
    console.error('Erro ao desativar card:', err);
    res.status(500).json({ error: 'Erro ao desativar card' });
  }
});

module.exports = router;