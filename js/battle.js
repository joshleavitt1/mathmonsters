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
  let questions = [];
  let totalQuestions = 0;

  fetch('../data/characters.json')
    .then((res) => res.json())
    .then((data) => {
      const hero = data.heroes.shellfin;
      const foe = data.monsters.octomurk;
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
    message.classList.remove('show');
    function handleSlide(e) {
      if (e.propertyName === 'transform') {
        message.removeEventListener('transitionend', handleSlide);
        const q = questions[0];
        questionHeading.textContent = `Question ${q.number} of ${totalQuestions}`;
        questionText.textContent = q.question;
        choices.innerHTML = '';
        q.choices.forEach((choice) => {
          const div = document.createElement('div');
          div.classList.add('choice');
          const p = document.createElement('p');
          p.textContent = choice.name;
          div.appendChild(p);
          choices.appendChild(div);
        });
        const percent = (q.number / totalQuestions) * 100;
        progressFill.style.width = percent + '%';
        questionBox.classList.add('show');
      }
    }
    message.addEventListener('transitionend', handleSlide);
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
