(() => {
  const STORAGE_KEY = 'mathmonstersSimpleState';

  const DEFAULT_STATE = {
    hero: {
      name: 'Shellfin',
      sprite: 'images/hero/shellfin_evolution_1.png',
      attackSprite: 'images/hero/shellfin_attack_1.png',
      attack: 1,
      health: 5,
      damage: 0,
    },
    monster: {
      name: 'Octomurk',
      sprite: 'images/monster/addition_monster_1.png',
      attackSprite: 'images/monster/monster_attack.png',
      attack: 1,
      health: 5,
      damage: 0,
    },
    level: 1,
    xp: 1,
    difficulty: 1,
  };

  const clampNumber = (value, { min = -Infinity, max = Infinity, fallback = 0 }) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, numeric));
  };

  const readState = () => {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_STATE };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_STATE };
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_STATE };
      }

      return {
        hero: { ...DEFAULT_STATE.hero, ...(parsed.hero || {}) },
        monster: { ...DEFAULT_STATE.monster, ...(parsed.monster || {}) },
        level: clampNumber(parsed.level, { min: 1, fallback: DEFAULT_STATE.level }),
        xp: clampNumber(parsed.xp, { min: 1, fallback: DEFAULT_STATE.xp }),
        difficulty: clampNumber(parsed.difficulty, {
          min: 1,
          max: 10,
          fallback: DEFAULT_STATE.difficulty,
        }),
      };
    } catch (error) {
      console.warn('Unable to read stored simple state.', error);
      return { ...DEFAULT_STATE };
    }
  };

  const mergeWithDefaults = (state) => ({
    hero: { ...DEFAULT_STATE.hero, ...(state?.hero || {}) },
    monster: { ...DEFAULT_STATE.monster, ...(state?.monster || {}) },
    level: clampNumber(state?.level, { min: 1, fallback: DEFAULT_STATE.level }),
    xp: clampNumber(state?.xp, { min: 1, fallback: DEFAULT_STATE.xp }),
    difficulty: clampNumber(state?.difficulty, {
      min: 1,
      max: 10,
      fallback: DEFAULT_STATE.difficulty,
    }),
  });

  const writeState = (state) => {
    if (typeof localStorage === 'undefined') {
      return mergeWithDefaults(state);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Unable to persist simple state.', error);
    }

    return mergeWithDefaults(state);
  };

  const updateState = (updater) => {
    const current = readState();
    const next =
      typeof updater === 'function' ? updater({ ...current }) : { ...current, ...(updater || {}) };
    return writeState(next);
  };

  const getState = () => mergeWithDefaults(readState());

  const startNewBattle = () => {
    return updateState((state) => {
      state.hero.damage = 0;
      state.monster.damage = 0;
      return state;
    });
  };

  const setDifficulty = (value) => {
    return updateState((state) => {
      state.difficulty = clampNumber(value, { min: 1, max: 10, fallback: state.difficulty });
      return state;
    });
  };

  const addExperience = (amount) => {
    const delta = clampNumber(amount, { min: 0, fallback: 0 });
    if (delta <= 0) {
      return { ...readState(), leveledUp: false };
    }

    let leveledUp = false;
    const saved = updateState((state) => {
      const previousLevel = state.level;
      const nextXp = Math.max(1, Math.round(state.xp + delta));
      const nextLevel = 1 + Math.floor((nextXp - 1) / 10);

      state.xp = nextXp;
      state.level = nextLevel;
      state.hero.damage = 0;
      state.monster.damage = 0;
      leveledUp = nextLevel > previousLevel;
      return state;
    });
    return { ...saved, leveledUp };
  };

  const getXpProgress = (state) => {
    const xp = Math.max(1, Number(state?.xp) || 1);
    const level = Math.max(1, Number(state?.level) || 1);
    const xpIntoLevel = ((xp - 1) % 10) + 1;
    const ratio = Math.min(1, xpIntoLevel / 10);
    return {
      level,
      currentXp: xp,
      xpIntoLevel,
      xpForLevel: 10,
      ratio,
      text: `${xpIntoLevel} / 10 XP`,
    };
  };

  const namespace = (globalThis.mathMonstersSimpleState = {
    getState,
    updateState,
    startNewBattle,
    addExperience,
    setDifficulty,
    getXpProgress,
  });

  if (typeof window !== 'undefined') {
    window.mathMonstersSimpleState = namespace;
  }
})();
