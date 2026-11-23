// Paint Train page of the Wayfold Games site: coins, achievements, sound, the parade train and a playable demo level.
// It also stamps the studio passport (visited, demo cleared). Everything stays in the visitor's browser (localStorage).
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const ASSETS = document.documentElement.dataset.assets || "assets/";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Saved state ----------
  const KEY = "wayfold.painttrain.v1";
  const state = Object.assign({ coins: 0, got: {}, sound: false }, (() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ } };

  // ---------- Sound (tiny synth, off until the visitor turns it on) ----------
  let audio = null;
  function tone(freq, dur = .12, type = "triangle", vol = .12, delay = 0) {
    if (!state.sound) return;
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime + delay, o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + .02);
  }
  const sfx = {
    pick: () => tone(660, .08), drop: () => tone(440, .1, "square", .06),
    coin: () => { tone(988, .08, "square", .05); tone(1319, .14, "square", .05, .07); },
    chime: () => [523, 659, 784].forEach((f, i) => tone(f, .35, "sine", .1, i * .09)),
    horn: () => { tone(220, .5, "sawtooth", .05); tone(277, .5, "sawtooth", .04); },
    crash: () => { for (let i = 0; i < 6; i++) tone(90 + Math.random() * 120, .12, "square", .07, i * .04); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .4, "triangle", .1, i * .12)),
  };

  // ---------- HUD: coins, sound, trophies ----------
  const coinChip = $("#coins"), coinText = $("#coins b");
  const showCoins = () => { if (coinText) coinText.textContent = state.coins; };
  function addCoins(n, x, y) {
    state.coins += n; save(); showCoins(); sfx.coin();
    if (coinChip) { coinChip.classList.remove("bump"); void coinChip.offsetWidth; coinChip.classList.add("bump"); }
    if (x != null) {
      const p = document.createElement("div");
      p.className = "coin-pop"; p.innerHTML = `<img src="${ASSETS}game/coin.webp" alt="">+${n}`;
      p.style.left = `${x - 20}px`; p.style.top = `${y - 20}px`;
      document.body.appendChild(p); setTimeout(() => p.remove(), 900);
    }
  }
  const soundBtn = $("#sound");
  const showSound = () => {
    if (!soundBtn) return;
    soundBtn.classList.toggle("off", !state.sound);
    soundBtn.setAttribute("aria-pressed", state.sound);
    soundBtn.title = state.sound ? "Sound on" : "Sound off";
  };
  soundBtn?.addEventListener("click", () => { state.sound = !state.sound; save(); showSound(); sfx.pick(); });

  const ACH = [
    { id: "welcome", name: "Welcome Aboard", text: "Visit the Paint Train yard.", coins: 10 },
    { id: "spotter", name: "Trainspotter", text: "Tap a wagon of the passing train.", coins: 5 },
    { id: "first", name: "First Departure", text: "Send a train out of the yard.", coins: 20 },
    { id: "master", name: "Yard Master", text: "Clear the demo level.", coins: 50 },
    { id: "perfect", name: "Three Stars", text: "Clear it in the fewest moves.", coins: 30 },
    { id: "explorer", name: "Explorer", text: "Ride to the end of the line.", coins: 10 },
  ];
  const trophyChip = $("#trophies b");
  const showTrophies = () => { if (trophyChip) trophyChip.textContent = `${Object.keys(state.got).length}/${ACH.length}`; };
  const toasts = Object.assign(document.createElement("div"), { className: "toasts" });
  toasts.setAttribute("aria-live", "polite");
  document.body.appendChild(toasts);
  function unlock(id) {
    if (state.got[id]) return;
    const a = ACH.find(x => x.id === id); if (!a) return;
    state.got[id] = Date.now(); state.coins += a.coins; save(); showCoins(); showTrophies();
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<img src="${ASSETS}game/star.webp" alt=""><div><small>ACHIEVEMENT +${a.coins} COINS</small><strong>${a.name}</strong><span>${a.text}</span></div>`;
    toasts.appendChild(t); sfx.chime();
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3600);
  }
  const trophyPanel = $("#trophy-panel");
  function openTrophies() {
    if (!trophyPanel) return;
    $("ul", trophyPanel).innerHTML = ACH.map(a => `<li class="${state.got[a.id] ? "" : "locked"}"><img src="${ASSETS}game/star.webp" alt="">` +
      `<div><strong>${a.name}</strong><span>${a.text}</span></div><em>+${a.coins}</em></li>`).join("");
    trophyPanel.classList.add("show"); $(".close button", trophyPanel).focus();
  }
  $("#trophies")?.addEventListener("click", openTrophies);
  trophyPanel?.addEventListener("click", e => { if (e.target === trophyPanel || e.target.closest(".close button")) trophyPanel.classList.remove("show"); });
  addEventListener("keydown", e => { if (e.key === "Escape") trophyPanel?.classList.remove("show"); });

  // The studio passport (home page): 1 = visited this game's page, 2 = cleared its demo.
  const PASSPORT = "wayfold.passport.v1";
  function stamp(level) {
    try {
      const p = JSON.parse(localStorage.getItem(PASSPORT)) || {};
      if ((p.painttrain || 0) < level) { p.painttrain = level; localStorage.setItem(PASSPORT, JSON.stringify(p)); }
    } catch { /* private mode */ }
  }
  stamp(1);

  showCoins(); showSound(); showTrophies();
  setTimeout(() => unlock("welcome"), 900);

  // End of the line: the footer comes into view.
  const end = $(".end");
  if (end && "IntersectionObserver" in window) {
    new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { unlock("explorer"); o.disconnect(); } }, { threshold: .6 }).observe(end);
  }

  // ---------- Hero: stars and the parade train ----------
  const sky = $(".hero .stars");
  if (sky) for (let i = 0; i < 40; i++) {
    const s = document.createElement("i");
    s.style.left = `${Math.random() * 100}%`; s.style.top = `${Math.random() * 55}%`;
    s.style.animationDelay = `${Math.random() * 3}s`; s.style.transform = `scale(${.5 + Math.random()})`;
    sky.appendChild(s);
  }
  let spotted = 0;
  document.querySelectorAll(".parade .train img.car").forEach(img => img.addEventListener("click", e => {
    if (img.dataset.paid) return;
    img.dataset.paid = "1"; img.style.filter = "brightness(1.35)";
    setTimeout(() => { delete img.dataset.paid; img.style.filter = ""; }, 4000);
    addCoins(1, e.clientX, e.clientY);
    if (++spotted >= 1) unlock("spotter");
  }));

  // ---------- The demo level ----------
  // Same rules as the game: tapping a track picks up the group of same-colored wagons at its open end; tapping another
  // track pushes the whole group there. Too many for the room left and they run off the buffer stop (derail). A track
  // that holds every wagon of one color and nothing else is a complete train: a locomotive takes it away.
  const yardEl = $("#yard");
  if (!yardEl) return;
  const LEVEL = { caps: [4, 4, 4, 3], tracks: [[1, 2, 0], [0, 1], [2, 1], [0, 2]], perColor: 3, best: 6 };
  const tracksEl = $(".tracks", yardEl), movesEl = $("#moves"), winEl = $(".win", yardEl);
  let tracks, picked, moves, busy, wagonId, wagonEls, trainsGone;

  const group = t => { if (!t.length) return 0; const c = t[t.length - 1].c; let k = 0; for (let i = t.length - 1; i >= 0 && t[i].c === c; i--) k++; return k; };
  const fits = (a, b) => tracks[b].length + group(tracks[a]) <= LEVEL.caps[b];
  const complete = t => t.length === LEVEL.perColor && t.every(w => w.c === t[0].c);

  function build() {
    tracksEl.innerHTML = "";
    LEVEL.caps.forEach((cap, i) => {
      const row = document.createElement("div");
      row.className = "track"; row.tabIndex = 0; row.dataset.i = i;
      row.setAttribute("role", "button"); row.setAttribute("aria-label", `Track ${i + 1}`);
      row.style.setProperty("--cap", cap);
      row.innerHTML = `<div class="signal"></div><div class="line"></div>`;
      row.addEventListener("click", () => tap(i));
      row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(i); } });
      tracksEl.appendChild(row);
    });
  }
  const rows = () => tracksEl.querySelectorAll(":scope > .track");
  function slotX(track, index) {
    // Index 0 stands at the buffer stop (right end of the line).
    const line = rows()[track].querySelector(".line");
    const slot = parseFloat(getComputedStyle(yardEl).getPropertyValue("--slot-px")) || 100;
    const lineLeft = line.offsetLeft, lineW = line.offsetWidth, stopW = line.offsetHeight * .32;
    return lineLeft + lineW - stopW - slot * (index + 1);
  }
  function place(el, track, index, lift = 0) {
    const row = rows()[track];
    el.style.transform = `translate(${slotX(track, index)}px, ${row.offsetTop - lift}px)`;
  }
  function layout() {
    tracks.forEach((t, ti) => t.forEach((w, wi) => {
      const el = wagonEls[w.id];
      const lifted = picked === ti && wi >= t.length - group(t);
      el.classList.toggle("lift", lifted);
      place(el, ti, wi, lifted ? 10 : 0);
    }));
    [...rows()].forEach((row, i) => {
      row.classList.toggle("picked", picked === i);
      const sig = row.querySelector(".signal");
      sig.className = "signal";
      if (picked != null && picked !== i) sig.classList.add(fits(picked, i) ? "go" : "stop");
    });
    movesEl.textContent = moves;
  }
  function reset() {
    busy = false; picked = null; moves = 0; wagonId = 0; trainsGone = 0; wagonEls = {};
    tracksEl.querySelectorAll(".wagon, .loco").forEach(e => e.remove());
    tracks = LEVEL.tracks.map(t => t.map(c => ({ c, id: wagonId++ })));
    tracks.flat().forEach(w => {
      const el = document.createElement("div");
      el.className = `wagon c${w.c}`; el.style.transition = "none";
      tracksEl.appendChild(el); wagonEls[w.id] = el;
    });
    winEl.classList.remove("show");
    layout();
    requestAnimationFrame(() => Object.values(wagonEls).forEach(el => el.style.transition = ""));
  }
  function shout(text, bad) {
    const s = document.createElement("div");
    s.className = `shout${bad ? " bad" : ""}`; s.textContent = text;
    yardEl.appendChild(s); setTimeout(() => s.remove(), 1100);
  }
  const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 60) : ms));

  async function tap(i) {
    if (busy) return;
    clearHint();
    if (picked == null) {
      if (!tracks[i].length) return;
      picked = i; sfx.pick(); layout(); return;
    }
    if (picked === i) { picked = null; layout(); return; }
    const from = picked; picked = null;
    if (!fits(from, i)) return derail(from, i);
    const g = group(tracks[from]);
    tracks[i].push(...tracks[from].splice(tracks[from].length - g, g));
    moves++; sfx.drop(); layout();
    busy = true;
    await wait(340);
    for (let t = 0; t < tracks.length; t++) if (complete(tracks[t])) await depart(t);
    busy = false;
    if (tracks.every(t => !t.length)) win();
  }

  async function depart(t) {
    const row = rows()[t], train = tracks[t];
    const loco = document.createElement("div");
    loco.className = "loco"; loco.style.transition = "none";
    const slot = parseFloat(getComputedStyle(yardEl).getPropertyValue("--slot-px")) || 100;
    const frontX = slotX(t, train.length - 1) - slot * 1.15;
    loco.style.transform = `translate(${-slot * 1.4}px, ${row.offsetTop}px)`;
    tracksEl.appendChild(loco);
    await wait(30);
    loco.style.transition = "";
    loco.style.transform = `translate(${frontX}px, ${row.offsetTop}px)`;
    sfx.horn();
    await wait(600);
    const away = -(yardEl.offsetWidth + slot * 2);
    [loco, ...train.map(w => wagonEls[w.id])].forEach(el => {
      el.style.transition = "transform .9s cubic-bezier(.5, 0, .9, .6)";
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform);
      el.style.transform = `translate(${parseFloat(m[1]) + away}px, ${m[2]}px)`;
    });
    tracks[t] = []; trainsGone++;
    sfx.chime(); unlock("first");
    shout(["ALL ABOARD!", "CHOO CHOO!", "NICE!"][(trainsGone - 1) % 3]);
    await wait(700);
    loco.remove(); train.forEach(w => { wagonEls[w.id].remove(); delete wagonEls[w.id]; });
    layout();
  }

  async function derail(from, to) {
    busy = true; moves++;
    const g = group(tracks[from]);
    const moving = tracks[from].splice(tracks[from].length - g, g);
    tracks[to].push(...moving);
    layout();
    await wait(300);
    sfx.crash(); yardEl.classList.remove("shake"); void yardEl.offsetWidth; yardEl.classList.add("shake");
    const room = LEVEL.caps[to];
    tracks[to].forEach((w, wi) => {
      if (wi < room - 1 && !moving.includes(w)) return;
      const el = wagonEls[w.id];
      el.classList.add("derail");
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform);
      el.style.transform = `translate(${parseFloat(m[1]) + 120 + wi * 30}px, ${parseFloat(m[2]) + 90 + wi * 25}px) rotate(${50 + wi * 25}deg)`;
    });
    shout("DERAILED!", true);
    await wait(1400);
    reset();
  }

  function win() {
    const stars = moves <= LEVEL.best ? 3 : moves <= LEVEL.best + 3 ? 2 : 1;
    const reward = 10 + stars * 5;
    $(".stars", winEl).innerHTML = [0, 1, 2].map(i =>
      `<img src="${ASSETS}game/${i < stars ? "star" : "star_slot"}.webp" class="${i < stars ? "on" : ""}" style="animation-delay:${.25 + i * .2}s" alt="${i < stars ? "star" : ""}">`).join("");
    $("#win-moves").textContent = moves; $("#win-coins").textContent = `+${reward}`;
    winEl.classList.add("show"); sfx.win();
    state.coins += reward; save(); showCoins();
    unlock("master"); if (stars === 3) unlock("perfect"); stamp(2);
    $("#again").focus();
  }

  // Hint: the next move of a shortest solution (breadth-first search; the level is tiny).
  let hinted = [];
  function clearHint() { hinted.forEach(s => s.classList.remove("blink", "go")); hinted = []; }
  function hint() {
    if (busy) return;
    picked = null; layout();
    const start = tracks.map(t => t.map(w => w.c));
    const key = s => s.map(t => t.join("")).join("|");
    const seen = new Set([key(start)]); const queue = [[start, null]];
    while (queue.length) {
      const [s, first] = queue.shift();
      if (s.every(t => !t.length)) { if (first) show(first); return; }
      for (let a = 0; a < s.length; a++) {
        const ta = s[a]; if (!ta.length) continue;
        let g = 0; for (let i = ta.length - 1; i >= 0 && ta[i] === ta[ta.length - 1]; i--) g++;
        for (let b = 0; b < s.length; b++) {
          if (a === b || s[b].length + g > LEVEL.caps[b]) continue;
          const n = s.map(t => t.slice()); n[b].push(...n[a].splice(n[a].length - g, g));
          for (let t = 0; t < n.length; t++) if (n[t].length === LEVEL.perColor && n[t].every(c => c === n[t][0])) n[t] = [];
          const k = key(n); if (seen.has(k)) continue;
          seen.add(k); queue.push([n, first || [a, b]]);
        }
      }
    }
    function show([a, b]) {
      hinted = [rows()[a].querySelector(".signal"), rows()[b].querySelector(".signal")];
      hinted.forEach(s => s.classList.add("go", "blink"));
    }
  }

  function measure() {
    // Wagon size follows the yard's width; every track has the same left edge, so the open ends line up.
    const pad = parseFloat(getComputedStyle(yardEl).paddingLeft) * 2;
    const w = yardEl.clientWidth - pad, maxCap = Math.max(...LEVEL.caps);
    const slot = Math.max(52, Math.min(150, (w - 8) / (maxCap + .75)));
    yardEl.style.setProperty("--slot", `${slot}px`); yardEl.style.setProperty("--slot-px", slot);
    yardEl.style.setProperty("--row", `${slot * .78}px`);
  }

  build(); measure(); reset();
  addEventListener("resize", () => { measure(); Object.values(wagonEls).forEach(el => el.style.transition = "none"); layout();
    requestAnimationFrame(() => Object.values(wagonEls).forEach(el => el.style.transition = "")); });
  $("#retry").addEventListener("click", () => { clearHint(); reset(); });
  $("#hint").addEventListener("click", hint);
  $("#again").addEventListener("click", reset);
})();
