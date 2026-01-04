const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';

const VISITED_VALUE = 'true';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';
const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const GUEST_SESSION_ACTIVE_VALUE = 'true';
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const ACCOUNTS_STORAGE_KEY = 'mathmonstersAccounts';
const ACTIVE_ACCOUNT_STORAGE_KEY = 'mathmonstersActiveAccount';
const MIN_PRELOAD_DURATION_MS = 2000;

const DEV_RESET_TARGET_MATH_KEY = 'addition';
const DEV_RESET_TARGET_LEVEL = 2;
const DEV_RESET_BUTTON_SELECTOR = '[data-dev-reset-level]';

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
const REGISTER_PAGE_URL = 'index.html';

const progressUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersProgress) || null;

if (!progressUtils) {
  throw new Error('Progress utilities are not available.');
}

const {
  isPlainObject,
  normalizeExperienceMap,
  mergeExperienceMaps,
  readTotalExperience,
  computeExperienceTier,
  computeExperienceMilestoneProgress,
} = progressUtils;

const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

const saveStateUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersSaveState) ||
  (typeof window !== 'undefined' ? window.mathMonstersSaveState : null);

const { readSaveState, writeSaveState } = saveStateUtils || {};

const normalizeAccountEmail = (value) => {
  if (typeof playerProfileUtils?.normalizeAccountEmail === 'function') {
    return playerProfileUtils.normalizeAccountEmail(value) || '';
  }

  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return trimmed;
};

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

let cachedAuthSession = null;
let authSessionResolved = false;

const readAuthSession = async () => {
  if (authSessionResolved) {
    return cachedAuthSession;
  }

  authSessionResolved = true;
  try {
    if (typeof playerProfileUtils?.getActiveAccount === 'function') {
      cachedAuthSession = playerProfileUtils.getActiveAccount();
      return cachedAuthSession;
    }

    const storage = window.localStorage;
    if (!storage) {
      cachedAuthSession = null;
      return cachedAuthSession;
    }

    const raw = storage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    if (!raw) {
      cachedAuthSession = null;
      return cachedAuthSession;
    }

    const parsed = JSON.parse(raw);
    const email = normalizeAccountEmail(parsed?.email);
    cachedAuthSession = email ? { email } : null;
  } catch (error) {
    console.warn('Authentication session lookup failed', error);
    cachedAuthSession = null;
  }

  return cachedAuthSession;
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
  if (typeof playerProfileUtils?.clearActiveAccount === 'function') {
    playerProfileUtils.clearActiveAccount();
  } else {
    try {
      window.localStorage?.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear stored account session.', error);
    }
    try {
      window.sessionStorage?.removeItem(PLAYER_PROFILE_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear cached player profile.', error);
    }
  }

  cachedAuthSession = null;
  authSessionResolved = false;
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

const isRegistrationFlowPaused = () => {
  if (
    typeof window !== 'undefined' &&
    typeof window.mathMonstersRegistrationPaused === 'boolean'
  ) {
    return Boolean(window.mathMonstersRegistrationPaused);
  }

  return false;
};

const ensureAuthenticated = async () => {
  const registrationFlowPaused = isRegistrationFlowPaused();

  const activeAccountSession = await readAuthSession();

  let guestSessionState = readGuestSessionState();

  if (isRegistrationRequiredForGuest(guestSessionState)) {
    try {
      window.localStorage?.setItem(GUEST_SESSION_KEY, GUEST_SESSION_ACTIVE_VALUE);
    } catch (error) {
      console.warn('Unable to normalize guest registration state.', error);
    }
    guestSessionState = GUEST_SESSION_ACTIVE_VALUE;
  }

  const isGuestSessionActive = isGuestModeActive(guestSessionState);

  if (activeAccountSession?.email) {
    clearGuestMode();
  }

  if (registrationFlowPaused && (isGuestSessionActive || activeAccountSession)) {
    return true;
  }

  if (isGuestSessionActive) {
    return true;
  }

  if (activeAccountSession?.email) {
    return true;
  }

  redirectToWelcome();
  return false;
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

const setupLevelOneIntro = ({
  heroImage,
  beginBattle,
  onBeforeBattleStart,
  awaitIntroReady,
} = {}) => {
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
    if (typeof onBeforeBattleStart === 'function') {
      try {
        onBeforeBattleStart();
      } catch (error) {
        console.warn('Unable to record landing visit before battle.', error);
      }
    }

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
    if (typeof onBeforeBattleStart === 'function') {
      try {
        onBeforeBattleStart();
      } catch (error) {
        console.warn('Unable to record landing visit before battle.', error);
      }
    }
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
    if (typeof awaitIntroReady === 'function') {
      try {
        await awaitIntroReady();
      } catch (error) {
        console.warn('Level one intro ready check failed.', error);
      }
    }
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

const mergePlayerWithProgress = (rawPlayerData) => {
  const sourceData = extractPlayerData(rawPlayerData);

  const player =
    sourceData && typeof sourceData === 'object' ? { ...sourceData } : {};

  const storedProgress = readStoredProgress();
  let saveStateProgress = null;
  try {
    const saveState =
      typeof readSaveState === 'function' ? readSaveState() : null;
    if (saveState && typeof saveState === 'object') {
      const saveStateExperience = normalizeExperienceMap(
        saveState?.xpTotal ?? saveState?.experience
      );
      const saveStateExperienceTotal = readTotalExperience(saveStateExperience);
      const saveStateSpriteTier = Number(saveState?.spriteTier);
      const resolveStreakValue = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
          return null;
        }
        return Math.round(numericValue);
      };
      saveStateProgress = {
        experience: saveStateExperience,
        experienceTotal: saveStateExperienceTotal,
        experienceTier:
          Number.isFinite(saveStateSpriteTier) && saveStateSpriteTier > 0
            ? Math.max(1, Math.round(saveStateSpriteTier))
            : computeExperienceTier(saveStateExperienceTotal),
        currentLevel: normalizeCurrentLevel(saveState?.difficulty),
        gems: saveState?.gems,
        correctStreak: resolveStreakValue(saveState?.correctStreak),
        incorrectStreak: resolveStreakValue(saveState?.incorrectStreak),
      };
    }
  } catch (error) {
    console.warn('Unable to read v1 save state for progress merge.', error);
    saveStateProgress = null;
  }

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

    mergedProgress.gems = gemCount;

    const assignIfObject = (container, key) => {
      if (container && typeof container === 'object') {
        container[key] = gemCount;
      }
    };

    player.gems = gemCount;
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

  const baseGemCandidates = [
    sanitizeGemCount(player?.gems),
    sanitizeGemCount(player?.progress?.gems),
    sanitizeGemCount(sourceData?.gems),
    sanitizeGemCount(baseProgress?.gems),
    sanitizeGemCount(saveStateProgress?.gems),
  ];
  const baseGemCount = baseGemCandidates.find((value) => value !== null) ?? null;
  const baseBattleVariables =
    sourceData && typeof sourceData.battleVariables === 'object'
      ? sourceData.battleVariables
      : {};

  const existingExperience = normalizeExperienceMap(player?.progress?.experience);
  const baseExperience = normalizeExperienceMap(baseProgress?.experience);
  const storedExperience = normalizeExperienceMap(storedProgress?.experience);
  const remoteExperience = mergeExperienceMaps(baseExperience, existingExperience);
  const remoteExperienceTotal = readTotalExperience(remoteExperience);
  const storedExperienceTotal = readTotalExperience(storedExperience);
  const saveStateExperience = normalizeExperienceMap(
    saveStateProgress?.experience
  );
  const saveStateExperienceTotal = readTotalExperience(saveStateExperience);

  let combinedExperience = remoteExperience;
  let combinedExperienceTotal = remoteExperienceTotal;

  const mergeExperienceIfNewer = (candidateMap, candidateTotal) => {
    if (!candidateMap || typeof candidateMap !== 'object') {
      return;
    }
    const resolvedMap = normalizeExperienceMap(candidateMap);
    const resolvedTotal =
      Number.isFinite(candidateTotal) && candidateTotal >= 0
        ? Math.round(candidateTotal)
        : readTotalExperience(resolvedMap);
    if (resolvedTotal > combinedExperienceTotal) {
      combinedExperience = mergeExperienceMaps(combinedExperience, resolvedMap);
      combinedExperienceTotal = resolvedTotal;
    }
  };

  mergeExperienceIfNewer(storedExperience, storedExperienceTotal);
  mergeExperienceIfNewer(saveStateExperience, saveStateExperienceTotal);

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
    const storedCurrentLevel = normalizeCurrentLevel(storedProgress.currentLevel);
    const existingCurrentLevel = normalizeCurrentLevel(mergedProgress.currentLevel);
    const saveStateCurrentLevel = normalizeCurrentLevel(
      saveStateProgress?.currentLevel
    );
    const resolvedCurrentLevel = Math.max(
      Number.isFinite(existingCurrentLevel) ? existingCurrentLevel : -Infinity,
      Number.isFinite(storedCurrentLevel) ? storedCurrentLevel : -Infinity,
      Number.isFinite(saveStateCurrentLevel) ? saveStateCurrentLevel : -Infinity
    );

    if (Number.isFinite(resolvedCurrentLevel)) {
      mergedProgress.currentLevel = resolvedCurrentLevel;
    }

    if (typeof storedProgress.timeRemainingSeconds === 'number') {
      player.battleVariables.timeRemainingSeconds =
        storedProgress.timeRemainingSeconds;
    }

    Object.entries(storedProgress).forEach(([key, value]) => {
      if (
        key === 'experience' ||
        key === 'currentLevel' ||
        key === 'timeRemainingSeconds' ||
        key === 'gems' ||
        key === 'gemsAwarded' ||
        key === 'progress'
      ) {
        return;
      }

      if (isPlainObject(value)) {
        const baseEntry = isPlainObject(mergedProgress[key])
          ? mergedProgress[key]
          : {};
        mergedProgress[key] = { ...baseEntry, ...value };
      }
    });

    const storedGemTotal = sanitizeGemCount(storedProgress.gems);
    const storedGemAwarded = sanitizeGemCount(storedProgress.gemsAwarded);
    const saveStateGemTotal = sanitizeGemCount(saveStateProgress?.gems);

    let resolvedGemCount = baseGemCount;

    const applyGemTotal = (gemTotal) => {
      if (gemTotal === null) {
        return;
      }
      if (baseGemCount !== null && gemTotal < baseGemCount) {
        const combinedTotal = baseGemCount + gemTotal;
        resolvedGemCount =
          resolvedGemCount !== null
            ? Math.max(resolvedGemCount, combinedTotal)
            : combinedTotal;
        return;
      }
      resolvedGemCount =
        resolvedGemCount !== null
          ? Math.max(resolvedGemCount, gemTotal)
          : gemTotal;
    };

    applyGemTotal(storedGemTotal);
    applyGemTotal(saveStateGemTotal);

    if (storedGemAwarded !== null && storedGemTotal === null) {
      const baseForAward = baseGemCount !== null ? baseGemCount : 0;
      const awardedTotal = baseForAward + storedGemAwarded;
      resolvedGemCount =
        resolvedGemCount !== null
          ? Math.max(resolvedGemCount, awardedTotal)
          : awardedTotal;
    }

    if (resolvedGemCount !== null) {
      applyGemCountToPlayer(resolvedGemCount);
    }

    const applyStreakValue = (key, sourceValue) => {
      const numericValue = Number(sourceValue);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return;
      }
      const normalized = Math.round(numericValue);
      const existing = Number(mergedProgress[key]);
      if (!Number.isFinite(existing) || normalized >= existing) {
        mergedProgress[key] = normalized;
      }
    };

    applyStreakValue('correctStreak', storedProgress.correctStreak);
    applyStreakValue('incorrectStreak', storedProgress.incorrectStreak);
  }

  if (!Object.prototype.hasOwnProperty.call(mergedProgress, 'gems')) {
    const fallbackGemCount =
      baseGemCount ??
      sanitizeGemCount(player?.progress?.gems) ??
      sanitizeGemCount(sourceData?.gems) ??
      sanitizeGemCount(baseProgress?.gems);

    if (fallbackGemCount !== null) {
      applyGemCountToPlayer(fallbackGemCount);
    }
  }

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
  }

  if (saveStateProgress && typeof saveStateProgress === 'object') {
    const applyStreakValue = (key, sourceValue) => {
      const numericValue = Number(sourceValue);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return;
      }
      const normalized = Math.round(numericValue);
      const existing = Number(player.progress?.[key]);
      if (!Number.isFinite(existing) || normalized >= existing) {
        player.progress[key] = normalized;
      }
    };

    if (
      Number.isFinite(saveStateExperienceTotal) &&
      saveStateExperienceTotal > combinedExperienceTotal
    ) {
      player.progress.experience = normalizeExperienceMap(
        saveStateProgress.experience
      );
      if (saveStateProgress.experienceTier) {
        player.progress.experienceTier = saveStateProgress.experienceTier;
      }
    } else if (saveStateProgress.experienceTier && !player.progress.experienceTier) {
      player.progress.experienceTier = saveStateProgress.experienceTier;
    }

    const saveStateLevel = normalizeCurrentLevel(saveStateProgress.currentLevel);
    const existingLevel = normalizeCurrentLevel(player.progress.currentLevel);
    if (
      Number.isFinite(saveStateLevel) &&
      (!Number.isFinite(existingLevel) || saveStateLevel >= existingLevel)
    ) {
      player.progress.currentLevel = saveStateLevel;
    }

    applyStreakValue('correctStreak', saveStateProgress.correctStreak);
    applyStreakValue('incorrectStreak', saveStateProgress.incorrectStreak);

    const saveStateGems = sanitizeGemCount(saveStateProgress.gems);
    if (saveStateGems !== null) {
      applyGemCountToPlayer(
        player.progress?.gems !== undefined
          ? Math.max(player.progress.gems, saveStateGems)
          : saveStateGems
      );
    }
  }

  return player;
};

