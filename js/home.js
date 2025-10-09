const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';
const HOME_PROGRESS_STORAGE_KEY = 'mathmonstersHomeProgressState';
const HOME_PROGRESS_FALLBACK_BATTLES = 5;

const redirectToWelcome = () => {
  window.location.replace('welcome.html');
};

const clearGuestMode = () => {
  try {
    window.localStorage?.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear guest session.', error);
  }
};

const setElementDisabled = (element, disabled) => {
  if (!element) {
    return;
  }

  const shouldDisable = Boolean(disabled);

  if (shouldDisable) {
    element.setAttribute('aria-disabled', 'true');
    if (!element.hasAttribute('data-previous-tabindex')) {
      const current = element.getAttribute('tabindex');
      if (current !== null) {
        element.setAttribute('data-previous-tabindex', current);
      }
    }
    element.setAttribute('tabindex', '-1');
    return;
  }

  element.removeAttribute('aria-disabled');
  if (element.hasAttribute('data-previous-tabindex')) {
    const previous = element.getAttribute('data-previous-tabindex');
    if (previous) {
      element.setAttribute('tabindex', previous);
    } else {
      element.removeAttribute('tabindex');
    }
    element.removeAttribute('data-previous-tabindex');
    return;
  }

  const initialTabIndex = element.getAttribute('data-initial-tabindex');
  if (initialTabIndex !== null) {
    element.setAttribute('tabindex', initialTabIndex || '0');
  } else if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }
};

const isElementDisabled = (element) =>
  element ? element.getAttribute('aria-disabled') === 'true' : false;

const attachInteractiveHandler = (element, handler) => {
  if (!element || typeof handler !== 'function') {
    return;
  }

  const handleClick = (event) => {
    if (isElementDisabled(element)) {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }
      return;
    }
    handler(event);
  };

  element.addEventListener('click', handleClick);
  element.addEventListener('keydown', (event) => {
    if (isElementDisabled(element)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  });
};

const sanitizeSnapshotEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const sanitized = {};
  if (typeof entry.name === 'string' && entry.name.trim()) {
    sanitized.name = entry.name.trim();
  }
  if (typeof entry.sprite === 'string' && entry.sprite.trim()) {
    sanitized.sprite = entry.sprite.trim();
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeBattleProgressState = (state) => {
  if (!isPlainObject(state)) {
    return null;
  }

  const clampPositiveInteger = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return Math.round(numeric);
  };

  const battleLevel = clampPositiveInteger(state.battleLevel);
  const currentBattle = clampPositiveInteger(state.currentBattle);
  const totalBattles = clampPositiveInteger(state.totalBattles);
  const levelLabel =
    typeof state.levelLabel === 'string' && state.levelLabel.trim()
      ? state.levelLabel.trim()
      : '';

  const resolvedTotal = totalBattles ?? (currentBattle ?? null);
  const resolvedCurrent = currentBattle ?? (resolvedTotal ?? null);

  const ratio =
    resolvedTotal && resolvedCurrent
      ? Math.max(0, Math.min(1, resolvedCurrent / resolvedTotal))
      : 0;

  return {
    battleLevel: battleLevel ?? null,
    currentBattle: resolvedCurrent ?? null,
    totalBattles: resolvedTotal ?? null,
    levelLabel,
    ratio,
    timestamp: Number.isFinite(state.timestamp) ? state.timestamp : Date.now(),
  };
};

const readStoredHomeBattleProgress = () => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(HOME_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return sanitizeBattleProgressState(parsed);
  } catch (error) {
    console.warn('Unable to read stored home battle progress.', error);
    return null;
  }
};

