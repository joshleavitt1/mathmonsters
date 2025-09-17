const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';

const PRELOADER_TIPS = [
  { threshold: 0, text: 'Warming the coral reefs...' },
  { threshold: 12, text: 'Charting the shimmering currents...' },
  { threshold: 28, text: 'Charging bubble shields...' },
  { threshold: 48, text: 'Summoning the Reef Rangers...' },
  { threshold: 72, text: 'Tuning tide-tech gear...' },
  { threshold: 90, text: 'Securing treasure caches...' },
];

const PRELOADER_COMPLETE_MESSAGE = 'Dive in — the reef is ready!';
const PRELOAD_STAGE_ONE_WEIGHT = 0.25;
const PRELOAD_STAGE_TWO_WEIGHT = 0.75;

const preloaderElement = document.querySelector('[data-preloader]');
const preloaderProgressValue = preloaderElement?.querySelector(
  '[data-preloader-progress]'
);
const preloaderProgressFill = preloaderElement?.querySelector(
  '[data-preloader-bar]'
);
const preloaderTipElement = preloaderElement?.querySelector('[data-preloader-tip]');
const preloaderProgressRegion = preloaderElement?.querySelector(
  '[data-preloader-progress-container]'
);

let lastPreloaderPercent = 0;
let currentPreloaderTip =
  (preloaderTipElement?.textContent || '').trim() || PRELOADER_TIPS[0].text;
let preloaderFinished = false;

const clampPercent = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

const updatePreloaderProgress = (percentValue) => {
  const boundedPercent = clampPercent(percentValue);
  const displayPercent = Math.max(lastPreloaderPercent, boundedPercent);
  lastPreloaderPercent = displayPercent;

  if (preloaderElement) {
    if (preloaderProgressValue) {
      preloaderProgressValue.textContent = `${displayPercent}%`;
    }
    if (preloaderProgressFill) {
      preloaderProgressFill.style.setProperty('--progress', `${displayPercent}%`);
      preloaderProgressFill.style.width = `${displayPercent}%`;
    }
    if (preloaderProgressRegion) {
      preloaderProgressRegion.setAttribute('aria-valuenow', `${displayPercent}`);
    }
    if (preloaderTipElement && PRELOADER_TIPS.length) {
      let selectedTip = currentPreloaderTip;
      for (const tip of PRELOADER_TIPS) {
        if (displayPercent >= tip.threshold) {
          selectedTip = tip.text;
        } else {
          break;
        }
      }
      if (selectedTip && selectedTip !== currentPreloaderTip) {
        preloaderTipElement.textContent = selectedTip;
        currentPreloaderTip = selectedTip;
      }
    }
  }
};

