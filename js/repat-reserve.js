'use strict';

(function () {
  const $ = id => document.getElementById(id);
  const SEC = 'repatreserve';
  if (typeof ROLE_SIDEBAR === 'undefined' || typeof ALL_SIDEBAR_SECTIONS === 'undefined') return console.error('repat-reserve.js needs admin-ui-shell.js first');

  /* ── lists read from the old system's screens. Add more here later; the fields also accept typing a new value. ── */
  const DEFAULT_PORT = 'KEMBADKPA';
  const PORTS = [                          // port / point of dispatch code, place
    ['KELAU', 'Lamu'], ['KEMBA', 'Mombasa'], ['KEMBADKPA', 'Mombasa'], ['KEMBADMAH', 'Mombasa'],
    ['KENBO', 'Nairobi'], ['KENBOICD', 'Nairobi'], ['KERNA', 'Naivasha'], ['KETHK', 'Thika'],
  ];
  const SHIPPERS = [
    'AGL KENYA LIMITED', 'ALCOTT WIZ TRADING', 'BILATERAL SEMITE', 'BOLLORE', 'CLOFFIK FREIGHT [K] LTD', 'CRISPOLL EAST AFRICA',
  ];
  const LIST_LIMIT = 500, MAX_PASTE = 200, MAX_LEN = 120;

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

  /* ── register the page: access, title, section, button ── */
  if (ALL_SIDEBAR_SECTIONS.indexOf(SEC) < 0) ALL_SIDEBAR_SECTIONS.push(SEC);
  ['ops', 'clerk', 'dispatch'].forEach(r => { ROLE_SIDEBAR[r] = ROLE_SIDEBAR[r] || []; if (ROLE_SIDEBAR[r].indexOf(SEC) < 0) ROLE_SIDEBAR[r].push(SEC); });
  SECTION_META[SEC] = ['Container Ops', 'Reserve Repat'];

  function ensurePage() {
    if (!$('sec-' + SEC)) {
      const sec = document.createElement('section'); sec.className = 'section'; sec.id = 'sec-' + SEC;
      const ref = $('sec-gatesecurity') || $('sec-depops') || document.querySelector('.section');
      if (ref && ref.parentNode) ref.parentNode.insertBefore(sec, ref.nextSibling);
    }
    if (!document.querySelector('.nav-item[data-section="' + SEC + '"]')) {
      const ref = document.querySelector('.nav-item[data-section="prestaking"]') || document.querySelector('.nav-item[data-section="interchange"]');
      if (ref) {
        const b = document.createElement('button'); b.className = 'nav-item'; b.setAttribute('data-section', SEC); b.setAttribute('onclick', "showSection('" + SEC + "',this)");
        b.innerHTML = '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 9h10M7 13h6"/><path d="M15 16.5l1.8 1.8 3-3.3"/></svg> Reserve Repat';
        ref.parentNode.insertBefore(b, ref.nextSibling);
      }
    }
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
  }
  ensurePage();

  /* ── state ── */
  const S = { reserves: null, taken: new Map(), view: 'list', filter: 'open', sort: 'new', q: '', E: null, pick: null, busy: false, dirty: false, opening: false, at: null, truncated: false };
  const RR = window.RepatReserve = {};

  async function loadReserves() {
    const [a, b] = await Promise.all([
      supabase.from('repat_reserves_v').select('*').order('reserve_no', { ascending: false }).limit(LIST_LIMIT),
      supabase.from('repat_reserve_items').select('container_no,reserve_id').eq('active', true),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    S.reserves = a.data || [];
    S.truncated = S.reserves.length >= LIST_LIMIT;
    const no = new Map(S.reserves.map(r => [r.id, r.reserve_no]));
    S.taken = new Map((b.data || []).map(i => [norm(i.container_no), { id: i.reserve_id, no: no.get(i.reserve_id) }]));
    S.at = new Date();
  }

  /* ── shipping line of the agent, so containers of another line can be flagged ── */
  const lines = () => { try { return state.db.shippingLines || []; } catch (e) { return []; } };
  const agentLine = agent => { const k = norm(agent); return k ? (lines().find(l => norm(l.name) === k || norm(l.code) === k) || null) : null; };
  const lineCode = id => { const l = lines().find(x => x.id === id); return l ? (l.code || l.name) : ''; };
  const otherLine = (c, agent) => { const al = agentLine(agent); return !!(al && c._line && c._line !== al.id); };

  /* ── page ── */
  async function render() {
    ensurePage();
    const root = $('sec-' + SEC); if (!root) return;
    if (!S.reserves) root.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading reserves…</div></div>';
    try { if (navigator.onLine) await loadReserves(); else if (!S.reserves) throw new Error('You are offline. Reserves load when the connection returns.'); }
    catch (e) {
      if (!S.reserves) { root.innerHTML = '<div class="empty-state"><div class="empty-state-label">Could not load reserves: ' + esc(fail(e)) + '<br>If this is the first use, run sql/repat-reserve.sql in Supabase.</div></div>'; return; }
      try { toast('Could not refresh: ' + fail(e), 'error', 5000); } catch (x) {}
    }
    if (S.view === 'edit' && S.E) renderEditor(); else { S.view = 'list'; renderList(); }
  }

  /* ── list ── */
  function badge(r) {
    if (r.closed) return '<span class="hb hb-r">Closed</span>';
    if (total(r) > 0 && balance(r) === 0) return '<span class="hb hb-g">Complete</span>';
    const t = runEnd(r);
    if (t && t < new Date()) return '<span class="rr-b rr-red">Overdue</span>';
    if (t && t - Date.now() < 864e5) return '<span class="rr-b rr-amb">Ends soon</span>';
    return '<span class="hb hb-g">Open</span>';
  }
  const isOverdue = r => { const t = runEnd(r); return !r.closed && balance(r) > 0 && t && t < new Date(); };
  function filtered() {
    const q = lc(S.q);
    const rows = (S.reserves || []).filter(r => {
      if (S.filter === 'open' && r.closed) return false;
      if (S.filter === 'closed' && !r.closed) return false;
      if (S.filter === 'overdue' && !isOverdue(r)) return false;
      return !q || [r.reserve_no, r.agent, r.shipper_name, r.vessel, r.voyage, r.destination, r.release_order_no, r.shipper_order, r.port_of_dispatch].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (S.sort === 'ends') rows.sort((a, b) => ((runEnd(a) || 8e15) - 0) - ((runEnd(b) || 8e15) - 0));
    return rows;
  }
  function renderList() {
    const root = $('sec-' + SEC); if (!root) return;
    const all = S.reserves || [], open = all.filter(r => !r.closed);
    const held = open.reduce((n, r) => n + balance(r), 0), late = all.filter(isOverdue).length;
    const tabs = [['open', 'Open'], ['overdue', 'Overdue'], ['closed', 'Closed'], ['all', 'All']].map(t => `<button class="filter-btn${S.filter === t[0] ? ' active' : ''}" data-f="${t[0]}" onclick="RepatReserve.setFilter('${t[0]}')">${t[1]}</button>`).join('');
    root.innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title">Reserved repat containers</div>
      <div class="panel-meta">${canWrite() ? '<button class="action-btn" onclick="RepatReserve.openNew()">+ New reserve</button>' : 'View only'}</div></div>
      <div class="rr-sum"><div class="rr-count"><b>${open.length}</b><span>Open reserves</span></div><div class="rr-count wait"><b>${held}</b><span>Containers still held</span></div><div class="rr-count ${late ? 'bad' : ''}"><b>${late}</b><span>Overdue with balance</span></div></div>
      <div class="rr-tools">${tabs}<input type="search" id="rrSearch" placeholder="Search number, agent, shipper, vessel, release order…" value="${esc(S.q)}" oninput="RepatReserve.search(this.value)">
        <select id="rrSort" onchange="RepatReserve.setSort(this.value)" aria-label="Sort"><option value="new"${S.sort === 'new' ? ' selected' : ''}>Newest first</option><option value="ends"${S.sort === 'ends' ? ' selected' : ''}>Run ends soonest</option></select>
        <button class="action-btn ghost" onclick="RepatReserve.refresh()" title="Reload from the server">↻ Refresh</button><button class="action-btn ghost" onclick="RepatReserve.exportList()">⬇ CSV</button></div>
      <div id="rrTable"></div>
      <p class="rr-note">${S.at ? 'Updated ' + pad(S.at.getHours()) + ':' + pad(S.at.getMinutes()) + '. ' : ''}${S.truncated ? 'Showing the latest ' + LIST_LIMIT + ' reserves.' : ''}</p></div>`;
    paintTable();
  }
  function paintTable() {
    const host = $('rrTable'); if (!host) return;
    const rows = filtered();
    document.querySelectorAll('#sec-' + SEC + ' .rr-tools .filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-f') === S.filter));
    host.innerHTML = rows.length ? `<div style="overflow:auto"><table class="data-table rr-list"><thead><tr><th>No.</th><th>Agent</th><th>Shipper</th><th>Vessel / voyage</th><th>Destination</th><th>Run ends</th><th>Total</th><th>Cleared</th><th>Balance</th><th></th></tr></thead><tbody>${rows.map(r => `<tr class="rr-row" tabindex="0" onkeydown="if(event.key==='Enter')RepatReserve.open('${r.id}')" onclick="RepatReserve.open('${r.id}')"><td><b>${esc(r.reserve_no)}</b></td><td>${esc(r.agent)}</td><td>${esc(r.shipper_name)}</td><td>${esc(r.vessel)} ${esc(r.voyage)}</td><td>${esc(r.destination)}</td><td>${esc(ymd(r.run_end_date))} ${esc(hhmm(r.run_end_time))}</td><td>${total(r)}</td><td>${cleared(r)}</td><td>${balance(r)}</td><td>${badge(r)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty-state"><div class="empty-state-label">' + (S.q || S.filter !== 'all' ? 'No reserves match.' : canWrite() ? 'No reserves here yet. Choose New reserve to hold containers for a shipping line.' : 'No reserves to show.') + '</div></div>';
  }
  RR.setFilter = f => { S.filter = f; paintTable(); };
  RR.setSort = v => { S.sort = v; paintTable(); };
  let st;
  RR.search = v => { S.q = v; clearTimeout(st); st = setTimeout(paintTable, 200); };
  RR.refresh = async () => { try { await loadReserves(); renderList(); } catch (e) { toast('Could not refresh: ' + fail(e), 'error', 5000); } };

  function download(name, rows) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = (typeof ghCsvPreamble === 'function' ? ghCsvPreamble('\n') : '') + rows.map(r => r.map(q).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  RR.exportList = () => {
    const rows = filtered(); if (!rows.length) return toast('Nothing to download', 'error');
    download('repat-reserves-' + today() + '.csv', [['Reserve No', 'Agent', 'Shipper', 'Vessel', 'Voyage', 'Destination', 'Release Order', "Shipper's Order", 'Port of Dispatch', 'Outward Date', 'Run End', 'Total', 'Cleared', 'Balance', 'Status']]
      .concat(rows.map(r => [r.reserve_no, r.agent, r.shipper_name, r.vessel, r.voyage, r.destination, r.release_order_no, r.shipper_order, r.port_of_dispatch, ymd(r.outward_date), ymd(r.run_end_date) + ' ' + hhmm(r.run_end_time), total(r), cleared(r), balance(r), r.closed ? 'Closed' : isOverdue(r) ? 'Overdue' : 'Open'])));
  };
  RR.exportOne = () => {
    const E = S.E; if (!E || !E.items.length) return toast('No containers to download', 'error');
    const h = E.head;
    download('repat-reserve-' + (E.reserve_no || 'new') + '.csv', [['Reserve No', 'Agent', 'Shipper', 'Vessel', 'Voyage', 'Destination', 'Release Order', "Shipper's Order", 'Port of Dispatch', 'Outward Date', 'Run End', 'In EIR', 'Container', 'Size', 'Cleared']]
      .concat(E.items.map(i => [E.reserve_no || '', h.agent, h.shipper_name, h.vessel, h.voyage, h.destination, h.release_order_no, h.shipper_order, h.port_of_dispatch, h.outward_date, h.run_end_date + ' ' + h.run_end_time, i.in_eir || '', i.container_no, i.size || '', i.cleared ? 'Yes' : 'No'])));
  };

  /* ── editor ── */
  const blankHead = () => ({ agent: '', outward_date: today(), run_end_date: today(), run_end_time: '23:59', destination: '', vessel: '', voyage: '', release_order_no: '', shipper_order: '', shipper_name: '', port_of_dispatch: DEFAULT_PORT });
  const confirmLeave = () => !(S.view === 'edit' && S.dirty) || confirm('You have unsaved changes on this reserve. Leave without saving?');
  const markDirty = () => { if (S.dirty) return; S.dirty = true; const t = $('rrDirty'); if (t) t.hidden = false; };
  RR.markDirty = markDirty;
  window.addEventListener('beforeunload', e => { if (S.view === 'edit' && S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  RR.openNew = () => {
    if (!canWrite()) return toast('Only an administrator can reserve containers', 'error');
    S.E = { id: null, closed: false, head: blankHead(), items: [], reserve_no: null };
    S.view = 'edit'; S.pick = null; S.dirty = false; renderEditor(true);
  };
  RR.open = async id => {
    if (S.opening) return;
    const r = (S.reserves || []).find(x => x.id === id); if (!r) return;
    if (!navigator.onLine) return toast('You are offline. A reserve opens when the connection returns.', 'error', 5000);
    S.opening = true;
    try {
      const { data, error } = await supabase.from('repat_reserve_items').select('*').eq('reserve_id', id).order('in_eir');
      if (error) throw error;
      S.E = { id, closed: !!r.closed, reserve_no: r.reserve_no, head: { agent: r.agent || '', outward_date: ymd(r.outward_date), run_end_date: ymd(r.run_end_date), run_end_time: hhmm(r.run_end_time) || '23:59', destination: r.destination || '', vessel: r.vessel || '', voyage: r.voyage || '', release_order_no: r.release_order_no || '', shipper_order: r.shipper_order || '', shipper_name: r.shipper_name || '', port_of_dispatch: r.port_of_dispatch || '' }, items: data || [] };
      S.view = 'edit'; S.pick = null; S.dirty = false; renderEditor(true);
    } catch (e) { toast(fail(e), 'error', 5000); }
    S.opening = false;
  };
  RR.back = () => { if (!confirmLeave()) return; S.view = 'list'; S.E = null; S.pick = null; S.dirty = false; render(); };

  const agentNames = () => lines().filter(l => l.active !== false).map(l => l.name).filter(Boolean);
  const opts = (list, cur) => list.concat(cur && list.indexOf(cur) < 0 ? [cur] : []).map(v => `<option value="${esc(v)}">`).join('');

  function readHead() {
    if (!S.E) return;
    const h = S.E.head;
    Object.keys(h).forEach(k => { const el = $('rr_' + k); if (el) h[k] = el.value.trim(); });
  }
  function renderEditor(fresh) {
    const root = $('sec-' + SEC); if (!root || !S.E) return;
    if (!fresh && $('rr_agent')) readHead();           // keep whatever was typed before redrawing (not when a different reserve was just loaded)
    const E = S.E, h = E.head, ro = !canWrite() || E.closed, dis = ro ? ' disabled' : '';
    const nCleared = E.items.filter(i => i.cleared).length, n = E.items.length;
    const f = (id, label, type, ex) => `<div class="fg"><label>${label}</label><input id="rr_${id}" type="${type || 'text'}" maxlength="${MAX_LEN}" value="${esc(h[id])}"${dis}${ex || ''}></div>`;
    const al = agentLine(h.agent);
    root.innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title"><button class="action-btn ghost" onclick="RepatReserve.back()">← All reserves</button>
      &nbsp; Reserve ${E.reserve_no ? '#' + esc(E.reserve_no) : '(new, number is given on save)'} ${E.closed ? '<span class="hb hb-r">Closed</span>' : ''}<span class="rr-dirty" id="rrDirty"${S.dirty ? '' : ' hidden'}>● Unsaved changes</span></div>
      <div class="panel-meta">${n ? '<button class="action-btn ghost" onclick="RepatReserve.exportOne()">⬇ CSV</button>' : ''}${E.id && canWrite() ? `<button class="action-btn ghost" onclick="RepatReserve.toggleClosed()">${E.closed ? 'Reopen' : 'Close reserve'}</button><button class="action-btn ghost" onclick="RepatReserve.remove()">Delete</button>` : ''}</div></div>
      <div class="rr-grid"><div class="rr-form">
        <div class="fg"><label>Agent (shipping line) *</label><input id="rr_agent" list="rrAgents" maxlength="${MAX_LEN}" value="${esc(h.agent)}"${dis} onchange="RepatReserve.agentChanged()"><datalist id="rrAgents">${opts(agentNames(), h.agent)}</datalist></div>
        <div class="rr-two">${f('outward_date', 'Repat outward date *', 'date')}${f('run_end_date', 'Repat run end date *', 'date')}</div>
        ${f('run_end_time', 'Repat run end time *', 'time')}
        ${f('destination', 'Destination *')}
        <div class="rr-two">${f('vessel', 'Vessel *')}${f('voyage', 'Voyage *')}</div>
        <div class="rr-two">${f('release_order_no', 'Release order no. *')}${f('shipper_order', "Shipper's order *")}</div>
        <div class="fg"><label>Shipper's name *</label><input id="rr_shipper_name" list="rrShippers" maxlength="${MAX_LEN}" value="${esc(h.shipper_name)}"${dis}><datalist id="rrShippers">${opts(SHIPPERS, h.shipper_name)}</datalist></div>
        <div class="fg"><label>Port of dispatch *</label><input id="rr_port_of_dispatch" list="rrPorts" maxlength="${MAX_LEN}" value="${esc(h.port_of_dispatch)}"${dis}><datalist id="rrPorts">${PORTS.map(p => `<option value="${esc(p[0])}">${esc(p[1])}</option>`).join('')}</datalist></div>
        <div class="rr-err" id="rrErr" role="alert"></div>
        ${ro ? (E.closed ? '<p class="rr-note">This reserve is closed. Reopen it to change it.</p>' : '') : `<button class="action-btn" id="rrSave" onclick="RepatReserve.save()">${E.id ? 'Save changes' : 'Save reserve'}</button>`}
      </div><div>
        <div class="rr-counts"><div class="rr-count"><b>${n}</b><span>Total</span></div><div class="rr-count ok"><b>${nCleared}</b><span>Cleared</span></div><div class="rr-count wait"><b>${n - nCleared}</b><span>Balance</span></div></div>
        ${!ro && h.agent && !al ? '<p class="rr-note">This agent is not in the shipping lines list, so containers cannot be checked against its line.</p>' : ''}
        ${ro ? '' : `<div class="rr-tools"><button class="action-btn" onclick="RepatReserve.openPicker()">+ Add from yard</button><button class="action-btn ghost" onclick="RepatReserve.openPaste()">Paste a list</button></div><div id="rrPicker"></div>`}
        ${n ? `<div style="overflow:auto;max-height:420px"><table class="data-table"><thead><tr><th>In EIR</th><th>Container</th><th>Size</th><th>Cleared</th>${ro ? '' : '<th></th>'}</tr></thead><tbody>${E.items.map((i, k) => `<tr><td>${esc(i.in_eir || '')}</td><td>${esc(i.container_no)}${otherLine(i, h.agent) && !i._ok ? ' <span class="rr-b rr-amb" title="Belongs to another shipping line">other line</span>' : ''}</td><td>${esc(i.size || '')}</td><td>${E.id && i.id && canWrite() ? `<input type="checkbox" ${i.cleared ? 'checked' : ''} onchange="RepatReserve.clearOne(${k},this.checked)">` : (i.cleared ? 'Yes' : '')}</td>${ro ? '' : `<td>${i.cleared ? '' : `<button class="action-btn ghost" onclick="RepatReserve.drop(${k})">Remove</button>`}</td>`}</tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><div class="empty-state-label">No containers on this reserve yet.</div></div>'}
      </div></div></div>`;
    const form = root.querySelector('.rr-form'); if (form && !ro) form.addEventListener('input', markDirty);
    if (S.pick) paintPicker();
  }
  RR.agentChanged = () => { readHead(); markDirty(); renderEditor(); };
  RR.drop = k => { readHead(); const i = S.E.items[k]; if (i && !i.cleared) { S.E.items.splice(k, 1); markDirty(); renderEditor(); } };

  /* ── save ── */
  function validate(h) {
    const need = { agent: 'Agent', outward_date: 'Outward date', run_end_date: 'Run end date', run_end_time: 'Run end time', destination: 'Destination', vessel: 'Vessel', voyage: 'Voyage', release_order_no: 'Release order no.', shipper_order: "Shipper's order", shipper_name: "Shipper's name", port_of_dispatch: 'Port of dispatch' };
    const miss = Object.keys(need).filter(k => !h[k]);
    if (miss.length) return 'Fill in: ' + miss.map(k => need[k]).join(', ') + '.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h.outward_date) || !/^\d{4}-\d{2}-\d{2}$/.test(h.run_end_date)) return 'Check the dates: use the date picker.';
    if (!/^\d{2}:\d{2}/.test(h.run_end_time)) return 'Check the run end time.';
    if (h.run_end_date < h.outward_date) return 'The run end date is before the outward date.';
    const long = Object.keys(h).find(k => String(h[k]).length > MAX_LEN);
    if (long) return need[long] + ' is too long (' + MAX_LEN + ' characters at most).';
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
    const E = S.E, h = E.head, err = $('rrErr'), btn = $('rrSave');
    const say = (m, html) => { if (err) { if (html) err.innerHTML = m; else err.textContent = m; } };
    const lock = on => { S.busy = on; if (btn) btn.disabled = on; };
    say('');
    const bad = validate(h); if (bad) return say(bad);
    if (!E.items.length) return say('Add at least one container.');
    if (!navigator.onLine) return say('You are offline. Reserve again when the connection returns.');
    lock(true);
    try {
      /* the picker may have been open for a while: re-read what is held right now */
      await loadReserves();
      const clash = E.items.filter(i => { const t = S.taken.get(norm(i.container_no)); return t && t.id !== E.id; });
      if (clash.length) {
        const list = clash.slice(0, 8).map(i => esc(i.container_no) + ' (#' + esc(S.taken.get(norm(i.container_no)).no) + ')').join(', ') + (clash.length > 8 ? ' and ' + (clash.length - 8) + ' more' : '');
        say('Already held by another open reserve: ' + list + '. <button class="action-btn ghost" type="button" onclick="RepatReserve.dropClashing()">Remove them</button>', true);
        return lock(false);
      }
      const dupRo = (S.reserves || []).find(r => r.id !== E.id && !r.closed && lc(r.release_order_no) === lc(h.release_order_no));
      if (dupRo && !confirm('Release order ' + h.release_order_no + ' is already on open reserve #' + dupRo.reserve_no + '. Save anyway?')) return lock(false);
      if (!E.id && !E.closed && new Date(h.run_end_date + 'T' + h.run_end_time.slice(0, 5)) < new Date() && !confirm('The run end date and time have already passed. Reserve anyway?')) return lock(false);
      const odd = E.items.filter(i => otherLine(i, h.agent) && !i._ok);
      if (odd.length) {
        if (!confirm(odd.length + ' container' + (odd.length === 1 ? ' belongs' : 's belong') + ' to a different shipping line than ' + h.agent + ':\n' + odd.slice(0, 6).map(i => i.container_no).join(', ') + (odd.length > 6 ? ' …' : '') + '\n\nSave anyway?')) return lock(false);
        odd.forEach(i => { i._ok = true; });
      }
      const { data, error } = await supabase.rpc('repat_reserve_save', { p_id: E.id, p_head: h, p_items: E.items.map(i => ({ container_no: i.container_no, in_eir: i.in_eir || '', size: i.size || '' })) });
      if (error) throw error;
      if (!data || !data.id) throw new Error('The server did not confirm the save. Check the reserve list before trying again.');
      audit('Repat reserve saved', '#' + data.reserve_no + ' · ' + E.items.length + ' containers · ' + h.agent);
      toast('Reserve #' + data.reserve_no + ' saved', 'success');
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
    if (!confirm(E.closed ? 'Reopen reserve #' + E.reserve_no + '? Its containers are held again, if no other reserve has taken them meanwhile.' : 'Close reserve #' + E.reserve_no + '?' + (left ? '\n' + left + ' uncleared container' + (left === 1 ? ' is' : 's are') + ' released for other reserves.' : ''))) return;
    S.busy = true;
    try {
      const { error } = await supabase.rpc('repat_reserve_close', { p_id: E.id, p_closed: !E.closed });
      if (error) throw error;
      audit(E.closed ? 'Repat reserve reopened' : 'Repat reserve closed', '#' + E.reserve_no);
      S.dirty = false; S.busy = false;
      try { await loadReserves(); } catch (x) { /* changed on the server; the list refreshes on the next visit */ }
      return RR.open(E.id);
    } catch (e) { toast(fail(e), 'error', 6000); }
    S.busy = false;
  };
  RR.remove = async () => {
    const E = S.E; if (!E || !E.id || !canWrite() || S.busy) return;
    const done = E.items.filter(i => i.cleared).length;
    if (done) {
      const a = prompt('Reserve #' + E.reserve_no + ' has ' + done + ' cleared container' + (done === 1 ? '' : 's') + '. Deleting it removes that record. Closing is usually better.\n\nType the reserve number to delete it anyway:');
      if (a === null) return;
      if (String(a).trim().replace(/^#/, '') !== String(E.reserve_no)) return toast('Reserve number did not match. Nothing was deleted.', 'info', 4000);
    } else if (!confirm('Delete reserve #' + E.reserve_no + '? This cannot be undone.')) return;
    S.busy = true;
    try {
      const { error } = await supabase.rpc('repat_reserve_delete', { p_id: E.id });
      if (error) throw error;
      audit('Repat reserve deleted', '#' + E.reserve_no);
      toast('Reserve deleted', 'success'); S.busy = false; S.dirty = false; return RR.back();
    } catch (e) { toast(fail(e), 'error', 6000); }
    S.busy = false;
  };
  RR.clearOne = async (k, on) => {
    const E = S.E, i = E && E.items[k]; if (!i || !canWrite() || S.busy) return;
    readHead();
    if (!on && !confirm('Mark ' + i.container_no + ' as NOT cleared? Do this only to correct a mistake.')) return renderEditor();
    if (!navigator.onLine) { toast('You are offline. Try again when the connection returns.', 'error', 4000); return renderEditor(); }
    S.busy = true;
    try {
      const { error } = await supabase.rpc('repat_reserve_clear', { p_id: E.id, p_containers: [i.container_no], p_cleared: on });
      if (error) throw error;
      i.cleared = on; audit(on ? 'Repat container cleared' : 'Repat container un-cleared', '#' + E.reserve_no + ' · ' + i.container_no);
      await loadReserves();
    } catch (e) { toast(fail(e), 'error', 6000); }
    S.busy = false; renderEditor();
  };

  /* ── picking containers from the yard ── */
  const PAGE = 30;
  async function yardPage(q, offset) {
    if (window.ICR && ICR.enabled) { const r = await ICR.yard({ q: q || null, limit: PAGE, offset }); return { total: r.total, items: r.items }; }
    const idx = window.icOutIndex ? window.icOutIndex() : null, qq = norm(q);
    const all = ((state.db && state.db.interchange) || []).filter(i => window.icInYard(i, idx) && (!qq || norm(i.container).indexOf(qq) >= 0 || norm(i.eirNumber).indexOf(qq) >= 0))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return { total: all.length, items: all.slice(offset, offset + PAGE) };
  }
  const rowInfo = ic => ({
    container_no: String(ic.container || '').trim().toUpperCase(), in_eir: ic.eirNumber || '', size: sizeOf(ic.ctype), type: ic.ctype || '', _line: ic.line || '',
    survey: ic.surveyStatus || '', dmg: (ic.repairs && ic.repairs.length) || 0, days: Math.max(0, Math.floor((Date.now() - new Date(ic.date).getTime()) / 864e5)),
  });
  const waitingSurvey = c => c.survey === 'awaiting_survey' || c.survey === 'escalated';

  RR.openPicker = () => { readHead(); S.pick = { mode: 'yard', q: '', items: [], total: 0, sel: new Map(), busy: false }; paintPicker(); loadPick(true); };
  RR.openPaste = () => { readHead(); S.pick = { mode: 'paste', msg: '', left: '', report: [] }; paintPicker(); };
  async function loadPick(reset) {
    const P = S.pick; if (!P || P.mode !== 'yard' || P.busy) return;
    P.busy = true; P.err = ''; if (reset) { P.items = []; P.total = 0; } paintPicker();
    try { const r = await yardPage(P.q, P.items.length); P.items = P.items.concat(r.items.map(rowInfo)); P.total = r.total; }
    catch (e) { P.err = fail(e); }
    P.busy = false; paintPicker();
  }
  function paintPicker() {
    const host = $('rrPicker'), P = S.pick; if (!host) return;
    if (!P) { host.innerHTML = ''; return; }
    if (P.mode === 'paste') {
      host.innerHTML = `<div class="panel" style="padding:12px"><div class="panel-title" style="margin-bottom:6px">Paste container numbers</div>
        <textarea id="rrPaste" rows="5" style="width:100%" placeholder="One per line, or separated by spaces or commas">${esc(P.left || '')}</textarea>
        <p class="rr-note">Each number is checked against the yard. Containers that are not in the yard, or are held by another open reserve, are listed with the reason and skipped. Skipped numbers stay in the box so you can fix them.</p>
        <div class="rr-err" id="rrPasteMsg">${esc(P.msg || '')}</div>
        ${P.report && P.report.length ? `<ul class="rr-report">${P.report.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>` : ''}
        <div class="rr-tools"><button class="action-btn" id="rrPasteGo" onclick="RepatReserve.addPasted()">Check and add</button><button class="action-btn ghost" onclick="RepatReserve.closePicker()">Cancel</button></div></div>`;
      return;
    }
    const have = new Set(S.E.items.map(i => norm(i.container_no))), agent = S.E.head.agent, al = agentLine(agent);
    host.innerHTML = `<div class="panel" style="padding:12px"><div class="rr-tools"><input type="search" id="rrPq" placeholder="Search container or EIR no." value="${esc(P.q)}" oninput="RepatReserve.pickSearch(this.value)">
      <button class="action-btn ghost" onclick="RepatReserve.pickAll()">Select all shown</button><button class="action-btn" id="rrAddSel" onclick="RepatReserve.addPicked()">Add selected (${P.sel.size})</button><button class="action-btn ghost" onclick="RepatReserve.closePicker()">Close</button></div>
      ${al ? `<p class="rr-note" style="margin:0 0 6px">Agent line: <b>${esc(al.code || al.name)}</b>. Containers of other lines are marked.</p>` : ''}
      <div class="rr-pick">${P.items.map((c, n) => {
        const key = norm(c.container_no), t = S.taken.get(key), dup = have.has(key), off = !!t || dup, odd = al && c._line && c._line !== al.id;
        const flags = [odd ? '<span class="rr-warn">Line ' + esc(lineCode(c._line) || '?') + '</span>' : '', waitingSurvey(c) ? '<span class="rr-warn">Awaiting survey</span>' : '', c.dmg ? '<span class="rr-warn">' + c.dmg + ' damage item' + (c.dmg > 1 ? 's' : '') + '</span>' : ''].filter(Boolean).join(' · ');
        return `<label class="${off ? 'off' : ''}"><input type="checkbox" ${off ? 'disabled' : ''} ${P.sel.has(key) ? 'checked' : ''} onchange="RepatReserve.pickToggle(${n},this.checked)"><b>${esc(c.container_no)}</b><span>${esc(c.type)}</span><span class="rr-m">EIR ${esc(c.in_eir || '-')} · ${c.days} d in yard${flags ? '<br>' + flags : ''}${t ? '<br>Reserved on #' + esc(t.no) : (dup ? '<br>Already on this reserve' : '')}</span></label>`;
      }).join('') || (P.busy ? '' : '<div class="empty-state"><div class="empty-state-label">' + (P.err ? esc(P.err) : 'No containers in the yard match.') + '</div></div>')}
      ${P.items.length < P.total ? '<div style="padding:8px;text-align:center"><button class="action-btn ghost" onclick="RepatReserve.pickMore()">Load more</button></div>' : ''}</div>
      <p class="rr-note">${P.busy ? 'Loading…' : 'Showing ' + P.items.length + ' of ' + P.total + ' in the yard, oldest first.'}</p></div>`;
  }
  let pt;
  RR.pickSearch = v => { const P = S.pick; if (!P) return; P.q = v.trim(); clearTimeout(pt); pt = setTimeout(() => { loadPick(true).then(() => { const i = $('rrPq'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }); }, 300); };
  RR.pickMore = () => loadPick(false);
  function paintPickerCount() { const b = $('rrAddSel'); if (b && S.pick) b.textContent = 'Add selected (' + S.pick.sel.size + ')'; }
  RR.pickToggle = (n, on) => { const P = S.pick, c = P && P.items[n]; if (!c) return; const k = norm(c.container_no); if (on) P.sel.set(k, c); else P.sel.delete(k); paintPickerCount(); };
  RR.pickAll = () => {
    const P = S.pick; if (!P) return;
    const have = new Set(S.E.items.map(i => norm(i.container_no)));
    P.items.forEach(c => { const k = norm(c.container_no); if (!S.taken.has(k) && !have.has(k)) P.sel.set(k, c); });
    paintPicker();
  };
  const toItem = (c, ok) => ({ container_no: c.container_no, in_eir: c.in_eir, size: c.size, cleared: false, _line: c._line, _ok: !!ok });
  RR.addPicked = () => {
    const P = S.pick; if (!P || !P.sel.size) return toast('Tick the containers to add', 'info');
    readHead();
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

  /* split on lines, commas, semicolons; a piece with spaces or dashes inside that is one 11-character number stays one container */
  function parseNumbers(text) {
    const out = [];
    String(text || '').split(/[\r\n,;\t]+/).forEach(piece => {
      const whole = norm(piece); if (!whole) return;
      if (whole.length === 11) out.push(whole); else piece.split(/\s+/).forEach(x => { const k = norm(x); if (k) out.push(k); });
    });
    return Array.from(new Set(out));
  }
  RR.addPasted = async () => {
    const ta = $('rrPaste'), msg = $('rrPasteMsg'), go = $('rrPasteGo'); if (!ta) return;
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
          const t = S.taken.get(k); if (t) return skipped.push([k, 'held by reserve #' + t.no]);
          let rows = [];
          try {
            if (window.ICR && ICR.enabled) rows = await ICR.byContainer(k);
            else rows = ((state.db.interchange) || []).filter(r => norm(r.container) === k);
          } catch (e) { return skipped.push([k, 'could not be checked (' + fail(e) + ')']); }
          if (!rows.length) return skipped.push([k, 'not found. Check the number']);
          const live = rows.filter(r => r.type === 'Gate-In' || r.type === 'Depot-In').filter(r => r._inYard !== undefined ? r._inYard : window.icInYard(r, idx))
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          if (!live) return skipped.push([k, 'not in the yard (already left)']);
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

  sectionRenderers[SEC] = render;
})();