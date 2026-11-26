'use strict';


/* Form Designer custom fields for the dispatch form (stored in cf_* columns of trips; empty until an administrator adds fields). */
function gxTripCustomOut(t) { try { return (window.GargoForms && GargoForms.tripOut) ? GargoForms.tripOut(t && t.custom) : {}; } catch (e) { return {}; } }
function gxTripCustomIn(r)  { try { return (window.GargoForms && GargoForms.tripIn) ? GargoForms.tripIn(r) : {}; } catch (e) { return {}; } }

function gxKgOut(v) { return (v === '' || v == null || !isFinite(Number(v)) || Number(v) <= 0) ? null : Number(v); }
function tripToRow(t)  { return { id:t.id, truck_id:t.truckId||null, driver_id:t.driverId||null, container:t.container, container_type:t.ctype, work_type:t.workType, outward_type:t.outwardType||null, origin:t.origin, destination:t.dest, shipping_line_id:t.shippingLine||null, status:t.status, start_time:t.startTime, eta:t.eta, distance:t.distance, priority:t.priority, notes:t.notes, reference:t.ref, container_images:JSON.stringify(t.containerImages||[]), booking_id:t.bookingId||null, storage_zone_id:t.storageZoneId||null, storage_teu:t.storageTeu||null, storage_released:!!t.storageReleased, eir_number:t.eirNumber||null, receiving_party:t.receivingParty||null, release_order_no:t.releaseOrderNo||null, vessel:t.vessel||null, voyage:t.voyage||null, date_out:t.dateOut||null, trailer_no:t.trailerNo||null, transporter:t.transporter||null, driver_name_text:t.driverNameText||null, driver_id_no:t.driverIdNo||null, driver_phone:t.driverPhone||null, mgw_kg:gxKgOut(t.mgwKg), tare_kg:gxKgOut(t.tareKg), flagged_for_review:!!t.flaggedForReview, flag_reasons:JSON.stringify(t.flagReasons||[]), duplicate_of_id:t.duplicateOfId||null, import_batch_id:t.importBatchId||null, ...gxTripCustomOut(t) }; }

function tripFromRow(r){ let imgs=[]; try{ imgs = r.container_images ? JSON.parse(r.container_images) : []; }catch(e){ imgs=[]; } let flagReasons=[]; try{ flagReasons = r.flag_reasons ? (typeof r.flag_reasons==='string' ? JSON.parse(r.flag_reasons) : r.flag_reasons) : []; }catch(e){ flagReasons=[]; } return { id:r.id, truckId:r.truck_id, driverId:r.driver_id, container:r.container, ctype:r.container_type, workType:r.work_type, outwardType:r.outward_type||null, origin:r.origin, dest:r.destination, shippingLine:r.shipping_line_id, status:r.status, startTime:r.start_time, eta:r.eta, distance:r.distance, priority:r.priority, notes:r.notes, ref:r.reference, containerImages:imgs, bookingId:r.booking_id||null, storageZoneId:r.storage_zone_id||null, storageTeu:r.storage_teu||null, storageReleased:!!r.storage_released, eirNumber:r.eir_number||'', receivingParty:r.receiving_party||'', releaseOrderNo:r.release_order_no||'', vessel:r.vessel||'', voyage:r.voyage||'', dateOut:r.date_out||null, trailerNo:r.trailer_no||'', transporter:r.transporter||'', driverNameText:r.driver_name_text||'', driverIdNo:r.driver_id_no||'', driverPhone:r.driver_phone||'', mgwKg:(r.mgw_kg==null?'':r.mgw_kg), tareKg:(r.tare_kg==null?'':r.tare_kg), flaggedForReview:!!r.flagged_for_review, flagReasons, duplicateOfId:r.duplicate_of_id||null, importBatchId:r.import_batch_id||null, custom: gxTripCustomIn(r) }; }

function isOutwardWorkType(workType) { return workType === 'Depot → Port'; }

const TERMINAL_TRIP_STATUSES = ['completed'];

function isTripLive(t) { return !TERMINAL_TRIP_STATUSES.includes(t.status); }

function findLiveTripByContainer(cont, excludeTripId) {
  if (!cont) return null;
  const c = cont.trim().toUpperCase();
  return state.db.trips.find(t => t.id !== excludeTripId && isTripLive(t) && (t.container || '').toUpperCase() === c) || null;
}

const ISO6346_LETTER_VALUES = {
  A:10,B:12,C:13,D:14,E:15,F:16,G:17,H:18,I:19,J:20,K:21,L:23,M:24,N:25,
  O:26,P:27,Q:28,R:29,S:30,T:31,U:32,V:34,W:35,X:36,Y:37,Z:38,
};

function iso6346CheckDigit(first10) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = first10[i];
    const val = /[0-9]/.test(ch) ? parseInt(ch, 10) : ISO6346_LETTER_VALUES[ch];
    if (val === undefined) return null;
    sum += val * Math.pow(2, i);
  }
  const rem = sum % 11;
  return rem === 10 ? 0 : rem;
}

function containerFormatIssue(cont) {
  const c = (cont || '').trim().toUpperCase();
  if (!c) return 'Container number is required';
  if (c.length !== 11) return `Must be 11 characters (owner code + serial + check digit) — got ${c.length}`;
  if (!/^[A-Z]{3}/.test(c)) return 'First 3 characters must be letters (owner code)';
  if (!/^[A-Z]{3}[UJZ]/.test(c)) return "4th character must be U, J, or Z (equipment category)";
  if (!/^[A-Z]{4}\d{6}\d$/.test(c)) return 'Characters 5–11 must be digits (serial number + check digit)';
  const expected = iso6346CheckDigit(c.slice(0, 10));
  const actual = parseInt(c[10], 10);
  if (expected === null) return 'Could not compute check digit';
  if (expected !== actual) {
    const mode = (window.cfgGet && window.cfgGet('ops.checkDigit')) || 'block';   // optional System Settings: block | warn | off
    const msg = `Check digit should be ${expected}, not ${actual} — verify the container number`;
    if (mode === 'off') return null;
    if (mode === 'warn') { window.__cdWarned = window.__cdWarned || new Set(); if (!window.__cdWarned.has(c)) { window.__cdWarned.add(c); if (window.toast) toast(c + ': ' + msg + ' (allowed by your settings)', 'warning', 6000); } return null; }
    return msg;
  }
  return null;
}

function isValidContainerFormat(cont) {
  return containerFormatIssue(cont) === null;
}

function markContainerValidity(el) {
  const start = el.selectionStart, end = el.selectionEnd;
  el.value = el.value.toUpperCase();
  if (el.setSelectionRange) el.setSelectionRange(start, end);
  const v = el.value.trim();
  el.classList.remove('input-valid', 'input-invalid');
  if (v.length < 4) return;
  el.classList.add(isValidContainerFormat(v) ? 'input-valid' : 'input-invalid');
}

let _tripFilter='active';

