/* Platform-agnostic game-achievements service (facade).
   Mirrors the local achievement state (js/achievements.js) to the platform's
   game service. Game code imports ONLY this module. The concrete backend is
   chosen by platform and loaded lazily:
     android -> Google Play Games   (providers/playgames.js)
     ios     -> Apple Game Center   (providers/gamecenter.js, added later)
     web/dev -> none (no-op)
   The local economy/achievement system stays the single source of truth; this
   layer only reflects unlocks outward, so adding iOS never conflicts. */

let providerPromise = null;

function nativePlatform() {
  const c = globalThis.Capacitor;
  return c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()
    ? c.getPlatform()
    : null;
}

function getProvider() {
  if (providerPromise) return providerPromise;
  const p = nativePlatform();
  if (p === 'android') {
    providerPromise = import('./providers/playgames.js').then(m => m.default).catch(() => null);
  } else if (p === 'ios') {
    // iOS Game Center provider is added when iOS support lands.
    providerPromise = import('./providers/gamecenter.js').then(m => m.default).catch(() => null);
  } else {
    providerPromise = Promise.resolve(null);
  }
  return providerPromise;
}

// Best-effort silent sign-in to the platform game service. Safe on web (no-op).
export async function initGameServices() {
  const provider = await getProvider();
  if (provider) { try { await provider.signIn(); } catch { /* non-fatal */ } }
}

// Mirror unlocked local achievement ids outward. Idempotent on the platform
// side, so callers may pass the full set of currently-unlocked ids each time.
export async function syncAchievements(localUnlockedIds) {
  if (!localUnlockedIds || localUnlockedIds.length === 0) return;
  const provider = await getProvider();
  if (provider) { try { await provider.syncAchievements(localUnlockedIds); } catch { /* non-fatal */ } }
}