const writeStoredHomeBattleProgress = (state) => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (!state) {
      sessionStorage.removeItem(HOME_PROGRESS_STORAGE_KEY);
      return;
    }

    const sanitized = sanitizeBattleProgressState({ ...state, timestamp: Date.now() });
    if (!sanitized) {
      sessionStorage.removeItem(HOME_PROGRESS_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(HOME_PROGRESS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('Unable to store home battle progress.', error);
  }
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

  if (isPlainObject(source.battle)) {
    candidateKeys.forEach((key) => tryAdd(source.battle[key]));
  }

  if (isPlainObject(source.battleVariables)) {
    candidateKeys.forEach((key) => tryAdd(source.battleVariables[key]));
  }

  if (isPlainObject(source.battleTracking)) {
    candidateKeys.forEach((key) => tryAdd(source.battleTracking[key]));
  }

  if (isPlainObject(source.progress)) {
    candidateKeys.forEach((key) => tryAdd(source.progress[key]));
  }

  if (isPlainObject(source.preferences)) {
    candidateKeys.forEach((key) => tryAdd(source.preferences[key]));
  }

  if (isPlainObject(source.player)) {
    collectMathTypeCandidates(source.player, accumulator);
  }

  if (isPlainObject(source.preview)) {
    collectMathTypeCandidates(source.preview, accumulator);
  }

  return accumulator;
};

const findMathProgressEntry = (progressRoot, candidates = []) => {
  if (!isPlainObject(progressRoot)) {
    return { key: null, entry: null };
  }

  const isProgressEntry = (value) =>
    isPlainObject(value) &&
    (value.currentBattle !== undefined || value.currentLevel !== undefined);

  const keys = Object.keys(progressRoot);
  const normalizedCandidates = candidates
    .map((candidate) =>
      typeof candidate === 'string' && candidate.trim()
        ? candidate.trim().toLowerCase()
        : ''
    )
    .filter(Boolean);

  const pickEntry = (key) => {
    if (typeof key !== 'string') {
      return null;
    }
    const entry = progressRoot[key];
    return isProgressEntry(entry) ? { key, entry } : null;
  };

  for (const candidate of normalizedCandidates) {
    const matchKey = keys.find((key) => {
      if (typeof key !== 'string') {
        return false;
      }
      return key.trim().toLowerCase() === candidate;
    });

    if (matchKey) {
      const match = pickEntry(matchKey);
      if (match) {
        return match;
      }
    }
  }

  for (const key of keys) {
    const match = pickEntry(key);
    if (match) {
      return match;
    }
  }

  return { key: normalizedCandidates[0] || null, entry: null };
};

const resolveBattleCountForLevel = (levelData) => {
  if (!isPlainObject(levelData)) {
    return null;
  }

  const countEntries = (entries) =>
    Array.isArray(entries) ? entries.filter(Boolean).length : 0;

  const primaryCount = countEntries(levelData.battles);
  if (primaryCount > 0) {
    return primaryCount;
  }

  if (isPlainObject(levelData.battle)) {
    const nestedCount = countEntries(levelData.battle?.monsters);
    if (nestedCount > 0) {
      return nestedCount;
    }
  }

  const fallbackCount = countEntries(levelData.monsters);
  return fallbackCount > 0 ? fallbackCount : null;
};

const resolveLevelByBattleNumber = (levels, battleLevelNumber) => {
  if (!Array.isArray(levels) || !Number.isFinite(battleLevelNumber)) {
    return null;
  }

  const normalizedLevel = Math.round(battleLevelNumber);
  return (
    levels.find((level) => {
      if (!isPlainObject(level)) {
        return false;
      }
      const directNumber = Number(level?.battleLevel ?? level?.level);
      return Number.isFinite(directNumber) && Math.round(directNumber) === normalizedLevel;
    }) || null
  );
};

const clampPositiveIntegerValue = (value, { allowZero = false } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (!allowZero && numeric <= 0) {
    return null;
  }

  if (allowZero && numeric < 0) {
    return null;
  }

  const rounded = Math.round(numeric);
  if (!allowZero && rounded <= 0) {
    return null;
  }

  if (allowZero && rounded < 0) {
    return null;
  }

  return rounded;
};

const pickFirstIntegerValue = (candidates, options) => {
  if (!Array.isArray(candidates)) {
    return null;
  }

  for (const candidate of candidates) {
    const normalized = clampPositiveIntegerValue(candidate, options);
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return null;
};

const computeHomeBattleProgress = (data) => {
  if (!isPlainObject(data)) {
    return null;
  }

  const mathTypeCandidates = Array.from(collectMathTypeCandidates(data));
  const progressSources = [];

  if (isPlainObject(data.progress)) {
    progressSources.push(data.progress);
  }

  if (isPlainObject(data.player?.progress)) {
    progressSources.push(data.player.progress);
  }

  if (isPlainObject(data.preview?.progress)) {
    progressSources.push(data.preview.progress);
  }

  let mathProgressEntry = null;
  let mathProgressKey = null;

  for (const source of progressSources) {
    const { key, entry } = findMathProgressEntry(source, mathTypeCandidates);
    if (!mathProgressKey && key) {
      mathProgressKey = key;
    }
    if (entry) {
      mathProgressEntry = entry;
      mathProgressKey = key;
      break;
    }
  }

  if (!mathProgressEntry) {
    for (const source of progressSources) {
      const fallback = Object.entries(source).find(([, value]) =>
        isPlainObject(value) &&
        (value.currentBattle !== undefined || value.currentLevel !== undefined)
      );
      if (fallback) {
        mathProgressKey = fallback[0];
        mathProgressEntry = fallback[1];
        break;
      }
    }
  }

  const battleLevelCandidates = [
    mathProgressEntry?.currentLevel,
    data.player?.currentLevel,
    data.progress?.battleLevel,
    data.player?.progress?.battleLevel,
    data.level?.battleLevel,
    data.battle?.battleLevel,
    data.battleTracking?.level,
    data.battleTracking?.battleLevel,
    data.preview?.battleLevel,
    data.preview?.activeLevel?.battleLevel,
  ];

  if (mathProgressKey && typeof mathProgressKey === 'string') {
    battleLevelCandidates.push(mathProgressKey);
  }

  const normalizedBattleLevel = pickFirstIntegerValue(battleLevelCandidates);

  const activeLevel = (() => {
    if (
      isPlainObject(data.level) &&
      (!Number.isFinite(normalizedBattleLevel) ||
        pickFirstIntegerValue([
          data.level?.battleLevel,
          data.level?.level,
        ]) === normalizedBattleLevel)
    ) {
      return data.level;
    }

    if (
      isPlainObject(data.preview?.activeLevel) &&
      (!Number.isFinite(normalizedBattleLevel) ||
        pickFirstIntegerValue([
          data.preview?.activeLevel?.battleLevel,
          data.preview?.activeLevel?.level,
        ]) === normalizedBattleLevel)
    ) {
      return data.preview.activeLevel;
    }

    if (Number.isFinite(normalizedBattleLevel)) {
      return resolveLevelByBattleNumber(data.levels, normalizedBattleLevel) || null;
    }

    return null;
  })();

  const totalBattleCandidates = [
    mathProgressEntry?.totalBattles,
    mathProgressEntry?.levelBattles,
    data.preview?.progressBattleTotal,
    data.preview?.activeLevel?.totalBattles,
    data.battle?.totalBattles,
    data.progress?.totalBattles,
    data.player?.progress?.totalBattles,
  ];

  let totalBattles = pickFirstIntegerValue(totalBattleCandidates);

  if (!Number.isFinite(totalBattles) || totalBattles <= 0) {
    const levelBattleCount = resolveBattleCountForLevel(activeLevel);
    if (Number.isFinite(levelBattleCount) && levelBattleCount > 0) {
      totalBattles = levelBattleCount;
    }
  }

  if (!Number.isFinite(totalBattles) || totalBattles <= 0) {
    totalBattles = HOME_PROGRESS_FALLBACK_BATTLES;
  }

  const currentBattleCandidates = [
    mathProgressEntry?.currentBattle,
    data.preview?.progressBattleCurrent,
    data.battle?.currentBattle,
    data.battleTracking?.currentBattle,
    data.battleTracking?.battle,
  ];

  let currentBattle = pickFirstIntegerValue(currentBattleCandidates, {
    allowZero: true,
  });

  if (!Number.isFinite(currentBattle) || currentBattle <= 0) {
    currentBattle = 1;
  }

  if (currentBattle > totalBattles) {
    currentBattle = totalBattles;
  }

  const ratio = totalBattles > 0 ? Math.max(0, Math.min(1, currentBattle / totalBattles)) : 0;
  const levelLabel = Number.isFinite(normalizedBattleLevel)
    ? `Level ${Math.max(1, Math.round(normalizedBattleLevel))}`
    : '';

  return {
    battleLevel: Number.isFinite(normalizedBattleLevel)
      ? Math.max(1, Math.round(normalizedBattleLevel))
      : null,
    levelLabel,
    currentBattle,
    totalBattles,
    ratio,
  };
};

const applyBattleProgressAttributes = (progressElement, state) => {
  if (!progressElement || !isPlainObject(state)) {
    return;
  }

  const clampPositiveInteger = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return Math.round(numeric);
  };

  const totalBattles = clampPositiveInteger(state.totalBattles);
  const currentBattle = clampPositiveInteger(state.currentBattle);
  const resolvedTotal = totalBattles ?? (currentBattle ?? null);
  const resolvedCurrent = currentBattle
    ? Math.min(currentBattle, resolvedTotal ?? currentBattle)
    : resolvedTotal;

  progressElement.setAttribute('aria-valuemin', '0');

  if (resolvedTotal) {
    progressElement.setAttribute('aria-valuemax', `${resolvedTotal}`);
  }

  if (resolvedCurrent) {
    progressElement.setAttribute('aria-valuenow', `${resolvedCurrent}`);
  }

  if (resolvedTotal && resolvedCurrent) {
    progressElement.setAttribute(
      'aria-valuetext',
      `Battle ${resolvedCurrent} of ${resolvedTotal}`
    );
  }
};

const triggerHeroLevelPop = (element) => {
  if (!element) {
    return;
  }

  const POP_CLASS = 'home__hero-level--pop';

  element.classList.remove(POP_CLASS);
  // Force reflow to restart animation when class is re-applied.
  void element.offsetWidth;

  const handleAnimationEnd = () => {
    element.classList.remove(POP_CLASS);
    element.removeEventListener('animationend', handleAnimationEnd);
  };

  element.addEventListener('animationend', handleAnimationEnd);
  element.classList.add(POP_CLASS);
};

const shouldPlayLevelCompletionSequence = (previousState, nextState) => {
  if (!isPlainObject(previousState) || !isPlainObject(nextState)) {
    return false;
  }

  const prevLevel = Number(previousState.battleLevel);
  const nextLevel = Number(nextState.battleLevel);
  const prevCurrent = Number(previousState.currentBattle);
  const prevTotal = Number(previousState.totalBattles);
  const nextCurrent = Number(nextState.currentBattle);

  const previousComplete =
    Number.isFinite(prevCurrent) &&
    Number.isFinite(prevTotal) &&
    prevTotal > 0 &&
    prevCurrent >= prevTotal;

  if (!previousComplete) {
    return false;
  }

  if (Number.isFinite(prevLevel) && Number.isFinite(nextLevel)) {
    if (nextLevel > prevLevel) {
      return true;
    }

    if (nextLevel === prevLevel && Number.isFinite(nextCurrent)) {
      return nextCurrent === 1;
    }
  }

  return false;
};

const storeBattleSnapshot = (snapshot) => {
  const sanitizedSnapshot = snapshot && typeof snapshot === 'object'
    ? {
        battleLevel: Number.isFinite(snapshot.battleLevel)
          ? snapshot.battleLevel
          : null,
        hero: sanitizeSnapshotEntry(snapshot.hero),
        monster: sanitizeSnapshotEntry(snapshot.monster),
        timestamp: Date.now(),
      }
    : null;

  if (typeof window !== 'undefined') {
    window.mathMonstersBattleSnapshot = sanitizedSnapshot;
  }

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (!sanitizedSnapshot) {
      sessionStorage.removeItem(NEXT_BATTLE_SNAPSHOT_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(
      NEXT_BATTLE_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(sanitizedSnapshot)
    );
  } catch (error) {
    console.warn('Unable to persist next battle snapshot from home.', error);
  }
};

const readBattleSnapshot = () => {
  if (typeof window !== 'undefined' && window.mathMonstersBattleSnapshot) {
    const existing = window.mathMonstersBattleSnapshot;
    if (existing && typeof existing === 'object') {
      return existing;
    }
  }

  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(NEXT_BATTLE_SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const snapshot = {
      battleLevel: Number.isFinite(parsed.battleLevel) ? parsed.battleLevel : null,
      hero: sanitizeSnapshotEntry(parsed.hero),
      monster: sanitizeSnapshotEntry(parsed.monster),
      timestamp: Number.isFinite(parsed.timestamp) ? parsed.timestamp : Date.now(),
    };

    if (typeof window !== 'undefined') {
      window.mathMonstersBattleSnapshot = snapshot;
    }

    return snapshot;
  } catch (error) {
    console.warn('Unable to read stored battle snapshot on home.', error);
    return null;
  }
};

const applySnapshotToHome = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    return;
  }

  const hero = sanitizeSnapshotEntry(snapshot.hero);
  const heroImg = document.querySelector('[data-hero-sprite]');
  const heroNameEl = document.querySelector('[data-hero-name]');

  if (hero && heroImg) {
    if (hero.sprite) {
      heroImg.src = hero.sprite;
    }
    if (hero.name) {
      heroImg.alt = `${hero.name} ready for the next adventure`;
    }
  }

  if (hero && hero.name && heroNameEl) {
    heroNameEl.textContent = hero.name;
  }
};

