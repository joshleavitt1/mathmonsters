const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'mathmonstersProgress';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';
const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const GUEST_SESSION_ACTIVE_VALUE = 'true';
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const MIN_PRELOAD_DURATION_MS = 2000;

const DEV_RESET_TARGET_MATH_KEY = 'addition';
const DEV_RESET_TARGET_LEVEL = 2;
const DEV_RESET_TARGET_BATTLE = 1;
const DEV_RESET_BUTTON_SELECTOR = '[data-dev-reset-level]';
const DEV_PLAYER_DATA_BUTTON_SELECTOR = '[data-dev-player-data]';
const DEV_SIGN_OUT_BUTTON_SELECTOR = '[data-dev-sign-out]';
const HERO_TO_MONSTER_DELAY_MS_BASE = 1200;
const MONSTER_ENTRANCE_DURATION_MS_BASE = 900;
const HERO_EXIT_DURATION_MS_BASE = 550;
const MONSTER_EXIT_DURATION_MS_BASE = 600;
const MONSTER_INTRO_OPACITY_DURATION_MS_BASE = 600;
const PRE_BATTLE_HOLD_DURATION_MS_BASE = 1000;
const HERO_EXIT_SYNC_BUFFER_MS = 0;
const CENTER_IMAGE_HOLD_DURATION_MS_BASE = 1000;
const HERO_INTRO_TRANSITION_DURATION_MS_BASE = 450;
const LANDING_BATTLE_SHIFT_DURATION_MS_BASE = 600;

const computePreferredIntroTimingMultiplier = () => {
  if (typeof window !== 'undefined') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)')?.matches) {
        return 0.4;
      }
    } catch (error) {
      // Ignore media query evaluation errors.
    }
  }

  return 0.55;
};

const scaleIntroDuration = (value, multiplier) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  const safeMultiplier = Number.isFinite(multiplier) ? Math.max(multiplier, 0) : 0;

  return Math.max(0, Math.round(numericValue * safeMultiplier));
};

const createIntroTimingDurations = (multiplier) => {
  const safeMultiplier = Number.isFinite(multiplier) ? Math.max(0, multiplier) : 0;

  return {
    multiplier: safeMultiplier,
    heroToMonsterDelay: scaleIntroDuration(
      HERO_TO_MONSTER_DELAY_MS_BASE,
      safeMultiplier
    ),
    monsterEntranceDuration: scaleIntroDuration(
      MONSTER_ENTRANCE_DURATION_MS_BASE,
      safeMultiplier
    ),
    heroExitDuration: scaleIntroDuration(HERO_EXIT_DURATION_MS_BASE, safeMultiplier),
    monsterExitDuration: scaleIntroDuration(
      MONSTER_EXIT_DURATION_MS_BASE,
      safeMultiplier
    ),
    monsterIntroOpacityDuration: scaleIntroDuration(
      MONSTER_INTRO_OPACITY_DURATION_MS_BASE,
      safeMultiplier
    ),
    preBattleHoldDuration: scaleIntroDuration(
      PRE_BATTLE_HOLD_DURATION_MS_BASE,
      safeMultiplier
    ),
    centerImageHoldDuration: scaleIntroDuration(
      CENTER_IMAGE_HOLD_DURATION_MS_BASE,
      safeMultiplier
    ),
    heroIntroTransitionDuration: scaleIntroDuration(
      HERO_INTRO_TRANSITION_DURATION_MS_BASE,
      safeMultiplier
    ),
    landingBattleShiftDuration: scaleIntroDuration(
      LANDING_BATTLE_SHIFT_DURATION_MS_BASE,
      safeMultiplier
    ),
  };
};

let introTimingDurations = createIntroTimingDurations(1);

const getIntroTimingDurations = () => introTimingDurations;

const formatDurationSeconds = (durationMs) => {
  const numericDuration = Math.max(0, Number(durationMs) || 0);
  const seconds = numericDuration / 1000;
  const trimmed = seconds.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  const value = trimmed === '' ? '0' : trimmed;
  return `${value}s`;
};

const applyIntroDurationVariables = (timing = introTimingDurations) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (!root) {
    return;
  }

  const setDurationVariable = (name, durationMs) => {
    if (!name) {
      return;
    }
    root.style.setProperty(name, formatDurationSeconds(durationMs));
  };

  root.style.setProperty('--intro-duration-scale', String(timing.multiplier));
  setDurationVariable(
    '--hero-intro-transform-duration',
    timing.heroIntroTransitionDuration
  );
  setDurationVariable('--hero-intro-exit-duration', timing.heroExitDuration);
  setDurationVariable('--monster-intro-enter-duration', timing.monsterEntranceDuration);
  setDurationVariable(
    '--monster-intro-opacity-duration',
    timing.monsterIntroOpacityDuration
  );
  setDurationVariable('--monster-intro-exit-duration', timing.monsterExitDuration);
  setDurationVariable('--landing-battle-shift-duration', timing.landingBattleShiftDuration);
};

applyIntroDurationVariables();

const setIntroTimingDurations = (timing) => {
  introTimingDurations = timing;
  applyIntroDurationVariables(introTimingDurations);
};

const updateIntroTimingForLanding = ({ isLevelOneLanding }) => {
  const multiplier = isLevelOneLanding
    ? 1
    : computePreferredIntroTimingMultiplier();
  setIntroTimingDurations(createIntroTimingDurations(multiplier));
};
const LEVEL_ONE_INTRO_EGG_DELAY_MS = 500;
const LEVEL_ONE_INTRO_INITIAL_CARD_DELAY_MS = 2000;
const LEVEL_ONE_INTRO_CARD_DELAY_MS = 400;
const LEVEL_ONE_INTRO_CARD_EXIT_DURATION_MS = 350;
const LEVEL_ONE_INTRO_EGG_AUTO_START_DELAY_MS = 1000;
const LEVEL_ONE_INTRO_EGG_HATCH_DURATION_MS = 2100;
const LEVEL_ONE_INTRO_HERO_REVEAL_DELAY_MS = 700;
const LEVEL_ONE_INTRO_EGG_REMOVAL_DELAY_MS = 220;
const CSS_VIEWPORT_OFFSET_VAR = '--viewport-bottom-offset';

const BATTLE_PAGE_URL = 'html/battle.html';
const REGISTER_PAGE_URL = 'html/register.html';

const progressUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersProgress) || null;

if (!progressUtils) {
  throw new Error('Progress utilities are not available.');
}

const {
  isPlainObject,
  normalizeExperienceMap,
  mergeExperienceMaps,
  readExperienceForLevel,
  computeExperienceProgress,
} = progressUtils;

const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

const redirectToBattle = () => {
  window.location.href = BATTLE_PAGE_URL;
};

const getLevelOneHeroElement = () =>
  document.querySelector('[data-level-one-landing] [data-hero-sprite]');

const getStandardHeroElement = () =>
  document.querySelector('[data-standard-landing] [data-hero-sprite]');

const getActiveHeroElement = () => {
  const isLevelOne = document.body.classList.contains('is-level-one-landing');
  const isStandard = document.body.classList.contains('is-standard-landing');
  if (isStandard) {
    return getStandardHeroElement() ?? getLevelOneHeroElement();
  }
  if (isLevelOne) {
    return getLevelOneHeroElement() ?? getStandardHeroElement();
  }
  return getLevelOneHeroElement() ?? getStandardHeroElement();
};

const HERO_FLOAT_DEFAULT_RANGE_PX = 32;
const HERO_FLOAT_DEFAULT_DURATION_MS = 3500;
const HERO_FLOAT_REDUCED_RANGE_PX = 0;
const HERO_FLOAT_REDUCED_DURATION_MS = 0;

const heroFloatPreferenceQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

const getHeroFloatElements = () => {
  if (typeof document === 'undefined') {
    return [];
  }

  return Array.from(document.querySelectorAll('[data-hero-sprite]')).filter(
    (element) => element instanceof HTMLElement
  );
};

const resolveHeroFloatPreference = () => Boolean(heroFloatPreferenceQuery?.matches);

const applyHeroFloatValues = ({ rangePx, durationMs, offsetPx }) => {
  const heroElements = getHeroFloatElements();
  if (heroElements.length === 0) {
    return;
  }

  const rangeValue = `${Math.max(0, Number(rangePx) || 0)}px`;
  const durationValue = formatDurationSeconds(durationMs);
  const offsetValue = `${Math.max(0, Number(offsetPx) || 0)}px`;

  heroElements.forEach((element) => {
    element.style.setProperty('--hero-float-range', rangeValue);
    element.style.setProperty('--hero-float-duration', durationValue);
    if (offsetPx === null) {
      element.style.removeProperty('--hero-float-offset');
    } else {
      element.style.setProperty('--hero-float-offset', offsetValue);
    }
  });
};

const updateHeroFloat = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const prefersReducedMotion = resolveHeroFloatPreference();

  if (prefersReducedMotion) {
    applyHeroFloatValues({
      rangePx: HERO_FLOAT_REDUCED_RANGE_PX,
      durationMs: HERO_FLOAT_REDUCED_DURATION_MS,
      offsetPx: 0,
    });
    return;
  }

  applyHeroFloatValues({
    rangePx: HERO_FLOAT_DEFAULT_RANGE_PX,
    durationMs: HERO_FLOAT_DEFAULT_DURATION_MS,
    offsetPx: null,
  });
};

const initHeroFloatPreferenceWatcher = () => {
  if (!heroFloatPreferenceQuery) {
    return;
  }

  const handleChange = () => {
    updateHeroFloat();
  };

  if (typeof heroFloatPreferenceQuery.addEventListener === 'function') {
    heroFloatPreferenceQuery.addEventListener('change', handleChange);
  } else if (typeof heroFloatPreferenceQuery.addListener === 'function') {
    heroFloatPreferenceQuery.addListener(handleChange);
  }
};

updateHeroFloat();
initHeroFloatPreferenceWatcher();

const getActiveBattleButton = () => {
  if (document.body.classList.contains('is-standard-landing')) {
    return document.querySelector('[data-standard-landing] [data-battle-button]');
  }
  return document.querySelector('[data-level-one-landing] [data-battle-button]');
};

const detectLevelOneLandingState = () => {
  if (document.body.classList.contains('is-standard-landing')) {
    return false;
  }

  if (document.body.classList.contains('is-level-one-landing')) {
    return true;
  }

  return true;
};

const updateViewportOffsetVariable = () => {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    root.style.setProperty(CSS_VIEWPORT_OFFSET_VAR, '0px');
    return;
  }

  const layoutViewportHeight = window.innerHeight || viewport.height;
  const bottomOverlap =
    layoutViewportHeight - (viewport.height + viewport.offsetTop);
  const safeOffset = Math.max(0, Math.round(bottomOverlap));
  root.style.setProperty(CSS_VIEWPORT_OFFSET_VAR, `${safeOffset}px`);
};

