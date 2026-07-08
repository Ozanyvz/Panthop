/* Platform-agnostic ads service (facade).
   Game code imports ONLY this module — never a concrete ad SDK. Concrete
   providers live in ./providers/ and are loaded lazily per platform, so web /
   dev builds never touch native plugin code or the vendored @capacitor/core.
   Adding iOS later needs no change here: the AdMob provider is cross-platform. */

let providerPromise = null;

// The native platform ('android' | 'ios') or null on web/dev. Read from the
// global bridge Capacitor injects in native webviews — no static import, so the
// vendored @capacitor/core is only fetched when a provider actually loads.
function nativePlatform() {
  const c = globalThis.Capacitor;
  return c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()
    ? c.getPlatform()
    : null;
}

// DEV-only: on a local host (or with ?mockads) and no native bridge, stand in a
// fake rewarded ad so the game-over "2x bark" flow can be tested in a browser.
// Never active on production web (real domain) or on Android/iOS — those use the
// real AdMob provider above. Remove nothing for release; it simply won't trigger.
function isMockHost() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '' ||
    location.search.includes('mockads');
}
function mockProvider() {
  return {
    async init() {},
    async rewardedReady() { return true; },
    async prepareRewarded() {},
    async showRewarded() {
      // Returns true only if the "ad" is completed — Cancel tests the declined path.
      return globalThis.confirm?.('[DEV reklam] Odulu vermek icin Tamam, vazgecmek icin Iptal.') ?? true;
    },
  };
}

// Resolve (once) the ad provider for this platform, or null when unsupported.
function getProvider() {
  if (providerPromise) return providerPromise;
  const p = nativePlatform();
  if (p === 'android' || p === 'ios') {
    providerPromise = import('./providers/admob.js').then(m => m.default).catch(() => null);
  } else if (isMockHost()) {
    providerPromise = Promise.resolve(mockProvider());
  } else {
    providerPromise = Promise.resolve(null);
  }
  return providerPromise;
}

// Initialise the SDK and warm up the first rewarded ad. Safe on web (no-op).
export async function initAds() {
  const provider = await getProvider();
  if (provider) { try { await provider.init(); } catch { /* non-fatal */ } }
}

// True only when a rewarded ad is loaded and ready to show right now.
export async function rewardedReady() {
  const provider = await getProvider();
  return provider ? provider.rewardedReady() : false;
}

// Preload a rewarded ad (idempotent). Lets the UI light up the offer button.
export async function prepareRewarded() {
  const provider = await getProvider();
  if (provider) { try { await provider.prepareRewarded(); } catch { /* non-fatal */ } }
}

// Show the rewarded ad. Resolves true ONLY if the user earned the reward.
export async function showRewarded() {
  const provider = await getProvider();
  if (!provider) return false;
  try { return await provider.showRewarded(); } catch { return false; }
}
