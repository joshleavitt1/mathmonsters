const GUEST_SESSION_KEY = 'reefRangersGuestSession';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const LEVEL_TWO_BATTLE_LEVEL = 2;

const clearGuestSessionFlag = () => {
  try {
    window.localStorage?.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear guest session flag.', error);
  }
};

const setElementVisibility = (element, shouldShow) => {
  if (!element) {
    return;
  }
  element.hidden = !shouldShow;
};

const setFieldState = (field, isDisabled) => {
  if (!field) {
    return;
  }
  field.disabled = Boolean(isDisabled);
};

const updateSelectPlaceholderState = (select) => {
  if (!select) {
    return;
  }
  const hasValue = Boolean(readTrimmedValue(select.value));
  select.classList.toggle('has-value', hasValue);
};

const persistLevelTwoProgress = () => {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return;
    }

    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    let progress = {};

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          progress = { ...parsed };
        }
      } catch (error) {
        console.warn('Existing progress could not be parsed.', error);
      }
    }

    progress.battleLevel = LEVEL_TWO_BATTLE_LEVEL;
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('Unable to update level progress for the new player.', error);
  }
};

const readTrimmedValue = (value) =>
  typeof value === 'string' ? value.trim() : '';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('.preloader__form');
  const emailField = document.getElementById('register-email');
  const passwordField = document.getElementById('register-password');
  const gradeField = document.getElementById('register-grade');
  const referralField = document.getElementById('register-referral');
  const submitButton = form?.querySelector('button[type="submit"]');
  const submitButtonLabel = submitButton?.querySelector(
    '.preloader__button-label'
  );
  const errorMessage = document.querySelector('[data-register-error]');
  const supabase = window.supabaseClient;

  const showError = (message) => {
    if (!errorMessage) {
      return;
    }
    errorMessage.textContent = message;
    setElementVisibility(errorMessage, Boolean(message));
  };

  const setLoading = (isLoading) => {
    setFieldState(emailField, isLoading);
    setFieldState(passwordField, isLoading);
    setFieldState(gradeField, isLoading);
    setFieldState(referralField, isLoading);
    if (submitButton) {
      submitButton.disabled = Boolean(isLoading);
      submitButton.classList.toggle('is-loading', Boolean(isLoading));
      submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      if (submitButtonLabel) {
        submitButtonLabel.textContent = isLoading ? '' : 'Register';
      }
    }
  };

  if (!form || !emailField || !passwordField || !gradeField || !referralField) {
    showError('The registration form could not be initialized.');
    return;
  }

  updateSelectPlaceholderState(gradeField);
  updateSelectPlaceholderState(referralField);

  gradeField.addEventListener('change', () => {
    updateSelectPlaceholderState(gradeField);
  });

  referralField.addEventListener('change', () => {
    updateSelectPlaceholderState(referralField);
  });

  if (!supabase) {
    showError('Registration service is unavailable. Please try again later.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Failed to fetch existing session', error);
    }
    if (data?.session) {
      clearGuestSessionFlag();
      window.location.replace('../index.html');
      return;
    }
  } catch (error) {
    console.warn('Session lookup failed', error);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');

    const email = readTrimmedValue(emailField.value);
    const password = passwordField.value;
    const gradeLevel = readTrimmedValue(gradeField.value);
    const referralSource = readTrimmedValue(referralField.value);

    if (!email || !password || !gradeLevel || !referralSource) {
      showError('Please complete all fields to register.');
      return;
    }

    if (!emailField.checkValidity()) {
      showError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            gradeLevel,
            referralSource,
          },
        },
      });

      if (error) {
        showError(error.message || 'Unable to register. Please try again.');
        setLoading(false);
        return;
      }

      const completeRegistration = () => {
        persistLevelTwoProgress();
        clearGuestSessionFlag();
        window.location.replace('../index.html');
      };

      if (data?.session) {
        completeRegistration();
        return;
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError || !signInData?.session) {
        showError(
          signInError?.message ||
            'Registration was successful, but we could not start your session automatically. Please sign in to continue.'
        );
        setLoading(false);
        return;
      }

      completeRegistration();
    } catch (error) {
      console.error('Unexpected error during registration', error);
      showError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });
});
