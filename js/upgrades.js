import {
  getUpgradeLevel, setUpgradeLevel,
  getCoins, spendCoins,
  getLeaves, spendLeaves,
  getFeathers, spendFeathers,
} from './storage.js';
import { iconHTML } from './icons.js';

// Hold (charge) time before a sprint kicks in, by sprintSpeed level.
// Level 0 (not upgraded) = 2s; upgrades shorten it to 1.5 / 1 / 0.5s.
export const SPRINT_HOLD_BY_LEVEL = [2.0, 1.5, 1.0, 0.5];

// Feather drop = roll a 0–100 dice on each bird kill; a feather drops when the
// roll lands at/under this threshold. Level 0 (no upgrade) = 20; upgrades raise
// the threshold to 35 / 50 / 75 (i.e. the drop %).
const FEATHER_DROP_PCT_BY_LEVEL = [20, 35, 50, 75];

// Dodge charges granted per run, by dodgeCount level (0 = just the base ability).
const DODGE_BASE = 10;
const DODGE_TOTAL_BY_LEVEL = [DODGE_BASE, 15, 20, 25];

export const UPGRADES = [
  /* ---------- Tree bark (ağaç kabuğu 🪵) ---------- */
  {
    id: 'warmStart',
    i18nKey: 'upgrades.warm_start',
    icon: iconHTML('yinyang'),
    currency: 'coin',
    maxLevel: 4,
    // cost per next level (index = current level)
    costs: [50, 150, 400, 1000],
  },
  {
    id: 'coinMult',
    i18nKey: 'upgrades.coin_mult',
    icon: iconHTML('bark'),
    currency: 'coin',
    maxLevel: 4,
    costs: [80, 220, 560, 1400],
  },
  {
    // Storage id stays 'sword' so existing saves keep their level; it is
    // surfaced to the player as "Air Strike" via the i18n key + icon below.
    id: 'sword',
    i18nKey: 'upgrades.air_strike',
    icon: iconHTML('claw'),
    currency: 'coin',
    maxLevel: 4,
    costs: [150, 300, 800, 2000],
  },

  /* ---------- Leaf (yaprak 🍃) — the Sprint tree ----------
     The parent 'sprint' unlocks hold-to-sprint. Its children stay locked
     (visible but unbuyable) until 'sprint' is owned. */
  {
    id: 'sprint',
    i18nKey: 'upgrades.sprint',
    icon: iconHTML('wind'),
    currency: 'leaf',
    maxLevel: 1,
    costs: [1],
    group: 'sprint',
  },
  {
    id: 'sprintBonus',
    i18nKey: 'upgrades.sprint_bonus',
    icon: iconHTML('spark'),
    currency: 'leaf',
    maxLevel: 1,
    costs: [2],
    requires: 'sprint',
    group: 'sprint',
  },
  {
    id: 'sprintSmash',
    i18nKey: 'upgrades.sprint_smash',
    icon: iconHTML('burst'),
    currency: 'leaf',
    maxLevel: 1,
    costs: [4],
    requires: 'sprint',
    group: 'sprint',
  },
  {
    // Focus (storage id 'sprintSpeed') lives back under the Sprint tree, bought
    // with leaves. Hidden until Sprint is owned, like its siblings.
    id: 'sprintSpeed',
    i18nKey: 'upgrades.sprint_speed',
    icon: iconHTML('focus'),
    currency: 'leaf',
    maxLevel: 3,
    costs: [4, 6, 8],
    requires: 'sprint',
    group: 'sprint',
    defaultEffect: true,   // level 0 has a real value (2s charge) → show it as "now"
  },

  /* ---------- Feather (tüy 🪶) ----------
     Spent on the feather drop-chance booster and the Dodge tree. */
  {
    // Raises the per-bird feather drop chance (base 20% → 35/50/75%).
    id: 'featherLuck',
    i18nKey: 'upgrades.feather_luck',
    icon: iconHTML('clover'),
    currency: 'feather',
    maxLevel: 3,
    costs: [50, 100, 200],
    defaultEffect: true,   // level 0 already drops at 20% → show it as "now"
  },
  {
    // Dodge ability (parent): start each run with charges that absorb branch
    // hits. Single-level unlock, like Sprint.
    id: 'dodge',
    i18nKey: 'upgrades.dodge',
    icon: iconHTML('shield'),
    currency: 'feather',
    maxLevel: 1,
    costs: [300],
    group: 'dodge',
  },
  {
    // Dodge count booster: +5 / +10 / +15 over the base 10 charges.
    id: 'dodgeCount',
    i18nKey: 'upgrades.dodge_count',
    icon: iconHTML('plus'),
    currency: 'feather',
    maxLevel: 3,
    costs: [100, 200, 300],
    requires: 'dodge',
    group: 'dodge',
  },
];

const BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

function balanceFor(currency) {
  if (currency === 'leaf') return getLeaves();
  if (currency === 'feather') return getFeathers();
  return getCoins();
}

// A locked upgrade has an unmet `requires` (its parent isn't owned yet).
export function isLocked(id) {
  const def = BY_ID[id];
  if (!def || !def.requires) return false;
  return getUpgradeLevel(def.requires) < 1;
}

export function nextCost(id) {
  const def = BY_ID[id];
  if (!def) return Infinity;
  const lvl = getUpgradeLevel(id);
  if (lvl >= def.maxLevel) return null;
  return def.costs[lvl];
}

