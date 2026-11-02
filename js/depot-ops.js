'use strict';


const OUTWARD_TYPES = ['Repatriation to Port', 'Shippers/Export', 'Sale units'];
/* Stored values stay as they are (existing trips, reports and filters keep working); people see the short names. */
const OUTWARD_LABELS = { 'Repatriation to Port': 'Repat', 'Shippers/Export': 'Shipper', 'Sale units': 'Sale Unit' };
function outwardTypeLabel(v) { return OUTWARD_LABELS[v] || v || ''; }
function outwardTypeOptionsHtml(selected) { return OUTWARD_TYPES.map(w => `<option value="${w}"${w === selected ? ' selected' : ''}>${OUTWARD_LABELS[w]}</option>`).join(''); }
/* Gate-In container status (set at the gate; the survey result replaces it later). */
const GATE_IN_STATUSES = ['Available', 'Food Grade', 'Damage'];

const ZONE_LOOKUP_INTERVAL_MS = 60000;

let _lastZoneVal = null;

let _lastZoneFetch = 0;

function reverseGeocodeZone(lat, lng) {
  const run = _nominatimQueue.then(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=14&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      const addr = data.address || {};
      const pick = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.town || addr.city || addr.village;
      return pick || (data.display_name || '').split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } finally {

      await new Promise(r => setTimeout(r, 1100));
    }
  });
  _nominatimQueue = run;
  return run;
}

let _wialonLastZoneFetch = {};


let _inwardImages = [];

function renderInward() {
  populateInwardSelects();
  renderInwardAwaitingGateIn({ cached: true });
  renderInwardRecent();
  renderInwardAwaitingSurvey();
  renderInwardStillInStorage();
  /* Realtime sync re-runs this renderer. It used to wipe whatever the clerk was typing in the gate-in form every time
     any user changed any record. Only reset the form when it is empty or holds nothing the clerk typed. */
  const typed = ['iw_container', 'iw_truck', 'iw_driver', 'iw_driver_id', 'iw_trailer', 'iw_consignee'].some(id => { const el = document.getElementById(id); return el && el.value; })
    || Array.from(document.querySelectorAll('#inwardTabSingle [id^="gf_inward_"]')).some(el => el.value);
  if (!typed && !_inwardBooking) clearInwardForm(true);
}

function populateInwardSelects() {
  if (typeof fillIncomingDatalists === 'function') fillIncomingDatalists();
  else { fillDatalist('iwTruckList', state.db.trucks, t=>t.reg); fillDatalist('iwDriverList', state.db.drivers, d=>d.name); }
  if (typeof bindIncomingDriverAutofill === 'function') bindIncomingDriverAutofill('iw');
  fillSelect('iw_line',   state.db.shippingLines.filter(l=>l.active), l=>[l.id, `${l.code} — ${l.name}`]);
  populateSizeTypeSelects('iw_size', 'iw_type');
}

function renderInwardRecent() {
  const el   = document.getElementById('inwardRecentList');
  const meta = document.getElementById('inwardRecentMeta');
  if (!el) return;
  const top = [];   // newest 8 inward records, found in one pass (no full sort of the whole table)
  for (const i of state.db.interchange) {
    if (i.type !== 'Gate-In' && i.type !== 'Depot-In') continue;
    const t = +new Date(i.date) || 0;
    if (top.length < 8 || t > top[top.length - 1][0]) {
      let k = top.length; while (k > 0 && top[k - 1][0] < t) k--;
      top.splice(k, 0, [t, i]); if (top.length > 8) top.pop();
    }
  }
  const items = top.map(x => x[1]);
  const _idx = icOutIndex();
  if (meta) meta.textContent = `${items.length} shown`;
  el.innerHTML = items.map(ic => `<div class="dispatch-queue-item" onclick="showSection('interchange', document.querySelector('[data-section=&quot;interchange&quot;]'))">
      <div class="dqi-ref">${esc(ic.container)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(ic.type)} · ${esc(lineName(ic.line))}</div>
        <div style="font-size:10px;color:var(--text-3)">${ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || '—')} · ${ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || '—')}</div>
      </div>
      ${icAwaitingSurvey(ic) ? '<span class="sbadge s-pending">Awaiting survey</span>' : sbadge(ic.status)}
      ${(() => { const x = icExitDate(ic, _idx); return x ? `<span class="sbadge" title="This container has left the yard" style="color:var(--text-3)">Exited ${fmtDate(x)}</span>` : (ic.surveyStatus === 'awaiting_survey' ? '' : '<span class="sbadge s-active">In yard</span>'); })()}
      <div class="dqi-time">${timeAgo(ic.date)}</div>
      ${icInYard(ic, _idx) ? `<button class="modal-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="event.stopPropagation();quickDispatchOut('${ic.id}')">Quick Dispatch →</button>` : ''}
    </div>`).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No inward entries yet</div></div>';
}


/* FIX: capped at LIMIT cards. Previously drew every inward container with no recorded
   exit (12k+ DOM cards), which froze the browser when the section was opened. */
function renderInwardStillInStorage() {
  const wrap = document.getElementById('inwardStillInStorageList');
  const meta = document.getElementById('inwardStillInStorageMeta');
  if (!wrap) return;

  const LIMIT = 50;   // cards actually drawn; the count in the header is always the true total
  const _idx = icOutIndex();
  const items = state.db.interchange
    .filter(i => icInYard(i, _idx))
    .map(i => [+new Date(i.date) || 0, i])
    .sort((a, b) => a[0] - b[0])                 // oldest first (each date parsed once)
    .map(x => x[1]);

  if (meta) {
    meta.textContent = items.length
      ? `${items.length} without a recorded exit${items.length > LIMIT ? ` · showing oldest ${LIMIT}` : ''}`
      : '';
  }
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Everything logged has a recorded exit</div></div>';
    return;
  }

  const cards = items.slice(0, LIMIT).map(ic => `<div class="dispatch-queue-item">
      <div class="dqi-ref">${esc(ic.container)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(ic.ctype || '—')} · ${esc(lineName(ic.line))}</div>
        <div style="font-size:10px;color:var(--text-3)">In since ${fmtDate(ic.date)}${ic.notes==='Bulk import' ? ' · migrated record' : ''}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${!ic.surveyStatus ? `<button class="modal-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="sendToSurvey('${ic.id}')">Send to Survey →</button>` : ''}
        <button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="quickDispatchOut('${ic.id}')">Quick Dispatch →</button>
      </div>
    </div>`).join('');

  const more = items.length > LIMIT
    ? `<div style="padding:10px 14px;font-size:11px;color:var(--text-3);text-align:center">${items.length - LIMIT} more not shown — use the Reports tab (Status: Still In Storage) to search and export the full list.</div>`
    : '';
  wrap.innerHTML = cards + more;
}


/* FIX: capped at LIMIT rows (also keeps the guarantee-form .in() id list short enough for the URL). */
async function renderInwardAwaitingSurvey() {
  const wrap = document.getElementById('inwardAwaitingSurveyList');
  const meta = document.getElementById('inwardAwaitingSurveyMeta');
  if (!wrap) return;

  const LIMIT = 100;
  const all = state.db.interchange
    .filter(i => i.surveyStatus === 'awaiting_survey')
    .sort((a,b) => new Date(a.date) - new Date(b.date)); // oldest first — the ones waiting longest surface first
  const items = all.slice(0, LIMIT);

  if (meta) {
    meta.textContent = all.length
      ? `${all.length} waiting${all.length > LIMIT ? ` · showing oldest ${LIMIT}` : ''}`
      : '';
  }

  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Nothing awaiting survey</div></div>';
    return;
  }

  let docsByIc = {}, docsByBooking = {};
  try {
    if (window.bookingDocs) {
      docsByIc = await window.bookingDocs.documentsForInterchanges(items.map(i => i.id));
      const bIds = items.map(i => i.bookingId).filter(Boolean);
      if (bIds.length) docsByBooking = await window.bookingDocs.documentsForBookings(bIds);
    }
  } catch (e) { /* guarantee-form status is best-effort — list still renders without it */ }

  const cards = items.map(ic => {
    const hasGuarantee = (docsByIc[ic.id] || []).some(d => d.doc_type === 'guarantee_form') || (docsByBooking[ic.bookingId] || []).some(d => d.doc_type === 'guarantee_form');
    return `<div class="dispatch-queue-item">
      <div class="dqi-ref">${esc(ic.container)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(ic.type)} · ${esc(lineName(ic.line))}</div>
        <div style="font-size:10px;color:var(--text-3)">${ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || '—')} · ${ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || '—')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        ${hasGuarantee ? '<span class="sbadge s-approved">Guarantee form ✓</span>' : '<span class="sbadge s-pending">No guarantee form</span>'}
        <div class="dqi-time" style="margin:0">${timeAgo(ic.date)}</div>
      </div>
      <button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="startSurveyForInterchange('${ic.id}')">Start Survey →</button>
    </div>`;
  }).join('');

  const more = all.length > LIMIT
    ? `<div style="padding:10px 14px;font-size:11px;color:var(--text-3);text-align:center">${all.length - LIMIT} more waiting — they appear here as the oldest ones are surveyed.</div>`
    : '';
  wrap.innerHTML = cards + more;
}

function markInwardSurveyed(id) {
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) return;
  ic.surveyStatus = 'surveyed';
  ic.surveyedAt = new Date().toISOString();
  ic.surveyedBy = state.profile.username;
  ic._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Inward Entry Surveyed', ic.container);
  toast(`${ic.container} marked surveyed`, 'success');
  renderInwardAwaitingSurvey();
  renderInwardRecent();
}

let _inwardSaving = false;
let _inwardBooking = null;   // the confirmed website/account booking being gated in (null = ordinary entry)
async function createInwardEntry() {
  if (_inwardSaving) return;
  _inwardSaving = true;
  try { await _createInwardEntryInner(); } finally { _inwardSaving = false; }
}
/* ── STEP 1 of 2: Gate-In ────────────────────────────────────────────
   The gate records only what it can see: container, size/type, shipping line,
   driver (name + ID) and truck. That completes the Gate-In and queues the
   container for survey. The survey (step 2) captures everything else and, when
   saved, turns the record into a Depot-In.                                      */
async function _createInwardEntryInner() {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const cont = val('iw_container').toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }

  const lineId = val('iw_line');
  if (!lineId) { toast('Choose the shipping line', 'error'); return; }
  if (!document.getElementById('iw_size').value || !document.getElementById('iw_type').value) { toast('Choose the container size and type', 'error'); return; }
  const truckVal = val('iw_truck'), driverVal = val('iw_driver'), driverIdVal = val('iw_driver_id');
  const cg = k => (window.cfgGet ? window.cfgGet(k) : undefined);   // System Settings → Depot operations
  if (!truckVal && cg('gate.requireTruck') !== false) { toast('Lorry / truck number required', 'error'); return; }
  if (!val('iw_trailer') && cg('gate.requireTrailer')) { toast('Trailer number required', 'error'); return; }
  if (!driverVal) { toast('Driver name required', 'error'); return; }
  if (!driverIdVal && cg('gate.requireDriverId') !== false) { toast("Driver's ID / driving licence number required", 'error'); return; }

  if (window.GargoForms) { const formErr = GargoForms.validate('inward'); if (formErr) { toast(formErr, 'error'); return; } }   // Form Designer rules
  const custom = window.GargoForms ? GargoForms.collect('inward') : {};                                                        // Form Designer fields

  const type = 'Gate-In';
  const dateVal = new Date().toISOString();
  const dupIc = findDuplicateInterchange(cont, type, dateVal);
  if (dupIc) { toast(`${cont} already has a ${type} record logged on ${fmtDate(dateVal)}`, 'warning'); return; }

  const booking = _inwardBooking;
  // One live record per container number, checked against the server before anything is saved
  const avail = await checkContainerAvailable(cont, { bookingId: booking ? booking.id : null });
  if (avail) { toast(avail, 'error', 7000); return; }

  const truck = state.db.trucks.find(t => t.reg.toLowerCase() === truckVal.toLowerCase());
  const driver = state.db.drivers.find(d => d.name.toLowerCase() === driverVal.toLowerCase());
  const icId = uid('IC');
  const ctype = composeCtype(document.getElementById('iw_size').value, document.getElementById('iw_type').value);
  const bk = booking || {};   // the interchange (EIR) number is issued when the survey is complete, not at the gate

  const icRecord = {
    id: icId, container: cont, type, ctype, line: lineId, condition: (GATE_IN_STATUSES.includes(val('iw_status')) ? val('iw_status') : 'Available'),
    truck: truck ? truck.id : '', driver: driver ? driver.id : '',
    truckRegText: truck ? '' : sanitize(truckVal), driverNameText: driver ? '' : sanitize(driverVal),
    driverIdNumber: sanitize(driverIdVal), trailerNo: sanitize(val('iw_trailer')),
    transporter: sanitize(bk.transporter || ''), eirNumber: '',
    clerkName: (state.profile && state.profile.name) || '',
    blNumber: sanitize(bk.bl_number || ''), guaranteeNo: sanitize(bk.bl_number || ''),
    vessel: sanitize(bk.vessel || ''), voyage: sanitize(bk.voyage || ''), deliveringParty: sanitize(val('iw_consignee') || bk.company || ''),
    isoCode: '', grossWeight: '', manufactureDate: '', cargoStatus: '',
    repairs: [], repairTotal: 0, notes: booking ? `Booking ${bk.reference || String(bk.id).slice(0, 8)} \u00b7 ${bk.full_name || ''}${bk.phone ? ' \u00b7 ' + bk.phone : ''}` : '',
    date: dateVal, gateInAt: dateVal, depotInAt: null, status: 'pending', img: '', photos: [],
    dateOut: null, receivingParty: '', releaseOrderNo: '',
    needsSurvey: true, surveyStatus: 'awaiting_survey', surveyedAt: null, surveyedBy: null, bookingId: booking ? booking.id : null,
    custom,
    _dirty: true,
  };
  // Save first, then confirm: if the server refuses (e.g. duplicate), nothing is left half-recorded
  const savedIc = await persistNewInterchange(icRecord);
  if (!savedIc.ok) { toast(`Gate-In NOT saved \u2014 ${savedIc.message}`, 'error', 9000); return; }
  buildBadges();
  if (typeof rememberIncomingDriver === 'function' && !driver) {
    rememberIncomingDriver({ name: driverVal, idNo: driverIdVal, transporter: icRecord.transporter, truck: truck ? truck.reg : truckVal, trailer: icRecord.trailerNo });
  }
  if (booking) {
    const { error: bErr } = await supabase.from('public_bookings').update({
      status: 'imported', storage_status: 'awaiting_survey', gated_in_at: dateVal,
      truck_reg: truckVal, driver_name: driverVal, driver_id_number: driverIdVal, shipping_line_id: lineId, container: cont,
    }).eq('id', booking.id).in('status', ['pending', 'confirmed']);
    if (bErr) toast(`Gate-In saved, but the booking status could not be updated \u2014 ${bErr.message}`, 'warning', 8000);
    addAudit(state.profile.username, 'Booking Gated In', `${bk.reference || String(bk.id).slice(0, 8)} \u00b7 ${cont}`);
  }
  addAudit(state.profile.username, 'Gate-In Recorded', `${cont} \u2014 awaiting survey`);
  refreshContainerHistory();
  clearInwardForm();
  if (state.currentSection === 'interchange') renderInterchange(_icFilter);   // PERF: was re-drawing the whole Interchange list while on the Inward screen
  renderInwardRecent(); renderInwardAwaitingSurvey(); renderInwardStillInStorage();
  if (booking) renderInwardAwaitingGateIn();                                 // only a booking gate-in changes that list (it re-queries the server)
  if (booking && typeof renderPublicBookings === 'function' && state.currentSection === 'publicbookings') renderPublicBookings();

  if (!booking) {
    // Queue it for survey: a companion DepOps booking lets it use the same survey and allocation pipeline as customer bookings
    try {
      const bookingId = await createDepotBookingFromInterchange(icRecord);
      if (bookingId) { icRecord.bookingId = bookingId; icRecord._dirty = true; }
    } catch (e) {
      toast(`Gate-In saved, but couldn't queue ${cont} for survey (${e.message || e}). Use Start Survey in the Awaiting Survey list to retry.`, 'warning', 8000);
    }
  }
  scheduleSave();
  renderInwardAwaitingSurvey();
  if (typeof renderDepOpsAwaitingSurvey === 'function') renderDepOpsAwaitingSurvey();
  showInwardGated(icRecord);
  toast(`Gate-In complete \u2014 ${cont}. Now awaiting survey; the interchange is issued after the survey.`, 'success', 5000);
}

function showInwardGated(ic) {
  const el = document.getElementById('inwardJustGated'); if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `<b>${esc(ic.container)} gated in</b><br>Step 2: survey it to complete the Depot-In. The interchange (EIR) is issued when the survey is saved.
    <div style="margin-top:8px"><button class="action-btn" onclick="startSurveyForInterchange('${ic.id}')">Start survey now &rarr;</button>
    <button class="action-btn ghost" onclick="this.closest('#inwardJustGated').style.display='none'">Later</button></div>`;
}

/* A driver picked from the list fills in their ID and usual truck. */
function iwDriverPicked(inp) {
  const d = (state.db.drivers || []).find(x => (x.name || '').toLowerCase() === inp.value.trim().toLowerCase());
  if (!d) return;
  const idEl = document.getElementById('iw_driver_id'), trEl = document.getElementById('iw_truck');
  if (idEl && !idEl.value && d.idNo) idEl.value = d.idNo;
  if (trEl && !trEl.value && d.truckId) { const t = state.db.trucks.find(x => x.id === d.truckId); if (t) trEl.value = t.reg; }
}

/* Start (or resume) the survey for a gate-in record, creating its DepOps queue entry if it has none yet. */
async function startSurveyForInterchange(icId) {
  const ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Record not found', 'error'); return; }
  let bid = ic.bookingId;
  if (!bid) {
    try { bid = await createDepotBookingFromInterchange(ic); }
    catch (e) { toast(`Could not prepare the survey: ${e.message || e}`, 'error', 7000); return; }
    if (!bid) { toast('Could not prepare the survey for this container', 'error'); return; }
    ic.bookingId = bid; ic._dirty = true; scheduleSave();
  }
  openSurveyModal(bid);
}

/* Survey complete: the container is now Depot-In. The original gate-in time and EIR number are kept. */
function finalizeDepotIn(ic) {
  if (!ic || !isInwardMovement(ic.type)) return false;
  if (!ic.gateInAt) ic.gateInAt = ic.date;
  ic.type = 'Depot-In';
  ic.depotInAt = ic.depotInAt || new Date().toISOString();
  ic._dirty = true;
  return true;
}

