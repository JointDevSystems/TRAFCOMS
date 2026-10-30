'use strict';


function maintToRow(m)  { return { id:m.id, truck_id:m.truckId||null, type:m.type, description:m.desc, priority:m.priority, status:m.status, date:m.date, cost:m.cost, technician:m.tech, resolved_date:m.resolvedDate }; }

function maintFromRow(r){ return { id:r.id, truckId:r.truck_id, type:r.type, desc:r.description, priority:r.priority, status:r.status, date:r.date, cost:r.cost, tech:r.technician, resolvedDate:r.resolved_date }; }

function fuelToRow(f)  { return { id:f.id, truck_id:f.truckId||null, driver_id:f.driverId||null, date:f.date, litres:f.litres, price_per_litre:f.pricePerLitre, station:f.station, odometer:f.odometer, receipt:f.receipt, receipt_img:f.receiptImg||null, total_paid:(Number(f.totalPaid)>0?Number(f.totalPaid):null) }; }

function fuelFromRow(r){ return { id:r.id, truckId:r.truck_id, driverId:r.driver_id, date:r.date, litres:r.litres, pricePerLitre:r.price_per_litre, station:r.station, odometer:r.odometer, receipt:r.receipt, receiptImg:r.receipt_img||'', totalPaid:(r.total_paid!=null?Number(r.total_paid):null), truckRegText:r.truck_reg_text||'', driverNameText:r.driver_name_text||'', container:r.container||'', ctype:r.ctype||'', routeFrom:r.route_from||'', routeTo:r.route_to||'', source:r.source||'manual' }; }

function wsToRow(w)  { return { id:w.id, truck_id:w.truckId||null, title:w.title, description:w.desc, tech:w.tech, status:w.status, reported:w.reported, diagnosed:w.diagnosed, parts:w.parts, labour:w.labour, total:w.total }; }

function wsFromRow(r){ return { id:r.id, truckId:r.truck_id, title:r.title, desc:r.description, tech:r.tech, status:r.status, reported:r.reported, diagnosed:r.diagnosed, parts:r.parts, labour:r.labour, total:r.total }; }

/* -- Container Repairs row mappers -- */
function crToRow(c) {
  return {
    id: c.id, container: c.container, ctype: c.ctype || null, line_id: c.line || null,
    interchange_id: c.interchangeId || null, survey_id: c.surveyId || null,
    eir_number: c.eirNumber || null, condition: c.condition || null,
    repairs: JSON.stringify(c.repairs || []), repair_total: c.repairTotal || 0,
    gate_in_photo: c.gateInPhoto || '', approval_doc: c.approvalDoc || '', approval_doc_name: c.approvalDocName || null,
    approved_by_line: c.approvedByLine || null, approval_reference: c.approvalReference || null,
    pre_repair_photos: JSON.stringify(c.preRepairPhotos || []), post_repair_photos: JSON.stringify(c.postRepairPhotos || []),
    status: c.status || 'awaiting_approval', tech: c.tech || null,
    labour_cost: c.labourCost || 0, material_cost: c.materialCost || 0, total_cost: c.totalCost || 0,
    notes: c.notes || null, created_by: c.createdBy || null, created_at: c.createdAt || new Date().toISOString(),
    completed_at: c.completedAt || null,
  };
}

function crFromRow(r) {
  let repairs = []; try { repairs = r.repairs ? (typeof r.repairs === 'string' ? JSON.parse(r.repairs) : r.repairs) : []; } catch (e) { repairs = []; }
  let pre = []; try { pre = r.pre_repair_photos ? (typeof r.pre_repair_photos === 'string' ? JSON.parse(r.pre_repair_photos) : r.pre_repair_photos) : []; } catch (e) { pre = []; }
  let post = []; try { post = r.post_repair_photos ? (typeof r.post_repair_photos === 'string' ? JSON.parse(r.post_repair_photos) : r.post_repair_photos) : []; } catch (e) { post = []; }
  return {
    id: r.id, container: r.container, ctype: r.ctype || '', line: r.line_id || null,
    interchangeId: r.interchange_id || null, surveyId: r.survey_id || null,
    eirNumber: r.eir_number || '', condition: r.condition || '',
    repairs, repairTotal: r.repair_total || 0,
    gateInPhoto: r.gate_in_photo || '', approvalDoc: r.approval_doc || '', approvalDocName: r.approval_doc_name || '',
    approvedByLine: r.approved_by_line || '', approvalReference: r.approval_reference || '',
    preRepairPhotos: pre, postRepairPhotos: post,
    status: r.status || 'awaiting_approval', tech: r.tech || '',
    labourCost: r.labour_cost || 0, materialCost: r.material_cost || 0, totalCost: r.total_cost || 0,
    notes: r.notes || '', createdBy: r.created_by || '', createdAt: r.created_at,
    completedAt: r.completed_at || null,
  };
}

/* ──────────────────────────────────────────────────────────────────
   § 14b  RECEIPT PHOTO CAPTURE (shared by admin + driver fuel forms)
────────────────────────────────────────────────────────────────── */
const _pendingReceiptImg = { f: null, dp: null };

function handleReceiptFileSelect(input, previewId, scope) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type || !file.type.startsWith('image/')) { toast('Please choose an image file', 'error'); input.value=''; return; }
  if (file.size > 2*1024*1024) { toast('Image too large — max 2MB', 'error'); input.value=''; return; }
  const reader = gxImageReader();
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


function fuelLogTotal(f) {
  const paid = Number(f.totalPaid);
  return paid > 0 ? paid : (Number(f.litres) || 0) * (Number(f.pricePerLitre) || 0);
}

const _r2 = n => Math.round(n * 100) / 100;


function fuelTruckLabel(f)  { const t = state.db.trucks.find(x => x.id === f.truckId); return (t && t.reg) || f.truckRegText || f.truckId || '—'; }
function fuelDriverLabel(f) { return (f.driverId && driverName(f.driverId)) || f.driverNameText || '—'; }

const _fuelAnchor = {};

