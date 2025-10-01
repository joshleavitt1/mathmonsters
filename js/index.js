const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'mathmonstersProgress';
const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const GUEST_SESSION_ACTIVE_VALUE = 'true';
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const MIN_PRELOAD_DURATION_MS = 2000;
const HERO_TO_ENEMY_DELAY_MS = 1200;
const ENEMY_ENTRANCE_DURATION_MS = 900;
const HERO_EXIT_DURATION_MS = 550;
const ENEMY_EXIT_DURATION_MS = 600;
const PRE_BATTLE_HOLD_DURATION_MS = 1000;
const HERO_EXIT_SYNC_BUFFER_MS = 0;
const CENTER_IMAGE_HOLD_DURATION_MS = 1000;
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

const startLandingExperience = () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapLanding);
  } else {
    bootstrapLanding();
  }
};

const runBattleIntroSequence = async (options = {}) => {
  const heroImage = getActiveHeroElement();
  const enemyImage = document.querySelector('[data-enemy]');
  const showIntroImmediately = Boolean(options?.showIntroImmediately);
  const skipHeroSidePosition = Boolean(options?.skipHeroSidePosition);
  const skipEnemyAppearance = Boolean(
    options?.hideEnemy || options?.skipEnemyAppearance
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

  if (skipEnemyAppearance && enemyImage) {
    enemyImage.classList.remove('is-visible', 'is-exiting');
    enemyImage.setAttribute('aria-hidden', 'true');
  }

  const showEnemy = () => {
    if (!enemyImage || skipEnemyAppearance) {
      return;
    }
    enemyImage.classList.add('is-visible');
    enemyImage.removeAttribute('aria-hidden');
  };

  const beginExitAnimations = () => {
    document.body.classList.add('is-battle-transition');
    heroImage.classList.add('is-exiting');
    if (enemyImage && !skipEnemyAppearance) {
      enemyImage.classList.add('is-exiting');
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
    showEnemy();
  };

  const holdDuration = showIntroImmediately ? 0 : HERO_TO_ENEMY_DELAY_MS;

  await wait(holdDuration);
  prepareForBattle();
  const heroExitWaitDuration =
    (skipEnemyAppearance ? 0 : ENEMY_ENTRANCE_DURATION_MS) +
    heroExitSyncBufferMs;
  await wait(heroExitWaitDuration);
  beginExitAnimations();

  await wait(
    Math.max(
      HERO_EXIT_DURATION_MS,
      skipEnemyAppearance ? 0 : ENEMY_EXIT_DURATION_MS
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

  return trimmed;
};

const mergePlayerWithProgress = (rawPlayerData) => {
  const player =
    rawPlayerData && typeof rawPlayerData === 'object'
      ? { ...rawPlayerData }
      : {};

  const storedProgress = readStoredProgress();

  const baseProgress =
    rawPlayerData && typeof rawPlayerData.progress === 'object'
      ? rawPlayerData.progress
      : {};
  const mergedProgress = { ...baseProgress };
  const baseBattleVariables =
    rawPlayerData && typeof rawPlayerData.battleVariables === 'object'
      ? rawPlayerData.battleVariables
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
    if (typeof storedProgress.battleLevel === 'number') {
      mergedProgress.battleLevel = storedProgress.battleLevel;
    }

    if (typeof storedProgress.timeRemainingSeconds === 'number') {
      player.battleVariables.timeRemainingSeconds =
        storedProgress.timeRemainingSeconds;
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

  return player;
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

const determineBattlePreview = (levelsData, playerData) => {
  const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];
  const player = mergePlayerWithProgress(playerData);

  if (!levels.length) {
    return { levels, player, preview: null };
  }

  const progressLevel = normalizeBattleLevel(player?.progress?.battleLevel);
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
    typeof activeLevel.mathType === 'string'
      ? activeLevel.mathType
      : typeof battle?.mathType === 'string'
      ? battle.mathType
      : 'Math Mission';
  const mathLabel = mathLabelSource.trim() || 'Math Mission';

  const enemyData = (() => {
    if (battle && typeof battle.enemy === 'object' && battle.enemy !== null) {
      return battle.enemy;
    }
    if (Array.isArray(battle?.enemies)) {
      const match = battle.enemies.find(
        (candidate) => candidate && typeof candidate === 'object'
      );
      if (match) {
        return match;
      }
    }
    return {};
  })();
  const rawEnemySprite =
    typeof enemyData?.sprite === 'string' ? enemyData.sprite.trim() : '';
  const enemySprite = sanitizeAssetPath(rawEnemySprite) || rawEnemySprite;
  const enemyName =
    typeof enemyData?.name === 'string' ? enemyData.name.trim() : '';
  const enemyAlt = enemyName ? `${enemyName} ready for battle` : 'Enemy ready for battle';

  const levelName = typeof activeLevel?.name === 'string' ? activeLevel.name.trim() : '';
  const battleTitleLabel =
    levelName ||
    (typeof activeLevel?.battleLevel === 'number'
      ? `Battle ${activeLevel.battleLevel}`
      : 'Upcoming Battle');
  const heroLevelLabel =
    levelName ||
    (typeof activeLevel?.battleLevel === 'number'
      ? `Level ${activeLevel.battleLevel}`
      : 'Level');
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
      enemy: { ...enemyData, sprite: enemySprite },
      enemyAlt,
      progressExperience: experienceProgress.ratio,
      progressExperienceEarned: experienceProgress.earned,
      progressExperienceTotal: experienceProgress.total,
      progressExperienceText: progressText,
    },
  };
};

const applyBattlePreview = (previewData = {}) => {
  const heroImageElements = document.querySelectorAll('[data-hero-sprite]');
  const enemyImage = document.querySelector('[data-enemy]');
  const battleMathElements = document.querySelectorAll('[data-battle-math]');
  const battleTitleElements = document.querySelectorAll('[data-battle-title]');
  const progressElement = document.querySelector('[data-battle-progress]');
  const heroNameElements = document.querySelectorAll('[data-hero-name]');
  const heroLevelElements = document.querySelectorAll('[data-hero-level]');
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

  if (enemyImage) {
    const enemySprite =
      typeof previewData?.enemy?.sprite === 'string'
        ? previewData.enemy.sprite
        : '';
    if (enemySprite) {
      enemyImage.src = enemySprite;
    }
    enemyImage.alt =
      typeof previewData?.enemyAlt === 'string' && previewData.enemyAlt.trim()
        ? previewData.enemyAlt
        : 'Enemy ready for battle';
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

  if (progressElement) {
    const progressValue = Number.isFinite(previewData?.progressExperience)
      ? Math.min(Math.max(previewData.progressExperience, 0), 1)
      : 0;
    const progressText =
      typeof previewData?.progressExperienceText === 'string' &&
      previewData.progressExperienceText.trim()
        ? previewData.progressExperienceText.trim()
        : '0 of 0';
    const earnedCount = Number(previewData?.progressExperienceEarned);
    const totalCount = Number(previewData?.progressExperienceTotal);
    progressElement.style.setProperty('--progress-value', progressValue);
    progressElement.setAttribute('aria-valuemin', '0');
    if (Number.isFinite(earnedCount) && Number.isFinite(totalCount) && totalCount > 0) {
      const clampedEarned = Math.max(0, Math.min(earnedCount, totalCount));
      progressElement.setAttribute('aria-valuemax', `${Math.round(totalCount)}`);
      progressElement.setAttribute('aria-valuenow', `${Math.round(clampedEarned)}`);
    } else {
      progressElement.setAttribute('aria-valuemax', '100');
      progressElement.setAttribute('aria-valuenow', `${Math.round(progressValue * 100)}`);
    }
    const ariaText = progressText.includes(' of ')
      ? `${progressText} experience`
      : progressText;
    progressElement.setAttribute('aria-valuetext', ariaText);
  }

  const resolvedBattleLevel = Number(previewData?.battleLevel);
  const isLevelOneLanding = Number.isFinite(resolvedBattleLevel)
    ? resolvedBattleLevel <= 1
    : true;

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

  updateHeroFloat();
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
    const normalized = sanitizeAssetPath(path);
    if (normalized) {
      imageAssets.add(normalized);
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
    const [levelsData, rawPlayerData] = await Promise.all([
      loadJson('data/levels.json'),
      loadJson('data/player.json'),
    ]);

    const { levels, player, preview } = determineBattlePreview(
      levelsData,
      rawPlayerData
    );

    results.levelsData =
      levelsData && typeof levelsData === 'object'
        ? { ...levelsData, levels }
        : { levels };
    results.playerData = player;
    results.previewData = preview;

    if (levels.length) {
      levels.forEach((level) => {
        const battle = level?.battle ?? {};
        addImageAsset(battle?.hero?.sprite);
        addImageAsset(battle?.enemy?.sprite);
      });
    }

    if (player && typeof player === 'object') {
      addImageAsset(player?.hero?.sprite);
      const levelMap =
        player.battleLevel && typeof player.battleLevel === 'object'
          ? player.battleLevel
          : {};
      Object.values(levelMap).forEach((entry) => {
        if (entry && typeof entry === 'object') {
          addImageAsset(entry?.hero?.sprite);
        }
      });
    }

    const prioritizedImages = [];
    const heroSprite = sanitizeAssetPath(preview?.hero?.sprite) || preview?.hero?.sprite;
    const enemySprite =
      sanitizeAssetPath(preview?.enemy?.sprite) || preview?.enemy?.sprite;

    if (heroSprite) {
      prioritizedImages.push(heroSprite);
    }
    if (enemySprite) {
      prioritizedImages.push(enemySprite);
    }

    const imagePaths = Array.from(
      new Set([...prioritizedImages.filter(Boolean), ...imageAssets])
    );

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

    await Promise.allSettled(imagePaths.map(preloadImage));

    if (preview) {
      applyBattlePreview(preview);
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
  const enemyImage = document.querySelector('[data-enemy]');
  let battleButton = getActiveBattleButton();
  const actionsElement = document.querySelector('.landing__actions');
  const heroInfoElement = document.querySelector('.landing__hero-info');
  let isLevelOneLanding = document.body.classList.contains('is-level-one-landing');

  setupSettingsLogout();

  const buttonGlowProperties = [
    '--pulsating-glow-color',
    '--pulsating-glow-opacity',
    '--pulsating-glow-opacity-peak',
    '--pulsating-glow-spread',
    '--pulsating-glow-radius',
    '--pulsating-glow-duration',
    '--pulsating-glow-scale-start',
    '--pulsating-glow-scale-peak',
    '--pulsating-glow-blur',
  ];

  const applyBattleButtonGlow = (button) => {
    if (!button) {
      return;
    }

    button.classList.add('pulsating-glow');
    button.style.setProperty('--pulsating-glow-color', 'rgba(80, 188, 255, 0.65)');
    button.style.setProperty('--pulsating-glow-opacity', '0.7');
    button.style.setProperty('--pulsating-glow-opacity-peak', '0.95');
    button.style.setProperty('--pulsating-glow-spread', '28px');
    button.style.setProperty('--pulsating-glow-radius', '24px');
    button.style.setProperty('--pulsating-glow-duration', '1.9s');
    button.style.setProperty('--pulsating-glow-scale-start', '0.94');
    button.style.setProperty('--pulsating-glow-scale-peak', '1.08');
    button.style.setProperty('--pulsating-glow-blur', '8px');
  };

  const removeBattleButtonGlow = (button) => {
    if (!button) {
      return;
    }

    button.classList.remove('pulsating-glow');
    buttonGlowProperties.forEach((property) => {
      button.style.removeProperty(property);
    });
  };

  const loadBattlePreview = async () => {
    try {
      let levelsData = preloadedData?.levelsData ?? null;
      let playerData = preloadedData?.playerData ?? null;
      let previewData = preloadedData?.previewData ?? null;

      if (!levelsData) {
        const levelsRes = await fetch('data/levels.json');
        if (!levelsRes.ok) {
          throw new Error('Failed to load battle level data.');
        }
        levelsData = await levelsRes.json();
      }

      if (!playerData) {
        try {
          const playerRes = await fetch('data/player.json');
          if (playerRes.ok) {
            playerData = await playerRes.json();
          }
        } catch (error) {
          console.warn('Unable to load player data.', error);
        }
      }

      if (!previewData) {
        const previewResult = determineBattlePreview(levelsData, playerData);
        levelsData =
          levelsData && typeof levelsData === 'object'
            ? { ...levelsData, levels: previewResult.levels }
            : { levels: previewResult.levels };
        playerData = previewResult.player;
        previewData = previewResult.preview;

        if (preloadedData && typeof preloadedData === 'object') {
          preloadedData.levelsData = levelsData;
          preloadedData.playerData = playerData;
          preloadedData.previewData = previewData;
        }
      }

      if (previewData) {
        applyBattlePreview(previewData);
        isLevelOneLanding = document.body.classList.contains('is-level-one-landing');
        battleButton = getActiveBattleButton();
      }
    } catch (error) {
      console.error('Failed to load battle preview', error);
    }
  };

  await loadBattlePreview();
  isLevelOneLanding = document.body.classList.contains('is-level-one-landing');
  battleButton = getActiveBattleButton();

  if (isLevelOneLanding) {
    if (actionsElement) {
      actionsElement.setAttribute('aria-hidden', 'true');
    }
    if (heroInfoElement) {
      heroInfoElement.setAttribute('aria-hidden', 'true');
    }
    if (battleButton) {
      removeBattleButtonGlow(battleButton);
      setInteractiveDisabled(battleButton, true);
      battleButton.setAttribute('aria-hidden', 'true');
    }
    if (enemyImage) {
      enemyImage.setAttribute('aria-hidden', 'true');
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
      applyBattleButtonGlow(battleButton);
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
    awaitImageReady(enemyImage),
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

    if (
      CENTER_IMAGE_HOLD_DURATION_MS > 0 &&
      !isLevelOneLanding &&
      !shouldShowIntroImmediately
    ) {
      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          Math.max(0, Number(CENTER_IMAGE_HOLD_DURATION_MS) || 0)
        )
      );
    }

    try {
      await runBattleIntroSequence({
        showIntroImmediately: shouldShowIntroImmediately,
        skipHeroSidePosition: isLevelOneLanding,
        hideEnemy: isLevelOneLanding,
      });
    } catch (error) {
      console.warn('Battle intro sequence failed.', error);
    } finally {
      redirectToBattle();
    }
  };

  if (isLevelOneLanding) {
    setupLevelOneIntro({ heroImage: levelOneHeroImage, beginBattle });
    return;
  }

  if (!battleButton) {
    await waitForImages;

    const showIntroImmediately = true;

    if (CENTER_IMAGE_HOLD_DURATION_MS > 0 && !showIntroImmediately) {
      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          Math.max(0, Number(CENTER_IMAGE_HOLD_DURATION_MS) || 0)
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
