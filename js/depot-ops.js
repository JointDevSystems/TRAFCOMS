'use strict';

const OUTWARD_TYPES = ['Repatriation to Port', 'Shippers/Export', 'Sale units'];

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


let _inwardImg = '';

function renderInward() {
  populateInwardSelects();
  renderInwardRecent();
  renderInwardAwaitingSurvey();
  renderInwardStillInStorage();
  clearInwardForm(true);
}

function populateInwardSelects() {
  fillDatalist('iwTruckList',  state.db.trucks,  t=>t.reg);
  fillDatalist('iwDriverList', state.db.drivers, d=>d.name);
  fillSelect('iw_line',   state.db.shippingLines.filter(l=>l.active), l=>[l.id, `${l.code} — ${l.name}`]);
  populateSizeTypeSelects('iw_size', 'iw_type');
}

function renderInwardRecent() {
  const el   = document.getElementById('inwardRecentList');
  const meta = document.getElementById('inwardRecentMeta');
  if (!el) return;
  const items = state.db.interchange
    .filter(i => i.type === 'Gate-In' || i.type === 'Depot-In')
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  if (meta) meta.textContent = `${items.length} shown`;
  el.innerHTML = items.map(ic => `<div class="dispatch-queue-item" onclick="showSection('interchange', document.querySelector('[data-section=&quot;interchange&quot;]'))">
      <div class="dqi-ref">${esc(ic.container)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(ic.type)} · ${esc(lineName(ic.line))}</div>
        <div style="font-size:10px;color:var(--text-3)">${ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || '—')} · ${ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || '—')}</div>
      </div>
      ${sbadge(ic.status)}
      <div class="dqi-time">${timeAgo(ic.date)}</div>
      ${!ic.dateOut ? `<button class="modal-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="event.stopPropagation();quickDispatchOut('${ic.id}')">Quick Dispatch →</button>` : ''}
    </div>`).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No inward entries yet</div></div>';
}


function renderInwardStillInStorage() {
  const wrap = document.getElementById('inwardStillInStorageList');
  const meta = document.getElementById('inwardStillInStorageMeta');
  if (!wrap) return;
  const exitedContainers = new Set(
    state.db.interchange.filter(i => i.type === 'Gate-Out' || i.type === 'Depot-Out').map(i => i.container)
  );
  const items = state.db.interchange
    .filter(i => (i.type === 'Gate-In' || i.type === 'Depot-In') && !i.dateOut && !exitedContainers.has(i.container))
    .sort((a,b) => new Date(a.date) - new Date(b.date)); // oldest first

  if (meta) meta.textContent = items.length ? `${items.length} without a recorded exit` : '';
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Everything logged has a recorded exit</div></div>';
    return;
  }
  wrap.innerHTML = items.map(ic => `<div class="dispatch-queue-item">
      <div class="dqi-ref">${esc(ic.container)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(ic.ctype || '—')} · ${esc(lineName(ic.line))}</div>
        <div style="font-size:10px;color:var(--text-3)">In since ${fmtDate(ic.date)}${ic.notes==='Bulk import' ? ' · migrated record' : ''}</div>
      </div>
      <button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="quickDispatchOut('${ic.id}')">Quick Dispatch →</button>
    </div>`).join('');
}


async function renderInwardAwaitingSurvey() {
  const wrap = document.getElementById('inwardAwaitingSurveyList');
  const meta = document.getElementById('inwardAwaitingSurveyMeta');
  if (!wrap) return;

  const items = state.db.interchange
    .filter(i => i.surveyStatus === 'awaiting_survey')
    .sort((a,b) => new Date(a.date) - new Date(b.date)); // oldest first — the ones waiting longest surface first

  if (meta) meta.textContent = items.length ? `${items.length} waiting` : '';

  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Nothing awaiting survey</div></div>';
    return;
  }

  let docsByIc = {};
  try {
    if (window.bookingDocs) docsByIc = await window.bookingDocs.documentsForInterchanges(items.map(i => i.id));
  } catch (e) { /* guarantee-form status is best-effort — list still renders without it */ }

  wrap.innerHTML = items.map(ic => {
    const hasGuarantee = (docsByIc[ic.id] || []).some(d => d.doc_type === 'guarantee_form');
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
      <button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="markInwardSurveyed('${ic.id}')">Mark Surveyed →</button>
    </div>`;
  }).join('');
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

