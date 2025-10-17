const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';
const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'mathmonstersProgress';
const GUEST_SESSION_KEY = 'mathmonstersGuestSession';

const MONSTER_DEFEAT_ANIMATION_DELAY = 1000;
const VICTORY_PROGRESS_UPDATE_DELAY = MONSTER_DEFEAT_ANIMATION_DELAY + 1000;
const DEFEAT_PROGRESS_UPDATE_DELAY = 1000;
const LEVEL_PROGRESS_ANIMATION_DELAY_MS = 0;
const REWARD_CARD_DELAY_MS = 2000;
const INITIAL_QUESTION_DELAY_MS = 2000;
const HERO_EVOLUTION_GROWTH_DURATION_MS = 1100;
const HERO_EVOLUTION_GROWTH_ITERATIONS = 1;
const HERO_EVOLUTION_REVEAL_DURATION_MS = 1100;
const HERO_EVOLUTION_GROWTH_START_DELAY_MS = 1000;
const HERO_EVOLUTION_CARD_REVEAL_DELAY_MS = 2000;
const REWARD_CARD_CLOSE_DURATION_MS = 1000;
const REWARD_SPRITE_SWAP_DURATION_MS = 400;
const REWARD_SPRITE_HOLD_DURATION_MS = 1000;
const SPRITE_ENTRANCE_READY_DELAY_MS = 1400;
const GEM_REWARD_WIN_AMOUNT = 5;
const GEM_REWARD_LOSS_AMOUNT = 1;
const GEM_REWARD_INITIAL_PAUSE_MS = 500;
const GEM_REWARD_CARD_DELAY_MS = 400;
const GEM_REWARD_PULSE_DURATION_MS = 2100;
const GEM_REWARD_PULSE_COUNT = 1;
const GEM_REWARD_CHEST_SRC = '../images/complete/chest.png';
const GEM_REWARD_GEM_SRC = '../images/complete/gem.png';
const GEM_REWARD_HOME_ANIMATION_KEY = 'mathmonstersGemRewardAnimation';
const REGISTER_PAGE_URL = './register.html';
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const BATTLES_PER_LEVEL = 4;
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const GLOBAL_REWARD_MILESTONE = 5;
const GLOBAL_PROGRESS_REVEAL_DELAY_MS = 1000;

const progressUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersProgress) || null;

const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

const INTRO_QUESTION_LEVELS = new Set([1]);

const MEDAL_DISPLAY_DURATION_MS = 3000;
const LEVEL_ONE_FIRST_CORRECT_MEDAL_KEY = 'level-1:first-correct';
const DEV_DAMAGE_AMOUNT = 100;
const DEV_SKIP_TARGET_LEVEL = 4;

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

