'use strict';
/* Builds /legacy/ : a copy of Gargo that runs on Chrome 55+ (Android 5-7 tablets that never updated their WebView).
   Run from the project root:   npm i -D esbuild   then   node build-legacy.js
   Re-run it (and commit /legacy) whenever the main app files change.
   The main app is untouched. js/tablet.js sends old browsers to /legacy/ automatically once this folder is deployed. */
const fs = require('fs'), path = require('path'), https = require('https');
let esbuild;
try { esbuild = require('esbuild'); } catch (e) { console.error('esbuild missing. Run:  npm i -D esbuild'); process.exit(1); }

const ROOT = process.cwd(), OUT = path.join(ROOT, 'legacy'), TARGET = 'chrome55';
const CSS = ['styles', 'royal', 'glass', 'nav-shell', 'gargo-colors', 'mobile', 'tablet'];
const SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';   // same version index.html uses
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const wr = (f, s) => { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), s); };
const js = (src, name) => { try { return esbuild.transformSync(src, { target: TARGET, loader: 'js', logLevel: 'silent' }).code; }
  catch (e) { console.error('FAILED ' + name + ': ' + String(e.message).split('\n')[0]); process.exit(1); } };

function get(url, hops) {
  return new Promise((res, rej) => https.get(url, r => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && (hops || 0) < 5) return res(get(new URL(r.headers.location, url).href, (hops || 0) + 1));
    if (r.statusCode !== 200) return rej(new Error(url + ' -> HTTP ' + r.statusCode));
    let b = ''; r.setEncoding('utf8'); r.on('data', c => b += c); r.on('end', () => res(b));
  }).on('error', rej));
}

