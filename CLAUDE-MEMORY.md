# Claude hafıza yedeği — Panthop projesi

> Bu dosya, Claude'un bu projedeki kalıcı hafızasının dışa aktarımıdır.
> Hafıza makine-yereldir (`~/.claude/projects/<proje>/memory/`) ve OneDrive/git ile senkronlanmaz.
>
> **Başka bilgisayarda kullanım:** Claude'a şunu yaz:
> "CLAUDE-MEMORY.md dosyasındaki hafıza kayıtlarını kalıcı hafızana aktar — her bölümü kendi dosya adıyla memory klasörüne yaz ve MEMORY.md indeksini oluştur."
>
> Son güncelleme: 2026-07-14

---8<--- dosya: MEMORY.md ---

```markdown
- [Kendin screenshot alıp kontrol etme](feedback_no_self_screenshots.md) — UI değişikliklerinde headless render/SS ile kendi doğrulama yapma; değişikliği yap, kullanıcı SS verir; aşırı kontrolden kaçın
- [Dil seçici ayarlar ekranında](feedback_lang_selector.md) — dil seçimi Ayarlar'a taşındı, liste olarak; eski toggle/dropdown kuralı geçersiz
- [Üç para birimi ekonomisi + sekmeli upgrade](project_economy.md) — kabuk 🪵 (skor) / yaprak 🍃 (milestone→Sprint) / tüy 🪶 (engel parçalama→Odaklanma); gelişim ekranı sekmeli; **ECONOMY.md (repo kökü) her ekonomi değişikliğinde güncellenir**
- [Başarımlar ekranı](project_achievements.md) — kareli ızgara + toplanabilir ödüllü modal; yaprak artık otomatik değil buradan toplanır, engel kademeleri karışık kabuk/tüy
- [Pixel fontlar + ASCII kuralı](project_pixel_fonts.md) — Press Start 2P (başlık) + VT323 (gövde), yerel gömülü; tr.json TAM ASCII, yeni metinde Türkçe karakter koyma
- [Google servisleri (AdMob + Play Games)](project_google_services.md) — servis katmanı facade'i (js/services/), registerPlugin+importmap, oyun sonu kabuk 2x reklamı, başarım aynalama; Saved Games ertelendi; release öncesi gerçek ID TODO'ları
- [Pixel-art SVG ikon sistemi](project_icons.md) — tüm emoji yerel SVG ile değişti (.gi/.gi-* + iconHTML); tools/gen-icons.mjs ASCII-ızgaradan üretir; cihaz uyumu için, yeni ikon eklerken bu yöntemi kullan, emoji koyma
- [Ses sistemi](project_audio.md) — js/audio.js tek giriş; SFX WebAudio + müzik HTMLAudio; 4 kademeli oyun müziği (skor 50/100/150, zorluk rampasıyla senkron); Ayarlarda ANA SES + 3 kanal; score-tick & ambient bilerek kullanılmıyor
- [iOS/App Store sureci](project_ios_appstore.md) - Mac mini'de Xcode build; package.json+BUILD.md iOS hazir; Developer uyeligi/AdMob iOS ID/Game Center ID'leri acik
- [Hafıza yedeği CLAUDE-MEMORY.md](feedback_memory_export.md) — repo kökündeki dosya hafızanın dışa aktarımı; hafıza her değiştiğinde yeniden üret (kullanıcı diğer bilgisayarda içe aktarıyor)
- [AutoSprite MCP](reference_autosprite.md) — Pantho karakter ID + üretim maliyetleri + prompt dersleri (tek karakter vurgusu, ölüm=düşme, koşu=tüm gövde); tüm sheet'ler yeni stilde, land dahil bağlı
```

---8<--- dosya: feedback_lang_selector.md ---

```markdown
---
name: feedback-lang-selector
description: "Panthop (SimpleOneTap) dil seçici artık ayarlar ekranında liste — eski başlangıç ekranı toggle/dropdown kuralı geçersiz"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e34b1a73-db2b-4265-aa6f-5de30a4a4108
---

Panthop (SimpleOneTap) projesinde dil seçimi **ayarlar ekranına (`#settings-screen`) taşındı** ve orada her desteklenen dil için seçilebilir satır listesi (`#lang-options` → `renderLangOptions()` in [js/main.js](js/main.js)) olarak render ediliyor. Liste her dil sayısına ölçeklenir.

**Why:** Kullanıcı ayrı bir ayarlar UI'ı istedi ve dil seçimini oraya almayı tercih etti (aynı ekranda ilerleme sıfırlama da var). Başlangıç ekranının sağ üstündeki eski TR/EN toggle butonu kaldırıldı; yerine ayarlar dişlisi (`#settings-btn .corner-btn`) kondu.