function clearInwardForm(skipRepopulate) {
  ['iw_container', 'iw_truck', 'iw_driver', 'iw_driver_id', 'iw_trailer', 'iw_consignee'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const iwSt = document.getElementById('iw_status'); if (iwSt) iwSt.value = 'Available';
  if (window.GargoForms) GargoForms.clearForm('inward');
  _inwardBooking = null;
  const bn = document.getElementById('inwardBookingBanner'); if (bn) { bn.style.display = 'none'; bn.innerHTML = ''; }
  _inwardImages = [];
  if (!skipRepopulate) populateInwardSelects();
}

function switchInwardTab(tab, btn) {
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? 'block' : 'none'; };
  show('inwardTabSingle', tab === 'single'); show('inwardTabBulk', tab === 'bulk'); show('inwardTabReports', tab === 'reports');
  document.querySelectorAll('#sec-inward .filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'reports') { fillSelect('iwRptLine', state.db.shippingLines, l => [l.id, `${l.code} \u2014 ${l.name}`]); { const s = document.getElementById('iwRptLine'); if (s && s.options[0]) s.options[0].textContent = 'All Lines'; } renderInwardReports(); }
}

/* ── Inward reports ── */
let _iwRptRows = [];
function iwStatusOf(ic, exited) {
  const out = exited[String(ic.container || '').toUpperCase()];
  if (ic.dateOut || (out && new Date(out) >= new Date(ic.gateInAt || ic.date))) return 'exited';
  if (ic.surveyStatus === 'awaiting_survey' || ic.surveyStatus === 'escalated') return 'awaiting_survey';
  return 'in_storage';
}
const IW_STATUS_LABEL = { awaiting_survey: 'Awaiting Survey', in_storage: 'In Storage', exited: 'Exited' };

function renderInwardReports() {
  const body = document.getElementById('iwRptBody'); if (!body) return;
  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const line = g('iwRptLine'), mv = g('iwRptType'), st = g('iwRptStatus'), from = g('iwRptFrom'), to = g('iwRptTo');
  const exited = {};
  (state.db.interchange || []).filter(i => /Out$/.test(i.type)).forEach(i => { const k = String(i.container || '').toUpperCase(); if (!exited[k] || new Date(i.date) > new Date(exited[k])) exited[k] = i.date; });
  const all = (state.db.interchange || []).filter(i => isInwardMovement(i.type)).map(i => ({ ic: i, status: iwStatusOf(i, exited), at: i.gateInAt || i.date }));
  _iwRptRows = all.filter(r =>
    (!line || r.ic.line === line) && (!mv || r.ic.type === mv) && (!st || r.status === st) &&
    (!from || String(r.at).slice(0, 10) >= from) && (!to || String(r.at).slice(0, 10) <= to))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  const n = s => _iwRptRows.filter(r => r.status === s).length;
  const sum = document.getElementById('iwRptSummary');
  if (sum) sum.innerHTML = `<div class="kpi-row" style="margin-bottom:14px">${kpiCard('Matching records', _iwRptRows.length, '', 'kpi-blue')}${kpiCard('Awaiting survey', n('awaiting_survey'), 'Gated in, not surveyed', n('awaiting_survey') ? 'kpi-orange' : 'kpi-green')}${kpiCard('In storage', n('in_storage'), 'Surveyed, on the ground', 'kpi-gold')}${kpiCard('Exited', n('exited'), 'Released', 'kpi-green')}</div>`;
  const meta = document.getElementById('iwRptMeta'); if (meta) meta.textContent = `${_iwRptRows.length} record${_iwRptRows.length === 1 ? '' : 's'}`;
  const btn = document.getElementById('iwRptExportBtn'); if (btn) btn.disabled = !_iwRptRows.length;
  body.innerHTML = _iwRptRows.map(({ ic, status, at }) => `<tr><td>${fmtDate(at)}</td><td><b>${esc(ic.container)}</b></td><td>${esc(ic.type)}</td><td>${esc(ic.ctype || '-')}</td><td>${esc(lineName(ic.line))}</td>
    <td>${ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || '-')}</td><td>${ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || '-')}</td><td>${esc(IW_STATUS_LABEL[status])}</td>
    <td>${status === 'awaiting_survey' && ic.surveyStatus !== 'escalated' ? `<button class="modal-btn primary" style="padding:3px 9px;font-size:10.5px" onclick="startSurveyForInterchange('${ic.id}')">Survey</button>` : ''}</td></tr>`).join('')
    || '<tr><td colspan="9" class="empty-td">No inward entries match these filters</td></tr>';
}

function inwardReportsReset() {
  ['iwRptLine', 'iwRptType', 'iwRptStatus', 'iwRptFrom', 'iwRptTo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderInwardReports();
}

function downloadInwardReportCSV() {
  if (!_iwRptRows.length) { toast('Run the report first. There is nothing to export.', 'warning'); return; }
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['Gate-In date', 'Depot-In date', 'Container', 'Movement', 'Size/Type', 'Shipping line', 'EIR No.', 'Truck', 'Trailer', 'Driver', 'Driver ID', 'Status'];
  const rows = _iwRptRows.map(({ ic, status, at }) => [at, ic.depotInAt || '', ic.container, ic.type, ic.ctype, lineName(ic.line), ic.eirNumber,
    ic.truck ? truckName(ic.truck) : ic.truckRegText, ic.trailerNo, ic.driver ? driverName(ic.driver) : ic.driverNameText, ic.driverIdNumber, IW_STATUS_LABEL[status]]);
  const blob = new Blob(['\ufeff' + ghCsvPreamble('\r\n') + [head].concat(rows).map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `inward-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ── Companion DepOps booking for gate-flagged containers ──────────
   When a container is flagged for survey via Inward Container Entry
   (checkbox at creation, or "Send to Survey" on an existing record),
   this creates a matching public_bookings row so the container flows
   through the exact same DepOps survey → allocation pipeline as a
   customer booking. Linked back to the interchange row via bookingId,
   and forward via depot_surveys.source_interchange_id once surveyed. */
async function createDepotBookingFromInterchange(ic) {
  const truck  = ic.truck  ? state.db.trucks.find(t => t.id === ic.truck)   : null;
  const driver = ic.driver ? state.db.drivers.find(d => d.id === ic.driver) : null;
  const payload = {
    booking_kind: 'depot',
    intake_source: 'gate',
    status: 'imported',
    service_type: 'Depot Storage',
    storage_status: 'awaiting_survey',
    full_name: driver ? driver.name : (ic.driverNameText || 'Gate Entry'),
    company: ic.deliveringParty || '',
    email: '',
    phone: '',
    container: ic.container || '',
    cargo_type: ic.ctype || '',
    shipping_line_id: ic.line || null,
    vessel: ic.vessel || '',
    voyage: ic.voyage || '',
    bl_number: ic.blNumber || '',
    eir_number: ic.eirNumber || '',
    transporter: ic.transporter || '',
    truck_reg: truck ? truck.reg : (ic.truckRegText || ''),
    driver_name: driver ? driver.name : (ic.driverNameText || ''),
    driver_id_number: ic.driverIdNumber || '',
  };
  const { data, error } = await supabase.from('public_bookings').insert(payload).select('id').single();
  if (error) { toast(`Could not create DepOps booking record: ${error.message}`, 'error'); return null; }
  return data.id;
}

/* ── Awaiting Gate-In: confirmed bookings (website / customer accounts) that have not arrived yet ── */
/* PERF: this used to download EVERY confirmed booking (select '*', no limit) and then every guarantee-form
   document for all of them in one giant .in() query, on every visit to the section. Now:
   - only the first GATEIN_PAGE bookings are fetched (the header still shows the true total),
   - documents are fetched for just those rows, and the list is drawn first without waiting for them,
   - opening the section re-uses what was fetched in the last GATEIN_TTL ms (call with {cached:true});
     every other caller (after a booking is received / cancelled / created) passes no args and gets fresh data. */
const GATEIN_PAGE = 50, GATEIN_TTL = 30000;
let _gateInCache = null;      // { at, list, total, docs }
let _gateInInFlight = null;

function _gateInCards(list, docs) {   // docs === null while the document lookup is still running
  return list.map(b => {
      const hasG = ((docs || {})[b.id] || []).some(d => d.doc_type === 'guarantee_form');
  return `<div class="dispatch-queue-item" style="align-items:center;gap:10px">
    <div class="dqi-ref">${esc(b.container || 'No container no.')}</div>
    <div class="dqi-route" style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(b.company || b.full_name || '—')}</div>
      <div style="font-size:10px;color:var(--text-3)">${esc(b.reference || b.id.slice(0, 8))}${b.bulk_ref ? ' · ' + esc(b.bulk_ref) : ''}${b.cargo_type ? ' · ' + esc(b.cargo_type) : ''}${b.pickup_date ? ' · expected ' + fmtDate(b.pickup_date) : ''}</div>
      <div style="margin-top:3px">${docs === null ? '' : (hasG ? '<span class="sbadge s-approved">Guarantee form ✓</span>' : '<span class="sbadge s-pending">No guarantee form</span>')}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px">
      <button class="modal-btn primary" onclick="startInwardFromBooking('${b.id}')">Confirmed In →</button>
      <button class="modal-btn ghost" onclick="cancelPublicBooking('${b.id}','cancelled')">Cancel</button>
    </div>
  </div>`;
  }).join('');
}

function _paintAwaitingGateIn(c) {
  const wrap = document.getElementById('inwardAwaitingGateInList');
  const meta = document.getElementById('inwardAwaitingGateInMeta');
  if (!wrap || !c) return;
  if (meta) meta.textContent = c.total ? `${c.total} expected${c.total > c.list.length ? ` \u00b7 showing oldest ${c.list.length}` : ''}` : '';
  if (!c.list.length) { wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No confirmed bookings are waiting to arrive</div></div>'; return; }
  const more = c.total > c.list.length
    ? `<div style="padding:10px 14px;font-size:11px;color:var(--text-3);text-align:center">${c.total - c.list.length} more expected -- they appear here as the earlier ones are received.</div>`
    : '';
  wrap.innerHTML = _gateInCards(c.list, c.docs) + more;
}

async function renderInwardAwaitingGateIn(opts) {
  const wrap = document.getElementById('inwardAwaitingGateInList');
  if (!wrap) return;
  const cachedOk = !!(opts && opts.cached);

  if (cachedOk && _gateInCache) {
    _paintAwaitingGateIn(_gateInCache);                                   // instant
    if (Date.now() - _gateInCache.at < GATEIN_TTL) return;                // fresh enough: no network at all
  }
  if (_gateInInFlight) {
    if (cachedOk) return;                                                 // a fetch is already running
    return _gateInInFlight.then(() => renderInwardAwaitingGateIn());      // a change just happened: run once more after it
  }

  _gateInInFlight = (async () => {
    try {
      const { data, error, count } = await supabase.from('public_bookings').select('*', { count: 'exact' })
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: true, nullsFirst: false })
        .range(0, GATEIN_PAGE - 1);
      if (error) throw error;
      const list = data || [];
      const entry = { at: Date.now(), list, total: (typeof count === 'number' ? count : list.length), docs: null };
      _gateInCache = entry;
      _paintAwaitingGateIn(entry);                                        // draw now; guarantee badges follow
      if (list.length && window.bookingDocs) {
        try {
          entry.docs = await window.bookingDocs.documentsForBookings(list.map(b => b.id));
          if (_gateInCache === entry) _paintAwaitingGateIn(entry);
        } catch (e) { /* best effort */ }
      }
    } catch (e) {
      console.warn('Awaiting gate-in load failed:', e);
      if (!_gateInCache) wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Could not load bookings -- check your connection</div></div>';
    } finally {
      _gateInInFlight = null;
    }
  })();
  return _gateInInFlight;
}

// "40ft Standard", "20' High Cube", "Reefer 40ft" ... -> one of CONTAINER_TYPE_OPTIONS (or null)
function ctypeFromBookingText(txt) {
  const s = String(txt || '').toLowerCase();
  if (!s) return null;
  const m = s.match(/(20|40|45)\s*(?:ft|foot|')?/);
  const size = m ? (m[1] === '45' ? '40' : m[1]) + 'ft' : null;
  let type = 'Dry';
  if (/reefer|refrigerat/.test(s)) type = 'Reefer';
  else if (/open\s*top/.test(s)) type = 'Open Top';
  else if (/flat\s*rack/.test(s)) type = 'Flat Rack';
  else if (/tank/.test(s)) type = 'Tank';
  else if (/high\s*cube|\bhc\b/.test(s)) type = 'HC';
  const combo = size ? `${size} ${type}` : type;
  if (CONTAINER_TYPE_OPTIONS.indexOf(combo) !== -1) return combo;
  if (CONTAINER_TYPE_OPTIONS.indexOf(type) !== -1) return type;
  return null;
}

// "Confirmed In": the container has arrived — open Inward Container Entry pre-filled from the booking
async function startInwardFromBooking(bookingId) {
  const { data: b, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !b) { toast('Booking not found', 'error'); return; }
  if (b.status !== 'confirmed' && b.status !== 'pending') { toast('This booking has already been received or closed', 'warning'); renderInwardAwaitingGateIn(); return; }
  if (b.container) {
    const avail = await checkContainerAvailable(b.container, { bookingId: b.id });
    if (avail) { toast(avail, 'error', 7000); return; }
  }
  showSection('inward', document.querySelector('.nav-item[data-section="inward"]'));
  const firstTab = document.querySelector('#sec-inward .filter-row .filter-btn');
  if (typeof switchInwardTab === 'function') switchInwardTab('single', firstTab);
  _inwardBooking = b;
  const setv = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
  setv('iw_container', (b.container || '').toUpperCase());
  setv('iw_type_movement', 'Gate-In');
  const ct = ctypeFromBookingText(b.cargo_type);
  if (ct) populateSizeTypeSelects('iw_size', 'iw_type', ct);
  if (b.shipping_line_id && (state.db.shippingLines || []).some(l => l.id === b.shipping_line_id)) setv('iw_line', b.shipping_line_id);
  setv('iw_consignee', b.company || '');
  setv('iw_guarantee_no', b.bl_number || '');
  setv('iw_vessel', b.vessel || ''); setv('iw_voyage', b.voyage || '');
  setv('iw_transporter', b.transporter || ''); setv('iw_truck', b.truck_reg || '');
  setv('iw_driver', b.driver_name || ''); setv('iw_driver_id', b.driver_id_number || '');
  setv('iw_notes', `Booking ${b.reference || b.id.slice(0, 8)} · ${b.full_name || ''}${b.phone ? ' · ' + b.phone : ''}`);
  const sv = document.getElementById('iw_needs_survey'); if (sv) { sv.checked = true; sv.disabled = true; }
  const cEl = document.getElementById('iw_container'); if (cEl && typeof markContainerValidity === 'function') markContainerValidity(cEl);
  const bn = document.getElementById('inwardBookingBanner');
  if (bn) {
    bn.style.display = 'block';
    bn.innerHTML = `<b>Receiving booking ${esc(b.reference || b.id.slice(0, 8))}</b> — ${esc(b.company || b.full_name || '')}${b.container ? '' : '<br><span style="color:var(--amber)">This booking has no container number — enter it below.</span>'}
      <br>Saving sends it to <b>Awaiting Survey</b>. <a href="#" onclick="clearInwardForm();return false" style="color:var(--gold)">Cancel / enter a different container</a>`;
  }
  if (cEl) { cEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); cEl.focus(); }
}

function previewInwardImg(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const room = GX_MAX_PHOTOS - _inwardImages.length;
  if (room <= 0) { toast(`Maximum ${GX_MAX_PHOTOS} photos — remove one to add another`, 'error'); e.target.value = ''; return; }
  files.slice(0, room).forEach(file => {
    const problem = gxPhotoProblem(file);
    if (problem) { toast(`${file.name} skipped — ${problem}`, 'error'); return; }
    const reader = gxImageReader();
    reader.onload = ev => { if (_inwardImages.length >= GX_MAX_PHOTOS) return; _inwardImages.push(ev.target.result); renderInwardImgPreview(); };
    reader.readAsDataURL(file);
  });
  if (files.length > room) toast(`Only ${room} more photo${room===1?'':'s'} could be added (max ${GX_MAX_PHOTOS})`, 'warning');
  e.target.value = '';
}

function renderInwardImgPreview() {
  const wrap  = document.getElementById('inwardImgPreview');
  const label = document.getElementById('inwardImgLabel');
  if (!wrap) return;
  if (!_inwardImages.length) { wrap.style.display = 'none'; wrap.innerHTML=''; if (label) label.textContent = 'Upload container photos'; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${_inwardImages.map((src,i)=>`<div class="container-img-thumb"><img src="${src}" /><button type="button" class="container-img-remove" onclick="clearInwardImg(${i})" title="Remove">✕</button></div>`).join('')}</div>`;
  if (label) label.textContent = `${_inwardImages.length} photo${_inwardImages.length>1?'s':''} attached`;
}

function clearInwardImg(i) {
  if (typeof i === 'number') _inwardImages.splice(i, 1); else _inwardImages = [];
  const fileInput = document.getElementById('iw_img'); if (fileInput) fileInput.value = '';
  renderInwardImgPreview();
}

let _inwardGuaranteeFile = null;

function previewInwardGuaranteeFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImg = file.type.startsWith('image/');
  if (!isPdf && !isImg) { toast('Upload an image or PDF', 'error'); e.target.value = ''; return; }
  if (file.size > 5*1024*1024) { toast('File too large — max 5MB', 'error'); e.target.value = ''; return; }
  _inwardGuaranteeFile = file;
  renderInwardGuaranteePreview();
}

function renderInwardGuaranteePreview() {
  const wrap  = document.getElementById('inwardGuaranteePreview');
  const label = document.getElementById('inwardGuaranteeLabel');
  if (!wrap) return;
  if (!_inwardGuaranteeFile) { wrap.style.display = 'none'; wrap.innerHTML = ''; if (label) label.textContent = 'Upload container guarantee form'; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
      <span>📎 ${esc(_inwardGuaranteeFile.name)} (${(_inwardGuaranteeFile.size/1024).toFixed(0)} KB)</span>
      <button type="button" class="modal-btn ghost" style="padding:2px 8px;font-size:10px" onclick="clearInwardGuaranteeFile()">Remove</button>
    </div>`;
  if (label) label.textContent = '1 file attached';
}

function clearInwardGuaranteeFile() {
  _inwardGuaranteeFile = null;
  const fileInput = document.getElementById('iw_guarantee_file'); if (fileInput) fileInput.value = '';
  renderInwardGuaranteePreview();
}

/* ── Bulk upload: CSV, JSON, and XLSX/XLS (via SheetJS) ── */
function handleInwardBulkDrop(e) {
  e.preventDefault();
  document.getElementById('inwardBulkDrop').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processInwardBulkFile(file);
}

function handleInwardBulkFile(e) {
  const file = e.target.files[0];
  if (file) processInwardBulkFile(file);
}

function processInwardBulkFile(file) {
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
      rows = normalizeRowKeys(rows);
      const looksOutward = /outward|outwrd|_out\b|-out\b/i.test(name) && !/inward/i.test(name);
      const sniffedDirection = sniffBulkDirectionFromRows(rows);
      showInwardBulkPreview(rows, sniffedDirection || (looksOutward ? 'out' : 'in'));
    } catch(err) { toast('Could not parse file — check format', 'error'); }
  };
  if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
}

function showInwardBulkPreview(rows, direction) {
  if (!rows.length) { toast('No rows found in file', 'error'); return; }
  const keys = Object.keys(rows[0]);
  const tbl  = document.getElementById('inwardBulkPreviewTable');
  tbl.querySelector('thead').innerHTML = `<tr>${keys.map(k=>`<th>${esc(k)}</th>`).join('')}</tr>`;
  tbl.querySelector('tbody').innerHTML = rows.slice(0,10).map(r=>`<tr>${keys.map(k=>`<td>${esc(r[k])}</td>`).join('')}</tr>`).join('');
  document.getElementById('inwardBulkRowCount').textContent = `${rows.length} rows`;
  document.getElementById('inwardBulkPreview').style.display = 'block';
  document.getElementById('inwardBulkPreview').dataset.rows = JSON.stringify(rows);
  const dirSel = document.getElementById('iw_bulk_direction');
  dirSel.value = direction === 'out' ? 'out' : 'in';
  updateBulkDirectionLabel();
  dirSel.onchange = updateBulkDirectionLabel;
}

async function processBulkInward() {
  const rows = JSON.parse(document.getElementById('inwardBulkPreview').dataset.rows || '[]');
  const direction = document.getElementById('iw_bulk_direction')?.value === 'out' ? 'out' : 'in';
  const VALID_TYPES = {
    'gatein':'Gate-In', 'gate-in':'Gate-In', 'depotin':'Depot-In', 'depot-in':'Depot-In',
    'gateout':'Gate-Out', 'gate-out':'Gate-Out', 'depotout':'Depot-Out', 'depot-out':'Depot-Out'
  };
  const defaultType = direction === 'out' ? 'Gate-Out' : 'Gate-In';
  const VALID_COND  = ['Good','Damaged','Dirty','Needs Repair','Available','Food Grade','Damage','Repat','Sale','Shipper'];

  // Duplicate control: a container already in the system is never imported a second time.
  let serverConflicts = {};
  try {
    const keys = [...new Set(rows.map(r => normContainerKey(pickField(r, ['container','containerno','containernumber','containernrno']))).filter(Boolean))];
    for (let i = 0; i < keys.length; i += 1000) {
      const { data, error } = await supabase.rpc('check_containers_available', { p_containers: keys.slice(i, i + 1000) });
      if (error) throw error;
      Object.assign(serverConflicts, data || {});
    }
  } catch (e) {
    console.warn('bulk duplicate pre-check failed:', e);
    toast('Could not verify duplicates with the server — nothing was imported. Please try again.', 'error', 7000);
    return;
  }
  const skipped = [];
  const liveInFile = new Set();

  let created = 0;
  const flagged = []; // rows still created, but tagged for later cleanup
  const seenInBatch = new Set();
  const importBatchId = `INW-${new Date().toISOString().slice(0,10)}-${Date.now().toString(36).toUpperCase()}`;

  rows.forEach((r, idx) => {
    const contRaw = pickField(r, ['container','containerno','containernumber','containernrno']);
    const rowLabel = contRaw || `row ${idx+1}`;

    let cont = contRaw ? contRaw.toUpperCase() : '';
    const issueTags = [];
    if (!cont) {
      cont = `UNKNOWN-ROW${idx+1}-${Date.now().toString(36).toUpperCase()}`;
      issueTags.push('missing container number — placeholder assigned');
      flagged.push(`${rowLabel}: missing container number (placeholder ${cont})`);
    } else {
      const contIssue = containerFormatIssue(cont);
      if (contIssue) { issueTags.push(contIssue); flagged.push(`${cont}: ${contIssue}`); }
    }

    const typeRaw = pickField(r, ['movement','type']).toLowerCase().replace(/[^a-z]/g,'');
    const type = VALID_TYPES[typeRaw] || defaultType;

    let dateVal = new Date().toISOString();
    const dateRaw = pickField(r, ['date','entrydate','datein','dateout','gateindate','gateoutdate','inwarddate','outwarddate','entrydatetime']);
    { const d = parseFlexibleDate(dateRaw); if (d) { dateVal = d.toISOString(); flagIfImplausibleDate(d, issueTags, flagged, rowLabel); } }


    const dupKey = `${cont}::${type}::${new Date(dateVal).toDateString()}`;
    if (seenInBatch.has(dupKey)) { issueTags.push('duplicate within this file (same container, type & date)'); flagged.push(`${cont}: duplicate within this file (same container, type & date)`); }
    const dupIc = findDuplicateInterchange(cont, type, dateVal);
    if (dupIc) { issueTags.push(`possible duplicate of an existing ${type} record on ${fmtDate(dateVal)}`); flagged.push(`${cont}: already has a ${type} record logged on ${fmtDate(dateVal)}`); }
    seenInBatch.add(dupKey);


    const truckVal  = pickField(r, ['truck','truckreg','vehicle','reg','truckno','lorryno','transporters','transporter']);
    const driverVal = pickField(r, ['driver','drivername','driversname']);
    const lineVal   = pickField(r, ['line','shippingline','linecode','shippinglines']);

    const vesselVal = pickField(r, ['vessel','exvessel']);

    const truck  = truckVal  ? state.db.trucks.find(t => t.reg.toLowerCase()===truckVal.toLowerCase() || t.id===truckVal) : null;
    const driver = driverVal ? state.db.drivers.find(d => d.name.toLowerCase()===driverVal.toLowerCase() || d.id===driverVal) : null;

    let line = findShippingLineByText(lineVal);

    if (!line && vesselVal) {
      const guessedId = resolveLineIdFromVessel(vesselVal);
      if (guessedId) line = state.db.shippingLines.find(l => l.id === guessedId);
    }
    if (!line) {
      const lineIssue = lineVal ? `shipping line "${lineVal}" not found in Shipping Lines` : 'no shipping line in file';
      issueTags.push(lineIssue); flagged.push(`${cont}: ${lineIssue}`);
    }

    const ctypeExplicit    = pickField(r, ['ctype']);
    const sizeRaw          = pickField(r, ['size']);

    const containerTypeRaw = pickField(r, ['containertype','type']);
    let ctype = CONTAINER_TYPE_OPTIONS.find(c => c.toLowerCase() === ctypeExplicit.toLowerCase());
    if (!ctype && sizeRaw && containerTypeRaw) ctype = composeCtypeFromDepotCode(sizeRaw, containerTypeRaw);
    if (!ctype) ctype = CONTAINER_TYPE_OPTIONS[0];

    const condRaw = pickField(r, ['condition']);
    const condition = VALID_COND.find(c => c.toLowerCase() === condRaw.toLowerCase()) || 'Good';


    let dateOutVal = null;
    const dateOutRaw = pickField(r, ['dateout','exitdate','gateoutdate','dateexited']);
    { const dOut = parseFlexibleDate(dateOutRaw); if (dOut) dateOutVal = dOut.toISOString(); }

    if ((type === 'Gate-In' || type === 'Depot-In') && !dateOutVal) {
      const key = normContainerKey(cont);
      const why = serverConflicts[key] || localContainerConflict(cont) || (liveInFile.has(key) ? `${cont} appears more than once in this file as a container still in the yard` : null);
      if (why) { skipped.push(why); return; }
      liveInFile.add(key);
    }

    const cargoStatusRaw = pickField(r, ['cargostatus']);
    const cargoStatus = CARGO_STATUS_OPTIONS.find(c => c.toLowerCase() === cargoStatusRaw.toLowerCase()) || sanitize(cargoStatusRaw);

    // Guarantee No. and B/L No. are the same number — take whichever column the file has.
    const guaranteeBlVal = sanitize(pickField(r, ['guaranteeno','guaranteenumber','guranteeformno','guaranteeformno','bl','blnumber','blno']));
    state.db.interchange.push({
      id: uid('IC'), container: cont, type, ctype,
      line: line ? line.id : '',
      condition,
      truck: truck ? truck.id : '', driver: driver ? driver.id : '',
      truckRegText: truck ? '' : sanitize(truckVal),
      driverNameText: driver ? '' : sanitize(driverVal),
      eirNumber: sanitize(pickField(r, ['eir','eirnumber','eirno','ineirno','outeirno','outeir','refinno','refoutno','inwardno'])),
      blNumber:  guaranteeBlVal,
      vessel:    sanitize(vesselVal),
      voyage:    sanitize(pickField(r, ['voyage','voy'])),
      deliveringParty: sanitize(pickField(r, ['deliveringparty','delivering','shipper'])),

      guaranteeNo:     guaranteeBlVal,
      cargoStatus,
      repairs: [], repairTotal: 0,
      notes: [sanitize(pickField(r, ['notes','remarks'])) || 'Bulk import', ...issueTags.map(t=>`⚠ ${t}`)].filter(Boolean).join(' — '),

      date: dateVal, status: 'approved', img: '',
      dateOut: dateOutVal,
      receivingParty: sanitize(pickField(r, ['receivingparty'])),
      releaseOrderNo: sanitize(pickField(r, ['releaseorderno','releaseorder'])),

      flaggedForReview: issueTags.length > 0,
      flagReasons: issueTags.slice(),
      duplicateOfId: dupIc ? dupIc.id : null,
      importBatchId,
      _dirty: true,
    });
    created++;
  });

  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Bulk Inward Entry', `${created} entries imported${flagged.length?`, ${flagged.length} flagged for review`:''} (batch ${importBatchId})`);
  if (skipped.length) {
    toast(`${created} created — ${skipped.length} skipped (container already in the system)`, 'warning', 8000);
    openModal('Bulk Inward Entry Result', `<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${created} entry(ies) created. <b>${skipped.length} row(s) were NOT imported</b> because that container is already in the system:</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-2);max-height:300px;overflow:auto">${skipped.map(x => esc(x)).join('<br>')}</div>${flagged.length ? `<div style="margin-top:10px;font-size:11.5px;color:var(--text-3)">${flagged.length} imported row(s) are also flagged for cleanup in the Depot Report.</div>` : ''}`);
  } else if (flagged.length) {
    toast(`${created} created — ${flagged.length} flagged for cleanup (see details)`, 'warning', 6000);
    openModal('Bulk Inward Entry Result', `<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${created} entry(ies) created successfully — all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (${flagged.length})</div><div style="max-height:240px;overflow-y:auto">${flaggedPreview(flagged).map(s=>`<div class="ops-notice" style="margin-bottom:6px">${esc(s)}</div>`).join('')}</div>`);
  } else {
    toast(`${created} inward entries created`, 'success');
  }
  refreshContainerHistory();
  renderInterchange('all');
  renderInwardRecent();
  renderInwardStillInStorage();
  document.getElementById('inwardBulkPreview').style.display = 'none';
}

function downloadInwardBulkTemplate() {
  const csv = 'container,type,size,containerType,line,truck,driver,eir,bl,vessel,voyage,deliveringParty,guaranteeNo,cargoStatus,condition,date,dateOut,receivingParty,releaseOrderNo,notes\nMSCU1234566,Gate-In,40ft,Dry,MSC,KDX 655V,James Otieno,EIR-00123,BL-4471,MSC VESSEL,VA-001,ACME Traders,GTE-00981,Laden / Full,Good,,,,,Delivered in good condition';
  const a = document.createElement('a');
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = 'gargo_inward_bulk_template.csv';
  a.click();
}


const INWARD_IC_TYPES  = ['Gate-In', 'Depot-In'];

const OUTWARD_IC_TYPES = ['Gate-Out', 'Depot-Out'];

let _depotReportTab   = 'inward';

// inward | outward | dupes
let _depotReportRange = 'all';

// all | 7 | 30 | 90 (days)
let _depotReportLine  = 'all';

let _depotReportDupes = [];

function switchDepotReportTab(tab, btn) {
  _depotReportTab = tab;
  document.querySelectorAll('#sec-depotreport .filter-row .filter-btn[data-tab]').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDepotReport();
}

function filterDepotReportRange(range, btn) {
  _depotReportRange = range;
  document.querySelectorAll('#sec-depotreport .filter-row .filter-btn[data-range]').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDepotReport();
}

function filterDepotReportLine() {
  const sel = document.getElementById('drLineFilter');
  _depotReportLine = sel ? sel.value : 'all';
  renderDepotReport();
}

function _depotReportInRange(dateStr) {
  if (_depotReportRange === 'all') return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(_depotReportRange));
  return new Date(dateStr) >= cutoff;
}

