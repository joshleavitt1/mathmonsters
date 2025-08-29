document.addEventListener('DOMContentLoaded', () => {
  const questionBox = document.getElementById('question');
  const choicesContainer = questionBox.querySelector('.choices');
  const button = questionBox.querySelector('button');

  button.disabled = true;

  choicesContainer.addEventListener('click', (e) => {
    const choice = e.target.closest('.choice');
    if (!choice) return;

    Array.from(choicesContainer.children).forEach((c) => c.classList.remove('selected'));
    choice.classList.add('selected');
    button.disabled = false;
  });

  button.addEventListener('click', () => {
    const choice = choicesContainer.querySelector('.choice.selected');
    if (!choice) return;

    button.disabled = true;
    const isCorrect = choice.dataset.correct === 'true';

    button.classList.add('result', isCorrect ? 'correct' : 'incorrect');
    button.innerHTML = isCorrect
      ? '<img src="images/questions/button/correct.svg" alt="Correct icon" /> Correct'
      : '<img src="images/questions/button/incorrect.svg" alt="Incorrect icon" /> Incorrect';

    setTimeout(() => {
      function handleSlide(e) {
        if (e.propertyName === 'transform') {
          questionBox.removeEventListener('transitionend', handleSlide);
          button.classList.remove('result', 'correct', 'incorrect');
          button.textContent = 'Answer';
          Array.from(choicesContainer.children).forEach((c) => c.classList.remove('selected'));
          document.dispatchEvent(
            new CustomEvent('answer-submitted', { detail: { correct: isCorrect } })
          );
        }
      }
      questionBox.addEventListener('transitionend', handleSlide);
      questionBox.classList.remove('show');
    }, 1000);
  });
});
