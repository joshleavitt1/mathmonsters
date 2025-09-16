const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';

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

const initLandingInteractions = () => {
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
      const [levelsRes, variablesRes] = await Promise.all([
        fetch('data/levels.json'),
        fetch('data/variables.json'),
      ]);

      if (!levelsRes.ok) {
        throw new Error('Failed to load battle level data.');
      }

      const levelsData = await levelsRes.json();
      const variablesData = variablesRes.ok ? await variablesRes.json() : {};
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandingInteractions);
} else {
  initLandingInteractions();
}
