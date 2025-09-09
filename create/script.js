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
    let battles = [];

    async function loadBattles() {
      try {
        const stored = localStorage.getItem('battles');
        if (stored) {
          battles = JSON.parse(stored);
        } else {
          const res = await fetch('../data/battles.json');
          battles = await res.json();
        }
      } catch (err) {
        console.error('Error loading battles:', err);
        battles = [];
      }
    }

    loadBattles().then(() => {
      if (battleId) {
        existingBattle = battles.find(b => b.id === Number(battleId));
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

  addQuestionBtn.addEventListener('click', () => {
    const index = questionsContainer.querySelectorAll('.question-block').length + 1;
    const block = createQuestionBlock(index);
    questionsContainer.appendChild(block);
  });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateForm()) {
        alert('Please complete all fields and ensure at least one question is fully completed.');
        return;
      }
      const data = collectFormData();
      await loadBattles();
      if (battleId) {
        const idNum = Number(battleId);
        const index = battles.findIndex(b => b.id === idNum);
        if (index !== -1) {
          battles[index] = { ...data, id: idNum };
        } else {
          battles.push({ ...data, id: idNum });
        }
      } else {
        const newId = battles.length ? Math.max(...battles.map(b => b.id)) + 1 : 1;
        battles.push({ ...data, id: newId });
      }

      try {
        if (window.showSaveFilePicker) {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'battles.json',
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(battles, null, 2));
          await writable.close();
        } else {
          throw new Error('File System Access API not supported');
        }
      } catch (err) {
        console.warn('File save failed, falling back to localStorage.', err);
        try {
          localStorage.setItem('battles', JSON.stringify(battles));
        } catch (storageErr) {
          console.error('Failed to save battles.', storageErr);
          alert('Unable to save battle.');
          return;
        }
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
            btn.querySelector('img').src = 'images/box_empty.svg';
          });
          correctBtn.classList.add('selected');
          correctBtn.querySelector('img').src = 'images/box_checked.svg';
        } else if (type === 'multiple') {
          correctBtn.classList.toggle('selected');
          const img = correctBtn.querySelector('img');
          if (correctBtn.classList.contains('selected')) {
            img.src = 'images/box_checked.svg';
          } else {
            img.src = 'images/box_empty.svg';
          }
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
        deleteBtn.innerHTML = `<img src="images/delete.svg" alt="Delete">`;
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
        input.placeholder = 'Enter Answer';
        input.name = `q${index}option${i}`;
        input.className = 'text-small answer-input';
        row.appendChild(input);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'correct-btn text-small';
        btn.innerHTML = `<img src="images/box_empty.svg" alt="checkbox"> Correct`;
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
        btn.innerHTML = `<img src="images/box_empty.svg" alt="checkbox"> Correct`;
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
      btn.innerHTML = `<img src="images/box_checked.svg" alt="checkbox"> Correct`;
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

  function validateForm() {
    const battleName = document.getElementById('battle-name').value.trim();
    if (!battleName) return false;
    const blocks = questionsContainer.querySelectorAll('.question-block');
    if (blocks.length === 0) return false;
    for (const block of blocks) {
      const questionText = block.querySelector('input[type="text"]').value.trim();
      const type = block.querySelector('.question-type').value;
      if (!questionText || !type) return false;
      if (type === 'multiple') {
        const options = block.querySelectorAll('.answer-input');
        if ([...options].some(o => !o.value.trim())) return false;
        if (block.querySelectorAll('.correct-btn.selected').length === 0) return false;
      } else if (type === 'boolean') {
        if (block.querySelectorAll('.correct-btn.selected').length !== 1) return false;
      } else if (type === 'text') {
        if (!block.querySelector('.answer-input').value.trim()) return false;
      }
    }
    return true;
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
            btn.querySelector('img').src = 'images/box_checked.svg';
          }
        });
      } else if (q.type === 'boolean') {
        const inputs = block.querySelectorAll('.answer-input');
        q.options.forEach((opt, i) => inputs[i].value = opt);
        const btn = block.querySelectorAll('.correct-btn')[q.correct];
        if (btn) {
          btn.classList.add('selected');
          btn.querySelector('img').src = 'images/box_checked.svg';
        }
      } else if (q.type === 'text') {
        block.querySelector('.answer-input').value = q.answer;
      }
    });
  }
});
