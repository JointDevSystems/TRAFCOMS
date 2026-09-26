'use strict';


function lineToRow(l)  { return { id:l.id, code:l.code, name:l.name, contact:l.contact, rate_20ft:l.rate20, rate_40ft:l.rate40, rate_hc:l.rateHC, currency:l.currency||'USD', active:l.active }; }

function lineFromRow(r){ return { id:r.id, code:r.code, name:r.name, contact:r.contact, rate20:r.rate_20ft, rate40:r.rate_40ft, rateHC:r.rate_hc, currency:r.currency||(r.code==='PIL'?'KES':'USD'), active:r.active }; }


function lineCurrencySymbol(l) { return (l.currency||'USD')==='KES' ? 'KSh' : (l.currency==='USD'?'US$':(l.currency||'US$')); }


function vlmFromRow(r){ return { id:r.id, pattern:r.pattern, matchType:r.match_type, lineId:r.line_id, priority:r.priority, source:r.source }; }

function shutoutToRow(s)  { return { id:s.id, container:s.container, vessel:s.vessel, voyage:s.voyage, line_id:s.line||null, date:s.date, status:s.status, reason:s.reason, truck_id:s.truckId||null, driver_id:s.driverId||null, notes:s.notes, img:s.img||'' }; }

function shutoutFromRow(r){ return { id:r.id, container:r.container, vessel:r.vessel, voyage:r.voyage, line:r.line_id, date:r.date, status:r.status, reason:r.reason, truckId:r.truck_id, driverId:r.driver_id, notes:r.notes, img:r.img||'' }; }

function icToRow(i)  { return { id:i.id, container:i.container, line_id:i.line||null, date:i.date, type:i.type, truck_id:i.truck||null, driver_id:i.driver||null, condition:i.condition, notes:i.notes, status:i.status, img:i.img||'', eir_number:i.eirNumber||null, vessel:i.vessel||null, voyage:i.voyage||null, bl_number:i.blNumber||null, ctype:i.ctype||null, repairs:JSON.stringify(i.repairs||[]), repair_total:i.repairTotal||0, survey_id:i.surveyId||null, booking_id:i.bookingId||null, truck_reg_text:i.truckRegText||null, driver_name_text:i.driverNameText||null, needs_survey:!!i.needsSurvey, survey_status:i.surveyStatus||null, surveyed_at:i.surveyedAt||null, surveyed_by:i.surveyedBy||null, delivering_party:i.deliveringParty||null, guarantee_no:i.guaranteeNo||null, cargo_status:i.cargoStatus||null, date_out:i.dateOut||null, receiving_party:i.receivingParty||null, release_order_no:i.releaseOrderNo||null, flagged_for_review:!!i.flaggedForReview, flag_reasons:JSON.stringify(i.flagReasons||[]), duplicate_of_id:i.duplicateOfId||null, import_batch_id:i.importBatchId||null }; }

function icFromRow(r){ let repairs=[]; try{ repairs = r.repairs ? (typeof r.repairs==='string' ? JSON.parse(r.repairs) : r.repairs) : []; }catch(e){ repairs=[]; } let flagReasons=[]; try{ flagReasons = r.flag_reasons ? (typeof r.flag_reasons==='string' ? JSON.parse(r.flag_reasons) : r.flag_reasons) : []; }catch(e){ flagReasons=[]; } return { id:r.id, container:r.container, line:r.line_id, date:r.date, type:r.type, truck:r.truck_id, driver:r.driver_id, condition:r.condition, notes:r.notes, status:r.status, img:r.img||'', eirNumber:r.eir_number||'', vessel:r.vessel||'', voyage:r.voyage||'', blNumber:r.bl_number||'', ctype:r.ctype||'', repairs, repairTotal:r.repair_total||0, surveyId:r.survey_id||null, bookingId:r.booking_id||null, truckRegText:r.truck_reg_text||'', driverNameText:r.driver_name_text||'', needsSurvey:!!r.needs_survey, surveyStatus:r.survey_status||null, surveyedAt:r.surveyed_at||null, surveyedBy:r.surveyed_by||null, deliveringParty:r.delivering_party||'', guaranteeNo:r.guarantee_no||'', cargoStatus:r.cargo_status||'', dateOut:r.date_out||null, receivingParty:r.receiving_party||'', releaseOrderNo:r.release_order_no||'', flaggedForReview:!!r.flagged_for_review, flagReasons, duplicateOfId:r.duplicate_of_id||null, importBatchId:r.import_batch_id||null }; }


function normVessel(v) { return (v || '').trim().toUpperCase().replace(/\s+/g, ' '); }


function resolveLineIdFromVessel(vesselText) {
  const v = normVessel(vesselText);
  if (!v) return null;
  const map = state.db.vesselLineMap || [];
  for (const m of map) {
    const p = normVessel(m.pattern);
    if (!p) continue;
    if (m.matchType === 'prefix'   && v.startsWith(p)) return m.lineId;
    if (m.matchType === 'contains' && v.includes(p))   return m.lineId;
    if (m.matchType === 'exact'    && v === p)          return m.lineId;
  }
  return null;
}


function findDuplicateInterchange(container, type, dateVal, excludeId) {
  const cont = (container || '').trim().toUpperCase();
  if (!cont || !type) return null;
  const day = new Date(dateVal || Date.now()).toDateString();
  return state.db.interchange.find(i =>
    i.id !== excludeId &&
    (i.container || '').toUpperCase() === cont &&
    i.type === type &&
    new Date(i.date).toDateString() === day
  ) || null;
}

function findLineByCode(code, excludeId) {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  return state.db.shippingLines.find(l => l.id !== excludeId && (l.code || '').toUpperCase() === c) || null;
}

let _pendingShutoutImg = { sh: '', dp: '' };

function captureShutoutPhoto(input, boxId, key) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2*1024*1024) { toast('Image too large — max 2MB', 'error'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    _pendingShutoutImg[key] = reader.result;
    const box = document.getElementById(boxId);
    if (box) box.innerHTML = `<img src="${reader.result}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" />`;
  };
  reader.readAsDataURL(file);
}

function shutoutPhotoPicker(key) {
  const boxId = `sh_photo_box_${key}`;
  const inputId = `sh_photo_input_${key}`;
  return `<div class="fg"><label>Photo <span class="label-optional">(optional)</span></label>
    <div id="${boxId}" class="ic-card-img-placeholder" style="width:100%;height:90px;cursor:pointer" onclick="document.getElementById('${inputId}').click()" title="Tap to add a photo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    </div>
    <input type="file" id="${inputId}" accept="image/*" capture="environment" style="display:none" onchange="captureShutoutPhoto(this,'${boxId}','${key}')"/>
  </div>`;
}

