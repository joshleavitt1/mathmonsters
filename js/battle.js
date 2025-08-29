document.addEventListener('DOMContentLoaded', () => {
  const message = document.getElementById('message');
  const overlay = document.getElementById('overlay');
  const monster = document.getElementById('battle-monster');
  const shellfin = document.getElementById('battle-shellfin');
  const monsterStats = document.getElementById('monster-stats');
  const shellfinStats = document.getElementById('shellfin-stats');
  const monsterName = monsterStats.querySelector('.name');
  const monsterHpFill = monsterStats.querySelector('.hp-fill');
  const shellfinName = shellfinStats.querySelector('.name');
  const shellfinHpFill = shellfinStats.querySelector('.hp-fill');
  const button = message.querySelector('button');
  const questionBox = document.getElementById('question');
  const questionHeading = questionBox.querySelector('h1');
  const questionText = questionBox.querySelector('p');
    const choices = questionBox.querySelector('.choices');
    const progressFill = questionBox.querySelector('.progress-fill');
    const questionButton = questionBox.querySelector('button');
  let questions = [];
  let totalQuestions = 0;
  let currentQuestion = 0;
  let hero;
  let foe;

  fetch('../data/characters.json')
    .then((res) => res.json())
    .then((data) => {
      hero = data.heroes.shellfin;
      foe = data.monsters.octomurk;
      shellfinName.textContent = hero.name;
      monsterName.textContent = foe.name;
      const heroHpPercent = ((hero.health - hero.damage) / hero.health) * 100;
      const monsterHpPercent = ((foe.health - foe.damage) / foe.health) * 100;
      shellfinHpFill.style.width = heroHpPercent + '%';
      monsterHpFill.style.width = monsterHpPercent + '%';
    });

  fetch('../data/questions.json')
    .then((res) => res.json())
    .then((data) => {
      const walkthrough = data.Walkthrough;
      questions = walkthrough.questions;
      totalQuestions = walkthrough.total;
    });

  function showQuestion() {
    function setupQuestion() {
      const q = questions[currentQuestion];
      questionHeading.textContent = `Question ${q.number} of ${totalQuestions}`;
      questionText.textContent = q.question;
      choices.innerHTML = '';
      questionButton.disabled = true;
      q.choices.forEach((choice) => {
        const div = document.createElement('div');
        div.classList.add('choice');
        div.dataset.correct = choice.correct;
        if (choice.image) {
          const img = document.createElement('img');
          img.src = `../images/questions/${choice.image}`;
          img.alt = choice.name;
          div.appendChild(img);
        }
        const p = document.createElement('p');
        p.textContent = choice.name;
        div.appendChild(p);
        choices.appendChild(div);
      });
      const percent = (q.number / totalQuestions) * 100;
      progressFill.style.width = percent + '%';
      questionBox.classList.add('show');
    }

    if (message.classList.contains('show')) {
      function handleSlide(e) {
        if (e.propertyName === 'transform') {
          message.removeEventListener('transitionend', handleSlide);
          setupQuestion();
        }
      }
      message.addEventListener('transitionend', handleSlide);
      message.classList.remove('show');
    } else {
      setupQuestion();
    }
  }

  document.addEventListener('answer-submitted', (e) => {
    heroAttack(e.detail.correct);
  });

  function heroAttack(correct) {
    shellfin.classList.add('attack');
    foe.damage += hero.attack;
    const percent = ((foe.health - foe.damage) / foe.health) * 100;
    monsterHpFill.style.width = percent + '%';
    function handleHero(e) {
      if (e.animationName === 'hero-attack') {
        shellfin.classList.remove('attack');
        shellfin.removeEventListener('animationend', handleHero);
        if (!correct) {
          monsterAttack();
        } else {
          nextTurn();
        }
      }
    }
    shellfin.addEventListener('animationend', handleHero);
  }

  function monsterAttack() {
    monster.classList.add('attack');
    hero.damage += foe.attack;
    const percent = ((hero.health - hero.damage) / hero.health) * 100;
    shellfinHpFill.style.width = percent + '%';
    function handleMonster(e) {
      if (e.animationName === 'monster-attack') {
        monster.classList.remove('attack');
        monster.removeEventListener('animationend', handleMonster);
        nextTurn();
      }
    }
    monster.addEventListener('animationend', handleMonster);
  }

  function nextTurn() {
    currentQuestion++;
    if (currentQuestion < totalQuestions) {
      showQuestion();
    }
  }

  let done = 0;
  function handleEnd() {
    done++;
    if (done === 2) {
      overlay.classList.add('show');
      message.classList.add('show');
      button.onclick = showQuestion;
    }
  }

  monster.addEventListener('animationend', handleEnd);
  shellfin.addEventListener('animationend', handleEnd);
});
