document.addEventListener('DOMContentLoaded', () => {
  const shellfin = document.getElementById('shellfin');
  const monster = document.getElementById('monster');
  const message = document.getElementById('message');
  const messageText = message.querySelector('.generic-content p');
  const button = message.querySelector('.generic-content button');
  const overlay = document.getElementById('overlay');
  const battle = document.getElementById('battle');
  const skipBattleButton = document.getElementById('skip-button');
  const skipWinButton = document.getElementById('skip-win-button');
  const resetProgressButton = document.getElementById('reset-progress-button');

  shellfin.addEventListener('animationend', (e) => {
    if (e.animationName === 'swim') {
      overlay.classList.add('show');
      message.classList.add('show');
    }
  });

  function startBattle() {
    message.classList.remove('show', 'win');
    overlay.classList.remove('show');
    button.onclick = null;
    shellfin.classList.add('pop');
    shellfin.addEventListener('animationend', function handlePop(e) {
      if (e.animationName === 'bubble-pop') {
        shellfin.style.display = 'none';
        monster.style.display = 'block';
        monster.style.animation = 'swim 2s forwards';
        shellfin.removeEventListener('animationend', handlePop);
      }
    });
  }

  function resetScene() {
    shellfin.style.display = 'block';
    monster.style.display = 'none';
    battle.style.display = 'none';
    shellfin.classList.remove('pop');
    monster.classList.remove('pop');
    message.classList.remove('show', 'win');
    overlay.classList.remove('show');
    messageText.textContent = "Hi! I’m Shellfin. I live on the reef, but monsters have taken over and I need you help!";
    button.onclick = startBattle;
    shellfin.style.animation = 'none';
    monster.style.animation = 'none';
    void shellfin.offsetWidth;
    void monster.offsetWidth;
    shellfin.style.animation = '';
    monster.style.animation = '';
  }

  monster.addEventListener('animationend', (e) => {
    if (e.animationName === 'swim') {
      messageText.textContent = "Monster spotted! It’s battle time. My attacks are powered by learning. The more you know, the tougher I become!";
      overlay.classList.add('show');
      message.classList.add('show');
      button.onclick = goToBattle;
    }
  });

  function goToBattle() {
    button.onclick = null;

    function handlePop(e) {
      if (e.animationName === 'bubble-pop') {
        monster.removeEventListener('animationend', handlePop);
        document.getElementById('game').style.display = 'none';
        battle.style.display = 'block';
        messageText.textContent = "Each battle is a series of questions – answer right to attack and fight back. Let’s get learning!";
      }
    }

    function handleSlide(e) {
      if (e.propertyName === 'transform') {
        message.removeEventListener('transitionend', handleSlide);
        // Clear the inline swim animation so the pop animation can run
        monster.style.animation = 'none';
        void monster.offsetWidth; // trigger reflow
        monster.style.animation = '';
        monster.classList.add('pop');
        monster.addEventListener('animationend', handlePop);
      }
    }

    message.addEventListener('transitionend', handleSlide);
    message.classList.remove('show', 'win');
    overlay.classList.remove('show');
  }

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
    localStorage.removeItem('characters');
    // Optionally re-seed from your bundled defaults:
    if (window.preloadedData?.characters) {
      localStorage.setItem('characters', JSON.stringify(window.preloadedData.characters));
    }
    location.reload();
  }
  // attach to a hidden dev button or a keyboard shortcut, e.g.:
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r' && e.metaKey) resetProgress();
  });
  

  resetScene();
  window.addEventListener('pageshow', resetScene);
  skipBattleButton.addEventListener('click', skipToBattle);
  skipWinButton.addEventListener('click', skipToWin);
  if (resetProgressButton) {
    resetProgressButton.addEventListener('click', resetProgress);
  }
});
