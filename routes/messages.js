const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post('/send', async (req, res) => {
  try {
    const { sender_id, receiver_id, message_title, message_text, message_tp, deadline} = req.body;

    if (!sender_id || !receiver_id || !message_title || !message_text || !message_tp) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando: sender_id, receiver_id, message_title, message_text, message_tp' });
    }

    if (isNaN(sender_id) || isNaN(receiver_id)) {
      return res.status(400).json({ error: 'sender_id e receiver_id devem ser números válidos' });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message_title, message_text, message_tp, deadline)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [sender_id, receiver_id, message_title, message_text, message_tp, deadline]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

router.get('/conversation/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const result = await pool.query(
      `SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.message_title,
          m.message_text,
          m.file_id,
          m.is_read,
          m.created_at,
          m.deadline,
          m.message_tp,
          f.file_name,
          f.file_path,
          su.user_name AS sender_name,
          ru.user_name AS receiver_name
       FROM messages m
       LEFT JOIN files f ON m.file_id = f.id
       LEFT JOIN users su ON m.sender_id = su.id_users
       LEFT JOIN users ru ON m.receiver_id = ru.id_users
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [user1, user2]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

router.get('/inbox/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 Buscando inbox do usuário:', userId);

    const result = await pool.query(
      `SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.message_title,
          m.message_text,
          m.file_id,
          m.is_read,
          m.created_at,
          m.deadline,
          m.message_tp,
          f.file_name,
          u.user_name AS sender_name
       FROM messages m
       LEFT JOIN files f ON m.file_id = f.id
       LEFT JOIN users u ON m.sender_id = u.id_users
       WHERE m.receiver_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    console.log('📊 Mensagens encontradas:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar inbox:', error);
    res.status(500).json({ error: 'Erro ao buscar inbox', details: error.message });
  }
});

router.post('/send-with-file', upload.single('file'), async (req, res) => {
  try {
    const { sender_id, receiver_id, message_title, message_text, message_tp, deadline } = req.body;

    if (!sender_id || !receiver_id || !message_title || !message_text || !message_tp) {
      return res.status(400).json({
        error: 'Campos obrigatórios faltando: sender_id, receiver_id, message_title, message_text, message_tp'
      });
    }

    if (isNaN(sender_id) || isNaN(receiver_id)) {
      return res.status(400).json({
        error: 'sender_id e receiver_id devem ser números válidos'
      });
    }

    let fileId = null;

    if (req.file) {
      const fileResult = await pool.query(
        `INSERT INTO files (file_name, file_path, uploaded_by)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [req.file.originalname, req.file.path, sender_id]
      );

      fileId = fileResult.rows[0].id;
    }

    const messageResult = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message_title, message_text, message_tp, deadline, file_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [sender_id, receiver_id, message_title, message_text, message_tp, deadline, fileId]
    );

    res.json(messageResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao enviar mensagem com arquivo' });
  }
});

router.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await pool.query(
      `SELECT * FROM files WHERE id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const file = result.rows[0];

    res.download(file.file_path, file.file_name);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao baixar arquivo' });
  }
});

module.exports = router;