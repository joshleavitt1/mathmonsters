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

  const DEFAULT_MILESTONE_INTERVAL = 10;
  const DEFAULT_STARTING_LEVEL = 1;

  const normalizeNonEmptyString = (value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };

  const normalizeProgressionMilestone = (value) => {
    if (!isPlainObject(value)) {
      return null;
    }

    const normalizedLevel = Number(value.level);
    if (!Number.isFinite(normalizedLevel) || normalizedLevel <= 0) {
      return null;
    }

    const normalized = {
      level: Math.max(1, Math.round(normalizedLevel)),
    };

    const heroSprite = normalizeNonEmptyString(value.heroSprite);
    if (heroSprite) {
      normalized.heroSprite = heroSprite;
    }

    const attackSprite = normalizeNonEmptyString(value.attackSprite);
    if (attackSprite) {
      normalized.attackSprite = attackSprite;
    }

    const notes = normalizeNonEmptyString(value.notes);
    if (notes) {
      normalized.notes = notes;
    }

    return normalized;
  };

  const normalizeProgressionConfig = (config) => {
    const defaults = {
      milestoneInterval: DEFAULT_MILESTONE_INTERVAL,
      startingLevel: DEFAULT_STARTING_LEVEL,
      milestones: [],
    };

    if (Number.isFinite(config)) {
      const numericInterval = Math.max(1, Math.round(config));
      return { ...defaults, milestoneInterval: numericInterval };
    }

    if (!isPlainObject(config)) {
      return { ...defaults };
    }

    const normalized = { ...defaults };

    if (Number.isFinite(config.milestoneInterval) && config.milestoneInterval > 0) {
      normalized.milestoneInterval = Math.max(1, Math.round(config.milestoneInterval));
    }

    if (Number.isFinite(config.startingLevel) && config.startingLevel > 0) {
      normalized.startingLevel = Math.max(1, Math.round(config.startingLevel));
    }

    const milestones = Array.isArray(config.milestones) ? config.milestones : [];
    const normalizedMilestones = [];
    const seenLevels = new Set();

    milestones.forEach((entry) => {
      const normalizedEntry = normalizeProgressionMilestone(entry);
      if (!normalizedEntry) {
        return;
      }

      const levelKey = normalizedEntry.level;
      if (seenLevels.has(levelKey)) {
        return;
      }

      seenLevels.add(levelKey);
      normalizedMilestones.push(normalizedEntry);
    });

    normalized.milestones = normalizedMilestones.sort((a, b) => a.level - b.level);

    return normalized;
  };

  let progressionConfig = normalizeProgressionConfig(
    existing.progressionConfig || existing.progression || null
  );

  const getProgressionConfig = () => ({
    ...progressionConfig,
    milestones: progressionConfig.milestones.slice(),
  });

  const setProgressionConfig = (config) => {
    progressionConfig = normalizeProgressionConfig(config ?? progressionConfig);
    return getProgressionConfig();
  };

  const resolveProgressionConfig = (config) => {
    if (config === undefined || config === null) {
      return getProgressionConfig();
    }

    if (Number.isFinite(config)) {
      return normalizeProgressionConfig({
        milestoneInterval: config,
        startingLevel: progressionConfig.startingLevel,
        milestones: progressionConfig.milestones,
      });
    }

    return normalizeProgressionConfig(config);
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

  const computeExperienceTier = (totalExperience, config) => {
    const progression = resolveProgressionConfig(config);
    const milestoneSize = Number.isFinite(progression.milestoneInterval)
      ? Math.max(1, Math.round(progression.milestoneInterval))
      : DEFAULT_MILESTONE_INTERVAL;
    const normalizedTotal = normalizeExperienceValue(totalExperience) ?? 0;
    const startingLevel = Number.isFinite(progression.startingLevel)
      ? Math.max(1, Math.round(progression.startingLevel))
      : DEFAULT_STARTING_LEVEL;
    return Math.floor(normalizedTotal / milestoneSize) + startingLevel;
  };

  const computeExperienceMilestoneProgress = (totalExperience, config) => {
    const progression = resolveProgressionConfig(config);
    const milestoneSize = Number.isFinite(progression.milestoneInterval)
      ? Math.max(1, Math.round(progression.milestoneInterval))
      : DEFAULT_MILESTONE_INTERVAL;
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
    normalizeProgressionConfig,
    getProgressionConfig,
    setProgressionConfig,
    computeExperienceTier,
    computeExperienceMilestoneProgress,
    computeExperienceProgress,
  });

  if (globalScope) {
    globalScope.mathMonstersProgress = progressUtils;
  }
})();
