'use strict';
/* Vessel Prestaking, kept deliberately simple. Two steps:
     1. ARRIVALS AT PORT   containers Gargo has brought to the port. A completed Depot → Port trip records its container
                           here by itself; anything else is added by hand. Each container can be given a yard / block.
     2. LOAD TO VESSEL     containers sitting in the port yard / blocks that now move onto a vessel. Tick them, name the
                           vessel and voyage, done. A container that misses its vessel is reported as a shutout.
   Same table and statuses as before (vessel_prestaking: staged = at port, loaded = on vessel, shutout, cancelled),
   so nothing in the database, reports, badges or offline layer changes.
   Links: dispatch trip → arrival (automatic) → vessel (written back onto the trip) → shutout register → container history. */

function prestakeToRow(p) {
  return {
    id: p.id,
    trip_id: p.tripId || null,
    container: p.container,
    ctype: p.ctype || null,
    line_id: p.line || null,
    driver_id: p.driverId || null,
    truck_id: p.truckId || null,
    vessel: p.vessel || '',            // empty text, not null: a container at port has no vessel yet
    voyage: p.voyage || null,
    consignee: p.consignee || null,
    planned_date: p.plannedDate || null,
    shift: p.shift || null,
    origin: p.origin || null,
    destination: p.destination || null,   // yard / block inside the port
    notes: p.notes || null,
    status: p.status,
    created_by: p.createdBy || null,
    created_at: p.createdAt,
    resolved_at: p.resolvedAt || null,
    shutout_id: p.shutoutId || null,
  };
}

function prestakeFromRow(r) {
  return {
    id: r.id,
    tripId: r.trip_id,
    container: r.container,
    ctype: r.ctype || '',
    line: r.line_id,
    driverId: r.driver_id,
    truckId: r.truck_id,
    vessel: r.vessel || '',
    voyage: r.voyage || '',
    consignee: r.consignee || '',
    plannedDate: r.planned_date || '',
    shift: r.shift || '',
    origin: r.origin || '',
    destination: r.destination || '',
    notes: r.notes || '',
    status: r.status,
    createdBy: r.created_by || '',
    createdAt: r.created_at,
    resolvedAt: r.resolved_at || null,
    shutoutId: r.shutout_id || null,
  };
}

/* ── small helpers ─────────────────────────────────────────────────────────── */
const PS_QUEUE_DAYS = 14;                                   // older completed trips are assumed shipped already
let _psTab = 'arrive', _psQ = '';
const _psSel = new Set();
let _psLoadIds = [];

const psNorm = c => String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, '');
const psList = () => state.db.vesselPrestaking || (state.db.vesselPrestaking = []);
const psAtPort = () => psList().filter(p => p.status === 'staged');
const psById = id => psList().find(p => p.id === id);
const psUser = () => (state.profile && state.profile.username) || 'system';
const psPorts = () => (window.bookingDocs && window.bookingDocs.PORT_LOCATIONS) || [];
const psToday = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const psLineCode = id => { const l = id && state.db.shippingLines.find(x => x.id === id); return l ? (l.code || l.name) : ''; };
const psTruck = id => { const t = id && state.db.trucks.find(x => x.id === id); return t ? t.reg : ''; };
const psDriver = id => { const d = id && state.db.drivers.find(x => x.id === id); return d ? d.name : ''; };
const psSameDay = (iso, d) => !!iso && new Date(iso).toDateString() === (d || new Date()).toDateString();

function canManagePrestaking() { return isAdmin() || isDispatch() || isClerk(); }

function psChip(p) {
  const t = { staged: 'At port', loaded: 'On vessel', shutout: 'Shutout', cancelled: 'Removed' }[p.status] || p.status;
  return `<span class="sbadge s-${esc(p.status)}">${t}</span>`;
}

function psNewRecord(o) {
  return Object.assign({
    id: uid('PSTG'), tripId: '', container: '', ctype: '', line: '', driverId: '', truckId: '',
    vessel: '', voyage: '', consignee: '', plannedDate: '', shift: '', origin: '', destination: '', notes: '',
    status: 'staged', createdBy: psUser(), createdAt: new Date().toISOString(), resolvedAt: null, shutoutId: null, _dirty: true,
  }, o);
}

