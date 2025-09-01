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
  const genericContent = message.querySelector('.generic-content');
  const genericImg = genericContent.querySelector('img');
  const genericP = genericContent.querySelector('p');
  const winContent = message.querySelector('.win-content');
  const button = genericContent.querySelector('button');
  const heroNameDisplay = winContent.querySelector('.hero-name');
  const attackDisplay = winContent.querySelector('.attack');
  const healthDisplay = winContent.querySelector('.health');
  const xpFill = winContent.querySelector('.progress-fill');
  const levelUpBadge = winContent.querySelector('.level-up-badge');
  const claimButton = winContent.querySelector('button');
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
  const heroLevelDisplay = document.getElementById('hero-level-display');
  let questions = [];
  let totalQuestions = 0;
  let currentQuestion = 0;
  let hero;
  let foe;
  let maxLevelStart = 0;
  let feedbackShown = { correct: false, incorrect: false };
  let correctAnswers = 0;
  let startTime;
  let endTime;
  let missionExperience = 0;
  let prevLevel;

  const ATTACK_DELAY_MS = 1200;

  function updateHeroLevelDisplay() {
    if (heroLevelDisplay && hero) {
      heroLevelDisplay.textContent = `Level: ${hero.level}`;
    }
  }

  function saveCharacterData() {
    try {
      if (window.preloadedData?.characters?.heroes?.shellfin) {
        window.preloadedData.characters.heroes.shellfin.level = hero.level;
        window.preloadedData.characters.heroes.shellfin.experience = hero.experience;
        localStorage.setItem('characters', JSON.stringify(window.preloadedData.characters));
      }
    } catch (err) {
      console.error('Failed to save character data', err);
    }
  }

  function applyDamage(attacker, defender) {
    defender.damage = Number(defender.damage) + Number(attacker.attack);
  }

  function loadData() {
    const data = window.preloadedData;
    if (!data || !data.characters || !data.missions) return;

    hero = data.characters.heroes.shellfin;
    foe = data.characters.monsters.octomurk;

    shellfinName.textContent = hero.name;
    monsterName.textContent = foe.name;

    const heroHpPercent = ((hero.health - hero.damage) / hero.health) * 100;
    const monsterHpPercent = ((foe.health - foe.damage) / foe.health) * 100;
    shellfinHpFill.style.width = heroHpPercent + '%';
    monsterHpFill.style.width = monsterHpPercent + '%';

    const starts = Object.values(hero.levels).map((l) => Number(l.start));
    maxLevelStart = Math.max(...starts);

    const walkthrough = data.missions.Walkthrough;
    questions = walkthrough.questions;
    totalQuestions = questions.length;
    missionExperience = walkthrough.experience;
    updateHeroLevelDisplay();
  }

  document.addEventListener('assets-loaded', loadData);
  loadData();

  function updateLevelProgress(reset = false) {
    if (!hero || !hero.levels) return;
    const currentLevelData = hero.levels[hero.level];
    const nextLevelData = hero.levels[hero.level + 1];
    const currentStart = Number(currentLevelData.start);
    const nextStart = nextLevelData ? Number(nextLevelData.start) : maxLevelStart;
    const progressPercent = ((hero.experience - currentStart) / (nextStart - currentStart || 1)) * 100;
    if (reset) {
      xpFill.style.transition = 'none';
      xpFill.style.width = '0%';
      void xpFill.offsetWidth;
      xpFill.style.transition = 'width 0.6s linear';
    }
    xpFill.style.width = Math.min(Math.max(progressPercent, 0), 100) + '%';
  }

  function showQuestion() {
    overlay.classList.add('show');
    function setupQuestion() {
      const q = questions[currentQuestion];
      if (currentQuestion === 0) {
        startTime = Date.now();
      }
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
      correctAnswers++;
      heroAttack(true);
    } else {
      monsterAttack(() => heroAttack(false, () => showFeedback(false)), 300);
    }
    if (currentQuestion === totalQuestions - 1) {
      endTime = Date.now();
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
    message.querySelector('.generic-content p').textContent = text;
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
        introMonster.src = '../images/battle/monster_battle_dead.png';
        introMonster.style.display = 'block';
        introMonster.classList.remove('pop', 'pop-in');
        introMonster.style.animation = 'none';
        introMonster.style.transform = 'translateX(-50%) scale(0)';
        void introMonster.offsetWidth;
        introMonster.style.animation = '';
        introMonster.classList.add('pop-in');
        setTimeout(() => {
          heroNameDisplay.textContent = 'Mission Complete';
          const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
          attackDisplay.textContent = `${accuracy}%`;
          const speed = Math.floor((endTime - startTime) / 1000);
          healthDisplay.textContent = `${speed}s`;
          xpFill.style.transition = 'none';
          updateLevelProgress();
          void xpFill.offsetWidth;
          xpFill.style.transition = 'width 0.6s linear';
          message.classList.add('win');
          overlay.classList.add('show');
          message.classList.add('show');
          claimButton.onclick = null;

          setTimeout(() => {
            const currentStart = Number(hero.levels[hero.level].start);
            const nextStart = Number(hero.levels[hero.level + 1]?.start || maxLevelStart);
            prevLevel = hero.level;
            hero.experience += missionExperience;
            xpFill.addEventListener('transitionend', function handleXp(e) {
              if (e.propertyName === 'width') {
                xpFill.removeEventListener('transitionend', handleXp);
                if (hero.experience >= nextStart) {
                  hero.level += 1;
                  updateHeroLevelDisplay();
                  saveCharacterData();
                  levelUpBadge.classList.remove('show');
                  void levelUpBadge.offsetWidth;
                  levelUpBadge.classList.add('show');
                }
              }
            });
            const fillPercent = Math.min(
              ((hero.experience - currentStart) / (nextStart - currentStart || 1)) * 100,
              100
            );
            xpFill.style.width = fillPercent + '%';
            claimButton.onclick = () => {
              message.classList.remove('show');
              overlay.classList.remove('show');
              message.addEventListener('transitionend', () => updateLevelProgress(true), { once: true });

              introMonster.classList.remove('pop', 'pop-in');
              introMonster.classList.add('pop');
              introMonster.addEventListener('animationend', function handleMonsterPop(e) {
                if (e.animationName === 'bubble-pop') {
                  introMonster.removeEventListener('animationend', handleMonsterPop);
                  introMonster.style.display = 'none';

                  introShellfin.src = `../images/characters/${hero.levels[prevLevel].image}`;
                  introShellfin.style.display = 'block';
                  introShellfin.classList.remove('center', 'pop', 'pop-in');
                  introShellfin.style.animation = 'none';
                  introShellfin.style.transform = 'translateX(100vw)';
                  void introShellfin.offsetWidth;
                  setTimeout(() => {
                    introShellfin.style.animation = 'swim 2s forwards';
                  }, 400);

                  introShellfin.addEventListener('animationend', function handleSwim(ev) {
                    if (ev.animationName === 'swim') {
                      introShellfin.removeEventListener('animationend', handleSwim);
                      genericImg.src = '../images/message/shellfin_message.png';
                      genericP.textContent = "Now that I leveled up, I’m ready to evolve and become even more powerful.";
                      button.textContent = 'Continue';
                      overlay.classList.add('show');
                      message.classList.remove('win');
                      message.classList.add('show');

                      button.onclick = () => {
                        message.classList.remove('show');
                        overlay.classList.remove('show');
                        introShellfin.classList.remove('pop', 'pop-in');
                        introShellfin.classList.add('pop');
                        introShellfin.addEventListener('animationend', function handlePop(e) {
                          if (e.animationName === 'bubble-pop') {
                            introShellfin.removeEventListener('animationend', handlePop);
                            introShellfin.src = `../images/characters/${hero.levels[prevLevel + 1].image}`;
                            introShellfin.classList.remove('pop');
                            introShellfin.classList.add('pop-in');
                            introShellfin.addEventListener('animationend', function handlePopIn(ev2) {
                              if (ev2.animationName === 'bubble-pop-in') {
                                introShellfin.classList.remove('pop-in');
                                introShellfin.removeEventListener('animationend', handlePopIn);
                                setTimeout(() => {
                                  genericImg.src = '../images/message/shellfin_message.png';
                                  genericP.textContent = 'test';
                                  button.textContent = 'Continue';
                                  overlay.classList.add('show');
                                  message.classList.add('show');
                                }, 400);
                              }
                            });
                          }
                        });
                      };
                    }
                  });
                }
              });
            };
          }, 1600);
        }, 3200);
      }, 300);
      return;
    }
    message.querySelector('.generic-content p').textContent = 'lose';
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
          applyDamage(hero, foe);
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
          applyDamage(foe, hero);
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

  document.addEventListener('skip-win', () => {
    endBattle('win');
  });
});
