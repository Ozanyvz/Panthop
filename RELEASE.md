# Panthop — Yayın Rehberi (Senin Yapman Gereken Adımlar)

> Bu dosya, oyunu Google Play + App Store'a çıkarmak için **senin** elle yapman
> gereken işleri sırayla listeler. Kod tarafı hazır: `npm run build` temiz çalışıyor,
> ikon/font/ses/ekonomi bağlı, sürüm = Android `versionCode 1 / versionName 1.0`,
> Service Worker `wj-v54`.
>
> Adımların çoğu hesap açma, gerçek ID alma, URL barındırma, ekran görüntüsü ve imza
> gibi Claude'un yapamayacağı işler. Aşağıdaki kutucukları sırayla işaretleyerek ilerle.
>
> **Teknik detaylar için:** kurulum/derleme adımları [BUILD.md](BUILD.md)'de; mağaza
> metinleri [store/listing-tr.md](store/listing-tr.md)'de; görsel üretimi [store/README.md](store/README.md)'de.

---

## 0. Kod deposunu temizle (5 dk — önce bu)

Şu an commit edilmemiş değişiklikler var (kartal sesleri + `js/audio.js` + `js/game.js`).
Yayından önce bunları commit et ki gönderilen sürüm net olsun.

- [ ] `git add -A && git commit` ile bekleyen değişiklikleri kaydet
- [ ] `npm run build` çalıştır, hatasız bittiğini gör (dist/ güncellensin)

---

## 1. Hesaplar (bunlar olmadan hiçbir şey yayınlanmaz)

| Hesap | Ücret | Nereden | Onay süresi |
|---|---|---|---|
| **Google Play Developer** | 25$ (tek sefer) | https://play.google.com/console/signup | Birkaç saat – 2 gün |
| **Apple Developer Program** | 99$/yıl | https://developer.apple.com/programs/enroll | 24–48 saat |

- [ ] Google Play Console hesabı açıldı ve doğrulandı (kimlik doğrulaması istenebilir)
- [ ] Apple Developer üyeliği açıldı (bireysel; gerçek ad-soyad, 2FA açık Apple ID)

> Sadece Android çıkacaksan Apple adımını atlayabilirsin. İkisi ortak hazırlık
> (gizlilik politikası, ekran görüntüleri, AdMob) paylaşıyor — o yüzden 2–4. bölümler ikisi için de geçerli.

---

## 2. Gizlilik Politikası (kod + site HAZIR — sadece deploy kaldı)

Oyun AdMob (reklam kimliği) kullanıyor. Hem Play hem App Store **barındırılan bir
gizlilik politikası URL'si** ister.

Yapıldı:
- Kaynak metin → [PRIVACY.md](PRIVACY.md) (TR + EN)
- **Site sayfaları** → `Aldros-art` deposunda `panthop/gizlilik.html` +
  `panthop/privacy.html`; uzantısız adresler için `netlify.toml`'a 200 rewrite
  kuralları eklendi (mevcut `/*` yakalayıcısının ÖNÜNE — yoksa ana sayfayı döndürürdü)
- **Oyun içi tek seferlik onay ekranı**; onaylanmadan AdMob ve Play Games/Game
  Center başlatılmıyor ([js/main.js](js/main.js) → `showConsentScreen`)
- Onay ekranındaki **"TAMAMINI OKU"** bağlantısı ve **Ayarlar → GİZLİLİK** satırı
  siteye gidiyor (her iki platformda da sistem tarayıcısında açılır)
- URL'ler `i18n/tr.json` + `i18n/en.json` → `privacy.url`:
  - TR: `https://aldros.site/panthop/gizlilik`
  - EN: `https://aldros.site/panthop/privacy`
- İletişim adresi: `ozanyvz92@yandex.com` (sitenin iletişim sayfasındaki adres)

Senin yapacakların:

- [ ] `Aldros-art` deposunu commit + push et → Netlify deploy
- [ ] İki adresin de açıldığını doğrula (giriş istemeden, **JavaScript kapalıyken**)
- [ ] Oyunda onay ekranındaki linke basıp siteye gittiğini cihazda dene
- [ ] Aynı URL'yi Play Console ve App Store Connect formlarına gir
- [ ] (İsteğe bağlı) Panthop'a ayrı bir iletişim adresi istersen PRIVACY.md, iki
      HTML sayfası ve mağaza formlarında aynı anda değiştir

