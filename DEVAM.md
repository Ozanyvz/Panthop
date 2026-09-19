# Devam notu — 19 Eylül 2026

Yayın sürecinin ortasında oturum değiştirmek için yazıldı. Yeni bir sohbete
başlarken bu dosyayı okut; nerede kaldığımızı, hangi kararların verildiğini ve
yeni bir oturumun kolayca yanlış yapacağı şeyleri anlatıyor.

Adım adım yayın rehberi ayrı: [RELEASE.md](RELEASE.md). Burası "şu an neredeyiz".

---

## Tek cümleyle

Android yayına hazır ve imzalı, **AdMob tamamen bitti** (Android + iOS kimlikleri,
GDPR ve ABD mesajları yayında); sıra **kapalı testi başlatmakta** (12 test
kullanıcısı × 14 gün zorunlu). iOS'ta kodda açık kalan bir şey yok, hepsi Mac
mini'de yapılacak işler.

---

## HEMEN SIRADAKİ ADIM

**AAB hazır ve doğrulandı — kapalı teste yüklenecek.**

```
android\app\build\outputs\bundle\release\app-release.aab
```

31,3 MB · `versionCode 2` / `versionName 1.0` · imzalı. Paketin içinden
doğrulandı: yeni panter ikonu (üretilen dosyayla piksel piksel aynı), yeni yaprak
fiyatları, `PRIVACY_VERSION 2`, gerçek AdMob kimlikleri.

Play Console → Kapalı test → Yeni sürüm oluştur → bu dosyayı yükle. Sürüm notları
boş bırakılamıyor, mağaza girişindeki her dil için ayrı isteniyor.

14 günlük sayacı başlatan şey **testerların katılım linkini kabul etmesi**;
listeye eklemek tek başına yetmiyor.

Yeniden derlemek gerekirse:

```bash
npm run build
npx cap sync android
node tools/make-app-icon.mjs          # cap sync sonrası — ikonları garantiye alır
cd android && ./gradlew.bat :app:bundleRelease
```

Ayrıca göndermeden önce: **PC'de Google Play Games form faktörü hâlâ açık.**
Test edilmemiş bir platform; Gelişmiş ayarlar → Form faktörleri'nden kapatılması
önerildi, kullanıcı henüz karar vermedi.

---

## 19 Eylül oturumunda ne yapıldı

### Denge
- **Erken yaprak gelişimleri ucuzladı** (`c550c39`): Pençe Bileme 4×5 → 2·2·4·4·4,
  Odaklanma 4·6·8 → 2·4·6. Yaprak ağacı toplamı 49 → **39**. Artık 100 skorda
  (7🍃) ağacın dört hattı da açılabiliyor, eskiden üçü açılabiliyordu; ağacın
  tamamı 1000 yerine **750 skor** milestone'uyla bitiyor. Mekanik değişmedi.
  Ayrıntı: [ECONOMY.md](ECONOMY.md) değişiklik günlüğü.

### Gizlilik
- **AdMob GDPR mesajı ile politika çelişiyordu** (`b7e28cb`): onay ekranı IAB TCF
  çerçevesini kullanıyor ve ortakların talep edebileceği "hassas konum verisi"
  amacını listeliyor, politikamız ise yalnızca IP'den türetilen ülke/şehir
  düzeyinden bahsediyordu. 3. maddeye açıklayıcı paragraf, 5. maddeye çapraz
  referans eklendi. **`PRIVACY_VERSION` 1 → 2** (oyuncular onayı bir kez daha
  verecek — şu an kimse kabul etmediği için bedava).
- Yayınlanan sayfalar güncellendi ve **canlıda doğrulandı**: Aldros-art `f952185`.

### AdMob — bitti
- **GDPR (Avrupa tüzükleri) mesajı** oluşturuldu ve yayınlandı. "İzin vermeyin"
  düğmesi tüm ülkelerde açık.
- **ABD eyalet yönetmelikleri mesajı** oluşturuldu. Bu mesaj otomatik açılmaz;
  giriş noktası oyundaki **Ayarlar → Gizlilik → Reklam Tercihleri** butonu
  ([index.html](index.html) `ad-privacy-btn` → `showPrivacyOptionsForm()`).
  [main.js](js/main.js) buton görünürlüğünü `initAds()` bittikten sonra
  hesaplıyor — sıra doğru, dokunma.
- **iOS gerçek kimliklere geçti**: App ID `…~3621532807`, Ödüllü `…/8205801765`.
  Google'ın test kimliğinden depoda iz kalmadı.