function filterTrips(f,btn){ _tripFilter=f; document.querySelectorAll('#sec-trips .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderTrips(f); }

function renderTrips(f){
  let trips=state.db.trips;
  if(f==='flagged') trips=trips.filter(t=>t.flaggedForReview);
  else if(f!=='all') trips=trips.filter(t=>t.status===f);
  const el=document.getElementById('tripsList');
  if(!el) return;
  const _total = trips.length;
  // PERF: newest first, one page at a time (completed/all used to draw every trip in the 90-day window)
  trips = trips.map(t=>[+new Date(t.startTime)||0,t]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]).slice(0, gxPageLimit('trips', f, 40, ()=>renderTrips(_tripFilter)));
  el.innerHTML=trips.map(t=>`<div class="trip-card status-${t.status}" onclick="showTripDetail('${t.id}')"><div class="trip-card-head"><div class="trip-route">${t.origin}<span class="arrow">→</span>${t.dest}</div>${sbadge(t.status)}${t.flaggedForReview?`<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${esc((t.flagReasons||[]).join('; '))}">⚠ Flagged</span>`:''}</div><div class="trip-meta"><span>🚛 ${truckName(t.truckId)}</span><span>👤 ${driverName(t.driverId)}</span><span class="mono" style="font-size:10.5px;color:var(--gold)">${t.container}</span><span>${t.ctype} · ${t.workType}${t.outwardType ? ' · ' + sanitize(t.outwardType) : ''}</span><span>🕐 Started ${timeAgo(t.startTime)} · ETA ${fmtTime(t.eta)}</span><span>${t.distance}km · ${sbadge(t.priority.toLowerCase())}</span></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-label">No trips in this filter</div></div>';
  el.innerHTML += gxPageFooter('trips', trips.length, _total);
}

function showTripDetail(id) {
  const t = state.db.trips.find(t=>t.id===id);
  if (!t) return;
  const line = state.db.shippingLines.find(l=>l.id===t.shippingLine);
  const needsDispatch = isTripLive(t) && (!t.truckId || !t.driverId);
  const gallery = Array.isArray(t.containerImages) && t.containerImages.length
    ? `<div style="margin-bottom:14px"><div class="fg" style="margin:0 0 6px"><label>Container Photos (${t.containerImages.length})</label></div><div class="container-img-grid">${t.containerImages.map(src=>`<div class="container-img-thumb view-only"><img src="${src}" onclick="window.open('${src}','_blank')" /></div>`).join('')}</div></div>`
    : '';
  openModal(`Trip — ${t.container}`, `${needsDispatch ? `<div class="ops-notice" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>This trip is awaiting a truck/driver assignment.</span><button class="modal-btn primary" onclick="closeModal();jumpToCompleteDispatch('${t.id}')">Complete in Dispatch →</button></div>` : ''}${gallery}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Container</label><div class="mono" style="color:var(--gold);font-size:13px">${t.container}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.ctype}</div></div><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(t.truckId)}</div></div><div class="fg" style="margin:0"><label>Driver</label><div style="font-size:12px;color:var(--text)">${driverName(t.driverId)}</div></div><div class="fg" style="margin:0"><label>Origin</label><div style="font-size:12px;color:var(--text)">${t.origin}</div></div><div class="fg" style="margin:0"><label>Destination</label><div style="font-size:12px;color:var(--text)">${t.dest}</div></div><div class="fg" style="margin:0"><label>Work Type</label><div style="font-size:12px;color:var(--text)">${t.workType}</div></div>${t.outwardType ? `<div class="fg" style="margin:0"><label>Outward Type</label><div style="font-size:12px;color:var(--gold)">${sanitize(t.outwardType)}</div></div>` : ''}<div class="fg" style="margin:0"><label>Distance</label><div style="font-size:12px;color:var(--text)">${t.distance} km</div></div><div class="fg" style="margin:0"><label>Started</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.startTime)}</div></div><div class="fg" style="margin:0"><label>ETA</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.eta)}</div></div><div class="fg" style="margin:0"><label>Shipping Line</label><div style="font-size:12px;color:var(--text)">${line?line.name:'—'}</div></div><div class="fg" style="margin:0"><label>Priority</label><div>${sbadge(t.priority.toLowerCase())}</div></div><div class="fg" style="margin:0"><label>Reference</label><div class="mono" style="font-size:11px;color:var(--text-2)">${t.ref}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(t.status)}</div></div></div>${t.notes?`<div class="ops-notice">${t.notes}</div>`:''}${t.flaggedForReview?`<div class="ops-notice" style="margin-top:10px"><div style="margin-bottom:6px">⚠ Flagged on import: ${esc((t.flagReasons||[]).join('; '))}</div><button class="modal-btn ghost" onclick="clearReviewFlag('trips','${t.id}');closeModal()">✓ Mark Reviewed</button></div>`:''}${canUpdateTripStatus(t)?`<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:10px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip Step Update ${t.status==='completed'?'— trip complete, no further changes':'(forward only)'}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${nextTripStatuses(t.status).length ? nextTripStatuses(t.status).map(s=>`<button class="filter-btn" onclick="quickSetTripStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('') : '<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>'}</div>${isAdmin()?adminDeleteBtn('trips', id):''}</div>`:''}`);
}

const TRIP_STATUS_RANK = { active:0, loaded:1, on_trip:2, delayed:2, breakdown:2, offloaded:3, completed:4 };

const TRIP_ALL_STATUSES = Object.keys(TRIP_STATUS_RANK);

function canTransitionTripStatus(from, to) {
  if (!(from in TRIP_STATUS_RANK) || !(to in TRIP_STATUS_RANK)) return false;
  if (from === to) return false;               
  if (from === 'completed') return false;         
  return TRIP_STATUS_RANK[to] >= TRIP_STATUS_RANK[from];
}

function nextTripStatuses(currentStatus) {
  return TRIP_ALL_STATUSES.filter(s => canTransitionTripStatus(currentStatus, s));
}

function canUpdateTripStatus(t) {
  if (!t) return false;
  if (isAdmin() || isClerk() || isDispatch()) return true;
  if (isDriver()) { const d = myDriverRecord(); return !!d && t.driverId === d.id; }
  return false;
}

/* ── Automatic outward interchange ─────────────────────────────────────────────
   Completing an outward dispatch (Depot → Port) issues its Gate-Out interchange (EIR) straight away, carrying the
   dispatch details and the container photos. The record's id is DERIVED from the trip id, so it can exist only once:
   saving the same dispatch again, completing the trip later, or a retry all find it and stop. */
function gxOutwardIcId(tripId) {
  const s = String(tripId || '').toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return null;
  return (15 - parseInt(s.charAt(0), 16)).toString(16) + s.slice(1);
}
function gxOutIcIds() {
  const set = new Set();
  (state.db.interchange || []).forEach(i => { if (/Out$/.test(i.type || '')) set.add(String(i.id).toLowerCase()); });
  return set;
}
/* ── Inward EIR lookup ───────────────────────────────────────────────────────
   The newest inward interchange (Gate-In / Depot-In) that has an EIR number for a container. Interchange rows are loaded
   on demand, so ask the database when the container is not already in memory. */
async function gxInwardEirFor(container) {
  const key = normContainerKey(container);
  if (!key) return null;
  let rows = (state.db.interchange || []).filter(i => normContainerKey(i.container) === key);
  if (!rows.some(i => isInwardMovement(i.type) && i.eirNumber) && window.ICR && ICR.enabled && navigator.onLine) {
    try { rows = rows.concat(await ICR.byContainer(String(container).trim().toUpperCase())); } catch (e) { /* offline or not found: carry on without it */ }
  }
  const inward = rows.filter(i => isInwardMovement(i.type) && i.eirNumber).sort((a, b) => new Date(b.date) - new Date(a.date));
  const ic = inward[0] || null;
  if (ic) { const t0 = new Date(ic.date).getTime(); ic._gxInYard = !rows.some(i => /Out$/.test(i.type || '') && new Date(i.date).getTime() >= t0); }   // still in storage = no exit after it came in
  return ic;
}

/* Dispatch console: when the container already has an inward EIR, load what that EIR knows into the form:
   the inward EIR number (read-only), size/type, shipping line, vessel, voyage and B/L. A container that is still in
   storage is switched to Depot → Port (the outward move). The outward EIR number is NOT copied: the outward EIR gets
   its own number when the dispatch is saved or completed.
   soft = true (editing an existing trip): only fill fields that are still empty. */
async function dispatchPrefillFromEir(soft) {
  const input = document.getElementById('d_container'), box = document.getElementById('d_eir_info');
  if (!input) return;
  const el = id => document.getElementById(id);
  const clear = () => { if (box) { box.style.display = 'none'; box.innerHTML = ''; } const f = el('d_ineir'), v = el('d_ineir_view'); if (f) { f.value = ''; delete f.dataset.icId; } if (v) v.style.display = 'none'; };
  const cont = input.value.trim().toUpperCase();
  if (cont.length < 10) { clear(); return; }
  if (input.dataset.eirFor === cont && soft !== true) return;      // already loaded for this container (blur fires after change)
  const ic = await gxInwardEirFor(cont);
  if (input.value.trim().toUpperCase() !== cont) return;           // the clerk kept typing while we looked it up
  input.dataset.eirFor = cont;
  try { await dispatchAutofillWeights(false, ic, soft === true); } catch (e) { console.warn('weights autofill:', e && e.message); }   // MGW / tare: inward survey, EIR or an earlier dispatch
  if (input.value.trim().toUpperCase() !== cont) return;
  if (!ic) { clear(); return; }
  const empty = id => { const e = el(id); return !!e && !String(e.value || '').trim(); };
  const setIf = (id, val) => { const e = el(id); if (e && val && (soft !== true || empty(id))) e.value = val; };
  const f = el('d_ineir'), v = el('d_ineir_view');
  if (f) { f.value = ic.eirNumber || ''; f.dataset.icId = ic.id; }
  if (v) v.style.display = '';
  if (ic.ctype && soft !== true) populateSizeTypeSelects('d_size', 'd_type', ic.ctype);
  if (ic.line && el('d_line') && [...el('d_line').options].some(o => o.value === ic.line) && (soft !== true || empty('d_line'))) el('d_line').value = ic.line;
  setIf('d_vessel', ic.vessel);
  setIf('d_voyage', ic.voyage);
  setIf('d_ref', ic.guaranteeNo || ic.blNumber);
  setIf('d_receiving', ic.receivingParty);
  const wt = el('d_worktype');
  if (soft !== true && ic._gxInYard && wt && wt.value === 'Port → Depot') {         // untouched default + container is in storage: it is leaving
    wt.value = 'Depot → Port'; toggleDispatchOutwardType();
    setIf('d_origin', 'Depot'); setIf('d_dest', 'Kilindini Port');
  }
  if (box) {
    box.style.display = 'flex';
    box.innerHTML = `<span style="flex:1;min-width:0"><strong>Inward EIR ${esc(ic.eirNumber)}</strong> found for ${esc(cont)} (${esc(ic.type)}, ${esc(fmtDate(ic.date))}${ic.condition ? ', ' + esc(ic.condition) : ''}${ic._gxInYard ? ', in storage' : ''}). Size/type, shipping line, vessel, voyage and B/L were filled in from it. The outward EIR is issued automatically when this dispatch is saved or completed.</span>`;
  }
}
function dispatchViewInwardEir() {
  const f = document.getElementById('d_ineir'); if (f && f.dataset.icId && window.GargoDocs) GargoDocs.eir(f.dataset.icId, 'preview');
}

/* "Pick from storage": containers that are in the yard right now (server search when interchange is loaded on demand) */
let _dpsT = null;
function dispatchPickFromStorage() {
  openModal('Containers in storage', '<div class="fg"><input id="dps_q" placeholder="Search container, vessel or EIR…" oninput="dispatchStorageSearch()" autocomplete="off" /></div><div id="dps_list"></div>');
  dispatchStorageSearch(true);
  setTimeout(() => { const q = document.getElementById('dps_q'); if (q) q.focus(); }, 60);
}
function dispatchStorageSearch(now) { clearTimeout(_dpsT); _dpsT = setTimeout(dispatchStorageRun, now === true ? 0 : 250); }
async function dispatchStorageRun() {
  const list = document.getElementById('dps_list'); if (!list) return;
  const q = ((document.getElementById('dps_q') || {}).value || '').trim();
  list.innerHTML = '<div class="empty-state-label" style="padding:12px 0">Loading…</div>';
  let items = [];
  try {
    if (window.ICR && ICR.enabled && navigator.onLine) items = (await ICR.yard({ q, limit: 40 })).items;
    else { const ql = q.toLowerCase(); items = (state.db.interchange || []).filter(i => typeof icInYard === 'function' && icInYard(i) && (!ql || [i.container, i.vessel, i.eirNumber].join(' ').toLowerCase().indexOf(ql) > -1)).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 40); }
  } catch (e) { list.innerHTML = '<div class="empty-state-label" style="padding:12px 0">Could not load the yard list. Check your connection.</div>'; return; }
  if (!document.getElementById('dps_list')) return;
  if (!items.length) { list.innerHTML = '<div class="empty-state-label" style="padding:12px 0">No containers in storage match.</div>'; return; }
  const code = id => { const l = (state.db.shippingLines || []).find(x => x.id === id); return l ? (l.code || l.name) : ''; };
  const age = d => { const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return isNaN(n) ? '' : n + ' d in yard'; };
  list.innerHTML = items.map(i => `<div class="activity-row" style="cursor:pointer;gap:10px" onclick="dispatchUseStorageContainer('${esc(i.container)}')"><div style="flex:1;min-width:0"><div class="mono" style="color:var(--gold);font-weight:600">${esc(i.container)}</div><div style="font-size:10.5px;color:var(--text-3)">${esc(i.ctype || '')} ${code(i.line) ? '· ' + esc(code(i.line)) : ''} ${i.vessel ? '· ' + esc(i.vessel) : ''} · ${i.eirNumber ? 'EIR ' + esc(i.eirNumber) : 'awaiting survey'} · ${esc(age(i.date))}</div></div><span style="font-size:11px;color:var(--text-2)">Use →</span></div>`).join('');
}
function dispatchUseStorageContainer(c) {
  closeModal();
  const el = document.getElementById('d_container'); if (!el) return;
  el.value = c; delete el.dataset.eirFor;
  try { markContainerValidity(el); } catch (e) {}
  dispatchPrefillFromEir();
}
/* typing a container number: also offer the ones in storage (on-demand interchange means they are not all in memory) */
let _dlT = null;
document.addEventListener('input', ev => {
  const el = ev.target; if (!el || el.id !== 'd_container') return;
  clearTimeout(_dlT); const q = el.value.trim();
  _dlT = setTimeout(async () => {
    if (q.length >= 3 && window.ICR && ICR.enabled && navigator.onLine) {
      try {
        const r = await ICR.yard({ q, limit: 12 }), dl = document.getElementById('containerHistory');
        if (dl && el.value.trim() === q) { const have = new Set([...dl.options].map(o => o.value)); r.items.forEach(i => { if (!have.has(i.container)) dl.insertAdjacentHTML('beforeend', `<option value="${esc(i.container)}">In storage${i.eirNumber ? ' · EIR ' + esc(i.eirNumber) : ''}</option>`); }); }
      } catch (e) { /* the list is a convenience */ }
    }
    if (el.value.trim().length >= 11) dispatchPrefillFromEir();     // a full container number (typed or chosen from the list)
  }, 300);
}, true);

const _outIcBusy = new Set();

async function ensureOutwardInterchange(t) {
  if (!t || !isOutwardWorkType(t.workType) || !t.container) return { skipped: true };
  const id = gxOutwardIcId(t.id);
  if (!id || _outIcBusy.has(id)) return { skipped: true };
  _outIcBusy.add(id);
  const cont = String(t.container).trim().toUpperCase();
  try {
    if (gxOutIcIds().has(id)) return { exists: true };
    if (navigator.onLine) {                                   // interchange rows are loaded on demand, so ask the database too
      const { data } = await supabase.from('interchange').select('id').eq('id', id).maybeSingle();
      if (data) return { exists: true };
    }
    const date = t.dateOut || new Date().toISOString();
    if (findDuplicateInterchange(cont, 'Gate-Out', date)) return { exists: true, manual: true };   // a clerk already logged this exit by hand
    const photos = (t.containerImages || []).slice(0, GX_MAX_PHOTOS);
    const inw = await gxInwardEirFor(cont);                   // the container's inward EIR, if it has one
    let rsv = null; try { if (window.GargoReserve) rsv = await GargoReserve.forContainer(cont); } catch (e) { /* the reserve is a convenience */ }   // vessel, voyage, shipper... as reserved
    const line = t.shippingLine || (inw && inw.line) || '';
    const outStatus = outwardTypeLabel(t.outwardType);        // Repat / Sale / Shipper
    const eirNumber = sanitize(t.eirNumber || '') || await nextEirNumber('Gate-Out', line);
    const rec = {
      id, container: cont, type: 'Gate-Out', ctype: t.ctype || (inw && inw.ctype) || '', line, condition: outStatus || 'Good',
      truck: t.truckId || '', driver: t.driverId || '',
      truckRegText: (() => { const x = (state.db.trucks || []).find(v => v.id === t.truckId); return x ? sanitize(x.reg || '') : ''; })(),
      driverNameText: sanitize(t.driverNameText || '') || (() => { const x = (state.db.drivers || []).find(v => v.id === t.driverId); return x ? sanitize(x.name || '') : ''; })(),
      driverIdNumber: sanitize(t.driverIdNo || '') || (() => { const d = (state.db.drivers || []).find(x => x.id === t.driverId); return d ? sanitize(d.idNo || d.id_no || '') : ''; })(),
      transporter: sanitize(t.transporter || (t.custom && t.custom.transporter) || ''), trailerNo: sanitize(t.trailerNo || (t.custom && t.custom.trailer_no) || ''),   // dispatch-form fields feed the interchange's own columns
      eirNumber, blNumber: (inw && inw.blNumber) || '', guaranteeNo: (inw && inw.guaranteeNo) || '', clerkName: (state.profile && state.profile.name) || '',
      vessel: t.vessel || (rsv && rsv.vessel) || (inw && inw.vessel) || '', voyage: t.voyage || (rsv && rsv.voyage) || (inw && inw.voyage) || '', deliveringParty: (inw && inw.deliveringParty) || '', receivingParty: t.receivingParty || (rsv && rsv.shipper_name) || '', releaseOrderNo: t.releaseOrderNo || (rsv && rsv.release_order_no) || '',
      isoCode: (inw && inw.isoCode) || '', grossWeight: (Number(t.mgwKg) > 0 ? t.mgwKg : '') || (inw && inw.grossWeight) || '', manufactureDate: (inw && inw.manufactureDate) || '', cargoStatus: (inw && inw.cargoStatus) || '',
      repairs: [], repairTotal: 0,
      notes: `Auto-issued when outward dispatch ${t.ref || String(t.id).slice(0, 8)} (${t.origin || '—'} → ${t.dest || '—'}) was completed.${outStatus ? ' Status: ' + outStatus + '.' : ''}${inw ? ' Inward EIR ' + inw.eirNumber + (inw.condition ? ' (' + inw.condition + ')' : '') + '.' : ''}${t.notes ? ' ' + t.notes : ''}`,
      date, status: 'pending', img: photos[0] || '', photos,
      _dirty: true,
    };
    const saved = await persistNewInterchange(rec);
    if (!saved.ok) return { error: saved.message };
    /* Boxes the interchange record does not carry: from the repat reserve if the container is on one (port of dispatch = final destination,
       outward date = release order date, shipper), else the dispatch's own destination. A failure here never blocks the EIR. */
    try {
      if (navigator.onLine) {
        const q = await supabase.from('repat_reserve_items').select('reserve:repat_reserves(outward_date,port_of_dispatch,shipper_name,release_order_no)').ilike('container_no', cont).limit(1);
        const rv = q.data && q.data[0] && q.data[0].reserve;
        const patch = {};
        const dest = (rv && rv.port_of_dispatch) || (t.dest && t.dest !== '—' ? t.dest : '');
        if (dest) patch.final_destination = sanitize(dest);
        if (rv && rv.outward_date) patch.release_order_date = rv.outward_date;
        if (!rec.receivingParty && rv && rv.shipper_name) { patch.receiving_party = sanitize(rv.shipper_name); rec.receivingParty = patch.receiving_party; }
        if (!rec.releaseOrderNo && rv && rv.release_order_no) { patch.release_order_no = sanitize(rv.release_order_no); rec.releaseOrderNo = patch.release_order_no; }
        if (Object.keys(patch).length) await supabase.from('interchange').update(patch).eq('id', id);
      }
    } catch (e) { console.warn('outward EIR extras:', e && e.message); }
    addAudit(state.profile.username, 'Outward Interchange Auto-Issued', `${cont} · ${eirNumber}`);
    try { buildBadges(); } catch (e) {}
    return { created: rec };
  } catch (e) {
    console.error('Auto outward interchange failed:', e && e.message, e);
    return { error: (e && e.message) || 'unknown error' };
  } finally {
    _outIcBusy.delete(id);
  }
}

function gxReportOutwardIc(r, cont) {
  if (!r) return;
  if (r.created) {
    toast(`Outward interchange issued — ${r.created.eirNumber}`, 'success', 5000);
    try { if (window.GargoDocs) GargoDocs.offerOutward(r.created); } catch (e) {}
    try { if (state.currentSection === 'interchange') renderInterchange(_icFilter || 'all'); } catch (e) {}
  } else if (r.error) {
    toast(`Dispatch saved, but the outward interchange for ${cont} could not be created (${r.error}). Create it from Interchange → New.`, 'warning', 9000);
  }
}

async function applyTripStatus(t, status, actorLabel) {
  if (!canUpdateTripStatus(t)) return { ok:false, reason:'permission' };
  if (!canTransitionTripStatus(t.status, status)) return { ok:false, reason:'transition', from:t.status };

  const old = t.status;
  const truck  = state.db.trucks.find(tr=>tr.id===t.truckId);
  const driver = state.db.drivers.find(d=>d.id===t.driverId);
  const truckSnapshot  = truck  ? { ...truck }  : null;
  const driverSnapshot = driver ? { ...driver } : null;

  t.status = status;

  let truckChanged = false, driverChanged = false;
  let newMaintenanceTicket = null;
  if (status === 'breakdown') {
    if (truck) { truck.status = 'breakdown'; truckChanged = true; }

    const existing = state.db.maintenance.find(m=>m.truckId===t.truckId && m.status!=='resolved' && m.type==='Breakdown');
    if (existing) {
      existing.reportedByDriver = existing.reportedByDriver || isDriver();
    } else {
      newMaintenanceTicket = {
        id: uid('MNT'), truckId: t.truckId, type:'Breakdown',
        desc: `Breakdown reported on trip ${t.container} (${t.origin} → ${t.dest}).`,
        priority:'critical', status:'open', date:new Date().toISOString(),
        cost:0, tech:'', resolvedDate:null, reportedByDriver: isDriver(),
      };
      state.db.maintenance.push(newMaintenanceTicket);
    }
  }
  if (status === 'completed') {
    if (truck && truck.status ==='on_trip')  { truck.status  = 'available'; truckChanged = true; }
    if (driver && driver.status==='on_trip')  { driver.status = 'available'; driverChanged = true; }
    if (driver) { driver.load = null; driver.tripsToday++; driverChanged = true; }
  }


  try {
    const writes = [ supabase.from('trips').update(tripToRow(t)).eq('id', t.id) ];
    if (truck  && truckChanged)  writes.push(supabase.from('trucks').update(truckToRow(truck)).eq('id', truck.id));
    if (driver && driverChanged) writes.push(supabase.from('drivers').update(driverToRow(driver)).eq('id', driver.id));
    const results = await Promise.all(writes);
    const failed = results.find(r => r && r.error);
    if (failed) throw failed.error;
    if (newMaintenanceTicket) {
      const { error: mErr } = await supabase.from('maintenance').insert(maintToRow(newMaintenanceTicket));
      if (mErr) throw mErr;
    }
  } catch (e) {
    console.error('Trip status save failed:', e && e.message, e);

    t.status = old;
    if (truck  && truckSnapshot)  Object.assign(truck,  truckSnapshot);
    if (driver && driverSnapshot) Object.assign(driver, driverSnapshot);
    if (newMaintenanceTicket) {
      const idx = state.db.maintenance.indexOf(newMaintenanceTicket);
      if (idx > -1) state.db.maintenance.splice(idx, 1);
    }
    buildBadges();
    return { ok:false, reason:'save', error:e, message: (e && e.message) || '' };
  }

  if (status === 'breakdown') buildAlerts();
  buildBadges();
  addAudit(actorLabel, 'Trip Status Update', `${t.container} ${old} → ${status}`);


  if (status === 'completed' && t.storageZoneId && !t.storageReleased) {
    try {
      const res = await window.bookingDocs.releaseStorageForTrip(t.id);
      if (res && res.released) t.storageReleased = true;
    } catch (e) {
      console.error('Depot storage release failed:', e && e.message, e);
      toast(`Trip completed, but couldn't auto-release depot storage — release it manually from DepOps (${(e && e.message) || 'error'})`, 'warning', 6000);
    }
  }

  if (status === 'completed' && isOutwardWorkType(t.workType)) gxReportOutwardIc(await ensureOutwardInterchange(t), t.container);

  return { ok:true, old, status };
}

async function quickSetTripStatus(id, status) {
  const t = state.db.trips.find(t=>t.id===id);
  if (!t) { toast('Trip not found', 'error'); return; }
  if (!canUpdateTripStatus(t)) { toast('You do not have permission to update this trip', 'error'); return; }
  toast('Saving…', 'info', 1200);
  const res = await applyTripStatus(t, status, state.profile.username);
  if (!res.ok) {
    if (res.reason === 'transition') {
      toast(`Cannot change status from "${res.from.replace('_',' ')}" to "${status.replace('_',' ')}" — trips can only move forward`, 'error');
    } else if (res.reason === 'save') {
      toast(res.message ? `Could not save this update — ${res.message}` : 'Could not save this update — check your connection and try again', 'error', 5000);
    } else {
      toast('You do not have permission to update this trip', 'error');
    }
    return;
  }
  closeModal();
  if (document.getElementById('tripsList')) renderTrips(_tripFilter);
  toast(`Trip updated to ${status.replace('_',' ')}`, 'success');
}

let _dpTab = 'trip';

function renderDriverPortal() {
  const p = state.profile;
  const av = document.getElementById('dp_driverAv'); if (av) av.textContent = initials(p?.name||'D');
  const nm = document.getElementById('dp_driverName'); if (nm) nm.textContent = p?.name||'Driver';
  const rl = document.getElementById('dp_driverRole'); if (rl) rl.textContent = roleLabel(p?.role);

  const body = document.getElementById('dp_body');
  if (!body) return;

  const driver = myDriverRecord();
  if (!driver) {
    body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚚</div><div class="empty-state-label">Your login isn't linked to a driver record yet. Ask an administrator to link it in Driver → Edit.</div></div>`;
    return;
  }


  checkGeoPermission().then(() => {
    if (driverShouldTrack(driver) && state.geoPermission !== 'denied') startDriverTracking();
    else if (!driverShouldTrack(driver)) stopDriverTracking();
    renderDutyBar();
  });
  renderDutyBar();

  body.innerHTML = `
    <div class="filter-row" style="margin-bottom:14px;flex-wrap:wrap">
      <button class="filter-btn${_dpTab==='trip'?' active':''}" onclick="dpSwitchTab('trip')">My Trip</button>
      <button class="filter-btn${_dpTab==='completed'?' active':''}" onclick="dpSwitchTab('completed')">Completed Trips</button>
      <button class="filter-btn${_dpTab==='fuel'?' active':''}" onclick="dpSwitchTab('fuel')">Fuel Log</button>
      <button class="filter-btn${_dpTab==='requisitions'?' active':''}" onclick="dpSwitchTab('requisitions')">Requisitions</button>
      <button class="filter-btn${_dpTab==='workshop'?' active':''}" onclick="dpSwitchTab('workshop')">Workshop</button>
      <button class="filter-btn${_dpTab==='shutouts'?' active':''}" onclick="dpSwitchTab('shutouts')">Shutouts</button>
    </div>
    <div id="dp_tabBody"></div>
  `;
  dpRenderTab(driver);
}

function dpSwitchTab(tab) { _dpTab = tab; renderDriverPortal(); }

function dpRenderTab(driver) {
  const el = document.getElementById('dp_tabBody');
  if (!el) return;
  if (_dpTab === 'trip')          return dpRenderTripTab(el, driver);
  if (_dpTab === 'completed')     return dpRenderCompletedTripsTab(el, driver);
  if (_dpTab === 'fuel')          return dpRenderFuelTab(el, driver);
  if (_dpTab === 'requisitions')  return dpRenderReqTab(el, driver);
  if (_dpTab === 'workshop')      return dpRenderWorkshopTab(el, driver);
  if (_dpTab === 'shutouts')      return dpRenderShutoutTab(el, driver);
}

/* ── My Trip tab ────────────────────────────────────────────────── */
function dpRenderTripTab(el, driver) {
  const truck = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  const myTrips = state.db.trips
    .filter(t=>t.driverId===driver.id && t.status!=='completed')
    .sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  const active = myTrips[0];

  el.innerHTML = `
    <div class="panel" style="margin-bottom:14px">
      <div class="panel-head"><span class="panel-title">My Truck</span>${truck?sbadge(truck.status):''}</div>
      <div style="padding:14px;font-size:13px;color:var(--text);display:flex;justify-content:space-between;align-items:center">
        <span>${truck ? `${truck.reg} — ${truck.make}` : 'No truck currently assigned'}</span>
        ${truck?`<button class="action-btn danger" style="flex-shrink:0" onclick="driverReportBreakdown('${truck.id}')">⚠ Report Breakdown</button>`:''}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Active Trip</span></div>
      <div style="padding:14px">
        ${active ? `
          <div style="margin-bottom:12px">
            <div class="mono" style="color:var(--gold);font-size:15px">${active.container}</div>
            <div style="font-size:12px;color:var(--text-2);margin-top:2px">${active.origin} → ${active.dest}</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">${active.workType} · ${active.ctype}</div>
            <div style="margin-top:8px">${sbadge(active.status)}</div>
          </div>
          <div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Update Trip Step (forward only)</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${nextTripStatuses(active.status).filter(s=>DRIVER_TRIP_STEPS.includes(s)).map(s=>`<button class="filter-btn" onclick="driverAdvanceTrip('${active.id}','${s}')">${s.replace('_',' ')}</button>`).join('') || '<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>'}
          </div>
        ` : '<div class="empty-state"><div class="empty-state-label">No active trip assigned right now</div></div>'}
      </div>
    </div>
  `;
}

function dpRenderCompletedTripsTab(el, driver) {
  const trips = state.db.trips
    .filter(t=>t.driverId===driver.id && t.status==='completed')
    .sort((a,b)=>new Date(b.eta)-new Date(a.eta));

  el.innerHTML = `
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Completed Trips</span><span class="panel-meta">${trips.length} total</span></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Container</th><th>Route</th><th>Type</th><th>Distance</th><th>Completed</th><th>Reference</th></tr></thead>
        <tbody>
          ${trips.length ? trips.map(t=>`<tr onclick="showTripDetail('${t.id}')" style="cursor:pointer"><td class="mono" style="color:var(--gold)">${t.container}</td><td>${t.origin} → ${t.dest}</td><td>${t.ctype}</td><td>${t.distance}km</td><td>${fmtDate(t.eta)}</td><td class="mono" style="font-size:10px;color:var(--text-3)">${t.ref}</td></tr>`).join('')
            : `<tr><td colspan="6" class="empty-td">No completed trips yet</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;
}

function dpToggleDuty() {
  const driver = myDriverRecord();
  if (!driver) return;
  const onDuty = driver.status !== 'off_duty' && driver.status !== 'suspended';
  if (onDuty) {
    openModal('Go Off Duty', `
      <div class="ops-notice" style="margin-bottom:14px">Going off duty will immediately stop live GPS tracking for your truck and mark you unavailable for new trips. You can go back on duty any time.</div>
      <button class="submit-btn" style="background:var(--red)" onclick="confirmGoOffDuty()">Confirm — Go Off Duty</button>
    `);
  } else {
    const hasActiveTrip = state.db.trips.some(t => t.driverId === driver.id && t.status !== 'completed');
    driver.status = hasActiveTrip ? 'on_trip' : 'available';
    scheduleSave();
    addAudit(state.profile.username, 'Duty Status', `${driver.name} went ON duty`);
    toast('You are now on duty — location tracking started', 'success');
    renderDriverPortal();
  }
}

function confirmGoOffDuty() {
  const driver = myDriverRecord();
  if (!driver) return;
  driver.status = 'off_duty';
  scheduleSave();
  addAudit(state.profile.username, 'Duty Status', `${driver.name} went OFF duty`);
  closeModal();
  stopDriverTracking(true);
  toast('You are now off duty — location tracking stopped', 'info');
  renderDriverPortal();
}

function renderDutyBar() {
  const el = document.getElementById('dp_dutyBar');
  if (!el) return;
  const driver = myDriverRecord();
  if (!driver) { el.innerHTML = ''; return; }
  const onDuty = driver.status !== 'off_duty' && driver.status !== 'suspended';
  const tracking = state.trackingActive && onDuty;
  const pos = driver.truckId ? state.db.trackingPositions[driver.truckId] : null;
  const needsAccess = onDuty && driver.truckId && !tracking && state.geoPermission !== 'denied';
  const blocked = onDuty && driver.truckId && state.geoPermission === 'denied';

  let sub;
  if (!driver.truckId) sub = 'No truck assigned — tracking unavailable';
  else if (!onDuty) sub = 'Tracking stopped';
  else if (blocked) sub = 'Location access is blocked for this site';
  else if (tracking && pos) sub = `Live · ${pos.zone} · updated ${timeAgo(pos.lastUpdate)}`;
  else if (needsAccess) sub = 'Location access needed to start tracking';
  else sub = 'Acquiring GPS signal…';

  el.innerHTML = `
    <div class="duty-bar">
      <div class="duty-status">
        <span class="duty-dot ${tracking ? 'live' : ''}"></span>
        <div>
          <div class="duty-label">${onDuty ? (driver.status === 'on_trip' ? 'On Duty · On Trip' : 'On Duty · Available') : 'Off Duty'}</div>
          <div class="duty-sub">${sub}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
        ${needsAccess ? `<button class="action-btn duty-cta" onclick="requestLocationAccess()">📍 Enable Location Tracking</button>` : ''}
        <button class="action-btn ${onDuty ? 'danger' : ''}" onclick="dpToggleDuty()">${onDuty ? 'Go Off Duty' : 'Go On Duty'}</button>
      </div>
    </div>
    ${blocked ? `
      <div class="duty-blocked-banner">
        <b>Location is blocked for this site.</b> Your truck can't be tracked until you re-enable it:
        <ul>
          <li><b>Chrome/Android:</b> tap the lock icon next to the address bar → Permissions → Location → Allow</li>
          <li><b>Safari/iOS:</b> Settings app → Safari (or this app, if installed to Home Screen) → Location → Allow</li>
        </ul>
        Then tap <b>Enable Location Tracking</b> above again.
      </div>
    ` : ''}
  `;
}

async function submitDriverBreakdown(truckId) {
  const desc = document.getElementById('bd_desc').value.trim();
  if (!desc) { toast('Please describe the issue', 'error'); return; }
  const loc = sanitize(document.getElementById('bd_loc').value.trim());
  const truck = state.db.trucks.find(t=>t.id===truckId);
  const truckSnapshot = truck ? { ...truck } : null;
  if (truck) truck.status = 'breakdown';
  const ticket = {
    id: uid('MNT'), truckId, type:'Breakdown',
    desc: loc ? `${desc} (Location: ${loc})` : desc,
    priority:'critical', status:'open', date:new Date().toISOString(),
    cost:0, tech:'', resolvedDate:null, reportedByDriver:true,
  };
  state.db.maintenance.push(ticket);
  ticket._dirty = true;
  buildBadges(); buildAlerts();
  toast('Saving…', 'info', 1200);

  const res = await saveNowAwaited();
  if (!res.ok) {
    // Roll back the optimistic local change so the UI matches reality —
    // a breakdown report is safety-critical and must not silently "succeed".
    if (truck && truckSnapshot) Object.assign(truck, truckSnapshot);
    const idx = state.db.maintenance.indexOf(ticket);
    if (idx > -1) state.db.maintenance.splice(idx, 1);
    buildBadges(); buildAlerts();
    toast('Could not submit breakdown report — check your connection and try again', 'error', 5000);
    return;
  }

  addAudit(state.profile.username, 'Driver Breakdown Report', `${truckName(truckId)} — ${desc.slice(0,60)}`);
  closeModal();
  toast('Breakdown reported — dispatch notified', 'error');
  renderDriverPortal();
}

function dpRenderReqTab(el, driver) {
  const mine = state.db.requisitions.filter(r=>r.requesterId===state.profile.id || r.requester===state.profile.name || r.requester===driver.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">New Requisition</div>
      <div class="form-card-body">
        <div class="form-row-2">
          <div class="fg"><label>Category</label><select id="dp_rq_cat"><option>Fuel Advance</option><option>Tyre Parts</option><option>Tool Purchase</option><option>Medical</option><option>Lubricants</option><option>Other</option></select></div>
          <div class="fg"><label>Amount (KSh)</label><input id="dp_rq_amt" type="number" placeholder="0"/></div>
        </div>
        <div class="fg"><label>Items / Description</label><textarea id="dp_rq_items" rows="3" placeholder="List what is needed…"></textarea></div>
        <div class="fg"><label>Notes</label><input id="dp_rq_notes" placeholder="Additional context…"/></div>
        <button class="submit-btn" onclick="dpSaveRequisition()">Submit Requisition →</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Requisitions</span><span class="panel-meta">${mine.length}</span></div>
      <div>${mine.map(r=>`<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${r.category}</div><div class="req-meta">${r.id} · ${fmtDate(r.date)}</div></div><div style="text-align:right">${sbadge(r.status)}<div class="req-amount" style="margin-top:4px">${fmtKsh(r.amount)}</div></div></div><div class="req-items">${r.items}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No requisitions submitted yet</div></div>'}</div>
    </div>
  `;
}

let _dispatchEditingTripId = null;

let _dispatchContainerImages = [];

function renderDispatch() {
  populateDispatchSelects();
  renderDispatchQueue();
  renderAwaitingDispatch();
}

function populateDispatchSelects() {
  const avlTrucks  = state.db.trucks.filter(t=>t.status==='available');
  const avlDrivers = state.db.drivers.filter(d=>d.status==='available');
  fillSelect('d_truck',  avlTrucks,  t=>[t.id, `${t.reg} — ${t.make} (Fuel: ${truckFuelLabel(t)})`]);
  fillSelect('d_driver', avlDrivers, d=>[d.id, d.name]);
  fillSelect('d_line',   state.db.shippingLines.filter(l=>l.active), l=>[l.id, `${l.code} — ${l.name}`]);
  populateSizeTypeSelects('d_size', 'd_type');
  dispatchEnsureVehicleFields();
}

/* Dispatch console: the Driver box is a combined text input + drop-down (the real <select id="d_driver"> stays in the page, hidden,
   because the rest of the app reads its value). Under Truck + Driver this adds Trailer No., Transporter, Driver ID / Driving No.,
   Driver Phone, Max Gross Weight (MGW) and Tare Weight. They are created here so index.html does not need to change.
   Trailer, transporter, driver and weights travel with the trip and are copied onto the outward interchange (and so the Outward EIR). */
function dispatchEnsureVehicleFields() {
  const drv = document.getElementById('d_driver'); if (!drv) return;
  if (!document.getElementById('d_trailer')) {
    const row = drv.closest('.form-row-2') || drv.parentNode.parentNode;
    if (row && row.parentNode) {
      const wrap = document.createElement('div');
      wrap.id = 'd_vehicle_extra';
      wrap.innerHTML = '<div class="form-row-2">' +
          '<div class="fg"><label>Trailer No.</label><input id="d_trailer" placeholder="e.g. ZD502" autocomplete="off" style="text-transform:uppercase" /></div>' +
          '<div class="fg"><label>Transporter</label><input id="d_transporter" placeholder="Haulage company" autocomplete="off" /></div>' +
        '</div>' +
        '<div class="form-row-2">' +
          '<div class="fg"><label>Driver ID / Driving No.</label><input id="d_driver_idno" placeholder="e.g. 24347667" autocomplete="off" inputmode="text" /></div>' +
          '<div class="fg"><label>Driver Phone</label><input id="d_driver_phone" type="tel" placeholder="e.g. 0712 345 678" autocomplete="off" inputmode="tel" /></div>' +
        '</div>' +
        '<div id="d_driver_info" class="ops-notice" style="display:none;margin-bottom:12px;font-size:12px;line-height:1.6"></div>' +
        '<div class="form-row-2">' +
          '<div class="fg"><label>Max Gross Weight — MGW (kg)</label><input id="d_mgw" type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 32500" /></div>' +
          '<div class="fg"><label>Tare Weight (kg)</label><input id="d_tare" type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 2180" /></div>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:-4px 0 12px">' +
          '<button type="button" class="action-btn ghost" onclick="dispatchAutofillWeights(true)">Autofill weights from inward EIR</button>' +
          '<span id="d_weight_info" style="font-size:11.5px;color:var(--text-3);line-height:1.5"></span>' +
        '</div>';
      row.parentNode.insertBefore(wrap, row.nextSibling);
    }
  }
  dispatchEnsureDriverCombo();
  dispatchRefreshDriverList();
  { const tx = document.getElementById('d_driver_text');           // the select was just rebuilt (empty): re-select the driver whose name is typed
    if (tx && tx.value.trim() && !drv.value) { const h = (state.db.drivers || []).find(d => d.status === 'available' && String(d.name || '').trim().toLowerCase() === tx.value.trim().toLowerCase()); if (h) drv.value = h.id; } }
}
/* Driver name = text box with a drop-down list of the available drivers (type to filter, or type a name that is not on file) */
function dispatchEnsureDriverCombo() {
  const dv = document.getElementById('d_driver'); if (!dv || document.getElementById('d_driver_text')) return;
  const fg = dv.closest('.fg') || dv.parentNode;
  const lb = fg.querySelector('label'); if (lb) lb.innerHTML = 'Driver <span class="label-optional">(pick from the list or type a name)</span>';
  const inp = document.createElement('input');
  inp.id = 'd_driver_text'; inp.setAttribute('list', 'd_driver_list'); inp.setAttribute('autocomplete', 'off'); inp.placeholder = 'Select or type driver name';
  const dl = document.createElement('datalist'); dl.id = 'd_driver_list';
  dv.style.display = 'none';
  dv.parentNode.insertBefore(inp, dv); dv.parentNode.insertBefore(dl, dv);
}
function dispatchRefreshDriverList() {
  const dl = document.getElementById('d_driver_list'); if (!dl) return;
  dl.innerHTML = (state.db.drivers || []).filter(d => d.status === 'available').map(d =>
    '<option value="' + esc(d.name) + '">' + esc([d.phone, d.idNo || d.id_no].filter(Boolean).join(' · ')) + '</option>').join('');
}
/* the text box now names a driver on file (-> select it and fill ID / phone) or someone who is not (-> free text, ID / phone typed by hand) */
function dispatchDriverTyped() {
  const tx = document.getElementById('d_driver_text'), dv = document.getElementById('d_driver'); if (!tx || !dv) return;
  const v = tx.value.trim().toLowerCase();
  const hit = v ? (state.db.drivers || []).find(d => d.status === 'available' && String(d.name || '').trim().toLowerCase() === v) : null;
  if (hit) { if (dv.value !== hit.id) { dv.value = hit.id; dispatchDriverInfo(true, true); } }
  else if (dv.value) {                                    // typed something else: no longer a driver on file
    dv.value = '';
    ['d_driver_idno', 'd_driver_phone'].forEach(id => { const e = document.getElementById(id); if (e && e.dataset.auto === '1') { e.value = ''; delete e.dataset.auto; } });
    dispatchDriverInfo(false, true);
  }
}
/* fromDriver: the driver was just chosen (fill ID / phone, pick the driver's own truck). Otherwise only empty boxes are filled.
   keepText: do not rewrite the name box (the user is typing in it). */
function dispatchDriverInfo(fromDriver, keepText) {
  const dv = document.getElementById('d_driver'), tk = document.getElementById('d_truck'), box = document.getElementById('d_driver_info'); if (!dv) return;
  const d = (state.db.drivers || []).find(x => x.id === dv.value);
  if (fromDriver && d && tk && !tk.value && d.truckId && [...tk.options].some(o => o.value === d.truckId)) tk.value = d.truckId;
  if (!fromDriver && tk && tk.value && !dv.value && !String((document.getElementById('d_driver_text') || {}).value || '').trim()) {   // truck chosen first: use the driver assigned to it
    const a = (state.db.drivers || []).find(x => x.truckId === tk.value && [...dv.options].some(o => o.value === x.id));
    if (a) { dv.value = a.id; return dispatchDriverInfo(true); }
  }
  const tx = document.getElementById('d_driver_text'), idE = document.getElementById('d_driver_idno'), phE = document.getElementById('d_driver_phone');
  if (d) {
    if (tx && !keepText) tx.value = d.name || '';
    const idNo = d.idNo || d.id_no || '', ph = d.phone || '';
    const put = (e, val) => { if (e && val && (fromDriver || !String(e.value || '').trim())) { e.value = val; e.dataset.auto = '1'; } };
    put(idE, idNo); put(phE, ph);
    if (fromDriver) {                                     // a different driver: do not keep the previous one's details
      if (idE && !idNo && idE.dataset.auto === '1') { idE.value = ''; delete idE.dataset.auto; }
      if (phE && !ph && phE.dataset.auto === '1') { phE.value = ''; delete phE.dataset.auto; }
    }
  }
  if (!box) return;
  if (!d) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const missing = [!(d.idNo || d.id_no) && 'ID / driving no.', !d.phone && 'phone'].filter(Boolean);
  if (!missing.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = '';
  box.innerHTML = '<b>' + esc(d.name) + '</b> has no ' + missing.join(' and ') + ' on file. Type it above for this trip; add it under Fleet → Drivers → Edit to have it fill in next time.';
}
document.addEventListener('change', ev => {
  const id = ev.target && ev.target.id;
  if (id === 'd_driver') dispatchDriverInfo(true);
  else if (id === 'd_truck') dispatchDriverInfo(false);
  else if (id === 'd_driver_text') dispatchDriverTyped();
}, true);
document.addEventListener('input', ev => {
  const e = ev.target, id = e && e.id;
  if (id === 'd_driver_text') dispatchDriverTyped();       // a pick from the list also arrives as an input event
  else if (id === 'd_driver_idno' || id === 'd_driver_phone' || id === 'd_mgw' || id === 'd_tare') { if (e.dataset) delete e.dataset.auto; }   // typed by hand: no longer "auto"
}, true);

/* ── Max gross / tare weight ──────────────────────────────────────────────────────────────────────────────
   Looked up in this order, per field: the inward survey linked to the inward EIR → the newest survey of this container →
   the gross weight on the inward interchange (MGW only) → an earlier dispatch of the same container. */
async function gxInwardWeightsFor(cont, ic) {
  const out = { mgw: '', tare: '', src: [] };
  const take = (f, v, src) => { v = Number(v); if (!out[f] && isFinite(v) && v > 0) { out[f] = String(v); if (out.src.indexOf(src) < 0) out.src.push(src); } };
  const online = navigator.onLine !== false && typeof supabase !== 'undefined';
  const askSurvey = async q => { try { const r = await q; return (!r.error && r.data) ? r.data : null; } catch (e) { return null; } };
  if (online && ic && ic.surveyId) {
    const sv = await askSurvey(supabase.from('depot_surveys').select('tare_weight,mgwt').eq('id', ic.surveyId).maybeSingle());
    if (sv) { take('mgw', sv.mgwt, 'inward survey'); take('tare', sv.tare_weight, 'inward survey'); }
  }
  if (online && (!out.mgw || !out.tare)) {
    const sv = await askSurvey(supabase.from('depot_surveys').select('tare_weight,mgwt').eq('container', cont).order('surveyed_at', { ascending: false }).limit(1).maybeSingle());
    if (sv) { take('mgw', sv.mgwt, 'latest survey'); take('tare', sv.tare_weight, 'latest survey'); }
  }
  if (ic) take('mgw', ic.grossWeight, 'inward EIR');
  if (!out.mgw || !out.tare) {
    const key = normContainerKey(cont);
    const prev = (state.db.trips || []).filter(t => normContainerKey(t.container) === key && (Number(t.mgwKg) > 0 || Number(t.tareKg) > 0)).sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
    if (prev) { take('mgw', prev.mgwKg, 'earlier dispatch'); take('tare', prev.tareKg, 'earlier dispatch'); }
  }
  return (out.mgw || out.tare) ? out : null;
}
/* manual = the clerk pressed the button: look it up again and replace what is there. Otherwise only empty (or earlier auto-filled) boxes are touched. */
async function dispatchAutofillWeights(manual, ic, soft) {
  const cEl = document.getElementById('d_container'), mE = document.getElementById('d_mgw'), tE = document.getElementById('d_tare'), info = document.getElementById('d_weight_info');
  if (!cEl || !mE || !tE) return;
  const cont = cEl.value.trim().toUpperCase();
  if (cont.length < 10) { if (manual === true) toast('Enter the container number first', 'warning'); return; }
  if (manual === true) { try { ic = await gxInwardEirFor(cont); } catch (e) { ic = null; } }
  let w = null; try { w = await gxInwardWeightsFor(cont, ic || null); } catch (e) { console.warn('weights lookup:', e && e.message); }
  if (cEl.value.trim().toUpperCase() !== cont) return;      // the clerk moved on to another container while we looked
  const mayFill = e => manual === true || !String(e.value || '').trim() || (soft !== true && e.dataset.auto === '1');
  if (!w) {
    if (soft !== true) [mE, tE].forEach(e => { if (e.dataset.auto === '1') { e.value = ''; delete e.dataset.auto; } });
    if (info) info.textContent = 'No weights on record for this container. Type them from the CSC plate.';
    if (manual === true) toast('No inward EIR or survey weights found. Enter them by hand.', 'info', 4500);
    return;
  }
  if (w.mgw && mayFill(mE)) { mE.value = w.mgw; mE.dataset.auto = '1'; }
  if (w.tare && mayFill(tE)) { tE.value = w.tare; tE.dataset.auto = '1'; }
  if (info) info.textContent = 'Filled from ' + w.src.join(' + ') + (w.mgw && w.tare ? '.' : ' (' + (w.mgw ? 'tare' : 'MGW') + ' not found, type it in).') + ' You can edit them.';
  if (manual === true) toast('Weights filled in', 'success', 2500);
}

function renderDispatchQueue() {
  const pending = state.db.trips.filter(t=>t.status==='active').slice(-8).reverse();
  const container = document.getElementById('dispatchQueue');
  if (!container) return;
  container.innerHTML = `<div class="panel"><div class="panel-head"><span class="panel-title">Dispatch Queue</span><span class="panel-meta">${pending.length} active</span></div><div>${pending.map(t=>`<div class="dispatch-queue-item" onclick="showTripDetail('${t.id}')"><div class="dqi-ref">${t.container.slice(-7)}</div><div class="dqi-route"><div style="font-size:12px;font-weight:600;color:var(--text)">${t.origin}→${t.dest}</div><div style="font-size:10px;color:var(--text-3)">${truckName(t.truckId)}</div></div>${sbadge(t.status)}<div class="dqi-time">${timeAgo(t.startTime)}</div></div>`).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No dispatches yet</div></div>'}</div></div>`;
}

function awaitingDispatchTrips() {
  return state.db.trips.filter(t => isTripLive(t) && (!t.truckId || (!t.driverId && !String(t.driverNameText || '').trim())));
}

function refreshAwaitingDispatchUI() {
  buildBadges();
  refreshContainerHistory();
  if (document.getElementById('awaitingDispatchList')) renderAwaitingDispatch();
  if (document.getElementById('allocQueue'))            renderAllocAuto();
  if (document.getElementById('allocManualAwaitingList')) renderAllocAwaitingList('allocManualAwaitingList', 'allocManualAwaitingMeta');
}

function jumpToCompleteDispatch(tripId) {
  showSection('dispatch', document.querySelector('[data-section="dispatch"]'));
  loadTripIntoDispatchForm(tripId);
}

function renderAwaitingDispatch() {
  const el = document.getElementById('awaitingDispatchList');
  const meta = document.getElementById('awaitingDispatchMeta');
  if (!el) return;
  const rows = awaitingDispatchTrips().sort((a,b)=> new Date(b.startTime)-new Date(a.startTime));
  if (meta) meta.textContent = rows.length ? `${rows.length} awaiting` : '';
  el.innerHTML = rows.map(t => `
    <div class="dispatch-queue-item" style="cursor:default">
      <div class="dqi-ref">${(t.container||'').slice(-7)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${t.origin} → ${t.dest}</div>
        <div style="font-size:10px;color:var(--text-3)">${t.bookingId ? 'From public booking' : 'Needs truck & driver'} · ${t.workType}</div>
      </div>
      <button class="modal-btn primary" onclick="loadTripIntoDispatchForm('${t.id}')">Complete Dispatch →</button>
    </div>
  `).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">✅</div><div class="empty-state-label">Nothing awaiting dispatch</div></div>';
}

/* The Status field (Repat / Shipper / Sale Unit) is always shown; it is only REQUIRED for Depot → Port. */
function toggleDispatchOutwardType() {
  const wt = document.getElementById('d_worktype');
  const hint = document.getElementById('d_outwardtype_hint');
  if (hint && wt) hint.textContent = isOutwardWorkType(wt.value) ? '(required for Depot → Port)' : '(optional)';
  if (window.RepatReserve && RepatReserve.syncDispatchForm) { try { RepatReserve.syncDispatchForm(); } catch (e) { console.warn('Repat form sync failed', e); } }   // Repat: container must come from the reserved list
}

function loadTripIntoDispatchForm(tripId) {
  const t = state.db.trips.find(tr=>tr.id===tripId);
  if (!t) { toast('Trip not found', 'error'); return; }
  _dispatchEditingTripId = tripId;
  _dispatchContainerImages = Array.isArray(t.containerImages) ? [...t.containerImages] : [];

  switchDispatchTab('single', document.querySelector('#sec-dispatch .filter-btn'));
  populateDispatchSelects();

  document.getElementById('d_truck').value    = t.truckId || '';
  document.getElementById('d_driver').value   = t.driverId || '';
  document.getElementById('d_container').value= t.container && !t.container.startsWith('PUB-') ? t.container : '';
  populateSizeTypeSelects('d_size', 'd_type', t.ctype || '20ft Dry');
  document.getElementById('d_worktype').value = t.workType || 'Port → Depot';
  document.getElementById('d_line').value     = t.shippingLine || '';
  const outwardTypeSel = document.getElementById('d_outwardtype');
  if (outwardTypeSel) outwardTypeSel.value = t.outwardType || '';
  toggleDispatchOutwardType();
  document.getElementById('d_origin').value   = t.origin && t.origin !== '—' ? t.origin : '';
  document.getElementById('d_dest').value     = t.dest && t.dest !== '—' ? t.dest : '';
  document.getElementById('d_distance').value = t.distance || '';
  document.getElementById('d_priority').value = t.priority || 'Normal';
  document.getElementById('d_ref').value      = t.ref || '';
  document.getElementById('d_notes').value    = t.notes || '';
  document.getElementById('d_eir').value        = t.eirNumber || '';
  document.getElementById('d_receiving').value  = t.receivingParty || '';
  document.getElementById('d_release_no').value = t.releaseOrderNo || '';
  document.getElementById('d_vessel').value     = t.vessel || '';
  document.getElementById('d_voyage').value     = t.voyage || '';
  { const tr = document.getElementById('d_trailer'), tp = document.getElementById('d_transporter'); if (tr) tr.value = t.trailerNo || (t.custom && t.custom.trailer_no) || ''; if (tp) tp.value = t.transporter || (t.custom && t.custom.transporter) || '';
    const dvr = (state.db.drivers || []).find(x => x.id === t.driverId), set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v == null ? '' : v; delete e.dataset.auto; } };
    set('d_driver_text', (dvr && dvr.name) || t.driverNameText || ''); set('d_driver_idno', t.driverIdNo || (dvr && (dvr.idNo || dvr.id_no)) || ''); set('d_driver_phone', t.driverPhone || (dvr && dvr.phone) || '');
    set('d_mgw', t.mgwKg); set('d_tare', t.tareKg);
    const wi = document.getElementById('d_weight_info'); if (wi) wi.textContent = '';
    try { dispatchDriverInfo(false, true); } catch (e) {} }
  const dateOutEl = document.getElementById('d_dateout'); if (dateOutEl) dateOutEl.value = '';
  if (window.GargoForms) { try { GargoForms.decorate('dispatch'); GargoForms.fill('dispatch', t.custom); } catch (e) {} }   // Form Designer fields

  renderContainerImgGrid();
  dispatchPrefillFromEir(true);

  const banner = document.getElementById('dispatchEditBanner');
  if (banner) banner.style.display = 'flex';
  const btn = document.getElementById('dispatchSubmitBtn');
  if (btn) btn.textContent = 'Complete Dispatch →';

  document.getElementById('dispatchTabSingle').scrollIntoView({ behavior:'smooth', block:'start' });
}

function cancelDispatchEdit() {
  _dispatchEditingTripId = null;
  clearContainerImgs();
  clearDispatchReleaseFile();
  ['d_truck','d_driver','d_container','d_origin','d_dest','d_distance','d_ref','d_notes','d_eir','d_receiving','d_release_no','d_vessel','d_voyage','d_dateout','d_trailer','d_transporter','d_driver_text','d_driver_idno','d_driver_phone','d_mgw','d_tare'].forEach(id=>{ const el=document.getElementById(id); if (el) { el.value=''; delete el.dataset.auto; } }); { const wi=document.getElementById('d_weight_info'); if (wi) wi.textContent=''; const di=document.getElementById('d_driver_info'); if (di) { di.style.display='none'; di.innerHTML=''; } }
  const outwardTypeSel = document.getElementById('d_outwardtype');
  if (outwardTypeSel) outwardTypeSel.value = '';
  { const inf = document.getElementById('d_eir_info'), dc = document.getElementById('d_container'); if (inf) { inf.style.display = 'none'; inf.innerHTML = ''; } if (dc) delete dc.dataset.eirFor; const ie = document.getElementById('d_ineir'), iv = document.getElementById('d_ineir_view'); if (ie) { ie.value = ''; delete ie.dataset.icId; } if (iv) iv.style.display = 'none'; }
  toggleDispatchOutwardType();
  if (window.GargoForms) GargoForms.clearForm('dispatch');
  populateDispatchSelects();
  const banner = document.getElementById('dispatchEditBanner');
  if (banner) banner.style.display = 'none';
  const btn = document.getElementById('dispatchSubmitBtn');
  if (btn) btn.textContent = 'Create Dispatch Order →';
  toast('Dispatch form cleared', 'info');
}

async function createDispatch() {
  const truck  = document.getElementById('d_truck').value;
  const driver = document.getElementById('d_driver').value;
  const cont   = document.getElementById('d_container').value.trim().toUpperCase();
  const origin = document.getElementById('d_origin').value.trim();
  const dest   = document.getElementById('d_dest').value.trim();
  const dist   = parseInt(document.getElementById('d_distance').value)||0;
  const editingId = _dispatchEditingTripId;


  if (!cont) {
    toast('Container number is required', 'error');
    return;
  }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) {
    toast(`Container number: ${contIssue}`, 'error');
    return;
  }
  if (window.GargoForms) { const formErr = GargoForms.validate('dispatch'); if (formErr) { toast(formErr, 'error'); return; } }   // Form Designer rules
  const custom = window.GargoForms ? GargoForms.collect('dispatch') : {};
  const dupTrip = findLiveTripByContainer(cont, editingId || undefined);
  if (dupTrip) {
    toast(`${cont} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest}, status: ${dupTrip.status.replace('_',' ')}). Complete or resolve it before re-dispatching this container.`, 'error');
    return;
  }
  const dupTruck = truck ? state.db.trucks.find(tr=>tr.id===truck) : null;
  if (dupTruck && dupTruck.status !== 'available') {
    toast(`${dupTruck.reg} is no longer available (status: ${dupTruck.status.replace('_',' ')}). Refresh and pick another truck.`, 'error');
    return;
  }
  const dupDriver = driver ? state.db.drivers.find(d=>d.id===driver) : null;
  if (dupDriver && dupDriver.status !== 'available') {
    toast(`${dupDriver.name} is no longer available (status: ${dupDriver.status.replace('_',' ')}). Refresh and pick another driver.`, 'error');
    return;
  }
  const ctype    = composeCtype(document.getElementById('d_size').value, document.getElementById('d_type').value);
  const workType = document.getElementById('d_worktype').value;
  const line     = document.getElementById('d_line').value;
  const priority = document.getElementById('d_priority').value;
  const ref      = document.getElementById('d_ref').value.trim() || `REF-${Date.now().toString().slice(-6)}`;
  const notes    = sanitize(document.getElementById('d_notes').value.trim());
  const images   = [..._dispatchContainerImages];
  const eirNumber      = sanitize(document.getElementById('d_eir').value.trim());
  const receivingParty = sanitize(document.getElementById('d_receiving').value.trim());
  const releaseOrderNo = sanitize(document.getElementById('d_release_no').value.trim());
  const vessel          = sanitize(document.getElementById('d_vessel').value.trim());
  const voyage           = sanitize(document.getElementById('d_voyage').value.trim());
  const trailerNo        = sanitize(((document.getElementById('d_trailer') || {}).value || '').trim().toUpperCase());
  const transporter      = sanitize(((document.getElementById('d_transporter') || {}).value || '').trim());
  const driverText      = sanitize(((document.getElementById('d_driver_text') || {}).value || '').trim());
  const driverIdNo      = sanitize(((document.getElementById('d_driver_idno') || {}).value || '').trim());
  const driverPhone     = sanitize(((document.getElementById('d_driver_phone') || {}).value || '').trim());
  const mgwRaw          = ((document.getElementById('d_mgw') || {}).value || '').trim();
  const tareRaw         = ((document.getElementById('d_tare') || {}).value || '').trim();
  const mgwKg           = mgwRaw === '' ? '' : Number(mgwRaw);
  const tareKg          = tareRaw === '' ? '' : Number(tareRaw);
  const driverNameText  = driver ? ((state.db.drivers.find(d => d.id === driver) || {}).name || driverText) : driverText;
  if (driverPhone && driverPhone.replace(/\D/g, '').length < 9) { toast('Driver phone looks too short', 'error'); return; }
  if ((mgwKg !== '' && !(mgwKg > 0)) || (tareKg !== '' && !(tareKg > 0))) { toast('Weights must be numbers above zero (kg)', 'error'); return; }
  if (mgwKg !== '' && tareKg !== '' && tareKg >= mgwKg) { toast('Tare weight must be less than the max gross weight', 'error'); return; }
  const dateOutInput    = document.getElementById('d_dateout').value;
  const dateOut         = dateOutInput ? new Date(dateOutInput).toISOString() : new Date().toISOString();
  const releaseFile     = _dispatchReleaseFile;
  const outwardTypeSel = document.getElementById('d_outwardtype');
  const outwardType = (outwardTypeSel && outwardTypeSel.value) || null;
  if (isOutwardWorkType(workType) && !OUTWARD_TYPES.includes(outwardType)) {
    toast('Select a status — Repat, Shipper or Sale Unit', 'error');
    return;
  }
  if (outwardType && !isOutwardWorkType(workType)) {
    toast('An outward status (' + outwardTypeLabel(outwardType) + ') is selected but the work type is ' + workType + ', so no outward interchange would be issued. Change the work type to Depot → Port, or clear the status.', 'error', 8000);
    return;
  }

  let newTripId = null;

  if (editingId) {

    const t = state.db.trips.find(tr=>tr.id===editingId);
    if (!t) { toast('That trip no longer exists — it may have been removed.', 'error'); cancelDispatchEdit(); return; }


    if (workType === 'Depot → Port' && !releaseFile) {
      try {
        const docs = await window.bookingDocs.documentsForTrip(t.id);
        const hasVerifiedRelease = docs.some(d => d.doc_type === 'release_order' && d.status === 'verified');
        if (!hasVerifiedRelease) {
          toast('A verified release order is required before this container can be dispatched to port — upload it below, or from DepOps → Outward / Repatriation.', 'error', 6000);
          return;
        }
      } catch (e) {
        toast(`Could not confirm release order status (${(e && e.message) || 'error'}) — dispatch blocked until this can be checked.`, 'error', 6000);
        return;
      }
    }

    Object.assign(t, { truckId: truck, driverId: driver, container: cont, ctype, workType, outwardType, origin, dest, shippingLine: line, distance: dist, priority, notes, ref, containerImages: images, eirNumber, receivingParty, releaseOrderNo, vessel, voyage, dateOut, trailerNo, transporter, driverNameText, driverIdNo, driverPhone, mgwKg, tareKg, custom: Object.assign({}, t.custom, custom) });
    t._dirty = true;
    const tk = state.db.trucks.find(tr=>tr.id===truck);
    const dv = state.db.drivers.find(d=>d.id===driver);
    if (tk) tk.status = 'on_trip';
    if (dv) { dv.status='on_trip'; dv.load=cont; dv.truckId=truck; }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, 'Dispatch Completed', `${cont} — ${origin} → ${dest}`);
    toast(`Dispatch completed — ${cont}`, 'success');
    newTripId = t.id;
    _dispatchEditingTripId = null;
    const banner = document.getElementById('dispatchEditBanner');
    if (banner) banner.style.display = 'none';
    const btn = document.getElementById('dispatchSubmitBtn');
    if (btn) btn.textContent = 'Create Dispatch Order →';
  } else {
    if (workType === 'Depot → Port' && !releaseFile) {
      toast('A release order is required for Depot → Port dispatches — upload it below, or complete this later once the container is matched to a trip in DepOps → Outward / Repatriation.', 'warning', 6000);
    }
    const etaMs = Date.now() + (dist/35)*3600000;
    const trip = {
      id: uid('TRIP'), truckId: truck, driverId: driver, container: cont,
      ctype, workType, outwardType, origin, dest, shippingLine: line,
      status: 'active', startTime: new Date().toISOString(),
      eta: new Date(etaMs).toISOString(), distance: dist, priority, notes, ref,
      containerImages: images, eirNumber, receivingParty, releaseOrderNo, vessel, voyage, dateOut, trailerNo, transporter, driverNameText, driverIdNo, driverPhone, mgwKg, tareKg, custom,
      _dirty: true,
    };
    state.db.trips.push(trip);
    newTripId = trip.id;
    const t = state.db.trucks.find(t=>t.id===truck);
    const d = state.db.drivers.find(d=>d.id===driver);
    if (t) t.status = 'on_trip';
    if (d) { d.status='on_trip'; d.load=cont; d.truckId=truck; }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, 'Dispatch Created', `${cont} — ${origin} → ${dest}`);
    toast(`Dispatch created — ${cont}`, 'success');
  }


  if (releaseFile && newTripId) {
    try {
      await saveNowAwaited();
      await window.bookingDocs.uploadTripDocument({ tripId: newTripId, docType: 'release_order', containerNo: cont, file: releaseFile, autoVerify: true });
      toast('Release order uploaded', 'success');
    } catch (e) {
      toast(`Dispatch saved, but release order upload failed: ${e.message || e}`, 'warning');
    }
  }

  if (newTripId) {
    const savedTrip = state.db.trips.find(x => x.id === newTripId);
    if (savedTrip && isOutwardWorkType(savedTrip.workType)) gxReportOutwardIc(await ensureOutwardInterchange(savedTrip), cont);
  }

  clearContainerImgs();
  clearDispatchReleaseFile();
  ['d_truck','d_driver','d_container','d_origin','d_dest','d_distance','d_ref','d_notes','d_eir','d_receiving','d_release_no','d_vessel','d_voyage','d_dateout','d_trailer','d_transporter','d_driver_text','d_driver_idno','d_driver_phone','d_mgw','d_tare'].forEach(id=>{ const el=document.getElementById(id); if (el) { el.value=''; delete el.dataset.auto; } }); { const wi=document.getElementById('d_weight_info'); if (wi) wi.textContent=''; const di=document.getElementById('d_driver_info'); if (di) { di.style.display='none'; di.innerHTML=''; } }
  const outwardTypeResetSel = document.getElementById('d_outwardtype');
  if (outwardTypeResetSel) outwardTypeResetSel.value = '';
  { const inf = document.getElementById('d_eir_info'), dc = document.getElementById('d_container'); if (inf) { inf.style.display = 'none'; inf.innerHTML = ''; } if (dc) delete dc.dataset.eirFor; const ie = document.getElementById('d_ineir'), iv = document.getElementById('d_ineir_view'); if (ie) { ie.value = ''; delete ie.dataset.icId; } if (iv) iv.style.display = 'none'; }
  toggleDispatchOutwardType();
  if (window.GargoForms) GargoForms.clearForm('dispatch');
  renderDispatch();
  refreshAwaitingDispatchUI();
}

let _dispatchReleaseFile = null;

function previewDispatchReleaseFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  _dispatchReleaseFile = file;
  const preview = document.getElementById('dispatchReleasePreview');
  preview.style.display = 'block';
  preview.innerHTML = `📄 ${esc(file.name)} <button class="pill" style="font-size:9px;margin-left:6px" onclick="clearDispatchReleaseFile()">✕ Remove</button>`;
}