const initViewportOffsetWatcher = () => {
  if (typeof window === 'undefined') {
    return;
  }

  updateViewportOffsetVariable();

  const viewport = window.visualViewport;
  if (viewport) {
    viewport.addEventListener('resize', updateViewportOffsetVariable, {
      passive: true,
    });
    viewport.addEventListener('scroll', updateViewportOffsetVariable, {
      passive: true,
    });
  }

  window.addEventListener('resize', updateViewportOffsetVariable, {
    passive: true,
  });
  window.addEventListener('orientationchange', updateViewportOffsetVariable, {
    passive: true,
  });
};

initViewportOffsetWatcher();

const redirectToWelcome = () => {
  window.location.replace('html/welcome.html');
};

const redirectToRegister = () => {
  window.location.replace(REGISTER_PAGE_URL);
};

const readGuestSessionState = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return null;
    }

    return storage.getItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.warn('Guest mode detection failed.', error);
    return null;
  }
};

const isGuestModeActive = (sessionState = readGuestSessionState()) =>
  sessionState === GUEST_SESSION_ACTIVE_VALUE;

const isRegistrationRequiredForGuest = (
  sessionState = readGuestSessionState()
) => sessionState === GUEST_SESSION_REGISTRATION_REQUIRED_VALUE;

const clearGuestMode = () => {
  try {
    window.localStorage?.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear guest mode flag.', error);
  }
};

const supportsNativeDisabled = (element) => {
  if (!element || typeof element !== 'object') {
    return false;
  }

  return (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLFieldSetElement
  );
};

const setInteractiveDisabled = (element, disabled) => {
  if (!element) {
    return;
  }

  const shouldDisable = Boolean(disabled);

  if (supportsNativeDisabled(element)) {
    element.disabled = shouldDisable;
    if (shouldDisable) {
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.removeAttribute('aria-disabled');
    }
    return;
  }

  if (shouldDisable) {
    element.setAttribute('aria-disabled', 'true');
    if (element.hasAttribute('data-initial-tabindex')) {
      element.setAttribute('tabindex', '-1');
    } else if (element.hasAttribute('tabindex')) {
      const currentTabIndex = element.getAttribute('tabindex') ?? '';
      element.setAttribute('data-previous-tabindex', currentTabIndex);
      element.setAttribute('tabindex', '-1');
    }
  } else {
    element.removeAttribute('aria-disabled');
    if (element.hasAttribute('data-initial-tabindex')) {
      const initialTabIndex = element.getAttribute('data-initial-tabindex') || '0';
      element.setAttribute('tabindex', initialTabIndex);
    } else if (element.hasAttribute('data-previous-tabindex')) {
      const previous = element.getAttribute('data-previous-tabindex');
      if (previous) {
        element.setAttribute('tabindex', previous);
      } else {
        element.removeAttribute('tabindex');
      }
      element.removeAttribute('data-previous-tabindex');
    } else if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  }
};

const isInteractiveElementDisabled = (element) => {
  if (!element) {
    return false;
  }

  if (supportsNativeDisabled(element)) {
    return Boolean(element.disabled);
  }

  return element.getAttribute('aria-disabled') === 'true';
};

const attachInteractiveHandler = (element, handler) => {
  if (!element || typeof handler !== 'function') {
    return;
  }

  const handleClick = (event) => {
    if (isInteractiveElementDisabled(element)) {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }
      return;
    }

    handler(event);
  };

  element.addEventListener('click', handleClick);

  if (supportsNativeDisabled(element)) {
    return;
  }

  element.addEventListener('keydown', (event) => {
    if (isInteractiveElementDisabled(element)) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
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
      console.warn('Unexpected error while signing out.', error);
    }
  }

  clearGuestMode();
  redirectToWelcome();
};

const setupSettingsLogout = () => {
  const settingsTrigger = document.querySelector('[data-settings-logout]');
  if (!settingsTrigger) {
    return;
  }

  if (settingsTrigger.dataset.logoutBound === 'true') {
    return;
  }
  settingsTrigger.dataset.logoutBound = 'true';

  const handleLogout = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (isInteractiveElementDisabled(settingsTrigger)) {
      return;
    }

    setInteractiveDisabled(settingsTrigger, true);
    settingsTrigger.setAttribute('aria-busy', 'true');

    await logoutAndRedirect();
  };

  attachInteractiveHandler(settingsTrigger, handleLogout);
};

const ensureAuthenticated = async () => {
  const guestSessionState = readGuestSessionState();

  if (isRegistrationRequiredForGuest(guestSessionState)) {
    redirectToRegister();
    return false;
  }

  if (isGuestModeActive(guestSessionState)) {
    return true;
  }

  const supabase = window.supabaseClient;
  if (!supabase) {
    redirectToWelcome();
    return false;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Authentication session lookup failed', error);
    }

    if (!data?.session) {
      redirectToWelcome();
      return false;
    }
    clearGuestMode();
    return true;
  } catch (error) {
    console.warn('Unexpected authentication error', error);
    redirectToWelcome();
    return false;
  }
};

const fetchPlayerProfile = async () => {
  if (isGuestModeActive()) {
    return null;
  }

  const fetchFn = playerProfileUtils?.fetchPlayerProfile;
  if (typeof fetchFn !== 'function') {
    return null;
  }

  try {
    const profile = await fetchFn();
    return profile && typeof profile === 'object' ? profile : null;
  } catch (error) {
    console.warn('Failed to fetch remote player profile.', error);
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
    syncFn(playerData, PROGRESS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to sync remote battle level with storage.', error);
  }
};

const startLandingExperience = () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapLanding);
  } else {
    bootstrapLanding();
  }
};

const runBattleIntroSequence = async (options = {}) => {
  const heroImage = getActiveHeroElement();
  const monsterImage = document.querySelector('[data-monster]');
  const showIntroImmediately = Boolean(options?.showIntroImmediately);
  const skipHeroSidePosition = Boolean(options?.skipHeroSidePosition);
  const skipMonsterAppearance = Boolean(
    options?.hideMonster || options?.skipMonsterAppearance
  );
  const heroExitSyncBufferMs = Math.max(
    0,
    Number(options?.heroExitSyncBufferMs ?? HERO_EXIT_SYNC_BUFFER_MS) || 0
  );

  const wait = (durationMs) =>
    new Promise((resolve) =>
      window.setTimeout(resolve, Math.max(0, Number(durationMs) || 0))
    );

  if (!heroImage) {
    return false;
  }

  const timing = getIntroTimingDurations();

  if (skipMonsterAppearance && monsterImage) {
    monsterImage.classList.remove('is-visible', 'is-exiting');
    monsterImage.setAttribute('aria-hidden', 'true');
  }

  const showMonster = () => {
    if (!monsterImage || skipMonsterAppearance) {
      return;
    }
    monsterImage.classList.add('is-visible');
    monsterImage.removeAttribute('aria-hidden');
  };

  const beginExitAnimations = () => {
    document.body.classList.add('is-battle-transition');
    heroImage.classList.add('is-exiting');
    if (monsterImage && !skipMonsterAppearance) {
      monsterImage.classList.add('is-exiting');
    }
  };

  const applySidePositionIfNeeded = () => {
    if (skipHeroSidePosition) {
      return;
    }
    heroImage.classList.add('is-side-position');
  };

  const prepareForBattle = () => {
    applySidePositionIfNeeded();
    showMonster();
  };

  const holdDuration = showIntroImmediately ? 0 : timing.heroToMonsterDelay;

  await wait(holdDuration);
  prepareForBattle();
  const heroExitWaitDuration =
    (skipMonsterAppearance ? 0 : timing.monsterEntranceDuration) +
    heroExitSyncBufferMs;
  await wait(heroExitWaitDuration);
  beginExitAnimations();

  await wait(
    Math.max(
      timing.heroExitDuration,
      skipMonsterAppearance ? 0 : timing.monsterExitDuration
    )
  );

  return true;
};

