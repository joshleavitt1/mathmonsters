(() => {
  const simpleState = window.mathMonstersSimpleState;

  if (!simpleState) {
    console.warn('Simple state is unavailable.');
    return;
  }

  const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';
  const VISITED_VALUE = 'true';
  const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';

  const elements = {
    name: document.querySelector('[data-hero-name]'),
    level: document.querySelector('[data-hero-level]'),
    difficulty: document.querySelector('[data-home-difficulty]'),
    xp: document.querySelector('[data-home-xp]'),
    xpBar: document.querySelector('.home__progress'),
    xpFill: document.querySelector('.home__progress .home__progress-fill'),
    heroSprite: document.querySelector('[data-hero-sprite]'),
    battleButton: document.querySelector('[data-battle-trigger]'),
  };

  const resolveSpritePath = (path) => {
    if (typeof path !== 'string' || !path.trim()) {
      return '';
    }
    const trimmed = path.trim();
    if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('/')) {
      return trimmed;
    }
    if (trimmed.startsWith('../')) {
      return trimmed;
    }
    return `../${trimmed.replace(/^\/+/, '')}`;
  };

  const setVisitedFlag = () => {
    try {
      localStorage?.setItem(LANDING_VISITED_KEY, VISITED_VALUE);
      sessionStorage?.setItem(LANDING_VISITED_KEY, VISITED_VALUE);
    } catch (error) {
      console.warn('Unable to persist landing flag.', error);
    }
  };

  const updateSnapshotForBattle = (state) => {
    try {
      const snapshot = {
        hero: {
          name: state.hero?.name || 'Shellfin',
          sprite: resolveSpritePath(
            state.hero?.sprite || 'images/hero/shellfin_evolution_1.png'
          ),
        },
        monster: {
          name: state.monster?.name || 'Octomurk',
          sprite: resolveSpritePath(
            state.monster?.sprite || 'images/monster/addition_monster_1.png'
          ),
        },
        timestamp: Date.now(),
      };
      sessionStorage?.setItem(NEXT_BATTLE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Unable to write battle snapshot.', error);
    }
  };

  const renderState = (state) => {
    const xpProgress = simpleState.getXpProgress(state);
    if (elements.name) {
      elements.name.textContent = state.hero?.name || 'Shellfin';
    }
    if (elements.level) {
      elements.level.textContent = `Level ${xpProgress.level}`;
    }
    if (elements.difficulty) {
      elements.difficulty.textContent = `Difficulty ${state.difficulty ?? 1}`;
    }
    if (elements.xp) {
      elements.xp.textContent = `XP ${xpProgress.xpIntoLevel} / ${xpProgress.xpForLevel}`;
    }
    if (elements.xpBar) {
      elements.xpBar.setAttribute('aria-valuenow', String(xpProgress.xpIntoLevel));
      elements.xpBar.setAttribute('aria-valuemax', String(xpProgress.xpForLevel));
      elements.xpBar.style.setProperty('--progress-value', xpProgress.ratio);
    }
    if (elements.xpFill) {
      elements.xpFill.style.setProperty('--progress-value', xpProgress.ratio);
    }
    if (elements.heroSprite && state.hero?.sprite) {
      elements.heroSprite.src = resolveSpritePath(state.hero.sprite);
    }
    return xpProgress;
  };

  const handleBattleStart = () => {
    const updatedState = simpleState.startNewBattle();
    updateSnapshotForBattle(updatedState);
    setVisitedFlag();
    window.location.href = './battle.html';
  };

  document.addEventListener('DOMContentLoaded', () => {
    const state = simpleState.getState();
    renderState(state);

    if (elements.battleButton) {
      elements.battleButton.addEventListener('click', handleBattleStart);
    }
  });
})();