Metin ileride değişirse: iki HTML sayfasını güncelle + [js/storage.js](js/storage.js)
içindeki `PRIVACY_VERSION`'ı artır (oyuncular yeni sürümü bir kez daha onaylar).

---

## 2.5. Kod tarafındaki yayın engelleri — ÇÖZÜLDÜ (2026-09-12)

### a) Three.js artık yerel ✅
Önceden importmap `three`'yi `https://unpkg.com`'dan çekiyordu: internetsiz oyun
açılmıyordu, iOS'ta WKWebView `capacitor://` altında Service Worker
çalıştırmadığı için her açılışta ağ gerekiyordu, App Store 2.5.2 riski vardı ve
"hiçbir veri gönderilmiyor" diyen gizlilik metniyle çelişiyordu.

- `three@0.161.0` gerçek bağımlılık oldu (`package.json`)
- [tools/build.mjs](tools/build.mjs) minified derlemeyi (675 KB) **depo köküne**
  `vendor/three/` altına kopyalıyor, oradan `dist/`e gidiyor — böylece `npm start`
  ve paketlenen uygulama aynı yolu çözüyor
- importmap → `./vendor/three/three.module.js`
- Service Worker: `three` shell önbelleğine eklendi, ölü CDN rotası kaldırıldı
  (sürüm `wj-v56`)
- `vendor/` `.gitignore`'da — `node_modules`'tan üretiliyor

**Doğrulandı:** `dist/` ve `android/app/src/main/assets/public/` içinde tek bir
CDN referansı kalmadı.

> Not: artık `npm start`'tan önce en az bir kez `npm run build` gerekiyor
> (vendor/ o zaman oluşuyor).

### b) UMP onayı + iOS ATT eklendi ✅
[js/services/providers/admob.js](js/services/providers/admob.js) → `ensureConsent()`,
`AdMob.initialize()`'dan **önce** çalışıyor:

1. `requestConsentInfo()` → gerekiyorsa `showConsentForm()` (AEA / İngiltere /
   İsviçre; başka bölgede hiçbir şey gösterilmez)
2. iOS'ta `trackingAuthorizationStatus()` → `notDetermined` ise
   `requestTrackingAuthorization()` (ATT istemi, UMP formundan **sonra**)

Google ayrıca formun kapsadığı oyuncuların fikrini değiştirebilmesini şart
koşuyor: **Ayarlar → REKLAM TERCİHLERİ** butonu eklendi, yalnızca UMP gerekli
dediğinde görünür.

- [ ] AdMob konsolunda **Privacy & messaging → GDPR mesajı** oluştur
      (form metni orada yazılır; oluşturulmazsa `showConsentForm` boş döner)
- [ ] AEA cihazında/VPN ile onay formunun çıktığını dene
- [ ] iOS cihazında ATT isteminin çıktığını dene

### c) Android SDK seviyeleri ✅ — ve yolda çıkan kırık build
`android/variables.gradle`: `minSdkVersion 23 → 24`, `compileSdk/targetSdk 35 → 36`.

**Önemli:** Android derlemesi bu değişiklikten **önce zaten kırıktı** —
`minSdkVersion 23`, `capacitor-game-connect-7`'nin getirdiği
`play-services-games-v2:22.0.0`'ın istediği 24'ün altında kalıyor ve manifest
merger hata veriyordu. targetSdk'den bağımsız, mevcut bir hataydı; bu hâliyle
APK/AAB hiç üretilemezdi.

minSdk 24, Android 6.0 (Marshmallow) desteğini bırakmak demek — Play Games
bağımlılığı bunu zaten zorunlu kılıyor.

**Doğrulandı:** `gradlew :app:assembleDebug` → **BUILD SUCCESSFUL**; birleşmiş
manifest `minSdkVersion="24" targetSdkVersion="36"`.

