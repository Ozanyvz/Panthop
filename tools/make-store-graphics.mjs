// Panthop store-graphics generator — composes Google Play / App Store listing
// images from the game's own pixel assets (mascot, wordmark, corner vines)
// plus raw gameplay screenshots dropped into store/raw/.
//
//   node tools/make-store-graphics.mjs        (or: npm run store:gfx)
//
// Per language (Play and the App Store both take a separate screenshot set for
// each listing language), outputs land under store/<store>/<lang>/:
//   play/<lang>/feature-1024x500.png  ← Play feature graphic (per language)
//   play/<lang>/NN-phone-1080x1920.png
//   ios/<lang>/NN-iphone69-1290x2796.png    ← App Store 6.9" (iPhone 15/16 Pro Max)
//   ios/<lang>/NN-iphone65-1242x2688.png    ← App Store 6.5" (older big iPhones)
//   ios/<lang>/NN-ipad13-2048x2732.png      ← App Store 13" iPad (needed if iPad enabled)
//
// Raw gameplay shots: drop PNG/JPG into store/raw/<lang>/ — the UI language in
// the shot has to match the caption language, so tr/ shots must be taken with
// the game set to Turkish. Files are picked up in filename order and paired
// with CAPTIONS[lang]. A language with no raw folder is skipped; with none at
// all a placeholder template is rendered so the layout can be previewed.
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

/* Captions paired with raw screenshots in filename order (ASCII only — the
   built-in pixel font has no accented glyphs, same rule as tr.json). */
const CAPTIONS = {
  tr: [
    ['TEK TUSLA', 'ZIPLA!'],
    ['ENGELLERI AS', 'YUKARI TIRMAN'],
    ['KABUK TOPLA', 'GELISIM AL'],
    ['BASARIMLARI AC', 'ODULLERI TOPLA'],
    ['PENCE VE KALKAN', 'GUCLERI SENINLE'],
    ['REKORU KIR', 'ZIRVEYE TIRMAN'],
  ],
  en: [
    ['ONE TAP', 'TO JUMP!'],
    ['CLEAR OBSTACLES', 'CLIMB HIGHER'],
    ['COLLECT BARK', 'BUY UPGRADES'],
    ['UNLOCK ACHIEVEMENTS', 'CLAIM REWARDS'],
    ['CLAW AND SHIELD', 'POWERS WITH YOU'],
    ['BEAT YOUR RECORD', 'REACH THE TOP'],
  ],
};
const LANGS = Object.keys(CAPTIONS);

/* Feature graphic copy. Play takes a separate feature graphic per listing
   language, so this follows CAPTIONS rather than shipping one Turkish image to
   every locale. ASCII only, same reason. */
const FEATURE = {
  tr: { head: 'TEK TUSLA ZIPLA!', sub: ['YAVRU PANTER PANTHO ILE', 'ZIRVEYE TIRMAN'] },
  en: { head: 'ONE TAP TO JUMP!', sub: ['CLIMB TO THE TOP WITH', 'PANTHO THE PANTHER CUB'] },
};

/* Phone screenshots arrive with the OS status bar on top and the gesture/
   navigation bar underneath; both look like clutter in a store listing. The
   game draws edge to edge, so there is no colour boundary to detect reliably —
   these are fractions of the raw height, trimmed before composition.
   Measured against 945x2048 Android shots; adjust if a device differs. */
const TRIM_TOP = 0.049;
const TRIM_BOTTOM = 0.065;

