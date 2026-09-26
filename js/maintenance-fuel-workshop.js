'use strict';


function maintToRow(m)  { return { id:m.id, truck_id:m.truckId||null, type:m.type, description:m.desc, priority:m.priority, status:m.status, date:m.date, cost:m.cost, technician:m.tech, resolved_date:m.resolvedDate }; }

function maintFromRow(r){ return { id:r.id, truckId:r.truck_id, type:r.type, desc:r.description, priority:r.priority, status:r.status, date:r.date, cost:r.cost, tech:r.technician, resolvedDate:r.resolved_date }; }

function fuelToRow(f)  { return { id:f.id, truck_id:f.truckId||null, driver_id:f.driverId||null, date:f.date, litres:f.litres, price_per_litre:f.pricePerLitre, station:f.station, odometer:f.odometer, receipt:f.receipt, receipt_img:f.receiptImg||null }; }

function fuelFromRow(r){ return { id:r.id, truckId:r.truck_id, driverId:r.driver_id, date:r.date, litres:r.litres, pricePerLitre:r.price_per_litre, station:r.station, odometer:r.odometer, receipt:r.receipt, receiptImg:r.receipt_img||'' }; }

function wsToRow(w)  { return { id:w.id, truck_id:w.truckId||null, title:w.title, description:w.desc, tech:w.tech, status:w.status, reported:w.reported, diagnosed:w.diagnosed, parts:w.parts, labour:w.labour, total:w.total }; }

function wsFromRow(r){ return { id:r.id, truckId:r.truck_id, title:r.title, desc:r.description, tech:r.tech, status:r.status, reported:r.reported, diagnosed:r.diagnosed, parts:r.parts, labour:r.labour, total:r.total }; }

/* ──────────────────────────────────────────────────────────────────
   § 14b  RECEIPT PHOTO CAPTURE (shared by admin + driver fuel forms)
────────────────────────────────────────────────────────────────── */
const _pendingReceiptImg = { f: null, dp: null };

function handleReceiptFileSelect(input, previewId, scope) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type || !file.type.startsWith('image/')) { toast('Please choose an image file', 'error'); input.value=''; return; }
  if (file.size > 2*1024*1024) { toast('Image too large — max 2MB', 'error'); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    _pendingReceiptImg[scope] = reader.result;
    const prev = document.getElementById(previewId);
    if (prev) prev.innerHTML = `<img src="${reader.result}" style="width:100%;height:100%;object-fit:cover" />`;
    const actions = document.getElementById(`${scope}_receipt_img_actions`);
    if (actions) actions.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function clearPendingReceiptImg(scope, previewId) {
  _pendingReceiptImg[scope] = null;
  const fileInput = document.getElementById(`${scope}_receipt_file`);
  if (fileInput) fileInput.value = '';
  const prev = document.getElementById(previewId);
  if (prev) prev.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  const actions = document.getElementById(`${scope}_receipt_img_actions`);
  if (actions) actions.style.display = 'none';
}

/* ──────────────────────────────────────────────────────────────────
   § 14c  STANDING FUEL PRICE / LITRE (set once, editable over time)
────────────────────────────────────────────────────────────────── */
function fuelPriceHistory() {
  state.db.settings = state.db.settings || {};
  if (!Array.isArray(state.db.settings.fuelPriceHistory)) state.db.settings.fuelPriceHistory = [];
  return state.db.settings.fuelPriceHistory;
}

function fuelPriceHistorySorted() {
  return [...fuelPriceHistory()].sort((a,b)=>new Date(b.effectiveDate)-new Date(a.effectiveDate) || new Date(b.recordedAt)-new Date(a.recordedAt));
}

function currentFuelPrice() {
  const hist = fuelPriceHistorySorted();
  return hist.length ? hist[0].price : 0;
}

function renderFuelPriceCard() {
  const el = document.getElementById('fuelPriceCard');
  if (!el) return;
  const hist = fuelPriceHistorySorted();
  const current = hist[0];
  el.innerHTML = `
    <div class="panel-head"><span class="panel-title">Standing Price / Litre</span>${isAdmin()?`<button class="modal-btn ghost" style="padding:3px 10px;font-size:10px" onclick="showUpdateFuelPriceModal()">Update Price</button>`:''}</div>
    <div style="padding:14px">
      <div style="font-family:var(--font-brand);font-size:24px;font-weight:700;color:var(--gold)">${current?`KSh ${fmt(current.price)}`:'Not set'}</div>
      <div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${current?`Effective ${fmtDate(current.effectiveDate)}${current.note?` · ${current.note}`:''} · set by ${current.setBy||'—'}`:'Set a default so fill-up forms auto-fill with the current pump price'}</div>
      ${hist.length>1?`<button class="modal-btn ghost" style="margin-top:10px;padding:4px 10px;font-size:10px" onclick="showFuelPriceHistoryModal()">View price history (${hist.length})</button>`:''}
    </div>
  `;
}

function showUpdateFuelPriceModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const today = new Date().toISOString().slice(0,10);
  openModal('Update Standing Fuel Price', `
    <div class="fg"><label>Price / Litre (KSh)</label><input id="fp_price" type="number" step="0.01" placeholder="${currentFuelPrice()||155}"/></div>
    <div class="fg"><label>Effective Date</label><input id="fp_date" type="date" value="${today}"/></div>
    <div class="fg"><label>Note <span class="label-optional">(optional)</span></label><input id="fp_note" placeholder="e.g. EPRA monthly revision"/></div>
    <button class="submit-btn" onclick="saveFuelPriceUpdate()">Save Price →</button>
  `);
}

