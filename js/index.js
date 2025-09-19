const LANDING_VISITED_KEY = 'reefRangersVisitedLanding';

const VISITED_VALUE = 'true';
const PROGRESS_STORAGE_KEY = 'reefRangersProgress';
const MIN_PRELOAD_DURATION_MS = 2000;
const BATTLE_INTRO_DELAY_MS = 2000;
const BATTLE_INTRO_VISIBLE_DURATION_MS = 2000;

// Gentle idle motion caps (pixels)
const HERO_FLOAT_MIN_PX = 5;   // tiny but visible
const HERO_FLOAT_MAX_PX = 7;  // prevents big bobbing

const redirectToSignIn = () => {
  window.location.replace('signin.html');
};

const ensureAuthenticated = async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    redirectToSignIn();
    return false;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Authentication session lookup failed', error);
    }

    if (!data?.session) {
      redirectToSignIn();
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Unexpected authentication error', error);
    redirectToSignIn();
    return false;
  }
};

const startLandingExperience = () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapLanding);
  } else {
    bootstrapLanding();
  }
};

const runBattleIntroSequence = () => {
  const intro = document.querySelector('[data-battle-intro]');
  if (!intro) {
    return Promise.resolve(false);
  }

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  intro.classList.toggle('is-reduced-motion', prefersReducedMotion);
  intro.classList.remove('is-visible');
  intro.setAttribute('aria-hidden', 'true');

  return new Promise((resolve) => {
    window.setTimeout(() => {
      intro.classList.add('is-visible');
      intro.setAttribute('aria-hidden', 'false');

      window.setTimeout(() => resolve(true), BATTLE_INTRO_VISIBLE_DURATION_MS);
    }, BATTLE_INTRO_DELAY_MS);
  });
};

(async () => {
  const isAuthenticated = await ensureAuthenticated();
  if (isAuthenticated) {
    startLandingExperience();
  }
})();

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const sanitizeAssetPath = (path) => {
  if (typeof path !== 'string') {
    return null;
  }
  let trimmed = path.trim();
  if (!trimmed || trimmed.startsWith('data:')) {
    return null;
  }
  while (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    if (trimmed.startsWith('./')) {
      trimmed = trimmed.slice(2);
    } else if (trimmed.startsWith('../')) {
      trimmed = trimmed.slice(3);
    }
  }
  return trimmed;
};

const mergeVariablesWithProgress = (rawVariablesData) => {
  const variables =
    rawVariablesData && typeof rawVariablesData === 'object'
      ? { ...rawVariablesData }
      : {};

  const storedProgress = readStoredProgress();

  if (storedProgress && typeof storedProgress === 'object') {
    const baseProgress =
      rawVariablesData && typeof rawVariablesData.progress === 'object'
        ? rawVariablesData.progress
        : {};
    const mergedProgress = { ...baseProgress };

    if (typeof storedProgress.battleLevel === 'number') {
      mergedProgress.battleLevel = storedProgress.battleLevel;
    }

    if (typeof storedProgress.currentExperience === 'number') {
      mergedProgress.currentExperience = storedProgress.currentExperience;
    }

    variables.progress = mergedProgress;
  } else if (
    rawVariablesData &&
    typeof rawVariablesData.progress === 'object' &&
    !variables.progress
  ) {
    variables.progress = { ...rawVariablesData.progress };
  }

  return variables;
};

