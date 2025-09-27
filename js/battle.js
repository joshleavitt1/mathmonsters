const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';
const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const GUEST_SESSION_KEY = 'reefRangersGuestSession';

const BATTLE_PAGE_MODE_PARAM = 'mode';
const BATTLE_PAGE_MODE_PLAY = 'play';
const ENEMY_DEFEAT_ANIMATION_DELAY = 2000;

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

const isDevControlsHiddenMode = () => {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return false;
  }

  const search = window.location.search || '';

  if (typeof URLSearchParams === 'function') {
    try {
      const params = new URLSearchParams(search);
      const mode = params.get(BATTLE_PAGE_MODE_PARAM);
      return typeof mode === 'string' && mode.toLowerCase() === BATTLE_PAGE_MODE_PLAY;
    } catch (error) {
      console.warn('Unable to read battle mode from URL parameters.', error);
    }
  }

  const trimmed = search.startsWith('?') ? search.slice(1) : search;
  if (!trimmed) {
    return false;
  }

  return trimmed.split('&').some((pair) => {
    if (!pair) {
      return false;
    }

    const [rawKey, rawValue = ''] = pair.split('=');
    if (!rawKey) {
      return false;
    }

    const key = rawKey.trim().toLowerCase();
    if (key !== BATTLE_PAGE_MODE_PARAM) {
      return false;
    }

    return rawValue.trim().toLowerCase() === BATTLE_PAGE_MODE_PLAY;
  });
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
  const hideDevControls = isDevControlsHiddenMode();
  const battleField = document.getElementById('battle');
  const monsterImg = document.getElementById('battle-monster');
  const heroImg = document.getElementById('battle-shellfin');
  const monsterAttackEffect = document.getElementById('monster-attack-effect');
  const heroAttackEffect = document.getElementById('hero-attack-effect');
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
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
  const setStreakButton = document.querySelector('[data-dev-set-streak]');
  const endBattleButton = document.querySelector('[data-dev-end-battle]');
  const loseBattleButton = document.querySelector('[data-dev-lose-battle]');
  const resetLevelButton = document.querySelector('[data-dev-reset-level]');
  const logOutButton = document.querySelector('[data-dev-log-out]');
  const devControls = document.querySelector('.battle-dev-controls');
  if (hideDevControls) {
    devControls?.classList.add('battle-dev-controls--hidden');
  }
  const heroAttackVal = heroStats.querySelector('.attack .value');
  const heroHealthVal = heroStats.querySelector('.health .value');
  const heroAttackInc = heroStats.querySelector('.attack .increase');
  const heroHealthInc = heroStats.querySelector('.health .increase');
  const monsterAttackVal = monsterStats.querySelector('.attack .value');
  const monsterHealthVal = monsterStats.querySelector('.health .value');

  const completeMessage = document.getElementById('complete-message');
  const battleCompleteTitle = completeMessage?.querySelector('#battle-complete-title');
  const completeEnemyImg = completeMessage?.querySelector('.enemy-image');
  const enemyDefeatOverlay = completeMessage?.querySelector('[data-enemy-defeat-overlay]');
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

  const summaryAccuracyText = ensureStatValueText(summaryAccuracyValue);
  const summaryTimeText = ensureStatValueText(summaryTimeValue);

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
  let enemyDefeatAnimationTimeout = null;
  let levelExperienceEarned = 0;
  let levelExperienceRequirement = 0;
  let levelUpAvailable = false;
  let hasPendingLevelUpReward = false;
  let rewardAnimationPlayed = false;
  let rewardSpriteTransitionHandler = null;
  let rewardAwaitingActivation = false;

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

  const REWARD_CHEST_SRC = '../images/complete/chest.png';
  const REWARD_POTION_SRC = '../images/complete/potion.png';

  const applyRewardChestGlow = () => {
    if (!rewardSprite) {
      return;
    }

    rewardSprite.style.setProperty('--pulsating-glow-color', 'rgba(255, 232, 118, 0.9)');
    rewardSprite.style.setProperty('--pulsating-glow-opacity', '0.9');
    rewardSprite.style.setProperty('--pulsating-glow-opacity-peak', '1');
    rewardSprite.style.setProperty('--pulsating-glow-spread', '42px');
    rewardSprite.style.setProperty('--pulsating-glow-radius', '48px');
    rewardSprite.style.setProperty('--pulsating-glow-duration', '1.8s');
    rewardSprite.style.setProperty('--pulsating-glow-scale-start', '0.88');
    rewardSprite.style.setProperty('--pulsating-glow-scale-peak', '1.08');
    rewardSprite.style.setProperty('--pulsating-glow-blur', '12px');
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

  const clearRewardGlowStyles = () => {
    if (!rewardSprite) {
      return;
    }

    rewardSprite.classList.remove('pulsating-glow');
    rewardGlowStyleProperties.forEach((property) => {
      rewardSprite.style.removeProperty(property);
    });
  };

  const disableRewardSpriteInteraction = () => {
    if (!rewardSprite) {
      return;
    }

    rewardAwaitingActivation = false;
    rewardSprite.classList.remove('reward-overlay__image--interactive');
    rewardSprite.setAttribute('tabindex', '-1');
    rewardSprite.removeAttribute('aria-label');
    rewardSprite.removeAttribute('role');
    if (rewardSprite.dataset) {
      delete rewardSprite.dataset.rewardStage;
    } else {
      rewardSprite.removeAttribute('data-reward-stage');
    }
    clearRewardGlowStyles();
  };

  const enableRewardSpriteInteraction = () => {
    if (!rewardSprite) {
      return;
    }

    rewardAwaitingActivation = true;
    applyRewardChestGlow();
    rewardSprite.classList.add(
      'reward-overlay__image--interactive',
      'pulsating-glow'
    );
    rewardSprite.setAttribute('tabindex', '0');
    rewardSprite.setAttribute('role', 'button');
    rewardSprite.setAttribute('aria-label', 'Open treasure chest reward');
    if (rewardSprite.dataset) {
      rewardSprite.dataset.rewardStage = 'chest';
    } else {
      rewardSprite.setAttribute('data-reward-stage', 'chest');
    }
  };

  const clearRewardAnimation = () => {
    if (rewardSprite && rewardSpriteTransitionHandler) {
      rewardSprite.removeEventListener('transitionend', rewardSpriteTransitionHandler);
      rewardSpriteTransitionHandler = null;
    }

    rewardAwaitingActivation = false;
  };

  const resetRewardOverlay = () => {
    if (!rewardOverlay || !rewardSprite) {
      return;
    }

    clearRewardAnimation();
    rewardOverlay.classList.remove('reward-overlay--visible');
    rewardOverlay.setAttribute('aria-hidden', 'true');
    document.body?.classList.remove('is-reward-active');
    rewardSprite.classList.remove(
      'reward-overlay__image--pop-in',
      'reward-overlay__image--shrink',
      'reward-overlay__image--pop'
    );
    rewardSprite.src = REWARD_CHEST_SRC;
    rewardSprite.alt = 'Treasure chest level-up reward';
    disableRewardSpriteInteraction();
  };

  const playLevelUpRewardAnimation = () => {
    if (!rewardOverlay || !rewardSprite) {
      return;
    }

    clearRewardAnimation();
    rewardOverlay.classList.add('reward-overlay--visible');
    rewardOverlay.setAttribute('aria-hidden', 'false');
    document.body?.classList.add('is-reward-active');
    disableRewardSpriteInteraction();
    rewardSprite.classList.remove(
      'reward-overlay__image--pop-in',
      'reward-overlay__image--shrink',
      'reward-overlay__image--pop'
    );
    rewardSprite.src = REWARD_CHEST_SRC;
    rewardSprite.alt = 'Treasure chest level-up reward';
    applyRewardChestGlow();

    void rewardSprite.offsetWidth;
    rewardSprite.classList.add('reward-overlay__image--pop-in');
    enableRewardSpriteInteraction();
  };

  const handleRewardSpriteActivation = (event) => {
    if (!rewardAwaitingActivation || !rewardSprite) {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    clearRewardAnimation();
    disableRewardSpriteInteraction();

    if (prefersReducedMotion) {
      rewardSprite.src = REWARD_POTION_SRC;
      rewardSprite.alt = 'Potion level-up reward';
      if (rewardSprite.dataset) {
        rewardSprite.dataset.rewardStage = 'potion';
      } else {
        rewardSprite.setAttribute('data-reward-stage', 'potion');
      }
      rewardSprite.classList.add('reward-overlay__image--pop-in');
      return;
    }

    rewardSprite.classList.remove('reward-overlay__image--pop');
    rewardSprite.classList.remove('reward-overlay__image--pop-in');
    void rewardSprite.offsetWidth;
    rewardSprite.classList.add('reward-overlay__image--shrink');

    const handleTransitionEnd = () => {
      if (!rewardSprite) {
        return;
      }

      rewardSprite.removeEventListener('transitionend', handleTransitionEnd);
      rewardSpriteTransitionHandler = null;
      rewardSprite.classList.remove('reward-overlay__image--shrink');
      rewardSprite.src = REWARD_POTION_SRC;
      rewardSprite.alt = 'Potion level-up reward';
      if (rewardSprite.dataset) {
        rewardSprite.dataset.rewardStage = 'potion';
      } else {
        rewardSprite.setAttribute('data-reward-stage', 'potion');
      }
      rewardSprite.classList.add('reward-overlay__image--pop-in');
      void rewardSprite.offsetWidth;
      rewardSprite.classList.add('reward-overlay__image--pop');
      rewardSprite.addEventListener(
        'animationend',
        () => {
          rewardSprite.classList.remove('reward-overlay__image--pop');
        },
        { once: true }
      );
    };

    rewardSpriteTransitionHandler = handleTransitionEnd;
    rewardSprite.addEventListener('transitionend', handleTransitionEnd, { once: true });
  };

  const handleRewardSpriteKeydown = (event) => {
    if (!rewardSprite) {
      return;
    }

    const { key } = event;
    if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space') {
      handleRewardSpriteActivation(event);
    }
  };

  if (rewardSprite) {
    rewardSprite.addEventListener('click', handleRewardSpriteActivation);
    rewardSprite.addEventListener('keydown', handleRewardSpriteKeydown);
    disableRewardSpriteInteraction();
  }

  const updateNextMissionButton = (win = true) => {
    if (!nextMissionBtn) {
      return;
    }

    if (!win) {
      nextMissionBtn.textContent = 'Try Again';
      nextMissionBtn.dataset.action = 'retry';
      return;
    }

    nextMissionBtn.textContent = hasPendingLevelUpReward
      ? 'Claim Reward'
      : 'Next Battle';
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
        : (callback) => window.setTimeout(callback, 16);

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

      requestProgressFrame(() => {
        if (levelProgressMeter) {
          levelProgressMeter.style.setProperty('--progress-value', `${clampedRatio}`);
        }
        levelProgressFill.style.width = targetWidth;
      });
    } else if (levelProgressMeter) {
      levelProgressMeter.style.setProperty('--progress-value', `${clampedRatio}`);
    }


    const requirementMet =
      levelExperienceRequirement > 0 && sanitizedEarned >= levelExperienceRequirement;
    levelUpAvailable = requirementMet;

    if (!requirementMet) {
      hasPendingLevelUpReward = false;
      rewardAnimationPlayed = false;
    }
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

      result[key] = value;
    });

    return result;
  };

  const resolveBattleLevelForExperience = () => {
    if (Number.isFinite(currentBattleLevel)) {
      return currentBattleLevel;
    }
    const fallbackLevel = Number(window.preloadedData?.level?.battleLevel);
    return Number.isFinite(fallbackLevel) ? fallbackLevel : null;
  };

  const resolveExperiencePointsForEnemy = () => {
    const enemyXp = Number(window.preloadedData?.battle?.enemy?.experiencePoints);
    if (!Number.isFinite(enemyXp)) {
      return 0;
    }
    return Math.max(0, Math.round(enemyXp));
  };

  const awardExperiencePoints = () => {
    const points = resolveExperiencePointsForEnemy();
    const level = resolveBattleLevelForExperience();
    const sanitizedEarned = Math.max(0, Math.round(levelExperienceEarned));
    const wasComplete =
      levelExperienceRequirement > 0 && sanitizedEarned >= levelExperienceRequirement;

    if (!Number.isFinite(level)) {
      levelExperienceEarned = sanitizedEarned;
      updateLevelProgressDisplay();
      hasPendingLevelUpReward = levelUpAvailable && !wasComplete;
      if (hasPendingLevelUpReward) {
        rewardAnimationPlayed = false;
      }
      return;
    }

    if (points <= 0) {
      levelExperienceEarned = sanitizedEarned;
      updateLevelProgressDisplay();
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
    updateLevelProgressDisplay();

    hasPendingLevelUpReward = levelUpAvailable && !wasComplete;
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

  const adjustHeroAttack = (delta) => {
    const amount = Number(delta) || 0;
    if (amount === 0) {
      return;
    }
    hero.attack += amount;
    if (heroSuperAttackBase !== null) {
      heroSuperAttackBase += amount;
    }
    updateHeroAttackDisplay();
  };

  const adjustHeroHealth = (delta) => {
    const amount = Number(delta) || 0;
    if (amount === 0) {
      return;
    }
    hero.health += amount;
    updateHeroHealthDisplay();
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
  const ATTACK_EFFECT_DELAY_MS = prefersReducedMotion ? 0 : 500;
  const ATTACK_EFFECT_HOLD_MS = prefersReducedMotion ? 0 : 1000;
  const ATTACK_SHAKE_DURATION_MS = prefersReducedMotion ? 0 : 1000;
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

      if (prefersReducedMotion) {
        if (!holdVisible) {
          effectEl.classList.add('attack-effect--visible');
        }
      } else {
        effectEl.classList.add('attack-effect--show');
        if (!holdVisible) {
          effectEl.classList.add('attack-effect--visible');
        }
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

      if (prefersReducedMotion) {
        cleanupAttackEffect();
        return;
      }

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

  if (prefersReducedMotion) {
    markBattleReady(heroImg);
    markBattleReady(monsterImg);
  } else {
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

  function resetEnemyDefeatAnimation() {
    if (enemyDefeatAnimationTimeout !== null) {
      window.clearTimeout(enemyDefeatAnimationTimeout);
      enemyDefeatAnimationTimeout = null;
    }
    if (completeEnemyImg) {
      completeEnemyImg.classList.remove('enemy-image--defeated');
    }
    if (enemyDefeatOverlay) {
      enemyDefeatOverlay.classList.remove('enemy-defeat-overlay--visible');
    }
  }

  function applyEnemyDefeatStyles() {
    if (completeEnemyImg) {
      completeEnemyImg.classList.add('enemy-image--defeated');
    }
    if (enemyDefeatOverlay) {
      enemyDefeatOverlay.classList.add('enemy-defeat-overlay--visible');
    }
    enemyDefeatAnimationTimeout = null;
  }

  function applyGoalResult(valueEl, textSpan, text, met) {
    if (!valueEl || !textSpan) {
      return;
    }
    textSpan.textContent = text;
    let icon = valueEl.querySelector('.goal-result-icon');
    if (!icon) {
      icon = document.createElement('img');
      icon.classList.add('goal-result-icon');
      valueEl.insertBefore(icon, textSpan);
    }
    icon.src = met
      ? '/mathmonsters/images/complete/correct.svg'
      : '/mathmonsters/images/complete/incorrect.svg';
    icon.alt = met ? 'Goal met' : 'Goal not met';
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
    currentBattleLevel = nextLevel;
    battleLevelAdvanced = true;
  }

  function loadData() {
    const data = window.preloadedData ?? {};
    const battleData = data.battle ?? {};
    const heroData = data.hero ?? {};
    const enemyData = data.enemy ?? {};
    const progressData = data.progress ?? data.player?.progress ?? {};
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

      if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
        return trimmed;
      }

      if (trimmed.startsWith('../') || trimmed.startsWith('./')) {
        return trimmed;
      }

      if (trimmed.startsWith('/')) {
        return trimmed;
      }

      const normalizedBase = assetBasePath.endsWith('/')
        ? assetBasePath.slice(0, -1)
        : assetBasePath;
      const normalizedPath = trimmed.replace(/^\/+/, '');

      if (!normalizedBase || normalizedBase === '.') {
        return normalizedPath;
      }

      return `${normalizedBase}/${normalizedPath}`;
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
    if (heroImg && hero.name) {
      heroImg.alt = `${hero.name} ready for battle`;
    }

    monster.attack = Number(enemyData.attack) || monster.attack;
    monster.health = Number(enemyData.health) || monster.health;
    monster.damage = Number(enemyData.damage) || monster.damage;
    monster.name = enemyData.name || monster.name;

    const monsterAttackSprites = normalizeAttackSprites(monster, enemyData);
    if (Object.keys(monsterAttackSprites).length > 0) {
      monster.attackSprites = monsterAttackSprites;
    } else {
      delete monster.attackSprites;
    }
    delete monster.attackSprite;
    delete monster.basicAttack;
    delete monster.superAttack;

    const monsterSprite = resolveAssetPath(enemyData.sprite);
    if (monsterSprite && monsterImg) {
      monsterImg.src = monsterSprite;
    }
    if (monsterImg && monster.name) {
      monsterImg.alt = `${monster.name} ready for battle`;
    }
    if (monsterSprite && completeEnemyImg) {
      completeEnemyImg.src = monsterSprite;
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
    if (completeEnemyImg && monster.name) {
      completeEnemyImg.alt = `${monster.name} ready for battle`;
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

    const resolvedBattleLevel = (() => {
      if (Number.isFinite(currentBattleLevel)) {
        return currentBattleLevel;
      }

      const preloadedLevel = Number(window.preloadedData?.level?.battleLevel);
      return Number.isFinite(preloadedLevel) ? preloadedLevel : null;
    })();

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

    if (prefersReducedMotion) {
      scheduleDelayedEffects();
      queueDamage(() => releaseEffect());
      return;
    }

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

    if (prefersReducedMotion) {
      scheduleDelayedEffects();
      queueDamage(() => releaseEffect());
      return;
    }

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

  setStreakButton?.addEventListener('click', () => {
    if (battleEnded) {
      return;
    }
    const targetStreak = Math.max(0, STREAK_GOAL - 1);
    streak = targetStreak;
    streakMaxed = false;
    dispatchStreakMeterUpdate(true);
  });

  loseBattleButton?.addEventListener('click', () => {
    if (battleEnded) {
      return;
    }
    const previousHealth = hero.health;
    hero.health = 0;
    hero.damage = Math.max(hero.damage, previousHealth);
    updateHeroHealthDisplay();
    updateHealthBars();
    document.dispatchEvent(new Event('close-question'));
    window.setTimeout(() => {
      endBattle(false, { waitForHpDrain: heroHpFill });
    }, 0);
  });

  endBattleButton?.addEventListener('click', () => {
    if (battleEnded) {
      return;
    }
    document.dispatchEvent(new Event('close-question'));
    window.setTimeout(() => {
      endBattle(true);
    }, 0);
  });

  resetLevelButton?.addEventListener('click', () => {
    persistProgress({ battleLevel: 1 });
    currentBattleLevel = 1;
    battleLevelAdvanced = false;
    battleGoalsMet = false;
  });

  logOutButton?.addEventListener('click', async () => {
    const supabase = window.supabaseClient;

    if (supabase?.auth?.signOut) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Supabase sign out failed', error);
        }
      } catch (error) {
        console.warn('Unexpected error during sign out', error);
      }
    }

    try {
      window.localStorage?.removeItem(PROGRESS_STORAGE_KEY);
      window.localStorage?.removeItem(LANDING_VISITED_KEY);
      window.localStorage?.removeItem(GUEST_SESSION_KEY);
      window.sessionStorage?.removeItem(LANDING_VISITED_KEY);
    } catch (error) {
      console.warn('Unable to clear local player data', error);
    }

    if (window.preloadedData && typeof window.preloadedData === 'object') {
      if (
        window.preloadedData.player &&
        typeof window.preloadedData.player === 'object'
      ) {
        delete window.preloadedData.player.progress;
        delete window.preloadedData.player.battleVariables;
      }
      delete window.preloadedData.progress;
      delete window.preloadedData.battleVariables;
    }

    window.location.replace('https://joshleavitt1.github.io/mathmonsters/html/welcome.html');
  });

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
    totalAnswers++;
    if (correct) {
      correctAnswers++;
    } else {
      wrongAnswers++;
    }
    updateAccuracyDisplays();
    if (correct) {
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
        } else {
          const stats = ['attack', 'health'];
          const stat = stats[Math.floor(Math.random() * stats.length)];
          if (stat === 'attack') {
            adjustHeroAttack(1);
            incEl = heroAttackInc;
            incText = '+1';
          } else {
            adjustHeroHealth(1);
            incEl = heroHealthInc;
            incText = '+1';
            updateHealthBars();
          }
        }
      } else {
        const stats = ['attack', 'health'];
        const stat = stats[Math.floor(Math.random() * stats.length)];
        if (stat === 'attack') {
          adjustHeroAttack(1);
          incEl = heroAttackInc;
          incText = '+1';
        } else {
          adjustHeroHealth(1);
          incEl = heroHealthInc;
          incText = '+1';
          updateHealthBars();
        }
      }

      dispatchStreakMeterUpdate(true);

      scheduleQuestionClose(() => {
        showIncrease(incEl, incText);
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
    resetEnemyDefeatAnimation();
    resetSuperAttackBoost();
    devControls?.classList.add('battle-dev-controls--hidden');
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

    if (completeEnemyImg && monsterImg) {
      completeEnemyImg.src = monsterImg.src;
      if (monster.name) {
        completeEnemyImg.alt = win
          ? `${monster.name} defeated`
          : `${monster.name} preparing for the next battle`;
      } else {
        completeEnemyImg.alt = win
          ? 'Enemy defeated'
          : 'Enemy preparing for the next battle';
      }
    }

    const goalsAchieved = win;

    if (win) {
      setBattleCompleteTitleLines('Monster Defeated');
      awardExperiencePoints();
    } else {
      setBattleCompleteTitleLines('Keep Practicing');
      updateLevelProgressDisplay();
    }

    battleGoalsMet = goalsAchieved;

    updateNextMissionButton(win);

    if (!win) {
      resetRewardOverlay();
    }

    const showCompleteMessage = () => {
      if (!completeMessage) {
        return;
      }
      completeMessage.classList.add('show');
      completeMessage.setAttribute('aria-hidden', 'false');
      if (typeof completeMessage.focus === 'function') {
        completeMessage.focus();
      }
      if (win) {
        enemyDefeatAnimationTimeout = window.setTimeout(() => {
          applyEnemyDefeatStyles();
        }, ENEMY_DEFEAT_ANIMATION_DELAY);
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
      if (hasPendingLevelUpReward && !rewardAnimationPlayed) {
        rewardAnimationPlayed = true;
        hasPendingLevelUpReward = false;
        updateNextMissionButton(true);
        playLevelUpRewardAnimation();
        return;
      }

      const action = nextMissionBtn.dataset.action;
      if (action === 'retry') {
        window.location.reload();
      } else {
        if (battleGoalsMet && !battleLevelAdvanced) {
          advanceBattleLevel();
        }
        resetRewardOverlay();
        window.location.href = '../index.html';
      }
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
    clearRewardAnimation();
    updateLevelProgressDisplay();
    if (completeMessage) {
      completeMessage.classList.remove('show');
      completeMessage.setAttribute('aria-hidden', 'true');
    }
    resetEnemyDefeatAnimation();
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
    setTimeout(showQuestion, 2000);
  }

  if (window.preloadedData) {
    initBattle();
  } else {
    document.addEventListener('data-loaded', initBattle, { once: true });
  }
});
