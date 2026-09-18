# Devam notu — 18 Eylül 2026

Yayın sürecinin ortasında oturum değiştirmek için yazıldı. Yeni bir sohbete
başlarken bu dosyayı okut; nerede kaldığımızı, hangi kararların verildiğini ve
yeni bir oturumun kolayca yanlış yapacağı şeyleri anlatıyor.

Adım adım yayın rehberi ayrı: [RELEASE.md](RELEASE.md). Burası "şu an neredeyiz".

---

## Tek cümleyle

Android tarafı yayına hazır ve imzalı; Play Console'da kurulum tamamlandı,
sıra **kapalı testi başlatmakta** (12 test kullanıcısı × 14 gün zorunlu).
iOS'a hiç başlanmadı.

---

## HEMEN SIRADAKİ ADIM

Kapalı test sürümü oluşturulacak. Ama verilmesi gereken bir karar var:

**Dahili teste yüklenen AAB eski Capacitor ikonunu taşıyordu.** Yeni panter
ikonu ondan sonra yapıldı. Kapalı teste yeni ikonlu sürümü koymak istiyoruz
(12 kişi 14 gün boyunca o sürümü görecek), ama `versionCode` hâlâ `1` ve Play
aynı numarayla ikinci bir paket kabul etmiyor.

Yapılacak:
1. `android/app/build.gradle` → `versionCode 2`
2. `cd android && ./gradlew.bat :app:bundleRelease`
3. Çıkan AAB'yi kapalı teste yükle

Kullanıcı bunu onayladıysa yap; onaylamadıysa kitaplıktaki eski paketi kullanır.

Ayrıca göndermeden önce: **PC'de Google Play Games form faktörü hâlâ açık.**
Test edilmemiş bir platform; Gelişmiş ayarlar → Form faktörleri'nden kapatılması
önerildi, kullanıcı henüz karar vermedi.

---

## Bu oturumda ne yapıldı

19 commit. Öne çıkanlar:

### Bulunan ve düzeltilen gerçek hatalar

- **Android derlemesi tamamen kırıktı.** `minSdkVersion 23`, Play Games
  kütüphanesinin istediği 24'ün altındaydı; manifest merger hata verip APK/AAB
  üretimini durduruyordu. targetSdk'den bağımsız, önceden var olan bir hataydı.
  → minSdk 24, compileSdk/targetSdk 36. Doğrulandı: `bundleRelease` BUILD SUCCESSFUL.
- **Three.js bir CDN'den (unpkg) yükleniyordu.** İnternetsiz oyun hiç açılmıyordu,
  iOS'ta her açılışta ağ gerekiyordu (WKWebView `capacitor://` altında Service
  Worker çalıştırmaz), App Store 2.5.2 riski vardı ve "hiçbir veri gönderilmiyor"
  diyen gizlilik metniyle çelişiyordu. → `vendor/three/` altına yerelleştirildi.
- **Ödüllü reklam erken kapatmada sonsuza dek asılı kalıyordu.** Eklenti
  `showRewardVideoAd()` çağrısını yalnızca ödül callback'inden resolve ediyor;
  oyuncu reklamı kapatınca promise hiç sonuçlanmıyordu ve "KABUK X2" butonu
  donuyordu. → Akış artık `Dismissed`/`FailedToShow` olaylarıyla sonlanıyor.
- **UMP onayı ve iOS ATT istemi hiç çağrılmıyordu.** Info.plist'te ATT metni
  vardı ama istem yoktu (5.1.2 reddi riski). → `ensureConsent()` eklendi.
- **Uygulama ikonu hâlâ Capacitor'ın kurulum şablonuydu** (mor-pembe "A").
  → Yeni tasarım, aşağıda.
- **Mağaza görsellerinde başlıklar yanlış eşleşebiliyordu** (dosya sırasına göre
  eşleşiyordu, numarasına göre değil) ve OS çubukları kırpılmıyordu.

### Eklenenler

- Gizlilik politikası: [PRIVACY.md](PRIVACY.md) kaynak metin, canlı sayfalar
  `Aldros-art` deposunda, oyun içi tek seferlik onay ekranı, `app-ads.txt`
