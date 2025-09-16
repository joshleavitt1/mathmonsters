const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';
const VISITED_VALUE = 'true';

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

if (!landingVisited) {
  window.location.replace('../index.html');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!landingVisited) {
    return;
  }
  const monsterImg = document.getElementById('battle-monster');
  const heroImg = document.getElementById('battle-shellfin');
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
  const devControls = document.querySelector('.battle-dev-controls');
  const heroAttackVal = heroStats.querySelector('.attack .value');
  const heroHealthVal = heroStats.querySelector('.health .value');
  const heroAttackInc = heroStats.querySelector('.attack .increase');
  const heroHealthInc = heroStats.querySelector('.health .increase');
  const monsterAttackVal = monsterStats.querySelector('.attack .value');
  const monsterHealthVal = monsterStats.querySelector('.health .value');

  const battleMessage = document.getElementById('battle-message');
  const battleMessageText = battleMessage?.querySelector('p');
  const battleMessageButton = battleMessage?.querySelector('button');
  const completeMessage = document.getElementById('complete-message');
  const completeEnemyImg = completeMessage?.querySelector('.enemy-image');
  const summaryAccuracyValue = completeMessage?.querySelector('.summary-accuracy');
  const summaryTimeValue = completeMessage?.querySelector('.summary-time');
  const nextMissionBtn = completeMessage?.querySelector('.next-mission-btn');

  if (bannerAccuracyValue) bannerAccuracyValue.textContent = '0%';
  if (bannerTimeValue) bannerTimeValue.textContent = '0s';
  if (summaryAccuracyValue) summaryAccuracyValue.textContent = '0%';
  if (summaryTimeValue) summaryTimeValue.textContent = '0s';

  let STREAK_GOAL = 5;
  let questions = [];
  let currentQuestion = 0;
  let streak = 0;
  let streakMaxed = false;
  let streakIconShown = false;
  let correctAnswers = 0;
  let totalAnswers = 0;
  const battleStart = Date.now();
  let battleTimerInterval = null;
  let battleEnded = false;

  const hero = { attack: 1, health: 5, gems: 0, damage: 0, name: 'Hero' };
  const monster = { attack: 1, health: 5, damage: 0, name: 'Monster' };

  heroImg.classList.add('slide-in');
  monsterImg.classList.add('slide-in');
  heroStats.classList.add('show');
  monsterStats.classList.add('show');

  heroImg.addEventListener(
    'animationend',
    () => heroImg.classList.remove('slide-in'),
    { once: true }
  );
  monsterImg.addEventListener(
    'animationend',
    () => monsterImg.classList.remove('slide-in'),
    { once: true }
  );

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function loadData() {
    const data = window.preloadedData ?? {};
    const battleData = data.battle ?? {};
    const heroData = data.hero ?? {};
    const enemyData = data.enemy ?? {};

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

    STREAK_GOAL = Number(battleData.streakGoal) || STREAK_GOAL;

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
      completeEnemyImg.alt = `${monster.name} defeated in battle`;
    }

    const loadedQuestions = Array.isArray(data.questions)
      ? data.questions.slice()
      : [];
    questions = shuffle(loadedQuestions);

    updateHealthBars();
  }

  function updateHealthBars() {
    const heroPercent = ((hero.health - hero.damage) / hero.health) * 100;
    const monsterPercent = ((monster.health - monster.damage) / monster.health) * 100;
    heroHpFill.style.width = heroPercent + '%';
    monsterHpFill.style.width = monsterPercent + '%';
  }

  function calculateAccuracy() {
    return totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  }

  function updateAccuracyDisplays() {
    const accuracy = calculateAccuracy();
    if (bannerAccuracyValue) bannerAccuracyValue.textContent = `${accuracy}%`;
    if (summaryAccuracyValue) summaryAccuracyValue.textContent = `${accuracy}%`;
  }

  function updateBattleTime() {
    const elapsed = Math.max(0, Math.round((Date.now() - battleStart) / 1000));
    if (bannerTimeValue) bannerTimeValue.textContent = `${elapsed}s`;
  }

  function startBattleTimer() {
    stopBattleTimer();
    updateBattleTime();
    battleTimerInterval = setInterval(updateBattleTime, 1000);
  }

  function stopBattleTimer() {
    if (battleTimerInterval) {
      clearInterval(battleTimerInterval);
      battleTimerInterval = null;
    }
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
        img.src = `../images/questions/${choice.image}`;
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
            endBattle(true);
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
              endBattle(false);
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

  document.addEventListener('answer-submitted', (e) => {
    if (battleEnded) {
      return;
    }
    const correct = e.detail.correct;
    totalAnswers++;
    if (correct) correctAnswers++;
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
  function endBattle(win) {
    if (battleEnded) {
      return;
    }
    battleEnded = true;
    devControls?.classList.add('battle-dev-controls--hidden');
    stopBattleTimer();
    updateAccuracyDisplays();
    if (win) {
      const accuracy = calculateAccuracy();
      const elapsed = Math.round((Date.now() - battleStart) / 1000);
      if (summaryAccuracyValue) summaryAccuracyValue.textContent = `${accuracy}%`;
      if (summaryTimeValue) summaryTimeValue.textContent = `${elapsed}s`;
      if (bannerTimeValue) bannerTimeValue.textContent = `${elapsed}s`;
      if (completeEnemyImg) {
        completeEnemyImg.src = monsterImg.src;
      }
      completeMessage?.classList.add('show');
    } else {
      if (battleMessageText) {
        battleMessageText.textContent = 'you lose';
      }
      battleMessage?.classList.add('show');
    }
  }

  battleMessageButton?.addEventListener('click', () => {
    window.location.reload();
  });

  if (nextMissionBtn) {
    nextMissionBtn.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }

  function initBattle() {
    battleEnded = false;
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
