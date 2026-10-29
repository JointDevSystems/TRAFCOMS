/* Gargo tablet layer. Plain ES5 on purpose: this file must run on very old Android WebViews
   (Galaxy Tab A 2016 / Android 8.1) even when the rest of the app cannot.
   Loaded synchronously in <head> so the classes exist before first paint.
   Overrides: add ?lite=1 or ?lite=0 to the URL once (remembered on the device). */
(function () {
  var d = document.documentElement, ua = navigator.userAgent || '';
  var cm = ua.match(/Chrome\/(\d+)/), am = ua.match(/Android (\d+)/);
  var chrome = cm ? +cm[1] : 0, android = am ? +am[1] : 0;
  var mem = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 4;
  var touch = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);

  /* Lite mode = no blur, flat background, no entrance animations. Auto-on for old/low-memory devices. */
  var lite = (android && android <= 9) || (mem && mem <= 2) || cores <= 4 || (chrome && chrome < 90);
  try {
    var q = /[?&]lite=([01])/.exec(location.search);
    if (q) localStorage.setItem('gargo-lite', q[1]);
    var f = localStorage.getItem('gargo-lite');
    if (f === '1') lite = true; else if (f === '0') lite = false;
  } catch (e) {}

  d.className += (touch ? ' gx-touch' : ' gx-mouse') + (lite ? ' gx-lite' : '');

  /* The app uses ?. and ?? (Chrome 80+). On an older WebView every script dies with a SyntaxError and the
     user is left on a blank loader, so say what to do instead. */
  var ok = true;
  try { new Function('var a={};return a?.b??1'); } catch (e) { ok = false; }
  if (!ok) {
    d.className += ' gx-legacy';
    document.addEventListener('DOMContentLoaded', function () {
      var b = document.createElement('div');
      b.id = 'gxLegacy';
      b.innerHTML = '<div><h2>Browser engine too old</h2>' +
        '<p>This tablet\u2019s web engine (Chrome ' + (chrome || '?') + ') can\u2019t run Gargo yet.</p>' +
        '<p>Open <b>Google Play Store</b> \u2192 update <b>Android System WebView</b> and <b>Google Chrome</b>, then reopen Gargo.</p></div>';
      document.body.appendChild(b);
      var l = document.getElementById('loader'); if (l) l.style.display = 'none';
    });
  }

  /* ── Tablet search: below 900px the top-bar search box is hidden, so add a button that opens the
     existing #globalSearch + #searchResults as a full-width sheet (live results, "Jump to a page" shortcut). ── */
  function $(id) { return document.getElementById(id); }
  function closeSearch() {
    document.body.className = document.body.className.replace(/\s*gx-search-open/g, '');
    var p = $('searchResults'); if (p) p.style.display = 'none';
    var g = $('globalSearch'); if (g) g.blur();
  }
  function openSearch() {
    var g = $('globalSearch'); if (!g) return;
    if (document.body.className.indexOf('gx-search-open') < 0) document.body.className += ' gx-search-open';
    var j = $('gxJump'); if (j) j.style.display = $('nxJump') ? '' : 'none';
    setTimeout(function () { g.focus(); if (g.value && window.handleSearch) window.handleSearch(g.value); }, 60);
  }
  document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.querySelector('.search-wrap'), g = $('globalSearch'), anchor = $('themeBtn');
    if (!wrap || !g || !anchor || $('gxSearchBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'gxSearchBtn'; btn.type = 'button'; btn.className = 'gx-search-btn';
    btn.setAttribute('aria-label', 'Search trucks, drivers, containers');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    btn.onclick = openSearch;
    anchor.parentNode.insertBefore(btn, anchor);

    var scrim = document.createElement('div'); scrim.id = 'gxSearchScrim'; scrim.onclick = closeSearch;
    document.body.appendChild(scrim);

    var jump = document.createElement('button');
    jump.id = 'gxJump'; jump.type = 'button'; jump.className = 'gx-jump'; jump.textContent = 'Jump to page';
    jump.onclick = function () { closeSearch(); var n = $('nxJump'); if (n) n.click(); };
    wrap.appendChild(jump);

    var t;   /* search as you type: soft keyboards do not always send a clean Enter */
    g.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (window.handleSearch && document.body.className.indexOf('gx-search-open') > -1) window.handleSearch(g.value); }, 250);
    });
    var res = $('searchResults');
    if (res) res.addEventListener('click', function () { setTimeout(closeSearch, 0); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSearch(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) closeSearch(); });
  });
})();
