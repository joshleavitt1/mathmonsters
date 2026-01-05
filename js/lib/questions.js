const QUESTIONS_URL = new URL("../../data/questions.json", import.meta.url);

export async function loadQuestions() {
  const res = await fetch(QUESTIONS_URL);
  if (!res.ok) throw new Error(`Failed to fetch questions.json (${res.status})`);
  return res.json();
}

/**
 * Expected questions.json structure (minimal):
 * {
 *   "byGrade": {
 *     "2": { "byDifficulty": { "1": [ {a:1,b:2}, ... ], "2": [...] } },
 *     "3": { "byDifficulty": { "1": [ ... ] } }
 *   }
 * }
 */
export function getQuestion(questions, grade, difficulty) {
  const g = questions?.byGrade?.[String(grade)];
  if (!g) throw new Error(`No questions for grade ${grade}`);

  const byDiff = g.byDifficulty;
  if (!byDiff) throw new Error(`Missing byDifficulty for grade ${grade}`);

  // Find best bucket: exact difficulty else nearest <= difficulty else smallest available
  const diffs = Object.keys(byDiff).map(Number).filter(n => Number.isFinite(n)).sort((a,b)=>a-b);
  if (diffs.length === 0) throw new Error(`No difficulty buckets for grade ${grade}`);

  let chosen = diffs.filter(d => d <= difficulty).pop();
  if (chosen == null) chosen = diffs[0];

  const pool = byDiff[String(chosen)];
  if (!Array.isArray(pool) || pool.length === 0) throw new Error(`Empty question pool for grade ${grade} difficulty ${chosen}`);

  // Pool item: {a,b} meaning a+b
  const item = pool[Math.floor(Math.random() * pool.length)];
  const a = Number(item.a);
  const b = Number(item.b);
  const answer = a + b;

  // Generate 3 plausible distractors
  const choicesSet = new Set([answer]);
  while (choicesSet.size < 4) {
    const offset = Math.floor(Math.random() * 7) - 3; // -3..+3
    const v = Math.max(0, answer + offset + (Math.random() < 0.35 ? (Math.random() < 0.5 ? -5 : 5) : 0));
    choicesSet.add(v);
  }
  const choices = Array.from(choicesSet);

  // Shuffle choices
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  const answerIndex = choices.indexOf(answer);

  return {
    prompt: `${a} + ${b} = ?`,
    choices,
    answerIndex
  };
}
