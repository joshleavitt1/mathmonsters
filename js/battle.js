const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';
const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';

const readVisitedFlag = (storage, label) => {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(LANDING_VISITED_KEY) === VISITED_VALUE;
  } catch (error) {
    console.warn(`${label} storage is not available.`, error);
    return null;
  }
};

const setVisitedFlag = (storage, label) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(LANDING_VISITED_KEY, VISITED_VALUE);
  } catch (error) {
    console.warn(`${label} storage is not available.`, error);
  }
};

const hasVisitedLanding = () => {
  const sessionVisited = readVisitedFlag(sessionStorage, 'Session');
  if (sessionVisited === true) {
    return true;
  }
  if (sessionVisited === null) {
    return true;
  }

  const localVisited = readVisitedFlag(localStorage, 'Local');
  if (localVisited === true) {
    setVisitedFlag(sessionStorage, 'Session');
    return true;
  }
  if (localVisited === null) {
    return true;
  }

  return false;
};

const landingVisited = hasVisitedLanding();

const getAssetBasePath = () => {
  const fallback = '/mathmonsters';
  const globalBase =
    typeof window.mathMonstersAssetBase === 'string'
      ? window.mathMonstersAssetBase.trim()
      : '';
  return globalBase || fallback;
};

const createAssetPathResolver = () => {
  const assetBase = getAssetBasePath();
  const trimmedBase = assetBase.endsWith('/')
    ? assetBase.slice(0, -1)
    : assetBase;

  return (inputPath) => {
    if (typeof inputPath !== 'string') {
      return trimmedBase;
    }

    let normalized = inputPath.trim();
    if (!normalized) {
      return trimmedBase;
    }

    if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) {
      return normalized;
    }

    while (normalized.startsWith('./')) {
      normalized = normalized.slice(2);
    }

    while (normalized.startsWith('../')) {
      normalized = normalized.slice(3);
    }

    normalized = normalized.replace(/^\/+/, '');

    return normalized ? `${trimmedBase}/${normalized}` : trimmedBase;
  };
};

