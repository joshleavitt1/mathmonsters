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
  const emailField = document.getElementById('signin-email');
  const passwordField = document.getElementById('signin-password');
  const submitButton = form?.querySelector('button[type="submit"]');
  const errorMessage = document.querySelector('[data-signin-error]');
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
    if (submitButton) {
      submitButton.disabled = Boolean(isLoading);
      submitButton.textContent = isLoading ? 'Signing In…' : 'Sign In';
    }
  };

  if (!form || !emailField || !passwordField) {
    showError('The sign in form could not be initialized.');
    return;
  }

  if (!supabase) {
    showError('Authentication service is unavailable. Please try again later.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Failed to fetch existing session', error);
    }
    if (data?.session) {
      window.location.replace('index.html');
      return;
    }
  } catch (error) {
    console.warn('Session lookup failed', error);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');

    const email = emailField.value.trim();
    const password = passwordField.value;

    if (!email || !password) {
      showError('Please provide both an email and password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showError(error.message || 'Unable to sign in. Please try again.');
        setLoading(false);
        return;
      }

      window.location.replace('index.html');
    } catch (error) {
      console.error('Unexpected error during sign in', error);
      showError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });
});
