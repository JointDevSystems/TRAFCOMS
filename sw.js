const V='trafcoms-v19';
const FILES=["./", "./index.html", "./styles.css", "./royal.css", "./glass.css", "./cameras.css", "./nav-shell.css", "./app.css", "./manifest.json", "./js/actions.js", "./js/app.js", "./js/config.js", "./js/store.js", "./js/ui.js", "./js/util.js", "./js/views/index.js", "./js/views/kma.js", "./js/views/portal.js", "./js/views/shared.js", "./icons/icon-192-maskable.png", "./icons/icon-192.png", "./icons/icon-512-maskable.png", "./icons/icon-512.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r)));
});
