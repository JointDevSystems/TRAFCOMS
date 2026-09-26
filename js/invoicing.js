'use strict';


function invToRow(i)  { return { id:i.id, client:i.client, date:i.date, due:i.due, status:i.status, subtotal:i.subtotal, vat:i.vat, total:i.total, paid:i.paid, ref:i.ref, notes:i.notes, line_items: JSON.stringify(i.lineItems||[]) }; }

function invFromRow(r){
  let lineItems = [];
  try { lineItems = r.line_items ? (typeof r.line_items === 'string' ? JSON.parse(r.line_items) : r.line_items) : []; } catch(e) { lineItems = []; }
  return { id:r.id, client:r.client, date:r.date, due:r.due, status:r.status, subtotal:r.subtotal, vat:r.vat, total:r.total, paid:r.paid, ref:r.ref, notes:r.notes, trips:[], lineItems };
}



function ctypeSizeKey(ctype) {
  const m = /^(\d+)\s*ft/i.exec((ctype || '').trim());
  return m ? `${m[1]}ft` : null;
}

function isReeferCtype(ctype) { return /reefer/i.test(ctype || ''); }

function shippingLineForTrip(t) { return state.db.shippingLines.find(l => l.id === t.shippingLine) || null; }

function serviceRateFor(lineCode, serviceKey, sizeKey) {
  const sched = window.SERVICE_RATE_SCHEDULE;
  if (!sched || !sizeKey) return null;
  const override = lineCode ? sched.lineOverrides?.[lineCode.toUpperCase()] : null;
  const def = (override?.services && override.services[serviceKey]) || (sched.services && sched.services[serviceKey]);
  const amount = def?.rates?.[sizeKey];
  if (def == null || amount == null) return null;
  return { amount, currency: override?.currency || sched.currency, label: def.label, unit: def.unit, freeDays: def.freeDays };
}

function toKsh(amount, currency) {
  if (currency === 'KES' || currency === 'KSh' || currency === 'KSH') return amount;
  return amount * invoiceConfig().usdToKes;
}

/**
 * Computes the rate-card charge lines for one trip.
 * opts booleans default: lolo/serviceCharge/transport = true, everything else false.
 */
function computeTripServiceCharges(trip, opts) {
  opts = Object.assign({ lolo: true, serviceCharge: true, transport: true,
    lastMile: false, portPreStack: false, photo: false, storage: false, storageDays: 0 }, opts || {});
  const sizeKey  = ctypeSizeKey(trip.ctype);
  const line     = shippingLineForTrip(trip);
  const lineCode = line ? line.code : null;
  const lines = [];

  if (!sizeKey || !window.SERVICE_RATE_SCHEDULE) {
    return { lines, subtotalKsh: 0, matched: false, sizeKey, lineCode };
  }

  const add = (svcKey, label) => {
    const svc = serviceRateFor(lineCode, svcKey, sizeKey);
    if (!svc) return;
    lines.push({
      key: svcKey, label: label || svc.label, unit: svc.unit, qty: 1,
      unitAmount: svc.amount, currency: svc.currency,
      amountKsh: Math.round(toKsh(svc.amount, svc.currency)),
    });
  };

  if (opts.lolo)          add(isReeferCtype(trip.ctype) ? 'reefer' : 'lolo');
  if (opts.serviceCharge) add('serviceCharge');
  if (opts.transport)     add('transport');
  if (opts.lastMile)      add('lastMileTransport');
  if (opts.portPreStack)  add('portPreStack1');
  if (opts.photo)         add('photoCharges');

  if (opts.storage) {
    const svc = serviceRateFor(lineCode, 'storage', sizeKey);
    const freeDays = svc?.freeDays || window.SERVICE_RATE_SCHEDULE.services.storage?.freeDays || 0;
    const billableDays = Math.max(0, Math.round(opts.storageDays) - freeDays);
    if (svc && billableDays > 0) {
      lines.push({
        key: 'storage', label: `${svc.label} — ${billableDays} day(s) beyond ${freeDays}-day free period`,
        unit: svc.unit, qty: billableDays, unitAmount: svc.amount, currency: svc.currency,
        amountKsh: Math.round(toKsh(svc.amount * billableDays, svc.currency)),
      });
    }
  }

  const subtotalKsh = lines.reduce((s, l) => s + l.amountKsh, 0);
  return { lines, subtotalKsh, matched: lines.length > 0, sizeKey, lineCode, tripId: trip.id, container: trip.container };
}

