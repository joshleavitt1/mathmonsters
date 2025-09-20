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
  if (!questionBox) {
    return;
  }

  const choicesContainer = questionBox.querySelector('.choices');
  const button = questionBox.querySelector('button');

  if (!choicesContainer || !button) {
    return;
  }

  const assetBase = getAssetBasePath();
  const trimmedBase = assetBase.endsWith('/')
    ? assetBase.slice(0, -1)
    : assetBase;

  const setSubmitDisabled = (isDisabled) => {
    button.disabled = isDisabled;
    button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
  };

  const clearChoiceSelections = () => {
    choicesContainer
      .querySelectorAll('.choice')
      .forEach((choice) => {
        choice.classList.remove('selected', 'correct-choice', 'wrong-choice');
        choice.setAttribute('aria-checked', 'false');
      });
  };

  const activateChoice = (choice) => {
    if (!choice || !choice.classList) {
      return;
    }

    clearChoiceSelections();
    choice.classList.add('selected');
    choice.setAttribute('aria-checked', 'true');
    if (typeof choice.focus === 'function') {
      try {
        choice.focus({ preventScroll: true });
      } catch (error) {
        choice.focus();
      }
    }
    setSubmitDisabled(false);
  };

  const findChoiceFromEvent = (event) => {
    const target = event?.target;
    if (!(target instanceof Element)) {
      return null;
    }
    return target.closest('.choice');
  };

  const handleChoiceActivation = (event) => {
    const choice = findChoiceFromEvent(event);
    if (!choice) {
      return;
    }

    if (typeof event?.preventDefault === 'function') {
      event.preventDefault();
    }
    if (typeof event?.stopPropagation === 'function') {
      event.stopPropagation();
    }

    activateChoice(choice);
  };

  const pointerEventsSupported =
    typeof window !== 'undefined' && 'PointerEvent' in window;

  if (pointerEventsSupported) {
    choicesContainer.addEventListener('pointerup', handleChoiceActivation);
  }

  choicesContainer.addEventListener('click', (event) => {
    if (pointerEventsSupported && event.detail !== 0) {
      return;
    }
    handleChoiceActivation(event);
  });

  choicesContainer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    handleChoiceActivation(event);
  });

  setSubmitDisabled(true);

  button.addEventListener('click', () => {
    const choice = choicesContainer.querySelector('.choice.selected');
    if (!choice) {
      return;
    }

    setSubmitDisabled(true);
    const isCorrect = choice.dataset.correct === 'true';

    clearChoiceSelections();
    choice.setAttribute('aria-checked', 'true');

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
    const handleFade = (e) => {
      if (e.propertyName !== 'opacity') {
        return;
      }
      questionBox.removeEventListener('transitionend', handleFade);
      button.classList.remove('result', 'correct', 'incorrect');
      button.textContent = 'Submit';
      clearChoiceSelections();
      setSubmitDisabled(true);
    };

    questionBox.addEventListener('transitionend', handleFade);
    questionBox.classList.remove('show');
  }

  document.addEventListener('close-question', closeQuestion);

  document.addEventListener('question-opened', () => {
    button.classList.remove('result', 'correct', 'incorrect');
    button.textContent = 'Submit';
    clearChoiceSelections();
    setSubmitDisabled(true);
  });
});
