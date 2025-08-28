document.getElementById('shellfin').addEventListener('animationend', function() {
  const message = document.getElementById('message');
  requestAnimationFrame(() => {
    message.classList.add('show');
  });
});
