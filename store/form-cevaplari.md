# Mağaza formları — cevap föyü

Play Console ve App Store Connect'in sorduğu beyan formları için hazır cevaplar.
Hepsi **koddaki gerçek davranışa** göre hazırlandı, tahmin değil:

- Oyun hesap açtırmıyor, ad/e-posta/telefon toplamıyor ([js/storage.js](../js/storage.js))
- Tüm ilerleme cihazda `localStorage`'da, hiçbir sunucuya gönderilmiyor
- Tek üçüncü taraf SDK'lar: Google AdMob + Play Games / Game Center
- Birleşmiş manifestteki izinler: `INTERNET`, `VIBRATE`, `WAKE_LOCK`,
  `ACCESS_NETWORK_STATE`, `FOREGROUND_SERVICE`, `com.google.android.gms.permission.AD_ID`
  (son dördü Google SDK'larından geliyor, oyun kodu istemiyor)

> ⚠️ **Yaş hedefi tutarlılığı:** Gizlilik politikamız "13 yaşın altındaki
> çocuklara yönelik değildir" diyor. Play'de **"Çocuklar" hedef kitlesini
> SEÇME** — seçersen Families politikası devreye girer, AdMob yapılandırması
> değişmesi gerekir ve politika metniyle çelişir. 13+ seç.

---

## Google Play

### Uygulama içeriği → Reklamlar
- Uygulamanız reklam içeriyor mu? → **Evet**

### Uygulama içeriği → Uygulama erişimi
- **Tüm işlevler özel erişim olmadan kullanılabilir**
  (giriş yok, kod yok, ödeme duvarı yok — inceleyiciye verecek hesap gerekmiyor)

### Uygulama içeriği → Hedef kitle ve içerik
- Hedef yaş grupları: **13-15, 16-17, 18+**
  (çocuk yaş gruplarını işaretleme — yukarıdaki uyarı)
- Uygulamanız çocukların ilgisini çekiyor mu? → **Hayır**

### Uygulama içeriği → Veri güvenliği (Data safety)

**Uygulamanız kullanıcı verisi topluyor veya paylaşıyor mu? → EVET**
(Kendi kodumuz değil, AdMob SDK'sı topluyor — Play'e göre bu da sayılır.)

| Veri türü | Toplanıyor | Paylaşılıyor | Amaç | Zorunlu mu |
|---|---|---|---|---|
| **Cihaz veya diğer kimlikler** → Reklam kimliği | Evet | Evet | Reklamcılık veya pazarlama | Zorunlu |

Diğer tüm kategoriler → **Hayır**:
ad/e-posta/adres · kişiler · konum · fotoğraf/video · ses · dosyalar · takvim ·
sağlık · finansal bilgi · mesajlar · arama geçmişi · uygulama içi arama geçmişi ·
kişisel tanımlayıcılar

**Güvenlik uygulamaları:**
- Veriler aktarım sırasında şifreleniyor mu? → **Evet** (AdMob HTTPS kullanır)
- Kullanıcı verilerinin silinmesini isteyebiliyor mu? → **Evet**
  - Oyun içi: Ayarlar → Veriler → İlerlemeyi Sıfırla
  - Silme talebi URL'si (istenirse): `https://aldros.site/panthop/gizlilik`

> AdMob'un kendi "Data safety" rehber sayfası ara sıra güncelleniyor (ör. bazı
> durumlarda "yaklaşık konum" da beyan ediliyor). Formu doldurmadan önce
> AdMob Yardım'daki güncel listeye bir göz at; yukarıdaki satır kesin olan kısım.

### Uygulama içeriği → Reklam kimliği
- Reklam kimliği kullanıyor musunuz? → **Evet**
- Amaç: **Reklamcılık veya pazarlama**
(Manifestte `com.google.android.gms.permission.AD_ID` var, beyan etmek zorunlu.)

### Uygulama içeriği → İçerik derecelendirmesi (IARC anketi)
Dürüst cevaplar:
- Şiddet: **Çizgi film / fantezi şiddeti var** — Pantho pençeyle kartalları
  parçalıyor. Kan, yaralanma ya da gerçekçi tasvir yok.
