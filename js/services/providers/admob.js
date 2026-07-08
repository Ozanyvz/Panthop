/* Google AdMob provider (Android + iOS).
   Loaded only on native platforms by js/services/ads.js. Binds to the native
   @capacitor-community/admob plugin through the Capacitor bridge — no bundler
   needed, only the vendored @capacitor/core. Exposes a tiny rewarded-ad API. */

import { registerPlugin } from '@capacitor/core';

const AdMob = registerPlugin('AdMob');

/* ---- Ad unit configuration ----
   Google's official TEST rewarded units are used until real ids are provided.
   To go live: paste the real rewarded unit ids below and set USE_TEST_ADS=false.
   (The AdMob App ID itself lives in AndroidManifest.xml / iOS Info.plist.) */
const REWARDED_UNIT = {
  android: 'ca-app-pub-3940256099942544/5224354917', // Google test rewarded (Android)
  ios:     'ca-app-pub-3940256099942544/1712485313', // Google test rewarded (iOS)
};
const USE_TEST_ADS = true;

const REWARD_EVENT = 'onRewardedVideoAdReward';

function rewardedUnitId() {
  const platform = globalThis.Capacitor?.getPlatform?.();
  return platform === 'ios' ? REWARDED_UNIT.ios : REWARDED_UNIT.android;
}

let initialized = false;
let loaded = false;       // a rewarded ad is fetched and ready to show
let preparing = null;     // in-flight prepare promise (dedupes concurrent calls)

async function init() {
  if (initialized) return;
  await AdMob.initialize();
  initialized = true;
  prepareRewarded();      // warm up the first ad in the background
}

// Fetch a rewarded ad if one isn't already loaded/loading.
async function prepareRewarded() {
  if (loaded) return;
  if (preparing) return preparing;
  preparing = (async () => {
    try {
      await AdMob.prepareRewardVideoAd({ adId: rewardedUnitId(), isTesting: USE_TEST_ADS });
      loaded = true;
    } catch {
      loaded = false;
    } finally {
      preparing = null;
    }
  })();
  return preparing;
}

function rewardedReady() {
  return loaded;
}

// Show the loaded rewarded ad. Resolves true ONLY when the user earned the
// reward (detected via the Rewarded event and/or the resolved reward item).
async function showRewarded() {
  if (!loaded) await prepareRewarded();
  if (!loaded) return false;

  let rewarded = false;
  const handle = await AdMob.addListener(REWARD_EVENT, () => { rewarded = true; });
  try {
    const item = await AdMob.showRewardVideoAd();   // resolves when the ad flow ends
    if (item && (item.amount != null || item.type != null)) rewarded = true;
  } catch {
    rewarded = false;
  } finally {
    try { await handle.remove(); } catch { /* ignore */ }
    loaded = false;        // each ad is single-use
    prepareRewarded();     // preload the next one for the following game over
  }
  return rewarded;
}

export default { init, prepareRewarded, rewardedReady, showRewarded };
