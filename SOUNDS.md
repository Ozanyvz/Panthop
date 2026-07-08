# Ses Eklenebilecek Noktalar — Analiz

Oyunda hiç ses sistemi yok (sıfırdan kurulacak). Aşağıda eklenebilecek
TÜM ses noktaları kategorilere ayrılmış halde. Her satırda: önerilen dosya
adı, ne zaman tetiklenir, kodda nerede tetiklenir.

Öneri: tüm sesleri `assets/sfx/` altına `.mp3` (veya `.ogg`) olarak koy.
Kısa SFX'ler için tek seferlik küçük dosyalar; müzik için loop'lanabilir uzun dosya.

---

## 1) Oynanış / Karakter (js/game.js)

| Dosya | Ne zaman | Kod konumu |
|-------|----------|------------|
| `jump.mp3` | Normal zıplama (duvardan duvara) | `_beginJump()` / `onJump` callback'i (game.js:390, main.js:1102) |
| `jump-start.mp3` | İlk zıplama (yerden ilk duvara) | `_beginStartJump()` (game.js:375) |
| `land.mp3` | Duvara tutunma / iniş | `_finishJump()` (game.js:409) |
| `sprint-charge.mp3` | Sprint dolum halkası dolarken (loop, basılı tutarken) | `_updateChargeRing()` (game.js:483) |
| `sprint-ready.mp3` | Sprint dolum tamamlandı (halka yeşile döndü) | `holdTime >= sprintHoldTime` anı (game.js:475/546) |
| `sprint-jump.mp3` | Sprint zıplaması (güçlü zıplama, +2) | `_beginJump(true)` / sprintBonus (game.js:390, 422) |
| `climb.mp3` | Tırmanma sesi (loop/adım, opsiyonel) | `STATE.CLIMB` update (game.js:541) |

## 2) Çarpışma & Yetenek Anları (callback'ler — js/game.js → main.js)

| Dosya | Ne zaman | Kod konumu |
|-------|----------|------------|
| `death.mp3` | Ölüm / oyun bitti çarpışması | `_die()` → `onGameOver` (game.js:795, main.js:1106) |
| `sword-slash.mp3` | Kuşu pala şarjıyla doğrama (Air-Strike) | `onSwordSlash` (game.js:775, main.js:1095) |
| `sprint-smash.mp3` | Sprint zıplamasıyla kuş parçalama | `onSprintSmash` (game.js:765, main.js:1101) |
| `dodge.mp3` | Dal çarpışmasını dodge şarjıyla geçme | `onDodge` (game.js:733, main.js:1104) |
| `feather-drop.mp3` | Öldürmeden tüy düşmesi (şans) | `registerKill()` (main.js:1062-1071) |
| `score-pop.mp3` | "+N" skor balonu (sprint bonus/smash) | `onScorePop` / `popScore()` (main.js:1075, 1105) |
| `score-tick.mp3` | Skor artışı (opsiyonel, her +1) | `onScore` (main.js:1088) |

## 3) Menü / UI Etkileşimleri (js/main.js)

| Dosya | Ne zaman | Kod konumu |
|-------|----------|------------|
| `ui-tap.mp3` | Genel buton tıklaması (start/retry/home/geri) | start/retry/home btn (main.js:1198-1212) |
| `purchase.mp3` | Gelişim satın alma (başarılı) | `tryPurchase` ok (main.js:810-816) |
| `purchase-fail.mp3` | Yetersiz bakiye / satın alma başarısız (ops.) | `tryPurchase` !ok (main.js:804) |
| `tab-switch.mp3` | Sekme değiştirme (upgrade/skor sekmeleri) | scoreTabs / upgAvailable (main.js:1277, 1222) |
| `reset.mp3` | İlerlemeyi sıfırlama onayı | `confirmYes` (main.js:1288-1290) |
| `reward-2x.mp3` | Reklam ödülü 2x kabuk alındı | `reward2xBtn` grant (main.js:1259) |

## 4) Başarımlar Ekranı (js/main.js)

| Dosya | Ne zaman | Kod konumu |
|-------|----------|------------|
| `ach-open.mp3` | Başarım modalı açılma | `openAchModal()` (main.js:955) |
| `reward-collect.mp3` | Ödül toplama (yaprak/tüy/kabuk uçar) | `collectFromModal` (main.js:968-977) |
| `wallet-land.mp3` | Uçan ödül cüzdana iner (tık) | `landInWallet()` / `walletEarn()` (main.js:397-410) |

## 5) Oyun Sonu Sahne Sekansı (staged reveal — js/main.js)

Bu sekans kart kart açılır; her aşamaya ufak bir ses çok iyi durur.

| Dosya | Ne zaman | Kod konumu |
|-------|----------|------------|
| `gameover.mp3` | Oyun sonu ekranı açılışı | `showGameOver()` (main.js:551) |
| `new-best.mp3` | Yeni rekor rozeti | `isNewBest` (main.js:557) |
| `milestone.mp3` | Milestone/başarım açıldı kartı | milestoneCard reveal (main.js:451) |
| `count-up.mp3` | Skor sayma animasyonu (loop/tik) | `animateCountUp` (main.js:444) |
| `coin-fly.mp3` | Kabuk/tüy cüzdana uçuşu | `walletEarn` reveal (main.js:466-480) |
| `reveal-pop.mp3` | Her kart belirişi (genel) | `revealEl()` (main.js:419) |

## 6) Ortam / Müzik (opsiyonel ama önerilir)

| Dosya | Ne zaman |
|-------|----------|
| `bgm-menu.mp3` | Ana menü/başlangıç ekranı fon müziği (loop) |
| `bgm-game.mp3` | Oyun içi fon müziği (loop, hıza göre pitch artabilir) |
| `ambient.mp3` | Orman ambiyansı (kuş/rüzgar, loop) |

---

## Notlar / Uygulama İçin

- **Ses aç/kapa ayarı:** Ayarlar ekranında (dil seçici gibi) bir "Ses" ve
  "Müzik" toggle'ı eklenmeli. Mute durumu storage'a yazılmalı.
- **Mobil autoplay:** Tarayıcılar ilk kullanıcı dokunuşundan önce ses çalmaz.
  İlk tap'te `AudioContext`'i unlock et (başlangıç ekranındaki ilk dokunuş).
- **Çakışma:** Aynı SFX çok sık çalabilir (skor tik, climb). Bunlar için
  ya çal-üzerine-yaz ya da kısa cooldown gerekir.
- **Loop sesleri:** `sprint-charge`, `climb`, müzik ve ambiyans loop'lanmalı;
  geri kalan hepsi one-shot.
- **Öncelik (minimum set):** jump, land, death, purchase, reward-collect,
  gameover, bgm-game. Bunlar oyunun "ses var" hissini verir; gerisi cila.

Sesleri bulup `assets/sfx/` içine koyduğunda, bir `AudioManager` servis
katmanı (js/services/ deseninle uyumlu) kurup tüm bu tetikleme noktalarına
bağlayabilirim.
