(function() {
  var w = window;
  if (typeof w.globalThis === "undefined") w.globalThis = w;
  if (!Object.fromEntries) Object.fromEntries = function(it) {
    var o = {};
    for (var e of it) o[e[0]] = e[1];
    return o;
  };
  if (!Object.hasOwn) Object.hasOwn = function(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  };
  if (!Array.prototype.flat) Array.prototype.flat = function(dp) {
    dp = dp === void 0 ? 1 : dp;
    var r = [];
    (function f(a, d) {
      for (var i = 0; i < a.length; i++) {
        if (Array.isArray(a[i]) && d > 0) f(a[i], d - 1);
        else r.push(a[i]);
      }
    })(this, dp);
    return r;
  };
  if (!Array.prototype.flatMap) Array.prototype.flatMap = function(fn, t) {
    return Array.prototype.map.call(this, fn, t).flat(1);
  };
  if (!String.prototype.padStart) String.prototype.padStart = function(n, s) {
    s = s === void 0 ? " " : String(s);
    var str = String(this);
    if (str.length >= n || !s) return str;
    var p = "";
    while (p.length < n - str.length) p += s;
    return p.slice(0, n - str.length) + str;
  };
  if (!String.prototype.padEnd) String.prototype.padEnd = function(n, s) {
    s = s === void 0 ? " " : String(s);
    var str = String(this);
    if (str.length >= n || !s) return str;
    var p = "";
    while (p.length < n - str.length) p += s;
    return str + p.slice(0, n - str.length);
  };
  if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) {
    return a instanceof RegExp ? this.replace(a, b) : this.split(String(a)).join(b);
  };
  if (!Promise.allSettled) Promise.allSettled = function(a) {
    return Promise.all(Array.prototype.map.call(a, function(p) {
      return Promise.resolve(p).then(function(v) {
        return { status: "fulfilled", value: v };
      }, function(r) {
        return { status: "rejected", reason: r };
      });
    }));
  };
  if (!Promise.prototype.finally) Promise.prototype.finally = function(f) {
    var P = this.constructor || Promise;
    return this.then(function(v) {
      return P.resolve(f()).then(function() {
        return v;
      });
    }, function(e) {
      return P.resolve(f()).then(function() {
        throw e;
      });
    });
  };
  if (!w.queueMicrotask) w.queueMicrotask = function(f) {
    Promise.resolve().then(f);
  };
  if (typeof w.AbortController === "undefined") {
    w.AbortController = function() {
      var l = [], s = { aborted: false, addEventListener: function(t, f) {
        l.push(f);
      }, removeEventListener: function() {
      } };
      this.signal = s;
      this.abort = function() {
        if (s.aborted) return;
        s.aborted = true;
        for (var i = 0; i < l.length; i++) try {
          l[i]({ type: "abort" });
        } catch (e) {
        }
      };
    };
  }
  if (!navigator.clipboard) {
    try {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: function(t) {
        return new Promise(function(ok, no) {
          var a = document.createElement("textarea");
          a.value = t;
          a.style.position = "fixed";
          a.style.opacity = "0";
          document.body.appendChild(a);
          a.select();
          var r = false;
          try {
            r = document.execCommand("copy");
          } catch (e) {
          }
          document.body.removeChild(a);
          r ? ok() : no(new Error("copy failed"));
        });
      } } });
    } catch (e) {
    }
  }
})();
"use strict";
const CACHE_VERSION = "4.9";
const SHELL_CACHE = "gargo-legacy-shell-" + CACHE_VERSION;
const RUNTIME_CACHE = "gargo-legacy-runtime-v1";
const TILE_CACHE = "gargo-legacy-tiles-v1";
const TILE_MAX = 400;
const SHELL_FILES = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./css/royal.css",
  "./css/glass.css",
  "./css/nav-shell.css",
  "./css/gargo-colors.css",
  "./css/mobile.css",
  "./css/tablet.css",
  "./vendor/supabase.js",
  "./js/polyfills.js",
  "./js/admin-ui-shell.js",
  "./js/allocation.js",
  "./js/booking-documents.js",
  "./js/bootstrap.js",
  "./js/branding.js",
  "./js/clerk-tools.js",
  "./js/client-auth.js",
  "./js/core-db.js",
  "./js/core-state.js",
  "./js/depot-ops.js",
  "./js/dispatch-trips.js",
  "./js/erp-hub.js",
  "./js/finance-billing.js",
  "./js/finance-corp.js",
  "./js/finance-suite.js",
  "./js/finance.js",
  "./js/ghd-tariff-schedule.js",
  "./js/hr-users.js",
  "./js/hr.js",
  "./js/interchange-shutouts.js",
  "./js/invoicing.js",
  "./js/maintenance-fuel-workshop.js",
  "./js/nav-compat.js",
  "./js/nav-shell.js",
  "./js/navigation.js",
  "./js/offline.js",
  "./js/payroll-config.js",
  "./js/reports-audit.js",
  "./js/service-rate-schedule.js",
  "./js/tablet.js",
  "./js/tracking.js",
  "./js/trucks-drivers.js",
  "./js/vessel-prestaking.js",
  "./manifest.json",
  "../icons/icon-192.png",
  "../icons/icon-512.png"
];
const CDN_FILES = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];
const CDN_HOSTS = /* @__PURE__ */ new Set([
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
]);
const TILE_HOSTS = /* @__PURE__ */ new Set(["tile.openstreetmap.org", "server.arcgisonline.com"]);
const NEVER_HOST = /(^|\.)supabase\.(co|in)$|(^|\.)wialon\.com$/i;
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_FILES.map(async (f) => {
      const res = await fetch(new Request(f, { cache: "reload" }));
      if (!res.ok) throw new Error(f + " -> " + res.status);
      await shell.put(f, res);
    }));
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.allSettled(CDN_FILES.map(async (u) => {
      if (await runtime.match(u)) return;
      const res = await fetch(u, { mode: "cors", credentials: "omit" });
      if (res.ok) await runtime.put(u, res);
    }));
  })());
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = /* @__PURE__ */ new Set([SHELL_CACHE, RUNTIME_CACHE, TILE_CACHE]);
    const keys = await caches.keys();
    const isUpgrade = keys.some((k) => !keep.has(k) && k.indexOf("gargo-legacy") === 0);
    await Promise.all(keys.filter((k) => !keep.has(k) && k.indexOf("gargo-legacy") === 0).map((k) => caches.delete(k)));
    await self.clients.claim();
    if (isUpgrade) {
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION }));
    }
  })());
});
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => {
      clearTimeout(t);
      resolve(v);
    }, (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
async function corsFetch(req) {
  try {
    const res = await fetch(req.url, { mode: "cors", credentials: "omit" });
    if (res && res.ok) return res;
  } catch (e) {
  }
  return fetch(req);
}
async function networkFirstNav(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await withTimeout(fetch(req), 4e3);
    if (res && res.ok) cache.put("./index.html", res.clone());
    return res;
  } catch (e) {
    return await cache.match("./index.html") || await cache.match("./") || new Response("Offline \u2014 open Gargo once while online to enable offline use.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}
function staleWhileRevalidate(event, cacheName) {
  return caches.open(cacheName).then(async (cache) => {
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then((res) => {
      if (res && res.ok) cache.put(event.request, res.clone());
      return res;
    }).catch(() => null);
    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    return await network || new Response("Offline", { status: 503, statusText: "Offline" });
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
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (NEVER_HOST.test(url.hostname)) return;
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      event.respondWith(networkFirstNav(req));
      return;
    }
    if (url.pathname === "/legacy/sw.js") return;
    event.respondWith(staleWhileRevalidate(event, SHELL_CACHE));
    return;
  }
  if (TILE_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(req, TILE_CACHE, TILE_MAX));
    return;
  }
  if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }
});