/* A trip is "used" once it has an open, loaded or shut-out record. A cancelled record frees it again. */
function psUsedTripIds() {
  return new Set(psList().filter(p => p.tripId && ['staged', 'loaded', 'shutout'].includes(p.status)).map(p => p.tripId));
}

/* Completed Depot → Port trips (last 14 days) that are not yet recorded at port. */
function prestakingEligibleTrips() {
  const used = psUsedTripIds(), cut = Date.now() - PS_QUEUE_DAYS * 86400000;
  return state.db.trips
    .filter(t => isOutwardWorkType(t.workType) && t.status === 'completed' && !used.has(t.id) && new Date(t.eta || t.startTime).getTime() >= cut)
    .sort((a, b) => new Date(b.eta || b.startTime) - new Date(a.eta || a.startTime));
}

function psFromTrip(t, by) {
  return psNewRecord({
    tripId: t.id, container: t.container, ctype: t.ctype || '', line: t.shippingLine || '',
    driverId: t.driverId || '', truckId: t.truckId || '', vessel: t.vessel || '', voyage: t.voyage || '',
    consignee: t.receivingParty || '', origin: t.dest || '', createdBy: by || psUser(),
  });
}

function psAfterChange(opts) {
  scheduleSave();
  try { buildBadges(); } catch (e) {}
  if (!opts || !opts.noRender) renderPrestaking();
}

/* ── automatic link: a completed Depot → Port trip lands in Step 1 ─────────── */
function psAutoArrive(t) {
  if (!t || !isOutwardWorkType(t.workType) || t.status !== 'completed' || !t.container) return;
  if (psUsedTripIds().has(t.id)) return;
  const p = psFromTrip(t, 'auto · trip completed');
  psList().push(p);
  scheduleSave();
  addAudit(psUser(), 'Container Arrived at Port', `${p.container} — trip completed, recorded at port`);
  try { buildBadges(); } catch (e) {}
  if (state.currentSection === 'prestaking') renderPrestaking();
  toast(`${p.container} recorded at port`, 'info', 2500);
}

(function wireTripCompletion() {
  const wrap = () => {
    const orig = window.applyTripStatus;
    if (typeof orig !== 'function' || orig._psw) return;
    const w = async function (t, status) {
      const r = await orig.apply(this, arguments);
      try { if (r && r.ok && status === 'completed') psAutoArrive(t); } catch (e) { console.warn('prestaking auto-arrive:', e && e.message); }
      return r;
    };
    w._psw = true; window.applyTripStatus = w;
  };
  wrap();
  document.addEventListener('DOMContentLoaded', wrap);       // in case dispatch-trips.js loaded after this file
})();

/* ── section shell ─────────────────────────────────────────────────────────── */
function psEnsureRoot() {
  const sec = document.getElementById('sec-prestaking');
  if (!sec) return null;
  if (!sec.querySelector('#psRoot')) sec.innerHTML = '<div class="sec-toolbar"><div class="sec-title">Vessel Prestaking</div></div><div id="psRoot"></div>';
  return document.getElementById('psRoot');
}

function renderPrestaking() {
  const root = psEnsureRoot();
  if (!root) return;
  const can = canManagePrestaking();
  root.innerHTML = `
    <div class="gd-tabs">
      <button type="button" class="gd-tab${_psTab === 'arrive' ? ' on' : ''}" onclick="psTab('arrive')">1 · Arrivals at port</button>
      <button type="button" class="gd-tab${_psTab === 'load' ? ' on' : ''}" onclick="psTab('load')">2 · Load to vessel</button>
    </div>
    <div class="gs-bar">
      <input class="gs-q" id="psSearch" type="search" autocomplete="off" placeholder="Search container, block, truck, line or vessel" value="${esc(_psQ)}" oninput="psSearch(this.value)"/>
      ${_psTab === 'arrive' && can ? '<button type="button" class="action-btn" onclick="showAddPrestakeModal()">+ Add container</button>' : ''}
    </div>
    <div id="psList"></div>`;
  psPaintList();
}

function psTab(t) { _psTab = t; renderPrestaking(); }
function psSearch(v) { _psQ = String(v || ''); psPaintList(); }
function filterPrestaking(f) { _psTab = f === 'loaded' ? 'load' : _psTab; renderPrestaking(); }   // old filter buttons: kept so nothing breaks

