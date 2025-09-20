const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const GUEST_SESSION_KEY = 'reefRangersGuestSession';
const MIN_PRELOAD_DURATION_MS = 2000;
const HERO_CARD_POP_DURATION_MS = 450;
const BATTLE_INTRO_POP_DURATION_MS = 600;
const BATTLE_INTRO_WAIT_AFTER_VISIBLE_MS = 1000;

// Gentle idle motion caps (pixels)
const HERO_FLOAT_MIN_PX = 5;   // tiny but visible
const HERO_FLOAT_MAX_PX = 7;  // prevents big bobbing

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

const wait = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const runBattleIntroSequence = () => {
  const intro = document.querySelector('[data-battle-intro]');
  const battleCard = document.querySelector('[data-battle-card]');
  const heroImage = document.querySelector('.hero');
  if (!intro) {
    return Promise.resolve(false);
  }

  const introImage = intro.querySelector('.battle-intro__image');
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  intro.classList.toggle('is-reduced-motion', prefersReducedMotion);
  intro.classList.remove('is-visible');
  intro.setAttribute('aria-hidden', 'true');

  const triggerPopAnimation = (element) => {
    if (!element) {
      return Promise.resolve(false);
    }

    const animationClass = 'is-battle-transition';
    if (prefersReducedMotion) {
      element.classList.add(animationClass);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const handleAnimationEnd = (event) => {
        if (event.target !== element) {
          return;
        }
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve(true);
      };

      element.addEventListener('animationend', handleAnimationEnd);

      // Force layout before toggling class to ensure animation runs consistently.
      void element.offsetWidth;
      element.classList.add(animationClass);

      window.setTimeout(() => {
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve(true);
      }, HERO_CARD_POP_DURATION_MS + 100);
    });
  };

  return Promise.all([
    triggerPopAnimation(heroImage),
    triggerPopAnimation(battleCard),
  ]).then(() => {
    intro.classList.add('is-visible');
    intro.setAttribute('aria-hidden', 'false');

    if (prefersReducedMotion || !introImage) {
      return wait(BATTLE_INTRO_WAIT_AFTER_VISIBLE_MS).then(() => true);
    }

    return new Promise((resolve) => {
      const finishAfterWait = () => {
        wait(BATTLE_INTRO_WAIT_AFTER_VISIBLE_MS).then(() => resolve(true));
      };

      const handleIntroEnd = () => {
        introImage.removeEventListener('animationend', handleIntroEnd);
        finishAfterWait();
      };

      introImage.addEventListener('animationend', handleIntroEnd);

      window.setTimeout(() => {
        introImage.removeEventListener('animationend', handleIntroEnd);
        finishAfterWait();
      }, BATTLE_INTRO_POP_DURATION_MS + 100);
    });
  });
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

const mergeVariablesWithProgress = (rawVariablesData) => {
  const variables =
    rawVariablesData && typeof rawVariablesData === 'object'
      ? { ...rawVariablesData }
      : {};

  const storedProgress = readStoredProgress();

  if (storedProgress && typeof storedProgress === 'object') {
    const baseProgress =
      rawVariablesData && typeof rawVariablesData.progress === 'object'
        ? rawVariablesData.progress
        : {};
    const mergedProgress = { ...baseProgress };

    if (typeof storedProgress.battleLevel === 'number') {
      mergedProgress.battleLevel = storedProgress.battleLevel;
    }

    if (typeof storedProgress.currentExperience === 'number') {
      mergedProgress.currentExperience = storedProgress.currentExperience;
    }

    variables.progress = mergedProgress;
  } else if (
    rawVariablesData &&
    typeof rawVariablesData.progress === 'object' &&
    !variables.progress
  ) {
    variables.progress = { ...rawVariablesData.progress };
  }

  return variables;
};

const determineBattlePreview = (levelsData, variablesData) => {
  const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];
  const variables = mergeVariablesWithProgress(variablesData);

  if (!levels.length) {
    return { levels, variables, preview: null };
  }

  const progressLevel = variables?.progress?.battleLevel;
  const activeLevel =
    levels.find((level) => level?.battleLevel === progressLevel) ?? levels[0];

  if (!activeLevel) {
    return { levels, variables, preview: null };
  }

  const userBattles = Array.isArray(variables?.user?.battles)
    ? variables.user.battles
    : [];

  const findUserBattle = (level) => {
    if (typeof level !== 'number') {
      return null;
    }
    return (
      userBattles.find(
        (entry) => typeof entry?.battleLevel === 'number' && entry.battleLevel === level
      ) ?? null
    );
  };

  const activeUserBattle =
    findUserBattle(activeLevel?.battleLevel) ?? userBattles[0] ?? null;

  const levelHero = activeLevel?.battle?.hero ?? {};
  const heroData = {
    ...levelHero,
    ...(activeUserBattle?.hero ?? {}),
  };

  const heroSprite =
    typeof heroData?.sprite === 'string' ? heroData.sprite.trim() : '';
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
  const enemySprite =
    typeof enemyData?.sprite === 'string' ? enemyData.sprite.trim() : '';
  const enemyName =
    typeof enemyData?.name === 'string' ? enemyData.name.trim() : '';
  const enemyAlt = enemyName ? `${enemyName} ready for battle` : 'Enemy ready for battle';

  const levelName = typeof activeLevel?.name === 'string' ? activeLevel.name.trim() : '';
  const battleTitleLabel =
    levelName ||
    (typeof activeLevel?.battleLevel === 'number'
      ? `Battle ${activeLevel.battleLevel}`
      : 'Upcoming Battle');

  const totalExperienceRaw = Number(activeLevel?.totalExperience);
  const totalExperience = Number.isFinite(totalExperienceRaw)
    ? Math.max(0, Math.round(totalExperienceRaw))
    : 0;
  const currentExperienceRaw = Number(variables?.progress?.currentExperience);
  const currentExperience = Number.isFinite(currentExperienceRaw)
    ? Math.max(0, Math.round(currentExperienceRaw))
    : 0;
  const progressRatio =
    totalExperience > 0
      ? Math.min(Math.max(currentExperience / totalExperience, 0), 1)
      : 0;
  const experienceText = `${Math.min(currentExperience, totalExperience)} of ${totalExperience}`;

  return {
    levels,
    variables,
    preview: {
      activeLevel,
      battleLevel: activeLevel?.battleLevel ?? null,
      mathLabel,
      battleTitleLabel,
      hero: { ...heroData, sprite: heroSprite },
      heroAlt,
      enemy: { ...enemyData, sprite: enemySprite },
      enemyAlt,
      progressExperience: progressRatio,
      progressExperienceText: experienceText,
    },
  };
};