const scheduleAnimationFrame = (callback) => {
  if (typeof callback !== 'function') {
    return;
  }

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
    return;
  }

  setTimeout(callback, 16);
};

const clampProgressRatio = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  if (numericValue <= 0) {
    return 0;
  }
  if (numericValue >= 1) {
    return 1;
  }
  return numericValue;
};

const animateProgressValue = (progressElement, ratio, options = {}) => {
  if (!progressElement) {
    return;
  }

  const normalizedRatio = clampProgressRatio(ratio);
  const progressFill = progressElement.querySelector('.progress__fill');
  const { onComplete } = isPlainObject(options) ? options : {};

  const animationId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  progressElement.dataset.progressAnimationId = animationId;

  const runCompletion = () => {
    if (progressElement.dataset.progressAnimationId === animationId) {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  };

  if (progressFill && typeof progressFill._progressAnimationCleanup === 'function') {
    progressFill._progressAnimationCleanup();
  }

  if (normalizedRatio <= 0) {
    progressElement.style.setProperty('--progress-value', '0');
    scheduleAnimationFrame(runCompletion);
    return;
  }

  progressElement.style.setProperty('--progress-value', '0');

  if (progressFill) {
    progressFill.style.transition = 'none';
  }

  // Force a reflow so the browser applies the zeroed progress before animating.
  void progressElement.offsetWidth;

  if (progressFill) {
    progressFill.style.transition = '';
  }

  scheduleAnimationFrame(() => {
    let fallbackTimeout = null;

    const finalize = () => {
      if (fallbackTimeout !== null) {
        window.clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      if (progressFill && progressFill._progressAnimationCleanup === cleanup) {
        delete progressFill._progressAnimationCleanup;
      }
      runCompletion();
    };

    const cleanup = () => {
      if (fallbackTimeout !== null) {
        window.clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      if (progressFill) {
        progressFill.removeEventListener('transitionend', handleTransitionEnd);
        if (progressFill._progressAnimationCleanup === cleanup) {
          delete progressFill._progressAnimationCleanup;
        }
      }
    };

    const handleTransitionEnd = (event) => {
      if (event && event.propertyName && event.propertyName !== 'width') {
        return;
      }
      cleanup();
      finalize();
    };

    if (progressFill) {
      progressFill.addEventListener('transitionend', handleTransitionEnd);
      progressFill._progressAnimationCleanup = cleanup;
      fallbackTimeout = window.setTimeout(() => {
        cleanup();
        finalize();
      }, 700);
    } else {
      fallbackTimeout = window.setTimeout(finalize, 450);
    }

    progressElement.style.setProperty('--progress-value', `${normalizedRatio}`);
  });
};

const updateHomeFromPreloadedData = () => {
  const data = window.preloadedData;
  if (!data || typeof data !== 'object') {
    return;
  }

  const heroSource =
    (data.hero && typeof data.hero === 'object' ? data.hero : null) ||
    (data.player?.hero && typeof data.player.hero === 'object' ? data.player.hero : null);
  const hero = heroSource ? { ...heroSource } : null;
  const monster = data.monster && typeof data.monster === 'object' ? { ...data.monster } : null;

  const heroImg = document.querySelector('[data-hero-sprite]');
  const heroNameEl = document.querySelector('[data-hero-name]');
  if (heroImg && hero?.sprite) {
    heroImg.src = hero.sprite;
  }
  if (heroImg && hero?.name) {
    heroImg.alt = `${hero.name} ready for the next adventure`;
  }
  if (heroNameEl && hero?.name) {
    heroNameEl.textContent = hero.name;
  }

  const gemValueEl = document.querySelector('[data-hero-gems]');
  const gemCandidates = [
    data.progress?.gems,
    data.player?.gems,
    data.player?.progress?.gems,
  ];
  const gemCount = gemCandidates
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value));
  if (gemValueEl && Number.isFinite(gemCount)) {
    gemValueEl.textContent = gemCount;
  }

  const heroLevelEl = document.querySelector('[data-hero-level]');
  const progressElement = document.querySelector('[data-battle-progress]');

  const previousProgressState = readStoredHomeBattleProgress();
  const progressState = computeHomeBattleProgress(data);
  const hasProgressState = isPlainObject(progressState);
  const shouldAnimateLevelUp = shouldPlayLevelCompletionSequence(
    previousProgressState,
    progressState
  );

  if (heroLevelEl) {
    const initialLabel = shouldAnimateLevelUp && previousProgressState?.levelLabel
      ? previousProgressState.levelLabel
      : progressState?.levelLabel;
    if (initialLabel) {
      heroLevelEl.textContent = initialLabel;
    }
  }

  if (progressElement && hasProgressState) {
    const playStandardAnimation = () => {
      applyBattleProgressAttributes(progressElement, progressState);
      animateProgressValue(progressElement, progressState.ratio || 0);
    };

    if (shouldAnimateLevelUp && previousProgressState) {
      const previousState = {
        ...previousProgressState,
        ratio: 1,
      };
      applyBattleProgressAttributes(progressElement, previousState);
      animateProgressValue(progressElement, 1, {
        onComplete: () => {
          if (heroLevelEl && progressState?.levelLabel) {
            heroLevelEl.textContent = progressState.levelLabel;
            triggerHeroLevelPop(heroLevelEl);
          }
          playStandardAnimation();
        },
      });
    } else {
      playStandardAnimation();
    }
  } else if (progressElement) {
    progressElement.style.setProperty('--progress-value', '0');
    progressElement.setAttribute('aria-valuemin', '0');
  }

  writeStoredHomeBattleProgress(progressState);

  storeBattleSnapshot({
    battleLevel: Number.isFinite(progressState?.battleLevel)
      ? progressState.battleLevel
      : null,
    hero,
    monster,
  });
};

const logoutAndRedirect = async () => {
  const supabase = window.supabaseClient;
  if (supabase?.auth?.signOut) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Failed to sign out user.', error);
      }
    } catch (error) {
      console.warn('Unexpected error during sign out.', error);
    }
  }

  clearGuestMode();
  redirectToWelcome();
};

const setupHomeLogout = () => {
  const logoutTrigger = document.querySelector('[data-settings-logout]');
  if (!logoutTrigger) {
    return;
  }

  if (logoutTrigger.dataset.logoutBound === 'true') {
    return;
  }
  logoutTrigger.dataset.logoutBound = 'true';

  const handleLogout = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (isElementDisabled(logoutTrigger)) {
      return;
    }

    setElementDisabled(logoutTrigger, true);
    logoutTrigger.setAttribute('aria-busy', 'true');

    await logoutAndRedirect();
  };

  attachInteractiveHandler(logoutTrigger, handleLogout);
};

const initializeHomePage = () => {
  setupHomeLogout();
  applySnapshotToHome(readBattleSnapshot());
  updateHomeFromPreloadedData();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHomePage);
} else {
  initializeHomePage();
}

document.addEventListener('data-loaded', () => {
  applySnapshotToHome(readBattleSnapshot());
  updateHomeFromPreloadedData();
});
