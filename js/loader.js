(() => {
const STORAGE_KEY_PROGRESS = 'mathmonstersProgress';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const FALLBACK_ASSET_BASE = '/mathmonsters';
const PRELOADED_SPRITES_STORAGE_KEY = 'mathmonstersPreloadedSprites';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';

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

  if (rawFallback) {
    let fallbackNormalized = rawFallback;
    if (fallbackNormalized !== '/') {
      fallbackNormalized = fallbackNormalized.replace(/\/+$/, '');
    }
    if (fallbackNormalized && !fallbackNormalized.startsWith('/')) {
      fallbackNormalized = `/${fallbackNormalized}`;
    }
    if (!fallbackNormalized) {
      fallbackNormalized = '/';
    }
    const matchesFallback =
      locationPath === fallbackNormalized ||
      (fallbackNormalized !== '/' &&
        locationPath.startsWith(`${fallbackNormalized}/`));
    if (matchesFallback) {
      return fallbackBase;
    }
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

const toAbsoluteAssetUrl = (path) => {
  if (typeof path !== 'string' || !path) {
    return null;
  }

  if (typeof document === 'undefined' || typeof document.baseURI !== 'string') {
    return path;
  }

  try {
    return new URL(path, document.baseURI).href;
  } catch (error) {
    return path;
  }
};

const spriteElementCache = (() => {
  if (typeof window !== 'undefined') {
    if (window.mathMonstersSpriteCache instanceof Map) {
      return window.mathMonstersSpriteCache;
    }

    const cache = new Map();
    window.mathMonstersSpriteCache = cache;
    return cache;
  }

  return new Map();
})();

const toSpriteCacheKey = (path) => {
  if (typeof path !== 'string') {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }

  const absolute = toAbsoluteAssetUrl(trimmed);
  return absolute || trimmed;
};

const registerSpriteElement = (path, image) => {
  if (!image) {
    return;
  }

  const cacheKey = toSpriteCacheKey(path);
  if (!cacheKey) {
    return;
  }

  spriteElementCache.set(cacheKey, image);

  if (typeof window !== 'undefined') {
    window.mathMonstersSpriteCache = spriteElementCache;
  }
};

const readPreloadedSpriteSet = () => {
  const result = new Set();

  if (
    typeof window !== 'undefined' &&
    window.mathMonstersPreloadedSprites instanceof Set
  ) {
    window.mathMonstersPreloadedSprites.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        result.add(value.trim());
      }
    });
  }

  if (typeof sessionStorage === 'undefined') {
    return result;
  }

  try {
    const stored = sessionStorage.getItem(PRELOADED_SPRITES_STORAGE_KEY);
    if (!stored) {
      return result;
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      parsed.forEach((value) => {
        if (typeof value === 'string' && value.trim()) {
          result.add(value.trim());
        }
      });
    }
  } catch (error) {
    console.warn('Unable to read preloaded sprite list.', error);
  }

  return result;
};

const writePreloadedSpriteSet = (spriteSet) => {
  if (!(spriteSet instanceof Set)) {
    return;
  }

  if (typeof window !== 'undefined') {
    window.mathMonstersPreloadedSprites = new Set(spriteSet);
  }

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    const serialized = JSON.stringify(
      Array.from(spriteSet).filter((value) => typeof value === 'string' && value.trim())
    );
    sessionStorage.setItem(PRELOADED_SPRITES_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Unable to persist preloaded sprite list.', error);
  }
};

const persistNextBattleSnapshot = (snapshot) => {
  if (typeof window !== 'undefined' && snapshot && typeof snapshot === 'object') {
    window.mathMonstersBattleSnapshot = snapshot;
  }

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (!snapshot || typeof snapshot !== 'object') {
      sessionStorage.removeItem(NEXT_BATTLE_SNAPSHOT_STORAGE_KEY);
      return;
    }

    const normalized = {
      currentLevel: Number.isFinite(snapshot.currentLevel)
        ? snapshot.currentLevel
        : null,
      hero:
        snapshot.hero && typeof snapshot.hero === 'object'
          ? {
              name:
                typeof snapshot.hero.name === 'string'
                  ? snapshot.hero.name
                  : null,
              sprite:
                typeof snapshot.hero.sprite === 'string'
                  ? snapshot.hero.sprite
                  : null,
            }
          : null,
      monster:
        snapshot.monster && typeof snapshot.monster === 'object'
          ? {
              name:
                typeof snapshot.monster.name === 'string'
                  ? snapshot.monster.name
                  : null,
              sprite:
                typeof snapshot.monster.sprite === 'string'
                  ? snapshot.monster.sprite
                  : null,
            }
          : null,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(
      NEXT_BATTLE_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  } catch (error) {
    console.warn('Unable to persist next battle snapshot.', error);
  }
};

const ASSET_BASE_PATH = determineAssetBasePath();

const progressUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersProgress) || null;

if (!progressUtils) {
  throw new Error('Progress utilities are not available.');
}

const { isPlainObject, normalizeExperienceMap, mergeExperienceMaps } =
  progressUtils;

const readStoredPlayerProfile = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = window.sessionStorage;
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('Stored player profile unavailable in loader.', error);
    return null;
  }
};

const mergeHeroData = (baseHero, overrideHero) => {
  const base = isPlainObject(baseHero) ? baseHero : null;
  const override = isPlainObject(overrideHero) ? overrideHero : null;

  if (!base && !override) {
    return null;
  }

  return {
    ...(base || {}),
    ...(override || {}),
  };
};

const mergeCurrentLevelMap = (baseMap, overrideMap) => {
  const base = isPlainObject(baseMap) ? baseMap : null;
  const override = isPlainObject(overrideMap) ? overrideMap : null;

  if (!base && !override) {
    return null;
  }

  const merged = {};
  const keys = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(override || {}),
  ]);

  keys.forEach((key) => {
    const baseEntry = isPlainObject(base?.[key]) ? base[key] : null;
    const overrideEntry = isPlainObject(override?.[key])
      ? override[key]
      : null;

    if (!baseEntry && !overrideEntry) {
      return;
    }

    const mergedEntry = {
      ...(baseEntry || {}),
      ...(overrideEntry || {}),
    };

    const mergedHero = mergeHeroData(baseEntry?.hero, overrideEntry?.hero);
    if (mergedHero) {
      mergedEntry.hero = mergedHero;
    }

    merged[key] = mergedEntry;
  });

  return merged;
};

