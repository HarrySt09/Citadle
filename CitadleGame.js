/* ===========================================================
   Citydle game logic
   Expects CITY_DATA from CitydleData.js:
   const CITY_DATA = [ [name, lat, lon, iso2], ... ]
   =========================================================== */

const MAX_CLUES = 8;

const DIFFICULTY = {
  easy:   { label: "Easy",   showFlag: true,  showDistance: true  },
  medium: { label: "Medium", showFlag: true,  showDistance: false },
  hard:   { label: "Hard",   showFlag: false, showDistance: false },
};

// Build lookups
const cityNames = CITY_DATA.map((c) => c[0]);
const cityByName = {};
CITY_DATA.forEach((c) => { cityByName[c[0]] = { name: c[0], lat: c[1], lon: c[2], cc: c[3] }; });

/* ---------------- Flag emoji from ISO-2 code ---------------- */
function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const base = "A".charCodeAt(0);
  const chars = iso2.toUpperCase().split("").map((ch) => String.fromCodePoint(A + (ch.charCodeAt(0) - base)));
  return chars.join("");
}

/* ---------------- Geo math ---------------- */
function toRad(d) { return (d * Math.PI) / 180; }

function bearingDegrees(fromLat, fromLon, toLat, toLon) {
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const dLon = toRad(toLon - fromLon);
  const x = Math.sin(dLon) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(x, y) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const COMPASS_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function compassLabelFromBearing(bearing) {
  const idx = Math.round(bearing / 45) % 8;
  return COMPASS_LABELS[idx];
}

function normalize(s) { return s.trim().toLowerCase(); }

/* ---------------- Seeded RNG (for daily mode) ---------------- */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailySeedToday() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  let hash = 0;
  for (let i = 0; i < ymd.length; i++) {
    hash = (hash << 5) - hash + ymd.charCodeAt(i);
    hash |= 0;
  }
  return { seed: hash, ymd };
}

