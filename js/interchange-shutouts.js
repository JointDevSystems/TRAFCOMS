'use strict';


function lineToRow(l)  { return { id:l.id, code:l.code, name:l.name, contact:l.contact, rate_20ft:l.rate20, rate_40ft:l.rate40, rate_hc:l.rateHC, currency:l.currency||'USD', active:l.active, rates:(l.rates&&typeof l.rates==='object')?l.rates:null }; }

function lineFromRow(r){ return { id:r.id, code:r.code, name:r.name, contact:r.contact, rate20:r.rate_20ft, rate40:r.rate_40ft, rateHC:r.rate_hc, currency:r.currency||(r.code==='PIL'?'KES':'USD'), active:r.active, rates:(r.rates&&typeof r.rates==='object')?r.rates:null }; }


function lineCurrencySymbol(l) { return (l.currency||'USD')==='KES' ? 'KSh' : (l.currency==='USD'?'US$':(l.currency||'US$')); }


function vlmFromRow(r){ return { id:r.id, pattern:r.pattern, matchType:r.match_type, lineId:r.line_id, priority:r.priority, source:r.source }; }

function shutoutToRow(s)  { return { id:s.id, container:s.container, vessel:s.vessel, voyage:s.voyage, line_id:s.line||null, date:s.date, status:s.status, reason:s.reason, truck_id:s.truckId||null, driver_id:s.driverId||null, notes:s.notes, img:s.img||'' }; }

function shutoutFromRow(r){ return { id:r.id, container:r.container, vessel:r.vessel, voyage:r.voyage, line:r.line_id, date:r.date, status:r.status, reason:r.reason, truckId:r.truck_id, driverId:r.driver_id, notes:r.notes, img:r.img||'' }; }

/* Form Designer custom fields for the inward form (cf_* columns of interchange; empty until an administrator adds fields). */
function gxIcCustomOut(i) { try { return (window.GargoForms && GargoForms.icOut) ? GargoForms.icOut(i && i.custom) : {}; } catch (e) { return {}; } }
function gxIcCustomIn(r)  { try { return (window.GargoForms && GargoForms.icIn) ? GargoForms.icIn(r) : {}; } catch (e) { return {}; } }

function icToRow(i)  { return { id:i.id, container:i.container, line_id:i.line||null, date:safeIso(i.date, new Date().toISOString()), type:i.type, truck_id:i.truck||null, driver_id:i.driver||null, condition:i.condition, notes:i.notes, status:i.status, img:i.img||'', eir_number:i.eirNumber||null, vessel:i.vessel||null, voyage:i.voyage||null, bl_number:i.blNumber||null, ctype:i.ctype||null, repairs:JSON.stringify(i.repairs||[]), repair_total:i.repairTotal||0, survey_id:i.surveyId||null, booking_id:i.bookingId||null, truck_reg_text:i.truckRegText||null, driver_name_text:i.driverNameText||null, needs_survey:!!i.needsSurvey, survey_status:i.surveyStatus||null, surveyed_at:safeIso(i.surveyedAt), surveyed_by:i.surveyedBy||null, delivering_party:i.deliveringParty||null, guarantee_no:i.guaranteeNo||null, cargo_status:i.cargoStatus||null, date_out:safeIso(i.dateOut), receiving_party:i.receivingParty||null, release_order_no:i.releaseOrderNo||null, flagged_for_review:!!i.flaggedForReview, flag_reasons:JSON.stringify(i.flagReasons||[]), duplicate_of_id:i.duplicateOfId||null, import_batch_id:i.importBatchId||null, transporter:i.transporter||null, driver_id_number:i.driverIdNumber||null, photos:JSON.stringify(i.photos||[]), iso_code:i.isoCode||null, trailer_no:i.trailerNo||null, gross_weight:(i.grossWeight===''||i.grossWeight==null)?null:Number(i.grossWeight), manufacture_date:i.manufactureDate||null, clerk_name:i.clerkName||null, storage_zone:i.storageZone||null, storage_block:i.storageBlock||null, storage_slot:i.storageSlot||null, ...gxIcCustomOut(i) }; }

function icFromRow(r){ let repairs=[]; try{ repairs = r.repairs ? (typeof r.repairs==='string' ? JSON.parse(r.repairs) : r.repairs) : []; }catch(e){ repairs=[]; } let flagReasons=[]; try{ flagReasons = r.flag_reasons ? (typeof r.flag_reasons==='string' ? JSON.parse(r.flag_reasons) : r.flag_reasons) : []; }catch(e){ flagReasons=[]; } let photos=[]; try{ photos = r.photos ? (typeof r.photos==='string' ? JSON.parse(r.photos) : r.photos) : []; }catch(e){ photos=[]; } return { gateInAt:r.date, depotInAt:((r.type==='Depot-In' && r.survey_status && r.survey_status!=='awaiting_survey') ? (r.surveyed_at||null) : null), id:r.id, container:r.container, line:r.line_id, date:r.date, type:r.type, truck:r.truck_id, driver:r.driver_id, condition:r.condition, notes:r.notes, status:r.status, img:r.img||'', eirNumber:r.eir_number||'', vessel:r.vessel||'', voyage:r.voyage||'', blNumber:r.bl_number||'', ctype:r.ctype||'', repairs, repairTotal:r.repair_total||0, surveyId:r.survey_id||null, bookingId:r.booking_id||null, truckRegText:r.truck_reg_text||'', driverNameText:r.driver_name_text||'', needsSurvey:!!r.needs_survey, surveyStatus:r.survey_status||null, surveyedAt:r.surveyed_at||null, surveyedBy:r.surveyed_by||null, deliveringParty:r.delivering_party||'', guaranteeNo:r.guarantee_no||'', cargoStatus:r.cargo_status||'', dateOut:r.date_out||null, receivingParty:r.receiving_party||'', releaseOrderNo:r.release_order_no||'', flaggedForReview:!!r.flagged_for_review, flagReasons, duplicateOfId:r.duplicate_of_id||null, importBatchId:r.import_batch_id||null, transporter:r.transporter||'', driverIdNumber:r.driver_id_number||'', photos, isoCode:r.iso_code||'', trailerNo:r.trailer_no||'', grossWeight:(r.gross_weight==null?'':r.gross_weight), manufactureDate:r.manufacture_date||'', clerkName:r.clerk_name||'', storageZone:r.storage_zone||'', storageBlock:r.storage_block||'', storageSlot:r.storage_slot||'', custom: gxIcCustomIn(r) }; }


