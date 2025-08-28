document.getElementById('shellfin').addEventListener('animationend', function() {
  const message = document.getElementById('message');
  message.style.display = 'flex';
  requestAnimationFrame(() => {
    message.classList.add('show');
  });
});
