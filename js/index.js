const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const GUEST_SESSION_KEY = 'reefRangersGuestSession';
const GUEST_SESSION_ACTIVE_VALUE = 'true';
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const LANDING_MODE_STORAGE_KEY = 'reefRangersLandingMode';
const MIN_PRELOAD_DURATION_MS = 2000;
const HERO_TO_ENEMY_DELAY_MS = 1200;
const ENEMY_ENTRANCE_DURATION_MS = 900;
const HERO_EXIT_DURATION_MS = 550;
const ENEMY_EXIT_DURATION_MS = 600;
const PRE_BATTLE_HOLD_DURATION_MS = 1000;
const HERO_EXIT_SYNC_OFFSET_MS = 120;
const CENTER_IMAGE_HOLD_DURATION_MS = 1000;
const LEVEL_ONE_INTRO_EGG_DELAY_MS = 500;
const LEVEL_ONE_INTRO_INITIAL_CARD_DELAY_MS = 2000;
const LEVEL_ONE_INTRO_CARD_DELAY_MS = 400;
const LEVEL_ONE_INTRO_CARD_EXIT_DURATION_MS = 350;
const LEVEL_ONE_INTRO_EGG_AUTO_START_DELAY_MS = 1000;
const LEVEL_ONE_INTRO_EGG_HATCH_DURATION_MS = 2100;
const LEVEL_ONE_INTRO_HERO_REVEAL_DELAY_MS = 700;
const LEVEL_ONE_INTRO_EGG_REMOVAL_DELAY_MS = 220;
const HERO_PREBATTLE_CHARGE_DELAY_MS = 0;
const CSS_VIEWPORT_OFFSET_VAR = '--viewport-bottom-offset';

const BATTLE_PAGE_URL = 'html/battle.html';
const BATTLE_PAGE_MODE_PARAM = 'mode';
const BATTLE_PAGE_MODE_PLAY = 'play';
const BATTLE_PAGE_MODE_DEV_TOOLS = 'devtools';
const REGISTER_PAGE_URL = 'html/register.html';

let battleRedirectUrl = BATTLE_PAGE_URL;
let shouldSkipLandingForDevTools = false;

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

const buildBattleUrl = (mode) => {
  if (!mode) {
    return BATTLE_PAGE_URL;
  }

  const params = new URLSearchParams();
  params.set(BATTLE_PAGE_MODE_PARAM, mode);
  return `${BATTLE_PAGE_URL}?${params.toString()}`;
};

const requestBattleWithoutDevControls = () => {
  shouldSkipLandingForDevTools = false;
  battleRedirectUrl = buildBattleUrl(BATTLE_PAGE_MODE_PLAY);
};

const requestBattleWithDevTools = () => {
  shouldSkipLandingForDevTools = true;
  battleRedirectUrl = BATTLE_PAGE_URL;
};

