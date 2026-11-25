'use strict';

(function () {
  const $ = id => document.getElementById(id);
  if (typeof ROLE_SIDEBAR === 'undefined' || typeof ALL_SIDEBAR_SECTIONS === 'undefined') return console.error('unit-reserve.js needs admin-ui-shell.js first');

  /* ── lists (the fields also accept typing a new value) ── */
  const PORTS = [['KELAU', 'Lamu'], ['KEMBA', 'Mombasa'], ['KEMBADKPA', 'Mombasa'], ['KEMBADMAH', 'Mombasa'], ['KENBO', 'Nairobi'], ['KENBOICD', 'Nairobi'], ['KERNA', 'Naivasha'], ['KETHK', 'Thika']];
  const SHIPPERS = ['AGL KENYA LIMITED', 'ALCOTT WIZ TRADING', 'BILATERAL SEMITE', 'BOLLORE', 'CLOFFIK FREIGHT [K] LTD', 'CRISPOLL EAST AFRICA'];
  const LIST_LIMIT = 500, MAX_PASTE = 200, MAX_LEN = 120, PAGE = 30;

  /* ── what differs between the two pages ── */
  const BASE = { outward_date: 'Outward date', run_end_date: 'Run end date', run_end_time: 'Run end time', destination: 'Destination', vessel: 'Vessel', voyage: 'Voyage',
    release_order_no: 'Release order no.', shipper_order: "Shipper's order", shipper_name: "Shipper's name", port_of_dispatch: 'Port of dispatch' };
  const HEAD_KEYS = ['agent'].concat(Object.keys(BASE));
  const KINDS = [
    { kind: 'sale', sec: 'salereserve', api: 'SaleReserve', p: 'sl', nav: 'Reserve Sale Units', after: 'repatreserve', type: 'Sale units', short: 'Sale Unit', chip: 'SALE',
      what: 'sale unit reserve', plural: 'sale reserves', cfg: 'reserve.sale', draft: 'reserve_sale', heading: 'Reserved sale units', party: 'Buyer',
      labels: { outward_date: 'Sale date', run_end_date: 'Valid until date', run_end_time: 'Valid until time', shipper_name: "Buyer's name", shipper_order: 'Sale order no.', destination: 'Delivery location' },
      layout: [['outward_date', 'run_end_date'], ['run_end_time'], ['shipper_name'], ['shipper_order', 'release_order_no'], ['destination']],
      req: ['agent', 'outward_date', 'run_end_date', 'run_end_time', 'shipper_name', 'shipper_order'],
      cols: [['Buyer', r => r.shipper_name], ['Sale order', r => r.shipper_order], ['Release order', r => r.release_order_no]],
      defaults: {}, endLabel: 'Valid until', blurb: 'Hold containers for a sale',
      icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>' },
    { kind: 'shipper', sec: 'shipperreserve', api: 'ShipperReserve', p: 'sh', nav: 'Reserve Shippers Units', after: 'salereserve', type: 'Shippers/Export', short: 'Shipper', chip: 'SHIPPER',
      what: "shipper's units reserve", plural: "shipper reserves", cfg: 'reserve.shipper', draft: 'reserve_shipper', heading: "Reserved shippers' units", party: 'Shipper',
      labels: {},
      layout: [['outward_date', 'run_end_date'], ['run_end_time'], ['destination'], ['vessel', 'voyage'], ['release_order_no', 'shipper_order']],
      req: ['agent'].concat(Object.keys(BASE)),
      cols: [['Shipper', r => r.shipper_name], ['Vessel / voyage', r => (r.vessel || '') + ' ' + (r.voyage || '')], ['Destination', r => r.destination]],
      defaults: { port_of_dispatch: 'KEMBADKPA' }, endLabel: 'Run ends', blurb: "Hold containers for a shipper's booking",
      icon: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 15l2 5h14l2-5H3z"/><path d="M6 15V9h12v6M12 4v5"/></svg>' },
  ];

  /* ── shared helpers ── */
  const canWrite = () => { try { return isAdmin(); } catch (e) { return false; } };
  const norm = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const lc = v => String(v == null ? '' : v).trim().toLowerCase();
  const sizeOf = t => { const m = /^(\d{2})/.exec(String(t || '').trim()); return m ? m[1] : ''; };
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const hhmm = v => { const m = /^(\d{1,2}):(\d{2})/.exec(String(v == null ? '' : v)); return m ? pad(m[1]) + ':' + m[2] : ''; };
  const ymd = v => String(v == null ? '' : v).slice(0, 10);
  const runEnd = r => { const d = ymd(r.run_end_date); if (!d) return null; const t = new Date(d + 'T' + (hhmm(r.run_end_time) || '23:59')); return isNaN(t) ? null : t; };
  const total = r => Number(r.total) || 0, cleared = r => Number(r.cleared) || 0, balance = r => Math.max(0, total(r) - cleared(r));
  const fail = e => {
    const m = String((e && (e.message || e.details)) || e || '');
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) return 'The connection dropped. Nothing was changed. Try again when you are back online.';
    return m || 'Something went wrong';
  };
  const audit = (a, d) => { try { addAudit(state.profile && state.profile.username, a, d); } catch (e) {} };
  const withTimeout = (p, ms, what) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error((what || 'The server') + ' took too long to answer. Check the connection and try again.')), ms);
    Promise.resolve(p).then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
  async function pageAll(build, size) {
    const out = [];
    for (let from = 0; from < 50000; from += size) {
      const r = await withTimeout(build(from, from + size - 1), 25000);
      if (r.error) throw r.error;
      const rows = r.data || []; for (let i = 0; i < rows.length; i++) out.push(rows[i]);
      if (rows.length < size) break;
    }
    return out;
  }
  const uidNow = () => { try { return (state.currentUser && state.currentUser.id) || ''; } catch (e) { return ''; } };
  const lines = () => { try { return state.db.shippingLines || []; } catch (e) { return []; } };
  const agentLine = agent => { const k = norm(agent); return k ? (lines().find(l => norm(l.name) === k || norm(l.code) === k) || null) : null; };
  const lineCode = id => { const l = lines().find(x => x.id === id); return l ? (l.code || l.name) : ''; };
  const otherLine = (c, agent) => { const al = agentLine(agent); return !!(al && c._line && c._line !== al.id); };
  const agentNames = () => lines().filter(l => l.active !== false).map(l => l.name).filter(Boolean);
  const opts = (list, cur) => list.concat(cur && list.indexOf(cur) < 0 ? [cur] : []).map(v => `<option value="${esc(v)}">`).join('');
  const tellBlocked = m => { try { toast(m, 'error', 7000); } catch (e) {} };
  const cfgOn = k => { try { return !!(window.cfgGet && window.cfgGet(k) === true); } catch (e) { return false; } };
  const cfgOff = k => { try { return !!(window.cfgGet && window.cfgGet(k) === false); } catch (e) { return false; } };
  function canDispatch() { try { return isAdmin() || ['ops', 'dispatch', 'clerk'].indexOf(currentRole()) >= 0; } catch (e) { return false; } }
  function download(name, rows) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = (typeof ghCsvPreamble === 'function' ? ghCsvPreamble('\n') : '') + rows.map(r => r.map(q).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ── yard lookups (same sources as Reserve Repat) ── */
  function yardLocal(q, offset) {
    const idx = window.icOutIndex ? window.icOutIndex() : null, qq = norm(q);
    const all = ((state.db && state.db.interchange) || []).filter(i => window.icInYard && window.icInYard(i, idx) && (!qq || norm(i.container).indexOf(qq) >= 0 || norm(i.eirNumber).indexOf(qq) >= 0))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return { total: all.length, items: all.slice(offset, offset + PAGE) };
  }
  async function yardFromView(q, offset) {
    let qb = supabase.from('interchange_list').select('*', { count: 'exact' }).in('type', ['Gate-In', 'Depot-In']).is('date_out', null);
    const k = String(q || '').trim().replace(/[%,()*]/g, '');
    if (k) qb = qb.or('container.ilike.%' + k + '%,eir_number.ilike.%' + k + '%');
    const r = await withTimeout(qb.order('date', { ascending: true }).range(offset, offset + PAGE - 1), 25000);
    if (r.error) throw r.error;
    const rows = (r.data || []).map(x => (window.ICR ? ICR.mapRow(x) : icFromRow(x)));
    return { total: r.count != null ? r.count : offset + rows.length, items: window.ICR ? ICR.merge(rows) : rows, approx: true,
      note: 'The yard search is not answering, so this is an approximate list. It can include containers that already left. Check each one before saving.' };
  }
  async function yardPage(q, offset) {
    let perr = null;
    if (window.ICR && ICR.enabled && navigator.onLine) {
      try { const r = await withTimeout(ICR.yard({ q: q || null, limit: PAGE, offset }), 25000); return { total: r.total, items: r.items }; }
      catch (e) { perr = e; console.warn('Reserve picker: yard search failed', e); }
      try { return await yardFromView(q, offset); } catch (e2) { console.warn('Reserve picker: list view failed', e2); }
    }
    const local = yardLocal(q, offset);
    if (perr) { if (!local.items.length) throw perr; local.note = 'The yard search failed (' + fail(perr) + '). Showing only containers already loaded on this device.'; local.approx = true; }
    else if (!navigator.onLine) local.note = 'You are offline. Showing only containers already loaded on this device.';
    return local;
  }
  const rowInfo = ic => ({
    container_no: String(ic.container || '').trim().toUpperCase(), in_eir: ic.eirNumber || '', size: sizeOf(ic.ctype), type: ic.ctype || '', _line: ic.line || '',
    survey: ic.surveyStatus || '', dmg: (ic.repairs && ic.repairs.length) || 0, days: Math.max(0, Math.floor((Date.now() - new Date(ic.date).getTime()) / 864e5)),
  });
  const manualInfo = (k, why) => ({ container_no: k, in_eir: '', size: '', type: '', _line: '', survey: '', dmg: 0, days: 0, not_in_system: true, not_in_system_note: why });
  const waitingSurvey = c => c.survey === 'awaiting_survey' || c.survey === 'escalated';
  function parseNumbers(text) {
    const out = [];
    String(text || '').split(/[\r\n,;\t]+/).forEach(piece => {
      const whole = norm(piece); if (!whole) return;
      if (whole.length === 11) out.push(whole); else piece.split(/\s+/).forEach(x => { const k = norm(x); if (k) out.push(k); });
    });
    return Array.from(new Set(out));
  }

  /* ── page styles (the same classes Reserve Repat uses; added here only if that page is not loaded) ── */
  if (!$('rrCss')) {
    const st = document.createElement('style'); st.id = 'rrCss';
    st.textContent = `
      .rr-grid{display:grid;grid-template-columns:minmax(300px,420px) 1fr;gap:16px;align-items:start}
      @media(max-width:900px){.rr-grid{grid-template-columns:1fr}}
      .rr-form .fg{margin-bottom:10px}.rr-form .fg label{display:block;font-size:12px;color:var(--text-3);margin-bottom:3px}
      .rr-form input,.rr-form select{width:100%}
      .rr-form .rr-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .rr-counts{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px}
      .rr-count{flex:1;min-width:90px;padding:10px 12px;border-radius:10px;border:1px solid var(--border,rgba(128,128,128,.28))}
      .rr-count b{display:block;font-size:22px;line-height:1.1}.rr-count span{font-size:11px;color:var(--text-3)}
      .rr-count.ok b{color:var(--green)}.rr-count.wait b{color:var(--amber)}.rr-count.bad b{color:var(--red)}
      .rr-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
      .rr-tools input[type=text],.rr-tools input[type=search]{flex:1;min-width:160px}
      .rr-pick{max-height:360px;overflow:auto;border:1px solid var(--border,rgba(128,128,128,.28));border-radius:10px;margin-top:8px}
      .rr-pick label{display:flex;gap:10px;align-items:center;padding:7px 10px;border-bottom:1px solid var(--border,rgba(128,128,128,.16));cursor:pointer;font-size:13px}
      .rr-pick label.off{opacity:.45;cursor:not-allowed}
      .rr-pick .rr-m{margin-left:auto;font-size:11px;color:var(--text-3);text-align:right}
      .rr-pick .rr-warn{color:var(--amber)}
      .rr-note{font-size:12px;color:var(--text-3);margin:6px 0 0}
      .rr-err{color:var(--red);font-size:12px;min-height:16px;margin-top:6px;line-height:1.5}
      .rr-list tr.rr-row{cursor:pointer}
      .rr-b{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:600;border:1px solid currentColor}
      .rr-red{color:var(--red)}.rr-amb{color:var(--amber)}
      .rr-dirty{margin-left:8px;font-size:11px;color:var(--amber)}
      .rr-report{margin:6px 0 0;padding-left:18px;max-height:140px;overflow:auto;font-size:12px;color:var(--text-2)}
      .rr-sum{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px}
      .rr-sum .rr-count{cursor:default}`;
    document.head.appendChild(st);
  }

  /* the per-user tick lists and the desk roles get these pages too (drivers never) */
  (function () {
    const f = window.withDataHub; if (typeof f !== 'function' || f._rs) return;
    const w = function () {
      const a = f.apply(this, arguments); let driver = false; try { driver = currentRole() === 'driver'; } catch (e) {}
      return driver ? a : a.concat(KINDS.map(K => K.sec).filter(s => a.indexOf(s) < 0));
    };
    w._rs = true; window.withDataHub = w;
  })();

  const APIS = [];
  const bySec = {};

  /* ══════════════════════════════════════════════════════════════════════════════════════════════════
     one reserve page. K is the entry from KINDS.
  ══════════════════════════════════════════════════════════════════════════════════════════════════ */
  function make(K) {
    const SEC = K.sec, p = K.p, API = K.api, tag = K.chip;
    const RR = window[API] = {};
    APIS.push(RR); bySec[SEC] = RR;
    const S = { reserves: null, taken: new Map(), view: 'list', filter: 'open', sort: 'new', q: '', E: null, pick: null, busy: false, dirty: false, opening: false, at: null, truncated: false, byId: new Map(), stale: false };
    const rn = r => r ? (r.reserve_ref || r.reserve_no) : '';
    const CK = () => 'gargo-ur-cache:' + K.kind + ':' + uidNow();
    const readCache = () => { try { const c = JSON.parse(localStorage.getItem(CK()) || 'null'); return c && c.reserves ? c : null; } catch (e) { return null; } };
    const writeCache = () => { try { localStorage.setItem(CK(), JSON.stringify({ at: Date.now(), reserves: S.reserves, taken: Array.from(S.taken.entries()) })); } catch (e) {} };
    const useCache = c => { S.reserves = c.reserves; S.taken = new Map(c.taken || []); S.at = new Date(c.at); S.stale = true; S.byId = new Map(S.reserves.map(r => [r.id, r])); };
    const lab = k => (K.labels[k] || BASE[k]) + (K.req.indexOf(k) >= 0 ? ' *' : '');
    const need = k => (K.labels[k] || BASE[k]).replace(/ \*$/, '');
    const enforceOn = () => cfgOn(K.cfg + '.enforce');
    const autoOn = () => !cfgOff(K.cfg + '.autoClear');
    const isMine = v => v === K.type;

    /* ── register: access, title, section, button ── */
    if (ALL_SIDEBAR_SECTIONS.indexOf(SEC) < 0) ALL_SIDEBAR_SECTIONS.push(SEC);
    ['admin', 'ops', 'clerk', 'dispatch', 'finance', 'hr', 'viewer'].forEach(r => { ROLE_SIDEBAR[r] = ROLE_SIDEBAR[r] || []; if (ROLE_SIDEBAR[r].indexOf(SEC) < 0) ROLE_SIDEBAR[r].push(SEC); });
    SECTION_META[SEC] = ['Container Ops', K.nav];
    function ensurePage() {
      if (!$('sec-' + SEC)) {
        const sec = document.createElement('section'); sec.className = 'section'; sec.id = 'sec-' + SEC;
        const ref = $('sec-' + K.after) || $('sec-repatreserve') || $('sec-gatesecurity') || $('sec-depops') || document.querySelector('.section');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(sec, ref.nextSibling);
      }
      if (!document.querySelector('.nav-item[data-section="' + SEC + '"]')) {
        const ref = document.querySelector('.nav-item[data-section="' + K.after + '"]') || document.querySelector('.nav-item[data-section="repatreserve"]') || document.querySelector('.nav-item[data-section="prestaking"]') || document.querySelector('.nav-item[data-section="interchange"]');
        if (ref) {
          const b = document.createElement('button'); b.className = 'nav-item'; b.setAttribute('data-section', SEC); b.setAttribute('onclick', "showSection('" + SEC + "',this)");
          b.innerHTML = K.icon + ' ' + K.nav; ref.parentNode.insertBefore(b, ref.nextSibling);
        }
      }
    }
    ensurePage();

    /* ── data ── */
    async function loadReserves() {
      const [a, items] = await Promise.all([
        withTimeout(supabase.from('unit_reserves_v').select('*').eq('kind', K.kind).order('reserve_no', { ascending: false }).limit(LIST_LIMIT), 25000),
        pageAll((f, t) => supabase.from('unit_reserve_items').select('container_no,reserve_id,cleared,in_eir,size').eq('kind', K.kind).eq('active', true).order('container_no').range(f, t), 1000),
      ]);
      if (a.error) throw a.error;
      const reserves = a.data || [], byId = new Map(reserves.map(r => [r.id, r]));
      const missing = Array.from(new Set(items.map(i => i.reserve_id).filter(id => id && !byId.has(id))));
      for (let k = 0; k < missing.length; k += 100) {
        try { const m = await withTimeout(supabase.from('unit_reserves_v').select('*').in('id', missing.slice(k, k + 100)), 20000); (m.data || []).forEach(r => byId.set(r.id, r)); } catch (e) { /* still shown as held, just without the number */ }
      }
      const taken = new Map();
      items.forEach(i => {
        const key = norm(i.container_no), prev = taken.get(key);
        if (prev && !prev.cleared && i.cleared) return;           // a live hold wins over an old cleared one
        const r = byId.get(i.reserve_id);
        taken.set(key, { id: i.reserve_id, no: r ? rn(r) : '?', agent: r ? r.agent : '', cleared: !!i.cleared, container_no: i.container_no, in_eir: i.in_eir || '', size: i.size || '' });
      });
      S.reserves = reserves; S.byId = byId; S.taken = taken; S.truncated = reserves.length >= LIST_LIMIT; S.at = new Date(); S.stale = false;
      writeCache();
    }
    async function fresh() {
      if (navigator.onLine && uidNow()) { try { await loadReserves(); return true; } catch (e) { /* use the last copy */ } }
      if (!S.reserves) { const c = readCache(); if (c) useCache(c); }
      return !!S.reserves;
    }
    RR.ensureLoaded = async () => {
      if (S.reserves && S.at && Date.now() - S.at.getTime() < 60000) return;
      if (!S.reserves) { const c = readCache(); if (c) useCache(c); }
      if (navigator.onLine && uidNow()) { try { await loadReserves(); } catch (e) { /* stay on the last copy */ } }
    };
    RR.lookup = key => { const t = S.taken.get(norm(key)); return t ? { id: t.id, no: t.no, agent: t.agent || '' } : null; };
    RR.header = key => { const t = S.taken.get(norm(key)); if (!t) return null; const r = (S.byId && S.byId.get(t.id)) || {}; return Object.assign({}, r, { reserve_no: t.no, agent: t.agent || r.agent || '', cleared: !!t.cleared, in_eir: t.in_eir || '', size: t.size || '' }); };
    RR.check = key => {
      const t = S.taken.get(norm(key));
      if (!t) return { ok: false, why: 'is not on any open ' + K.what };
      if (t.cleared) return { ok: false, why: 'is already cleared on reserve ' + t.no, hit: t };
      return { ok: true, hit: t };
    };
    /* a container already held by Reserve Repat or by the other new page cannot be taken here */
    function heldElsewhere(key) {
      try { if (window.RepatReserve) { const v = window.RepatReserve.check(key); if (v.ok) return 'repat reserve ' + v.hit.no; } } catch (e) {}
      for (let i = 0; i < APIS.length; i++) { const o = APIS[i]; if (o === RR) continue; try { const v = o.check(key); if (v.ok) return o.what + ' ' + v.hit.no; } catch (e) {} }
      return '';
    }
    RR.what = K.what;

    /* ── page ── */
    function errorPanel(e) {
      return '<div class="panel"><div class="empty-state"><div class="empty-state-label" style="line-height:1.7">Could not load reserves.<br><b>' + esc(fail(e)) + '</b><br>' +
        '<span style="font-size:12px;color:var(--text-3)">If this is the first use, run sql/unit-reserve.sql in Supabase.</span><br><br>' +
        `<button class="action-btn" onclick="${API}.retry()">Try again</button> <button class="action-btn ghost" onclick="${API}.diagnose()">Find out why</button></div></div></div>`;
    }
    async function render() {
      ensurePage();
      const root = $('sec-' + SEC); if (!root) return;
      if (!S.reserves) { const c = readCache(); if (c) useCache(c); }
      if (!S.reserves) root.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading reserves…</div></div>';
      let err = null;
      try { if (navigator.onLine) await loadReserves(); else if (!S.reserves) throw new Error('You are offline. Reserves load when the connection returns.'); else S.stale = true; }
      catch (e) { err = e; }
      if (err && !S.reserves) { root.innerHTML = errorPanel(err); return; }
      if (err) { S.stale = true; try { toast('Could not refresh: ' + fail(err) + ' Showing the last copy.', 'error', 5000); } catch (x) {} }
      if (S.view === 'edit' && S.E) renderEditor(); else { S.view = 'list'; renderList(); }
    }
    RR.retry = () => { S.reserves = null; return render(); };

    /* ── list ── */
    const isOverdue = r => { const t = runEnd(r); return !r.closed && balance(r) > 0 && t && t < new Date(); };
    function badge(r) {
      if (r.closed) return '<span class="hb hb-r">Closed</span>';
      if (total(r) > 0 && balance(r) === 0) return '<span class="hb hb-g">Complete</span>';
      const t = runEnd(r);
      if (t && t < new Date()) return '<span class="rr-b rr-red">Overdue</span>';
      if (t && t - Date.now() < 864e5) return '<span class="rr-b rr-amb">Ends soon</span>';
      return '<span class="hb hb-g">Open</span>';
    }
    function filtered() {
      const q = lc(S.q);
      const rows = (S.reserves || []).filter(r => {
        if (S.filter === 'open' && r.closed) return false;
        if (S.filter === 'closed' && !r.closed) return false;
        if (S.filter === 'overdue' && !isOverdue(r)) return false;
        return !q || [r.reserve_ref, r.reserve_no, r.agent, r.shipper_name, r.vessel, r.voyage, r.destination, r.release_order_no, r.shipper_order, r.port_of_dispatch].join(' ').toLowerCase().indexOf(q) >= 0;
      });
      if (S.sort === 'ends') rows.sort((a, b) => (runEnd(a) || 8e15) - (runEnd(b) || 8e15));
      return rows;
    }
    function renderList() {
      const root = $('sec-' + SEC); if (!root) return;
      const all = S.reserves || [], open = all.filter(r => !r.closed);
      const held = open.reduce((n, r) => n + balance(r), 0), late = all.filter(isOverdue).length;
      const tabs = [['open', 'Open'], ['overdue', 'Overdue'], ['closed', 'Closed'], ['all', 'All']].map(t => `<button class="filter-btn${S.filter === t[0] ? ' active' : ''}" data-f="${t[0]}" onclick="${API}.setFilter('${t[0]}')">${t[1]}</button>`).join('');
      root.innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title">${esc(K.heading)}</div>
        <div class="panel-meta">${canWrite() ? `<button class="action-btn" onclick="${API}.openNew()">+ New reserve</button>` : (canDispatch() ? 'Open a reserve to dispatch its containers' : 'View only')}</div></div>
        <div class="rr-sum"><div class="rr-count"><b>${open.length}</b><span>Open reserves</span></div><div class="rr-count wait"><b>${held}</b><span>Containers still held</span></div><div class="rr-count ${late ? 'bad' : ''}"><b>${late}</b><span>Overdue with balance</span></div></div>
        <div class="rr-tools">${tabs}<input type="search" id="${p}Search" placeholder="Search number, agent, ${K.party.toLowerCase()}, release order…" value="${esc(S.q)}" oninput="${API}.search(this.value)">
          <select id="${p}Sort" onchange="${API}.setSort(this.value)" aria-label="Sort"><option value="new"${S.sort === 'new' ? ' selected' : ''}>Newest first</option><option value="ends"${S.sort === 'ends' ? ' selected' : ''}>${esc(K.endLabel)} soonest</option></select>
          <button class="action-btn ghost" onclick="${API}.refresh()" title="Reload from the server">↻ Refresh</button><button class="action-btn ghost" onclick="${API}.exportList()">⬇ CSV</button></div>
        <div id="${p}Table"></div>
        <p class="rr-note">${S.stale ? '<b style="color:var(--amber)">Offline copy, may be out of date. </b>' : ''}${S.at ? 'Updated ' + pad(S.at.getHours()) + ':' + pad(S.at.getMinutes()) + '. ' : ''}${S.truncated ? 'Showing the latest ' + LIST_LIMIT + ' reserves.' : ''}</p></div>`;
      paintTable();
    }
    function paintTable() {
      const host = $(p + 'Table'); if (!host) return;
      const rows = filtered();
      document.querySelectorAll('#sec-' + SEC + ' .rr-tools .filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-f') === S.filter));
      host.innerHTML = rows.length ? `<div style="overflow:auto"><table class="data-table rr-list"><thead><tr><th>No.</th><th>Agent</th>${K.cols.map(c => '<th>' + esc(c[0]) + '</th>').join('')}<th>${esc(K.endLabel)}</th><th>Total</th><th>Cleared</th><th>Balance</th><th></th></tr></thead><tbody>${rows.map(r => `<tr class="rr-row" tabindex="0" onkeydown="if(event.key==='Enter')${API}.open('${r.id}')" onclick="${API}.open('${r.id}')"><td><b>${esc(rn(r))}</b></td><td>${esc(r.agent)}</td>${K.cols.map(c => '<td>' + esc(c[1](r)) + '</td>').join('')}<td>${esc(ymd(r.run_end_date))} ${esc(hhmm(r.run_end_time))}</td><td>${total(r)}</td><td>${cleared(r)}</td><td>${balance(r)}</td><td>${badge(r)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty-state"><div class="empty-state-label">' + (S.q || S.filter !== 'all' ? 'No reserves match.' : canWrite() ? 'No reserves here yet. Choose New reserve to hold containers for a shipping line.' : 'No reserves to show.') + '</div></div>';
    }
    RR.setFilter = f => { S.filter = f; paintTable(); };
    RR.setSort = v => { S.sort = v; paintTable(); };
    let st;
    RR.search = v => { S.q = v; clearTimeout(st); st = setTimeout(paintTable, 200); };
    RR.refresh = async () => { try { await loadReserves(); renderList(); } catch (e) { toast('Could not refresh: ' + fail(e), 'error', 5000); } };
    RR.exportList = () => {
      const rows = filtered(); if (!rows.length) return toast('Nothing to download', 'error');
      download(K.kind + '-reserves-' + today() + '.csv', [['Reserve No', 'Agent', K.party, 'Vessel', 'Voyage', 'Destination', 'Release Order', K.labels.shipper_order || BASE.shipper_order, 'Port of Dispatch', K.labels.outward_date || BASE.outward_date, K.endLabel, 'Total', 'Cleared', 'Balance', 'Status']]
        .concat(rows.map(r => [rn(r), r.agent, r.shipper_name, r.vessel, r.voyage, r.destination, r.release_order_no, r.shipper_order, r.port_of_dispatch, ymd(r.outward_date), ymd(r.run_end_date) + ' ' + hhmm(r.run_end_time), total(r), cleared(r), balance(r), r.closed ? 'Closed' : isOverdue(r) ? 'Overdue' : 'Open'])));
    };
    RR.exportOne = () => {
      const E = S.E; if (!E || !E.items.length) return toast('No containers to download', 'error');
      const h = E.head;
      download(K.kind + '-reserve-' + (E.reserve_no || 'new') + '.csv', [['Reserve No', 'Agent', K.party, 'Vessel', 'Voyage', 'Destination', 'Release Order', K.labels.shipper_order || BASE.shipper_order, 'Port of Dispatch', K.labels.outward_date || BASE.outward_date, K.endLabel, 'In EIR', 'Container', 'Size', 'Cleared']]
        .concat(E.items.map(i => [E.reserve_no || '', h.agent, h.shipper_name, h.vessel, h.voyage, h.destination, h.release_order_no, h.shipper_order, h.port_of_dispatch, h.outward_date, h.run_end_date + ' ' + h.run_end_time, i.in_eir || '', i.container_no, i.size || '', i.cleared ? 'Yes' : 'No'])));
    };

    /* ── editor ── */
    const blankHead = () => { const h = {}; HEAD_KEYS.forEach(k => { h[k] = ''; }); h.outward_date = today(); h.run_end_date = today(); h.run_end_time = '23:59'; Object.keys(K.defaults).forEach(k => { h[k] = K.defaults[k]; }); return h; };
    const confirmLeave = () => !(S.view === 'edit' && S.dirty) || confirm('You have unsaved changes on this reserve. Leave without saving?');
    const markDirty = () => { if (S.dirty) return; S.dirty = true; const t = $(p + 'Dirty'); if (t) t.hidden = false; };
    window.addEventListener('beforeunload', e => { if (S.view === 'edit' && S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    function readHead() { if (!S.E) return; const h = S.E.head; Object.keys(h).forEach(k => { const el = $(p + '_' + k); if (el) h[k] = el.value.trim(); }); }

    RR.openNew = () => {
      if (!canWrite()) return toast('Only an administrator can reserve containers', 'error');
      S.E = { id: null, closed: false, head: blankHead(), items: [], reserve_no: null };
      S.view = 'edit'; S.pick = null; S.dirty = false; renderEditor(true);
      [window.RepatReserve].concat(APIS).forEach(o => { try { o && o !== RR && o.ensureLoaded(); } catch (e) {} });   // so the picker can show what the other reserves hold
    };
    RR.open = async id => {
      if (S.opening) return;
      const r = (S.reserves || []).find(x => x.id === id); if (!r) return;
      if (!navigator.onLine) return toast('You are offline. A reserve opens when the connection returns.', 'error', 5000);
      S.opening = true;
      try {
        const { data, error } = await supabase.from('unit_reserve_items').select('*').eq('reserve_id', id).order('in_eir');
        if (error) throw error;
        const head = {}; HEAD_KEYS.forEach(k => { head[k] = /_date$/.test(k) ? ymd(r[k]) : (r[k] || ''); }); head.run_end_time = hhmm(r.run_end_time) || '23:59';
        S.E = { id, closed: !!r.closed, reserve_no: rn(r), head, items: data || [] };
        S.view = 'edit'; S.pick = null; S.dirty = false; renderEditor(true);
        [window.RepatReserve].concat(APIS).forEach(o => { try { o && o !== RR && o.ensureLoaded(); } catch (e) {} });
      } catch (e) { toast(fail(e), 'error', 5000); }
      S.opening = false;
    };
    RR.back = () => { if (!confirmLeave()) return; S.view = 'list'; S.E = null; S.pick = null; S.dirty = false; render(); };

    function renderEditor(fresh) {
      const root = $('sec-' + SEC); if (!root || !S.E) return;
      if (!fresh && $(p + '_agent')) readHead();
      const E = S.E, h = E.head, ro = !canWrite() || E.closed, dis = ro ? ' disabled' : '';
      const nCleared = E.items.filter(i => i.cleared).length, n = E.items.length;
      const typeOf = k => k === 'run_end_time' ? 'time' : /_date$/.test(k) ? 'date' : 'text';
      const f = k => `<div class="fg"><label>${esc(lab(k))}</label><input id="${p}_${k}" type="${typeOf(k)}" maxlength="${MAX_LEN}" value="${esc(h[k])}"${dis}${k === 'shipper_name' ? ` list="${p}Parties"` : k === 'port_of_dispatch' ? ` list="${p}Ports"` : ''}></div>`;
      const row = r => r.length > 1 ? '<div class="rr-two">' + r.map(f).join('') + '</div>' : f(r[0]);
      const usesPort = K.req.indexOf('port_of_dispatch') >= 0, al = agentLine(h.agent);
      const parties = Array.from(new Set((K.kind === 'shipper' ? SHIPPERS : []).concat((S.reserves || []).map(r => r.shipper_name).filter(Boolean)))).sort();
      root.innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title"><button class="action-btn ghost" onclick="${API}.back()">← All reserves</button>
        &nbsp; Reserve ${E.reserve_no ? esc(E.reserve_no) : '(new, number is given on save)'} ${E.closed ? '<span class="hb hb-r">Closed</span>' : ''}<span class="rr-dirty" id="${p}Dirty"${S.dirty ? '' : ' hidden'}>● Unsaved changes</span></div>
        <div class="panel-meta">${!ro ? `<button class="action-btn ghost" onclick="${API}.pause()" title="Save this reserve to Pending and finish it later">⏸ Pause</button>` : ''}${n ? `<button class="action-btn ghost" onclick="${API}.exportOne()">⬇ CSV</button>` : ''}${E.id && canWrite() ? `<button class="action-btn ghost" onclick="${API}.toggleClosed()">${E.closed ? 'Reopen' : 'Close reserve'}</button><button class="action-btn ghost" onclick="${API}.remove()">Delete</button>` : ''}</div></div>
        <div class="rr-grid"><div class="rr-form">
          <div class="fg"><label>Agent (shipping line) *</label><input id="${p}_agent" list="${p}Agents" maxlength="${MAX_LEN}" value="${esc(h.agent)}"${dis} onchange="${API}.agentChanged()"><datalist id="${p}Agents">${opts(agentNames(), h.agent)}</datalist></div>
          ${K.layout.map(row).join('')}
          ${usesPort ? `<div class="fg"><label>${esc(lab('port_of_dispatch'))}</label><input id="${p}_port_of_dispatch" list="${p}Ports" maxlength="${MAX_LEN}" value="${esc(h.port_of_dispatch)}"${dis}></div>` : ''}
          <datalist id="${p}Parties">${opts(parties, h.shipper_name)}</datalist><datalist id="${p}Ports">${PORTS.map(x => `<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('')}</datalist>
          <div class="rr-err" id="${p}Err" role="alert"></div>
          ${ro ? (E.closed ? '<p class="rr-note">This reserve is closed. Reopen it to change it.</p>' : '') : `<button class="action-btn" id="${p}Save" onclick="${API}.save()">${E.id ? 'Save changes' : 'Save reserve'}</button>`}
        </div><div>
          <div class="rr-counts"><div class="rr-count"><b>${n}</b><span>Total</span></div><div class="rr-count ok"><b>${nCleared}</b><span>Cleared</span></div><div class="rr-count wait"><b>${n - nCleared}</b><span>Balance</span></div></div>
          ${!ro && h.agent && !al ? '<p class="rr-note">This agent is not in the shipping lines list, so containers cannot be checked against its line.</p>' : ''}
          ${ro ? '' : `<div class="rr-tools"><button class="action-btn" onclick="${API}.openPicker()">+ Add from yard</button><button class="action-btn ghost" onclick="${API}.openPaste()">Paste a list (any container)</button></div><div id="${p}Picker"></div>`}
          ${n ? `<div style="overflow:auto;max-height:420px"><table class="data-table"><thead><tr><th>In EIR</th><th>Container</th><th>Size</th><th title="Ticked automatically when the container leaves the depot. Do not tick it to release a container for dispatch.">Cleared (left)</th>${ro ? '' : '<th></th>'}${E.id && !E.closed && canDispatch() ? '<th></th>' : ''}</tr></thead><tbody>${E.items.map((i, k) => `<tr><td>${esc(i.in_eir || '')}</td><td>${esc(i.container_no)}${otherLine(i, h.agent) && !i._ok ? ' <span class="rr-b rr-amb" title="Belongs to another shipping line">other line</span>' : ''}${i.not_in_system ? ' <span class="rr-b rr-amb" title="' + esc(i.not_in_system_note || 'Not found in the system when added') + '">not in system</span>' : ''}</td><td>${esc(i.size || '')}</td><td>${E.id && i.id && canWrite() ? `<input type="checkbox" ${i.cleared ? 'checked' : ''} onchange="${API}.clearOne(${k},this.checked)">` : (i.cleared ? 'Yes' : '')}</td>${ro ? '' : `<td>${i.cleared ? '' : `<button class="action-btn ghost" onclick="${API}.drop(${k})">Remove</button>`}</td>`}${E.id && !E.closed && canDispatch() ? `<td>${i.cleared || !i.id ? '' : `<button class="action-btn" onclick="${API}.dispatchFrom(${k})">Dispatch</button>`}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><div class="empty-state-label">No containers on this reserve yet.</div></div>'}
        </div></div></div>`;
      const form = root.querySelector('.rr-form'); if (form && !ro) form.addEventListener('input', markDirty);
      if (S.pick) paintPicker();
    }
    RR.agentChanged = () => { readHead(); markDirty(); renderEditor(); };
    RR.drop = k => { readHead(); const i = S.E.items[k]; if (i && !i.cleared) { S.E.items.splice(k, 1); markDirty(); renderEditor(); } };

    /* ── save ── */
    function validate(h) {
      const miss = K.req.filter(k => !h[k]);
      if (miss.length) return 'Fill in: ' + miss.map(k => k === 'agent' ? 'Agent' : need(k)).join(', ') + '.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(h.outward_date) || !/^\d{4}-\d{2}-\d{2}$/.test(h.run_end_date)) return 'Check the dates: use the date picker.';
      if (!/^\d{2}:\d{2}/.test(h.run_end_time)) return 'Check the ' + need('run_end_time').toLowerCase() + '.';
      if (h.run_end_date < h.outward_date) return 'The ' + need('run_end_date').toLowerCase() + ' is before the ' + need('outward_date').toLowerCase() + '.';
      const long = HEAD_KEYS.find(k => String(h[k]).length > MAX_LEN);
      if (long) return (long === 'agent' ? 'Agent' : need(long)) + ' is too long (' + MAX_LEN + ' characters at most).';
      return '';
    }
    RR.dropClashing = () => {
      readHead(); const E = S.E; if (!E) return;
      E.items = E.items.filter(i => { const t = S.taken.get(norm(i.container_no)); return !(t && t.id !== E.id) || i.cleared; });
      markDirty(); renderEditor();
    };
    RR.save = async () => {
      if (!canWrite() || S.busy) return;
      readHead();
      const E = S.E, h = E.head, err = $(p + 'Err'), btn = $(p + 'Save');
      const say = (m, html) => { if (err) { if (html) err.innerHTML = m; else err.textContent = m; } };
      const lock = on => { S.busy = on; if (btn) btn.disabled = on; };
      say('');
      const bad = validate(h); if (bad) return say(bad);
      if (!E.items.length) return say('Add at least one container.');
      if (!navigator.onLine) return say('You are offline. Reserve again when the connection returns.');
      lock(true);
      try {
        await loadReserves();
        const clash = E.items.filter(i => { const t = S.taken.get(norm(i.container_no)); return t && !t.cleared && t.id !== E.id; });
        if (clash.length) {
          const list = clash.slice(0, 8).map(i => esc(i.container_no) + ' (' + esc(S.taken.get(norm(i.container_no)).no) + ')').join(', ') + (clash.length > 8 ? ' and ' + (clash.length - 8) + ' more' : '');
          say('Already held by another open reserve: ' + list + `. <button class="action-btn ghost" type="button" onclick="${API}.dropClashing()">Remove them</button>`, true);
          return lock(false);
        }
        if (h.release_order_no) {
          const dupRo = (S.reserves || []).find(r => r.id !== E.id && !r.closed && lc(r.release_order_no) === lc(h.release_order_no));
          if (dupRo && !confirm('Release order ' + h.release_order_no + ' is already on open reserve ' + rn(dupRo) + '. Save anyway?')) return lock(false);
        }
        if (!E.id && !E.closed && new Date(h.run_end_date + 'T' + h.run_end_time.slice(0, 5)) < new Date() && !confirm('The ' + need('run_end_date').toLowerCase() + ' and time have already passed. Reserve anyway?')) return lock(false);
        const odd = E.items.filter(i => otherLine(i, h.agent) && !i._ok);
        if (odd.length) {
          if (!confirm(odd.length + ' container' + (odd.length === 1 ? ' belongs' : 's belong') + ' to a different shipping line than ' + h.agent + ':\n' + odd.slice(0, 6).map(i => i.container_no).join(', ') + (odd.length > 6 ? ' …' : '') + '\n\nSave anyway?')) return lock(false);
          odd.forEach(i => { i._ok = true; });
        }
        const { data, error } = await supabase.rpc('unit_reserve_save', { p_id: E.id, p_kind: K.kind, p_head: h, p_items: E.items.map(i => ({ container_no: i.container_no, in_eir: i.in_eir || '', size: i.size || '', not_in_system: !!i.not_in_system, not_in_system_note: i.not_in_system_note || '' })) });
        if (error) throw error;
        if (!data || !data.id) throw new Error('The server did not confirm the save. Check the reserve list before trying again.');
        audit(K.short + ' reserve saved', (data.reserve_ref || data.reserve_no) + ' · ' + E.items.length + ' containers · ' + h.agent);
        toast('Reserve ' + (data.reserve_ref || data.reserve_no) + ' saved', 'success');
        S.dirty = false; lock(false);
        try { await loadReserves(); } catch (x) { /* saved; the list refreshes on the next visit */ }
        return RR.open(data.id);
      } catch (e) { say(fail(e)); }
      lock(false);
    };
    RR.toggleClosed = async () => {
      const E = S.E; if (!E || !E.id || !canWrite() || S.busy) return;
      if (S.dirty && !confirm('You have unsaved changes. They will be lost. Continue?')) return;
      const left = E.items.filter(i => !i.cleared).length;
      if (!confirm(E.closed ? 'Reopen reserve ' + E.reserve_no + '? Its containers are held again, if no other reserve has taken them meanwhile.' : 'Close reserve ' + E.reserve_no + '?' + (left ? '\n' + left + ' uncleared container' + (left === 1 ? ' is' : 's are') + ' released for other reserves.' : ''))) return;
      S.busy = true;
      try {
        const { error } = await supabase.rpc('unit_reserve_close', { p_id: E.id, p_closed: !E.closed });
        if (error) throw error;
        audit(E.closed ? K.short + ' reserve reopened' : K.short + ' reserve closed', E.reserve_no);
        S.dirty = false; S.busy = false;
        try { await loadReserves(); } catch (x) {}
        return RR.open(E.id);
      } catch (e) { toast(fail(e), 'error', 6000); }
      S.busy = false;
    };
    RR.remove = async () => {
      const E = S.E; if (!E || !E.id || !canWrite() || S.busy) return;
      const done = E.items.filter(i => i.cleared).length;
      if (done) {
        const a = prompt('Reserve ' + E.reserve_no + ' has ' + done + ' cleared container' + (done === 1 ? '' : 's') + '. Deleting it removes that record. Closing is usually better.\n\nType the reserve number to delete it anyway:');
        if (a === null) return;
        if (String(a).trim().replace(/^#/, '').toLowerCase() !== String(E.reserve_no).toLowerCase()) return toast('Reserve number did not match. Nothing was deleted.', 'info', 4000);
      } else if (!confirm('Delete reserve ' + E.reserve_no + '? This cannot be undone.')) return;
      S.busy = true;
      try {
        const { error } = await supabase.rpc('unit_reserve_delete', { p_id: E.id });
        if (error) throw error;
        audit(K.short + ' reserve deleted', E.reserve_no);
        toast('Reserve deleted', 'success'); S.busy = false; S.dirty = false; return RR.back();
      } catch (e) { toast(fail(e), 'error', 6000); }
      S.busy = false;
    };
    RR.clearOne = async (k, on) => {
      const E = S.E, i = E && E.items[k]; if (!i || !canWrite() || S.busy) return;
      readHead();
      if (!on && !confirm('Mark ' + i.container_no + ' as NOT cleared? Do this only to correct a mistake.')) return renderEditor();
      if (on && !confirm('Mark ' + i.container_no + ' as CLEARED?\n\nCleared means this container has ALREADY LEFT the depot. A cleared container disappears from the Dispatch Console list and can no longer be dispatched from this reserve.\n\nIt is marked automatically when it gates out. Do NOT tick this to release it for dispatch: reserved containers are available until they leave.')) return renderEditor();
      if (!navigator.onLine) { toast('You are offline. Try again when the connection returns.', 'error', 4000); return renderEditor(); }
      S.busy = true;
      try {
        const { error } = await supabase.rpc('unit_reserve_clear', { p_id: E.id, p_containers: [i.container_no], p_cleared: on });
        if (error) throw error;
        i.cleared = on; audit(on ? K.short + ' container cleared' : K.short + ' container un-cleared', E.reserve_no + ' · ' + i.container_no);
        await loadReserves();
      } catch (e) { toast(fail(e), 'error', 6000); }
      S.busy = false; renderEditor();
    };

    /* ── picking containers from the yard ── */
    RR.openPicker = () => { readHead(); S.pick = { mode: 'yard', q: '', items: [], total: 0, sel: new Map(), busy: false }; paintPicker(); loadPick(true); };
    RR.openPaste = () => { readHead(); S.pick = { mode: 'paste', msg: '', left: '', report: [] }; paintPicker(); };
    async function loadPick(reset) {
      const P = S.pick; if (!P || P.mode !== 'yard' || P.busy) return;
      P.busy = true; P.err = ''; if (reset) { P.items = []; P.total = 0; } paintPicker();
      try { const r = await yardPage(P.q, P.items.length); P.items = P.items.concat(r.items.map(rowInfo)); P.total = r.total; P.note = r.note || ''; P.approx = !!r.approx; }
      catch (e) { P.err = fail(e); }
      P.busy = false; paintPicker();
    }
    function paintPicker() {
      const host = $(p + 'Picker'), P = S.pick; if (!host) return;
      if (!P) { host.innerHTML = ''; return; }
      if (P.mode === 'paste') {
        host.innerHTML = `<div class="panel" style="padding:12px"><div class="panel-title" style="margin-bottom:6px">Paste container numbers</div>
          <textarea id="${p}Paste" rows="5" style="width:100%" placeholder="One per line, or separated by spaces or commas">${esc(P.left || '')}</textarea>
          <p class="rr-note">Each number is checked against the yard. Any container can be added, whether or not the system shows it in the yard. Numbers held by another open reserve, or that are clearly not a container number (too short or too long), are listed with the reason and skipped. Skipped numbers stay in the box so you can fix them.</p>
          <div class="rr-err" id="${p}PasteMsg">${esc(P.msg || '')}</div>
          ${P.report && P.report.length ? `<ul class="rr-report">${P.report.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>` : ''}
          <div class="rr-tools"><button class="action-btn" id="${p}PasteGo" onclick="${API}.addPasted()">Check and add</button><button class="action-btn ghost" onclick="${API}.closePicker()">Cancel</button></div></div>`;
        return;
      }
      const have = new Set(S.E.items.map(i => norm(i.container_no))), al = agentLine(S.E.head.agent);
      host.innerHTML = `<div class="panel" style="padding:12px"><div class="rr-tools"><input type="search" id="${p}Pq" placeholder="Search container or EIR no." value="${esc(P.q)}" oninput="${API}.pickSearch(this.value)">
        <button class="action-btn ghost" onclick="${API}.pickAll()">Select all shown</button><button class="action-btn" id="${p}AddSel" onclick="${API}.addPicked()">Add selected (${P.sel.size})</button><button class="action-btn ghost" onclick="${API}.closePicker()">Close</button></div>
        ${al ? `<p class="rr-note" style="margin:0 0 6px">Agent line: <b>${esc(al.code || al.name)}</b>. Containers of other lines are marked.</p>` : ''}
        <div class="rr-pick">${P.items.map((c, n) => {
          const key = norm(c.container_no), t = S.taken.get(key), live = t && !t.cleared, dup = have.has(key), el = heldElsewhere(key), off = !!live || dup || !!el, odd = al && c._line && c._line !== al.id;
          const flags = [odd ? '<span class="rr-warn">Line ' + esc(lineCode(c._line) || '?') + '</span>' : '', waitingSurvey(c) ? '<span class="rr-warn">Awaiting survey</span>' : '', c.dmg ? '<span class="rr-warn">' + c.dmg + ' damage item' + (c.dmg > 1 ? 's' : '') + '</span>' : ''].filter(Boolean).join(' · ');
          return `<label class="${off ? 'off' : ''}"><input type="checkbox" ${off ? 'disabled' : ''} ${P.sel.has(key) ? 'checked' : ''} onchange="${API}.pickToggle(${n},this.checked)"><b>${esc(c.container_no)}</b><span>${esc(c.type)}</span><span class="rr-m">EIR ${esc(c.in_eir || '-')} · ${c.days} d in yard${flags ? '<br>' + flags : ''}${live ? '<br>Reserved on #' + esc(t.no) : el ? '<br>Held on ' + esc(el) : (dup ? '<br>Already on this reserve' : '')}</span></label>`;
        }).join('') || (P.busy ? '' : '<div class="empty-state"><div class="empty-state-label">' + (P.err ? 'Could not load the yard: ' + esc(P.err) + `<br><br><button class="action-btn" onclick="${API}.pickRetry()">Try again</button> <button class="action-btn ghost" onclick="${API}.diagnose()">Find out why</button>` : 'No containers in the yard match.' + (P.q ? '' : ' If the yard should have containers, choose Find out why.')) + '</div></div>')}
        ${P.items.length < P.total ? `<div style="padding:8px;text-align:center"><button class="action-btn ghost" onclick="${API}.pickMore()">Load more</button></div>` : ''}</div>
        <p class="rr-note">${P.busy ? 'Loading…' : 'Showing ' + P.items.length + ' of ' + P.total + ' in the yard, oldest first.'}</p>${P.note ? '<p class="rr-note rr-warn">' + esc(P.note) + '</p>' : ''}</div>`;
    }
    let pt;
    RR.pickSearch = v => { const P = S.pick; if (!P) return; P.q = v.trim(); clearTimeout(pt); pt = setTimeout(() => { loadPick(true).then(() => { const i = $(p + 'Pq'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }); }, 300); };
    RR.pickMore = () => loadPick(false);
    RR.pickRetry = () => loadPick(true);
    RR.pickToggle = (n, on) => { const P = S.pick, c = P && P.items[n]; if (!c) return; const k = norm(c.container_no); if (on) P.sel.set(k, c); else P.sel.delete(k); const b = $(p + 'AddSel'); if (b) b.textContent = 'Add selected (' + P.sel.size + ')'; };
    RR.pickAll = () => {
      const P = S.pick; if (!P) return;
      const have = new Set(S.E.items.map(i => norm(i.container_no)));
      P.items.forEach(c => { const k = norm(c.container_no), t = S.taken.get(k); if (!(t && !t.cleared) && !have.has(k) && !heldElsewhere(k)) P.sel.set(k, c); });
      paintPicker();
    };
    const toItem = (c, ok) => ({ container_no: c.container_no, in_eir: c.in_eir, size: c.size, cleared: false, _line: c._line, _ok: !!ok, not_in_system: !!c.not_in_system, not_in_system_note: c.not_in_system_note || '' });
    RR.addPicked = () => {
      const P = S.pick; if (!P || !P.sel.size) return toast('Tick the containers to add', 'info');
      readHead();
      if (P.approx && !confirm('This list is approximate (the yard search is not answering). Some containers may have already left.\n\nAdd the selected containers anyway?')) return;
      const agent = S.E.head.agent, picked = Array.from(P.sel.values()), odd = picked.filter(c => otherLine(c, agent));
      let ok = false;
      if (odd.length) {
        if (!confirm(odd.length + ' of the selected containers belong to a different shipping line than ' + agent + ':\n' + odd.slice(0, 6).map(c => c.container_no + ' (' + (lineCode(c._line) || '?') + ')').join(', ') + (odd.length > 6 ? ' …' : '') + '\n\nAdd them anyway?')) return;
        ok = true;
      }
      picked.forEach(c => S.E.items.push(toItem(c, ok || !otherLine(c, agent))));
      S.pick = null; markDirty(); renderEditor();
    };
    RR.closePicker = () => { S.pick = null; paintPicker(); };
    RR.addPasted = async () => {
      const ta = $(p + 'Paste'), msg = $(p + 'PasteMsg'), go = $(p + 'PasteGo'); if (!ta) return;
      const nums = parseNumbers(ta.value);
      if (!nums.length) { msg.textContent = 'Paste at least one container number.'; return; }
      if (nums.length > MAX_PASTE) { msg.textContent = 'You pasted ' + nums.length + ' numbers. Paste up to ' + MAX_PASTE + ' at a time.'; return; }
      readHead();
      if (go) go.disabled = true;
      msg.style.color = 'var(--text-3)'; msg.textContent = 'Checking ' + nums.length + ' containers…';
      const have = new Set(S.E.items.map(i => norm(i.container_no))), added = [], skipped = [];
      const idx = window.icOutIndex ? window.icOutIndex() : null;
      let done = 0;
      for (let i = 0; i < nums.length; i += 5) {
        await Promise.all(nums.slice(i, i + 5).map(async k => {
          try {
            if (have.has(k)) return skipped.push([k, 'already on this reserve']);
            const t = S.taken.get(k); if (t && !t.cleared) return skipped.push([k, 'held by reserve ' + t.no]);
            const el = heldElsewhere(k); if (el) return skipped.push([k, 'held by ' + el]);
            let rows = [];
            try { if (window.ICR && ICR.enabled) rows = await ICR.byContainer(k); else rows = ((state.db.interchange) || []).filter(r => norm(r.container) === k); }
            catch (e) { return skipped.push([k, 'could not be checked (' + fail(e) + ')']); }
            if (!/^[A-Z0-9]{5,15}$/.test(k)) return skipped.push([k, 'is too short or too long to be a container number (5 to 15 letters/digits)']);
            const std = /^[A-Z]{4}\d{7}$/.test(k), odd = std ? '' : ' (unusual number format)';
            if (!rows.length) return added.push(manualInfo(k, 'not found in the system when added' + odd));
            const live = rows.filter(r => r.type === 'Gate-In' || r.type === 'Depot-In').filter(r => r._inYard !== undefined ? r._inYard : window.icInYard(r, idx)).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (!live) return added.push(manualInfo(k, 'system shows it as already left the yard when added' + odd));
            added.push(rowInfo(live));
          } finally { done++; if (msg && done % 5 === 0) msg.textContent = 'Checked ' + done + ' of ' + nums.length + '…'; }
        }));
      }
      const agent = S.E.head.agent, odd = added.filter(c => otherLine(c, agent));
      let allowOdd = true;
      if (odd.length && !confirm(odd.length + ' of the containers belong to a different shipping line than ' + agent + ':\n' + odd.slice(0, 6).map(c => c.container_no + ' (' + (lineCode(c._line) || '?') + ')').join(', ') + (odd.length > 6 ? ' …' : '') + '\n\nAdd them anyway?')) allowOdd = false;
      let n = 0;
      added.forEach(c => { if (otherLine(c, agent) && !allowOdd) return skipped.push([c.container_no, 'other shipping line (not added)']); S.E.items.push(toItem(c, true)); n++; });
      if (n) markDirty();
      if (!skipped.length) { S.pick = null; renderEditor(); toast(n + ' container' + (n === 1 ? '' : 's') + ' added', 'success'); return; }
      S.pick = { mode: 'paste', msg: n + ' added, ' + skipped.length + ' skipped:', left: skipped.map(x => x[0]).join('\n'), report: skipped.map(x => x[0] + ': ' + x[1]) };
      renderEditor();
      toast(n + ' added, ' + skipped.length + ' skipped', 'info', 5000);
    };

    /* ── pause: keep a half-made reserve in Pending ── */
    RR.pause = async () => {
      const E = S.E; if (!E || !canWrite()) return;
      readHead();
      const h = E.head, blank = blankHead();
      const typed = Object.keys(h).some(k => h[k] && h[k] !== blank[k]) || E.items.length;
      if (!typed) return toast('Nothing entered yet, so there is nothing to pause.', 'info');
      if (!window.GargoDrafts) return toast('Pause is not available on this page load. Save the reserve instead.', 'error');
      try { await GargoDrafts.save({ kind: K.draft, title: K.short + ' reserve', label: E.reserve_no ? E.reserve_no : (h.agent || 'NEW').toUpperCase(), data: { E: JSON.parse(JSON.stringify(E)) } }); }
      catch (e) { return toast(fail(e), 'error', 6000); }
      S.dirty = false; S.view = 'list'; S.E = null; S.pick = null;
      toast('Reserve paused. Continue it from Pending (the pause icon at the top).', 'success', 5000);
      render();
    };
    window.addEventListener('load', () => {
      if (!window.GargoDrafts) return;
      GargoDrafts.register(K.draft, { resume: async d => {
        if (!d.data || !d.data.E) throw new Error('This paused reserve is empty.');
        S.E = d.data.E; S.view = 'edit'; S.pick = null; S.dirty = true;
        window.showSection(SEC, document.querySelector('.nav-item[data-section="' + SEC + '"]'));
      } });
    });

    /* ── "Find out why" ── */
    RR.diagnose = async () => {
      const rows = [];
      const add = (ok, name, detail) => rows.push('<div class="gc-chk ' + (ok === null ? 'wait' : ok ? 'ok' : 'bad') + '"><i></i><div><b>' + esc(name) + '</b>' + (detail ? '<br><span style="font-size:11.5px;color:var(--text-3)">' + esc(detail) + '</span>' : '') + '</div></div>');
      const missing = e => /PGRST202|PGRST205|42P01|42883|does not exist|could not find|not found in the schema/i.test(String((e && (e.code + ' ' + e.message + ' ' + e.details)) || ''));
      const step = async (name, fn, hint) => { try { const d = await withTimeout(fn(), 20000); add(true, name, d || ''); } catch (e) { add(false, name, fail(e) + (hint && missing(e) ? '  → ' + hint : '')); } };
      const sql = 'Run sql/unit-reserve.sql in the Supabase SQL editor.';
      add(navigator.onLine, 'Connection', navigator.onLine ? 'Online' : 'Offline: nothing can be loaded from the server.');
      add(canWrite() ? true : null, 'Your access', canWrite() ? 'Administrator: can create and change reserves.' : 'View only. Only an administrator can create or change reserves.');
      add((lines() || []).length > 0, 'Shipping lines loaded', (lines() || []).length + ' lines.');
      if (navigator.onLine) {
        await step('Reserve list (unit_reserves_v)', async () => { const r = await supabase.from('unit_reserves_v').select('id', { count: 'exact', head: true }).eq('kind', K.kind); if (r.error) throw r.error; return r.count + ' reserves'; }, sql);
        await step('Held containers (unit_reserve_items)', async () => { const r = await supabase.from('unit_reserve_items').select('container_no', { count: 'exact', head: true }).eq('kind', K.kind).eq('active', true); if (r.error) throw r.error; return r.count + ' containers currently held'; }, sql);
        const zero = '00000000-0000-0000-0000-000000000000';
        await step('Function unit_reserve_clear', async () => { const r = await supabase.rpc('unit_reserve_clear', { p_id: zero, p_containers: [], p_cleared: true }); if (r.error && missing(r.error)) throw r.error; return 'present'; }, sql);
        await step('Function unit_reserve_close', async () => { const r = await supabase.rpc('unit_reserve_close', { p_id: zero, p_closed: true }); if (r.error && missing(r.error)) throw r.error; return 'present'; }, sql);
        await step('Function unit_reserve_delete', async () => { const r = await supabase.rpc('unit_reserve_delete', { p_id: zero }); if (r.error && missing(r.error)) throw r.error; return 'present'; }, sql);
        add(null, 'Function unit_reserve_save', 'Not tested here because testing it would create a reserve. If saving fails, the SQL file has not been run.');
        await step('Yard search (ic_search)', async () => { if (!(window.ICR && ICR.enabled)) return 'Not used: the app is in full-load mode (?ic=full).'; const r = await ICR.yard({ limit: 1 }); return r.total + ' containers in the yard'; }, 'The on-demand interchange SQL (ic_search) is missing or failed.');
      }
      openModal(K.nav + ': what is working', '<div>' + rows.join('') + '<p class="rr-note">Red lines are the cause. Send a screenshot of this list if you need help.</p></div>');
    };

    /* ── dispatch: the reserved list ── */
    RR.enforced = enforceOn;
    RR.canDispatch = canDispatch;
    RR.type = K.type;
    RR.api = API;
    RR.kind = K;
    RR.fresh = fresh;
    RR.available = () => {
      const out = [];
      S.taken.forEach(t => { if (t.cleared || !t.container_no) return; const r = S.byId.get(t.id) || {}; out.push({ c: t.container_no, eir: t.in_eir || '', size: t.size || '', id: t.id, no: t.no, agent: t.agent || r.agent || '', r }); });
      out.sort((a, b) => (runEnd(a.r) || 8e15) - (runEnd(b.r) || 8e15));
      return out;
    };
    RR.isOverdueCount = () => (S.reserves || []).filter(isOverdue).length;
    RR.loaded = () => !!S.reserves;
    RR.listVisible = () => S.view === 'list' && !!$(p + 'Table') && $('sec-' + SEC).classList.contains('active');
    RR.redrawList = () => renderList();
    RR.reloadQuiet = () => loadReserves();
    RR.agentOf = r => agentLine(r && r.agent);
    RR.num = rn;
    RR.byId = id => S.byId.get(id) || {};
    RR.state = S;

    /* returns null when the container may go out, otherwise the sentence to show */
    RR.guard = async container => {
      if (!enforceOn()) return null;
      const c = String(container || '').trim();
      if (!c) return 'Pick the container from the ' + K.nav + ' list first.';
      if (!(await fresh())) return 'The reserve list could not be loaded, so ' + c.toUpperCase() + ' cannot be checked. Try again when you are online.';
      const v = RR.check(c);
      return v.ok ? null : c.toUpperCase() + ' ' + v.why + '. A ' + K.short + ' outward can only be made from the ' + K.nav + ' list.';
    };

    let dsT;
    RR.pickForDispatch = async function () {
      openModal(K.heading, `<div class="fg"><input id="${p}dq" placeholder="Search container, reserve no., agent, ${K.party.toLowerCase()}, release order…" oninput="${API}.dispatchSearch()" autocomplete="off"></div><div id="${p}dList"><div class="empty-state-label" style="padding:12px 0">Loading…</div></div>`);
      setTimeout(() => { const q = $(p + 'dq'); if (q) q.focus(); }, 60);
      if (!(await fresh())) { const l = $(p + 'dList'); if (l) l.innerHTML = '<div class="empty-state-label" style="padding:12px 0">The reserve list could not be loaded. Check the connection and try again.</div>'; return; }
      paintDispatchList();
    };
    RR.dispatchSearch = () => { clearTimeout(dsT); dsT = setTimeout(paintDispatchList, 200); };
    function paintDispatchList() {
      const host = $(p + 'dList'); if (!host) return;
      const q = lc((($(p + 'dq') || {}).value) || ''), all = RR.available();
      const rows = all.filter(x => !q || [x.c, x.no, x.agent, x.eir, x.r.vessel, x.r.voyage, x.r.destination, x.r.release_order_no, x.r.shipper_name, x.r.shipper_order].join(' ').toLowerCase().indexOf(q) >= 0);
      if (!rows.length) { host.innerHTML = '<div class="empty-state-label" style="padding:12px 0">' + (all.length ? 'No reserved containers match.' : 'There are no reserved containers waiting. An administrator creates reserves in ' + esc(K.nav) + '.') + '</div>'; return; }
      host.innerHTML = rows.slice(0, 80).map(x => {
        const late = isOverdue(x.r);
        return `<div class="activity-row" style="cursor:pointer;gap:10px" onclick="${API}.useForDispatch('${esc(x.c)}')"><div style="flex:1;min-width:0"><div class="mono" style="color:var(--gold);font-weight:600">${esc(x.c)} <span class="rr-b rr-amb" style="margin-left:6px">${esc(x.no)}${x.agent ? ' · ' + esc(String(x.agent).toUpperCase()) : ''}</span>${late ? ' <span class="rr-b rr-red">Overdue</span>' : ''}</div>` +
          '<div style="font-size:10.5px;color:var(--text-3)">' + [x.r.shipper_name, x.r.vessel && (x.r.vessel + ' ' + (x.r.voyage || '')), x.r.destination, x.r.release_order_no && ('RO ' + x.r.release_order_no), x.size && (x.size + 'ft'), x.eir && ('EIR ' + x.eir), x.r.run_end_date && (K.endLabel.toLowerCase() + ' ' + ymd(x.r.run_end_date) + ' ' + hhmm(x.r.run_end_time))].filter(Boolean).map(esc).join(' · ') + '</div></div></div>';
      }).join('') + (rows.length > 80 ? '<div class="rr-note">Showing 80 of ' + rows.length + '. Type to narrow the list.</div>' : '');
    }
    RR.useForDispatch = function (c) {
      const v = RR.check(c);
      if (!v.ok) { tellBlocked(String(c).toUpperCase() + ' ' + v.why + '.'); return; }
      const t = v.hit, r = S.byId.get(t.id) || {};
      try { closeModal(); } catch (e) {}
      const set = (id, val, only) => { const el = $(id); if (el && val != null && val !== '' && (!only || !el.value)) el.value = val; };
      const el = $('d_container'); if (!el) return;
      el.value = t.container_no; delete el.dataset.eirFor;
      try { markContainerValidity(el); } catch (e) {}
      const al = agentLine(r.agent || t.agent); if (al && $('d_line')) $('d_line').value = al.id;
      set('d_origin', 'Depot', true);
      set('d_dest', r.destination || r.port_of_dispatch);
      set('d_release_no', r.release_order_no); set('d_vessel', r.vessel); set('d_voyage', r.voyage);
      set('d_receiving', r.shipper_name, true);
      set('d_ref', rn(r), true);
      try { dispatchPrefillFromEir(); } catch (e) {}
      try { toast(String(t.container_no).toUpperCase() + ' taken from reserve ' + t.no, 'success', 3500); } catch (e) {}
    };
    RR.dispatchFrom = async function (k) {
      const E = S.E, i = E && E.items[k]; if (!i || i.cleared) return;
      if (S.dirty && !confirm('You have unsaved changes on this reserve. Go to Dispatch anyway?')) return;
      const msg = await RR.guard(i.container_no); if (msg) return tellBlocked(msg);
      S.view = 'list'; S.E = null; S.pick = null; S.dirty = false;
      try { window.showSection('dispatch', document.querySelector('.nav-item[data-section="dispatch"]')); } catch (e) { return tellBlocked('Could not open the Dispatch Console.'); }
      setTimeout(() => {
        try { if (typeof switchDispatchTab === 'function') switchDispatchTab('single', document.querySelector('#sec-dispatch .filter-btn')); } catch (e) {}
        const st = $('d_outwardtype'); if (!st) return;
        st.value = K.type; try { toggleDispatchOutwardType(); } catch (e) { syncDispatchForm(); }
        RR.useForDispatch(i.container_no);
      }, 200);
    };

    /* ── a reserved container that leaves the yard is marked cleared on its reserve ── */
    const QK = () => 'gargo-ur-clearq:' + K.kind + ':' + uidNow();
    const qRead = () => { try { return JSON.parse(localStorage.getItem(QK()) || '[]') || []; } catch (e) { return []; } };
    const qWrite = a => { try { localStorage.setItem(QK(), JSON.stringify(a)); } catch (e) {} };
    let flushing = false;
    async function flushClears() {
      if (flushing || !navigator.onLine) return; flushing = true;
      try {
        const q = qRead(), keep = [];
        for (const it of q) {
          try {
            const { error } = await supabase.rpc('unit_reserve_clear', { p_id: it.id, p_containers: [it.container], p_cleared: true });
            if (error) throw error;
            audit(K.short + ' container cleared (gate-out)', it.no + ' · ' + it.container);
            try { toast(it.container + ' left the yard: marked cleared on reserve ' + it.no, 'success', 5000); } catch (x) {}
            if (S.E && S.E.id === it.id) { const m = S.E.items.find(i => norm(i.container_no) === norm(it.container)); if (m) m.cleared = true; }
          } catch (e) {
            const m = String((e && e.message) || '');
            if (/failed to fetch|network|load failed/i.test(m)) keep.push(it);
            else console.warn(K.short + ' reserve auto-clear skipped:', it.container, m);
          }
        }
        qWrite(keep);
        if (keep.length !== q.length) { try { await loadReserves(); if (S.view === 'list' && $(p + 'Table')) renderList(); } catch (e) {} }
      } finally { flushing = false; }
    }
    RR.onContainerOut = async container => {
      try {
        if (!autoOn() || !uidNow()) return;
        const key = norm(container); if (!key) return;
        await RR.ensureLoaded();
        const t = S.taken.get(key); if (!t || t.cleared) return;
        const q = qRead(); if (q.some(x => norm(x.container) === key && x.id === t.id)) return;
        q.push({ id: t.id, no: t.no, container: String(container).toUpperCase() }); qWrite(q);
        flushClears();
      } catch (e) { console.warn(K.short + ' reserve auto-clear failed', e); }
    };
    window.addEventListener('online', () => setTimeout(flushClears, 3000));
    setInterval(() => { if (navigator.onLine && uidNow() && qRead().length) flushClears(); }, 60000);
    setInterval(() => { try { if (uidNow() && navigator.onLine && S.reserves && !document.hidden) loadReserves().then(() => { if (RR.listVisible()) renderList(); }).catch(() => {}); } catch (e) {} }, 120000);

    sectionRenderers[SEC] = render;
  }

  KINDS.forEach(make);

  /* ══════════════════════════════════════════════════════════════════════════════════════════════════
     things shared by both pages
  ══════════════════════════════════════════════════════════════════════════════════════════════════ */
  const forType = v => APIS.find(a => a.type === v) || null;

  /* every way a gate-out can be recorded (this device or another, bulk or single): a NEW out record in memory */
  const seenOut = new Set(); let baselined = false;
  setInterval(() => {
    try {
      if (!uidNow()) { baselined = false; return; }
      const rows = ((state.db && state.db.interchange) || []).filter(r => /Out$/.test(r.type || ''));
      if (!baselined) { rows.forEach(r => seenOut.add(r.id)); baselined = true; return; }
      rows.filter(r => !seenOut.has(r.id)).forEach(r => { seenOut.add(r.id); if (Date.now() - new Date(r.date).getTime() < 2 * 864e5) APIS.forEach(a => a.onContainerOut(r.container)); });
    } catch (e) {}
  }, 15000);

  /* Dispatch Console: choosing Sale unit / Shipper always offers "Pick from reserved list", the same as Repat.
     The form is only LOCKED to that list (work type fixed, container typed-in disabled) when reserve.<kind>.enforce = true. */
  function syncDispatchForm() {
    const st = $('d_outwardtype'), wt = $('d_worktype'), c = $('d_container'); if (!st || !wt || !c) return;
    const A = forType(st.value), on = !!(A && A.enforced());
    APIS.forEach(a => { const b = $('d_' + a.kind.p + '_box'); if (b && a !== A) b.style.display = 'none'; });
    /* undo only what this file locked (Repat manages its own lock) */
    const unlock = () => {
      const repatOn = (() => { try { return !!(window.RepatReserve && RepatReserve.enforced() && st.value === 'Repatriation to Port'); } catch (e) { return false; } })();
      if (!repatOn) { wt.disabled = false; c.readOnly = false; }
      if (c.dataset.rsPh !== undefined) { c.placeholder = c.dataset.rsPh; delete c.dataset.rsPh; }
    };
    if (!A) { if (c.dataset.rsPh !== undefined) unlock(); return; }
    const p = A.kind.p;
    let box = $('d_' + p + '_box');
    if (!box) {
      box = document.createElement('div'); box.id = 'd_' + p + '_box'; box.className = 'ops-notice';
      box.style.cssText = 'display:none;margin-bottom:12px;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap';
      const row = $('d_outwardtype_row'); if (row && row.parentNode) row.parentNode.insertBefore(box, row.nextSibling);
    }
    if (on) {
      if (c.dataset.rsPh === undefined) c.dataset.rsPh = c.placeholder || '';
      wt.value = 'Depot → Port'; wt.disabled = true; c.readOnly = true; c.placeholder = 'Pick from the ' + A.kind.nav + ' list';
    } else if (c.dataset.rsPh !== undefined) unlock();
    const intro = on
      ? esc(A.kind.short) + ' containers must come from the <b>' + esc(A.kind.nav) + '</b> list. Work type is fixed to Depot → Port.'
      : 'Take the container from the <b>' + esc(A.kind.nav) + '</b> list. It fills the line, destination, vessel and release order.';
    const paint = () => {
      let n = 0; try { n = A.available().length; } catch (e) {}
      const count = A.loaded() ? '<span id="d_' + p + '_n" style="display:block;margin-top:2px;font-size:11px;color:var(--text-3)">' + n + ' reserved container' + (n === 1 ? '' : 's') + ' waiting</span>' : '';
      box.innerHTML = '<span>' + intro + count + '</span><button type="button" class="action-btn" onclick="' + A.api + '.pickForDispatch()">Pick from reserved list</button>';
    };
    box.style.display = 'flex'; paint();
    A.ensureLoaded().then(() => { if ($('d_outwardtype') && $('d_outwardtype').value === A.type) paint(); }).catch(() => {});
  }

  /* DepOps manual outward: offer the reserved containers and fill the shipping line */
  function syncManual() {
    const st = $('depopsManualOutwardType'), c = $('depopsManualContainer'); if (!st || !c) return;
    const A = forType(st.value);
    if (A && A.enforced()) {
      A.ensureLoaded().then(() => {
        const id = A.kind.p + 'Avail'; let dl = $(id); if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
        dl.innerHTML = A.available().map(x => '<option value="' + esc(x.c) + '">' + esc(x.no + (x.agent ? ' · ' + x.agent : '')) + '</option>').join('');
        c.setAttribute('list', id); c.placeholder = 'Pick a reserved ' + A.kind.short.toLowerCase() + ' container';
      });
    }
  }
  document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.id) return;
    if (t.id === 'depopsManualOutwardType') setTimeout(syncManual, 0);              // after Repat's own handler
    if (t.id === 'depopsManualContainer') {
      const st = $('depopsManualOutwardType'), ls = $('depopsManualLine'), A = st && forType(st.value);
      if (A && ls) { const v = A.check(t.value), al = v.hit && A.agentOf({ agent: v.hit.agent }); if (al) ls.value = al.id; }
    }
  });

  /* guards on every outward entry point. Nothing is blocked unless reserve.<kind>.enforce = true. */
  function hookRules() {
    const us = window.dispatchUseStorageContainer;
    if (typeof us === 'function' && !us._rs) {
      const w = function (c) {
        const st = $('d_outwardtype'), A = st && forType(st.value);
        if (A && A.enforced()) { const v = A.check(c); if (!v.ok) { try { closeModal(); } catch (e) {} tellBlocked(String(c).toUpperCase() + ' ' + v.why + '. Use "Pick from reserved list" for ' + A.kind.short + '.'); return; } }
        return us.apply(this, arguments);
      };
      w._rs = true; window.dispatchUseStorageContainer = w;
    }
    const fb = window.depOpsCreateOutwardFromBooking;
    if (typeof fb === 'function' && !fb._rs) {
      const w = async function (id) {
        const st = $('depopsOutwardType-' + id), A = st && forType(st.value);
        if (A && A.enforced()) {
          let c = '';
          try { const { data } = await supabase.from('public_bookings').select('container').eq('id', id).single(); c = ((data && data.container) || '').trim(); } catch (e) {}
          const msg = c ? await A.guard(c) : 'This booking has no container number on file, so it cannot be checked against the ' + A.kind.nav + ' list.';
          if (msg) return tellBlocked(msg);
        }
        return fb.apply(this, arguments);
      };
      w._rs = true; window.depOpsCreateOutwardFromBooking = w;
    }
    const fm = window.depOpsCreateManualOutward;
    if (typeof fm === 'function' && !fm._rs) {
      const w = async function () {
        const st = $('depopsManualOutwardType'), A = st && forType(st.value);
        if (A && A.enforced()) {
          const c = String((($('depopsManualContainer') || {}).value) || '').trim().toUpperCase();
          const msg = await A.guard(c); if (msg) return tellBlocked(msg);
          const ls = $('depopsManualLine'), v = A.check(c), al = v.hit && A.agentOf({ agent: v.hit.agent }); if (ls && al && !ls.value) ls.value = al.id;
        }
        return fm.apply(this, arguments);
      };
      w._rs = true; window.depOpsCreateManualOutward = w;
    }
    /* the Dispatch Console form: re-run the lock when Status changes */
    const tg = window.toggleDispatchOutwardType;
    if (typeof tg === 'function' && !tg._rs) {
      const w = function () { const r = tg.apply(this, arguments); try { syncDispatchForm(); } catch (e) { console.warn('Reserve form sync failed', e); } return r; };
      w._rs = true; window.toggleDispatchOutwardType = w;
    }
  }

  /* single dispatch: block (when the rule is on) a container that is not reserved, and tell the dispatcher about a reserved one */
  function hookDispatch() {
    const f = window.createDispatch; if (typeof f !== 'function' || f._rs) return;
    const w = async function () {
      const st = $('d_outwardtype'), wt = $('d_worktype'), A = st && forType(st.value);
      if (A && A.enforced() && wt && wt.value === 'Depot → Port') {
        const msg = await A.guard(($('d_container') || {}).value);
        if (msg) { tellBlocked(msg); return; }
      }
      try {
        const c = ($('d_container') || {}).value;
        if (c) {
          for (const a of APIS) {
            await a.ensureLoaded();
            const hit = a.lookup(c), v = hit && a.check(c);
            if (!hit || !v.ok) continue;
            const al = a.agentOf({ agent: hit.agent }), sel = ($('d_line') || {}).value;
            if (al && sel && sel !== al.id && !confirm(String(c).toUpperCase() + ' is held on ' + a.what + ' ' + hit.no + ' for ' + hit.agent + ', but this dispatch is for a different shipping line.\n\nContinue anyway?')) return;
            if (st && st.value && st.value !== a.type) { if (!confirm(String(c).toUpperCase() + ' is held on ' + a.what + ' ' + hit.no + ', but this dispatch is marked ' + st.value + '.\n\nContinue anyway?')) return; }
            try { toast(String(c).toUpperCase() + ' is on ' + a.what + ' ' + hit.no + '. It is marked cleared when it gates out.', 'info', 4500); } catch (x) {}
            break;
          }
        }
      } catch (e) { /* never block a dispatch because the check failed */ }
      return f.apply(this, arguments);
    };
    w._rs = true; window.createDispatch = w;
  }

  /* dashboard alert: reserves past their end that still hold containers */
  function hookAlerts() {
    const f = window.buildAlerts; if (typeof f !== 'function' || f._rs) return;
    const w = function () {
      const r = f.apply(this, arguments);
      try {
        const list = $('alertsList');
        if (list) {
          Array.prototype.forEach.call(list.querySelectorAll('[data-rs]'), n => n.remove());
          let any = false;
          APIS.forEach(a => {
            if (!a.loaded()) { if (uidNow() && !a._busy) { a._busy = true; a.ensureLoaded().then(() => { a._busy = false; if (a.isOverdueCount()) { try { window.buildAlerts(); } catch (e) {} } }).catch(() => { a._busy = false; }); } return; }
            const late = a.isOverdueCount(); if (!late) return;
            any = true;
            list.insertAdjacentHTML('beforeend', '<div class="alert-item warn" data-rs="1"><div class="alert-dot-sm" style="background:var(--amber)"></div><span>' + late + ' ' + esc(a.kind.plural.replace(/s$/, late === 1 ? '' : 's')) + (late === 1 ? ' is' : ' are') + ' past the end date with containers still held</span></div>');
          });
          if (any) { const dot = $('alertDot'); if (dot) dot.style.display = 'block'; }
        }
      } catch (e) { console.warn('reserve alerts', e); }
      return r;
    };
    w._rs = true; window.buildAlerts = w;
  }

  /* yard pickers elsewhere (dispatch "containers in storage", loading instructions) show which containers are reserved */
  function decorate(root) {
    if (!root || !root.querySelectorAll || !APIS.some(a => a.loaded())) return;
    root.querySelectorAll('.activity-row,.li-yard-row').forEach(row => {
      if (row.getAttribute('data-rs')) return;
      const m = /[A-Z]{4}\s?\d{7}/.exec(((row.querySelector('.mono,.li-mono') || row).textContent || '').toUpperCase());
      row.setAttribute('data-rs', '1');
      if (!m) return;
      for (const a of APIS) {
        const hit = a.lookup(m[0]); if (!hit) continue;
        const chip = document.createElement('span'); chip.className = 'rr-b rr-amb'; chip.style.marginLeft = '8px';
        chip.title = 'Held on ' + a.what + ' ' + hit.no; chip.textContent = a.kind.chip + ' RESERVED ' + hit.no + (hit.agent ? ' · ' + String(hit.agent).toUpperCase() : '');
        (row.querySelector('.mono,.li-mono') || row).appendChild(chip); break;
      }
    });
  }
  let decT;
  function watchPickers() {
    const body = $('modalBody'); if (!body || body._rsw) return; body._rsw = true;
    new MutationObserver(() => { clearTimeout(decT); decT = setTimeout(async () => { if (!body.querySelector('#dps_list,#li_plist')) return; await Promise.all(APIS.map(a => a.ensureLoaded())); decorate(body); }, 250); }).observe(body, { childList: true, subtree: true });
  }

  window.addEventListener('load', () => setTimeout(() => { hookDispatch(); hookAlerts(); hookRules(); watchPickers(); }, 0));
})();