// prefix: 'f' (admin form), 'dp_f' (driver form), 'fe' (edit modal). Fields: <prefix>_litres/_price/_total
function fuelSync(prefix, changed) {
  const g = s => document.getElementById(`${prefix}_${s}`);
  const L = g('litres'), P = g('price'), T = g('total');
  if (!L || !P || !T) return;
  const litres = parseFloat(L.value) || 0, price = parseFloat(P.value) || 0, total = parseFloat(T.value) || 0;
  if (changed === 'price') _fuelAnchor[prefix] = 'price';
  if (changed === 'total') _fuelAnchor[prefix] = total > 0 ? 'total' : 'price';
  if ((_fuelAnchor[prefix] || 'price') === 'total') {
    if (litres > 0 && total > 0) P.value = _r2(total / litres);
  } else {
    T.value = (litres > 0 && price > 0) ? _r2(litres * price) : '';
  }
}

// Validates the three fields and fills in whichever of price/total was left blank.
function fuelResolveAmounts(prefix) {
  const g = s => parseFloat(document.getElementById(`${prefix}_${s}`)?.value) || 0;
  const litres = g('litres');
  let price = g('price'), total = g('total');
  if (litres <= 0) return { error: 'Litres are required' };
  if (litres > 1000) return { error: 'Litres exceed reasonable limit (1000L)' };
  if (price <= 0 && total <= 0) return { error: 'Enter the price per litre or the total amount paid' };
  if (price <= 0) price = _r2(total / litres);
  if (total <= 0) total = _r2(litres * price);
  return { litres, price, total };
}

function canEditFuel() { return isAdmin() || canSeeSection('fuel'); }