const setupLevelOneIntro = ({ heroImage, beginBattle } = {}) => {
  const introRoot = document.querySelector('[data-level-one-intro]');
  const eggButton = introRoot?.querySelector('[data-level-one-egg-button]');
  const eggImage = introRoot?.querySelector('[data-level-one-egg-image]');
  const welcomeCard = introRoot?.querySelector('[data-level-one-card="welcome"]');
  const continueButton = introRoot?.querySelector('[data-level-one-card-continue]');
  const battleCard = introRoot?.querySelector('[data-level-one-card="battle"]');
  const battleButton = introRoot?.querySelector('[data-level-one-card-battle]');
  const introOverlay = introRoot?.querySelector('[data-level-one-overlay]');
  const wait = (durationMs) =>
    new Promise((resolve) =>
      window.setTimeout(resolve, Math.max(0, Number(durationMs) || 0))
    );
  if (
    !introRoot ||
    !eggButton ||
    !eggImage ||
    !welcomeCard ||
    !continueButton ||
    !battleCard ||
    !battleButton
  ) {
    if (typeof beginBattle === 'function') {
      beginBattle({ showIntroImmediately: true }).catch((error) => {
        console.warn('Level one intro fallback failed.', error);
        redirectToBattle();
      });
    } else {
      redirectToBattle();
    }
    return;
  }

  let isHatching = false;
  let hasStartedBattle = false;
  let eggAutoHatchTimeoutId = null;

  if (heroImage) {
    heroImage.classList.remove('is-revealed');
    heroImage.setAttribute('aria-hidden', 'true');
  }

  const showCard = (card) => {
    if (!card) {
      return;
    }
    if (introOverlay) {
      introOverlay.classList.add('is-visible');
      introOverlay.setAttribute('aria-hidden', 'false');
    }
    card.classList.remove('is-exiting');
    card.setAttribute('aria-hidden', 'false');
    void card.offsetWidth;
    card.classList.add('is-visible');
  };

  const hideCard = async (card) => {
    if (!card) {
      return;
    }
    card.classList.remove('is-visible');
    card.classList.add('is-exiting');
    await wait(LEVEL_ONE_INTRO_CARD_EXIT_DURATION_MS);
    card.classList.remove('is-exiting');
    card.setAttribute('aria-hidden', 'true');
    if (introOverlay) {
      const hasVisibleCard = introRoot?.querySelector(
        '.level-one-intro__card.is-visible'
      );
      const hasExitingCard = introRoot?.querySelector(
        '.level-one-intro__card.is-exiting'
      );
      if (!hasVisibleCard && !hasExitingCard) {
        introOverlay.classList.remove('is-visible');
        introOverlay.setAttribute('aria-hidden', 'true');
      }
    }
  };

  const showEgg = () => {
    introRoot.classList.add('is-active');
    introRoot.setAttribute('aria-hidden', 'false');
    eggButton.classList.remove('is-hatching');
    eggButton.classList.add('is-visible');
    eggImage.classList.remove('is-hatching');
    eggImage.classList.remove('is-pop-in');
    void eggImage.offsetWidth;
    eggImage.classList.add('is-pop-in');
  };

  const clearEggAutoHatchTimeout = () => {
    if (eggAutoHatchTimeoutId !== null) {
      window.clearTimeout(eggAutoHatchTimeoutId);
      eggAutoHatchTimeoutId = null;
    }
  };

  const disableEgg = () => {
    eggButton.disabled = true;
    if (typeof eggButton.blur === 'function') {
      eggButton.blur();
    }
  };

  const hatchEgg = async () => {
    if (isHatching) {
      return;
    }

    isHatching = true;
    clearEggAutoHatchTimeout();
    disableEgg();
    eggButton.classList.add('is-hatching');
    eggImage.classList.remove('is-pop-in');
    void eggImage.offsetWidth;
    eggImage.classList.add('is-hatching');
    await wait(LEVEL_ONE_INTRO_EGG_HATCH_DURATION_MS);
    eggButton.classList.remove('is-visible');
    eggButton.classList.add('is-hidden');
    window.setTimeout(() => {
      if (eggButton?.parentElement) {
        eggButton.parentElement.removeChild(eggButton);
      }
    }, LEVEL_ONE_INTRO_EGG_REMOVAL_DELAY_MS);
    revealHero();
    await wait(LEVEL_ONE_INTRO_HERO_REVEAL_DELAY_MS);
    await showBattleCard();
  };

  const scheduleEggAutoHatch = () => {
    clearEggAutoHatchTimeout();
    eggAutoHatchTimeoutId = window.setTimeout(() => {
      eggAutoHatchTimeoutId = null;
      void hatchEgg();
    }, LEVEL_ONE_INTRO_EGG_AUTO_START_DELAY_MS);
  };

  const revealHero = () => {
    if (!heroImage) {
      return;
    }
    heroImage.classList.add('is-revealed');
    heroImage.removeAttribute('aria-hidden');
  };

  const showBattleCard = async () => {
    showCard(battleCard);
    await wait(LEVEL_ONE_INTRO_CARD_DELAY_MS);
    if (typeof battleButton.focus === 'function') {
      try {
        battleButton.focus({ preventScroll: true });
      } catch (error) {
        battleButton.focus();
      }
    }
  };

  const handleContinue = async () => {
    continueButton.disabled = true;
    continueButton.setAttribute('aria-busy', 'true');
    await hideCard(welcomeCard);
    continueButton.removeAttribute('aria-busy');
    scheduleEggAutoHatch();
  };

  const handleEggClick = () => {
    if (isHatching || eggButton.disabled) {
      return;
    }

    clearEggAutoHatchTimeout();
    void hatchEgg();
  };

  const handleBattleClick = async () => {
    if (hasStartedBattle) {
      return;
    }
    hasStartedBattle = true;
    clearEggAutoHatchTimeout();
    await hideCard(battleCard);
    introRoot.classList.remove('is-active');
    introRoot.setAttribute('aria-hidden', 'true');

    if (typeof beginBattle === 'function') {
      try {
        await beginBattle({
          triggerButton: battleButton,
          showIntroImmediately: true,
        });
      } catch (error) {
        console.warn('Unable to launch battle from level one intro.', error);
        redirectToBattle();
      }
    } else {
      redirectToBattle();
    }
  };

  continueButton.addEventListener('click', handleContinue);
  eggButton.addEventListener('click', handleEggClick);
  battleButton.addEventListener('click', handleBattleClick);

  (async () => {
    introRoot.classList.add('is-active');
    introRoot.setAttribute('aria-hidden', 'false');
    disableEgg();
    await wait(LEVEL_ONE_INTRO_EGG_DELAY_MS);
    showEgg();
    await wait(LEVEL_ONE_INTRO_INITIAL_CARD_DELAY_MS);
    showCard(welcomeCard);
    if (typeof continueButton.focus === 'function') {
      try {
        continueButton.focus({ preventScroll: true });
      } catch (error) {
        continueButton.focus();
      }
    }
  })();
};

(async () => {
  const isAuthenticated = await ensureAuthenticated();
  if (isAuthenticated) {
    startLandingExperience();
  }
})();

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const PRELOADED_SPRITES_STORAGE_KEY = 'mathmonstersPreloadedSprites';

const sanitizeAssetPath = (path) => {
  if (typeof path !== 'string') {
    return null;
  }

  let trimmed = path.trim();
  if (!trimmed || trimmed.startsWith('data:')) {
    return null;
  }

  const hasProtocol = /^[a-z]+:/i.test(trimmed);
  const isProtocolRelative = trimmed.startsWith('//');
  const hadRootSlash =
    !hasProtocol && !isProtocolRelative && trimmed.startsWith('/');

  trimmed = trimmed.replace(/\\/g, '/');

  if (!hasProtocol && !isProtocolRelative) {
    trimmed = trimmed.replace(/\/{2,}/g, '/');

    while (trimmed.startsWith('./')) {
      trimmed = trimmed.slice(2);
    }

    while (trimmed.startsWith('../')) {
      trimmed = trimmed.slice(3);
    }
  }

  if (hadRootSlash) {
    trimmed = `/${trimmed.replace(/^\/+/, '')}`;
  } else if (!hasProtocol && !isProtocolRelative) {
    trimmed = trimmed.replace(/^\/+/, '');
  }

  trimmed = trimmed.replace(
    /(\/?hero\/shellfin)_level_(\d+)/gi,
    (_, prefix, level) => `${prefix}_evolution_${level}`
  );

  return trimmed;
};

const toAbsoluteSpriteUrl = (path) => {
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

const storePreloadedSprites = (paths) => {
  if (!Array.isArray(paths) || paths.length === 0) {
    return;
  }

  const absolutePaths = [];
  paths.forEach((path) => {
    if (typeof path !== 'string') {
      return;
    }

    const normalized = sanitizeAssetPath(path) || path.trim();
    if (!normalized) {
      return;
    }

    const absolute = toAbsoluteSpriteUrl(normalized);
    if (absolute) {
      absolutePaths.push(absolute);
    }
  });

  if (absolutePaths.length === 0) {
    return;
  }

  if (typeof window !== 'undefined') {
    if (!(window.mathMonstersPreloadedSprites instanceof Set)) {
      window.mathMonstersPreloadedSprites = new Set();
    }
    absolutePaths.forEach((path) => {
      window.mathMonstersPreloadedSprites.add(path);
    });
  }

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    const existingRaw = sessionStorage.getItem(PRELOADED_SPRITES_STORAGE_KEY);
    const existingArray = (() => {
      if (!existingRaw) {
        return [];
      }
      try {
        const parsed = JSON.parse(existingRaw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    })();

    const merged = new Set(
      existingArray.filter((value) => typeof value === 'string' && value.trim())
    );
    absolutePaths.forEach((path) => merged.add(path));
    sessionStorage.setItem(
      PRELOADED_SPRITES_STORAGE_KEY,
      JSON.stringify(Array.from(merged))
    );
  } catch (error) {
    console.warn('Unable to persist preloaded sprites.', error);
  }
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

const mergePlayerWithProgress = (rawPlayerData) => {
  const sourceData = extractPlayerData(rawPlayerData);

  const player =
    sourceData && typeof sourceData === 'object' ? { ...sourceData } : {};

  const storedProgress = readStoredProgress();

  const sanitizeGemCount = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }
    return Math.max(0, Math.round(numericValue));
  };

  const applyGemCountToPlayer = (gemCount) => {
    if (gemCount === null) {
      return;
    }

    const existingGemSources = [
      mergedProgress.gems,
      player.gems,
      player?.progress?.gems,
      player?.currency?.gems,
      player?.currencies?.gems,
      player?.wallet?.gems,
      player?.inventory?.gems,
    ];

    let existingGemCount = null;
    for (const value of existingGemSources) {
      const sanitizedValue = sanitizeGemCount(value);
      if (sanitizedValue === null) {
        continue;
      }
      existingGemCount =
        existingGemCount === null
          ? sanitizedValue
          : Math.max(existingGemCount, sanitizedValue);
    }

    const resolvedGemCount =
      existingGemCount === null
        ? gemCount
        : Math.max(existingGemCount, gemCount);

    mergedProgress.gems = resolvedGemCount;

    const assignIfObject = (container, key) => {
      if (container && typeof container === 'object') {
        container[key] = resolvedGemCount;
      }
    };

    player.gems = resolvedGemCount;
    assignIfObject(player.progress, 'gems');
    assignIfObject(player.currency, 'gems');
    assignIfObject(player.currencies, 'gems');
    assignIfObject(player.wallet, 'gems');
    assignIfObject(player.inventory, 'gems');
  };

  const baseProgress =
    sourceData && typeof sourceData.progress === 'object'
      ? sourceData.progress
      : {};
  const mergedProgress = { ...baseProgress };
  let mergedProgressLevel = readProgressLevel(mergedProgress);
  const baseBattleVariables =
    sourceData && typeof sourceData.battleVariables === 'object'
      ? sourceData.battleVariables
      : {};

  const existingExperience = normalizeExperienceMap(player?.progress?.experience);
  const baseExperience = normalizeExperienceMap(baseProgress?.experience);
  const storedExperience = normalizeExperienceMap(storedProgress?.experience);
  const combinedExperience = mergeExperienceMaps(
    mergeExperienceMaps(baseExperience, existingExperience),
    storedExperience
  );

  if (Object.keys(combinedExperience).length > 0) {
    mergedProgress.experience = combinedExperience;
  } else {
    delete mergedProgress.experience;
  }

  player.battleVariables =
    player && typeof player.battleVariables === 'object'
      ? { ...baseBattleVariables, ...player.battleVariables }
      : { ...baseBattleVariables };

  if (storedProgress && typeof storedProgress === 'object') {
    const storedBattleLevel = readProgressLevel(storedProgress);
    if (storedBattleLevel !== null) {
      mergedProgressLevel = storedBattleLevel;
    }

    if (typeof storedProgress.timeRemainingSeconds === 'number') {
      player.battleVariables.timeRemainingSeconds =
        storedProgress.timeRemainingSeconds;
    }

    const storedGemCount = sanitizeGemCount(storedProgress.gems);
    if (storedGemCount !== null) {
      applyGemCountToPlayer(storedGemCount);
    }
  }

  if (!Object.prototype.hasOwnProperty.call(mergedProgress, 'gems')) {
    const fallbackGemCount =
      sanitizeGemCount(player?.progress?.gems) ??
      sanitizeGemCount(sourceData?.gems) ??
      sanitizeGemCount(baseProgress?.gems);

    if (fallbackGemCount !== null) {
      applyGemCountToPlayer(fallbackGemCount);
    }
  }

  if (mergedProgressLevel === null) {
    const existingPlayerLevel = readProgressLevel(player.progress);
    if (existingPlayerLevel !== null) {
      mergedProgressLevel = existingPlayerLevel;
    }
  }

  assignProgressLevel(mergedProgress, mergedProgressLevel);

  if (!player.progress || typeof player.progress !== 'object') {
    player.progress = mergedProgress;
  } else {
    const normalizedExisting = normalizeExperienceMap(player.progress.experience);
    player.progress = { ...player.progress, ...mergedProgress };
    if (mergedProgress.experience) {
      player.progress.experience = {
        ...normalizedExisting,
        ...mergedProgress.experience,
      };
    }
    assignProgressLevel(player.progress, mergedProgressLevel);
  }

  if (mergedProgressLevel !== null) {
    const sanitizedLevel = Math.max(1, Math.round(Number(mergedProgressLevel) || 1));
    const existingLevel = Number(player.currentLevel);
    if (!Number.isFinite(existingLevel) || sanitizedLevel > existingLevel) {
      player.currentLevel = sanitizedLevel;
    }
  }

  return player;
};

const readPlayerGemCount = (player) => {
  if (!player || typeof player !== 'object') {
    return 0;
  }

  const candidateValues = [
    player.gems,
    player?.currency?.gems,
    player?.currencies?.gems,
    player?.wallet?.gems,
    player?.inventory?.gems,
    player?.progress?.gems,
  ];

  for (const value of candidateValues) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return Math.max(0, Math.round(numericValue));
    }
  }

  return 0;
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

