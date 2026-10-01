const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inserirAluno(nome, ra, curso) {
  const { data, error } = await supabase
    .from('alunos')
    .insert({ nome, ra, curso: curso || null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listarAlunos() {
  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data;
}

async function atualizarAluno(ra, campos) {
  const { data, error } = await supabase
    .from('alunos')
    .update(campos)
    .eq('ra', ra)
    .select()
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

module.exports = { inserirAluno, listarAlunos, atualizarAluno, excluirPorRa };