function normContainerKey(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

function localContainerConflict(container, ignoreIcId) {
  const key = normContainerKey(container);
  if (!key) return null;
  // PERF: narrow to this container's own rows first (was a scan of every row inside a scan of every row)
  const same = (state.db.interchange || []).filter(i => normContainerKey(i.container) === key);
  const live = same.find(i => i.id !== ignoreIcId && (i.type === 'Gate-In' || i.type === 'Depot-In') && !i.dateOut
    && !same.some(o => (o.type === 'Gate-Out' || o.type === 'Depot-Out') && new Date(o.date) >= new Date(i.date)));
  return live ? `${key} is already in the yard (received ${fmtDate(live.date)}). A container cannot be entered again until it has been gated out.` : null;
}

async function checkContainerAvailable(container, opts) {
  opts = opts || {};
  const cont = String(container || '').trim().toUpperCase();
  if (!cont) return null;
  const local = localContainerConflict(cont, opts.icId);
  if (local) return local;
  try {
    const { data, error } = await supabase.rpc('check_container_available', { p_container: cont, p_booking: opts.bookingId || null, p_interchange: opts.icId || null });
    if (error) { console.warn('check_container_available failed:', error.message); return null; }
    return data || null;
  } catch (e) { console.warn('check_container_available error:', e); return null; }
}

async function persistNewInterchange(rec) {
  state.db.interchange.push(rec);
  const undo = () => { const idx = state.db.interchange.indexOf(rec); if (idx > -1) state.db.interchange.splice(idx, 1); };
  /* Online: save THIS record on its own, so unrelated unsaved rows (imports, other tables) can never block or delay a Gate-In.
     Everything else is saved in the background. Offline: keep the old path, which the offline layer already handles. */
  if (navigator.onLine !== false && typeof saveDirty === 'function') {
    let fail = null;
    try { fail = await saveDirty('interchange', [rec], icToRow); } catch (e) { fail = { error: e }; }
    if (fail && /fetch|network|timeout|load failed|abort/i.test(String((fail.error && fail.error.message) || ''))) {
      /* the reply may simply have been lost: if the server already has this record, it IS saved (retrying would create a duplicate) */
      try { const { data } = await supabase.from('interchange').select('id').eq('id', rec.id).maybeSingle(); if (data && data.id) { delete rec._dirty; fail = null; } } catch (e) {}
    }
    if (fail) { undo(); return { ok: false, message: (fail.error && fail.error.message) || 'The server refused the record' }; }
    try { scheduleSave(); } catch (e) {}
    return { ok: true };
  }
  const res = await saveNowAwaited();
  const fail = ((res && res.failures) || []).find(x => x && x.table === 'interchange');
  if (fail && (!fail.failedIds || fail.failedIds.indexOf(rec.id) > -1)) {
    undo();
    return { ok: false, message: (fail.error && fail.error.message) || 'The server refused the record' };
  }
  return { ok: true };
}


/* Is a container still in the yard?  An inward record has LEFT only if it carries a date-out, or an outward
   interchange for the same container was logged on/after the day it came in. Comparing dates matters: a container
   that left last month and came back today must show as in the yard again. */
function icOutIndex() {
  const idx = new Map();
  (state.db.interchange || []).forEach(o => {
    if (!/Out$/.test(o.type || '')) return;
    const k = normContainerKey(o.container), t = new Date(o.date).getTime();
    if (!idx.has(k) || t > idx.get(k)) idx.set(k, t);
  });
  return idx;
}
function icExitDate(ic, idx) {
  if (ic.dateOut) return ic.dateOut;
  const last = (idx || icOutIndex()).get(normContainerKey(ic.container));
  return last !== undefined && last >= new Date(ic.date).getTime() ? new Date(last).toISOString() : null;
}
function icInYard(ic, idx) { return (ic.type === 'Gate-In' || ic.type === 'Depot-In') && !icExitDate(ic, idx); }

/* An inward container's interchange (EIR) is issued only once its survey is complete.
   Until then it is a Gate-In waiting in the yard: it stays in the yard / survey lists but is NOT an interchange record. */
function icAwaitingSurvey(ic) { return (ic.type === 'Gate-In' || ic.type === 'Depot-In') && (ic.surveyStatus === 'awaiting_survey' || ic.surveyStatus === 'escalated'); }
function issuedInterchanges() { return (state.db.interchange || []).filter(i => !icAwaitingSurvey(i)); }



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
  const problem = gxPhotoProblem(file);
  if (problem) { toast('Image ' + problem, 'error'); input.value = ''; return; }
  const reader = gxImageReader();
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

const IC_PAGE = 40;            // PERF: cards drawn per page; the list used to draw every record (thousands of cards with inline photos)
let _icShown = IC_PAGE, _icLastF = null;
function icShowMore(all) { _icShown = all ? Infinity : _icShown + IC_PAGE; renderInterchange(_icFilter); }

function renderInterchange(f){
  if (f !== _icLastF) { _icShown = IC_PAGE; _icLastF = f; }          // new filter -> back to the first page; live refreshes keep your place
  const issued = issuedInterchanges();
  const waiting = (state.db.interchange || []).length - issued.length;
  let items = f==='all' ? issued
    : f==='flagged' ? issued.filter(i=>i.flaggedForReview)
    : issued.filter(i=>i.status===f);
  const el=document.getElementById('interchangeList');
  if(!el) return;
  const _total = items.length;
  items = items.map(i => [+new Date(i.date) || 0, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]).slice(0, _icShown);   // newest first (new records are pushed to the end of the array)
  // Same "has this container left the yard?" logic as the Inward panels, computed once per render.
  const _icIdx = icOutIndex();
  const waitNote = waiting ? `<div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0"><b>${waiting}</b> gated-in container${waiting === 1 ? ' is' : 's are'} waiting for survey. The interchange (EIR) is issued automatically when the survey is complete.</span></div>` : '';
  el.innerHTML=waitNote+items.map(ic=>{
    const meta = [ic.eirNumber ? `EIR ${ic.eirNumber}` : null, (ic.vessel || ic.voyage) ? `${ic.vessel||'—'} / ${ic.voyage||'—'}` : null, ic.dateOut ? `Out ${fmtDate(ic.dateOut)}` : null].filter(Boolean).join(' · ');
    const repairBadge = (ic.repairs && ic.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${ic.repairs.length} damage item${ic.repairs.length>1?'s':''} · ${GargoMoney.fmt(ic.repairTotal||0, GargoMoney.itemsCur(ic.repairs))}</div>` : '';
    const canQuickDispatch = isAdmin() && icInYard(ic, _icIdx);
    const canSendToSurvey = (ic.type === 'Gate-In' || ic.type === 'Depot-In') && !ic.surveyStatus;
    return `<div class="ic-card"><div class="ic-card-img-placeholder" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload('interchange','${ic.id}','img',()=>renderInterchange('${f}'))" title="Upload container photo">${ic.img?`<img loading="lazy" decoding="async" src="${ic.img}" style="width:100%;height:100%;object-fit:cover" />`:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">${ic.container}</div>${sbadge(ic.status)}${ic.flaggedForReview?`<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${esc((ic.flagReasons||[]).join('; '))}">⚠ Flagged</span>`:''}</div><div style="font-size:11.5px;color:var(--text-2)">${ic.type} · ${lineName(ic.line)} · ${ic.condition}${ic.ctype ? ' · ' + ic.ctype : ''}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">${ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—')} · ${ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—')} · ${fmtDate(ic.date)}</div>${meta?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${meta}</div>`:''}${repairBadge}${ic.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${ic.notes}</div>`:''}</div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">${isAdmin() && ic.status==='pending'?`<button class="modal-btn success" onclick="approveInterchange('${ic.id}')">Approve</button>`:''}${canQuickDispatch?`<button class="modal-btn ghost" onclick="quickDispatchOut('${ic.id}')">Quick Dispatch →</button>`:''}${canSendToSurvey?`<button class="modal-btn ghost" onclick="sendToSurvey('${ic.id}')">Send to Survey →</button>`:''}<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${ic.id}')">⬇ Download</button><button class="modal-btn ghost" onclick="printInterchangeSlip('${ic.id}')" title="Print">🖨 Print</button>${ic.flaggedForReview?`<button class="modal-btn ghost" onclick="clearReviewFlag('interchange','${ic.id}')">✓ Mark Reviewed</button>`:''}${ic.surveyId?`<button class="modal-btn ghost" onclick="downloadInspectionReport('${ic.surveyId}')">⬇ Inspection Report</button><button class="modal-btn ghost" onclick="printInspectionReport('${ic.surveyId}')" title="Print">🖨 Print Report</button>`:''}${(ic.surveyId || ic.img || (ic.photos && ic.photos.length))?`<button class="modal-btn ghost" onclick="showContainerPhotos('${ic.id}')">📷 Photos</button>`:''}</div></div>`;
  }).join('')||'<div class="empty-state"><div class="empty-state-icon">\u{1F504}</div><div class="empty-state-label">No interchange records</div></div>';
  if (_total > items.length) el.innerHTML += `<div style="padding:14px;text-align:center;font-size:12px;color:var(--text-3)">Showing ${items.length} of ${_total} \u00b7 <button class="modal-btn ghost" onclick="icShowMore()">Show ${IC_PAGE} more</button> ${_total <= 1000 ? '<button class="modal-btn ghost" onclick="icShowMore(true)">Show all</button>' : ''}</div>`;
}

async function sendToSurvey(id) {
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) { toast('Interchange record not found', 'error'); return; }
  if (ic.surveyStatus === 'awaiting_survey') { toast(`${ic.container} is already awaiting survey`, 'info'); return; }
  if (ic.surveyStatus === 'surveyed') { toast(`${ic.container} has already been surveyed`, 'info'); return; }

  ic.needsSurvey = true;
  ic.surveyStatus = 'awaiting_survey';
  ic._dirty = true;

  if (!ic.bookingId) {
    try {
      const bookingId = await createDepotBookingFromInterchange(ic);
      if (bookingId) { ic.bookingId = bookingId; ic._dirty = true; }
    } catch (e) {
      toast(`${ic.container} sent to Awaiting Survey, but couldn't queue it for DepOps (${e.message || e})`, 'warning', 6000);
    }
  }

  scheduleSave();
  addAudit(state.profile.username, 'Sent to Survey', ic.container);
  toast(`${ic.container} sent to Awaiting Survey`, 'success');

  renderInterchange(_icFilter);
  if (typeof renderInwardAwaitingSurvey === 'function') renderInwardAwaitingSurvey();
  if (typeof renderInwardStillInStorage === 'function') renderInwardStillInStorage();
  if (typeof renderDepOpsAwaitingSurvey === 'function') renderDepOpsAwaitingSurvey();
}

async function showContainerPhotos(icId) {
  const ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Interchange record not found', 'error'); return; }
  openModal(`Photos — ${sanitize(ic.container) || 'Container'}`, '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');

  let photos = (ic.photos && ic.photos.length) ? ic.photos.slice() : [];
  if (ic.surveyId) {
    let s = (_surveyRegisterData.find(x => x.id === ic.surveyId)) || _surveyLookupCache[ic.surveyId];
    if (!s) {
      try { s = await window.bookingDocs.surveyById(ic.surveyId); if (s) _surveyLookupCache[s.id] = s; } catch (e) { /* fall through to whatever we already have */ }
    }
    if (s && Array.isArray(s.photos)) {
      s.photos.forEach(p => { if (photos.indexOf(p) === -1) photos.push(p); });
    }
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
  const items = _icFilter === 'all' ? issuedInterchanges() : issuedInterchanges().filter(i => i.status === _icFilter);
  if (!items.length) { toast('Nothing to print yet', 'error'); return; }
  const rows = items.map(ic => `<tr>
    <td>${fmtDate(ic.date)}</td><td>${sanitize(ic.container || '—')}</td><td>${sanitize(ic.eirNumber || '—')}</td><td>${sanitize(ic.type || '—')}</td>
    <td>${sanitize(lineName(ic.line))}</td><td>${sanitize(ic.condition || '—')}</td>
    <td>${sanitize(truckName(ic.truck))}</td><td>${sanitize(driverName(ic.driver))}</td>
    <td>${ic.repairTotal ? GargoMoney.fmt(ic.repairTotal, GargoMoney.itemsCur(ic.repairs)) : '—'}</td><td>${sanitize((ic.status || '').toUpperCase())}</td>
  </tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Interchange Records</title><style>
    body{font-family:Arial,sans-serif;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}
    h2{margin-bottom:4px}
  </style></head><body>${ghPrintHeaderHtml()}<h2>Interchange Records</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')} · Filter: ${_icFilter}</div>
  <table><thead><tr><th>Date</th><th>Container</th><th>EIR No.</th><th>Type</th><th>Line</th><th>Condition</th><th>Truck</th><th>Driver</th><th>Repair Cost</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function downloadInterchangeCSV() {
  const items = _icFilter === 'all' ? issuedInterchanges() : issuedInterchanges().filter(i => i.status === _icFilter);
  if (!items.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'EIR No.', 'Type', 'Container Type', 'Shipping Line', 'Vessel', 'Voyage', 'Consignee / C&F', 'Guarantee / B/L No.', 'ISO Code', 'Trailer No.', 'Gross Weight (kg)', 'Date of Manufacture', 'Transporter', 'Driver ID / Driving No.', 'Cargo Status', 'Condition', 'Truck', 'Driver', 'Date Out', 'Receiving Party', 'Release Order No.', 'Repair Items', 'Repair Total', 'Status', 'Notes'];
  const rows = items.map(ic => [
    ic.date, ic.container, ic.eirNumber, ic.type, ic.ctype, lineName(ic.line), ic.vessel, ic.voyage, ic.deliveringParty, ic.guaranteeNo || ic.blNumber, ic.isoCode, ic.trailerNo, ic.grossWeight, ic.manufactureDate, ic.transporter, ic.driverIdNumber, ic.cargoStatus, ic.condition, truckName(ic.truck), driverName(ic.driver),
    ic.dateOut, ic.receivingParty, ic.releaseOrderNo,
    (ic.repairs || []).map(r => `${r.code} (${r.item})`).join('; '), ic.repairTotal || 0, ic.status, ic.notes,
  ]);
  const csv = ghCsvPreamble('\n') + [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
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
  if (icAwaitingSurvey(ic)) { toast('This container has not been surveyed yet, so there is no interchange to approve', 'error'); return; }
  ic.status='approved';
  ic._dirty = true;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Interchange Approved', ic.container);
  renderInterchange(_icFilter);
  toast('Interchange approved', 'success');
}


function isInwardMovement(type) { return type === 'Gate-In' || type === 'Depot-In'; }

function eirPrefixForLine(lineId) {
  const l = (state.db.shippingLines || []).find(x => x.id === lineId);
  const letters = String((l && (l.code || l.name)) || '').toUpperCase().replace(/[^A-Z]/g, '');
  return letters.slice(0, 3) || 'EIR';
}

function eirNumberIsMissing(v) {
  return !v || /^(n\/?a|none|null|-+|—+)$/i.test(String(v).trim());
}

/* INWARD EIR numbers for these lines are "<number><suffix>" (e.g. 268ACLR). Matched on the shipping-line CODE.
   The numbers are handed out by the database function next_inward_eir_number (table eir_inward_scheme), which is safe when
   several people issue at once. The list below is only the offline fallback: it continues from the highest number on this device,
   never below `start`. Other lines and all outward EIRs keep the old PREFIX001 style. */
const EIR_INWARD_SCHEME = {
  ACL: { suffix: 'ACLR', start: 268 },  ALSL: { suffix: 'ALSL', start: 10 },  ASL: { suffix: 'ASL', start: 140 },
  APS: { suffix: 'APS', start: 78 },    BLTC: { suffix: 'BLTC', start: 262 }, BLT: { suffix: 'BLT', start: 20 },
  BWS: { suffix: 'BWS', start: 218 },    COSL: { suffix: 'COSL', start: 4497 }, COL: { suffix: 'COL', start: 137 },
  DOSL: { suffix: 'DOSL', start: 51 },
  PIL: { suffix: 'PIL', start: 5538 },   OFS: { suffix: 'OFS', start: 227 },   OLE: { suffix: 'OLE', start: 58 },
  OSL: { suffix: 'OSL', start: 21 },     NML: { suffix: 'NML', start: 2 },     KVY: { suffix: 'KVY', start: 8 },
  GDRC: { suffix: 'GDRC', start: 41 },   GHD: { suffix: 'GHD', start: 188 },   ECL: { suffix: 'ECL', start: 4 },
};
const _eirIssued = {};   // highest number handed out this session per suffix (offline fallback only)

function eirInwardScheme(lineId) {
  const l = (state.db.shippingLines || []).find(x => x.id === lineId); if (!l) return null;
  return EIR_INWARD_SCHEME[String(l.code || '').trim().toUpperCase()] || null;
}

async function nextSchemeEirNumber(sc, lineId) {
  const re = new RegExp('^(\\d+)I?' + sc.suffix + '$');   // the database issues "<number>I<suffix>" (e.g. 4639ICOSL); older records have no "I"
  try {                                                    // normal path: the database issues the number
    const { data, error } = await supabase.rpc('next_inward_eir_number', { p_line_id: lineId });
    if (!error && typeof data === 'string' && re.test(data)) { _eirIssued[sc.suffix] = parseInt(re.exec(data)[1], 10); return data; }
  } catch (e) { /* offline or function missing: fall through */ }
  const used = new Set();
  (state.db.interchange || []).forEach(i => { const m = re.exec(String(i.eirNumber || '').trim().toUpperCase()); if (m) used.add(parseInt(m[1], 10)); });
  let n = Math.max(sc.start, (_eirIssued[sc.suffix] || 0) + 1);
  while (used.has(n)) n++;
  _eirIssued[sc.suffix] = n;
  return n + 'I' + sc.suffix;   // same format the database issues
}

async function nextEirNumber(movementType, lineId) {
  if (isInwardMovement(movementType)) { const sc = eirInwardScheme(lineId); if (sc) return nextSchemeEirNumber(sc, lineId); }
  const prefix = eirPrefixForLine(lineId);
  const re = new RegExp('^' + prefix + '(\\d+)$');
  const fmtNo = n => prefix + String(n).padStart(3, '0');
  try {
    const { data, error } = await supabase.rpc('next_eir_number_for_prefix', { p_prefix: prefix });
    if (!error && typeof data === 'string' && re.test(data)) return data;
  } catch (e) { /* function not installed yet — fall through to the max+1 fallback */ }
  let max = 0;
  (state.db.interchange || []).forEach(i => {
    const m = re.exec(i.eirNumber || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  try {
    // Numbers only ever go up over time, so the newest rows hold the highest one.
    const { data } = await supabase.from('interchange').select('eir_number')
      .like('eir_number', prefix + '%').order('created_at', { ascending: false }).limit(300);
    (data || []).forEach(r => {
      const m = re.exec(r.eir_number || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
  } catch (e) { /* offline / RLS — local max is the best we have */ }
  return fmtNo(max + 1);
}


async function ensureEirNumber(ic) {
  if (!ic || !eirNumberIsMissing(ic.eirNumber)) return;
  ic.eirNumber = await nextEirNumber(ic.type, ic.line);
  ic._dirty = true;
  scheduleSave();
}

// "5/2011", "05-2011", "2011-05" -> "05/2011". '' when blank, null when unreadable.
function normalizeManufactureDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  let mm, yyyy, m;
  if ((m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{4})$/))) { mm = +m[1]; yyyy = +m[2]; }
  else if ((m = s.match(/^(\d{4})\s*[\/\-.]\s*(\d{1,2})$/))) { yyyy = +m[1]; mm = +m[2]; }
  else return null;
  if (mm < 1 || mm > 12 || yyyy < 1970 || yyyy > new Date().getFullYear() + 1) return null;
  return String(mm).padStart(2, '0') + '/' + yyyy;
}

function showAddInterchangeModal() {
  window._repairItems.ic = [];
  const typeOptions = CONTAINER_TYPE_OPTIONS.map(t => `<option>${t}</option>`).join('');
  openModal('Record Interchange', `
    <div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0">The <strong>EIR No.</strong> is generated automatically when the interchange is recorded. Inward interchanges (Gate-In / Depot-In) are not entered here: they are issued automatically when the container's survey is complete.</span></div>
    <div class="form-row-2">
      <div class="fg"><label>Container No.</label><input id="ic_cont" list="containerHistory" placeholder="MSCU1234566 — pick existing or type new" oninput="markContainerValidity(this)"/></div>
      <div class="fg"><label>Movement</label><select id="ic_type"><option>Gate-Out</option><option>Depot-Out</option></select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Container Type/Size</label><select id="ic_ctype">${typeOptions}</select></div>
      <div class="fg"><label>ISO Code <span class="label-optional">(optional)</span></label><input id="ic_iso" placeholder="e.g. 22G1" maxlength="6" style="text-transform:uppercase"/></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Consignee / C&amp;F</label><input id="ic_consignee" placeholder="Consignee / clearing &amp; forwarding agent"/></div>
      <div class="fg"><label>Shipping Line / Agent</label><select id="ic_line">${state.db.shippingLines.map(l=>`<option value="${l.id}">${l.code}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Vessel</label><input id="ic_vessel"/></div>
      <div class="fg"><label>Voyage</label><input id="ic_voyage"/></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Guarantee / B/L No.</label><input id="ic_bl" placeholder="Guarantee form / B/L no."/></div>
      <div class="fg"><label>Gross Weight (kg) <span class="label-optional">(optional)</span></label><input id="ic_gross" type="number" min="0" step="1" placeholder="e.g. 30480"/></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Lorry No.</label><select id="ic_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg}</option>`).join('')}</select></div>
      <div class="fg"><label>Trailer No. <span class="label-optional">(optional)</span></label><input id="ic_trailer" placeholder="e.g. ZD502"/></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Driver Name</label><select id="ic_driver">${state.db.drivers.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div>
      <div class="fg"><label>ID / Driving No. <span class="label-optional">(optional)</span></label><input id="ic_driver_id" placeholder="National ID / driving licence no."/></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Transporter <span class="label-optional">(optional)</span></label><input id="ic_transporter" placeholder="Transporting company"/></div>
      <div class="fg"><label>Date of Manufacture <span class="label-optional">(optional)</span></label><input id="ic_dom" placeholder="MM/YYYY" maxlength="7"/></div>
    </div>
    <div class="fg"><label>Container Status</label><select id="ic_cond"><option>Repat</option><option>Sale</option><option>Shipper</option></select></div>
    ${tariffPickerHtml('ic')}
    <div class="fg"><label>Notes</label><textarea id="ic_notes" rows="2" placeholder="Damage notes, remarks…"></textarea></div>
    <button class="submit-btn" onclick="saveInterchange()">Record Interchange →</button>`);
  renderRepairItemsList('ic');
}

let _icSaving = false;
async function saveInterchange() {
  if (_icSaving) return;
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const cont = val('ic_cont').toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }
  const type = val('ic_type');
  if (isInwardMovement(type)) { toast('Inward interchange is issued automatically after the survey. Record the Gate-In under Inward Container Entry, then survey it.', 'error', 7000); return; }
  const dupIc = findDuplicateInterchange(cont, type, new Date().toISOString());
  if (dupIc) { toast(`${cont} already has a ${type} interchange record logged today`, 'warning'); return; }
  const dom = normalizeManufactureDate(val('ic_dom'));
  if (dom === null) { toast('Date of manufacture must look like 05/2011', 'error'); return; }
  const grossRaw = val('ic_gross');
  const gross = grossRaw ? Number(grossRaw) : '';
  if (grossRaw && (!isFinite(gross) || gross <= 0)) { toast('Gross weight must be a positive number', 'error'); return; }

  _icSaving = true;
  try {
    const eirNumber = await nextEirNumber(type, val('ic_line'));
    const repairs = window._repairItems.ic || [];
    const ref = sanitize(val('ic_bl'));   // Guarantee No. and B/L No. are the same number
    const icRec = {
      id: uid('IC'), container: cont, type,
      ctype: val('ic_ctype'),
      line: val('ic_line'),
      condition: val('ic_cond'),
      truck:  val('ic_truck'),
      driver: val('ic_driver'),
      driverIdNumber: sanitize(val('ic_driver_id')),
      transporter: sanitize(val('ic_transporter')),
      trailerNo: sanitize(val('ic_trailer')),
      isoCode: sanitize(val('ic_iso')).toUpperCase(),
      grossWeight: gross,
      manufactureDate: dom,
      deliveringParty: sanitize(val('ic_consignee')),   // consignee / C&F
      eirNumber,
      blNumber: ref, guaranteeNo: ref,
      clerkName: (state.profile && state.profile.name) || '',
      vessel: sanitize(val('ic_vessel')),
      voyage: sanitize(val('ic_voyage')),
      repairs, repairTotal: repairItemsTotal(repairs),
      notes:  sanitize(val('ic_notes')),
      date: new Date().toISOString(), status:'pending', img:'',
      _dirty: true,
    };
    const savedIc = await persistNewInterchange(icRec);
    if (!savedIc.ok) { toast(`Not saved \u2014 ${savedIc.message}`, 'error', 9000); return; }
    buildBadges();
    addAudit(state.profile.username, 'Interchange Recorded', `${cont} · ${eirNumber}`);
    closeModal(); renderInterchange('all');
    refreshContainerHistory();
    toast(`Interchange recorded — ${eirNumber}`, 'success');
  } finally {
    _icSaving = false;
  }
}

/* Slip palette: identical to the Container Inspection Report so every printed document looks like one family. */
const IC_PAL = {
  GREEN: [46, 125, 50], GREEN_LT: [232, 245, 233],
  BLUE: [30, 64, 175], BLUE_LT: [219, 234, 254],
  GOLD: [201, 162, 39], RED: [200, 60, 60],
  HAIR: 205, CAP: [110, 110, 110], INK: [20, 20, 20], NOTE: [245, 245, 245],
};

function buildInterchangeSlip(icId, opts) {
  opts = opts || {};
  const ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Interchange record not found', 'error'); return null; }
  if (!window.jspdf) { toast('PDF library still loading — try again in a moment', 'error'); return null; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;
  if (icAwaitingSurvey(ic)) { toast('The interchange is issued after the survey is complete', 'warning'); return null; }
  const inward = isInwardMovement(ic.type);
  if (!inward) return icBuildOutwardSlip(ic, doc, opts);   // outward EIR = the paper "Container Interchange Report / Receipt" layout
  const money = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // One field cell: hairline border, small grey caption, bold value beneath (left aligned, like the inspection report).
  const P = IC_PAL;
  function cell(x, y, w, h, label, value, color) {
    doc.setDrawColor(P.HAIR); doc.setLineWidth(0.25); doc.rect(x, y, w, h);
    doc.setFont(undefined, 'bold'); doc.setFontSize(6.4); doc.setTextColor(...P.CAP);
    doc.text(String(label).toUpperCase(), x + 2.2, y + 4);
    doc.setTextColor(...(color || P.INK));
    const text = String(value == null || value === '' ? '' : value);
    doc.setFontSize(9.5);
    let lines = doc.splitTextToSize(text, w - 4.4);
    if (lines.length > 1) {
      doc.setFontSize(7.5);
      lines = doc.splitTextToSize(text, w - 4.4).slice(0, 2);
      doc.text(lines, x + 2.2, y + Math.min(7.8, h - 3.6), { lineHeightFactor: 1.05 });
    } else {
      doc.text(lines, x + 2.2, y + Math.min(9.2, h - 1.8));
    }
    doc.setTextColor(...P.INK);
  }
  function kv(x, y, label, value, color) {
    doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(90);
    doc.text(String(label).toUpperCase(), x, y);
    doc.setFont(undefined, 'bold'); doc.setFontSize(9.5); doc.setTextColor(...(color || P.INK));
    doc.text(String(value || '—'), x, y + 5);
    doc.setTextColor(...P.INK);
  }
  function panel(x, y, w, h, fill) { doc.setFillColor(...fill); doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F'); }

  // ---- letterhead + title -----------------------------------------------------
  ghPdfLetterhead(doc, MARGIN, 8, CONTENT_W);   // logo + company details, centred, with the gold rule

  const when = new Date(ic.date);
  const timeStr = isNaN(when) ? '—' : when.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  let y = 39;
  doc.setFont(undefined, 'bold'); doc.setFontSize(13); doc.setTextColor(...P.INK);
  doc.text(inward ? 'INWARD INTERCHANGE' : 'OUTWARD INTERCHANGE', MARGIN, y);
  doc.setFontSize(9); doc.setTextColor(...P.GOLD);
  doc.text(`EIR NO. ${ic.eirNumber || '—'}`, RIGHT, y - 2, { align: 'right' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(120);
  doc.text(new Date().toLocaleString('en-KE'), RIGHT, y + 2.5, { align: 'right' });
  doc.setTextColor(...P.INK);

  // green information panel
  y = 44;
  panel(MARGIN, y, CONTENT_W, 14, P.GREEN_LT);
  kv(MARGIN + 4,   y + 4.5, 'EIR No.', ic.eirNumber, P.GREEN);
  kv(MARGIN + 52,  y + 4.5, 'Movement', inward ? 'Inward Interchange' : 'Outward Interchange', P.GREEN);
  kv(MARGIN + 108, y + 4.5, `Date ${inward ? 'in' : 'out'}`, fmtDate(ic.date), P.GREEN);
  kv(MARGIN + 148, y + 4.5, `Time ${inward ? 'in' : 'out'}`, timeStr, P.GREEN);
  y += 18;

  // blue title banner
  panel(MARGIN, y, CONTENT_W, 9, P.BLUE_LT);
  doc.setFont(undefined, 'bold'); doc.setFontSize(10.5); doc.setTextColor(...P.BLUE);
  doc.text('Equipment Interchange Receipt \u2014 ' + (inward ? 'Container Received' : 'Container Released'), MARGIN + 4, y + 6.1);
  doc.setTextColor(...P.INK);
  y += 13;

  // ---- field grid --------------------------------------------------------------
  // ---- fit on ONE page: use the roomiest density that still leaves space for the sign-off ----
  const SO_H = 24, PAGE_BOTTOM = 289, DESC_W = 76;
  const slipNotes = /^Booking\s[^\u00b7]*\u00b7/.test(String(ic.notes || '')) ? '' : String(ic.notes || '');   // system note "Booking REF · name · phone" stays off the slip
  const LEVELS = [
    { ROW: 12,   rowMin: 7,   pad: 3,   lh: 3.6, fs: 8,   bo: 4.6, head: 7,   tot: 7.5, totGap: 9, stmt: 12,   noteFs: 8.5, noteBase: 9,   noteLh: 4   },
    { ROW: 10.5, rowMin: 5.8, pad: 2,   lh: 3.2, fs: 7.4, bo: 4.0, head: 6.5, tot: 6.5, totGap: 7, stmt: 11,   noteFs: 8,   noteBase: 8,   noteLh: 3.7 },
    { ROW: 10.5, rowMin: 4.8, pad: 1.4, lh: 2.9, fs: 6.8, bo: 3.4, head: 6,   tot: 6,   totGap: 6, stmt: 10.5, noteFs: 7.5, noteBase: 7.5, noteLh: 3.4 },
    { ROW: 10,   rowMin: 4.0, pad: 1,   lh: 2.6, fs: 6.2, bo: 3.0, head: 5.5, tot: 5.5, totGap: 5, stmt: 10,   noteFs: 7,   noteBase: 7,   noteLh: 3.1 },
    { ROW: 9.5,  rowMin: 3.6, pad: 0.8, lh: 2.4, fs: 5.8, bo: 2.7, head: 5,   tot: 5,   totGap: 4, stmt: 9.5,  noteFs: 6.5, noteBase: 6.5, noteLh: 2.9 },
  ];
  const LV = (function () {
    const reps = ic.repairs || [];
    let pick = LEVELS[LEVELS.length - 1];
    for (let k = 0; k < LEVELS.length; k++) {
      const lv = LEVELS[k];
      doc.setFont(undefined, 'normal'); doc.setFontSize(lv.fs);
      let h = 75 + lv.ROW * 6 + 6 + lv.head;                     // letterhead + info panels + field grid + table header
      if (reps.length) reps.forEach(r => { h += Math.max(lv.rowMin, doc.splitTextToSize(String(r.item || '\u2014'), DESC_W - 3).length * lv.lh + lv.pad); });
      else h += 8;
      h += lv.tot + lv.totGap + lv.stmt;
      if (slipNotes) { doc.setFontSize(lv.noteFs); h += lv.noteBase + Math.min(5, doc.splitTextToSize(slipNotes, CONTENT_W - 4).length) * lv.noteLh + 4; }
      if (h + 4 + SO_H <= PAGE_BOTTOM) { pick = lv; break; }
    }
    doc.setFont(undefined, 'normal'); doc.setFontSize(8);
    return pick;
  })();
  const ROW = LV.ROW;
  const truckReg = ic.truck ? String(truckName(ic.truck)).split(' · ')[0] : (ic.truckRegText || '');
  const lorry = [truckReg, ic.trailerNo].filter(Boolean).join(' / ');
  const drv = ic.driver ? state.db.drivers.find(d => d.id === ic.driver) : null;
  const driverNm = (ic.driver ? driverName(ic.driver) : (ic.driverNameText || '')) + (icDriverPhone(ic) ? '  Tel ' + icDriverPhone(ic) : '');
  const driverIdNo = ic.driverIdNumber || (drv && (drv.idNo || drv.id_no)) || '';
  const sz = decomposeCtype(ic.ctype);
  const guaranteeBl = ic.guaranteeNo || ic.blNumber || '';

  const storageZone  = ic.storageZone  || '';
  const storageBlock = ic.storageBlock || '';
  const storageSlot  = ic.storageSlot  || '';

  cell(MARGIN,      y, 91, ROW, 'Consignee / C and F', ic.deliveringParty);
  cell(MARGIN + 91, y, 91, ROW, 'Shipping Line / Agent', ic.line ? lineName(ic.line) : '');
  y += ROW;
  cell(MARGIN,       y, 52, ROW, 'Container No.', ic.container, P.BLUE);
  cell(MARGIN + 52,  y, 22, ROW, 'ISO', ic.isoCode);
  cell(MARGIN + 74,  y, 18, ROW, 'Size', String(sz.size || '').replace(/ft$/i, ''));
  cell(MARGIN + 92,  y, 22, ROW, 'Type', sz.type);
  cell(MARGIN + 114, y, 40, ROW, 'Vessel', ic.vessel);
  cell(MARGIN + 154, y, 28, ROW, 'Voyage', ic.voyage);
  y += ROW;
  cell(MARGIN,       y, 50, ROW, 'Lorry No. / Trailer No.', lorry);
  cell(MARGIN + 50,  y, 62, ROW, 'Driver Name / Phone', driverNm);
  cell(MARGIN + 112, y, 34, ROW, 'ID / Driving No.', driverIdNo);
  cell(MARGIN + 146, y, 36, ROW * 2, 'Signature', '');
  y += ROW;
  cell(MARGIN,      y, 73, ROW, 'Transporter', ic.transporter);
  cell(MARGIN + 73, y, 73, ROW, 'Guarantee / BL No.', guaranteeBl);
  y += ROW;
  cell(MARGIN,       y, 56, ROW, 'Clerk', ic.clerkName);
  cell(MARGIN + 56,  y, 42, ROW, 'Storage Zone', storageZone);
  cell(MARGIN + 98,  y, 42, ROW, 'Storage Block', storageBlock);
  cell(MARGIN + 140, y, 42, ROW, 'Storage Slot', storageSlot);
  y += ROW;
  cell(MARGIN,      y, 91, ROW, 'Gross Weight (kg)', ic.grossWeight !== '' && ic.grossWeight != null ? Number(ic.grossWeight).toLocaleString() : '');
  cell(MARGIN + 91, y, 91, ROW, 'Date of Manufacture', ic.manufactureDate);
  y += ROW + 6;

  // ---- repair table ----------------------------------------------------------------
  const cols = [
    { label: 'Repair Code',        x: MARGIN,       w: 24, align: 'left'  },
    { label: 'Damage Description', x: MARGIN + 24,  w: DESC_W, align: 'left'  },
    { label: 'Qty',                x: MARGIN + 100, w: 10, align: 'right' },
    { label: 'Hrs',                x: MARGIN + 110, w: 12, align: 'right' },
    { label: 'Labour Cost',        x: MARGIN + 122, w: 20, align: 'right' },
    { label: 'Material Cost',      x: MARGIN + 142, w: 22, align: 'right' },
    { label: 'Total Cost',         x: MARGIN + 164, w: 18, align: 'right' },
  ];
  const put = (i, txt, yy) => {
    const c = cols[i];
    if (c.align === 'right') doc.text(String(txt), c.x + c.w - 1.5, yy, { align: 'right' });
    else doc.text(String(txt), c.x + 1.5, yy);
  };
  const drawHead = () => {
    doc.setDrawColor(P.HAIR); doc.setLineWidth(0.25); doc.setFillColor(...P.BLUE_LT);
    doc.rect(MARGIN, y, CONTENT_W, LV.head, 'FD');
    cols.forEach(c => doc.rect(c.x, y, c.w, LV.head));
    doc.setFont(undefined, 'bold'); doc.setFontSize(Math.min(7.5, LV.fs + 0.3)); doc.setTextColor(...P.BLUE);
    cols.forEach((c, i) => {
      if (c.align === 'right') doc.text(c.label, c.x + c.w - 1.5, y + LV.head - 2.3, { align: 'right' });
      else doc.text(c.label, c.x + 1.5, y + LV.head - 2.3);
    });
    y += LV.head;
  };
  drawHead();

  const repairs = ic.repairs || [];
  let totHrs = 0, totLabour = 0, totMaterial = 0;
  doc.setFont(undefined, 'normal'); doc.setFontSize(LV.fs); doc.setTextColor(20);
  if (repairs.length) {
    repairs.forEach(r => {
      const hrs = Number(r.hours || 0);
      const labour = hrs * GargoMoney.labourRate(GargoMoney.itemCur(r));
      const material = Number(r.material || 0);
      totHrs += hrs; totLabour += labour; totMaterial += material;
      const lines = doc.splitTextToSize(String(r.item || '—'), cols[1].w - 3);
      const rowH = Math.max(LV.rowMin, lines.length * LV.lh + LV.pad);
      if (y + rowH > 280) { doc.addPage(); y = 20; drawHead(); doc.setFont(undefined, 'normal'); doc.setFontSize(LV.fs); doc.setTextColor(20); }   // last resort for extreme lists
      cols.forEach(c => doc.rect(c.x, y, c.w, rowH));
      put(0, r.code || '—', y + LV.bo);
      doc.text(lines, cols[1].x + 1.5, y + LV.bo);
      put(2, r.qty || 1, y + LV.bo);
      put(3, hrs.toFixed(2), y + LV.bo);
      put(4, money(labour), y + LV.bo);
      put(5, money(material), y + LV.bo);
      put(6, money(labour + material), y + LV.bo);
      y += rowH;
    });
  } else {
    doc.rect(MARGIN, y, CONTENT_W, 8);
    doc.setFont(undefined, 'italic'); doc.setTextColor(100);
    doc.text('No damage items recorded.', MARGIN + 2, y + 5.3);
    doc.setFont(undefined, 'normal'); doc.setTextColor(20);
    y += 8;
  }
  // totals row
  doc.setFont(undefined, 'bold'); doc.setFontSize(Math.min(8.5, LV.fs + 0.5)); doc.setTextColor(...P.GREEN);
  doc.setFillColor(...P.GREEN_LT);
  cols.forEach(c => doc.rect(c.x, y, c.w, LV.tot, 'FD'));
  const tb = LV.tot - 2.5;
  doc.text('Totals :   ' + GargoMoney.sym(GargoMoney.itemsCur(repairs)), cols[1].x + cols[1].w - 1.5, y + tb, { align: 'right' });
  put(3, totHrs.toFixed(2), y + tb);
  put(4, money(totLabour), y + tb);
  put(5, money(totMaterial), y + tb);
  put(6, money(totLabour + totMaterial), y + tb);
  y += LV.tot + LV.totGap;

  // ---- statement + remarks --------------------------------------------------------
  if (y > 262) { doc.addPage(); y = 20; }
  doc.setFillColor(...P.NOTE); doc.rect(MARGIN + 2, y - 4.6, CONTENT_W - 2, 9, 'F');
  doc.setDrawColor(...P.GOLD); doc.setLineWidth(1); doc.line(MARGIN, y - 4.6, MARGIN, y + 4.4);
  doc.setFont(undefined, 'bold'); doc.setFontSize(8.5); doc.setTextColor(60);
  doc.text(`THIS CONTAINER WAS ${inward ? 'RECEIVED' : 'RELEASED'} IN GOOD CONDITION EXCEPT AS NOTED ABOVE.`, MARGIN + 5, y + 0.9);
  doc.setTextColor(...P.INK);
  y += LV.stmt;
  // the system note "Booking REF · name · phone" is internal; keep it off the printed slip
  if (slipNotes) {
    doc.setFont(undefined, 'normal'); doc.setFontSize(LV.noteFs);
    const noteLines = doc.splitTextToSize(slipNotes, CONTENT_W - 4).slice(0, 5);
    const boxH = LV.noteBase + noteLines.length * LV.noteLh;
    if (y + boxH > 285) { doc.addPage(); y = 20; }
    doc.setDrawColor(P.HAIR); doc.setLineWidth(0.25); doc.rect(MARGIN, y, CONTENT_W, boxH);
    doc.setFont(undefined, 'bold'); doc.setFontSize(6.4); doc.setTextColor(...P.CAP);
    doc.text('REMARKS', MARGIN + 2.2, y + 4.2);
    doc.setFont(undefined, 'normal'); doc.setFontSize(LV.noteFs); doc.setTextColor(20);
    doc.text(noteLines, MARGIN + 2, y + 8.6 - (9 - LV.noteBase), { lineHeightFactor: LV.noteLh / (LV.noteFs * 0.3528) });
    y += boxH + 4;
  }

  // ---- sign-off: surveyed / issued by, printed by, official stamp ----------------------
  let soY = Math.max(y + 4, PAGE_BOTTOM - SO_H);
  if (soY + SO_H > PAGE_BOTTOM + 1) { doc.addPage(); soY = 20; }
  ghPdfSignOff(doc, MARGIN, soY, CONTENT_W, {
    surveyLabel: inward ? 'Surveyed by' : 'Issued by (clerk)', surveyor: ic.clerkName || '',
    surveyedAt: inward ? (ic.surveyedAt || ic.depotInAt || ic.date) : ic.date,
    printedBy: opts.printedBy || '', printedAt: new Date(),
  });

  return { doc, filename: `interchange-${(ic.container || ic.id).replace(/\s+/g, '')}.pdf` };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
   OUTWARD EIR  —  "Container Interchange Report / Receipt" (the paper form, reproduced exactly)
   Layout: title + EIR no · shipper / reference / date / time · container + agent · final destination /
   release order / order date · ISO-size-type-vessel-voyage-MTWT-MGWT-CSC · transporter / truck / driver ·
   prepared by / releasing clerk · remarks / stamp · NB · "DATE IN / EIR IN / VESSEL IN / VOYAGE IN".
   Needs supabase_outward_eir_migration.sql for: interchange.release_order_date / final_destination /
   csc_approval and depot_surveys.csc_approval. Until it is run, those boxes simply print blank.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
const IC_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function icFmtDMY(v) {                                     // 12-Nov-2025  (date-only values are not shifted by time zone)
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (m && String(v).length <= 10) return m[3] + '-' + IC_MON[Number(m[2]) - 1] + '-' + m[1];
  const d = new Date(v); if (isNaN(d)) return '';
  return String(d.getDate()).padStart(2, '0') + '-' + IC_MON[d.getMonth()] + '-' + d.getFullYear();
}
function icFmtTime12(v) {                                  // 10:48 AM
  const d = new Date(v); if (isNaN(d)) return '';
  const h = d.getHours(), h12 = h % 12 || 12;
  return String(h12).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
}

/* Everything the outward slip needs that is not on the outward record itself. Run before building the PDF. */
async function icSlipPrefetch(ic) {
  if (!ic || isInwardMovement(ic.type)) return;
  const S = ic._slip = { extra: {}, inward: null, survey: null, trip: null };
  try {                                                    // the dispatch trip this outward record was issued from
    const tid = typeof gxOutwardIcId === 'function' ? gxOutwardIcId(ic.id) : null;
    if (tid) S.trip = (state.db.trips || []).find(t => String(t.id).toLowerCase() === tid) || null;
  } catch (e) { /* no trip: fine */ }

  const key = normContainerKey(ic.container);             // the inward record this container came in on
  let rows = (state.db.interchange || []).filter(i => normContainerKey(i.container) === key);
  if (window.ICR && ICR.enabled && navigator.onLine) { try { rows = rows.concat(await ICR.byContainer(String(ic.container).trim().toUpperCase())); } catch (e) { /* use what is on this device */ } }
  const seen = new Map(); rows.forEach(r => seen.set(r.id, r));
  const outAt = new Date(ic.date).getTime() + 86400000;
  const ins = Array.from(seen.values()).filter(i => isInwardMovement(i.type) && !icAwaitingSurvey(i)).sort((a, b) => new Date(b.date) - new Date(a.date));
  S.inward = ins.find(i => i.eirNumber && new Date(i.date).getTime() <= outAt) || ins.find(i => i.eirNumber) || ins[0] || null;

  S.names = {};
  if (!navigator.onLine || typeof supabase === 'undefined') return;
  try {
    const { data, error } = await supabase.from('interchange').select('release_order_date,final_destination,csc_approval').eq('id', ic.id).maybeSingle();
    if (!error && data) S.extra = data;                    // error = migration not run yet: boxes stay blank
  } catch (e) { /* ignore */ }
  /* Line, truck and driver are stored as ids. If this device's lists do not hold them (older copy, partial load), ask the database,
     so the slip prints a name and never a raw id. */
  try {
    if (ic.line && !(state.db.shippingLines || []).some(l => l.id === ic.line)) {
      const r = await supabase.from('shipping_lines').select('code,name').eq('id', ic.line).maybeSingle();
      if (r.data) S.names.line = r.data.name || r.data.code || '';
    }
    if (ic.truck && !ic.truckRegText && !(state.db.trucks || []).some(t => t.id === ic.truck)) {
      const r = await supabase.from('trucks').select('reg').eq('id', ic.truck).maybeSingle();
      if (r.data) S.names.truck = r.data.reg || '';
    }
    if (ic.driver && (!ic.driverNameText || !ic.driverIdNumber) && !(state.db.drivers || []).some(d => d.id === ic.driver)) {
      const r = await supabase.from('drivers').select('name,id_no').eq('id', ic.driver).maybeSingle();
      if (r.data) { S.names.driver = r.data.name || ''; S.names.driverId = r.data.id_no || ''; }
    }
  } catch (e) { /* the slip prints what it has */ }
  /* No inward interchange for this container? Use its inward movement in the Gate Processes records, if one was logged. */
  if (!S.inward) {
    try {
      const pat = '%' + String(ic.container || '').toUpperCase().replace(/[^A-Z0-9]/g, '').split('').join('%') + '%';   // matches any spacing / dashes
      const g = await supabase.from('gate_records').select('direction,record_date,time_at,eir_no,line,size_ft,truck_no,trailer_no,driver_name,id_no,company')
        .ilike('container_no', pat).eq('direction', 'in').order('record_date', { ascending: false }).limit(1);
      if (!g.error && g.data && g.data[0]) S.gate = g.data[0];
    } catch (e) { /* gate records are optional */ }
  }
  if (S.inward && S.inward.surveyId) {
    try {
      let r = await supabase.from('depot_surveys').select('tare_weight,mgwt,iso_code,csc_approval').eq('id', S.inward.surveyId).maybeSingle();
      if (r.error) r = await supabase.from('depot_surveys').select('tare_weight,mgwt,iso_code').eq('id', S.inward.surveyId).maybeSingle();
      if (!r.error && r.data) S.survey = r.data;
    } catch (e) { /* ignore */ }
  }
}

function icBuildOutwardSlip(ic, doc, opts) {
  opts = opts || {};
  const S = ic._slip || {}, X = S.extra || {}, inw = S.inward || null, sv = S.survey || {}, trip = S.trip || null;
  const U = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase();
  const num = v => (v === '' || v == null || !isFinite(Number(v)) || Number(v) <= 0) ? '' : String(Number(v));
  const M = 14, W = 182, LINE = IC_PAL.HAIR, INK = 20, VAL = 30, P = IC_PAL;

  // ── data ──────────────────────────────────────────────────────────────────────────────
  const N = S.names || {}, G = S.gate || null;
  const lineRec = (state.db.shippingLines || []).find(l => l.id === ic.line);
  const agent = lineRec ? (lineRec.name || lineRec.code || '') : (N.line || '');           // a name, never the id
  const sz = ic.ctype ? decomposeCtype(ic.ctype) : (G && G.size_ft ? { size: String(G.size_ft), type: '' } : { size: '', type: '' });
  const drv = ic.driver ? (state.db.drivers || []).find(d => d.id === ic.driver) : null;
  const trk = ic.truck ? (state.db.trucks || []).find(t => t.id === ic.truck) : null;
  const truckReg = ic.truckRegText || (trk && trk.reg) || N.truck || '';
  const tripRef = trip && trip.ref && !/^REF-\d+$/.test(trip.ref) ? trip.ref : '';
  const rmk = String(ic.notes || '').trim();
  const userRemark = /^(Auto-issued|Booking\s)/.test(rmk) ? '' : rmk;     // system notes are internal: never printed
  const D = {
    eir: ic.eirNumber || '',
    shipper: ic.receivingParty || (trip && trip.receivingParty) || ic.deliveringParty || '',
    reference: tripRef || ic.guaranteeNo || ic.blNumber || (inw && (inw.guaranteeNo || inw.blNumber)) || '',
    date: icFmtDMY(ic.date), time: icFmtTime12(ic.date),
    container: ic.container || '', agent,
    finalDest: X.final_destination || (trip && trip.dest && trip.dest !== '—' ? trip.dest : ''),
    releaseNo: ic.releaseOrderNo || (trip && trip.releaseOrderNo) || '',
    releaseDate: icFmtDMY(X.release_order_date),
    iso: ic.isoCode || sv.iso_code || (inw && inw.isoCode) || '',
    size: String(sz.size || '').replace(/ft$/i, ''), type: sz.type || '',
    vessel: ic.vessel || (trip && trip.vessel) || '', voyage: ic.voyage || (trip && trip.voyage) || '',
    mtwt: num(trip && trip.tareKg) || num(sv.tare_weight), mgwt: num(trip && trip.mgwKg) || num(sv.mgwt) || num(ic.grossWeight) || num(inw && inw.grossWeight),   // weights typed on the dispatch form win
    csc: X.csc_approval || sv.csc_approval || '',
    transporter: ic.transporter || '',
    lorry: [truckReg, ic.trailerNo].filter(Boolean).join('/'),
    driver: ic.driverNameText || (trip && trip.driverNameText) || (drv && drv.name) || N.driver || '',
    driverId: ic.driverIdNumber || (trip && trip.driverIdNo) || (drv && (drv.idNo || drv.id_no)) || N.driverId || '',
    preparedBy: opts.printedBy || '', clerk: ic.clerkName || '',
    remarks: [ic.condition, userRemark].filter(Boolean).join(' — '),
    inDate: inw ? icFmtDMY(inw.date) : (G ? icFmtDMY(G.record_date) : ''), inEir: inw ? inw.eirNumber || '' : (G ? G.eir_no || '' : ''), inVessel: inw ? inw.vessel || '' : '', inVoyage: inw ? inw.voyage || '' : '',
  };

  // ── drawing helpers (mm, A4) ────────────────────────────────────────────────────────────
  const box = (x, y, w, h) => { doc.setDrawColor(LINE); doc.setLineWidth(0.25); doc.rect(x, y, w, h); };
  const ink = c => Array.isArray(c) ? doc.setTextColor(c[0], c[1], c[2]) : doc.setTextColor(c);
  const fill = (x, y, w, h, c) => { doc.setFillColor(c[0], c[1], c[2]); doc.rect(x, y, w, h, 'F'); };
  const label = (t, x, y, sz, align, col) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(sz || 6.8); ink(col || P.CAP); doc.text(t, x, y, align ? { align } : undefined); };
  const fit = (t, x, y, w, size, o) => {
    o = o || {}; let s = size;
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(s); ink(o.ink || VAL);
    while (s > 5 && doc.getTextWidth(t) > w) { s -= 0.25; doc.setFontSize(s); }
    doc.text(t, x, y, o.align ? { align: o.align } : undefined);
  };
  const lv = (x, y, w, h, cap, val, o) => {                // caption on top, value beneath
    box(x, y, w, h); label(cap, x + 2, y + 4.4);
    if (val) fit((o && o.raw) ? String(val) : U(val), x + 2, y + h - 3.4, w - 4, (o && o.size) || 9, o);
  };
  const inline = (x, y, w, h, cap, val) => {              // caption and value on one line
    box(x, y, w, h); label(cap, x + 2, y + h / 2 + 1.3, 8.4);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4);
    const off = doc.getTextWidth(cap) + 4;
    if (val) fit(U(val), x + off, y + h / 2 + 1.7, w - off - 2, 11, { bold: true, ink: INK });
  };
  const strip = (x, y, w, hH, hV, cap, val) => {            // caption row + value row (ISO … CSC block)
    fill(x, y, w, hH, P.BLUE_LT); box(x, y, w, hH); label(cap, x + w / 2, y + hH - 1.9, 6.6, 'center', P.BLUE);
    box(x, y + hH, w, hV); if (val) fit(U(val), x + w / 2, y + hH + hV - 2.6, w - 3, 9, { align: 'center' });
  };

  // ── page ───────────────────────────────────────────────────────────────────────────────
  ghPdfLetterhead(doc, M, 8, W);
  let y = 37;

  fill(M, y, 101, 11, P.GREEN_LT); box(M, y, 101, 11); label('CONTAINER INTERCHANGE REPORT / RECEIPT', M + 3, y + 6.9, 9, null, P.GREEN);
  fill(M + 101, y, 81, 11, P.BLUE_LT); box(M + 101, y, 81, 11); label('OUTWARD EIR NO.', M + 104, y + 6.9, 8, null, P.BLUE);
  if (D.eir) fit(U(D.eir), M + W - 3, y + 7.8, 38, 15, { bold: true, ink: P.BLUE, align: 'right' });
  y += 11;

  lv(M, y, 87, 13, 'SHIPPER NAME', D.shipper);
  lv(M + 87, y, 47, 13, 'REFERENCE No', D.reference);
  lv(M + 134, y, 25, 13, 'DATE', D.date, { size: 8.5, raw: true });
  lv(M + 159, y, 23, 13, 'TIME', D.time, { size: 8.5, raw: true });
  y += 13;

  inline(M, y, 84, 11, 'CONTAINER NO. :', D.container);
  inline(M + 84, y, 98, 11, 'AGENT / LINE :', D.agent);
  y += 11;

  lv(M, y, 90, 14, 'FINAL DESTINATION', D.finalDest);
  lv(M + 90, y, 50, 14, 'RELEASE ORDER NO.', D.releaseNo);
  lv(M + 140, y, 42, 14, 'R. ORDER DATE', D.releaseDate, { raw: true });
  y += 14;

  const strips = [['ISO', 20, D.iso], ['SIZE', 15, D.size], ['TYPE', 15, D.type], ['VESSEL NAME', 35, D.vessel], ['VOY NO.', 22, D.voyage],
                  ['MTWT', 19, D.mtwt], ['MGWT', 20, D.mgwt], ['CSC Approval', 36, D.csc]];
  let sx = M; strips.forEach(s => { strip(sx, y, s[1], 6, 8, s[0], s[2]); sx += s[1]; });
  y += 14;

  lv(M, y, 38, 13, 'TRANSPORTER', D.transporter);
  lv(M + 38, y, 46, 13, 'TRUCK / TRAILER NO.', D.lorry);
  lv(M + 84, y, 44, 13, 'DRIVER NAME', D.driver);
  lv(M + 128, y, 34, 13, 'ID/DRIVING NO.', D.driverId);
  lv(M + 162, y, 20, 13, 'SIGN.', '');
  y += 13;

  lv(M, y, 100, 13, 'EIR PREPARED / COMPILED BY :', D.preparedBy, { size: 9.5 });
  lv(M + 100, y, 82, 13, 'LOADING / RELEASING CLERK :', D.clerk, { size: 9.5 });
  y += 13;

  lv(M, y, 100, 13, 'REMARKS :', D.remarks, { size: 9.5 });
  lv(M + 100, y, 82, 13, 'GHD SIGN / STAMP :', '');
  y += 13 + 6;

  fill(M + 2, y - 4.8, W - 2, 16, P.NOTE);
  doc.setDrawColor(P.GOLD[0], P.GOLD[1], P.GOLD[2]); doc.setLineWidth(1); doc.line(M, y - 4.8, M, y + 11.2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.8); doc.setTextColor(60);
  doc.text(['NB: CONTAINER RELEASED / RECEIVED IN GOOD CONDITION.',
            'IT IS THE RESPONSIBILITY OF THE SHIPPER / TRANSPORTER / AGENT FOR ANY LOSS / DAMAGE',
            'OR CLEANLINESS OF THE EQUIPMENT AFTER IT HAS LEFT THE DEPOT.'], M + 5, y, { lineHeightFactor: 1.4 });

  // ── "came in on" block, fixed at the foot of the page ──────────────────────────────────────
  const fy = 262, cols = [['DATE IN', 41, D.inDate], ['EIR IN', 42, D.inEir], ['VESSEL IN', 53, D.inVessel], ['VOYAGE IN', 46, D.inVoyage]];
  let fx = M; cols.forEach(c => {
    fill(fx, fy, c[1], 7, P.GREEN_LT); box(fx, fy, c[1], 7); label(c[0], fx + c[1] / 2, fy + 4.8, 7.4, 'center', P.GREEN);
    box(fx, fy + 7, c[1], 8); if (c[2]) fit(c[0] === 'DATE IN' ? String(c[2]) : U(c[2]), fx + c[1] / 2, fy + 12.4, c[1] - 3, 9, { align: 'center' });
    fx += c[1];
  });
  doc.setTextColor(INK); doc.setDrawColor(INK);

  return { doc, filename: `interchange-${String(ic.container || ic.id).replace(/\s+/g, '')}.pdf` };
}

/* Small editor for the boxes the dispatch / gate records do not capture. Saves with a targeted update, so a record that was
   loaded without its photos (on-demand mode) is never overwritten. */
async function icEditOutwardDetails(id) {
  let ic = (state.db.interchange || []).find(i => i.id === id);
  if (!ic && window.ICR) { try { ic = await ICR.ensureRow(id); } catch (e) { /* fall through */ } }
  if (!ic) { toast('Record not found on this device', 'error'); return; }
  await icSlipPrefetch(ic);
  const S = ic._slip || {}, X = S.extra || {}, sv = S.survey || {}, trip = S.trip || null;
  const f = (k, l, v, ex) => `<div class="fg"><label>${l}</label><input id="oe_${k}" value="${sanitize(v || '')}" ${ex || ''}/></div>`;
  openModal('Outward EIR details — ' + sanitize(ic.container), `
    <div class="ops-notice" style="margin-bottom:12px">These print in the matching boxes of the outward EIR. Leave a box empty to print it blank.</div>
    ${f('shipper', 'Shipper name', ic.receivingParty || (trip && trip.receivingParty) || ic.deliveringParty)}
    <div class="form-row-2">${f('dest', 'Final destination', X.final_destination || (trip && trip.dest !== '—' ? trip.dest : ''), 'placeholder="e.g. Shippers own"')}
    ${f('rel', 'Release order no.', ic.releaseOrderNo || (trip && trip.releaseOrderNo))}</div>
    <div class="form-row-2">${f('reldate', 'Release order date', X.release_order_date ? String(X.release_order_date).slice(0, 10) : '', 'type="date"')}
    ${f('csc', 'CSC approval', X.csc_approval || sv.csc_approval, 'placeholder="e.g. USA/AB-077/10-10"')}</div>
    <div class="form-row-2">${f('trp', 'Transporter', ic.transporter)}${f('trl', 'Trailer no.', ic.trailerNo)}</div>
    ${f('did', 'Driver ID / driving licence no.', ic.driverIdNumber)}
    <button class="submit-btn" onclick="icEditOutwardSave('${sanitize(id)}')">Save details →</button>`);
}
async function icEditOutwardSave(id) {
  const ic = (state.db.interchange || []).find(i => i.id === id);
  if (!ic) { closeModal(); return; }
  if (!navigator.onLine) { toast('You are offline — connect to save these details.', 'error'); return; }
  const v = k => sanitize(((document.getElementById('oe_' + k) || {}).value || '').trim());
  const patch = {
    receiving_party: v('shipper') || null, final_destination: v('dest') || null, release_order_no: v('rel') || null,
    release_order_date: v('reldate') || null, csc_approval: v('csc') || null,
    transporter: v('trp') || null, trailer_no: v('trl') || null, driver_id_number: v('did') || null,
  };
  const { error } = await supabase.from('interchange').update(patch).eq('id', id);
  if (error) {
    const missing = /release_order_date|final_destination|csc_approval/i.test(error.message || '');
    toast(missing ? 'Database not updated yet — run supabase_outward_eir_migration.sql first.' : 'Could not save: ' + error.message, 'error', 8000);
    return;
  }
  ic.receivingParty = patch.receiving_party || ''; ic.releaseOrderNo = patch.release_order_no || '';
  ic.transporter = patch.transporter || ''; ic.trailerNo = patch.trailer_no || ''; ic.driverIdNumber = patch.driver_id_number || '';
  if (ic._slip) ic._slip.extra = { release_order_date: patch.release_order_date, final_destination: patch.final_destination, csc_approval: patch.csc_approval };
  try { addAudit(state.profile.username, 'Outward EIR Details Edited', `${ic.container} · ${ic.eirNumber || ''}`); } catch (e) {}
  closeModal(); toast('Outward EIR details saved', 'success');
  if (window.GargoDocs) GargoDocs.eir(id, 'preview');
}

/* Asks whoever is printing for their two names and logs it. Returns the name, or null if cancelled. */
async function icPrinter(ic, what) {
  if (typeof ghAskPrinter !== 'function') return '';
  const by = await ghAskPrinter({ title: (what || 'Interchange') + ' — who is printing?', detail: ic ? [ic.container, ic.eirNumber].filter(Boolean).join(' · ') : '' });
  if (by) { try { addAudit((state.profile && state.profile.username) || 'system', (what || 'Interchange') + ' Printed', (ic ? [ic.container, ic.eirNumber].filter(Boolean).join(' · ') + ' · ' : '') + 'by ' + by); } catch (e) {} }
  return by;
}

/* ── Driver phone: registered drivers carry it; for typed-in drivers it is the "Phone Number" on the survey ── */
window._icPhone = window._icPhone || {};
function icDriverPhone(ic) {
  if (!ic) return '';
  const d = ic.driver ? (state.db.drivers || []).find(x => x.id === ic.driver) : null;
  if (d && d.phone) return d.phone;
  if (ic.driverPhone) return ic.driverPhone;
  return (ic.surveyId && window._icPhone[ic.surveyId]) || '';
}
async function icPhonesLoad(list) {
  if (!navigator.onLine || typeof supabase === 'undefined') return false;
  const ids = Array.from(new Set((list || []).filter(ic => ic && ic.surveyId && !icDriverPhone(ic) && !(ic.surveyId in window._icPhone)).map(ic => ic.surveyId)));
  if (!ids.length) return false;
  ids.forEach(i => { window._icPhone[i] = ''; });
  try {
    const { data, error } = await supabase.from('depot_surveys').select('id,gate_pass_number').in('id', ids);
    if (error) return false;
    (data || []).forEach(r => { window._icPhone[r.id] = r.gate_pass_number || ''; });
    return (data || []).some(r => r.gate_pass_number);
  } catch (e) { return false; }
}

/* An interchange becomes approved automatically once it has been printed / downloaded. */
function icAutoApprove(ic) {
  if (!ic || ic.status !== 'pending' || icAwaitingSurvey(ic)) return;
  ic.status = 'approved'; ic._dirty = true;
  try { scheduleSave(); buildBadges(); } catch (e) {}
  try { addAudit((state.profile && state.profile.username) || 'system', 'Interchange Approved', ic.container + ' (auto, on print)'); } catch (e) {}
  try { if (typeof renderInterchange === 'function' && document.getElementById('icxList')) renderInterchange(typeof _icFilter !== 'undefined' ? _icFilter : undefined); } catch (e) {}
}

async function downloadInterchangeSlip(icId) {
  const ic = state.db.interchange.find(x => x.id === icId);
  if (ic && !icAwaitingSurvey(ic)) await ensureEirNumber(ic);
  if (ic) { try { await icSlipPrefetch(ic); } catch (e) { console.warn('slip data', e); } }
  try { await icPhonesLoad([ic]); } catch (e) {}
  const by = await icPrinter(ic); if (by === null) return;
  const r = buildInterchangeSlip(icId, { printedBy: by });
  if (r) { r.doc.save(r.filename); icAutoApprove(ic); }
}

async function printInterchangeSlip(icId) {
  const ic = state.db.interchange.find(x => x.id === icId);
  if (ic && !icAwaitingSurvey(ic)) await ensureEirNumber(ic);
  if (ic) { try { await icSlipPrefetch(ic); } catch (e) { console.warn('slip data', e); } }
  try { await icPhonesLoad([ic]); } catch (e) {}
  const by = await icPrinter(ic); if (by === null) return;
  const r = buildInterchangeSlip(icId, { printedBy: by });
  if (r) { ghPrintPdf(r.doc); icAutoApprove(ic); }
}

/* Survey photos + the container file (post-repair, damage, seal, other), as images a PDF can embed. */
async function collectInspectionPhotos(s) {
  const out = { survey: [], post_repair: [], other: [] }, seen = new Set(), MAXG = 12;
  const push = (grp, url, title) => { if (!url || typeof url !== 'string' || seen.has(url) || out[grp].length >= MAXG) return; seen.add(url); out[grp].push({ url, title: title || '' }); };
  (Array.isArray(s.photos) ? s.photos : []).forEach((p, i) => push('survey', typeof p === 'string' ? p : (p && p.url), 'Survey photo ' + (i + 1)));
  try {
    if (window.GargoPhotos && s.container) {
      (await GargoPhotos.list(s.container, true)).forEach(r => push(r.category === 'survey' ? 'survey' : (r.category === 'post_repair' ? 'post_repair' : 'other'), r.url, r.title || GargoPhotos.catLabel(r.category)));
    }
  } catch (e) { console.warn('container photo file not loaded', e); }
  const all = [].concat(out.survey, out.post_repair, out.other);
  for (let i = 0; i < all.length; i += 4) await Promise.all(all.slice(i, i + 4).map(async ph => { ph.data = window.GargoPhotos ? await GargoPhotos.toDataUrl(ph.url) : (/^data:/.test(ph.url) ? ph.url : ''); }));
  return out;
}

async function buildInspectionReport(surveyId, opts) {
  opts = opts || {};
  if (!surveyId) { toast('No survey on file for this record', 'error'); return null; }
  let s = (_surveyRegisterData.find(x => x.id === surveyId)) || _surveyLookupCache[surveyId];
  if (!s) {

    s = await window.bookingDocs.surveyById(surveyId);
    if (s) _surveyLookupCache[s.id] = s;
  }
  if (!s) { toast('Survey record not found', 'error'); return null; }
  if (!window.jspdf) { toast('PDF library still loading — try again in a moment', 'error'); return null; }
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
    doc.setFont(undefined, 'bold'); doc.setTextColor(...(valueColor || [20,20,20]));
    // A value must never run into the next column: shrink it to fit (down to 7.5pt), then wrap onto a second line.
    const txt = String(value || '—'), maxW = Math.min(59, RIGHT - x);
    let fs = 9.5; doc.setFontSize(fs);
    while (fs > 7.5 && doc.getTextWidth(txt) > maxW) { fs -= 0.5; doc.setFontSize(fs); }
    if (doc.getTextWidth(txt) <= maxW) doc.text(txt, x, y + 5);
    else {
      let lines = doc.splitTextToSize(txt, maxW);
      if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] = lines[1].slice(0, -2) + '…'; }
      doc.text(lines, x, y + 4.6);
    }
    doc.setFontSize(9.5); doc.setTextColor(20);
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
  const damageTotal = repairs.reduce((sum, r) => sum + (Number(r.price) || Number(r.material) || (Number(r.hours||0) * GargoMoney.labourRate(GargoMoney.itemCur(r))) || 0), 0);
  const now = new Date();
  const reportId = `REP-INS-${String(s.id).replace(/-/g,'').slice(0,8).toUpperCase()}`;

  // ---- header ----------------------------------------------------------
  ghPdfLetterhead(doc, MARGIN, 6, CONTENT_W);
  doc.setFont(undefined, 'bold'); doc.setFontSize(13); doc.setTextColor(20);
  doc.text('CONTAINER INSPECTION REPORT', MARGIN, 38);
  doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(...GOLD);
  doc.text(reportId, RIGHT, 36, { align: 'right' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(120);
  doc.text(now.toLocaleString('en-KE'), RIGHT, 40.5, { align: 'right' });
  doc.setTextColor(20);

  // ---- report information panel (green) --------------------------------
  let y = 45;
  infoBox(MARGIN, y, CONTENT_W, 18, [232, 245, 233]);
  kv(MARGIN + 4, y + 8, 'Report ID', reportId, GREEN);
  kv(MARGIN + 4, y + 15.5, 'Type', 'Container Inspection Report', GREEN);
  kv(MARGIN + 95, y + 8, 'Generated', fmtDate(now.toISOString()), GREEN);
  kv(MARGIN + 95, y + 15.5, 'Printed By', opts.printedBy || '—', GREEN);
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
  kv(MARGIN + 63, y, 'Overall Condition', conditionStatusLabel(s.condition_status).toUpperCase());
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
  kv(MARGIN + 63, y, 'Phone Number', s.gate_pass_number);
  y += 18;

  // ---- Form Designer fields saved with this survey (cf_* columns of depot_surveys) ---------------------
  const extraVals = (window.GargoForms && GargoForms.valuesFromRow) ? GargoForms.valuesFromRow('survey', s) : [];
  if (extraVals.length) {
    y = ensureSpace(y, 26); sectionHeading('Additional Details', y); y += 8;
    extraVals.forEach((x, i) => {
      if (i && i % 3 === 0) { y += 12; y = ensureSpace(y, 14); }
      const v = String(x.value); kv(MARGIN + (i % 3) * 63, y, x.label, v.length > 34 ? v.slice(0, 33) + '…' : v);
    });
    y += 18;
  }

  // ---- inspection results summary strip -----------------------------------
  y = ensureSpace(y, 24);
  const stripW = CONTENT_W / 3 - 3;
  [
    { label: 'DAMAGE REPORTS', value: String(repairs.length) },
    { label: 'EST. REPAIR COST', value: GargoMoney.fmt(damageTotal, GargoMoney.itemsCur(repairs)) },
    { label: 'CONDITION', value: conditionStatusLabel(s.condition_status).toUpperCase() },
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

  // ---- photos: survey, post-repair and any other labelled photos from the container file --------
  const photoGroups = await collectInspectionPhotos(s);
  const photoSection = (title, list) => {
    if (!list.length) return;
    y = ensureSpace(y, 60); sectionHeading(`${title} (${list.length})`, y); y += 6;
    const cellW = (CONTENT_W - 8) / 3, cellH = 40, capH = 8;
    for (let i = 0; i < list.length; i += 3) {
      y = ensureSpace(y, cellH + capH + 2);
      list.slice(i, i + 3).forEach((ph, c) => {
        const px = MARGIN + c * (cellW + 4);
        doc.setDrawColor(210); doc.setLineWidth(0.3); doc.rect(px, y, cellW, cellH, 'S');
        let drawn = false;
        if (ph.data) {
          try {
            const p = doc.getImageProperties(ph.data), sc = Math.min((cellW - 2) / p.width, (cellH - 2) / p.height), dw = p.width * sc, dh = p.height * sc;
            doc.addImage(ph.data, undefined, px + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh, undefined, 'FAST'); drawn = true;
          } catch (e) { /* unreadable image */ }
        }
        if (!drawn) { doc.setFont(undefined, 'italic'); doc.setFontSize(7); doc.setTextColor(150); doc.text('image unavailable', px + cellW / 2, y + cellH / 2, { align: 'center' }); }
        doc.setFont(undefined, 'normal'); doc.setFontSize(6.8); doc.setTextColor(80);
        doc.text(doc.splitTextToSize(String(ph.title || ''), cellW - 1).slice(0, 2), px + 0.5, y + cellH + 3.4);
      });
      y += cellH + capH + 2;
    }
    doc.setTextColor(20); y += 4;
  };
  photoSection('Inspection Photos', photoGroups.survey);
  photoSection('Post-Repair Photos', photoGroups.post_repair);
  photoSection('Other Photos', photoGroups.other);

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
      const price = Number(r.price) || Number(r.material) || (Number(r.hours||0) * GargoMoney.labourRate(GargoMoney.itemCur(r))) || 0;
      doc.setDrawColor(210); doc.setLineWidth(0.3); doc.roundedRect(MARGIN, y, CONTENT_W, 26, 1.5, 1.5, 'S');
      doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(20);
      doc.text(`${r.item || r.category || 'Damage Item'}`, MARGIN + 3, y + 6);
      doc.setFillColor(219, 234, 254); doc.roundedRect(RIGHT - 24, y + 2.5, 20, 5, 1, 1, 'F');
      doc.setFont(undefined, 'bold'); doc.setFontSize(6.5); doc.setTextColor(...BLUE);
      doc.text('MINOR', RIGHT - 14, y + 6, { align: 'center' });
      doc.setTextColor(20);
      kv(MARGIN + 3, y + 15, 'Location', r.side || '—');
      kv(MARGIN + 63, y + 15, 'Damage / Repair Code', r.code || '—');
      kv(MARGIN + 126, y + 15, 'Tariff / Repair Price', GargoMoney.fmt(price, GargoMoney.itemCur(r)), [200,60,60]);
      y += 30;
    });
  }

  // ---- certification + sign-off -------------------------------------------------------
  y = ensureSpace(y, 70);
  doc.setDrawColor(20); doc.setLineWidth(0.5); doc.rect(MARGIN, y, CONTENT_W, 20);
  doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(20);
  doc.text('Certification', MARGIN + CONTENT_W / 2, y + 6.5, { align: 'center' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(80);
  doc.text(doc.splitTextToSize('This inspection report was generated by GARGO HAVEN DEPOT Ltd and represents an accurate record of the container inspection performed.', CONTENT_W - 8), MARGIN + CONTENT_W / 2, y + 12, { align: 'center' });
  y += 26;
  ghPdfSignOff(doc, MARGIN, y, CONTENT_W, { surveyLabel: 'Surveyed by', surveyor: s.clerk_name || '', surveyedAt: s.surveyed_at, printedBy: opts.printedBy || '', printedAt: now });

  return { doc, filename: `inspection-report-${(s.container || s.id).replace(/\s+/g, '')}.pdf` };
}

async function downloadInspectionReport(surveyId) {
  const by = await icPrinter(null, 'Inspection report'); if (by === null) return;
  const r = await buildInspectionReport(surveyId, { printedBy: by });
  if (r) r.doc.save(r.filename);
}

async function printInspectionReport(surveyId) {
  const by = await icPrinter(null, 'Inspection report'); if (by === null) return;
  const r = await buildInspectionReport(surveyId, { printedBy: by });
  if (r) ghPrintPdf(r.doc);
}

let _linesFilter='all';

function filterLines(f,btn){ _linesFilter=f; document.querySelectorAll('#sec-shippinglines .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderLines(f); }

/* ──────────────────────────────────────────────────────────────────
   SHIPPING LINES — full rate schedule (per line), edit, delete
   Rates live in shipping_lines.rates (jsonb): { serviceKey: { '20ft', '40ft', currency, freeDays? } }
   Service keys / labels come from window.SERVICE_RATE_SCHEDULE, in the order of the rates sheet.
────────────────────────────────────────────────────────────────── */
const LINE_RATE_GROUPS = [
  { title: 'Empty Container Charges', keys: ['lolo', 'loloBatch6'] },
  { title: 'Service Charge',          keys: ['serviceCharge'] },
  { title: 'Storage Charge',          keys: ['storage'] },
  { title: 'Transport Rate',          keys: ['transport'] },
  { title: 'Reefer Containers',       keys: ['reefer'] },
  { title: 'Other Charges',           keys: ['portPreStack1', 'lastMileTransport', 'photoCharges'] },
];
const LINE_RATE_KEYS = LINE_RATE_GROUPS.flatMap(g => g.keys);

function lineServiceDef(key) { return (window.SERVICE_RATE_SCHEDULE?.services || {})[key] || { label: key, unit: '' }; }

function officialServiceRates(code, key) {
  const sched = window.SERVICE_RATE_SCHEDULE || {};
  const ov = code ? sched.lineOverrides?.[String(code).trim().toUpperCase()] : null;
  const base = sched.services?.[key] || {};
  const ovDef = ov?.services?.[key];
  const freeDays = ovDef?.freeDays ?? base.freeDays ?? null;
  // A line billed in another currency (e.g. PIL in KES) only inherits the schedule figures for services it
  // explicitly overrides. The base figures are USD and are never converted, so the rest start blank.
  if (!ovDef && ov?.currency && ov.currency !== sched.currency) return { '20ft': null, '40ft': null, freeDays };
  const def = ovDef || base;
  return { '20ft': def.rates?.['20ft'] ?? null, '40ft': def.rates?.['40ft'] ?? null, freeDays };
}

// What this line is charged for a service: its saved rates if it has them, else the official schedule.
function lineServiceRates(l, key) {
  const s = l?.rates?.[key];
  if (s && typeof s === 'object' && ('20ft' in s || '40ft' in s)) {
    return { '20ft': s['20ft'] ?? null, '40ft': s['40ft'] ?? null, freeDays: s.freeDays ?? officialServiceRates(l.code, key).freeDays };
  }
  return officialServiceRates(l?.code, key);
}


// ── Custom billing items: any extra charge you invent per line (stored in shipping_lines.rates with custom:true) ──
function customRowHTML(prefix, key, it) {
  const v = x => (x == null ? '' : esc(x));
  return `<div class="${prefix}-crow" data-key="${esc(key)}" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px">
    <div class="form-row-2" style="margin-bottom:8px">
      <div class="fg" style="margin:0"><label>Item name</label><input class="crow-label" value="${v(it.label)}" placeholder="e.g. Gate pass fee"/></div>
      <div class="fg" style="margin:0"><label>Unit</label><input class="crow-unit" value="${v(it.unit)}" placeholder="per container"/></div>
    </div>
    <div class="form-row-2" style="margin-bottom:0">
      <div class="fg" style="margin:0"><label>20 ft</label><input class="crow-20" type="number" min="0" step="0.01" value="${v(it['20ft'])}"/></div>
      <div class="fg" style="margin:0"><label>40 ft</label><input class="crow-40" type="number" min="0" step="0.01" value="${v(it['40ft'])}"/></div>
    </div>
    <button type="button" class="tbl-btn" style="margin-top:8px" onclick="this.closest('.${prefix}-crow').remove()">Remove item</button>
  </div>`;
}

function customItemsHTML(prefix, l) {
  const items = Object.entries(l?.rates || {}).filter(([k, v]) => v && v.custom);
  return `<div style="margin:14px 0 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">Custom Billing Items</div>
    <div id="${prefix}_customList">${items.map(([k, v]) => customRowHTML(prefix, k, v)).join('')}</div>
    <button type="button" class="tbl-btn" style="margin-bottom:8px" onclick="addCustomLineItem('${prefix}')">+ Add billing item</button>`;
}

function addCustomLineItem(prefix) {
  const key = 'custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const list = document.getElementById(prefix + '_customList');
  if (list) list.insertAdjacentHTML('beforeend', customRowHTML(prefix, key, {}));
}

function lineRatesFormHTML(prefix, l, code) {
  const val = v => (v == null ? '' : esc(v));
  const touch = 'oninput="this.dataset.touched=\'1\'"';
  return LINE_RATE_GROUPS.map(g => `
    <div style="margin:14px 0 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">${esc(g.title)}</div>
    ${g.keys.map(key => {
      const def = lineServiceDef(key);
      const r = l ? lineServiceRates(l, key) : officialServiceRates(code, key);
      return `<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${esc(def.label)}</div>
        <div style="font-size:10.5px;color:var(--text-3);margin:2px 0 8px">${esc(def.unit || '')}${def.uponRequestOnly ? ' \u00b7 upon request only' : ''}</div>
        <div class="form-row-2" style="margin-bottom:0">
          <div class="fg" style="margin:0"><label>20 ft</label><input id="${prefix}_r_${key}_20" type="number" min="0" step="0.01" value="${val(r['20ft'])}" ${touch}/></div>
          <div class="fg" style="margin:0"><label>40 ft</label><input id="${prefix}_r_${key}_40" type="number" min="0" step="0.01" value="${val(r['40ft'])}" ${touch}/></div>
        </div>
        ${key === 'storage' ? `<div class="fg" style="margin:8px 0 0"><label>Free storage period (days) \u2014 rates above apply thereafter</label><input id="${prefix}_r_storage_free" type="number" min="0" step="1" value="${val(r.freeDays)}" ${touch}/></div>` : ''}
        ${def.note ? `<div style="font-size:10.5px;color:var(--text-3);margin-top:6px">${esc(def.note)}</div>` : ''}
      </div>`;
    }).join('')}`).join('') +
    customItemsHTML(prefix, l) +
    `<div style="font-size:10.5px;color:var(--text-3);line-height:1.5;margin-top:2px">Leave a rate blank if that service is not charged for this line. Amounts are in the billing currency chosen above and are never converted.</div>`;
}

// Reads the rate inputs back. Per-service currency is kept as saved unless the line's billing currency was changed.
function readLineRatesForm(prefix, existing, currency, currencyChanged) {
  const out = {};
  let bad = null;
  const num = id => {
    const raw = (document.getElementById(id)?.value || '').trim();
    if (raw === '') return null;
    const n = parseFloat(raw);
    return (isFinite(n) && n >= 0) ? Math.round(n * 100) / 100 : NaN;
  };
  for (const key of LINE_RATE_KEYS) {
    const r20 = num(`${prefix}_r_${key}_20`), r40 = num(`${prefix}_r_${key}_40`);
    if (Number.isNaN(r20) || Number.isNaN(r40)) { bad = bad || lineServiceDef(key).label; continue; }
    const entry = { '20ft': r20, '40ft': r40 };
    if (key === 'storage') {
      const fd = num(`${prefix}_r_storage_free`);
      if (Number.isNaN(fd)) { bad = bad || 'Free storage period'; continue; }
      entry.freeDays = fd == null ? null : Math.round(fd);
    }
    const prev = existing?.[key]?.currency;
    entry.currency = (!currencyChanged && prev) ? prev : currency;
    out[key] = entry;
  }
  document.querySelectorAll('.' + prefix + '-crow').forEach(row => {
    const label = row.querySelector('.crow-label').value.trim();
    if (!label) return; // rows with no name are ignored
    const rd = sel => { const raw = row.querySelector(sel).value.trim(); if (raw === '') return null; const n = parseFloat(raw); return (isFinite(n) && n >= 0) ? Math.round(n * 100) / 100 : NaN; };
    const a = rd('.crow-20'), b = rd('.crow-40');
    if (Number.isNaN(a) || Number.isNaN(b)) { bad = bad || label; return; }
    const key = row.dataset.key;
    const prev = existing?.[key]?.currency;
    out[key] = { label, unit: row.querySelector('.crow-unit').value.trim(), '20ft': a, '40ft': b, currency: (!currencyChanged && prev) ? prev : currency, custom: true };
  });
  return { rates: out, error: bad ? `Invalid rate for "${bad}" \u2014 use a number of 0 or more` : null };
}

function lineLegacyRates(rates) {
  const r20 = Math.round(Number(rates?.lolo?.['20ft']) || 0), r40 = Math.round(Number(rates?.lolo?.['40ft']) || 0);
  return { rate20: r20, rate40: r40 };
}

// Add / Edit modals. Field ids sl_* (add) and sle_* (edit) are read by saveShippingLine / saveShippingLineEdit.
function lineCurrencyHint(extra) {
  return `<div style="font-size:11px;color:var(--text-3);margin-top:4px">${extra}Rates are never auto-converted \u2014 pick the currency this line actually invoices in (e.g. PIL bills in KES cash).</div>`;
}

function showEditLineModal(id) {
  if (!canFinance()) { toast('Admin or Finance rights required', 'error'); return; }
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l) { toast('Shipping line not found', 'error'); return; }
  const cur = l.currency || (l.code === 'PIL' ? 'KES' : 'USD');
  openModal(`Edit ${l.code} \u2014 ${l.name}`, `
    <div class="form-row-2">
      <div class="fg"><label>Code</label><input id="sle_code" value="${esc(l.code)}" maxlength="30"/></div>
      <div class="fg"><label>Full Name</label><input id="sle_name" value="${esc(l.name)}"/></div>
    </div>
    <div class="fg"><label>Contact Email</label><input id="sle_email" type="email" value="${esc(l.contact || '')}"/></div>
    <div class="fg"><label>Billing Currency</label>
      <select id="sle_currency"><option value="USD" ${cur === 'USD' ? 'selected' : ''}>USD (per official schedule)</option><option value="KES" ${cur === 'KES' ? 'selected' : ''}>KES \u2014 cash</option></select>
      ${lineCurrencyHint('')}
    </div>
    ${lineRatesFormHTML('sle', l)}
    <div class="fg" style="margin-top:14px"><label>Status</label><select id="sle_active"><option value="true" ${l.active ? 'selected' : ''}>Active</option><option value="false" ${!l.active ? 'selected' : ''}>Inactive</option></select></div>
    <button class="submit-btn" onclick="saveShippingLineEdit('${esc(l.id)}')">Save Changes \u2192</button>
    ${canFinance() ? `<button class="modal-btn danger" style="width:100%;margin-top:8px" onclick="deleteShippingLine('${esc(l.id)}')">\ud83d\uddd1 Delete ${esc(l.code)}\u2026</button>` : ''}`);
}

function showAddLineModal() {
  if (!canFinance()) { toast('Admin or Finance rights required', 'error'); return; }
  openModal('Add Shipping Line', `
    <div class="form-row-2">
      <div class="fg"><label>Code</label><input id="sl_code" placeholder="MSC" maxlength="30" oninput="applyOfficialLineDefaults(this.value)"/></div>
      <div class="fg"><label>Full Name</label><input id="sl_name" placeholder="Mediterranean Shipping Co."/></div>
    </div>
    <div class="fg"><label>Contact Email</label><input id="sl_email" type="email" placeholder="office@line.com"/></div>
    <div class="fg"><label>Billing Currency</label>
      <select id="sl_currency" onchange="this.dataset.touched='1'"><option value="USD" selected>USD (per official schedule)</option><option value="KES">KES \u2014 cash</option></select>
      ${lineCurrencyHint('Rates below start from the official schedule and update as you type the code (e.g. PIL \u2192 KES). Edit any of them. ')}
    </div>
    ${lineRatesFormHTML('sl', null, '')}
    <button class="submit-btn" onclick="saveShippingLine()">Add Line \u2192</button>`);
}

// Live-fills the Add form from the official schedule as the code is typed. Only fields the user hasn't
// touched are replaced, so typing a code never overwrites rates that were entered by hand.
function applyOfficialLineDefaults(codeRaw) {
  const code = (codeRaw || '').trim().toUpperCase();
  const cur = document.getElementById('sl_currency');
  if (cur && !cur.dataset.touched && typeof getOfficialLineRates === 'function') cur.value = getOfficialLineRates(code).currency;
  const fill = (id, v) => { const el = document.getElementById(id); if (el && !el.dataset.touched) el.value = v == null ? '' : v; };
  LINE_RATE_KEYS.forEach(key => {
    const r = officialServiceRates(code, key);
    fill(`sl_r_${key}_20`, r['20ft']);
    fill(`sl_r_${key}_40`, r['40ft']);
    if (key === 'storage') fill('sl_r_storage_free', r.freeDays);
  });
}

function renderLines(f){
  let lines=f==='all'?state.db.shippingLines:state.db.shippingLines.filter(l=>l.active);
  const unmappedTotal = (state.db.interchange||[]).filter(ic=>!ic.line).length;
  const summary=document.getElementById('linesSummary');
  if(summary){
    summary.innerHTML=`<div class="panel"><div class="panel-head"><span class="panel-title">Summary</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Lines</span><span class="fsr-val">${state.db.shippingLines.length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Active</span><span class="fsr-val">${state.db.shippingLines.filter(l=>l.active).length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Trips (all)</span><span class="fsr-val">${state.db.trips.length}</span></div>${unmappedTotal?`<div class="fuel-summary-row"><span class="fsr-label" style="color:var(--gold)">\u26a0 Interchange records with no line</span><span class="fsr-val">${unmappedTotal}</span></div>`:''}</div>`;
  }
  const unmappedBtn = document.getElementById('unmappedVesselsBtn');
  if (unmappedBtn) { unmappedBtn.style.display = unmappedTotal ? 'inline-flex' : 'none'; unmappedBtn.textContent = `\u26a0 Resolve Unmapped Vessels (${unmappedTotal})`; }
  const grid=document.getElementById('linesGrid');
  if(!grid) return;
  grid.innerHTML=lines.map(l=>{
    const cur = lineCurrencySymbol(l);
    const lolo = lineServiceRates(l, 'lolo'), trn = lineServiceRates(l, 'transport');
    const show = v => v == null ? '\u2014' : fmt(v);
    return `<div class="line-card"><div class="line-code-badge">${esc(l.code)}</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${esc(l.name)}</div><div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${esc(l.contact||'')}</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><div class="ts">${cur} ${show(lolo['20ft'])}<b>LOLO 20ft</b></div><div class="ts">${cur} ${show(lolo['40ft'])}<b>LOLO 40ft</b></div><div class="ts">${cur} ${show(trn['20ft'])} / ${show(trn['40ft'])}<b>Transport 20/40</b></div></div><div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">${sbadge(l.active?'active':'off_duty')}<div style="display:flex;gap:6px"><button class="tbl-btn" onclick="showLineRateCard('${esc(l.id)}')">Rates</button>${canFinance()?`<button class="tbl-btn" onclick="showEditLineModal('${esc(l.id)}')">\u270e Edit</button>`:''}${isAdmin()?`<button class="tbl-btn" style="color:var(--red)" onclick="deleteShippingLine('${esc(l.id)}')">\ud83d\uddd1 Delete</button>`:''}</div></div></div>`;
  }).join('')||'<div class="empty-state"><div class="empty-state-label">No shipping lines</div></div>';
}

function showLineRateCard(id) {
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l) return;
  const cur = lineCurrencySymbol(l);
  const cell = v => v == null ? '<span style="color:var(--text-3)">\u2014</span>' : `${cur} ${fmt(v)}`;
  const rows = LINE_RATE_GROUPS.map(g => `<tr><td colspan="3" style="padding:12px 8px 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">${esc(g.title)}</td></tr>` +
    g.keys.map(key => {
      const def = lineServiceDef(key), r = lineServiceRates(l, key);
      const extra = key === 'storage' && r.freeDays != null ? `<div style="font-size:10px;color:var(--text-3)">Free for ${esc(r.freeDays)} days, then per day</div>` : (def.uponRequestOnly ? '<div style="font-size:10px;color:var(--text-3)">Upon request only</div>' : `<div style="font-size:10px;color:var(--text-3)">${esc(def.unit || '')}</div>`);
      return `<tr style="border-top:1px solid var(--border)"><td style="padding:7px 8px;font-size:12px">${esc(def.label)}${extra}</td><td class="mono" style="padding:7px 8px;text-align:right">${cell(r['20ft'])}</td><td class="mono" style="padding:7px 8px;text-align:right">${cell(r['40ft'])}</td></tr>`;
    }).join('')).join('');
  const customRows = Object.entries(l.rates || {}).filter(([k, v]) => v && v.custom).map(([k, v]) =>
    `<tr style="border-top:1px solid var(--border)"><td style="padding:7px 8px;font-size:12px">${esc(v.label)}<div style="font-size:10px;color:var(--text-3)">${esc(v.unit || '')}</div></td><td class="mono" style="padding:7px 8px;text-align:right">${cell(v['20ft'])}</td><td class="mono" style="padding:7px 8px;text-align:right">${cell(v['40ft'])}</td></tr>`).join('');
  const customBlock = customRows ? `<tr><td colspan="3" style="padding:12px 8px 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">Custom Billing Items</td></tr>` + customRows : '';
  openModal(`${esc(l.code)} \u2014 Rate Card`, `
    <div style="font-size:11.5px;color:var(--text-2);margin-bottom:8px">${esc(l.name)} \u00b7 billed in <b>${esc(l.currency || 'USD')}</b></div>
    <table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left;color:var(--text-3);font-size:10px;text-transform:uppercase;letter-spacing:1px"><th style="padding:6px 8px">Service</th><th style="padding:6px 8px;text-align:right">20 ft</th><th style="padding:6px 8px;text-align:right">40 ft</th></tr></thead><tbody>${rows}</tbody></table>
    ${canFinance() ? `<button class="submit-btn" style="margin-top:14px" onclick="showEditLineModal('${esc(l.id)}')">\u270e Edit this line</button>` : ''}`);
}

function saveShippingLineEdit(id) {
  if (!canFinance()) { toast('Admin or Finance rights required', 'error'); return; }
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l) { toast('Shipping line not found', 'error'); return; }
  const code = document.getElementById('sle_code').value.trim().toUpperCase();
  const name = document.getElementById('sle_name').value.trim();
  if (!code || !name) { toast('Code and name required', 'error'); return; }
  if (code.length > 30) { toast('Code must be max 30 characters', 'error'); return; }
  const dupLine = findLineByCode(code, id);
  if (dupLine) { toast(`Code ${code} is already used by ${dupLine.name}`, 'error'); return; }
  const currency = document.getElementById('sle_currency').value;
  const parsed = readLineRatesForm('sle', l.rates, currency, currency !== (l.currency || 'USD'));
  if (parsed.error) { toast(parsed.error, 'error', 5000); return; }

  const before = JSON.stringify(l.rates || {}) + '|' + l.currency;
  l.code = code;
  l.name = name;
  l.contact = sanitize(document.getElementById('sle_email').value.trim());
  l.currency = currency;
  l.rates = parsed.rates;
  Object.assign(l, lineLegacyRates(parsed.rates));
  l.rateHC = l.rate40;
  l.active = document.getElementById('sle_active').value === 'true';
  scheduleSave(); closeModal(); renderLines(_linesFilter);
  const changedRates = before !== (JSON.stringify(l.rates) + '|' + l.currency);
  addAudit(state.profile.username, changedRates ? 'Shipping Line Rates Updated' : 'Shipping Line Updated', `${code} \u2014 ${currency} \u00b7 LOLO 20ft ${l.rate20} / 40ft ${l.rate40}`);
  toast(`${code} updated`, 'success');
}

function saveShippingLine() {
  if (!canFinance()) { toast('Admin or Finance rights required', 'error'); return; }
  const code = document.getElementById('sl_code').value.trim().toUpperCase();
  const name = document.getElementById('sl_name').value.trim();
  if (!code||!name) { toast('Code and name required', 'error'); return; }
  if (code.length > 30) { toast('Code must be max 30 characters', 'error'); return; }
  const dupLine = findLineByCode(code);
  if (dupLine) { toast(`Code ${code} is already used by ${dupLine.name}`, 'error'); return; }
  const currency = document.getElementById('sl_currency').value;
  const parsed = readLineRatesForm('sl', null, currency, true);
  if (parsed.error) { toast(parsed.error, 'error', 5000); return; }
  const legacy = lineLegacyRates(parsed.rates);
  state.db.shippingLines.push({
    id: uid('SL'), code, name,
    contact: sanitize(document.getElementById('sl_email').value.trim()),
    currency, rates: parsed.rates,
    rate20: legacy.rate20, rate40: legacy.rate40, rateHC: legacy.rate40,
    active: true,
  });
  scheduleSave(); closeModal(); renderLines('all');
  addAudit(state.profile.username, 'Shipping Line Added', `${code} \u2014 ${name} (${currency})`);
  toast(`${code} added`, 'success');
}

async function setShippingLineActive(id, active) {
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l || !canFinance()) return;
  l.active = active;
  scheduleSave(); closeModal(); renderLines(_linesFilter);
  addAudit(state.profile.username, active ? 'Shipping Line Activated' : 'Shipping Line Deactivated', l.code);
  toast(`${l.code} marked ${active ? 'active' : 'inactive'}`, 'success');
}

// Simple delete: one confirmation, no blocking. Anything that pointed at the line is detached
// (left with no shipping line) and the line's own portal links / vessel mappings / overrides are removed.
function deleteShippingLine(id) {
  if (!canFinance()) { toast('Admin or Finance rights required to delete shipping lines', 'error'); return; }
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l) { toast('Shipping line not found', 'error'); return; }
  openModal(`Delete ${esc(l.code)}`, `
    <div class="vault-banner"><div class="vault-banner-label">\u26a0 IRREVERSIBLE ACTION</div><div class="vault-banner-desc">Permanently delete <b>${esc(l.code)} \u2014 ${esc(l.name)}</b> and its rate card. Trips, bookings, interchange and other records that used it are kept, but will show no shipping line.</div></div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="modal-btn danger" onclick="executeDeleteShippingLine('${esc(l.id)}')">Delete ${esc(l.code)}</button><button class="modal-btn ghost" onclick="closeModal()">Cancel</button></div>`);
}

