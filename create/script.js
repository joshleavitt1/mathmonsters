document.addEventListener('DOMContentLoaded', () => {
    const addQuestionBtn = document.getElementById('add-question');
    const questionsContainer = document.getElementById('questions-container');
    const form = document.getElementById('battle-form');
    let questionCount = 1;

    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.type === 'text') {
        e.preventDefault();
      }
    });

  addQuestionBtn.addEventListener('click', () => {
    questionCount++;
    const block = createQuestionBlock(questionCount);
      questionsContainer.appendChild(block);
    });

    questionsContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('question-type')) {
        const block = e.target.closest('.question-block');
        renderAnswerFields(block, e.target.value);
      }
    });

    questionsContainer.addEventListener('click', (e) => {
      if (e.target.closest('.delete-question')) {
        const block = e.target.closest('.question-block');
        block.remove();
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
        deleteBtn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M9 6V4h6v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>`;
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
    if (type === 'multiple') {
      for (let i = 1; i <= 4; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Option ${i}`;
        input.name = `q${index}option${i}`;
        input.className = 'text-small';
        container.appendChild(input);
      }
    } else if (type === 'boolean') {
      const trueLabel = document.createElement('label');
      trueLabel.innerHTML = `<input type="radio" name="q${index}bool" value="true"> True`;
      const falseLabel = document.createElement('label');
      falseLabel.innerHTML = `<input type="radio" name="q${index}bool" value="false"> False`;
      container.appendChild(trueLabel);
      container.appendChild(falseLabel);
    } else if (type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type answer';
      input.name = `q${index}answer`;
      input.className = 'text-small';
      container.appendChild(input);
    }
  }
});