/** Legacy flat-rate fallback for container types the rate card doesn't define. */
function legacyTripCharge(trip) {
  const rates  = state.db.billingRates?.[trip.ctype] || { base: 0, perKm: 0 };
  const amount = rates.base + rates.perKm * (trip.distance || 0);
  return {
    lines: [{ key: 'legacy', label: `Haulage — ${trip.ctype} (flat rate, no rate-card entry)`, unit: 'per trip', qty: 1, unitAmount: amount, currency: 'KES', amountKsh: Math.round(amount) }],
    subtotalKsh: Math.round(amount), matched: amount > 0, sizeKey: null, lineCode: null, tripId: trip.id, container: trip.container,
  };
}

/** Charges a trip from the rate schedule, falling back to the legacy flat rate if it isn't matched. */
function invoiceChargeForTrip(trip, opts) {
  const calc = computeTripServiceCharges(trip, opts);
  return calc.matched ? calc : legacyTripCharge(trip);
}

/** Combines charges for a set of trips into one flat line-item list + subtotal, for one invoice. */
function combineTripCharges(trips, opts) {
  const lineItems = [];
  let subtotalKsh = 0;
  (trips || []).forEach(t => {
    const calc = invoiceChargeForTrip(t, opts);
    calc.lines.forEach(l => lineItems.push(Object.assign({}, l, { tripId: t.id, container: t.container, ctype: t.ctype })));
    subtotalKsh += calc.subtotalKsh;
  });
  return { lineItems, subtotalKsh: Math.round(subtotalKsh) };
}


function renderInvoicing(f) {
  if (!isAdmin()) return;
  renderInvoiceKpis();
  renderInvoiceList(f);
}

function renderInvoiceKpis() {
  const inv = state.db.invoices;
  const total    = inv.reduce((s,i)=>s+i.total,0);
  const paid     = inv.reduce((s,i)=>s+i.paid,0);
  const outstanding = total - paid;
  const overdue  = inv.filter(i=>i.status==='overdue').reduce((s,i)=>s+(i.total-i.paid),0);
  const kpis = document.getElementById('invKpis');
  if (!kpis) return;
  kpis.innerHTML = `${kpiCard('Total Invoiced', fmtKsh(total), `${inv.length} invoices`, 'kpi-gold')} ${kpiCard('Collected', fmtKsh(paid), `${Math.round(paid/total*100)||0}% collected`, 'kpi-green')} ${kpiCard('Outstanding', fmtKsh(outstanding), 'Pending payment', 'kpi-blue')} ${kpiCard('Overdue', fmtKsh(overdue), `${inv.filter(i=>i.status==='overdue').length} invoices`, 'kpi-red')}`;
}

let _invFilter='all';

