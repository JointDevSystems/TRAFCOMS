'use strict';

(function () {
  const TABLE = 'loading_instructions', QKEY = 'gargo-li-queue', PAGE = 40;
  const $ = id => document.getElementById(id);
  const sb = () => (typeof supabase !== 'undefined' && supabase) || window.ghSupabase;
  const LI = window.GargoLI = {};
  const S = { rows: [], total: 0, q: '', status: 'all', limit: PAGE, busy: false, editId: null, gate: [], gateBusy: false };

  const TYPES = ['DV', 'HD', 'OT', 'LC', 'HC', 'FR', 'TANK'];
  const BOXES = [['1x20', '1 x 20ft'], ['2x20', '2 x 20ft'], ['1x40', '1 x 40ft']];

  const canWrite = () => { try { return isAdmin() || canSeeSection('dispatch'); } catch (e) { return false; } };
  const canView = () => { try { return canWrite() || canSeeSection('gatesecurity'); } catch (e) { return false; } };
  const canDelete = () => { try { return isAdmin(); } catch (e) { return false; } };

  /* ── helpers ── */
  const val = id => ($(id) ? $(id).value : '').trim();
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + ' / ' + m[2] + ' / ' + m[1] : ''; };
  const dshort = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const isNetErr = e => !navigator.onLine || (e && !e.code && /fetch|network|failed to|load failed|timeout/i.test(String(e.message || e)));
  const boxLabel = k => (BOXES.find(b => b[0] === k) || [k, k || ''])[1];
  const isoNo = s => /^[A-Z]{4}\d{7}$/.test(String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
  const cleanNo = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const asList = v => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : []); } catch (e) { return []; } };
  const conts = r => asList(r.containers).filter(c => c && c.no);

  /* Size/type words used by the app ("40ft HC", "20ft Dry", "Flat Rack"...) -> the codes printed on the paper form */
  function formType(ctype) {
    const s = String(ctype || '');
    const size = /40/.test(s) ? '40' : (/20/.test(s) ? '20' : '');
    let type = '';
    if (/tank/i.test(s)) type = 'TANK';
    else if (/flat/i.test(s)) type = 'FR';
    else if (/open/i.test(s)) type = 'OT';
    else if (/heavy/i.test(s)) type = 'HD';
    else if (/\bhc\b|high/i.test(s)) type = 'HC';
    else if (/lcl|\blc\b/i.test(s)) type = 'LC';
    else if (/dry|\bdv\b/i.test(s)) type = 'DV';
    return { size, type };
  }

  function css() {
    if ($('liCss')) return;
    const s = document.createElement('style'); s.id = 'liCss';
    s.textContent =
      '.li-wrap{display:grid;gap:14px;grid-template-columns:minmax(0,1fr)}' +
      '@media(min-width:1180px){.li-wrap{grid-template-columns:minmax(0,430px) minmax(0,1fr)}}' +
      '.li-part{font:600 11px var(--font-mono,monospace);letter-spacing:.6px;color:var(--gold);margin:14px 0 8px;padding-top:12px;border-top:1px solid var(--border)}' +
      '.li-part:first-child{margin-top:0;padding-top:0;border-top:0}' +
      '.li-ticks{display:flex;flex-wrap:wrap;gap:8px}' +
      '.li-tick{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12.5px;color:var(--text-2);background:var(--surface-2);user-select:none}' +
      '.li-tick input{width:auto;min-height:0;margin:0}' +
      '.li-tick:has(input:checked){border-color:var(--gold);background:var(--gold-dim);color:var(--text)}' +
      '.li-slot{display:flex;gap:6px;align-items:flex-end}.li-slot .fg{flex:1;min-width:0;margin:0}' +
      '.li-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}' +
      '.li-bar input,.li-bar select{background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:8px 11px;font-size:12.5px;min-width:0}' +
      '.li-bar input.li-q{flex:1 1 200px;max-width:320px}' +
      '.li-chip{display:inline-block;padding:2px 9px;border-radius:999px;font:600 10px var(--font-mono,monospace);letter-spacing:.6px;border:1px solid var(--border)}' +
      '.li-chip.issued{color:var(--amber);background:var(--amber-dim);border-color:var(--amber)}' +
      '.li-chip.loaded{color:var(--green);background:var(--green-dim);border-color:var(--green)}' +
      '.li-chip.cancelled{color:var(--text-3)}' +
      '.li-mono{font-family:var(--font-mono,monospace);font-weight:600;color:var(--text)}.li-dim{color:var(--text-3)}' +
      '.li-serial{font:700 13px var(--font-mono,monospace);color:var(--red)}' +
      '.li-queue{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:0 0 12px;padding:10px 14px;border:1px solid var(--amber);border-radius:10px;background:var(--amber-dim);color:var(--amber);font-size:12.5px}' +
      '.li-acts{display:flex;gap:5px;flex-wrap:wrap}' +
      '.li-hint{font-size:11px;color:var(--text-3);line-height:1.5;margin-top:4px}' +
      '.li-more{display:flex;justify-content:center;padding:12px 0}' +
      '.li-yard-row{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid var(--border);cursor:pointer}' +
      '.li-yard-row:hover{background:var(--hover)}.li-yard-row.used{opacity:.55}';
    document.head.appendChild(s);
  }

  /* ── on-device queue (new entries made without a connection) ── */
  const qRead = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } };
  const qWrite = a => { try { localStorage.setItem(QKEY, JSON.stringify(a)); } catch (e) {} };
  let flushing = false;
  async function flush() {
    if (flushing || !navigator.onLine || !sb()) return 0;
    const q = qRead(); if (!q.length) return 0;
    flushing = true; let sent = 0;
    try {
      const keep = [];
      for (const rec of q) {
        const { error } = await sb().from(TABLE).insert(rec);
        const dupSerial = error && error.code === '23505' && /serial/i.test(String(error.message || error.details || ''));
        if (dupSerial) { try { toast('Serial ' + rec.serial_no + ' is already used, so that offline entry was not sent. Check it with the paper pad.', 'error', 8000); } catch (e) {} keep.push(rec); }
        else if (!error || error.code === '23505') sent++; else keep.push(rec);
      }
      qWrite(keep);
    } finally { flushing = false; }
    if (sent) { try { toast(sent + ' loading ' + (sent === 1 ? 'instruction' : 'instructions') + ' sent', 'success'); } catch (e) {} }
    return sent;
  }
  window.addEventListener('online', () => { flush().then(n => { if (n) { LI.reload(); LI.renderGate(); } }); });

  /* ── data ── */
  function applySearch(q) {
    if (S.status !== 'all') q = q.eq('status', S.status);
    const t = S.q.replace(/[,()%*\\]/g, ' ').trim();
    if (t) {
      const p = '%' + t + '%';
      q = q.or(['serial_no', 'shipper', 'truck_no', 'release_order_no', 'commodity', 'container_text', 'clerk_name'].map(c => c + '.ilike.' + p).join(','));
    }
    return q;
  }
  async function load() {
    if (!sb() || !canView()) return;
    S.busy = true;
    try {
      const { data, error, count } = await applySearch(sb().from(TABLE).select('*', { count: 'exact' }))
        .order('issue_date', { ascending: false }).order('created_at', { ascending: false }).range(0, S.limit - 1);
      if (error) throw error;
      S.rows = data || []; S.total = count || S.rows.length;
    } catch (e) {
      console.warn('Loading instructions load failed:', e && e.message);
      if (navigator.onLine) toast('Could not load loading instructions: ' + ((e && e.message) || 'error') + '. Has sql/loading_instructions.sql been run?', 'error', 6000);
    } finally { S.busy = false; }
  }
  async function nextSerial() {
    try {
      const { data } = await sb().from(TABLE).select('serial_no').order('created_at', { ascending: false }).limit(40);
      let max = 0, width = 0;
      (data || []).forEach(r => { if (/^\d+$/.test(r.serial_no)) { const n = Number(r.serial_no); if (n > max) { max = n; width = r.serial_no.length; } } });
      qRead().forEach(r => { if (/^\d+$/.test(r.serial_no)) { const n = Number(r.serial_no); if (n > max) { max = n; width = r.serial_no.length; } } });
      return max ? String(max + 1).padStart(width, '0') : '';
    } catch (e) { return ''; }
  }

  /* ── dispatch tab: inject the button + panel, and make the existing tab switcher aware of it ── */
  function mountTab() {
    const sec = $('sec-dispatch'); if (!sec || $('dispatchTabLI')) return;
    const row = sec.querySelector('.sec-toolbar .filter-row');
    if (row) {
      const b = document.createElement('button'); b.className = 'filter-btn'; b.id = 'liTabBtn'; b.type = 'button';
      b.textContent = 'Loading Instructions'; b.setAttribute('onclick', "switchDispatchTab('li',this)");
      row.appendChild(b);
    }
    const panel = document.createElement('div'); panel.id = 'dispatchTabLI'; panel.style.display = 'none';
    const bulk = $('dispatchTabBulk');
    if (bulk && bulk.parentNode) bulk.parentNode.insertBefore(panel, bulk.nextSibling); else sec.appendChild(panel);
    const orig = window.switchDispatchTab;
    window.switchDispatchTab = function (tab, btn) {
      if (tab === 'li') {
        ['dispatchTabSingle', 'dispatchTabBulk'].forEach(id => { const e = $(id); if (e) e.style.display = 'none'; });
        sec.querySelectorAll('.sec-toolbar .filter-row .filter-btn').forEach(x => x.classList.remove('active'));
        if (btn) btn.classList.add('active');
        panel.style.display = 'block';
        LI.open();
        return;
      }
      panel.style.display = 'none';
      return orig ? orig.apply(this, arguments) : undefined;
    };
  }

  /* ── the form + register ── */
  LI.open = async function () {
    css();
    const host = $('dispatchTabLI'); if (!host) return;
    if (!canView()) { host.innerHTML = '<div class="empty-state"><div class="empty-state-label">You do not have access to Loading Instructions</div></div>'; return; }
    if (!host.dataset.built) {
      host.dataset.built = '1';
      host.innerHTML = '<div class="ops-notice" style="margin-bottom:14px">Digital copy of the paper <b>Loading Instructions</b> form. Fill Part 1 when the release is authorised, pick the containers from the yard (or type them), then print the form for signatures. Part 2 is completed by the releasing clerk when the containers are loaded.</div>' +
        '<div class="li-wrap"><div class="form-card" id="liFormCard"></div><div><div id="liListHead"></div><div id="liList"></div></div></div>';
      LI.resetForm();
    }
    await flush();
    await load();
    LI.paint();
  };

  function formHtml(r) {
    r = r || {};
    const cs = conts(r), types = asList(r.container_types);
    const box = r.box_count || '';
    const f = (id, label, v, extra) => '<div class="fg"><label>' + label + '</label><input id="li_' + id + '" value="' + esc(v) + '" ' + (extra || '') + '/></div>';
    const ticks = TYPES.map(t => '<label class="li-tick"><input type="checkbox" class="li-type" value="' + t + '"' + (types.indexOf(t) > -1 ? ' checked' : '') + '/>' + t + '</label>').join('');
    const boxes = BOXES.map(b => '<label class="li-tick"><input type="radio" name="li_box" value="' + b[0] + '"' + (box === b[0] ? ' checked' : '') + ' onchange="GargoLI.boxChanged()"/>' + b[1] + '</label>').join('');
    const slot = n => '<div class="li-slot" id="li_slotwrap' + n + '"><div class="fg"><label>Container number ' + n + '</label><input id="li_c' + n + '" value="' + esc((cs[n - 1] || {}).no || '') + '" data-ic="' + esc((cs[n - 1] || {}).ic_id || '') + '" data-ct="' + esc((cs[n - 1] || {}).ctype || '') + '" autocapitalize="characters" autocomplete="off" placeholder="e.g. MSKU1234567"/></div>' +
      '<button type="button" class="action-btn ghost" onclick="GargoLI.pick(' + n + ')">Pick from yard</button></div>';
    return '<div class="form-card-head">' + (r.id ? 'Edit loading instruction' : 'New loading instruction') + '</div><div class="form-card-body">' +
      '<div class="li-part">PART 1 · DOCUMENTATION CLERK</div>' +
      '<div class="form-row-2">' + f('serial', 'Serial number *', r.serial_no, 'inputmode="numeric" autocomplete="off"') +
      '<div class="fg"><label>Date *</label><input id="li_date" type="date" value="' + esc(r.issue_date || today()) + '"/></div></div>' +
      '<div class="form-row-2">' + f('shipper', "Shipper's name *", r.shipper, 'autocomplete="off" list="liShippers"') +
      f('truck', 'Truck number *', r.truck_no, 'autocapitalize="characters" autocomplete="off" list="liTrucks"') + '</div>' +
      '<datalist id="liShippers">' + shipperOptions() + '</datalist><datalist id="liTrucks">' + truckOptions() + '</datalist>' +
      '<div class="form-row-2">' + f('ro', 'Release order no.', r.release_order_no, 'autocomplete="off"') + f('commodity', 'Commodity', r.commodity, 'autocomplete="off"') + '</div>' +
      '<div class="fg"><label>Number of containers to be loaded * <span class="label-optional">(tick one)</span></label><div class="li-ticks">' + boxes + '</div></div>' +
      '<div class="fg"><label>Container type <span class="label-optional">(tick relevant boxes)</span></label><div class="li-ticks">' + ticks + '</div></div>' +
      '<div class="fg"><label>Name of clerk *</label><input id="li_clerk" value="' + esc(r.clerk_name || (state.profile && state.profile.name) || '') + '" autocomplete="off"/></div>' +
      '<div class="li-part">PART 2 · RELEASING CLERK</div>' +
      slot(1) + '<div style="height:8px"></div>' + slot(2) +
      '<div class="li-hint">Pick from the containers in the yard right now, or type a number for a container that is not on the system. Picking fills the size and type for you.</div>' +
      '<div class="form-row-2" style="margin-top:10px">' + f('relclerk', 'Releasing clerk', r.release_clerk, 'autocomplete="off"') + f('manager', 'Depot manager in charge', r.manager_name, 'autocomplete="off"') + '</div>' +
      '<div class="fg"><label>Status</label><select id="li_status"><option value="issued"' + (r.status !== 'loaded' && r.status !== 'cancelled' ? ' selected' : '') + '>Issued, awaiting loading</option><option value="loaded"' + (r.status === 'loaded' ? ' selected' : '') + '>Loaded and released</option><option value="cancelled"' + (r.status === 'cancelled' ? ' selected' : '') + '>Cancelled</option></select></div>' +
      '<div id="li_err" style="color:var(--red);font-size:12px;min-height:16px;margin-bottom:8px"></div>' +
      '<div class="li-acts"><button type="button" class="submit-btn" id="li_go" style="flex:1;min-width:150px" onclick="GargoLI.save(false)">' + (r.id ? 'Save changes' : 'Save') + '</button>' +
      '<button type="button" class="action-btn" onclick="GargoLI.save(true)">Save &amp; print</button>' +
      '<button type="button" class="action-btn ghost" onclick="GargoLI.blank()">Print blank form</button>' +
      (r.id ? '<button type="button" class="action-btn ghost" onclick="GargoLI.resetForm()">Cancel edit</button>' : '<button type="button" class="action-btn ghost" onclick="GargoLI.resetForm()">Clear</button>') + '</div></div>';
  }
  function shipperOptions() {
    const set = new Set();
    try { (state.db.shippingLines || []).forEach(l => { if (l.name) set.add(l.name); }); } catch (e) {}
    S.rows.forEach(r => { if (r.shipper) set.add(r.shipper); });
    return Array.from(set).map(n => '<option value="' + esc(n) + '"></option>').join('');
  }
  function truckOptions() {
    try { return (state.db.trucks || []).map(t => '<option value="' + esc(t.reg) + '">' + esc(t.make || '') + '</option>').join(''); } catch (e) { return ''; }
  }

  LI.resetForm = async function (rec) {
    const card = $('liFormCard'); if (!card) return;
    S.editId = rec ? rec.id : null;
    card.innerHTML = formHtml(rec);
    LI.boxChanged();
    if (!rec) { const n = await nextSerial(); const el = $('li_serial'); if (el && !el.value) el.value = n; }
  };
  LI.boxChanged = function () {
    const box = (document.querySelector('input[name="li_box"]:checked') || {}).value || '';
    const w = $('li_slotwrap2'); if (w) w.style.display = box === '2x20' ? '' : 'none';
    if (box !== '2x20' && $('li_c2')) { $('li_c2').value = ''; $('li_c2').dataset.ic = ''; $('li_c2').dataset.ct = ''; }
  };

  /* ── pick from the yard ── */
  let pickT = null;
  LI.pick = function (slot) {
    css();
    openModal('Containers in the yard', '<div class="fg"><input id="li_pq" placeholder="Search container, vessel, condition or EIR…" oninput="GargoLI.pickSearch()" autocomplete="off"/></div>' +
      '<div class="li-hint" style="margin:0 0 8px">Container ' + slot + '. Containers already on an open instruction are greyed out.</div><div id="li_plist" data-slot="' + slot + '"></div>');
    LI.pickSearch(true);
    setTimeout(() => { const q = $('li_pq'); if (q) q.focus(); }, 60);
  };
  LI.pickSearch = function (now) { clearTimeout(pickT); pickT = setTimeout(pickRun, now === true ? 0 : 250); };
  async function pickRun() {
    const list = $('li_plist'); if (!list) return;
    const q = val('li_pq');
    list.innerHTML = '<div class="empty-state-label" style="padding:12px 0">Loading…</div>';
    let items = [];
    try {
      if (window.ICR && ICR.enabled && navigator.onLine) items = (await ICR.yard({ q, limit: 50 })).items;
      else {
        const ql = q.toLowerCase();
        items = (state.db.interchange || []).filter(i => typeof icInYard === 'function' && icInYard(i) && (!ql || [i.container, i.vessel, i.eirNumber, i.condition].join(' ').toLowerCase().indexOf(ql) > -1))
          .sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 50);
      }
    } catch (e) { if ($('li_plist')) $('li_plist').innerHTML = '<div class="empty-state-label" style="padding:12px 0">Could not load the yard list. Check your connection, or close this and type the number.</div>'; return; }
    if (!$('li_plist')) return;
    if (!items.length) { $('li_plist').innerHTML = '<div class="empty-state-label" style="padding:12px 0">No containers in the yard match. Close this and type the number instead.</div>'; return; }
    const open = new Map();
    S.rows.forEach(r => { if (r.status === 'issued') conts(r).forEach(c => { if (r.id !== S.editId) open.set(cleanNo(c.no), r.serial_no); }); });
    const age = d => { const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return isNaN(n) ? '' : n + ' d in yard'; };
    const code = id => { const l = (state.db.shippingLines || []).find(x => x.id === id); return l ? (l.code || l.name) : ''; };
    $('li_plist').innerHTML = items.map(i => {
      const used = open.get(cleanNo(i.container));
      return '<div class="li-yard-row' + (used ? ' used' : '') + '" onclick="GargoLI.use(\'' + esc(i.container) + '\',\'' + esc(i.ctype || '') + '\',\'' + esc(i.id || '') + '\')">' +
        '<div style="flex:1;min-width:0"><div class="li-mono" style="color:var(--gold)">' + esc(i.container) + '</div>' +
        '<div style="font-size:10.5px;color:var(--text-3)">' + esc(i.ctype || '') + (code(i.line) ? ' · ' + esc(code(i.line)) : '') + (i.condition ? ' · ' + esc(i.condition) : '') + (i.eirNumber ? ' · EIR ' + esc(i.eirNumber) : ' · awaiting survey') + ' · ' + esc(age(i.date)) + (used ? ' · on instruction ' + esc(used) : '') + '</div></div>' +
        '<span style="font-size:11px;color:var(--text-2)">Use</span></div>';
    }).join('');
  }
  LI.use = function (no, ctype, icId) {
    const slot = Number(($('li_plist') || {}).dataset ? $('li_plist').dataset.slot : 1) || 1;
    const el = $('li_c' + slot); closeModal();
    if (!el) return;
    el.value = no; el.dataset.ic = icId || ''; el.dataset.ct = ctype || '';
    const ft = formType(ctype);
    const cur = (document.querySelector('input[name="li_box"]:checked') || {}).value || '';
    if (!cur || (slot === 1 && cur !== '2x20')) {                                   // set the count from the first container's size
      const want = ft.size === '40' ? '1x40' : (ft.size === '20' ? '1x20' : '');
      const r = want && document.querySelector('input[name="li_box"][value="' + want + '"]'); if (r) { r.checked = true; LI.boxChanged(); }
    }
    if (ft.type) { const c = document.querySelector('.li-type[value="' + ft.type + '"]'); if (c) c.checked = true; }
    if (slot === 1 && $('li_c2') && $('li_slotwrap2').style.display !== 'none') $('li_c2').focus();
  };

  /* ── save ── */
  function readForm() {
    const box = (document.querySelector('input[name="li_box"]:checked') || {}).value || '';
    const types = Array.prototype.map.call(document.querySelectorAll('.li-type:checked'), c => c.value);
    const list = [];
    [1, 2].forEach(n => {
      const el = $('li_c' + n); if (!el || !el.value.trim()) return;
      if (n === 2 && box !== '2x20') return;
      list.push({ no: cleanNo(el.value), ctype: el.dataset.ct || '', ic_id: el.dataset.ic || '', src: el.dataset.ic ? 'yard' : 'manual' });
    });
    const status = val('li_status') || 'issued';
    return {
      serial_no: val('li_serial'), issue_date: val('li_date'), shipper: val('li_shipper'), truck_no: val('li_truck').toUpperCase(),
      release_order_no: val('li_ro') || null, box_count: box, container_types: types, commodity: val('li_commodity') || null,
      clerk_name: val('li_clerk'), containers: list, container_text: list.map(c => c.no).join(' ') || null,
      release_clerk: val('li_relclerk') || null, manager_name: val('li_manager') || null, status,
      loaded_at: status === 'loaded' ? new Date().toISOString() : null,
    };
  }
  LI.save = async function (thenPrint) {
    if (!canWrite()) return toast('You do not have access to create loading instructions', 'error');
    const err = $('li_err'), go = $('li_go');
    const rec = readForm(), miss = [];
    if (!rec.serial_no) miss.push('serial number'); if (!rec.issue_date) miss.push('date'); if (!rec.shipper) miss.push("shipper's name");
    if (!rec.truck_no) miss.push('truck number'); if (!rec.box_count) miss.push('number of containers'); if (!rec.clerk_name) miss.push('name of clerk');
    if (rec.status === 'loaded') {
      const need = rec.box_count === '2x20' ? 2 : 1;
      if (rec.containers.length < need) miss.push('container number' + (need > 1 ? 's' : '') + ' (needed to mark as loaded)');
      if (!rec.release_clerk) miss.push('releasing clerk (needed to mark as loaded)');
    }
    if (miss.length) { err.textContent = 'Please fill in: ' + miss.join(', ') + '.'; return; }
    const odd = rec.containers.filter(c => !isoNo(c.no));
    if (odd.length && !confirm(odd.map(c => c.no).join(', ') + (odd.length > 1 ? ' do' : ' does') + ' not look like a standard container number (4 letters and 7 digits). Save anyway?')) return;
    err.textContent = ''; go.disabled = true;
    let saved = null;
    try {
      if (S.editId) {
        const prev = S.rows.find(x => x.id === S.editId);
        if (prev && prev.status === 'loaded' && rec.status === 'loaded') rec.loaded_at = prev.loaded_at || rec.loaded_at;
        rec.updated_at = new Date().toISOString();
        const { error } = await sb().from(TABLE).update(rec).eq('id', S.editId);
        if (error) throw error;
        saved = Object.assign({}, prev || {}, rec, { id: S.editId });
        toast('Loading instruction ' + rec.serial_no + ' updated', 'success');
        try { addAudit(state.profile.username, 'Loading Instruction Edited', rec.serial_no + ' · ' + rec.truck_no); } catch (e) {}
      } else {
        rec.id = uid(); rec.created_by = state.currentUser && state.currentUser.id;       // fixed id: a retry never creates a duplicate
        try {
          const { error } = await sb().from(TABLE).insert(rec);
          if (error && error.code !== '23505') throw error;
          if (error && error.code === '23505' && /serial/i.test(String(error.message || error.details || ''))) throw error;
          toast('Loading instruction ' + rec.serial_no + ' saved', 'success');
          try { addAudit(state.profile.username, 'Loading Instruction Issued', rec.serial_no + ' · ' + rec.truck_no + ' · ' + rec.containers.map(c => c.no).join(' ')); } catch (e) {}
        } catch (e) {
          if (!isNetErr(e)) throw e;
          const q = qRead(); q.push(rec); qWrite(q);
          toast('No connection. Saved on this device and will be sent automatically.', 'warning', 5000);
        }
        saved = rec;
      }
      await LI.reload();
      LI.resetForm();
      if (thenPrint && saved) LI.doc(saved, 'print');
    } catch (e) {
      console.warn('Loading instruction failed:', e);
      const m = String((e && e.message) || '');
      err.textContent = /duplicate|unique|23505/i.test(m + (e && e.code)) ? 'Serial number ' + rec.serial_no + ' is already used. Check the number on the paper pad.' :
        /row-level security|permission/i.test(m) ? 'You are not allowed to save loading instructions. Ask an administrator to tick Dispatch for your account.' :
        /relation .* does not exist|schema cache/i.test(m) ? 'The loading_instructions table is missing. Run sql/loading_instructions.sql in Supabase.' : ('Could not save: ' + (m || 'error'));
    } finally { if ($('li_go')) $('li_go').disabled = false; }
  };

  LI.edit = function (id) {
    if (!canWrite()) return toast('You do not have access to edit loading instructions', 'error');
    const r = S.rows.find(x => x.id === id); if (!r) return;
    LI.resetForm(r);
    const c = $('liFormCard'); if (c && c.scrollIntoView) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  LI.remove = async function (id) {
    if (!canDelete()) return toast('Only an administrator can delete a loading instruction', 'error');
    const r = S.rows.find(x => x.id === id); if (!r) return;
    if (!confirm('Delete loading instruction ' + r.serial_no + ' (' + r.truck_no + ')? This cannot be undone. Use Cancelled status to keep a record.')) return;
    const { error } = await sb().from(TABLE).delete().eq('id', id);
    if (error) return toast('Could not delete: ' + error.message, 'error');
    try { addAudit(state.profile.username, 'Loading Instruction Deleted', r.serial_no + ' · ' + r.truck_no); } catch (e) {}
    toast('Deleted', 'success'); LI.reload();
  };
  LI.markLoaded = async function (id) {
    if (!canWrite()) return;
    const r = S.rows.find(x => x.id === id); if (!r) return;
    const need = r.box_count === '2x20' ? 2 : 1;
    if (conts(r).length < need) { toast('Add the container number' + (need > 1 ? 's' : '') + ' first (Edit)', 'warning'); return LI.edit(id); }
    const who = (state.profile && state.profile.name) || '';
    const { error } = await sb().from(TABLE).update({ status: 'loaded', loaded_at: new Date().toISOString(), release_clerk: r.release_clerk || who, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast('Could not update: ' + error.message, 'error');
    try { addAudit(state.profile.username, 'Loading Instruction Loaded', r.serial_no + ' · ' + r.truck_no); } catch (e) {}
    toast('Marked as loaded', 'success'); LI.reload();
  };

  /* ── register ── */
  LI.reload = async function () { await load(); LI.paint(); };
  LI.more = function () { S.limit += PAGE; LI.reload(); };
  LI.sync = async function () { const n = await flush(); if (!n && qRead().length) toast('Still offline. Entries are safe on this device.', 'warning'); LI.reload(); };
  let st = 0;
  LI.search = function () { clearTimeout(st); st = setTimeout(() => { S.q = val('li_q'); S.status = val('li_sf') || 'all'; S.limit = PAGE; LI.reload(); }, 300); };

  const chip = s => '<span class="li-chip ' + esc(s) + '">' + (s === 'issued' ? 'Awaiting loading' : s === 'loaded' ? 'Loaded' : 'Cancelled') + '</span>';
  const contCell = r => conts(r).map(c => '<span class="li-mono">' + esc(c.no) + '</span>').join('<br>') || '<span class="li-dim">not yet entered</span>';
  const typeCell = r => { const t = asList(r.container_types); return t.length ? esc(t.join(', ')) : '<span class="li-dim">—</span>'; };

  LI.paint = function () {
    const head = $('liListHead'), host = $('liList'); if (!host) return;
    const waiting = qRead().length;
    head.innerHTML = (waiting ? '<div class="li-queue"><span>' + waiting + ' ' + (waiting === 1 ? 'instruction is' : 'instructions are') + ' saved on this device and will be sent when the connection returns.</span><button type="button" class="tbl-btn" onclick="GargoLI.sync()">Send now</button></div>' : '') +
      '<div class="li-bar"><input class="li-q" id="li_q" type="search" placeholder="Search serial, truck, shipper, container, release order" value="' + esc(S.q) + '" oninput="GargoLI.search()" autocomplete="off"/>' +
      '<select id="li_sf" onchange="GargoLI.search()"><option value="all"' + (S.status === 'all' ? ' selected' : '') + '>All</option><option value="issued"' + (S.status === 'issued' ? ' selected' : '') + '>Awaiting loading</option><option value="loaded"' + (S.status === 'loaded' ? ' selected' : '') + '>Loaded</option><option value="cancelled"' + (S.status === 'cancelled' ? ' selected' : '') + '>Cancelled</option></select></div>';
    const keep = document.activeElement && document.activeElement.id === 'li_q';
    if (keep) { const q = $('li_q'); q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (e) {} }
    if (!S.rows.length) { host.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚛</div><div class="empty-state-label">No loading instructions yet</div></div>'; return; }
    const w = canWrite();
    host.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Serial</th><th>Date</th><th>Truck</th><th>Shipper</th><th>Containers</th><th>Type</th><th>Release order</th><th>Status</th><th></th></tr></thead><tbody>' +
      S.rows.map(r => '<tr><td><span class="li-serial">' + esc(r.serial_no) + '</span></td><td>' + esc(dshort(r.issue_date)) + '</td><td class="li-mono">' + esc(r.truck_no) + '</td><td>' + esc(r.shipper) + '</td>' +
        '<td>' + contCell(r) + '<div class="li-dim" style="font-size:10.5px">' + esc(boxLabel(r.box_count)) + '</div></td><td>' + typeCell(r) + '</td><td>' + (esc(r.release_order_no) || '<span class="li-dim">—</span>') + '</td><td>' + chip(r.status) + '</td>' +
        '<td><div class="li-acts"><button type="button" class="tbl-btn" onclick="GargoLI.docById(\'' + esc(r.id) + '\',\'preview\')">Preview</button><button type="button" class="tbl-btn" onclick="GargoLI.docById(\'' + esc(r.id) + '\',\'print\')">Print</button>' +
        (w ? '<button type="button" class="tbl-btn" onclick="GargoLI.edit(\'' + esc(r.id) + '\')">Edit</button>' + (r.status === 'issued' ? '<button type="button" class="tbl-btn" onclick="GargoLI.markLoaded(\'' + esc(r.id) + '\')">Mark loaded</button>' : '') : '') +
        (canDelete() ? '<button type="button" class="tbl-btn" onclick="GargoLI.remove(\'' + esc(r.id) + '\')">Delete</button>' : '') + '</div></td></tr>').join('') +
      '</tbody></table></div>' + (S.rows.length < S.total ? '<div class="li-more"><button type="button" class="action-btn ghost" onclick="GargoLI.more()">Show more</button></div>' : '');
  };

  /* ── PDF: the paper form, A4 landscape ── */
  LI.buildPdf = function (rec, opts) {
    opts = opts || {};
    if (!window.jspdf) { try { toast('PDF library still loading, try again in a moment', 'error'); } catch (e) {} return null; }
    const r = rec || {}, cs = conts(r), types = asList(r.container_types);
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const M = 14, W = 269, R = M + W;
    const ink = () => { doc.setTextColor(20, 20, 20); doc.setDrawColor(60, 60, 60); };
    let y = typeof window.ghPdfLetterhead === 'function' ? window.ghPdfLetterhead(doc, M, 7, W) : 30;
    ink();

    /* title row: date | LOADING INSTRUCTIONS | serial */
    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('DATE:', M, y + 5.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(r.issue_date ? dmy(r.issue_date) : '........ / ........ / ............', M + 13, y + 5.5);
    const tw = 82, tx = M + W / 2 - tw / 2;
    doc.setLineWidth(0.5); doc.roundedRect(tx, y, tw, 9, 1.5, 1.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('LOADING INSTRUCTIONS', tx + tw / 2, y + 6.4, { align: 'center' });
    doc.setFontSize(10); doc.text('Serial Number:', R - 50, y + 5.5, { align: 'right' });
    doc.setTextColor(200, 30, 30); doc.setFontSize(14); doc.text(String(r.serial_no || ''), R - 48, y + 5.8);
    ink(); doc.setLineWidth(0.25);
    if (!r.serial_no) doc.line(R - 48, y + 6.8, R, y + 6.8);
    y += 15;

    const label = (t, x, yy) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(t, x, yy); return x + doc.getTextWidth(t) + 2; };
    /* a "label ........ value" row: the value sits on a thin line */
    const line = (t, v, x, yy, w) => {
      const vx = label(t, x, yy);
      doc.setLineWidth(0.2); doc.setDrawColor(120); doc.line(vx, yy + 1.2, x + w, yy + 1.2); ink();
      if (v) { doc.setFont('helvetica', 'normal'); let fs = 11; doc.setFontSize(fs); while (fs > 7 && doc.getTextWidth(String(v)) > x + w - vx - 2) { fs -= 0.5; doc.setFontSize(fs); } doc.text(String(v), vx + 1.5, yy - 0.3); }
    };
    const tick = (x, yy, on) => {                                  /* 5 mm box, with a tick when selected */
      doc.setLineWidth(0.35); doc.rect(x, yy, 5.5, 5.5);
      if (on) { doc.setLineWidth(0.9); doc.line(x + 1, yy + 3, x + 2.4, yy + 4.5); doc.line(x + 2.4, yy + 4.5, x + 4.7, yy + 0.9); }
      doc.setLineWidth(0.25);
    };

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('PART 1: To be completed by documentation clerk', M, y); y += 10;
    line("SHIPPER'S NAME:", r.shipper, M, y, W); y += 11;
    line('TRUCK NUMBER:', r.truck_no, M, y, 118); line('RELEASE ORDER NO.:', r.release_order_no, M + 128, y, W - 128); y += 12;

    /* number of containers + container type grid */
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); const nx = label('NUMBER OF CONTAINERS TO BE LOADED:', M, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('(Tick one box)', nx, y);
    BOXES.forEach((b, i) => { const bx = M + 118 + i * 52; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(b[1].replace(/ /g, ''), bx, y); tick(bx + 20, y - 4.3, r.box_count === b[0]); });
    y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('CONTAINER TYPE:', M, y + 3); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('(Tick Relevant Boxes)', M, y + 7.5);
    const gx = M + 52, gw = (W - 52) / TYPES.length, gh = 11;
    doc.setLineWidth(0.3); doc.rect(gx, y, gw * TYPES.length, gh);
    TYPES.forEach((t, i) => {
      const cx = gx + i * gw; if (i) doc.line(cx, y, cx, y + gh);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(t, cx + 4, y + 7);
      tick(cx + gw - 10, y + 2.7, types.indexOf(t) > -1);
    });
    doc.setLineWidth(0.25); y += gh + 11;

    line('COMMODITY:', r.commodity, M, y, W); y += 11;
    line('NAME OF CLERK:', r.clerk_name, M, y, 170); line('SIGN:', '', M + 180, y, W - 180); y += 13;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('PART 2: To be completed by Releasing Clerk', M, y); y += 10;
    doc.setFontSize(9.5); doc.text('CONTAINER NUMBER(S) LOADED', M, y); y += 9.5;
    line('1.', (cs[0] || {}).no, M + 6, y, 120); y += 10;
    line('2.', (cs[1] || {}).no, M + 6, y, 120); y += 11;
    line('NAME OF CLERK:', r.release_clerk, M, y, 170); line('SIGN:', '', M + 180, y, W - 180); y += 12;
    line('ALL ABOVE COUNTER CHECKED BY: DEPOT MANAGER IN CHARGE:', r.manager_name, M, y, 200); line('SIGN:', '', M + 210, y, W - 210);

    /* footer: who printed, when. Not part of the paper pad, kept small. */
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120);
    const when = new Date();
    doc.text((opts.blank ? 'Blank form' : 'Loading instruction ' + (r.serial_no || '')) + (opts.printedBy ? ' · printed by ' + opts.printedBy : '') + ' · ' + when.toLocaleDateString('en-KE') + ' ' + when.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }), M, 205);
    return { doc, filename: opts.blank ? 'Loading-Instructions-blank.pdf' : 'Loading-Instruction-' + String(r.serial_no || 'draft').replace(/[^\w-]+/g, '_') + '.pdf' };
  };

  /* mode: preview | print | download */
  LI.doc = async function (rec, mode, blank) {
    if (!rec && !blank) return;
    let by = '';
    if (mode !== 'preview' && typeof window.ghAskPrinter === 'function') {
      by = await ghAskPrinter({ title: 'Loading instruction: who is printing?', detail: blank ? 'Blank form' : 'Serial ' + rec.serial_no });
      if (by === null) return;
      try { addAudit((state.profile && state.profile.username) || 'system', 'Loading Instruction Printed', (blank ? 'blank form' : rec.serial_no + ' · ' + rec.truck_no) + ' · by ' + by); } catch (e) {}
    }
    const out = LI.buildPdf(blank ? {} : rec, { blank: !!blank, printedBy: by }); if (!out) return;
    if (mode === 'print') ghPrintPdf(out.doc);
    else if (mode === 'download') out.doc.save(out.filename);
    else if (window.GargoDocs && GargoDocs.view) GargoDocs.view(out, blank ? 'Loading Instructions (blank)' : 'Loading Instruction ' + rec.serial_no);
    else out.doc.save(out.filename);
  };
  LI.docById = function (id, mode) {
    const r = S.rows.find(x => x.id === id) || S.gate.find(x => x.id === id);
    if (r) LI.doc(r, mode); else toast('Record not found on this screen. Refresh and try again.', 'error');
  };
  LI.blank = function () { LI.doc(null, 'print', true); };

  /* ── Gate Security: read-only panel (view, preview, print) ── */
  LI.renderGate = async function () {
    const sec = $('sec-gatesecurity'); if (!sec) return;
    css();
    let host = $('gsLiPanel');
    if (!host) {
      host = document.createElement('div'); host.id = 'gsLiPanel'; host.className = 'panel'; host.style.marginBottom = '14px';
      const list = $('gateSecList'); if (list && list.parentNode) list.parentNode.insertBefore(host, list); else sec.appendChild(host);
    }
    if (!canView()) { host.style.display = 'none'; return; }
    host.style.display = '';
    if (!S.gateBusy) {
      S.gateBusy = true;
      try {
        const from = new Date(Date.now() - 3 * 86400000), fromIso = from.getFullYear() + '-' + pad(from.getMonth() + 1) + '-' + pad(from.getDate());
        const { data, error } = await sb().from(TABLE).select('*').or('status.eq.issued,issue_date.gte.' + fromIso).neq('status', 'cancelled')
          .order('status', { ascending: true }).order('issue_date', { ascending: false }).order('created_at', { ascending: false }).limit(60);
        if (error) throw error;
        S.gate = data || [];
      } catch (e) { console.warn('Gate loading-instruction view failed:', e && e.message); S.gate = S.gate || []; }
      finally { S.gateBusy = false; }
    }
    const open = S.gate.filter(r => r.status === 'issued').length;
    host.innerHTML = '<div class="panel-head"><span class="panel-title">Loading instructions</span><span class="panel-meta">' + open + ' awaiting loading · last 3 days</span></div>' +
      (S.gate.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Serial</th><th>Date</th><th>Truck</th><th>Shipper</th><th>Containers</th><th>Release order</th><th>Status</th><th></th></tr></thead><tbody>' +
        S.gate.map(r => '<tr><td><span class="li-serial">' + esc(r.serial_no) + '</span></td><td>' + esc(dshort(r.issue_date)) + '</td><td class="li-mono">' + esc(r.truck_no) + '</td><td>' + esc(r.shipper) + '</td>' +
          '<td>' + contCell(r) + '<div class="li-dim" style="font-size:10.5px">' + esc(boxLabel(r.box_count)) + (asList(r.container_types).length ? ' · ' + esc(asList(r.container_types).join(', ')) : '') + '</div></td>' +
          '<td>' + (esc(r.release_order_no) || '<span class="li-dim">—</span>') + '</td><td>' + chip(r.status) + '</td>' +
          '<td><div class="li-acts"><button type="button" class="tbl-btn" onclick="GargoLI.docById(\'' + esc(r.id) + '\',\'preview\')">View</button><button type="button" class="tbl-btn" onclick="GargoLI.docById(\'' + esc(r.id) + '\',\'print\')">Print</button></div></td></tr>').join('') +
        '</tbody></table></div>' : '<div class="empty-state" style="padding:16px"><div class="empty-state-label">No loading instructions in the last 3 days</div></div>');
  };

  /* ═══ GargoPrint: print buttons for reports that could only be exported ═══ */
  const P = window.GargoPrint = {};
  /* sheets: [{ title, rows: [[header...], [row...], ...] }] */
  P.sheets = function (title, sheets, meta) {
    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to print', 'error', 5000); return; }
    const hdr = typeof window.ghPrintHeaderHtml === 'function' ? window.ghPrintHeaderHtml() : '';
    const tbl = s => '<h3>' + esc(s.title || '') + '</h3><table><thead><tr>' + (s.rows[0] || []).map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      s.rows.slice(1).map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    w.document.write('<html><head><title>' + esc(title) + '</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:14px}' +
      'th,td{border:1px solid #ccc;padding:4px 7px;text-align:left;vertical-align:top}th{background:#f2f2f2;text-transform:uppercase;font-size:9px}h2{margin:4px 0}h3{margin:14px 0 6px;font-size:13px}tr{page-break-inside:avoid}thead{display:table-header-group}' +
      '@page{size:A4 landscape;margin:12mm}</style></head><body>' + hdr + '<h2>' + esc(title) + '</h2><div style="font-size:11px;color:#555;margin-bottom:10px">Generated ' + esc(new Date().toLocaleString('en-KE')) + (meta ? ' · ' + esc(meta) : '') + '</div>' +
      sheets.map(tbl).join('') + '</body></html>');
    w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
    try { addAudit((state.profile && state.profile.username) || 'system', 'Report Printed', title); } catch (e) {}
  };
  P.inward = function () {
    if (typeof _iwRptRows === 'undefined' || !_iwRptRows.length) return toast('Run the report first. There is nothing to print.', 'warning');
    const head = ['Gate-In date', 'Depot-In date', 'Container', 'Movement', 'Size/Type', 'Shipping line', 'EIR No.', 'Truck', 'Trailer', 'Driver', 'Driver ID', 'Status'];
    const rows = _iwRptRows.map(({ ic, status, at }) => [at, ic.depotInAt || '', ic.container, ic.type, ic.ctype, lineName(ic.line), ic.eirNumber,
      ic.truck ? truckName(ic.truck) : ic.truckRegText, ic.trailerNo, ic.driver ? driverName(ic.driver) : ic.driverNameText, ic.driverIdNumber, (typeof IW_STATUS_LABEL !== 'undefined' && IW_STATUS_LABEL[status]) || status]);
    P.sheets('Inward Report', [{ title: '', rows: [head].concat(rows) }], rows.length + ' record(s)');
  };
  P.depops = function () {
    if (typeof _depOpsRptRows === 'undefined' || !_depOpsRptRows.length) return toast('Run the report first. There is nothing to print.', 'warning');
    const head = ['Date', 'Container', 'Movement', 'Type', 'Shipping Line', 'Condition', 'Truck', 'Driver', 'Status', 'Repair Cost'];
    const rows = _depOpsRptRows.map(ic => [ic.date, ic.container, ic.type, ic.ctype, lineName(ic.line), ic.condition, ic.truck ? truckName(ic.truck) : '', ic.driver ? driverName(ic.driver) : '', ic.status, ic.repairTotal || 0]);
    P.sheets('DepOps Interchange Report', [{ title: '', rows: [head].concat(rows) }], rows.length + ' record(s)');
  };
  P.audit = function () {
    if (typeof trc === 'undefined' || !trc.auditRows || !trc.auditRows.length) return toast('Run the query first. There is nothing to print.', 'warning');
    const rows = trc.auditRows.map(a => [a.time ? new Date(a.time).toLocaleString('en-KE') : '', a.user, a.action, a.detail || '']);
    P.sheets('Audit Log', [{ title: '', rows: [['Time', 'User', 'Action', 'Detail']].concat(rows) }], rows.length + ' entries');
  };

  /* Print stylesheet: any screen can be printed (Ctrl+P / browser Print) without the menus, toolbars and buttons. */
  function printCss() {
    if ($('gxPrintCss')) return;
    const s = document.createElement('style'); s.id = 'gxPrintCss';
    s.textContent = '@media print{' +
      '.admin-rail,.sidebar,.sidebar-backdrop,.mobile-nav-bar,.scroll-top-btn,#alertsPanel,#toastStack,#gxNet,#gxSearchBtn,.gx-search-btn,.nxp,.nx-jump,.sec-toolbar .filter-row,.action-btn,.tbl-btn,.modal-btn,.pill,.filter-btn,.topbar,.login-split{display:none!important}' +
      'html,body,.shell,.body-wrap,.main,.content{background:#fff!important;color:#111!important;height:auto!important;overflow:visible!important;display:block!important;padding-left:0!important;margin-left:0!important}' +
      '.section{display:none!important}.section.active{display:block!important;padding:0!important}' +
      '.panel,.form-card,.kpi-card,.table-wrap{background:#fff!important;box-shadow:none!important;border:1px solid #ccc!important;color:#111!important;overflow:visible!important}' +
      '.table-wrap table{min-width:0!important;width:100%}' +
      'table,th,td{color:#111!important;border-color:#ccc!important;background:#fff!important}tr{page-break-inside:avoid}thead{display:table-header-group}' +
      '.modal-backdrop.active{position:static!important;background:#fff!important;display:block!important}.modal-backdrop.active .modal-box{position:static!important;max-height:none!important;box-shadow:none!important;border:0!important;background:#fff!important;color:#111!important;width:100%!important;max-width:none!important}' +
      'body:has(.modal-backdrop.active) .shell{display:none!important}' +
      '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    document.head.appendChild(s);
  }

  /* ── wire up ── */
  function wire() {
    printCss(); mountTab();
    try {
      if (typeof sectionRenderers !== 'undefined') {
        const prev = sectionRenderers.gatesecurity;
        sectionRenderers.gatesecurity = function () { if (prev) prev.apply(this, arguments); LI.renderGate(); };
        const prevD = sectionRenderers.dispatch;
        if (prevD) sectionRenderers.dispatch = function () { const r = prevD.apply(this, arguments); const p = $('dispatchTabLI'); if (p && p.style.display !== 'none') LI.open(); return r; };
      }
    } catch (e) { console.warn('Loading instructions: could not hook section renderers', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();