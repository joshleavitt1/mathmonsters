const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';
const LEVEL_UP_CELEBRATION_STORAGE_KEY = 'mathmonstersLevelUpCelebration';
const HOME_PROGRESS_TOTAL_BATTLES = 4;
const HOME_PROGRESS_STEPS = HOME_PROGRESS_TOTAL_BATTLES + 1;
const HOME_PROGRESS_ANIMATION_MIN_LEVEL = 2;
const HOME_LEVEL_UP_CELEBRATION_MIN_LEVEL = 3;
const HOME_PROGRESS_FILL_DURATION_MS = 400;
const HOME_LEVEL_UP_RESET_DELAY_MS = 900;
const HOME_LEVEL_UP_BANNER_VISIBLE_MS = 2400;
const HOME_LEVEL_UP_BANNER_FADE_MS = 250;
const DEV_SIGN_OUT_BUTTON_SELECTOR = '[data-dev-sign-out]';

let pendingLevelUpCelebration = null;
let levelUpProgressResetTimeoutId = null;
let levelUpBannerHideTimeoutId = null;
let levelUpBannerFinalizeTimeoutId = null;

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

const storeBattleSnapshot = (snapshot) => {
  const sanitizedSnapshot = snapshot && typeof snapshot === 'object'
    ? {
        currentLevel: Number.isFinite(snapshot.currentLevel)
          ? snapshot.currentLevel
          : Number.isFinite(snapshot.battleLevel)
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

    const levelValue = Number.isFinite(parsed.currentLevel)
      ? parsed.currentLevel
      : Number.isFinite(parsed.battleLevel)
      ? parsed.battleLevel
      : null;

    const snapshot = {
      currentLevel: levelValue,
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

const normalizeLevelUpCelebration = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const levelValue = Number(value.level);
  if (!Number.isFinite(levelValue)) {
    return null;
  }

  const normalizedLevel = Math.max(1, Math.round(levelValue));
  const previousValue = Number(value.previousLevel);
  const normalizedPrevious = Number.isFinite(previousValue)
    ? Math.max(1, Math.round(previousValue))
    : Math.max(1, normalizedLevel - 1);

  return {
    level: normalizedLevel,
    previousLevel: normalizedPrevious,
  };
};

const consumeLevelUpCelebration = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const inMemory = normalizeLevelUpCelebration(
    window.mathMonstersLevelUpCelebration
  );
  if (inMemory) {
    window.mathMonstersLevelUpCelebration = null;
    return inMemory;
  }

  try {
    const storage = window.sessionStorage;
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(LEVEL_UP_CELEBRATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    storage.removeItem(LEVEL_UP_CELEBRATION_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    return normalizeLevelUpCelebration(parsed);
  } catch (error) {
    console.warn('Unable to read level-up celebration.', error);
    return null;
  }
};

const clampBattleIndex = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  if (numericValue <= 1) {
    return 1;
  }

  if (numericValue >= HOME_PROGRESS_TOTAL_BATTLES) {
    return HOME_PROGRESS_TOTAL_BATTLES;
  }

  return Math.round(numericValue);
};

const computeBattleProgressRatio = (currentBattle) => {
  const numericValue = Number(currentBattle);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  const clamped = Math.min(Math.max(Math.round(numericValue), 0), HOME_PROGRESS_TOTAL_BATTLES);
  return HOME_PROGRESS_STEPS > 0 ? clamped / HOME_PROGRESS_STEPS : 0;
};

const formatBattleAriaText = (currentBattle, totalBattles) =>
  `Battle ${currentBattle} of ${totalBattles}`;

const clearLevelUpProgressTimeout = () => {
  if (levelUpProgressResetTimeoutId !== null) {
    window.clearTimeout(levelUpProgressResetTimeoutId);
    levelUpProgressResetTimeoutId = null;
  }
};

const clearLevelUpBannerTimeouts = () => {
  if (levelUpBannerHideTimeoutId !== null) {
    window.clearTimeout(levelUpBannerHideTimeoutId);
    levelUpBannerHideTimeoutId = null;
  }
  if (levelUpBannerFinalizeTimeoutId !== null) {
    window.clearTimeout(levelUpBannerFinalizeTimeoutId);
    levelUpBannerFinalizeTimeoutId = null;
  }
};

const showLevelUpBanner = (bannerElement, level) => {
  if (!bannerElement) {
    return;
  }

  clearLevelUpBannerTimeouts();

  const resolvedLevel = Math.max(1, Math.round(Number(level) || 0));
  bannerElement.textContent = `Level ${resolvedLevel} Unlocked!`;
  bannerElement.hidden = false;
  bannerElement.removeAttribute('hidden');
  bannerElement.setAttribute('aria-hidden', 'false');
  bannerElement.classList.add('home__level-up-banner--visible');

  levelUpBannerHideTimeoutId = window.setTimeout(() => {
    bannerElement.classList.remove('home__level-up-banner--visible');
    bannerElement.setAttribute('aria-hidden', 'true');
    levelUpBannerFinalizeTimeoutId = window.setTimeout(() => {
      bannerElement.hidden = true;
      levelUpBannerFinalizeTimeoutId = null;
    }, HOME_LEVEL_UP_BANNER_FADE_MS);
  }, HOME_LEVEL_UP_BANNER_VISIBLE_MS);
};

const hideLevelUpBanner = (bannerElement) => {
  if (!bannerElement) {
    return;
  }

  clearLevelUpBannerTimeouts();

  if (!bannerElement.classList.contains('home__level-up-banner--visible')) {
    bannerElement.hidden = true;
    bannerElement.setAttribute('aria-hidden', 'true');
    return;
  }

  bannerElement.classList.remove('home__level-up-banner--visible');
  bannerElement.setAttribute('aria-hidden', 'true');
  levelUpBannerFinalizeTimeoutId = window.setTimeout(() => {
    bannerElement.hidden = true;
    levelUpBannerFinalizeTimeoutId = null;
  }, HOME_LEVEL_UP_BANNER_FADE_MS);
};

const runLevelUpCelebrationSequence = ({
  progressElement,
  bannerElement,
  level,
  previousLevel,
  currentBattle,
  totalBattles,
  finalRatio,
}) => {
  if (!progressElement) {
    return;
  }

  clearLevelUpProgressTimeout();

  const resolvedPrevious = Number.isFinite(previousLevel)
    ? Math.max(1, Math.round(previousLevel))
    : Math.max(1, Math.round(Number(level) || 1) - 1);

  progressElement.setAttribute('aria-valuenow', `${totalBattles}`);
  progressElement.setAttribute(
    'aria-valuetext',
    `Level ${resolvedPrevious} complete`
  );
  animateProgressValue(progressElement, 1, { restart: true });

  if (bannerElement) {
    showLevelUpBanner(bannerElement, level);
  }

  levelUpProgressResetTimeoutId = window.setTimeout(() => {
    progressElement.setAttribute('aria-valuenow', `${currentBattle}`);
    progressElement.setAttribute(
      'aria-valuetext',
      formatBattleAriaText(currentBattle, totalBattles)
    );
    animateProgressValue(progressElement, finalRatio, { restart: true });
    levelUpProgressResetTimeoutId = null;
  }, HOME_PROGRESS_FILL_DURATION_MS + HOME_LEVEL_UP_RESET_DELAY_MS);
};

pendingLevelUpCelebration = consumeLevelUpCelebration();

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

const animateProgressValue = (progressElement, ratio, options = {}) => {
  if (!progressElement) {
    return;
  }

  const { restart = false, immediate = false } = options;
  const normalizedRatio = clampProgressRatio(ratio);

  if (normalizedRatio <= 0) {
    if (restart) {
      progressElement.dataset.progressAnimated = 'false';
    }
    progressElement.style.setProperty('--progress-value', '0');
    return;
  }

  const progressFill = progressElement.querySelector('.progress__fill');
  const wasAnimated = progressElement.dataset.progressAnimated === 'true';
  const shouldRestart = restart || !wasAnimated;

  const applyValue = () => {
    progressElement.style.setProperty('--progress-value', `${normalizedRatio}`);
  };

  if (!shouldRestart) {
    if (immediate) {
      applyValue();
    } else {
      scheduleAnimationFrame(applyValue);
    }
    return;
  }

  progressElement.dataset.progressAnimated = 'true';
  progressElement.style.setProperty('--progress-value', '0');

  if (progressFill) {
    progressFill.style.transition = 'none';
  }

  // Force a reflow so the browser applies the zeroed progress before animating.
  void progressElement.offsetWidth;

  if (progressFill) {
    progressFill.style.transition = '';
  }

  if (immediate) {
    applyValue();
    return;
  }

  scheduleAnimationFrame(applyValue);
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

  const levelCandidates = [
    data.progress?.currentLevel,
    data.progress?.battleLevel,
    data.level?.currentLevel,
    data.level?.battleLevel,
    data.player?.currentLevel,
    data.player?.progress?.currentLevel,
    data.player?.progress?.battleLevel,
  ];
  const battleLevel = levelCandidates
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);
  const heroLevelEl = document.querySelector('[data-hero-level]');
  if (heroLevelEl && Number.isFinite(battleLevel)) {
    heroLevelEl.textContent = `Level ${battleLevel}`;
  }

  const progressElement = document.querySelector('[data-battle-progress]');
  const levelUpBanner = document.querySelector('[data-level-up-banner]');
  if (progressElement) {
    const progressRootCandidate = [data.progress, data.player?.progress].find(
      (entry) => entry && typeof entry === 'object'
    );
    const progressRoot = progressRootCandidate || null;

    const currentMathType =
      typeof data.player?.currentMathType === 'string'
        ? data.player.currentMathType.trim()
        : '';

    let mathProgressEntry = null;
    if (progressRoot && currentMathType) {
      const candidate = progressRoot[currentMathType];
      if (candidate && typeof candidate === 'object') {
        mathProgressEntry = candidate;
      }
    }

    if (!mathProgressEntry && progressRoot) {
      mathProgressEntry = Object.values(progressRoot).find(
        (entry) =>
          entry && typeof entry === 'object' && Number.isFinite(Number(entry.currentBattle))
      );
    }

    const currentBattleRaw = Number(mathProgressEntry?.currentBattle);
    const clampedBattle = Number.isFinite(currentBattleRaw)
      ? clampBattleIndex(currentBattleRaw)
      : 1;
    const progressRatio = computeBattleProgressRatio(clampedBattle);
    const ariaText = formatBattleAriaText(clampedBattle, HOME_PROGRESS_TOTAL_BATTLES);

    progressElement.setAttribute('aria-valuemin', '0');
    progressElement.setAttribute('aria-valuemax', `${HOME_PROGRESS_TOTAL_BATTLES}`);

    const isLevelTwoPlus = Number.isFinite(battleLevel) && battleLevel >= HOME_PROGRESS_ANIMATION_MIN_LEVEL;

    if (!Number.isFinite(battleLevel)) {
      clearLevelUpProgressTimeout();
      hideLevelUpBanner(levelUpBanner);
      progressElement.dataset.progressAnimated = 'false';
      progressElement.style.setProperty('--progress-value', '0');
      progressElement.setAttribute('aria-valuenow', '0');
      progressElement.setAttribute('aria-valuetext', 'Battle progress unavailable');
    } else if (!isLevelTwoPlus) {
      clearLevelUpProgressTimeout();
      hideLevelUpBanner(levelUpBanner);
      progressElement.dataset.progressAnimated = 'false';
      progressElement.style.setProperty('--progress-value', '0');
      progressElement.setAttribute('aria-valuenow', '0');
      progressElement.setAttribute(
        'aria-valuetext',
        'Complete Level 1 to unlock battle progress'
      );
    } else if (
      pendingLevelUpCelebration &&
      battleLevel >= HOME_LEVEL_UP_CELEBRATION_MIN_LEVEL &&
      pendingLevelUpCelebration.level === Math.round(battleLevel)
    ) {
      progressElement.setAttribute('aria-valuenow', `${HOME_PROGRESS_TOTAL_BATTLES}`);
      progressElement.setAttribute(
        'aria-valuetext',
        `Level ${pendingLevelUpCelebration.previousLevel} complete`
      );
      runLevelUpCelebrationSequence({
        progressElement,
        bannerElement: levelUpBanner,
        level: pendingLevelUpCelebration.level,
        previousLevel: pendingLevelUpCelebration.previousLevel,
        currentBattle: clampedBattle,
        totalBattles: HOME_PROGRESS_TOTAL_BATTLES,
        finalRatio: progressRatio,
      });
      pendingLevelUpCelebration = null;
    } else {
      clearLevelUpProgressTimeout();
      hideLevelUpBanner(levelUpBanner);
      progressElement.setAttribute('aria-valuenow', `${clampedBattle}`);
      progressElement.setAttribute('aria-valuetext', ariaText);
      animateProgressValue(progressElement, progressRatio);

      if (
        pendingLevelUpCelebration &&
        Number.isFinite(battleLevel) &&
        battleLevel > pendingLevelUpCelebration.level
      ) {
        pendingLevelUpCelebration = null;
      }
    }
  }

  storeBattleSnapshot({
    currentLevel: Number.isFinite(battleLevel) ? battleLevel : null,
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
  const devButton = document.querySelector(DEV_SIGN_OUT_BUTTON_SELECTOR);
  if (!devButton || devButton.dataset.devSignOutBound === 'true') {
    return;
  }

  const handleClick = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    await logoutAndRedirect();
  };

  devButton.dataset.devSignOutBound = 'true';
  devButton.addEventListener('click', handleClick);
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

document.addEventListener('player-profile-updated', () => {
  applySnapshotToHome(readBattleSnapshot());
  updateHomeFromPreloadedData();
});
