import { PanthopGame } from './game.js';
import { getBest, getRecent, getHighScores, pushScore, pushRecent, addCoins, getCoins, getLeaves, getFeathers, addFeathers, registerSmashes, getSmashTotal, addRun, addJumps, addPlayTime, recordRunLog, getUpgradeLevel, getSeenUpgrades, markUpgradesSeen, resetProgress, getInfinityCount, hasAcceptedPrivacy, acceptPrivacy } from './storage.js';
import {
  UPGRADES,
  nextCost,
  canAfford,
  tryPurchase,
  isLocked,
  coinsEarned,
  coinMultiplier,
  snapshotModifiers,
  effectParams,
  featherDropPercent,
  INFINITY_UPGRADES,
  isMaxed,
  infinityAvailable,
  infinityItems,
  canAffordInfinity,
  tryPurchaseInfinity,
  swordChargesPerRun,
  dodgeChargesPerRun,
} from './upgrades.js';
import {
  listAchievements,
  achievementState,
  pendingCount,
  collectAchievement,
  newlyUnlockedSmashAchievements,
  ACH_GROUPS,
  TIME_GROUPS,
  awardSecret,
  REWARD_ICONS,
} from './achievements.js';
import * as i18n from './i18n.js';
import { iconHTML, currencyIcon } from './icons.js';
import { vibrate, requestWakeLock, releaseWakeLock, markPlaying, lockPortrait } from './mobile.js';
import * as audio from './audio.js';
import { initAds, prepareRewarded, rewardedReady, showRewarded, adPrivacyOptionsRequired, showAdPrivacyOptions } from './services/ads.js';
import { initGameServices, syncAchievements } from './services/achievements.js';

const COUNTUP_MS = 850;
const COUNTUP_MIN_MS = 350;

// Game-over reveal: cards appear one after another; earned amounts count up.
const REVEAL_SCORE_DELAY = 200;   // before the score count-up starts
const REVEAL_GAP = 200;           // pause between successive stages
const REVEAL_EARN_DUR = 520;      // count-up duration for a collected amount
const REVEAL_FLY_DUR = 560;       // a "+N" token's flight from the reveal frame to the wallet

let goRevealTimers = [];          // pending stage timers
let goRevealFinalize = null;      // jumps the whole sequence to its end (tap to skip)
let goRevealDone = true;
let goCtx = null;                 // current game-over reveal context (kept in sync after a rewarded grant)
const earnedRaf = new Map();      // per-element count-up handles

const canvas = document.getElementById('game-canvas');
const gameFrame = document.getElementById('game-frame');
const hud = document.getElementById('hud');
const scoreValue = document.getElementById('score-value');
const swordChip = document.getElementById('sword-chip');
const swordChargesEl = document.getElementById('sword-charges');
const dodgeChip = document.getElementById('dodge-chip');
const dodgeChargesEl = document.getElementById('dodge-charges');
const featherRunChip = document.getElementById('feather-run-chip');
const featherRunValEl = document.getElementById('feather-run-val');
const timeValueEl = document.getElementById('time-value');
const hudBottomBar = document.querySelector('.hud-bottom');
const pauseBtn = document.getElementById('pause-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseUpgradesBtn = document.getElementById('pause-upgrades-btn');
const pauseUpgradesBadge = document.getElementById('pause-upgrades-badge');
const pauseAchievementsBtn = document.getElementById('pause-achievements-btn');
const pauseAchievementsBadge = document.getElementById('pause-achievements-badge');
const pauseSettingsBtn = document.getElementById('pause-settings-btn');
const pauseHomeBtn = document.getElementById('pause-home-btn');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const bestScoreStart = document.getElementById('best-score-start');
const recentList = document.getElementById('recent-list');
const scoreTabsEl = document.getElementById('score-tabs');
const settingsBtn = document.getElementById('settings-btn');

const consentScreen = document.getElementById('consent-screen');
const consentAcceptBtn = document.getElementById('consent-accept');
const consentLink = document.getElementById('consent-link');

const settingsScreen = document.getElementById('settings-screen');
const settingsPrivacyLink = document.getElementById('settings-privacy-link');
const adPrivacyBtn = document.getElementById('ad-privacy-btn');
const settingsBackBtn = document.getElementById('settings-back-btn');
const langOptionsEl = document.getElementById('lang-options');
const audioLevelsEl = document.getElementById('audio-levels');
const resetProgressBtn = document.getElementById('reset-progress-btn');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmYesBtn = document.getElementById('confirm-yes');
const confirmNoBtn = document.getElementById('confirm-no');
const confirmInput = document.getElementById('confirm-input');
const confirmPrompt = document.getElementById('confirm-prompt');

const gameOverScreen = document.getElementById('gameover-screen');
const finalScoreEl = document.getElementById('final-score');
const finalBestEl = document.getElementById('final-best');
const newBestBadge = document.getElementById('new-best-badge');
const milestoneCard = document.getElementById('milestone-card');
const milestoneBadgesEl = document.getElementById('milestone-badges');
const goAchBtn = document.getElementById('go-ach-btn');
// Collected card — this run's gains, shown row by row before they fly to the wallet.
const collectedCard = document.getElementById('collected-card');
const barkRow = document.getElementById('bark-row');
const barkEarnedEl = document.getElementById('bark-earned');
const featherRow = document.getElementById('feather-row');
const featherEarnedEl = document.getElementById('feather-earned');
// Game-over wallet (above the title): current totals that this run's gains tick into.
const gwBarkVal = document.getElementById('gw-bark-val');
const gwBarkItem = document.getElementById('gw-bark');
const gwLeafVal = document.getElementById('gw-leaf-val');
const gwFeatherVal = document.getElementById('gw-feather-val');
const gwFeatherItem = document.getElementById('gw-feather');
const revealCard = document.querySelector('#gameover-screen .reveal-card');
const upgAvailableBtn = document.getElementById('upg-available');
const upgNewBadge = document.getElementById('upg-new-badge');
const reward2xBtn = document.getElementById('reward-2x-btn');
const goActions = document.getElementById('go-actions');
const retryBtn = document.getElementById('retry-btn');
const homeBtn = document.getElementById('home-btn');

const coinValueStart = document.getElementById('coin-value-start');
const leafValueStart = document.getElementById('leaf-value-start');
const featherChipStart = document.getElementById('feather-chip-start');
const featherValueStart = document.getElementById('feather-value-start');
const upgradesBtn = document.getElementById('upgrades-btn');
const upgradesBtnBadge = document.getElementById('upgrades-btn-badge');
const upgradesScreen = document.getElementById('upgrades-screen');
const upgradesBackBtn = document.getElementById('upgrades-back-btn');
const upgListEl = document.getElementById('upg-list');
const upgTabsEl = document.getElementById('upg-tabs');

const achievementsBtn = document.getElementById('achievements-btn');
const achievementsBadge = document.getElementById('achievements-badge');
const achievementsScreen = document.getElementById('achievements-screen');
const achievementsBackBtn = document.getElementById('achievements-back-btn');
const achBodyEl = document.getElementById('ach-body');
const achModalOverlay = document.getElementById('ach-modal-overlay');
const achModalMedal = document.getElementById('ach-modal-medal');
const achModalIcon = document.getElementById('ach-modal-icon');
const achModalName = document.getElementById('ach-modal-name');
const achModalDesc = document.getElementById('ach-modal-desc');
const achModalProgress = document.getElementById('ach-modal-progress');
const achModalReward = document.getElementById('ach-modal-reward');
const achModalCollect = document.getElementById('ach-modal-collect');
const achModalStatus = document.getElementById('ach-modal-status');
const achModalCloseX = document.getElementById('ach-modal-close-x');
// Upgrade info modal (tapping an upgrade card shows its description).
const upgModalOverlay = document.getElementById('upg-modal-overlay');
const upgModalIcon = document.getElementById('upg-modal-icon');
const upgModalName = document.getElementById('upg-modal-name');
const upgModalDesc = document.getElementById('upg-modal-desc');
const upgModalCloseX = document.getElementById('upg-modal-close-x');
// Achievements-screen wallet (top): current totals a collected reward ticks into.
const awBarkVal = document.getElementById('aw-bark-val');
const awBarkItem = document.getElementById('aw-bark');
const awLeafVal = document.getElementById('aw-leaf-val');
const awLeafItem = document.getElementById('aw-leaf');
const awFeatherVal = document.getElementById('aw-feather-val');
const awFeatherItem = document.getElementById('aw-feather');

let countUpRaf = 0;

let game = null;
let runSmashes = 0;       // mid-air obstacles destroyed this run → smash achievements
let runFeathers = 0;          // feathers rolled from this run's kills → banked at game over
let runFeatherThreshold = 20; // 0–100 dice threshold for a feather drop, snapshot at run start
let runJumps = 0;         // jumps performed this run → banked into the lifetime jump total
let runJumpTimes = [];    // second of the run each jump happened on → per-run log
let runStartedAt = 0;     // wall-clock (epoch ms) the run began → per-run log
let rhythmCaught = false; // the Müzisyen rhythm already matched this run
let runNewSecrets = [];   // secrets earned for the FIRST time this run → game-over badges

/* ---------- Screen management ---------- */
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// Start-screen UPGRADES button badge: NEW if a first-time-available upgrade
// exists, otherwise the total count of upgrades affordable right now.
// Paint one upgrade button (menu or pause): green when affordable, with a count
// or NEW badge.
function applyUpgBadge(btn, badge, availIds, hasNew) {
  btn?.classList.toggle('has-upgrades', availIds.length > 0);
  if (!badge) return;
  if (hasNew) {
    badge.textContent = i18n.t('upgrades.new_badge');
    badge.classList.add('is-new');
    badge.classList.remove('hidden');
  } else if (availIds.length > 0) {
    badge.textContent = availIds.length;
    badge.classList.remove('is-new');
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function refreshUpgradesBtnBadge() {
  const seen = getSeenUpgrades();
  const availIds = UPGRADES.filter(u => tabUnlocked(u.currency) && canAfford(u.id)).map(u => u.id);
  const hasNew = availIds.some(id => !seen.has(id));
  applyUpgBadge(upgradesBtn, upgradesBtnBadge, availIds, hasNew);
  applyUpgBadge(pauseUpgradesBtn, pauseUpgradesBadge, availIds, hasNew);   // same look in the pause menu
}

let activeScoreTab = 'recent';   // 'recent' (with materials) | 'best' (top 5)

function renderScoreEmpty() {
  const li = document.createElement('li');
  li.className = 'empty';
  li.textContent = i18n.t('start.recent_empty');
  recentList.appendChild(li);
}

function renderScoreList() {
  recentList.innerHTML = '';
  if (activeScoreTab === 'best') {
    const highs = getHighScores();
    if (highs.length === 0) { renderScoreEmpty(); return; }
    highs.forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">#${i + 1}</span><span class="sval">${s}</span>`;
      recentList.appendChild(li);
    });
    return;
  }
  // Recent runs: score + the materials that run banked (icon + amount).
  const recent = getRecent();
  if (recent.length === 0) { renderScoreEmpty(); return; }
  recent.forEach((e, i) => {
    const mats = [];
    if (e.bark > 0) mats.push(`<span class="rmat">${iconHTML('bark')} ${formatCoins(e.bark)}</span>`);
    if (e.leaf > 0) mats.push(`<span class="rmat">${iconHTML('leaf')} ${e.leaf}</span>`);
    if (e.feather > 0) mats.push(`<span class="rmat">${iconHTML('feather')} ${e.feather}</span>`);
    const li = document.createElement('li');
    li.innerHTML =
      `<span class="rank">#${i + 1}</span>` +
      `<span class="sval">${e.score}</span>` +
      `<span class="recent-mats">${mats.join('')}</span>`;
    recentList.appendChild(li);
  });
}

function updateScoreTabs() {
  if (!scoreTabsEl) return;
  scoreTabsEl.querySelectorAll('.score-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeScoreTab);
  });
}