**How to apply:**
- Eski "2 dilde toggle, 3+ dilde dropdown" kuralı ARTIK GEÇERSİZ — başlangıç ekranında dil butonu yok. Dropdown/toggle popover kodu (`openLangMenu`, `handleLangToggleClick`, `isDropdownMode`, `.lang-menu`/`.lang-toggle`) tamamen silindi.
- Yeni dil eklemek: sadece `js/i18n.js` `SUPPORTED` listesine ekle + `i18n/<kod>.json` oluştur; ayarlar listesi otomatik yeni satır gösterir, ek UI işi yok.
- Dil tercihi (`wj_lang_v1`) bir ayardır, ilerleme değil — `resetProgress()` onu SİLMEZ.
- İlgili: [[feedback-tree-bark-leaf-economy]]
```

---8<--- dosya: feedback_memory_export.md ---

```markdown
---
name: feedback-memory-export
description: CLAUDE-MEMORY.md (repo kökü) hafızanın dışa aktarımı — hafıza her değiştiğinde yeniden üretilmeli
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1e928844-398f-4612-8a1f-f12e3695be59
---

Repo kökündeki `CLAUDE-MEMORY.md`, bu makine-yerel hafıza klasörünün dışa aktarımıdır (her hafıza dosyası kendi adıyla fenced markdown blok içinde).

**Why:** Kullanıcı birden fazla bilgisayarda çalışıyor; hafıza `~/.claude/` altında olduğundan OneDrive/git ile senkronlanmıyor. Diğer makinede bu dosyayı Claude'a verip hafızayı yeniden kurduruyor.

**How to apply:** Hafızaya kayıt eklediğinde/güncellediğinde/sildiğinde `CLAUDE-MEMORY.md`'yi de yeniden üret (tüm memory/*.md dosyalarını başlık + ```markdown blokları halinde birleştir, "Son güncelleme" tarihini güncelle). Başka makinede içe aktarma talimatı dosyanın başında yazıyor.
```

---8<--- dosya: feedback_no_self_screenshots.md ---

```markdown
---
name: feedback_no_self_screenshots
description: Gorsel/UI degisikliklerinde kendin screenshot/headless render alip dogrulama; kullanici SS verir
metadata:
  type: feedback
---

UI/gorsel degisikliklerde **kendi basina ekran goruntusu uretip kontrol etme** (headless Chrome, sharp render, vb. yapma). Degisikligi yap, neye bakilmasi gerektigini kisaca yaz, kullanici ekran goruntusunu kendi alip verir.

**Why:** Kullanici tekrar tekrar screenshot alip incelememden rahatsiz oldu ("cok fazla kontrol yapiyorsun", "screenshot olusturup kontrol etmeyi birak"). Asiri dogrulama yavas ve gereksiz.

**How to apply:** Tek hamlede degisikligi uygula + dist build + "su ekranda suna bak" de, dur. Dogrulamayi kullaniciya birak. Ayni sey genel olarak asiri kontrol/iterasyon icin de gecerli — kisa tut.
```

---8<--- dosya: project_achievements.md ---

```markdown
---
name: project-achievements
description: "Panthop Başarımlar (achievement) ekranı — kareli ızgara + toplanabilir ödüllü modal"
metadata:
  type: project
---

Panthop'a Başarımlar ekranı eklendi ([js/achievements.js](js/achievements.js) katalog + mantık, UI [js/main.js](js/main.js), stil [css/style.css](css/style.css)). Başlangıç ekranı sol-üst köşesinde 🏆 butonu (`#achievements-btn`, `.corner-left-wrap`), toplanabilir ödül varsa sayı rozeti (`pendingCount()`).

**Tasarım:** Gruplu kareli ızgara (`.ach-tile`). Kilitli = gri/pasif (`🔒`). Açık = grup renkli. Toplanmamış ödül = altın parıltı + köşede ★ yıldız. Tıklayınca modal (`#ach-modal-overlay`): madalya + ad + açıklama + (kilitliyse) ilerleme çubuğu + ödül kutusu + TOPLA butonu (`collectAchievement`).

**Dört başarım ailesi** (`ACH_GROUPS`: milestone, smash, runs, jumps):
- **Kilometre taşı (milestone)** — `MILESTONES`'a 1:1. Unlock = `getReachedMilestones()`. Ödül = o milestone'un `LEAF_REWARDS` yaprağı. **Yaprak artık SADECE buradan toplanır** (oyun sonu otomatik vermeyi kaldırdık — bkz. [[project-economy]]).
- **Engel parçalama (smash, kademeli)** — ömür boyu `getSmashTotal()` (`wj_smash_total_v1`, `registerSmashes` içinde bankalanır). Kademeler 10/30/75/150/300/600. **Karışık ödül:** erken 3 kademe kabuk 🪵 (40/120/320), ileri 3 kademe tüy 🪶 (4/8/14).
- **Tur (runs) & Zıplama (jumps)** — 2026-06-07 eklendi, **ÖDÜLSÜZ** (`reward:null`, sadece rozet; ileride ödül eklenebilir). `wj_runs_total_v1` (`addRun()` her `handleGameOver`'da) kademeler 5/25/100/500; `wj_jumps_total_v1` (`addJumps(runJumps)`; `runJumps` `onJump` callback'iyle artar — game.js `onPressEnd` her zıplamada çağırır) kademeler 50/250/1000/5000. Renk tonu: runs yeşil, jumps mor.

