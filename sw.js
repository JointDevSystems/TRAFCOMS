const CACHE_VERSION = '3.3';

const STATIC_FILES = [
  './icons/icon-192.png',
  './icons/icon-512.png',
]; 

const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './js/branding.js',
  './js/core-state.js',
  './js/core-db.js',
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
  './js/bootstrap.js',
  './js/ghd-tariff-schedule.js',
  './js/service-rate-schedule.js',
  './js/booking-documents.js',
  './js/clerk-tools.js',
  './manifest.json',
];

const ALL_FILES = [...SHELL_FILES, ...STATIC_FILES];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ALL_FILES))
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '/')) || (f === './' && url.pathname === '/'));

  if (isShellFile) {
   
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

 
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});