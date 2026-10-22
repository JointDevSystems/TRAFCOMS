'use strict';
/* Gargo Finance Hub + the shared record helper GARGO_HUB (also used by hr.js).
   Tables come from migration phase1_hr_finance_core.sql. Access and approval rules are enforced by the database
   (row-level security + triggers); this screen only mirrors them so people get a clear message, not a raw error. */
(function () {
  const pad = n => String(n).padStart(2, '0');
  /* Local (Nairobi) date, not UTC: toISOString() would give yesterday's date between midnight and 3 a.m. */
  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const monthStart = () => todayISO().slice(0, 8) + '01';
  const N = v => Number(v || 0);

  const TONE = { paid: 'g', approved: 'g', active: 'g', present: 'g', hired: 'g', closed: 'g', returned: 'g', acknowledged: 'g',
    pending: 'a', draft: 'a', unpaid: 'a', partial: 'a', late: 'a', submitted: 'a', interview: 'a', offer: 'a', shortlisted: 'a', open: 'a', on_leave: 'a',
    issued: 'b', applied: 'b', leave: 'b', off: 'b', rejected: 'r', overdue: 'r', absent: 'r', lost: 'r', suspended: 'r', exited: 'r', appealed: 'r' };
  const badge = s => { const k = String(s || '').toLowerCase(); return `<span class="hb hb-${TONE[k] || 'n'}">${esc(k.replace(/_/g, ' '))}</span>`; };
  const kpi = (l, v, s, c) => typeof kpiCard === 'function' ? kpiCard(l, v, s || '', c || 'kpi-gold')
    : `<div class="kpi-card ${c || 'kpi-gold'}"><div class="kpi-value">${v}</div><div class="kpi-label">${l}</div>${s ? `<div class="kpi-sub">${s}</div>` : ''}</div>`;
  const closeM = () => { const o = document.getElementById('modalOverlay'); closeModal(o ? { target: o } : undefined); };
  const canApprove = () => isAdmin() || currentRole() === 'finance';
  if (typeof window.canApprove !== 'function') window.canApprove = canApprove;

  /* ── Approval policy (finance_settings row 1) ── */
  const POLICY = { loaded: false, limit: 0, separate: true };
  async function loadPolicy(force) {
    if (POLICY.loaded && !force) return POLICY;
    const { data, error } = await supabase.from('finance_settings').select('approval_limit,separate_approver').eq('id', 1).single();
    if (!error && data) { POLICY.limit = N(data.approval_limit); POLICY.separate = !!data.separate_approver; POLICY.loaded = true; }
    return POLICY;
  }
  async function approvalBlock(rec, amount) {
    if (!canApprove()) return 'Only the Finance Manager or an Administrator can approve.';
    if (isAdmin()) return '';
    const p = await loadPolicy();
    if (p.limit > 0 && N(amount) > p.limit) return `This is above the KSh ${p.limit.toLocaleString('en-KE')} limit. An administrator must approve it.`;
    if (p.separate && rec && rec.created_by && rec.created_by === state.profile?.id) return 'You entered this yourself, so someone else must approve it.';
    return '';
  }

  /* ───────────── shared record helper ───────────── */
  const HUB = {
    cfg: {}, rows: {}, emp: {}, _tok: 0,
    money: n => 'KSh ' + N(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    date: d => d ? fmtDate(d) : '—',
    todayISO, monthStart, badge,
    kpi: (label, val, sub, cls) => kpi(label, val, sub, cls),

    async load(table) {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(2000);
      if (error) { console.error(table, error); toast(`Could not load ${table}: ${error.message}`, 'error'); return []; }
      this.rows[table] = data || [];
      return this.rows[table];
    },
    async loadEmployees() {
      const rows = await this.load('employees');
      this.emp = Object.fromEntries(rows.map(e => [e.id, e]));
      return rows;
    },
    cell(r, c) {
      const [k, , f] = c, v = r[k];
      if (f === 'money') return this.money(v);
      if (f === 'date') return this.date(v);
      if (f === 'badge') return v ? badge(v) : '—';
      if (f === 'emp') return esc(this.emp[v]?.full_name || '—');
      if (f === 'expiry') {
        if (!v) return '—';
        const d = Math.ceil((new Date(v) - Date.now()) / 864e5);
        return `${this.date(v)} ` + (d < 0 ? '<span class="hb hb-r">Expired</span>' : d <= 30 ? `<span class="hb hb-a">${d}d left</span>` : '<span class="hb hb-g">Valid</span>');
      }
      return esc(v ?? '—');
    },

    /* cfg: { table, host, kpiHost, cols:[[key,label,fmt]], fields:[{k,l,t,o,r,d,ro}], canEdit(), canDelete(), title, extra(), rowActions(r), needsEmp, oninput, beforeSave(rec), newDefaults, refresh() } */
    async render(cfg, kpiFn) {
      this.cfg[cfg.table] = cfg;
      const tok = ++this._tok, host = document.getElementById(cfg.host);
      if (!host) return;
      host.innerHTML = '<div class="hub-loading">Loading…</div>';
      if (cfg.needsEmp) await this.loadEmployees();
      const rows = await this.load(cfg.table);
      if (tok !== this._tok) return;                       // a newer tab was opened meanwhile
      const kh = document.getElementById(cfg.kpiHost);
      if (kh) kh.innerHTML = kpiFn ? kpiFn(rows) : '';
      const edit = cfg.canEdit(), acts = edit || !!(cfg.actionsForAll && cfg.rowActions);   // approvers may get row buttons without edit rights
      const head = cfg.cols.map(c => `<th>${c[1]}</th>`).join('') + (acts ? '<th></th>' : '');
      const body = rows.map(r => `<tr>${cfg.cols.map(c => `<td>${this.cell(r, c)}</td>`).join('')}${acts ?
        `<td style="white-space:nowrap">${cfg.rowActions ? cfg.rowActions(r) : ''}${edit ? `<button class="action-btn ghost" onclick="GARGO_HUB.open('${cfg.table}','${r.id}')">Edit</button>` : ''}${edit && cfg.canDelete() ?
        ` <button class="action-btn ghost" onclick="GARGO_HUB.del('${cfg.table}','${r.id}')" title="Delete">✕</button>` : ''}</td>` : ''}</tr>`).join('');
      host.innerHTML = `<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">${cfg.title} <span style="color:var(--text-3)">(${rows.length})</span></div>
        <div class="filter-row">${edit ? `<button class="action-btn" onclick="GARGO_HUB.open('${cfg.table}')">+ Add</button>` : ''}${cfg.extra ? cfg.extra() : ''}</div></div>
        <div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cfg.cols.length + 1}" style="text-align:center;color:var(--text-3);padding:28px">No records yet</td></tr>`}</tbody></table></div>`;
    },

    open(table, id) {
      const cfg = this.cfg[table], r = (this.rows[table] || []).find(x => x.id === id) || {};
      const inputs = cfg.fields.map(f => {
        const v = r[f.k] ?? f.d ?? '', a = `id="bf_${f.k}" ${f.ro ? 'readonly' : ''} ${cfg.oninput ? `oninput="${cfg.oninput}"` : ''}`;
        let el;
        if (f.t === 'select') el = `<select ${a}>${f.o.map(o => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
        else if (f.t === 'emp') el = `<select ${a}><option value="">— select —</option>${Object.values(this.emp).filter(e => e.status !== 'exited').map(e => `<option value="${e.id}" ${e.id === v ? 'selected' : ''}>${esc(e.full_name)} (${esc(e.staff_no || '')})</option>`).join('')}</select>`;
        else if (f.t === 'textarea') el = `<textarea ${a} rows="2">${esc(v)}</textarea>`;
        else el = `<input ${a} type="${f.t || 'text'}" ${f.t === 'number' ? 'step="0.01"' : ''} value="${esc(v)}"/>`;
        return `<div class="fg"><label>${f.l}${f.r ? ' *' : ''}</label>${el}</div>`;
      });
      const rowsHtml = []; for (let i = 0; i < inputs.length; i += 2) rowsHtml.push(`<div class="form-row-2">${inputs[i]}${inputs[i + 1] || ''}</div>`);
      openModal((id ? 'Edit ' : 'Add ') + cfg.title, `${rowsHtml.join('')}<div id="bf_err" style="color:var(--red);font-size:12px;min-height:16px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById('modalOverlay')})">Cancel</button>
        <button class="action-btn" id="bf_save" onclick="GARGO_HUB.save('${table}','${id || ''}')">Save</button></div>`);
      const fn = cfg.oninput && window[cfg.oninput.replace(/\(.*$/, '')];
      if (typeof fn === 'function') { try { fn(); } catch (e) { /* ignore */ } }
    },

    async save(table, id) {
      const cfg = this.cfg[table], rec = {}, err = document.getElementById('bf_err'), btn = document.getElementById('bf_save');
      for (const f of cfg.fields) {
        const v = document.getElementById('bf_' + f.k)?.value?.trim();
        if (f.r && !v) { err.textContent = `${f.l} is required`; return; }
        rec[f.k] = v === '' || v === undefined ? null : (f.t === 'number' ? Number(v) : v);
      }
      if (cfg.beforeSave) { const m = cfg.beforeSave(rec); if (m) { err.textContent = m; return; } }
      if (btn) btn.disabled = true;
      let error;
      if (id) ({ error } = await supabase.from(table).update(rec).eq('id', id));
      else { if (cfg.newDefaults) Object.assign(rec, cfg.newDefaults); rec.created_by = state.profile?.id || null; ({ error } = await supabase.from(table).insert(rec)); }
      if (btn) btn.disabled = false;
      if (error) { err.textContent = error.message; return; }
      addAudit(state.profile?.username, (id ? 'Updated ' : 'Created ') + cfg.title, JSON.stringify(rec).slice(0, 200));
      closeM(); toast('Saved', 'success'); cfg.refresh();
    },

    async del(table, id) {
      if (!confirm('Delete this record? This cannot be undone.')) return;
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) { toast(error.message, 'error'); return; }
      addAudit(state.profile?.username, 'Deleted ' + this.cfg[table].title, id);
      this.cfg[table].refresh();
    },
  };
  window.GARGO_HUB = HUB;

  /* ───────────── FINANCE HUB ───────────── */
  const FIN_CATS = ['Fuel', 'Repairs & Maintenance', 'Spare Parts', 'Tyres', 'Salaries & Wages', 'Utilities', 'Rent & Rates', 'Insurance', 'Licences & Permits', 'Security', 'Equipment Hire', 'Port & KPA Charges', 'Admin & Office', 'Professional Fees', 'Other'];
  const FIN = {
    receipts: { table: 'receipts', title: 'Receipt',
      cols: [['receipt_date', 'Date', 'date'], ['payer', 'Received From'], ['ref', 'Reference'], ['invoice_no', 'Invoice'], ['method', 'Method'], ['amount', 'Amount', 'money']],
      fields: [{ k: 'receipt_date', l: 'Date', t: 'date', r: 1, d: todayISO() }, { k: 'payer', l: 'Received From', r: 1 }, { k: 'amount', l: 'Amount (KSh)', t: 'number', r: 1 },
        { k: 'method', l: 'Method', t: 'select', o: ['M-Pesa', 'Bank Transfer', 'Cheque', 'Cash', 'RTGS/EFT'] }, { k: 'ref', l: 'Reference / Txn No.' }, { k: 'invoice_no', l: 'Invoice No.' }, { k: 'notes', l: 'Notes', t: 'textarea' }] },
    bills: { table: 'bills', title: 'Supplier Bill',
      cols: [['bill_date', 'Date', 'date'], ['supplier', 'Supplier'], ['bill_no', 'Bill No.'], ['category', 'Category'], ['due_date', 'Due', 'date'], ['amount', 'Amount', 'money'], ['status', 'Status', 'badge']],
      fields: [{ k: 'bill_date', l: 'Bill Date', t: 'date', r: 1, d: todayISO() }, { k: 'supplier', l: 'Supplier', r: 1 }, { k: 'bill_no', l: 'Bill / Invoice No.' }, { k: 'category', l: 'Category', t: 'select', o: FIN_CATS },
        { k: 'amount', l: 'Amount (KSh)', t: 'number', r: 1 }, { k: 'due_date', l: 'Due Date', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: ['unpaid', 'partial', 'paid'] }, { k: 'notes', l: 'Notes', t: 'textarea' }],
      rowActions: r => r.status !== 'paid' ? `<button class="action-btn ghost" onclick="finMarkPaid('${r.id}')">Mark paid</button> ` : '' },
    expenses: { table: 'expenses', title: 'Expense',
      cols: [['expense_date', 'Date', 'date'], ['category', 'Category'], ['description', 'Description'], ['paid_via', 'Paid Via'], ['amount', 'Amount', 'money'], ['status', 'Status', 'badge']],
      fields: [{ k: 'expense_date', l: 'Date', t: 'date', r: 1, d: todayISO() }, { k: 'category', l: 'Category', t: 'select', o: FIN_CATS }, { k: 'description', l: 'Description', r: 1 },
        { k: 'amount', l: 'Amount (KSh)', t: 'number', r: 1 }, { k: 'paid_via', l: 'Paid Via', t: 'select', o: ['Petty Cash', 'M-Pesa', 'Bank', 'Cheque'] }, { k: 'ref', l: 'Receipt / Ref No.' }],
      /* Status is not a form field: a new expense starts pending and is approved only through the buttons below.
         The database enforces who may approve (Finance Manager / Administrator; never your own entry when "separate approver" is on). */
      newDefaults: { status: 'pending' },
      rowActions: r => r.status === 'pending' && canApprove() ? `<button class="action-btn ghost" onclick="finDecide('${r.id}','approved')">✓ Approve</button><button class="action-btn ghost" onclick="finDecide('${r.id}','rejected')">✕ Reject</button> ` : '' },
    suppliers: { table: 'suppliers', title: 'Supplier',
      cols: [['name', 'Supplier'], ['contact', 'Contact'], ['phone', 'Phone'], ['email', 'Email'], ['kra_pin', 'KRA PIN'], ['payment_terms', 'Terms']],
      fields: [{ k: 'name', l: 'Supplier Name', r: 1 }, { k: 'contact', l: 'Contact Person' }, { k: 'phone', l: 'Phone' }, { k: 'email', l: 'Email', t: 'email' }, { k: 'kra_pin', l: 'KRA PIN' }, { k: 'payment_terms', l: 'Payment Terms', d: '30 days' }] },
  };
  Object.values(FIN).forEach(c => { c.host = 'financeBody'; c.kpiHost = 'financeKpis'; c.canEdit = () => canFinance(); c.canDelete = () => isAdmin(); c.refresh = () => renderFinance(window._finTab || 'overview'); });

  const FIN_KPI = {
    expenses: r => { const p = r.filter(x => x.status === 'pending'); return kpi('Awaiting Approval', p.length, HUB.money(p.reduce((s, x) => s + N(x.amount), 0)), p.length ? 'kpi-orange' : 'kpi-green') + kpi('Approved (MTD)', HUB.money(r.filter(x => x.status === 'approved' && x.expense_date >= monthStart()).reduce((s, x) => s + N(x.amount), 0)), '', 'kpi-blue'); },
    bills: r => { const t = todayISO(), o = r.filter(b => b.status !== 'paid'), od = o.filter(b => b.due_date && b.due_date < t); return kpi('Open Bills', o.length, HUB.money(o.reduce((s, b) => s + N(b.amount), 0)), 'kpi-gold') + kpi('Overdue', od.length, HUB.money(od.reduce((s, b) => s + N(b.amount), 0)), od.length ? 'kpi-red' : 'kpi-green'); },
  };

  const FIN_TABS = [['overview', 'Overview'], ['receipts', 'Receipts'], ['bills', 'Supplier Bills'], ['expenses', 'Expenses'], ['suppliers', 'Suppliers'], ['controls', 'Controls']];
  function finTabs(tab) {
    const el = document.getElementById('financeTabs'); if (!el) return;
    el.innerHTML = FIN_TABS.map(([id, l]) => `<button class="filter-btn${id === tab ? ' active' : ''}" onclick="renderFinance('${id}',this)">${l}</button>`).join('');
  }

  window.renderFinance = async function (tab) {
    tab = tab || 'overview'; window._finTab = tab; finTabs(tab);
    const body = document.getElementById('financeBody'), kp = document.getElementById('financeKpis');
    if (!body) return;
    if (!canFinance()) { if (kp) kp.innerHTML = ''; body.innerHTML = '<div class="ops-notice">The Finance Hub is restricted to the Finance Manager and Administrators.</div>'; return; }
    if (tab === 'controls') return finControls();
    if (tab !== 'overview') return HUB.render(FIN[tab], FIN_KPI[tab]);
    kp.innerHTML = ''; body.innerHTML = '<div class="hub-loading">Loading…</div>';
    const tok = ++HUB._tok;
    const [rc, bl, ex] = await Promise.all([HUB.load('receipts'), HUB.load('bills'), HUB.load('expenses')]);
    if (tok !== HUB._tok) return;
    const ms = monthStart(), sum = a => a.reduce((s, r) => s + N(r.amount), 0), counted = ex.filter(r => r.expense_date >= ms && r.status === 'approved');
    const rcM = sum(rc.filter(r => r.receipt_date >= ms)), exM = sum(counted), pend = ex.filter(r => r.status === 'pending');
    const open = bl.filter(b => b.status !== 'paid'), today = todayISO(), od = open.filter(b => b.due_date && b.due_date < today);
    kp.innerHTML = kpi('Receipts (MTD)', HUB.money(rcM), '', 'kpi-green') + kpi('Approved Expenses (MTD)', HUB.money(exM), 'Pending ones are not counted', 'kpi-orange') +
      kpi('Net Cash (MTD)', HUB.money(rcM - exM), 'Receipts − approved expenses', rcM - exM >= 0 ? 'kpi-blue' : 'kpi-red') +
      kpi('Bills Payable', HUB.money(sum(open)), `${open.length} open`, 'kpi-gold') + kpi('Overdue Bills', od.length, HUB.money(sum(od)), od.length ? 'kpi-red' : 'kpi-green') +
      kpi('Awaiting Approval', pend.length, HUB.money(sum(pend)), pend.length ? 'kpi-orange' : 'kpi-green');
    const byCat = {}; counted.forEach(r => { const k = r.category || 'Other'; byCat[k] = (byCat[k] || 0) + N(r.amount); });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const empty = (n, t) => `<tr><td colspan="${n}" style="text-align:center;color:var(--text-3);padding:20px">${t}</td></tr>`;
    body.innerHTML = `<div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr><th>Bills due soonest</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead><tbody>${
      open.sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9')).slice(0, 8).map(b => `<tr><td>${esc(b.supplier)}</td><td>${HUB.date(b.due_date)}</td><td>${HUB.money(b.amount)}</td><td>${badge(b.due_date && b.due_date < today ? 'overdue' : b.status)}</td></tr>`).join('') || empty(4, 'No open bills')}</tbody></table></div>
      <div class="table-wrap" style="margin-top:14px;overflow-x:auto"><table class="data-table"><thead><tr><th>Approved expenses by category (this month)</th><th>Amount</th></tr></thead><tbody>${
      cats.map(([c, v]) => `<tr><td>${esc(c)}</td><td>${HUB.money(v)}</td></tr>`).join('') || empty(2, 'No approved expenses this month')}</tbody></table></div>
      <p style="color:var(--text-3);font-size:12px;margin-top:10px">Customer invoices and billing rates are managed under <b>Invoicing</b>.</p>`;
  };

  /* ── actions ── */
  window.finDecide = async function (id, status) {
    const rec = (HUB.rows.expenses || []).find(x => x.id === id); if (!rec) return;
    if (status === 'approved') { const m = await approvalBlock(rec, rec.amount); if (m) return toast(m, 'error', 5000); }
    else if (!canApprove()) return toast('Only the Finance Manager or an Administrator can decide on expenses.', 'error');
    const { error } = await supabase.from('expenses').update({ status }).eq('id', id);
    if (error) return toast(error.message, 'error', 5000);
    addAudit(state.profile?.username, status === 'approved' ? 'Expense approved' : 'Expense rejected', `${rec.description} · KSh ${N(rec.amount).toLocaleString('en-KE')}`);
    toast(status === 'approved' ? 'Expense approved' : 'Expense rejected', 'success'); renderFinance('expenses');
  };
  window.finMarkPaid = async function (id) {
    if (!canFinance()) return;
    const rec = (HUB.rows.bills || []).find(x => x.id === id); if (!rec) return;
    if (!confirm(`Mark the bill from ${rec.supplier} (${HUB.money(rec.amount)}) as paid?`)) return;
    const { error } = await supabase.from('bills').update({ status: 'paid' }).eq('id', id);
    if (error) return toast(error.message, 'error');
    addAudit(state.profile?.username, 'Bill paid', `${rec.supplier} · ${HUB.money(rec.amount)}`);
    toast('Bill marked as paid', 'success'); renderFinance('bills');
  };

  /* ── Controls: approval policy ── */
  async function finControls() {
    const kp = document.getElementById('financeKpis'), body = document.getElementById('financeBody'); kp.innerHTML = '';
    const { data: s, error } = await supabase.from('finance_settings').select('*').eq('id', 1).single();
    if (error) { body.innerHTML = `<div class="ops-notice">${esc(error.message)}</div>`; return; }
    const adm = isAdmin(), dis = adm ? '' : 'disabled';
    body.innerHTML = `<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">Approval controls</div><div class="filter-row">${adm ? '<button class="action-btn" onclick="finSaveControls()">Save</button>' : ''}</div></div>
      ${adm ? '' : '<div class="ops-notice" style="margin-bottom:10px">Only an administrator can change these.</div>'}
      <div class="hr-grid"><div class="hr-card"><h4>Approval rules</h4>
        <div class="fg"><label>Administrator-only above (KSh, 0 = no limit)</label><input id="fc_limit" type="number" min="0" value="${N(s.approval_limit)}" ${dis}></div>
        <div class="fg"><label>Nobody approves their own entry (administrators excepted)</label><select id="fc_sep" ${dis}><option value="false" ${s.separate_approver ? '' : 'selected'}>Off</option><option value="true" ${s.separate_approver ? 'selected' : ''}>On</option></select></div></div></div>
      <p style="color:var(--text-3);font-size:12px">Only the Finance Manager and Administrators can approve money (expenses, payroll). HR prepares payroll; Finance approves it. With "nobody approves their own entry" on, a Finance user cannot approve what they entered themselves. Keep it on. The database enforces these rules, not just this screen.</p>`;
  }
  window.finSaveControls = async function () {
    if (!isAdmin()) return;
    const u = { approval_limit: Math.max(0, N(document.getElementById('fc_limit').value)), separate_approver: document.getElementById('fc_sep').value === 'true', updated_at: new Date().toISOString() };
    const { error } = await supabase.from('finance_settings').update(u).eq('id', 1);
    if (error) return toast(error.message, 'error');
    POLICY.loaded = false; addAudit(state.profile?.username, 'Finance controls changed', JSON.stringify(u).slice(0, 180));
    toast('Controls saved', 'success'); finControls();
  };
})();