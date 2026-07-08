import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function canvasToTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.anisotropy = 1;
  tex.needsUpdate = true;
  return tex;
}

/* Crisp, blocky upscaling for the low-resolution pixel-art world textures. */
function pixelTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 1;
  tex.needsUpdate = true;
  return tex;
}

/* ---------- Character: animated sprite sheets (idle / walk / jump) ----------
   The panther artwork lives in assets/character/. `panther-walk` and
   `panther-jump` are 5×5 sheets of 256px cells (25 frames each); the idle pose
   is a single image. A frame is shown by sizing the texture's repeat window to
   one cell and sliding its offset to that cell (UV origin is bottom-left, so
   rows count up from the bottom). The art faces LEFT by default. */
const SHEET_CELL = 256;

function configureAnim(texture, cols, rows, frameCount, fps, scale) {
  texture.colorSpace = THREE.SRGBColorSpace; // PNGs are sRGB-encoded artwork
  texture.magFilter = THREE.NearestFilter;   // crisp pixel-art cells
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;           // mipmaps would bleed across cells
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const fw = 1 / cols;
  const fh = 1 / rows;
  // Half-texel inset so a frame never samples its neighbour across a cell seam.
  const epsU = cols > 1 ? 0.5 / (cols * SHEET_CELL) : 0;
  const epsV = rows > 1 ? 0.5 / (rows * SHEET_CELL) : 0;
  texture.repeat.set(fw - 2 * epsU, fh - 2 * epsV);
  texture.offset.set(epsU, 1 - fh + epsV);   // frame 0 = top-left cell

  return { texture, cols, rows, frameCount, fps, scale, fw, fh, epsU, epsV, frame: -1 };
}

export function loadCharacterAnimations() {
  const loader = new THREE.TextureLoader();
  const url = (file) => new URL(`../assets/character/${file}`, import.meta.url).href;
  // `scale` is the world size of the character plane per animation, tuned so the
  // visible cat stays the same size despite the cells having different padding.
  return {
    idle: configureAnim(loader.load(url('black-panther-sitting-and-looking-at-camera-f135.png')), 1, 1, 1, 1, 0.95),
    walk: configureAnim(loader.load(url('panther-walk.png')), 5, 5, 25, 16, 1.3),
    jump: configureAnim(loader.load(url('panther-jump.png')), 5, 5, 25, 0, 1.3),
  };
}

/* Slide an animation's texture window onto frame `i` (counting left-to-right,
   top-to-bottom). No-op when already on that frame. */
export function setAnimFrame(anim, i) {
  if (i === anim.frame) return;
  anim.frame = i;
  const col = i % anim.cols;
  const row = Math.floor(i / anim.cols);
  anim.texture.offset.x = col * anim.fw + anim.epsU;
  anim.texture.offset.y = 1 - (row + 1) * anim.fh + anim.epsV;
}

/* ---------- Wall: pixel-art tree-trunk bark (tileable vertically) ----------
   Low-res (POT 32×64 so RepeatWrapping is safe) and nearest-filtered. Bark is
   built from full-height columns so the top/bottom edges always meet seamlessly. */
