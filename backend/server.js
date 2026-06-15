const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// O Coolify injeta a variável DATABASE_URL automaticamente se conectarmos os recursos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Inicializar tabelas básicas se não existirem
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      cpf VARCHAR(20) UNIQUE NOT NULL,
      whatsapp VARCHAR(20),
      convenio VARCHAR(50)
    );
    CREATE TABLE IF NOT EXISTS consultas (
      id SERIAL PRIMARY KEY,
      paciente_id INT REFERENCES pacientes(id),
      data_consulta DATE NOT NULL,
      valor DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'Concluído'
    );
  `);
}
initDB().catch(console.error);

// ROTA 1: Cadastrar Paciente
app.post('/api/pacientes', async (req, res) => {
  const { nome, cpf, whatsapp, convenio } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO pacientes (nome, cpf, whatsapp, convenio) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, cpf, whatsapp, convenio]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ROTA 2: Buscar Todos os Pacientes
app.get('/api/pacientes', async (req, res) => {
  const result = await pool.query('SELECT * FROM pacientes ORDER BY id DESC');
  res.json(result.rows);
});

// ROTA 3: Dados do Dashboard (Faturamento e Consultas)
app.get('/api/dashboard', async (req, res) => {
  const qtdPacientes = await pool.query('SELECT COUNT(*) FROM pacientes');
  const faturamento = await pool.query("SELECT SUM(valor) FROM consultas WHERE status = 'Concluído'");
  const totalConsultas = await pool.query('SELECT COUNT(*) FROM consultas');
  
  res.json({
    totalPacientes: qtdPacientes.rows[0].count,
    faturamentoTotal: faturamento.rows[0].sum || 0,
    totalConsultas: totalConsultas.rows[0].count
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));