if (!landingVisited) {
  window.location.replace('../index.html');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!landingVisited) {
    return;
  }
  const resolveAssetPath = createAssetPathResolver();
  const monsterImg = document.getElementById('battle-monster');
  const heroImg = document.getElementById('battle-shellfin');
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const monsterHpFill = document.querySelector('#monster-stats .hp-fill');
  const heroHpFill = document.querySelector('#shellfin-stats .hp-fill');
  const monsterNameEl = document.querySelector('#monster-stats .name');
  const heroNameEl = document.querySelector('#shellfin-stats .name');
  const monsterStats = document.getElementById('monster-stats');
  const heroStats = document.getElementById('shellfin-stats');

  const questionBox = document.getElementById('question');
  const questionText = questionBox.querySelector('.question-text');
  const choicesEl = questionBox.querySelector('.choices');
  const topBar = questionBox.querySelector('.top-bar');
  const progressBar = questionBox.querySelector('.progress-bar');
  const progressFill = questionBox.querySelector('.progress-fill');
  const streakLabel = questionBox.querySelector('.streak-label');
  const streakIcon = questionBox.querySelector('.streak-icon');
  const bannerAccuracyValue = document.querySelector('[data-banner-accuracy]');
  const bannerTimeValue = document.querySelector('[data-banner-time]');
  const setStreakButton = document.querySelector('[data-dev-set-streak]');
  const endBattleButton = document.querySelector('[data-dev-end-battle]');
  const resetLevelButton = document.querySelector('[data-dev-reset-level]');
  const logOutButton = document.querySelector('[data-dev-log-out]');
  const devControls = document.querySelector('.battle-dev-controls');
  const heroAttackVal = heroStats.querySelector('.attack .value');
  const heroHealthVal = heroStats.querySelector('.health .value');
  const heroAttackInc = heroStats.querySelector('.attack .increase');
  const heroHealthInc = heroStats.querySelector('.health .increase');
  const monsterAttackVal = monsterStats.querySelector('.attack .value');
  const monsterHealthVal = monsterStats.querySelector('.health .value');

  const completeMessage = document.getElementById('complete-message');
  const battleCompleteTitle = completeMessage?.querySelector('#battle-complete-title');
  const completeEnemyImg = completeMessage?.querySelector('.enemy-image');
  const summaryAccuracyStat = completeMessage?.querySelector('[data-goal="accuracy"]');
  const summaryTimeStat = completeMessage?.querySelector('[data-goal="time"]');
  const summaryAccuracyValue = summaryAccuracyStat?.querySelector('.summary-accuracy');
  const summaryTimeValue = summaryTimeStat?.querySelector('.summary-time');
  const nextMissionBtn = completeMessage?.querySelector('.next-mission-btn');

  const summaryAccuracyText = ensureStatValueText(summaryAccuracyValue);
  const summaryTimeText = ensureStatValueText(summaryTimeValue);

  if (bannerAccuracyValue) bannerAccuracyValue.textContent = '100%';
  if (bannerTimeValue) bannerTimeValue.textContent = '0s';
  if (summaryAccuracyText) summaryAccuracyText.textContent = '100%';
  if (summaryTimeText) summaryTimeText.textContent = '0s';

  const MIN_STREAK_GOAL = 1;
  const MAX_STREAK_GOAL = 5;
  let STREAK_GOAL = MAX_STREAK_GOAL;
  let questions = [];
  let currentQuestion = 0;
  let streak = 0;
  let streakMaxed = false;
  let streakIconShown = false;
  let correctAnswers = 0;
  let totalAnswers = 0;
  let wrongAnswers = 0;
  let accuracyGoal = null;
  let timeGoalSeconds = 0;
  let timeRemaining = 0;
  let initialTimeRemaining = 0;
  let battleTimerDeadline = null;
  let battleTimerInterval = null;
  let battleEnded = false;
  let currentBattleLevel = null;
  let battleStartTime = null;
  let battleLevelAdvanced = false;
  let battleGoalsMet = false;

  const hero = { attack: 1, health: 5, gems: 0, damage: 0, name: 'Hero' };
  const monster = { attack: 1, health: 5, damage: 0, name: 'Monster' };

  const markBattleReady = (img) => {
    if (!img) {
      return;
    }
    img.classList.remove('slide-in');
    img.classList.add('battle-ready');
  };

  if (prefersReducedMotion) {
    markBattleReady(heroImg);
    markBattleReady(monsterImg);
  } else {
    if (heroImg) {
      heroImg.classList.add('slide-in');
      heroImg.addEventListener('animationend', () => markBattleReady(heroImg), {
        once: true,
      });
      window.setTimeout(() => markBattleReady(heroImg), 1400);
    }

    if (monsterImg) {
      monsterImg.classList.add('slide-in');
      monsterImg.addEventListener('animationend', () => markBattleReady(monsterImg), {
        once: true,
      });
      window.setTimeout(() => markBattleReady(monsterImg), 1400);
    }
  }

  window.requestAnimationFrame(() => {
    heroStats?.classList.add('show');
    monsterStats?.classList.add('show');
  });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function ensureStatValueText(valueEl) {
    if (!valueEl) {
      return null;
    }
    const existing = valueEl.querySelector('.stat-value-text');
    if (existing) {
      return existing;
    }
    const span = document.createElement('span');
    span.classList.add('stat-value-text');
    const initialText = valueEl.textContent ? valueEl.textContent.trim() : '';
    span.textContent = initialText;
    valueEl.textContent = '';
    valueEl.appendChild(span);
    return span;
  }

  function applyGoalResult(valueEl, textSpan, text, met) {
    if (!valueEl || !textSpan) {
      return;
    }
    textSpan.textContent = text;
    let icon = valueEl.querySelector('.goal-result-icon');
    if (!icon) {
      icon = document.createElement('img');
      icon.classList.add('goal-result-icon');
      valueEl.insertBefore(icon, textSpan);
    }
    const iconPath = met
      ? 'images/complete/correct.svg'
      : 'images/complete/incorrect.svg';
    icon.src = resolveAssetPath(iconPath);
    icon.alt = met ? 'Goal met' : 'Goal not met';
    valueEl.classList.remove('goal-result--met', 'goal-result--missed');
    valueEl.classList.add(met ? 'goal-result--met' : 'goal-result--missed');
  }

  function setBattleCompleteTitleLines(...lines) {
    if (!battleCompleteTitle) {
      return;
    }

    const filteredLines = lines
      .map((line) => (typeof line === 'string' ? line.trim() : ''))
      .filter((line) => line.length > 0);

    battleCompleteTitle.replaceChildren();

    if (!filteredLines.length) {
      return;
    }

    filteredLines.forEach((line, index) => {
      battleCompleteTitle.appendChild(document.createTextNode(line));
      if (index < filteredLines.length - 1) {
        battleCompleteTitle.appendChild(document.createElement('br'));
      }
    });
  }

  function persistProgress(update) {
    if (!update || typeof update !== 'object') {
      return;
    }

    if (window.preloadedData?.variables) {
      const existingProgress =
        typeof window.preloadedData.variables.progress === 'object' &&
        window.preloadedData.variables.progress !== null
          ? window.preloadedData.variables.progress
          : {};
      window.preloadedData.variables.progress = {
        ...existingProgress,
        ...update,
      };
    }

    try {
      const storage = window.localStorage;
      if (!storage) {
        return;
      }
      const raw = storage.getItem(PROGRESS_STORAGE_KEY);
      let storedProgress = {};
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            storedProgress = parsed;
          }
        } catch (error) {
          storedProgress = {};
        }
      }
      const mergedProgress = { ...storedProgress, ...update };
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(mergedProgress));
    } catch (error) {
      console.warn('Unable to save progress.', error);
    }
  }

  function advanceBattleLevel() {
    if (battleLevelAdvanced) {
      return;
    }
    const baseLevel =
      typeof currentBattleLevel === 'number'
        ? currentBattleLevel
        : typeof window.preloadedData?.variables?.progress?.battleLevel === 'number'
        ? window.preloadedData.variables.progress.battleLevel
        : 0;
    const nextLevel = baseLevel + 1;
    persistProgress({ battleLevel: nextLevel });
    currentBattleLevel = nextLevel;
    battleLevelAdvanced = true;
  }

  function loadData() {
    const data = window.preloadedData ?? {};
    const battleData = data.battle ?? {};
    const heroData = data.hero ?? {};
    const enemyData = data.enemy ?? {};
    const progressData = data.variables?.progress ?? {};

    const resolveAssetPath = (path) => {
      if (typeof path !== 'string' || path.trim().length === 0) {
        return null;
      }
      const trimmed = path.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      if (trimmed.startsWith('../')) {
        return trimmed;
      }
      if (trimmed.startsWith('./')) {
        return `../${trimmed.slice(2)}`;
      }
      if (trimmed.startsWith('/')) {
        return `..${trimmed}`;
      }
      return `../${trimmed}`;
    };

    currentBattleLevel =
      typeof progressData.battleLevel === 'number'
        ? progressData.battleLevel
        : typeof data.level?.battleLevel === 'number'
        ? data.level.battleLevel
        : null;

    accuracyGoal =
      typeof battleData.accuracyGoal === 'number' &&
      Number.isFinite(battleData.accuracyGoal)
        ? battleData.accuracyGoal
        : null;

    const parsedTimeGoal = Number(battleData.timeGoalSeconds);
    timeGoalSeconds =
      Number.isFinite(parsedTimeGoal) && parsedTimeGoal > 0
        ? Math.floor(parsedTimeGoal)
        : 0;

    const storedTime = Number(progressData.timeRemainingSeconds);
    if (Number.isFinite(storedTime) && storedTime > 0) {
      timeRemaining = Math.floor(storedTime);
      if (timeGoalSeconds > 0) {
        timeRemaining = Math.min(timeRemaining, timeGoalSeconds);
      }
    } else {
      timeRemaining = timeGoalSeconds;
    }

    if (!Number.isFinite(timeRemaining) || timeRemaining < 0) {
      timeRemaining = 0;
    }

    initialTimeRemaining = Number.isFinite(timeRemaining) ? timeRemaining : 0;

    const resolvedStreakGoal = Number(battleData.streakGoal);
    if (Number.isFinite(resolvedStreakGoal)) {
      STREAK_GOAL = Math.min(
        Math.max(Math.round(resolvedStreakGoal), MIN_STREAK_GOAL),
        MAX_STREAK_GOAL
      );
    } else {
      STREAK_GOAL = Math.min(
        Math.max(Math.round(STREAK_GOAL), MIN_STREAK_GOAL),
        MAX_STREAK_GOAL
      );
    }

    hero.attack = Number(heroData.attack) || hero.attack;
    hero.health = Number(heroData.health) || hero.health;
    hero.damage = Number(heroData.damage) || hero.damage;
    hero.name = heroData.name || hero.name;
    if (typeof heroData.gems === 'number') {
      hero.gems = heroData.gems;
    }

    const heroSprite = resolveAssetPath(heroData.sprite);
    if (heroSprite && heroImg) {
      heroImg.src = heroSprite;
    }
    if (heroImg && hero.name) {
      heroImg.alt = `${hero.name} ready for battle`;
    }

    monster.attack = Number(enemyData.attack) || monster.attack;
    monster.health = Number(enemyData.health) || monster.health;
    monster.damage = Number(enemyData.damage) || monster.damage;
    monster.name = enemyData.name || monster.name;

    const monsterSprite = resolveAssetPath(enemyData.sprite);
    if (monsterSprite && monsterImg) {
      monsterImg.src = monsterSprite;
    }
    if (monsterImg && monster.name) {
      monsterImg.alt = `${monster.name} ready for battle`;
    }
    if (monsterSprite && completeEnemyImg) {
      completeEnemyImg.src = monsterSprite;
    }

    if (heroAttackVal) heroAttackVal.textContent = hero.attack;
    if (heroHealthVal) heroHealthVal.textContent = hero.health;
    if (monsterAttackVal) monsterAttackVal.textContent = monster.attack;
    if (monsterHealthVal) monsterHealthVal.textContent = monster.health;
    if (heroNameEl) heroNameEl.textContent = hero.name;
    if (monsterNameEl) monsterNameEl.textContent = monster.name;
    if (completeEnemyImg && monster.name) {
      completeEnemyImg.alt = `${monster.name} ready for battle`;
    }

    const loadedQuestions = Array.isArray(data.questions)
      ? data.questions.slice()
      : [];
    questions = shuffle(loadedQuestions);

    updateHealthBars();
    updateBattleTimeDisplay();
  }

  function updateHealthBars() {
    const heroPercent = ((hero.health - hero.damage) / hero.health) * 100;
    const monsterPercent = ((monster.health - monster.damage) / monster.health) * 100;
    heroHpFill.style.width = heroPercent + '%';
    monsterHpFill.style.width = monsterPercent + '%';
  }

  function waitForHealthDrain(fillEl) {
    return new Promise((resolve) => {
      if (!fillEl || typeof fillEl.addEventListener !== 'function') {
        resolve();
        return;
      }

      const widthIsEmpty = () => {
        const rectWidth = fillEl.getBoundingClientRect().width;
        if (!Number.isFinite(rectWidth)) {
          return true;
        }
        if (rectWidth <= 0.5) {
          return true;
        }
        const computedWidth = parseFloat(window.getComputedStyle(fillEl).width);
        return Number.isFinite(computedWidth) ? computedWidth <= 0.5 : false;
      };

      if (widthIsEmpty()) {
        resolve();
        return;
      }

      let resolved = false;
      const settle = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        fillEl.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      };

      const handleTransitionEnd = (event) => {
        if (event.propertyName === 'width' && widthIsEmpty()) {
          settle();
        }
      };

      fillEl.addEventListener('transitionend', handleTransitionEnd);

      const startTime = Date.now();
      const poll = () => {
        if (widthIsEmpty()) {
          settle();
          return;
        }
        if (Date.now() - startTime > 1200) {
          settle();
          return;
        }
        window.setTimeout(poll, 100);
      };

      window.setTimeout(poll, 100);
    });
  }

  function calculateAccuracy() {
    if (wrongAnswers === 0) {
      return 100;
    }
    return totalAnswers
      ? Math.max(0, Math.round((correctAnswers / totalAnswers) * 100))
      : 100;
  }

  function updateAccuracyDisplays() {
    const accuracy = calculateAccuracy();
    if (bannerAccuracyValue) bannerAccuracyValue.textContent = `${accuracy}%`;
    if (summaryAccuracyText) summaryAccuracyText.textContent = `${accuracy}%`;
  }

  function updateBattleTimeDisplay() {
    const timeValue = Number.isFinite(timeRemaining) ? Math.max(0, Math.floor(timeRemaining)) : 0;
    if (bannerTimeValue) bannerTimeValue.textContent = `${timeValue}s`;
    if (summaryTimeText) summaryTimeText.textContent = `${timeValue}s`;
  }

  function handleBattleTimerTick() {
    if (battleEnded) {
      stopBattleTimer();
      return;
    }
    if (!Number.isFinite(battleTimerDeadline)) {
      stopBattleTimer();
      return;
    }
    const now = Date.now();
    const secondsLeft = Math.max(0, Math.ceil((battleTimerDeadline - now) / 1000));
    if (secondsLeft !== timeRemaining) {
      timeRemaining = secondsLeft;
      updateBattleTimeDisplay();
    }
    if (secondsLeft <= 0) {
      endBattle(false, { reason: 'timeout' });
    }
  }

  function startBattleTimer() {
    stopBattleTimer();
    if (!battleStartTime) {
      battleStartTime = Date.now();
    }
    if (!Number.isFinite(timeRemaining) || timeRemaining <= 0) {
      timeRemaining = Math.max(0, Number.isFinite(timeRemaining) ? Math.floor(timeRemaining) : 0);
      updateBattleTimeDisplay();
      if (timeGoalSeconds > 0 && !battleEnded) {
        endBattle(false, { reason: 'timeout' });
      }
      return;
    }
    battleTimerDeadline = Date.now() + timeRemaining * 1000;
    updateBattleTimeDisplay();
    battleTimerInterval = window.setInterval(handleBattleTimerTick, 250);
  }

  function stopBattleTimer() {
    if (battleTimerInterval) {
      clearInterval(battleTimerInterval);
      battleTimerInterval = null;
    }
    battleTimerDeadline = null;
  }

  function showQuestion() {
    if (battleEnded) {
      return;
    }
    const q = questions[currentQuestion];
    if (!q) return;
    questionText.textContent = q.question || q.q || '';
    choicesEl.innerHTML = '';

    let choices = q.choices;
    if (!choices && q.options) {
      choices = q.options.map((opt) => ({ name: opt, correct: opt === q.answer }));
    }

    (choices || []).forEach((choice) => {
      const div = document.createElement('div');
      div.classList.add('choice');
      div.dataset.correct = !!choice.correct;
      if (choice.image) {
        const img = document.createElement('img');
        img.src = resolveAssetPath(`images/questions/${choice.image}`);
        img.alt = choice.name || '';
        div.appendChild(img);
      }
      const p = document.createElement('p');
      p.textContent = choice.name || '';
      div.appendChild(p);
      choicesEl.appendChild(div);
    });
    questionBox.classList.add('show');
    updateStreak();
  }

  function updateStreak() {
    const percent = Math.min(streak / STREAK_GOAL, 1) * 100;
    if (streak > 0) {
      topBar?.classList.add('show');
      progressBar.classList.add('with-label');
      void progressFill.offsetWidth;
      progressFill.style.width = percent + '%';
      if (streakMaxed) {
        progressFill.style.background = '#FF6A00';
        streakLabel.textContent = '2x Attack';
        streakLabel.style.color = '#FF6A00';
        streakLabel.classList.remove('show');
        void streakLabel.offsetWidth;
        streakLabel.classList.add('show');
        if (streakIcon && !streakIconShown) {
          progressFill.addEventListener(
            'transitionend',
            () => {
              streakIcon.classList.add('show');
            },
            { once: true }
          );
          streakIconShown = true;
        }
      } else {
        progressFill.style.background = '#006AFF';
        streakLabel.style.color = '#006AFF';
        streakLabel.textContent = `${streak} in a row`;
        streakLabel.classList.remove('show');
        void streakLabel.offsetWidth;
        streakLabel.classList.add('show');
        if (streakIcon) {
          streakIcon.classList.remove('show');
        }
        streakIconShown = false;
      }
    } else {
      topBar?.classList.remove('show');
      progressBar.classList.remove('with-label');
      progressFill.style.width = '0%';
      progressFill.style.background = '#006AFF';
      streakLabel.classList.remove('show');
      if (streakIcon) {
        streakIcon.classList.remove('show');
      }
      streakIconShown = false;
    }
  }

  function showIncrease(el, text) {
    if (!el) return;
    el.classList.remove('show');
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
    }, 2000);
  }

  function heroAttack() {
    if (battleEnded) {
      return;
    }
    heroImg.classList.add('attack');
    const handler = (e) => {
      if (e.animationName !== 'hero-attack') return;
      heroImg.classList.remove('attack');
      heroImg.removeEventListener('animationend', handler);
      setTimeout(() => {
        if (battleEnded) {
          return;
        }
        monster.damage += hero.attack;
        updateHealthBars();
        if (streakMaxed) {
          // Double-attack was used; reset streak.
          streak = 0;
          streakMaxed = false;
          updateStreak();
        }
        setTimeout(() => {
          if (battleEnded) {
            return;
          }
          if (monster.damage >= monster.health) {
            endBattle(true, { waitForHpDrain: monsterHpFill });
          } else {
            currentQuestion++;
            showQuestion();
          }
        }, 2000);
      }, 500);
    };
    heroImg.addEventListener('animationend', handler);
  }

  function monsterAttack() {
    if (battleEnded) {
      return;
    }
    setTimeout(() => {
      if (battleEnded) {
        return;
      }
      monsterImg.classList.add('attack');
      const handler = (e) => {
        if (e.animationName !== 'monster-attack') return;
        monsterImg.classList.remove('attack');
        monsterImg.removeEventListener('animationend', handler);
        setTimeout(() => {
          if (battleEnded) {
            return;
          }
          hero.damage += monster.attack;
          updateHealthBars();
          setTimeout(() => {
            if (battleEnded) {
              return;
            }
            if (hero.damage >= hero.health) {
              endBattle(false, { waitForHpDrain: heroHpFill });
            } else {
              currentQuestion++;
              showQuestion();
            }
          }, 2000);
        }, 500);
      };
      monsterImg.addEventListener('animationend', handler);
    }, 300);
  }

  setStreakButton?.addEventListener('click', () => {
    if (battleEnded) {
      return;
    }
    const targetStreak = Math.max(0, STREAK_GOAL - 1);
    streak = targetStreak;
    streakMaxed = false;
    updateStreak();
  });

  endBattleButton?.addEventListener('click', () => {
    if (battleEnded) {
      return;
    }
    document.dispatchEvent(new Event('close-question'));
    window.setTimeout(() => {
      endBattle(true);
    }, 0);
  });

  resetLevelButton?.addEventListener('click', () => {
    persistProgress({ battleLevel: 1 });
    currentBattleLevel = 1;
    battleLevelAdvanced = false;
    battleGoalsMet = false;
  });

  logOutButton?.addEventListener('click', async () => {
    const supabase = window.supabaseClient;

    if (supabase?.auth?.signOut) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Supabase sign out failed', error);
        }
      } catch (error) {
        console.warn('Unexpected error during sign out', error);
      }
    }

    window.location.replace('../signin.html');
  });

  document.addEventListener('answer-submitted', (e) => {
    if (battleEnded) {
      return;
    }
    const correct = e.detail.correct;
    totalAnswers++;
    if (correct) {
      correctAnswers++;
    } else {
      wrongAnswers++;
    }
    updateAccuracyDisplays();
    if (correct) {
      let incEl = null;
      let incText = '';
      if (!streakMaxed) {
        streak++;
        if (streak >= STREAK_GOAL) {
          streak = STREAK_GOAL;
          streakMaxed = true;
          hero.attack *= 2;
          if (heroAttackVal) heroAttackVal.textContent = hero.attack;
          incEl = heroAttackInc;
          incText = 'x2';
        } else {
          const stats = ['attack', 'health'];
          const stat = stats[Math.floor(Math.random() * stats.length)];
          if (stat === 'attack') {
            hero.attack++;
            if (heroAttackVal) heroAttackVal.textContent = hero.attack;
            incEl = heroAttackInc;
            incText = '+1';
          } else {
            hero.health++;
            if (heroHealthVal) heroHealthVal.textContent = hero.health;
            incEl = heroHealthInc;
            incText = '+1';
            updateHealthBars();
          }
        }
      } else {
        const stats = ['attack', 'health'];
        const stat = stats[Math.floor(Math.random() * stats.length)];
        if (stat === 'attack') {
          hero.attack++;
          if (heroAttackVal) heroAttackVal.textContent = hero.attack;
          incEl = heroAttackInc;
          incText = '+1';
        } else {
          hero.health++;
          if (heroHealthVal) heroHealthVal.textContent = hero.health;
          incEl = heroHealthInc;
          incText = '+1';
          updateHealthBars();
        }
      }

      updateStreak();

      // Keep the question visible briefly so the player can
      // see the result and streak progress before it closes.
      // If the streak just hit the goal (x2), linger a bit longer.
      const lingerTime = incText === 'x2' ? 3000 : 2000;
      setTimeout(() => {
        document.dispatchEvent(new Event('close-question'));
        setTimeout(() => {
          showIncrease(incEl, incText);
          setTimeout(heroAttack, 1000);
        }, 300);
      }, lingerTime);
    } else {
      streak = 0;
      streakMaxed = false;
      updateStreak();
      setTimeout(() => {
        document.dispatchEvent(new Event('close-question'));
        monsterAttack();
      }, 2000);
    }
  });
  function endBattle(win, _options = {}) {
    if (battleEnded) {
      return;
    }
    battleEnded = true;
    devControls?.classList.add('battle-dev-controls--hidden');
    document.dispatchEvent(new Event('close-question'));
    stopBattleTimer();
    updateAccuracyDisplays();
    updateBattleTimeDisplay();

    const accuracy = calculateAccuracy();
    const accuracyDisplay = `${accuracy}%`;
    const accuracyGoalMet =
      typeof accuracyGoal === 'number' ? accuracy / 100 >= accuracyGoal : true;

    const now = Date.now();
    const elapsedByTimer = initialTimeRemaining > 0
      ? Math.max(0, Math.round(initialTimeRemaining - timeRemaining))
      : 0;
    const elapsedByClock = battleStartTime
      ? Math.max(0, Math.round((now - battleStartTime) / 1000))
      : 0;
    const elapsedSeconds = initialTimeRemaining > 0
      ? Math.max(elapsedByTimer, elapsedByClock)
      : elapsedByClock;
    const timeDisplay = `${elapsedSeconds}s`;
    const timeGoalMet =
      timeGoalSeconds > 0 ? elapsedSeconds <= timeGoalSeconds : true;

    if (summaryAccuracyValue && summaryAccuracyText) {
      applyGoalResult(
        summaryAccuracyValue,
        summaryAccuracyText,
        accuracyDisplay,
        accuracyGoalMet
      );
    }

    if (summaryTimeValue && summaryTimeText) {
      applyGoalResult(
        summaryTimeValue,
        summaryTimeText,
        timeDisplay,
        timeGoalMet
      );
    }

    if (completeEnemyImg && monsterImg) {
      completeEnemyImg.src = monsterImg.src;
      if (monster.name) {
        completeEnemyImg.alt = win
          ? `${monster.name} defeated in battle`
          : `${monster.name} preparing for the next battle`;
      }
    }

    const goalsAchieved = win && accuracyGoalMet && timeGoalMet;

    if (win && goalsAchieved) {
      const monsterName =
        typeof monster?.name === 'string' ? monster.name.trim() : '';
      const victoryName = monsterName || 'Monster';
      setBattleCompleteTitleLines(victoryName, 'Defeated!');
    } else {
      setBattleCompleteTitleLines('Keep', 'Practicing!');
    }

    battleGoalsMet = goalsAchieved;
    if (battleGoalsMet) {
      advanceBattleLevel();
    }

    if (nextMissionBtn) {
      nextMissionBtn.textContent = battleGoalsMet ? 'Next Mission' : 'Try Again';
      nextMissionBtn.dataset.action = battleGoalsMet ? 'next' : 'retry';
    }

    const showCompleteMessage = () => {
      if (!completeMessage) {
        return;
      }
      completeMessage.classList.add('show');
      completeMessage.setAttribute('aria-hidden', 'false');
      if (typeof completeMessage.focus === 'function') {
        completeMessage.focus();
      }
    };

    const waitForHpDrainEl =
      _options && typeof _options.waitForHpDrain?.addEventListener === 'function'
        ? _options.waitForHpDrain
        : null;

    if (waitForHpDrainEl) {
      waitForHealthDrain(waitForHpDrainEl).then(() => {
        showCompleteMessage();
      });
    } else {
      showCompleteMessage();
    }
  }

  if (nextMissionBtn) {
    nextMissionBtn.addEventListener('click', () => {
      const action = nextMissionBtn.dataset.action;
      if (action === 'retry') {
        window.location.reload();
      } else {
        if (battleGoalsMet && !battleLevelAdvanced) {
          advanceBattleLevel();
        }
        window.location.href = '../index.html';
      }
    });
  }

  function initBattle() {
    battleEnded = false;
    streak = 0;
    streakMaxed = false;
    streakIconShown = false;
    currentQuestion = 0;
    correctAnswers = 0;
    totalAnswers = 0;
    wrongAnswers = 0;
    battleStartTime = null;
    initialTimeRemaining = 0;
    battleLevelAdvanced = false;
    battleGoalsMet = false;
    if (completeMessage) {
      completeMessage.classList.remove('show');
      completeMessage.setAttribute('aria-hidden', 'true');
    }
    setBattleCompleteTitleLines('Battle', 'Complete');
    if (nextMissionBtn) {
      nextMissionBtn.textContent = 'Next Mission';
      nextMissionBtn.dataset.action = 'next';
    }
    if (summaryAccuracyValue) {
      summaryAccuracyValue.classList.remove('goal-result--met', 'goal-result--missed');
    }
    if (summaryTimeValue) {
      summaryTimeValue.classList.remove('goal-result--met', 'goal-result--missed');
    }
    loadData();
    updateStreak();
    updateAccuracyDisplays();
    startBattleTimer();
    setTimeout(showQuestion, 2000);
  }

  if (window.preloadedData) {
    initBattle();
  } else {
    document.addEventListener('data-loaded', initBattle, { once: true });
  }
});
