#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const questionsDir = path.join(dataDir, 'questions');

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function loadJson(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(projectRoot, filePath);
  try {
    const raw = fs.readFileSync(absolutePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to load JSON from ${absolutePath}: ${error.message}`);
  }
}

function resolveAssetToDisk(assetPath) {
  if (typeof assetPath !== 'string') {
    return null;
  }

  let cleaned = assetPath.trim();
  if (!cleaned) {
    return null;
  }

  cleaned = cleaned.replace(/[?#].*$/, '');
  cleaned = cleaned.replace(/\\/g, '/');

  if (/^(?:https?:)?\/\//i.test(cleaned) || cleaned.startsWith('data:')) {
    return null;
  }

  cleaned = cleaned.replace(/\/{2,}/g, '/');

  while (cleaned.startsWith('./')) {
    cleaned = cleaned.slice(2);
  }

  while (cleaned.startsWith('../')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.startsWith('/mathmonsters/')) {
    cleaned = cleaned.slice('/mathmonsters/'.length);
  }

  cleaned = cleaned.replace(/^\/+/, '');

  if (!cleaned) {
    return projectRoot;
  }

  return path.join(projectRoot, cleaned);
}

function checkAssetExists(assetPath, context, issues) {
  const diskPath = resolveAssetToDisk(assetPath);
  if (!diskPath) {
    return;
  }
  if (!fs.existsSync(diskPath)) {
    issues.push(`${context}: referenced asset not found -> ${assetPath}`);
  }
}

function validateQuestionSet(fileName, issues) {
  const absolutePath = path.join(questionsDir, fileName);
  if (!fs.existsSync(absolutePath)) {
    issues.push(`Question file missing: ${fileName}`);
    return;
  }

  let data;
  try {
    const raw = fs.readFileSync(absolutePath, 'utf8');
    data = JSON.parse(raw);
  } catch (error) {
    issues.push(`Failed to parse questions JSON (${fileName}): ${error.message}`);
    return;
  }

  const questions = Array.isArray(data)
    ? data
    : Array.isArray(data?.questions)
    ? data.questions
    : [];

  if (!questions.length) {
    issues.push(`No questions found in ${fileName}`);
    return;
  }

  const seenIds = new Set();
  questions.forEach((question, index) => {
    const prefix = `${fileName} [question ${index + 1}]`;
    if (typeof question?.id !== 'number') {
      issues.push(`${prefix}: missing numeric id`);
    } else if (seenIds.has(question.id)) {
      issues.push(`${prefix}: duplicate id ${question.id}`);
    } else {
      seenIds.add(question.id);
    }

    if (typeof question?.question !== 'string' || !question.question.trim()) {
      issues.push(`${prefix}: missing question text`);
    }

    if (!Array.isArray(question?.options) || question.options.length === 0) {
      issues.push(`${prefix}: options array is missing or empty`);
    } else if (
      typeof question.answer !== 'undefined' &&
      !question.options.some((option) => option === question.answer)
    ) {
      issues.push(`${prefix}: answer is not one of the provided options`);
    }
  });
}

const normalizeCurrentLevel = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeLevelList = (levels, mathTypeKey) => {
  if (!Array.isArray(levels)) {
    return [];
  }

  return levels
    .map((level, index) => {
      if (!isPlainObject(level)) {
        return null;
      }

      const normalizedLevel = { ...level };

      if (mathTypeKey && typeof mathTypeKey === 'string' && !normalizedLevel.mathType) {
        normalizedLevel.mathType = mathTypeKey;
      }

      const resolvedCurrentLevel =
        normalizeCurrentLevel(level?.currentLevel) ??
        normalizeCurrentLevel(level?.level) ??
        normalizeCurrentLevel(level?.id) ??
        normalizeCurrentLevel(index + 1);

      if (resolvedCurrentLevel !== null) {
        normalizedLevel.currentLevel = resolvedCurrentLevel;
      } else {
        delete normalizedLevel.currentLevel;
      }

      return normalizedLevel;
    })
    .filter(Boolean);
};

const collectLevelsFromMathType = (mathTypeConfig) => {
  if (!isPlainObject(mathTypeConfig)) {
    return [];
  }

  const collected = [];
  const seen = new Set();
  let fallbackIndex = 0;

  const addLevel = (level) => {
    if (!isPlainObject(level)) {
      return;
    }

    const normalizedCurrentLevel =
      normalizeCurrentLevel(level?.currentLevel) ??
      normalizeCurrentLevel(level?.level) ??
      normalizeCurrentLevel(level?.id);

    const dedupeKey =
      normalizedCurrentLevel !== null
        ? `current:${normalizedCurrentLevel}`
        : typeof level?.id === 'string'
        ? `id:${level.id.trim().toLowerCase()}`
        : `fallback:${fallbackIndex++}`;

    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    collected.push(level);
  };

  const visit = (node) => {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => visit(item));
      return;
    }

    if (!isPlainObject(node)) {
      return;
    }

    if (Array.isArray(node.levels)) {
      node.levels.forEach((level) => addLevel(level));
    }

    Object.keys(node).forEach((key) => {
      if (key === 'levels') {
        return;
      }
      visit(node[key]);
    });
  };

  visit(mathTypeConfig);
  return collected;
};

const createLevelBattleNormalizer = (mathTypeConfig) => {
  const monsterConfig = isPlainObject(mathTypeConfig?.monsterSprites)
    ? mathTypeConfig.monsterSprites
    : {};
  const uniquePerLevel = Boolean(monsterConfig.uniquePerLevel);
  const bossMap = isPlainObject(monsterConfig.bosses) ? monsterConfig.bosses : {};

  const poolEntries = Object.entries(monsterConfig)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => [key, value.filter((entry) => isPlainObject(entry))])
    .filter(([, value]) => value.length > 0);

  const poolMap = new Map(poolEntries);
  const poolOrder = poolEntries.map(([key]) => key);
  const defaultPoolKey = poolMap.has('standardPool')
    ? 'standardPool'
    : poolOrder[0] ?? null;

  const poolIndices = new Map();
  const levelUsage = new Map();

  const resolveBossForLevel = (levelKey) => {
    if (levelKey === undefined || levelKey === null) {
      return null;
    }
    if (isPlainObject(bossMap[levelKey])) {
      return bossMap[levelKey];
    }
    const stringKey = String(levelKey);
    return isPlainObject(bossMap[stringKey]) ? bossMap[stringKey] : null;
  };

  const takeFromPool = (requestedPool, levelKey) => {
    if (!poolMap.size) {
      return null;
    }

    const poolKey = poolMap.has(requestedPool) ? requestedPool : defaultPoolKey;
    if (!poolKey || !poolMap.has(poolKey)) {
      return null;
    }

    const pool = poolMap.get(poolKey);
    if (!pool || pool.length === 0) {
      return null;
    }

    const usedKey = `${levelKey ?? ''}:${poolKey}`;
    const usedSet = uniquePerLevel ? levelUsage.get(usedKey) ?? new Set() : null;

    let startIndex = poolIndices.get(poolKey) ?? 0;
    for (let attempt = 0; attempt < pool.length; attempt += 1) {
      const index = (startIndex + attempt) % pool.length;
      if (usedSet && usedSet.has(index)) {
        continue;
      }
      poolIndices.set(poolKey, index + 1);
      if (usedSet) {
        usedSet.add(index);
        levelUsage.set(usedKey, usedSet);
      }
      return pool[index];
    }

    return pool[startIndex % pool.length];
  };

  const assignFromEntry = (target, entry) => {
    if (!isPlainObject(target) || !isPlainObject(entry)) {
      return;
    }
    if (
      typeof entry.sprite === 'string' &&
      entry.sprite.trim() &&
      (typeof target.sprite !== 'string' || !target.sprite.trim())
    ) {
      target.sprite = entry.sprite.trim();
    }
    if (!target.name && typeof entry.name === 'string') {
      target.name = entry.name.trim();
    }
    if (!target.id && typeof entry.id === 'string') {
      target.id = entry.id;
    }
  };

  const normalizeMonster = (monsterConfig, context = {}) => {
    if (!isPlainObject(monsterConfig)) {
      monsterConfig = {};
    }

    const normalized = { ...monsterConfig };
    const levelKey = context.levelKey ?? null;
    const battleType = context.battleType ?? null;

    const needsSprite = typeof normalized.sprite !== 'string' || !normalized.sprite.trim();

    if (needsSprite) {
      const poolCandidates = [];
      if (typeof normalized.spritePool === 'string') {
        poolCandidates.push(normalized.spritePool.trim());
      }
      if (typeof normalized.pool === 'string') {
        poolCandidates.push(normalized.pool.trim());
      }

      let resolvedEntry = null;
      for (const candidate of poolCandidates) {
        resolvedEntry = takeFromPool(candidate, levelKey);
        if (resolvedEntry) {
          assignFromEntry(normalized, resolvedEntry);
          break;
        }
      }

      if (!resolvedEntry && battleType === 'boss') {
        const bossEntry = resolveBossForLevel(levelKey);
        if (bossEntry) {
          assignFromEntry(normalized, bossEntry);
          resolvedEntry = bossEntry;
        }
      }

      if (!resolvedEntry) {
        const fallbackEntry = takeFromPool(poolCandidates[0] ?? defaultPoolKey, levelKey);
        if (fallbackEntry) {
          assignFromEntry(normalized, fallbackEntry);
        }
      }

      if (!resolvedEntry) {
        const bossEntry = resolveBossForLevel(levelKey);
        if (bossEntry) {
          assignFromEntry(normalized, bossEntry);
        }
      }
    }

    if (typeof normalized.sprite !== 'string' || !normalized.sprite.trim()) {
      return null;
    }

    return normalized;
  };

  const normalizeMonstersList = (monsters, context = {}) => {
    if (!Array.isArray(monsters)) {
      return [];
    }
    return monsters
      .map((monster) => normalizeMonster(monster, context))
      .filter(Boolean);
  };

  const normalizeBattle = (battleConfig, context = {}) => {
    if (!isPlainObject(battleConfig)) {
      return null;
    }

    const normalizedBattle = { ...battleConfig };

    const monsterContext = {
      ...context,
      battleType: normalizedBattle.type,
    };

    const monsters = normalizeMonstersList(normalizedBattle.monsters, monsterContext);
    const primaryMonster =
      normalizeMonster(normalizedBattle.monster, monsterContext) || monsters[0] || null;

    if (primaryMonster) {
      normalizedBattle.monster = primaryMonster;
    } else {
      delete normalizedBattle.monster;
    }

    if (monsters.length) {
      normalizedBattle.monsters = monsters;
    } else {
      delete normalizedBattle.monsters;
    }

    return normalizedBattle;
  };

  return (level, index) => {
    if (!isPlainObject(level)) {
      return level;
    }

    const normalizedLevel = { ...level };
    const levelKey =
      normalizeCurrentLevel(level?.currentLevel) ??
      normalizeCurrentLevel(level?.level) ??
      normalizeCurrentLevel(index + 1);

    const context = { levelKey };

    const directBattle = normalizeBattle(level.battle, context);
    const battleEntries = Array.isArray(level.battles)
      ? level.battles
          .map((entry) => normalizeBattle(entry, context))
          .filter(Boolean)
      : [];

    const aggregatedMonsters = battleEntries
      .flatMap((entry) => {
        const monsters = [];
        if (entry?.monster) {
          monsters.push(entry.monster);
        }
        if (Array.isArray(entry?.monsters)) {
          entry.monsters.forEach((monster) => {
            if (monster) {
              monsters.push(monster);
            }
          });
        }
        return monsters;
      })
      .filter(Boolean);

    let chosenBattle = directBattle;

    if (!chosenBattle && battleEntries.length) {
      chosenBattle = battleEntries[0];
    }

    if (chosenBattle) {
      if (!chosenBattle.monster && aggregatedMonsters.length) {
        chosenBattle = {
          ...chosenBattle,
          monster: aggregatedMonsters[0],
        };
      }

      if (aggregatedMonsters.length && !chosenBattle.monsters) {
        chosenBattle = {
          ...chosenBattle,
          monsters: aggregatedMonsters,
        };
      }

      normalizedLevel.battle = chosenBattle;
    } else {
      delete normalizedLevel.battle;
    }

    return normalizedLevel;
  };
};

const deriveMathTypeLevels = (levelsData) => {
  const fallbackLevels = normalizeLevelList(
    Array.isArray(levelsData?.levels) ? levelsData.levels : [],
    null
  );

  const mathTypes =
    levelsData && typeof levelsData.mathTypes === 'object'
      ? levelsData.mathTypes
      : null;

  if (!mathTypes) {
    return { levels: fallbackLevels };
  }

  const entries = Object.entries(mathTypes).filter(([, value]) => isPlainObject(value));

  if (!entries.length) {
    return { levels: fallbackLevels };
  }

  const [selectedKey, selectedData] = entries[0];

  const collectedLevels = collectLevelsFromMathType(selectedData);
  const normalizedLevels = collectedLevels.length
    ? normalizeLevelList(collectedLevels, selectedKey)
    : normalizeLevelList(fallbackLevels, selectedKey);

  const sortedLevels = normalizedLevels
    .map((level, index) => ({ level, index }))
    .sort((a, b) => {
      const levelA = normalizeCurrentLevel(a.level?.currentLevel);
      const levelB = normalizeCurrentLevel(b.level?.currentLevel);

      if (levelA === null && levelB === null) {
        return a.index - b.index;
      }

      if (levelA === null) {
        return 1;
      }

      if (levelB === null) {
        return -1;
      }

      if (levelA === levelB) {
        return a.index - b.index;
      }

      return levelA - levelB;
    })
    .map(({ level }) => level);

  const normalizeBattleForLevel = createLevelBattleNormalizer(selectedData);
  const decoratedLevels = sortedLevels.map((level, index) =>
    normalizeBattleForLevel(level, index)
  );

  return { levels: decoratedLevels };
};

function validateLevels(issues) {
  const levelsPath = path.join(dataDir, 'levels.json');
  const levelsData = loadJson(levelsPath);
  const derivedLevels = deriveMathTypeLevels(levelsData);
  const levels = Array.isArray(derivedLevels?.levels) ? derivedLevels.levels : [];

  levels.forEach((level, index) => {
    const label = `Level ${index + 1}`;
    const battle = isPlainObject(level?.battle) ? level.battle : {};
    const hero = isPlainObject(battle.hero) ? battle.hero : {};
    const monsterCandidates = [];
    if (isPlainObject(battle.monster)) {
      monsterCandidates.push(battle.monster);
    }
    if (Array.isArray(battle.monsters)) {
      battle.monsters.forEach((entry) => {
        if (isPlainObject(entry)) {
          monsterCandidates.push(entry);
        }
      });
    }
    const monster = monsterCandidates[0] ?? {};

    const questionPath =
      typeof battle?.questionReference?.file === 'string'
        ? battle.questionReference.file
        : typeof battle?.questions?.path === 'string'
        ? battle.questions.path
        : null;
    if (questionPath) {
      validateQuestionSet(questionPath.replace(/^questions\//, ''), issues);
    } else {
      issues.push(`${label}: missing question reference`);
    }

    if (!monsterCandidates.length) {
      issues.push(`${label}: no monster data found`);
    }

    checkAssetExists(hero.sprite, `${label} hero sprite`, issues);
    checkAssetExists(monster.sprite, `${label} monster sprite`, issues);
  });
}

function validatePlayer(issues) {
  const playerPath = path.join(dataDir, 'player.json');
  const playerData = loadJson(playerPath);

  if (playerData?.hero) {
    checkAssetExists(
      playerData.hero.sprite,
      'Player global hero sprite',
      issues
    );
  }

  const levelMap =
    playerData && typeof playerData.currentLevel === 'object'
      ? playerData.currentLevel
      : {};

  Object.entries(levelMap).forEach(([levelKey, levelData]) => {
    const hero = levelData && typeof levelData === 'object' ? levelData.hero : null;
    if (hero && typeof hero === 'object') {
      checkAssetExists(
        hero.sprite,
        `Player currentLevel ${levelKey} hero sprite`,
        issues
      );
    }
  });
}

function main() {
  const issues = [];

  try {
    validateLevels(issues);
    validatePlayer(issues);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (issues.length) {
    console.error('Data validation issues found:');
    issues.forEach((issue) => console.error(` - ${issue}`));
    process.exitCode = 1;
  } else {
    console.log('All data validated successfully.');
  }
}

if (require.main === module) {
  main();
}
