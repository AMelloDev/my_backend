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


router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edital');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar editais');
  }
});


router.post('/', upload.single('file'), async (req, res) => {
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

    const filePath = req.file ? req.file.path : null;

    const result = await pool.query(
      `INSERT INTO edital 
       (edital_name, edital_year, link_one, link_two, link_three, status) 
       VALUES ($1,$2,$3,$4,$5,$6) 
       RETURNING *`,
      [
        edital_name,
        edital_year,
        link_one,
        link_two,
        filePath,
        status
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao criar edital');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edital WHERE edital_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Edital não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar edital');
  }
});

router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const {
      edital_name,
      edital_year,
      link_one,
      link_two,
      status
    } = req.body;

    const id = parseInt(req.params.id, 10);

    const editalAtual = await pool.query(
      'SELECT link_three FROM edital WHERE edital_id = $1',
      [id]
    );

    if (editalAtual.rows.length === 0) {
      return res.status(404).send('Edital não encontrado');
    }

    const filePath = req.file ? req.file.path : editalAtual.rows[0].link_three;

    const result = await pool.query(
      `UPDATE edital 
       SET edital_name = $1, 
           edital_year = $2, 
           link_one = $3, 
           link_two = $4, 
           link_three = $5,
           status = $6 
       WHERE edital_id = $7 
       RETURNING *`,
      [
        edital_name,
        edital_year,
        link_one,
        link_two,
        filePath,
        status,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar edital');
  }
});
router.get('/download/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT link_three FROM edital WHERE edital_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0 || !result.rows[0].link_three) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const fullPath = path.resolve(result.rows[0].link_three);
    res.sendFile(fullPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao baixar arquivo do edital' });
  }
});

router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const id = parseInt(req.params.id, 10);

    const instResult = await client.query(
      `UPDATE institutions
       SET status = false, updated_at = NOW()
       WHERE id_institution = $1
       RETURNING institution_name`,
      [id]
    );

    if (instResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).send('Instituição não encontrada');
    }

    const institutionName = instResult.rows[0].institution_name;

    await client.query(
      `UPDATE users
       SET status = false, updated_at = NOW()
       WHERE LOWER(TRIM(institution)) = LOWER(TRIM($1))`,
      [institutionName]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Instituição e usuários vinculados desativados com sucesso',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao desativar instituição:', err);
    res.status(500).send('Erro ao desativar instituição');
  } finally {
    client.release();
  }
});

module.exports = router;
