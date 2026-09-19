// Panthop achievement icon generator.
//
//   node tools/make-achievement-icons.mjs
//
// Play Games Services and Game Center both want one 512x512 PNG per
// achievement, uploaded by hand in their consoles. There are 32 achievements
// but only 7 pictures: the game already gives each achievement GROUP a single
// icon (js/achievements.js), so every tier in a group reuses its group's art.
// The files are still written one-per-achievement, named after the local id and
// numbered to match store/basarimlar.md, so the console upload is a straight
// walk down that table with no guessing which file belongs where.
//
// The source art is the same 16x16 pixel grid the game renders in its HUD
// (assets/icons/game/*.svg). It is upscaled with NEAREST neighbour so the
// pixels stay square — a smooth resize turns these into mush at 512.
//
// Locked/greyed variants are not needed: both platforms grey the icon out
// themselves. Output lands in store/achievement-icons/ (gitignored like the
// other store graphics; rerun this tool if the folder is missing).

import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME_ICONS = resolve(ROOT, 'assets/icons/game');
const OUT = resolve(ROOT, 'store/achievement-icons');

const SIZE = 512;         // both consoles ask for 512x512
const GRID = 16;          // the source SVGs are a 16x16 pixel grid
const ART_FRACTION = 0.62; // how much of the tile the pixel art fills

/* Same gradient as the app icon, so a row of achievements reads as one set. */
const GRAD = ['#62bbb5', '#46a77c', '#28934d'];

/* Achievement group -> the icon js/achievements.js gives it. Keep in step with
   that file: milestones carry a flag, smashes a burst, and so on. */
const GROUP_ICON = {
  milestone: 'flag',
  smash: 'burst',
  runs: 'gamepad',
  jumps: 'jump',
  time: 'hourglass',
  runtime: 'focus',
  secret: 'note',
};

/* Local ids, in the order store/basarimlar.md lists them. Mirrors the groups in
   tools/dump-achievements.mjs — if an achievement is added there, add it here. */
const GROUPS = [
  ['milestone', [25, 50, 100, 200, 350, 500, 750, 1000], (v) => `ms_${v}`],
  ['smash', [10, 30, 75, 150, 300, 600], (v) => `smash_${v}`],
  ['runs', [5, 25, 100, 500], (v) => `runs_${v}`],
  ['jumps', [50, 250, 1000, 5000], (v) => `jumps_${v}`],
  ['time', [600, 1800, 3600, 10800, 36000], (v) => `time_${v}`],
  ['runtime', [30, 60, 120, 300], (v) => `runtime_${v}`],
];

const gradientSvg = (S) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
     <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="${GRAD[0]}"/>
       <stop offset="52%" stop-color="${GRAD[1]}"/>
       <stop offset="100%" stop-color="${GRAD[2]}"/>
     </linearGradient></defs>
     <rect width="${S}" height="${S}" fill="url(#g)"/></svg>`);

/* The drawings do not fill their 16x16 viewBox and none of them sit in the
   middle of it — the flag, for one, lives in the upper right. Centring the grid
   would therefore centre the empty space, not the picture, and a console list
   of 32 lopsided tiles looks broken. So find the drawn pixels first and centre
   THAT box. */
function boundingBox(data, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('bos SVG');
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/* Render one group's art once: the SVG rasterised at its true 16x16 grid,
   cropped to the drawn pixels, then blown up by an INTEGER factor with nearest
   neighbour. Rendering straight to 512 would let the renderer antialias the
   pixel edges; a non-integer factor would make some pixels wider than others.

   Each step below is its own pipeline on purpose. sharp reorders operations
   within a single chain — a resize, an extract and a second resize together do
   not run in written order, and the crop silently lands on the wrong pixels
   (the tiles come out empty). Buffer between every step instead. */
const cache = new Map();
async function artFor(iconName) {
  if (cache.has(iconName)) return cache.get(iconName);
  const svg = readFileSync(resolve(GAME_ICONS, `${iconName}.svg`));

  // 1. rasterise the SVG down to its true 16x16 grid
  const grid = await sharp(svg, { density: 384 })
    .resize(GRID, GRID, { kernel: 'nearest' })
    .ensureAlpha().png().toBuffer();

  // 2. measure the drawn pixels
  const { data } = await sharp(grid).raw().toBuffer({ resolveWithObject: true });
  const box = boundingBox(data, GRID, GRID);

  // 3. crop to them
  const cropped = await sharp(grid).extract(box).png().toBuffer();

  // 4. blow up by an integer factor so every pixel stays the same square size
  const factor = Math.max(1, Math.floor((SIZE * ART_FRACTION) / Math.max(box.width, box.height)));
  const w = box.width * factor, h = box.height * factor;
  const buf = await sharp(cropped).resize(w, h, { kernel: 'nearest' }).png().toBuffer();

  cache.set(iconName, { buf, w, h });
  return cache.get(iconName);
}

async function tile(iconName, outPath) {
  const { buf, w, h } = await artFor(iconName);
  await sharp(gradientSvg(SIZE)).png()
    .composite([{ input: buf, left: Math.round((SIZE - w) / 2), top: Math.round((SIZE - h) / 2) }])
    .removeAlpha()          // consoles reject transparency on these too
    .png().toFile(outPath);
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const ids = [];
  for (const [group, values, mk] of GROUPS) {
    for (const v of values) ids.push({ id: mk(v), group });
  }
  ids.push({ id: 'musician', group: 'secret' });

  const index = [];
  let n = 0;
  for (const { id, group } of ids) {
    n += 1;
    const iconName = GROUP_ICON[group];
    if (!iconName) throw new Error(`grup icin ikon tanimli degil: ${group}`);
    const file = `${String(n).padStart(2, '0')}_${id}.png`;
    await tile(iconName, resolve(OUT, file));
    index.push(`| ${n} | \`${id}\` | ${group} | ${iconName} | ${file} |`);
  }

  writeFileSync(resolve(OUT, 'INDEX.md'),
    `# Basarim ikonlari\n\n` +
    `\`node tools/make-achievement-icons.mjs\` ile uretildi. ${ids.length} dosya, ` +
    `${new Set(Object.values(GROUP_ICON)).size} benzersiz gorsel (grup basina bir tane).\n` +
    `Hepsi ${SIZE}x${SIZE} PNG, alfa kanali yok.\n\n` +
    `Sira store/basarimlar.md ile ayni; konsolda o tabloyu takip ederek yukleyebilirsin.\n\n` +
    `| # | Yerel ID | Grup | Ikon | Dosya |\n|---|---|---|---|---|\n` +
    index.join('\n') + '\n', 'utf8');

  console.log(`${ids.length} ikon yazildi -> store/achievement-icons/ (${SIZE}x${SIZE})`);
  console.log(`${new Set(Object.values(GROUP_ICON)).size} benzersiz gorsel, grup basina bir tane`);
  console.log('INDEX.md: dosya <-> basarim eslesmesi');
}

main().catch((e) => { console.error(e); process.exit(1); });
