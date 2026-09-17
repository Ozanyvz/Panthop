/* Google AdMob provider (Android + iOS).
   Loaded only on native platforms by js/services/ads.js. Binds to the native
   @capacitor-community/admob plugin through the Capacitor bridge — no bundler
   needed, only the vendored @capacitor/core. Exposes a tiny rewarded-ad API. */

import { registerPlugin } from '@capacitor/core';

const AdMob = registerPlugin('AdMob');

/* ---- Ad unit configuration ----
   The App ID that pairs with these lives in AndroidManifest.xml (Android) and
   tools/patch-ios-plist.sh -> Info.plist (iOS).

   !! iOS IS STILL ON GOOGLE'S TEST UNIT. AdMob ids are per-platform: an iOS app
   has to be created separately in the console and its own rewarded unit pasted
   below before the first App Store build. Google's test units always serve test
   ads no matter what USE_TEST_ADS says, so iOS simply keeps showing test ads
   until then — it will not earn, and must not ship that way. */
const REWARDED_UNIT = {
  android: 'ca-app-pub-6482116152023017/3833875129', // Panthop rewarded (Android)
  ios:     'ca-app-pub-3940256099942544/1712485313', // TODO(ios-ids): Google TEST unit
};
// Registers the running device as a test device. Real units + false = real ads.
const USE_TEST_ADS = false;

const REWARD_EVENT = 'onRewardedVideoAdReward';
const DISMISS_EVENT = 'onRewardedVideoAdDismissed';
const FAIL_SHOW_EVENT = 'onRewardedVideoAdFailedToShow';

function rewardedUnitId() {
  const platform = globalThis.Capacitor?.getPlatform?.();
  return platform === 'ios' ? REWARDED_UNIT.ios : REWARDED_UNIT.android;
}

let initialized = false;
let loaded = false;       // a rewarded ad is fetched and ready to show
let preparing = null;     // in-flight prepare promise (dedupes concurrent calls)
let privacyOptions = false;  // UMP says this user must be able to reopen the form

/* ---- Consent, before any ad SDK work ----
   Two separate obligations, in this order:

   1. Google's UMP form (GDPR). Required for players in the EEA, the UK and
      Switzerland; everywhere else requestConsentInfo() comes back NOT_REQUIRED
      and nothing is shown. Without it Google can refuse to serve ads in those
      regions. The message itself is authored in the AdMob console (Privacy &
      messaging → GDPR), not here.
   2. Apple's ATT prompt (iOS 14+). Has to come AFTER the UMP form — that form
      is what explains why the app is about to ask. Without it the IDFA is off
      limits, and shipping the Info.plist string while never asking is what
      gets a build rejected under 5.1.2.

   Both are best-effort: a failure here must not cost the player their rewarded
   ad, it only means ads are served non-personalised. */
async function ensureConsent() {
  try {
    const info = await AdMob.requestConsentInfo();
    if (info?.status === 'REQUIRED' && info?.isConsentFormAvailable) {
      await AdMob.showConsentForm();
    }
    // Google requires a way back into the form for anyone it applies to; the
    // Settings screen reads this and reveals its button (see js/services/ads.js).
    privacyOptions = info?.privacyOptionsRequirementStatus === 'REQUIRED';
  } catch { /* non-fatal — ads fall back to non-personalised */ }

  if (globalThis.Capacitor?.getPlatform?.() === 'ios') {
    try {
      const { status } = await AdMob.trackingAuthorizationStatus();
      // Only 'notDetermined' may be asked; re-asking a decided user throws.
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    } catch { /* non-fatal */ }
  }
}

async function init() {
  if (initialized) return;
  await ensureConsent();  // must settle before the SDK reads any identifier
  await AdMob.initialize();
  initialized = true;
  prepareRewarded();      // warm up the first ad in the background
}

// True only where UMP says the player is entitled to revisit their choice.
function privacyOptionsRequired() {
  return privacyOptions;
}

// Reopens Google's consent form from Settings.
async function showPrivacyOptions() {
  try { await AdMob.showPrivacyOptionsForm(); } catch { /* user closed it / not available */ }
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

/* Show the loaded rewarded ad. Resolves true ONLY when the player earned the
   reward, and — importantly — ALWAYS resolves.

   showRewardVideoAd() cannot be awaited on its own: the plugin resolves that
   call only from inside the reward callback (Android AdRewardExecutor ->
   RewardedAdCallbackAndListeners.getOnUserEarnedRewardListener, iOS
   AdRewardExecutor's reward closure). A player who closes the ad early earns
   nothing, so the call is never resolved or rejected and the promise stays
   pending forever — which used to leave the "2x bark" button stuck mid-flight
   with no way to retry.

   Google's own fullscreen callbacks are what actually bound the ad: Dismissed
   fires whether or not a reward was earned, FailedToShow when it never opened.
   So the reward event just raises a flag and those two end the wait. */
async function showRewarded() {
  if (!loaded) await prepareRewarded();
  if (!loaded) return false;

  let rewarded = false;
  let end;
  const ended = new Promise((resolve) => { end = resolve; });
  const handles = [];
  const listen = async (event, fn) => {
    try { handles.push(await AdMob.addListener(event, fn)); } catch { /* ignore */ }
  };

  // Registered before the ad opens, or an event could land before we listen.
  await listen(REWARD_EVENT, () => { rewarded = true; });
  await listen(DISMISS_EVENT, () => end());
  await listen(FAIL_SHOW_EVENT, () => end());

  try {
    // Rejects when nothing was prepared — that is the one case where no
    // fullscreen callback will ever fire, so end the wait ourselves.
    AdMob.showRewardVideoAd().catch(() => end());
    await ended;
  } finally {
    for (const h of handles) { try { await h.remove(); } catch { /* ignore */ } }
    loaded = false;        // each ad is single-use
    prepareRewarded();     // preload the next one for the following game over
  }
  return rewarded;
}

export default {
  init, prepareRewarded, rewardedReady, showRewarded,
  privacyOptionsRequired, showPrivacyOptions,
};
