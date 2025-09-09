document.addEventListener('DOMContentLoaded', () => {
  const battle = document.getElementById('battle');
  const message = document.getElementById('message');
  const overlay = document.getElementById('overlay');
  const skipBattleButton = document.getElementById('skip-button');
  const skipWinButton = document.getElementById('skip-win-button');
  const resetProgressButton = document.getElementById('reset-progress-button');

  function skipToBattle() {
    document.getElementById('game').style.display = 'none';
    battle.style.display = 'block';
    message.classList.remove('show', 'win');
    overlay.classList.remove('show');
  }

  function skipToWin() {
    message.classList.remove('show', 'win');
    overlay.classList.remove('show');
    document.dispatchEvent(new Event('skip-win'));
  }

  function resetProgress() {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('Failed to clear saved progress', err);
    }
    location.reload();
  }

  skipToBattle();

  skipBattleButton.addEventListener('click', skipToBattle);
  skipWinButton.addEventListener('click', skipToWin);
  if (resetProgressButton) {
    resetProgressButton.addEventListener('click', resetProgress);
  }
});
