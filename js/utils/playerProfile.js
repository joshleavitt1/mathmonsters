(() => {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : {};

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

      const supabaseLevel = clampToPositiveInteger(
        toNumericCurrentLevel(playerData?.progress?.currentLevel)
      );

      let levelToPersist = null;
      if (storedLevel !== null || supabaseLevel !== null) {
        if (storedLevel === null) {
          levelToPersist = supabaseLevel;
        } else if (supabaseLevel === null) {
          levelToPersist = storedLevel;
        } else {
          levelToPersist = Math.max(storedLevel, supabaseLevel);
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

  const fetchPlayerProfile = async () => {
    const supabase = globalScope?.supabaseClient;
    if (!supabase?.auth) {
      return null;
    }

    let userId = null;

    try {
      if (typeof supabase.auth.getUser === 'function') {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Supabase user lookup failed.', error);
        }
        userId = data?.user?.id ?? null;
      } else if (typeof supabase.auth.getSession === 'function') {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase session lookup failed.', error);
        }
        userId = data?.session?.user?.id ?? null;
      }
    } catch (error) {
      console.warn('Failed to obtain Supabase user.', error);
      return null;
    }

    if (!userId || typeof supabase.from !== 'function') {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('player_data')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Supabase player profile lookup failed.', error);
        return null;
      }

      const playerData = data?.player_data;
      return playerData && typeof playerData === 'object' ? playerData : null;
    } catch (error) {
      console.warn('Failed to fetch player profile from Supabase.', error);
      return null;
    }
  };

  const namespace =
    (globalScope.mathMonstersPlayerProfile =
      globalScope.mathMonstersPlayerProfile || {});

  namespace.fetchPlayerProfile = fetchPlayerProfile;
  namespace.syncCurrentLevelToStorage = syncCurrentLevelToStorage;
})();