const determineBattlePreview = (levelsData, variablesData) => {
  const levels = Array.isArray(levelsData?.levels) ? levelsData.levels : [];
  const variables = mergeVariablesWithProgress(variablesData);

  if (!levels.length) {
    return { levels, variables, preview: null };
  }

  const progressLevel = variables?.progress?.battleLevel;
  const activeLevel =
    levels.find((level) => level?.battleLevel === progressLevel) ?? levels[0];

  if (!activeLevel) {
    return { levels, variables, preview: null };
  }

  const userBattles = Array.isArray(variables?.user?.battles)
    ? variables.user.battles
    : [];

  const findUserBattle = (level) => {
    if (typeof level !== 'number') {
      return null;
    }
    return (
      userBattles.find(
        (entry) => typeof entry?.battleLevel === 'number' && entry.battleLevel === level
      ) ?? null
    );
  };

  const activeUserBattle =
    findUserBattle(activeLevel?.battleLevel) ?? userBattles[0] ?? null;

  const levelHero = activeLevel?.battle?.hero ?? {};
  const heroData = {
    ...levelHero,
    ...(activeUserBattle?.hero ?? {}),
  };

  const heroSprite =
    typeof heroData?.sprite === 'string' ? heroData.sprite.trim() : '';
  const heroName = typeof heroData?.name === 'string' ? heroData.name.trim() : '';
  const heroAlt = heroName ? `${heroName} ready for battle` : 'Hero ready for battle';

  const battle = activeLevel?.battle ?? {};
  const mathLabelSource =
    typeof activeLevel.mathType === 'string'
      ? activeLevel.mathType
      : typeof battle?.mathType === 'string'
      ? battle.mathType
      : 'Math Mission';
  const mathLabel = mathLabelSource.trim() || 'Math Mission';

  const enemyData = battle?.enemy ?? {};
  const enemySprite =
    typeof enemyData?.sprite === 'string' ? enemyData.sprite.trim() : '';
  const enemyName =
    typeof enemyData?.name === 'string' ? enemyData.name.trim() : '';
  const enemyAlt = enemyName ? `${enemyName} ready for battle` : 'Enemy ready for battle';

  const levelName = typeof activeLevel?.name === 'string' ? activeLevel.name.trim() : '';
  const battleTitleLabel =
    levelName ||
    (typeof activeLevel?.battleLevel === 'number'
      ? `Battle ${activeLevel.battleLevel}`
      : 'Upcoming Battle');

  const totalExperienceRaw = Number(activeLevel?.totalExperience);
  const totalExperience = Number.isFinite(totalExperienceRaw)
    ? Math.max(0, Math.round(totalExperienceRaw))
    : 0;
  const currentExperienceRaw = Number(variables?.progress?.currentExperience);
  const currentExperience = Number.isFinite(currentExperienceRaw)
    ? Math.max(0, Math.round(currentExperienceRaw))
    : 0;
  const progressRatio =
    totalExperience > 0
      ? Math.min(Math.max(currentExperience / totalExperience, 0), 1)
      : 0;
  const experienceText = `${Math.min(currentExperience, totalExperience)} of ${totalExperience}`;

  return {
    levels,
    variables,
    preview: {
      activeLevel,
      battleLevel: activeLevel?.battleLevel ?? null,
      mathLabel,
      battleTitleLabel,
      hero: { ...heroData, sprite: heroSprite },
      heroAlt,
      enemy: { ...enemyData, sprite: enemySprite },
      enemyAlt,
      progressExperience: progressRatio,
      progressExperienceText: experienceText,
    },
  };
};

const updateHeroFloat = () => {
  const heroImage = document.querySelector('.hero');
  const battleCard = document.querySelector('[data-battle-card]');

  if (!heroImage || !battleCard) return;

  const applyLayout = () => {
    const cardRect = battleCard.getBoundingClientRect();
    const heroRect = heroImage.getBoundingClientRect();

    const availableSpace = cardRect.top - heroRect.height;
    const clampedSpace = Math.max(0, availableSpace);

    const rawRange = clampedSpace / 2;
    const floatRange = Math.min(
      HERO_FLOAT_MAX_PX,
      Math.max(HERO_FLOAT_MIN_PX, rawRange)
    );

    const topOffset = Math.max(0, Math.min(clampedSpace, 24));

    heroImage.style.setProperty('--hero-top', `${topOffset}px`);
    heroImage.style.setProperty('--hero-float-range', `${floatRange}px`);
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(applyLayout);
  } else {
    applyLayout();
  }
};

// … everything else stays the same below …