function refreshStartScreen() {
  bestScoreStart.textContent = getBest();
  refreshCoinDisplays();
  refreshUpgradesBtnBadge();
  refreshAchBadge();
  updateScoreTabs();
  renderScoreList();
}

// The Feather (tüy) economy is revealed once claws are in play — via either
// the Sharpened Claw (bark) or Pençe Bileme / claw-hone (leaf) upgrade.
function featherUnlocked() {
  return getUpgradeLevel('sword') >= 1 || getUpgradeLevel('sprintSmash') >= 1;
}

// On-hand balance for a currency (drives the start-screen chips + upgrade tabs).
function currencyBalance(currency) {
  if (currency === 'leaf') return getLeaves();
  if (currency === 'feather') return getFeathers();
  return getCoins();
}

function refreshCoinDisplays() {
  coinValueStart.textContent = formatCoins(getCoins());
  if (leafValueStart) leafValueStart.textContent = formatCoins(getLeaves());
  if (featherValueStart) featherValueStart.textContent = formatCoins(getFeathers());
  // Feather chip appears only after the economy is unlocked.
  featherChipStart?.classList.toggle('hidden', !featherUnlocked());
}

function formatCoins(n) {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.floor(n / 1000)}k`;
}

function bumpCoinChip() {
  coinValueStart.classList.remove('bump');
  void coinValueStart.offsetWidth;
  coinValueStart.classList.add('bump');
}

/* ---------- Settings screen (language picker + reset) ---------- */
// Languages are listed as selectable rows — scales cleanly to any number of locales.
async function renderLangOptions() {
  const list = await i18n.supportedWithNames();
  const current = i18n.getLang();
  langOptionsEl.innerHTML = '';
  list.forEach(({ code, name }) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.className = 'lang-option';
    li.dataset.lang = code;
    if (code === current) li.setAttribute('aria-selected', 'true');
    li.innerHTML = `<span class="name">${name}</span><span class="code">${code.toUpperCase()}</span>`;
    li.addEventListener('click', async () => {
      if (code !== i18n.getLang()) await i18n.setLang(code);
    });
    langOptionsEl.appendChild(li);
  });
}

// Graded audio channels, each a stepped 0..MAX control (0 = off). `master`
// sits on top and scales/mutes the other three from one place.
const AUDIO_CHANNELS = [
  { id: 'master', i18nKey: 'settings.master' },
  { id: 'sfx', i18nKey: 'settings.sfx' },
  { id: 'music', i18nKey: 'settings.music' },
  { id: 'ambient', i18nKey: 'settings.ambient' },
];

function renderAudioLevels() {
  if (!audioLevelsEl) return;
  audioLevelsEl.innerHTML = '';
  for (const ch of AUDIO_CHANNELS) {
    const on = audio.isOn(ch.id);
    const pct = Math.round(audio.getVolume(ch.id) * 100);

    const row = document.createElement('div');
    row.className = 'audio-row' + (on ? '' : ' is-off');
    row.dataset.ch = ch.id;

    // Head: channel label + on/off switch.
    const head = document.createElement('div');
    head.className = 'audio-row-head';
    const label = document.createElement('span');
    label.className = 'audio-row-label';
    label.dataset.i18n = ch.i18nKey;
    label.textContent = i18n.t(ch.i18nKey);
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'audio-switch' + (on ? ' is-on' : '');
    sw.dataset.act = 'toggle';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(on));
    sw.setAttribute('aria-label', i18n.t(ch.i18nKey));
    sw.innerHTML = '<span class="audio-switch-knob"></span>';
    head.appendChild(label);
    head.appendChild(sw);
    row.appendChild(head);

    // Slider + % — only visible while the channel is on.
    if (on) {
      const ctrl = document.createElement('div');
      ctrl.className = 'audio-row-ctrl';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'audio-slider';
      slider.min = '0';
      slider.max = '100';
      slider.step = '5';
      slider.value = String(pct);
      slider.style.setProperty('--pct', pct + '%');
      slider.setAttribute('aria-label', i18n.t(ch.i18nKey));
      const out = document.createElement('span');
      out.className = 'audio-pct';
      out.textContent = pct + '%';
      ctrl.appendChild(slider);
      ctrl.appendChild(out);
      row.appendChild(ctrl);
    }

    audioLevelsEl.appendChild(row);
  }
}

// True while Settings / Upgrades / Achievements was opened from the in-game
// pause menu (so closing it returns to the paused game, not the start screen).
let fromPause = false;

// Show the pause overlay with its badges (Upgrades green/count, Achievements count) current.
function showPauseOverlay() {
  refreshUpgradesBtnBadge();
  refreshAchBadge();
  show(pauseOverlay);
}

function showSettingsScreen() {
  hide(startScreen);
  renderLangOptions();
  renderAudioLevels();
  show(settingsScreen);
  if (!fromPause) audio.playMusic('menu');   // mid-run keeps the (paused) menu track
}

function hideSettingsScreen() {
  closeConfirm();
  hide(settingsScreen);
  if (fromPause) { fromPause = false; showPauseOverlay(); return; }
  refreshStartScreen();
  show(startScreen);
}

/* ---------- In-game pause ---------- */
function pauseGame() {
  if (!game || !game.running) return;
  game.pause();
  audio.playMusic('menu');   // calmer menu track while paused
  showPauseOverlay();
}
function resumeGame() {
  hide(pauseOverlay);
  game?.resume();
  if (game) audio.gameTier(game.score);   // back to the level-appropriate game music
}
function quitToMenu() {
  hide(pauseOverlay);
  game?.stop();
  markPlaying(false);
  releaseWakeLock();
  showStartScreen();   // abandons the current run
}

// The word the player must type to confirm a reset (localized "yes": EVET / YES).
function confirmWord() { return i18n.t('settings.yes'); }
function confirmMatches() {
  return confirmInput.value.trim().toLowerCase() === confirmWord().trim().toLowerCase();
}
function refreshConfirmState() { confirmYesBtn.disabled = !confirmMatches(); }

function openConfirm() {
  const word = confirmWord();
  confirmInput.value = '';
  confirmPrompt.textContent = i18n.t('settings.reset_type', { word });
  confirmInput.placeholder = word;
  confirmInput.setAttribute('aria-label', i18n.t('settings.reset_type', { word }));
  confirmYesBtn.disabled = true;
  show(confirmOverlay);
  setTimeout(() => confirmInput.focus(), 50);
}
function closeConfirm() {
  hide(confirmOverlay);
  confirmInput.value = '';
  confirmYesBtn.disabled = true;
}

/* ---------- Privacy gate ----------
   Play and the App Store both require the policy to be presented before
   anything collects data, so on a first launch (or after PRIVACY_VERSION is
   bumped) this screen is the whole app: the ad SDK and the platform game
   services are not started until the player accepts.

   The full text lives on the web — the URL is per-language, so it comes out of
   the dictionary, with a hard fallback: if the dictionary failed to load, t()
   hands back the key itself, and a relative "privacy.url" href would turn the
   store-required link into a dead one.

   The anchors carry target="_blank", which reaches the system browser on both
   natives: Android ignores _blank, loads in place and Capacitor's
   shouldOverrideUrlLoading fires an ACTION_VIEW intent for the foreign host;
   iOS routes it through createWebViewWith → UIApplication.open. */
const PRIVACY_URL_FALLBACK = 'https://aldros.site/panthop/privacy';

function applyPrivacyLinks() {
  const url = i18n.t('privacy.url');
  const href = url && url !== 'privacy.url' ? url : PRIVACY_URL_FALLBACK;
  [consentLink, settingsPrivacyLink].forEach(a => { if (a) a.href = href; });
}

/* Google's consent form only applies to some regions, and the plugin can only
   answer once initAds() has talked to the UMP SDK — so this runs after that
   resolves rather than at DOM setup, and stays hidden everywhere else. */
async function refreshAdPrivacyBtn() {
  if (!adPrivacyBtn) return;
  const required = await adPrivacyOptionsRequired();
  adPrivacyBtn.classList.toggle('hidden', !required);
}

function showConsentScreen() {
  hide(hud);
  hide(startScreen);
  show(consentScreen);
}

// Accepting is the real start of the session: only now may the data-touching
// services come up, and only now does the menu take over the screen.
function acceptConsent() {
  acceptPrivacy();
  hide(consentScreen);
  enterApp();
}

// Everything the app does once consent is in hand — also the straight path on
// every later launch, where the gate never shows.
function enterApp() {
  showStartScreen();
  requestAnimationFrame(() => ensureGame());
  // Native game services (all no-ops on web). Init AdMob + preload a rewarded
  // ad, then sign in to the platform game service and mirror any already-earned
  // achievements outward. Fire-and-forget — failures must not block the UI.
  initAds().then(() => { refreshRewardAd(); refreshAdPrivacyBtn(); });
  initGameServices().then(() => syncAchievements(unlockedAchievementIds()));
}

function showStartScreen() {
  fromPause = false;
  hide(hud);
  hide(gameOverScreen);
  hide(upgradesScreen);
  hide(settingsScreen);
  hide(achievementsScreen);
  hide(pauseOverlay);
  closeAchModal();
  closeConfirm();
  refreshStartScreen();
  show(startScreen);
  audio.playMusic('menu');
}

function animateCountUp(el, target, durationMs) {
  if (countUpRaf) cancelAnimationFrame(countUpRaf);
  if (target <= 0) { el.textContent = '0'; return; }
  revealCard?.classList.add('counting');
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / durationMs);
    // ease-out cubic: fast start, slow finish — feels like a settling counter
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) {
      countUpRaf = requestAnimationFrame(tick);
    } else {
      countUpRaf = 0;
      revealCard?.classList.remove('counting');
    }
  };
  countUpRaf = requestAnimationFrame(tick);
}

// Badges for every achievement freshly unlocked this run — milestone climbs
// (★ "İLK 25!") and obstacle-smash tiers (💥 "10 Engel") share the same card.
function renderUnlockedAchievements(newMilestones, newSmashAch) {
  milestoneBadgesEl.innerHTML = '';
  let i = 0;
  const addBadge = (extraCls, star, label) => {
    const span = document.createElement('span');
    span.className = `ms-badge${extraCls ? ' ' + extraCls : ''}`;
    span.style.animationDelay = `${0.1 + i * 0.08}s`;
    span.innerHTML = `<span class="ms-star">${star}</span>${label}`;
    milestoneBadgesEl.appendChild(span);
    i++;
  };
  (newMilestones || []).forEach(m => addBadge('', '★', i18n.t('gameover.milestone_first', { n: m.value })));
  (newSmashAch || []).forEach(a => addBadge('ms-smash', iconHTML('burst'), i18n.t('achievements.smash_name', { n: a.threshold })));
  // Secrets caught this run — read straight off the run state, since they are
  // earned mid-run rather than derived from the score at game over.
  runNewSecrets.forEach(id => addBadge('ms-secret', iconHTML('note'), i18n.t('achievements.' + id + '_name')));
  return i > 0;
}

/* ---------- Game-over wallet: this run's gains tick into the running total ---------- */
// Counts a wallet value from `from` up to `to` (the total once the gain lands).
function animateWalletValue(el, from, to, durationMs) {
  const prev = earnedRaf.get(el);
  if (prev) cancelAnimationFrame(prev);
  from = Math.max(0, Math.floor(from));
  to = Math.max(from, Math.floor(to));
  if (to === from) { earnedRaf.delete(el); el.textContent = String(to); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) earnedRaf.set(el, requestAnimationFrame(tick));
    else { earnedRaf.delete(el); el.textContent = String(to); }
  };
  earnedRaf.set(el, requestAnimationFrame(tick));
}

function finalizeWalletValue(el, to) {
  const prev = earnedRaf.get(el);
  if (prev) { cancelAnimationFrame(prev); earnedRaf.delete(el); }
  el.textContent = String(Math.max(0, Math.floor(to)));
}

// Flies a "+N" token from a source element up to a wallet slot, calling onArrive
// when it lands. Positions are measured relative to `host` (a positioned ancestor
// of both elements) so the token tracks the real on-screen layout. `variant` is
// the currency (coin|leaf|feather) and tints the token.
function flyToWallet(host, fromEl, toEl, text, variant, onArrive) {
  if (!host || !fromEl || !toEl) { onArrive && onArrive(); return; }
  const hostR = host.getBoundingClientRect();
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const startX = a.left + a.width / 2 - hostR.left;
  const startY = a.top - hostR.top;                 // launch from the top edge of the source
  const endX = b.left + b.width / 2 - hostR.left;
  const endY = b.top + b.height / 2 - hostR.top;

  const fly = document.createElement('div');
  fly.className = 'go-fly' + (variant === 'feather' ? ' feather' : variant === 'leaf' ? ' leaf' : '');
  fly.innerHTML = text;   // text is always app-controlled (numbers + iconHTML), never user input
  // Inline position/z-index so container rules can't downgrade them.
  fly.style.position = 'absolute';
  fly.style.zIndex = '70';
  fly.style.left = `${startX}px`;
  fly.style.top = `${startY}px`;
  host.appendChild(fly);
  void fly.offsetWidth;   // commit the start position before transitioning
  fly.style.transform = `translate(-50%, -50%) translate(${endX - startX}px, ${endY - startY}px) scale(0.6)`;
  fly.style.opacity = '0.1';

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    fly.remove();
    onArrive && onArrive();
  };
  fly.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, REVEAL_FLY_DUR + 140);   // safety in case transitionend is missed
}

// Tick a wallet total up to its new value, with a landing bump.
function landInWallet(itemEl, valEl, from, to) {
  animateWalletValue(valEl, from, to, REVEAL_EARN_DUR);
  audio.sfx('walletLand');
  if (itemEl) {
    itemEl.classList.remove('caught');
    void itemEl.offsetWidth;
    itemEl.classList.add('caught');
  }
}

// One material collected: a "+N" rises from the source into the wallet slot,
// and the total ticks up when it lands.
function walletEarn(host, fromEl, itemEl, valEl, from, to, text, variant) {
  flyToWallet(host, fromEl, itemEl, text, variant, () => landInWallet(itemEl, valEl, from, to));
}

function finalizeCountUp(el, target) {
  if (countUpRaf) { cancelAnimationFrame(countUpRaf); countUpRaf = 0; }
  revealCard?.classList.remove('counting');
  el.textContent = String(Math.max(0, target));
}

function revealEl(el) { el.classList.remove('hidden'); el.classList.add('shown'); }

// Is an upgrade buyable right now, and is any of them brand-new (unseen)?
function upgAvailableState() {
  const any = UPGRADES.some(u => tabUnlocked(u.currency) && canAfford(u.id));
  return { any, hasNew: any && hasUnseenUpgrade() };
}

// Re-check the offer after the wallet grew while the game-over screen is up (the
// rewarded 2x grant). The button was staged from the pre-ad wallet, so bark that
// just landed can newly afford an upgrade — surface it instead of leaving the
// player on a screen that claims nothing is buyable.
function refreshUpgAvailable() {
  const upg = upgAvailableState();
  if (goCtx) goCtx.upg = upg;   // keep tap-to-skip in sync with the new wallet
  upgNewBadge?.classList.toggle('hidden', !upg.hasNew);
  // Already in the layout (staged or shown)? The reveal sequence owns it from here.
  if (!upg.any || !upgAvailableBtn.classList.contains('hidden')) return;
  revealEl(upgAvailableBtn);
}

/* ---------- Game-over staged reveal ----------
   Cards appear one after another (score → milestone → collected bark/feather →
   upgrade button → retry/home). Tapping the screen jumps to the final state. */
function clearGoRevealTimers() {
  goRevealTimers.forEach(clearTimeout);
  goRevealTimers = [];
}

function startGameOverReveal(ctx) {
  goCtx = ctx;
  clearGoRevealTimers();
  goRevealDone = false;

  const scoreDur = Math.max(COUNTUP_MIN_MS, Math.min(COUNTUP_MS, 250 + ctx.score * 8));
  let t = 0;

  // 1) Score
  revealEl(revealCard);
  goRevealTimers.push(setTimeout(() => {
    if (ctx.score > 0) audio.sfx('countUp');
    animateCountUp(finalScoreEl, ctx.score, scoreDur);
  }, REVEAL_SCORE_DELAY));
  t = REVEAL_SCORE_DELAY + scoreDur + REVEAL_GAP;
  // A fresh personal best chimes in just after the score lands.
  if (ctx.isNewBest && ctx.score > 0) {
    goRevealTimers.push(setTimeout(() => audio.sfx('newBest'), t));
    t += REVEAL_GAP;
  }

  // 2) Milestone (+ its leaf reward)
  if (ctx.hasAch) {
    // The card just announces the unlock; its button opens the Achievements
    // screen where the reward is collected.
    goRevealTimers.push(setTimeout(() => { revealEl(milestoneCard); audio.sfx('milestone'); }, t));
    t += REVEAL_EARN_DUR + REVEAL_GAP;
  }

  // 3) Collected card appears; each row shows the gain, then a "+N" flies up
  //    from that row into the wallet and the wallet total ticks in.
  const hasBark = ctx.bark.gain > 0;
  const hasFeather = ctx.feather.gain > 0;
  if (hasBark || hasFeather) {
    goRevealTimers.push(setTimeout(() => { revealEl(collectedCard); audio.sfx('revealPop'); }, t));
    t += REVEAL_GAP;
    if (hasBark) {
      const tb = t;
      goRevealTimers.push(setTimeout(() => {
        barkEarnedEl.textContent = ctx.bark.text;
        revealEl(barkRow);
        audio.sfx('coinFly');
        walletEarn(gameOverScreen, barkRow, gwBarkItem, gwBarkVal, ctx.bark.from, ctx.bark.to, ctx.bark.text, 'coin');
      }, tb));
      t += REVEAL_FLY_DUR + REVEAL_GAP;
    }
    if (hasFeather) {
      const tf = t;
      goRevealTimers.push(setTimeout(() => {
        featherEarnedEl.textContent = ctx.feather.text;
        revealEl(featherRow);
        audio.sfx('coinFly');
        walletEarn(gameOverScreen, featherRow, gwFeatherItem, gwFeatherVal, ctx.feather.from, ctx.feather.to, ctx.feather.text, 'feather');
      }, tf));
      t += REVEAL_FLY_DUR + REVEAL_GAP;
    }
  }

  // 4b) Rewarded "double bark" offer (after the gains have landed, before upgrade)
  if (ctx.reward) {
    goRevealTimers.push(setTimeout(() => revealEl(reward2xBtn), t));
    t += 480 + REVEAL_GAP;
  }

  // 5) Upgrade-available button (only after the gains have all landed)
  if (ctx.upg.any) {
    goRevealTimers.push(setTimeout(() => revealEl(upgAvailableBtn), t));
    t += 480 + REVEAL_GAP;
  }

  // 6) Retry / Home — the sequence is complete
  goRevealTimers.push(setTimeout(() => {
    revealEl(goActions);
    goRevealDone = true;
  }, t));

  // Tap-to-skip jumps straight to the final state.
  goRevealFinalize = () => {
    clearGoRevealTimers();
    gameOverScreen.querySelectorAll('.go-fly').forEach(e => e.remove());
    finalizeCountUp(finalScoreEl, ctx.score);
    revealEl(revealCard);
    if (ctx.hasAch) revealEl(milestoneCard);
    if (ctx.bark.gain > 0 || ctx.feather.gain > 0) revealEl(collectedCard);
    if (ctx.bark.gain > 0) { barkEarnedEl.textContent = ctx.bark.text; revealEl(barkRow); }
    if (ctx.feather.gain > 0) { featherEarnedEl.textContent = ctx.feather.text; revealEl(featherRow); }
    finalizeWalletValue(gwBarkVal, ctx.bark.to);
    finalizeWalletValue(gwFeatherVal, ctx.feather.to);
    if (ctx.reward) revealEl(reward2xBtn);
    if (ctx.upg.any) revealEl(upgAvailableBtn);
    revealEl(goActions);
    goRevealDone = true;
  };
}

// Staged element: applicable → keeps its layout slot but stays invisible & inert
// (base opacity 0) until revealed; non-applicable → dropped from layout (display:none).
function setStaged(el, applicable) {
  el.classList.remove('shown');
  el.classList.toggle('hidden', !applicable);
}

/* ---------- Rewarded "double bark" offer ----------
   The local economy already banked this run's `earned` bark (upgrade
   multipliers included). Watching a rewarded ad grants that same amount again,
   so the run's bark total ends up at exactly 2x regardless of any 1.5x upgrade.
   All ad calls route through the platform-agnostic services/ads.js facade. */
let rewardAdReady = false;     // cached (sync) so the reveal can decide instantly
let pendingRewardBark = 0;     // doublable bark for the current game-over screen

async function refreshRewardAd() {
  await prepareRewarded();                  // load one (awaits the fetch; no-op on web)
  rewardAdReady = await rewardedReady();
}

// Reset the offer button to its fresh, claimable look for a new game over.
function resetReward2xBtn() {
  reward2xBtn?.classList.remove('is-busy', 'is-claimed', 'shown');
  reward2xBtn?.querySelector('.reward-2x-icon')?.classList.replace('gi-check', 'gi-tv');
  const label = reward2xBtn?.querySelector('[data-i18n]');
  if (label) { label.dataset.i18n = 'gameover.reward_2x'; label.textContent = i18n.t('gameover.reward_2x'); }
}

// Unlocked local achievement ids, for mirroring outward to the platform service.
function unlockedAchievementIds() {
  return listAchievements().filter(s => s.unlocked).map(s => s.def.id);
}

function showGameOver(score, best, isNewBest, previous, newMilestones, newSmashAch, earned, mult, leavesEarned, feathersEarned) {
  hide(hud);
  clearGoRevealTimers();

  finalScoreEl.textContent = '0';
  finalBestEl.textContent = best;
  if (isNewBest && score > 0) show(newBestBadge); else hide(newBestBadge);

  const hasAch = renderUnlockedAchievements(newMilestones, newSmashAch);

  // Wallet (above the title): show the pre-run totals; the reveal ticks the
  // gains in. Materials were already banked in handleGameOver, so subtract this
  // run's gains to get the starting figure.
  const barkTotal = getCoins();
  const featherTotal = getFeathers();
  const barkPre = Math.max(0, barkTotal - earned);
  const featherPre = Math.max(0, featherTotal - feathersEarned);
  gwBarkVal.textContent = String(barkPre);
  gwLeafVal.textContent = String(getLeaves());
  gwFeatherVal.textContent = String(featherPre);
  gameOverScreen.querySelectorAll('.go-fly').forEach(e => e.remove());
  gwBarkItem?.classList.remove('caught');
  gwFeatherItem?.classList.remove('caught');
  // Feather slot only once the economy is in play.
  gwFeatherItem?.classList.toggle('hidden', !(featherUnlocked() || featherTotal > 0));

  // Bark gain carries the multiplier note (x1.5) when one applied this run.
  const multTxt = mult.toFixed(2).replace(/\.?0+$/, '');
  const barkText = (mult > 1 && earned > 0) ? `+${earned} x${multTxt}` : `+${earned}`;
  barkEarnedEl.textContent = barkText;
  featherEarnedEl.textContent = `+${feathersEarned}`;

  // NEW marker on the upgrade button (visibility is handled by the reveal).
  const upg = upgAvailableState();
  upgNewBadge?.classList.toggle('hidden', !upg.hasNew);

  // Rewarded "double bark" offer: only when bark was earned this run and an ad
  // is loaded and ready. pendingRewardBark drives the grant in the click handler.
  pendingRewardBark = earned;
  const canReward = rewardAdReady && earned > 0;
  resetReward2xBtn();

  // Reserve the full final layout up front so nothing reflows while pieces fade in:
  // applicable pieces hold their slot (invisible), the rest drop out entirely.
  setStaged(revealCard, true);
  setStaged(milestoneCard, hasAch);
  setStaged(collectedCard, earned > 0 || feathersEarned > 0);
  setStaged(barkRow, earned > 0);
  setStaged(featherRow, feathersEarned > 0);
  setStaged(reward2xBtn, canReward);
  setStaged(upgAvailableBtn, upg.any);
  setStaged(goActions, true);

  show(gameOverScreen);
  audio.sfx('gameover');
  startGameOverReveal({
    score, isNewBest, hasAch, upg, reward: canReward,
    bark: { from: barkPre, to: barkTotal, gain: earned, text: barkText },
    feather: { from: featherPre, to: featherTotal, gain: feathersEarned, text: `+${feathersEarned}` },
  });
}

/* ---------- Upgrades screen ---------- */
// Each currency is its own tab; the feather tab stays hidden until unlocked.
// The Sonsuz (infinity) tab appears once any endless-track upgrade is maxed.
const UPG_TABS = [
  { id: 'coin', icon: iconHTML('bark'), i18nKey: 'upgrades.tab_coin' },
  { id: 'leaf', icon: iconHTML('leaf'), i18nKey: 'upgrades.tab_leaf' },
  { id: 'feather', icon: iconHTML('feather'), i18nKey: 'upgrades.tab_feather' },
  { id: 'infinity', icon: iconHTML('infinity'), i18nKey: 'upgrades.tab_infinity' },
];
let activeUpgTab = 'coin';

function tabUnlocked(currency) {
  if (currency === 'feather') return featherUnlocked();
  if (currency === 'infinity') return infinityAvailable();
  return true;
}

// A tab is only worth showing if some upgrade actually uses that currency.
function tabHasUpgrades(currency) {
  if (currency === 'infinity') return true;   // visibility is gated by tabUnlocked
  return UPGRADES.some(u => u.currency === currency);
}

// A def is hidden when its parent is unmet AND it isn't flagged to preview locked.
function upgHidden(def) {
  return isLocked(def.id) && !def.showWhenLocked;
}

// Ids of upgrades in a tab the player can buy right now (drives the tab badge).
function availableIdsInTab(currency) {
  if (!tabUnlocked(currency)) return [];
  if (currency === 'infinity') {
    return infinityItems().filter(u => canAffordInfinity(u.id)).map(u => `inf_${u.id}`);
  }
  return UPGRADES
    .filter(u => u.currency === currency && !upgHidden(u) && !movedToInfinity(u) && canAfford(u.id))
    .map(u => u.id);
}

// A maxed endless-track upgrade lives ONLY in the Sonsuz tab from then on.
function movedToInfinity(def) {
  return INFINITY_UPGRADES.some(u => u.id === def.id) && isMaxed(def.id);
}

// Any unlocked-tab upgrade that's available but the player hasn't seen yet.
function hasUnseenUpgrade() {
  const seen = getSeenUpgrades();
  return UPG_TABS.some(tab =>
    availableIdsInTab(tab.id).some(id => !seen.has(id)));
}

function renderUpgTabs() {
  const seen = getSeenUpgrades();
  upgTabsEl.innerHTML = '';
  for (const tab of UPG_TABS) {
    if (!tabUnlocked(tab.id) || !tabHasUpgrades(tab.id)) continue;
    const availIds = availableIdsInTab(tab.id);
    const isNew = availIds.some(id => !seen.has(id));
    const btn = document.createElement('button');
    btn.className = `upg-tab upg-tab-${tab.id}${tab.id === activeUpgTab ? ' active' : ''}`;
    btn.dataset.tab = tab.id;
    btn.setAttribute('aria-label', i18n.t(tab.i18nKey));
    // A first-time-available upgrade shows a NEW badge; once the tab is viewed
    // it falls back to the plain count.
    const badge = isNew
      ? `<span class="upg-tab-new">${i18n.t('upgrades.new_badge')}</span>`
      : (availIds.length > 0 ? `<span class="upg-tab-count">${availIds.length}</span>` : '');
    // The infinity tab has no single currency — its icon stands alone.
    const bal = tab.id === 'infinity' ? '' : `<span class="upg-tab-bal">${formatCoins(currencyBalance(tab.id))}</span>`;
    btn.innerHTML =
      `<span class="upg-tab-icon">${tab.icon}</span>` +
      bal +
      badge;
    btn.addEventListener('click', () => {
      if (activeUpgTab === tab.id) return;
      audio.sfx('tabSwitch');
      activeUpgTab = tab.id;
      renderUpgTabs();
      renderUpgradesList();
    });
    upgTabsEl.appendChild(btn);
  }
  // The tab the player is now looking at counts as seen → its NEW won't show
  // again next time (badges this render already used the pre-mark state).
  markUpgradesSeen(availableIdsInTab(activeUpgTab));
}

function showUpgradesScreen() {
  hide(startScreen);
  if (!tabUnlocked(activeUpgTab) || !tabHasUpgrades(activeUpgTab)) activeUpgTab = 'coin';
  refreshCoinDisplays();
  renderUpgTabs();
  renderUpgradesList();
  show(upgradesScreen);
  audio.playMusic('menu');   // resume menu music when reached straight from game over
}

function hideUpgradesScreen() {
  hide(upgradesScreen);
  if (fromPause) { fromPause = false; showPauseOverlay(); return; }
  refreshStartScreen();
  show(startScreen);
}

function pipMarkup(level, max) {
  let s = '';
  for (let i = 0; i < max; i++) {
    s += `<span class="upg-pip${i < level ? ' filled' : ''}"></span>`;
  }
  return s;
}

function upgItemMarkup(def) {
  const lvl = getUpgradeLevel(def.id);
  const cost = nextCost(def.id);
  const maxed = cost == null;
  const locked = isLocked(def.id);
  const afford = canAfford(def.id);
  const curIcon = currencyIcon(def.currency);

  // Indent only when the parent shares this tab (so it reads as nested under it).
  const parentDef = def.requires ? UPGRADES.find(u => u.id === def.requires) : null;
  const nestedHere = parentDef && parentDef.currency === def.currency;

  let cls = 'upg-item';
  if (nestedHere) cls += ' upg-child';
  if (locked) cls += ' locked';
  else if (maxed) cls += ' maxed';
  else if (afford) cls += ' affordable';

  // Single-level upgrades read as "active" once owned, not "maxed".
  const singleLevel = def.maxLevel === 1;

  let buyContent;
  let buyCls = 'upg-buy';
  if (locked) {
    buyContent = `<span class="upg-buy-lock">${iconHTML('lock')}</span>`;
    buyCls += ' locked-label';
  } else if (maxed) {
    buyContent = `<span>${i18n.t(singleLevel ? 'upgrades.active_label' : 'upgrades.max_level')}</span>`;
    buyCls += ' maxed-label';
  } else {
    buyContent = `<span class="upg-buy-cost">${curIcon} ${cost}</span><span class="upg-buy-label">${i18n.t('upgrades.buy_label')}</span>`;
  }

  // What the player currently owns. Level 0 usually reads "not owned yet", but
  // upgrades flagged `defaultEffect` have a real base value (e.g. 20% feather
  // drop, 2s sprint charge) → show that instead.
  const nowValue = (lvl > 0 || def.defaultEffect)
    ? i18n.t(`${def.i18nKey}.effect`, effectParams(def.id, lvl))
    : i18n.t('upgrades.owned_none');
  const nowRow = `
    <div class="upg-stat upg-stat-now">
      <span class="upg-stat-label">${i18n.t('upgrades.now_label')}</span>
      <span class="upg-stat-val">${nowValue}</span>
    </div>`;

  // What the next purchase will grant (locked hint / maxed note / next effect).
  let nextRow;
  if (locked) {
    nextRow = `<div class="upg-stat upg-stat-next is-locked">
        <span class="upg-stat-val">${iconHTML('lock')} ${i18n.t('upgrades.locked_note')}</span>
      </div>`;
  } else if (maxed) {
    nextRow = `<div class="upg-stat upg-stat-next is-maxed">
        <span class="upg-stat-val"><span class="upg-maxed-tick">✓</span> ${i18n.t(singleLevel ? 'upgrades.active_note' : 'upgrades.maxed_note')}</span>
      </div>`;
  } else {
    nextRow = `<div class="upg-stat upg-stat-next">
        <span class="upg-stat-label">${i18n.t('upgrades.next_label')}</span>
        <span class="upg-stat-val">${i18n.t(`${def.i18nKey}.effect`, effectParams(def.id, lvl + 1))}</span>
      </div>`;
  }

  return { cls, html: `
    <div class="upg-icon">${def.icon}</div>
    <div class="upg-body">
      <div class="upg-name">${i18n.t(`${def.i18nKey}.name`)}</div>
      <div class="upg-stats">
        ${nowRow}
        ${nextRow}
      </div>
      <div class="upg-level-row">
        <span class="upg-pips">${pipMarkup(lvl, def.maxLevel)}</span>
        <span class="upg-level-text">${i18n.t('upgrades.level')} ${lvl}/${def.maxLevel}</span>
      </div>
    </div>
    <button class="${buyCls}" data-id="${def.id}" ${(maxed || !afford) ? 'disabled' : ''}>
      ${buyContent}
    </button>
  ` };
}

function renderUpgradesList() {
  upgListEl.innerHTML = '';
  if (activeUpgTab === 'infinity') {
    for (const u of infinityItems()) {
      const { cls, html } = infinityItemMarkup(u);
      const li = document.createElement('li');
      li.className = cls;
      li.dataset.id = u.id;   // tapping the card opens its info modal
      li.innerHTML = html;
      upgListEl.appendChild(li);
    }
    return;
  }
  for (const def of UPGRADES) {
    if (def.currency !== activeUpgTab) continue;
    // Sprint's children stay hidden until Sprint is owned; flagged items
    // (Focus) instead preview themselves in a locked state.
    if (upgHidden(def)) continue;
    // Maxed endless tracks (claw/dodge) have moved to the Sonsuz tab.
    if (movedToInfinity(def)) continue;
    const { cls, html } = upgItemMarkup(def);
    const li = document.createElement('li');
    li.className = cls;
    li.dataset.id = def.id;   // tapping the card opens its info modal
    li.innerHTML = html;
    upgListEl.appendChild(li);
  }
}

// Sonsuz card: flat price, endless +1 charges. Shows the ability's live total
// (including previous +1s) and how many endless buys were made so far.
function infinityItemMarkup(u) {
  const total = u.id === 'sword' ? swordChargesPerRun() : dodgeChargesPerRun();
  const count = getInfinityCount(u.id);
  const afford = canAffordInfinity(u.id);
  const curIcon = currencyIcon(u.currency);
  const cls = 'upg-item' + (afford ? ' affordable' : '');
  return { cls, html: `
    <div class="upg-icon">${u.icon}</div>
    <div class="upg-body">
      <div class="upg-name">${i18n.t(`${u.i18nKey}.name`)}</div>
      <div class="upg-stats">
        <div class="upg-stat upg-stat-now">
          <span class="upg-stat-label">${i18n.t('upgrades.now_label')}</span>
          <span class="upg-stat-val">${i18n.t(`${u.i18nKey}.effect`, { n: total })}</span>
        </div>
        <div class="upg-stat upg-stat-next">
          <span class="upg-stat-label">${i18n.t('upgrades.next_label')}</span>
          <span class="upg-stat-val">${i18n.t(`${u.i18nKey}.effect`, { n: total + 1 })}</span>
        </div>
      </div>
      <div class="upg-level-row">
        <span class="upg-level-text">${iconHTML('infinity')} +${count}</span>
      </div>
    </div>
    <button class="upg-buy" data-id="${u.id}" data-inf="1" ${afford ? '' : 'disabled'}>
      <span class="upg-buy-cost">${curIcon} ${u.cost}</span><span class="upg-buy-label">+1</span>
    </button>
  ` };
}

upgListEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.upg-buy');
  if (btn) {
    if (btn.disabled) return;
    const id = btn.dataset.id;
    const result = btn.dataset.inf ? tryPurchaseInfinity(id) : tryPurchase(id);
    audio.sfx(result.ok ? 'purchase' : 'purchaseFail');
    if (result.ok) {
      vibrate(20);
      refreshCoinDisplays();   // balances + reveal feather chip when the claw is bought
      renderUpgTabs();         // unlock the feather tab / refresh availability badges
      renderUpgradesList();    // reveal newly unlocked child upgrades
    }
    return;
  }
  // Anywhere else on the card: show the upgrade's description in the info modal.
  const item = e.target.closest('.upg-item');
  if (item?.dataset.id) openUpgModal(item.dataset.id);
});

/* ---------- Upgrade info modal ---------- */
function openUpgModal(id) {
  const def = UPGRADES.find(u => u.id === id);
  if (!def) return;
  upgModalIcon.innerHTML = def.icon;
  upgModalName.textContent = i18n.t(`${def.i18nKey}.name`);
  upgModalDesc.textContent = i18n.t(`${def.i18nKey}.tagline`);
  show(upgModalOverlay);
  audio.sfx('uiTap');
}

function closeUpgModal() { hide(upgModalOverlay); }

upgModalCloseX?.addEventListener('click', closeUpgModal);
upgModalOverlay?.addEventListener('click', (e) => {
  if (e.target === upgModalOverlay) closeUpgModal();
});

/* ---------- Achievements screen ----------
   A grid of square tiles per group. Locked tiles read gray; an unlocked tile
   with an uncollected reward shows a star. Tapping a tile opens a modal that
   reads out the achievement and lets the player collect its reward. */
// Time groups carry seconds, so their {n} is a formatted duration ("10dk"),
// not a raw count.
function achThresholdText(def) {
  return TIME_GROUPS.has(def.group) ? fmtDurationShort(def.threshold) : def.threshold;
}

// A secret keeps its name and description hidden until it is earned — the
// whole point is that the player doesn't know what to aim for.
function achName(def, unlocked) {
  if (def.secret) return i18n.t(unlocked ? `achievements.${def.id}_name` : 'achievements.secret_name');
  return i18n.t(`achievements.${def.group}_name`, { n: achThresholdText(def) });
}

function achDesc(def, unlocked) {
  if (def.secret) return i18n.t(unlocked ? `achievements.${def.id}_desc` : 'achievements.secret_desc');
  return i18n.t(`achievements.${def.group}_desc`, { n: achThresholdText(def) });
}

function achTileNum(def, unlocked) {
  // Secrets count nothing: a '?' while hidden, then nothing — once it's earned
  // the icon is the whole reveal.
  if (def.secret) return unlocked ? '' : '?';
  if (TIME_GROUPS.has(def.group)) return fmtDurationShort(def.threshold);
  const n = def.threshold;
  return n >= 1000 ? `${n / 1000}K` : String(n);
}

// Corner-button badge: how many rewards are waiting to be collected.
function applyAchBadge(badge, n) {
  if (!badge) return;
  if (n > 0) { badge.textContent = n; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

function refreshAchBadge() {
  const n = pendingCount();
  applyAchBadge(achievementsBadge, n);
  applyAchBadge(pauseAchievementsBadge, n);   // mirror onto the pause menu
}

function renderAchievements() {
  achBodyEl.innerHTML = '';
  const all = listAchievements();
  for (const group of ACH_GROUPS) {
    const items = all.filter(st => st.def.group === group.id);
    if (items.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'ach-section';
    const label = document.createElement('div');
    label.className = 'ach-section-label';
    label.textContent = i18n.t(group.i18nKey);
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'ach-grid';
    for (const st of items) {
      const tile = document.createElement('button');
      // Tint follows the reward currency (leaf/coin/feather; gray when reward-less).
      const rewardCls = st.def.reward ? `ach-reward-${st.def.reward.currency}` : 'ach-reward-none';
      let cls = `ach-tile ach-${st.def.group} ${rewardCls}`;
      cls += st.unlocked ? ' unlocked' : ' locked';
      if (st.collectible) cls += ' collectible';
      else if (st.collected) cls += ' collected';
      tile.className = cls;
      tile.dataset.id = st.def.id;
      // An earned secret has no number under its icon; skip the span entirely
      // so the tile's centred column doesn't carry an empty row.
      const num = achTileNum(st.def, st.unlocked);
      tile.innerHTML =
        (st.collectible ? '<span class="ach-star">★</span>' : '') +
        `<span class="ach-tile-icon">${st.unlocked ? st.def.icon : iconHTML('lock')}</span>` +
        (num ? `<span class="ach-tile-num">${num}</span>` : '');
      grid.appendChild(tile);
    }
    section.appendChild(grid);
    achBodyEl.appendChild(section);
  }
}

let achModalId = null;

function stateById(id) {
  return listAchievements().find(st => st.def.id === id) || null;
}

function renderAchModal(st) {
  const { def } = st;
  const medalReward = def.reward ? `ach-reward-${def.reward.currency}` : 'ach-reward-none';
  achModalMedal.className = `ach-modal-medal ${medalReward} ${st.unlocked ? 'unlocked' : 'locked'}`;
  achModalIcon.innerHTML = st.unlocked ? def.icon : iconHTML('lock');
  achModalName.textContent = achName(def, st.unlocked);
  achModalDesc.textContent = achDesc(def, st.unlocked);

  // Progress bar — only meaningful while still locked.
  const pct = Math.round(Math.min(1, st.progress / st.target) * 100);
  const capped = Math.min(st.progress, st.target);
  const isTime = TIME_GROUPS.has(def.group);
  const cur = isTime ? fmtClock(capped) : capped;
  const tgt = isTime ? fmtClock(st.target) : st.target;
  achModalProgress.innerHTML =
    `<span class="ach-prog-bar"><span class="ach-prog-fill" style="width:${pct}%"></span></span>` +
    `<span class="ach-prog-text">${i18n.t('achievements.progress', { cur, tgt })}</span>`;
  // Secrets never show progress — a 0/1 bar would leak that one exists to find.
  achModalProgress.classList.toggle('hidden', st.unlocked || !!def.secret);

  // Reward row only for achievements that actually grant one.
  if (def.reward) {
    achModalReward.innerHTML =
      `<span class="ach-reward-label">${i18n.t('achievements.reward_label')}</span>` +
      `<span class="ach-reward-val">${REWARD_ICONS[def.reward.currency]} +${def.reward.amount}</span>`;
    achModalReward.classList.remove('hidden');
  } else {
    achModalReward.innerHTML = '';
    achModalReward.classList.add('hidden');
  }

  if (st.collectible) {
    achModalCollect.classList.remove('hidden');
    achModalStatus.classList.add('hidden');
  } else {
    achModalCollect.classList.add('hidden');
    achModalStatus.classList.remove('hidden');
    if (!st.unlocked) {
      achModalStatus.textContent = i18n.t('achievements.locked');
      achModalStatus.className = 'ach-modal-status is-locked';
    } else if (st.collected) {
      achModalStatus.textContent = i18n.t('achievements.collected');
      achModalStatus.className = 'ach-modal-status is-collected';
    } else {
      // Unlocked but no reward to collect — just an earned badge.
      achModalStatus.textContent = i18n.t('achievements.unlocked');
      achModalStatus.className = 'ach-modal-status is-collected';
    }
  }
}

// Modal wallet shows the player's current totals; a collected reward ticks in.
function refreshAchWallet() {
  awBarkVal.textContent = String(getCoins());
  awLeafVal.textContent = String(getLeaves());
  awFeatherVal.textContent = String(getFeathers());
  awBarkItem?.classList.remove('caught');
  awLeafItem?.classList.remove('caught');
  awFeatherItem?.classList.remove('caught');
  awFeatherItem?.classList.toggle('hidden', !(featherUnlocked() || getFeathers() > 0));
}

// Remove any in-flight collect tokens (direct frame children; leaves game-over
// flies, which live inside the game-over screen, untouched).
function clearModalFlies() {
  [...gameFrame.children].forEach(c => { if (c.classList.contains('go-fly')) c.remove(); });
}

function openAchModal(id) {
  const st = stateById(id);
  if (!st) return;
  achModalId = id;
  clearModalFlies();
  renderAchModal(st);
  show(achModalOverlay);
  audio.sfx('achOpen');
}

function closeAchModal() {
  achModalId = null;
  clearModalFlies();
  hide(achModalOverlay);
}

function collectFromModal() {
  if (!achModalId) return;
  const res = collectAchievement(achModalId);
  if (!res.ok) return;
  audio.sfx('rewardCollect');
  vibrate(25);
  achModalMedal.classList.remove('reward-pop');
  void achModalMedal.offsetWidth;
  achModalMedal.classList.add('reward-pop');
  // Update the modal to its collected state (the reward box stays as the source).
  renderAchModal(stateById(achModalId));
  renderAchievements();
  refreshAchBadge();

  // Fly the reward from the reward box up into the matching wallet slot, then
  // tick that total in. The reward was already banked, so animate pre → total.
  const { currency, amount } = res.reward;
  const total = currency === 'leaf' ? getLeaves() : currency === 'feather' ? getFeathers() : getCoins();
  const pre = Math.max(0, total - amount);
  const item = currency === 'leaf' ? awLeafItem : currency === 'feather' ? awFeatherItem : awBarkItem;
  const valEl = currency === 'leaf' ? awLeafVal : currency === 'feather' ? awFeatherVal : awBarkVal;
  if (currency === 'feather') awFeatherItem?.classList.remove('hidden');   // ensure visible to land in
  // Host on the frame so the token flies above the modal overlay, from the
  // modal's reward box up to the wallet at the top of the Achievements screen.
  walletEarn(gameFrame, achModalReward, item, valEl, pre, total, `+${amount} ${REWARD_ICONS[currency]}`, currency);
}

function showAchievementsScreen() {
  hide(startScreen);
  refreshAchWallet();
  renderAchievements();
  show(achievementsScreen);
  audio.playMusic('menu');   // resume menu music when reached straight from game over
  // Opportunistically mirror unlocked achievements to the platform service.
  syncAchievements(unlockedAchievementIds());
}

function hideAchievementsScreen() {
  closeAchModal();
  hide(achievementsScreen);
  if (fromPause) { fromPause = false; showPauseOverlay(); return; }
  refreshStartScreen();
  show(startScreen);
}

// Show the bottom ability bar only while at least one usable ability is active.
function refreshAbilityBar() {
  if (!hudBottomBar) return;
  const any = !swordChip.classList.contains('hidden') || (dodgeChip && !dodgeChip.classList.contains('hidden'));
  hudBottomBar.classList.toggle('hidden', !any);
}

function setSwordHUD(n) {
  swordChargesEl.textContent = n;
  if (n > 0) swordChip.classList.remove('hidden');
  else swordChip.classList.add('hidden');
  refreshAbilityBar();
}

function bumpSwordChip() {
  // A gain flight can land after the charge was already spent — don't pulse an
  // empty (hidden) chip.
  if (swordChip.classList.contains('hidden')) return;
  swordChip.classList.remove('slash');
  void swordChip.offsetWidth;
  swordChip.classList.add('slash');
}

function setDodgeHUD(n) {
  if (!dodgeChip) return;
  dodgeChargesEl.textContent = n;
  if (n > 0) dodgeChip.classList.remove('hidden');
  else dodgeChip.classList.add('hidden');
  refreshAbilityBar();
}

function bumpDodgeChip() {
  if (!dodgeChip) return;
  dodgeChip.classList.remove('slash');
  void dodgeChip.offsetWidth;
  dodgeChip.classList.add('slash');
}

/* ---------- Durations ----------
   fmtClock is the running HUD readout (m:ss, h:mm:ss past an hour).
   fmtDurationShort is the compact form the achievement tiles/labels use, and
   goes through i18n so the unit suffixes translate. */
function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

function fmtDurationShort(sec) {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}${i18n.t('achievements.unit_s')}`;
  if (s < 3600) return `${Math.floor(s / 60)}${i18n.t('achievements.unit_m')}`;
  const h = s / 3600;
  // Keep one decimal only when the hours aren't whole (1.5sa reads better than 1sa).
  return `${Number.isInteger(h) ? h : Math.round(h * 10) / 10}${i18n.t('achievements.unit_h')}`;
}

