(async function () {
  try {
    const [varsRes, levelsRes] = await Promise.all([
      fetch('../data/variables.json'),
      fetch('../data/levels.json'),
    ]);

    if (!varsRes.ok || !levelsRes.ok) {
      throw new Error('Failed to fetch required configuration data.');
    }

    const [varsData, levelsData] = await Promise.all([
      varsRes.json(),
      levelsRes.json(),
    ]);

    const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];
    const progress = varsData?.progress ?? {};
    const activeBattleLevel =
      progress.battleLevel ?? levels[0]?.battleLevel ?? null;

    const currentLevel =
      levels.find((level) => level?.battleLevel === activeBattleLevel) ??
      levels[0] ??
      null;

    let questions = [];
    const questionFile = currentLevel?.battle?.questionReference?.file;

    if (questionFile) {
      try {
        const questionsRes = await fetch(`../data/${questionFile}`);
        if (questionsRes.ok) {
          const questionsJson = await questionsRes.json();
          if (Array.isArray(questionsJson)) {
            questions = questionsJson;
          } else if (Array.isArray(questionsJson?.questions)) {
            questions = questionsJson.questions;
          }
        } else {
          console.warn(`Questions file not found: ${questionFile}`);
        }
      } catch (error) {
        console.error('Failed to load questions data', error);
      }
    }

    const battle = currentLevel?.battle ?? {};
    const hero = battle?.hero ?? null;
    const enemy = battle?.enemy ?? null;

    window.preloadedData = {
      variables: varsData ?? {},
      levels,
      level: currentLevel,
      battle,
      hero,
      enemy,
      questions,
    };

    document.dispatchEvent(new Event('data-loaded'));
  } catch (e) {
    console.error('Failed to load data', e);
    window.preloadedData = {};
    document.dispatchEvent(new Event('data-loaded'));
  }
})();
