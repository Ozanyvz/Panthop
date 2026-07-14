# Mağaza görselleri (Play Store + App Store)

Bu klasördeki her şey `npm run store:gfx` ile üretilir (script: `tools/make-store-graphics.mjs`).

## Akış

1. Oyundan ham ekran görüntüleri al (telefonda veya tarayıcıda; PNG/JPG).
2. Dosyaları `store/raw/` içine at. **Dosya adı sırası önemli** — alfabetik sıraya
   göre `tools/make-store-graphics.mjs` içindeki `CAPTIONS` listesiyle eşleşir:
   - `01-...` → TEK TUSLA ZIPLA!
   - `02-...` → ENGELLERI AS / YUKARI TIRMAN
   - `03-...` → KABUK TOPLA / GELISIM AL (gelişim ekranı görüntüsü)
   - `04-...` → BASARIMLARI AC / ODULLERI TOPLA (başarımlar ekranı)
   - `05-...` → PENCE VE KALKAN / GUCLERI SENINLE
   - `06-...` → REKORU KIR / ZIRVEYE TIRMAN (oyun sonu / yeni rekor)
3. `npm run store:gfx` çalıştır. Çıktılar `store/play/` ve `store/ios/` altına yazılır.

Başlıkları değiştirmek istersen `CAPTIONS` dizisini düzenle (piksel font nedeniyle
**ASCII** yaz — Türkçe karakter yok, tr.json kuralıyla aynı).

## Üretilen boyutlar

| Dosya | Boyut | Nerede kullanılır |
|---|---|---|
| `play/feature-1024x500.png` | 1024×500 | Play Console → Öne çıkan görsel (zorunlu) |
| `play/NN-phone-1080x1920.png` | 1080×1920 | Play telefon ekran görüntüleri (en az 2, en fazla 8) |
| `ios/NN-iphone69-1290x2796.png` | 1290×2796 | App Store 6.9" iPhone (zorunlu boyut) |
| `ios/NN-iphone65-1242x2688.png` | 1242×2688 | App Store 6.5" iPhone (eski cihaz listesi) |
| `ios/NN-ipad13-2048x2732.png` | 2048×2732 | App Store 13" iPad (iPad desteği açıksa zorunlu) |

Notlar:
- Play ayrıca 512×512 uygulama ikonu ister → `assets/icons/icon-512.png` hazır.
- Play tablet görüntüleri (7"/10") isteğe bağlı; tablet vitrinine girmek istersen
  aynı ham görüntülerden üretilebilir.
- Mağaza açıklama metinleri: `store/listing-tr.md`.
