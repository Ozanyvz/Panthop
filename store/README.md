# Mağaza görselleri (Play Store + App Store)

Bu klasördeki her şey `npm run store:gfx` ile üretilir (script: `tools/make-store-graphics.mjs`).

## Akış

1. Oyunu çekeceğin dile al (**Ayarlar → DİL**), sonra ham ekran görüntülerini
   çek. Arayüz dili ile başlık dili aynı olmak zorunda.
2. Dosyaları `store/raw/<dil>/` içine at — `tr/` ve `en/` destekleniyor.
3. **Dosya adı numarayla başlasın.** Başlık eşleşmesi dosyanın klasördeki
   sırasına değil, baştaki numaraya göre yapılır (`03-gelisim.png` → 3. başlık),
   böylece eksik bir kare sonrakilerin başlığını kaydırmaz:

   | Numara | Ne çekilecek | Başlık (tr) |
   |---|---|---|
   | `01` | Zıplama anı | TEK TUSLA ZIPLA! |
   | `02` | Engel aşma / tırmanma | ENGELLERI AS / YUKARI TIRMAN |
   | `03` | Gelişim ekranı (kabuk sekmesi) | KABUK TOPLA / GELISIM AL |
   | `04` | Başarımlar ekranı | BASARIMLARI AC / ODULLERI TOPLA |
   | `05` | Güç anı / güç gelişmeleri | PENCE VE KALKAN / GUCLERI SENINLE |
   | `06` | Oyun sonu | REKORU KIR / ZIRVEYE TIRMAN |

4. `npm run store:gfx` çalıştır. Çıktılar `store/play/<dil>/` ve
   `store/ios/<dil>/` altına yazılır; ham görüntüsü olmayan dil atlanır.

Telefon ekran görüntülerindeki **durum çubuğu ve gezinme çubuğu otomatik
kırpılır** (`TRIM_TOP` / `TRIM_BOTTOM`). Değerler 945×2048 Android çekimlerine
göre ayarlı — başka bir cihazda kenarlar yanlış kesilirse bu iki sabiti
güncelle.

Başlıkları değiştirmek istersen `tools/make-store-graphics.mjs` içindeki
`CAPTIONS` nesnesini düzenle (piksel font nedeniyle **ASCII** yaz — Türkçe
karakter yok, tr.json kuralıyla aynı).

## Üretilen boyutlar

| Dosya | Boyut | Nerede kullanılır |
|---|---|---|
| `play/feature-1024x500.png` | 1024×500 | Play Console → Öne çıkan görsel (zorunlu) |
| `play/<dil>/NN-phone-1080x1920.png` | 1080×1920 | Play telefon ekran görüntüleri (en az 2, en fazla 8) |
| `ios/<dil>/NN-iphone69-1290x2796.png` | 1290×2796 | App Store 6.9" iPhone (zorunlu boyut) |
| `ios/<dil>/NN-iphone65-1242x2688.png` | 1242×2688 | App Store 6.5" iPhone (eski cihaz listesi) |
| `ios/<dil>/NN-ipad13-2048x2732.png` | 2048×2732 | App Store 13" iPad (iPad desteği açıksa zorunlu) |

Notlar:
- Play ayrıca 512×512 uygulama ikonu ister → `assets/icons/icon-512.png` hazır.
- Play tablet görüntüleri (7"/10") isteğe bağlı; tablet vitrinine girmek istersen
  aynı ham görüntülerden üretilebilir.
- Mağaza açıklama metinleri: `store/listing-tr.md`.
