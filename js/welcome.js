const GUEST_SESSION_KEY = 'reefRangersGuestSession';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';

const createDefaultProgress = () => ({
  battleLevel: 1,
});

const persistGuestSession = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return false;
    }
    storage.setItem(GUEST_SESSION_KEY, 'true');
    const existingProgress = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!existingProgress) {
      storage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify(createDefaultProgress())
      );
    }
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

document.addEventListener('DOMContentLoaded', async () => {
  const newGameButton = document.querySelector('[data-new-game]');
  const supabase = window.supabaseClient;

  const setButtonState = (isDisabled) => {
    if (!newGameButton) {
      return;
    }
    newGameButton.disabled = Boolean(isDisabled);
    newGameButton.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
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

  if (newGameButton) {
    newGameButton.addEventListener('click', () => {
      setButtonState(true);
      const success = persistGuestSession();
      if (!success) {
        setButtonState(false);
        return;
      }
      window.location.replace('../index.html');
    });
  }
});
