/* ===========================================================
   Citadle — game logic
   Expects CITY_DATA from CitadleData.js:
     const CITY_DATA = [ [name, lat, lon, iso2], ... ]
   =========================================================== */

const MAX_CLUES = 8;
const DAILY_STORAGE_PREFIX = "citadle_daily_";
const SETTINGS_STORAGE_KEY = "citadle_settings";

const DIFFICULTY = {
  easy:   { label: "Easy",   showFlag: true,  showDistance: true  },
  medium: { label: "Medium", showFlag: true,  showDistance: false },
  hard:   { label: "Hard",   showFlag: false, showDistance: false },
};

// Localised compass labels and clue chip fragments.
// Add more languages here; keys match the "lang" setting value.
const I18N = {
  en: { dirs: ["N","NE","E","SE","S","SW","W","NW"], is: "is",  secretCity: "the secret city", of: "of" },
  fr: { dirs: ["N","NE","E","SE","S","SO","O","NO"], is: "est à",  secretCity: "la ville secrète", of: "de" },
  de: { dirs: ["N","NO","O","SO","S","SW","W","NW"], is: "liegt",  secretCity: "der geheimen Stadt", of: "von" },
  es: { dirs: ["N","NE","E","SE","S","SO","O","NO"], is: "está al",  secretCity: "la ciudad secreta", of: "de" },
  pt: { dirs: ["N","NE","L","SE","S","SO","O","NO"], is: "fica a",  secretCity: "cidade secreta", of: "da" },
  ru: { dirs: ["С","СВ","В","ЮВ","Ю","ЮЗ","З","СЗ"], is: "находится к",  secretCity: "секретного города", of: "от" },
};

/* =================== Settings =================== */

const settings = loadSettings();

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { units: saved.units || "km", lang: saved.lang || "en" };
  } catch { return { units: "km", lang: "en" }; }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function t() {
  return I18N[settings.lang] || I18N.en;
}

function formatDistance(km) {
  if (settings.units === "mi") {
    return `${Math.round(km * 0.621371).toLocaleString()} mi`;
  }
  return `${km.toLocaleString()} km`;
}

function compassDirLabel(bearing) {
  const idx = Math.round(bearing / 45) % 8;
  return t().dirs[idx];
}

/* =================== City lookups =================== */

const cityNames = CITY_DATA.map((row) => row[0]);

const cityByName = {};
CITY_DATA.forEach(([name, lat, lon, cc]) => {
  cityByName[name] = { name, lat, lon, cc };
});

/* =================== Utilities =================== */

function normalize(str) { return str.trim().toLowerCase(); }

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return "";
  const base = 0x1f1e6 - "A".charCodeAt(0);
  return iso2.toUpperCase().split("").map((ch) => String.fromCodePoint(base + ch.charCodeAt(0))).join("");
}

/* =================== Geo math =================== */

function toRad(deg) { return (deg * Math.PI) / 180; }

// Great-circle bearing from one point to another, 0–360° clockwise from north.
function bearingDegrees(fromLat, fromLon, toLat, toLon) {
  const lat1 = toRad(fromLat), lat2 = toRad(toLat);
  const dLon = toRad(toLon - fromLon);
  const x = Math.sin(dLon) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* =================== Seeded RNG =================== */

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}

