(() => {
const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';
const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
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
  if (
    fallbackNormalized &&
    ASSET_BASE_PATH !== FALLBACK_ASSET_BASE &&
    trimmed.startsWith(`${fallbackNormalized}/`)
  ) {
    trimmed = trimmed.slice(fallbackNormalized.length + 1);
  }

  const base = ASSET_BASE_PATH.endsWith('/')
    ? ASSET_BASE_PATH.slice(0, -1)
    : ASSET_BASE_PATH;

  return trimmed ? `${base}/${trimmed}${suffix}` : `${base}${suffix}`;
};

const resolveAssetPath = (path) => normalizeAssetPath(path);

const readVisitedFlag = (storage, label) => {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(LANDING_VISITED_KEY) === VISITED_VALUE;
  } catch (error) {
    console.warn(`${label} storage is not available.`, error);
    return null;
  }
};

const setVisitedFlag = (storage, label) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(LANDING_VISITED_KEY, VISITED_VALUE);
  } catch (error) {
    console.warn(`${label} storage is not available.`, error);
  }
};

const getLandingVisitState = () => {
  const sessionVisited = readVisitedFlag(sessionStorage, 'Session');
  if (sessionVisited === true) {
    return { visited: true, shouldRedirect: false };
  }
  if (sessionVisited === null) {
    return { visited: true, shouldRedirect: false };
  }

  const localVisited = readVisitedFlag(localStorage, 'Local');
  if (localVisited === true) {
    setVisitedFlag(sessionStorage, 'Session');
    return { visited: true, shouldRedirect: false };
  }
  if (localVisited === null) {
    return { visited: true, shouldRedirect: false };
  }

  return { visited: false, shouldRedirect: true };
};

const landingVisitState = getLandingVisitState();
const landingVisited = landingVisitState.visited || landingVisitState.shouldRedirect;