function showEditFuelModal(id) {
  if (!canEditFuel()) { toast('You don\u2019t have permission to edit fuel logs', 'error'); return; }
  const f = state.db.fuel.find(x => x.id === id);
  if (!f) return;
  _fuelAnchor.fe = 'total'; // the saved total is what was actually paid, so keep it fixed when litres change
  const localDate = d => new Date(d).toLocaleDateString('en-CA');
  const truckOpts = state.db.trucks.map(t => `<option value="${esc(t.id)}" ${t.id === f.truckId ? 'selected' : ''}>${esc(t.reg)} \u2014 ${esc(t.make)}</option>`).join('');
  const driverOpts = `<option value="">\u2014 None \u2014</option>` + state.db.drivers.map(d => `<option value="${esc(d.id)}" ${d.id === f.driverId ? 'selected' : ''}>${esc(d.name)}</option>`).join('');
  openModal('Edit Fuel Log', `
    <div class="form-row-2">
      <div class="fg"><label>Truck</label><select id="fe_truck">${truckOpts}</select></div>
      <div class="fg"><label>Driver</label><select id="fe_driver">${driverOpts}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Litres</label><input id="fe_litres" type="number" step="0.01" value="${esc(f.litres)}" oninput="fuelSync('fe','litres')"/></div>
      <div class="fg"><label>Price / Litre (KSh)</label><input id="fe_price" type="number" step="0.01" value="${esc(f.pricePerLitre)}" oninput="fuelSync('fe','price')"/></div>
    </div>
    <div class="fg"><label>Total Paid (KSh)</label><input id="fe_total" type="number" step="0.01" value="${esc(_r2(fuelLogTotal(f)))}" oninput="fuelSync('fe','total')"/></div>
    <div class="form-row-2">
      <div class="fg"><label>Date</label><input id="fe_date" type="date" value="${esc(localDate(f.date))}"/></div>
      <div class="fg"><label>Odometer (km)</label><input id="fe_odo" type="number" value="${esc(f.odometer || 0)}"/></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Station</label><input id="fe_station" value="${esc(f.station)}"/></div>
      <div class="fg"><label>Receipt No.</label><input id="fe_receipt" value="${esc(f.receipt)}"/></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="submit-btn" style="margin-top:0;flex:1" onclick="saveFuelEdit('${esc(f.id)}')">Save Changes \u2192</button>
      <button class="modal-btn ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function saveFuelEdit(id) {
  if (!canEditFuel()) { toast('You don\u2019t have permission to edit fuel logs', 'error'); return; }
  const f = state.db.fuel.find(x => x.id === id);
  if (!f) return;
  const truck = document.getElementById('fe_truck').value;
  if (!truck) { toast('Truck is required', 'error'); return; }
  const amt = fuelResolveAmounts('fe');
  if (amt.error) { toast(amt.error, 'error'); return; }

  const localDate = d => new Date(d).toLocaleDateString('en-CA');
  const dateVal = document.getElementById('fe_date').value;
  const date = (dateVal && dateVal !== localDate(f.date)) ? new Date(dateVal + 'T12:00:00').toISOString() : f.date;
  const next = {
    truckId: truck,
    driverId: document.getElementById('fe_driver').value || null,
    litres: amt.litres, pricePerLitre: amt.price, totalPaid: amt.total, date,
    odometer: Math.max(0, parseInt(document.getElementById('fe_odo').value) || 0),
    station: sanitize(document.getElementById('fe_station').value.trim()) || 'Unknown',
    receipt: sanitize(document.getElementById('fe_receipt').value.trim()) || f.receipt,
  };

  const changes = [];
  const note = (label, a, b) => { if (String(a) !== String(b)) changes.push(`${label} ${a} \u2192 ${b}`); };
  note('litres', f.litres, next.litres);
  note('price/L', f.pricePerLitre, next.pricePerLitre);
  note('total', _r2(fuelLogTotal(f)), next.totalPaid);
  note('truck', truckName(f.truckId), truckName(next.truckId));
  note('driver', driverName(f.driverId), driverName(next.driverId));
  note('date', localDate(f.date), localDate(next.date));
  note('odometer', f.odometer || 0, next.odometer);
  note('station', f.station, next.station);
  note('receipt', f.receipt, next.receipt);
  if (!changes.length) { closeModal(); toast('No changes to save', 'info', 1800); return; }

  const prevTruckId = f.truckId;
  Object.assign(f, next);
  f._dirty = true;
  new Set([prevTruckId, next.truckId]).forEach(tid => { const tk = state.db.trucks.find(x => x.id === tid); if (tk) applyTruckFuel(tk); });
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Log Edited', `${truckName(next.truckId)} \u2014 ${changes.join('; ')}`);
  closeModal();
  renderFuelTable(); renderFuelSummary(); renderTruckFuelLevels(); updateFuelTruckHint();
  toast('Fuel log updated', 'success');
}



// Capacity is only known if someone entered it for the truck. 0 = unknown (no % / bar, no cap).
function truckCapacity(t) { const c = Number(t.tankCapacity); return c > 0 ? c : 0; }

function truckFuelLitres(t) {
  return (typeof t.fuelLitres === 'number' && isFinite(t.fuelLitres)) ? t.fuelLitres : 0;
}

// % of tank, or null when it can't be known (no capacity entered, or nothing logged)
function truckFuelPct(t) {
  if (!t.fuelLogged || t.fuelPct == null || t.fuelPct === '' || !isFinite(Number(t.fuelPct))) return null;
  return Number(t.fuelPct);
}

function truckFuelColour(t) {
  const p = truckFuelPct(t);
  return p == null ? (t.fuelLogged ? 'var(--text-2)' : 'var(--text-3)') : fuelColour(p);
}

function truckFuelLabel(t) {
  if (!t.fuelLogged) return 'No fuel logged';
  const p = truckFuelPct(t);
  return `${fmt(Math.round(truckFuelLitres(t)))} L` + (p == null ? '' : ` \u00b7 ${Math.round(p)}%`);
}

// Level bar. Empty string when there is no % to draw (nothing logged or no capacity set).
function truckFuelBar(t, style) {
  const p = truckFuelPct(t);
  if (p == null) return '';
  return `<div class="fuel-bar"${style ? ` style="${style}"` : ''}><div class="fuel-fill" style="width:${p}%;background:${fuelColour(p)}"></div></div>`;
}

function computeTruckFuel(t, fuelLogs) {
  const cap = truckCapacity(t);
  const kmpl = Number(t.kmPerLitre) > 0 ? Number(t.kmPerLitre) : 0;
  // Older trucks may carry a stored baseline reading; if present it is honoured, otherwise start from zero.
  const hasBaseline = !!t.fuelBaselineAt;
  const baseAt = hasBaseline ? new Date(t.fuelBaselineAt).getTime() : -Infinity;
  let level = hasBaseline ? Math.max(0, Number(t.fuelBaselineLitres) || 0) : 0;
  if (cap) level = Math.min(cap, level);
  let lastOdo = hasBaseline ? (Number(t.fuelBaselineOdo) || 0) : 0;
  let overflow = false, asOf = hasBaseline ? t.fuelBaselineAt : null;
  const fills = (fuelLogs || []).filter(f => f.truckId === t.id && new Date(f.date).getTime() > baseAt)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const f of fills) {
    const odo = Number(f.odometer) || 0;
    if (kmpl && odo > 0 && lastOdo > 0 && odo > lastOdo) level = Math.max(0, level - (odo - lastOdo) / kmpl);
    if (odo > lastOdo) lastOdo = odo;
    const raw = level + (Number(f.litres) || 0);
    overflow = cap > 0 && raw > cap + 0.5;
    level = cap > 0 ? Math.min(cap, raw) : raw;
    asOf = f.date;
  }
  const logged = hasBaseline || fills.length > 0;
  return { litres: _r2(level), capacity: cap, pct: (logged && cap > 0) ? Math.min(100, Math.round(level / cap * 100)) : null, overflow, asOf, modelled: !!kmpl, logged };
}

function applyTruckFuel(t, fuelLogs) {
  const st = computeTruckFuel(t, fuelLogs || state.db.fuel);
  t.fuelLitres = st.litres;
  t.fuelPct = st.pct;
  t.fuelLogged = st.logged;
  return st;
}

function recomputeAllTruckFuel(trucks, fuelLogs) { (trucks || []).forEach(t => applyTruckFuel(t, fuelLogs)); }

// Used by the Add/Edit Truck forms. o = { capacity, kmpl }. Only the optional capacity and km/L are stored on the truck;
// the fuel level itself is never typed in, it comes from the fuel logs.
function applyTruckFuelInputs(t, o) {
  t.tankCapacity = o.capacity > 0 ? o.capacity : null;
  t.kmPerLitre = o.kmpl > 0 ? o.kmpl : null;
  applyTruckFuel(t);
}

function updateFuelTruckHint() {
  const sel = document.getElementById('f_truck'), el = document.getElementById('f_truck_fuel');
  if (!sel || !el) return;
  const t = state.db.trucks.find(x => x.id === sel.value);
  if (!t) { el.innerHTML = ''; return; }
  if (!t.fuelLogged) { el.innerHTML = 'No fuel logged for this truck yet'; return; }
  const cap = truckCapacity(t), p = truckFuelPct(t);
  el.innerHTML = `Logged on board: <b style="color:${truckFuelColour(t)}">${fmt(Math.round(truckFuelLitres(t)))} L</b>${cap ? ` of ${fmt(cap)} L${p == null ? '' : ` (${Math.round(p)}%)`}` : ''}${t.kmPerLitre ? '' : ' \u00b7 set km/L on the truck to deduct usage'}`;
}

function renderTruckFuelLevels() {
  const el = document.getElementById('truckFuelLevels');
  if (!el) return;
  // trucks with fuel logged first (lowest litres first), trucks with nothing logged last
  const trucks = [...state.db.trucks].sort((a, b) => (b.fuelLogged ? 1 : 0) - (a.fuelLogged ? 1 : 0) || truckFuelLitres(a) - truckFuelLitres(b));
  const rows = trucks.map(t => {
    const cap = truckCapacity(t);
    const val = t.fuelLogged
      ? `${fmt(Math.round(truckFuelLitres(t)))} L${cap ? ` <span style="color:var(--text-3);font-weight:400">/ ${fmt(cap)} L</span>` : ''}`
      : '<span style="color:var(--text-3);font-weight:400">No fuel logged</span>';
    return `<div class="fuel-summary-row"><span class="fsr-label">${esc(t.reg)}</span><span class="fsr-val" style="color:${truckFuelColour(t)}">${val}</span></div>${truckFuelBar(t, 'margin:0 0 8px')}`;
  }).join('') || '<div style="padding:10px;color:var(--text-3);font-size:11px">No trucks</div>';
  const needsKmpl = trucks.some(t => t.fuelLogged && !(Number(t.kmPerLitre) > 0));
  el.innerHTML = rows + (needsKmpl ? '<div style="font-size:9.5px;color:var(--text-3);line-height:1.5;margin-top:4px">Levels come only from the fuel logs. Trucks with no fuel economy (km/L) set only go up when fuel is logged. Set it under Fleet \u2192 Edit Truck and usage between fills is deducted from odometer readings.</div>' : '');
}

function fuelSavedToast(total, st, t) {
  toast(`Fuel log saved \u2014 ${fmtKsh(total)}${t && st ? ` \u00b7 ${t.reg} now ~${fmt(Math.round(st.litres))} L` : ''}`, 'success');
  if (t && st && st.overflow) toast(`That fill is more than ${t.reg}'s ${fmt(st.capacity)} L tank \u2014 check the litres or the tank capacity`, 'warning', 6000);
}

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
  _fuelAnchor.dp_f = 'price';
  const myTruck = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">Log Fuel Fill-up</div>
      <div class="form-card-body">
        ${myTruck ? `<div class="ops-notice" style="margin-bottom:10px">${esc(myTruck.reg)} \u2014 ${myTruck.fuelLogged ? `fuel logged: <b>${fmt(Math.round(truckFuelLitres(myTruck)))} L</b>${truckCapacity(myTruck) ? ` of ${fmt(truckCapacity(myTruck))} L` : ''}` : 'no fuel logged yet'}</div>` : ''}
        <div class="form-row-2">
          <div class="fg"><label>Litres</label><input id="dp_f_litres" type="number" step="0.01" placeholder="180" oninput="fuelSync('dp_f','litres')"/></div>
          <div class="fg"><label>Price / Litre (KSh)</label><input id="dp_f_price" type="number" step="0.01" placeholder="155" value="${defaultPrice||''}" oninput="fuelSync('dp_f','price')"/></div>
        </div>
        <div class="fg"><label>Total Paid (KSh)</label><input id="dp_f_total" type="number" step="0.01" placeholder="Auto from litres \u00d7 price, or enter what you paid" oninput="fuelSync('dp_f','total')"/></div>
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
        <tbody>${logs.map(f=>`<tr><td class="mono" style="font-size:10px">${fmtDate(f.date)}</td><td class="mono">${fmt(f.litres)} L</td><td class="mono">${fmt(f.pricePerLitre)}</td><td class="mono" style="color:var(--gold);font-weight:700">${fmtKsh(fuelLogTotal(f))}</td><td style="font-size:11px;color:var(--text-3)">${f.station}</td><td>${f.receiptImg?`<img src="${f.receiptImg}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;cursor:pointer" onclick="openPhotoLightbox('${f.receiptImg}')"/>`:`<button class="modal-btn ghost" style="padding:2px 8px;font-size:9px" onclick="triggerImageUpload('fuel','${f.id}','receiptImg',()=>renderDriverPortal())">Attach</button>`}</td></tr>`).join('')||`<tr><td colspan="6" class="empty-td">No fuel logs yet</td></tr>`}</tbody>
      </table></div>
    </div>
  `;
}

function dpAddFuelLog() {
  const driver = myDriverRecord();
  if (!driver) return;
  const amt = fuelResolveAmounts('dp_f');
  if (amt.error) { toast(amt.error, 'error'); return; }
  const { litres, price, total } = amt;
  const log = {
    id: uid('FUEL'), truckId: driver.truckId||null, driverId: driver.id,
    date: new Date().toISOString(), litres, pricePerLitre: price, totalPaid: total,
    station: sanitize(document.getElementById('dp_f_station').value.trim())||'Unknown',
    odometer: Math.max(0, parseInt(document.getElementById('dp_f_odo').value)||0),
    receipt: document.getElementById('dp_f_receipt').value.trim()||uid('RCP'),
    receiptImg: _pendingReceiptImg.dp || '',
  };
  const t = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  state.db.fuel.push(log);
  log._dirty = true;
  _pendingReceiptImg.dp = null;
  let fuelState = null;
  if (t) { t.mileage = log.odometer||t.mileage; fuelState = applyTruckFuel(t); }
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Log (Driver)', `${truckName(driver.truckId)} — ${litres}L at KSh ${price}/L (total KSh ${total})`);
  fuelSavedToast(total, fuelState, t);
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
  renderTruckFuelLevels();
  updateFuelTruckHint();
}

function renderFuelTable() {
  const logs = [...state.db.fuel].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tbody = document.getElementById('fuelTableBody');
  if (!tbody) return;
  tbody.innerHTML = logs.slice(0, 200).map(f=>`<tr><td class="mono" style="font-size:10px">${fmtDate(f.date)}</td><td>${esc(fuelTruckLabel(f))}</td><td>${esc(fuelDriverLabel(f))}</td><td class="mono" style="text-align:right">${fmt(f.litres)} L</td><td class="mono" style="text-align:right">${fmt(f.pricePerLitre)}</td><td class="mono" style="text-align:right;color:var(--gold);font-weight:700">${fmtKsh(fuelLogTotal(f))}</td><td style="color:var(--text-3);font-size:11px">${f.station}</td><td>${f.receiptImg?`<img src="${f.receiptImg}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;cursor:pointer" onclick="openPhotoLightbox('${f.receiptImg}')"/>`:`<button class="modal-btn ghost" style="padding:2px 8px;font-size:9px" onclick="triggerImageUpload('fuel','${f.id}','receiptImg',()=>renderFuelTable())">Attach</button>`}</td><td>${canEditFuel()?`<button class="tbl-btn" onclick="showEditFuelModal('${esc(f.id)}')">Edit</button>`:''}</td></tr>`).join('') || `<tr><td colspan="9" class="empty-td">No fuel logs</td></tr>`;
}

function renderFuelSummary() {
  if (typeof renderFuelReport === 'function') renderFuelReport();   // keep the money report in step with every change
  // Pump fills (litres recorded) are summarised on their own. Imported trip payments carry
  // no litres, so mixing them in would wreck the price-per-litre average; they are
  // totalled in the Fuel & Trip Payments Report instead.
  const fills = state.db.fuel.filter(f => (Number(f.litres) || 0) > 0);
  const trips = state.db.fuel.length - fills.length;
  const totalL   = fills.reduce((s,f)=>s+Number(f.litres), 0);
  const totalKsh = fills.reduce((s,f)=>s+fuelLogTotal(f), 0);
  const avgPpl   = totalL > 0 ? totalKsh/totalL : 0;
  const el = document.getElementById('fuelSummary');
  if (!el) return;
  const row = (l, v) => `<div class="fuel-summary-row"><span class="fsr-label">${l}</span><span class="fsr-val">${v}</span></div>`;
  el.innerHTML = row('Total Litres', `${fmt(Math.round(totalL * 100) / 100)} L`)
    + row('Fuel Purchases', fmtKsh(Math.round(totalKsh)))
    + row('Avg Price/Litre', totalL > 0 ? `KSh ${avgPpl.toFixed(2)}` : '—')
    + row('Fill-ups Logged', fills.length)
    + (trips ? row('Trip Payments Imported', trips.toLocaleString()) : '');
}

function addFuelLog() {
  const truck  = document.getElementById('f_truck').value;
  const driver = document.getElementById('f_driver').value;
  if (!truck) { toast('Truck is required', 'error'); return; }
  const amt = fuelResolveAmounts('f');
  if (amt.error) { toast(amt.error, 'error'); return; }
  const { litres, price, total } = amt;
  const log = {
    id: uid('FUEL'), truckId: truck, driverId: driver,
    date: new Date().toISOString(), litres, pricePerLitre: price, totalPaid: total,
    station: sanitize(document.getElementById('f_station').value.trim())||'Unknown',
    odometer: Math.max(0, parseInt(document.getElementById('f_odo').value)||0),
    receipt: document.getElementById('f_receipt').value.trim()||uid('RCP'),
    receiptImg: _pendingReceiptImg.f || '',
  };
  const t = state.db.trucks.find(t=>t.id===truck);
  state.db.fuel.push(log);
  log._dirty = true;
  _pendingReceiptImg.f = null;
  let fuelState = null;
  if (t) { t.mileage = log.odometer||t.mileage; fuelState = applyTruckFuel(t); }
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Log', `${truckName(truck)} — ${litres}L at KSh ${price}/L (total KSh ${total})`);
  ['f_litres','f_price','f_total','f_station','f_odo','f_receipt'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  clearPendingReceiptImg('f','f_receipt_img_preview');
  const priceInput = document.getElementById('f_price');
  if (priceInput) priceInput.value = currentFuelPrice() || '';
  _fuelAnchor.f = 'price';
  renderFuelTable(); renderFuelSummary(); renderTruckFuelLevels(); updateFuelTruckHint();
  fuelSavedToast(total, fuelState, t);
}

/* ──────────────────────────────────────────────────────────────────
   § 20  WORKSHOP
────────────────────────────────────────────────────────────────── */
let _wsFilter='all';

function filterWorkshop(f,btn){ _wsFilter=f; document.querySelectorAll('#wsTabTrucks .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderWorkshop(f); }

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

/* ----------------------------------------------------------------------
   SS 21  CONTAINER REPAIRS (Workshop -> Container Repairs tab)
   Borrows container/survey details from Interchange, tracks the
   shipping line's EIR/repair approval, and carries gate-in -> pre ->
   post-repair photos through to job completion.
---------------------------------------------------------------------- */
let _wsTab = 'trucks';
let _crFilter = 'all';

function switchWorkshopTab(tab, btn) {
  _wsTab = tab;
  const trucksEl = document.getElementById('wsTabTrucks');
  const containersEl = document.getElementById('wsTabContainers');
  if (trucksEl) trucksEl.style.display = tab === 'trucks' ? 'block' : 'none';
  if (containersEl) containersEl.style.display = tab === 'containers' ? 'block' : 'none';
  document.querySelectorAll('#sec-workshop > .sec-toolbar > .filter-row > .filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'trucks') renderWorkshop(_wsFilter); else renderContainerRepairs(_crFilter);
}

function renderWorkshopSection() {
  if (_wsTab === 'containers') renderContainerRepairs(_crFilter); else renderWorkshop(_wsFilter);
}

function crStatusLabel(s) { return { awaiting_approval:'Awaiting Approval', approved:'Approved', in_progress:'In Progress', completed:'Completed' }[s] || s; }

function filterContainerRepairs(f, btn) {
  _crFilter = f;
  document.querySelectorAll('#wsTabContainers .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderContainerRepairs(f);
}

/* Interchange records that look like they need repair - the pool a new
   repair job can be pulled from. */
function eligibleRepairSourceInterchange() {
  return (state.db.interchange || [])
    .filter(ic => (ic.repairs && ic.repairs.length) || /damag|repair/i.test(ic.condition || ''))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 150);
}

/* Same photo lookup Interchange's own "Photos" button uses - pulls the
   gate photo plus any photos captured at survey time. */
async function resolveContainerPhotos(ic) {
  let photos = [];
  if (ic.surveyId) {
    let s = (_surveyRegisterData.find(x => x.id === ic.surveyId)) || _surveyLookupCache[ic.surveyId];
    if (!s) { try { s = await window.bookingDocs.surveyById(ic.surveyId); if (s) _surveyLookupCache[s.id] = s; } catch (e) { /* fall through */ } }
    if (s && Array.isArray(s.photos)) photos = s.photos.slice();
  }
  if (ic.img && photos.indexOf(ic.img) === -1) photos.unshift(ic.img);
  return photos;
}

function renderContainerRepairs(f) {
  if (!Array.isArray(state.db.containerRepairs)) state.db.containerRepairs = [];
  const all = [...state.db.containerRepairs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const items = f === 'all' ? all : all.filter(c => c.status === f);
  const el = document.getElementById('containerRepairsList');
  if (!el) return;
  el.innerHTML = items.map(c => {
    const thumb = c.gateInPhoto
      ? `<img src="${c.gateInPhoto}" style="width:100%;height:100%;object-fit:cover" />`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    const itemsCount = (c.repairs || []).length;
    const damageLine = itemsCount ? `${itemsCount} damage item${itemsCount > 1 ? 's' : ''} \u00b7 KSh ${Number(c.repairTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'No itemised damage on file';
    const approvalLine = c.approvalDoc
      ? `\u2713 Shipping line approval on file${c.approvalReference ? ` \u00b7 Ref ${esc(c.approvalReference)}` : ''}`
      : '\u26a0 Awaiting shipping line approval document';
    const postCount = (c.postRepairPhotos || []).length;
    const actions = [];
    actions.push(`<button class="modal-btn ghost" onclick="showContainerRepairPhotos('${c.id}')">\ud83d\udcf7 Photos</button>`);
    if (!c.approvalDoc) actions.push(`<button class="modal-btn primary" onclick="showAttachApprovalModal('${c.id}')">Attach Approval</button>`);
    if (c.status === 'approved') actions.push(`<button class="modal-btn ghost" onclick="advanceContainerRepair('${c.id}','in_progress')">Start Repair</button>`);
    if (c.status === 'in_progress') actions.push(`<button class="modal-btn success" onclick="advanceContainerRepair('${c.id}','completed')">Mark Complete</button>`);
    if (c.status !== 'completed') actions.push(`<button class="modal-btn ghost" onclick="uploadPostRepairPhoto('${c.id}')">+ Post-Repair Photo</button>`);
    return `<div class="ic-card">
      <div class="ic-card-img-placeholder" style="cursor:pointer;overflow:hidden" onclick="showContainerRepairPhotos('${c.id}')" title="View photos">${thumb}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <div class="mono" style="font-size:13px;color:var(--gold)">${esc(c.container)}</div>
          ${sbadge(c.status)}
        </div>
        <div style="font-size:11.5px;color:var(--text-2)">${esc(c.ctype || '\u2014')} \u00b7 ${lineName(c.line)}${c.eirNumber ? ` \u00b7 EIR ${esc(c.eirNumber)}` : ''}</div>
        <div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${damageLine}</div>
        <div style="font-size:10.5px;margin-top:2px;color:${c.approvalDoc ? 'var(--green)' : 'var(--amber)'}">${approvalLine}</div>
        ${c.tech ? `<div style="font-size:10px;color:var(--text-3);margin-top:2px">Technician: ${esc(c.tech)}</div>` : ''}
        ${postCount ? `<div style="font-size:10px;color:var(--text-3);margin-top:2px">${postCount} post-repair photo${postCount > 1 ? 's' : ''} on file</div>` : ''}
        ${c.notes ? `<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${esc(c.notes)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">${actions.join('')}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-state-icon">\ud83d\udee0\ufe0f</div><div class="empty-state-label">No container repair jobs</div></div>';
}

function showAddContainerRepairModal() {
  window._repairItems.cr = [];
  window._pendingCRApprovalDoc = '';
  window._pendingCRApprovalDocName = '';
  window._crGatePhotos = [];
  window._crSourceInterchangeId = null;
  window._crSourceSurveyId = null;
  const sourceOptions = eligibleRepairSourceInterchange().map(ic =>
    `<option value="${ic.id}">${esc(ic.container)} \u2014 ${esc(lineName(ic.line))} \u2014 ${fmtDate(ic.date)}${ic.eirNumber ? ` (EIR ${esc(ic.eirNumber)})` : ''}</option>`
  ).join('');
  const typeOptions = CONTAINER_TYPE_OPTIONS.map(t => `<option>${t}</option>`).join('');
  openModal('New Container Repair Job', `
    <div class="fg">
      <label>Pull From Interchange Record <span class="label-optional">(recommended)</span></label>
      <select id="cr_source" onchange="onRepairSourceChange()">
        <option value="">\u2014 Manual entry / no matching interchange record \u2014</option>
        ${sourceOptions}
      </select>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Container No.</label><input id="cr_cont" list="containerHistory" placeholder="MSCU1234566" oninput="markContainerValidity(this)"/></div>
      <div class="fg"><label>Container Type/Size</label><select id="cr_ctype">${typeOptions}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Shipping Line</label><select id="cr_line">${state.db.shippingLines.map(l => `<option value="${l.id}">${l.code}</option>`).join('')}</select></div>
      <div class="fg"><label>EIR / Reference No.</label><input id="cr_eir" placeholder="From gate interchange record"/></div>
    </div>
    <div class="fg"><label>Condition</label><select id="cr_cond"><option>Damaged</option><option>Needs Repair</option><option>Dirty</option></select></div>
    <div id="cr_gatePhotoBox" style="margin-bottom:14px"></div>
    ${tariffPickerHtml('cr')}
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:16px 0 8px">Shipping Line Approval</div>
    <div class="ops-notice" style="margin-bottom:10px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      Upload the EIR / interchange document showing the shipping line has approved this container for repair. You can also attach this later.
    </div>
    <div class="fg">
      <div id="cr_approval_box" class="ic-card-img-placeholder" style="width:100%;height:90px;cursor:pointer" onclick="document.getElementById('cr_approval_input').click()" title="Tap to upload the approval document">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </div>
      <input type="file" id="cr_approval_input" accept="image/*,application/pdf" style="display:none" onchange="captureCRApprovalDoc(this)"/>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Approved By (Shipping Line) <span class="label-optional">(optional)</span></label><input id="cr_approved_by" placeholder="Name / contact"/></div>
      <div class="fg"><label>Approval Reference <span class="label-optional">(optional)</span></label><input id="cr_approval_ref" placeholder="Their reference no."/></div>
    </div>
    <div class="fg"><label>Notes</label><textarea id="cr_notes" rows="2" placeholder="Additional context\u2026"></textarea></div>
    <button class="submit-btn" onclick="saveContainerRepair()">Create Repair Job \u2192</button>
  `);
  renderRepairItemsList('cr');
}

async function onRepairSourceChange() {
  const id = document.getElementById('cr_source').value;
  const gateBox = document.getElementById('cr_gatePhotoBox');
  window._crSourceInterchangeId = id || null;
  if (!id) { if (gateBox) gateBox.innerHTML = ''; window._crGatePhotos = []; window._crSourceSurveyId = null; return; }
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) return;
  document.getElementById('cr_cont').value = ic.container;
  markContainerValidity(document.getElementById('cr_cont'));
  if (ic.ctype) document.getElementById('cr_ctype').value = ic.ctype;
  if (ic.line) document.getElementById('cr_line').value = ic.line;
  document.getElementById('cr_eir').value = ic.eirNumber || '';
  const condSel = document.getElementById('cr_cond');
  if ([...condSel.options].some(o => o.value === ic.condition)) condSel.value = ic.condition;
  window._repairItems.cr = (ic.repairs || []).map(r => ({ ...r }));
  renderRepairItemsList('cr');
  window._crSourceSurveyId = ic.surveyId || null;

  if (gateBox) gateBox.innerHTML = '<div style="font-size:10.5px;color:var(--text-3)">Loading gate-in photo\u2026</div>';
  const photos = await resolveContainerPhotos(ic);
  window._crGatePhotos = photos;
  if (!gateBox) return;
  gateBox.innerHTML = photos.length
    ? `<div style="font-size:10px;color:var(--text-3);margin-bottom:6px">Gate-in photo${photos.length > 1 ? 's' : ''} on file \u2014 carried over automatically</div>
       <div style="display:flex;gap:6px;flex-wrap:wrap">${photos.map(p => `<img src="${p}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:zoom-in" onclick="openPhotoLightbox('${p}')"/>`).join('')}</div>`
    : `<div style="font-size:10.5px;color:var(--text-3)">No gate-in photo on file for this container yet.</div>`;
}

function captureCRApprovalDoc(input) {
  const file = input.files[0];
  if (!file) return;
  const isPdf = file.type === 'application/pdf';
  if (!isPdf && !(file.type || '').startsWith('image/')) { toast('Choose an image or PDF file', 'error'); input.value = ''; return; }
  if (file.size > 4 * 1024 * 1024) { toast('File too large \u2014 max 4MB', 'error'); input.value = ''; return; }
  const reader = gxImageReader();
  reader.onload = () => {
    window._pendingCRApprovalDoc = reader.result;
    window._pendingCRApprovalDocName = file.name;
    const box = document.getElementById('cr_approval_box');
    if (box) {
      box.innerHTML = isPdf
        ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-2);font-size:10.5px">\ud83d\udcc4<div style="margin-top:4px">${esc(file.name)}</div></div>`
        : `<img src="${reader.result}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" />`;
    }
  };
  reader.readAsDataURL(file);
}

function saveContainerRepair() {
  const cont = document.getElementById('cr_cont').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }
  const line = document.getElementById('cr_line').value;
  if (!line) { toast('Shipping line required', 'error'); return; }
  const repairs = window._repairItems.cr || [];
  const approvalDoc = window._pendingCRApprovalDoc || '';
  const hasApproval = !!approvalDoc;
  state.db.containerRepairs.push({
    id: uid('CR'), container: cont,
    ctype: document.getElementById('cr_ctype').value,
    line,
    interchangeId: window._crSourceInterchangeId || null,
    surveyId: window._crSourceSurveyId || null,
    eirNumber: sanitize(document.getElementById('cr_eir').value.trim()),
    condition: document.getElementById('cr_cond').value,
    repairs, repairTotal: repairItemsTotal(repairs),
    gateInPhoto: (window._crGatePhotos && window._crGatePhotos[0]) || '',
    approvalDoc, approvalDocName: window._pendingCRApprovalDocName || '',
    approvedByLine: sanitize(document.getElementById('cr_approved_by').value.trim()),
    approvalReference: sanitize(document.getElementById('cr_approval_ref').value.trim()),
    preRepairPhotos: (window._crGatePhotos || []).slice(1),
    postRepairPhotos: [],
    status: hasApproval ? 'approved' : 'awaiting_approval',
    tech: '', labourCost: 0, materialCost: 0, totalCost: 0,
    notes: sanitize(document.getElementById('cr_notes').value.trim()),
    createdBy: state.profile?.username || 'system',
    createdAt: new Date().toISOString(),
    completedAt: null,
    _dirty: true,
  });
  window._repairItems.cr = [];
  window._pendingCRApprovalDoc = ''; window._pendingCRApprovalDocName = '';
  window._crGatePhotos = []; window._crSourceInterchangeId = null; window._crSourceSurveyId = null;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Container Repair Job Created', `${cont}${hasApproval ? ' (approval attached)' : ' (pending shipping line approval)'}`);
  closeModal();
  renderContainerRepairs(_crFilter);
  toast(hasApproval ? 'Repair job created \u2014 approved' : 'Repair job created \u2014 attach shipping line approval to proceed', 'success');
}

