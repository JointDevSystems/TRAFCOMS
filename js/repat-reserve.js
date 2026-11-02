'use strict';
/* Gargo Reserve Repat.
   A shipping line asks for N empty containers to be repatriated. A super user (administrator) reserves them here:
   fills the header once, picks the containers straight from the yard list (or pastes a list), saves. Everyone else
   who can open the page sees the reserves read-only.
   Standalone on purpose: it does not touch Interchange, Outward or Dispatch. It only READS the yard list.
   Needs: sql/repat-reserve.sql run once in Supabase.
   Load order: after roles-desk.js, BEFORE nav-shell.js (so the page button exists when the sidebar is built). */
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

  const canWrite = () => { try { return isAdmin(); } catch (e) { return false; } };
  const norm = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sizeOf = t => { const m = /^(\d{2})/.exec(String(t || '').trim()); return m ? m[1] : ''; };
  const today = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const fail = e => (e && (e.message || e.details)) || 'Something went wrong';

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
      .rr-count.ok b{color:var(--green)}.rr-count.wait b{color:var(--amber)}
      .rr-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
      .rr-tools input[type=text],.rr-tools input[type=search]{flex:1;min-width:160px}
      .rr-pick{max-height:360px;overflow:auto;border:1px solid var(--border,rgba(128,128,128,.28));border-radius:10px;margin-top:8px}
      .rr-pick label{display:flex;gap:10px;align-items:center;padding:7px 10px;border-bottom:1px solid var(--border,rgba(128,128,128,.16));cursor:pointer;font-size:13px}
      .rr-pick label.off{opacity:.45;cursor:not-allowed}
      .rr-pick .rr-m{margin-left:auto;font-size:11px;color:var(--text-3);text-align:right}
      .rr-note{font-size:12px;color:var(--text-3);margin:6px 0 0}
      .rr-err{color:var(--red);font-size:12px;min-height:16px;margin-top:6px}
      .rr-list tr.rr-row{cursor:pointer}`;
      document.head.appendChild(st);
    }
  }
  ensurePage();

  /* ── state ── */
  const S = { reserves: null, taken: new Map(), view: 'list', filter: 'open', q: '', E: null, pick: null, busy: false };
  const RR = window.RepatReserve = {};

  async function loadReserves() {
    const [a, b] = await Promise.all([
      supabase.from('repat_reserves_v').select('*').order('reserve_no', { ascending: false }).limit(500),
      supabase.from('repat_reserve_items').select('container_no,reserve_id').eq('active', true),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    S.reserves = a.data || [];
    const no = new Map(S.reserves.map(r => [r.id, r.reserve_no]));
    S.taken = new Map((b.data || []).map(i => [norm(i.container_no), { id: i.reserve_id, no: no.get(i.reserve_id) }]));
  }

  /* ── page ── */
  async function render() {
    ensurePage();
    const root = $('sec-' + SEC); if (!root) return;
    if (!S.reserves) root.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading reserves…</div></div>';
    try { if (navigator.onLine) await loadReserves(); else if (!S.reserves) throw new Error('You are offline. Reserves load when the connection returns.'); }
    catch (e) { root.innerHTML = '<div class="empty-state"><div class="empty-state-label">Could not load reserves: ' + esc(fail(e)) + '<br>If this is the first use, run sql/repat-reserve.sql in Supabase.</div></div>'; return; }
    if (S.view === 'edit' && S.E) renderEditor(); else { S.view = 'list'; renderList(); }
  }

  function renderList() {
    const root = $('sec-' + SEC), q = S.q.trim().toLowerCase();
    const rows = (S.reserves || []).filter(r => (S.filter === 'all' || (S.filter === 'closed' ? r.closed : !r.closed)) &&
      (!q || [r.reserve_no, r.agent, r.shipper_name, r.vessel, r.voyage, r.destination, r.release_order_no, r.shipper_order].join(' ').toLowerCase().indexOf(q) >= 0));
    const tabs = [['open', 'Open'], ['closed', 'Closed'], ['all', 'All']].map(t => `<button class="filter-btn${S.filter === t[0] ? ' active' : ''}" onclick="RepatReserve.setFilter('${t[0]}')">${t[1]}</button>`).join('');
    root.innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title">Reserved repat containers</div>
      <div class="panel-meta">${canWrite() ? '<button class="action-btn" onclick="RepatReserve.openNew()">+ New reserve</button>' : 'View only'}</div></div>
      <div class="rr-tools">${tabs}<input type="search" id="rrSearch" placeholder="Search number, agent, shipper, vessel, release order…" value="${esc(S.q)}" oninput="RepatReserve.search(this.value)"></div>
      ${rows.length ? `<div style="overflow:auto"><table class="data-table rr-list"><thead><tr><th>No.</th><th>Agent</th><th>Shipper</th><th>Vessel / voyage</th><th>Destination</th><th>Run ends</th><th>Total</th><th>Cleared</th><th>Balance</th><th></th></tr></thead><tbody>${rows.map(r => {
        const t = Number(r.total) || 0, c = Number(r.cleared) || 0;
        return `<tr class="rr-row" onclick="RepatReserve.open('${r.id}')"><td><b>${esc(r.reserve_no)}</b></td><td>${esc(r.agent)}</td><td>${esc(r.shipper_name)}</td><td>${esc(r.vessel)} ${esc(r.voyage)}</td><td>${esc(r.destination)}</td><td>${esc(r.run_end_date)} ${esc(String(r.run_end_time).slice(0, 5))}</td><td>${t}</td><td>${c}</td><td>${t - c}</td><td>${r.closed ? '<span class="hb hb-r">Closed</span>' : '<span class="hb hb-g">Open</span>'}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="empty-state"><div class="empty-state-label">' + (canWrite() ? 'No reserves here yet. Choose New reserve to hold containers for a shipping line.' : 'No reserves to show.') + '</div></div>'}</div>`;
  }
  RR.setFilter = f => { S.filter = f; renderList(); };
  let st;
  RR.search = v => { S.q = v; clearTimeout(st); st = setTimeout(() => { renderList(); const i = $('rrSearch'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 200); };

  /* ── editor ── */
  RR.openNew = () => {
    if (!canWrite()) return toast('Only an administrator can reserve containers', 'error');
    S.E = { id: null, closed: false, head: { agent: '', outward_date: today(), run_end_date: today(), run_end_time: '23:59', destination: '', vessel: '', voyage: '', release_order_no: '', shipper_order: '', shipper_name: '', port_of_dispatch: DEFAULT_PORT }, items: [], reserve_no: null };
    S.view = 'edit'; S.pick = null; renderEditor();
  };
  RR.open = async id => {
    const r = (S.reserves || []).find(x => x.id === id); if (!r) return;
    const { data, error } = await supabase.from('repat_reserve_items').select('*').eq('reserve_id', id).order('in_eir');
    if (error) return toast(fail(error), 'error');
    S.E = { id, closed: !!r.closed, reserve_no: r.reserve_no, head: { agent: r.agent, outward_date: r.outward_date, run_end_date: r.run_end_date, run_end_time: String(r.run_end_time).slice(0, 5), destination: r.destination, vessel: r.vessel, voyage: r.voyage, release_order_no: r.release_order_no, shipper_order: r.shipper_order, shipper_name: r.shipper_name, port_of_dispatch: r.port_of_dispatch }, items: data || [] };
    S.view = 'edit'; S.pick = null; renderEditor();
  };
  RR.back = () => { S.view = 'list'; S.E = null; S.pick = null; render(); };

  const agentNames = () => { try { return (state.db.shippingLines || []).filter(l => l.active !== false).map(l => l.name).filter(Boolean); } catch (e) { return []; } };
  const opts = (list, cur) => list.concat(cur && list.indexOf(cur) < 0 ? [cur] : []).map(v => `<option value="${esc(v)}">`).join('');

  function renderEditor() {
    const root = $('sec-' + SEC), E = S.E, h = E.head, ro = !canWrite() || E.closed, dis = ro ? ' disabled' : '';
    const cleared = E.items.filter(i => i.cleared).length, total = E.items.length;
    const f = (id, label, type, ex) => `<div class="fg"><label>${label}</label><input id="rr_${id}" type="${type || 'text'}" value="${esc(h[id])}"${dis}${ex || ''}></div>`;
    root.innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title"><button class="action-btn ghost" onclick="RepatReserve.back()">← All reserves</button>
      &nbsp; Reserve ${E.reserve_no ? '#' + esc(E.reserve_no) : '(new, number is given on save)'} ${E.closed ? '<span class="hb hb-r">Closed</span>' : ''}</div>
      <div class="panel-meta">${E.id && canWrite() ? `<button class="action-btn ghost" onclick="RepatReserve.toggleClosed()">${E.closed ? 'Reopen' : 'Close reserve'}</button><button class="action-btn ghost" onclick="RepatReserve.remove()">Delete</button>` : ''}</div></div>
      <div class="rr-grid"><div class="rr-form">
        <div class="fg"><label>Agent (shipping line) *</label><input id="rr_agent" list="rrAgents" value="${esc(h.agent)}"${dis}><datalist id="rrAgents">${opts(agentNames(), h.agent)}</datalist></div>
        <div class="rr-two">${f('outward_date', 'Repat outward date *', 'date')}${f('run_end_date', 'Repat run end date *', 'date')}</div>
        ${f('run_end_time', 'Repat run end time *', 'time')}
        ${f('destination', 'Destination *')}
        <div class="rr-two">${f('vessel', 'Vessel *')}${f('voyage', 'Voyage *')}</div>
        <div class="rr-two">${f('release_order_no', 'Release order no. *')}${f('shipper_order', "Shipper's order *")}</div>
        <div class="fg"><label>Shipper's name *</label><input id="rr_shipper_name" list="rrShippers" value="${esc(h.shipper_name)}"${dis}><datalist id="rrShippers">${opts(SHIPPERS, h.shipper_name)}</datalist></div>
        <div class="fg"><label>Port of dispatch *</label><input id="rr_port_of_dispatch" list="rrPorts" value="${esc(h.port_of_dispatch)}"${dis}><datalist id="rrPorts">${PORTS.map(p => `<option value="${esc(p[0])}">${esc(p[1])}</option>`).join('')}</datalist></div>
        <div class="rr-err" id="rrErr"></div>
        ${ro ? (E.closed ? '<p class="rr-note">This reserve is closed. Reopen it to change it.</p>' : '') : `<button class="action-btn" id="rrSave" onclick="RepatReserve.save()">${E.id ? 'Save changes' : 'Save reserve'}</button>`}
      </div><div>
        <div class="rr-counts"><div class="rr-count"><b>${total}</b><span>Total</span></div><div class="rr-count ok"><b>${cleared}</b><span>Cleared</span></div><div class="rr-count wait"><b>${total - cleared}</b><span>Balance</span></div></div>
        ${ro ? '' : `<div class="rr-tools"><button class="action-btn" onclick="RepatReserve.openPicker()">+ Add from yard</button><button class="action-btn ghost" onclick="RepatReserve.openPaste()">Paste a list</button></div><div id="rrPicker"></div>`}
        ${total ? `<div style="overflow:auto;max-height:420px"><table class="data-table"><thead><tr><th>In EIR</th><th>Container</th><th>Size</th><th>Cleared</th>${ro ? '' : '<th></th>'}</tr></thead><tbody>${E.items.map((i, n) => `<tr><td>${esc(i.in_eir || '')}</td><td>${esc(i.container_no)}</td><td>${esc(i.size || '')}</td><td>${E.id && i.id && canWrite() ? `<input type="checkbox" ${i.cleared ? 'checked' : ''} onchange="RepatReserve.clearOne(${n},this.checked)">` : (i.cleared ? 'Yes' : '')}</td>${ro ? '' : `<td>${i.cleared ? '' : `<button class="action-btn ghost" onclick="RepatReserve.drop(${n})">Remove</button>`}</td>`}</tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><div class="empty-state-label">No containers on this reserve yet.</div></div>'}
      </div></div></div>`;
    if (S.pick) paintPicker();
  }
  function readHead() {
    const h = S.E.head;
    Object.keys(h).forEach(k => { const el = $('rr_' + k); if (el) h[k] = el.value.trim(); });
  }
  RR.drop = n => { readHead(); const i = S.E.items[n]; if (i && !i.cleared) { S.E.items.splice(n, 1); renderEditor(); } };

  RR.save = async () => {
    if (!canWrite() || S.busy) return;
    readHead();
    const E = S.E, h = E.head, err = $('rrErr'), btn = $('rrSave');
    const need = { agent: 'Agent', outward_date: 'Outward date', run_end_date: 'Run end date', run_end_time: 'Run end time', destination: 'Destination', vessel: 'Vessel', voyage: 'Voyage', release_order_no: 'Release order no.', shipper_order: "Shipper's order", shipper_name: "Shipper's name", port_of_dispatch: 'Port of dispatch' };
    const miss = Object.keys(need).filter(k => !h[k]);
    if (miss.length) { err.textContent = 'Fill in: ' + miss.map(k => need[k]).join(', ') + '.'; return; }
    if (!E.items.length) { err.textContent = 'Add at least one container.'; return; }
    if (!navigator.onLine) { err.textContent = 'You are offline. Reserve again when the connection returns.'; return; }
    S.busy = true; if (btn) btn.disabled = true; err.textContent = '';
    const { data, error } = await supabase.rpc('repat_reserve_save', { p_id: E.id, p_head: h, p_items: E.items.map(i => ({ container_no: i.container_no, in_eir: i.in_eir || '', size: i.size || '' })) });
    S.busy = false; if (btn) btn.disabled = false;
    if (error) { err.textContent = fail(error); return; }
    try { addAudit(state.profile && state.profile.username, 'Repat reserve saved', '#' + data.reserve_no + ' · ' + E.items.length + ' containers · ' + h.agent); } catch (e) {}
    toast('Reserve #' + data.reserve_no + ' saved', 'success');
    await loadReserves(); RR.open(data.id);
  };
  RR.toggleClosed = async () => {
    const E = S.E; if (!E || !E.id || !canWrite()) return;
    if (!confirm(E.closed ? 'Reopen this reserve?' : 'Close this reserve? Its uncleared containers are released for other reserves.')) return;
    const { error } = await supabase.rpc('repat_reserve_close', { p_id: E.id, p_closed: !E.closed });
    if (error) return toast(fail(error), 'error');
    try { addAudit(state.profile.username, E.closed ? 'Repat reserve reopened' : 'Repat reserve closed', '#' + E.reserve_no); } catch (e) {}
    await loadReserves(); RR.open(E.id);
  };
  RR.remove = async () => {
    const E = S.E; if (!E || !E.id || !canWrite()) return;
    if (!confirm('Delete reserve #' + E.reserve_no + '? This cannot be undone.')) return;
    const { error } = await supabase.rpc('repat_reserve_delete', { p_id: E.id });
    if (error) return toast(fail(error), 'error');
    try { addAudit(state.profile.username, 'Repat reserve deleted', '#' + E.reserve_no); } catch (e) {}
    toast('Reserve deleted', 'success'); RR.back();
  };
  RR.clearOne = async (n, on) => {
    const E = S.E, i = E && E.items[n]; if (!i || !canWrite()) return;
    const { error } = await supabase.rpc('repat_reserve_clear', { p_id: E.id, p_containers: [i.container_no], p_cleared: on });
    if (error) { toast(fail(error), 'error'); return renderEditor(); }
    i.cleared = on; await loadReserves(); renderEditor();
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
  const rowInfo = ic => ({ container_no: String(ic.container || '').trim().toUpperCase(), in_eir: ic.eirNumber || '', size: sizeOf(ic.ctype), type: ic.ctype || '', line: ic.line, days: Math.max(0, Math.floor((Date.now() - new Date(ic.date).getTime()) / 864e5)) });

  RR.openPicker = () => { readHead(); S.pick = { mode: 'yard', q: '', items: [], total: 0, sel: new Map(), busy: false }; paintPicker(); loadPick(true); };
  RR.openPaste = () => { readHead(); S.pick = { mode: 'paste', msg: '' }; paintPicker(); };
  async function loadPick(reset) {
    const P = S.pick; if (!P || P.mode !== 'yard' || P.busy) return;
    P.busy = true; if (reset) { P.items = []; P.total = 0; } paintPicker();
    try { const r = await yardPage(P.q, P.items.length); P.items = P.items.concat(r.items.map(rowInfo)); P.total = r.total; }
    catch (e) { P.err = fail(e); }
    P.busy = false; paintPicker();
  }
  function paintPicker() {
    const host = $('rrPicker'), P = S.pick; if (!host) return;
    if (!P) { host.innerHTML = ''; return; }
    const have = new Set(S.E.items.map(i => norm(i.container_no)));
    if (P.mode === 'paste') {
      host.innerHTML = `<div class="panel" style="padding:12px"><div class="panel-title" style="margin-bottom:6px">Paste container numbers</div>
        <textarea id="rrPaste" rows="5" style="width:100%" placeholder="One per line, or separated by spaces or commas"></textarea>
        <p class="rr-note">Each number is checked against the yard. Containers that are not in the yard, or are held by another open reserve, are listed and skipped.</p>
        <div class="rr-err" id="rrPasteMsg">${esc(P.msg || '')}</div>
        <div class="rr-tools"><button class="action-btn" onclick="RepatReserve.addPasted()">Check and add</button><button class="action-btn ghost" onclick="RepatReserve.closePicker()">Cancel</button></div></div>`;
      return;
    }
    host.innerHTML = `<div class="panel" style="padding:12px"><div class="rr-tools"><input type="search" id="rrPq" placeholder="Search container or EIR no." value="${esc(P.q)}" oninput="RepatReserve.pickSearch(this.value)">
      <button class="action-btn" onclick="RepatReserve.addPicked()">Add selected (${P.sel.size})</button><button class="action-btn ghost" onclick="RepatReserve.closePicker()">Close</button></div>
      <div class="rr-pick">${P.items.map((c, n) => {
        const key = norm(c.container_no), t = S.taken.get(key), dup = have.has(key), off = !!t || dup;
        return `<label class="${off ? 'off' : ''}"><input type="checkbox" ${off ? 'disabled' : ''} ${P.sel.has(key) ? 'checked' : ''} onchange="RepatReserve.pickToggle(${n},this.checked)"><b>${esc(c.container_no)}</b><span>${esc(c.type)}</span><span class="rr-m">EIR ${esc(c.in_eir || '-')} · ${c.days} d in yard${t ? '<br>Reserved on #' + esc(t.no) : (dup ? '<br>Already on this reserve' : '')}</span></label>`;
      }).join('') || (P.busy ? '' : '<div class="empty-state"><div class="empty-state-label">' + (P.err ? esc(P.err) : 'No containers in the yard match.') + '</div></div>')}
      ${P.items.length < P.total ? '<div style="padding:8px;text-align:center"><button class="action-btn ghost" onclick="RepatReserve.pickMore()">Load more</button></div>' : ''}</div>
      <p class="rr-note">${P.busy ? 'Loading…' : 'Showing ' + P.items.length + ' of ' + P.total + ' in the yard, oldest first.'}</p></div>`;
  }
  let pt;
  RR.pickSearch = v => { const P = S.pick; if (!P) return; P.q = v.trim(); clearTimeout(pt); pt = setTimeout(() => { loadPick(true).then(() => { const i = $('rrPq'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }); }, 300); };
  RR.pickMore = () => loadPick(false);
  RR.pickToggle = (n, on) => { const P = S.pick, c = P && P.items[n]; if (!c) return; const k = norm(c.container_no); if (on) P.sel.set(k, c); else P.sel.delete(k); const b = document.querySelector('#rrPicker .action-btn'); paintPickerCount(); };
  function paintPickerCount() { const b = document.querySelectorAll('#rrPicker .rr-tools .action-btn')[0]; if (b && S.pick) b.textContent = 'Add selected (' + S.pick.sel.size + ')'; }
  RR.addPicked = () => {
    const P = S.pick; if (!P || !P.sel.size) return toast('Tick the containers to add', 'info');
    P.sel.forEach(c => S.E.items.push({ container_no: c.container_no, in_eir: c.in_eir, size: c.size, cleared: false }));
    S.pick = null; renderEditor();
  };
  RR.closePicker = () => { S.pick = null; paintPicker(); };

  RR.addPasted = async () => {
    const ta = $('rrPaste'), msg = $('rrPasteMsg'); if (!ta) return;
    const nums = Array.from(new Set(ta.value.split(/[\s,;]+/).map(norm).filter(Boolean)));
    if (!nums.length) { msg.textContent = 'Paste at least one container number.'; return; }
    if (nums.length > 200) { msg.textContent = 'Paste up to 200 numbers at a time.'; return; }
    msg.style.color = 'var(--text-3)'; msg.textContent = 'Checking ' + nums.length + ' containers…';
    const have = new Set(S.E.items.map(i => norm(i.container_no))), added = [], skipped = [];
    const idx = window.icOutIndex ? window.icOutIndex() : null;
    for (let i = 0; i < nums.length; i += 5) {
      await Promise.all(nums.slice(i, i + 5).map(async k => {
        if (have.has(k)) return skipped.push(k + ' (already on this reserve)');
        const t = S.taken.get(k); if (t) return skipped.push(k + ' (reserved on #' + t.no + ')');
        let rows = [];
        try {
          if (window.ICR && ICR.enabled) rows = await ICR.byContainer(k);
          else rows = ((state.db.interchange) || []).filter(r => norm(r.container) === k);
        } catch (e) { return skipped.push(k + ' (could not check)'); }
        const live = rows.filter(r => r._inYard !== undefined ? r._inYard : window.icInYard(r, idx)).filter(r => r.type === 'Gate-In' || r.type === 'Depot-In')
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (!live) return skipped.push(k + ' (not in the yard)');
        added.push(rowInfo(live));
      }));
    }
    added.forEach(c => S.E.items.push({ container_no: c.container_no, in_eir: c.in_eir, size: c.size, cleared: false }));
    if (!skipped.length) { S.pick = null; renderEditor(); toast(added.length + ' containers added', 'success'); return; }
    S.pick = { mode: 'paste', msg: added.length + ' added. Skipped: ' + skipped.join('; ') }; renderEditor();
    toast(added.length + ' added, ' + skipped.length + ' skipped', 'info', 5000);
  };

  sectionRenderers[SEC] = render;
})();