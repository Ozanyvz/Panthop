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
];

// We have no bundler (the app runs on native ESM + an importmap). Capacitor
// plugins' compiled ESM uses extensionless relative imports that a browser
// can't resolve, so instead of vendoring each plugin we vendor only
// @capacitor/core (a self-contained, import-free file) and bind to the native
// bridge with registerPlugin() in js/services/providers/*. The native plugin
// code is linked by `cap sync` regardless. Keep this in sync with the
// index.html importmap entry for "@capacitor/core".
const VENDOR = [
  { spec: '@capacitor/core', from: 'node_modules/@capacitor/core/dist', to: 'vendor/@capacitor/core' },
];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const f of FILES) {
  const src = resolve(ROOT, f);
  if (!existsSync(src)) { console.warn(`skip (missing): ${f}`); continue; }
  cpSync(src, resolve(DIST, f), { recursive: true });
  console.log(`copied ${f}`);
}

for (const v of VENDOR) {
  const src = resolve(ROOT, v.from);
  if (!existsSync(src)) { console.warn(`skip vendor (missing): ${v.spec} — run npm install?`); continue; }
  cpSync(src, resolve(DIST, v.to), { recursive: true });
  console.log(`vendored ${v.spec} -> ${v.to}`);
}

// On Capacitor / file:// the Three.js CDN import works at runtime when online,
// but Android first run may be offline before SW caches it. We inline an
// importmap variant later if needed; for now keep behavior identical to web.
console.log(`dist ready at ${DIST}`);
