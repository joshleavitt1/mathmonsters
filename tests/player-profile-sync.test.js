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
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const ACCOUNTS_STORAGE_KEY = 'mathmonstersAccounts';
const ACTIVE_ACCOUNT_STORAGE_KEY = 'mathmonstersActiveAccount';

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

const createPlayerProfileSandbox = ({
  storedProgress,
  sessionProfile,
  accounts,
  activeAccount,
} = {}) => {
  const localEntries = [];
  if (storedProgress) {
    localEntries.push([
      STORAGE_KEY_PROGRESS,
      JSON.stringify(storedProgress),
    ]);
  }
  if (accounts) {
    localEntries.push([ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts)]);
  }
  if (activeAccount) {
    localEntries.push([
      ACTIVE_ACCOUNT_STORAGE_KEY,
      JSON.stringify(activeAccount),
    ]);
  }

  const sessionEntries = sessionProfile
    ? [[PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(sessionProfile)]]
    : [];

  const localStorage = createStorage(localEntries);
  const sessionStorage = createStorage(sessionEntries);

  const sandbox = {
    console,
    localStorage,
    sessionStorage,
    mathMonstersPlayerProfile: undefined,
    globalThis: undefined,
    window: undefined,
  };

  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;

  vm.runInNewContext(PLAYER_PROFILE_SOURCE, sandbox, {
    filename: PLAYER_PROFILE_PATH,
  });

  return { sandbox, localStorage, sessionStorage };
};

const readStoredProgress = (storage) => {
  const raw = storage.getItem(STORAGE_KEY_PROGRESS);
  return raw ? JSON.parse(raw) : null;
};

const readStoredAccounts = (storage) => {
  const raw = storage.getItem(ACCOUNTS_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

test('syncCurrentLevelToStorage retains the higher stored level', () => {
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

test('syncCurrentLevelToStorage upgrades the stored level when new progress is higher', () => {
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

test('persistPlayerProfile caches data for the active account session', async () => {
  const account = {
    email: 'kid@example.com',
    password: 'pw',
    accountLevel: 1,
  };

  const { sandbox, localStorage, sessionStorage } = createPlayerProfileSandbox({
    accounts: [account],
    activeAccount: { email: account.email, accountLevel: account.accountLevel },
  });

  const { persistPlayerProfile } = sandbox.mathMonstersPlayerProfile;

  await persistPlayerProfile(
    { progress: { currentLevel: 3 } },
    { experience: { total: 10 } },
    { accountLevel: 2 }
  );

  const cachedProfileRaw = sessionStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
  assert.ok(cachedProfileRaw, 'profile should be cached in session storage');
  const cachedProfile = JSON.parse(cachedProfileRaw);
  assert.strictEqual(
    cachedProfile.progress.currentLevel,
    3,
    'cached profile should reflect persisted progress'
  );

  const storedAccounts = readStoredAccounts(localStorage);
  const storedAccount = storedAccounts.find(
    (entry) => entry.email === account.email
  );
  assert.ok(storedAccount, 'account should remain stored');
  assert.strictEqual(
    storedAccount.accountLevel,
    2,
    'account level should be updated when provided'
  );
  assert.strictEqual(
    storedAccount.playerData.progress.currentLevel,
    3,
    'stored account profile should persist progress updates'
  );
});

test('fetchPlayerProfile returns cached session data when available', async () => {
  const cachedProfile = {
    hero: { name: 'Cached Hero' },
    progress: { currentLevel: 4 },
  };

  const { sandbox } = createPlayerProfileSandbox({
    sessionProfile: cachedProfile,
    accounts: [
      {
        email: 'kid@example.com',
        password: 'pw',
        playerData: { hero: { name: 'Stored Hero' } },
      },
    ],
    activeAccount: { email: 'kid@example.com' },
  });

  const profile = await sandbox.mathMonstersPlayerProfile.fetchPlayerProfile();
  assert.deepStrictEqual(
    profile.hero,
    cachedProfile.hero,
    'cached session profile should be preferred'
  );
});

test('fetchPlayerProfile falls back to the stored active account profile', async () => {
  const storedProfile = {
    hero: { name: 'Stored Hero' },
    progress: { currentLevel: 2 },
  };

  const { sandbox } = createPlayerProfileSandbox({
    accounts: [
      {
        email: 'kid@example.com',
        password: 'pw',
        playerData: storedProfile,
      },
    ],
    activeAccount: { email: 'kid@example.com' },
  });

  const profile = await sandbox.mathMonstersPlayerProfile.fetchPlayerProfile();
  assert.deepStrictEqual(
    profile,
    storedProfile,
    'stored account profile should be returned when no cache exists'
  );
});
