// Panthop store-graphics generator — composes Google Play / App Store listing
// images from the game's own pixel assets (mascot, wordmark, corner vines)
// plus raw gameplay screenshots dropped into store/raw/.
//
//   node tools/make-store-graphics.mjs        (or: npm run store:gfx)
//
// Outputs (store/):
//   play/feature-1024x500.png        ← Play feature graphic (required, no raw needed)
//   play/NN-phone-1080x1920.png      ← Play phone screenshots
//   ios/NN-iphone69-1290x2796.png    ← App Store 6.9" (iPhone 15/16 Pro Max)
//   ios/NN-iphone65-1242x2688.png    ← App Store 6.5" (older big iPhones)
//   ios/NN-ipad13-2048x2732.png      ← App Store 13" iPad (needed if iPad enabled)
//
// Raw gameplay shots: drop PNG/JPG files into store/raw/ — they are picked up
// in filename order and paired with CAPTIONS below. With store/raw/ empty a
// placeholder template is rendered so the layout can be previewed.
//
// Text is drawn with a built-in 5×7 pixel font (the game's woff2 fonts can't
// be used inside librsvg), so captions must be ASCII — same rule as tr.json.

import sharp from 'sharp';
import { mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = resolve(ROOT, 'assets');
const RAW_DIR = resolve(ROOT, 'store/raw');
const MASCOT = resolve(ASSETS, 'logo-panther.png');
const WORDMARK = resolve(ASSETS, 'logo-name-panthop.svg');
const VINE = resolve(ASSETS, 'vine-corner.svg');

/* Captions paired with raw screenshots in filename order (ASCII only). */
const CAPTIONS = [
  ['TEK TUSLA', 'ZIPLA!'],
  ['ENGELLERI AS', 'YUKARI TIRMAN'],
  ['KABUK TOPLA', 'GELISIM AL'],
  ['BASARIMLARI AC', 'ODULLERI TOPLA'],
  ['PENCE VE KALKAN', 'GUCLERI SENINLE'],
  ['REKORU KIR', 'ZIRVEYE TIRMAN'],
];

/* Store screenshot sizes. */
const SHOT_SIZES = [
  { dir: 'store/play', tag: 'phone', w: 1080, h: 1920 },
  { dir: 'store/ios', tag: 'iphone69', w: 1290, h: 2796 },
  { dir: 'store/ios', tag: 'iphone65', w: 1242, h: 2688 },
  { dir: 'store/ios', tag: 'ipad13', w: 2048, h: 2732 },
];

/* Palette — mirrors css/style.css. */
const C = {
  gold: '#ffd447',
  text: '#f1fae8',
  dim: '#a7c6a0',
  shadow: '#06140d',
  slot: '#0a1c12',
  frame: '#24513a',
};

/* ---------- 5×7 pixel font ---------- */
const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '..##.', '..##.', '.#...'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/* Width in font columns: 5 per glyph + 1 gap between glyphs. */
const textCols = (str) => str.length * 6 - 1;

/* One line of pixel text as SVG rects, horizontally centred on cx. Rows are
   merged into runs so the SVG stays small. */
function pixelText(str, cx, topY, s, fill) {
  const startX = cx - (textCols(str) * s) / 2;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const glyph = FONT[str[i].toUpperCase()] || FONT['?'];
    const gx = startX + i * 6 * s;
    for (let r = 0; r < 7; r++) {
      const row = glyph[r];
      let c = 0;
      while (c < 5) {
        if (row[c] !== '#') { c++; continue; }
        let len = 1;
        while (c + len < 5 && row[c + len] === '#') len++;
        out += `<rect x="${gx + c * s}" y="${topY + r * s}" width="${len * s}" height="${s}" fill="${fill}"/>`;
        c += len;
      }
    }
  }
  return out;
}

/* Caption block: each line drawn with a 1-font-pixel offset shadow. Returns
   the SVG plus total height so callers can flow content below it. */
function captionBlock(lines, cx, topY, s, colors) {
  let svg = '';
  let y = topY;
  lines.forEach((line, i) => {
    const fill = colors[i] || colors[colors.length - 1];
    svg += pixelText(line, cx + s, y + s, s, C.shadow);
    svg += pixelText(line, cx, y, s, fill);
    y += 7 * s + 2 * s;
  });
  return { svg, height: y - topY - 2 * s };
}

/* Fit a shared scale for all caption lines into maxWidth, capped for taste. */
function captionScale(lines, maxWidth, cap) {
  const cols = Math.max(...lines.map(textCols));
  return Math.max(2, Math.min(cap, Math.floor(maxWidth / cols)));
}

