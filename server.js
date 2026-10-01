require('dotenv').config();

const express = require('express');
const path = require('path');
const {
  inserirAluno,
  listarAlunos,
  atualizarAluno,
  excluirPorRa,
} = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function responderErro(res, error) {
  console.error(error);
  const status = error.code === '23505' ? 409
    : error.code === '42501' ? 403
      : error.code === 'PGRST205' ? 503
        : 500;
  const mensagem = status === 409
    ? 'Este RA já está cadastrado.'
    : status === 403
      ? 'Acesso negado pelo Supabase. Confira as policies de RLS.'
      : status === 503
        ? 'Tabela public.alunos não encontrada. Execute supabase.sql no SQL Editor do Supabase.'
      : 'Não foi possível concluir a operação. Confira a conexão e o Supabase.';
  res.status(status).json({ erro: mensagem });
}

app.get('/api/alunos', async (_req, res) => {
  try {
    res.json(await listarAlunos());
  } catch (error) {
    responderErro(res, error);
  }
});

app.post('/api/alunos', async (req, res) => {
  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
  const ra = typeof req.body?.ra === 'string' ? req.body.ra.trim() : '';
  const curso = typeof req.body?.curso === 'string' ? req.body.curso.trim() : '';

  if (!nome || !ra) {
    return res.status(400).json({ erro: 'Nome e RA são obrigatórios.' });
  }

  try {
    const aluno = await inserirAluno(nome, ra, curso);
    res.status(201).json(aluno);
  } catch (error) {
    responderErro(res, error);
  }
});

app.put('/api/alunos/:ra', async (req, res) => {
  const nome = req.body?.nome;
  const curso = req.body?.curso;
  const campos = {};

  if (nome !== undefined) {
    if (typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
    }
    campos.nome = nome.trim();
  }

  if (curso !== undefined) {
    if (typeof curso !== 'string') {
      return res.status(400).json({ erro: 'O curso precisa ser um texto.' });
    }
    campos.curso = curso.trim() || null;
  }

  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ erro: 'Informe nome e/ou curso para atualizar.' });
  }

  try {
    const aluno = await atualizarAluno(req.params.ra, campos);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    res.json(aluno);
  } catch (error) {
    responderErro(res, error);
  }
});

app.delete('/api/alunos/:ra', async (req, res) => {
  try {
    const aluno = await excluirPorRa(req.params.ra);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    res.json({ mensagem: 'Aluno excluído com sucesso.' });
  } catch (error) {
    responderErro(res, error);
  }
});

app.use(express.static(path.join(__dirname, 'frontend')));

app.listen(PORT, () => {
  console.log(`Aplicação disponível em http://localhost:${PORT}`);
});