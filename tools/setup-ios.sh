#!/bin/zsh
# Panthop — iOS tek-seferlik kurulum (Xcode kurulduktan SONRA çalıştır).
#   ./tools/setup-ios.sh
# Yaptıkları: Xcode CLI doğrulama → CocoaPods → cap add ios → Info.plist
# yaması → iPhone-only hedef → ikon/splash üretimi → cap sync → Xcode'da aç.
# Idempotent: yarıda kesilirse yeniden çalıştırılabilir.
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$HOME/.local/node/bin:$PATH"

echo "==> 1/7 Xcode kontrolü"
if [[ ! -d /Applications/Xcode.app ]]; then
  echo "HATA: /Applications/Xcode.app yok. App Store'dan Xcode'u kur, sonra tekrar dene." >&2
  exit 1
fi
if ! xcode-select -p 2>/dev/null | grep -q "Xcode.app"; then
  echo "xcode-select Xcode'a yönlendiriliyor (sudo şifresi istenebilir)..."
  sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
fi
sudo xcodebuild -license accept 2>/dev/null || true
xcodebuild -runFirstLaunch 2>/dev/null || true
xcodebuild -version

echo "==> 2/7 CocoaPods"
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
if ! command -v pod >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    brew install cocoapods
  else
    # Sistem Ruby 2.6 + eski RubyGems: yeni bağımlılıklar Ruby 3 istediğinden
    # önce 2.6-uyumlu sürümler sabitlenir (2026-07-08'de doğrulanan sıra).
    gem install --user-install ffi -v 1.16.3
    gem install --user-install zeitwerk -v 2.6.12
    gem install --user-install i18n -v 1.14.1
    gem install --user-install activesupport -v 6.1.7.10
    gem install --user-install cocoapods
  fi
fi
pod --version

echo "==> 3/7 iOS projesi (cap add ios)"
if [[ ! -d ios ]]; then
  # cap add ios'un pod install'u ilk seferde deployment target yüzünden
  # kızarabilir — Podfile aşağıda 15.0'a çekilip pod install tekrarlanıyor.
  npm run cap:add:ios || true
  # AdMob eklentisi (Google Mobile Ads SDK 12) minimum iOS 15.0 ister;
  # Capacitor şablonu 14.0 üretir.
  sed -i '' "s/platform :ios, '14.0'/platform :ios, '15.0'/" ios/App/Podfile
  sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = 14.0;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' ios/App/App.xcodeproj/project.pbxproj
  (cd ios/App && pod install)
else
  echo "ios/ zaten var, atlanıyor."
fi

echo "==> 4/7 Info.plist yaması (AdMob/ATT/portre/SKAdNetwork)"
./tools/patch-ios-plist.sh

echo "==> 5/7 Yalnızca iPhone hedefi (iPad ekran görüntüsü zorunluluğunu kaldırır)"
# Geri almak için: pbxproj'da TARGETED_DEVICE_FAMILY değerini "1,2" yap.
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2";/TARGETED_DEVICE_FAMILY = "1";/g' ios/App/App.xcodeproj/project.pbxproj

echo "==> 6/7 İkon + splash üretimi"
npx capacitor-assets generate --ios

echo "==> 7/7 cap sync"
npm run cap:sync

cat <<'EOF'

Kurulum tamam. Xcode'da kalan MANUEL adımlar:
  1. npm run cap:open:ios
  2. Signing & Capabilities -> Team seç (Apple Developer hesabın)
  3. + Capability -> Game Center ekle
  4. Gerçek AdMob iOS App ID'yi al (AdMob konsolunda ayrı iOS uygulaması) ->
     tools/patch-ios-plist.sh içindeki GAD_APP_ID'yi değiştirip scripti tekrar çalıştır
  5. Simülatörde Run ile dene; sonra Product -> Archive ile App Store'a yükle
EOF
