// Generates a pixel-art ivy corner (assets/vine-corner.svg). One corner piece is
// flipped four ways in CSS to frame the play area. Authored in a 64×64 grid so it
// scales crisply; trails ~70% along each edge so corners read as vined edges
// without a heavy full border.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const OUTLINE = '#21450B';
const VEIN = '#2B620B';
const FILL = '#387B09';
const MID = '#64B200';
const HI = '#85E901';

const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;

// Pointed leaf growing vertically (dir +1 = down, -1 = up).
function leafV(bx, by, h, a, dir) {
  const band = (aa, dx, col) => {
    let s = '';
    for (let i = 0; i <= h; i++) {
      const w = aa * Math.pow(Math.sin(Math.PI * (i / h)), 0.7);
      if (w < 0.3) continue;
      const x0 = Math.round(bx + dx - w), x1 = Math.round(bx + dx + w);
      s += rect(x0, by + dir * i, x1 - x0 + 1, 1, col);
    }
    return s;
  };
  let s = band(a + 0.8, 0, OUTLINE) + band(a, 0, FILL) + band(a * 0.5, -0.6, MID);
  for (let i = 2; i < h - 1; i++) s += rect(bx, by + dir * i, 1, 1, VEIN);
  return s;
}

// Pointed leaf growing horizontally (dir +1 = right, -1 = left).
function leafH(bx, by, w, a, dir) {
  const band = (aa, dy, col) => {
    let s = '';
    for (let i = 0; i <= w; i++) {
      const h = aa * Math.pow(Math.sin(Math.PI * (i / w)), 0.7);
      if (h < 0.3) continue;
      const y0 = Math.round(by + dy - h), y1 = Math.round(by + dy + h);
      s += rect(bx + dir * i, y0, 1, y1 - y0 + 1, col);
    }
    return s;
  };
  let s = band(a + 0.8, 0, OUTLINE) + band(a, 0, FILL) + band(a * 0.5, -0.6, MID);
  for (let i = 2; i < w - 1; i++) s += rect(bx + dir * i, by, 1, 1, VEIN);
  return s;
}

let body = '';
// Wavy stems trailing along the top and left edges
for (let x = 4; x <= 46; x++) { const y = 3 + ((x % 8 < 4) ? 0 : 1); body += rect(x, y, 1, 2, VEIN) + rect(x, y, 1, 1, FILL); }
for (let y = 4; y <= 46; y++) { const x = 3 + ((y % 8 < 4) ? 0 : 1); body += rect(x, y, 2, 1, VEIN) + rect(x, y, 1, 1, FILL); }
// Corner knot
body += rect(3, 3, 3, 3, VEIN) + rect(3, 3, 2, 2, FILL);
// Leaves dangling inward off the top stem, with a couple peeking over the edge
body += leafV(12, 5, 9, 3, 1) + leafV(22, 5, 8, 3, 1) + leafV(31, 6, 7, 2.5, 1) + leafV(40, 5, 6, 2, 1);
body += leafV(16, 4, 6, 2, -1) + leafV(27, 4, 5, 2, -1);
// Leaves off the left stem
body += leafH(5, 12, 9, 3, 1) + leafH(5, 22, 8, 3, 1) + leafH(6, 31, 7, 2.5, 1) + leafH(5, 40, 6, 2, 1);
body += leafH(4, 16, 6, 2, -1) + leafH(4, 27, 5, 2, -1);
// A few bright specks
for (const [x, y] of [[13, 9], [23, 9], [9, 13], [9, 23]]) body += rect(x, y, 1, 1, HI);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">${body}</svg>`;
writeFileSync(resolve(ROOT, 'assets/vine-corner.svg'), svg);
console.log(`wrote assets/vine-corner.svg (${svg.length} bytes)`);
