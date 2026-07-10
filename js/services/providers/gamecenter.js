/* Apple Game Center provider (iOS).
   Loaded only on iOS by js/services/achievements.js. Binds to the native
   capacitor-game-connect-7 plugin through the Capacitor bridge. Mirrors local
   achievement unlocks to Game Center; the local system stays authoritative. */

import { registerPlugin } from '@capacitor/core';

const GameConnect = registerPlugin('CapacitorGameConnect');

/* Local achievement id -> Game Center achievement id (from App Store Connect).
   TODO(real-ids): fill these in once the Game Center achievements are created
   in App Store Connect (Services sekmesi) — mirror the Play Games set.
   Local ids come from js/achievements.js:
     milestones  ms_<score>     (e.g. ms_500)
     smashes     smash_<n>      (smash_10, smash_30, ...)
     runs        runs_<n>       (runs_5, runs_25, ...)
     jumps       jumps_<n>      (jumps_50, jumps_250, ...)
   Unmapped local ids are skipped silently. */
const LOCAL_TO_GC = {
  // 'ms_500':    'panthop.ms_500',
  // 'smash_10':  'panthop.smash_10',
  // 'runs_5':    'panthop.runs_5',
};

let signedIn = false;
const pushed = new Set();   // local ids already mirrored this session (avoid spam)

async function signIn() {
  if (signedIn) return;
  await GameConnect.signIn();
  signedIn = true;
}

// Mirror each unlocked local id to Game Center. Idempotent on Apple's side; we
// also de-dupe per session. Failed pushes stay un-marked so a later sync retries.
async function syncAchievements(localUnlockedIds = []) {
  if (!signedIn) {
    try { await signIn(); } catch { return; }
  }
  for (const localId of localUnlockedIds) {
    if (pushed.has(localId)) continue;
    const gcId = LOCAL_TO_GC[localId];
    if (!gcId) continue;
    try {
      await GameConnect.unlockAchievement({ achievementID: gcId });
      pushed.add(localId);
    } catch { /* retry on a later sync */ }
  }
}

export default { signIn, syncAchievements };
