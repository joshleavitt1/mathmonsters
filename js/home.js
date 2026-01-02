const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';
const HOME_PROGRESS_STORAGE_KEY = 'mathmonstersHomeProgressState';
const HOME_PROGRESS_FALLBACK_BATTLES = 5;
const HOME_PROGRESS_INITIAL_ANIMATION_DELAY_MS = 1000;
const HOME_PROGRESS_INITIAL_ANIMATION_COMPLETE_DATA_KEY =
  'progressInitialAnimationComplete';
const HOME_PROGRESS_INITIAL_TIMEOUT_PROPERTY = '__homeInitialProgressTimeout';
const GEM_REWARD_ANIMATION_STORAGE_KEY = 'mathmonstersGemRewardAnimation';

const normalizeNonNegativeInteger = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.max(0, Math.round(numericValue));
};

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

  const currentLevel = clampPositiveInteger(state.currentLevel);
  const levelLabel =
    typeof state.levelLabel === 'string' && state.levelLabel.trim()
      ? state.levelLabel.trim()
      : '';

  const ratio =
    typeof state.ratio === 'number' ? Math.max(0, Math.min(1, state.ratio)) : 0;

  return {
    currentLevel: currentLevel ?? null,
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

const takePendingGemRewardAnimation = () => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(GEM_REWARD_ANIMATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    sessionStorage.removeItem(GEM_REWARD_ANIMATION_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const end = normalizeNonNegativeInteger(parsed.end);
    const start = normalizeNonNegativeInteger(parsed.start);
    const amount = normalizeNonNegativeInteger(parsed.amount);
    const duration = normalizeNonNegativeInteger(parsed.duration);

    return {
      end,
      start,
      amount,
      duration: duration !== null ? duration : null,
    };
  } catch (error) {
    console.warn('Unable to read gem reward animation state.', error);
    return null;
  }
};

const animateNumericValue = (element, startValue, endValue, options = {}) =>
  new Promise((resolve) => {
    const targetElement = element;
    const start = Number(startValue);
    const end = Number(endValue);
    if (
      !targetElement ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start === end
    ) {
      if (targetElement && Number.isFinite(end)) {
        targetElement.textContent = `${Math.round(end)}`;
      }
      resolve();
      return;
    }

    const clampDuration = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return 900;
      }
      return Math.max(250, Math.min(1600, Math.round(numeric)));
    };

    const duration = clampDuration(options.duration);
    const change = end - start;

    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? () => performance.now()
        : () => Date.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const startTime = now();

    const step = () => {
      const elapsed = now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const currentValue = Math.round(start + change * eased);
      targetElement.textContent = `${currentValue}`;

      if (progress < 1 && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(step);
      } else if (progress < 1) {
        setTimeout(step, 16);
      } else {
        resolve();
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(step);
    } else {
      step();
    }
  });

const triggerGemBoxPulse = (boxElement, valueElement) => {
  const applyAnimation = (target, className) => {
    if (!target) {
      return;
    }

    target.classList.remove(className);
    void target.offsetWidth;
    target.classList.add(className);

    const cleanup = () => {
      target.classList.remove(className);
    };

    target.addEventListener('animationend', cleanup, { once: true });
    target.addEventListener('animationcancel', cleanup, { once: true });
  };

  applyAnimation(boxElement, 'home__gem-box--pulse');
  applyAnimation(valueElement, 'home__gem-value--pulse');
};

