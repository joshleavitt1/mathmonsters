const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const GUEST_SESSION_ACTIVE_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'mathmonstersProgress';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';
const PRELOADED_SPRITES_STORAGE_KEY = 'mathmonstersPreloadedSprites';
const HOME_PROGRESS_STORAGE_KEY = 'mathmonstersHomeProgressState';
const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';
const LEGACY_PROGRESS_STORAGE_KEYS = Object.freeze(['reefRangersProgress']);
const LOCAL_STORAGE_KEYS_TO_CLEAR = Object.freeze([
  PLAYER_PROFILE_STORAGE_KEY,
  NEXT_BATTLE_SNAPSHOT_STORAGE_KEY,
  HOME_PROGRESS_STORAGE_KEY,
]);
const SESSION_STORAGE_KEYS_TO_CLEAR = Object.freeze([
  PLAYER_PROFILE_STORAGE_KEY,
  NEXT_BATTLE_SNAPSHOT_STORAGE_KEY,
  PRELOADED_SPRITES_STORAGE_KEY,
  HOME_PROGRESS_STORAGE_KEY,
]);
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const REGISTER_PAGE_URL = 'register.html';

const createDefaultProgress = () => ({
  currentLevel: 1,
});

const clearLandingVisitState = (localStorageRef) => {
  try {
    window.sessionStorage?.removeItem(LANDING_VISITED_KEY);
  } catch (error) {
    console.warn('Unable to clear landing visit state from session storage.', error);
  }

  try {
    const storage = localStorageRef ?? window.localStorage;
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(LANDING_VISITED_KEY);
    }
  } catch (error) {
    console.warn('Unable to clear landing visit state from local storage.', error);
  }
};

const clearStoredGuestState = (localStorageRef, sessionStorageRef) => {
  const removeKeys = (storage, keys, label) => {
    if (!storage || typeof storage.removeItem !== 'function') {
      return;
    }

    keys.forEach((key) => {
      if (!key) {
        return;
      }

      try {
        storage.removeItem(key);
      } catch (error) {
        console.warn(`Unable to clear ${label} key: ${key}`, error);
      }
    });
  };

  removeKeys(localStorageRef, LOCAL_STORAGE_KEYS_TO_CLEAR, 'local storage');
  removeKeys(sessionStorageRef, SESSION_STORAGE_KEYS_TO_CLEAR, 'session storage');
};

const persistGuestSession = () => {
  let storage;
  try {
    storage = window.localStorage;
  } catch (error) {
    console.warn('Guest session could not be saved.', error);
    return false;
  }

  if (!storage) {
    return false;
  }

  let sessionStorageRef = null;
  try {
    sessionStorageRef = window.sessionStorage;
  } catch (error) {
    console.warn('Session storage is not available for guest session reset.', error);
  }

  clearStoredGuestState(storage, sessionStorageRef);

  try {
    storage.setItem(GUEST_SESSION_KEY, GUEST_SESSION_ACTIVE_VALUE);
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify(createDefaultProgress())
    );

    LEGACY_PROGRESS_STORAGE_KEYS.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch (error) {
        console.warn(`Unable to clear legacy progress key: ${key}`, error);
      }
    });

    clearLandingVisitState(storage);
    return true;
  } catch (error) {
    console.warn('Guest session could not be saved.', error);
    return false;
  }
};

const clearGuestSessionFlag = () => {
  try {
    window.localStorage?.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear guest session flag.', error);
  }
};

const redirectToRegister = () => {
  window.location.replace(REGISTER_PAGE_URL);
};

const isRegistrationRequiredForGuest = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return false;
    }

    return (
      storage.getItem(GUEST_SESSION_KEY) ===
      GUEST_SESSION_REGISTRATION_REQUIRED_VALUE
    );
  } catch (error) {
    console.warn('Guest session lookup failed.', error);
    return false;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const newGameButton = document.querySelector('[data-new-game]');
  const supabase = window.supabaseClient;

  const setButtonsState = (isDisabled) => {
    const buttons = [newGameButton];
    buttons.forEach((button) => {
      if (!button) {
        return;
      }
      button.disabled = Boolean(isDisabled);
      button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    });
  };

  if (supabase?.auth?.getSession) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Unable to check existing session.', error);
      }
      if (data?.session) {
        clearGuestSessionFlag();
        window.location.replace('../index.html');
        return;
      }
    } catch (error) {
      console.warn('Unexpected session lookup error.', error);
    }
  }

  if (isRegistrationRequiredForGuest()) {
    redirectToRegister();
    return;
  }

  const startGuestSession = () => {
    setButtonsState(true);
    const success = persistGuestSession();
    if (!success) {
      setButtonsState(false);
      return;
    }

    window.location.replace('../index.html');
  };

  if (newGameButton) {
    newGameButton.addEventListener('click', () => {
      startGuestSession();
    });
  }
});