const mergePlayerData = (basePlayer, overridePlayer) => {
  const base = isPlainObject(basePlayer) ? basePlayer : null;
  const override = isPlainObject(overridePlayer) ? overridePlayer : null;

  if (!base && !override) {
    return {};
  }

  const merged = {
    ...(base || {}),
    ...(override || {}),
  };

  const mergedHero = mergeHeroData(base?.hero, override?.hero);
  if (mergedHero) {
    merged.hero = mergedHero;
  }

  const mergedCurrentLevel = mergeCurrentLevelMap(
    base?.currentLevel,
    override?.currentLevel
  );
  if (mergedCurrentLevel) {
    merged.currentLevel = mergedCurrentLevel;
  }

  return merged;
};

const mergeProgressState = (baseProgress, storedProgress) => {
  const base = isPlainObject(baseProgress) ? baseProgress : null;
  const stored = isPlainObject(storedProgress) ? storedProgress : null;

  if (!base && !stored) {
    return {};
  }

  const result = { ...(base || {}) };

  if (!stored) {
    return result;
  }

  Object.entries(stored).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (key === 'experience') {
      const mergedExperience = mergeExperienceMaps(result.experience, value);
      if (Object.keys(mergedExperience).length > 0) {
        result.experience = mergedExperience;
      } else {
        delete result.experience;
      }
      return;
    }

    if (isPlainObject(value)) {
      result[key] = mergeProgressState(result[key], value);
      return;
    }

    result[key] = value;
  });

  return result;
};

const mergePlayerWithStoredProfile = (player, storedProfile) => {
  if (!storedProfile || typeof storedProfile !== 'object') {
    return player;
  }

  const nextPlayer =
    player && typeof player === 'object' ? { ...player } : {};

  const storedHero = isPlainObject(storedProfile.hero)
    ? storedProfile.hero
    : null;

  if (storedHero) {
    const mergedHero = mergeHeroData(nextPlayer.hero, storedHero);
    if (mergedHero) {
      nextPlayer.hero = mergedHero;
    }
  }

  if (!nextPlayer.id && typeof storedProfile.id === 'string') {
    nextPlayer.id = storedProfile.id;
  }

  if (isPlainObject(storedProfile.battleVariables)) {
    nextPlayer.battleVariables = isPlainObject(nextPlayer.battleVariables)
      ? { ...storedProfile.battleVariables, ...nextPlayer.battleVariables }
      : { ...storedProfile.battleVariables };
  }

  if (isPlainObject(storedProfile.progress)) {
    const mergedProgress = mergeProgressState(
      nextPlayer.progress,
      storedProfile.progress
    );

    if (Object.keys(mergedProgress).length > 0) {
      nextPlayer.progress = mergedProgress;
    } else {
      delete nextPlayer.progress;
    }
  }

  if (isPlainObject(storedProfile.currentLevel)) {
    const mergedCurrentLevel = mergeCurrentLevelMap(
      storedProfile.currentLevel,
      nextPlayer.currentLevel
    );
    if (mergedCurrentLevel) {
      nextPlayer.currentLevel = mergedCurrentLevel;
    }
  }

  return nextPlayer;
};

const extractPlayerData = (rawPlayerData) => {
  if (!rawPlayerData || typeof rawPlayerData !== 'object') {
    return {};
  }

  if (
    typeof rawPlayerData.player === 'object' &&
    rawPlayerData.player !== null &&
    !Array.isArray(rawPlayerData.player)
  ) {
    return rawPlayerData.player;
  }

  return rawPlayerData;
};

const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

const sanitizeHeroSpritePath = (path) => {
  if (typeof path !== 'string') {
    return path;
  }

  return path.replace(
    /(shellfin)_(?:level|evolution)_(\d+)((?:\.[a-z0-9]+)?)(?=[?#]|$)/gi,
    (match, heroName, level, extension = '') => {
      const parsedLevel = Number(level);
      const safeLevel = Number.isFinite(parsedLevel)
        ? Math.max(parsedLevel, 1)
        : 1;

      return `${heroName}_evolution_${safeLevel}${extension || ''}`;
    }
  );
};

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

const normalizeCurrentLevel = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const updateHeroAssetForLevel = (path) => {
  if (typeof path !== 'string') {
    return path;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return path;
  }

  return sanitizeHeroSpritePath(trimmed);
};

const applyAssetsForHeroLevel = (hero) => {
  if (!isPlainObject(hero)) {
    return;
  }

  if (typeof hero.sprite === 'string') {
    hero.sprite = updateHeroAssetForLevel(hero.sprite);
  }

  if (typeof hero.attackSprite === 'string') {
    hero.attackSprite = updateHeroAssetForLevel(hero.attackSprite);
  }

  if (isPlainObject(hero.attackSprites)) {
    Object.keys(hero.attackSprites).forEach((key) => {
      const spritePath = hero.attackSprites[key];
      if (typeof spritePath === 'string') {
        hero.attackSprites[key] = updateHeroAssetForLevel(spritePath);
      }
    });
  }
};
const applyHeroLevelAssets = (player) => {
  if (!isPlainObject(player)) {
    return;
  }

  const baseHero = isPlainObject(player.hero) ? player.hero : null;

  if (baseHero) {
    applyAssetsForHeroLevel(baseHero);
  }

  const currentLevelMap = isPlainObject(player.currentLevel)
    ? player.currentLevel
    : null;

  if (!currentLevelMap) {
    return;
  }

  Object.values(currentLevelMap).forEach((levelData) => {
    if (!isPlainObject(levelData)) {
      return;
    }

    const levelHero = isPlainObject(levelData.hero) ? levelData.hero : null;
    if (!levelHero) {
      return;
    }

    applyAssetsForHeroLevel(levelHero);
  });
};

const collectMathTypeCandidates = (source, accumulator = new Set()) => {
  if (!source || typeof source !== 'object') {
    return accumulator;
  }

  const tryAdd = (value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        accumulator.add(trimmed.toLowerCase());
      }
    }
  };

  const candidateKeys = [
    'currentMathType',
    'activeMathType',
    'mathType',
    'selectedMathType',
    'defaultMathType',
  ];

  candidateKeys.forEach((key) => tryAdd(source[key]));

  if (source.battle && typeof source.battle === 'object') {
    candidateKeys.forEach((key) => tryAdd(source.battle[key]));
  }

  if (source.battleVariables && typeof source.battleVariables === 'object') {
    candidateKeys.forEach((key) => tryAdd(source.battleVariables[key]));
  }

  if (source.progress && typeof source.progress === 'object') {
    candidateKeys.forEach((key) => tryAdd(source.progress[key]));
  }

  if (source.preferences && typeof source.preferences === 'object') {
    candidateKeys.forEach((key) => tryAdd(source.preferences[key]));
  }

  if (source.player && typeof source.player === 'object') {
    collectMathTypeCandidates(source.player, accumulator);
  }

  return accumulator;
};

