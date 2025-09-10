document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/data/levels.json');
    const data = await res.json();
    const current = data.levels[0];

    document.querySelector('.level-number').textContent = `Level ${current.id}`;
    document.querySelector('.math-type').textContent = current.math;
    document.querySelector('.enemy-image').src = `../images/${current.enemySprite}`;
    document.querySelector('.progress-fill').style.width = `${current.progress * 100}%`;
  } catch (e) {
    console.error('Failed to load level data', e);
  }

  document.querySelector('.battle-btn').addEventListener('click', () => {
    window.location.href = 'battle.html';
  });
});
