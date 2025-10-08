(() => {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : {};

  const toNumericBattleLevel = (value) => {
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

  const syncBattleLevelToStorage = (playerData, storageKey) => {
    if (!playerData || typeof storageKey !== 'string' || !storageKey) {
      return;
    }

    const remoteLevel = playerData?.progress?.battleLevel;
    const numericLevel = toNumericBattleLevel(remoteLevel);
    if (numericLevel === null) {
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
      nextValue.battleLevel = numericLevel;

      storage.setItem(storageKey, JSON.stringify(nextValue));
    } catch (error) {
      console.warn('Failed to sync battle level with storage.', error);
    }
  };

  const resolveSupabaseClient = () =>
    globalScope?.supabaseClient && typeof globalScope.supabaseClient === 'object'
      ? globalScope.supabaseClient
      : null;

  const resolveCurrentUserId = async () => {
    const supabase = resolveSupabaseClient();
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
      return null;
    }

    return null;
  };

  const ensurePlayerIdentifiers = (playerData, userId) => {
    if (!playerData || typeof playerData !== 'object') {
      return null;
    }

    const clone = { ...playerData };
    if (
      clone.player &&
      typeof clone.player === 'object' &&
      clone.player !== null &&
      !Array.isArray(clone.player)
    ) {
      clone.player = { ...clone.player };
    }

    const applyIdentifier = (target) => {
      if (!target || typeof target !== 'object') {
        return;
      }

      if (typeof userId === 'string' && userId) {
        const currentId = typeof target.id === 'string' ? target.id.trim() : '';
        if (!currentId || currentId === 'player-001') {
          target.id = userId;
        }
      }
    };

    applyIdentifier(clone);
    if (clone.player && typeof clone.player === 'object') {
      applyIdentifier(clone.player);
    }

    return clone;
  };

  const fetchPlayerProfile = async () => {
    const supabase = resolveSupabaseClient();
    if (!supabase?.from) {
      return null;
    }

    const userId = await resolveCurrentUserId();
    if (!userId) {
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
      const normalized =
        playerData && typeof playerData === 'object'
          ? ensurePlayerIdentifiers(playerData, userId)
          : null;
      return normalized;
    } catch (error) {
      console.warn('Failed to fetch player profile from Supabase.', error);
      return null;
    }
  };

  const subscribeToPlayerProfile = async (onChange) => {
    if (typeof onChange !== 'function') {
      return null;
    }

    const supabase = resolveSupabaseClient();
    if (!supabase?.channel) {
      return null;
    }

    const userId = await resolveCurrentUserId();
    if (!userId) {
      return null;
    }

    let isActive = true;

    const handlePayload = (payload) => {
      if (!isActive) {
        return;
      }

      try {
        const candidate = payload?.new ?? payload?.old ?? null;
        const rawProfile = candidate && typeof candidate === 'object'
          ? candidate.player_data ?? candidate
          : null;

        if (!rawProfile || typeof rawProfile !== 'object') {
          return;
        }

        const normalized = ensurePlayerIdentifiers(rawProfile, userId);
        if (normalized) {
          onChange(normalized);
        }
      } catch (error) {
        console.warn('Player profile subscription callback failed.', error);
      }
    };

    try {
      const channel = supabase
        .channel(`player-profile:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'player_profiles',
            filter: `id=eq.${userId}`,
          },
          handlePayload
        );

      const subscribeResult = channel.subscribe();
      if (subscribeResult && typeof subscribeResult.then === 'function') {
        await subscribeResult;
      }

      return {
        userId,
        unsubscribe: () => {
          if (!isActive) {
            return;
          }
          isActive = false;
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            console.warn('Failed to remove player profile subscription.', error);
          }
        },
      };
    } catch (error) {
      console.warn('Unable to subscribe to player profile updates.', error);
      return null;
    }
  };

  const namespace =
    (globalScope.mathMonstersPlayerProfile =
      globalScope.mathMonstersPlayerProfile || {});

  namespace.fetchPlayerProfile = fetchPlayerProfile;
  namespace.syncBattleLevelToStorage = syncBattleLevelToStorage;
  namespace.resolveCurrentUserId = resolveCurrentUserId;
  namespace.ensurePlayerIdentifiers = ensurePlayerIdentifiers;
  namespace.subscribeToPlayerProfile = subscribeToPlayerProfile;
})();