document.addEventListener('DOMContentLoaded', () => {
  if (!landingVisited) {
    return;
  }
  let redirectScheduled = false;
  const scheduleLandingRedirect = () => {
    if (!landingVisitState.shouldRedirect || redirectScheduled) {
      return;
    }
    redirectScheduled = true;
    setVisitedFlag(sessionStorage, 'Session');
    setVisitedFlag(localStorage, 'Local');
    window.requestAnimationFrame(() => {
      window.location.replace(`${ASSET_BASE_PATH}/index.html`);
    });
  };
  const monsterImg = document.getElementById('battle-monster');
  const heroImg = document.getElementById('battle-shellfin');
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const monsterHpProgress = document.querySelector(
    '#monster-stats [data-hp-progress]'
  );
  const heroHpProgress = document.querySelector(
    '#shellfin-stats [data-hp-progress]'
  );
  const monsterHpFill = monsterHpProgress?.querySelector('.progress__fill');
  const heroHpFill = heroHpProgress?.querySelector('.progress__fill');
  const monsterNameEl = document.querySelector('#monster-stats .name');
  const heroNameEl = document.querySelector('#shellfin-stats .name');
  const monsterStats = document.getElementById('monster-stats');
  const heroStats = document.getElementById('shellfin-stats');

  const questionBox = document.getElementById('question');
  const questionText = questionBox.querySelector('.question-text');
  const choicesEl = questionBox.querySelector('.choices');
  const topBar = questionBox.querySelector('.top-bar');
  const progressBar = questionBox.querySelector('.progress-bar');
  const progressFill = questionBox.querySelector('.progress-fill');
  const streakLabel = questionBox.querySelector('.streak-label');
  const streakIcon = questionBox.querySelector('.streak-icon');
  const setStreakButton = document.querySelector('[data-dev-set-streak]');
  const endBattleButton = document.querySelector('[data-dev-end-battle]');
  const resetLevelButton = document.querySelector('[data-dev-reset-level]');
  const logOutButton = document.querySelector('[data-dev-log-out]');
  const devControls = document.querySelector('.battle-dev-controls');
  const completeMessage = document.getElementById('complete-message');
  const battleCompleteTitle = completeMessage?.querySelector('#battle-complete-title');
  const completeEnemyImg = completeMessage?.querySelector('.enemy-image');
  const summaryExperienceStat = completeMessage?.querySelector(
    '[data-goal="experience"]'
  );
  const summaryExperienceValue = summaryExperienceStat?.querySelector(
    '.summary-experience'
  );
  const levelProgressEl = completeMessage?.querySelector('[data-level-progress]');
  const nextMissionBtn = completeMessage?.querySelector('.next-mission-btn');

  const summaryExperienceText = ensureStatValueText(summaryExperienceValue);

  if (heroHpProgress && !heroHpProgress.hasAttribute('aria-label')) {
    heroHpProgress.setAttribute('aria-label', 'Hero health');
  }
  if (monsterHpProgress && !monsterHpProgress.hasAttribute('aria-label')) {
    monsterHpProgress.setAttribute('aria-label', 'Monster health');
  }

  if (summaryExperienceText) summaryExperienceText.textContent = '+0';
  if (levelProgressEl) levelProgressEl.textContent = 'Level Progress: 0 / 0';

  const MIN_STREAK_GOAL = 1;
  const MAX_STREAK_GOAL = 5;
  let STREAK_GOAL = MAX_STREAK_GOAL;
  let questions = [];
  let currentQuestion = 0;
  let streak = 0;
  let streakMaxed = false;
  let streakIconShown = false;
  let currentExperience = 0;
  let levelTotalExperience = 0;
  let battleEnded = false;
  let currentBattleLevel = null;

  const hero = { attack: 1, health: 5, gems: 0, damage: 0, name: 'Hero' };
  const monster = { attack: 1, health: 5, damage: 0, name: 'Monster' };

  const markBattleReady = (img) => {
    if (!img) {
      return;
    }
    img.classList.remove('slide-in');
    img.classList.add('battle-ready');
  };

  const applySpriteFallback = (img, fallbackSrc) => {
    if (!img || !fallbackSrc) {
      return;
    }

    const fallbackUrl = fallbackSrc;
    const useFallback = () => {
      if (!img || img.dataset?.fallbackApplied === 'true') {
        return;
      }
      img.dataset.fallbackApplied = 'true';
      img.src = fallbackUrl;
    };

    img.addEventListener('error', useFallback);

    if (img.complete && typeof img.naturalWidth === 'number' && img.naturalWidth === 0) {
      useFallback();
    }
  };

  const ensureSpriteVisibility = (img) => {
    if (!img) {
      return;
    }

    const reveal = () => {
      if (!img.classList.contains('battle-ready')) {
        img.classList.remove('slide-in');
        img.classList.add('battle-ready');
      }
    };

    const scheduleReveal = () => {
      window.setTimeout(reveal, 1600);
    };

    if (img.complete && typeof img.naturalWidth === 'number' && img.naturalWidth > 0) {
      scheduleReveal();
    } else {
      img.addEventListener('load', scheduleReveal, { once: true });
    }
  };

  const heroDefaultSprite =
    heroImg?.getAttribute('src') || resolveAssetPath('images/characters/shellfin_level_1.png');
  const monsterDefaultSprite =
    monsterImg?.getAttribute('src') || resolveAssetPath('images/battle/monster_battle_1_1.png');

  applySpriteFallback(heroImg, heroDefaultSprite);
  applySpriteFallback(monsterImg, monsterDefaultSprite);

  if (prefersReducedMotion) {
    markBattleReady(heroImg);
    markBattleReady(monsterImg);
  } else {
    if (heroImg) {
      heroImg.classList.add('slide-in');
      heroImg.addEventListener('animationend', () => markBattleReady(heroImg), {
        once: true,
      });
      window.setTimeout(() => markBattleReady(heroImg), 1400);
    }

    if (monsterImg) {
      monsterImg.classList.add('slide-in');
      monsterImg.addEventListener('animationend', () => markBattleReady(monsterImg), {
        once: true,
      });
      window.setTimeout(() => markBattleReady(monsterImg), 1400);
    }
  }

  ensureSpriteVisibility(heroImg);
  ensureSpriteVisibility(monsterImg);

  window.requestAnimationFrame(() => {
    heroStats?.classList.add('show');
    monsterStats?.classList.add('show');
  });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function ensureStatValueText(valueEl) {
    if (!valueEl) {
      return null;
    }
    const existing = valueEl.querySelector('.stat-value-text');
    if (existing) {
      return existing;
    }
    const span = document.createElement('span');
    span.classList.add('stat-value-text');
    const initialText = valueEl.textContent ? valueEl.textContent.trim() : '';
    span.textContent = initialText;
    valueEl.textContent = '';
    valueEl.appendChild(span);
    return span;
  }

  function applyGoalResult(valueEl, textSpan, text, met) {
    if (!valueEl || !textSpan) {
      return;
    }
    textSpan.textContent = text;
    let icon = valueEl.querySelector('.goal-result-icon');
    if (!icon) {
      icon = document.createElement('img');
      icon.classList.add('goal-result-icon');
      valueEl.insertBefore(icon, textSpan);
    }
    const iconPath = met
      ? resolveAssetPath('images/complete/correct.svg')
      : resolveAssetPath('images/complete/incorrect.svg');
    if (iconPath) {
      icon.src = iconPath;
    }
    icon.alt = met ? 'Goal met' : 'Goal not met';
    valueEl.classList.remove('goal-result--met', 'goal-result--missed');
    valueEl.classList.add(met ? 'goal-result--met' : 'goal-result--missed');
  }

  function setBattleCompleteTitleLines(...lines) {
    if (!battleCompleteTitle) {
      return;
    }

    const filteredLines = lines
      .map((line) => (typeof line === 'string' ? line.trim() : ''))
      .filter((line) => line.length > 0);

    battleCompleteTitle.replaceChildren();

    if (!filteredLines.length) {
      return;
    }

    filteredLines.forEach((line, index) => {
      battleCompleteTitle.appendChild(document.createTextNode(line));
      if (index < filteredLines.length - 1) {
        battleCompleteTitle.appendChild(document.createElement('br'));
      }
    });
  }

  function persistProgress(update) {
    if (!update || typeof update !== 'object') {
      return;
    }

    if (window.preloadedData?.variables) {
      const existingProgress =
        typeof window.preloadedData.variables.progress === 'object' &&
        window.preloadedData.variables.progress !== null
          ? window.preloadedData.variables.progress
          : {};
      window.preloadedData.variables.progress = {
        ...existingProgress,
        ...update,
      };
    }

    try {
      const storage = window.localStorage;
      if (!storage) {
        return;
      }
      const raw = storage.getItem(PROGRESS_STORAGE_KEY);
      let storedProgress = {};
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            storedProgress = parsed;
          }
        } catch (error) {
          storedProgress = {};
        }
      }
      const mergedProgress = { ...storedProgress, ...update };
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(mergedProgress));
    } catch (error) {
      console.warn('Unable to save progress.', error);
    }
  }

  const findLevelByNumber = (levelNumber) => {
    if (
      typeof levelNumber !== 'number' ||
      !Array.isArray(window.preloadedData?.levels)
    ) {
      return null;
    }
    return (
      window.preloadedData.levels.find(
        (level) =>
          typeof level?.battleLevel === 'number' && level.battleLevel === levelNumber
      ) ?? null
    );
  };

  const getTotalExperienceForLevel = (levelNumber) => {
    const levelEntry = findLevelByNumber(levelNumber);
    if (!levelEntry) {
      return null;
    }
    const raw = Number(levelEntry.totalExperience);
    if (!Number.isFinite(raw) || raw < 0) {
      return null;
    }
    return Math.max(0, Math.round(raw));
  };

  const normalizeExperienceValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return Math.round(numeric);
  };

  const isPlainObject = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

  const hasCharacterDetails = (character) => {
    if (!isPlainObject(character)) {
      return false;
    }
    const name =
      typeof character.name === 'string' ? character.name.trim() : '';
    const sprite =
      typeof character.sprite === 'string' ? character.sprite.trim() : '';
    const attack = Number(character.attack);
    const health = Number(character.health);
    const damage = Number(character.damage);
    return (
      Boolean(name) ||
      Boolean(sprite) ||
      Number.isFinite(attack) ||
      Number.isFinite(health) ||
      Number.isFinite(damage)
    );
  };

  const collectBattleEnemyCandidates = (battleSource) => {
    if (!isPlainObject(battleSource)) {
      return [];
    }
    return Object.entries(battleSource)
      .filter(
        ([key, value]) => /^enemy/i.test(key) && isPlainObject(value)
      )
      .map(([, value]) => value);
  };

  const selectEnemyFromBattle = (battleSource, experienceValue) => {
    if (!isPlainObject(battleSource)) {
      return null;
    }

    const candidates = collectBattleEnemyCandidates(battleSource);
    if (candidates.length === 0) {
      return isPlainObject(battleSource.enemy) ? battleSource.enemy : null;
    }

    const numericExperience = Number(experienceValue);
    const experienceString = String(experienceValue);

    const matchedEnemy = candidates.find((candidate) => {
      const candidateId = candidate?.id;
      if (candidateId === undefined || candidateId === null) {
        return false;
      }
      if (
        typeof candidateId === 'number' &&
        Number.isFinite(candidateId) &&
        Number.isFinite(numericExperience)
      ) {
        return candidateId === numericExperience;
      }
      return String(candidateId) === experienceString;
    });

    if (matchedEnemy) {
      return matchedEnemy;
    }

    if (Number.isFinite(numericExperience)) {
      const boundedIndex = Math.min(
        Math.max(Math.floor(numericExperience), 0),
        candidates.length - 1
      );
      return candidates[boundedIndex];
    }

    return candidates[0] ?? null;
  };

  function updateLevelProgressDisplay(
    experienceValue = currentExperience,
    totalOverride = null
  ) {
    if (!levelProgressEl) {
      return;
    }
    const total = Number.isFinite(totalOverride)
      ? Math.max(0, Math.round(totalOverride))
      : Number.isFinite(levelTotalExperience)
      ? Math.max(levelTotalExperience, 0)
      : 0;
    const clampedExperience =
      total > 0
        ? Math.min(Math.max(experienceValue, 0), total)
        : Math.max(experienceValue, 0);
    levelProgressEl.textContent = `Level Progress: ${clampedExperience} / ${total}`;
  }

  function recordBattleProgress(win) {
    const baseLevel =
      typeof currentBattleLevel === 'number'
        ? currentBattleLevel
        : typeof window.preloadedData?.variables?.progress?.battleLevel === 'number'
        ? window.preloadedData.variables.progress.battleLevel
        : typeof window.preloadedData?.level?.battleLevel === 'number'
        ? window.preloadedData.level.battleLevel
        : 1;
    const normalizedTotal = Number.isFinite(levelTotalExperience)
      ? Math.max(levelTotalExperience, 0)
      : 0;
    const previousExperience = normalizeExperienceValue(currentExperience);

    if (!win) {
      persistProgress({
        battleLevel: baseLevel,
        currentExperience: previousExperience,
      });
      currentBattleLevel = baseLevel;
      currentExperience = previousExperience;
      return {
        earned: 0,
        leveledUp: false,
        experience: previousExperience,
        total: normalizedTotal,
      };
    }

    const earned = 1;
    let newExperience = previousExperience + earned;
    let newLevel = baseLevel;
    let leveledUp = false;

    if (normalizedTotal > 0 && newExperience >= normalizedTotal) {
      leveledUp = true;
      newLevel = baseLevel + 1;
      newExperience = 0;
    }

    persistProgress({
      battleLevel: newLevel,
      currentExperience: newExperience,
    });

    currentBattleLevel = newLevel;
    currentExperience = newExperience;

    let nextLevelTotal = normalizedTotal;
    if (leveledUp) {
      const resolvedTotal = getTotalExperienceForLevel(newLevel);
      if (resolvedTotal !== null) {
        levelTotalExperience = resolvedTotal;
        nextLevelTotal = resolvedTotal;
      } else {
        levelTotalExperience = 0;
        nextLevelTotal = 0;
      }
    }

    return {
      earned,
      leveledUp,
      experience: newExperience,
      total: leveledUp ? nextLevelTotal : normalizedTotal,
    };
  }

  function loadData() {
    const data = window.preloadedData ?? {};
    const battleData = isPlainObject(data.battle) ? data.battle : {};
    const progressData =
      isPlainObject(data.variables?.progress) && data.variables.progress
        ? data.variables.progress
        : {};
    const levels = Array.isArray(data.levels) ? data.levels : [];

    currentBattleLevel =
      typeof progressData.battleLevel === 'number'
        ? progressData.battleLevel
        : typeof data.level?.battleLevel === 'number'
        ? data.level.battleLevel
        : null;

    const findLevelByBattleNumber = (levelNumber) => {
      if (typeof levelNumber !== 'number') {
        return null;
      }
      return (
        levels.find(
          (level) =>
            typeof level?.battleLevel === 'number' &&
            level.battleLevel === levelNumber
        ) ?? null
      );
    };

    const currentLevel =
      findLevelByBattleNumber(currentBattleLevel) ??
      (isPlainObject(data.level) ? data.level : null) ??
      levels[0] ??
      null;

    if (
      currentLevel &&
      typeof currentLevel.battleLevel === 'number' &&
      currentBattleLevel !== currentLevel.battleLevel
    ) {
      currentBattleLevel = currentLevel.battleLevel;
    }

    const levelBattle =
      currentLevel && isPlainObject(currentLevel.battle)
        ? currentLevel.battle
        : {};
    const mergedBattleSource = { ...levelBattle, ...battleData };

    const normalizedExperience = normalizeExperienceValue(
      progressData.currentExperience
    );

    let heroData = {};
    [levelBattle?.hero, battleData?.hero, data.hero].forEach((source) => {
      if (isPlainObject(source)) {
        heroData = { ...heroData, ...source };
      }
    });

    if (!hasCharacterDetails(heroData)) {
      const fallbackHero = levels
        .map((level) => (isPlainObject(level?.battle?.hero) ? level?.battle?.hero : null))
        .find((entry) => isPlainObject(entry));
      if (isPlainObject(fallbackHero)) {
        heroData = { ...fallbackHero, ...heroData };
      }
    }

    let enemyData = {};
    const baseEnemy = selectEnemyFromBattle(
      mergedBattleSource,
      normalizedExperience
    );
    if (isPlainObject(baseEnemy)) {
      enemyData = { ...baseEnemy };
    }
    [battleData?.enemy, data.enemy].forEach((source) => {
      if (isPlainObject(source)) {
        enemyData = { ...enemyData, ...source };
      }
    });

    if (!hasCharacterDetails(enemyData)) {
      const fallbackEnemy = levels
        .map((level) => selectEnemyFromBattle(level?.battle ?? {}, normalizedExperience))
        .find((entry) => isPlainObject(entry));
      if (isPlainObject(fallbackEnemy)) {
        enemyData = { ...fallbackEnemy, ...enemyData };
      }
    }

    if (window.preloadedData) {
      if (hasCharacterDetails(heroData)) {
        window.preloadedData.hero = { ...heroData };
        window.preloadedData.battle = isPlainObject(window.preloadedData.battle)
          ? window.preloadedData.battle
          : {};
        window.preloadedData.battle.hero = {
          ...(isPlainObject(window.preloadedData.battle?.hero)
            ? window.preloadedData.battle.hero
            : {}),
          ...heroData,
        };
      }
      if (hasCharacterDetails(enemyData)) {
        window.preloadedData.enemy = { ...enemyData };
        window.preloadedData.battle = isPlainObject(window.preloadedData.battle)
          ? window.preloadedData.battle
          : {};
        window.preloadedData.battle.enemy = {
          ...(isPlainObject(window.preloadedData.battle?.enemy)
            ? window.preloadedData.battle.enemy
            : {}),
          ...enemyData,
        };
      }
    }

    const resolvedLevelExperience = () => {
      const directValue = Number(data.level?.totalExperience);
      if (Number.isFinite(directValue) && directValue >= 0) {
        return Math.max(0, Math.round(directValue));
      }
      if (typeof currentBattleLevel === 'number') {
        const levelValue = getTotalExperienceForLevel(currentBattleLevel);
        if (levelValue !== null) {
          return levelValue;
        }
      }
      const levelExperience = Number(currentLevel?.totalExperience);
      if (Number.isFinite(levelExperience) && levelExperience >= 0) {
        return Math.max(0, Math.round(levelExperience));
      }
      return 0;
    };

    levelTotalExperience = resolvedLevelExperience();

    currentExperience = normalizedExperience;
    if (
      Number.isFinite(levelTotalExperience) &&
      levelTotalExperience > 0 &&
      currentExperience > levelTotalExperience
    ) {
      currentExperience = levelTotalExperience;
    }

    updateLevelProgressDisplay(currentExperience);

    let resolvedStreakGoalRaw = Number(battleData.streakGoal);
    if (!Number.isFinite(resolvedStreakGoalRaw)) {
      resolvedStreakGoalRaw = Number(mergedBattleSource.streakGoal);
    }
    if (Number.isFinite(resolvedStreakGoalRaw)) {
      STREAK_GOAL = Math.min(
        Math.max(Math.round(resolvedStreakGoalRaw), MIN_STREAK_GOAL),
        MAX_STREAK_GOAL
      );
    } else {
      STREAK_GOAL = Math.min(
        Math.max(Math.round(STREAK_GOAL), MIN_STREAK_GOAL),
        MAX_STREAK_GOAL
      );
    }

    hero.attack = Number(heroData.attack) || hero.attack;
    hero.health = Number(heroData.health) || hero.health;
    hero.damage = Number(heroData.damage) || hero.damage;
    hero.name = heroData.name || hero.name;
    if (typeof heroData.gems === 'number') {
      hero.gems = heroData.gems;
    }

    const heroSprite = resolveAssetPath(heroData.sprite);
    if (heroImg) {
      if (heroSprite) {
        heroImg.src = heroSprite;
      } else {
        const fallbackHeroSprite = resolveAssetPath(mergedBattleSource?.hero?.sprite);
        if (fallbackHeroSprite) {
          heroImg.src = fallbackHeroSprite;
        }
      }
    }
    if (heroImg && hero.name) {
      heroImg.alt = `${hero.name} ready for battle`;
    }

    monster.attack = Number(enemyData.attack) || monster.attack;
    monster.health = Number(enemyData.health) || monster.health;
    monster.damage = Number(enemyData.damage) || monster.damage;
    monster.name = enemyData.name || monster.name;

    const monsterSprite = resolveAssetPath(enemyData.sprite);
    let fallbackMonsterSprite = null;
    if (monsterImg) {
      if (monsterSprite) {
        monsterImg.src = monsterSprite;
      } else {
        fallbackMonsterSprite = resolveAssetPath(
          mergedBattleSource?.enemy?.sprite
        );
        if (fallbackMonsterSprite) {
          monsterImg.src = fallbackMonsterSprite;
        }
      }
    }
    if (monsterImg && monster.name) {
      monsterImg.alt = `${monster.name} ready for battle`;
    }
    const finalMonsterSprite = monsterSprite || fallbackMonsterSprite;
    if (finalMonsterSprite && completeEnemyImg) {
      completeEnemyImg.src = finalMonsterSprite;
    }
    if (completeEnemyImg && monster.name) {
      completeEnemyImg.alt = `${monster.name} ready for battle`;
    }

    if (heroNameEl) heroNameEl.textContent = hero.name;
    if (monsterNameEl) monsterNameEl.textContent = monster.name;
    if (heroHpProgress) {
      const heroLabel = hero.name ? `${hero.name} health` : 'Hero health';
      heroHpProgress.setAttribute('aria-label', heroLabel);
    }
    if (monsterHpProgress) {
      const monsterLabel = monster.name
        ? `${monster.name} health`
        : 'Monster health';
      monsterHpProgress.setAttribute('aria-label', monsterLabel);
    }

    const loadedQuestions = Array.isArray(data.questions)
      ? data.questions.slice()
      : [];
    questions = shuffle(loadedQuestions);

    updateHealthBars();
  }

  function updateHealthBars() {
    const heroPercentRaw =
      hero.health > 0
        ? ((hero.health - hero.damage) / hero.health) * 100
        : 0;
    const monsterPercentRaw =
      monster.health > 0
        ? ((monster.health - monster.damage) / monster.health) * 100
        : 0;

    const heroPercent = Number.isFinite(heroPercentRaw) ? heroPercentRaw : 0;
    const monsterPercent = Number.isFinite(monsterPercentRaw)
      ? monsterPercentRaw
      : 0;

    const clampedHero = Math.max(0, Math.min(heroPercent, 100));
    const clampedMonster = Math.max(0, Math.min(monsterPercent, 100));

    if (heroHpProgress) {
      heroHpProgress.style.setProperty(
        '--progress-value',
        (clampedHero || 0) / 100
      );
      heroHpProgress.setAttribute(
        'aria-valuenow',
        String(Math.round(clampedHero))
      );
    }
    if (monsterHpProgress) {
      monsterHpProgress.style.setProperty(
        '--progress-value',
        (clampedMonster || 0) / 100
      );
      monsterHpProgress.setAttribute(
        'aria-valuenow',
        String(Math.round(clampedMonster))
      );
    }
  }

  function waitForHealthDrain(fillEl) {
    return new Promise((resolve) => {
      if (!fillEl || typeof fillEl.addEventListener !== 'function') {
        resolve();
        return;
      }

      const widthIsEmpty = () => {
        const rectWidth = fillEl.getBoundingClientRect().width;
        if (!Number.isFinite(rectWidth)) {
          return true;
        }
        if (rectWidth <= 0.5) {
          return true;
        }
        const computedWidth = parseFloat(window.getComputedStyle(fillEl).width);
        return Number.isFinite(computedWidth) ? computedWidth <= 0.5 : false;
      };

      if (widthIsEmpty()) {
        resolve();
        return;
      }

      let resolved = false;
      const settle = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        fillEl.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      };

      const handleTransitionEnd = (event) => {
        if (event.propertyName === 'width' && widthIsEmpty()) {
          settle();
        }
      };

      fillEl.addEventListener('transitionend', handleTransitionEnd);

      const startTime = Date.now();
      const poll = () => {
        if (widthIsEmpty()) {
          settle();
          return;
        }
        if (Date.now() - startTime > 1200) {
          settle();
          return;
        }
        window.setTimeout(poll, 100);
      };

      window.setTimeout(poll, 100);
    });
  }

  function updateSummaryExperience(result) {
    if (!result || typeof result !== 'object') {
      return;
    }
    const earned = Number(result.earned) > 0 ? Math.round(result.earned) : 0;
    const displayText = earned > 0 ? `+${earned}` : '+0';
    if (summaryExperienceValue && summaryExperienceText) {
      applyGoalResult(summaryExperienceValue, summaryExperienceText, displayText, earned > 0);
    } else if (summaryExperienceText) {
      summaryExperienceText.textContent = displayText;
    }

    const total = Number.isFinite(result.total) ? Math.max(result.total, 0) : null;
    const experienceValue = Number.isFinite(result.experience)
      ? Math.max(result.experience, 0)
      : currentExperience;
    updateLevelProgressDisplay(experienceValue, total);
  }

  function showQuestion() {
    if (battleEnded) {
      return;
    }
    const q = questions[currentQuestion];
    if (!q) return;
    questionText.textContent = q.question || q.q || '';
    choicesEl.innerHTML = '';

    let choices = q.choices;
    if (!choices && q.options) {
      choices = q.options.map((opt) => ({ name: opt, correct: opt === q.answer }));
    }

    (choices || []).forEach((choice) => {
      const div = document.createElement('div');
      div.classList.add('choice');
      div.dataset.correct = !!choice.correct;
      if (choice.image) {
        const rawImage =
          typeof choice.image === 'string' ? choice.image.trim() : '';
        if (rawImage) {
          const hasProtocol = /^https?:\/\//i.test(rawImage) || rawImage.startsWith('data:');
          let imagePath = rawImage.replace(/^\/+/, '');
          if (!hasProtocol && !imagePath.startsWith('images/')) {
            if (!imagePath.includes('/')) {
              imagePath = `images/questions/${imagePath}`;
            }
          }
          const resolvedImage = resolveAssetPath(imagePath);
          if (resolvedImage) {
            const img = document.createElement('img');
            img.src = resolvedImage;
            img.alt = choice.name || '';
            div.appendChild(img);
          }
        }
      }
      const p = document.createElement('p');
      p.textContent = choice.name || '';
      div.appendChild(p);
      choicesEl.appendChild(div);
    });
    questionBox.classList.add('show');
    updateStreak();
  }

  function updateStreak() {
    const percent = Math.min(streak / STREAK_GOAL, 1) * 100;
    if (streak > 0) {
      topBar?.classList.add('show');
      progressBar.classList.add('with-label');
      void progressFill.offsetWidth;
      progressFill.style.width = percent + '%';
      if (streakMaxed) {
        progressFill.style.background = '#FF6A00';
        streakLabel.textContent = '2x Attack';
        streakLabel.style.color = '#FF6A00';
        streakLabel.classList.remove('show');
        void streakLabel.offsetWidth;
        streakLabel.classList.add('show');
        if (streakIcon && !streakIconShown) {
          progressFill.addEventListener(
            'transitionend',
            () => {
              streakIcon.classList.add('show');
            },
            { once: true }
          );
          streakIconShown = true;
        }
      } else {
        progressFill.style.background = '#006AFF';
        streakLabel.style.color = '#006AFF';
        streakLabel.textContent = `${streak} in a row`;
        streakLabel.classList.remove('show');
        void streakLabel.offsetWidth;
        streakLabel.classList.add('show');
        if (streakIcon) {
          streakIcon.classList.remove('show');
        }
        streakIconShown = false;
      }
    } else {
      topBar?.classList.remove('show');
      progressBar.classList.remove('with-label');
      progressFill.style.width = '0%';
      progressFill.style.background = '#006AFF';
      streakLabel.classList.remove('show');
      if (streakIcon) {
        streakIcon.classList.remove('show');
      }
      streakIconShown = false;
    }
  }

  function heroAttack() {
    if (battleEnded) {
      return;
    }
    heroImg.classList.add('attack');
    const handler = (e) => {
      if (e.animationName !== 'hero-attack') return;
      heroImg.classList.remove('attack');
      heroImg.removeEventListener('animationend', handler);
      setTimeout(() => {
        if (battleEnded) {
          return;
        }
        monster.damage += hero.attack;
        updateHealthBars();
        if (streakMaxed) {
          // Double-attack was used; reset streak.
          streak = 0;
          streakMaxed = false;
          updateStreak();
        }
        setTimeout(() => {
          if (battleEnded) {
            return;
          }
          if (monster.damage >= monster.health) {
            endBattle(true, { waitForHpDrain: monsterHpFill });
          } else {
            currentQuestion++;
            showQuestion();
          }
        }, 2000);
      }, 500);
    };
    heroImg.addEventListener('animationend', handler);
  }

  function monsterAttack() {
    if (battleEnded) {
      return;
    }
    setTimeout(() => {
      if (battleEnded) {
        return;
      }
      monsterImg.classList.add('attack');
      const handler = (e) => {
        if (e.animationName !== 'monster-attack') return;
        monsterImg.classList.remove('attack');
        monsterImg.removeEventListener('animationend', handler);
        setTimeout(() => {
          if (battleEnded) {
            return;
          }
          hero.damage += monster.attack;
          updateHealthBars();
          setTimeout(() => {
            if (battleEnded) {
              return;
            }
            if (hero.damage >= hero.health) {
              endBattle(false, { waitForHpDrain: heroHpFill });
            } else {
              currentQuestion++;
              showQuestion();
            }
          }, 2000);
        }, 500);
      };
      monsterImg.addEventListener('animationend', handler);
    }, 300);
  }

  setStreakButton?.addEventListener('click', () => {
    if (battleEnded) {
      return;
    }
    const targetStreak = Math.max(0, STREAK_GOAL - 1);
    streak = targetStreak;
    streakMaxed = false;
    updateStreak();
  });

  endBattleButton?.addEventListener('click', () => {
    if (battleEnded) {
      return;
    }
    document.dispatchEvent(new Event('close-question'));
    window.setTimeout(() => {
      endBattle(true);
    }, 0);
  });

  resetLevelButton?.addEventListener('click', () => {
    persistProgress({ battleLevel: 1, currentExperience: 0 });
    currentBattleLevel = 1;
    currentExperience = 0;
    const resetTotal = getTotalExperienceForLevel(1);
    if (resetTotal !== null) {
      levelTotalExperience = resetTotal;
    } else {
      levelTotalExperience = 0;
    }
    updateLevelProgressDisplay(currentExperience);
  });

  logOutButton?.addEventListener('click', async () => {
    const supabase = window.supabaseClient;

    if (supabase?.auth?.signOut) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Supabase sign out failed', error);
        }
      } catch (error) {
        console.warn('Unexpected error during sign out', error);
      }
    }

    try {
      window.localStorage?.clear();
    } catch (error) {
      console.warn('Unable to clear local storage.', error);
    }

    try {
      window.sessionStorage?.clear();
    } catch (error) {
      console.warn('Unable to clear session storage.', error);
    }

    window.location.replace(`${ASSET_BASE_PATH}/index.html`);
  });

  document.addEventListener('answer-submitted', (e) => {
    if (battleEnded) {
      return;
    }
    const correct = e.detail.correct;
    if (correct) {
      let rewardType = '';
      if (!streakMaxed) {
        streak++;
        if (streak >= STREAK_GOAL) {
          streak = STREAK_GOAL;
          streakMaxed = true;
          hero.attack *= 2;
          rewardType = 'double';
        } else {
          const stats = ['attack', 'health'];
          const stat = stats[Math.floor(Math.random() * stats.length)];
          if (stat === 'attack') {
            hero.attack++;
            rewardType = 'attack';
          } else {
            hero.health++;
            rewardType = 'health';
            updateHealthBars();
          }
        }
      } else {
        const stats = ['attack', 'health'];
        const stat = stats[Math.floor(Math.random() * stats.length)];
        if (stat === 'attack') {
          hero.attack++;
          rewardType = 'attack';
        } else {
          hero.health++;
          rewardType = 'health';
          updateHealthBars();
        }
      }

      updateStreak();

      // Keep the question visible briefly so the player can
      // see the result and streak progress before it closes.
      // If the streak just hit the goal (x2), linger a bit longer.
      const lingerTime = rewardType === 'double' ? 3000 : 2000;
      setTimeout(() => {
        document.dispatchEvent(new Event('close-question'));
        setTimeout(heroAttack, 1300);
      }, lingerTime);
    } else {
      streak = 0;
      streakMaxed = false;
      updateStreak();
      setTimeout(() => {
        document.dispatchEvent(new Event('close-question'));
        monsterAttack();
      }, 2000);
    }
  });
  function endBattle(win, _options = {}) {
    if (battleEnded) {
      return;
    }
    battleEnded = true;
    devControls?.classList.add('battle-dev-controls--hidden');
    document.dispatchEvent(new Event('close-question'));

    const progressResult = recordBattleProgress(win);
    updateSummaryExperience(progressResult);

    if (completeEnemyImg && monsterImg) {
      completeEnemyImg.src = monsterImg.src;
      if (monster.name) {
        completeEnemyImg.alt = win
          ? `${monster.name} defeated in battle`
          : `${monster.name} preparing for the next battle`;
      }
    }

    if (win) {
      if (progressResult?.leveledUp) {
        setBattleCompleteTitleLines('Level', 'Up!');
      } else {
        const monsterName =
          typeof monster?.name === 'string' ? monster.name.trim() : '';
        const victoryName = monsterName || 'Victory';
        setBattleCompleteTitleLines(victoryName, 'Defeated!');
      }
    } else {
      setBattleCompleteTitleLines('Keep', 'Practicing!');
    }

    const showCompleteMessage = () => {
      if (!completeMessage) {
        return;
      }
      completeMessage.classList.add('show');
      completeMessage.setAttribute('aria-hidden', 'false');
      if (typeof completeMessage.focus === 'function') {
        completeMessage.focus();
      }
    };

    const waitForHpDrainEl =
      _options && typeof _options.waitForHpDrain?.addEventListener === 'function'
        ? _options.waitForHpDrain
        : null;

    if (waitForHpDrainEl) {
      waitForHealthDrain(waitForHpDrainEl).then(() => {
        showCompleteMessage();
      });
    } else {
      showCompleteMessage();
    }
  }

  if (nextMissionBtn) {
    nextMissionBtn.addEventListener('click', () => {
      const action = nextMissionBtn.dataset.action;
      if (action === 'retry') {
        window.location.reload();
      } else {
        window.location.href = `${ASSET_BASE_PATH}/index.html`;
      }
    });
  }

  function initBattle() {
    battleEnded = false;
    streak = 0;
    streakMaxed = false;
    streakIconShown = false;
    currentQuestion = 0;
    if (completeMessage) {
      completeMessage.classList.remove('show');
      completeMessage.setAttribute('aria-hidden', 'true');
    }
    setBattleCompleteTitleLines('Battle', 'Complete');
    if (nextMissionBtn) {
      nextMissionBtn.textContent = 'Next Mission';
      nextMissionBtn.dataset.action = 'next';
    }
    if (summaryExperienceValue) {
      summaryExperienceValue.classList.remove('goal-result--met', 'goal-result--missed');
      const existingIcon = summaryExperienceValue.querySelector('.goal-result-icon');
      if (existingIcon?.parentElement) {
        existingIcon.parentElement.removeChild(existingIcon);
      }
    }
    if (summaryExperienceText) {
      summaryExperienceText.textContent = '+0';
    }
    loadData();
    updateStreak();
    setTimeout(showQuestion, 2000);
    scheduleLandingRedirect();
  }

  if (window.preloadedData) {
    initBattle();
  } else {
    document.addEventListener('data-loaded', initBattle, { once: true });
  }
});
})();