function saveFuelPriceUpdate() {
  const price = parseFloat(document.getElementById('fp_price').value)||0;
  if (price<=0) { toast('Enter a valid price', 'error'); return; }
  const entry = {
    id: uid('FP'), price,
    effectiveDate: document.getElementById('fp_date').value || new Date().toISOString().slice(0,10),
    note: sanitize(document.getElementById('fp_note').value.trim()),
    setBy: state.profile?.username || 'system',
    recordedAt: new Date().toISOString(),
  };
  fuelPriceHistory().push(entry);
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Price Updated', `KSh ${price}/L effective ${entry.effectiveDate}`);
  closeModal();
  renderFuelPriceCard();
  const priceInput = document.getElementById('f_price');
  if (priceInput && !priceInput.value) priceInput.value = price;
  toast(`Standing fuel price set to KSh ${price}/L`, 'success');
}

function showFuelPriceHistoryModal() {
  const hist = fuelPriceHistorySorted();
  openModal('Fuel Price History', `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Effective</th><th>Price/L</th><th>Note</th><th>Set By</th></tr></thead>
      <tbody>${hist.map(h=>`<tr><td class="mono" style="font-size:10px">${fmtDate(h.effectiveDate)}</td><td class="mono" style="color:var(--gold);font-weight:700">KSh ${fmt(h.price)}</td><td style="font-size:11px;color:var(--text-2)">${h.note||'—'}</td><td style="font-size:11px;color:var(--text-3)">${h.setBy||'—'}</td></tr>`).join('')||'<tr><td colspan="4" class="empty-td">No price history yet</td></tr>'}</tbody>
    </table></div>
  `);
}

