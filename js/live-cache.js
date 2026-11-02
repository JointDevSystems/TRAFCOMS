'use strict';

(function () {
  const KEY = 'gargo-ic-counts';
  const $ = id => document.getElementById(id);
  const uid = () => { try { return (state.currentUser && state.currentUser.id) || ''; } catch (e) { return ''; } };
  const read = () => { try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); return c && c.uid === uid() && c.c ? c : null; } catch (e) { return null; } };
  const write = c => { try { localStorage.setItem(KEY, JSON.stringify({ uid: uid(), at: Date.now(), c })); } catch (e) {} };
  const sec = () => { try { return state.currentSection; } catch (e) { return ''; } };

  /* ── 1. counts survive a dead connection and a reload ── */
  function wireCounts() {
    const R = window.ICR; if (!R || R._lc) return;
    R._lc = true;
    const origCounts = R.counts;
    R.counts = async function () {
      try {
        const c = await origCounts.apply(this, arguments);
        if (c) { write(c); R._stale = 0; }
        return c;
      } catch (e) {
        const k = read();
        if (k) { R._counts = k.c; R._stale = k.at; return k.c; }       // no signal: the last good numbers, not nothing
        throw e;
      }
    };
  }
  function hydrate() {
    const R = window.ICR; if (!R || !R.enabled || R._counts) return;
    const k = read(); if (k) { R._counts = k.c; R._countsAt = 0; R._stale = k.at; }      // _countsAt 0 = still refresh at the first chance
  }

  /* badges: the originals count only cached rows, so apply the server counts on top and refresh them */
  const _bb = window.buildBadges;
  if (typeof _bb === 'function') {
    window.buildBadges = function () {
      const r = _bb.apply(this, arguments);
      try { wireCounts(); if (window.ICR && ICR.enabled) { hydrate(); ICR.applyBadges(); ICR.refreshCounts(); } } catch (e) { console.warn('live-cache badges', e); }
      return r;
    };
  }
  /* alerts: yard-wide figures come from the server counts (the cached rows are only a window onto the yard) */
  const _ba = window.buildAlerts;
  if (typeof _ba === 'function') {
    window.buildAlerts = function () {
      const r = _ba.apply(this, arguments);
      try {
        const R = window.ICR, c = R && R.enabled && R._counts, list = $('alertsList');
        if (c && list) {
          const C = (k, d) => { try { const v = window.cfgGet ? window.cfgGet(k) : undefined; return v === undefined || v === null || v === '' ? d : v; } catch (e) { return d; } };
          const items = Array.prototype.slice.call(list.querySelectorAll('.alert-item'));
          const tpl = items.length ? items[0].cloneNode(true) : null;
          const fix = (re, n, msg, on) => {
            const hit = items.find(i => re.test(i.textContent));
            if (!on) { if (hit) hit.remove(); return; }
            if (hit) { if (!n) hit.remove(); else { const t = hit.querySelector('.alert-text, .alert-msg') || hit.lastElementChild; if (t) t.textContent = msg; } return; }
            if (!n) return;
            const el = tpl ? tpl.cloneNode(true) : document.createElement('div');
            if (!tpl) { el.className = 'alert-item warn'; el.innerHTML = '<div class="alert-dot-sm" style="background:var(--amber)"></div><div></div>'; }
            el.className = 'alert-item warn';
            const t = el.querySelector('.alert-text, .alert-msg') || el.lastElementChild; if (t) t.textContent = msg;
            list.appendChild(el);
          };
          const days = Number(C('ops.agedDays', 30)), hrs = Number(C('alerts.awaitingSurveyHours', 24));
          const n1 = Number(c.aged_in_yard) || 0, n2 = Number(c.awaiting_survey_old) || 0;
          fix(/in the yard longer than/i, n1, n1 + ' container' + (n1 === 1 ? '' : 's') + ' in the yard longer than ' + days + ' days', C('alerts.agedContainers', true) !== false);
          fix(/waiting for survey for over/i, n2, n2 + ' gated-in container' + (n2 === 1 ? '' : 's') + ' waiting for survey for over ' + hrs + ' h', C('alerts.awaitingSurvey', true) !== false);
          const dot = $('alertDot'); if (dot) dot.style.display = list.querySelector('.alert-item') ? 'block' : 'none';
        }
      } catch (e) { console.warn('live-cache alerts', e); }
      return r;
    };
  }

  /* ── 2. everything refreshes when the signal returns ── */
  let busy = false;
  async function recover(why) {
    if (busy || !navigator.onLine) return;
    try { if (!state || !state.currentUser) return; } catch (e) { return; }
    busy = true;
    try {
      if (window.ICR && ICR.enabled) { try { wireCounts(); await ICR.counts(true); ICR.applyBadges(); } catch (e) { /* stays on the saved numbers */ } }
      try { buildBadges(); buildAlerts(); } catch (e) {}
      const s = sec();
      if (s === 'dashboard' && typeof renderDashboard === 'function') { try { renderDashboard(); } catch (e) {} }
      if (s === 'gatesecurity' && window.GateDesk) { try { GateDesk.refresh(); } catch (e) {} if (window.GateSec) { try { GateSec.reload(); } catch (e) {} } }
      if (window.GargoLI) { try { const l = $('liList'); if (l && l.offsetParent) GargoLI.reload(); } catch (e) {} }
      if (typeof window.refreshBookingBadge === 'function') { try { refreshBookingBadge(); } catch (e) {} }
    } finally { busy = false; }
  }
  /* offline.js listens to the same event and pushes unsaved edits first; wait for it to finish before reading */
  window.addEventListener('online', () => { setTimeout(() => recover('online'), 2500); });

  /* ── 3. safety net: some phones never fire "online" ── */
  let wasUp = navigator.onLine;
  setInterval(() => {
    const up = navigator.onLine;
    if (up && (!wasUp || (window.ICR && ICR._stale && (Date.now() - (ICR._lastTry || 0)) > 60000))) { if (window.ICR) ICR._lastTry = Date.now(); recover('poll'); }
    wasUp = up;
  }, 20000);

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && navigator.onLine) setTimeout(() => recover('visible'), 800); });
  window.GargoLiveCache = { recover, counts: () => (window.ICR && ICR._counts) || (read() || {}).c || null };
})();