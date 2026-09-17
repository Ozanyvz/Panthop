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

## 3. AdMob — Android BİTTİ, iOS açık

**Android gerçek kimliklere geçti** (2026-09-18):
- `AndroidManifest.xml` → `ca-app-pub-6482116152023017~7362056597`
- `admob.js` → rewarded (android) `ca-app-pub-6482116152023017/3833875129`
- `USE_TEST_ADS = false`

İmzalı AAB'nin içinden doğrulandı.

Kalanlar:
- [ ] **iOS kimlikleri** → [6a bölümü](#6a-kodda-açık-kalanlar-mace-geçmeden-önce)
- [ ] **AdMob → Gizlilik ve mesajlaşma → GDPR mesajı** oluştur.
      Bu olmadan Avrupa'da onay formu boş döner ve orada reklam sunulmayabilir.
      (Kod tarafı hazır: `ensureConsent()` formu çağırıyor.)
- [ ] Aynı sayfada **ABD eyalet düzenlemeleri** mesajı
- [ ] Yayınlandıktan sonra AdMob uygulamasını Play kaydına bağla →
      `app-ads.txt` doğrulaması o zaman çalışır

> Yeni reklam birimleri ilk saatlerde "no fill" verebilir, bu normaldir.

---

## 4. Ekran görüntüleri — BİTTİ

İki dilde tam set üretildi (2026-09-18). Ham kareler `store/raw/tr/` ve
`store/raw/en/` altında commit'li; çıktılar `npm run store:gfx` ile saniyeler
içinde yeniden üretiliyor (üretilenler `.gitignore`'da).

| Çıktı | Nerede |
|---|---|
| Play öne çıkan görsel | `store/play/feature-1024x500.png` |
| Play telefon (6'şar) | `store/play/tr/`, `store/play/en/` |
| App Store (3 boyut × 6) | `store/ios/tr/`, `store/ios/en/` |
| Uygulama ikonu 512 | `assets/icons/icon-512.png` |

Başlıkları değiştirmek için `tools/make-store-graphics.mjs` → `CAPTIONS`.

---

## 5. GOOGLE PLAY — yayın adımları

> ### ⚠️ Kapalı test zorunluluğu
> Bu hesap için Google, production'a çıkmadan önce **en az 12 test kullanıcısıyla
> en az 14 gün kesintisiz kapalı test** şartı koyuyor (Kontrol paneli → Üretim).
> Yeni bireysel geliştirici hesaplarında geçerli olan kural.
>
> Sıra: kurulumu tamamla → kapalı test sürümünü yayınla → 12 tester topla →
> 14 gün bekle → üretim erişimi için başvur.
>
> **Dahili test (internal testing)** bu sayaca dahil değil ama anında çalışıyor;
> kendi cihazında denemek için onu kullan.

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
>
> **Android tarafı ilerledikçe iOS'ta açık kalan işler birikti. Aşağıdaki 6a
> listesi Mac'e geçmeden önce kapatılması gerekenleri topluyor — kodda TODO
> olarak da duruyorlar.**

### 6a. KODDA AÇIK KALANLAR (Mac'e geçmeden önce)

#### AdMob iOS kimlikleri — ZORUNLU
Android gerçek kimliklere geçti, **iOS hâlâ Google'ın TEST reklam biriminde.**
AdMob kimlikleri platforma özel; konsolda ayrı bir iOS uygulaması oluşturman
gerekiyor (Android'inki iOS'ta geçersiz).

- [ ] AdMob → Uygulama ekle → **iOS** → Panthop → **Uygulama kimliği** (`~` içerir)
- [ ] Aynı uygulamaya **Ödüllü** reklam birimi → **birim kimliği** (`/` içerir)
- [ ] [tools/patch-ios-plist.sh](tools/patch-ios-plist.sh) satır 14 → `GAD_APP_ID`
- [ ] [js/services/providers/admob.js](js/services/providers/admob.js) → `REWARDED_UNIT.ios`
- [ ] Mac'te `npm run ios:setup` tekrar çalıştır (Info.plist'e işlensin)

> Google'ın test birimleri `USE_TEST_ADS` ne olursa olsun test reklamı döndürür.
> Yani iOS bu hâliyle çöker değil, sessizce test reklamı gösterir ve **hiç kazanç
> getirmez**. App Store'a bu hâlde gönderme.

#### iOS uygulama ikonu — ZORUNLU
[tools/make-app-icon.mjs](tools/make-app-icon.mjs) **yalnızca Android** kaynaklarını
üretiyor. iOS ikon seti henüz yeni tasarımla üretilmedi.

- [ ] Mac'te `npm run cap:assets:ios`
      (kaynak `assets/icon-only.png` güncel tasarımla senkron tutuluyor)
- [ ] Xcode'da ikonun doğru göründüğünü doğrula

#### ATT metni tek dilde — İSTEĞE BAĞLI
`NSUserTrackingUsageDescription` yalnızca Türkçe; İngilizce kullanıcı Türkçe
metin görür. Reddedilme sebebi değil, kalite kaybı.

- [ ] (İsteğe bağlı) Mac'te `InfoPlist.strings` ile tr/en yerelleştirmesi

### 6b. Mac'te ilk kurulum
- [ ] Mac'te Xcode kurulu (App Store'dan, güncel sürüm — Nisan 2026 sonrası Xcode 26 gerekir)
- [ ] `npm run ios:setup` çalıştır (CocoaPods + `cap add ios` + Info.plist + assets + sync)
- [ ] Xcode → Signing & Capabilities → **Team** seç (Developer hesabın)
- [ ] **+ Capability → Game Center** ekle

### 6c. Game Center başarımları (opsiyonel, Play ile ayna)
- [ ] App Store Connect → uygulaman → Services → Game Center → 32 başarımı tanımla
      (tam liste: [store/basarimlar.md](store/basarimlar.md), önerilen GC ID biçimi `panthop.ms_25`)
- [ ] ID'leri [js/services/providers/gamecenter.js](js/services/providers/gamecenter.js) `LOCAL_TO_GC` haritasına yaz
- [ ] `npm run cap:sync`

### 6d. App Store Connect kaydı
- [ ] https://developer.apple.com → Identifiers → Bundle ID `com.simpleonetap.panthop` kaydet
- [ ] App Store Connect → My Apps → **+ New App**
- [ ] Metinler → [store/listing-tr.md](store/listing-tr.md) ve [store/listing-en.md](store/listing-en.md)
- [ ] Ekran görüntüleri: 6.9" iPhone (1290×2796) zorunlu — `store/ios/tr/` ve `store/ios/en/`
- [ ] **App Privacy** etiketi + yaş derecelendirme → [store/form-cevaplari.md](store/form-cevaplari.md)
- [ ] **EU DSA trader** beyanı + fiyat (ücretsiz)

### 6e. Gönderim
- [ ] Xcode → Product → **Archive** → Distribute App → App Store Connect → Upload
- [ ] App Store Connect'te build'i sürüme bağla → **TestFlight**'ta kendin dene
- [ ] **Submit for Review** (ilk inceleme genelde 1–2 gün)

> iOS'ta Play'deki gibi "12 tester / 14 gün" şartı **yok** — TestFlight'ta kendin
> deneyip doğrudan incelemeye gönderebilirsin.

---

## 7. Yayın sonrası (isteğe bağlı, sonra)
- [ ] Play Games / Game Center başarımlarının gerçekten aynalandığını cihazda doğrula
- [ ] AdMob panelinde ilk gösterimlerin/gelirin geldiğini kontrol et
- [ ] Sonraki güncellemede: Android `versionCode`/`versionName` artır, iOS build numarası artır
- [ ] (Ertelendi) Bulut kayıt / Saved Games — şu an sadece cihazda saklanıyor

---

## Hızlı özet — nerede kaldık (2026-09-18)

**Bitenler:** gizlilik politikası (metin + canlı sayfalar + oyun içi onay + app-ads.txt) ·
Three.js yerelleştirme · UMP/ATT · kırık Android build + targetSdk 36 ·
ödüllü reklam kilitlenmesi · keystore + imzalama · ekran görüntüleri (TR+EN) ·
mağaza metinleri (TR+EN) · form cevapları · uygulama ikonu ·
AdMob Android gerçek kimlikleri · Android geliştirici doğrulaması

**Play — sıradaki adımlar:**
1. Mağaza kaydını doldur (metinler + görseller + formlar hazır)
2. Dahili teste AAB yükle, cihazda dene
3. Kapalı test sürümünü yayınla, **12 tester** topla
4. 14 gün sonra üretim erişimi için başvur

**AdMob:** GDPR mesajı oluştur (yayını engellemez, Avrupa gelirini etkiler)

**iOS:** [6a bölümü](#6a-kodda-açık-kalanlar-mace-geçmeden-önce) — AdMob iOS
kimlikleri ve iOS ikon seti açık. Mac mini'ye geçmeden önce kapatılmalı.

