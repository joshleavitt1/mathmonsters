const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';
const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'mathmonstersProgress';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const LEVEL_UP_CELEBRATION_STORAGE_KEY = 'mathmonstersLevelUpCelebration';
const LEVEL_UP_CELEBRATION_MIN_LEVEL = 3;
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
const GEM_REWARD_WIN_AMOUNT = 5;
const GEM_REWARD_LOSS_AMOUNT = 1;
const GEM_REWARD_INITIAL_PAUSE_MS = 500;
const GEM_REWARD_CARD_DELAY_MS = 400;
const GEM_REWARD_PULSE_DURATION_MS = 2100;
const GEM_REWARD_PULSE_COUNT = 1;
const GEM_REWARD_CHEST_SRC = '../images/complete/chest.png';
const GEM_REWARD_GEM_SRC = '../images/complete/gem.png';
const REGISTER_PAGE_URL = './register.html';
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';

const progressUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersProgress) || null;

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

const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

const clonePlainObject = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to clone player profile for sync.', error);
    return null;
  }
};

let pendingSupabaseProfileSync = null;
let supabaseProfileSyncInFlight = false;
let cachedSupabaseUserId = null;
let supabaseUserIdPromise = null;

const resolveSupabaseUserId = async () => {
  if (cachedSupabaseUserId) {
    return cachedSupabaseUserId;
  }

  if (supabaseUserIdPromise) {
    try {
      const cached = await supabaseUserIdPromise;
      return cached ?? null;
    } catch (error) {
      console.warn('Supabase user resolution failed.', error);
      supabaseUserIdPromise = null;
      return null;
    }
  }

  const resolver = (async () => {
    if (playerProfileUtils && typeof playerProfileUtils.resolveCurrentUserId === 'function') {
      try {
        const resolved = await playerProfileUtils.resolveCurrentUserId();
        if (resolved) {
          cachedSupabaseUserId = resolved;
          return resolved;
        }
      } catch (error) {
        console.warn('Player profile utility user lookup failed.', error);
      }
    }

    const supabase = window.supabaseClient;
    if (!supabase?.auth) {
      return null;
    }

    try {
      if (typeof supabase.auth.getUser === 'function') {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Supabase user lookup for sync failed.', error);
        }
        const userId = data?.user?.id ?? null;
        if (userId) {
          cachedSupabaseUserId = userId;
        }
        return userId;
      }

      if (typeof supabase.auth.getSession === 'function') {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase session lookup for sync failed.', error);
        }
        const userId = data?.session?.user?.id ?? null;
        if (userId) {
          cachedSupabaseUserId = userId;
        }
        return userId;
      }
    } catch (error) {
      console.warn('Unable to resolve Supabase user for sync.', error);
    }

    return null;
  })();

  supabaseUserIdPromise = resolver;

  try {
    const resolved = await resolver;
    if (!resolved) {
      supabaseUserIdPromise = null;
    }
    return resolved ?? null;
  } catch (error) {
    supabaseUserIdPromise = null;
    console.warn('Supabase user promise rejected.', error);
    return null;
  }
};

const prepareProfileForSupabase = (profile, userId) => {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  if (
    playerProfileUtils &&
    typeof playerProfileUtils.ensurePlayerIdentifiers === 'function'
  ) {
    const ensured = playerProfileUtils.ensurePlayerIdentifiers(profile, userId);
    if (ensured) {
      return ensured;
    }
  }

  const clone = clonePlainObject(profile);
  if (!clone) {
    return null;
  }

  if (typeof userId === 'string' && userId) {
    if (!clone.id || clone.id === 'player-001') {
      clone.id = userId;
    }

    if (clone.player && typeof clone.player === 'object') {
      if (!clone.player.id || clone.player.id === 'player-001') {
        clone.player.id = userId;
      }
    }
  }

  return clone;
};

const syncProfileToSupabase = async (profile) => {
  const supabase = window.supabaseClient;
  if (!supabase?.from) {
    return;
  }

  const userId = await resolveSupabaseUserId();
  if (!userId) {
    return;
  }

  const payload = prepareProfileForSupabase(profile, userId);
  if (!payload) {
    return;
  }

  try {
    const { error } = await supabase
      .from('player_profiles')
      .upsert({ id: userId, player_data: payload }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase profile sync failed.', error);
    }
  } catch (error) {
    console.warn('Unable to sync player profile with Supabase.', error);
  }
};

