# Panthop — Build & Run

## Web / PWA (gerekli: Node)

```powershell
npm install
npm start          # http://localhost:5173
```

PWA testi için:
1. Tarayıcıyı aç → DevTools → Application → Service Workers (kayıtlı olmalı)
2. Network → "Offline" → reload (oyun yine açılmalı, dil JSON'ları SW cache'inden gelir)
3. Address bar → "Install" / "Yükle" simgesi (Chrome/Edge) ile uygulamayı kur

## Android APK (Capacitor)

### Gereksinimler (tek seferlik kurulum)

1. **JDK 17** (Adoptium / Microsoft Build of OpenJDK)
   - İndir: https://adoptium.net/temurin/releases/?version=17
   - Kurulum sonrası `java -version` çıktısı `17.x.x` olmalı
2. **Android Studio** (komut satırı yeterli değil — Gradle, platform-tools, SDK manager bir arada gelir)
   - İndir: https://developer.android.com/studio
   - İlk açılışta SDK Manager:
     - **Android SDK Platform 34** (veya en güncel)
     - **Android SDK Build-Tools** (en güncel)
     - **Android SDK Platform-Tools**
3. Ortam değişkenleri (PowerShell, kalıcı):
   ```powershell
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
   [Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot", "User")
   ```
   PowerShell'i kapatıp aç. Doğrula: `echo $env:ANDROID_HOME` boş olmamalı.

### Android projesini ekle (tek sefer)

```powershell
npm install
npm run cap:add:android   # dist/ üretir, android/ klasörü oluşturur
```

### Geliştirme — değişiklikten sonra cihaza yansıt

```powershell
npm run cap:sync          # dist/ rebuild + android/ assets güncelle
npm run cap:open:android  # Android Studio'da aç → Run
```

### Splash + ikon üretimi (Capacitor assets ile)

```powershell
# assets/icon-only.png (1024x1024) + assets/splash.png (2732x2732) sağla
npm run cap:assets
```

### Release APK

Android Studio → Build → Generate Signed Bundle / APK → Release variant.
İmzalama keystore'unu güvenli sakla (Play Console için gereklidir).

## iOS / App Store (gerekli: Mac + Xcode)

> iOS build yalnızca macOS'ta yapılabilir. Nisan 2026'dan beri App Store'a
> gönderim **Xcode 26 (iOS 26 SDK)** ile derlenmiş olmalı — Mac mini'de
> macOS'un Xcode 26'yı destekleyen sürümde olduğunu doğrula (App Store →
> Xcode'un güncel sürümü kurulabiliyorsa sorun yok).

### Tek seferlik kurulum (Mac mini)

1. **Apple Developer Program** üyeliği ($99/yıl): https://developer.apple.com/programs/enroll/
   - Bireysel kayıt: gerçek ad-soyad, 2FA açık Apple hesabı; onay ~24-48 saat
2. **Xcode** (App Store'dan) + ilk açılışta iOS platform bileşenleri
3. **Node 22** bu Mac'te kurulu: `~/.local/node` (PATH `~/.zprofile`'da) — sudo'suz kurulum
4. `npm install` yapıldı; CocoaPods'u aşağıdaki script kendisi kurar

### iOS projesini ekle (tek sefer, Mac'te — Xcode kurulduktan sonra)

```bash
npm run ios:setup
```

Bu script (`tools/setup-ios.sh`) sırasıyla: xcode-select doğrulama → CocoaPods
kurulumu → `cap add ios` → `Info.plist` yaması (`tools/patch-ios-plist.sh`:
AdMob TEST App ID, ATT metni, portre kilidi, SKAdNetworkItems) → iPhone-only
hedef → ikon/splash üretimi → `cap sync`. Idempotent; yarıda kesilirse tekrar
çalıştırılabilir.

Notlar (2026-07-08'de bu Mac'te uygulandı):
- Deployment target **iOS 15.0** — AdMob eklentisi (Google Mobile Ads SDK 12)
  14.0'ı kabul etmiyor; script Podfile + pbxproj'u kendisi yükseltir.
- CocoaPods sistem Ruby 2.6'ya `--user-install` ile kuruldu (sudo'suz);
  Ruby 3 isteyen bağımlılıklar için script eski sürümleri sabitler.
- Simülatör/derleme için iOS platform bileşeni gerekir:
  `xcodebuild -downloadPlatform iOS` (veya Xcode → Settings → Components).

Xcode'da kalan manuel adımlar (tek sefer):
- **Signing & Capabilities** → Team seç (developer hesabın)
- **+ Capability → Game Center** ekle (capacitor-game-connect-7 için)
- Gerçek **AdMob iOS App ID** alınca (AdMob konsolunda ayrı iOS uygulaması
  oluştur — Android ID kullanılamaz): `tools/patch-ios-plist.sh` içindeki
  `GAD_APP_ID`'yi değiştir, scripti tekrar çalıştır. O zamana dek Google'ın
  resmî TEST App ID'si kullanılır.
- Game Center achievement ID'leri →
  `js/services/providers/gamecenter.js` içindeki `LOCAL_TO_GC` haritası

### Geliştirme döngüsü

```bash
npm run cap:sync         # dist/ rebuild + ios/ güncelle
npm run cap:open:ios     # Xcode → Run (simülatör veya kablolu iPhone)
```

### App Store Connect kurulumu (tek sefer)

1. https://appstoreconnect.apple.com → My Apps → **+ New App**
   - Bundle ID: `com.simpleonetap.panthop` (developer.apple.com → Identifiers'da önce kaydet)
2. **Game Center**: App Store sekmesinde işaretle; Services sekmesinde
   Leaderboard + Achievement'ları tanımla (Play Games'tekilerin aynası),
   ID'leri `js/services/providers/`'daki iOS TODO alanlarına yaz
3. **App Privacy** (gizlilik etiketi): AdMob kullanıldığı için
   "Device ID / Advertising Data — used for tracking" beyanı + gizlilik
   politikası URL'si zorunlu
4. **Yaş derecelendirme** anketi, **EU DSA trader** beyanı (ilk gönderimde sorulur),
   fiyat (ücretsiz) + ülkeler
5. **Ekran görüntüleri**: 6.9" iPhone seti zorunlu (1320×2868); iPad desteği
   kapatılacaksa Xcode'da yalnızca iPhone hedefle

### Yayın

```bash
npm run cap:sync
```
Xcode → Product → **Archive** → Distribute App → App Store Connect → Upload.
Sonra App Store Connect'te build'i sürüme bağla → TestFlight'ta dene →
**Submit for Review**. İlk inceleme genelde 1-2 gün.

## Dil dosyaları

- `i18n/tr.json`, `i18n/en.json` — runtime'da `fetch` ile yüklenir
- Yeni dil eklemek için:
  1. `i18n/<kod>.json` oluştur (mevcut anahtar şemasıyla)
  2. `js/i18n.js` → `SUPPORTED` listesine kodu ekle
  3. `service-worker.js` → `VERSION` bump et (cache invalidation için)
  4. 3 veya daha fazla dil olunca dil seçici otomatik dropdown'a geçer (mevcut kod)
