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

  const normalizeExperienceValue = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    return Math.max(0, Math.round(numericValue));
  };

  const existing =
    (globalScope && typeof globalScope.mathMonstersProgress === 'object'
      ? globalScope.mathMonstersProgress
      : null) || {};

  const normalizeExperienceMap = (source) => {
    const normalized = {};

    if (Number.isFinite(Number(source))) {
      const normalizedValue = normalizeExperienceValue(source);
      if (normalizedValue !== null) {
        normalized.total = normalizedValue;
      }
      return normalized;
    }

    if (!isPlainObject(source)) {
      return {};
    }

    Object.entries(source).forEach(([key, value]) => {
      const levelKey = String(key).trim();
      const normalizedValue = normalizeExperienceValue(value);
      if (!levelKey || normalizedValue === null) {
        return;
      }
      normalized[levelKey] = normalizedValue;
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

  const readTotalExperience = (experienceMap) => {
    const normalized = normalizeExperienceMap(experienceMap);
    if (!normalized || typeof normalized !== 'object') {
      return 0;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'total')) {
      const direct = normalizeExperienceValue(normalized.total);
      if (direct !== null) {
        return direct;
      }
    }

    let hasValue = false;
    let sum = 0;

    Object.values(normalized).forEach((value) => {
      const normalizedValue = normalizeExperienceValue(value);
      if (normalizedValue === null) {
        return;
      }
      sum += normalizedValue;
      hasValue = true;
    });

    return hasValue ? sum : 0;
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

  const computeExperienceTier = (totalExperience, tierSize = 10) => {
    const milestoneSize = Number.isFinite(tierSize) && tierSize > 0 ? tierSize : 10;
    const normalizedTotal = normalizeExperienceValue(totalExperience) ?? 0;
    return Math.floor(normalizedTotal / milestoneSize) + 1;
  };

  const computeExperienceMilestoneProgress = (totalExperience, tierSize = 10) => {
    const milestoneSize = Number.isFinite(tierSize) && tierSize > 0 ? tierSize : 10;
    const normalizedTotal = normalizeExperienceValue(totalExperience) ?? 0;
    const earnedTowardTier = normalizedTotal % milestoneSize;

    return computeExperienceProgress(earnedTowardTier, milestoneSize);
  };

  const progressUtils = Object.freeze({
    ...existing,
    isPlainObject,
    normalizeExperienceValue,
    normalizeExperienceMap,
    mergeExperienceMaps,
    readExperienceForLevel,
    readTotalExperience,
    computeExperienceTier,
    computeExperienceMilestoneProgress,
    computeExperienceProgress,
  });

  if (globalScope) {
    globalScope.mathMonstersProgress = progressUtils;
  }
})();
