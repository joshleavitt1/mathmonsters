const GUEST_SESSION_KEY = 'reefRangersGuestSession';

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

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('.preloader__form');
  const nameField = document.getElementById('register-name');
  const emailField = document.getElementById('register-email');
  const passwordField = document.getElementById('register-password');
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
    setFieldState(nameField, isLoading);
    setFieldState(emailField, isLoading);
    setFieldState(passwordField, isLoading);
    if (submitButton) {
      submitButton.disabled = Boolean(isLoading);
      submitButton.classList.toggle('is-loading', Boolean(isLoading));
      submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      if (submitButtonLabel) {
        submitButtonLabel.textContent = isLoading ? '' : 'Register';
      }
    }
  };

  if (!form || !nameField || !emailField || !passwordField) {
    showError('The registration form could not be initialized.');
    return;
  }

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
      window.location.replace('index.html');
      return;
    }
  } catch (error) {
    console.warn('Session lookup failed', error);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');

    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const password = passwordField.value;

    if (!name || !email || !password) {
      showError('Please complete all fields to register.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        showError(error.message || 'Unable to register. Please try again.');
        setLoading(false);
        return;
      }

      if (data?.session) {
        clearGuestSessionFlag();
        window.location.replace('index.html');
        return;
      }

      clearGuestSessionFlag();
      window.location.replace('signin.html');
    } catch (error) {
      console.error('Unexpected error during registration', error);
      showError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });
});