const readVisitedFlag = (storage, label) => {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(LANDING_VISITED_KEY) === VISITED_VALUE;
  } catch (error) {
    console.warn(`${label} storage is not available.`, error);
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

const hasVisitedLanding = () => {
  const sessionVisited = readVisitedFlag(sessionStorage, 'Session');
  if (sessionVisited === true) {
    return true;
  }
  if (sessionVisited === null) {
    return true;
  }

  const localVisited = readVisitedFlag(localStorage, 'Local');
  if (localVisited === true) {
    setVisitedFlag(sessionStorage, 'Session');
    return true;
  }
  if (localVisited === null) {
    return true;
  }

  return false;
};

const landingVisited = hasVisitedLanding();

if (!landingVisited) {
  window.location.replace('../index.html');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!landingVisited) {
    return;
  }
  const battleField = document.getElementById('battle');
  const monsterImg = document.getElementById('battle-monster');
  const heroImg = document.getElementById('battle-shellfin');
  const monsterAttackEffect = document.getElementById('monster-attack-effect');
  const heroAttackEffect = document.getElementById('hero-attack-effect');
  const devHeroDamageButton = document.getElementById('dev-hero-damage-button');
  const devMonsterDamageButton = document.getElementById(
    'dev-monster-damage-button'
  );
  const devSkipBattleButton = document.getElementById('dev-skip-battle-button');
  const monsterHpBar = document.querySelector('#monster-stats .battle-health');
  const monsterHpFill = monsterHpBar?.querySelector('.progress__fill') ?? null;
  const heroHpBar = document.querySelector('#shellfin-stats .battle-health');
  const heroHpFill = heroHpBar?.querySelector('.progress__fill') ?? null;
  const monsterNameEl = document.querySelector('#monster-stats .name');
  const heroNameEl = document.querySelector('#shellfin-stats .name');
  const monsterStats = document.getElementById('monster-stats');
  const heroStats = document.getElementById('shellfin-stats');

  const questionBox = document.getElementById('question');
  const questionText = questionBox.querySelector('.question-text');
  const choicesEl = questionBox.querySelector('.choices');
  const questionSpritesContainer = questionBox.querySelector(
    '[data-question-sprites]'
  );
  const bannerAccuracyValue = document.querySelector('[data-banner-accuracy]');
  const bannerTimeValue = document.querySelector('[data-banner-time]');
  const heroAttackVal = heroStats.querySelector('.attack .value');
  const heroHealthVal = heroStats.querySelector('.health .value');
  const heroAttackInc = heroStats.querySelector('.attack .increase');
  const monsterAttackVal = monsterStats.querySelector('.attack .value');
  const monsterHealthVal = monsterStats.querySelector('.health .value');

  const completeMessage = document.getElementById('complete-message');
  const battleCompleteTitle = completeMessage?.querySelector('#battle-complete-title');
  const spriteSurface = completeMessage?.querySelector('[data-battle-complete-sprite-surface]');
  const SPRITE_SURFACE_HIDDEN_CLASS = 'battle-complete-card__sprite-surface--hidden';
  const globalProgressContainer = completeMessage?.querySelector('[data-global-progress]');
  const globalProgressBar = globalProgressContainer?.querySelector('[role="progressbar"]');
  const globalProgressFill = globalProgressContainer?.querySelector(
    '[data-global-progress-fill]'
  );
  const globalProgressHeading = completeMessage?.querySelector(
    '[data-global-progress-heading]'
  );
  const globalProgressCount = completeMessage?.querySelector('[data-global-progress-count]');
  const GLOBAL_PROGRESS_DIM_CLASS = 'battle-complete-card__reward-progress--dim';
  const GLOBAL_PROGRESS_HEADING_TEXT = 'Reward Meter';
  const completeMonsterImg = completeMessage?.querySelector('.monster-image');
  const COMPLETE_MONSTER_REWARD_SRC = GEM_REWARD_CHEST_SRC;
  const COMPLETE_MONSTER_REWARD_ALT = 'Treasure chest reward';
  const monsterDefeatOverlay = completeMessage?.querySelector('[data-monster-defeat-overlay]');
  const summaryAccuracyStat = completeMessage?.querySelector('[data-goal="accuracy"]');
  const summaryTimeStat = completeMessage?.querySelector('[data-goal="time"]');
  const summaryAccuracyValue = summaryAccuracyStat?.querySelector('.summary-accuracy');
  const summaryTimeValue = summaryTimeStat?.querySelector('.summary-time');
  const nextMissionBtn = completeMessage?.querySelector('.next-mission-btn');
  const levelProgressMeter = completeMessage?.querySelector(
    '.battle-complete-card__meter .meter__progress'
  );
  const levelProgressFill = levelProgressMeter?.querySelector('.progress__fill');
  const rewardOverlay = document.querySelector('[data-reward-overlay]');
  const rewardSprite = rewardOverlay?.querySelector('[data-reward-sprite]');
  const rewardCard = rewardOverlay?.querySelector('[data-reward-card]');
  const rewardCardText = rewardCard?.querySelector('.reward-overlay__card-text');
  const rewardCardButton = rewardCard?.querySelector('[data-reward-card-button]');
  const rewardCardAvatar = rewardCard?.querySelector('[data-reward-card-avatar]');
  const rewardDevSkipButton = rewardOverlay?.querySelector('[data-reward-dev-skip]');
  const evolutionOverlay = document.querySelector('[data-evolution-overlay]');
  const evolutionCurrentSprite = evolutionOverlay?.querySelector(
    '[data-evolution-current]'
  );
  const evolutionNextSprite = evolutionOverlay?.querySelector(
    '[data-evolution-next]'
  );
  const evolutionCompleteOverlay = document.querySelector(
    '[data-evolution-complete-overlay]'
  );
  const evolutionCompleteButton = evolutionCompleteOverlay?.querySelector(
    '[data-evolution-complete-button]'
  );
  const evolutionCompleteSprite = evolutionCompleteOverlay?.querySelector(
    '[data-evolution-complete-sprite]'
  );

  const medalElement = document.querySelector('[data-medal]');
  let medalHideTimeoutId = null;
  let medalFinalizeTimeoutId = null;
  const displayedMedals = new Set();

  const finalizeMedalHide = () => {
    if (!medalElement || medalElement.classList.contains('medal--visible')) {
      return;
    }

    medalElement.setAttribute('aria-hidden', 'true');
    if (!medalElement.hasAttribute('hidden')) {
      medalElement.setAttribute('hidden', 'hidden');
    }
  };

  const hideMedal = ({ immediate = false } = {}) => {
    if (!medalElement) {
      return;
    }

    if (medalHideTimeoutId !== null) {
      window.clearTimeout(medalHideTimeoutId);
      medalHideTimeoutId = null;
    }

    if (medalFinalizeTimeoutId !== null) {
      window.clearTimeout(medalFinalizeTimeoutId);
      medalFinalizeTimeoutId = null;
    }

    const removeVisibility = () => {
      medalElement.classList.remove('medal--visible');
      medalElement.classList.remove('medal--pop');
    };

    if (immediate) {
      removeVisibility();
      finalizeMedalHide();
      return;
    }

    const handleTransitionEnd = (event) => {
      if (event.target !== medalElement || event.propertyName !== 'opacity') {
        return;
      }
      medalElement.removeEventListener('transitionend', handleTransitionEnd);
      finalizeMedalHide();
    };

    medalElement.addEventListener('transitionend', handleTransitionEnd, {
      once: true,
    });

    removeVisibility();

    medalFinalizeTimeoutId = window.setTimeout(() => {
      medalFinalizeTimeoutId = null;
      finalizeMedalHide();
    }, 450);
  };

  const showMedal = () => {
    if (!medalElement) {
      return;
    }

    if (medalHideTimeoutId !== null) {
      window.clearTimeout(medalHideTimeoutId);
      medalHideTimeoutId = null;
    }

    if (medalFinalizeTimeoutId !== null) {
      window.clearTimeout(medalFinalizeTimeoutId);
      medalFinalizeTimeoutId = null;
    }

    medalElement.classList.remove('medal--pop');
    medalElement.removeAttribute('hidden');
    void medalElement.offsetWidth;
    medalElement.setAttribute('aria-hidden', 'false');
    medalElement.classList.add('medal--visible', 'medal--pop');

    medalHideTimeoutId = window.setTimeout(() => {
      medalHideTimeoutId = null;
      hideMedal();
    }, MEDAL_DISPLAY_DURATION_MS);
  };

  if (medalElement) {
    medalElement.addEventListener('animationend', (event) => {
      if (event.target !== medalElement || event.animationName !== 'medal-pop') {
        return;
      }

      medalElement.classList.remove('medal--pop');
    });
  }

  const summaryAccuracyText = ensureStatValueText(summaryAccuracyValue);
  const summaryTimeText = ensureStatValueText(summaryTimeValue);

  const defaultRewardCardText =
    rewardCardText && typeof rewardCardText.textContent === 'string'
      ? rewardCardText.textContent.trim()
      : 'I made this gem from the monster. Can you guess what it does?';
  const defaultRewardCardButtonText =
    rewardCardButton && typeof rewardCardButton.textContent === 'string'
      ? rewardCardButton.textContent.trim()
      : 'Use Gem';
  const defaultRewardCardImageSrc =
    rewardCardAvatar && typeof rewardCardAvatar.getAttribute === 'function'
      ? rewardCardAvatar.getAttribute('src')
      : null;
  const defaultRewardCardImageAlt =
    rewardCardAvatar && typeof rewardCardAvatar.getAttribute === 'function'
      ? rewardCardAvatar.getAttribute('alt')
      : null;
  const REGISTER_REWARD_CARD_TEXT =
    'Your creature just evolved! It’s stronger now and ready for new adventures!';
  const REGISTER_REWARD_CARD_BUTTON_TEXT = 'Register Now';

  const waitForImageToSettle = (image) =>
    new Promise((resolve) => {
      if (!image) {
        resolve(false);
        return;
      }

      if (image.complete) {
        resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
        return;
      }

      let settled = false;
      const finalize = () => {
        if (settled) {
          return;
        }
        settled = true;
        image.removeEventListener('load', finalize);
        image.removeEventListener('error', finalize);
        resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      };

      image.addEventListener('load', finalize, { once: true });
      image.addEventListener('error', finalize, { once: true });

      if (typeof image.decode === 'function') {
        image
          .decode()
          .then(finalize)
          .catch(() => {});
      }
    });

  const HERO_SPRITE_WIDTH_PROPERTY = '--battle-hero-sprite-width';
  const HERO_SPRITE_MAX_WIDTH_PROPERTY = '--battle-hero-sprite-max-width';

  const createHeroSpriteCustomPropertyUpdater = (image) => {
    if (!image) {
      return () => Promise.resolve(false);
    }

    const rootElement = image.ownerDocument?.documentElement ?? document.documentElement;

    if (!rootElement) {
      return () => Promise.resolve(false);
    }

    let latestUpdateId = 0;

    const clearSpriteDimensions = () => {
      rootElement.style.removeProperty(HERO_SPRITE_WIDTH_PROPERTY);
      rootElement.style.removeProperty(HERO_SPRITE_MAX_WIDTH_PROPERTY);
    };

    const readHeroSpriteDefaultWidth = () => {
      const defaultView =
        rootElement.ownerDocument?.defaultView ??
        (typeof window !== 'undefined' ? window : null);

      if (!defaultView || typeof defaultView.getComputedStyle !== 'function') {
        return null;
      }

      try {
        const computedStyle = defaultView.getComputedStyle(rootElement);
        const propertyValue = computedStyle.getPropertyValue(HERO_SPRITE_WIDTH_PROPERTY);
        const parsedWidth = Number.parseFloat(propertyValue);

        if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
          return parsedWidth;
        }
      } catch (error) {
        console.warn('Unable to read default hero sprite width.', error);
      }

      return null;
    };

    const heroSpriteDefaultWidth = readHeroSpriteDefaultWidth();

    const applySpriteDimensions = () => {
      const naturalWidth = Math.round(image.naturalWidth || 0);
      const naturalHeight = Math.round(image.naturalHeight || 0);

      if (naturalWidth > 0 && naturalHeight > 0) {
        const clampedWidth = heroSpriteDefaultWidth
          ? Math.min(naturalWidth, heroSpriteDefaultWidth)
          : naturalWidth;
        const widthValue = `${clampedWidth}px`;
        const maxWidthValue = `min(${widthValue}, 80vw)`;
        rootElement.style.setProperty(HERO_SPRITE_WIDTH_PROPERTY, widthValue);
        rootElement.style.setProperty(HERO_SPRITE_MAX_WIDTH_PROPERTY, maxWidthValue);
        return true;
      }

      clearSpriteDimensions();
      return false;
    };

    return () => {
      const updateId = ++latestUpdateId;

      const finalize = () => {
        if (updateId !== latestUpdateId) {
          return false;
        }

        if (image.naturalWidth > 0 && image.naturalHeight > 0) {
          return applySpriteDimensions();
        }

        clearSpriteDimensions();
        return false;
      };

      if (image.complete) {
        return Promise.resolve(finalize());
      }

      return waitForImageToSettle(image)
        .then(finalize)
        .catch(() => {
          if (updateId === latestUpdateId) {
            clearSpriteDimensions();
          }
          return false;
        });
    };
  };

  const updateHeroSpriteCustomProperties = createHeroSpriteCustomPropertyUpdater(heroImg);

  if (bannerAccuracyValue) bannerAccuracyValue.textContent = '100%';
  if (bannerTimeValue) bannerTimeValue.textContent = '0s';
  if (summaryAccuracyText) summaryAccuracyText.textContent = '100%';
  if (summaryTimeText) summaryTimeText.textContent = '0s';

  const MIN_STREAK_GOAL = 1;
  const MAX_STREAK_GOAL = 5;
  const DEFAULT_STREAK_GOAL = 3;
  const STREAK_GOAL = Math.min(
    Math.max(DEFAULT_STREAK_GOAL, MIN_STREAK_GOAL),
    MAX_STREAK_GOAL
  );

  const QUESTION_TYPE_CONFIG = [
    { type: 'type1', key: 'type1_multipleChoiceMath' },
    { type: 'type2', key: 'type2_countTheBubbles' },
    { type: 'type3', key: 'type3_fillInTheBlank' },
  ];
  const QUESTION_TYPE_SEQUENCE = QUESTION_TYPE_CONFIG.map((config) => config.type);

  let questions = [];
  let questionIds = [];
  let questionMap = new Map();
  let currentQuestionId = null;
  let totalQuestionCount = 0;
  let streak = 0;
  let streakMaxed = false;
  let useIntroQuestionOrder = false;
  let introQuestionIds = [];
  let nextIntroQuestionIndex = 0;
  let useStructuredQuestions = false;
  let structuredQuestionPools = new Map();
  let structuredQuestionTypeIndex = 0;
  let levelOneStructuredSequence = [];
  let levelOneStructuredIndex = 0;
  let useLevelOneSequence = false;

  const sanitizeLevelNumber = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null;
    }

    return Math.max(1, Math.floor(numericValue));
  };

  const getResolvedCurrentLevel = () => {
    const storedLevel = sanitizeLevelNumber(currentCurrentLevel);
    const battleLevel = sanitizeLevelNumber(window.preloadedData?.level?.currentLevel);

    if (battleLevel !== null && (storedLevel === null || battleLevel > storedLevel)) {
      return battleLevel;
    }

    if (storedLevel !== null) {
      return storedLevel;
    }

    return battleLevel;
  };

  const shuffleArray = (values) => {
    if (!Array.isArray(values)) {
      return [];
    }

    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const temp = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = temp;
    }
    return copy;
  };
  let correctAnswers = 0;
  let totalAnswers = 0;
  let wrongAnswers = 0;
  let accuracyGoal = null;
  let timeGoalSeconds = 0;
  let timeRemaining = 0;
  let initialTimeRemaining = 0;
  let battleTimerDeadline = null;
  let battleTimerInterval = null;
  let battleEnded = false;
  let currentCurrentLevel = null;
  let battleStartTime = null;
  let currentLevelAdvanced = false;
  let battleGoalsMet = false;
  let heroSuperAttackBase = null;
  let monsterDefeatAnimationTimeout = null;
  let levelExperienceEarned = 0;
  let levelExperienceRequirement = 0;
  let levelUpAvailable = false;
  let hasPendingLevelUpReward = false;
  let rewardAnimationPlayed = false;
  let pendingGemReward = null;
  let gemRewardIntroShown = false;
  let shouldAdvanceCurrentLevel = false;
  let nextMissionProcessing = false;
  let levelProgressUpdateTimeout = null;
  let levelProgressAnimationTimeout = null;
  let rewardCardButtonHandler = null;
  let evolutionGrowthStartTimeout = null;
  let evolutionGrowthFallbackTimeout = null;
  let evolutionRevealFallbackTimeout = null;
  let evolutionCardDelayTimeout = null;
  let globalRewardProgress = {
    milestoneSize: GLOBAL_REWARD_MILESTONE,
    winsSinceReward: 0,
    totalWins: 0,
  };
  let latestGlobalRewardDisplay = null;
  let globalProgressRevealTimeout = null;
  let pendingGlobalProgressValue = 0;

  const maybeShowFirstCorrectMedal = (resolvedLevel, correctCount) => {
    if (!medalElement) {
      return;
    }

    if (!Number.isFinite(resolvedLevel) || resolvedLevel !== 1) {
      return;
    }

    if (displayedMedals.has(LEVEL_ONE_FIRST_CORRECT_MEDAL_KEY)) {
      return;
    }

    if (correctCount !== 1) {
      return;
    }

    displayedMedals.add(LEVEL_ONE_FIRST_CORRECT_MEDAL_KEY);
    hideMedal({ immediate: true });
  };
  let evolutionInProgress = false;
  let heroEvolutionStartedAtInitialStage = false;
  let rewardCardDisplayTimeout = null;
  let heroSpriteReadyPromise = null;

  if (heroImg) {
    heroSpriteReadyPromise = updateHeroSpriteCustomProperties();
  }

  const rewardGlowStyleProperties = [
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

  const REWARD_GEM_SRC = GEM_REWARD_GEM_SRC;
  const HERO_LEVEL_1_SRC = '../images/hero/shellfin_evolution_1.png';
  const HERO_LEVEL_2_SRC = '../images/hero/shellfin_evolution_2.png';

  const rewardSpritePreloadCache = new Map();

  const resolveRewardSpriteSource = (src) => {
    if (typeof src !== 'string') {
      return null;
    }

    const trimmed = src.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return new URL(trimmed, document.baseURI).href;
    } catch (error) {
      return trimmed;
    }
  };

  const preloadRewardSpriteSource = (src) => {
    const resolved = resolveRewardSpriteSource(src);
    if (!resolved) {
      return Promise.resolve(null);
    }

    if (rewardSpritePreloadCache.has(resolved)) {
      return rewardSpritePreloadCache.get(resolved);
    }

    const preloadPromise = new Promise((resolve) => {
      const image = new Image();
      let settled = false;

      const finalize = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(resolved);
      };

      image.addEventListener('error', finalize, { once: true });
      image.addEventListener(
        'load',
        () => {
          if (typeof image.decode === 'function') {
            image
              .decode()
              .then(finalize)
              .catch(finalize);
            return;
          }

          finalize();
        },
        { once: true }
      );

      image.decoding = 'async';
      image.src = resolved;
    });

    rewardSpritePreloadCache.set(resolved, preloadPromise);
    return preloadPromise;
  };

  const rewardSpriteSources = {
    gem: resolveRewardSpriteSource(REWARD_GEM_SRC) || REWARD_GEM_SRC,
    chest: resolveRewardSpriteSource(GEM_REWARD_CHEST_SRC) || GEM_REWARD_CHEST_SRC,
  };

  Object.values(rewardSpriteSources).forEach((source) => {
    preloadRewardSpriteSource(source).catch(() => {});
  });

  const COMPLETE_MONSTER_REWARD_SRC_RESOLVED =
    resolveRewardSpriteSource(COMPLETE_MONSTER_REWARD_SRC) ||
    COMPLETE_MONSTER_REWARD_SRC;

  if (completeMonsterImg) {
    completeMonsterImg.src = COMPLETE_MONSTER_REWARD_SRC_RESOLVED;
    completeMonsterImg.alt = COMPLETE_MONSTER_REWARD_ALT;

    if (completeMonsterImg.dataset) {
      completeMonsterImg.dataset.staticSprite = 'true';
      completeMonsterImg.dataset.staticAlt = COMPLETE_MONSTER_REWARD_ALT;
    } else {
      completeMonsterImg.setAttribute('data-static-sprite', 'true');
      completeMonsterImg.setAttribute('data-static-alt', COMPLETE_MONSTER_REWARD_ALT);
    }
  }

  const sanitizeHeroSpritePath = (path) => {
    if (typeof path !== 'string') {
      return path;
    }

    return path.replace(
      /(shellfin)_(?:level|evolution)_(\d+)((?:\.[a-z0-9]+)?)(?=[?#]|$)/gi,
      (match, heroName, level, extension = '') => {
        const parsedLevel = Number(level);
        const safeLevel = Number.isFinite(parsedLevel)
          ? Math.max(parsedLevel, 1)
          : 1;

        return `${heroName}_evolution_${safeLevel}${extension || ''}`;
      }
    );
  };

  const HERO_PROFILE_EVOLUTION_SPRITE = sanitizeHeroSpritePath(
    'images/hero/shellfin_evolution_3.png'
  );
  const HERO_PROFILE_EVOLUTION_ATTACK_SPRITE = sanitizeHeroSpritePath(
    'images/hero/shellfin_attack_3.png'
  );
  const HERO_BATTLE_EVOLUTION_SPRITE = sanitizeHeroSpritePath(
    '../images/hero/shellfin_evolution_3.png'
  );
  const HERO_BATTLE_EVOLUTION_ATTACK_SPRITE = sanitizeHeroSpritePath(
    '../images/hero/shellfin_attack_3.png'
  );
  const HERO_EVOLUTION_ATTACK_VALUE = 3;

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
      console.warn('Unable to read stored player profile during evolution.', error);
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

      storage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(player));
    } catch (error) {
      console.warn('Unable to persist evolved player profile.', error);
    }
  };

  const clonePlayerProfile = (player) => {
    if (!player || typeof player !== 'object') {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(player));
    } catch (error) {
      console.warn('Unable to clone player profile for persistence.', error);
      return null;
    }
  };

  const applyHeroSpriteUpdate = (heroEntry, options = {}) => {
    if (!heroEntry || typeof heroEntry !== 'object') {
      return;
    }

    const { sprite, attackSprite, attackValue } = options;

    if (typeof sprite === 'string') {
      heroEntry.sprite = sprite;
    }

    if (typeof attackSprite === 'string') {
      heroEntry.attackSprite = attackSprite;

      if (
        heroEntry.attackSprites &&
        typeof heroEntry.attackSprites === 'object' &&
        heroEntry.attackSprites !== null
      ) {
        heroEntry.attackSprites.basic = attackSprite;
        if (!heroEntry.attackSprites.super) {
          heroEntry.attackSprites.super = attackSprite;
        }
      }
    }

    if (typeof attackValue === 'number' && Number.isFinite(attackValue)) {
      const currentAttack = Number(heroEntry.attack);
      if (!Number.isFinite(currentAttack) || currentAttack < attackValue) {
        heroEntry.attack = attackValue;
      }
    }
  };

  const updatePlayerHeroEntries = (playerData, options = {}) => {
    if (!playerData || typeof playerData !== 'object') {
      return;
    }

    if (playerData.hero && typeof playerData.hero === 'object') {
      applyHeroSpriteUpdate(playerData.hero, options);
    }

    if (
      playerData.currentLevel &&
      typeof playerData.currentLevel === 'object' &&
      playerData.currentLevel !== null
    ) {
      Object.values(playerData.currentLevel).forEach((entry) => {
        if (entry && typeof entry === 'object' && entry.hero) {
          applyHeroSpriteUpdate(entry.hero, options);
        }
      });
    }
  };

  const applyHeroEvolutionProfileUpdate = () => {
    const battleOptions = {
      sprite: HERO_BATTLE_EVOLUTION_SPRITE,
      attackSprite: HERO_BATTLE_EVOLUTION_ATTACK_SPRITE,
      attackValue: HERO_EVOLUTION_ATTACK_VALUE,
    };
    const profileOptions = {
      sprite: HERO_PROFILE_EVOLUTION_SPRITE,
      attackSprite: HERO_PROFILE_EVOLUTION_ATTACK_SPRITE,
      attackValue: HERO_EVOLUTION_ATTACK_VALUE,
    };

    if (window.preloadedData && typeof window.preloadedData === 'object') {
      updatePlayerHeroEntries(window.preloadedData.player, profileOptions);
      updatePlayerHeroEntries(window.preloadedData.playerData, profileOptions);
      updatePlayerHeroEntries(
        window.preloadedData.fallbackPlayerData,
        profileOptions
      );

      if (
        window.preloadedData.hero &&
        typeof window.preloadedData.hero === 'object'
      ) {
        applyHeroSpriteUpdate(window.preloadedData.hero, battleOptions);
      }

      if (
        window.preloadedData.previewData &&
        typeof window.preloadedData.previewData === 'object' &&
        window.preloadedData.previewData !== null &&
        window.preloadedData.previewData.hero &&
        typeof window.preloadedData.previewData.hero === 'object'
      ) {
        applyHeroSpriteUpdate(
          window.preloadedData.previewData.hero,
          battleOptions
        );
      }
    }

    if (
      window.mathMonstersBattleSnapshot &&
      typeof window.mathMonstersBattleSnapshot === 'object'
    ) {
      const snapshotHero =
        window.mathMonstersBattleSnapshot.hero &&
        typeof window.mathMonstersBattleSnapshot.hero === 'object'
          ? window.mathMonstersBattleSnapshot.hero
          : {};
      snapshotHero.sprite = HERO_BATTLE_EVOLUTION_SPRITE;
      window.mathMonstersBattleSnapshot.hero = snapshotHero;
    }

    const storedProfile = readStoredPlayerProfile();
    if (storedProfile) {
      updatePlayerHeroEntries(storedProfile, profileOptions);
      persistPlayerProfile(storedProfile);
    } else if (
      window.preloadedData &&
      typeof window.preloadedData === 'object' &&
      window.preloadedData.player &&
      typeof window.preloadedData.player === 'object'
    ) {
      const clonedProfile = clonePlayerProfile(window.preloadedData.player);
      if (clonedProfile) {
        updatePlayerHeroEntries(clonedProfile, profileOptions);
        persistPlayerProfile(clonedProfile);
      }
    }
  };

  const spriteElementCache =
    typeof window !== 'undefined' && window.mathMonstersSpriteCache instanceof Map
      ? window.mathMonstersSpriteCache
      : null;

  const toAbsoluteSpriteUrl = (path) => {
    if (typeof path !== 'string') {
      return null;
    }

    const trimmed = path.trim();
    if (!trimmed) {
      return null;
    }

    const sanitized = sanitizeHeroSpritePath(trimmed);

    if (/^data:/i.test(sanitized) || /^[a-z]+:/i.test(sanitized)) {
      return sanitized;
    }

    if (typeof document === 'undefined' || typeof document.baseURI !== 'string') {
      return sanitized;
    }

    try {
      return new URL(sanitized, document.baseURI).href;
    } catch (error) {
      return sanitized;
    }
  };

  const getPreloadedSpriteInfo = (...candidates) => {
    if (!spriteElementCache) {
      return null;
    }

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const absolute = toAbsoluteSpriteUrl(candidate);
      if (!absolute) {
        continue;
      }

      if (spriteElementCache.has(absolute)) {
        const cached = spriteElementCache.get(absolute);
        if (cached) {
          const currentSrc = cached.currentSrc || cached.src || absolute;
          return {
            src: currentSrc,
            key: absolute,
            image: cached,
          };
        }
      }
    }

    return null;
  };

  const applySpriteSource = (image, spriteInfo, fallbackSrc) => {
    if (!image) {
      return null;
    }

    const resolvedSrc =
      (spriteInfo && typeof spriteInfo.src === 'string' && spriteInfo.src.trim()) ||
      (typeof fallbackSrc === 'string' && fallbackSrc.trim()) ||
      null;

    if (!resolvedSrc) {
      return null;
    }

    const currentSrc = image.currentSrc || image.src || '';
    const normalizedCurrent = toAbsoluteSpriteUrl(currentSrc) || currentSrc;
    const normalizedNext = toAbsoluteSpriteUrl(resolvedSrc) || resolvedSrc;

    if (normalizedCurrent !== normalizedNext) {
      image.src = resolvedSrc;
    }

    return resolvedSrc;
  };

  const hero = {
    attack: 1,
    health: 5,
    damage: 0,
    name: 'Hero',
    attackSprites: {},
  };
  const monster = {
    attack: 1,
    health: 5,
    damage: 0,
    name: 'Monster',
    attackSprites: {},
  };

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    const fallbackParsed = Number(fallback);
    return Number.isFinite(fallbackParsed) ? fallbackParsed : 0;
  };

  const clampDamageToHealth = (damage, health) => {
    const resolvedHealth = toFiniteNumber(health, 0);
    const resolvedDamage = toFiniteNumber(damage, 0);
    if (resolvedHealth <= 0) {
      return Math.max(0, resolvedDamage);
    }
    return Math.max(0, Math.min(resolvedHealth, resolvedDamage));
  };

  const hasEntityBeenDefeated = (health, damage) => {
    const resolvedHealth = toFiniteNumber(health, 0);
    if (resolvedHealth <= 0) {
      return true;
    }
    const resolvedDamage = toFiniteNumber(damage, 0);
    return resolvedDamage >= resolvedHealth;
  };

  const clearTimeoutSafe = (timeoutId) => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    return null;
  };

  const clearRewardGlowStyles = () => {
    if (!rewardSprite) {
      return;
    }

    rewardSprite.classList.remove('pulsating-glow');
    rewardGlowStyleProperties.forEach((property) => {
      rewardSprite.style.removeProperty(property);
    });
  };

  const setRewardStage = (stage) => {
    if (!rewardSprite) {
      return;
    }

    if (!stage) {
      if (rewardSprite.dataset && 'rewardStage' in rewardSprite.dataset) {
        delete rewardSprite.dataset.rewardStage;
      } else {
        rewardSprite.removeAttribute('data-reward-stage');
      }
      return;
    }

    if (rewardSprite.dataset) {
      rewardSprite.dataset.rewardStage = stage;
    } else {
      rewardSprite.setAttribute('data-reward-stage', stage);
    }
  };

  const disableRewardSpriteInteraction = () => {
    if (!rewardSprite) {
      return;
    }

    rewardSprite.classList.remove('reward-overlay__image--interactive', 'pulsating-glow');
    rewardSprite.setAttribute('tabindex', '-1');
    rewardSprite.removeAttribute('aria-label');
    rewardSprite.removeAttribute('role');
    setRewardStage(null);
    clearRewardGlowStyles();
  };

  const resolveProgressRoot = () => {
    if (
      window.preloadedData &&
      window.preloadedData.player &&
      isPlainObject(window.preloadedData.player.progress)
    ) {
      return window.preloadedData.player.progress;
    }
    if (isPlainObject(window.preloadedData?.progress)) {
      return window.preloadedData.progress;
    }
    return null;
  };

  const resolveMathTypeKey = () => {
    const candidates = [
      window.preloadedData?.level?.mathType,
      window.preloadedData?.level?.mathTypeKey,
      window.preloadedData?.battle?.mathType,
      window.preloadedData?.battle?.mathTypeKey,
      window.preloadedData?.player?.currentMathType,
      window.preloadedData?.player?.mathType,
      window.preloadedData?.progress?.mathType,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return null;
  };

  const findMathProgressKey = (candidateKey) => {
    const progressRoot = resolveProgressRoot();
    const normalizedCandidate =
      typeof candidateKey === 'string' && candidateKey.trim()
        ? candidateKey.trim().toLowerCase()
        : '';

    if (progressRoot) {
      const keys = Object.keys(progressRoot);

      if (normalizedCandidate) {
        const directMatch = keys.find((key) => {
          if (typeof key !== 'string') {
            return false;
          }
          return key.trim().toLowerCase() === normalizedCandidate;
        });

        if (directMatch) {
          return directMatch;
        }
      }

      const fallback = keys.find((key) => isPlainObject(progressRoot[key]));
      if (fallback) {
        return fallback;
      }
    }

    if (typeof candidateKey === 'string' && candidateKey.trim()) {
      return candidateKey.trim();
    }

    return normalizedCandidate || null;
  };

  const resolveCurrentLevels = () =>
    Array.isArray(window.preloadedData?.levels)
      ? window.preloadedData.levels.filter(
          (level) => level && typeof level === 'object'
        )
      : [];

  const findLevelByBattleNumber = (currentLevelNumber) => {
    if (!Number.isFinite(currentLevelNumber)) {
      return null;
    }

    const directLevel = window.preloadedData?.level;
    const directLevelNumber = Number(directLevel?.currentLevel ?? directLevel?.level);
    if (
      directLevel &&
      typeof directLevel === 'object' &&
      Number.isFinite(directLevelNumber) &&
      directLevelNumber === currentLevelNumber
    ) {
      return directLevel;
    }

    const levelsList = resolveCurrentLevels();
    return (
      levelsList.find((level) => {
        const candidateNumber = Number(level?.currentLevel ?? level?.level);
        return Number.isFinite(candidateNumber) && candidateNumber === currentLevelNumber;
      }) || null
    );
  };

  const countBattlesFromBattleData = (battleData) => {
    if (!battleData || typeof battleData !== 'object') {
      return 0;
    }

    const monsters = Array.isArray(battleData.monsters)
      ? battleData.monsters.filter(Boolean)
      : [];
    if (monsters.length > 0) {
      return monsters.length;
    }

    return battleData.monster ? 1 : 0;
  };

  const countBattlesFromLevelData = (levelData) => {
    if (!levelData || typeof levelData !== 'object') {
      return 0;
    }

    if (Array.isArray(levelData.battles)) {
      const entries = levelData.battles.filter(Boolean);
      if (entries.length > 0) {
        return entries.length;
      }
    }

    return countBattlesFromBattleData(levelData.battle);
  };

  const getBattleCountForLevelNumber = (currentLevelNumber) => {
    const levelData = findLevelByBattleNumber(currentLevelNumber);
    const count = countBattlesFromLevelData(levelData);
    return count > 0 ? count : 1;
  };

  const readMathProgressState = () => {
    const mathTypeCandidate = resolveMathTypeKey();
    const mathKey = findMathProgressKey(mathTypeCandidate);
    const progressRoot = resolveProgressRoot();
    const entry =
      progressRoot && mathKey && isPlainObject(progressRoot[mathKey])
        ? progressRoot[mathKey]
        : null;

    const numericOrNull = (value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return null;
      }
      if (parsed <= 0) {
        return null;
      }
      return Math.round(parsed);
    };

    const preloaded = typeof window !== 'undefined' ? window.preloadedData : null;

    const fallbackLevelCandidates = [
      getResolvedCurrentLevel(),
      numericOrNull(progressRoot?.currentLevel),
      numericOrNull(progressRoot?.level),
      numericOrNull(preloaded?.level?.currentLevel),
    ];

    if (typeof mathKey === 'string') {
      fallbackLevelCandidates.push(numericOrNull(mathKey));
    }

    const entryLevelCandidate = numericOrNull(entry?.currentLevel);
    const entryTotalCandidate = numericOrNull(entry?.totalBattles);

    let resolvedCurrentLevel = fallbackLevelCandidates.find(
      (candidate) => Number.isFinite(candidate) && candidate > 0
    );

    if (Number.isFinite(entryLevelCandidate) && entryLevelCandidate > 0) {
      const matchesFallback =
        Number.isFinite(resolvedCurrentLevel) && entryLevelCandidate === resolvedCurrentLevel;
      if (entryTotalCandidate || matchesFallback || !Number.isFinite(resolvedCurrentLevel)) {
        resolvedCurrentLevel = entryLevelCandidate;
      }
    }

    if (!Number.isFinite(resolvedCurrentLevel) || resolvedCurrentLevel <= 0) {
      resolvedCurrentLevel = 1;
    } else {
      resolvedCurrentLevel = Math.max(1, Math.round(resolvedCurrentLevel));
    }

    let resolvedTotalBattles = Number.isFinite(entryTotalCandidate)
      ? Math.max(1, Math.round(entryTotalCandidate))
      : null;

    if (!resolvedTotalBattles && Number.isFinite(entryLevelCandidate)) {
      const differsFromLevel = entryLevelCandidate !== resolvedCurrentLevel;
      if (differsFromLevel || !entryTotalCandidate) {
        resolvedTotalBattles = Math.max(1, Math.round(entryLevelCandidate));
      }
    }

    const derivedFromLevel = getBattleCountForLevelNumber(resolvedCurrentLevel);
    if (!resolvedTotalBattles) {
      if (Number.isFinite(derivedFromLevel) && derivedFromLevel > 0) {
        resolvedTotalBattles = Math.max(1, Math.round(derivedFromLevel));
      } else {
        resolvedTotalBattles = 1;
      }
    } else if (
      Number.isFinite(derivedFromLevel) &&
      derivedFromLevel > 0 &&
      resolvedTotalBattles < derivedFromLevel
    ) {
      resolvedTotalBattles = Math.max(resolvedTotalBattles, Math.round(derivedFromLevel));
    }

    const storedBattleCurrent = numericOrNull(entry?.currentBattle);
    let resolvedBattleCurrent = storedBattleCurrent ? Math.max(1, storedBattleCurrent) : 1;

    if (resolvedBattleCurrent > resolvedTotalBattles) {
      resolvedBattleCurrent = resolvedTotalBattles;
    }

    return {
      mathKey,
      mathTypeCandidate,
      entry,
      currentLevelNumber: resolvedCurrentLevel,
      battleCount: resolvedTotalBattles,
      currentBattle: resolvedBattleCurrent,
      currentLevelTotal: resolvedTotalBattles,
    };
  };

  const computeNextMathProgressOnWin = () => {
    const state = readMathProgressState();
    const effectiveKey = state.mathKey || state.mathTypeCandidate;

    if (!effectiveKey) {
      return null;
    }

    const currentLevelNumber = Number.isFinite(state.currentLevelNumber)
      ? Math.max(1, Math.round(state.currentLevelNumber))
      : 1;

    return {
      mathKey: effectiveKey,
      advanceLevel: true,
      nextCurrentLevelNumber: currentLevelNumber + 1,
    };
  };

  const computeNextGlobalProgressOnWin = () => {
    const toPositiveInteger = (value) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return null;
      }

      return Math.max(1, Math.floor(numericValue));
    };

    const progressSources = [];
    const visited = new Set();

    const addProgressSource = (source) => {
      if (!isPlainObject(source) || visited.has(source)) {
        return;
      }

      visited.add(source);
      progressSources.push(source);

      if (isPlainObject(source.progress)) {
        addProgressSource(source.progress);
      }
    };

    addProgressSource(window.preloadedData?.progress);
    addProgressSource(window.preloadedData?.player?.progress);

    const collectCandidates = (keys) => {
      const values = [];
      progressSources.forEach((source) => {
        keys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            values.push(source[key]);
          }
        });
      });
      return values;
    };

    const findFirstPositiveInteger = (candidates) => {
      for (const candidate of candidates) {
        const numeric = toPositiveInteger(candidate);
        if (numeric !== null) {
          return numeric;
        }
      }
      return null;
    };

    const levelCandidates = collectCandidates(['currentLevel', 'level']);

    const currentLevel = findFirstPositiveInteger(levelCandidates) ?? 1;

    const nextRewardDisplay = incrementGlobalRewardProgress();
    const update = {
      currentLevel: currentLevel + 1,
    };

    if (nextRewardDisplay) {
      update.globalRewardProgress = {
        milestoneSize: nextRewardDisplay.milestoneSize,
        winsSinceReward: nextRewardDisplay.winsSinceReward,
        totalWins: nextRewardDisplay.totalWins,
      };
    }

    return update;
  };

  const readCurrentGemTotal = () => {
    const playerGemValue = Number(window.preloadedData?.player?.gems);
    if (Number.isFinite(playerGemValue)) {
      return Math.max(0, Math.round(playerGemValue));
    }

    const progressRoot = resolveProgressRoot();
    if (progressRoot && typeof progressRoot.gems !== 'undefined') {
      const progressGemValue = Number(progressRoot.gems);
      if (Number.isFinite(progressGemValue)) {
        return Math.max(0, Math.round(progressGemValue));
      }
    }

    try {
      const storage = window.localStorage;
      if (storage) {
        const raw = storage.getItem(PROGRESS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const storedGemValue = Number(parsed.gems);
            if (Number.isFinite(storedGemValue)) {
              return Math.max(0, Math.round(storedGemValue));
            }

            const nestedProgress = parsed.progress;
            if (nestedProgress && typeof nestedProgress === 'object') {
              const nestedGemValue = Number(nestedProgress.gems);
              if (Number.isFinite(nestedGemValue)) {
                return Math.max(0, Math.round(nestedGemValue));
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Stored progress unavailable.', error);
    }

    return 0;
  };

  const persistGemTotal = (total) => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    const previousTotal = readCurrentGemTotal();
    const normalizedPrevious = Math.max(0, Math.round(Number(previousTotal) || 0));
    const rawIncrement = safeTotal - normalizedPrevious;
    const sanitizedIncrement = rawIncrement > 0 ? rawIncrement : 0;

    persistProgress({
      gems: safeTotal,
      gemsAwarded: sanitizedIncrement,
    });

    const sanitizeGemValue = (value) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue)
        ? Math.max(0, Math.round(numericValue))
        : 0;
    };

    if (window.preloadedData) {
      if (
        window.preloadedData.progress &&
        typeof window.preloadedData.progress === 'object'
      ) {
        const existingAwarded = sanitizeGemValue(
          window.preloadedData.progress.gemsAwarded
        );
        const updatedAwarded = existingAwarded + sanitizedIncrement;
        window.preloadedData.progress.gems = safeTotal;
        if (updatedAwarded > 0) {
          window.preloadedData.progress.gemsAwarded = updatedAwarded;
        } else {
          delete window.preloadedData.progress.gemsAwarded;
        }
      }
      if (
        window.preloadedData.player &&
        typeof window.preloadedData.player === 'object'
      ) {
        const playerData = window.preloadedData.player;
        const existingPlayerAwarded = sanitizeGemValue(playerData.gemsAwarded);
        const updatedPlayerAwarded =
          existingPlayerAwarded + sanitizedIncrement;
        playerData.gems = safeTotal;
        if (updatedPlayerAwarded > 0) {
          playerData.gemsAwarded = updatedPlayerAwarded;
        } else {
          delete playerData.gemsAwarded;
        }
        if (
          playerData.progress &&
          typeof playerData.progress === 'object'
        ) {
          const existingProgressAwarded = sanitizeGemValue(
            playerData.progress.gemsAwarded
          );
          const updatedProgressAwarded =
            existingProgressAwarded + sanitizedIncrement;
          playerData.progress.gems = safeTotal;
          if (updatedProgressAwarded > 0) {
            playerData.progress.gemsAwarded = updatedProgressAwarded;
          } else {
            delete playerData.progress.gemsAwarded;
          }
        }
      }
    }

    return safeTotal;
  };

  const awardGemReward = (amount) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return readCurrentGemTotal();
    }

    const currentTotal = readCurrentGemTotal();
    return currentTotal + Math.max(0, Math.round(numericAmount));
  };

  const markGemRewardIntroSeen = () => {
    if (gemRewardIntroShown) {
      return;
    }
    gemRewardIntroShown = true;
    persistProgress({ gemRewardIntroShown: true });
  };

  const normalizePositiveInteger = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    const rounded = Math.round(numericValue);
    return rounded > 0 ? rounded : null;
  };

  const normalizeNonNegativeInteger = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    const rounded = Math.round(numericValue);
    return rounded >= 0 ? rounded : null;
  };

  const storeGemRewardHomeAnimation = ({
    start,
    end,
    amount,
    duration,
  } = {}) => {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    const normalizedEnd = normalizeNonNegativeInteger(end);
    if (normalizedEnd === null) {
      return;
    }

    const payload = {
      end: normalizedEnd,
      timestamp: Date.now(),
    };

    const normalizedStart = normalizeNonNegativeInteger(start);
    if (normalizedStart !== null) {
      payload.start = normalizedStart;
    }

    const normalizedAmount = normalizeNonNegativeInteger(amount);
    if (normalizedAmount !== null) {
      payload.amount = normalizedAmount;
    }

    const normalizedDuration = normalizeNonNegativeInteger(duration);
    if (normalizedDuration !== null && normalizedDuration > 0) {
      payload.duration = normalizedDuration;
    }

    try {
      sessionStorage.setItem(
        GEM_REWARD_HOME_ANIMATION_KEY,
        JSON.stringify(payload)
      );
    } catch (error) {
      console.warn('Unable to store gem reward animation state.', error);
    }
  };

  const formatGemRewardMessage = ({
    amount,
    isWin,
    includeShopPrompt: _includeShopPrompt,
  } = {}) => {
    const normalizedAmount = Math.max(0, Math.round(Number(amount) || 0));
    const gemLabel = normalizedAmount
      ? `${normalizedAmount} Gem${normalizedAmount === 1 ? '' : 's'}`
      : null;
    const buttonText = gemLabel
      ? `Claim ${gemLabel}`
      : isWin
      ? 'Swim Home!'
      : 'Try Again!';

    return {
      text: isWin ? 'Great Job!' : 'Keep Practicing!',
      buttonText,
      imageSrc: rewardSpriteSources.gem,
      imageAlt: normalizedAmount === 1 ? 'Gem reward' : 'Gem rewards',
    };
  };

  const resolveAbsoluteSpritePath = (path) => {
    if (typeof path !== 'string') {
      return null;
    }

    const trimmed = path.trim();
    if (!trimmed) {
      return null;
    }

    const sanitized = sanitizeHeroSpritePath(trimmed);

    if (
      /^(?:https?:)?\/\//i.test(sanitized) ||
      sanitized.startsWith('data:') ||
      sanitized.startsWith('blob:')
    ) {
      return sanitized;
    }

    try {
      return sanitizeHeroSpritePath(
        new URL(sanitized, document.baseURI).href
      );
    } catch (error) {
      return sanitized;
    }
  };

  const normalizeSpritePath = (path) => {
    if (typeof path !== 'string') {
      return '';
    }

    const sanitized = sanitizeHeroSpritePath(path.trim());
    if (!sanitized) {
      return '';
    }

    return sanitized.replace(/[?#].*$/, '').toLowerCase();
  };

  const getCurrentHeroSprite = () => {
    if (heroImg && typeof heroImg.src === 'string' && heroImg.src) {
      return sanitizeHeroSpritePath(heroImg.src);
    }

    const fallback =
      resolveAbsoluteSpritePath(HERO_LEVEL_1_SRC) || HERO_LEVEL_1_SRC;

    return sanitizeHeroSpritePath(fallback);
  };

  const deriveNextHeroSprite = () => {
    const currentSprite = getCurrentHeroSprite();

    if (typeof currentSprite === 'string' && currentSprite) {
      const stageReplaced = currentSprite.replace(
        /_(?:level|evolution)_(\d+)(\.[a-z0-9]+)$/i,
        (match, level, extension) => {
          const parsedLevel = Number(level);
          const nextLevel = Number.isFinite(parsedLevel)
            ? Math.min(Math.max(parsedLevel + 1, 1), 3)
            : 2;
          const normalizedPrefix = match.toLowerCase().startsWith('_level_')
            ? '_level_'
            : '_evolution_';
          return `${normalizedPrefix}${nextLevel}${extension}`;
        }
      );

      if (stageReplaced !== currentSprite) {
        return sanitizeHeroSpritePath(stageReplaced);
      }

      if (/_evolution_2(?:[^0-9]|$)/i.test(currentSprite)) {
        const stageThree =
          resolveAbsoluteSpritePath(HERO_BATTLE_EVOLUTION_SPRITE) ||
          HERO_BATTLE_EVOLUTION_SPRITE;
        return sanitizeHeroSpritePath(stageThree);
      }

      if (currentSprite.includes('level_1')) {
        return currentSprite.replace('level_1', 'level_2');
      }
    }

    const fallbackStageTwo =
      resolveAbsoluteSpritePath(HERO_LEVEL_2_SRC) || HERO_LEVEL_2_SRC;

    return sanitizeHeroSpritePath(fallbackStageTwo);
  };

  const isHeroAtInitialEvolutionStage = () => {
    const currentSprite = normalizeSpritePath(getCurrentHeroSprite());
    if (!currentSprite) {
      return false;
    }

    const baseSprite = normalizeSpritePath(
      resolveAbsoluteSpritePath(HERO_LEVEL_1_SRC) || HERO_LEVEL_1_SRC
    );

    if (baseSprite && currentSprite === baseSprite) {
      return true;
    }

    return /_evolution_1(?:[^0-9]|$)/.test(currentSprite);
  };

  const clearEvolutionTimers = () => {
    evolutionGrowthStartTimeout = clearTimeoutSafe(evolutionGrowthStartTimeout);
    evolutionGrowthFallbackTimeout = clearTimeoutSafe(
      evolutionGrowthFallbackTimeout
    );
    evolutionRevealFallbackTimeout = clearTimeoutSafe(
      evolutionRevealFallbackTimeout
    );
    evolutionCardDelayTimeout = clearTimeoutSafe(evolutionCardDelayTimeout);
  };

  const resetEvolutionOverlay = () => {
    clearEvolutionTimers();

    if (!evolutionOverlay) {
      return;
    }

    evolutionOverlay.classList.remove('evolution-overlay--visible');
    evolutionOverlay.setAttribute('aria-hidden', 'true');

    if (evolutionCurrentSprite) {
      evolutionCurrentSprite.classList.remove(
        'evolution-overlay__sprite--visible',
        'evolution-overlay__sprite--growth',
        'evolution-overlay__sprite--hidden'
      );
    }

    if (evolutionNextSprite) {
      evolutionNextSprite.classList.remove(
        'evolution-overlay__sprite--visible',
        'evolution-overlay__sprite--reveal',
        'evolution-overlay__sprite--hidden'
      );
    }
  };

  const hideRewardOverlayInstantly = () => {
    clearRewardCardDisplayTimeout();

    if (rewardOverlay) {
      rewardOverlay.classList.remove('reward-overlay--visible');
      rewardOverlay.setAttribute('aria-hidden', 'true');
    }

    document.body?.classList.remove('is-reward-active');
  };

  const focusWithoutScroll = (element) => {
    if (!element || typeof element.focus !== 'function') {
      return;
    }

    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  };

  const markRegistrationAsRequired = () => {
    try {
      const storage = window.localStorage;
      if (!storage) {
        return;
      }

      storage.setItem(
        GUEST_SESSION_KEY,
        GUEST_SESSION_REGISTRATION_REQUIRED_VALUE
      );
    } catch (error) {
      console.warn('Unable to require registration for the guest player.', error);
    }
  };

  const showEvolutionCompleteOverlay = (spriteSrc) => {
    if (!evolutionCompleteOverlay) {
      return { shown: false, onVisible: Promise.resolve() };
    }

    const parseTimeToMs = (value) => {
      if (typeof value !== 'string') {
        return 0;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return 0;
      }

      if (trimmed.endsWith('ms')) {
        const numeric = Number.parseFloat(trimmed.slice(0, -2));
        return Number.isFinite(numeric) ? numeric : 0;
      }

      if (trimmed.endsWith('s')) {
        const numeric = Number.parseFloat(trimmed.slice(0, -1));
        return Number.isFinite(numeric) ? numeric * 1000 : 0;
      }

      const numeric = Number.parseFloat(trimmed);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const resolveNextFrame = (resolve) => {
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => resolve());
      } else {
        window.setTimeout(() => resolve(), 0);
      }
    };

    const createOverlayVisibilityPromise = (overlay) => {
      if (typeof window === 'undefined') {
        return Promise.resolve();
      }

      const { getComputedStyle } = window;
      if (typeof getComputedStyle !== 'function') {
        return new Promise((resolve) => {
          resolveNextFrame(resolve);
        });
      }

      let maxDuration = 0;

      try {
        const computedStyle = getComputedStyle(overlay);
        const durationParts = (computedStyle?.transitionDuration ?? '').split(',');
        const delayParts = (computedStyle?.transitionDelay ?? '').split(',');
        const maxParts = Math.max(durationParts.length, delayParts.length, 1);

        for (let index = 0; index < maxParts; index += 1) {
          const durationPart =
            durationParts[index] ?? durationParts[durationParts.length - 1] ?? '0s';
          const delayPart = delayParts[index] ?? delayParts[delayParts.length - 1] ?? '0s';
          const total = parseTimeToMs(durationPart) + parseTimeToMs(delayPart);
          if (total > maxDuration) {
            maxDuration = total;
          }
        }
      } catch (error) {
        console.warn(
          'Unable to determine post-evolution overlay transition duration.',
          error
        );
        maxDuration = 0;
      }

      if (maxDuration <= 0) {
        return new Promise((resolve) => {
          resolveNextFrame(resolve);
        });
      }

      return new Promise((resolve) => {
        let resolved = false;
        let timeoutId = null;

        const finish = () => {
          if (resolved) {
            return;
          }
          resolved = true;
          overlay.removeEventListener('transitionend', handleTransitionEnd);
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
          resolve();
        };

        const handleTransitionEnd = (event) => {
          if (event?.target !== overlay) {
            return;
          }
          finish();
        };

        overlay.addEventListener('transitionend', handleTransitionEnd);

        timeoutId = window.setTimeout(() => {
          finish();
        }, Math.max(50, maxDuration + 50));
      });
    };

    const overlayAlreadyVisible = evolutionCompleteOverlay.classList.contains(
      'post-evolution-overlay--visible'
    );

    const overlayVisibilityPromise = overlayAlreadyVisible
      ? Promise.resolve()
      : createOverlayVisibilityPromise(evolutionCompleteOverlay);

    const revealOverlay = () => {
      evolutionCompleteOverlay.setAttribute('aria-hidden', 'false');
      evolutionCompleteOverlay.classList.add('post-evolution-overlay--visible');
      document.body?.classList.add('is-post-evolution-active');
      focusWithoutScroll(evolutionCompleteButton);
    };

    if (evolutionCompleteSprite && typeof spriteSrc === 'string' && spriteSrc) {
      evolutionCompleteSprite.src = spriteSrc;
      evolutionCompleteSprite.alt = 'Shellfin evolved';

      if (typeof evolutionCompleteSprite.decode === 'function') {
        evolutionCompleteSprite
          .decode()
          .then(revealOverlay)
          .catch((error) => {
            console.warn('Unable to decode evolution sprite before showing overlay.', error);
            revealOverlay();
          });
      } else if (!evolutionCompleteSprite.complete) {
        const handleSpriteReady = () => {
          evolutionCompleteSprite.removeEventListener('error', handleSpriteReady);
          evolutionCompleteSprite.removeEventListener('load', handleSpriteReady);
          revealOverlay();
        };

        evolutionCompleteSprite.addEventListener('load', handleSpriteReady, {
          once: true,
        });
        evolutionCompleteSprite.addEventListener('error', handleSpriteReady, {
          once: true,
        });
      } else {
        revealOverlay();
      }
    } else {
      revealOverlay();
    }

    return {
      shown: true,
      onVisible: overlayVisibilityPromise,
    };
  };

  if (evolutionCompleteButton) {
    evolutionCompleteButton.addEventListener('click', () => {
      window.location.assign(REGISTER_PAGE_URL);
    });
  }

  const finishEvolutionSequence = (nextSpriteSrc, options = {}) => {
    const { skipDelays = false } = options;
    const shouldDelay = !skipDelays && evolutionInProgress;

    clearEvolutionTimers();

    let spriteReadyPromise = heroSpriteReadyPromise;
    let evolutionFinalized = false;

    if (heroImg && typeof nextSpriteSrc === 'string') {
      heroImg.src = nextSpriteSrc;
      heroSpriteReadyPromise = updateHeroSpriteCustomProperties();
      spriteReadyPromise = heroSpriteReadyPromise;
      heroImg.classList.add('battle-shellfin--evolved');
    }

    if (heroEvolutionStartedAtInitialStage) {
      applyHeroEvolutionProfileUpdate();
    }

    const finalizeEvolution = () => {
      if (evolutionFinalized) {
        return;
      }
      evolutionFinalized = true;
      hideRewardOverlayInstantly();
      if (completeMessage) {
        completeMessage.classList.remove('show');
        completeMessage.setAttribute('aria-hidden', 'true');
      }
      const overlayResult =
        showEvolutionCompleteOverlay(nextSpriteSrc) ?? { shown: false, onVisible: null };
      const overlayShown = overlayResult?.shown === true;
      const overlayVisiblePromise = overlayResult?.onVisible;

      let overlayCleanupComplete = false;
      const cleanupEvolutionOverlay = () => {
        if (overlayCleanupComplete) {
          return;
        }
        overlayCleanupComplete = true;
        resetEvolutionOverlay();
        document.body?.classList.remove('is-evolution-active');
      };

      markRegistrationAsRequired();

      heroEvolutionStartedAtInitialStage = false;

      if (!overlayShown) {
        cleanupEvolutionOverlay();
        showRegisterRewardCard();
        return;
      }

      if (overlayVisiblePromise && typeof overlayVisiblePromise.then === 'function') {
        overlayVisiblePromise
          .then(() => {
            cleanupEvolutionOverlay();
          })
          .catch((error) => {
            console.warn(
              'Failed to confirm post-evolution overlay visibility before cleanup.',
              error
            );
            cleanupEvolutionOverlay();
          });
      } else {
        cleanupEvolutionOverlay();
      }
    };

    const completeEvolution = () => {
      if (spriteReadyPromise && typeof spriteReadyPromise.finally === 'function') {
        spriteReadyPromise.finally(finalizeEvolution);
      } else {
        finalizeEvolution();
      }
    };

    evolutionInProgress = false;

    if (!shouldDelay) {
      completeEvolution();
      return;
    }

    evolutionCardDelayTimeout = window.setTimeout(() => {
      evolutionCardDelayTimeout = null;
      completeEvolution();
    }, HERO_EVOLUTION_CARD_REVEAL_DELAY_MS);
  };

  const startEvolutionSequence = () => {
    if (evolutionInProgress) {
      return;
    }

    evolutionInProgress = true;
    clearEvolutionTimers();

    heroEvolutionStartedAtInitialStage = isHeroAtInitialEvolutionStage();

    if (rewardCardButton) {
      rewardCardButton.disabled = true;
    }

    disableRewardSpriteInteraction();
    clearRewardCardDisplayTimeout();

    const runPrelude = async () => {
      try {
        await animateRewardCardClose();
        const swapped = await animateGemToHeroSprite();
        if (swapped) {
          await wait(REWARD_SPRITE_HOLD_DURATION_MS);
        }
      } finally {
        hideRewardCard();
        clearRewardAnimation();
        hideRewardOverlayInstantly();

        const currentSpriteSrc = getCurrentHeroSprite();
        const nextSpriteSrc = deriveNextHeroSprite();

        if (!evolutionOverlay || !evolutionCurrentSprite || !evolutionNextSprite) {
          finishEvolutionSequence(nextSpriteSrc, { skipDelays: true });
          return;
        }

        evolutionCurrentSprite.src = currentSpriteSrc;
        evolutionNextSprite.src = nextSpriteSrc;

        evolutionCurrentSprite.classList.remove(
          'evolution-overlay__sprite--hidden',
          'evolution-overlay__sprite--growth',
          'evolution-overlay__sprite--visible'
        );
        evolutionNextSprite.classList.remove(
          'evolution-overlay__sprite--hidden',
          'evolution-overlay__sprite--reveal',
          'evolution-overlay__sprite--visible'
        );
        evolutionNextSprite.classList.add('evolution-overlay__sprite--hidden');

        evolutionOverlay.setAttribute('aria-hidden', 'false');
        evolutionOverlay.classList.add('evolution-overlay--visible');

        document.body?.classList.add('is-evolution-active');

        if (heroImg) {
          heroImg.classList.remove('battle-shellfin--evolved');
        }

        let growthHandled = false;

        const handleGrowthComplete = () => {
          if (growthHandled) {
            return;
          }
          growthHandled = true;

          evolutionGrowthFallbackTimeout = clearTimeoutSafe(
            evolutionGrowthFallbackTimeout
          );

          evolutionCurrentSprite.classList.remove(
            'evolution-overlay__sprite--growth',
            'evolution-overlay__sprite--visible'
          );
          evolutionCurrentSprite.classList.add('evolution-overlay__sprite--hidden');

          const handleRevealComplete = () => {
            evolutionNextSprite.removeEventListener(
              'animationend',
              handleRevealComplete
            );
            evolutionRevealFallbackTimeout = clearTimeoutSafe(
              evolutionRevealFallbackTimeout
            );
            finishEvolutionSequence(nextSpriteSrc);
          };

          evolutionNextSprite.classList.remove('evolution-overlay__sprite--hidden');
          evolutionNextSprite.classList.add('evolution-overlay__sprite--visible');
          void evolutionNextSprite.offsetWidth;
          evolutionNextSprite.classList.add('evolution-overlay__sprite--reveal');
          evolutionNextSprite.addEventListener('animationend', handleRevealComplete, {
            once: true,
          });

          evolutionRevealFallbackTimeout = window.setTimeout(() => {
            evolutionRevealFallbackTimeout = null;
            handleRevealComplete();
          }, HERO_EVOLUTION_REVEAL_DURATION_MS + 400);
        };

        const beginGrowth = () => {
          void evolutionCurrentSprite.offsetWidth;
          evolutionCurrentSprite.classList.add('evolution-overlay__sprite--growth');

          evolutionGrowthFallbackTimeout = window.setTimeout(() => {
            evolutionGrowthFallbackTimeout = null;
            handleGrowthComplete();
          },
          HERO_EVOLUTION_GROWTH_DURATION_MS * HERO_EVOLUTION_GROWTH_ITERATIONS + 400);
        };

        evolutionCurrentSprite.addEventListener(
          'animationend',
          handleGrowthComplete,
          {
            once: true,
          }
        );

        evolutionCurrentSprite.classList.add('evolution-overlay__sprite--visible');

        if (HERO_EVOLUTION_GROWTH_START_DELAY_MS > 0) {
          evolutionGrowthStartTimeout = window.setTimeout(() => {
            evolutionGrowthStartTimeout = null;
            beginGrowth();
          }, HERO_EVOLUTION_GROWTH_START_DELAY_MS);
        } else {
          beginGrowth();
        }
      }
    };

    runPrelude().catch((error) => {
      console.warn('Unable to complete reward animation before evolution.', error);
    });
  };

  const clearRewardCardDisplayTimeout = () => {
    if (rewardCardDisplayTimeout !== null) {
      window.clearTimeout(rewardCardDisplayTimeout);
      rewardCardDisplayTimeout = null;
    }
  };

  const hideRewardCard = () => {
    if (!rewardCard) {
      return;
    }

    if (rewardOverlay) {
      rewardOverlay.classList.remove('reward-overlay--with-card');
    }

    rewardCard.classList.remove('card--pop');
    rewardCard.classList.remove('card--closing');
    rewardCard.setAttribute('aria-hidden', 'true');
    rewardCard.hidden = true;
    if (rewardCardButton) {
      rewardCardButton.disabled = true;
    }
    if (rewardCardButton && rewardCardButtonHandler) {
      rewardCardButton.removeEventListener('click', rewardCardButtonHandler);
      rewardCardButtonHandler = null;
    }
  };

  const displayRewardCard = ({
    text,
    buttonText,
    onClick,
    focusButton = true,
    imageSrc,
    imageAlt,
  }) => {
    if (!rewardCard || !rewardCardText || !rewardCardButton) {
      return false;
    }

    const resolvedText =
      typeof text === 'string' && text.trim()
        ? text
        : defaultRewardCardText;
    const resolvedButtonText =
      typeof buttonText === 'string' && buttonText.trim()
        ? buttonText
        : defaultRewardCardButtonText;
    rewardCardText.textContent = resolvedText;
    rewardCardButton.textContent = resolvedButtonText;
    rewardCardButton.disabled = false;

    if (rewardCardAvatar) {
      const resolvedImageSrc =
        typeof imageSrc === 'string' && imageSrc.trim()
          ? imageSrc
          : defaultRewardCardImageSrc;
      if (resolvedImageSrc) {
        rewardCardAvatar.src = resolvedImageSrc;
      }

      const trimmedAlt =
        typeof imageAlt === 'string' ? imageAlt.trim() : '';
      if (trimmedAlt) {
        rewardCardAvatar.alt = trimmedAlt;
      } else if (defaultRewardCardImageAlt !== null) {
        rewardCardAvatar.alt = defaultRewardCardImageAlt;
      }
    }

    if (rewardCardButtonHandler) {
      rewardCardButton.removeEventListener('click', rewardCardButtonHandler);
    }

    rewardCardButtonHandler = () => {
      if (typeof onClick === 'function') {
        onClick();
      }
    };
    rewardCardButton.addEventListener('click', rewardCardButtonHandler);

    rewardCard.hidden = false;
    rewardCard.setAttribute('aria-hidden', 'false');
    rewardCard.classList.remove('card--pop');
    rewardCard.classList.remove('card--closing');
    void rewardCard.offsetWidth;
    rewardCard.classList.add('card--pop');

    if (rewardOverlay) {
      rewardOverlay.classList.add('reward-overlay--with-card');
    }

    if (focusButton && typeof rewardCardButton.focus === 'function') {
      rewardCardButton.focus();
    }

    return true;
  };

  const showRewardIntroCard = () => {
    displayRewardCard({
      text: defaultRewardCardText,
      buttonText: defaultRewardCardButtonText,
      onClick: () => {
        if (battleGoalsMet && !currentLevelAdvanced) {
          advanceCurrentLevel();
        }
        startEvolutionSequence();
      },
    });
  };

  const clearRewardAnimation = () => {
    if (!rewardSprite) {
      return;
    }

    rewardSprite.classList.remove(
      'reward-overlay__image--chest-pop',
      'reward-overlay__image--hatching',
      'reward-overlay__image--gem-pop',
      'reward-overlay__image--swap-in',
      'reward-overlay__image--swap-out',
      'reward-overlay__image--visible'
    );
    rewardSprite.style.removeProperty('opacity');
    rewardSprite.style.removeProperty('transform');
  };

  const wait = (duration) =>
    new Promise((resolve) => {
      const delay =
        typeof duration === 'number' && Number.isFinite(duration)
          ? Math.max(0, duration)
          : 0;
      window.setTimeout(resolve, delay);
    });

  const animateRewardCardClose = () =>
    new Promise((resolve) => {
      if (!rewardCard) {
        hideRewardCard();
        resolve(false);
        return;
      }

      const isHidden =
        rewardCard.hidden || rewardCard.getAttribute('aria-hidden') === 'true';
      if (isHidden) {
        hideRewardCard();
        resolve(false);
        return;
      }

      let finished = false;
      let fallbackTimeout = null;

      const finish = (played) => {
        if (finished) {
          return;
        }
        finished = true;
        if (fallbackTimeout !== null) {
          window.clearTimeout(fallbackTimeout);
          fallbackTimeout = null;
        }
        rewardCard.removeEventListener('animationend', handleAnimationEnd);
        hideRewardCard();
        resolve(played);
      };

      const handleAnimationEnd = (event) => {
        if (!event || event.target !== rewardCard) {
          return;
        }

        if (event.animationName !== 'card-close') {
          return;
        }

        finish(true);
      };

      rewardCard.addEventListener('animationend', handleAnimationEnd);
      rewardCard.classList.remove('card--pop');
      rewardCard.classList.add('card--closing');

      fallbackTimeout = window.setTimeout(() => {
        finish(false);
      }, REWARD_CARD_CLOSE_DURATION_MS + 120);
    });

  const animateGemToHeroSprite = () =>
    new Promise((resolve) => {
      if (!rewardSprite) {
        resolve(false);
        return;
      }

      rewardSprite.classList.remove(
        'reward-overlay__image--swap-out',
        'reward-overlay__image--swap-in'
      );

      const heroLevelOneSrc =
        resolveAbsoluteSpritePath(HERO_LEVEL_1_SRC) || HERO_LEVEL_1_SRC;
      let fadeOutTimeoutId = null;
      let fadeInTimeoutId = null;

      const cleanup = () => {
        if (fadeOutTimeoutId !== null) {
          window.clearTimeout(fadeOutTimeoutId);
          fadeOutTimeoutId = null;
        }
        if (fadeInTimeoutId !== null) {
          window.clearTimeout(fadeInTimeoutId);
          fadeInTimeoutId = null;
        }
        rewardSprite.classList.remove('reward-overlay__image--swap-out');
        rewardSprite.classList.remove('reward-overlay__image--swap-in');
      };

      const finish = () => {
        cleanup();
        resolve(true);
      };

      const beginFadeIn = () => {
        rewardSprite.classList.add('reward-overlay__image--swap-in');
        fadeInTimeoutId = window.setTimeout(() => {
          rewardSprite.classList.remove('reward-overlay__image--swap-in');
          finish();
        }, REWARD_SPRITE_SWAP_DURATION_MS);
      };

      fadeOutTimeoutId = window.setTimeout(() => {
        rewardSprite.classList.remove('reward-overlay__image--swap-out');
        rewardSprite.src = heroLevelOneSrc;
        rewardSprite.alt = 'Shellfin prepares to evolve';
        setRewardStage('hero');
        void rewardSprite.offsetWidth;
        beginFadeIn();
      }, REWARD_SPRITE_SWAP_DURATION_MS);

      rewardSprite.classList.add('reward-overlay__image--swap-out');
    });

  const resetRewardOverlay = () => {
    if (!rewardOverlay || !rewardSprite) {
      return;
    }

    resetEvolutionOverlay();
    clearRewardCardDisplayTimeout();
    clearRewardAnimation();
    hideRewardCard();
    rewardOverlay.classList.remove('reward-overlay--visible');
    rewardOverlay.setAttribute('aria-hidden', 'true');
    document.body?.classList.remove('is-reward-active');
    rewardSprite.src = rewardSpriteSources.gem;
    rewardSprite.alt = 'Gem level-up reward';
    setRewardStage(null);
    disableRewardSpriteInteraction();

    if (evolutionCompleteOverlay) {
      evolutionCompleteOverlay.classList.remove('post-evolution-overlay--visible');
      evolutionCompleteOverlay.setAttribute('aria-hidden', 'true');
    }

    document.body?.classList.remove('is-post-evolution-active');
  };

  const showRegisterRewardCard = () => {
    if (!rewardOverlay) {
      window.location.assign(REGISTER_PAGE_URL);
      return;
    }

    clearRewardCardDisplayTimeout();
    clearRewardAnimation();

    rewardOverlay.classList.add('reward-overlay--visible');
    rewardOverlay.setAttribute('aria-hidden', 'false');
    document.body?.classList.add('is-reward-active');
    disableRewardSpriteInteraction();

    if (rewardSprite) {
      rewardSprite.classList.remove('reward-overlay__image--visible');
      rewardSprite.style.opacity = '0';
    }

    setRewardStage('register');

    const displayed = displayRewardCard({
      text: REGISTER_REWARD_CARD_TEXT,
      buttonText: REGISTER_REWARD_CARD_BUTTON_TEXT,
      onClick: () => {
        window.location.assign(REGISTER_PAGE_URL);
      },
    });

    if (!displayed) {
      window.location.assign(REGISTER_PAGE_URL);
    }
  };

  const playLevelUpRewardAnimation = () => {
    if (!rewardOverlay || !rewardSprite) {
      return;
    }

    clearRewardCardDisplayTimeout();
    clearRewardAnimation();
    hideRewardCard();

    rewardOverlay.classList.add('reward-overlay--visible');
    rewardOverlay.setAttribute('aria-hidden', 'false');
    document.body?.classList.add('is-reward-active');
    disableRewardSpriteInteraction();
    rewardSprite.src = rewardSpriteSources.gem;
    rewardSprite.alt = 'Gem level-up reward';

    setRewardStage('gem');
    void rewardSprite.offsetWidth;
    rewardSprite.classList.add('reward-overlay__image--visible');

    rewardCardDisplayTimeout = window.setTimeout(() => {
      rewardCardDisplayTimeout = null;
      showRewardIntroCard();
    }, REWARD_CARD_DELAY_MS);
  };

  disableRewardSpriteInteraction();

  const playGemRewardAnimation = (rewardConfig = {}) =>
    new Promise((resolve) => {
      const fallbackNavigateHome = () => {
        if (battleGoalsMet && shouldAdvanceCurrentLevel && !currentLevelAdvanced) {
          advanceCurrentLevel();
        }
        recordHomeGemAnimation();
        resetRewardOverlay();
        resolve();
        window.location.href = '../index.html';
      };

      if (!rewardOverlay || !rewardSprite || !rewardCard || !rewardCardButton) {
        fallbackNavigateHome();
        return;
      }

      clearRewardCardDisplayTimeout();
      clearRewardAnimation();
      hideRewardCard();

      rewardOverlay.classList.add('reward-overlay--visible');
      rewardOverlay.setAttribute('aria-hidden', 'false');
      document.body?.classList.add('is-reward-active');
      disableRewardSpriteInteraction();

      const rewardAmountRaw = Number(rewardConfig?.amount);
      const rewardAmount = Number.isFinite(rewardAmountRaw)
        ? Math.max(0, Math.round(rewardAmountRaw))
        : GEM_REWARD_WIN_AMOUNT;
      const rewardTotalAfter = normalizeNonNegativeInteger(
        rewardConfig?.totalAfter
      );
      const rewardStartTotal =
        rewardTotalAfter !== null && Number.isFinite(rewardAmount)
          ? Math.max(0, rewardTotalAfter - rewardAmount)
          : null;
      let homeAnimationStored = false;
      const recordHomeGemAnimation = () => {
        if (homeAnimationStored || rewardTotalAfter === null) {
          return;
        }

        storeGemRewardHomeAnimation({
          start: rewardStartTotal,
          end: rewardTotalAfter,
          amount: rewardAmount,
          duration: 900,
        });
        homeAnimationStored = true;
      };
      const isFirstGemReward = rewardConfig?.isFirstGemReward === true;
      const rewardCurrentLevel = normalizePositiveInteger(
        rewardConfig?.currentLevel
      );
      const rewardBattleIndex = normalizePositiveInteger(
        rewardConfig?.currentBattle
      );
      const rewardIsWin = rewardConfig?.win !== false;
      const includeShopPrompt =
        rewardCurrentLevel === 2 && rewardBattleIndex === 1;

      pendingGemReward = null;
      updateNextMissionButton(true);

      let gemRevealed = false;
      let cardDisplayed = false;
      let fallbackTimeout = null;
      let devSkipHandler = null;

      const cleanup = () => {
        rewardSprite.removeEventListener('animationend', handleChestPopEnd);
        rewardSprite.removeEventListener('animationend', handlePulseEnd);
        rewardSprite.removeEventListener('animationend', handleGemPopEnd);
        rewardSprite.removeEventListener('animationiteration', handlePulseIteration);
        if (rewardDevSkipButton && devSkipHandler) {
          rewardDevSkipButton.removeEventListener('click', devSkipHandler);
        }
        if (fallbackTimeout !== null) {
          window.clearTimeout(fallbackTimeout);
          fallbackTimeout = null;
        }
      };

      const finish = () => {
        cleanup();
        resolve();
      };

      const navigateHome = () => {
        if (isFirstGemReward) {
          markGemRewardIntroSeen();
        }
        if (document.body) {
          document.body.classList.add('is-reward-transitioning');
        }
        if (battleGoalsMet && shouldAdvanceCurrentLevel && !currentLevelAdvanced) {
          advanceCurrentLevel();
        }
        recordHomeGemAnimation();
        resetRewardOverlay();
        finish();
        window.location.href = '../index.html';
      };

      const handleDevSkipClick = (event) => {
        event.preventDefault();
        navigateHome();
      };

      if (rewardDevSkipButton) {
        devSkipHandler = handleDevSkipClick;
        rewardDevSkipButton.addEventListener('click', devSkipHandler);
      }

      const displayRewardCopy = () => {
        if (cardDisplayed) {
          return;
        }
        cardDisplayed = true;
        const cardContent = formatGemRewardMessage({
          amount: rewardAmount,
          isWin: rewardIsWin,
          includeShopPrompt,
        });
        const displayed = displayRewardCard({
          text: cardContent?.text,
          buttonText: cardContent?.buttonText,
          imageSrc: cardContent?.imageSrc,
          imageAlt: cardContent?.imageAlt,
          onClick: navigateHome,
        });
        if (!displayed) {
          navigateHome();
        }
      };

      const showRewardCard = () => {
        window.setTimeout(displayRewardCopy, GEM_REWARD_CARD_DELAY_MS);
      };

      const handleGemPopEnd = (event) => {
        if (!event || event.animationName !== 'reward-overlay-egg-pop') {
          return;
        }
        rewardSprite.removeEventListener('animationend', handleGemPopEnd);
        showRewardCard();
      };

      const revealGem = () => {
        if (gemRevealed) {
          return;
        }
        gemRevealed = true;
        if (fallbackTimeout !== null) {
          window.clearTimeout(fallbackTimeout);
          fallbackTimeout = null;
        }
        rewardSprite.classList.remove('reward-overlay__image--chest-pulse');
        rewardSprite.style.removeProperty('--reward-chest-pulse-duration');
        rewardSprite.style.removeProperty('--reward-chest-pulse-count');
        rewardSprite.src = rewardSpriteSources.gem;
        rewardSprite.alt = 'Gem reward';
        setRewardStage('gem');
        void rewardSprite.offsetWidth;
        rewardSprite.classList.add('reward-overlay__image--gem-pop');
        rewardSprite.addEventListener('animationend', handleGemPopEnd, { once: true });
      };

      const handlePulseEnd = (event) => {
        if (!event || event.animationName !== 'reward-overlay-chest-pulse') {
          return;
        }
        rewardSprite.removeEventListener('animationend', handlePulseEnd);
        revealGem();
      };

      const handlePulseIteration = () => {};

      const startPulses = () => {
        rewardSprite.classList.remove('reward-overlay__image--chest-pop');
        void rewardSprite.offsetWidth;
        rewardSprite.style.setProperty(
          '--reward-chest-pulse-duration',
          `${GEM_REWARD_PULSE_DURATION_MS}ms`
        );
        rewardSprite.style.setProperty(
          '--reward-chest-pulse-count',
          `${GEM_REWARD_PULSE_COUNT}`
        );
        rewardSprite.classList.add('reward-overlay__image--chest-pulse');
        rewardSprite.addEventListener('animationend', handlePulseEnd);
        rewardSprite.addEventListener('animationiteration', handlePulseIteration);
      };

      const handleChestPopEnd = (event) => {
        if (!event || event.animationName !== 'reward-overlay-egg-pop') {
          return;
        }
        rewardSprite.removeEventListener('animationend', handleChestPopEnd);
        window.setTimeout(startPulses, GEM_REWARD_INITIAL_PAUSE_MS);
      };

      const triggerFallback = () => {
        revealGem();
        window.setTimeout(displayRewardCopy, GEM_REWARD_CARD_DELAY_MS);
      };

      rewardSprite.style.removeProperty('--reward-chest-pulse-duration');
      rewardSprite.style.removeProperty('--reward-chest-pulse-count');
      rewardSprite.classList.remove('reward-overlay__image--visible');
      rewardSprite.classList.remove('reward-overlay__image--chest-pop');
      rewardSprite.classList.remove('reward-overlay__image--chest-pulse');
      rewardSprite.classList.remove('reward-overlay__image--gem-pop');

      const beginAnimation = () => {
        rewardSprite.src = rewardSpriteSources.chest;
        rewardSprite.alt = 'Treasure chest reward';
        setRewardStage('chest');
        void rewardSprite.offsetWidth;
        rewardSprite.classList.add('reward-overlay__image--visible');
        rewardSprite.classList.add('reward-overlay__image--chest-pop');
        rewardSprite.addEventListener('animationend', handleChestPopEnd, { once: true });
      };

      let animationStarted = false;
      const startAnimationOnce = () => {
        if (animationStarted || gemRevealed) {
          return;
        }
        animationStarted = true;
        beginAnimation();
      };

      preloadRewardSpriteSource(rewardSpriteSources.gem).catch(() => {});
      preloadRewardSpriteSource(rewardSpriteSources.chest)
        .catch(() => {})
        .finally(startAnimationOnce);

      const totalFallbackDuration =
        GEM_REWARD_INITIAL_PAUSE_MS + GEM_REWARD_PULSE_DURATION_MS * GEM_REWARD_PULSE_COUNT + 1200;
      fallbackTimeout = window.setTimeout(() => {
        cleanup();
        triggerFallback();
      }, totalFallbackDuration);
    });

  const isGemMilestoneReward = (reward) => {
    if (!reward || reward.win !== true) {
      return false;
    }

    const rawLevel = Number(reward.currentLevel);

    if (!Number.isFinite(rawLevel)) {
      return false;
    }

    const normalizedLevel = Math.max(1, Math.round(rawLevel));

    if (normalizedLevel < 6) {
      return false;
    }

    const milestoneSize = Math.max(1, Math.round(GLOBAL_REWARD_MILESTONE));

    if (milestoneSize <= 0) {
      return false;
    }

    return (normalizedLevel - 6) % milestoneSize === 0;
  };

  const updateNextMissionButton = (win = true) => {
    if (!nextMissionBtn) {
      return;
    }

    if (hasPendingLevelUpReward) {
      nextMissionBtn.textContent = 'Claim Reward';
      nextMissionBtn.dataset.action = 'next';
      return;
    }

    const hasPendingReward = Boolean(pendingGemReward);
    const isMilestoneReward =
      hasPendingReward && isGemMilestoneReward(pendingGemReward);

    if (win && isMilestoneReward) {
      nextMissionBtn.textContent = 'Claim Reward';
      nextMissionBtn.dataset.action = 'next';
      return;
    }

    if (!win) {
      nextMissionBtn.textContent = 'Try Again';
      nextMissionBtn.dataset.action = 'retry';
      return;
    }

    nextMissionBtn.textContent = 'Back Home';
    nextMissionBtn.dataset.action = 'next';
  };

  const updateLevelProgressDisplay = () => {
    const sanitizedEarned = Math.max(0, Math.round(levelExperienceEarned));
    if (sanitizedEarned !== levelExperienceEarned) {
      levelExperienceEarned = sanitizedEarned;
    }

    const progress = computeExperienceProgress(
      sanitizedEarned,
      levelExperienceRequirement
    );

    const clampedRatio = Math.max(0, Math.min(1, Number(progress.ratio) || 0));
    const targetWidth = `${clampedRatio * 100}%`;

    if (levelProgressMeter) {
      levelProgressMeter.setAttribute('aria-valuemin', '0');
      levelProgressMeter.setAttribute('aria-valuemax', `${progress.totalDisplay}`);
      levelProgressMeter.setAttribute('aria-valuenow', `${progress.earnedDisplay}`);
      levelProgressMeter.setAttribute(
        'aria-valuetext',
        `${progress.text} experience`
      );
    }

    const requestProgressFrame =
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : typeof setTimeout === 'function'
        ? (callback) => setTimeout(callback, 16)
        : () => {};

    const applyProgressVisuals = () => {
      requestProgressFrame(() => {
        if (levelProgressMeter) {
          levelProgressMeter.style.setProperty('--progress-value', `${clampedRatio}`);
        }
        if (levelProgressFill) {
          levelProgressFill.style.width = targetWidth;
        }
      });
    };

    const scheduleProgressAnimation = () => {
      if (levelProgressAnimationTimeout !== null) {
        clearTimeout(levelProgressAnimationTimeout);
        levelProgressAnimationTimeout = null;
      }

      const animationDelay = LEVEL_PROGRESS_ANIMATION_DELAY_MS;

      if (animationDelay > 0) {
        levelProgressAnimationTimeout = setTimeout(() => {
          levelProgressAnimationTimeout = null;
          applyProgressVisuals();
        }, animationDelay);
        return;
      }

      applyProgressVisuals();
    };

    if (levelProgressFill) {
      const wasInitialized = levelProgressFill.dataset.progressAnimated === 'true';

      if (!wasInitialized) {
        levelProgressFill.dataset.progressAnimated = 'true';
        levelProgressFill.style.transition = 'none';
        levelProgressFill.style.width = '0%';
        if (levelProgressMeter) {
          levelProgressMeter.style.setProperty('--progress-value', '0');
        }
        void levelProgressFill.offsetWidth;
        levelProgressFill.style.transition = '';
      }
    } else if (levelProgressMeter) {
      levelProgressMeter.style.setProperty('--progress-value', '0');
    }

    scheduleProgressAnimation();


    const hasExperienceRequirement = levelExperienceRequirement > 0;
    const requirementMet =
      hasExperienceRequirement && sanitizedEarned >= levelExperienceRequirement;
    levelUpAvailable = requirementMet;

    if (!requirementMet && hasExperienceRequirement) {
      hasPendingLevelUpReward = false;
      rewardAnimationPlayed = false;
    }
  };

  const cancelScheduledLevelProgressDisplayUpdate = () => {
    if (levelProgressUpdateTimeout !== null) {
      window.clearTimeout(levelProgressUpdateTimeout);
      levelProgressUpdateTimeout = null;
    }
    if (levelProgressAnimationTimeout !== null) {
      window.clearTimeout(levelProgressAnimationTimeout);
      levelProgressAnimationTimeout = null;
    }
  };

  const scheduleLevelProgressDisplayUpdate = (delayMs = 0) => {
    cancelScheduledLevelProgressDisplayUpdate();

    if (delayMs > 0) {
      levelProgressUpdateTimeout = window.setTimeout(() => {
        levelProgressUpdateTimeout = null;
        updateLevelProgressDisplay();
      }, delayMs);
      return;
    }

    updateLevelProgressDisplay();
  };

  const applyProgressUpdate = (baseProgress, update) => {
    const result = isPlainObject(baseProgress) ? { ...baseProgress } : {};
    if (!isPlainObject(update)) {
      return result;
    }

    Object.entries(update).forEach(([key, value]) => {
      if (key === 'experience') {
        const mergedExperience = mergeExperienceMaps(result.experience, value);
        if (Object.keys(mergedExperience).length > 0) {
          result.experience = mergedExperience;
        } else {
          delete result.experience;
        }
        return;
      }

      if (key === 'gemsAwarded') {
        const currentAwarded = Number(result.gemsAwarded);
        const normalizedCurrent = Number.isFinite(currentAwarded)
          ? Math.max(0, Math.round(currentAwarded))
          : 0;
        const addition = Number(value);
        const normalizedAddition = Number.isFinite(addition)
          ? Math.max(0, Math.round(addition))
          : 0;

        const updatedAwarded = normalizedCurrent + normalizedAddition;
        if (updatedAwarded > 0) {
          result.gemsAwarded = updatedAwarded;
        } else {
          delete result.gemsAwarded;
        }
        return;
      }

      if (value === undefined) {
        delete result[key];
        return;
      }

      if (isPlainObject(value)) {
        const baseValue = isPlainObject(result[key]) ? result[key] : {};
        result[key] = applyProgressUpdate(baseValue, value);
        return;
      }

      result[key] = value;
    });

    return result;
  };

  const resolveCurrentLevelForExperience = () => {
    const resolvedLevel = getResolvedCurrentLevel();
    if (resolvedLevel === null) {
      return null;
    }

    if (currentCurrentLevel === null || resolvedLevel > currentCurrentLevel) {
      currentCurrentLevel = resolvedLevel;
    }

    return resolvedLevel;
  };

  const resolveExperiencePointsForMonster = () => {
    const monsterXp = Number(window.preloadedData?.battle?.monster?.experiencePoints);
    if (!Number.isFinite(monsterXp)) {
      return 0;
    }
    return Math.max(0, Math.round(monsterXp));
  };

  const awardExperiencePoints = ({
    delayProgressUpdateMs = 0,
    scheduleProgressUpdate = true,
  } = {}) => {
    const maybeScheduleProgressUpdate = () => {
      if (!scheduleProgressUpdate) {
        return;
      }
      scheduleLevelProgressDisplayUpdate(delayProgressUpdateMs);
    };

    const points = resolveExperiencePointsForMonster();
    const level = resolveCurrentLevelForExperience();
    const sanitizedEarned = Math.max(0, Math.round(levelExperienceEarned));
    const wasComplete =
      levelExperienceRequirement > 0 && sanitizedEarned >= levelExperienceRequirement;

    if (!Number.isFinite(level)) {
      levelExperienceEarned = sanitizedEarned;
      maybeScheduleProgressUpdate();
      hasPendingLevelUpReward = levelUpAvailable && !wasComplete;
      if (hasPendingLevelUpReward) {
        rewardAnimationPlayed = false;
      }
      return;
    }

    if (points <= 0) {
      levelExperienceEarned = sanitizedEarned;
      maybeScheduleProgressUpdate();
      hasPendingLevelUpReward = levelUpAvailable && !wasComplete;
      if (hasPendingLevelUpReward) {
        rewardAnimationPlayed = false;
      }
      return;
    }

    const nextTotal = sanitizedEarned + points;
    const levelKey = String(Math.max(1, Math.round(level)));

    persistProgress({ experience: { [levelKey]: nextTotal } });
    levelExperienceEarned = nextTotal;
    maybeScheduleProgressUpdate();

    const requirementMetWithUpdate =
      levelExperienceRequirement > 0 && nextTotal >= levelExperienceRequirement;
    hasPendingLevelUpReward = requirementMetWithUpdate && !wasComplete;
    if (hasPendingLevelUpReward) {
      rewardAnimationPlayed = false;
    }
  };

  const markBattleReady = (img) => {
    if (!img) {
      return;
    }
    img.classList.remove('slide-in');
    img.classList.add('battle-ready');
  };

  const createSpriteEntranceController = (
    img,
    { animationNames = [], readyDelay = SPRITE_ENTRANCE_READY_DELAY_MS } = {}
  ) => {
    if (!img) {
      return null;
    }

    const allowedAnimationNames = Array.isArray(animationNames)
      ? animationNames.filter(Boolean)
      : [];
    const animationNameSet = new Set(allowedAnimationNames);

    let entranceActive = false;
    let readyTimeoutId = null;

    const clearReadyTimeout = () => {
      if (readyTimeoutId !== null) {
        window.clearTimeout(readyTimeoutId);
        readyTimeoutId = null;
      }
    };

    const finishEntrance = () => {
      if (!entranceActive) {
        return;
      }
      entranceActive = false;
      clearReadyTimeout();
      markBattleReady(img);
    };

    const isEntranceAnimationEvent = (event) => {
      if (!event || event.target !== img) {
        return false;
      }

      if (animationNameSet.size === 0) {
        return true;
      }

      return animationNameSet.has(event.animationName);
    };

    const handleAnimationEvent = (event) => {
      if (!entranceActive) {
        return;
      }

      if (!isEntranceAnimationEvent(event)) {
        return;
      }

      finishEntrance();
    };

    const prepareForEntrance = () => {
      clearReadyTimeout();
      entranceActive = false;
      img.classList.remove('battle-ready');
      img.classList.remove('slide-in');
      void img.offsetWidth;
    };

    const playEntrance = () => {
      clearReadyTimeout();
      entranceActive = true;
      img.classList.remove('battle-ready');
      img.classList.remove('slide-in');
      void img.offsetWidth;
      img.classList.add('slide-in');

      if (readyDelay > 0) {
        readyTimeoutId = window.setTimeout(() => {
          finishEntrance();
        }, readyDelay);
      } else {
        finishEntrance();
      }
    };

    img.addEventListener('animationend', handleAnimationEvent);
    img.addEventListener('animationcancel', handleAnimationEvent);

    return {
      prepareForEntrance,
      playEntrance,
      markReady: finishEntrance,
      cancel: () => {
        clearReadyTimeout();
        entranceActive = false;
        img.removeEventListener('animationend', handleAnimationEvent);
        img.removeEventListener('animationcancel', handleAnimationEvent);
      },
    };
  };

  const updateHeroAttackDisplay = () => {
    if (heroAttackVal) {
      heroAttackVal.textContent = hero.attack;
    }
  };

  const updateHeroHealthDisplay = () => {
    if (heroHealthVal) {
      heroHealthVal.textContent = hero.health;
    }
  };

  const applySuperAttackBoost = () => {
    if (heroSuperAttackBase === null) {
      heroSuperAttackBase = hero.attack;
    }
    hero.attack = heroSuperAttackBase * 2;
    updateHeroAttackDisplay();
  };

  const resetSuperAttackBoost = () => {
    if (heroSuperAttackBase === null) {
      return;
    }
    hero.attack = heroSuperAttackBase;
    heroSuperAttackBase = null;
    updateHeroAttackDisplay();
  };

  const ANSWER_LINGER_MS = 2000;
  const QUESTION_CLOSE_GAP_MS = 300;
  const PRE_ATTACK_DELAY_MS = 1000;
  const POST_CLOSE_ATTACK_DELAY_MS = 500;
  const ATTACK_EFFECT_DELAY_MS = 500;
  const ATTACK_EFFECT_HOLD_MS = 1000;
  const ATTACK_SHAKE_DURATION_MS = 1000;
  const POST_ATTACK_RESUME_DELAY_MS = 1000;

  const clearAttackEffectAnimation = (effectEl) => {
    if (!effectEl) {
      return;
    }
    effectEl.classList.remove('attack-effect--show');
    if (!effectEl.dataset.hold) {
      effectEl.classList.remove('attack-effect--visible');
    }
  };

  [heroAttackEffect, monsterAttackEffect].forEach((effectEl) => {
    if (!effectEl) {
      return;
    }
    effectEl.addEventListener('animationend', () => {
      clearAttackEffectAnimation(effectEl);
    });
    effectEl.addEventListener('animationcancel', () => {
      clearAttackEffectAnimation(effectEl);
    });
  });

  const selectAttackSprite = (sprites, { superAttack = false } = {}) => {
    if (!sprites || typeof sprites !== 'object') {
      return null;
    }

    if (superAttack) {
      return sprites.super || sprites.basic || null;
    }

    return sprites.basic || sprites.super || null;
  };

  const playAttackEffect = (targetImg, effectEl, sprites, options = {}) => {
    if (!battleField || !targetImg || !effectEl) {
      return null;
    }

    const sprite = selectAttackSprite(sprites, options);
    if (!sprite) {
      return null;
    }

    window.requestAnimationFrame(() => {
      if (!battleField || !targetImg || !effectEl) {
        return;
      }

      const battleRect = battleField.getBoundingClientRect();
      const targetRect = targetImg.getBoundingClientRect();
      const centerX = targetRect.left + targetRect.width / 2 - battleRect.left;
      const centerY = targetRect.top + targetRect.height / 2 - battleRect.top;

      effectEl.src = sprite;
      effectEl.style.left = `${centerX}px`;
      effectEl.style.top = `${centerY}px`;

      effectEl.classList.remove('attack-effect--show');
      effectEl.classList.remove('attack-effect--visible');
      effectEl.classList.remove('attack-effect--finishing');
      delete effectEl.dataset.hold;
      void effectEl.offsetWidth;

      const holdVisible = Boolean(options?.holdVisible);

      if (holdVisible) {
        effectEl.dataset.hold = 'true';
        effectEl.classList.add('attack-effect--visible');
      }

      effectEl.classList.add('attack-effect--show');
      if (!holdVisible) {
        effectEl.classList.add('attack-effect--visible');
      }
    });

    let released = false;
    return () => {
      if (released || !effectEl) {
        return;
      }
      released = true;
      delete effectEl.dataset.hold;

      const cleanupAttackEffect = () => {
        effectEl.classList.remove('attack-effect--show');
        effectEl.classList.remove('attack-effect--visible');
        effectEl.classList.remove('attack-effect--finishing');
      };

      const handleFinishAnimation = (event) => {
        if (event && event.animationName !== 'attack-effect-scale-down') {
          return;
        }
        effectEl.removeEventListener('animationend', handleFinishAnimation);
        cleanupAttackEffect();
      };

      effectEl.addEventListener('animationend', handleFinishAnimation);
      effectEl.classList.remove('attack-effect--show');
      effectEl.classList.add('attack-effect--finishing');
    };
  };

  const heroSpriteEntrance = createSpriteEntranceController(heroImg, {
    animationNames: ['hero-enter'],
  });

  const monsterSpriteEntrance = createSpriteEntranceController(monsterImg, {
    animationNames: ['monster-enter'],
  });

  window.requestAnimationFrame(() => {
    heroStats?.classList.add('show');
    monsterStats?.classList.add('show');
  });

  function resetQuestionPool(loadedQuestions) {
    const normalizeChoices = (choices, answer) => {
      if (!Array.isArray(choices)) {
        return [];
      }

      const normalized = choices
        .map((choice) => {
          if (choice && typeof choice === 'object' && !Array.isArray(choice)) {
            const rawName =
              typeof choice.name === 'string'
                ? choice.name.trim()
                : choice.name !== undefined && choice.name !== null
                ? String(choice.name)
                : choice.value !== undefined && choice.value !== null
                ? String(choice.value)
                : '';
            const name = rawName ||
              (choice.value !== undefined && choice.value !== null
                ? String(choice.value)
                : '');
            if (!name) {
              return null;
            }
            const resolvedCorrect =
              typeof choice.correct === 'boolean'
                ? choice.correct
                : choice.value === answer ||
                  choice.name === answer ||
                  String(choice.value) === String(answer) ||
                  String(name) === String(answer);
            return { name, correct: Boolean(resolvedCorrect) };
          }

          const normalizedName =
            choice === null || choice === undefined ? '' : String(choice);
          if (!normalizedName) {
            return null;
          }
          const isCorrect =
            choice === answer || String(choice) === String(answer);
          return { name: normalizedName, correct: Boolean(isCorrect) };
        })
        .filter((choice) => choice && typeof choice.name === 'string');

      if (!normalized.some((choice) => choice.correct)) {
        return [];
      }

      return normalized;
    };

    const normalizeStructuredQuestions = (rawQuestions) => {
      if (!rawQuestions || typeof rawQuestions !== 'object' || Array.isArray(rawQuestions)) {
        return null;
      }

      let nextId = 1;
      const normalizedQuestions = [];
      const normalizedIds = [];
      const normalizedMap = new Map();
      const typePools = new Map();

      QUESTION_TYPE_CONFIG.forEach(({ type, key }) => {
        const entries = Array.isArray(rawQuestions[key]) ? rawQuestions[key] : [];
        const typeIds = [];

        entries.forEach((entry) => {
          if (!entry || typeof entry !== 'object') {
            return;
          }

          const prompt =
            typeof entry.question === 'string'
              ? entry.question.trim()
              : typeof entry.q === 'string'
              ? entry.q.trim()
              : '';
          if (!prompt) {
            return;
          }

          const normalizedChoices = normalizeChoices(entry.choices, entry.answer);
          if (!normalizedChoices.length) {
            return;
          }

          const normalizedQuestion = {
            id: nextId,
            type,
            question: prompt,
            choices: normalizedChoices,
            answer: entry.answer,
          };

          if (type === 'type2') {
            const count = Number(entry.spriteCount);
            if (Number.isFinite(count) && count > 0) {
              normalizedQuestion.spriteCount = count;
            }
          }

          normalizedQuestions.push(normalizedQuestion);
          normalizedIds.push(nextId);
          normalizedMap.set(nextId, normalizedQuestion);
          typeIds.push(nextId);
          nextId += 1;
        });

        if (typeIds.length > 0) {
          typePools.set(type, { ids: typeIds, queue: [] });
        }
      });

      if (!normalizedQuestions.length) {
        return null;
      }

      const maxTypeLength = Math.max(
        0,
        ...Array.from(typePools.values(), (pool) => pool.ids.length)
      );
      const levelOneSequence = [];
      for (let index = 0; index < maxTypeLength; index++) {
        QUESTION_TYPE_SEQUENCE.forEach((type) => {
          const pool = typePools.get(type);
          const id = pool?.ids?.[index];
          if (Number.isFinite(id)) {
            levelOneSequence.push(id);
          }
        });
      }

      return {
        questions: normalizedQuestions,
        ids: normalizedIds,
        map: normalizedMap,
        pools: typePools,
        levelOneSequence,
      };
    };

    questions = [];
    questionIds = [];
    questionMap = new Map();
    currentQuestionId = null;
    totalQuestionCount = 0;
    useIntroQuestionOrder = false;
    introQuestionIds = [];
    nextIntroQuestionIndex = 0;
    useStructuredQuestions = false;
    structuredQuestionPools = new Map();
    structuredQuestionTypeIndex = 0;
    levelOneStructuredSequence = [];
    levelOneStructuredIndex = 0;
    useLevelOneSequence = false;

    const structured = normalizeStructuredQuestions(loadedQuestions);
    if (structured) {
      questions = structured.questions;
      questionIds = structured.ids;
      questionMap = structured.map;
      totalQuestionCount = questions.length;
      structuredQuestionPools = structured.pools;
      levelOneStructuredSequence = structured.levelOneSequence;
      useStructuredQuestions = true;

      const resolvedLevel = getResolvedCurrentLevel();
      if (
        typeof resolvedLevel === 'number' &&
        Number.isFinite(resolvedLevel) &&
        levelOneStructuredSequence.length > 0 &&
        INTRO_QUESTION_LEVELS.has(resolvedLevel)
      ) {
        useLevelOneSequence = true;
      }

      return;
    }

    questions = Array.isArray(loadedQuestions) ? loadedQuestions.slice() : [];

    questions.forEach((question) => {
      const numericId = Number(question?.id);
      if (!Number.isFinite(numericId)) {
        return;
      }
      if (!questionMap.has(numericId)) {
        questionIds.push(numericId);
      }
      questionMap.set(numericId, question);
    });

    questionIds.sort((a, b) => a - b);
    totalQuestionCount = questionIds.length;

    const resolvedLevel = getResolvedCurrentLevel();
    if (
      typeof resolvedLevel === 'number' &&
      Number.isFinite(resolvedLevel) &&
      questionIds.length > 0 &&
      INTRO_QUESTION_LEVELS.has(resolvedLevel)
    ) {
      useIntroQuestionOrder = true;
      introQuestionIds = questionIds.slice();
    }
  }

  const acquireStructuredQuestion = (type) => {
    if (!useStructuredQuestions || !structuredQuestionPools) {
      return null;
    }

    const pool = structuredQuestionPools.get(type);
    if (!pool || !Array.isArray(pool.ids) || pool.ids.length === 0) {
      return null;
    }

    if (!Array.isArray(pool.queue) || pool.queue.length === 0) {
      pool.queue = shuffleArray(pool.ids);
    }

    while (Array.isArray(pool.queue) && pool.queue.length > 0) {
      const candidateId = pool.queue.shift();
      if (!Number.isFinite(candidateId)) {
        continue;
      }

      const candidateQuestion = questionMap.get(candidateId);
      if (candidateQuestion) {
        return { id: candidateId, question: candidateQuestion };
      }
    }

    return null;
  };

  function resolveQuestionByRoll(roll) {
    if (!Number.isFinite(roll)) {
      return null;
    }

    const directMatch = questionMap.get(roll);
    if (directMatch) {
      return { id: roll, question: directMatch };
    }

    const index = roll - 1;
    if (index >= 0 && index < questionIds.length) {
      const fallbackId = questionIds[index];
      if (Number.isFinite(fallbackId)) {
        const fallbackQuestion = questionMap.get(fallbackId);
        if (fallbackQuestion) {
          return { id: fallbackId, question: fallbackQuestion };
        }
      }
    }

    return null;
  }

  function chooseNextQuestion() {
    if (useStructuredQuestions) {
      if (useLevelOneSequence && levelOneStructuredSequence.length > 0) {
        const sequenceLength = levelOneStructuredSequence.length;
        const nextIndex = levelOneStructuredIndex % sequenceLength;
        const candidateId = levelOneStructuredSequence[nextIndex];
        levelOneStructuredIndex = (levelOneStructuredIndex + 1) % sequenceLength;
        if (Number.isFinite(candidateId)) {
          const candidateQuestion = questionMap.get(candidateId);
          if (candidateQuestion) {
            currentQuestionId = candidateId;
            return candidateQuestion;
          }
        }
      }

      const typeCount = QUESTION_TYPE_SEQUENCE.length;
      for (let attempt = 0; attempt < typeCount; attempt++) {
        const typeIndex = (structuredQuestionTypeIndex + attempt) % typeCount;
        const type = QUESTION_TYPE_SEQUENCE[typeIndex];
        const result = acquireStructuredQuestion(type);
        if (result) {
          structuredQuestionTypeIndex = (typeIndex + 1) % typeCount;
          currentQuestionId = result.id;
          return result.question;
        }
      }

      for (const id of questionIds) {
        const fallbackQuestion = questionMap.get(id);
        if (fallbackQuestion) {
          currentQuestionId = id;
          return fallbackQuestion;
        }
      }

      return questions[0] ?? null;
    }

    if (totalQuestionCount <= 0) {
      return questions[0] ?? null;
    }

    if (useIntroQuestionOrder && introQuestionIds.length > 0) {
      const questionCount = introQuestionIds.length;

      for (let attempt = 0; attempt < questionCount; attempt++) {
        const index = (nextIntroQuestionIndex + attempt) % questionCount;
        const candidateId = introQuestionIds[index];
        if (!Number.isFinite(candidateId)) {
          continue;
        }

        const candidateQuestion = questionMap.get(candidateId);
        if (!candidateQuestion) {
          continue;
        }

        if (questionCount > 1 && candidateId === currentQuestionId) {
          continue;
        }

        nextIntroQuestionIndex = (index + 1) % questionCount;
        currentQuestionId = candidateId;
        return candidateQuestion;
      }

      const fallbackId =
        introQuestionIds[nextIntroQuestionIndex] ?? introQuestionIds[0];
      const fallbackQuestion = questionMap.get(fallbackId);
      if (fallbackQuestion) {
        currentQuestionId = fallbackId;
        nextIntroQuestionIndex =
          questionCount > 0
            ? (nextIntroQuestionIndex + 1) % questionCount
            : 0;
        return fallbackQuestion;
      }
    }

    if (totalQuestionCount === 1) {
      const onlyId = questionIds[0];
      currentQuestionId = onlyId;
      return questionMap.get(onlyId) ?? questions[0] ?? null;
    }

    const maxAttempts = totalQuestionCount * 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const roll = Math.floor(Math.random() * totalQuestionCount) + 1;
      const resolved = resolveQuestionByRoll(roll);
      if (resolved && resolved.id !== currentQuestionId) {
        currentQuestionId = resolved.id;
        return resolved.question;
      }
    }

    for (const id of questionIds) {
      if (id !== currentQuestionId) {
        currentQuestionId = id;
        return questionMap.get(id) ?? null;
      }
    }

    const fallbackId = questionIds[0];
    currentQuestionId = fallbackId;
    return questionMap.get(fallbackId) ?? questions[0] ?? null;
  }

  function ensureStatValueText(valueEl) {
    if (!valueEl) {
      return null;
    }
    const existing = valueEl.querySelector('.stat-value-text');
    if (existing) {
      return existing;
    }
    const span = document.createElement('span');
    span.classList.add('stat-value-text');
    const initialText = valueEl.textContent ? valueEl.textContent.trim() : '';
    span.textContent = initialText;
    valueEl.textContent = '';
    valueEl.appendChild(span);
    return span;
  }

  function resetMonsterDefeatAnimation() {
    if (monsterDefeatAnimationTimeout !== null) {
      window.clearTimeout(monsterDefeatAnimationTimeout);
      monsterDefeatAnimationTimeout = null;
    }
    if (completeMonsterImg) {
      completeMonsterImg.classList.remove('monster-image--defeated');
    }
    if (monsterDefeatOverlay) {
      monsterDefeatOverlay.classList.remove('monster-defeat-overlay--visible');
    }
  }

  function applyMonsterDefeatStyles() {
    if (!monsterDefeatOverlay) {
      monsterDefeatAnimationTimeout = null;
      return;
    }
    if (completeMonsterImg) {
      completeMonsterImg.classList.add('monster-image--defeated');
    }
    monsterDefeatOverlay.classList.add('monster-defeat-overlay--visible');
    monsterDefeatAnimationTimeout = null;
  }

  function applyGoalResult(valueEl, textSpan, text, met) {
    if (!valueEl || !textSpan) {
      return;
    }
    textSpan.textContent = text;
    const icon = valueEl.querySelector('.goal-result-icon');
    if (icon) {
      icon.remove();
    }
    valueEl.classList.remove('goal-result--met', 'goal-result--missed');
    valueEl.classList.add(met ? 'goal-result--met' : 'goal-result--missed');
  }

  function setBattleCompleteTitleLines(...lines) {
    if (!battleCompleteTitle) {
      return;
    }

    const filteredLines = lines
      .map((line) => (typeof line === 'string' ? line.trim() : ''))
      .filter((line) => line.length > 0);

    battleCompleteTitle.replaceChildren();

    if (!filteredLines.length) {
      return;
    }

    filteredLines.forEach((line, index) => {
      battleCompleteTitle.appendChild(document.createTextNode(line));
      if (index < filteredLines.length - 1) {
        battleCompleteTitle.appendChild(document.createElement('br'));
      }
    });
  }

  const createDefaultGlobalRewardProgress = () => ({
    milestoneSize: GLOBAL_REWARD_MILESTONE,
    winsSinceReward: 0,
    totalWins: 0,
  });

  const sanitizeGlobalRewardProgress = (value) => {
    const defaults = createDefaultGlobalRewardProgress();

    if (!isPlainObject(value)) {
      return { ...defaults };
    }

    const rawMilestone = Number(value.milestoneSize);
    const milestone = Number.isFinite(rawMilestone) && rawMilestone > 0
      ? Math.max(1, Math.round(rawMilestone))
      : defaults.milestoneSize;

    const rawWins = Number(value.winsSinceReward);
    let winsSinceReward = Number.isFinite(rawWins)
      ? Math.max(0, Math.round(rawWins))
      : defaults.winsSinceReward;

    if (milestone > 0) {
      winsSinceReward = winsSinceReward % milestone;
    }

    const rawTotalWins = Number(value.totalWins);
    const totalWins = Number.isFinite(rawTotalWins)
      ? Math.max(0, Math.round(rawTotalWins))
      : defaults.totalWins;

    return {
      milestoneSize: milestone,
      winsSinceReward,
      totalWins,
    };
  };

  const updateGlobalRewardProgressState = (value) => {
    globalRewardProgress = sanitizeGlobalRewardProgress(value);
    latestGlobalRewardDisplay = null;
  };

  const clearGlobalProgressRevealTimeout = () => {
    if (globalProgressRevealTimeout !== null) {
      window.clearTimeout(globalProgressRevealTimeout);
      globalProgressRevealTimeout = null;
    }
  };

  const setElementVisibility = (element, visible) => {
    if (!element) {
      return;
    }

    if (visible) {
      element.removeAttribute('hidden');
      element.removeAttribute('aria-hidden');
      return;
    }

    if (!element.hasAttribute('hidden')) {
      element.setAttribute('hidden', 'hidden');
    }

    element.setAttribute('aria-hidden', 'true');
  };

  const setGlobalProgressTextVisibility = (visible) => {
    setElementVisibility(globalProgressHeading, visible);
    setElementVisibility(globalProgressCount, visible);
  };

  const setGlobalProgressCountDisplay = (wins, milestone) => {
    if (!globalProgressCount) {
      return;
    }

    const normalizedMilestone = (() => {
      const numericMilestone = Number(milestone);
      if (Number.isFinite(numericMilestone) && numericMilestone > 0) {
        return Math.max(1, Math.round(numericMilestone));
      }
      return GLOBAL_REWARD_MILESTONE;
    })();

    const normalizedWins = (() => {
      const numericWins = Number(wins);
      if (Number.isFinite(numericWins) && numericWins >= 0) {
        return Math.max(0, Math.min(normalizedMilestone, Math.round(numericWins)));
      }
      return 0;
    })();

    globalProgressCount.textContent = `${normalizedWins}/${normalizedMilestone}`;

    if (normalizedWins <= 0) {
      globalProgressCount.classList.add(GLOBAL_PROGRESS_DIM_CLASS);
    }
  };

  const resetGlobalProgressText = () => {
    if (globalProgressHeading) {
      globalProgressHeading.textContent = GLOBAL_PROGRESS_HEADING_TEXT;
    }

    setGlobalProgressCountDisplay(0, GLOBAL_REWARD_MILESTONE);
    setGlobalProgressTextVisibility(true);
  };

  const hideGlobalProgressDisplay = () => {
    if (!globalProgressContainer) {
      return;
    }

    clearGlobalProgressRevealTimeout();
    globalProgressContainer.classList.remove('battle-complete-card__progress--visible');
    globalProgressContainer.setAttribute('aria-hidden', 'true');
    if (!globalProgressContainer.hasAttribute('hidden')) {
      globalProgressContainer.setAttribute('hidden', 'hidden');
    }
    pendingGlobalProgressValue = 0;
    if (globalProgressFill) {
      globalProgressFill.style.setProperty('--progress-value', '0');
    }
  };

  const applyGlobalProgressDisplay = (display) => {
    if (!display || !globalProgressContainer) {
      return;
    }

    const milestone = Math.max(
      1,
      Math.round(Number(display.milestoneSize) || GLOBAL_REWARD_MILESTONE)
    );
    const wins = Math.max(
      0,
      Math.min(
        milestone,
        Math.round(Number(display.displayWins ?? display.winsSinceReward) || 0)
      )
    );

    if (globalProgressHeading) {
      globalProgressHeading.textContent = GLOBAL_PROGRESS_HEADING_TEXT;
    }

    setGlobalProgressCountDisplay(wins, milestone);

    if (globalProgressBar) {
      globalProgressBar.setAttribute('aria-valuemax', String(milestone));
      globalProgressBar.setAttribute('aria-valuenow', String(wins));
    }

    const ratio = milestone > 0 ? wins / milestone : 0;

    pendingGlobalProgressValue = ratio;
    if (globalProgressFill) {
      globalProgressFill.style.setProperty('--progress-value', '0');
    }
  };

  const showGlobalProgressDisplay = (display) => {
    if (!display || !globalProgressContainer) {
      return;
    }

    clearGlobalProgressRevealTimeout();
    applyGlobalProgressDisplay(display);
    globalProgressContainer.removeAttribute('hidden');
    globalProgressContainer.setAttribute('aria-hidden', 'false');
    globalProgressContainer.classList.remove('battle-complete-card__progress--visible');

    globalProgressRevealTimeout = window.setTimeout(() => {
      globalProgressContainer.classList.add('battle-complete-card__progress--visible');
      if (globalProgressFill) {
        const clampedValue = Number.isFinite(pendingGlobalProgressValue)
          ? Math.max(0, Math.min(1, pendingGlobalProgressValue))
          : 0;
        globalProgressFill.style.setProperty('--progress-value', `${clampedValue}`);
      }
      globalProgressRevealTimeout = null;
    }, Math.max(0, GLOBAL_PROGRESS_REVEAL_DELAY_MS));
  };

  const incrementGlobalRewardProgress = () => {
    const defaults = createDefaultGlobalRewardProgress();
    const milestone = Math.max(
      1,
      Math.round(Number(globalRewardProgress?.milestoneSize) || defaults.milestoneSize)
    );

    const currentWins = Math.max(
      0,
      Math.round(Number(globalRewardProgress?.winsSinceReward) || 0)
    );
    const totalWins = Math.max(
      0,
      Math.round(Number(globalRewardProgress?.totalWins) || 0)
    ) + 1;

    const winsAfter = currentWins + 1;
    const reachedMilestone = winsAfter >= milestone;
    const persistedWins = reachedMilestone ? 0 : winsAfter;
    const displayWins = Math.min(winsAfter, milestone);

    globalRewardProgress = {
      milestoneSize: milestone,
      winsSinceReward: persistedWins,
      totalWins,
    };

    const display = {
      milestoneSize: milestone,
      winsSinceReward: persistedWins,
      totalWins,
      displayWins,
      reachedMilestone,
    };

    latestGlobalRewardDisplay = display;
    return display;
  };

  const createMirroredProgressUpdate = (update) => {
    if (!isPlainObject(update)) {
      return null;
    }

    const filteredEntries = {};

    Object.entries(update).forEach(([key, value]) => {
      if (key === 'progress') {
        return;
      }

      filteredEntries[key] = value;
    });

    if (Object.keys(filteredEntries).length === 0) {
      return null;
    }

    const mirrored = applyProgressUpdate({}, filteredEntries);
    return Object.keys(mirrored).length > 0 ? mirrored : null;
  };

  function persistProgress(update) {
    if (!isPlainObject(update)) {
      return;
    }

    const previousLevelRaw = getResolvedCurrentLevel();
    const previousLevelValue = Number.isFinite(previousLevelRaw)
      ? Math.max(1, Math.floor(previousLevelRaw))
      : null;
    let leveledUp = false;

    const mirroredProgressUpdate = createMirroredProgressUpdate(update);
    const updatePayload = mirroredProgressUpdate
      ? {
          ...update,
          progress: applyProgressUpdate(
            isPlainObject(update.progress) ? update.progress : {},
            mirroredProgressUpdate
          ),
        }
      : update;

    if (window.preloadedData) {
      const mergedProgress = applyProgressUpdate(
        window.preloadedData.progress,
        updatePayload
      );
      window.preloadedData.progress = mergedProgress;

      const mergedLevel = Number(
        mergedProgress?.currentLevel ??
        mergedProgress?.level
      );
      if (Number.isFinite(mergedLevel)) {
        const normalizedMergedLevel = Math.max(1, Math.floor(mergedLevel));
        if (
          Number.isFinite(previousLevelValue) &&
          normalizedMergedLevel > previousLevelValue
        ) {
          leveledUp = true;
        }
        currentCurrentLevel = normalizedMergedLevel;
      }

      if (
        window.preloadedData.player &&
        typeof window.preloadedData.player === 'object'
      ) {
        window.preloadedData.player.progress = applyProgressUpdate(
          window.preloadedData.player.progress,
          updatePayload
        );
      }

      if (Object.prototype.hasOwnProperty.call(updatePayload, 'timeRemainingSeconds')) {
        const timeRemaining = updatePayload.timeRemainingSeconds;

        if (
          window.preloadedData.battleVariables &&
          typeof window.preloadedData.battleVariables === 'object'
        ) {
          window.preloadedData.battleVariables.timeRemainingSeconds = timeRemaining;
        } else {
          window.preloadedData.battleVariables = { timeRemainingSeconds: timeRemaining };
        }

        if (
          window.preloadedData.player &&
          typeof window.preloadedData.player === 'object'
        ) {
          const playerBattleVariables =
            typeof window.preloadedData.player.battleVariables === 'object' &&
            window.preloadedData.player.battleVariables !== null
              ? window.preloadedData.player.battleVariables
              : {};
          window.preloadedData.player.battleVariables = {
            ...playerBattleVariables,
            timeRemainingSeconds: timeRemaining,
          };
        }
      }
    }

    try {
      const storage = window.localStorage;
      if (!storage) {
        return;
      }
      const raw = storage.getItem(PROGRESS_STORAGE_KEY);
      let storedProgress = {};
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            storedProgress = parsed;
          }
        } catch (error) {
          storedProgress = {};
        }
      }
      const mergedProgress = applyProgressUpdate(storedProgress, updatePayload);
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(mergedProgress));
    } catch (error) {
      console.warn('Unable to save progress.', error);
    }

    if (leveledUp) {
      const syncFn = playerProfileUtils?.syncPlayerDataWithSupabase;
      if (typeof syncFn === 'function') {
        try {
          const syncResult = syncFn(
            window.preloadedData?.player ?? null,
            window.preloadedData?.progress ?? null
          );

          if (syncResult && typeof syncResult.then === 'function') {
            syncResult.catch((error) => {
              console.warn('Failed to sync level progress with Supabase.', error);
            });
          }
        } catch (error) {
          console.warn('Failed to sync level progress with Supabase.', error);
        }
      }
    }
  }

  function advanceCurrentLevel() {
    if (currentLevelAdvanced) {
      return;
    }

    const progress =
      window.preloadedData?.progress ?? window.preloadedData?.player?.progress ?? {};
    const resolvedLevel = Number(
      progress?.currentLevel ?? progress?.level
    );

    if (Number.isFinite(resolvedLevel)) {
      currentCurrentLevel = Math.max(1, Math.floor(resolvedLevel));
    }

    currentLevelAdvanced = true;
    shouldAdvanceCurrentLevel = false;
  }

  function loadData() {
    const data = window.preloadedData ?? {};
    const battleData = data.battle ?? {};
    const heroData = data.hero ?? {};
    const monsterData = data.monster ?? {};
    const progressData = data.progress ?? data.player?.progress ?? {};
    gemRewardIntroShown = Boolean(progressData?.gemRewardIntroShown);
    const experienceMap = normalizeExperienceMap(progressData?.experience);
    if (isPlainObject(data.progress)) {
      if (Object.keys(experienceMap).length > 0) {
        data.progress.experience = experienceMap;
      } else {
        delete data.progress.experience;
      }
    }
    if (
      data.player &&
      typeof data.player === 'object' &&
      isPlainObject(data.player.progress)
    ) {
      if (Object.keys(experienceMap).length > 0) {
        data.player.progress.experience = experienceMap;
      } else {
        delete data.player.progress.experience;
      }
    }
    updateGlobalRewardProgressState(progressData?.globalRewardProgress);

    const sanitizedGlobalRewardProgress = { ...globalRewardProgress };

    if (isPlainObject(data.progress)) {
      data.progress.globalRewardProgress = { ...sanitizedGlobalRewardProgress };
    }

    if (
      data.player &&
      typeof data.player === 'object' &&
      isPlainObject(data.player.progress)
    ) {
      data.player.progress.globalRewardProgress = {
        ...sanitizedGlobalRewardProgress,
      };
    }
    const battleProgress =
      data.battleVariables ?? data.player?.battleVariables ?? {};

    const assetBasePath = (() => {
      const globalBase =
        typeof window?.mathMonstersAssetBase === 'string'
          ? window.mathMonstersAssetBase.trim()
          : '';
      if (globalBase) {
        return globalBase;
      }
      return '..';
    })();

    const resolveAssetPath = (path) => {
      if (typeof path !== 'string') {
        return null;
      }

      const trimmed = path.trim();
      if (!trimmed) {
        return null;
      }

      const sanitized = sanitizeHeroSpritePath(trimmed);

      if (/^https?:\/\//i.test(sanitized) || /^data:/i.test(sanitized)) {
        return sanitized;
      }

      if (sanitized.startsWith('../') || sanitized.startsWith('./')) {
        return sanitized;
      }

      if (sanitized.startsWith('/')) {
        return sanitized;
      }

      const normalizedBase = assetBasePath.endsWith('/')
        ? assetBasePath.slice(0, -1)
        : assetBasePath;
      const normalizedPath = sanitizeHeroSpritePath(
        sanitized.replace(/^\/+/, '')
      );

      if (!normalizedBase || normalizedBase === '.') {
        return normalizedPath;
      }

      return sanitizeHeroSpritePath(`${normalizedBase}/${normalizedPath}`);
    };

    const isPlainObjectValue = (value) =>
      Boolean(value) && typeof value === 'object' && !Array.isArray(value);

    const normalizeAttackSprites = (...spriteSources) => {
      const allowedKeys = ['basic', 'super'];
      const result = {};

      const extractSpritePath = (source, key) => {
        if (!source) {
          return null;
        }

        if (typeof source === 'string') {
          return key === 'basic' ? source : null;
        }

        if (!isPlainObjectValue(source)) {
          return null;
        }

        if (typeof source[key] === 'string') {
          return source[key];
        }

        const legacyKey = `${key}Attack`;
        if (typeof source[legacyKey] === 'string') {
          return source[legacyKey];
        }

        const nestedObject =
          isPlainObjectValue(source.attackSprite) ||
          isPlainObjectValue(source.attackSprites)
            ? isPlainObjectValue(source.attackSprite)
              ? source.attackSprite
              : source.attackSprites
            : null;

        if (nestedObject && typeof nestedObject[key] === 'string') {
          return nestedObject[key];
        }

        if (typeof source.attackSprite === 'string' || typeof source.attackSprites === 'string') {
          const sprite = source.attackSprite || source.attackSprites;
          return key === 'basic' ? sprite : null;
        }

        return null;
      };

      spriteSources.forEach((source) => {
        allowedKeys.forEach((key) => {
          const spritePath = extractSpritePath(source, key);
          const resolved = resolveAssetPath(spritePath);
          if (resolved) {
            result[key] = resolved;
          }
        });
      });

      if (!result.super && result.basic) {
        result.super = result.basic;
      }

      return result;
    };

    const storedProgressLevel = sanitizeLevelNumber(progressData?.currentLevel);
    const legacyProgressLevel = sanitizeLevelNumber(progressData?.level);
    const providedLevel = sanitizeLevelNumber(data.level?.currentLevel);

    let initialResolvedLevel = storedProgressLevel;
    if (legacyProgressLevel !== null && (initialResolvedLevel === null || legacyProgressLevel > initialResolvedLevel)) {
      initialResolvedLevel = legacyProgressLevel;
    }
    if (providedLevel !== null && (initialResolvedLevel === null || providedLevel > initialResolvedLevel)) {
      initialResolvedLevel = providedLevel;
    }

    currentCurrentLevel = initialResolvedLevel;

    levelExperienceEarned = readExperienceForLevel(
      experienceMap,
      currentCurrentLevel
    );
    const levelUpValue = Number(battleData.levelUp);
    levelExperienceRequirement = Number.isFinite(levelUpValue)
      ? Math.max(0, Math.round(levelUpValue))
      : 0;

    accuracyGoal =
      typeof battleData.accuracyGoal === 'number' &&
      Number.isFinite(battleData.accuracyGoal)
        ? battleData.accuracyGoal
        : null;

    const parsedTimeGoal = Number(battleData.timeGoalSeconds);
    timeGoalSeconds =
      Number.isFinite(parsedTimeGoal) && parsedTimeGoal > 0
        ? Math.floor(parsedTimeGoal)
        : 0;

    const storedTime = Number(battleProgress.timeRemainingSeconds);
    if (Number.isFinite(storedTime) && storedTime > 0) {
      timeRemaining = Math.floor(storedTime);
      if (timeGoalSeconds > 0) {
        timeRemaining = Math.min(timeRemaining, timeGoalSeconds);
      }
    } else {
      timeRemaining = timeGoalSeconds;
    }

    if (!Number.isFinite(timeRemaining) || timeRemaining < 0) {
      timeRemaining = 0;
    }

    initialTimeRemaining = Number.isFinite(timeRemaining) ? timeRemaining : 0;

    heroSuperAttackBase = null;
    hero.attack = toFiniteNumber(heroData.attack, hero.attack);
    hero.health = toFiniteNumber(heroData.health, hero.health);
    hero.damage = clampDamageToHealth(
      toFiniteNumber(heroData.damage, hero.damage),
      hero.health
    );
    hero.name = heroData.name || hero.name;
    const heroAttackSprites = normalizeAttackSprites(hero, heroData);
    if (Object.keys(heroAttackSprites).length > 0) {
      hero.attackSprites = heroAttackSprites;
    } else {
      delete hero.attackSprites;
    }
    delete hero.attackSprite;
    delete hero.basicAttack;
    delete hero.superAttack;

    const heroResolvedSprite = resolveAssetPath(heroData.sprite);
    const heroSpriteInfo = getPreloadedSpriteInfo(
      heroData.spritePreloadKey,
      heroResolvedSprite,
      heroData.sprite
    );
    const heroSprite = heroImg
      ? applySpriteSource(heroImg, heroSpriteInfo, heroResolvedSprite)
      : heroResolvedSprite;
    if (heroSprite) {
      hero.sprite = heroSprite;
    } else {
      delete hero.sprite;
    }
    if (heroImg) {
      heroSpriteReadyPromise = updateHeroSpriteCustomProperties();
    }
    if (heroImg && hero.name) {
      heroImg.alt = `${hero.name} ready for battle`;
    }

    monster.attack = toFiniteNumber(monsterData.attack, monster.attack);
    monster.health = toFiniteNumber(monsterData.health, monster.health);
    monster.damage = clampDamageToHealth(
      toFiniteNumber(monsterData.damage, monster.damage),
      monster.health
    );
    monster.name = monsterData.name || monster.name;

    const monsterAttackSprites = normalizeAttackSprites(
      { basic: 'images/monster/monster_attack.png' },
      monster,
      monsterData
    );
    if (Object.keys(monsterAttackSprites).length > 0) {
      monster.attackSprites = monsterAttackSprites;
    } else {
      delete monster.attackSprites;
    }
    delete monster.attackSprite;
    delete monster.basicAttack;
    delete monster.superAttack;

    const monsterResolvedSprite = resolveAssetPath(monsterData.sprite);
    const monsterSpriteInfo = getPreloadedSpriteInfo(
      monsterData.spritePreloadKey,
      monsterResolvedSprite,
      monsterData.sprite
    );
    const monsterSprite = monsterImg
      ? applySpriteSource(monsterImg, monsterSpriteInfo, monsterResolvedSprite)
      : monsterResolvedSprite;
    if (monsterSprite) {
      monster.sprite = monsterSprite;
    } else {
      delete monster.sprite;
    }
    if (monsterImg) {
      if (monster.sprite || monsterResolvedSprite) {
        monsterImg.hidden = false;
        monsterImg.setAttribute('aria-hidden', 'false');
        if (monster.name) {
          monsterImg.alt = `${monster.name} ready for battle`;
        } else {
          monsterImg.alt = 'Monster ready for battle';
        }
      } else {
        monsterImg.hidden = true;
        monsterImg.setAttribute('aria-hidden', 'true');
        monsterImg.alt = '';
      }
    }
    updateHeroAttackDisplay();
    updateHeroHealthDisplay();
    if (monsterAttackVal) monsterAttackVal.textContent = monster.attack;
    if (monsterHealthVal) monsterHealthVal.textContent = monster.health;
    if (heroNameEl) heroNameEl.textContent = hero.name;
    if (monsterNameEl) monsterNameEl.textContent = monster.name;
    if (heroHpBar && hero.name) {
      heroHpBar.setAttribute('aria-label', `${hero.name} health`);
    }
    if (monsterHpBar && monster.name) {
      monsterHpBar.setAttribute('aria-label', `${monster.name} health`);
    }
    if (completeMonsterImg) {
      completeMonsterImg.hidden = true;
      completeMonsterImg.setAttribute('aria-hidden', 'true');
      completeMonsterImg.alt = COMPLETE_MONSTER_REWARD_ALT;
    }

    const rawQuestions = data.questions;
    const loadedQuestions = Array.isArray(rawQuestions)
      ? rawQuestions.slice()
      : isPlainObjectValue(rawQuestions)
      ? { ...rawQuestions }
      : [];
    resetQuestionPool(loadedQuestions);

    updateHealthBars();
    updateBattleTimeDisplay();
    updateLevelProgressDisplay();
  }

  function updateHealthBars() {
    const heroHealth = toFiniteNumber(hero.health, 0);
    const heroDamage = clampDamageToHealth(hero.damage, heroHealth);
    hero.damage = heroDamage;
    const heroPercent =
      heroHealth > 0 ? ((heroHealth - heroDamage) / heroHealth) * 100 : 0;
    const monsterHealth = toFiniteNumber(monster.health, 0);
    const monsterDamage = clampDamageToHealth(monster.damage, monsterHealth);
    monster.damage = monsterDamage;
    const monsterPercent =
      monsterHealth > 0
        ? ((monsterHealth - monsterDamage) / monsterHealth) * 100
        : 0;
    updateHealthBar(heroHpBar, heroHpFill, heroPercent);
    updateHealthBar(monsterHpBar, monsterHpFill, monsterPercent);
  }

  function applyDevDamage(amount) {
    if (battleEnded) {
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }
    if (!hero) {
      return;
    }
    const heroHealth = toFiniteNumber(hero.health, 0);
    const currentDamage = clampDamageToHealth(hero.damage, heroHealth);
    const newDamage = clampDamageToHealth(
      currentDamage + numericAmount,
      heroHealth
    );
    if (newDamage === currentDamage) {
      return;
    }
    hero.damage = newDamage;
    updateHealthBars();
    if (hasEntityBeenDefeated(heroHealth, hero.damage)) {
      endBattle(false, { waitForHpDrain: heroHpFill });
    }
  }

  function applyDevDamageToMonster(amount) {
    if (battleEnded) {
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }
    if (!monster) {
      return;
    }
    const monsterHealth = toFiniteNumber(monster.health, 0);
    const currentDamage = clampDamageToHealth(monster.damage, monsterHealth);
    const newDamage = clampDamageToHealth(
      currentDamage + numericAmount,
      monsterHealth
    );
    if (newDamage === currentDamage) {
      return;
    }
    monster.damage = newDamage;
    updateHealthBars();
    if (hasEntityBeenDefeated(monsterHealth, monster.damage)) {
      endBattle(true, { waitForHpDrain: monsterHpFill });
    }
  }

  function skipToCurrentLevel(targetLevel) {
    const numericLevel = Number(targetLevel);
    if (!Number.isFinite(numericLevel)) {
      return;
    }

    const sanitizedLevel = Math.max(1, Math.floor(numericLevel));
    const resolvedCurrentLevel = getResolvedCurrentLevel();
    if (resolvedCurrentLevel === sanitizedLevel) {
      return;
    }

    persistProgress({
      currentLevel: sanitizedLevel,
    });
    currentCurrentLevel = sanitizedLevel;
    currentLevelAdvanced = false;

    window.setTimeout(() => {
      window.location.reload();
    }, 0);
  }

  function updateHealthBar(barEl, fillEl, percent) {
    const clampedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    if (barEl) {
      barEl.style.setProperty('--progress-value', `${clampedPercent / 100}`);
      barEl.setAttribute('aria-valuenow', `${Math.round(clampedPercent)}`);
      barEl.setAttribute('aria-valuetext', `${Math.round(clampedPercent)}%`);
    }
    if (fillEl) {
      fillEl.style.width = `${clampedPercent}%`;
    }
  }

  function waitForHealthDrain(fillEl) {
    return new Promise((resolve) => {
      if (!fillEl || typeof fillEl.addEventListener !== 'function') {
        resolve();
        return;
      }

      const widthIsEmpty = () => {
        const rectWidth = fillEl.getBoundingClientRect().width;
        if (!Number.isFinite(rectWidth)) {
          return true;
        }
        if (rectWidth <= 0.5) {
          return true;
        }
        const computedWidth = parseFloat(window.getComputedStyle(fillEl).width);
        return Number.isFinite(computedWidth) ? computedWidth <= 0.5 : false;
      };

      if (widthIsEmpty()) {
        resolve();
        return;
      }

      let resolved = false;
      const settle = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        fillEl.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      };

      const handleTransitionEnd = (event) => {
        if (event.propertyName === 'width' && widthIsEmpty()) {
          settle();
        }
      };

      fillEl.addEventListener('transitionend', handleTransitionEnd);

      const startTime = Date.now();
      const poll = () => {
        if (widthIsEmpty()) {
          settle();
          return;
        }
        if (Date.now() - startTime > 1200) {
          settle();
          return;
        }
        window.setTimeout(poll, 100);
      };

      window.setTimeout(poll, 100);
    });
  }

  function calculateAccuracy() {
    if (wrongAnswers === 0) {
      return 100;
    }
    return totalAnswers
      ? Math.max(0, Math.round((correctAnswers / totalAnswers) * 100))
      : 100;
  }

  function updateAccuracyDisplays() {
    const accuracy = calculateAccuracy();
    if (bannerAccuracyValue) bannerAccuracyValue.textContent = `${accuracy}%`;
    if (summaryAccuracyText) summaryAccuracyText.textContent = `${accuracy}%`;
  }

  function updateBattleTimeDisplay() {
    const timeValue = Number.isFinite(timeRemaining) ? Math.max(0, Math.floor(timeRemaining)) : 0;
    if (bannerTimeValue) bannerTimeValue.textContent = `${timeValue}s`;
    if (summaryTimeText) summaryTimeText.textContent = `${timeValue}s`;
  }

  function handleBattleTimerTick() {
    if (battleEnded) {
      stopBattleTimer();
      return;
    }
    if (!Number.isFinite(battleTimerDeadline)) {
      stopBattleTimer();
      return;
    }
    const now = Date.now();
    const secondsLeft = Math.max(0, Math.ceil((battleTimerDeadline - now) / 1000));
    if (secondsLeft !== timeRemaining) {
      timeRemaining = secondsLeft;
      updateBattleTimeDisplay();
    }
    if (secondsLeft <= 0) {
      endBattle(false, { reason: 'timeout' });
    }
  }

  function startBattleTimer() {
    stopBattleTimer();
    if (!battleStartTime) {
      battleStartTime = Date.now();
    }
    if (!Number.isFinite(timeRemaining) || timeRemaining <= 0) {
      timeRemaining = Math.max(0, Number.isFinite(timeRemaining) ? Math.floor(timeRemaining) : 0);
      updateBattleTimeDisplay();
      if (timeGoalSeconds > 0 && !battleEnded) {
        endBattle(false, { reason: 'timeout' });
      }
      return;
    }
    battleTimerDeadline = Date.now() + timeRemaining * 1000;
    updateBattleTimeDisplay();
    battleTimerInterval = window.setInterval(handleBattleTimerTick, 250);
  }

  function stopBattleTimer() {
    if (battleTimerInterval) {
      clearInterval(battleTimerInterval);
      battleTimerInterval = null;
    }
    battleTimerDeadline = null;
  }

  function showQuestion() {
    if (battleEnded) {
      return;
    }
    const q = chooseNextQuestion();
    if (!q) return;

    if (questionSpritesContainer) {
      questionSpritesContainer.innerHTML = '';
      questionSpritesContainer.setAttribute('hidden', 'hidden');
    }

    questionText.textContent = q.question || q.q || '';
    choicesEl.innerHTML = '';

    if (questionSpritesContainer && typeof q.type === 'string') {
      const spriteCount = Number(q.spriteCount);
      if (q.type === 'type2' && Number.isFinite(spriteCount) && spriteCount > 0) {
        const resolvedCount = Math.max(0, Math.floor(spriteCount));
        const bubblePath = resolveAssetPath('data/questions/bubble.png');
        if (bubblePath) {
          questionSpritesContainer.removeAttribute('hidden');
          for (let index = 0; index < resolvedCount; index++) {
            const img = document.createElement('img');
            img.src = bubblePath;
            img.alt = 'Bubble';
            img.width = 40;
            img.height = 40;
            img.decoding = 'async';
            questionSpritesContainer.appendChild(img);
          }
        }
      }
    }

    let choices = q.choices;
    if (!choices && q.options) {
      choices = q.options.map((opt) => ({ name: opt, correct: opt === q.answer }));
    }

    (choices || []).forEach((choice) => {
      const div = document.createElement('div');
      div.classList.add('choice');
      div.dataset.correct = !!choice.correct;
      const choiceNameValue =
        choice && Object.prototype.hasOwnProperty.call(choice, 'name')
          ? choice.name
          : choice?.value;
      const choiceLabel =
        choiceNameValue === null || choiceNameValue === undefined
          ? ''
          : String(choiceNameValue);
      if (choice.image) {
        const img = document.createElement('img');
        img.src = `/mathmonsters/images/questions/${choice.image}`;
        img.alt = choiceLabel;
        div.appendChild(img);
      }
      const p = document.createElement('p');
      p.classList.add('text-medium', 'text-dark');
      p.textContent = choiceLabel;
      div.appendChild(p);
      choicesEl.appendChild(div);
    });
    questionBox.classList.add('show');

    const resolvedCurrentLevel = getResolvedCurrentLevel();

    document.dispatchEvent(
      new CustomEvent('question-opened', {
        detail: { currentLevel: resolvedCurrentLevel },
      })
    );
  }

  function dispatchStreakMeterUpdate(correct) {
    document.dispatchEvent(
      new CustomEvent('streak-meter-update', {
        detail: {
          correct: Boolean(correct),
          streak,
          streakGoal: STREAK_GOAL,
        },
      })
    );
  }

  function showIncrease(el, text) {
    if (!el) return;
    el.classList.remove('show');
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
    }, 2000);
  }

  const applyShake = (targetImg) => {
    if (!targetImg || ATTACK_SHAKE_DURATION_MS <= 0) {
      return () => {};
    }
    targetImg.classList.add('battle-shake');
    return () => {
      targetImg.classList.remove('battle-shake');
    };
  };

  function heroAttack() {
    if (battleEnded) {
      resetSuperAttackBoost();
      return;
    }
    const useSuperAttack = streakMaxed;
    let activeShakeCleanup = null;

    const ensureShake = () => {
      if (!monsterImg || ATTACK_SHAKE_DURATION_MS <= 0) {
        return () => {};
      }
      if (activeShakeCleanup) {
        return activeShakeCleanup;
      }
      const cleanup = applyShake(monsterImg);
      activeShakeCleanup = () => {
        cleanup();
        activeShakeCleanup = null;
      };
      return activeShakeCleanup;
    };

    let releaseEffect = () => {};
    let cancelEffectDelay = () => {};
    let effectActivated = false;
    let effectStartDeadline = null;

    const triggerDelayedEffects = () => {
      if (effectActivated || battleEnded) {
        return;
      }
      effectActivated = true;
      cancelEffectDelay();
      effectStartDeadline = null;
      releaseEffect =
        playAttackEffect(monsterImg, monsterAttackEffect, hero.attackSprites, {
          superAttack: useSuperAttack,
          holdVisible: ATTACK_EFFECT_HOLD_MS > 0,
        }) || (() => {});
      ensureShake();
    };

    const scheduleDelayedEffects = () => {
      cancelEffectDelay();
      effectStartDeadline = Date.now() + ATTACK_EFFECT_DELAY_MS;
      if (ATTACK_EFFECT_DELAY_MS <= 0) {
        triggerDelayedEffects();
        return;
      }
      const timeoutId = window.setTimeout(() => {
        cancelEffectDelay = () => {};
        triggerDelayedEffects();
      }, ATTACK_EFFECT_DELAY_MS);
      cancelEffectDelay = () => {
        window.clearTimeout(timeoutId);
        cancelEffectDelay = () => {};
      };
    };

    const queueDamage = (releaseEffectFn) => {
      const releaseEffectHandler =
        typeof releaseEffectFn === 'function' ? releaseEffectFn : () => {};

      const startSequence = () => {
        if (battleEnded) {
          resetSuperAttackBoost();
          releaseEffectHandler();
          return;
        }
        const removeShake = ensureShake();

        const cleanupAfterShake = () => {
          removeShake();
          releaseEffectHandler();
        };

        const proceedAfterShake = () => {
          if (battleEnded) {
            return;
          }
          window.setTimeout(() => {
            if (battleEnded) {
              return;
            }
            if (hasEntityBeenDefeated(monster.health, monster.damage)) {
              endBattle(true, { waitForHpDrain: monsterHpFill });
            } else {
              showQuestion();
            }
          }, POST_ATTACK_RESUME_DELAY_MS);
        };

        const finishAttack = () => {
          cleanupAfterShake();
          proceedAfterShake();
        };

        const applyDamage = () => {
          if (battleEnded) {
            resetSuperAttackBoost();
            cleanupAfterShake();
            return;
          }
          const currentDamage = clampDamageToHealth(
            monster.damage,
            monster.health
          );
          const attackAmount = toFiniteNumber(hero.attack, 0);
          const updatedDamage = clampDamageToHealth(
            currentDamage + attackAmount,
            monster.health
          );
          monster.damage = updatedDamage;
          updateHealthBars();
          if (useSuperAttack) {
            streak = 0;
            streakMaxed = false;
          }
          resetSuperAttackBoost();

          if (ATTACK_SHAKE_DURATION_MS > 0) {
            window.setTimeout(finishAttack, ATTACK_SHAKE_DURATION_MS);
          } else {
            finishAttack();
          }
        };

        if (ATTACK_EFFECT_HOLD_MS > 0) {
          window.setTimeout(applyDamage, ATTACK_EFFECT_HOLD_MS);
        } else {
          applyDamage();
        }
      };

      if (!effectActivated) {
        if (effectStartDeadline !== null) {
          const remainingDelay = Math.max(effectStartDeadline - Date.now(), 0);
          if (remainingDelay > 0) {
            window.setTimeout(() => {
              triggerDelayedEffects();
              startSequence();
            }, remainingDelay);
            return;
          }
        }
        triggerDelayedEffects();
      }

      startSequence();
    };

    const startHandler = (event) => {
      if (!event || event.animationName !== 'hero-attack') {
        return;
      }
      heroImg.removeEventListener('animationstart', startHandler);
      if (battleEnded) {
        cancelEffectDelay();
        return;
      }
      scheduleDelayedEffects();
    };
    const endHandler = (event) => {
      if (!event || event.animationName !== 'hero-attack') {
        return;
      }
      heroImg.classList.remove('attack');
      heroImg.removeEventListener('animationstart', startHandler);
      heroImg.removeEventListener('animationend', endHandler);
      if (battleEnded) {
        cancelEffectDelay();
        releaseEffect();
        resetSuperAttackBoost();
        return;
      }
      queueDamage(() => releaseEffect());
    };

    heroImg.addEventListener('animationstart', startHandler);
    heroImg.addEventListener('animationend', endHandler);
    heroImg.classList.add('attack');
  }

  function monsterAttack() {
    if (battleEnded) {
      return;
    }

    let activeShakeCleanup = null;

    const ensureShake = () => {
      if (!heroImg || ATTACK_SHAKE_DURATION_MS <= 0) {
        return () => {};
      }
      if (activeShakeCleanup) {
        return activeShakeCleanup;
      }
      const cleanup = applyShake(heroImg);
      activeShakeCleanup = () => {
        cleanup();
        activeShakeCleanup = null;
      };
      return activeShakeCleanup;
    };

    let releaseEffect = () => {};
    let cancelEffectDelay = () => {};
    let effectActivated = false;
    let effectStartDeadline = null;

    const triggerDelayedEffects = () => {
      if (effectActivated || battleEnded) {
        return;
      }
      effectActivated = true;
      cancelEffectDelay();
      effectStartDeadline = null;
      releaseEffect =
        playAttackEffect(heroImg, heroAttackEffect, monster.attackSprites, {
          holdVisible: ATTACK_EFFECT_HOLD_MS > 0,
        }) || (() => {});
      ensureShake();
    };

    const scheduleDelayedEffects = () => {
      cancelEffectDelay();
      effectStartDeadline = Date.now() + ATTACK_EFFECT_DELAY_MS;
      if (ATTACK_EFFECT_DELAY_MS <= 0) {
        triggerDelayedEffects();
        return;
      }
      const timeoutId = window.setTimeout(() => {
        cancelEffectDelay = () => {};
        triggerDelayedEffects();
      }, ATTACK_EFFECT_DELAY_MS);
      cancelEffectDelay = () => {
        window.clearTimeout(timeoutId);
        cancelEffectDelay = () => {};
      };
    };

    const queueDamage = (releaseEffectFn) => {
      const releaseEffectHandler =
        typeof releaseEffectFn === 'function' ? releaseEffectFn : () => {};
      const startSequence = () => {
        if (battleEnded) {
          releaseEffectHandler();
          return;
        }
        const removeShake = ensureShake();

        const cleanupAfterShake = () => {
          removeShake();
          releaseEffectHandler();
        };

        const proceedAfterShake = () => {
          if (battleEnded) {
            return;
          }
          if (hasEntityBeenDefeated(hero.health, hero.damage)) {
            endBattle(false, { waitForHpDrain: heroHpFill });
          } else {
            window.setTimeout(() => {
              if (!battleEnded) {
                showQuestion();
              }
            }, POST_ATTACK_RESUME_DELAY_MS);
          }
        };

        const finishAttack = () => {
          cleanupAfterShake();
          proceedAfterShake();
        };

        const applyDamage = () => {
          if (battleEnded) {
            cleanupAfterShake();
            return;
          }
          const currentDamage = clampDamageToHealth(hero.damage, hero.health);
          const attackAmount = toFiniteNumber(monster.attack, 0);
          const updatedDamage = clampDamageToHealth(
            currentDamage + attackAmount,
            hero.health
          );
          hero.damage = updatedDamage;
          updateHealthBars();

          if (ATTACK_SHAKE_DURATION_MS > 0) {
            window.setTimeout(finishAttack, ATTACK_SHAKE_DURATION_MS);
          } else {
            finishAttack();
          }
        };

        if (ATTACK_EFFECT_HOLD_MS > 0) {
          window.setTimeout(applyDamage, ATTACK_EFFECT_HOLD_MS);
        } else {
          applyDamage();
        }
      };

      if (!effectActivated) {
        if (effectStartDeadline !== null) {
          const remainingDelay = Math.max(effectStartDeadline - Date.now(), 0);
          if (remainingDelay > 0) {
            window.setTimeout(() => {
              triggerDelayedEffects();
              startSequence();
            }, remainingDelay);
            return;
          }
        }
        triggerDelayedEffects();
      }

      startSequence();
    };

    const startHandler = (event) => {
      if (!event || event.animationName !== 'monster-attack') {
        return;
      }
      monsterImg.removeEventListener('animationstart', startHandler);
      if (battleEnded) {
        cancelEffectDelay();
        return;
      }
      scheduleDelayedEffects();
    };
    const endHandler = (event) => {
      if (!event || event.animationName !== 'monster-attack') {
        return;
      }
      monsterImg.classList.remove('attack');
      monsterImg.removeEventListener('animationstart', startHandler);
      monsterImg.removeEventListener('animationend', endHandler);
      if (battleEnded) {
        cancelEffectDelay();
        releaseEffect();
        return;
      }
      queueDamage(() => releaseEffect());
    };

    monsterImg.addEventListener('animationstart', startHandler);
    monsterImg.addEventListener('animationend', endHandler);
    monsterImg.classList.add('attack');
  }

  const scheduleQuestionClose = (afterClose) => {
    window.setTimeout(() => {
      if (battleEnded) {
        return;
      }
      document.dispatchEvent(new Event('close-question'));
      if (typeof afterClose === 'function') {
        window.setTimeout(() => {
          if (!battleEnded) {
            afterClose();
          }
        }, QUESTION_CLOSE_GAP_MS);
      }
    }, ANSWER_LINGER_MS);
  };

  const scheduleAttack = (attackFn) => {
    window.setTimeout(() => {
      if (!battleEnded) {
        attackFn();
      }
    }, PRE_ATTACK_DELAY_MS + POST_CLOSE_ATTACK_DELAY_MS);
  };

  document.addEventListener('answer-submitted', (e) => {
    if (battleEnded) {
      return;
    }
    const correct = e.detail.correct;
    const resolvedLevel = getResolvedCurrentLevel();
    totalAnswers++;
    if (correct) {
      correctAnswers++;
    } else {
      wrongAnswers++;
    }
    updateAccuracyDisplays();
    if (correct) {
      maybeShowFirstCorrectMedal(resolvedLevel, correctAnswers);
      let incEl = null;
      let incText = '';
      if (!streakMaxed) {
        streak++;
        if (streak >= STREAK_GOAL) {
          streak = STREAK_GOAL;
          streakMaxed = true;
          applySuperAttackBoost();
          incEl = heroAttackInc;
          incText = 'x2';
        }
      }

      dispatchStreakMeterUpdate(true);

      scheduleQuestionClose(() => {
        if (incEl && incText) {
          showIncrease(incEl, incText);
        }
        scheduleAttack(heroAttack);
      });
    } else {
      streak = 0;
      streakMaxed = false;
      dispatchStreakMeterUpdate(false);
      scheduleQuestionClose(() => {
        scheduleAttack(monsterAttack);
      });
    }
  });
  function endBattle(win, _options = {}) {
    if (battleEnded) {
      return;
    }
    battleEnded = true;
    resetMonsterDefeatAnimation();
    resetSuperAttackBoost();
    document.dispatchEvent(new Event('close-question'));
    stopBattleTimer();
    updateAccuracyDisplays();
    updateBattleTimeDisplay();

    const accuracy = calculateAccuracy();
    const accuracyDisplay = `${accuracy}%`;
    const accuracyGoalMet =
      typeof accuracyGoal === 'number' ? accuracy / 100 >= accuracyGoal : true;

    const now = Date.now();
    const elapsedByTimer = initialTimeRemaining > 0
      ? Math.max(0, Math.round(initialTimeRemaining - timeRemaining))
      : 0;
    const elapsedByClock = battleStartTime
      ? Math.max(0, Math.round((now - battleStartTime) / 1000))
      : 0;
    const elapsedSeconds = initialTimeRemaining > 0
      ? Math.max(elapsedByTimer, elapsedByClock)
      : elapsedByClock;
    const timeDisplay = `${elapsedSeconds}s`;
    const timeGoalMet =
      timeGoalSeconds > 0 ? elapsedSeconds <= timeGoalSeconds : true;

    if (summaryAccuracyValue && summaryAccuracyText) {
      applyGoalResult(
        summaryAccuracyValue,
        summaryAccuracyText,
        accuracyDisplay,
        accuracyGoalMet
      );
    }

    if (summaryTimeValue && summaryTimeText) {
      applyGoalResult(
        summaryTimeValue,
        summaryTimeText,
        timeDisplay,
        timeGoalMet
      );
    }

    const resolvedCurrentLevel = resolveCurrentLevelForExperience();
    const progressState = readMathProgressState();
    const rewardCurrentLevel =
      normalizePositiveInteger(progressState?.currentLevelNumber) ??
      normalizePositiveInteger(resolvedCurrentLevel);
    const rewardBattleIndex = normalizePositiveInteger(
      progressState?.currentBattle
    );
    const isLevelOneBattle =
      Number.isFinite(rewardCurrentLevel) && rewardCurrentLevel === 1;

    if (spriteSurface) {
      if (win) {
        spriteSurface.hidden = false;
        spriteSurface.classList.remove(SPRITE_SURFACE_HIDDEN_CLASS);
        spriteSurface.setAttribute('aria-hidden', 'false');
      } else {
        spriteSurface.hidden = true;
        spriteSurface.classList.add(SPRITE_SURFACE_HIDDEN_CLASS);
        spriteSurface.setAttribute('aria-hidden', 'true');
      }
    }

    if (completeMonsterImg) {
      if (win) {
        completeMonsterImg.hidden = false;
        completeMonsterImg.setAttribute('aria-hidden', 'false');
      } else {
        completeMonsterImg.hidden = true;
        completeMonsterImg.setAttribute('aria-hidden', 'true');
      }
      completeMonsterImg.src = COMPLETE_MONSTER_REWARD_SRC_RESOLVED;
      completeMonsterImg.alt = COMPLETE_MONSTER_REWARD_ALT;
    }

    const goalsAchieved = win;

    hideGlobalProgressDisplay();

    if (win) {
      setBattleCompleteTitleLines('Monster Defeated!');
      awardExperiencePoints({ scheduleProgressUpdate: false });
    } else {
      setBattleCompleteTitleLines('Keep Practicing!');
      latestGlobalRewardDisplay = null;
    }

    battleGoalsMet = goalsAchieved;

    let gemRewardAmount = 0;
    let updatedGemTotal = null;
    const shouldAwardGemReward = win || !isLevelOneBattle;

    if (shouldAwardGemReward) {
      gemRewardAmount = win ? GEM_REWARD_WIN_AMOUNT : GEM_REWARD_LOSS_AMOUNT;
      updatedGemTotal = awardGemReward(gemRewardAmount);
      persistGemTotal(updatedGemTotal);
    }

    if (win) {
      const mathProgressUpdate = computeNextMathProgressOnWin();
      shouldAdvanceCurrentLevel = Boolean(mathProgressUpdate?.advanceLevel);

      const globalProgressUpdate = computeNextGlobalProgressOnWin();

      const updatePayload =
        globalProgressUpdate && typeof globalProgressUpdate === 'object'
          ? { ...globalProgressUpdate }
          : {};

      if (mathProgressUpdate && mathProgressUpdate.mathKey) {
        const nextLevelNumber = Number.isFinite(
          mathProgressUpdate.nextCurrentLevelNumber
        )
          ? Math.max(1, Math.round(mathProgressUpdate.nextCurrentLevelNumber))
          : null;
        const existingEntry = updatePayload[mathProgressUpdate.mathKey];
        const baseEntry = isPlainObject(existingEntry) ? existingEntry : {};

        updatePayload[mathProgressUpdate.mathKey] = {
          ...baseEntry,
        };

        if (nextLevelNumber !== null) {
          updatePayload[mathProgressUpdate.mathKey].currentLevel =
            nextLevelNumber;
        }
      }

      if (Object.keys(updatePayload).length > 0) {
        persistProgress(updatePayload);
      }
    } else {
      shouldAdvanceCurrentLevel = false;
    }

    if (win) {
      if (isLevelOneBattle) {
        setGlobalProgressTextVisibility(false);
        if (latestGlobalRewardDisplay) {
          const milestoneOverride = Math.max(
            1,
            Math.round(
              Number(latestGlobalRewardDisplay.milestoneSize) || GLOBAL_REWARD_MILESTONE
            )
          );
          latestGlobalRewardDisplay = {
            ...latestGlobalRewardDisplay,
            displayWins: milestoneOverride,
          };
        }
      } else {
        setGlobalProgressTextVisibility(true);
      }
    } else {
      setGlobalProgressTextVisibility(true);
    }

    if (win) {
      pendingGemReward = {
        amount: gemRewardAmount,
        totalAfter: updatedGemTotal,
        isFirstGemReward: !gemRewardIntroShown,
        currentLevel: rewardCurrentLevel,
        currentBattle: rewardBattleIndex,
        win: true,
      };
    } else if (shouldAwardGemReward) {
      pendingGemReward = {
        amount: gemRewardAmount,
        totalAfter: updatedGemTotal,
        isFirstGemReward: false,
        currentLevel: rewardCurrentLevel,
        currentBattle: rewardBattleIndex,
        win: false,
      };
    } else {
      pendingGemReward = null;
    }

    if (win && !hasPendingLevelUpReward) {
      const isInitialLevel =
        Number.isFinite(resolvedCurrentLevel) && resolvedCurrentLevel === 1;
      const noExperienceRequirement = levelExperienceRequirement <= 0;
      if (
        isInitialLevel &&
        noExperienceRequirement &&
        !rewardAnimationPlayed &&
        isHeroAtInitialEvolutionStage()
      ) {
        hasPendingLevelUpReward = true;
        rewardAnimationPlayed = false;
      }
    }

    updateNextMissionButton(win);

    if (!win) {
      resetRewardOverlay();
    }

    const showCompleteMessage = () => {
      const progressDelay = win
        ? VICTORY_PROGRESS_UPDATE_DELAY
        : DEFEAT_PROGRESS_UPDATE_DELAY;
      scheduleLevelProgressDisplayUpdate(progressDelay);

      if (!completeMessage) {
        return;
      }
      completeMessage.classList.add('show');
      completeMessage.setAttribute('aria-hidden', 'false');
      if (typeof completeMessage.focus === 'function') {
        completeMessage.focus();
      }
      if (win && latestGlobalRewardDisplay) {
        showGlobalProgressDisplay(latestGlobalRewardDisplay);
      }
      if (win) {
        monsterDefeatAnimationTimeout = window.setTimeout(() => {
          applyMonsterDefeatStyles();
        }, MONSTER_DEFEAT_ANIMATION_DELAY);
      }

    };

    const waitForHpDrainEl =
      _options && typeof _options.waitForHpDrain?.addEventListener === 'function'
        ? _options.waitForHpDrain
        : null;

    if (waitForHpDrainEl) {
      waitForHealthDrain(waitForHpDrainEl).then(() => {
        showCompleteMessage();
      });
    } else {
      showCompleteMessage();
    }
  }

  if (nextMissionBtn) {
    nextMissionBtn.addEventListener('click', () => {
      if (nextMissionProcessing) {
        return;
      }

      if (hasPendingLevelUpReward && !rewardAnimationPlayed) {
        rewardAnimationPlayed = true;
        hasPendingLevelUpReward = false;
        updateNextMissionButton(true);
        playLevelUpRewardAnimation();
        return;
      }

      if (pendingGemReward) {
        const rewardLevel = Number(pendingGemReward.currentLevel);
        const skipGemAnimation =
          Number.isFinite(rewardLevel) &&
          rewardLevel >= 2 &&
          !isGemMilestoneReward(pendingGemReward);

        if (skipGemAnimation) {
          nextMissionProcessing = true;
          nextMissionBtn.setAttribute('aria-busy', 'true');
          const rewardTotal = normalizeNonNegativeInteger(
            pendingGemReward.totalAfter
          );
          const rewardAmount = normalizeNonNegativeInteger(
            pendingGemReward.amount
          );
          const startTotal =
            rewardTotal !== null && rewardAmount !== null
              ? Math.max(0, rewardTotal - rewardAmount)
              : null;

          if (pendingGemReward.isFirstGemReward) {
            markGemRewardIntroSeen();
          }

          if (rewardTotal !== null) {
            storeGemRewardHomeAnimation({
              start: startTotal,
              end: rewardTotal,
              amount: rewardAmount,
              duration: 900,
            });
          }

          pendingGemReward = null;

          if (battleGoalsMet && shouldAdvanceCurrentLevel && !currentLevelAdvanced) {
            advanceCurrentLevel();
          }
          resetRewardOverlay();
          window.location.href = '../index.html';
          return;
        }

        nextMissionProcessing = true;
        nextMissionBtn.setAttribute('aria-busy', 'true');
        playGemRewardAnimation(pendingGemReward)
          .catch((error) => {
            console.warn('Gem reward animation failed, falling back to navigation.', error);
            resetRewardOverlay();
            if (battleGoalsMet && shouldAdvanceCurrentLevel && !currentLevelAdvanced) {
              advanceCurrentLevel();
            }
            window.location.href = '../index.html';
          })
          .finally(() => {
            nextMissionBtn.removeAttribute('aria-busy');
            nextMissionProcessing = false;
          });
        return;
      }

      const action = nextMissionBtn.dataset.action;
      if (action === 'retry') {
        window.location.reload();
        return;
      }

      if (battleGoalsMet && shouldAdvanceCurrentLevel && !currentLevelAdvanced) {
        advanceCurrentLevel();
      }
      resetRewardOverlay();
      window.location.href = '../index.html';
    });
  }

  function initBattle() {
    battleEnded = false;
    streak = 0;
    streakMaxed = false;
    resetSuperAttackBoost();
    questions = [];
    questionIds = [];
    questionMap = new Map();
    currentQuestionId = null;
    totalQuestionCount = 0;
    correctAnswers = 0;
    totalAnswers = 0;
    wrongAnswers = 0;
    battleStartTime = null;
    initialTimeRemaining = 0;
    currentLevelAdvanced = false;
    battleGoalsMet = false;
    levelExperienceEarned = 0;
    levelExperienceRequirement = 0;
    levelUpAvailable = false;
    hasPendingLevelUpReward = false;
    rewardAnimationPlayed = false;
    cancelScheduledLevelProgressDisplayUpdate();
    clearRewardAnimation();
    updateLevelProgressDisplay();
    hideMedal({ immediate: true });
    if (completeMessage) {
      completeMessage.classList.remove('show');
      completeMessage.setAttribute('aria-hidden', 'true');
    }
    resetMonsterDefeatAnimation();
    resetRewardOverlay();
    setBattleCompleteTitleLines('Monster Defeated!');
    if (spriteSurface) {
      spriteSurface.hidden = false;
      spriteSurface.classList.remove(SPRITE_SURFACE_HIDDEN_CLASS);
      spriteSurface.setAttribute('aria-hidden', 'false');
    }
    if (monsterImg) {
      monsterImg.hidden = true;
      monsterImg.setAttribute('aria-hidden', 'true');
      monsterImg.alt = '';
    }
    if (completeMonsterImg) {
      completeMonsterImg.hidden = true;
      completeMonsterImg.setAttribute('aria-hidden', 'true');
      completeMonsterImg.src = COMPLETE_MONSTER_REWARD_SRC_RESOLVED;
      completeMonsterImg.alt = COMPLETE_MONSTER_REWARD_ALT;
    }
    hideGlobalProgressDisplay();
    resetGlobalProgressText();
    latestGlobalRewardDisplay = null;
    updateNextMissionButton();
    if (summaryAccuracyValue) {
      summaryAccuracyValue.classList.remove('goal-result--met', 'goal-result--missed');
    }
    if (summaryTimeValue) {
      summaryTimeValue.classList.remove('goal-result--met', 'goal-result--missed');
    }
    heroSpriteEntrance?.prepareForEntrance();
    monsterSpriteEntrance?.prepareForEntrance();
    loadData();
    heroSpriteEntrance?.playEntrance();
    monsterSpriteEntrance?.playEntrance();
    updateAccuracyDisplays();
    startBattleTimer();

    const scheduleFirstQuestion = () => {
      if (INITIAL_QUESTION_DELAY_MS <= 0) {
        showQuestion();
        return;
      }

      window.setTimeout(showQuestion, INITIAL_QUESTION_DELAY_MS);
    };

    scheduleFirstQuestion();
  }

  if (devHeroDamageButton) {
    devHeroDamageButton.addEventListener('click', () => {
      applyDevDamage(DEV_DAMAGE_AMOUNT);
    });
  }

  if (devMonsterDamageButton) {
    devMonsterDamageButton.addEventListener('click', () => {
      applyDevDamageToMonster(DEV_DAMAGE_AMOUNT);
    });
  }

  if (devSkipBattleButton) {
    devSkipBattleButton.addEventListener('click', () => {
      skipToCurrentLevel(DEV_SKIP_TARGET_LEVEL);
    });
  }

  if (window.preloadedData) {
    initBattle();
  } else {
    document.addEventListener('data-loaded', initBattle, { once: true });
  }
});
