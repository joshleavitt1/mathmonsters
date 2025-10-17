const resolveAssetPath = (path) => {
  if (typeof path !== 'string') {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('../') || trimmed.startsWith('./')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  const globalBase =
    typeof window !== 'undefined' &&
    typeof window.mathMonstersAssetBase === 'string'
      ? window.mathMonstersAssetBase.trim()
      : '';
  const base = globalBase || '..';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = trimmed.replace(/^\/+/, '');

  if (!normalizedBase || normalizedBase === '.') {
    return normalizedPath;
  }

  return `${normalizedBase}/${normalizedPath}`;
};

document.addEventListener('DOMContentLoaded', () => {
  const questionBox = document.getElementById('question');
  if (!questionBox) {
    return;
  }

  const choicesContainer = questionBox.querySelector('.choices');
  const questionCard = questionBox.querySelector('.card');
  const button = questionBox.querySelector('button');
  const submitReadyClass = 'question-submit--ready';
  const meter = questionBox.querySelector('[data-meter]');
  const meterHeading = meter?.querySelector('[data-meter-heading]');
  const meterProgress = meter?.querySelector('[data-meter-progress]');
  const meterFill = meterProgress?.querySelector('.progress__fill');
  const meterIcon = meter?.querySelector('[data-meter-icon]');
  const QUESTION_OVERLAY_CLASS = 'question--with-overlay';

  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : {};

  const requestFrame =
    typeof globalScope.requestAnimationFrame === 'function'
      ? globalScope.requestAnimationFrame.bind(globalScope)
      : typeof setTimeout === 'function'
      ? (callback) => setTimeout(callback, 16)
      : () => {};
  const cancelFrame =
    typeof globalScope.cancelAnimationFrame === 'function'
      ? globalScope.cancelAnimationFrame.bind(globalScope)
      : typeof clearTimeout === 'function'
      ? (id) => clearTimeout(id)
      : () => {};
  let pendingMeterFrame = null;
  let pendingMeterFillFrame = null;
  const isSuperAttackHidden = true;
  let isMeterDisabled = isSuperAttackHidden;

  if (!choicesContainer || !button) {
    return;
  }

  if (meterIcon) {
    const meterIconPath = resolveAssetPath('images/complete/gem.png');
    if (meterIconPath) {
      meterIcon.src = meterIconPath;
    }
  }

  const getButtonIconPath = (iconType) =>
    resolveAssetPath(`images/questions/${iconType}.svg`);

  let submitLocked = false;

  const setSubmitDisabled = (isDisabled) => {
    submitLocked = false;
    button.classList.remove('button--locked');
    button.disabled = isDisabled;
    if (typeof button.toggleAttribute === 'function') {
      button.toggleAttribute('disabled', isDisabled);
    } else if (isDisabled) {
      button.setAttribute('disabled', '');
    } else {
      button.removeAttribute('disabled');
    }
    button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    button.classList.toggle(submitReadyClass, !isDisabled);
  };

  const lockSubmit = () => {
    submitLocked = true;
    button.classList.add('button--locked');
    button.classList.remove(submitReadyClass);
    button.disabled = false;
    if (typeof button.toggleAttribute === 'function') {
      button.toggleAttribute('disabled', false);
    } else {
      button.removeAttribute('disabled');
    }
    button.setAttribute('aria-disabled', 'true');
  };

  const resetMeterAnimation = () => {
    if (pendingMeterFrame !== null) {
      cancelFrame(pendingMeterFrame);
      pendingMeterFrame = null;
    }
    if (pendingMeterFillFrame !== null) {
      cancelFrame(pendingMeterFillFrame);
      pendingMeterFillFrame = null;
    }
  };

  const syncMeterDisabledAttribute = () => {
    if (!meter) {
      return;
    }

    if (isMeterDisabled) {
      meter.setAttribute('hidden', 'hidden');
    } else {
      meter.removeAttribute('hidden');
    }
  };

  const hideMeter = () => {
    if (!meter) {
      return;
    }

    meter.classList.remove('meter--visible', 'meter--pop');
    meter.setAttribute('aria-hidden', 'true');

    if (meterProgress) {
      meterProgress.setAttribute('aria-valuemax', '0');
      meterProgress.setAttribute('aria-valuenow', '0');
      meterProgress.setAttribute('aria-valuetext', '0 of 0');
    }

    if (meterHeading) {
      meterHeading.textContent = '';
    }

    if (meterFill) {
      resetMeterAnimation();
      meterFill.style.transition = '';
      meterFill.style.width = '0%';
    }

    syncMeterDisabledAttribute();
  };

  const showMeter = () => {
    if (!meter) {
      return;
    }

    if (isMeterDisabled) {
      syncMeterDisabledAttribute();
      return;
    }

    meter.classList.add('meter--visible');
    meter.setAttribute('aria-hidden', 'false');
    meter.classList.remove('meter--pop');
    void meter.offsetWidth;
    meter.classList.add('meter--pop');
  };

  if (meter) {
    meter.addEventListener('animationend', (event) => {
      if (event.animationName === 'meter-pop') {
        meter.classList.remove('meter--pop');
      }
    });
  }

  const clearChoiceSelections = () => {
    choicesContainer
      .querySelectorAll('.choice')
      .forEach((choice) => {
        choice.classList.remove('selected', 'correct-choice', 'wrong-choice');
      });
  };

  const activateChoice = (choice) => {
    if (!choice || !choice.classList) {
      return;
    }

    clearChoiceSelections();
    choice.classList.add('selected');
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

    if (choice.classList.contains('selected')) {
      clearChoiceSelections();
      setSubmitDisabled(true);
      return;
    }

    activateChoice(choice);
  };

  const pointerEventsSupported =
    typeof window !== 'undefined' && 'PointerEvent' in window;

  if (pointerEventsSupported) {
    choicesContainer.addEventListener('pointerup', (event) => {
      if (typeof event?.button === 'number' && event.button > 0) {
        return;
      }
      handleChoiceActivation(event);
    });
  }

  choicesContainer.addEventListener('click', (event) => {
    if (pointerEventsSupported && event.detail !== 0) {
      return;
    }
    handleChoiceActivation(event);
  });

  setSubmitDisabled(true);

  button.addEventListener('click', () => {
    if (submitLocked) {
      return;
    }

    const choice = choicesContainer.querySelector('.choice.selected');
    if (!choice) {
      return;
    }

    lockSubmit();
    const isCorrect = choice.dataset.correct === 'true';

    clearChoiceSelections();
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
    const iconPath = getButtonIconPath(iconType);
    if (iconPath) {
      button.innerHTML =
        `<img src="${iconPath}" alt="${
          isCorrect ? 'Correct' : 'Incorrect'
        } icon" /> ` + (isCorrect ? 'Correct' : 'Incorrect');
    } else {
      button.textContent = isCorrect ? 'Correct' : 'Incorrect';
    }

    document.dispatchEvent(
      new CustomEvent('answer-submitted', { detail: { correct: isCorrect } })
    );
  });

  const isQuestionContainerActive = () =>
    Boolean(questionBox) &&
    questionBox.classList.contains('show') &&
    !questionBox.classList.contains('closing');

  const isQuestionOverlayActive = () =>
    isQuestionContainerActive() &&
    questionBox.classList.contains(QUESTION_OVERLAY_CLASS);

  const enableQuestionOverlay = () => {
    if (!questionBox) {
      return;
    }

    questionBox.classList.add(QUESTION_OVERLAY_CLASS);
  };

  const disableQuestionOverlay = () => {
    if (!questionBox) {
      return;
    }

    questionBox.classList.remove(QUESTION_OVERLAY_CLASS);
  };

  const setQuestionCardHidden = (hidden) => {
    if (!questionCard) {
      return;
    }

    questionCard.classList.toggle('card--hidden', hidden);
    questionCard.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  };

  const showQuestionCardWithPop = () => {
    if (!questionCard) {
      return;
    }

    questionCard.classList.remove('card--closing');
    questionCard.classList.remove('card--pop');
    void questionCard.offsetWidth;
    questionCard.classList.add('card--pop');
  };

  const revealQuestionCard = () => {
    if (!isQuestionContainerActive()) {
      return;
    }

    enableQuestionOverlay();

    if (!isQuestionOverlayActive()) {
      return;
    }

    setQuestionCardHidden(false);
    showQuestionCardWithPop();
  };

  function closeQuestion() {
    let overlayFadeStarted = false;
    let handleCardAnimationEnd = null;

    const finalizeClose = () => {
      if (questionBox) {
        questionBox.classList.remove('closing');
        questionBox.classList.remove('show');
        questionBox.classList.remove(QUESTION_OVERLAY_CLASS);
      }
      if (questionCard) {
        questionCard.classList.remove('card--closing');
      }
      button.classList.remove('result', 'correct', 'incorrect');
      button.textContent = 'Submit';
      clearChoiceSelections();
      setSubmitDisabled(true);
      hideMeter();
      setQuestionCardHidden(false);
    };

    const cleanupCardListeners = () => {
      if (!questionCard || !handleCardAnimationEnd) {
        return;
      }
      questionCard.removeEventListener('animationend', handleCardAnimationEnd);
      questionCard.removeEventListener('animationcancel', handleCardAnimationEnd);
      handleCardAnimationEnd = null;
    };

    const startOverlayFade = () => {
      if (overlayFadeStarted) {
        return;
      }
      overlayFadeStarted = true;

      cleanupCardListeners();

      if (!questionBox) {
        finalizeClose();
        return;
      }

      if (!questionBox.classList.contains('show')) {
        finalizeClose();
        return;
      }

      const handleFade = (event) => {
        if (event.target !== questionBox || event.propertyName !== 'opacity') {
          return;
        }
        questionBox.removeEventListener('transitionend', handleFade);
        finalizeClose();
      };

      questionBox.addEventListener('transitionend', handleFade);
      questionBox.classList.remove('show');
    };

    if (questionBox) {
      questionBox.classList.add('closing');
    }

    if (questionCard) {
      questionCard.classList.remove('card--pop');
      questionCard.classList.add('card--closing');
      handleCardAnimationEnd = () => {
        startOverlayFade();
      };
      questionCard.addEventListener('animationend', handleCardAnimationEnd);
      questionCard.addEventListener('animationcancel', handleCardAnimationEnd);
      return;
    }

    startOverlayFade();
  }

  document.addEventListener('close-question', closeQuestion);

  document.addEventListener('question-opened', (event) => {
    const levelDetail = Number(event?.detail?.currentLevel);
    const superAttackEnabled =
      !isSuperAttackHidden && Number.isFinite(levelDetail) && levelDetail >= 5;
    isMeterDisabled = !superAttackEnabled;
    syncMeterDisabledAttribute();
    button.classList.remove('result', 'correct', 'incorrect');
    button.textContent = 'Submit';
    clearChoiceSelections();
    setSubmitDisabled(true);
    hideMeter();
    if (questionBox) {
      questionBox.classList.remove('closing');
    }

    disableQuestionOverlay();
    setQuestionCardHidden(false);
    revealQuestionCard();
  });

  document.addEventListener('streak-meter-update', (event) => {
    if (isSuperAttackHidden) {
      hideMeter();
      return;
    }

    if (!meter || !meterProgress || !meterFill) {
      return;
    }

    const detail = event?.detail ?? {};
    resetMeterAnimation();
    if (isMeterDisabled) {
      hideMeter();
      return;
    }
    if (!detail.correct) {
      hideMeter();
      return;
    }

    const rawGoal = Number(detail.streakGoal);
    const rawStreak = Number(detail.streak);

    if (!Number.isFinite(rawGoal) || rawGoal <= 0) {
      hideMeter();
      return;
    }

    const goal = Math.max(1, Math.round(rawGoal));
    const streak = Math.max(0, Math.min(Math.round(rawStreak), goal));
    const percent = Math.min(1, streak / goal) * 100;

    meterProgress.setAttribute('aria-valuemax', `${goal}`);
    meterProgress.setAttribute('aria-valuenow', `${streak}`);
    meterProgress.setAttribute('aria-valuetext', `${streak} of ${goal}`);

    if (meterHeading) {
      meterHeading.textContent = 'Super Attack';
    }

    meterFill.style.transition = 'none';
    meterFill.style.width = '0%';
    showMeter();
    pendingMeterFrame = requestFrame(() => {
      meterFill.style.transition = '';
      pendingMeterFrame = null;
      pendingMeterFillFrame = requestFrame(() => {
        meterFill.style.width = `${percent}%`;
        pendingMeterFillFrame = null;
      });
    });
  });

  hideMeter();
});
