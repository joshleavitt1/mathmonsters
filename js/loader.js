// Preload images and data with a simple loading screen
window.preloadedData = {};

document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading');
  const imageSources = [
    '../images/background/background.png',
    '../images/battle/monster_battle.png',
    '../images/battle/shellfin_battle.png',
    '../images/message/shellfin_message.png',
    '../images/questions/button/correct.svg',
    '../images/questions/button/incorrect.svg'
  ];

  // Fetch data ahead of time
  Promise.all([
    fetch('../data/characters.json').then((res) => res.json()),
    fetch('../data/missions.json').then((res) => res.json())
  ])
    .then(([characters, missions]) => {
      window.preloadedData.characters = characters;
      window.preloadedData.missions = missions;
      // Collect hero level images
      Object.values(characters.heroes).forEach((hero) => {
        Object.values(hero.levels).forEach((level) => {
          imageSources.push(`../images/characters/${level.image}`);
        });
      });
      // Collect question images
      missions.Walkthrough.questions.forEach((q) => {
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
