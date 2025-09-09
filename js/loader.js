// Preload images and data with a simple loading screen
window.preloadedData = {};

document.addEventListener('DOMContentLoaded', () => {
    const imageSources = [
      '../images/background/background.png',
      '../images/battle/monster_battle.png',
      '../images/battle/shellfin_battle.png',
      '../images/message/shellfin_message.png',
      '../images/questions/button/correct.svg',
      '../images/questions/button/incorrect.svg'
    ];
    const params = new URLSearchParams(window.location.search);
    const battleId = params.get('id');

  // Fetch data ahead of time
  const storedChars = localStorage.getItem('characters');
  const charactersPromise = storedChars
    ? Promise.resolve(JSON.parse(storedChars))
    : fetch('../data/characters.json').then((res) => res.json());

    Promise.all([
      charactersPromise,
      fetch('../data/missions.json').then((res) => res.json())
    ])
      .then(async ([characters, missions]) => {
        window.preloadedData.characters = characters;
        window.preloadedData.missions = missions;

        if (battleId && window.supabaseClient) {
          try {
            const { data } = await window.supabaseClient
              .from('battles')
              .select('questions')
              .eq('id', battleId)
              .single();
            if (data?.questions) {
              const transformed = data.questions.map((q, idx) => {
                const question = {
                  name: `Question ${idx + 1}`,
                  number: idx + 1,
                  question: q.question,
                  choices: [],
                };
                if (q.type === 'multiple' || q.type === 'boolean') {
                  const correct = Array.isArray(q.correct)
                    ? q.correct
                    : [q.correct];
                  (q.options || []).forEach((opt, i) => {
                    question.choices.push({
                      name: opt,
                      correct: correct.includes(i),
                    });
                  });
                } else if (q.type === 'text') {
                  question.choices.push({ name: q.answer, correct: true });
                }
                return question;
              });
              window.preloadedData.missions.Walkthrough.questions = transformed;
              window.preloadedData.missions.Walkthrough.total = transformed.length;
              if (window.preloadedData.characters?.monsters?.octomurk) {
                window.preloadedData.characters.monsters.octomurk.health =
                  transformed.length;
                window.preloadedData.characters.monsters.octomurk.damage = 0;
              }
            }
          } catch (err) {
            console.error('Failed to load battle questions', err);
          }
        }
        // Collect hero level images
        Object.values(characters.heroes).forEach((hero) => {
          Object.values(hero.levels).forEach((level) => {
            imageSources.push(`../images/characters/${level.image}`);
          });
        });
        // Collect question images
        window.preloadedData.missions.Walkthrough.questions.forEach((q) => {
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
        document.dispatchEvent(new Event('assets-loaded'));
      });
  });
