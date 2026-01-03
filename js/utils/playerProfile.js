(() => {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : {};

  const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
  const ACCOUNTS_STORAGE_KEY = 'mathmonstersAccounts';
  const ACTIVE_ACCOUNT_STORAGE_KEY = 'mathmonstersActiveAccount';

  const isPlainObject = (value) =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const clonePlainObject = (value) => {
    if (!isPlainObject(value)) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to clone player data for storage.', error);
      return null;
    }
  };

  const toNumericCurrentLevel = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  };

  const clampToPositiveInteger = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    const intValue = Math.floor(value);
    return intValue > 0 ? intValue : null;
  };

  const normalizeAccountEmail = (value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim().toLowerCase();
    return trimmed || null;
  };

  const sanitizeAccountLevel = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    const level = Math.max(1, Math.round(numeric));
    return Number.isFinite(level) ? level : null;
  };

  const readCachedProfile = () => {
    try {
      const storage = globalScope?.sessionStorage;
      if (!storage) {
        return null;
      }
      const raw = storage.getItem(PLAYER_PROFILE_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      console.warn('Unable to read cached player profile.', error);
      return null;
    }
  };

  const writeCachedProfile = (profile) => {
    try {
      const storage = globalScope?.sessionStorage;
      if (!storage) {
        return;
      }

      if (!profile || typeof profile !== 'object') {
        storage.removeItem(PLAYER_PROFILE_STORAGE_KEY);
        return;
      }

      storage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.warn('Unable to cache player profile.', error);
    }
  };

  const resolveHostPrototype = () => {
    if (globalScope && typeof globalScope === 'object') {
      const candidate =
        globalScope.localStorage && typeof globalScope.localStorage === 'object'
          ? Object.getPrototypeOf(globalScope.localStorage)
          : Object.getPrototypeOf(globalScope);
      if (candidate) {
        return candidate;
      }
    }

    return Object.prototype;
  };

  const alignPrototype = (value, prototypeHint = resolveHostPrototype()) => {
    if (!isPlainObject(value)) {
      return value;
    }

    const normalized = Object.create(prototypeHint || Object.prototype);

    Object.entries(value).forEach(([key, entry]) => {
      normalized[key] = alignPrototype(entry, prototypeHint);
    });

    return normalized;
  };

  const sanitizeAccountEntry = (entry) => {
    const email = normalizeAccountEmail(entry?.email);
    if (!email) {
      return null;
    }

    const password =
      typeof entry?.password === 'string' ? entry.password : '';
    const accountLevel = sanitizeAccountLevel(entry?.accountLevel);
    const playerData = isPlainObject(entry?.playerData)
      ? entry.playerData
      : null;

    return {
      email,
      password,
      accountLevel,
      playerData,
    };
  };

  const readStoredAccounts = () => {
    try {
      const storage = globalScope?.localStorage;
      if (!storage) {
        return [];
      }

      const raw = storage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map(sanitizeAccountEntry).filter(Boolean);
    } catch (error) {
      console.warn('Unable to read stored accounts.', error);
      return [];
    }
  };

  const writeStoredAccounts = (accounts = []) => {
    try {
      const storage = globalScope?.localStorage;
      if (!storage) {
        return [];
      }

      const sanitized = Array.isArray(accounts)
        ? accounts.map(sanitizeAccountEntry).filter(Boolean)
        : [];

      storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(sanitized));
      return sanitized;
    } catch (error) {
      console.warn('Unable to persist stored accounts.', error);
      return Array.isArray(accounts) ? accounts : [];
    }
  };

  const findAccountByEmail = (accounts, email) => {
    const normalized = normalizeAccountEmail(email);
    if (!normalized) {
      return null;
    }

    const source = Array.isArray(accounts) ? accounts : readStoredAccounts();
    return (
      source.find(
        (account) => account && normalizeAccountEmail(account.email) === normalized
      ) || null
    );
  };

  const getActiveAccount = () => {
    try {
      const storage = globalScope?.localStorage;
      if (!storage) {
        return null;
      }

      const raw = storage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const email = normalizeAccountEmail(parsed?.email);
      if (!email) {
        return null;
      }

      return {
        email,
        accountLevel: sanitizeAccountLevel(parsed?.accountLevel),
        updatedAt: parsed?.updatedAt ?? null,
      };
    } catch (error) {
      console.warn('Unable to read active account session.', error);
      return null;
    }
  };

  const setActiveAccount = (account) => {
    try {
      const storage = globalScope?.localStorage;
      if (!storage) {
        return null;
      }

      const email = normalizeAccountEmail(account?.email ?? account);
      if (!email) {
        return null;
      }

      const payload = {
        email,
        accountLevel: sanitizeAccountLevel(account?.accountLevel),
        updatedAt: Date.now(),
      };

      storage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(payload));
      return payload;
    } catch (error) {
      console.warn('Unable to persist active account session.', error);
      return null;
    }
  };

  const clearActiveAccount = () => {
    try {
      globalScope?.localStorage?.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear active account session.', error);
    }

    writeCachedProfile(null);
  };

  const mergeProgressPayload = (baseProgress, overrideProgress) => {
    const base =
      clonePlainObject(baseProgress) ??
      (isPlainObject(baseProgress) ? { ...baseProgress } : {});
    const override =
      clonePlainObject(overrideProgress) ??
      (isPlainObject(overrideProgress) ? { ...overrideProgress } : null);

    if (!override) {
      return Object.keys(base).length > 0 ? base : null;
    }

    const mergeIntoTarget = (target, source) => {
      Object.entries(source).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const existing =
            target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
              ? target[key]
              : {};
          target[key] = mergeIntoTarget({ ...existing }, value);
          return;
        }

        target[key] = value;
      });

      return target;
    };

    const merged = mergeIntoTarget({ ...base }, override);
    return Object.keys(merged).length > 0 ? merged : null;
  };

  const buildPlayerDataPayload = (playerData, progressData) => {
    const playerClone = clonePlainObject(playerData);
    const payload = playerClone ?? {};

    const mergedProgress = mergeProgressPayload(payload.progress, progressData);

    if (!playerClone && !mergedProgress) {
      return null;
    }

    if (mergedProgress) {
      payload.progress = mergedProgress;
    } else if (payload.progress) {
      delete payload.progress;
    }

    return payload;
  };

  const fetchPlayerProfile = async () => {
    const cached = readCachedProfile();
    if (cached) {
      const cloned = clonePlainObject(cached);
      return alignPrototype(cloned || cached);
    }

    const activeAccount = getActiveAccount();
    if (!activeAccount?.email) {
      return null;
    }

    const account = findAccountByEmail(readStoredAccounts(), activeAccount.email);
    const playerData = alignPrototype(
      clonePlainObject(account?.playerData) || account?.playerData
    );
    if (playerData) {
      writeCachedProfile(playerData);
      return playerData;
    }

    return null;
  };

  const persistPlayerProfile = async (playerData, progressData, options = {}) => {
    const payload = buildPlayerDataPayload(playerData, progressData);
    const hasPayload = payload && typeof payload === 'object';

    if (hasPayload) {
      writeCachedProfile(payload);
    } else {
      writeCachedProfile(null);
    }

    const activeAccount = getActiveAccount();
    if (!activeAccount?.email || !hasPayload) {
      return Boolean(hasPayload);
    }

    const accounts = readStoredAccounts();
    const existing = findAccountByEmail(accounts, activeAccount.email);
    const accountLevel =
      sanitizeAccountLevel(options?.accountLevel) ??
      activeAccount.accountLevel ??
      null;

    if (existing) {
      existing.playerData = payload;
      if (accountLevel !== null) {
        existing.accountLevel = accountLevel;
      }
    } else {
      accounts.push({
        email: activeAccount.email,
        password: '',
        accountLevel,
        playerData: payload,
      });
    }

    writeStoredAccounts(accounts);
    setActiveAccount({ email: activeAccount.email, accountLevel });

    return true;
  };

  const syncCurrentLevelToStorage = (playerData, storageKey) => {
    if (!playerData || typeof storageKey !== 'string' || !storageKey) {
      return;
    }

    try {
      const storage = globalScope?.localStorage;
      if (!storage) {
        return;
      }

      const raw = storage.getItem(storageKey);
      let parsed = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          console.warn('Stored progress could not be parsed for sync.', error);
        }
      }

      const nextValue =
        parsed && typeof parsed === 'object' ? { ...parsed } : {};

      const storedLevel = clampToPositiveInteger(
        toNumericCurrentLevel(nextValue.currentLevel)
      );

      const storedPlayerLevel = clampToPositiveInteger(
        toNumericCurrentLevel(playerData?.progress?.currentLevel)
      );

      let levelToPersist = null;
      if (storedLevel !== null || storedPlayerLevel !== null) {
        if (storedLevel === null) {
          levelToPersist = storedPlayerLevel;
        } else if (storedPlayerLevel === null) {
          levelToPersist = storedLevel;
        } else {
          levelToPersist = Math.max(storedLevel, storedPlayerLevel);
        }
      }

      if (levelToPersist === null) {
        if ('currentLevel' in nextValue) {
          delete nextValue.currentLevel;
        }

        if (Object.keys(nextValue).length === 0) {
          storage.removeItem(storageKey);
        } else {
          storage.setItem(storageKey, JSON.stringify(nextValue));
        }

        return;
      }

      nextValue.currentLevel = levelToPersist;
      storage.setItem(storageKey, JSON.stringify(nextValue));
    } catch (error) {
      console.warn('Failed to sync current level with storage.', error);
    }
  };

  const namespace =
    (globalScope.mathMonstersPlayerProfile =
      globalScope.mathMonstersPlayerProfile || {});

  namespace.normalizeAccountEmail = normalizeAccountEmail;
  namespace.readStoredAccounts = readStoredAccounts;
  namespace.writeStoredAccounts = writeStoredAccounts;
  namespace.findAccountByEmail = findAccountByEmail;
  namespace.getActiveAccount = getActiveAccount;
  namespace.setActiveAccount = setActiveAccount;
  namespace.clearActiveAccount = clearActiveAccount;
  namespace.readCachedProfile = readCachedProfile;
  namespace.writeCachedProfile = writeCachedProfile;
  namespace.fetchPlayerProfile = fetchPlayerProfile;
  namespace.persistPlayerProfile = persistPlayerProfile;
  namespace.syncCurrentLevelToStorage = syncCurrentLevelToStorage;
})();
