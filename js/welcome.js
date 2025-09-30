const GUEST_SESSION_KEY = 'reefRangersGuestSession';
const GUEST_SESSION_ACTIVE_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const LANDING_MODE_STORAGE_KEY = 'reefRangersLandingMode';
const BATTLE_PAGE_MODE_PLAY = 'play';
const BATTLE_PAGE_MODE_DEV_TOOLS = 'devtools';
const GUEST_SESSION_REGISTRATION_REQUIRED_VALUE = 'register-required';
const REGISTER_PAGE_URL = 'register.html';

const createDefaultProgress = () => ({
  battleLevel: 1,
});

const persistGuestSession = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return false;
    }
    storage.setItem(GUEST_SESSION_KEY, GUEST_SESSION_ACTIVE_VALUE);
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify(createDefaultProgress())
    );
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

const persistLandingModeRequest = (mode) => {
  try {
    const storage = window.sessionStorage;
    if (!storage) {
      return false;
    }
    if (!mode) {
      storage.removeItem(LANDING_MODE_STORAGE_KEY);
      return true;
    }
    storage.setItem(LANDING_MODE_STORAGE_KEY, mode);
    return true;
  } catch (error) {
    console.warn('Landing mode preference could not be saved.', error);
    return false;
  }
};

const clearLandingModeRequest = () => {
  try {
    window.sessionStorage?.removeItem(LANDING_MODE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear landing mode preference.', error);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const newGameButton = document.querySelector('[data-new-game]');
  const noDevButton = document.querySelector('[data-new-game-no-dev]');
  const supabase = window.supabaseClient;

  const setButtonsState = (isDisabled) => {
    const buttons = [newGameButton, noDevButton];
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

  const startGuestSession = (hideDevControls) => {
    setButtonsState(true);
    const success = persistGuestSession();
    if (!success) {
      setButtonsState(false);
      return;
    }

    let redirectTarget = '../index.html';
    if (hideDevControls) {
      persistLandingModeRequest(BATTLE_PAGE_MODE_PLAY);
      redirectTarget = '../index.html?mode=play';
    } else {
      persistLandingModeRequest(BATTLE_PAGE_MODE_DEV_TOOLS);
    }

    window.location.replace(redirectTarget);
  };

  if (newGameButton) {
    newGameButton.addEventListener('click', () => {
      startGuestSession(false);
    });
  }

  if (noDevButton) {
    noDevButton.addEventListener('click', () => {
      startGuestSession(true);
    });
  }
});