const finishPreloader = () => {
  if (preloaderFinished) {
    document.body.classList.remove('is-preloading');
    return;
  }
  preloaderFinished = true;
  updatePreloaderProgress(100);

  if (!preloaderElement) {
    document.body.classList.remove('is-preloading');
    return;
  }

  if (preloaderTipElement) {
    preloaderTipElement.textContent = PRELOADER_COMPLETE_MESSAGE;
  }

  preloaderElement.classList.add('preloader--complete');
  preloaderElement.setAttribute('aria-hidden', 'true');

  const releaseLanding = () => {
    document.body.classList.remove('is-preloading');
  };

  window.requestAnimationFrame(() => {
    preloaderElement.classList.add('preloader--hidden');
    releaseLanding();
  });

  window.setTimeout(releaseLanding, 600);
  window.setTimeout(() => {
    if (preloaderElement.parentElement) {
      preloaderElement.parentElement.removeChild(preloaderElement);
    }
  }, 900);
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

  document
    .querySelectorAll('img[src]')
    .forEach((img) => addImageAsset(img.getAttribute('src')));

  const stageOneTotal = 2;
  let stageOneCompleted = 0;
  let stageTwoCompleted = 0;
  let stageTwoTotal = 0;
  let stageTwoRegistered = false;

  const recalcProgress = () => {
    const stageOneProgress =
      stageOneTotal > 0 ? stageOneCompleted / stageOneTotal : 1;
    const stageTwoProgress = stageTwoRegistered
      ? stageTwoTotal > 0
        ? stageTwoCompleted / stageTwoTotal
        : 1
      : 0;
    const totalProgress =
      stageOneProgress * PRELOAD_STAGE_ONE_WEIGHT +
      stageTwoProgress * PRELOAD_STAGE_TWO_WEIGHT;
    updatePreloaderProgress(totalProgress * 100);
  };

  const loadJsonStageOne = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to preload ${url}`);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      stageOneCompleted += 1;
      recalcProgress();
    }
  };

  try {
    recalcProgress();

    const [levelsData, variablesData] = await Promise.all([
      loadJsonStageOne('data/levels.json'),
      loadJsonStageOne('data/variables.json'),
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
    stageTwoTotal = imagePaths.length + questionPaths.length;
    stageTwoRegistered = true;

    if (stageTwoTotal === 0) {
      stageTwoTotal = 1;
      stageTwoCompleted = 1;
      recalcProgress();
      return results;
    }

    const markStageTwoComplete = () => {
      stageTwoCompleted += 1;
      recalcProgress();
    };

    const preloadQuestion = async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to preload ${url}`);
        }
        await response.json();
      } catch (error) {
        console.warn(error);
      } finally {
        markStageTwoComplete();
      }
    };

    const preloadImage = (src) =>
      new Promise((resolve) => {
        if (!src) {
          markStageTwoComplete();
          resolve(false);
          return;
        }
        const image = new Image();
        image.decoding = 'async';
        const finalize = (success) => {
          if (!success) {
            console.warn(`Failed to preload image: ${src}`);
          }
          markStageTwoComplete();
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
    recalcProgress();
  } catch (error) {
    console.error('Failed to preload landing assets.', error);
  } finally {
    finishPreloader();
  }

  return results;
};

const initLandingInteractions = (preloadedData = {}) => {
  markLandingVisited();
  randomizeBubbleTimings();
  const messageCard = document.querySelector('.battle-select-card');
  const battleOverlay = document.getElementById('battle-overlay');
  const battleButton = battleOverlay?.querySelector('.battle-btn');
  const messageTitle = messageCard?.querySelector('[data-battle-math]');
  const messageSubtitle = messageCard?.querySelector('[data-battle-title]');
  const messageEnemy = messageCard?.querySelector('[data-battle-enemy]');
  const overlayMath = battleOverlay?.querySelector('.math-type');
  const overlayEnemy = battleOverlay?.querySelector('.enemy-image');
  const overlayBattleTitle = battleOverlay?.querySelector('.battle-title');
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

      const { battleLevel, name, battle } = activeLevel;
      const mathLabel =
        activeLevel.mathType ?? battle?.mathType ?? 'Math Mission';
      const enemy = battle?.enemy ?? {};
      const enemySprite = typeof enemy.sprite === 'string' ? enemy.sprite : '';
      const enemyAlt = enemy?.name
        ? `${enemy.name} ready for battle`
        : 'Enemy ready for battle';

      if (messageTitle) {
        messageTitle.textContent = mathLabel;
      }

      if (messageSubtitle) {
        const label = name ||
          (typeof battleLevel === 'number'
            ? `Battle ${battleLevel}`
            : 'Upcoming Battle');
        messageSubtitle.textContent = label;
      }

      if (messageEnemy) {
        if (enemySprite) {
          messageEnemy.src = enemySprite;
        }
        messageEnemy.alt = enemyAlt;
      }

      if (overlayMath) {
        overlayMath.textContent = mathLabel;
      }

      if (overlayBattleTitle) {
        const label = name ||
          (typeof battleLevel === 'number'
            ? `Battle ${battleLevel}`
            : 'Battle');
        overlayBattleTitle.textContent = label;
      }

      if (overlayEnemy) {
        if (enemySprite) {
          overlayEnemy.src = enemySprite;
        }
        overlayEnemy.alt = enemyAlt;
      }

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
    finishPreloader();
    initLandingInteractions({});
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapLanding);
} else {
  bootstrapLanding();
}