function psMatch(p) {
  const q = _psQ.trim().toUpperCase();
  if (!q) return true;
  return [p.container, p.destination, p.vessel, p.voyage, psLineCode(p.line), psTruck(p.truckId), psDriver(p.driverId), p.ctype].join(' ').toUpperCase().indexOf(q) > -1;
}

function psPaintList() {
  const el = document.getElementById('psList');
  if (!el) return;
  el.innerHTML = _psTab === 'arrive' ? psArriveHtml() : psLoadHtml();
  psRefreshBar();
}

function psSub(p) {
  const bits = [p.ctype, psLineCode(p.line), p.origin].filter(Boolean).map(esc);
  const by = [psTruck(p.truckId), psDriver(p.driverId)].filter(Boolean).map(esc).join(' · ');
  return `<span class="ps-sub">${bits.join(' · ') || '—'}</span>${by ? `<span class="ps-sub">🚚 ${by}</span>` : ''}`;
}

function psBlockInput(p) {
  if (!canManagePrestaking() || p.status !== 'staged') return p.destination ? `<span class="ps-blk">${esc(p.destination)}</span>` : '<span class="ps-sub">—</span>';
  return `<input class="ps-block" placeholder="Yard / block" maxlength="40" value="${esc(p.destination)}" onchange="psSaveBlock('${p.id}',this.value)" aria-label="Yard or block for ${esc(p.container)}"/>`;
}

