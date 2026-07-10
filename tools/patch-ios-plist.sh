#!/bin/zsh
# Patches ios/App/App/Info.plist with the AdMob/ATT/orientation keys Panthop
# needs. Idempotent — safe to re-run after every `cap sync` is NOT needed
# (sync does not touch Info.plist), but re-running does no harm.
#
# TODO(real-ids): replace GAD_APP_ID with the real AdMob **iOS** App ID
# (create a separate iOS app in the AdMob console — the Android ID is invalid
# on iOS). Until then Google's official iOS TEST App ID is used.
set -euo pipefail

PLIST="$(dirname "$0")/../ios/App/App/Info.plist"
PB=/usr/libexec/PlistBuddy

GAD_APP_ID="ca-app-pub-3940256099942544~1458002511"  # Google TEST iOS App ID
ATT_TEXT="Verileriniz, size daha uygun reklamlar gösterebilmek için kullanılır."

if [[ ! -f "$PLIST" ]]; then
  echo "HATA: $PLIST yok — önce 'npm run cap:add:ios' çalıştır." >&2
  exit 1
fi

set_key() { # set_key <key> <type> <value>
  $PB -c "Set :$1 $3" "$PLIST" 2>/dev/null || $PB -c "Add :$1 $2 $3" "$PLIST"
}

set_key GADApplicationIdentifier string "$GAD_APP_ID"
set_key NSUserTrackingUsageDescription string "$ATT_TEXT"
# Şifreleme sorusu App Store yüklemelerinde her seferinde sorulmasın:
set_key ITSAppUsesNonExemptEncryption bool false

# Portre kilidi (oyun portrait-only; manifest ile uyumlu)
$PB -c "Delete :UISupportedInterfaceOrientations" "$PLIST" 2>/dev/null || true
$PB -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
$PB -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"
$PB -c "Delete :UISupportedInterfaceOrientations~ipad" "$PLIST" 2>/dev/null || true

# SKAdNetworkItems — AdMob iOS quick-start'taki güncel liste (2026-07 çekildi)
SKAD_IDS=(
  cstr6suwn9 4fzdc2evr5 2fnua5tdw4 ydx93a7ass p78axxw29g v72qych5uu
  ludvb6z3bs cp8zw746q7 3sh42y64q3 c6k4g5qg8m s39g8k73mm wg4vff78zm
  3qy4746246 f38h382jlk hs6bdukanm mlmmfzh3r3 v4nxqhlyqp wzmmz9fp6w
  su67r6k2v3 yclnxrl5pm t38b2kh725 7ug5zh24hu gta9lk7p23 vutu7akeur
  y5ghdn5j9k v9wttpbfk9 n38lu8286q 47vhws6wlr kbd757ywx3 9t245vhmpl
  a2p9lx4jpn 22mmun2rn5 44jx6755aq k674qkevps 4468km3ulz 2u9pt9hc89
  8s468mfl3y klf5c3l5u5 ppxm28t8ap kbmxgpxpgc uw77j35x4d 578prtvx9j
  4dzt52r2t5 tl55sbb4fm c3frkrj4fj e5fvkxwrpn 8c4e2ghe7u 3rd42ekr43
  97r2b46745 3qcr597p9d
)
$PB -c "Delete :SKAdNetworkItems" "$PLIST" 2>/dev/null || true
$PB -c "Add :SKAdNetworkItems array" "$PLIST"
i=0
for id in "${SKAD_IDS[@]}"; do
  $PB -c "Add :SKAdNetworkItems:$i dict" "$PLIST"
  $PB -c "Add :SKAdNetworkItems:$i:SKAdNetworkIdentifier string ${id}.skadnetwork" "$PLIST"
  i=$((i+1))
done

echo "Info.plist yamalandı: GADApplicationIdentifier (TEST), ATT metni, portre kilidi, ${#SKAD_IDS[@]} SKAdNetwork kimliği."