async function executeDeleteShippingLine(id) {
  if (!canFinance()) { toast('Admin or Finance rights required', 'error'); return; }
  const idx = state.db.shippingLines.findIndex(x => x.id === id);
  if (idx === -1) return;
  const l = state.db.shippingLines[idx];
  const missing = e => e && (e.code === 'PGRST205' || e.code === '42P01' || /does not exist|schema cache/i.test(e.message || ''));

  const detach = [
    ['trips', 'shipping_line_id'], ['public_bookings', 'shipping_line_id'], ['interchange', 'line_id'],
    ['shutouts', 'line_id'], ['vessel_prestaking', 'line_id'], ['container_repairs', 'line_id'],
    ['depot_storage_zones', 'shipping_line_id'], ['depot_surveys', 'shipping_line_id'],
  ];
  const remove = [['shipping_line_users', 'shipping_line_id'], ['vessel_line_map', 'line_id'], ['shipping_line_rate_overrides', 'line_id']];

  for (const [table, col] of detach) {
    const { error } = await supabase.from(table).update({ [col]: null }).eq(col, id);
    if (error && !missing(error)) { toast(`Could not detach ${table} \u2014 ${error.message}`, 'error', 8000); return; }
  }
  for (const [table, col] of remove) {
    const { error } = await supabase.from(table).delete().eq(col, id);
    if (error && !missing(error)) { toast(`Could not clear ${table} \u2014 ${error.message}`, 'error', 8000); return; }
  }
  const { data, error } = await supabase.from('shipping_lines').delete().eq('id', id).select('id');
  if (error) { toast(`Could not delete \u2014 ${error.message}`, 'error', 8000); return; }
  if (!data || !data.length) { toast('Nothing was deleted \u2014 you may not have permission (Supabase RLS), or it is already gone', 'error', 8000); return; }

  // keep local state consistent so the next auto-save doesn't re-send the deleted id
  const clear = (arr, k) => (arr || []).forEach(r => { if (r[k] === id) { r[k] = ''; r._dirty = true; } });
  clear(state.db.trips, 'shippingLine'); clear(state.db.shutouts, 'line'); clear(state.db.interchange, 'line');
  clear(state.db.vesselPrestaking, 'line'); clear(state.db.containerRepairs, 'line');
  state.db.shippingLines.splice(idx, 1);
  state.db.vesselLineMap = (state.db.vesselLineMap || []).filter(m => (m.line || m.lineId || m.line_id) !== id);
  addAudit(state.profile.username, 'Shipping Line Deleted', `${l.code} \u2014 ${l.name}`);
  closeModal();
  renderLines(_linesFilter);
  toast(`${l.code} deleted`, 'success');
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
      const repairBadge = (i.repairs && i.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${i.repairs.length} damage item${i.repairs.length>1?'s':''} · ${GargoMoney.fmt(i.repairTotal||0, GargoMoney.itemsCur(i.repairs))}</div>` : '';
      const thumb = i.img ? `<img src="${i.img}" style="width:44px;height:44px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:pointer;flex-shrink:0" onclick="showContainerPhotos('${i.id}')" />` : `<div style="width:44px;height:44px;border-radius:5px;border:1px dashed var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:16px">📦</div>`;
      return `<div class="activity-row" style="align-items:flex-start;gap:10px">${thumb}<div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:11.5px;color:var(--text)">${i.type} · ${i.condition}</div>${sbadge(i.status)}</div><div style="font-size:10px;color:var(--text-3)">${lineName(i.line)} · ${fmtDate(i.date)}</div>${meta?`<div style="font-size:10px;color:var(--text-3);margin-top:2px">${meta}</div>`:''}${repairBadge}${i.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:3px">${i.notes}</div>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${(i.surveyId || i.img)?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="showContainerPhotos('${i.id}')">📷 Photos</button>`:''}${i.surveyId?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInspectionReport('${i.surveyId}')">⬇ Inspection Report</button><button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="printInspectionReport('${i.surveyId}')" title="Print">🖨 Print Report</button>`:''}<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInterchangeSlip('${i.id}')">⬇ Slip</button><button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="printInterchangeSlip('${i.id}')" title="Print">🖨 Print</button></div></div></div>`;
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

/* PERF: this used to put EVERY container number ever seen (trips + shutouts + interchange: tens of thousands) into one <datalist>
   and rebuild it after nearly every save. The browser re-filtered all of them on each keystroke in the container boxes.
   Now the list is built lazily, cached until data changes, and only the best ~30 matches are shown once 2+ characters are typed. */
let _chIndex = null;
function refreshContainerHistory() {
  _chIndex = null;                                           // data changed: rebuild on the next keystroke
  const dl = document.getElementById('containerHistory');
  if (dl && dl.firstChild) dl.innerHTML = '';
}
function _chBuild() {
  const labels = new Map();
  const tag = (c, label) => { if (c && !labels.has(c)) labels.set(c, label); };
  (state.db.trips||[]).forEach(t=>{
    if (!t.container) return;
    tag(t.container, t.bookingId ? 'Public Booking' : (t.notes && /bulk/i.test(t.notes) ? 'Bulk Upload' : 'Dispatch'));
  });
  (state.db.shutouts||[]).forEach(s=>{ tag(s.container, 'Shutout'); });
  (state.db.interchange||[]).forEach(i=>{ tag(i.container, 'Interchange'); });
  _chIndex = [...labels.keys()].sort().map(c => [c.toUpperCase(), c, labels.get(c)]);
}
function _chFill(q) {
  const dl = document.getElementById('containerHistory');
  if (!dl) return;
  q = String(q || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (q.length < 2) { if (dl.firstChild) dl.innerHTML = ''; return; }
  if (!_chIndex) _chBuild();
  const starts = [], inside = [];
  for (let k = 0; k < _chIndex.length && starts.length < 30; k++) {
    const e = _chIndex[k], p = e[0].replace(/[^A-Z0-9]/g, '').indexOf(q);
    if (p === 0) starts.push(e); else if (p > 0 && inside.length < 30) inside.push(e);
  }
  dl.innerHTML = starts.concat(inside).slice(0, 30).map(e => `<option value="${esc(e[1])}">${esc(e[2])}</option>`).join('');
}
document.addEventListener('input', e => { const el = e.target; if (el && el.getAttribute && el.getAttribute('list') === 'containerHistory') _chFill(el.value); }, true);

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
  return (items || []).reduce((sum, r) => sum + (Number(r.hours || 0) * GargoMoney.labourRate(GargoMoney.itemCur(r))) + Number(r.material || 0), 0);
}

/* Which tariff prices this form: PIL (KES) forms use the PIL schedule, everything else the GHD (USD) schedule.
   The currency is the single switch (it defaults from the shipping line and can be changed on the survey form),
   so a KES form can never be priced from USD figures. */
function tariffMode(prefix) {
  try { if (window.PIL_TARIFF_SCHEDULE && window.GargoMoney && GargoMoney.curFor(prefix) === 'KES') return 'PIL'; } catch (e) {}
  return 'GHD';
}
function tariffFor(prefix) {
  return (tariffMode(prefix) === 'PIL' ? window.PIL_TARIFF_SCHEDULE : (window.bookingDocs && window.bookingDocs.TARIFF_SCHEDULE)) || {};
}
function _tariffCatOptions(prefix) { return Object.keys(tariffFor(prefix)).sort().map(c => `<option>${esc(c)}</option>`).join(''); }
function _tariffNote(prefix) {
  if (tariffMode(prefix) !== 'PIL') return '';
  const want = Number((window.PIL_TARIFF_META || {}).labourRate) || 550;
  const have = (window.GargoMoney && GargoMoney.labourRate) ? GargoMoney.labourRate('KES') : 0;
  const warn = have !== want
    ? ` <span style="color:var(--amber)">Labour rate is set to KSh ${have}/hr but this tariff is built for KSh ${want}/hr, so totals will not match the PIL price list. An administrator sets it in Settings &rarr; Form Designer &rarr; Rules.</span>` : '';
  return `PIL tariff (KES): labour at KSh ${want}/hr plus material.${warn}`;
}
/* Re-point an open form's picker at the right tariff when its currency / line changes. Safe to call any time. */
function refreshTariffPicker(prefix) {
  const sel = document.getElementById(`${prefix}_tcat`); if (!sel) return;
  const mode = tariffMode(prefix);
  if (sel.getAttribute('data-tariff') !== mode) {
    sel.setAttribute('data-tariff', mode);
    sel.innerHTML = '<option value="">—</option>' + _tariffCatOptions(prefix);
    const codeSel = document.getElementById(`${prefix}_tcode`); if (codeSel) codeSel.innerHTML = '<option value="">Select category first…</option>';
    _tariffFill(prefix, null, '');
    const box = document.getElementById(`${prefix}_tsearch`); if (box) box.value = '';
    const out = document.getElementById(`${prefix}_tsearchResults`); if (out) { out.style.display = 'none'; out.innerHTML = ''; }
  }
  const note = document.getElementById(`${prefix}_tnote`);
  if (note) { const t = _tariffNote(prefix); note.innerHTML = t; note.style.display = t ? 'block' : 'none'; }
  const wrap = document.getElementById(`${prefix}_tsavewrap`); if (wrap) wrap.style.display = mode === 'PIL' ? 'none' : 'flex';   // the catalog editor is the GHD catalog
}

function tariffPickerHtml(prefix) {
  const categoryOptions = _tariffCatOptions(prefix);
  const canSave = (typeof canEditTariffCatalog === 'function') && canEditTariffCatalog();
  return `
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:16px 0 8px;display:flex;justify-content:space-between;align-items:center">
      <span>Damage / Repair Items</span>
      ${canSave ? `<button type="button" class="modal-btn ghost" style="padding:2px 8px;font-size:10px" onclick="openTariffCatalogEditor()">Edit tariff codes</button>` : ''}
    </div>
    <div class="fg"><label>Search tariff <span class="label-optional">(code or words, e.g. cold wash, D10)</span></label>
      <input id="${prefix}_tsearch" autocomplete="off" placeholder="Type to search every category…" oninput="onTariffSearch('${prefix}')" />
      <div id="${prefix}_tsearchResults" style="display:none;max-height:170px;overflow:auto;border:1px solid var(--border);border-radius:6px;margin-top:4px"></div>
    </div>
    <div id="${prefix}_tnote" style="display:none;font-size:11px;color:var(--text-2);margin:-2px 0 8px"></div>
    <div class="form-row-2">
      <div class="fg"><label>Category</label><select id="${prefix}_tcat" data-tariff="${tariffMode(prefix)}" onchange="onRepairCategoryChange('${prefix}')"><option value="">—</option>${categoryOptions}</select></div>
      <div class="fg"><label>Code / Item</label><select id="${prefix}_tcode" onchange="onRepairCodeChange('${prefix}')"><option value="">Select category first…</option></select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Code</label><input id="${prefix}_tcodetext" placeholder="Auto-filled — or type your own" /></div>
      <div class="fg"><label>Description</label><input id="${prefix}_titem" placeholder="Auto-filled — editable" /></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Hours</label><input id="${prefix}_thours" type="number" step="0.1" min="0" placeholder="0" /></div>
      <div class="fg"><label>Material (<span class="gx-cur" data-cur-for="${prefix}">USD</span>)</label><input id="${prefix}_tmaterial" type="number" step="0.01" min="0" placeholder="0" /></div>
    </div>
    <div class="fg"><label>Quantity <span class="label-optional">(how many of this item, e.g. 2 &mdash; or type "ABCD x2" in the search box)</span></label><input id="${prefix}_tqty" type="number" min="1" step="1" value="1" style="max-width:120px" /></div>
    ${canSave ? `<label id="${prefix}_tsavewrap" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-2);margin-bottom:8px"><input type="checkbox" id="${prefix}_tsavecat" /> Also save this to the tariff catalog for next time</label>` : ''}
    <button type="button" class="modal-btn ghost" style="margin-bottom:8px" onclick="addRepairItem('${prefix}')">+ Add item</button>
    <div id="${prefix}_repairList"></div>`;
}

function _tariffRows(cat, prefix) { return tariffFor(prefix)[cat] || []; }

function _tariffFill(prefix, row, cat) {
  const set = (id, v) => { const e = document.getElementById(`${prefix}_${id}`); if (e) e.value = v; };
  set('tcodetext', row ? row.code : '');
  set('titem', row ? row.item : '');
  set('thours', row ? row.hours : '');
  set('tmaterial', row ? row.material : '');
}

// Free-text search across every category (code or any word of the description).
/* "ABCD x2" / "ABCD X 2" / "ABCD*2" / "ABCD ×2": split the multiplier off the text */
function _splitQty(text) {
  const m = String(text || '').match(/^(.*?)\s*[x\u00d7*]\s*(\d{1,3})\s*$/i);
  if (!m || !m[1].trim()) return { text: String(text || ''), qty: null };
  const q = parseInt(m[2], 10);
  return q >= 1 ? { text: m[1].trim(), qty: q } : { text: String(text || ''), qty: null };
}
function onTariffSearch(prefix) {
  const box = document.getElementById(`${prefix}_tsearch`);
  const out = document.getElementById(`${prefix}_tsearchResults`);
  if (!box || !out) return;
  const sq = _splitQty(box.value);
  if (sq.qty) { const qe = document.getElementById(`${prefix}_tqty`); if (qe) qe.value = sq.qty; }
  const terms = sq.text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) { out.style.display = 'none'; out.innerHTML = ''; return; }
  const hits = [];
  const sched = tariffFor(prefix);
  Object.keys(sched).forEach(cat => sched[cat].forEach((row, idx) => {
    const hay = `${row.code} ${row.item} ${cat}`.toLowerCase();
    if (terms.every(t => hay.indexOf(t) !== -1)) hits.push({ cat, idx, row });
  }));
  if (!hits.length) {
    out.innerHTML = '<div style="padding:8px;font-size:11px;color:var(--text-3)">No match — fill in the code, description, hours and material below to add a one-off item.</div>';
    out.style.display = 'block';
    return;
  }
  out.innerHTML = hits.slice(0, 40).map(h => `<div class="tariff-hit" style="padding:6px 8px;font-size:11.5px;cursor:pointer;border-top:1px solid var(--border)" data-cat="${esc(h.cat)}" onclick="pickTariffHit('${prefix}',this.dataset.cat,${h.idx})"><span class="mono" style="color:var(--gold)">${esc(h.row.code)}</span> — ${esc(h.row.item)} <span style="color:var(--text-3)">· ${esc(h.cat)}</span></div>`).join('')
    + (hits.length > 40 ? `<div style="padding:6px 8px;font-size:10.5px;color:var(--text-3)">${hits.length - 40} more — keep typing to narrow it down.</div>` : '');
  out.style.display = 'block';
}

function pickTariffHit(prefix, cat, idx) {
  const catSel = document.getElementById(`${prefix}_tcat`);
  if (catSel) { catSel.value = cat; onRepairCategoryChange(prefix); }
  const codeSel = document.getElementById(`${prefix}_tcode`);
  if (codeSel) codeSel.value = String(idx);
  _tariffFill(prefix, _tariffRows(cat, prefix)[idx], cat);
  const out = document.getElementById(`${prefix}_tsearchResults`); if (out) out.style.display = 'none';
}

function onRepairCategoryChange(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const codeSel = document.getElementById(`${prefix}_tcode`);
  const rows = _tariffRows(cat, prefix);
  _tariffFill(prefix, null, cat);
  codeSel.innerHTML = rows.length ? '<option value="">Select…</option>' + rows.map((r,i) => `<option value="${i}">${esc(r.code)} — ${esc(r.item)}</option>`).join('') : '<option value="">Select category first…</option>';
}

function onRepairCodeChange(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const idx = document.getElementById(`${prefix}_tcode`).value;
  _tariffFill(prefix, _tariffRows(cat, prefix)[idx], cat);
}

function addRepairItem(prefix) {
  const val = id => { const e = document.getElementById(`${prefix}_${id}`); return e ? e.value.trim() : ''; };
  const cat = val('tcat');
  const cq = _splitQty(val('tcodetext'));
  const code = cq.text.trim();
  const item = val('titem');
  let qty = parseInt(val('tqty'), 10) || 1;
  if (cq.qty) qty = cq.qty;                                   // "ABCD x2" typed in the code box wins
  qty = Math.min(999, Math.max(1, qty));
  if (!code && !item) { toast('Pick a tariff code, or type a code and description', 'error'); return; }
  if (!item) { toast('Add a description for this item', 'error'); return; }
  const hours = Math.max(0, parseFloat(val('thours')) || 0);
  const material = Math.max(0, parseFloat(val('tmaterial')) || 0);
  const r2 = n => Math.round(n * 100) / 100;
  // hours / material hold the LINE TOTAL (unit x qty) so totals, reports and the EIR need no changes; unit values are kept for editing the quantity later
  const entry = { category: cat || 'CUSTOM', code: sanitize(code) || 'CUSTOM', item: sanitize(item), hours: r2(hours * qty), material: r2(material * qty), qty, unitHours: hours, unitMaterial: material, currency: GargoMoney.curFor(prefix) };
  const picked = _tariffRows(cat, prefix)[val('tcode')];
  if (!picked) entry.custom = true;
  repairItemsFor(prefix).push(entry);
  const save = document.getElementById(`${prefix}_tsavecat`);
  if (save && save.checked && tariffMode(prefix) !== 'PIL' && typeof saveTariffCatalogEntry === 'function') {
    saveTariffCatalogEntry({ category: entry.category, code: entry.code, item: entry.item, hours, material }).catch(() => {});
    save.checked = false;
  }
  ['tsearch', 'tcodetext', 'titem', 'thours', 'tmaterial'].forEach(id => { const e = document.getElementById(`${prefix}_${id}`); if (e) e.value = ''; });
  const codeSel = document.getElementById(`${prefix}_tcode`); if (codeSel) codeSel.value = '';
  const qtyEl = document.getElementById(`${prefix}_tqty`); if (qtyEl) qtyEl.value = '1';
  renderRepairItemsList(prefix);
}

/* change the quantity of an item already added; the line total is recalculated from its unit values */
function setRepairQty(prefix, i, raw) {
  const r = repairItemsFor(prefix)[i]; if (!r) return;
  const q = Math.min(999, Math.max(1, parseInt(raw, 10) || 1));
  const oldQ = Number(r.qty) || 1;
  const uh = r.unitHours != null ? Number(r.unitHours) : (Number(r.hours) || 0) / oldQ;
  const um = r.unitMaterial != null ? Number(r.unitMaterial) : (Number(r.material) || 0) / oldQ;
  const r2 = n => Math.round(n * 100) / 100;
  r.unitHours = uh; r.unitMaterial = um; r.qty = q; r.hours = r2(uh * q); r.material = r2(um * q);
  renderRepairItemsList(prefix);
}

function removeRepairItem(prefix, i) {
  repairItemsFor(prefix).splice(i, 1);
  renderRepairItemsList(prefix);
}

function renderRepairItemsList(prefix) {
  if (prefix === 'ice' && typeof renderIceLines === 'function') return renderIceLines();   // admin editor has its own editable list
  const el = document.getElementById(`${prefix}_repairList`);
  if (!el) return;
  GargoMoney.refreshLabels();
  refreshTariffPicker(prefix);
  const items = repairItemsFor(prefix);
  if (!items.length) { el.innerHTML = '<div style="font-size:11px;color:var(--text-3)">No damage items added — container will be logged as good condition.</div>'; return; }
  const rows = items.map((r, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--border)">
    <div style="font-size:11.5px"><span class="mono" style="color:var(--gold)">${esc(r.code)}</span> — ${esc(r.item)}${r.side ? ` <span style="color:var(--text-3)">(${esc(r.side)})</span>` : ''}${r.custom ? ' <span class="sbadge s-pending" style="font-size:9px">custom</span>' : ''}</div>
    <div style="font-size:11px;color:var(--text-2);display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end"><label style="display:inline-flex;align-items:center;gap:3px">&times;<input type="number" min="1" max="999" step="1" value="${Number(r.qty) || 1}" onchange="setRepairQty('${prefix}',${i},this.value)" style="width:52px;min-height:0;padding:2px 4px;font-size:12px" title="Quantity"/></label>${esc(r.hours)}h · ${GargoMoney.sym(GargoMoney.itemCur(r))} ${Number(r.material).toLocaleString()} <button type="button" class="modal-btn danger" style="padding:2px 8px;margin-left:8px" onclick="removeRepairItem('${prefix}',${i})">✕</button></div>
  </div>`).join('');
  const total = repairItemsTotal(items);
  el.innerHTML = rows + `<div style="display:flex;justify-content:space-between;padding-top:8px;font-weight:700;font-size:12px">
    <span>Total (labour @ ${GargoMoney.sym(GargoMoney.itemsCur(items))} ${GargoMoney.labourRate(GargoMoney.itemsCur(items))}/hr + material)</span><span>${GargoMoney.fmt(total, GargoMoney.itemsCur(items))}</span>
  </div>${GargoMoney.labourWarning(items)}`;
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

/* ── Admin: correct an interchange record ─────────────────────────────────────────────────────
   Only an administrator can open this. Two tabs:
     Details          every field can be corrected EXCEPT the interchange (EIR) number, which is never shown as an input.
     Damage & tariff  the damage / repair lines and their amounts: change quantity, hours or amount on any line,
                      fix a code or description, add lines from the tariff, remove lines, or switch the currency.
   Every change is written to the audit log with the old and the new figures. */
const IC_EDIT_FIELDS = [
  ['container', 'Container No.'], ['ctype', 'Type / Size'], ['line', 'Shipping Line'], ['date', 'Date'], ['condition', 'Condition / Status'],
  ['vessel', 'Vessel'], ['voyage', 'Voyage'], ['blNumber', 'Guarantee / B/L No.'], ['deliveringParty', 'Consignee / C&F'],
  ['receivingParty', 'Receiving Party'], ['releaseOrderNo', 'Release Order No.'], ['transporter', 'Transporter'],
  ['truck', 'Truck'], ['driver', 'Driver'], ['driverIdNumber', 'Driver ID No.'], ['trailerNo', 'Trailer No.'], ['isoCode', 'ISO Code'],
  ['grossWeight', 'Gross Weight'], ['manufactureDate', 'Date of Manufacture'], ['cargoStatus', 'Cargo Status'], ['clerkName', 'Clerk'], ['notes', 'Notes'],
];
function _icLocalInput(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* styles for the editor (added once; all colours come from the theme variables) */
function _iceStyles() {
  if (document.getElementById('iceStyles')) return;
  const s = document.createElement('style'); s.id = 'iceStyles';
  s.textContent = `
.ice-tabs{display:flex;gap:2px;margin:0 0 14px;border-bottom:1px solid var(--border)}
.ice-tab{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;margin-bottom:-1px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--text-2);font:600 13.5px var(--font-ui);cursor:pointer}
.ice-tab:hover{color:var(--text)}
.ice-tab.on{color:var(--gold);border-bottom-color:var(--gold)}
.ice-count{min-width:20px;padding:1px 7px;border-radius:999px;background:var(--gold-dim);color:var(--gold);font:700 11px var(--font-ui);text-align:center}
.ice-tab:focus-visible,.ice-line :focus-visible,.ice-add>summary:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.ice-lines{display:flex;flex-direction:column;gap:10px;margin:0 0 12px}
.ice-line{padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
.ice-l1{display:grid;grid-template-columns:minmax(0,120px) minmax(0,1fr) auto;gap:8px;align-items:center}
.ice-l1 input,.ice-l2 input{width:100%;box-sizing:border-box;min-width:0}
.ice-code{font-family:var(--font-mono,monospace);font-weight:600;color:var(--gold)}
.ice-x{width:40px;height:40px;border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--red);font-size:14px;cursor:pointer}
.ice-x:hover{background:var(--red-dim);border-color:var(--red)}
.ice-l2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
.ice-l2 label,.ice-lt{display:flex;flex-direction:column;gap:4px;font:600 11.5px var(--font-ui);color:var(--text-2)}
.ice-lt b{display:flex;align-items:center;min-height:38px;font:600 14px var(--font-mono,monospace);color:var(--text);font-variant-numeric:tabular-nums}
@media(min-width:520px){.ice-l2{grid-template-columns:70px repeat(2,minmax(0,1fr)) minmax(0,1.2fr)}}
.ice-empty{padding:18px;border:1px dashed var(--border-mid);border-radius:12px;text-align:center;color:var(--text-3);font-size:12.5px;line-height:1.6}
.ice-sum{display:grid;grid-template-columns:1fr auto;gap:4px 16px;margin:0 0 14px;padding:12px 14px;border:1px solid var(--border-mid);border-radius:12px;background:var(--gold-dim);font-size:12.5px;color:var(--text-2)}
.ice-sum b{font-family:var(--font-mono,monospace);font-weight:600;color:var(--text);text-align:right;font-variant-numeric:tabular-nums}
.ice-sum .ice-tot{padding-top:6px;margin-top:2px;border-top:1px solid var(--border-mid);font-size:14px;color:var(--text);font-weight:700}
.ice-sum .ice-tot b{color:var(--gold);font-size:15px}
.ice-add{margin:6px 0 4px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
.ice-add>summary{min-height:44px;display:flex;align-items:center;padding:0 14px;cursor:pointer;font:600 13px var(--font-ui);color:var(--text);list-style:none}
.ice-add>summary::-webkit-details-marker{display:none}
.ice-add>summary::before{content:"+";margin-right:10px;color:var(--gold);font-weight:700}
.ice-add[open]>summary::before{content:"\\2212"}
.ice-add>div{padding:0 14px 6px}
#ice_repairList{display:none}`;
  document.head.appendChild(s);
}

const _iceR2 = n => Math.round(n * 100) / 100;
const _iceItems = () => repairItemsFor('ice');
const _iceCurNow = () => window._iceCur || GargoMoney.itemsCur(_iceItems());
const _iceEl = id => document.getElementById(id);
/* copy of the saved lines, with unit hours / unit amount worked out for lines saved before quantities existed */
function _iceClone(list) {
  return (list || []).map(r => {
    const q = Math.max(1, Number(r.qty) || 1);
    return Object.assign({}, r, {
      qty: q,
      unitHours: r.unitHours != null ? Number(r.unitHours) : (Number(r.hours) || 0) / q,
      unitMaterial: r.unitMaterial != null ? Number(r.unitMaterial) : (Number(r.material) || 0) / q,
    });
  });
}
const _iceSig = list => JSON.stringify((list || []).map(r => [String(r.code || ''), String(r.item || ''), Number(r.qty) || 1, _iceR2(Number(r.hours) || 0), _iceR2(Number(r.material) || 0), GargoMoney.itemCur(r)]));
const _iceBrief = list => (list || []).map(r => `${r.code}${(Number(r.qty) || 1) > 1 ? ' x' + r.qty : ''} ${Number(r.hours) || 0}h/${Number(r.material) || 0}`).join(', ') || 'none';

function iceTab(t) {
  ['d', 'r'].forEach(k => {
    const p = _iceEl('ice_pane_' + k); if (p) p.style.display = k === t ? '' : 'none';
    const b = _iceEl('ice_tab_' + k); if (b) { b.classList.toggle('on', k === t); b.setAttribute('aria-selected', k === t ? 'true' : 'false'); }
  });
}

function _iceSummary() {
  const items = _iceItems(), cur = _iceCurNow(), rate = GargoMoney.labourRate(cur);
  const hrs = items.reduce((s, r) => s + (Number(r.hours) || 0), 0), mat = items.reduce((s, r) => s + (Number(r.material) || 0), 0);
  const el = _iceEl('ice_sum'); if (!el) return;
  el.innerHTML = `<span>Labour: ${_iceR2(hrs)} h &times; ${GargoMoney.fmt(rate, cur)} per hour</span><b>${GargoMoney.fmt(hrs * rate, cur)}</b>
    <span>Material / amounts</span><b>${GargoMoney.fmt(mat, cur)}</b>
    <span class="ice-tot">Total repair cost</span><b class="ice-tot">${GargoMoney.fmt(repairItemsTotal(items), cur)}</b>`;
  const n = _iceEl('ice_count'); if (n) n.textContent = items.length;
  const w = _iceEl('ice_warn'); if (w) w.innerHTML = GargoMoney.labourWarning(items);
}
function _iceLineTotal(r) { return GargoMoney.fmt((Number(r.hours) || 0) * GargoMoney.labourRate(GargoMoney.itemCur(r)) + (Number(r.material) || 0), GargoMoney.itemCur(r)); }

function renderIceLines() {
  const el = _iceEl('ice_lines'); if (!el) return;
  const items = _iceItems(), cur = _iceCurNow();
  const lab = GargoMoney.sym(cur);
  el.innerHTML = items.length ? items.map((r, i) => `<div class="ice-line">
    <div class="ice-l1">
      <input class="ice-code" value="${esc(r.code)}" aria-label="Tariff code" oninput="iceSet(${i},'code',this.value)"/>
      <input value="${esc(r.item)}" aria-label="Description" oninput="iceSet(${i},'item',this.value)"/>
      <button type="button" class="ice-x" aria-label="Remove this line" title="Remove this line" onclick="iceRemove(${i})">&#10005;</button>
    </div>
    <div class="ice-l2">
      <label>Qty<input type="number" min="1" max="999" step="1" value="${Number(r.qty) || 1}" oninput="iceSet(${i},'qty',this.value)"/></label>
      <label>Hours each<input type="number" min="0" step="0.05" value="${_iceR2(Number(r.unitHours) || 0)}" oninput="iceSet(${i},'unitHours',this.value)"/></label>
      <label>Amount each (${esc(lab)})<input type="number" min="0" step="0.01" value="${_iceR2(Number(r.unitMaterial) || 0)}" oninput="iceSet(${i},'unitMaterial',this.value)"/></label>
      <div class="ice-lt">Line total<b id="ice_lt_${i}">${_iceLineTotal(r)}</b></div>
    </div>
  </div>`).join('') : '<div class="ice-empty">No damage items on this record.<br>Add one from the tariff below, or type a one-off code, description and amount.</div>';
  el.innerHTML = `<div class="ice-lines">${el.innerHTML}</div>`;
  _iceSummary();
}
/* typing in a line: update the figures in place so the cursor never jumps */
function iceSet(i, field, raw) {
  const r = _iceItems()[i]; if (!r) return;
  if (field === 'code' || field === 'item') { r[field] = raw; return; }
  const n = Math.max(0, parseFloat(raw) || 0);
  if (field === 'qty') r.qty = Math.min(999, Math.max(1, Math.round(n) || 1));
  else r[field] = n;
  const q = Number(r.qty) || 1;
  r.hours = _iceR2((Number(r.unitHours) || 0) * q); r.material = _iceR2((Number(r.unitMaterial) || 0) * q);
  const lt = _iceEl('ice_lt_' + i); if (lt) lt.innerHTML = _iceLineTotal(r);
  _iceSummary();
}
function iceRemove(i) { _iceItems().splice(i, 1); renderIceLines(); }
function iceCur(c) {
  window._iceCur = c;
  _iceItems().forEach(r => { r.currency = c; });
  refreshTariffPicker('ice');
  renderIceLines();
}

async function showEditInterchangeModal(icId, tab) {
  if (!isAdmin()) { toast('Only an administrator can edit interchange details', 'error'); return; }
  let ic = null;
  try { ic = (window.ICR && ICR.enabled) ? await ICR.ensurePhotos(icId) : state.db.interchange.find(i => i.id === icId); } catch (e) { console.warn('edit: could not load photos', e); }
  if (!ic) ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Interchange record not found', 'error'); return; }
  if (ic._light) { toast('Could not load the full record. Check the connection and try again.', 'error'); return; }
  _iceStyles();
  const v = x => esc(x == null ? '' : x);
  /* working copy of the damage lines: nothing touches the record until Save */
  window._repairItems.ice = _iceClone(ic.repairs);
  const ln = state.db.shippingLines.find(l => l.id === ic.line);
  window._iceCur = ic.repairs && ic.repairs.length ? GargoMoney.itemCur(ic.repairs[0]) : GargoMoney.defaultFor(ln ? `${ln.code} ${ln.name}` : '');
  const lineOpts = '<option value="">—</option>' + state.db.shippingLines.map(l => `<option value="${esc(l.id)}" ${l.id === ic.line ? 'selected' : ''}>${esc(l.code)} — ${esc(l.name)}</option>`).join('');
  const types = CONTAINER_TYPE_OPTIONS.slice(); if (ic.ctype && types.indexOf(ic.ctype) < 0) types.unshift(ic.ctype);
  const typeOpts = '<option value="">—</option>' + types.map(t => `<option ${t === ic.ctype ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const truckField = ic.truck
    ? `<select id="ice_truck">${state.db.trucks.map(t => `<option value="${esc(t.id)}" ${t.id === ic.truck ? 'selected' : ''}>${esc(t.reg)}</option>`).join('')}</select>`
    : `<input id="ice_truckText" value="${v(ic.truckRegText)}"/>`;
  const driverField = ic.driver
    ? `<select id="ice_driver">${state.db.drivers.map(d => `<option value="${esc(d.id)}" ${d.id === ic.driver ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>`
    : `<input id="ice_driverText" value="${v(ic.driverNameText)}"/>`;
  const f = (id, label, val, extra) => `<div class="fg"><label>${label}</label><input id="ice_${id}" value="${v(val)}" ${extra || ''}/></div>`;
  const curOpts = ['USD', 'KES'].map(c => `<option value="${c}" ${c === window._iceCur ? 'selected' : ''}>${c}</option>`).join('');
  openModal(`Edit interchange — ${esc(ic.container)}`, `
    <div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0">Administrator only. Use this to correct details and repair amounts that were entered wrongly. The <b>EIR No. ${v(ic.eirNumber) || '—'}</b> cannot be changed. Every edit is recorded in the audit log.</span></div>
    <div class="ice-tabs" role="tablist">
      <button type="button" class="ice-tab on" id="ice_tab_d" role="tab" aria-selected="true" onclick="iceTab('d')">Details</button>
      <button type="button" class="ice-tab" id="ice_tab_r" role="tab" aria-selected="false" onclick="iceTab('r')">Damage &amp; tariff <span class="ice-count" id="ice_count">${(ic.repairs || []).length}</span></button>
    </div>
    <div id="ice_pane_d" role="tabpanel">
      <div class="form-row-2">${f('container', 'Container No.', ic.container, 'style="text-transform:uppercase"')}
        <div class="fg"><label>Type / Size</label><select id="ice_ctype">${typeOpts}</select></div></div>
      <div class="form-row-2"><div class="fg"><label>Shipping Line / Agent</label><select id="ice_line">${lineOpts}</select></div>
        <div class="fg"><label>Date</label><input id="ice_date" type="datetime-local" value="${_icLocalInput(ic.date)}"/></div></div>
      <div class="form-row-2">${f('condition', 'Condition / Status', ic.condition)}${f('cargoStatus', 'Cargo Status', ic.cargoStatus)}</div>
      <div class="form-row-2">${f('vessel', 'Vessel', ic.vessel)}${f('voyage', 'Voyage', ic.voyage)}</div>
      <div class="form-row-2">${f('bl', 'Guarantee / B/L No.', ic.blNumber || ic.guaranteeNo)}${f('consignee', 'Consignee / C&amp;F', ic.deliveringParty)}</div>
      <div class="form-row-2">${f('receiving', 'Receiving Party', ic.receivingParty)}${f('ro', 'Release Order No.', ic.releaseOrderNo)}</div>
      <div class="form-row-2">${f('transporter', 'Transporter', ic.transporter)}${f('trailer', 'Trailer No.', ic.trailerNo)}</div>
      <div class="form-row-2"><div class="fg"><label>Truck</label>${truckField}</div><div class="fg"><label>Driver</label>${driverField}</div></div>
      <div class="form-row-2">${f('driverId', 'Driver ID / Driving No.', ic.driverIdNumber)}${f('iso', 'ISO Code', ic.isoCode, 'maxlength="6" style="text-transform:uppercase"')}</div>
      <div class="form-row-2"><div class="fg"><label>Gross Weight (kg)</label><input id="ice_gross" type="number" min="0" step="1" value="${v(ic.grossWeight)}"/></div>
        ${f('dom', 'Date of Manufacture (MM/YYYY)', ic.manufactureDate, 'maxlength="7" placeholder="MM/YYYY"')}</div>
      ${f('clerk', 'Clerk', ic.clerkName)}
      <div class="fg"><label>Notes</label><textarea id="ice_notes" rows="2">${v(ic.notes)}</textarea></div>
    </div>
    <div id="ice_pane_r" role="tabpanel" style="display:none">
      <div class="fg" style="max-width:200px"><label>Pricing currency</label><select id="ice_cur" onchange="iceCur(this.value)">${curOpts}</select></div>
      <div id="ice_lines"></div>
      <div id="ice_warn"></div>
      <div class="ice-sum" id="ice_sum" aria-live="polite"></div>
      <details class="ice-add" ${(ic.repairs || []).length ? '' : 'open'}><summary>Add an item from the tariff</summary><div>${tariffPickerHtml('ice')}</div></details>
      <div style="font-size:11.5px;color:var(--text-3);line-height:1.5;margin:8px 0 12px">Only this interchange record is changed. To set a fixed price for a line, put the price in <b>Amount each</b> and set <b>Hours each</b> to 0.</div>
    </div>
    <div id="ice_err" style="color:var(--red);font-size:12px;min-height:16px"></div>
    <button class="submit-btn" id="ice_go" onclick="saveEditedInterchange('${esc(ic.id)}')">Save changes →</button>`);
  renderIceLines();
  refreshTariffPicker('ice');
  if (tab === 'repairs') iceTab('r');
}
let _iceSaving = false;
async function saveEditedInterchange(icId) {
  if (_iceSaving) return;
  if (!isAdmin()) { toast('Only an administrator can edit interchange details', 'error'); return; }
  const ic = state.db.interchange.find(i => i.id === icId); if (!ic) { toast('Interchange record not found', 'error'); return; }
  const val = id => { const el = document.getElementById('ice_' + id); return el ? el.value.trim() : ''; };
  const err = m => { const e = document.getElementById('ice_err'); if (e) e.textContent = m; else toast(m, 'error'); };
  const cont = val('container').toUpperCase().replace(/\s+/g, '');
  if (!cont) { iceTab('d'); return err('Container number is required.'); }
  if (cont !== String(ic.container || '').toUpperCase()) { const issue = containerFormatIssue(cont); if (issue) { iceTab('d'); return err('Container number: ' + issue); } }
  const dom = normalizeManufactureDate(val('dom')); if (dom === null) { iceTab('d'); return err('Date of manufacture must look like 05/2011.'); }
  const grossRaw = val('gross'), gross = grossRaw ? Number(grossRaw) : '';
  if (grossRaw && (!isFinite(gross) || gross <= 0)) { iceTab('d'); return err('Gross weight must be a positive number.'); }
  const dateRaw = val('date'); if (dateRaw && isNaN(new Date(dateRaw))) { iceTab('d'); return err('The date is not valid.'); }
  /* damage / tariff lines */
  const draft = _iceItems(), cur = _iceCurNow();
  for (let n = 0; n < draft.length; n++) if (!String(draft[n].item || '').trim()) { iceTab('r'); return err(`Damage line ${n + 1} needs a description.`); }
  const newRepairs = draft.map(r => {
    const q = Math.min(999, Math.max(1, Number(r.qty) || 1)), uh = Math.max(0, Number(r.unitHours) || 0), um = Math.max(0, Number(r.unitMaterial) || 0);
    return Object.assign({}, r, { code: sanitize(String(r.code || '').trim()) || 'CUSTOM', item: sanitize(String(r.item || '').trim()), qty: q, unitHours: uh, unitMaterial: um, hours: _iceR2(uh * q), material: _iceR2(um * q), currency: r.currency || cur });
  });
  const oldRepairs = ic.repairs || [], oldTotal = Number(ic.repairTotal) || 0, newTotal = repairItemsTotal(newRepairs);
  const repairsChanged = _iceSig(oldRepairs) !== _iceSig(newRepairs) || _iceR2(oldTotal) !== _iceR2(newTotal);

  const before = {}; IC_EDIT_FIELDS.forEach(([k]) => { before[k] = ic[k]; }); const snap = Object.assign({}, ic);   // the EIR number is not in this list on purpose
  const bl = sanitize(val('bl'));
  Object.assign(ic, {
    container: cont, ctype: val('ctype'), line: val('line') || null,
    date: dateRaw ? new Date(dateRaw).toISOString() : ic.date,
    condition: sanitize(val('condition')), cargoStatus: sanitize(val('cargoStatus')),
    vessel: sanitize(val('vessel')), voyage: sanitize(val('voyage')),
    blNumber: bl, guaranteeNo: bl, deliveringParty: sanitize(val('consignee')),
    receivingParty: sanitize(val('receiving')), releaseOrderNo: sanitize(val('ro')),
    transporter: sanitize(val('transporter')), trailerNo: sanitize(val('trailer')),
    driverIdNumber: sanitize(val('driverId')), isoCode: sanitize(val('iso')).toUpperCase(),
    grossWeight: gross, manufactureDate: dom, clerkName: sanitize(val('clerk')), notes: sanitize(val('notes')),
  });
  if (document.getElementById('ice_truck')) ic.truck = val('truck'); else ic.truckRegText = sanitize(val('truckText'));
  if (document.getElementById('ice_driver')) ic.driver = val('driver'); else ic.driverNameText = sanitize(val('driverText'));
  if (repairsChanged) { ic.repairs = newRepairs; ic.repairTotal = newTotal; }
  const changed = IC_EDIT_FIELDS.filter(([k]) => String(before[k] == null ? '' : before[k]) !== String(ic[k] == null ? '' : ic[k]));
  if (!changed.length && !repairsChanged) { closeModal(); toast('No changes to save', 'info'); return; }
  _iceSaving = true;
  const btn = document.getElementById('ice_go'); if (btn) btn.disabled = true;
  try {
    ic._dirty = true;
    const res = await saveNowAwaited();
    const fail = ((res && res.failures) || []).find(x => x && x.table === 'interchange');
    if (fail) {
      Object.keys(ic).forEach(k => { if (!(k in snap)) delete ic[k]; }); Object.assign(ic, snap); delete ic._dirty;   // put the record back as it was
      err('Not saved: ' + ((fail.error && fail.error.message) || 'the server refused the change'));
      return;
    }
    const parts = [];
    if (repairsChanged) parts.push(`Damage items: [${_iceBrief(oldRepairs)}] ${GargoMoney.fmt(oldTotal, GargoMoney.itemsCur(oldRepairs))} → [${_iceBrief(newRepairs)}] ${GargoMoney.fmt(newTotal, GargoMoney.itemsCur(newRepairs))}`);
    changed.forEach(([k, l]) => parts.push(`${l}: "${before[k] == null ? '' : before[k]}" → "${ic[k] == null ? '' : ic[k]}"`));
    addAudit(state.profile.username, 'Interchange Edited', `${cont} · EIR ${ic.eirNumber || '—'} · ` + parts.join('; ').slice(0, 900));
    window._repairItems.ice = []; window._iceCur = null;
    closeModal();
    try { if (typeof refreshContainerHistory === 'function') refreshContainerHistory(); renderInterchange(); } catch (e) {}
    toast(repairsChanged ? 'Interchange and repair amounts updated' : 'Interchange updated', 'success');
  } finally { _iceSaving = false; if (btn) btn.disabled = false; }
}