/* Panthop service worker — app shell + i18n stale-while-revalidate */
const VERSION = 'wj-v48';
const SHELL_CACHE = `${VERSION}-shell`;
const I18N_CACHE  = `${VERSION}-i18n`;
const CDN_CACHE   = `${VERSION}-cdn`;

const SHELL_URLS = [
  './',
  'index.html',
  'css/style.css',
  'assets/fonts/pressstart2p.woff2',
  'assets/fonts/vt323.woff2',
  'js/main.js',
  'js/game.js',
  'js/audio.js',
  'js/sprites.js',
  'js/storage.js',
  'js/upgrades.js',
  'js/achievements.js',
  'js/i18n.js',
  'js/mobile.js',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-192-maskable.png',
  'assets/icons/icon-512-maskable.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png',
  'assets/character/black-panther-sitting-and-looking-at-camera-f135.png',
  'assets/character/panther-walk.png',
  'assets/character/panther-jump.png',
  'assets/logo-name-panthop.svg',
  'assets/logo-panther.png',
  'assets/vine-corner.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k !== SHELL_CACHE && k !== I18N_CACHE && k !== CDN_CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isSameOrigin(url) { return new URL(url).origin === self.location.origin; }
function isI18nRequest(url) { return new URL(url).pathname.includes('/i18n/') && url.endsWith('.json'); }
function isCdnRequest(url) { return new URL(url).origin === 'https://unpkg.com'; }

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then(res => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || network || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok && request.method === 'GET') cache.put(request, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok && request.method === 'GET') cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = request.url;

  // Navigation: network-first with cached index.html fallback
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('index.html', res.clone());
        return res;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  if (isI18nRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, I18N_CACHE));
    return;
  }

  if (isCdnRequest(url)) {
    event.respondWith(networkFirst(request, CDN_CACHE));
    return;
  }

  if (isSameOrigin(url)) {
    // Network-first so a rebuilt app (new CSS/JS/icons) is picked up immediately
    // instead of being shadowed by a stale cached shell; falls back to cache
    // when offline. On Capacitor the "network" is the local bundle, so this is
    // instant.
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