function showAttachApprovalModal(id) {
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c) return;
  window._pendingCRApprovalDoc = ''; window._pendingCRApprovalDocName = '';
  openModal(`Attach Shipping Line Approval \u2014 ${esc(c.container)}`, `
    <div class="fg">
      <div id="cr_approval_box2" class="ic-card-img-placeholder" style="width:100%;height:100px;cursor:pointer" onclick="document.getElementById('cr_approval_input2').click()" title="Tap to upload the approval document">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </div>
      <input type="file" id="cr_approval_input2" accept="image/*,application/pdf" style="display:none" onchange="captureCRApprovalDoc2(this)"/>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Approved By (Shipping Line)</label><input id="cr_approved_by2" value="${esc(c.approvedByLine || '')}" placeholder="Name / contact"/></div>
      <div class="fg"><label>Approval Reference</label><input id="cr_approval_ref2" value="${esc(c.approvalReference || '')}" placeholder="Their reference no."/></div>
    </div>
    <button class="submit-btn" onclick="saveAttachedApproval('${id}')">Save Approval \u2192</button>
  `);
}

function captureCRApprovalDoc2(input) {
  const file = input.files[0];
  if (!file) return;
  const isPdf = file.type === 'application/pdf';
  if (!isPdf && !(file.type || '').startsWith('image/')) { toast('Choose an image or PDF file', 'error'); input.value = ''; return; }
  if (file.size > 4 * 1024 * 1024) { toast('File too large \u2014 max 4MB', 'error'); input.value = ''; return; }
  const reader = gxImageReader();
  reader.onload = () => {
    window._pendingCRApprovalDoc = reader.result;
    window._pendingCRApprovalDocName = file.name;
    const box = document.getElementById('cr_approval_box2');
    if (box) {
      box.innerHTML = isPdf
        ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-2);font-size:10.5px">\ud83d\udcc4<div style="margin-top:4px">${esc(file.name)}</div></div>`
        : `<img src="${reader.result}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" />`;
    }
  };
  reader.readAsDataURL(file);
}

