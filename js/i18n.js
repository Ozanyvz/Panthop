const SUPPORTED = ['tr', 'en'];
// Device languages we do not ship land here. English reaches far more of them
// than Turkish does, and a Turkish device is already caught by the
// navigator.language check below, so this costs tr players nothing.
const FALLBACK = 'en';
const STORAGE_KEY = 'wj_lang_v1';

const memoryCache = new Map();
const listeners = new Set();

let currentLang = FALLBACK;
let currentDict = {};

function detectInitialLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  return SUPPORTED.includes(nav) ? nav : FALLBACK;
}

async function loadDict(lang) {
  if (memoryCache.has(lang)) return memoryCache.get(lang);
  const res = await fetch(`i18n/${lang}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`i18n load failed: ${lang}`);
  const dict = await res.json();
  memoryCache.set(lang, dict);
  return dict;
}

function lookup(dict, key) {
  return key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), dict);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

export function t(key, vars) {
  const v = lookup(currentDict, key);
  if (v == null) return key;
  return typeof v === 'string' ? interpolate(v, vars) : v;
}

export function getLang() { return currentLang; }
export function supported() { return SUPPORTED.slice(); }

// Returns [{ code, name }] for all supported languages. Loads any missing dicts into memory cache.
export async function supportedWithNames() {
  await Promise.all(SUPPORTED.map(l => loadDict(l).catch(() => null)));
  return SUPPORTED.map(code => {
    const dict = memoryCache.get(code);
    const name = (dict && dict.lang && dict.lang.name) || code.toUpperCase();
    return { code, name };
  });
}

export async function setLang(lang) {
  if (!SUPPORTED.includes(lang)) lang = FALLBACK;
  currentDict = await loadDict(lang);
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  applyDOM();
  listeners.forEach(fn => { try { fn(lang); } catch {} });
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyDOM(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    // format: "attr:key, attr2:key2"
    const spec = el.getAttribute('data-i18n-attr');
    spec.split(',').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s && s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
  const titleKey = document.documentElement.getAttribute('data-i18n-title');
  if (titleKey) document.title = t(titleKey);
}

export async function init() {
  const lang = detectInitialLang();
  await setLang(lang);
}
