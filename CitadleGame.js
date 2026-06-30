/* ===========================================================
   Citadle — game logic
   Expects CITY_DATA from CitadleData.js:
     const CITY_DATA = [ [name, lat, lon, iso2], ... ]
   =========================================================== */

const MAX_CLUES = 8;
const DAILY_STORAGE_PREFIX = "citadle_daily_";

const DIFFICULTY = {
  easy:   { label: "Easy",   showFlag: true,  showDistance: true  },
  medium: { label: "Medium", showFlag: true,  showDistance: false },
  hard:   { label: "Hard",   showFlag: false, showDistance: false },
};

/* =================== City lookups =================== */

const cityNames = CITY_DATA.map((row) => row[0]);

const cityByName = {};
CITY_DATA.forEach(([name, lat, lon, cc]) => {
  cityByName[name] = { name, lat, lon, cc };
});

/* =================== Small utilities =================== */

function normalize(str) {
  return str.trim().toLowerCase();
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return "";
  const codePointA = 0x1f1e6;
  const letterA = "A".charCodeAt(0);
  return iso2
    .toUpperCase()
    .split("")
    .map((ch) => String.fromCodePoint(codePointA + (ch.charCodeAt(0) - letterA)))
    .join("");
}

/* =================== Geo math =================== */

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// Bearing (0-360) from one coordinate to another, measured clockwise from north.
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

/* =================== Seeded RNG (daily mode) =================== */

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayYmd() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function shuffleWithRng(arr, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* =================== Daily attempt persistence =================== */

function dailyStorageKey(ymd) {
  return DAILY_STORAGE_PREFIX + ymd;
}

function loadDailyAttempt(ymd) {
  const raw = localStorage.getItem(dailyStorageKey(ymd));
  return raw ? JSON.parse(raw) : null;
}

function saveDailyAttempt(ymd, attempt) {
  localStorage.setItem(dailyStorageKey(ymd), JSON.stringify(attempt));
}

/* =================== App state =================== */

const app = {
  mode: null,           // "daily" | "freeplay"
  difficulty: "medium",
  secret: null,
  pool: [],              // remaining city names available as future clues
  round: 0,
  clues: [],             // { city, bearing, distanceKm }
  wrongGuesses: [],
  over: false,
  won: false,
};

let isSubmitting = false;

/* =================== DOM references =================== */

const el = (id) => document.getElementById(id);

const menuScreen = el("menu-screen");
const gameScreen = el("game-screen");
const statusLine = el("status-line");
const modePill = el("mode-pill");
const progressSteps = el("progress-steps");
const clueChipList = el("clue-chip-list");
const compassSvg = el("compass-svg");
const guessInput = el("guess-input");
const suggestionsBox = el("suggestions");
const messageEl = el("message");
const buttonRow = el("button-row");
const endScreen = el("end-screen");
const endIcon = el("end-icon");
const endTitle = el("end-title");
const endSubtitle = el("end-subtitle");
const guessedChips = el("guessed-chips");
const shareRow = el("share-row");
const shareBtn = el("share-btn");
const dailyStatusEl = el("daily-status");

/* =================== Menu screen =================== */

function refreshDailyCard() {
  const ymd = todayYmd();
  const attempt = loadDailyAttempt(ymd);

  if (!attempt) {
    dailyStatusEl.textContent = "Not played yet today.";
    return;
  }

  dailyStatusEl.textContent = attempt.won
    ? `Completed today in ${attempt.rounds} clue${attempt.rounds > 1 ? "s" : ""}. Tap to review.`
    : "Played today — didn't solve it. Tap to review.";
}

function showMenu() {
  refreshDailyCard();
  menuScreen.style.display = "flex";
  gameScreen.style.display = "none";
}

el("daily-card").addEventListener("click", () => {
  const ymd = todayYmd();
  const attempt = loadDailyAttempt(ymd);
  if (attempt) {
    resumeDailyAttempt(attempt);
  } else {
    startGame("daily", "medium");
  }
});

document.querySelectorAll(".freeplay-row .menu-card").forEach((card) => {
  card.addEventListener("click", () => startGame("freeplay", card.dataset.level));
});

el("back-btn").addEventListener("click", showMenu);
el("menu-btn").addEventListener("click", showMenu);
el("title-link").addEventListener("click", showMenu);

/* =================== Starting a new game =================== */

function startGame(mode, difficulty) {
  app.mode = mode;
  app.difficulty = difficulty;
  app.over = false;
  app.won = false;
  app.round = 0;
  app.clues = [];
  app.wrongGuesses = [];

  const rng = mode === "daily" ? mulberry32(seedFromString(todayYmd())) : Math.random;
  const shuffled = shuffleWithRng(cityNames, rng);

  app.secret = cityByName[shuffled[0]];
  app.pool = shuffled.slice(1);

  resetGameScreen();
  setModePill();
  revealNextClue();
  guessInput.focus();
}

function setModePill() {
  if (app.mode === "daily") {
    modePill.textContent = "Daily · Medium";
    modePill.className = "mode-pill daily";
  } else {
    modePill.textContent = DIFFICULTY[app.difficulty].label;
    modePill.className = "mode-pill " + app.difficulty;
  }
}

function resetGameScreen() {
  menuScreen.style.display = "none";
  gameScreen.style.display = "block";
  endScreen.style.display = "none";

  guessInput.style.display = "";
  buttonRow.style.display = "flex";
  guessInput.value = "";

  messageEl.textContent = "";
  suggestionsBox.style.display = "none";
}

/* =================== Resuming a finished daily attempt =================== */

// Replays a previously-completed daily run in read-only "review" form:
// reconstructs the clue sequence up to the point the player stopped.
function resumeDailyAttempt(attempt) {
  app.mode = "daily";
  app.difficulty = "medium";
  app.over = true;
  app.won = attempt.won;
  app.round = attempt.rounds;
  app.wrongGuesses = attempt.wrongGuesses || [];

  const rng = mulberry32(seedFromString(todayYmd()));
  const shuffled = shuffleWithRng(cityNames, rng);
  app.secret = cityByName[shuffled[0]];
  app.pool = shuffled.slice(1);

  app.clues = app.pool.slice(0, attempt.rounds).map((name) => buildClue(cityByName[name]));

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
    bearing: bearingDegrees(app.secret.lat, app.secret.lon, city.lat, city.lon),
    distanceKm: haversineKm(app.secret.lat, app.secret.lon, city.lat, city.lon),
  };
}

