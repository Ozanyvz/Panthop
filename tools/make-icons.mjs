// Panthop icon generator — builds a cute-panther-in-foliage emblem and renders
// every app/PWA/Capacitor icon from it. Uses sharp (already present via
// @capacitor/assets). The foliage palette is pulled from the wordmark SVG.
//
// Run: node tools/make-icons.mjs

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'assets/icons');
const ASSETS_DIR = resolve(ROOT, 'assets');
const PANTHER = resolve(ASSETS_DIR, 'character/pantho-512x512px.png');

/* ---------- Foliage (authored in a 64×64 grid, scales crisply as vector) ---------- */
const LEAF_OUTLINE = '#21450B';
const LEAF_VEIN = '#2B620B';
const LEAF_FILL = '#387B09';
const LEAF_MID = '#64B200';
const LEAF_HI = '#85E901';

// One pixel leaf: a pointed vesica shape with a base→tip vein, layered for
// shading. baseX/baseY = where the stem attaches; h = length; a = half-width;
// lean = how far the tip leans sideways.
function leaf(baseX, baseY, h, a, lean) {
  const band = (aa, dx, col) => {
    let s = '';
    for (let i = 0; i <= h; i++) {
      const tt = i / h;                                  // 0 = base, 1 = tip
      const w = aa * Math.pow(Math.sin(Math.PI * tt), 0.7);
      if (w < 0.3) continue;
      const cx = baseX + lean * tt + dx;
      const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
      s += `<rect x="${x0}" y="${baseY - i}" width="${x1 - x0 + 1}" height="1" fill="${col}"/>`;
    }
    return s;
  };
  // dark rim, green fill, sunlit inner stripe
  let s = band(a + 0.9, 0, LEAF_OUTLINE) + band(a, 0, LEAF_FILL) + band(a * 0.5, -0.7, LEAF_MID);
  for (let i = 2; i < h - 1; i++) {                       // central vein
    const cx = Math.round(baseX + lean * (i / h));
    s += `<rect x="${cx}" y="${baseY - i}" width="1" height="1" fill="${LEAF_VEIN}"/>`;
  }
  return s;
}

/* ---------- Tree-branch frame (wood border + leaf clusters) ---------- */
const WOOD_DARK = '#2a1810';
const WOOD = '#4a2e18';
const WOOD_MID = '#5b3a20';
const WOOD_HI = '#7a5230';

function branchFrame() {
  let s = '';
  // top & bottom branches (3px thick): lit top edge, shaded underside
  for (const y of [4, 57]) {
    s += `<rect x="7" y="${y}" width="50" height="3" fill="${WOOD}"/>`;
    s += `<rect x="7" y="${y}" width="50" height="1" fill="${WOOD_HI}"/>`;
    s += `<rect x="7" y="${y + 2}" width="50" height="1" fill="${WOOD_DARK}"/>`;
  }
  // left & right branches
  for (const x of [4, 57]) {
    s += `<rect x="${x}" y="7" width="3" height="50" fill="${WOOD}"/>`;
    s += `<rect x="${x}" y="7" width="1" height="50" fill="${WOOD_HI}"/>`;
    s += `<rect x="${x + 2}" y="7" width="1" height="50" fill="${WOOD_DARK}"/>`;
  }
  // rounded corner knots
  for (const [cx, cy] of [[4, 4], [57, 4], [4, 57], [57, 57]]) {
    s += `<rect x="${cx}" y="${cy}" width="3" height="3" fill="${WOOD_MID}"/>`;
    s += `<rect x="${cx + 1}" y="${cy + 1}" width="1" height="1" fill="${WOOD_DARK}"/>`;
  }
  // little twig nubs
  s += `<rect x="20" y="6" width="1" height="2" fill="${WOOD_MID}"/>`;
  s += `<rect x="44" y="56" width="1" height="2" fill="${WOOD_MID}"/>`;
  return s;
}

function foliageSvg() {
  // A tree-branch frame around the panther, with leaf clusters at the corners.
  let body = branchFrame();
  const leaves = [
    [7, 14, 13, 4, -4], [11, 11, 11, 3, -1],    // top-left
    [57, 14, 13, 4, 4], [53, 11, 11, 3, 1],     // top-right
    [10, 57, 9, 3, -2], [54, 57, 9, 3, 2],      // bottom sprouts
  ];
  for (const [x, y, h, a, l] of leaves) body += leaf(x, y, h, a, l);
  for (const [x, y] of [[8, 5], [56, 5], [10, 51], [54, 51]]) {
    body += `<rect x="${x}" y="${y}" width="1" height="1" fill="${LEAF_HI}"/>`;
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">${body}</svg>`
  );
}

/* ---------- Building blocks ---------- */
// Transparent emblem: foliage with the cute panther sitting in front of it.
async function emblem(size) {
  const frame = await sharp(foliageSvg()).resize(size, size).png().toBuffer();
  // Panther scaled to sit inside the branch frame, centred (overflow clipped).
  const cs = Math.round(size * 0.9);
  const cat = await sharp(PANTHER)
    .resize(cs, cs, { kernel: sharp.kernel.nearest })
    .png().toBuffer();
  return sharp(frame).composite([{ input: cat, gravity: 'center' }]).png().toBuffer();
}

// Sky→grass background gradient (matches the in-game world & menu theme).
function background(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7ec6f2"/>
      <stop offset="0.55" stop-color="#5bbf6a"/>
      <stop offset="1" stop-color="#2f7d3f"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Compose an icon. mode: 'full' | 'foreground' | 'background' | 'splash'
async function icon(size, { maskable = false, mode = 'full' } = {}) {
  if (mode === 'background') return background(size);

  let frac;
  if (mode === 'splash') frac = 0.34;
  else if (mode === 'foreground') frac = 0.68;   // Android adaptive safe zone
  else if (maskable) frac = 0.70;
  else frac = 0.92;

  const e = Math.round(size * frac);
  const off = Math.round((size - e) / 2);
  const em = await emblem(e);

  const base = (mode === 'foreground')
    ? sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    : sharp(await background(size));

  return base.composite([{ input: em, top: off, left: off }]).png().toBuffer();
}

/* ---------- Output ---------- */
mkdirSync(OUT_DIR, { recursive: true });

const jobs = [
  // PWA / web icons
  ['icons/icon-192.png', icon(192)],
  ['icons/icon-512.png', icon(512)],
  ['icons/icon-192-maskable.png', icon(192, { maskable: true })],
  ['icons/icon-512-maskable.png', icon(512, { maskable: true })],
  ['icons/apple-touch-icon.png', icon(180)],
  ['icons/favicon-32.png', icon(32)],
  // Standalone emblem for the start screen / general branding
  ['logo-panther.png', emblem(512)],
  // Capacitor Assets master inputs
  ['icon-only.png', icon(1024)],
  ['icon-foreground.png', icon(1024, { mode: 'foreground' })],
  ['icon-background.png', icon(1024, { mode: 'background' })],
  ['splash.png', icon(2732, { mode: 'splash' })],
  ['splash-dark.png', icon(2732, { mode: 'splash' })],
];

for (const [name, job] of jobs) {
  const buf = await job;
  const p = resolve(ASSETS_DIR, name);
  await sharp(buf).toFile(p);
  console.log(`wrote assets/${name} (${buf.length} bytes)`);
}
