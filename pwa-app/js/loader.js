const STORAGE_KEY_PROGRESS = 'reefRangersProgress';

const readStoredProgress = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return null;
    }
    const raw = storage.getItem(STORAGE_KEY_PROGRESS);
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
    const userBattles = Array.isArray(baseVariables?.user?.battles)
      ? baseVariables.user.battles
      : [];
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

    if (
      currentLevel &&
      typeof currentLevel.battleLevel === 'number' &&
      progress.battleLevel !== currentLevel.battleLevel
    ) {
      progress.battleLevel = currentLevel.battleLevel;
    }

    const resolveAssetPath = (path) => {
      if (typeof path !== 'string') {
        return null;
      }
      const trimmed = path.trim();
      if (!trimmed) {
        return null;
      }
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      if (trimmed.startsWith('../')) {
        return trimmed;
      }
      if (trimmed.startsWith('./')) {
        return `../${trimmed.slice(2)}`;
      }
      if (trimmed.startsWith('/')) {
        return `..${trimmed}`;
      }
      return `../${trimmed}`;
    };

    const preloadImage = (path) =>
      new Promise((resolve) => {
        if (!path || typeof Image === 'undefined') {
          resolve();
          return;
        }

        const img = new Image();
        const cleanup = () => {
          img.onload = null;
          img.onerror = null;
          resolve();
        };
        img.onload = cleanup;
        img.onerror = cleanup;
        img.src = path;
      });

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

    const resolveUserBattle = (level) => {
      if (typeof level !== 'number') {
        return null;
      }
      return (
        userBattles.find(
          (entry) => typeof entry?.battleLevel === 'number' && entry.battleLevel === level
        ) ?? null
      );
    };

    const activeUserBattle =
      resolveUserBattle(activeBattleLevel) ?? userBattles[0] ?? null;

    const levelBattle = currentLevel?.battle ?? {};
    const hero = {
      ...(levelBattle?.hero ?? {}),
      ...(activeUserBattle?.hero ?? {}),
    };
    const battle = { ...levelBattle, hero };
    let enemy = battle?.enemy ?? null;

    const heroSprite = resolveAssetPath(hero?.sprite);
    if (heroSprite) {
      hero.sprite = heroSprite;
    }

    const enemySprite = resolveAssetPath(enemy?.sprite);
    if (enemySprite) {
      enemy = { ...(enemy ?? {}), sprite: enemySprite };
      battle.enemy = enemy;
    }

    const assetsToPreload = [];
    if (heroSprite) {
      assetsToPreload.push(heroSprite);
    }
    if (enemySprite) {
      assetsToPreload.push(enemySprite);
    }
    const variables = { ...baseVariables, progress };

    if (assetsToPreload.length) {
      const uniqueAssets = Array.from(new Set(assetsToPreload));
      await Promise.all(uniqueAssets.map(preloadImage));
    }

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
