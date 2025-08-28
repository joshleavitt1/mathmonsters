document.addEventListener('DOMContentLoaded', () => {
  const message = document.getElementById('message');
  const monster = document.getElementById('battle-monster');
  const shellfin = document.getElementById('battle-shellfin');

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
