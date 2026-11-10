'use strict';
/* Minifies the main app into /dist (same folder layout, same file names, so index.html, sw.js
   and vercel.json keep working unchanged). Source files are never modified.
   Run from the project root:   npm i -D esbuild html-minifier-terser   then   node build-min.js
   Deploy the /dist folder (Vercel: set Output Directory to "dist"), or copy its contents over the root. */
const fs = require('fs'), path = require('path');
const esbuild = require('esbuild');
const { minify: minifyHtml } = require('html-minifier-terser');

const ROOT = process.cwd(), OUT = path.join(ROOT, 'dist');
const TARGET = 'chrome80';   // matches the vercel.json rule that sends Chrome 80+ to the main app
const JS_LOADERS = { '.js': 'js', '.css': 'css' };
let before = 0, after = 0, count = 0;

const rd = f => fs.readFileSync(path.join(ROOT, f));
function wr(f, data) {
  const p = path.join(OUT, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}
function track(f, src, out) {
  const b = Buffer.byteLength(src), a = Buffer.byteLength(out);
  before += b; after += a; count++;
  console.log(f.padEnd(40), String(b).padStart(8), '->', String(a).padStart(8), ' -' + Math.round((1 - a / b) * 100) + '%');
}
function min(f) {
  const src = rd(f).toString('utf8');
  const out = esbuild.transformSync(src, {
    loader: JS_LOADERS[path.extname(f)], minify: true, target: TARGET, legalComments: 'none', logLevel: 'silent'
  }).code;
  track(f, src, out); wr(f, out);
}

fs.rmSync(OUT, { recursive: true, force: true });

(async () => {
  // JS + CSS in the project root and js/
  const files = [
    ...fs.readdirSync(ROOT).filter(f => /\.(css)$/.test(f) || f === 'sw.js'),
    ...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f),
  ];
  for (const f of files) {
    try { min(f); } catch (e) { console.error('FAILED ' + f + ': ' + String(e.message).split('\n')[0]); process.exit(1); }
  }

  // index.html (inline <style>/<script> are minified too)
  const html = rd('index.html').toString('utf8');
  const outHtml = await minifyHtml(html, {
    collapseWhitespace: true, conservativeCollapse: true, removeComments: true,
    minifyCSS: true, minifyJS: { compress: true, mangle: false }, keepClosingSlash: true
  });
  track('index.html', html, outHtml); wr('index.html', outHtml);

  // manifest.json
  const mf = rd('manifest.json').toString('utf8'), mfOut = JSON.stringify(JSON.parse(mf));
  track('manifest.json', mf, mfOut); wr('manifest.json', mfOut);

  // copied as-is: icons, legacy build (already built separately)
  const copyDir = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const rel = d + '/' + e.name;
    if (e.isDirectory()) copyDir(rel); else wr(rel, rd(rel)); } };
  copyDir('icons');
  if (fs.existsSync(path.join(ROOT, 'legacy'))) copyDir('legacy');

  console.log('\n' + count + ' files   ' + (before / 1024).toFixed(0) + ' KB -> ' + (after / 1024).toFixed(0) + ' KB   (-' + Math.round((1 - after / before) * 100) + '%)');
})();