const findMathProgressEntry = (progressRoot, candidates = []) => {
  if (!isPlainObject(progressRoot)) {
    return { key: null, entry: null, container: null };
  }

  const normalizedCandidates = candidates
    .map((candidate) =>
      typeof candidate === 'string' && candidate.trim()
        ? candidate.trim().toLowerCase()
        : ''
    )
    .filter(Boolean);

  const normalizedCandidateSet = new Set(normalizedCandidates);

  const isProgressEntry = (value) =>
    isPlainObject(value) && value.currentLevel !== undefined;

  const pickEntry = (container, key) => {
    if (!isPlainObject(container) || typeof key !== 'string') {
      return null;
    }

    const entry = container[key];
    return isProgressEntry(entry) ? { key, entry, container } : null;
  };

  const shouldPrioritizeContainerKey = (key) => {
    if (typeof key !== 'string') {
      return false;
    }

    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) {
      return false;
    }

    if (normalizedCandidateSet.has(normalizedKey)) {
      return true;
    }

    const prioritizedPatterns = [
      'math',
      'type',
      'progress',
      'category',
      'subject',
      'collection',
      'map',
      'entry',
      'level',
    ];

    return prioritizedPatterns.some((pattern) =>
      normalizedKey.includes(pattern)
    );
  };

  const visited = new Set();

  const searchContainer = (container) => {
    if (!isPlainObject(container) || visited.has(container)) {
      return null;
    }

    visited.add(container);

    const keys = Object.keys(container);

    for (const candidate of normalizedCandidates) {
      const matchKey = keys.find((key) => {
        if (typeof key !== 'string') {
          return false;
        }
        return key.trim().toLowerCase() === candidate;
      });

      if (matchKey) {
        const match = pickEntry(container, matchKey);
        if (match) {
          return match;
        }
      }
    }

    for (const key of keys) {
      const match = pickEntry(container, key);
      if (match) {
        return match;
      }
    }

    const nestedKeys = keys
      .filter((key) => {
        if (typeof key !== 'string') {
          return false;
        }

        const value = container[key];
        return isPlainObject(value) && !isProgressEntry(value);
      })
      .sort((a, b) => {
        const aPriority = shouldPrioritizeContainerKey(a) ? 0 : 1;
        const bPriority = shouldPrioritizeContainerKey(b) ? 0 : 1;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return 0;
      });

    for (const key of nestedKeys) {
      const value = container[key];
      const match = searchContainer(value);
      if (match) {
        return match;
      }
    }

    return null;
  };

  const match = searchContainer(progressRoot);

  if (match) {
    return match;
  }

  return { key: normalizedCandidates[0] || null, entry: null, container: null };
};

const normalizeLevelList = (levels, mathTypeKey) => {
  if (!Array.isArray(levels)) {
    return [];
  }

  return levels
    .map((level, index) => {
      if (!level || typeof level !== 'object') {
        return null;
      }

      const normalizedLevel = { ...level };

      if (mathTypeKey && typeof mathTypeKey === 'string' && !normalizedLevel.mathType) {
        normalizedLevel.mathType = mathTypeKey;
      }

      const resolvedCurrentLevel =
        normalizeCurrentLevel(level?.currentLevel) ??
        normalizeCurrentLevel(level?.level) ??
        normalizeCurrentLevel(level?.id) ??
        normalizeCurrentLevel(index + 1);

      if (resolvedCurrentLevel !== null) {
        normalizedLevel.currentLevel = resolvedCurrentLevel;
      } else {
        delete normalizedLevel.currentLevel;
      }

      return normalizedLevel;
    })
    .filter(Boolean);
};

const collectLevelsFromMathType = (mathTypeConfig) => {
  if (!mathTypeConfig || typeof mathTypeConfig !== 'object') {
    return [];
  }

  const collected = [];
  const seen = new Set();
  let fallbackIndex = 0;

  const addLevel = (level) => {
    if (!level || typeof level !== 'object') {
      return;
    }

    const normalizedCurrentLevel =
      normalizeCurrentLevel(level?.currentLevel) ??
      normalizeCurrentLevel(level?.level) ??
      normalizeCurrentLevel(level?.id);

    const dedupeKey =
      normalizedCurrentLevel !== null
        ? `current:${normalizedCurrentLevel}`
        : typeof level?.id === 'string'
        ? `id:${level.id.trim().toLowerCase()}`
        : `fallback:${fallbackIndex++}`;

    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    collected.push(level);
  };

  const visit = (node) => {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => visit(item));
      return;
    }

    if (typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node.levels)) {
      node.levels.forEach((level) => addLevel(level));
    }

    Object.keys(node).forEach((key) => {
      if (key === 'levels') {
        return;
      }
      visit(node[key]);
    });
  };

  visit(mathTypeConfig);
  return collected;
};