function clearDispatchReleaseFile() {
  _dispatchReleaseFile = null;
  const fileInput = document.getElementById('d_release_file'); if (fileInput) fileInput.value = '';
  const preview = document.getElementById('dispatchReleasePreview');
  if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
}

function switchDispatchTab(tab, btn) {
  document.getElementById('dispatchTabSingle').style.display = tab==='single' ? 'block' : 'none';
  document.getElementById('dispatchTabBulk').style.display   = tab==='bulk'   ? 'block' : 'none';
  document.querySelectorAll('#sec-dispatch .filter-row .filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function previewContainerImgs(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const room = GX_MAX_DISPATCH_PHOTOS - _dispatchContainerImages.length;
  if (room <= 0) { toast(`Maximum ${GX_MAX_DISPATCH_PHOTOS} photos — remove one to add another`, 'error'); e.target.value = ''; return; }
  files.slice(0, room).forEach(file => {
    const problem = gxPhotoProblem(file);
    if (problem) { toast(`${file.name} skipped — ${problem}`, 'error'); return; }
    const reader = gxImageReader();
    reader.onload = ev => {
      if (_dispatchContainerImages.length >= GX_MAX_DISPATCH_PHOTOS) return;
      _dispatchContainerImages.push(ev.target.result);
      renderContainerImgGrid();
    };
    reader.readAsDataURL(file);
  });
  if (files.length > room) toast(`Only ${room} more photo${room === 1 ? '' : 's'} could be added (max ${GX_MAX_DISPATCH_PHOTOS})`, 'warning');
  e.target.value = ''; 
}

function renderContainerImgGrid() {
  const wrap = document.getElementById('containerImgPreview');
  const grid = document.getElementById('containerImgGrid');
  const label = document.getElementById('containerImgLabel');
  if (!wrap || !grid) return;
  if (!_dispatchContainerImages.length) {
    wrap.style.display = 'none';
    if (label) label.textContent = 'Upload container photos';
    return;
  }
  wrap.style.display = 'block';
  if (label) label.textContent = `${_dispatchContainerImages.length} photo${_dispatchContainerImages.length>1?'s':''} attached`;
  grid.innerHTML = _dispatchContainerImages.map((src,i)=>`<div class="container-img-thumb"><img src="${src}" /><button type="button" class="container-img-remove" onclick="removeContainerImgAt(${i})" title="Remove">✕</button></div>`).join('');
}

function removeContainerImgAt(idx) {
  _dispatchContainerImages.splice(idx,1);
  renderContainerImgGrid();
}

function clearContainerImgs() {
  _dispatchContainerImages = [];
  const fileInput = document.getElementById('d_container_img');
  if (fileInput) fileInput.value = '';
  renderContainerImgGrid();
}

function handleBulkDrop(e) {
  e.preventDefault();
  document.getElementById('bulkDispatchDrop').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processBulkFile(file);
}

function handleBulkFile(e) {
  const file = e.target.files[0];
  if (file) processBulkFile(file);
}

function processBulkFile(file) {
  if (file.size > 5*1024*1024) { toast('File too large. Max 5MB.', 'error'); return; }
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rows = [];
      if (isExcel) {
        if (!window.XLSX) { toast('Spreadsheet reader still loading — try again in a moment', 'error'); return; }
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        rows = readAllExcelSheetsAsRows(wb);
      } else if (name.endsWith('.json')) {
        rows = JSON.parse(e.target.result);
      } else {
        rows = csvTextToRows(e.target.result);
      }

      const looksInward = /inward|inwrd|_in\b|-in\b/i.test(name) && !/outward/i.test(name);
      const normalizedRows = normalizeRowKeys(rows);
      const sniffedDirection = sniffBulkDirectionFromRows(normalizedRows);
      showBulkPreview(normalizedRows, sniffedDirection || (looksInward ? 'in' : 'out'));
    } catch(err) { toast('Could not parse file — check format', 'error'); }
  };
  if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
}

