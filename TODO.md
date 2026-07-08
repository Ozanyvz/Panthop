# Wall Jumper — i18n + Mobil Entegrasyon Yol Haritası

Seçimler:
- Diller (ilk sürüm): **tr** (varsayılan), **en**
- Mobil paketleme: **Önce PWA, sonra Capacitor**
- Dil JSON cache: **Service Worker + memory**

---

## Faz 1 — i18n Altyapısı

- [ ] **1.1** Çevirilecek metinleri çıkar (HTML + main.js)
- [ ] **1.2** `i18n/tr.json` ve `i18n/en.json` dosyalarını oluştur (aynı anahtar şeması)
- [ ] **1.3** `js/i18n.js` modülü:
  - Fetch + memory cache
  - `t(key, vars?)` lookup
  - `setLang(lang)` / `getLang()` / `applyDOM(root?)`
  - localStorage'da seçili dili sakla (`wj_lang_v1`)
  - İlk açılışta `navigator.language` ile auto-detect (fallback: tr)
- [ ] **1.4** `index.html`: tüm sabit metinleri `data-i18n="..."` ile işaretle
- [ ] **1.5** `main.js`: dinamik metinleri (ör. "henüz skor yok") `t(...)` ile ver
- [x] **1.6** Dil seçici UI (başlangıç ekranında küçük TR/EN toggle)
  - **NOT:** 3+ dil eklenince bu buton dropdown menüye dönüşmeli (popover + her dil için satır + click-outside/Esc ile kapanma). `SUPPORTED.length > 2` olduğunda otomatik geç.
- [ ] **1.7** `<html lang>` attribute'unu seçilen dile göre güncelle

## Faz 2 — PWA

- [ ] **2.1** `manifest.webmanifest` (ad, kısa ad, ikon listesi, theme/background, display: standalone, orientation: portrait)
- [ ] **2.2** App ikonları: 192x192, 512x512, 512x512 maskable (`assets/icons/`)
- [ ] **2.3** `index.html`: manifest link + apple-touch-icon + splash meta'ları
- [ ] **2.4** `service-worker.js`:
  - App shell precache (html/css/js/sprites)
  - i18n JSON için stale-while-revalidate
  - Three.js CDN için network-first + cache fallback
  - Version bump ile eski cache temizleme
- [ ] **2.5** `js/main.js`: SW kaydı + güncelleme bildirimi (basit)
- [ ] **2.6** Offline testi (DevTools → Offline → reload + dil değişimi)

## Faz 3 — Mobil Optimizasyon

- [ ] **3.1** Safe-area-inset CSS (notch / home indicator boşlukları)
- [ ] **3.2** Vibration API (zıplama / oyun bitti — kullanıcı tercihiyle)
- [ ] **3.3** Wake Lock API (oyun sırasında ekran kapanmasın)
- [ ] **3.4** Yön kilidi: portre (`screen.orientation.lock('portrait')` — destekleyen yerlerde)
- [ ] **3.5** İlk dokunmada tam ekran (opsiyonel, ayar arkasında)
- [ ] **3.6** `touch-action: manipulation` ve pull-to-refresh engelleme kontrolü

## Faz 4 — Capacitor Paketleme

- [x] **4.1** `package.json` ve Capacitor bağımlılıkları (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/assets`) + `npm install` (449 paket)
- [x] **4.2** `capacitor.config.ts` (appId: `com.simpleonetap.walljumper`, webDir: `dist`)
- [x] **4.3a** `tools/build.mjs` → `dist/` üretimi (Capacitor sync için temiz hedef)
- [x] **4.3b** Android platformu eklendi (`npm run cap:add:android`)
- [x] **4.4** Native splash + adaptive ikonlar — `make-icons.mjs` 1024 master + foreground/background + 2732 splash üretiyor; `@capacitor/assets` 74 res dosyası oluşturdu; AndroidManifest portrait + VIBRATE eklendi
- [ ] **4.5** İlk APK build — Android Studio'da aç (`npm run cap:open:android`), Gradle sync, Run
- [ ] **4.6** (Opsiyonel) Haptics plugin'i Vibration API yerine geçir
- [x] **4.7** Release imzalama notları → [BUILD.md](BUILD.md)
- [ ] **4.8** (Opsiyonel) iOS platformu

## Faz 5 — Test & Doğrulama

- [ ] **5.1** Lighthouse PWA puanı (≥ 90 hedef)
- [ ] **5.2** Gerçek mobil tarayıcıda i18n + offline test
- [ ] **5.3** Android cihazda APK testi (Capacitor sonrası)

---

## Çevirilecek metin envanteri (Faz 1.1 referansı)

| Anahtar | TR | Konum |
|---|---|---|
| `app.title` | Wall Jumper — Tek Tuş | `<title>` |
| `start.title_main` | WALL | `.title` |
| `start.title_accent` | JUMPER | `.title span` |
| `start.tagline` | tek tuşla zıpla · engellerden kaç | `.tagline` |
| `start.best_label` | EN YÜKSEK | `.best-label` |
| `start.recent_label` | Son skorlar | `.recent-label` |
| `start.recent_empty` | henüz skor yok — ilk denemen olsun | `main.js` |
| `start.btn` | BAŞLA | `#start-btn` |
| `start.btn_hint` | ekrana dokun | `.tap-btn-hint` |
| `gameover.title` | OYUN BİTTİ | `.go-title` |
| `gameover.score_label` | SKOR | `.score-cell .cell-label` |
| `gameover.best_label` | REKOR | `.score-cell.best .cell-label` |
| `gameover.new_best` | YENİ REKOR | `#new-best-badge` |
| `gameover.retry` | TEKRAR | `#retry-btn` |
| `gameover.home` | ANA MENÜ | `#home-btn` |

engellerin düzeni geçilmeyecek şekilde denk gelmemesinin hesaplanıp randomize edilmesi
coinin yaprak ve ağaç kabuğu (kilometre taşıyla alınan uniq birim) birimine dönüştürülmesi