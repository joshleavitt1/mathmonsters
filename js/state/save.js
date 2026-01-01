(() => {
  const STORAGE_KEY = 'mathMonstersSave_v1';
  const VERSION = 1;
  const DEFAULT_GRADE = 2;
  const DEFAULT_CREATURE_ID = 'shellfin';
  const DEFAULT_SKILL_KEY = 'math.addition';

  const clampGrade = (grade) => {
    const numeric = Number(grade);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_GRADE;
    }
    const rounded = Math.round(numeric);
    return Math.min(3, Math.max(2, rounded));
  };

  const clampDifficulty = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 1;
    }
    const rounded = Math.round(numeric);
    return Math.min(5, Math.max(1, rounded));
  };

  const clampNonNegative = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return Math.max(0, Math.round(fallback));
    }
    return Math.max(0, Math.round(numeric));
  };

  const defaultSkillState = () => ({
    difficulty: 1,
    correctStreak: 0,
    incorrectStreak: 0,
  });

  const normalizeSkillStateEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return defaultSkillState();
    }

    return {
      difficulty: clampDifficulty(entry.difficulty),
      correctStreak: clampNonNegative(entry.correctStreak),
      incorrectStreak: clampNonNegative(entry.incorrectStreak),
    };
  };

  const createDefaultSave = () => ({
    version: VERSION,
    createdAt: Date.now(),
    player: {
      grade: DEFAULT_GRADE,
      creatureId: DEFAULT_CREATURE_ID,
      xp: 0,
    },
    skillState: {
      [DEFAULT_SKILL_KEY]: defaultSkillState(),
    },
  });

  const isPlainObject = (value) =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const readFromStorage = () => {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch (error) {
      console.warn('Unable to read saved state.', error);
      return null;
    }
  };

  const writeToStorage = (state) => {
    if (typeof localStorage === 'undefined') {
      return state;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Unable to persist save state.', error);
    }

    return state;
  };

  const normalizeSave = (state, { preserveCreatedAt = false } = {}) => {
    const defaults = createDefaultSave();
    if (!isPlainObject(state)) {
      return defaults;
    }

    const normalizedPlayer = isPlainObject(state.player) ? { ...state.player } : {};
    const normalizedSkillState = isPlainObject(state.skillState)
      ? { ...state.skillState }
      : {};

    const normalized = {
      version: VERSION,
      createdAt:
        preserveCreatedAt && Number.isFinite(state.createdAt)
          ? state.createdAt
          : defaults.createdAt,
      player: {
        grade: clampGrade(normalizedPlayer.grade ?? defaults.player.grade),
        creatureId: typeof normalizedPlayer.creatureId === 'string'
          ? normalizedPlayer.creatureId
          : defaults.player.creatureId,
        xp: clampNonNegative(normalizedPlayer.xp ?? defaults.player.xp),
      },
      skillState: {},
    };

    const applySkillEntry = (key, entry) => {
      if (typeof key !== 'string' || !key.trim()) {
        return;
      }
      normalized.skillState[key.trim()] = normalizeSkillStateEntry(entry);
    };

    Object.entries(normalizedSkillState).forEach(([key, entry]) => {
      applySkillEntry(key, entry);
    });

    if (!normalized.skillState[DEFAULT_SKILL_KEY]) {
      applySkillEntry(DEFAULT_SKILL_KEY, defaultSkillState());
    }

    return normalized;
  };

  const deriveXpFromLegacyExperience = (experience) => {
    if (!isPlainObject(experience)) {
      return 0;
    }
    const values = Object.values(experience)
      .map((value) => clampNonNegative(value))
      .filter((value) => Number.isFinite(value));
    if (!values.length) {
      return 0;
    }
    return Math.max(...values);
  };

  const readLegacyProfile = () => {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const rawProfile = localStorage.getItem('mathmonstersPlayerProfile');
      return rawProfile ? JSON.parse(rawProfile) : null;
    } catch (error) {
      console.warn('Unable to parse legacy player profile.', error);
      return null;
    }
  };

  const readLegacyProgress = () => {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const rawProgress = localStorage.getItem('mathmonstersProgress');
      return rawProgress ? JSON.parse(rawProgress) : null;
    } catch (error) {
      console.warn('Unable to parse legacy progress.', error);
      return null;
    }
  };

  const readLegacySnapshot = () => {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      const raw = sessionStorage.getItem('mathmonstersNextBattleSnapshot');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Unable to parse legacy battle snapshot.', error);
      return null;
    }
  };

  const migrateLegacySave = () => {
    const existing = readFromStorage();
    if (existing) {
      return writeToStorage(normalizeSave(existing, { preserveCreatedAt: true }));
    }

    const legacyProfile = readLegacyProfile();
    const legacyProgress = readLegacyProgress();
    const legacySnapshot = readLegacySnapshot();

    const defaults = createDefaultSave();
    const gradeCandidates = [
      legacyProfile?.grade,
      legacyProfile?.player?.grade,
      legacyProgress?.grade,
      legacyProgress?.player?.grade,
    ];

    const creatureCandidates = [
      legacyProfile?.hero?.id,
      legacyProfile?.player?.hero?.id,
      legacySnapshot?.hero?.id,
      legacyProfile?.creatureId,
    ];

    const xpCandidates = [
      deriveXpFromLegacyExperience(legacyProgress?.experience),
      deriveXpFromLegacyExperience(legacyProgress?.progress?.experience),
      clampNonNegative(legacyProgress?.xp),
    ];

    const derived = {
      version: VERSION,
      createdAt: Date.now(),
      player: {
        grade: clampGrade(
          gradeCandidates.find((value) => Number.isFinite(Number(value))) ??
            defaults.player.grade
        ),
        creatureId:
          creatureCandidates.find((value) => typeof value === 'string' && value.trim()) ??
          defaults.player.creatureId,
        xp: xpCandidates.find((value) => Number.isFinite(value)) ?? defaults.player.xp,
      },
      skillState: {
        [DEFAULT_SKILL_KEY]: defaultSkillState(),
      },
    };

    return writeToStorage(normalizeSave(derived));
  };

  const loadSave = () => normalizeSave(readFromStorage() ?? createDefaultSave(), {
    preserveCreatedAt: true,
  });

  const updateSave = (updater) => {
    const current = loadSave();
    const nextState = typeof updater === 'function' ? updater(current) : updater;
    const normalized = normalizeSave(nextState, { preserveCreatedAt: true });
    return writeToStorage(normalized);
  };

  const resetSave = () => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Unable to clear saved state.', error);
      }
    }
    return writeToStorage(createDefaultSave());
  };

  const api = Object.freeze({
    STORAGE_KEY,
    defaultSkillState,
    clampDifficulty,
    clampGrade,
    loadSave,
    updateSave,
    resetSave,
    migrateLegacySave,
  });

  if (typeof globalThis !== 'undefined') {
    globalThis.mathMonstersSave = api;
  } else if (typeof window !== 'undefined') {
    window.mathMonstersSave = api;
  }
})();