const readProgressLevel = (progress) => {
  if (!isPlainObject(progress)) {
    return null;
  }

  const currentLevel = normalizeBattleLevel(progress.currentLevel);
  if (currentLevel !== null) {
    return currentLevel;
  }

  return normalizeBattleLevel(progress.battleLevel);
};

const assignProgressLevel = (progress, level) => {
  if (!isPlainObject(progress)) {
    return;
  }

  if (level === null) {
    delete progress.currentLevel;
  } else {
    progress.currentLevel = level;
  }

  delete progress.battleLevel;
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

    const selectIndex = () => {
      if (!usedSet) {
        const startIndex = poolIndices.get(poolKey) ?? 0;
        const index = startIndex % pool.length;
        poolIndices.set(poolKey, index + 1);
        return index;
      }

      const availableIndices = [];
      for (let i = 0; i < pool.length; i += 1) {
        if (!usedSet.has(i)) {
          availableIndices.push(i);
        }
      }

      if (availableIndices.length === 0) {
        return null;
      }

      const randomPosition = Math.floor(Math.random() * availableIndices.length);
      return availableIndices[randomPosition];
    };

    const selectedIndex = selectIndex();
    if (selectedIndex === null || selectedIndex === undefined) {
      return null;
    }

    if (usedSet) {
      usedSet.add(selectedIndex);
      levelUsage.set(usedKey, usedSet);
    }

    return pool[selectedIndex];
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

const findMathProgressEntry = (progress, mathTypeKey) => {
  if (!isPlainObject(progress)) {
    return { key: typeof mathTypeKey === 'string' ? mathTypeKey : null, entry: null };
  }

  const normalizedKey =
    typeof mathTypeKey === 'string' && mathTypeKey.trim()
      ? mathTypeKey.trim().toLowerCase()
      : '';

  if (normalizedKey) {
    const directMatchKey = Object.keys(progress).find((key) => {
      if (typeof key !== 'string') {
        return false;
      }
      return key.trim().toLowerCase() === normalizedKey;
    });

    if (directMatchKey && isPlainObject(progress[directMatchKey])) {
      return { key: directMatchKey, entry: progress[directMatchKey] };
    }
  }

  const fallbackKey = Object.keys(progress).find((key) => isPlainObject(progress[key]));
  if (fallbackKey) {
    return { key: fallbackKey, entry: progress[fallbackKey] };
  }

  return {
    key: normalizedKey || null,
    entry: null,
  };
};

const resolveBattleCountForLevel = (level, levelsList) => {
  const extractCount = (candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return 0;
    }
    const entries = Array.isArray(candidate.battles)
      ? candidate.battles.filter(Boolean)
      : [];
    return entries.length > 0 ? entries.length : 0;
  };

  let count = extractCount(level);
  if (count > 0) {
    return count;
  }

  const levelNumber = normalizeBattleLevel(level?.battleLevel ?? level?.level);
  if (!Number.isFinite(levelNumber) || !Array.isArray(levelsList)) {
    return 1;
  }

  const matchedLevel = levelsList.find((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const entryLevel = normalizeBattleLevel(entry?.battleLevel ?? entry?.level);
    return Number.isFinite(entryLevel) && entryLevel === levelNumber;
  });

  count = extractCount(matchedLevel);
  return count > 0 ? count : 1;
};

const determineBattlePreview = (levelsData, playerData) => {
  const player = mergePlayerWithProgress(playerData);
  const { levels, mathTypeLabel, mathTypeKey } = deriveMathTypeLevels(
    levelsData,
    playerData,
    player
  );

  if (!levels.length) {
    return { levels, player, preview: null };
  }

  const progressLevel = readProgressLevel(player?.progress);
  const activeLevel = (() => {
    if (progressLevel !== null) {
      const match = levels.find(
        (level) => normalizeBattleLevel(level?.battleLevel) === progressLevel
      );
      if (match) {
        return match;
      }
    }
    return levels[0];
  })();

  if (!activeLevel) {
    return { levels, player, preview: null };
  }

  const resolvePlayerLevelData = (level) => {
    if (!player || typeof player !== 'object') {
      return null;
    }
    const map = player.battleLevel;
    if (!map || typeof map !== 'object') {
      return null;
    }

    if (level === undefined || level === null) {
      return null;
    }

    if (level in map && typeof map[level] === 'object') {
      return map[level];
    }

    const key = String(level);
    if (key in map && typeof map[key] === 'object') {
      return map[key];
    }

    return null;
  };

  const levelHero = activeLevel?.battle?.hero ?? {};
  const heroData = {
    ...(player?.hero ?? {}),
    ...levelHero,
    ...(resolvePlayerLevelData(activeLevel?.battleLevel)?.hero ?? {}),
  };

  const rawHeroSprite =
    typeof heroData?.sprite === 'string' ? heroData.sprite.trim() : '';
  const heroSprite = sanitizeAssetPath(rawHeroSprite) || rawHeroSprite;
  const heroName = typeof heroData?.name === 'string' ? heroData.name.trim() : '';
  const heroAlt = heroName ? `${heroName} ready for battle` : 'Hero ready for battle';

  const battle = activeLevel?.battle ?? {};
  const mathLabelSource =
    typeof activeLevel?.mathLabel === 'string'
      ? activeLevel.mathLabel
      : typeof battle?.mathLabel === 'string'
      ? battle.mathLabel
      : typeof mathTypeLabel === 'string'
      ? mathTypeLabel
      : typeof activeLevel?.mathType === 'string'
      ? activeLevel.mathType
      : typeof battle?.mathType === 'string'
      ? battle.mathType
      : typeof mathTypeKey === 'string'
      ? mathTypeKey
      : 'Math Mission';
  const mathLabel = mathLabelSource.trim() || 'Math Mission';

  const monsterData = (() => {
    if (battle && typeof battle.monster === 'object' && battle.monster !== null) {
      return battle.monster;
    }
    if (Array.isArray(battle?.monsters)) {
      const match = battle.monsters.find(
        (candidate) => candidate && typeof candidate === 'object'
      );
      if (match) {
        return match;
      }
    }
    return {};
  })();
  const rawMonsterSprite =
    typeof monsterData?.sprite === 'string' ? monsterData.sprite.trim() : '';
  const monsterSprite = sanitizeAssetPath(rawMonsterSprite) || rawMonsterSprite;
  const monsterName =
    typeof monsterData?.name === 'string' ? monsterData.name.trim() : '';
  const monsterAlt = monsterName ? `${monsterName} ready for battle` : 'Monster ready for battle';

  const levelName = typeof activeLevel?.name === 'string' ? activeLevel.name.trim() : '';
  const battleTitleLabel =
    levelName ||
    (typeof activeLevel?.battleLevel === 'number'
      ? `Battle ${activeLevel.battleLevel}`
      : 'Upcoming Battle');
  const heroLevelLabel =
    typeof activeLevel?.battleLevel === 'number'
      ? `Level ${activeLevel.battleLevel}`
      : 'Level';
  const experienceMap = normalizeExperienceMap(player?.progress?.experience);
  const earnedExperience = readExperienceForLevel(
    experienceMap,
    activeLevel?.battleLevel
  );
  const levelUpRequirement = Number(battle?.levelUp);
  const experienceProgress = computeExperienceProgress(
    earnedExperience,
    levelUpRequirement
  );
  const progressText = experienceProgress.text;
  const playerGems = readPlayerGemCount(player);

  const { key: mathProgressKey, entry: mathProgressEntry } = findMathProgressEntry(
    player?.progress,
    mathTypeKey
  );

  const totalBattlesForLevel = resolveBattleCountForLevel(activeLevel, levels);
  const sanitizedBattleTotal = Number.isFinite(totalBattlesForLevel)
    ? Math.max(1, Math.round(totalBattlesForLevel))
    : 1;
  const storedBattleTotal = Number(
    mathProgressEntry?.currentLevel ?? mathProgressEntry?.battleLevel
  );
  const resolvedBattleTotal = Number.isFinite(storedBattleTotal) && storedBattleTotal > 0
    ? Math.max(sanitizedBattleTotal, Math.round(storedBattleTotal))
    : sanitizedBattleTotal;
  const storedBattleCurrent = Number(mathProgressEntry?.currentBattle);
  let resolvedBattleCurrent = Number.isFinite(storedBattleCurrent)
    ? Math.round(storedBattleCurrent)
    : 1;
  if (!Number.isFinite(resolvedBattleCurrent) || resolvedBattleCurrent <= 0) {
    resolvedBattleCurrent = 1;
  }
  if (resolvedBattleCurrent > resolvedBattleTotal) {
    resolvedBattleCurrent = resolvedBattleTotal;
  }
  const battleProgressRatio = resolvedBattleTotal > 0
    ? Math.max(0, Math.min(1, resolvedBattleCurrent / resolvedBattleTotal))
    : 0;

  return {
    levels,
    player,
    preview: {
      activeLevel,
      battleLevel: activeLevel?.battleLevel ?? null,
      mathLabel,
      battleTitleLabel,
      hero: { ...heroData, sprite: heroSprite },
      heroAlt,
      heroLevelLabel,
      monster: { ...monsterData, sprite: monsterSprite },
      monsterAlt,
      mathTypeKey: typeof mathTypeKey === 'string' ? mathTypeKey : mathProgressKey,
      progressMathKey: mathProgressKey,
      progressBattleCurrent: resolvedBattleCurrent,
      progressBattleTotal: resolvedBattleTotal,
      progressBattleRatio: battleProgressRatio,
      progressExperience: experienceProgress.ratio,
      progressExperienceEarned: experienceProgress.earned,
      progressExperienceTotal: experienceProgress.total,
      progressExperienceText: progressText,
      playerGems,
      currentLevel: activeLevel?.battleLevel ?? null,
    },
  };
};

const normalizeBattleIndex = (value) => {
  const normalized = normalizeBattleLevel(value);
  if (typeof normalized !== 'number' || !Number.isFinite(normalized)) {
    return null;
  }

  const rounded = Math.round(normalized);
  return rounded > 0 ? rounded : null;
};

