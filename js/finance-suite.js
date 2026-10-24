'use strict';
/* Gargo Finance Suite. Loads AFTER finance.js and hr.js.
   Adds to the Finance Hub (through GARGO_FIN.add, so finance.js stays the single owner of renderFinance):
     Reports            period reports pulled on demand (revenue, VAT, payroll, expenses, payables, ops costs)
     Ops Cost Posting   workshop jobs, requisitions, fuel and repairs flow into Expenses, one item at a time
     People Directory   every employee with login, driver link, payslip, loan and bank status
   and richer Receipt / Bill / Expense forms (cost centre, VAT, withholding tax, revenue stream, related employee).
   Heavy lifting is done by database functions (fin_report, fin_unposted, fin_post_cost, fin_post_all, fin_people,
   hr_sync_people). They re-check the caller's role, so this file only presents results. */
(function () {
  const F = window.GARGO_FIN, H = window.GARGO_HUB;
  if (!F || !H) { console.error('finance-suite.js needs finance.js to load first'); return; }

  const $ = id => document.getElementById(id), N = v => Number(v || 0), M = n => H.money(n);
  const A = x => (Array.isArray(x) ? x : []);
  const pad = n => String(n).padStart(2, '0'), ld = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const who = () => state.profile?.username;
  const hrOk = () => typeof hrCan === 'function' && hrCan();

  const row = (l, v) => `<div class="hr-row"><span>${l}</span><b>${v}</b></div>`;
  const card = (t, s, b) => `<div class="hr-card"><h4>${t} <small>${s || ''}</small></h4>${b}</div>`;
  const btn = (l, fn, primary) => `<button class="action-btn${primary ? '' : ' ghost'}" onclick="${fn}">${l}</button>`;
  const head = (t, x) => `<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">${t}</div><div class="filter-row">${x || ''}</div></div>`;
  const tbl = (h, rows, empty) => `<div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${
    rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${h.length}" style="text-align:center;color:var(--text-3);padding:22px">${empty || 'No records'}</td></tr>`}</tbody></table></div>`;
  const bars = a => { a = A(a); const mx = Math.max(1, ...a.map(x => N(x[1])));
    return a.slice(0, 10).map(([l, v]) => `<div style="padding:5px 0"><div class="hr-row" style="border:0;padding:0"><span>${esc(l)}</span><b>${M(v)}</b></div><div class="hr-bar"><i style="width:${Math.round(N(v) / mx * 100)}%"></i></div></div>`).join('')
      || '<div style="color:var(--text-3);padding:8px 0">No data in range</div>'; };
  const kpis = html => { const k = $('financeKpis'); if (k) k.innerHTML = html; };
  const body = html => { const b = $('financeBody'); if (b) b.innerHTML = html; };
  const loading = t => body(`<div class="hub-loading">${t || 'Loading…'}</div>`);

  /* database function call: offline check, timeout, readable errors. Returns null on failure (and tells the user). */
  async function rpc(fn, args) {
    if (!navigator.onLine) { toast('You are offline. This needs a connection.', 'error'); return null; }
    try {
      const { data, error } = await H.withTimeout(supabase.rpc(fn, args || {}));
      if (error) { toast(H.friendlyError(error), 'error', 5000); return null; }
      return data === undefined ? null : data;
    } catch (e) { toast(H.friendlyError(e), 'error', 5000); return null; }
  }

  const STREAMS = ['LOLO', 'Storage', 'Transport', 'Service Charge', 'Reefer', 'Washing', 'Weighbridge', 'Other'];
  const TYPE_LABEL = { workshop: 'Workshop', requisition: 'Requisition', fuel: 'Fuel', maintenance: 'Maintenance', repair: 'Container repair' };

  /* Finance users cannot read the employees table (by design): give them the safe directory instead. */
  const _loadEmp = H.loadEmployees.bind(H);
  H.loadEmployees = async function () {
    if (isAdmin() || hrOk()) return _loadEmp();
    const d = await rpc('fin_people'), rows = A(d && d.employees);
    this.emp = Object.fromEntries(rows.map(e => [e.id, e])); this.rows.employees = rows; return rows;
  };

  /* ───────────── richer finance forms ───────────── */
  (function extendForms() {
    const FIN = F.FIN, depts = typeof HR_DEPTS !== 'undefined' ? HR_DEPTS : [];
    const cc = { k: 'cost_centre', l: 'Cost Centre', t: 'select', o: [''].concat(depts) };
    const tax = (k, l) => ({ k, l, t: 'number', d: 0, money: true, min: 0, max: 1e9 });
    FIN.expenses.fields.push(cc, { k: 'employee_id', l: 'Related Employee', t: 'emp' }, tax('vat_amount', 'VAT included (KSh)'), tax('wht_amount', 'Withholding tax (KSh)'));
    FIN.expenses.cols.splice(2, 0, ['cost_centre', 'Cost Centre']); FIN.expenses.needsEmp = true;
    FIN.bills.fields.push(cc, tax('vat_amount', 'VAT included (KSh)'), tax('wht_amount', 'Withholding tax (KSh)'));
    FIN.bills.cols.splice(3, 0, ['cost_centre', 'Cost Centre']);
    FIN.receipts.fields.push({ k: 'stream', l: 'Revenue Stream', t: 'select', o: [''].concat(STREAMS) }, tax('vat_amount', 'VAT included (KSh)'));
    FIN.receipts.cols.splice(2, 0, ['stream', 'Stream']);
    const taxCheck = r => {
      r.vat_amount = r.vat_amount ?? 0; if ('wht_amount' in r) r.wht_amount = r.wht_amount ?? 0;
      if (N(r.vat_amount) > N(r.amount)) return 'VAT cannot be more than the amount';
      if (N(r.wht_amount) > N(r.amount)) return 'Withholding tax cannot be more than the amount';
      return '';
    };
    ['receipts', 'bills', 'expenses'].forEach(k => { const c = FIN[k], prev = c.beforeSave; c.beforeSave = r => (prev ? prev(r) : '') || taxCheck(r); });
  })();

  /* ═════════ REPORTS ═════════ */
  const REP = { from: '', to: '', dept: '', cat: '', scope: 'full' }; let repCsv = null;
  const opt = (a, v) => a.map(x => `<option value="${esc(x)}" ${x === v ? 'selected' : ''}>${esc(x || 'All')}</option>`).join('');

  async function finReports() {
    if (!canFinance()) return body('<div class="ops-notice">Finance reports are restricted to Finance and Administrators.</div>');
    if (!REP.from) { const n = new Date(); REP.from = ld(new Date(n.getFullYear(), n.getMonth(), 1)); REP.to = ld(n); }
    const depts = typeof HR_DEPTS !== 'undefined' ? HR_DEPTS : [];
    body(`${card('Report Centre', 'choose a period, then pull the report', `
      <div class="erp-tools"><input type="date" id="rf_from" value="${esc(REP.from)}" title="From"><input type="date" id="rf_to" value="${esc(REP.to)}" title="To">
        <select id="rf_dept" title="Cost centre / department">${opt([''].concat(depts), REP.dept)}</select>
        <select id="rf_cat" title="Expense category">${opt([''].concat(F.FIN_CATS), REP.cat)}</select>
        <select id="rf_scope">${[['full', 'Full summary'], ['revenue', 'Revenue & VAT'], ['payroll', 'Payroll'], ['expenses', 'Expenses'], ['payables', 'Payables'], ['ops', 'Workshop, requisitions, fuel']].map(([v, l]) => `<option value="${v}" ${v === REP.scope ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="filter-row" style="margin-top:8px">${[['month', 'This month'], ['last', 'Last month'], ['qtr', 'This quarter'], ['ytd', 'Year to date']].map(([k, l]) => btn(l, `fsPreset('${k}')`)).join('')}${btn('Pull report', 'fsPull()', true)}</div>`)}
      <div id="repOut"><div class="empty-state" style="padding:40px"><div class="empty-state-label">Nothing is shown until you pull a report.</div></div></div>`);
  }
  window.fsPreset = k => {
    const n = new Date(), y = n.getFullYear(), m = n.getMonth(), q = Math.floor(m / 3) * 3;
    const r = { month: [new Date(y, m, 1), n], last: [new Date(y, m - 1, 1), new Date(y, m, 0)], qtr: [new Date(y, q, 1), n], ytd: [new Date(y, 0, 1), n] }[k]; if (!r) return;
    $('rf_from').value = ld(r[0]); $('rf_to').value = ld(r[1]);
  };
  let pulling = false;
  window.fsPull = async () => {
    if (pulling) return;
    const from = $('rf_from').value, to = $('rf_to').value, dept = $('rf_dept').value, cat = $('rf_cat').value, scope = $('rf_scope').value, out = $('repOut');
    if (!from || !to || from > to) return toast('Choose a valid From and To date, then pull the report', 'error');
    Object.assign(REP, { from, to, dept, cat, scope });
    pulling = true; out.innerHTML = '<div class="hub-loading">Pulling report…</div>';
    try {
      const d = await rpc('fin_report', { p_from: from, p_to: to, p_dept: dept || null, p_cat: cat || null });
      if (!d) { out.innerHTML = ''; return; }
      const rv = d.revenue || {}, ex = d.expenses || {}, py = d.payroll || {}, bl = d.bills || {}, ops = A(d.ops);
      const unposted = Math.max(0, N(py.gross) - N(ex.salaries_posted)), opsOpen = ops.reduce((s, o) => s + N(o.total) - N(o.posted), 0);
      const net = N(rv.total) - N(ex.total) - unposted, sc = s => scope === 'full' || scope === s, P = [];
      const csv = [], add = (s, a) => A(a).forEach(([l, v]) => csv.push([s, l, v]));
      kpis(H.kpi('Revenue', M(rv.total), `${N(rv.count)} receipts`, 'kpi-green') + H.kpi('Operating Expenses', M(ex.total), `${N(ex.count)} entries`, 'kpi-orange') +
        H.kpi('Payroll (approved/paid)', M(py.gross), `${N(py.count)} payslips · ${N(py.drafts)} draft`, 'kpi-blue') +
        H.kpi('Net Result', dept ? 'n/a' : M(net), dept ? 'Revenue is not split by department' : 'After unposted payroll', net >= 0 || dept ? 'kpi-green' : 'kpi-red') +
        H.kpi('Open Payables', M(bl.open), `${N(bl.overdue_count)} overdue`, N(bl.overdue_count) ? 'kpi-red' : 'kpi-gold') +
        H.kpi('Not Yet Posted', M(opsOpen), 'Workshop · reqs · fuel · maint.', opsOpen ? 'kpi-orange' : 'kpi-green'));
      add('Revenue by stream', rv.by_stream); add('Payroll by department', py.by_dept); add('Expenses by category', ex.by_category);
      add('Expenses by cost centre', ex.by_cost_centre); add('Open payables by supplier', bl.by_supplier);
      if (sc('revenue')) P.push(
        card('Revenue by stream', 'receipts', row('Total received', M(rv.total)) + bars(rv.by_stream)),
        card('VAT & withholding', 'from entries in range', row('VAT on receipts', M(rv.vat)) + row('VAT on expenses (input)', M(ex.vat)) + row('Withholding tax on expenses', M(ex.wht)) +
          '<div style="height:6px"></div>' + (A(d.invoiced).map(i => row(`Invoiced ${esc(i.currency)}`, `${Math.round(N(i.total)).toLocaleString('en-KE')} <small>(VAT ${Math.round(N(i.vat)).toLocaleString('en-KE')})</small>`)).join('') || row('Invoiced', '—'))));
      if (sc('payroll')) P.push(
        card('Payroll', `${from.slice(0, 7)} → ${to.slice(0, 7)}`, row('Gross', M(py.gross)) + row('PAYE', M(py.paye)) + row('NSSF', M(py.nssf)) + row('SHIF', M(py.shif)) + row('Housing levy', M(py.housing)) + row('Net pay', M(py.net)) +
          row('Posted to expenses', M(ex.salaries_posted)) + row('Not yet posted', `<span style="color:${unposted ? 'var(--amber)' : 'var(--green)'}">${M(unposted)}</span>`) + (N(py.drafts) ? row('Draft payslips (excluded)', N(py.drafts)) : '')),
        card('Payroll by department', 'gross', bars(py.by_dept)));
      if (sc('expenses')) P.push(
        card('Expenses by category', M(ex.total), bars(ex.by_category)), card('Expenses by cost centre', 'department', bars(ex.by_cost_centre)),
        card('Payment & approval', '', A(ex.by_method).map(([l, v]) => row(esc(l), M(v))).join('') + row('Awaiting approval', M(ex.pending))));
      if (sc('payables')) P.push(
        card('Payables', 'bills dated in range', row('Open', `${M(bl.open)} <small>(${N(bl.open_count)})</small>`) + row('Overdue', `${M(bl.overdue)} <small>(${N(bl.overdue_count)})</small>`) + row('Paid', M(bl.paid))),
        card('Open by supplier', '', bars(bl.by_supplier)));
      if (sc('ops')) P.push(card('Operations costs → Finance', 'in range', ops.map(o => row(`${esc(TYPE_LABEL[o.type] || o.type)} <small>(${N(o.count)})</small>`, `${M(o.total)} <small>· ${M(N(o.total) - N(o.posted))} unposted</small>`)).join('') +
        `<p style="margin-top:10px">${btn('Open posting queue', "renderFinance('postq')")}</p>`));
      if (scope === 'full') P.push(`<div style="grid-column:1/-1">${tbl(['Month', 'Revenue', 'Expenses', 'Payroll gross', 'Revenue − expenses'],
        A(d.trend).map(t => { csv.push(['Monthly revenue − expenses', t.m, N(t.revenue) - N(t.expenses)]); return [esc(t.m), M(t.revenue), M(t.expenses), M(t.payroll), `<b>${M(N(t.revenue) - N(t.expenses))}</b>`]; }), 'No months in range')}</div>`);
      repCsv = { name: `finance-report_${from}_${to}.csv`, rows: csv };
      out.innerHTML = head(`Report: ${esc(from)} → ${esc(to)}${dept ? ' · ' + esc(dept) : ''}${cat ? ' · ' + esc(cat) : ''}`, btn('⬇ Export CSV', 'fsExport()')) + `<div class="hr-grid">${P.join('')}</div>`;
      /* the fin_report function writes its own audit-log entry, so none is added here */
    } finally { pulling = false; }
  };
  window.fsExport = () => { if (!repCsv) return; H.downloadCSV(repCsv.name, ['Section', 'Item', 'Amount'], repCsv.rows); addAudit(who(), 'Exported finance report', repCsv.name); };

  /* ═════════ OPS COST POSTING ═════════ */
  let todo = [];
  async function finPostQ() {
    if (!canFinance()) return body('<div class="ops-notice">Cost posting is restricted to Finance and Administrators.</div>');
    loading();
    const [t, ex] = await Promise.all([rpc('fin_unposted'), H.load('expenses')]);
    if (!t) return body('<div class="ops-notice">Could not load the posting queue. <button class="action-btn" style="margin-left:8px" onclick="renderFinance(\'postq\')">Retry</button></div>');
    todo = A(t); const done = ex.filter(x => x.source_type).slice(0, 60), sum = todo.reduce((s, i) => s + N(i.amount), 0);
    kpis(H.kpi('Awaiting Posting', todo.length, M(sum), todo.length ? 'kpi-orange' : 'kpi-green') + H.kpi('Posted (recent)', done.length, 'Linked to expenses', 'kpi-blue') +
      H.kpi('Pending Approval', done.filter(x => x.status === 'pending').length, 'Posted costs awaiting sign-off', 'kpi-gold'));
    body(head('Workshop, requisition, fuel & maintenance costs → Finance', todo.length ? btn(`Post all (${todo.length})`, 'fsPostAll()', true) : '') +
      tbl(['Source', 'Date', 'Raised by', 'Description', 'Category', 'Cost centre', 'Amount', ''],
        todo.map(i => [esc(TYPE_LABEL[i.type] || i.type), H.date(i.date), esc(i.who || '—'), esc(i.desc), esc(i.category), esc(i.cost_centre || '—'), M(i.amount), btn('Post', `fsPost('${esc(i.type)}','${esc(i.id)}')`)]),
        'Everything completed or approved has been posted') +
      '<div style="height:14px"></div>' + head('Recently posted') +
      tbl(['Date', 'Source', 'Description', 'Amount', 'Status'], done.map(x => [H.date(x.expense_date), esc(TYPE_LABEL[x.source_type] || x.source_type), esc(x.description), M(x.amount), H.badge(x.status)]), 'Nothing posted yet') +
      '<p style="color:var(--text-3);font-size:12px;margin-top:10px">Posted costs arrive in Expenses as <b>pending</b> for approval. The database guarantees each job, requisition, fuel log or repair can only be posted once.</p>');
  }
  const posting = new Set();
  window.fsPost = async (type, id) => {
    if (posting.has(id)) return; posting.add(id);
    try { if (await rpc('fin_post_cost', { p_type: type, p_id: id }) !== null) { addAudit(who(), 'Cost posted', `${type} ${id}`); toast('Posted to Expenses (pending approval)', 'success'); } }
    finally { posting.delete(id); finPostQ(); }
  };
  window.fsPostAll = async () => {
    if (posting.has('*') || !todo.length) return;
    if (!confirm(`Post ${todo.length} items (${M(todo.reduce((s, i) => s + N(i.amount), 0))}) to Expenses as pending?`)) return;
    posting.add('*');
    try { const n = await rpc('fin_post_all'); if (n !== null) { addAudit(who(), 'Costs posted (all)', `${n} items`); toast(`${n} items posted`, 'success'); } }
    finally { posting.delete('*'); finPostQ(); }
  };

  /* ═════════ PEOPLE DIRECTORY ═════════ */
  async function finPeople() {
    loading();
    const d = await rpc('fin_people');
    if (!d) return body('<div class="ops-notice">Could not load the directory. <button class="action-btn" style="margin-left:8px" onclick="renderFinance(\'people\')">Retry</button></div>');
    const E = A(d.employees), act = E.filter(e => e.status !== 'exited'), up = A(d.unlinked_profiles), ud = A(d.unlinked_drivers), stale = A(d.stale_access);
    const noBank = act.filter(e => !e.has_bank), noPay = act.filter(e => !e.payslip), gaps = up.length + ud.length;
    kpis(H.kpi('Employees', act.length, 'Active in HR', 'kpi-blue') + H.kpi('Logins Without HR Record', up.length, '', up.length ? 'kpi-orange' : 'kpi-green') +
      H.kpi('Drivers Without HR Record', ud.length, '', ud.length ? 'kpi-orange' : 'kpi-green') + H.kpi('No Bank Details', noBank.length, 'Cannot be paid', noBank.length ? 'kpi-red' : 'kpi-green') +
      H.kpi(`No ${esc(d.month || '')} Payslip`, noPay.length, 'Payroll gaps', noPay.length ? 'kpi-orange' : 'kpi-green') + H.kpi('Exited, Login Active', stale.length, 'Revoke access', stale.length ? 'kpi-red' : 'kpi-green'));
    body(head('People Directory', hrOk() && gaps ? btn(`Link missing (${gaps})`, 'fsSync()', true) : '') +
      (stale.length ? `<div class="ops-notice" style="margin-bottom:10px">Exited staff whose login is still active: ${stale.map(esc).join(', ')}. Deactivate them under User Management.</div>` : '') +
      tbl(['Staff No.', 'Name', 'Department', 'Role', 'System login', 'Driver', `Payslip ${esc(d.month || '')}`, 'Loan balance', 'Surveys', 'Bank'],
        E.map(e => [esc(e.staff_no || '—'), esc(e.full_name), esc(e.department || '—'), esc(e.job_title || '—'),
          e.login_role ? `${esc(roleLabel(e.login_role))}${e.login_active === false ? ' <span class="hb hb-r">off</span>' : ''}` : '—', esc(e.driver || '—'),
          e.payslip ? H.badge(e.payslip) : '—', N(e.loan_balance) ? M(e.loan_balance) : '—', e.surveys || '—', e.has_bank ? '✓' : '<span class="hb hb-r">missing</span>']), 'No employees yet') +
      '<p style="color:var(--text-3);font-size:12px;margin-top:10px">New system users and drivers get an HR record automatically. Surveyors are the staff who sign depot surveys, and the Surveys column counts theirs.</p>');
  }
  window.fsSync = async () => {
    if (!hrOk()) return;
    if (!confirm('Create HR records for logins and drivers that have none, and link existing matches?')) return;
    const r = await rpc('hr_sync_people');
    if (r) { addAudit(who(), 'People sync', `${N(r.created)} created, ${N(r.linked)} linked`); toast(`${N(r.created)} created, ${N(r.linked)} linked`, 'success'); finPeople(); }
  };

  F.add('reports', 'Reports', finReports);
  F.add('postq', 'Ops Cost Posting', finPostQ);
  F.add('people', 'People Directory', finPeople);
})();
