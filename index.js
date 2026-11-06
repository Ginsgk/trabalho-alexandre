require('dotenv').config();

const {
  inserirCurso,
  listarCursos,
  inserirAluno,
  listarAlunosDoCurso,
  buscarPorRa,
  buscarPorNome,
  atualizarAluno,
} = require('./supabase');

const CURSO_DEMO = 'Curso de demonstração';
const RA_DEMO = 'DEMO-ALUNO-2026-001';
const NOME_DEMO = 'Aluno de demonstração';

async function main() {
  let curso = (await listarCursos()).find((item) => item.nome === CURSO_DEMO);
  if (!curso) curso = await inserirCurso(CURSO_DEMO);

  let aluno = await buscarPorRa(RA_DEMO);
  if (aluno && aluno.nome !== NOME_DEMO) {
    throw new Error(`O RA reservado para a demo (${RA_DEMO}) já pertence a outro aluno; nenhum dado foi alterado.`);
  }

  if (!aluno) {
    aluno = await inserirAluno(NOME_DEMO, RA_DEMO, curso.id);
  } else {
    aluno = await atualizarAluno(RA_DEMO, { nome: NOME_DEMO, curso_id: curso.id });
  }

  console.log('Curso da demo:', curso);
  console.log('Aluno da demo:', aluno);
  console.log('Busca por RA:', await buscarPorRa(RA_DEMO));
  console.log('Busca por nome:', await buscarPorNome('demonstração'));
  console.log('Alunos do curso:', await listarAlunosDoCurso(curso.id));
}

main().catch((error) => {
  console.error('Falha ao executar a demo:', error.message || error);
  process.exitCode = 1;
});