const HOME_ACTION_GLOW_CLASSES = [
  'home__action--glow',
  'home__action--glow-sword',
  'home__action--glow-shop',
];

const updateHomeTutorialHighlights = ({ battleLevel, currentBattle } = {}) => {
  const actionsContainer = document.querySelector('.home__actions');
  if (!actionsContainer) {
    return;
  }

  const actionElements = Array.from(
    actionsContainer.querySelectorAll('.home__action')
  ).filter((element) => element instanceof HTMLElement);

  if (!actionElements.length) {
    return;
  }

  const battleAction =
    actionElements.find((element) => element.matches('[data-battle-trigger]')) ||
    null;
  const shopAction =
    actionElements.find((element) => !element.matches('[data-battle-trigger]')) ||
    null;

  const resetActionState = (element) => {
    if (!element) {
      return;
    }

    element.hidden = false;
    element.removeAttribute('hidden');
    element.removeAttribute('aria-hidden');
    element.classList.remove('pulsating-glow');
    HOME_ACTION_GLOW_CLASSES.forEach((className) => {
      element.classList.remove(className);
    });

    const actionImage = element.querySelector('.home__action-image');
    if (actionImage instanceof HTMLElement) {
      actionImage.hidden = false;
      actionImage.removeAttribute('hidden');
      actionImage.removeAttribute('aria-hidden');
    }
  };

  actionElements.forEach((element) => resetActionState(element));
  actionsContainer.classList.remove('home__actions--single');

  const landingRoot = document.body;
  const isStandardLanding = Boolean(
    landingRoot?.classList?.contains('is-standard-landing')
  );

  if (!isStandardLanding) {
    return;
  }

  const resolvedLevel = normalizeBattleIndex(battleLevel);
  const resolvedBattle = normalizeBattleIndex(currentBattle);

  if (resolvedLevel === 2 && resolvedBattle === 1) {
    if (shopAction) {
      shopAction.hidden = true;
      shopAction.setAttribute('aria-hidden', 'true');

      const shopImage = shopAction.querySelector('.home__action-image');
      if (shopImage instanceof HTMLElement) {
        shopImage.hidden = true;
        shopImage.setAttribute('hidden', '');
        shopImage.setAttribute('aria-hidden', 'true');
      }
    }

    if (battleAction) {
      battleAction.classList.add(
        'pulsating-glow',
        'home__action--glow',
        'home__action--glow-sword'
      );
    }

    actionsContainer.classList.add('home__actions--single');
    return;
  }

  if (resolvedLevel === 2 && resolvedBattle === 2) {
    if (shopAction) {
      shopAction.hidden = false;
      shopAction.removeAttribute('aria-hidden');

      const shopImage = shopAction.querySelector('.home__action-image');
      if (shopImage instanceof HTMLElement) {
        shopImage.hidden = false;
        shopImage.removeAttribute('hidden');
        shopImage.removeAttribute('aria-hidden');
      }
      shopAction.classList.add(
        'pulsating-glow',
        'home__action--glow',
        'home__action--glow-shop'
      );
    }

    return;
  }
};

const applyBattlePreview = (previewData = {}, levels = []) => {
  const heroImageElements = document.querySelectorAll('[data-hero-sprite]');
  const monsterImage = document.querySelector('[data-monster]');
  const battleMathElements = document.querySelectorAll('[data-battle-math]');
  const battleTitleElements = document.querySelectorAll('[data-battle-title]');
  const progressElements = document.querySelectorAll('[data-battle-progress]');
  const heroNameElements = document.querySelectorAll('[data-hero-name]');
  const heroLevelElements = document.querySelectorAll('[data-hero-level]');
  const gemCountElements = document.querySelectorAll('[data-hero-gems]');
  const heroInfoElement = document.querySelector('.landing__hero-info');
  const actionsElement = document.querySelector('.landing__actions');
  const landingRoot = document.body;

  heroImageElements.forEach((heroImage) => {
    if (!heroImage) {
      return;
    }

    const heroSprite =
      typeof previewData?.hero?.sprite === 'string' ? previewData.hero.sprite : '';
    if (heroSprite) {
      heroImage.src = heroSprite;
    }
    heroImage.alt =
      typeof previewData?.heroAlt === 'string' && previewData.heroAlt.trim()
        ? previewData.heroAlt
        : 'Hero ready for battle';
  });

  if (monsterImage) {
    const monsterSprite =
      typeof previewData?.monster?.sprite === 'string'
        ? previewData.monster.sprite
        : '';
    if (monsterSprite) {
      monsterImage.src = monsterSprite;
    }
    monsterImage.alt =
      typeof previewData?.monsterAlt === 'string' && previewData.monsterAlt.trim()
        ? previewData.monsterAlt
        : 'Monster ready for battle';
  }

  battleMathElements.forEach((element) => {
    if (!element) {
      return;
    }
    element.textContent =
      typeof previewData?.mathLabel === 'string' && previewData.mathLabel.trim()
        ? previewData.mathLabel
        : 'Math Mission';
  });

  battleTitleElements.forEach((element) => {
    if (!element) {
      return;
    }
    element.textContent =
      typeof previewData?.battleTitleLabel === 'string' &&
      previewData.battleTitleLabel.trim()
        ? previewData.battleTitleLabel
        : 'Upcoming Battle';
  });

  const resolvedHeroName =
    typeof previewData?.hero?.name === 'string' && previewData.hero.name.trim()
      ? previewData.hero.name.trim()
      : '';

  heroNameElements.forEach((element) => {
    if (!element) {
      return;
    }
    element.textContent = resolvedHeroName || 'Hero';
  });

  const resolvedLevelLabel = (() => {
    if (
      typeof previewData?.heroLevelLabel === 'string' &&
      previewData.heroLevelLabel.trim()
    ) {
      return previewData.heroLevelLabel.trim();
    }
    if (
      typeof previewData?.battleTitleLabel === 'string' &&
      previewData.battleTitleLabel.trim()
    ) {
      return previewData.battleTitleLabel.trim();
    }
    return 'Level';
  })();

  heroLevelElements.forEach((element) => {
    if (!element) {
      return;
    }
    element.textContent = resolvedLevelLabel;
  });

  const resolvedGemCount = (() => {
    const fromPreview = Number(previewData?.playerGems);
    if (Number.isFinite(fromPreview)) {
      return Math.max(0, Math.round(fromPreview));
    }
    const fromHero = Number(previewData?.hero?.gems);
    if (Number.isFinite(fromHero)) {
      return Math.max(0, Math.round(fromHero));
    }
    return 0;
  })();

  gemCountElements.forEach((element) => {
    if (!element) {
      return;
    }
    element.textContent = `${resolvedGemCount}`;
  });

  progressElements.forEach((progressElement) => {
    if (!progressElement) {
      return;
    }

    const battleTotalRaw = Number(previewData?.progressBattleTotal);
    const battleCurrentRaw = Number(previewData?.progressBattleCurrent);
    const hasBattleProgress =
      Number.isFinite(battleTotalRaw) && battleTotalRaw > 0;

    if (hasBattleProgress) {
      const totalBattles = Math.max(1, Math.round(battleTotalRaw));
      const currentBattle = Number.isFinite(battleCurrentRaw)
        ? Math.max(1, Math.min(Math.round(battleCurrentRaw), totalBattles))
        : Math.min(1, totalBattles);
      const progressValue = totalBattles > 0
        ? Math.max(0, Math.min(1, currentBattle / totalBattles))
        : 0;
      progressElement.style.setProperty('--progress-value', progressValue);
      progressElement.setAttribute('aria-valuemin', '0');
      progressElement.setAttribute('aria-valuemax', `${totalBattles}`);
      progressElement.setAttribute('aria-valuenow', `${currentBattle}`);
      const ariaText = `Battle ${currentBattle} of ${totalBattles}`;
      progressElement.setAttribute('aria-valuetext', ariaText);
      return;
    }

    const progressValue = Number.isFinite(previewData?.progressExperience)
      ? Math.min(Math.max(previewData.progressExperience, 0), 1)
      : 0;
    const progressTextRaw =
      typeof previewData?.progressExperienceText === 'string' &&
      previewData.progressExperienceText.trim()
        ? previewData.progressExperienceText.trim()
        : '0 of 0';
    const normalizedProgressText =
      typeof progressTextRaw === 'string' ? progressTextRaw.trim() : '';
    const earnedCount = Number(previewData?.progressExperienceEarned);
    const totalCount = Number(previewData?.progressExperienceTotal);
    progressElement.style.setProperty('--progress-value', progressValue);
    progressElement.setAttribute('aria-valuemin', '0');
    let resolvedProgressLabel = '';

    if (Number.isFinite(earnedCount) && Number.isFinite(totalCount) && totalCount > 0) {
      const roundedTotal = Math.max(0, Math.round(totalCount));
      const clampedEarned = Math.max(0, Math.min(Math.round(earnedCount), roundedTotal));
      progressElement.setAttribute('aria-valuemax', `${roundedTotal}`);
      progressElement.setAttribute('aria-valuenow', `${clampedEarned}`);
      resolvedProgressLabel = `${clampedEarned} / ${roundedTotal} Battles Won`;
    } else {
      progressElement.setAttribute('aria-valuemax', '100');
      progressElement.setAttribute('aria-valuenow', `${Math.round(progressValue * 100)}`);
      if (normalizedProgressText.includes(' of ')) {
        resolvedProgressLabel = `${normalizedProgressText.replace(' of ', ' / ')} Battles Won`;
      } else if (normalizedProgressText) {
        resolvedProgressLabel = normalizedProgressText;
      }
    }
    const ariaText = resolvedProgressLabel || normalizedProgressText || 'Battles Won';
    progressElement.setAttribute('aria-valuetext', ariaText);
  });

  const resolvedBattleLevel = (() => {
    const fromPreview = normalizeBattleLevel(
      previewData?.currentLevel ?? previewData?.battleLevel
    );
    if (fromPreview !== null) {
      return fromPreview;
    }

    const fromActiveLevel = normalizeBattleLevel(previewData?.activeLevel?.battleLevel);
    if (fromActiveLevel !== null) {
      return fromActiveLevel;
    }

    if (Array.isArray(levels)) {
      for (const level of levels) {
        const candidate = normalizeBattleLevel(level?.battleLevel);
        if (candidate !== null) {
          return candidate;
        }
      }
    }

    return null;
  })();

  const isLevelOneLanding = resolvedBattleLevel !== null ? resolvedBattleLevel <= 1 : true;

  if (landingRoot) {
    landingRoot.classList.toggle('is-level-one-landing', isLevelOneLanding);
    landingRoot.classList.toggle('is-standard-landing', !isLevelOneLanding);
  }

  if (heroInfoElement) {
    if (isLevelOneLanding) {
      heroInfoElement.setAttribute('aria-hidden', 'true');
    } else {
      heroInfoElement.removeAttribute('aria-hidden');
    }
  }

  if (actionsElement) {
    if (isLevelOneLanding) {
      actionsElement.setAttribute('aria-hidden', 'true');
    } else {
      actionsElement.removeAttribute('aria-hidden');
    }
  }

  updateHomeTutorialHighlights({
    battleLevel: resolvedBattleLevel,
    currentBattle: previewData?.progressBattleCurrent,
  });

  updateHeroFloat();
  updateIntroTimingForLanding({ isLevelOneLanding });
};