function showBulkPreview(rows, direction) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const tbl  = document.getElementById('bulkPreviewTable');
  tbl.querySelector('thead').innerHTML = `<tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>`;
  tbl.querySelector('tbody').innerHTML = rows.slice(0,10).map(r=>`<tr>${keys.map(k=>`<td>${r[k]||''}</td>`).join('')}</tr>`).join('');
  document.getElementById('bulkRowCount').textContent = `${rows.length} rows`;
  document.getElementById('bulkDispatchPreview').style.display = 'block';
  document.getElementById('bulkDispatchPreview').dataset.rows = JSON.stringify(rows);
  const dirSel = document.getElementById('bd_bulk_direction');
  if (dirSel) dirSel.value = direction === 'in' ? 'in' : 'out';
  updateBulkDispatchDirectionUI();
}


function updateBulkDispatchDirectionUI() {
  const dirSel = document.getElementById('bd_bulk_direction');
  const row = document.getElementById('bd_bulk_outwardtype_row');
  if (!dirSel || !row) return;
  row.style.display = dirSel.value === 'out' ? 'block' : 'none';
}

async function processBulkDispatch() {

  if (_bulkWriteInProgress) { toast('A dispatch import is already in progress — please wait', 'warning'); return; }
  const rows = JSON.parse(document.getElementById('bulkDispatchPreview').dataset.rows||'[]');
  if (!rows.length) { toast('No rows to process', 'error'); return; }


  const batchDirection = document.getElementById('bd_bulk_direction')?.value === 'in' ? 'in' : 'out';
  const batchOutwardType = document.getElementById('bd_bulk_outwardtype')?.value || OUTWARD_TYPES[0];
  const WORKTYPE_ALIASES = {
    'depotport':'Depot → Port', 'depottoport':'Depot → Port', 'outward':'Depot → Port', 'out':'Depot → Port', 'dispatch':'Depot → Port',
    'portdepot':'Port → Depot', 'porttodepot':'Port → Depot', 'inward':'Port → Depot', 'in':'Port → Depot',
  };
  const OUTWARDTYPE_ALIASES = {
    'repatriationtoport':'Repatriation to Port', 'repatriation':'Repatriation to Port',
    'shippersexport':'Shippers/Export', 'export':'Shippers/Export', 'shippers':'Shippers/Export',
    'saleunits':'Sale units', 'sale':'Sale units', 'repat':'Repatriation to Port', 'shipper':'Shippers/Export',
  };

  const btn = document.getElementById('bulkDispatchSubmitBtn');
  const btnOriginalText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = `Processing ${rows.length} row(s)…`; }
  toast(`Processing ${rows.length} dispatch(es) — this can take a moment for large files…`, 'info', 5000);


  _bulkWriteInProgress = true;


  await new Promise(r => setTimeout(r, 0));

  try {

  let created = 0;
  const flagged = []; // rows still created, but tagged for later cleanup
  const seenInBatch = new Set();
  const usedTrucksInBatch  = new Set();
  const usedDriversInBatch = new Set();
  const newTrips = []; // collected for a direct, chunked save below
  const importBatchId = `DSP-${new Date().toISOString().slice(0,10)}-${Date.now().toString(36).toUpperCase()}`;


  const liveTripByContainer = new Map();
  state.db.trips.forEach(t => {
    if (isTripLive(t) && t.container) {
      const key = t.container.toUpperCase();
      if (!liveTripByContainer.has(key)) liveTripByContainer.set(key, t);
    }
  });


  const CHUNK = 300;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunkRows = rows.slice(start, start + CHUNK);
    if (btn && rows.length > CHUNK) btn.textContent = `Processing ${Math.min(start + CHUNK, rows.length)}/${rows.length}…`;

    chunkRows.forEach((r, chunkIdx) => {
      const idx = start + chunkIdx;

    const contRaw = pickField(r, ['container','containerno','containernumber','containernrno']);
    const rowLabel = contRaw ? contRaw : `row ${idx+1}`;

    let cont = contRaw ? contRaw.trim().toUpperCase() : '';
    const issueTags = [];
    if (!cont) {
      cont = `UNKNOWN-ROW${idx+1}-${Date.now().toString(36).toUpperCase()}`;
      issueTags.push('missing container number — placeholder assigned');
      flagged.push(`${rowLabel}: missing container number (placeholder ${cont})`);
    } else {
      const contIssue = containerFormatIssue(cont);
      if (contIssue) { issueTags.push(contIssue); flagged.push(`${cont}: ${contIssue}`); }
    }
    if (seenInBatch.has(cont)) { issueTags.push('duplicate container within this file'); flagged.push(`${cont}: duplicate container within this file`); }
    const dupTrip = liveTripByContainer.get(cont) || null;
    if (dupTrip) { issueTags.push('already on an active trip'); flagged.push(`${cont}: already on an active trip`); }
    seenInBatch.add(cont);


    const truckRaw  = pickField(r, ['truck','truckreg','vehicle','reg','truckno','lorryno']);
    const transporterRaw = pickField(r, ['transporters','transporter']);
    const driverRaw = pickField(r, ['driver','drivername','driversname']);
    const truck  = state.db.trucks.find(t=>t.reg===truckRaw||t.id===truckRaw||t.reg===transporterRaw);
    const driver = state.db.drivers.find(d=>d.name===driverRaw||d.id===driverRaw);

    const truckConflict  = truck  && usedTrucksInBatch.has(truck.id);
    const driverConflict = driver && usedDriversInBatch.has(driver.id);
    if (truckConflict)  { issueTags.push(`truck ${truck.reg} used more than once in this batch`); flagged.push(`${cont}: truck ${truck.reg} used more than once in this batch`); }
    if (driverConflict) { issueTags.push(`driver ${driver.name} used more than once in this batch`); flagged.push(`${cont}: driver ${driver.name} used more than once in this batch`); }
    if (truck)  usedTrucksInBatch.add(truck.id);
    if (driver) usedDriversInBatch.add(driver.id);

    const lineRaw = pickField(r, ['line','shippingline','linecode','shippinglines']);
    let line = findShippingLineByText(lineRaw);
    const vesselForLine = pickField(r, ['vessel','exvessel']);
    if (!line && vesselForLine) {
      const guessedLineId = resolveLineIdFromVessel(vesselForLine);
      if (guessedLineId) line = state.db.shippingLines.find(l => l.id === guessedLineId) || null;
    }
    if (!line) {
      const lineIssue = lineRaw ? `shipping line "${lineRaw}" not found in Shipping Lines` : 'no shipping line in file';
      issueTags.push(lineIssue); flagged.push(`${cont}: ${lineIssue}`);
    }

    const sizeRaw = pickField(r, ['size']);
    const typeRaw = pickField(r, ['containertype','type']);
    const ctypeExplicit = pickField(r, ['ctype']);

    const ctype = (sizeRaw && typeRaw) ? composeCtypeFromDepotCode(sizeRaw, typeRaw)
      : (CONTAINER_TYPE_OPTIONS.find(c => c.toLowerCase() === ctypeExplicit.toLowerCase()) || ctypeExplicit || '20ft Dry');


    const dateOutRaw = pickField(r, ['dateout','dateexited']);
    let dateOutVal = null;
    { const dOut = parseFlexibleDate(dateOutRaw); if (dOut) dateOutVal = dOut.toISOString(); }

    let dateVal = dateOutVal || new Date().toISOString();
    const dateRaw = pickField(r, ['date','dispatchdate','startdate','starttime','datedispatched','datein','entrydate','dategatein']);
    { const d = parseFlexibleDate(dateRaw); if (d) { dateVal = d.toISOString(); flagIfImplausibleDate(d, issueTags, flagged, rowLabel); } }

    const notesParts = ['Bulk import'];
    if (transporterRaw && !truck) notesParts.push(`Transporter: ${transporterRaw}`);
    notesParts.push(...issueTags.map(t=>`⚠ ${t}`));


    const worktypeRaw = pickField(r, ['worktype','workType','direction','movement']).toLowerCase().replace(/[^a-z]/g,'');
    const workType = WORKTYPE_ALIASES[worktypeRaw] || (batchDirection === 'in' ? 'Port → Depot' : 'Depot → Port');
    let outwardType = null;
    if (isOutwardWorkType(workType)) {
      const outwardTypeRaw = pickField(r, ['outwardtype','movementtype']).toLowerCase().replace(/[^a-z\/]/g,'');
      outwardType = OUTWARDTYPE_ALIASES[outwardTypeRaw] || batchOutwardType;
    }

    const trip = {
      id: uid('TRIP'), container: cont,
      truckId: truck?truck.id:'', driverId: driver?driver.id:'',
      ctype, workType, outwardType,
      origin: r.origin||'', dest: r.destination||r.dest||'', distance: parseInt(r.distance)||0,
      shippingLine: line?.id||'', priority:'Normal', notes: notesParts.join(' — '),
      ref: `BULK-${Date.now()}-${created}`,

      status: 'completed',
      startTime: dateVal, eta: dateOutVal || new Date(new Date(dateVal).getTime()+4*3600000).toISOString(),
      eirNumber: sanitize(pickField(r, ['eir','eirno'])),
      receivingParty: sanitize(pickField(r, ['receivingparty','deliveringparty'])),
      releaseOrderNo: sanitize(pickField(r, ['releaseorderno'])),
      vessel: sanitize(pickField(r, ['vessel','exvessel'])),
      voyage: sanitize(pickField(r, ['voyage'])),
      dateOut: dateOutVal || dateVal,
      flaggedForReview: issueTags.length > 0,
      flagReasons: issueTags.slice(),
      duplicateOfId: dupTrip ? dupTrip.id : null,
      importBatchId,
      _dirty: true,
    };
    state.db.trips.push(trip);
    newTrips.push(trip);
    created++;

    });

  
    await new Promise(r => setTimeout(r, 0));
  }


  let saveResult = null;
  try {
    saveResult = await upsertRowsChunked('trips', newTrips.map(tripToRow));
  } catch (e) {
    console.error('Bulk dispatch save failed:', e && e.message, e);
    saveResult = { table: 'trips', error: e };
  }
  newTrips.forEach(t => { delete t._dirty; });
  buildBadges();
  addAudit(state.profile.username, 'Bulk Dispatch', `${created} dispatches imported${flagged.length?`, ${flagged.length} flagged for review`:''} (batch ${importBatchId})`);
  scheduleSave(); // persists the audit log entry above
  if (saveResult) {
    toast(`Import saved with errors — check console and retry if rows are missing (${(saveResult.error && saveResult.error.message) || 'see console'})`, 'error', 7000);
  } else if (flagged.length) {
    toast(`${created} created — ${flagged.length} flagged for cleanup (see details)`, 'warning', 6000);
    openModal('Bulk Dispatch Result', `<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${created} dispatch(es) created successfully — all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (${flagged.length})</div><div style="max-height:240px;overflow-y:auto">${flaggedPreview(flagged).map(s=>`<div class="ops-notice" style="margin-bottom:6px">${esc(s)}</div>`).join('')}</div>`);
  } else {
    toast(`${created} dispatches created`, 'success');
  }
  refreshAwaitingDispatchUI();
  document.getElementById('bulkDispatchPreview').style.display = 'none';
  renderDispatchQueue();

  } catch (e) {

    console.error('Bulk dispatch failed:', e && e.message, e);
    toast(`Bulk dispatch failed — ${(e && e.message) || 'unexpected error'}. Nothing further was imported.`, 'error', 7000);
  } finally {
    _bulkWriteInProgress = false;
    if (btn) { btn.disabled = false; btn.textContent = btnOriginalText || 'Process All Dispatches →'; }
  }
}

