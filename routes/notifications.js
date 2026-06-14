const express = require('express');
const router = express.Router();
const pool = require('../db');


router.get('/user/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.params.userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error('Erro ao buscar notificações:', err);

    res.status(500).json({
      error: 'Erro ao buscar notificações'
    });
  }
});

router.get('/user/:userId/unread-count', async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = $1
        AND is_read = false
      `,
      [req.params.userId]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error('Erro ao buscar quantidade:', err);

    res.status(500).json({
      error: 'Erro ao buscar quantidade de notificações'
    });
  }
});

router.post('/', async (req, res) => {
  try {

    const {
      user_id,
      title,
      message,
      type,
      reference_id,
      reference_type
    } = req.body;

    if (!user_id || !title || !message || !type) {
      return res.status(400).json({
        error:
          'Campos obrigatórios: user_id, title, message, type'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO notifications
      (
        user_id,
        title,
        message,
        type,
        reference_id,
        reference_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        user_id,
        title,
        message,
        type,
        reference_id || null,
        reference_type || null
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {

    console.error('Erro ao criar notificação:', err);

    res.status(500).json({
      error: 'Erro ao criar notificação'
    });
  }
});

router.put('/:id/read', async (req, res) => {
  try {

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id_notification = $1
      RETURNING *
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notificação não encontrada'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error('Erro ao marcar como lida:', err);

    res.status(500).json({
      error: 'Erro ao marcar notificação como lida'
    });
  }
});

router.put('/user/:userId/read-all', async (req, res) => {
  try {

    await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
      `,
      [req.params.userId]
    );

    res.json({
      message: 'Todas notificações marcadas como lidas'
    });

  } catch (err) {

    console.error('Erro ao marcar todas como lidas:', err);

    res.status(500).json({
      error: 'Erro ao marcar notificações'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {

    const result = await pool.query(
      `
      DELETE FROM notifications
      WHERE id_notification = $1
      RETURNING *
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notificação não encontrada'
      });
    }

    res.json({
      message: 'Notificação removida com sucesso'
    });

  } catch (err) {

    console.error('Erro ao remover notificação:', err);

    res.status(500).json({
      error: 'Erro ao remover notificação'
    });
  }
});

module.exports = router;