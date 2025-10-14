const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOADER_PATH = path.join(PROJECT_ROOT, 'js', 'loader.js');
const PROGRESS_UTILS_PATH = path.join(PROJECT_ROOT, 'js', 'utils', 'progress.js');
const PLAYER_PROFILE_UTILS_PATH = path.join(
  PROJECT_ROOT,
  'js',
  'utils',
  'playerProfile.js'
);

const LOADER_SOURCE = fs.readFileSync(LOADER_PATH, 'utf8');
const PROGRESS_SOURCE = fs.readFileSync(PROGRESS_UTILS_PATH, 'utf8');
const PLAYER_PROFILE_SOURCE = fs.readFileSync(
  PLAYER_PROFILE_UTILS_PATH,
  'utf8'
);

const STORAGE_KEY_PROGRESS = 'mathmonstersProgress';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const SAMPLE_QUESTIONS_DATA = {
  type1_multipleChoiceMath: [
    {
      question: 'What is 1 + 1?',
      choices: [1, 2, 3],
      answer: 2,
    },
  ],
  type2_countTheBubbles: [
    {
      question: 'Count the bubbles.',
      spriteCount: 1,
      choices: [1, 2, 3],
      answer: 1,
    },
  ],
  type3_fillInTheBlank: [
    {
      question: '_ + 1 = 2',
      choices: [1, 2, 3],
      answer: 1,
    },
  ],
};

const createStorage = () => {
  const store = new Map();
  return {
    getItem(key) {
      const normalizedKey = String(key);
      return store.has(normalizedKey) ? store.get(normalizedKey) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
  };
};

const createLoaderSandbox = ({
  storedProgress,
  playerData,
  levelsData,
}) => {
  const sessionStorage = createStorage();
  const localStorage = createStorage();

  if (storedProgress) {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(storedProgress));
  }

  const createResponse = (data) => ({
    ok: true,
    json: async () => deepClone(data),
  });

  const fetch = async (resource) => {
    const url = String(resource || '');
    if (url.endsWith('player.json')) {
      return createResponse(playerData);
    }
    if (url.endsWith('levels.json')) {
      return createResponse(levelsData);
    }
    if (
      url.endsWith('questions/questions.json') ||
      url.endsWith('data/questions/questions.json')
    ) {
      return createResponse(SAMPLE_QUESTIONS_DATA);
    }
    throw new Error(`Unexpected fetch request: ${url}`);
  };

  let dataLoadedResolve;
  const dataLoadedPromise = new Promise((resolve) => {
    dataLoadedResolve = resolve;
  });

  const document = {
    baseURI: 'https://example.com/mathmonsters/index.html',
    currentScript: { dataset: {} },
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
    dispatchEvent(event) {
      if (event && event.type === 'data-loaded') {
        dataLoadedResolve(event);
      }
      return true;
    },
  };

  const playerProfile = {
    async fetchPlayerProfile() {
      return null;
    },
    syncCurrentLevelToStorage() {},
  };

  const window = {
    location: { pathname: '/index.html' },
    mathMonstersAssetBase: '/mathmonsters',
    mathMonstersPlayerProfile: playerProfile,
    mathMonstersPreloadedSprites: new Set(),
    addEventListener() {},
    removeEventListener() {},
    localStorage,
    sessionStorage,
  };

  document.defaultView = window;
  window.document = document;

  class FakeImage {
    constructor() {
      this.decoding = 'auto';
      this.complete = false;
      this.naturalWidth = 0;
      this.onload = null;
      this.onerror = null;
      this._src = '';
    }

    set src(value) {
      this._src = value;
      queueMicrotask(() => {
        this.complete = true;
        this.naturalWidth = 1;
        if (typeof this.onload === 'function') {
          this.onload();
        }
      });
    }

    get src() {
      return this._src;
    }
  }

  class FakeEvent {
    constructor(type) {
      this.type = type;
    }
  }

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
    fetch,
    window,
    document,
    Image: FakeImage,
    Event: FakeEvent,
    localStorage,
    sessionStorage,
    mathMonstersPlayerProfile: playerProfile,
    mathMonstersProgress: undefined,
    globalThis: undefined,
  };

  sandbox.globalThis = sandbox;

  return { sandbox, dataLoadedPromise, sessionStorage };
};

test('loader promotes nested math progress level to root state', async () => {
  const storedProgress = {
    mathType: 'addition',
    addition: {
      currentLevel: 7,
    },
  };

  const playerData = {
    hero: {
      name: 'Shellfin',
      sprite: 'images/shellfin_level_1.png',
    },
    progress: {},
  };

  const levelsData = {
    mathTypes: {
      addition: {
        name: 'Addition',
        levels: [
          {
            id: 'addition-1',
            currentLevel: 1,
            battle: {
              hero: {
                name: 'Shellfin',
                sprite: 'images/shellfin_level_1.png',
              },
              monster: {
                name: 'Crabbo',
                sprite: 'images/monster-crabbo.png',
              },
            },
          },
          {
            id: 'addition-7',
            currentLevel: 7,
            battle: {
              hero: {
                name: 'Shellfin',
                sprite: 'images/shellfin_level_7.png',
              },
              monster: {
                name: 'Hydrato',
                sprite: 'images/monster-hydrato.png',
              },
            },
          },
        ],
      },
    },
  };

  const { sandbox, dataLoadedPromise, sessionStorage } = createLoaderSandbox({
    storedProgress,
    playerData,
    levelsData,
  });

  vm.runInNewContext(PROGRESS_SOURCE, sandbox, {
    filename: PROGRESS_UTILS_PATH,
  });

  vm.runInNewContext(LOADER_SOURCE, sandbox, {
    filename: LOADER_PATH,
  });

  await dataLoadedPromise;

  const preloadedData = sandbox.window.preloadedData;
  assert.ok(preloadedData, 'preloaded data should be available');
  assert.strictEqual(preloadedData.progress.currentLevel, 7);
  assert.strictEqual(preloadedData.level?.currentLevel, 7);

  const snapshotRaw = sessionStorage.getItem(
    NEXT_BATTLE_SNAPSHOT_STORAGE_KEY
  );
  assert.ok(snapshotRaw, 'next battle snapshot should be stored');
  const snapshot = JSON.parse(snapshotRaw);
  assert.strictEqual(snapshot.currentLevel, 7);
});

