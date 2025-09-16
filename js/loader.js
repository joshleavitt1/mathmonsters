const PROGRESS_STORAGE_KEY = 'reefRangersProgress';

const readStoredProgress = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return null;
    }
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('Stored progress could not be read.', error);
    return null;
  }
};

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
    const storedProgress = readStoredProgress();
    const baseVariables =
      varsData && typeof varsData === 'object' ? varsData : {};
    const baseProgress =
      baseVariables && typeof baseVariables.progress === 'object'
        ? baseVariables.progress
        : {};
    const progress = { ...baseProgress };

    if (storedProgress && typeof storedProgress === 'object') {
      if (typeof storedProgress.battleLevel === 'number') {
        progress.battleLevel = storedProgress.battleLevel;
      }
      if (typeof storedProgress.timeRemainingSeconds === 'number') {
        progress.timeRemainingSeconds = storedProgress.timeRemainingSeconds;
      }
    }
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
    const variables = { ...baseVariables, progress };

    window.preloadedData = {
      variables,
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
