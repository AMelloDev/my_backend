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

    const message = result.rows[0];

    await pool.query(
      `INSERT INTO notifications
      (user_id, title, message, type, reference_id, reference_type)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        receiver_id,
        'Nova mensagem recebida',
        message_title,
        'message',
        message.id,
        'messages'
      ]
    );

    res.json(message);


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
          m.is_read,
          m.created_at,
          m.deadline,
          m.message_tp,
          u.user_name AS sender_name,
          COALESCE(
  json_agg(
    json_build_object(
      'id', f.id,
      'file_name', f.file_name,
      'file_path', f.file_path
    )
  ) FILTER (WHERE f.id IS NOT NULL),
  '[]'::json
) AS files
       FROM messages m
       LEFT JOIN files f ON f.message_id = m.id
       LEFT JOIN users u ON m.sender_id = u.id_users
       WHERE m.receiver_id = $1
       GROUP BY
         m.id,
         m.sender_id,
         m.receiver_id,
         m.message_title,
         m.message_text,
         m.is_read,
         m.created_at,
         m.deadline,
         m.message_tp,
         u.user_name
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

router.post('/send-with-file', upload.array('files', 5), async (req, res) => {
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

    const messageResult = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message_title, message_text, message_tp, deadline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [sender_id, receiver_id, message_title, message_text, message_tp, deadline]
    );

    await pool.query(
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
      `,
      [
        receiver_id,
        'Nova mensagem recebida',
        message_title,
        'message',
        message.id,
        'messages'
      ]
    );

    const message = messageResult.rows[0];
    const arquivosSalvos = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileResult = await pool.query(
          `INSERT INTO files (file_name, file_path, uploaded_by, message_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id, file_name, file_path`,
          [file.originalname, file.path, sender_id, message.id]
        );

        arquivosSalvos.push(fileResult.rows[0]);
      }
    }

    res.json({
      ...message,
      files: arquivosSalvos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao enviar mensagem com arquivos' });
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

    const fullPath = path.resolve(file.file_path);

    res.sendFile(fullPath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao baixar arquivo' });
  }
});

router.get('/sent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.message_title,
          m.message_text,
          m.is_read,
          m.created_at,
          m.deadline,
          m.message_tp,
          u.user_name AS receiver_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', f.id,
                'file_name', f.file_name,
                'file_path', f.file_path
              )
            ) FILTER (WHERE f.id IS NOT NULL),
            '[]'::json
          ) AS files
       FROM messages m
       LEFT JOIN files f ON f.message_id = m.id
       LEFT JOIN users u ON m.receiver_id = u.id_users
       WHERE m.sender_id = $1
       GROUP BY
         m.id,
         m.sender_id,
         m.receiver_id,
         m.message_title,
         m.message_text,
         m.is_read,
         m.created_at,
         m.deadline,
         m.message_tp,
         u.user_name
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar mensagens enviadas:', error);
    res.status(500).json({
      error: 'Erro ao buscar mensagens enviadas',
      details: error.message,
    });
  }
});

module.exports = router;