const createLevelBattleNormalizer = (mathTypeConfig) => {
  const monsterConfig =
    isPlainObject(mathTypeConfig) && isPlainObject(mathTypeConfig.monsterSprites)
      ? mathTypeConfig.monsterSprites
      : {};
  const uniquePerLevel = Boolean(monsterConfig.uniquePerLevel);
  const bossMap = isPlainObject(monsterConfig.bosses)
    ? monsterConfig.bosses
    : {};

  const poolEntries = Object.entries(monsterConfig)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => [
      key,
      value.filter((entry) => isPlainObject(entry)),
    ])
    .filter(([, value]) => value.length > 0);

  const poolMap = new Map(poolEntries);
  const poolOrder = poolEntries.map(([key]) => key);
  const defaultPoolKey = poolMap.has('standardPool')
    ? 'standardPool'
    : poolOrder[0] ?? null;

  const poolIndices = new Map();
  const levelUsage = new Map();

  const resolveBossForLevel = (levelKey) => {
    if (levelKey === undefined || levelKey === null) {
      return null;
    }
    if (isPlainObject(bossMap[levelKey])) {
      return bossMap[levelKey];
    }
    const stringKey = String(levelKey);
    return isPlainObject(bossMap[stringKey]) ? bossMap[stringKey] : null;
  };

  const takeFromPool = (requestedPool, levelKey) => {
    if (!poolMap.size) {
      return null;
    }

    const poolKey = poolMap.has(requestedPool)
      ? requestedPool
      : defaultPoolKey;
    if (!poolKey || !poolMap.has(poolKey)) {
      return null;
    }

    const pool = poolMap.get(poolKey);
    if (!pool || pool.length === 0) {
      return null;
    }

    const usedKey = `${levelKey ?? ''}:${poolKey}`;
    const usedSet = uniquePerLevel
      ? levelUsage.get(usedKey) ?? new Set()
      : null;

    const recordUsage = (index) => {
      poolIndices.set(poolKey, index + 1);
      if (usedSet) {
        usedSet.add(index);
        levelUsage.set(usedKey, usedSet);
      }
    };

    if (usedSet) {
      const availableIndices = [];
      for (let i = 0; i < pool.length; i += 1) {
        if (!usedSet.has(i)) {
          availableIndices.push(i);
        }
      }

      if (availableIndices.length > 0) {
        const randomPosition = Math.floor(Math.random() * availableIndices.length);
        const selectedIndex = availableIndices[randomPosition];
        recordUsage(selectedIndex);
        return pool[selectedIndex];
      }
    }

    const startIndex = poolIndices.get(poolKey) ?? 0;
    for (let attempt = 0; attempt < pool.length; attempt += 1) {
      const index = (startIndex + attempt) % pool.length;
      if (usedSet && usedSet.has(index)) {
        continue;
      }
      recordUsage(index);
      return pool[index];
    }

    const fallbackIndex = startIndex % pool.length;
    recordUsage(fallbackIndex);
    return pool[fallbackIndex];
  };

  const applyDefaultStats = (character) => {
    if (!isPlainObject(character)) {
      return character;
    }

    const defaults = isPlainObject(mathTypeConfig?.defaultStats)
      ? mathTypeConfig.defaultStats
      : null;
    if (!defaults) {
      return character;
    }

    ['attack', 'health', 'damage'].forEach((statKey) => {
      if (character[statKey] === undefined && defaults[statKey] !== undefined) {
        character[statKey] = defaults[statKey];
      }
    });

    return character;
  };

  const assignFromEntry = (target, entry) => {
    if (!isPlainObject(target) || !isPlainObject(entry)) {
      return;
    }
    if (
      typeof entry.sprite === 'string' &&
      entry.sprite.trim() &&
      (typeof target.sprite !== 'string' || !target.sprite.trim())
    ) {
      target.sprite = entry.sprite.trim();
    }
    if (!target.name && typeof entry.name === 'string') {
      target.name = entry.name.trim();
    }
    if (!target.id && typeof entry.id === 'string') {
      target.id = entry.id;
    }
  };

  const normalizeMonster = (monsterConfig, context = {}) => {
    if (!isPlainObject(monsterConfig)) {
      monsterConfig = {};
    }

    const normalized = { ...monsterConfig };
    const levelKey = context.levelKey ?? null;
    const battleType = context.battleType ?? null;

    const needsSprite =
      typeof normalized.sprite !== 'string' || !normalized.sprite.trim();

    if (needsSprite) {
      const poolCandidates = [];
      if (typeof normalized.spritePool === 'string') {
        poolCandidates.push(normalized.spritePool.trim());
      }
      if (typeof normalized.pool === 'string') {
        poolCandidates.push(normalized.pool.trim());
      }

      let resolvedEntry = null;
      for (const candidate of poolCandidates) {
        resolvedEntry = takeFromPool(candidate, levelKey);
        if (resolvedEntry) {
          assignFromEntry(normalized, resolvedEntry);
          break;
        }
      }

      if (!resolvedEntry && battleType === 'boss') {
        const bossEntry = resolveBossForLevel(levelKey);
        if (bossEntry) {
          assignFromEntry(normalized, bossEntry);
          resolvedEntry = bossEntry;
        }
      }

      if (!resolvedEntry) {
        const fallbackEntry = takeFromPool(poolCandidates[0] ?? defaultPoolKey, levelKey);
        if (fallbackEntry) {
          assignFromEntry(normalized, fallbackEntry);
        }
      }

      if (!resolvedEntry) {
        const bossEntry = resolveBossForLevel(levelKey);
        if (bossEntry) {
          assignFromEntry(normalized, bossEntry);
        }
      }
    }

    if (typeof normalized.sprite !== 'string' || !normalized.sprite.trim()) {
      return null;
    }

    return applyDefaultStats(normalized);
  };

  const normalizeMonstersList = (monsters, context = {}) => {
    if (!Array.isArray(monsters)) {
      return [];
    }
    return monsters
      .map((monster) => normalizeMonster(monster, context))
      .filter(Boolean);
  };

  const normalizeBattle = (battleConfig, context = {}) => {
    if (!isPlainObject(battleConfig)) {
      return null;
    }

    const normalizedBattle = { ...battleConfig };

    if (isPlainObject(normalizedBattle.hero)) {
      normalizedBattle.hero = applyDefaultStats({ ...normalizedBattle.hero });
    }

    const monsterContext = {
      ...context,
      battleType: normalizedBattle.type,
    };

    const monsters = normalizeMonstersList(normalizedBattle.monsters, monsterContext);
    const primaryMonster =
      normalizeMonster(normalizedBattle.monster, monsterContext) ||
      monsters[0] ||
      null;

    if (primaryMonster) {
      normalizedBattle.monster = primaryMonster;
    } else {
      delete normalizedBattle.monster;
    }

    if (monsters.length) {
      normalizedBattle.monsters = monsters;
    } else {
      delete normalizedBattle.monsters;
    }

    return normalizedBattle;
  };

  return (level, index) => {
    if (!isPlainObject(level)) {
      return level;
    }

    const normalizedLevel = { ...level };
    const levelKey =
      normalizeCurrentLevel(level?.currentLevel) ??
      normalizeCurrentLevel(level?.level) ??
      normalizeCurrentLevel(index + 1);

    const context = { levelKey };

    const directBattle = normalizeBattle(level.battle, context);

    const topLevelBattleConfig = (() => {
      const source = {};

      if (level && typeof level === 'object') {
        if (level.monster !== undefined) {
          source.monster = level.monster;
        }
        if (Array.isArray(level.monsters) && level.monsters.length > 0) {
          source.monsters = level.monsters;
        }
        if (level.questionReference !== undefined) {
          source.questionReference = level.questionReference;
        }
        if (level.questions !== undefined) {
          source.questions = level.questions;
        }
      }

      if (Object.keys(source).length === 0) {
        return null;
      }

      return normalizeBattle(source, context);
    })();

    const battleEntries = [
      topLevelBattleConfig,
      ...(Array.isArray(level.battles)
        ? level.battles
            .map((entry) => normalizeBattle(entry, context))
            .filter(Boolean)
        : []),
    ].filter(Boolean);

    let chosenBattle = directBattle;

    const aggregatedMonsters = battleEntries
      .flatMap((entry) => {
        const monsters = [];
        if (entry?.monster) {
          monsters.push(entry.monster);
        }
        if (Array.isArray(entry?.monsters)) {
          entry.monsters.forEach((monster) => {
            if (monster) {
              monsters.push(monster);
            }
          });
        }
        return monsters;
      })
      .filter(Boolean);

    if (!chosenBattle && battleEntries.length) {
      chosenBattle = battleEntries[0];
    }

    if (chosenBattle) {
      if (!chosenBattle.monster && aggregatedMonsters.length) {
        chosenBattle = {
          ...chosenBattle,
          monster: aggregatedMonsters[0],
        };
      }

      if (aggregatedMonsters.length && !chosenBattle.monsters) {
        chosenBattle = {
          ...chosenBattle,
          monsters: aggregatedMonsters,
        };
      }

      if (topLevelBattleConfig) {
        if (!chosenBattle.questions && topLevelBattleConfig.questions) {
          chosenBattle = {
            ...chosenBattle,
            questions: topLevelBattleConfig.questions,
          };
        }

        if (
          !chosenBattle.questionReference &&
          topLevelBattleConfig.questionReference
        ) {
          chosenBattle = {
            ...chosenBattle,
            questionReference: topLevelBattleConfig.questionReference,
          };
        }
      }
    }

    if (chosenBattle) {
      normalizedLevel.battle = chosenBattle;
    } else {
      delete normalizedLevel.battle;
    }

    return normalizedLevel;
  };
};

