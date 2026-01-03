const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const GUEST_SESSION_ACTIVE_VALUE = 'true';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const NEXT_BATTLE_SNAPSHOT_STORAGE_KEY = 'mathmonstersNextBattleSnapshot';
const PRELOADED_SPRITES_STORAGE_KEY = 'mathmonstersPreloadedSprites';
const LANDING_VISITED_KEY = 'mathmonstersVisitedLanding';
const LEGACY_PROGRESS_STORAGE_KEYS = Object.freeze(['reefRangersProgress']);
const saveStateUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersSaveState) ||
  (typeof window !== 'undefined' ? window.mathMonstersSaveState : null);
const { resetSaveState, writeSaveState } = saveStateUtils || {};
const SAVE_STATE_STORAGE_KEY = saveStateUtils?.STORAGE_KEY || 'mathMonstersSave_v1';
const LOCAL_STORAGE_KEYS_TO_CLEAR = Object.freeze([
  PLAYER_PROFILE_STORAGE_KEY,
  NEXT_BATTLE_SNAPSHOT_STORAGE_KEY,
  SAVE_STATE_STORAGE_KEY,
]);
const SESSION_STORAGE_KEYS_TO_CLEAR = Object.freeze([
  PLAYER_PROFILE_STORAGE_KEY,
  NEXT_BATTLE_SNAPSHOT_STORAGE_KEY,
  PRELOADED_SPRITES_STORAGE_KEY,
]);
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const REGISTER_PAGE_URL = '../index.html';
const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

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

    if (typeof resetSaveState === 'function') {
      resetSaveState();
    } else if (typeof writeSaveState === 'function') {
      writeSaveState({
        difficulty: 1,
        correctStreak: 0,
        incorrectStreak: 0,
        xpTotal: 0,
        spriteTier: 1,
        gems: 0,
        lastSeenDifficulty: 1,
        lastSeenSpriteTier: 1,
      });
    }

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

    if (
      storage.getItem(GUEST_SESSION_KEY) ===
      GUEST_SESSION_REGISTRATION_REQUIRED_VALUE
    ) {
      storage.setItem(GUEST_SESSION_KEY, GUEST_SESSION_ACTIVE_VALUE);
    }

    return false;
  } catch (error) {
    console.warn('Guest session lookup failed.', error);
    return false;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const newGameButton = document.querySelector('[data-new-game]');

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

  const readActiveAccount = () =>
    typeof playerProfileUtils?.getActiveAccount === 'function'
      ? playerProfileUtils.getActiveAccount()
      : null;

  const activeAccount = readActiveAccount();
  if (activeAccount?.email) {
    clearGuestSessionFlag();
    window.location.replace('../index.html');
    return;
  }

  if (isRegistrationRequiredForGuest()) {
    redirectToRegister();
    return;
  }

  const startGuestSession = () => {
    setButtonsState(true);
    if (typeof playerProfileUtils?.clearActiveAccount === 'function') {
      playerProfileUtils.clearActiveAccount();
    }
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