function shuffleWithRng(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- App state ---------------- */
let app = {
  mode: null,        // "daily" | "freeplay"
  difficulty: "medium",
  secret: null,
  pool: [],
  round: 0,
  clues: [],          // { city, bearing, distanceKm }
  wrongGuesses: [],
  guessedCities: [],
  over: false,
};

let submitting = false;

/* ---------------- DOM refs ---------------- */
const el = (id) => document.getElementById(id);
const menuScreen = el("menu-screen");
const gameScreen = el("game-screen");
const statusLine = el("status-line");
const modePill = el("mode-pill");
const progressFill = el("progress-fill");
const clueChipList = el("clue-chip-list");
const compassSvg = el("compass-svg");
const guessInput = el("guess-input");
const suggestionsBox = el("suggestions");
const messageEl = el("message");
const endScreen = el("end-screen");
const endIcon = el("end-icon");
const endTitle = el("end-title");
const endSubtitle = el("end-subtitle");
const guessedChips = el("guessed-chips");
const dailyStatusEl = el("daily-status");

/* ---------------- Menu wiring ---------------- */
function checkDailyCompletion() {
  const { ymd } = dailySeedToday();
  const saved = localStorage.getItem("geowordle_daily_" + ymd);
  if (saved) {
    const data = JSON.parse(saved);
    dailyStatusEl.textContent = data.won
      ? `Completed today in ${data.rounds} clue${data.rounds > 1 ? "s" : ""}.`
      : "Played today - didn't solve it.";
  } else {
    dailyStatusEl.textContent = "Not played yet today.";
  }
}
checkDailyCompletion();

el("daily-card").addEventListener("click", () => startGame("daily", "medium"));
document.querySelectorAll(".freeplay-row .menu-card").forEach((card) => {
  card.addEventListener("click", () => startGame("freeplay", card.dataset.level));
});
el("back-btn").addEventListener("click", showMenu);
el("menu-btn").addEventListener("click", showMenu);
el("title-link").addEventListener("click", showMenu);

function showMenu() {
  checkDailyCompletion();
  menuScreen.style.display = "flex";
  gameScreen.style.display = "none";
}

/* ---------------- Game start ---------------- */
function startGame(mode, difficulty) {
  app.mode = mode;
  app.difficulty = difficulty;
  app.over = false;
  app.round = 0;
  app.clues = [];
  app.wrongGuesses = [];

  let names, rng;
  if (mode === "daily") {
    const { seed } = dailySeedToday();
    rng = mulberry32(seed);
    names = shuffleWithRng(cityNames, rng);
  } else {
    rng = Math.random;
    names = shuffleWithRng(cityNames, rng);
  }

  const secretName = names[0];
  app.secret = cityByName[secretName];
  app.pool = names.slice(1);

  menuScreen.style.display = "none";
  gameScreen.style.display = "block";
  endScreen.style.display = "none";
  guessInput.style.display = "";
  document.querySelector(".button-row").style.display = "flex";
  guessInput.value = "";
  messageEl.textContent = "";
  suggestionsBox.style.display = "none";

  modePill.textContent = mode === "daily" ? "Daily · Medium" : DIFFICULTY[difficulty].label;
  modePill.className = "mode-pill " + (mode === "daily" ? "daily" : difficulty);

  revealNextClue();
  guessInput.focus();
}

/* ---------------- Clue logic ---------------- */
function revealNextClue(sourceCity = null) {
  app.round += 1;
  let clueCity;

  if (sourceCity) {
    clueCity = sourceCity;
  } else {
    const clueCityName = app.pool[app.round - 1];
    clueCity = cityByName[clueCityName];
  }
  const bearing = bearingDegrees(app.secret.lat, app.secret.lon, clueCity.lat, clueCity.lon);
  const distanceKm = haversineKm(app.secret.lat, app.secret.lon, clueCity.lat, clueCity.lon);
  app.clues.push({ city: clueCity, bearing, distanceKm });

  statusLine.textContent = `Clue ${app.round} of ${MAX_CLUES}`;
  progressFill.style.width = `${(app.round / MAX_CLUES) * 100}%`;

  renderCompass();
  renderClueChips();
}

/* ---------------- Compass / radar SVG rendering ---------------- */
function renderCompass() {
  const cx = 200, cy = 200;
  const maxR = 160;
  const ringRadii = [50, 95, 140];

  let svg = "";

  // background rings
  ringRadii.forEach((r) => {
    svg += `<circle class="ring" cx="${cx}" cy="${cy}" r="${r}"></circle>`;
  });

  // N/E/S/W tick labels
  const diagOffset = maxR/Math.SQRT2

  const compassPoints = [
    { label: "N", x: cx, y: cy - maxR - 28 },
    { label: "NE", x: cx + diagOffset + 28, y: cy - diagOffset - 28 },
    { label: "E", x: cx + maxR + 28, y: cy + 4 },
    { label: "SE", x: cx + diagOffset + 28, y: cy + diagOffset + 30 },
    { label: "S", x: cx, y: cy + maxR + 30 },
    { label: "SW", x: cx - diagOffset - 28, y: cy + diagOffset + 30 },
    { label: "W", x: cx - maxR - 28, y: cy + 4 },
    { label: "NW", x: cx - diagOffset - 28, y: cy - diagOffset - 28 },
  ];
  compassPoints.forEach((p) => {
    svg += `<text class="compass-dir-text" x="${p.x}" y="${p.y}" text-anchor="middle">${p.label}</text>`;
  });

  // center dot (secret city)
  svg += `<circle class="center-dot" cx="${cx}" cy="${cy}" r="4"></circle>`;

  // arrowhead marker def
  svg += `<defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
      <polygon points="0 0, 7 3, 0 6" fill="white"></polygon>
    </marker>
  </defs>`;

    // ---------------- compass spokes ----------------
  const outerR = maxR;

  const directions = [
    { angle: 0,   thick: true },   // N
    { angle: 45,  thick: false },  // NE
    { angle: 90,  thick: true },   // E
    { angle: 135, thick: false },  // SE
    { angle: 180, thick: true },   // S
    { angle: 225, thick: false },  // SW
    { angle: 270, thick: true },   // W
    { angle: 315, thick: false },  // NW
  ];

  directions.forEach(({ angle, thick }) => {
    const rad = toRad(angle);

    const x2 = cx + Math.sin(rad) * outerR;
    const y2 = cy - Math.cos(rad) * outerR;

    svg += `
      <line
        x1="${cx}"
        y1="${cy}"
        x2="${x2}"
        y2="${y2}"
        stroke="rgba(255,255,255,0.25)"
        stroke-width="${thick ? 1 : 0.5}"
      />
    `;
  });

  // one arrow per clue, evenly distributed radius so they don't all overlap at edge
  const n = app.clues.length;
  app.clues.forEach((clue, i) => {
    // bearing: direction FROM clue city TO secret. We draw the arrow pointing
    // FROM the perimeter (clue city's implied position) TOWARD the center,
    // i.e. arrow shows "this is the direction you'd travel to reach the secret",
    // visualised as a ray from center outward in the *opposite* compass sense
    // so the arrowhead sits at the ring and the label sits beyond it,
    // representing "the clue city is over there, and the secret is this way from it".
    const angleRad = toRad(clue.bearing);
    // SVG y-axis is inverted vs compass bearing (N = up = -y)
    const dx = Math.sin(angleRad);
    const dy = -Math.cos(angleRad);

    const r = maxR - 45;

    const x2 = cx + dx * r;
    const y2 = cy + dy * r;
    const labelRadius = maxR + 12;
    const labelX = cx + dx * labelRadius;
    const labelY = cy + dy * labelRadius;

    svg += `<line class="clue-line" x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" marker-end="url(#arrowhead)"></line>`;

    const flag = DIFFICULTY[app.difficulty].showFlag || app.mode === "daily" ? flagEmoji(clue.city.cc) : "";
    const labelText = `${flag ? flag + " " : ""}${clue.city.name}`;

    svg += `<text class="clue-label" x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle">${escapeXml(labelText)}</text>`;
  });

  compassSvg.innerHTML = svg;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------------- Clue chip list (text fallback / detail row) ---------------- */
function renderClueChips() {
  clueChipList.innerHTML = "";
  const showFlag = DIFFICULTY[app.difficulty].showFlag || app.mode === "daily";
  const showDistance = DIFFICULTY[app.difficulty].showDistance && app.mode !== "daily";

  app.clues.forEach((clue) => {
    const row = document.createElement("div");
    row.className = "clue-chip";
    const dirLabel = compassLabelFromBearing(clue.bearing);
    row.innerHTML = `
      ${showFlag ? `<span class="flag">${flagEmoji(clue.city.cc)}</span>` : ""}
      <span class="city-name">${clue.city.name}</span>
      <span style="color:var(--text-secondary);">is</span>
      <span class="arrow">${dirLabel}\u00A0${Math.round(clue.bearing)}°
      ${showDistance ? `<span class="extra">${clue.distanceKm.toLocaleString()} km away</span>` : ""}
    `;
    clueChipList.appendChild(row);
  });
}

/* ---------------- Autocomplete ---------------- */
let highlightedIndex = -1;
let currentMatches = [];

function showSuggestions(query) {
  if (!query) { suggestionsBox.style.display = "none"; currentMatches = []; return; }
  const q = normalize(query);
  currentMatches = cityNames.filter((n) => normalize(n).includes(q)).slice(0, 7);
  highlightedIndex = -1;
  if (currentMatches.length === 0) { suggestionsBox.style.display = "none"; return; }

  suggestionsBox.innerHTML = "";
  currentMatches.forEach((name) => {
    const cc = cityByName[name].cc;
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.innerHTML = `<span>${flagEmoji(cc)}</span><span>${name}</span>`;
    item.addEventListener("click", () => {
      guessInput.value = name;

      // force blur so ONLY ONE path triggers
      guessInput.blur();

      suggestionsBox.style.display = "none";

      setTimeout(() => {
        submitGuess();
      }, 0);
    });
    suggestionsBox.appendChild(item);
  });
  suggestionsBox.style.display = "block";
}

guessInput.addEventListener("input", (e) => showSuggestions(e.target.value));

guessInput.addEventListener("keydown", (e) => {
  const items = suggestionsBox.querySelectorAll(".suggestion-item");
  if (e.key === "ArrowDown" && items.length) {
    e.preventDefault();
    highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
    updateHighlight(items);
  } else if (e.key === "ArrowUp" && items.length) {
    e.preventDefault();
    highlightedIndex = Math.max(highlightedIndex - 1, 0);
    updateHighlight(items);
  } else if (e.key === "Enter") {
    e.preventDefault();

    if (highlightedIndex >= 0 && currentMatches[highlightedIndex]) {
      guessInput.value = currentMatches[highlightedIndex];
    }

    guessInput.blur();
    suggestionsBox.style.display = "none";

    setTimeout(() => {
      submitGuess();
    }, 0);
  }
    
    else if (e.key === "Escape") {
    suggestionsBox.style.display = "none";
  }
});

function updateHighlight(items) {
  items.forEach((it, idx) => it.classList.toggle("highlighted", idx === highlightedIndex));
  if (items[highlightedIndex]) items[highlightedIndex].scrollIntoView({ block: "nearest" });
}

guessInput.addEventListener("blur", () => {
  setTimeout(() => { suggestionsBox.style.display = "none"; }, 150);
});

/* ---------------- Guess submission ---------------- */
el("submit-btn").addEventListener("click", submitGuess);
el("giveup-btn").addEventListener("click", () => endGame(false));
el("play-again-btn").addEventListener("click", () => startGame(app.mode, app.difficulty));

function submitGuess() {

  console.log("submitGuess fired:", guessInput.value, performance.now());

  if (app.over || submitting) return;

  const guessRaw = guessInput.value.trim();
  if (!guessRaw) return;

  submitting = true;

  try {
  const guess = guessInput.value;
  if (!normalize(guess)) return;

  if (normalize(guess) === normalize(app.secret.name)) {
    endGame(true);
    return;
  }

const guessRaw = guessInput.value.trim();
const guessKey = normalize(guessRaw);

const guessedCity = cityNames
  .map(name => cityByName[name])
  .find(c => normalize(c.name) === guessKey);

if (!guessedCity) {
  messageEl.textContent = "Not a city in the list — try again.";
  messageEl.className = "message hint";
  return;
}

app.wrongGuesses.push(guessRaw);
app.guessedCities.push(guessRaw);

messageEl.textContent = `${guessRaw} isn't it.`;
messageEl.className = "message wrong";
guessInput.value = "";

if (app.round >= MAX_CLUES) {
  endGame(false);
  return;
}

if (guessedCity) {
  revealNextClue(guessedCity);
} else {
  revealNextClue();
}
} finally {
    submitting = false;
  }
}

/* ---------------- End game ---------------- */
function endGame(won) {
  app.over = true;
  guessInput.style.display = "none";
  document.querySelector(".button-row").style.display = "none";
  suggestionsBox.style.display = "none";
  messageEl.textContent = "";

  if (won) {
    endIcon.textContent = "🎉";
    endTitle.textContent = `It was ${app.secret.name}!`;
    endSubtitle.textContent = `Solved in ${app.round} clue${app.round > 1 ? "s" : ""}.`;
  } else {
    endIcon.textContent = "📍";
    endTitle.textContent = `The secret city was ${app.secret.name}`;
    endSubtitle.textContent = "Better luck next round.";
  }

  guessedChips.innerHTML = "";
  app.wrongGuesses.forEach((g) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = g;
    guessedChips.appendChild(chip);
  });

  if (app.mode === "daily") {
    const { ymd } = dailySeedToday();
    localStorage.setItem(
      "geowordle_daily_" + ymd,
      JSON.stringify({ won, rounds: app.round })
    );
  }

  endScreen.style.display = "block";
}

/* ---------------- Init ---------------- */
showMenu();