/* ── Shutouts tab ───────────────────────────────────────────────── */
function dpRenderShutoutTab(el, driver) {
  _pendingShutoutImg.dp = '';
  const mine = state.db.shutouts.filter(s=>s.driverId===driver.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">Report Shutout</div>
      <div class="form-card-body">
        <div class="fg"><label>Container No.</label><input id="dp_sh_cont" list="containerHistory" placeholder="MSCU1234566" oninput="markContainerValidity(this)"/></div>
        <div class="form-row-2">
          <div class="fg"><label>Vessel</label><input id="dp_sh_vessel" placeholder="MSC VESSEL NAME"/></div>
          <div class="fg"><label>Voyage No.</label><input id="dp_sh_voyage" placeholder="VA-001"/></div>
        </div>
        <div class="fg"><label>Shipping Line</label><select id="dp_sh_line">${state.db.shippingLines.map(l=>`<option value="${l.id}">${l.code}</option>`).join('')}</select></div>
        <div class="fg"><label>Reason</label><input id="dp_sh_reason" placeholder="Why was this shutout?"/></div>
        <div class="fg"><label>Notes</label><textarea id="dp_sh_notes" rows="2"></textarea></div>
        ${shutoutPhotoPicker('dp')}
        <button class="submit-btn" onclick="dpSaveShutout('${driver.id}')">Flag Shutout →</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Shutout Reports</span><span class="panel-meta">${mine.length}</span></div>
      <div>${mine.map(s=>`<div class="shutout-card"><div style="display:flex;gap:12px;align-items:flex-start">${shutoutPhotoThumb(s, `()=>renderDriverPortal()`)}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">${s.container}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${s.vessel} · Voyage ${s.voyage}</div></div>${sbadge(s.status)}</div><div style="font-size:11.5px;color:var(--text-2)">Reason: ${s.reason}</div></div></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No shutouts reported yet</div></div>'}</div>
    </div>
  `;
}

function dpSaveShutout(driverId) {
  const cont = document.getElementById('dp_sh_cont').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  if (!/^[A-Z0-9]{4,12}$/.test(cont)) { toast('Invalid container format', 'error'); return; }
  const driver = state.db.drivers.find(d=>d.id===driverId);
  state.db.shutouts.push({
    id: uid('SHT'), container: cont,
    line: document.getElementById('dp_sh_line').value,
    vessel: sanitize(document.getElementById('dp_sh_vessel').value.trim()),
    voyage: sanitize(document.getElementById('dp_sh_voyage').value.trim()),
    reason: sanitize(document.getElementById('dp_sh_reason').value.trim()),
    truckId: driver?.truckId||null, driverId,
    notes: sanitize(document.getElementById('dp_sh_notes').value.trim()),
    img: _pendingShutoutImg.dp || '',
    date: new Date().toISOString(), status:'open',
    _dirty: true,
  });
  _pendingShutoutImg.dp = '';
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Shutout Flagged (Driver)', cont);
  toast('Shutout flagged', 'success');
  renderDriverPortal();
}

let _shutoutFilter='all';

function filterShutout(f,btn){ _shutoutFilter=f; document.querySelectorAll('#sec-shutout .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderShutout(f); }

function shutoutPhotoThumb(s, afterFnCall) {
  return `<div class="ic-card-img-placeholder" style="cursor:pointer" onclick="event.stopPropagation();triggerImageUpload('shutouts','${s.id}','img',${afterFnCall})" title="${s.img ? 'Replace photo' : 'Upload container photo'}">${s.img ? `<img src="${s.img}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;cursor:zoom-in" onclick="event.stopPropagation();openPhotoLightbox('${s.img}')" />` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}</div>`;
}

function renderShutout(f){
  let items=f==='all'?state.db.shutouts:state.db.shutouts.filter(s=>s.status===f);
  const el=document.getElementById('shutoutList');
  if(!el) return;
  el.innerHTML=items.map(s=>`<div class="shutout-card"><div style="display:flex;gap:12px;align-items:flex-start">${shutoutPhotoThumb(s, `()=>renderShutout('${f}')`)}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">${s.container}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${s.vessel} · Voyage ${s.voyage}</div></div>${sbadge(s.status)}</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:6px">Reason: ${s.reason}</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--text-3)"><span>${fmtDate(s.date)}</span><span>${truckName(s.truckId)}</span></div>${s.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:6px;font-style:italic">${s.notes}</div>`:''}</div></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-label">No shutout records</div></div>';
}

function showAddShutoutModal() {
  _pendingShutoutImg.sh = '';
  openModal('Flag Shutout Container', `<div class="form-row-2"><div class="fg"><label>Container No.</label><input id="sh_cont" list="containerHistory" placeholder="MSCU1234566 — pick existing or type new" oninput="markContainerValidity(this)"/></div><div class="fg"><label>Shipping Line</label><select id="sh_line">${state.db.shippingLines.map(l=>`<option value="${l.id}">${l.code}</option>`).join('')}</select></div></div><div class="form-row-2"><div class="fg"><label>Vessel</label><input id="sh_vessel" placeholder="MSC VESSEL NAME"/></div><div class="fg"><label>Voyage No.</label><input id="sh_voyage" placeholder="VA-001"/></div></div><div class="fg"><label>Reason</label><input id="sh_reason" placeholder="Why was this shutout?"/></div><div class="form-row-2"><div class="fg"><label>Truck</label><select id="sh_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg}</option>`).join('')}</select></div><div class="fg"><label>Driver</label><select id="sh_driver">${state.db.drivers.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div></div><div class="fg"><label>Notes</label><textarea id="sh_notes" rows="2"></textarea></div>${shutoutPhotoPicker('sh')}<button class="submit-btn" onclick="saveShutout()">Flag Shutout →</button>`);
}

function saveShutout() {
  const cont = document.getElementById('sh_cont').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }
  const dupShutout = state.db.shutouts.find(s=>(s.container||'').toUpperCase()===cont && s.status==='open');
  if (dupShutout) { toast(`${cont} already has an open shutout record — resolve it before flagging again`, 'error'); return; }
  state.db.shutouts.push({
    id: uid('SHT'), container: cont,
    line: document.getElementById('sh_line').value,
    vessel: sanitize(document.getElementById('sh_vessel').value.trim()),
    voyage: sanitize(document.getElementById('sh_voyage').value.trim()),
    reason: sanitize(document.getElementById('sh_reason').value.trim()),
    truckId:  document.getElementById('sh_truck').value,
    driverId: document.getElementById('sh_driver').value,
    notes: sanitize(document.getElementById('sh_notes').value.trim()),
    img: _pendingShutoutImg.sh || '',
    date: new Date().toISOString(), status:'open',
    _dirty: true,
  });
  _pendingShutoutImg.sh = '';
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Shutout Flagged', cont);
  closeModal(); renderShutout('all');
  refreshContainerHistory();
  toast('Shutout flagged', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 17  INTERCHANGE
────────────────────────────────────────────────────────────────── */
let _icFilter='all';

function filterInterchange(f,btn){ _icFilter=f; document.querySelectorAll('#sec-interchange .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderInterchange(f); }

function renderInterchange(f){
  let items = f==='all' ? state.db.interchange
    : f==='flagged' ? state.db.interchange.filter(i=>i.flaggedForReview)
    : state.db.interchange.filter(i=>i.status===f);
  const el=document.getElementById('interchangeList');
  if(!el) return;
  // Same "already has a matching Gate-Out somewhere" logic as the Still In
  // Storage panel — computed once per render, not per card.
  const exitedContainers = new Set(
    state.db.interchange.filter(i => i.type === 'Gate-Out' || i.type === 'Depot-Out').map(i => i.container)
  );
  el.innerHTML=items.map(ic=>{
    const meta = [ic.eirNumber ? `EIR ${ic.eirNumber}` : null, (ic.vessel || ic.voyage) ? `${ic.vessel||'—'} / ${ic.voyage||'—'}` : null, ic.dateOut ? `Out ${fmtDate(ic.dateOut)}` : null].filter(Boolean).join(' · ');
    const repairBadge = (ic.repairs && ic.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${ic.repairs.length} damage item${ic.repairs.length>1?'s':''} · KSh ${Number(ic.repairTotal||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>` : '';
    const canQuickDispatch = (ic.type === 'Gate-In' || ic.type === 'Depot-In') && !ic.dateOut && !exitedContainers.has(ic.container);
    return `<div class="ic-card"><div class="ic-card-img-placeholder" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload('interchange','${ic.id}','img',()=>renderInterchange('${f}'))" title="Upload container photo">${ic.img?`<img src="${ic.img}" style="width:100%;height:100%;object-fit:cover" />`:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">${ic.container}</div>${sbadge(ic.status)}${ic.flaggedForReview?`<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${esc((ic.flagReasons||[]).join('; '))}">⚠ Flagged</span>`:''}</div><div style="font-size:11.5px;color:var(--text-2)">${ic.type} · ${lineName(ic.line)} · ${ic.condition}${ic.ctype ? ' · ' + ic.ctype : ''}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">${ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—')} · ${ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—')} · ${fmtDate(ic.date)}</div>${meta?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${meta}</div>`:''}${repairBadge}${ic.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${ic.notes}</div>`:''}</div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">${isAdmin() && ic.status==='pending'?`<button class="modal-btn success" onclick="approveInterchange('${ic.id}')">Approve</button>`:''}${canQuickDispatch?`<button class="modal-btn ghost" onclick="quickDispatchOut('${ic.id}')">Quick Dispatch →</button>`:''}<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${ic.id}')">⬇ Download</button>${ic.flaggedForReview?`<button class="modal-btn ghost" onclick="clearReviewFlag('interchange','${ic.id}')">✓ Mark Reviewed</button>`:''}${ic.surveyId?`<button class="modal-btn ghost" onclick="downloadInspectionReport('${ic.surveyId}')">⬇ Inspection Report</button>`:''}${(ic.surveyId || ic.img)?`<button class="modal-btn ghost" onclick="showContainerPhotos('${ic.id}')">📷 Photos</button>`:''}</div></div>`;
  }).join('')||'<div class="empty-state"><div class="empty-state-icon">🔄</div><div class="empty-state-label">No interchange records</div></div>';
}

async function showContainerPhotos(icId) {
  const ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Interchange record not found', 'error'); return; }
  openModal(`Photos — ${sanitize(ic.container) || 'Container'}`, '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');

  let photos = [];
  if (ic.surveyId) {
    let s = (_surveyRegisterData.find(x => x.id === ic.surveyId)) || _surveyLookupCache[ic.surveyId];
    if (!s) {
      try { s = await window.bookingDocs.surveyById(ic.surveyId); if (s) _surveyLookupCache[s.id] = s; } catch (e) { /* fall through to whatever we already have */ }
    }
    if (s && Array.isArray(s.photos)) photos = s.photos.slice();
  }

  if (ic.img && photos.indexOf(ic.img) === -1) photos.unshift(ic.img);

  const body = document.getElementById('modalBody');
  if (!body) return;
  if (!photos.length) {
    body.innerHTML = '<div class="empty-state"><div class="empty-state-label">No photos on file for this container</div></div>';
    return;
  }
  body.innerHTML = `
    <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${photos.length} photo${photos.length > 1 ? 's' : ''} on file${ic.surveyId ? ' · captured at survey' : ''} — tap to view full size</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${photos.map((src, i) =>
      `<img src="${src}" alt="Container photo ${i + 1}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid var(--border)" onclick="openPhotoLightbox(this.src)">`
    ).join('')}</div>`;
}

function printInterchangeList() {
  const items = _icFilter === 'all' ? state.db.interchange : state.db.interchange.filter(i => i.status === _icFilter);
  if (!items.length) { toast('Nothing to print yet', 'error'); return; }
  const rows = items.map(ic => `<tr>
    <td>${fmtDate(ic.date)}</td><td>${sanitize(ic.container || '—')}</td><td>${sanitize(ic.eirNumber || '—')}</td><td>${sanitize(ic.type || '—')}</td>
    <td>${sanitize(lineName(ic.line))}</td><td>${sanitize(ic.condition || '—')}</td>
    <td>${sanitize(truckName(ic.truck))}</td><td>${sanitize(driverName(ic.driver))}</td>
    <td>${ic.repairTotal ? 'KSh ' + Number(ic.repairTotal).toLocaleString(undefined,{minimumFractionDigits:2}) : '—'}</td><td>${sanitize((ic.status || '').toUpperCase())}</td>
  </tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Interchange Records</title><style>
    body{font-family:Arial,sans-serif;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}
    h2{margin-bottom:4px}
  </style></head><body><h2>Gargo Haven Depot — Interchange Records</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')} · Filter: ${_icFilter}</div>
  <table><thead><tr><th>Date</th><th>Container</th><th>EIR No.</th><th>Type</th><th>Line</th><th>Condition</th><th>Truck</th><th>Driver</th><th>Repair Cost</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function downloadInterchangeCSV() {
  const items = _icFilter === 'all' ? state.db.interchange : state.db.interchange.filter(i => i.status === _icFilter);
  if (!items.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'EIR No.', 'Type', 'Container Type', 'Shipping Line', 'Vessel', 'Voyage', 'Delivering Party', 'Guarantee No.', 'Cargo Status', 'Condition', 'Truck', 'Driver', 'Date Out', 'Receiving Party', 'Release Order No.', 'Repair Items', 'Repair Total', 'Status', 'Notes'];
  const rows = items.map(ic => [
    ic.date, ic.container, ic.eirNumber, ic.type, ic.ctype, lineName(ic.line), ic.vessel, ic.voyage, ic.deliveringParty, ic.guaranteeNo, ic.cargoStatus, ic.condition, truckName(ic.truck), driverName(ic.driver),
    ic.dateOut, ic.receivingParty, ic.releaseOrderNo,
    (ic.repairs || []).map(r => `${r.code} (${r.item})`).join('; '), ic.repairTotal || 0, ic.status, ic.notes,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `interchange-${_icFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}


function _icSourceTag(rec) {
  const base = /bulk import/i.test(rec.notes || '') || rec.truckRegText || rec.driverNameText ? 'Bulk' : 'Manual';
  return rec._reportSource === 'trips' ? `${base} · Trips` : base;
}

function approveInterchange(id) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const ic = state.db.interchange.find(i=>i.id===id);
  if (!ic) return;
  ic.status='approved';
  ic._dirty = true;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Interchange Approved', ic.container);
  renderInterchange(_icFilter);
  toast('Interchange approved', 'success');
}

function showAddInterchangeModal() {
  window._repairItems.ic = [];
  const typeOptions = CONTAINER_TYPE_OPTIONS.map(t => `<option>${t}</option>`).join('');
  openModal('Record Interchange', `<div class="form-row-2"><div class="fg"><label>Container No.</label><input id="ic_cont" list="containerHistory" placeholder="MSCU1234566 — pick existing or type new" oninput="markContainerValidity(this)"/></div><div class="fg"><label>Movement</label><select id="ic_type"><option>Gate-In</option><option>Gate-Out</option><option>Depot-In</option><option>Depot-Out</option></select></div></div><div class="form-row-2"><div class="fg"><label>Container Type/Size</label><select id="ic_ctype">${typeOptions}</select></div><div class="fg"><label>Shipping Line</label><select id="ic_line">${state.db.shippingLines.map(l=>`<option value="${l.id}">${l.code}</option>`).join('')}</select></div></div><div class="form-row-2"><div class="fg"><label>EIR / Reference No.</label><input id="ic_eir" placeholder="Transporter's own EIR no."/></div><div class="fg"><label>B/L Number</label><input id="ic_bl"/></div></div><div class="form-row-2"><div class="fg"><label>Vessel</label><input id="ic_vessel"/></div><div class="fg"><label>Voyage</label><input id="ic_voyage"/></div></div><div class="form-row-2"><div class="fg"><label>Truck</label><select id="ic_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg}</option>`).join('')}</select></div><div class="fg"><label>Driver</label><select id="ic_driver">${state.db.drivers.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div></div><div class="fg"><label>Overall Condition</label><select id="ic_cond"><option>Good</option><option>Damaged</option><option>Dirty</option><option>Needs Repair</option></select></div>${tariffPickerHtml('ic')}<div class="fg"><label>Notes</label><textarea id="ic_notes" rows="2" placeholder="Damage notes, remarks…"></textarea></div><button class="submit-btn" onclick="saveInterchange()">Record Interchange →</button>`);
  renderRepairItemsList('ic');
}

function saveInterchange() {
  const cont = document.getElementById('ic_cont').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }
  const dupIc = findDuplicateInterchange(cont, document.getElementById('ic_type').value, new Date().toISOString());
  if (dupIc) { toast(`${cont} already has a ${document.getElementById('ic_type').value} interchange record logged today`, 'warning'); return; }
  const repairs = window._repairItems.ic || [];
  state.db.interchange.push({
    id: uid('IC'), container: cont,
    type: document.getElementById('ic_type').value,
    ctype: document.getElementById('ic_ctype').value,
    line: document.getElementById('ic_line').value,
    condition: document.getElementById('ic_cond').value,
    truck:  document.getElementById('ic_truck').value,
    driver: document.getElementById('ic_driver').value,
    eirNumber: sanitize(document.getElementById('ic_eir').value.trim()),
    blNumber: sanitize(document.getElementById('ic_bl').value.trim()),
    vessel: sanitize(document.getElementById('ic_vessel').value.trim()),
    voyage: sanitize(document.getElementById('ic_voyage').value.trim()),
    repairs, repairTotal: repairItemsTotal(repairs),
    notes:  sanitize(document.getElementById('ic_notes').value.trim()),
    date: new Date().toISOString(), status:'pending', img:'',
    _dirty: true,
  });
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Interchange Recorded', cont);
  closeModal(); renderInterchange('all');
  refreshContainerHistory();
  toast('Interchange recorded', 'success');
}

function downloadInterchangeSlip(icId) {
  const ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Interchange record not found', 'error'); return; }
  if (!window.jspdf) { toast('PDF library still loading — try again in a moment', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const GOLD = [201, 162, 39];
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;


  function fieldBox(x, y, w, h, label, value) {
    doc.setDrawColor(150); doc.setLineWidth(0.25); doc.rect(x, y, w, h);
    doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); doc.setTextColor(120);
    doc.text(String(label).toUpperCase(), x + 2, y + 4.5);
    doc.setFont(undefined, 'bold'); doc.setFontSize(9.5); doc.setTextColor(20);
    const val = doc.splitTextToSize(String(value || '—'), w - 4);
    doc.text(val.slice(0, 2), x + 2, y + (h > 10 ? 10 : 9));
  }
  function sectionLabel(text, y) {
    doc.setFont(undefined, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GOLD);
    doc.text(text.toUpperCase(), MARGIN, y);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.line(MARGIN, y + 1.5, RIGHT, y + 1.5);
    doc.setTextColor(20);
  }

  // ---- header ----------------------------------------------------------
  doc.setFont(undefined, 'bold'); doc.setFontSize(15); doc.setTextColor(20);
  doc.text('GARGO HAVEN DEPOT LIMITED', MARGIN, 20);
  doc.setFont(undefined, 'italic'); doc.setFontSize(9.5); doc.setTextColor(...GOLD);
  doc.text('Container Interchange Report', MARGIN, 26.5);
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(120);
  doc.text('Mombasa, Kenya  ·  Generated automatically for reference only', MARGIN, 31.5);

  // Top-right stacked boxes, mirroring the "Inward Date / Inward IER" boxes
  // on the Dodwell form.
  fieldBox(140, 12, 28, 10, ic.type ? `${ic.type} Date` : 'Date', fmtDate(ic.date));
  fieldBox(168, 12, 28, 10, 'EIR / IER No.', ic.eirNumber || ic.id.slice(0, 8).toUpperCase());
  doc.setDrawColor(180); doc.setLineWidth(0.3); doc.line(MARGIN, 36, RIGHT, 36);

  // ---- field grid --------------------------------------------------------
  let y = 41;
  fieldBox(MARGIN, y, CONTENT_W, 11, 'Shipping Line', lineName(ic.line));
  y += 14;
  fieldBox(MARGIN, y, 62, 11, 'Container No.', ic.container);
  fieldBox(MARGIN + 65, y, 42, 11, 'Type / Size', ic.ctype);
  fieldBox(MARGIN + 110, y, 33, 11, 'Movement', ic.type);
  fieldBox(MARGIN + 146, y, 36, 11, 'Condition', (ic.condition || '—').toUpperCase());
  y += 14;
  fieldBox(MARGIN, y, 60, 11, 'Vessel Name', ic.vessel);
  fieldBox(MARGIN + 63, y, 40, 11, 'Voyage No.', ic.voyage);
  fieldBox(MARGIN + 106, y, 76, 11, 'B/L Number', ic.blNumber);
  y += 14;
  fieldBox(MARGIN, y, 92, 11, 'Party Delivering / Receiving', ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—'));
  fieldBox(MARGIN + 95, y, 42, 11, 'Vehicle No.', ic.truck ? truckName(ic.truck).split(' · ')[0] : (ic.truckRegText || '—'));
  fieldBox(MARGIN + 140, y, 42, 11, 'Driver', ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—'));
  y += 18;

  // ---- container diagram + damage legend --------------------------------
  sectionLabel('Container Inspection', y); y += 6;
  const diagX = MARGIN, diagY = y, diagW = 62, diagH = 38;
  const sideDefs = [
    { code: 'T', label: 'Top / Roof' }, { code: 'L', label: 'Left Side' },
    { code: 'R', label: 'Right Side' }, { code: 'F', label: 'Front' },
    { code: 'D', label: 'Rear / Door' }, { code: 'B', label: 'Floor / Bottom' },
  ];
  const repairs = ic.repairs || [];
  function sideMatches(sideText, code) {
    if (!sideText) return false;
    const s = String(sideText).toLowerCase();
    const map = { T: 'top|roof', L: 'left', R: 'right', F: 'front', D: 'rear|door', B: 'floor|bottom' };
    return new RegExp(map[code]).test(s);
  }
  const flagged = new Set(sideDefs.filter(sd => repairs.some(r => sideMatches(r.side, sd.code))).map(sd => sd.code));

  doc.setDrawColor(150); doc.setLineWidth(0.3); doc.rect(diagX, diagY, diagW, diagH);
  doc.setDrawColor(190); doc.line(diagX, diagY + diagH * 0.22, diagX + diagW, diagY + diagH * 0.22);
  doc.line(diagX, diagY + diagH * 0.78, diagX + diagW, diagY + diagH * 0.78);
  doc.line(diagX + diagW * 0.5, diagY, diagX + diagW * 0.5, diagY + diagH);
  const marks = [
    { code: 'T', x: diagX + diagW * 0.5, y: diagY + diagH * 0.11 },
    { code: 'F', x: diagX + diagW * 0.25, y: diagY + diagH * 0.5 },
    { code: 'D', x: diagX + diagW * 0.75, y: diagY + diagH * 0.5 },
    { code: 'B', x: diagX + diagW * 0.5, y: diagY + diagH * 0.89 },
  ];
  marks.forEach(m => {
    const isFlagged = flagged.has(m.code);
    doc.setDrawColor(isFlagged ? 200 : 160, isFlagged ? 40 : 160, isFlagged ? 40 : 160);
    doc.setFillColor(isFlagged ? 220 : 245, isFlagged ? 60 : 245, isFlagged ? 60 : 245);
    doc.circle(m.x, m.y, 3.4, 'FD');
    doc.setFont(undefined, 'bold'); doc.setFontSize(7);
    doc.setTextColor(isFlagged ? 255 : 90, isFlagged ? 255 : 90, isFlagged ? 255 : 90);
    doc.text(m.code, m.x, m.y + 1.3, { align: 'center' });
  });
  ['L', 'R'].forEach(code => {
    const isFlagged = flagged.has(code);
    const mx = code === 'L' ? diagX - 4.5 : diagX + diagW + 4.5;
    doc.setDrawColor(isFlagged ? 200 : 160, isFlagged ? 40 : 160, isFlagged ? 40 : 160);
    doc.setFillColor(isFlagged ? 220 : 245, isFlagged ? 60 : 245, isFlagged ? 60 : 245);
    doc.circle(mx, diagY + diagH * 0.5, 3.4, 'FD');
    doc.setFont(undefined, 'bold'); doc.setFontSize(7);
    doc.setTextColor(isFlagged ? 255 : 90, isFlagged ? 255 : 90, isFlagged ? 255 : 90);
    doc.text(code, mx, diagY + diagH * 0.5 + 1.3, { align: 'center' });
  });

  // legend beside the diagram
  doc.setTextColor(20);
  let lx = diagX + diagW + 14, ly = diagY + 3;
  doc.setFont(undefined, 'bold'); doc.setFontSize(7); doc.setTextColor(120);
  doc.text('LOCATION LEGEND', lx, ly); ly += 5;
  sideDefs.forEach(sd => {
    const isFlagged = flagged.has(sd.code);
    doc.setDrawColor(isFlagged ? 200 : 170, isFlagged ? 40 : 170, isFlagged ? 40 : 170);
    doc.setFillColor(isFlagged ? 220 : 255, isFlagged ? 60 : 255, isFlagged ? 60 : 255);
    doc.circle(lx + 1.6, ly - 1, 1.8, 'FD');
    doc.setFont(undefined, isFlagged ? 'bold' : 'normal'); doc.setFontSize(7.5);
    doc.setTextColor(isFlagged ? 160 : 60, isFlagged ? 30 : 60, isFlagged ? 30 : 60);
    doc.text(`${sd.code} — ${sd.label}${isFlagged ? '  (damage noted)' : ''}`, lx + 6, ly);
    ly += 5;
  });
  doc.setTextColor(20);
  y = diagY + diagH + 10;

  // ---- repair estimate table --------------------------------------------
  sectionLabel('Repair Estimate', y); y += 5;
  const cols = [
    { key: 'code', label: 'Code', x: MARGIN, w: 18 },
    { key: 'item', label: 'Description of Damage / Repair', x: MARGIN + 18, w: 92 },
    { key: 'side', label: 'Side', x: MARGIN + 110, w: 18 },
    { key: 'labour', label: 'Labour Cost', x: MARGIN + 128, w: 27 },
    { key: 'material', label: 'Material Cost', x: MARGIN + 155, w: 27 },
  ];
  doc.setDrawColor(150); doc.setLineWidth(0.25);
  doc.setFillColor(235, 235, 235);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'FD');
  cols.forEach(c => doc.rect(c.x, y, c.w, 7));
  doc.setFont(undefined, 'bold'); doc.setFontSize(7.5); doc.setTextColor(60);
  cols.forEach(c => doc.text(c.label, c.x + 1.5, y + 4.7));
  y += 7;

  doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(20);
  let repairTotal = 0;
  if (repairs.length) {
    repairs.forEach(r => {
      const hours = Number(r.hours || 0);
      const labour = hours * REPAIR_LABOUR_RATE_PER_HOUR;
      const material = Number(r.material || 0);
      repairTotal += labour + material;
      const lines = doc.splitTextToSize(r.item || '—', cols[1].w - 3);
      const rowH = Math.max(7, lines.length * 3.6 + 3);
      cols.forEach(c => doc.rect(c.x, y, c.w, rowH));
      doc.text(String(r.code || '—'), cols[0].x + 1.5, y + 4.6);
      doc.text(lines, cols[1].x + 1.5, y + 4.6);
      doc.text(String(r.side || '—'), cols[2].x + 1.5, y + 4.6);
      doc.text(labour.toLocaleString(undefined, { minimumFractionDigits: 2 }), cols[3].x + cols[3].w - 1.5, y + 4.6, { align: 'right' });
      doc.text(material.toLocaleString(undefined, { minimumFractionDigits: 2 }), cols[4].x + cols[4].w - 1.5, y + 4.6, { align: 'right' });
      y += rowH;
    });
  } else {
    doc.rect(MARGIN, y, CONTENT_W, 8);
    doc.setFont(undefined, 'italic'); doc.setTextColor(100);
    doc.text('Container received in good condition — no damage items recorded.', MARGIN + 2, y + 5.3);
    doc.setFont(undefined, 'normal'); doc.setTextColor(20);
    y += 8;
  }
  const total = Number(ic.repairTotal || repairTotal || repairItemsTotal(repairs) || 0);
  doc.setDrawColor(150); doc.rect(MARGIN, y, CONTENT_W - 34, 8);
  doc.rect(RIGHT - 34, y, 34, 8, 'S');
  doc.setFont(undefined, 'bold'); doc.setFontSize(8.5);
  doc.text('TOTAL (LABOUR + MATERIAL)', MARGIN + 2, y + 5.3);
  doc.text(`KSh ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, RIGHT - 2, y + 5.3, { align: 'right' });
  y += 14;

  // ---- inspection / remarks / signatures ---------------------------------
  if (y > 250) { doc.addPage(); y = 20; }
  fieldBox(MARGIN, y, 60, 11, 'Place of Inspection', 'Gargo Haven Depot, Mombasa');
  fieldBox(MARGIN + 63, y, 55, 11, 'Inspector Name', '');
  fieldBox(MARGIN + 121, y, 61, 11, 'Approval Date', '');
  y += 14;
  fieldBox(MARGIN, y, CONTENT_W, 16, 'Remarks', ic.notes || '');
  y += 24;

  doc.setDrawColor(180); doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 76, y); doc.line(RIGHT - 76, y, RIGHT, y);
  doc.setFont(undefined, 'normal'); doc.setFontSize(8.5); doc.setTextColor(110);
  doc.text('Depot Officer Signature', MARGIN, y + 5);
  doc.text('Driver / Transporter Signature', RIGHT - 76, y + 5);

  doc.setFontSize(7.5); doc.setTextColor(150);
  doc.text('This document confirms container delivery/receipt at Gargo Haven Depot and supports transporter payment processing.', MARGIN, 289);

  doc.save(`interchange-${(ic.container || ic.id).replace(/\s+/g, '')}.pdf`);
}

async function downloadInspectionReport(surveyId) {
  if (!surveyId) { toast('No survey on file for this record', 'error'); return; }
  let s = (_surveyRegisterData.find(x => x.id === surveyId)) || _surveyLookupCache[surveyId];
  if (!s) {

    s = await window.bookingDocs.surveyById(surveyId);
    if (s) _surveyLookupCache[s.id] = s;
  }
  if (!s) { toast('Survey record not found', 'error'); return; }
  if (!window.jspdf) { toast('PDF library still loading — try again in a moment', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const GREEN = [46, 125, 50], BLUE = [30, 64, 175], GOLD = [201, 162, 39];
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;

  function infoBox(x, y, w, h, fill) {
    doc.setFillColor(...fill); doc.setDrawColor(...fill);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
  }
  function kv(x, y, label, value, valueColor) {
    doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(90);
    doc.text(String(label).toUpperCase(), x, y);
    doc.setFont(undefined, 'bold'); doc.setFontSize(9.5); doc.setTextColor(...(valueColor || [20,20,20]));
    doc.text(String(value || '—'), x, y + 5);
    doc.setTextColor(20);
  }
  function sectionHeading(text, y) {
    doc.setFont(undefined, 'bold'); doc.setFontSize(10); doc.setTextColor(20);
    doc.text(text.toUpperCase(), MARGIN, y);
    doc.setDrawColor(20); doc.setLineWidth(0.5); doc.line(MARGIN, y + 1.5, RIGHT, y + 1.5);
  }
  function ensureSpace(y, needed) {
    if (y + needed > 282) { doc.addPage(); return 20; }
    return y;
  }

  const repairs = s.tariff_items || [];
  const damageTotal = repairs.reduce((sum, r) => sum + (Number(r.price) || Number(r.material) || (Number(r.hours||0) * REPAIR_LABOUR_RATE_PER_HOUR) || 0), 0);
  const now = new Date();
  const reportId = `REP-INS-${String(s.id).replace(/-/g,'').slice(0,8).toUpperCase()}`;

  // ---- header ----------------------------------------------------------
  doc.setFont(undefined, 'bold'); doc.setFontSize(13); doc.setTextColor(20);
  doc.text('GARGO HAVEN DEPOT Ltd', MARGIN, 18);
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(110);
  doc.text('Refinery Road, Changamwe, Mombasa. P.O. Box 3291 - 80100 GPO, MSA', MARGIN, 23.5);
  doc.text('Email: info@gargohavendepot.co.ke', MARGIN, 27.5);

  doc.setFont(undefined, 'bold'); doc.setFontSize(20); doc.setTextColor(20);
  doc.text('INSPECTION', RIGHT, 17, { align: 'right' });
  doc.setFont(undefined, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GOLD);
  doc.text(reportId, RIGHT, 23, { align: 'right' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(140);
  doc.text(now.toLocaleString('en-KE'), RIGHT, 27.5, { align: 'right' });

  doc.setDrawColor(20); doc.setLineWidth(0.6); doc.line(MARGIN, 31, RIGHT, 31);

  // ---- report information panel (green) --------------------------------
  let y = 37;
  infoBox(MARGIN, y, CONTENT_W, 18, [232, 245, 233]);
  kv(MARGIN + 4, y + 8, 'Report ID', reportId, GREEN);
  kv(MARGIN + 4, y + 15.5, 'Type', 'Container Inspection Report', GREEN);
  kv(MARGIN + 95, y + 8, 'Generated', fmtDate(now.toISOString()), GREEN);
  kv(MARGIN + 95, y + 15.5, 'Generated By', s.clerk_name || '—', GREEN);
  y += 24;

  // ---- title banner (blue) ---------------------------------------------
  infoBox(MARGIN, y, CONTENT_W, 10, [219, 234, 254]);
  doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE);
  doc.text('Container Inspection Report', MARGIN + 4, y + 6.7);
  doc.setTextColor(20);
  y += 16;

  // ---- inspection information --------------------------------------------
  sectionHeading('Inspection Information', y); y += 8;
  kv(MARGIN, y, 'Inspection ID', '#' + String(s.id).slice(0, 8).toUpperCase()); 
  kv(MARGIN + 63, y, 'Inspection Date', fmtDate(s.surveyed_at));
  kv(MARGIN + 126, y, 'Status', s.escalated ? 'Escalated' : 'Completed');
  y += 12;
  kv(MARGIN, y, 'Inspection Method', 'Manual');
  kv(MARGIN + 63, y, 'Overall Condition', (s.condition_status||'').replace(/_/g,' ').toUpperCase());
  kv(MARGIN + 126, y, 'Surveyed By', s.clerk_name || '—');
  y += 16;

  // ---- container information ---------------------------------------------
  sectionHeading('Container Information', y); y += 8;
  kv(MARGIN, y, 'Container Number', s.container);
  kv(MARGIN + 63, y, 'Container Type', s.container_type);
  kv(MARGIN + 126, y, 'ISO Code', s.iso_code);
  y += 12;
  kv(MARGIN, y, 'Customer / Consignee', s.consignee);
  kv(MARGIN + 63, y, 'Shipping Line', lineName(s.shipping_line_id));
  kv(MARGIN + 126, y, 'Vessel / Voyage', `${s.vessel || '—'} / ${s.voyage || '—'}`);
  y += 16;

  // ---- weight / safety plate ----------------------------------------------
  sectionHeading('Weight & Safety Plate', y); y += 8;
  kv(MARGIN, y, 'Max Gross Weight (MGW)', s.mgwt ? `${s.mgwt} kg` : '—');
  kv(MARGIN + 63, y, 'Tare Weight (TW)', s.tare_weight ? `${s.tare_weight} kg` : '—');
  kv(MARGIN + 126, y, 'Guarantee / B/L No.', s.bl_number);
  y += 16;

  // ---- transport / driver details -----------------------------------------
  sectionHeading('Transport & Driver Details', y); y += 8;
  kv(MARGIN, y, 'Vehicle / Truck No.', s.truck_reg);
  kv(MARGIN + 63, y, 'Trailer Number', s.trailer_number);
  kv(MARGIN + 126, y, 'Transporter', s.transporter);
  y += 12;
  kv(MARGIN, y, "Driver's Name", s.driver_name);
  kv(MARGIN + 63, y, 'Driver ID Number', s.driver_id_number);
  kv(MARGIN + 126, y, 'EIR Number', s.eir_number);
  y += 12;
  kv(MARGIN, y, 'Seal Number', s.seal_number);
  kv(MARGIN + 63, y, 'Gate Pass No.', s.gate_pass_number);
  y += 18;

  // ---- inspection results summary strip -----------------------------------
  y = ensureSpace(y, 24);
  const stripW = CONTENT_W / 3 - 3;
  [
    { label: 'DAMAGE REPORTS', value: String(repairs.length) },
    { label: 'EST. REPAIR COST', value: `KSh ${damageTotal.toLocaleString(undefined,{minimumFractionDigits:2})}` },
    { label: 'CONDITION', value: (s.condition_status||'').replace(/_/g,' ').toUpperCase() },
  ].forEach((box, i) => {
    const bx = MARGIN + i * (stripW + 4.5);
    doc.setDrawColor(210); doc.setLineWidth(0.3); doc.roundedRect(bx, y, stripW, 18, 1.5, 1.5, 'S');
    doc.setFont(undefined, 'bold'); doc.setFontSize(13); doc.setTextColor(20);
    doc.text(box.value, bx + stripW/2, y + 8, { align: 'center' });
    doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); doc.setTextColor(120);
    doc.text(box.label, bx + stripW/2, y + 14, { align: 'center' });
  });
  y += 26;

  // ---- inspector notes ------------------------------------------------------
  if (s.remarks) {
    y = ensureSpace(y, 20);
    sectionHeading('Inspector Notes', y); y += 7;
    doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.line(MARGIN, y - 3, MARGIN, y + 6);
    doc.setFillColor(245,245,245); doc.rect(MARGIN + 2, y - 4, CONTENT_W - 2, 12, 'F');
    doc.setFont(undefined, 'italic'); doc.setFontSize(8.5); doc.setTextColor(60);
    const lines = doc.splitTextToSize(s.remarks, CONTENT_W - 8);
    doc.text(lines.slice(0,2), MARGIN + 5, y + 1);
    doc.setTextColor(20);
    y += 16;
  }

  // ---- inspection photos ------------------------------------------------------
  const photos = Array.isArray(s.photos) ? s.photos : [];
  if (photos.length) {
    y = ensureSpace(y, 20);
    sectionHeading('Inspection Photos', y); y += 7;
    const cellW = (CONTENT_W - 8) / 3, cellH = 32;
    photos.slice(0, 9).forEach((src, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      if (row > 0 && row % 3 === 0 && col === 0) { doc.addPage(); y = 20; }
      const px = MARGIN + col * (cellW + 4);
      const py = y + (row % 3) * (cellH + 4);
      try {
        doc.addImage(src, undefined, px, py, cellW, cellH, undefined, 'FAST');
      } catch (e) { /* skip unreadable image */ }
      doc.setDrawColor(210); doc.rect(px, py, cellW, cellH, 'S');
    });
    y += Math.ceil(Math.min(photos.length, 9) / 3) * (cellH + 4) + 4;
  }

  // ---- damage reports ------------------------------------------------------
  y = ensureSpace(y, 20);
  sectionHeading(`Damage Reports (${repairs.length})`, y); y += 8;
  if (!repairs.length) {
    doc.setFont(undefined, 'italic'); doc.setFontSize(8.5); doc.setTextColor(100);
    doc.text('No damage items recorded for this container.', MARGIN, y);
    doc.setTextColor(20); y += 10;
  } else {
    repairs.forEach(r => {
      y = ensureSpace(y, 30);
      const price = Number(r.price) || Number(r.material) || (Number(r.hours||0) * REPAIR_LABOUR_RATE_PER_HOUR) || 0;
      doc.setDrawColor(210); doc.setLineWidth(0.3); doc.roundedRect(MARGIN, y, CONTENT_W, 26, 1.5, 1.5, 'S');
      doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(20);
      doc.text(`${r.item || r.category || 'Damage Item'}`, MARGIN + 3, y + 6);
      doc.setFillColor(219, 234, 254); doc.roundedRect(RIGHT - 24, y + 2.5, 20, 5, 1, 1, 'F');
      doc.setFont(undefined, 'bold'); doc.setFontSize(6.5); doc.setTextColor(...BLUE);
      doc.text('MINOR', RIGHT - 14, y + 6, { align: 'center' });
      doc.setTextColor(20);
      kv(MARGIN + 3, y + 15, 'Location', r.side || '—');
      kv(MARGIN + 63, y + 15, 'Damage / Repair Code', r.code || '—');
      kv(MARGIN + 126, y + 15, 'Tariff / Repair Price', `KSh ${price.toLocaleString(undefined,{minimumFractionDigits:2})}`, [200,60,60]);
      y += 30;
    });
  }

  // ---- certification ------------------------------------------------------
  y = ensureSpace(y, 40);
  doc.setDrawColor(20); doc.setLineWidth(0.5); doc.rect(MARGIN, y, CONTENT_W, 22);
  doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(20);
  doc.text('Certification', MARGIN + CONTENT_W/2, y + 7, { align: 'center' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(80);
  const certLines = doc.splitTextToSize('This inspection report was generated by GARGO HAVEN DEPOT Ltd and represents an accurate record of the container inspection performed.', CONTENT_W - 8);
  doc.text(certLines, MARGIN + CONTENT_W/2, y + 13, { align: 'center' });
  y += 30;

  doc.setDrawColor(150); doc.line(MARGIN, y, MARGIN + 70, y);
  doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(110);
  doc.text('Inspector Signature', MARGIN, y + 5);
  doc.setFontSize(7.5); doc.setTextColor(150);
  doc.text(`GARGO HAVEN DEPOT Ltd — Generated by ${s.clerk_name || 'system'} on ${now.toLocaleDateString('en-KE')}`, RIGHT, y + 5, { align: 'right' });

  doc.save(`inspection-report-${(s.container || s.id).replace(/\s+/g, '')}.pdf`);
}

let _linesFilter='all';

function filterLines(f,btn){ _linesFilter=f; document.querySelectorAll('#sec-shippinglines .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderLines(f); }

function renderLines(f){
  let lines=f==='all'?state.db.shippingLines:state.db.shippingLines.filter(l=>l.active);
  const unmappedTotal = (state.db.interchange||[]).filter(ic=>!ic.line).length;
  const summary=document.getElementById('linesSummary');
  if(summary){
    summary.innerHTML=`<div class="panel"><div class="panel-head"><span class="panel-title">Summary</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Lines</span><span class="fsr-val">${state.db.shippingLines.length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Active</span><span class="fsr-val">${state.db.shippingLines.filter(l=>l.active).length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Trips (all)</span><span class="fsr-val">${state.db.trips.length}</span></div>${unmappedTotal?`<div class="fuel-summary-row"><span class="fsr-label" style="color:var(--gold)">⚠ Interchange records with no line</span><span class="fsr-val">${unmappedTotal}</span></div>`:''}</div>`;
  }
  const unmappedBtn = document.getElementById('unmappedVesselsBtn');
  if (unmappedBtn) { unmappedBtn.style.display = unmappedTotal ? 'inline-flex' : 'none'; unmappedBtn.textContent = `⚠ Resolve Unmapped Vessels (${unmappedTotal})`; }
  const grid=document.getElementById('linesGrid');
  if(!grid) return;
  grid.innerHTML=lines.map(l=>{const cur=lineCurrencySymbol(l);return `<div class="line-card"><div class="line-code-badge">${l.code}</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${l.name}</div><div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${l.contact}</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><div class="ts">${cur} ${fmt(l.rate20)}<b>20ft Rate</b></div><div class="ts">${cur} ${fmt(l.rate40)}<b>40ft Rate</b></div><div class="ts">${cur} ${fmt(l.rateHC)}<b>HC Rate</b></div></div><div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">${sbadge(l.active?'active':'off_duty')}${canFinance()?`<button class="tbl-btn" onclick="showEditLineModal('${l.id}')">✎ Edit Rates</button>`:''}</div></div>`;}).join('')||'<div class="empty-state"><div class="empty-state-label">No shipping lines</div></div>';
}

function saveShippingLineEdit(id) {
  if (!canFinance()) { toast('Admin or Finance rights required', 'error'); return; }
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l) { toast('Shipping line not found', 'error'); return; }
  const code = document.getElementById('sle_code').value.trim().toUpperCase();
  const name = document.getElementById('sle_name').value.trim();
  if (!code || !name) { toast('Code and name required', 'error'); return; }
  if (code.length > 6) { toast('Code must be max 6 characters', 'error'); return; }
  const dupLine = findLineByCode(code, id);
  if (dupLine) { toast(`Code ${code} is already used by ${dupLine.name}`, 'error'); return; }
  l.code = code;
  l.name = name;
  l.contact = sanitize(document.getElementById('sle_email').value.trim());
  const officialSle = getOfficialLineRates(code);
  l.currency = document.getElementById('sle_currency') ? document.getElementById('sle_currency').value : (l.currency || officialSle.currency);
  l.rate20 = Math.max(0, parseInt(document.getElementById('sle_r20').value) || 0);
  l.rate40 = Math.max(0, parseInt(document.getElementById('sle_r40').value) || 0);
  l.rateHC = Math.max(0, parseInt(document.getElementById('sle_rhc').value) || 0);
  l.active = document.getElementById('sle_active').value === 'true';
  scheduleSave(); closeModal(); renderLines(_linesFilter);
  const symE = lineCurrencySymbol(l);
  addAudit(state.profile.username, 'Shipping Line Rates Updated', `${code} — 20ft ${symE} ${fmt(l.rate20)} · 40ft ${symE} ${fmt(l.rate40)} · HC ${symE} ${fmt(l.rateHC)}`);
  toast(`${code} rates updated`, 'success');
}

function saveShippingLine() {
  const code = document.getElementById('sl_code').value.trim().toUpperCase();
  const name = document.getElementById('sl_name').value.trim();
  if (!code||!name) { toast('Code and name required', 'error'); return; }
  if (code.length > 6) { toast('Code must be max 6 characters', 'error'); return; }
  const dupLine = findLineByCode(code);
  if (dupLine) { toast(`Code ${code} is already used by ${dupLine.name}`, 'error'); return; }
  // Defaults come straight from the official service rate schedule — no
  // placeholder numbers, and no currency conversion (a line quoted in cash,
  // like PIL, stays in KES; everything else stays in USD as the schedule has it).
  const official = getOfficialLineRates(code);
  const currencyField = document.getElementById('sl_currency');
  state.db.shippingLines.push({
    id: uid('SL'), code, name,
    contact: sanitize(document.getElementById('sl_email').value.trim()),
    currency: currencyField ? currencyField.value : official.currency,
    rate20: Math.max(0, parseInt(document.getElementById('sl_r20').value)) || official.rate20,
    rate40: Math.max(0, parseInt(document.getElementById('sl_r40').value)) || official.rate40,
    rateHC: Math.max(0, parseInt(document.getElementById('sl_rhc').value)) || official.rateHC,
    active: true,
  });
  scheduleSave(); closeModal(); renderLines('all');
  toast(`${code} added`, 'success');
}


const UNRESOLVABLE_VESSEL_VALUES = new Set(['', 'N/A', 'NA', 'N.A', 'N./A', 'N\\A', 'TBA', 'T.B.A', 'TO BE ADVISED', 'NOT CAPTURED', 'DUMMY', 'EMPTY DUMMY', 'EMPTY DUMMY VESSEL', 'N']);

function _unmappedVesselGroups() {
  const groups = {};
  (state.db.interchange || []).forEach(ic => {
    if (ic.line) return;
    const norm = normVessel(ic.vessel);
    if (UNRESOLVABLE_VESSEL_VALUES.has(norm)) return;
    (groups[norm] = groups[norm] || { vessel: norm, count: 0, ids: [] });
    groups[norm].count++;
    groups[norm].ids.push(ic.id);
  });
  return Object.values(groups).sort((a, b) => b.count - a.count);
}

async function assignVesselToLine(idx) {
  const group = (window._uvmGroups || [])[idx];
  const sel = document.getElementById(`uvm_sel_${idx}`);
  const lineId = sel ? sel.value : '';
  if (!group) return;
  if (!lineId) { toast('Choose a shipping line first', 'error'); return; }
  const line = state.db.shippingLines.find(l => l.id === lineId);
  if (!line) { toast('Shipping line not found', 'error'); return; }

  const row = document.getElementById(`uvm_row_${idx}`);
  const btn = row ? row.querySelector('button') : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Assigning…'; }

  try {

    const { error } = await supabase.from('interchange')
      .update({ line_id: lineId })
      .is('line_id', null)
      .in('id', group.ids);
    if (error) throw error;


    const { data: inserted, error: mapErr } = await supabase.from('vessel_line_map')
      .insert({ pattern: group.vessel, match_type: 'exact', line_id: lineId, priority: 100, source: 'manual', created_by: state.profile?.username || null })
      .select('*').single();
    if (!mapErr && inserted) state.db.vesselLineMap.push(vlmFromRow(inserted));

    // Reflect it locally without a full reload.
    const idSet = new Set(group.ids);
    state.db.interchange.forEach(ic => { if (idSet.has(ic.id)) ic.line = lineId; });

    addAudit(state.profile.username, 'Shipping Line Backfilled', `${group.count} record(s) with vessel "${group.vessel}" → ${line.code}`);
    toast(`${group.count} record(s) assigned to ${line.code}`, 'success');

    if (row) row.remove();
    buildBadges();
    renderLines(_linesFilter);
    if (document.getElementById('sec-depotreport')?.classList.contains('active')) renderDepotReport();
    if (document.getElementById('sec-depops')?.classList.contains('active')) renderDepOpsReports();
  } catch (e) {
    console.error('assignVesselToLine failed:', e);
    toast('Could not save — try again', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Assign →'; }
  }
}

function showContainerDetail(contRaw) {
  const cont = (contRaw||'').trim().toUpperCase();
  const db = state.db;
  const trips = db.trips.filter(t=>(t.container||'').toUpperCase()===cont).sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  const shutouts = db.shutouts.filter(s=>(s.container||'').toUpperCase()===cont).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const interchange = db.interchange.filter(i=>(i.container||'').toUpperCase()===cont).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const liveTrip = trips.find(isTripLive) || null;

  if (!trips.length && !shutouts.length && !interchange.length) {
    openModal(`Container — ${cont}`, `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-label">No records found for ${cont}</div></div>`);
    return;
  }

  const summary = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">
    <div class="mono" style="font-size:18px;color:var(--gold);font-weight:700">${cont}</div>
    ${liveTrip ? sbadge(liveTrip.status) : '<span style="font-size:11px;color:var(--text-3)">No active trip</span>'}
  </div>`;

  const tripsHtml = `<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip History (${trips.length})</div>` + (
    trips.length ? trips.map(t=>`<div class="activity-row" style="cursor:pointer" onclick="closeModal();showTripDetail('${t.id}')"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">${t.origin} → ${t.dest}</div><div style="font-size:10px;color:var(--text-3)">${truckName(t.truckId)} · ${driverName(t.driverId)}</div></div>${sbadge(t.status)}<div class="act-time">${fmtDate(t.startTime)}</div></div>`).join('')
    : '<div class="empty-state" style="padding:10px 0"><div class="empty-state-label">No trips recorded</div></div>'
  );

  const shutoutsHtml = shutouts.length ? `<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Shutout History (${shutouts.length})</div>` +
    shutouts.map(s=>{
      const sthumb = s.img ? `<img src="${s.img}" style="width:44px;height:44px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:pointer;flex-shrink:0" onclick="openPhotoLightbox('${s.img}')" />` : `<div style="width:44px;height:44px;border-radius:5px;border:1px dashed var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:16px">📦</div>`;
      return `<div class="activity-row" style="align-items:flex-start;gap:10px">${sthumb}<div style="flex:1"><div style="font-size:11.5px;color:var(--text)">${s.reason||'—'}</div><div style="font-size:10px;color:var(--text-3)">${s.vessel||''} ${s.voyage?`· Voyage ${s.voyage}`:''}</div></div>${sbadge(s.status)}<div class="act-time">${fmtDate(s.date)}</div></div>`;
    }).join('') : '';

  const interchangeHtml = interchange.length ? `<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Interchange History (${interchange.length})</div>` +
    interchange.map(i=>{
      const meta = [i.eirNumber ? `EIR ${i.eirNumber}` : null, (i.vessel || i.voyage) ? `${i.vessel||'—'} / ${i.voyage||'—'}` : null].filter(Boolean).join(' · ');
      const repairBadge = (i.repairs && i.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${i.repairs.length} damage item${i.repairs.length>1?'s':''} · KSh ${Number(i.repairTotal||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>` : '';
      const thumb = i.img ? `<img src="${i.img}" style="width:44px;height:44px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:pointer;flex-shrink:0" onclick="showContainerPhotos('${i.id}')" />` : `<div style="width:44px;height:44px;border-radius:5px;border:1px dashed var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:16px">📦</div>`;
      return `<div class="activity-row" style="align-items:flex-start;gap:10px">${thumb}<div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:11.5px;color:var(--text)">${i.type} · ${i.condition}</div>${sbadge(i.status)}</div><div style="font-size:10px;color:var(--text-3)">${lineName(i.line)} · ${fmtDate(i.date)}</div>${meta?`<div style="font-size:10px;color:var(--text-3);margin-top:2px">${meta}</div>`:''}${repairBadge}${i.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:3px">${i.notes}</div>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${(i.surveyId || i.img)?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="showContainerPhotos('${i.id}')">📷 Photos</button>`:''}${i.surveyId?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInspectionReport('${i.surveyId}')">⬇ Inspection Report</button>`:''}<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInterchangeSlip('${i.id}')">⬇ Slip</button></div></div></div>`;
    }).join('') : '';


  const actions = [];
  if (liveTrip && canUpdateTripStatus(liveTrip)) {
    nextTripStatuses(liveTrip.status).forEach(s=>{
      actions.push(`<button class="filter-btn" onclick="closeModal();quickSetTripStatus('${liveTrip.id}','${s}')">${s.replace('_',' ')}</button>`);
    });
  }
  if (liveTrip) actions.push(`<button class="modal-btn ghost" onclick="closeModal();showTripDetail('${liveTrip.id}')">View Trip →</button>`);
  if (isAdmin() || isClerk() || isDispatch()) {
    actions.push(`<button class="modal-btn ghost" onclick="closeModal();showAddShutoutModal()">Flag Shutout</button>`);
    actions.push(`<button class="modal-btn ghost" onclick="closeModal();showAddInterchangeModal()">Record Interchange</button>`);
  }

  const actionsHtml = actions.length ? `<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:14px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Actions</div><div style="display:flex;gap:6px;flex-wrap:wrap">${actions.join('')}</div></div>` : '';

  openModal(`Container — ${cont}`, `${summary}${tripsHtml}${shutoutsHtml}${interchangeHtml}${actionsHtml}`);
}

function refreshContainerHistory() {
  const dl = document.getElementById('containerHistory');
  if (!dl) return;

  const labels = new Map();
  const tag = (c, label) => { if (c && !labels.has(c)) labels.set(c, label); };
  (state.db.trips||[]).forEach(t=>{
    if (!t.container) return;
    tag(t.container, t.bookingId ? 'Public Booking' : (t.notes && /bulk/i.test(t.notes) ? 'Bulk Upload' : 'Dispatch'));
  });
  (state.db.shutouts||[]).forEach(s=>{ tag(s.container, 'Shutout'); });
  (state.db.interchange||[]).forEach(i=>{ tag(i.container, 'Interchange'); });
  dl.innerHTML = [...labels.keys()].sort().map(c=>`<option value="${c}">${labels.get(c)}</option>`).join('');
}

function resolveBookingShippingLineId(booking) {
  if (!booking) return null;
  if (booking.shipping_line_id && state.db.shippingLines.some(l => l.id === booking.shipping_line_id)) {
    return booking.shipping_line_id;
  }
  const raw = (booking.shipping_line || '').trim().toLowerCase();
  if (!raw) return null;
  const match = state.db.shippingLines.find(l =>
    (l.code || '').toLowerCase() === raw ||
    (l.name || '').toLowerCase() === raw ||
    (l.name || '').toLowerCase().includes(raw) ||
    raw.includes((l.name || '').toLowerCase())
  );
  return match ? match.id : null;
}

const REPAIR_LABOUR_RATE_PER_HOUR = 300;

function repairItemsFor(prefix) { return window._repairItems[prefix] || (window._repairItems[prefix] = []); }

function repairItemsTotal(items) {
  return (items || []).reduce((sum, r) => sum + (Number(r.hours || 0) * REPAIR_LABOUR_RATE_PER_HOUR) + Number(r.material || 0), 0);
}

function tariffPickerHtml(prefix) {
  const categoryOptions = Object.keys(window.bookingDocs.TARIFF_SCHEDULE || {}).map(c => `<option>${c}</option>`).join('');
  return `
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:16px 0 8px">Damage / Repair Items</div>
    <div class="form-row-2">
      <div class="fg"><label>Category</label><select id="${prefix}_tcat" onchange="onRepairCategoryChange('${prefix}')"><option value="">—</option>${categoryOptions}</select></div>
      <div class="fg"><label>Code / Item</label><select id="${prefix}_tcode" onchange="onRepairCodeChange('${prefix}')"><option value="">Select category first…</option></select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Hours</label><input id="${prefix}_thours" type="number" step="0.1" readonly placeholder="Auto-filled"></div>
      <div class="fg"><label>Material (KSh)</label><input id="${prefix}_tmaterial" type="number" step="0.01" readonly placeholder="Auto-filled"></div>
    </div>
    <button type="button" class="modal-btn ghost" style="margin-bottom:8px" onclick="addRepairItem('${prefix}')">+ Add item</button>
    <div id="${prefix}_repairList"></div>`;
}

function onRepairCategoryChange(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const codeSel = document.getElementById(`${prefix}_tcode`);
  const rows = (window.bookingDocs.TARIFF_SCHEDULE || {})[cat] || [];
  [`${prefix}_thours`, `${prefix}_tmaterial`].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  codeSel.innerHTML = rows.length ? '<option value="">Select…</option>' + rows.map((r,i) => `<option value="${i}">${r.code} — ${r.item}</option>`).join('') : '<option value="">Select category first…</option>';
}

function onRepairCodeChange(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const idx = document.getElementById(`${prefix}_tcode`).value;
  const row = ((window.bookingDocs.TARIFF_SCHEDULE || {})[cat] || [])[idx];
  document.getElementById(`${prefix}_thours`).value = row ? row.hours : '';
  document.getElementById(`${prefix}_tmaterial`).value = row ? row.material : '';
}

function addRepairItem(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const idx = document.getElementById(`${prefix}_tcode`).value;
  const row = ((window.bookingDocs.TARIFF_SCHEDULE || {})[cat] || [])[idx];
  if (!row) { toast('Pick a category and code first', 'error'); return; }
  repairItemsFor(prefix).push({ category: cat, code: row.code, side: row.side, item: row.item, hours: row.hours, material: row.material });
  renderRepairItemsList(prefix);
}

function removeRepairItem(prefix, i) {
  repairItemsFor(prefix).splice(i, 1);
  renderRepairItemsList(prefix);
}

function renderRepairItemsList(prefix) {
  const el = document.getElementById(`${prefix}_repairList`);
  if (!el) return;
  const items = repairItemsFor(prefix);
  if (!items.length) { el.innerHTML = '<div style="font-size:11px;color:var(--text-3)">No damage items added — container will be logged as good condition.</div>'; return; }
  const rows = items.map((r, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--border)">
    <div style="font-size:11.5px"><span class="mono" style="color:var(--gold)">${r.code}</span> — ${sanitize(r.item)} <span style="color:var(--text-3)">(${r.side})</span></div>
    <div style="font-size:11px;color:var(--text-2)">${r.hours}h · KSh ${Number(r.material).toLocaleString()} <button type="button" class="modal-btn danger" style="padding:2px 8px;margin-left:8px" onclick="removeRepairItem('${prefix}',${i})">✕</button></div>
  </div>`).join('');
  const total = repairItemsTotal(items);
  el.innerHTML = rows + `<div style="display:flex;justify-content:space-between;padding-top:8px;font-weight:700;font-size:12px">
    <span>Total (labour @ KSh ${REPAIR_LABOUR_RATE_PER_HOUR}/hr + material)</span><span>KSh ${total.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
  </div>`;
}


function _tripToInterchangeReportRow(t) {
  const outward = isOutwardWorkType(t.workType);
  return {
    id: t.id, container: t.container, type: outward ? 'Gate-Out' : 'Gate-In',
    ctype: t.ctype || '', line: t.shippingLine || '', condition: '',
    truck: t.truckId || '', driver: t.driverId || '',

    status: t.status === 'completed' ? 'approved' : 'pending',
    repairTotal: 0,
    date: outward ? (t.dateOut || t.startTime) : t.startTime,
    notes: t.notes || '',
    _reportSource: 'trips',
  };
}