function shuffleWithRng(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* =================== Daily attempt persistence =================== */

function dailyKey(ymd) { return DAILY_STORAGE_PREFIX + ymd; }

function loadDailyAttempt(ymd) {
  try { const r = localStorage.getItem(dailyKey(ymd)); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

function saveDailyAttempt(ymd, data) {
  localStorage.setItem(dailyKey(ymd), JSON.stringify(data));
}

/* =================== App state =================== */

const app = {
  mode: null,           // "daily" | "freeplay"
  difficulty: "medium",
  secret: null,
  pool: [],             // shuffled city name list (clue source for pool-draw rounds)
  round: 0,
  clues: [],            // { city, bearing, distanceKm }
  clueNames: [],        // parallel list — the name of each clue city as actually shown
  wrongGuesses: [],
  over: false,
  won: false,
};

let isSubmitting = false;

/* =================== DOM references =================== */

const el = (id) => document.getElementById(id);

const menuScreen    = el("menu-screen");
const gameScreen    = el("game-screen");
const statusLine    = el("status-line");
const modePill      = el("mode-pill");
const progressSteps = el("progress-steps");
const clueChipList  = el("clue-chip-list");
const compassSvg    = el("compass-svg");
const guessInput    = el("guess-input");
const suggestionsBox= el("suggestions");
const messageEl     = el("message");
const buttonRow     = el("button-row");
const endScreen     = el("end-screen");
const endIcon       = el("end-icon");
const endTitle      = el("end-title");
const endSubtitle   = el("end-subtitle");
const guessedChips  = el("guessed-chips");
const shareRow      = el("share-row");
const shareBtn      = el("share-btn");
const dailyStatusEl = el("daily-status");

/* =================== Modal helpers =================== */

function openModal(overlayId) { el(overlayId).classList.add("open"); }
function closeModal(overlayId) { el(overlayId).classList.remove("open"); }

el("how-to-play-btn").addEventListener("click", () => openModal("htp-overlay"));
el("htp-close").addEventListener("click",       () => closeModal("htp-overlay"));
el("htp-overlay").addEventListener("click", (e) => { if (e.target === el("htp-overlay")) closeModal("htp-overlay"); });

el("settings-btn").addEventListener("click",      () => { applySettingsUI(); openModal("settings-overlay"); });
el("settings-close").addEventListener("click",    () => closeModal("settings-overlay"));
el("settings-overlay").addEventListener("click", (e) => { if (e.target === el("settings-overlay")) closeModal("settings-overlay"); });

// Segmented controls: units
el("units-control").querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    settings.units = btn.dataset.value;
    saveSettings();
    el("units-control").querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
    if (!app.over && app.clues.length) renderClueChips(); // live update if in-game
  });
});

// Segmented controls: language
el("lang-control").querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    settings.lang = btn.dataset.value;
    saveSettings();
    el("lang-control").querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
    if (!app.over && app.clues.length) { renderClueChips(); renderCompass(); } // live update compass labels
  });
});

function applySettingsUI() {
  el("units-control").querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.value === settings.units));
  el("lang-control").querySelectorAll(".seg-btn").forEach((b)  => b.classList.toggle("active", b.dataset.value === settings.lang));
}

/* =================== Menu screen =================== */

function refreshDailyCard() {
  const attempt = loadDailyAttempt(todayYmd());
  if (!attempt) { dailyStatusEl.textContent = "Not played yet today."; return; }
  dailyStatusEl.textContent = attempt.won
    ? `Solved in ${attempt.rounds} clue${attempt.rounds !== 1 ? "s" : ""}. Tap to review.`
    : "Played today — didn't get it. Tap to review.";
}

function showMenu() {
  refreshDailyCard();
  menuScreen.style.display = "flex";
  gameScreen.style.display = "none";
}

el("daily-card").addEventListener("click", () => {
  const attempt = loadDailyAttempt(todayYmd());
  attempt ? resumeDailyAttempt(attempt) : startGame("daily", "medium");
});

document.querySelectorAll(".freeplay-row .menu-card").forEach((card) => {
  card.addEventListener("click", () => startGame("freeplay", card.dataset.level));
});

el("back-btn").addEventListener("click", showMenu);
el("menu-btn").addEventListener("click", showMenu);
el("title-link").addEventListener("click", showMenu);

/* =================== Starting a game =================== */

function startGame(mode, difficulty) {
  app.mode       = mode;
  app.difficulty = difficulty;
  app.over       = false;
  app.won        = false;
  app.round      = 0;
  app.clues      = [];
  app.clueNames  = [];
  app.wrongGuesses = [];

  const rng = mode === "daily" ? mulberry32(seedFromString(todayYmd())) : Math.random;
  const shuffled = shuffleWithRng(cityNames, rng);
  app.secret = cityByName[shuffled[0]];
  app.pool   = shuffled.slice(1);

  resetGameScreen();
  setModePill();
  revealNextClue();
  guessInput.focus();
}

