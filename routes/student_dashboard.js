const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id_users,
        u.user_name,
        u.institution AS institution_origin,
        u.inst_dest,
        u.edital_id,
        u.projects AS project_id,

        p.project_title AS project_name,
        p.start_date,
        p.end_date,

        i.institution_name AS institution_dest_name,
        i.institution_country_code AS institution_dest_country,

        e.edital_name AS edital_title,
        e.link_one AS edital_file

      FROM users u
      LEFT JOIN projects p 
        ON p.id_project = u.projects
      LEFT JOIN institutions i 
        ON i.id_institution = u.inst_dest
      LEFT JOIN edital e 
        ON e.edital_id = u.edital_id
      WHERE u.id_users = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aluno não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar dashboard do aluno:', err);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: err.message,
    });
  }
});

module.exports = router;