const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar projetos');
  }
});


router.post('/', async (req, res) => {
  try {
    const {
      project_title,
      resumed_goal,
      start_date,
      end_date,
      common_language,
      study_scope,
      project_url,
      supervisor,
      project_institution
    } = req.body;

    if (!project_title || !start_date || !end_date || !supervisor || !project_institution) {
      return res.status(400).send('Campos obrigatórios: Título do projeto','Data de início', 'Data de encerramento', 'Supervisor do projeto', 'Instituição linkdada ao projeto');
    }

    const result = await pool.query(
      'INSERT INTO projects (project_title, resumed_goal, start_date, end_date, common_language, study_scope, project_url, supervisor, project_institution) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [
      project_title,
      resumed_goal,
      start_date,
      end_date,
      common_language,
      study_scope,
      project_url,
      supervisor,
      project_institution
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao criar projeto');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id_project = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Projeto não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar projeto');
  }
});

router.get('/:project_name', async (req, res) => {
  try {
    const searchTerm = `%${req.params.project_name}%`; 
    const result = await pool.query(
      'SELECT * FROM projects WHERE project_name ILIKE $1',
      [searchTerm]
    );

    if (result.rows.length === 0)
      return res.status(404).send('Nenhum projeto encontrado');

    res.json(result.rows); 
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar projetos');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      project_title,
      resumed_goal,
      start_date,
      end_date,
      common_language,
      study_scope,
      project_url,
      supervisor,
      project_institution
    } = req.body;

    const result = await pool.query(
      `UPDATE institutions SET 
        project_title, resumed_goal, start_date, end_date, common_language, study_scope, project_url, supervisor, project_institution VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) WHERE id_project=$10 RETURNING *`,
      [
        project_title,
        resumed_goal,
        start_date,
        end_date,
        common_language,
        study_scope,
        project_url,
        supervisor,
        project_institution
      ]
    );

    if (result.rows.length === 0) return res.status(404).send('Projeto não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar projeto');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id_project=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Projeto não encontrado');
    res.json({ message: 'Projeto removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao deletar projeto');
  }
});

module.exports = router;