function downloadBulkTemplate() {
  const csv = 'container,size,type,eir,dateOut,receivingParty,releaseOrderNo,vessel,voyage,truck,driver,origin,destination,workType,distance\nMSCU1234566,40ft,Dry,EIR-00789,,,,,,KDA 001A,James Otieno,Kilindini Port,Shimanzi ICD,Port → Depot,18';
  const a   = document.createElement('a');
  a.href     = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = 'gargo_bulk_template.csv';
  a.click();
}

function quickDispatchOut(id) {
  if (!isAdmin()) { toast('Quick Dispatch is for administrators only', 'error'); return; }
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) return;
  openModal(`Quick Dispatch — ${sanitize(ic.container)}`, `
    <div class="ops-notice" style="margin-bottom:12px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      Use this to record that a container already left the depot without creating a full dispatch trip — for containers that left before this system was in use, or whose exit wasn't captured through Dispatch Console. It won't ask for a truck or driver.
    </div>
    <div class="fg"><label>Date Out <span class="label-optional">(optional, defaults to now)</span></label><input id="qd_dateout" type="datetime-local" /></div>
    <div class="fg"><label>Receiving Party</label><input id="qd_receiving" placeholder="Consignee / receiving party" /></div>
    <div class="fg"><label>Release Order No.</label><input id="qd_release_no" placeholder="CRO / release order no. (if any)" /></div>
    <button class="submit-btn" onclick="confirmQuickDispatchOut('${id}')">Mark as Dispatched →</button>
  `);
}

