import {
  MILESTONES, LEAF_REWARDS,
  getBest, getReachedMilestones, getSmashTotal, getRunsTotal, getJumpsTotal,
  getPlayTimeTotal, getPlayTimeBest,
  getCollectedAchievements, markAchievementCollected,
  addLeaves, addFeathers, addCoins,
} from './storage.js';
import { iconHTML } from './icons.js';

/* ---------- Catalog ----------
   Each achievement derives its unlock state from existing progress (no extra
   "unlocked" flag is stored). A reward is collected once, from the modal. */

// Milestone climbs — unlocked when a score milestone is first reached. Their
// leaf reward used to be auto-granted at game over; it is now collected here.
const MILESTONE_ACH = MILESTONES.map((score, i) => ({
  id: `ms_${score}`,
  group: 'milestone',
  icon: iconHTML('flag'),
  threshold: score,
  reward: { currency: 'leaf', amount: LEAF_REWARDS[i] ?? LEAF_REWARDS[LEAF_REWARDS.length - 1] },
}));

// Tiered "obstacles destroyed" — read the lifetime smash total. Early tiers pay
// tree bark (🪵), later tiers pay feathers (🪶).
const SMASH_ACH = [
  { id: 'smash_10',  threshold: 10,  reward: { currency: 'coin',    amount: 40 } },
  { id: 'smash_30',  threshold: 30,  reward: { currency: 'coin',    amount: 120 } },
  { id: 'smash_75',  threshold: 75,  reward: { currency: 'coin',    amount: 320 } },
  { id: 'smash_150', threshold: 150, reward: { currency: 'feather', amount: 4 } },
  { id: 'smash_300', threshold: 300, reward: { currency: 'feather', amount: 8 } },
  { id: 'smash_600', threshold: 600, reward: { currency: 'feather', amount: 14 } },
].map(t => ({ ...t, group: 'smash', icon: iconHTML('burst') }));

// Tiered "runs played" — lifetime number of finished runs. Reward-less for now
// (just bragging rights); rewards may be attached later.
const RUNS_ACH = [
  { id: 'runs_5',   threshold: 5 },
  { id: 'runs_25',  threshold: 25 },
  { id: 'runs_100', threshold: 100 },
  { id: 'runs_500', threshold: 500 },
].map(t => ({ ...t, group: 'runs', icon: iconHTML('gamepad'), reward: null }));

// Tiered "total jumps" — lifetime jump count. Reward-less for now.
const JUMPS_ACH = [
  { id: 'jumps_50',   threshold: 50 },
  { id: 'jumps_250',  threshold: 250 },
  { id: 'jumps_1000', threshold: 1000 },
  { id: 'jumps_5000', threshold: 5000 },
].map(t => ({ ...t, group: 'jumps', icon: iconHTML('jump'), reward: null }));

/* Time-based tiers. Both groups measure seconds, so their thresholds are
   seconds too; the screen formats them for display (see fmtDuration in main.js).
   'time' is lifetime play time, 'runtime' is the longest single run. */
const TIME_ACH = [
  { id: 'time_600',   threshold: 600 },     // 10 min
  { id: 'time_1800',  threshold: 1800 },    // 30 min
  { id: 'time_3600',  threshold: 3600 },    // 1 h
  { id: 'time_10800', threshold: 10800 },   // 3 h
  { id: 'time_36000', threshold: 36000 },   // 10 h
].map(t => ({ ...t, group: 'time', icon: iconHTML('hourglass'), reward: null }));

const RUNTIME_ACH = [
  { id: 'runtime_30',  threshold: 30 },
  { id: 'runtime_60',  threshold: 60 },
  { id: 'runtime_120', threshold: 120 },
  { id: 'runtime_300', threshold: 300 },
].map(t => ({ ...t, group: 'runtime', icon: iconHTML('focus'), reward: null }));

// Groups whose threshold + progress are durations in seconds, not plain counts.
export const TIME_GROUPS = new Set(['time', 'runtime']);

export const ACHIEVEMENTS = [
  ...MILESTONE_ACH, ...SMASH_ACH, ...RUNS_ACH, ...JUMPS_ACH, ...TIME_ACH, ...RUNTIME_ACH,
];

const BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

// Visual order the screen renders sections in.
export const ACH_GROUPS = [
  { id: 'milestone', i18nKey: 'achievements.group_milestone' },
  { id: 'smash',     i18nKey: 'achievements.group_smash' },
  { id: 'runs',      i18nKey: 'achievements.group_runs' },
  { id: 'jumps',     i18nKey: 'achievements.group_jumps' },
  { id: 'time',      i18nKey: 'achievements.group_time' },
  { id: 'runtime',   i18nKey: 'achievements.group_runtime' },
];

// Reward currency -> icon HTML (rendered via innerHTML; see js/icons.js).
export const REWARD_ICONS = { leaf: iconHTML('leaf'), feather: iconHTML('feather'), coin: iconHTML('bark') };

/* ---------- State ---------- */
// Full display state for one achievement: unlocked / collected / collectible,
// plus current progress toward its target (for the progress readout).
export function achievementState(def) {
  const collected = getCollectedAchievements().has(def.id);
  let unlocked, progress;
  if (def.group === 'milestone') {
    unlocked = getReachedMilestones().includes(def.threshold);
    progress = getBest();
  } else {
    if (def.group === 'runs') progress = getRunsTotal();
    else if (def.group === 'jumps') progress = getJumpsTotal();
    else if (def.group === 'time') progress = getPlayTimeTotal();
    else if (def.group === 'runtime') progress = getPlayTimeBest();
    else progress = getSmashTotal();
    unlocked = progress >= def.threshold;
  }
  const collectible = unlocked && !!def.reward && !collected;
  return { def, unlocked, collected, collectible, progress, target: def.threshold };
}

export function listAchievements() {
  return ACHIEVEMENTS.map(achievementState);
}

// Smash tiers crossed this run (prev < tier ≤ new lifetime total) — lets the
// game-over screen announce freshly unlocked obstacle-destruction achievements.
export function newlyUnlockedSmashAchievements(prevTotal, newTotal) {
  return SMASH_ACH.filter(a => prevTotal < a.threshold && newTotal >= a.threshold);
}

// How many rewards are waiting to be collected right now (drives the badge).
export function pendingCount() {
  return ACHIEVEMENTS.reduce((n, def) => n + (achievementState(def).collectible ? 1 : 0), 0);
}

// Grants the reward and marks it collected. Returns the reward on success.
export function collectAchievement(id) {
  const def = BY_ID[id];
  if (!def) return { ok: false };
  const st = achievementState(def);
  if (!st.collectible) return { ok: false };
  const { currency, amount } = def.reward;
  if (currency === 'leaf') addLeaves(amount);
  else if (currency === 'feather') addFeathers(amount);
  else addCoins(amount);
  markAchievementCollected(id);
  return { ok: true, reward: def.reward };
}
