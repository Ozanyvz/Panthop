// Builds dist/ for Capacitor sync. Pure Node, no deps.
// Copies the web app files into a clean dist/ directory so Capacitor's
// `cap copy` doesn't bundle node_modules / android / ios into the APK.

import { mkdirSync, rmSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');

const FILES = [
  'index.html',
  'manifest.webmanifest',
  'service-worker.js',
  'css',
  'js',
  'i18n',
  'assets',
  'vendor',        // produced by the VENDOR step below, before this loop runs
];

/* We have no bundler (the app runs on native ESM + an importmap), so every bare
   specifier in that importmap has to resolve to a real file we ship.

   - @capacitor/core: Capacitor plugins' compiled ESM uses extensionless
     relative imports a browser can't resolve, so instead of vendoring each
     plugin we vendor only @capacitor/core (self-contained) and bind to the
     native bridge with registerPlugin() in js/services/providers/*. The native
     plugin code is linked by `cap sync` regardless.
   - three: must NOT come from a CDN. The app would then need the network on
     every cold start (iOS runs no service worker under capacitor://, so there
     is no cache to fall back on), App Store 2.5.2 reads a CDN'd library as
     downloading executable code, and every launch would leak the player's IP to
     a third party the privacy policy doesn't name. The minified build is half
     the size of the readable one and behaves identically.

   Vendoring writes into the REPO ROOT, not straight into dist/, so that
   `npm start` (which serves the root) resolves the same paths the packaged app
   does; FILES then copies vendor/ into dist. Keep these in sync with the
   index.html importmap. */
const VENDOR = [
  { spec: '@capacitor/core', from: 'node_modules/@capacitor/core/dist', to: 'vendor/@capacitor/core' },
  { spec: 'three', from: 'node_modules/three/build/three.module.min.js', to: 'vendor/three/three.module.js' },
];

for (const v of VENDOR) {
  const src = resolve(ROOT, v.from);
  if (!existsSync(src)) { console.warn(`skip vendor (missing): ${v.spec} — run npm install?`); continue; }
  const dest = resolve(ROOT, v.to);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`vendored ${v.spec} -> ${v.to}`);
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const f of FILES) {
  const src = resolve(ROOT, f);
  if (!existsSync(src)) { console.warn(`skip (missing): ${f}`); continue; }
  cpSync(src, resolve(DIST, f), { recursive: true });
  console.log(`copied ${f}`);
}

console.log(`dist ready at ${DIST}`);