const enqueueSupabaseProfileSync = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return;
  }

  const clonedProfile = clonePlainObject(profile);
  if (!clonedProfile) {
    return;
  }

  pendingSupabaseProfileSync = clonedProfile;
  if (supabaseProfileSyncInFlight) {
    return;
  }

  supabaseProfileSyncInFlight = true;

  const flushQueue = async () => {
    try {
      while (pendingSupabaseProfileSync) {
        const nextProfile = pendingSupabaseProfileSync;
        pendingSupabaseProfileSync = null;
        await syncProfileToSupabase(nextProfile);
      }
    } catch (error) {
      console.warn('Unexpected error during Supabase profile sync.', error);
    } finally {
      supabaseProfileSyncInFlight = false;
    }
  };

  flushQueue();
};

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
  const bannerAccuracyValue = document.querySelector('[data-banner-accuracy]');
  const bannerTimeValue = document.querySelector('[data-banner-time]');
  const heroAttackVal = heroStats.querySelector('.attack .value');
  const heroHealthVal = heroStats.querySelector('.health .value');
  const heroAttackInc = heroStats.querySelector('.attack .increase');
  const monsterAttackVal = monsterStats.querySelector('.attack .value');
  const monsterHealthVal = monsterStats.querySelector('.health .value');

  const completeMessage = document.getElementById('complete-message');
  const battleCompleteTitle = completeMessage?.querySelector('#battle-complete-title');
  const completeMonsterImg = completeMessage?.querySelector('.monster-image');
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
      : 'I made this potion from the monster. Can you guess what it does?';
  const defaultRewardCardButtonText =
    rewardCardButton && typeof rewardCardButton.textContent === 'string'
      ? rewardCardButton.textContent.trim()
      : 'Use Potion';
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

  const getResolvedBattleLevel = () => {
    if (Number.isFinite(currentBattleLevel)) {
      return currentBattleLevel;
    }

    const preloadedLevel = Number(window.preloadedData?.level?.battleLevel);
    return Number.isFinite(preloadedLevel) ? preloadedLevel : null;
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
  let currentBattleLevel = null;
  let battleStartTime = null;
  let battleLevelAdvanced = false;
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
  let shouldAdvanceBattleLevel = false;
  let nextMissionProcessing = false;
  let levelProgressUpdateTimeout = null;
  let levelProgressAnimationTimeout = null;
  let rewardCardButtonHandler = null;
  let evolutionGrowthStartTimeout = null;
  let evolutionGrowthFallbackTimeout = null;
  let evolutionRevealFallbackTimeout = null;
  let evolutionCardDelayTimeout = null;

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

  const REWARD_POTION_SRC = '../images/complete/potion.png';
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
    potion: resolveRewardSpriteSource(REWARD_POTION_SRC) || REWARD_POTION_SRC,
    chest: resolveRewardSpriteSource(GEM_REWARD_CHEST_SRC) || GEM_REWARD_CHEST_SRC,
    gem: resolveRewardSpriteSource(GEM_REWARD_GEM_SRC) || GEM_REWARD_GEM_SRC,
  };

  Object.values(rewardSpriteSources).forEach((source) => {
    preloadRewardSpriteSource(source).catch(() => {});
  });

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

  const resolveBattleLevels = () =>
    Array.isArray(window.preloadedData?.levels)
      ? window.preloadedData.levels.filter(
          (level) => level && typeof level === 'object'
        )
      : [];

  const findLevelByBattleNumber = (battleLevelNumber) => {
    if (!Number.isFinite(battleLevelNumber)) {
      return null;
    }

    const directLevel = window.preloadedData?.level;
    const directLevelNumber = Number(directLevel?.battleLevel ?? directLevel?.level);
    if (
      directLevel &&
      typeof directLevel === 'object' &&
      Number.isFinite(directLevelNumber) &&
      directLevelNumber === battleLevelNumber
    ) {
      return directLevel;
    }

    const levelsList = resolveBattleLevels();
    return (
      levelsList.find((level) => {
        const candidateNumber = Number(level?.battleLevel ?? level?.level);
        return Number.isFinite(candidateNumber) && candidateNumber === battleLevelNumber;
      }) || null
    );
  };

  const getBattleCountForLevelNumber = (battleLevelNumber) => {
    const levelData = findLevelByBattleNumber(battleLevelNumber);
    if (!levelData || typeof levelData !== 'object') {
      return 1;
    }

    const entries = Array.isArray(levelData.battles)
      ? levelData.battles.filter(Boolean)
      : [];
    return entries.length > 0 ? entries.length : 1;
  };

  const readMathProgressState = () => {
    const mathTypeCandidate = resolveMathTypeKey();
    const mathKey = findMathProgressKey(mathTypeCandidate);
    const progressRoot = resolveProgressRoot();
    const entry =
      progressRoot && mathKey && isPlainObject(progressRoot[mathKey])
        ? progressRoot[mathKey]
        : null;

    const battleLevelNumber = getResolvedBattleLevel();
    const battleCount = getBattleCountForLevelNumber(battleLevelNumber);
    const storedBattleTotal = Number(entry?.currentLevel);
    const storedBattleCurrent = Number(entry?.currentBattle);
    const resolvedBattleTotal = Number.isFinite(storedBattleTotal) && storedBattleTotal > 0
      ? Math.max(Math.round(storedBattleTotal), 1)
      : battleCount > 0
      ? battleCount
      : 1;
    let resolvedBattleCurrent = Number.isFinite(storedBattleCurrent) && storedBattleCurrent > 0
      ? Math.round(storedBattleCurrent)
      : 1;

    if (resolvedBattleCurrent > resolvedBattleTotal) {
      resolvedBattleCurrent = resolvedBattleTotal;
    }

    return {
      mathKey,
      mathTypeCandidate,
      entry,
      battleLevelNumber,
      battleCount: battleCount > 0 ? battleCount : 1,
      currentBattle: resolvedBattleCurrent,
      currentLevelTotal: resolvedBattleTotal,
    };
  };

  const computeNextMathProgressOnWin = () => {
    const state = readMathProgressState();
    const effectiveKey = state.mathKey || state.mathTypeCandidate;

    if (!effectiveKey) {
      return null;
    }

    const totalRequired = Math.max(state.currentLevelTotal, state.battleCount);
    let nextBattle = state.currentBattle + 1;
    let nextLevelTotal = Math.max(state.currentLevelTotal, totalRequired);
    let advanceLevel = false;
    let nextBattleLevelNumber = state.battleLevelNumber;

    if (nextBattle > totalRequired) {
      advanceLevel = true;
      nextBattle = 1;
      nextBattleLevelNumber = Number.isFinite(state.battleLevelNumber)
        ? state.battleLevelNumber + 1
        : state.battleLevelNumber;
      const nextLevelCount = getBattleCountForLevelNumber(nextBattleLevelNumber);
      nextLevelTotal = nextLevelCount > 0 ? nextLevelCount : nextLevelTotal;
    }

    return {
      mathKey: effectiveKey,
      nextBattle,
      nextLevelTotal,
      advanceLevel,
      nextBattleLevelNumber,
      totalRequired,
    };
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
    persistProgress({ gems: safeTotal });

    if (window.preloadedData) {
      if (window.preloadedData.progress && typeof window.preloadedData.progress === 'object') {
        window.preloadedData.progress.gems = safeTotal;
      }
      if (
        window.preloadedData.player &&
        typeof window.preloadedData.player === 'object'
      ) {
        window.preloadedData.player.gems = safeTotal;
        if (
          window.preloadedData.player.progress &&
          typeof window.preloadedData.player.progress === 'object'
        ) {
          window.preloadedData.player.progress.gems = safeTotal;
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

  const formatGemRewardMessage = ({
    amount,
    isWin,
    includeShopPrompt,
  } = {}) => {
    const normalizedAmount = Math.max(0, Math.round(Number(amount) || 0));
    const prefix = isWin ? 'Great job! You earned' : 'Great effort! You earned';
    const gemLabel = `${normalizedAmount} gem${normalizedAmount === 1 ? '' : 's'}`;
    const baseMessage = `${prefix} ${gemLabel}`;

    return includeShopPrompt
      ? `${baseMessage}. Let’s see what cool stuff you can buy in the shop!`
      : `${baseMessage}.`;
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
      const levelReplaced = currentSprite.replace(
        /_level_(\d+)(\.[a-z0-9]+)$/i,
        (match, level, extension) => {
          const parsedLevel = Number(level);
          if (Number.isFinite(parsedLevel)) {
            return `_level_${Math.max(parsedLevel + 1, 1)}${extension}`;
          }
          return `_level_2${extension}`;
        }
      );

      if (levelReplaced !== currentSprite) {
        return levelReplaced;
      }

      if (currentSprite.includes('level_1')) {
        return currentSprite.replace('level_1', 'level_2');
      }
    }

    const fallback =
      resolveAbsoluteSpritePath(HERO_LEVEL_2_SRC) || HERO_LEVEL_2_SRC;

    return sanitizeHeroSpritePath(fallback);
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

    if (rewardCardButton) {
      rewardCardButton.disabled = true;
    }

    disableRewardSpriteInteraction();
    clearRewardCardDisplayTimeout();

    const runPrelude = async () => {
      try {
        await animateRewardCardClose();
        const swapped = await animatePotionToHeroSprite();
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
  }) => {
    if (!rewardCard || !rewardCardText || !rewardCardButton) {
      return false;
    }

    rewardCardText.textContent = text;
    rewardCardButton.textContent = buttonText;
    rewardCardButton.disabled = false;

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
        if (battleGoalsMet && !battleLevelAdvanced) {
          advanceBattleLevel();
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
      'reward-overlay__image--potion-pop',
      'reward-overlay__image--potion-pulse',
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

  const animatePotionToHeroSprite = () =>
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
    rewardSprite.src = rewardSpriteSources.potion;
    rewardSprite.alt = 'Potion level-up reward';
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
    rewardSprite.src = rewardSpriteSources.potion;
    rewardSprite.alt = 'Potion level-up reward';

    setRewardStage('potion');
    rewardSprite.classList.remove('reward-overlay__image--potion-pulse');
    void rewardSprite.offsetWidth;
    rewardSprite.classList.add('reward-overlay__image--visible');
    rewardSprite.classList.add('reward-overlay__image--potion-pop');
    const handlePotionPopEnd = (event) => {
      if (!event || event.animationName !== 'reward-overlay-egg-pop') {
        return;
      }
      rewardSprite.classList.remove('reward-overlay__image--potion-pop');
      rewardSprite.classList.add('reward-overlay__image--potion-pulse');
    };
    rewardSprite.addEventListener('animationend', handlePotionPopEnd, {
      once: true,
    });

    rewardCardDisplayTimeout = window.setTimeout(() => {
      rewardCardDisplayTimeout = null;
      showRewardIntroCard();
    }, REWARD_CARD_DELAY_MS);
  };

  disableRewardSpriteInteraction();

  const playGemRewardAnimation = (rewardConfig = {}) =>
    new Promise((resolve) => {
      const fallbackNavigateHome = () => {
        if (battleGoalsMet && shouldAdvanceBattleLevel && !battleLevelAdvanced) {
          advanceBattleLevel();
        }
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
      const isFirstGemReward = rewardConfig?.isFirstGemReward === true;
      const rewardBattleLevel = normalizePositiveInteger(
        rewardConfig?.battleLevel
      );
      const rewardBattleIndex = normalizePositiveInteger(
        rewardConfig?.currentBattle
      );
      const rewardIsWin = rewardConfig?.win !== false;
      const includeShopPrompt =
        rewardBattleLevel === 2 && rewardBattleIndex === 1;

      pendingGemReward = null;
      updateNextMissionButton(true);

      let gemRevealed = false;
      let cardDisplayed = false;
      let fallbackTimeout = null;

      const cleanup = () => {
        rewardSprite.removeEventListener('animationend', handleChestPopEnd);
        rewardSprite.removeEventListener('animationend', handlePulseEnd);
        rewardSprite.removeEventListener('animationend', handleGemPopEnd);
        rewardSprite.removeEventListener('animationiteration', handlePulseIteration);
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
        if (battleGoalsMet && shouldAdvanceBattleLevel && !battleLevelAdvanced) {
          advanceBattleLevel();
        }
        resetRewardOverlay();
        finish();
        window.location.href = '../index.html';
      };

      const displayRewardCopy = () => {
        if (cardDisplayed) {
          return;
        }
        cardDisplayed = true;
        const cardText = formatGemRewardMessage({
          amount: rewardAmount,
          isWin: rewardIsWin,
          includeShopPrompt,
        });
        const displayed = displayRewardCard({
          text: cardText,
          buttonText: 'Continue',
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
        rewardSprite.classList.add('reward-overlay__image--potion-pop');
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
      rewardSprite.classList.remove('reward-overlay__image--potion-pop');

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

  const updateNextMissionButton = (win = true) => {
    if (!nextMissionBtn) {
      return;
    }

    const hasPendingReward = Boolean(pendingGemReward);

    if (!win && !hasPendingReward) {
      nextMissionBtn.textContent = 'Try Again';
      nextMissionBtn.dataset.action = 'retry';
      return;
    }

    const useClaimLabel =
      !hasPendingReward || pendingGemReward.useClaimLabel === true;
    nextMissionBtn.textContent = useClaimLabel ? 'Claim Reward' : 'Continue';
    nextMissionBtn.dataset.action = 'next';
  };

  const skipRewardFlowInstantly = () => {
    if (pendingGemReward?.isFirstGemReward) {
      markGemRewardIntroSeen();
    }

    pendingGemReward = null;
    hasPendingLevelUpReward = false;
    rewardAnimationPlayed = true;

    if (battleGoalsMet && shouldAdvanceBattleLevel && !battleLevelAdvanced) {
      advanceBattleLevel();
    }

    if (nextMissionBtn) {
      nextMissionBtn.removeAttribute('aria-busy');
    }
    nextMissionProcessing = false;

    if (document.body) {
      document.body.classList.remove('is-reward-transitioning');
    }

    resetRewardOverlay();
    updateNextMissionButton(true);

    window.location.href = '../index.html';
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
        : (callback) => window.setTimeout(callback, 16);

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
        window.clearTimeout(levelProgressAnimationTimeout);
        levelProgressAnimationTimeout = null;
      }

      const animationDelay = LEVEL_PROGRESS_ANIMATION_DELAY_MS;

      if (animationDelay > 0) {
        levelProgressAnimationTimeout = window.setTimeout(() => {
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

    if (hasExperienceRequirement) {
      levelUpAvailable = requirementMet;

      if (!requirementMet) {
        hasPendingLevelUpReward = false;
        rewardAnimationPlayed = false;
      }
    } else {
      levelUpAvailable = true;
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

  const sanitizeProgressProfileUpdate = (update) => {
    if (!isPlainObject(update)) {
      return null;
    }

    const sanitized = {};
    Object.entries(update).forEach(([key, value]) => {
      if (key === 'timeRemainingSeconds') {
        return;
      }

      if (isPlainObject(value)) {
        const nested = sanitizeProgressProfileUpdate(value);
        if (nested && Object.keys(nested).length > 0) {
          sanitized[key] = nested;
        }
        return;
      }

      sanitized[key] = value;
    });

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  };

  const updateStoredPlayerProfile = (updater) => {
    if (typeof updater !== 'function') {
      return;
    }

    try {
      const storage = window.sessionStorage;
      if (!storage) {
        return;
      }

      const raw = storage.getItem(PLAYER_PROFILE_STORAGE_KEY);
      let profile = null;
      if (raw) {
        try {
          profile = JSON.parse(raw);
        } catch (error) {
          profile = null;
        }
      }

      const baseProfile = isPlainObject(profile) ? profile : {};
      const updatedProfile = updater({ ...baseProfile });

      if (!updatedProfile || typeof updatedProfile !== 'object') {
        storage.removeItem(PLAYER_PROFILE_STORAGE_KEY);
        return;
      }

      storage.setItem(
        PLAYER_PROFILE_STORAGE_KEY,
        JSON.stringify(updatedProfile)
      );

      enqueueSupabaseProfileSync(updatedProfile);
    } catch (error) {
      console.warn('Unable to persist player profile update.', error);
    }
  };

  const persistPlayerProfileProgress = (update) => {
    const sanitizedUpdate = sanitizeProgressProfileUpdate(update);
    if (!sanitizedUpdate) {
      return;
    }

    updateStoredPlayerProfile((baseProfile) => {
      const progressBase = isPlainObject(baseProfile.progress)
        ? baseProfile.progress
        : {};
      const nextProgress = applyProgressUpdate(progressBase, sanitizedUpdate);
      return {
        ...baseProfile,
        progress: nextProgress,
      };
    });
  };

  const persistPlayerLevel = (level) => {
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel)) {
      return;
    }

    const resolvedLevel = Math.max(1, Math.round(numericLevel));

    if (window.preloadedData && isPlainObject(window.preloadedData.player)) {
      window.preloadedData.player.currentLevel = resolvedLevel;
      const playerProgress = isPlainObject(window.preloadedData.player.progress)
        ? window.preloadedData.player.progress
        : {};
      window.preloadedData.player.progress = applyProgressUpdate(
        playerProgress,
        { battleLevel: resolvedLevel }
      );
    }

    updateStoredPlayerProfile((baseProfile) => {
      const progressBase = isPlainObject(baseProfile.progress)
        ? baseProfile.progress
        : {};
      const nextProgress = applyProgressUpdate(progressBase, {
        battleLevel: resolvedLevel,
      });

      return {
        ...baseProfile,
        currentLevel: resolvedLevel,
        progress: nextProgress,
      };
    });
  };

  const queueLevelUpCelebration = (nextLevel, previousLevel) => {
    const numericLevel = Number(nextLevel);
    if (!Number.isFinite(numericLevel)) {
      return;
    }

    const resolvedLevel = Math.max(1, Math.round(numericLevel));
    if (resolvedLevel < LEVEL_UP_CELEBRATION_MIN_LEVEL) {
      try {
        window.sessionStorage?.removeItem(LEVEL_UP_CELEBRATION_STORAGE_KEY);
      } catch (error) {
        console.warn('Unable to clear level-up celebration flag.', error);
      }
      if (typeof window !== 'undefined') {
        window.mathMonstersLevelUpCelebration = null;
      }
      return;
    }

    const previousNumeric = Number(previousLevel);
    const resolvedPrevious = Number.isFinite(previousNumeric)
      ? Math.max(1, Math.round(previousNumeric))
      : Math.max(1, resolvedLevel - 1);

    const payload = {
      level: resolvedLevel,
      previousLevel: resolvedPrevious,
      timestamp: Date.now(),
    };

    if (typeof window !== 'undefined') {
      window.mathMonstersLevelUpCelebration = payload;
    }

    try {
      const storage = window.sessionStorage;
      if (!storage) {
        return;
      }
      storage.setItem(LEVEL_UP_CELEBRATION_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist level-up celebration.', error);
    }
  };

  const resolveBattleLevelForExperience = () => {
    if (Number.isFinite(currentBattleLevel)) {
      return currentBattleLevel;
    }
    const fallbackLevel = Number(window.preloadedData?.level?.battleLevel);
    return Number.isFinite(fallbackLevel) ? fallbackLevel : null;
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
    const level = resolveBattleLevelForExperience();
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

  if (heroImg) {
    heroImg.classList.add('slide-in');
    heroImg.addEventListener('animationend', () => markBattleReady(heroImg), {
      once: true,
    });
    window.setTimeout(() => markBattleReady(heroImg), 1400);
  }

  if (monsterImg) {
    monsterImg.classList.add('slide-in');
    monsterImg.addEventListener('animationend', () => markBattleReady(monsterImg), {
      once: true,
    });
    window.setTimeout(() => markBattleReady(monsterImg), 1400);
  }

  window.requestAnimationFrame(() => {
    heroStats?.classList.add('show');
    monsterStats?.classList.add('show');
  });

  function resetQuestionPool(loadedQuestions) {
    questions = Array.isArray(loadedQuestions) ? loadedQuestions.slice() : [];
    questionIds = [];
    questionMap = new Map();
    currentQuestionId = null;
    useIntroQuestionOrder = false;
    introQuestionIds = [];
    nextIntroQuestionIndex = 0;

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

    const resolvedLevel = getResolvedBattleLevel();
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
    if (completeMonsterImg) {
      completeMonsterImg.classList.add('monster-image--defeated');
    }
    if (monsterDefeatOverlay) {
      monsterDefeatOverlay.classList.add('monster-defeat-overlay--visible');
    }
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

  function persistProgress(update) {
    if (!isPlainObject(update)) {
      return;
    }

    if (window.preloadedData) {
      const mergedProgress = applyProgressUpdate(
        window.preloadedData.progress,
        update
      );
      window.preloadedData.progress = mergedProgress;

      if (
        window.preloadedData.player &&
        typeof window.preloadedData.player === 'object'
      ) {
        window.preloadedData.player.progress = applyProgressUpdate(
          window.preloadedData.player.progress,
          update
        );
      }

      if (Object.prototype.hasOwnProperty.call(update, 'timeRemainingSeconds')) {
        const timeRemaining = update.timeRemainingSeconds;

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

    persistPlayerProfileProgress(update);

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
      const mergedProgress = applyProgressUpdate(storedProgress, update);
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(mergedProgress));
    } catch (error) {
      console.warn('Unable to save progress.', error);
    }
  }

  function advanceBattleLevel() {
    if (battleLevelAdvanced) {
      return;
    }
    const baseLevel =
      typeof currentBattleLevel === 'number'
        ? currentBattleLevel
        : typeof window.preloadedData?.progress?.battleLevel === 'number'
        ? window.preloadedData.progress.battleLevel
        : 0;
    const nextLevel = baseLevel + 1;
    persistProgress({ battleLevel: nextLevel });
    persistPlayerLevel(nextLevel);
    queueLevelUpCelebration(nextLevel, baseLevel);
    currentBattleLevel = nextLevel;
    battleLevelAdvanced = true;
    shouldAdvanceBattleLevel = false;
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

    currentBattleLevel =
      typeof progressData.battleLevel === 'number'
        ? progressData.battleLevel
        : typeof data.level?.battleLevel === 'number'
        ? data.level.battleLevel
        : null;

    levelExperienceEarned = readExperienceForLevel(
      experienceMap,
      currentBattleLevel
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
    hero.attack = Number(heroData.attack) || hero.attack;
    hero.health = Number(heroData.health) || hero.health;
    hero.damage = Number(heroData.damage) || hero.damage;
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

    const heroSprite = resolveAssetPath(heroData.sprite);
    if (heroSprite && heroImg) {
      heroImg.src = heroSprite;
    }
    if (heroImg) {
      heroSpriteReadyPromise = updateHeroSpriteCustomProperties();
    }
    if (heroImg && hero.name) {
      heroImg.alt = `${hero.name} ready for battle`;
    }

    monster.attack = Number(monsterData.attack) || monster.attack;
    monster.health = Number(monsterData.health) || monster.health;
    monster.damage = Number(monsterData.damage) || monster.damage;
    monster.name = monsterData.name || monster.name;

    const monsterAttackSprites = normalizeAttackSprites(monster, monsterData);
    if (Object.keys(monsterAttackSprites).length > 0) {
      monster.attackSprites = monsterAttackSprites;
    } else {
      delete monster.attackSprites;
    }
    delete monster.attackSprite;
    delete monster.basicAttack;
    delete monster.superAttack;

    const monsterSprite = resolveAssetPath(monsterData.sprite);
    if (monsterSprite && monsterImg) {
      monsterImg.src = monsterSprite;
    }
    if (monsterImg && monster.name) {
      monsterImg.alt = `${monster.name} ready for battle`;
    }
    if (monsterSprite && completeMonsterImg) {
      completeMonsterImg.src = monsterSprite;
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
    if (completeMonsterImg && monster.name) {
      completeMonsterImg.alt = `${monster.name} ready for battle`;
    }

    const loadedQuestions = Array.isArray(data.questions)
      ? data.questions.slice()
      : [];
    resetQuestionPool(loadedQuestions);

    updateHealthBars();
    updateBattleTimeDisplay();
    updateLevelProgressDisplay();
  }

  function updateHealthBars() {
    const heroPercent =
      hero.health > 0 ? ((hero.health - hero.damage) / hero.health) * 100 : 0;
    const monsterPercent =
      monster.health > 0
        ? ((monster.health - monster.damage) / monster.health) * 100
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
    if (!hero || typeof hero.health !== 'number') {
      return;
    }
    const newDamage = Math.min(hero.health, hero.damage + numericAmount);
    if (newDamage === hero.damage) {
      return;
    }
    hero.damage = newDamage;
    updateHealthBars();
    if (hero.damage >= hero.health) {
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
    if (!monster || typeof monster.health !== 'number') {
      return;
    }
    const newDamage = Math.min(monster.health, monster.damage + numericAmount);
    if (newDamage === monster.damage) {
      return;
    }
    monster.damage = newDamage;
    updateHealthBars();
    if (monster.damage >= monster.health) {
      endBattle(true, { waitForHpDrain: monsterHpFill });
    }
  }

  function skipToBattleLevel(targetLevel) {
    const numericLevel = Number(targetLevel);
    if (!Number.isFinite(numericLevel)) {
      return;
    }

    const sanitizedLevel = Math.max(1, Math.floor(numericLevel));
    const resolvedCurrentLevel = getResolvedBattleLevel();
    if (resolvedCurrentLevel === sanitizedLevel) {
      return;
    }

    persistProgress({ battleLevel: sanitizedLevel });
    currentBattleLevel = sanitizedLevel;
    battleLevelAdvanced = false;

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
    questionText.textContent = q.question || q.q || '';
    choicesEl.innerHTML = '';

    let choices = q.choices;
    if (!choices && q.options) {
      choices = q.options.map((opt) => ({ name: opt, correct: opt === q.answer }));
    }

    (choices || []).forEach((choice) => {
      const div = document.createElement('div');
      div.classList.add('choice');
      div.dataset.correct = !!choice.correct;
      if (choice.image) {
        const img = document.createElement('img');
        img.src = `/mathmonsters/images/questions/${choice.image}`;
        img.alt = choice.name || '';
        div.appendChild(img);
      }
      const p = document.createElement('p');
      p.classList.add('text-medium', 'text-dark');
      p.textContent = choice.name || '';
      div.appendChild(p);
      choicesEl.appendChild(div);
    });
    questionBox.classList.add('show');

    const resolvedBattleLevel = getResolvedBattleLevel();

    document.dispatchEvent(
      new CustomEvent('question-opened', {
        detail: { battleLevel: resolvedBattleLevel },
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
            if (monster.damage >= monster.health) {
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
          monster.damage += hero.attack;
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
          if (hero.damage >= hero.health) {
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
          hero.damage += monster.attack;
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
    const resolvedLevel = getResolvedBattleLevel();
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

    if (completeMonsterImg && monsterImg) {
      completeMonsterImg.src = monsterImg.src;
      if (monster.name) {
        completeMonsterImg.alt = win
          ? `${monster.name} defeated`
          : `${monster.name} preparing for the next battle`;
      } else {
        completeMonsterImg.alt = win
          ? 'Monster defeated'
          : 'Monster preparing for the next battle';
      }
    }

    const goalsAchieved = win;

    if (win) {
      setBattleCompleteTitleLines('Monster Defeated');
      awardExperiencePoints({ scheduleProgressUpdate: false });
    } else {
      setBattleCompleteTitleLines('Keep Practicing');
    }

    battleGoalsMet = goalsAchieved;

    const resolvedBattleLevel = resolveBattleLevelForExperience();
    const progressState = readMathProgressState();
    const rewardBattleLevel =
      normalizePositiveInteger(progressState?.battleLevelNumber) ??
      normalizePositiveInteger(resolvedBattleLevel);
    const rewardBattleIndex = normalizePositiveInteger(
      progressState?.currentBattle
    );
    const gemRewardAmount = win ? GEM_REWARD_WIN_AMOUNT : GEM_REWARD_LOSS_AMOUNT;
    const updatedGemTotal = awardGemReward(gemRewardAmount);
    persistGemTotal(updatedGemTotal);

    if (win) {
      const mathProgressUpdate = computeNextMathProgressOnWin();
      shouldAdvanceBattleLevel = Boolean(mathProgressUpdate?.advanceLevel);

      if (mathProgressUpdate && mathProgressUpdate.mathKey) {
        persistProgress({
          [mathProgressUpdate.mathKey]: {
            currentBattle: mathProgressUpdate.nextBattle,
            currentLevel: mathProgressUpdate.nextLevelTotal,
          },
        });
      }
    } else {
      shouldAdvanceBattleLevel = false;
    }

    if (win) {
      const isLevelTwoPlus =
        Number.isFinite(resolvedBattleLevel) && resolvedBattleLevel >= 2;
      if (isLevelTwoPlus) {
        pendingGemReward = {
          amount: gemRewardAmount,
          totalAfter: updatedGemTotal,
          useClaimLabel: !gemRewardIntroShown,
          isFirstGemReward: !gemRewardIntroShown,
          battleLevel: rewardBattleLevel,
          currentBattle: rewardBattleIndex,
          win: true,
        };
      } else {
        pendingGemReward = null;
      }
    } else {
      pendingGemReward = {
        amount: gemRewardAmount,
        totalAfter: updatedGemTotal,
        useClaimLabel: true,
        isFirstGemReward: false,
        battleLevel: rewardBattleLevel,
        currentBattle: rewardBattleIndex,
        win: false,
      };
    }

    if (win && !hasPendingLevelUpReward) {
      const isInitialLevel =
        Number.isFinite(resolvedBattleLevel) && resolvedBattleLevel <= 1;
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
        nextMissionProcessing = true;
        nextMissionBtn.setAttribute('aria-busy', 'true');
        playGemRewardAnimation(pendingGemReward)
          .catch((error) => {
            console.warn('Gem reward animation failed, falling back to navigation.', error);
            resetRewardOverlay();
            if (battleGoalsMet && shouldAdvanceBattleLevel && !battleLevelAdvanced) {
              advanceBattleLevel();
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

      if (battleGoalsMet && shouldAdvanceBattleLevel && !battleLevelAdvanced) {
        advanceBattleLevel();
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
    battleLevelAdvanced = false;
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
    setBattleCompleteTitleLines('Monster Defeated');
    updateNextMissionButton();
    if (summaryAccuracyValue) {
      summaryAccuracyValue.classList.remove('goal-result--met', 'goal-result--missed');
    }
    if (summaryTimeValue) {
      summaryTimeValue.classList.remove('goal-result--met', 'goal-result--missed');
    }
    loadData();
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

  if (rewardDevSkipButton) {
    rewardDevSkipButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      skipRewardFlowInstantly();
    });
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
      skipToBattleLevel(DEV_SKIP_TARGET_LEVEL);
    });
  }

  if (window.preloadedData) {
    initBattle();
  } else {
    document.addEventListener('data-loaded', initBattle, { once: true });
  }
});