function saveAttachedApproval(id) {
  if (!window._pendingCRApprovalDoc) { toast('Choose the approval document first', 'error'); return; }
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c) return;
  c.approvalDoc = window._pendingCRApprovalDoc;
  c.approvalDocName = window._pendingCRApprovalDocName || '';
  c.approvedByLine = sanitize(document.getElementById('cr_approved_by2').value.trim());
  c.approvalReference = sanitize(document.getElementById('cr_approval_ref2').value.trim());
  if (c.status === 'awaiting_approval') c.status = 'approved';
  c._dirty = true;
  window._pendingCRApprovalDoc = ''; window._pendingCRApprovalDocName = '';
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Container Repair Approval Attached', c.container);
  closeModal();
  renderContainerRepairs(_crFilter);
  toast('Shipping line approval attached', 'success');
}

function showStartRepairModal(id) {
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c) return;
  if (!c.approvalDoc) { toast('Attach the shipping line approval before starting repair work', 'error'); return; }
  openModal(`Start Repair \u2014 ${esc(c.container)}`, `
    <div class="fg"><label>Technician</label><input id="cr_start_tech" placeholder="Tech name"/></div>
    <div class="form-row-2">
      <div class="fg"><label>Labour Estimate (KSh)</label><input id="cr_start_labour" type="number" placeholder="0"/></div>
      <div class="fg"><label>Materials Estimate (KSh)</label><input id="cr_start_material" type="number" placeholder="0"/></div>
    </div>
    <button class="submit-btn" onclick="confirmStartRepair('${id}')">Start Repair Job \u2192</button>
  `);
}

