'use strict';
/* Gargo offline + performance layer.

   1. Device copy: after a good load, state.db is saved to IndexedDB so the app can open with no signal.
   2. Pending edits: rows with unsaved changes are mirrored to IndexedDB every few seconds, so a reload,
      a killed tab or a dead battery does not lose gate-ins / trips entered while offline. They are replayed
      (last write wins, same as every other save in the app) the next time the user is signed in and online.
   3. Reconnect: when the connection returns, unsaved rows are pushed FIRST, then data is refreshed.
      (refreshFromServer replaces state.db, so refreshing first would throw away offline edits.)
   4. A small banner shows offline / syncing / "still unsaved" state.
   5. jsPDF and SheetJS load after first paint instead of blocking it.

   Everything here is wrapped so a failure can never stop the app from starting. */
(function () {
  const IDB_NAME = 'gargo-offline', STORE = 'kv';
  const SNAPSHOT_MAX_AGE_MS = 30 * 24 * 3600 * 1000;
  // Arrays whose rows carry a _dirty flag (see saveDirty in core-db.js).
  const DIRTY_KEYS = ['trips', 'maintenance', 'fuel', 'shutouts', 'interchange', 'vesselPrestaking',
    'requisitions', 'workshop', 'containerRepairs', 'invoices'];
  // Tables saved by diffing against a snapshot (see SAVE_SNAP_SPECS in core-db.js).
  const BLIND_NAMES = ['shippingLines', 'trucks', 'drivers', 'billingRates', 'allocationRules'];

  /* ── IndexedDB key/value helpers ───────────────────────────────────── */
  let _open = null;
  function openDB() {
    if (_open) return _open;
    _open = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('IndexedDB blocked'));
    }).catch(e => { _open = null; throw e; });
    return _open;
  }
  async function run(mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      let req;
      const t = db.transaction(STORE, mode);
      try { req = fn(t.objectStore(STORE)); } catch (e) { reject(e); return; }
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('IndexedDB transaction aborted'));
    });
  }
  const kvGet = k => run('readonly', s => s.get(k));
  const kvDel = k => run('readwrite', s => s.delete(k));
  async function kvSet(k, v) {
    try { return await run('readwrite', s => s.put(v, k)); }
    catch (e) {
      // Structured clone can reject odd values (functions, DOM nodes) — retry as plain JSON.
      if (e && e.name === 'DataCloneError') return run('readwrite', s => s.put(JSON.parse(JSON.stringify(v)), k));
      throw e;
    }
  }

  /* ── Unsaved-change detection ──────────────────────────────────────── */
  function dirtyRows() {
    const out = {}; let n = 0;
    const db = (typeof state !== 'undefined') && state.db;
    if (!db) return { rows: out, n: 0 };
    DIRTY_KEYS.forEach(k => {
      const rows = (db[k] || []).filter(r => r && r._dirty);
      if (rows.length) { out[k] = rows; n += rows.length; }
    });
    const audit = (db.auditLog || []).filter(a => a && !a._saved);
    if (audit.length) { out.auditLog = audit; n += audit.length; }
    return { rows: out, n };
  }
  function blindChanges() {
    // Trucks / drivers / lines / rates / rules are saved by comparing with a snapshot.
    let n = 0;
    try {
      BLIND_NAMES.forEach(name => {
        if (typeof _saveSnap !== 'undefined' && _saveSnap[name]) n += _planBlindSave(name).rows.length;
      });
    } catch (e) { /* counting only — never block on it */ }
    return n;
  }
  function unsavedCount() { return dirtyRows().n + blindChanges(); }

  /* ── Device copy (snapshot) ────────────────────────────────────────── */
  async function hasSnapshot() {
    try {
      const m = await kvGet('snapmeta');
      return !!(m && m.savedAt && (Date.now() - m.savedAt) < SNAPSHOT_MAX_AGE_MS);
    } catch (e) { return false; }
  }
  async function loadSnapshot() {
    try {
      if (!(await hasSnapshot())) return null;
      const snap = await kvGet('snapshot');
      return snap && snap.db ? snap : null;
    } catch (e) { console.warn('Offline snapshot unreadable:', e); return null; }
  }
  async function saveSnapshot() {
    try {
      if (typeof state === 'undefined' || !state.db || !state.currentUser) return false;
      if (state.offlineData || !navigator.onLine) return false;   // never overwrite good data with stale data
      if (unsavedCount() > 0) return false;                       // never store half-saved rows as "server truth"
      const savedAt = Date.now();
      await kvSet('snapshot', { v: 1, savedAt, userId: state.currentUser.id, db: state.db });
      await kvSet('snapmeta', { savedAt, userId: state.currentUser.id });
      return true;
    } catch (e) { console.warn('Could not save offline snapshot:', e); return false; }
  }

  /* ── Who may open the app offline ──────────────────────────────────── */
  async function remember() {
    try {
      if (!state.currentUser || !state.profile) return;
      await kvSet('identity', { userId: state.currentUser.id, profile: state.profile, savedAt: Date.now() });
    } catch (e) { /* non-fatal */ }
  }
  async function offlineIdentity() {
    try {
      if (!(await hasSnapshot())) return null;
      const id = await kvGet('identity');
      const meta = await kvGet('snapmeta');
      if (!id || !id.profile || !id.profile.active) return null;
      if (meta && meta.userId && meta.userId !== id.userId) return null;
      return id;
    } catch (e) { return null; }
  }

  /* ── Pending edits that survive a reload ───────────────────────────── */
  let _replayDone = false, _hadPending = false;

  async function persistPending() {
    if (!_replayDone || typeof state === 'undefined' || !state.db || !state.currentUser) return;
    try {
      const { rows, n } = dirtyRows();
      if (n > 0) {
        await kvSet('pending', { v: 1, userId: state.currentUser.id, savedAt: Date.now(), rows });
        _hadPending = true;
      } else if (_hadPending) {
        await kvDel('pending');
        _hadPending = false;
      }
    } catch (e) { console.warn('Could not persist pending edits:', e); }
  }

  function mergePending(rows) {
    const db = state.db;
    Object.keys(rows).forEach(k => {
      if (k === 'auditLog') {
        const have = new Set((db.auditLog || []).map(a => a.id));
        db.auditLog = [...rows.auditLog.filter(a => !have.has(a.id)), ...(db.auditLog || [])];
        return;
      }
      const arr = db[k] || (db[k] = []);
      rows[k].forEach(row => {
        row._dirty = true;
        const i = arr.findIndex(x => x.id === row.id);
        if (i >= 0) arr[i] = row; else arr.unshift(row);
      });
    });
  }

  /* Call once state.db is loaded and the user is known, before the UI renders. */
  async function afterLoad() {
    try {
      const p = await kvGet('pending');
      if (!p || !p.rows) { _replayDone = true; return 0; }
      if (!state.currentUser || p.userId !== state.currentUser.id) { _replayDone = true; return 0; } // belongs to someone else — leave it
      const n = Object.values(p.rows).reduce((a, r) => a + r.length, 0);
      mergePending(p.rows);
      _hadPending = true;
      _replayDone = true;
      if (!state.offlineData && navigator.onLine) {
        const r = await saveDB();
        if (r && r.ok) { await kvDel('pending'); _hadPending = false; if (typeof toast === 'function') toast(`${n} offline change${n === 1 ? '' : 's'} synced`, 'success'); }
      }
      return n;
    } catch (e) { console.warn('Pending replay failed:', e); _replayDone = true; return 0; }
  }

  /* Called when the user signs out. Wipes the device copy; keeps unsaved edits for the same user's next sign-in. */
  async function onLogout() {
    try {
      const { n } = dirtyRows();
      if (n > 0) await persistPending(); else await kvDel('pending').catch(() => {});
      await kvDel('snapshot'); await kvDel('snapmeta'); await kvDel('identity');
    } catch (e) { /* non-fatal */ }
  }

  /* ── Banner ────────────────────────────────────────────────────────── */
  function banner(kind, text) {
    let el = document.getElementById('gxNet');
    if (!kind) { if (el) el.classList.remove('on'); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'gxNet'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.className = 'on ' + kind;
    el.textContent = text;
  }
  function refreshBanner() {
    if (typeof state === 'undefined' || !state.currentUser) return banner(null);
    const n = unsavedCount();
    const tail = n ? ` · ${n} unsaved change${n === 1 ? '' : 's'} kept on this device` : '';
    if (!navigator.onLine) return banner('offline', 'Offline — working from saved data' + tail);
    if (state.offlineData) return banner('offline', 'Showing saved data — reconnecting…' + tail);
    banner(null);
  }

  /* ── Reconnect: push unsaved rows first, then refresh ──────────────── */
  let _syncing = false;
  async function onOnline() {
    if (_syncing || typeof state === 'undefined' || !state.db || !state.currentUser) { refreshBanner(); return; }
    _syncing = true;
    banner('syncing', 'Back online — syncing…');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data || !data.session) {
        banner('pending', 'Session expired — sign in again to sync your changes');
        return;
      }
      if (unsavedCount() > 0) {
        const r = await saveDB();
        if (!r || !r.ok) { banner('pending', 'Could not sync yet — your changes are kept and will retry'); return; }
        await kvDel('pending').catch(() => {}); _hadPending = false;
      }
      const wasOffline = !!state.offlineData;
      await refreshFromServer();
      state.offlineData = false;
      if (typeof refreshTracking === 'function') refreshTracking(true);
      banner(null);
      if (wasOffline && typeof toast === 'function') toast('Back online — data refreshed', 'success');
      setTimeout(saveSnapshot, 4000);
    } catch (e) {
      console.warn('Reconnect sync failed:', e);
      refreshBanner();
    } finally { _syncing = false; }
  }

  /* Quiet retry for rows that failed to save (flaky signal). Backs off up to 5 minutes. */
  let _retryDelay = 20000, _retryAt = 0, _retrying = false;
  async function retryQuietly() {
    if (_retrying || !navigator.onLine || _syncing || !state || !state.db || !state.currentUser || state.offlineData) return;
    if (Date.now() < _retryAt || unsavedCount() === 0) { if (unsavedCount() === 0) _retryDelay = 20000; return; }
    _retrying = true;
    const realToast = window.toast;
    window.toast = function () {};            // saveDB toasts every failure; keep retries silent
    try {
      const r = await saveDB();
      if (r && r.ok) { _retryDelay = 20000; await persistPending(); }
      else { _retryDelay = Math.min(_retryDelay * 2, 300000); }
    } catch (e) { _retryDelay = Math.min(_retryDelay * 2, 300000); }
    finally { window.toast = realToast; _retrying = false; _retryAt = Date.now() + _retryDelay; }
  }

  /* ── Wiring ────────────────────────────────────────────────────────── */
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', refreshBanner);
  window.addEventListener('beforeunload', e => {
    try { if (typeof state !== 'undefined' && state.currentUser && unsavedCount() > 0) { e.preventDefault(); e.returnValue = ''; } } catch (x) { /* ignore */ }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistPending(); });
  window.addEventListener('pagehide', () => { persistPending(); });
  setInterval(() => { persistPending(); refreshBanner(); retryQuietly(); }, 4000);
  setInterval(saveSnapshot, 5 * 60 * 1000);
  window.addEventListener('load', () => setTimeout(saveSnapshot, 10000));

  /* ── Heavy libraries: load after first paint ───────────────────────── */
  const LIBS = [
    ['jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!window.jspdf],
    ['xlsx', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', () => !!window.XLSX],
  ];
  const _libP = {};
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve(); s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  window.ensureExportLibs = function () {
    return Promise.all(LIBS.map(([name, src, ready]) => {
      if (ready()) return Promise.resolve();
      if (!_libP[name]) _libP[name] = loadScript(src).catch(e => { delete _libP[name]; throw e; });
      return _libP[name];
    }));
  };
  window.addEventListener('load', () => {
    const go = () => window.ensureExportLibs().catch(() => { /* retried on demand / when online */ });
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 2000);
  });
  window.addEventListener('online', () => window.ensureExportLibs().catch(() => {}));

  window.GargoOffline = {
    hasSnapshot, loadSnapshot, saveSnapshot, remember, offlineIdentity, afterLoad, onLogout,
    unsavedCount, refreshBanner,
    _t: { dirtyRows, mergePending, persistPending, kvGet, kvSet, kvDel, onOnline },
  };
})();