function setModePill() {
  modePill.textContent = app.mode === "daily" ? "Daily · Medium" : DIFFICULTY[app.difficulty].label;
  modePill.className   = "mode-pill " + (app.mode === "daily" ? "daily" : app.difficulty);
}

function resetGameScreen() {
  menuScreen.style.display  = "none";
  gameScreen.style.display  = "block";
  endScreen.style.display   = "none";
  guessInput.style.display  = "";
  buttonRow.style.display   = "flex";
  guessInput.value          = "";
  messageEl.textContent     = "";
  suggestionsBox.style.display = "none";
}

/* =================== Resuming a daily attempt =================== */

// The saved attempt now stores `clueNames` — the exact cities shown each
// round — so we can replay the run accurately regardless of whether some
// clue cities came from wrong guesses rather than the pool.
function resumeDailyAttempt(attempt) {
  app.mode       = "daily";
  app.difficulty = "medium";
  app.over       = true;
  app.won        = attempt.won;
  app.round      = attempt.rounds;
  app.wrongGuesses = attempt.wrongGuesses || [];
  app.clueNames  = attempt.clueNames || [];

  const rng = mulberry32(seedFromString(todayYmd()));
  const shuffled = shuffleWithRng(cityNames, rng);
  app.secret = cityByName[shuffled[0]];
  app.pool   = shuffled.slice(1);

  // Rebuild clues from the saved city names. Fall back to pool slice if
  // clueNames is missing (e.g. saves from before this fix was deployed).
  const sourcesNames = app.clueNames.length
    ? app.clueNames
    : app.pool.slice(0, attempt.rounds);

  app.clues = sourcesNames.map((name) => buildClue(cityByName[name]));

  resetGameScreen();
  setModePill();
  statusLine.textContent = `Clue ${app.round} of ${MAX_CLUES}`;
  renderProgressSteps();
  renderCompass();
  renderClueChips();
  showEndScreen();
}

/* =================== Clue logic =================== */

function buildClue(city) {
  return {
    city,
    bearing:    bearingDegrees(app.secret.lat, app.secret.lon, city.lat, city.lon),
    distanceKm: haversineKm(app.secret.lat, app.secret.lon, city.lat, city.lon),
  };
}

// Reveals the next clue. `sourceCity` is the player's wrong-guessed city
// (which then becomes the clue city); if null, draw from the pool.
function revealNextClue(sourceCity = null) {
  app.round += 1;
  //const clueCity = sourceCity || cityByName[app.pool[app.round - 1]];

let clueCity;

  if (sourceCity) {
    clueCity = sourceCity;
  } else {
    if (app.difficulty === "hard") {
      // HARD MODE: pick random city from pool each time
      const randomIndex = Math.floor(Math.random() * app.pool.length);
      clueCity = cityByName[app.pool[randomIndex]];

      // remove it so it can't appear again
      app.pool.splice(randomIndex, 1);
    } else {
      // normal behaviour (sequential pool)
      clueCity = cityByName[app.pool[app.round - 1]];
    }
  }

  const clue = buildClue(clueCity);
  clue.id = app.round;

  app.clues.push(buildClue(clueCity));
  app.clueNames.push(clueCity.name); // record for accurate daily replay

  statusLine.textContent = `Clue ${app.round} of ${MAX_CLUES}`;
  renderProgressSteps();
  renderCompass();
  renderClueChips();
}

/* =================== Progress pips =================== */

function renderProgressSteps() {
  progressSteps.innerHTML = "";
  for (let i = 1; i <= MAX_CLUES; i++) {
    const step = document.createElement("div");
    step.classList.add("progress-step");
    if (i <= app.round) {
      step.classList.add("filled", i <= 3 ? "green" : i <= 6 ? "yellow" : "red");
    }
    progressSteps.appendChild(step);
  }
}

/* =================== Compass rendering =================== */

const VIEWBOX_WIDTH  = 720;
const VIEWBOX_HEIGHT = 640;
const CX = VIEWBOX_WIDTH  / 2;  // compass centre X
const CY = VIEWBOX_HEIGHT / 2;  // compass centre Y
const OUTER_R = 250;             // outer radius of compass face
const RING_RADII = [25, 75, 125, 175, 225];
const TICK_OFFSET = 60;          // gap between outer ring and N/E/S/W labels

