
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const alunos = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE u.user_type = 'alun') AS total_alunos,
        COUNT(*) FILTER (
          WHERE u.user_type = 'alun' AND CURRENT_DATE < p.start_date
        ) AS aguardando,
        COUNT(*) FILTER (
          WHERE u.user_type = 'alun' 
          AND CURRENT_DATE BETWEEN p.start_date AND p.end_date
        ) AS em_intercambio,
        COUNT(*) FILTER (
          WHERE u.user_type = 'alun' AND CURRENT_DATE > p.end_date
        ) AS finalizados
      FROM users u
      LEFT JOIN projects p ON p.id_project = u.projects
    `);

    const instituicoes = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = true) AS ativas,
        COUNT(*) FILTER (WHERE status = false) AS inativas
      FROM institutions
    `);

    const instituicoesPorPais = await pool.query(`
      SELECT institution_country_code AS pais, COUNT(*) AS total
      FROM institutions
      GROUP BY institution_country_code
      ORDER BY total DESC
    `);

    const editais = await pool.query(`
      SELECT status, COUNT(*) AS total
      FROM edital
      GROUP BY status
    `);

    const projetos = await pool.query(`
      SELECT COUNT(*) AS total FROM projects
    `);

    const alunosPorDestino = await pool.query(`
  SELECT 
    COALESCE(i.institution_name, 'Sem destino') AS destino,
    COUNT(u.id_users) AS total
  FROM users u
  LEFT JOIN institutions i 
    ON i.id_institution = u.inst_dest
  WHERE u.user_type = 'alun'
  GROUP BY i.institution_name
  ORDER BY total DESC
`);

const alunosPorPaisDestino = await pool.query(`
  SELECT 
    COALESCE(i.institution_country_code, 'N/A') AS pais,
    COUNT(u.id_users) AS total
  FROM users u
  LEFT JOIN institutions i 
    ON i.id_institution = u.inst_dest
  WHERE u.user_type = 'alun'
  GROUP BY i.institution_country_code
  ORDER BY total DESC
`);

    res.json({
      alunos: alunos.rows[0],
      instituicoes: instituicoes.rows[0],
      instituicoes_por_pais: instituicoesPorPais.rows,
      editais_por_status: editais.rows,
      alunos_por_destino: alunosPorDestino.rows,
      alunos_por_pais_destino: alunosPorPaisDestino.rows,
      projetos: projetos.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});


module.exports = router;