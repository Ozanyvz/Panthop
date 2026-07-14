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
   The panther artwork lives in assets/character/. All three are 5×5 sheets of
   256px cells (25 frames each). A frame is shown by sizing the texture's
   repeat window to one cell and sliding its offset to that cell (UV origin is
   bottom-left, so rows count up from the bottom). The art faces LEFT by
   default. */
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
    idle: configureAnim(loader.load(url('panther-idle.png')), 5, 5, 25, 10, 1.25),
    walk: configureAnim(loader.load(url('panther-walk.png')), 5, 5, 25, 16, 1.18),
    jump: configureAnim(loader.load(url('panther-jump.png')), 5, 5, 25, 0, 1.08),
    attack: configureAnim(loader.load(url('panther-attack.png')), 5, 5, 25, 0, 1.08),
    charge: configureAnim(loader.load(url('panther-charge.png')), 5, 5, 25, 12, 1.05),
    death: configureAnim(loader.load(url('panther-death.png')), 5, 5, 25, 12, 1.2),
    land: configureAnim(loader.load(url('panther-land.png')), 5, 5, 25, 45, 1.15),
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

/* Shared loader for the tree art pieces cropped out of assets/tree.png. */
function loadPixelAsset(file, { mirrorY = false, flipX = false } = {}) {
  const url = new URL(`../assets/${file}`, import.meta.url).href;
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 1;
  tex.wrapS = THREE.RepeatWrapping;
  // Mirrored vertical wrap makes a non-tileable strip seamless when repeated.
  tex.wrapT = mirrorY ? THREE.MirroredRepeatWrapping : THREE.ClampToEdgeWrapping;
  if (flipX) { tex.repeat.x = -1; tex.offset.x = 1; }
  return tex;
}

/* ---------- Wall: trunk strip cropped from the tree art (tiles vertically) ---------- */
export function loadWallTexture() {
  return loadPixelAsset('tree-trunk.png', { mirrorY: true });
}

/* ---------- Wall Obstacle: branch cropped from the tree art ----------
   The art points RIGHT (grows off the left wall); flipped for the right wall. */
export function loadBranchTexture(pointingRight) {
  return loadPixelAsset('tree-branch.png', { flipX: !pointingRight });
}

/* ---------- Wall base: root flare + grass from the tree art ---------- */
export function loadRootTexture(flipX = false) {
  return loadPixelAsset('tree-root.png', { flipX });
}

/* ---------- Wall: pixel-art tree-trunk bark (procedural fallback, unused) ----------
   Low-res (POT 32×64 so RepeatWrapping is safe) and nearest-filtered. Bark is
   built from full-height columns so the top/bottom edges always meet seamlessly. */
