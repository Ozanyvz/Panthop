/* Audio manager — single entry point for every sound in the game.

   SFX go through the Web Audio API (decoded buffers → low latency, free
   overlap, per-shot rate/volume). Music uses HTMLAudioElement (streamed, so the
   longer tier tracks don't sit decoded in memory) routed through a WebAudio
   GainNode per track: iOS WKWebView ignores writes to HTMLMediaElement.volume,
   so element-volume fades/levels are silently broken there — gain nodes are the
   only reliable way to fade or set music/ambient levels on iOS. Where
   MediaElementSource is unavailable we fall back to tweening el.volume.

   Everything is same-origin (assets/sfx/), so it behaves identically on the web
   build and inside the Capacitor webview. No external deps.

   Browsers/webviews block audio until a user gesture: we create the
   AudioContext suspended, decode buffers in the background, and resume + start
   the pending music on the first pointer/key interaction. */

const DIR = 'assets/sfx/';

const SFX_MASTER = 0.85;
const MUSIC_VOL = 0.5;
const AMBIENT_VOL = 0.45;
const MUSIC_FADE_MS = 600;

// Four graded channels, each a continuous 0..1 volume: `master` scales the
// other three (one switch silences everything). SFX rides the master bus;
// music & ambient scale their own HTMLAudio elements. Each channel persists
// both its current level and the last non-zero level, so an off→on toggle
// restores exactly where it left off.
const VOL_KEYS = { master: 'wj_vol_master_v2', sfx: 'wj_vol_sfx_v2', music: 'wj_vol_music_v2', ambient: 'wj_vol_ambient_v2' };
const MEM_KEYS = { master: 'wj_volmem_master_v2', sfx: 'wj_volmem_sfx_v2', music: 'wj_volmem_music_v2', ambient: 'wj_volmem_ambient_v2' };

// Logical name → file, or an array of files (a random variant is picked per play).
const SFX = {
  jump: 'jump.wav',
  jumpStart: 'jump_start.wav',
  sprintJump: 'sprint-jump.wav',
  land: ['land.wav', 'land2.wav'],
  climb: 'climb.wav',
  sprintCharge: 'sprint-charge.wav',
  sprintReady: 'sprint-ready.wav',
  death: 'death.wav',
  eagleScreech: 'eagle-screech.mp3',
  eagleDeath: 'eagle-death.mp3',
  swordSlash: 'sword-slash.wav',
  sprintSmash: 'sprint-smash.wav',
  dodge: 'dodge.wav',
  feather: 'feather-drop.wav',
  scorePop: 'score-pop.wav',
  scoreTick: 'score-tick.wav',
  uiTap: 'ui-tap.wav',
  purchase: 'purchase.wav',
  purchaseFail: 'purchase-fail.wav',
  tabSwitch: 'tab-switch.wav',
  reset: 'reset.wav',
  reward2x: 'reward-2x.wav',
  achOpen: 'ach-open.wav',
  rewardCollect: 'reward-collect.wav',
  walletLand: 'wallet-land.wav',
  gameover: 'gameover.wav',
  newBest: 'new-best.wav',
  milestone: 'milestone.wav',
  countUp: 'count-up.wav',
  coinFly: 'coin-fly.wav',
  revealPop: 'reveal-pop.wav',
};

const MUSIC = {
  menu: 'bgm-menu.mp3',
  g1: 'bgm-game-1.mp3',
  g2: 'bgm-game-2.mp3',
  g3: 'bgm-game-3.mp3',
  g4: 'bgm-game-4.mp3',
};

let ctx = null;
let masterGain = null;
let unlocked = false;

// Per-channel volume (0..1) and the last non-zero value (for the on/off toggle).
const vol = { master: 1, sfx: 1, music: 1, ambient: 1 };
const remembered = { master: 1, sfx: 1, music: 1, ambient: 1 };
// Effective level of a channel = its own volume × the master volume.
const eff = (ch) => (vol[ch] ?? 0) * vol.master;
const musicTarget = () => MUSIC_VOL * eff('music');

const buffers = new Map();   // file → AudioBuffer

// Looping voices (single instance each): sprint-charge whir + climbing steps.
let chargeSrc = null;
let chargeGain = null;
let climbSrc = null;
let climbGain = null;