test('loader promotes math progress stored within mathTypes container', async () => {
  const storedProgress = {
    mathType: 'addition',
    mathTypes: {
      addition: {
        currentLevel: 9,
      },
    },
  };

  const playerData = {
    hero: {
      name: 'Shellfin',
      sprite: 'images/shellfin_level_1.png',
    },
    progress: {},
  };

  const levelsData = {
    mathTypes: {
      addition: {
        name: 'Addition',
        levels: [
          {
            id: 'addition-1',
            currentLevel: 1,
            battle: {
              hero: {
                name: 'Shellfin',
                sprite: 'images/shellfin_level_1.png',
              },
              monster: {
                name: 'Crabbo',
                sprite: 'images/monster-crabbo.png',
              },
            },
          },
          {
            id: 'addition-9',
            currentLevel: 9,
            battle: {
              hero: {
                name: 'Shellfin',
                sprite: 'images/shellfin_level_9.png',
              },
              monster: {
                name: 'Hydrato',
                sprite: 'images/monster-hydrato.png',
              },
            },
          },
        ],
      },
    },
  };

  const { sandbox, dataLoadedPromise, sessionStorage } = createLoaderSandbox({
    storedProgress,
    playerData,
    levelsData,
  });

  vm.runInNewContext(PROGRESS_SOURCE, sandbox, {
    filename: PROGRESS_UTILS_PATH,
  });

  vm.runInNewContext(LOADER_SOURCE, sandbox, {
    filename: LOADER_PATH,
  });

  await dataLoadedPromise;

  const preloadedData = sandbox.window.preloadedData;
  assert.ok(preloadedData, 'preloaded data should be available');
  assert.strictEqual(preloadedData.progress.currentLevel, 9);
  assert.strictEqual(preloadedData.level?.currentLevel, 9);

  const snapshotRaw = sessionStorage.getItem(
    NEXT_BATTLE_SNAPSHOT_STORAGE_KEY
  );
  assert.ok(snapshotRaw, 'next battle snapshot should be stored');
  const snapshot = JSON.parse(snapshotRaw);
  assert.strictEqual(snapshot.currentLevel, 9);
});

test('loader keeps stored current level when remote profile reports a lower one', async () => {
  const storedProgress = {
    currentLevel: 11,
  };

  const playerData = {
    hero: {
      name: 'Shellfin',
      sprite: 'images/shellfin_level_1.png',
    },
    progress: {
      currentLevel: 2,
    },
  };

  const levelsData = {
    mathTypes: {
      addition: {
        name: 'Addition',
        levels: [
          {
            id: 'addition-1',
            currentLevel: 1,
            battle: {
              hero: {
                name: 'Shellfin',
                sprite: 'images/shellfin_level_1.png',
              },
              monster: {
                name: 'Crabbo',
                sprite: 'images/monster-crabbo.png',
              },
            },
          },
          {
            id: 'addition-11',
            currentLevel: 11,
            battle: {
              hero: {
                name: 'Shellfin',
                sprite: 'images/shellfin_level_11.png',
              },
              monster: {
                name: 'Hydrato',
                sprite: 'images/monster-hydrato.png',
              },
            },
          },
        ],
      },
    },
  };

  const remoteProfile = {
    progress: {
      currentLevel: 4,
    },
  };

  const { sandbox, dataLoadedPromise } = createLoaderSandbox({
    storedProgress,
    playerData,
    levelsData,
  });

  vm.runInNewContext(PROGRESS_SOURCE, sandbox, {
    filename: PROGRESS_UTILS_PATH,
  });

  vm.runInNewContext(PLAYER_PROFILE_SOURCE, sandbox, {
    filename: PLAYER_PROFILE_UTILS_PATH,
  });

  sandbox.mathMonstersPlayerProfile.fetchPlayerProfile = async () =>
    remoteProfile;

  vm.runInNewContext(LOADER_SOURCE, sandbox, {
    filename: LOADER_PATH,
  });

  await dataLoadedPromise;

  const storedProgressRaw = sandbox.localStorage.getItem(STORAGE_KEY_PROGRESS);
  assert.ok(storedProgressRaw, 'stored progress should remain available');
  const stored = JSON.parse(storedProgressRaw);
  assert.strictEqual(
    stored.currentLevel,
    11,
    'stored current level should remain at the higher value'
  );

  const preloadedData = sandbox.window.preloadedData;
  assert.ok(preloadedData, 'preloaded data should exist after loader run');
  assert.strictEqual(
    preloadedData.progress.currentLevel,
    11,
    'preloaded progress should use the higher stored level'
  );
});
