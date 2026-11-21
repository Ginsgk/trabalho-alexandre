const tableBody = document.getElementById('students-table');
const coursesTable = document.getElementById('courses-table');
const message = document.getElementById('message');
const dialog = document.getElementById('student-dialog');
const form = document.getElementById('student-form');
const title = document.getElementById('dialog-title');
const nameInput = document.getElementById('name');
const raInput = document.getElementById('ra');
const courseInput = document.getElementById('course');
const courseFilter = document.getElementById('filtro-curso');
const courseForm = document.getElementById('course-form');
const newCourseInput = document.getElementById('new-course');
const saveButton = document.getElementById('save-student');
const formBusca = document.getElementById('form-busca');
const inputBusca = document.getElementById('busca-aluno');
const filtrosAtivos = document.getElementById('filtros-ativos');
const statusAlunos = document.getElementById('alunos-status');
const sentinelaAlunos = document.getElementById('sentinela-alunos');

const ALUNOS_POR_PAGINA = 5;
let alunosInicio = 0;
let alunosTotal = 0;
let alunosTemMais = false;
let alunosCarregando = false;
let alunosErro = false;
let alunosPedido = 0;
let alunosBusca = '';
let alunosOrdem = '';
let alunosDirecao = 'asc';
let editingRa = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
  message.hidden = !text;
}

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro || 'Nao foi possivel concluir a operacao.');
  return data;
}

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text || '—';
  return cell;
}

