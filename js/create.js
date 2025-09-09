document.addEventListener('DOMContentLoaded', () => {
    const addQuestionBtn = document.getElementById('add-question');
    const questionsContainer = document.getElementById('questions-container');
    const form = document.getElementById('battle-form');
    const closeBtn = document.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    const params = new URLSearchParams(window.location.search);
    const battleId = params.get('id');
    let existingBattle = null;
    if (battleId) {
      const title = document.querySelector('.top-bar h1');
      if (title) title.textContent = 'Edit Battle';
      const submitBtn = form.querySelector('.submit-btn');
      if (submitBtn) {
        submitBtn.textContent = 'Save';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.id = 'delete-battle';
        deleteBtn.className = 'delete-btn text-medium';
        deleteBtn.textContent = 'Delete';
        submitBtn.insertAdjacentElement('afterend', deleteBtn);
        deleteBtn.addEventListener('click', async () => {
          if (!window.supabaseClient) {
            alert('Supabase not configured.');
            return;
          }
          const { error } = await window.supabaseClient
            .from('battles')
            .delete()
            .eq('id', battleId);
          if (error) {
            console.error('Failed to delete battle.', error);
            alert('Unable to delete battle.');
            return;
          }
          window.location.href = 'index.html';
        });
      }
    }
    let battles = [];

    async function loadBattles() {
      if (!window.supabaseClient) {
        battles = [];
        return;
      }
      const { data, error } = await window.supabaseClient
        .from('battles')
        .select('id, name, questions');
      if (error) {
        console.error('Error loading battles:', error);
        battles = [];
        return;
      }
      battles = data;
    }

    loadBattles().then(async () => {
      if (battleId && window.supabaseClient) {
        const { data } = await window.supabaseClient
          .from('battles')
          .select('id, name, questions')
          .eq('id', battleId)
          .single();
        existingBattle = data;
        if (existingBattle) {
          populateForm(existingBattle);
        }
      }
    });

    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.type === 'text') {
        e.preventDefault();
      }
    });

    function removeError(field) {
      field.classList.remove('error');
      const container = field.classList.contains('answer-input') ? field.closest('.answer-row') : field;
      const msg = container.nextElementSibling;
      if (msg && msg.classList.contains('error-message')) {
        msg.remove();
      }
    }

    form.addEventListener('input', e => {
      if (e.target.classList.contains('error')) {
        removeError(e.target);
      }
    });

    form.addEventListener('change', e => {
      if (e.target.classList.contains('error')) {
        removeError(e.target);
      }
    });

  addQuestionBtn.addEventListener('click', () => {
    const index = questionsContainer.querySelectorAll('.question-block').length + 1;
    const block = createQuestionBlock(index);
    questionsContainer.appendChild(block);
  });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const firstError = validateForm();
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const data = collectFormData();
      await loadBattles();
      let idNum;
      if (battleId) {
        idNum = Number(battleId);
      } else {
        const maxId = battles.length ? Math.max(...battles.map(b => b.id)) : 0;
        idNum = maxId + 1;
      }

      if (!window.supabaseClient) {
        alert('Supabase not configured.');
        return;
      }

      const { error } = await window.supabaseClient
        .from('battles')
        .upsert({ id: idNum, name: data.name, questions: data.questions });

      if (error) {
        console.error('Failed to save battle.', error);
        alert('Unable to save battle.');
        return;
      }

      window.location.href = 'index.html';
    });

    questionsContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('question-type')) {
        e.target.style.color = e.target.value ? '#272B34' : '#9C9C9C';
        const block = e.target.closest('.question-block');
        renderAnswerFields(block, e.target.value);
      }
    });

    questionsContainer.addEventListener('click', (e) => {
      if (e.target.closest('.delete-question')) {
        const block = e.target.closest('.question-block');
        block.remove();
        updateQuestionNumbers();
        return;
      }

      const correctBtn = e.target.closest('.correct-btn');
      if (correctBtn && !correctBtn.classList.contains('disabled')) {
        const block = correctBtn.closest('.question-block');
        const type = block.querySelector('.question-type').value;
        if (type === 'boolean') {
          block.querySelectorAll('.correct-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.querySelector('img').src = '../images/create/box_empty.svg';
          });
          correctBtn.classList.add('selected');
          correctBtn.querySelector('img').src = '../images/create/box_checked.svg';
        } else if (type === 'multiple') {
          correctBtn.classList.toggle('selected');
          const img = correctBtn.querySelector('img');
          if (correctBtn.classList.contains('selected')) {
            img.src = '../images/create/box_checked.svg';
          } else {
            img.src = '../images/create/box_empty.svg';
          }
        }
        const list = block.querySelector('.answers-list');
        if (list.classList.contains('error')) {
          removeError(list);
        }
      }
    });

    function createQuestionBlock(index) {
      const section = document.createElement('section');
      section.className = 'question-block subcard';
      section.dataset.index = index;

      const header = document.createElement('div');
      header.className = 'question-header';

      const label = document.createElement('label');
      label.className = 'text-large';
      label.setAttribute('for', `question-name-${index}`);
      label.textContent = `Question ${index}`;
      header.appendChild(label);

      if (index > 1) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-question';
        deleteBtn.innerHTML = `<img src="../images/create/delete.svg" alt="Delete">`;
        header.appendChild(deleteBtn);
      }

      section.appendChild(header);

      const input = document.createElement('input');
      input.type = 'text';
      input.name = `question${index}`;
      input.id = `question-name-${index}`;
      input.className = 'text-small';
      input.placeholder = 'Enter Question';
      section.appendChild(input);

      const select = document.createElement('select');
      select.name = `type${index}`;
      select.className = 'question-type text-small';
      select.innerHTML = `
          <option value="" disabled selected>Select Category</option>
          <option value="multiple">Multiple Choice</option>
          <option value="boolean">True or False</option>
          <option value="text">Type Answer</option>
        `;
      select.style.color = '#9C9C9C';
      section.appendChild(select);

      const answers = document.createElement('div');
      answers.className = 'answer-fields';
      section.appendChild(answers);

      return section;
    }

  function renderAnswerFields(block, type) {
    const container = block.querySelector('.answer-fields');
    container.innerHTML = '';
    const index = block.dataset.index;

    if (!type) return;

    const label = document.createElement('div');
    label.className = 'answers-label text-medium';
    label.textContent = 'Answers';
    container.appendChild(label);

    const list = document.createElement('div');
    list.className = 'answers-list';
    container.appendChild(list);

    if (type === 'multiple') {
        for (let i = 1; i <= 4; i++) {
          const row = document.createElement('div');
          row.className = 'answer-row';

          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = i > 2 ? 'Enter Answer (Optional)' : 'Enter Answer';
          input.name = `q${index}option${i}`;
          input.className = 'text-small answer-input';
          row.appendChild(input);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'correct-btn text-small';
        btn.innerHTML = `<img src="../images/create/box_empty.svg" alt="checkbox"> Correct`;
        row.appendChild(btn);

        list.appendChild(row);
      }
    } else if (type === 'boolean') {
      ['True', 'False'].forEach((value, i) => {
        const row = document.createElement('div');
        row.className = 'answer-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.readOnly = true;
        input.name = `q${index}option${i + 1}`;
        input.className = 'text-small answer-input';
        row.appendChild(input);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'correct-btn text-small';
        btn.innerHTML = `<img src="../images/create/box_empty.svg" alt="checkbox"> Correct`;
        row.appendChild(btn);

        list.appendChild(row);
      });
    } else if (type === 'text') {
      const row = document.createElement('div');
      row.className = 'answer-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Enter Answer';
      input.name = `q${index}answer`;
      input.className = 'text-small answer-input';
      row.appendChild(input);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'correct-btn text-small selected disabled';
      btn.innerHTML = `<img src="../images/create/box_checked.svg" alt="checkbox"> Correct`;
      row.appendChild(btn);

      list.appendChild(row);
    }
  }

  function updateQuestionNumbers() {
    const blocks = questionsContainer.querySelectorAll('.question-block');
    blocks.forEach((block, idx) => {
      const index = idx + 1;
      block.dataset.index = index;
      const label = block.querySelector('.question-header label');
      label.setAttribute('for', `question-name-${index}`);
      label.textContent = `Question ${index}`;
      const input = block.querySelector('input[type="text"]');
      input.id = `question-name-${index}`;
      input.name = `question${index}`;
      const select = block.querySelector('.question-type');
      select.name = `type${index}`;
      updateAnswerFieldNames(block, select.value);
    });
  }

  function updateAnswerFieldNames(block, type) {
    const index = block.dataset.index;
    const container = block.querySelector('.answer-fields');
    if (type === 'multiple') {
      const options = container.querySelectorAll('.answer-input');
      options.forEach((input, i) => {
        input.name = `q${index}option${i + 1}`;
      });
    } else if (type === 'boolean') {
      const options = container.querySelectorAll('.answer-input');
      options.forEach((input, i) => {
        input.name = `q${index}option${i + 1}`;
      });
    } else if (type === 'text') {
      const answer = container.querySelector('.answer-input');
      if (answer) {
        answer.name = `q${index}answer`;
      }
    }
  }

  function collectFormData() {
    const battleName = document.getElementById('battle-name').value.trim();
    const questions = [];
    questionsContainer.querySelectorAll('.question-block').forEach(block => {
      const questionText = block.querySelector('input[type="text"]').value.trim();
      const type = block.querySelector('.question-type').value;
      if (!questionText || !type) return;
      if (type === 'multiple') {
        const options = [...block.querySelectorAll('.answer-input')].map(i => i.value.trim());
        const correct = [];
        block.querySelectorAll('.correct-btn').forEach((btn, idx) => {
          if (btn.classList.contains('selected')) correct.push(idx);
        });
        questions.push({ question: questionText, type, options, correct });
      } else if (type === 'boolean') {
        const options = [...block.querySelectorAll('.answer-input')].map(i => i.value.trim());
        const correctIndex = Array.from(block.querySelectorAll('.correct-btn')).findIndex(btn => btn.classList.contains('selected'));
        questions.push({ question: questionText, type, options, correct: correctIndex });
      } else if (type === 'text') {
        const answer = block.querySelector('.answer-input').value.trim();
        questions.push({ question: questionText, type, answer });
      }
    });
    return { name: battleName, questions };
  }

  function clearErrors() {
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.error-message').forEach(el => el.remove());
  }

    function markError(el, message = 'Required Field') {
      el.classList.add('error');
      const container = el.classList.contains('answer-input') ? el.closest('.answer-row') : el;
      const msg = document.createElement('div');
      msg.className = 'error-message text-small';
      msg.textContent = message;
      container.insertAdjacentElement('afterend', msg);
    }

  function validateForm() {
    clearErrors();
    let firstError = null;
    const battleNameField = document.getElementById('battle-name');
    if (!battleNameField.value.trim()) {
      markError(battleNameField);
      firstError = firstError || battleNameField;
    }
    const blocks = questionsContainer.querySelectorAll('.question-block');
    blocks.forEach(block => {
      const questionInput = block.querySelector('input[type="text"]');
      if (!questionInput.value.trim()) {
        markError(questionInput);
        firstError = firstError || questionInput;
      }
      const typeField = block.querySelector('.question-type');
      if (!typeField.value) {
        markError(typeField);
        firstError = firstError || typeField;
      }
      const type = typeField.value;
      if (type === 'multiple') {
        const rows = block.querySelectorAll('.answer-row');
        rows.forEach((row, idx) => {
          const input = row.querySelector('.answer-input');
          const correctBtn = row.querySelector('.correct-btn');
          const required = idx < 2 || correctBtn.classList.contains('selected');
          if (required && !input.value.trim()) {
            markError(input);
            firstError = firstError || input;
          }
        });
        const selected = block.querySelectorAll('.correct-btn.selected');
        if (selected.length === 0) {
          const list = block.querySelector('.answers-list');
          markError(list, 'Select a Correct Answer');
          firstError = firstError || list;
        }
      } else if (type === 'boolean') {
        if (block.querySelectorAll('.correct-btn.selected').length !== 1) {
          const list = block.querySelector('.answers-list');
          markError(list, 'Select a Correct Answer');
          firstError = firstError || list;
        }
      } else if (type === 'text') {
        const input = block.querySelector('.answer-input');
        if (!input.value.trim()) {
          markError(input);
          firstError = firstError || input;
        }
      }
    });
    return firstError;
  }

  const uploaded = localStorage.getItem('uploadedQuestions');
  if (uploaded && !battleId) {
    const parsed = JSON.parse(uploaded);
    questionsContainer.innerHTML = '';
    parsed.forEach((q, idx) => {
      const block = createQuestionBlock(idx + 1);
      questionsContainer.appendChild(block);
      const input = block.querySelector('input[type="text"]');
      input.value = q.question || '';
      const select = block.querySelector('.question-type');
      select.value = 'text';
      select.style.color = '#272B34';
      renderAnswerFields(block, 'text');
      const answerInput = block.querySelector('.answer-input');
      if (answerInput) answerInput.value = q.answer || '';
    });
    localStorage.removeItem('uploadedQuestions');
  }

  function populateForm(battle) {
    document.getElementById('battle-name').value = battle.name;
    questionsContainer.innerHTML = '';
    battle.questions.forEach((q, idx) => {
      const block = createQuestionBlock(idx + 1);
      questionsContainer.appendChild(block);
      block.querySelector('input[type="text"]').value = q.question;
      const select = block.querySelector('.question-type');
      select.value = q.type;
      select.style.color = '#272B34';
      renderAnswerFields(block, q.type);
      if (q.type === 'multiple') {
        const inputs = block.querySelectorAll('.answer-input');
        q.options.forEach((opt, i) => inputs[i].value = opt);
        q.correct.forEach(i => {
          const btn = block.querySelectorAll('.correct-btn')[i];
          if (btn) {
            btn.classList.add('selected');
            btn.querySelector('img').src = '../images/create/box_checked.svg';
          }
        });
      } else if (q.type === 'boolean') {
        const inputs = block.querySelectorAll('.answer-input');
        q.options.forEach((opt, i) => inputs[i].value = opt);
        const btn = block.querySelectorAll('.correct-btn')[q.correct];
        if (btn) {
          btn.classList.add('selected');
          btn.querySelector('img').src = '../images/create/box_checked.svg';
        }
      } else if (q.type === 'text') {
        block.querySelector('.answer-input').value = q.answer;
      }
    });
  }
});
