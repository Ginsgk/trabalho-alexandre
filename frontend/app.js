const tableBody = document.getElementById('students-table');
const message = document.getElementById('message');
const dialog = document.getElementById('student-dialog');
const form = document.getElementById('student-form');
const title = document.getElementById('dialog-title');
const nameInput = document.getElementById('name');
const raInput = document.getElementById('ra');
const courseInput = document.getElementById('course');
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
    row.append(createCell(student.nome), createCell(student.ra), createCell(student.curso));

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

async function loadStudents() {
  tableBody.innerHTML = '<tr><td class="empty-state" colspan="4">Carregando alunos...</td></tr>';
  try {
    renderStudents(await request('/api/alunos'));
    showMessage('');
  } catch (error) {
    renderStudents([]);
    showMessage(error.message, true);
  }
}

function openDialog(student = null) {
  const isEditing = student !== null;
  editingRa = isEditing ? student.ra : null;
  form.reset();
  nameInput.value = student?.nome || '';
  raInput.value = student?.ra || '';
  courseInput.value = student?.curso || '';
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
    curso: courseInput.value.trim(),
  };
  const isEditing = editingRa !== null;

  saveButton.disabled = true;
  try {
    await request(isEditing ? `/api/alunos/${encodeURIComponent(editingRa)}` : '/api/alunos', {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEditing ? { nome: student.nome, curso: student.curso } : student),
    });
    closeDialog();
    await loadStudents();
    showMessage(isEditing ? 'Aluno atualizado.' : 'Aluno cadastrado.');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteStudent(student) {
  if (!window.confirm(`Excluir ${student.nome} (RA ${student.ra})?`)) return;
  try {
    await request(`/api/alunos/${encodeURIComponent(student.ra)}`, { method: 'DELETE' });
    await loadStudents();
    showMessage('Aluno excluído.');
  } catch (error) {
    showMessage(error.message, true);
  }
}

document.getElementById('new-student').addEventListener('click', () => openDialog());
document.getElementById('refresh-list').addEventListener('click', loadStudents);
document.getElementById('close-dialog').addEventListener('click', closeDialog);
document.getElementById('cancel-dialog').addEventListener('click', closeDialog);
form.addEventListener('submit', saveStudent);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
});

loadStudents();