const playGemRewardHomeAnimation = ({
  boxElement,
  valueElement,
  animationData,
  fallbackFinalValue,
} = {}) => {
  if (!valueElement) {
    return false;
  }

  const normalizedFinal =
    typeof animationData?.end === 'number'
      ? normalizeNonNegativeInteger(animationData.end)
      : normalizeNonNegativeInteger(fallbackFinalValue);

  if (normalizedFinal === null) {
    return false;
  }

  const normalizedStart =
    typeof animationData?.start === 'number'
      ? normalizeNonNegativeInteger(animationData.start)
      : null;

  const normalizedAmount =
    typeof animationData?.amount === 'number'
      ? normalizeNonNegativeInteger(animationData.amount)
      : null;

  const startingValue =
    normalizedStart !== null
      ? normalizedStart
      : normalizedAmount !== null
      ? Math.max(0, normalizedFinal - normalizedAmount)
      : normalizedFinal;

  const resolvedDuration =
    typeof animationData?.duration === 'number' && animationData.duration > 0
      ? Math.max(250, Math.min(1600, Math.round(animationData.duration)))
      : 900;

  valueElement.textContent = `${startingValue}`;
  triggerGemBoxPulse(boxElement, valueElement);

  animateNumericValue(valueElement, startingValue, normalizedFinal, {
    duration: resolvedDuration,
  }).catch(() => {
    valueElement.textContent = `${normalizedFinal}`;
  });

  return true;
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

const resolveLevelByBattleNumber = (levels, currentLevelNumber) => {
  if (!Array.isArray(levels) || !Number.isFinite(currentLevelNumber)) {
    return null;
  }

  const normalizedLevel = Math.round(currentLevelNumber);
  return (
    levels.find((level) => {
      if (!isPlainObject(level)) {
        return false;
      }
      const directNumber = Number(level?.currentLevel ?? level?.level);
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
        isPlainObject(value) && value.currentLevel !== undefined
      );
      if (fallback) {
        mathProgressKey = fallback[0];
        mathProgressEntry = fallback[1];
        break;
      }
    }
  }

  const clampPositiveInteger = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }

    return Math.round(numeric);
  };

  const prioritizedCurrentLevelCandidates = [];

  const mathProgressCurrentLevel = clampPositiveInteger(
    mathProgressEntry?.currentLevel
  );

  if (mathProgressEntry) {
    if (Number.isFinite(mathProgressCurrentLevel)) {
      prioritizedCurrentLevelCandidates.push(mathProgressCurrentLevel);
    } else {
      prioritizedCurrentLevelCandidates.push(mathProgressEntry.currentLevel);
    }
  }

  if (mathProgressKey && typeof mathProgressKey === 'string') {
    prioritizedCurrentLevelCandidates.push(mathProgressKey);
  }

  const fallbackCurrentLevelCandidates = [
    data.preview?.currentLevel,
    data.level?.currentLevel,
    data.battle?.currentLevel,
    data.progress?.currentLevel,
    data.player?.progress?.currentLevel,
  ];

  const currentLevelCandidates = [
    ...prioritizedCurrentLevelCandidates,
    ...fallbackCurrentLevelCandidates,
  ];

  const resolvedCurrentLevel = currentLevelCandidates
    .map((value) => clampPositiveInteger(value))
    .find((value) => Number.isFinite(value));

  const normalizedCurrentLevel = Number.isFinite(resolvedCurrentLevel)
    ? Math.max(1, Math.round(resolvedCurrentLevel))
    : null;

  const levelLabel = normalizedCurrentLevel ? `Level ${normalizedCurrentLevel}` : '';

  return {
    currentLevel: normalizedCurrentLevel,
    levelLabel,
    currentBattle: null,
    totalBattles: null,
    ratio: 0,
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

  const resolvedLevel = clampPositiveInteger(state.currentLevel);

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
    return;
  }

  if (!resolvedTotal) {
    progressElement.setAttribute('aria-valuemax', '1');
  }

  const ratio = typeof state.ratio === 'number' ? Math.max(0, Math.min(1, state.ratio)) : 0;
  progressElement.setAttribute('aria-valuenow', `${ratio}`);

  if (resolvedLevel) {
    progressElement.setAttribute('aria-valuetext', `Level ${resolvedLevel}`);
  } else {
    progressElement.removeAttribute('aria-valuetext');
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

  const prevLevel = Number(previousState.currentLevel);
  const nextLevel = Number(nextState.currentLevel);
  return Number.isFinite(prevLevel) && Number.isFinite(nextLevel) && nextLevel > prevLevel;
};

