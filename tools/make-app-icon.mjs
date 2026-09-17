// Panthop app icon generator.
//
//   node tools/make-app-icon.mjs
//
// Writes the Android launcher resources directly, because `capacitor-assets`
// gets two things wrong for this icon:
//
//   1. It emits the adaptive foreground/background layers at the LEGACY sizes
//      (48dp -> 192px at xxxhdpi). Android composes adaptive icons on a 108dp
//      canvas, so those layers get upscaled and the icon turns soft. Here they
//      are written at the real 108dp sizes.
//   2. It rescales whatever foreground you hand it, so padding you add for the
//      safe zone gets applied twice and the subject ends up tiny — or, with a
//      full-bleed source, the mask eats the ears.
//
// Android composes adaptive icons on a 108dp canvas and shows the middle 72dp.
// The ic_launcher.xml Capacitor writes already insets each layer by 16.7%, which
// lands the drawable exactly on that visible 72dp square — so the layer we
// generate here maps 1:1 onto what the user sees, and HEAD_FRACTION is simply
// how much of the visible icon the cub's head fills. Only the launcher's corner
// rounding cuts anything, which is why the head stays short of the very edge.
//
// Run this AFTER `npm run cap:assets` — that tool regenerates splash screens
// too, and would overwrite these files.

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'assets/icon-source.png');   // AI'dan gelen 1024 kare
const RES = resolve(ROOT, 'android/app/src/main/res');

/* Cub geometry inside the 1024x1024 source, measured from the artwork. */
const HEAD = { cx: 515, cy: 483, w: 596 };
const HEAD_FRACTION = 0.78;      // head width as a share of the visible icon
const HEAD_CENTER_Y = 0.44;      // slightly above centre so the chest fills below

/* Background gradient, sampled from the source artwork. */
const GRAD = ['#62bbb5', '#46a77c', '#28934d'];