function confirmQuickDispatchOut(id) {
  if (!isAdmin()) { closeModal(); return; }
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) { closeModal(); return; }
  const dateInput = document.getElementById('qd_dateout').value;
  ic.dateOut = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
  ic.receivingParty = sanitize(document.getElementById('qd_receiving').value.trim());
  ic.releaseOrderNo = sanitize(document.getElementById('qd_release_no').value.trim());
  ic._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Quick Dispatch (No Trip)', `${ic.container} marked out — bypassed full dispatch process`);
  toast(`${ic.container} marked as dispatched`, 'success');
  closeModal();
  renderInwardRecent();
  renderInwardStillInStorage();
  renderInterchange(_icFilter || 'all');
}

// ================== PUBLIC BOOKINGS ==================
/* Movement services (transport / returns) still become fleet trips. Every other website or
   account booking follows the depot flow:  Pending -> Confirm -> Awaiting Gate-In -> "Confirmed In"
   (opens Inward Container Entry) -> Awaiting Survey -> Survey -> Storage -> Dispatch. */
function bookingIsMovement(serviceType) {
  const x = String(serviceType || '').toLowerCase();
  return x.includes('transport') || x.includes('return') || x.includes('haulage');
}

const BOOKING_STATUS_LABEL = { pending: 'Pending', confirmed: 'Awaiting gate-in', imported: 'Gated in', cancelled: 'Cancelled', rejected: 'Rejected' };
const BOOKING_STATUS_CLASS = { pending: 's-pending', confirmed: 's-approved', imported: 's-imported', cancelled: 's-cancelled', rejected: 's-cancelled' };