function createAction(label, className, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button ${className}`;
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}

function linhaAluno(aluno) {
  const row = document.createElement('tr');
  row.append(createCell(aluno.nome), createCell(aluno.ra), createCell(aluno.curso?.nome));
  const actionsCell = document.createElement('td');
  actionsCell.className = 'actions-cell';
  actionsCell.append(
    createAction('Editar', 'button-secondary', () => openDialog(aluno)),
    createAction('Excluir', 'button-danger', () => deleteStudent(aluno)),
  );
  row.appendChild(actionsCell);
  return row;
}

function atualizarStatusAlunos() {
  if (alunosErro) {
    statusAlunos.textContent = 'A lista não carregou. Use Atualizar lista para tentar de novo.';
  } else if (alunosCarregando && alunosInicio === 0) {
    statusAlunos.textContent = 'Carregando...';
  } else if (!alunosTotal) {
    statusAlunos.textContent = 'Nenhum aluno para mostrar.';
  } else if (alunosCarregando) {
    statusAlunos.textContent = `Mostrando ${alunosInicio} de ${alunosTotal}. Carregando mais...`;
  } else if (alunosTemMais) {
    statusAlunos.textContent = `Mostrando ${alunosInicio} de ${alunosTotal}. Role a tela para carregar mais.`;
  } else {
    statusAlunos.textContent = `Mostrando ${alunosInicio} de ${alunosTotal}. Fim da lista.`;
  }
}

async function listarAlunos(acrescentar = false) {
  if (acrescentar && (alunosCarregando || !alunosTemMais)) return;

  const pedido = acrescentar ? alunosPedido : ++alunosPedido;
  const inicio = acrescentar ? alunosInicio : 0;
  const cursoId = courseFilter.value;
  const base = cursoId ? `/api/cursos/${encodeURIComponent(cursoId)}/alunos` : '/api/alunos';

  alunosCarregando = true;
  alunosErro = false;
  if (!acrescentar) {
    alunosInicio = 0;
    alunosTotal = 0;
    alunosTemMais = false;
    tableBody.innerHTML = '<tr><td class="empty-state" colspan="4">Carregando...</td></tr>';
  }
  atualizarStatusAlunos();

  try {
    const params = new URLSearchParams({ inicio: String(inicio), limite: String(ALUNOS_POR_PAGINA) });
    if (alunosBusca) params.set('busca', alunosBusca);
    if (alunosOrdem) {
      params.set('ordem', alunosOrdem);
      params.set('direcao', alunosDirecao);
    }
    const resposta = await fetch(`${base}?${params.toString()}`);
    const dados = await resposta.json();
    if (pedido !== alunosPedido) return;
    if (!resposta.ok) {
      alunosErro = true;
      showMessage(dados.erro || 'Erro ao listar alunos', true);
      tableBody.innerHTML = '<tr><td class="empty-state" colspan="4">Não foi possível carregar.</td></tr>';
      return;
    }

    const alunos = Array.isArray(dados) ? dados : (dados.alunos || []);
    if (!acrescentar) tableBody.replaceChildren();
    if (!alunos.length) {
      if (!acrescentar) {
        tableBody.innerHTML = '<tr><td class="empty-state" colspan="4">Nenhum aluno encontrado.</td></tr>';
      }
      alunosTotal = Array.isArray(dados) ? alunos.length : (dados.total || 0);
      alunosInicio = inicio;
      alunosTemMais = false;
      return;
    }

    alunosTotal = Array.isArray(dados) ? alunos.length : (dados.total || 0);
    for (const aluno of alunos) tableBody.appendChild(linhaAluno(aluno));
    alunosInicio = inicio + alunos.length;
    alunosTemMais = alunosInicio < alunosTotal;
  } catch (error) {
    if (pedido !== alunosPedido) return;
    alunosErro = true;
    tableBody.innerHTML = '<tr><td class="empty-state" colspan="4">Não foi possível carregar.</td></tr>';
    showMessage(error.message, true);
  } finally {
    if (pedido === alunosPedido) {
      alunosCarregando = false;
      atualizarStatusAlunos();
      pedirMaisSeVisivel();
    }
  }
}

function pedirMaisSeVisivel() {
  if (!alunosTemMais || alunosCarregando || !sentinelaAlunos) return;
  const topo = sentinelaAlunos.getBoundingClientRect().top;
  if (topo <= window.innerHeight + 160) listarAlunos(true);
}

function nomeCursoDoFiltro() {
  const option = courseFilter.options[courseFilter.selectedIndex];
  return option?.textContent || '';
}

function criarNuvemFiltro(rotulo, texto, acao) {
  const grupo = document.createElement('span');
  const titulo = document.createElement('span');
  titulo.className = 'criterio-rotulo';
  titulo.textContent = `${rotulo}:`;
  const nuvem = document.createElement('span');
  nuvem.className = 'nuvem-filtro';
  const label = document.createElement('span');
  label.className = 'nuvem-filtro-texto';
  label.textContent = texto;
  const limpar = document.createElement('button');
  limpar.type = 'button';
  limpar.className = 'nuvem-filtro-limpar';
  limpar.textContent = '×';
  limpar.setAttribute('aria-label', `Limpar ${rotulo.toLowerCase()}`);
  limpar.addEventListener('click', acao);
  nuvem.append(label, limpar);
  grupo.append(titulo, document.createTextNode(' '), nuvem);
  return grupo;
}

function atualizarFiltrosAtivos() {
  filtrosAtivos.replaceChildren();
  const temCurso = Boolean(courseFilter.value);
  const temBusca = Boolean(alunosBusca);
  if (!temCurso && !temBusca) {
    filtrosAtivos.hidden = true;
    return;
  }
  if (temCurso) filtrosAtivos.appendChild(criarNuvemFiltro('Curso', nomeCursoDoFiltro(), limparFiltroCurso));
  if (temBusca) filtrosAtivos.appendChild(criarNuvemFiltro('Pesquisa', alunosBusca, limparBusca));
  filtrosAtivos.hidden = false;
}

function limparFiltroCurso() {
  courseFilter.value = '';
  atualizarFiltrosAtivos();
  listarAlunos(false);
}

function limparBusca() {
  inputBusca.value = '';
  alunosBusca = '';
  atualizarFiltrosAtivos();
  listarAlunos(false);
}

function pesquisarAlunos(evento) {
  evento.preventDefault();
  alunosBusca = inputBusca.value.trim();
  atualizarFiltrosAtivos();
  listarAlunos(false);
}

function atualizarCabecalhosOrdem() {
  document.querySelectorAll('.th-ordem').forEach((botao) => {
    const ativa = botao.dataset.ordem === alunosOrdem;
    botao.classList.toggle('ativa', ativa);
    botao.querySelector('.seta-ordem').textContent = ativa ? (alunosDirecao === 'asc' ? ' ↑' : ' ↓') : '';
  });
}

function ordenarPorColuna(coluna) {
  if (alunosOrdem === coluna) {
    alunosDirecao = alunosDirecao === 'asc' ? 'desc' : 'asc';
  } else {
    alunosOrdem = coluna;
    alunosDirecao = 'asc';
  }
  atualizarCabecalhosOrdem();
  listarAlunos(false);
}

function fillCourseSelects(courses) {
  const selectedFilter = courseFilter.value;
  const selectedCourse = courseInput.value;
  courseFilter.replaceChildren(new Option('Todos os cursos', ''));
  courseInput.replaceChildren(new Option('Selecione um curso', ''));
  for (const course of courses) {
    courseFilter.add(new Option(course.nome, course.id));
    courseInput.add(new Option(course.nome, course.id));
  }
  courseFilter.value = selectedFilter;
  courseInput.value = selectedCourse;
  if (courseFilter.selectedIndex === -1) courseFilter.value = '';
  if (courseInput.selectedIndex === -1) courseInput.value = '';
  atualizarFiltrosAtivos();
}

function renderCourses(courses) {
  coursesTable.replaceChildren();
  if (!courses.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'empty-state';
    cell.colSpan = 3;
    cell.textContent = 'Nenhum curso cadastrado ainda.';
    row.appendChild(cell);
    coursesTable.appendChild(row);
    return;
  }
  for (const course of courses) {
    const row = document.createElement('tr');
    row.append(createCell(course.nome), createCell(String(course.total_alunos)));
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    actionsCell.append(
      createAction('Ver alunos', 'button-secondary', async () => {
        courseFilter.value = String(course.id);
        atualizarFiltrosAtivos();
        await listarAlunos(false);
      }),
      createAction('Excluir', 'button-danger', () => deleteCourse(course)),
    );
    row.appendChild(actionsCell);
    coursesTable.appendChild(row);
  }
}

async function loadCourses() {
  try {
    const courses = await request('/api/cursos');
    renderCourses(courses);
    fillCourseSelects(courses);
  } catch (error) {
    renderCourses([]);
    showMessage(error.message, true);
  }
}

async function refreshData() {
  await loadCourses();
  await listarAlunos(false);
}

function openDialog(student = null) {
  if (!student && courseInput.options.length <= 1) {
    showMessage('Cadastre um curso antes de incluir alunos.', true);
    return;
  }
  const isEditing = student !== null;
  editingRa = isEditing ? student.ra : null;
  form.reset();
  nameInput.value = student?.nome || '';
  raInput.value = student?.ra || '';
  courseInput.value = student?.curso_id || '';
  raInput.disabled = isEditing;
  title.textContent = isEditing ? 'Editar aluno' : 'Novo aluno';
  saveButton.textContent = isEditing ? 'Salvar alterações' : 'Salvar aluno';
  dialog.showModal();
  nameInput.focus();
}

function closeDialog() {
  dialog.close();
  form.reset();
  editingRa = null;
  raInput.disabled = false;
}

async function saveStudent(event) {
  event.preventDefault();
  const isEditing = editingRa !== null;
  saveButton.disabled = true;
  try {
    await request(isEditing ? `/api/alunos/${encodeURIComponent(editingRa)}` : '/api/alunos', {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEditing
        ? { nome: nameInput.value.trim(), curso_id: Number(courseInput.value) }
        : { nome: nameInput.value.trim(), ra: raInput.value.trim(), curso_id: Number(courseInput.value) }),
    });
    closeDialog();
    await refreshData();
    showMessage(isEditing ? 'Aluno atualizado.' : 'Aluno cadastrado.');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
}

async function addCourse(event) {
  event.preventDefault();
  try {
    const course = await request('/api/cursos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: newCourseInput.value.trim() }),
    });
    courseForm.reset();
    await refreshData();
    showMessage(`Curso "${course.nome}" cadastrado.`);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function deleteCourse(course) {
  if (!window.confirm(`Excluir o curso "${course.nome}"?`)) return;
  try {
    await request(`/api/cursos/${encodeURIComponent(course.id)}`, { method: 'DELETE' });
    await refreshData();
    showMessage('Curso excluído.');
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function deleteStudent(student) {
  if (!window.confirm(`Excluir ${student.nome} (RA ${student.ra})?`)) return;
  try {
    await request(`/api/alunos/${encodeURIComponent(student.ra)}`, { method: 'DELETE' });
    await refreshData();
    showMessage('Aluno excluído.');
  } catch (error) {
    showMessage(error.message, true);
  }
}

document.getElementById('new-student').addEventListener('click', () => openDialog());
document.getElementById('btn-atualizar').addEventListener('click', () => refreshData());
courseForm.addEventListener('submit', addCourse);
formBusca.addEventListener('submit', pesquisarAlunos);
courseFilter.addEventListener('change', () => {
  atualizarFiltrosAtivos();
  listarAlunos(false);
});
document.querySelectorAll('.th-ordem').forEach((botao) => {
  botao.addEventListener('click', () => ordenarPorColuna(botao.dataset.ordem));
});
document.getElementById('close-dialog').addEventListener('click', closeDialog);
document.getElementById('cancel-dialog').addEventListener('click', closeDialog);
form.addEventListener('submit', saveStudent);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
});
window.addEventListener('scroll', pedirMaisSeVisivel, { passive: true });
window.addEventListener('resize', pedirMaisSeVisivel);

refreshData();