function filterInvoices(f,btn){ _invFilter=f; document.querySelectorAll('#sec-invoicing .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderInvoiceList(f); }

function renderInvoiceList(f){
  let items=f==='all'?state.db.invoices:state.db.invoices.filter(i=>i.status===f);
  const el=document.getElementById('invoicesList');
  if(!el) return;
  el.innerHTML=`<div class="inv-grid">${items.map(inv=>`<div class="inv-card ${inv.status}" onclick="showInvoiceDetail('${inv.id}')"><div class="inv-type-tag">${inv.ref}</div><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${inv.client}</div><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px"><div><div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--gold)">${fmtKsh(inv.total)}</div><div style="font-size:10px;color:var(--text-3);margin-top:2px">${inv.paid?`Paid: ${fmtKsh(inv.paid)}`:'Unpaid'}</div></div>${sbadge(inv.status)}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:8px">Due: ${fmtDate(inv.due)}</div></div>`).join('')||'<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-label">No invoices</div></div>'}</div>`;
}

async function showInvoiceDetail(id) {
  const inv = state.db.invoices.find(i=>i.id===id);
  if (!inv) return;

  await ensureTripsLoaded(inv.trips);
  const trips = state.db.trips.filter(t=>inv.trips.includes(t.id));
  const ic = invoiceConfig();
  const hasLineItems = Array.isArray(inv.lineItems) && inv.lineItems.length > 0;
  const itemRows = hasLineItems
    ? inv.lineItems.map(l=>`<tr><td>${l.label}${l.currency && l.currency!=='KES'?` <span style="color:var(--text-3);font-size:9px">(${l.currency} ${l.unitAmount}${l.qty>1?` × ${l.qty}`:''})</span>`:''}</td><td class="mono">${l.container||'—'}</td><td>${l.unit||''}${l.qty>1?` × ${l.qty}`:''}</td><td class="mono" style="text-align:right">${fmtKsh(l.amountKsh)}</td></tr>`).join('')
    : (trips.map(t=>`<tr><td>Haulage — ${t.ctype}</td><td class="mono">${t.container}</td><td>${t.workType}</td><td class="mono" style="text-align:right">${fmtKsh(inv.subtotal/Math.max(trips.length,1))}</td></tr>`).join('')||`<tr><td colspan="4" style="text-align:center;color:var(--text-3)">General haulage services</td></tr>`);
  openModal(`Invoice — ${inv.ref}`, `<div class="inv-doc"><div class="inv-doc-head"><div><div class="inv-doc-company-name">${ic.companyName}</div><div class="inv-doc-company-details">${ic.companyName} · ${ic.companyLocation}<br>${ic.companyTel} · KRA: ${ic.kraPin}</div></div><div style="text-align:right"><div class="inv-doc-id">${inv.ref}</div><div class="inv-doc-type">Tax Invoice</div><div class="inv-doc-status">${sbadge(inv.status)}</div></div></div><div class="inv-billing-row"><div><div class="inv-bill-label">Bill To</div><div class="inv-bill-name">${inv.client}</div></div><div><div class="inv-bill-label">Invoice Date</div><div class="inv-bill-detail">${fmtDate(inv.date)}</div><div class="inv-bill-label" style="margin-top:6px">Due Date</div><div class="inv-bill-detail">${fmtDate(inv.due)}</div></div></div><div class="inv-items-table-wrap"><table class="inv-items-table"><thead><tr><th>Description</th><th>Container</th><th>${hasLineItems?'Qty / Unit':'Work Type'}</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemRows}</tbody></table></div><div class="inv-totals"><div class="inv-totals-row"><span>Subtotal</span><span class="inv-amount">${fmtKsh(inv.subtotal)}</span></div><div class="inv-totals-row"><span>VAT ${ic.vatRate}%</span><span class="inv-amount">${fmtKsh(inv.vat)}</span></div>${inv.paid?`<div class="inv-totals-row"><span>Amount Paid</span><span class="inv-amount" style="color:var(--green)">-${fmtKsh(inv.paid)}</span></div>`:''}<div class="inv-totals-row total-row"><span style="font-weight:700">Balance Due</span><span class="inv-amount" style="font-size:16px;color:var(--gold);font-weight:700">${fmtKsh(inv.total-inv.paid)}</span></div></div><div class="inv-bank">Bank: ${ic.bankName} · A/C: ${ic.bankAccount} · Swift: ${ic.bankSwift} · Ref: ${inv.ref}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${inv.status!=='paid'?`<button class="modal-btn success" onclick="markInvoicePaid('${id}')">Mark as Paid</button>`:''}${inv.status==='draft'?`<button class="modal-btn primary" onclick="markInvoiceSent('${id}')">Mark as Sent</button>`:''}<button class="modal-btn ghost" onclick="downloadInvoicePDF('${id}')">⬇ Download PDF</button></div>`);
}

function markInvoicePaid(id) {
  const inv = state.db.invoices.find(i=>i.id===id);
  if (!inv) return;
  inv.status='paid'; inv.paid=inv.total;
  inv._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Paid', `${inv.ref} — ${fmtKsh(inv.total)}`);
  closeModal(); renderInvoiceList(_invFilter); renderInvoiceKpis();
  toast(`${inv.ref} marked as paid`, 'success');
}

function markInvoiceSent(id) {
  const inv = state.db.invoices.find(i=>i.id===id);
  if (!inv) return;
  inv.status='sent';
  inv._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Sent', inv.ref);
  closeModal(); renderInvoiceList(_invFilter);
  toast(`${inv.ref} marked as sent`, 'success');
}

function downloadInvoicePDF(id) { toast('PDF export — integrate with jsPDF for production', 'info'); }

let _ciLastLineItems = [];

function showCreateInvoiceModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  _ciLastLineItems = [];
  openModal('Create Invoice', `
    <div class="fg"><label>Client Name</label><input id="ci_client" placeholder="Company Ltd"/></div>
    <div class="fg"><label>Select Trips</label>
      <div style="max-height:150px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:8px">
        ${state.db.trips.map(t=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px;cursor:pointer"><input type="checkbox" class="ci-trip-cb" value="${t.id}" onchange="recalcInvoiceFromTrips()" style="accent-color:var(--gold)">${t.container} — ${t.origin}→${t.dest} · ${t.ctype}</label>`).join('')}
      </div>
    </div>
    <div class="fg" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:10px">
      <label style="margin-bottom:6px;display:block">Rate Card Services to Include</label>
      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px">
        <label><input type="checkbox" id="ci_svc_lolo" checked onchange="recalcInvoiceFromTrips()"> LOLO / Reefer Handling</label>
        <label><input type="checkbox" id="ci_svc_service" checked onchange="recalcInvoiceFromTrips()"> Service Charge</label>
        <label><input type="checkbox" id="ci_svc_transport" checked onchange="recalcInvoiceFromTrips()"> Transport</label>
        <label><input type="checkbox" id="ci_svc_lastmile" onchange="recalcInvoiceFromTrips()"> Last Mile</label>
        <label><input type="checkbox" id="ci_svc_prestack" onchange="recalcInvoiceFromTrips()"> Port Pre-Stack 1</label>
        <label><input type="checkbox" id="ci_svc_photo" onchange="recalcInvoiceFromTrips()"> Photo Charges</label>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
        <label style="font-size:11px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="ci_svc_storage" onchange="recalcInvoiceFromTrips()"> Storage — days stored</label>
        <input id="ci_storage_days" type="number" min="0" value="0" style="width:70px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:4px 6px;border-radius:4px" onchange="recalcInvoiceFromTrips()"/>
      </div>
    </div>
    <div id="ciBreakdown" style="font-size:11px;color:var(--text-2);margin:8px 0;max-height:140px;overflow-y:auto"><div style="color:var(--text-3)">Select trips to auto-calculate from the rate schedule.</div></div>
    <div class="form-row-2"><div class="fg"><label>Subtotal (KSh)</label><input id="ci_sub" type="number" placeholder="0"/></div><div class="fg"><label>Due Date</label><input id="ci_due" type="date"/></div></div>
    <div class="fg"><label>Notes</label><textarea id="ci_notes" rows="2"></textarea></div>
    <button class="submit-btn" onclick="saveInvoice()">Create Invoice →</button>`);
}

function recalcInvoiceFromTrips() {
  const ids   = [...document.querySelectorAll('.ci-trip-cb:checked')].map(cb=>cb.value);
  const trips = state.db.trips.filter(t=>ids.includes(t.id));
  const opts = {
    lolo:         document.getElementById('ci_svc_lolo')?.checked,
    serviceCharge:document.getElementById('ci_svc_service')?.checked,
    transport:    document.getElementById('ci_svc_transport')?.checked,
    lastMile:     document.getElementById('ci_svc_lastmile')?.checked,
    portPreStack: document.getElementById('ci_svc_prestack')?.checked,
    photo:        document.getElementById('ci_svc_photo')?.checked,
    storage:      document.getElementById('ci_svc_storage')?.checked,
    storageDays:  parseInt(document.getElementById('ci_storage_days')?.value)||0,
  };
  const { lineItems, subtotalKsh } = combineTripCharges(trips, opts);
  _ciLastLineItems = lineItems;
  const bd = document.getElementById('ciBreakdown');
  if (bd) {
    bd.innerHTML = lineItems.length
      ? lineItems.map(l=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px solid var(--border)"><span>${l.container} — ${l.label}${l.currency && l.currency!=='KES'?` (${l.currency} ${l.unitAmount}${l.qty>1?` × ${l.qty}`:''})`:''}</span><span class="mono">${fmtKsh(l.amountKsh)}</span></div>`).join('')
      : `<div style="color:var(--text-3)">No matching rate for the selected trips/services — check container type or shipping line.</div>`;
  }
  const subEl = document.getElementById('ci_sub');
  if (subEl) subEl.value = subtotalKsh || '';
}