// Music (HTMLAudio through per-track gain nodes).
// Track record: { el, gain|null, fadeId, stopTimer, scale() }. `gain` is the
// WebAudio path; when null the fallback tweens el.volume scaled by scale().
const musicEls = new Map();  // key → track record
let wantMusicKey = null;     // desired track; applied once unlocked
let curMusicKey = null;      // track currently fading-in / playing
let musicBus = null;         // channel level: MUSIC_VOL * vol.music
let ambientBus = null;       // channel level: AMBIENT_VOL * vol.ambient

// Ambient forest loop — plays under everything (menus + gameplay) on its own
// channel, independent of which music track is up.
let ambientRec = null;

/* ---------- Setup ---------- */
export function initAudio() {
  loadVolumes();
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = SFX_MASTER * eff('sfx');
      masterGain.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = musicTarget();
      musicBus.connect(ctx.destination);
      ambientBus = ctx.createGain();
      ambientBus.gain.value = AMBIENT_VOL * eff('ambient');
      ambientBus.connect(ctx.destination);
      preloadBuffers();
    }
  } catch { /* audio unsupported — game stays silent, never throws */ }

  const onGesture = () => unlock();
  window.addEventListener('pointerdown', onGesture, { once: true, passive: true });
  window.addEventListener('keydown', onGesture, { once: true });
  window.addEventListener('touchstart', onGesture, { once: true, passive: true });
}

// Restore saved channel volumes, migrating once from the older 0..4 step model
// and the original global mute toggle.
function loadVolumes() {
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const oldMuted = localStorage.getItem('wj_muted_v1') === '1';
  for (const ch of Object.keys(VOL_KEYS)) {
    const raw = localStorage.getItem(VOL_KEYS[ch]);
    if (raw !== null) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n)) vol[ch] = clamp01(n / 100);
    } else {
      const oldStep = parseInt(localStorage.getItem('wj_vol_' + ch + '_v1') ?? '', 10);
      if (Number.isFinite(oldStep)) vol[ch] = clamp01(oldStep / 4);
      else if (oldMuted) vol[ch] = 0;
    }
    const mem = parseInt(localStorage.getItem(MEM_KEYS[ch]) ?? '', 10);
    if (Number.isFinite(mem) && mem > 0) remembered[ch] = clamp01(mem / 100);
    if (vol[ch] > 0) remembered[ch] = vol[ch];
  }
}

function preloadBuffers() {
  const files = new Set();
  for (const v of Object.values(SFX)) (Array.isArray(v) ? v : [v]).forEach(f => files.add(f));
  for (const f of files) loadBuffer(f);
}

async function loadBuffer(file) {
  if (!ctx || buffers.has(file)) return buffers.get(file);
  try {
    const res = await fetch(DIR + file);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    buffers.set(file, buf);
    return buf;
  } catch { return null; }
}

// First user gesture: resume the context, start the ambience and pending music.
function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  startAmbient();
  applyMusic();
}

// The forest ambience loops forever once unlocked; its channel level controls it.
function startAmbient() {
  if (!ambientRec) {
    ambientRec = makeTrack(DIR + 'ambient.wav', ambientBus, () => AMBIENT_VOL * eff('ambient'));
    setTrackLevel(ambientRec, 1);
  }
  if (eff('ambient') > 0) ambientRec.el.play().catch(() => {});
}

// Build a looping HTMLAudio track wired into `bus` via its own GainNode. When
// MediaElementSource isn't available the record falls back to el.volume, scaled
// by `scale()` (the channel level the bus would otherwise provide).
function makeTrack(url, bus, scale) {
  const el = new Audio(url);
  el.loop = true;
  el.preload = 'auto';
  let gain = null;
  if (ctx && bus) {
    try {
      const src = ctx.createMediaElementSource(el);
      gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(bus);
    } catch { gain = null; }
  }
  if (!gain) el.volume = 0;
  return { el, gain, fadeId: 0, stopTimer: 0, scale };
}

// Set a track's fade level (0..1) immediately, cancelling any running fade.
function setTrackLevel(rec, t) {
  rec.fadeId++;
  clearTimeout(rec.stopTimer);
  if (rec.gain && ctx) {
    const g = rec.gain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.value = t;
  } else {
    rec.el.volume = t * rec.scale();
  }
}

