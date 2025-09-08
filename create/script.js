document.addEventListener('DOMContentLoaded', () => {
    const addQuestionBtn = document.getElementById('add-question');
    const questionsContainer = document.getElementById('questions-container');
    const form = document.getElementById('battle-form');

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
});