/* Built-ins missing before Chrome 76. The app uses Promise.allSettled, Object.fromEntries, flat/flatMap, padStart. */
const POLYFILLS = `/* Gargo legacy polyfills (ES5). Only fills what is missing. */
(function(){
  var w=window;
  if(typeof w.globalThis==='undefined')w.globalThis=w;
  if(!Object.fromEntries)Object.fromEntries=function(it){var o={};for(var e of it)o[e[0]]=e[1];return o;};
  if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
  if(!Array.prototype.flat)Array.prototype.flat=function(dp){dp=dp===undefined?1:dp;var r=[];(function f(a,d){for(var i=0;i<a.length;i++){if(Array.isArray(a[i])&&d>0)f(a[i],d-1);else r.push(a[i]);}})(this,dp);return r;};
  if(!Array.prototype.flatMap)Array.prototype.flatMap=function(fn,t){return Array.prototype.map.call(this,fn,t).flat(1);};
  if(!String.prototype.padStart)String.prototype.padStart=function(n,s){s=s===undefined?' ':String(s);var str=String(this);if(str.length>=n||!s)return str;var p='';while(p.length<n-str.length)p+=s;return p.slice(0,n-str.length)+str;};
  if(!String.prototype.padEnd)String.prototype.padEnd=function(n,s){s=s===undefined?' ':String(s);var str=String(this);if(str.length>=n||!s)return str;var p='';while(p.length<n-str.length)p+=s;return str+p.slice(0,n-str.length);};
  if(!String.prototype.replaceAll)String.prototype.replaceAll=function(a,b){return a instanceof RegExp?this.replace(a,b):this.split(String(a)).join(b);};
  if(!Promise.allSettled)Promise.allSettled=function(a){return Promise.all(Array.prototype.map.call(a,function(p){return Promise.resolve(p).then(function(v){return{status:'fulfilled',value:v};},function(r){return{status:'rejected',reason:r};});}));};
  if(!Promise.prototype.finally)Promise.prototype.finally=function(f){var P=this.constructor||Promise;return this.then(function(v){return P.resolve(f()).then(function(){return v;});},function(e){return P.resolve(f()).then(function(){throw e;});});};
  if(!w.queueMicrotask)w.queueMicrotask=function(f){Promise.resolve().then(f);};
  if(typeof w.AbortController==='undefined'){w.AbortController=function(){var l=[],s={aborted:false,addEventListener:function(t,f){l.push(f);},removeEventListener:function(){}};this.signal=s;this.abort=function(){if(s.aborted)return;s.aborted=true;for(var i=0;i<l.length;i++)try{l[i]({type:'abort'});}catch(e){}};};}
  if(!navigator.clipboard){try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){return new Promise(function(ok,no){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();var r=false;try{r=document.execCommand('copy');}catch(e){}document.body.removeChild(a);r?ok():no(new Error('copy failed'));});}}});}catch(e){}}
})();
`;

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });

  // 1. app scripts
  const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
  jsFiles.forEach(f => wr('js/' + f, js(rd('js/' + f), f)));
  wr('js/polyfills.js', POLYFILLS);

  // 2. Supabase client (same pinned version as the main app), converted to run on old engines
  let sb;
  try { sb = process.env.SUPABASE_UMD ? fs.readFileSync(process.env.SUPABASE_UMD, 'utf8') : await get(SUPABASE); }
  catch (e) { console.error('Could not download Supabase client: ' + e.message + '\nCheck your internet connection and run again.'); process.exit(1); }
  wr('vendor/supabase.js', js(sb, 'supabase'));

  // 3. stylesheets: modern colour/inset syntax lowered, and grid-gap added for Chrome 55-65 (which lack `gap`)
  CSS.forEach(n => {
    if (!fs.existsSync(path.join(ROOT, n + '.css'))) return console.warn('skip missing ' + n + '.css');
    let c = esbuild.transformSync(rd(n + '.css'), { loader: 'css', target: TARGET, logLevel: 'silent' }).code;
    c = c.replace(/([;{\s])gap(\s*:\s*)([^;}]+)/g, '$1grid-gap$2$3;$1gap$2$3');
    wr('css/' + n + '.css', c);
  });

  // 4. index.html: point at the converted/shared files
  let html = rd('index.html');
  html = html.replace(/<script[^>]*supabase-js@[^>]*>\s*<\/script>/, '<script defer src="vendor/supabase.js"></script>');
  html = html.replace(new RegExp('href="(' + CSS.join('|') + ')\\.css"', 'g'), 'href="css/$1.css"');
  html = html.replace(/(href|src)="icons\//g, '$1="../icons/');
  const poly = '<script src="js/polyfills.js"></script>\r\n    ';
  html = html.includes('<script src="js/tablet.js">') ? html.replace('<script src="js/tablet.js">', poly + '<script src="js/tablet.js">')
                                                      : html.replace(/(<meta name="viewport"[^>]*>)/, '$1\r\n    ' + poly);
  wr('index.html', html);

  // 5. manifest scoped to /legacy/
  const man = JSON.parse(rd('manifest.json'));
  man.start_url = './index.html'; man.scope = './'; man.name += ' (compat)';
  man.icons = man.icons.map(i => Object.assign({}, i, { src: '../' + i.src.replace(/^\.?\//, '') }));
  wr('manifest.json', JSON.stringify(man, null, 2));

  // 6. its own service worker (scope /legacy/, separate caches so it never fights the main one)
  let sw = rd('sw.js');
  const shell = ['./', './index.html', ...CSS.map(n => './css/' + n + '.css'), './vendor/supabase.js', './js/polyfills.js']
    .concat(jsFiles.map(f => './js/' + f)).concat(['./manifest.json', '../icons/icon-192.png', '../icons/icon-512.png']);
  sw = sw.replace(/const SHELL_FILES = \[[\s\S]*?\];/, 'const SHELL_FILES = ' + JSON.stringify(shell, null, 2) + ';')
    .replace(/\s*'https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^']*',?/, '')
    .replace("'gargo-shell-'", "'gargo-legacy-shell-'").replace("'gargo-runtime-v1'", "'gargo-legacy-runtime-v1'").replace("'gargo-tiles-v1'", "'gargo-legacy-tiles-v1'")
    .split("k.indexOf('gargo-legacy') !== 0").join("k.indexOf('gargo-legacy') === 0")      // this worker only manages legacy caches
    .replace("url.pathname === '/sw.js'", "url.pathname === '/legacy/sw.js'")
    .replace(/^.*legacy-bypass.*\r?\n/m, '');                                              // ...and must serve its own pages
  wr('sw.js', js(POLYFILLS + sw, 'legacy sw.js'));

  // 7. sanity: every local file the legacy page references must exist
  const missing = [];
  (html.match(/(?:href|src)="(?!https?:|data:|#)[^"]+"/g) || []).forEach(m => {
    const p = m.replace(/^(?:href|src)="/, '').replace(/"$/, '').split(/[?#]/)[0];
    if (p && !fs.existsSync(path.join(OUT, p))) missing.push(p);
  });
  const kb = d => { let t = 0; (function w(x) { fs.readdirSync(x, { withFileTypes: true }).forEach(e => e.isDirectory() ? w(path.join(x, e.name)) : t += fs.statSync(path.join(x, e.name)).size); })(d); return Math.round(t / 1024); };
  console.log('legacy build OK: ' + jsFiles.length + ' scripts, ' + CSS.length + ' stylesheets, ' + kb(OUT) + ' KB -> ' + OUT);
  if (missing.length) console.warn('WARNING missing referenced files (check paths): ' + missing.join(', '));
  console.log('Next: git add legacy && git commit -m "Legacy build" && git push');
})();
