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
  function css() {
    if ($('gsCss')) return;
    const s = document.createElement('style'); s.id = 'gsCss';
    s.textContent = '.gs-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}' +
      '.gs-bar input{background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:8px 11px;font-size:12.5px;min-width:0}' +
      '.gs-bar input.gs-q{flex:1 1 220px;max-width:340px}.gs-bar label{font-size:11px;color:var(--text-3)}' +
      '.gs-dir{display:inline-block;padding:2px 9px;border-radius:999px;font:600 10px var(--font-mono,monospace);letter-spacing:.8px;text-transform:uppercase;border:1px solid var(--border)}' +
      '.gs-dir.in{color:var(--blue);background:var(--blue-dim);border-color:var(--blue)}.gs-dir.out{color:var(--gold);background:var(--gold-dim);border-color:var(--gold)}' +
      '.gs-mono{font-family:var(--font-mono,monospace);font-weight:600;color:var(--text)}.gs-dim{color:var(--text-3)}' +
      '.gs-queue{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:0 0 12px;padding:10px 14px;border:1px solid var(--amber);border-radius:10px;background:var(--amber-dim);color:var(--amber);font-size:12.5px}' +
      '.gs-more{display:flex;justify-content:center;padding:14px 0}';
    document.head.appendChild(s);
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
        const { error } = await sb().from(TABLE).insert(rec);
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
      q = q.or(['vehicle_no', 'trailer_no', 'driver_name', 'driver_id_number', 'container_no', 'gate_pass_no', 'released_by', 'received_by'].map(c => c + '.ilike.' + p).join(','));
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
    const body = S.rows.length
      ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Date &amp; time</th><th>Direction</th><th>Vehicle</th><th>Trailer</th><th>Driver</th><th>ID No.</th><th>Container</th><th>Gate pass</th><th>Officer</th>' + (fix ? '<th></th>' : '') + '</tr></thead><tbody>' +
        S.rows.map(r => '<tr><td>' + esc(fmtWhen(r.movement_at)) + '</td><td><span class="gs-dir ' + esc(r.direction) + '">' + (r.direction === 'in' ? 'In' : 'Out') + '</span></td>' +
          '<td class="gs-mono">' + esc(r.vehicle_no) + '</td><td class="gs-mono">' + (esc(r.trailer_no) || '<span class="gs-dim">—</span>') + '</td>' +
          '<td>' + esc(r.driver_name) + '</td><td class="gs-mono">' + esc(r.driver_id_number) + '</td>' +
          '<td class="gs-mono">' + (esc(r.container_no) || '<span class="gs-dim">—</span>') + '</td><td>' + (esc(r.gate_pass_no) || '<span class="gs-dim">—</span>') + '</td>' +
          '<td><span class="gs-dim" style="font-size:10.5px">' + (r.direction === 'out' ? 'Releasing' : 'Receiving') + '</span><br>' + esc(officerOf(r)) + '</td>' +
          (fix ? '<td style="white-space:nowrap"><button type="button" class="tbl-btn" onclick="GateSec.edit(\'' + esc(r.id) + '\')">Edit</button> <button type="button" class="tbl-btn" onclick="GateSec.remove(\'' + esc(r.id) + '\')">Delete</button></td>' : '') + '</tr>').join('') +
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
  function form(rec, newDir, pre) {
    const r = rec || pre || {}, dir = r.direction || newDir || 'in';
    const f = (id, label, v, extra) => '<div class="fg"><label>' + label + '</label><input id="gs_' + id + '" value="' + esc(v) + '" ' + (extra || '') + '/></div>';
    openModal((rec ? 'Edit gate entry' : (dir === 'out' ? 'Vehicle going out' : 'Vehicle coming in')),
      '<div class="fg"><label>Movement</label><select id="gs_dir" onchange="GateSec.dirChanged()"><option value="in"' + (dir === 'in' ? ' selected' : '') + '>Vehicle in</option><option value="out"' + (dir === 'out' ? ' selected' : '') + '>Vehicle out</option></select></div>' +
      '<div class="form-row-2">' + f('veh', 'Vehicle number', r.vehicle_no, 'autocapitalize="characters" autocomplete="off"') + f('trl', 'Trailer number', r.trailer_no, 'autocapitalize="characters" autocomplete="off"') + '</div>' +
      '<div class="form-row-2">' + f('drv', "Driver's name", r.driver_name, 'autocomplete="off"') + f('idn', 'ID number', r.driver_id_number, 'autocomplete="off"') + '</div>' +
      '<div class="form-row-2"><div class="fg"><label>Date and time</label><input id="gs_when" type="datetime-local" value="' + localInput(r.movement_at ? new Date(r.movement_at) : new Date()) + '"/></div>' +
      '<div class="fg" id="gs_cwrap"><label>Container number</label><input id="gs_con" value="' + esc(r.container_no) + '" autocapitalize="characters" autocomplete="off" placeholder="e.g. MSKU1234567"/></div></div>' +
      '<div class="form-row-2">' + f('gp', 'Gate pass number', r.gate_pass_no, 'autocomplete="off"') + '<div class="fg"><label id="gs_rellbl">' + officerLabel(dir) + '</label><input id="gs_rel" value="' + esc(officerOf(r) || r.released_by || r.received_by || (state.profile && state.profile.name) || '') + '" autocomplete="off"/></div></div>' +
      '<div id="gs_err" style="color:var(--red);font-size:12px;min-height:16px;margin-bottom:6px"></div>' +
      '<button class="submit-btn" id="gs_go" onclick="GateSec.save(' + (rec ? "'" + esc(rec.id) + "'" : '') + ')">' + (rec ? 'Save changes' : 'Save entry') + ' →</button>');
    G.dirChanged();
    setTimeout(() => { const v = $('gs_veh'); if (v && !rec) v.focus(); }, 80);
  }
  G.dirChanged = function () { const d = val('gs_dir') === 'out' ? 'out' : 'in', l = $('gs_rellbl'); if (l) l.textContent = officerLabel(d); const t = document.querySelector('#modalOverlay .modal-title, #modalTitle'); if (t && !/^Edit/.test(t.textContent)) t.textContent = d === 'out' ? 'Vehicle going out' : 'Vehicle coming in'; const c = $('gs_cwrap'); if (c) { const lb = c.querySelector('label'); if (lb) lb.textContent = d === 'out' ? 'Container number' : 'Container number (if any)'; } };
  G.add = function (dir, pre) { if (!can()) return toast('You do not have access to Gate Processes', 'error'); form(null, dir === 'out' ? 'out' : 'in', pre || null); };
  G.edit = function (id) { if (!canFix()) return toast('Only an administrator can correct a gate entry', 'error'); const r = S.rows.find(x => x.id === id); if (r) form(r); };

  G.save = async function (editId) {
    const err = $('gs_err'), go = $('gs_go');
    const dir = val('gs_dir') === 'out' ? 'out' : 'in';
    const rec = { direction: dir, vehicle_no: val('gs_veh'), trailer_no: val('gs_trl') || null, driver_name: val('gs_drv'), driver_id_number: val('gs_idn'),
      movement_at: val('gs_when') ? new Date(val('gs_when')).toISOString() : new Date().toISOString(),
      container_no: val('gs_con') || null, gate_pass_no: val('gs_gp') || null,
      released_by: dir === 'out' ? val('gs_rel') : null, received_by: dir === 'in' ? val('gs_rel') : null };
    const miss = [];
    if (!rec.vehicle_no) miss.push('vehicle number'); if (!rec.driver_name) miss.push("driver's name"); if (!rec.driver_id_number) miss.push('ID number');
    if (dir === 'out' && !rec.container_no) miss.push('container number'); if (!officerOf(rec)) miss.push(dir === 'out' ? 'releasing officer' : 'receiving officer');
    if (miss.length) { err.textContent = 'Please fill in: ' + miss.join(', ') + '.'; return; }
    if (isNaN(new Date(rec.movement_at).getTime())) { err.textContent = 'Check the date and time.'; return; }
    err.textContent = ''; go.disabled = true;
    try {
      if (editId) {
        const { error } = await sb().from(TABLE).update(rec).eq('id', editId);
        if (error) throw error;
        closeModal(); toast('Entry updated', 'success');
      } else {
        rec.id = uid(); rec.created_by = state.currentUser && state.currentUser.id;      // fixed id: a retry can never create a duplicate
        try {
          const { error } = await sb().from(TABLE).insert(rec);
          if (error && error.code !== '23505') throw error;
          closeModal(); toast('Gate entry saved: ' + rec.vehicle_no + (dir === 'in' ? ' in' : ' out'), 'success');
        } catch (e) {
          if (!isNetErr(e)) throw e;
          const q = qRead(); q.push(rec); qWrite(q);
          closeModal(); toast('No connection. Entry saved on this device and will be sent automatically.', 'warning', 5000);
        }
      }
      await G.reload(); if (window.GateDesk && GateDesk.refresh) GateDesk.refresh();
    } catch (e) {
      console.warn('Gate entry failed:', e);
      err.textContent = /row-level security|permission/i.test(String(e && e.message)) ? 'You are not allowed to save gate entries. Ask an administrator to tick Gate Processes for your account.' : ('Could not save: ' + ((e && e.message) || 'error'));
    } finally { if ($('gs_go')) $('gs_go').disabled = false; }
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