const updateHeroFloat = () => {
  const heroImage = document.querySelector('.hero');
  const battleCard = document.querySelector('[data-battle-card]');
  const battleIntro = document.querySelector('[data-battle-intro]');

  if (!heroImage || !battleCard) return;

  const applyLayout = () => {
    const cardRect = battleCard.getBoundingClientRect();
    const heroRect = heroImage.getBoundingClientRect();

    const availableSpace = cardRect.top - heroRect.height;
    const clampedSpace = Math.max(0, availableSpace);

    const rawRange = clampedSpace / 2;
    const floatRange = Math.min(
      HERO_FLOAT_MAX_PX,
      Math.max(HERO_FLOAT_MIN_PX, rawRange)
    );

    const topOffset = Math.max(0, Math.min(clampedSpace, 72));

    heroImage.style.setProperty('--hero-top', `${topOffset}px`);
    heroImage.style.setProperty('--hero-float-range', `${floatRange}px`);

    if (battleIntro) {
      battleIntro.style.removeProperty('--battle-intro-left');
      battleIntro.style.removeProperty('--battle-intro-top');
    }

  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(applyLayout);
  } else {
    applyLayout();
  }
};

const applyBattlePreview = (previewData = {}) => {
  const heroImage = document.querySelector('.hero');
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
    progressElement.setAttribute('aria-valuetext', `${progressText} experience`);
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
  const results = { levelsData: null, variablesData: null, previewData: null };
  const imageAssets = new Set([
    '/mathmonsters/images/background/background.png',
    '/mathmonsters/images/battle/battle.png',
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
    const [levelsData, rawVariablesData] = await Promise.all([
      loadJson('data/levels.json'),
      loadJson('data/variables.json'),
    ]);

    const { levels, variables, preview } = determineBattlePreview(
      levelsData,
      rawVariablesData
    );

    results.levelsData =
      levelsData && typeof levelsData === 'object'
        ? { ...levelsData, levels }
        : { levels };
    results.variablesData = variables;
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

    if (Array.isArray(variables?.user?.battles)) {
      variables.user.battles.forEach((battleEntry) => {
        addImageAsset(battleEntry?.hero?.sprite);
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

  const battleCard = document.querySelector('[data-battle-card]');
  const battleButton = document.querySelector('[data-battle-button]');
  const heroImage = document.querySelector('.hero');

  const loadBattlePreview = async () => {
    try {
      let levelsData = preloadedData?.levelsData ?? null;
      let variablesData = preloadedData?.variablesData ?? null;
      let previewData = preloadedData?.previewData ?? null;

      if (!levelsData) {
        const levelsRes = await fetch('data/levels.json');
        if (!levelsRes.ok) {
          throw new Error('Failed to load battle level data.');
        }
        levelsData = await levelsRes.json();
      }

      if (!variablesData) {
        try {
          const variablesRes = await fetch('data/variables.json');
          if (variablesRes.ok) {
            variablesData = await variablesRes.json();
          }
        } catch (error) {
          console.warn('Unable to load battle variables.', error);
        }
      }

      if (!previewData) {
        const previewResult = determineBattlePreview(levelsData, variablesData);
        levelsData =
          levelsData && typeof levelsData === 'object'
            ? { ...levelsData, levels: previewResult.levels }
            : { levels: previewResult.levels };
        variablesData = previewResult.variables;
        previewData = previewResult.preview;
      }

      if (previewData) {
        applyBattlePreview(previewData);
      }
    } catch (error) {
      console.error('Failed to load battle preview', error);
    }
  };

  loadBattlePreview();

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateHeroFloat);
  }

  if (heroImage) {
    heroImage.addEventListener('load', updateHeroFloat);
  }

  updateHeroFloat();

  if (battleButton) {
    battleButton.addEventListener('click', async (event) => {
      event.preventDefault();
      if (battleButton.disabled) {
        return;
      }
      battleButton.disabled = true;
      battleButton.setAttribute('aria-disabled', 'true');
      try {
        await runBattleIntroSequence();
      } finally {
        window.location.href = 'html/battle.html';
      }
    });
  }
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