/* ── STEP 1 · arrivals ─────────────────────────────────────────────────────── */
function psArriveHtml() {
  const can = canManagePrestaking(), q = _psQ.trim().toUpperCase();
  const queue = prestakingEligibleTrips().filter(t => !q || [t.container, t.ctype, psLineCode(t.shippingLine), psTruck(t.truckId), psDriver(t.driverId)].join(' ').toUpperCase().indexOf(q) > -1);
  let html = '';
  if (queue.length) {
    html += `<div class="ps-card ps-queue"><div class="ps-card-h"><div><b>Delivered to port by Gargo, not yet recorded</b><span class="ps-sub">Completed Depot → Port trips from the last ${PS_QUEUE_DAYS} days</span></div>
      ${can ? `<button type="button" class="action-btn" onclick="psRecordAll()">Record all (${queue.length})</button>` : ''}</div>` +
      queue.slice(0, 30).map(t => `<div class="ps-row">
        <div class="ps-main"><b class="ps-cont">${esc(t.container)}</b><span class="ps-sub">${[t.ctype, psLineCode(t.shippingLine), t.dest].filter(Boolean).map(esc).join(' · ') || '—'}</span></div>
        <div class="ps-by"><span class="ps-sub">🚚 ${[psTruck(t.truckId), psDriver(t.driverId)].filter(Boolean).map(esc).join(' · ') || '—'}</span></div>
        <div class="ps-when">${fmtDate(t.eta || t.startTime)}</div>
        <div class="ps-acts">${can ? `<button type="button" class="action-btn" onclick="psRecordTrip('${t.id}')">Record at port</button>` : ''}<button type="button" class="action-btn ghost" onclick="showTripDetail('${t.id}')">Trip</button></div>
      </div>`).join('') +
      (queue.length > 30 ? `<div class="ps-sub" style="padding:8px 4px">+ ${queue.length - 30} more. Use “Record all”.</div>` : '') + '</div>';
  }
  const rows = psList().filter(p => p.status !== 'cancelled' && psMatch(p)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  html += `<div class="ps-card"><div class="ps-card-h"><div><b>Containers recorded at port</b><span class="ps-sub">Newest first. Give each container its yard / block.</span></div></div>` +
    (rows.length ? rows.slice(0, 60).map(p => `<div class="ps-row">
        <div class="ps-main"><b class="ps-cont">${esc(p.container)}</b>${psSub(p)}</div>
        <div class="ps-by">${psChip(p)}${p.status === 'loaded' ? `<span class="ps-sub">${esc(p.vessel)}${p.voyage ? ' · ' + esc(p.voyage) : ''}</span>` : ''}</div>
        <div class="ps-when">${timeAgo(p.createdAt)}</div>
        <div class="ps-acts">${psBlockInput(p)}<button type="button" class="action-btn ghost" onclick="showPrestakeDetail('${p.id}')">View</button></div>
      </div>`).join('') + (rows.length > 60 ? `<div class="ps-sub" style="padding:8px 4px">Showing the latest 60 of ${rows.length}. Search to narrow down.</div>` : '')
      : '<div class="gd-empty">Nothing recorded at port yet.<br>Containers appear here when a Depot → Port trip is completed, or add one with “+ Add container”.</div>') + '</div>';
  return html;
}

/* ── STEP 2 · load to vessel ───────────────────────────────────────────────── */
function psLoadHtml() {
  const can = canManagePrestaking();
  const rows = psAtPort().filter(psMatch).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let html = `<div class="ps-card"><div class="ps-card-h"><div><b>In the port yard, waiting for a vessel</b><span class="ps-sub">Oldest first. Tick the containers going on the same vessel.</span></div>
    ${can ? `<div class="ps-acts"><label class="ps-all"><input type="checkbox" onchange="psSelectAll(this.checked)"/> Select all shown</label>
    <button type="button" class="submit-btn ps-go" id="psLoadBtn" onclick="psLoadDialog()">Load on vessel →</button></div>` : ''}</div>` +
    (rows.length ? rows.map(p => `<div class="ps-row${_psSel.has(p.id) ? ' sel' : ''}">
        ${can ? `<label class="ps-chk"><input type="checkbox" ${_psSel.has(p.id) ? 'checked' : ''} onchange="psToggle('${p.id}',this.checked,this)" aria-label="Select ${esc(p.container)}"/></label>` : ''}
        <div class="ps-main"><b class="ps-cont">${esc(p.container)}</b>${psSub(p)}</div>
        <div class="ps-by">${psBlockInput(p)}</div>
        <div class="ps-when">${timeAgo(p.createdAt)}</div>
        <div class="ps-acts">${can ? `<button type="button" class="action-btn" onclick="psLoadDialog(['${p.id}'])">Load</button>` : ''}<button type="button" class="action-btn ghost" onclick="showPrestakeDetail('${p.id}')">View</button></div>
      </div>`).join('') : `<div class="gd-empty">${_psQ ? 'No container at port matches your search.' : 'No containers are waiting at port.<br>Record arrivals in step 1 first.'}</div>`) + '</div>';

  /* recently loaded, grouped by vessel and voyage */
  const cut = Date.now() - 14 * 86400000, groups = {};
  psList().filter(p => p.status === 'loaded' && new Date(p.resolvedAt || p.createdAt).getTime() >= cut && psMatch(p)).forEach(p => {
    const k = (p.vessel || 'Vessel not named') + '|' + (p.voyage || '');
    (groups[k] = groups[k] || []).push(p);
  });
  const keys = Object.keys(groups).sort((a, b) => new Date(groups[b][0].resolvedAt) - new Date(groups[a][0].resolvedAt));
  if (keys.length) {
    html += '<div class="ps-card"><div class="ps-card-h"><div><b>Loaded on vessels</b><span class="ps-sub">Last 14 days</span></div></div>' +
      keys.map(k => {
        const g = groups[k], last = g.reduce((m, p) => (new Date(p.resolvedAt) > new Date(m) ? p.resolvedAt : m), g[0].resolvedAt);
        const [v, voy] = k.split('|');
        return `<div class="ps-grp"><div class="ps-grp-h"><b>${esc(v)}${voy ? ' · Voyage ' + esc(voy) : ''}</b><span class="ps-sub">${g.length} container${g.length === 1 ? '' : 's'} · ${fmtDate(last)}</span></div>
          <div class="ps-tags">${g.map(p => `<button type="button" class="ps-tag" onclick="showPrestakeDetail('${p.id}')">${esc(p.container)}</button>`).join('')}</div></div>`;
      }).join('') + '</div>';
  }
  return html;
}

function psRefreshBar() {
  const b = document.getElementById('psLoadBtn');
  if (!b) return;
  const n = [..._psSel].filter(id => { const p = psById(id); return p && p.status === 'staged'; }).length;
  b.textContent = n ? `Load ${n} on vessel →` : 'Load on vessel →';
  b.disabled = !n;
}
function psToggle(id, on, el) {
  on ? _psSel.add(id) : _psSel.delete(id);
  const row = el && el.closest && el.closest('.ps-row');
  if (row) row.classList.toggle('sel', !!on);
  psRefreshBar();
}
function psSelectAll(on) {
  psAtPort().filter(psMatch).forEach(p => on ? _psSel.add(p.id) : _psSel.delete(p.id));
  psPaintList();
}
function psSaveBlock(id, v) {
  const p = psById(id);
  if (!p || !canManagePrestaking() || p.status !== 'staged') return;
  p.destination = String(v || '').trim().slice(0, 40);
  p._dirty = true;
  scheduleSave();
}

/* ── step 1 actions ────────────────────────────────────────────────────────── */
function psRecordTrip(tripId) {
  if (!canManagePrestaking()) { toast('You do not have permission to record containers', 'error'); return; }
  const t = state.db.trips.find(x => x.id === tripId);
  if (!t || psUsedTripIds().has(tripId)) { renderPrestaking(); return; }
  const p = psFromTrip(t);
  psList().push(p);
  addAudit(psUser(), 'Container Arrived at Port', `${p.container} — recorded at port`);
  psAfterChange();
  toast(`${p.container} recorded at port`, 'success');
}

function psRecordAll() {
  if (!canManagePrestaking()) return;
  const q = prestakingEligibleTrips();
  if (!q.length) return;
  if (!confirm(`Record all ${q.length} delivered container${q.length === 1 ? '' : 's'} as arrived at port?`)) return;
  q.forEach(t => {
    const p = psFromTrip(t);
    psList().push(p);
    addAudit(psUser(), 'Container Arrived at Port', `${p.container} — recorded at port`);
  });
  psAfterChange();
  toast(`${q.length} container${q.length === 1 ? '' : 's'} recorded at port`, 'success');
}

function showAddPrestakeModal() {
  if (!canManagePrestaking()) { toast('You do not have permission to record containers', 'error'); return; }
  const sizes = (typeof CONTAINER_TYPE_OPTIONS !== 'undefined' ? CONTAINER_TYPE_OPTIONS : ['20GP', '40GP', '40HC']);
  const ports = psPorts();
  openModal('Add container at port', `
    <div class="fg"><label>Container number *</label><input id="ps_cont" placeholder="e.g. MSKU1234567" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase"/></div>
    <div class="form-row-2">
      <div class="fg"><label>Type / size</label><select id="ps_ctype"><option value="">Select…</option>${sizes.map(s => `<option>${esc(s)}</option>`).join('')}</select></div>
      <div class="fg"><label>Shipping line</label><select id="ps_line"><option value="">Select…</option>${state.db.shippingLines.filter(l => l.active).map(l => `<option value="${l.id}">${esc(l.code)} — ${esc(l.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Port terminal</label><select id="ps_origin"><option value="">Select…</option>${ports.map(p => `<option>${esc(p)}</option>`).join('')}</select></div>
      <div class="fg"><label>Yard / block <span class="label-optional">(optional)</span></label><input id="ps_block" maxlength="40" placeholder="e.g. Block C4"/></div>
    </div>
    <div class="fg"><label>Remarks <span class="label-optional">(optional)</span></label><textarea id="ps_notes" rows="2"></textarea></div>
    <div class="gs-hint">If this container has a completed Depot → Port trip, the truck, driver and line are filled in from it automatically.</div>
    <button class="submit-btn" onclick="savePrestake()">Record at port →</button>`);
}

function savePrestake() {
  const v = id => (document.getElementById(id) && document.getElementById(id).value || '').trim();
  const key = psNorm(v('ps_cont'));
  if (key.length < 10) { toast('Enter the full container number', 'error'); return; }
  if (psAtPort().some(p => psNorm(p.container) === key)) { toast('This container is already at port', 'error'); return; }
  const used = psUsedTripIds();
  const trip = state.db.trips.filter(t => isOutwardWorkType(t.workType) && t.status === 'completed' && psNorm(t.container) === key && !used.has(t.id))
    .sort((a, b) => new Date(b.eta || b.startTime) - new Date(a.eta || a.startTime))[0];
  const p = trip ? psFromTrip(trip) : psNewRecord({});
  p.container = trip ? trip.container : v('ps_cont').toUpperCase().replace(/\s+/g, '');
  p.ctype = v('ps_ctype') || p.ctype;
  p.line = v('ps_line') || p.line;
  p.origin = v('ps_origin') || p.origin;
  p.destination = v('ps_block').slice(0, 40);
  p.notes = v('ps_notes');
  psList().push(p);
  addAudit(psUser(), 'Container Arrived at Port', `${p.container} — added by hand${trip ? ' (linked to trip)' : ''}`);
  closeModal();
  psAfterChange();
  toast(`${p.container} recorded at port${trip ? ' · linked to its trip' : ''}`, 'success');
}

/* ── step 2 actions: load on a vessel ──────────────────────────────────────── */
function psVesselNames() {
  const s = new Set();
  psList().forEach(p => { if (p.vessel) s.add(p.vessel); });
  state.db.trips.slice(-300).forEach(t => { if (t.vessel) s.add(t.vessel); });
  return [...s].sort();
}

function psLoadDialog(ids) {
  if (!canManagePrestaking()) { toast('You do not have permission to load containers', 'error'); return; }
  _psLoadIds = (ids || [..._psSel]).filter(id => { const p = psById(id); return p && p.status === 'staged'; });
  if (!_psLoadIds.length) { toast('Tick the containers that are going on the vessel', 'info'); return; }
  const ps = _psLoadIds.map(psById), first = ps[0];
  openModal(`Load on vessel — ${ps.length} container${ps.length === 1 ? '' : 's'}`, `
    <div class="ps-tags" style="margin-bottom:12px">${ps.slice(0, 40).map(p => `<span class="ps-tag static">${esc(p.container)}</span>`).join('')}${ps.length > 40 ? `<span class="ps-sub">+ ${ps.length - 40} more</span>` : ''}</div>
    <div class="form-row-2">
      <div class="fg"><label>Vessel name *</label><input id="ps_vessel" list="psVessels" value="${esc(first.vessel)}" placeholder="e.g. MV Maersk Emerald" autocomplete="off"/><datalist id="psVessels">${psVesselNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>
      <div class="fg"><label>Voyage no. <span class="label-optional">(optional)</span></label><input id="ps_voyage" value="${esc(first.voyage)}" placeholder="e.g. 234W"/></div>
    </div>
    <div class="fg"><label>Date loaded</label><input type="date" id="ps_date" value="${psToday()}"/></div>
    <button class="submit-btn" onclick="psConfirmLoad()">Confirm loaded →</button>`);
}

function psConfirmLoad() {
  const vessel = (document.getElementById('ps_vessel').value || '').trim().slice(0, 80);
  const voyage = (document.getElementById('ps_voyage').value || '').trim().slice(0, 40);
  const date = document.getElementById('ps_date').value || psToday();
  if (!vessel) { toast('Vessel name is required', 'error'); return; }
  const when = date === psToday() ? new Date().toISOString() : new Date(date + 'T12:00:00').toISOString();
  let n = 0;
  _psLoadIds.forEach(id => {
    const p = psById(id);
    if (!p || p.status !== 'staged') return;
    p.vessel = vessel; p.voyage = voyage; p.plannedDate = date;
    p.status = 'loaded'; p.resolvedAt = when; p._dirty = true;
    const t = p.tripId && state.db.trips.find(x => x.id === p.tripId);          // link back: the dispatch trip now knows its vessel
    if (t && (!t.vessel || t.vessel !== vessel)) { t.vessel = vessel; if (voyage) t.voyage = voyage; t._dirty = true; }
    addAudit(psUser(), 'Container Loaded on Vessel', `${p.container} — ${vessel}${voyage ? ' / ' + voyage : ''}`);
    _psSel.delete(id); n++;
  });
  _psLoadIds = [];
  closeModal();
  psAfterChange();
  toast(`${n} container${n === 1 ? '' : 's'} loaded on ${vessel}`, 'success');
}

/* ── detail, shutout, remove ───────────────────────────────────────────────── */
function showPrestakeDetail(id) {
  const p = psById(id);
  if (!p) return;
  const can = canManagePrestaking(), tr = psTruck(p.truckId), dr = psDriver(p.driverId);
  const fact = (k, v) => `<div class="fg" style="margin:0"><label>${k}</label><div style="font-size:12.5px;color:var(--text)">${v || '—'}</div></div>`;
  const step = (done, label, detail) => `<div class="ps-step${done ? ' done' : ''}"><i></i><div><b>${label}</b><span class="ps-sub">${detail || ''}</span></div></div>`;
  const shut = p.status === 'shutout', cancelled = p.status === 'cancelled';
  openModal(`Port & vessel — ${p.container}`, `
    <div style="margin-bottom:12px">${psChip(p)}</div>
    <div class="ps-steps">
      ${step(true, 'Arrived at port', `${esc(p.origin || 'Port')} · ${timeAgo(p.createdAt)} · ${esc(p.createdBy || '')}`)}
      ${step(!!p.destination, 'Yard / block', esc(p.destination || 'not set'))}
      ${step(p.status === 'loaded', 'Loaded on vessel', p.status === 'loaded' ? `${esc(p.vessel)}${p.voyage ? ' · Voyage ' + esc(p.voyage) : ''} · ${fmtDate(p.resolvedAt)}` : (shut ? 'Missed the vessel (shutout)' : cancelled ? 'Removed from the list' : 'waiting'))}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
      ${fact('Type', esc(p.ctype))}${fact('Shipping line', esc(psLineCode(p.line)))}
      ${fact('Brought by (truck)', esc(tr))}${fact('Driver', esc(dr))}
    </div>
    ${p.notes ? `<div class="ops-notice">${esc(p.notes)}</div>` : ''}
    <div class="ps-links">
      <button type="button" class="action-btn ghost" onclick="closeModal();showContainerDetail('${esc(p.container)}')">Container history</button>
      ${p.tripId && state.db.trips.some(t => t.id === p.tripId) ? `<button type="button" class="action-btn ghost" onclick="closeModal();showTripDetail('${p.tripId}')">Dispatch trip</button>` : ''}
      ${p.shutoutId ? `<button type="button" class="action-btn ghost" onclick="closeModal();showSection('shutout',document.querySelector('.nav-item[data-section=shutout]'))">Shutout register</button>` : ''}
    </div>
    ${can && p.status === 'staged' ? `<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="modal-btn success" onclick="psLoadDialog(['${p.id}'])">✓ Load on vessel</button>
      <button class="modal-btn danger" onclick="promptPrestakeShutout('${p.id}')">⚠ Missed vessel (shutout)</button>
      <button class="modal-btn ghost" onclick="cancelPrestake('${p.id}')">Remove from list</button></div>` : ''}
    ${can && shut ? `<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:12px"><button class="modal-btn ghost" onclick="psRequeue('${p.id}')">Put back on the port list for the next vessel</button></div>` : ''}
  `);
}

function promptPrestakeShutout(id) {
  const p = psById(id);
  if (!p) return;
  if (!canManagePrestaking()) { toast('You do not have permission to update this record', 'error'); return; }
  if (p.status !== 'staged') { toast('This record is already resolved', 'error'); return; }
  if (typeof _pendingShutoutImg !== 'undefined') _pendingShutoutImg.ps = '';
  openModal('Missed vessel (shutout)', `
    <div class="ops-notice" style="margin-bottom:10px">${esc(p.container)} goes into the Shutout register as having missed its vessel. It stays on record so it can be put back on the port list.</div>
    <div class="form-row-2">
      <div class="fg"><label>Vessel it missed</label><input id="psShutVessel" value="${esc(p.vessel)}" placeholder="e.g. MV Maersk Emerald"/></div>
      <div class="fg"><label>Voyage <span class="label-optional">(optional)</span></label><input id="psShutVoyage" value="${esc(p.voyage)}"/></div>
    </div>
    <div class="fg"><label>Reason (required)</label><textarea id="psShutoutReason" rows="3" placeholder="e.g. Vessel closed early, documents not cleared…"></textarea></div>
    ${typeof shutoutPhotoPicker === 'function' ? shutoutPhotoPicker('ps') : ''}
    <button class="submit-btn" onclick="confirmPrestakeShutout('${id}')">Confirm shutout →</button>`);
}

function confirmPrestakeShutout(id) {
  const p = psById(id);
  if (!p) return;
  if (p.status !== 'staged') { toast('This record is already resolved', 'error'); return; }
  const val = el => (document.getElementById(el) && document.getElementById(el).value || '').trim();
  const reason = val('psShutoutReason');
  if (!reason) { toast('A reason is required', 'error'); return; }
  const vessel = val('psShutVessel').slice(0, 80), voyage = val('psShutVoyage').slice(0, 40);
  const shutout = {
    id: uid('SHT'), container: p.container,
    line: p.line || '', vessel: vessel || p.vessel || '', voyage: voyage || p.voyage || '',
    reason: sanitize(reason), truckId: p.truckId || '', driverId: p.driverId || '',
    notes: `Logged from Vessel Prestaking record ${p.id}.${p.destination ? ' Block ' + p.destination + '.' : ''}${p.notes ? ' ' + p.notes : ''}`,
    img: (typeof _pendingShutoutImg !== 'undefined' && _pendingShutoutImg.ps) || '',
    date: new Date().toISOString(), status: 'open', _dirty: true,
  };
  state.db.shutouts.push(shutout);
  if (typeof _pendingShutoutImg !== 'undefined') _pendingShutoutImg.ps = '';
  p.vessel = shutout.vessel; p.voyage = shutout.voyage;
  p.status = 'shutout'; p.shutoutId = shutout.id; p.resolvedAt = new Date().toISOString(); p._dirty = true;
  _psSel.delete(id);
  addAudit(psUser(), 'Prestaking Shutout', `${p.container} — ${reason}`);
  closeModal();
  psAfterChange();
  if (typeof refreshContainerHistory === 'function') refreshContainerHistory();
  toast(`${p.container} moved to the Shutout register`, 'warning');
}

/* a shut-out container is still in the port: put it back on the list so it can go on the next vessel */
function psRequeue(id) {
  const p = psById(id);
  if (!p || p.status !== 'shutout' || !canManagePrestaking()) return;
  if (psAtPort().some(x => psNorm(x.container) === psNorm(p.container))) { toast('This container is already on the port list', 'error'); return; }
  const n = psNewRecord({ tripId: p.tripId, container: p.container, ctype: p.ctype, line: p.line, driverId: p.driverId, truckId: p.truckId,
    origin: p.origin, destination: p.destination, consignee: p.consignee, notes: 'Put back after a shutout' });
  psList().push(n);
  addAudit(psUser(), 'Container Arrived at Port', `${n.container} — back on the port list after a shutout`);
  closeModal();
  psAfterChange();
  toast(`${n.container} is back on the port list`, 'success');
}

function cancelPrestake(id) {
  const p = psById(id);
  if (!p) return;
  if (!canManagePrestaking()) { toast('You do not have permission to update this record', 'error'); return; }
  if (p.status !== 'staged') { toast('This record is already resolved', 'error'); return; }
  if (!confirm(`Remove ${p.container} from the port list? Use this only if it was recorded by mistake.`)) return;
  p.status = 'cancelled'; p.resolvedAt = new Date().toISOString(); p._dirty = true;
  _psSel.delete(id);
  addAudit(psUser(), 'Prestaking Cancelled', p.container);
  closeModal();
  psAfterChange();
  toast('Removed from the port list', 'info');
}

/* old entry points other files may still call */
function markPrestakeLoaded(id) { psLoadDialog([id]); }
function onPrestakeTripChange() {}
function prestakeTripLabel(t) { return `${t.container} — ${t.ctype || '—'} · ${t.shippingLine ? lineName(t.shippingLine) : '—'}`; }
function renderPrestakingKpis() { renderPrestaking(); }
function renderPrestakingList() { psPaintList(); }

/* ── link: the container history screen shows where a container is in the port and on which vessel ── */
(function wireContainerHistory() {
  const wrap = () => {
    const orig = window.showContainerDetail;
    if (typeof orig !== 'function' || orig._psw) return;
    const w = function (c) {
      const r = orig.apply(this, arguments);
      try {
        const key = psNorm(c);
        const recs = psList().filter(p => psNorm(p.container) === key && p.status !== 'cancelled').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const body = document.getElementById('modalBody');
        if (recs.length && body) {
          body.insertAdjacentHTML('beforeend', `<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Port &amp; Vessel (${recs.length})</div>` +
            recs.map(p => `<div class="activity-row" style="cursor:pointer" onclick="closeModal();showPrestakeDetail('${p.id}')"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">${p.status === 'loaded' ? esc(p.vessel || 'Vessel') + (p.voyage ? ' · Voyage ' + esc(p.voyage) : '') : esc(p.origin || 'Port') + (p.destination ? ' · ' + esc(p.destination) : '')}</div><div style="font-size:10px;color:var(--text-3)">${truckName(p.truckId)} · ${driverName(p.driverId)}</div></div>${psChip(p)}<div class="act-time">${fmtDate(p.resolvedAt || p.createdAt)}</div></div>`).join(''));
        }
      } catch (e) { console.warn('prestaking history:', e && e.message); }
      return r;
    };
    w._psw = true; window.showContainerDetail = w;
  };
  wrap();
  document.addEventListener('DOMContentLoaded', wrap);
})();
