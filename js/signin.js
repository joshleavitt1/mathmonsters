const GUEST_SESSION_KEY = 'mathmonstersGuestSession';

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

const readTrimmedValue = (value) =>
  typeof value === 'string' ? value.trim() : '';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('.preloader__form');
  const emailField = document.getElementById('signin-email');
  const passwordField = document.getElementById('signin-password');
  const submitButton = form?.querySelector('button[type="submit"]');
  const submitButtonLabel = submitButton?.querySelector(
    '.preloader__button-label'
  );
  const errorContainer = document.querySelector('[data-signin-errors]');
  const errorList = document.querySelector('[data-signin-error-list]');
  const supabase = window.supabaseClient;

  const renderErrors = (messages) => {
    if (!errorContainer || !errorList) {
      return;
    }

    const normalizedMessages = Array.isArray(messages)
      ? messages.filter((message) => typeof message === 'string' && message.trim())
      : typeof messages === 'string' && messages.trim()
      ? [messages.trim()]
      : [];

    errorList.innerHTML = '';

    for (const message of normalizedMessages) {
      const listItem = document.createElement('li');
      listItem.textContent = message;
      errorList.appendChild(listItem);
    }

    setElementVisibility(errorContainer, normalizedMessages.length > 0);
  };

  const setLoading = (isLoading) => {
    setFieldState(emailField, isLoading);
    setFieldState(passwordField, isLoading);
    if (submitButton) {
      submitButton.disabled = Boolean(isLoading);
      submitButton.classList.toggle('is-loading', Boolean(isLoading));
      submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      if (submitButtonLabel) {
        submitButtonLabel.textContent = isLoading ? '' : 'Sign In';
      }
    }
  };

  if (!form || !emailField || !passwordField) {
    renderErrors('The sign in form could not be initialized.');
    return;
  }

  if (!supabase) {
    renderErrors('Authentication service is unavailable. Please try again later.');
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
    renderErrors([]);

    const email = readTrimmedValue(emailField.value);
    const password = passwordField.value;

    const validationErrors = [];

    if (!email) {
      validationErrors.push('Enter your email address.');
    } else if (!emailField.checkValidity()) {
      validationErrors.push('Enter valid email address.');
    }

    if (!password) {
      validationErrors.push('Enter your password.');
    }

    if (validationErrors.length > 0) {
      renderErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        renderErrors(error.message || 'Unable to sign in. Please try again.');
        setLoading(false);
        return;
      }

      clearGuestSessionFlag();
      window.location.replace('../index.html');
    } catch (error) {
      console.error('Unexpected error during sign in', error);
      renderErrors('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });
});
