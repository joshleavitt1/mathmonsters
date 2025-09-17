const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const MIN_PRELOAD_DURATION_MS = 2000;

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

    if (typeof storedProgress.timeRemainingSeconds === 'number') {
      mergedProgress.timeRemainingSeconds =
        storedProgress.timeRemainingSeconds;
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
  const heroAlt = heroName ? `${heroName} swimming into view` : 'Hero ready for battle';

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

  const accuracyGoal =
    typeof battle?.accuracyGoal === 'number'
      ? Math.round(battle.accuracyGoal * 100)
      : null;

  const timeGoal =
    typeof battle?.timeGoalSeconds === 'number' ? battle.timeGoalSeconds : null;

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
      overlayAccuracyText: accuracyGoal !== null ? `${accuracyGoal}%` : '0%',
      overlayTimeText: timeGoal !== null ? `${timeGoal}s` : '0s',
    },
  };
};

const applyBattlePreview = (previewData = {}) => {
  const heroImage = document.querySelector('.hero');
  const battleMathElements = document.querySelectorAll('[data-battle-math]');
  const battleTitleElements = document.querySelectorAll('[data-battle-title]');
  const battleEnemyElements = document.querySelectorAll('[data-battle-enemy]');
  const overlayAccuracy = document.querySelector('.accuracy-value');
  const overlayTime = document.querySelector('.time-value');

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

  battleEnemyElements.forEach((element) => {
    if (!element) {
      return;
    }
    const enemySprite =
      typeof previewData?.enemy?.sprite === 'string'
        ? previewData.enemy.sprite
        : '';
    if (enemySprite && (element instanceof HTMLImageElement || element.tagName === 'IMG')) {
      element.src = enemySprite;
    }
    if (element instanceof HTMLImageElement || element.tagName === 'IMG') {
      element.alt =
        typeof previewData?.enemyAlt === 'string' && previewData.enemyAlt.trim()
          ? previewData.enemyAlt
          : 'Enemy ready for battle';
    }
  });

  if (overlayAccuracy) {
    overlayAccuracy.textContent =
      typeof previewData?.overlayAccuracyText === 'string'
        ? previewData.overlayAccuracyText
        : '0%';
  }

  if (overlayTime) {
    overlayTime.textContent =
      typeof previewData?.overlayTimeText === 'string'
        ? previewData.overlayTimeText
        : '0s';
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
  const results = { levelsData: null, variablesData: null, previewData: null };
  const imageAssets = new Set(['images/background/background.png']);
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
  const messageCard = document.querySelector('.battle-select-card');
  const battleOverlay = document.getElementById('battle-overlay');
  const battleButton = battleOverlay?.querySelector('.battle-btn');

  if (!messageCard || !battleOverlay) {
    return;
  }

  const defaultTabIndex = messageCard.getAttribute('tabindex') ?? '0';
  let battleOverlayActivationTimeout;
  let messageCardReturnTimeout;
  let battleButtonFocusTimeout;
  const MESSAGE_CARD_EXIT_DURATION = 600;
  const BATTLE_OVERLAY_FOCUS_DELAY = 400;
  const MESSAGE_CARD_FOCUS_DELAY = MESSAGE_CARD_EXIT_DURATION;

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

  const openOverlay = () => {
    if (
      document.body.classList.contains('battle-overlay-open') ||
      document.body.classList.contains('message-exiting') ||
      messageCard.classList.contains('battle-select-card--animating')
    ) {
      return;
    }

    window.clearTimeout(battleOverlayActivationTimeout);
    window.clearTimeout(messageCardReturnTimeout);
    window.clearTimeout(battleButtonFocusTimeout);

    messageCard.classList.remove('battle-select-card--hidden');
    messageCard.classList.remove('battle-select-card--no-delay');
    messageCard.classList.add('battle-select-card--animating');
    document.body.classList.add('message-exiting');
    messageCard.setAttribute('aria-expanded', 'true');

    battleOverlayActivationTimeout = window.setTimeout(() => {
      document.body.classList.add('battle-overlay-open');
      battleOverlay.setAttribute('aria-hidden', 'false');
      messageCard.classList.add('battle-select-card--hidden');
      messageCard.classList.remove('battle-select-card--animating');
      messageCard.setAttribute('aria-hidden', 'true');
      messageCard.setAttribute('tabindex', '-1');

      battleButtonFocusTimeout = window.setTimeout(() => {
        battleButton?.focus({ preventScroll: true });
      }, BATTLE_OVERLAY_FOCUS_DELAY);
    }, MESSAGE_CARD_EXIT_DURATION);
  };

  const closeOverlay = () => {
    if (!document.body.classList.contains('battle-overlay-open')) {
      return;
    }

    window.clearTimeout(battleOverlayActivationTimeout);
    window.clearTimeout(messageCardReturnTimeout);
    window.clearTimeout(battleButtonFocusTimeout);

    document.body.classList.remove('battle-overlay-open');
    battleOverlay.setAttribute('aria-hidden', 'true');
    messageCard.classList.remove('battle-select-card--hidden');
    messageCard.classList.add('battle-select-card--animating');
    messageCard.classList.add('battle-select-card--no-delay');
    messageCard.setAttribute('aria-expanded', 'false');
    messageCard.setAttribute('aria-hidden', 'false');
    messageCard.setAttribute('tabindex', defaultTabIndex);

    window.requestAnimationFrame(() => {
      document.body.classList.remove('message-exiting');
    });

    messageCardReturnTimeout = window.setTimeout(() => {
      messageCard.classList.remove('battle-select-card--animating');
      messageCard.focus({ preventScroll: true });
    }, MESSAGE_CARD_FOCUS_DELAY);
  };

  messageCard.addEventListener('click', openOverlay);

  messageCard.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openOverlay();
    }
  });

  battleOverlay.addEventListener('click', (event) => {
    if (event.target === battleOverlay) {
      closeOverlay();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOverlay();
    }
  });

  if (battleButton) {
    battleButton.addEventListener('click', () => {
      window.location.href = 'html/battle.html';
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapLanding);
} else {
  bootstrapLanding();
}
