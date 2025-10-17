const GUEST_SESSION_KEY = 'mathmonstersGuestSession';
const PROGRESS_STORAGE_KEY = 'mathmonstersProgress';
const PLAYER_PROFILE_STORAGE_KEY = 'mathmonstersPlayerProfile';
const DEFAULT_PLAYER_DATA_PATH = '../data/player.json';
const STARTING_LEVEL = 1;
const STARTING_GEMS = 0;
const HOME_PAGE_PATH = '../index.html';
const HERO_APPEARANCE_BY_LEVEL = [
  Object.freeze({
    level: 1,
    sprite: 'images/hero/shellfin_evolution_1.png',
    attackSprite: 'images/hero/shellfin_attack_1.png',
  }),
  Object.freeze({
    level: 2,
    sprite: 'images/hero/shellfin_evolution_2.png',
    attackSprite: 'images/hero/shellfin_attack_2.png',
  }),
  Object.freeze({
    level: 7,
    sprite: 'images/hero/shellfin_evolution_3.png',
    attackSprite: 'images/hero/shellfin_attack_3.png',
  }),
  Object.freeze({
    level: 12,
    sprite: 'images/hero/shellfin_evolution_4.png',
    attackSprite: 'images/hero/shellfin_attack_4.png',
  }),
];

const DEFAULT_HERO_SPRITE = HERO_APPEARANCE_BY_LEVEL[0].sprite;
const DEFAULT_HERO_ATTACK_SPRITE = HERO_APPEARANCE_BY_LEVEL[0].attackSprite;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const clonePlainObject = (value) => {
  if (!isPlainObject(value)) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to clone player data object.', error);
    return null;
  }
};

const getHeroAppearanceForLevel = (level) => {
  const numericLevel = Number(level);
  if (!Number.isFinite(numericLevel)) {
    return HERO_APPEARANCE_BY_LEVEL[0];
  }

  let selectedAppearance = HERO_APPEARANCE_BY_LEVEL[0];
  for (const appearance of HERO_APPEARANCE_BY_LEVEL) {
    if (numericLevel >= appearance.level) {
      selectedAppearance = appearance;
    }
  }

  return selectedAppearance;
};

