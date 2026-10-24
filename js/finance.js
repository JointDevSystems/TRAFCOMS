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
    let data = null, error = null; try { ({ data, error } = await withTimeout(supabase.from('finance_settings').select('approval_limit,separate_approver').eq('id', 1).single())); } catch (e) { error = e; }
    if (!error && data) { POLICY.limit = N(data.approval_limit); POLICY.separate = !!data.separate_approver; POLICY.loaded = true; }
    return POLICY;
  }
  async function approvalBlock(rec, amount) {
    if (!canApprove()) return 'Only the Finance Manager or an Administrator can approve.';
    if (isAdmin()) return '';
    const p = await loadPolicy();
    if (!p.loaded) return 'Could not load the approval rules, so this cannot be approved right now. Check your connection and try again.';
    if (p.limit > 0 && N(amount) > p.limit) return `This is above the KSh ${p.limit.toLocaleString('en-KE')} limit. An administrator must approve it.`;
    if (p.separate && rec && rec.created_by && rec.created_by === state.profile?.id) return 'You entered this yourself, so someone else must approve it.';
    return '';
  }

  /* ───────────── shared record helper ───────────── */
  /* ── Robustness helpers ───────────────────────────────────────────────────────────────────────────────── */
  const cents = v => Math.round(N(v) * 100);
  const sumC = (rows, k) => rows.reduce((t, r) => t + cents(r[k || 'amount']), 0) / 100;      // add in whole cents: no float drift
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('The server took too long to respond. Check your signal and try again.')), ms || 20000))]);
  const escLike = v => String(v).replace(/[\\%_]/g, m => '\\' + m);
  const same = (a, b) => (a == null && b == null) || (a != null && b != null && (String(a) === String(b) || (a !== '' && b !== '' && !isNaN(a) && !isNaN(b) && Number(a) === Number(b))));
  function friendlyError(e) {
    const msg = String((e && (e.message || e.error_description)) || e || ''), code = e && e.code;
    if (!navigator.onLine || /failed to fetch|networkerror|load failed|network request/i.test(msg)) return 'No internet connection. Nothing was saved. Your entries are still on screen, so try again once you have a signal.';
    if (/jwt|token.*expired|not authenticated/i.test(msg) || (e && e.status === 401)) return 'Your session has expired. Sign in again, then retry.';
    if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'You do not have permission to do that.';
    if (code === '23505') return 'A record with the same unique value already exists.';
    if (code === '23503') return 'This record is linked to other records, so that change is not allowed.';
    if (code === '23514' || code === '23502') return 'The database rejected this entry: ' + msg;
    return msg || 'Something went wrong. Please try again.';
  }
  const csvCell = v => { if (typeof v === 'number') return String(v); let t = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };   // leading ' stops spreadsheet formula injection
  function downloadCSV(name, header, rows) {
    const text = '\ufeff' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
  const dayNum = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; };

  const HUB = {
    cfg: {}, rows: {}, emp: {}, _tok: 0, err: {}, stale: {}, truncated: {}, ui: {}, _busy: false,
    money: n => 'KSh ' + N(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    date: d => d ? fmtDate(d) : '—',
    todayISO, monthStart, badge,
    kpi: (label, val, sub, cls) => kpi(label, val, sub, cls),

    /* Pages through the table (no silent 2,000-row cap). On failure keeps the last good copy and records the reason. */
    async load(table) {
      const PAGE = 1000, MAX = 20000; let all = [];
      try {
        for (let from = 0; from < MAX; from += PAGE) {
          const { data, error } = await withTimeout(supabase.from(table).select('*').order('created_at', { ascending: false }).order('id').range(from, from + PAGE - 1));
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < PAGE) break;
        }
        this.rows[table] = all; this.stale[table] = false; this.truncated[table] = all.length >= MAX; delete this.err[table];
        return all;
      } catch (e) {
        console.error(table, e);
        this.err[table] = friendlyError(e);
        if (this.rows[table]) { this.stale[table] = true; return this.rows[table]; }
        return [];
      }
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

    /* cfg: { table, host, kpiHost, cols:[[key,label,fmt]], fields:[{k,l,t,o,r,d,ro,money,min,max}], canEdit(), canDelete(), title, extra(), rowActions(r), rowLocked(r), dupFilters(rec), needsEmp, oninput, beforeSave(rec), newDefaults, refresh() } */
    plain(r, c) { const [k, , f] = c, v = r[k]; if (f === 'money') return N(v); if (f === 'emp') return this.emp[v]?.full_name || ''; return v == null ? '' : String(v); },
    text(r, c) { const [k, , f] = c, v = r[k]; if (f === 'money') return this.money(v); if (f === 'date') return v ? this.date(v) : ''; return String(this.plain(r, c)); },

    async render(cfg, kpiFn) {
      this.cfg[cfg.table] = cfg;
      const t = cfg.table, tok = ++this._tok, host = document.getElementById(cfg.host);
      if (!host) return;
      host.innerHTML = '<div class="hub-loading">Loading…</div>';
      if (cfg.needsEmp) await this.loadEmployees();
      const rows = await this.load(t);
      if (tok !== this._tok) return;                       // a newer tab was opened meanwhile
      const kh = document.getElementById(cfg.kpiHost);
      if (this.err[t] && !this.rows[t]) {                  // nothing to show: say so instead of showing empty tables and zero totals
        if (kh) kh.innerHTML = '';
        host.innerHTML = `<div class="ops-notice">Could not load ${esc(cfg.title)} records. ${esc(this.err[t])} <button class="action-btn" style="margin-left:8px" onclick="GARGO_HUB.retry('${t}')">Retry</button></div>`;
        return;
      }
      if (kh) kh.innerHTML = kpiFn ? kpiFn(rows) : '';
      const ui = this.ui[t] || (this.ui[t] = { q: '', status: '', from: '', to: '', shown: 100 });
      ui.shown = 100;
      const edit = cfg.canEdit(), hasStatus = cfg.cols.some(c => c[0] === 'status'), dateCol = cfg.cols.find(c => c[2] === 'date');
      const statuses = hasStatus ? [...new Set(rows.map(r => r.status).filter(Boolean))].sort() : [];
      const notices = (this.stale[t] ? `<div class="ops-notice" style="margin-bottom:8px">Showing the last data that loaded. ${esc(this.err[t] || '')} <button class="action-btn ghost" onclick="GARGO_HUB.retry('${t}')">Retry</button></div>` : '')
        + (this.truncated[t] ? '<div class="ops-notice" style="margin-bottom:8px">Only the newest 20,000 records are loaded. Use the filters or export to narrow down.</div>' : '');
      host.innerHTML = `${notices}<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">${cfg.title} <span id="hub_count_${t}" style="color:var(--text-3)"></span></div>
        <div class="filter-row">${edit ? `<button class="action-btn" onclick="GARGO_HUB.open('${t}')">+ Add</button>` : ''}${cfg.extra ? cfg.extra() : ''}</div></div>
        <div class="filter-row" style="margin:6px 0;flex-wrap:wrap;gap:6px">
          <input type="search" placeholder="Search…" value="${esc(ui.q)}" oninput="GARGO_HUB.filter('${t}','q',this.value)" style="min-width:150px;flex:1">
          ${hasStatus ? `<select onchange="GARGO_HUB.filter('${t}','status',this.value)"><option value="">All statuses</option>${statuses.map(x => `<option value="${esc(x)}" ${ui.status === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}
          ${dateCol ? `<input type="date" title="From" value="${esc(ui.from)}" onchange="GARGO_HUB.filter('${t}','from',this.value)"><input type="date" title="To" value="${esc(ui.to)}" onchange="GARGO_HUB.filter('${t}','to',this.value)">` : ''}
          <button class="action-btn ghost" onclick="GARGO_HUB.exportCSV('${t}')">⬇ CSV</button></div>
        <div id="hub_tbl_${t}"></div>`;
      this.paint(t);
    },

    filtered(t) {
      const cfg = this.cfg[t], ui = this.ui[t], q = ui.q.trim().toLowerCase(), dc = cfg.cols.find(c => c[2] === 'date');
      return (this.rows[t] || []).filter(r => {
        if (ui.status && r.status !== ui.status) return false;
        if (dc) { const d = String(r[dc[0]] || '').slice(0, 10); if (ui.from && (!d || d < ui.from)) return false; if (ui.to && (!d || d > ui.to)) return false; }
        return !q || cfg.cols.map(c => this.plain(r, c)).join(' ').toLowerCase().includes(q);
      });
    },

    paint(t) {
      const cfg = this.cfg[t], ui = this.ui[t], el = document.getElementById('hub_tbl_' + t); if (!el) return;
      const all = this.rows[t] || [], rows = this.filtered(t), shown = rows.slice(0, ui.shown);
      const edit = cfg.canEdit(), acts = edit || !!(cfg.actionsForAll && cfg.rowActions), admin = isAdmin();   // approvers may get row buttons without edit rights
      const head = cfg.cols.map(c => `<th>${c[1]}</th>`).join('') + (acts ? '<th></th>' : '');
      const body = shown.map(r => {
        const lock = cfg.rowLocked ? cfg.rowLocked(r) : '', id = esc(r.id);
        const editBtn = !edit ? '' : (lock && !admin ? `<span title="${esc(lock)}" style="opacity:.6;padding:0 6px">🔒</span>`
          : `<button class="action-btn ghost" ${lock ? `title="${esc(lock)} - administrator edit"` : ''} onclick="GARGO_HUB.open('${t}','${id}')">Edit</button>`);
        return `<tr>${cfg.cols.map(c => `<td>${this.cell(r, c)}</td>`).join('')}${acts ? `<td style="white-space:nowrap">${cfg.rowActions ? cfg.rowActions(r) : ''}${editBtn}${edit && cfg.canDelete() ? ` <button class="action-btn ghost" onclick="GARGO_HUB.del('${t}','${id}')" title="Delete">✕</button>` : ''}</td>` : ''}</tr>`;
      }).join('');
      const mc = cfg.cols.find(c => c[2] === 'money');
      const foot = mc && rows.length ? `<tfoot><tr><td colspan="${cfg.cols.length + (acts ? 1 : 0)}" style="text-align:right;font-weight:600">Total shown: ${this.money(sumC(rows, mc[0]))}</td></tr></tfoot>` : '';
      const none = all.length ? 'Nothing matches the current filters' : 'No records yet';
      el.innerHTML = `<div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cfg.cols.length + 1}" style="text-align:center;color:var(--text-3);padding:28px">${none}</td></tr>`}</tbody>${foot}</table></div>`
        + (rows.length > shown.length ? `<div style="text-align:center;margin:10px"><button class="action-btn ghost" onclick="GARGO_HUB.more('${t}')">Show more (${rows.length - shown.length} left)</button></div>` : '');
      const cnt = document.getElementById('hub_count_' + t); if (cnt) cnt.textContent = rows.length === all.length ? `(${all.length})` : `(${rows.length} of ${all.length})`;
    },
    filter(t, key, val) { const ui = this.ui[t]; if (!ui) return; ui[key] = val; ui.shown = 100; clearTimeout(this._ft); this._ft = setTimeout(() => this.paint(t), key === 'q' ? 150 : 0); },
    more(t) { this.ui[t].shown += 100; this.paint(t); },
    retry(t) { const cfg = this.cfg[t]; if (cfg) (cfg.refresh ? cfg.refresh() : this.render(cfg)); },
    exportCSV(t) {
      const cfg = this.cfg[t], rows = this.filtered(t);
      downloadCSV(`${t}_${todayISO()}.csv`, cfg.cols.map(c => c[1]), rows.map(r => cfg.cols.map(c => this.plain(r, c))));
      addAudit(state.profile?.username, 'Exported ' + cfg.title, rows.length + ' rows');
    },

    open(table, id) {
      const cfg = this.cfg[table], r = (this.rows[table] || []).find(x => x.id === id) || {};
      const inputs = cfg.fields.map(f => {
        const v = r[f.k] ?? f.d ?? '', a = `id="bf_${f.k}" ${f.ro ? 'readonly' : ''} ${cfg.oninput ? `oninput="${cfg.oninput}"` : ''}`;
        let el;
        if (f.t === 'select') el = `<select ${a}>${f.o.map(o => `<option value="${esc(o)}" ${String(o) === String(v) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
        else if (f.t === 'emp') el = `<select ${a}><option value="">— select —</option>${Object.values(this.emp).filter(e => e.status !== 'exited').map(e => `<option value="${e.id}" ${e.id === v ? 'selected' : ''}>${esc(e.full_name)} (${esc(e.staff_no || '')})</option>`).join('')}</select>`;
        else if (f.t === 'textarea') el = `<textarea ${a} rows="2">${esc(v)}</textarea>`;
        else el = `<input ${a} type="${f.t || 'text'}" ${f.t === 'number' ? 'step="0.01" inputmode="decimal"' + (f.min != null ? ' min="' + f.min + '"' : '') : ''} value="${esc(v)}"/>`;
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
      if (this._busy) return;                              // double-tap guard
      const cfg = this.cfg[table], rec = {}, err = document.getElementById('bf_err'), btn = document.getElementById('bf_save');
      const fail = m => { if (err) err.textContent = m; };
      if (err) err.textContent = '';
      if (cfg.canEdit && !cfg.canEdit()) return fail('You do not have permission to save this.');
      if (!navigator.onLine) return fail('You are offline. Nothing was saved. Your entries stay on screen, so try again once you have a signal.');
      for (const f of cfg.fields) {
        const raw = document.getElementById('bf_' + f.k)?.value, v = raw == null ? raw : raw.trim();
        if (f.r && !v) return fail(`${f.l} is required`);
        if (v === '' || v === undefined) { rec[f.k] = null; continue; }
        if (f.t === 'number') {
          const n = Number(v);
          if (!Number.isFinite(n)) return fail(`${f.l} must be a number`);
          if (f.min != null && n < f.min) return fail(`${f.l} must be at least ${f.min}`);
          if (f.max != null && n > f.max) return fail(`${f.l} is too large`);
          if (f.money && Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return fail(`${f.l} can have at most 2 decimal places`);
          rec[f.k] = f.money ? Math.round(n * 100) / 100 : n;
        } else rec[f.k] = v;
      }
      if (cfg.beforeSave) { const m = cfg.beforeSave(rec); if (m) return fail(m); }
      this._busy = true; if (btn) btn.disabled = true;
      try {
        let before = null;
        if (id) {                                          // re-read: the copy on screen may be stale
          const { data: cur, error: ce } = await withTimeout(supabase.from(table).select('*').eq('id', id).maybeSingle());
          if (ce) throw ce;
          if (!cur) return fail('This record no longer exists. Close this window and refresh.');
          const lock = cfg.rowLocked ? cfg.rowLocked(cur) : '';
          if (lock && !isAdmin()) return fail(`${lock}, so it can no longer be edited.`);
          const loaded = (this.rows[table] || []).find(x => x.id === id);
          if (loaded && loaded.updated_at && cur.updated_at && loaded.updated_at !== cur.updated_at) return fail('Someone else changed this record while you were editing. Close this window and reopen it to see their changes.');
          if (lock && !confirm(`${lock}. Changing it alters figures that were already signed off. Continue?`)) return;
          before = cur;
        }
        const df = cfg.dupFilters ? cfg.dupFilters(rec) : null;
        if (df) {
          try {
            let q = supabase.from(table).select('*').limit(5);
            df.forEach(([c, v, op]) => { q = op === 'ilike' ? q.ilike(c, escLike(v)) : q.eq(c, v); });
            const { data } = await withTimeout(q);
            const hit = (data || []).filter(x => x.id !== id);
            if (hit.length) {
              const lines = hit.slice(0, 3).map(x => '• ' + cfg.cols.slice(0, 5).map(c => this.text(x, c)).filter(Boolean).join(' · ')).join('\n');
              if (!confirm(`Possible duplicate: ${hit.length} similar ${hit.length === 1 ? 'record exists' : 'records exist'}:\n${lines}\n\nSave anyway?`)) return;
            }
          } catch (e) { console.warn('Duplicate check skipped:', e); }
        }
        let error;
        if (id) {
          const r = await withTimeout(supabase.from(table).update(rec).eq('id', id).select('id'));
          error = r.error;
          if (!error && Array.isArray(r.data) && !r.data.length) error = { message: 'The change was not applied. The record may have been removed, or you may not have permission.' };
        } else {
          if (cfg.newDefaults) Object.assign(rec, cfg.newDefaults);
          rec.created_by = state.profile?.id || null;
          ({ error } = await withTimeout(supabase.from(table).insert(rec)));
        }
        if (error) return fail(friendlyError(error));
        let detail;
        if (before) { const d = {}; Object.keys(rec).forEach(k => { if (!same(before[k], rec[k])) d[k] = [before[k] ?? null, rec[k]]; }); detail = JSON.stringify({ id, changes: d }).slice(0, 400); }
        else detail = JSON.stringify(rec).slice(0, 300);
        addAudit(state.profile?.username, (id ? 'Updated ' : 'Created ') + cfg.title, detail);
        closeM(); toast('Saved', 'success'); cfg.refresh();
      } catch (e) { console.error(e); fail(friendlyError(e)); }
      finally { this._busy = false; if (btn) btn.disabled = false; }
    },

    async del(table, id) {
      if (this._busy) return;
      const cfg = this.cfg[table], rec = (this.rows[table] || []).find(x => x.id === id);
      if (cfg.canDelete && !cfg.canDelete()) return toast('You do not have permission to delete this.', 'error');
      if (!navigator.onLine) return toast('You are offline. Deleting needs a connection.', 'error');
      const lock = rec && cfg.rowLocked ? cfg.rowLocked(rec) : '';
      const label = rec ? cfg.cols.slice(0, 4).map(c => this.text(rec, c)).filter(Boolean).join(' · ') : id;
      if (!confirm(`Delete this ${cfg.title.toLowerCase()}?\n\n${label}\n${lock ? `\n⚠ ${lock}. Deleting removes a signed-off record.\n` : ''}\nThis cannot be undone.`)) return;
      this._busy = true;
      try {
        const { data, error } = await withTimeout(supabase.from(table).delete().eq('id', id).select('id'));
        if (error) return toast(friendlyError(error), 'error', 5000);
        if (Array.isArray(data) && !data.length) return toast('Nothing was deleted. The record may already be gone, or you may not have permission.', 'error', 5000);
        addAudit(state.profile?.username, 'Deleted ' + cfg.title, JSON.stringify(rec || { id }).slice(0, 400));   // full copy kept in the audit trail
        toast('Deleted', 'success');
      } catch (e) { return toast(friendlyError(e), 'error', 5000); }
      finally { this._busy = false; }
      cfg.refresh();
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

  /* ── Finance rules: amounts, dates, locks, duplicates ── */
  Object.values(FIN).forEach(c => c.fields.forEach(f => { if (f.k === 'amount') { f.money = true; f.min = 0.01; f.max = 1e9; } }));
  const nextDay = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dateIssue = (v, label, future) => !v ? '' : v < '2000-01-01' ? `${label} looks wrong (before year 2000)` : v > '2100-01-01' ? `${label} looks wrong (after year 2100)` : (!future && v > nextDay()) ? `${label} cannot be in the future` : '';
  FIN.receipts.beforeSave = r => dateIssue(r.receipt_date, 'Receipt date');
  FIN.expenses.beforeSave = r => dateIssue(r.expense_date, 'Expense date');
  FIN.bills.beforeSave = r => dateIssue(r.bill_date, 'Bill date') || dateIssue(r.due_date, 'Due date', true) || (r.due_date && r.bill_date && r.due_date < r.bill_date ? 'Due date cannot be before the bill date' : '');
  FIN.expenses.rowLocked = r => (r.status === 'approved' || r.status === 'rejected') ? `This expense is ${r.status}` : '';
  FIN.bills.rowLocked = r => r.status === 'paid' ? 'This bill is paid' : '';
  FIN.receipts.dupFilters = r => r.ref ? [['ref', r.ref, 'ilike']] : null;
  FIN.bills.dupFilters = r => (r.supplier && r.bill_no) ? [['supplier', r.supplier, 'ilike'], ['bill_no', r.bill_no, 'ilike']] : null;
  FIN.expenses.dupFilters = r => r.ref ? [['ref', r.ref, 'ilike'], ['amount', r.amount, 'eq']] : null;

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
    const names = ['receipts', 'bills', 'expenses'], bad = names.filter(t => HUB.err[t] && !HUB.rows[t]);
    if (bad.length) {   // hide the figures rather than show wrong ones
      body.innerHTML = `<div class="ops-notice">Could not load ${bad.join(', ')}, so the figures are hidden rather than shown wrong. ${esc(HUB.err[bad[0]])} <button class="action-btn" style="margin-left:8px" onclick="renderFinance('overview')">Retry</button></div>`;
      return;
    }
    const staleNote = names.some(t => HUB.stale[t]) ? '<div class="ops-notice" style="margin-bottom:10px">Some figures come from the last data that loaded, not live data. <button class="action-btn ghost" onclick="renderFinance(\'overview\')">Retry</button></div>' : '';
    const ms = monthStart(), today = todayISO(), td = dayNum(today);
    const counted = ex.filter(r => r.expense_date >= ms && r.status === 'approved');
    const rcM = sumC(rc.filter(r => r.receipt_date >= ms)), exM = sumC(counted), pend = ex.filter(r => r.status === 'pending');
    const open = bl.filter(b => b.status !== 'paid'), od = open.filter(b => b.due_date && b.due_date < today);
    kp.innerHTML = kpi('Receipts (MTD)', HUB.money(rcM), '', 'kpi-green') + kpi('Approved Expenses (MTD)', HUB.money(exM), 'Pending ones are not counted', 'kpi-orange') +
      kpi('Net Cash (MTD)', HUB.money(rcM - exM), 'Receipts − approved expenses', rcM - exM >= 0 ? 'kpi-blue' : 'kpi-red') +
      kpi('Bills Payable', HUB.money(sumC(open)), `${open.length} open`, 'kpi-gold') + kpi('Overdue Bills', od.length, HUB.money(sumC(od)), od.length ? 'kpi-red' : 'kpi-green') +
      kpi('Awaiting Approval', pend.length, HUB.money(sumC(pend)), pend.length ? 'kpi-orange' : 'kpi-green');
    const byCat = {}; counted.forEach(r => { const k = r.category || 'Other'; byCat[k] = (byCat[k] || 0) + cents(r.amount); });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const empty = (n, t) => `<tr><td colspan="${n}" style="text-align:center;color:var(--text-3);padding:20px">${t}</td></tr>`;
    const tbl = (head, rows, mt) => `<div class="table-wrap" style="${mt ? 'margin-top:14px;' : ''}overflow-x:auto"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    /* payables ageing, by days past due */
    const AG = ['Not yet due', '1–30 days overdue', '31–60 days overdue', '61–90 days overdue', 'Over 90 days overdue', 'No due date'], agV = AG.map(() => 0), agN = AG.map(() => 0);
    open.forEach(b => { const d = b.due_date ? td - dayNum(b.due_date) : NaN, i = isNaN(d) ? 5 : d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4; agV[i] += cents(b.amount); agN[i]++; });
    /* last six months */
    const d0 = new Date(), months = []; for (let i = 5; i >= 0; i--) { const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1); months.push([d.getFullYear() + '-' + pad(d.getMonth() + 1), d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })]); }
    const mR = {}, mE = {};
    rc.forEach(r => { const k = String(r.receipt_date || '').slice(0, 7); mR[k] = (mR[k] || 0) + cents(r.amount); });
    ex.filter(r => r.status === 'approved').forEach(r => { const k = String(r.expense_date || '').slice(0, 7); mE[k] = (mE[k] || 0) + cents(r.amount); });
    /* things worth a second look */
    const oldPend = pend.filter(x => td - dayNum(x.expense_date) > 7).length, noRef = rc.filter(r => !r.ref).length, noDue = open.filter(b => !b.due_date).length;
    const flags = [oldPend && `${oldPend} expense${oldPend === 1 ? '' : 's'} waiting for approval for over 7 days`, noRef && `${noRef} receipt${noRef === 1 ? ' has' : 's have'} no reference number`, noDue && `${noDue} open bill${noDue === 1 ? ' has' : 's have'} no due date`].filter(Boolean);
    body.innerHTML = staleNote + (flags.length ? `<div class="ops-notice" style="margin-bottom:10px"><b>Worth a look:</b> ${flags.map(esc).join(' · ')}</div>` : '') +
      tbl('<th>Bills due soonest</th><th>Due</th><th>Amount</th><th>Status</th>',
        open.slice().sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9')).slice(0, 8).map(b => `<tr><td>${esc(b.supplier)}</td><td>${HUB.date(b.due_date)}</td><td>${HUB.money(b.amount)}</td><td>${badge(b.due_date && b.due_date < today ? 'overdue' : b.status)}</td></tr>`).join('') || empty(4, 'No open bills')) +
      tbl('<th>Payables ageing</th><th>Bills</th><th>Amount</th>', AG.map((l, i) => `<tr><td>${l}</td><td>${agN[i]}</td><td${i >= 1 && i <= 4 && agV[i] ? ' style="color:var(--red)"' : ''}>${HUB.money(agV[i] / 100)}</td></tr>`).join(''), true) +
      tbl('<th>Month</th><th>Receipts</th><th>Approved expenses</th><th>Net</th>', months.map(([k, l]) => { const r = mR[k] || 0, e = mE[k] || 0; return `<tr><td>${l}</td><td>${HUB.money(r / 100)}</td><td>${HUB.money(e / 100)}</td><td${r - e < 0 ? ' style="color:var(--red)"' : ''}>${HUB.money((r - e) / 100)}</td></tr>`; }).join(''), true) +
      tbl('<th>Approved expenses by category (this month)</th><th>Amount</th>', cats.map(([c, v]) => `<tr><td>${esc(c)}</td><td>${HUB.money(v / 100)}</td></tr>`).join('') || empty(2, 'No approved expenses this month'), true) +
      '<p style="color:var(--text-3);font-size:12px;margin-top:10px">Customer invoices and billing rates are managed under <b>Invoicing</b>.</p>';
  };

  /* ── actions: always re-read the record, and only change it if it is still in the state we expect ── */
  const _acting = new Set();
  window.finDecide = async function (id, status) {
    if (_acting.has(id) || (status !== 'approved' && status !== 'rejected')) return;
    if (!canApprove()) return toast('Only the Finance Manager or an Administrator can decide on expenses.', 'error');
    if (!navigator.onLine) return toast('You are offline. Approvals need a connection.', 'error');
    _acting.add(id);
    try {
      const { data: rec, error: e0 } = await withTimeout(supabase.from('expenses').select('*').eq('id', id).maybeSingle());
      if (e0) return toast(friendlyError(e0), 'error', 5000);
      if (!rec) { toast('This expense no longer exists.', 'error'); return renderFinance('expenses'); }
      if (rec.status !== 'pending') { toast(`This expense was already ${rec.status}.`, 'info', 4000); return renderFinance('expenses'); }
      if (status === 'approved') { const m = await approvalBlock(rec, rec.amount); if (m) return toast(m, 'error', 5000); }
      const { data, error } = await withTimeout(supabase.from('expenses').update({ status }).eq('id', id).eq('status', 'pending').select('id'));
      if (error) return toast(friendlyError(error), 'error', 5000);
      if (Array.isArray(data) && !data.length) { toast('Someone else already decided on this expense, or you are not allowed to change it.', 'error', 5000); return renderFinance('expenses'); }
      addAudit(state.profile?.username, status === 'approved' ? 'Expense approved' : 'Expense rejected', `${rec.description} · KSh ${N(rec.amount).toLocaleString('en-KE')}`);
      toast(status === 'approved' ? 'Expense approved' : 'Expense rejected', 'success'); renderFinance('expenses');
    } catch (e) { toast(friendlyError(e), 'error', 5000); }
    finally { _acting.delete(id); }
  };
  window.finMarkPaid = async function (id) {
    if (_acting.has(id)) return;
    if (!canFinance()) return;
    if (!navigator.onLine) return toast('You are offline. Marking a bill paid needs a connection.', 'error');
    _acting.add(id);
    try {
      const { data: rec, error: e0 } = await withTimeout(supabase.from('bills').select('*').eq('id', id).maybeSingle());
      if (e0) return toast(friendlyError(e0), 'error', 5000);
      if (!rec) { toast('This bill no longer exists.', 'error'); return renderFinance('bills'); }
      if (rec.status === 'paid') { toast('This bill is already marked as paid.', 'info', 4000); return renderFinance('bills'); }
      if (!confirm(`Mark the bill from ${rec.supplier} (${HUB.money(rec.amount)}) as paid?`)) return;
      const { data, error } = await withTimeout(supabase.from('bills').update({ status: 'paid' }).eq('id', id).neq('status', 'paid').select('id'));
      if (error) return toast(friendlyError(error), 'error', 5000);
      if (Array.isArray(data) && !data.length) { toast('The bill was changed by someone else, or you are not allowed to update it.', 'error', 5000); return renderFinance('bills'); }
      addAudit(state.profile?.username, 'Bill paid', `${rec.supplier} · ${HUB.money(rec.amount)}`);
      toast('Bill marked as paid', 'success'); renderFinance('bills');
    } catch (e) { toast(friendlyError(e), 'error', 5000); }
    finally { _acting.delete(id); }
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