function setTimeHUD(sec) {
  if (timeValueEl) timeValueEl.textContent = fmtClock(sec);
}

/* ---------- Rhythm watch (gizli başarım: Müzisyen) ----------
   Jump stamps are kept at salise (1/100 s) precision, so "the same rhythm" is
   RHYTHM_GAPS consecutive gaps that all match the window's first gap.

   The match can't be salise-exact: the run clock advances once per frame, so at
   60fps a gap already quantises to ~1.7 salise steps and no human clears that
   bar. RHYTHM_TOLERANCE is how far a single gap may drift and still count as
   the same beat; RHYTHM_MIN_GAP keeps a burst of near-instant taps (which the
   climb can produce on its own at high speed) from reading as a played rhythm. */
const RHYTHM_GAPS = 5;           // matching gaps in a row — so 6 jumps
const RHYTHM_TOLERANCE = 0.05;   // ±5 salise per gap
const RHYTHM_MIN_GAP = 0.15;     // seconds; below this it isn't a beat

function checkRhythm() {
  if (rhythmCaught) return;                            // one catch per run is enough
  if (runJumpTimes.length < RHYTHM_GAPS + 1) return;
  const win = runJumpTimes.slice(-(RHYTHM_GAPS + 1));
  const beat = win[1] - win[0];
  if (beat < RHYTHM_MIN_GAP) return;
  for (let i = 2; i < win.length; i++) {
    if (Math.abs((win[i] - win[i - 1]) - beat) > RHYTHM_TOLERANCE) return;
  }
  rhythmCaught = true;
  // Only ever the first time: felt in the run, then announced at game over.
  if (awardSecret('musician')) {
    runNewSecrets.push('musician');
    audio.sfx('milestone');
    vibrate([0, 40, 40, 40]);
  }
}

