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
  const game = document.getElementById('game');
  const introMonster = document.getElementById('monster');
  const introShellfin = document.getElementById('shellfin');
  const battleDiv = document.getElementById('battle');
  let questions = [];
  let totalQuestions = 0;
  let currentQuestion = 0;
  let hero;
  let foe;
  let feedbackShown = { correct: false, incorrect: false };

  const ATTACK_DELAY_MS = 1200;

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
    overlay.classList.add('show');
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
    overlay.classList.remove('show');
    if (e.detail.correct) {
      heroAttack(true);
    } else {
      monsterAttack(() => heroAttack(false, () => showFeedback(false)), 300);
    }
  });

  function showFeedback(correct) {
    const key = correct ? 'correct' : 'incorrect';
    if (feedbackShown[key]) {
      nextTurn();
      return;
    }
    feedbackShown[key] = true;
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

  function endBattle(result) {
    if (result === 'win') {
      setTimeout(() => {
        battleDiv.style.display = 'none';
        game.style.display = 'block';
        introShellfin.style.display = 'none';
        introMonster.src = '../images/monster_battle_dead.png';
        introMonster.style.display = 'block';
        introMonster.classList.remove('pop', 'pop-in');
        introMonster.style.animation = 'none';
        introMonster.style.transform = 'translateX(-50%) scale(0)';
        void introMonster.offsetWidth;
        introMonster.style.animation = '';
        introMonster.classList.add('pop-in');
        setTimeout(() => {
          message.querySelector('p').textContent = 'win';
          overlay.classList.add('show');
          message.classList.add('show');
          button.onclick = null;
        }, 600);
      }, 300);
      return;
    }
    message.querySelector('p').textContent = 'lose';
    overlay.classList.add('show');
    message.classList.add('show');
    button.onclick = null;
  }

  function heroAttack(correct, after) {
    setTimeout(() => {
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
              if (foe.damage >= foe.health) {
                endBattle('win');
                return;
              }
              setTimeout(() => {
                if (after) {
                  after();
                } else {
                  showFeedback(correct);
                }
              }, 1200);
            }
          }
          monsterHpFill.addEventListener('transitionend', afterBar);
        }
      }
      shellfin.addEventListener('animationend', handleHero);
    }, ATTACK_DELAY_MS);
  }

  function monsterAttack(after, postDelay = 1200) {
    setTimeout(() => {
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
              if (hero.damage >= hero.health) {
                endBattle('lose');
                return;
              }
              setTimeout(() => {
                if (after) {
                  after();
                } else {
                  showFeedback(false);
                }
              }, postDelay);
            }
          }
          shellfinHpFill.addEventListener('transitionend', afterBar);
        }
      }
      monster.addEventListener('animationend', handleMonster);
    }, ATTACK_DELAY_MS);
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
            setTimeout(() => {
              overlay.classList.add('show');
              message.classList.add('show');
              button.onclick = showQuestion;
            }, 600);
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
