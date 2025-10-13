(() => {
  const LEVELS_PER_PAGE = 5;
  const DEFAULT_PORTAL_SPRITE = '../images/levels/portal.png';
  const COMPLETED_PORTAL_SPRITE = '../images/levels/portal_check.png';

  const toPositiveInteger = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return Math.round(numeric);
  };

  const extractLevelNumber = (level, fallbackIndex) => {
    if (!level || typeof level !== 'object') {
      const fallbackNumber = toPositiveInteger(fallbackIndex);
      return fallbackNumber;
    }

    const direct = toPositiveInteger(level.currentLevel ?? level.level);
    if (direct !== null) {
      return direct;
    }

    if (typeof level.id === 'number') {
      const fromId = toPositiveInteger(level.id);
      if (fromId !== null) {
        return fromId;
      }
    }

    const fallbackNumber = toPositiveInteger(fallbackIndex);
    return fallbackNumber;
  };

  const normalizeLevels = (levels = []) => {
    if (!Array.isArray(levels)) {
      return [];
    }

    const uniqueMap = new Map();

    levels.forEach((level, index) => {
      const levelNumber = extractLevelNumber(level, index + 1);
      if (levelNumber === null) {
        return;
      }
      if (!uniqueMap.has(levelNumber)) {
        uniqueMap.set(levelNumber, {
          number: levelNumber,
          raw: level,
        });
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.number - b.number);
  };

  const extractCurrentLevelCandidates = (data) => {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const candidates = [];

    const appendCandidate = (value) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'object') {
        if (value && typeof value.currentLevel !== 'undefined') {
          candidates.push(value.currentLevel);
        }
        return;
      }
      candidates.push(value);
    };

    appendCandidate(data.progress?.currentLevel);
    appendCandidate(data.player?.progress?.currentLevel);
    appendCandidate(data.player?.currentLevel);
    appendCandidate(data.level?.currentLevel);
    appendCandidate(data.battle?.currentLevel);
    appendCandidate(data.nextBattleSnapshot?.currentLevel);

    return candidates;
  };

  const resolveCurrentLevelNumber = (data, levels) => {
    const candidates = extractCurrentLevelCandidates(data);
    for (let i = 0; i < candidates.length; i += 1) {
      const numeric = toPositiveInteger(candidates[i]);
      if (numeric !== null) {
        return numeric;
      }
    }

    const fallback = levels.length > 0 ? levels[0].number : null;
    return fallback !== null ? fallback : 1;
  };

  const selectVisibleLevels = (levels, currentLevelNumber) => {
    if (!Array.isArray(levels) || levels.length === 0) {
      return [];
    }

    const index = levels.findIndex((entry) => entry.number === currentLevelNumber);
    const safeIndex = index === -1 ? 0 : index;
    const halfWindow = Math.floor(LEVELS_PER_PAGE / 2);

    let start = safeIndex - halfWindow;
    if (start < 0) {
      start = 0;
    }

    if (start + LEVELS_PER_PAGE > levels.length) {
      start = Math.max(0, levels.length - LEVELS_PER_PAGE);
    }

    const slice = levels.slice(start, start + LEVELS_PER_PAGE);
    if (slice.length > 0) {
      return slice;
    }

    return levels.slice(0, Math.min(LEVELS_PER_PAGE, levels.length));
  };

  const createLevelCard = (levelNumber, state) => {
    const isCurrent = state === 'current';
    const card = document.createElement(isCurrent ? 'a' : 'div');
    card.classList.add('levels__card');
    card.setAttribute('data-level-number', String(levelNumber));
    card.setAttribute('data-level-state', state);

    if (isCurrent) {
      card.classList.add('levels__card--current');
      card.href = `./battle.html?level=${levelNumber}`;
    } else {
      card.classList.add('levels__card--disabled');
      card.setAttribute('aria-disabled', 'true');
      if (state === 'locked') {
        card.classList.add('levels__card--locked');
      } else if (state === 'completed') {
        card.classList.add('levels__card--completed');
      }
    }

    const image = document.createElement('img');
    image.classList.add('levels__image');
    image.setAttribute('width', '160');
    image.setAttribute('height', '160');
    image.loading = 'lazy';

    if (state === 'completed') {
      image.src = COMPLETED_PORTAL_SPRITE;
      image.alt = `Completed portal for Level ${levelNumber}`;
    } else {
      image.src = DEFAULT_PORTAL_SPRITE;
      image.alt = `Portal to Level ${levelNumber}`;
    }

    card.appendChild(image);

    const statbox = document.createElement('div');
    statbox.classList.add('levels__statbox');

    const value = document.createElement('span');
    value.classList.add('levels__statbox-value');
    value.textContent = `Level ${levelNumber}`;

    statbox.appendChild(value);
    card.appendChild(statbox);

    return card;
  };

  const renderLevels = (data) => {
    const container = document.querySelector('.levels__list');
    if (!container) {
      return false;
    }

    const normalizedLevels = normalizeLevels(data?.levels);
    if (normalizedLevels.length === 0) {
      return false;
    }

    const currentLevelNumber = resolveCurrentLevelNumber(data, normalizedLevels);
    const visibleLevels = selectVisibleLevels(normalizedLevels, currentLevelNumber);

    if (visibleLevels.length === 0) {
      return false;
    }

    const placeholder = container.querySelector('[data-levels-placeholder]');
    if (placeholder) {
      placeholder.remove();
    }

    container.replaceChildren();

    visibleLevels.forEach(({ number }) => {
      const state =
        number === currentLevelNumber
          ? 'current'
          : number < currentLevelNumber
          ? 'completed'
          : 'locked';
      const card = createLevelCard(number, state);
      container.appendChild(card);
    });

    return true;
  };

  const state = {
    domReady: document.readyState !== 'loading',
    dataReady: typeof window !== 'undefined' &&
      window.preloadedData &&
      typeof window.preloadedData === 'object',
    rendered: false,
  };

  const attemptRender = () => {
    if (state.rendered || !state.domReady || !state.dataReady) {
      return;
    }

    const didRender = renderLevels(window.preloadedData || {});
    if (didRender) {
      state.rendered = true;
    }
  };

  if (!state.domReady) {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        state.domReady = true;
        attemptRender();
      },
      { once: true }
    );
  }

  document.addEventListener(
    'data-loaded',
    () => {
      state.dataReady = true;
      attemptRender();
    },
    { once: true }
  );

  if (state.domReady) {
    attemptRender();
  }
})();