function setFeatherRunHUD(n) {
  if (!featherRunChip) return;
  featherRunValEl.textContent = n;
  if (n > 0) featherRunChip.classList.remove('hidden');
  else featherRunChip.classList.add('hidden');
}

function bumpFeatherRunChip() {
  if (!featherRunChip || featherRunChip.classList.contains('hidden')) return;
  featherRunChip.classList.remove('slash');
  void featherRunChip.offsetWidth;
  featherRunChip.classList.add('slash');
}

// "+1 <icon>" gain effect in two phases: first it fades in and drifts gently
// upward right where it was earned (the old float-pop look), then it arcs up
// to its HUD chip. Purely cosmetic — the counters are already committed by the
// time this runs, so a flight that lands late can never rewrite a spent count.
// onArrive only pulses the chip (it runs at once when the flight can't be measured).
const HUD_FLOAT_MS = 450;   // phase 1: gentle rise at the pickup point
const HUD_FLY_MS = 550;     // phase 2: travel to the chip
function flyIconToChip(iconKey, sp, chipEl, onArrive) {
  if (!sp || !gameFrame || !chipEl) { onArrive?.(); return; }
  const frameRect = gameFrame.getBoundingClientRect();
  const chipRect = chipEl.getBoundingClientRect();
  if (!chipRect.width || !frameRect.width) { onArrive?.(); return; }
  const tx = chipRect.left - frameRect.left + chipRect.width / 2;
  const ty = chipRect.top - frameRect.top + chipRect.height / 2;
  const el = document.createElement('span');
  el.className = 'hud-fly';
  el.innerHTML = `+1 <span class="gi gi-${iconKey}" aria-hidden="true"></span>`;
  gameFrame.appendChild(el);
  let done = false;
  const finish = () => { if (done) return; done = true; el.remove(); onArrive?.(); };
  const total = HUD_FLOAT_MS + HUD_FLY_MS;
  const p1 = HUD_FLOAT_MS / total;             // where phase 1 ends
  const riseY = sp.y - 34;                     // how high the float drifts
  const midX = (sp.x + tx) / 2;
  const midY = Math.min(riseY, ty) - 30;       // arc over the flight path
  el.animate([
    { transform: `translate(${sp.x}px, ${sp.y}px) scale(0.6)`, opacity: 0, offset: 0 },
    { transform: `translate(${sp.x}px, ${sp.y - 14}px) scale(1.15)`, opacity: 1, offset: 0.12 },
    { transform: `translate(${sp.x}px, ${riseY}px) scale(1)`, opacity: 1, offset: p1, easing: 'ease-in' },
    { transform: `translate(${midX}px, ${midY}px) scale(0.95)`, opacity: 1, offset: p1 + (1 - p1) * 0.5 },
    { transform: `translate(${tx}px, ${ty}px) scale(0.6)`, opacity: 0.95, offset: 1 },
  ], { duration: total, easing: 'ease-in-out' }).onfinish = finish;
  setTimeout(finish, total + 150);   // safety cleanup
}