export function makeWallTexture() {
  const w = 32;
  const h = 64;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  // Full-height bark columns — warm, saturated wood with bright highlights
  const shades = ['#7a4420', '#9a5a2a', '#b87238', '#d08a44', '#e0a256'];
  for (let x = 0; x < w; x++) {
    g.fillStyle = shades[(Math.random() * shades.length) | 0];
    g.fillRect(x, 0, 1, h);
  }

  // Darker / lighter grain streaks — full height, so they tile too
  for (let i = 0; i < 11; i++) {
    const x = (Math.random() * w) | 0;
    g.fillStyle = Math.random() < 0.58 ? 'rgba(74,38,14,0.55)' : 'rgba(255,206,130,0.45)';
    g.fillRect(x, 0, 1, h);
  }

  // Knots — kept clear of the top/bottom seam, ringed with a warm amber halo
  for (let i = 0; i < 3; i++) {
    const kx = 3 + ((Math.random() * (w - 9)) | 0);
    const ky = 8 + ((Math.random() * (h - 20)) | 0);
    g.fillStyle = 'rgba(224,162,86,0.6)';
    g.fillRect(kx - 1, ky - 1, 6, 7);
    g.fillStyle = '#6e3a18';
    g.fillRect(kx, ky, 4, 5);
    g.fillStyle = '#3a1d0c';
    g.fillRect(kx + 1, ky + 1, 2, 2);
  }

  const tex = pixelTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ---------- Wall Obstacle: pixel-art tree branch reaching into the gap ----------
   30×18 keeps square pixels for the 1.0×0.6 quad. Roots on the LEFT, reaches
   RIGHT to a sharp tip; flipped for the right-hand wall. */
export function makeWallSpikeTexture(pointingRight) {
  const w = 30;
  const h = 18;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const r = (x, y, rw, rh, col) => { g.fillStyle = col; g.fillRect(x, y, rw, rh); };

  g.save();
  if (!pointingRight) { g.translate(w, 0); g.scale(-1, 1); }

  // Main limb (dark base, mid body, top hilite) — warm saturated wood
  r(1, 7, 21, 5, '#6e3a18');
  r(1, 7, 21, 3, '#a05f2c');
  r(1, 7, 21, 1, '#d08a44');
  // Taper toward the tip
  r(22, 8, 4, 3, '#6e3a18');
  r(22, 8, 4, 1, '#a05f2c');
  // Sharp broken tip (the dangerous end)
  r(26, 9, 3, 1, '#4a2410');
  r(29, 9, 1, 1, '#4a2410');
  // Bark grain notches
  r(7, 8, 1, 3, 'rgba(60,29,12,0.5)');
  r(14, 8, 1, 3, 'rgba(60,29,12,0.5)');
  // Twig + leaves — vivid foliage greens
  r(10, 4, 1, 3, '#a05f2c');
  r(11, 3, 1, 2, '#a05f2c');
  r(11, 1, 3, 2, '#4fd055');
  r(12, 2, 1, 1, '#2faa42');
  r(7, 12, 3, 2, '#4fd055');
  r(8, 13, 1, 1, '#2faa42');

  g.restore();
  return pixelTexture(c);
}

/* ---------- Mid-air Obstacle: pixel-art diving bird of prey ----------
   16×16 dark winged silhouette with fierce yellow eyes and a hooked beak. */
export function makeSawTexture() {
  const size = 16;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

  const DARK = '#241038';   // deep indigo outline
  const BODY = '#6a34a8';   // vivid purple body
  const WING = '#9a54e0';   // bright wing / belly highlight
  const BEAK = '#ff8a1a';   // vivid orange beak + talons
  const EYE = '#ffe23a';    // bright yellow eyes

  // Spread wings (symmetric), stepped feather tips
  r(0, 7, 16, 2, DARK);
  r(1, 6, 4, 1, DARK); r(11, 6, 4, 1, DARK);
  r(2, 9, 3, 1, DARK); r(11, 9, 3, 1, DARK);
  // Bright wing streaks
  r(2, 7, 4, 1, WING); r(10, 7, 4, 1, WING);

  // Body + darker outline edges
  r(6, 3, 4, 9, BODY);
  r(5, 6, 1, 5, DARK); r(10, 6, 1, 5, DARK);
  // Belly highlight
  r(7, 8, 2, 3, WING);
  // Head
  r(6, 3, 4, 2, DARK);
  r(6, 4, 1, 1, EYE); r(9, 4, 1, 1, EYE);
  // Hooked beak
  r(7, 2, 2, 1, BEAK); r(7, 1, 1, 1, BEAK);
  // Tail + talons
  r(7, 12, 2, 2, DARK);
  r(6, 12, 1, 1, BEAK); r(9, 12, 1, 1, BEAK);

  return pixelTexture(c);
}

/* ---------- Background: bright daytime sky ---------- */
export function makeBackgroundTexture() {
  const w = 256;
  const h = 512;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');

  // Day sky: deeper blue up top → soft hazy blue near the horizon
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#3f9be0');
  grad.addColorStop(0.5, '#7ec6f2');
  grad.addColorStop(1, '#d6f1ff');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // Sun with a soft glow
  const sunX = w * 0.74;
  const sunY = h * 0.15;
  const sunR = 30;
  const glow = g.createRadialGradient(sunX, sunY, 6, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, 'rgba(255,246,200,0.95)');
  glow.addColorStop(0.4, 'rgba(255,235,160,0.45)');
  glow.addColorStop(1, 'rgba(255,235,160,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(sunX, sunY, sunR * 2.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff4c4';
  g.beginPath();
  g.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  g.fill();

  // Fluffy clouds
  function cloud(cx, cy, s) {
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath();
    g.arc(cx, cy, 18 * s, 0, Math.PI * 2);
    g.arc(cx + 20 * s, cy + 4 * s, 14 * s, 0, Math.PI * 2);
    g.arc(cx - 20 * s, cy + 5 * s, 13 * s, 0, Math.PI * 2);
    g.arc(cx + 5 * s, cy - 10 * s, 13 * s, 0, Math.PI * 2);
    g.fill();
    g.fillRect(cx - 30 * s, cy + 2 * s, 60 * s, 10 * s);
  }
  cloud(w * 0.28, h * 0.32, 1.0);
  cloud(w * 0.72, h * 0.52, 0.8);
  cloud(w * 0.22, h * 0.70, 0.9);
  cloud(w * 0.62, h * 0.86, 0.7);

  const tex = canvasToTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ---------- Floor / ground at bottom (pixel-art) ---------- */
export function makeGroundTexture() {
  const w = 64;
  const h = 24;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  // Soil bands, darkening downward — warm, saturated earth
  g.fillStyle = '#8a5a30'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#744a26'; g.fillRect(0, 11, w, h);
  g.fillStyle = '#5e3a1c'; g.fillRect(0, 18, w, h);

  // Grass cap with a bright top edge — vivid lush green
  g.fillStyle = '#3fa83a'; g.fillRect(0, 0, w, 5);
  g.fillStyle = '#5fcf4c'; g.fillRect(0, 0, w, 3);
  g.fillStyle = '#9bf06e'; g.fillRect(0, 0, w, 1);

  // Grass blades poking down into the soil
  for (let x = 0; x < w; x += 3) {
    if (Math.random() < 0.5) {
      g.fillStyle = Math.random() < 0.5 ? '#3fa83a' : '#5fcf4c';
      g.fillRect(x + ((Math.random() * 2) | 0), 5, 1, 1 + ((Math.random() * 2) | 0));
    }
  }

  // Pebbles / earth speckle
  for (let i = 0; i < 55; i++) {
    const x = (Math.random() * w) | 0;
    const y = 6 + ((Math.random() * (h - 6)) | 0);
    g.fillStyle = Math.random() < 0.5 ? 'rgba(40,20,8,0.28)' : 'rgba(220,170,110,0.4)';
    g.fillRect(x, y, 1, 1);
  }

  return pixelTexture(c);
}