/* ---------- Asset embedding ---------- */
/* Inline one of our rect-based SVG assets as a nested <svg> element. */
function nestedSvg(file, x, y, w, h) {
  const src = readFileSync(file, 'utf8');
  return src.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
}

/* Four corner vines, flipped like the in-game .vine-frame. */
function vineCorners(W, H, s) {
  const v = (t) => `<g transform="${t}">${nestedSvg(VINE, 0, 0, s, s)}</g>`;
  return (
    v('translate(0,0)') +
    v(`translate(${W},0) scale(-1,1)`) +
    v(`translate(0,${H}) scale(1,-1)`) +
    v(`translate(${W},${H}) scale(-1,-1)`)
  );
}

/* Jungle background — mirrors the .screen CSS gradients. */
function background(W, H) {
  return `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#123a4a"/>
      <stop offset="0.45" stop-color="#0c241a"/>
      <stop offset="1" stop-color="#10321c"/>
    </linearGradient>
    <radialGradient id="glowTop" cx="0.5" cy="-0.08" r="0.62">
      <stop offset="0" stop-color="#5fbeeb" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#5fbeeb" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBot" cx="0.5" cy="1.12" r="0.6">
      <stop offset="0" stop-color="#6ec85a" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#6ec85a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowTop)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBot)"/>`;
}

/* Notched pixel frame (same silhouette as the in-game cards): a cross-shaped
   body with n×n corners missing, a drop ledge underneath and a chiselled
   bevel. Returns the frame SVG; the caller draws the screenshot on interior. */
function notchedFrame(x, y, W, H, b, n, ledge) {
  const cross = (dx, dy, fill, opacity = 1) =>
    `<g fill="${fill}" opacity="${opacity}">
      <rect x="${x + n + dx}" y="${y + dy}" width="${W - 2 * n}" height="${H}"/>
      <rect x="${x + dx}" y="${y + n + dy}" width="${n}" height="${H - 2 * n}"/>
      <rect x="${x + W - n + dx}" y="${y + n + dy}" width="${n}" height="${H - 2 * n}"/>
    </g>`;
  const px = Math.max(2, Math.round(b / 4));
  return (
    cross(0, ledge, '#000000', 0.38) +
    cross(0, 0, C.frame) +
    // bevel: light top/left, dark bottom/right
    `<rect x="${x + n}" y="${y}" width="${W - 2 * n}" height="${px}" fill="#ffffff" opacity="0.14"/>` +
    `<rect x="${x}" y="${y + n}" width="${px}" height="${H - 2 * n}" fill="#ffffff" opacity="0.10"/>` +
    `<rect x="${x + n}" y="${y + H - px}" width="${W - 2 * n}" height="${px}" fill="#000000" opacity="0.30"/>` +
    `<rect x="${x + W - px}" y="${y + n}" width="${px}" height="${H - 2 * n}" fill="#000000" opacity="0.26"/>`
  );
}