function _depotReportLineMatch(rec) {
  return _depotReportLine === 'all' || (_depotReportLine === '__unmapped__' ? !rec.line : rec.line === _depotReportLine);
}


function _tripToDepotReportRecord(t) {
  const outward = isOutwardWorkType(t.workType);
  return {
    id: t.id, container: t.container,
    type: outward ? (outwardTypeLabel(t.outwardType) || 'Dispatch (Depot → Port)') : 'Inward (Port → Depot)',
    line: t.shippingLine || '', condition: '',
    truck: t.truckId || '', driver: t.driverId || '', truckRegText: '', driverNameText: '',
    eirNumber: t.eirNumber || '', vessel: t.vessel || '', voyage: t.voyage || '',

    date: outward ? (t.dateOut || t.startTime) : t.startTime,
    status: t.status, notes: t.notes || '',
    flaggedForReview: !!t.flaggedForReview, flagReasons: t.flagReasons || [],
    importBatchId: t.importBatchId || null,
    _reportSource: 'trips',
  };
}


function _depotReportInwardEntries() {
  const fromInterchange = state.db.interchange
    .filter(ic => INWARD_IC_TYPES.includes(ic.type))
    .map(ic => ({ ...ic, _reportSource: 'interchange' }));
  const fromTrips = state.db.trips
    .filter(t => !isOutwardWorkType(t.workType))
    .map(_tripToDepotReportRecord);
  return [...fromInterchange, ...fromTrips]
    .filter(_depotReportLineMatch)
    .filter(rec => _depotReportInRange(rec.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}


function _depotReportOutwardEntries() {
  const fromInterchange = state.db.interchange
    .filter(ic => OUTWARD_IC_TYPES.includes(ic.type))
    .map(ic => ({ ...ic, _reportSource: 'interchange' }));
  const outIds = gxOutIcIds();   // trips that already issued their own Gate-Out interchange are not shown twice
  const fromTrips = state.db.trips
    .filter(t => isOutwardWorkType(t.workType) && !outIds.has(gxOutwardIcId(t.id)))
    .map(_tripToDepotReportRecord);
  return [...fromInterchange, ...fromTrips]
    .filter(_depotReportLineMatch)
    .filter(rec => _depotReportInRange(rec.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function populateDepotReportLineFilter() {
  const sel = document.getElementById('drLineFilter');
  if (!sel || sel.dataset.populated) return;
  sel.innerHTML = '<option value="all">All Lines</option>' +
    '<option value="__unmapped__">⚠ No Line Assigned</option>' +
    state.db.shippingLines.map(l => `<option value="${l.id}">${esc(l.code)}</option>`).join('');
  sel.dataset.populated = '1';
}



async function computeDepotReportDuplicates() {
  try {
    const { data, error } = await supabase.rpc('find_interchange_duplicates');
    if (error) throw error;
    const rows = (data || []).map(icFromRow);
    const dayGroups = {};
    rows.forEach(ic => {
      const key = `${(ic.container || '').toUpperCase()}::${ic.type}::${new Date(ic.date).toDateString()}`;
      (dayGroups[key] = dayGroups[key] || []).push(ic);
    });
    _depotReportDupes = Object.values(dayGroups)
      .filter(list => list.length > 1)
      .map(list => ({ kind: 'Same container, type & day', records: list, ids: list.map(i => i.id) }));
  } catch (e) {
    console.error('Duplicate scan failed:', e.message);
    toast('Duplicate scan failed — check your connection', 'error');
    _depotReportDupes = [];
  }
  return _depotReportDupes;
}


let _depotReportLoadedFrom = null;   // null | ISO cutoff already covered | 'all'
let _depotReportLoadedDb   = null;   // guards against state.db being replaced by a reload

async function ensureDepotReportRangeLoaded() {
  if (_depotReportLoadedDb !== state.db) { _depotReportLoadedDb = state.db; _depotReportLoadedFrom = null; }
  if (_depotReportLoadedFrom === 'all') return;
  const windowCut = operationalCutoffISO();
  let wantFrom = null;
  if (_depotReportRange !== 'all') {
    const c = new Date(); c.setDate(c.getDate() - Number(_depotReportRange));
    wantFrom = c.toISOString();
    if (wantFrom >= windowCut) return;                                   // inside the normal window
    if (_depotReportLoadedFrom && _depotReportLoadedFrom <= wantFrom) return; // already fetched
  }
  const tripQ = (from, to) => {
    let q = supabase.from('trips').select('*').eq('status', 'completed').lt('start_time', windowCut);
    if (wantFrom) q = q.or(`start_time.gte.${wantFrom},date_out.gte.${wantFrom}`);
    return q.order('start_time', { ascending: false }).range(from, to);
  };
  const icQ = (from, to) => {
    let q = supabase.from('interchange').select('*').eq('status', 'reconciled').lt('date', windowCut);
    if (wantFrom) q = q.gte('date', wantFrom);
    return q.order('date', { ascending: false }).range(from, to);
  };
  const [tRes, iRes] = await Promise.all([fetchAllPaginated(tripQ), fetchAllPaginated(icQ)]);
  if (tRes.error || iRes.error) {
    console.error('Depot report history load failed:', (tRes.error || iRes.error).message);
    toast('Could not load older records — report may be incomplete', 'error');
    return;
  }
  const haveT = new Set(state.db.trips.map(t => t.id));
  tRes.data.forEach(r => { if (!haveT.has(r.id)) state.db.trips.push(tripFromRow(r)); });
  const haveI = new Set(state.db.interchange.map(i => i.id));
  iRes.data.forEach(r => { if (!haveI.has(r.id)) state.db.interchange.push(icFromRow(r)); });
  _depotReportLoadedFrom = wantFrom || 'all';
}

// Whole-register count of records with no line, straight from the database
// (state.db only holds a window of the data).
async function fetchUnmappedLineTotal() {
  try {
    const [a, b] = await Promise.all([
      supabase.from('interchange').select('id', { count: 'exact', head: true }).is('line_id', null),
      supabase.from('trips').select('id', { count: 'exact', head: true }).is('shipping_line_id', null),
    ]);
    if (a.error || b.error) throw (a.error || b.error);
    return (a.count || 0) + (b.count || 0);
  } catch (e) {
    return state.db.interchange.filter(ic => !ic.line).length + state.db.trips.filter(t => !t.shippingLine).length;
  }
}

async function renderDepotReport() {
  populateDepotReportLineFilter();

  // Show a lightweight loading state on the duplicates tab while the RPC
  // round-trips, rather than freezing with stale counts.
  if (_depotReportTab === 'dupes') {
    const dupesEl = document.getElementById('depotReportDupesList');
    if (dupesEl) dupesEl.innerHTML = '<div class="empty-state"><div class="empty-state-label">Scanning register…</div></div>';
  }

  await computeDepotReportDuplicates();
  await ensureDepotReportRangeLoaded();

  const inward  = _depotReportInwardEntries();
  const outward = _depotReportOutwardEntries();
  const unmappedTotal = await fetchUnmappedLineTotal();

  const kpi = document.getElementById('depotReportKpis');
  if (kpi) {
    kpi.innerHTML = [
      kpiCard('Inward Entries', inward.length, INWARD_IC_TYPES.join(' / '), 'kpi-green'),
      kpiCard('Outward Entries', outward.length, [...OUTWARD_IC_TYPES, 'Dispatch trips'].join(' / '), 'kpi-gold'),
      kpiCard('Net Movement', inward.length - outward.length, 'Inward − outward, in range', 'kpi-blue'),
      kpiCard('Duplicates Flagged', _depotReportDupes.length, 'Across full register', _depotReportDupes.length ? 'kpi-red' : 'kpi-green'),
    ].join('');
  }

  const unmappedEl = document.getElementById('depotReportUnmappedNotice');
  if (unmappedEl) {
    unmappedEl.style.display = unmappedTotal ? 'flex' : 'none';
    unmappedEl.innerHTML = unmappedTotal ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> ${unmappedTotal} record${unmappedTotal === 1 ? '' : 's'} across the whole register have no shipping line assigned and won't appear under any line filter. <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold);font-weight:600">Resolve them →</a>` : '';
  }

  const dupeCountEl = document.getElementById('depotReportDupeCount');
  if (dupeCountEl) dupeCountEl.textContent = _depotReportDupes.length ? `(${_depotReportDupes.length})` : '';

  const tabInward  = document.getElementById('depotReportTabInward');
  const tabOutward = document.getElementById('depotReportTabOutward');
  const tabDupes   = document.getElementById('depotReportTabDupes');
  if (tabInward)  tabInward.style.display  = _depotReportTab === 'inward'  ? 'block' : 'none';
  if (tabOutward) tabOutward.style.display = _depotReportTab === 'outward' ? 'block' : 'none';
  if (tabDupes)   tabDupes.style.display   = _depotReportTab === 'dupes'   ? 'block' : 'none';

  if (_depotReportTab === 'inward')  renderDepotReportTable('depotReportInwardList', inward);
  if (_depotReportTab === 'outward') renderDepotReportTable('depotReportOutwardList', outward);
  if (_depotReportTab === 'dupes')   renderDepotReportDupesList();
}

function renderDepotReportTable(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-label">No entries in this range</div></div>';
    return;
  }
  const flaggedIds = new Set(_depotReportDupes.flatMap(d => d.ids));
  el.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Vessel / Voyage</th>
      <th>Truck</th><th>Driver</th><th>Condition</th><th>Status</th><th>Source</th>
    </tr></thead><tbody>${items.map(ic => `<tr${(flaggedIds.has(ic.id) || ic.flaggedForReview) ? ' style="background:rgba(220,60,60,0.08)"' : ''}>
      <td class="mono">${fmtDate(ic.date)}</td>
      <td class="mono" style="color:var(--gold)">${esc(ic.container)}${(flaggedIds.has(ic.id) || ic.flaggedForReview) ? ' ⚠' : ''}</td>
      <td>${esc(ic.type)}</td>
      <td>${esc(lineName(ic.line))}</td>
      <td class="mono">${esc(ic.eirNumber || '—')}</td>
      <td>${esc(ic.vessel || '—')}${ic.voyage ? ' / ' + esc(ic.voyage) : ''}</td>
      <td>${ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || '—')}</td>
      <td>${ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || '—')}</td>
      <td>${esc(ic.condition || '—')}</td>
      <td>${sbadge(ic.status)}</td>
      <td>${_icSourceTag(ic)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderDepotReportDupesList() {
  const el = document.getElementById('depotReportDupesList');
  if (!el) return;
  if (!_depotReportDupes.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-label">No duplicates found across the register</div></div>';
    return;
  }
  el.innerHTML = _depotReportDupes.map(dup => `
    <div class="ic-card" style="flex-direction:column;align-items:stretch;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:12px;font-weight:600;color:var(--red)">${esc(dup.kind)}</div>
        <div style="font-size:10px;color:var(--text-3)">${dup.records.length} records</div>
      </div>
      ${dup.records.map(r => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--border);font-size:11px">
          <div class="mono" style="color:var(--text-2)"><span style="color:var(--gold)">${esc(r.container)}</span> · ${esc(r.type)} · ${fmtDate(r.date)} · EIR ${esc(r.eirNumber || '—')} · ${_icSourceTag(r)}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            ${sbadge(r.status)}
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function printDepotReport() {
  const items = _depotReportTab === 'outward' ? _depotReportOutwardEntries() : _depotReportInwardEntries();
  if (!items.length) { toast('Nothing to print yet', 'error'); return; }
  const rows = items.map(ic => `<tr>
    <td>${fmtDate(ic.date)}</td><td>${sanitize(ic.container || '—')}</td><td>${sanitize(ic.type || '—')}</td>
    <td>${sanitize(lineName(ic.line))}</td><td>${sanitize(ic.eirNumber || '—')}</td>
    <td>${sanitize(ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—'))}</td>
    <td>${sanitize(ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—'))}</td>
    <td>${sanitize((ic.status || '').toUpperCase())}</td><td>${_icSourceTag(ic)}</td>
  </tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Depot Report</title><style>
    body{font-family:Arial,sans-serif;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}
    h2{margin-bottom:4px}
  </style></head><body>${ghPrintHeaderHtml()}<h2>${_depotReportTab === 'outward' ? 'Outward' : 'Inward'} Register</h2>
  <div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')} · Range: ${_depotReportRange === 'all' ? 'All time' : `Last ${_depotReportRange} days`} · ${items.length} record(s)</div>
  <table><thead><tr><th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Truck</th><th>Driver</th><th>Status</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function downloadDepotReportCSV() {
  const items = _depotReportTab === 'outward' ? _depotReportOutwardEntries() : _depotReportInwardEntries();
  if (!items.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'Type', 'Shipping Line', 'EIR No.', 'Vessel', 'Voyage', 'Truck', 'Driver', 'Condition', 'Status', 'Source'];
  const rows = items.map(ic => [
    ic.date, ic.container, ic.type, lineName(ic.line), ic.eirNumber, ic.vessel, ic.voyage,
    ic.truck ? truckName(ic.truck) : ic.truckRegText, ic.driver ? driverName(ic.driver) : ic.driverNameText,
    ic.condition, ic.status, _icSourceTag(ic),
  ]);
  const csv = ghCsvPreamble('\n') + [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `depot-report-${_depotReportTab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function toggleDangerZone() {
  const dz  = document.getElementById('dangerZone');
  const btn = document.getElementById('dangerZoneToggle');
  const open= dz.style.display==='none';
  dz.style.display = open?'block':'none';
  btn.textContent   = open ? '▲ Hide Danger Zone' : '▼ Show Danger Zone';
}

const DEPOPS_DOC_LABELS = {
  guarantee_form: 'Container Guarantee Form',
  release_order: 'Release Order (CRO)',
  delivery_order: 'Delivery Order',
};

let _depOpsTab = 'inbound';

let _depOpsInboundFilter = 'pending_review';

let _depOpsOutwardFilter = 'pending_review';

function depOpsFmtDT(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? String(raw) : d.toLocaleString('en-KE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function docStatusBadge(status) {
  const styleKey = { verified: 'approved', pending_review: 'pending', rejected: 'rejected' }[status] || 'pending';
  const label = status === 'pending_review' ? 'Pending Review' : (status.charAt(0).toUpperCase() + status.slice(1));
  return `<span class="sbadge s-${styleKey}">${label}</span>`;
}

function switchDepOpsTab(tab, btn) {
  _depOpsTab = tab;
  document.querySelectorAll('#sec-depops .depops-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#sec-depops .depops-tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('depopsPanel-' + tab);
  if (panel) panel.classList.add('active');
  renderDepOps();
}

async function renderDepOps() {
  renderDepOpsZones();
  renderDepOpsStorageList();
  updateDepOpsBadge();
  if (_depOpsTab === 'inbound') await renderDepOpsInbound();
  else if (_depOpsTab === 'zones') await renderDepOpsZoneAdmin();
  else if (_depOpsTab === 'escalations') await renderDepOpsEscalations();
  else if (_depOpsTab === 'yard') await renderDepOpsYardMap();
  else if (_depOpsTab === 'surveys') await renderDepOpsSurveyRegister();
  else if (_depOpsTab === 'master') await renderDepOpsMasterList();
  else if (_depOpsTab === 'reports') await renderDepOpsReports();
  else await renderDepOpsOutward();
}

async function updateDepOpsBadge() {
  const badge = document.getElementById('badge-depops');
  if (!badge || !window.bookingDocs) return;
  try {
    const [inboundPending, outwardPending] = await Promise.all([
      window.bookingDocs.reviewQueue('pending_review'),
      window.bookingDocs.outwardReviewQueue('pending_review'),
    ]);
    const count = inboundPending.length + outwardPending.length;
    badge.textContent = count || '';
    badge.style.display = count ? 'inline' : 'none';
  } catch (e) { /* badge is best-effort, never blocks the section */ }
}

async function renderDepOpsZones() {
  const wrap = document.getElementById('depopsZones');
  if (!wrap) return;
  try {
    const zones = await window.bookingDocs.listZones();
    if (!zones.length) { wrap.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-state-label">No storage zones configured yet</div></div>'; return; }
    wrap.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Line</th><th style="padding:6px 8px">Occupied</th><th style="padding:6px 8px">Free</th>
      </tr></thead><tbody>${zones.map(z => {
        const cap = z.capacity_teu || 0, occ = z.occupied_teu || 0, free = Math.max(cap - occ, 0);
        const pct = cap > 0 ? Math.min(100, Math.round(occ / cap * 100)) : 0;
        const lineLabel = z.shipping_lines ? `${sanitize(z.shipping_lines.code)}` : '<span style="color:var(--text-3)">Unassigned</span>';
        return `<tr style="border-top:1px solid var(--border)">
          <td style="padding:6px 8px">${sanitize(z.zone_code || '')} · ${sanitize(z.zone_name)}</td>
          <td style="padding:6px 8px">${lineLabel}</td>
          <td style="padding:6px 8px">${occ} / ${cap} TEU<div style="width:100px;height:5px;background:#222;border-radius:3px;overflow:hidden;margin-top:4px"><div style="width:${pct}%;height:100%;background:var(--gold)"></div></div></td>
          <td style="padding:6px 8px">${free} TEU</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

async function renderDepOpsStorageList() {
  const wrap = document.getElementById('depopsStorageList');
  if (!wrap) return;
  try {
    const [bookings, zones] = await Promise.all([
      depOpsRepatriationEligibleBookings(),
      window.bookingDocs.storageAvailability(),
    ]);
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers currently in storage</div></div>'; return; }
    const zoneMap = {}; zones.forEach(z => { zoneMap[z.id] = z.zone_name; });
    const surveys = await Promise.all(bookings.map(b => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    wrap.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px"></th>
      </tr></thead><tbody>${bookings.map((b,i) => {
        const zoneName = (b.storage_zone_id && zoneMap[b.storage_zone_id]) || 'Unknown zone';
        const survey = surveys[i];
        const icCell = !survey
          ? '<span style="color:var(--text-3);font-size:10.5px">No survey on file</span>'
          : survey.interchange_generated_at
            ? `<span class="sbadge s-approved" title="Generated ${fmtDate(survey.interchange_generated_at)}">✓ Generated</span>${survey.interchange_id ? ` <button class="tbl-btn" onclick="GargoDocs.eir('${survey.interchange_id}','preview')" title="Preview">👁</button><button class="tbl-btn" onclick="downloadInterchangeSlip('${survey.interchange_id}')">⬇</button><button class="tbl-btn" onclick="printInterchangeSlip('${survey.interchange_id}')" title="Print">🖨</button>` : ''}`
            : `<button class="modal-btn primary" onclick="generateInterchangeFromSurvey('${b.id}','${survey.id}')">Generate →</button>`;
        return `<tr style="border-top:1px solid var(--border)">
          <td style="padding:6px 8px" class="mono">${sanitize(b.container) || '—'}</td>
          <td style="padding:6px 8px">${sanitize(zoneName)}</td>
          <td style="padding:6px 8px">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''}</td>
          <td style="padding:6px 8px">${icCell}</td>
          <td style="padding:6px 8px"><button class="modal-btn ghost" onclick="depOpsDispatchContainer('${b.id}')">Dispatch →</button></td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

// ---------- Inbound ----------
function filterDepOpsInbound(status, btn) {
  _depOpsInboundFilter = status;
  document.querySelectorAll('#depopsPanel-inbound .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDepOpsInbound();
}

async function renderDepOpsInbound() {
  await renderDepOpsReadyToProcess();
  await renderDepOpsAwaitingSurvey();
  await renderDepOpsAllocationQueue();
  const container = document.getElementById('depopsInboundQueue');
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const docs = await window.bookingDocs.reviewQueue(_depOpsInboundFilter);
    if (!docs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-label">No ${_depOpsInboundFilter.replace(/_/g,' ')} documents</div></div>`; return; }
    container.innerHTML = docs.map(d => depOpsDocCard(d, 'inbound')).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

async function renderDepOpsReadyToProcess() {
  const wrap = document.getElementById('depopsReadyList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const ready = await window.bookingDocs.readyToProcessBookings();
    if (!ready.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No bookings are fully verified yet</div></div>'; return; }
    wrap.innerHTML = ready.map(entry => depOpsReadyCard(entry)).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsReadyCard(entry) {
  const b = entry.booking;
  return `<div style="border:1px solid rgba(34,197,94,0.35);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(34,197,94,0.05)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong>${sanitize(b.full_name)}</strong>${b.company ? ' · ' + sanitize(b.company) : ''}
        <div style="font-size:11px;color:var(--text-3)">${sanitize(b.service_type)} · Container: ${sanitize(b.container) || '—'}</div>
        <div style="font-size:10px;color:var(--text-3)">Booking ${b.id.slice(0,8)} · Verified: ${entry.required.join(', ').replace(/_/g,' ')}</div>
      </div>
      <span class="sbadge s-approved">verified & ready</span>
    </div>
    <div style="margin-top:8px;font-size:11px;color:var(--text-3)">Confirming moves this booking to Awaiting Gate-In. It reaches Awaiting Survey once it is recorded at the gate.</div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="modal-btn primary" onclick="confirmPublicBooking('${b.id}')">Confirm Booking →</button>${bookingIsMovement(b.service_type) ? ` <button class="modal-btn ghost" onclick="importPublicBooking('${b.id}')">Import to Fleet</button>` : ''}
      <button class="modal-btn ghost" onclick="showPublicBookingDetail('${b.id}')">View</button>
    </div>
  </div>`;
}


const DEPOT_TYPE_CODE_MAP = {
  'DV': 'Dry', 'HD': 'Dry', 'HC': 'HC',
  'FR': 'Flat Rack', 'FL': 'Flat Rack', 'OT': 'Open Top',
  'PL': 'Platform', 'TK': 'Tank', 'LC': 'LC (Unspecified)',
};


function composeCtypeFromDepotCode(sizeRaw, codeRaw) {
  const sizeStr = String(sizeRaw || '').trim();
  const sizeFt = sizeStr ? (/ft$/i.test(sizeStr) ? sizeStr : `${parseInt(sizeStr, 10)}ft`) : '';
  const code = String(codeRaw || '').trim().toUpperCase();
  const mapped = DEPOT_TYPE_CODE_MAP[code];
  if (mapped) return composeCtype(sizeFt, mapped);
  // Not a recognized depot code — fall back to the normal size+type compose
  // (handles values that are already full CONTAINER_TYPE_OPTIONS labels).
  return composeCtype(sizeFt || sizeStr, codeRaw);
}

async function renderDepOpsAwaitingSurvey() {
  const wrap = document.getElementById('depopsAwaitingSurveyList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const bookings = await window.bookingDocs.awaitingSurveyBookings();
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Nothing awaiting survey</div></div>'; return; }
    wrap.innerHTML = bookings.map(b => `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <strong class="mono" style="color:var(--gold)">${sanitize(b.container) || 'No container on file'}</strong>
          <div style="font-size:11px;color:var(--text-3)">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''} · ${sanitize(b.cargo_type || '—')}</div>
          <div style="font-size:10px;color:var(--text-3)">Booking ${b.id.slice(0,8)}</div>
        </div>
        <span class="sbadge s-pending">awaiting survey</span>
      </div>
      <div style="margin-top:10px"><button class="modal-btn primary" onclick="openSurveyModal('${b.id}')">Start Survey →</button></div>
    </div>`).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

let _surveyImages = [];
let _surveyGuaranteeFile = null;

function _svLocalInput(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ── STEP 2 of 2: Survey ─────────────────────────────────────────────
   The survey is the continuation of the Gate-In. It carries every field the old
   single inward form had (date in, ISO code, weights, date of manufacture, cargo status,
   vessel / voyage, B/L, consignee, transporter, truck, driver, photos, guarantee form,
   remarks). Saving it turns the Gate-In into a Depot-In (original gate-in time and EIR kept). */
async function openSurveyModal(bookingId) {
  const { data: booking, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) { toast('Booking not found', 'error'); return; }
  const ic = state.db.interchange.find(i => i.bookingId === bookingId) || null;   // the gate-in this survey continues
  const x = ic || {};
  const lineId = x.line || resolveBookingShippingLineId(booking);
  const lineOptions = state.db.shippingLines.map(l => `<option value="${l.id}" ${l.id === lineId ? 'selected' : ''}>${sanitize(l.code)} — ${sanitize(l.name)}</option>`).join('');
  const curType = x.ctype || booking.cargo_type;
  const typeOptions = CONTAINER_TYPE_OPTIONS.map(t => `<option ${curType === t ? 'selected' : ''}>${t}</option>`).join('');
  const cargoOpts = ['', 'Empty', 'Laden / Full', 'Part Load', 'Damaged Cargo'].map(o => `<option value="${o}" ${x.cargoStatus === o ? 'selected' : ''}>${o || '—'}</option>`).join('');
  const pick = (a, b) => sanitize(a || b || '');
  // Consignee: only ever the recorded consignee / company. A name that matches the driver or the booking contact is never used
  // (the gate-entry booking stores the driver's name as its contact, which used to land in this field).
  const _nk = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const _notConsignee = [x.driver ? driverName(x.driver) : '', x.driverNameText, booking.driver_name, booking.full_name].map(_nk).filter(Boolean);
  const svConsignee = [x.deliveringParty, booking.company].map(v => String(v || '').trim()).find(v => v && _notConsignee.indexOf(_nk(v)) < 0) || '';
  // Remarks: never the system note "Booking REF · contact · phone"
  const svRemarks = /^Booking\s[^\u00b7]*\u00b7/.test(String(x.notes || '')) ? '' : String(x.notes || '');
  _surveyImages = (x.photos && x.photos.length) ? x.photos.slice() : [];
  _surveyGuaranteeFile = null;
  window._repairItems.sv = [];

  openModal(`Survey — ${sanitize(x.container || booking.container) || 'Container'}`, `
    ${ic ? `<div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0">Gate-In recorded ${fmtDate(ic.gateInAt || ic.date)}. Saving this survey completes the <b>Depot-In</b> and issues the <b>interchange (EIR)</b>; the gate-in time is kept.</span></div>` : ''}
    <div class="form-row-2">
      <div class="fg"><label>Container No.</label><input id="sv_container" value="${pick(x.container, booking.container)}" oninput="markContainerValidity(this)"></div>
      <div class="fg"><label>Type / Size</label><select id="sv_ctype">${typeOptions}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Date IN</label><input id="sv_datein" type="datetime-local" value="${_svLocalInput(x.gateInAt || x.date || booking.gated_in_at)}"></div>
      <div class="fg"><label>Shipping Line</label><select id="sv_line"><option value="">—</option>${lineOptions}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Consignee / C&amp;F</label><input id="sv_consignee" value="${sanitize(svConsignee)}"></div>
      <div class="fg"><label>Guarantee / B/L Number</label><input id="sv_bl" value="${pick(x.blNumber, booking.bl_number)}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Ex Vessel</label><input id="sv_vessel" value="${pick(x.vessel, booking.vessel)}"></div>
      <div class="fg"><label>Voyage</label><input id="sv_voyage" value="${pick(x.voyage, booking.voyage)}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Transporter</label><input id="sv_transporter" value="${pick(x.transporter, booking.transporter)}"></div>
      <div class="fg"><label>ISO Code</label><input id="sv_iso" placeholder="e.g. 22G1" maxlength="6" style="text-transform:uppercase" value="${pick(x.isoCode)}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Max Gross Weight — MGW (kg)</label><input id="sv_mgwt" type="number" min="0"></div>
      <div class="fg"><label>Tare Weight — TW (kg)</label><input id="sv_tare" type="number" min="0"></div>
    </div>
    <div class="fg"><label>CSC Approval <span class="label-optional">(optional)</span></label><input id="sv_csc" placeholder="e.g. USA/AB-077/10-10" maxlength="40" style="text-transform:uppercase" value="${pick(x.cscApproval)}"></div>
    <div class="form-row-2">
      <div class="fg"><label>Gross Weight (kg) <span class="label-optional">(optional)</span></label><input id="sv_gross" type="number" min="0" step="1" placeholder="e.g. 30480" value="${x.grossWeight || ''}"></div>
      <div class="fg"><label>Date of Manufacture <span class="label-optional">(optional)</span></label><input id="sv_dom" placeholder="MM/YYYY" maxlength="7" value="${pick(x.manufactureDate)}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Cargo Status <span class="label-optional">(optional)</span></label><select id="sv_cargo">${cargoOpts}</select></div>
      <div class="fg"><label>Gate Pass No.</label><input id="sv_gatepass"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Vehicle / Truck No.</label><input id="sv_truck" list="iwTruckList" value="${sanitize(x.truck ? truckName(x.truck).split(' · ')[0] : (x.truckRegText || booking.truck_reg || ''))}"></div>
      <div class="fg"><label>Trailer Number</label><input id="sv_trailer" value="${pick(x.trailerNo)}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Driver Name</label><input id="sv_driver" list="iwDriverList" value="${sanitize(x.driver ? driverName(x.driver) : (x.driverNameText || booking.driver_name || ''))}"></div>
      <div class="fg"><label>Driver ID Number</label><input id="sv_driver_id" value="${pick(x.driverIdNumber, booking.driver_id_number)}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Surveyed By</label><input id="sv_clerk" value="${sanitize((state.profile && state.profile.name) || '')}"></div>
      <div class="fg"><label>Seal Number</label><input id="sv_seal"></div>
    </div>

    <div class="fg"><label>Overall Condition</label><select id="sv_condition" onchange="onSurveyConditionChange()">
      <option value="food_grade">Food Grade</option>
      <option value="under_repair">Under Repair</option>
      <option value="damaged">Damaged</option>
      <option value="heavily_damaged">Heavily Damaged — requires joint survey</option>
    </select></div>
    <div id="sv_heavily_damaged_note" style="display:none;margin-bottom:10px" class="ops-notice">
      This container will be sent to <b>Escalations</b> and cannot be allocated to storage until a second surveyor records a joint finding. It stays a Gate-In until then.
    </div>

    ${tariffPickerHtml('sv')}

    <div class="fg"><label>Survey Photos <span class="label-optional">(up to 10)</span></label><input type="file" id="sv_images" accept="image/*" multiple onchange="onSurveyImagesSelected(event)"><div id="sv_images_preview" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div></div>
    <div class="fg"><label>Guarantee Form <span class="label-optional">(optional, image or PDF)</span></label><input type="file" id="sv_guarantee_file" accept="image/*,.pdf" onchange="onSurveyGuaranteePicked(event)"><div id="sv_guarantee_label" style="font-size:11.5px;color:var(--text-2);margin-top:4px"></div></div>
    <div class="fg"><label>Remarks / Notes</label><textarea id="sv_remarks" rows="3" placeholder="Damage notes, discrepancies, etc.">${sanitize(svRemarks)}</textarea></div>
    <button class="submit-btn" onclick="saveSurvey('${bookingId}')">${ic ? 'Save Survey &amp; Complete Depot-In' : 'Save Survey'} →</button>
  `);
  const svContEl = document.getElementById('sv_container');
  if (svContEl) markContainerValidity(svContEl);
  renderRepairItemsList('sv');
  _renderSurveyPhotos();
  if (typeof bindIncomingDriverAutofill === 'function') bindIncomingDriverAutofill('sv');
}

function _renderSurveyPhotos() {
  const preview = document.getElementById('sv_images_preview'); if (!preview) return;
  preview.innerHTML = _surveyImages.map((src, i) =>
    `<div style="position:relative"><img src="${src}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)" /><button type="button" onclick="removeSurveyImage(${i})" title="Remove" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;line-height:14px;padding:0;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer">×</button></div>`
  ).join('');
}
function removeSurveyImage(i) { _surveyImages.splice(i, 1); _renderSurveyPhotos(); }

function onSurveyConditionChange() {
  const el = document.getElementById('sv_condition');
  const note = document.getElementById('sv_heavily_damaged_note');
  if (note) note.style.display = (el && el.value === 'heavily_damaged') ? 'block' : 'none';
}

function onSurveyImagesSelected(e) {
  const files = Array.from(e.target.files || []);
  const room = GX_MAX_SURVEY_PHOTOS - _surveyImages.length;
  if (room <= 0) { toast(`Maximum ${GX_MAX_SURVEY_PHOTOS} photos — remove one to add another`, 'error'); e.target.value = ''; return; }
  files.slice(0, room).forEach(file => {
    const problem = gxPhotoProblem(file);
    if (problem) { toast(`${file.name} skipped — ${problem}`, 'error'); return; }
    const reader = gxImageReader();
    reader.onload = () => { if (_surveyImages.length >= GX_MAX_SURVEY_PHOTOS) return; _surveyImages.push(reader.result); _renderSurveyPhotos(); };
    reader.readAsDataURL(file);
  });
  if (files.length > room) toast(`Only ${room} more photo${room === 1 ? '' : 's'} could be added (max ${GX_MAX_SURVEY_PHOTOS})`, 'warning');
  e.target.value = '';
}

function onSurveyGuaranteePicked(e) {
  const file = e.target.files && e.target.files[0];
  const lab = document.getElementById('sv_guarantee_label');
  if (!file) { _surveyGuaranteeFile = null; if (lab) lab.textContent = ''; return; }
  const ok = file.type === 'application/pdf' || /\.pdf$/i.test(file.name) || file.type.startsWith('image/');
  if (!ok) { toast('Upload an image or PDF', 'error'); e.target.value = ''; return; }
  if (file.size > 5*1024*1024) { toast('File too large — max 5MB', 'error'); e.target.value = ''; return; }
  _surveyGuaranteeFile = file;
  if (lab) lab.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
}

async function saveSurvey(bookingId) {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const container = val('sv_container').toUpperCase();
  if (container) {
    const containerIssue = containerFormatIssue(container);
    if (containerIssue) { toast(`Container number: ${containerIssue}`, 'error'); return; }
  }
  const dom = normalizeManufactureDate(val('sv_dom'));
  if (dom === null) { toast('Date of manufacture must look like 05/2011', 'error'); return; }
  const grossRaw = val('sv_gross'), gross = grossRaw ? Number(grossRaw) : '';
  if (grossRaw && (!isFinite(gross) || gross <= 0)) { toast('Gross weight must be a positive number', 'error'); return; }
  const dateInRaw = val('sv_datein');
  if (dateInRaw && isNaN(new Date(dateInRaw))) { toast('Date IN is not a valid date', 'error'); return; }

  const cg = k => (window.cfgGet ? window.cfgGet(k) : undefined);   // System Settings → Depot operations
  const need = (cond, msg) => { if (cond) { toast(msg, 'error'); return true; } return false; };
  if (need(cg('survey.requireIso') && !val('sv_iso'), 'ISO code is required')) return;
  if (need(cg('survey.requireWeight') && !grossRaw && !val('sv_mgwt'), 'Gross weight is required')) return;
  if (need(cg('survey.requireManufactureDate') && !val('sv_dom'), 'Date of manufacture is required')) return;
  if (need(cg('survey.requireCargoStatus') && !val('sv_cargo'), 'Cargo status is required')) return;
  if (need(_surveyImages.length < (Number(cg('survey.minPhotos')) || 0), `At least ${cg('survey.minPhotos')} survey photo${Number(cg('survey.minPhotos')) === 1 ? '' : 's'} required`)) return;
  if (window.GargoForms) { const formErr = GargoForms.validate('survey'); if (formErr) { toast(formErr, 'error'); return; } }   // Form Designer rules
  const repairItems = repairItemsFor('sv');
  const sourceIc = state.db.interchange.find(i => i.bookingId === bookingId);
  if (container) {
    const avail = await checkContainerAvailable(container, { bookingId, icId: sourceIc ? sourceIc.id : null });
    if (avail) { toast(avail, 'error', 7000); return; }
  }
  if (cg('survey.requireGuarantee') && !_surveyGuaranteeFile) {
    let have = false;
    try { if (sourceIc && window.bookingDocs) { const d = await window.bookingDocs.documentsForInterchanges([sourceIc.id]); have = (d[sourceIc.id] || []).some(x => x.doc_type === 'guarantee_form'); } } catch (e) {}
    if (!have) { toast('Upload the guarantee form (required by your settings)', 'error'); return; }
  }
  const btn = document.querySelector('#modalOverlay .submit-btn'); if (btn) btn.disabled = true;
  try {
    // The interchange (EIR) is issued here, after the survey, never at the gate. A heavily damaged container waits for its joint survey.
    const willEscalate = val('sv_condition') === 'heavily_damaged';
    let eirForSurvey = sourceIc ? (sourceIc.eirNumber || '') : '';
    if (sourceIc && !eirForSurvey && !willEscalate) eirForSurvey = await nextEirNumber('Depot-In', val('sv_line') || sourceIc.line || '');
    // photos go to Supabase Storage; the survey keeps links only
    if (window.GargoPhotos) { try { _surveyImages = await GargoPhotos.migrateList(_surveyImages, { container, category: 'survey' }); } catch (e) { console.warn('photo upload', e); } }
    if (_surveyImages.some(u => /^data:/.test(u))) toast('Some photos could not be uploaded (offline?) and were kept on this device', 'warning', 6000);
    const survey = await window.bookingDocs.recordSurvey({
      bookingId,
      sourceInterchangeId: sourceIc ? sourceIc.id : null,
      container,
      containerType: val('sv_ctype'),
      containerSize: val('sv_ctype'),
      shippingLineId: val('sv_line') || null,
      consignee: val('sv_consignee'),
      blNumber: val('sv_bl'),
      eirNumber: eirForSurvey,   // EIR is system-generated at survey completion; never typed in
      isoCode: val('sv_iso').toUpperCase(),
      mgwt: val('sv_mgwt') ? parseFloat(val('sv_mgwt')) : null,
      tareWeight: val('sv_tare') ? parseFloat(val('sv_tare')) : null,
      cscApproval: val('sv_csc').toUpperCase(),
      vessel: val('sv_vessel'),
      voyage: val('sv_voyage'),
      transporter: val('sv_transporter'),
      truckReg: val('sv_truck'),
      trailerNumber: val('sv_trailer'),
      driverName: val('sv_driver'),
      driverIdNumber: val('sv_driver_id'),
      clerkName: val('sv_clerk'),
      sealNumber: val('sv_seal'),
      gatePassNumber: val('sv_gatepass'),
      conditionStatus: val('sv_condition') || 'food_grade',
      remarks: val('sv_remarks'),
      photos: _surveyImages,
      tariffItems: repairItems,
      dateIn: dateInRaw ? new Date(dateInRaw).toISOString() : null,
      manufactureDate: dom || null,
      cargoStatus: val('sv_cargo') || null,
      gross: gross,
      custom: window.GargoForms ? GargoForms.collect('survey') : null,   // Form Designer fields (incl. Currency)
    });
    const heavy = val('sv_condition') === 'heavily_damaged';
    if (window.GargoPhotos && survey) GargoPhotos.linkSurveyPhotos({ container, surveyId: survey.id, interchangeId: sourceIc ? sourceIc.id : null, urls: _surveyImages }).catch(() => {});

    // Everything the old inward form captured that the survey table has no column for goes onto the interchange record
    const extra = {
      dateIn: dateInRaw ? new Date(dateInRaw).toISOString() : null, dateInInput: dateInRaw,
      manufactureDate: dom, cargoStatus: val('sv_cargo'), gross,
      deliveringParty: sanitize(val('sv_consignee')), notes: sanitize(val('sv_remarks')),
      truckReg: val('sv_truck'), driverName: val('sv_driver'), ctype: val('sv_ctype'), line: val('sv_line'),
    };

    if (typeof rememberIncomingDriver === 'function' && val('sv_driver')) {
      const svDriverName = val('sv_driver').toLowerCase();
      if (!state.db.drivers.some(d => (d.name || '').toLowerCase() === svDriverName)) {
        rememberIncomingDriver({ name: val('sv_driver'), idNo: val('sv_driver_id'), transporter: val('sv_transporter'), truck: val('sv_truck'), trailer: val('sv_trailer') });
      }
    }

    if (sourceIc) {
      if (eirForSurvey) sourceIc.eirNumber = eirForSurvey;
      syncSurveyBackToInterchange(sourceIc, survey, heavy, extra);
      if (!heavy) {
        finalizeDepotIn(sourceIc);                  // survey done → Depot-In, interchange issued
        if (sourceIc.eirNumber) supabase.from('public_bookings').update({ eir_number: sourceIc.eirNumber }).eq('id', bookingId).then(() => {}, () => {});
        try { await window.bookingDocs.markInterchangeGenerated(survey.id, sourceIc.id); } catch (e) { console.warn('markInterchangeGenerated', e); }
      }
    } else if (!heavy && bookingId && survey && survey.id) {
      await generateInterchangeFromSurvey(bookingId, survey.id);
    }

    if (_surveyGuaranteeFile) {
      const file = _surveyGuaranteeFile;
      try {
        await saveNowAwaited();
        if (sourceIc) await window.bookingDocs.uploadInterchangeDocument({ interchangeId: sourceIc.id, docType: 'guarantee_form', containerNo: container, file, autoVerify: true });
        else await window.bookingDocs.uploadBookingDocument({ bookingId, docType: 'guarantee_form', containerNo: container, file });
        toast('Guarantee form uploaded', 'success');
      } catch (e) {
        toast(`Survey saved, but the guarantee form upload failed: ${e.message || e}`, 'warning', 7000);
      }
      _surveyGuaranteeFile = null;
    }

    toast(heavy ? 'Survey saved — escalated for joint survey (stays Gate-In until cleared)' : (sourceIc ? `Survey saved — ${container || sourceIc.container} is now Depot-In · interchange ${sourceIc.eirNumber || ''} issued` : 'Survey saved'), heavy ? 'warning' : 'success', 5000);
    closeModal();
    renderDepOpsAwaitingSurvey();
    renderDepOpsAllocationQueue();
    renderDepOpsStorageList();
    if (typeof renderDepOpsEscalations === 'function') renderDepOpsEscalations();
    if (typeof renderInwardAwaitingSurvey === 'function') renderInwardAwaitingSurvey();
    if (typeof renderInwardStillInStorage === 'function') renderInwardStillInStorage();
    if (typeof renderInwardRecent === 'function') renderInwardRecent();
    if (typeof buildBadges === 'function') buildBadges();
    if (state.currentSection === 'interchange') renderInterchange(_icFilter || 'all');
    if (state.currentSection === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  } catch (e) {
    if (btn) btn.disabled = false;
    toast(e.message || 'Could not save survey', 'error');
  }
}

/* Gate-originated survey (source_interchange_id set): the interchange row
   this booking was created from is updated in place with the survey
   findings (including every field the old inward form captured), rather than a
   fresh Depot-In record being generated. The caller then promotes it to Depot-In. */
function syncSurveyBackToInterchange(ic, survey, heavy, x) {
  x = x || {};
  const conditionMap = { food_grade: 'Good', under_repair: 'Needs Repair', damaged: 'Damaged', heavily_damaged: 'Damaged' };
  if (survey.container) ic.container = survey.container.toUpperCase();
  ic.condition = conditionMap[survey.condition_status] || ic.condition;
  ic.surveyId = survey.id;
  ic.surveyStatus = heavy ? 'escalated' : 'surveyed';
  ic.surveyedAt = survey.surveyed_at || new Date().toISOString();
  ic.surveyedBy = (state.profile && state.profile.username) || ic.surveyedBy;
  if (survey.vessel != null) ic.vessel = survey.vessel || '';
  if (survey.voyage != null) ic.voyage = survey.voyage || '';
  if (survey.bl_number) { ic.blNumber = survey.bl_number; ic.guaranteeNo = survey.bl_number; }
  if (survey.transporter != null) ic.transporter = survey.transporter || '';
  if (survey.clerk_name) ic.clerkName = survey.clerk_name;
  if (survey.driver_id_number) ic.driverIdNumber = survey.driver_id_number;
  if (survey.iso_code) ic.isoCode = survey.iso_code;
  if (survey.trailer_number != null) ic.trailerNo = survey.trailer_number || '';
  if (survey.shipping_line_id) ic.line = survey.shipping_line_id;
  if (x.ctype) ic.ctype = x.ctype;
  if (x.gross !== undefined && x.gross !== '') ic.grossWeight = x.gross; else if (survey.mgwt) ic.grossWeight = survey.mgwt;
  if (x.manufactureDate !== undefined) ic.manufactureDate = x.manufactureDate;
  if (x.cargoStatus !== undefined) ic.cargoStatus = x.cargoStatus;
  if (x.deliveringParty) ic.deliveringParty = x.deliveringParty;
  if (x.notes) ic.notes = x.notes;
  if (x.dateIn && x.dateInInput !== _svLocalInput(ic.gateInAt || ic.date)) { ic.date = x.dateIn; ic.gateInAt = x.dateIn; }   // only when the clerk actually corrected it
  if (x.truckReg) {
    const t = state.db.trucks.find(t => (t.reg || '').toLowerCase() === x.truckReg.toLowerCase());
    ic.truck = t ? t.id : ''; ic.truckRegText = t ? '' : sanitize(x.truckReg);
  }
  if (x.driverName) {
    const d = state.db.drivers.find(d => (d.name || '').toLowerCase() === x.driverName.toLowerCase());
    ic.driver = d ? d.id : ''; ic.driverNameText = d ? '' : sanitize(x.driverName);
  }
  ic.photos = (survey.photos || []).slice();
  ic.img = ic.photos[0] || '';
  if (survey.tariff_items && survey.tariff_items.length) {
    ic.repairs = survey.tariff_items;
    ic.repairTotal = repairItemsTotal(survey.tariff_items);
  }
  ic._dirty = true;
  scheduleSave();
  addAudit((state.profile && state.profile.username) || 'system', heavy ? 'Gate-In Surveyed (escalated)' : 'Depot-In Completed (surveyed)', ic.container);
}

async function generateInterchangeFromSurvey(bookingId, surveyId) {
  try {
    const { data: booking } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
    if (!booking) { toast('Booking not found for this container', 'error'); return; }
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    if (!survey) { toast('No survey found for this container', 'error'); return; }
    if (survey.interchange_generated_at) { return; }
    const conditionMap = { food_grade: 'Good', under_repair: 'Needs Repair', damaged: 'Damaged', heavily_damaged: 'Damaged' };
    const matchedTruck = state.db.trucks.find(t => (t.reg || '').toUpperCase() === (survey.truck_reg || '').toUpperCase());
    const matchedDriver = state.db.drivers.find(d => (d.name || '').toLowerCase() === (survey.driver_name || '').toLowerCase());


    // Storage goes onto the slip in its own boxes (zone / block / slot), using the
    // block's code rather than its internal id.
    let storageZone = '', storageBlock = '', storageSlot = '';
    if (booking.storage_status === 'allocated') {
      try {
        const zones = await window.bookingDocs.listZones();
        const zone = zones.find(z => z.id === booking.storage_zone_id);
        storageZone = zone ? (zone.zone_code || zone.zone_name || '') : '';
        if (booking.storage_block_id) {
          const blocks = await window.bookingDocs.listBlocks(booking.storage_zone_id);
          const blk = blocks.find(x => x.id === booking.storage_block_id);
          storageBlock = blk ? (blk.block_code || '') : '';
        }
        storageSlot = booking.storage_slot_number ? String(booking.storage_slot_number) : '';
      } catch (e) { /* storage location is a nice-to-have on the slip, never blocks generation */ }
    }

    {
      const availDup = await checkContainerAvailable((survey.container || (booking && booking.container) || '').toUpperCase(), { bookingId });
      if (availDup) { toast(availDup, 'error', 8000); return; }
    }
    const eirNumber = await nextEirNumber('Depot-In', survey.shipping_line_id || (booking && booking.shipping_line_id) || '');
    const icRecord = {
      id: uid('IC'),
      container: (survey.container || (booking && booking.container) || '').toUpperCase(),
      type: 'Depot-In',
      line: survey.shipping_line_id || '',
      condition: conditionMap[survey.condition_status] || 'Good',
      truck: matchedTruck ? matchedTruck.id : '',
      driver: matchedDriver ? matchedDriver.id : '',
      ctype: survey.container_type || '',
      vessel: survey.vessel || '',
      voyage: survey.voyage || '',
      blNumber: survey.bl_number || '',
      guaranteeNo: survey.bl_number || '',
      eirNumber,
      deliveringParty: survey.consignee || '',
      transporter: survey.transporter || '',
      driverIdNumber: survey.driver_id_number || '',
      isoCode: survey.iso_code || '',
      trailerNo: survey.trailer_number || '',
      grossWeight: (survey.gross_weight != null ? survey.gross_weight : (survey.mgwt || '')),
      manufactureDate: survey.manufacture_date || '',
      cargoStatus: survey.cargo_status || '',
      repairs: survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : (survey.tariff_code ? [{ category: survey.tariff_category, code: survey.tariff_code, side: survey.tariff_side, item: survey.tariff_item, hours: survey.tariff_hours, material: survey.tariff_material }] : []),
      repairTotal: repairItemsTotal(survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : (survey.tariff_code ? [{ hours: survey.tariff_hours, material: survey.tariff_material }] : [])),
      notes: sanitize(survey.remarks || ''),
      clerkName: survey.clerk_name || '',
      storageZone, storageBlock, storageSlot,
      date: survey.date_in || new Date().toISOString(),
      status: 'pending',
      img: (survey.photos && survey.photos[0]) || '',
      surveyId: survey.id,
      bookingId: bookingId || null,
      truckRegText: !matchedTruck ? (survey.truck_reg || '') : '',
      driverNameText: !matchedDriver ? (survey.driver_name || '') : '',
      _dirty: true,
    };
    const savedGen = await persistNewInterchange(icRecord);
    if (!savedGen.ok) { toast(`Interchange not saved \u2014 ${savedGen.message}`, 'error', 9000); return; }
    buildBadges();
    addAudit(state.profile.username, 'Interchange Generated (from survey)', icRecord.container);
    await window.bookingDocs.markInterchangeGenerated(surveyId, icRecord.id);
    toast(`Interchange generated for ${icRecord.container} — awaiting admin approval to release payment`, 'success', 5000);
    renderDepOpsStorageList();
    if (state.currentSection === 'interchange') renderInterchange('all');
  } catch (e) {
    toast(e.message || 'Could not generate interchange', 'error');
  }
}

async function depOpsAllocZoneChanged(bookingId) {
  const zoneSel = document.getElementById('alloc-zone-' + bookingId);
  const blockSel = document.getElementById('alloc-block-' + bookingId);
  const slotSel = document.getElementById('alloc-slot-' + bookingId);
  if (!zoneSel || !blockSel || !slotSel) return;
  const zoneId = zoneSel.value;
  slotSel.innerHTML = '<option value="">—</option>';
  if (!zoneId) { blockSel.innerHTML = '<option value="">Select zone first…</option>'; return; }
  blockSel.innerHTML = '<option value="">Loading…</option>';
  try {
    const blocks = await window.bookingDocs.listBlocks(zoneId);
    if (!blocks.length) { blockSel.innerHTML = '<option value="">No blocks in this zone</option>'; return; }
    blockSel.innerHTML = '<option value="">Select…</option>' + blocks.map(bl =>
      `<option value="${bl.id}">${sanitize(bl.block_code)} · ${sanitize(bl.container_type)}</option>`
    ).join('');
  } catch (e) {
    blockSel.innerHTML = '<option value="">Error loading blocks</option>';
  }
}

async function depOpsAllocBlockChanged(bookingId) {
  const blockSel = document.getElementById('alloc-block-' + bookingId);
  const slotSel = document.getElementById('alloc-slot-' + bookingId);
  if (!blockSel || !slotSel) return;
  const blockId = blockSel.value;
  if (!blockId) { slotSel.innerHTML = '<option value="">—</option>'; return; }
  slotSel.innerHTML = '<option value="">Loading…</option>';
  try {
    const slots = await window.bookingDocs.blockSlots(blockId);
    const free = slots.filter(s => !s.booking_id && !s.trip_id && !s.container);
    if (!free.length) { slotSel.innerHTML = '<option value="">No free slots</option>'; return; }
    slotSel.innerHTML = '<option value="">Select…</option>' + free.map(s => `<option value="${s.slot_number}">Slot ${s.slot_number}</option>`).join('');
  } catch (e) {
    slotSel.innerHTML = '<option value="">Error loading slots</option>';
  }
}

// ---------- Escalations (heavily damaged → joint survey) ----------
async function renderDepOpsEscalations() {
  const wrap = document.getElementById('depopsEscalationsList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const bookings = await window.bookingDocs.escalatedBookings();
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers awaiting joint survey</div></div>'; return; }
    const surveys = await Promise.all(bookings.map(b => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    wrap.innerHTML = bookings.map((b,i) => depOpsEscalationCard(b, surveys[i])).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsEscalationCard(b, survey) {
  return `<div style="border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(239,68,68,0.06)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong class="mono" style="color:var(--red,#ef4444)">${sanitize(b.container) || 'No container on file'}</strong>
        <div style="font-size:11px;color:var(--text-3)">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''} · ${sanitize(b.cargo_type || '—')}</div>
        ${survey ? `<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">First survey by ${sanitize(survey.clerk_name||'—')} on ${fmtDate(survey.surveyed_at)}${survey.remarks ? ' — ' + sanitize(survey.remarks) : ''}</div>` : ''}
      </div>
      <span class="sbadge s-rejected">heavily damaged</span>
    </div>
    <div style="margin-top:10px"><button class="modal-btn primary" onclick="openJointSurveyModal('${b.id}','${survey ? survey.id : ''}')">Record Joint Survey →</button></div>
  </div>`;
}

function openJointSurveyModal(bookingId, surveyId) {
  if (!surveyId) { toast('Original survey not found for this container', 'error'); return; }
  openModal('Joint Survey', `
    <div class="ops-notice" style="margin-bottom:12px">A second, independent surveyor must confirm the condition before this container can be accepted into storage or rejected.</div>
    <div class="fg"><label>Joint Surveyor Name</label><input id="js_by" value="${sanitize((state.profile && state.profile.name) || '')}"></div>
    <div class="fg"><label>Final Condition</label><select id="js_condition">
      <option value="damaged">Damaged — accept into storage as damaged</option>
      <option value="under_repair">Under Repair — accept, route to workshop</option>
      <option value="food_grade">Food Grade — original finding overturned</option>
    </select></div>
    <div class="fg"><label>Joint Survey Notes</label><textarea id="js_notes" rows="3" placeholder="Findings, agreement/disagreement with first survey..."></textarea></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="submit-btn" style="flex:1" onclick="saveJointSurvey('${bookingId}','${surveyId}', false)">Accept Into Storage →</button>
      <button class="modal-btn danger" onclick="saveJointSurvey('${bookingId}','${surveyId}', true)">Reject Container</button>
    </div>
  `);
}

async function saveJointSurvey(bookingId, surveyId, reject) {
  const by = document.getElementById('js_by').value.trim();
  const notes = document.getElementById('js_notes').value.trim();
  const condition = document.getElementById('js_condition').value;
  if (!by) { toast('Joint surveyor name is required', 'error'); return; }
  if (reject && !confirm('Reject this container? It will be removed from the storage-allocation flow entirely.')) return;
  try {
    await window.bookingDocs.recordJointSurvey({ bookingId, surveyId, jointSurveyBy: by, jointSurveyNotes: notes, finalConditionStatus: condition, reject });
    addAudit(state.profile.username, reject ? 'Container Rejected (joint survey)' : 'Joint Survey Recorded', bookingId);


    if (!reject && bookingId && surveyId) {
      const srcIc = state.db.interchange.find(i => i.bookingId === bookingId);
      if (srcIc) {
        // Gate-originated container: the joint finding clears it, so the Gate-In becomes the Depot-In
        srcIc.condition = ({ food_grade: 'Good', under_repair: 'Needs Repair', damaged: 'Damaged' })[condition] || srcIc.condition;
        srcIc.surveyStatus = 'surveyed'; srcIc.surveyedAt = srcIc.surveyedAt || new Date().toISOString();
        if (!srcIc.eirNumber) srcIc.eirNumber = await nextEirNumber('Depot-In', srcIc.line || '');   // interchange issued now
        finalizeDepotIn(srcIc); scheduleSave();
        supabase.from('public_bookings').update({ eir_number: srcIc.eirNumber }).eq('id', bookingId).then(() => {}, () => {});
        try { await window.bookingDocs.markInterchangeGenerated(surveyId, srcIc.id); } catch (e) { console.warn('markInterchangeGenerated', e); }
      } else {
        await generateInterchangeFromSurvey(bookingId, surveyId);
      }
    }

    toast(reject ? 'Container rejected' : 'Joint survey recorded — container is now Depot-In', reject ? 'warning' : 'success');
    if (typeof renderInwardAwaitingSurvey === 'function') renderInwardAwaitingSurvey();
    closeModal();
    renderDepOpsEscalations();
    renderDepOpsAllocationQueue();
    renderDepOpsStorageList();
  } catch (e) {
    toast(e.message || 'Could not save joint survey', 'error');
  }
}

// ---------- Yard Map (zone → block → slot visualization, KMA stacking rules) ----------
async function renderDepOpsYardMap() {
  const wrap = document.getElementById('depopsYardMap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const zones = await window.bookingDocs.listZones();
    if (!zones.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No storage zones configured yet</div></div>'; return; }
    let html = `<div class="ops-notice" style="margin-bottom:14px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      Stacking heights follow KMA Regulatory Guidelines §6.2: 7-high for standard dry empty containers, 6-high for reefers, unless otherwise approved.
    </div>`;
    for (const z of zones) {
      const blocks = await window.bookingDocs.listBlocks(z.id);
      html += `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span class="panel-title">${sanitize(z.zone_code||'')} · ${sanitize(z.zone_name)}</span><span class="panel-meta">${z.shipping_lines ? sanitize(z.shipping_lines.code) : 'Unassigned'}</span></div><div style="padding:12px 14px">`;
      if (!blocks.length) { html += '<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone</div></div>'; }
      for (const bl of blocks) {
        const slots = await window.bookingDocs.blockSlots(bl.id);
        const maxStack = bl.max_stack_height || window.bookingDocs.kmaMaxStackHeight(bl.container_type);
        const occCount = slots.filter(s => s.condition_status !== 'empty').length;
        const overLimit = occCount > slots.length;
        html += `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:12px;font-weight:600">Block ${sanitize(bl.block_code)} · ${sanitize(bl.container_type)}</div>
            <div style="font-size:10.5px;color:var(--text-3)">${occCount}/${slots.length} slots · max ${maxStack}-high</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:3px">
            ${slots.map(s => `<div title="Slot ${s.slot_number}${s.container ? ' — ' + sanitize(s.container) : ''} (${conditionStatusLabel(s.condition_status)})" class="yard-slot yard-slot-${s.condition_status}"></div>`).join('')}
          </div>
          ${overLimit ? `<div style="font-size:10.5px;color:var(--red,#ef4444);margin-top:4px">⚠ Occupancy exceeds declared capacity — review against KMA §6.1 (85% max occupancy)</div>` : ''}
        </div>`;
      }
      html += `</div></div>`;
    }
    html += `<div class="panel"><div class="panel-head"><span class="panel-title">Legend</span></div><div style="padding:10px 14px;display:flex;gap:14px;flex-wrap:wrap;font-size:11px">
      <span><span class="yard-slot yard-slot-empty" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Empty</span>
      <span><span class="yard-slot yard-slot-food_grade" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Food Grade</span>
      <span><span class="yard-slot yard-slot-under_repair" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Under Repair</span>
      <span><span class="yard-slot yard-slot-damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Damaged</span>
      <span><span class="yard-slot yard-slot-heavily_damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Heavily Damaged</span>
    </div></div>`;
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

// ---------- Surveyed Containers Register (printable / downloadable) ----------
let _surveyRegisterData = [];

let _surveyLookupCache = {};

// keyed by survey id, populated wherever a depot_surveys row passes through (allocation queue, register, etc.) so downloadInspectionReport() can find it regardless of which screen triggered it
async function renderDepOpsSurveyRegister() {
  const wrap = document.getElementById('depopsSurveyRegister');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    _surveyRegisterData = await window.bookingDocs.listAllSurveys();
    _surveyRegisterData.forEach(s => { _surveyLookupCache[s.id] = s; });
    if (!_surveyRegisterData.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No surveys recorded yet</div></div>'; return; }
    wrap.innerHTML = `<div style="overflow-x:auto"><table class="tbl" id="surveyRegisterTable" style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Date</th><th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Type</th>
        <th style="padding:6px 8px">Consignee</th><th style="padding:6px 8px">Transporter</th><th style="padding:6px 8px">Truck</th>
        <th style="padding:6px 8px">Clerk</th><th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px">Inspection Report</th><th style="padding:6px 8px">Photos</th>
      </tr></thead><tbody>${_surveyRegisterData.map(s => `<tr style="border-top:1px solid var(--border)">
        <td style="padding:6px 8px">${fmtDate(s.surveyed_at)}</td>
        <td style="padding:6px 8px" class="mono">${sanitize(s.container||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.container_type||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.consignee||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.transporter||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.truck_reg||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.clerk_name||'—')}</td>
        <td style="padding:6px 8px">${sbadge(s.condition_status === 'heavily_damaged' ? 'rejected' : (s.condition_status === 'food_grade' ? 'approved' : 'pending'))} ${sanitize(conditionStatusLabel(s.condition_status))}</td>
        <td style="padding:6px 8px">${s.interchange_generated_at ? `✓ Generated${s.interchange_id ? ` <button class="tbl-btn" onclick="GargoDocs.eir('${s.interchange_id}','preview')" title="Preview">👁</button><button class="tbl-btn" onclick="downloadInterchangeSlip('${s.interchange_id}')">⬇</button><button class="tbl-btn" onclick="printInterchangeSlip('${s.interchange_id}')" title="Print">🖨</button>` : ''}` : '—'}</td>
        <td style="padding:6px 8px"><button class="tbl-btn" onclick="GargoDocs.inspection('${s.id}','preview')" title="Preview">👁</button><button class="tbl-btn" onclick="downloadInspectionReport('${s.id}')">⬇ Report</button><button class="tbl-btn" onclick="printInspectionReport('${s.id}')" title="Print">🖨</button></td>
        <td style="padding:6px 8px">${Array.isArray(s.photos) && s.photos.length ? `<button class="tbl-btn" onclick="viewSurveyPhotos('${s.id}')">📷 ${s.photos.length}</button>` : '<span style="color:var(--text-3);font-size:10.5px">—</span>'}</td>
      </tr>`).join('')}</tbody></table></div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function viewSurveyPhotos(surveyId) {
  const s = _surveyRegisterData.find(x => x.id === surveyId);
  if (!s) { toast('Survey not found', 'error'); return; }
  const photos = Array.isArray(s.photos) ? s.photos : [];
  const gallery = photos.length
    ? `<div class="container-img-grid">${photos.map(src => `<div class="container-img-thumb view-only"><img src="${src}" onclick="window.open('${src}','_blank')" /></div>`).join('')}</div>`
    : '<div class="empty-state"><div class="empty-state-label">No photos on file for this survey</div></div>';
  openModal(`Survey Photos — ${sanitize(s.container || 'Container')}`, `<div style="margin-bottom:10px;font-size:11px;color:var(--text-3)">Surveyed ${fmtDate(s.surveyed_at)} by ${sanitize(s.clerk_name||'—')}</div>${gallery}`);
}

function printSurveyRegister() {
  const table = document.getElementById('surveyRegisterTable');
  if (!table) { toast('Nothing to print yet', 'error'); return; }
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Surveyed Containers</title><style>
    body{font-family:Arial,sans-serif;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}
    h2{margin-bottom:4px}
  </style></head><body>${ghPrintHeaderHtml()}<h2>Surveyed Containers</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')}</div>${table.outerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function downloadSurveyRegisterCSV() {
  if (!_surveyRegisterData.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date','Container','Type','ISO Code','Line ID','Consignee','Guarantee/B-L','Vessel','Voyage','Transporter','Vehicle No','Trailer No','Driver','Driver ID No','Surveyed By','Seal','Gate Pass','MGW','TW','Condition','Escalated','Interchange Generated','Photos'];
  const rows = _surveyRegisterData.map(s => [
    s.surveyed_at, s.container, s.container_type, s.iso_code, s.shipping_line_id, s.consignee, s.bl_number, s.vessel, s.voyage,
    s.transporter, s.truck_reg, s.trailer_number, s.driver_name, s.driver_id_number, s.clerk_name, s.seal_number, s.gate_pass_number,
    s.mgwt, s.tare_weight, s.condition_status,
    s.escalated ? 'Yes' : 'No', s.interchange_generated_at ? 'Yes' : 'No',
    Array.isArray(s.photos) ? s.photos.length : 0,
  ]);
  const csv = ghCsvPreamble('\n') + [headers, ...rows].map(r => r.map(v => `"${String(v==null?'':v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `surveyed-containers-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Master Container List (all statuses) ----------
let _masterListFilter = 'all';

function filterDepOpsMasterList(status, btn) {
  _masterListFilter = status;
  document.querySelectorAll('#depopsPanel-master .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDepOpsMasterList();
}

const MASTER_STATUS_LABELS = {
  awaiting_survey: 'Awaiting Survey', escalated: 'Escalated (Joint Survey)', surveyed: 'Surveyed',
  allocated: 'In Storage', survey_rejected: 'Rejected', dispatched: 'Dispatched',
};

async function renderDepOpsMasterList() {
  const wrap = document.getElementById('depopsMasterList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    let entries = await window.bookingDocs.masterContainerList();
    if (_masterListFilter !== 'all') entries = entries.filter(e => e.booking.storage_status === _masterListFilter);
    if (!entries.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers match this filter</div></div>'; return; }
    wrap.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Status</th>
        <th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Location</th><th style="padding:6px 8px">Interchange</th>
      </tr></thead><tbody>${entries.map(e => {
        const b = e.booking, s = e.survey, slot = e.slot;
        const loc = slot ? `${slot.depot_blocks ? sanitize(slot.depot_blocks.block_code) : ''} · Slot ${slot.slot_number}` : (b.storage_zone_id ? 'Zone assigned' : '—');
        return `<tr style="border-top:1px solid var(--border)">
          <td style="padding:6px 8px" class="mono">${sanitize(b.container||'—')}</td>
          <td style="padding:6px 8px">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''}</td>
          <td style="padding:6px 8px">${sbadge(b.storage_status==='escalated'?'rejected':b.storage_status==='surveyed'||b.storage_status==='allocated'?'approved':'pending')} ${MASTER_STATUS_LABELS[b.storage_status] || sanitize(b.storage_status||'—')}</td>
          <td style="padding:6px 8px">${s ? sanitize(conditionStatusLabel(s.condition_status)) : '—'}</td>
          <td style="padding:6px 8px">${loc}</td>
          <td style="padding:6px 8px">${s && s.interchange_generated_at ? `✓${s.interchange_id ? ` <button class="tbl-btn" onclick="GargoDocs.eir('${s.interchange_id}','preview')" title="Preview">👁</button><button class="tbl-btn" onclick="downloadInterchangeSlip('${s.interchange_id}')">⬇</button><button class="tbl-btn" onclick="printInterchangeSlip('${s.interchange_id}')" title="Print">🖨</button>` : ''}` : '—'}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

// ---------- DepOps Reports (pulls from Interchange, filterable by shipping line) ----------
let _depOpsRptRows = [];

function depOpsReportsPopulateLines() {
  const sel = document.getElementById('depopsRptLine');
  if (!sel || sel.dataset.populated) return;
  const unmapped = document.createElement('option');
  unmapped.value = '__unmapped__';
  unmapped.textContent = '⚠ No Line Assigned';
  sel.appendChild(unmapped);
  state.db.shippingLines.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = `${l.code} — ${l.name}`;
    sel.appendChild(opt);
  });
  sel.dataset.populated = '1';
}

function depOpsReportsReset() {
  ['depopsRptLine', 'depopsRptType', 'depopsRptStatus', 'depopsRptFrom', 'depopsRptTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderDepOpsReports();
}

async function renderDepOpsReports() {
  depOpsReportsPopulateLines();

  const lineId = document.getElementById('depopsRptLine')?.value || '';
  const type = document.getElementById('depopsRptType')?.value || '';
  const status = document.getElementById('depopsRptStatus')?.value || '';
  const from = document.getElementById('depopsRptFrom')?.value || '';
  const to = document.getElementById('depopsRptTo')?.value || '';

 
  const outIds = gxOutIcIds();   // trips that already issued their own Gate-Out interchange are not shown twice
  let rows = [
    ...(state.db.interchange || []).map(i => ({ ...i, _reportSource: 'interchange' })),
    ...(state.db.trips || []).filter(t => !(isOutwardWorkType(t.workType) && outIds.has(gxOutwardIcId(t.id)))).map(_tripToInterchangeReportRow),
  ];
  if (lineId === '__unmapped__') rows = rows.filter(i => !i.line);
  else if (lineId) rows = rows.filter(i => i.line === lineId);
  if (type) rows = rows.filter(i => i.type === type);
  if (status) rows = rows.filter(i => i.status === status);
  if (from) rows = rows.filter(i => new Date(i.date) >= new Date(from));
  if (to) rows = rows.filter(i => new Date(i.date) <= new Date(to + 'T23:59:59'));
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  _depOpsRptRows = rows;

  const body = document.getElementById('depopsRptBody');
  const meta = document.getElementById('depopsRptMeta');
  const exportBtn = document.getElementById('depopsRptExportBtn');
  const unmappedCount = (state.db.interchange || []).filter(i => !i.line).length
    + (state.db.trips || []).filter(t => !t.shippingLine).length;
  if (meta) meta.textContent = `${rows.length} record${rows.length === 1 ? '' : 's'}` + (unmappedCount ? ` · ${unmappedCount} total with no shipping line — <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold)">resolve them →</a>` : '');
  if (exportBtn) exportBtn.disabled = !rows.length;

  if (body) {
    body.innerHTML = rows.length ? rows.map(ic => `<tr>
      <td class="mono">${fmtDate(ic.date)}</td>
      <td class="mono" style="color:var(--gold)">${sanitize(ic.container || '—')}</td>
      <td>${sanitize(ic.type || '—')}</td>
      <td>${sanitize(ic.ctype || '—')}</td>
      <td>${ic.line ? sanitize(lineName(ic.line)) : '<span style="color:var(--danger,#c0392b)">⚠ No Line</span>'}</td>
      <td>${sanitize(ic.condition || '—')}</td>
      <td>${ic.truck ? sanitize(truckName(ic.truck)) : '—'}</td>
      <td>${ic.driver ? sanitize(driverName(ic.driver)) : '—'}</td>
      <td>${sbadge(ic.status)}</td>
      <td class="mono">${ic.repairTotal ? GargoMoney.fmt(ic.repairTotal, GargoMoney.itemsCur(ic.repairs)) : '—'}</td>
    </tr>`).join('') : `<tr><td colspan="10" class="empty-td">No interchange records match these filters</td></tr>`;
  }

  const byLine = {};
  rows.forEach(ic => { const key = ic.line ? lineName(ic.line) : '⚠ No Line Assigned'; byLine[key] = (byLine[key] || 0) + 1; });
  const repairTotal = rows.reduce((s, ic) => s + (ic.repairTotal || 0), 0);

  const summary = document.getElementById('depopsRptSummary');
  if (summary) {
    summary.innerHTML = `<div class="two-col-grid">
      <div class="report-block">
        <h3>Summary</h3>
        ${reportRow('Total Records', rows.length)}
        ${reportRow('Pending', rows.filter(i => i.status === 'pending').length)}
        ${reportRow('Approved', rows.filter(i => i.status === 'approved').length)}
        ${reportRow('Reconciled', rows.filter(i => i.status === 'reconciled').length)}
        ${reportRow('Repair Costs Total', GargoMoney.fmtMixed(rows.map(ic => ({ amount: ic.repairTotal || 0, cur: GargoMoney.itemsCur(ic.repairs) }))))}
      </div>
      <div class="report-block">
        <h3>By Shipping Line</h3>
        ${Object.entries(byLine).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => reportRow(k, v)).join('') || '<div style="color:var(--text-3);font-size:12px">No data for these filters</div>'}
      </div>
    </div>`;
  }
}

function downloadDepOpsReportCSV() {
  if (!_depOpsRptRows.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'Movement', 'Type', 'Shipping Line', 'Condition', 'Truck', 'Driver', 'Status', 'Repair Cost'];
  const rows = _depOpsRptRows.map(ic => [
    ic.date, ic.container, ic.type, ic.ctype, lineName(ic.line), ic.condition,
    ic.truck ? truckName(ic.truck) : '', ic.driver ? driverName(ic.driver) : '', ic.status, ic.repairTotal || 0,
  ]);
  const csv = ghCsvPreamble('\n') + [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `depops-interchange-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function renderDepOpsZoneAdmin() {
  const wrap = document.getElementById('depopsZoneAdmin');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const zones = await window.bookingDocs.listZones();
    const blocksByZone = {};
    for (const z of zones) blocksByZone[z.id] = await window.bookingDocs.listBlocks(z.id);
    wrap.innerHTML = `
      <div style="margin-bottom:14px"><button class="action-btn" onclick="showAddZoneModal()">+ Create Zone</button></div>
      ${zones.length ? zones.map(z => depOpsZoneAdminCard(z, blocksByZone[z.id] || [])).join('') : '<div class="empty-state"><div class="empty-state-label">No zones yet — create one above</div></div>'}
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsZoneAdminCard(z, blocks) {
  const cap = z.capacity_teu || 0, occ = z.occupied_teu || 0;
  const lineLabel = z.shipping_lines ? `${sanitize(z.shipping_lines.code)} — ${sanitize(z.shipping_lines.name)}` : 'Unassigned';
  return `<div class="panel" style="margin-bottom:14px">
    <div class="panel-head">
      <span class="panel-title">${sanitize(z.zone_code || '')} · ${sanitize(z.zone_name)}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <span class="panel-meta">${lineLabel} · ${occ}/${cap} TEU</span>
        <button class="modal-btn ghost" onclick="showEditZoneModal('${z.id}')">Edit</button>
      </span>
    </div>
    <div style="padding:12px 14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase">Blocks</div>
        <button class="modal-btn ghost" onclick="showAddBlockModal('${z.id}','${sanitize(z.zone_name).replace(/'/g,"\\'")}')">+ Add Block</button>
      </div>
      ${blocks.length ? blocks.map(bl => depOpsBlockRow(bl)).join('') : '<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone yet</div></div>'}
    </div>
  </div>`;
}

function depOpsBlockRow(bl) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border)">
    <div>
      <strong style="font-size:12.5px">${sanitize(bl.block_code)}</strong>
      <span style="font-size:11px;color:var(--text-3)"> · ${sanitize(bl.container_type)} · ${bl.capacity_slots} slots</span>
    </div>
    <button class="modal-btn ghost" onclick="showBlockSlotsModal('${bl.id}')">View Slots →</button>
  </div>`;
}

function showAddZoneModal() {
  const lineOptions = state.db.shippingLines.filter(l => l.active).map(l => `<option value="${l.id}">${sanitize(l.code)} — ${sanitize(l.name)}</option>`).join('');
  openModal('Create Storage Zone', `
    <div class="form-row-2">
      <div class="fg"><label>Zone Code</label><input id="zn_code" placeholder="A" maxlength="8"></div>
      <div class="fg"><label>Zone Name</label><input id="zn_name" placeholder="Zone A"></div>
    </div>
    <div class="fg"><label>Shipping Line</label><select id="zn_line"><option value="">Unassigned / shared</option>${lineOptions}</select></div>
    <div class="fg"><label>Capacity (TEU)</label><input id="zn_cap" type="number" min="0" placeholder="100"></div>
    <div class="fg"><label>Notes</label><input id="zn_notes" placeholder="Optional"></div>
    <button class="submit-btn" onclick="saveZone()">Create Zone →</button>
  `);
}

async function saveZone() {
  const code = document.getElementById('zn_code').value.trim();
  const name = document.getElementById('zn_name').value.trim();
  const lineId = document.getElementById('zn_line').value || null;
  const cap = document.getElementById('zn_cap').value;
  const notes = document.getElementById('zn_notes').value.trim();
  if (!code || !name) { toast('Zone code and name are required', 'error'); return; }
  try {
    await window.bookingDocs.createZone({ zoneCode: code, zoneName: name, shippingLineId: lineId, capacityTeu: cap, notes });
    toast(`Zone ${code} created`, 'success');
    closeModal();
    renderDepOpsZoneAdmin();
    renderDepOpsZones();
  } catch (e) {
    toast(e.message || 'Could not create zone', 'error');
  }
}

async function showEditZoneModal(zoneId) {
  try {
    const zones = await window.bookingDocs.listZones();
    const z = zones.find(x => x.id === zoneId);
    if (!z) { toast('Zone not found', 'error'); return; }
    const lineOptions = state.db.shippingLines.filter(l => l.active).map(l =>
      `<option value="${l.id}" ${z.shipping_line_id === l.id ? 'selected' : ''}>${sanitize(l.code)} — ${sanitize(l.name)}</option>`
    ).join('');
    openModal(`Edit Zone — ${sanitize(z.zone_code || z.zone_name)}`, `
      <div class="form-row-2">
        <div class="fg"><label>Zone Code</label><input id="zn_edit_code" value="${sanitize(z.zone_code || '')}" maxlength="8"></div>
        <div class="fg"><label>Zone Name</label><input id="zn_edit_name" value="${sanitize(z.zone_name)}"></div>
      </div>
      <div class="fg"><label>Shipping Line</label><select id="zn_edit_line"><option value="">Unassigned / shared</option>${lineOptions}</select></div>
      <div class="fg"><label>Capacity (TEU)</label><input id="zn_edit_cap" type="number" min="0" value="${z.capacity_teu || 0}"></div>
      <button class="submit-btn" onclick="saveZoneEdit('${zoneId}')">Save Changes →</button>
    `);
  } catch (e) {
    toast(e.message || 'Could not load zone', 'error');
  }
}

async function saveZoneEdit(zoneId) {
  const code = document.getElementById('zn_edit_code').value.trim();
  const name = document.getElementById('zn_edit_name').value.trim();
  const lineId = document.getElementById('zn_edit_line').value || null;
  const cap = parseInt(document.getElementById('zn_edit_cap').value, 10) || 0;
  if (!code || !name) { toast('Zone code and name are required', 'error'); return; }
  try {
    await window.bookingDocs.updateZone(zoneId, { zone_code: code.toUpperCase(), zone_name: name, shipping_line_id: lineId, capacity_teu: cap });
    toast('Zone updated', 'success');
    closeModal();
    renderDepOpsZoneAdmin();
    renderDepOpsZones();
  } catch (e) {
    toast(e.message || 'Could not update zone', 'error');
  }
}

function showAddBlockModal(zoneId, zoneName) {
  const typeOptions = ['Any', ...CONTAINER_TYPE_OPTIONS].map(t => `<option>${t}</option>`).join('');
  openModal(`Add Block — ${sanitize(zoneName)}`, `
    <div class="form-row-2">
      <div class="fg"><label>Block Code</label><input id="bl_code" placeholder="1"></div>
      <div class="fg"><label>Container Type</label><select id="bl_ctype">${typeOptions}</select></div>
    </div>
    <div class="fg"><label>Capacity (number of slots)</label><input id="bl_cap" type="number" min="1" value="20"></div>
    <div class="fg"><label>Notes</label><input id="bl_notes" placeholder="Optional"></div>
    <button class="submit-btn" onclick="saveBlock('${zoneId}')">Create Block →</button>
  `);
}

async function saveBlock(zoneId) {
  const code = document.getElementById('bl_code').value.trim();
  const ctype = document.getElementById('bl_ctype').value;
  const cap = document.getElementById('bl_cap').value;
  const notes = document.getElementById('bl_notes').value.trim();
  if (!code) { toast('Block code is required', 'error'); return; }
  try {
    await window.bookingDocs.createBlock({ zoneId, blockCode: code, containerType: ctype, capacitySlots: cap, notes });
    toast(`Block ${code} created`, 'success');
    closeModal();
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || 'Could not create block', 'error');
  }
}

async function showBlockSlotsModal(blockId) {
  openModal('Block Slots', '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');
  try {
    const slots = await window.bookingDocs.blockSlots(blockId);
    const grid = slots.map(s => {
      const linked = !!(s.booking_id || s.trip_id);
      const manual = !linked && !!s.container;
      const occupied = linked || manual;
      const colour = !occupied ? 'var(--border-mid)' : (s.condition_status === 'under_repair' ? 'var(--red)' : s.condition_status === 'damaged' ? '#b45309' : 'var(--green)');
      const label = occupied ? sanitize(s.container || '•') : s.slot_number;
      let clickAction;
      if (manual) clickAction = `releaseSlotFromGrid('${blockId}',${s.slot_number})`;
      else if (linked) clickAction = `toast('Linked to a booking/trip — release it from Outward / Repatriation instead', 'info', 5000)`;
      else clickAction = `manualAssignSlot('${blockId}',${s.slot_number})`;
      const titleTip = !occupied ? 'empty · click to assign' : (manual ? (s.condition_status || '') + ' · click to release' : (s.condition_status || '') + ' · linked booking/trip');
      return `<div class="slot-cell" style="border-color:${colour};color:${occupied ? '#fff' : 'var(--text-3)'};background:${occupied ? colour : 'transparent'}" title="Slot ${s.slot_number} · ${titleTip}" onclick="${clickAction}">${label}</div>`;
    }).join('');
    openModal('Block Slots', `
      <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">Click an empty slot to manually place a container. Slots linked to a booking/trip release automatically through Outward / Repatriation.</div>
      <div class="slot-grid">${grid || '<div class="empty-state"><div class="empty-state-label">No slots</div></div>'}</div>
    `);
  } catch (e) {
    openModal('Block Slots', `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`);
  }
}

function manualAssignSlot(blockId, slotNumber) {
  openModal(`Assign Slot ${slotNumber}`, `
    <div class="fg"><label>Container No.</label><input id="ms_container" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>
    <div class="fg"><label>Condition</label><select id="ms_condition"><option value="food_grade">Food Grade</option><option value="under_repair">Under Repair</option><option value="damaged">Damaged</option></select></div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Use this for containers already on-site with no matching booking — e.g. after a physical stock-take. Containers coming through Public Bookings should go through Survey/Allocation above instead, so their paperwork stays linked.</div>
    <button class="submit-btn" onclick="saveManualAssignSlot('${blockId}',${slotNumber})">Assign →</button>
  `);
}

async function saveManualAssignSlot(blockId, slotNumber) {
  const container = document.getElementById('ms_container').value.trim().toUpperCase();
  const condition = document.getElementById('ms_condition').value;
  const containerIssue = containerFormatIssue(container);
  if (containerIssue) { toast(`Container number: ${containerIssue}`, 'error'); return; }
  try {
    await window.bookingDocs.occupySlot({ blockId, slotNumber, container, conditionStatus: condition });
    toast(`${container} placed in slot ${slotNumber}`, 'success');
    showBlockSlotsModal(blockId);
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || 'Could not assign slot', 'error');
  }
}

async function releaseSlotFromGrid(blockId, slotNumber) {
  if (!confirm(`Release slot ${slotNumber}?`)) return;
  try {
    await window.bookingDocs.releaseSlotByNumber(blockId, slotNumber);
    toast('Slot released', 'success');
    showBlockSlotsModal(blockId);
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || 'Could not release slot', 'error');
  }
}

// ---------- Outward / repatriation ----------
function filterDepOpsOutward(status, btn) {
  _depOpsOutwardFilter = status;
  document.querySelectorAll('#depopsPanel-outward .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDepOpsOutward();
}

async function renderDepOpsOutward() {
  await renderDepOpsEligible();
  await renderDepOpsOutwardTrips();
  const container = document.getElementById('depopsOutwardQueue');
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const docs = await window.bookingDocs.outwardReviewQueue(_depOpsOutwardFilter);
    if (!docs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-label">No ${_depOpsOutwardFilter.replace(/_/g,' ')} release orders</div></div>`; return; }
    container.innerHTML = docs.map(d => depOpsDocCard(d, 'outward')).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

async function depOpsRepatriationEligibleBookings() {
  const { data, error } = await supabase
    .from('public_bookings')
    .select('*')
    .eq('status', 'imported')
    .eq('storage_status', 'allocated')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message || 'Could not load bookings');
  const outwardBookingIds = new Set(
    state.db.trips.filter(t => t.workType === 'Depot → Port' && t.bookingId).map(t => t.bookingId)
  );
  return (data || []).filter(b => !outwardBookingIds.has(b.id));
}

async function renderDepOpsEligible() {
  const wrap = document.getElementById('depopsEligibleList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const [bookings, zones] = await Promise.all([
      depOpsRepatriationEligibleBookings(),
      window.bookingDocs.storageAvailability(),
    ]);
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No depot-held containers awaiting repatriation</div></div>'; return; }
    const zoneMap = {}; zones.forEach(z => { zoneMap[z.id] = z.zone_name; });
    wrap.innerHTML = bookings.map(b => depOpsEligibleCard(b, zoneMap)).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsEligibleCard(b, zoneMap) {
  const zoneName = (b.storage_zone_id && zoneMap[b.storage_zone_id]) || 'Unknown zone';
  const portOptions = window.bookingDocs.PORT_LOCATIONS.map(p => `<option value="${sanitize(p)}">${sanitize(p)}</option>`).join('');
  const outwardTypeOptions = outwardTypeOptionsHtml();
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
    <div><strong>${sanitize(b.container) || 'No container on file'}</strong> <span style="font-size:11px;color:var(--text-3)">· ${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''}</span></div>
    <div style="font-size:10.5px;color:var(--text-3);margin-top:2px">Booking ${b.id.slice(0,8)} · Currently in ${sanitize(zoneName)}</div>
    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:end">
      <input type="number" id="depopsRelTeu-${b.id}" min="1" value="1" title="TEU to release from ${sanitize(zoneName)} once this container departs" style="width:64px;padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
      <select id="depopsDest-${b.id}" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">${portOptions}</select>
      <select id="depopsOutwardType-${b.id}" title="Outward type" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="">Outward type…</option>${outwardTypeOptions}</select>
      <button class="modal-btn primary" onclick="depOpsCreateOutwardFromBooking('${b.id}')">Create Outward Trip →</button>
    </div>
  </div>`;
}

async function depOpsCreateOutwardFromBooking(bookingId) {
  const teuEl = document.getElementById('depopsRelTeu-' + bookingId);
  const destEl = document.getElementById('depopsDest-' + bookingId);
  const outwardTypeEl = document.getElementById('depopsOutwardType-' + bookingId);
  const teu = teuEl ? parseInt(teuEl.value, 10) : 0;
  const dest = destEl ? destEl.value : '';
  const outwardType = outwardTypeEl ? outwardTypeEl.value : '';
  if (!teu || teu < 1) { toast('Enter a valid TEU amount', 'error'); return; }
  if (!OUTWARD_TYPES.includes(outwardType)) { toast('Select a status — Repat, Shipper or Sale Unit', 'error'); return; }

  const { data: booking, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) { toast('Booking not found', 'error'); return; }
  if (!booking.storage_zone_id) { toast('This booking has no recorded storage zone', 'error'); return; }

  const container = (booking.container || '').trim().toUpperCase() || `REPAT-${booking.id.slice(0,8)}`;
  const dupTrip = findLiveTripByContainer(container);
  if (dupTrip) { toast(`${container} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest})`, 'error'); return; }

  const trip = {
    id: uid('TRIP'), container, ctype: booking.cargo_type || '20ft Dry',
    workType: 'Depot → Port', outwardType, origin: 'Depot', dest,
    shippingLine: resolveBookingShippingLineId(booking), status: 'active', startTime: new Date().toISOString(),
    eta: new Date(Date.now() + 4*3600000).toISOString(), distance: 0, priority: 'Normal',
    notes: `Repatriation for booking #${booking.id}`, ref: `REPAT-${booking.id.slice(0,8)}`,
    truckId: null, driverId: null, containerImages: [], bookingId: booking.id,
    storageZoneId: booking.storage_zone_id, storageTeu: teu, storageReleased: false,
    _dirty: true,
  };
  state.db.trips.push(trip);
  scheduleSave();
  toast('Outward trip created — upload the release order next', 'success');
  renderDepOpsOutward();
  renderDepOpsStorageList();
  refreshAwaitingDispatchUI();
}

async function depOpsCreateManualOutward() {
  const containerEl = document.getElementById('depopsManualContainer');
  const zoneEl = document.getElementById('depopsManualZone');
  const teuEl = document.getElementById('depopsManualTeu');
  const destEl = document.getElementById('depopsManualDest');
  const lineEl = document.getElementById('depopsManualLine');
  const outwardTypeEl = document.getElementById('depopsManualOutwardType');
  const container = (containerEl.value || '').trim().toUpperCase();
  const zoneId = zoneEl.value;
  const teu = parseInt(teuEl.value, 10);
  const dest = destEl.value;
  const lineId = lineEl ? lineEl.value : '';
  const outwardType = outwardTypeEl ? outwardTypeEl.value : '';

  const containerIssue = containerFormatIssue(container);
  if (containerIssue) { toast(`Container number: ${containerIssue}`, 'error'); return; }
  if (!zoneId) { toast('Select a zone', 'error'); return; }
  if (!teu || teu < 1) { toast('Enter a valid TEU amount', 'error'); return; }
  if (!lineId) { toast('Select the shipping line — without it this container won\u2019t show up under any line\u2019s account', 'error'); return; }
  if (!OUTWARD_TYPES.includes(outwardType)) { toast('Select a status — Repat, Shipper or Sale Unit', 'error'); return; }
  const dupTrip = findLiveTripByContainer(container);
  if (dupTrip) { toast(`${container} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest})`, 'error'); return; }

  const trip = {
    id: uid('TRIP'), container, ctype: '20ft Dry', workType: 'Depot → Port', outwardType, origin: 'Depot', dest,
    shippingLine: lineId, status: 'active', startTime: new Date().toISOString(),
    eta: new Date(Date.now() + 4*3600000).toISOString(), distance: 0, priority: 'Normal',
    notes: 'Manually added repatriation container (no originating booking)', ref: `REPAT-${container}`,
    truckId: null, driverId: null, containerImages: [], bookingId: null,
    storageZoneId: zoneId, storageTeu: teu, storageReleased: false,
    _dirty: true,
  };
  state.db.trips.push(trip);
  scheduleSave();
  toast('Outward trip created — upload the release order next', 'success');
  containerEl.value = '';
  if (lineEl) lineEl.value = '';
  renderDepOpsOutward();
  refreshAwaitingDispatchUI();
}

async function renderDepOpsOutwardTrips() {
  const wrap = document.getElementById('depopsOutwardTripsList');
  const formWrap = document.getElementById('depopsManualForm');
  if (formWrap && !formWrap.dataset.loaded) {
    try {
      const zones = await window.bookingDocs.storageAvailability();
      const zoneOptions = zones.map(z => `<option value="${z.id}">${sanitize(z.zone_name)}</option>`).join('');
      const portOptions = window.bookingDocs.PORT_LOCATIONS.map(p => `<option value="${sanitize(p)}">${sanitize(p)}</option>`).join('');
      const lineOptions = state.db.shippingLines.filter(l=>l.active).map(l => `<option value="${l.id}">${sanitize(l.code)} — ${sanitize(l.name)}</option>`).join('');
      const outwardTypeOptions = outwardTypeOptionsHtml();
      formWrap.innerHTML = `<div class="panel" style="margin-bottom:14px">
        <div class="panel-head"><span class="panel-title">Add Outward Container Manually</span></div>
        <div style="padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;align-items:end">
          <div class="fg" style="margin:0"><label>Container No.</label><input id="depopsManualContainer" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>
          <div class="fg" style="margin:0"><label>Zone</label><select id="depopsManualZone"><option value="">Select…</option>${zoneOptions}</select></div>
          <div class="fg" style="margin:0"><label>TEU</label><input type="number" id="depopsManualTeu" min="1" value="1"></div>
          <div class="fg" style="margin:0"><label>Destination</label><select id="depopsManualDest">${portOptions}</select></div>
          <div class="fg" style="margin:0"><label>Shipping Line</label><select id="depopsManualLine"><option value="">Select…</option>${lineOptions}</select></div>
          <div class="fg" style="margin:0"><label>Outward Type</label><select id="depopsManualOutwardType"><option value="">Select…</option>${outwardTypeOptions}</select></div>
          <button class="modal-btn primary" onclick="depOpsCreateManualOutward()">Create →</button>
        </div>
      </div>`;
      formWrap.dataset.loaded = '1';
    } catch (e) { /* form is a nice-to-have; the eligible/queue lists still work without it */ }
  }

  if (!wrap) return;
  const allOut = state.db.trips.filter(t => t.workType === 'Depot → Port');
  const trips = allOut.map(t => [+new Date(t.startTime) || 0, t]).sort((a, b) => b[0] - a[0]).map(x => x[1])
    .slice(0, gxPageLimit('outTrips', 'all', 25, renderDepOpsOutwardTrips));   // PERF: newest 25; docs are looked up for those only (was one query with every trip id)
  if (!trips.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No outward/repatriation trips yet</div></div>'; return; }
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const docsByTrip = await window.bookingDocs.documentsForTrips(trips.map(t => t.id));
    wrap.innerHTML = trips.map(t => depOpsOutwardTripCard(t, docsByTrip[t.id] || [])).join('') + gxPageFooter('outTrips', trips.length, allOut.length);
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsOutwardTripCard(t, docs) {
  const doc = docs.find(d => d.doc_type === 'release_order');
  const docBlock = doc
    ? docStatusBadge(doc.status)
    : `<button class="modal-btn primary" onclick="depOpsUploadReleaseOrder('${t.id}','${sanitize(t.container)}')">Upload Release Order</button>`;
  const storageBlock = t.storageZoneId
    ? (t.storageReleased ? '<span class="sbadge s-approved">storage released</span>' : `<span class="sbadge s-pending">${t.storageTeu || '?'} TEU pending release</span>`)
    : '';
  const outwardTypeBlock = t.outwardType
    ? `<span style="font-size:10px;padding:2px 8px;border-radius:20px;border:1px solid var(--gold-border);color:var(--gold);background:var(--gold-dim)">${sanitize(outwardTypeLabel(t.outwardType))}</span>`
    : '';
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong class="mono" style="color:var(--gold)">${sanitize(t.container)}</strong>
        <div style="font-size:11px;color:var(--text-3)">${sanitize(t.origin)} → ${sanitize(t.dest)}</div>
        <div style="font-size:10px;color:var(--text-3)">${sanitize(t.ref)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${sbadge(t.status)}
        ${outwardTypeBlock}
        ${storageBlock}
      </div>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      ${docBlock}
      <button class="modal-btn ghost" onclick="showTripDetail('${t.id}')">View / Manage Trip</button>
    </div>
  </div>`;
}

function depOpsUploadReleaseOrder(tripId, container) {
  openModal('Upload Release Order', `
    <div class="fg"><label>Container</label><input value="${sanitize(container)}" disabled></div>
    <div class="fg"><label>Release Order File</label><input type="file" id="depopsReleaseFile" accept=".pdf,.jpg,.jpeg,.png"></div>
    <div id="depopsUploadMsg" style="font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <button class="submit-btn" onclick="depOpsConfirmUploadReleaseOrder('${tripId}','${sanitize(container).replace(/'/g,"\\'")}')">Upload</button>
  `);
}

async function depOpsConfirmUploadReleaseOrder(tripId, container) {
  const fileInput = document.getElementById('depopsReleaseFile');
  const msg = document.getElementById('depopsUploadMsg');
  const file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) { msg.textContent = 'Select a file first.'; msg.style.color = 'var(--red)'; return; }
  msg.textContent = 'Uploading…'; msg.style.color = 'var(--text-3)';
  try {
    await window.bookingDocs.uploadTripDocument({ tripId, docType: 'release_order', containerNo: container, file });
    msg.textContent = '✓ Uploaded'; msg.style.color = 'var(--green)';
    setTimeout(() => { closeModal(); renderDepOpsOutward(); }, 600);
  } catch (e) {
    msg.textContent = e.message || 'Upload failed'; msg.style.color = 'var(--red)';
  }
}

// ---------- Shared doc card + review actions (both tabs) ----------
function depOpsDocCard(doc, kind) {
  const parent = kind === 'inbound' ? (doc.public_bookings || {}) : (doc.trips || {});
  const ref = kind === 'inbound' ? (parent.full_name ? parent.full_name : (doc.booking_id || '').slice(0,8)) : (parent.container || (doc.trip_id || '').slice(0,8));
  const who = kind === 'inbound'
    ? [parent.company, parent.service_type].filter(Boolean).join(' · ') || 'Public booking'
    : `${sanitize(parent.origin || '')} → ${sanitize(parent.destination || '')}`;
  const label = DEPOPS_DOC_LABELS[doc.doc_type] || doc.doc_type;
  const status = doc.status || 'pending_review';
  const isPending = status === 'pending_review';

  const actions = isPending
    ? `<button class="modal-btn ghost" onclick="depOpsViewDoc('${doc.file_path.replace(/'/g,"\\'")}')">View / Download</button>
       <button class="modal-btn primary" onclick="depOpsVerifyDoc('${doc.id}','${kind}')">Verify</button>
       <button class="modal-btn danger" onclick="depOpsRejectDoc('${doc.id}','${kind}')">Reject…</button>`
    : `<button class="modal-btn ghost" onclick="depOpsViewDoc('${doc.file_path.replace(/'/g,"\\'")}')">View / Download</button>`;

  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)" id="depopsDoc-${doc.id}">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong>${sanitize(String(ref))}</strong>
        <div style="font-size:11px;color:var(--text-3)">${who}</div>
        <div style="font-size:10px;color:var(--text-3)">${doc.container_no ? 'Container: ' + sanitize(doc.container_no) + ' · ' : ''}Uploaded ${depOpsFmtDT(doc.uploaded_at)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <span style="font-size:10.5px;padding:3px 9px;border-radius:20px;background:rgba(201,162,39,0.12);color:var(--gold);border:1px solid var(--gold-border);white-space:nowrap">${sanitize(label)}</span>
        ${!isPending ? docStatusBadge(status) : ''}
      </div>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${actions}</div>
    ${!isPending && doc.review_notes ? `<div style="margin-top:8px;font-size:11px;color:var(--text-3)">${depOpsFmtDT(doc.reviewed_at)} — ${sanitize(doc.review_notes)}</div>` : ''}
  </div>`;
}

function depOpsViewDoc(filePath) {
  window.bookingDocs.getDownloadUrl(filePath, 300)
    .then(url => window.open(url, '_blank', 'noopener'))
    .catch(err => toast(err.message || 'Could not open document', 'error'));
}

async function depOpsVerifyDoc(docId, kind) {
  try {
    await window.bookingDocs.verifyDocument(docId, null);
    toast('Document verified', 'success');
    if (kind === 'inbound') renderDepOpsInbound(); else renderDepOpsOutward();
    updateDepOpsBadge();
  } catch (e) { toast(e.message || 'Could not verify document', 'error'); }
}

function depOpsRejectDoc(docId, kind) {
  openModal('Reject Document', `
    <div class="fg"><label>Reason (required — shown to the uploader)</label>
    <textarea id="depopsRejectNote" rows="3" placeholder="e.g. Scan is illegible, wrong container number…"></textarea></div>
    <button class="submit-btn" onclick="depOpsConfirmReject('${docId}','${kind}')">Confirm Reject</button>
  `);
}

async function depOpsConfirmReject(docId, kind) {
  const noteEl = document.getElementById('depopsRejectNote');
  const note = (noteEl && noteEl.value || '').trim();
  if (!note) { toast('A reason is required', 'error'); return; }
  try {
    await window.bookingDocs.rejectDocument(docId, note);
    closeModal();
    toast('Document rejected', 'warning');
    if (kind === 'inbound') renderDepOpsInbound(); else renderDepOpsOutward();
    updateDepOpsBadge();
  } catch (e) { toast(e.message || 'Could not reject document', 'error'); }
}


async function syncStorageToInterchange(bookingId, zoneId, blockId, slotNumber) {
  try {
    let zoneName = '', blockCode = '';
    const zones = await window.bookingDocs.listZones();
    const zone = zones.find(z => z.id === zoneId);
    zoneName = zone ? (zone.zone_code || zone.zone_name || '') : '';
    if (blockId) {
      const blocks = await window.bookingDocs.listBlocks(zoneId);
      const blk = blocks.find(x => x.id === blockId);
      blockCode = blk ? (blk.block_code || '') : '';
    }
    const patch = { storage_zone: zoneName || null, storage_block: blockCode || null, storage_slot: slotNumber ? String(slotNumber) : null };
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    const icId = survey && survey.interchange_id;
    let q = supabase.from('interchange').update(patch);
    q = icId ? q.eq('id', icId) : q.eq('booking_id', bookingId);
    const { error } = await q;
    if (error) { console.warn('Could not copy storage location to the EIR (run supabase_clerk_tools_migration.sql):', error.message); return; }
    (state.db.interchange || []).filter(i => (icId && i.id === icId) || i.bookingId === bookingId).forEach(i => {
      i.storageZone = zoneName; i.storageBlock = blockCode; i.storageSlot = slotNumber ? String(slotNumber) : '';
    });
  } catch (e) { console.warn('syncStorageToInterchange failed:', e); }
}