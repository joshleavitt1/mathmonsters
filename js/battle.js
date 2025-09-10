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
  const headingEl = questionBox.querySelector('h1');
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

  let STREAK_GOAL = 10;
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
    if (config.hero) {
      hero.attack = Number(config.hero.attack) || hero.attack;
      hero.health = Number(config.hero.health) || hero.health;
      hero.gems = Number(config.hero.gems) || hero.gems;
      hero.damage = Number(config.hero.damage) || hero.damage;
      hero.name = config.hero.name || hero.name;
    }
    if (config.monster) {
      monster.attack = Number(config.monster.attack) || monster.attack;
      monster.health = Number(config.monster.health) || monster.health;
      monster.damage = Number(config.monster.damage) || monster.damage;
      monster.name = config.monster.name || monster.name;
    }
    if (data && data.characters && data.missions) {
      const heroData = data.characters.heroes?.shellfin;
      const monsterData = data.characters.monsters?.octomurk;
      if (heroData) {
        hero.attack = Number(heroData.attack) || hero.attack;
        hero.health = Number(heroData.health) || hero.health;
        hero.name = heroData.name || hero.name;
      }
      if (monsterData) {
        monster.attack = Number(monsterData.attack) || monster.attack;
        monster.health = Number(monsterData.health) || monster.health;
        monster.name = monsterData.name || monster.name;
      }
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
    headingEl.textContent = 'Question';
    questionText.textContent = q.question || '';
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
  }

  function updateStreak() {
    const percent = Math.min(streak / STREAK_GOAL, 1) * 100;
    progressFill.style.width = percent + '%';
    if (streak > 0) {
      streakLabel.textContent = `${streak} in a Row`;
      streakLabel.classList.remove('show');
      void streakLabel.offsetWidth;
      streakLabel.classList.add('show');
    } else {
      streakLabel.textContent = '';
      streakLabel.classList.remove('show');
    }
  }

  function showIncrease(el) {
    el.textContent = '+1';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function heroAttack() {
    setTimeout(() => {
      heroImg.classList.add('attack');
      const handler = (e) => {
        if (e.animationName !== 'hero-attack') return;
        heroImg.classList.remove('attack');
        heroImg.removeEventListener('animationend', handler);
        setTimeout(() => {
          monster.damage += hero.attack;
          updateHealthBars();
          if (monster.damage >= monster.health) {
            endBattle(true);
          } else {
            currentQuestion++;
            showQuestion();
          }
        }, 1000);
      };
      heroImg.addEventListener('animationend', handler);
    }, 1000);
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
          if (hero.damage >= hero.health) {
            endBattle(false);
          } else {
            currentQuestion++;
            showQuestion();
          }
        }, 1000);
      };
      monsterImg.addEventListener('animationend', handler);
    }, 1000);
  }

  document.addEventListener('answer-submitted', (e) => {
    const correct = e.detail.correct;
    questionBox.classList.remove('show');
    if (correct) {
      setTimeout(() => {
        streak++;
        updateStreak();
        const stat = ['attack', 'health', 'gem'][Math.floor(Math.random() * 3)];
        setTimeout(() => {
          if (stat === 'attack') {
            hero.attack++;
            attackVal.textContent = hero.attack;
            showIncrease(attackInc);
          } else if (stat === 'health') {
            hero.health++;
            healthVal.textContent = hero.health;
            showIncrease(healthInc);
            updateHealthBars();
          } else {
            hero.gems++;
            gemVal.textContent = hero.gems;
            showIncrease(gemInc);
          }
          setTimeout(heroAttack, 2000);
        }, 1000);
      }, 2000);
    } else {
      streak = 0;
      updateStreak();
      setTimeout(monsterAttack, 3000);
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
    setTimeout(showQuestion, 3000);
  }

  if (window.preloadedData) {
    initBattle();
  } else {
    document.addEventListener('data-loaded', initBattle, { once: true });
  }
});
