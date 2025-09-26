#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const questionsDir = path.join(dataDir, 'questions');

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

  if (/^(?:https?:)?\/\//i.test(cleaned) || cleaned.startsWith('data:')) {
    return null;
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

function validateLevels(issues) {
  const levelsPath = path.join(dataDir, 'levels.json');
  const levelsData = loadJson(levelsPath);
  const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];

  levels.forEach((level, index) => {
    const label = `Level ${index + 1}`;
    const battle = level?.battle ?? {};
    const hero = battle.hero ?? {};
    const enemyCandidates = [];
    if (battle && typeof battle.enemy === 'object' && battle.enemy !== null) {
      enemyCandidates.push(battle.enemy);
    }
    if (Array.isArray(battle.enemies)) {
      battle.enemies.forEach((entry) => {
        if (entry && typeof entry === 'object') {
          enemyCandidates.push(entry);
        }
      });
    }
    const enemy = enemyCandidates[0] ?? {};

    if (typeof battle.levelUp !== 'number') {
      issues.push(`${label}: battle.levelUp should be a number`);
    }

    if (!enemyCandidates.length) {
      issues.push(`${label}: no enemy data found`);
    } else {
      enemyCandidates.forEach((candidate, enemyIndex) => {
        if (typeof candidate.experiencePoints !== 'number') {
          issues.push(
            `${label}: enemy ${enemyIndex + 1} missing numeric experiencePoints`
          );
        }
      });
    }

    if (battle?.questionReference?.file) {
      validateQuestionSet(battle.questionReference.file.replace(/^questions\//, ''), issues);
    } else {
      issues.push(`${label}: missing questionReference.file`);
    }

    checkAssetExists(hero.sprite, `${label} hero sprite`, issues);
    checkAssetExists(enemy.sprite, `${label} enemy sprite`, issues);
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
    playerData && typeof playerData.battleLevel === 'object'
      ? playerData.battleLevel
      : {};

  Object.entries(levelMap).forEach(([levelKey, levelData]) => {
    const hero = levelData && typeof levelData === 'object' ? levelData.hero : null;
    if (hero && typeof hero === 'object') {
      checkAssetExists(
        hero.sprite,
        `Player battleLevel ${levelKey} hero sprite`,
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
    issues.push(error.message);
  }

  if (issues.length) {
    console.error('Validation issues found:');
    issues.forEach((issue) => {
      console.error(` - ${issue}`);
    });
    process.exitCode = 1;
  } else {
    console.log('All data references look good.');
  }
}

main();
