/* Google Play Games provider (Android).
   Loaded only on Android by js/services/achievements.js. Binds to the native
   capacitor-game-connect-7 plugin through the Capacitor bridge. Mirrors local
   achievement unlocks to Play Games; the local system stays authoritative. */

import { registerPlugin } from '@capacitor/core';

const GameConnect = registerPlugin('CapacitorGameConnect');

/* Local achievement id -> Play Games achievement id (from the Play Console).
   TODO(real-ids): fill these in once the Play Games Services achievements are
   created. Local ids come from js/achievements.js:
     milestones  ms_<score>     (e.g. ms_500)
     smashes     smash_<n>      (smash_10, smash_30, ...)
     runs        runs_<n>       (runs_5, runs_25, ...)
     jumps       jumps_<n>      (jumps_50, jumps_250, ...)
   Unmapped local ids are skipped silently. */
const LOCAL_TO_PLAY = {
  // 'ms_500':    'CgkIxxxxxxxxxxAQAg',
  // 'smash_10':  'CgkIxxxxxxxxxxAQAh',
  // 'runs_5':    'CgkIxxxxxxxxxxAQAi',
};

let signedIn = false;
const pushed = new Set();   // local ids already mirrored this session (avoid spam)

async function signIn() {
  if (signedIn) return;
  await GameConnect.signIn();
  signedIn = true;
}

// Mirror each unlocked local id to Play Games. Idempotent on Google's side; we
// also de-dupe per session. Failed pushes stay un-marked so a later sync retries.
async function syncAchievements(localUnlockedIds = []) {
  if (!signedIn) {
    try { await signIn(); } catch { return; }
  }
  for (const localId of localUnlockedIds) {
    if (pushed.has(localId)) continue;
    const playId = LOCAL_TO_PLAY[localId];
    if (!playId) continue;
    try {
      await GameConnect.unlockAchievement({ achievementID: playId });
      pushed.add(localId);
    } catch { /* retry on a later sync */ }
  }
}

export default { signIn, syncAchievements };
