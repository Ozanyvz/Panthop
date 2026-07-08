// Pixel-art icon generator. Each icon is authored as an ASCII grid (so the
// shape is readable right here in source) plus a per-icon palette mapping each
// character to a colour ('.' = transparent). Emits crisp, scalable SVGs with
// horizontal run-length-merged <rect>s into assets/icons/game/.
//
// Run: node tools/gen-icons.mjs   (also wired as `npm run icons:svg`)

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets/icons/game');

/* ---------- Procedural cog (settings icon) ----------
   Authored math-first (a clean circle + teeth can't be hand-pixelled cleanly):
   a 32x32 gear with 8 teeth, bevel shading, and a small hollow bore ringed by a
   dark inner contour. Returns an ASCII grid the same shape the hand-authored
   icons use, so it flows through svgFor() unchanged. */
function makeGearGrid() {
  const N = 32, C = (N - 1) / 2, TEETH = 8;
  const R_TIP = 15, R_BODY = 12.3, R_HOLE = 6.6, R_HOLE_RING = 7.4, RIM = 1.5;
  const g = Array.from({ length: N }, () => Array(N).fill('.'));

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - C, dy = y - C, r = Math.hypot(dx, dy);
      const isTooth = Math.cos(TEETH * Math.atan2(dy, dx)) > 0.15;
      const rLimit = isTooth ? R_TIP : R_BODY;
      if (r > rLimit) continue;
      if (r >= rLimit - RIM) g[y][x] = 'o';            // outer rim
      else if (r <= R_HOLE) continue;                  // small hollow bore (transparent)
      else if (r <= R_HOLE_RING) g[y][x] = 'o';        // dark inner contour
      else { const lit = dx + dy; g[y][x] = lit < -3 ? 'h' : lit > 4 ? 's' : 'b'; }
    }
  }
  return g.map(row => row.join(''));
}

/* ---------- Icon definitions ----------
   Grids are square (16x16). Keep every row exactly as wide as the grid.
   Palette keys are single chars; '.' is transparent. */