let _publicBookingFilter = 'pending';

function filterPublicBookings(filter, btn) {
  _publicBookingFilter = filter;
  document.querySelectorAll('#sec-publicbookings .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPublicBookings();
}

async function renderPublicBookings() {
  const container = document.getElementById('publicBookingsList');
  if (!container) return;

  let query = supabase.from('public_bookings').select('*');
  if (_publicBookingFilter !== 'all') {
    query = query.eq('status', _publicBookingFilter);
  }
  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="empty-state">Error: ${sanitize(error.message)}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">No ${_publicBookingFilter === 'all' ? '' : (BOOKING_STATUS_LABEL[_publicBookingFilter] || _publicBookingFilter).toLowerCase() + ' '}bookings</div>`;
    refreshBookingBadge(true);
    return;
  }

  let docs = {};
  try { if (window.bookingDocs) docs = await window.bookingDocs.documentsForBookings(data.map(b => b.id)); } catch (e) { /* best effort */ }

  container.innerHTML = data.map(b => {
    const movement = bookingIsMovement(b.service_type);
    let actions = '';
    if (b.status === 'pending') {
      actions += `<button class="modal-btn primary" onclick="confirmPublicBooking('${b.id}')">Confirm Booking</button>`;
      if (movement) actions += `<button class="modal-btn ghost" onclick="importPublicBooking('${b.id}')">Import to Fleet</button>`;
      actions += `<button class="modal-btn ghost" onclick="cancelPublicBooking('${b.id}','rejected')">Reject</button>`;
    } else if (b.status === 'confirmed') {
      actions += `<button class="modal-btn primary" onclick="startInwardFromBooking('${b.id}')">Confirmed In →</button>`;
      actions += `<button class="modal-btn ghost" onclick="cancelPublicBooking('${b.id}','cancelled')">Cancel</button>`;
    } else if (b.status === 'imported') {
      const trip = findTripByBookingId(b.id);
      if (trip && (!trip.truckId || !trip.driverId)) {
        actions += `<button class="modal-btn primary" onclick="jumpToCompleteDispatch('${trip.id}')">Complete Dispatch →</button>`;
      } else if (trip) {
        actions += `<button class="modal-btn ghost" onclick="showTripDetail('${trip.id}')">View Trip</button>`;
      }
    }
    const hasG = (docs[b.id] || []).some(d => d.doc_type === 'guarantee_form');
    const gBadge = movement ? '' : (hasG ? '<span class="sbadge s-approved">Guarantee form ✓</span>' : '<span class="sbadge s-pending">No guarantee form</span>');
    return `
    <div style="border:1px solid var(--glass-edge,#333);padding:12px;margin-bottom:10px;background:var(--glass,#111);">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div><strong>${sanitize(b.full_name)}</strong>${b.company ? ' · ' + sanitize(b.company) : ''} <span style="color:var(--text-3);font-size:11px">${sanitize(b.email)}${b.phone ? ' · ' + sanitize(b.phone) : ''}</span></div>
        <div style="font-size:11px;color:var(--text-3)">${b.intake_source === 'portal' ? 'Customer account' : b.intake_source === 'website' ? 'Website' : sanitize(b.intake_source || '')}</div>
      </div>
      <div>Service: ${sanitize(b.service_type)}${b.cargo_type ? ' · ' + sanitize(b.cargo_type) : ''}</div>
      <div>Container: <strong>${sanitize(b.container) || 'Not provided'}</strong></div>
      <div style="font-size:10px;color:var(--text-3);">Ref: ${sanitize(b.reference || b.id.slice(0, 8))}${b.bulk_ref ? ' · Bulk ' + sanitize(b.bulk_ref) : ''}${b.pickup_date ? ' · Expected ' + fmtDate(b.pickup_date) : ''}</div>
      <div>${sanitize(b.pickup_location)} → ${sanitize(b.dropoff_location)}</div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="sbadge ${BOOKING_STATUS_CLASS[b.status] || 's-' + b.status}">${BOOKING_STATUS_LABEL[b.status] || sanitize(b.status)}</span>
        ${gBadge}
        ${actions}
        <button class="modal-btn ghost" onclick="showPublicBookingDetail('${b.id}')">View</button>
      </div>
    </div>
  `; }).join('');

  refreshBookingBadge(true);
}