const storeBattleSnapshot = (snapshot) => {
  const sanitizedSnapshot = snapshot && typeof snapshot === 'object'
    ? {
        currentLevel: Number.isFinite(snapshot.currentLevel)
          ? snapshot.currentLevel
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
      currentLevel: Number.isFinite(parsed.currentLevel) ? parsed.currentLevel : null,
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

    if (progressFill) {
      progressFill.style.removeProperty('transform');
    }

    scheduleAnimationFrame(runCompletion);
    return;
  }

  progressElement.style.setProperty('--progress-value', '0');

  if (progressFill) {
    progressFill.style.transform = 'scaleX(1)';
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
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      if (progressFill && progressFill._progressAnimationCleanup === cleanup) {
        delete progressFill._progressAnimationCleanup;
      }
      runCompletion();
    };

    const cleanup = () => {
      if (fallbackTimeout !== null) {
        clearTimeout(fallbackTimeout);
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
      fallbackTimeout = setTimeout(() => {
        cleanup();
        finalize();
      }, 700);
    } else {
      fallbackTimeout = setTimeout(finalize, 450);
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
  const gemBoxEl = document.querySelector('[data-hero-gem-box]');
  const pendingGemAnimation = takePendingGemRewardAnimation();
  const sanitizeGemValue = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }
    return Math.max(0, Math.round(numericValue));
  };

  const progressGemTotal = sanitizeGemValue(data.progress?.gems);
  const playerGemTotal = sanitizeGemValue(data.player?.gems);
  const nestedProgressGemTotal = sanitizeGemValue(data.player?.progress?.gems);

  const totalCandidates = [
    progressGemTotal,
    playerGemTotal,
    nestedProgressGemTotal,
  ].filter((value) => value !== null);

  let resolvedGemCount =
    totalCandidates.length > 0 ? Math.max(...totalCandidates) : null;

  if (
    playerGemTotal !== null &&
    progressGemTotal !== null &&
    progressGemTotal < playerGemTotal
  ) {
    const combinedTotal = playerGemTotal + progressGemTotal;
    resolvedGemCount =
      resolvedGemCount !== null
        ? Math.max(resolvedGemCount, combinedTotal)
        : combinedTotal;
  }

  if (
    playerGemTotal !== null &&
    nestedProgressGemTotal !== null &&
    nestedProgressGemTotal < playerGemTotal
  ) {
    const combinedTotal = playerGemTotal + nestedProgressGemTotal;
    resolvedGemCount =
      resolvedGemCount !== null
        ? Math.max(resolvedGemCount, combinedTotal)
        : combinedTotal;
  }

  if (resolvedGemCount === null) {
    const awardCandidates = [
      sanitizeGemValue(data.progress?.gemsAwarded),
      sanitizeGemValue(data.player?.gemsAwarded),
      sanitizeGemValue(data.player?.progress?.gemsAwarded),
    ].filter((value) => value !== null);

    if (awardCandidates.length > 0) {
      resolvedGemCount = Math.max(...awardCandidates);
    }
  }

  const fallbackGemTotal =
    resolvedGemCount !== null
      ? resolvedGemCount
      : typeof pendingGemAnimation?.end === 'number'
      ? pendingGemAnimation.end
      : null;

  if (gemValueEl) {
    const playedAnimation = pendingGemAnimation
      ? playGemRewardHomeAnimation({
          boxElement: gemBoxEl,
          valueElement: gemValueEl,
          animationData: pendingGemAnimation,
          fallbackFinalValue: fallbackGemTotal,
        })
      : false;

    if (!playedAnimation && fallbackGemTotal !== null) {
      gemValueEl.textContent = fallbackGemTotal;
    }
  }

  const levelCandidates = [
    data.progress?.currentLevel,
    data.level?.currentLevel,
    data.player?.progress?.currentLevel,
  ];
  const currentLevel = levelCandidates
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);

  const heroLevelEl = document.querySelector('[data-hero-level]');
  const progressElement = document.querySelector(
    '.home__progress[data-battle-progress]'
  );

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
    const runWhenPreloaderHidden = (callbackFn) => {
      if (typeof callbackFn !== 'function') {
        return;
      }

      if (typeof document === 'undefined') {
        callbackFn();
        return;
      }

      const body = document.body;
      if (!body) {
        callbackFn();
        return;
      }

      if (!body.classList.contains('is-preloading')) {
        callbackFn();
        return;
      }

      let resolved = false;
      let observer = null;
      let fallbackId = null;

      const finish = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (fallbackId !== null) {
          clearTimeout(fallbackId);
          fallbackId = null;
        }
        callbackFn();
      };

      if (typeof MutationObserver === 'function') {
        observer = new MutationObserver(() => {
          if (!body.classList.contains('is-preloading')) {
            finish();
          }
        });

        observer.observe(body, { attributes: true, attributeFilter: ['class'] });
      }

      fallbackId = setTimeout(finish, 4500);

      if (!body.classList.contains('is-preloading')) {
        finish();
      }
    };

    const scheduleInitialProgressAnimation = (callback) => {
      if (typeof callback !== 'function') {
        return;
      }

      const completionKey = HOME_PROGRESS_INITIAL_ANIMATION_COMPLETE_DATA_KEY;
      const startAnimation = () => {
        runWhenPreloaderHidden(callback);
      };

      if (progressElement.dataset[completionKey] === 'true') {
        startAnimation();
        return;
      }

      const delayMs = Number.isFinite(HOME_PROGRESS_INITIAL_ANIMATION_DELAY_MS)
        ? Math.max(0, Math.round(HOME_PROGRESS_INITIAL_ANIMATION_DELAY_MS))
        : 0;

      if (delayMs <= 0) {
        progressElement.dataset[completionKey] = 'true';
        startAnimation();
        return;
      }

      const timeoutProperty = HOME_PROGRESS_INITIAL_TIMEOUT_PROPERTY;
      const existingTimeout = progressElement[timeoutProperty];
      if (existingTimeout !== undefined && existingTimeout !== null) {
        clearTimeout(existingTimeout);
      }

      const runCallback = () => {
        progressElement.dataset[completionKey] = 'true';
        delete progressElement[timeoutProperty];
        startAnimation();
      };

      const timeoutHandle = setTimeout(runCallback, delayMs);
      progressElement[timeoutProperty] = timeoutHandle;
    };

    const playStandardAnimation = () => {
      applyBattleProgressAttributes(progressElement, progressState);
      animateProgressValue(progressElement, progressState.ratio || 0);
    };

    if (shouldAnimateLevelUp && previousProgressState) {
      const previousState = {
        ...previousProgressState,
        ratio: 1,
      };

      scheduleInitialProgressAnimation(() => {
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
      });
    } else {
      scheduleInitialProgressAnimation(playStandardAnimation);
    }
  } else if (progressElement) {
    progressElement.style.setProperty('--progress-value', '0');
    progressElement.setAttribute('aria-valuemin', '0');
  }

  writeStoredHomeBattleProgress(progressState);

  storeBattleSnapshot({
    currentLevel: Number.isFinite(currentLevel) ? currentLevel : null,
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

const setupDevSignOut = () => {
  const devTrigger = document.querySelector('[data-dev-signout]');
  if (!devTrigger) {
    return;
  }

  if (devTrigger.dataset.devSignoutBound === 'true') {
    return;
  }
  devTrigger.dataset.devSignoutBound = 'true';

  attachInteractiveHandler(devTrigger, async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    await logoutAndRedirect();
  });
};

const initializeHomePage = () => {
  setupHomeLogout();
  setupDevSignOut();
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
