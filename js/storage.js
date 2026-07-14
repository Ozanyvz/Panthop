const KEY_BEST = 'wj_best_v1';
const KEY_RECENT = 'wj_recent_v1';
const KEY_HIGHSCORES = 'wj_highscores_v1';
const KEY_MILESTONES = 'wj_milestones_v1';
const KEY_COINS = 'wj_coins_v1';
const KEY_LEAVES = 'wj_leaves_v1';
const KEY_FEATHERS = 'wj_feathers_v1';
const KEY_SMASH_PROG = 'wj_smashprog_v1';
const KEY_UPGRADES = 'wj_upgrades_v1';
const KEY_SEEN_UPG = 'wj_seen_upg_v1';
// Lifetime count of obstacles smashed — drives the tiered "destroyed" achievements.
const KEY_SMASH_TOTAL = 'wj_smash_total_v1';
// Lifetime totals for the "runs played" and "jumps" achievements.
const KEY_RUNS_TOTAL = 'wj_runs_total_v1';
const KEY_JUMPS_TOTAL = 'wj_jumps_total_v1';
// Achievement ids whose reward the player has already collected.
const KEY_ACH_COLLECTED = 'wj_ach_collected_v1';
const RECENT_LIMIT = 5;
const HIGH_LIMIT = 5;

// Mid-air obstacles a claw/sprint must destroy to drop one feather (tüy).
const SMASHES_PER_FEATHER = 3;

export const MILESTONES = [25, 50, 100, 200, 350, 500, 750, 1000];

// Leaves (yaprak) granted the first time each milestone (by index) is reached.
// Grows 1 · 2 · 4 · 6 · 8 · … so later milestones are worth progressively more.
export const LEAF_REWARDS = [1, 2, 4, 6, 8, 10, 12, 14];

function leafRewardForIndex(i) {
  return LEAF_REWARDS[i] ?? LEAF_REWARDS[LEAF_REWARDS.length - 1];
}