**Ödülsüz başarım davranışı** (`reward:null`): hiç collectible/yıldız olmaz, badge'i etkilemez. `renderAchModal` null reward'da ödül kutusunu gizler; durum: kilitliyse KILITLI, açıksa ödülsüz → `achievements.unlocked` ("ACILDI"). `achievementState` grup→sayaç eşlemesi: milestone=best, smash=smashTotal, runs=runsTotal, jumps=jumpsTotal.

**Veri:** Unlock durumu TÜRETİLİR (ayrı flag yok); sadece toplanan ödül seti saklanır (`wj_ach_collected_v1`, `getCollectedAchievements`/`markAchievementCollected`). `resetProgress` ikisini de siler.

**Dikkat — eski kayıtlar:** Bu güncellemeden önce milestone geçmiş oyuncularda o milestone'lar "reached" ama "collected" değil → açılışta toplanabilir görünür, yaprağı bir kez daha (retroaktif) alırlar. v0.1 için kabul edildi.

**Oyun sonu "BAŞARIM AÇILDI" çerçevesi:** o turda yeni açılan TÜM başarımları rozet olarak gösterir — milestone (★ "İLK 25!") + smash kademeleri (💥 "10 Engel", turuncu `.ms-smash`). Smash tespiti `handleGameOver`'da `registerSmashes` etrafında `getSmashTotal()` önce/sonra alınıp `newlyUnlockedSmashAchievements(prev,new)` ile yapılır. Render `renderUnlockedAchievements(newMilestones, newSmashAch)` (eski `renderMilestones` yerine), reveal bayrağı `ctx.hasAch`. Çerçevede ayrıca `#go-ach-btn` butonu (🏆, `gameover.view_achievement`, YENİ rozeti) → Başarımlar ekranını açar (`showAchievementsScreen`). Yaprak miktarı/sayaç artık oyun sonunda gösterilmez (`leafEarnedEl`/`leaf-earned` kaldırıldı). Dokun-geç istisna listesinde `#go-ach-btn` var.

i18n: `achievements.*` (tr/en), oyun sonu `gameover.achievement_unlocked` + `gameover.view_achievement`.
```

---8<--- dosya: project_audio.md ---

```markdown
---
name: project_audio
description: "Ses sistemi — js/audio.js tek giris noktasi, SFX WebAudio + muzik HTMLAudio, 4 kademeli oyun muzigi, ayarlarda sessize-al"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1e928844-398f-4612-8a1f-f12e3695be59
---

Oyuna tum sesler eklendi (2026-06-14). Tek giris noktasi `js/audio.js`:
- **SFX**: Web Audio API (decode edilmis buffer'lar, dusuk gecikme, ust uste binme). `audio.sfx(name)`.
- **Muzik**: HTMLAudioElement (akis + JS volume crossfade, MUSIC_VOL 0.5). `playMusic`, `stopMusic`, `gameTier(score)`.
- **Ambiyans**: `ambient.wav` ayri loop'ta, HER YERDE surekli calar (menu + oyun + oyun sonu), muzik track'inden bagimsiz. unlock'ta baslar (AMBIENT_VOL 0.45).
- **Unlock**: tarayici autoplay kilidi -> AudioContext suspended olusturulur, ilk pointer/key/touch hareketinde resume + ambiyans + bekleyen muzik baslar.
- Dosyalar `assets/sfx/` altinda: SFX `.wav`, muzik `.mp3`. SFX map'inde `land` -> [land.wav, land2.wav] rastgele varyant.

**Oyun muzigi 4 kademe** (engel-tempo bantlariyla eslesir): `gameTier(score)` -> skor >=150 g4, >=100 g3, >=50 g2, yoksa g1 (2026-07-10: zorluk rampasi ~200 skora yayildi — game.js SPACING_SHRINK_PER_SCORE 0.005 / MIDAIR_CHANCE_GROWTH 0.0015 — muzik esikleri rampanin ceyrek noktalari; rampa degisirse ikisini birlikte guncelle). Menude `bgm-menu`. Oyun sonu `stopMusic()` + stinger'lar.

**4 surekli ses kanali** (2026-07-14: `master` eklendi — diger ucu carpan ana ses, tek yerden kapatma; `eff(ch)=vol[ch]*vol.master` audio.js icinde, applyChannel('master') uc kanali yeniden uygular; ayarlarda en ustte ANA SES/MASTER satiri): `master` / `sfx` / `music` / `ambient`, her biri 0..1 volume. API `audio.getVolume(ch)` / `audio.setVolume(ch,v)` / `audio.isOn(ch)` / `audio.setEnabled(ch,on)`. SFX kanali masterGain'de (SFX_MASTER*vol.sfx), muzik & ambiyans kendi HTMLAudio volume'unde. Her kanal hem mevcut degeri (`wj_vol_*_v2`) hem son sifir-olmayan degeri (`wj_volmem_*_v2`) saklar: off->on toggle kaldigi % degerinden devam eder. Migrate: eski 0..4 step (`wj_vol_*_v1`) ve `wj_muted_v1`'den.

**Ayarlar SES UI** (main.js renderAudioLevels, `#audio-levels`): her kanal satiri = etiket + on/off toggle switch (`.audio-switch`); slider (`<input type=range>` `.audio-slider`, --pct ile dolum + `.audio-pct` yuzde) SADECE on iken gorunur. Toggle off -> 0 + slider gizli; on -> hatirlanan %'den slider geri gelir. Slider'i 0'a surukleyince release'te (change) toggle off'a doner. i18n: settings.sound/sfx/music/ambient. [[feedback_lang_selector]] ile ayni ekran. NOT: i18n anahtarlari SW i18n cache'i (stale-while-revalidate) yuzunden eski surumde "SETTINGS.SFX" gorunebilir; SW VERSION bump'i eski i18n cache'ini silip duzeltir.

**Tetikleme**: oynanis sesleri game.js icinde dogrudan (jump/land/sprint/death/dodge/smash + sprint-charge loop). UI/odul/oyun-sonu sesleri main.js icinde. Genel buton tap'i capture-phase delegated listener (`SFX_OWN_CLICK` ile kendi sesi olanlar haric: upg-buy, tab'lar, ach-tile, ach-modal-collect, reward-2x, confirm-yes).

