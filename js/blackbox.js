/* Gargo black box. Plain ES5 on purpose (must run on very old Android WebViews). Loaded in <head> right after tablet.js.
   Records what the app was doing, every few seconds, into localStorage. If the browser kills the page ("keeps stopping",
   out of memory), the NEXT launch shows a small panel with the last stage, memory use, data size and errors.
   Nothing is sent anywhere. Add ?bb=0 to the URL once to switch it off, ?bb=1 to switch it back on. */
(function () {
  var KEY = 'gargo-bb', HIST = 'gargo-bb-hist', OFF = 'gargo-bb-off';
  var ls = null;
  try { ls = window.localStorage; } catch (e) { return; }
  if (!ls) return;
  try {
    var q = /[?&]bb=([01])/.exec(location.search);
    if (q) { if (q[1] === '0') ls.setItem(OFF, '1'); else ls.removeItem(OFF); }
    if (ls.getItem(OFF) === '1') return;
  } catch (e) {}

  function read(k, d) { try { var v = JSON.parse(ls.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { ls.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var t0 = new Date().getTime();
  var prev = read(KEY, null);
  var hist = read(HIST, []);
  /* Phones and tablets kill background pages without firing pagehide (swipe-away, memory clean-up). That is normal,
     not a crash. Only report a session that died while visible, or that logged errors, or was near its memory limit. */
  var wasBackgroundKill = !!(prev && prev.hidden && !(prev.err && prev.err.length) && !(prev.limit && prev.peak >= prev.limit * 0.85));
  var crashed = !!(prev && prev.clean === false && !wasBackgroundKill);
  if (crashed) { hist.push({ at: prev.last, stage: prev.stage, heap: prev.heap, peak: prev.peak, rows: prev.rows, hidden: !!prev.hidden }); hist = hist.slice(-5); write(HIST, hist); }

  var rec = { v: 1, start: t0, last: t0, clean: false, stage: 'head', heap: 0, peak: 0, limit: 0, rows: 0, hidden: false, ev: [], err: [], lite: /gx-lite/.test(document.documentElement.className) };
  function secs() { return Math.round((new Date().getTime() - t0) / 1000); }
  function save() { rec.last = new Date().getTime(); write(KEY, rec); }
  function stage(s) {
    if (rec.stage === s) return;
    rec.stage = s;
    rec.ev.push(secs() + 's ' + s);
    if (rec.ev.length > 30) rec.ev.shift();
  }
  function addErr(m) {
    m = String(m || '').slice(0, 180);
    rec.err.push(secs() + 's ' + m);
    if (rec.err.length > 8) rec.err.shift();
    save();
  }
  window.addEventListener('error', function (e) {
    var src = (e && e.filename ? String(e.filename).split('/').pop() : '') + ':' + (e && e.lineno || '');
    addErr((e && e.message) + ' @' + src);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason; addErr('promise: ' + (r && r.message ? r.message : r));
  });

  function sample() {
    try {
      var pm = window.performance && performance.memory;
      if (pm) {
        rec.heap = Math.round(pm.usedJSHeapSize / 1048576);
        rec.limit = Math.round(pm.jsHeapSizeLimit / 1048576);
        if (rec.heap > rec.peak) rec.peak = rec.heap;
      }
      var $ = function (id) { return document.getElementById(id); };
      var s = 'booting', l = $('loader'), lg = $('loginScreen'), sh = $('shell'), dp = $('driverPortal');
      if (typeof state !== 'undefined' && state && state.currentUser) {
        var vis = (sh && sh.style.display === 'flex') || (dp && dp.style.display === 'flex');
        s = vis ? ((dp && dp.style.display === 'flex') ? 'driver-portal' : 'app:' + (state.currentSection || '?')) : 'signing-in';
        var n = 0, db = state.db;
        if (db) for (var k in db) { if (db[k] && typeof db[k].length === 'number' && typeof db[k] !== 'string') n += db[k].length; }
        rec.rows = n;
      } else if (lg && lg.style.display === 'flex') s = 'login-screen';
      else if (l && l.style.display !== 'none') s = 'loader';
      stage(s);
    } catch (e) {}
    save();
  }
  var every = rec.lite ? 3000 : 2000;
  setInterval(sample, every);
  document.addEventListener('DOMContentLoaded', function () { stage('dom-ready'); save(); showPanel(); });
  window.addEventListener('load', function () { stage('page-loaded'); sample(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { rec.hidden = true; stage('hidden'); } else { rec.hidden = false; stage('visible'); }
    save();
  });
  window.addEventListener('pagehide', function () { rec.clean = true; stage('closed-normally'); save(); });
  save();

  function report(p) {
    var lines = ['Gargo black box report'];
    lines.push('Last seen: ' + (p.last ? new Date(p.last).toLocaleString() : '?') + ' (ran ' + Math.round(((p.last || 0) - (p.start || 0)) / 1000) + 's)');
    lines.push('Doing: ' + p.stage + (p.hidden ? ' (page was in background)' : ''));
    lines.push('JS memory: ' + p.heap + ' MB (peak ' + p.peak + ' MB' + (p.limit ? ', limit ' + p.limit + ' MB' : '') + ')');
    lines.push('Data in memory: ' + p.rows + ' rows | lite mode: ' + (p.lite ? 'yes' : 'no'));
    lines.push('Engine: ' + ((/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1] ? 'Chrome ' + (/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1] : navigator.userAgent.slice(0, 60)) + ' | RAM hint: ' + (navigator.deviceMemory || '?') + ' GB');
    if (p.ev && p.ev.length) lines.push('Steps: ' + p.ev.slice(-8).join(' > '));
    if (p.err && p.err.length) lines.push('Errors: ' + p.err.slice(-4).join(' | '));
    if (hist.length > 1) lines.push('Unexpected endings recorded: ' + hist.length);
    return lines.join('\n');
  }
  function showPanel() {
    if (!crashed || !prev) return;
    var txt = report(prev);
    var box = document.createElement('div');
    box.id = 'gxBB';
    box.setAttribute('style', 'position:fixed;left:8px;right:8px;bottom:8px;z-index:10002;max-width:640px;margin:0 auto;padding:12px 14px;border-radius:12px;' +
      'background:#1f1300;color:#F59E0B;border:1px solid #F59E0B;font:12px/1.45 monospace;box-shadow:0 8px 30px rgba(0,0,0,.5);max-height:60vh;overflow:auto');
    var h = document.createElement('div');
    h.setAttribute('style', 'font:600 13px sans-serif;margin-bottom:6px');
    h.appendChild(document.createTextNode('The last session ended unexpectedly'));
    var pre = document.createElement('pre');
    pre.setAttribute('style', 'margin:0 0 8px;white-space:pre-wrap;word-break:break-word;font:inherit');
    pre.appendChild(document.createTextNode(txt));
    var bar = document.createElement('div');
    function btn(label, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.appendChild(document.createTextNode(label));
      b.setAttribute('style', 'margin-right:8px;padding:8px 14px;border-radius:8px;border:1px solid #F59E0B;background:transparent;color:#F59E0B;font:600 12px sans-serif');
      b.onclick = fn; bar.appendChild(b);
    }
    btn('Copy report', function () {
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt); return; } } catch (e) {}
      var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    btn('Dismiss', function () { if (box.parentNode) box.parentNode.removeChild(box); });
    box.appendChild(h); box.appendChild(pre); box.appendChild(bar);
    document.body.appendChild(box);
  }
  window.GargoBlackBox = { report: function () { return report(rec); }, lastCrash: function () { return crashed ? prev : null; } };
})();