const preloaderElement = document.querySelector('[data-preloader]');
let preloaderStartTime = getNow();
let preloaderFinished = false;
let preloaderHidePromise = null;

const finishPreloader = () => {
  if (preloaderHidePromise) {
    return preloaderHidePromise;
  }

  preloaderHidePromise = (async () => {
    if (preloaderFinished) {
      document.body.classList.remove('is-preloading');
      return;
    }

    preloaderFinished = true;
    const elapsed = getNow() - preloaderStartTime;
    if (elapsed < MIN_PRELOAD_DURATION_MS) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, MIN_PRELOAD_DURATION_MS - elapsed)
      );
    }

    document.body.classList.remove('is-preloading');

    if (!preloaderElement) {
      return;
    }

    preloaderElement.setAttribute('aria-hidden', 'true');
    preloaderElement.classList.add('preloader--hidden');

    await new Promise((resolve) => window.setTimeout(resolve, 400));

    if (preloaderElement.parentElement) {
      preloaderElement.parentElement.removeChild(preloaderElement);
    }
  })();

  return preloaderHidePromise;
};

const readStoredProgress = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return null;
    }
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('Stored progress unavailable.', error);
    return null;
  }
};

const setupDevResetTool = () => {
  const devButton = document.querySelector(DEV_RESET_BUTTON_SELECTOR);
  if (!devButton) {
    return;
  }

  const handleReset = (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const storedProgress = readStoredProgress();
    const normalizedProgress = isPlainObject(storedProgress)
      ? { ...storedProgress }
      : {};

    const mathKey = DEV_RESET_TARGET_MATH_KEY;
    const existingMathProgress = isPlainObject(normalizedProgress[mathKey])
      ? { ...normalizedProgress[mathKey] }
      : {};

    const updatedMathProgress = {
      ...existingMathProgress,
      currentBattle: DEV_RESET_TARGET_BATTLE,
      currentLevel: DEV_RESET_TARGET_LEVEL,
    };

    const updatedProgress = {
      ...normalizedProgress,
      [mathKey]: updatedMathProgress,
    };
    assignProgressLevel(updatedProgress, DEV_RESET_TARGET_LEVEL);

    try {
      const storage = window.localStorage;
      if (storage) {
        storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updatedProgress));
      }
    } catch (error) {
      console.warn('Unable to store developer reset progress.', error);
      return;
    }

    try {
      window.sessionStorage?.removeItem(PLAYER_PROFILE_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear stored player profile for reset.', error);
    }

    try {
      window.sessionStorage?.removeItem(NEXT_BATTLE_SNAPSHOT_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear stored battle snapshot for reset.', error);
    }

    if (typeof devButton.blur === 'function') {
      devButton.blur();
    }

    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  };

  if (devButton.dataset.devResetBound === 'true') {
    return;
  }

  devButton.dataset.devResetBound = 'true';
  devButton.addEventListener('click', handleReset);
};

const cloneForDevTools = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fallback to JSON serialization below.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
};

const normalizeNumericValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const assignIfMeaningful = (target, key, value) => {
  if (typeof value === 'undefined' || value === null) {
    return;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      target[key] = value;
    }
    return;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      target[key] = trimmed;
    }
    return;
  }

  if (typeof value === 'boolean') {
    target[key] = value;
    return;
  }

  if (Array.isArray(value)) {
    if (value.length > 0) {
      target[key] = value;
    }
    return;
  }

  if (isPlainObject(value)) {
    if (Object.keys(value).length > 0) {
      target[key] = value;
    }
  }
};

const createCompactHero = (hero) => {
  if (!isPlainObject(hero)) {
    return null;
  }

  const compact = {};
  assignIfMeaningful(compact, 'id', hero.id);
  assignIfMeaningful(compact, 'name', hero.name);
  assignIfMeaningful(compact, 'sprite', hero.sprite);
  assignIfMeaningful(compact, 'attackSprite', hero.attackSprite);

  const attack = normalizeNumericValue(hero.attack);
  if (attack !== null) {
    compact.attack = attack;
  }

  const health = normalizeNumericValue(hero.health);
  if (health !== null) {
    compact.health = health;
  }

  const damage = normalizeNumericValue(hero.damage);
  if (damage !== null) {
    compact.damage = damage;
  }

  return Object.keys(compact).length > 0 ? compact : null;
};

const createCompactProgressEntry = (entry) => {
  if (!isPlainObject(entry)) {
    return null;
  }

  const compact = {};
  const currentLevel = normalizeNumericValue(entry.currentLevel);
  if (currentLevel !== null) {
    compact.currentLevel = currentLevel;
  }

  const currentBattle = normalizeNumericValue(entry.currentBattle);
  if (currentBattle !== null) {
    compact.currentBattle = currentBattle;
  }

  return Object.keys(compact).length > 0 ? compact : null;
};

const createCompactProgress = (progress) => {
  if (!isPlainObject(progress)) {
    return null;
  }

  const compact = {};

  const gems = normalizeNumericValue(progress.gems);
  if (gems !== null) {
    compact.gems = gems;
  }

  Object.entries(progress).forEach(([key, value]) => {
    if (key === 'gems' || key === 'battleLevel' || key === 'currentLevel') {
      return;
    }

    const entry = createCompactProgressEntry(value);
    if (entry) {
      compact[key] = entry;
    }
  });

  const overallLevel =
    normalizeNumericValue(progress.currentLevel) ??
    normalizeNumericValue(progress.battleLevel);
  if (overallLevel !== null) {
    compact.currentLevel = overallLevel;
  }

  return Object.keys(compact).length > 0 ? compact : null;
};

const createCompactBattleVariables = (variables) => {
  if (!isPlainObject(variables)) {
    return null;
  }

  const compact = {};
  const timeRemaining = normalizeNumericValue(variables.timeRemainingSeconds);
  if (timeRemaining !== null) {
    compact.timeRemainingSeconds = timeRemaining;
  }

  return Object.keys(compact).length > 0 ? compact : null;
};

const createCompactMedals = (medals) => {
  if (!Array.isArray(medals)) {
    return null;
  }

  const filtered = medals.filter((entry) => {
    if (entry === null || typeof entry === 'undefined') {
      return false;
    }

    if (typeof entry === 'string') {
      return entry.trim().length > 0;
    }

    if (typeof entry === 'number') {
      return Number.isFinite(entry);
    }

    if (typeof entry === 'boolean') {
      return true;
    }

    if (Array.isArray(entry)) {
      return entry.length > 0;
    }

    if (isPlainObject(entry)) {
      return Object.keys(entry).length > 0;
    }

    return false;
  });

  return filtered.length > 0 ? filtered : null;
};

const createCompactPlayerProfile = (rawPlayerData) => {
  const player = extractPlayerData(rawPlayerData);
  if (!isPlainObject(player)) {
    return null;
  }

  const compact = {};

  assignIfMeaningful(compact, 'id', player.id);
  assignIfMeaningful(compact, 'currentMathType', player.currentMathType);

  const numericKeys = [
    'currentLevel',
    'currentBattle',
    'gems',
    'dailyStreak',
    'totalAnswered',
    'totalAccuracy',
    'totalTime',
  ];

  numericKeys.forEach((key) => {
    const value = normalizeNumericValue(player[key]);
    if (value !== null) {
      compact[key] = value;
    }
  });

  const hero = createCompactHero(player.hero);
  if (hero) {
    compact.hero = hero;
  }

  const progress = createCompactProgress(player.progress);
  if (progress) {
    compact.progress = progress;
  }

  const battleVariables = createCompactBattleVariables(player.battleVariables);
  if (battleVariables) {
    compact.battleVariables = battleVariables;
  }

  const medals = createCompactMedals(player.medals);
  if (medals) {
    compact.medals = medals;
  }

  return Object.keys(compact).length > 0 ? compact : null;
};

const collectLivePlayerProfileSnapshot = async () => {
  const timestamp = new Date().toISOString();
  const sourceMap = {};
  const issues = [];

  const applySource = (label, candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return;
    }

    const normalized = extractPlayerData(candidate);
    if (!normalized || typeof normalized !== 'object') {
      return;
    }

    const compact = createCompactPlayerProfile(normalized);
    if (compact) {
      sourceMap[label] = cloneForDevTools(compact);
    } else if (!(label in sourceMap)) {
      sourceMap[label] = null;
    }
    return normalized;
  };

  let mergedPlayer = {};

  const mergeFromSource = (label, candidate) => {
    const normalized = applySource(label, candidate);
    if (!normalized || typeof normalized !== 'object') {
      return;
    }
    mergedPlayer = mergePlayerData(mergedPlayer, normalized);
  };

  if (typeof window !== 'undefined') {
    const preloaded = window.preloadedData;
    mergeFromSource('preloaded.player', preloaded?.player);
    mergeFromSource('preloaded.playerData', preloaded?.playerData);
    mergeFromSource('preloaded.fallbackPlayerData', preloaded?.fallbackPlayerData);
  }

  const storedProfile = readStoredPlayerProfile();
  mergeFromSource('session.playerProfile', storedProfile);

  try {
    const remoteProfile = await fetchPlayerProfile();
    mergeFromSource('remote.playerProfile', remoteProfile);
  } catch (error) {
    console.warn('Unable to fetch live player profile for developer tool.', error);
    issues.push(
      `Supabase fetch failed${error?.message ? `: ${error.message}` : '.'}`
    );
  }

  const hasSources = Object.keys(sourceMap).length > 0;
  const compactMerged = createCompactPlayerProfile(mergedPlayer);

  return {
    generatedAt: timestamp,
    player: hasSources && compactMerged ? cloneForDevTools(compactMerged) : null,
    sources: sourceMap,
    warnings: issues,
  };
};

const formatDevPlayerSnapshot = (snapshot) => {
  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  return JSON.stringify(safeSnapshot, null, 2);
};

