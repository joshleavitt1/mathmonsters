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
    overlay.classList.remove('show');
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

  function showFeedback(correct) {
    const text = correct
      ? 'Awesome job! Only two more hits needed to take Octomurk down. Let’s do it!'
      : 'Ouch, that hurt! Don’t worry though, you still do damage when you get the question wrong.';
    message.querySelector('p').textContent = text;
    overlay.classList.add('show');
    message.classList.add('show');
    button.onclick = () => {
      nextTurn();
    };
  }

  function heroAttack(correct) {
    shellfin.classList.add('attack');
    function handleHero(e) {
      if (e.animationName === 'hero-attack') {
        shellfin.classList.remove('attack');
        shellfin.removeEventListener('animationend', handleHero);
        foe.damage += hero.attack;
        const percent = ((foe.health - foe.damage) / foe.health) * 100;
        monsterHpFill.style.width = percent + '%';
        function afterBar(ev) {
          if (ev.propertyName === 'width') {
            monsterHpFill.removeEventListener('transitionend', afterBar);
            setTimeout(() => {
              if (!correct) {
                monsterAttack();
              } else {
                showFeedback(true);
              }
            }, 600);
          }
        }
        monsterHpFill.addEventListener('transitionend', afterBar);
      }
    }
    shellfin.addEventListener('animationend', handleHero);
  }

  function monsterAttack() {
    monster.classList.add('attack');
    function handleMonster(e) {
      if (e.animationName === 'monster-attack') {
        monster.classList.remove('attack');
        monster.removeEventListener('animationend', handleMonster);
        hero.damage += foe.attack;
        const percent = ((hero.health - hero.damage) / hero.health) * 100;
        shellfinHpFill.style.width = percent + '%';
        function afterBar(ev) {
          if (ev.propertyName === 'width') {
            shellfinHpFill.removeEventListener('transitionend', afterBar);
            setTimeout(() => {
              showFeedback(false);
            }, 600);
          }
        }
        shellfinHpFill.addEventListener('transitionend', afterBar);
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
  function handleEnd(e) {
    e.target.classList.remove('enter');
    e.target.removeEventListener('animationend', handleEnd);
    done++;
    if (done === 2) {
      let statsDone = 0;
      function statsHandler(ev) {
        if (ev.propertyName === 'transform') {
          statsDone++;
          if (statsDone === 2) {
            shellfinStats.removeEventListener('transitionend', statsHandler);
            monsterStats.removeEventListener('transitionend', statsHandler);
            overlay.classList.add('show');
            message.classList.add('show');
            button.onclick = showQuestion;
          }
        }
      }
      shellfinStats.addEventListener('transitionend', statsHandler);
      monsterStats.addEventListener('transitionend', statsHandler);
      shellfinStats.classList.add('show');
      monsterStats.classList.add('show');
    }
  }

  monster.addEventListener('animationend', handleEnd);
  shellfin.addEventListener('animationend', handleEnd);
});
