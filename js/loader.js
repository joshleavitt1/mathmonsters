(() => {
const STORAGE_KEY_PROGRESS = 'mathmonstersProgress';
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

const progressUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersProgress) || null;

if (!progressUtils) {
  throw new Error('Progress utilities are not available.');
}

const { isPlainObject, normalizeExperienceMap, mergeExperienceMaps } = progressUtils;

const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

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

const fetchPlayerProfile = async () => {
  const fetchFn = playerProfileUtils?.fetchPlayerProfile;
  if (typeof fetchFn !== 'function') {
    return null;
  }

  try {
    const profile = await fetchFn();
    return profile && typeof profile === 'object' ? profile : null;
  } catch (error) {
    console.warn('Failed to fetch remote player profile in loader.', error);
    return null;
  }
};

const syncRemoteBattleLevel = (playerData) => {
  if (!playerData) {
    return;
  }

  const syncFn = playerProfileUtils?.syncBattleLevelToStorage;
  if (typeof syncFn !== 'function') {
    return;
  }

  try {
    syncFn(playerData, STORAGE_KEY_PROGRESS);
  } catch (error) {
    console.warn('Failed to sync remote battle level in loader.', error);
  }
};

(async function () {
  try {
    const [playerRes, levelsRes] = await Promise.all([
      fetch(resolveDataPath('player.json')),
      fetch(resolveDataPath('levels.json')),
    ]);

    if (!playerRes.ok || !levelsRes.ok) {
      throw new Error('Failed to fetch required configuration data.');
    }

    const [playerJson, levelsData] = await Promise.all([
      playerRes.json(),
      levelsRes.json(),
    ]);

    let basePlayer =
      playerJson && typeof playerJson === 'object' ? playerJson : {};

    try {
      const remotePlayerData = await fetchPlayerProfile();
      if (remotePlayerData) {
        syncRemoteBattleLevel(remotePlayerData);
        basePlayer = remotePlayerData;
      }
    } catch (error) {
      console.warn('Unable to load remote player profile for battle.', error);
    }

    const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];
    const storedProgress = readStoredProgress();
    const baseProgress =
      basePlayer && typeof basePlayer.progress === 'object'
        ? basePlayer.progress
        : {};
    const baseBattleVariables =
      basePlayer && typeof basePlayer.battleVariables === 'object'
        ? basePlayer.battleVariables
        : {};
    const progress = { ...baseProgress };
    const battleVariables = { ...baseBattleVariables };
    let experienceMap = normalizeExperienceMap(progress?.experience);

    if (storedProgress && typeof storedProgress === 'object') {
      if (typeof storedProgress.battleLevel === 'number') {
        progress.battleLevel = storedProgress.battleLevel;
      }
      if (typeof storedProgress.timeRemainingSeconds === 'number') {
        battleVariables.timeRemainingSeconds =
          storedProgress.timeRemainingSeconds;
      }
      experienceMap = mergeExperienceMaps(experienceMap, storedProgress.experience);
    }

    experienceMap = normalizeExperienceMap(experienceMap);
    if (Object.keys(experienceMap).length > 0) {
      progress.experience = experienceMap;
    } else {
      delete progress.experience;
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

    const normalizeAttackSprites = (...spriteSources) => {
      const result = {};
      const allowedKeys = ['basic', 'super'];

      const extractSpritePath = (source, key) => {
        if (!source) {
          return null;
        }

        if (typeof source === 'string') {
          return key === 'basic' ? source : null;
        }

        if (!isPlainObject(source)) {
          return null;
        }

        if (typeof source[key] === 'string') {
          return source[key];
        }

        const legacyKey = `${key}Attack`;
        if (typeof source[legacyKey] === 'string') {
          return source[legacyKey];
        }

        if (isPlainObject(source.attackSprite) || isPlainObject(source.attackSprites)) {
          const nested = isPlainObject(source.attackSprite)
            ? source.attackSprite
            : source.attackSprites;
          if (typeof nested[key] === 'string') {
            return nested[key];
          }
        }

        if (typeof source.attackSprite === 'string' || typeof source.attackSprites === 'string') {
          const sprite = source.attackSprite || source.attackSprites;
          return key === 'basic' ? sprite : null;
        }

        return null;
      };

      spriteSources.forEach((source) => {
        allowedKeys.forEach((key) => {
          const spritePath = extractSpritePath(source, key);
          const resolvedPath = resolveAssetPath(spritePath);
          if (resolvedPath) {
            result[key] = resolvedPath;
          }
        });
      });

      if (!result.super && result.basic) {
        result.super = result.basic;
      }

      return result;
    };

    const mergeCharacterSources = (...sources) => {
      const merged = {};
      let hasData = false;

      sources.forEach((source) => {
        if (!isPlainObject(source)) {
          return;
        }

        hasData = true;
        Object.entries(source).forEach(([key, value]) => {
          if (value !== undefined) {
            merged[key] = value;
          }
        });
      });

      return hasData ? merged : null;
    };

    const characterAssetSet = new Set();
    let assetRegistrationEnabled = true;

    const registerAsset = (path) => {
      if (!assetRegistrationEnabled || typeof path !== 'string') {
        return;
      }

      const trimmed = path.trim();
      if (trimmed) {
        characterAssetSet.add(trimmed);
      }
    };

    const withAssetRegistration = (enabled, callback) => {
      const previousValue = assetRegistrationEnabled;
      assetRegistrationEnabled = Boolean(enabled);
      try {
        return callback();
      } finally {
        assetRegistrationEnabled = previousValue;
      }
    };

    const prepareCharacter = (...sources) => {
      const merged = mergeCharacterSources(...sources);
      if (!merged) {
        return null;
      }

      const normalized = { ...merged };

      const resolvedSprite = resolveAssetPath(merged.sprite);
      if (resolvedSprite) {
        normalized.sprite = resolvedSprite;
        registerAsset(resolvedSprite);
      } else {
        delete normalized.sprite;
      }

      const attackSprites = normalizeAttackSprites(merged);
      if (Object.keys(attackSprites).length > 0) {
        normalized.attackSprites = attackSprites;
        Object.values(attackSprites).forEach((spritePath) => {
          if (spritePath) {
            registerAsset(spritePath);
          }
        });
      } else {
        delete normalized.attackSprites;
      }

      delete normalized.attackSprite;
      delete normalized.basicAttack;
      delete normalized.superAttack;

      return normalized;
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

    const levelBattle = currentLevel?.battle ?? {};

    const resolvePlayerLevelData = (level) => {
      if (!basePlayer || typeof basePlayer !== 'object') {
        return null;
      }
      const levelMap = basePlayer.battleLevel;
      if (!levelMap || typeof levelMap !== 'object') {
        return null;
      }

      if (level === undefined || level === null) {
        return null;
      }

      if (level in levelMap && typeof levelMap[level] === 'object') {
        return levelMap[level];
      }

      const levelKey = String(level);
      if (levelKey in levelMap && typeof levelMap[levelKey] === 'object') {
        return levelMap[levelKey];
      }

      return null;
    };

    const playerHeroBase =
      basePlayer && typeof basePlayer.hero === 'object' ? basePlayer.hero : {};

    const playerLevelHeroMap = new Map();
    levels.forEach((level) => {
      if (!level || typeof level.battleLevel !== 'number') {
        return;
      }
      const levelData = resolvePlayerLevelData(level.battleLevel);
      if (levelData && typeof levelData.hero === 'object') {
        playerLevelHeroMap.set(level.battleLevel, levelData.hero);
      }
    });

    const levelCharacters = levels.map((level) => {
      const levelNumber = level?.battleLevel;
      const battleConfig =
        level && typeof level.battle === 'object' ? level.battle : {};
      const heroOverride =
        playerLevelHeroMap.get(levelNumber ?? undefined) ?? null;

      const shouldRegisterAssets =
        (Number.isFinite(activeBattleLevel) &&
          Number.isFinite(levelNumber) &&
          levelNumber === activeBattleLevel) ||
        level === currentLevel;

      return withAssetRegistration(shouldRegisterAssets, () => {
        const preparedHero = prepareCharacter(
          playerHeroBase,
          battleConfig?.hero,
          heroOverride
        );

        const monsters = [];
        const monsterLookup = new Set();
        const addMonster = (...sources) => {
          const preparedMonster = prepareCharacter(...sources);
          if (!preparedMonster) {
            return;
          }
          const key = JSON.stringify([
            preparedMonster.id ?? null,
            preparedMonster.name ?? null,
            preparedMonster.sprite ?? null,
          ]);
          if (monsterLookup.has(key)) {
            return;
          }
          monsterLookup.add(key);
          monsters.push(preparedMonster);
        };

        if (Array.isArray(battleConfig?.monsters)) {
          battleConfig.monsters.forEach((monster) => addMonster(monster));
        }

        if (battleConfig?.monster) {
          addMonster(battleConfig.monster);
        }

        return {
          battleLevel: Number.isFinite(levelNumber) ? levelNumber : null,
          hero: preparedHero,
          monsters,
        };
      });
    });

    const currentLevelCharacters =
      levelCharacters.find(
        (entry) => entry && entry.battleLevel === activeBattleLevel
      ) ||
      levelCharacters[0] ||
      { hero: null, monsters: [] };

    const hero = currentLevelCharacters.hero
      ? { ...currentLevelCharacters.hero }
      : prepareCharacter(
          playerHeroBase,
          levelBattle?.hero,
          playerLevelHeroMap.get(activeBattleLevel)
        ) || { ...playerHeroBase };

    const normalizedMonsters = (currentLevelCharacters.monsters || []).map(
      (monster) => ({ ...monster })
    );

    if (
      normalizedMonsters.length === 0 &&
      levelBattle &&
      typeof levelBattle.monster === 'object'
    ) {
      const fallbackMonster = prepareCharacter(levelBattle.monster);
      if (fallbackMonster) {
        normalizedMonsters.push({ ...fallbackMonster });
      }
    }

    const primaryMonster = normalizedMonsters[0] || {};

    const battle = {
      ...levelBattle,
      hero,
      monster: { ...primaryMonster },
    };

    if (normalizedMonsters.length > 0) {
      battle.monsters = normalizedMonsters;
    }

    const sortedLevelsByBattle = levels
      .slice()
      .filter((level) => Number.isFinite(level?.battleLevel))
      .sort((a, b) => a.battleLevel - b.battleLevel);

    const effectiveBattleLevel = Number.isFinite(activeBattleLevel)
      ? activeBattleLevel
      : Number.isFinite(currentLevel?.battleLevel)
      ? currentLevel.battleLevel
      : null;

    const currentLevelIndex = sortedLevelsByBattle.findIndex(
      (level) => level?.battleLevel === effectiveBattleLevel
    );

    if (currentLevelIndex !== -1) {
      const immediateNextLevel = sortedLevelsByBattle[currentLevelIndex + 1];
      if (immediateNextLevel && typeof immediateNextLevel === 'object') {
        const nextLevelBattle =
          typeof immediateNextLevel.battle === 'object'
            ? immediateNextLevel.battle
            : {};
        const nextLevelOverride = playerLevelHeroMap.get(
          immediateNextLevel.battleLevel
        );

        withAssetRegistration(true, () =>
          prepareCharacter(
            playerHeroBase,
            nextLevelBattle?.hero,
            nextLevelOverride
          )
        );
      }
    }

    if (characterAssetSet.size > 0) {
      await Promise.all(
        Array.from(characterAssetSet).map((assetPath) => preloadImage(assetPath))
      );
    }

    window.preloadedData = {
      player: {
        ...basePlayer,
        progress,
        battleVariables,
      },
      progress,
      battleVariables,
      levels,
      level: currentLevel,
      battle,
      hero,
      monster: battle.monster,
      charactersByLevel: levelCharacters,
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