/* Store screenshot sizes. */
const SHOT_SIZES = [
  { dir: 'store/play', tag: 'phone', w: 1080, h: 1920 },
  /* Play asks for tablet shots at a 16:9 or 9:16 ratio — not the phone's own
     aspect — so these are exact 9:16. The 10" slot also has a 1080px minimum
     edge, which is why it is the larger of the two. */
  { dir: 'store/play', tag: 'tablet7', w: 1080, h: 1920 },
  { dir: 'store/play', tag: 'tablet10', w: 1440, h: 2560 },
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
async function makeShot({ w: W, h: H, tag, dir }, idx, rawPath, caption, lang) {
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

  // Trim the OS bars first, so both the frame's aspect and the pixels drawn
  // into it describe the game alone.
  let shot = null;
  let rawAspect = 1080 / 2340;           // placeholder default: modern phone
  if (rawPath) {
    const m = await sharp(rawPath).metadata();
    const top = Math.round(m.height * TRIM_TOP);
    const bottom = Math.round(m.height * TRIM_BOTTOM);
    shot = await sharp(rawPath)
      .extract({ left: 0, top, width: m.width, height: m.height - top - bottom })
      .toBuffer();
    const t = await sharp(shot).metadata();
    rawAspect = t.width / t.height;
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
    const buf = await sharp(shot)
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

  const rel = `${dir}/${lang}`;
  const outDir = resolve(ROOT, rel);
  mkdirSync(outDir, { recursive: true });
  const name = `${String(idx + 1).padStart(2, '0')}-${tag}-${W}x${H}.png`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(outDir, name));
  return `${rel}/${name}`;
}

/* ---------- Play feature graphic (1024×500) ---------- */
async function makeFeature(lang) {
  const W = 1024, H = 500;
  const mH = 360;
  const mUri = await mascotUri(mH);
  const copy = FEATURE[lang];

  const colX = 490, colW = 480;
  const colCx = colX + colW / 2;
  const capS = captionScale([copy.head], colW, 5);
  const subS = captionScale(copy.sub, colW, 3);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
    ${background(W, H)}
    ${vineCorners(W, H, 170)}
    <image x="90" y="${H - mH - 40}" width="${mH}" height="${mH}" href="${mUri}"/>
    ${nestedSvg(WORDMARK, colX, 96, colW, Math.round(colW / 4))}
    ${captionBlock([copy.head], colCx, 270, capS, [C.gold]).svg}
    ${captionBlock([copy.sub[0]], colCx, 330, subS, [C.text]).svg}
    ${captionBlock([copy.sub[1]], colCx, 330 + 11 * subS, subS, [C.dim]).svg}
  </svg>`;

  const rel = `store/play/${lang}`;
  const outDir = resolve(ROOT, rel);
  mkdirSync(outDir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(resolve(outDir, `feature-${W}x${H}.png`));
  return `${rel}/feature-${W}x${H}.png`;
}

/* ---------- Main ---------- */
/* Raw shots are paired with captions by the NUMBER that starts the filename
   ("03-gelisim.png" -> caption 3), not by position in the folder. A missing
   shot therefore leaves a gap instead of silently shifting every caption after
   it onto the wrong picture. Files with no leading number fall back to their
   position, so an unnumbered folder still works. */
function rawsFor(lang) {
  const dir = resolve(RAW_DIR, lang);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(f).toLowerCase()))
    .sort();
  return files.map((f, pos) => {
    const m = /^(\d+)/.exec(f);
    return { path: resolve(dir, f), capIdx: m ? parseInt(m[1], 10) - 1 : pos, file: f };
  });
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });

  const made = [];
  const present = LANGS.filter((l) => rawsFor(l).length > 0);
  for (const lang of present) made.push(await makeFeature(lang));

  if (present.length === 0) {
    console.log('store/raw/<dil>/ bos — sablon (placeholder) gorseller uretiliyor.');
    console.log(`Gercek goruntuleri store/raw/tr/ veya store/raw/en/ icine at.`);
    made.push(await makeFeature('tr'));
    for (const size of SHOT_SIZES) made.push(await makeShot(size, 0, null, CAPTIONS.tr[0], 'tr'));
  } else {
    for (const lang of present) {
      const raws = rawsFor(lang);
      console.log(`[${lang}] ${raws.length} ham goruntu`);
      for (let i = 0; i < raws.length; i++) {
        const { path, capIdx, file } = raws[i];
        const caption = CAPTIONS[lang][capIdx];
        if (!caption) {
          console.warn(`  ! ${file}: ${capIdx + 1}. basligin karsiligi yok, atlandi`);
          continue;
        }
        console.log(`  ${file} -> "${caption.join(' / ')}"`);
        for (const size of SHOT_SIZES) made.push(await makeShot(size, capIdx, path, caption, lang));
      }
    }
    const missing = LANGS.filter((l) => !present.includes(l));
    if (missing.length) console.log(`atlandi (ham goruntu yok): ${missing.join(', ')}`);
  }

  for (const f of made) console.log('  ✓', f);
  console.log(`${made.length} gorsel hazir.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
