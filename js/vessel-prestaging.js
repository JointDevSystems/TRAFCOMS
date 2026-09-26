'use strict';



function prestageToRow(p) {
  return {
    id: p.id,
    trip_id: p.tripId || null,
    container: p.container,
    ctype: p.ctype || null,
    line_id: p.line || null,
    driver_id: p.driverId || null,
    truck_id: p.truckId || null,
    vessel: p.vessel || null,
    voyage: p.voyage || null,
    consignee: p.consignee || null,
    planned_date: p.plannedDate || null,
    shift: p.shift || null,
    origin: p.origin || null,
    destination: p.destination || null,
    notes: p.notes || null,
    status: p.status,
    created_by: p.createdBy || null,
    created_at: p.createdAt,
    resolved_at: p.resolvedAt || null,
    shutout_id: p.shutoutId || null,
  };
}

function prestageFromRow(r) {
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

// The only source of truth for "which containers can be staged". A trip
// qualifies if it's an outward (Depot → Port) trip that has reached
// 'completed' status, and it doesn't already have an open staged record.
function prestagingEligibleTrips() {
  const staged = new Set(
    (state.db.vesselPrestaging || [])
      .filter(p => p.status === 'staged')
      .map(p => p.tripId)
  );
  return state.db.trips
    .filter(t => isOutwardWorkType(t.workType) && t.status === 'completed' && !staged.has(t.id))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
}

function prestageTripLabel(t) {
  const line = t.shippingLine ? lineName(t.shippingLine) : '—';
  return `${t.container} — ${t.ctype || '—'} · ${line}${t.outwardType ? ' · ' + t.outwardType : ''}`;
}

function canManagePrestaging() { return isAdmin() || isDispatch() || isClerk(); }

let _prestageFilter = 'staged';

function filterPrestaging(f, btn) {
  _prestageFilter = f;
  document.querySelectorAll('#sec-prestaging .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPrestagingList(f);
}

function renderPrestaging(f) {
  _prestageFilter = f || _prestageFilter;
  renderPrestagingKpis();
  renderPrestagingList(_prestageFilter);
}

function renderPrestagingKpis() {
  const all = state.db.vesselPrestaging || [];
  const staged  = all.filter(p => p.status === 'staged').length;
  const loaded  = all.filter(p => p.status === 'loaded').length;
  const shutout = all.filter(p => p.status === 'shutout').length;
  const el = document.getElementById('prestagingKpis');
  if (!el) return;
  el.innerHTML = [
    kpiCard('Awaiting Vessel Loading', staged, 'Staged, not yet loaded', 'kpi-gold'),
    kpiCard('Loaded', loaded, 'Confirmed on board', 'kpi-green'),
    kpiCard('Shutouts', shutout, 'Missed their vessel', 'kpi-red'),
    kpiCard('Eligible Containers', prestagingEligibleTrips().length, 'Arrived at port, not yet staged', 'kpi-blue'),
  ].join('');
}

function renderPrestagingList(f) {
  const all = state.db.vesselPrestaging || [];
  const items = (f === 'all' ? all : all.filter(p => p.status === f))
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const el = document.getElementById('prestagingList');
  if (!el) return;
  el.innerHTML = items.map(prestageCard).join('') ||
    '<div class="empty-state"><div class="empty-state-icon">🚢</div><div class="empty-state-label">No prestaging records in this filter</div></div>';
}

function prestageCard(p) {
  const line = p.line ? lineName(p.line) : '—';
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong class="mono" style="color:var(--gold)">${esc(p.container)}</strong>
        <div style="font-size:11px;color:var(--text-3)">${esc(p.origin || '—')} → ${esc(p.destination || '—')}</div>
        <div style="font-size:10px;color:var(--text-3)">${esc(p.vessel || 'Vessel TBC')}${p.voyage ? ' · Voyage ' + esc(p.voyage) : ''} · ${line}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${sbadge(p.status)}
        <div class="dqi-time">${timeAgo(p.createdAt)}</div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:11px;color:var(--text-2);display:flex;gap:14px;flex-wrap:wrap">
      <span>🚚 ${truckName(p.truckId)}</span>
      <span>👤 ${driverName(p.driverId)}</span>
      ${p.plannedDate ? `<span>📅 ${fmtDate(p.plannedDate)}${p.shift ? ' · ' + esc(p.shift) : ''}</span>` : ''}
      ${p.consignee ? `<span>🏷 ${esc(p.consignee)}</span>` : ''}
    </div>
    ${p.notes ? `<div style="margin-top:8px;font-size:10.5px;color:var(--text-3);font-style:italic">${esc(p.notes)}</div>` : ''}
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="modal-btn ghost" onclick="showPrestageDetail('${p.id}')">View / Manage</button>
    </div>
  </div>`;
}

function showAddPrestageModal() {
  if (!canManagePrestaging()) { toast('You do not have permission to stage containers', 'error'); return; }
  const eligible = prestagingEligibleTrips();
  const portLocations = (window.bookingDocs && window.bookingDocs.PORT_LOCATIONS) || [];
  const portOptions = portLocations.map(loc => `<option value="${sanitize(loc)}">${sanitize(loc)}</option>`).join('');
  openModal('Prestake Container for Vessel Loading', `
    ${!eligible.length ? '<div class="ops-notice" style="margin-bottom:12px">No containers are currently eligible. A container must have a completed Depot → Port outward trip that hasn\u2019t already been staged.</div>' : ''}
    <div class="fg"><label>Container <span class="label-optional">(only completed Depot → Port arrivals shown)</span></label>
      <select id="ps_trip" onchange="onPrestageTripChange()">
        <option value="">— Select container —</option>
        ${eligible.map(t => `<option value="${t.id}">${esc(prestageTripLabel(t))}</option>`).join('')}
      </select>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Driver <span class="label-optional">(vessel-side movement)</span></label><select id="ps_driver"><option value="">Select driver…</option>${state.db.drivers.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
      <div class="fg"><label>Truck</label><select id="ps_truck"><option value="">Select truck…</option>${state.db.trucks.map(t => `<option value="${t.id}">${esc(t.reg)}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Vessel Name</label><input id="ps_vessel" placeholder="e.g. MV Maersk Emerald"/></div>
      <div class="fg"><label>Voyage No. <span class="label-optional">(optional)</span></label><input id="ps_voyage" placeholder="e.g. 234W"/></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Consignee / Account <span class="label-optional">(optional)</span></label><input id="ps_consignee" placeholder="e.g. ABC Exporters Ltd"/></div>
      <div class="fg"><label>Shipping Line</label><select id="ps_line"><option value="">Select…</option>${state.db.shippingLines.filter(l => l.active).map(l => `<option value="${l.id}">${l.code} — ${esc(l.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Planned Date <span class="label-optional">(optional)</span></label><input type="date" id="ps_date"/></div>
      <div class="fg"><label>Shift <span class="label-optional">(optional)</span></label><select id="ps_shift"><option value="">Select shift…</option><option>Day</option><option>Night</option></select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Origin</label><select id="ps_origin"><option value="">Select origin…</option>${portOptions}</select></div>
      <div class="fg"><label>Destination / Berth <span class="label-optional">(optional)</span></label><input id="ps_dest" placeholder="e.g. Berth 12, KPA Container Terminal 2"/></div>
    </div>
    <div class="fg"><label>Remarks / Instructions <span class="label-optional">(optional)</span></label><textarea id="ps_notes" rows="2" placeholder="Gate pass reference, priority, special handling, expected time…"></textarea></div>
    <button class="submit-btn" onclick="savePrestage()">Save Prestaking →</button>
  `);
}


function onPrestageTripChange() {
  const tripEl = document.getElementById('ps_trip');
  const trip = tripEl && state.db.trips.find(t => t.id === tripEl.value);
  if (!trip) return;
  const lineEl = document.getElementById('ps_line');
  if (lineEl && trip.shippingLine && !lineEl.value) lineEl.value = trip.shippingLine;
  const originEl = document.getElementById('ps_origin');
  if (originEl && trip.dest && !originEl.value) {
    const hasOpt = [...originEl.options].some(o => o.value === trip.dest);
    if (hasOpt) originEl.value = trip.dest;
  }
}

function savePrestage() {
  const tripEl = document.getElementById('ps_trip');
  const tripId = tripEl ? tripEl.value : '';
  if (!tripId) { toast('Select a container first', 'error'); return; }

  const trip = state.db.trips.find(t => t.id === tripId);
  if (!trip) { toast('That trip could not be found — refresh and try again', 'error'); return; }
  if (!isOutwardWorkType(trip.workType) || trip.status !== 'completed') {
    toast('This container is no longer eligible — it must be a completed Depot → Port arrival', 'error');
    return;
  }
  const alreadyStaged = (state.db.vesselPrestaging || []).some(p => p.tripId === tripId && p.status === 'staged');
  if (alreadyStaged) { toast('This container already has an open prestaging record', 'error'); return; }

  const vessel = sanitize(document.getElementById('ps_vessel').value.trim());
  if (!vessel) { toast('Vessel name is required', 'error'); return; }
  const voyage = sanitize(document.getElementById('ps_voyage').value.trim());

  const p = {
    id: uid('PSTG'),
    tripId,
    container: trip.container,
    ctype: trip.ctype || '',
    line: document.getElementById('ps_line').value || trip.shippingLine || '',
    driverId: document.getElementById('ps_driver').value || '',
    truckId: document.getElementById('ps_truck').value || '',
    vessel, voyage,
    consignee: sanitize(document.getElementById('ps_consignee').value.trim()),
    plannedDate: document.getElementById('ps_date').value || '',
    shift: document.getElementById('ps_shift').value || '',
    origin: document.getElementById('ps_origin').value || trip.dest || '',
    destination: sanitize(document.getElementById('ps_dest').value.trim()),
    notes: sanitize(document.getElementById('ps_notes').value.trim()),
    status: 'staged',
    createdBy: state.profile.username,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    shutoutId: null,
    _dirty: true,
  };
  state.db.vesselPrestaging = state.db.vesselPrestaging || [];
  state.db.vesselPrestaging.push(p);
  scheduleSave();
  addAudit(state.profile.username, 'Container Prestaged', `${p.container} → ${vessel}${voyage ? ' / ' + voyage : ''}`);
  closeModal();
  renderPrestaging('staged');
  buildBadges();
  toast(`${p.container} staged for vessel loading`, 'success');
}

function showPrestageDetail(id) {
  const p = (state.db.vesselPrestaging || []).find(x => x.id === id);
  if (!p) return;
  const line = p.line ? lineName(p.line) : '—';
  const canAct = canManagePrestaging() && p.status === 'staged';
  openModal(`Prestaging — ${p.container}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div class="fg" style="margin:0"><label>Container</label><div class="mono" style="color:var(--gold);font-size:13px">${esc(p.container)}</div></div>
      <div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${esc(p.ctype || '—')}</div></div>
      <div class="fg" style="margin:0"><label>Vessel</label><div style="font-size:12px;color:var(--text)">${esc(p.vessel || '—')}</div></div>
      <div class="fg" style="margin:0"><label>Voyage</label><div style="font-size:12px;color:var(--text)">${esc(p.voyage || '—')}</div></div>
      <div class="fg" style="margin:0"><label>Shipping Line</label><div style="font-size:12px;color:var(--text)">${line}</div></div>
      <div class="fg" style="margin:0"><label>Consignee / Account</label><div style="font-size:12px;color:var(--text)">${esc(p.consignee || '—')}</div></div>
      <div class="fg" style="margin:0"><label>Driver</label><div style="font-size:12px;color:var(--text)">${driverName(p.driverId)}</div></div>
      <div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(p.truckId)}</div></div>
      <div class="fg" style="margin:0"><label>Origin</label><div style="font-size:12px;color:var(--text)">${esc(p.origin || '—')}</div></div>
      <div class="fg" style="margin:0"><label>Destination</label><div style="font-size:12px;color:var(--text)">${esc(p.destination || '—')}</div></div>
      <div class="fg" style="margin:0"><label>Planned Date</label><div style="font-size:12px;color:var(--text)">${p.plannedDate ? fmtDate(p.plannedDate) : '—'}${p.shift ? ' · ' + esc(p.shift) : ''}</div></div>
      <div class="fg" style="margin:0"><label>Status</label><div>${sbadge(p.status)}</div></div>
    </div>
    ${p.notes ? `<div class="ops-notice">${esc(p.notes)}</div>` : ''}
    ${p.shutoutId ? `<div class="ops-notice" style="margin-top:10px">This container's prestaging was converted to a Shutout record — see the Shutout section for details.</div>` : ''}
    <div style="font-size:10px;color:var(--text-3);margin-top:10px">Staged by ${esc(p.createdBy || '—')} · ${timeAgo(p.createdAt)}</div>
    ${canAct ? `<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="modal-btn success" onclick="markPrestageLoaded('${p.id}')">✓ Mark Loaded on Vessel</button>
      <button class="modal-btn danger" onclick="promptPrestageShutout('${p.id}')">⚠ Report Shutout</button>
      <button class="modal-btn ghost" onclick="cancelPrestage('${p.id}')">Cancel Record</button>
    </div>` : (p.status !== 'staged' ? '<div style="font-size:11px;color:var(--text-3);margin-top:10px">This record is resolved — no further changes.</div>' : '')}
  `);
}

function markPrestageLoaded(id) {
  const p = (state.db.vesselPrestaging || []).find(x => x.id === id);
  if (!p) return;
  if (!canManagePrestaging()) { toast('You do not have permission to update this record', 'error'); return; }
  if (p.status !== 'staged') { toast('This record is already resolved', 'error'); return; }
  p.status = 'loaded';
  p.resolvedAt = new Date().toISOString();
  p._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Container Loaded on Vessel', `${p.container} — ${p.vessel || 'vessel'}${p.voyage ? ' / ' + p.voyage : ''}`);
  closeModal();
  renderPrestaging(_prestageFilter);
  buildBadges();
  toast(`${p.container} marked loaded`, 'success');
}

function promptPrestageShutout(id) {
  const p = (state.db.vesselPrestaging || []).find(x => x.id === id);
  if (!p) return;
  if (!canManagePrestaging()) { toast('You do not have permission to update this record', 'error'); return; }
  if (p.status !== 'staged') { toast('This record is already resolved', 'error'); return; }
  openModal('Report Shutout', `
    <div class="ops-notice" style="margin-bottom:10px">This moves ${esc(p.container)} into the Shutout register as having missed its vessel.</div>
    <div class="fg"><label>Reason (required)</label><textarea id="psShutoutReason" rows="3" placeholder="e.g. Vessel closed early, container arrived late…"></textarea></div>
    <button class="submit-btn" onclick="confirmPrestageShutout('${id}')">Confirm Shutout →</button>
  `);
}

function confirmPrestageShutout(id) {
  const p = (state.db.vesselPrestaging || []).find(x => x.id === id);
  if (!p) return;
  if (p.status !== 'staged') { toast('This record is already resolved', 'error'); return; }
  const reasonEl = document.getElementById('psShutoutReason');
  const reason = (reasonEl && reasonEl.value || '').trim();
  if (!reason) { toast('A reason is required', 'error'); return; }

  const shutout = {
    id: uid('SHT'), container: p.container,
    line: p.line || '', vessel: p.vessel || '', voyage: p.voyage || '',
    reason: sanitize(reason), truckId: p.truckId || '', driverId: p.driverId || '',
    notes: `Auto-logged from Prestaging record ${p.id}.${p.notes ? ' ' + p.notes : ''}`,
    date: new Date().toISOString(), status: 'open',
    _dirty: true,
  };
  state.db.shutouts.push(shutout);

  p.status = 'shutout';
  p.shutoutId = shutout.id;
  p.resolvedAt = new Date().toISOString();
  p._dirty = true;

  scheduleSave();
  addAudit(state.profile.username, 'Prestaging Shutout', `${p.container} — ${reason}`);
  closeModal();
  renderPrestaging(_prestageFilter);
  buildBadges();
  if (typeof refreshContainerHistory === 'function') refreshContainerHistory();
  toast(`${p.container} moved to Shutout register`, 'warning');
}

function cancelPrestage(id) {
  const p = (state.db.vesselPrestaging || []).find(x => x.id === id);
  if (!p) return;
  if (!canManagePrestaging()) { toast('You do not have permission to update this record', 'error'); return; }
  if (p.status !== 'staged') { toast('This record is already resolved', 'error'); return; }
  if (!confirm(`Cancel the prestaging record for ${p.container}? The container will become available to stage again.`)) return;
  p.status = 'cancelled';
  p.resolvedAt = new Date().toISOString();
  p._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Prestaging Cancelled', p.container);
  closeModal();
  renderPrestaging(_prestageFilter);
  buildBadges();
  toast('Prestaging record cancelled', 'info');
}