// Reveals the next clue. If `sourceCity` is given (the player's most recent
// wrong guess), that city becomes the clue; otherwise a fresh city is pulled
// from the shuffled pool.
function revealNextClue(sourceCity = null) {
  app.round += 1;

  const clueCity = sourceCity || cityByName[app.pool[app.round - 1]];
  app.clues.push(buildClue(clueCity));

  statusLine.textContent = `Clue ${app.round} of ${MAX_CLUES}`;
  renderProgressSteps();
  renderCompass();
  renderClueChips();
}

/* =================== Progress steps (8 discrete pips) =================== */

function renderProgressSteps() {
  progressSteps.innerHTML = "";
  for (let i = 1; i <= MAX_CLUES; i++) {
    const step = document.createElement("div");
    step.className = "progress-step" + (i <= app.round ? " filled" : "");
    progressSteps.appendChild(step);
  }
}

/* =================== Compass rendering =================== */

// The SVG viewBox is wider than the compass face itself so that long city
// names (e.g. "Mogadishu") have room to render fully without being clipped,
// even when anchored near due east/west.
const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 640;
const COMPASS_CENTER_X = VIEWBOX_WIDTH / 2;
const COMPASS_CENTER_Y = VIEWBOX_HEIGHT / 2;
const COMPASS_OUTER_RADIUS = 250;
const COMPASS_RING_RADII = [25, 75, 125, 175, 225];
const TICK_LABEL_OFFSET = 60;

// Clue arrow tips sit on a base radius; when several arrows point in nearly
// the same direction, later ones are pushed to a slightly larger radius
// ("lane") rather than having their angle changed, so each label still
// reads as belonging to its own arrow.
const ARROW_BASE_RADIUS = COMPASS_OUTER_RADIUS;
const ARROW_LANE_GAP = 14;
const LABEL_GAP_FROM_ARROW = 30;

// Rough width (in px) of one character at the clue-label font size, used to
// estimate label width for collision/clipping checks without touching the DOM.
const LABEL_CHAR_WIDTH = 6.4;
const LABEL_FLAG_WIDTH = 20;