> targetSdk 36, Play'in 31 Ağustos 2026 sonrası yeni uygulamalardan istediği
> seviye. Gönderimde Console farklı bir şey isterse burayı güncelle.

---

### d) Ödüllü reklam artık kilitlenmiyor ✅
Oyuncu reklamı erken kapattığında `showRewarded()` sonsuza dek askıda kalıyordu:
eklenti `showRewardVideoAd()` çağrısını **yalnızca** ödül callback'inin içinde
çözüyor (Android `RewardedAdCallbackAndListeners`, iOS `AdRewardExecutor` —
ikisinde de aynı). Ödül kazanılmayınca çağrı ne resolve ne reject oluyordu.

Etkisi: "KABUK X2" butonu `is-busy` hâlinde donup kalıyor, o oyun sonu için
tekrar denenemiyordu. (Ses, sekme görünürlüğü dinleyicisi sayesinde kendini
toparlıyordu.)

Düzeltme: akış artık Google'ın fullscreen olaylarıyla sürülüyor — `Rewarded`
bayrağı kaldırıyor, `Dismissed` / `FailedToShow` beklemeyi bitiriyor. Böylece
her durumda sonuçlanıyor.

### e) iOS ATT metni tek dilde ⚠️
`tools/patch-ios-plist.sh` → `NSUserTrackingUsageDescription` yalnızca Türkçe.
Oyun İngilizce de desteklediği için ATT istemi İngiliz kullanıcıya Türkçe metin
gösterir. Reddedilme sebebi değil ama kalite kaybı.

- [ ] (İsteğe bağlı) Mac'te `InfoPlist.strings` ile tr/en yerelleştirmesi ekle

---

## 3. AdMob — gerçek reklam ID'leri (şu an Google TEST ID'leri)

Şu an test reklamları çalışıyor. **Gerçek para kazanmak ve mağaza politikasına uymak
için** kendi AdMob hesabından gerçek ID'ler alıp aşağıdaki 4 yeri değiştir.

- [ ] https://admob.google.com → hesap aç
- [ ] **Android uygulaması** oluştur → App ID'yi (`ca-app-pub-XXXX~YYYY`) al
- [ ] **iOS uygulaması** ayrıca oluştur (Android ID iOS'ta çalışmaz) → App ID'yi al
- [ ] Her ikisi için birer **Ödüllü (Rewarded)** reklam birimi oluştur → Ad Unit ID'lerini al

Sonra şu dosyaları düzenle:

**a) Android App ID** → [android/app/src/main/AndroidManifest.xml](android/app/src/main/AndroidManifest.xml) satır ~38
```
android:value="ca-app-pub-3940256099942544~3347511713"   ← kendi Android App ID'nle değiştir
```

**b) Ödüllü reklam birimleri + test kapatma** → [js/services/providers/admob.js](js/services/providers/admob.js) satır 14–18
```
android: 'ca-app-pub-3940256099942544/5224354917',   ← kendi Android rewarded unit ID
ios:     'ca-app-pub-3940256099942544/1712485313',   ← kendi iOS rewarded unit ID
const USE_TEST_ADS = true;                            ← false yap
```

**c) iOS App ID** → [tools/patch-ios-plist.sh](tools/patch-ios-plist.sh) satır 14
```
GAD_APP_ID="ca-app-pub-3940256099942544~1458002511"   ← kendi iOS App ID'nle değiştir
```
(Mac'te `npm run ios:setup` tekrar çalıştırılınca Info.plist'e işlenir.)

- [ ] a, b, c değiştirildi
- [ ] `npm run build` tekrar çalıştırıldı
- [ ] **Uyarı:** İlk gönderimlerde ID'ler yeniyse reklam "no fill" verebilir; bu normaldir.
      Test etmek için `USE_TEST_ADS`'i cihazda geçici `true` bırakabilirsin ama mağazaya
      **`false`** ile gönder.

---

## 4. Ekran görüntüleri (şu an `store/raw/` BOŞ)

Mağaza vitrini için gerçek oyun ekran görüntüleri lazım. `store/play` ve `store/ios`
altındaki mevcut PNG'ler eski/taslak olabilir — yeniden üret.