// One bird killed: count it for the smash achievements, then roll a 0–100 dice —
// a feather drops when the roll lands at or under this run's threshold (20/35/50/75).
// `sp` is the bird's screen position, used to pop the "+1 🪶" right where it died.
function registerKill(sp) {
  runSmashes += 1;
  const roll = Math.floor(Math.random() * 101);   // 0–100 inclusive
  if (roll <= runFeatherThreshold) {
    runFeathers += 1;
    // Tally commits immediately (see onSwordCharges); the flight is decoration.
    setFeatherRunHUD(runFeathers);
    flyIconToChip('feather', sp, featherRunChip, bumpFeatherRunChip);
    audio.sfx('feather');
    vibrate(15);
  }
}

// Floating "+N" above the score (sprint-jump bonus / sprint smash)
function popScore(amount) {
  audio.sfx('scorePop');
  const el = document.createElement('div');
  el.className = 'score-pop';
  el.textContent = `+${amount}`;
  hud.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
  // safety cleanup in case the animationend event is missed
  setTimeout(() => el.remove(), 1200);
}

function ensureGame() {
  if (game) return;
  game = new PanthopGame(canvas, {
    onScore: (s) => {
      scoreValue.textContent = s;
      scoreValue.classList.remove('bump');
      void scoreValue.offsetWidth;
      scoreValue.classList.add('bump');
      audio.gameTier(s);   // crossfade game music up a tier as difficulty climbs
    },
    onSwordCharges: (n, gained, sp) => {
      // The count commits right now, never on flight arrival: a claw honed by a
      // sprint charge can be spent on a bird before its icon lands, and a
      // deferred commit would resurrect the already-spent claw on the HUD.
      setSwordHUD(n);
      if (gained) {
        audio.sfx('rewardCollect');
        // Purely decorative flight down to the ability chip.
        flyIconToChip('claw', sp, swordChip, bumpSwordChip);
      }
    },
    onSwordSlash: (n, sp) => {
      setSwordHUD(n);
      bumpSwordChip();
      vibrate(25);
      registerKill(sp);    // a shredded bird may drop a feather
    },
    // Each jump is counted and stamped with the second of the run it happened
    // on; both are banked at game over (the count into the lifetime total, the
    // stamps into the per-run log).
    onJump: (t) => {
      runJumps += 1;
      runJumpTimes.push(Math.round((Number(t) || 0) * 100) / 100);
      checkRhythm();   // did this jump complete a steady beat? (secret: Müzisyen)
    },
    onTime: (sec) => setTimeHUD(sec),
    onDodgeCharges: (n) => setDodgeHUD(n),
    onDodge: (n) => { setDodgeHUD(n); bumpDodgeChip(); vibrate([0, 30, 30, 30]); },
    onScorePop: (n) => popScore(n),
    onGameOver: (s) => handleGameOver(s),
  });
}