const readPlayerGemCount = (player) => {
  if (!player || typeof player !== 'object') {
    return 0;
  }

  const sanitizeGemCount = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }
    return Math.max(0, Math.round(numericValue));
  };

  const candidateValues = [
    player.gems,
    player?.currency?.gems,
    player?.currencies?.gems,
    player?.wallet?.gems,
    player?.inventory?.gems,
    player?.progress?.gems,
  ];

  const sanitizedCandidates = candidateValues
    .map((value) => sanitizeGemCount(value))
    .filter((value) => value !== null);

  let resolvedGemCount =
    sanitizedCandidates.length > 0
      ? Math.max(...sanitizedCandidates)
      : null;

  if (resolvedGemCount === null) {
    const awardCandidates = [
      sanitizeGemCount(player?.gemsAwarded),
      sanitizeGemCount(player?.progress?.gemsAwarded),
    ].filter((value) => value !== null);

    if (awardCandidates.length > 0) {
      resolvedGemCount = Math.max(...awardCandidates);
    }
  }

  return resolvedGemCount ?? 0;
};

const readPlayerExperienceTotal = (player) => {
  if (!player || typeof player !== 'object') {
    return 0;
  }

  const normalizeExperienceTotal = (candidate) => {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const normalized = normalizeExperienceMap(candidate);
      return readTotalExperience(normalized);
    }

    const numeric = Number(candidate);
    return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  };

  const experienceCandidates = [
    normalizeExperienceTotal(player?.progress?.experience),
    normalizeExperienceTotal(player?.progress?.experienceTotal),
    normalizeExperienceTotal(player?.experience),
    normalizeExperienceTotal(player?.experienceTotal),
    normalizeExperienceTotal(player?.xpTotal),
  ].filter((value) => Number.isFinite(value));

  if (!experienceCandidates.length) {
    return 0;
  }

  return Math.max(...experienceCandidates);
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
      normalizeCurrentLevel(level?.currentLevel) ??
      normalizeCurrentLevel(level?.level) ??
      normalizeCurrentLevel(index + 1);

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

  const levelNumber = normalizeCurrentLevel(level?.currentLevel ?? level?.level);
  if (!Number.isFinite(levelNumber) || !Array.isArray(levelsList)) {
    return 1;
  }

  const matchedLevel = levelsList.find((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const entryLevel = normalizeCurrentLevel(entry?.currentLevel ?? entry?.level);
    return Number.isFinite(entryLevel) && entryLevel === levelNumber;
  });

  count = extractCount(matchedLevel);
  return count > 0 ? count : 1;
};