let _bkBadgeAt = 0;
async function refreshBookingBadge(force) {
  if (!force && Date.now() - _bkBadgeAt < 20000) return;
  _bkBadgeAt = Date.now();
  try {
    const { count, error } = await supabase.from('public_bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    if (error) return;
    const badge = document.getElementById('badge-publicbookings');
    if (badge) { badge.textContent = count || ''; badge.style.display = count ? 'inline' : 'none'; }
  } catch (e) { /* badge is cosmetic */ }
}

// Pending -> Awaiting Gate-In. Nothing is imported to trips.
async function confirmPublicBooking(bookingId) {
  const { data: b, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !b) { toast('Booking not found', 'error'); return; }
  if (b.status !== 'pending') { toast('Already processed', 'warning'); renderPublicBookings(); return; }
  if (b.container) {
    const issue = containerFormatIssue(b.container);
    if (issue && !confirm(`Container number "${b.container}" looks wrong: ${issue}.\n\nConfirm the booking anyway?`)) return;
    const avail = await checkContainerAvailable(b.container, { bookingId: b.id });
    if (avail) { toast(avail, 'error', 7000); return; }
  }
  const { data: rows, error: upErr } = await supabase.from('public_bookings')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: state.profile ? state.profile.id : null })
    .eq('id', bookingId).eq('status', 'pending').select();
  if (upErr) { toast(`Could not confirm — ${upErr.message}`, 'error', 8000); return; }
  if (!rows || !rows.length) { toast('Already processed by someone else', 'warning'); renderPublicBookings(); return; }
  addAudit(state.profile.username, 'Booking Confirmed', `${b.container || b.reference || b.id.slice(0, 8)} — awaiting gate-in`);
  toast('Booking confirmed — it is now in Awaiting Gate-In', 'success');
  renderPublicBookings();
  if (typeof renderInwardAwaitingGateIn === 'function') renderInwardAwaitingGateIn();
}

// Reject (pending) or cancel (awaiting gate-in). Frees the container number for a new booking.
async function cancelPublicBooking(bookingId, newStatus) {
  const verb = newStatus === 'rejected' ? 'Reject' : 'Cancel';
  if (!confirm(`${verb} this booking? The container number will be free to book again.`)) return;
  const { data: rows, error } = await supabase.from('public_bookings')
    .update({ status: newStatus === 'rejected' ? 'rejected' : 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId).in('status', ['pending', 'confirmed']).select();
  if (error) { toast(`Could not ${verb.toLowerCase()} — ${error.message}`, 'error', 8000); return; }
  if (!rows || !rows.length) { toast('This booking can no longer be changed', 'warning'); }
  else addAudit(state.profile.username, `Booking ${newStatus === 'rejected' ? 'Rejected' : 'Cancelled'}`, rows[0].container || rows[0].reference || bookingId.slice(0, 8));
  renderPublicBookings();
  if (typeof renderInwardAwaitingGateIn === 'function') renderInwardAwaitingGateIn();
}

function findTripByBookingId(bookingId) {
  return state.db.trips.find(t => t.bookingId === bookingId);
}

async function importPublicBooking(bookingId) {
  const { data: booking, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) { toast('Booking not found', 'error'); return; }
  if (booking.status !== 'pending') { toast('Already processed', 'warning'); return; }
  // Storage / depot bookings are never imported to trips — they go through Awaiting Gate-In.
  if (!bookingIsMovement(booking.service_type)) return confirmPublicBooking(bookingId);
  if (!confirm('Import this booking?')) return;



  try {
    const required = window.bookingDocs.getRequiredDocTypes({
      serviceType: booking.service_type,
      origin: booking.pickup_location,
      destination: booking.dropoff_location,
    });
    if (required.length) {
      const docs = await window.bookingDocs.documentsForBooking(bookingId);
      const verifiedTypes = {};
      docs.forEach(d => { if (d.status === 'verified') verifiedTypes[d.doc_type] = true; });
      const missing = required.filter(rt => !verifiedTypes[rt]);
      if (missing.length) {
        toast(`Can't import — still missing verified: ${missing.join(', ').replace(/_/g,' ')}. Verify documents in DepOps first.`, 'error', 6000);
        return;
      }
    }
  } catch (e) {
    toast(`Could not confirm document status (${(e && e.message) || 'error'}) — import blocked until this can be checked.`, 'error', 6000);
    return;
  }

  const rawCont = (booking.container || '').trim().toUpperCase();
  if (rawCont) {
    const rawContIssue = containerFormatIssue(rawCont);
    if (rawContIssue) { toast(`Booking's container number ${rawCont}: ${rawContIssue} — fix it before importing`, 'error', 6000); return; }
    const dupTrip = findLiveTripByContainer(rawCont);
    if (dupTrip) { toast(`${rawCont} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest}). Resolve that trip first, or correct the container number on this booking.`, 'error'); return; }
  }


  const { data: updatedRows, error: updateErr } = await supabase
    .from('public_bookings')
    .update({ status: 'imported' })
    .eq('id', bookingId)
    .eq('status', 'pending') 
    .select();

  if (updateErr) {
    toast(`Import failed — could not update booking status (${updateErr.message}). No trip was created.`, 'error');
    return;
  }
  if (!updatedRows || updatedRows.length === 0) {
    toast('Import failed — booking was already processed by someone else. Refresh and check.', 'warning');
    renderPublicBookings();
    return;
  }



  if (booking.service_type === 'Depot Storage') {
    const { error: statusErr } = await supabase
      .from('public_bookings')
      .update({ storage_status: 'awaiting_survey' })
      .eq('id', bookingId);
    if (statusErr) {
      toast(`Imported, but couldn't set survey status (${statusErr.message}) — check DepOps → Zones`, 'warning', 6000);
    } else {
      toast('Imported — now awaiting survey in DepOps', 'success');
    }
    renderPublicBookings();
    return;
  }

  const trip = {
    id: uid('TRIP'),
    container: rawCont || `PUB-${booking.id.slice(0,8)}`,
    ctype: booking.cargo_type || '20ft Dry',
    workType: booking.service_type || 'Other',
    origin: booking.pickup_location || '—',
    dest: booking.dropoff_location || '—',
    shippingLine: resolveBookingShippingLineId(booking),
    status: 'active',
    startTime: new Date().toISOString(),
    eta: new Date(Date.now() + 4*3600000).toISOString(),
    distance: 0,
    priority: 'Normal',
    notes: `Imported from public booking #${booking.id}`,
    ref: `PUB-${booking.id.slice(0,8)}`,
    truckId: null,
    driverId: null,
    containerImages: [],
    bookingId: booking.id,
    _dirty: true,
  };
  state.db.trips.push(trip);
  scheduleSave();

  toast('Imported — awaiting dispatch (trip ' + trip.id.slice(-6) + ')', 'success');
  renderPublicBookings();
  refreshAwaitingDispatchUI();
}

async function showPublicBookingDetail(id) {
  const { data: b, error } = await supabase.from('public_bookings').select('*').eq('id', id).single();
  if (error || !b) { toast('Not found', 'error'); return; }
  openModal('Booking Detail', `<pre>${JSON.stringify(b, null, 2)}</pre>`);
}

async function refreshPublicBookings() {
  toast('Refreshing...', 'info');
  await renderPublicBookings();
}

function depOpsDispatchContainer(bookingId) {
  const existingTrip = state.db.trips.find(t => t.workType === 'Depot → Port' && t.bookingId === bookingId);
  if (existingTrip) {
    jumpToCompleteDispatch(existingTrip.id);
    return;
  }
  showSection('depops', document.querySelector('[data-section="depops"]'));
  switchDepOpsTab('outward', document.querySelector('.depops-tab-btn:nth-child(2)'));
  toast('Pick a destination and create the outward trip below — it will then appear in the Dispatch Console.', 'info', 5000);
  setTimeout(() => {
    const el = document.getElementById('depopsEligibleList');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}