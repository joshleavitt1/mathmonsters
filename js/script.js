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
  shellfin.addEventListener('animationend', () => {
    message.classList.add('show');
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
    setTimeout(() => {
      shellfin.style.display = 'none';
      enemy.style.display = 'block';
    }, 500);
  }

  button.addEventListener('click', startBattle);

  enemy.addEventListener('animationend', () => {
    messageText.textContent = "Monster spotted! It’s battle time. My attacks are powered by learning. The more you know, the tougher I become!";
    message.classList.add('show');
  });
});