const redirectToBattle = () => {
  window.location.href = battleRedirectUrl;
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
  const heroImage = document.querySelector('.hero');
  const enemyImage = document.querySelector('[data-enemy]');
  const showIntroImmediately = Boolean(options?.showIntroImmediately);
  const skipHeroSidePosition = Boolean(options?.skipHeroSidePosition);
  const skipEnemyAppearance = Boolean(
    options?.hideEnemy || options?.skipEnemyAppearance
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
  await wait(ENEMY_ENTRANCE_DURATION_MS + HERO_EXIT_SYNC_OFFSET_MS);
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
  let heroPrebattleChargeTimeoutId = null;
  let heroPrebattleChargeAnimation = null;

  const clearHeroPrebattleChargeTimeout = () => {
    if (heroPrebattleChargeTimeoutId !== null) {
      window.clearTimeout(heroPrebattleChargeTimeoutId);
      heroPrebattleChargeTimeoutId = null;
    }
  };

  const cancelHeroPrebattleChargeAnimation = () => {
    if (heroPrebattleChargeAnimation) {
      heroPrebattleChargeAnimation.cancel();
      heroPrebattleChargeAnimation = null;
    }
  };

  const scheduleHeroPrebattleCharge = () => {
    if (!heroImage) {
      return;
    }

    const triggerHeroPrebattleCharge = () => {
      heroPrebattleChargeTimeoutId = null;

      if (!heroImage || heroImage.classList.contains('is-exiting')) {
        return;
      }

      cancelHeroPrebattleChargeAnimation();

      heroPrebattleChargeAnimation = heroImage.animate(
        [
          { '--hero-charge-scale': '1' },
          { '--hero-charge-scale': '0.86' },
          { '--hero-charge-scale': '0.8' },
        ],
        {
          duration: 220,
          easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
          fill: 'forwards',
        }
      );

      heroPrebattleChargeAnimation.onfinish = () => {
        heroPrebattleChargeAnimation = null;
      };
      heroPrebattleChargeAnimation.oncancel = () => {
        heroPrebattleChargeAnimation = null;
      };
    };

    clearHeroPrebattleChargeTimeout();

    if (HERO_PREBATTLE_CHARGE_DELAY_MS <= 0) {
      triggerHeroPrebattleCharge();
      return;
    }

    heroPrebattleChargeTimeoutId = window.setTimeout(
      triggerHeroPrebattleCharge,
      HERO_PREBATTLE_CHARGE_DELAY_MS
    );
  };

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
    scheduleHeroPrebattleCharge();
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
  while (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    if (trimmed.startsWith('./')) {
      trimmed = trimmed.slice(2);
    } else if (trimmed.startsWith('../')) {
      trimmed = trimmed.slice(3);
    }
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

const determineBattlePreview = (levelsData, playerData) => {
  const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];
  const player = mergePlayerWithProgress(playerData);

  if (!levels.length) {
    return { levels, player, preview: null };
  }

  const progressLevel = player?.progress?.battleLevel;
  const activeLevel =
    levels.find((level) => level?.battleLevel === progressLevel) ?? levels[0];

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
  const heroImage = document.querySelector('.hero');
  const enemyImage = document.querySelector('[data-enemy]');
  const battleMathElements = document.querySelectorAll('[data-battle-math]');
  const battleTitleElements = document.querySelectorAll('[data-battle-title]');
  const progressElement = document.querySelector('[data-battle-progress]');
  const heroNameElements = document.querySelectorAll('[data-hero-name]');
  const heroLevelElements = document.querySelectorAll('[data-hero-level]');
  const heroInfoElement = document.querySelector('.landing__hero-info');
  const actionsElement = document.querySelector('.landing__actions');
  const landingRoot = document.body;

  if (heroImage) {
    const heroSprite =
      typeof previewData?.hero?.sprite === 'string' ? previewData.hero.sprite : '';
    if (heroSprite) {
      heroImage.src = heroSprite;
    }
    heroImage.alt =
      typeof previewData?.heroAlt === 'string' && previewData.heroAlt.trim()
        ? previewData.heroAlt
        : 'Hero ready for battle';
  }

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
    : false;

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

const readLandingModeRequestFromStorage = () => {
  try {
    const storage = window.sessionStorage;
    if (!storage) {
      return null;
    }
    const value = storage.getItem(LANDING_MODE_STORAGE_KEY);
    return typeof value === 'string' && value ? value : null;
  } catch (error) {
    console.warn('Landing mode preference unavailable.', error);
    return null;
  }
};

const clearLandingModeRequestFromStorage = () => {
  try {
    window.sessionStorage?.removeItem(LANDING_MODE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear landing mode preference.', error);
  }
};

const readLandingModeRequestFromQuery = () => {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return null;
  }

  const search = window.location.search || '';

  if (typeof URLSearchParams === 'function') {
    try {
      const params = new URLSearchParams(search);
      const mode = params.get(BATTLE_PAGE_MODE_PARAM);
      return typeof mode === 'string' && mode ? mode : null;
    } catch (error) {
      console.warn('Unable to read landing mode from URL parameters.', error);
    }
  }

  const trimmed = search.startsWith('?') ? search.slice(1) : search;
  if (!trimmed) {
    return null;
  }

  const pairs = trimmed.split('&');
  for (const pair of pairs) {
    if (!pair) {
      continue;
    }
    const [rawKey, rawValue = ''] = pair.split('=');
    if (!rawKey) {
      continue;
    }
    const key = rawKey.trim().toLowerCase();
    if (key !== BATTLE_PAGE_MODE_PARAM) {
      continue;
    }
    const value = rawValue.trim();
    return value ? value : null;
  }

  return null;
};

const clearLandingModeRequestFromQuery = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const { history, location, document: doc } = window;
  if (!history?.replaceState || !location) {
    return;
  }

  try {
    const url = new URL(location.href);
    url.searchParams.delete(BATTLE_PAGE_MODE_PARAM);
    history.replaceState(null, doc?.title || '', url.toString());
    return;
  } catch (error) {
    console.warn('Unable to update URL search parameters.', error);
  }

  try {
    const search = location.search || '';
    const trimmed = search.startsWith('?') ? search.slice(1) : search;
    if (!trimmed) {
      return;
    }

    const filtered = trimmed
      .split('&')
      .filter((pair) => {
        if (!pair) {
          return false;
        }
        const [rawKey] = pair.split('=');
        if (!rawKey) {
          return true;
        }
        return rawKey.trim().toLowerCase() !== BATTLE_PAGE_MODE_PARAM;
      })
      .join('&');

    const newSearch = filtered ? `?${filtered}` : '';
    const origin =
      location.origin || `${location.protocol}//${location.host || ''}`;
    const newUrl = `${origin}${location.pathname}${newSearch}${
      location.hash || ''
    }`;
    history.replaceState(null, doc?.title || '', newUrl);
  } catch (fallbackError) {
    console.warn('Unable to clear landing mode from URL parameters.', fallbackError);
  }
};

const applyLandingModeRequest = () => {
  shouldSkipLandingForDevTools = false;
  const storedMode = readLandingModeRequestFromStorage();
  if (storedMode) {
    const normalizedStoredMode = storedMode.trim().toLowerCase();
    if (normalizedStoredMode === BATTLE_PAGE_MODE_PLAY) {
      requestBattleWithoutDevControls();
    } else if (normalizedStoredMode === BATTLE_PAGE_MODE_DEV_TOOLS) {
      requestBattleWithDevTools();
    }
    clearLandingModeRequestFromStorage();
    return;
  }

  const queryMode = readLandingModeRequestFromQuery();
  if (!queryMode) {
    return;
  }

  const normalizedQueryMode = queryMode.trim().toLowerCase();
  if (normalizedQueryMode === BATTLE_PAGE_MODE_PLAY) {
    requestBattleWithoutDevControls();
  } else if (normalizedQueryMode === BATTLE_PAGE_MODE_DEV_TOOLS) {
    requestBattleWithDevTools();
  }

  clearLandingModeRequestFromQuery();
};

const preloadLandingAssets = async () => {
  const results = { levelsData: null, playerData: null, previewData: null };
  const imageAssets = new Set([
    '../images/background/background.png',
    '../images/battle/battle_time.png',
  ]);
  const questionFiles = new Set();

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

        const questionFile = battle?.questionReference?.file;
        if (typeof questionFile === 'string') {
          const sanitizedFile = sanitizeAssetPath(questionFile);
          if (sanitizedFile) {
            const normalized = sanitizedFile.startsWith('data/')
              ? sanitizedFile
              : `data/${sanitizedFile.replace(/^\/+/, '')}`;
            questionFiles.add(normalized);
          }
        }
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
    const questionPaths = Array.from(questionFiles);

    const preloadQuestion = async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to preload ${url}`);
        }
        await response.json();
      } catch (error) {
        console.warn(error);
      }
    };

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

    await Promise.allSettled([
      ...questionPaths.map(preloadQuestion),
      ...imagePaths.map(preloadImage),
    ]);

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
  battleRedirectUrl = BATTLE_PAGE_URL;
  markLandingVisited();
  applyLandingModeRequest();
  if (shouldSkipLandingForDevTools) {
    shouldSkipLandingForDevTools = false;
    redirectToBattle();
    return;
  }
  const heroImage = document.querySelector('.hero');
  const enemyImage = document.querySelector('[data-enemy]');
  let battleButton = document.querySelector('[data-battle-button]');
  const actionsElement = document.querySelector('.landing__actions');
  const heroInfoElement = document.querySelector('.landing__hero-info');
  let isLevelOneLanding = document.body.classList.contains('is-level-one-landing');

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
      }
    } catch (error) {
      console.error('Failed to load battle preview', error);
    }
  };

  await loadBattlePreview();
  isLevelOneLanding = document.body.classList.contains('is-level-one-landing');

  if (isLevelOneLanding) {
    if (actionsElement) {
      actionsElement.setAttribute('aria-hidden', 'true');
    }
    if (heroInfoElement) {
      heroInfoElement.setAttribute('aria-hidden', 'true');
    }
    if (battleButton) {
      removeBattleButtonGlow(battleButton);
      battleButton.disabled = true;
      battleButton.setAttribute('aria-hidden', 'true');
      battleButton.setAttribute('tabindex', '-1');
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
      battleButton.removeAttribute('tabindex');
      battleButton.disabled = false;
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
    awaitImageReady(heroImage),
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
      buttonToDisable.disabled = true;
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
    setupLevelOneIntro({ heroImage, beginBattle });
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

  battleButton.addEventListener('click', () =>
    beginBattle({ triggerButton: battleButton, showIntroImmediately: true })
  );
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
