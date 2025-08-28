document.addEventListener('DOMContentLoaded', () => {
  const shellfin = document.getElementById('shellfin');
  const enemy = document.getElementById('enemy');
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
    button.removeEventListener('click', startBattle);
    shellfin.classList.add('pop');
    shellfin.addEventListener('animationend', function handlePop(e) {
      if (e.animationName === 'bubble-pop') {
        shellfin.style.display = 'none';
        enemy.style.display = 'block';
        shellfin.removeEventListener('animationend', handlePop);
      }
    });
  }

  function resetScene() {
    shellfin.style.display = 'block';
    enemy.style.display = 'none';
    shellfin.classList.remove('pop');
    message.classList.remove('show');
    messageText.textContent = "Hi! I’m Shellfin – half turtle, half manta ray. Monsters have taken over my reef, and I need your help!";
    button.removeEventListener('click', startBattle);
    button.addEventListener('click', startBattle);
    shellfin.style.animation = 'none';
    enemy.style.animation = 'none';
    void shellfin.offsetWidth;
    void enemy.offsetWidth;
    shellfin.style.animation = '';
    enemy.style.animation = '';
  }

  enemy.addEventListener('animationend', () => {
    messageText.textContent = "Monster spotted! It’s battle time. My attacks are powered by learning. The more you know, the tougher I become!";
    message.classList.add('show');
  });

  resetScene();
  window.addEventListener('pageshow', resetScene);
 });
