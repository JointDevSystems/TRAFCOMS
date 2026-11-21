'use strict';

(function () {
  const SEC = 'gatesecurity', TABLE = 'gate_security_log', QKEY = 'gargo-gate-queue', PAGE = 50, CKEY = 'gargo-gate-cache';
  const $ = id => document.getElementById(id);
  const sb = () => (typeof supabase !== 'undefined' && supabase) || window.ghSupabase;
  const G = window.GateSec = {};
  const S = { stale: 0, rows: [], total: 0, dir: 'all', q: '', from: '', to: '', limit: PAGE, busy: false, today: { in: 0, out: 0 } };

  /* ── register the section with the app shell ── */
  SECTION_META[SEC] = ['Operations', 'Gate Processes'];
  if (ALL_SIDEBAR_SECTIONS.indexOf(SEC) < 0) ALL_SIDEBAR_SECTIONS.push(SEC);
  if (ROLE_SIDEBAR.admin.indexOf(SEC) < 0) ROLE_SIDEBAR.admin.push(SEC);
  sectionRenderers[SEC] = function () { G.render(); };

  const can = () => { try { return isAdmin() || canSeeSection(SEC); } catch (e) { return false; } };
  const canFix = () => { try { return isAdmin(); } catch (e) { return false; } };

  /* ── helpers ── */
  const pad = n => String(n).padStart(2, '0');
  const localInput = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const dayStart = s => new Date(s + 'T00:00:00').toISOString();
  const dayEnd = s => new Date(s + 'T23:59:59.999').toISOString();
  const fmtWhen = iso => { const d = new Date(iso); return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }); };
  const val = id => ($(id) ? $(id).value : '').trim();
  const isNetErr = e => !navigator.onLine || (e && !e.code && /fetch|network|failed to|load failed|timeout/i.test(String(e.message || e)));

  /* The officer on a gate entry depends on the direction: vehicles coming IN have a receiving officer, vehicles going OUT a releasing officer. */
  const officerOf = r => (r.direction === 'out' ? r.released_by : r.received_by) || '';
  const officerLabel = d => (d === 'out' ? 'Releasing officer' : 'Receiving officer');
  const uidNow = () => { try { return (state.currentUser && state.currentUser.id) || ''; } catch (e) { return ''; } };
  /* last good register + today's counts, kept on the device so the screen is never blank when the signal drops */
  const cRead = () => { try { const c = JSON.parse(localStorage.getItem(CKEY) || 'null'); return c && c.uid === uidNow() ? c : null; } catch (e) { return null; } };
  const cWrite = () => { try { if (S.q || S.from || S.to || S.dir !== 'all') return; localStorage.setItem(CKEY, JSON.stringify({ uid: uidNow(), at: Date.now(), rows: S.rows.slice(0, PAGE), total: S.total, today: S.today })); } catch (e) {} };
  function css() { /* styles live in gate-desk.css */ }

  /* transporter + commodity need two new columns (gate-log-upgrade.sql). Until they exist the entry is still saved, without them. */
  const EXT = ['transporter', 'commodity'];
  const noExt = rec => { const c = Object.assign({}, rec); EXT.forEach(k => delete c[k]); return c; };
  const extMissing = e => !!e && /transporter|commodity/i.test(String(e.message || e)) && /column|schema cache/i.test(String(e.message || e));
  async function write(rec, editId) {
    const run = r => editId ? sb().from(TABLE).update(r).eq('id', editId) : sb().from(TABLE).insert(r);
    let res = await run(rec);
    if (res.error && extMissing(res.error)) { res = await run(noExt(rec)); if (!res.error) res.stripped = true; }
    else if (!res.error) S.ext = true;
    return res;
  }

  /* ── on-device queue for entries made without a connection ── */
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
        if (rec.direction === 'in' && !rec.received_by && rec.released_by) { rec.received_by = rec.released_by; rec.released_by = null; }   // entries queued before the receiving-officer field existed
        const { error } = await write(rec);
        if (!error || error.code === '23505') sent++;          // saved, or already saved by an earlier attempt
        else keep.push(rec);
      }
      qWrite(keep);
    } finally { flushing = false; }
    if (sent) { try { toast(sent + ' gate ' + (sent === 1 ? 'entry' : 'entries') + ' sent', 'success'); } catch (e) {} }
    return sent;
  }
  window.addEventListener('online', () => { flush().then(n => { if (n && state.currentSection === SEC) G.render(); }); });

  /* ── data ── */
  function applyFilters(q) {
    if (S.dir !== 'all') q = q.eq('direction', S.dir);
    if (S.from) q = q.gte('movement_at', dayStart(S.from));
    if (S.to) q = q.lte('movement_at', dayEnd(S.to));
    const t = S.q.replace(/[,()%*\\]/g, ' ').trim();
    if (t) {
      const p = '%' + t + '%';
      q = q.or(['vehicle_no', 'trailer_no', 'driver_name', 'driver_id_number', 'container_no', 'gate_pass_no', 'released_by', 'received_by'].concat(S.ext ? EXT : []).map(c => c + '.ilike.' + p).join(','));
    }
    return q;
  }
  async function load() {
    if (!sb() || !can()) return;
    S.busy = true;
    try {
      const todayStart = dayStart(localInput(new Date()).slice(0, 10));
      const [list, cin, cout] = await Promise.all([
        applyFilters(sb().from(TABLE).select('*', { count: 'exact' })).order('movement_at', { ascending: false }).range(0, S.limit - 1),
        sb().from(TABLE).select('id', { count: 'exact', head: true }).eq('direction', 'in').gte('movement_at', todayStart),
        sb().from(TABLE).select('id', { count: 'exact', head: true }).eq('direction', 'out').gte('movement_at', todayStart),
      ]);
      if (list.error) throw list.error;
      S.rows = list.data || []; S.total = list.count || S.rows.length;
      if (S.rows.length && 'transporter' in S.rows[0]) S.ext = true;
      S.today = { in: cin.count || 0, out: cout.count || 0 };
      S.stale = 0; cWrite();
    } catch (e) {
      console.warn('Gate log load failed:', e && e.message);
      if (!S.rows.length) { const c = cRead(); if (c) { S.rows = c.rows || []; S.total = c.total || S.rows.length; S.today = c.today || S.today; } }
      S.stale = (cRead() || {}).at || Date.now();
      if (navigator.onLine && !isNetErr(e)) toast('Could not load the gate register: ' + ((e && e.message) || 'error'), 'error');
    } finally { S.busy = false; }
  }

  /* ── screen ── */
  G.render = async function () {
    css();
    if (window.GateDesk && GateDesk.mount) GateDesk.mount();
    const host = $('gateSecList'); if (!host) return;
    if (!can()) { host.innerHTML = '<div class="empty-state"><div class="empty-state-label">You do not have access to Gate Processes</div></div>'; return; }
    const addIn = $('gsAddIn'), addOut = $('gsAddOut');
    [addIn, addOut].forEach(b => { if (b) b.style.display = ''; });
    try { if (typeof loadIncomingDrivers === 'function' && !IncomingDrivers.loaded) loadIncomingDrivers(); } catch (e) {}   // feeds the driver list
    await flush();
    await load();
    G.paint();
  };
  G.paint = function () {
    const host = $('gateSecList'), kp = $('gateSecKpis'); if (!host) return;
    if (kp) kp.innerHTML = [
      kpiCard('Vehicles In Today', S.today.in, 'Entered the gate', 'kpi-blue'),
      kpiCard('Vehicles Out Today', S.today.out, 'Left the gate', 'kpi-gold'),
      kpiCard('Entries Shown', S.rows.length, 'of ' + S.total + ' matching', 'kpi-green'),
    ].join('');
    const waiting = qRead().length;
    const banner = waiting ? '<div class="gs-queue"><span>' + waiting + ' ' + (waiting === 1 ? 'entry is' : 'entries are') + ' saved on this device and will be sent when the connection returns.</span><button type="button" class="tbl-btn" onclick="GateSec.sync()">Send now</button></div>' : '';
    const old = S.stale ? '<div class="gs-queue"><span>No connection. Showing the register as it was ' + esc(fmtWhen(new Date(S.stale).toISOString())) + '. It refreshes by itself when the signal returns.</span></div>' : '';
    const fix = canFix();
    const dash = '<span class="gs-dim">—</span>';
    const body = S.rows.length
      ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Date &amp; time</th><th>Movement</th><th>Vehicle</th><th>Driver</th><th>Transporter</th><th>Commodity</th><th>Container</th><th>Gate pass</th><th>Officer</th><th></th></tr></thead><tbody>' +
        S.rows.map(r => '<tr><td style="white-space:nowrap">' + esc(fmtWhen(r.movement_at)) + '</td><td><span class="gs-dir ' + esc(r.direction) + '">' + (r.direction === 'in' ? 'In' : 'Out') + '</span></td>' +
          '<td><span class="gs-mono">' + esc(r.vehicle_no) + '</span>' + (r.trailer_no ? '<span class="gs-sub">Trailer ' + esc(r.trailer_no) + '</span>' : '') + '</td>' +
          '<td>' + esc(r.driver_name) + '<span class="gs-sub">ID ' + esc(r.driver_id_number) + '</span></td>' +
          '<td>' + (esc(r.transporter) || dash) + '</td>' +
          '<td>' + (r.commodity ? '<span class="gs-tag">' + esc(r.commodity) + '</span>' : dash) + '</td>' +
          '<td class="gs-mono">' + (esc(r.container_no) || dash) + '</td><td>' + (esc(r.gate_pass_no) || dash) + '</td>' +
          '<td>' + esc(officerOf(r)) + '<span class="gs-sub">' + (r.direction === 'out' ? 'Releasing' : 'Receiving') + '</span></td>' +
          '<td style="white-space:nowrap">' + (r.direction === 'out' ? '<button type="button" class="tbl-btn" onclick="GateSec.slip(\'' + esc(r.id) + '\',\'preview\')">👁 Slip</button> <button type="button" class="tbl-btn" onclick="GateSec.slip(\'' + esc(r.id) + '\',\'print\')">Print</button> ' : '') + (fix ? '<button type="button" class="tbl-btn" onclick="GateSec.edit(\'' + esc(r.id) + '\')">Edit</button> <button type="button" class="tbl-btn" onclick="GateSec.remove(\'' + esc(r.id) + '\')">Delete</button>' : '') + '</td></tr>').join('') +
        '</tbody></table></div>' + (S.rows.length < S.total ? '<div class="gs-more"><button type="button" class="action-btn ghost" onclick="GateSec.more()">Show more</button></div>' : '')
      : '<div class="empty-state"><div class="empty-state-icon">🚧</div><div class="empty-state-label">No gate entries match</div></div>';
    host.innerHTML = banner + old + body;
  };
  G.filter = function (d, btn) {
    S.dir = d; S.limit = PAGE;
    document.querySelectorAll('#sec-' + SEC + ' .filter-row .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    G.reload();
  };
  let t = 0;
  G.search = function () { clearTimeout(t); t = setTimeout(() => { S.q = val('gsQ'); S.from = val('gsFrom'); S.to = val('gsTo'); S.limit = PAGE; G.reload(); }, 300); };
  G.reload = async function () { await load(); G.paint(); };
  G.more = function () { S.limit += PAGE; G.reload(); };
  G.sync = async function () { const n = await flush(); if (!n && qRead().length) toast('Still offline. Entries are safe on this device.', 'warning'); G.render(); };

  /* ── entry form (new entry, or an administrator's correction) ── */
  const COMMODITIES = ['Sale Unit', 'Repat', 'Export'];
  const nkey = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  /* drivers to pick from: Gargo's own, drivers seen on incoming trucks, and anyone already in the gate register */
  function pool() {
    const out = [], seen = {};
    const add = (name, id, tr, grp) => { name = String(name || '').trim(); const k = nkey(name); if (!k || seen[k]) return; seen[k] = 1; out.push({ name: name, id: id || '', tr: tr || '', grp: grp }); };
    try { (state.db.drivers || []).forEach(d => add(d.name, d.idNo, '', 'Gargo drivers')); } catch (e) {}
    try { if (typeof IncomingDrivers !== 'undefined') IncomingDrivers.list.forEach(d => add(d.name, d.id_no, d.transporter, 'Previous drivers')); } catch (e) {}
    S.rows.forEach(r => add(r.driver_name, r.driver_id_number, r.transporter, 'Previous drivers'));
    const by = (a, b) => a.name.localeCompare(b.name);
    return out.filter(d => d.grp === 'Gargo drivers').sort(by).concat(out.filter(d => d.grp !== 'Gargo drivers').sort(by));
  }
  function transporters(P) {
    const seen = {}, out = [];
    const add = t => { t = String(t || '').trim(); const k = nkey(t); if (k && !seen[k]) { seen[k] = 1; out.push(t); } };
    P.forEach(d => add(d.tr)); S.rows.forEach(r => add(r.transporter));
    try { if (typeof IncomingDrivers !== 'undefined') IncomingDrivers.list.forEach(d => add(d.transporter)); } catch (e) {}
    return out.sort((a, b) => a.localeCompare(b));
  }
  function form(rec, newDir, pre) {
    const r = rec || pre || {}, dir = r.direction || newDir || 'in', P = pool();
    G._pool = P;
    const f = (id, label, v, extra) => '<div class="fg"><label for="gs_' + id + '">' + label + '</label><input id="gs_' + id + '" value="' + esc(v) + '" ' + (extra || '') + '/></div>';
    /* driver: pick from the list, or type */
    const di = r.driver_name ? P.findIndex(d => nkey(d.name) === nkey(r.driver_name)) : -1;
    const drvManual = !P.length || (r.driver_name && di < 0);
    const grp = g => { const o = P.map((d, i) => [d, i]).filter(x => x[0].grp === g).map(x => '<option value="' + x[1] + '"' + (x[1] === di ? ' selected' : '') + '>' + esc(x[0].name) + (x[0].id ? ' (' + esc(x[0].id) + ')' : '') + '</option>').join(''); return o ? '<optgroup label="' + g + '">' + o + '</optgroup>' : ''; };
    const drvSel = P.length ? '<select id="gs_drvsel" onchange="GateSec.drvPick()"><option value="">Select a driver…</option>' + grp('Gargo drivers') + grp('Previous drivers') + '<option value="__manual"' + (drvManual ? ' selected' : '') + '>Not listed: type the name…</option></select>' : '';
    const driver = '<div class="fg"><label for="gs_drvsel">Driver\'s name</label>' + drvSel +
      '<input id="gs_drv" class="gs-manual' + (drvManual ? '' : ' gs-hidden') + '" value="' + esc(r.driver_name) + '" placeholder="Type the driver\'s full name" autocomplete="off"/></div>';
    /* commodity: Sale Unit / Repat / Export, or typed */
    const cv = String(r.commodity || '').trim(), cm = COMMODITIES.find(c => nkey(c) === nkey(cv)), other = !!cv && !cm;
    const comSel = '<select id="gs_com" onchange="GateSec.comPick()"><option value="">Select commodity…</option>' + COMMODITIES.map(c => '<option value="' + c + '"' + (c === cm ? ' selected' : '') + '>' + c + '</option>').join('') + '<option value="__other"' + (other ? ' selected' : '') + '>Other: type it in…</option></select>';
    const tl = transporters(P).map(t => '<option value="' + esc(t) + '"></option>').join('');
    const officer = esc(officerOf(r) || r.released_by || r.received_by || (state.profile && state.profile.name) || '');
    openModal(rec ? 'Edit gate entry' : (dir === 'out' ? 'Vehicle going out' : 'Vehicle coming in'),
      '<div class="gs-form">' +
      '<select id="gs_dir" class="gs-hidden" onchange="GateSec.dirChanged()"><option value="in"' + (dir === 'in' ? ' selected' : '') + '>Vehicle in</option><option value="out"' + (dir === 'out' ? ' selected' : '') + '>Vehicle out</option></select>' +
      '<div class="gs-seg" role="group" aria-label="Movement"><button type="button" data-d="in" onclick="GateSec.setDir(\'in\')">⬇ Vehicle in</button><button type="button" data-d="out" onclick="GateSec.setDir(\'out\')">⬆ Vehicle out</button></div>' +
      '<div class="gs-group"><div class="gs-group-h">Vehicle</div>' +
        '<div class="form-row-2">' + f('veh', 'Vehicle number', r.vehicle_no, 'autocapitalize="characters" autocomplete="off"') + f('trl', 'Trailer number', r.trailer_no, 'autocapitalize="characters" autocomplete="off"') + '</div>' +
        '<div class="fg gs-outonly"><label for="gs_tr">Transporter</label><input id="gs_tr" list="gs_trl" value="' + esc(r.transporter) + '" placeholder="Pick a transporter or type a new one" autocomplete="off"/><datalist id="gs_trl">' + tl + '</datalist></div>' +
      '</div>' +
      '<div class="gs-group"><div class="gs-group-h">Driver</div>' + driver + f('idn', 'ID number', r.driver_id_number || (di > -1 ? P[di].id : ''), 'autocomplete="off"') + '</div>' +
      '<div class="gs-group"><div class="gs-group-h">Cargo</div>' +
        '<div class="fg" id="gs_cwrap"><label for="gs_con">Container number</label><input id="gs_con" value="' + esc(r.container_no) + '" autocapitalize="characters" autocomplete="off" placeholder="e.g. MSKU1234567"/></div>' +
        '<div class="fg gs-outonly"><label for="gs_com">Commodity</label>' + comSel + '<input id="gs_comx" class="gs-manual' + (other ? '' : ' gs-hidden') + '" value="' + (other ? esc(cv) : '') + '" placeholder="Type the commodity" autocomplete="off"/></div>' +
      '</div>' +
      '<div class="gs-group"><div class="gs-group-h">Gate record</div>' +
        '<div class="form-row-2"><div class="fg"><label for="gs_when">Date and time</label><input id="gs_when" type="datetime-local" value="' + localInput(r.movement_at ? new Date(r.movement_at) : new Date()) + '"/></div>' + f('gp', 'Gate pass number', r.gate_pass_no, 'autocomplete="off"') + '</div>' +
        '<div class="fg"><label id="gs_rellbl" for="gs_rel">' + officerLabel(dir) + '</label><input id="gs_rel" value="' + officer + '" autocomplete="off"/></div>' +
      '</div>' +
      '<div id="gs_err" class="gs-err" role="alert"></div>' +
      '<button class="submit-btn" id="gs_go" onclick="GateSec.save(' + (rec ? "'" + esc(rec.id) + "'" : '') + ')">' + (rec ? 'Save changes' : 'Save entry') + '</button></div>');
    G.dirChanged();
    setTimeout(() => { const v = $('gs_veh'); if (v && !rec) v.focus(); }, 80);
  }
  G.setDir = function (d) { const s = $('gs_dir'); if (s) { s.value = d === 'out' ? 'out' : 'in'; G.dirChanged(); } };
  G.dirChanged = function () {
    const d = val('gs_dir') === 'out' ? 'out' : 'in', l = $('gs_rellbl'); if (l) l.textContent = officerLabel(d);
    const t = document.querySelector('#modalOverlay .modal-title, #modalTitle'); if (t && !/^Edit/.test(t.textContent)) t.textContent = d === 'out' ? 'Vehicle going out' : 'Vehicle coming in';
    const c = $('gs_cwrap'); if (c) { const lb = c.querySelector('label'); if (lb) lb.textContent = d === 'out' ? 'Container number' : 'Container number (if any)'; }
    Array.prototype.forEach.call(document.querySelectorAll('#modalOverlay .gs-outonly'), el => el.classList.toggle('gs-hidden', d !== 'out'));   // transporter + commodity: vehicles going out only
    Array.prototype.forEach.call(document.querySelectorAll('#modalOverlay .gs-seg button'), b => b.classList.toggle('on', b.getAttribute('data-d') === d));
  };
  G.drvPick = function () {
    const sel = $('gs_drvsel'), man = $('gs_drv'); if (!sel || !man) return;
    if (sel.value === '__manual') { man.classList.remove('gs-hidden'); man.value = ''; man.focus(); return; }
    man.classList.add('gs-hidden');
    const d = (G._pool || [])[Number(sel.value)];
    if (!d) { man.value = ''; return; }
    man.value = d.name;
    if (d.id && $('gs_idn')) $('gs_idn').value = d.id;
    if (d.tr && $('gs_tr') && !val('gs_tr')) $('gs_tr').value = d.tr;
  };
  G.comPick = function () { const sel = $('gs_com'), x = $('gs_comx'); if (!sel || !x) return; const o = sel.value === '__other'; x.classList.toggle('gs-hidden', !o); if (o) x.focus(); };
  const comVal = () => ($('gs_com') && $('gs_com').value === '__other') ? val('gs_comx') : val('gs_com');
  G.add = function (dir, pre) { if (!can()) return toast('You do not have access to Gate Processes', 'error'); form(null, dir === 'out' ? 'out' : 'in', pre || null); };
  G.edit = function (id) { if (!canFix()) return toast('Only an administrator can correct a gate entry', 'error'); const r = S.rows.find(x => x.id === id); if (r) form(r); };

  G.save = async function (editId) {
    const err = $('gs_err'), go = $('gs_go');
    const dir = val('gs_dir') === 'out' ? 'out' : 'in';
    const rec = { direction: dir, vehicle_no: val('gs_veh'), trailer_no: val('gs_trl') || null, driver_name: val('gs_drv'), driver_id_number: val('gs_idn'),
      movement_at: val('gs_when') ? new Date(val('gs_when')).toISOString() : new Date().toISOString(),
      container_no: val('gs_con') || null, gate_pass_no: val('gs_gp') || null,
      transporter: dir === 'out' ? (val('gs_tr') || null) : null, commodity: dir === 'out' ? (comVal() || null) : null,
      released_by: dir === 'out' ? val('gs_rel') : null, received_by: dir === 'in' ? val('gs_rel') : null };
    if (dir === 'in' && !editId) { delete rec.transporter; delete rec.commodity; }
    const miss = [];
    if (!rec.vehicle_no) miss.push('vehicle number'); if (!rec.driver_name) miss.push("driver's name"); if (!rec.driver_id_number) miss.push('ID number');
    if (dir === 'out' && !rec.container_no) miss.push('container number'); if (dir === 'out' && !rec.commodity) miss.push('commodity'); if (!officerOf(rec)) miss.push(dir === 'out' ? 'releasing officer' : 'receiving officer');
    if (miss.length) { err.textContent = 'Please fill in: ' + miss.join(', ') + '.'; return; }
    if (isNaN(new Date(rec.movement_at).getTime())) { err.textContent = 'Check the date and time.'; return; }
    err.textContent = ''; go.disabled = true;
    try {
      let stripped = false;
      if (editId) {
        const res = await write(rec, editId);
        if (res.error) throw res.error;
        stripped = !!res.stripped;
        closeModal(); toast('Entry updated', 'success');
      } else {
        rec.id = uid(); rec.created_by = state.currentUser && state.currentUser.id;      // fixed id: a retry can never create a duplicate
        try {
          const res = await write(rec);
          if (res.error && res.error.code !== '23505') throw res.error;
          stripped = !!res.stripped;
          closeModal(); toast('Gate entry saved: ' + rec.vehicle_no + (dir === 'in' ? ' in' : ' out'), 'success');
        } catch (e) {
          if (!isNetErr(e)) throw e;
          const q = qRead(); q.push(rec); qWrite(q);
          closeModal(); toast('No connection. Entry saved on this device and will be sent automatically.', 'warning', 5000);
        }
      }
      if (stripped && dir === 'out') toast('Saved, but transporter and commodity were not stored. Run gate-log-upgrade.sql in Supabase first.', 'warning', 8000);
      await G.reload(); if (window.GateDesk && GateDesk.refresh) GateDesk.refresh();
      if (dir === 'out' && !editId) G.offerSlip(rec);
    } catch (e) {
      console.warn('Gate entry failed:', e);
      err.textContent = /row-level security|permission/i.test(String(e && e.message)) ? 'You are not allowed to save gate entries. Ask an administrator to tick Gate Processes for your account.' : ('Could not save: ' + ((e && e.message) || 'error'));
    } finally { if ($('gs_go')) $('gs_go').disabled = false; }
  };

  /* ── Vehicle exit slip (gate pass): Gargo Haven Depot letterhead, A5. Preview / print / download. ── */
  G.buildSlip = function (r, opts) {
    opts = opts || {};
    const jp = window.jspdf && window.jspdf.jsPDF; if (!jp) return null;
    const doc = new jp({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const M = 10, W = 128, R = M + W;
    const ink = () => { doc.setTextColor(20, 20, 20); doc.setDrawColor(60, 60, 60); };
    const li = (window.GargoLI && GargoLI.bySerial && r.gate_pass_no) ? GargoLI.bySerial(r.gate_pass_no) : null;   // the loading instruction this pass came from, if any
    let y = typeof window.ghPdfLetterhead === 'function' ? window.ghPdfLetterhead(doc, M, 8, W) : 24;
    doc.setDrawColor(201, 162, 39); doc.setLineWidth(0.6); doc.line(M, y + 1.5, R, y + 1.5);
    ink(); y += 8;

    const tw = 84, tx = M + W / 2 - tw / 2;
    doc.setLineWidth(0.5); doc.roundedRect(tx, y, tw, 10, 1.5, 1.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('VEHICLE EXIT SLIP', tx + tw / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100); doc.text('Gate pass: vehicle leaving the depot', M + W / 2, y + 15, { align: 'center' });
    ink(); doc.setLineWidth(0.25); y += 25;

    const label = (t, x, yy) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(t, x, yy); return x + doc.getTextWidth(t) + 2; };
    const line = (t, v, x, yy, w, big) => {
      const vx = label(t, x, yy);
      doc.setLineWidth(0.2); doc.setDrawColor(120); doc.line(vx, yy + 1.2, x + w, yy + 1.2); ink();
      if (v) { doc.setFont('helvetica', big ? 'bold' : 'normal'); let fs = big ? 14 : 10.5; doc.setFontSize(fs); while (fs > 6.5 && doc.getTextWidth(String(v)) > x + w - vx - 2) { fs -= 0.5; doc.setFontSize(fs); } doc.text(String(v), vx + 1.5, yy - 0.3); }
    };
    const half = (W - 6) / 2, x2 = M + half + 6;
    const when = r.movement_at ? fmtWhen(r.movement_at) : '';

    line('GATE PASS NO.:', r.gate_pass_no, M, y, half); line('TIME OUT:', when, x2, y, half); y += 11;
    line('VEHICLE NO.:', r.vehicle_no, M, y, half, true); line('TRAILER NO.:', r.trailer_no, x2, y, half); y += 11;
    line("DRIVER'S NAME:", r.driver_name, M, y, W); y += 11;
    line('ID NUMBER:', r.driver_id_number, M, y, half); line('TRANSPORTER:', r.transporter, x2, y, half); y += 11;
    line('CONTAINER NO.:', r.container_no, M, y, half); line('COMMODITY:', r.commodity, x2, y, half); y += 11;
    if (li) { line("SHIPPER'S NAME:", li.shipper, M, y, W); y += 11; line('RELEASE ORDER NO.:', li.release_order_no, M, y, W); y += 11; }
    y += 2;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60);
    doc.text(doc.splitTextToSize('The vehicle and cargo described above were checked at the gate and released from Gargo Haven Depot Limited. The driver confirms the details are correct.', W), M, y);
    ink(); y += 18;

    line('RELEASING OFFICER:', r.released_by, M, y, W); y += 13;
    line('OFFICER SIGN:', '', M, y, half); line("DRIVER'S SIGN:", '', x2, y, half); y += 11;
    if (li && li.verify_result === 'verified') {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(20, 130, 60);
      doc.text('Loading instruction ' + String(li.serial_no || '') + ' verified at gate' + (li.verified_by_name ? ' by ' + li.verified_by_name : ''), M, y); ink();
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120);
    const n = new Date();
    doc.text('Vehicle exit slip' + (r.id ? ' ' + String(r.id).slice(0, 8).toUpperCase() : '') + (opts.printedBy ? ' · printed by ' + opts.printedBy : '') + ' · ' + n.toLocaleDateString('en-KE') + ' ' + n.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }), M, 203);
    return { doc, filename: 'Vehicle-Exit-Slip-' + String(r.gate_pass_no || r.vehicle_no || 'out').replace(/[^\w-]+/g, '_') + '.pdf' };
  };

  /* mode: preview | print | download. ref is a register row id or the entry itself. */
  G.slip = async function (ref, mode) {
    const r = (ref && typeof ref === 'object') ? ref : S.rows.find(x => x.id === ref);
    if (!r) return toast('Entry not found on this screen. Refresh and try again.', 'error');
    let by = '';
    if (mode !== 'preview' && typeof window.ghAskPrinter === 'function') {
      by = await ghAskPrinter({ title: 'Vehicle exit slip: who is printing?', detail: String(r.vehicle_no || '') + (r.gate_pass_no ? ' · ' + r.gate_pass_no : '') });
      if (by === null) return;
      try { addAudit((state.profile && state.profile.username) || 'system', 'Vehicle Exit Slip Printed', r.vehicle_no + (r.gate_pass_no ? ' · ' + r.gate_pass_no : '') + ' · by ' + by); } catch (e) {}
    }
    const out = G.buildSlip(r, { printedBy: by });
    if (!out) return toast('The PDF library is not loaded yet. Try again in a moment.', 'error');
    if (mode === 'print') ghPrintPdf(out.doc);
    else if (mode === 'download') { if (window.GargoDocs && GargoDocs.rawSave) GargoDocs.rawSave(out); else out.doc.save(out.filename); }
    else if (window.GargoDocs && GargoDocs.view) GargoDocs.view(out, 'Vehicle exit slip · ' + r.vehicle_no);
    else out.doc.save(out.filename);
  };
  /* shown straight after a vehicle-out entry is saved (also when it was saved offline) */
  G.offerSlip = function (rec) {
    if (!rec) return; G._last = rec;
    const b = (mode, label, ghost) => '<button type="button" class="modal-btn' + (ghost ? ' ghost' : '') + '" onclick="GateSec.slip(GateSec._last,\'' + mode + '\')">' + label + '</button>';
    openModal('Vehicle exit slip',
      '<div style="font-size:13px;line-height:1.6;color:var(--text-2)"><div style="margin-bottom:12px"><b class="gs-mono" style="color:var(--gold);font-size:16px">' + esc(rec.vehicle_no) + '</b> has been recorded going out.' + (rec.gate_pass_no ? ' Gate pass <b>' + esc(rec.gate_pass_no) + '</b>.' : '') + ' The slip is ready.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + b('preview', '👁 Preview') + b('print', '🖨 Print', true) + b('download', '⬇ Download', true) +
      '<button type="button" class="modal-btn ghost" onclick="closeModal()">Done</button></div></div>');
  };

  G.remove = async function (id) {
    if (!canFix()) return toast('Only an administrator can delete a gate entry', 'error');
    const r = S.rows.find(x => x.id === id); if (!r) return;
    if (!confirm('Delete the ' + (r.direction === 'in' ? 'in' : 'out') + ' entry for ' + r.vehicle_no + ' (' + fmtWhen(r.movement_at) + ')? This cannot be undone.')) return;
    const { error } = await sb().from(TABLE).delete().eq('id', id);
    if (error) return toast('Could not delete: ' + error.message, 'error');
    toast('Entry deleted', 'success'); G.reload();
  };
})();