function confirmStartRepair(id) {
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c) return;
  c.tech = sanitize(document.getElementById('cr_start_tech').value.trim());
  c.labourCost = Math.max(0, parseInt(document.getElementById('cr_start_labour').value) || 0);
  c.materialCost = Math.max(0, parseInt(document.getElementById('cr_start_material').value) || 0);
  c.totalCost = c.labourCost + c.materialCost;
  c.status = 'in_progress';
  c._dirty = true;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Container Repair Started', c.container);
  closeModal();
  renderContainerRepairs(_crFilter);
  toast('Repair job in progress', 'success');
}

function advanceContainerRepair(id, status) {
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c) return;
  if (status === 'in_progress') { showStartRepairModal(id); return; }
  if (status === 'completed') {
    if (!(c.postRepairPhotos || []).length) { toast('Add at least one post-repair photo before marking this job complete', 'error'); return; }
    if (!confirm(`Mark ${c.container} as repair completed?`)) return;
    c.status = 'completed';
    c.completedAt = new Date().toISOString();
  } else {
    c.status = status;
  }
  c._dirty = true;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Container Repair Updated', `${c.container} \u2192 ${status}`);
  renderContainerRepairs(_crFilter);
  toast(`Job updated to ${crStatusLabel(status)}`, 'success');
}

