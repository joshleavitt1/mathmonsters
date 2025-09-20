(() => {
const STORAGE_KEY_PROGRESS = 'reefRangersProgress';
const FALLBACK_ASSET_BASE = '/mathmonsters';

const deriveBaseFromLocation = (fallbackBase) => {
  if (typeof window === 'undefined') {
    return fallbackBase || '.';
  }

  const rawFallback =
    typeof fallbackBase === 'string' ? fallbackBase.trim() : '';
  const locationPath =
    typeof window.location?.pathname === 'string'
      ? window.location.pathname
      : '';

  if (rawFallback && locationPath.startsWith(rawFallback)) {
    return fallbackBase;
  }

  const withoutQuery = locationPath.replace(/[?#].*$/, '');
  const trimmedPath = withoutQuery.replace(/\/+$/, '');
  const segments = trimmedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '.';
  }

  const lastSegment = segments[segments.length - 1] || '';
  const treatAsDirectory = lastSegment && !lastSegment.includes('.');
  const depth = treatAsDirectory ? segments.length : segments.length - 1;

  if (depth <= 0) {
    return '.';
  }

  return Array(depth).fill('..').join('/');
};

const determineAssetBasePath = () => {
  const fallbackBase = FALLBACK_ASSET_BASE;
  const doc = typeof document !== 'undefined' ? document : null;
  const currentScript = doc?.currentScript;
  const scriptedBase =
    typeof currentScript?.dataset?.assetBase === 'string'
      ? currentScript.dataset.assetBase.trim()
      : '';
  if (scriptedBase) {
    if (typeof window !== 'undefined') {
      window.mathMonstersAssetBase = scriptedBase;
    }
    return scriptedBase;
  }

  if (doc) {
    const taggedScript = doc.querySelector('script[data-asset-base]');
    const taggedBase =
      typeof taggedScript?.dataset?.assetBase === 'string'
        ? taggedScript.dataset.assetBase.trim()
        : '';
    if (taggedBase) {
      if (typeof window !== 'undefined') {
        window.mathMonstersAssetBase = taggedBase;
      }
      return taggedBase;
    }
  }

  if (typeof window !== 'undefined') {
    const globalBase =
      typeof window.mathMonstersAssetBase === 'string'
        ? window.mathMonstersAssetBase.trim()
        : '';
    if (globalBase) {
      return globalBase;
    }
  }

  const derivedBase = deriveBaseFromLocation(fallbackBase);
  if (typeof window !== 'undefined' && derivedBase) {
    window.mathMonstersAssetBase = derivedBase;
  }
  return derivedBase || fallbackBase;
};

const ASSET_BASE_PATH = determineAssetBasePath();

const normalizeAssetPath = (inputPath) => {
  if (typeof inputPath !== 'string') {
    return null;
  }

  let trimmed = inputPath.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith(ASSET_BASE_PATH)) {
    return trimmed;
  }

  let suffix = '';
  const suffixIndex = trimmed.search(/[?#]/);
  if (suffixIndex !== -1) {
    suffix = trimmed.slice(suffixIndex);
    trimmed = trimmed.slice(0, suffixIndex);
  }

  while (trimmed.startsWith('./')) {
    trimmed = trimmed.slice(2);
  }

  while (trimmed.startsWith('../')) {
    trimmed = trimmed.slice(3);
  }

  trimmed = trimmed.replace(/^\/+/, '');

  const fallbackNormalized = FALLBACK_ASSET_BASE.replace(/^\/+/, '');
  if (fallbackNormalized && trimmed.startsWith(`${fallbackNormalized}/`)) {
    trimmed = trimmed.slice(fallbackNormalized.length + 1);
  }

  const base = ASSET_BASE_PATH.endsWith('/')
    ? ASSET_BASE_PATH.slice(0, -1)
    : ASSET_BASE_PATH;

  return trimmed ? `${base}/${trimmed}${suffix}` : `${base}${suffix}`;
};

const resolveDataPath = (path) => {
  const trimmed = typeof path === 'string' ? path.trim() : '';
  if (!trimmed) {
    return normalizeAssetPath('data');
  }

  const normalized = trimmed.startsWith('data/')
    ? trimmed
    : trimmed.startsWith('/data/')
    ? trimmed.slice(1)
    : `data/${trimmed.replace(/^\/+/, '')}`;

  return normalizeAssetPath(normalized);
};

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
      fetch(resolveDataPath('variables.json')),
      fetch(resolveDataPath('levels.json')),
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
      if (typeof storedProgress.currentExperience === 'number') {
        progress.currentExperience = storedProgress.currentExperience;
      }
    }

    if (typeof progress.currentExperience !== 'number') {
      progress.currentExperience = 0;
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

    const resolveAssetPath = (path) => normalizeAssetPath(path);

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
        const questionPath = resolveDataPath(questionFile);
        if (!questionPath) {
          console.warn(`Questions file not found: ${questionFile}`);
        } else {
          const questionsRes = await fetch(questionPath);
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

    const getLevelEnemy = (experienceValue) => {
      const candidates = Object.entries(levelBattle)
        .filter(([key, value]) =>
          /^enemy/i.test(key) && value && typeof value === 'object'
        )
        .map(([, value]) => value);

      if (candidates.length === 0) {
        return levelBattle?.enemy ?? null;
      }

      const experienceString = String(experienceValue);
      const matchedEnemy = candidates.find((candidate) => {
        const candidateId = candidate?.id;
        if (candidateId === undefined || candidateId === null) {
          return false;
        }
        if (
          typeof candidateId === 'number' &&
          Number.isFinite(candidateId) &&
          typeof experienceValue === 'number' &&
          Number.isFinite(experienceValue)
        ) {
          return candidateId === experienceValue;
        }
        return String(candidateId) === experienceString;
      });

      if (matchedEnemy) {
        return matchedEnemy;
      }

      if (typeof experienceValue === 'number' && Number.isFinite(experienceValue)) {
        const boundedIndex = Math.min(
          Math.max(Math.floor(experienceValue), 0),
          candidates.length - 1
        );
        return candidates[boundedIndex];
      }

      return candidates[0];
    };

    const hero = {
      ...(levelBattle?.hero ?? {}),
      ...(activeUserBattle?.hero ?? {}),
    };
    const battle = { ...levelBattle, hero };
    let enemy = getLevelEnemy(progress.currentExperience);

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
})();