export function makeWallTexture() {
  const w = 32;
  const h = 64;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  // Full-height bark columns — rich red-brown wood (reference: big pixel-art
  // redwood): mostly mid tones, ridged by regular dark grooves and the
  // occasional sunlit ridge.
  const shades = ['#4a2517', '#57301c', '#653821', '#714026', '#7d482a'];
  for (let x = 0; x < w; x++) {
    g.fillStyle = shades[(Math.random() * shades.length) | 0];
    g.fillRect(x, 0, 1, h);
    if (x % 4 === 3) {                       // groove between bark ridges
      g.fillStyle = 'rgba(38,17,9,0.8)';
      g.fillRect(x, 0, 1, h);
    } else if (Math.random() < 0.12) {       // sunlit ridge edge
      g.fillStyle = '#96613a';
      g.fillRect(x, 0, 1, h);
    }
  }

  // Darker / lighter grain streaks — full height, so they tile too
  for (let i = 0; i < 9; i++) {
    const x = (Math.random() * w) | 0;
    g.fillStyle = Math.random() < 0.6 ? 'rgba(30,14,7,0.55)' : 'rgba(160,104,60,0.4)';
    g.fillRect(x, 0, 1, h);
  }

  // Knots — kept clear of the top/bottom seam, ringed light-over-dark
  for (let i = 0; i < 3; i++) {
    const kx = 3 + ((Math.random() * (w - 9)) | 0);
    const ky = 8 + ((Math.random() * (h - 20)) | 0);
    g.fillStyle = 'rgba(150,97,58,0.55)';
    g.fillRect(kx - 1, ky - 1, 6, 7);
    g.fillStyle = '#3f2113';
    g.fillRect(kx, ky, 4, 5);
    g.fillStyle = '#1d0d06';
    g.fillRect(kx + 1, ky + 1, 2, 2);
  }

  // Trunk outline on both edges (the same texture serves the left and right
  // wall) — the dark rim reads as the tree's silhouette against the gap.
  g.fillStyle = '#1d0d06';
  g.fillRect(0, 0, 1, h);
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = 'rgba(38,17,9,0.75)';
  g.fillRect(1, 0, 1, h);
  g.fillRect(w - 2, 0, 1, h);

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

  // Reference-style chunky limb: dark outline, red-brown body, lit top edge,
  // thick at the trunk and tapering to a broken tip.
  const OUT = '#2b140c';   // outline / broken tip
  const DK = '#5d3220';    // underside shadow
  const MID = '#8a4a2b';   // body wood
  const LT = '#b06a38';    // upper body
  const HI = '#c98a4e';    // sunlit top edge
  const LF1 = '#2c6e34', LF2 = '#4c9440', LF3 = '#66b04c';   // foliage

  // Outline pass (stepped taper)
  r(0, 6, 10, 8, OUT);
  r(10, 7, 8, 6, OUT);
  r(18, 8, 6, 4, OUT);
  r(24, 9, 5, 2, OUT);
  // Wood fill, one pixel inside the outline
  r(1, 7, 9, 6, MID);
  r(10, 8, 8, 4, MID);
  r(18, 9, 6, 2, MID);
  // Lit top edge + upper body
  r(1, 7, 9, 2, LT);
  r(1, 7, 9, 1, HI);
  r(10, 8, 8, 1, LT);
  r(18, 9, 6, 1, LT);
  // Underside shadow
  r(1, 12, 9, 1, DK);
  r(10, 11, 8, 1, DK);
  r(18, 10, 6, 1, DK);
  // Broken tip (the dangerous end)
  r(24, 9, 4, 1, DK);
  r(28, 9, 2, 1, OUT);
  // Snapped-off upward stub near the trunk (reference branches)
  r(4, 3, 3, 4, OUT);
  r(5, 4, 1, 3, MID);
  // Knot on the base
  r(2, 9, 3, 3, DK);
  r(3, 10, 1, 1, OUT);
  // Bark grain notches
  r(8, 9, 1, 3, 'rgba(43,20,12,0.5)');
  r(14, 9, 1, 2, 'rgba(43,20,12,0.5)');
  // Foliage: cluster over the stub + a small tuft under the limb
  r(2, 0, 8, 3, LF1);
  r(3, 0, 6, 2, LF2);
  r(4, 0, 3, 1, LF3);
  r(12, 13, 4, 2, LF1);
  r(13, 13, 2, 1, LF2);

  g.restore();
  return pixelTexture(c);
}

/* ---------- Mid-air Obstacle: hovering eagle (AutoSprite sheets) ----------
   Same 5×5/256px sheet format as the character. `idle` and `scared` are
   shared hover-flap loops — one texture write animates every bird in sync
   (scared plays when an armed Pantho gets close); `death` gets cloned per
   dying bird so each plays its own knock-out tumble. */
export function loadEagleAnimations() {
  const loader = new THREE.TextureLoader();
  const url = (file) => new URL(`../assets/character/${file}`, import.meta.url).href;
  return {
    idle: configureAnim(loader.load(url('eagle-idle.png')), 5, 5, 25, 12, 1),
    scared: configureAnim(loader.load(url('eagle-scared.png')), 5, 5, 25, 12, 1),
    death: configureAnim(loader.load(url('eagle-death.png')), 5, 5, 25, 36, 1),
  };
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

/* ---------- Floor / ground: hand-made pixel-art asset ----------
   assets/grassground.png (1100x830, watermark/borders cropped, blade tips
   alpha-keyed against the sky). Mirrored horizontal wrap hides the seam when
   the band tiles across the view. */
export function loadGroundTexture() {
  const url = new URL('../assets/grassground.png', import.meta.url).href;
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 1;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/* ---------- Floor / ground at bottom (procedural fallback, unused) ---------- */
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
