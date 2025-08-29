// Preload images and data with a simple loading screen
window.preloadedData = {};

document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading');
  const imageSources = [
    '../images/background.png',
    '../images/shellfin.png',
    '../images/monster_battle.png',
    '../images/shellfin_battle.png',
    '../images/shellfin_message.png',
    '../images/questions/button/correct.svg',
    '../images/questions/button/incorrect.svg'
  ];

  // Fetch data ahead of time
  Promise.all([
    fetch('../data/characters.json').then((res) => res.json()),
    fetch('../data/questions.json').then((res) => res.json())
  ])
    .then(([characters, questions]) => {
      window.preloadedData.characters = characters;
      window.preloadedData.questions = questions;
      // Collect question images
      questions.Walkthrough.questions.forEach((q) => {
        q.choices.forEach((choice) => {
          if (choice.image) {
            imageSources.push(`../images/questions/${choice.image}`);
          }
        });
      });
      return Promise.all(
        imageSources.map(
          (src) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = src;
            })
        )
      );
    })
    .finally(() => {
      loading.classList.add('hide');
      document.dispatchEvent(new Event('assets-loaded'));
    });
});
