const initLandingInteractions = () => {
  const messageCard = document.querySelector('.message-card');
  const levelOverlay = document.getElementById('level-overlay');
  const battleButton = levelOverlay?.querySelector('.battle-btn');
  const messageTitle = messageCard?.querySelector('.message-title');
  const messageSubtitle = messageCard?.querySelector('.message-subtitle');
  const messageEnemy = messageCard?.querySelector('.message-enemy');
  const overlayMath = levelOverlay?.querySelector('.math-type');
  const overlayEnemy = levelOverlay?.querySelector('.enemy-image');
  const overlayBattleTitle = levelOverlay?.querySelector('.battle-title');
  const overlayAccuracy = levelOverlay?.querySelector('.accuracy-value');
  const overlayTime = levelOverlay?.querySelector('.time-value');

  if (!messageCard || !levelOverlay) {
    return;
  }

  const defaultTabIndex = messageCard.getAttribute('tabindex') ?? '0';
  let levelOverlayActivationTimeout;
  let messageCardReturnTimeout;
  let battleButtonFocusTimeout;
  const MESSAGE_CARD_EXIT_DURATION = 600;
  const LEVEL_OVERLAY_FOCUS_DELAY = 400;
  const MESSAGE_CARD_FOCUS_DELAY = MESSAGE_CARD_EXIT_DURATION;

  const loadLevelPreview = async () => {
    try {
      const response = await fetch('data/levels.json');
      const data = await response.json();
      const [firstLevel] = data.levels ?? [];

      if (!firstLevel) {
        return;
      }

      const { id, math, enemySprite } = firstLevel;
      const enemyPath = typeof enemySprite === 'string' ? `images/${enemySprite}` : '';

      if (messageTitle && typeof math === 'string') {
        messageTitle.textContent = math;
      }

      if (messageSubtitle && typeof id !== 'undefined') {
        messageSubtitle.textContent = `Battle ${id}`;
      }

      if (messageEnemy && enemyPath) {
        messageEnemy.src = enemyPath;
      }

      if (overlayMath && typeof math === 'string') {
        overlayMath.textContent = math;
      }

      if (overlayBattleTitle && typeof id !== 'undefined') {
        overlayBattleTitle.textContent = `Battle ${id}`;
      }

      if (overlayEnemy && enemyPath) {
        overlayEnemy.src = enemyPath;
      }

      if (overlayAccuracy) {
        overlayAccuracy.textContent = '0';
      }

      if (overlayTime) {
        overlayTime.textContent = '0';
      }
    } catch (error) {
      console.error('Failed to load level preview', error);
    }
  };

  loadLevelPreview();

  const openOverlay = () => {
    if (
      document.body.classList.contains('level-open') ||
      document.body.classList.contains('message-exiting') ||
      messageCard.classList.contains('message-card--animating')
    ) {
      return;
    }

    window.clearTimeout(levelOverlayActivationTimeout);
    window.clearTimeout(messageCardReturnTimeout);
    window.clearTimeout(battleButtonFocusTimeout);

    messageCard.classList.remove('message-card--hidden');
    messageCard.classList.add('message-card--animating');
    document.body.classList.add('message-exiting');
    messageCard.setAttribute('aria-expanded', 'true');

    levelOverlayActivationTimeout = window.setTimeout(() => {
      document.body.classList.add('level-open');
      levelOverlay.setAttribute('aria-hidden', 'false');
      messageCard.classList.add('message-card--hidden');
      messageCard.classList.remove('message-card--animating');
      messageCard.setAttribute('aria-hidden', 'true');
      messageCard.setAttribute('tabindex', '-1');

      battleButtonFocusTimeout = window.setTimeout(() => {
        battleButton?.focus({ preventScroll: true });
      }, LEVEL_OVERLAY_FOCUS_DELAY);
    }, MESSAGE_CARD_EXIT_DURATION);
  };

  const closeOverlay = () => {
    if (!document.body.classList.contains('level-open')) {
      return;
    }

    window.clearTimeout(levelOverlayActivationTimeout);
    window.clearTimeout(messageCardReturnTimeout);
    window.clearTimeout(battleButtonFocusTimeout);

    document.body.classList.remove('level-open');
    levelOverlay.setAttribute('aria-hidden', 'true');
    messageCard.classList.remove('message-card--hidden');
    messageCard.classList.add('message-card--animating');
    messageCard.setAttribute('aria-expanded', 'false');
    messageCard.setAttribute('aria-hidden', 'false');
    messageCard.setAttribute('tabindex', defaultTabIndex);

    window.requestAnimationFrame(() => {
      document.body.classList.remove('message-exiting');
    });

    messageCardReturnTimeout = window.setTimeout(() => {
      messageCard.classList.remove('message-card--animating');
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

  levelOverlay.addEventListener('click', (event) => {
    if (event.target === levelOverlay) {
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
