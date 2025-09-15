document.addEventListener('DOMContentLoaded', async () => {
  const mathType = document.querySelector('.math-type');
  const battleTitle = document.querySelector('.battle-title');
  const enemyImage = document.querySelector('.enemy-image');
  const accuracyValue = document.querySelector('.accuracy-value');
  const timeValue = document.querySelector('.time-value');
  const battleButton = document.querySelector('.battle-btn');

  try {
    const res = await fetch('../data/levels.json');
    const data = await res.json();
    const [current] = data.levels ?? [];

    if (current) {
      const { id, math, enemySprite } = current;

      if (mathType && typeof math === 'string') {
        mathType.textContent = math;
      }

      if (battleTitle && typeof id !== 'undefined') {
        battleTitle.textContent = `Battle ${id}`;
      }

      if (enemyImage && typeof enemySprite === 'string') {
        enemyImage.src = `../images/${enemySprite}`;
      }
    }

    if (accuracyValue) {
      accuracyValue.textContent = '0';
    }

    if (timeValue) {
      timeValue.textContent = '0';
    }
  } catch (e) {
    console.error('Failed to load level data', e);
  }

  battleButton?.addEventListener('click', () => {
    window.location.href = 'battle.html';
  });
});
