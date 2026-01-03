const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const ACCOUNTS_STORAGE_KEY = 'mathmonstersAccounts';
const ACTIVE_ACCOUNT_STORAGE_KEY = 'mathmonstersActiveAccount';
const playerProfileUtils =
  (typeof globalThis !== 'undefined' && globalThis.mathMonstersPlayerProfile) ||
  (typeof window !== 'undefined' ? window.mathMonstersPlayerProfile : null);

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

const normalizeEmail = (value) => {
  if (typeof playerProfileUtils?.normalizeAccountEmail === 'function') {
    return playerProfileUtils.normalizeAccountEmail(value) || '';
  }

  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return trimmed;
};

const readStoredAccounts = () => {
  if (typeof playerProfileUtils?.readStoredAccounts === 'function') {
    return playerProfileUtils.readStoredAccounts() || [];
  }

  try {
    const raw = window.localStorage?.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to read stored accounts.', error);
    return [];
  }
};

const findAccountByEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }

  const accounts = readStoredAccounts();
  if (typeof playerProfileUtils?.findAccountByEmail === 'function') {
    return (
      playerProfileUtils.findAccountByEmail(accounts, normalized) || null
    );
  }

  return (
    accounts.find(
      (account) => normalizeEmail(account?.email) === normalized
    ) || null
  );
};

const writeCachedProfile = (profile) => {
  if (typeof playerProfileUtils?.writeCachedProfile === 'function') {
    playerProfileUtils.writeCachedProfile(profile);
    return;
  }

  try {
    const storage = window.sessionStorage;
    if (!storage) {
      return;
    }

    if (!profile || typeof profile !== 'object') {
      storage.removeItem(PLAYER_PROFILE_STORAGE_KEY);
      return;
    }

    storage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('Unable to cache player profile.', error);
  }
};

const persistActiveAccount = (account) => {
  const email = normalizeEmail(account?.email ?? account);
  if (!email) {
    return null;
  }

  if (typeof playerProfileUtils?.setActiveAccount === 'function') {
    return playerProfileUtils.setActiveAccount(account);
  }

  try {
    window.localStorage?.setItem(
      ACTIVE_ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        email,
        updatedAt: Date.now(),
      })
    );
  } catch (error) {
    console.warn('Unable to persist active account.', error);
  }

  return { email };
};

const readActiveAccount = () => {
  if (typeof playerProfileUtils?.getActiveAccount === 'function') {
    return playerProfileUtils.getActiveAccount();
  }

  try {
    const raw = window.localStorage?.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const email = normalizeEmail(parsed?.email);
    return email ? { email } : null;
  } catch (error) {
    console.warn('Unable to read active account session.', error);
    return null;
  }
};

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

  const existingAccount = readActiveAccount();
  if (existingAccount?.email) {
    clearGuestSessionFlag();
    window.location.replace('../index.html');
    return;
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
      const account = findAccountByEmail(email);
      if (!account) {
        renderErrors(
          'No account found for that email. Please register to get started.'
        );
        setLoading(false);
        return;
      }

      const storedPassword =
        typeof account.password === 'string' ? account.password : '';

      if (storedPassword !== password) {
        renderErrors('Incorrect email or password.');
        setLoading(false);
        return;
      }

      persistActiveAccount({
        email: account.email,
        accountLevel: account.accountLevel,
      });
      writeCachedProfile(
        account.playerData && typeof account.playerData === 'object'
          ? account.playerData
          : null
      );
      clearGuestSessionFlag();
      window.location.replace('../index.html');
    } catch (error) {
      console.error('Unexpected error during sign in', error);
      renderErrors('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });
});