// Fade a track's level (0..1) over MUSIC_FADE_MS. WebAudio ramps cancel any
// in-flight ramp, so rapid track switches can't fight each other; the fallback
// tween is superseded via fadeId. `onDone` (used to pause) is also cancelled
// by any newer fade/level call on the same track.
function fadeTrack(rec, target, onDone) {
  const id = ++rec.fadeId;
  clearTimeout(rec.stopTimer);
  if (rec.gain && ctx) {
    const g = rec.gain.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, now + MUSIC_FADE_MS / 1000);
    if (onDone) rec.stopTimer = setTimeout(() => { if (rec.fadeId === id) onDone(); }, MUSIC_FADE_MS + 50);
  } else {
    const el = rec.el, from = el.volume, to = target * rec.scale();
    const start = performance.now();
    const step = (now) => {
      if (rec.fadeId !== id) return;   // superseded by a newer fade
      const k = Math.min(1, (now - start) / MUSIC_FADE_MS);
      el.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    };
    requestAnimationFrame(step);
  }
}

/* ---------- SFX ---------- */
export function sfx(name, opts = {}) {
  if (eff('sfx') <= 0 || !ctx || !unlocked) return;
  const entry = SFX[name];
  if (!entry) return;
  const file = Array.isArray(entry) ? entry[(Math.random() * entry.length) | 0] : entry;
  const buf = buffers.get(file);
  if (!buf) { loadBuffer(file); return; }   // not decoded yet — skip this shot
  const src = ctx.createBufferSource();
  src.buffer = buf;
  if (opts.rate) src.playbackRate.value = opts.rate;
  const g = ctx.createGain();
  g.gain.value = (opts.volume ?? 1);   // SFX_MASTER and the sfx level live on masterGain
  src.connect(g).connect(masterGain);
  src.start();
}

// Start/stop the looping sprint-charge whir (idempotent).
export function startCharge() {
  if (eff('sfx') <= 0 || !ctx || !unlocked || chargeSrc) return;
  const buf = buffers.get(SFX.sprintCharge);
  if (!buf) return;
  chargeSrc = ctx.createBufferSource();
  chargeSrc.buffer = buf;
  chargeSrc.loop = true;
  chargeGain = ctx.createGain();
  chargeGain.gain.value = 0.6;
  chargeSrc.connect(chargeGain).connect(masterGain);
  chargeSrc.start();
}

export function stopCharge() {
  if (!chargeSrc) return;
  const src = chargeSrc, g = chargeGain;
  chargeSrc = null; chargeGain = null;
  try {
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + 0.08);
    src.stop(now + 0.1);
  } catch { try { src.stop(); } catch { /* already stopped */ } }
}

// Looping climb footsteps. `rate` speeds the steps up while sprinting. Idempotent:
// if already running it just updates the playback rate.
export function startClimb(rate = 1) {
  if (eff('sfx') <= 0 || !ctx || !unlocked) return;
  if (climbSrc) { climbSrc.playbackRate.value = rate; return; }
  const buf = buffers.get(SFX.climb);
  if (!buf) return;
  climbSrc = ctx.createBufferSource();
  climbSrc.buffer = buf;
  climbSrc.loop = true;
  climbSrc.playbackRate.value = rate;
  climbGain = ctx.createGain();
  climbGain.gain.value = 0.5;
  climbSrc.connect(climbGain).connect(masterGain);
  climbSrc.start();
}

export function stopClimb() {
  if (!climbSrc) return;
  const src = climbSrc, g = climbGain;
  climbSrc = null; climbGain = null;
  try {
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + 0.06);
    src.stop(now + 0.08);
  } catch { try { src.stop(); } catch { /* already stopped */ } }
}

/* ---------- Music ---------- */
function musicRec(key) {
  let rec = musicEls.get(key);
  if (!rec) {
    rec = makeTrack(DIR + MUSIC[key], musicBus, musicTarget);
    musicEls.set(key, rec);
  }
  return rec;
}

// Request a track. Starts immediately if unlocked, otherwise on first gesture.
export function playMusic(key) {
  if (!MUSIC[key]) return;
  wantMusicKey = key;
  if (unlocked) applyMusic();
}

export function stopMusic() {
  wantMusicKey = null;
  if (!curMusicKey) return;
  const rec = musicEls.get(curMusicKey);   // capture before clearing the key
  curMusicKey = null;
  if (rec) fadeTrack(rec, 0, () => rec.el.pause());
}

