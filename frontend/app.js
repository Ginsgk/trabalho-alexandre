const tableBody = document.getElementById('students-table');
const coursesTable = document.getElementById('courses-table');
const message = document.getElementById('message');
const dialog = document.getElementById('student-dialog');
const form = document.getElementById('student-form');
const title = document.getElementById('dialog-title');
const nameInput = document.getElementById('name');
const raInput = document.getElementById('ra');
const courseInput = document.getElementById('course');
const courseFilter = document.getElementById('course-filter');
const courseForm = document.getElementById('course-form');
const newCourseInput = document.getElementById('new-course');
const saveButton = document.getElementById('save-student');
let editingRa = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
  message.hidden = !text;
}

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.');
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

function renderStudents(students) {
  tableBody.replaceChildren();
  if (!students.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'empty-state';
    cell.colSpan = 4;
    cell.textContent = 'Nenhum aluno cadastrado ainda.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  for (const student of students) {
    const row = document.createElement('tr');
    row.append(createCell(student.nome), createCell(student.ra), createCell(student.curso?.nome));

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    actionsCell.append(
      createAction('Editar', 'button-secondary', () => openDialog(student)),
      createAction('Excluir', 'button-danger', () => deleteStudent(student)),
    );
    row.appendChild(actionsCell);
    tableBody.appendChild(row);
  }
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
        courseFilter.value = course.id;
        await loadStudents();
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

async function loadStudents() {
  tableBody.innerHTML = '<tr><td class="empty-state" colspan="4">Carregando alunos...</td></tr>';
  try {
    const courseId = courseFilter.value;
    const url = courseId ? `/api/cursos/${encodeURIComponent(courseId)}/alunos` : '/api/alunos';
    renderStudents(await request(url));
    showMessage('');
  } catch (error) {
    renderStudents([]);
    showMessage(error.message, true);
  }
}

async function refreshData() {
  await loadCourses();
  await loadStudents();
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
  const student = {
    nome: nameInput.value.trim(),
    ra: raInput.value.trim(),
    curso_id: Number(courseInput.value),
  };
  const isEditing = editingRa !== null;

  saveButton.disabled = true;
  try {
    await request(isEditing ? `/api/alunos/${encodeURIComponent(editingRa)}` : '/api/alunos', {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEditing ? { nome: student.nome, curso_id: student.curso_id } : student),
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
document.getElementById('refresh-list').addEventListener('click', loadStudents);
courseForm.addEventListener('submit', addCourse);
courseFilter.addEventListener('change', loadStudents);
document.getElementById('close-dialog').addEventListener('click', closeDialog);
document.getElementById('cancel-dialog').addEventListener('click', closeDialog);
form.addEventListener('submit', saveStudent);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
});

refreshData();