const ARROW_BASE_R  = OUTER_R - 20;  // clue arrows tip at this radius (lane 0)
const ARROW_LANE_GAP = 14;      // extra radius per lane for clustered arrows
const LABEL_GAP     = 40;       // extra gap from arrow tip to label anchor

const LABEL_CHAR_W  = 12;       // estimated px per character at font-size 20
const LABEL_FLAG_W  = 26;       // estimated px for a flag emoji

function renderCompass() {
  const placements = resolveCluePlacements(app.clues);

  const parts = [
    renderCompassRings(),
    renderCompassSpokes(),
    renderCompassTicks(),
    renderArrowMarker(),
    `<circle class="center-dot" cx="${CX}" cy="${CY}" r="6"></circle>`,
    ...app.clues.map((clue, i) => renderClueArrow(clue, placements[i])),
  ];

  compassSvg.setAttribute("viewBox", `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
  compassSvg.innerHTML = parts.join("");
}

function renderCompassRings() {
  return RING_RADII.map((r) =>
    `<circle class="ring" cx="${CX}" cy="${CY}" r="${r}"></circle>`
  ).join("");
}

function renderCompassSpokes() {
  return [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
    const rad = toRad(angle);
    return `<line x1="${CX}" y1="${CY}"
      x2="${CX + Math.sin(rad)*OUTER_R}" y2="${CY - Math.cos(rad)*OUTER_R}"
      stroke="rgba(255,255,255,0.25)" stroke-width="${angle % 90 === 0 ? 1 : 0.5}"></line>`;
  }).join("");
}

function renderCompassTicks() {
  const d = OUTER_R / Math.SQRT2;
  const dd = TICK_OFFSET * Math.SQRT2 * 0.7;
  const dirs = t().dirs;
  const pts = [
    { label: dirs[0], x: CX,       y: CY - OUTER_R - TICK_OFFSET },
    { label: dirs[1], x: CX+d+dd,  y: CY - d - dd },
    { label: dirs[2], x: CX+OUTER_R+TICK_OFFSET, y: CY + 4 },
    { label: dirs[3], x: CX+d+dd,  y: CY + d + dd },
    { label: dirs[4], x: CX,       y: CY + OUTER_R + TICK_OFFSET + 4 },
    { label: dirs[5], x: CX-d-dd,  y: CY + d + dd },
    { label: dirs[6], x: CX-OUTER_R-TICK_OFFSET, y: CY + 4 },
    { label: dirs[7], x: CX-d-dd,  y: CY - d - dd },
  ];
  return pts.map((p) =>
    `<text class="compass-dir-text" x="${p.x}" y="${p.y}" text-anchor="middle">${p.label}</text>`
  ).join("");
}

function renderArrowMarker() {
  return `<defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <polygon points="0 0,7 3,0 6" fill="white"></polygon>
    </marker>
  </defs>`;
}

function renderClueArrow(clue, placement) {
  const rad = toRad(placement.bearing);
  const dx = Math.sin(rad), dy = -Math.cos(rad);

  const x2 = CX + dx * placement.arrowRadius;
  const y2 = CY + dy * placement.arrowRadius;

  const lx = CX + dx * placement.labelRadius;
  const ly = CY + dy * placement.labelRadius;

  const showFlag = DIFFICULTY[app.difficulty].showFlag || app.mode === "daily";
  const flag = showFlag ? flagEmoji(clue.city.cc) : "";
  const text = (flag ? flag + " " : "") + clue.city.name;

  return `
    <line class="clue-line"
      x1="${CX}" y1="${CY}"
      x2="${x2}" y2="${y2}"
      marker-end="url(#arrowhead)"></line>

    <text class="clue-label"
      x="${lx}" y="${ly}"
      text-anchor="middle"
      dominant-baseline="middle">
      ${escapeXml(text)}
    </text>
  `;
}

/* ---- Label collision / lane resolution ---- */


// Each clue is placed in a "lane" (radius tier). Labels always sit at their
// arrow's true bearing; only the radius changes to avoid overlap.
function resolveCluePlacements(clues) {
  const items = clues
    .map((clue, idx) => ({
      idx,
      bearing: clue.bearing
    }))
    .sort((a, b) => a.bearing - b.bearing);

  const BUCKET_SIZE = 45;
  const buckets = Array.from({ length: 8 }, () => []);

  items.forEach((item) => {
    const bucketIndex = Math.floor(((item.bearing + 360) % 360) / BUCKET_SIZE);
    buckets[bucketIndex].push(item);
  });

  const placements = new Array(clues.length);

  buckets.forEach((bucket, bIndex) => {
    bucket.forEach((item, i) => {

      const lane = i;

      const arrowRadius = ARROW_BASE_R + lane * ARROW_LANE_GAP;

      // 👉 FIX #1: label is always further out than arrow
      const labelRadius = arrowRadius + LABEL_GAP + 18;

      // 👉 FIX #2: tiny deterministic angular offset per item
      // (prevents arrows landing exactly under text centers)
      const jitter = (i - (bucket.length - 1) / 2) * 2.5; // degrees
      const bearing = item.bearing + jitter;

      placements[item.idx] = {
        bearing,
        arrowRadius,
        labelRadius
      };
    });
  });

  return placements;
}

/* =================== Clue chip list =================== */

function renderClueChips() {
  clueChipList.innerHTML = "";

  const showFlag     = DIFFICULTY[app.difficulty].showFlag || app.mode === "daily";
  const showDistance = DIFFICULTY[app.difficulty].showDistance && app.mode !== "daily";
  const lang         = t();

  app.clues.forEach((clue) => {
    const dir     = compassDirLabel(clue.bearing);
    const deg     = Math.round(clue.bearing);
    const flagHtml = showFlag ? `<span class="flag">${flagEmoji(clue.city.cc)}</span>` : "";
    const distHtml = showDistance ? `<span class="chip-dist">${formatDistance(clue.distanceKm)}</span>` : "";

    // "The secret city is NE (47°) of Tokyo"
    const chipText =
  `<strong>${clue.city.name}</strong> ${lang.is} ` +
  `<span class="chip-dir">${dir} (${deg}°)</span> ` +
  `${lang.of} ${lang.secretCity}`;

    const row = document.createElement("div");
    row.className = "clue-chip";
    row.innerHTML = `${flagHtml}<span class="chip-text">${chipText}</span>${distHtml}`;
    clueChipList.appendChild(row);
  });
}

/* =================== Autocomplete =================== */

let highlightedIndex = -1;
let currentMatches = [];

function showSuggestions(query) {
  if (!query) { suggestionsBox.style.display = "none"; currentMatches = []; return; }

  const q = normalize(query);
  currentMatches = cityNames.filter((n) => normalize(n).includes(q)).slice(0, 7);
  highlightedIndex = -1;

  if (!currentMatches.length) { suggestionsBox.style.display = "none"; return; }

  // Show flags in suggestions only when the current mode/difficulty shows them in clues
  const showFlagInSuggestions = (app.difficulty !== "hard") || (app.mode === "daily");

  suggestionsBox.innerHTML = "";
  currentMatches.forEach((name) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    const flag = showFlagInSuggestions ? `<span>${flagEmoji(cityByName[name].cc)}</span>` : "";
    item.innerHTML = `${flag}<span>${name}</span>`;
    item.addEventListener("click", () => chooseSuggestion(name));
    suggestionsBox.appendChild(item);
  });
  suggestionsBox.style.display = "block";
}

function chooseSuggestion(name) {
  guessInput.value = name;
  guessInput.blur();
  suggestionsBox.style.display = "none";
  setTimeout(submitGuess, 0);
}

function updateHighlight(items) {
  items.forEach((it, i) => it.classList.toggle("highlighted", i === highlightedIndex));
  if (items[highlightedIndex]) items[highlightedIndex].scrollIntoView({ block: "nearest" });
}

guessInput.addEventListener("input", (e) => showSuggestions(e.target.value));

guessInput.addEventListener("keydown", (e) => {
  const items = suggestionsBox.querySelectorAll(".suggestion-item");
  if (e.key === "ArrowDown" && items.length) {
    e.preventDefault(); highlightedIndex = Math.min(highlightedIndex+1, items.length-1); updateHighlight(items);
  } else if (e.key === "ArrowUp" && items.length) {
    e.preventDefault(); highlightedIndex = Math.max(highlightedIndex-1, 0); updateHighlight(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (highlightedIndex >= 0 && currentMatches[highlightedIndex]) guessInput.value = currentMatches[highlightedIndex];
    guessInput.blur(); suggestionsBox.style.display = "none"; setTimeout(submitGuess, 0);
  } else if (e.key === "Escape") {
    suggestionsBox.style.display = "none";
  }
});

guessInput.addEventListener("blur", () => { setTimeout(() => { suggestionsBox.style.display = "none"; }, 150); });

/* =================== Guess submission =================== */

el("submit-btn").addEventListener("click", submitGuess);
el("giveup-btn").addEventListener("click", () => endGame(false));
el("play-again-btn").addEventListener("click", () => startGame(app.mode, app.difficulty));

function submitGuess() {
  if (app.over || isSubmitting) return;
  const raw = guessInput.value.trim();
  if (!raw) return;
  isSubmitting = true;
  try { handleGuess(raw); } finally { isSubmitting = false; }
}

function handleGuess(raw) {
  const key = normalize(raw);

  if (key === normalize(app.secret.name)) { endGame(true); return; }

  const guessedCity = cityNames.map((n) => cityByName[n]).find((c) => normalize(c.name) === key);
  if (!guessedCity) {
    messageEl.textContent = "Not a city in the list — try again.";
    messageEl.className = "message hint";
    return;
  }

  app.wrongGuesses.push(raw);
  messageEl.textContent = `${raw} isn't the secret city.`;
  messageEl.className = "message wrong";
  guessInput.value = "";

  if (app.round >= MAX_CLUES) { endGame(false); return; }
  if (app.difficulty === "hard") {
    revealNextClue(null);
  } else {
    revealNextClue(guessedCity);
}
}

/* =================== End game =================== */

function endGame(won) {
  app.over = true;
  app.won  = won;

  if (app.mode === "daily") {
    saveDailyAttempt(todayYmd(), {
      won,
      rounds:       app.round,
      wrongGuesses: app.wrongGuesses,
      clueNames:    app.clueNames, // ← saved so replay is accurate
    });
  }

  showEndScreen();
}

function showEndScreen() {
  guessInput.style.display = "none";
  buttonRow.style.display  = "none";
  suggestionsBox.style.display = "none";
  messageEl.textContent = "";

  endIcon.textContent    = app.won ? "🎉" : "📍";
  endTitle.textContent   = app.won ? `It was ${app.secret.name}!` : `The secret city was ${app.secret.name}`;
  endSubtitle.textContent = app.won
    ? `Solved in ${app.round} clue${app.round !== 1 ? "s" : ""}.`
    : "Better luck next time.";

  guessedChips.innerHTML = "";
  app.wrongGuesses.forEach((g) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = g;
    guessedChips.appendChild(chip);
  });

  shareRow.style.display = app.mode === "daily" ? "flex" : "none";
  endScreen.style.display = "block";
}

/* =================== Share =================== */

function buildShareText() {
  const ymd = todayYmd();
  const date = `${ymd.slice(6,8)}-${ymd.slice(4,6)}-${ymd.slice(0,4)}`;
  const result = app.won ? `solved in ${app.round}/${MAX_CLUES}` : `unsolved (${MAX_CLUES}/${MAX_CLUES})`;
  const pips = Array.from({ length: MAX_CLUES }, (_, i) =>
    i < app.round ? (app.won && i === app.round - 1 ? "🟢" : "🔵") : "⚪"
  ).join("");
  return `Citadle ${date}\n${result}\n${pips}\nGive it a go for yourself: https://harryst09.github.io/Citadle/`;
}

shareBtn.addEventListener("click", async () => {
  const text = buildShareText();
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch {}
  }
  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "Copied!";
    setTimeout(() => { shareBtn.textContent = "Share result"; }, 1800);
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
});

/* =================== Init =================== */

showMenu();