const ICONS = {
  // 🪵 kabuk — a short wooden log with cut-end growth rings on the right.
  bark: {
    palette: {
      d: '#4a2e16', // dark outline / bark shadow
      b: '#8a5a2b', // bark mid
      h: '#a9713c', // bark highlight
      r: '#d9a866', // cut wood (light)
      c: '#b07d40', // ring line
      k: '#caa05c', // ring mid
    },
    grid: [
      '................',
      '................',
      '....dddddddd....',
      '..ddbbbbbbbbrd..',
      '.dbhhbbbbbrkcrd.',
      '.dbbbbbbbbrckrd.',
      '.dbhbbbbbbrkcrd.',
      '.dbbbbbbbbrckrd.',
      '.dbbhbbbbbrkcrd.',
      '.dbbbbbbbbrcrrd.',
      '..ddbbbbbbbrdd..',
      '....dddddddd....',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // 🍃 yaprak — a single diagonal leaf with a centre vein and a short stem.
  leaf: {
    palette: {
      d: '#2c7a36', // dark edge
      g: '#57c84d', // leaf body
      l: '#9be86f', // highlight
      v: '#def0c2', // vein
      s: '#6e4a26', // stem
    },
    grid: [
      '.......d........',
      '......dgd.......',
      '......dgd.......',
      '.....dgvgd......',
      '.....dlvgd......',
      '....dglvggd.....',
      '....dglvggd.....',
      '...dglgvgggd....',
      '...dgggvgggd....',
      '...dgggvgggd....',
      '....dggvggd.....',
      '.....dgvgd......',
      '......dgd.......',
      '.......s........',
      '.......s........',
      '................',
    ],
  },

  // 🪶 tüy — a feather: soft barbs either side of a central shaft.
  feather: {
    palette: {
      d: '#5d86a8', // edge
      f: '#bcd8ef', // barb body
      l: '#eaf5ff', // highlight
      s: '#5a6b78', // shaft
    },
    grid: [
      '................',
      '..........ff....',
      '.........flsf...',
      '.........lsf....',
      '........flsf....',
      '........lsff....',
      '.......flsf.....',
      '.......lsf......',
      '......flsf......',
      '......lsf.......',
      '.....flsf.......',
      '.....lsf........',
      '.....sf.........',
      '....ss..........',
      '....s...........',
      '................',
    ],
  },

  // 🔒 locked state — padlock with a gold body and a keyhole.
  lock: {
    palette: { s: '#aeb7c2', g: '#ffce5a', h: '#e0a93b', k: '#5b4a1e', d: '#9a6e1e' },
    grid: [
      '................',
      '......ssss......',
      '.....s....s.....',
      '.....s....s.....',
      '.....s....s.....',
      '...gggggggggg...',
      '...gggggggggg...',
      '...ggggkkgggg...',
      '...gggkkkkggg...',
      '...ggggkkgggg...',
      '...gghhhhhhgg...',
      '...gggggggggg...',
      '...dddddddddd...',
      '................',
      '................',
      '................',
    ],
  },

  // 🐾 air-strike — a clean black paw print (four toe beans + a big pad).
  claw: {
    palette: { d: '#2c2d36', e: '#43454f' },
    grid: [
      '................',
      '.....ee..ee.....',
      '..ee.dd..dd.ee..',
      '..dd.dd..dd.dd..',
      '..dd........dd..',
      '................',
      '....eeeeeeee....',
      '...dddddddddd...',
      '..dddddddddddd..',
      '..dddddddddddd..',
      '..dddddddddddd..',
      '...dddddddddd...',
      '....dddddddd....',
      '......dddd......',
      '................',
      '................',
    ],
  },

  // 🛡️ dodge — shield with a centre emblem.
  shield: {
    palette: { d: '#3f7fae', b: '#6ec8eb', l: '#bfeaff', w: '#eafaff' },
    grid: [
      '................',
      '...dddddddd.....',
      '..dbbbbbbbbd....',
      '..dblbbbbbbd....',
      '..dbbbwwbbbd....',
      '..dbbwwwwbbd....',
      '..dbbbwwbbbd....',
      '..dbbbbbbbbd....',
      '...dbbbbbbd.....',
      '...dbbbbbbd.....',
      '....dbbbbd......',
      '.....dbbd.......',
      '......dd........',
      '................',
      '................',
      '................',
    ],
  },

  // ☯️ warm/calm start — a yin-yang (balance, calm).
  yinyang: {
    palette: { w: '#e6ebf0', b: '#2b2d37' },
    grid: [
      '.......bb.......',
      '....bbbbbbbw....',
      '...bbbbbbbbww...',
      '..bbbbbwwbbbww..',
      '.bbbbbwwwwbbwww.',
      '.bbbbbbwwbbbwww.',
      '.bbbbbbbbbbwwww.',
      'bbbbbbbbbbwwwwww',
      'bbbbbbwwwwwwwwww',
      '.bbbbwwwwwwwwww.',
      '.bbbwwwbbwwwwww.',
      '.bbbwwbbbbwwwww.',
      '..bbwwwbbwwwww..',
      '...bbwwwwwwww...',
      '....bwwwwwww....',
      '.......ww.......',
    ],
  },

  // 💨 sprint — three bold wind gusts with hooked tails.
  wind: {
    palette: { w: '#cfe8f5', l: '#eef7fc' },
    grid: [
      '................',
      '................',
      '....wwwwwwww....',
      '...wwwwwwwww....',
      '..........ww....',
      '..wwwwwwwwww....',
      '.wwwwwwwwwww....',
      '..........ww....',
      '...wwwwwwww.....',
      '..wwwwwwwww.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ✨ sprint bonus — a bold four-point sparkle.
  spark: {
    palette: { s: '#ffd86b', l: '#fffbe8' },
    grid: [
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '......ssss......',
      '......slls......',
      '.....slllls.....',
      '....ssllllss....',
      'ssssssslllssssss',
      'ssssssslllssssss',
      '....ssllllss....',
      '.....slllls.....',
      '......slls......',
      '......ssss......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
    ],
  },

  // 💥 smash / sprint-smash — an eight-spike burst.
  burst: {
    palette: { o: '#ff8a3c', y: '#ffe08a' },
    grid: [
      '................',
      '.......o........',
      '.o.....o.....o..',
      '..o....y....o...',
      '...o..yyy..o....',
      '....oyyyyyo.....',
      '.....yyyyy......',
      'ooooooyyyooooo..',
      '.....yyyyy......',
      '....oyyyyyo.....',
      '...o..yyy..o....',
      '..o....y....o...',
      '.o.....o.....o..',
      '.......o........',
      '................',
      '................',
    ],
  },

  // 🧘 focus (shortens charge time) — a clock ringed by a circular arrow.
  focus: {
    palette: { r: '#ffce5a', a: '#ffe08a', h: '#2c2d36' },
    grid: [
      '.......aa.......',
      '......aaaa......',
      '.....rr..rr.....',
      '...rr......rr...',
      '..r..........r..',
      '..r....h.....r..',
      '.r.....h......r.',
      '.r.....hhhh...r.',
      '.r...........r..',
      '..r.........r...',
      '..r.........r...',
      '...rr......rr...',
      '.....rrrrrr.....',
      '................',
      '................',
      '................',
    ],
  },

  // 🍀 feather luck — a four-leaf clover with a stem.
  clover: {
    palette: { g: '#5ec257', d: '#2c7a36', s: '#6e4a26' },
    grid: [
      '................',
      '...gg....gg.....',
      '..gggg..gggg....',
      '..gggg..gggg....',
      '...gg.dd.gg.....',
      '......dd........',
      '...gg.dd.gg.....',
      '..gggg..gggg....',
      '..gggg..gggg....',
      '...gg.ss.gg.....',
      '......ss........',
      '......ss........',
      '......ss........',
      '................',
      '................',
      '................',
    ],
  },

  // ➕ dodge count — a bold plus.
  plus: {
    palette: { g: '#7ee06a', d: '#3f9a42' },
    grid: [
      '................',
      '................',
      '......gggg......',
      '......gggg......',
      '......gggg......',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '..gggggggggggg..',
      '......gggg......',
      '......gggg......',
      '......gggg......',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // 🏁 milestone — a checkered flag on a pole.
  flag: {
    palette: { p: '#9aa3ad', b: '#2a2a2a', w: '#eef2f5' },
    grid: [
      '................',
      '..p.............',
      '..pbwbwbw.......',
      '..pwbwbwb.......',
      '..pbwbwbw.......',
      '..pwbwbwb.......',
      '..p.............',
      '..p.............',
      '..p.............',
      '..p.............',
      '..p.............',
      '..p.............',
      '..p.............',
      '..ppppp.........',
      '................',
      '................',
    ],
  },

  // 🎮 runs played — a game controller.
  gamepad: {
    palette: { d: '#3a4654', k: '#cfd6dd' },
    grid: [
      '................',
      '................',
      '................',
      '..dddddddddd....',
      '.dddddddddddd...',
      '.dkdddddddkdd...',
      '.ddkddddddddd...',
      '.dkdddddddkdd...',
      '.dddddddddddd...',
      '.ddd......ddd...',
      '..dd......dd....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // 🦘 jumps — an up arrow over a leap arc.
  jump: {
    palette: { a: '#9be86f', d: '#3f9a42' },
    grid: [
      '................',
      '.......a........',
      '......aaa.......',
      '.....aaaaa......',
      '....aaaaaaa.....',
      '...aa.aaa.aa....',
      '......aaa.......',
      '......aaa.......',
      '......aaa.......',
      '................',
      '..d..........d..',
      '...d........d...',
      '....dddddddd....',
      '................',
      '................',
      '................',
    ],
  },

  // 🏆 achievements — a trophy cup with handles.
  trophy: {
    palette: { g: '#ffce5a', h: '#e0a93b' },
    grid: [
      '................',
      '..gggggggggg....',
      '..ghhhhhhhhg....',
      'g.ghhhhhhhhg.g..',
      'g.ghhhhhhhhg.g..',
      'g.gghhhhhhgg.g..',
      'gg..ghhhhg..gg..',
      '.....ghhg.......',
      '......gg........',
      '......gg........',
      '.....gggg.......',
      '....gggggg......',
      '...gggggggg.....',
      '...gggggggg.....',
      '................',
      '................',
    ],
  },

  // ⚙ settings — a cog (procedural, 32x32): 8 teeth, bevel shading, hollow bore.
  gear: {
    palette: {
      o: '#283039', // outline / inner contour
      b: '#6e8196', // body mid
      h: '#9cb0c1', // body highlight (upper-left)
      s: '#54647a', // body shadow (lower-right)
    },
    grid: makeGearGrid(),
  },

  // ⏸ pause — two vertical bars.
  pause: {
    palette: { d: '#e6edf3' },
    grid: [
      '................',
      '................',
      '................',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '....ddd..ddd....',
      '................',
      '................',
      '................',
    ],
  },

  // ✓ reward claimed — a bold green checkmark.
  check: {
    palette: { g: '#7ee06a', d: '#3f9a42' },
    grid: [
      '................',
      '................',
      '............gg..',
      '...........gg...',
      '..........gg....',
      '..gg.....gg.....',
      '..dgg...gg......',
      '...dgg.gg.......',
      '....dgggg.......',
      '.....dgg........',
      '......d.........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // 📺 watch-ad reward — a television.
  tv: {
    palette: { d: '#3a4654', s: '#6ec8eb', l: '#bfeaff', a: '#9aa3ad' },
    grid: [
      '....a....a......',
      '.....a..a.......',
      '......aa........',
      '......aa........',
      '..dddddddddd....',
      '..dssssssssd....',
      '..dssssssssd....',
      '..dsslsssssd....',
      '..dssssssssd....',
      '..dssssssssd....',
      '..dssssssssd....',
      '..dddddddddd....',
      '...d......d.....',
      '..dd......dd....',
      '................',
      '................',
    ],
  },
};

function svgFor(def) {
  const grid = def.grid;
  const h = grid.length;
  const w = grid[0].length;

  // Auto-center: find the bounding box of filled cells and shift everything so
  // the drawn shape sits centered in the WxH canvas (integer offset keeps the
  // pixel grid crisp). This way the authored ASCII doesn't need to be perfectly
  // centered by hand — off-center art is corrected on generation.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (ch && ch !== '.') {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const offX = maxX < 0 ? 0 : Math.round((w - 1 - maxX - minX) / 2);
  const offY = maxY < 0 ? 0 : Math.round((h - 1 - maxY - minY) / 2);

  const rects = [];
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    let x = 0;
    while (x < w) {
      const ch = row[x];
      if (ch === '.' || ch === undefined) { x++; continue; }
      let run = 1;
      while (x + run < w && row[x + run] === ch) run++;
      const color = def.palette[ch];
      if (!color) throw new Error(`Unknown palette char '${ch}'`);
      rects.push(`<rect x="${x + offX}" y="${y + offY}" width="${run}" height="1" fill="${color}"/>`);
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects.join('')}</svg>\n`;
}

mkdirSync(OUT, { recursive: true });
for (const [name, def] of Object.entries(ICONS)) {
  // Validate row widths early so a typo is obvious.
  const w = def.grid[0].length;
  def.grid.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: row ${i} is ${r.length} wide, expected ${w}`);
  });
  const file = resolve(OUT, `${name}.svg`);
  writeFileSync(file, svgFor(def));
  console.log(`wrote ${file}`);
}

// Emit the per-icon `.gi-<key>` background rules so the CSS can never drift from
// the SVG set. The `.gi` base rule lives in css/style.css; this file is linked
// from index.html right after it.
const cssRules = Object.keys(ICONS)
  .map(name => `.gi-${name} { background-image: url(../assets/icons/game/${name}.svg); }`)
  .join('\n');
const cssFile = resolve(ROOT, 'css/icons.css');
writeFileSync(cssFile, `/* AUTO-GENERATED by tools/gen-icons.mjs — do not edit by hand. */\n${cssRules}\n`);
console.log(`wrote ${cssFile}`);

console.log(`done — ${Object.keys(ICONS).length} icons`);
