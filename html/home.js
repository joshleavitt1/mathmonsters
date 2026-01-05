import { loadProfile, saveProfile, clearProfile } from "../js/lib/storage.js";
import { loadProgression, getLevelData } from "../js/lib/progression.js";
import { preloadImages } from "../js/lib/preload.js";

const loader = document.getElementById("loader");
const app = document.getElementById("app");

const levelPill = document.getElementById("levelPill");
const heroNameEl = document.getElementById("heroName");
const heroSpriteEl = document.getElementById("heroSprite");
const xpFill = document.getElementById("xpFill");
const xpText = document.getElementById("xpText");

const battleBtn = document.getElementById("battleBtn");
const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
  clearProfile();
  window.location.href = "../index.html";
});

battleBtn.addEventListener("click", () => {
  window.location.href = "./battle.html";
});

function computeLevelFromXp(xp) {
  return Math.floor(xp / 10) + 1;
}

function xpProgress(xp) {
  return xp % 10;
}

async function init() {
  const profile = loadProfile();
  if (!profile) {
    window.location.href = "../index.html";
    return;
  }

  // Theme
  document.body.classList.remove("theme-blue", "theme-green");
  document.body.classList.add(profile.heroType === "green" ? "theme-green" : "theme-blue");

  try {
    const prog = await loadProgression();

    // Recompute level from XP
    const level = computeLevelFromXp(profile.xp);
    profile.level = level;

    // Apply progression (clamped)
    const levelData = getLevelData(prog, profile.heroType, level);

    profile.heroName = levelData.heroName;
    profile.heroSprite = levelData.heroSprite;
    profile.attackSprite = levelData.attackSprite;
    profile.attack = levelData.attack;
    profile.health = levelData.health;
    // profile.damage is battle-only; keep stored as 0
    profile.damage = 0;

    saveProfile(profile);

    // Preload hero assets for home
    await preloadImages([profile.heroSprite, profile.attackSprite]);

    // Render
    levelPill.textContent = `Level ${profile.level}`;
    heroNameEl.textContent = profile.heroName;

    const p = xpProgress(profile.xp);
    xpFill.style.width = `${(p / 10) * 100}%`;
    xpText.textContent = `${p} / 10`;

    heroSpriteEl.src = profile.heroSprite;

    loader.style.display = "none";
    app.hidden = false;
  } catch (err) {
    console.error(err);
    loader.querySelector(".loaderText").textContent = "Failed to load progression/assets.";
  }
}

init();
