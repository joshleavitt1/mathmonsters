const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const MIN_PRELOAD_DURATION_MS = 2000;

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

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
  const results = { levelsData: null, variablesData: null };
  const imageAssets = new Set(['images/background/background.png']);
  const questionFiles = new Set();

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
    const [levelsData, variablesData] = await Promise.all([
      loadJson('data/levels.json'),
      loadJson('data/variables.json'),
    ]);

    results.levelsData = levelsData;
    results.variablesData = variablesData;

    if (Array.isArray(levelsData?.levels)) {
      levelsData.levels.forEach((level) => {
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

    if (Array.isArray(variablesData?.user?.battles)) {
      variablesData.user.battles.forEach((battleEntry) => {
        addImageAsset(battleEntry?.hero?.sprite);
      });
    }

    const imagePaths = Array.from(imageAssets);
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
  const battleMathElements = document.querySelectorAll('[data-battle-math]');
  const battleTitleElements = document.querySelectorAll('[data-battle-title]');
  const battleEnemyElements = document.querySelectorAll('[data-battle-enemy]');
  const heroImage = document.querySelector('.hero');
  const overlayAccuracy = battleOverlay?.querySelector('.accuracy-value');
  const overlayTime = battleOverlay?.querySelector('.time-value');

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

      const rawVariablesData =
        variablesData && typeof variablesData === 'object' ? variablesData : {};
      const mergedVariables = { ...rawVariablesData };
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
        mergedVariables.progress = mergedProgress;
      } else if (
        rawVariablesData &&
        typeof rawVariablesData.progress === 'object' &&
        !mergedVariables.progress
      ) {
        mergedVariables.progress = { ...rawVariablesData.progress };
      }

      variablesData = mergedVariables;

      const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];

      if (!levels.length) {
        return;
      }

      const progressLevel = variablesData?.progress?.battleLevel;
      const activeLevel =
        levels.find((level) => level?.battleLevel === progressLevel) ??
        levels[0];

      if (!activeLevel) {
        return;
      }

      const userBattles = Array.isArray(variablesData?.user?.battles)
        ? variablesData.user.battles
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

      if (heroImage) {
        const heroSprite =
          typeof heroData?.sprite === 'string' ? heroData.sprite.trim() : '';
        if (heroSprite) {
          heroImage.src = heroSprite;
        }
        const heroName =
          typeof heroData?.name === 'string' ? heroData.name.trim() : '';
        heroImage.alt = heroName
          ? `${heroName} swimming into view`
          : 'Hero ready for battle';
      }

      const { battleLevel, name, battle } = activeLevel;
      const mathLabelSource =
        typeof activeLevel.mathType === 'string'
          ? activeLevel.mathType
          : typeof battle?.mathType === 'string'
          ? battle.mathType
          : 'Math Mission';
      const mathLabel = mathLabelSource.trim() || 'Math Mission';
      const enemy = battle?.enemy ?? {};
      const enemySprite = typeof enemy.sprite === 'string' ? enemy.sprite : '';
      const enemyName =
        typeof enemy?.name === 'string' ? enemy.name.trim() : '';
      const enemyAlt = enemyName
        ? `${enemyName} ready for battle`
        : 'Enemy ready for battle';

      const levelName = typeof name === 'string' ? name.trim() : '';
      const battleTitleLabel =
        levelName ||
        (typeof battleLevel === 'number'
          ? `Battle ${battleLevel}`
          : 'Upcoming Battle');

      battleMathElements.forEach((element) => {
        element.textContent = mathLabel;
      });

      battleTitleElements.forEach((element) => {
        element.textContent = battleTitleLabel;
      });

      battleEnemyElements.forEach((element) => {
        if (element instanceof HTMLImageElement || element.tagName === 'IMG') {
          if (enemySprite) {
            element.src = enemySprite;
          }
          element.alt = enemyAlt;
        }
      });

      const accuracyGoal =
        typeof battle?.accuracyGoal === 'number'
          ? Math.round(battle.accuracyGoal * 100)
          : null;
      if (overlayAccuracy) {
        overlayAccuracy.textContent =
          accuracyGoal !== null ? `${accuracyGoal}%` : '0%';
      }

      const timeGoal =
        typeof battle?.timeGoalSeconds === 'number'
          ? `${battle.timeGoalSeconds}s`
          : null;
      if (overlayTime) {
        overlayTime.textContent = timeGoal ?? '0s';
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
