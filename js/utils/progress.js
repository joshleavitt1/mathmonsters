(() => {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : {};

  const isPlainObject = (value) =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const normalizeExperienceMap = (source) => {
    if (!isPlainObject(source)) {
      return {};
    }

    const normalized = {};
    Object.entries(source).forEach(([key, value]) => {
      const levelKey = String(key).trim();
      const numericValue = Number(value);
      if (!levelKey || !Number.isFinite(numericValue)) {
        return;
      }
      normalized[levelKey] = Math.max(0, Math.round(numericValue));
    });
    return normalized;
  };

  const mergeExperienceMaps = (base, extra) => {
    const merged = { ...normalizeExperienceMap(base) };
    const additional = normalizeExperienceMap(extra);

    Object.entries(additional).forEach(([key, value]) => {
      merged[key] = value;
    });

    return merged;
  };

  const readExperienceForLevel = (experienceMap, level) => {
    if (!isPlainObject(experienceMap)) {
      return 0;
    }

    const numericLevel = Number(level);
    if (Number.isFinite(numericLevel) && numericLevel in experienceMap) {
      const direct = Number(experienceMap[numericLevel]);
      if (Number.isFinite(direct)) {
        return Math.max(0, direct);
      }
    }

    const levelKey = String(level);
    if (!levelKey) {
      return 0;
    }
    const value = Number(experienceMap[levelKey]);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const computeExperienceProgress = (earned, requirement) => {
    const safeEarned = Number.isFinite(earned) ? Math.max(0, Math.round(earned)) : 0;
    const safeRequirement = Number.isFinite(requirement)
      ? Math.max(0, Math.round(requirement))
      : 0;

    const totalDisplay = safeRequirement;
    const earnedDisplay = Math.min(totalDisplay, safeEarned);
    const ratio = totalDisplay > 0 ? Math.min(1, earnedDisplay / totalDisplay) : 0;

    return {
      ratio,
      text: `${earnedDisplay} of ${totalDisplay}`,
      earned: earnedDisplay,
      total: totalDisplay,
      earnedDisplay,
      totalDisplay,
    };
  };

  const existing =
    (globalScope && typeof globalScope.mathMonstersProgress === 'object'
      ? globalScope.mathMonstersProgress
      : null) || {};

  const progressUtils = Object.freeze({
    ...existing,
    isPlainObject,
    normalizeExperienceMap,
    mergeExperienceMaps,
    readExperienceForLevel,
    computeExperienceProgress,
  });

  if (globalScope) {
    globalScope.mathMonstersProgress = progressUtils;
  }
})();
