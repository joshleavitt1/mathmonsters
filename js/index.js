const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const GUEST_SESSION_KEY = 'reefRangersGuestSession';
const MIN_PRELOAD_DURATION_MS = 2000;
const ENEMY_ENTRY_DELAY_MS = 2000;
const BATTLE_TIME_APPEAR_DELAY_MS = 2000;
const BATTLE_EXIT_DELAY_MS = 2000;
const CAST_EXIT_DURATION_MS = 650;
const REDUCED_MOTION_STEP_DELAY_MS = 200;

const CSS_VIEWPORT_OFFSET_VAR = '--viewport-bottom-offset';

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

const isGuestModeActive = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return false;
    }
    return storage.getItem(GUEST_SESSION_KEY) === 'true';
  } catch (error) {
    console.warn('Guest mode detection failed.', error);
    return false;
  }
};

const clearGuestMode = () => {
  try {
    window.localStorage?.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear guest mode flag.', error);
  }
};

const ensureAuthenticated = async () => {
  if (isGuestModeActive()) {
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

const wait = (durationMs) =>
  new Promise((resolve) => {
    const timeout = Math.max(
      0,
      Number.isFinite(durationMs) ? durationMs : Number(durationMs) || 0
    );
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
      window.setTimeout(resolve, timeout);
    } else {
      setTimeout(resolve, timeout);
    }
  });

const shouldReduceMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const waitForImageLoad = (image) =>
  new Promise((resolve) => {
    if (!image) {
      resolve(false);
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      resolve(true);
      return;
    }

    const cleanup = () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };

    const handleLoad = () => {
      cleanup();
      resolve(true);
    };

    const handleError = () => {
      cleanup();
      resolve(false);
    };

    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });
  });

const playLandingSequence = async (elements = {}) => {
  const heroImage =
    elements?.heroImage ||
    document.querySelector('[data-hero]') ||
    document.querySelector('.hero');
  const enemyImage =
    elements?.enemyImage || document.querySelector('[data-enemy]');
  const battleTimeImage =
    elements?.battleTimeImage || document.querySelector('[data-battle-time]');
  const battleCastElement =
    elements?.battleCast || document.querySelector('[data-battle-cast]');
  const heroContainer =
    elements?.heroContainer ||
    heroImage?.closest('[data-hero-container]') ||
    battleCastElement?.querySelector('[data-hero-container]') ||
    null;
  const enemyContainer =
    elements?.enemyContainer ||
    enemyImage?.closest('[data-enemy-container]') ||
    battleCastElement?.querySelector('[data-enemy-container]') ||
    null;

  await Promise.all([
    waitForImageLoad(heroImage),
    waitForImageLoad(enemyImage),
  ]).catch(() => {});

  if (shouldReduceMotion()) {
    if (battleCastElement) {
      battleCastElement.classList.add('is-enemy-present');
    }
    if (enemyContainer) {
      enemyContainer.classList.add('is-visible');
    }
    if (enemyImage) {
      enemyImage.classList.add('is-visible');
    }
    if (battleTimeImage) {
      battleTimeImage.classList.add('is-visible');
    }

    await wait(REDUCED_MOTION_STEP_DELAY_MS);

    [heroImage, enemyImage, battleTimeImage].forEach((element) => {
      if (element) {
        element.classList.add('is-battle-transition');
      }
    });

    await wait(REDUCED_MOTION_STEP_DELAY_MS);
    return;
  }

  await wait(ENEMY_ENTRY_DELAY_MS);
  if (battleCastElement) {
    battleCastElement.classList.add('is-enemy-present');
  }
  if (enemyContainer) {
    enemyContainer.classList.add('is-visible');
  }
  if (enemyImage) {
    enemyImage.classList.add('is-visible');
  }

  await wait(BATTLE_TIME_APPEAR_DELAY_MS);
  if (battleTimeImage) {
    battleTimeImage.classList.add('is-visible');
  }

  await wait(BATTLE_EXIT_DELAY_MS);
  [heroImage, enemyImage, battleTimeImage].forEach((element) => {
    if (element) {
      element.classList.add('is-battle-transition');
    }
  });

  await wait(CAST_EXIT_DURATION_MS);
};

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
    player.progress = { ...player.progress, ...mergedProgress };
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

  const enemyData = battle?.enemy ?? {};
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
  const progressText =
    typeof activeLevel?.battleLevel === 'number'
      ? `Level ${activeLevel.battleLevel}`
      : 'Ready for battle';

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
      enemy: { ...enemyData, sprite: enemySprite },
      enemyAlt,
      progressExperience: null,
      progressExperienceText: progressText,
    },
  };
};