function dpRenderFuelTab(el, driver) {
  const logs = state.db.fuel.filter(f=>f.driverId===driver.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const defaultPrice = currentFuelPrice();
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">Log Fuel Fill-up</div>
      <div class="form-card-body">
        <div class="form-row-2">
          <div class="fg"><label>Litres</label><input id="dp_f_litres" type="number" placeholder="180"/></div>
          <div class="fg"><label>Price / Litre (KSh)</label><input id="dp_f_price" type="number" placeholder="155" value="${defaultPrice||''}"/></div>
        </div>
        <div class="form-row-2">
          <div class="fg"><label>Station</label><input id="dp_f_station" placeholder="Kobil Shimanzi"/></div>
          <div class="fg"><label>Odometer (km)</label><input id="dp_f_odo" type="number" placeholder="142300"/></div>
        </div>
        <div class="fg"><label>Receipt No. <span class="label-optional">(optional)</span></label><input id="dp_f_receipt" placeholder="RCP-000"/></div>
        <div class="fg">
          <label>Receipt Photo <span class="label-optional">(optional)</span></label>
          <div id="dp_receipt_img_preview" class="ic-card-img-placeholder" style="width:100%;height:90px;cursor:pointer;position:relative;overflow:hidden" onclick="document.getElementById('dp_receipt_file').click()" title="Tap to capture, scan or upload the receipt">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <input type="file" id="dp_receipt_file" accept="image/*" style="display:none" onchange="handleReceiptFileSelect(this,'dp_receipt_img_preview','dp')" />
          <div id="dp_receipt_img_actions" style="display:none;margin-top:6px"><button type="button" class="modal-btn ghost" style="padding:3px 10px;font-size:10px" onclick="clearPendingReceiptImg('dp','dp_receipt_img_preview')">✕ Remove photo</button></div>
        </div>
        <button class="submit-btn" onclick="dpAddFuelLog()">Save Fuel Log →</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Fuel History</span><span class="panel-meta">${logs.length} entries</span></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Date</th><th>Litres</th><th>Price/L</th><th>Total</th><th>Station</th><th>Receipt</th></tr></thead>
        <tbody>${logs.map(f=>`<tr><td class="mono" style="font-size:10px">${fmtDate(f.date)}</td><td class="mono">${fmt(f.litres)} L</td><td class="mono">${fmt(f.pricePerLitre)}</td><td class="mono" style="color:var(--gold);font-weight:700">${fmtKsh(f.litres*f.pricePerLitre)}</td><td style="font-size:11px;color:var(--text-3)">${f.station}</td><td>${f.receiptImg?`<img src="${f.receiptImg}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;cursor:pointer" onclick="openPhotoLightbox('${f.receiptImg}')"/>`:`<button class="modal-btn ghost" style="padding:2px 8px;font-size:9px" onclick="triggerImageUpload('fuel','${f.id}','receiptImg',()=>renderDriverPortal())">Attach</button>`}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-td">No fuel logs yet</td></tr>`}</tbody>
      </table></div>
    </div>
  `;
}

function dpAddFuelLog() {
  const driver = myDriverRecord();
  if (!driver) return;
  const litres = parseFloat(document.getElementById('dp_f_litres').value)||0;
  const price  = parseFloat(document.getElementById('dp_f_price').value)||0;
  if (litres<=0 || price<=0) { toast('Litres and price are required', 'error'); return; }
  if (litres > 1000) { toast('Litres exceed reasonable limit (1000L)', 'error'); return; }
  const log = {
    id: uid('FUEL'), truckId: driver.truckId||null, driverId: driver.id,
    date: new Date().toISOString(), litres, pricePerLitre: price,
    station: sanitize(document.getElementById('dp_f_station').value.trim())||'Unknown',
    odometer: Math.max(0, parseInt(document.getElementById('dp_f_odo').value)||0),
    receipt: document.getElementById('dp_f_receipt').value.trim()||uid('RCP'),
    receiptImg: _pendingReceiptImg.dp || '',
  };
  state.db.fuel.push(log);
  log._dirty = true;
  _pendingReceiptImg.dp = null;
  const t = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  if (t) { t.fuelPct = Math.min(100, Math.round((litres/400)*100 + t.fuelPct)); t.mileage = log.odometer||t.mileage; }
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Log (Driver)', `${truckName(driver.truckId)} — ${litres}L at KSh ${price}/L`);
  toast(`Fuel log saved — ${fmtKsh(litres*price)}`, 'success');
  renderDriverPortal();
}

function dpRenderWorkshopTab(el, driver) {
  const truck = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  const mine = truck ? state.db.workshop.filter(w=>w.truckId===truck.id).sort((a,b)=>new Date(b.reported)-new Date(a.reported)) : [];
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">Report Vehicle Issue</div>
      <div class="form-card-body">
        ${!truck ? '<div class="ops-notice">No truck currently assigned — an admin must assign one before you can log a workshop job.</div>' : `
        <div class="fg"><label>Truck</label><div class="mono" style="padding:8px;background:var(--surface);border-radius:5px;color:var(--gold)">${truck.reg} — ${truck.make}</div></div>
        <div class="fg"><label>Job Title</label><input id="dp_ws_title" placeholder="Describe the issue…"/></div>
        <div class="fg"><label>Description</label><textarea id="dp_ws_desc" rows="3" placeholder="Detailed description…"></textarea></div>
        <button class="submit-btn" onclick="dpSaveWorkshopJob('${truck.id}')">Submit Job Card →</button>
        `}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Truck's Workshop Jobs</span><span class="panel-meta">${mine.length}</span></div>
      <div>${mine.map(w=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${w.title}</div><div style="font-size:10.5px;color:var(--text-3);margin-top:2px">${w.id}</div></div>${sbadge(w.status)}</div><div style="font-size:11.5px;color:var(--text-2)">${w.desc}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No workshop jobs for your truck</div></div>'}</div>
    </div>
  `;
}

function dpSaveWorkshopJob(truckId) {
  const title = document.getElementById('dp_ws_title').value.trim();
  if (!title) { toast('Job title required','error'); return; }
  state.db.workshop.push({
    id: uid('WS'), truckId,
    title, desc: sanitize(document.getElementById('dp_ws_desc').value.trim()),
    tech:'', parts:'', labour:0, total:0,
    status:'reported', reported: new Date().toISOString(), diagnosed:null,
    _dirty: true,
  });
  scheduleSave();
  addAudit(state.profile.username, 'Workshop Job Reported (Driver)', title);
  toast('Job card submitted to workshop', 'success');
  renderDriverPortal();
}

let _maintFilter='all';

function filterMaint(f,btn){ _maintFilter=f; document.querySelectorAll('#sec-maintenance .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderMaint(f); }

function renderMaint(f){
  let items=state.db.maintenance;
  if(f!=='all') items=items.filter(m=>m.status===f);
  items=items.sort((a,b)=>{ const p=['critical','high','medium','low']; return p.indexOf(a.priority)-p.indexOf(b.priority); });
  const el=document.getElementById('maintList');
  if(!el) return;
  el.innerHTML=items.map(m=>`<div class="maint-card p-${m.priority}" onclick="showMaintDetail('${m.id}')"><div class="maint-card-head"><div><div style="font-size:12px;font-weight:700;color:var(--text)">${truckName(m.truckId)}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:2px">${m.type} · ${fmtDate(m.date)}</div></div><div style="display:flex;gap:6px;align-items:center">${sbadge(m.priority)} ${sbadge(m.status)}</div></div><div class="maint-desc">${m.desc}</div><div class="maint-meta">Tech: ${m.tech||'Unassigned'} · Cost: ${m.cost?fmtKsh(m.cost):'TBC'}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-label">No maintenance records</div></div>';
}

function showMaintDetail(id) {
  const m = state.db.maintenance.find(m=>m.id===id);
  if (!m) return;
  openModal(`Maintenance — ${truckName(m.truckId)}`, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(m.truckId)}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${m.type}</div></div><div class="fg" style="margin:0"><label>Priority</label>${sbadge(m.priority)}</div><div class="fg" style="margin:0"><label>Status</label>${sbadge(m.status)}</div><div class="fg" style="margin:0"><label>Date</label><div style="font-size:12px;color:var(--text)">${fmtDate(m.date)}</div></div><div class="fg" style="margin:0"><label>Cost (KSh)</label><div style="font-size:12px;color:var(--gold);font-weight:700">${m.cost?fmt(m.cost):'TBC'}</div></div><div class="fg" style="margin:0"><label>Technician</label><div style="font-size:12px;color:var(--text)">${m.tech||'Unassigned'}</div></div>${m.resolvedDate?`<div class="fg" style="margin:0"><label>Resolved</label><div style="font-size:12px;color:var(--green)">${fmtDate(m.resolvedDate)}</div></div>`:''}</div><div class="fg" style="margin-bottom:14px"><label>Description</label><div style="font-size:12px;color:var(--text-2);line-height:1.6;padding:10px;background:var(--surface);border-radius:5px">${m.desc}</div></div>${isAdmin()?`<div style="padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Update Status</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['open','in_progress','resolved'].map(s=>`<button class="filter-btn${m.status===s?' active':''}" onclick="updateMaintStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div>${adminDeleteBtn('maintenance', id)}</div>`:''}`);
}

function updateMaintStatus(id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const m = state.db.maintenance.find(m=>m.id===id);
  if (!m) return;
  m.status = status;
  if (status==='resolved') m.resolvedDate = new Date().toISOString();
  m._dirty = true;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Maintenance Update', `${truckName(m.truckId)} → ${status}`);
  closeModal();
  renderMaint(_maintFilter);
  toast('Maintenance record updated', 'success');
}

function showMaintModal() {
  openModal('Log Maintenance Issue', `<div class="fg"><label>Truck</label><select id="m_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg} — ${t.make}</option>`).join('')}</select></div><div class="form-row-2"><div class="fg"><label>Issue Type</label><select id="m_type"><option>Breakdown</option><option>Scheduled</option><option>Preventive</option><option>Electrical</option><option>Tyre</option><option>Engine</option><option>Brake</option><option>Suspension</option></select></div><div class="fg"><label>Priority</label><select id="m_priority"><option value="critical">Critical</option><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div></div><div class="fg"><label>Description</label><textarea id="m_desc" rows="3" placeholder="Describe the issue…"></textarea></div><div class="form-row-2"><div class="fg"><label>Technician</label><input id="m_tech" placeholder="Tech name"/></div><div class="fg"><label>Estimated Cost (KSh)</label><input id="m_cost" type="number" placeholder="0"/></div></div><button class="submit-btn" onclick="saveMaint()">Log Issue →</button>`);
}

function saveMaint() {
  const desc = document.getElementById('m_desc').value.trim();
  if (!desc) { toast('Description required', 'error'); return; }
  const m = {
    id: uid('MNT'), truckId: document.getElementById('m_truck').value,
    type: document.getElementById('m_type').value, priority: document.getElementById('m_priority').value,
    desc, tech: document.getElementById('m_tech').value.trim(),
    cost: Math.max(0, parseInt(document.getElementById('m_cost').value)||0),
    status:'open', date: new Date().toISOString(), resolvedDate: null,
  };
  state.db.maintenance.push(m);
  m._dirty = true;
  const t = state.db.trucks.find(t=>t.id===m.truckId);
  if (t && m.priority==='critical') t.status='breakdown';
  else if (t && (m.priority==='high'||m.priority==='medium') && t.status==='available') t.status='maintenance';
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Maintenance Logged', `${truckName(m.truckId)} — ${m.type}`);
  closeModal(); renderMaint('all');
  toast('Issue logged', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 15  FUEL LOG
────────────────────────────────────────────────────────────────── */
function renderFuel() {
  fillSelect('f_truck',  state.db.trucks,  t=>[t.id, `${t.reg} — ${t.make}`]);
  fillSelect('f_driver', state.db.drivers, d=>[d.id, d.name]);
  renderFuelPriceCard();
  const priceInput = document.getElementById('f_price');
  if (priceInput && !priceInput.value) priceInput.value = currentFuelPrice() || '';
  renderFuelTable();
  renderFuelSummary();
}

function renderFuelTable() {
  const logs = [...state.db.fuel].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tbody = document.getElementById('fuelTableBody');
  if (!tbody) return;
  tbody.innerHTML = logs.map(f=>`<tr><td class="mono" style="font-size:10px">${fmtDate(f.date)}</td><td>${state.db.trucks.find(t=>t.id===f.truckId)?.reg||f.truckId}</td><td>${driverName(f.driverId)}</td><td class="mono" style="text-align:right">${fmt(f.litres)} L</td><td class="mono" style="text-align:right">${fmt(f.pricePerLitre)}</td><td class="mono" style="text-align:right;color:var(--gold);font-weight:700">${fmtKsh(f.litres*f.pricePerLitre)}</td><td style="color:var(--text-3);font-size:11px">${f.station}</td><td>${f.receiptImg?`<img src="${f.receiptImg}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;cursor:pointer" onclick="openPhotoLightbox('${f.receiptImg}')"/>`:`<button class="modal-btn ghost" style="padding:2px 8px;font-size:9px" onclick="triggerImageUpload('fuel','${f.id}','receiptImg',()=>renderFuelTable())">Attach</button>`}</td></tr>`).join('') || `<tr><td colspan="8" class="empty-td">No fuel logs</td></tr>`;
}

function renderFuelSummary() {
  const logs = state.db.fuel;
  const totalL   = logs.reduce((s,f)=>s+f.litres, 0);
  const totalKsh = logs.reduce((s,f)=>s+f.litres*f.pricePerLitre, 0);
  const avgPpl   = logs.length ? totalKsh/totalL : 0;
  const el = document.getElementById('fuelSummary');
  if (!el) return;
  el.innerHTML = `<div class="fuel-summary-row"><span class="fsr-label">Total Litres</span><span class="fsr-val">${fmt(totalL)} L</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Cost</span><span class="fsr-val">${fmtKsh(totalKsh)}</span></div><div class="fuel-summary-row"><span class="fsr-label">Avg Price/Litre</span><span class="fsr-val">KSh ${avgPpl.toFixed(2)}</span></div><div class="fuel-summary-row"><span class="fsr-label">Fill-ups Logged</span><span class="fsr-val">${logs.length}</span></div>`;
}

function addFuelLog() {
  const truck  = document.getElementById('f_truck').value;
  const driver = document.getElementById('f_driver').value;
  const litres = parseFloat(document.getElementById('f_litres').value)||0;
  const price  = parseFloat(document.getElementById('f_price').value)||0;
  if (!truck || litres <=0 || price <=0) { toast('Truck, litres and price required', 'error'); return; }
  if (litres > 1000) { toast('Litres exceed reasonable limit (1000L)', 'error'); return; }
  const log = {
    id: uid('FUEL'), truckId: truck, driverId: driver,
    date: new Date().toISOString(), litres, pricePerLitre: price,
    station: sanitize(document.getElementById('f_station').value.trim())||'Unknown',
    odometer: Math.max(0, parseInt(document.getElementById('f_odo').value)||0),
    receipt: document.getElementById('f_receipt').value.trim()||uid('RCP'),
    receiptImg: _pendingReceiptImg.f || '',
  };
  state.db.fuel.push(log);
  log._dirty = true;
  _pendingReceiptImg.f = null;
  const t = state.db.trucks.find(t=>t.id===truck);
  if (t) { t.fuelPct = Math.min(100, Math.round((litres/400)*100 + t.fuelPct)); t.mileage = log.odometer||t.mileage; }
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Log', `${truckName(truck)} — ${litres}L at KSh ${price}/L`);
  ['f_litres','f_price','f_station','f_odo','f_receipt'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  clearPendingReceiptImg('f','f_receipt_img_preview');
  const priceInput = document.getElementById('f_price');
  if (priceInput) priceInput.value = currentFuelPrice() || '';
  renderFuelTable(); renderFuelSummary();
  toast(`Fuel log saved — ${fmtKsh(litres*price)}`, 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 20  WORKSHOP
────────────────────────────────────────────────────────────────── */
let _wsFilter='all';

function filterWorkshop(f,btn){ _wsFilter=f; document.querySelectorAll('#sec-workshop .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderWorkshop(f); }

function renderWorkshop(f){
  let items=f==='all'?state.db.workshop:state.db.workshop.filter(w=>w.status===f);
  const el=document.getElementById('workshopList');
  if(!el) return;
  el.innerHTML=items.map(w=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${w.title}</div><div style="font-size:10.5px;color:var(--text-3);margin-top:2px">${w.id} · ${truckName(w.truckId)}</div></div>${sbadge(w.status)}</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:8px">${w.desc}</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9.5px;color:var(--text-3)"><span>Tech: ${w.tech}</span><span>Total: <span style="color:var(--gold);font-weight:700">${fmtKsh(w.total)}</span></span></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🔩</div><div class="empty-state-label">No workshop jobs</div></div>';
}

function showAddWorkshopJobModal() {
  openModal('New Workshop Job Card', `<div class="fg"><label>Truck</label><select id="ws_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg} — ${t.make}</option>`).join('')}</select></div><div class="fg"><label>Job Title</label><input id="ws_title" placeholder="Describe the job…"/></div><div class="fg"><label>Description</label><textarea id="ws_desc" rows="3" placeholder="Detailed scope of work…"></textarea></div><div class="form-row-2"><div class="fg"><label>Technician</label><input id="ws_tech" placeholder="Tech name"/></div><div class="fg"><label>Labour (KSh)</label><input id="ws_labour" type="number" placeholder="0"/></div></div><div class="form-row-2"><div class="fg"><label>Parts Description</label><input id="ws_parts" placeholder="Parts list…"/></div><div class="fg"><label>Parts Cost (KSh)</label><input id="ws_pcost" type="number" placeholder="0"/></div></div><button class="submit-btn" onclick="saveWorkshopJob()">Create Job Card →</button>`);
}

function saveWorkshopJob() {
  const title = document.getElementById('ws_title').value.trim();
  if (!title) { toast('Job title required','error'); return; }
  const labour = Math.max(0, parseInt(document.getElementById('ws_labour').value)||0);
  const pcost  = Math.max(0, parseInt(document.getElementById('ws_pcost').value)||0);
  state.db.workshop.push({
    id: uid('WS'), truckId: document.getElementById('ws_truck').value,
    title, desc: sanitize(document.getElementById('ws_desc').value.trim()),
    tech: sanitize(document.getElementById('ws_tech').value.trim()),
    parts: sanitize(document.getElementById('ws_parts').value.trim()),
    labour, total: labour+pcost,
    status:'reported', reported: new Date().toISOString(), diagnosed:null,
    _dirty: true,
  });
  scheduleSave();
  addAudit(state.profile.username, 'Workshop Job Created', title);
  closeModal(); renderWorkshop('all');
  toast('Job card created', 'success');
}

function renderAdminWorkshop() {
  const items=state.db.workshop.filter(w=>w.status!=='completed');
  const el=document.getElementById('adminWorkshopList');
  if(!el) return;
  el.innerHTML=items.map(w=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${w.title}</div><div style="font-size:10.5px;color:var(--text-3)">${truckName(w.truckId)} · ${w.tech}</div></div>${sbadge(w.status)}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['reported','diagnosed','in_progress','completed'].map(s=>`<button class="filter-btn${w.status===s?' active':''}" onclick="advanceWorkshop('${w.id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No open workshop jobs</div></div>';
}

function advanceWorkshop(id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const w=state.db.workshop.find(w=>w.id===id);
  if(!w) return;
  w.status=status;
  if(status==='completed') { const t=state.db.trucks.find(t=>t.id===w.truckId); if(t && t.status==='maintenance')t.status='available'; }
  w._dirty = true;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Workshop Update', `${w.title} → ${status}`);
  renderAdminWorkshop(); renderWorkshop(_wsFilter);
  toast(`Job updated to ${status}`, 'success');
}