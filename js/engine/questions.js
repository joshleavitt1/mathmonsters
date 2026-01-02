(() => {
  const DEFAULT_SKILL = 'math.addition';
  const GRADE_RANGES = {
    2: { min: 0, max: 20 },
    3: { min: 0, max: 50 },
  };

  const clampDifficulty = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 1;
    }
    return Math.min(5, Math.max(1, Math.round(numeric)));
  };

  const clampGrade = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 2;
    }
    return Math.min(3, Math.max(2, Math.round(numeric)));
  };

  const randomInt = (min, max) => {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    return Math.floor(Math.random() * (high - low + 1)) + low;
  };

  const getRangeForDifficulty = (grade, difficulty) => {
    const band = GRADE_RANGES[clampGrade(grade)] ?? GRADE_RANGES[2];
    const min = band.min ?? 0;
    const max = band.max ?? min;
    const span = Math.max(0, max - min);
    const difficultyRatio = clampDifficulty(difficulty) / 5;
    const cappedSpan = Math.max(5, Math.round(span * difficultyRatio));
    return {
      min,
      max: min + cappedSpan,
    };
  };

  const buildChoices = (answer) => {
    const correctValue = Number(answer);
    const set = new Set();
    set.add(correctValue);

    const offsets = [-3, -2, -1, 1, 2, 3, 4, 5];
    while (set.size < 4 && offsets.length > 0) {
      const offset = offsets.splice(randomInt(0, offsets.length - 1), 1)[0];
      set.add(Math.max(0, correctValue + offset));
    }

    while (set.size < 4) {
      set.add(Math.max(0, randomInt(correctValue - 5, correctValue + 5)));
    }

    const choices = Array.from(set).map((value) => ({
      name: String(value),
      correct: value === correctValue,
    }));

    choices.sort(() => Math.random() - 0.5);
    return choices;
  };

  const generateAdditionQuestion = ({ grade = 2, difficulty = 1 } = {}) => {
    const range = getRangeForDifficulty(grade, difficulty);
    const a = randomInt(range.min, range.max);
    const b = randomInt(range.min, range.max);
    const answer = a + b;

    return {
      id: Date.now() + Math.random(),
      type: DEFAULT_SKILL,
      question: `${a} + ${b} = ?`,
      answer,
      choices: buildChoices(answer),
      difficulty: clampDifficulty(difficulty),
      grade: clampGrade(grade),
    };
  };

  const api = Object.freeze({
    DEFAULT_SKILL,
    clampDifficulty,
    clampGrade,
    generateQuestion: ({ skill = DEFAULT_SKILL, grade = 2, difficulty = 1 } = {}) => {
      if (skill === DEFAULT_SKILL) {
        return generateAdditionQuestion({ grade, difficulty });
      }
      return generateAdditionQuestion({ grade, difficulty });
    },
    getRangeForDifficulty,
  });

  if (typeof globalThis !== 'undefined') {
    globalThis.mathMonstersQuestions = api;
  } else if (typeof window !== 'undefined') {
    window.mathMonstersQuestions = api;
  }
})();
