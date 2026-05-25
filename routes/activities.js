const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        criador.user_name AS criado_por_nome,
        destino.user_name AS enviar_para_nome,
        i.institution_name,
        p.project_title,
        e.edital_name
      FROM atividade a
      LEFT JOIN users criador ON criador.id_users = a.criado_por
      LEFT JOIN users destino ON destino.id_users = a.enviar_para
      LEFT JOIN institutions i ON i.id_institution = a.id_instituicao
      LEFT JOIN projects p ON p.id_project = a.id_projeto
      LEFT JOIN edital e ON e.edital_id = a.id_edital
      ORDER BY a.prazo ASC NULLS LAST, a.criado_em DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar atividades:', err);
    res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        a.*,
        criador.user_name AS criado_por_nome,
        destino.user_name AS enviar_para_nome,
        i.institution_name,
        p.project_title,
        e.edital_name
      FROM atividade a
      LEFT JOIN users criador ON criador.id_users = a.criado_por
      LEFT JOIN users destino ON destino.id_users = a.enviar_para
      LEFT JOIN institutions i ON i.id_institution = a.id_instituicao
      LEFT JOIN projects p ON p.id_project = a.id_projeto
      LEFT JOIN edital e ON e.edital_id = a.id_edital
      WHERE a.enviar_para = $1
      ORDER BY a.prazo ASC NULLS LAST, a.criado_em DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar atividades do usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar atividades do usuário' });
  }
});
router.get('/created/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        a.*,
        criador.user_name AS criado_por_nome,
        destino.user_name AS enviar_para_nome,
        i.institution_name,
        p.project_title,
        e.edital_name
      FROM atividade a
      LEFT JOIN users criador ON criador.id_users = a.criado_por
      LEFT JOIN users destino ON destino.id_users = a.enviar_para
      LEFT JOIN institutions i ON i.id_institution = a.id_instituicao
      LEFT JOIN projects p ON p.id_project = a.id_projeto
      LEFT JOIN edital e ON e.edital_id = a.id_edital
      WHERE a.criado_por = $1
      ORDER BY a.criado_em DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar atividades criadas:', err);
    res.status(500).json({ error: 'Erro ao buscar atividades criadas' });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        a.*,
        criador.user_name AS criado_por_nome,
        destino.user_name AS enviar_para_nome,
        i.institution_name,
        p.project_title,
        e.edital_name
      FROM atividade a
      LEFT JOIN users criador ON criador.id_users = a.criado_por
      LEFT JOIN users destino ON destino.id_users = a.enviar_para
      LEFT JOIN institutions i ON i.id_institution = a.id_instituicao
      LEFT JOIN projects p ON p.id_project = a.id_projeto
      LEFT JOIN edital e ON e.edital_id = a.id_edital
      WHERE a.id_activity = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar atividade:', err);
    res.status(500).json({ error: 'Erro ao buscar atividade' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      iniciar_em,
      prazo,
      status,
      prioridade,
      criado_por,
      id_instituicao,
      id_projeto,
      id_edital,
      enviar_para,
      obrigatoria,
      tipo
    } = req.body;

    if (!titulo || !criado_por || !enviar_para || !tipo) {
      return res.status(400).json({
        error: 'Campos obrigatórios faltando: titulo, criado_por, enviar_para, tipo'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO atividade
      (
        titulo,
        descricao,
        iniciar_em,
        prazo,
        status,
        prioridade,
        criado_por,
        id_instituicao,
        id_projeto,
        id_edital,
        enviar_para,
        "obrigatória",
        tipo,
        criado_em,
        atualizado_em
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
      RETURNING *
      `,
      [
        titulo,
        descricao || null,
        iniciar_em || null,
        prazo || null,
        status || 'pendente',
        prioridade || 'media',
        criado_por,
        id_instituicao || null,
        id_projeto || null,
        id_edital || null,
        enviar_para,
        obrigatoria ?? true,
        tipo
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar atividade:', err);
    res.status(500).json({ error: 'Erro ao criar atividade', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      titulo,
      descricao,
      iniciar_em,
      prazo,
      status,
      prioridade,
      id_instituicao,
      id_projeto,
      id_edital,
      enviar_para,
      obrigatoria,
      tipo
    } = req.body;

    const result = await pool.query(
      `
      UPDATE atividade SET
        titulo = $1,
        descricao = $2,
        iniciar_em = $3,
        prazo = $4,
        status = $5,
        prioridade = $6,
        id_instituicao = $7,
        id_projeto = $8,
        id_edital = $9,
        enviar_para = $10,
        "obrigatória" = $11,
        tipo = $12,
        atualizado_em = NOW()
      WHERE id_activity = $13
      RETURNING *
      `,
      [
        titulo,
        descricao || null,
        iniciar_em || null,
        prazo || null,
        status || 'pendente',
        prioridade || 'media',
        id_instituicao || null,
        id_projeto || null,
        id_edital || null,
        enviar_para,
        obrigatoria ?? true,
        tipo,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar atividade:', err);
    res.status(500).json({ error: 'Erro ao atualizar atividade', details: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const result = await pool.query(
      `
      UPDATE atividade
      SET status = $1, atualizado_em = NOW()
      WHERE id_activity = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM atividade WHERE id_activity = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    res.json({ message: 'Atividade removida com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar atividade:', err);
    res.status(500).json({ error: 'Erro ao deletar atividade' });
  }
});

module.exports = router;