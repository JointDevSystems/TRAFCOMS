'use strict';
/* Gargo form guard. Loads LAST (after interchange-lists.js).
   1. CAPITALS     every text box types in capitals (login, passwords, emails, URLs, search and the Settings / Users pages are left alone).
   2. NO DATA LOSS clicking outside a dialog, the X button or the Esc key no longer throws away what was typed:
                   if anything was entered the person is asked: keep editing, pause (finish later) or discard.
   3. PAUSE        every entry form gets a Pause button. The half-filled form is saved to PENDING (the pause icon in the top bar)
                   and can be resumed later from the same device by the same user. Works for dialogs (survey, gate-in dialogs,
                   workshop, requisitions ...), for the Gate-In, Dispatch and Fuel pages, and for the Repat Reserve editor.
   Drafts live in this device's IndexedDB (falls back to localStorage). Nothing is sent to the server until the form is submitted.
   Switch off in an emergency: add ?fg=0 to the address once (?fg=1 turns it back on). */
(function () {
  if (window.GargoDrafts) return;
  try {
    const q = /[?&]fg=([01])/.exec(location.search);
    if (q) localStorage.setItem('gargo-fg-off', q[1] === '0' ? '1' : '0');
    if (localStorage.getItem('gargo-fg-off') === '1') return;
  } catch (e) {}

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => { try { return (state.currentUser && state.currentUser.id) || ''; } catch (e) { return ''; } };
  const say = (m, t, ms) => { try { toast(m, t || 'info', ms || 3500); } catch (e) {} };
  const overlay = () => $('modalOverlay');
  const modalOpen = () => { const o = overlay(); return !!(o && o.classList.contains('active')); };

  /* ════════════════════════════ 1. CAPITALS ════════════════════════════ */
  const NO_TYPE = /^(password|email|url|number|date|time|datetime-local|month|week|file|color|range|checkbox|radio|hidden|search|button|submit|reset|image)$/;
  const NO_ID = /(e-?mail|passw|^pass|^cp_|url|link|token|secret|api|key$|user(name)?$|^cu_|^ea_|login|search|filter|host|domain|endpoint|rtsp|whep|stream|^ice|^turn|_turn|sdp|^gx|^iwRpt|^bd_)/i;
  const NO_ZONE = '#loginScreen,#sec-settings,#sec-usermgmt,#gxSearchScrim,.search-wrap,[data-nocaps-zone]';
  const NO_TITLE = /user|password|setting|designer|camera|integration|token|access|profile|login|install/i;

  function capsOK(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') return false;
    if (tag === 'INPUT' && NO_TYPE.test(String(el.type || 'text').toLowerCase())) return false;
    if (el.readOnly || el.disabled || el.hasAttribute('data-nocaps')) return false;
    if (el.id && NO_ID.test(el.id)) return false;
    if (el.name && NO_ID.test(el.name)) return false;
    const ac = el.getAttribute('autocomplete'); if (ac && /email|username|password|url/.test(ac)) return false;
    const im = el.getAttribute('inputmode'); if (im === 'email' || im === 'url' || im === 'search') return false;
    if (el.closest && el.closest(NO_ZONE)) return false;
    if (el.closest && el.closest('#modalBody')) { const t = $('modalTitle'); if (t && NO_TITLE.test(t.textContent || '')) return false; }
    return true;
  }
  function upper(el) {
    const v = el.value, u = v.toUpperCase();
    if (v === u) return;
    let s = null, e = null;
    try { s = el.selectionStart; e = el.selectionEnd; } catch (x) {}
    el.value = u;
    try { if (s != null) el.setSelectionRange(s, e); } catch (x) {}
  }
  document.addEventListener('input', e => { const el = e.target; if (e.isComposing || !capsOK(el)) return; upper(el); }, true);
  document.addEventListener('focusout', e => { if (capsOK(e.target)) upper(e.target); }, true);
  /* values filled in by code (a booking, a saved record) are made capitals when the person presses any button on that form */
  function sweep(root) { if (!root || !root.querySelectorAll) return; root.querySelectorAll('input,textarea').forEach(el => { if (capsOK(el)) upper(el); }); }
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('button,.action-btn,.modal-btn');
    if (!b) return;
    sweep(b.closest('.modal-box') || b.closest('.section') || b.closest('.panel'));
  }, true);

  /* ════════════════════════════ storage (IndexedDB, falls back to localStorage) ════════════════════════════ */
  const DB = 'gargo-drafts', ST = 'drafts', LSK = 'gargo-drafts-ls';
  let idbP = null;
  function idb() {
    if (idbP) return idbP;
    idbP = new Promise((res, rej) => {
      try {
        if (!window.indexedDB) return rej(new Error('no indexedDB'));
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => { try { r.result.createObjectStore(ST, { keyPath: 'id' }); } catch (e) {} };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error || new Error('indexedDB failed'));
        r.onblocked = () => rej(new Error('indexedDB blocked'));
      } catch (e) { rej(e); }
    });
    idbP.catch(() => { idbP = null; });
    return idbP;
  }
  const lsRead = () => { try { return JSON.parse(localStorage.getItem(LSK) || '[]') || []; } catch (e) { return []; } };
  const lsWrite = a => { try { localStorage.setItem(LSK, JSON.stringify(a)); return true; } catch (e) { return false; } };
  async function dbAll() {
    try {
      const db = await idb();
      return await new Promise((res, rej) => { const rq = db.transaction(ST, 'readonly').objectStore(ST).getAll(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error); });
    } catch (e) { return lsRead(); }
  }
  async function dbPut(d) {
    try {
      const db = await idb();
      await new Promise((res, rej) => { const tx = db.transaction(ST, 'readwrite'); tx.objectStore(ST).put(d); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('aborted')); });
      return true;
    } catch (e) {
      const a = lsRead().filter(x => x.id !== d.id); a.push(d);
      if (!lsWrite(a)) throw new Error('This device has no room to keep the draft. Submit the form, or remove photos and try again.');
      return true;
    }
  }
  async function dbDel(id) {
    try {
      const db = await idb();
      await new Promise((res, rej) => { const tx = db.transaction(ST, 'readwrite'); tx.objectStore(ST).delete(id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    } catch (e) { /* fall through to localStorage */ }
    const a = lsRead(); if (a.some(x => x.id === id)) lsWrite(a.filter(x => x.id !== id));
  }

  /* ════════════════════════════ state shared with the forms ════════════════════════════ */
  const G = { dirty: false, sig0: null, f0: null, opener: null, modalOpener: null, cache: [], handlers: {}, resuming: false };
  const mine = () => G.cache.filter(d => d.uid === uid()).sort((a, b) => b.at - a.at);
  async function refresh() { try { G.cache = await dbAll(); } catch (e) { G.cache = []; } paintBtn(); return mine(); }

  /* page-level objects the forms keep outside their inputs (photos, repair lines) */
  const EXTRA = {
    repairItems: { get: () => { try { return JSON.parse(JSON.stringify(window._repairItems || {})); } catch (e) { return null; } }, set: v => { if (v) window._repairItems = v; } },
    surveyImages: { get: () => (typeof _surveyImages !== 'undefined' ? _surveyImages.slice() : null), set: v => { if (v && typeof _surveyImages !== 'undefined') _surveyImages = v; } },
    inwardImages: { get: () => (typeof _inwardImages !== 'undefined' ? _inwardImages.slice() : null), set: v => { if (v && typeof _inwardImages !== 'undefined') _inwardImages = v; } },
    dispatchImages: { get: () => (typeof _dispatchContainerImages !== 'undefined' ? _dispatchContainerImages.slice() : null), set: v => { if (v && typeof _dispatchContainerImages !== 'undefined') _dispatchContainerImages = v; } },
  };
  const getExtra = names => { const o = {}; (names || Object.keys(EXTRA)).forEach(n => { try { const v = EXTRA[n].get(); if (v != null) o[n] = v; } catch (e) {} }); return o; };
  const setExtra = x => { Object.keys(x || {}).forEach(n => { try { if (EXTRA[n]) EXTRA[n].set(x[n]); } catch (e) {} }); };
  const redraw = () => {
    try { const r = window._repairItems || {}; Object.keys(r).forEach(p => { if (r[p] && r[p].length && typeof renderRepairItemsList === 'function') renderRepairItemsList(p); }); } catch (e) {}
    try { if (typeof renderInwardImgPreview === 'function') renderInwardImgPreview(); } catch (e) {}
    try { if (typeof renderContainerImgGrid === 'function') renderContainerImgGrid(); } catch (e) {}
    try { if (window.GargoMoney) GargoMoney.refreshLabels(); } catch (e) {}
  };
  const extraSig = () => { try { const r = window._repairItems || {}; return JSON.stringify(r) + '|' + (typeof _surveyImages !== 'undefined' ? _surveyImages.length : 0); } catch (e) { return ''; } };

  /* ── reading / restoring fields ── */
  const SKIP_FIELD = f => f.type === 'password' || f.type === 'file' || f.type === 'button' || f.type === 'submit' || f.type === 'hidden';
  const keyOf = f => (f.id ? f.id : (f.name ? f.name + (f.type === 'radio' ? '=' + f.value : '') : ''));
  function readFields(root, only) {
    const o = {};
    root.querySelectorAll('input,select,textarea').forEach(f => {
      if (SKIP_FIELD(f)) return;
      const k = keyOf(f); if (!k || (only && !only(f, k))) return;
      o[k] = (f.type === 'checkbox' || f.type === 'radio') ? { c: f.checked, v: f.value } : { v: f.value };
    });
    return o;
  }
  function restoreFields(root, data) {
    if (!root || !data) return;
    const all = Array.prototype.slice.call(root.querySelectorAll('input,select,textarea')).filter(f => !SKIP_FIELD(f));
    const pass = () => all.forEach(f => {
      const d = data[keyOf(f)]; if (!d) return;
      if (f.type === 'checkbox' || f.type === 'radio') f.checked = !!d.c;
      else if (f.tagName === 'SELECT') { f.value = d.v; if (f.value !== d.v && d.v) { const o = document.createElement('option'); o.value = d.v; o.textContent = d.v; f.appendChild(o); f.value = d.v; } }
      else f.value = d.v;
    });
    pass();
    all.forEach(f => { if (f.tagName === 'SELECT' && data[keyOf(f)]) { try { f.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} } });   // let dependent fields appear
    pass();                                                                                                                                               // ...then put the values back if a handler reset them
  }
  const entryFields = root => Array.prototype.slice.call(root.querySelectorAll('input,select,textarea')).filter(f => !SKIP_FIELD(f) && f.type !== 'search' && !/search|filter|^q$/i.test(f.id || ''));
  const hasValue = root => entryFields(root).some(f => (f.type === 'checkbox' || f.type === 'radio') ? f.checked !== f.defaultChecked : (f.tagName === 'SELECT' ? f.selectedIndex > 0 && !!f.value : String(f.value || '').trim() !== ''));
  function labelFrom(root) {
    const f = entryFields(root).find(x => x.tagName === 'INPUT' && /text|^$/.test(x.type || 'text') && String(x.value || '').trim() && /cont|ref|name|reg|no$/i.test(x.id || ''))
      || entryFields(root).find(x => x.tagName === 'INPUT' && /text|^$/.test(x.type || 'text') && String(x.value || '').trim());
    return f ? String(f.value).trim().toUpperCase().slice(0, 40) : '';
  }

  /* ════════════════════════════ openers: so a paused dialog can be rebuilt with fresh data ════════════════════════════ */
  function wrapOpener(name) {
    const f = window[name];
    if (typeof f !== 'function' || f._gd) return;
    const w = function () {
      const args = Array.prototype.slice.call(arguments);
      G.opener = { name, args: args.every(a => a == null || /^(string|number|boolean)$/.test(typeof a)) ? args : null, at: Date.now() };
      return f.apply(this, arguments);
    };
    w._gd = true; w.toString = () => Function.prototype.toString.call(f);
    try { Object.keys(f).forEach(k => { w[k] = f[k]; }); } catch (e) {}
    window[name] = w;
  }
  function discover() {
    let names = [];
    try { names = Object.keys(window); } catch (e) { return; }
    names.forEach(name => {
      if (name === 'openModal' || name === 'closeModal' || /^(on|webkit|_gd)/.test(name)) return;
      let f; try { f = window[name]; } catch (e) { return; }
      if (typeof f !== 'function' || f._gd) return;
      let src; try { src = Function.prototype.toString.call(f); } catch (e) { return; }
      if (src.length > 80000 || src.indexOf('openModal(') < 0 || !/<input|<select|<textarea|class="fg"/.test(src)) return;
      wrapOpener(name);
    });
  }

  /* ════════════════════════════ modals ════════════════════════════ */
  const _openModal = window.openModal, _closeModal = window.closeModal;
  if (typeof _openModal !== 'function' || typeof _closeModal !== 'function') return console.error('form-guard.js needs admin-ui-shell.js first');

  window.openModal = function (title, body) {
    const op = G.opener && Date.now() - G.opener.at < 20000 ? G.opener : null;
    G.opener = null;
    const r = _openModal.apply(this, arguments);
    G.modalOpener = op; G.dirty = false; G.sig0 = null; G.f0 = null;
    setTimeout(() => { if (G.dirty) return; G.sig0 = extraSig(); const b = $('modalBody'); if (b) G.f0 = JSON.stringify(readFields(b)); syncPauseBtn(); }, 350);
    syncPauseBtn();
    return r;
  };
  const isRealEvent = e => !!(e && typeof Event !== 'undefined' && e instanceof Event);
  window.closeModal = function (e) {
    if (isRealEvent(e)) {                                         // a genuine click on the dark area around the dialog
      if (e.target !== overlay()) return;
      if (modalOpen() && modalDirty()) { ask(); return; }
    }
    const r = _closeModal.apply(this, arguments);
    if (!modalOpen()) { G.dirty = false; G.modalOpener = null; syncPauseBtn(); }
    return r;
  };

  function modalDirty() {
    const body = $('modalBody'); if (!body || !modalOpen() || !isEntry()) return false;
    return G.dirty || (G.sig0 != null && extraSig() !== G.sig0) || (G.f0 != null && JSON.stringify(readFields(body)) !== G.f0);
  }
  function isEntry() {
    const body = $('modalBody'); if (!body) return false;
    const f = entryFields(body);
    return f.length >= 2 && !f.some(x => x.type === 'password');
  }
  document.addEventListener('input', e => { if (e.target && e.target.closest && e.target.closest('#modalBody') && !/search/.test(e.target.type || '')) G.dirty = true; }, true);
  document.addEventListener('change', e => { if (e.target && e.target.closest && e.target.closest('#modalBody')) G.dirty = true; }, true);

  /* the X button and the Esc key close the dialog from code that does not know about unsaved entries: catch them first */
  document.addEventListener('click', e => {
    const x = e.target && e.target.closest && e.target.closest('.modal-close');
    if (x && modalOpen() && modalDirty()) { e.preventDefault(); e.stopPropagation(); ask(); }
  }, true);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOpen() && !$('gdAsk') && modalDirty()) { e.preventDefault(); e.stopPropagation(); ask(); }
  }, true);

  /* ── the three-way question ── */
  function ask() {
    if ($('gdAsk')) return;
    const can = isEntry();
    const box = document.createElement('div');
    box.id = 'gdAsk'; box.className = 'gd-ask';
    box.innerHTML = '<div class="gd-ask-card" role="alertdialog" aria-modal="true"><div class="gd-ask-t">You have not saved this form</div>' +
      '<div class="gd-ask-s">Closing it now will lose what you typed. You can pause it and finish later from <b>Pending</b>.</div>' +
      '<div class="gd-ask-b"><button type="button" class="action-btn" data-a="keep">Keep editing</button>' +
      (can ? '<button type="button" class="action-btn ghost" data-a="pause">&#9208; Pause, finish later</button>' : '') +
      '<button type="button" class="action-btn ghost gd-danger" data-a="drop">Discard</button></div></div>';
    document.body.appendChild(box);
    const done = () => { if (box.parentNode) box.parentNode.removeChild(box); };
    box.addEventListener('click', async ev => {
      const a = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-a');
      if (ev.target === box || a === 'keep') return done();
      if (a === 'drop') { done(); G.dirty = false; _closeModal(); G.modalOpener = null; return; }
      if (a === 'pause') { done(); pauseModal(); }
    });
    const k = box.querySelector('[data-a=keep]'); if (k) k.focus();
  }

  /* ── pause a dialog ── */
  const mkId = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  async function pauseModal() {
    const body = $('modalBody'); if (!body || !isEntry()) return;
    sweep(body);
    const op = G.modalOpener && G.modalOpener.args ? { name: G.modalOpener.name, args: G.modalOpener.args } : null;
    const d = {
      id: mkId(), uid: uid(), at: Date.now(), kind: 'modal', title: ($('modalTitle') || {}).textContent || 'Form', label: labelFrom(body),
      opener: op, html: op ? null : body.innerHTML, fields: readFields(body), extra: getExtra(),
    };
    try { await dbPut(d); } catch (e) { return say(e.message || 'Could not pause this form', 'error', 6000); }
    G.dirty = false; _closeModal(); G.modalOpener = null;
    await refresh();
    say('Paused. Continue it later from Pending (the pause icon at the top).', 'success', 5000);
  }

  /* the Pause button inside every entry dialog */
  function syncPauseBtn() {
    const hdr = document.querySelector('#modalOverlay .modal-hdr'); if (!hdr) return;
    let b = $('gdPauseBtn');
    const show = modalOpen() && isEntry();
    if (!b) {
      if (!show) return;
      b = document.createElement('button'); b.type = 'button'; b.id = 'gdPauseBtn'; b.className = 'gd-pause'; b.title = 'Save this form to Pending and finish it later';
      b.innerHTML = '&#9208; Pause'; b.onclick = pauseModal;
      const x = hdr.querySelector('.modal-close'); hdr.insertBefore(b, x || null);
    }
    b.style.display = show ? '' : 'none';
  }
  let mo, moT;
  function watchModal() {
    const body = $('modalBody'); if (!body || mo) return;
    mo = new MutationObserver(() => { clearTimeout(moT); moT = setTimeout(() => { syncPauseBtn(); sweep(body); }, 80); });
    mo.observe(body, { childList: true, subtree: true });
  }

  /* ════════════════════════════ resume ════════════════════════════ */
  async function resumeModal(d) {
    let opened = false;
    if (d.opener && typeof window[d.opener.name] === 'function') {
      try { await window[d.opener.name].apply(null, d.opener.args || []); } catch (e) { console.warn('resume opener failed', e); }
      opened = modalOpen();
      if (!opened) throw new Error('Could not reopen this form. The record may have changed or been completed. The draft is kept.');
    } else if (d.html) { window.openModal(d.title, d.html); opened = true; }
    if (!opened) throw new Error('Could not reopen this form.');
    await new Promise(r => setTimeout(r, 120));                    // let the form designer / async parts add their fields
    setExtra(d.extra);
    restoreFields($('modalBody'), d.fields);
    redraw();
    G.dirty = true; G.sig0 = extraSig(); G.f0 = null; syncPauseBtn();
  }

  /* ════════════════════════════ page forms (Gate-In, Dispatch, Fuel) ════════════════════════════ */
  const ZONES = {
    inward: {
      title: 'Gate-In entry', root: 'sec-inward', submit: 'createInwardEntry', extra: ['inwardImages'],
      mine: (f, k) => /^(iw_|gf_inward)/.test(k),
      ready: () => !!$('iw_container'),
      blocked: () => (typeof _inwardBooking !== 'undefined' && _inwardBooking) ? 'This Gate-In is linked to a booking. Save it, or clear the form, so the booking link is not lost.' : '',
      reset: () => { try { clearInwardForm(); } catch (e) {} },
      open: () => { const b = document.querySelector('#sec-inward .filter-row .filter-btn'); try { switchInwardTab('single', b); } catch (e) {} },
    },
    dispatch: {
      title: 'Dispatch order', root: 'sec-dispatch', submit: 'createDispatch', extra: ['dispatchImages'],
      mine: (f, k) => /^(d_|gf_dispatch)/.test(k) && !/bulk|^bd_/.test(k),
      ready: () => !!$('d_container') && (typeof _dispatchEditingTripId === 'undefined' || !_dispatchEditingTripId),
      reset: () => { try { cancelDispatchEdit(); } catch (e) {} },
      open: () => { const b = document.querySelector('#sec-dispatch .filter-row .filter-btn'); try { switchDispatchTab('single', b); } catch (e) {} },
    },
    fuel: {
      title: 'Fuel entry', root: 'sec-fuel', submit: 'addFuelLog', extra: [],
      mine: (f, k) => /^(f_|gf_fuel)/.test(k),
      ready: () => !!$('f_litres'),
      reset: () => {
        ['f_litres', 'f_price', 'f_total', 'f_station', 'f_odo', 'f_receipt'].forEach(id => { const el = $(id); if (el) el.value = ''; });
        ['f_truck', 'f_driver'].forEach(id => { const el = $(id); if (el) el.selectedIndex = 0; });
        try { clearPendingReceiptImg('f', 'f_receipt_img_preview'); } catch (e) {}
      },
      open: () => {},
    },
  };
  function zoneHasData(z) { const r = $(z.root); if (!r) return false; return Object.keys(readFields(r, z.mine)).some(k => { const f = r.querySelector('#' + CSS.escape(k)); return f && entryFields(r).indexOf(f) >= 0 && ((f.tagName === 'SELECT') ? false : String(f.value || '').trim() !== ''); }); }
  async function pauseZone(key) {
    const z = ZONES[key], root = z && $(z.root); if (!z || !root) return;
    if (!z.ready()) return say('Finish or cancel the edit that is open first.', 'info');
    const why = z.blocked ? z.blocked() : ''; if (why) return say(why, 'info', 6000);
    sweep(root);
    if (!zoneHasData(z)) return say('Nothing entered yet, so there is nothing to pause.', 'info');
    const d = { id: mkId(), uid: uid(), at: Date.now(), kind: 'page', zone: key, title: z.title, label: labelFrom(root), fields: readFields(root, z.mine), extra: getExtra(z.extra) };
    try { await dbPut(d); } catch (e) { return say(e.message || 'Could not pause this form', 'error', 6000); }
    z.reset();
    await refresh();
    say(z.title + ' paused. Continue it from Pending (the pause icon at the top).', 'success', 5000);
  }
  async function resumeZone(d) {
    const z = ZONES[d.zone]; if (!z) throw new Error('This draft belongs to a page that no longer exists.');
    const nav = document.querySelector('.nav-item[data-section="' + d.zone + '"]');
    try { window.showSection(d.zone, nav); } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
    if (!z.ready()) throw new Error('Open the page and finish or cancel the current edit first.');
    if (zoneHasData(z) && !confirm('The ' + z.title + ' form already has something typed. Replace it with the paused one?')) throw new Error('Cancelled');
    z.open();
    setExtra(d.extra);
    restoreFields($(z.root), d.fields);
    redraw();
  }
  function injectPageButtons() {
    Object.keys(ZONES).forEach(key => {
      const z = ZONES[key], root = $(z.root); if (!root || root.querySelector('.gd-pause-page[data-z="' + key + '"]')) return;
      const btn = Array.prototype.slice.call(root.querySelectorAll('button')).find(b => String(b.getAttribute('onclick') || '').indexOf(z.submit + '(') === 0);
      if (!btn || !btn.parentNode) return;
      const p = document.createElement('button'); p.type = 'button'; p.className = 'action-btn ghost gd-pause-page'; p.setAttribute('data-z', key);
      p.innerHTML = '&#9208; Pause, finish later'; p.title = 'Save this form to Pending';
      p.onclick = () => pauseZone(key);
      btn.parentNode.insertBefore(p, btn.nextSibling);
    });
  }

  /* ════════════════════════════ the Pending list ════════════════════════════ */
  function ago(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; }
  function paintBtn() {
    const n = mine().length;
    let b = $('gdPendBtn');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'gdPendBtn'; b.className = 'gd-pend-btn';
      b.setAttribute('aria-label', 'Pending forms'); b.title = 'Pending (paused) forms';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg><span id="gdPendN" class="gd-pend-n"></span>';
      b.onclick = openPending;
      const anchor = $('gxSearchBtn') || $('themeBtn');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor); else { b.classList.add('gd-float'); document.body.appendChild(b); }
    }
    const c = $('gdPendN'); if (c) { c.textContent = n || ''; c.style.display = n ? '' : 'none'; }
    b.classList.toggle('has', n > 0);
    const shell = $('shell'), dp = $('driverPortal');
    const on = !!uid() && ((shell && shell.style.display === 'flex') || (dp && dp.style.display === 'flex'));
    b.style.display = on || b.classList.contains('gd-float') && !!uid() ? '' : 'none';
  }
  async function openPending() {
    if (modalOpen() && modalDirty()) return ask();
    const list = await refresh();
    const rows = list.map(d => '<div class="gd-row"><div class="gd-row-main"><b>' + esc(d.title) + (d.label ? ' &middot; ' + esc(d.label) : '') + '</b><span>' + esc(ago(d.at)) + ' &middot; ' + (d.kind === 'page' ? 'page form' : d.kind === 'reserve' ? 'repat reserve' : 'dialog') + '</span></div>' +
      '<button class="action-btn" onclick="GargoDrafts.resume(\'' + d.id + '\')">Continue</button><button class="action-btn ghost" onclick="GargoDrafts.discard(\'' + d.id + '\')">Delete</button></div>').join('');
    _openModal('Pending forms', '<div class="gd-pending">' + (rows || '<div class="empty-state"><div class="empty-state-label">Nothing is paused. Use Pause on any entry form to finish it later.</div></div>') +
      '<p class="gd-note">Paused forms are kept on this device for the person who paused them. They are not submitted until you continue and save.</p></div>');
    G.dirty = false; G.modalOpener = null; syncPauseBtn();
  }

  const GD = window.GargoDrafts = {
    list: mine, refresh,
    register(kind, h) { G.handlers[kind] = h; },
    async save(d) { d.id = d.id || mkId(); d.uid = d.uid || uid(); d.at = Date.now(); await dbPut(d); await refresh(); return d; },
    async resume(id) {
      const d = G.cache.find(x => x.id === id); if (!d) return say('That draft is gone.', 'error');
      if (G.resuming) return; G.resuming = true;
      try {
        if (modalOpen()) _closeModal();
        if (d.kind === 'modal') await resumeModal(d);
        else if (d.kind === 'page') await resumeZone(d);
        else if (G.handlers[d.kind]) await G.handlers[d.kind].resume(d);
        else throw new Error('Do not know how to continue this draft.');
        await dbDel(id); await refresh();
      } catch (e) { if (e && e.message !== 'Cancelled') say(e.message || 'Could not continue', 'error', 6000); }
      G.resuming = false;
    },
    async discard(id) { if (!confirm('Delete this paused form? This cannot be undone.')) return; await dbDel(id); await refresh(); openPending(); },
    pauseModal, pauseZone, capsSweep: sweep,
  };

  /* ════════════════════════════ styles ════════════════════════════ */
  const css = document.createElement('style'); css.id = 'gdCss';
  css.textContent = `
  .gd-pause{margin-left:auto;margin-right:8px;padding:6px 12px;border-radius:10px;border:1px solid var(--border-mid,#C9A22744);background:var(--gold-dim,rgba(201,162,39,.11));color:var(--gold,#C9A227);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
  .gd-pause:active{opacity:.8}
  .gd-pause-page{margin-left:8px}
  .gd-pend-btn{position:relative;display:flex;align-items:center;justify-content:center;flex:0 0 auto;width:40px;height:40px;margin-right:6px;border:1px solid var(--border);border-radius:12px;background:transparent;color:var(--text-2);cursor:pointer}
  .gd-pend-btn.has{color:var(--gold);border-color:var(--border-mid)}
  .gd-pend-btn.gd-float{position:fixed;left:10px;bottom:76px;z-index:9000;background:var(--glass-strong,#06080F)}
  .gd-pend-n{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:var(--gold,#C9A227);color:#1A1403;font-size:10.5px;font-weight:700;line-height:17px;text-align:center}
  .gd-ask{position:fixed;top:0;right:0;bottom:0;left:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6)}
  .gd-ask-card{width:100%;max-width:420px;padding:18px;border-radius:16px;background:var(--glass-strong,#0B0E18);border:1px solid var(--border-mid,#C9A22744);color:var(--text,#E8EAF0);box-shadow:0 12px 40px rgba(0,0,0,.5)}
  .gd-ask-t{font-size:16px;font-weight:700;margin-bottom:6px}
  .gd-ask-s{font-size:13px;line-height:1.55;color:var(--text-2);margin-bottom:14px}
  .gd-ask-b{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .gd-danger{color:var(--red,#EF4444)!important}
  .gd-row{display:flex;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)}
  .gd-row-main{flex:1;min-width:0;display:flex;flex-direction:column}
  .gd-row-main b{font-size:13px}.gd-row-main span{font-size:11px;color:var(--text-3)}
  .gd-note{font-size:11.5px;color:var(--text-3);margin:10px 0 0;line-height:1.5}
  @media(max-width:640px){.gd-pause{padding:6px 9px}}`;
  document.head.appendChild(css);

  /* ════════════════════════════ start-up ════════════════════════════ */
  function boot() {
    watchModal(); injectPageButtons(); paintBtn(); refresh();
    let st; const sec = new MutationObserver(() => { clearTimeout(st); st = setTimeout(injectPageButtons, 400); });
    const main = document.querySelector('main') || document.body; sec.observe(main, { childList: true, subtree: true });
  }
  const _show = window.showSection;
  window.addEventListener('load', () => { setTimeout(() => { discover(); boot(); }, 0); });
  setInterval(() => { try { paintBtn(); } catch (e) {} }, 4000);          // appears after sign-in, hides after sign-out
  window.addEventListener('beforeunload', e => { if (modalOpen() && modalDirty()) { e.preventDefault(); e.returnValue = ''; } });
  void _show;
})();