- [ ] Oyunu telefonda veya tarayıcıda aç, şu 6 ekranın görüntüsünü al:
  1. Oyun oynanışı (zıplama anı)
  2. Engel aşma / yukarı tırmanma
  3. Gelişim (upgrade) ekranı
  4. Başarımlar ekranı
  5. Pençe/kalkan gücü anı
  6. Oyun sonu / yeni rekor ekranı
- [ ] Dosyaları `01-...`, `02-...` … diye sırayla adlandırıp `store/raw/` içine koy
      (sıra, başlıklarla eşleşir — bkz. [store/README.md](store/README.md))
- [ ] `npm run store:gfx` çalıştır → `store/play/` ve `store/ios/` otomatik üretilir
- [ ] Üretilen görselleri gözden geçir (başlık metinleri ASCII, doğru mu?)

Gereken minimum: **Play** en az 2 telefon görüntüsü + 1024×500 öne çıkan görsel;
**App Store** en az 1 tane 6.9" iPhone görüntüsü (1290×2796).

---

## 5. GOOGLE PLAY — yayın adımları

### 5a. İmzalama anahtarı (keystore) — bir kez, çok önemli
- [ ] Release keystore oluştur (Android Studio → Build → Generate Signed Bundle/APK →
      Create new keystore) **veya** komut satırı `keytool`
- [ ] **Keystore dosyasını + şifreleri güvenli sakla** (kaybedersen uygulamayı bir daha
      güncelleyemezsin). Play App Signing kullanacaksan bu senin "upload key"in olur.
- [ ] Keystore'un **SHA-1** parmak izini not et (Play Games için lazım — 5c)

### 5b. Uygulamayı derle
- [ ] `npm run cap:sync` sonra `npm run cap:open:android`
- [ ] Android Studio → Build → **Generate Signed Bundle** (AAB, Play bunu ister) → Release
- [ ] Çıkan `.aab` dosyasını bir yere al

### 5c. Play Games Services (başarım aynalama — opsiyonel ama bağlı)
Oyunda **32** başarım var. Play Games'e aynalanması için Console'da bunları oluşturup
ID'leri koda gir. (İstemezsen bu adımı atla — oyun yerel başarımlarla sorunsuz çalışır.)

- [ ] Play Console → Grow → Play Games Services → kurulumu yap, **SHA-1**'i (5a) ekle
- [ ] Şu 32 başarımı oluştur (yerel ID → senin verdiğin Play ID):

  | Grup | Yerel ID'ler |
  |---|---|
  | Kilometre taşı | `ms_25` `ms_50` `ms_100` `ms_200` `ms_350` `ms_500` `ms_750` `ms_1000` |
  | Parçalama | `smash_10` `smash_30` `smash_75` `smash_150` `smash_300` `smash_600` |
  | Koşu | `runs_5` `runs_25` `runs_100` `runs_500` |
  | Zıplama | `jumps_50` `jumps_250` `jumps_1000` `jumps_5000` |
  | Oyun süresi | `time_600` `time_1800` `time_3600` `time_10800` `time_36000` |
  | Hayatta kalma | `runtime_30` `runtime_60` `runtime_120` `runtime_300` |
  | Sır | `musician` |

- [ ] Play'in verdiği ID'leri [js/services/providers/playgames.js](js/services/providers/playgames.js) `LOCAL_TO_PLAY` haritasına yaz
- [ ] `npm run cap:sync` + yeniden derle

### 5d. Mağaza kaydı ve gönderim
- [ ] Play Console → **Create app** (Bundle ID: `com.simpleonetap.panthop`)
- [ ] Mağaza metinlerini gir → [store/listing-tr.md](store/listing-tr.md) (ad, kısa/uzun açıklama hazır)
- [ ] Görselleri yükle: 512×512 ikon (`assets/icons/icon-512.png`), telefon görüntüleri, 1024×500 öne çıkan görsel
- [ ] **Gizlilik politikası URL'si** gir (2. bölüm)
- [ ] **Data safety** formu: "reklam kimliği toplanır, üçüncü tarafla (AdMob) paylaşılır" işaretle
- [ ] İçerik derecelendirme anketi, hedef kitle (yaş), reklam içerir = **Evet**
- [ ] AAB'yi **Internal testing** track'ine yükle → kendi cihazında test et
- [ ] Sorun yoksa **Production**'a gönder → inceleme (genelde birkaç saat – birkaç gün)