const resolveProgressLevel = (progress) => {
  if (!progress || typeof progress !== 'object') {
    return null;
  }

  return (
    normalizeCurrentLevel(progress.currentLevel) ??
    normalizeCurrentLevel(progress.level)
  );
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

  const progressLevel = resolveProgressLevel(player?.progress);
  const activeLevel = (() => {
    if (progressLevel !== null) {
      const match = levels.find(
        (level) => normalizeCurrentLevel(level?.currentLevel) === progressLevel
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
    const map = player.currentLevel;
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
    ...(resolvePlayerLevelData(activeLevel?.currentLevel)?.hero ?? {}),
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

  const difficultyValue = (() => {
    const candidates = [
      preloadedData?.difficultyState?.difficulty,
      player?.progress?.currentLevel,
      activeLevel?.currentLevel,
      1,
    ];
    const numericCandidate = candidates
      .map((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .find((value) => value !== null);
    const numeric = Number.isFinite(numericCandidate) ? numericCandidate : 1;
    return Math.min(5, Math.max(1, Math.round(numeric)));
  })();

  const levelName = typeof activeLevel?.name === 'string' ? activeLevel.name.trim() : '';
  const battleTitleLabel =
    levelName ||
    (typeof activeLevel?.currentLevel === 'number'
      ? `Battle ${activeLevel.currentLevel}`
      : 'Upcoming Battle');
  const totalExperience = readPlayerExperienceTotal(player);
  const experienceTier = computeExperienceTier(totalExperience);
  const milestoneProgress = computeExperienceMilestoneProgress(totalExperience);
  const heroLevelLabel = `Level ${experienceTier}`;
  const progressText = milestoneProgress.text;
  const playerGems = readPlayerGemCount(player);

  const { key: mathProgressKey, entry: mathProgressEntry } = findMathProgressEntry(
    player?.progress,
    mathTypeKey
  );

  return {
    levels,
    player,
    preview: {
      activeLevel,
      currentLevel: difficultyValue,
      mathLabel,
      battleTitleLabel,
      hero: { ...heroData, sprite: heroSprite },
      heroAlt,
      heroLevelLabel,
      monster: { ...monsterData, sprite: monsterSprite },
      monsterAlt,
      mathTypeKey: typeof mathTypeKey === 'string' ? mathTypeKey : mathProgressKey,
      progressMathKey: mathProgressKey,
      progressExperience: milestoneProgress.ratio,
      progressExperienceEarned: milestoneProgress.earned,
      progressExperienceTotal: milestoneProgress.total,
      progressExperienceText: progressText,
      playerGems,
    },
  };
};

const coercePlayerProgressToLevelOne = (playerData) => {
  const player =
    playerData && typeof playerData === 'object' && !Array.isArray(playerData)
      ? { ...playerData }
      : {};

  const normalizedProgress =
    player.progress && typeof player.progress === 'object'
      ? { ...player.progress }
      : {};

  normalizedProgress.currentLevel = 1;
  normalizedProgress.level = 1;
  normalizedProgress.battleLevel = 1;
  player.progress = normalizedProgress;

  if (typeof player.level === 'number') {
    player.level = 1;
  }

  const progressMap =
    player.currentLevel && typeof player.currentLevel === 'object'
      ? { ...player.currentLevel }
      : null;

  if (progressMap) {
    Object.keys(progressMap).forEach((key) => {
      const entry = progressMap[key];
      if (entry && typeof entry === 'object') {
        progressMap[key] = {
          ...entry,
          currentLevel: 1,
          level: 1,
        };
      }
    });
    player.currentLevel = progressMap;
  }

  return player;
};

const enforceLevelOnePreview = (previewData, levels = []) => {
  const normalizedPreview =
    previewData && typeof previewData === 'object' && !Array.isArray(previewData)
      ? { ...previewData }
      : {};

  normalizedPreview.currentLevel = 1;

  const resolveLevelSource = () => {
    if (normalizedPreview.activeLevel && typeof normalizedPreview.activeLevel === 'object') {
      return normalizedPreview.activeLevel;
    }

    if (Array.isArray(levels)) {
      const levelOneMatch = levels.find(
        (level) => normalizeCurrentLevel(level?.currentLevel) === 1
      );
      if (levelOneMatch && typeof levelOneMatch === 'object') {
        return levelOneMatch;
      }
      const firstLevel = levels.find((level) => level && typeof level === 'object');
      if (firstLevel) {
        return firstLevel;
      }
    }

    return null;
  };

  const levelSource = resolveLevelSource();
  if (levelSource) {
    normalizedPreview.activeLevel = {
      ...levelSource,
      currentLevel: 1,
      level: 1,
    };
  }

  return normalizedPreview;
};

const normalizeBattleIndex = (value) => {
  const normalized = normalizeCurrentLevel(value);
  if (typeof normalized !== 'number' || !Number.isFinite(normalized)) {
    return null;
  }

  const rounded = Math.round(normalized);
  return rounded > 0 ? rounded : null;
};

const resolveIsLevelOneLanding = ({
  requiresLevelOneIntro,
  forceLevelOneLanding,
  hasIntroProgress,
  resolvedCurrentLevel,
} = {}) => {
  if (requiresLevelOneIntro || forceLevelOneLanding) {
    return true;
  }

  if (hasIntroProgress) {
    return false;
  }

  const normalizedLevel = normalizeBattleIndex(resolvedCurrentLevel);
  if (normalizedLevel !== null) {
    return normalizedLevel <= 1;
  }

  return !hasIntroProgress;
};

const HOME_ACTION_GLOW_CLASSES = [
  'home__action--glow',
  'home__action--glow-sword',
  'home__action--glow-shop',
];

const updateHomeTutorialHighlights = ({ currentLevel } = {}) => {
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
    element.removeAttribute('aria-hidden');
    element.classList.remove('pulsating-glow');
    HOME_ACTION_GLOW_CLASSES.forEach((className) => {
      element.classList.remove(className);
    });
  };

  actionElements.forEach((element) => resetActionState(element));

  const landingRoot = document.body;
  const isStandardLanding = Boolean(
    landingRoot?.classList?.contains('is-standard-landing')
  );

  if (!isStandardLanding) {
    return;
  }

  const resolvedLevel = normalizeBattleIndex(currentLevel);

  if (resolvedLevel === 3) {
    if (shopAction) {
      shopAction.hidden = false;
      shopAction.removeAttribute('aria-hidden');
      shopAction.classList.add('home__action--glow', 'home__action--glow-shop');
    }

    return;
  }
};

const applyBattlePreview = (
  previewData = {},
  levels = [],
  {
    requiresLevelOneIntro = false,
    forceLevelOneLanding = false,
    hasIntroProgress = false,
  } = {}
) => {
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
  const homeExperienceContainer = document.querySelector(
    '[data-standard-landing] [data-home-experience]'
  );
  const homeExperienceProgress = document.querySelector(
    '[data-standard-landing] [data-home-xp-progress]'
  );
  const homeExperienceProgressFill =
    homeExperienceProgress?.querySelector('.progress__fill') ?? null;
  const homeExperienceCount = document.querySelector(
    '[data-standard-landing] [data-home-xp-count]'
  );
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
    return 'Difficulty';
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

  const updateHomeExperienceProgress = () => {
    if (
      !homeExperienceContainer &&
      !homeExperienceProgress &&
      !homeExperienceProgressFill &&
      !homeExperienceCount
    ) {
      return;
    }

    const totalFallback = 10;
    const rawEarned = Number(previewData?.progressExperienceEarned);
    const rawTotal = Number(previewData?.progressExperienceTotal);
    const hasEarned = Number.isFinite(rawEarned);
    const hasTotal = Number.isFinite(rawTotal) && rawTotal > 0;
    const displayTotal = hasTotal ? Math.max(1, Math.round(rawTotal)) : totalFallback;
    const displayEarned = hasEarned ? Math.max(0, Math.round(rawEarned)) : 0;
    const normalizedEarned = Math.min(displayEarned, displayTotal);
    const ratio = displayTotal > 0 ? Math.min(1, normalizedEarned / displayTotal) : 0;
    const ariaText = `${normalizedEarned} of ${displayTotal} experience`;

    if (homeExperienceContainer) {
      homeExperienceContainer.hidden = false;
      homeExperienceContainer.removeAttribute('aria-hidden');
    }

    if (homeExperienceCount) {
      homeExperienceCount.textContent = `${normalizedEarned}/${displayTotal}`;
    }

    if (homeExperienceProgress) {
      homeExperienceProgress.setAttribute('aria-valuemin', '0');
      homeExperienceProgress.setAttribute('aria-valuemax', `${displayTotal}`);
      homeExperienceProgress.setAttribute('aria-valuenow', `${normalizedEarned}`);
      homeExperienceProgress.setAttribute('aria-valuetext', ariaText);
      homeExperienceProgress.style.setProperty('--progress-value', `${ratio}`);
    }

    if (homeExperienceProgressFill) {
      homeExperienceProgressFill.style.width = `${ratio * 100}%`;
    }
  };

  progressElements.forEach((progressElement) => {
    if (!progressElement) {
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
  updateHomeExperienceProgress();

  const resolvedCurrentLevel = (() => {
    const fromPreview = normalizeCurrentLevel(previewData?.currentLevel);
    if (fromPreview !== null) {
      return fromPreview;
    }

    const fromActiveLevel = normalizeCurrentLevel(previewData?.activeLevel?.currentLevel);
    if (fromActiveLevel !== null) {
      return fromActiveLevel;
    }

    if (Array.isArray(levels)) {
      for (const level of levels) {
        const candidate = normalizeCurrentLevel(level?.currentLevel);
        if (candidate !== null) {
          return candidate;
        }
      }
    }

    return null;
  })();

  const isLevelOneLanding = resolveIsLevelOneLanding({
    requiresLevelOneIntro,
    forceLevelOneLanding,
    hasIntroProgress,
    resolvedCurrentLevel,
  });

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
    currentLevel: resolvedCurrentLevel,
  });

  updateHeroFloat();
  updateIntroTimingForLanding({ isLevelOneLanding });

  return { isLevelOneLanding, resolvedCurrentLevel };
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
  if (typeof readSaveState !== 'function') {
    return null;
  }

  try {
    const saveState = readSaveState();
    const experienceMap = normalizeExperienceMap(saveState?.xpTotal ?? {});
    const totalExperience = readTotalExperience(experienceMap);
    const spriteTier = Number.isFinite(saveState?.spriteTier)
      ? Math.max(1, Math.round(saveState.spriteTier))
      : computeExperienceTier(totalExperience);
    const difficultyLevel = normalizeCurrentLevel(saveState?.difficulty);

    const progress = {};
    if (Number.isFinite(difficultyLevel)) {
      progress.currentLevel = Math.max(1, Math.round(difficultyLevel));
    }
    if (Object.keys(experienceMap).length > 0) {
      progress.experience = { total: totalExperience };
      progress.experienceTier = spriteTier;
    }

    return Object.keys(progress).length > 0 ? progress : null;
  } catch (error) {
    console.warn('Stored progress unavailable.', error);
    return null;
  }
};

const storeProgressAndReload = (progress, triggerElement) => {
  try {
    const existingSave =
      typeof readSaveState === 'function' ? readSaveState() : {};
    const experienceSource =
      progress?.experience ?? progress?.progress?.experience ?? null;
    const experience = normalizeExperienceMap(experienceSource);
    const experienceTotal = readTotalExperience(experience);
    const resolvedExperienceTotal =
      experienceTotal ||
      (Number.isFinite(existingSave?.xpTotal) ? existingSave.xpTotal : 0);
    const normalizedLevel = normalizeCurrentLevel(
      progress?.currentLevel ?? progress?.level
    );

    if (typeof writeSaveState === 'function') {
      writeSaveState({
        xpTotal: resolvedExperienceTotal,
        spriteTier: computeExperienceTier(resolvedExperienceTotal),
        difficulty:
          Number.isFinite(normalizedLevel) && normalizedLevel > 0
            ? Math.round(normalizedLevel)
            : existingSave?.difficulty,
      });
    }
  } catch (error) {
    console.warn('Unable to store progress update.', error);
    return false;
  }

  try {
    window.sessionStorage?.removeItem(PLAYER_PROFILE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear stored player profile for update.', error);
  }

  try {
    window.sessionStorage?.removeItem(NEXT_BATTLE_SNAPSHOT_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear stored battle snapshot for update.', error);
  }

  if (triggerElement && typeof triggerElement.blur === 'function') {
    triggerElement.blur();
  }

  if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
    window.location.reload();
  }

  return true;
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
      currentLevel: DEV_RESET_TARGET_LEVEL,
    };

    const updatedProgress = {
      ...normalizedProgress,
      currentLevel: DEV_RESET_TARGET_LEVEL,
      [mathKey]: updatedMathProgress,
    };

    const success = storeProgressAndReload(updatedProgress, devButton);
    if (!success) {
      return;
    }
  };

  if (devButton.dataset.devResetBound === 'true') {
    return;
  }

  devButton.dataset.devResetBound = 'true';
  devButton.addEventListener('click', handleReset);
};

const readStoredPlayerProfile = () => {
  if (typeof playerProfileUtils?.readCachedProfile === 'function') {
    try {
      const cached = playerProfileUtils.readCachedProfile();
      if (cached && typeof cached === 'object') {
        return cached;
      }
    } catch (error) {
      console.warn('Stored player profile unavailable.', error);
    }
  }

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

const persistPlayerProfile = (player, options = {}) => {
  const progressData =
    (options && isPlainObject(options.progress) ? options.progress : null) ||
    (player && typeof player === 'object' && isPlainObject(player.progress)
      ? player.progress
      : null);

  const persistFn = playerProfileUtils?.persistPlayerProfile;
  if (typeof persistFn === 'function') {
    try {
      const persistResult = persistFn(player, progressData);
      if (persistResult && typeof persistResult.then === 'function') {
        persistResult.catch((error) => {
          console.warn('Unable to persist player profile.', error);
        });
      }
      return;
    } catch (error) {
      console.warn('Unable to persist player profile.', error);
    }
  }

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

    const payload =
      typeof progressData === 'object' && progressData !== null
        ? { ...player, progress: progressData }
        : player;

    const serialized = JSON.stringify(payload);
    storage.setItem(PLAYER_PROFILE_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Unable to persist player profile.', error);
  }
};

const collectDevOverlayPlayerData = () => {
  const preloaded =
    typeof window !== 'undefined' && window.preloadedData &&
    typeof window.preloadedData === 'object'
      ? window.preloadedData
      : {};

  const player =
    preloaded && typeof preloaded.player === 'object' && preloaded.player !== null
      ? preloaded.player
      : null;

  const progress =
    preloaded && typeof preloaded.progress === 'object' && preloaded.progress !== null
      ? preloaded.progress
      : player && typeof player.progress === 'object' && player.progress !== null
      ? player.progress
      : null;

  const battleVariables =
    player && typeof player.battleVariables === 'object' && player.battleVariables !== null
      ? player.battleVariables
      : preloaded &&
        typeof preloaded.battleVariables === 'object' &&
        preloaded.battleVariables !== null
      ? preloaded.battleVariables
      : null;

  let storedProfile = null;
  try {
    storedProfile = readStoredPlayerProfile();
  } catch (error) {
    storedProfile = null;
  }

  const battleSnapshot =
    typeof window !== 'undefined' &&
    window.mathMonstersBattleSnapshot &&
    typeof window.mathMonstersBattleSnapshot === 'object'
      ? window.mathMonstersBattleSnapshot
      : null;

  return {
    timestamp: new Date().toISOString(),
    preloadedData: preloaded,
    player,
    progress,
    battleVariables,
    playerData:
      preloaded && typeof preloaded.playerData === 'object'
        ? preloaded.playerData
        : preloaded?.playerData ?? null,
    previewData:
      preloaded && typeof preloaded.previewData === 'object'
        ? preloaded.previewData
        : preloaded?.previewData ?? null,
    storedProfile,
    battleSnapshot,
  };
};

const setupDevOverlay = () => {
  const trigger = document.querySelector('[data-dev-overlay-trigger]');
  const overlay = document.querySelector('[data-dev-overlay]');
  if (!trigger || !overlay || overlay.dataset.devOverlayInitialized === 'true') {
    return;
  }

  overlay.dataset.devOverlayInitialized = 'true';
  const closeButton = overlay.querySelector('[data-dev-overlay-close]');
  const backdrop = overlay.querySelector('[data-dev-overlay-backdrop]');
  const content = overlay.querySelector('[data-dev-overlay-body]');
  const panel = overlay.querySelector('[data-dev-overlay-panel]');
  const levelSelect = overlay.querySelector('[data-dev-level-select]');
  const applyButton = overlay.querySelector('[data-dev-level-apply]');
  const feedback = overlay.querySelector('[data-dev-level-feedback]');

  const MIN_DEV_LEVEL = 1;
  const MAX_DEV_LEVEL = 5;

  const isValidDevLevel = (value) =>
    Number.isInteger(value) && value >= MIN_DEV_LEVEL && value <= MAX_DEV_LEVEL;

  const setFeedback = (message, state = 'info') => {
    if (!feedback) {
      return;
    }

    if (!message) {
      feedback.textContent = '';
      delete feedback.dataset.state;
      return;
    }

    feedback.textContent = message;
    feedback.dataset.state = state;
  };

  const resolveStoredLevel = () => {
    const stored = readStoredProgress();
    const storedLevel = Number(stored?.currentLevel);
    return isValidDevLevel(storedLevel) ? storedLevel : null;
  };

  const formatForDisplay = (value) => {
    const seen = new WeakSet();
    return JSON.stringify(
      value,
      (key, current) => {
        if (typeof current === 'bigint') {
          return current.toString();
        }

        if (current instanceof Map) {
          return Object.fromEntries(current.entries());
        }

        if (current instanceof Set) {
          return Array.from(current.values());
        }

        if (typeof current === 'object' && current !== null) {
          if (seen.has(current)) {
            return '[Circular]';
          }
          seen.add(current);
        }

        return current;
      },
      2
    );
  };

  const refreshLevelSelect = (payload) => {
    if (!levelSelect) {
      return;
    }

    if (document.activeElement === levelSelect) {
      return;
    }

    const payloadLevel = Number(payload?.progress?.currentLevel);
    let resolvedLevel = isValidDevLevel(payloadLevel) ? payloadLevel : null;

    if (resolvedLevel === null) {
      resolvedLevel = resolveStoredLevel();
    }

    if (resolvedLevel === null) {
      return;
    }

    levelSelect.value = String(resolvedLevel);
  };

  const updateContent = () => {
    if (!content) {
      return;
    }

    try {
      const payload = collectDevOverlayPlayerData();
      content.textContent = formatForDisplay(payload);
      refreshLevelSelect(payload);
    } catch (error) {
      console.warn('Unable to format player data for developer overlay.', error);
      content.textContent = 'Unable to load player data.';
    }
  };

  const resolveActiveMathKey = (progress) => {
    const storedMathType =
      typeof progress?.currentMathType === 'string'
        ? progress.currentMathType.trim()
        : '';

    if (storedMathType) {
      return storedMathType;
    }

    let overlayData = null;
    try {
      overlayData = collectDevOverlayPlayerData();
    } catch (error) {
      overlayData = null;
    }

    const overlayProgressMath =
      typeof overlayData?.progress?.currentMathType === 'string'
        ? overlayData.progress.currentMathType.trim()
        : '';

    if (overlayProgressMath) {
      return overlayProgressMath;
    }

    const overlayPlayerMath =
      typeof overlayData?.player?.currentMathType === 'string'
        ? overlayData.player.currentMathType.trim()
        : '';

    if (overlayPlayerMath) {
      return overlayPlayerMath;
    }

    return DEV_RESET_TARGET_MATH_KEY;
  };

  const applyDevLevelChange = (levelValue) => {
    if (!applyButton) {
      return false;
    }

    setFeedback('');

    const numericLevel = Number(levelValue);
    if (!isValidDevLevel(numericLevel)) {
      setFeedback(
        `Select a level between ${MIN_DEV_LEVEL} and ${MAX_DEV_LEVEL}.`,
        'error'
      );
      return false;
    }

    try {
      const storedProgress = readStoredProgress();
      const normalizedProgress = isPlainObject(storedProgress)
        ? { ...storedProgress }
        : {};

      const mathKey = resolveActiveMathKey(normalizedProgress) || DEV_RESET_TARGET_MATH_KEY;
      const existingMathProgress = isPlainObject(normalizedProgress[mathKey])
        ? { ...normalizedProgress[mathKey] }
        : {};

      const updatedMathProgress = {
        ...existingMathProgress,
        currentLevel: numericLevel,
      };

      const updatedProgress = {
        ...normalizedProgress,
        currentLevel: numericLevel,
        battleLevel: numericLevel,
        [mathKey]: updatedMathProgress,
      };

      const success = storeProgressAndReload(updatedProgress, applyButton);
      if (!success) {
        setFeedback('Unable to apply level change. Please try again.', 'error');
        return false;
      }

      if (levelSelect) {
        levelSelect.value = String(numericLevel);
      }

      setFeedback('Level updated. Reloading…', 'success');
      updateContent();
      return true;
    } catch (error) {
      console.warn('Unable to apply developer level change.', error);
      setFeedback('Unable to apply level change. Please try again.', 'error');
      return false;
    }
  };

  let isVisible = false;

  const hideOverlay = () => {
    if (!isVisible) {
      return;
    }

    isVisible = false;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.removeAttribute('data-visible');
    trigger.setAttribute('aria-expanded', 'false');

    if (typeof trigger.focus === 'function') {
      try {
        trigger.focus({ preventScroll: true });
      } catch (error) {
        trigger.focus();
      }
    }
  };

  const showOverlay = () => {
    setFeedback('');
    updateContent();
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('data-visible', 'true');
    trigger.setAttribute('aria-expanded', 'true');
    isVisible = true;

    if (panel && typeof panel.focus === 'function') {
      try {
        panel.focus({ preventScroll: true });
      } catch (error) {
        panel.focus();
      }
    }
  };

  const toggleOverlay = () => {
    if (isVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
  };

  trigger.addEventListener('click', (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    toggleOverlay();
  });

  const closeTargets = [closeButton, backdrop];
  closeTargets.forEach((element) => {
    if (!element) {
      return;
    }
    element.addEventListener('click', (event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      hideOverlay();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isVisible) {
      hideOverlay();
    }
  });

  document.addEventListener('data-loaded', () => {
    if (isVisible) {
      updateContent();
    }
  });

  if (levelSelect) {
    levelSelect.addEventListener('change', () => setFeedback(''));
    levelSelect.addEventListener('input', () => setFeedback(''));
  }

  if (applyButton && levelSelect) {
    applyButton.addEventListener('click', (event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      applyDevLevelChange(levelSelect.value);
    });
  }
};

const initializeDevOverlay = () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDevOverlay, { once: true });
  } else {
    setupDevOverlay();
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

const clearLandingVisitedFlag = () => {
  try {
    sessionStorage?.removeItem(LANDING_VISITED_KEY);
  } catch (error) {
    console.warn('Unable to clear session landing visit flag.', error);
  }

  try {
    localStorage?.removeItem(LANDING_VISITED_KEY);
  } catch (error) {
    console.warn('Unable to clear local landing visit flag.', error);
  }
};

const resolveStoredExperienceTotal = () => {
  if (typeof readSaveState !== 'function') {
    return 0;
  }

  try {
    const saveState = readSaveState();
    const experienceTotal = saveState?.xpTotal;
    if (experienceTotal && typeof experienceTotal === 'object') {
      const experienceMap = normalizeExperienceMap(experienceTotal);
      return readTotalExperience(experienceMap);
    }
    const xpTotal = Number(experienceTotal);
    return Number.isFinite(xpTotal) ? Math.max(0, Math.round(xpTotal)) : 0;
  } catch (error) {
    console.warn('Unable to read intro progress.', error);
    return 0;
  }
};

const hasIntroProgress = () => resolveStoredExperienceTotal() > 0;

const hasVisitedLanding = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  const readVisitedFlag = (storage) => {
    if (!storage) {
      return false;
    }
    try {
      return storage.getItem(LANDING_VISITED_KEY) === VISITED_VALUE;
    } catch (error) {
      console.warn('Unable to read landing visit flag.', error);
      return false;
    }
  };

  return readVisitedFlag(window.sessionStorage) || readVisitedFlag(window.localStorage);
};

const resetLandingSaveState = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const saveStateStorageKey =
    (saveStateUtils && typeof saveStateUtils.STORAGE_KEY === 'string'
      ? saveStateUtils.STORAGE_KEY
      : 'mathMonstersSave_v1');

  try {
    window.localStorage?.removeItem(saveStateStorageKey);
  } catch (error) {
    console.warn('Unable to clear saved progress state.', error);
  }

  try {
    window.localStorage?.removeItem('mathmonstersProgress');
    window.localStorage?.removeItem('mathmonstersHomeProgressState');
  } catch (error) {
    console.warn('Unable to clear legacy local storage state.', error);
  }

  try {
    window.sessionStorage?.removeItem('mathmonstersHomeProgressState');
    window.sessionStorage?.removeItem('mathmonstersDifficultyState');
  } catch (error) {
    console.warn('Unable to clear legacy session storage state.', error);
  }

  try {
    window.sessionStorage?.removeItem(NEXT_BATTLE_SNAPSHOT_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear stored battle snapshot.', error);
  }

  try {
    window.sessionStorage?.removeItem(PLAYER_PROFILE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear stored player profile.', error);
  }

  try {
    window.sessionStorage?.removeItem(PRELOADED_SPRITES_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear preloaded sprite cache.', error);
  }
};

const setPreloaderPaused = (paused) => {
  if (!preloaderElement) {
    return;
  }

  if (paused) {
    preloaderElement.setAttribute('data-paused', 'true');
    preloaderElement.setAttribute('aria-hidden', 'true');
    return;
  }

  preloaderElement.removeAttribute('data-paused');
  preloaderElement.removeAttribute('aria-hidden');
  preloaderElement.removeAttribute('hidden');
  preloaderElement.classList.remove('preloader--hidden');
};

const SCENARIO_SAVE_STATES = {
  'new-user': { xpTotal: 0, difficulty: 1 },
  'level-1-xp-3': { xpTotal: 3, difficulty: 1 },
  'level-2-xp-15': { xpTotal: 15, difficulty: 2 },
};

const applyScenarioSaveState = (scenarioId) => {
  if (!scenarioId || scenarioId === 'skip') {
    return { scenarioId: 'skip' };
  }

  const targetState = SCENARIO_SAVE_STATES[scenarioId];
  if (!targetState) {
    return { scenarioId: 'skip' };
  }

  try {
    clearLandingVisitedFlag();
    resetLandingSaveState();
  } catch (error) {
    console.warn('Unable to fully clear landing state for scenario selection.', error);
  }

  if (typeof writeSaveState !== 'function') {
    return { scenarioId: 'skip' };
  }

  const xpTotal = Math.max(0, Number(targetState.xpTotal) || 0);
  const normalizedLevel =
    normalizeCurrentLevel(targetState.difficulty ?? targetState.currentLevel) || 1;
  const spriteTier = computeExperienceTier(xpTotal);

  try {
    writeSaveState({
      xpTotal,
      difficulty: normalizedLevel,
      spriteTier,
      lastSeenDifficulty: normalizedLevel,
      lastSeenSpriteTier: spriteTier,
      correctStreak: 0,
      incorrectStreak: 0,
      gems: 0,
    });
  } catch (error) {
    console.warn('Unable to apply scenario save state.', error);
  }

  return { scenarioId, xpTotal, difficulty: normalizedLevel, spriteTier };
};

const setupScenarioLauncher = () => {
  const launcher = document.querySelector('[data-scenario-launcher]');
  const closeButton = launcher?.querySelector('[data-scenario-close]');
  const buttons = launcher
    ? Array.from(launcher.querySelectorAll('[data-scenario-option]'))
    : [];

  if (!launcher || !buttons.length) {
    setPreloaderPaused(false);
    return Promise.resolve({ scenarioId: 'skip' });
  }

  setPreloaderPaused(false);
  launcher.removeAttribute('hidden');
  launcher.setAttribute('aria-hidden', 'false');

  let resolved = false;

  const resolveSelection = (result, resolve) => {
    if (resolved) {
      return;
    }
    resolved = true;
    setPreloaderPaused(false);
    launcher.setAttribute('hidden', 'true');
    launcher.setAttribute('aria-hidden', 'true');
    resolve(result);
  };

  return new Promise((resolve) => {
    const finishSelection = (scenarioId, event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      if (resolved) {
        return;
      }

      buttons.forEach((button) => setInteractiveDisabled(button, true));
      if (closeButton) {
        setInteractiveDisabled(closeButton, true);
      }
      let appliedState = { scenarioId };
      try {
        appliedState = applyScenarioSaveState(scenarioId);
      } catch (error) {
        console.warn('Unable to apply selected scenario.', error);
      }
      resolveSelection(appliedState, resolve);
    };

    buttons.forEach((button) => {
      const scenarioId = button?.dataset?.scenarioOption;
      if (!scenarioId) {
        return;
      }

      setInteractiveDisabled(button, false);
      button.addEventListener('click', (event) => finishSelection(scenarioId, event));
    });

    if (closeButton) {
      setInteractiveDisabled(closeButton, false);
      closeButton.addEventListener('click', (event) => finishSelection('skip', event));
    }
  });
};

const resolveLandingEntryState = async () => {
  let landingVisited = hasVisitedLanding();
  const storedExperienceTotal = resolveStoredExperienceTotal();
  const hasIntroProgressFlag = storedExperienceTotal > 0;
  const guestSessionState = readGuestSessionState();
  const hasGuestSession =
    isGuestModeActive(guestSessionState) ||
    isRegistrationRequiredForGuest(guestSessionState);

  let hasAccountSession = false;
  try {
    const accountSession = await readAuthSession();
    hasAccountSession = Boolean(
      accountSession && (accountSession.email || accountSession)
    );
  } catch (error) {
    console.warn('Unable to determine authentication session state.', error);
    hasAccountSession = false;
  }

  const hasUserSession = hasAccountSession || hasGuestSession;

  if (!hasIntroProgressFlag && landingVisited) {
    clearLandingVisitedFlag();
    landingVisited = false;
  }

  if (!landingVisited && hasIntroProgressFlag) {
    markLandingVisited();
    landingVisited = true;
  }

  if (!landingVisited && !hasUserSession && !hasIntroProgressFlag) {
    resetLandingSaveState();
  }

  const requiresLevelOneIntro = !hasIntroProgressFlag;

  return {
    landingVisited,
    hasUserSession,
    hasIntroProgress: hasIntroProgressFlag,
    requiresLevelOneIntro,
    experienceTotal: storedExperienceTotal,
  };
};

const preloadLandingAssets = async (landingEntryState = {}) => {
  let landingVisited =
    typeof landingEntryState?.landingVisited === 'boolean'
      ? landingEntryState.landingVisited
      : hasVisitedLanding();
  const storedExperienceTotal = Number(landingEntryState?.experienceTotal);
  const resolvedExperienceTotal = Number.isFinite(storedExperienceTotal)
    ? storedExperienceTotal
    : resolveStoredExperienceTotal();
  let hasIntroProgressFlag =
    typeof landingEntryState?.hasIntroProgress === 'boolean'
      ? landingEntryState.hasIntroProgress
      : resolvedExperienceTotal > 0;
  let requiresLevelOneIntro =
    typeof landingEntryState?.requiresLevelOneIntro === 'boolean'
      ? landingEntryState.requiresLevelOneIntro
      : resolvedExperienceTotal <= 0;

  if (requiresLevelOneIntro && landingVisited) {
    clearLandingVisitedFlag();
    landingVisited = false;
  }

  let forceLevelOneLanding = requiresLevelOneIntro || (!landingVisited && !hasIntroProgressFlag);
  const hasUserSession = Boolean(landingEntryState?.hasUserSession);

  const results = {
    levelsData: null,
    playerData: null,
    previewData: null,
    landingVisited: forceLevelOneLanding ? false : landingVisited,
    forceLevelOneLanding,
    hasUserSession,
    hasIntroProgress: hasIntroProgressFlag,
    requiresLevelOneIntro,
    experienceTotal: resolvedExperienceTotal,
  };
  const imageAssets = new Set([
    '../images/background/background.png',
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

    const playerInput = chosenPlayerData;

    const { levels, player, preview } = determineBattlePreview(levelsData, playerInput);

    const playerExperienceTotal = readPlayerExperienceTotal(player);

    results.experienceTotal = Number.isFinite(playerExperienceTotal)
      ? playerExperienceTotal
      : results.experienceTotal;

    if (Number.isFinite(playerExperienceTotal) && playerExperienceTotal <= 0) {
      requiresLevelOneIntro = true;
      forceLevelOneLanding = true;
      hasIntroProgressFlag = false;
      landingVisited = false;
      clearLandingVisitedFlag();
    } else if (Number.isFinite(playerExperienceTotal) && playerExperienceTotal > 0) {
      requiresLevelOneIntro = false;
      hasIntroProgressFlag = true;
      if (!landingVisited) {
        markLandingVisited();
        landingVisited = true;
      }
      forceLevelOneLanding = false;
    }

    const normalizedPlayer = forceLevelOneLanding
      ? coercePlayerProgressToLevelOne(player)
      : player;

    const normalizedPreview = forceLevelOneLanding
      ? enforceLevelOnePreview(preview, levels)
      : preview;

    results.requiresLevelOneIntro = requiresLevelOneIntro;
    results.hasIntroProgress = hasIntroProgressFlag;
    results.landingVisited = landingVisited;
    results.forceLevelOneLanding = forceLevelOneLanding;

    results.levelsData =
      levelsData && typeof levelsData === 'object'
        ? { ...levelsData, levels }
        : { levels };
    results.playerData = normalizedPlayer;
    results.previewData = normalizedPreview;
    results.fallbackPlayerData = fallbackPlayer;

    persistPlayerProfile(normalizedPlayer);

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
        player.currentLevel && typeof player.currentLevel === 'object'
          ? player.currentLevel
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

    collectCharacterSprites(normalizedPreview?.hero);
    collectCharacterSprites(normalizedPreview?.monster);
    if (Array.isArray(normalizedPreview?.monsters)) {
      normalizedPreview.monsters.forEach((monster) => collectCharacterSprites(monster));
    }

    const mathTypeKey =
      typeof normalizedPreview?.mathTypeKey === 'string'
        ? normalizedPreview.mathTypeKey
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
    const heroSprite =
      sanitizeAssetPath(normalizedPreview?.hero?.sprite) ||
      normalizedPreview?.hero?.sprite;
    const monsterSprite =
      sanitizeAssetPath(normalizedPreview?.monster?.sprite) ||
      normalizedPreview?.monster?.sprite;

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

    if (normalizedPreview) {
      applyBattlePreview(normalizedPreview, levels, {
        requiresLevelOneIntro,
        forceLevelOneLanding: shouldForceLevelOneLanding,
        hasIntroProgress: hasIntroProgressFlag,
      });
    }
  } catch (error) {
    console.error('Failed to preload landing assets.', error);
  }

  return results;
};

const applyLandingBodyClasses = (isLevelOneLanding) => {
  const landingRoot = typeof document !== 'undefined' ? document.body : null;

  if (!landingRoot) {
    return;
  }

  const isLevelOne = Boolean(isLevelOneLanding);
  landingRoot.classList.toggle('is-level-one-landing', isLevelOne);
  landingRoot.classList.toggle('is-standard-landing', !isLevelOne);
};

const initLandingInteractions = async (preloadedData = {}, options = {}) => {
  const preloaderReadyPromise = options?.preloaderReadyPromise;
  const awaitPreloaderReady = async () => {
    if (!preloaderReadyPromise || typeof preloaderReadyPromise.then !== 'function') {
      return;
    }
    try {
      await preloaderReadyPromise;
    } catch (error) {
      console.warn('Preloader did not finish cleanly before intro.', error);
    }
  };
  let landingVisited =
    typeof preloadedData?.landingVisited === 'boolean'
      ? preloadedData.landingVisited
      : hasVisitedLanding();
  const hasIntroProgressFlag =
    typeof preloadedData?.hasIntroProgress === 'boolean'
      ? preloadedData.hasIntroProgress
      : hasIntroProgress();
  let requiresLevelOneIntro =
    typeof preloadedData?.requiresLevelOneIntro === 'boolean'
      ? preloadedData.requiresLevelOneIntro
      : Number.isFinite(preloadedData?.experienceTotal)
      ? preloadedData.experienceTotal <= 0
      : !hasIntroProgress();
  let forceLevelOneLanding =
    typeof preloadedData?.forceLevelOneLanding === 'boolean'
      ? preloadedData.forceLevelOneLanding
      : !landingVisited;
  let shouldForceLevelOneLanding = requiresLevelOneIntro || forceLevelOneLanding;

  if (!requiresLevelOneIntro) {
    markLandingVisited();
  }
  const levelOneHeroImage = getLevelOneHeroElement();
  const standardHeroImage = getStandardHeroElement();
  const heroImages = [levelOneHeroImage, standardHeroImage].filter(Boolean);
  const monsterImage = document.querySelector('[data-monster]');
  let battleButton = getActiveBattleButton();
  const actionsElement = document.querySelector('.landing__actions');
  const heroInfoElement = document.querySelector('.landing__hero-info');
  let resolvedCurrentLevel = null;
  let isLevelOneLanding = resolveIsLevelOneLanding({
    requiresLevelOneIntro,
    forceLevelOneLanding: shouldForceLevelOneLanding,
    hasIntroProgress: hasIntroProgressFlag,
    resolvedCurrentLevel,
  });
  let fallbackPlayerData = preloadedData?.fallbackPlayerData ?? null;

  setupSettingsLogout();
  setupDevSignOut();
  setupDevResetTool();

  applyLandingBodyClasses(isLevelOneLanding);
  updateIntroTimingForLanding({ isLevelOneLanding });
  const markLevelOneLandingVisit = () => {
    if (landingVisited || !isLevelOneLanding) {
      return;
    }
    markLandingVisited();
    landingVisited = true;
  };

  const loadBattlePreview = async () => {
    const storedProgress = readStoredProgress();
    let storedSaveState = null;
    try {
      storedSaveState =
        typeof readSaveState === 'function' ? readSaveState() : null;
    } catch (error) {
      console.warn('Unable to read save state for preview fallback.', error);
      storedSaveState = null;
    }

    let levelsData = preloadedData?.levelsData ?? null;
    let playerData = preloadedData?.playerData ?? null;
    if (!playerData) {
      playerData = readStoredPlayerProfile();
    }
    let previewData = preloadedData?.previewData ?? null;
    let resolvedLevels = Array.isArray(preloadedData?.levelsData?.levels)
      ? preloadedData.levelsData.levels
      : [];

    const resolveStoredHeroSprite = (experienceTier) => {
      const normalizedTier = Number.isFinite(experienceTier)
        ? Math.max(1, Math.round(experienceTier))
        : null;
      const tierSprite =
        normalizedTier !== null
          ? `images/hero/shellfin_evolution_${Math.min(normalizedTier, 4)}.png`
          : null;
      const heroSpriteCandidates = [
        sanitizeAssetPath(playerData?.hero?.sprite) || playerData?.hero?.sprite,
        sanitizeAssetPath(fallbackPlayerData?.hero?.sprite) ||
          fallbackPlayerData?.hero?.sprite,
        typeof storedSaveState?.hero?.sprite === 'string'
          ? storedSaveState.hero.sprite
          : null,
        tierSprite,
        getActiveHeroElement()?.getAttribute('src'),
      ];

      return heroSpriteCandidates.find(
        (candidate) => typeof candidate === 'string' && candidate.trim()
      );
    };

    const buildStoredPreviewFallback = (experienceTotalOverride = null) => {
      const storedExperienceTotal =
        experienceTotalOverride ?? resolveStoredExperienceTotal();
      const normalizedExperienceTotal = Number.isFinite(storedExperienceTotal)
        ? Math.max(0, Math.round(storedExperienceTotal))
        : 0;
      const milestoneProgress = computeExperienceMilestoneProgress(
        normalizedExperienceTotal
      );
      const experienceTierCandidates = [
        storedProgress?.experienceTier,
        storedSaveState?.spriteTier,
        computeExperienceTier(normalizedExperienceTotal),
      ];
      const experienceTier =
        experienceTierCandidates.find(
          (candidate) => Number.isFinite(candidate) && candidate > 0
        ) ?? computeExperienceTier(normalizedExperienceTotal);
      const storedLevel =
        normalizeCurrentLevel(storedProgress?.currentLevel) ??
        normalizeCurrentLevel(storedSaveState?.difficulty);
      const heroSprite = resolveStoredHeroSprite(experienceTier);

      const fallbackPreview = {
        currentLevel: storedLevel,
        heroLevelLabel: `Level ${experienceTier}`,
        progressExperience: milestoneProgress.ratio,
        progressExperienceEarned: milestoneProgress.earned,
        progressExperienceTotal: milestoneProgress.total,
        progressExperienceText: milestoneProgress.text,
      };

      if (heroSprite) {
        fallbackPreview.hero = { ...(previewData?.hero ?? {}), sprite: heroSprite };
      }

      return fallbackPreview;
    };

    const applyResolvedPreview = (previewToApply) => {
      if (!previewToApply) {
        return;
      }

      const landingState = applyBattlePreview(previewToApply, resolvedLevels, {
        requiresLevelOneIntro,
        forceLevelOneLanding: shouldForceLevelOneLanding,
        hasIntroProgress: hasIntroProgressFlag,
      });
      if (landingState && typeof landingState === 'object') {
        resolvedCurrentLevel = landingState.resolvedCurrentLevel ?? resolvedCurrentLevel;
        isLevelOneLanding = landingState.isLevelOneLanding ?? isLevelOneLanding;
      } else {
        isLevelOneLanding = resolveIsLevelOneLanding({
          requiresLevelOneIntro,
          forceLevelOneLanding: shouldForceLevelOneLanding,
          hasIntroProgress: hasIntroProgressFlag,
          resolvedCurrentLevel,
        });
      }
      battleButton = getActiveBattleButton();
      applyLandingBodyClasses(isLevelOneLanding);
    };

    try {
      if (!levelsData) {
        const levelsRes = await fetch('data/levels.json');
        if (!levelsRes.ok) {
          throw new Error('Failed to load current level data.');
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

      const storedExperienceTotal = resolveStoredExperienceTotal();
      const resolvedExperienceTotal =
        readPlayerExperienceTotal(playerData) ||
        readPlayerExperienceTotal(fallbackPlayerData) ||
        storedExperienceTotal;
      if (Number.isFinite(resolvedExperienceTotal)) {
        hasIntroProgressFlag = resolvedExperienceTotal > 0;
        requiresLevelOneIntro = resolvedExperienceTotal <= 0;
        if (!requiresLevelOneIntro && !landingVisited) {
          markLandingVisited();
          landingVisited = true;
        }
        forceLevelOneLanding = requiresLevelOneIntro;
        shouldForceLevelOneLanding = requiresLevelOneIntro || forceLevelOneLanding;
      }

      if (shouldForceLevelOneLanding) {
        playerData = coercePlayerProgressToLevelOne(playerData);
        previewData = enforceLevelOnePreview(previewData, resolvedLevels);
      }

      if (preloadedData && typeof preloadedData === 'object') {
        preloadedData.levelsData = levelsData;
        preloadedData.playerData = playerData;
        preloadedData.previewData = previewData;
        preloadedData.forceLevelOneLanding = shouldForceLevelOneLanding;
        preloadedData.requiresLevelOneIntro = requiresLevelOneIntro;
        preloadedData.landingVisited = landingVisited;
      }

      const previewToApply = previewData ?? buildStoredPreviewFallback(resolvedExperienceTotal);
      applyResolvedPreview(previewToApply);

      persistPlayerProfile(playerData);
    } catch (error) {
      console.error('Failed to load battle preview', error);
      applyResolvedPreview(buildStoredPreviewFallback());
    }
  };

  await loadBattlePreview();
  isLevelOneLanding = resolveIsLevelOneLanding({
    requiresLevelOneIntro,
    forceLevelOneLanding: shouldForceLevelOneLanding,
    hasIntroProgress: hasIntroProgressFlag,
    resolvedCurrentLevel,
  });
  battleButton = getActiveBattleButton();
  applyLandingBodyClasses(isLevelOneLanding);

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
    markLevelOneLandingVisit();

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

      if (trigger.dataset.levelsLink === 'true') {
        return;
      }

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
    setupLevelOneIntro({
      heroImage: levelOneHeroImage,
      beginBattle,
      onBeforeBattleStart: markLevelOneLandingVisit,
      awaitIntroReady: awaitPreloaderReady,
    });
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
  let landingEntryState = {};
  try {
    landingEntryState = await resolveLandingEntryState();
  } catch (error) {
    console.warn('Unable to resolve landing entry state; continuing with defaults.', error);
    landingEntryState = {};
  }

  let preloaderReadyResolve;
  let preloaderReadyReject;
  const preloaderReadyPromise = new Promise((resolve, reject) => {
    preloaderReadyResolve = resolve;
    preloaderReadyReject = reject;
  });
  let preloaderFinishPromise = null;
  const ensurePreloaderFinished = () => {
    if (!preloaderFinishPromise) {
      preloaderFinishPromise = finishPreloader();
      preloaderFinishPromise.then(preloaderReadyResolve).catch((error) => {
        console.warn('Preloader did not finish cleanly.', error);
        preloaderReadyReject(error);
      });
    }
    return preloaderFinishPromise;
  };

  try {
    const preloadedData = await preloadLandingAssets(landingEntryState);
    const mergedLandingData = { ...landingEntryState, ...preloadedData };
    const deferPreloaderFinish = Boolean(
      mergedLandingData.forceLevelOneLanding || mergedLandingData.requiresLevelOneIntro
    );

    if (deferPreloaderFinish) {
      ensurePreloaderFinished();
    }

    try {
      await initLandingInteractions(mergedLandingData, { preloaderReadyPromise });
    } catch (error) {
      console.error('Failed to initialize the landing experience; retrying with defaults.', error);
      try {
        await initLandingInteractions({ ...landingEntryState }, { preloaderReadyPromise });
      } catch (fallbackError) {
        console.error('Fallback landing initialization failed.', fallbackError);
      }
    }

    await ensurePreloaderFinished();
  } catch (error) {
    console.error('Failed to preload landing assets.', error);
    try {
      await initLandingInteractions({ ...landingEntryState }, { preloaderReadyPromise });
    } catch (fallbackError) {
      console.error('Fallback landing initialization failed.', fallbackError);
    } finally {
      await ensurePreloaderFinished();
    }
  }
};

initializeDevOverlay();

const scenarioSelectionPromise = setupScenarioLauncher();

const startApp = async () => {
  try {
    await scenarioSelectionPromise;
  } catch (error) {
    console.warn('Scenario selection failed; continuing with defaults.', error);
    setPreloaderPaused(false);
  }

  const isAuthenticated = await ensureAuthenticated();
  if (isAuthenticated) {
    startLandingExperience();
  }
};

startApp();