const isShellfinEvolutionSprite = (value) =>
  typeof value === 'string' &&
  /(\/?images\/hero\/shellfin_evolution_\d+\.png)(?=[?#]|$)/i.test(value.trim());

const isShellfinAttackSprite = (value) =>
  typeof value === 'string' &&
  /(\/?images\/hero\/shellfin_attack_\d+\.png)(?=[?#]|$)/i.test(value.trim());

const selectSpriteForLevel = (currentSprite, desiredSprite, fallbackSprite) => {
  const trimmed = typeof currentSprite === 'string' ? currentSprite.trim() : '';

  if (!trimmed) {
    return desiredSprite ?? fallbackSprite;
  }

  if (desiredSprite && trimmed !== desiredSprite && isShellfinEvolutionSprite(trimmed)) {
    return desiredSprite;
  }

  return trimmed || fallbackSprite;
};

const selectAttackSpriteForLevel = (currentSprite, desiredSprite, fallbackSprite) => {
  const trimmed = typeof currentSprite === 'string' ? currentSprite.trim() : '';

  if (!trimmed) {
    return desiredSprite ?? fallbackSprite;
  }

  if (desiredSprite && trimmed !== desiredSprite && isShellfinAttackSprite(trimmed)) {
    return desiredSprite;
  }

  return trimmed || fallbackSprite;
};

const cloneHeroForLevel = (hero, level) => {
  const clonedHero = clonePlainObject(hero) ?? {};
  const { sprite: desiredSprite, attackSprite: desiredAttackSprite } =
    getHeroAppearanceForLevel(level);

  return {
    ...clonedHero,
    sprite: selectSpriteForLevel(clonedHero.sprite, desiredSprite, DEFAULT_HERO_SPRITE),
    attackSprite: selectAttackSpriteForLevel(
      clonedHero.attackSprite,
      desiredAttackSprite,
      DEFAULT_HERO_ATTACK_SPRITE,
    ),
  };
};

const applyStartingGems = (playerData) => {
  if (!isPlainObject(playerData)) {
    return playerData;
  }

  if (Object.prototype.hasOwnProperty.call(playerData, 'gemsAwarded')) {
    delete playerData.gemsAwarded;
  }

  playerData.gems = STARTING_GEMS;

  const progressSection = isPlainObject(playerData.progress)
    ? playerData.progress
    : (playerData.progress = {});

  if (Object.prototype.hasOwnProperty.call(progressSection, 'gemsAwarded')) {
    delete progressSection.gemsAwarded;
  }

  progressSection.gems = STARTING_GEMS;

  return playerData;
};

const extractPlayerData = (rawPlayerData) => {
  if (!isPlainObject(rawPlayerData)) {
    return null;
  }

  const nestedPlayer = rawPlayerData.player;
  if (isPlainObject(nestedPlayer)) {
    return nestedPlayer;
  }

  return rawPlayerData;
};

const applyStartingCurrentLevel = (playerData) => {
  const clonedData = clonePlainObject(playerData);
  const baseHeroSource = isPlainObject(clonedData)
    ? clonedData.hero
    : isPlainObject(playerData)
    ? playerData.hero
    : null;
  const heroForStartingLevel = cloneHeroForLevel(baseHeroSource, STARTING_LEVEL);
  const heroForLevelOne = cloneHeroForLevel(baseHeroSource, 1);

  if (!isPlainObject(clonedData)) {
    const startingHero = cloneHeroForLevel(heroForStartingLevel, STARTING_LEVEL);
    const levelEntries = {
      1: {
        hero: cloneHeroForLevel(heroForLevelOne, 1),
      },
    };

    if (STARTING_LEVEL !== 1) {
      levelEntries[STARTING_LEVEL] = {
        hero: cloneHeroForLevel(startingHero, STARTING_LEVEL),
      };
    }

    const seededPlayer = applyStartingGems({
      hero: startingHero,
      progress: {
        currentLevel: STARTING_LEVEL,
      },
      battleVariables: {
        timeRemainingSeconds: null,
      },
      currentLevel: levelEntries,
    });

    if (isPlainObject(seededPlayer?.progress)) {
      seededPlayer.progress.currentLevel = STARTING_LEVEL;
    }

    return seededPlayer;
  }

  clonedData.hero = cloneHeroForLevel(heroForStartingLevel, STARTING_LEVEL);

  const progressSection = isPlainObject(clonedData.progress)
    ? clonedData.progress
    : {};

  clonedData.progress = {
    ...progressSection,
    currentLevel: STARTING_LEVEL,
  };

  applyStartingGems(clonedData);

  if (!isPlainObject(clonedData.battleVariables)) {
    clonedData.battleVariables = {
      timeRemainingSeconds: null,
    };
  }

  if (!isPlainObject(clonedData.currentLevel)) {
    clonedData.currentLevel = {};
  }

  const ensureLevelHero = (levelKey) => {
    const levelEntry = isPlainObject(clonedData.currentLevel[levelKey])
      ? clonedData.currentLevel[levelKey]
      : (clonedData.currentLevel[levelKey] = {});
    const numericLevel = Number(levelKey);
    const appearanceLevel = Number.isFinite(numericLevel) ? numericLevel : undefined;
    const fallbackHero =
      Number.isFinite(appearanceLevel) && appearanceLevel > 1
        ? heroForStartingLevel
        : heroForLevelOne;
    levelEntry.hero = cloneHeroForLevel(
      levelEntry.hero ?? fallbackHero,
      appearanceLevel,
    );
  };

  ensureLevelHero(1);
  if (STARTING_LEVEL !== 1) {
    ensureLevelHero(STARTING_LEVEL);
  }

  return clonedData;
};

const loadDefaultPlayerData = async () => {
  const fetchFn =
    typeof window !== 'undefined' && typeof window.fetch === 'function'
      ? window.fetch.bind(window)
      : typeof fetch === 'function'
      ? fetch
      : null;

  if (!fetchFn) {
    return null;
  }

  try {
    const response = await fetchFn(DEFAULT_PLAYER_DATA_PATH, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response?.ok) {
      throw new Error(`Request failed with status ${response?.status ?? 'unknown'}`);
    }

    const data = await response.json();
    const extracted = extractPlayerData(data);
    return clonePlainObject(extracted ?? {});
  } catch (error) {
    console.warn('Unable to load default player data for the new account.', error);
    return null;
  }
};

const storePlayerDataForAccount = async (supabase, userId, playerData) => {
  if (!supabase?.from || !userId || !isPlainObject(playerData)) {
    return false;
  }

  const payload = clonePlainObject(playerData);
  if (!payload) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('player_profiles')
      .upsert({ id: userId, player_data: payload }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase rejected the request to persist player data.', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Unable to persist player data for the new account.', error);
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

const clearStoredPlayerProfile = () => {
  try {
    window.sessionStorage?.removeItem(PLAYER_PROFILE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear stored player profile cache.', error);
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
  const emailField = document.getElementById('register-email');
  const passwordField = document.getElementById('register-password');
  const submitButton = form?.querySelector('button[type="submit"]');
  const submitButtonLabel = submitButton?.querySelector(
    '.preloader__button-label'
  );
  const errorContainer = document.querySelector('[data-register-errors]');
  const errorList = document.querySelector('[data-register-error-list]');
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
        submitButtonLabel.textContent = isLoading ? '' : 'Register';
      }
    }
  };

  if (!form || !emailField || !passwordField) {
    renderErrors('The registration form could not be initialized.');
    return;
  }

  if (!supabase) {
    renderErrors('Registration service is unavailable. Please try again later.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Failed to fetch existing session', error);
    }
    if (data?.session) {
      clearGuestSessionFlag();
      window.location.replace(HOME_PAGE_PATH);
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
      validationErrors.push('Enter a valid email address.');
    }

    if (!password) {
      validationErrors.push('Create a password.');
    } else if (password.length < 6) {
      validationErrors.push('Password must be at least 6 characters long.');
    }

    if (validationErrors.length > 0) {
      renderErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const defaultPlayerData = await loadDefaultPlayerData();
      const startingPlayerData = applyStartingCurrentLevel(defaultPlayerData);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            accountLevel: STARTING_LEVEL,
            playerData: startingPlayerData,
          },
        },
      });

      if (error) {
        renderErrors(error.message || 'Unable to register. Please try again.');
        setLoading(false);
        return;
      }

      let latestUser = data?.user ?? null;
      const persistStartingPlayerData = startingPlayerData;

      const completeRegistration = async (sessionUser) => {
        const user = sessionUser ?? latestUser;
        if (user?.id && persistStartingPlayerData) {
          await storePlayerDataForAccount(
            supabase,
            user.id,
            persistStartingPlayerData
          );
        }
        try {
          await supabase.auth.updateUser({
            data: { accountLevel: STARTING_LEVEL },
          });
        } catch (error) {
          console.warn(
            'Unable to update the account level metadata for the new player.',
            error
          );
        }
        try {
          window.localStorage?.removeItem(PROGRESS_STORAGE_KEY);
        } catch (error) {
          console.warn('Unable to clear stored battle progress for the new player.', error);
        }
        clearStoredPlayerProfile();
        clearGuestSessionFlag();
        window.location.replace(HOME_PAGE_PATH);
      };

      if (data?.session) {
        await completeRegistration(data.user ?? null);
        return;
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInData?.user) {
        latestUser = signInData.user;
      }

      if (signInError || !signInData?.session) {
        renderErrors(
          signInError?.message ||
            'Registration was successful, but we could not start your session automatically. Please sign in to continue.'
        );
        setLoading(false);
        return;
      }

      await completeRegistration(signInData.user ?? null);
    } catch (error) {
      console.error('Unexpected error during registration', error);
      renderErrors('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });
});
