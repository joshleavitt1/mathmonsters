(() => {
const STORAGE_KEY_PROGRESS = 'mathmonstersProgress';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const FALLBACK_ASSET_BASE = '/mathmonsters';
const PRELOADED_SPRITES_STORAGE_KEY = 'mathmonstersPreloadedSprites';

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

const mergeBattleLevelMap = (baseMap, overrideMap) => {
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

  const mergedBattleLevel = mergeBattleLevelMap(
    base?.battleLevel,
    override?.battleLevel
  );
  if (mergedBattleLevel) {
    merged.battleLevel = mergedBattleLevel;
  }

  return merged;
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

  if (isPlainObject(storedProfile.battleLevel)) {
    const mergedBattleLevel = mergeBattleLevelMap(
      storedProfile.battleLevel,
      nextPlayer.battleLevel
    );
    if (mergedBattleLevel) {
      nextPlayer.battleLevel = mergedBattleLevel;
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

const normalizeBattleLevel = (value) => {
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

const normalizeHeroIdentifier = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const resolveHeroAssetLevel = (value) => {
  const normalized = normalizeBattleLevel(value);
  if (normalized === null) {
    return null;
  }

  const floored = Math.floor(normalized);
  return floored >= 1 ? floored : 1;
};

const updateHeroAssetForLevel = (path, heroId, level) => {
  if (typeof path !== 'string') {
    return path;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return path;
  }

  if (!heroId || !Number.isFinite(level)) {
    return sanitizeHeroSpritePath(trimmed);
  }

  const safeLevel = Math.max(1, Math.floor(level));
  const pattern = new RegExp(
    `(${heroId}_(?:evolution|attack)_)(\\d+)((?:\\.[a-z0-9]+)?)(?=[?#]|$)`,
    'gi'
  );

  const replaced = trimmed.replace(pattern, (match, prefix, _, extension = '') => {
    return `${prefix}${safeLevel}${extension || ''}`;
  });

  return sanitizeHeroSpritePath(replaced);
};

const applyAssetsForHeroLevel = (hero, level, fallbackHeroId = null) => {
  if (!isPlainObject(hero)) {
    return;
  }

  const resolvedLevel = resolveHeroAssetLevel(level);
  if (resolvedLevel === null) {
    return;
  }

  const heroId =
    normalizeHeroIdentifier(hero.id) ?? normalizeHeroIdentifier(fallbackHeroId);

  if (!heroId) {
    return;
  }

  if (typeof hero.sprite === 'string') {
    hero.sprite = updateHeroAssetForLevel(hero.sprite, heroId, resolvedLevel);
  }

  if (typeof hero.attackSprite === 'string') {
    hero.attackSprite = updateHeroAssetForLevel(
      hero.attackSprite,
      heroId,
      resolvedLevel
    );
  }

  if (isPlainObject(hero.attackSprites)) {
    Object.keys(hero.attackSprites).forEach((key) => {
      const spritePath = hero.attackSprites[key];
      if (typeof spritePath === 'string') {
        hero.attackSprites[key] = updateHeroAssetForLevel(
          spritePath,
          heroId,
          resolvedLevel
        );
      }
    });
  }
};

const determinePlayerHeroLevel = (player) => {
  if (!isPlainObject(player)) {
    return null;
  }

  const progress = isPlainObject(player.progress) ? player.progress : null;

  const progressBattleLevel = resolveHeroAssetLevel(progress?.battleLevel);
  if (progressBattleLevel !== null) {
    return progressBattleLevel;
  }

  const currentMathType =
    typeof player.currentMathType === 'string'
      ? player.currentMathType.trim()
      : '';

  if (currentMathType && progress) {
    const mathProgress = progress[currentMathType];
    if (isPlainObject(mathProgress)) {
      const mathLevel = resolveHeroAssetLevel(mathProgress.currentLevel);
      if (mathLevel !== null) {
        return mathLevel;
      }

      const mathBattle = resolveHeroAssetLevel(mathProgress.currentBattle);
      if (mathBattle !== null) {
        return mathBattle;
      }
    }
  }

  const currentLevel = resolveHeroAssetLevel(player.currentLevel);
  if (currentLevel !== null) {
    return currentLevel;
  }

  if (progress) {
    let highest = null;
    Object.values(progress).forEach((entry) => {
      if (!isPlainObject(entry)) {
        return;
      }

      const entryLevel = resolveHeroAssetLevel(entry.currentLevel);
      if (entryLevel !== null) {
        highest = highest === null ? entryLevel : Math.max(highest, entryLevel);
      }

      const entryBattle = resolveHeroAssetLevel(entry.currentBattle);
      if (entryBattle !== null) {
        highest =
          highest === null ? entryBattle : Math.max(highest, entryBattle);
      }
    });

    if (highest !== null) {
      return highest;
    }
  }

  return null;
};

const applyHeroLevelAssets = (player) => {
  if (!isPlainObject(player)) {
    return;
  }

  const baseHero = isPlainObject(player.hero) ? player.hero : null;
  const baseHeroId = normalizeHeroIdentifier(baseHero?.id);
  const heroLevel = determinePlayerHeroLevel(player);

  if (baseHero && heroLevel !== null) {
    applyAssetsForHeroLevel(baseHero, heroLevel, baseHeroId);
  }

  const battleLevelMap = isPlainObject(player.battleLevel)
    ? player.battleLevel
    : null;

  if (!battleLevelMap) {
    return;
  }

  Object.entries(battleLevelMap).forEach(([levelKey, levelData]) => {
    if (!isPlainObject(levelData)) {
      return;
    }

    const levelHero = isPlainObject(levelData.hero) ? levelData.hero : null;
    if (!levelHero) {
      return;
    }

    const levelNumber =
      resolveHeroAssetLevel(levelData.battleLevel) ??
      resolveHeroAssetLevel(levelKey) ??
      heroLevel;

    if (levelNumber === null) {
      return;
    }

    applyAssetsForHeroLevel(levelHero, levelNumber, baseHeroId);
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

      const resolvedBattleLevel =
        normalizeBattleLevel(level?.battleLevel) ??
        normalizeBattleLevel(level?.level) ??
        normalizeBattleLevel(level?.id) ??
        normalizeBattleLevel(index + 1);

      if (resolvedBattleLevel !== null) {
        normalizedLevel.battleLevel = resolvedBattleLevel;
      } else {
        delete normalizedLevel.battleLevel;
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

    const normalizedBattleLevel =
      normalizeBattleLevel(level?.battleLevel) ??
      normalizeBattleLevel(level?.level) ??
      normalizeBattleLevel(level?.id);

    const dedupeKey =
      normalizedBattleLevel !== null
        ? `battle:${normalizedBattleLevel}`
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

    let startIndex = poolIndices.get(poolKey) ?? 0;
    for (let attempt = 0; attempt < pool.length; attempt += 1) {
      const index = (startIndex + attempt) % pool.length;
      if (usedSet && usedSet.has(index)) {
        continue;
      }
      poolIndices.set(poolKey, index + 1);
      if (usedSet) {
        usedSet.add(index);
        levelUsage.set(usedKey, usedSet);
      }
      return pool[index];
    }

    return pool[startIndex % pool.length];
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
      normalizeBattleLevel(level?.battleLevel) ??
      normalizeBattleLevel(level?.level) ??
      normalizeBattleLevel(index + 1);

    const context = { levelKey };

    const directBattle = normalizeBattle(level.battle, context);
    const battleEntries = Array.isArray(level.battles)
      ? level.battles
          .map((entry) => normalizeBattle(entry, context))
          .filter(Boolean)
      : [];

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
      const levelA = normalizeBattleLevel(a.level?.battleLevel);
      const levelB = normalizeBattleLevel(b.level?.battleLevel);

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

    const localPlayerData =
      playerJson && typeof playerJson === 'object' ? playerJson : {};

    const storedPlayerProfile = readStoredPlayerProfile();

    let basePlayer = extractPlayerData(localPlayerData);
    basePlayer = mergePlayerWithStoredProfile(basePlayer, storedPlayerProfile);

    try {
      const remotePlayerData = await fetchPlayerProfile();
      if (remotePlayerData) {
        syncRemoteBattleLevel(remotePlayerData);
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

    const { levels: derivedLevels } = deriveMathTypeLevels(
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
    const progress = { ...baseProgress };
    const battleVariables = { ...baseBattleVariables };
    let experienceMap = normalizeExperienceMap(progress?.experience);

    if (storedProgress && typeof storedProgress === 'object') {
      const storedBattleLevel = normalizeBattleLevel(
        storedProgress.battleLevel
      );
      if (storedBattleLevel !== null) {
        progress.battleLevel = storedBattleLevel;
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

    const normalizedProgressBattleLevel = normalizeBattleLevel(
      progress.battleLevel
    );

    const activeBattleLevel =
      normalizedProgressBattleLevel ?? levels[0]?.battleLevel ?? null;

    if (normalizedProgressBattleLevel !== null) {
      progress.battleLevel = normalizedProgressBattleLevel;
    } else if (Number.isFinite(activeBattleLevel)) {
      progress.battleLevel = activeBattleLevel;
    } else {
      delete progress.battleLevel;
    }

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
        return;
      }

      const trimmed = path.trim();
      if (!trimmed) {
        return;
      }

      const absolutePath = toAbsoluteAssetUrl(trimmed);
      if (absolutePath && !characterAssetSet.has(absolutePath)) {
        characterAssetSet.add(absolutePath);
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

      const resolvedSprite = resolveAssetPath(
        sanitizeHeroSpritePath(merged.sprite)
      );
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
          resolve(true);
          return;
        }

        const img = new Image();
        img.decoding = 'async';
        const finalize = (success) => {
          img.onload = null;
          img.onerror = null;
          resolve(success);
        };
        img.onload = () => finalize(true);
        img.onerror = () => finalize(false);
        img.src = path;
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