SW VERSION wj-v44, `js/audio.js` shell precache'te. Kaynak duzenlenir, `npm run build` dist'i uretir.

**Bilerek kullanilmayan**: sadece `score-tick.wav` (her +1, jump sesiyle cakisir). `ambient.wav` artik her yerde loop calar.
```

---8<--- dosya: project_economy.md ---

```markdown
---
name: feedback-tree-bark-leaf-economy
description: Panthop üç para birimi (kabuk 🪵 / yaprak 🍃 / tüy 🪶) + sekmeli upgrade ekranı
metadata: 
  node_type: memory
  type: project
  originSessionId: 1e928844-398f-4612-8a1f-f12e3695be59
---

Panthop'ta üç para birimi var, gelişim ekranında her biri ayrı **sekme**:
- **Ağaç kabuğu (🪵)** — eski "coin". Skordan kazanılır. `wj_coins_v1`. Tab her zaman açık.
- **Yaprak (🍃)** — milestone ödülü. `wj_leaves_v1`. Her milestone ilk geçilince `LEAF_REWARDS=[1,2,4,6,8,10,12,14]`. **ARTIK oyun sonunda OTOMATİK VERİLMEZ** → Başarımlar ekranından elle toplanır (bkz. [[project-achievements]]). `pushScore` yaprağı eklemez, sadece milestone'u "reached" işaretler. Oyun sonu milestone çerçevesi "BAŞARIM AÇILDI" gösterir. Tab her zaman açık.
- **Tüy (🪶)** — `wj_feathers_v1`. **Drop mekaniği ZAR bazlı (2026-06-07):** öldürülen her kuş (saw engeli) için **0–100 tamsayı zar** (`Math.floor(Math.random()*101)`) atılır; zar **eşik ve altı** ise +1 tüy. Eşik = `featherDropPercent()` = `FEATHER_DROP_PCT_BY_LEVEL=[20,35,50,75]` (featherLuck sv). Baz **20**. Eski "3 kuşta 1 tüy" KALDIRILDI (`registerSmashes` artık sadece ömür-boyu smash sayacını günceller, tüy vermez). Yuvarlama main.js `registerKill()`'de (`runFeatherChance` startGame'de snapshot, `onSwordSlash`+`onSprintSmash`'te çağrılır), `runFeathers` → `handleGameOver`'da `addFeathers`. Tüy çipi/sekmesi **Bilenmiş Pençe (sword) VEYA Pençe Bileme (sprintSmash) alınınca** görünür (`featherUnlocked()`, main.js). **Tüy harcama yerleri (feather upgrade'leri):** `featherLuck` (Şanslı Tüy, 50/100/200 → şans %35/%50/%75), `dodge` (Kaçış — 2026-07-14'te TEK HATTA birleşti: 4 kademe 2/5/8/10 hak, 25/50/100/150 tüy; `dodgeCount` SİLİNDİ). **Sonsuz sekmesi (2026-07-14):** Kaçış/Bilenmiş Pençe max olunca `infinity` sekmesi açılır (upgrades.js INFINITY_UPGRADES + isMaxed/infinityAvailable/tryPurchaseInfinity; storage wj_inf_<id>_v1; main.js movedToInfinity → maxlanan yetenek eski sekmesinden kalkar, sadece Sonsuz'da). Sınırsız +1 hak: pençe 1000🪵, kaçış 100🪶. İkon: gen-icons.mjs 'infinity' (altın ∞).

**ECONOMY.md (repo kökü, 2026-07-13):** Tüm ekonominin özet/denge referans dosyası — para birimleri, kazanç oranları, gelişim maliyet/etkileri, başarım ödülleri, denge durumu + değişiklik günlüğü. **Kullanıcı istegi: ekonomiye dokunan HER değişiklikte (fiyat, ödül, kademe, oran) bu dosya da güncellenecek.** Dengeleme konuşmaları bu dosya üzerinden yürür.

**Güncel denge notları (2026-07-13):** Sprint Primi 5 kademe, %20'şer şansla +2 skor, kademe başı 2🍃 (snapshotModifiers alanı `sprintJumpBonus`→`sprintBonusPct`). **Bilenmiş Pençe (sword, 🪵) klasik:** koşu başına 2/5/8/10 pençe (4 kademe, 150/300/800/2000). **Pençe Bileme (id `sprintSmash`, 🍃) yeni mekanik:** ESKİ "sprint bedava parçalar" etkisi KALKTI; artık 5 kademe (4🍃/kademe), sprint şarjı her dolduğunda %20/40/60/80/100 şansla +1 pençe → Bilenmiş Pençe stoğuna eklenir (`smashChancePct`, game.js `_rollSwordGrant` sprintReady anında; onSwordCharges(n, gained) ikinci arg chip bump). Pençeler birikir, zıplamayla silinmez, kuş engeline değince harcanır — kuş kesiminin TEK yolu pençe. Engel parçalama +1 skor da kalktı (SPRINT_SMASH_SCORE/onSprintSmash silindi). Zorluk rampası ~200 skorda tavan (game.js SPACING_SHRINK_PER_SCORE/MIDAIR_CHANCE_GROWTH), müzik 50/100/150. Yaprak ağacı toplamı 49 (gelir 57).

**Why:** Kullanıcı tek "coin"i kademeli olarak üç birimlik bir ilerleme ekonomisine böldü; her birim farklı bir oynanış eylemine bağlı (skor / milestone / engel parçalama).

**How to apply:**
- **Sprint ağacı (yaprak)** [js/upgrades.js](js/upgrades.js): hold-to-sprint başta KAPALI. `sprint` (parent, 1 yaprak) → açar; alınmadan `sprintBonus` (2y, +2 skor), `sprintSmash` (4y, engel parçalama) & `sprintSpeed` (Odaklanma) GİZLİ. Sprint UI gating [js/game.js](js/game.js) `snapshotModifiers()` → `sprintEnabled/sprintHoldTime/sprintJumpBonus/sprintSmash`.
- **Odaklanma = `sprintSpeed`, tekrar YAPRAK birimi** (2026-06-07'de tüy'den geri taşındı). Sprint ağacında; `currency:'leaf'`, `maxLevel 3`, `costs [4,6,8]`, şarj süresi 2s→1.5→1→0.5 (`SPRINT_HOLD_BY_LEVEL`). `requires:'sprint'`, `showWhenLocked` YOK → sprint alınmadıysa kardeşleri gibi GİZLİ.
- **Boş sekme gizleme:** `tabHasUpgrades(currency)` [js/main.js](js/main.js) — o birime ait hiç upgrade yoksa sekme render edilmez. (Artık feather sekmesinin içeriği var, sword alınınca görünür.)
- **Dodge (kaçış) mekaniği** (2026-06-07): `dodge` upgrade'i tüy ile alınınca run başına kaçış hakkı verir. [js/upgrades.js](js/upgrades.js) `dodgeChargesPerRun()` = `DODGE_TOTAL_BY_LEVEL=[10,15,20,25]` (index=dodgeCount sv) → `snapshotModifiers().dodgeCharges`. [js/game.js](js/game.js): `reset()` `this.dodgeCharges` set + `onDodgeCharges` callback; `_checkWallCollisionAt` bir **dal (wall engeli)** çarpışmasında dodgeCharges>0 ise `_die()` yerine kaçışı harcar, `o.dodged=true`+`o.mesh.visible=false` (her-kare climb kontrolü tekrar tetiklemesin), `onDodge` callback. `_addWallObstacle` `o.dodged=false`+`visible=true` reset eder. HUD'da sword çipi gibi `#dodge-chip` (🛡️), `setDodgeHUD`/`bumpDodgeChip`.
- Upgrade def'leri `currency:'coin'|'leaf'|'feather'` + opsiyonel `requires`/`showWhenLocked`. `tryPurchase`/`canAfford`/`balanceFor` doğru birimi kullanır (`spend{Coins,Leaves,Feathers}`). Buy butonu birime göre 🪵/🍃/🪶.
- Sekme mantığı [js/main.js](js/main.js): `UPG_TABS`, `activeUpgTab`, `tabUnlocked`, `availableCount` (sekme rozeti = o an alınabilir upgrade sayısı), `upgHidden` (gizli vs kilitli-önizleme ayrımı), `renderUpgTabs`/`renderUpgradesList` (aktif sekmeye göre filtre).
- Tüy sayacı: `runSmashes` main.js'te `onSwordSlash`+`onSprintSmash` ile artar, `handleGameOver`'da `registerSmashes` ile bankalanır.
- **Oyun sonu (2026-06-07 cüzdanlı reveal):** GAME OVER yazısının ÜSTÜNDE `.go-wallet` (kabuk/yaprak/tüy TOPLAMLARI; `.go-head` içinde başlıkla gruplu). Ayrı "TOPLANAN" kartı KALDIRILDI. Reveal ([main.js](js/main.js) `startGameOverReveal`): skor → milestone → **kabuk cüzdana sayarak girer** (`walletEarn`: `animateWalletValue` pre→total + yükselen `+N` `.gw-gain` `flashGain` + `.caught` bump; kabukta çarpan "x1.5" `+N` içinde) → **tüy cüzdana girer** → upgradeable buton → retry/home. Cüzdan baz değer = `total - oTurKazanılan` (hammadde `handleGameOver`'da zaten bankalanmış). `goRevealFinalize` skip'te toplamları finalize eder. Yaprak cüzdanda statik (oyun sonu yaprak vermez). Tüy slotu `featherUnlocked()||feather>0` ise görünür.
- **Oyun-içi HUD**: bu turda kazanılan tüyler `#feather-run-chip` (🪶) çipinde gösterilir; `registerKill`'de tüy düşünce `setFeatherRunHUD`+`bumpFeatherRunChip`, `startGame`'de 0'lanır. (sword/dodge çipleriyle aynı `.hud-chip` stili.)
- **GELECEK FİKİR (yapılmadı):** Bilenmiş Pençe / yeni mekanik alınınca gösterilecek **mini tutorial gif modalı** — kullanıcı istedi, ileride eklenecek.
- `resetProgress` tüm birim+ilerleme anahtarlarını siler (dil hariç).
- İlgili: [[feedback-lang-selector]]
```

---8<--- dosya: project_google_services.md ---

```markdown
---
name: project_google_services
description: AdMob odullu reklam + Play Games basarim aynalama; servis katmani mimarisi, registerPlugin+importmap yaklasimi, kalan TODO'lar
metadata:
  type: project
---

AdMob (odullu) + Google Play Games (basarim aynalama) entegre edildi. iOS sonradan eklenecegi icin **servis katmani (facade)** ile soyutlandi.

**Mimari:** Oyun kodu (main.js) sadece `js/services/ads.js` ve `js/services/achievements.js` facade'lerini cagirir; Google'a ozel kod `js/services/providers/` altinda izole (admob.js = android+ios ortak, playgames.js = android). Facade `globalThis.Capacitor` ile platform secip provider'i **dinamik import** eder. iOS gelince: `providers/gamecenter.js` ekle + achievements.js facade'inde `ios` dali zaten hazir. Web'de hicbir Google kodu yuklenmez (no-op).

**Bundler yok (native ESM + importmap):** Eklenti ESM'leri uzantisiz relative import kullaniyor, tarayicida cozulmez. Cozum: eklenti JS paketleri import EDILMEZ; sadece `@capacitor/core` vendorlanir (build.mjs → dist/vendor, index.html importmap) ve native koprude `registerPlugin('AdMob')` / `registerPlugin('CapacitorGameConnect')` kullanilir. **Why:** derlenmis plugin ESM'i vendorlamak kirilir. **How to apply:** yeni Capacitor plugin eklerken ayni desen — registerPlugin, vendorlama.

**Odullu 2x mantigi:** Oyun sonu `earned` kabuk (upgrade carpani dahil) zaten bankaya yazili; reklam izlenince `addCoins(earned)` ile ayni miktar tekrar verilir → tur kazanci tam 2x. Buton: #reward-2x-btn (i18n gameover.reward_2x).

**Paketler:** @capacitor-community/admob@8, capacitor-game-connect-7@7. Plugin metodlari: AdMob `prepareRewardVideoAd`/`showRewardVideoAd` + event `onRewardedVideoAdReward`; GameConnect `signIn`/`unlockAchievement({achievementID})`.

**Saved Games (bulut kayit) ERTELENDI:** Cap7 uyumlu+aktif tek plugin (game-connect-7) Snapshots desteklemiyor. localStorage ana kaynak kaliyor; ileride ya kucuk native Kotlin Snapshots sarici ya Firebase. Bkz [[project_economy]] [[project_achievements]].

**RELEASE ONCESI DOLDURULACAK TODO'lar (su an Google TEST id'leri):**
- AdMob gercek App ID → AndroidManifest.xml meta-data (su an test app id)
- Gercek odullu Ad Unit ID + `USE_TEST_ADS=false` → js/services/providers/admob.js
- Play Games achievement ID'leri → js/services/providers/playgames.js `LOCAL_TO_PLAY` haritasi (su an bos)
- Imza SHA-1 → Play Console Play Games Services config
```

---8<--- dosya: project_icons.md ---

```markdown
---
name: project_icons
description: Tum emoji ikonlar yerel pixel-art SVG ile degistirildi (.gi sistemi + gen-icons.mjs); yeni ikon eklerken bu yontemi kullan
metadata:
  type: project
---

Oyundaki TUM emoji ikonlar yerel pixel-art SVG'lerle degistirildi. **Neden:** emoji'ler cihaz sistem fontundan gelir; 🪵/🪶 (Emoji 13.0, 2020) Android 11 alti + eski iOS'ta tofu (kutu) gorunuyordu. Artik her cihaz/OS'ta birebir ayni.

**Sistem:**
- SVG kaynaklari: `assets/icons/game/*.svg` (19 ikon). ELLE DUZENLEME — `tools/gen-icons.mjs` icinde her ikon 16x16 ASCII-izgara + palet olarak tanimli; `node tools/gen-icons.mjs` (veya `npm run icons:svg`) ile uretilir. `npm run build` bunu otomatik calistirir.
- CSS: `.gi` + `.gi-<key>` ([css/style.css]) — boyut = holder'in `font-size`'i (1em), `image-rendering:pixelated`, vektor.
- JS helper: [js/icons.js] — `iconHTML(key)` (innerHTML sablonlari icin), `currencyIcon(currency)`, `CURRENCY_ICON` map.

**Kullanim kuralı (yeni ikon eklerken):**
1. `tools/gen-icons.mjs`'e ASCII-izgara ekle, uret.
2. `css/style.css`'e `.gi-<key>{background-image:url(../assets/icons/game/<key>.svg)}` ekle.
3. Statik HTML'de `<span class="gi gi-<key>" aria-hidden="true"></span>`; dinamik JS'de `iconHTML('<key>')`.
4. ASLA yeni emoji koyma (ASCII kuralina paralel — bkz [[project_pixel_fonts]]).

**Onemli detay:** `flyToWallet` artik `textContent` degil `innerHTML` kullaniyor (ikon HTML'i ucan jetonlarda render olsun diye); ach-modal-icon da `innerHTML`. Tum `text` degerleri uygulama kontrollu, guvenli.

Ikon anahtarlari: bark/leaf/feather (para), lock claw shield moon wind spark burst focus clover plus flag gamepad jump trophy gear tv. coinMult upgrade'i 'bark'i yeniden kullanir. Reklam butonu 'tv' kullanir (bkz [[project_google_services]]).
```

---8<--- dosya: project_ios_appstore.md ---

```markdown
---
name: project-ios-appstore
description: "iOS/App Store yayin sureci basladi; kullanicinin Mac mini'si var, build orada yapilacak"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1ff4720d-1bd3-4a5e-8d54-32fd8f7d00c2
---

App Store yayini icin calisma Temmuz 2026'da basladi. Kullanicinin bir **Mac mini**'si var — iOS build'leri bulut CI yerine orada Xcode ile yapilacak. Nisan 2026 sonrasi gonderimler Xcode 26 / iOS 26 SDK gerektirir.

Hazirlik (Windows tarafinda yapildi): package.json'a @capacitor/ios + cap:add:ios / cap:open:ios / cap:assets:ios scriptleri eklendi; BUILD.md'ye tam iOS/App Store bolumu yazildi (Game Center capability, AdMob iOS App ID + ATT + SKAdNetworkItems, App Store Connect adimlari, EU DSA trader beyani, 6.9" screenshot zorunlulugu).

Acik konular: Apple Developer Program uyeligi ($99/yil) henuz teyit edilmedi; AdMob'da ayri iOS uygulamasi olusturulacak; Game Center leaderboard/achievement ID'leri [[project-google-services]] aynasi olarak tanimlanip servis katmanindaki iOS TODO'larina yazilacak; capacitor-game-connect-7@7.0.5 Cap 7 ile uyumlu (plugin'in yeni major'i Cap 8 ister — upgrade etme).
```

---8<--- dosya: project_pixel_fonts.md ---

```markdown
---
name: project-pixel-fonts
description: "Panthop pixel font kurulumu (Press Start 2P + VT323) ve ASCII-only Turkce metin kurali"
metadata:
  type: project
---

Panthop UI fontlari pixel/8-bit. İki katman, [css/style.css](css/style.css) en basta `@font-face` + `:root` degiskenleri:
- **`--font-display: 'Press Start 2P'`** — basliklar, kisa etiketler, primary buton, buyuk skor sayilari. CSS'in EN SONUNDAKİ "Pixel typography" blogunda secili oğelere uygulanir (boyutlar PSP genis oldugu icin kucultuldu, letter-spacing kisildi → tasma onlendi).
- **`--font-body: 'VT323'`** — `body`'de temel font; geri kalan tum metin (aciklamalar, listeler, modallar).
- Fontlar **yerel gomulu**: `assets/fonts/pressstart2p.woff2` + `vt323.woff2` (Google'dan latin alt-kumesi indirildi). `file://`/offline icin sart. SW precache'te (`SHELL_URLS`) + `build.mjs` `assets/` kopyalar.
- `body { font-synthesis: none }` → tek 400 agirlik var, sahte-bold blur'u engeller (eski `font-weight:900`'ler gorsel olarak no-op).

**ONEMLİ KURAL — Turkce metinde ASCII kullan:** Kullanici Turkce karakter istemiyor (font kapsam riski + tutarli render). [i18n/tr.json](i18n/tr.json) tamamen ASCII'ye cevrildi (s/c/g/i/o/u; cz→c degil → ç→c, ğ→g, ı/İ→i/I, ö→o, ş→s, ü→u). Tipografik isaretler de ASCII: ×→x, −/—→-, ·→/, ✓ kaldirildi. **Yeni tr.json metni eklerken Turkce karakter veya ozel tipografik isaret KOYMA** — yoksa pixel font yerine sistem fontuna duser. (en.json zaten ASCII.) HTML data-i18n varsayilanlari da ASCII'ye cevrildi. JS yorumlarindaki Turkce karakterler kaldi (render edilmiyor, onemsiz).

Boyut ince ayari gerekirse: PSP oğeleri style.css sonundaki blokta, govde VT323 sistem fontundan kucuk render eder.
```

---8<--- dosya: reference_autosprite.md ---

```markdown
---
name: reference-autosprite
description: "AutoSprite MCP baglantisi — Pantho karakter ID, maliyetler, prompt dersleri, animasyon uretim akisi"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 1e928844-398f-4612-8a1f-f12e3695be59
---

AutoSprite (autosprite.io) MCP sunucusu `~/.claude.json`'da kayitli (`autosprite`, HTTP, Bearer key — key repo'ya YAZILMAZ). Kullanici Pro abone (1500 kredi/ay). CLI `claude` PATH'te yok; MCP araclari oturum baslangicinda yuklenir, ara oturumda curl ile JSON-RPC `tools/call` da calisiyor (endpoint: https://www.autosprite.io/api/mcp, SSE yanit).

- **Pantho karakter ID: `cmrkjjd3a00kezumwlej60l65`** (pantho-512x512px.png'den upload_character ile, isHumanoid:false).
- **Kartal (dusman) karakter ID: `cmrkn1juw00gjv3sr0no7f0iy`** ("Eagle Enemy", create_character turbo ile promptdan). Sheet'leri: eagle-idle (hover flap loop, PAYLASIMLI doku — tum kuslar senkron canlanir, game.js _obsTime), eagle-scared (ayni hover korkmus yuzle; pence stoklu Pantho BIRD_FEAR_RANGE=2.5 icine girince kus basina doku takasi — ayni kare saatiyle sorunsuz gecis), eagle-death (KO; olen kus basina texture.clone ile bagimsiz oynar, _spawnDyingBird + dyingBirds listesi, BIRD_DEATH_SEC 0.7 dusme+solma). Pantho attack sheet'i (panther-attack.png): pence vurusunda ziplama sirasinda ATTACK_START/END_FRAME 8-11 arasi 0.3sn overlay.
- **Rename (2026-07-14, kullanici istegi):** 'saw' → 'bird' her yerde (obstacle kind/type, BIRD_HITBOX, makeSawTexture SILINDI → loadEagleAnimations). Eski isimler gelistirmeyi baltalamasin diye. BIRD_PLANE 1.35 (sheet doluluk telafisi, hitbox 0.58 degismedi).
- **Prompt dersi 3:** "vurulma/olme" animasyonlarinda model VURAN seyi (el, insan kolu!) cizebiliyor → "NOTHING else enters the frame: no hands, no people... struck by an INVISIBLE impact" vurgusu sart (kartal KO v1 bu yuzden cope gitti).
- Maliyet: generate_spritesheet turbo **5 kredi/animasyon**, generate_pose 3, regenerate_* ucretsiz. withSound KAPALI tut (oyunun kendi SFX'i var).
- Cikti formati bizimkiyle birebir: `spritesheet: { frameCount: 25, frameSize: 256 }` → 5x5 1280px sheet, direction "right".
- **Prompt dersleri:** (1) "Exactly ONE panther cub alone, single character, empty background" vurgusu SART — yoksa ikinci kedi halüsinasyonu. (2) "Yere yatma/olme" istenirse model ISRARLA ikinci yatan kedi cizer (2 deneme cope gitti) → cozum: olumu "havada baygin dusme" (free-fall tumble loop) olarak uretmek (kullanicinin fikri; oyun akisina da uygun — tirmanirken olunce asagi duser).
- Uretilmis sheet'ler: panther-charge (gergin comelme dongusu, 12fps), panther-death (baygin dusme dongusu, 12fps), panther-walk = ASLINDA KOSU dongusu (kind:run, tum govde hareketli — kullanici yuruyusu "sadece ayaklar oynuyor, yapay" diye reddetti; dosya/anim adi 'walk' kaldi), panther-jump v2, panther-land (2026-07-14 OYUNA BAGLANDI: STATE.LAND — inis sonrasi 0.5 sn grip duraklamasi, LAND_START_FRAME=5'ten oynar, tap aninda kesilir/zipla; death scale 1.2).
- **Sprint sheet'i SILINDI (2026-07-14, kullanici karari):** ayri sprint animasyonu yapay durdu (kafa kameraya sabit) → sprint = walk sheet'i SPRINT_MULT hizinda (eski mantik). Yeni kosu animasyonu istenirse "STRICT side view PROFILE, head looking right, never toward camera" vurgusu sart.
- Olcek hesabi: gorunur boyut esitleme = 1.3 × 0.58 / (sheet'in temsili hucresinin alpha-doluluk orani). Guncel: idle 1.25, walk 1.1, jump 1.08 (tutulan kare 12 ile olculdu), charge 1.05, death 0.95.
- Stil artik tutarli: tum sheet'ler chunky pixel (pantho-512 stili); eski soft-shaded walk/jump degistirildi.
```

