const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';

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
        battleLevel: Number.isFinite(snapshot.battleLevel)
          ? snapshot.battleLevel
          : null,
        currentBattle: Number.isFinite(snapshot.currentBattle)
          ? Math.max(1, Math.round(snapshot.currentBattle))
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
      currentBattle: Number.isFinite(parsed.currentBattle)
        ? Math.max(1, Math.round(parsed.currentBattle))
        : null,
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

const animateProgressValue = (progressElement, ratio) => {
  if (!progressElement) {
    return;
  }

  const normalizedRatio = clampProgressRatio(ratio);
  if (normalizedRatio <= 0) {
    progressElement.style.setProperty('--progress-value', '0');
    return;
  }

  const progressFill = progressElement.querySelector('.progress__fill');
  const applyValue = () => {
    progressElement.style.setProperty('--progress-value', `${normalizedRatio}`);
  };

  if (progressElement.dataset.progressAnimated === 'true') {
    applyValue();
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
    data.level?.battleLevel,
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
  const progressUtils = window.mathMonstersProgress;
  if (progressElement && progressUtils && Number.isFinite(battleLevel)) {
    const experienceMap = progressUtils.normalizeExperienceMap(data.progress?.experience);
    const requirementValue = Number(data.battle?.levelUp);
    const earned = progressUtils.readExperienceForLevel(experienceMap, battleLevel);
    const progressInfo = progressUtils.computeExperienceProgress(earned, requirementValue);

    progressElement.setAttribute('aria-valuemax', `${progressInfo.totalDisplay}`);
    progressElement.setAttribute('aria-valuenow', `${progressInfo.earnedDisplay}`);
    progressElement.setAttribute(
      'aria-valuetext',
      `${progressInfo.earnedDisplay} of ${progressInfo.totalDisplay}`
    );
    animateProgressValue(progressElement, progressInfo.totalDisplay > 0 ? progressInfo.ratio : 0);
  }

  const currentBattle = Number(data.progress?.currentBattle);

  storeBattleSnapshot({
    battleLevel: Number.isFinite(battleLevel) ? battleLevel : null,
    currentBattle: Number.isFinite(currentBattle) ? currentBattle : null,
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