const setupDevPlayerDataTool = () => {
  const devButton = document.querySelector(DEV_PLAYER_DATA_BUTTON_SELECTOR);
  if (!devButton) {
    return;
  }

  if (devButton.dataset.devPlayerDataBound === 'true') {
    return;
  }

  const createInlineViewerController = () => {
    if (typeof document === 'undefined') {
      return null;
    }

    const body = document.body || document.documentElement;
    if (!body) {
      return null;
    }

    const overlay = document.createElement('div');
    overlay.id = 'dev-player-data-viewer';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(15, 23, 42, 0.85)';
    overlay.style.zIndex = '2147483647';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '24px';
    overlay.style.boxSizing = 'border-box';

    const panel = document.createElement('div');
    panel.style.width = '100%';
    panel.style.maxWidth = '760px';
    panel.style.maxHeight = '90vh';
    panel.style.background = '#0f172a';
    panel.style.color = '#e2e8f0';
    panel.style.borderRadius = '12px';
    panel.style.boxShadow = '0 20px 45px rgba(15, 23, 42, 0.45)';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.overflow = 'hidden';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '16px';
    header.style.background = 'rgba(15, 23, 42, 0.9)';
    header.style.borderBottom = '1px solid rgba(148, 163, 184, 0.2)';

    const title = document.createElement('span');
    title.textContent = 'Developer Player Data';
    title.style.fontWeight = '600';
    title.style.fontSize = '16px';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    closeButton.style.marginLeft = '16px';
    closeButton.style.padding = '6px 12px';
    closeButton.style.fontSize = '14px';
    closeButton.style.fontWeight = '600';
    closeButton.style.borderRadius = '999px';
    closeButton.style.border = '1px solid rgba(148, 163, 184, 0.6)';
    closeButton.style.background = 'rgba(30, 41, 59, 0.85)';
    closeButton.style.color = '#e2e8f0';
    closeButton.style.cursor = 'pointer';

    const content = document.createElement('pre');
    content.style.margin = '0';
    content.style.padding = '16px';
    content.style.flex = '1 1 auto';
    content.style.font =
      "13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    content.style.background = '#020617';
    content.style.overflow = 'auto';
    content.style.whiteSpace = 'pre-wrap';
    content.style.wordBreak = 'break-word';

    header.appendChild(title);
    header.appendChild(closeButton);
    panel.appendChild(header);
    panel.appendChild(content);
    overlay.appendChild(panel);

    let lastActiveElement = null;
    let isVisible = false;

    const updateContent = (text) => {
      const stringified = typeof text === 'string' ? text : String(text ?? '');
      content.textContent = stringified;
    };

    const show = (text) => {
      if (!overlay.isConnected) {
        body.appendChild(overlay);
      }

      if (!isVisible) {
        lastActiveElement = document.activeElement;
        overlay.style.display = 'flex';
        isVisible = true;
        try {
          if (body !== document.body) {
            document.body?.appendChild(overlay);
          }
        } catch (error) {
          // Ignore body append failures.
        }
        try {
          document.body && (document.body.style.overflow = 'hidden');
        } catch (error) {
          // Ignore overflow manipulation failures.
        }
        setTimeout(() => {
          try {
            closeButton.focus();
          } catch (error) {
            // Ignore focus failures.
          }
        }, 0);
      }

      updateContent(text);
    };

    const hide = () => {
      if (!isVisible) {
        return;
      }

      overlay.style.display = 'none';
      isVisible = false;
      updateContent('');

      try {
        if (document.body) {
          document.body.style.overflow = '';
        }
      } catch (error) {
        // Ignore overflow manipulation failures.
      }

      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        try {
          lastActiveElement.focus();
        } catch (error) {
          // Ignore focus restoration failures.
        }
      }
      lastActiveElement = null;
    };

    closeButton.addEventListener('click', hide);
    overlay.addEventListener('click', (event) => {
      if (event && event.target === overlay) {
        hide();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (!isVisible) {
        return;
      }
      if (event && event.key === 'Escape') {
        hide();
      }
    });

    return {
      show,
      update: updateContent,
      hide,
    };
  };

  let inlineViewer = null;

  const ensureInlineViewer = () => {
    if (inlineViewer) {
      return inlineViewer;
    }

    inlineViewer = createInlineViewerController();
    return inlineViewer;
  };

  const handleClick = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const inlineViewerController = ensureInlineViewer();
    if (!inlineViewerController) {
      try {
        window.alert?.('Unable to show developer player data viewer.');
      } catch (error) {
        // Ignore alert failures.
      }
      return;
    }

    inlineViewerController.show('Loading player data…');

    try {
      const snapshot = await collectLivePlayerProfileSnapshot();
      const formatted = formatDevPlayerSnapshot(snapshot);
      inlineViewerController.update(formatted);
    } catch (error) {
      const message =
        'Unable to load live player data.' +
        (error && error.message ? `\n\n${error.message}` : '');
      inlineViewerController.update(message);
    }
  };

  devButton.dataset.devPlayerDataBound = 'true';
  devButton.addEventListener('click', handleClick);
};

const setupDevSignOutTool = () => {
  const devButton = document.querySelector(DEV_SIGN_OUT_BUTTON_SELECTOR);
  if (!devButton) {
    return;
  }

  if (devButton.dataset.devSignOutBound === 'true') {
    return;
  }

  const handleSignOut = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    await logoutAndRedirect();
  };

  devButton.dataset.devSignOutBound = 'true';
  devButton.addEventListener('click', handleSignOut);
};

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
    console.warn('Stored player profile unavailable.', error);
    return null;
  }
};

