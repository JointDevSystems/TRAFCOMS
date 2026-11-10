"use strict";
function invToRow(i) {
  return { id: i.id, client: i.client, client_address: i.clientAddress || "", date: i.date, due: i.due, terms: i.terms || "Due on receipt", currency: i.currency || "USD", status: i.status, subtotal: i.subtotal, vat: i.vat, total: i.total, paid: i.paid, ref: i.ref, notes: i.notes, line_items: JSON.stringify(i.lineItems || []) };
}
function invFromRow(r) {
  let lineItems = [];
  try {
    lineItems = r.line_items ? typeof r.line_items === "string" ? JSON.parse(r.line_items) : r.line_items : [];
  } catch (e) {
    lineItems = [];
  }
  return { id: r.id, client: r.client, clientAddress: r.client_address || "", date: r.date, due: r.due, terms: r.terms || "Due on receipt", currency: r.currency || "USD", status: r.status, subtotal: r.subtotal, vat: r.vat, total: r.total, paid: r.paid, ref: r.ref, notes: r.notes, trips: [], lineItems };
}
function ctypeSizeKey(ctype) {
  const m = /^(\d+)\s*ft/i.exec((ctype || "").trim());
  return m ? "".concat(m[1], "ft") : null;
}
function isReeferCtype(ctype) {
  return /reefer/i.test(ctype || "");
}
function shippingLineForTrip(t) {
  return state.db.shippingLines.find((l) => l.id === t.shippingLine) || null;
}
function serviceRateFor(lineCode, serviceKey, sizeKey, line) {
  var _a, _b, _c, _d;
  const sched = window.SERVICE_RATE_SCHEDULE;
  if (!sched || !sizeKey) return null;
  const override = lineCode ? (_a = sched.lineOverrides) == null ? void 0 : _a[lineCode.toUpperCase()] : null;
  const def = (override == null ? void 0 : override.services) && override.services[serviceKey] || sched.services && sched.services[serviceKey];
  const stored = (_b = line == null ? void 0 : line.rates) == null ? void 0 : _b[serviceKey];
  if (stored && typeof stored === "object" && ("20ft" in stored || "40ft" in stored)) {
    const amt = stored[sizeKey];
    if (amt == null || amt === "") return null;
    return { amount: Number(amt), currency: line.currency || (override == null ? void 0 : override.currency) || sched.currency, label: stored.label || (def == null ? void 0 : def.label) || serviceKey, unit: stored.unit || (def == null ? void 0 : def.unit), freeDays: (_c = stored.freeDays) != null ? _c : def == null ? void 0 : def.freeDays };
  }
  const amount = (_d = def == null ? void 0 : def.rates) == null ? void 0 : _d[sizeKey];
  if (def == null || amount == null) return null;
  return { amount, currency: (override == null ? void 0 : override.currency) || sched.currency, label: def.label, unit: def.unit, freeDays: def.freeDays };
}
function invoiceCurrencyForTrips(trips) {
  const hasPIL = (trips || []).some((t) => {
    const line = shippingLineForTrip(t);
    return line && (line.code || "").toUpperCase() === "PIL";
  });
  return hasPIL ? "KES" : "USD";
}
function fmtMoney(n, currency) {
  currency = currency || "USD";
  const amt = Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "".concat(currency, " ").concat(amt);
}
function computeTripServiceCharges(trip, opts) {
  var _a, _b, _c;
  opts = Object.assign({
    lolo: true,
    serviceCharge: true,
    transport: true,
    lastMile: false,
    portPreStack: false,
    photo: false,
    storage: false,
    storageDays: 0
  }, opts || {});
  const sizeKey = ctypeSizeKey(trip.ctype);
  const line = shippingLineForTrip(trip);
  const lineCode = line ? line.code : null;
  const lines = [];
  if (!sizeKey || !window.SERVICE_RATE_SCHEDULE) {
    return { lines, subtotal: 0, matched: false, sizeKey, lineCode };
  }
  const add = (svcKey, label) => {
    const svc = serviceRateFor(lineCode, svcKey, sizeKey, line);
    if (!svc) return;
    lines.push({
      key: svcKey,
      label: label || svc.label,
      unit: svc.unit,
      qty: 1,
      unitAmount: svc.amount,
      currency: svc.currency,
      amount: Math.round(svc.amount * 100) / 100
    });
  };
  if (opts.lolo) add(isReeferCtype(trip.ctype) ? "reefer" : "lolo");
  if (opts.serviceCharge) add("serviceCharge");
  if (opts.transport) add("transport");
  if (opts.lastMile) add("lastMileTransport");
  if (opts.portPreStack) add("portPreStack1");
  if (opts.photo) add("photoCharges");
  if (opts.storage) {
    const svc = serviceRateFor(lineCode, "storage", sizeKey, line);
    const freeDays = (_c = (_b = svc == null ? void 0 : svc.freeDays) != null ? _b : (_a = window.SERVICE_RATE_SCHEDULE.services.storage) == null ? void 0 : _a.freeDays) != null ? _c : 0;
    const billableDays = Math.max(0, Math.round(opts.storageDays) - freeDays);
    if (svc && billableDays > 0) {
      lines.push({
        key: "storage",
        label: "".concat(svc.label, " \u2014 ").concat(billableDays, " day(s) beyond ").concat(freeDays, "-day free period"),
        unit: svc.unit,
        qty: billableDays,
        unitAmount: svc.amount,
        currency: svc.currency,
        amount: Math.round(svc.amount * billableDays * 100) / 100
      });
    }
  }
  const subtotal = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  return { lines, subtotal, matched: lines.length > 0, sizeKey, lineCode, tripId: trip.id, container: trip.container };
}
function legacyTripCharge(trip, currency) {
  var _a;
  currency = currency || "USD";
  const rates = ((_a = state.db.billingRates) == null ? void 0 : _a[trip.ctype]) || { base: 0, perKm: 0 };
  const amtKes = rates.base + rates.perKm * (trip.distance || 0);
  const amount = Math.round((currency === "KES" ? amtKes : amtKes / invoiceConfig().usdToKes) * 100) / 100;
  return {
    lines: [{ key: "legacy", label: "Haulage \u2014 ".concat(trip.ctype, " (flat rate, no rate-card entry)"), unit: "per trip", qty: 1, unitAmount: amount, currency, amount }],
    subtotal: amount,
    matched: amtKes > 0,
    sizeKey: null,
    lineCode: null,
    tripId: trip.id,
    container: trip.container
  };
}
function invoiceChargeForTrip(trip, opts, currency) {
  const calc = computeTripServiceCharges(trip, opts);
  return calc.matched ? calc : legacyTripCharge(trip, currency);
}
function combineTripCharges(trips, opts) {
  const currency = invoiceCurrencyForTrips(trips);
  const lineItems = [];
  let subtotal = 0;
  (trips || []).forEach((t) => {
    const calc = invoiceChargeForTrip(t, opts, currency);
    calc.lines.forEach((l) => lineItems.push(Object.assign({}, l, { tripId: t.id, container: t.container, ctype: t.ctype })));
    subtotal += calc.subtotal;
  });
  return { lineItems, subtotal: Math.round(subtotal * 100) / 100, currency };
}
function renderInvoicing(f) {
  if (!canFinance()) return;
  renderInvoiceKpis();
  renderInvoiceList(f);
}
function renderInvoiceKpis() {
  const inv = state.db.invoices;
  const byCcy = {};
  inv.forEach((i) => {
    const c = i.currency || "USD";
    byCcy[c] = byCcy[c] || { total: 0, paid: 0, overdue: 0, overdueCount: 0 };
    byCcy[c].total += i.total;
    byCcy[c].paid += i.paid;
    if (i.status === "overdue") {
      byCcy[c].overdue += i.total - i.paid;
      byCcy[c].overdueCount++;
    }
  });
  const ccys = Object.keys(byCcy).length ? Object.keys(byCcy) : ["USD"];
  const join = (fn) => ccys.map((c) => fn(c, byCcy[c] || { total: 0, paid: 0, overdue: 0, overdueCount: 0 })).join(" \xB7 ") || fmtMoney(0);
  const outstandingLine = join((c, v) => fmtMoney(v.total - v.paid, c));
  const kpis = document.getElementById("invKpis");
  if (!kpis) return;
  kpis.innerHTML = "".concat(kpiCard("Total Invoiced", join((c, v) => fmtMoney(v.total, c)), "".concat(inv.length, " invoices"), "kpi-gold"), " ").concat(kpiCard("Collected", join((c, v) => fmtMoney(v.paid, c)), "Across all currencies", "kpi-green"), " ").concat(kpiCard("Outstanding", outstandingLine, "Pending payment", "kpi-blue"), " ").concat(kpiCard("Overdue", join((c, v) => fmtMoney(v.overdue, c)), "".concat(inv.filter((i) => i.status === "overdue").length, " invoices"), "kpi-red"));
}
let _invFilter = "all";
function filterInvoices(f, btn) {
  _invFilter = f;
  document.querySelectorAll("#sec-invoicing .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderInvoiceList(f);
}
function renderInvoiceList(f) {
  let items = f === "all" ? state.db.invoices : state.db.invoices.filter((i) => i.status === f);
  const el = document.getElementById("invoicesList");
  if (!el) return;
  el.innerHTML = '<div class="inv-grid">'.concat(items.map((inv) => '<div class="inv-card '.concat(inv.status, '" onclick="showInvoiceDetail(\'').concat(inv.id, '\')"><div class="inv-type-tag">').concat(inv.ref, '</div><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">').concat(inv.client, '</div><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px"><div><div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--gold)">').concat(fmtMoney(inv.total, inv.currency), '</div><div style="font-size:10px;color:var(--text-3);margin-top:2px">').concat(inv.paid ? "Paid: ".concat(fmtMoney(inv.paid, inv.currency)) : "Unpaid", "</div></div>").concat(sbadge(inv.status), '</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:8px">Due: ').concat(fmtDate(inv.due), "</div></div>")).join("") || '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-label">No invoices</div></div>', "</div>");
}
async function showInvoiceDetail(id) {
  const inv = state.db.invoices.find((i) => i.id === id);
  if (!inv) return;
  await ensureTripsLoaded(inv.trips);
  const trips = state.db.trips.filter((t) => inv.trips.includes(t.id));
  const ic = invoiceConfig();
  const ccy = inv.currency || "USD";
  const vatRatePct = ic.vatRate;
  const hasLineItems = Array.isArray(inv.lineItems) && inv.lineItems.length > 0;
  const rowFor = (label, container, qtyUnit, amount) => {
    const lineVat = Math.round(amount * (vatRatePct / 100) * 100) / 100;
    return "<tr><td>".concat(label, '</td><td class="mono">').concat(container || "\u2014", "</td><td>").concat(qtyUnit, '</td><td class="mono" style="text-align:right">').concat(fmtMoney(amount, ccy), '</td><td class="mono" style="text-align:right">').concat(vatRatePct ? fmtMoney(lineVat, ccy) : "Exempt", "</td></tr>");
  };
  const itemRows = hasLineItems ? inv.lineItems.map((l) => rowFor(l.label, l.container, "".concat(l.unit || "").concat(l.qty > 1 ? " \xD7 ".concat(l.qty) : ""), l.amount != null ? l.amount : l.amountKsh)).join("") : trips.map((t) => rowFor("Haulage \u2014 ".concat(t.ctype), t.container, t.workType, inv.subtotal / Math.max(trips.length, 1))).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--text-3)">General haulage services</td></tr>';
  const addressHtml = inv.clientAddress ? esc(inv.clientAddress).replace(/\n/g, "<br>") : "";
  openModal("Invoice \u2014 ".concat(inv.ref), '<div class="inv-doc">\n    <div class="inv-doc-head">\n      <div>'.concat(ghModalHeaderHtml(380), '</div>\n      <div style="text-align:right">\n        <div class="inv-doc-type">Invoice</div>\n        <div class="inv-doc-status">').concat(sbadge(inv.status), '</div>\n      </div>\n    </div>\n\n    <div class="inv-meta-row">\n      <div><div class="inv-bill-label">Cust VAT Reg</div><div class="inv-bill-detail">').concat(inv.custVatReg || "\u2014", '</div></div>\n      <div><div class="inv-bill-label">Company VAT Reg</div><div class="inv-bill-detail">').concat(ic.companyVatReg, '</div></div>\n      <div><div class="inv-bill-label">Inv. Date</div><div class="inv-bill-detail">').concat(fmtDate(inv.date), '</div></div>\n      <div><div class="inv-bill-label">Invoice No.</div><div class="inv-bill-detail">').concat(inv.ref, '</div></div>\n    </div>\n\n    <div class="inv-billing-row">\n      <div><div class="inv-bill-label">Invoice To</div><div class="inv-bill-name">').concat(inv.client, "</div>").concat(addressHtml ? '<div class="inv-bill-detail">'.concat(addressHtml, "</div>") : "", '</div>\n      <div><div class="inv-bill-label">Terms</div><div class="inv-bill-detail">').concat(inv.terms || "Due on receipt", '</div><div class="inv-bill-label" style="margin-top:6px">Due Date</div><div class="inv-bill-detail">').concat(fmtDate(inv.due), '</div></div>\n    </div>\n\n    <div class="inv-items-table-wrap"><table class="inv-items-table"><thead><tr><th>Description</th><th>Container</th><th>').concat(hasLineItems ? "Qty / Unit" : "Work Type", '</th><th style="text-align:right">Amount</th><th style="text-align:right">VAT</th></tr></thead><tbody>').concat(itemRows, '</tbody></table></div>\n\n    <div class="inv-payable-row">\n      <div class="inv-bank">\n        <strong>Invoice Payable To: ').concat(ic.companyName, "</strong><br>\n        Bank: ").concat(ic.bankName, "<br>\n        Account Number: ").concat(ic.bankAccount, "<br>\n        Currency: ").concat(ccy, "<br>\n        Branch: ").concat(ic.branchName, "<br>\n        Swift Code: ").concat(ic.bankSwift, '\n      </div>\n      <div class="inv-totals">\n        <div class="inv-totals-row"><span>Subtotal</span><span class="inv-amount">').concat(fmtMoney(inv.subtotal, ccy), '</span></div>\n        <div class="inv-totals-row"><span>VAT ').concat(vatRatePct, '%</span><span class="inv-amount">').concat(fmtMoney(inv.vat, ccy), '</span></div>\n        <div class="inv-totals-row total-row"><span style="font-weight:700">Total</span><span class="inv-amount" style="font-size:15px;font-weight:700">').concat(fmtMoney(inv.total, ccy), '</span></div>\n        <div class="inv-totals-row"><span>Payments/Credits</span><span class="inv-amount">').concat(fmtMoney(inv.paid, ccy), '</span></div>\n        <div class="inv-totals-row total-row"><span style="font-weight:700">Balance Due</span><span class="inv-amount" style="font-size:16px;color:var(--gold);font-weight:700">').concat(fmtMoney(inv.total - inv.paid, ccy), "</span></div>\n      </div>\n    </div>\n    ").concat(inv.notes ? '<div class="inv-notes">'.concat(esc(inv.notes), "</div>") : "", '\n  </div>\n  <div style="display:flex;gap:8px;flex-wrap:wrap">').concat(inv.status !== "paid" ? '<button class="modal-btn success" onclick="markInvoicePaid(\''.concat(id, "')\">Mark as Paid</button>") : "").concat(inv.status === "draft" ? '<button class="modal-btn primary" onclick="markInvoiceSent(\''.concat(id, "')\">Mark as Sent</button>") : "", '<button class="modal-btn ghost" onclick="downloadInvoicePDF(\'').concat(id, '\')">\u2B07 Download PDF</button><button class="modal-btn ghost" onclick="printInvoicePDF(\'').concat(id, "')\">\u{1F5A8} Print</button></div>"));
}
function markInvoicePaid(id) {
  const inv = state.db.invoices.find((i) => i.id === id);
  if (!inv) return;
  inv.status = "paid";
  inv.paid = inv.total;
  inv._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, "Invoice Paid", "".concat(inv.ref, " \u2014 ").concat(fmtMoney(inv.total, inv.currency)));
  closeModal();
  renderInvoiceList(_invFilter);
  renderInvoiceKpis();
  toast("".concat(inv.ref, " marked as paid"), "success");
}
function markInvoiceSent(id) {
  const inv = state.db.invoices.find((i) => i.id === id);
  if (!inv) return;
  inv.status = "sent";
  inv._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, "Invoice Sent", inv.ref);
  closeModal();
  renderInvoiceList(_invFilter);
  toast("".concat(inv.ref, " marked as sent"), "success");
}
async function buildInvoicePDF(id) {
  var _a;
  const inv = state.db.invoices.find((i) => i.id === id);
  if (!inv) {
    toast("Invoice not found", "error");
    return null;
  }
  if (!window.jspdf) {
    toast("PDF library still loading \u2014 try again in a moment", "error");
    return null;
  }
  await ensureTripsLoaded(inv.trips);
  const trips = state.db.trips.filter((t) => inv.trips.includes(t.id));
  const ic = invoiceConfig();
  const ccy = inv.currency || "USD";
  const vatRatePct = ic.vatRate;
  const hasLineItems = Array.isArray(inv.lineItems) && inv.lineItems.length > 0;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const GOLD = [201, 162, 39];
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;
  const money = (n) => "".concat(ccy, " ").concat(Number(n || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  function fieldBox(x, y2, w, h, label, value) {
    doc.setDrawColor(150);
    doc.setLineWidth(0.25);
    doc.rect(x, y2, w, h);
    doc.setFont(void 0, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text(String(label).toUpperCase(), x + 2, y2 + 4.5);
    doc.setFont(void 0, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(20);
    const val = doc.splitTextToSize(String(value || "\u2014"), w - 4);
    doc.text(val.slice(0, h > 16 ? 4 : 2), x + 2, y2 + (h > 10 ? 10 : 9));
  }
  function sectionLabel(text, y2) {
    doc.setFont(void 0, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...GOLD);
    doc.text(text.toUpperCase(), MARGIN, y2);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y2 + 1.5, RIGHT, y2 + 1.5);
    doc.setTextColor(20);
  }
  ghPdfLetterhead(doc, MARGIN, 8, 130);
  doc.setFont(void 0, "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text("INVOICE", RIGHT, 16, { align: "right" });
  doc.setFont(void 0, "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text((inv.status || "").toUpperCase(), RIGHT, 21.5, { align: "right" });
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 30, RIGHT, 30);
  let y = 34;
  const metaW = CONTENT_W / 4;
  fieldBox(MARGIN, y, metaW - 2, 12, "Cust VAT Reg", inv.custVatReg || "\u2014");
  fieldBox(MARGIN + metaW, y, metaW - 2, 12, "Company VAT Reg", ic.companyVatReg);
  fieldBox(MARGIN + metaW * 2, y, metaW - 2, 12, "Inv. Date", fmtDate(inv.date));
  fieldBox(MARGIN + metaW * 3, y, metaW - 2, 12, "Invoice No.", inv.ref);
  y += 16;
  const boxH = 24;
  doc.setDrawColor(150);
  doc.setLineWidth(0.25);
  doc.rect(MARGIN, y, 112, boxH);
  doc.setFont(void 0, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(120);
  doc.text("INVOICE TO", MARGIN + 2, y + 4.5);
  doc.setFont(void 0, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20);
  doc.text(inv.client, MARGIN + 2, y + 9.5);
  if (inv.clientAddress) {
    doc.setFont(void 0, "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(doc.splitTextToSize(inv.clientAddress, 108).slice(0, 4), MARGIN + 2, y + 14);
  }
  fieldBox(MARGIN + 114, y, 32, boxH / 2 - 1, "Terms", inv.terms || "Due on receipt");
  fieldBox(MARGIN + 114, y + boxH / 2 + 1, 32, boxH / 2 - 1, "Due Date", fmtDate(inv.due));
  fieldBox(MARGIN + 148, y, CONTENT_W - 148, boxH, "Trips", String(((_a = inv.trips) == null ? void 0 : _a.length) || 0));
  y += boxH + 6;
  sectionLabel("Items", y);
  y += 5;
  const cols = [
    { key: "desc", label: "Description", x: MARGIN, w: 70 },
    { key: "cont", label: "Container", x: MARGIN + 70, w: 30 },
    { key: "unit", label: "Qty / Unit", x: MARGIN + 100, w: 32 },
    { key: "amt", label: "Amount", x: MARGIN + 132, w: 25 },
    { key: "vat", label: "VAT", x: MARGIN + 157, w: 25 }
  ];
  doc.setDrawColor(150);
  doc.setLineWidth(0.25);
  doc.setFillColor(235, 235, 235);
  doc.rect(MARGIN, y, CONTENT_W, 7, "FD");
  cols.forEach((c) => doc.rect(c.x, y, c.w, 7));
  doc.setFont(void 0, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(60);
  cols.forEach((c) => doc.text(c.label, c.x + 1.5, y + 4.7));
  y += 7;
  const rows = hasLineItems ? inv.lineItems.map((l) => ({
    desc: l.label,
    cont: l.container || "\u2014",
    unit: "".concat(l.unit || "").concat(l.qty > 1 ? " \xD7 ".concat(l.qty) : ""),
    amt: l.amount != null ? l.amount : l.amountKsh
  })) : trips.length ? trips.map((t) => ({ desc: "Haulage \u2014 ".concat(t.ctype), cont: t.container, unit: t.workType, amt: inv.subtotal / Math.max(trips.length, 1) })) : [{ desc: "General haulage services", cont: "\u2014", unit: "", amt: inv.subtotal }];
  doc.setFont(void 0, "normal");
  doc.setFontSize(8);
  doc.setTextColor(20);
  rows.forEach((r) => {
    const lines = doc.splitTextToSize(r.desc || "\u2014", cols[0].w - 3);
    const rowH = Math.max(7, lines.length * 3.6 + 3);
    if (y + rowH > 275) {
      doc.addPage();
      y = 20;
    }
    cols.forEach((c) => doc.rect(c.x, y, c.w, rowH));
    doc.text(lines, cols[0].x + 1.5, y + 4.6);
    doc.text(String(r.cont), cols[1].x + 1.5, y + 4.6);
    doc.text(String(r.unit || "\u2014"), cols[2].x + 1.5, y + 4.6);
    doc.text(money(r.amt), cols[3].x + cols[3].w - 1.5, y + 4.6, { align: "right" });
    const lineVat = vatRatePct ? money(r.amt * vatRatePct / 100) : "Exempt";
    doc.text(lineVat, cols[4].x + cols[4].w - 1.5, y + 4.6, { align: "right" });
    y += rowH;
  });
  y += 6;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  sectionLabel("Payment", y);
  y += 5;
  const payW = 96, totW = CONTENT_W - payW - 6;
  const payH = 34;
  fieldBox(MARGIN, y, payW, payH, "Invoice Payable To", "");
  doc.setFont(void 0, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text(ic.companyName, MARGIN + 2, y + 12);
  doc.setFont(void 0, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(90);
  const bankLines = [
    "Bank: ".concat(ic.bankName),
    "Account Number: ".concat(ic.bankAccount || "\u2014"),
    "Currency: ".concat(ccy),
    "Branch: ".concat(ic.branchName || "\u2014"),
    "Swift Code: ".concat(ic.bankSwift)
  ];
  doc.text(bankLines, MARGIN + 2, y + 17);
  const totX = MARGIN + payW + 6;
  doc.setDrawColor(150);
  doc.rect(totX, y, totW, payH);
  const totRows = [
    ["Subtotal", money(inv.subtotal)],
    ["VAT ".concat(vatRatePct, "%"), money(inv.vat)],
    ["Total", money(inv.total)],
    ["Payments/Credits", money(inv.paid)],
    ["Balance Due", money(inv.total - inv.paid)]
  ];
  let ty = y + 6;
  totRows.forEach(([label, val], i) => {
    const isLast = i === totRows.length - 1;
    doc.setFont(void 0, isLast ? "bold" : "normal");
    doc.setFontSize(isLast ? 9 : 8);
    doc.setTextColor(isLast ? 20 : 80);
    doc.text(label, totX + 3, ty);
    doc.text(val, totX + totW - 3, ty, { align: "right" });
    ty += (payH - 6) / totRows.length;
  });
  y += payH + 8;
  if (inv.notes) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(void 0, "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(doc.splitTextToSize(inv.notes, CONTENT_W), MARGIN, y);
  }
  doc.setFont(void 0, "normal");
  doc.setFontSize(7);
  doc.setTextColor(160);
  doc.text("This is a computer-generated invoice.", MARGIN, 289);
  return { doc, filename: "".concat(inv.ref, ".pdf"), inv };
}
async function downloadInvoicePDF(id) {
  const r = await buildInvoicePDF(id);
  if (!r) return;
  r.doc.save(r.filename);
  addAudit(state.profile.username, "Invoice PDF Downloaded", r.inv.ref);
}
async function printInvoicePDF(id) {
  const r = await buildInvoicePDF(id);
  if (!r) return;
  ghPrintPdf(r.doc);
  addAudit(state.profile.username, "Invoice Printed", r.inv.ref);
}
let _ciLastLineItems = [];
function showCreateInvoiceModal() {
  if (!canFinance()) {
    toast("Finance rights required", "error");
    return;
  }
  _ciLastLineItems = [];
  openModal("Create Invoice", '\n    <div class="fg"><label>Client Name</label><input id="ci_client" placeholder="Company Ltd"/></div>\n    <div class="fg"><label>Bill To Address</label><textarea id="ci_address" rows="3" placeholder="Building, Floor&#10;Street, City"></textarea></div>\n    <div class="fg"><label>Select Trips</label>\n      <div style="max-height:150px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:8px">\n        '.concat(state.db.trips.map((t) => '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px;cursor:pointer"><input type="checkbox" class="ci-trip-cb" value="'.concat(t.id, '" onchange="recalcInvoiceFromTrips()" style="accent-color:var(--gold)">').concat(t.container, " \u2014 ").concat(t.origin, "\u2192").concat(t.dest, " \xB7 ").concat(t.ctype, "</label>")).join(""), '\n      </div>\n    </div>\n    <div class="fg" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:10px">\n      <label style="margin-bottom:6px;display:block">Rate Card Services to Include</label>\n      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px">\n        <label><input type="checkbox" id="ci_svc_lolo" checked onchange="recalcInvoiceFromTrips()"> LOLO / Reefer Handling</label>\n        <label><input type="checkbox" id="ci_svc_service" checked onchange="recalcInvoiceFromTrips()"> Service Charge</label>\n        <label><input type="checkbox" id="ci_svc_transport" checked onchange="recalcInvoiceFromTrips()"> Transport</label>\n        <label><input type="checkbox" id="ci_svc_lastmile" onchange="recalcInvoiceFromTrips()"> Last Mile</label>\n        <label><input type="checkbox" id="ci_svc_prestack" onchange="recalcInvoiceFromTrips()"> Port Pre-Stack 1</label>\n        <label><input type="checkbox" id="ci_svc_photo" onchange="recalcInvoiceFromTrips()"> Photo Charges</label>\n      </div>\n      <div style="display:flex;align-items:center;gap:8px;margin-top:8px">\n        <label style="font-size:11px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="ci_svc_storage" onchange="recalcInvoiceFromTrips()"> Storage \u2014 days stored</label>\n        <input id="ci_storage_days" type="number" min="0" value="0" style="width:70px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:4px 6px;border-radius:4px" onchange="recalcInvoiceFromTrips()"/>\n      </div>\n    </div>\n    <div id="ciBreakdown" style="font-size:11px;color:var(--text-2);margin:8px 0;max-height:140px;overflow-y:auto"><div style="color:var(--text-3)">Select trips to auto-calculate from the rate schedule.</div></div>\n    <div class="form-row-2"><div class="fg"><label>Subtotal</label><input id="ci_sub" type="number" step="0.01" placeholder="0"/></div><div class="fg"><label>Currency</label><select id="ci_currency"><option value="USD">USD</option><option value="KES">KES</option></select></div></div>\n    <div class="form-row-2"><div class="fg"><label>Terms</label><input id="ci_terms" value="Due on receipt"/></div><div class="fg"><label>Due Date</label><input id="ci_due" type="date"/></div></div>\n    <div class="fg"><label>Notes</label><textarea id="ci_notes" rows="2"></textarea></div>\n    <button class="submit-btn" onclick="saveInvoice()">Create Invoice \u2192</button>'));
}
function recalcInvoiceFromTrips() {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const ids = [...document.querySelectorAll(".ci-trip-cb:checked")].map((cb) => cb.value);
  const trips = state.db.trips.filter((t) => ids.includes(t.id));
  const opts = {
    lolo: (_a = document.getElementById("ci_svc_lolo")) == null ? void 0 : _a.checked,
    serviceCharge: (_b = document.getElementById("ci_svc_service")) == null ? void 0 : _b.checked,
    transport: (_c = document.getElementById("ci_svc_transport")) == null ? void 0 : _c.checked,
    lastMile: (_d = document.getElementById("ci_svc_lastmile")) == null ? void 0 : _d.checked,
    portPreStack: (_e = document.getElementById("ci_svc_prestack")) == null ? void 0 : _e.checked,
    photo: (_f = document.getElementById("ci_svc_photo")) == null ? void 0 : _f.checked,
    storage: (_g = document.getElementById("ci_svc_storage")) == null ? void 0 : _g.checked,
    storageDays: parseInt((_h = document.getElementById("ci_storage_days")) == null ? void 0 : _h.value) || 0
  };
  const { lineItems, subtotal, currency } = combineTripCharges(trips, opts);
  _ciLastLineItems = lineItems;
  const bd = document.getElementById("ciBreakdown");
  if (bd) {
    bd.innerHTML = lineItems.length ? lineItems.map((l) => '<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px solid var(--border)"><span>'.concat(l.container, " \u2014 ").concat(l.label).concat(l.qty > 1 ? " \xD7 ".concat(l.qty) : "", '</span><span class="mono">').concat(fmtMoney(l.amount, l.currency), "</span></div>")).join("") : '<div style="color:var(--text-3)">No matching rate for the selected trips/services \u2014 check container type or shipping line.</div>';
  }
  const subEl = document.getElementById("ci_sub");
  if (subEl) subEl.value = subtotal || "";
  const ccyEl = document.getElementById("ci_currency");
  if (ccyEl && trips.length) ccyEl.value = currency;
}
function saveInvoice() {
  var _a, _b, _c;
  const client = document.getElementById("ci_client").value.trim();
  const sub = Math.max(0, parseFloat(document.getElementById("ci_sub").value) || 0);
  if (!client || !sub) {
    toast("Client and amount required", "error");
    return;
  }
  const currency = ((_a = document.getElementById("ci_currency")) == null ? void 0 : _a.value) || "USD";
  const vat = Math.round(sub * invoiceVatRate() * 100) / 100;
  const total = Math.round((sub + vat) * 100) / 100;
  const trips = [...document.querySelectorAll(".ci-trip-cb:checked")].map((cb) => cb.value);
  const inv = {
    id: uid("INV"),
    client,
    clientAddress: sanitize(((_b = document.getElementById("ci_address")) == null ? void 0 : _b.value.trim()) || ""),
    subtotal: sub,
    vat,
    total,
    paid: 0,
    currency,
    terms: sanitize((_c = document.getElementById("ci_terms")) == null ? void 0 : _c.value.trim()) || "Due on receipt",
    trips,
    status: "draft",
    ref: "INV-".concat(Date.now().toString().slice(-6)),
    date: (/* @__PURE__ */ new Date()).toISOString(),
    due: document.getElementById("ci_due").value || new Date(Date.now() + 30 * 864e5).toISOString(),
    notes: sanitize(document.getElementById("ci_notes").value.trim()),
    lineItems: _ciLastLineItems.slice(),
    _dirty: true
  };
  state.db.invoices.push(inv);
  _ciLastLineItems = [];
  scheduleSave();
  addAudit(state.profile.username, "Invoice Created", "".concat(inv.ref, " \u2014 ").concat(client));
  closeModal();
  renderInvoicing(_invFilter);
  toast("Invoice ".concat(inv.ref, " created"), "success");
}
function autoGenerateInvoices() {
  if (!canFinance()) {
    toast("Finance rights required", "error");
    return;
  }
  const tripsWithoutInvoice = state.db.trips.filter((t) => t.status === "completed" && !state.db.invoices.some((i) => i.trips.includes(t.id)));
  if (!tripsWithoutInvoice.length) {
    toast("All completed trips already invoiced", "info");
    return;
  }
  let legacyCount = 0;
  tripsWithoutInvoice.forEach((t) => {
    const line = state.db.shippingLines.find((l) => l.id === t.shippingLine);
    const { lineItems, subtotal, currency } = combineTripCharges([t]);
    if (!lineItems.some((l) => l.key !== "legacy")) legacyCount++;
    const vat = Math.round(subtotal * invoiceVatRate() * 100) / 100;
    state.db.invoices.push({
      id: uid("INV"),
      client: line ? "".concat(line.name, " (Auto)") : "Client (Auto)",
      clientAddress: "",
      currency,
      terms: "Due on receipt",
      subtotal,
      vat,
      total: Math.round((subtotal + vat) * 100) / 100,
      paid: 0,
      trips: [t.id],
      status: "draft",
      lineItems,
      ref: "INV-".concat(Date.now().toString().slice(-4), "-").concat(uid("").slice(0, 3)),
      date: (/* @__PURE__ */ new Date()).toISOString(),
      due: new Date(Date.now() + 30 * 864e5).toISOString(),
      notes: "Auto-generated from completed trip \xB7 rates from service rate schedule",
      _dirty: true
    });
  });
  scheduleSave();
  addAudit(state.profile.username, "Auto Invoices", "".concat(tripsWithoutInvoice.length, " generated").concat(legacyCount ? ", ".concat(legacyCount, " on legacy fallback rate (no rate-card match)") : ""));
  renderInvoicing(_invFilter);
  toast("".concat(tripsWithoutInvoice.length, " invoice(s) generated").concat(legacyCount ? ", ".concat(legacyCount, " used the legacy fallback rate") : ""), "success");
}
function showBillingRatesModal() {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const rates = state.db.billingRates;
  openModal("Billing Rates", '<div class="table-wrap"><table class="data-table"><thead><tr><th>Container Type</th><th>Base Rate (KSh)</th><th>Per km (KSh)</th><th></th></tr></thead><tbody id="billingRatesRows">'.concat(Object.entries(rates).map(([k, v]) => "<tr><td>".concat(k, '</td><td><input type="number" value="').concat(v.base, '" onchange="updateRate(\'').concat(k, '\',\'base\',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><input type="number" value="').concat(v.perKm, '" onchange="updateRate(\'').concat(k, '\',\'perKm\',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><button class="tbl-btn" style="color:var(--red)" onclick="removeBillingRateType(\'').concat(k, "')\">\u{1F5D1}</button></td></tr>")).join(""), '</tbody></table></div><div class="form-row-2" style="margin-top:12px"><div class="fg"><label>New Container Type</label><input id="brNewType" placeholder="e.g. 20ft"/></div><div class="fg"><label>Base Rate (KSh)</label><input id="brNewBase" type="number" placeholder="0"/></div></div><div class="fg"><label>Per km (KSh)</label><input id="brNewPerKm" type="number" placeholder="0"/></div><button class="action-btn ghost" onclick="addBillingRateType()">+ Add Container Type</button><button class="submit-btn" style="margin-top:12px" onclick="saveBillingRates()">Save Rates \u2192</button>'));
}
function updateRate(ctype, field, val) {
  state.db.billingRates[ctype][field] = Math.max(0, parseInt(val) || 0);
}
function addBillingRateType() {
  const type = sanitize(document.getElementById("brNewType").value.trim());
  const base = Math.max(0, parseInt(document.getElementById("brNewBase").value) || 0);
  const perKm = Math.max(0, parseInt(document.getElementById("brNewPerKm").value) || 0);
  if (!type) {
    toast("Container type required", "error");
    return;
  }
  state.db.billingRates[type] = { base, perKm };
  showBillingRatesModal();
}
function removeBillingRateType(ctype) {
  delete state.db.billingRates[ctype];
  showBillingRatesModal();
}
function saveBillingRates() {
  scheduleSave();
  addAudit(state.profile.username, "Billing Rates", "Updated");
  closeModal();
  toast("Billing rates updated", "success");
}
function invoiceConfig() {
  var _a;
  const c = ((_a = state.db.settings) == null ? void 0 : _a.invoiceConfig) || {};
  return {
    companyName: c.companyName || "Gargo Haven Depot Limited",
    companyLocation: c.companyLocation || "Refinery Road, Changamwe, Mombasa",
    poBox: c.poBox || "P.O. Box 3291 GPO Msa",
    companyTel: c.companyTel || "+254 116 307 751",
    companyVatReg: c.companyVatReg || "PO52380957H",
    bankName: c.bankName || "Family Bank",
    bankAccount: c.bankAccount || "",
    branchName: c.branchName || "",
    bankSwift: c.bankSwift || "FABLKENA",
    vatRate: typeof c.vatRate === "number" ? c.vatRate : 16,
    usdToKes: typeof c.usdToKes === "number" && c.usdToKes > 0 ? c.usdToKes : 129
  };
}
function invoiceVatRate() {
  return invoiceConfig().vatRate / 100;
}
function renderInvoiceConfigForm() {
  const el = document.getElementById("invoiceConfigForm");
  if (!el) return;
  const c = invoiceConfig();
  el.innerHTML = '\n    <div class="fg" style="margin:0"><label>Company Name</label><input id="ic_companyName" value="'.concat(c.companyName, '"/></div>\n    <div class="fg" style="margin:0"><label>Location</label><input id="ic_companyLocation" value="').concat(c.companyLocation, '"/></div>\n    <div class="fg" style="margin:0"><label>P.O. Box</label><input id="ic_poBox" value="').concat(c.poBox, '"/></div>\n    <div class="fg" style="margin:0"><label>Phone</label><input id="ic_companyTel" value="').concat(c.companyTel, '"/></div>\n    <div class="fg" style="margin:0"><label>Company VAT Reg.</label><input id="ic_companyVatReg" value="').concat(c.companyVatReg, '"/></div>\n    <div class="fg" style="margin:0"><label>Bank Name</label><input id="ic_bankName" value="').concat(c.bankName, '"/></div>\n    <div class="fg" style="margin:0"><label>Bank Account Number</label><input id="ic_bankAccount" value="').concat(c.bankAccount, '"/></div>\n    <div class="fg" style="margin:0"><label>Branch</label><input id="ic_branchName" value="').concat(c.branchName, '"/></div>\n    <div class="fg" style="margin:0"><label>Bank Swift Code</label><input id="ic_bankSwift" value="').concat(c.bankSwift, '"/></div>\n    <div class="fg" style="margin:0"><label>VAT Rate (%)</label><input id="ic_vatRate" type="number" step="0.1" value="').concat(c.vatRate, '"/></div>\n    <div class="fg" style="margin:0"><label>USD \u2192 KES Rate <span style="color:var(--text-3);font-weight:400">(legacy fallback conversion only)</span></label><input id="ic_usdToKes" type="number" step="0.01" value="').concat(c.usdToKes, '"/></div>\n  ');
}
function saveInvoiceConfig() {
  const cfg = {
    companyName: sanitize(document.getElementById("ic_companyName").value.trim()) || "Gargo Haven Depot Limited",
    companyLocation: sanitize(document.getElementById("ic_companyLocation").value.trim()),
    poBox: sanitize(document.getElementById("ic_poBox").value.trim()),
    companyTel: sanitize(document.getElementById("ic_companyTel").value.trim()),
    companyVatReg: sanitize(document.getElementById("ic_companyVatReg").value.trim()) || "PO52380957H",
    bankName: sanitize(document.getElementById("ic_bankName").value.trim()),
    bankAccount: sanitize(document.getElementById("ic_bankAccount").value.trim()),
    branchName: sanitize(document.getElementById("ic_branchName").value.trim()),
    bankSwift: sanitize(document.getElementById("ic_bankSwift").value.trim()),
    vatRate: Math.max(0, parseFloat(document.getElementById("ic_vatRate").value) || 0),
    usdToKes: Math.max(0.01, parseFloat(document.getElementById("ic_usdToKes").value) || 129)
  };
  state.db.settings = state.db.settings || {};
  state.db.settings.invoiceConfig = cfg;
  state.db.settings.companyName = cfg.companyName;
  scheduleSave();
  addAudit(state.profile.username, "Invoice Settings", "Updated company & billing details");
  toast("Invoicing details saved", "success");
}
