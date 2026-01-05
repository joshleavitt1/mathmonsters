import { loadProfile } from "./js/lib/storage.js";

const continueBtn = document.getElementById("continueBtn");
const newGameBtn = document.getElementById("newGameBtn");

const profile = loadProfile();

if (profile) {
  continueBtn.style.display = "inline-block";
  newGameBtn.style.display = "inline-block"; // keep both available (your call)
} else {
  continueBtn.style.display = "none";
  newGameBtn.style.display = "inline-block";
}

continueBtn.addEventListener("click", () => {
  window.location.href = "./html/home.html";
});

newGameBtn.addEventListener("click", () => {
  window.location.href = "./html/newgame.html";
});