function switchInwardTab(tab, btn) {
  document.getElementById('inwardTabSingle').style.display = tab==='single' ? 'block' : 'none';
  document.getElementById('inwardTabBulk').style.display   = tab==='bulk'   ? 'block' : 'none';
  document.querySelectorAll('#sec-inward .filter-row .filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

async function createInwardEntry() {
  const cont = document.getElementById('iw_container').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }

  const type = document.getElementById('iw_type_movement').value;
  const dateInput = document.getElementById('iw_date').value;
  const dateVal = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();

  const dupIc = findDuplicateInterchange(cont, type, dateVal);
  if (dupIc) { toast(`${cont} already has a ${type} record logged on ${fmtDate(dateVal)}`, 'warning'); return; }


  const truckVal  = document.getElementById('iw_truck').value.trim();
  const driverVal = document.getElementById('iw_driver').value.trim();
  const truck  = truckVal  ? state.db.trucks.find(t => t.reg.toLowerCase()===truckVal.toLowerCase())   : null;
  const driver = driverVal ? state.db.drivers.find(d => d.name.toLowerCase()===driverVal.toLowerCase()) : null;

  const needsSurvey = !!document.getElementById('iw_needs_survey').checked;
  const guaranteeFile = _inwardGuaranteeFile;
  const icId = uid('IC');
  const ctype = composeCtype(document.getElementById('iw_size').value, document.getElementById('iw_type').value);
  const cargoStatusEl = document.getElementById('iw_cargo_status');

  state.db.interchange.push({
    id: icId, container: cont, type,
    ctype,
    line: document.getElementById('iw_line').value,
    condition: document.getElementById('iw_cond').value,
    truck:  truck  ? truck.id  : '',
    driver: driver ? driver.id : '',
    truckRegText:   truck  ? '' : sanitize(truckVal),
    driverNameText: driver ? '' : sanitize(driverVal),
    eirNumber: sanitize(document.getElementById('iw_eir').value.trim()),
    blNumber: sanitize(document.getElementById('iw_bl').value.trim()),
    vessel: sanitize(document.getElementById('iw_vessel').value.trim()),
    voyage: sanitize(document.getElementById('iw_voyage').value.trim()),
    deliveringParty: sanitize(document.getElementById('iw_delivering').value.trim()),
    guaranteeNo: sanitize(document.getElementById('iw_guarantee_no').value.trim()),
    cargoStatus: cargoStatusEl ? cargoStatusEl.value : '',
    repairs: [], repairTotal: 0,
    notes: sanitize(document.getElementById('iw_notes').value.trim()),
    date: dateVal, status: 'pending', img: _inwardImg || '',
    dateOut: null, receivingParty: '', releaseOrderNo: '',
    needsSurvey, surveyStatus: needsSurvey ? 'awaiting_survey' : null,
    surveyedAt: null, surveyedBy: null,
    _dirty: true,
  });
  buildBadges();
  addAudit(state.profile.username, 'Inward Entry Recorded', `${cont} (${type})${needsSurvey ? ' — sent to Awaiting Survey' : ''}`);
  refreshContainerHistory();
  toast(`Inward entry recorded — ${cont}`, 'success');
  clearInwardForm();
  renderInterchange('all');
  renderInwardRecent();
  renderInwardAwaitingSurvey();
  renderInwardStillInStorage();


  if (guaranteeFile) {
    try {
      await saveNowAwaited();
      await window.bookingDocs.uploadInterchangeDocument({ interchangeId: icId, docType: 'guarantee_form', containerNo: cont, file: guaranteeFile, autoVerify: true });
      toast('Guarantee form uploaded', 'success');
      renderInwardAwaitingSurvey();
    } catch (e) {
      toast(`Entry saved, but guarantee form upload failed: ${e.message || e}`, 'warning');
    }
  } else {
    scheduleSave();
  }
}

function clearInwardForm(skipRepopulate) {
  ['iw_container','iw_truck','iw_driver','iw_eir','iw_bl','iw_vessel','iw_voyage','iw_notes','iw_delivering','iw_guarantee_no'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const dateEl = document.getElementById('iw_date'); if (dateEl) dateEl.value = '';
  const typeEl = document.getElementById('iw_type_movement'); if (typeEl) typeEl.value = 'Gate-In';
  const condEl = document.getElementById('iw_cond'); if (condEl) condEl.value = 'Good';
  const cargoStatusEl = document.getElementById('iw_cargo_status'); if (cargoStatusEl) cargoStatusEl.value = '';
  const surveyEl = document.getElementById('iw_needs_survey'); if (surveyEl) surveyEl.checked = false;
  _inwardImg = '';
  const fileInput = document.getElementById('iw_img'); if (fileInput) fileInput.value = '';
  renderInwardImgPreview();
  clearInwardGuaranteeFile();
  if (!skipRepopulate) populateInwardSelects();
}

function previewInwardImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Not an image file', 'error'); return; }
  if (file.size > 2*1024*1024) { toast('Image too large — max 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => { _inwardImg = ev.target.result; renderInwardImgPreview(); };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderInwardImgPreview() {
  const wrap  = document.getElementById('inwardImgPreview');
  const label = document.getElementById('inwardImgLabel');
  if (!wrap) return;
  if (!_inwardImg) { wrap.style.display = 'none'; wrap.innerHTML=''; if (label) label.textContent = 'Upload container photo'; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `<div class="container-img-thumb"><img src="${_inwardImg}" /><button type="button" class="container-img-remove" onclick="clearInwardImg()" title="Remove">✕</button></div>`;
  if (label) label.textContent = '1 photo attached';
}

function clearInwardImg() {
  _inwardImg = '';
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
        const lines = e.target.result.split('\n').filter(l=>l.trim());
        const headers = lines[0].split(',').map(h=>h.trim());
        rows = lines.slice(1).map(l=>{ const vals=l.split(','); return Object.fromEntries(headers.map((h,i)=>[h,vals[i]?.trim()])); });
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

function processBulkInward() {
  const rows = JSON.parse(document.getElementById('inwardBulkPreview').dataset.rows || '[]');
  const direction = document.getElementById('iw_bulk_direction')?.value === 'out' ? 'out' : 'in';
  const VALID_TYPES = {
    'gatein':'Gate-In', 'gate-in':'Gate-In', 'depotin':'Depot-In', 'depot-in':'Depot-In',
    'gateout':'Gate-Out', 'gate-out':'Gate-Out', 'depotout':'Depot-Out', 'depot-out':'Depot-Out'
  };
  const defaultType = direction === 'out' ? 'Gate-Out' : 'Gate-In';
  const VALID_COND  = ['Good','Damaged','Dirty','Needs Repair'];

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

    const LINE_TEXT_ALIASES = { 'TERMCO': 'TMT' };
    const lineValResolved = LINE_TEXT_ALIASES[lineVal.toUpperCase()] || lineVal;

    let line = lineValResolved
      ? state.db.shippingLines.find(l => normVessel(l.code).toLowerCase()===normVessel(lineValResolved).toLowerCase() || normVessel(l.name).toLowerCase()===normVessel(lineValResolved).toLowerCase() || l.id===lineValResolved)
      : null;

    if (!line && vesselVal) {
      const guessedId = resolveLineIdFromVessel(vesselVal);
      if (guessedId) line = state.db.shippingLines.find(l => l.id === guessedId);
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

    const cargoStatusRaw = pickField(r, ['cargostatus']);
    const cargoStatus = CARGO_STATUS_OPTIONS.find(c => c.toLowerCase() === cargoStatusRaw.toLowerCase()) || sanitize(cargoStatusRaw);

    state.db.interchange.push({
      id: uid('IC'), container: cont, type, ctype,
      line: line ? line.id : '',
      condition,
      truck: truck ? truck.id : '', driver: driver ? driver.id : '',
      truckRegText: truck ? '' : sanitize(truckVal),
      driverNameText: driver ? '' : sanitize(driverVal),
      eirNumber: sanitize(pickField(r, ['eir','eirnumber','eirno','ineirno','outeirno','outeir','refinno','refoutno','inwardno'])),
      blNumber:  sanitize(pickField(r, ['bl','blnumber','blno'])),
      vessel:    sanitize(vesselVal),
      voyage:    sanitize(pickField(r, ['voyage','voy'])),
      deliveringParty: sanitize(pickField(r, ['deliveringparty','delivering','shipper'])),

      guaranteeNo:     sanitize(pickField(r, ['guaranteeno','guaranteenumber','guranteeformno','guaranteeformno'])),
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
  if (flagged.length) {
    toast(`${created} created — ${flagged.length} flagged for cleanup (see details)`, 'warning', 6000);
    openModal('Bulk Inward Entry Result', `<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${created} entry(ies) created successfully — all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (${flagged.length})</div><div style="max-height:240px;overflow-y:auto">${flagged.map(s=>`<div class="ops-notice" style="margin-bottom:6px">${esc(s)}</div>`).join('')}</div>`);
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
    type: outward ? (t.outwardType || 'Dispatch (Depot → Port)') : 'Inward (Port → Depot)',
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
  const fromTrips = state.db.trips
    .filter(t => isOutwardWorkType(t.workType))
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


function computeDepotReportDuplicates() {
  const all = state.db.interchange;

  const dayGroups = {};
  all.forEach(ic => {
    const key = `${(ic.container || '').toUpperCase()}::${ic.type}::${new Date(ic.date).toDateString()}`;
    (dayGroups[key] = dayGroups[key] || []).push(ic);
  });
  const exactDupes = Object.values(dayGroups)
    .filter(list => list.length > 1)
    .map(list => ({ kind: 'Same container, type & day', records: list, ids: list.map(i => i.id) }));

  _depotReportDupes = [...exactDupes];
  return _depotReportDupes;
}

function renderDepotReport() {
  populateDepotReportLineFilter();
  computeDepotReportDuplicates();

  const inward  = _depotReportInwardEntries();
  const outward = _depotReportOutwardEntries();
  const unmappedTotal = state.db.interchange.filter(ic => !ic.line).length
    + state.db.trips.filter(t => !t.shippingLine).length;

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
  </style></head><body><h2>Gargo Haven Depot — ${_depotReportTab === 'outward' ? 'Outward' : 'Inward'} Register</h2>
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
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
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
            ? `<span class="sbadge s-approved" title="Generated ${fmtDate(survey.interchange_generated_at)}">✓ Generated</span>${survey.interchange_id ? ` <button class="tbl-btn" onclick="downloadInterchangeSlip('${survey.interchange_id}')">⬇</button>` : ''}`
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
    ${b.service_type === 'Depot Storage' ? '<div style="margin-top:8px;font-size:11px;color:var(--text-3)">Importing will send this container to Awaiting Survey below.</div>' : ''}
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="modal-btn primary" onclick="importPublicBooking('${b.id}')">${b.service_type === 'Depot Storage' ? 'Confirm Into Storage →' : 'Import to Fleet →'}</button>
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

async function openSurveyModal(bookingId) {
  const { data: booking, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) { toast('Booking not found', 'error'); return; }
  const lineId = resolveBookingShippingLineId(booking);
  const lineOptions = state.db.shippingLines.map(l => `<option value="${l.id}" ${l.id === lineId ? 'selected' : ''}>${sanitize(l.code)} — ${sanitize(l.name)}</option>`).join('');
  const typeOptions = CONTAINER_TYPE_OPTIONS.map(t => `<option ${booking.cargo_type === t ? 'selected' : ''}>${t}</option>`).join('');
  _surveyImages = [];
  window._repairItems.sv = [];

  openModal(`Survey — ${sanitize(booking.container) || 'Container'}`, `
    <div class="form-row-2">
      <div class="fg"><label>Container No.</label><input id="sv_container" value="${sanitize(booking.container || '')}" oninput="markContainerValidity(this)"></div>
      <div class="fg"><label>Type / Size</label><select id="sv_ctype">${typeOptions}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Shipping Line</label><select id="sv_line"><option value="">—</option>${lineOptions}</select></div>
      <div class="fg"><label>Consignee</label><input id="sv_consignee" value="${sanitize(booking.company || booking.full_name || '')}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Guarantee / B/L Number</label><input id="sv_bl"></div>
      <div class="fg"><label>EIR / Reference No.</label><input id="sv_eir" placeholder="Transporter's own EIR no."></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Vessel</label><input id="sv_vessel"></div>
      <div class="fg"><label>Voyage</label><input id="sv_voyage"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Transporter</label><input id="sv_transporter"></div>
      <div class="fg"><label>ISO Code</label><input id="sv_iso" placeholder="e.g. 22G1"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Max Gross Weight — MGW (kg)</label><input id="sv_mgwt" type="number"></div>
      <div class="fg"><label>Tare Weight — TW (kg)</label><input id="sv_tare" type="number"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Vehicle / Truck No.</label><input id="sv_truck"></div>
      <div class="fg"><label>Trailer Number</label><input id="sv_trailer"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Driver Name</label><input id="sv_driver"></div>
      <div class="fg"><label>Driver ID Number</label><input id="sv_driver_id"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Surveyed By</label><input id="sv_clerk" value="${sanitize((state.profile && state.profile.name) || '')}"></div>
      <div class="fg"><label>Seal Number</label><input id="sv_seal"></div>
    </div>
    <div class="fg"><label>Gate Pass No.</label><input id="sv_gatepass"></div>

    <div class="fg"><label>Overall Condition</label><select id="sv_condition" onchange="onSurveyConditionChange()">
      <option value="full_grade">Full Grade</option>
      <option value="under_repair">Under Repair</option>
      <option value="damaged">Damaged</option>
      <option value="heavily_damaged">Heavily Damaged — requires joint survey</option>
    </select></div>
    <div id="sv_heavily_damaged_note" style="display:none;margin-bottom:10px" class="ops-notice">
      This container will be sent to <b>Escalations</b> and cannot be allocated to storage until a second surveyor records a joint finding.
    </div>

    ${tariffPickerHtml('sv')}

    <div class="fg"><label>Survey Photos</label><input type="file" id="sv_images" accept="image/*" multiple onchange="onSurveyImagesSelected(event)"><div id="sv_images_preview" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div></div>
    <div class="fg"><label>Remarks</label><textarea id="sv_remarks" rows="3" placeholder="Damage notes, discrepancies, etc."></textarea></div>
    <button class="submit-btn" onclick="saveSurvey('${bookingId}')">Save Survey →</button>
  `);
  const svContEl = document.getElementById('sv_container');
  if (svContEl) markContainerValidity(svContEl);
  renderRepairItemsList('sv');
}

function onSurveyConditionChange() {
  const el = document.getElementById('sv_condition');
  const note = document.getElementById('sv_heavily_damaged_note');
  if (note) note.style.display = (el && el.value === 'heavily_damaged') ? 'block' : 'none';
}

function onSurveyImagesSelected(e) {
  const files = Array.from(e.target.files || []).slice(0, 6);
  const preview = document.getElementById('sv_images_preview');
  preview.innerHTML = '';
  _surveyImages = [];
  files.forEach(file => {
    if (file.size > 2*1024*1024) { toast(`${file.name} skipped — max 2MB per photo`, 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      _surveyImages.push(reader.result);
      const img = document.createElement('img');
      img.src = reader.result;
      img.style.cssText = 'width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

async function saveSurvey(bookingId) {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const container = val('sv_container').toUpperCase();
  if (container) {
    const containerIssue = containerFormatIssue(container);
    if (containerIssue) { toast(`Container number: ${containerIssue}`, 'error'); return; }
  }
  const repairItems = repairItemsFor('sv');
  try {
    const survey = await window.bookingDocs.recordSurvey({
      bookingId,
      container,
      containerType: val('sv_ctype'),
      containerSize: val('sv_ctype'),
      shippingLineId: val('sv_line') || null,
      consignee: val('sv_consignee'),
      blNumber: val('sv_bl'),
      eirNumber: val('sv_eir'),
      isoCode: val('sv_iso'),
      mgwt: val('sv_mgwt') ? parseFloat(val('sv_mgwt')) : null,
      tareWeight: val('sv_tare') ? parseFloat(val('sv_tare')) : null,
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
      conditionStatus: val('sv_condition') || 'full_grade',
      remarks: val('sv_remarks'),
      photos: _surveyImages,
      tariffItems: repairItems,
    });
    const heavy = val('sv_condition') === 'heavily_damaged';


    if (!heavy && bookingId && survey && survey.id) {
      await generateInterchangeFromSurvey(bookingId, survey.id);
    }

    toast(heavy ? 'Survey saved — escalated for joint survey' : 'Survey saved', heavy ? 'warning' : 'success');
    closeModal();
    renderDepOpsAwaitingSurvey();
    renderDepOpsAllocationQueue();
    renderDepOpsStorageList();
    if (typeof renderDepOpsEscalations === 'function') renderDepOpsEscalations();
  } catch (e) {
    toast(e.message || 'Could not save survey', 'error');
  }
}

async function generateInterchangeFromSurvey(bookingId, surveyId) {
  try {
    const { data: booking } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
    if (!booking) { toast('Booking not found for this container', 'error'); return; }
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    if (!survey) { toast('No survey found for this container', 'error'); return; }
    if (survey.interchange_generated_at) { return; }
    const conditionMap = { full_grade: 'Good', under_repair: 'Needs Repair', damaged: 'Damaged', heavily_damaged: 'Damaged' };
    const matchedTruck = state.db.trucks.find(t => (t.reg || '').toUpperCase() === (survey.truck_reg || '').toUpperCase());
    const matchedDriver = state.db.drivers.find(d => (d.name || '').toLowerCase() === (survey.driver_name || '').toLowerCase());


    let storageLocation = '—';
    if (booking.storage_status === 'allocated') {
      try {
        const zones = await window.bookingDocs.listZones();
        const zone = zones.find(z => z.id === booking.storage_zone_id);
        storageLocation = [
          zone ? (zone.zone_code || zone.zone_name) : null,
          booking.storage_block_id ? `Block ${booking.storage_block_id}` : null,
          booking.storage_slot_number ? `Slot ${booking.storage_slot_number}` : null,
        ].filter(Boolean).join(' · ') || '—';
      } catch (e) { /* storage location is a nice-to-have on the slip, never blocks generation */ }
    }

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
      eirNumber: survey.eir_number || '',
      repairs: survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : (survey.tariff_code ? [{ category: survey.tariff_category, code: survey.tariff_code, side: survey.tariff_side, item: survey.tariff_item, hours: survey.tariff_hours, material: survey.tariff_material }] : []),
      repairTotal: repairItemsTotal(survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : (survey.tariff_code ? [{ hours: survey.tariff_hours, material: survey.tariff_material }] : [])),
      notes: sanitize(`Auto-generated from survey · Clerk: ${survey.clerk_name || '—'} · Transporter: ${survey.transporter || '—'}${!matchedTruck && survey.truck_reg ? ' · Truck: ' + survey.truck_reg : ''}${!matchedDriver && survey.driver_name ? ' · Driver: ' + survey.driver_name : ''} · Storage: ${storageLocation}`),
      date: new Date().toISOString(),
      status: 'pending',
      img: (survey.photos && survey.photos[0]) || '',
      surveyId: survey.id,
      bookingId: bookingId || null,
      truckRegText: !matchedTruck ? (survey.truck_reg || '') : '',
      driverNameText: !matchedDriver ? (survey.driver_name || '') : '',
      _dirty: true,
    };
    state.db.interchange.push(icRecord);
    scheduleSave(); buildBadges();
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
      <option value="full_grade">Full Grade — original finding overturned</option>
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
      await generateInterchangeFromSurvey(bookingId, surveyId);
    }

    toast(reject ? 'Container rejected' : 'Joint survey recorded — interchange generated', reject ? 'warning' : 'success');
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
            ${slots.map(s => `<div title="Slot ${s.slot_number}${s.container ? ' — ' + sanitize(s.container) : ''} (${s.condition_status})" class="yard-slot yard-slot-${s.condition_status}"></div>`).join('')}
          </div>
          ${overLimit ? `<div style="font-size:10.5px;color:var(--red,#ef4444);margin-top:4px">⚠ Occupancy exceeds declared capacity — review against KMA §6.1 (85% max occupancy)</div>` : ''}
        </div>`;
      }
      html += `</div></div>`;
    }
    html += `<div class="panel"><div class="panel-head"><span class="panel-title">Legend</span></div><div style="padding:10px 14px;display:flex;gap:14px;flex-wrap:wrap;font-size:11px">
      <span><span class="yard-slot yard-slot-empty" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Empty</span>
      <span><span class="yard-slot yard-slot-full_grade" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Full Grade</span>
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
        <td style="padding:6px 8px">${sbadge(s.condition_status === 'heavily_damaged' ? 'rejected' : (s.condition_status === 'full_grade' ? 'approved' : 'pending'))} ${sanitize((s.condition_status||'').replace(/_/g,' '))}</td>
        <td style="padding:6px 8px">${s.interchange_generated_at ? `✓ Generated${s.interchange_id ? ` <button class="tbl-btn" onclick="downloadInterchangeSlip('${s.interchange_id}')">⬇</button>` : ''}` : '—'}</td>
        <td style="padding:6px 8px"><button class="tbl-btn" onclick="downloadInspectionReport('${s.id}')">⬇ Report</button></td>
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
  </style></head><body><h2>Gargo Haven Depot — Surveyed Containers</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')}</div>${table.outerHTML}</body></html>`);
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
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v==null?'':v).replace(/"/g,'""')}"`).join(',')).join('\n');
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
          <td style="padding:6px 8px">${s ? sanitize((s.condition_status||'').replace(/_/g,' ')) : '—'}</td>
          <td style="padding:6px 8px">${loc}</td>
          <td style="padding:6px 8px">${s && s.interchange_generated_at ? `✓${s.interchange_id ? ` <button class="tbl-btn" onclick="downloadInterchangeSlip('${s.interchange_id}')">⬇</button>` : ''}` : '—'}</td>
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

 
  let rows = [
    ...(state.db.interchange || []).map(i => ({ ...i, _reportSource: 'interchange' })),
    ...(state.db.trips || []).map(_tripToInterchangeReportRow),
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
      <td class="mono">${ic.repairTotal ? fmtKsh(ic.repairTotal) : '—'}</td>
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
        ${reportRow('Repair Costs Total', fmtKsh(repairTotal))}
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
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
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
    <div class="fg"><label>Condition</label><select id="ms_condition"><option value="full_grade">Full Grade</option><option value="under_repair">Under Repair</option><option value="damaged">Damaged</option></select></div>
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
  const outwardTypeOptions = OUTWARD_TYPES.map(w => `<option value="${sanitize(w)}">${sanitize(w)}</option>`).join('');
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
  if (!OUTWARD_TYPES.includes(outwardType)) { toast('Select an outward type — Repatriation to Port, Shippers/Export, or Sale units', 'error'); return; }

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
  if (!OUTWARD_TYPES.includes(outwardType)) { toast('Select an outward type — Repatriation to Port, Shippers/Export, or Sale units', 'error'); return; }
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
      const outwardTypeOptions = OUTWARD_TYPES.map(w => `<option value="${sanitize(w)}">${sanitize(w)}</option>`).join('');
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
  const trips = state.db.trips.filter(t => t.workType === 'Depot → Port');
  if (!trips.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No outward/repatriation trips yet</div></div>'; return; }
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const docsByTrip = await window.bookingDocs.documentsForTrips(trips.map(t => t.id));
    wrap.innerHTML = trips.map(t => depOpsOutwardTripCard(t, docsByTrip[t.id] || [])).join('');
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
    ? `<span style="font-size:10px;padding:2px 8px;border-radius:20px;border:1px solid var(--gold-border);color:var(--gold);background:var(--gold-dim)">${sanitize(t.outwardType)}</span>`
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