'use strict';

(function () {
  const H = GARGO_HUB, F = GARGO_FIN, FIN_CATS = F.FIN_CATS, $ = id => document.getElementById(id), N = v => Number(v || 0), r2 = n => Math.round(n * 100) / 100;
  const M = n => H.money(n), D = d => (d ? fmtDate(d) : '—'), T = () => today10(), who = () => state.profile?.username;
  const pad = n => String(n).padStart(2, '0'), ld = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const num = n => N(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cur = (n, c) => (!c || c === 'KES') ? M(n) : c + ' ' + num(n);
  const dc = n => { n = r2(N(n)); return n === 0 ? '0.00' : num(Math.abs(n)) + (n > 0 ? ' Dr' : ' Cr'); };
  const R = h => `<div class="num">${h}</div>`;
  const btn = (l, fn, p) => `<button class="action-btn${p ? '' : ' ghost'}" onclick="${fn}">${l}</button>`;
  const head = (t, x) => `<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">${t}</div><div class="filter-row">${x || ''}</div></div>`;
  const card = (t, s, b) => `<div class="hr-card"><h4>${t} <small>${s || ''}</small></h4>${b}</div>`;
  const row = (l, v) => `<div class="hr-row"><span>${l}</span><b>${v}</b></div>`;
  const note = t => `<p style="color:var(--text-3);font-size:12px;margin-top:10px;line-height:1.55">${t}</p>`;
  const tbl = (h, rows, e, foot) => `<div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="99" style="text-align:center;color:var(--text-3);padding:22px">${e || 'No records'}</td></tr>`}</tbody>${foot && rows.length ? `<tfoot><tr>${foot.map(c => `<td style="font-weight:700;border-top:1px solid var(--glass-edge)">${c}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
  const rpc = async (fn, args, quiet) => { const { data, error } = await supabase.rpc(fn, args || {}); if (error) { if (!quiet) toast(error.message, 'error'); return null; } return data; };
  const sbadge = s => H.badge(s);
  /* journal and PO windows are wider than a normal dialog; put the width back when they close */
  const closeM = () => { closeModal({ target: $('modalOverlay') }); const m = document.querySelector('#modalOverlay .modal-box'); if (m) m.style.maxWidth = ''; };
  const kp = h => { const k = $('financeKpis'); if (k) k.innerHTML = h; };
  const out = h => { const b = $('financeBody'); if (b) b.innerHTML = h; };
  const loading = () => out('<div style="padding:24px;color:var(--text-2)">Loading…</div>');
  const kpi = (l, v, s, c) => kpiCard(l, v, s || '', c || 'kpi-gold');
  const gate = () => { if (canFinance()) return true; kp(''); out('<div class="ops-notice">This area is restricted to Finance and Administrators.</div>'); return false; };
  const csv = (name, rows) => hrCsv(name, rows);
  const sel = (id, opts, v, extra) => `<select id="${id}" ${extra || ''}>${opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  const fld = (l, inner, extra) => `<div class="fg"${extra ? ` style="${extra}"` : ''}><label>${l}</label>${inner}</div>`;
  const val = id => ($(id)?.value ?? '').trim();

  /* ───────── period state (one range per report) ───────── */
  const ytd = () => ({ from: new Date().getFullYear() + '-01-01', to: T() });
  const mtd = () => { const n = new Date(); return { from: ld(new Date(n.getFullYear(), n.getMonth(), 1)), to: T() }; };
  const PS = { tb: ytd(), pl: ytd(), ledger: ytd(), vat: mtd() };
  const ST = { asat: T(), acct: '', fx: 129, fxLoaded: false, weeks: 13, jf: 'all', pof: 'all' };
  const periodBar = (tab, mode) => `<div class="hr-card" style="margin-bottom:12px"><div class="erp-tools" style="margin:0 0 8px">${mode === 'asat'
    ? `<input type="date" id="fc_asat" value="${ST.asat}" title="As at">`
    : `<input type="date" id="fc_from" value="${PS[tab].from}" title="From"><input type="date" id="fc_to" value="${PS[tab].to}" title="To">`}</div>
    <div class="filter-row">${mode === 'asat' ? '' : [['month', 'This month'], ['last', 'Last month'], ['qtr', 'This quarter'], ['ytd', 'Year to date'], ['lastyr', 'Last year']].map(([k, l]) => btn(l, `fcPre('${k}','${tab}')`)).join('')}${btn('Run', `fcRun('${tab}')`, 1)}</div></div>`;
  window.fcPre = (k, tab) => {
    const n = new Date(), y = n.getFullYear(), m = n.getMonth(), q = Math.floor(m / 3) * 3;
    const [a, b] = { month: [new Date(y, m, 1), n], last: [new Date(y, m - 1, 1), new Date(y, m, 0)], qtr: [new Date(y, q, 1), n], ytd: [new Date(y, 0, 1), n], lastyr: [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)] }[k];
    PS[tab] = { from: ld(a), to: ld(b) }; renderFinance(tab);
  };
  window.fcRun = tab => {
    const f = $('fc_from'), t = $('fc_to'), a = $('fc_asat');
    if (a) ST.asat = a.value || T();
    if (f && t) { if (!f.value || !t.value || f.value > t.value) return toast('Choose a valid From and To date', 'error'); PS[tab] = { from: f.value, to: t.value }; }
    renderFinance(tab);
  };

  /* ═══════════════════════════════════════════════════════════════
     APPROVALS INBOX (sidebar page + finance tab)
     ═══════════════════════════════════════════════════════════════ */
  const INBOX_LABEL = { leave: 'Leave', expense: 'Expense', po: 'Purchase order', requisition: 'Requisition', payroll: 'Payroll' };
  let INBOX = [], inboxHosts = ['approvalsKpis', 'approvalsBody'];
  async function drawApprovals(kpiId, bodyId) {
    const body = $(bodyId), k = $(kpiId); if (!body) return;
    inboxHosts = [kpiId, bodyId]; body.innerHTML = '<div style="padding:24px;color:var(--text-2)">Loading…</div>';
    const { data: d, error: inboxErr } = await supabase.rpc('fin_approvals_inbox');
    if (inboxErr || !Array.isArray(d)) {
      /* The database function failed or is missing: say so, and still let the approver deal with pending requisitions */
      const msg = (inboxErr && inboxErr.message) || 'No answer from the server';
      const missing = /does not exist|could not find|schema cache/i.test(msg);
      const reqs = (state.db.requisitions || []).filter(r => r.status === 'pending');
      const canDecide = typeof reqCanApprove === 'function' && reqCanApprove();
      if (k) k.innerHTML = kpi('Requisitions', reqs.length, 'Pending', reqs.length ? 'kpi-orange' : 'kpi-green');
      body.innerHTML = head('Approvals inbox', btn('Retry', 'fcInbox()')) +
        `<div class="ops-notice" style="margin-bottom:12px"><span style="flex:1;min-width:0">The approvals inbox could not be loaded: <b>${esc(msg)}</b>. ${missing ? 'The database function <code>fin_approvals_inbox</code> is missing. Run the finance / HR controls SQL in Supabase, then press Retry.' : 'Check your connection and press Retry.'} Pending requisitions are still listed below.</span></div>` +
        (reqs.length ? reqs.map(r => `<div class="hr-card" style="margin-bottom:8px;padding:12px 16px"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="erp-tag">Requisition</span>
          <div style="flex:1;min-width:220px"><b>${esc(r.reqNo || r.ref || '')} ${esc(r.title || r.description || r.category || '')}</b><br><small style="color:var(--text-3)">${esc(r.requester || r.requestedBy || '')} · ${D(r.date)}</small></div><b>${M(r.amount || r.total)}</b>
          <div style="display:flex;gap:6px">${canDecide ? btn('Approve', `reqDecide('${r.id}',true)`, 1) + btn('Reject', `reqDecide('${r.id}',false)`) : ''}${btn('Open', "fcGo('requisitions')")}</div></div></div>`).join('')
          : '<div class="empty-state" style="padding:30px"><div class="empty-state-label">No pending requisitions.</div></div>');
      updateBadge(canDecide ? reqs.length : 0);
      return;
    }
    INBOX = d; const mine = d.filter(x => x.can_decide), by = t => d.filter(x => x.type === t).length;
    if (k) k.innerHTML = kpi('Waiting for you', mine.length, 'You can decide now', mine.length ? 'kpi-orange' : 'kpi-green') + kpi('Leave', by('leave'), 'Requests', 'kpi-blue') + kpi('Expenses', by('expense'), 'Pending', 'kpi-gold') + kpi('Purchase orders', by('po'), 'Pending', 'kpi-gold') + kpi('Requisitions', by('requisition'), 'Pending', 'kpi-blue');
    body.innerHTML = head('Approvals inbox', btn('Refresh', 'fcInbox()')) + (d.length ? d.map((x, i) => `<div class="hr-card" style="margin-bottom:8px;padding:12px 16px"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <span class="erp-tag">${esc(INBOX_LABEL[x.type] || x.type)}</span>
        <div style="flex:1;min-width:220px"><b>${esc(x.title)}</b><br><small style="color:var(--text-3)">${esc(x.sub || '')}${x.who ? ' · ' + esc(x.who) : ''}${x.date ? ' · ' + D(x.date) : ''}</small></div>
        ${x.amount != null ? `<b>${cur(x.amount, x.currency)}</b>` : ''}
        <div style="display:flex;gap:6px">${x.can_decide ? btn('Approve', `fcDecide(${i},true)`, 1) + btn('Reject', `fcDecide(${i},false)`) : ''}${btn('Open', `fcGo('${esc(x.section)}','${esc(x.tab || '')}')`)}</div></div></div>`).join('')
      : '<div class="empty-state" style="padding:40px"><div class="empty-state-label">Nothing is waiting for approval.</div></div>') +
      note('Leave, expenses, purchase orders and requisitions that need a decision from your role. Payroll runs appear here for visibility; HR prepares them and the Finance Manager or an Administrator approves them in the HR Hub → Payroll. Nobody can approve a purchase order they created.');
    updateBadge(mine.length);
  }
  window.fcInbox = () => drawApprovals(...inboxHosts);
  window.fcDecide = async (i, ok) => {
    const x = INBOX[i]; if (!x) return;
    let nt = null; if (!ok) { nt = prompt('Reason for rejecting (optional)', ''); if (nt === null) return; }
    const r = await rpc('fin_decide', { p_type: x.type, p_id: x.id, p_approve: ok, p_note: nt || null }); if (!r) return;
    addAudit(who(), `${INBOX_LABEL[x.type] || x.type} ${ok ? 'approved' : 'rejected'}`, x.title);
    toast(ok ? 'Approved' : 'Rejected', 'success'); drawApprovals(...inboxHosts);
  };
  const TAB_ALIAS = { purchaseorders: 'po', purchase_orders: 'po' };   /* older names the inbox may send */
  window.fcGo = (section, tab) => {
    tab = TAB_ALIAS[tab] || tab;
    showSection(section, document.querySelector(`.nav-item[data-section="${section}"]`));
    if (tab) setTimeout(() => (section === 'hr' ? renderHR(tab) : section === 'finance' ? renderFinance(tab) : null), 0);
  };
  function updateBadge(n) { const el = $('badge-approvals'); if (el) { el.textContent = n || ''; el.style.display = n ? 'inline' : 'none'; } }
  async function refreshBadge() { const d = await rpc('fin_approvals_inbox', null, true); updateBadge((d || []).filter(x => x.can_decide).length); }
  const _bb = window.buildBadges; let _bbT = 0;
  window.buildBadges = function () { if (_bb) _bb.apply(this, arguments); clearTimeout(_bbT); _bbT = setTimeout(refreshBadge, 1500); };
  window.renderApprovals = () => drawApprovals('approvalsKpis', 'approvalsBody');
  if (typeof sectionRenderers !== 'undefined') sectionRenderers.approvals = window.renderApprovals;
  /* register the Approvals page with Gargo's section tables (title, and who sees it in the sidebar) */
  try {
    if (typeof SECTION_META !== 'undefined' && !SECTION_META.approvals) SECTION_META.approvals = ['Finance', 'Approvals'];
    if (typeof ROLE_SIDEBAR !== 'undefined') ['admin', 'finance', 'hr'].forEach(r => { const a = ROLE_SIDEBAR[r]; if (Array.isArray(a) && !a.includes('approvals')) a.push('approvals'); });
  } catch (e) { console.warn('approvals registration', e); }

  /* ═══════════════════════════════════════════════════════════════
     GENERAL LEDGER
     ═══════════════════════════════════════════════════════════════ */
  /* journals you can write by hand vs. journals the system creates from other modules */
  const SRC_MANUAL = { manual: 'Manual', opening: 'Opening balance', adjustment: 'Adjustment', accrual: 'Accrual', correction: 'Correction' };
  const SRC_AUTO = { invoice: 'Customer invoice', receipt: 'Receipt', bill: 'Supplier bill', bill_payment: 'Bill payment', expense: 'Expense', payroll: 'Payroll', depreciation: 'Depreciation', loan: 'Staff loan', payroll_payment: 'Payroll payment', reversal: 'Reversal' };
  const SRC = Object.assign({}, SRC_MANUAL, SRC_AUTO);
  const UNP_LABEL = { invoice: 'Customer invoices', receipt: 'Receipts', bill: 'Supplier bills', bill_payment: 'Bills marked paid', expense: 'Approved expenses', payroll: 'Payroll', payroll_payment: 'Payroll payments', depreciation: 'Depreciation', loan: 'Staff loans' };
  let ACCTS = [];
  async function loadAccounts() {
    const { data, error } = await supabase.from('gl_accounts').select('*').order('code'); if (error) { toast(error.message, 'error'); return ACCTS; }
    return (ACCTS = data || []);
  }
  const postable = () => ACCTS.filter(a => a.is_postable && a.active);

  async function glHome() {
    if (!gate()) return; loading();
    const [h, js, up] = await Promise.all([rpc('gl_health'), supabase.from('gl_journals').select('*').order('created_at', { ascending: false }).limit(8), rpc('gl_unposted', null, true)]); if (!h) return out('');
    const pend = Object.entries(up || {}).filter(([, v]) => N(v.count) > 0), pendN = pend.reduce((s, [, v]) => s + N(v.count), 0);
    kp(kpi('Postable accounts', h.accounts, 'Chart of accounts', 'kpi-blue') + kpi('Draft journals', h.drafts, 'Not yet in the books', h.drafts ? 'kpi-orange' : 'kpi-green') + kpi('Posted journals', h.posted, `${h.posted_month} this month`, 'kpi-green') +
      kpi('Not yet in ledger', pendN, 'Receipts, bills, expenses, payroll…', pendN ? 'kpi-orange' : 'kpi-green') + kpi('Last entry', h.last_entry ? D(h.last_entry) : '—', '', 'kpi-gold') + kpi('Books balanced', h.balanced ? 'Yes' : 'NO', 'Debits equal credits', h.balanced ? 'kpi-green' : 'kpi-red'));
    out(head('General Ledger', btn('+ New journal', 'fcJe()', 1) + btn('Trial balance', "renderFinance('tb')") + btn('Income statement', "renderFinance('pl')") + btn('Balance sheet', "renderFinance('bs')") + btn('Chart of accounts', "renderFinance('coa')")) +
      `<div class="hr-grid">${card('Waiting to be posted to the ledger', pendN ? pendN + ' item(s)' : 'Up to date', pend.length
        ? pend.map(([k, v]) => row(esc(UNP_LABEL[k] || k), `${N(v.count)} · ${M(v.amount)}`)).join('') + `<div style="margin-top:12px">${btn('Post to ledger now', 'fcPostPending()', 1)}</div><p style="color:var(--text-3);font-size:12px;margin:8px 0 0;line-height:1.55">Creates one posted journal per item. Items that cannot be posted (for example in a closed period) stay here with the reason shown.</p>`
        : '<div style="font-size:12.5px;color:var(--text-2);line-height:1.7">Every invoice, receipt, bill, approved expense, payroll run, depreciation charge and staff loan recorded so far is already in the ledger.</div>')}
      ${card('How the ledger protects the books', '', `<div style="font-size:12.5px;color:var(--text-2);line-height:1.7">
        <div>• Every journal needs at least two lines and must balance to the cent before it can be posted.</div>
        <div>• Posted journals are locked. Mistakes are fixed by <b>reversing</b> the journal, which leaves a full audit trail.</div>
        <div>• Periods closed under <b>Controls</b> accept new postings from administrators only.</div>
        <div>• Reports include posted and reversed journals; drafts never affect any figure.</div></div>`)}</div>` +
      head('Latest journals') + tbl(['No.', 'Date', 'Type', 'Memo', 'Status', ''], (js.data || []).map(j => [`<b>${esc(j.journal_no)}</b>`, D(j.entry_date), esc(SRC[j.source_type] || j.source_type || ''), esc(j.memo || '—'), sbadge(j.status), btn('View', `fcJv('${j.id}')`)]), 'No journals yet. Post pending items above, or start with an opening-balance journal.'));
  }
  window.fcPostPending = async () => {
    if (!confirm('Post all pending receipts, bills, expenses, payroll, invoices and other items to the general ledger?')) return;
    const r = await rpc('gl_post_pending', { p_limit: 500 }); if (!r) return;
    addAudit(who(), 'Posted to ledger', `${r.posted} posted, ${r.failed} failed`);
    const errs = r.errors || [];
    if (N(r.failed) && errs.length) {
      openModal('Posted ' + N(r.posted) + ' · ' + N(r.failed) + ' could not be posted', `<p style="font-size:13px;color:var(--text-2);line-height:1.6">These items stay in the waiting list. Fix the cause (for example reopen the period or complete the record) and post again.</p>` +
        tbl(['Type', 'Reason'], errs.map(e => [esc(UNP_LABEL[e.type] || e.type), esc(e.error || '')]), 'No details') + `<div style="margin-top:12px">${btn('Close', 'closeM2()')}</div>`);
    } else toast(`${N(r.posted)} item(s) posted to the ledger${N(r.skipped) ? `, ${N(r.skipped)} skipped` : ''}`, N(r.posted) ? 'success' : 'info');
    glHome();
  };

  /* ---- chart of accounts ---- */
  const COA_SUB = { asset: ['heading', 'current_asset', 'fixed_asset'], liability: ['heading', 'current_liability', 'long_term_liability'], equity: ['heading', 'equity'], revenue: ['heading', 'operating_revenue', 'other_income'], expense: ['heading', 'direct_cost', 'operating_expense', 'tax'] };
  const COA = { table: 'gl_accounts', title: 'Account', host: 'financeBody', kpiHost: 'financeKpis', canEdit: canFinance, canDelete: isAdmin, refresh: () => renderFinance('coa'),
    fields: [{ k: 'code', l: 'Account code (4–6 digits)', r: 1 }, { k: 'name', l: 'Account name', r: 1 }, { k: 'type', l: 'Type', t: 'select', o: ['asset', 'liability', 'equity', 'revenue', 'expense'] },
      { k: 'subtype', l: 'Sub-type', t: 'select', o: ['', ...new Set(Object.values(COA_SUB).flat())] }, { k: 'is_postable', l: 'Can be posted to?', t: 'select', o: ['true', 'false'], d: 'true' }, { k: 'active', l: 'Active', t: 'select', o: ['true', 'false'], d: 'true' }, { k: 'notes', l: 'Notes', t: 'textarea' }],
    beforeSave: r => { r.is_postable = String(r.is_postable) !== 'false'; r.active = String(r.active) !== 'false'; return /^[0-9]{4,6}$/.test(r.code || '') ? null : 'Account code must be 4 to 6 digits'; } };
  async function coa() {
    if (!gate()) return; loading(); const a = await loadAccounts(); H.rows.gl_accounts = a; H.cfg.gl_accounts = COA;
    const lvl = x => (!x.is_postable ? (/000$/.test(x.code) ? 0 : 1) : 2), TY = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses' };
    kp(kpi('Accounts', a.length, `${postable().length} postable`, 'kpi-blue') + Object.keys(TY).map(t => kpi(TY[t], a.filter(x => x.type === t && x.is_postable).length, 'postable', 'kpi-gold')).join(''));
    out(head('Chart of accounts', canFinance() ? btn('+ New account', "fcAcct()", 1) + btn('⬇ Export', 'fcCoaCsv()') : '') +
      tbl(['Code', 'Account', 'Type', 'Sub-type', 'Posting', 'Status', ''], a.map(x => [`<span style="padding-left:${lvl(x) * 16}px"><b>${esc(x.code)}</b></span>`, `<span style="padding-left:${lvl(x) * 16}px;${x.is_postable ? '' : 'font-weight:700'}">${esc(x.name)}</span>`, esc(x.type), esc((x.subtype || '').replace(/_/g, ' ')), x.is_postable ? 'Postable' : 'Heading', x.active ? sbadge('active') : '<span class="hb hb-r">inactive</span>',
        `${btn('Ledger', `fcLedger('${x.id}')`)}${btn('Edit', `fcAcct('${x.id}')`)}`]), 'No accounts') +
      note('System accounts cannot be deleted, only deactivated. An account that already has postings cannot change type or become a heading.'));
  }
  window.fcAcct = id => { H.cfg.gl_accounts = COA; H.open('gl_accounts', id); };
  window.fcCoaCsv = () => csv('chart-of-accounts-' + T() + '.csv', [['Code', 'Name', 'Type', 'Sub-type', 'Postable', 'Active']].concat(ACCTS.map(a => [a.code, a.name, a.type, a.subtype, a.is_postable, a.active])));

  /* ---- journals ---- */
  async function journals() {
    if (!gate()) return; loading();
    let q = supabase.from('gl_journals').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(100);
    if (ST.jf !== 'all') q = q.eq('status', ST.jf);
    const { data, error } = await q; if (error) return out(`<div class="ops-notice">${esc(error.message)}</div>`);
    const tot = {}, ids = (data || []).map(j => j.id);
    if (ids.length) { const { data: ls } = await supabase.from('gl_lines').select('journal_id,debit').in('journal_id', ids); (ls || []).forEach(l => { tot[l.journal_id] = (tot[l.journal_id] || 0) + N(l.debit); }); }
    kp('');
    out(head('Journals', ['all', 'draft', 'posted', 'reversed'].map(f => `<button class="filter-btn${ST.jf === f ? ' active' : ''}" onclick="fcJf('${f}')">${f[0].toUpperCase() + f.slice(1)}</button>`).join('') + btn('+ New journal', 'fcJe()', 1)) +
      tbl(['No.', 'Date', 'Type', 'Memo', 'Amount', 'Status', ''], (data || []).map(j => [`<b>${esc(j.journal_no)}</b>`, D(j.entry_date), esc(SRC[j.source_type] || j.source_type || ''), esc(j.memo || '—'), R(num(tot[j.id])), sbadge(j.status),
        btn('View', `fcJv('${j.id}')`) + (j.status === 'draft' ? btn('Edit', `fcJe('${j.id}')`) : '')]), 'No journals match') + note('Showing the latest 100. Open a posted journal to reverse it.'));
  }
  window.fcJf = f => { ST.jf = f; renderFinance('journals'); };

  const JE = { id: null, lines: [] };
  const blank = () => ({ account_id: '', debit: '', credit: '', memo: '', cost_centre: '', party: '' });
  window.fcJe = async id => {
    if (!canFinance()) return toast('Finance access required', 'error');
    await loadAccounts(); JE.id = id || null; JE.lines = [blank(), blank()]; let hd = { entry_date: T(), memo: '', source_type: 'manual' };
    if (id) { const j = await rpc('gl_journal_get', { p_id: id }); if (!j) return; if (j.status !== 'draft') return toast('Only draft journals can be edited', 'error'); hd = j; JE.lines = j.lines.map(l => ({ account_id: l.account_id, debit: N(l.debit) || '', credit: N(l.credit) || '', memo: l.memo || '', cost_centre: l.cost_centre || '', party: l.party || '' })); }
    openModal(id ? 'Edit journal ' + (hd.journal_no || '') : 'New journal', `<div class="form-row-2">${fld('Date', `<input type="date" id="je_date" value="${esc(hd.entry_date)}">`)}${fld('Type', sel('je_type', Object.entries(SRC_MANUAL), SRC_MANUAL[hd.source_type] ? hd.source_type : 'manual'))}</div>
      ${fld('Memo / narration', `<input id="je_memo" value="${esc(hd.memo || '')}" placeholder="What is this journal for?">`)}
      <div id="je_lines" style="overflow-x:auto"></div><div id="je_tot" style="margin:8px 0;font-size:12.5px"></div>
      <div id="je_err" style="color:var(--red);font-size:12px;min-height:16px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${btn('+ Add line', 'fcJeAdd()')}<span style="flex:1"></span>${btn('Save draft', 'fcJeSave(false)')}${btn('Save & post', 'fcJeSave(true)', 1)}</div>`);
    const m = document.querySelector('#modalOverlay .modal-box'); if (m) m.style.maxWidth = '980px';
    jeDraw();
  };
  function jeDraw() {
    const opts = '<option value="">— account —</option>' + postable().map(a => `<option value="${a.id}">${esc(a.code)} · ${esc(a.name)}</option>`).join('');
    $('je_lines').innerHTML = `<table class="data-table"><thead><tr><th style="min-width:230px">Account</th><th>Debit</th><th>Credit</th><th>Line memo</th><th>Cost centre</th><th>Party</th><th></th></tr></thead><tbody>${JE.lines.map((l, i) => `<tr>
      <td><select onchange="fcJeSet(${i},'account_id',this.value)">${opts.replace(`value="${l.account_id}"`, `value="${l.account_id}" selected`)}</select></td>
      <td><input type="number" step="0.01" min="0" value="${esc(l.debit)}" style="width:110px" oninput="fcJeSet(${i},'debit',this.value)"></td>
      <td><input type="number" step="0.01" min="0" value="${esc(l.credit)}" style="width:110px" oninput="fcJeSet(${i},'credit',this.value)"></td>
      <td><input value="${esc(l.memo)}" oninput="fcJeSet(${i},'memo',this.value)"></td>
      <td><select onchange="fcJeSet(${i},'cost_centre',this.value)">${['', ...HR_DEPTS].map(c => `<option ${c === l.cost_centre ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
      <td><input value="${esc(l.party)}" oninput="fcJeSet(${i},'party',this.value)" style="width:120px"></td>
      <td>${JE.lines.length > 2 ? `<button class="action-btn ghost" onclick="fcJeDel(${i})">✕</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
    jeTotals();
  }
  function jeTotals() {
    const dr = r2(JE.lines.reduce((s, l) => s + N(l.debit), 0)), cr = r2(JE.lines.reduce((s, l) => s + N(l.credit), 0)), diff = r2(dr - cr), el = $('je_tot');
    if (el) el.innerHTML = `Debits <b>${num(dr)}</b> · Credits <b>${num(cr)}</b> · ${diff === 0 && dr > 0 ? '<b style="color:var(--green)">Balanced</b>' : `<b style="color:var(--amber)">Out of balance by ${num(Math.abs(diff))}</b>`}`;
  }
  window.fcJeSet = (i, k, v) => { JE.lines[i][k] = v; if (k === 'debit' && N(v)) JE.lines[i].credit = ''; if (k === 'credit' && N(v)) JE.lines[i].debit = ''; if (k === 'debit' || k === 'credit') { jeTotals(); if (N(v)) { const o = document.querySelectorAll('#je_lines tbody tr')[i]?.querySelectorAll('input[type=number]'); if (o) o[k === 'debit' ? 1 : 0].value = ''; } } };
  window.fcJeAdd = () => { JE.lines.push(blank()); jeDraw(); };
  window.fcJeDel = i => { JE.lines.splice(i, 1); jeDraw(); };
  window.fcJeSave = async post => {
    const err = $('je_err'); err.textContent = '';
    const lines = JE.lines.filter(l => l.account_id || N(l.debit) || N(l.credit));
    if (lines.length < 2) { err.textContent = 'A journal needs at least two lines.'; return; }
    if (lines.some(l => !l.account_id)) { err.textContent = 'Choose an account on every line.'; return; }
    const dr = r2(lines.reduce((s, l) => s + N(l.debit), 0)), cr = r2(lines.reduce((s, l) => s + N(l.credit), 0));
    if (post && dr !== cr) { err.textContent = `Out of balance by ${num(Math.abs(dr - cr))}. A journal must balance before posting.`; return; }
    if (post && !confirm('Post this journal? Posted journals can only be reversed, not edited.')) return;
    const s = await rpc('gl_save_journal', { p_id: JE.id, p_header: { entry_date: val('je_date'), memo: val('je_memo'), source_type: val('je_type') }, p_lines: lines.map(l => ({ account_id: l.account_id, debit: N(l.debit), credit: N(l.credit), memo: l.memo, cost_centre: l.cost_centre, party: l.party })) });
    if (!s) return;
    const jid = s.id || JE.id;
    if (post) { if (!jid) return toast('Saved, but could not post automatically. Open it from the list.', 'error'); const p = await rpc('gl_post_journal', { p_id: jid }); if (!p) { JE.id = jid; return; } addAudit(who(), 'Journal posted', `${p.journal_no || ''} ${val('je_memo')}`.trim()); toast('Journal posted', 'success'); }
    else { addAudit(who(), 'Journal saved (draft)', val('je_memo')); toast('Draft saved', 'success'); }
    closeM(); if (state.currentSection === 'finance') renderFinance(['gl', 'journals'].includes(window._finTab) ? window._finTab : 'journals');
  };
  window.fcJv = async id => {
    const j = await rpc('gl_journal_get', { p_id: id }); if (!j) return;
    openModal(`${j.journal_no} · ${j.status}`, `<div class="hr-row"><span>Date</span><b>${D(j.entry_date)}</b></div><div class="hr-row"><span>Type</span><b>${esc(SRC[j.source_type] || j.source_type || '')}</b></div><div class="hr-row"><span>Memo</span><b>${esc(j.memo || '—')}</b></div>
      ${j.reversal_of ? '<div class="ops-notice" style="margin:8px 0">This journal reverses an earlier entry.</div>' : ''}${j.reversed_by ? '<div class="ops-notice" style="margin:8px 0">This journal has been reversed.</div>' : ''}
      <div style="margin-top:10px">${tbl(['Account', 'Memo', 'Cost centre', 'Party', 'Debit', 'Credit'], j.lines.map(l => [`<b>${esc(l.code)}</b> ${esc(l.account)}`, esc(l.memo || ''), esc(l.cost_centre || ''), esc(l.party || ''), R(N(l.debit) ? num(l.debit) : ''), R(N(l.credit) ? num(l.credit) : '')]), 'No lines', ['Total', '', '', '', R(num(j.total_debit)), R(num(j.total_credit))])}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">${j.status === 'draft' ? btn('Edit', `closeModal({target:document.getElementById('modalOverlay')});fcJe('${j.id}')`) + btn('Post', `fcJpost('${j.id}')`, 1) + btn('Delete draft', `fcJdel('${j.id}')`) : ''}${j.status === 'posted' ? btn('Reverse…', `fcJrev('${j.id}')`) : ''}</div>`);
  };
  window.fcJpost = async id => { if (!confirm('Post this journal?')) return; const p = await rpc('gl_post_journal', { p_id: id }); if (!p) return; addAudit(who(), 'Journal posted', p.journal_no || ''); toast('Journal posted', 'success'); closeM(); if (state.currentSection === 'finance') renderFinance(window._finTab); };
  window.fcJdel = async id => { if (!confirm('Delete this draft journal?')) return; const { error } = await supabase.from('gl_journals').delete().eq('id', id); if (error) return toast(error.message, 'error'); toast('Draft deleted', 'success'); closeM(); renderFinance(window._finTab); };
  window.fcJrev = async id => {
    const d = prompt('Reversal date (YYYY-MM-DD)', T()); if (!d) return; if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return toast('Use the format YYYY-MM-DD', 'error');
    const why = prompt('Reason for the reversal', ''); if (why === null) return;
    const r = await rpc('gl_reverse_journal', { p_id: id, p_date: d, p_reason: why || null }); if (!r) return;
    addAudit(who(), 'Journal reversed', `${id} ${why || ''}`.trim()); toast('Journal reversed', 'success'); closeM(); renderFinance(window._finTab);
  };

  /* ---- reports ---- */
  async function trialBalance() {
    if (!gate()) return; loading(); const p = PS.tb, d = await rpc('gl_trial_balance', { p_from: p.from, p_to: p.to }); if (!d) return out(periodBar('tb'));
    window._tb = d; kp(kpi('Total debits', M(d.total_debit), `${D(p.from)} – ${D(p.to)}`, 'kpi-blue') + kpi('Total credits', M(d.total_credit), 'Same period', 'kpi-blue') + kpi('Closing position', d.balanced ? 'In balance' : 'OUT OF BALANCE', `Dr ${M(d.closing_debit)}`, d.balanced ? 'kpi-green' : 'kpi-red'));
    out(periodBar('tb') + head('Trial balance', btn('⬇ Export', 'fcTbCsv()')) + tbl(['Code', 'Account', 'Type', 'Opening', 'Debit', 'Credit', 'Closing Dr', 'Closing Cr'],
      d.rows.map(r => [`<b>${esc(r.code)}</b>`, `<a href="#" onclick="fcLedger('${r.id}');return false">${esc(r.name)}</a>`, esc(r.type), R(dc(r.opening)), R(num(r.debit)), R(num(r.credit)), R(N(r.closing_dr) ? num(r.closing_dr) : ''), R(N(r.closing_cr) ? num(r.closing_cr) : '')]),
      'No postings in this period yet.', ['', 'Totals', '', '', R(num(d.total_debit)), R(num(d.total_credit)), R(num(d.closing_debit)), R(num(d.closing_credit))]));
  }
  window.fcTbCsv = () => { const d = window._tb; if (d) csv(`trial-balance-${d.from}_${d.to}.csv`, [['Code', 'Account', 'Type', 'Opening', 'Debit', 'Credit', 'Closing Dr', 'Closing Cr']].concat(d.rows.map(r => [r.code, r.name, r.type, r.opening, r.debit, r.credit, r.closing_dr, r.closing_cr]))); };

  const group = (rows, subs) => subs.map(([s, label]) => { const rs = rows.filter(r => r.subtype === s); return rs.length ? { label, rows: rs, total: rs.reduce((t, r) => t + N(r.amount ?? r.balance), 0) } : null; }).filter(Boolean);
  const stmt = (groups, key) => groups.map(g => `<div class="hr-row" style="border:0;padding-top:12px"><b style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:var(--text-3)">${g.label}</b><span></span></div>` +
    g.rows.map(r => `<div class="hr-row"><span><small style="color:var(--text-3)">${esc(r.code)}</small> ${esc(r.name)}</span><span>${num(r[key])}</span></div>`).join('') + `<div class="hr-row" style="font-weight:700"><span>Total ${g.label.toLowerCase()}</span><span>${num(g.total)}</span></div>`).join('');
  async function incomeStatement() {
    if (!gate()) return; loading(); const p = PS.pl, d = await rpc('gl_income_statement', { p_from: p.from, p_to: p.to }); if (!d) return out(periodBar('pl'));
    window._pl = d; const gp = N(d.operating_revenue) - N(d.direct_costs);
    kp(kpi('Revenue', M(d.revenue), `${D(p.from)} – ${D(p.to)}`, 'kpi-green') + kpi('Gross profit', M(gp), N(d.operating_revenue) ? Math.round(gp / N(d.operating_revenue) * 100) + '% margin' : '', 'kpi-blue') + kpi('Expenses', M(d.expenses), 'Direct + operating + tax', 'kpi-orange') + kpi('Net profit', M(d.net_profit), 'Revenue − expenses', N(d.net_profit) >= 0 ? 'kpi-green' : 'kpi-red'));
    const rev = group(d.rows, [['operating_revenue', 'Operating revenue'], ['other_income', 'Other income']]), dir = group(d.rows, [['direct_cost', 'Direct costs']]), opx = group(d.rows, [['operating_expense', 'Operating expenses'], ['tax', 'Tax']]);
    out(periodBar('pl') + head('Income statement', btn('⬇ Export', 'fcPlCsv()')) + (d.rows.length ? `<div class="hr-card">${stmt(rev, 'amount')}${stmt(dir, 'amount')}<div class="hr-row" style="font-weight:700;background:var(--gold-dim)"><span>Gross profit</span><span>${num(gp)}</span></div>${stmt(opx, 'amount')}<div class="hr-row" style="font-weight:700;font-size:15px;background:var(--gold-dim);margin-top:8px"><span>Net profit / (loss)</span><span>${num(d.net_profit)}</span></div></div>` : '<div class="empty-state" style="padding:40px"><div class="empty-state-label">No posted journals in this period.</div></div>') + note('Amounts in KSh. Revenue and expenses are shown as positive figures on their natural side.'));
  }
  window.fcPlCsv = () => { const d = window._pl; if (d) csv(`income-statement-${d.from}_${d.to}.csv`, [['Code', 'Account', 'Sub-type', 'Amount']].concat(d.rows.map(r => [r.code, r.name, r.subtype, r.amount]), [['', 'Net profit', '', d.net_profit]])); };

  async function balanceSheet() {
    if (!gate()) return; loading(); const d = await rpc('gl_balance_sheet', { p_as_at: ST.asat }); if (!d) return out(periodBar('bs', 'asat'));
    window._bs = d; const le = N(d.equity) + N(d.earnings);
    kp(kpi('Total assets', M(d.assets), 'As at ' + D(d.as_at), 'kpi-blue') + kpi('Liabilities', M(d.liabilities), '', 'kpi-orange') + kpi('Equity + earnings', M(le), '', 'kpi-green') + kpi('Balance check', d.balanced ? 'Balanced' : 'OUT OF BALANCE', 'Assets = liabilities + equity', d.balanced ? 'kpi-green' : 'kpi-red'));
    const as = group(d.rows.filter(r => r.type === 'asset'), [['current_asset', 'Current assets'], ['fixed_asset', 'Non-current assets']]), li = group(d.rows.filter(r => r.type === 'liability'), [['current_liability', 'Current liabilities'], ['long_term_liability', 'Long-term liabilities']]), eq = group(d.rows.filter(r => r.type === 'equity'), [['equity', 'Equity']]);
    out(periodBar('bs', 'asat') + head('Balance sheet', btn('⬇ Export', 'fcBsCsv()')) + (d.rows.length || N(d.earnings) ? `<div class="hr-grid"><div class="hr-card"><h4>Assets</h4>${stmt(as, 'balance')}<div class="hr-row" style="font-weight:700;background:var(--gold-dim)"><span>Total assets</span><span>${num(d.assets)}</span></div></div>
      <div class="hr-card"><h4>Liabilities & equity</h4>${stmt(li, 'balance')}<div class="hr-row" style="font-weight:700"><span>Total liabilities</span><span>${num(d.liabilities)}</span></div>${stmt(eq, 'balance')}<div class="hr-row"><span>Retained & current-year earnings</span><span>${num(d.earnings)}</span></div><div class="hr-row" style="font-weight:700;background:var(--gold-dim)"><span>Total liabilities & equity</span><span>${num(N(d.liabilities) + le)}</span></div></div></div>` : '<div class="empty-state" style="padding:40px"><div class="empty-state-label">No posted journals up to this date.</div></div>'));
  }
  window.fcBsCsv = () => { const d = window._bs; if (d) csv(`balance-sheet-${d.as_at}.csv`, [['Code', 'Account', 'Type', 'Sub-type', 'Balance']].concat(d.rows.map(r => [r.code, r.name, r.type, r.subtype, r.balance]), [['', 'Earnings', '', '', d.earnings]])); };

  async function accountLedger() {
    if (!gate()) return; loading(); await loadAccounts(); const p = PS.ledger;
    const picker = `<div class="hr-card" style="margin-bottom:12px"><div class="erp-tools" style="margin:0">${sel('fc_acct', [['', '— choose an account —']].concat(postable().map(a => [a.id, a.code + ' · ' + a.name])), ST.acct, 'style="min-width:300px" onchange="fcAcctPick(this.value)"')}</div></div>`;
    if (!ST.acct) { kp(''); return out(periodBar('ledger') + picker + '<div class="empty-state" style="padding:40px"><div class="empty-state-label">Choose an account to see its ledger.</div></div>'); }
    const d = await rpc('gl_account_ledger', { p_account: ST.acct, p_from: p.from, p_to: p.to }); if (!d) return out(periodBar('ledger') + picker);
    window._lg = d; kp(kpi('Opening balance', dc(d.opening), D(p.from), 'kpi-blue') + kpi('Debits', M(d.total_debit), '', 'kpi-gold') + kpi('Credits', M(d.total_credit), '', 'kpi-gold') + kpi('Closing balance', dc(N(d.opening) + N(d.total_debit) - N(d.total_credit)), D(p.to), 'kpi-green'));
    out(periodBar('ledger') + picker + head(`${esc(d.account.code)} · ${esc(d.account.name)}`, btn('⬇ Export', 'fcLgCsv()')) + tbl(['Date', 'Journal', 'Memo', 'Party', 'Debit', 'Credit', 'Balance'],
      [['', '', '<i>Opening balance</i>', '', '', '', R(dc(d.opening))]].concat(d.rows.map(r => [D(r.date), `<a href="#" onclick="fcJv('${r.journal_id}');return false">${esc(r.journal_no)}</a>`, esc(r.memo || ''), esc(r.party || ''), R(N(r.debit) ? num(r.debit) : ''), R(N(r.credit) ? num(r.credit) : ''), R(dc(r.balance))])), 'No postings', ['', '', 'Totals', '', R(num(d.total_debit)), R(num(d.total_credit)), '']));
  }
  window.fcAcctPick = v => { ST.acct = v; renderFinance('ledger'); };
  window.fcLedger = id => { ST.acct = id; renderFinance('ledger'); };
  window.fcLgCsv = () => { const d = window._lg; if (d) csv(`ledger-${d.account.code}-${d.from}_${d.to}.csv`, [['Date', 'Journal', 'Memo', 'Party', 'Debit', 'Credit', 'Balance']].concat([['', '', 'Opening balance', '', '', '', d.opening]], d.rows.map(r => [r.date, r.journal_no, r.memo, r.party, r.debit, r.credit, r.balance]))); };

  /* ═══════════════════════════════════════════════════════════════
     FIXED ASSETS
     ═══════════════════════════════════════════════════════════════ */
  const ASSET_CATS = ['Land & Buildings', 'Yard Equipment & Container Handlers', 'Motor Vehicles & Trailers', 'Furniture, Computers & Office Equipment', 'Other'];
  const FA = { table: 'fixed_assets', title: 'Asset', host: 'financeBody', kpiHost: 'financeKpis', needsEmp: true, canEdit: canFinance, canDelete: isAdmin, refresh: () => renderFinance('assets'),
    fields: [{ k: 'name', l: 'Asset name', r: 1 }, { k: 'asset_no', l: 'Asset tag / No.' }, { k: 'category', l: 'Category', t: 'select', o: ASSET_CATS }, { k: 'serial_no', l: 'Serial / chassis no.' }, { k: 'location', l: 'Location', d: 'Changamwe Depot' },
      { k: 'cost_centre', l: 'Cost centre', t: 'select', o: [''].concat(HR_DEPTS) }, { k: 'supplier', l: 'Supplier' }, { k: 'purchase_date', l: 'Purchase date', t: 'date', r: 1, d: T() }, { k: 'cost', l: 'Cost (KSh)', t: 'number', r: 1 }, { k: 'salvage_value', l: 'Residual value (KSh)', t: 'number', d: 0 },
      { k: 'useful_life_months', l: 'Useful life (months)', t: 'number', d: 60, r: 1 }, { k: 'method', l: 'Depreciation method', t: 'select', o: ['straight_line', 'reducing_balance'] }, { k: 'rate', l: 'Rate % (reducing balance only)', t: 'number' },
      { k: 'assigned_to', l: 'Assigned to', t: 'emp' }, { k: 'insured_until', l: 'Insured until', t: 'date' }, { k: 'warranty_until', l: 'Warranty until', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: ['active', 'disposed', 'written_off'] }, { k: 'notes', l: 'Notes', t: 'textarea' }],
    beforeSave: r => (N(r.salvage_value) > N(r.cost) ? 'Residual value cannot exceed cost' : r.method === 'reducing_balance' && !N(r.rate) ? 'Enter the reducing-balance rate' : null) };
  async function assets() {
    if (!gate()) return; loading(); const d = await rpc('fin_asset_register', { p_as_at: ST.asat }); if (!d) return out('');
    window._fa = d; const act = d.filter(a => a.status === 'active'), S = k => act.reduce((s, a) => s + N(a[k]), 0), soon = d.filter(a => [a.insured_until, a.warranty_until].some(x => x && (new Date(x) - Date.now()) / 864e5 < 30 && a.status === 'active'));
    kp(kpi('Assets in use', act.length, `${d.length - act.length} disposed / written off`, 'kpi-blue') + kpi('Total cost', M(S('cost')), '', 'kpi-gold') + kpi('Accumulated depreciation', M(S('acc_dep')), 'As at ' + D(ST.asat), 'kpi-orange') + kpi('Net book value', M(S('nbv')), '', 'kpi-green') + kpi('Monthly charge', M(S('month_charge')), 'Next depreciation run', 'kpi-blue') + kpi('Insurance / warranty expiring', soon.length, 'Within 30 days', soon.length ? 'kpi-red' : 'kpi-green'));
    out(head('Fixed asset register', btn('+ Add asset', 'fcAsset()', 1) + btn('Run depreciation', 'fcDepr()') + btn('⬇ Export', 'fcFaCsv()')) + tbl(['Tag', 'Asset', 'Category', 'Bought', 'Cost', 'Acc. dep.', 'NBV', 'This month', 'Cover', 'Status', ''],
      d.map(a => [esc(a.asset_no || '—'), `<b>${esc(a.name)}</b><br><small style="color:var(--text-3)">${esc(a.location || '')}${a.serial_no ? ' · ' + esc(a.serial_no) : ''}</small>`, esc(a.category || ''), D(a.purchase_date), R(num(a.cost)), R(num(a.acc_dep)), R(`<b>${num(a.nbv)}</b>`), R(num(a.month_charge)),
        `<small>Ins: ${D(a.insured_until)}<br>War: ${D(a.warranty_until)}</small>`, a.status === 'active' ? sbadge('active') : `<span class="hb hb-r">${esc(a.status.replace('_', ' '))}</span>`,
        btn('Edit', `fcAsset('${a.id}')`) + (a.status === 'active' ? btn('Dispose', `fcDispose('${a.id}')`) : '')]), 'No fixed assets recorded yet.') +
      note('Depreciation is calculated from the purchase date: straight-line spreads cost less residual value over the useful life; reducing-balance applies the rate to the opening book value. “Run depreciation” records one month and cannot double-charge a month; post the charge to the ledger from <b>Ledger Home</b>.'));
  }
  window.fcAsset = async id => { await H.loadEmployees(); await H.load('fixed_assets'); H.cfg.fixed_assets = FA; H.open('fixed_assets', id); };
  window.fcDepr = async () => {
    const p = prompt('Run depreciation for which month? (YYYY-MM)', T().slice(0, 7)); if (!p) return; if (!/^\d{4}-\d{2}$/.test(p)) return toast('Use the format YYYY-MM', 'error');
    const r = await rpc('fin_run_depreciation', { p_period: p }); if (!r) return; addAudit(who(), 'Depreciation run', `${r.period}: ${r.assets} assets, ${r.total}`); toast(`${r.assets} asset(s) depreciated · ${M(r.total)}`, 'success'); assets();
  };
  window.fcDispose = async id => {
    const a = (window._fa || []).find(x => x.id === id); if (!a) return;
    const dt = prompt(`Disposal date for ${a.name} (YYYY-MM-DD)`, T()); if (!dt) return; const pr = prompt('Sale proceeds (KSh, 0 if scrapped)', '0'); if (pr === null) return;
    const { error } = await supabase.from('fixed_assets').update({ status: 'disposed', disposed_on: dt, disposal_value: N(pr) }).eq('id', id); if (error) return toast(error.message, 'error');
    addAudit(who(), 'Asset disposed', `${a.name} proceeds ${N(pr)}`); toast('Asset marked as disposed', 'success'); assets();
  };
  window.fcFaCsv = () => csv('asset-register-' + T() + '.csv', [['Tag', 'Name', 'Category', 'Purchase date', 'Cost', 'Acc dep', 'NBV', 'Status']].concat((window._fa || []).map(a => [a.asset_no, a.name, a.category, a.purchase_date, a.cost, a.acc_dep, a.nbv, a.status])));

  /* ═══════════════════════════════════════════════════════════════
     PURCHASE ORDERS
     ═══════════════════════════════════════════════════════════════ */
  const PO = { id: null, lines: [], sup: [], vat: 16 };
  async function poVat() { try { const { data } = await supabase.from('finance_settings').select('vat_rate').eq('id', 1).maybeSingle(); if (data && data.vat_rate != null) PO.vat = N(data.vat_rate); } catch (e) { /* keep 16 */ } }
  const poLab = s => s.replace('_', ' ');
  async function purchaseOrders() {
    if (!gate()) return; loading(); let q = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }).limit(200); if (ST.pof !== 'all') q = q.eq('status', ST.pof);
    const [{ data, error }] = await Promise.all([q]); if (error) return out(`<div class="ops-notice">${esc(error.message)}</div>`);
    const all = ST.pof === 'all' ? data : (await supabase.from('purchase_orders').select('status,total,currency').limit(500)).data || [], open = all.filter(p => ['approved', 'sent', 'part_received'].includes(p.status));
    kp(kpi('Awaiting approval', all.filter(p => p.status === 'submitted').length, '', 'kpi-orange') + kpi('Open orders', open.length, 'Approved, not fully received', 'kpi-blue') + kpi('Committed (KES)', M(open.filter(p => !p.currency || p.currency === 'KES').reduce((s, p) => s + N(p.total), 0)), 'Open orders', 'kpi-gold') + kpi('Drafts', all.filter(p => p.status === 'draft').length, '', 'kpi-green'));
    out(head('Purchase orders', ['all', 'draft', 'submitted', 'approved', 'part_received', 'received', 'billed', 'rejected'].map(f => `<button class="filter-btn${ST.pof === f ? ' active' : ''}" onclick="fcPof('${f}')">${f === 'all' ? 'All' : poLab(f)}</button>`).join('') + btn('+ New order', 'fcPo()', 1)) +
      tbl(['PO No.', 'Supplier', 'Ordered', 'Expected', 'Cost centre', 'Total', 'Status', ''], (data || []).map(p => [`<b>${esc(p.po_no)}</b>`, esc(p.supplier), D(p.order_date), D(p.expected_date), esc(p.cost_centre || '—'), R(cur(p.total, p.currency)), sbadge(p.status), btn('Open', `fcPoView('${p.id}')`)]), 'No purchase orders yet.') +
      note('Raise → submit for approval → approve (not by the person who created it) → receive goods → raise the supplier bill. Receipts are checked against what was ordered, so you cannot receive more than the order.'));
  }
  window.fcPof = f => { ST.pof = f; renderFinance('po'); };
  const poLine = (l = {}) => ({ description: l.description || '', qty: l.qty ?? 1, unit_price: l.unit_price ?? '', vat_rate: l.vat_rate ?? PO.vat });
  window.fcPo = async id => {
    const { data: sup } = await supabase.from('suppliers').select('id,name,payment_terms').order('name'); PO.sup = sup || []; PO.id = id || null; await poVat(); let h = { order_date: T(), currency: 'KES', supplier: '', payment_terms: '30 days' }; PO.lines = [poLine()];
    if (id) { const [{ data: p }, { data: ls }] = await Promise.all([supabase.from('purchase_orders').select('*').eq('id', id).single(), supabase.from('po_lines').select('*').order('line_no').eq('po_id', id)]); if (!p) return toast('Order not found', 'error'); if (!['draft', 'rejected'].includes(p.status)) return toast('Only draft or rejected orders can be edited', 'error'); h = p; PO.lines = (ls || []).map(poLine); if (!PO.lines.length) PO.lines = [poLine()]; }
    openModal(id ? 'Edit ' + h.po_no : 'New purchase order', `<div class="form-row-2">${fld('Supplier', `<input id="po_sup" list="po_suplist" value="${esc(h.supplier)}" oninput="fcPoSup()" placeholder="Choose or type a supplier"><datalist id="po_suplist">${PO.sup.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist>`)}${fld('Currency', sel('po_cur', ['KES', 'USD'], h.currency, 'onchange="fcPoTotals()"'))}</div>
      <div class="form-row-2">${fld('Order date', `<input type="date" id="po_date" value="${esc(h.order_date)}">`)}${fld('Expected delivery', `<input type="date" id="po_exp" value="${esc(h.expected_date || '')}">`)}</div>
      <div class="form-row-2">${fld('Cost centre', sel('po_cc', [''].concat(HR_DEPTS), h.cost_centre || ''))}${fld('Category', sel('po_cat', [''].concat(typeof FIN_CATS !== 'undefined' ? FIN_CATS : []), h.category || ''))}</div>
      <div class="form-row-2">${fld('Payment terms', `<input id="po_pay" value="${esc(h.payment_terms || '')}">`)}${fld('Delivery terms', `<input id="po_del" value="${esc(h.delivery_terms || '')}">`)}</div>
      <div id="po_lines" style="overflow-x:auto"></div><div id="po_tot" style="margin:8px 0;font-size:12.5px"></div>${fld('Notes', `<textarea id="po_notes" rows="2">${esc(h.notes || '')}</textarea>`)}
      <div id="po_err" style="color:var(--red);font-size:12px;min-height:16px"></div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('+ Add line', 'fcPoAdd()')}<span style="flex:1"></span>${btn('Save draft', 'fcPoSave(false)')}${btn('Save & submit', 'fcPoSave(true)', 1)}</div>`);
    const m = document.querySelector('#modalOverlay .modal-box'); if (m) m.style.maxWidth = '900px'; poDraw();
  };
  window.fcPoSup = () => { const s = PO.sup.find(x => x.name === val('po_sup')); if (s && s.payment_terms && !val('po_pay')) $('po_pay').value = s.payment_terms; };
  function poDraw() {
    $('po_lines').innerHTML = `<table class="data-table"><thead><tr><th style="min-width:240px">Description</th><th>Qty</th><th>Unit price</th><th>VAT %</th><th>Line total</th><th></th></tr></thead><tbody>${PO.lines.map((l, i) => `<tr><td><input value="${esc(l.description)}" oninput="fcPoSet(${i},'description',this.value)"></td>
      <td><input type="number" step="0.01" min="0" value="${esc(l.qty)}" style="width:80px" oninput="fcPoSet(${i},'qty',this.value)"></td><td><input type="number" step="0.01" min="0" value="${esc(l.unit_price)}" style="width:110px" oninput="fcPoSet(${i},'unit_price',this.value)"></td>
      <td><input type="number" step="0.01" min="0" value="${esc(l.vat_rate)}" style="width:70px" oninput="fcPoSet(${i},'vat_rate',this.value)"></td><td id="po_lt${i}" style="text-align:right">${num(N(l.qty) * N(l.unit_price))}</td><td>${PO.lines.length > 1 ? `<button class="action-btn ghost" onclick="fcPoDel(${i})">✕</button>` : ''}</td></tr>`).join('')}</tbody></table>`; poTotals();
  }
  function poTotals() { const sub = r2(PO.lines.reduce((s, l) => s + N(l.qty) * N(l.unit_price), 0)), vat = r2(PO.lines.reduce((s, l) => s + N(l.qty) * N(l.unit_price) * N(l.vat_rate) / 100, 0)), c = val('po_cur') || 'KES'; const el = $('po_tot'); if (el) el.innerHTML = `Subtotal <b>${cur(sub, c)}</b> · VAT <b>${cur(vat, c)}</b> · Total <b>${cur(sub + vat, c)}</b>`; }
  window.fcPoTotals = poTotals;
  window.fcPoSet = (i, k, v) => { PO.lines[i][k] = v; const t = $('po_lt' + i); if (t) t.textContent = num(N(PO.lines[i].qty) * N(PO.lines[i].unit_price)); poTotals(); };
  window.fcPoAdd = () => { PO.lines.push(poLine()); poDraw(); }; window.fcPoDel = i => { PO.lines.splice(i, 1); poDraw(); };
  window.fcPoSave = async submit => {
    const err = $('po_err'); err.textContent = ''; const lines = PO.lines.filter(l => l.description.trim() || N(l.unit_price));
    if (!val('po_sup')) { err.textContent = 'Choose or type a supplier.'; return; } if (!lines.length) { err.textContent = 'Add at least one line item.'; return; } if (lines.some(l => !l.description.trim() || N(l.qty) <= 0)) { err.textContent = 'Every line needs a description and a quantity.'; return; }
    const s = PO.sup.find(x => x.name === val('po_sup'));
    const r = await rpc('fin_po_save', { p_id: PO.id, p_header: { supplier_id: s ? s.id : null, supplier: val('po_sup'), order_date: val('po_date'), expected_date: val('po_exp') || null, cost_centre: val('po_cc') || null, category: val('po_cat') || null, currency: val('po_cur'), delivery_terms: val('po_del'), payment_terms: val('po_pay'), notes: val('po_notes') }, p_lines: lines.map(l => ({ description: l.description.trim(), qty: N(l.qty), unit_price: N(l.unit_price), vat_rate: N(l.vat_rate) })) });
    if (!r) return; const id = r.id || r.po_id || PO.id;
    if (submit) { if (!id) return toast('Saved as draft. Open it from the list to submit.', 'info'); const q = await rpc('fin_po_submit', { p_id: id }); if (!q) return; addAudit(who(), 'PO submitted', val('po_sup')); toast('Submitted for approval', 'success'); refreshBadge(); } else toast('Draft saved', 'success');
    closeM(); purchaseOrders();
  };
  window.fcPoView = async id => {
    const [{ data: p }, { data: ls }] = await Promise.all([supabase.from('purchase_orders').select('*').eq('id', id).single(), supabase.from('po_lines').select('*').order('line_no').eq('po_id', id)]); if (!p) return;
    const mine = p.created_by === state.profile?.id && !isAdmin(), acts = [];
    if (['draft', 'rejected'].includes(p.status)) acts.push(btn('Edit', `closeM2();fcPo('${id}')`));
    if (p.status === 'draft') acts.push(btn('Submit for approval', `fcPoAct('submit','${id}')`, 1));
    if (p.status === 'submitted') acts.push(mine ? '<small style="color:var(--text-3)">You created this order, so someone else must approve it.</small>' : btn('Approve', `fcPoAct('approve','${id}')`, 1) + btn('Reject', `fcPoAct('reject','${id}')`));
    if (['approved', 'sent'].includes(p.status)) acts.push(p.status === 'approved' ? btn('Mark as sent', `fcPoSend('${id}')`) : '', btn('Receive goods', `fcPoRecv('${id}')`, 1));
    if (p.status === 'part_received') acts.push(btn('Receive more', `fcPoRecv('${id}')`, 1));
    if (['part_received', 'received'].includes(p.status) && !p.bill_id) acts.push(btn('Raise supplier bill', `fcPoAct('bill','${id}')`, 1));
    if (['draft', 'submitted', 'approved', 'sent', 'rejected'].includes(p.status)) acts.push(btn('Cancel order', `fcPoCancel('${id}')`));
    acts.push(btn('PDF', `fcPoPdf('${id}')`), btn('Print', `fcPoPdf('${id}',true)`));
    openModal(`${p.po_no} · ${poLab(p.status)}`, `<div class="hr-grid" style="grid-template-columns:1fr 1fr">${card('Order', '', row('Supplier', esc(p.supplier)) + row('Ordered', D(p.order_date)) + row('Expected', D(p.expected_date)) + row('Cost centre', esc(p.cost_centre || '—')))}${card('Terms', '', row('Payment', esc(p.payment_terms || '—')) + row('Delivery', esc(p.delivery_terms || '—')) + row('Currency', esc(p.currency || 'KES')) + (p.decision_note ? row('Decision note', esc(p.decision_note)) : ''))}</div>
      ${tbl(['Description', 'Qty', 'Received', 'Unit price', 'VAT %', 'Total'], (ls || []).map(l => [esc(l.description), N(l.qty), N(l.received_qty), R(num(l.unit_price)), N(l.vat_rate), R(num(N(l.qty) * N(l.unit_price)))]), 'No lines', ['Total', '', '', '', '', R(cur(p.total, p.currency))])}
      ${p.notes ? `<p style="font-size:12.5px;color:var(--text-2)">${esc(p.notes)}</p>` : ''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center">${acts.join('')}</div>`);
  };
  window.fcPoAct = async (a, id) => {
    let r, msg;
    if (a === 'submit') { r = await rpc('fin_po_submit', { p_id: id }); msg = 'Submitted for approval'; }
    else if (a === 'approve') { r = await rpc('fin_po_decide', { p_id: id, p_approve: true, p_note: null }); msg = 'Approved'; }
    else if (a === 'reject') { const n = prompt('Reason for rejecting', ''); if (n === null) return; r = await rpc('fin_po_decide', { p_id: id, p_approve: false, p_note: n || null }); msg = 'Rejected'; }
    else if (a === 'bill') { if (!confirm('Raise a supplier bill for the goods received so far?')) return; r = await rpc('fin_po_to_bill', { p_id: id }); msg = 'Supplier bill raised'; }
    if (!r) return; addAudit(who(), 'PO ' + a, id); toast(msg, 'success'); closeM(); purchaseOrders(); refreshBadge();
  };
  window.closeM2 = window.closeM2 || closeM;
  window.fcPoSend = async id => { const { error } = await supabase.from('purchase_orders').update({ status: 'sent' }).eq('id', id); if (error) return toast(error.message, 'error'); toast('Marked as sent to supplier', 'success'); closeM(); purchaseOrders(); };
  window.fcPoCancel = async id => { if (!confirm('Cancel this purchase order?')) return; const { error } = await supabase.from('purchase_orders').update({ status: 'cancelled' }).eq('id', id); if (error) return toast(error.message, 'error'); addAudit(who(), 'PO cancelled', id); toast('Order cancelled', 'success'); closeM(); purchaseOrders(); refreshBadge(); };
  window.fcPoRecv = async id => {
    const { data: ls } = await supabase.from('po_lines').select('*').order('line_no').eq('po_id', id); const open = (ls || []).filter(l => N(l.qty) > N(l.received_qty)); window._poRecv = { id, open };
    openModal('Receive goods', (open.length ? tbl(['Item', 'Ordered', 'Already received', 'Receive now'], open.map((l, i) => [esc(l.description), N(l.qty), N(l.received_qty), `<input type="number" step="0.01" min="0" max="${N(l.qty) - N(l.received_qty)}" id="rv_${i}" value="${N(l.qty) - N(l.received_qty)}" style="width:100px">`])) + `<div style="margin-top:12px">${btn('Confirm receipt', 'fcPoRecvGo()', 1)}</div>` : '<div class="ops-notice">Everything on this order has been received.</div>'));
  };
  window.fcPoRecvGo = async () => {
    const { id, open } = window._poRecv, lines = open.map((l, i) => ({ id: l.id, qty: N($('rv_' + i).value) })).filter(l => l.qty > 0); if (!lines.length) return toast('Enter a quantity to receive', 'error');
    const r = await rpc('fin_po_receive', { p_id: id, p_lines: lines }); if (!r) return; addAudit(who(), 'PO goods received', id); toast('Goods received', 'success'); closeM(); purchaseOrders();
  };
  window.fcPoPdf = async (id, print) => {
    if (!window.jspdf) return toast('PDF library not loaded', 'error');
    const [{ data: p }, { data: ls }] = await Promise.all([supabase.from('purchase_orders').select('*').eq('id', id).single(), supabase.from('po_lines').select('*').order('line_no').eq('po_id', id)]); if (!p) return;
    const doc = new window.jspdf.jsPDF(); let y = window.ghPdfLetterhead(doc, 14, 10, 182) + 8; const c = p.currency || 'KES';
    doc.setFont(undefined, 'bold'); doc.setFontSize(14); doc.setTextColor(10, 42, 122); doc.text('PURCHASE ORDER ' + p.po_no, 14, y); y += 9; doc.setFontSize(10); doc.setTextColor(40); doc.setFont(undefined, 'normal');
    [['Supplier', p.supplier], ['Order date', p.order_date], ['Expected', p.expected_date], ['Payment terms', p.payment_terms], ['Delivery terms', p.delivery_terms], ['Cost centre', p.cost_centre]].forEach(([a, b]) => { doc.text(a + ':', 14, y); doc.text(String(b || '—'), 52, y); y += 6; });
    y += 3; doc.setFont(undefined, 'bold'); doc.text('Description', 14, y); doc.text('Qty', 120, y, { align: 'right' }); doc.text('Unit price', 150, y, { align: 'right' }); doc.text('Total', 196, y, { align: 'right' }); doc.line(14, y + 2, 196, y + 2); y += 8; doc.setFont(undefined, 'normal');
    (ls || []).forEach(l => { if (y > 270) { doc.addPage(); y = 20; } doc.text(String(l.description).slice(0, 60), 14, y); doc.text(String(N(l.qty)), 120, y, { align: 'right' }); doc.text(num(l.unit_price), 150, y, { align: 'right' }); doc.text(num(N(l.qty) * N(l.unit_price)), 196, y, { align: 'right' }); y += 6.5; });
    y += 3; doc.line(14, y, 196, y); y += 7; doc.text('Subtotal', 150, y, { align: 'right' }); doc.text(c + ' ' + num(p.subtotal), 196, y, { align: 'right' }); y += 6; doc.text('VAT', 150, y, { align: 'right' }); doc.text(c + ' ' + num(p.vat), 196, y, { align: 'right' }); y += 7; doc.setFont(undefined, 'bold'); doc.text('TOTAL', 150, y, { align: 'right' }); doc.text(c + ' ' + num(p.total), 196, y, { align: 'right' });
    if (print && window.ghPrintPdf) window.ghPrintPdf(doc); else doc.save(`${p.po_no}.pdf`);
  };

  /* ═══════════════════════════════════════════════════════════════
     RECURRING ENTRIES
     ═══════════════════════════════════════════════════════════════ */
  const REC = { table: 'recurring_entries', title: 'Recurring Entry', host: 'financeBody', kpiHost: 'financeKpis', canEdit: canFinance, canDelete: isAdmin, refresh: () => renderFinance('recurring'),
    cols: [['name', 'Name'], ['kind', 'Creates', 'badge'], ['category', 'Category'], ['supplier', 'Supplier'], ['amount', 'Amount', 'money'], ['frequency', 'Frequency'], ['next_run', 'Next run', 'date'], ['last_run', 'Last run', 'date'], ['active', 'Active']],
    fields: [{ k: 'name', l: 'Name (e.g. Yard rent)', r: 1 }, { k: 'kind', l: 'Creates', t: 'select', o: ['expense', 'bill'] }, { k: 'category', l: 'Category', t: 'select', o: [''].concat(typeof FIN_CATS !== 'undefined' ? FIN_CATS : []) }, { k: 'cost_centre', l: 'Cost centre', t: 'select', o: [''].concat(HR_DEPTS) },
      { k: 'supplier', l: 'Supplier (for bills)' }, { k: 'amount', l: 'Amount (KSh)', t: 'number', r: 1 }, { k: 'vat_amount', l: 'VAT included (KSh)', t: 'number', d: 0 }, { k: 'paid_via', l: 'Paid via (expenses)', t: 'select', o: ['Bank', 'M-Pesa', 'Cheque', 'Petty Cash'] },
      { k: 'frequency', l: 'Frequency', t: 'select', o: ['monthly', 'weekly', 'quarterly', 'yearly'] }, { k: 'day_of_month', l: 'Day of month (1–28)', t: 'number', d: 1 }, { k: 'next_run', l: 'First / next run', t: 'date', r: 1, d: T() }, { k: 'end_date', l: 'Ends on (optional)', t: 'date' }, { k: 'active', l: 'Active', t: 'select', o: ['true', 'false'], d: 'true' }, { k: 'description', l: 'Description', t: 'textarea' }],
    beforeSave: r => { r.active = String(r.active) !== 'false'; r.day_of_month = Math.min(28, Math.max(1, N(r.day_of_month) || 1)); return null; },
    extra: () => btn('Run due items now', 'fcRecRun()', 1) };
  async function recurring() { if (!gate()) return; await H.render(REC, rows => { const a = rows.filter(r => r.active), due = a.filter(r => r.next_run && r.next_run <= T()); return kpi('Active schedules', a.length, '', 'kpi-blue') + kpi('Due now', due.length, 'Will be created on run', due.length ? 'kpi-orange' : 'kpi-green') + kpi('Monthly commitment', M(a.filter(r => r.frequency === 'monthly').reduce((s, r) => s + N(r.amount), 0)), 'Monthly items only', 'kpi-gold'); });
    $('financeBody').insertAdjacentHTML('beforeend', note('Rent, security contracts, insurance and licences repeat on schedule. Running creates a pending expense or an unpaid bill for each due occurrence, once; the cash-flow forecast also uses these schedules.')); }
  window.fcRecRun = async () => {
    if (!confirm('Create all recurring expenses and bills that are due up to today?')) return; const r = await rpc('fin_run_recurring', { p_upto: T() }); if (!r) return;
    const n = Array.isArray(r.created) ? r.created.length : N(r.created), sk = Array.isArray(r.skipped) ? r.skipped.length : N(r.skipped); addAudit(who(), 'Recurring run', `${n} created`); toast(`${n} created${sk ? `, ${sk} skipped` : ''}`, n ? 'success' : 'info'); recurring();
  };

  /* ═══════════════════════════════════════════════════════════════
     VAT & WITHHOLDING
     ═══════════════════════════════════════════════════════════════ */
  async function vat() {
    if (!gate()) return; loading(); const p = PS.vat, d = await rpc('fin_vat_return', { p_from: p.from, p_to: p.to }); if (!d) return out(periodBar('vat'));
    window._vat = d; const net = N(d.net_vat);
    kp(kpi('Output VAT', M(d.output.vat), `Sales ex-VAT ${M(d.output.sales_ex_vat)}`, 'kpi-orange') + kpi('Input VAT', M(d.input.vat), `Bills ${M(d.input.bills_vat)} · Expenses ${M(d.input.expenses_vat)}`, 'kpi-blue') + kpi(net >= 0 ? 'VAT payable' : 'VAT refundable', M(Math.abs(net)), `${D(p.from)} – ${D(p.to)}`, net >= 0 ? 'kpi-red' : 'kpi-green') + kpi('Withholding tax', M(d.wht.total), 'Bills + expenses', 'kpi-gold'));
    const rows = r => r.map(x => [D(x.date), esc(x.ref || ''), esc(x.party || ''), esc(x.source || ''), R(num(x.gross ?? x.amount)), R(num(x.vat ?? x.wht))]);
    out(periodBar('vat') + head(`VAT return · rate ${d.vat_rate}%`, btn('Save to statutory calendar', 'fcVatSave()', 1) + btn('⬇ Export', 'fcVatCsv()')) + `<div class="hr-grid">${card('Output VAT (sales)', M(d.output.vat), tbl(['Date', 'Ref', 'Customer', 'Source', 'Gross', 'VAT'], rows(d.output.rows || []), 'No taxable sales in this period'))}${card('Input VAT (purchases)', M(d.input.vat), tbl(['Date', 'Ref', 'Supplier', 'Source', 'Gross', 'VAT'], rows(d.input.rows || []), 'No input VAT in this period'))}</div>` +
      (d.wht.rows?.length ? head('Withholding tax deducted') + tbl(['Date', 'Ref', 'Party', 'Source', 'Gross', 'WHT'], rows(d.wht.rows)) : '') + note('Figures come from receipts, invoices, bills and expenses that carry VAT. “Save to statutory calendar” records the net VAT against this month’s VAT filing so it also feeds the cash-flow forecast. KRA VAT returns are due by the 20th of the following month.'));
  }
  window.fcVatSave = async () => {
    const d = window._vat; if (!d) return; const period = d.from.slice(0, 7), n = new Date(d.from), due = ld(new Date(n.getFullYear(), n.getMonth() + 1, 20));
    const { data: ex } = await supabase.from('statutory_filings').select('id,status').eq('kind', 'VAT').eq('period', period).maybeSingle();
    if (ex && ex.status !== 'due') return toast('That VAT filing is already marked ' + ex.status, 'info');
    const rec = { kind: 'VAT', period, due_date: due, amount: Math.max(0, N(d.net_vat)), status: 'due' }; const { error } = ex ? await supabase.from('statutory_filings').update({ amount: rec.amount }).eq('id', ex.id) : await supabase.from('statutory_filings').insert({ ...rec, created_by: state.profile?.id || null });
    if (error) return toast(error.message, 'error'); addAudit(who(), 'VAT saved to calendar', `${period} ${rec.amount}`); toast('Saved to the statutory calendar', 'success');
  };
  window.fcVatCsv = () => { const d = window._vat; if (!d) return; csv(`vat-${d.from}_${d.to}.csv`, [['Section', 'Date', 'Ref', 'Party', 'Gross', 'VAT']].concat((d.output.rows || []).map(x => ['Output', x.date, x.ref, x.party, x.gross, x.vat]), (d.input.rows || []).map(x => ['Input', x.date, x.ref, x.party, x.gross, x.vat]), [['Net VAT', '', '', '', '', d.net_vat]])); };

  /* ═══════════════════════════════════════════════════════════════
     STATUTORY CALENDAR
     ═══════════════════════════════════════════════════════════════ */
  const STATUTORY_KINDS = ['PAYE', 'NSSF', 'SHA (SHIF)', 'Housing Levy (AHL)', 'NITA', 'VAT', 'Withholding Tax', 'Installment Tax', 'Corporate Tax Return', 'Employer Annual Return (P10)'];
  const STAT = { table: 'statutory_filings', title: 'Filing', host: 'financeBody', kpiHost: 'financeKpis', canEdit: canFinance, canDelete: isAdmin, refresh: () => renderFinance('statutory'),
    fields: [{ k: 'kind', l: 'Obligation', t: 'select', o: STATUTORY_KINDS }, { k: 'period', l: 'Period (e.g. 2026-10)', r: 1 }, { k: 'due_date', l: 'Due date', t: 'date', r: 1 }, { k: 'amount', l: 'Amount due (KSh)', t: 'number' }, { k: 'status', l: 'Status', t: 'select', o: ['due', 'filed', 'paid', 'waived'] }, { k: 'filed_on', l: 'Filed on', t: 'date' }, { k: 'paid_on', l: 'Paid on', t: 'date' }, { k: 'reference', l: 'KRA / bank reference' }, { k: 'notes', l: 'Notes', t: 'textarea' }] };
  async function statutory() {
    if (!gate()) return; loading(); const rows = (await H.load('statutory_filings')).slice().sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))); H.cfg.statutory_filings = STAT; const t = T(), m = t.slice(0, 7);
    const open = rows.filter(r => r.status === 'due'), od = open.filter(r => r.due_date < t), soon = open.filter(r => r.due_date >= t && (new Date(r.due_date) - Date.now()) / 864e5 <= 14);
    kp(kpi('Overdue', od.length, M(od.reduce((s, r) => s + N(r.amount), 0)), od.length ? 'kpi-red' : 'kpi-green') + kpi('Due in 14 days', soon.length, M(soon.reduce((s, r) => s + N(r.amount), 0)), soon.length ? 'kpi-orange' : 'kpi-green') + kpi('Due this month', open.filter(r => r.due_date.slice(0, 7) === m).length, '', 'kpi-gold') + kpi('Settled', rows.filter(r => ['filed', 'paid'].includes(r.status)).length, 'Filed or paid', 'kpi-blue'));
    out(head('Statutory calendar', btn('+ Add filing', "fcStat()", 1) + btn('Generate year…', 'fcStatGen()')) + tbl(['Obligation', 'Period', 'Due', 'Amount', 'Status', 'Reference', ''], rows.map(r => { const late = r.status === 'due' && r.due_date < t; return [`<b>${esc(r.kind)}</b>`, esc(r.period), `<span style="${late ? 'color:var(--red);font-weight:700' : ''}">${D(r.due_date)}</span>`, R(N(r.amount) ? num(r.amount) : '—'), late ? '<span class="hb hb-r">overdue</span>' : sbadge(r.status), esc(r.reference || ''),
      (r.status === 'due' ? btn('Mark filed', `fcStatSet('${r.id}','filed')`) : '') + (['due', 'filed'].includes(r.status) ? btn('Mark paid', `fcStatSet('${r.id}','paid')`, r.status === 'filed') : '') + btn('Edit', `fcStat('${r.id}')`)]; }), 'No filings yet. Use “Generate year…” to create the standard Kenyan calendar.') +
      note('PAYE, SHIF and the Housing Levy fall due on the 9th of the following month, NSSF on the 15th, VAT on the 20th. Enter an amount against a filing and it flows into the cash-flow forecast.'));
  }
  window.fcStat = id => { H.cfg.statutory_filings = STAT; H.open('statutory_filings', id); };
  window.fcStatGen = async () => { const y = prompt('Generate the statutory calendar for which year?', String(new Date().getFullYear())); if (!y) return; const r = await rpc('fin_statutory_generate', { p_year: parseInt(y, 10) }); if (!r) return; addAudit(who(), 'Statutory calendar generated', `${r.year}: ${r.created}`); toast(`${r.created} filing(s) created for ${r.year}`, 'success'); statutory(); };
  window.fcStatSet = async (id, st) => {
    const ref = st === 'filed' ? prompt('KRA / portal reference (optional)', '') : null; if (st === 'filed' && ref === null) return;
    const u = st === 'filed' ? { status: 'filed', filed_on: T(), reference: ref || null } : { status: 'paid', paid_on: T() }; if (st === 'paid') { u.filed_on = (H.rows.statutory_filings.find(x => x.id === id) || {}).filed_on || T(); }
    const { error } = await supabase.from('statutory_filings').update(u).eq('id', id); if (error) return toast(error.message, 'error'); addAudit(who(), 'Statutory filing ' + st, id); toast('Updated', 'success'); statutory();
  };

  /* ═══════════════════════════════════════════════════════════════
     CREDIT CONTROL
     ═══════════════════════════════════════════════════════════════ */
  let CC = [];
  async function credit() {
    if (!gate()) return; loading(); const d = await rpc('fin_credit_control'); if (!d) return out(''); CC = d;
    const byCur = k => { const m = {}; d.forEach(r => { m[r.currency || 'KES'] = (m[r.currency || 'KES'] || 0) + N(r[k]); }); return Object.entries(m).map(([c, v]) => cur(v, c)).join(' · ') || M(0); };
    kp(kpi('Outstanding', byCur('outstanding'), `${d.length} customer line(s)`, 'kpi-blue') + kpi('Overdue', byCur('overdue'), '', d.some(r => N(r.overdue)) ? 'kpi-red' : 'kpi-green') + kpi('Over 90 days', byCur('b90p'), 'Highest risk', d.some(r => N(r.b90p)) ? 'kpi-red' : 'kpi-green') + kpi('On hold', d.filter(r => r.on_hold).length, 'Credit stopped', d.some(r => r.on_hold) ? 'kpi-orange' : 'kpi-green') + kpi('Over limit', d.filter(r => N(r.credit_limit) > 0 && N(r.outstanding) > N(r.credit_limit)).length, '', 'kpi-orange'));
    out(head('Credit control & collections', btn('⬇ Export', 'fcCcCsv()')) + tbl(['Customer', 'Terms', 'Limit', 'Outstanding', 'Not due', '1–30', '31–60', '61–90', '90+', 'Promise', 'Last contact', ''],
      d.map((r, i) => { const over = N(r.credit_limit) > 0 && N(r.outstanding) > N(r.credit_limit), c = r.currency; return [`<b>${esc(r.client)}</b>${r.on_hold ? ' <span class="hb hb-r">on hold</span>' : ''}${over ? ' <span class="hb hb-a">over limit</span>' : ''}<br><small style="color:var(--text-3)">${esc(r.contact_name || '')} ${esc(r.contact_phone || '')}</small>`, N(r.credit_days) ? N(r.credit_days) + ' d' : '—', R(N(r.credit_limit) ? num(r.credit_limit) : '—'), R(`<b>${cur(r.outstanding, c)}</b>`), R(num(r.not_due)), R(num(r.b1_30)), R(num(r.b31_60)), R(`<span style="color:${N(r.b61_90) ? 'var(--amber)' : ''}">${num(r.b61_90)}</span>`), R(`<span style="color:${N(r.b90p) ? 'var(--red)' : ''}">${num(r.b90p)}</span>`),
        r.promise_date ? `${D(r.promise_date)}<br><small>${N(r.promise_amount) ? num(r.promise_amount) : ''}</small>` : '—', r.last_note_at ? `${D(r.last_note_at)}<br><small style="color:var(--text-3)">${esc((r.last_note || '').slice(0, 40))}</small>` : '—', btn('Log call', `fcNote(${i})`) + btn('Terms', `fcTerms(${i})`)]; }), 'No customers with open invoices.') +
      note('Ageing is calculated from invoice due dates. Set a customer’s credit limit and terms, put an account on hold, and record every collection call with a promise-to-pay date; promises feed the cash-flow forecast.'));
  }
  window.fcNote = i => {
    const r = CC[i]; openModal('Collection note · ' + esc(r.client), `<div class="form-row-2">${fld('Channel', sel('cn_ch', ['Call', 'WhatsApp', 'Email', 'Visit', 'SMS']))}${fld('Promised pay date', '<input type="date" id="cn_date">')}</div>${fld('Promised amount', '<input type="number" step="0.01" id="cn_amt">')}${fld('Note', '<textarea id="cn_note" rows="3" placeholder="Who you spoke to and what was agreed"></textarea>')}<button class="action-btn" onclick="fcNoteSave(${i})">Save note</button>`);
  };
  window.fcNoteSave = async i => {
    const r = CC[i], n = val('cn_note'); if (!n && !val('cn_date')) return toast('Add a note or a promise date', 'error');
    const { error } = await supabase.from('collection_notes').insert({ client: r.client, channel: val('cn_ch'), note: n || null, promised_date: val('cn_date') || null, promised_amount: val('cn_amt') ? N(val('cn_amt')) : null, created_by: state.profile?.id || null }); if (error) return toast(error.message, 'error');
    addAudit(who(), 'Collection note', r.client); toast('Note saved', 'success'); closeM(); credit();
  };
  window.fcTerms = async i => {
    const r = CC[i], { data: c } = await supabase.from('customer_credit').select('*').eq('client', r.client).maybeSingle(), x = c || {};
    openModal('Credit terms · ' + esc(r.client), `<div class="form-row-2">${fld('Credit limit', `<input type="number" step="0.01" id="ct_lim" value="${esc(x.credit_limit ?? '')}">`)}${fld('Credit days', `<input type="number" id="ct_days" value="${esc(x.credit_days ?? 30)}">`)}</div>
      <div class="form-row-2">${fld('Contact person', `<input id="ct_name" value="${esc(x.contact_name || '')}">`)}${fld('Phone', `<input id="ct_phone" value="${esc(x.contact_phone || '')}">`)}</div>${fld('Email', `<input type="email" id="ct_mail" value="${esc(x.contact_email || '')}">`)}
      ${fld('Account status', sel('ct_hold', [['false', 'Active — can be invoiced'], ['true', 'On hold — stop credit']], String(!!x.on_hold)))}${fld('Notes', `<textarea id="ct_notes" rows="2">${esc(x.notes || '')}</textarea>`)}<button class="action-btn" onclick="fcTermsSave(${i},${c ? `'${c.id}'` : 'null'})">Save terms</button>`);
  };
  window.fcTermsSave = async (i, id) => {
    const r = CC[i], rec = { client: r.client, credit_limit: val('ct_lim') ? N(val('ct_lim')) : null, credit_days: N(val('ct_days')) || 0, on_hold: val('ct_hold') === 'true', contact_name: val('ct_name') || null, contact_phone: val('ct_phone') || null, contact_email: val('ct_mail') || null, notes: val('ct_notes') || null, updated_at: new Date().toISOString() };
    const { error } = id ? await supabase.from('customer_credit').update(rec).eq('id', id) : await supabase.from('customer_credit').insert({ ...rec, created_by: state.profile?.id || null }); if (error) return toast(error.message, 'error');
    addAudit(who(), 'Credit terms', `${r.client} limit ${rec.credit_limit ?? 'none'}${rec.on_hold ? ' · ON HOLD' : ''}`); toast('Credit terms saved', 'success'); closeM(); credit();
  };
  window.fcCcCsv = () => csv('credit-control-' + T() + '.csv', [['Customer', 'Currency', 'Limit', 'Outstanding', 'Not due', '1-30', '31-60', '61-90', '90+', 'On hold']].concat(CC.map(r => [r.client, r.currency, r.credit_limit, r.outstanding, r.not_due, r.b1_30, r.b31_60, r.b61_90, r.b90p, r.on_hold])));

  /* ═══════════════════════════════════════════════════════════════
     CASH-FLOW FORECAST
     ═══════════════════════════════════════════════════════════════ */
  async function fxLoad() { if (ST.fxLoaded) return; ST.fxLoaded = true; try { const { data } = await supabase.from('finance_settings').select('usd_kes').eq('id', 1).maybeSingle(); if (data && N(data.usd_kes) > 0) ST.fx = N(data.usd_kes); } catch (e) { /* keep default */ } }
  async function cashflow() {
    if (!gate()) return; loading(); await fxLoad(); const d = await rpc('fin_cashflow_forecast', { p_weeks: ST.weeks, p_usd_kes: ST.fx }); if (!d) return out('');
    window._cf = d; const neg = d.rows.find(r => N(r.closing) < 0);
    kp(kpi('Opening cash', M(d.opening), d.has_bank ? 'Bank book balance' : 'No bank account set up', d.has_bank ? 'kpi-blue' : 'kpi-orange') + kpi('Expected in', M(d.total_in), `${d.weeks} weeks`, 'kpi-green') + kpi('Expected out', M(d.total_out), '', 'kpi-orange') + kpi('Lowest balance', M(d.lowest.closing), `Week of ${D(d.lowest.start)}`, N(d.lowest.closing) < 0 ? 'kpi-red' : 'kpi-green') + kpi('Closing cash', M(d.rows.length ? d.rows[d.rows.length - 1].closing : d.opening), 'End of forecast', 'kpi-gold'));
    const W = 640, Hh = 150, vals = d.rows.map(r => N(r.closing)), mx = Math.max(1, ...vals, N(d.opening)), mn = Math.min(0, ...vals), sx = i => 20 + i * ((W - 40) / Math.max(1, vals.length - 1)), sy = v => 10 + (1 - (v - mn) / ((mx - mn) || 1)) * (Hh - 30);
    const line = vals.map((v, i) => `${sx(i)},${sy(v)}`).join(' ');
    out(`<div class="hr-card" style="margin-bottom:12px"><div class="erp-tools" style="margin:0 0 8px"><select id="cf_w" onchange="fcCfSet()">${[4, 8, 13, 26].map(w => `<option value="${w}" ${w === ST.weeks ? 'selected' : ''}>${w} weeks</option>`).join('')}</select><input type="number" id="cf_fx" value="${ST.fx}" step="0.01" style="width:120px" title="USD to KES rate" onchange="fcCfSet()"><span style="color:var(--text-3);font-size:12px;align-self:center">USD → KES rate for foreign-currency invoices</span></div></div>` +
      (d.has_bank ? '' : '<div class="ops-notice" style="margin-bottom:12px"><span style="flex:1;min-width:0">Add a bank account under <b>Bank Reconciliation</b> so the opening balance reflects real cash.</span></div>') + (neg ? `<div class="ops-notice" style="margin-bottom:12px;border-color:var(--red)"><span style="flex:1;min-width:0">Cash is projected to go negative in the week of <b>${D(neg.start)}</b>. Review receivables, delay non-critical payments, or arrange funding.</span></div>` : '') +
      `<div class="hr-card" style="margin-bottom:12px"><h4>Projected closing balance <small>KSh</small></h4><svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:auto"><line x1="20" x2="${W - 20}" y1="${sy(0)}" y2="${sy(0)}" stroke="var(--glass-edge)" stroke-dasharray="4 4"/><polyline fill="none" stroke="var(--gold)" stroke-width="2" points="${line}"/>${vals.map((v, i) => `<circle cx="${sx(i)}" cy="${sy(v)}" r="3" fill="${v < 0 ? 'var(--red)' : 'var(--gold)'}"><title>Week of ${d.rows[i].start}: ${num(v)}</title></circle>`).join('')}</svg></div>` +
      head('Week by week', btn('⬇ Export', 'fcCfCsv()')) + tbl(['Week starting', 'Money in', 'Money out', 'Net', 'Closing balance', 'What is in it'], d.rows.map(r => [D(r.start), R(num(r.inflow)), R(num(r.outflow)), R(`<span style="color:${N(r.net) < 0 ? 'var(--amber)' : 'var(--green)'}">${num(r.net)}</span>`), R(`<b style="color:${N(r.closing) < 0 ? 'var(--red)' : ''}">${num(r.closing)}</b>`),
        `<small style="color:var(--text-3)">${Object.entries(r.parts || {}).map(([k, v]) => `${esc(k.replace(/_/g, ' '))}: ${num(v)}`).join(' · ')}</small>`])) +
      card('How this forecast is built', '', `<div style="font-size:12.5px;color:var(--text-2);line-height:1.7">${(d.assumptions || []).map(a => `<div>• ${esc(a)}</div>`).join('')}</div>`));
  }
  window.fcCfSet = () => { ST.weeks = parseInt($('cf_w').value, 10) || 13; ST.fx = N($('cf_fx').value) || 129; renderFinance('cashflow'); };
  window.fcCfCsv = () => { const d = window._cf; if (d) csv('cashflow-forecast-' + T() + '.csv', [['Week starting', 'In', 'Out', 'Net', 'Closing']].concat(d.rows.map(r => [r.start, r.inflow, r.outflow, r.net, r.closing]))); };

  /* ═══════════════════════════════════════════════════════════════
     TAB WIRING (through GARGO_FIN.add; see finance.js for how the grouped tab bar is drawn)
     ═══════════════════════════════════════════════════════════════ */
  const CP = 'Control & planning', GL = 'General ledger', AT = 'Assets & tax';
  const reg = (id, label, fn, group) => F.add(id, label, () => { const m = document.querySelector('#modalOverlay .modal-box'); if (m) m.style.maxWidth = ''; return fn(); }, group);
  reg('approvals', 'Approvals', () => drawApprovals('financeKpis', 'financeBody'), CP);
  reg('po', 'Purchase Orders', purchaseOrders, CP);
  reg('recurring', 'Recurring', recurring, CP);
  reg('credit', 'Credit Control', credit, CP);
  reg('cashflow', 'Cash-flow', cashflow, CP);
  reg('gl', 'Ledger Home', glHome, GL);
  reg('journals', 'Journals', journals, GL);
  reg('coa', 'Chart of Accounts', coa, GL);
  reg('ledger', 'Account Ledger', accountLedger, GL);
  reg('tb', 'Trial Balance', trialBalance, GL);
  reg('pl', 'Income Statement', incomeStatement, GL);
  reg('bs', 'Balance Sheet', balanceSheet, GL);
  reg('assets', 'Fixed Assets', assets, AT);
  reg('vat', 'VAT & WHT', vat, AT);
  reg('statutory', 'Statutory Calendar', statutory, AT);
})();