const deriveMathTypeLevels = (levelsData, ...playerSources) => {
  const fallbackLevels = normalizeLevelList(
    Array.isArray(levelsData?.levels) ? levelsData.levels : [],
    null
  );

  const mathTypes =
    levelsData && typeof levelsData.mathTypes === 'object'
      ? levelsData.mathTypes
      : null;

  if (!mathTypes) {
    return { levels: fallbackLevels, mathTypeKey: null };
  }

  const entries = Object.entries(mathTypes).filter(
    ([, value]) => value && typeof value === 'object'
  );

  if (!entries.length) {
    return { levels: fallbackLevels, mathTypeKey: null };
  }

  const candidateSet = new Set();
  playerSources.forEach((source) => collectMathTypeCandidates(source, candidateSet));

  const normalizedCandidates = Array.from(candidateSet);

  const findMatch = (predicate) => entries.find(([key, value]) => predicate(key, value));

  let selectedEntry =
    findMatch((key) => normalizedCandidates.includes(String(key).trim().toLowerCase())) ??
    findMatch((_, value) => {
      if (!value || typeof value !== 'object') {
        return false;
      }
      const metaKeys = ['id', 'key', 'code', 'name', 'label'];
      return metaKeys.some((metaKey) => {
        const metaValue = value[metaKey];
        return (
          typeof metaValue === 'string' &&
          normalizedCandidates.includes(metaValue.trim().toLowerCase())
        );
      });
    });

  if (!selectedEntry) {
    selectedEntry = entries[0];
  }

  const [selectedKey, selectedData] = selectedEntry;

  const collectedLevels = collectLevelsFromMathType(selectedData);
  const normalizedLevels = collectedLevels.length
    ? normalizeLevelList(collectedLevels, selectedKey)
    : normalizeLevelList(fallbackLevels, selectedKey);

  const sortedLevels = normalizedLevels
    .map((level, index) => ({ level, index }))
    .sort((a, b) => {
      const levelA = normalizeCurrentLevel(a.level?.currentLevel);
      const levelB = normalizeCurrentLevel(b.level?.currentLevel);

      if (levelA === null && levelB === null) {
        return a.index - b.index;
      }

      if (levelA === null) {
        return 1;
      }

      if (levelB === null) {
        return -1;
      }

      if (levelA === levelB) {
        return a.index - b.index;
      }

      return levelA - levelB;
    })
    .map(({ level }) => level);

  const mathTypeLabelCandidate =
    selectedData && typeof selectedData === 'object'
      ? typeof selectedData.name === 'string'
        ? selectedData.name
        : typeof selectedData.label === 'string'
        ? selectedData.label
        : null
      : null;

  const mathTypeLabel =
    typeof mathTypeLabelCandidate === 'string' && mathTypeLabelCandidate.trim()
      ? mathTypeLabelCandidate.trim()
      : null;

  const normalizeBattleForLevel = createLevelBattleNormalizer(selectedData);
  const decoratedLevels = sortedLevels.map((level, index) =>
    normalizeBattleForLevel(level, index)
  );

  return {
    levels: decoratedLevels,
    mathTypeKey: typeof selectedKey === 'string' ? selectedKey : null,
    mathTypeLabel,
  };
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

const syncRemoteCurrentLevel = (playerData) => {
  if (!playerData) {
    return;
  }

  const syncFn = playerProfileUtils?.syncCurrentLevelToStorage;
  if (typeof syncFn !== 'function') {
    return;
  }

  try {
    syncFn(playerData, STORAGE_KEY_PROGRESS);
  } catch (error) {
    console.warn('Failed to sync remote current level in loader.', error);
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

    const localPlayerData =
      playerJson && typeof playerJson === 'object' ? playerJson : {};

    const storedPlayerProfile = readStoredPlayerProfile();

    let basePlayer = extractPlayerData(localPlayerData);
    basePlayer = mergePlayerWithStoredProfile(basePlayer, storedPlayerProfile);

    try {
      const remotePlayerData = await fetchPlayerProfile();
      if (remotePlayerData) {
        syncRemoteCurrentLevel(remotePlayerData);
        const extractedRemotePlayer = extractPlayerData(remotePlayerData);
        const mergedRemotePlayer = mergePlayerData(
          basePlayer,
          extractedRemotePlayer
        );
        basePlayer = mergePlayerWithStoredProfile(
          mergedRemotePlayer,
          storedPlayerProfile
        );
      }
    } catch (error) {
      console.warn('Unable to load remote player profile for battle.', error);
    }

    applyHeroLevelAssets(basePlayer);
    const localPlayer = extractPlayerData(localPlayerData);
    if (localPlayer) {
      applyHeroLevelAssets(localPlayer);
    }

    const {
      levels: derivedLevels,
      mathTypeKey,
      mathTypeLabel,
    } = deriveMathTypeLevels(
      levelsData,
      basePlayer,
      playerJson
    );
    const levels = Array.isArray(derivedLevels) ? derivedLevels : [];
    const storedProgress = readStoredProgress();
    const baseProgress =
      basePlayer && typeof basePlayer.progress === 'object'
        ? basePlayer.progress
        : {};
    const baseBattleVariables =
      basePlayer && typeof basePlayer.battleVariables === 'object'
        ? basePlayer.battleVariables
        : {};
    const progress = mergeProgressState(baseProgress, storedProgress);
    const battleVariables = { ...baseBattleVariables };
    const sanitizeGemValue = (value) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return null;
      }
      return Math.max(0, Math.round(numericValue));
    };

    let experienceMap = normalizeExperienceMap(progress?.experience);

    if (storedProgress && typeof storedProgress === 'object') {
      const storedCurrentLevel = normalizeCurrentLevel(
        storedProgress.currentLevel
      );
      if (storedCurrentLevel !== null) {
        progress.currentLevel = storedCurrentLevel;
      }

      if (typeof storedProgress.timeRemainingSeconds === 'number') {
        battleVariables.timeRemainingSeconds =
          storedProgress.timeRemainingSeconds;
      }
    }

    const gemCandidates = [
      sanitizeGemValue(progress?.gems),
      sanitizeGemValue(storedProgress?.gems),
      sanitizeGemValue(storedProgress?.progress?.gems),
      sanitizeGemValue(basePlayer?.gems),
    ].filter((value) => value !== null);

    if (gemCandidates.length > 0) {
      const resolvedGemTotal = Math.max(...gemCandidates);
      progress.gems = resolvedGemTotal;
      if (isPlainObject(basePlayer)) {
        basePlayer.gems = resolvedGemTotal;
      }
    } else if (Object.prototype.hasOwnProperty.call(progress, 'gems')) {
      delete progress.gems;
    }

    const gemsAwardedCandidates = [
      sanitizeGemValue(progress?.gemsAwarded),
      sanitizeGemValue(storedProgress?.gemsAwarded),
    ].filter((value) => value !== null);

    if (gemsAwardedCandidates.length > 0) {
      const resolvedAwarded = Math.max(...gemsAwardedCandidates);
      if (resolvedAwarded > 0) {
        progress.gemsAwarded = resolvedAwarded;
      } else if (Object.prototype.hasOwnProperty.call(progress, 'gemsAwarded')) {
        delete progress.gemsAwarded;
      }
    } else if (Object.prototype.hasOwnProperty.call(progress, 'gemsAwarded')) {
      delete progress.gemsAwarded;
    }

    experienceMap = normalizeExperienceMap(experienceMap);
    if (Object.keys(experienceMap).length > 0) {
      progress.experience = experienceMap;
    } else {
      delete progress.experience;
    }

    const isPositiveLevelNumber = (value) =>
      typeof value === 'number' &&
      Number.isFinite(value) &&
      Math.round(value) === value &&
      value > 0;

    const deriveMathProgressCurrentLevel = () => {
      if (!isPlainObject(progress)) {
        return null;
      }

      const preferredMathKeys = [];
      const addPreferredKey = (value) => {
        if (typeof value !== 'string') {
          return;
        }
        const trimmed = value.trim();
        if (trimmed) {
          preferredMathKeys.push(trimmed);
        }
      };

      addPreferredKey(mathTypeKey);
      addPreferredKey(mathTypeLabel);
      addPreferredKey(progress?.mathType);
      addPreferredKey(progress?.currentMathType);
      addPreferredKey(progress?.activeMathType);
      addPreferredKey(progress?.selectedMathType);
      addPreferredKey(progress?.defaultMathType);

      const { entry: mathProgressEntry } = findMathProgressEntry(
        progress,
        preferredMathKeys
      );

      const derivedLevel = normalizeCurrentLevel(mathProgressEntry?.currentLevel);
      if (isPositiveLevelNumber(derivedLevel)) {
        return derivedLevel;
      }

      const normalizedRoot = normalizeCurrentLevel(progress.currentLevel);
      return isPositiveLevelNumber(normalizedRoot) ? normalizedRoot : null;
    };

    const normalizedProgressCurrentLevel = deriveMathProgressCurrentLevel();

    const activeCurrentLevel =
      normalizedProgressCurrentLevel ?? levels[0]?.currentLevel ?? null;

    if (normalizedProgressCurrentLevel !== null) {
      progress.currentLevel = normalizedProgressCurrentLevel;
    } else if (Number.isFinite(activeCurrentLevel)) {
      progress.currentLevel = activeCurrentLevel;
    } else {
      delete progress.currentLevel;
    }

    const currentLevel =
      levels.find((level) => level?.currentLevel === activeCurrentLevel) ??
      levels[0] ??
      null;

    if (
      currentLevel &&
      typeof currentLevel.currentLevel === 'number' &&
      progress.currentLevel !== currentLevel.currentLevel
    ) {
      progress.currentLevel = currentLevel.currentLevel;
    }

    const levelBattleRaw = currentLevel?.battle ?? {};
    const levelBattle =
      levelBattleRaw && typeof levelBattleRaw === 'object'
        ? { ...levelBattleRaw }
        : {};

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
    const preloadedSpriteSet = readPreloadedSpriteSet();
    let assetRegistrationEnabled = true;

    const registerAsset = (path) => {
      if (!assetRegistrationEnabled || typeof path !== 'string') {
        return null;
      }

      const trimmed = path.trim();
      if (!trimmed) {
        return null;
      }

      const absolutePath = toSpriteCacheKey(trimmed);
      if (absolutePath && !characterAssetSet.has(absolutePath)) {
        characterAssetSet.add(absolutePath);
      }

      return absolutePath || null;
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

      const resolvedSprite = resolveAssetPath(
        sanitizeHeroSpritePath(merged.sprite)
      );
      if (resolvedSprite) {
        normalized.sprite = resolvedSprite;
        const preloadKey = registerAsset(resolvedSprite);
        if (preloadKey) {
          normalized.spritePreloadKey = preloadKey;
        } else {
          delete normalized.spritePreloadKey;
        }
      } else {
        delete normalized.sprite;
        delete normalized.spritePreloadKey;
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
          resolve(true);
          return;
        }

        const cacheKey = toSpriteCacheKey(path);
        if (cacheKey && spriteElementCache.has(cacheKey)) {
          const cached = spriteElementCache.get(cacheKey);
          if (cached && cached.complete && cached.naturalWidth > 0) {
            resolve(true);
            return;
          }
        }

        const img = new Image();
        img.decoding = 'async';
        const finalize = (success) => {
          img.onload = null;
          img.onerror = null;
          if (success) {
            registerSpriteElement(cacheKey || path, img);
          }
          resolve(success);
        };
        img.onload = () => finalize(true);
        img.onerror = () => finalize(false);
        img.src = cacheKey || path;
      });

    let questions = [];
    const questionReference = levelBattle?.questionReference;
    const questionsConfig = levelBattle?.questions;
    const questionFile = (() => {
      if (typeof questionReference === 'string') {
        return questionReference;
      }
      if (typeof questionReference?.file === 'string') {
        return questionReference.file;
      }
      if (typeof questionsConfig === 'string') {
        return questionsConfig;
      }
      if (typeof questionsConfig?.file === 'string') {
        return questionsConfig.file;
      }
      if (typeof questionsConfig?.path === 'string') {
        return questionsConfig.path;
      }
      if (typeof questionsConfig?.url === 'string') {
        return questionsConfig.url;
      }
      if (typeof questionsConfig?.source === 'string') {
        return questionsConfig.source;
      }
      return null;
    })();
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
            } else if (
              questionsJson &&
              typeof questionsJson === 'object'
            ) {
              questions = questionsJson;
            }
          } else {
            console.warn(`Questions file not found: ${questionFile}`);
          }
        }
      } catch (error) {
        console.error('Failed to load questions data', error);
      }
    }

    const resolvePlayerLevelData = (level) => {
      if (!basePlayer || typeof basePlayer !== 'object') {
        return null;
      }
      const levelMap = basePlayer.currentLevel;
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
      if (!level || typeof level.currentLevel !== 'number') {
        return;
      }
      const levelData = resolvePlayerLevelData(level.currentLevel);
      if (levelData && typeof levelData.hero === 'object') {
        playerLevelHeroMap.set(level.currentLevel, levelData.hero);
      }
    });

    const levelCharacters = levels.map((level) => {
      const levelNumber = level?.currentLevel;
      const battleConfig =
        level && typeof level.battle === 'object' ? level.battle : {};
      const heroOverride =
        playerLevelHeroMap.get(levelNumber ?? undefined) ?? null;

      const shouldRegisterAssets =
        (Number.isFinite(activeCurrentLevel) &&
          Number.isFinite(levelNumber) &&
          levelNumber === activeCurrentLevel) ||
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
            currentLevel: Number.isFinite(levelNumber) ? levelNumber : null,
            hero: preparedHero,
            monsters,
          };
      });
    });

    const currentLevelCharacters =
      levelCharacters.find(
        (entry) => entry && entry.currentLevel === activeCurrentLevel
      ) ||
      levelCharacters[0] ||
      { hero: null, monsters: [] };

    const hero = currentLevelCharacters.hero
      ? { ...currentLevelCharacters.hero }
      : prepareCharacter(
          playerHeroBase,
          levelBattle?.hero,
          playerLevelHeroMap.get(activeCurrentLevel)
        ) || { ...playerHeroBase };

    const normalizedMonsters = (currentLevelCharacters.monsters || []).map(
      (monster) => ({ ...monster })
    );

    const resolveLevelBattleCount = () => {
      const countEntries = (candidate) => {
        if (!candidate || typeof candidate !== 'object') {
          return 0;
        }

        const entries = Array.isArray(candidate.battles)
          ? candidate.battles.filter(Boolean)
          : [];
        return entries.length > 0 ? entries.length : 0;
      };

      const counts = [
        countEntries(currentLevel),
        countEntries(levelBattleRaw),
      ];

      for (const value of counts) {
        if (value > 0) {
          return value;
        }
      }

      if (Array.isArray(levelBattle?.monsters)) {
        const monsterCount = levelBattle.monsters.filter(Boolean).length;
        if (monsterCount > 0) {
          return monsterCount;
        }
      }

      const normalizedCount = normalizedMonsters.filter(Boolean).length;
      return normalizedCount > 0 ? normalizedCount : 1;
    };

    const mathTypeCandidates = [
      levelBattle?.mathType,
      levelBattleRaw?.mathType,
      currentLevel?.mathType,
      mathTypeKey,
      basePlayer?.currentMathType,
      basePlayer?.mathType,
      progress?.mathType,
      progress?.currentMathType,
    ];

    const resolveActiveMonsterIndex = () => {
      if (!normalizedMonsters.length) {
        return 0;
      }

      return 0;
    };

    if (normalizedMonsters.length === 0) {
      const fallbackCandidates = [];

      if (Array.isArray(levelBattle?.monsters)) {
        fallbackCandidates.push(...levelBattle.monsters);
      } else if (levelBattle && typeof levelBattle.monster === 'object') {
        fallbackCandidates.push(levelBattle.monster);
      }

      fallbackCandidates.forEach((candidate) => {
        const fallbackMonster = prepareCharacter(candidate);
        if (fallbackMonster) {
          normalizedMonsters.push({ ...fallbackMonster });
        }
      });
    }

    const primaryMonsterIndex = resolveActiveMonsterIndex();
    const primaryMonster =
      normalizedMonsters[primaryMonsterIndex] || normalizedMonsters[0] || {};

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
      .filter((level) => Number.isFinite(level?.currentLevel))
      .sort((a, b) => a.currentLevel - b.currentLevel);

    const effectiveCurrentLevel = Number.isFinite(activeCurrentLevel)
      ? activeCurrentLevel
      : Number.isFinite(currentLevel?.currentLevel)
      ? currentLevel.currentLevel
      : null;

    const currentLevelIndex = sortedLevelsByBattle.findIndex(
      (level) => level?.currentLevel === effectiveCurrentLevel
    );

    if (currentLevelIndex !== -1) {
      const immediateNextLevel = sortedLevelsByBattle[currentLevelIndex + 1];
      if (immediateNextLevel && typeof immediateNextLevel === 'object') {
        const nextLevelBattle =
          typeof immediateNextLevel.battle === 'object'
            ? immediateNextLevel.battle
            : {};
        const nextLevelOverride = playerLevelHeroMap.get(
          immediateNextLevel.currentLevel
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
      const assetList = Array.from(characterAssetSet);
      const assetsToPreload = assetList.filter(
        (assetPath) => !preloadedSpriteSet.has(assetPath)
      );

      if (assetsToPreload.length > 0) {
        const preloadResults = await Promise.all(
          assetsToPreload.map((assetPath) => preloadImage(assetPath))
        );
        preloadResults.forEach((wasLoaded, index) => {
          if (wasLoaded) {
            preloadedSpriteSet.add(assetsToPreload[index]);
          }
        });
      }

      writePreloadedSpriteSet(preloadedSpriteSet);
    } else {
      writePreloadedSpriteSet(preloadedSpriteSet);
    }

    const nextBattleSnapshot = {
      currentLevel: Number.isFinite(activeCurrentLevel) ? activeCurrentLevel : null,
      hero: hero
        ? {
            name: typeof hero.name === 'string' ? hero.name : null,
            sprite: typeof hero.sprite === 'string' ? hero.sprite : null,
          }
        : null,
      monster: battle.monster
        ? {
            name: typeof battle.monster.name === 'string' ? battle.monster.name : null,
            sprite: typeof battle.monster.sprite === 'string' ? battle.monster.sprite : null,
          }
        : null,
    };

    persistNextBattleSnapshot(nextBattleSnapshot);

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

    if (typeof document !== 'undefined') {
      const registerDisplayedSprite = (element, fallbackPath) => {
        if (!element) {
          return;
        }

        const elementSrc = element.currentSrc || element.src || fallbackPath;
        if (elementSrc) {
          registerSpriteElement(elementSrc, element);
        }
      };

      const heroSpriteSource = hero?.spritePreloadKey || hero?.sprite || null;
      const monsterSpriteSource =
        battle?.monster?.spritePreloadKey || battle?.monster?.sprite || null;

      registerDisplayedSprite(
        document.querySelector('[data-hero-sprite]'),
        heroSpriteSource
      );
      registerDisplayedSprite(
        document.getElementById('battle-shellfin'),
        heroSpriteSource
      );
      registerDisplayedSprite(
        document.getElementById('battle-monster'),
        monsterSpriteSource
      );
      registerDisplayedSprite(
        document.querySelector('#complete-message .monster-image'),
        monsterSpriteSource
      );
    }

    document.dispatchEvent(new Event('data-loaded'));
  } catch (e) {
    console.error('Failed to load data', e);
    persistNextBattleSnapshot(null);
    window.preloadedData = {};
    document.dispatchEvent(new Event('data-loaded'));
  }
})();
})();
