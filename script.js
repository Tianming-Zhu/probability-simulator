(() => {
  const $ = (s) => document.querySelector(s);
  const menu = $("#menu");
  const experiment = $("#experiment");
  const title = $("#title");
  const instruction = $("#instruction");
  const numTrials = $("#numTrials");
  const start = $("#start");
  const next = $("#next");
  const back = $("#back");
  const visual = $("#visual");
  const progress = $("#progress");
  const result = $("#result");
  const detail = $("#detail");
  const historyEl = $("#history");
  const statsEl = $("#stats");
  const trialCount = $("#trialCount");
  const totalEl = $("#total");
  const reset = $("#reset");
  const note = $("#note");

  let mode = null;
  let target = 0;
  let current = 0;
  let counts = {};
  let history = [];
  let running = false;

  const rand = (n) => Math.floor(Math.random() * n);
  const coin = () => (rand(2) ? "Tail" : "Head");
  const die = () => rand(6) + 1;

  // Experiment 5 uses one of each color.
  const threeBalls = ["Red", "Green", "Blue"];

  // Experiments 6 and 7 use two of each color.
  const sixBalls = ["Red", "Red", "Green", "Green", "Blue", "Blue"];

  const faces = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const config = {
    coin1: {
      title: "Tossing One Coin",
      instruction: "Toss one coin once for each trial.",
      outcomes: ["Head", "Tail"]
    },
    coin2: {
      title: "Tossing Two Coins",
      instruction: "Toss two coins once for each trial.",
      outcomes: ["2 Heads", "1 Head + 1 Tail", "2 Tails"]
    },
    die1: {
      title: "Rolling One Die",
      instruction: "Roll one die once for each trial.",
      outcomes: ["1", "2", "3", "4", "5", "6"]
    },
    dice2: {
      title: "Rolling Two Dice",
      instruction: "Roll two dice once for each trial. Use the sum as the result.",
      outcomes: ["2","3","4","5","6","7","8","9","10","11","12"]
    },
    ball1: {
      title: "Drawing One Ball",
      instruction: "Randomly draw one ball from Red, Green, and Blue.",
      outcomes: ["Red", "Green", "Blue"]
    },
    ballRep: {
      title: "Drawing Two Balls with Replacement",
      instruction: "The cup contains 2 Red, 2 Green, and 2 Blue balls. Draw one ball, replace it, then draw a second ball.",
      outcomes: ["Same color", "Different colors"]
    },
    ballNoRep: {
      title: "Drawing Two Balls without Replacement",
      instruction: "The cup contains 2 Red, 2 Green, and 2 Blue balls. Draw two balls at the same time.",
      outcomes: ["Same color", "Different colors"]
    }
  };

  function resetCounts() {
    counts = {};
    config[mode].outcomes.forEach(o => counts[o] = 0);
  }

  function ballHTML(color, label = color) {
    return `<div class="ball ${color.toLowerCase()}">${label}</div>`;
  }

  function cupHTML(ballColors, extraClass = "") {
    const colors = ["Red", "Green", "Blue"];
    const columns = colors.map(color => {
      const balls = ballColors.filter(c => c === color);
      return `
        <div class="color-column">
          <div class="color-column-label">${color}</div>
          <div class="color-column-balls">
            ${balls.length
              ? balls.map(c => ballHTML(c)).join("")
              : '<div class="empty-slot">0</div>'}
          </div>
        </div>`;
    }).join("");

    return `
      <div class="cup-zone ${extraClass}">
        <div class="cup-label">Cup</div>
        <div class="cup">
          <div class="cup-balls cup-columns">
            ${columns}
          </div>
        </div>
      </div>`;
  }

  function removeOne(list, value) {
    const copy = [...list];
    const index = copy.indexOf(value);
    if (index !== -1) copy.splice(index, 1);
    return copy;
  }

  function showReadyVisual() {
    progress.textContent = "Ready";
    result.textContent = "—";
    detail.textContent = "";
    next.classList.add("hidden");

    if (mode === "coin1") {
      visual.innerHTML = '<div class="coin">?</div>';
    } else if (mode === "coin2") {
      visual.innerHTML = '<div class="row"><div class="coin">?</div><div class="coin">?</div></div>';
    } else if (mode === "die1") {
      visual.innerHTML = '<div class="die">?</div>';
    } else if (mode === "dice2") {
      visual.innerHTML = '<div class="row"><div class="die">?</div><div class="die">?</div></div>';
    } else if (mode === "ballRep" || mode === "ballNoRep") {
      visual.innerHTML = `<div class="ball-process">${cupHTML(sixBalls)}</div>`;
    } else {
      visual.innerHTML = '<div class="row balls"><div class="ball red">Red</div><div class="ball green">Green</div><div class="ball blue">Blue</div></div>';
    }
  }

  function renderTables() {
    trialCount.textContent = `${history.length} ${history.length === 1 ? "trial" : "trials"}`;
    totalEl.textContent = `Total: ${history.length}`;

    if (!history.length) {
      historyEl.innerHTML = '<tr><td colspan="2" class="muted">No trials yet</td></tr>';
    } else {
      historyEl.innerHTML = history.map((h, i) =>
        `<tr><td>${i + 1}</td><td>${h}</td></tr>`
      ).join("");
    }

    statsEl.innerHTML = config[mode].outcomes.map(o => {
      const c = counts[o] || 0;
      const p = history.length ? (c / history.length) * 100 : 0;
      return `<tr>
        <td>${o}</td>
        <td class="num">${c}</td>
        <td class="num">${p.toFixed(1)}%</td>
      </tr>`;
    }).join("");
  }

  function openExperiment(newMode) {
    mode = newMode;
    target = 0;
    current = 0;
    history = [];
    resetCounts();
    title.textContent = config[mode].title;
    instruction.textContent = config[mode].instruction;
    menu.classList.add("hidden");
    experiment.classList.remove("hidden");
    start.disabled = false;
    numTrials.disabled = false;
    back.disabled = false;
    note.textContent = "The simulator stops after each trial. Click Next Trial to continue.";
    renderTables();
    showReadyVisual();
  }

  function makeResult() {
    let outcome, detailText = "", html = "";

    if (mode === "coin1") {
      const a = coin();
      outcome = a;
      html = `<div class="coin">${a === "Head" ? "H" : "T"}</div>`;
    }

    if (mode === "coin2") {
      const a = coin(), b = coin();
      outcome =
        a === "Head" && b === "Head" ? "2 Heads" :
        a === "Tail" && b === "Tail" ? "2 Tails" :
        "1 Head + 1 Tail";
      detailText = `Coin 1: ${a} · Coin 2: ${b}`;
      html = `<div class="row">
        <div class="coin">${a === "Head" ? "H" : "T"}</div>
        <div class="coin">${b === "Head" ? "H" : "T"}</div>
      </div>`;
    }

    if (mode === "die1") {
      const a = die();
      outcome = String(a);
      html = `<div class="die">${faces[a]}</div>`;
    }

    if (mode === "dice2") {
      const a = die(), b = die();
      outcome = String(a + b);
      detailText = `Die 1: ${a} · Die 2: ${b} · Sum: ${a + b}`;
      html = `<div class="row"><div class="die">${faces[a]}</div><div class="die">${faces[b]}</div></div>`;
    }

    if (mode === "ball1") {
      const a = threeBalls[rand(threeBalls.length)];
      outcome = a;
      html = `<div class="ball ${a.toLowerCase()}">${a}</div>`;
    }

    return { outcome, detailText, html };
  }

  async function animateStandardTrial() {
    if (mode === "coin1" || mode === "coin2") {
      const n = mode === "coin1" ? 1 : 2;
      visual.innerHTML = '<div class="row">' +
        Array.from({length:n}, () => '<div class="coin anim">H</div>').join("") +
        '</div>';
      const nodes = [...visual.querySelectorAll(".coin")];
      let flip = false;
      const timer = setInterval(() => {
        flip = !flip;
        nodes.forEach(n => n.textContent = flip ? "H" : "T");
      }, 100);
      await sleep(850);
      clearInterval(timer);
      return;
    }

    if (mode === "die1" || mode === "dice2") {
      const n = mode === "die1" ? 1 : 2;
      visual.innerHTML = '<div class="row">' +
        Array.from({length:n}, () => '<div class="die anim">⚂</div>').join("") +
        '</div>';
      const nodes = [...visual.querySelectorAll(".die")];
      const timer = setInterval(() => {
        nodes.forEach(n => n.textContent = faces[die()]);
      }, 90);
      await sleep(850);
      clearInterval(timer);
      return;
    }

    visual.innerHTML =
      '<div class="row balls anim"><div class="ball red">Red</div><div class="ball green">Green</div><div class="ball blue">Blue</div></div>';
    await sleep(850);
  }

  async function animateTwoBallTrial(withReplacement) {
    if (withReplacement) {
      // First draw is from all 6 physical balls.
      const first = sixBalls[rand(sixBalls.length)];

      visual.innerHTML = `
        <div class="ball-process">
          ${cupHTML(sixBalls, "mixing")}
          <div class="draw-zone">
            <div class="draw-label">First draw</div>
            <div class="draw-placeholder">?</div>
          </div>
        </div>`;
      await sleep(700);

      const afterFirstDraw = removeOne(sixBalls, first);

      visual.innerHTML = `
        <div class="ball-process">
          ${cupHTML(afterFirstDraw)}
          <div class="draw-zone">
            <div class="draw-label">First draw</div>
            ${ballHTML(first)}
          </div>
        </div>`;
      detail.textContent = `First draw: ${first}`;
      await sleep(700);

      const available = [...sixBalls];

      visual.innerHTML = `
        <div class="ball-process">
          ${cupHTML(available)}
          <div class="draw-zone">
            <div class="draw-label">First draw</div>
            ${ballHTML(first)}
            <div class="status-badge replace">Returned to cup</div>
          </div>
        </div>`;
      detail.textContent = `${first} is replaced. The cup has 2 Red, 2 Green, and 2 Blue balls again.`;
      await sleep(900);

      visual.innerHTML = `
        <div class="ball-process">
          ${cupHTML(available, "mixing")}
          <div class="draw-zone">
            <div class="draw-label">First draw</div>
            ${ballHTML(first)}
          </div>
          <div class="draw-zone">
            <div class="draw-label">Second draw</div>
            <div class="draw-placeholder">?</div>
          </div>
        </div>`;
      await sleep(700);

      const second = available[rand(available.length)];
      const outcome = first === second ? "Same color" : "Different colors";

      visual.innerHTML = `
        <div class="ball-process final-ball-result">
          <div class="draw-zone">
            <div class="draw-label">First draw</div>
            ${ballHTML(first)}
          </div>
          <div class="arrow">→</div>
          <div class="draw-zone">
            <div class="draw-label">Second draw</div>
            ${ballHTML(second)}
          </div>
        </div>`;

      detail.textContent = `First: ${first} · Second: ${second}`;
      return { outcome, detailText: detail.textContent };
    }

    // WITHOUT REPLACEMENT:
    // Randomly select two physical balls from the six at the same time.
    visual.innerHTML = `
      <div class="ball-process simultaneous-draw">
        ${cupHTML(sixBalls, "mixing")}
        <div class="draw-zone two-ball-draw">
          <div class="draw-label">Draw two balls</div>
          <div class="two-draw-placeholders">
            <div class="draw-placeholder">?</div>
            <div class="draw-placeholder">?</div>
          </div>
        </div>
      </div>`;
    detail.textContent = "Two balls are selected together without replacement.";
    await sleep(950);

    const firstIndex = rand(sixBalls.length);
    const first = sixBalls[firstIndex];
    const remaining = [...sixBalls];
    remaining.splice(firstIndex, 1);
    const second = remaining[rand(remaining.length)];
    const outcome = first === second ? "Same color" : "Different colors";

    visual.innerHTML = `
      <div class="ball-process final-ball-result simultaneous-result">
        <div class="draw-zone two-ball-draw">
          <div class="draw-label">Two balls drawn</div>
          <div class="two-drawn-balls">
            ${ballHTML(first)}
            ${ballHTML(second)}
          </div>
        </div>
      </div>`;

    detail.textContent = `${first} + ${second}`;
    return { outcome, detailText: detail.textContent };
  }

  async function runTrial() {
    if (running || current >= target) return;

    running = true;
    next.disabled = true;
    progress.textContent = `Running Trial ${current + 1} of ${target}`;
    result.textContent = "";
    detail.textContent = "";

    let trial;

    if (mode === "ballRep") {
      trial = await animateTwoBallTrial(true);
    } else if (mode === "ballNoRep") {
      trial = await animateTwoBallTrial(false);
    } else {
      await animateStandardTrial();
      trial = makeResult();
      visual.innerHTML = trial.html;
    }

    current += 1;
    history.push(trial.outcome);
    counts[trial.outcome] = (counts[trial.outcome] || 0) + 1;

    result.textContent = trial.outcome;
    detail.textContent = trial.detailText || "";
    renderTables();

    if (current < target) {
      progress.textContent = `Trial ${current} of ${target} complete`;
      next.textContent = "Next Trial";
      next.classList.remove("hidden");
      next.disabled = false;
    } else {
      progress.textContent = `All ${target} trials completed`;
      next.classList.add("hidden");
      start.disabled = false;
      numTrials.disabled = false;
      back.disabled = false;
    }

    running = false;
  }

  function begin() {
    const n = Number(numTrials.value);

    if (!Number.isInteger(n) || n < 1 || n > 100) {
      note.textContent = "Please enter a whole number from 1 to 100.";
      return;
    }

    target = n;
    current = 0;
    history = [];
    resetCounts();
    renderTables();

    start.disabled = true;
    numTrials.disabled = true;
    back.disabled = true;
    note.textContent = "The simulator stops after each trial. Click Next Trial to continue.";

    runTrial();
  }

  menu.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (btn) openExperiment(btn.dataset.mode);
  });

  document.querySelectorAll("[data-n]").forEach(btn => {
    btn.addEventListener("click", () => numTrials.value = btn.dataset.n);
  });

  start.addEventListener("click", begin);
  next.addEventListener("click", runTrial);

  reset.addEventListener("click", () => {
    if (running) return;
    target = 0;
    current = 0;
    history = [];
    resetCounts();
    start.disabled = false;
    numTrials.disabled = false;
    back.disabled = false;
    note.textContent = "The simulator stops after each trial. Click Next Trial to continue.";
    renderTables();
    showReadyVisual();
  });

  back.addEventListener("click", () => {
    if (running) return;
    experiment.classList.add("hidden");
    menu.classList.remove("hidden");
  });
})();