async function toDataUri(buf) {
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/* Mascot pre-scaled with nearest-neighbour so its pixels stay crisp. */
async function mascotUri(width) {
  const buf = await sharp(MASCOT).resize({ width, kernel: 'nearest' }).png().toBuffer();
  return toDataUri(buf);
}

/* ---------- Screenshot composition ---------- */
async function makeShot({ w: W, h: H, tag, dir }, idx, rawPath, caption) {
  const cx = W / 2;
  const px = Math.max(3, Math.round(W / 270));

  // caption block up top
  const capTop = Math.round(H * 0.05);
  const s = captionScale(caption, W * 0.84, px * 3);
  const cap = captionBlock(caption, cx, capTop, s, [C.gold, C.text]);

  // wordmark at the bottom
  const wmW = Math.round(W * 0.4);
  const wmH = Math.round(wmW / 4);
  const wmY = H - Math.round(H * 0.04) - wmH;

  // frame area between caption and wordmark, sized to the raw shot's aspect
  const frameTop = capTop + cap.height + Math.round(H * 0.035);
  const frameBottom = wmY - Math.round(H * 0.03);
  const b = 4 * px;                      // frame border
  const n = 3 * px;                      // corner notch
  const maxInnerW = Math.round(W * 0.8) - 2 * b;
  const maxInnerH = frameBottom - frameTop - 2 * b;

  let rawAspect = 1080 / 2340;           // placeholder default: modern phone
  if (rawPath) {
    const m = await sharp(rawPath).metadata();
    rawAspect = m.width / m.height;
  }
  let innerH = maxInnerH;
  let innerW = Math.round(innerH * rawAspect);
  if (innerW > maxInnerW) {
    innerW = maxInnerW;
    innerH = Math.round(innerW / rawAspect);
  }
  const frameW = innerW + 2 * b;
  const frameH = innerH + 2 * b;
  const fx = Math.round(cx - frameW / 2);
  const fy = Math.round(frameTop + (frameBottom - frameTop - frameH) / 2);

  let slot;
  if (rawPath) {
    const buf = await sharp(rawPath)
      .resize(innerW, innerH, { fit: 'contain', background: C.slot })
      .png()
      .toBuffer();
    slot = `<image x="${fx + b}" y="${fy + b}" width="${innerW}" height="${innerH}" preserveAspectRatio="none" href="${await toDataUri(buf)}"/>`;
  } else {
    // template placeholder: dark slot + mascot + hint text
    const mW = Math.round(innerW * 0.45);
    const mUri = await mascotUri(mW);
    const hintS = Math.max(2, Math.round(px * 1.2));
    slot =
      `<rect x="${fx + b}" y="${fy + b}" width="${innerW}" height="${innerH}" fill="${C.slot}"/>` +
      `<image x="${Math.round(cx - mW / 2)}" y="${Math.round(fy + innerH * 0.28)}" width="${mW}" height="${mW}" href="${mUri}"/>` +
      pixelText('OYUN GORUNTUSU', cx, fy + b + Math.round(innerH * 0.72), hintS, C.dim) +
      pixelText('BURAYA GELECEK', cx, fy + b + Math.round(innerH * 0.72) + 9 * hintS, hintS, C.dim);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
    ${background(W, H)}
    ${vineCorners(W, H, Math.round(W * 0.19))}
    ${cap.svg}
    ${notchedFrame(fx, fy, frameW, frameH, b, n, 3 * px)}
    ${slot}
    ${nestedSvg(WORDMARK, Math.round(cx - wmW / 2), wmY, wmW, wmH)}
  </svg>`;

  const outDir = resolve(ROOT, dir);
  mkdirSync(outDir, { recursive: true });
  const name = `${String(idx + 1).padStart(2, '0')}-${tag}-${W}x${H}.png`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(outDir, name));
  return `${dir}/${name}`;
}

/* ---------- Play feature graphic (1024×500) ---------- */
async function makeFeature() {
  const W = 1024, H = 500;
  const mH = 360;
  const mUri = await mascotUri(mH);

  const colX = 490, colW = 480;
  const colCx = colX + colW / 2;
  const capS = captionScale(['TEK TUSLA ZIPLA!'], colW, 5);
  const subS = 3;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
    ${background(W, H)}
    ${vineCorners(W, H, 170)}
    <image x="90" y="${H - mH - 40}" width="${mH}" height="${mH}" href="${mUri}"/>
    ${nestedSvg(WORDMARK, colX, 96, colW, Math.round(colW / 4))}
    ${captionBlock(['TEK TUSLA ZIPLA!'], colCx, 270, capS, [C.gold]).svg}
    ${captionBlock(['YAVRU PANTER PANTHO ILE'], colCx, 330, subS, [C.text]).svg}
    ${captionBlock(['ZIRVEYE TIRMAN'], colCx, 362, subS, [C.dim]).svg}
  </svg>`;

  const outDir = resolve(ROOT, 'store/play');
  mkdirSync(outDir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(resolve(outDir, `feature-${W}x${H}.png`));
  return `store/play/feature-${W}x${H}.png`;
}

/* ---------- Main ---------- */
async function main() {
  mkdirSync(RAW_DIR, { recursive: true });

  const raws = existsSync(RAW_DIR)
    ? readdirSync(RAW_DIR)
        .filter((f) => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(f).toLowerCase()))
        .sort()
        .map((f) => resolve(RAW_DIR, f))
    : [];

  const made = [];
  made.push(await makeFeature());

  if (raws.length === 0) {
    console.log('store/raw/ bos — sablon (placeholder) gorseller uretiliyor.');
    console.log('Gercek oyun goruntulerini store/raw/ icine at, sonra tekrar calistir.');
    for (const size of SHOT_SIZES) made.push(await makeShot(size, 0, null, CAPTIONS[0]));
  } else {
    for (let i = 0; i < raws.length; i++) {
      const caption = CAPTIONS[i] || ['PANTHOP'];
      for (const size of SHOT_SIZES) made.push(await makeShot(size, i, raws[i], caption));
    }
  }

  for (const f of made) console.log('  ✓', f);
  console.log(`${made.length} gorsel hazir.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
