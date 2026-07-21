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

## 2. Gizlilik Politikası (ZORUNLU — şu an YOK, sert engel)

Oyun AdMob (reklam kimliği) kullanıyor. Hem Play hem App Store **barındırılan bir
gizlilik politikası URL'si** ister. Bu olmadan gönderim reddedilir.

- [ ] Bir gizlilik politikası metni oluştur. En kolay yol:
  - Ücretsiz üretici: https://app-privacy-policy-generator.firebaseapp.com veya https://www.termsfeed.com
  - Şunları belirt: **AdMob (Google) reklam SDK'sı** kullanılıyor; reklam kimliği/cihaz
    verisi reklam amaçlı toplanıyor; başka kişisel veri toplanmıyor; iletişim e-postan.
- [ ] Metni bir yerde **herkese açık URL** olarak barındır:
  - GitHub Pages (ücretsiz), Google Sites, Notion herkese-açık sayfa, ya da kendi siten
- [ ] URL'yi bir kenara not et — hem Play hem App Store formuna gireceksin
- [ ] (Öneri) Aynı URL'yi oyun içinde/mağaza sayfasında da göster

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
Oyunda 22 başarım var. Play Games'e aynalanması için Console'da bunları oluşturup
ID'leri koda gir. (İstemezsen bu adımı atla — oyun yerel başarımlarla sorunsuz çalışır.)

- [ ] Play Console → Grow → Play Games Services → kurulumu yap, **SHA-1**'i (5a) ekle
- [ ] Şu 22 başarımı oluştur (yerel ID → senin verdiğin Play ID):

  | Grup | Yerel ID'ler |
  |---|---|
  | Kilometre taşı | `ms_25` `ms_50` `ms_100` `ms_200` `ms_350` `ms_500` `ms_750` `ms_1000` |
  | Parçalama | `smash_10` `smash_30` `smash_75` `smash_150` `smash_300` `smash_600` |
  | Koşu | `runs_5` `runs_25` `runs_100` `runs_500` |
  | Zıplama | `jumps_50` `jumps_250` `jumps_1000` `jumps_5000` |

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
- [ ] App Store Connect → uygulaman → Services → Game Center → 22 başarımı tanımla
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
1. **Gizlilik politikası URL'si** yok → oluştur + barındır (2. bölüm)
2. **Ekran görüntüleri** yok (`store/raw/` boş) → çek + `npm run store:gfx` (4. bölüm)
3. **Geliştirici hesapları** → Play 25$, Apple 99$/yıl (1. bölüm)
4. **Android imza keystore** → oluştur + güvenle sakla (5a)

## Yumuşak işler (test ID'yle yayınlanabilir ama önerilmez)
- Gerçek **AdMob ID'leri** (3. bölüm) — test ID'yle canlıya çıkma, gelir gelmez + politika riski
- **Play Games / Game Center başarım ID'leri** (5c/6b) — boş bırakılırsa oyun yine çalışır, sadece buluta aynalanmaz