- Cinsellik, küfür, uyuşturucu, kumar, korku → **Hayır**
- Kullanıcı etkileşimi (sohbet, kullanıcı içeriği paylaşımı) → **Hayır**
- Konum paylaşımı → **Hayır**
- Dijital satın alma → **Hayır**

Beklenen sonuç: PEGI 3 / ESRB Everyone civarı.

### Uygulama içeriği → Devlet uygulaması / finans / sağlık
- Hepsi **Hayır**

### Mağaza kaydı
| Alan | Değer |
|---|---|
| Uygulama adı | en-US: `Panthop: One Tap Jump` · tr-TR: `Panthop: Tıkla ve Zıpla` |
| Kategori | Oyunlar → Arcade |
| Gizlilik politikası | https://aldros.site/panthop/gizlilik |
| **Geliştirici web sitesi** | https://aldros.site ← app-ads.txt için birebir bu |
| İletişim e-postası | ozanyvz92@yandex.com |
| Ücret | Ücretsiz |

Metinler: [listing-tr.md](listing-tr.md) · [listing-en.md](listing-en.md)
Görseller: `store/play/<dil>/` (öne çıkan görsel + 6 telefon karesi),
ikon `assets/icons/icon-512.png`

---

## App Store Connect

### App Privacy (gizlilik etiketi)
**Bu uygulama veri topluyor mu? → EVET**

| Veri | Sizi izlemek için kullanılıyor | Uygulama işlevi | Bağlantılı mı |
|---|---|---|---|
| **Tanımlayıcılar → Cihaz Kimliği** (IDFA) | **Evet** | Üçüncü taraf reklamcılık | Kimliğe bağlı değil |

Diğer tüm kategoriler → toplanmıyor.

> "Sizi izlemek için kullanılıyor = Evet" dediğin an App Store, uygulamanın ATT
> istemi göstermesini bekler. Bizde var: `ensureConsent()` iOS'ta
> `requestTrackingAuthorization()` çağırıyor
> ([admob.js](../js/services/providers/admob.js)). Beyan ile davranış uyuşuyor.

### Yaş derecelendirmesi
Play'deki IARC cevaplarının aynısı. Beklenen: **4+ veya 9+**
(çizgi film şiddeti seçilirse 9+ çıkabilir).

### Diğer zorunlu alanlar
| Alan | Değer |
|---|---|
| Bundle ID | `com.simpleonetap.panthop` |
| Gizlilik politikası URL'si | https://aldros.site/panthop/gizlilik |
| Destek URL'si | https://aldros.site |
| Kategori | Oyunlar → Arcade |
| Fiyat | Ücretsiz |
| **EU DSA tüccar beyanı** | İlk gönderimde sorulur — bireysel geliştiriciyseniz "tüccar değilim" veya vergi bilgisi istenebilir |
| Şifreleme | `ITSAppUsesNonExemptEncryption = false` zaten Info.plist'te ([patch-ios-plist.sh](../tools/patch-ios-plist.sh)) — her yüklemede sorulmaz |

### İnceleme notu (App Review'a yazılacak)
> The game requires no account or login — all features are available immediately.
> Rewarded ads are optional and user-initiated (the "2x bark" button on the
> game-over screen). Progress is stored locally on the device only.

---

## Sık takılınan yerler

- **Geliştirici web sitesi ≠ aldros.site** olursa `app-ads.txt` görmezden
  gelinir, reklam geliri düşer. İki mağazada da aynı yaz.
- **Çocuk yaş grubu seçmek** Families politikasını tetikler; gizlilik
  politikasıyla çelişir ve AdMob tarafında ek yapılandırma ister.
- **`FOREGROUND_SERVICE` izni** manifestte görünüyor ama oyun kodu kullanmıyor,
  Google Play Services'ten geliyor. Play sorarsa kaynağı budur.
- **iOS hâlâ test reklam biriminde.** Android gerçek kimliklere geçti; iOS için
  AdMob'da ayrı bir uygulama oluşturulup kimlikleri girilmeden App Store
  derlemesi alınmamalı (bkz. [RELEASE.md](../RELEASE.md) 6a bölümü).
- **Gizlilik politikası URL'si dile göre değişir:** en-US girişinde
  `/panthop/privacy`, tr-TR girişinde `/panthop/gizlilik`.
