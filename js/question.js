const getAssetBasePath = () => {
  const fallback = '/mathmonsters';
  const globalBase =
    typeof window.mathMonstersAssetBase === 'string'
      ? window.mathMonstersAssetBase.trim()
      : '';
  if (globalBase) {
    return globalBase;
  }
  return fallback;
};

document.addEventListener('DOMContentLoaded', () => {
  const questionBox = document.getElementById('question');
  const choicesContainer = questionBox.querySelector('.choices');
  const button = questionBox.querySelector('button');
  const assetBase = getAssetBasePath();
  const trimmedBase = assetBase.endsWith('/')
    ? assetBase.slice(0, -1)
    : assetBase;

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

    Array.from(choicesContainer.children).forEach((c) =>
      c.classList.remove('selected')
    );
    if (isCorrect) {
      choice.classList.add('correct-choice');
    } else {
      const correctChoices = choicesContainer.querySelectorAll(
        '.choice[data-correct="true"]'
      );
      correctChoices.forEach((c) => c.classList.add('correct-choice'));
      choice.classList.add('wrong-choice');
    }

    button.classList.add('result', isCorrect ? 'correct' : 'incorrect');
    const iconType = isCorrect ? 'correct' : 'incorrect';
    const iconPath = `${trimmedBase}/images/questions/button/${iconType}.svg`;
    button.innerHTML =
      `<img src="${iconPath}" alt="${isCorrect ? 'Correct' : 'Incorrect'} icon" /> ` +
      (isCorrect ? 'Correct' : 'Incorrect');

    document.dispatchEvent(
      new CustomEvent('answer-submitted', { detail: { correct: isCorrect } })
    );

  });

  function closeQuestion() {
    function handleFade(e) {
      if (e.propertyName === 'opacity') {
        questionBox.removeEventListener('transitionend', handleFade);
        button.classList.remove('result', 'correct', 'incorrect');
        button.textContent = 'Submit';
        Array.from(choicesContainer.children).forEach((c) =>
          c.classList.remove('selected', 'correct-choice', 'wrong-choice')
        );
      }
    }
    questionBox.addEventListener('transitionend', handleFade);
    questionBox.classList.remove('show');
  }

  document.addEventListener('close-question', closeQuestion);
});