export function canAfford(id) {
  const def = BY_ID[id];
  if (!def || isLocked(id)) return false;
  const cost = nextCost(id);
  return cost != null && balanceFor(def.currency) >= cost;
}

export function tryPurchase(id) {
  const def = BY_ID[id];
  if (!def) return { ok: false, reason: 'unknown' };
  if (isLocked(id)) return { ok: false, reason: 'locked' };
  const cost = nextCost(id);
  if (cost == null) return { ok: false, reason: 'maxed' };
  const spend = def.currency === 'leaf' ? spendLeaves
    : def.currency === 'feather' ? spendFeathers
    : spendCoins;
  if (!spend(cost)) return { ok: false, reason: 'poor' };
  setUpgradeLevel(id, getUpgradeLevel(id) + 1);
  return { ok: true };
}

/* ---------- Effect resolvers ---------- */
// Each upgrade level reduces starting climb speed by 7%, applied to CLIMB_BASE_SPEED.
// 0→1.0, 1→0.93, 2→0.86, 3→0.79, 4→0.72
export function startSpeedMult() {
  return Math.max(0.5, 1 - 0.07 * getUpgradeLevel('warmStart'));
}

// Each level multiplies earned coins by +25%.
// 0→1.0, 1→1.25, 2→1.5, 3→1.75, 4→2.0
export function coinMultiplier() {
  return 1 + 0.25 * getUpgradeLevel('coinMult');
}

export function coinsEarned(score) {
  return Math.max(0, Math.floor(score * coinMultiplier()));
}

// Sword charges per run: 0 if not owned, otherwise grows with each level.
// L1=10, L2=15, L3=22, L4=30 — fragility decreases with each level.
const SWORD_CHARGES_BY_LEVEL = [0, 10, 15, 22, 30];
export function swordChargesPerRun() {
  const lvl = getUpgradeLevel('sword');
  return SWORD_CHARGES_BY_LEVEL[lvl] ?? 0;
}

/* ---------- Sprint (leaf) resolvers ---------- */
export function sprintEnabled() {
  return getUpgradeLevel('sprint') >= 1;
}

export function sprintHoldTime() {
  const lvl = getUpgradeLevel('sprintSpeed');
  return SPRINT_HOLD_BY_LEVEL[lvl] ?? SPRINT_HOLD_BY_LEVEL[0];
}

export function sprintJumpBonusEnabled() {
  return getUpgradeLevel('sprintBonus') >= 1;
}

export function sprintSmashEnabled() {
  return getUpgradeLevel('sprintSmash') >= 1;
}

/* ---------- Feather (tüy) resolvers ---------- */
// Dice threshold (0–100) at/under which a smashed bird drops a feather.
export function featherDropPercent() {
  return FEATHER_DROP_PCT_BY_LEVEL[getUpgradeLevel('featherLuck')] ?? FEATHER_DROP_PCT_BY_LEVEL[0];
}

export function dodgeEnabled() {
  return getUpgradeLevel('dodge') >= 1;
}

// Dodge charges granted at the start of a run (0 if the ability isn't owned).
export function dodgeChargesPerRun() {
  if (!dodgeEnabled()) return 0;
  return DODGE_TOTAL_BY_LEVEL[getUpgradeLevel('dodgeCount')] ?? DODGE_TOTAL_BY_LEVEL[0];
}

export function snapshotModifiers() {
  return {
    startSpeedMult: startSpeedMult(),
    swordCharges: swordChargesPerRun(),
    sprintEnabled: sprintEnabled(),
    sprintHoldTime: sprintHoldTime(),
    sprintJumpBonus: sprintJumpBonusEnabled(),
    sprintSmash: sprintSmashEnabled(),
    dodgeCharges: dodgeChargesPerRun(),
  };
}

/* ---------- Per-level effect descriptions ---------- */
// Returns the placeholder values for an upgrade's `effect` i18n string at a
// given level, so the UI can show both the current and the next-level effect.
function fmt(n) {
  return String(n).replace(/\.0+$/, '');
}

export function effectParams(id, level) {
  switch (id) {
    case 'warmStart': {
      const pct = Math.round((1 - Math.max(0.5, 1 - 0.07 * level)) * 100);
      return { pct };
    }
    case 'coinMult': {
      const mult = (1 + 0.25 * level).toFixed(2).replace(/\.?0+$/, '');
      const pct = 25 * level;
      return { mult, pct };
    }
    case 'sword': {
      const n = SWORD_CHARGES_BY_LEVEL[level] ?? 0;
      return { n };
    }
    case 'sprintSpeed': {
      const sec = SPRINT_HOLD_BY_LEVEL[level] ?? SPRINT_HOLD_BY_LEVEL[0];
      return { sec: fmt(sec) };
    }
    case 'sprintBonus': {
      return { n: 2 };
    }
    case 'featherLuck': {
      const pct = FEATHER_DROP_PCT_BY_LEVEL[level] ?? FEATHER_DROP_PCT_BY_LEVEL[0];
      return { pct };
    }
    case 'dodge': {
      return { n: DODGE_BASE };
    }
    case 'dodgeCount': {
      return { n: DODGE_TOTAL_BY_LEVEL[level] ?? DODGE_TOTAL_BY_LEVEL[0] };
    }
    default:
      return {};
  }
}