/* Android density buckets: adaptive layers are 108dp, legacy icons 48dp. */
const DENSITIES = [
  ['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4],
];

const gradientSvg = (S) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
     <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="${GRAD[0]}"/>
       <stop offset="52%" stop-color="${GRAD[1]}"/>
       <stop offset="100%" stop-color="${GRAD[2]}"/>
     </linearGradient></defs>
     <rect width="${S}" height="${S}" fill="url(#g)"/></svg>`);

/* Lift the cub off its green backdrop. The artwork is flat vector, so a hue
   test separates cleanly: the backdrop is bright and green-dominant, while the
   fur is dark, the ears pink, the eyes amber and the whiskers pale grey. */
async function cutout() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const o = i * C, r = data[o], g = data[o + 1], b = data[o + 2];
    const isBg = g > r + 12 && g > b - 30 && g > 95 && !(r > 150 && b > 150);
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b;
    out[i * 4 + 3] = isBg ? 0 : 255;
  }
  return { buf: out, W, H };
}


/* sharp refuses a composite bigger than its canvas, and these layers are meant
   to bleed off the edges, so clip the overlap ourselves before compositing. */
async function clipped(img, w, h, left, top, S) {
  const ex = Math.max(0, -left), ey = Math.max(0, -top);
  const cw = Math.min(w - ex, S - Math.max(0, left));
  const ch = Math.min(h - ey, S - Math.max(0, top));
  if (cw <= 0 || ch <= 0) throw new Error('gorsel tuvalin tamamen disinda');
  const piece = await sharp(img).extract({ left: ex, top: ey, width: cw, height: ch }).toBuffer();
  return { input: piece, left: Math.max(0, left), top: Math.max(0, top) };
}

async function main() {
  const { buf, W, H } = await cutout();
  const cub = await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

  for (const [dir, mult] of DENSITIES) {
    const adaptive = Math.round(108 * mult);
    const legacy = Math.round(48 * mult);
    const out = resolve(RES, `mipmap-${dir}`);
    mkdirSync(out, { recursive: true });

    // --- adaptive background: gradient only ---
    await sharp(gradientSvg(adaptive)).png().toFile(resolve(out, 'ic_launcher_background.png'));

    // --- adaptive foreground: cub alone, head sized into the safe zone ---
    const scale = (HEAD_FRACTION * adaptive) / HEAD.w;
    const sw = Math.round(W * scale), sh = Math.round(H * scale);
    const scaled = await sharp(cub).resize(sw, sh, { kernel: 'lanczos3' }).toBuffer();
    const left = Math.round(adaptive / 2 - HEAD.cx * scale);
    const top = Math.round(adaptive * HEAD_CENTER_Y - HEAD.cy * scale);
    await sharp({ create: { width: adaptive, height: adaptive, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([await clipped(scaled, sw, sh, left, top, adaptive)])
      .png().toFile(resolve(out, 'ic_launcher_foreground.png'));

    // --- legacy square + round: the full composition, no safe-zone inset ---
    const lScale = (0.82 * legacy) / HEAD.w;
    const lw = Math.round(W * lScale), lh = Math.round(H * lScale);
    const lScaled = await sharp(cub).resize(lw, lh, { kernel: 'lanczos3' }).toBuffer();
    const flat = await sharp(gradientSvg(legacy)).png().composite([await clipped(
      lScaled, lw, lh,
      Math.round(legacy / 2 - HEAD.cx * lScale),
      Math.round(legacy * 0.47 - HEAD.cy * lScale), legacy)]).png().toBuffer();
    await sharp(flat).toFile(resolve(out, 'ic_launcher.png'));

    const round = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}" fill="#fff"/></svg>`);
    await sharp(flat).composite([{ input: round, blend: 'dest-in' }]).png()
      .toFile(resolve(out, 'ic_launcher_round.png'));

    console.log(`${dir.padEnd(8)} adaptive ${adaptive}px  legacy ${legacy}px`);
  }

  /* Master assets for capacitor-assets. It generates the splash screens too,
     so someone will run it again; if these still held the old artwork it would
     quietly put the old icon back. Keeping them in step means the worst case is
     icons at the wrong SIZE, not the wrong PICTURE — rerun this tool to fix. */
  const master = 1024;
  await sharp(gradientSvg(master)).png().toFile(resolve(ROOT, 'assets/icon-background.png'));
  {
    const sc = (HEAD_FRACTION * master) / HEAD.w;
    const w2 = Math.round(W * sc), h2 = Math.round(H * sc);
    const img = await sharp(cub).resize(w2, h2, { kernel: 'lanczos3' }).toBuffer();
    await sharp({ create: { width: master, height: master, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([await clipped(img, w2, h2,
        Math.round(master / 2 - HEAD.cx * sc),
        Math.round(master * HEAD_CENTER_Y - HEAD.cy * sc), master)])
      .png().toFile(resolve(ROOT, 'assets/icon-foreground.png'));
  }
  {
    const sc = (0.82 * master) / HEAD.w;
    const w2 = Math.round(W * sc), h2 = Math.round(H * sc);
    const img = await sharp(cub).resize(w2, h2, { kernel: 'lanczos3' }).toBuffer();
    await sharp(gradientSvg(master)).png()
      .composite([await clipped(img, w2, h2,
        Math.round(master / 2 - HEAD.cx * sc),
        Math.round(master * 0.47 - HEAD.cy * sc), master)])
      .png().toFile(resolve(ROOT, 'assets/icon-only.png'));
  }
  console.log('assets/icon-only|foreground|background.png (capacitor-assets kaynagi)');

  // Store / PWA icon: the full composition at 512.
  const sScale = (0.80 * 512) / HEAD.w;
  const sw2 = Math.round(W * sScale), sh2 = Math.round(H * sScale);
  const s = await sharp(cub).resize(sw2, sh2, { kernel: 'lanczos3' }).toBuffer();
  await sharp(gradientSvg(512)).png().composite([await clipped(
    s, sw2, sh2,
    Math.round(256 - HEAD.cx * sScale),
    Math.round(512 * 0.47 - HEAD.cy * sScale), 512)])
    .png().toFile(resolve(ROOT, 'assets/icons/icon-512.png'));
  console.log('assets/icons/icon-512.png (magaza ikonu)');
}

main().catch((e) => { console.error(e); process.exit(1); });