const persistPlayerProfile = (player) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const storage = window.sessionStorage;
    if (!storage) {
      return;
    }

    if (!player || typeof player !== 'object') {
      storage.removeItem(PLAYER_PROFILE_STORAGE_KEY);
      return;
    }

    const serialized = JSON.stringify(player);
    storage.setItem(PLAYER_PROFILE_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Unable to persist player profile.', error);
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

const markLandingVisited = () => {
  setVisitedFlag(sessionStorage, 'Session');
  setVisitedFlag(localStorage, 'Local');
};

const preloadLandingAssets = async () => {
  const results = { levelsData: null, playerData: null, previewData: null };
  const imageAssets = new Set([
    '../images/background/background.png',
    '../images/battle/battle_time.png',
  ]);

  const addImageAsset = (path) => {
    if (typeof path !== 'string') {
      return;
    }

    const normalized = sanitizeAssetPath(path) || path.trim();
    if (!normalized || !/[./]/.test(normalized)) {
      return;
    }

    imageAssets.add(normalized);
  };

  const collectSpriteLikeValue = (value) => {
    if (!value) {
      return;
    }

    if (typeof value === 'string') {
      addImageAsset(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => collectSpriteLikeValue(entry));
      return;
    }

    if (typeof value === 'object') {
      Object.values(value).forEach((entry) => {
        collectSpriteLikeValue(entry);
      });
    }
  };

  const collectCharacterSprites = (character) => {
    if (!character || typeof character !== 'object') {
      return;
    }

    collectSpriteLikeValue(character.sprite);
    collectSpriteLikeValue(character.attackSprite);
    collectSpriteLikeValue(character.attackSprites);
    collectSpriteLikeValue(character.basicAttack);
    collectSpriteLikeValue(character.superAttack);

    if (character.attacks && typeof character.attacks === 'object') {
      Object.values(character.attacks).forEach((attack) => {
        if (attack && typeof attack === 'object') {
          collectSpriteLikeValue(attack.sprite);
          collectSpriteLikeValue(attack.attackSprite);
          collectSpriteLikeValue(attack.attackSprites);
        }
      });
    }
  };

  const collectMonsterPools = (pool) => {
    if (!pool) {
      return;
    }

    if (Array.isArray(pool)) {
      pool.forEach((entry) => {
        if (entry && typeof entry === 'object') {
          collectSpriteLikeValue(entry.sprite);
        } else {
          collectSpriteLikeValue(entry);
        }
      });
      return;
    }

    if (typeof pool === 'object') {
      Object.values(pool).forEach((value) => collectMonsterPools(value));
    }
  };

  if (!document.body.classList.contains('is-preloading')) {
    document.body.classList.add('is-preloading');
  }

  preloaderStartTime = getNow();

  document
    .querySelectorAll('img[src]')
    .forEach((img) => addImageAsset(img.getAttribute('src')));

  const loadJson = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to preload ${url}`);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  try {
    const [levelsData, fallbackPlayerData] = await Promise.all([
      loadJson('data/levels.json'),
      loadJson('data/player.json'),
    ]);

    let remotePlayerData = null;
    const storedPlayerProfile = readStoredPlayerProfile();
    try {
      remotePlayerData = await fetchPlayerProfile();
    } catch (error) {
      console.warn('Unable to load remote player profile during preload.', error);
      remotePlayerData = null;
    }

    if (remotePlayerData) {
      syncRemoteBattleLevel(remotePlayerData);
    }

    const fallbackPlayer = extractPlayerData(fallbackPlayerData);
    const remotePlayer = extractPlayerData(remotePlayerData);
    const storedPlayer = extractPlayerData(storedPlayerProfile);

    let combinedPlayer = {};
    if (Object.keys(fallbackPlayer || {}).length > 0) {
      combinedPlayer = mergePlayerData(combinedPlayer, fallbackPlayer);
    }
    if (Object.keys(remotePlayer || {}).length > 0) {
      combinedPlayer = mergePlayerData(combinedPlayer, remotePlayer);
    }
    if (Object.keys(storedPlayer || {}).length > 0) {
      combinedPlayer = mergePlayerData(combinedPlayer, storedPlayer);
    }

    const chosenPlayerData = Object.keys(combinedPlayer).length
      ? combinedPlayer
      : remotePlayerData || fallbackPlayerData || storedPlayerProfile;

    const { levels, player, preview } = determineBattlePreview(
      levelsData,
      chosenPlayerData
    );

    results.levelsData =
      levelsData && typeof levelsData === 'object'
        ? { ...levelsData, levels }
        : { levels };
    results.playerData = player;
    results.previewData = preview;
    results.fallbackPlayerData = fallbackPlayer;

    persistPlayerProfile(player);

    if (levels.length) {
      levels.forEach((level) => {
        const battle = level?.battle ?? {};
        collectCharacterSprites(battle?.hero);
        collectCharacterSprites(battle?.monster);
        if (Array.isArray(battle?.monsters)) {
          battle.monsters.forEach((monster) => collectCharacterSprites(monster));
        }
        collectMonsterPools(battle?.monsterSprites);
      });
    }

    if (player && typeof player === 'object') {
      collectCharacterSprites(player?.hero);
      const levelMap =
        player.battleLevel && typeof player.battleLevel === 'object'
          ? player.battleLevel
          : {};
      Object.values(levelMap).forEach((entry) => {
        if (entry && typeof entry === 'object') {
          collectCharacterSprites(entry?.hero);
          if (entry.monster) {
            collectCharacterSprites(entry.monster);
          }
          if (Array.isArray(entry.monsters)) {
            entry.monsters.forEach((monster) => collectCharacterSprites(monster));
          }
        }
      });
    }

    collectCharacterSprites(preview?.hero);
    collectCharacterSprites(preview?.monster);
    if (Array.isArray(preview?.monsters)) {
      preview.monsters.forEach((monster) => collectCharacterSprites(monster));
    }

    const mathTypeKey =
      typeof preview?.mathTypeKey === 'string'
        ? preview.mathTypeKey
        : typeof results.playerData?.currentMathType === 'string'
        ? results.playerData.currentMathType
        : typeof results.playerData?.mathType === 'string'
        ? results.playerData.mathType
        : null;
    const mathTypes =
      levelsData && typeof levelsData === 'object' && levelsData.mathTypes
        ? levelsData.mathTypes
        : null;
    if (mathTypeKey && mathTypes && typeof mathTypes === 'object') {
      const mathEntry =
        (mathTypes && typeof mathTypes[mathTypeKey] === 'object'
          ? mathTypes[mathTypeKey]
          : null) ||
        Object.values(mathTypes).find((entry) => {
          if (!entry || typeof entry !== 'object') {
            return false;
          }
          const entryKey =
            typeof entry.key === 'string'
              ? entry.key
              : typeof entry.mathType === 'string'
              ? entry.mathType
              : null;
          return entryKey === mathTypeKey;
        });
      if (mathEntry && typeof mathEntry === 'object') {
        collectMonsterPools(mathEntry.monsterSprites);
      }
    }

    const prioritizedImages = [];
    const heroSprite = sanitizeAssetPath(preview?.hero?.sprite) || preview?.hero?.sprite;
    const monsterSprite =
      sanitizeAssetPath(preview?.monster?.sprite) || preview?.monster?.sprite;

    if (heroSprite) {
      prioritizedImages.push(heroSprite);
    }
    if (monsterSprite) {
      prioritizedImages.push(monsterSprite);
    }

    const rawImagePaths = Array.from(
      new Set([...prioritizedImages.filter(Boolean), ...imageAssets])
    );
    const imagePaths = rawImagePaths
      .map((src) => sanitizeAssetPath(src) || src)
      .filter(Boolean);

    const preloadImage = (src) =>
      new Promise((resolve) => {
        if (!src) {
          resolve(false);
          return;
        }
        const image = new Image();
        image.decoding = 'async';
        const finalize = (success) => {
          if (!success) {
            console.warn(`Failed to preload image: ${src}`);
          }
          resolve(success);
        };
        image.onload = () => finalize(true);
        image.onerror = () => finalize(false);
        image.src = src;
      });

    const preloadResults = await Promise.all(imagePaths.map(preloadImage));
    const successfullyLoaded = imagePaths.filter(
      (_, index) => preloadResults[index]
    );
    storePreloadedSprites(successfullyLoaded);

    if (preview) {
      applyBattlePreview(preview, levels);
    }
  } catch (error) {
    console.error('Failed to preload landing assets.', error);
  } finally {
    await finishPreloader();
  }

  return results;
};

const initLandingInteractions = async (preloadedData = {}) => {
  markLandingVisited();
  const levelOneHeroImage = getLevelOneHeroElement();
  const standardHeroImage = getStandardHeroElement();
  const heroImages = [levelOneHeroImage, standardHeroImage].filter(Boolean);
  const monsterImage = document.querySelector('[data-monster]');
  let battleButton = getActiveBattleButton();
  const actionsElement = document.querySelector('.landing__actions');
  const heroInfoElement = document.querySelector('.landing__hero-info');
  let isLevelOneLanding = detectLevelOneLandingState();
  let fallbackPlayerData = preloadedData?.fallbackPlayerData ?? null;

  setupSettingsLogout();
  setupDevResetTool();
  setupDevPlayerDataTool();
  setupDevSignOutTool();

  updateIntroTimingForLanding({ isLevelOneLanding });

  const loadBattlePreview = async () => {
    try {
      let levelsData = preloadedData?.levelsData ?? null;
      let playerData = preloadedData?.playerData ?? null;
      if (!playerData) {
        playerData = readStoredPlayerProfile();
      }
      let previewData = preloadedData?.previewData ?? null;
      let resolvedLevels = Array.isArray(preloadedData?.levelsData?.levels)
        ? preloadedData.levelsData.levels
        : [];

      if (!levelsData) {
        const levelsRes = await fetch('data/levels.json');
        if (!levelsRes.ok) {
          throw new Error('Failed to load battle level data.');
        }
        levelsData = await levelsRes.json();
        if (!resolvedLevels.length && Array.isArray(levelsData?.levels)) {
          resolvedLevels = levelsData.levels;
        }
      }

      if (!playerData) {
        let rawPlayerData = null;
        try {
          rawPlayerData = await fetchPlayerProfile();
        } catch (error) {
          console.warn('Unable to load remote player data.', error);
          rawPlayerData = null;
        }

        if (rawPlayerData) {
          syncRemoteBattleLevel(rawPlayerData);
        }

        if (!rawPlayerData) {
          try {
            const playerRes = await fetch('data/player.json');
            if (playerRes.ok) {
              rawPlayerData = await playerRes.json();
            }
          } catch (error) {
            console.warn('Unable to load player data.', error);
          }
        }

        playerData = rawPlayerData;
      }

      if (!fallbackPlayerData) {
        try {
          const fallbackRes = await fetch('data/player.json');
          if (fallbackRes.ok) {
            fallbackPlayerData = await fallbackRes.json();
            if (preloadedData && typeof preloadedData === 'object') {
              preloadedData.fallbackPlayerData = extractPlayerData(
                fallbackPlayerData
              );
            }
          }
        } catch (error) {
          console.warn('Unable to load fallback player data.', error);
        }
      }

      if (!previewData) {
        const mergedPlayerSource = mergePlayerData(
          extractPlayerData(fallbackPlayerData),
          extractPlayerData(playerData)
        );
        const previewResult = determineBattlePreview(
          levelsData,
          Object.keys(mergedPlayerSource).length
            ? mergedPlayerSource
            : playerData
        );
        levelsData =
          levelsData && typeof levelsData === 'object'
            ? { ...levelsData, levels: previewResult.levels }
            : { levels: previewResult.levels };
        playerData = previewResult.player;
        previewData = previewResult.preview;
        resolvedLevels = previewResult.levels;

        if (preloadedData && typeof preloadedData === 'object') {
          preloadedData.levelsData = levelsData;
          preloadedData.playerData = playerData;
          preloadedData.previewData = previewData;
        }
      } else if (!resolvedLevels.length && Array.isArray(levelsData?.levels)) {
        resolvedLevels = levelsData.levels;
      }

      if (previewData) {
        applyBattlePreview(previewData, resolvedLevels);
        isLevelOneLanding = detectLevelOneLandingState();
        battleButton = getActiveBattleButton();
      }

      persistPlayerProfile(playerData);
    } catch (error) {
      console.error('Failed to load battle preview', error);
    }
  };

  await loadBattlePreview();
  isLevelOneLanding = detectLevelOneLandingState();
  battleButton = getActiveBattleButton();

  if (isLevelOneLanding) {
    if (actionsElement) {
      actionsElement.setAttribute('aria-hidden', 'true');
    }
    if (heroInfoElement) {
      heroInfoElement.setAttribute('aria-hidden', 'true');
    }
    if (battleButton) {
      setInteractiveDisabled(battleButton, true);
      battleButton.setAttribute('aria-hidden', 'true');
    }
    if (monsterImage) {
      monsterImage.setAttribute('aria-hidden', 'true');
    }
    battleButton = null;
  } else {
    if (actionsElement) {
      actionsElement.removeAttribute('aria-hidden');
    }
    if (heroInfoElement) {
      heroInfoElement.removeAttribute('aria-hidden');
    }
    if (battleButton) {
      battleButton.removeAttribute('aria-hidden');
      setInteractiveDisabled(battleButton, false);
    }
  }

  const awaitImageReady = async (image) => {
    if (!image) {
      return;
    }
    if (image.complete) {
      return;
    }
    await new Promise((resolve) => {
      const finalize = () => {
        image.removeEventListener('load', finalize);
        image.removeEventListener('error', finalize);
        resolve();
      };
      image.addEventListener('load', finalize);
      image.addEventListener('error', finalize);
    });
  };
  const waitForImages = Promise.all([
    ...heroImages.map((image) => awaitImageReady(image)),
    awaitImageReady(monsterImage),
  ]);

  let isLaunchingBattle = false;

  const beginBattle = async ({ triggerButton, showIntroImmediately } = {}) => {
    if (isLaunchingBattle) {
      return;
    }
    isLaunchingBattle = true;

    const buttonToDisable = triggerButton || battleButton;
    if (buttonToDisable) {
      setInteractiveDisabled(buttonToDisable, true);
      buttonToDisable.setAttribute('aria-busy', 'true');
    }

    await waitForImages;

    const shouldShowIntroImmediately =
      typeof showIntroImmediately === 'boolean' ? showIntroImmediately : true;

    const centerImageHoldDuration = getIntroTimingDurations().centerImageHoldDuration;

    if (
      centerImageHoldDuration > 0 &&
      !isLevelOneLanding &&
      !shouldShowIntroImmediately
    ) {
      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          Math.max(0, Number(centerImageHoldDuration) || 0)
        )
      );
    }

    try {
      await runBattleIntroSequence({
        showIntroImmediately: shouldShowIntroImmediately,
        skipHeroSidePosition: isLevelOneLanding,
        hideMonster: isLevelOneLanding,
      });
    } catch (error) {
      console.warn('Battle intro sequence failed.', error);
    } finally {
      redirectToBattle();
    }
  };

  const battleImageTriggers = !isLevelOneLanding
    ? Array.from(
        document.querySelectorAll('[data-standard-landing] [data-battle-trigger]')
      ).filter((element) => element instanceof HTMLElement)
    : [];

  if (!isLevelOneLanding) {
    battleImageTriggers.forEach((trigger) => {
      if (!trigger || trigger.dataset.battleTriggerBound === 'true') {
        return;
      }

      trigger.dataset.battleTriggerBound = 'true';

      if (!trigger.hasAttribute('role')) {
        trigger.setAttribute('role', 'button');
      }

      if (!trigger.hasAttribute('aria-label')) {
        trigger.setAttribute('aria-label', 'Start battle');
      }

      if (!trigger.hasAttribute('data-initial-tabindex')) {
        trigger.setAttribute('data-initial-tabindex', '0');
      }

      setInteractiveDisabled(trigger, false);

      attachInteractiveHandler(trigger, (event) => {
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }

        beginBattle({ triggerButton: trigger, showIntroImmediately: true });
      });
    });
  }

  if (isLevelOneLanding) {
    setupLevelOneIntro({ heroImage: levelOneHeroImage, beginBattle });
    return;
  }

  if (!battleButton) {
    if (battleImageTriggers.length) {
      return;
    }

    await waitForImages;

    const showIntroImmediately = true;

    const centerImageHoldDuration = getIntroTimingDurations().centerImageHoldDuration;

    if (centerImageHoldDuration > 0 && !showIntroImmediately) {
      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          Math.max(0, Number(centerImageHoldDuration) || 0)
        )
      );
    }

    await beginBattle({ showIntroImmediately });
    return;
  }

  attachInteractiveHandler(battleButton, (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    beginBattle({ triggerButton: battleButton, showIntroImmediately: true });
  });
};

const bootstrapLanding = async () => {
  try {
    const preloadedData = await preloadLandingAssets();
    await initLandingInteractions(preloadedData);
  } catch (error) {
    console.error('Failed to initialize the landing experience.', error);
    await finishPreloader();
    await initLandingInteractions({});
  }
};