---

## 6. APP STORE (iOS) — Mac mini'de yapılır

> Tüm iOS build'leri Mac'te. Ön hazırlık tamam ([BUILD.md](BUILD.md) iOS bölümü).

### 6a. Mac'te ilk kurulum
- [ ] Mac'te Xcode kurulu (App Store'dan, güncel sürüm — Nisan 2026 sonrası Xcode 26 gerekir)
- [ ] `npm run ios:setup` çalıştır (CocoaPods + `cap add ios` + Info.plist + assets + sync)
- [ ] Xcode → Signing & Capabilities → **Team** seç (Developer hesabın)
- [ ] **+ Capability → Game Center** ekle

### 6b. Game Center başarımları (opsiyonel, Play ile ayna)
- [ ] App Store Connect → uygulaman → Services → Game Center → 32 başarımı tanımla
      (5c'deki aynı yerel ID listesi, önerilen GC ID biçimi `panthop.ms_25` vb.)
- [ ] ID'leri [js/services/providers/gamecenter.js](js/services/providers/gamecenter.js) `LOCAL_TO_GC` haritasına yaz
- [ ] `npm run cap:sync`

### 6c. App Store Connect kaydı
- [ ] https://developer.apple.com → Identifiers → Bundle ID `com.simpleonetap.panthop` kaydet
- [ ] App Store Connect → My Apps → **+ New App**
- [ ] Metinler → [store/listing-tr.md](store/listing-tr.md) App Store bölümü (ad, alt başlık, anahtar kelimeler hazır)
- [ ] Ekran görüntüleri: 6.9" iPhone (1290×2796) zorunlu — `store/ios/` altından
- [ ] **App Privacy** etiketi: "Device ID / Advertising Data — used for tracking" + gizlilik URL'si (2. bölüm)
- [ ] Yaş derecelendirme anketi + **EU DSA trader** beyanı + fiyat (ücretsiz)

### 6d. Gönderim
- [ ] Xcode → Product → **Archive** → Distribute App → App Store Connect → Upload
- [ ] App Store Connect'te build'i sürüme bağla → **TestFlight**'ta kendin dene
- [ ] **Submit for Review** (ilk inceleme genelde 1–2 gün)

---

## 7. Yayın sonrası (isteğe bağlı, sonra)
- [ ] Play Games / Game Center başarımlarının gerçekten aynalandığını cihazda doğrula
- [ ] AdMob panelinde ilk gösterimlerin/gelirin geldiğini kontrol et
- [ ] Sonraki güncellemede: Android `versionCode`/`versionName` artır, iOS build numarası artır
- [ ] (Ertelendi) Bulut kayıt / Saved Games — şu an sadece cihazda saklanıyor

---

## Hızlı özet — SERT ENGELLER (bunlar olmadan yayınlanamaz)
1. **Gizlilik sayfalarını yayına al** → `Aldros-art` deposunu push et (2. bölüm)
2. **AdMob GDPR mesajı** → konsolda oluştur, yoksa onay formu boş döner (2.5b)
3. **Ekran görüntüleri** yok (`store/raw/` boş) → çek + `npm run store:gfx` (4. bölüm)
4. **Geliştirici hesapları** → Play 25$, Apple 99$/yıl (1. bölüm)
5. **Android imza keystore** → oluştur + güvenle sakla (5a)

Çözülenler: ~~Three.js CDN~~ (2.5a) · ~~UMP/ATT~~ (2.5b) · ~~kırık Android build + targetSdk~~ (2.5c) · ~~gizlilik metni + oyun içi onay~~ (2. bölüm)

## Yumuşak işler (test ID'yle yayınlanabilir ama önerilmez)
- Gerçek **AdMob ID'leri** (3. bölüm) — test ID'yle canlıya çıkma, gelir gelmez + politika riski
- **Play Games / Game Center başarım ID'leri** (5c/6b) — boş bırakılırsa oyun yine çalışır, sadece buluta aynalanmaz
