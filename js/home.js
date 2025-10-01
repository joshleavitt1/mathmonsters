const GUEST_SESSION_KEY = 'mathmonstersGuestSession';

const redirectToWelcome = () => {
  window.location.replace('welcome.html');
};

const clearGuestMode = () => {
  try {
    window.localStorage?.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear guest session.', error);
  }
};

const setElementDisabled = (element, disabled) => {
  if (!element) {
    return;
  }

  const shouldDisable = Boolean(disabled);

  if (shouldDisable) {
    element.setAttribute('aria-disabled', 'true');
    if (!element.hasAttribute('data-previous-tabindex')) {
      const current = element.getAttribute('tabindex');
      if (current !== null) {
        element.setAttribute('data-previous-tabindex', current);
      }
    }
    element.setAttribute('tabindex', '-1');
    return;
  }

  element.removeAttribute('aria-disabled');
  if (element.hasAttribute('data-previous-tabindex')) {
    const previous = element.getAttribute('data-previous-tabindex');
    if (previous) {
      element.setAttribute('tabindex', previous);
    } else {
      element.removeAttribute('tabindex');
    }
    element.removeAttribute('data-previous-tabindex');
    return;
  }

  const initialTabIndex = element.getAttribute('data-initial-tabindex');
  if (initialTabIndex !== null) {
    element.setAttribute('tabindex', initialTabIndex || '0');
  } else if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }
};

const isElementDisabled = (element) =>
  element ? element.getAttribute('aria-disabled') === 'true' : false;

const attachInteractiveHandler = (element, handler) => {
  if (!element || typeof handler !== 'function') {
    return;
  }

  const handleClick = (event) => {
    if (isElementDisabled(element)) {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }
      return;
    }
    handler(event);
  };

  element.addEventListener('click', handleClick);
  element.addEventListener('keydown', (event) => {
    if (isElementDisabled(element)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  });
};

const logoutAndRedirect = async () => {
  const supabase = window.supabaseClient;
  if (supabase?.auth?.signOut) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Failed to sign out user.', error);
      }
    } catch (error) {
      console.warn('Unexpected error during sign out.', error);
    }
  }

  clearGuestMode();
  redirectToWelcome();
};

const setupHomeLogout = () => {
  const logoutTrigger = document.querySelector('[data-settings-logout]');
  if (!logoutTrigger) {
    return;
  }

  if (logoutTrigger.dataset.logoutBound === 'true') {
    return;
  }
  logoutTrigger.dataset.logoutBound = 'true';

  const handleLogout = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (isElementDisabled(logoutTrigger)) {
      return;
    }

    setElementDisabled(logoutTrigger, true);
    logoutTrigger.setAttribute('aria-busy', 'true');

    await logoutAndRedirect();
  };

  attachInteractiveHandler(logoutTrigger, handleLogout);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHomeLogout);
} else {
  setupHomeLogout();
}
