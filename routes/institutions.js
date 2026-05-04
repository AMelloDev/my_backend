const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM institutions');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar instituições');
  }
});


router.post('/', async (req, res) => {
  try {
    const {
      institution_name,
      institution_country_code,
      institution_state,
      institution_city,
      postal_code,
      latitude,
      longitude,
      phone,
      email,
      website,
      description
    } = req.body;

    if (!institution_name || !institution_country_code || !institution_city || !phone || !email) {
      return res.status(400).send('Campos obrigatórios: Nome Instituição, Código do país(2)', 'Cidade', 'Telefone', 'email');
    }

    const result = await pool.query(
      'INSERT INTO institutions (institution_name, institution_country_code, institution_state, institution_city, postal_code, latitude, longitude, phone, email, website, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [
        institution_name,
        institution_country_code,
        institution_state,
        institution_city,
        postal_code,
        latitude,
        longitude,
        phone,
        email,
        website,
        description
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao criar instituição');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM institutions WHERE id_institution = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Instituição não encontrada');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar instituição');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      institution_name,
      institution_country_code,
      institution_state,
      institution_city,
      postal_code,
      latitude,
      longitude,
      phone,
      email,
      website,
      description
    } = req.body;

    const result = await pool.query(
      `UPDATE institutions SET 
        institution_name=$1, institution_country_code=$2, institution_state=$3, institution_city=$4,
        postal_code=$5, latitude=$6, longitude=$7, phone=$8, email=$9, website=$10, description=$11,
        updated_at = now()
      WHERE id_institution=$12 RETURNING *`,
      [
        institution_name,
        institution_country_code,
        institution_state,
        institution_city,
        postal_code,
        latitude,
        longitude,
        phone,
        email,
        website,
        description,
        req.params.id
      ]
    );

    if (result.rows.length === 0) return res.status(404).send('Instituição não encontrada');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar instituição');
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
      return res.status(404).json({ error: "Instituição não encontrada" });
    }

    const institutionName = instResult.rows[0].institution_name;

    await client.query(
      `UPDATE users
       SET status = false, updated_at = NOW()
       WHERE LOWER(TRIM(institution)) = LOWER(TRIM($1))`,
      [institutionName]
    );

    await client.query('COMMIT');

    return res.json({
      message: "Instituição e usuários vinculados desativados com sucesso."
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erro ao desativar instituição:", err);
    return res.status(500).json({ error: "Erro ao desativar instituição." });
  } finally {
    client.release();
  }
});

module.exports = router;