import { loadProfile, saveProfile } from "../js/lib/storage.js";
import { loadProgression, getRandomMonster } from "../js/lib/progression.js";
import { loadQuestions, getQuestion } from "../js/lib/questions.js";
import { preloadImages } from "../js/lib/preload.js";
import { clamp, nowMs } from "../js/lib/utils.js";

const MAX_DIFFICULTY = 10;
const STREAK_FOR_DIFFICULTY_UP = 3;
const SPEED_THRESHOLD_MS = 6000; // tweakable

const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const app = document.getElementById("app");

const homeBtn = document.getElementById("homeBtn");
const diffPill = document.getElementById("diffPill");

const heroNameEl = document.getElementById("heroName");
const heroHpFill = document.getElementById("heroHpFill");
const heroHpText = document.getElementById("heroHpText");
const heroSpriteEl = document.getElementById("heroSprite");

const monsterNameEl = document.getElementById("monsterName");
const monsterHpFill = document.getElementById("monsterHpFill");
const monsterHpText = document.getElementById("monsterHpText");
const monsterSpriteEl = document.getElementById("monsterSprite");

const messageEl = document.getElementById("message");
const promptEl = document.getElementById("prompt");
const choicesEl = document.getElementById("choices");

const endPanel = document.getElementById("endPanel");
const endTitle = document.getElementById("endTitle");
const replayBtn = document.getElementById("replayBtn");

homeBtn.addEventListener("click", () => {
  window.location.href = "./home.html";
});

let prog = null;
let questions = null;

let profile = null;
let hero = null;
let monster = null;

let streakCorrect = 0;
let answerTimes = []; // store last few answer durations
let questionStartMs = 0;

function resetBattleState() {
  hero = { ...profile, damage: 0 };
  const mCfg = getRandomMonster(prog, profile.heroType);
  monster = {
    name: mCfg.name,
    sprite: mCfg.sprite,
    attackSprite: mCfg.attackSprite,
    attack: hero.attack,
    health: hero.health,
    damage: 0
  };

  streakCorrect = 0;
  answerTimes = [];
  endPanel.hidden = true;
}

function hpRemaining(entity) {
  return clamp(entity.health - entity.damage, 0, entity.health);
}

function renderStats() {
  diffPill.textContent = `Difficulty ${profile.difficulty}`;

  heroNameEl.textContent = profile.heroName;
  heroSpriteEl.src = profile.heroSprite;

  monsterNameEl.textContent = monster.name;
  monsterSpriteEl.src = monster.sprite;

  const heroRem = hpRemaining(hero);
  heroHpFill.style.width = `${(heroRem / hero.health) * 100}%`;
  heroHpText.textContent = `${heroRem}/${hero.health}`;

  const monRem = hpRemaining(monster);
  monsterHpFill.style.width = `${(monRem / monster.health) * 100}%`;
  monsterHpText.textContent = `${monRem}/${monster.health}`;
}

function disableChoices(disabled) {
  const btns = choicesEl.querySelectorAll("button");
  btns.forEach(b => b.disabled = disabled);
}

function showEnd(loss) {
  endPanel.hidden = false;
  endTitle.textContent = loss ? "You lost. Try again!" : "You win!";
  disableChoices(true);
}

function avgAnswerTime() {
  if (answerTimes.length === 0) return Infinity;
  const sum = answerTimes.reduce((a, b) => a + b, 0);
  return sum / answerTimes.length;
}

function maybeIncreaseDifficulty() {
  if (streakCorrect >= STREAK_FOR_DIFFICULTY_UP && avgAnswerTime() <= SPEED_THRESHOLD_MS) {
    profile.difficulty = clamp(profile.difficulty + 1, 1, MAX_DIFFICULTY);
    streakCorrect = 0; // reset after bump (strict)
    saveProfile(profile);
  }
}

function checkEnd() {
  if (monster.damage >= monster.health) {
    // WIN
    profile.xp += 1;
    saveProfile(profile);
    window.location.href = "./home.html";
    return true;
  }
  if (hero.damage >= hero.health) {
    // LOSE
    saveProfile(profile); // persist difficulty bumps
    showEnd(true);
    messageEl.textContent = "Defeat!";
    return true;
  }
  return false;
}

function playHit(isHeroAttacking) {
  // Minimal feedback: shake target sprite
  const target = isHeroAttacking ? monsterSpriteEl : heroSpriteEl;
  target.animate(
    [
      { transform: "translate(0,0)" },
      { transform: "translate(-6px,0)" },
      { transform: "translate(6px,0)" },
      { transform: "translate(0,0)" }
    ],
    { duration: 240, easing: "ease-out" }
  );
}

function nextQuestion() {
  const q = getQuestion(questions, profile.playerGrade, profile.difficulty);
  promptEl.textContent = q.prompt;
  choicesEl.innerHTML = "";

  q.choices.forEach((choiceValue, idx) => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";
    btn.textContent = String(choiceValue);
    btn.addEventListener("click", async () => {
      disableChoices(true);

      const duration = nowMs() - questionStartMs;
      answerTimes.push(duration);
      if (answerTimes.length > 5) answerTimes.shift();

      const correct = idx === q.answerIndex;

      if (correct) {
        monster.damage += 1;
        streakCorrect += 1;
        messageEl.textContent = "Correct! Attack!";
        playHit(true);
        maybeIncreaseDifficulty();
      } else {
        hero.damage += 1;
        streakCorrect = 0;
        messageEl.textContent = "Incorrect! You got hit!";
        playHit(false);
      }

      renderStats();

      if (!checkEnd()) {
        // small pause before next
        setTimeout(() => {
          disableChoices(false);
          questionStartMs = nowMs();
          nextQuestion();
        }, 420);
      }
    });

    choicesEl.appendChild(btn);
  });

  disableChoices(false);
  questionStartMs = nowMs();
}

replayBtn.addEventListener("click", async () => {
  resetBattleState();
  renderStats();
  messageEl.textContent = "Try again!";
  questionStartMs = nowMs();
  nextQuestion();
});

async function init() {
  profile = loadProfile();
  if (!profile) {
    window.location.href = "../index.html";
    return;
  }

  try {
    loaderText.textContent = "Loading battle config…";
    prog = await loadProgression();
    questions = await loadQuestions();

    resetBattleState();

    loaderText.textContent = "Preloading sprites…";
    await preloadImages([
      profile.heroSprite,
      profile.attackSprite,
      monster.sprite,
      monster.attackSprite
    ]);

    renderStats();

    loader.style.display = "none";
    app.hidden = false;

    messageEl.textContent = "Answer to attack!";
    nextQuestion();
  } catch (err) {
    console.error(err);
    loaderText.textContent = "Failed to load battle files. Check JSON paths.";
  }
}

init();
