require('dotenv').config();

const express = require('express');
const path = require('path');
const {
  inserirCurso,
  listarCursos,
  excluirCurso,
  inserirAluno,
  listarAlunos,
  listarAlunosDoCurso,
  buscarPorRa,
  buscarPorNome,
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
      : ['PGRST200', 'PGRST205'].includes(error.code) ? 503
        : 500;
  const mensagem = status === 409
    ? 'Este RA já está cadastrado.'
    : status === 403
      ? 'Acesso negado pelo Supabase. Confira as policies de RLS.'
      : status === 503
          ? 'Tabelas do Supabase não encontradas. Para banco novo, execute tabela_cursos.sql e tabela_alunos.sql; para banco antigo, migracao_cursos.sql. Depois execute policies.sql.'
      : 'Não foi possível concluir a operação. Confira a conexão e o Supabase.';
  res.status(status).json({ erro: mensagem });
}

function lerPagina(query) {
  if (query.limite === undefined && query.inicio === undefined) return null;
  const limite = Number(query.limite);
  const inicio = query.inicio === undefined ? 0 : Number(query.inicio);
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    return { erro: 'Informe limite entre 1 e 100' };
  }
  if (!Number.isInteger(inicio) || inicio < 0) {
    return { erro: 'inicio inválido' };
  }
  return { inicio, limite };
}

function lerBusca(query) {
  return typeof query.busca === 'string' ? query.busca.trim() : '';
}

function lerOrdenacao(query) {
  const permitidas = { nome: 'nome', ra: 'ra', curso: 'curso' };
  const ordem = permitidas[query.ordem];
  if (!ordem) return null;
  return { ordem, direcao: query.direcao === 'desc' ? 'desc' : 'asc' };
}

function opcoesDaLista(query) {
  const pagina = lerPagina(query);
  if (pagina?.erro) return { erro: pagina.erro };
  const busca = lerBusca(query);
  const ordenacao = lerOrdenacao(query);
  return {
    pagina,
    busca,
    ordenacao,
    opcoes: {
      ...(pagina || {}),
      busca,
      ordenacao,
    },
  };
}

function respostaDaLista(res, pagina, dados, busca = '', ordenacao = null) {
  res.json(pagina
    ? { ...(dados || {}), inicio: pagina.inicio, limite: pagina.limite, busca, ordenacao }
    : dados);
}

app.get('/api/cursos', async (_req, res) => {
  try {
    res.json(await listarCursos());
  } catch (error) {
    responderErro(res, error);
  }
});

app.post('/api/cursos', async (req, res) => {
  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
  if (!nome) return res.status(400).json({ erro: 'O nome do curso é obrigatório.' });

  try {
    res.status(201).json(await inserirCurso(nome));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Já existe um curso com esse nome.' });
    }
    responderErro(res, error);
  }
});

app.delete('/api/cursos/:id', async (req, res) => {
  try {
    const curso = await excluirCurso(req.params.id);
    if (!curso) return res.status(404).json({ erro: 'Curso não encontrado.' });
    res.json(curso);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ erro: 'Não é possível excluir: este curso ainda tem alunos.' });
    }
    responderErro(res, error);
  }
});

async function listarAlunosApi(req, res) {
  try {
    const lida = opcoesDaLista(req.query);
    if (lida.erro) return res.status(400).json({ erro: lida.erro });
    const dados = await listarAlunos(lida.opcoes);
    respostaDaLista(res, lida.pagina, dados, lida.busca, lida.ordenacao);
  } catch (error) {
    responderErro(res, error);
  }
}

app.get('/api/alunos', listarAlunosApi);
app.get('/alunos', listarAlunosApi);

app.get('/api/alunos/ra/:ra', async (req, res) => {
  try {
    const aluno = await buscarPorRa(req.params.ra);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    res.json(aluno);
  } catch (error) {
    responderErro(res, error);
  }
});

app.get('/api/alunos/busca', async (req, res) => {
  const nome = typeof req.query.nome === 'string' ? req.query.nome.trim() : '';
  if (!nome) return res.status(400).json({ erro: 'Informe um nome para buscar.' });

  try {
    res.json(await buscarPorNome(nome));
  } catch (error) {
    responderErro(res, error);
  }
});

app.post('/api/alunos', async (req, res) => {
  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
  const ra = typeof req.body?.ra === 'string' ? req.body.ra.trim() : '';
  const cursoId = Number(req.body?.curso_id);

  if (!nome || !ra || !Number.isInteger(cursoId) || cursoId < 1) {
    return res.status(400).json({ erro: 'Nome, RA e curso são obrigatórios.' });
  }

  try {
    const aluno = await inserirAluno(nome, ra, cursoId);
    res.status(201).json(aluno);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ erro: 'O curso informado não existe.' });
    }
    responderErro(res, error);
  }
});

async function listarAlunosDoCursoApi(req, res) {
  try {
    const lida = opcoesDaLista(req.query);
    if (lida.erro) return res.status(400).json({ erro: lida.erro });
    const dados = await listarAlunosDoCurso(req.params.id, lida.opcoes);
    respostaDaLista(res, lida.pagina, dados, lida.busca, lida.ordenacao);
  } catch (error) {
    responderErro(res, error);
  }
}

app.get('/api/cursos/:id/alunos', listarAlunosDoCursoApi);
app.get('/cursos/:id/alunos', listarAlunosDoCursoApi);

app.put('/api/alunos/:ra', async (req, res) => {
  const nome = req.body?.nome;
  const cursoId = req.body?.curso_id;
  const campos = {};

  if (nome !== undefined) {
    if (typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
    }
    campos.nome = nome.trim();
  }

  if (cursoId !== undefined) {
    const id = Number(cursoId);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'Selecione um curso válido.' });
    }
    campos.curso_id = id;
  }

  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ erro: 'Informe nome e/ou curso para atualizar.' });
  }

  try {
    const aluno = await atualizarAluno(req.params.ra, campos);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    res.json(aluno);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ erro: 'O curso informado não existe.' });
    }
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Aplicação disponível em http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  lerPagina,
  lerBusca,
  lerOrdenacao,
  opcoesDaLista,
  respostaDaLista,
};