function saveInvoice() {
  const client = document.getElementById('ci_client').value.trim();
  const sub    = Math.max(0, parseInt(document.getElementById('ci_sub').value)||0);
  if (!client||!sub) { toast('Client and amount required','error'); return; }
  const vat   = Math.round(sub * invoiceVatRate());
  const total = sub+vat;
  const trips = [...document.querySelectorAll('.ci-trip-cb:checked')].map(cb=>cb.value);
  const inv = {
    id: uid('INV'), client, subtotal:sub, vat, total, paid:0,
    trips, status:'draft', ref: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    due: document.getElementById('ci_due').value||new Date(Date.now()+30*86400000).toISOString(),
    notes: sanitize(document.getElementById('ci_notes').value.trim()),
    lineItems: _ciLastLineItems.slice(),
    _dirty: true,
  };
  state.db.invoices.push(inv);
  _ciLastLineItems = [];
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Created', `${inv.ref} — ${client}`);
  closeModal(); renderInvoicing(_invFilter);
  toast(`Invoice ${inv.ref} created`, 'success');
}

function autoGenerateInvoices() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const tripsWithoutInvoice = state.db.trips.filter(t=>t.status==='completed' && !state.db.invoices.some(i=>i.trips.includes(t.id)));
  if (!tripsWithoutInvoice.length) { toast('All completed trips already invoiced','info'); return; }
  let legacyCount = 0;
  tripsWithoutInvoice.forEach(t=>{
    const line = state.db.shippingLines.find(l=>l.id===t.shippingLine);
    const { lineItems, subtotalKsh } = combineTripCharges([t]); // LOLO/Reefer + Service Charge + Transport, per the rate schedule
    if (!lineItems.some(l=>l.key!=='legacy')) legacyCount++;
    const sub = subtotalKsh;
    const vat = Math.round(sub * invoiceVatRate());
    state.db.invoices.push({
      id: uid('INV'), client: line? `${line.name} (Auto)` :'Client (Auto)',
      subtotal:sub, vat, total:sub+vat, paid:0,
      trips:[t.id], status:'draft', lineItems,
      ref: `INV-${Date.now().toString().slice(-4)}-${uid('').slice(0,3)}`,
      date: new Date().toISOString(),
      due: new Date(Date.now()+30*86400000).toISOString(),
      notes:'Auto-generated from completed trip · rates from service rate schedule',
      _dirty: true,
    });
  });
  scheduleSave();
  addAudit(state.profile.username, 'Auto Invoices', `${tripsWithoutInvoice.length} generated${legacyCount?`, ${legacyCount} on legacy fallback rate (no rate-card match)`:''}`);
  renderInvoicing(_invFilter);
  toast(`${tripsWithoutInvoice.length} invoice(s) generated${legacyCount?`, ${legacyCount} used the legacy fallback rate`:''}`, 'success');
}

function showBillingRatesModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const rates = state.db.billingRates;
  openModal('Billing Rates', `<div class="table-wrap"><table class="data-table"><thead><tr><th>Container Type</th><th>Base Rate (KSh)</th><th>Per km (KSh)</th><th></th></tr></thead><tbody id="billingRatesRows">${Object.entries(rates).map(([k,v])=>`<tr><td>${k}</td><td><input type="number" value="${v.base}" onchange="updateRate('${k}','base',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><input type="number" value="${v.perKm}" onchange="updateRate('${k}','perKm',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><button class="tbl-btn" style="color:var(--red)" onclick="removeBillingRateType('${k}')">🗑</button></td></tr>`).join('')}</tbody></table></div><div class="form-row-2" style="margin-top:12px"><div class="fg"><label>New Container Type</label><input id="brNewType" placeholder="e.g. 20ft"/></div><div class="fg"><label>Base Rate (KSh)</label><input id="brNewBase" type="number" placeholder="0"/></div></div><div class="fg"><label>Per km (KSh)</label><input id="brNewPerKm" type="number" placeholder="0"/></div><button class="action-btn ghost" onclick="addBillingRateType()">+ Add Container Type</button><button class="submit-btn" style="margin-top:12px" onclick="saveBillingRates()">Save Rates →</button>`);
}

function updateRate(ctype, field, val) { state.db.billingRates[ctype][field] = Math.max(0, parseInt(val)||0); }

