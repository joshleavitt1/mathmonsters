document.addEventListener('DOMContentLoaded', () => {
  const monsterImg = document.getElementById('battle-monster');
  const heroImg = document.getElementById('battle-shellfin');
  const monsterHpFill = document.querySelector('#monster-stats .hp-fill');
  const heroHpFill = document.querySelector('#shellfin-stats .hp-fill');
  const monsterNameEl = document.querySelector('#monster-stats .name');
  const heroNameEl = document.querySelector('#shellfin-stats .name');
  const monsterStats = document.getElementById('monster-stats');
  const heroStats = document.getElementById('shellfin-stats');

  const questionBox = document.getElementById('question');
  const questionText = questionBox.querySelector('p');
  const choicesEl = questionBox.querySelector('.choices');
  const progressFill = questionBox.querySelector('.progress-fill');
  const streakLabel = questionBox.querySelector('.streak-label');
  const attackVal = questionBox.querySelector('.attack .value');
  const healthVal = questionBox.querySelector('.health .value');
  const gemVal = questionBox.querySelector('.gem .value');
  const attackInc = questionBox.querySelector('.attack .increase');
  const healthInc = questionBox.querySelector('.health .increase');
  const gemInc = questionBox.querySelector('.gem .increase');

  const levelMessage = document.getElementById('level-message');
  const levelText = levelMessage.querySelector('p');
  const levelButton = levelMessage.querySelector('button');

  let STREAK_GOAL = 5;
  let questions = [];
  let currentQuestion = 0;
  let streak = 0;

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
    const data = window.preloadedData;
    const config = data.config || {};
    STREAK_GOAL = Number(config.streakGoal) || STREAK_GOAL;
    const heroData = data.characters?.[config.selectedHero];
    const monsterData = data.characters?.[config.selectedMonster];
    if (heroData) {
      hero.attack = Number(heroData.attack) || hero.attack;
      hero.health = Number(heroData.health) || hero.health;
      hero.gems = Number(heroData.gems) || hero.gems;
      hero.damage = Number(heroData.damage) || hero.damage;
      hero.name = heroData.name || hero.name;
    }
    if (monsterData) {
      monster.attack = Number(monsterData.attack) || monster.attack;
      monster.health = Number(monsterData.health) || monster.health;
      monster.damage = Number(monsterData.damage) || monster.damage;
      monster.name = monsterData.name || monster.name;
    }
    if (data && data.missions) {
      questions = shuffle(data.missions.Walkthrough?.questions || []);
    }
    attackVal.textContent = hero.attack;
    healthVal.textContent = hero.health;
    gemVal.textContent = hero.gems;
    heroNameEl.textContent = hero.name;
    monsterNameEl.textContent = monster.name;
    updateHealthBars();
  }

  function updateHealthBars() {
    const heroPercent = ((hero.health - hero.damage) / hero.health) * 100;
    const monsterPercent = ((monster.health - monster.damage) / monster.health) * 100;
    heroHpFill.style.width = heroPercent + '%';
    monsterHpFill.style.width = monsterPercent + '%';
  }

  function showQuestion() {
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
    progressFill.style.width = percent + '%';
    if (streak > 0) {
      streakLabel.textContent = `${streak} in a row`;
      streakLabel.classList.remove('show');
      void streakLabel.offsetWidth;
      streakLabel.classList.add('show');
    } else {
      streakLabel.textContent = '';
      streakLabel.classList.remove('show');
    }
  }

  function showIncrease(el, text) {
    [attackInc, healthInc, gemInc].forEach((inc) => {
      inc.classList.remove('show');
      inc.textContent = '';
    });

    el.textContent = text;
    void el.offsetWidth;
    el.classList.add('show');

    setTimeout(() => {
      el.classList.remove('show');
    }, 1000);
  }

  function heroAttack() {
    heroImg.classList.add('attack');
    const handler = (e) => {
      if (e.animationName !== 'hero-attack') return;
      heroImg.classList.remove('attack');
      heroImg.removeEventListener('animationend', handler);
      setTimeout(() => {
        monster.damage += hero.attack;
        updateHealthBars();
        setTimeout(() => {
          if (monster.damage >= monster.health) {
            endBattle(true);
          } else {
            currentQuestion++;
            showQuestion();
          }
        }, 1000);
      }, 500);
    };
    heroImg.addEventListener('animationend', handler);
  }

  function monsterAttack() {
    setTimeout(() => {
      monsterImg.classList.add('attack');
      const handler = (e) => {
        if (e.animationName !== 'monster-attack') return;
        monsterImg.classList.remove('attack');
        monsterImg.removeEventListener('animationend', handler);
        setTimeout(() => {
          hero.damage += monster.attack;
          updateHealthBars();
          setTimeout(() => {
            if (hero.damage >= hero.health) {
              endBattle(false);
            } else {
              currentQuestion++;
              showQuestion();
            }
          }, 1000);
        }, 500);
      };
      monsterImg.addEventListener('animationend', handler);
    }, 300);
  }

  document.addEventListener('answer-submitted', (e) => {
    const correct = e.detail.correct;
    if (correct) {
      setTimeout(() => {
        streak++;
        updateStreak();
        setTimeout(() => {
          const stats = ['attack', 'health', 'gem'];
          const stat = stats[Math.floor(Math.random() * stats.length)];

          if (streak >= STREAK_GOAL) {
            hero.attack *= 2;
            attackVal.textContent = hero.attack;
            showIncrease(attackInc, 'x2');
            streak = 0;
            updateStreak();
          } else if (stat === 'attack') {
            hero.attack++;
            attackVal.textContent = hero.attack;
            showIncrease(attackInc, '+1');
          } else if (stat === 'health') {
            hero.health++;
            healthVal.textContent = hero.health;
            showIncrease(healthInc, '+1');
            updateHealthBars();
          } else {
            hero.gems++;
            gemVal.textContent = hero.gems;
            showIncrease(gemInc, '+1');
          }

          setTimeout(() => {
            document.dispatchEvent(new Event('close-question'));
            heroAttack();
          }, 4000);
        }, 1000);
      }, 1000);
    } else {
      streak = 0;
      updateStreak();
      setTimeout(() => {
        document.dispatchEvent(new Event('close-question'));
        monsterAttack();
      }, 1000);
    }
  });

  function endBattle(win) {
    levelText.textContent = win ? 'you win' : 'you lose';
    levelMessage.classList.add('show');
  }

  levelButton.addEventListener('click', () => {
    window.location.reload();
  });

  function initBattle() {
    loadData();
    setTimeout(showQuestion, 1000);
  }

  if (window.preloadedData) {
    initBattle();
  } else {
    document.addEventListener('data-loaded', initBattle, { once: true });
  }
});
