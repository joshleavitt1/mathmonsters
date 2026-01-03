(() => {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : {};

  const DIFFICULTY_RANGES = {
    // Intro difficulty should only use very small numbers to keep questions approachable.
    1: { min: 0, max: 5 },
    2: { min: 0, max: 20 },
    3: { min: 0, max: 50 },
    4: { min: 50, max: 100 },
    5: { min: 50, max: 200 },
  };

  const clampDifficulty = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return 1;
    }
    return Math.min(5, Math.max(1, Math.round(numericValue)));
  };

  const getRangeForDifficulty = (difficulty) => {
    const normalized = clampDifficulty(difficulty);
    return DIFFICULTY_RANGES[normalized] || DIFFICULTY_RANGES[1];
  };

  const randomInt = (min, max) => {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) {
      return 0;
    }
    return Math.floor(Math.random() * (high - low + 1)) + low;
  };

  const buildChoices = (answer, range) => {
    const options = new Set();
    options.add(answer);

    const spread = Math.max(3, Math.round((range.max - range.min) / 6));
    const cappedForIntro = range.max <= 5;
    const maxSum = cappedForIntro ? range.max : Math.max(range.max * 2, answer + spread);
    const minSum = cappedForIntro ? Math.max(0, range.min) : Math.min(range.min * 2, answer - spread);

    while (options.size < 4) {
      const delta = Math.max(1, randomInt(1, spread));
      const direction = Math.random() < 0.5 ? -1 : 1;
      let candidate = answer + direction * delta;
      candidate = Math.max(minSum, Math.min(maxSum, candidate));
      options.add(candidate);
    }

    const shuffled = Array.from(options);
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = randomInt(0, index);
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }

    return shuffled.map((value) => ({
      name: String(value),
      value,
      correct: value === answer,
    }));
  };

  const generateAdditionQuestion = (difficulty) => {
    const range = getRangeForDifficulty(difficulty);
    const first = randomInt(range.min, range.max);
    const maxSecond = range.max <= 5 ? Math.max(range.min, range.max - first) : range.max;
    const second = randomInt(range.min, maxSecond);
    const answer = first + second;
    const prompt = `What is ${first} + ${second}?`;
    const choices = buildChoices(answer, range);

    return {
      type: 'type1',
      question: prompt,
      answer,
      choices,
    };
  };

  globalScope.mathMonstersQuestionGenerator = {
    generateAdditionQuestion,
    clampDifficulty,
    difficultyRanges: { ...DIFFICULTY_RANGES },
  };
})();