function startGame() {
  clearGoRevealTimers();
  fromPause = false;
  hide(startScreen);
  hide(gameOverScreen);
  hide(upgradesScreen);
  hide(settingsScreen);
  hide(achievementsScreen);
  hide(pauseOverlay);
  closeAchModal();
  closeConfirm();
  hide(newBestBadge);
  show(hud);
  scoreValue.textContent = '0';
  runSmashes = 0;
  runFeathers = 0;
  runFeatherThreshold = featherDropPercent();   // snapshot the dice threshold for this run
  runJumps = 0;
  runJumpTimes = [];
  runStartedAt = Date.now();
  rhythmCaught = false;
  runNewSecrets = [];
  setFeatherRunHUD(0);
  setTimeHUD(0);
  audio.gameTier(0);   // start the climb soundtrack at tier 1
  ensureGame();
  game.setModifiers(snapshotModifiers());
  game.start();
  markPlaying(true);
  requestWakeLock();
  lockPortrait();
}

function handleGameOver(score) {
  audio.stopMusic();   // duck the climb track; the game-over reveal plays its own stingers
  const { best, isNewBest, previous, newMilestones, leavesEarned } = pushScore(score);
  const mult = coinMultiplier();
  const earned = coinsEarned(score);
  if (earned > 0) addCoins(earned);
  // Feathers were rolled per-kill during the run (chance-based); bank them now.
  const feathersEarned = runFeathers;
  if (feathersEarned > 0) addFeathers(feathersEarned);
  runFeathers = 0;
  // Bank smashes into the lifetime total and detect freshly unlocked smash tiers.
  const prevSmashTotal = getSmashTotal();
  registerSmashes(runSmashes);
  const newSmashAch = newlyUnlockedSmashAchievements(prevSmashTotal, getSmashTotal());
  runSmashes = 0;
  // Bank this run toward the lifetime run/jump achievement counters.
  addRun();
  addJumps(runJumps);
  runJumps = 0;
  // Bank the run's clock (lifetime play time + longest-run best) and file the
  // jump log. Read before anything resets the game, so the duration is this run's.
  const runSeconds = game ? game.getRunTime() : 0;
  addPlayTime(runSeconds);
  recordRunLog({ startedAt: runStartedAt, duration: runSeconds, jumps: runJumpTimes });
  runJumpTimes = [];
  // Record the run with its earned materials so the recent list can show them.
  // Leaves aren't banked per-run anymore (they're collected from Achievements),
  // so the recent entry reports 0 leaves.
  pushRecent({ score, bark: earned, leaf: 0, feather: feathersEarned });
  vibrate([0, 60, 40, 120]);
  markPlaying(false);
  releaseWakeLock();
  // Mirror any achievements unlocked by this run out to the platform service.
  syncAchievements(unlockedAchievementIds());
  // small delay so collision feels felt
  setTimeout(() => showGameOver(score, best, isNewBest, previous, newMilestones, newSmashAch, earned, mult, leavesEarned, feathersEarned), 450);
}