const applyBattlePreview = (previewData = {}) => {
  const heroImage = document.querySelector('.hero');
  const enemyImage =
    document.querySelector('[data-enemy]') || document.querySelector('.enemy');
  const battleMathElements = document.querySelectorAll('[data-battle-math]');
  const battleTitleElements = document.querySelectorAll('[data-battle-title]');
  const progressElement = document.querySelector('[data-battle-progress]');

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
      typeof previewData?.enemy?.sprite === 'string' ? previewData.enemy.sprite : '';
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

  if (progressElement) {
    const progressValue = Number.isFinite(previewData?.progressExperience)
      ? Math.min(Math.max(previewData.progressExperience, 0), 1)
      : 0;
    const progressText =
      typeof previewData?.progressExperienceText === 'string' &&
      previewData.progressExperienceText.trim()
        ? previewData.progressExperienceText.trim()
        : '0 of 0';
    progressElement.style.setProperty('--progress-value', progressValue);
    progressElement.setAttribute('aria-valuenow', `${Math.round(progressValue * 100)}`);
    const ariaText = progressText.includes(' of ')
      ? `${progressText} experience`
      : progressText;
    progressElement.setAttribute('aria-valuetext', ariaText);
  }

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

const randomizeBubbleTimings = () => {
  const bubbles = document.querySelectorAll('.bubble');

  bubbles.forEach((bubble) => {
    const computedStyles = window.getComputedStyle(bubble);
    const durationValue = computedStyles.getPropertyValue('--duration').trim();
    const durationInSeconds = Number.parseFloat(durationValue);

    if (!Number.isFinite(durationInSeconds) || durationInSeconds <= 0) {
      const fallbackOffset = -(Math.random() * 2);
      bubble.style.setProperty('--delay', `${fallbackOffset.toFixed(3)}s`);
      return;
    }

    const randomOffset = Math.random() * durationInSeconds;
    bubble.style.setProperty('--delay', `${-randomOffset.toFixed(3)}s`);
  });
};

const preloadLandingAssets = async () => {
  const results = { levelsData: null, playerData: null, previewData: null };
  const imageAssets = new Set(['../images/background/background.png']);
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

const initLandingInteractions = (preloadedData = {}) => {
  markLandingVisited();
  randomizeBubbleTimings();

  const heroImage =
    document.querySelector('[data-hero]') || document.querySelector('.hero');
  const enemyImage =
    document.querySelector('[data-enemy]') || document.querySelector('.enemy');
  const battleTimeImage =
    document.querySelector('[data-battle-time]') ||
    document.querySelector('.battle-time');
  const battleCastElement =
    document.querySelector('[data-battle-cast]') || null;
  const heroContainer =
    heroImage?.closest('[data-hero-container]') ||
    battleCastElement?.querySelector('[data-hero-container]') ||
    null;
  const enemyContainer =
    enemyImage?.closest('[data-enemy-container]') ||
    battleCastElement?.querySelector('[data-enemy-container]') ||
    null;

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
      }
    } catch (error) {
      console.error('Failed to load battle preview', error);
    }
  };

  const startSequence = async () => {
    await loadBattlePreview();

    try {
      await playLandingSequence({
        battleCast: battleCastElement,
        heroContainer,
        enemyContainer,
        heroImage,
        enemyImage,
        battleTimeImage,
      });
    } finally {
      window.location.href = 'html/battle.html';
    }
  };

  startSequence();
};

const bootstrapLanding = async () => {
  try {
    const preloadedData = await preloadLandingAssets();
    initLandingInteractions(preloadedData);
  } catch (error) {
    console.error('Failed to initialize the landing experience.', error);
    await finishPreloader();
    initLandingInteractions({});
  }
};
