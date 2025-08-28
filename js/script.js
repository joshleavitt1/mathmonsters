document.addEventListener('DOMContentLoaded', () => {
  const shellfin = document.getElementById('shellfin');
  const monster = document.getElementById('monster');
  const message = document.getElementById('message');
  const messageText = message.querySelector('p');
  const button = message.querySelector('button');

  shellfin.addEventListener('animationend', (e) => {
    if (e.animationName === 'swim') {
      message.classList.add('show');
    }
  });

  function startBattle() {
    message.classList.remove('show');
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
    shellfin.classList.remove('pop');
    monster.classList.remove('pop');
    message.classList.remove('show');
    messageText.textContent = "Hi! I’m Shellfin – half turtle, half manta ray. Monsters have taken over my reef, and I need your help!";
    button.onclick = startBattle;
    shellfin.style.animation = 'none';
    monster.style.animation = 'none';
    void shellfin.offsetWidth;
    void monster.offsetWidth;
    shellfin.style.animation = '';
    monster.style.animation = '';
  }

  monster.addEventListener('animationend', () => {
    messageText.textContent = "Monster spotted! It’s battle time. My attacks are powered by learning. The more you know, the tougher I become!";
    message.classList.add('show');
    button.onclick = goToBattle;
  });

  function goToBattle() {
    button.onclick = null;

    function handlePop(e) {
      if (e.animationName === 'bubble-pop') {
        window.location.href = 'battle.html';
        monster.removeEventListener('animationend', handlePop);
      }
    }

    function handleSlide(e) {
      if (e.propertyName === 'transform') {
        message.removeEventListener('transitionend', handleSlide);
        monster.classList.add('pop');
        monster.addEventListener('animationend', handlePop);
      }
    }

    message.addEventListener('transitionend', handleSlide);
    message.classList.remove('show');
  }

  resetScene();
  window.addEventListener('pageshow', resetScene);
});
