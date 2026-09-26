'use strict';


function invToRow(i)  { return { id:i.id, client:i.client, date:i.date, due:i.due, status:i.status, subtotal:i.subtotal, vat:i.vat, total:i.total, paid:i.paid, ref:i.ref, notes:i.notes }; }

function invFromRow(r){ return { id:r.id, client:r.client, date:r.date, due:r.due, status:r.status, subtotal:r.subtotal, vat:r.vat, total:r.total, paid:r.paid, ref:r.ref, notes:r.notes, trips:[] }; }


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
  openModal(`Invoice — ${inv.ref}`, `<div class="inv-doc"><div class="inv-doc-head"><div><div class="inv-doc-company-name">${ic.companyName}</div><div class="inv-doc-company-details">${ic.companyName} · ${ic.companyLocation}<br>${ic.companyTel} · KRA: ${ic.kraPin}</div></div><div style="text-align:right"><div class="inv-doc-id">${inv.ref}</div><div class="inv-doc-type">Tax Invoice</div><div class="inv-doc-status">${sbadge(inv.status)}</div></div></div><div class="inv-billing-row"><div><div class="inv-bill-label">Bill To</div><div class="inv-bill-name">${inv.client}</div></div><div><div class="inv-bill-label">Invoice Date</div><div class="inv-bill-detail">${fmtDate(inv.date)}</div><div class="inv-bill-label" style="margin-top:6px">Due Date</div><div class="inv-bill-detail">${fmtDate(inv.due)}</div></div></div><div class="inv-items-table-wrap"><table class="inv-items-table"><thead><tr><th>Description</th><th>Container</th><th>Work Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>${trips.map(t=>`<tr><td>Haulage — ${t.ctype}</td><td class="mono">${t.container}</td><td>${t.workType}</td><td class="mono" style="text-align:right">${fmtKsh(inv.subtotal/Math.max(trips.length,1))}</td></tr>`).join('')||`<tr><td colspan="4" style="text-align:center;color:var(--text-3)">General haulage services</td></tr>`}</tbody></table></div><div class="inv-totals"><div class="inv-totals-row"><span>Subtotal</span><span class="inv-amount">${fmtKsh(inv.subtotal)}</span></div><div class="inv-totals-row"><span>VAT ${ic.vatRate}%</span><span class="inv-amount">${fmtKsh(inv.vat)}</span></div>${inv.paid?`<div class="inv-totals-row"><span>Amount Paid</span><span class="inv-amount" style="color:var(--green)">-${fmtKsh(inv.paid)}</span></div>`:''}<div class="inv-totals-row total-row"><span style="font-weight:700">Balance Due</span><span class="inv-amount" style="font-size:16px;color:var(--gold);font-weight:700">${fmtKsh(inv.total-inv.paid)}</span></div></div><div class="inv-bank">Bank: ${ic.bankName} · A/C: ${ic.bankAccount} · Swift: ${ic.bankSwift} · Ref: ${inv.ref}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${inv.status!=='paid'?`<button class="modal-btn success" onclick="markInvoicePaid('${id}')">Mark as Paid</button>`:''}${inv.status==='draft'?`<button class="modal-btn primary" onclick="markInvoiceSent('${id}')">Mark as Sent</button>`:''}<button class="modal-btn ghost" onclick="downloadInvoicePDF('${id}')">⬇ Download PDF</button></div>`);
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

function showCreateInvoiceModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  openModal('Create Invoice', `<div class="fg"><label>Client Name</label><input id="ci_client" placeholder="Company Ltd"/></div><div class="form-row-2"><div class="fg"><label>Subtotal (KSh)</label><input id="ci_sub" type="number" placeholder="0"/></div><div class="fg"><label>Due Date</label><input id="ci_due" type="date"/></div></div><div class="fg"><label>Select Trips</label><div style="max-height:150px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:8px">${state.db.trips.map(t=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px;cursor:pointer"><input type="checkbox" value="${t.id}" style="accent-color:var(--gold)">${t.container} — ${t.origin}→${t.dest}</label>`).join('')}</div></div><div class="fg"><label>Notes</label><textarea id="ci_notes" rows="2"></textarea></div><button class="submit-btn" onclick="saveInvoice()">Create Invoice →</button>`);
}

function saveInvoice() {
  const client = document.getElementById('ci_client').value.trim();
  const sub    = Math.max(0, parseInt(document.getElementById('ci_sub').value)||0);
  if (!client||!sub) { toast('Client and amount required','error'); return; }
  const vat   = Math.round(sub * invoiceVatRate());
  const total = sub+vat;
  const trips = [...document.querySelectorAll('#modalBody input[type=checkbox]:checked')].map(cb=>cb.value);
  const inv = {
    id: uid('INV'), client, subtotal:sub, vat, total, paid:0,
    trips, status:'draft', ref: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    due: document.getElementById('ci_due').value||new Date(Date.now()+30*86400000).toISOString(),
    notes: sanitize(document.getElementById('ci_notes').value.trim()),
    _dirty: true,
  };
  state.db.invoices.push(inv);
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Created', `${inv.ref} — ${client}`);
  closeModal(); renderInvoicing(_invFilter);
  toast(`Invoice ${inv.ref} created`, 'success');
}

function autoGenerateInvoices() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const tripsWithoutInvoice = state.db.trips.filter(t=>t.status==='completed' && !state.db.invoices.some(i=>i.trips.includes(t.id)));
  if (!tripsWithoutInvoice.length) { toast('All completed trips already invoiced','info'); return; }
  tripsWithoutInvoice.forEach(t=>{
    const line  = state.db.shippingLines.find(l=>l.id===t.shippingLine);
    const rates = state.db.billingRates[t.ctype]||{base:12000,perKm:180};
    const sub   = rates.base + rates.perKm * t.distance;
    const vat   = Math.round(sub * invoiceVatRate());
    state.db.invoices.push({
      id: uid('INV'), client: line? `${line.name} (Auto)` :'Client (Auto)',
      subtotal:sub, vat, total:sub+vat, paid:0,
      trips:[t.id], status:'draft',
      ref: `INV-${Date.now().toString().slice(-4)}-${uid('').slice(0,3)}`,
      date: new Date().toISOString(),
      due: new Date(Date.now()+30*86400000).toISOString(),
      notes:'Auto-generated from completed trip',
      _dirty: true,
    });
  });
  scheduleSave();
  addAudit(state.profile.username, 'Auto Invoices', `${tripsWithoutInvoice.length} generated`);
  renderInvoicing(_invFilter);
  toast(`${tripsWithoutInvoice.length} invoice(s) generated`, 'success');
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
  };
  state.db.settings = state.db.settings || {};
  state.db.settings.invoiceConfig = cfg;
  state.db.settings.companyName = cfg.companyName;
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Settings', 'Updated company & billing details');
  toast('Invoicing details saved', 'success');
}