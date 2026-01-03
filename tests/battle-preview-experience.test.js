const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(PROJECT_ROOT, 'js', 'index.js');
const PROGRESS_UTILS_PATH = path.join(PROJECT_ROOT, 'js', 'utils', 'progress.js');

const INDEX_SOURCE = fs.readFileSync(INDEX_PATH, 'utf8');
const PROGRESS_UTILS_SOURCE = fs.readFileSync(PROGRESS_UTILS_PATH, 'utf8');

const TRIM_MARKER = 'const preloaderElement';
const TRIM_POSITION = INDEX_SOURCE.indexOf(TRIM_MARKER);
const INDEX_SOURCE_TRIMMED =
  TRIM_POSITION === -1 ? INDEX_SOURCE : INDEX_SOURCE.slice(0, TRIM_POSITION);

const createClassList = () => {
  const classes = new Set();
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    toggle: (name, force) => {
      if (force === undefined) {
        if (classes.has(name)) {
          classes.delete(name);
          return false;
        }
        classes.add(name);
        return true;
      }
      if (force) {
        classes.add(name);
      } else {
        classes.delete(name);
      }
      return classes.has(name);
    },
    contains: (name) => classes.has(name),
  };
};

const createElement = () => {
  const styleStore = {};
  return {
    attributes: {},
    classList: createClassList(),
    style: {
      ...styleStore,
      setProperty(name, value) {
        styleStore[name] = value;
      },
      getPropertyValue(name) {
        return styleStore[name];
      },
    },
    hidden: false,
    textContent: '',
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };
};

const createSandbox = () => {
  const documentElement = createElement();
  documentElement.style.setProperty ??= () => {};

  const body = createElement();
  body.classList = createClassList();

  const heroImage = createElement();
  const monsterImage = createElement();
  const homeExperienceContainer = createElement();
  const homeExperienceProgress = createElement();
  const homeExperienceProgressFill = createElement();
  const homeExperienceCount = createElement();
  const battleProgressElement = createElement();

  homeExperienceProgress.querySelector = (selector) =>
    selector === '.progress__fill' ? homeExperienceProgressFill : null;

  const selectMap = new Map([
    ['[data-monster]', monsterImage],
    ['[data-standard-landing] [data-home-experience]', homeExperienceContainer],
    ['[data-standard-landing] [data-home-xp-progress]', homeExperienceProgress],
    ['[data-standard-landing] [data-home-xp-count]', homeExperienceCount],
  ]);

  const document = {
    readyState: 'complete',
    documentElement,
    body,
    querySelector(selector) {
      return selectMap.get(selector) ?? null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-hero-sprite]') {
        return [heroImage];
      }
      if (selector === '[data-battle-progress]') {
        return [battleProgressElement];
      }
      return [];
    },
    getElementById() {
      return null;
    },
    addEventListener() {},
    removeEventListener() {},
  };

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    Promise,
    Map,
    Set,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Symbol,
    RegExp,
    Error,
    URL,
    encodeURIComponent,
    decodeURIComponent,
    performance: { now: () => 0 },
    document,
  };

  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.Image = class {
    constructor() {
      this.complete = true;
      this.alt = '';
      this.src = '';
      this.classList = createClassList();
    }
  };

  sandbox.updateHeroFloat = () => {};
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.readStoredProgress = () => null;
  sandbox.preloadedData = {};

  return {
    sandbox,
    elements: {
      homeExperienceContainer,
      homeExperienceProgress,
      homeExperienceProgressFill,
      homeExperienceCount,
      battleProgressElement,
    },
  };
};

test('homepage XP progress reflects xpTotal-only players', () => {
  const { sandbox, elements } = createSandbox();

  vm.runInNewContext(PROGRESS_UTILS_SOURCE, sandbox, {
    filename: PROGRESS_UTILS_PATH,
  });

  vm.runInNewContext(
    `${INDEX_SOURCE_TRIMMED}
     ;globalThis.determineBattlePreview = determineBattlePreview;
     ;globalThis.applyBattlePreview = applyBattlePreview;`,
    sandbox,
    {
      filename: INDEX_PATH,
    }
  );

  const levelsData = {
    levels: [
      {
        id: 'mission-1',
        currentLevel: 1,
        battle: {
          hero: { name: 'Hero' },
          monster: { name: 'Monster' },
        },
      },
    ],
  };

  const playerData = { xpTotal: 17 };

  const { preview } = sandbox.determineBattlePreview(levelsData, playerData);

  sandbox.applyBattlePreview(preview, levelsData.levels, {
    requiresLevelOneIntro: false,
    forceLevelOneLanding: false,
    hasIntroProgress: true,
  });

  assert.strictEqual(preview.progressExperienceEarned, 7);
  assert.strictEqual(preview.progressExperienceTotal, 10);
  assert.strictEqual(elements.homeExperienceContainer.hidden, false);
  assert.strictEqual(elements.homeExperienceCount.textContent, '7/10');
  assert.strictEqual(elements.homeExperienceProgressFill.style.width, '70%');
  assert.strictEqual(
    Number(elements.homeExperienceProgress.style.getPropertyValue('--progress-value')),
    0.7
  );
  assert.strictEqual(
    Number(elements.battleProgressElement.style.getPropertyValue('--progress-value')),
    preview.progressExperience
  );
});
