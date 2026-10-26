'use strict';
/* Gargo Finance & Billing: Invoicing is now part of the Finance hub (one section, one tab bar).
   Loads AFTER finance.js, hr.js, finance-suite.js, erp-hub.js and finance-corp.js.

   What this file does
   - Moves the Invoicing screen into Finance → "Billing & collections" and makes the old Invoicing links open it.
   - Invoices: search, filters with live counts, currency and sort controls. "Overdue" is worked out from the due date and
     the balance (nothing ever set the stored status to overdue before, so the old Overdue figures were always zero).
   - Payments: ONE way to record money against an invoice (database function fin_record_payment). It checks the amount
     against the balance, blocks duplicate references and future dates, creates the receipt the ledger expects and updates
     the invoice in a single transaction. Administrators can reverse a payment (fin_void_payment), which also reverses its
     ledger journal. The old "Mark as paid" button, which changed the invoice without any receipt, now opens this dialog.
   - Debtors & ageing, customer statements (screen, PDF, reminder text), revenue analysis, and an integrity check that
     looks for the kind of mistakes that quietly distort the books.
   - A billing snapshot on the Finance overview.
   Money rules live in the database; this file only presents them. */
(function () {
  const F = GARGO_FIN, H = GARGO_HUB;
  const $ = id => document.getElementById(id);
  const N = v => Number(v || 0), r2 = v => Math.round(N(v) * 100) / 100;
  const T = () => today10();
  const M = n => H.money(n);                                   // KSh
  const C = (n, c) => fmtMoney(n, c);                          // any currency (from invoicing.js)
  const sb = s => H.badge(s);
  const who = () => state.profile?.username || 'system';
  const canBill = () => isAdmin() || canFinance();
  const invs = () => (state.db && state.db.invoices) || [];
  const ccyOf = i => (i.currency || 'USD').toUpperCase();
  const isKes = c => /^(KES|KSH)$/i.test(c || '');
  const bal = i => r2(N(i.total) - N(i.paid));
  const DAY = 864e5;
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dueOf = i => i.due || i.date || null;
  const daysOver = i => { const d = dueOf(i); if (!d) return 0; return Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY); };
  const isOpen = i => i.status !== 'draft' && bal(i) > 0.005;
  /* status as the business sees it today: drafts stay drafts, settled invoices are paid, unpaid past due is overdue */
  const eff = i => { if (i.status === 'draft') return 'draft'; if (bal(i) <= 0.005) return 'paid'; if (daysOver(i) > 0) return 'overdue'; return N(i.paid) > 0.005 ? 'partial' : 'sent'; };
  const BUCKETS = ['Current', '1–30', '31–60', '61–90', '90+'];
  const bucketOf = i => { const d = daysOver(i); return d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4; };
  const clean = e => String(e && e.message || e || 'Something went wrong').replace(/^ERROR:\s*/i, '').replace(/\s*CONTEXT:[\s\S]*$/, '');
  const FB = { filter: 'all', q: '', ccy: 'all', sort: 'due', debt: [], stmt: null, remind: null, pay: null, busy: false };
  const ymd = d => { const x = new Date(d), p = n => String(n).padStart(2, '0'); return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); };
  const monthsBack = n => { const out = [], d = new Date(); d.setDate(1); for (let k = n - 1; k >= 0; k--) { const x = new Date(d.getFullYear(), d.getMonth() - k, 1); out.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0')); } return out; };
  const byCur = (list, fn) => { const m = {}; list.forEach(i => { const c = ccyOf(i); m[c] = (m[c] || 0) + fn(i); }); const k = Object.keys(m); return k.length ? k.map(c => C(m[c], c)).join(' · ') : C(0, 'USD'); };

  let _fx = 0, _fxAt = 0;
  async function fxRate() {
    if (_fx && Date.now() - _fxAt < 300000) return _fx;
    try { const { data } = await supabase.from('finance_settings').select('usd_kes').eq('id', 1).maybeSingle(); _fx = N(data && data.usd_kes) || 129; } catch (e) { _fx = _fx || 129; }
    _fxAt = Date.now(); return _fx;
  }
  const toKes = async (amt, c) => isKes(c) ? N(amt) : N(amt) * await fxRate();
  const rpc = async (name, args) => { const { data, error } = await supabase.rpc(name, args || {}); if (error) throw error; return data; };
  const csv = (name, head, rows) => hrCsv(name, [head].concat(rows));
  const tbl = (head, rows, empty) => `<div class="table-wrap"><table class="data-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}" style="text-align:center;color:var(--text-3);padding:24px">${empty || 'Nothing to show'}</td></tr>`}</tbody></table></div>`;
  const head = (t, extra) => `<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">${t}</div><div class="filter-row">${extra || ''}</div></div>`;
  const btn = (l, js, primary) => `<button class="action-btn${primary ? '' : ' ghost'}" onclick="${js}">${l}</button>`;
  const card = (t, sub, body) => `<div class="hr-card"><h4>${t}${sub ? ` <small>${sub}</small>` : ''}</h4>${body}</div>`;
  const row = (l, v) => `<div class="hr-row"><span>${l}</span><b>${v}</b></div>`;
  const kp = h => { const k = $('financeKpis'); if (k) k.innerHTML = h; };
  const body = h => { const b = $('financeBody'); if (b) b.innerHTML = h; };
  const loading = () => body('<div style="padding:24px;color:var(--text-2)">Loading…</div>');
  const gate = () => { if (canFinance()) return true; body('<div style="padding:28px;color:var(--text-2)">This area is for the Finance Manager and Administrators.</div>'); kp(''); return false; };
  const errBox = e => body(`<div class="ops-notice" style="margin:12px 0">Could not load this view: ${esc(clean(e))}</div>`);
  const closeM = () => { closeModal({ target: $('modalOverlay') }); const m = document.querySelector('#modalOverlay .modal-box'); if (m) m.style.maxWidth = ''; };
  let _w = 0;
  const wide = px => { _w = px; };                                   // applies to the next dialog only
  const openM = (t, h) => { openModal(t, h); const m = document.querySelector('#modalOverlay .modal-box'); if (m) m.style.maxWidth = _w ? _w + 'px' : ''; _w = 0; };

  /* ═══════════════ Layout: bring the Invoicing screen into the Finance section ═══════════════ */
  function buildHost() {
    if ($('financeInvoices')) return;
    const sec = $('sec-finance'), inv = $('sec-invoicing'); if (!sec) return;
    const host = document.createElement('div'); host.id = 'financeInvoices'; host.style.display = 'none';
    host.innerHTML = `<div class="sec-toolbar" style="margin:8px 0"><div class="filter-row" id="invChips"></div>
        <div class="filter-row"><input id="invSearch" type="search" placeholder="Search client or invoice no." style="min-width:210px" oninput="fbInvSearch(this.value)" />
          <select id="invCcy" onchange="fbInvCcy(this.value)"><option value="all">All currencies</option></select>
          <select id="invSort" onchange="fbInvSort(this.value)"><option value="due">Due date (oldest first)</option><option value="new">Newest first</option><option value="amount">Largest amount</option><option value="balance">Largest balance</option><option value="client">Client A–Z</option></select></div></div>
      <div class="filter-row" style="margin:0 0 8px" id="invActions">${btn('+ Create Invoice', 'showCreateInvoiceModal()', 1)}${btn('Auto-Generate', 'autoGenerateInvoices()')}${btn('⚙ Billing Rates', 'showBillingRatesModal()')}${btn('Export CSV', 'fbInvCsv()')}</div>
      <div class="kpi-row" id="invKpis"></div><div id="invoicesList"></div>`;
    const after = $('financeBody'); after.parentNode.insertBefore(host, after.nextSibling);
    if (inv) inv.innerHTML = '<div style="padding:28px;color:var(--text-2)">Invoicing is now part of Finance &amp; Billing. Opening it…</div>';   // stub: keeps old links alive, frees the element ids
  }
  function injectStyle() {
    if ($('fbStyle')) return;
    const s = document.createElement('style'); s.id = 'fbStyle';
    s.textContent = `#adminBtn-invoicing{display:none !important}
      .fb-bar{height:8px;background:var(--gold-dim);border-radius:4px;min-width:60px}.fb-bar>i{display:block;height:100%;background:var(--gold);border-radius:4px}
      .fb-age td.n{text-align:right;font-variant-numeric:tabular-nums}.fb-age .hot{color:var(--red);font-weight:700}.fb-age .warm{color:var(--amber)}
      .fb-chk{border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:8px 0;background:var(--card)}
      .fb-chk h5{margin:0 0 4px;font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fb-chk ul{margin:6px 0 0;padding-left:18px;font-size:12px;color:var(--text-2);line-height:1.7}
      .fb-pre{white-space:pre-wrap;font-size:12.5px;line-height:1.6;width:100%;min-height:210px}
      .inv-card .fb-sub{font-size:10px;margin-top:3px}`;
    document.head.appendChild(s);
  }

  /* ═══════════════ Invoices: list, filters, KPIs ═══════════════ */
  function filtered() {
    const q = FB.q.trim().toLowerCase();
    let a = invs().filter(i => (FB.filter === 'all' || eff(i) === FB.filter) && (FB.ccy === 'all' || ccyOf(i) === FB.ccy) &&
      (!q || `${i.client} ${i.ref} ${i.notes || ''}`.toLowerCase().includes(q)));
    const s = FB.sort;
    a.sort((x, y) => s === 'new' ? new Date(y.date) - new Date(x.date) : s === 'amount' ? N(y.total) - N(x.total) : s === 'balance' ? bal(y) - bal(x) : s === 'client' ? String(x.client).localeCompare(String(y.client))
      : (eff(x) === 'paid') - (eff(y) === 'paid') || new Date(dueOf(x)) - new Date(dueOf(y)));
    return a;
  }
  window.renderInvoiceKpis = function () {
    const el = $('invKpis'); if (!el) return;
    const all = invs(), live = all.filter(i => i.status !== 'draft'), open = live.filter(isOpen), od = open.filter(i => daysOver(i) > 0), dr = all.filter(i => i.status === 'draft');
    el.innerHTML = kpiCard('Total Invoiced', byCur(live, i => N(i.total)), `${live.length} invoice${live.length === 1 ? '' : 's'} issued`, 'kpi-gold') +
      kpiCard('Collected', byCur(live, i => N(i.paid)), 'Payments received', 'kpi-green') +
      kpiCard('Outstanding', byCur(open, bal), `${open.length} open`, 'kpi-blue') +
      kpiCard('Overdue', byCur(od, bal), `${od.length} past due`, od.length ? 'kpi-red' : 'kpi-green') +
      kpiCard('Drafts', byCur(dr, i => N(i.total)), `${dr.length} not yet sent`, 'kpi-orange');
  };
  window.renderInvoiceList = function (f) {
    if (typeof f === 'string') FB.filter = f;
    const host = $('invoicesList'); if (!host) return;
    const all = invs(), cnt = k => k === 'all' ? all.length : all.filter(i => eff(i) === k).length;
    const chips = $('invChips');
    if (chips) chips.innerHTML = [['all', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['partial', 'Part-paid'], ['overdue', 'Overdue'], ['paid', 'Paid']]
      .map(([k, l]) => `<button class="filter-btn${FB.filter === k ? ' active' : ''}" onclick="filterInvoices('${k}',this)">${l} <small style="opacity:.7">${cnt(k)}</small></button>`).join('');
    const cs = $('invCcy'); if (cs) { const list = [...new Set(all.map(ccyOf))].sort(); cs.innerHTML = '<option value="all">All currencies</option>' + list.map(c => `<option value="${c}"${FB.ccy === c ? ' selected' : ''}>${c}</option>`).join(''); }
    const items = filtered();
    host.innerHTML = `<div class="inv-grid">${items.map(inv => {
      const e = eff(inv), b = bal(inv), d = daysOver(inv);
      const sub = e === 'draft' ? 'Draft: not yet sent' : e === 'paid' ? 'Settled' : d > 0 ? `<span style="color:var(--red)">${d} day${d === 1 ? '' : 's'} overdue</span>` : d === 0 ? 'Due today' : `Due in ${-d} day${d === -1 ? '' : 's'}`;
      return `<div class="inv-card ${e}" onclick="showInvoiceDetail('${inv.id}')"><div class="inv-type-tag">${esc(inv.ref)}</div><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${esc(inv.client)}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px"><div><div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--gold)">${C(inv.total, inv.currency)}</div>
        <div style="font-size:10px;color:var(--text-3);margin-top:2px">${N(inv.paid) ? `Paid ${C(inv.paid, inv.currency)} · Balance ${C(b, inv.currency)}` : 'Unpaid'}</div></div>${sb(e)}</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:8px">Issued ${fmtDate(inv.date)} · Due ${fmtDate(inv.due)}</div><div class="fb-sub">${sub}</div></div>`;
    }).join('') || '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-label">No invoices match</div></div>'}</div>`;
  };
  window.renderInvoicing = function (f) { if (!canBill()) { const h = $('invoicesList'); if (h) h.innerHTML = '<div style="padding:24px;color:var(--text-2)">Invoices are for Finance and Administrators.</div>'; return; } renderInvoiceKpis(); renderInvoiceList(typeof f === 'string' ? f : FB.filter); };
  window.filterInvoices = function (f) { FB.filter = f; try { _invFilter = f; } catch (e) { /* older build */ } renderInvoiceList(f); };
  window.fbInvSearch = v => { FB.q = v || ''; renderInvoiceList(); };
  window.fbInvCcy = v => { FB.ccy = v; renderInvoiceList(); };
  window.fbInvSort = v => { FB.sort = v; renderInvoiceList(); };
  window.fbInvCsv = () => csv(`invoices-${T()}.csv`, ['Invoice', 'Client', 'Currency', 'Issued', 'Due', 'Subtotal', 'VAT', 'Total', 'Paid', 'Balance', 'Status', 'Days overdue'],
    filtered().map(i => [i.ref, i.client, ccyOf(i), ymd(i.date), i.due ? ymd(i.due) : '', i.subtotal, i.vat, i.total, i.paid, bal(i), eff(i), eff(i) === 'overdue' ? daysOver(i) : 0]));

  /* ═══════════════ Payments: one dialog, one database function ═══════════════ */
  const METHODS = ['Bank Transfer', 'M-Pesa', 'RTGS/EFT', 'Cheque', 'Cash'];
  window.fbPay = async function (id) {
    if (!canFinance()) return toast('Only the Finance Manager or an Administrator can record payments.', 'error');
    const i = invs().find(x => x.id === id); if (!i) return toast('Invoice not found', 'error');
    if (i.status === 'draft') return toast('Mark the invoice as sent before recording a payment.', 'error', 4500);
    if (bal(i) <= 0.005) return toast('This invoice is already fully paid.', 'info');
    const c = ccyOf(i), kes = isKes(c), rate = kes ? 1 : await fxRate();
    FB.pay = { id, c, kes, sys: rate, bal: bal(i), total: N(i.total) };
    openM(`Record payment — ${i.ref}`, `<div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">${esc(i.client)} · Total ${C(i.total, c)} · Paid ${C(i.paid, c)} · <b style="color:var(--gold)">Balance ${C(bal(i), c)}</b></div>
      <div class="form-row-2"><div class="fg"><label>Amount received (${c}) *</label><input id="pay_amt" type="number" step="0.01" min="0.01" value="${bal(i)}" oninput="fbPayPreview()" /></div>
        <div class="fg"><label>Date received *</label><input id="pay_date" type="date" max="${T()}" value="${T()}" /></div></div>
      <div class="form-row-2"><div class="fg"><label>Method</label><select id="pay_method">${METHODS.map(m => `<option>${m}</option>`).join('')}</select></div>
        <div class="fg"><label>Reference / Txn No.</label><input id="pay_ref" placeholder="Bank ref, M-Pesa code, cheque no." /></div></div>
      ${kes ? '' : `<div class="form-row-2"><div class="fg"><label>Exchange rate: 1 ${c} = KSh *</label><input id="pay_rate" type="number" step="0.0001" min="0.0001" value="${rate}" oninput="fbPayPreview()" /></div><div></div></div>`}
      <div class="fg"><label>Note</label><input id="pay_note" placeholder="Optional" /></div>
      <div id="pay_prev" class="hr-card" style="margin:10px 0"></div>
      <div id="pay_err" style="color:var(--red);font-size:12px;min-height:16px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById('modalOverlay')})">Cancel</button>
        <button class="action-btn" id="pay_go" onclick="fbPaySubmit()">Record payment</button></div>`);
    fbPayPreview();
  };
  window.fbPayPreview = function () {
    const p = FB.pay, el = $('pay_prev'); if (!p || !el) return;
    const amt = N($('pay_amt')?.value), rate = p.kes ? 1 : N($('pay_rate')?.value), after = r2(p.bal - amt);
    const st = amt <= 0 ? '—' : after <= 0.005 ? 'Paid in full' : 'Part-paid';
    el.innerHTML = row('Recorded in the books as', `KSh ${(amt * rate).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) + row('Balance after this payment', C(Math.max(0, after), p.c)) + row('Invoice will become', st) +
      (!p.kes && rate && Math.abs(rate - p.sys) > 0.0001 ? `<p style="font-size:11.5px;color:var(--amber);margin:8px 0 0;line-height:1.5">This rate differs from the ledger rate (${p.sys}). The difference stays on the customer's account as an exchange difference. Post it with a journal once the invoice is settled.</p>` : '') +
      (after < -0.005 ? `<p style="font-size:11.5px;color:var(--red);margin:8px 0 0">The amount is more than the balance.</p>` : '');
  };
  window.fbPaySubmit = async function () {
    const p = FB.pay, err = $('pay_err'), go = $('pay_go'); if (!p || FB.busy) return;
    const amt = r2($('pay_amt')?.value), rate = p.kes ? 1 : N($('pay_rate')?.value), date = $('pay_date')?.value || T();
    if (!(amt > 0)) { err.textContent = 'Enter the amount received.'; return; }
    if (amt > p.bal + 0.005) { err.textContent = `The amount is more than the balance (${C(p.bal, p.c)}).`; return; }
    if (!p.kes && !(rate > 0)) { err.textContent = 'Enter the exchange rate.'; return; }
    if (date > T()) { err.textContent = 'The date cannot be in the future.'; return; }
    if (!navigator.onLine) { err.textContent = 'You are offline. Payments need a connection so the books stay correct.'; return; }
    FB.busy = true; if (go) { go.disabled = true; go.textContent = 'Recording…'; } err.textContent = '';
    try {
      const res = await rpc('fin_record_payment', { p_invoice: p.id, p_amount: amt, p_date: date, p_method: $('pay_method')?.value || 'Bank Transfer', p_ref: $('pay_ref')?.value?.trim() || null, p_rate: p.kes ? null : rate, p_note: $('pay_note')?.value?.trim() || null });
      const i = invs().find(x => x.id === p.id); if (i) { i.paid = N(res.paid); i.status = res.status; }
      addAudit(who(), 'Invoice payment', `${i?.ref || p.id}: ${p.c} ${amt}${p.kes ? '' : ' @ ' + rate} → ${res.status}`);
      FB.pay = null; closeM(); toast(res.status === 'paid' ? 'Payment recorded. Invoice paid in full.' : 'Payment recorded', 'success'); fbRefresh();
    } catch (e) { err.textContent = clean(e); }
    finally { FB.busy = false; if (go) { go.disabled = false; go.textContent = 'Record payment'; } }
  };
  window.fbVoidAsk = function (receiptId, invId) {
    if (!isAdmin()) return toast('Only an administrator can reverse a payment.', 'error');
    FB.pay = { receiptId, invId };
    openM('Reverse payment', `<div style="font-size:12.5px;color:var(--text-2);line-height:1.6;margin-bottom:10px">This removes the receipt, reduces the amount paid on the invoice, and posts a reversing journal if the payment was already in the ledger. The reason is kept in the ledger.</div>
      <div class="fg"><label>Reason *</label><textarea id="void_reason" rows="3" placeholder="e.g. Cheque bounced, paid against the wrong invoice"></textarea></div><div id="void_err" style="color:var(--red);font-size:12px;min-height:16px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById('modalOverlay')})">Cancel</button><button class="action-btn" id="void_go" onclick="fbVoidSubmit()">Reverse payment</button></div>`);
  };
  window.fbVoidSubmit = async function () {
    const p = FB.pay, err = $('void_err'), go = $('void_go'), reason = $('void_reason')?.value?.trim();
    if (!p || !p.receiptId || FB.busy) return; if (!reason) { err.textContent = 'Give a reason.'; return; }
    FB.busy = true; if (go) go.disabled = true;
    try {
      const res = await rpc('fin_void_payment', { p_receipt: p.receiptId, p_reason: reason });
      const i = invs().find(x => x.id === p.invId); if (i) { i.paid = N(res.paid); i.status = res.status; }
      addAudit(who(), 'Payment reversed', `${i?.ref || p.invId}: ${reason}`); FB.pay = null; closeM(); toast('Payment reversed', 'success'); fbRefresh();
    } catch (e) { err.textContent = clean(e); }
    finally { FB.busy = false; if (go) go.disabled = false; }
  };
  window.markInvoicePaid = id => fbPay(id);          // the old shortcut changed the invoice without a receipt
  window.erpRecordPay = id => fbPay(id);
  function fbRefresh() {
    try { renderInvoiceKpis(); renderInvoiceList(); } catch (e) { /* host not on screen */ }
    if (state.currentSection === 'finance' && window._finTab && window._finTab !== 'invoices') renderFinance(window._finTab);
    if (typeof buildBadges === 'function') buildBadges();
  }

  /* ═══════════════ Invoice detail: payments, statement, reminder ═══════════════ */
  async function invoiceReceipts(inv) {
    const a = await supabase.from('receipts').select('*').eq('invoice_id', inv.id), b = inv.ref ? await supabase.from('receipts').select('*').eq('invoice_no', inv.ref) : { data: [] };
    if (a.error) throw a.error; const seen = new Set(), out = [];
    [...(a.data || []), ...(b.data || [])].forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } });
    return out.sort((x, y) => String(x.receipt_date).localeCompare(String(y.receipt_date)));
  }
  const _sid = window.showInvoiceDetail;
  window.showInvoiceDetail = async function (id) {
    await _sid.apply(this, arguments);
    const inv = invs().find(i => i.id === id), mb = $('modalBody'); if (!inv || !mb || !$('modalOverlay')?.classList.contains('active')) return;
    mb.querySelectorAll('button[onclick^="markInvoicePaid"]').forEach(b => { if (inv.status === 'draft') b.remove(); else b.textContent = 'Record Payment'; });
    const box = document.createElement('div'); box.id = 'fbPayBlock'; box.style.cssText = 'margin-top:14px;border-top:1px solid var(--border);padding-top:12px';
    box.innerHTML = '<div style="color:var(--text-3);font-size:12px">Loading payments…</div>'; mb.appendChild(box);
    try {
      const rc = await invoiceReceipts(inv); if (!box.isConnected) return;
      const linked = rc.reduce((s, r) => s + N(r.inv_amount), 0), legacy = N(inv.paid) > 0.005 && !rc.length;
      box.innerHTML = `<div style="font-weight:700;font-size:13px;margin-bottom:6px">Payments</div>` +
        tbl(['Date', 'Method', 'Reference', 'Amount (KSh)', 'In invoice currency', ''], rc.map(r => [fmtDate(r.receipt_date), esc(r.method || '—'), esc(r.ref || '—'), M(r.amount), r.inv_amount != null ? C(r.inv_amount, inv.currency) : '—',
          isAdmin() && r.invoice_id ? `<button class="action-btn ghost" onclick="fbVoidAsk('${r.id}','${inv.id}')">Reverse</button>` : '']), 'No payments recorded') +
        (legacy ? `<p style="font-size:11.5px;color:var(--amber);line-height:1.5;margin:8px 0 0">${C(inv.paid, inv.currency)} is marked as paid on this invoice but no receipt exists for it (an older "mark as paid" entry). Cash and the ledger will not show it until a receipt with invoice no. <b>${esc(inv.ref)}</b> is added in Receipts.</p>` : '') +
        (rc.length && linked && Math.abs(linked - N(inv.paid)) > 0.01 && rc.every(r => r.inv_amount != null) ? `<p style="font-size:11.5px;color:var(--red);margin:8px 0 0">Receipts add up to ${C(linked, inv.currency)} but the invoice shows ${C(inv.paid, inv.currency)} paid. See Control → Integrity checks.</p>` : '') +
        `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${canFinance() && inv.status !== 'draft' && bal(inv) > 0.005 ? btn('Record payment', `fbPay('${inv.id}')`, 1) : ''}${btn('Customer statement', `fbStatementFor('${inv.id}')`)}${isOpen(inv) ? btn('Payment reminder', `fbRemindFor('${inv.id}')`) : ''}</div>`;
    } catch (e) { box.innerHTML = `<div style="color:var(--text-3);font-size:12px">Payments could not be loaded: ${esc(clean(e))}</div>`; }
  };

  /* ═══════════════ Debtors & ageing ═══════════════ */
  async function finDebtors() {
    if (!gate()) return; loading();
    const open = invs().filter(isOpen), g = {};
    open.forEach(i => { const k = ccyOf(i) + '|' + i.client; const o = g[k] = g[k] || { client: i.client, c: ccyOf(i), n: 0, b: [0, 0, 0, 0, 0], bal: 0, oldest: 0, ids: [] }; const v = bal(i); o.n++; o.bal += v; o.b[bucketOf(i)] += v; o.oldest = Math.max(o.oldest, daysOver(i)); o.ids.push(i.id); });
    FB.debt = Object.values(g).sort((a, b) => b.bal - a.bal);
    const ccys = [...new Set(FB.debt.map(x => x.c))].sort(), now = new Date(), since = new Date(now - 90 * DAY);
    const dso = c => { const sales = invs().filter(i => i.status !== 'draft' && ccyOf(i) === c && new Date(i.date) >= since).reduce((s, i) => s + N(i.total), 0), ar = FB.debt.filter(x => x.c === c).reduce((s, x) => s + x.bal, 0); return sales > 0 ? Math.round(ar / sales * 90) : null; };
    const tot = c => FB.debt.filter(x => x.c === c).reduce((s, x) => s + x.bal, 0), od = c => FB.debt.filter(x => x.c === c).reduce((s, x) => s + x.b[1] + x.b[2] + x.b[3] + x.b[4], 0), old = c => FB.debt.filter(x => x.c === c).reduce((s, x) => s + x.b[3] + x.b[4], 0);
    kp(kpiCard('Owed to us', ccys.map(c => C(tot(c), c)).join(' · ') || C(0, 'USD'), `${open.length} open invoice${open.length === 1 ? '' : 's'}`, 'kpi-blue') + kpiCard('Overdue', ccys.map(c => C(od(c), c)).join(' · ') || C(0, 'USD'), 'Past the due date', od(ccys[0]) ? 'kpi-red' : 'kpi-green') +
      kpiCard('Over 60 days', ccys.map(c => C(old(c), c)).join(' · ') || C(0, 'USD'), 'Chase first', ccys.some(c => old(c) > 0) ? 'kpi-red' : 'kpi-green') + kpiCard('Clients owing', new Set(FB.debt.map(x => x.client)).size, '', 'kpi-gold') +
      kpiCard('Days to collect (DSO)', ccys.map(c => (dso(c) == null ? '—' : dso(c) + ' d') + (ccys.length > 1 ? ` ${c}` : '')).join(' · ') || '—', 'Based on the last 90 days of billing', 'kpi-orange'));
    const cell = (v, k, c) => `<td class="n ${k >= 3 && v > 0 ? 'hot' : k >= 1 && v > 0 ? 'warm' : ''}">${v > 0 ? C(v, c).replace(c + ' ', '') : '·'}</td>`;
    body(head('Debtors & ageing', btn('Export CSV', 'fbDebtCsv()') + btn('Invoices →', "renderFinance('invoices')")) + (ccys.map(c => {
      const rows = FB.debt.map((x, ix) => [x, ix]).filter(([x]) => x.c === c);
      return `<div style="margin:14px 0 4px;font-weight:700;font-size:13px">${c}</div><div class="table-wrap"><table class="data-table fb-age"><thead><tr><th>Client</th><th>Inv.</th>${BUCKETS.map(b => `<th style="text-align:right">${b}</th>`).join('')}<th style="text-align:right">Balance</th><th>Oldest</th><th></th></tr></thead><tbody>${rows.map(([x, ix]) =>
        `<tr><td><b>${esc(x.client)}</b></td><td>${x.n}</td>${x.b.map((v, k) => cell(v, k, c)).join('')}<td class="n"><b>${C(x.bal, c).replace(c + ' ', '')}</b></td><td>${x.oldest > 0 ? x.oldest + ' d' : '—'}</td>
        <td style="white-space:nowrap">${btn('Statement', `fbStatementIdx(${ix})`)}${btn('Remind', `fbRemindIdx(${ix})`)}${canFinance() ? btn('Pay', `fbPayIdx(${ix})`) : ''}</td></tr>`).join('')}
        <tr style="font-weight:700"><td>Total</td><td>${rows.reduce((s, [x]) => s + x.n, 0)}</td>${BUCKETS.map((_, k) => `<td class="n">${C(rows.reduce((s, [x]) => s + x.b[k], 0), c).replace(c + ' ', '')}</td>`).join('')}<td class="n">${C(tot(c), c).replace(c + ' ', '')}</td><td></td><td></td></tr></tbody></table></div>`;
    }).join('') || '<div class="empty-state"><div class="empty-state-label">Nobody owes us anything right now</div></div>') +
      `<p style="color:var(--text-3);font-size:12px;margin-top:10px">Ageing is counted from each invoice's due date. Draft invoices are not included. Amounts in different currencies are never added together.</p>`);
  }
  window.fbDebtCsv = () => csv(`debtors-${T()}.csv`, ['Client', 'Currency', 'Invoices', ...BUCKETS, 'Balance', 'Oldest (days overdue)'], FB.debt.map(x => [x.client, x.c, x.n, ...x.b.map(r2), r2(x.bal), x.oldest]));
  window.fbPayIdx = ix => { const x = FB.debt[ix]; if (!x) return; const list = x.ids.map(id => invs().find(i => i.id === id)).filter(Boolean).sort((a, b) => new Date(dueOf(a)) - new Date(dueOf(b))); if (list[0]) fbPay(list[0].id); };

  /* ═══════════════ Customer statements and reminders ═══════════════ */
  async function buildStatement(client, c) {
    const list = invs().filter(i => i.status !== 'draft' && i.client === client && ccyOf(i) === c), ids = new Set(list.map(i => i.id)), refs = new Set(list.map(i => i.ref));
    const rc = (await H.load('receipts')).filter(r => (r.invoice_id && ids.has(r.invoice_id)) || (r.invoice_no && refs.has(r.invoice_no)));
    const fx = await fxRate(), lines = [];
    list.forEach(i => {
      lines.push({ d: ymd(i.date), ref: i.ref, desc: 'Invoice', debit: N(i.total), credit: 0 });
      const mine = rc.filter(r => r.invoice_id === i.id || r.invoice_no === i.ref); let got = 0;
      mine.forEach(r => { const a = r.inv_amount != null ? N(r.inv_amount) : (isKes(c) ? N(r.amount) : N(r.amount) / fx); got += a; lines.push({ d: ymd(r.receipt_date), ref: r.ref || i.ref, desc: `Payment (${r.method || 'received'}) for ${i.ref}`, debit: 0, credit: r2(a) }); });
      const rest = r2(N(i.paid) - got); if (rest > 0.01) lines.push({ d: ymd(i.date), ref: i.ref, desc: 'Payment recorded on invoice', debit: 0, credit: rest });
    });
    lines.sort((a, b) => a.d.localeCompare(b.d) || (b.debit > 0) - (a.debit > 0)); let run = 0; lines.forEach(l => { run = r2(run + l.debit - l.credit); l.run = run; });
    return { client, c, lines, closing: run, open: list.filter(isOpen), asAt: T() };
  }
  async function showStatement(client, c) {
    try {
      const s = FB.stmt = await buildStatement(client, c); wide(900);
      const ageing = BUCKETS.map((b, k) => [b, s.open.filter(i => bucketOf(i) === k).reduce((t, i) => t + bal(i), 0)]);
      openM(`Statement — ${client}`, `<div style="font-size:12.5px;color:var(--text-2);margin-bottom:8px">As at ${fmtDate(s.asAt)} · ${c}</div>` +
        tbl(['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'], s.lines.map(l => [fmtDate(l.d), esc(l.ref), esc(l.desc), l.debit ? C(l.debit, c).replace(c + ' ', '') : '', l.credit ? C(l.credit, c).replace(c + ' ', '') : '', C(l.run, c).replace(c + ' ', '')]), 'No billing yet') +
        `<div class="hr-card" style="margin:10px 0">${row('Balance due', `<span style="color:var(--gold)">${C(s.closing, c)}</span>`)}${ageing.map(([b, v]) => row(b === 'Current' ? 'Not yet due' : b + ' days overdue', C(v, c))).join('')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${btn('Payment reminder', 'fbRemindFromStatement()')}${btn('Download PDF', 'fbStatementPdf()')}${btn('Print', 'fbStatementPdf(true)', 1)}</div>`);
    } catch (e) { toast('Could not build the statement: ' + esc(clean(e)), 'error', 5000); }
  }
  window.fbStatementIdx = ix => { const x = FB.debt[ix]; if (x) showStatement(x.client, x.c); };
  window.fbStatementFor = id => { const i = invs().find(x => x.id === id); if (i) showStatement(i.client, ccyOf(i)); };
  window.fbStatementPdf = function (print) {
    const s = FB.stmt; if (!s) return; if (!window.jspdf) return toast('PDF library still loading. Try again in a moment.', 'error');
    const doc = new window.jspdf.jsPDF(), ic = invoiceConfig(); let y = window.ghPdfLetterhead(doc, 14, 10, 182) + 8;
    doc.setFont(undefined, 'bold'); doc.setFontSize(15); doc.setTextColor(20); doc.text('STATEMENT OF ACCOUNT', 14, y); doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.setTextColor(60);
    doc.text(`Customer: ${s.client}`, 14, y + 7); doc.text(`Currency: ${s.c}`, 14, y + 12.5); doc.text(`As at: ${fmtDate(s.asAt)}`, 196, y + 7, { align: 'right' }); y += 22;
    const col = { d: 14, r: 36, t: 70, dr: 140, cr: 166, b: 196 }, hdr = () => { doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(20); doc.text('Date', col.d, y); doc.text('Reference', col.r, y); doc.text('Description', col.t, y); doc.text('Debit', col.dr, y, { align: 'right' }); doc.text('Credit', col.cr, y, { align: 'right' }); doc.text('Balance', col.b, y, { align: 'right' }); doc.line(14, y + 1.8, 196, y + 1.8); y += 6; doc.setFont(undefined, 'normal'); };
    hdr(); const f = n => N(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    s.lines.forEach(l => { if (y > 268) { doc.addPage(); y = 20; hdr(); } doc.setFontSize(8.5); doc.setTextColor(40); doc.text(String(l.d), col.d, y); doc.text(String(l.ref).slice(0, 18), col.r, y); doc.text(String(l.desc).slice(0, 38), col.t, y); if (l.debit) doc.text(f(l.debit), col.dr, y, { align: 'right' }); if (l.credit) doc.text(f(l.credit), col.cr, y, { align: 'right' }); doc.text(f(l.run), col.b, y, { align: 'right' }); y += 5.5; });
    if (y > 250) { doc.addPage(); y = 20; } y += 4; doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.setTextColor(20); doc.text(`Balance due: ${s.c} ${f(s.closing)}`, 196, y, { align: 'right' }); y += 8; doc.setFont(undefined, 'normal'); doc.setFontSize(8.5); doc.setTextColor(70);
    BUCKETS.forEach((b, k) => { const v = s.open.filter(i => bucketOf(i) === k).reduce((t, i) => t + bal(i), 0); doc.text(`${b === 'Current' ? 'Not yet due' : b + ' days'}: ${f(v)}`, 14 + k * 38, y); }); y += 10;
    doc.setFontSize(8.5); doc.text(`Please pay to: ${ic.companyName} · ${ic.bankName} · A/C ${ic.bankAccount} · ${ic.branchName} · Swift ${ic.bankSwift}`, 14, y);
    if (print && window.ghPrintPdf) window.ghPrintPdf(doc); else doc.save(`Statement-${s.client.replace(/[^\w]+/g, '_')}-${s.asAt}.pdf`);
    addAudit(who(), 'Statement ' + (print ? 'printed' : 'downloaded'), s.client);
  };
  function reminderText(client, c, list) {
    const ic = invoiceConfig(), total = list.reduce((s, i) => s + bal(i), 0), od = list.some(i => daysOver(i) > 0);
    return `Dear ${client},\n\n${od ? 'This is a friendly reminder that the following invoice(s) are now overdue:' : 'This is a reminder of the following invoice(s) on your account:'}\n\n` +
      list.slice().sort((a, b) => new Date(dueOf(a)) - new Date(dueOf(b))).map(i => `• ${i.ref}: ${C(bal(i), c)}, due ${fmtDate(dueOf(i))}${daysOver(i) > 0 ? ` (${daysOver(i)} days overdue)` : ''}`).join('\n') +
      `\n\nTotal outstanding: ${C(total, c)}\n\nKindly arrange payment to:\n${ic.companyName}\n${ic.bankName}${ic.branchName ? ', ' + ic.branchName : ''}\nAccount: ${ic.bankAccount}${ic.bankSwift ? '\nSwift: ' + ic.bankSwift : ''}\n\nIf you have already paid, please send us the payment reference so we can match it. Thank you.\n\n${ic.companyName}${ic.companyTel ? '\nTel: ' + ic.companyTel : ''}`;
  }
  function showReminder(client, c) {
    const list = invs().filter(i => i.client === client && ccyOf(i) === c && isOpen(i)); if (!list.length) return toast('Nothing outstanding for this client.', 'info');
    FB.remind = { client, c }; const txt = reminderText(client, c, list); wide(640);
    openM(`Payment reminder — ${client}`, `<div style="font-size:12px;color:var(--text-3);margin-bottom:6px">Edit the wording if you like, then copy it or open it in WhatsApp or email.</div><textarea id="fbRemindTxt" class="fb-pre">${esc(txt)}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:10px">${btn('Copy', 'fbRemindCopy()')}${btn('WhatsApp', 'fbRemindGo(\'wa\')')}${btn('Email', 'fbRemindGo(\'mail\')', 1)}</div>`);
  }
  window.fbRemindIdx = ix => { const x = FB.debt[ix]; if (x) showReminder(x.client, x.c); };
  window.fbRemindFor = id => { const i = invs().find(x => x.id === id); if (i) showReminder(i.client, ccyOf(i)); };
  window.fbRemindFromStatement = () => { const s = FB.stmt; if (s) showReminder(s.client, s.c); };
  window.fbRemindCopy = async () => { const t = $('fbRemindTxt')?.value || ''; try { await navigator.clipboard.writeText(t); toast('Copied', 'success'); } catch (e) { $('fbRemindTxt')?.select(); toast('Press Ctrl+C to copy', 'info'); } addAudit(who(), 'Payment reminder prepared', FB.remind?.client || ''); };
  window.fbRemindGo = k => { const t = encodeURIComponent($('fbRemindTxt')?.value || ''); addAudit(who(), 'Payment reminder sent via ' + (k === 'wa' ? 'WhatsApp' : 'email'), FB.remind?.client || ''); window.open(k === 'wa' ? `https://wa.me/?text=${t}` : `mailto:?subject=${encodeURIComponent('Payment reminder: ' + (FB.remind?.client || ''))}&body=${t}`, '_blank', 'noopener'); };

  /* ═══════════════ Revenue analysis ═══════════════ */
  async function finRevenue() {
    if (!gate()) return; loading();
    try {
      const [rc, fx] = await Promise.all([H.load('receipts'), fxRate()]), live = invs().filter(i => i.status !== 'draft'), ms = monthsBack(12), k = i => (isKes(ccyOf(i)) ? 1 : fx);
      const mo = Object.fromEntries(ms.map(m => [m, { net: 0, vat: 0, n: 0, got: 0, other: 0 }]));
      live.forEach(i => { const m = ymd(i.date).slice(0, 7); if (mo[m]) { mo[m].net += N(i.subtotal) * k(i); mo[m].vat += N(i.vat) * k(i); mo[m].n++; } });
      rc.forEach(r => { const m = String(r.receipt_date).slice(0, 7); if (mo[m]) { if (r.invoice_no) mo[m].got += N(r.amount); else mo[m].other += N(r.amount); } });
      const yr = String(new Date().getFullYear()), ytd = live.filter(i => ymd(i.date).startsWith(yr)), net = ytd.reduce((s, i) => s + N(i.subtotal) * k(i), 0), gross = ytd.reduce((s, i) => s + N(i.total) * k(i), 0), got = ytd.reduce((s, i) => s + N(i.paid) * k(i), 0);
      const cl = {}; ytd.forEach(i => { const o = cl[i.client] = cl[i.client] || { net: 0, n: 0, due: 0 }; o.net += N(i.subtotal) * k(i); o.n++; o.due += bal(i) * k(i); });
      const top = Object.entries(cl).sort((a, b) => b[1].net - a[1].net), tmax = Math.max(1, ...top.slice(0, 10).map(x => x[1].net)), mmax = Math.max(1, ...ms.map(m => mo[m].net));
      const cc = {}; live.forEach(i => { const o = cc[ccyOf(i)] = cc[ccyOf(i)] || { t: 0, p: 0, n: 0 }; o.t += N(i.total); o.p += N(i.paid); o.n++; });
      kp(kpiCard(`Revenue ${yr}`, M(net), 'Before VAT, in KSh', 'kpi-gold') + kpiCard('Billed incl. VAT', M(gross), `${ytd.length} invoices`, 'kpi-blue') + kpiCard('Collected', M(got), gross ? Math.round(got / gross * 100) + '% of billed' : '', 'kpi-green') + kpiCard('Average invoice', M(ytd.length ? net / ytd.length : 0), 'Before VAT', 'kpi-orange') + kpiCard('Top client share', top.length && net ? Math.round(top[0][1].net / net * 100) + '%' : '—', top.length ? esc(top[0][0]) : '', top.length && net && top[0][1].net / net > .5 ? 'kpi-red' : 'kpi-green'));
      body(head('Revenue analysis', btn('Export CSV', 'fbRevCsv()')) + `<p style="color:var(--text-3);font-size:12px;margin:0 0 8px">Figures in other currencies are converted at the ledger rate (1 USD = KSh ${fx}). Revenue is shown before VAT.</p>` +
        tbl(['Month', 'Invoices', 'Revenue (ex VAT)', '', 'VAT', 'Collected (invoice payments)'], ms.slice().reverse().map(m => [m, mo[m].n, M(mo[m].net), `<div class="fb-bar"><i style="width:${Math.round(mo[m].net / mmax * 100)}%"></i></div>`, M(mo[m].vat), M(mo[m].got)]), '') +
        `<div style="height:14px"></div>` + tbl([`Top clients ${yr}`, 'Invoices', 'Revenue (ex VAT)', '', 'Still owing'], top.slice(0, 10).map(([c, v]) => [esc(c), v.n, M(v.net), `<div class="fb-bar"><i style="width:${Math.round(v.net / tmax * 100)}%"></i></div>`, M(v.due)]), 'No invoices this year') +
        `<div style="height:14px"></div>` + tbl(['Currency', 'Invoices', 'Billed', 'Collected', 'Outstanding'], Object.entries(cc).map(([c, v]) => [c, v.n, C(v.t, c), C(v.p, c), C(v.t - v.p, c)]), 'No invoices yet'));
      FB.rev = { ms, mo, top, yr };
    } catch (e) { errBox(e); }
  }
  window.fbRevCsv = () => { const r = FB.rev; if (!r) return; csv(`revenue-${T()}.csv`, ['Month', 'Invoices', 'Revenue ex VAT (KSh)', 'VAT (KSh)', 'Collected (KSh)'], r.ms.map(m => [m, r.mo[m].n, r2(r.mo[m].net), r2(r.mo[m].vat), r2(r.mo[m].got)])); };

  /* ═══════════════ Integrity checks ═══════════════ */
  async function finIntegrity() {
    if (!gate()) return; loading();
    const all = invs(), live = all.filter(i => i.status !== 'draft'), res = [], add = (id, title, sev, items, hint, go) => res.push({ id, title, sev, items, hint, go });
    const safe = async (fn) => { try { return await fn(); } catch (e) { return { __err: clean(e) }; } };
    const [rc, ex, bl, st, h, up, inbox] = await Promise.all([safe(() => H.load('receipts')), safe(() => H.load('expenses')), safe(() => H.load('bills')), safe(async () => (await supabase.from('finance_settings').select('*').eq('id', 1).maybeSingle()).data),
      safe(() => rpc('gl_health')), safe(() => rpc('gl_unposted')), safe(() => rpc('fin_approvals_inbox'))]);
    const ok = x => x && !x.__err, inv = i => `${esc(i.ref)} · ${esc(i.client)}`;
    add('tot', 'Invoice totals add up', 'bad', all.filter(i => Math.abs(N(i.subtotal) + N(i.vat) - N(i.total)) > 0.02).map(i => ({ t: `${inv(i)}: subtotal + VAT = ${C(N(i.subtotal) + N(i.vat), i.currency)} but total is ${C(i.total, i.currency)}`, js: `showInvoiceDetail('${i.id}')` })), 'The total must equal subtotal plus VAT.');
    add('over', 'No invoice is overpaid', 'bad', all.filter(i => N(i.paid) > N(i.total) + 0.005).map(i => ({ t: `${inv(i)}: paid ${C(i.paid, i.currency)} on a total of ${C(i.total, i.currency)}`, js: `showInvoiceDetail('${i.id}')` })), 'Reverse the extra payment from the invoice.');
    add('stat', 'Invoice status matches the balance', 'warn', live.filter(i => (i.status === 'paid') !== (bal(i) <= 0.005 && N(i.total) > 0)).map(i => ({ t: `${inv(i)}: marked ${i.status} with a balance of ${C(bal(i), i.currency)}`, js: `showInvoiceDetail('${i.id}')` })), 'A paid invoice has no balance, and an invoice with no balance is paid.');
    add('due', 'Issued invoices have a due date', 'warn', live.filter(i => !i.due).map(i => ({ t: inv(i), js: `showInvoiceDetail('${i.id}')` })), 'Without a due date an invoice can never be chased.');
    add('draft', 'No old drafts', 'info', all.filter(i => i.status === 'draft' && Date.now() - new Date(i.date) > 14 * DAY).map(i => ({ t: `${inv(i)}: draft for ${Math.round((Date.now() - new Date(i.date)) / DAY)} days`, js: `showInvoiceDetail('${i.id}')` })), 'Send or remove drafts so billing is not understated.');
    if (ok(rc)) {
      const linked = i => rc.filter(r => r.invoice_id === i.id || (r.invoice_no && r.invoice_no === i.ref));
      add('norc', 'Every payment on an invoice has a receipt', 'warn', live.filter(i => N(i.paid) > 0.005 && !linked(i).length).map(i => ({ t: `${inv(i)}: ${C(i.paid, i.currency)} paid but no receipt`, js: `showInvoiceDetail('${i.id}')` })), 'Older "mark as paid" entries. Add the receipt so cash and the ledger agree.');
      add('mis', 'Receipts add up to what the invoice shows as paid', 'bad', live.filter(i => { const l = linked(i); return l.length && l.every(r => r.inv_amount != null) && Math.abs(l.reduce((s, r) => s + N(r.inv_amount), 0) - N(i.paid)) > 0.01; }).map(i => ({ t: `${inv(i)}: receipts ${C(linked(i).reduce((s, r) => s + N(r.inv_amount), 0), i.currency)} vs paid ${C(i.paid, i.currency)}`, js: `showInvoiceDetail('${i.id}')` })), 'Someone changed one side without the other.');
      const refs = new Set(all.flatMap(i => [i.ref, String(i.id).slice(0, 8)]));
      add('orph', 'Receipts point to real invoices', 'warn', rc.filter(r => r.invoice_no && !refs.has(r.invoice_no)).map(r => ({ t: `${H.date(r.receipt_date)} · ${esc(r.payer)} · ${M(r.amount)} · invoice "${esc(r.invoice_no)}" not found`, js: "renderFinance('receipts')" })), 'A typo in the invoice number leaves the money unmatched.');
      const seen = {}, dups = []; rc.forEach(r => { if (!r.ref) return; const k = [r.payer, r.ref, r.amount, r.receipt_date].join('|').toLowerCase(); if (seen[k]) dups.push(r); else seen[k] = 1; });
      add('dup', 'No duplicate receipts', 'warn', dups.map(r => ({ t: `${H.date(r.receipt_date)} · ${esc(r.payer)} · ${esc(r.ref)} · ${M(r.amount)}`, js: "renderFinance('receipts')" })), 'Same payer, reference, amount and date entered twice.');
    } else add('rc', 'Receipts check', 'warn', [{ t: 'Could not run: ' + esc(rc.__err) }], '');
    if (ok(ex)) add('exp', 'No expense waiting more than a week', 'warn', ex.filter(e => e.status === 'pending' && Date.now() - new Date(e.created_at || e.expense_date) > 7 * DAY).map(e => ({ t: `${H.date(e.expense_date)} · ${esc(e.description)} · ${M(e.amount)}`, js: "renderFinance('expenses')" })), 'Approve or reject so the month is complete.');
    if (ok(bl)) add('bill', 'No overdue supplier bills', 'warn', bl.filter(b => b.status !== 'paid' && b.due_date && b.due_date < T()).map(b => ({ t: `${esc(b.supplier)} · ${esc(b.bill_no || '')} · ${M(b.amount)} · due ${H.date(b.due_date)}`, js: "renderFinance('bills')" })), 'Late payment can cost supplier goodwill or penalties.');
    if (ok(h)) add('bal', 'The ledger balances', 'bad', h.balanced ? [] : [{ t: 'Total debits do not equal total credits', js: "renderFinance('gl')" }], 'Look at the latest journals.');
    if (ok(up)) { const p = Object.entries(up).filter(([, v]) => N(v.count) > 0); add('unp', 'Everything is posted to the ledger', 'warn', p.map(([k, v]) => ({ t: `${esc(k)}: ${N(v.count)} item(s), ${M(v.amount)}`, js: "renderFinance('gl')" })), 'Open Ledger Home and post what is waiting.'); }
    if (ok(inbox) && Array.isArray(inbox)) add('inb', 'Nothing is waiting for approval', 'info', inbox.length ? [{ t: `${inbox.length} item(s) waiting`, js: "renderFinance('approvals')" }] : [], 'Items stuck in approvals hold up payments and reporting.');
    if (ok(st)) {
      const fxv = N(st.usd_kes); add('fx', 'Exchange rate is set and sensible', 'warn', fxv >= 50 && fxv <= 400 ? [] : [{ t: `USD→KSh is ${fxv || 'not set'}`, js: "renderFinance('controls')" }], 'Dollar invoices and receipts are converted at this rate.');
      add('lock', 'A period has been closed', 'info', st.lock_before ? [] : [{ t: 'No period is closed yet. Past months can still be changed.', js: "renderFinance('controls')" }], 'Close each month once it has been reviewed.');
    }
    const bad = res.filter(r => r.items.length && r.sev === 'bad').length, warn = res.filter(r => r.items.length && r.sev === 'warn').length, pass = res.filter(r => !r.items.length).length;
    kp(kpiCard('Checks run', res.length, '', 'kpi-blue') + kpiCard('Passed', pass, '', 'kpi-green') + kpiCard('Need fixing', bad, 'Figures may be wrong', bad ? 'kpi-red' : 'kpi-green') + kpiCard('Worth a look', warn, '', warn ? 'kpi-orange' : 'kpi-green'));
    const tone = r => !r.items.length ? '<span class="hb hb-g">OK</span>' : r.sev === 'bad' ? '<span class="hb hb-r">Fix</span>' : r.sev === 'warn' ? '<span class="hb hb-a">Review</span>' : '<span class="hb hb-b">Note</span>';
    body(head('Integrity checks', btn('Run again', "renderFinance('integrity')")) + `<p style="color:var(--text-3);font-size:12px;margin:0 0 6px">These checks read your records and report anything that does not add up. They change nothing.</p>` +
      res.sort((a, b) => (!!b.items.length - !!a.items.length) || ['bad', 'warn', 'info'].indexOf(a.sev) - ['bad', 'warn', 'info'].indexOf(b.sev)).map(r => `<div class="fb-chk"><h5>${tone(r)} ${esc(r.title)}${r.items.length ? ` <small style="color:var(--text-3)">${r.items.length}</small>` : ''}</h5>${r.items.length ? `<div style="font-size:12px;color:var(--text-3)">${esc(r.hint)}</div><ul>${r.items.slice(0, 8).map(x => `<li>${x.t}${x.js ? ` <a href="#" onclick="${x.js};return false" style="color:var(--gold)">open</a>` : ''}</li>`).join('')}${r.items.length > 8 ? `<li>…and ${r.items.length - 8} more</li>` : ''}</ul>` : ''}</div>`).join(''));
  }

  /* ═══════════════ Overview snapshot ═══════════════ */
  async function fbOverview() {
    const host = $('financeBody'); if (!host || !canFinance() || $('fbSnap')) return;
    const open = invs().filter(isOpen), od = open.filter(i => daysOver(i) > 0), soon = open.filter(i => { const d = daysOver(i); return d <= 0 && d >= -7; }), dr = invs().filter(i => i.status === 'draft');
    let rcMtd = 0, rcN = 0, appr = null, unp = null, lateBills = null;
    try { const ms = T().slice(0, 7), rc = await H.load('receipts'); rc.filter(r => r.invoice_no && String(r.receipt_date).startsWith(ms)).forEach(r => { rcMtd += N(r.amount); rcN++; }); } catch (e) { /* card shows what it has */ }
    try { const a = await rpc('fin_approvals_inbox'); appr = Array.isArray(a) ? a.length : null; } catch (e) { /* optional */ }
    try { const u = await rpc('gl_unposted'); unp = Object.values(u || {}).reduce((s, v) => s + N(v.count), 0); } catch (e) { /* optional */ }
    try { lateBills = (H.rows.bills || await H.load('bills')).filter(b => b.status !== 'paid' && b.due_date && b.due_date < T()).length; } catch (e) { /* optional */ }
    if ($('fbSnap') || state.currentSection !== 'finance' || (window._finTab || 'overview') !== 'overview') return;
    host.insertAdjacentHTML('afterbegin', `<div class="hr-grid" id="fbSnap">
      ${card('Billing & collections', '', row('Owed to us', byCur(open, bal)) + row('Overdue', `<span style="color:${od.length ? 'var(--red)' : 'inherit'}">${byCur(od, bal)}</span> <small>(${od.length})</small>`) + row('Due in the next 7 days', byCur(soon, bal)) + row('Drafts not yet sent', dr.length) + `<p style="margin-top:10px">${btn('Invoices →', "renderFinance('invoices')")} ${btn('Debtors →', "renderFinance('debtors')")}</p>`)}
      ${card('Collected this month', 'invoice payments', row('Received (KSh)', M(rcMtd)) + row('Payments', rcN) + `<p style="margin-top:10px">${btn('Receipts →', "renderFinance('receipts')")} ${btn('Revenue →', "renderFinance('revenue')")}</p>`)}
      ${card('Needs attention', '', row('Waiting for approval', appr == null ? '—' : appr) + row('Not yet in the ledger', unp == null ? '—' : unp) + row('Overdue supplier bills', lateBills == null ? '—' : lateBills) + `<p style="margin-top:10px">${btn('Approvals →', "renderFinance('approvals')")} ${btn('Integrity checks →', "renderFinance('integrity')")}</p>`)}</div>`);
  }

  /* ═══════════════ Wiring ═══════════════ */
  const ALIAS = { receivables: 'debtors', invoicing: 'invoices' };
  const _rf = window.renderFinance;
  window.renderFinance = async function (tab, btnEl) {
    tab = ALIAS[tab] || tab || 'overview';
    const onInv = tab === 'invoices', h = $('financeInvoices'), b = $('financeBody');
    if (h) h.style.display = onInv ? '' : 'none'; if (b) b.style.display = onInv ? 'none' : '';
    const r = await _rf.call(this, tab, btnEl);
    if (tab === 'overview') { try { document.querySelectorAll('#financeBody .hr-card h4').forEach(x => { if (/^Receivables/.test(x.textContent)) x.closest('.hr-card')?.remove(); }); await fbOverview(); } catch (e) { console.warn('billing snapshot', e); } }
    return r;
  };
  /* tab bar layout: [id, group, position]. Lower position comes first inside a group. */
  const T_ = F.tabs, reg = (id, label, fn, group, pos) => { F.add(id, label, () => { const m = document.querySelector('#modalOverlay .modal-box'); if (m) m.style.maxWidth = ''; return fn(); }, group, null, pos); };
  reg('invoices', 'Invoices', async () => { buildHost(); const h = $('financeInvoices'); if (h) h.style.display = ''; renderInvoicing(); }, 'Billing & collections', 50);
  reg('debtors', 'Debtors & Ageing', finDebtors, 'Billing & collections', 60);
  reg('revenue', 'Revenue', finRevenue, 'Billing & collections', 270);
  reg('integrity', 'Integrity Checks', finIntegrity, 'Control', 550);
  delete T_.receivables;                                                                  // replaced by Invoices + Debtors
  const LAYOUT = { reports: ['Overview', 150], credit: ['Billing & collections', 250], petty: ['Payables & spending', 460], po: ['Payables & spending', 450], postq: ['Payables & spending', 470], fleet: ['Payables & spending', 480],
    bank: ['Cash & planning', 100], cashflow: ['Cash & planning', 110], budgets: ['Cash & planning', 120], recurring: ['Cash & planning', 130], approvals: ['Control', 500], people: ['Control', 700],
    gl: ['General ledger', 10], journals: ['General ledger', 20], coa: ['General ledger', 30], ledger: ['General ledger', 40], tb: ['General ledger', 50], pl: ['General ledger', 60], bs: ['General ledger', 70],
    assets: ['Assets & tax', 10], vat: ['Assets & tax', 20], statutory: ['Assets & tax', 30] };
  Object.entries(LAYOUT).forEach(([id, [g, p]]) => { if (T_[id]) { T_[id].group = g; T_[id].pos = p; T_[id].after = null; } });

  /* old Invoicing entry points all land in the merged screen */
  window.fbOpenInvoices = function () {
    if (!canBill()) return toast('You don\'t have access to invoices.', 'error');
    window._finGoto = 'invoices'; const nav = document.querySelector('.nav-item[data-section="finance"]');
    showSection('finance', nav);
  };
  if (typeof sectionRenderers !== 'undefined') {
    sectionRenderers.invoicing = () => { if (state.currentSection === 'invoicing' || state.currentAdminSection === 'invoicing') fbOpenInvoices(); };
    sectionRenderers.finance = () => { const t = window._finGoto || 'overview'; window._finGoto = null; return renderFinance(t); };
  }
  const _sas = window.showAdminSection;
  window.showAdminSection = function (sec, b) { if (sec === 'invoicing') return fbOpenInvoices(); return _sas.apply(this, arguments); };
  try { if (typeof SECTION_META !== 'undefined') SECTION_META.finance = ['Finance', 'Finance & Billing']; } catch (e) { /* titles only */ }

  /* badge: overdue invoices count on the Finance & Billing nav item (the Invoicing button is hidden now) */
  const _bb = window.buildBadges;
  window.buildBadges = function () {
    if (_bb) _bb.apply(this, arguments);
    try {
      const n = canBill() ? invs().filter(i => isOpen(i) && daysOver(i) > 0).length : 0;
      document.querySelectorAll('.nav-item[data-section="finance"]').forEach(b => { let s = b.querySelector('.fb-badge'); if (!s) { s = document.createElement('span'); s.className = 'nav-badge warn fb-badge'; b.appendChild(s); } s.textContent = n || ''; s.style.display = n ? 'inline' : 'none'; s.title = n ? `${n} overdue invoice${n === 1 ? '' : 's'}` : ''; });
    } catch (e) { /* cosmetic */ }
  };
  buildHost(); injectStyle();
  document.querySelectorAll('.nav-item[data-section="finance"]').forEach(b => { b.childNodes.forEach(n => { if (n.nodeType === 3 && /Finance Hub/.test(n.textContent)) n.textContent = n.textContent.replace('Finance Hub', 'Finance & Billing'); }); });
})();
