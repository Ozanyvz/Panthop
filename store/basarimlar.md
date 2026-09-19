# Play Games / Game Center basarim listesi

Oyundaki 32 basarimin tamami. Play Console ve App Store Connect'te bunlari
elle olusturacaksin; **Yerel ID** sutunu koddaki karsiligi, olusturduktan
sonra platformun verdigi ID'yi ilgili haritaya yazacagiz:

- Play Games -> `js/services/providers/playgames.js` icindeki `LOCAL_TO_PLAY`
- Game Center -> `js/services/providers/gamecenter.js` icindeki `LOCAL_TO_GC`
  (onerilen GC ID bicimi: `panthop.<yerel_id>`)

> Bu dosya `node tools/dump-achievements.mjs` ile uretildi; basarim tanimlari
> degisirse yeniden uret.
>
> **Ikonlar:** her iki konsol da basarim basina 512x512 PNG istiyor.
> `npm run store:achievements` bunlari `store/achievement-icons/` altina
> yazar -- 32 dosya, grup basina bir gorsel, asagidaki tabloyla ayni sirada
> numaralanmis. Eslesme listesi o klasordeki INDEX.md'de.

| # | Yerel ID | Grup | Ad (TR) | Aciklama (TR) | Ad (EN) | Odul |
|---|---|---|---|---|---|---|
| 1 | `ms_25` | TIRMANIS | Ilk 25 | Tek bir kosuda 25 skora ulas. | First 25 | 1 yaprak |
| 2 | `ms_50` | TIRMANIS | Ilk 50 | Tek bir kosuda 50 skora ulas. | First 50 | 2 yaprak |
| 3 | `ms_100` | TIRMANIS | Ilk 100 | Tek bir kosuda 100 skora ulas. | First 100 | 4 yaprak |
| 4 | `ms_200` | TIRMANIS | Ilk 200 | Tek bir kosuda 200 skora ulas. | First 200 | 6 yaprak |
| 5 | `ms_350` | TIRMANIS | Ilk 350 | Tek bir kosuda 350 skora ulas. | First 350 | 8 yaprak |
| 6 | `ms_500` | TIRMANIS | Ilk 500 | Tek bir kosuda 500 skora ulas. | First 500 | 10 yaprak |
| 7 | `ms_750` | TIRMANIS | Ilk 750 | Tek bir kosuda 750 skora ulas. | First 750 | 12 yaprak |
| 8 | `ms_1000` | TIRMANIS | Ilk 1000 | Tek bir kosuda 1000 skora ulas. | First 1000 | 14 yaprak |
| 9 | `smash_10` | PARCALAMA | 10 Engel | Toplam 10 engeli parcala. | 10 Obstacles | 40 kabuk |
| 10 | `smash_30` | PARCALAMA | 30 Engel | Toplam 30 engeli parcala. | 30 Obstacles | 120 kabuk |
| 11 | `smash_75` | PARCALAMA | 75 Engel | Toplam 75 engeli parcala. | 75 Obstacles | 320 kabuk |
| 12 | `smash_150` | PARCALAMA | 150 Engel | Toplam 150 engeli parcala. | 150 Obstacles | 4 tuy |
| 13 | `smash_300` | PARCALAMA | 300 Engel | Toplam 300 engeli parcala. | 300 Obstacles | 8 tuy |
| 14 | `smash_600` | PARCALAMA | 600 Engel | Toplam 600 engeli parcala. | 600 Obstacles | 14 tuy |
| 15 | `runs_5` | TURLAR | 5 Tur | Toplam 5 tur oyna. | 5 Runs | - |
| 16 | `runs_25` | TURLAR | 25 Tur | Toplam 25 tur oyna. | 25 Runs | - |
| 17 | `runs_100` | TURLAR | 100 Tur | Toplam 100 tur oyna. | 100 Runs | - |
| 18 | `runs_500` | TURLAR | 500 Tur | Toplam 500 tur oyna. | 500 Runs | - |
| 19 | `jumps_50` | ZIPLAMALAR | 50 Ziplama | Toplam 50 kez zipla. | 50 Jumps | - |
| 20 | `jumps_250` | ZIPLAMALAR | 250 Ziplama | Toplam 250 kez zipla. | 250 Jumps | - |
| 21 | `jumps_1000` | ZIPLAMALAR | 1000 Ziplama | Toplam 1000 kez zipla. | 1000 Jumps | - |
| 22 | `jumps_5000` | ZIPLAMALAR | 5000 Ziplama | Toplam 5000 kez zipla. | 5000 Jumps | - |
| 23 | `time_600` | OYUN SURESI | 10dk Oyun Suresi | Toplam 10dk boyunca oyna. | 10m Played | - |
| 24 | `time_1800` | OYUN SURESI | 30dk Oyun Suresi | Toplam 30dk boyunca oyna. | 30m Played | - |
| 25 | `time_3600` | OYUN SURESI | 1sa Oyun Suresi | Toplam 1sa boyunca oyna. | 1h Played | - |
| 26 | `time_10800` | OYUN SURESI | 3sa Oyun Suresi | Toplam 3sa boyunca oyna. | 3h Played | - |
| 27 | `time_36000` | OYUN SURESI | 10sa Oyun Suresi | Toplam 10sa boyunca oyna. | 10h Played | - |
| 28 | `runtime_30` | HAYATTA KALMA | 30sn Hayatta Kalma | Tek bir kosuda 30sn boyunca hayatta kal. | 30s Survived | - |
| 29 | `runtime_60` | HAYATTA KALMA | 1dk Hayatta Kalma | Tek bir kosuda 1dk boyunca hayatta kal. | 1m Survived | - |
| 30 | `runtime_120` | HAYATTA KALMA | 2dk Hayatta Kalma | Tek bir kosuda 2dk boyunca hayatta kal. | 2m Survived | - |
| 31 | `runtime_300` | HAYATTA KALMA | 5dk Hayatta Kalma | Tek bir kosuda 5dk boyunca hayatta kal. | 5m Survived | - |
| 32 | `musician` | SIRLAR | Muzisyen | Ard arda 6 ziplamayi ayni ritimde tuttur. | Musician | - (gizli) |

Toplam: **32** basarim.