/* ---------- Input ---------- */
function bindGameTap() {
  let pressing = false;
  const inActiveGame = () =>
    consentScreen.classList.contains('hidden') &&
    startScreen.classList.contains('hidden') &&
    gameOverScreen.classList.contains('hidden') &&
    upgradesScreen.classList.contains('hidden') &&
    settingsScreen.classList.contains('hidden') &&
    achievementsScreen.classList.contains('hidden') &&
    achModalOverlay.classList.contains('hidden') &&
    confirmOverlay.classList.contains('hidden') &&
    pauseOverlay.classList.contains('hidden') &&
    game;

  const onDown = () => {
    if (!inActiveGame()) return;
    pressing = true;
    game.onPressStart();
  };
  const onUp = () => {
    if (!pressing) return;
    pressing = false;
    game.onPressEnd();   // release performs the jump
    vibrate(15);
  };

  canvas.addEventListener('pointerdown', onDown, { passive: true });
  // Listen on window so a release that drifts off the canvas still ends the hold
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
}

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);
homeBtn.addEventListener('click', () => {
  clearGoRevealTimers();
  // Bump the coin chip so the player feels coins arriving in the wallet
  setTimeout(bumpCoinChip, 80);
  showStartScreen();
});
upgradesBtn.addEventListener('click', showUpgradesScreen);
upgradesBackBtn.addEventListener('click', hideUpgradesScreen);