---

## Önceki oturumda (18 Eylül) bulunan gerçek hatalar

Kayıt olarak duruyor, hepsi düzeltildi:

- **Android derlemesi tamamen kırıktı.** `minSdkVersion 23`, Play Games
  kütüphanesinin istediği 24'ün altındaydı. → minSdk 24, compile/targetSdk 36.
- **Three.js bir CDN'den (unpkg) yükleniyordu.** İnternetsiz oyun açılmıyordu,
  App Store 2.5.2 riski vardı, gizlilik metniyle çelişiyordu. → `vendor/three/`.
- **Ödüllü reklam erken kapatmada sonsuza dek asılı kalıyordu.** Eklenti promise'i
  yalnızca ödül callback'inden resolve ediyordu. → `Dismissed`/`FailedToShow`.
- **UMP onayı ve iOS ATT istemi hiç çağrılmıyordu.** → `ensureConsent()`.
- **Uygulama ikonu hâlâ Capacitor şablonuydu.** → yeni panter ikonu.
- **Mağaza görsellerinde başlıklar yanlış eşleşebiliyordu.**

---

## Açık işler

### Kullanıcıda (Play)
- [ ] Kapalı test: ülke seçimi (tümü önerildi), 14-15 tester, sürüm, Google'a gönder
- [ ] 12 testerin **katılım linkini kabul etmesi** — sadece listeye eklemek sayaç başlatmıyor
- [ ] 14 gün sonra üretim erişimi başvurusu
- [ ] Türkçe mağaza girişi (metin + `store/play/tr/` görselleri + `/panthop/gizlilik`)
- [ ] PC'de Play Games form faktörü kararı

### Kullanıcıda (AdMob)
- [ ] **Yayından sonra** AdMob uygulamasını Play kaydına bağla → `app-ads.txt`
      doğrulanır ve ana sayfadaki "Uygulama mağazasına bağlantı oluştur" görevi
      kapanır. Uygulama canlı olmadan yapılamıyor.

### iOS — kodda açık yok, Mac mini'de yapılacaklar
- [ ] Apple Developer üyeliği
- [x] ~~iOS ikon seti~~ — `make-app-icon.mjs` artık iOS ikonunu da yazıyor
      (1024, alfasız). Mac'te `npm run cap:assets:ios` çalıştırırsan açılış
      ekranları için işe yarar ama **sonrasında ikon scriptini tekrar çalıştır**
- [ ] `npm run ios:setup` → Xcode Team + Game Center capability
- [ ] App Store Connect kaydı

### İsteğe bağlı
- [ ] Play Games 32 başarım → `LOCAL_TO_PLAY` ([store/basarimlar.md](store/basarimlar.md)).
      İkonlar hazır: `npm run store:achievements` → `store/achievement-icons/`
      (32 dosya, 512×512, alfasız; eşleşme listesi o klasördeki INDEX.md).
      Games Services kurulumunda **Play'in imzalama sertifikası SHA-1'i** gerekiyor,
      upload key'inki değil — ikisi de eklenmeli.
- [ ] Öne çıkan görseldeki maskot hâlâ eski çerçeveli çizim; yeni ikonla tutarsız

---

## Yeni oturumun yanlış yapacağı şeyler

**`npm run cap:assets` ikonları eskiye döndürür.** O araç açılış ekranlarını da
üretiyor, bu yüzden çalıştırılması gerekebilir — ama sonrasında **mutlaka**
`node tools/make-app-icon.mjs` çalıştır.

**iOS ikonu 10 Temmuz'a kadar eski çerçeveli maskotu taşıyordu** (19 Eylülde
düzeltildi). `assets/icon-only.png` **alfa kanalı taşıyor**; capacitor-assets onu
kaynak alırsa çıkan ikon saydam olur ve **App Store Connect reddeder**. Bu yüzden
`make-app-icon.mjs` iOS ikonunu doğrudan, düzleştirilmiş olarak yazıyor.

**Açılış ekranları (splash) hâlâ eski çerçeveli pixel-art çizim** — hem Android
hem iOS. Oyunun kendisi pixel-art olduğu için kasıtlı olabilir; değiştirilecekse
`assets/splash.png` + `splash-dark.png` yenilenip `cap:assets` çalıştırılmalı.

**sharp tek pipeline'da işlemleri yeniden sıralıyor.** `resize` + `extract` +
`resize` zincirini yazıldığı sırada çalıştırmıyor; kırpılan bölge yanlış piksellere
düşüyor ve çıktı sessizce boş geliyor. Her adım arasında `toBuffer()` al.

