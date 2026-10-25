'use strict';
/* Gargo ERP layer. Loads after finance.js, hr.js and finance-suite.js (uses GARGO_HUB / GARGO_FIN).
   HR: employee database, 360° profile, org chart, loans & advances (recovered through payroll), onboarding / exit
       checklists, public holidays, HR analytics, payroll posting to Finance.
   Finance: receivables from Invoicing, petty cash ledger, bank reconciliation, fleet running costs, budgets,
       supplier statements, cash-flow chart on the overview.
   Also: HR / Finance counters on the main dashboard and staff in global search.
   Approval rules and ledger posting are enforced by the database; this file only presents them. */
(function () {
  const H = GARGO_HUB, F = GARGO_FIN, FIN = F.FIN, FIN_CATS = F.FIN_CATS, $ = id => document.getElementById(id), T = () => today10(), M = n => H.money(n), N = v => Number(v || 0);
  const sbadge = s => H.badge(s);
  /* May this person post straight to "approved"? (administrator, or a Finance Manager inside the limit when they did not enter it) */
  const postingStatus = async amount => { const why = await F.approvalBlock({ created_by: state.profile?.id || null }, amount); return why ? 'pending' : 'approved'; };
  let _fx = 0;
  const fxRate = async () => { if (_fx) return _fx; try { const { data } = await supabase.from('finance_settings').select('usd_kes').eq('id', 1).maybeSingle(); _fx = N(data && data.usd_kes) || 129; } catch (e) { _fx = 129; } return _fx; };
  const S = (a, k) => a.reduce((s, r) => s + Number(r[k] || 0), 0), uid = () => state.profile?.id || null, who = () => state.profile?.username;
  const digits = s => String(s || '').replace(/\D/g, '').slice(-9), low = s => String(s || '').trim().toLowerCase();
  const ago = n => { const d = new Date(Date.now() - n * 864e5), p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }, dRows = () => state.db.drivers || [];
  const mk = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const months = n => [...Array(n)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (n - 1 - i)); return mk(d); });
  const empty = t => `<tr><td colspan="99" style="text-align:center;color:var(--text-3);padding:22px">${t || 'No records'}</td></tr>`;
  const tbl = (h, rows, e) => `<div class="table-wrap"><table class="data-table"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : empty(e)}</tbody></table></div>`;
  const bar = (l, v, mx, r) => `<div style="padding:5px 0"><div class="hr-row" style="border:0;padding:0"><span>${l}</span><b>${r ?? v}</b></div><div class="hr-bar"><i style="width:${Math.round(v / (mx || 1) * 100)}%"></i></div></div>`;
  const driverOf = e => dRows().find(d => e.driver_id && d.id === e.driver_id) || dRows().find(d => (d.idNo && e.id_no && String(d.idNo) === String(e.id_no)) || (digits(d.phone) && digits(d.phone) === digits(e.phone)) || (low(d.name) && low(d.name) === low(e.full_name)));
  const exp = v => H.cell({ x: v }, ['x', '', 'expiry']);
  const sb = (t, id, f, v, l, a) => `<button class="action-btn ghost" onclick="erpSet('${t}','${id}','${f}','${v}','${a}')">${l}</button> `;
  const title = (t, extra) => `<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">${t}</div><div class="filter-row">${extra || ''}</div></div>`;
  const fbtn = (l, fn) => `<button class="action-btn ghost" onclick="${fn}">${l}</button>`;
  const base = { host: 'hrBody', kpiHost: 'hrKpis', canEdit: hrCan, canDelete: isAdmin, refresh: () => renderHR(window._hrTab) };

  window.erpSet = async (table, id, f, v, area) => {
    if (!(area === 'fin' ? canFinance() : hrCan())) return toast('Not permitted', 'error');
    if (['expenses', 'payroll', 'bills', 'receipts'].includes(table)) return toast('Money records are decided through their own approval buttons.', 'error');
    const { data, error } = await supabase.from(table).update({ [f]: v }).eq('id', id).select('id');
    if (error) return toast(H.friendlyError(error), 'error', 5000);
    if (Array.isArray(data) && !data.length) return toast('Nothing was changed. The record may be gone, or you may not have permission.', 'error', 5000);
    addAudit(who(), 'Update ' + table, `${id}: ${f}=${v}`); toast('Updated', 'success');
    area === 'fin' ? renderFinance(window._finTab) : renderHR(window._hrTab);
  };
  /* Approve / reject a pending expense (petty cash voucher). Re-reads the record first, same rules as the Expenses tab. */
  window.erpDecide = async (id, status) => {
    if (!canApprove()) return toast('Only the Finance Manager or an Administrator can decide on expenses.', 'error');
    if (!navigator.onLine) return toast('You are offline. Approvals need a connection.', 'error');
    const { data: rec, error: e0 } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();
    if (e0) return toast(H.friendlyError(e0), 'error', 5000);
    if (!rec || rec.status !== 'pending') { toast('This voucher was already decided, or no longer exists.', 'info'); return finPetty(); }
    if (status === 'approved') { const why = await F.approvalBlock(rec, rec.amount); if (why) return toast(why, 'error', 5000); }
    const { data, error } = await supabase.from('expenses').update({ status }).eq('id', id).eq('status', 'pending').select('id');
    if (error) return toast(H.friendlyError(error), 'error', 5000);
    if (Array.isArray(data) && !data.length) return toast('Someone else already decided on this voucher, or you are not allowed to change it.', 'error', 5000);
    addAudit(who(), status === 'approved' ? 'Expense approved' : 'Expense rejected', `${rec.description} · ${M(rec.amount)}`);
    toast(status === 'approved' ? 'Voucher approved' : 'Voucher rejected', 'success'); finPetty();
  };
  const dbtn = (id, s, l) => `<button class="action-btn ghost" onclick="erpDecide('${id}','${s}')">${l}</button> `;

  /* ═════════ HR: new modules ═════════ */
  const ON = ['Contract signed', 'KRA / NSSF / SHA registered', 'Bank details captured', 'PPE & uniform issued', 'Induction & safety briefing', 'Port pass applied', 'System access created'];
  const EX = ['Resignation / termination letter', 'Handover completed', 'Assets returned', 'Access revoked', 'Final dues computed', 'Exit interview', 'Clearance certificate'];
  HR.loans = Object.assign({ table: 'staff_loans', title: 'Loan / Advance', needsEmp: true,
    cols: [['employee_id', 'Employee', 'emp'], ['loan_type', 'Type'], ['issued_on', 'Issued', 'date'], ['amount', 'Amount', 'money'], ['instalment', 'Monthly Instalment', 'money'], ['balance', 'Balance', 'money'], ['status', 'Status', 'badge']],
    fields: [{ k: 'employee_id', l: 'Employee', t: 'emp', r: 1 }, { k: 'loan_type', l: 'Type', t: 'select', o: ['Salary advance', 'Staff loan', 'Emergency loan'] }, { k: 'amount', l: 'Amount (KSh)', t: 'number', r: 1 },
      { k: 'instalment', l: 'Monthly instalment', t: 'number', r: 1 }, { k: 'balance', l: 'Outstanding balance', t: 'number' }, { k: 'issued_on', l: 'Issued On', t: 'date', d: T() }, { k: 'status', l: 'Status', t: 'select', o: ['active', 'cleared'] }],
    beforeSave: r => { if (r.balance == null) r.balance = r.amount; return null; } }, base);
  HR.lifecycle = Object.assign({ table: 'lifecycle_tasks', title: 'Lifecycle Task', needsEmp: true,
    cols: [['employee_id', 'Employee', 'emp'], ['kind', 'Process'], ['task', 'Task'], ['due_date', 'Due', 'date'], ['status', 'Status', 'badge']],
    fields: [{ k: 'employee_id', l: 'Employee', t: 'emp', r: 1 }, { k: 'kind', l: 'Process', t: 'select', o: ['Onboarding', 'Exit'] }, { k: 'task', l: 'Task', t: 'select', o: ON.concat(EX) }, { k: 'due_date', l: 'Due', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: ['pending', 'done'] }],
    rowActions: r => r.status === 'pending' ? sb('lifecycle_tasks', r.id, 'status', 'done', '✓ Done', 'hr') : '',
    extra: () => fbtn('+ Onboarding checklist', "erpLifecycle('Onboarding')") + fbtn('+ Exit checklist', "erpLifecycle('Exit')") }, base);
  HR.holidays = Object.assign({ table: 'holidays', title: 'Public Holiday',
    cols: [['holiday_date', 'Date', 'date'], ['name', 'Holiday'], ['kind', 'Type']],
    fields: [{ k: 'name', l: 'Holiday', r: 1 }, { k: 'holiday_date', l: 'Date', t: 'date', r: 1 }, { k: 'kind', l: 'Type', t: 'select', o: ['Public', 'Company'] }],
    extra: () => fbtn('Load Kenya fixed holidays', 'erpHolidays()') }, base);
  HR_KPI.loans = r => { const a = r.filter(l => l.status === 'active'); return hrK('Active Loans', a.length, '', 'kpi-blue') + hrK('Outstanding', M(S(a, 'balance')), '', 'kpi-orange') + hrK('Monthly Recovery', M(S(a, 'instalment')), 'Deducted at payroll', 'kpi-gold'); };
  HR_KPI.lifecycle = r => hrK('Onboarding Open', r.filter(x => x.kind === 'Onboarding' && x.status === 'pending').length, '', 'kpi-blue') + hrK('Exit Open', r.filter(x => x.kind === 'Exit' && x.status === 'pending').length, '', 'kpi-orange') + hrK('Completed', r.filter(x => x.status === 'done').length, '', 'kpi-green');
  HR_KPI.holidays = r => { const n = r.filter(h => h.holiday_date >= T()).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))[0]; return hrK('This Year', r.filter(h => String(h.holiday_date).startsWith(String(new Date().getFullYear()))).length, '', 'kpi-gold') + hrK('Next Holiday', n ? n.name : '—', n ? fmtDate(n.holiday_date) : '', 'kpi-blue'); };
  HR_TABS.length = 0;
  [['overview', 'Overview'], ['directory', 'Employee Database'], ['employees', 'Manage Records'], ['orgchart', 'Org Chart'], ['leave', 'Leave'], ['attendance', 'Attendance'], ['payroll', 'Payroll'], ['loans', 'Loans & Advances'], ['compliance', 'Licences & Compliance'],
    ['recruitment', 'Recruitment'], ['lifecycle', 'Onboarding & Exit'], ['performance', 'Performance'], ['training', 'Training'], ['discipline', 'Discipline'], ['assets', 'Assets & PPE'], ['holidays', 'Holidays'], ['reports', 'HR Reports']].forEach(t => HR_TABS.push(t));
  const _pe = HR.payroll.extra; HR.payroll.extra = () => _pe() + (canFinance() ? fbtn('→ Post to Finance', 'erpPostPayroll()') : '');

  window.erpLifecycle = async kind => {
    if (!hrCan()) return; const no = prompt('Staff No. of the employee'); if (!no) return;
    const e = Object.values(await (async () => (await H.loadEmployees(), H.emp))()).find(x => low(x.staff_no) === low(no)); if (!e) return toast('Staff No. not found', 'error');
    const rows = (kind === 'Exit' ? EX : ON).map(task => ({ employee_id: e.id, kind, task, due_date: T(), status: 'pending', created_by: uid() }));
    const { error } = await supabase.from('lifecycle_tasks').insert(rows); if (error) return toast(error.message, 'error');
    addAudit(who(), kind + ' started', e.full_name); toast(`${kind} checklist created for ${e.full_name}`, 'success'); renderHR('lifecycle');
  };
  window.erpHolidays = async () => {
    const y = new Date().getFullYear(), have = new Set((await H.load('holidays')).map(h => h.holiday_date));
    const rows = [['New Year\'s Day', '01-01'], ['Labour Day', '05-01'], ['Madaraka Day', '06-01'], ['Mazingira Day', '10-10'], ['Mashujaa Day', '10-20'], ['Jamhuri Day', '12-12'], ['Christmas Day', '12-25'], ['Utamaduni Day', '12-26']]
      .map(([name, md]) => ({ name, holiday_date: `${y}-${md}`, kind: 'Public', created_by: uid() })).filter(r => !have.has(r.holiday_date));
    if (!rows.length) return toast('Fixed holidays already loaded', 'info');
    const { error } = await supabase.from('holidays').insert(rows); if (error) return toast(error.message, 'error');
    toast(rows.length + ' holidays added — add Good Friday, Easter Monday and the Idd holidays manually (their dates change each year)', 'success'); renderHR('holidays');
  };

  /* Payroll: loan instalments auto-deducted; recovered on approval */
  window.hrRunPayroll = async () => {
    const period = prompt('Generate draft payslips for which month? (YYYY-MM)', T().slice(0, 7)); if (!period || !/^\d{4}-\d{2}$/.test(period)) return;
    const emps = (await H.loadEmployees()).filter(e => e.status === 'active' && Number(e.basic_salary) > 0), ln = (await H.load('staff_loans')).filter(l => l.status === 'active');
    const have = new Set((await H.load('payroll')).filter(p => p.period === period).map(p => p.employee_id));
    const rows = emps.filter(e => !have.has(e.id)).map(e => { const m = ln.filter(l => l.employee_id === e.id), ded = Math.min(S(m, 'instalment'), S(m, 'balance'));
      return { employee_id: e.id, period, basic: e.basic_salary, allowances: 0, other_deductions: ded, status: 'draft', created_by: uid(), ...hrCalcPayroll(e.basic_salary, 0, ded) }; });
    if (!rows.length) return toast('All active staff already have payslips for ' + period, 'info');
    const { error } = await supabase.from('payroll').insert(rows); if (error) return toast(error.message, 'error');
    addAudit(who(), 'Payroll run', `${period}: ${rows.length} drafts`); toast(`${rows.length} draft payslips created`, 'success'); renderHR('payroll');
  };
  window.hrApproveDrafts = async () => {
    if (!canApprove()) return toast('Only the Finance Manager or an Administrator can approve payroll. HR prepares the run; Finance approves it.', 'error');
    const period = prompt('Approve all draft payslips for which month? (YYYY-MM)', T().slice(0, 7)); if (!period || !confirm(`Approve every draft payslip for ${period}?`)) return;
    const drafts = (await H.load('payroll')).filter(p => p.period === period && p.status === 'draft');
    const { error } = await supabase.from('payroll').update({ status: 'approved' }).eq('period', period).eq('status', 'draft'); if (error) return toast(error.message, 'error');
    const ln = (await H.load('staff_loans')).filter(l => l.status === 'active');
    let loanFail = 0; for (const p of drafts) { let rem = Number(p.other_deductions || 0); for (const l of ln.filter(x => x.employee_id === p.employee_id)) { if (rem <= 0) break;
      const dec = Math.min(rem, Number(l.balance)), nb = Math.round((Number(l.balance) - dec) * 100) / 100; rem -= dec; l.balance = nb;
      const lr = await supabase.from('staff_loans').update({ balance: nb, status: nb <= 0 ? 'cleared' : 'active' }).eq('id', l.id); if (lr.error) loanFail++; } }
    addAudit(who(), 'Payroll approved', period + (loanFail ? ` (${loanFail} loan balance update(s) failed)` : ''));
    if (loanFail) toast(`Drafts approved, but ${loanFail} loan balance update(s) failed. Check Loans & Advances before the next run.`, 'error', 8000); else toast('Drafts approved · loan balances updated', 'success');
    renderHR('payroll');
  };
  /* Payroll → Finance: cost-to-company expense + statutory remittance bill (idempotent per period) */
  window.erpPostPayroll = async () => {
    if (!canFinance()) return toast('Only Finance can post payroll to the books.', 'error'); const p = prompt('Post payroll for which month to Finance? (YYYY-MM)', T().slice(0, 7)); if (!p) return;
    const rows = (await H.load('payroll')).filter(r => r.period === p && r.status !== 'draft'); if (!rows.length) return toast('No approved or paid payslips for ' + p, 'info');
    if ((await H.load('expenses')).some(x => x.ref === 'PAYROLL-' + p)) return toast('Payroll ' + p + ' is already posted to Finance', 'info');
    const er = Math.round((S(rows, 'nssf') + S(rows, 'housing_levy')) * 100) / 100, cost = S(rows, 'gross') + er, stat = S(rows, 'paye') + S(rows, 'nssf') * 2 + S(rows, 'shif') + S(rows, 'housing_levy') * 2;
    const nm = new Date(+p.slice(0, 4), +p.slice(5, 7)); nm.setDate(9);
    const _st = await postingStatus(cost);   // approved only if this person may approve their own entry, otherwise it waits for Finance
    const a = await supabase.from('expenses').insert({ expense_date: T(), category: 'Salaries & Wages', description: `Payroll ${p} — ${rows.length} staff (gross + employer NSSF/AHL)`, amount: cost, paid_via: 'Bank', ref: 'PAYROLL-' + p, status: _st, source_type: 'payroll', created_by: uid() });
    const b = await supabase.from('bills').insert({ bill_date: T(), supplier: 'KRA / NSSF / SHA', bill_no: 'STAT-' + p, category: 'Salaries & Wages', amount: stat, due_date: nm.toISOString().slice(0, 10), status: 'unpaid', notes: `Statutory remittance ${p}`, created_by: uid() });
    if (a.error || b.error) return toast((a.error || b.error).message, 'error');
    addAudit(who(), 'Payroll posted to Finance', `${p}: cost ${cost}, statutory ${stat}`); toast(`Posted: expense ${M(cost)} + statutory bill ${M(stat)}`, 'success');
  };

  /* ═════════ HR: Employee database ═════════ */
  async function hrDirectory() {
    const emps = await H.loadEmployees(), dc = await H.load('staff_documents'), body = $('hrBody'), dept = [...new Set(emps.map(e => e.department).filter(Boolean))].sort();
    const act = emps.filter(e => e.status !== 'exited'), drv = act.filter(driverOf).length, ten = act.filter(e => e.start_date).map(e => (Date.now() - new Date(e.start_date)) / 3.156e10);
    $('hrKpis').innerHTML = hrK('Total Records', emps.length, `${emps.length - act.length} exited`, 'kpi-blue') + hrK('Active Staff', act.length, '', 'kpi-green') + hrK('Linked to Fleet Drivers', drv, 'Matched by ID / phone / name', 'kpi-gold') + hrK('Avg Tenure', ten.length ? (S(ten.map(x => ({ v: x })), 'v') / ten.length).toFixed(1) + ' yrs' : '—', '', 'kpi-orange');
    window._dir = { emps, dc };
    body.innerHTML = `<div class="erp-tools"><input id="dirQ" placeholder="Search name, staff no., ID, phone, KRA PIN…" oninput="erpDir()" style="flex:1;min-width:240px"><select id="dirD" onchange="erpDir()"><option value="">All departments</option>${dept.map(d => `<option>${esc(d)}</option>`).join('')}</select>
      <select id="dirS" onchange="erpDir()"><option value="">All statuses</option><option value="active" selected>Active</option><option value="on_leave">On leave</option><option value="suspended">Suspended</option><option value="exited">Exited</option></select>
      ${hrCan() ? `<button class="action-btn" onclick="GARGO_HUB.open('employees')">+ New employee</button><label class="action-btn ghost" style="cursor:pointer">⬆ Import CSV<input type="file" accept=".csv" hidden onchange="erpImport(this)"></label>${fbtn('Template', 'erpTemplate()')}` : ''}${fbtn('⬇ Export', 'hrExportEmployees()')}</div><div id="dirOut"></div>`;
    erpDir();
  }
  window.erpDir = () => {
    const { emps, dc } = window._dir || { emps: [], dc: [] }, q = low($('dirQ')?.value), d = $('dirD')?.value, s = $('dirS')?.value;
    const rows = emps.filter(e => (!d || e.department === d) && (!s || e.status === s) && (!q || [e.full_name, e.staff_no, e.id_no, e.phone, e.kra_pin, e.job_title].some(v => low(v).includes(q)))).sort((a, b) => String(a.staff_no).localeCompare(String(b.staff_no)));
    $('dirOut').innerHTML = tbl(['Employee', 'Department', 'Role', 'Contract', 'Phone', 'Tenure', 'Compliance', 'Status', ''], rows.map(e => {
      const dr = driverOf(e), docs = dc.filter(x => x.employee_id === e.id && x.expiry_date), bad = docs.filter(x => hrDaysTo(x.expiry_date) < 0).length, soon = docs.filter(x => hrDaysTo(x.expiry_date) >= 0 && hrDaysTo(x.expiry_date) <= 30).length + (dr && dr.licenceExp && hrDaysTo(dr.licenceExp) <= 30 && hrDaysTo(dr.licenceExp) >= 0 ? 1 : 0);
      return [`<span class="erp-av">${esc(initials(e.full_name))}</span><b>${esc(e.full_name)}</b><br><small style="color:var(--text-3);margin-left:40px">${esc(e.staff_no || '')}</small>${dr ? '<span class="erp-tag">Driver</span>' : ''}`, esc(e.department || '—'), esc(e.job_title || '—'), esc(e.employment_type || '—'), esc(e.phone || '—'),
        e.start_date ? ((Date.now() - new Date(e.start_date)) / 3.156e10).toFixed(1) + ' y' : '—', bad ? `<span class="hb hb-r">${bad} expired</span>` : soon ? `<span class="hb hb-a">${soon} due</span>` : '<span class="hb hb-g">Clear</span>', sbadge(String(e.status || 'active')),
        `<button class="action-btn ghost" onclick="hrProfile('${e.id}')">Profile</button>${hrCan() ? ` <button class="action-btn ghost" onclick="GARGO_HUB.open('employees','${e.id}')">Edit</button>` : ''}`]; }), 'No employees match your filters');
  };
  window.erpTemplate = () => hrCsv('employee-import-template.csv', [HR.employees.fields.map(f => f.k)]);
  window.erpImport = inp => {
    const f = inp.files[0]; if (!f || !hrCan()) return; const r = new FileReader();
    r.onload = async () => {
      const L = String(r.result).split(/\r?\n/).filter(x => x.trim()), sp = l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(x => x.trim()); };
      const hd = sp(L[0]), ok = new Set(HR.employees.fields.map(x => x.k)), have = new Set((await H.loadEmployees()).map(e => low(e.staff_no)));
      const rows = L.slice(1).map(l => { const v = sp(l), o = { status: 'active', created_by: uid() }; hd.forEach((h, i) => { if (ok.has(h) && v[i] !== '' && v[i] !== undefined) o[h] = h === 'basic_salary' ? Number(v[i]) : v[i]; }); return o; }).filter(o => o.full_name && o.staff_no && !have.has(low(o.staff_no)));
      if (!rows.length) return toast('No new valid rows (need staff_no + full_name; duplicates skipped)', 'info');
      const { error } = await supabase.from('employees').insert(rows); if (error) return toast(error.message, 'error');
      addAudit(who(), 'Employees imported', rows.length + ' rows'); toast(rows.length + ' employees imported', 'success'); inp.value = ''; renderHR('directory');
    }; r.readAsText(f);
  };

  /* 360° profile */
  window.hrProfile = async id => {
    await H.loadEmployees(); const e = H.emp[id]; if (!e) return;
    const [lv, dc, as, pr, tr, di, ln, pf, at] = await Promise.all(['leave_requests', 'staff_documents', 'staff_assets', 'payroll', 'training_records', 'disciplinary_cases', 'staff_loans', 'performance_reviews', 'attendance'].map(t => H.load(t)));
    const m = a => a.filter(x => x.employee_id === id), yr = String(new Date().getFullYear()), F = (l, v) => `<div><span>${l}</span>${esc(v || '—')}</div>`;
    const used = m(lv).filter(l => l.status === 'approved' && l.leave_type === 'Annual' && String(l.start_date).startsWith(yr)).reduce((s, l) => s + Number(l.days || 0), 0);
    const a30 = m(at).filter(a => a.work_date >= ago(30)), pres = a30.filter(a => ['present', 'late'].includes(a.status)).length, dr = driverOf(e), lastP = m(pr)[0];
    const ytd = m(pr).filter(p => String(p.period).startsWith(yr)), tenure = e.start_date ? ((Date.now() - new Date(e.start_date)) / 3.156e10).toFixed(1) + ' yrs' : '—';
    const fleet = dr ? (() => { const tr2 = (state.db.trips || []).filter(t => t.driverId === dr.id), fu = (state.db.fuel || []).filter(f => f.driverId === dr.id && f.date >= ago(30));
      return `<div class="hr-profile">${F('Driver record', dr.name)}${F('Status', dr.status)}${F('Assigned truck', typeof truckName === 'function' && dr.truckId ? truckName(dr.truckId) : '')}${F('Rating', dr.rating)}</div>
      <div class="hr-row" style="margin-top:10px"><span>Licence ${esc(dr.licence || '')}</span><b>${dr.licenceExp ? exp(dr.licenceExp) : '—'}</b></div><div class="hr-row"><span>Trips on record</span><b>${tr2.length}</b></div><div class="hr-row"><span>Fuel drawn (30 days)</span><b>${S(fu, 'litres').toLocaleString()} L</b></div>
      <p style="margin-top:12px">${fbtn('Open Drivers →', "closeModal({target:document.getElementById('modalOverlay')});showSection('drivers',document.querySelector('[data-section=drivers]'))")}</p>`; })() : '<div style="color:var(--text-3);padding:12px 0">Not linked to a fleet driver record. Matching uses National ID, phone or name.</div>';
    const P = [['Overview', `<div class="hr-profile">${F('Staff No.', e.staff_no)}${F('Department', e.department)}${F('Job title', e.job_title)}${F('Contract', e.employment_type)}${F('Tenure', tenure)}${F('Status', e.status)}${F('Phone', e.phone)}${F('Email', e.email)}${F('National ID', e.id_no)}${F('KRA PIN', e.kra_pin)}${F('NSSF', e.nssf_no)}${F('SHIF', e.shif_no)}${F('Bank', ((e.bank_name || '') + ' ' + (e.bank_account || '')).trim())}${F('Next of kin', ((e.next_of_kin || '') + ' ' + (e.next_of_kin_phone || '')).trim())}</div>
        <div class="hr-row" style="margin-top:12px"><span>Annual leave balance</span><b>${Math.max(0, HR_ANNUAL_DAYS - used)} of ${HR_ANNUAL_DAYS} days</b></div><div class="hr-row"><span>Attendance (30 days)</span><b>${a30.length ? Math.round(pres / a30.length * 100) + '%' : '—'}</b></div>
        <div class="hr-row"><span>Outstanding loans</span><b>${M(S(m(ln).filter(l => l.status === 'active'), 'balance'))}</b></div><div class="hr-row"><span>Last payslip</span><b>${lastP ? lastP.period + ' · ' + M(lastP.net) : '—'}</b></div>
        <p style="margin-top:12px">${hrCan() ? fbtn('Edit record', `GARGO_HUB.open('employees','${id}')`) : ''}</p>`],
      ['Payroll', tbl(['Period', 'Gross', 'PAYE', 'Deductions', 'Net', 'Status'], m(pr).map(p => [p.period, M(p.gross), M(p.paye), M(Number(p.nssf || 0) + Number(p.shif || 0) + Number(p.housing_levy || 0) + Number(p.other_deductions || 0)), M(p.net), sbadge(String(p.status))])) + `<div class="hr-row"><span>YTD gross / PAYE</span><b>${M(S(ytd, 'gross'))} / ${M(S(ytd, 'paye'))}</b></div>`],
      ['Leave', tbl(['Type', 'From', 'To', 'Days', 'Status'], m(lv).map(l => [esc(l.leave_type), H.date(l.start_date), H.date(l.end_date), l.days, sbadge(String(l.status))]))],
      ['Docs & Training', tbl(['Document', 'Number', 'Expiry'], m(dc).map(d => [esc(d.doc_type), esc(d.doc_no || '—'), exp(d.expiry_date)])) + '<div style="height:10px"></div>' + tbl(['Course', 'Completed', 'Valid until'], m(tr).map(t => [esc(t.course), H.date(t.completed_on), t.expiry_date ? exp(t.expiry_date) : '—']))],
      ['Assets & Loans', tbl(['Item', 'Serial', 'Issued', 'Status'], m(as).map(a => [esc(a.item), esc(a.serial || '—'), H.date(a.issued_on), sbadge(String(a.status))])) + '<div style="height:10px"></div>' + tbl(['Loan', 'Amount', 'Balance', 'Status'], m(ln).map(l => [esc(l.loan_type), M(l.amount), M(l.balance), sbadge(String(l.status))]))],
      ['Conduct & Reviews', tbl(['Date', 'Action', 'Summary', 'Status'], m(di).map(d => [H.date(d.case_date), esc(d.action), esc(d.summary), sbadge(String(d.status))])) + '<div style="height:10px"></div>' + tbl(['Period', 'Rating', 'Reviewer'], m(pf).map(p => [esc(p.period), esc(p.rating), esc(p.reviewer || '—')]))],
      ['Fleet', fleet]];
    window._pf = P; openModal(esc(e.full_name), `<div class="erp-tabs">${P.map((p, i) => `<button class="${i ? '' : 'on'}" onclick="erpPf(${i},this)">${p[0]}</button>`).join('')}</div><div id="pfBody">${P[0][1]}</div>`);
  };
  window.erpPf = (i, b) => { document.querySelectorAll('.erp-tabs button').forEach(x => x.classList.toggle('on', x === b)); $('pfBody').innerHTML = window._pf[i][1]; };

  async function hrOrg() {
    const emps = (await H.loadEmployees()).filter(e => e.status !== 'exited'), by = {}; emps.forEach(e => (by[e.department || 'Unassigned'] = by[e.department || 'Unassigned'] || []).push(e));
    $('hrKpis').innerHTML = hrK('Departments', Object.keys(by).length, '', 'kpi-blue') + hrK('Headcount', emps.length, '', 'kpi-gold') + hrK('Largest Team', Object.entries(by).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || '—', '', 'kpi-green');
    const lead = x => /manager|head|supervisor|director/i.test(x.job_title || '') ? 0 : 1;
    $('hrBody').innerHTML = title('Organisation by department') + `<div class="erp-org">${Object.entries(by).sort().map(([d, l]) => `<div class="hr-card"><h4>${esc(d)} <small>${l.length} staff · ${M(S(l, 'basic_salary'))}</small></h4>${l.sort((a, b) => lead(a) - lead(b)).map(e => `<div class="hr-row" style="cursor:pointer" onclick="hrProfile('${e.id}')"><span><span class="erp-av">${esc(initials(e.full_name))}</span><b>${esc(e.full_name)}</b><br><small style="margin-left:40px;color:var(--text-3)">${esc(e.job_title || '')}</small></span>${lead(e) ? '' : '<span class="erp-tag">Lead</span>'}</div>`).join('')}</div>`).join('')}</div>`;
  }
  async function hrReports() {
    const emps = await H.loadEmployees(), [pr, at, lv, tr] = await Promise.all(['payroll', 'attendance', 'leave_requests', 'training_records'].map(t => H.load(t)));
    const act = emps.filter(e => e.status !== 'exited'), per = [...new Set(pr.map(p => p.period))].sort().pop(), pp = pr.filter(p => p.period === per), a30 = at.filter(a => a.work_date >= ago(30));
    const by = {}; pp.forEach(p => { const d = H.emp[p.employee_id]?.department || 'Unassigned'; by[d] = (by[d] || 0) + Number(p.gross || 0); }); const bl = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const liab = act.reduce((s, e) => { const u = lv.filter(l => l.employee_id === e.id && l.status === 'approved' && l.leave_type === 'Annual' && String(l.start_date).startsWith(String(new Date().getFullYear()))).reduce((x, l) => x + Number(l.days || 0), 0); return s + Math.max(0, HR_ANNUAL_DAYS - u) * Number(e.basic_salary || 0) / 26; }, 0);
    $('hrKpis').innerHTML = hrK('Turnover (exited)', emps.length ? Math.round((emps.length - act.length) / emps.length * 100) + '%' : '0%', `${emps.length - act.length} of ${emps.length}`, 'kpi-orange') + hrK('Attendance (30d)', a30.length ? Math.round(a30.filter(a => ['present', 'late'].includes(a.status)).length / a30.length * 100) + '%' : '—', '', 'kpi-green') + hrK('Leave Liability', M(liab), 'Unused annual days', 'kpi-gold') + hrK('Training Spend', M(S(tr, 'cost')), '', 'kpi-blue');
    $('hrBody').innerHTML = title('HR analytics') + `<div class="hr-grid"><div class="hr-card"><h4>Payroll cost by department <small>${per || 'no payroll yet'}</small></h4>${bl.map(([d, v]) => bar(esc(d), v, bl[0][1], M(v))).join('') || '<div style="color:var(--text-3)">No payroll data</div>'}</div>
      <div class="hr-card"><h4>Gender split</h4>${['Female', 'Male', 'Other', ''].map(g => [g || 'Not stated', act.filter(e => (e.gender || '') === g).length]).filter(x => x[1]).map(([g, v]) => bar(g, v, act.length)).join('') || '—'}</div>
      <div class="hr-card"><h4>Tenure bands</h4>${[['< 1 yr', 0, 1], ['1–3 yrs', 1, 3], ['3–5 yrs', 3, 5], ['5+ yrs', 5, 99]].map(([l, a, b]) => bar(l, act.filter(e => { const y = e.start_date ? (Date.now() - new Date(e.start_date)) / 3.156e10 : 0; return y >= a && y < b; }).length, act.length)).join('')}</div></div>`;
  }
  async function hrOverviewExtras() {
    const g = document.querySelector('#hrBody .hr-grid'); if (!g) return; const ln = (await H.load('staff_loans')).filter(l => l.status === 'active');
    const dl = dRows().filter(d => d.licenceExp && hrDaysTo(d.licenceExp) <= 30).sort((a, b) => String(a.licenceExp).localeCompare(String(b.licenceExp)));
    g.insertAdjacentHTML('beforeend', `<div class="hr-card"><h4>Driver licences (fleet) <small>${dl.length}</small></h4>${dl.slice(0, 7).map(d => `<div class="hr-row"><span><b>${esc(d.name)}</b><br>${esc(d.licence || '')}</span><span>${exp(d.licenceExp)}</span></div>`).join('') || '<div style="color:var(--text-3)">All licences valid</div>'}</div>
      <div class="hr-card"><h4>Staff loans <small>${ln.length} active</small></h4><div class="hr-row"><span>Outstanding</span><b>${M(S(ln, 'balance'))}</b></div><div class="hr-row"><span>Monthly recovery via payroll</span><b>${M(S(ln, 'instalment'))}</b></div></div>`);
  }
  const _rhr = window.renderHR, HRC = { directory: hrDirectory, orgchart: hrOrg, reports: hrReports };
  window.renderHR = async (tab, btn) => {
    tab = tab || 'overview'; window._hrTab = tab;
    if (HRC[tab]) { hrBuildTabs(); return HRC[tab](); }
    const r = await _rhr(tab, btn); if (tab === 'overview') await hrOverviewExtras(); return r;
  };

  /* ═════════ FINANCE ═════════ */
  const fbase = { host: 'financeBody', kpiHost: 'financeKpis', canEdit: canFinance, canDelete: isAdmin, refresh: () => renderFinance(window._finTab) };
  FIN.budgets = Object.assign({ table: 'budgets', title: 'Budget Line', cols: [['period', 'Period'], ['category', 'Category'], ['amount', 'Budget', 'money'], ['notes', 'Notes']],
    fields: [{ k: 'period', l: 'Period (YYYY-MM)', r: 1, d: T().slice(0, 7) }, { k: 'category', l: 'Category', t: 'select', o: FIN_CATS }, { k: 'amount', l: 'Budget (KSh)', t: 'number', r: 1, money: true, min: 0 }, { k: 'notes', l: 'Notes' }],
    beforeSave: r => (/^\d{4}-(0[1-9]|1[0-2])$/.test(r.period || '') ? null : 'Period must look like 2026-11') }, fbase);
  FIN.suppliers.rowActions = s => `<button class="action-btn ghost" onclick="erpStatement('${s.id}')">Statement</button> `;
  window.erpStatement = async id => {
    const s = (H.rows.suppliers || []).find(x => x.id === id); if (!s) return;
    const bl = (await H.load('bills')).filter(b => low(b.supplier) === low(s.name)), today = T();
    openModal('Statement — ' + esc(s.name), `<div class="hr-row"><span>Outstanding</span><b>${M(S(bl.filter(b => b.status !== 'paid'), 'amount'))}</b></div><div class="hr-row"><span>Paid to date</span><b>${M(S(bl.filter(b => b.status === 'paid'), 'amount'))}</b></div>` +
      tbl(['Date', 'Bill', 'Due', 'Amount', 'Status'], bl.map(b => [H.date(b.bill_date), esc(b.bill_no || '—'), H.date(b.due_date), M(b.amount), sbadge(b.status !== 'paid' && b.due_date && b.due_date < today ? 'overdue' : b.status)])));
  };

  /* Receivables ← Invoicing module */
  const invs = () => state.db.invoices || [], bal = i => Math.max(0, Number(i.total || 0) - Number(i.paid || 0));
  const byCur = a => Object.entries(a.reduce((m, i) => (m[i.currency || 'USD'] = (m[i.currency || 'USD'] || 0) + bal(i), m), {})).map(([c, v]) => `${c} ${Math.round(v).toLocaleString()}`).join(' · ') || '0';
  async function finRecv() {
    const open = invs().filter(i => bal(i) > 0 && i.status !== 'draft'), t = T(), od = open.filter(i => i.due && i.due < t);
    $('financeKpis').innerHTML = H.kpi('Outstanding', byCur(open), `${open.length} invoices`, 'kpi-gold') + H.kpi('Overdue', byCur(od), `${od.length} invoices`, od.length ? 'kpi-red' : 'kpi-green') + H.kpi('Collected (all time)', byCur(invs().map(i => ({ ...i, total: i.paid, paid: 0 }))), '', 'kpi-green');
    $('financeBody').innerHTML = title('Customer receivables <span style="color:var(--text-3)">(from Invoicing)</span>', `<button class="action-btn ghost" onclick="showAdminSection('invoicing')">Invoicing →</button>`) +
      tbl(['Client', 'Invoice', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status', ''], open.sort((a, b) => String(a.due || '9').localeCompare(String(b.due || '9'))).map(i => [esc(i.client), esc(i.ref || String(i.id).slice(0, 8)), H.date(i.date), H.date(i.due), `${i.currency} ${Number(i.total).toLocaleString()}`, Number(i.paid || 0).toLocaleString(), `<b>${bal(i).toLocaleString()}</b>`, sbadge(i.due && i.due < t ? 'overdue' : i.status), canFinance() ? `<button class="action-btn" onclick="erpRecordPay('${i.id}')">Record payment</button>` : '']), 'No outstanding invoices');
  }
  window.erpRecordPay = async id => {
    const i = invs().find(x => x.id === id); if (!i || !canFinance()) return;
    const amt = Number(prompt(`Payment received (${i.currency}) — balance ${bal(i).toLocaleString()}`, bal(i))); if (!amt || amt <= 0) return;
    const kes = /^(KES|KSH)$/i.test(i.currency || ''), rate = kes ? 1 : Number(prompt('Exchange rate to KSh', await fxRate())); if (!rate) return;
    const method = prompt('Method (M-Pesa / Bank Transfer / Cheque / Cash / RTGS/EFT)', 'Bank Transfer') || 'Bank Transfer', ref = prompt('Reference / Txn No.', '') || '';
    const np = Number(i.paid || 0) + amt, st = np >= Number(i.total) - 0.005 ? 'paid' : 'partial';
    const a = await supabase.from('receipts').insert({ receipt_date: T(), payer: i.client, amount: Math.round(amt * rate * 100) / 100, method, ref, invoice_no: i.ref || String(i.id).slice(0, 8), notes: kes ? '' : `${i.currency} ${amt} @ ${rate}`, created_by: uid() });
    const b = await supabase.from('invoices').update({ paid: np, status: st }).eq('id', id); if (a.error || b.error) return toast((a.error || b.error).message, 'error');
    i.paid = np; i.status = st; addAudit(who(), 'Invoice payment', `${i.ref || i.id}: ${i.currency} ${amt}`); toast('Payment recorded · receipt created', 'success'); finRecv(); if (typeof buildBadges === 'function') buildBadges();
  };

  /* Fleet costs ← fuel logs + maintenance. Read-only: posting to Expenses and the ledger is done item by item in the
     Ops Cost Posting tab, so nothing is ever counted twice. */
  const fuelCost = f => Number(f.totalPaid) || Number(f.litres || 0) * Number(f.pricePerLitre || 0), tn = id => (typeof truckName === 'function' && id ? truckName(id) : '—');
  async function finFleet() {
    const ms = months(6), fu = state.db.fuel || [], mt = state.db.maintenance || [];
    const fm = m => S(fu.filter(f => String(f.date).startsWith(m)).map(f => ({ v: fuelCost(f) })), 'v'), mm = m => S(mt.filter(x => String(x.date).startsWith(m)), 'cost'), cur = ms[ms.length - 1];
    $('financeKpis').innerHTML = H.kpi('Fuel (this month)', M(fm(cur)), '', 'kpi-orange') + H.kpi('Maintenance (this month)', M(mm(cur)), '', 'kpi-blue') + H.kpi('Fleet cost (6 mo)', M(ms.reduce((s, m) => s + fm(m) + mm(m), 0)), '', 'kpi-gold');
    const yr = String(new Date().getFullYear()), tr = {}; fu.filter(f => String(f.date).startsWith(yr)).forEach(f => { const k = f.truckId || '-'; (tr[k] = tr[k] || { f: 0, m: 0 }).f += fuelCost(f); }); mt.filter(x => String(x.date).startsWith(yr)).forEach(x => { const k = x.truckId || '-'; (tr[k] = tr[k] || { f: 0, m: 0 }).m += Number(x.cost || 0); });
    $('financeBody').innerHTML = title('Fleet running costs <span style="color:var(--text-3)">(from Fuel & Maintenance)</span>', fbtn('Ops Cost Posting →', "renderFinance('postq')")) +
      tbl(['Month', 'Fuel', 'Maintenance', 'Total'], ms.slice().reverse().map(m => [m, M(fm(m)), M(mm(m)), `<b>${M(fm(m) + mm(m))}</b>`])) +
      `<div style="height:12px"></div>` + tbl([`Truck cost ${yr}`, 'Fuel', 'Maintenance', 'Total'], Object.entries(tr).sort((a, b) => (b[1].f + b[1].m) - (a[1].f + a[1].m)).map(([k, v]) => [esc(tn(k)), M(v.f), M(v.m), `<b>${M(v.f + v.m)}</b>`]), 'No fleet costs this year') +
      `<p style="color:var(--text-3);font-size:12px;margin-top:10px">These figures come straight from the Fuel and Maintenance logs. To record them as expenses and in the ledger, use <b>Ops Cost Posting</b>.</p>`;
  }

  async function finBudgets() {
    await H.render(FIN.budgets); const ex = await H.load('expenses'), bu = H.rows.budgets || [], cur = T().slice(0, 7), lines = bu.filter(b => b.period === cur);
    const act = c => S(ex.filter(x => String(x.expense_date).startsWith(cur) && x.category === c && x.status === 'approved'), 'amount');
    $('financeBody').insertAdjacentHTML('beforeend', `<div style="height:12px"></div>` + title(`Budget vs actual — ${cur}`) + `<div class="hr-card">${lines.map(b => { const a = act(b.category), p = Math.round(a / (Number(b.amount) || 1) * 100); return bar(`${esc(b.category)} <small style="color:var(--text-3)">${M(a)} of ${M(b.amount)}</small>`, Math.min(p, 100), 100, `<span style="color:${p > 100 ? 'var(--red)' : p > 85 ? 'var(--amber)' : 'var(--green)'}">${p}%</span>`); }).join('') || '<div style="color:var(--text-3)">No budget lines for this month — add one above.</div>'}</div>`);
  }

  async function finOverviewExtras() {
    if (['receipts', 'expenses'].some(x => H.err[x] && !H.rows[x])) return;   // the overview is already showing a load error
    const [rc, ex] = await Promise.all([H.load('receipts'), H.load('expenses')]), ms = months(6), host = $('financeBody'), okx = ex.filter(x => x.status === 'approved');
    const d = ms.map(m => ({ m, i: S(rc.filter(r => String(r.receipt_date).startsWith(m)), 'amount'), o: S(okx.filter(r => String(r.expense_date).startsWith(m)), 'amount') })), mx = Math.max(1, ...d.map(x => Math.max(x.i, x.o))), open = invs().filter(i => bal(i) > 0 && i.status !== 'draft');
    host.insertAdjacentHTML('afterbegin', `<div class="hr-grid"><div class="hr-card"><h4>Cash flow — 6 months <small>receipts vs expenses</small></h4><div class="dd-split">${d.map(x => `<div class="col" title="${x.m}: ${M(x.i)} in, ${M(x.o)} out"><div style="display:flex;gap:2px;align-items:flex-end;width:100%;height:72px"><div class="in" style="height:${Math.round(x.i / mx * 100)}%"></div><div class="out" style="height:${Math.round(x.o / mx * 100)}%"></div></div>${x.m.slice(5)}</div>`).join('')}</div><div class="dd-legend"><span><i style="background:var(--blue)"></i>Receipts</span><span><i style="background:var(--gold)"></i>Expenses</span></div></div>
      <div class="hr-card"><h4>Receivables <small>from Invoicing</small></h4><div class="hr-row"><span>Outstanding</span><b>${byCur(open)}</b></div><div class="hr-row"><span>Overdue</span><b>${byCur(open.filter(i => i.due && i.due < T()))}</b></div><p style="margin-top:10px">${fbtn('Open receivables →', "renderFinance('receivables')")}</p></div></div>`);
  }
  /* ═════════ Petty cash ledger ═════════ */
  const PCV = 'Petty Cash', fm = n => Number(n || 0);
  async function finPetty() {
    const [pc, ex] = await Promise.all([H.load('petty_cash'), H.load('expenses')]), ins = pc.filter(p => p.kind === 'float_in').map(p => ({ id: p.id, d: p.entry_date, desc: p.description || 'Float replenishment', ref: p.ref, inn: fm(p.amount), out: 0, st: 'approved', src: 'float' }));
    const outs = ex.filter(x => x.paid_via === PCV && x.status !== 'rejected').map(x => ({ id: x.id, d: x.expense_date, desc: `${x.category || ''} — ${x.description || ''}`, ref: x.ref, inn: 0, out: fm(x.amount), st: x.status, src: 'exp' }));
    let run = 0; const led = ins.concat(outs).sort((a, b) => String(a.d).localeCompare(String(b.d)) || (a.src === 'float' ? -1 : 1)).map(l => ({ ...l, bal: (run += l.inn - (l.st === 'approved' ? l.out : 0)) })), ms = T().slice(0, 7);
    const pend = outs.filter(x => x.st === 'pending');
    $('financeKpis').innerHTML = H.kpi('Float balance', M(run), 'Approved vouchers only', run < 5000 ? 'kpi-red' : 'kpi-green') + H.kpi('Replenished (MTD)', M(S(ins.filter(x => String(x.d).startsWith(ms)), 'inn')), '', 'kpi-blue') + H.kpi('Spent (MTD)', M(S(outs.filter(x => String(x.d).startsWith(ms) && x.st === 'approved'), 'out')), '', 'kpi-orange') + H.kpi('Pending vouchers', pend.length, M(S(pend, 'out')), pend.length ? 'kpi-orange' : 'kpi-green');
    $('financeBody').innerHTML = title('Petty cash ledger', canFinance() ? `<button class="action-btn" onclick="erpPettyVoucher()">+ Voucher</button><button class="action-btn ghost" onclick="erpPettyTopup()">+ Replenish float</button>${fbtn('⬇ Export', 'erpPettyCsv()')}` : '') +
      tbl(['Date', 'Description', 'Ref', 'Cash in', 'Cash out', 'Balance', 'Status', ''], led.slice().reverse().map(l => [H.date(l.d), esc(l.desc), esc(l.ref || '—'), l.inn ? M(l.inn) : '', l.out ? M(l.out) : '', `<b>${M(l.bal)}</b>`, sbadge(String(l.st)), l.src === 'exp' && l.st === 'pending' && canApprove() ? dbtn(l.id, 'approved', '✓') + dbtn(l.id, 'rejected', '✕') : '']), 'No petty cash activity');
    window._pcl = led;
  }
  window.erpPettyCsv = () => hrCsv('petty-cash-' + T() + '.csv', [['Date', 'Description', 'Ref', 'In', 'Out', 'Balance']].concat((window._pcl || []).map(l => [l.d, l.desc, l.ref, l.inn, l.out, l.bal])));
  window.erpPettyVoucher = () => openModal('Petty cash voucher', `<div class="form-row-2"><div class="fg"><label>Date *</label><input id="pv_d" type="date" value="${T()}"></div><div class="fg"><label>Amount (KSh) *</label><input id="pv_a" type="number" step="0.01"></div></div><div class="form-row-2"><div class="fg"><label>Category</label><select id="pv_c">${FIN_CATS.map(c => `<option>${esc(c)}</option>`).join('')}</select></div><div class="fg"><label>Receipt / Ref</label><input id="pv_r"></div></div><div class="fg"><label>Description *</label><input id="pv_t"></div><div id="pv_e" style="color:var(--red);font-size:12px;min-height:16px"></div><div style="display:flex;justify-content:flex-end;gap:8px"><button class="action-btn" onclick="erpPettySave()">Save voucher</button></div>`);
  window.erpPettySave = async () => {
    const v = k => $('pv_' + k).value.trim(), a = Number(v('a')); if (!a || a <= 0 || !v('t')) return ($('pv_e').textContent = 'Amount and description are required');
    const { error } = await supabase.from('expenses').insert({ expense_date: v('d'), category: v('c'), description: v('t'), amount: a, paid_via: PCV, ref: v('r'), status: 'pending', created_by: uid() }); if (error) return ($('pv_e').textContent = error.message);
    addAudit(who(), 'Petty cash voucher', `${v('t')} ${a}`); closeModal({ target: $('modalOverlay') }); toast('Voucher saved (pending approval)', 'success'); finPetty();
  };
  window.erpPettyTopup = () => openModal('Replenish petty cash float', `<div class="form-row-2"><div class="fg"><label>Date *</label><input id="pt_d" type="date" value="${T()}"></div><div class="fg"><label>Amount (KSh) *</label><input id="pt_a" type="number" step="0.01"></div></div><div class="fg"><label>Reference (cheque / transfer no.)</label><input id="pt_r"></div><p style="font-size:12px;color:var(--text-3)">Recorded as cash out of the bank and cash in to petty cash.</p><div style="display:flex;justify-content:flex-end"><button class="action-btn" onclick="erpTopupSave()">Save</button></div>`);
  window.erpTopupSave = async () => {
    const a = Number($('pt_a').value); if (!a || a <= 0) return toast('Enter an amount', 'error');
    const { error } = await supabase.from('petty_cash').insert({ kind: 'float_in', entry_date: $('pt_d').value, amount: a, ref: $('pt_r').value.trim(), description: 'Float replenishment from bank', created_by: uid() }); if (error) return toast(error.message, 'error');
    addAudit(who(), 'Petty cash replenished', String(a)); closeModal({ target: $('modalOverlay') }); toast('Float replenished', 'success'); finPetty();
  };

  /* ═════════ Bank accounts & reconciliation ═════════ */
  FIN.bank_accounts = Object.assign({ table: 'bank_accounts', title: 'Bank Account', cols: [['name', 'Account'], ['bank', 'Bank'], ['account_no', 'Account No.'], ['opening_balance', 'Opening Balance', 'money'], ['opening_date', 'As At', 'date']],
    fields: [{ k: 'name', l: 'Account name', r: 1 }, { k: 'bank', l: 'Bank' }, { k: 'account_no', l: 'Account No.' }, { k: 'opening_balance', l: 'Opening balance (KSh)', t: 'number', d: 0 }, { k: 'opening_date', l: 'Opening date', t: 'date', d: T() }] }, fbase);
  const bookItems = (rc, ex, pc) => [].concat(
    rc.filter(r => r.method !== 'Cash').map(r => ({ key: 'receipts:' + r.id, d: r.receipt_date, desc: `Receipt — ${r.payer || ''}`, ref: r.ref || r.invoice_no, inn: fm(r.amount), out: 0 })),
    ex.filter(x => x.paid_via !== PCV && x.status === 'approved').map(x => ({ key: 'expenses:' + x.id, d: x.expense_date, desc: `${x.category || ''} — ${x.description || ''}`, ref: x.ref, inn: 0, out: fm(x.amount) })),
    pc.filter(p => p.kind === 'float_in').map(p => ({ key: 'petty_cash:' + p.id, d: p.entry_date, desc: 'Petty cash float', ref: p.ref, inn: 0, out: fm(p.amount) })));
  async function finBank() {
    await H.render(FIN.bank_accounts); const [ln, rc, ex, pc] = await Promise.all(['bank_lines', 'receipts', 'expenses', 'petty_cash'].map(t => H.load(t))), acc = H.rows.bank_accounts || [];
    if (!acc.length) { $('financeKpis').innerHTML = ''; return $('financeBody').insertAdjacentHTML('beforeend', '<p style="color:var(--text-3);margin-top:12px">Add a bank account above, then import its statement as CSV to start reconciling.</p>'); }
    if (!acc.find(a => a.id === window._bkAcc)) window._bkAcc = acc[0].id; const a = acc.find(x => x.id === window._bkAcc), lines = ln.filter(l => l.account_id === a.id).sort((x, y) => String(y.line_date).localeCompare(String(x.line_date)));
    const used = new Set(ln.filter(l => l.matched_key).map(l => l.matched_key)), op = fm(a.opening_balance), od = a.opening_date || '0000', bk = bookItems(rc, ex, pc).filter(b => String(b.d) >= od);
    const stm = op + S(lines, 'credit') - S(lines, 'debit'), book = op + S(bk, 'inn') - S(bk, 'out'), un = bk.filter(b => !used.has(b.key)), oi = S(un, 'inn'), oo = S(un, 'out'), adj = stm + oi - oo, diff = Math.round((book - adj) * 100) / 100, ul = lines.filter(l => !l.matched_key);
    $('financeKpis').innerHTML = H.kpi('Statement balance', M(stm), `${lines.length} lines`, 'kpi-blue') + H.kpi('Book balance', M(book), 'Receipts − payments', 'kpi-gold') + H.kpi('Unmatched statement lines', ul.length, M(S(ul, 'credit') - S(ul, 'debit')), ul.length ? 'kpi-orange' : 'kpi-green') + H.kpi('Difference', M(diff), diff === 0 ? 'Reconciled' : 'Needs attention', diff === 0 ? 'kpi-green' : 'kpi-red');
    window._bk = { a, lines, un, bk };
    $('financeBody').insertAdjacentHTML('beforeend', `<div style="height:14px"></div>` + title('Reconciliation — ' + esc(a.name), `<select onchange="window._bkAcc=this.value;renderFinance('bank')" style="padding:7px 10px">${acc.map(x => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${canFinance() ? `<label class="action-btn ghost" style="cursor:pointer">⬆ Import statement CSV<input type="file" accept=".csv" hidden onchange="erpBankImport(this)"></label><button class="action-btn" onclick="erpAutoMatch()">⚡ Auto-match</button>` : ''}`) +
      `<div class="hr-grid"><div class="hr-card"><h4>Reconciliation statement</h4><div class="hr-row"><span>Balance per bank statement</span><b>${M(stm)}</b></div><div class="hr-row"><span>+ Receipts not yet on statement</span><b>${M(oi)}</b></div><div class="hr-row"><span>− Payments not yet on statement</span><b>${M(oo)}</b></div><div class="hr-row"><span>Adjusted bank balance</span><b>${M(adj)}</b></div><div class="hr-row"><span>Balance per books</span><b>${M(book)}</b></div><div class="hr-row"><span>Difference</span><b style="color:${diff ? 'var(--red)' : 'var(--green)'}">${M(diff)}</b></div></div>
      <div class="hr-card"><h4>Unmatched book entries <small>${un.length}</small></h4>${un.slice(0, 8).map(b => `<div class="hr-row"><span>${H.date(b.d)} · ${esc(b.desc).slice(0, 38)}</span><b>${b.inn ? '+' + M(b.inn) : '−' + M(b.out)}</b></div>`).join('') || '<div style="color:var(--text-3)">Everything is matched</div>'}</div></div>` +
      tbl(['Date', 'Description', 'Ref', 'Money in', 'Money out', 'Status', ''], lines.map(l => [H.date(l.line_date), esc(l.description || ''), esc(l.ref || '—'), l.credit ? M(l.credit) : '', l.debit ? M(l.debit) : '', l.matched_key ? '<span class="hb hb-g">Matched</span>' : '<span class="hb hb-a">Open</span>',
        canFinance() ? (l.matched_key ? `<button class="action-btn ghost" onclick="erpUnmatch('${l.id}')">Unmatch</button>` : `<button class="action-btn ghost" onclick="erpMatchModal('${l.id}')">Match</button><button class="action-btn ghost" onclick="erpBookIt('${l.id}')">Book it</button>`) : '']), 'No statement lines yet — import a CSV (columns: date, description, ref, debit, credit)'));
  }
  window.erpBankImport = inp => {
    const f = inp.files[0], A = (window._bk || {}).a; if (!f || !A) return; const r = new FileReader();
    r.onload = async () => {
      const L = String(r.result).split(/\r?\n/).filter(x => x.trim()), sp = l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(x => x.trim()); }, hd = sp(L[0]).map(low), ix = k => hd.findIndex(h => h.includes(k)), num = v => Number(String(v || '').replace(/[^0-9.\-]/g, '')) || 0;
      const iD = ix('date'), iT = ix('desc') >= 0 ? ix('desc') : ix('narr'), iR = ix('ref'), iDb = ix('debit') >= 0 ? ix('debit') : ix('withdraw'), iCr = ix('credit') >= 0 ? ix('credit') : ix('deposit'); if (iD < 0 || iDb < 0 || iCr < 0) return toast('CSV needs date, debit and credit columns', 'error');
      const have = new Set((window._bk.lines || []).map(l => [l.line_date, l.description, l.ref, fm(l.debit), fm(l.credit)].join('|')));
      const rows = L.slice(1).map(l => { const v = sp(l), d = new Date(v[iD]); return { account_id: A.id, line_date: isNaN(d) ? null : d.toISOString().slice(0, 10), description: v[iT] || '', ref: v[iR] || '', debit: num(v[iDb]), credit: num(v[iCr]), created_by: uid() }; }).filter(x => x.line_date && (x.debit || x.credit) && !have.has([x.line_date, x.description, x.ref, x.debit, x.credit].join('|')));
      if (!rows.length) return toast('No new lines found (duplicates are skipped)', 'info');
      const { error } = await supabase.from('bank_lines').insert(rows); if (error) return toast(error.message, 'error'); addAudit(who(), 'Bank statement imported', `${A.name}: ${rows.length} lines`); toast(rows.length + ' lines imported', 'success'); finBank();
    }; r.readAsText(f);
  };
  const cands = l => { const dir = l.credit ? 'inn' : 'out', amt = fm(l.credit || l.debit); return (window._bk.un || []).filter(b => b[dir] > 0 && Math.abs(b[dir] - amt) < 0.01); };
  window.erpAutoMatch = async () => {
    const { lines, un } = window._bk, taken = new Set(); let n = 0;
    for (const l of lines.filter(x => !x.matched_key)) { const c = cands(l).filter(b => !taken.has(b.key)).sort((a, b) => Math.abs(new Date(a.d) - new Date(l.line_date)) - Math.abs(new Date(b.d) - new Date(l.line_date)))[0];
      const ok = c && (Math.abs(new Date(c.d) - new Date(l.line_date)) <= 7 * 864e5 || (c.ref && l.ref && low(l.ref).includes(low(c.ref))));
      if (ok) { taken.add(c.key); await supabase.from('bank_lines').update({ matched_key: c.key }).eq('id', l.id); n++; } }
    toast(n ? `${n} lines matched (same amount, within 7 days or same reference)` : 'No automatic matches found', n ? 'success' : 'info'); finBank();
  };
  window.erpMatchModal = id => {
    const l = window._bk.lines.find(x => x.id === id), c = cands(l);
    openModal('Match statement line', `<div class="hr-row"><span>${H.date(l.line_date)} · ${esc(l.description)}</span><b>${M(l.credit || l.debit)}</b></div>` + tbl(['Date', 'Book entry', 'Amount', ''], c.map(b => [H.date(b.d), esc(b.desc), M(b.inn || b.out), `<button class="action-btn" onclick="erpDoMatch('${id}','${b.key}')">Match</button>`]), 'No book entry with this exact amount — use "Book it" to record it'));
  };
  window.erpDoMatch = async (id, key) => { await supabase.from('bank_lines').update({ matched_key: key }).eq('id', id); closeModal({ target: $('modalOverlay') }); toast('Matched', 'success'); finBank(); };
  window.erpUnmatch = async id => { await supabase.from('bank_lines').update({ matched_key: null }).eq('id', id); finBank(); };
  window.erpBookIt = async id => {
    const l = window._bk.lines.find(x => x.id === id), isIn = fm(l.credit) > 0, amt = fm(l.credit || l.debit); if (!confirm(`Record this as ${isIn ? 'a receipt' : 'a bank expense'} of ${M(amt)} and match it?`)) return;
    const _st = isIn ? null : await postingStatus(amt);
    const t = isIn ? 'receipts' : 'expenses', rec = isIn ? { receipt_date: l.line_date, payer: l.description || 'Bank credit', amount: amt, method: 'Bank Transfer', ref: l.ref, created_by: uid() } : { expense_date: l.line_date, category: /charge|fee|levy|duty/i.test(l.description || '') ? 'Admin & Office' : 'Other', description: l.description || 'Bank debit', amount: amt, paid_via: 'Bank', ref: l.ref, status: _st, created_by: uid() };
    const { data, error } = await supabase.from(t).insert(rec).select().single(); if (error || !data) return toast(error?.message || 'Could not create entry', 'error');
    await supabase.from('bank_lines').update({ matched_key: t + ':' + data.id }).eq('id', id); addAudit(who(), 'Bank line booked', `${t} ${amt}`); toast('Booked and matched', 'success'); finBank();
  };
  F.add('receivables', 'Receivables', finRecv, null, 'overview');
  F.add('petty', 'Petty Cash', finPetty);
  F.add('bank', 'Bank Reconciliation', finBank);
  F.add('fleet', 'Fleet Costs', finFleet);
  F.add('budgets', 'Budgets', finBudgets);
  const _rf = window.renderFinance;
  window.renderFinance = async function (tab) { const r = await _rf.apply(this, arguments); if (!tab || tab === 'overview') { try { await finOverviewExtras(); } catch (e) { console.warn('overview extras', e); } } return r; };

  /* ═════════ Dashboard pulse (HR + Finance on the main overview) ═════════ */
  let _pulse = { at: 0, c: null };
  async function erpPulse() {
    const kr = $('kpiRow'); if (!kr || !(isAdmin() || hrCan() || canFinance())) return; let c = [];
    if (_pulse.c && Date.now() - _pulse.at < 30000) c = _pulse.c; else try {
      if (isAdmin() || hrCan()) { const emps = (await H.loadEmployees()).filter(e => e.status !== 'exited'), at = await H.load('attendance'), dc = await H.load('staff_documents');
        const bad = dc.filter(d => d.expiry_date && hrDaysTo(d.expiry_date) <= 30).length + dRows().filter(d => d.licenceExp && hrDaysTo(d.licenceExp) <= 30).length;
        c.push(['Headcount', emps.length, 'hr'], ['Present today', at.filter(a => a.work_date === T() && ['present', 'late'].includes(a.status)).length, 'hr'], ['Compliance alerts', bad, 'hr']); }
      if (isAdmin() || canFinance()) { const [rc, ex, bl] = await Promise.all(['receipts', 'expenses', 'bills'].map(t => H.load(t))), ms = T().slice(0, 7), open = invs().filter(i => bal(i) > 0 && i.status !== 'draft');
        c.push(['Bills due ≤ 7 days', bl.filter(b => b.status !== 'paid' && b.due_date && b.due_date <= ago(-7)).length, 'finance'], ['Receivables overdue', open.filter(i => i.due && i.due < T()).length, 'finance']); }
    _pulse = { at: Date.now(), c }; } catch (e) { return; }
    let p = $('erpPulse'); if (!p) { p = document.createElement('div'); p.id = 'erpPulse'; p.className = 'erp-pulse'; kr.insertAdjacentElement('afterend', p); }
    p.innerHTML = c.map(([l, v, s]) => `<div onclick="showSection('${s}',document.querySelector('[data-section=${s}]'))"><small>${l}</small><b>${v}</b></div>`).join('');
  }
  const _rd = window.renderDashboard; window.renderDashboard = function () { const r = _rd.apply(this, arguments); erpPulse(); return r; };
  if (typeof sectionRenderers !== 'undefined') sectionRenderers.dashboard = window.renderDashboard;
  /* ═════════ Cross-links: global search ↔ employees, Drivers ↔ HR profile ═════════ */
  let _emps = [];
  const loadEmps = async () => { if (!(isAdmin() || hrCan())) return []; try { _emps = await H.loadEmployees(); } catch (e) {} return _emps; };
  const _hs = window.handleSearch;
  window.handleSearch = function (q) {
    _hs(q); const ql = low(q), panel = $('searchResults'); if (!ql || !panel || !(isAdmin() || hrCan())) return;
    loadEmps().then(emps => {
      const hit = emps.filter(e => [e.full_name, e.staff_no, e.id_no, e.phone, e.kra_pin, e.job_title, e.email].some(v => low(v).includes(ql))).slice(0, 5); if (!hit.length) return;
      const acts = window._searchResults || [], emptyEl = panel.querySelector('.search-result-empty'); if (emptyEl) emptyEl.remove();
      hit.forEach(e => { acts.push(() => { showSection('hr', document.querySelector('[data-section=hr]')); hrProfile(e.id); });
        panel.insertAdjacentHTML('beforeend', `<div class="search-result-item" onclick="runSearchResult(${acts.length - 1})"><span class="search-result-type">Employee</span> ${esc(e.full_name)}<span class="search-result-sub">${esc(e.staff_no || '')} · ${esc(e.department || '')}</span></div>`); });
      window._searchResults = acts; panel.style.display = 'block';
    });
  };
  const gs = $('globalSearch'); if (gs) gs.placeholder = 'Search trucks, drivers, staff, containers…';
  window.erpOpenEmployeeForDriver = async did => {
    const d = dRows().find(x => x.id === did), emps = await loadEmps(), e = emps.find(x => driverOf(x) === d);
    if (!e) return toast('No HR record matches this driver (matched by ID no., phone or name)', 'info');
    closeModal({ target: $('modalOverlay') }); showSection('hr', document.querySelector('[data-section=hr]')); hrProfile(e.id);
  };
  const _sd = window.showDriverDetail;
  window.showDriverDetail = async function (id) {
    _sd(id); if (!(isAdmin() || hrCan())) return; const d = dRows().find(x => x.id === id), body = $('modalBody'); if (!d || !body) return;
    const emps = await loadEmps(), e = emps.find(x => driverOf(x) === d); if (!body.isConnected || $('modalTitle').textContent.indexOf(d.name) < 0) return;
    body.insertAdjacentHTML('beforeend', `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px"><span style="font-size:12px;color:var(--text-2)">${e ? `HR record: <b>${esc(e.full_name)}</b> · ${esc(e.staff_no || '')} · ${esc(e.department || '')}` : 'No matching HR record'}</span><button class="action-btn" onclick="erpOpenEmployeeForDriver('${id}')" ${e ? '' : 'disabled'}>Open HR profile →</button></div>`);
  };
})();