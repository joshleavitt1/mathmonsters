document.addEventListener('DOMContentLoaded', () => {
  const addQuestionBtn = document.getElementById('add-question');
  const questionsContainer = document.getElementById('questions-container');
  let questionCount = 1;

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

  function createQuestionBlock(index) {
    const section = document.createElement('section');
    section.className = 'question-block subcard';
    section.dataset.index = index;
    section.innerHTML = `
      <h2 class="text-large">Question ${index}</h2>
      <input type="text" name="question${index}" class="text-small" placeholder="Enter Question" />
      <select name="type${index}" class="question-type text-small">
        <option value="" disabled selected>Select Category</option>
        <option value="multiple">Multiple Choice</option>
        <option value="boolean">True or False</option>
        <option value="text">Type Answer</option>
      </select>
      <div class="answer-fields"></div>
    `;
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
