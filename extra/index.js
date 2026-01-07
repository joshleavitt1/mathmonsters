/* index.js — FULL SWAP-IN */
/* Math Monsters — MVP Single-Page App (no frameworks) */
(() => {
  const LS_PROFILE = "mm_profile";
  const LS_MONSTER = "mm_monster";

  const appEl = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const bubblesEl = document.getElementById("bubbles");

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Loader: always show for 1.5s, even if assets are already cached.
  const MIN_LOADER_MS = 1500;

  // Battle pacing: slow all battle pauses/steps by 50%
  const BATTLE_TIME_SCALE = 4;
  const battleSleep = (ms) => sleep(ms * BATTLE_TIME_SCALE);

  const state = {
    screen: "landing",
    progression: null,
    questions: null,

    profile: null,
    monster: null,

    battle: {
      currentQ: null,
      selected: null,
      asked: 0,
      correctStreak: 0,
      qStartTs: 0,
    },
  };

  function syncBubblesForScreen(screen) {
    // No bubbles on landing or loader
    const off = screen === "landing" || screen === "loader";
    if (off) {
      if (bubblesEl) bubblesEl.innerHTML = "";
      return;
    }
    // Ensure bubbles exist on home/battle
    spawnBubbles();
  }

  // ---------- Background bubbles ----------
  function spawnBubbles() {
    const w = window.innerWidth;
    const count = Math.round(clamp(w / 34, 10, 22));
    bubblesEl.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const b = document.createElement("div");
      b.className = "mm-bubble";
      const size = 6 + Math.random() * 16;
      const left = Math.random() * 100;
      const dur = 6 + Math.random() * 9;
      const delay = -Math.random() * dur;
      b.style.width = `${size}px`;
      b.style.height = `${size}px`;
      b.style.left = `${left}%`;
      b.style.bottom = `${-10 - Math.random() * 20}%`;
      b.style.animationDuration = `${dur}s`;
      b.style.animationDelay = `${delay}s`;
      bubblesEl.appendChild(b);
    }
  }

  // ---------- Toast ----------
  let toastT = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-show"), 1400);
  }

  // ---------- Storage ----------
  function normalizeProfile(p) {
    if (!p || typeof p !== "object") return null;
    const xp = Number(p.xp);
    if (!Number.isFinite(xp)) p.xp = 0;
    if (!Number.isFinite(Number(p.difficulty))) p.difficulty = 1;
    if (!Number.isFinite(Number(p.playerGrade))) p.playerGrade = 2;
    return p;
  }

  function loadLocal() {
    try {
      state.profile = normalizeProfile(
        JSON.parse(localStorage.getItem(LS_PROFILE) || "null")
      );
      state.monster = JSON.parse(localStorage.getItem(LS_MONSTER) || "null");
    } catch {
      state.profile = null;
      state.monster = null;
    }
  }

  function saveLocal() {
    localStorage.setItem(LS_PROFILE, JSON.stringify(state.profile));
    localStorage.setItem(LS_MONSTER, JSON.stringify(state.monster));
  }

  function hasSave() {
    return !!state.profile;
  }

  // ---------- Data ----------
  async function loadStaticData() {
    if (state.progression && state.questions) return;
    const [p, q] = await Promise.all([
      fetch("data/progression.json").then((r) => r.json()),
      fetch("data/questions.json").then((r) => r.json()),
    ]);
    state.progression = p;
    state.questions = q;
  }

  // ---------- Image preloading ----------
  function preloadImages(urls) {
    const unique = Array.from(new Set(urls.filter(Boolean)));
    if (!unique.length) return Promise.resolve();
    return Promise.all(
      unique.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // fail-soft
            img.src = src;
          })
      )
    ).then(() => undefined);
  }

  // ---------- Progression + derived rules ----------
  function computeLevelFromXP(xp) {
    return clamp(Math.floor((xp || 0) / 10) + 1, 1, 3);
  }

  function applyHeroProgressionFromXP() {
    const xp = Number(state.profile.xp ?? 0);
    state.profile.xp = Number.isFinite(xp) ? xp : 0;

    const level = computeLevelFromXP(state.profile.xp);
    state.profile.level = level;

    const lvl = state.progression.hero.levels[String(level)];
    state.profile.heroName = lvl.heroName;
    state.profile.heroSprite = lvl.heroSprite;
    state.profile.attackSprite = lvl.attackSprite;
    state.profile.attack = lvl.attack;
    state.profile.health = lvl.health;
    state.profile.damage = 0;
  }

  function ensureMonsterForCurrentHero() {
    if (!state.monster) {
      const pick =
        state.progression.monsters[
          Math.floor(Math.random() * state.progression.monsters.length)
        ];
      state.monster = {
        monsterName: pick.name,
        monsterSprite: pick.monsterSprite,
        attackSprite: pick.attackSprite,
        attack: state.profile.attack,
        health: state.profile.health,
        damage: 0,
      };
      return;
    }
    state.monster.attack = state.profile.attack;
    state.monster.health = state.profile.health;
    state.monster.damage = 0;
  }

  // ---------- Questions (Addition only) ----------
  function makeAdditionQuestion(grade, difficulty) {
    const cfg = state.questions.addition;
    const g = cfg.gradeSettings[String(grade)] || cfg.gradeSettings["2"];
    const scale =
      cfg.difficultyScale[String(difficulty)] || cfg.difficultyScale["1"];
    const maxAddend = clamp(
      g.baseMaxAddend + (scale.maxAddendBoost || 0),
      5,
      99
    );

    const a = 1 + Math.floor(Math.random() * maxAddend);
    const b = 1 + Math.floor(Math.random() * maxAddend);
    const correct = a + b;

    const maxOffset = cfg.distractors?.maxOffset ?? 6;
    const answers = new Set([correct]);

    while (answers.size < 4) {
      const offset =
        Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset;
      const candidate = correct + offset;
      if (candidate >= 0) answers.add(candidate);
    }

    const arr = Array.from(answers);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return {
      prompt: `${a} + ${b} = ?`,
      correct,
      answers: arr,
    };
  }

  function nextQuestion() {
    const grade = state.profile.playerGrade ?? 2;
    const difficulty = clamp(state.profile.difficulty ?? 1, 1, 10);
    const q = makeAdditionQuestion(grade, difficulty);
    state.battle.currentQ = q;
    state.battle.selected = null;
    state.battle.qStartTs = performance.now();
    state.battle.asked += 1;
  }

  // ---------- Battle mechanics ----------
  function resetBattleDamages() {
    state.profile.damage = 0;
    state.monster.damage = 0;
  }

  function healthPct(health, damage) {
    const h = Number(health || 0);
    const d = Number(damage || 0);
    const remain = clamp(h - d, 0, h);
    return h <= 0 ? 0 : (remain / h) * 100;
  }

  function didWin() {
    return state.monster.damage >= state.monster.health;
  }
  function didLose() {
    return state.profile.damage >= state.profile.health;
  }

  function maybeIncreaseDifficulty(answerTimeMs, wasCorrect) {
    if (!wasCorrect) {
      state.battle.correctStreak = 0;
      return;
    }

    state.battle.correctStreak += 1;
    const fastEnough = answerTimeMs < (state.questions.speedThresholdMs || 3000);

    if (state.battle.correctStreak >= 3 && fastEnough) {
      state.profile.difficulty = clamp((state.profile.difficulty || 1) + 1, 1, 10);
      state.battle.correctStreak = 0;
      toast(`Difficulty up → ${state.profile.difficulty}`);
    }
  }

  async function playAttackFx({ who }) {
    const stage = document.querySelector("[data-battle-stage]");
    if (!stage) return;

    const heroImg = stage.querySelector("[data-hero-sprite]");
    const monImg = stage.querySelector("[data-monster-sprite]");

    const fx = document.createElement("img");
    fx.className = "mm-attackFx";
    fx.alt = "";
    fx.src = who === "hero" ? state.profile.attackSprite : state.monster.attackSprite;

    const target = who === "hero" ? monImg : heroImg;
    const rect = target.getBoundingClientRect();
    const srect = stage.getBoundingClientRect();

    fx.style.left = `${rect.left - srect.left + rect.width / 2 - 90}px`;
    fx.style.top = `${rect.top - srect.top + rect.height / 2 - 90}px`;

    stage.appendChild(fx);

    if (who === "hero") heroImg.classList.add("mm-lunge-hero");
    else monImg.classList.add("mm-lunge-monster");

    await battleSleep(60);
    fx.classList.add("is-pop");
    await battleSleep(220);
    fx.classList.add("is-out");
    await battleSleep(220);

    heroImg.classList.remove("mm-lunge-hero");
    monImg.classList.remove("mm-lunge-monster");
    fx.remove();
  }

  // ---------- Screens ----------
  function shell({ bodyHtml, footerHtml }) {
    return `
      <div class="mm-shell">
        <div class="mm-screen">
          <div class="mm-screen__grow">${bodyHtml}</div>
          ${footerHtml ? `<div>${footerHtml}</div>` : ""}
        </div>
      </div>
    `;
  }

  function renderLanding() {
    const saved = hasSave();

    const body = `
      <section class="landing-wrap" aria-label="Math Monsters Landing">
        <div class="landing-brand">
          <img class="landing-logo" src="images/brand/logo.png" alt="Math Monsters" />
          <h1 class="landing-title">Math Monsters</h1>
          <p class="landing-tagline">Flip homework battles into monster battles – where every lesson feels like play.</p>
        </div>

        <div class="landing-actions">
          ${saved ? `<button class="button button--primary" type="button" data-act="continue">Continue</button>` : ``}
          <button class="button button--primary" type="button" data-act="newGame">New Game</button>
          <button class="button button--outline" type="button" data-act="level2">Level 2</button>
          <button class="button button--outline" type="button" data-act="level3">Level 3</button>
        </div>
      </section>
    `;

    appEl.innerHTML = shell({ bodyHtml: body });

    appEl
      .querySelector("[data-act='continue']")
      ?.addEventListener("click", () => go("home"));

    appEl.querySelector("[data-act='newGame']")?.addEventListener("click", async () => {
      await loadStaticData();
      makeDefaultProfile();
      ensureMonsterForCurrentHero();
      saveLocal();
      go("home");
    });

    appEl.querySelector("[data-act='level2']")?.addEventListener("click", async () => {
      await loadStaticData();
      if (!hasSave()) makeDefaultProfile();
      state.profile.xp = 17;
      applyHeroProgressionFromXP();
      ensureMonsterForCurrentHero();
      saveLocal();
      go("home");
    });

    appEl.querySelector("[data-act='level3']")?.addEventListener("click", async () => {
      await loadStaticData();
      if (!hasSave()) makeDefaultProfile();
      state.profile.xp = 24;
      applyHeroProgressionFromXP();
      ensureMonsterForCurrentHero();
      saveLocal();
      go("home");
    });
  }

  function makeDefaultProfile() {
    const lvl1 = state.progression.hero.levels["1"];
    state.profile = {
      playerName: "Player",
      playerGrade: 2,
      xp: 0,
      level: 1,
      difficulty: 1,
      heroType: "blue",
      heroName: lvl1.heroName,
      heroSprite: lvl1.heroSprite,
      attackSprite: lvl1.attackSprite,
      attack: lvl1.attack,
      health: lvl1.health,
      damage: 0,
    };
  }

  // Loader that preloads current hero/monster assets, then routes or calls a callback.
  // IMPORTANT: It forces a dark loader bg via body.is-loader no matter what screen called it.
  function renderLoader(next) {
    // show loader visuals
    document.body.classList.add("is-loader");

    appEl.innerHTML = `
      <section class="mm-loaderFull" aria-label="Loading">
        <div class="mm-loaderFull__inner">
          <img class="mm-loaderLogo" src="images/brand/logo.png" alt="Math Monsters" />
          <div class="mm-loaderTitle">Loading</div>
          <div class="mm-spinner" aria-label="Loading"></div>
        </div>
      </section>
    `;

    const urls = [];
    if (state.profile) urls.push(state.profile.heroSprite, state.profile.attackSprite);
    if (state.monster) urls.push(state.monster.monsterSprite, state.monster.attackSprite);

    Promise.all([preloadImages(urls), sleep(MIN_LOADER_MS)]).then(() => {
      // hide loader visuals
      document.body.classList.remove("is-loader");

      if (typeof next === "function") next();
      else if (next) go(next);
    });
  }

  function applyScreenClasses(screen) {
    document.body.classList.toggle("is-landing", screen === "landing");
    document.body.classList.toggle("is-home", screen === "home");
    document.body.classList.toggle("is-battle", screen === "battle");
  }

  function renderHome() {
    const xp = Number(state.profile.xp ?? 0);
    const xpMod = ((xp % 10) + 10) % 10;
    const level = state.profile.level ?? 1;
    const pct = (xpMod / 10) * 100;

    const body = `
      <div class="mm-hero">
        <div class="mm-homeTop">
          <div class="mm-stack" style="align-items:center;">
            <div class="mm-pill">Level ${level}</div>
          </div>

          <div class="mm-big">${state.profile.heroName}</div>

          <div class="mm-card mm-card__pad" style="max-width:420px;">
            <div class="mm-row mm-row--between" style="margin-bottom:8px;">
              <div style="font-weight:950;">XP</div>
              <div style="font-weight:950;">${xpMod}/10</div>
            </div>

            <div class="mm-progress mm-progress--lg mm-progress--xp">
              <div class="mm-progress__fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>

        <div class="mm-art">
          <img class="mm-homeSwim" src="${state.profile.heroSprite}" alt="${state.profile.heroName}" />
        </div>

        <div class="mm-homeBtns">
          <button class="button button--primary" data-act="battle">Battle</button>
        </div>
      </div>
    `;

    appEl.innerHTML = shell({ bodyHtml: `<div style="width:100%; height:100%">${body}</div>` });

    appEl.querySelector("[data-act='battle']")?.addEventListener("click", () => {
      go("battle");
    });
  }

  function renderBattle() {
    resetBattleDamages();
    ensureMonsterForCurrentHero();
    saveLocal();

    state.battle.asked = 0;
    state.battle.correctStreak = 0;
    nextQuestion();

    const body = `
      <div class="mm-battleStage" data-battle-stage>
        <img class="mm-sprite hero" data-hero-sprite src="${state.profile.heroSprite}" alt="${state.profile.heroName}">
        <img class="mm-sprite monster" data-monster-sprite src="${state.monster.monsterSprite}" alt="${state.monster.monsterName}">

        <div class="mm-stat mm-glass hero" data-hero-stat>
          <div class="mm-stat__name">${escapeHtml(state.profile.heroName)}</div>
          <div class="mm-progress mm-progress--sm mm-progress--hp">
            <div class="mm-progress__fill" data-hero-hp></div>
          </div>
        </div>

        <div class="mm-stat mm-glass monster" data-mon-stat>
          <div class="mm-stat__name">${escapeHtml(state.monster.monsterName)}</div>
          <div class="mm-progress mm-progress--sm mm-progress--hp">
            <div class="mm-progress__fill" data-mon-hp></div>
          </div>
        </div>

        <div class="mm-qCard" data-qcard>
          <div class="mm-qCard__pad">
            <div class="mm-row mm-row--between">
              <div class="mm-question" data-qtext></div>
              <div style="font-weight:950; color: rgba(13,20,32,.55); font-size: 12px;">D${state.profile.difficulty}</div>
            </div>

            <div class="mm-answers" data-answers></div>

            <div class="mm-qActions">
              <button class="mm-btn mm-btn--primary" data-act="submit">Submit</button>
              <button class="mm-btn mm-btn--ghost" data-act="home">Home</button>
            </div>
          </div>
        </div>
      </div>

      <div class="mm-overlay" data-overlay>
        <div class="mm-sheet" data-sheet>
          <div class="mm-sheet__pad">
            <h2 data-end-title></h2>
            <p data-end-sub></p>
            <div class="mm-row mm-row--between" style="margin-bottom:8px;">
              <div style="font-weight:950;">XP</div>
              <div style="font-weight:950;" data-end-xp></div>
            </div>
            <div class="mm-progress mm-progress--md mm-progress--xp">
              <div class="mm-progress__fill" data-end-bar></div>
            </div>
            <div style="height:12px;"></div>
            <button class="mm-btn mm-btn--primary" data-end-btn></button>
          </div>
        </div>
      </div>
    `;

    appEl.innerHTML = shell({ bodyHtml: body });

    const hero = appEl.querySelector("[data-hero-sprite]");
    const mon = appEl.querySelector("[data-monster-sprite]");
    const qcard = appEl.querySelector("[data-qcard]");
    hero.classList.add("is-in");
    mon.classList.add("is-in");
    setTimeout(() => qcard.classList.add("is-up"), 420 * BATTLE_TIME_SCALE);

    bindBattleUI();
    updateBattleUI();
  }

  function bindBattleUI() {
    const answersEl = appEl.querySelector("[data-answers]");
    const submitBtn = appEl.querySelector("[data-act='submit']");
    const homeBtn = appEl.querySelector("[data-act='home']");

    homeBtn?.addEventListener("click", () =>
      go("loader", { next: "home" })
    );

    function renderAnswers() {
      const q = state.battle.currentQ;
      answersEl.innerHTML = q.answers
        .map(
          (n) =>
            `<button class="mm-answer" data-ans="${n}" aria-pressed="false">${n}</button>`
        )
        .join("");

      answersEl.querySelectorAll("[data-ans]").forEach((btn) => {
        btn.addEventListener("click", () => {
          answersEl
            .querySelectorAll(".mm-answer")
            .forEach((b) => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          state.battle.selected = Number(btn.getAttribute("data-ans"));
        });
      });
    }

    renderAnswers();

    submitBtn?.addEventListener("click", async () => {
      const q = state.battle.currentQ;
      if (state.battle.selected === null) {
        toast("Pick an answer");
        return;
      }

      const answerTime = performance.now() - state.battle.qStartTs;
      const correct = state.battle.selected === q.correct;

      maybeIncreaseDifficulty(answerTime, correct);

      if (correct) {
        state.monster.damage += 1;
        updateBattleUI();
        await playAttackFx({ who: "hero" });
      } else {
        state.profile.damage += 1;
        updateBattleUI();
        await playAttackFx({ who: "monster" });
      }

      if (didWin()) {
        endBattle({ won: true });
        return;
      }
      if (didLose()) {
        endBattle({ won: false });
        return;
      }

      nextQuestion();
      updateBattleUI();
      renderAnswers();
    });
  }

  function updateBattleUI() {
    const heroHpEl = appEl.querySelector("[data-hero-hp]");
    const monHpEl = appEl.querySelector("[data-mon-hp]");
    heroHpEl.style.width = `${healthPct(state.profile.health, state.profile.damage)}%`;
    monHpEl.style.width = `${healthPct(state.monster.health, state.monster.damage)}%`;

    const qtext = appEl.querySelector("[data-qtext]");
    qtext.textContent = state.battle.currentQ.prompt;
  }

  function showEndSheet({ title, sub, btnText, onBtn, xpBefore, xpAfter }) {
    const overlay = appEl.querySelector("[data-overlay]");
    const sheet = appEl.querySelector("[data-sheet]");
    const t = appEl.querySelector("[data-end-title]");
    const s = appEl.querySelector("[data-end-sub]");
    const xpEl = appEl.querySelector("[data-end-xp]");
    const bar = appEl.querySelector("[data-end-bar]");
    const btn = appEl.querySelector("[data-end-btn]");

    t.textContent = title;
    s.textContent = sub;
    xpEl.textContent = `${xpAfter}`;

    const beforeMod = ((xpBefore % 10) + 10) % 10;
    const afterMod = ((xpAfter % 10) + 10) % 10;

    overlay.classList.add("is-show");
    requestAnimationFrame(() => {
      sheet.classList.add("is-in");
      bar.style.width = `${(beforeMod / 10) * 100}%`;
      setTimeout(() => {
        bar.style.width = `${(afterMod / 10) * 100}%`;
      }, 140 * BATTLE_TIME_SCALE);
    });

    btn.textContent = btnText;
    btn.onclick = onBtn;
  }

  function endBattle({ won }) {
    const xpBefore = Number(state.profile.xp ?? 0);

    if (won) {
      state.profile.xp = Number(state.profile.xp ?? 0) + 1;
      saveLocal();
      showEndSheet({
        title: "Great Job!",
        sub: "You powered up with +1 XP.",
        btnText: "Back Home",
        xpBefore,
        xpAfter: state.profile.xp,
        onBtn: () => go("home"),
      });
      return;
    }

    state.profile.xp = Number(state.profile.xp ?? 0) - 1;
    state.profile.difficulty = clamp((state.profile.difficulty ?? 1) - 1, 1, 10);
    saveLocal();

    showEndSheet({
      title: "Sorry!",
      sub: "Try again — difficulty eased a bit.",
      btnText: "Try Again",
      xpBefore,
      xpAfter: state.profile.xp,
      onBtn: () => go("battle"),
    });
  }

  // ---------- Router ----------
  async function go(screen, opts = {}) {
    document.body.classList.remove(
      "is-landing",
      "is-home",
      "is-battle",
      "is-loader"
    );

    state.screen = screen;
    syncBubblesForScreen(screen);

    document.body.classList.toggle("is-landing", screen === "landing");
    document.body.classList.toggle("is-battle", screen === "battle");

    // Home class for swim animation (and any future Home-only styles)
    applyScreenClasses(screen);

    if (screen === "landing") {
      loadLocal();
      renderLanding();
      return;
    }

    if (screen === "loader") {
      await loadStaticData();
      loadLocal();
      if (!hasSave()) makeDefaultProfile();
      applyHeroProgressionFromXP();
      ensureMonsterForCurrentHero();
      saveLocal();
      renderLoader(opts.next);
      return;
    }

    if (screen === "home") {
      await loadStaticData();
      loadLocal();
      if (!hasSave()) {
        renderLanding();
        return;
      }
      applyHeroProgressionFromXP();
      ensureMonsterForCurrentHero();
      saveLocal();

      renderHome();
      return;
    }

    if (screen === "battle") {
      await loadStaticData();
      loadLocal();

      if (!hasSave()) {
        renderLanding();
        return;
      }

      applyHeroProgressionFromXP();
      ensureMonsterForCurrentHero();
      saveLocal();

      renderBattle();
      return;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  // ---------- Boot ----------
  function boot() {
    window.addEventListener(
      "resize",
      () => {
        if (state.screen !== "landing" && state.screen !== "loader") spawnBubbles();
      },
      { passive: true }
    );

    loadLocal();
    go("landing");
  }

  boot();
})();
