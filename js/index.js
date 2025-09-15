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
  let hideMessageCardTimeout;
  let activateOverlayTimeout;
  const MESSAGE_CARD_POP_DURATION = 450;

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
      messageCard.classList.contains('message-card--activating')
    ) {
      return;
    }

    window.clearTimeout(hideMessageCardTimeout);
    window.clearTimeout(activateOverlayTimeout);
    messageCard.classList.remove('message-card--hidden');
    messageCard.classList.add('message-card--activating');
    messageCard.setAttribute('aria-expanded', 'true');

    activateOverlayTimeout = window.setTimeout(() => {
      messageCard.classList.remove('message-card--activating');
      document.body.classList.add('level-open');
      levelOverlay.setAttribute('aria-hidden', 'false');
      messageCard.setAttribute('aria-hidden', 'true');
      messageCard.setAttribute('tabindex', '-1');

      window.setTimeout(() => {
        battleButton?.focus({ preventScroll: true });
      }, 400);

      hideMessageCardTimeout = window.setTimeout(() => {
        messageCard.classList.add('message-card--hidden');
      }, 620);
    }, MESSAGE_CARD_POP_DURATION);
  };

  const closeOverlay = () => {
    if (!document.body.classList.contains('level-open')) {
      return;
    }

    window.clearTimeout(hideMessageCardTimeout);
    window.clearTimeout(activateOverlayTimeout);
    messageCard.classList.remove('message-card--activating');
    messageCard.classList.remove('message-card--hidden');
    document.body.classList.remove('level-open');
    levelOverlay.setAttribute('aria-hidden', 'true');
    messageCard.setAttribute('aria-expanded', 'false');
    messageCard.setAttribute('aria-hidden', 'false');
    messageCard.setAttribute('tabindex', defaultTabIndex);

    window.setTimeout(() => {
      messageCard.focus({ preventScroll: true });
    }, 520);
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
