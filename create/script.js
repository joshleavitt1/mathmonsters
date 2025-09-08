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
        deleteBtn.innerHTML = `<img src="../images/delete.svg" alt="Delete">`;
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
      const options = container.querySelectorAll('input');
      options.forEach((input, i) => {
        input.name = `q${index}option${i + 1}`;
      });
    } else if (type === 'boolean') {
      const radios = container.querySelectorAll('input');
      radios.forEach(radio => {
        radio.name = `q${index}bool`;
      });
    } else if (type === 'text') {
      const answer = container.querySelector('input');
      if (answer) {
        answer.name = `q${index}answer`;
      }
    }
  }
});