**`ios/App/App/Info.plist` depoda TAKİPLİ** — `ios/App/App/public/` gitignore'da
olduğu için tüm iOS klasörü öyle sanılıyor. Plist'teki `GADApplicationIdentifier`
elle güncellenmeli; `patch-ios-plist.sh` yalnızca Mac'te çalışıyor.

**`capacitor-assets` adaptive katmanları yanlış boyutta üretiyor** (48dp yerine
108dp olmalı) ve verdiğin foreground'u yeniden ölçekliyor. `make-app-icon.mjs`
bu yüzden kaynakları doğrudan yazıyor.

**Adaptive ikon XML'i katmanlara %16.7 inset uyguluyor**, yani çizim tam olarak
görünen 72dp alanına oturuyor. Önizleme yaparken ekstra maske kırpması uygulama.

**`npm start`'tan önce en az bir kez `npm run build` gerekiyor** — Three.js ve
`@capacitor/core` artık `vendor/` altından servis ediliyor, o klasör üretiliyor.

**Ekonomiye dokunan her değişiklikte [ECONOMY.md](ECONOMY.md) güncellenir.**
Kullanıcının kalıcı isteği; dengeleme konuşmaları o dosya üzerinden yürüyor.

**Mağaza görselleri `.gitignore`'da.** Yoksa `npm run store:gfx` ile yeniden üret;
kaynak ham kareler `store/raw/<dil>/` altında commit'li.

**sharp `resize`'ı `composite`'ten önce uyguluyor.** Maskeleme yaparken önce
birleştirip `toBuffer()` al, sonra ayrı bir pipeline'da küçült.

**Gizlilik URL'si dile göre değişir:** en-US girişinde `/panthop/privacy`,
tr-TR girişinde `/panthop/gizlilik`. Politika metnini değiştirirsen
[PRIVACY.md](PRIVACY.md) başındaki üç adımlı yordamı izle (iki HTML sayfası +
`PRIVACY_VERSION` + üç yerde tarih).

**Play'de çocuk yaş grubu seçme** — gizlilik politikasıyla çelişir, Families
politikasını tetikler.

**AutoSprite MCP artık çalışmıyor:** "MCP access requires a paid subscription".
Hafızada Pro abone yazıyor ama API reddediyor; kullanıcının kontrol etmesi lazım.

---

## Sık lazım olan bilgiler

| | |
|---|---|
| Paket adı | `com.simpleonetap.panthop` |
| Sürüm | `versionCode 2` / `versionName 1.0` |
| SDK | minSdk 24, compile/target 36 |
| Keystore | `C:\Users\only-\panthop-release.jks` (depo dışı, USB yedeği var) |
| Keystore şifreleri | `android/keystore.properties` (gitignore'da) |
| Upload key SHA-1 | `30:68:92:03:0F:E4:7E:C3:88:C2:0A:E2:11:DE:28:13:80:FC:F1:1E` |
| AdMob yayıncı | `pub-6482116152023017` |
| AdMob Android App ID | `ca-app-pub-6482116152023017~7362056597` |
| AdMob Android Rewarded | `ca-app-pub-6482116152023017/3833875129` |
| AdMob iOS App ID | `ca-app-pub-6482116152023017~3621532807` |
| AdMob iOS Rewarded | `ca-app-pub-6482116152023017/8205801765` |
| Gizlilik (TR / EN) | `https://aldros.site/panthop/gizlilik` · `/panthop/privacy` |
| Gizlilik sürümü | `PRIVACY_VERSION = 2` ([js/storage.js](js/storage.js)) |
| Geliştirici web sitesi | `https://aldros.site` (app-ads.txt buna bağlı) |
| İletişim e-postası | `ozanyvz92@yandex.com` |
| Site deposu | `C:\Users\only-\OneDrive\Documents\GitHub\Aldros-art` (Netlify) |

**Çıktılar**

```
AAB : android\app\build\outputs\bundle\release\app-release.aab
APK : android\app\build\outputs\apk\release\app-release.apk
Görseller : store/play/<dil>/ , store/ios/<dil>/
```

**Sık kullanılan komutlar**

```bash
npm run build                    # dist/ + vendor/
npx cap sync android
cd android && ./gradlew.bat :app:bundleRelease
npm run store:gfx                # mağaza görselleri
node tools/make-app-icon.mjs     # ikonlar (cap:assets'ten SONRA)
node tools/dump-achievements.mjs # başarım tablosu
```
