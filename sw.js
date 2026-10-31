'use strict';


const CACHE_VERSION = '5.4';
const SHELL_CACHE = 'gargo-shell-' + CACHE_VERSION;
const RUNTIME_CACHE = 'gargo-runtime-v1';
const TILE_CACHE = 'gargo-tiles-v1';
const TILE_MAX = 400;

const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './royal.css',
  './glass.css',
  './nav-shell.css',
  './gargo-colors.css',
  './mobile.css',
  './tablet.css',
  './js/tablet.js',
  './js/branding.js',
  './js/core-state.js',
  './js/core-db.js',
  './js/offline.js',
  './js/client-auth.js',
  './js/trucks-drivers.js',
  './js/dispatch-trips.js',
  './js/depot-ops.js',
  './js/interchange-shutouts.js',
  './js/vessel-prestaking.js',
  './js/maintenance-fuel-workshop.js',
  './js/invoicing.js',
  './js/allocation.js',
  './js/tracking.js',
  './js/reports-audit.js',
  './js/admin-ui-shell.js',
  './js/nav-compat.js',
  './js/navigation.js',
  './js/nav-shell.js',
  './js/bootstrap.js',
  './js/ghd-tariff-schedule.js',
  './js/pil-tariff-schedule.js',
  './js/service-rate-schedule.js',
  './js/booking-documents.js',
  './js/clerk-tools.js',
  './js/payroll-config.js',
  './js/finance.js',
  './js/hr.js',
  './js/finance-suite.js',
  './js/erp-hub.js',
  './js/finance-corp.js',
  './js/finance-billing.js',
  './js/hr-users.js',
  './js/ic-remote.js',
  './js/form-designer.js',
  './js/survey-currency.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Pre-cached so the app can start offline on the very first visit's second launch.
const CDN_FILES = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

const CDN_HOSTS = new Set([
  'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
]);
const TILE_HOSTS = new Set(['tile.openstreetmap.org', 'server.arcgisonline.com']);
const NEVER_HOST = /(^|\.)supabase\.(co|in)$|(^|\.)wialon\.com$/i;

/* ── install: one bad file must not block the whole install ─────────── */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_FILES.map(async (f) => {
      const res = await fetch(new Request(f, { cache: 'reload' }));
      if (!res.ok) throw new Error(f + ' -> ' + res.status);
      await shell.put(f, res);
    }));
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.allSettled(CDN_FILES.map(async (u) => {
      if (await runtime.match(u)) return;
      const res = await fetch(u, { mode: 'cors', credentials: 'omit' });
      if (res.ok) await runtime.put(u, res);
    }));
  })());
  self.skipWaiting();
});

/* ── activate: drop old versions, then tell open pages (upgrades only) ─ */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE, TILE_CACHE]);
    const keys = await caches.keys();
    const isUpgrade = keys.some((k) => !keep.has(k) && k.indexOf('gargo-legacy') !== 0);
    await Promise.all(keys.filter((k) => !keep.has(k) && k.indexOf('gargo-legacy') !== 0).map((k) => caches.delete(k)));
    await self.clients.claim();
    if (isUpgrade) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
    }
  })());
});

/* ── helpers ────────────────────────────────────────────────────────── */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}


async function corsFetch(req) {
  try {
    const res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    if (res && res.ok) return res;
  } catch (e) { /* fall through */ }
  return fetch(req);
}

async function networkFirstNav(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch (e) {
    return (await cache.match('./index.html')) || (await cache.match('./')) ||
      new Response('Offline — open Gargo once while online to enable offline use.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

function staleWhileRevalidate(event, cacheName) {
  return caches.open(cacheName).then(async (cache) => {
    const cached = await cache.match(event.request);
    const network = fetch(event.request)
      .then((res) => { if (res && res.ok) cache.put(event.request, res.clone()); return res; })
      .catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    return (await network) || new Response('Offline', { status: 503, statusText: 'Offline' });
  });
}

async function cacheFirst(req, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  const res = await corsFetch(req);
  if (res && res.ok) {
    await cache.put(req.url, res.clone());
    if (maxEntries) trim(cacheName, maxEntries);
  }
  return res;
}

/* ── fetch routing ──────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (NEVER_HOST.test(url.hostname)) return;                 // live data: always straight to the network
  if (url.origin === self.location.origin && url.pathname.indexOf('/legacy/') === 0) return;   // legacy-bypass: the compatibility build has its own worker

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') { event.respondWith(networkFirstNav(req)); return; }
    if (url.pathname === '/sw.js') return;
    event.respondWith(staleWhileRevalidate(event, SHELL_CACHE));
    return;
  }
  if (TILE_HOSTS.has(url.hostname)) { event.respondWith(cacheFirst(req, TILE_CACHE, TILE_MAX)); return; }
  if (CDN_HOSTS.has(url.hostname)) { event.respondWith(cacheFirst(req, RUNTIME_CACHE)); return; }
});