function uploadPostRepairPhoto(id) {
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c) return;
  if ((c.postRepairPhotos || []).length >= 8) { toast('Maximum 8 post-repair photos per job', 'error'); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Image too large \u2014 max 2MB', 'error'); return; }
    const reader = gxImageReader();
    reader.onload = () => {
      c.postRepairPhotos = c.postRepairPhotos || [];
      c.postRepairPhotos.push(reader.result);
      c._dirty = true;
      scheduleSave();
      toast('Post-repair photo added', 'success');
      renderContainerRepairs(_crFilter);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function removePostRepairPhoto(id, idx) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c || !c.postRepairPhotos) return;
  c.postRepairPhotos.splice(idx, 1);
  c._dirty = true;
  scheduleSave();
  showContainerRepairPhotos(id);
  renderContainerRepairs(_crFilter);
}

async function showContainerRepairPhotos(id) {
  const c = state.db.containerRepairs.find(x => x.id === id);
  if (!c) { toast('Repair job not found', 'error'); return; }
  openModal(`Photos \u2014 ${sanitize(c.container) || 'Container'}`, '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>');

  let gatePhotos = [];
  if (c.surveyId) {
    let s = (_surveyRegisterData.find(x => x.id === c.surveyId)) || _surveyLookupCache[c.surveyId];
    if (!s) { try { s = await window.bookingDocs.surveyById(c.surveyId); if (s) _surveyLookupCache[s.id] = s; } catch (e) { /* fall through */ } }
    if (s && Array.isArray(s.photos)) gatePhotos = s.photos.slice();
  }
  if (c.gateInPhoto && gatePhotos.indexOf(c.gateInPhoto) === -1) gatePhotos.unshift(c.gateInPhoto);
  (c.preRepairPhotos || []).forEach(p => { if (gatePhotos.indexOf(p) === -1) gatePhotos.push(p); });
  const post = c.postRepairPhotos || [];

  const body = document.getElementById('modalBody');
  if (!body) return;

  const section = (title, photos, removable) => photos.length ? `
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">${title} (${photos.length})</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${photos.map((src, i) => `
      <div style="position:relative">
        <img src="${src}" alt="${esc(title)} photo ${i + 1}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid var(--border)" onclick="openPhotoLightbox(this.src)">
        ${removable ? `<button class="modal-btn danger" style="position:absolute;top:4px;right:4px;padding:1px 6px;font-size:9px" onclick="event.stopPropagation();removePostRepairPhoto('${id}',${i})">\u2715</button>` : ''}
      </div>`).join('')}</div>` : '';

  const approvalBlock = c.approvalDoc ? `
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Shipping Line Approval</div>
    ${c.approvalDoc.startsWith('data:application/pdf')
      ? `<a href="${c.approvalDoc}" target="_blank" rel="noopener" class="modal-btn ghost">\ud83d\udcc4 View ${esc(c.approvalDocName || 'approval document')}</a>`
      : `<img src="${c.approvalDoc}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid var(--border)" onclick="openPhotoLightbox(this.src)">`}
  ` : '';

  body.innerHTML = (gatePhotos.length || post.length || approvalBlock)
    ? `${section('Gate-In / Pre-Repair', gatePhotos, false)}${section('Post-Repair', post, isAdmin())}${approvalBlock}`
    : '<div class="empty-state"><div class="empty-state-label">No photos on file yet for this container</div></div>';
}