function renderCompass() {
  const parts = [];

  parts.push(renderCompassRings());
  parts.push(renderCompassSpokes());
  parts.push(renderCompassTicks());
  parts.push(renderArrowheadMarker());
  parts.push(`<circle class="center-dot" cx="${COMPASS_CENTER_X}" cy="${COMPASS_CENTER_Y}" r="4"></circle>`);

  const placements = resolveCluePlacements(app.clues);
  app.clues.forEach((clue, i) => {
    parts.push(renderClueArrow(clue, placements[i]));
  });

  compassSvg.setAttribute("viewBox", `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
  compassSvg.innerHTML = parts.join("");
}

function renderCompassRings() {
  return COMPASS_RING_RADII
    .map((r) => `<circle class="ring" cx="${COMPASS_CENTER_X}" cy="${COMPASS_CENTER_Y}" r="${r}"></circle>`)
    .join("");
}

function renderCompassSpokes() {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return angles
    .map((angle) => {
      const rad = toRad(angle);
      const x2 = COMPASS_CENTER_X + Math.sin(rad) * COMPASS_OUTER_RADIUS;
      const y2 = COMPASS_CENTER_Y - Math.cos(rad) * COMPASS_OUTER_RADIUS;
      const thick = angle % 90 === 0;
      return `<line x1="${COMPASS_CENTER_X}" y1="${COMPASS_CENTER_Y}" x2="${x2}" y2="${y2}"
        stroke="rgba(255,255,255,0.25)" stroke-width="${thick ? 1 : 0.5}"></line>`;
    })
    .join("");
}

function renderCompassTicks() {
  const diagOffset = COMPASS_OUTER_RADIUS / Math.SQRT2;
  const diagTickOffset = TICK_LABEL_OFFSET * Math.SQRT2 * 0.7;
  const points = [
    { label: "N",  x: COMPASS_CENTER_X,                                y: COMPASS_CENTER_Y - COMPASS_OUTER_RADIUS - TICK_LABEL_OFFSET },
    { label: "NE", x: COMPASS_CENTER_X + diagOffset + diagTickOffset,  y: COMPASS_CENTER_Y - diagOffset - diagTickOffset },
    { label: "E",  x: COMPASS_CENTER_X + COMPASS_OUTER_RADIUS + TICK_LABEL_OFFSET, y: COMPASS_CENTER_Y + 4 },
    { label: "SE", x: COMPASS_CENTER_X + diagOffset + diagTickOffset,  y: COMPASS_CENTER_Y + diagOffset + diagTickOffset },
    { label: "S",  x: COMPASS_CENTER_X,                                y: COMPASS_CENTER_Y + COMPASS_OUTER_RADIUS + TICK_LABEL_OFFSET + 4 },
    { label: "SW", x: COMPASS_CENTER_X - diagOffset - diagTickOffset,  y: COMPASS_CENTER_Y + diagOffset + diagTickOffset },
    { label: "W",  x: COMPASS_CENTER_X - COMPASS_OUTER_RADIUS - TICK_LABEL_OFFSET, y: COMPASS_CENTER_Y + 4 },
    { label: "NW", x: COMPASS_CENTER_X - diagOffset - diagTickOffset,  y: COMPASS_CENTER_Y - diagOffset - diagTickOffset },
  ];
  return points
    .map((p) => `<text class="compass-dir-text" x="${p.x}" y="${p.y}" text-anchor="middle">${p.label}</text>`)
    .join("");
}

function renderArrowheadMarker() {
  return `<defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <polygon points="0 0, 7 3, 0 6" fill="white"></polygon>
    </marker>
  </defs>`;
}

function renderClueArrow(clue, placement) {
  const { bearing, arrowRadius, labelRadius } = placement;
  const rad = toRad(bearing);
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);

  const x2 = COMPASS_CENTER_X + dx * arrowRadius;
  const y2 = COMPASS_CENTER_Y + dy * arrowRadius;
  const labelX = COMPASS_CENTER_X + dx * labelRadius;
  const labelY = COMPASS_CENTER_Y + dy * labelRadius;

  const showFlag = DIFFICULTY[app.difficulty].showFlag || app.mode === "daily";
  const flag = showFlag ? flagEmoji(clue.city.cc) : "";
  const labelText = `${flag ? flag + " " : ""}${clue.city.name}`;

  // Anchor text away from the circle so labels grow outward rather than
  // toward the compass face, keeping them clear of arrows and each other.
  let anchor = "middle";

  // East side (between NE and SE)
  if (dx > 0.785) {
      anchor = "start";
  }

  // West side (between NW and SW)
  else if (dx < -0.785) {
      anchor = "end";
  }

  return `
    <line class="clue-line" x1="${COMPASS_CENTER_X}" y1="${COMPASS_CENTER_Y}" x2="${x2}" y2="${y2}" marker-end="url(#arrowhead)"></line>
    <text class="clue-label" x="${labelX}" y="${labelY}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(labelText)}</text>
  `;
}

function estimateLabelWidth(clue) {
  const showFlag = DIFFICULTY[app.difficulty].showFlag || app.mode === "daily";
  const flagWidth = showFlag ? LABEL_FLAG_WIDTH : 0;
  return flagWidth + clue.city.name.length * LABEL_CHAR_WIDTH;
}

// Decides where each clue's arrow tip and label should sit. Every label is
// placed at (or extremely close to) its arrow's true bearing — never swung
// far around the circle — so it always reads as belonging to that arrow.
// When clues are too close together to fit side by side, later arrows in
// the cluster are pushed out to a larger radius ("lane") instead, which
// staggers their labels radially rather than angularly.
function resolveCluePlacements(clues) {
  const order = clues
    .map((clue, index) => ({ index, bearing: clue.bearing, width: estimateLabelWidth(clue) }))
    .sort((a, b) => a.bearing - b.bearing);

  const lanes = []; // each lane holds the angular spans already claimed at that lane's radius
  const placements = new Array(clues.length);

  order.forEach((item) => {
    let lane = 0;
    while (lane < lanes.length && spansOverlap(lanes[lane], item)) {
      lane += 1;
    }
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push(item);

    const arrowRadius = ARROW_BASE_RADIUS + lane * ARROW_LANE_GAP;
    const rawLabelRadius = arrowRadius + LABEL_GAP_FROM_ARROW + labelRadiusPadding(item.width, item.bearing);
    const labelRadius = Math.min(rawLabelRadius, maxSafeLabelRadius(item.width, item.bearing));

    placements[item.index] = { bearing: item.bearing, arrowRadius, labelRadius };
  });

  return placements;
}

// Required angular half-width (in degrees) for a label of the given pixel
// width to clear neighbours at the arrow's base radius, plus a small margin.
function requiredHalfWidthDeg(width) {
  const arcDegreesPerPixel = 180 / (Math.PI * ARROW_BASE_RADIUS);
  return (width / 2) * arcDegreesPerPixel + 4;
}

function spansOverlap(laneItems, candidate) {
  const candidateHalf = requiredHalfWidthDeg(candidate.width);
  return laneItems.some((existing) => {
    const existingHalf = requiredHalfWidthDeg(existing.width);
    return angularDistance(candidate.bearing, existing.bearing) < candidateHalf + existingHalf;
  });
}

// Labels near due east/west need a touch more outward padding so wide city
// names don't run past the edge of the viewBox.
function labelRadiusPadding(width, bearing) {
  const rad = toRad(bearing);
  const horizontalness = Math.abs(Math.sin(rad));
  return horizontalness * Math.min(width * 0.15, 20);
}

// Caps how far out a label can sit so its full text always stays inside the
// SVG viewBox, even for the longest city names pushed to a deep lane.
// Text grows rightward when anchored "start" (dx > 0) and leftward when
// anchored "end" (dx < 0), so the available room is measured from the
// relevant edge of the viewBox rather than the center.
function maxSafeLabelRadius(width, bearing) {
  const rad = toRad(bearing);
  const dx = Math.sin(rad);
  if (Math.abs(dx) < 0.15) return Infinity; // anchored "middle"; width is centered on the point

  const edgeMargin = 10;
  const roomToEdge = dx > 0
    ? (VIEWBOX_WIDTH - COMPASS_CENTER_X) - edgeMargin - width
    : COMPASS_CENTER_X - edgeMargin - width;

  return roomToEdge / Math.abs(dx);
}

function angularDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/* =================== Clue chip list (text detail rows) =================== */

function renderClueChips() {
  clueChipList.innerHTML = "";

  const showFlag = DIFFICULTY[app.difficulty].showFlag || app.mode === "daily";
  const showDistance = DIFFICULTY[app.difficulty].showDistance && app.mode !== "daily";

  app.clues.forEach((clue) => {
    const dirLabel = compassLabelFromBearing(clue.bearing);
    const degrees = Math.round(clue.bearing);

    const row = document.createElement("div");
    row.className = "clue-chip";
    row.innerHTML = `
      ${showFlag ? `<span class="flag">${flagEmoji(clue.city.cc)}</span>` : ""}
      <span class="city-name">${clue.city.name}</span>
      <span class="is-text">is</span>
      <span class="arrow">${dirLabel} (${degrees}°)</span>
      ${showDistance ? `<span class="extra">${clue.distanceKm.toLocaleString()} km</span>` : ""}
    `;
    clueChipList.appendChild(row);
  });
}

/* =================== Autocomplete =================== */

let highlightedIndex = -1;
let currentMatches = [];

function showSuggestions(query) {
  if (!query) {
    suggestionsBox.style.display = "none";
    currentMatches = [];
    return;
  }

  const q = normalize(query);
  currentMatches = cityNames.filter((name) => normalize(name).includes(q)).slice(0, 7);
  highlightedIndex = -1;

  if (currentMatches.length === 0) {
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.innerHTML = "";
  currentMatches.forEach((name) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.innerHTML = `<span>${flagEmoji(cityByName[name].cc)}</span><span>${name}</span>`;
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
  items.forEach((item, idx) => item.classList.toggle("highlighted", idx === highlightedIndex));
  if (items[highlightedIndex]) items[highlightedIndex].scrollIntoView({ block: "nearest" });
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
    setTimeout(submitGuess, 0);
  } else if (e.key === "Escape") {
    suggestionsBox.style.display = "none";
  }
});

guessInput.addEventListener("blur", () => {
  setTimeout(() => { suggestionsBox.style.display = "none"; }, 150);
});

/* =================== Guess submission =================== */

el("submit-btn").addEventListener("click", submitGuess);
el("giveup-btn").addEventListener("click", () => endGame(false));
el("play-again-btn").addEventListener("click", () => startGame(app.mode, app.difficulty));

function submitGuess() {
  if (app.over || isSubmitting) return;

  const guessRaw = guessInput.value.trim();
  if (!guessRaw) return;

  isSubmitting = true;
  try {
    handleGuess(guessRaw);
  } finally {
    isSubmitting = false;
  }
}

function handleGuess(guessRaw) {
  const guessKey = normalize(guessRaw);

  if (guessKey === normalize(app.secret.name)) {
    endGame(true);
    return;
  }

  const guessedCity = cityNames
    .map((name) => cityByName[name])
    .find((city) => normalize(city.name) === guessKey);

  if (!guessedCity) {
    messageEl.textContent = "Not a city in the list — try again.";
    messageEl.className = "message hint";
    return;
  }

  app.wrongGuesses.push(guessRaw);
  messageEl.textContent = `${guessRaw} isn't it.`;
  messageEl.className = "message wrong";
  guessInput.value = "";

  if (app.round >= MAX_CLUES) {
    endGame(false);
    return;
  }

  revealNextClue(guessedCity);
}

/* =================== End game =================== */

function endGame(won) {
  app.over = true;
  app.won = won;

  if (app.mode === "daily") {
    saveDailyAttempt(todayYmd(), {
      won,
      rounds: app.round,
      wrongGuesses: app.wrongGuesses,
    });
  }

  showEndScreen();
}

function showEndScreen() {
  guessInput.style.display = "none";
  buttonRow.style.display = "none";
  suggestionsBox.style.display = "none";
  messageEl.textContent = "";

  if (app.won) {
    endIcon.textContent = "🎉";
    endTitle.textContent = `It was ${app.secret.name}!`;
    endSubtitle.textContent = `Solved in ${app.round} clue${app.round > 1 ? "s" : ""}.`;
  } else {
    endIcon.textContent = "📍";
    endTitle.textContent = `The secret city was ${app.secret.name}`;
    endSubtitle.textContent = "Better luck next round.";
  }

  guessedChips.innerHTML = "";
  app.wrongGuesses.forEach((guess) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = guess;
    guessedChips.appendChild(chip);
  });

  shareRow.style.display = app.mode === "daily" ? "flex" : "none";
  endScreen.style.display = "block";
}

/* =================== Sharing (daily mode) =================== */

function buildShareText() {
  const ymd = todayYmd();
  const dateLabel = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  const resultLine = app.won
    ? `solved in ${app.round}/${MAX_CLUES} clues`
    : `couldn't solve it (${MAX_CLUES}/${MAX_CLUES} clues used)`;

  const pips = Array.from({ length: MAX_CLUES }, (_, i) =>
    i < app.round ? (app.won && i === app.round - 1 ? "🟢" : "🔵") : "⚪"
  ).join("");

  return `Citadle ${dateLabel}\n${resultLine}\n${pips}`;
}

shareBtn.addEventListener("click", async () => {
  const text = buildShareText();

  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      // user cancelled the native share sheet — fall through to clipboard/WhatsApp link
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "Copied!";
    setTimeout(() => { shareBtn.textContent = "Share result"; }, 1800);
  } catch (err) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
});

/* =================== Init =================== */

showMenu();
