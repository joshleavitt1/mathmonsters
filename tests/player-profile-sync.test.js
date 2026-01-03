const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PLAYER_PROFILE_PATH = path.join(
  PROJECT_ROOT,
  'js',
  'utils',
  'playerProfile.js'
);

const PLAYER_PROFILE_SOURCE = fs.readFileSync(PLAYER_PROFILE_PATH, 'utf8');

const STORAGE_KEY_PROGRESS = 'mathmonstersProgress';

const createStorage = (initialEntries = []) => {
  const store = new Map(initialEntries);
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

const createPlayerProfileSandbox = ({ storedProgress } = {}) => {
  const initialEntries = [];
  if (storedProgress) {
    initialEntries.push([
      STORAGE_KEY_PROGRESS,
      JSON.stringify(storedProgress),
    ]);
  }

  const localStorage = createStorage(initialEntries);

  const sandbox = {
    console,
    localStorage,
    mathMonstersPlayerProfile: undefined,
    globalThis: undefined,
  };

  sandbox.globalThis = sandbox;

  vm.runInNewContext(PLAYER_PROFILE_SOURCE, sandbox, {
    filename: PLAYER_PROFILE_PATH,
  });

  return { sandbox, localStorage };
};

const readStoredProgress = (localStorage) => {
  const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
  return raw ? JSON.parse(raw) : null;
};

test('syncCurrentLevelToStorage keeps the higher stored level when Supabase reports a lower one', () => {
  const { sandbox, localStorage } = createPlayerProfileSandbox({
    storedProgress: { currentLevel: 12 },
  });

  const { syncCurrentLevelToStorage } = sandbox.mathMonstersPlayerProfile;

  syncCurrentLevelToStorage(
    { progress: { currentLevel: 5 } },
    STORAGE_KEY_PROGRESS
  );

  const stored = readStoredProgress(localStorage);
  assert.ok(stored, 'stored progress should remain available');
  assert.strictEqual(
    stored.currentLevel,
    12,
    'higher stored current level should be preserved'
  );
});

test('syncCurrentLevelToStorage upgrades the stored level when Supabase reports a higher one', () => {
  const { sandbox, localStorage } = createPlayerProfileSandbox({
    storedProgress: { currentLevel: 4 },
  });

  const { syncCurrentLevelToStorage } = sandbox.mathMonstersPlayerProfile;

  syncCurrentLevelToStorage(
    { progress: { currentLevel: 9 } },
    STORAGE_KEY_PROGRESS
  );

  const stored = readStoredProgress(localStorage);
  assert.ok(stored, 'stored progress should exist after sync');
  assert.strictEqual(
    stored.currentLevel,
    9,
    'stored current level should be upgraded'
  );
});

