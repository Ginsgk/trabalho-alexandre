const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLUNAS_ALUNO = 'id, nome, ra, curso_id, curso:cursos(id, nome)';

async function inserirCurso(nome) {
  const { data, error } = await supabase
    .from('cursos')
    .insert({ nome })
    .select('id, nome')
    .single();

  if (error) throw error;
  return data;
}

async function listarCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('id, nome, alunos(count)')
    .order('nome', { ascending: true });

  if (error) throw error;
  return data.map((curso) => ({
    id: curso.id,
    nome: curso.nome,
    total_alunos: curso.alunos[0]?.count ?? 0,
  }));
}

async function excluirCurso(id) {
  const { data, error } = await supabase
    .from('cursos')
    .delete()
    .eq('id', id)
    .select('id, nome')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function inserirAluno(nome, ra, cursoId) {
  const { data, error } = await supabase
    .from('alunos')
    .insert({ nome, ra, curso_id: cursoId })
    .select(COLUNAS_ALUNO)
    .single();

  if (error) throw error;
  return data;
}

async function listarAlunosPaginado(cursoId, inicio = 0, limite, busca = '', ordenacao = null) {
  let consulta = supabase
    .from('alunos')
    .select(COLUNAS_ALUNO, limite ? { count: 'exact' } : undefined);

  if (cursoId) consulta = consulta.eq('curso_id', cursoId);

  const termo = String(busca || '').replace(/[%_,]/g, ' ').trim();
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,ra.ilike.%${termo}%`);

  if (ordenacao?.ordem === 'curso') {
    consulta = consulta.order('nome', {
      ascending: ordenacao.direcao !== 'desc',
      foreignTable: 'cursos',
    });
  } else if (ordenacao?.ordem === 'nome' || ordenacao?.ordem === 'ra') {
    consulta = consulta.order(ordenacao.ordem, {
      ascending: ordenacao.direcao !== 'desc',
    });
  } else {
    consulta = consulta.order('id', { ascending: true });
  }

  if (ordenacao?.ordem) consulta = consulta.order('id', { ascending: true });
  if (limite) consulta = consulta.range(inicio, inicio + limite - 1);

  const { data, error, count } = await consulta;
  if (error) throw error;
  if (!limite) return data || [];
  return { alunos: data || [], total: count ?? 0 };
}

async function listarAlunos(opcoes = {}) {
  return listarAlunosPaginado(null, opcoes.inicio || 0, opcoes.limite, opcoes.busca, opcoes.ordenacao);
}

async function listarAlunosDoCurso(cursoId, opcoes = {}) {
  return listarAlunosPaginado(cursoId, opcoes.inicio || 0, opcoes.limite, opcoes.busca, opcoes.ordenacao);
}

async function buscarPorRa(ra) {
  const { data, error } = await supabase
    .from('alunos')
    .select(COLUNAS_ALUNO)
    .eq('ra', ra)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function buscarPorNome(parteNome) {
  const { data, error } = await supabase
    .from('alunos')
    .select(COLUNAS_ALUNO)
    .ilike('nome', `%${parteNome}%`)
    .order('nome', { ascending: true });

  if (error) throw error;
  return data;
}

async function atualizarAluno(ra, campos) {
  const { data, error } = await supabase
    .from('alunos')
    .update(campos)
    .eq('ra', ra)
    .select(COLUNAS_ALUNO)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function excluirPorRa(ra) {
  const { data, error } = await supabase
    .from('alunos')
    .delete()
    .eq('ra', ra)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = {
  inserirCurso,
  listarCursos,
  excluirCurso,
  inserirAluno,
  listarAlunosPaginado,
  listarAlunos,
  listarAlunosDoCurso,
  buscarPorRa,
  buscarPorNome,
  atualizarAluno,
  excluirPorRa,
};