export function getBest() {
  const v = parseInt(localStorage.getItem(KEY_BEST) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

// A recent entry carries the run's score and the materials it earned, so the
// start screen can show what each run banked. Legacy plain-number saves are
// normalized to a zero-material entry.
function normalizeRecent(e) {
  if (typeof e === 'number' && Number.isFinite(e)) {
    return { score: e, bark: 0, leaf: 0, feather: 0 };
  }
  if (e && typeof e === 'object' && Number.isFinite(e.score)) {
    return {
      score: e.score,
      bark: Number(e.bark) || 0,
      leaf: Number(e.leaf) || 0,
      feather: Number(e.feather) || 0,
    };
  }
  return null;
}

export function getRecent() {
  try {
    const raw = localStorage.getItem(KEY_RECENT);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeRecent).filter(Boolean).slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

// Records one run's full result (score + earned materials) at the top of recent.
export function pushRecent(entry) {
  const recent = getRecent();
  recent.unshift(normalizeRecent(entry) || { score: 0, bark: 0, leaf: 0, feather: 0 });
  localStorage.setItem(KEY_RECENT, JSON.stringify(recent.slice(0, RECENT_LIMIT)));
}

export function getPreviousScore() {
  const r = getRecent();
  return r.length > 0 ? r[0].score : null;
}

// Top scores, highest first (separate from the rolling recent list).
export function getHighScores() {
  try {
    const raw = localStorage.getItem(KEY_HIGHSCORES);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(Number.isFinite).sort((a, b) => b - a).slice(0, HIGH_LIMIT);
  } catch {
    return [];
  }
}

function recordHighScore(score) {
  if (!Number.isFinite(score) || score <= 0) return;
  const list = getHighScores();
  list.push(Math.floor(score));
  list.sort((a, b) => b - a);
  localStorage.setItem(KEY_HIGHSCORES, JSON.stringify(list.slice(0, HIGH_LIMIT)));
}

function readReachedSet() {
  try {
    const raw = localStorage.getItem(KEY_MILESTONES);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter(n => Number.isFinite(n)) : []);
  } catch {
    return new Set();
  }
}

export function getReachedMilestones() {
  return Array.from(readReachedSet()).sort((a, b) => a - b);
}

// Returns the newly crossed milestones (not previously reached) for this score,
// in ascending order. Each entry carries its leaf reward: { value, leaves }.
function consumeNewMilestones(score) {
  const reached = readReachedSet();
  const fresh = [];
  MILESTONES.forEach((m, i) => {
    if (score >= m && !reached.has(m)) {
      fresh.push({ value: m, leaves: leafRewardForIndex(i) });
      reached.add(m);
    }
  });
  if (fresh.length > 0) {
    localStorage.setItem(KEY_MILESTONES, JSON.stringify(Array.from(reached)));
  }
  return fresh;
}

export function pushScore(score) {
  const best = getBest();
  const isNewBest = score > best;
  if (isNewBest) localStorage.setItem(KEY_BEST, String(score));

  // Read the prior run's score before the new run is recorded into recent.
  const previous = getPreviousScore();
  recordHighScore(score);

  // Milestones are still recorded as reached (this unlocks their achievement),
  // but their leaf reward is no longer auto-granted here — the player now
  // collects it from the Achievements screen. `leavesEarned` is the pending
  // amount, reported only so the game-over card can show what's waiting.
  const newMilestones = consumeNewMilestones(score);
  const leavesEarned = newMilestones.reduce((sum, m) => sum + m.leaves, 0);

  return {
    isNewBest,
    best: isNewBest ? score : best,
    previous,
    newMilestones,
    leavesEarned,
  };
}

/* ---------- Coins ---------- */
export function getCoins() {
  const v = parseInt(localStorage.getItem(KEY_COINS) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

export function addCoins(n) {
  if (!Number.isFinite(n) || n <= 0) return getCoins();
  const next = getCoins() + Math.floor(n);
  localStorage.setItem(KEY_COINS, String(next));
  return next;
}

export function spendCoins(n) {
  const have = getCoins();
  if (n > have) return false;
  localStorage.setItem(KEY_COINS, String(have - n));
  return true;
}

/* ---------- Leaves (yaprak) ---------- */
// Earned only from milestones for now; no sink yet (no leaf-priced upgrades).
export function getLeaves() {
  const v = parseInt(localStorage.getItem(KEY_LEAVES) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

export function addLeaves(n) {
  if (!Number.isFinite(n) || n <= 0) return getLeaves();
  const next = getLeaves() + Math.floor(n);
  localStorage.setItem(KEY_LEAVES, String(next));
  return next;
}

export function spendLeaves(n) {
  const have = getLeaves();
  if (n > have) return false;
  localStorage.setItem(KEY_LEAVES, String(have - n));
  return true;
}

/* ---------- Feathers (tüy) ---------- */
// Dropped by shredded mid-air obstacles: one feather per SMASHES_PER_FEATHER kills.
export function getFeathers() {
  const v = parseInt(localStorage.getItem(KEY_FEATHERS) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

export function addFeathers(n) {
  if (!Number.isFinite(n) || n <= 0) return getFeathers();
  const next = getFeathers() + Math.floor(n);
  localStorage.setItem(KEY_FEATHERS, String(next));
  return next;
}

export function spendFeathers(n) {
  const have = getFeathers();
  if (n > have) return false;
  localStorage.setItem(KEY_FEATHERS, String(have - n));
  return true;
}

// Record obstacles smashed this run; banks a feather every SMASHES_PER_FEATHER,
// carrying the remainder over to the next run. Returns feathers earned now.
// Banks this run's smashes into the lifetime total (drives the tiered "destroyed"
// achievements). Feathers are no longer derived from a fixed kill ratio — they
// now drop per-kill on a chance roll handled at the call site (see main.js).
export function registerSmashes(n) {
  if (!Number.isFinite(n) || n <= 0) return;
  const lifetime = getSmashTotal() + Math.floor(n);
  localStorage.setItem(KEY_SMASH_TOTAL, String(lifetime));
}

// Lifetime obstacles smashed (drives the tiered "destroyed" achievements).
export function getSmashTotal() {
  const v = parseInt(localStorage.getItem(KEY_SMASH_TOTAL) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

/* ---------- Lifetime run / jump counters (reward-less achievements) ---------- */
export function getRunsTotal() {
  const v = parseInt(localStorage.getItem(KEY_RUNS_TOTAL) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

export function addRun() {
  const next = getRunsTotal() + 1;
  localStorage.setItem(KEY_RUNS_TOTAL, String(next));
  return next;
}

export function getJumpsTotal() {
  const v = parseInt(localStorage.getItem(KEY_JUMPS_TOTAL) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

export function addJumps(n) {
  if (!Number.isFinite(n) || n <= 0) return getJumpsTotal();
  const next = getJumpsTotal() + Math.floor(n);
  localStorage.setItem(KEY_JUMPS_TOTAL, String(next));
  return next;
}

/* ---------- Achievements ----------
   Unlock state is DERIVED (milestone reached / smash total ≥ tier), so only the
   "reward already collected" set needs persisting. */
export function getCollectedAchievements() {
  try {
    const raw = localStorage.getItem(KEY_ACH_COLLECTED);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markAchievementCollected(id) {
  const set = getCollectedAchievements();
  if (set.has(id)) return;
  set.add(id);
  localStorage.setItem(KEY_ACH_COLLECTED, JSON.stringify(Array.from(set)));
}

/* ---------- "NEW" upgrade tracking ----------
   Upgrade ids the player has already seen in an available (affordable) state.
   Used to show a one-time NEW badge until the relevant tab is viewed. */
export function getSeenUpgrades() {
  try {
    const raw = localStorage.getItem(KEY_SEEN_UPG);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markUpgradesSeen(ids) {
  if (!ids || ids.length === 0) return;
  const set = getSeenUpgrades();
  let changed = false;
  for (const id of ids) {
    if (!set.has(id)) { set.add(id); changed = true; }
  }
  if (changed) localStorage.setItem(KEY_SEEN_UPG, JSON.stringify(Array.from(set)));
}

/* ---------- Reset ---------- */
// Wipes all gameplay progress (scores, milestones, currencies, upgrades).
// Language preference (wj_lang_v1) is intentionally kept — it's a setting, not progress.
export function resetProgress() {
  [KEY_BEST, KEY_RECENT, KEY_HIGHSCORES, KEY_MILESTONES, KEY_COINS, KEY_LEAVES,
   KEY_FEATHERS, KEY_SMASH_PROG, KEY_SMASH_TOTAL, KEY_RUNS_TOTAL, KEY_JUMPS_TOTAL,
   KEY_ACH_COLLECTED, KEY_UPGRADES, KEY_SEEN_UPG]
    .forEach(k => localStorage.removeItem(k));
  ['sword', 'dodge'].forEach(id => localStorage.removeItem(KEY_INF_PREFIX + id + '_v1'));
}

/* ---------- Sonsuz (+1) purchases — endless post-max upgrade counters ---------- */
const KEY_INF_PREFIX = 'wj_inf_';

export function getInfinityCount(id) {
  const v = parseInt(localStorage.getItem(KEY_INF_PREFIX + id + '_v1') || '0', 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function addInfinityCount(id) {
  const next = getInfinityCount(id) + 1;
  localStorage.setItem(KEY_INF_PREFIX + id + '_v1', String(next));
  return next;
}

/* ---------- Upgrades ---------- */
function readUpgradesMap() {
  try {
    const raw = localStorage.getItem(KEY_UPGRADES);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeUpgradesMap(map) {
  localStorage.setItem(KEY_UPGRADES, JSON.stringify(map));
}

export function getUpgradeLevel(id) {
  const map = readUpgradesMap();
  const v = parseInt(map[id] || '0', 10);
  return Number.isFinite(v) ? v : 0;
}

export function setUpgradeLevel(id, level) {
  const map = readUpgradesMap();
  map[id] = level;
  writeUpgradesMap(map);
}
