(() => {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : {};

  const progressUtils =
    (globalScope && typeof globalScope.mathMonstersProgress === 'object'
      ? globalScope.mathMonstersProgress
      : null) || {};

  const {
    isPlainObject = (value) =>
      Boolean(value) && typeof value === 'object' && !Array.isArray(value),
    readTotalExperience = () => 0,
    computeExperienceTier = () => 1,
  } = progressUtils;

  const STORAGE_KEY = 'mathMonstersSave_v1';
  const LEGACY_PROGRESS_KEY = 'mathmonstersProgress';
  const LEGACY_HOME_PROGRESS_KEY = 'mathmonstersHomeProgressState';
  const LEGACY_DIFFICULTY_KEY = 'mathmonstersDifficultyState';
  const EXPERIENCE_MILESTONE_SIZE = 10;

  const clampDifficulty = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 1;
    }
    return Math.min(5, Math.max(1, Math.round(numeric)));
  };

  const clampNonNegativeInteger = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return Math.round(numeric);
  };

  const clampTier = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 1;
    }
    return Math.max(1, Math.round(numeric));
  };

  const DEFAULT_SAVE_STATE = Object.freeze({
    difficulty: 1,
    correctStreak: 0,
    incorrectStreak: 0,
    xpTotal: 0,
    spriteTier: 1,
    lastSeenDifficulty: 1,
    lastSeenSpriteTier: 1,
  });

  const sanitizeSaveState = (state) => {
    if (!isPlainObject(state)) {
      return { ...DEFAULT_SAVE_STATE };
    }

    const xpTotal = clampNonNegativeInteger(state.xpTotal);
    const spriteTier =
      clampTier(state.spriteTier) ||
      computeExperienceTier(xpTotal, EXPERIENCE_MILESTONE_SIZE);

    const difficulty = clampDifficulty(state.difficulty);
    const lastSeenDifficulty = clampDifficulty(
      state.lastSeenDifficulty ?? difficulty
    );
    const lastSeenSpriteTier = clampTier(
      state.lastSeenSpriteTier ?? spriteTier
    );

    return {
      difficulty,
      correctStreak: clampNonNegativeInteger(state.correctStreak),
      incorrectStreak: clampNonNegativeInteger(state.incorrectStreak),
      xpTotal,
      spriteTier,
      lastSeenDifficulty,
      lastSeenSpriteTier,
    };
  };

  const readStorage = (storage) => {
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return sanitizeSaveState(parsed);
    } catch (error) {
      console.warn('Unable to read stored save state.', error);
      return null;
    }
  };

  const writeStorage = (storage, state) => {
    if (!storage) {
      return state;
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Unable to persist save state.', error);
    }
    return state;
  };

  const deriveLegacyState = (localStorageRef, sessionStorageRef) => {
    const derived = {};
    let legacyFound = false;

    try {
      const rawProgress = localStorageRef?.getItem(LEGACY_PROGRESS_KEY);
      if (rawProgress) {
        legacyFound = true;
        try {
          const parsed = JSON.parse(rawProgress);
          const progressRoot = isPlainObject(parsed?.progress)
            ? parsed.progress
            : parsed;

          if (isPlainObject(progressRoot)) {
            const experienceSource =
              progressRoot.experience ?? parsed?.experience ?? null;
            const xpTotal = readTotalExperience(experienceSource);
            if (xpTotal > 0) {
              derived.xpTotal = xpTotal;
              derived.spriteTier = computeExperienceTier(
                xpTotal,
                EXPERIENCE_MILESTONE_SIZE
              );
            }

            const levelCandidates = [
              progressRoot.currentLevel,
              progressRoot.level,
              parsed?.currentLevel,
              parsed?.level,
            ];
            for (const candidate of levelCandidates) {
              const normalized = clampDifficulty(candidate);
              if (normalized) {
                derived.difficulty = normalized;
                derived.lastSeenDifficulty = normalized;
                break;
              }
            }
          }
        } catch (error) {
          console.warn('Unable to parse legacy progress state.', error);
        }
      }
    } catch (error) {
      console.warn('Unable to migrate legacy progress state.', error);
    }

    try {
      const rawDifficulty = sessionStorageRef?.getItem(LEGACY_DIFFICULTY_KEY);
      if (rawDifficulty) {
        legacyFound = true;
        try {
          const parsed = JSON.parse(rawDifficulty);
          if (isPlainObject(parsed)) {
            derived.difficulty = clampDifficulty(parsed.difficulty);
            derived.correctStreak = clampNonNegativeInteger(parsed.correctStreak);
            derived.incorrectStreak = clampNonNegativeInteger(
              parsed.incorrectStreak
            );
          }
        } catch (error) {
          console.warn('Unable to parse legacy difficulty state.', error);
        }
      }
    } catch (error) {
      console.warn('Unable to migrate legacy difficulty state.', error);
    }

    if (!legacyFound) {
      return {};
    }

    const resolvedDifficulty =
      clampDifficulty(derived.difficulty) ?? DEFAULT_SAVE_STATE.difficulty;
    const resolvedXp = clampNonNegativeInteger(derived.xpTotal);
    const resolvedTier =
      clampTier(derived.spriteTier) ||
      computeExperienceTier(resolvedXp, EXPERIENCE_MILESTONE_SIZE);

    return {
      ...derived,
      difficulty: resolvedDifficulty,
      xpTotal: resolvedXp ?? DEFAULT_SAVE_STATE.xpTotal,
      spriteTier: resolvedTier ?? DEFAULT_SAVE_STATE.spriteTier,
      lastSeenDifficulty: clampDifficulty(
        derived.lastSeenDifficulty ?? resolvedDifficulty
      ),
      lastSeenSpriteTier: clampTier(
        derived.lastSeenSpriteTier ?? resolvedTier
      ),
    };
  };

  const clearLegacyKeys = (localStorageRef, sessionStorageRef) => {
    try {
      localStorageRef?.removeItem(LEGACY_PROGRESS_KEY);
      localStorageRef?.removeItem(LEGACY_HOME_PROGRESS_KEY);
    } catch (error) {
      console.warn('Unable to clear legacy local storage state.', error);
    }

    try {
      sessionStorageRef?.removeItem(LEGACY_DIFFICULTY_KEY);
      sessionStorageRef?.removeItem(LEGACY_HOME_PROGRESS_KEY);
    } catch (error) {
      console.warn('Unable to clear legacy session storage state.', error);
    }
  };

  const migrateSaveState = () => {
    const localStorageRef =
      typeof localStorage !== 'undefined' ? localStorage : null;
    const sessionStorageRef =
      typeof sessionStorage !== 'undefined' ? sessionStorage : null;

    const existingState = readStorage(localStorageRef) ?? {};
    const legacyState = deriveLegacyState(localStorageRef, sessionStorageRef);

    const mergedState = sanitizeSaveState({
      ...DEFAULT_SAVE_STATE,
      ...legacyState,
      ...existingState,
    });

    writeStorage(localStorageRef, mergedState);
    clearLegacyKeys(localStorageRef, sessionStorageRef);

    return mergedState;
  };

  const readSaveState = () => migrateSaveState();

  const writeSaveState = (partialState) => {
    const localStorageRef =
      typeof localStorage !== 'undefined' ? localStorage : null;
    const base = readSaveState();
    const merged = sanitizeSaveState({ ...base, ...partialState });
    return writeStorage(localStorageRef, merged);
  };

  const resetSaveState = (overrides = {}) =>
    writeSaveState({ ...DEFAULT_SAVE_STATE, ...overrides });

  const saveStateUtils = Object.freeze({
    STORAGE_KEY,
    readSaveState,
    writeSaveState,
    resetSaveState,
    sanitizeSaveState,
  });

  if (globalScope) {
    globalScope.mathMonstersSaveState = saveStateUtils;
  }
})();
