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
});
