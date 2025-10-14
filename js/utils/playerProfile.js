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

  const clonePlainObject = (value) => {
    if (!isPlainObject(value)) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to clone player data for Supabase sync.', error);
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

  const resolveSupabaseUserId = async (supabase) => {
    if (!supabase?.auth) {
      return null;
    }

    try {
      if (typeof supabase.auth.getUser === 'function') {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Supabase user lookup failed.', error);
        }
        return data?.user?.id ?? null;
      }

      if (typeof supabase.auth.getSession === 'function') {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase session lookup failed.', error);
        }
        return data?.session?.user?.id ?? null;
      }
    } catch (error) {
      console.warn('Failed to obtain Supabase user.', error);
    }

    return null;
  };

  const buildPlayerDataPayload = (playerData, progressData) => {
    const playerClone = clonePlainObject(playerData);
    const progressClone = clonePlainObject(progressData);

    if (!playerClone && !progressClone) {
      return null;
    }

    const payload = playerClone ?? {};

    if (progressClone) {
      payload.progress = progressClone;
    }

    return payload;
  };

  const fetchPlayerProfile = async () => {
    const supabase = globalScope?.supabaseClient;
    if (!supabase?.auth) {
      return null;
    }

    const userId = await resolveSupabaseUserId(supabase);
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

  const syncPlayerDataWithSupabase = async (playerData, progressData) => {
    const supabase = globalScope?.supabaseClient;
    if (!supabase?.from) {
      return false;
    }

    const userId = await resolveSupabaseUserId(supabase);
    if (!userId) {
      return false;
    }

    const payload = buildPlayerDataPayload(playerData, progressData);
    if (!payload) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('player_profiles')
        .upsert({ id: userId, player_data: payload }, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase rejected the request to persist player data.', error);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Unable to sync player data with Supabase.', error);
      return false;
    }
  };

  const namespace =
    (globalScope.mathMonstersPlayerProfile =
      globalScope.mathMonstersPlayerProfile || {});

  namespace.fetchPlayerProfile = fetchPlayerProfile;
  namespace.syncCurrentLevelToStorage = syncCurrentLevelToStorage;
  namespace.syncPlayerDataWithSupabase = syncPlayerDataWithSupabase;
})();
