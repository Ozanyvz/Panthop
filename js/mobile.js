/* Mobile-only enhancements: vibration, wake lock, orientation lock. */

const HAPTICS_KEY = 'wj_haptics_v1';

export function hapticsEnabled() {
  const v = localStorage.getItem(HAPTICS_KEY);
  return v === null ? true : v === '1';
}
export function setHaptics(on) {
  localStorage.setItem(HAPTICS_KEY, on ? '1' : '0');
}

export function vibrate(pattern) {
  if (!hapticsEnabled()) return;
  if (!('vibrate' in navigator)) return;
  try { navigator.vibrate(pattern); } catch {}
}

/* ---------- Wake Lock ---------- */
let wakeLock = null;

export async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* permission/visibility issue — non-fatal */ }
}

export async function releaseWakeLock() {
  if (!wakeLock) return;
  try { await wakeLock.release(); } catch {}
  wakeLock = null;
}

// Re-acquire when tab becomes visible again (browser auto-releases on hide)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.body.dataset.wjPlaying === '1') {
    requestWakeLock();
  }
});

export function markPlaying(on) {
  document.body.dataset.wjPlaying = on ? '1' : '0';
}

/* ---------- Orientation lock (best-effort, requires fullscreen on most browsers) ---------- */
export async function lockPortrait() {
  if (!screen.orientation || typeof screen.orientation.lock !== 'function') return;
  try { await screen.orientation.lock('portrait'); } catch { /* often NotSupported on iOS / desktop */ }
}
