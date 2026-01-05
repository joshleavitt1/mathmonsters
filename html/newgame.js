import { saveProfile } from "../js/lib/storage.js";
import { loadProgression, getLevelData } from "../js/lib/progression.js";

const form = document.getElementById("form");
const backBtn = document.getElementById("backBtn");
const errorEl = document.getElementById("error");

backBtn.addEventListener("click", () => {
  window.location.href = "../index.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const playerName = document.getElementById("playerName").value.trim();
  const playerGrade = Number(document.getElementById("playerGrade").value);
  const heroType = document.getElementById("heroType").value;

  if (!playerName) {
    errorEl.textContent = "Please enter a player name.";
    return;
  }

  try {
    const prog = await loadProgression();
    const levelData = getLevelData(prog, heroType, 1);

    const profile = {
      playerName,
      playerGrade,
      xp: 0,
      level: 1,
      difficulty: 1,
      heroType,

      heroName: levelData.heroName,
      heroSprite: levelData.heroSprite,
      attackSprite: levelData.attackSprite,
      attack: levelData.attack,
      health: levelData.health,
      damage: 0
    };

    saveProfile(profile);
    window.location.href = "./battle.html?new=1";
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Could not start a new game. Check progression.json paths.";
  }
});
