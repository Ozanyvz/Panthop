# Panthop — Ekonomi Özeti

> Dengeleme referansı. **Ekonomiye dokunan her değişiklikte bu dosya güncellenir.**
> Kaynak: `js/upgrades.js` · `js/achievements.js` · `js/storage.js` · `js/game.js`
> Son güncelleme: **2026-07-13**

## 1. Para birimleri bir bakışta

| Birim | Nereden kazanılır | Nereye harcanır |
|---|---|---|
| 🪵 Kabuk | Koşu sonu: `skor × çarpan` (+ reklam ile 2x) · parçalama başarımları (erken kademeler) | Kabuk gelişimleri (Isınma, Kabuk Çarpanı, Bilenmiş Pençe) |
| 🍃 Yaprak | **Sadece** kilometre taşı başarımları (elle toplanır) | Sprint ağacı |
| 🪶 Tüy | Kuş parçalama başına şans zarı (%20 taban) · parçalama başarımları (geç kademeler) | Tüy Şansı + Savuşturma ağacı |

Skor kaynakları: normal zıplama **+1** · sprint zıplaması şans tutarsa **+2** (bkz. Sprint Primi). (Engel parçalama artık skor vermez; parçalama tek yol pençe harcamaktır.)

## 2. Kazanç oranları

**🪵 Kabuk (koşu sonu):** `floor(skor × çarpan)` — çarpan: 1.0 / 1.25 / 1.5 / 1.75 / 2.0 (Kabuk Çarpanı kademesine göre). Oyun sonu reklam izlenirse o koşunun kabuğu **2 katı**.

**🍃 Yaprak (milestone başarımları):**

| Skor eşiği | 25 | 50 | 100 | 200 | 350 | 500 | 750 | 1000 |
|---|---|---|---|---|---|---|---|---|
| Ödül | 1 | 2 | 4 | 6 | 8 | 10 | 12 | 14 |
| Kümülatif | 1 | 3 | 7 | 13 | 21 | 31 | 43 | **57** |

**🪶 Tüy (kuş parçalama):** her öldürülen kuş için zar — düşme şansı Tüy Şansı kademesine göre **%20 / 35 / 50 / 75**.

## 3. Gelişim maliyetleri ve etkileri

### 🪵 Kabuk sekmesi — toplam **7110**

| Gelişim | Kademe fiyatları | Toplam | Etki (kademe kademe) |
|---|---|---|---|
| Isınma | 50 · 150 · 400 · 1000 | 1600 | başlangıç hızı −%7/kademe (0.93→0.72) |
| Kabuk Çarpanı | 80 · 220 · 560 · 1400 | 2260 | kabuk ×1.25 → ×1.5 → ×1.75 → ×2.0 |
| Bilenmiş Pençe | 150 · 300 · 800 · 2000 | 3250 | koşu başına 2 → 5 → 8 → 10 pençe; pençe kuş engeline değince harcanır, zıplamayla kaybolmaz |

### 🍃 Yaprak sekmesi (Sprint ağacı) — toplam **49**

| Gelişim | Kademe fiyatları | Toplam | Etki |
|---|---|---|---|
| Sprint (kilit) | 1 | 1 | bas-tut sprint açılır (2 sn şarj) |
| Sprint Primi | 2 × 5 | 10 | sprint zıplaması +2 skor şansı: %20 → 40 → 60 → 80 → 100 |
| Pençe Bileme | 4 × 5 | 20 | sprint şarjı her dolduğunda %20 → 40 → 60 → 80 → 100 şansla +1 pençe (Bilenmiş Pençe stoğuna eklenir, harcanana kadar kalır) |
| Odaklanma | 4 · 6 · 8 | 18 | sprint şarj süresi 2.0 → 1.5 → 1.0 → 0.5 sn |

### 🪶 Tüy sekmesi — toplam **675**

| Gelişim | Kademe fiyatları | Toplam | Etki |
|---|---|---|---|
| Tüy Şansı | 50 · 100 · 200 | 350 | düşme şansı %20 → 35 → 50 → 75 |
| Kaçış | 25 · 50 · 100 · 150 | 325 | koşu başına 2 → 5 → 8 → 10 dal darbesi emme (eski kilit+sayı takviyesi tek hatta birleşti) |

### ∞ Sonsuz sekmesi (sınırsız +1)

Kaçış **veya** Bilenmiş Pençe **max** olduğunda gelişim ekranında açılır; maxlanan yetenek o andan itibaren **yalnızca burada** görünür. Her satın alım kalıcı **+1 hak**, sabit fiyat, sınırsız tekrar:

| Yetenek | +1 fiyatı |
|---|---|
| Bilenmiş Pençe | 1000 🪵 |
| Kaçış | 100 🪶 |

## 4. Başarım ödülleri