- Release imzalama yapılandırması (`build.gradle` + gitignore'lu `keystore.properties`)
- Mağaza görselleri: TR + EN, telefon + 7"/10" tablet + iOS, öne çıkan görsel
- Mağaza metinleri TR + EN, form cevap föyü, 32 başarımın ID tablosu
- Yeni uygulama ikonu + `tools/make-app-icon.mjs`

---

## Açık işler

### Kullanıcıda (Play)
- [ ] Kapalı test: ülke seçimi (tümü önerildi), 14-15 tester, sürüm, Google'a gönder
- [ ] 12 testerin **katılım linkini kabul etmesi** — sadece listeye eklemek sayaç başlatmıyor
- [ ] 14 gün sonra üretim erişimi başvurusu
- [ ] Türkçe mağaza girişi (metin + `store/play/tr/` görselleri + `/panthop/gizlilik`)
- [ ] PC'de Play Games form faktörü kararı

### Kullanıcıda (AdMob)
- [ ] **GDPR mesajı oluştur** (Gizlilik ve mesajlaşma → Avrupa düzenlemeleri).
      Kod hazır ama mesaj yoksa Avrupa'da onay formu boş döner.
- [ ] ABD eyalet düzenlemeleri mesajı
- [ ] Yayından sonra AdMob uygulamasını Play kaydına bağla → `app-ads.txt` doğrulanır
- [ ] **iOS uygulaması oluştur** → App ID + Rewarded Unit ID

### iOS (hiç başlanmadı)
Tam liste [RELEASE.md](RELEASE.md) 6a bölümünde. Özet:
- [ ] AdMob iOS kimlikleri → `patch-ios-plist.sh` + `admob.js`
      (**iOS hâlâ Google'ın TEST reklam biriminde**, kazanç getirmez)
- [ ] iOS ikon seti (`make-app-icon.mjs` yalnızca Android üretiyor;
      Mac'te `npm run cap:assets:ios`)
- [ ] Mac mini: `npm run ios:setup`, Xcode Team + Game Center capability
- [ ] App Store Connect kaydı

### İsteğe bağlı
- [ ] Play Games 32 başarım → `LOCAL_TO_PLAY` ([store/basarimlar.md](store/basarimlar.md))
- [ ] Öne çıkan görseldeki maskot hâlâ eski çerçeveli çizim; yeni ikonla tutarsız

---

## Yeni oturumun yanlış yapacağı şeyler

**`npm run cap:assets` ikonları eskiye döndürür.** O araç açılış ekranlarını da
üretiyor, bu yüzden çalıştırılması gerekebilir — ama sonrasında **mutlaka**
`node tools/make-app-icon.mjs` çalıştır.

**`capacitor-assets` adaptive katmanları yanlış boyutta üretiyor** (48dp yerine
108dp olmalı) ve verdiğin foreground'u yeniden ölçekliyor. `make-app-icon.mjs`
bu yüzden kaynakları doğrudan yazıyor.

**Adaptive ikon XML'i katmanlara %16.7 inset uyguluyor**, yani çizim tam olarak
görünen 72dp alanına oturuyor. Önizleme yaparken ekstra maske kırpması uygulama —
`HEAD_FRACTION` doğrudan "kafa görünen ikonun ne kadarını kaplıyor" demek.

**`npm start`'tan önce en az bir kez `npm run build` gerekiyor** — Three.js ve
`@capacitor/core` artık `vendor/` altından servis ediliyor, o klasör üretiliyor.

**Mağaza görselleri `.gitignore`'da.** Yoksa `npm run store:gfx` ile yeniden üret;
kaynak ham kareler `store/raw/<dil>/` altında commit'li.

**sharp `resize`'ı `composite`'ten önce uyguluyor.** Maskeleme yaparken önce
birleştirip `toBuffer()` al, sonra ayrı bir pipeline'da küçült.

**Gizlilik URL'si dile göre değişir:** en-US girişinde `/panthop/privacy`,
tr-TR girişinde `/panthop/gizlilik`.

**Play'de çocuk yaş grubu seçme** — gizlilik politikasıyla çelişir, Families
politikasını tetikler.

**AutoSprite MCP artık çalışmıyor:** "MCP access requires a paid subscription".
Hafızada Pro abone yazıyor ama API reddediyor; kullanıcının kontrol etmesi lazım.

---

## Sık lazım olan bilgiler

| | |
|---|---|
| Paket adı | `com.simpleonetap.panthop` |
| Sürüm | `versionCode 1` / `versionName 1.0` |
| SDK | minSdk 24, compile/target 36 |
| Keystore | `C:\Users\only-\panthop-release.jks` (depo dışı, USB yedeği var) |
| Keystore şifreleri | `android/keystore.properties` (gitignore'da) |
| Upload key SHA-1 | `30:68:92:03:0F:E4:7E:C3:88:C2:0A:E2:11:DE:28:13:80:FC:F1:1E` |
| AdMob yayıncı | `pub-6482116152023017` |
| AdMob Android App ID | `ca-app-pub-6482116152023017~7362056597` |
| AdMob Android Rewarded | `ca-app-pub-6482116152023017/3833875129` |
| Gizlilik (TR / EN) | `https://aldros.site/panthop/gizlilik` · `/panthop/privacy` |
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