// Silence the long-running audio (music + ambience). Used before a fullscreen
// rewarded ad and when the app goes to the background; resume() re-arms it after.
// Pauses EVERY music track, not just the current one: a tier→menu switch may
// leave the outgoing track mid-fade, and its fade won't progress while hidden.
export function suspend() {
  stopCharge();
  stopClimb();
  for (const rec of musicEls.values()) {
    rec.fadeId++;                 // cancel any in-flight fade tween
    clearTimeout(rec.stopTimer);  // and its pending pause-after-fade
    rec.el.pause();
  }
  if (ambientRec) ambientRec.el.pause();
}

// Re-arm audio the OS may have suspended (e.g. after a fullscreen rewarded ad):
// resume the SFX context and restart the ambience and music if they got paused.
export function resume() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  if (ambientRec && eff('ambient') > 0 && ambientRec.el.paused) ambientRec.el.play().catch(() => {});
  const rec = curMusicKey ? musicEls.get(curMusicKey) : null;
  if (rec && eff('music') > 0 && rec.el.paused) {
    rec.el.play().then(() => fadeTrack(rec, 1)).catch(() => {});
  }
}

// Score → game-music tier (matches the 4 obstacle-tempo bands). Thresholds sit
// at the quarter points of the difficulty ramp, which completes at score ~200
// (see the obstacle constants in game.js) — keep the two in sync.
export function gameTier(score) {
  const key = score >= 150 ? 'g4' : score >= 100 ? 'g3' : score >= 50 ? 'g2' : 'g1';
  if (key !== wantMusicKey) playMusic(key);
}

function applyMusic() {
  const key = wantMusicKey;
  if (!key || key === curMusicKey) return;
  const prev = curMusicKey ? musicEls.get(curMusicKey) : null;
  curMusicKey = key;

  if (prev) fadeTrack(prev, 0, () => prev.el.pause());
  const rec = musicRec(key);
  if (musicTarget() > 0) {
    if (rec.el.paused) setTrackLevel(rec, 0);   // fresh start fades in from silence
    rec.el.play().then(() => fadeTrack(rec, 1)).catch(() => {});
  }
}

/* ---------- Channel volume (0..1) ---------- */
export function getVolume(ch) { return vol[ch] ?? 0; }
export function isOn(ch) { return (vol[ch] ?? 0) > 0; }

export function setVolume(ch, v) {
  if (!(ch in vol)) return 0;
  v = Math.max(0, Math.min(1, v));
  vol[ch] = v;
  if (v > 0) remembered[ch] = v;   // off→on later restores this
  localStorage.setItem(VOL_KEYS[ch], String(Math.round(v * 100)));
  localStorage.setItem(MEM_KEYS[ch], String(Math.round(remembered[ch] * 100)));
  applyChannel(ch);
  return v;
}

// Toggle a channel: off → 0 (remembered kept); on → restore the last non-zero.
export function setEnabled(ch, on) {
  if (!(ch in vol)) return 0;
  return setVolume(ch, on ? (remembered[ch] > 0 ? remembered[ch] : 1) : 0);
}

function applyChannel(ch) {
  // Master scales every sink — re-apply the three real channels.
  if (ch === 'master') {
    applyChannel('sfx');
    applyChannel('music');
    applyChannel('ambient');
    return;
  }
  if (ch === 'sfx') {
    if (eff('sfx') <= 0) { stopCharge(); stopClimb(); }
    if (masterGain) masterGain.gain.value = SFX_MASTER * eff('sfx');
  } else if (ch === 'music') {
    if (musicBus) musicBus.gain.value = musicTarget();
    const rec = curMusicKey ? musicEls.get(curMusicKey) : null;
    if (rec) {
      if (eff('music') > 0) {
        if (rec.el.paused) rec.el.play().catch(() => {});
        fadeTrack(rec, 1);   // fallback path re-scales el.volume; gain path is a no-op ramp to 1
      } else {
        // Hard mute: never trust volume alone — iOS ignores el.volume writes.
        rec.fadeId++; clearTimeout(rec.stopTimer);
        rec.el.pause();
      }
    }
  } else if (ch === 'ambient') {
    if (!ambientRec && unlocked) startAmbient();
    if (ambientBus) ambientBus.gain.value = AMBIENT_VOL * eff('ambient');
    if (ambientRec) {
      if (!ambientRec.gain) ambientRec.el.volume = AMBIENT_VOL * eff('ambient');
      if (eff('ambient') > 0 && ambientRec.el.paused) ambientRec.el.play().catch(() => {});
      else if (eff('ambient') <= 0) ambientRec.el.pause();
    }
  }
}