/* ---------- Achievements wiring ---------- */
achievementsBtn?.addEventListener('click', showAchievementsScreen);
achievementsBackBtn?.addEventListener('click', hideAchievementsScreen);
achBodyEl?.addEventListener('click', (e) => {
  const tile = e.target.closest('.ach-tile');
  if (!tile) return;
  openAchModal(tile.dataset.id);
});
achModalCollect?.addEventListener('click', collectFromModal);
achModalCloseX?.addEventListener('click', closeAchModal);
achModalOverlay?.addEventListener('click', (e) => {
  if (e.target === achModalOverlay) closeAchModal();
});
upgAvailableBtn.addEventListener('click', () => {
  fromPause = false;
  clearGoRevealTimers();
  hide(gameOverScreen);
  // Jump straight to the first tab with a buyable upgrade, in priority order
  // kabuk (coin) → yaprak (leaf) → tuy (feather) — UPG_TABS is already in that order.
  const target = UPG_TABS.find(tab => availableIdsInTab(tab.id).length > 0);
  if (target) activeUpgTab = target.id;
  showUpgradesScreen();
});
goAchBtn?.addEventListener('click', () => {
  fromPause = false;
  clearGoRevealTimers();
  hide(gameOverScreen);
  showAchievementsScreen();
});

// Watch a rewarded ad to double this run's bark. The economy already banked
// `earned`; on a completed view we grant the same amount again (final = 2x).
reward2xBtn?.addEventListener('click', async () => {
  if (reward2xBtn.classList.contains('is-busy') || reward2xBtn.classList.contains('is-claimed')) return;
  const bonus = pendingRewardBark;
  if (bonus <= 0) return;
  reward2xBtn.classList.add('is-busy');

  audio.suspend();   // pause music/ambience so the ad's sound plays alone
  const rewarded = await showRewarded();
  if (!rewarded) {
    audio.resume();
    reward2xBtn.classList.remove('is-busy');   // user backed out / no fill — allow retry
    refreshRewardAd();
    return;
  }

  // Grant the bonus, then turn the button green with a check.
  addCoins(bonus);
  pendingRewardBark = 0;
  reward2xBtn.classList.remove('is-busy');
  reward2xBtn.classList.add('is-claimed');
  reward2xBtn.querySelector('.reward-2x-icon')?.classList.replace('gi-tv', 'gi-check');
  const label = reward2xBtn.querySelector('[data-i18n]');
  if (label) { label.dataset.i18n = 'gameover.reward_2x_done'; label.textContent = i18n.t('gameover.reward_2x_done'); }
  vibrate(25);
  const total = getCoins();
  const pre = Math.max(0, total - bonus);
  // The webview just resumed from a fullscreen ad: re-arm audio (the OS may have
  // suspended it) and defer the coin fly two frames so the compositor is ready
  // and the rise/landing actually animates and is heard.
  audio.resume();
  audio.sfx('reward2x');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    audio.sfx('countUp');   // ticking sound as the wallet total climbs
    // The collected card now reflects the doubled bark (original + granted bonus).
    if (barkEarnedEl) {
      barkEarnedEl.textContent = `+${bonus * 2}`;
      barkEarnedEl.classList.remove('bump');
      void barkEarnedEl.offsetWidth;
      barkEarnedEl.classList.add('bump');
    }
    flyToWallet(gameOverScreen, reward2xBtn, gwBarkItem, `+${bonus}`, 'coin', () => {
      landInWallet(gwBarkItem, gwBarkVal, pre, total);
      // The doubled bark may have just made an upgrade affordable.
      refreshUpgAvailable();
    });
  }));
  refreshRewardAd();
});

// Tap anywhere during the game-over reveal to skip straight to the final layout.
gameOverScreen.addEventListener('pointerdown', (e) => {
  if (goRevealDone) return;
  if (e.target.closest('#upg-available, #reward-2x-btn, #go-ach-btn, #retry-btn, #home-btn')) return; // let buttons act
  goRevealFinalize?.();
});

settingsBtn.addEventListener('click', showSettingsScreen);
settingsBackBtn.addEventListener('click', hideSettingsScreen);

// In-game pause menu
pauseBtn?.addEventListener('click', pauseGame);
pauseResumeBtn?.addEventListener('click', resumeGame);
pauseHomeBtn?.addEventListener('click', quitToMenu);
// Sub-screens opened from pause set `fromPause` so their Back returns here.
pauseSettingsBtn?.addEventListener('click', () => { fromPause = true; hide(pauseOverlay); showSettingsScreen(); });
pauseUpgradesBtn?.addEventListener('click', () => { fromPause = true; hide(pauseOverlay); showUpgradesScreen(); });
pauseAchievementsBtn?.addEventListener('click', () => { fromPause = true; hide(pauseOverlay); showAchievementsScreen(); });

// On/off switch: off → 0 and hides the slider; on → restores the last % and
// reveals the slider. Turning on previews with a confirming tap.
audioLevelsEl?.addEventListener('click', (e) => {
  const sw = e.target.closest('.audio-switch');
  const ch = sw?.closest('.audio-row')?.dataset.ch;
  if (!ch) return;
  const on = !audio.isOn(ch);
  audio.setEnabled(ch, on);
  renderAudioLevels();
  if (on) audio.sfx('uiTap');
});

// Live drag: set the channel volume and update the fill/% without re-rendering
// (so the thumb keeps focus mid-drag).
audioLevelsEl?.addEventListener('input', (e) => {
  const slider = e.target.closest('.audio-slider');
  const ch = slider?.closest('.audio-row')?.dataset.ch;
  if (!ch) return;
  const v = parseInt(slider.value, 10);
  audio.setVolume(ch, v / 100);
  slider.style.setProperty('--pct', v + '%');
  const out = slider.parentElement.querySelector('.audio-pct');
  if (out) out.textContent = v + '%';
});

// On release, re-render so dragging to 0% flips the switch off and hides the slider.
audioLevelsEl?.addEventListener('change', (e) => {
  if (e.target.closest('.audio-slider')) renderAudioLevels();
});

// Recent ↔ Best score tabs on the start screen
scoreTabsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.score-tab');
  if (!btn || btn.dataset.tab === activeScoreTab) return;
  audio.sfx('tabSwitch');
  activeScoreTab = btn.dataset.tab;
  updateScoreTabs();
  renderScoreList();
});

// Reset progress → confirm → wipe storage → restart the game from scratch
resetProgressBtn.addEventListener('click', openConfirm);
confirmNoBtn.addEventListener('click', closeConfirm);
// Enable the confirm button only once the typed word matches; Enter submits.
confirmInput.addEventListener('input', refreshConfirmState);
confirmInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && confirmMatches()) confirmYesBtn.click();
});
confirmYesBtn.addEventListener('click', () => {
  if (!confirmMatches()) return;   // guard: must type EVET / YES first
  resetProgress();
  audio.sfx('reset');
  vibrate(30);
  // Brief pause so the reset sweep is heard before the reload tears down audio.
  setTimeout(() => location.reload(), 260);
});
confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirm(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!confirmOverlay.classList.contains('hidden')) closeConfirm();
  else if (!upgModalOverlay.classList.contains('hidden')) closeUpgModal();
  else if (!achModalOverlay.classList.contains('hidden')) closeAchModal();
  else if (!pauseOverlay.classList.contains('hidden')) resumeGame();
  else if (!achievementsScreen.classList.contains('hidden')) hideAchievementsScreen();
  else if (game && game.running && !hud.classList.contains('hidden')) pauseGame();   // pause mid-run
});

// Auto-pause + mute when the app goes to the background (mobile: minimized,
// app-switched, or screen off — all fire visibilitychange). Otherwise HTMLAudio
// music/ambience keep playing and an active run keeps its state; both restore on
// return. The run is NOT auto-resumed — the pause overlay stays up for the player.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (game && game.running && !hud.classList.contains('hidden')
        && pauseOverlay.classList.contains('hidden')) {
      pauseGame();
    }
    audio.suspend();          // silence music + ambience while hidden
  } else {
    audio.resume();           // re-arm the audio ctx / music / ambience on return
  }
});

i18n.onChange(() => {
  if (!startScreen.classList.contains('hidden')) refreshStartScreen();
  if (!upgradesScreen.classList.contains('hidden')) { renderUpgTabs(); renderUpgradesList(); }
  if (!settingsScreen.classList.contains('hidden')) { renderLangOptions(); renderAudioLevels(); }
  if (!achievementsScreen.classList.contains('hidden')) {
    renderAchievements();
    if (!achModalOverlay.classList.contains('hidden') && achModalId) renderAchModal(stateById(achModalId));
  }
});

// Prevent scroll / zoom on mobile
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
  if (e.target === canvas) e.preventDefault();
}, { passive: false });

// Generic UI click feedback: every button gets a soft tap, except the ones that
// play their own dedicated sound (buy, tabs, collect, reward, reset).
const SFX_OWN_CLICK = '.upg-buy, .upg-tab, .score-tab, .ach-tile, .audio-switch, #ach-modal-collect, #reward-2x-btn, #confirm-yes';
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.disabled || btn.matches(SFX_OWN_CLICK)) return;
  audio.sfx('uiTap');
}, true);

bindGameTap();

/* ---------- Service worker registration ---------- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return; // SW unsupported under file://
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — activate immediately on next page load
            sw.postMessage('SKIP_WAITING');
          }
        });
      });
    } catch (err) { console.warn('SW register failed', err); }
  });
}

consentAcceptBtn?.addEventListener('click', acceptConsent);
adPrivacyBtn?.addEventListener('click', showAdPrivacyOptions);

(async () => {
  audio.initAudio();
  try { await i18n.init(); } catch (err) { console.error('i18n init failed', err); }
  // The policy URL differs per language, so re-point the links on every switch.
  applyPrivacyLinks();
  i18n.onChange(applyPrivacyLinks);
  registerServiceWorker();
  if (hasAcceptedPrivacy()) enterApp();
  else showConsentScreen();
})();
