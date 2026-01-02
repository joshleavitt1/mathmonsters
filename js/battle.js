(() => {
  const simpleState = window.mathMonstersSimpleState;

  if (!simpleState) {
    console.warn('Simple state is unavailable.');
    return;
  }

  const getSnapshot = () => {
    try {
      const raw = sessionStorage?.getItem('mathmonstersNextBattleSnapshot');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Unable to read battle snapshot.', error);
      return null;
    }
  };

  const resolveSpritePath = (path) => {
    if (typeof path !== 'string' || !path.trim()) {
      return '';
    }
    const trimmed = path.trim();
    if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('/')) {
      return trimmed;
    }
    if (trimmed.startsWith('../')) {
      return trimmed;
    }
    return `../${trimmed.replace(/^\/+/, '')}`;
  };

  const elements = {
    heroName: document.querySelector('[data-hero-name]'),
    heroLevel: document.querySelector('[data-hero-level]'),
    heroSprite: document.querySelector('[data-hero-sprite]'),
    monsterSprite: document.querySelector('[data-monster-sprite]'),
    heroHealthBar: document.querySelector('.battle__health-fill--hero'),
    monsterHealthBar: document.querySelector('.battle__health-fill--monster'),
    heroHealthContainer: document.querySelector('.battle__entity:not(.battle__entity--monster) .battle__health'),
    monsterHealthContainer: document.querySelector('.battle__entity--monster .battle__health'),
    xpPill: document.querySelector('[data-battle-xp]'),
    difficultyPill: document.querySelector('[data-battle-difficulty]'),
    xpProgress: document.querySelector('.battle__progress'),
    xpFill: document.querySelector('.battle__progress-fill'),
    questionText: document.querySelector('[data-question-text]'),
    questionChoices: document.querySelector('[data-question-choices]'),
    feedback: document.querySelector('[data-question-feedback]'),
    nextBattleButton: document.querySelector('[data-next-battle]'),
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const animateProgress = (element, start, end, duration = 600) =>
    new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      const startTime = performance.now();

      const tick = (now) => {
        const progress = clamp((now - startTime) / duration, 0, 1);
        const value = start + (end - start) * progress;
        element.style.setProperty('--progress-value', value);
        if (progress < 1) {
          requestAnimationFrame(tick);
          return;
        }
        resolve();
      };

      requestAnimationFrame(tick);
    });

  const updateXpDisplay = (state, animateFrom) => {
    const xpProgress = simpleState.getXpProgress(state);
    if (elements.heroLevel) {
      elements.heroLevel.textContent = `Level ${xpProgress.level}`;
    }
    if (elements.xpPill) {
      elements.xpPill.textContent = `XP ${xpProgress.xpIntoLevel} / ${xpProgress.xpForLevel}`;
    }
    if (elements.xpProgress) {
      elements.xpProgress.setAttribute('aria-valuenow', String(xpProgress.xpIntoLevel));
    }
    if (elements.xpFill) {
      const startValue = typeof animateFrom === 'number' ? animateFrom : xpProgress.ratio;
      animateProgress(elements.xpFill, startValue, xpProgress.ratio);
    }
    return xpProgress;
  };

  const updateHealthBar = (bar, container, health, damage) => {
    if (!bar || !container) return;
    const remaining = clamp(health - damage, 0, health);
    const ratio = health > 0 ? remaining / health : 0;
    bar.style.setProperty('--progress-value', ratio);
    container.setAttribute('aria-valuenow', String(remaining));
    container.setAttribute('aria-valuemax', String(health));
  };

  const renderEntities = (state) => {
    if (elements.heroName) {
      elements.heroName.textContent = state.hero?.name || 'Shellfin';
    }
    const snapshot = getSnapshot();
    const heroSpriteSrc = resolveSpritePath(snapshot?.hero?.sprite || state.hero?.sprite);
    const monsterSpriteSrc = resolveSpritePath(snapshot?.monster?.sprite || state.monster?.sprite);
    if (elements.heroSprite && heroSpriteSrc) {
      elements.heroSprite.src = heroSpriteSrc;
    }
    if (elements.monsterSprite && monsterSpriteSrc) {
      elements.monsterSprite.src = monsterSpriteSrc;
    }
    if (elements.difficultyPill) {
      elements.difficultyPill.textContent = `Difficulty ${state.difficulty}`;
    }

    updateHealthBar(
      elements.heroHealthBar,
      elements.heroHealthContainer,
      state.hero.health,
      state.hero.damage
    );
    updateHealthBar(
      elements.monsterHealthBar,
      elements.monsterHealthContainer,
      state.monster.health,
      state.monster.damage
    );
  };

  const pickRange = (difficulty) => {
    const clamped = clamp(Number(difficulty) || 1, 1, 10);
    return 5 + clamped * 3;
  };

  const createQuestion = (difficulty) => {
    const max = pickRange(difficulty);
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    const answer = a + b;
    const choices = new Set([answer]);

    while (choices.size < 4) {
      const delta = Math.floor(Math.random() * 4) + 1;
      const sign = Math.random() > 0.5 ? 1 : -1;
      const option = clamp(answer + delta * sign, 1, answer + max);
      choices.add(option);
    }

    return {
      prompt: `What is ${a} + ${b}?`,
      answer,
      choices: Array.from(choices).sort(() => Math.random() - 0.5),
    };
  };

  const renderQuestion = (question, onAnswer) => {
    if (elements.questionText) {
      elements.questionText.textContent = question.prompt;
    }
    if (elements.feedback) {
      elements.feedback.textContent = '';
    }
    if (!elements.questionChoices) {
      return;
    }
    elements.questionChoices.innerHTML = '';
    question.choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'battle__choice';
      button.textContent = choice;
      button.addEventListener('click', () => onAnswer(choice === question.answer));
      elements.questionChoices.appendChild(button);
    });
  };

  const endBattle = async (didWin, previousRatio) => {
    const xpEarned = didWin ? 2 : 0;
    const resultState = didWin ? simpleState.addExperience(xpEarned) : simpleState.getState();
    const xpProgress = simpleState.getXpProgress(resultState);

    if (didWin && resultState.leveledUp && typeof previousRatio === 'number' && elements.xpFill) {
      await animateProgress(elements.xpFill, previousRatio, 1);
      await animateProgress(elements.xpFill, 0, xpProgress.ratio);
    }

    renderEntities(resultState);
    const animateStart = didWin && resultState.leveledUp ? xpProgress.ratio : previousRatio;
    updateXpDisplay(resultState, animateStart);
    if (elements.feedback) {
      elements.feedback.textContent = didWin
        ? `Victory! +${xpEarned} XP earned.`
        : 'Defeat! Try again.';
      elements.feedback.style.color = didWin ? '#0ea631' : '#e20000';
    }
    if (elements.questionChoices) {
      Array.from(elements.questionChoices.querySelectorAll('button')).forEach((button) => {
        button.disabled = true;
      });
    }
    if (elements.nextBattleButton) {
      elements.nextBattleButton.hidden = false;
      elements.nextBattleButton.focus();
    }
  };

  const startBattle = () => {
    let currentState = simpleState.startNewBattle();
    renderEntities(currentState);
    updateXpDisplay(currentState);
    if (elements.feedback) {
      elements.feedback.textContent = '';
      elements.feedback.style.color = '#0062ff';
    }
    if (elements.nextBattleButton) {
      elements.nextBattleButton.hidden = true;
    }

    const askQuestion = () => {
      const question = createQuestion(currentState.difficulty);
      renderQuestion(question, (wasCorrect) => {
        currentState = simpleState.updateState((state) => {
          const hero = { ...state.hero };
          const monster = { ...state.monster };
          if (wasCorrect) {
            monster.damage = clamp(monster.damage + hero.attack, 0, monster.health);
          } else {
            hero.damage = clamp(hero.damage + monster.attack, 0, hero.health);
          }
          state.hero = hero;
          state.monster = monster;
          return state;
        });

        renderEntities(currentState);

        if (elements.feedback) {
          elements.feedback.textContent = wasCorrect
            ? 'Correct! Shellfin attacks!'
            : 'Wrong! Octomurk fights back!';
          elements.feedback.style.color = wasCorrect ? '#0ea631' : '#e20000';
        }

        const heroDefeated = currentState.hero.damage >= currentState.hero.health;
        const monsterDefeated = currentState.monster.damage >= currentState.monster.health;

        if (monsterDefeated || heroDefeated) {
          const previousRatio = simpleState.getXpProgress(currentState).ratio;
          endBattle(monsterDefeated, previousRatio);
          return;
        }

        setTimeout(askQuestion, 200);
      });
    };

    askQuestion();
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (elements.nextBattleButton) {
      elements.nextBattleButton.addEventListener('click', startBattle);
    }
    startBattle();
  });
})();