| Grup | Eşikler | Ödüller |
|---|---|---|
| Kilometre taşı (skor) | 25 → 1000 (8 adet) | 🍃 toplam **57** (tablo yukarıda) |
| Engel parçalama | 10 / 30 / 75 | 🪵 40 / 120 / 320 (toplam **480**) |
| Engel parçalama | 150 / 300 / 600 | 🪶 4 / 8 / 14 (toplam **26**) |
| Koşu sayısı | 5 / 25 / 100 / 500 | ödülsüz |
| Zıplama sayısı | 50 / 250 / 1000 / 5000 | ödülsüz |

## 5. Denge durumu

| Birim | Toplam gider | Başarım geliri | Oynanış geliri | Durum |
|---|---|---|---|---|
| 🍃 Yaprak | 49 | 57 | — | Artı 8; ağacın tamamı ancak **1000 milestone** ile bitiyor (750'de kümülatif 43 < 49) |
| 🪵 Kabuk | 7110 | 480 | koşu başına `skor×çarpan` (+reklam 2x) | Ör. 100 skorluk koşu + reklam ≈ 200-400 kabuk → ağacı bitirmek kabaca 20-35 iyi koşu |
| 🪶 Tüy | 675 (+∞ kuyusu) | 26 | kuş başına %20-75 şans | Dar boğaz yumuşadı (eski 1250 → 675; Kaçış artık 25 tüyle başlıyor); geç oyunda Sonsuz sekmesi sınırsız tüy/kabuk yutucusu |

Gözlemler / dengeleme adayları:
- [ ] Tüy ekonomisi çok yavaş: kuş kesimi tamamen pençe stoğuna bağlı (koşu başı 2-10 + şansla bilenenler); eski "sprint bedava parçalar" yolu kalktı. Tüy fiyatlarını düşürmek ya da parçalama başarımlarının tüy ödüllerini büyütmek düşünülebilir.
- [ ] Engel parçalama artık +1 skor vermiyor (eski Sprint Parçalama etkisiyle birlikte kalktı) — parçalamanın skor ödülü istenirse pençe harcamasına eklenebilir.
- [ ] Yaprak ağacı 49'a çıktı; tamamı artık 1000 milestone istiyor. Pençe Bileme kademe fiyatı (4🍃) benim seçimim — düşürülebilir ya da milestone ödülleri artırılabilir.
- [ ] Yaprak ağacının bitişi 750 skora bağlı — erken milestone ödüllerini şişirmek (ör. 1/2/4 → 2/3/5) bitişi 500'e çeker.
- [ ] Zorluk rampası artık 200 skorda tavan yapıyor; milestone eşikleri (25…1000) bu eğriye göre yeniden gözden geçirilebilir.

## 6. Değişiklik günlüğü

- **2026-07-14** — **Kaçış tek hatta birleşti:** kilit (300🪶) + Ekstra Kaçış (100/200/300) yerine 4 kademe: 2/5/8/10 hak, fiyat 25·50·100·150 (tüy sekmesi toplamı 1250 → **675**). · **Sonsuz sekmesi eklendi:** Kaçış/Bilenmiş Pençe max olunca açılır, maxlanan yetenek sadece orada; sınırsız +1 hak — pençe 1000🪵, kaçış 100🪶. Mevcut kayıt notu: eski Kaçış sahipleri kademe 1'e (2 hak) düşer.

- **2026-07-13 (3)** — Düzeltme: şans mekaniği yanlış yeteneğe uygulanmıştı. **Bilenmiş Pençe eski haline döndü** (koşu başı 2/5/8/10 pençe, 4 kademe, 150·300·800·2000 🪵). Şans mekaniği **Pençe Bileme'ye (eski Sprint Parçalama, 🍃)** taşındı: 5 kademe, 4🍃/kademe, sprint şarjı dolunca %20-100 şansla +1 pençe → Bilenmiş Pençe stoğuna eklenir. Sprint'in bedava engel parçalama etkisi ve parçalama +1 skoru kaldırıldı. Yaprak sekmesi toplamı 33 → **49**.
- **2026-07-13 (2)** — ~~Bilenmiş Pençe mekaniği değişti: koşu başı sabit darbe hakkı yerine sprint şarjı dolunca %20-100 şansla +1 pençe~~ (aynı gün (3) ile geri alındı — yanlış yetenekteydi).
- **2026-07-13** — Sprint Primi 1 kademeden 5 kademeye: %20'şer artan şansla +2 skor, kademe başına sabit 2 🍃 (eski: tek seferlik 2 🍃, garanti +2). · Bilenmiş Pençe darbeleri 10/15/22/30 → **2/5/8/10** (fiyatlar aynı; aynı gün mekanik tekrar değişti, üstteki kayda bak). · Zorluk rampası 25 → **200** skora yayıldı; müzik kademeleri 7/13/19 → **50/100/150**.
