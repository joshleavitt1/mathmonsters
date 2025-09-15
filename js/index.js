const initLandingInteractions = () => {
  const messageCard = document.querySelector('.message-card');
  const levelOverlay = document.getElementById('level-overlay');
  const battleButton = levelOverlay?.querySelector('.battle-btn');
  const progressFill = levelOverlay?.querySelector('.progress-fill');
  const messageTitle = messageCard?.querySelector('.message-title');
  const messageSubtitle = messageCard?.querySelector('.message-subtitle');
  const messageEnemy = messageCard?.querySelector('.message-enemy');
  const overlayLevel = levelOverlay?.querySelector('.level-number');
  const overlayMath = levelOverlay?.querySelector('.math-type');
  const overlayEnemy = levelOverlay?.querySelector('.enemy-image');
  const progressBar = levelOverlay?.querySelector('.progress-bar');

  if (!messageCard || !levelOverlay) {
    return;
  }

  const loadLevelPreview = async () => {
    try {
      const response = await fetch('data/levels.json');
      const data = await response.json();
      const [firstLevel] = data.levels ?? [];

      if (!firstLevel) {
        return;
      }

      const { id, math, enemySprite, progress } = firstLevel;
      const enemyPath = `images/${enemySprite}`;

      if (messageTitle) {
        messageTitle.textContent = math;
      }

      if (messageSubtitle) {
        messageSubtitle.textContent = `Battle ${id}`;
      }

      if (messageEnemy) {
        messageEnemy.src = enemyPath;
      }

      if (overlayLevel) {
        overlayLevel.textContent = `Level ${id}`;
      }

      if (overlayMath) {
        overlayMath.textContent = math;
      }

      if (overlayEnemy) {
        overlayEnemy.src = enemyPath;
      }

      const safeProgress = Math.max(0, Math.min(progress ?? 0, 1));
      const progressPercent = safeProgress * 100;
      const percentLabel = `${Math.round(progressPercent * 10) / 10}%`;

      if (progressFill) {
        progressFill.style.setProperty('--progress-target', percentLabel);
      }

      if (progressBar && progressFill) {
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-label', 'Level progress');
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        progressBar.setAttribute('aria-valuenow', `${Math.round(progressPercent)}`);
      }
    } catch (error) {
      console.error('Failed to load level preview', error);
    }
  };

  loadLevelPreview();

  const openOverlay = () => {
    if (document.body.classList.contains('level-open')) {
      return;
    }

    document.body.classList.add('level-open');
    levelOverlay.setAttribute('aria-hidden', 'false');
    messageCard.setAttribute('aria-expanded', 'true');

    window.setTimeout(() => {
      battleButton?.focus({ preventScroll: true });
    }, 400);

    if (progressBar && progressFill) {
      const target = progressFill.style.getPropertyValue('--progress-target') || '0%';
      progressBar.setAttribute('aria-valuenow', target.replace('%', ''));
    }
  };

  const closeOverlay = () => {
    if (!document.body.classList.contains('level-open')) {
      return;
    }

    document.body.classList.remove('level-open');
    levelOverlay.setAttribute('aria-hidden', 'true');
    messageCard.setAttribute('aria-expanded', 'false');
    messageCard.focus({ preventScroll: true });
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