function addBillingRateType() {
  const type  = sanitize(document.getElementById('brNewType').value.trim());
  const base  = Math.max(0, parseInt(document.getElementById('brNewBase').value)||0);
  const perKm = Math.max(0, parseInt(document.getElementById('brNewPerKm').value)||0);
  if (!type) { toast('Container type required', 'error'); return; }
  state.db.billingRates[type] = { base, perKm };
  showBillingRatesModal();
}

function removeBillingRateType(ctype) {
  delete state.db.billingRates[ctype];
  showBillingRatesModal();
}

function saveBillingRates() { scheduleSave(); addAudit(state.profile.username,'Billing Rates','Updated'); closeModal(); toast('Billing rates updated', 'success'); }

/* Invoicing & billing configuration — editable by any admin, no redeploy needed. */
function invoiceConfig() {
  const c = state.db.settings?.invoiceConfig || {};
  return {
    companyName:     c.companyName     || state.db.settings?.companyName || 'Gargo Logistics Ltd',
    companyLocation: c.companyLocation || 'Mombasa, Kenya',
    companyTel:      c.companyTel      || '+254 116 307 751',
    kraPin:          c.kraPin          || 'P051234567X',
    bankName:        c.bankName        || 'Equity Bank',
    bankAccount:     c.bankAccount     || '1234567890',
    bankSwift:       c.bankSwift       || 'EQBLKENX',
    vatRate:         (typeof c.vatRate === 'number') ? c.vatRate : 16,
    usdToKes:        (typeof c.usdToKes === 'number' && c.usdToKes > 0) ? c.usdToKes : 129,
  };
}

function invoiceVatRate() { return invoiceConfig().vatRate / 100; }

function renderInvoiceConfigForm() {
  const el = document.getElementById('invoiceConfigForm');
  if (!el) return;
  const c = invoiceConfig();
  el.innerHTML = `
    <div class="fg" style="margin:0"><label>Company Name</label><input id="ic_companyName" value="${c.companyName}"/></div>
    <div class="fg" style="margin:0"><label>Location</label><input id="ic_companyLocation" value="${c.companyLocation}"/></div>
    <div class="fg" style="margin:0"><label>Phone</label><input id="ic_companyTel" value="${c.companyTel}"/></div>
    <div class="fg" style="margin:0"><label>KRA PIN</label><input id="ic_kraPin" value="${c.kraPin}"/></div>
    <div class="fg" style="margin:0"><label>Bank Name</label><input id="ic_bankName" value="${c.bankName}"/></div>
    <div class="fg" style="margin:0"><label>Bank Account</label><input id="ic_bankAccount" value="${c.bankAccount}"/></div>
    <div class="fg" style="margin:0"><label>Bank Swift</label><input id="ic_bankSwift" value="${c.bankSwift}"/></div>
    <div class="fg" style="margin:0"><label>VAT Rate (%)</label><input id="ic_vatRate" type="number" step="0.1" value="${c.vatRate}"/></div>
    <div class="fg" style="margin:0"><label>USD → KES Rate</label><input id="ic_usdToKes" type="number" step="0.01" value="${c.usdToKes}"/></div>
  `;
}

function saveInvoiceConfig() {
  const cfg = {
    companyName:     sanitize(document.getElementById('ic_companyName').value.trim())     || 'Gargo Logistics Ltd',
    companyLocation: sanitize(document.getElementById('ic_companyLocation').value.trim()),
    companyTel:      sanitize(document.getElementById('ic_companyTel').value.trim()),
    kraPin:          sanitize(document.getElementById('ic_kraPin').value.trim()),
    bankName:        sanitize(document.getElementById('ic_bankName').value.trim()),
    bankAccount:     sanitize(document.getElementById('ic_bankAccount').value.trim()),
    bankSwift:       sanitize(document.getElementById('ic_bankSwift').value.trim()),
    vatRate:         Math.max(0, parseFloat(document.getElementById('ic_vatRate').value) || 0),
    usdToKes:        Math.max(0.01, parseFloat(document.getElementById('ic_usdToKes').value) || 129),
  };
  state.db.settings = state.db.settings || {};
  state.db.settings.invoiceConfig = cfg;
  state.db.settings.companyName = cfg.companyName;
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Settings', 'Updated company & billing details');
  toast('Invoicing details saved', 'success');
}