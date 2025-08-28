document.addEventListener('DOMContentLoaded', () => {
  const message = document.getElementById('message');
  const monster = document.getElementById('battle-monster');
  const shellfin = document.getElementById('battle-shellfin');
  const monsterStats = document.getElementById('monster-stats');
  const shellfinStats = document.getElementById('shellfin-stats');
  const monsterName = monsterStats.querySelector('.name');
  const monsterHpFill = monsterStats.querySelector('.hp-fill');
  const shellfinName = shellfinStats.querySelector('.name');
  const shellfinHpFill = shellfinStats.querySelector('.hp-fill');

  fetch('../data/characters.json')
    .then((res) => res.json())
    .then((data) => {
      const hero = data.heroes.shellfin;
      const foe = data.monsters.octomurk;
      shellfinName.textContent = hero.name;
      monsterName.textContent = foe.name;
      shellfinHpFill.style.width = hero.health + '%';
      monsterHpFill.style.width = foe.health + '%';
    });

  let done = 0;
  function handleEnd() {
    done++;
    if (done === 2) {
      message.classList.add('show');
    }
  }

  monster.addEventListener('animationend', handleEnd);
  shellfin.addEventListener('animationend', handleEnd);
});
