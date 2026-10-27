'use strict';
/* Gargo HR ↔ Users link. Loads AFTER finance-billing.js.
   1. Access grids (Create User + Edit Access) gain Finance & Billing, Approvals, HR Hub (and Vessel Prestaking).
   2. Role dropdowns gain "HR Manager".
   3. Users page "Access Roles" card lists HR Manager.
   4. HR → Employees: onboard / "Create login" opens Create User pre-filled from the employee. */
(function () {
  const H = GARGO_HUB, $ = id => document.getElementById(id);
  if (typeof HR === 'undefined' || !HR.employees) return console.error('hr-users.js needs hr.js first');

  /* ── 1. access grid ── */
  ['finance', 'approvals', 'hr', 'prestaking'].forEach(s => { if (!ALL_SIDEBAR_SECTIONS.includes(s)) ALL_SIDEBAR_SECTIONS.push(s); });
  const want = { finance: ['finance', 'approvals'], hr: ['hr', 'approvals'] };
  Object.entries(want).forEach(([r, secs]) => { ROLE_SIDEBAR[r] = ROLE_SIDEBAR[r] || []; secs.forEach(s => { if (!ROLE_SIDEBAR[r].includes(s)) ROLE_SIDEBAR[r].push(s); }); });

  /* ── 2. HR Manager in the role dropdowns ── */
  function addHr(sel, current) {
    if (!sel) return;
    if (![...sel.options].some(o => o.value === 'hr')) {
      const o = document.createElement('option'); o.value = 'hr'; o.textContent = roleLabel('hr');
      const f = [...sel.options].find(x => x.value === 'finance'); f ? f.after(o) : sel.appendChild(o);
    }
    if (current === 'hr') sel.value = 'hr';
  }
  const _cu = window.showCreateUserModal;
  window.showCreateUserModal = function () { const r = _cu.apply(this, arguments); addHr($('cu_role')); return r; };
  const _ea = window.showEditAccessModal;
  window.showEditAccessModal = function (id) { const r = _ea.apply(this, arguments); const u = state.db.profiles.find(x => x.id === id); addHr($('ea_role'), u && u.role); return r; };

  /* ── 3. Users page: Access Roles card ── */
  const _ru = window.renderUserMgmt;
  window.renderUserMgmt = function () {
    _ru.apply(this, arguments);
    const rl = $('roleList'); if (!rl || !isAdmin()) return;
    rl.querySelectorAll('.role-card').forEach(c => { if (c.querySelector('.role-name')?.textContent === 'Finance Manager') c.querySelector('.role-perms').textContent = 'Finance & Billing hub (invoices, payments, ledger, bills, expenses, debtors) and Approvals. Approves payroll.'; });
    rl.insertAdjacentHTML('beforeend', '<div class="role-card"><div class="role-name">HR Manager</div><div class="role-perms">HR Hub (employees, leave, payroll preparation, compliance) and Approvals. Finance approves payroll.</div></div>');
  };
  sectionRenderers.usermgmt = window.renderUserMgmt;     // the table captured the old function

  /* ── 4. employee ↔ login ── */
  let LK = {}, PENDING = null;
  const suggestRole = d => (d === 'Finance' ? 'finance' : d === 'HR & Admin' ? 'hr' : '');
  async function loadLinks() {
    try { const { data } = await supabase.rpc('fin_people'); LK = Object.fromEntries(((data && data.employees) || []).map(e => [e.id, e])); } catch (e) { /* badges stay blank */ }
  }
  const baseActions = HR.employees.rowActions, baseExtra = HR.employees.extra;
  HR.employees.rowActions = r => {
    const l = LK[r.id];
    const login = l && l.login_role
      ? `<span class="hb ${l.login_active === false ? 'hb-r' : 'hb-g'}" title="System login">${esc(roleLabel(l.login_role))}${l.login_active === false ? ' (off)' : ''}</span> `
      : (hrCan() && r.status !== 'exited' ? `<button class="action-btn ghost" onclick="hrLoginFor('${r.id}')">Create login</button> ` : '');
    return login + baseActions(r);
  };
  HR.employees.extra = () => baseExtra() + (hrCan() ? '<button class="action-btn" onclick="hrOnboard()">+ Onboard (employee + login)</button><button class="action-btn ghost" onclick="hrLinkLogins()">Link logins</button>' : '');
  const _rh = window.renderHR;
  window.renderHR = async function (tab) { if (tab === 'employees') await loadLinks(); return _rh.apply(this, arguments); };

  window.hrOnboard = function () {
    if (!hrCan()) return toast('HR access required', 'error');
    const n = String((H.rows.employees || []).length + 1).padStart(3, '0'), f = (id, l, ex = '') => `<div class="fg"><label>${l}</label><input id="ob_${id}" ${ex}/></div>`;
    openModal('Onboard employee', `<div class="form-row-2">${f('staff', 'Staff No. *', `value="GC-${n}"`)}${f('name', 'Full name *')}</div>
      <div class="form-row-2">${f('email', 'Email * (becomes the login email)', 'type="email"')}${f('phone', 'Phone')}</div>
      <div class="form-row-2"><div class="fg"><label>Department *</label><select id="ob_dept">${HR_DEPTS.map(d => `<option>${esc(d)}</option>`).join('')}</select></div>${f('title', 'Job title')}</div>
      <div class="form-row-2">${f('start', 'Start date', `type="date" value="${today10()}"`)}${f('basic', 'Basic salary (KSh)', 'type="number" step="0.01"')}</div>
      <div class="fg" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ob_login" checked style="width:auto"><label style="margin:0">Also create a system login (administrator only)</label></div>
      <div id="ob_err" style="color:var(--red);font-size:12px;min-height:16px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById('modalOverlay')})">Cancel</button><button class="action-btn" id="ob_go" onclick="hrOnboardSave()">Save</button></div>`);
  };
  window.hrOnboardSave = async function () {
    const v = id => ($('ob_' + id)?.value || '').trim(), err = $('ob_err'), go = $('ob_go');
    if (!v('staff') || !v('name') || !v('email')) { err.textContent = 'Staff No., name and email are required.'; return; }
    if (!navigator.onLine) { err.textContent = 'You are offline.'; return; }
    go.disabled = true;
    const rec = { staff_no: v('staff'), full_name: v('name'), email: v('email'), phone: v('phone') || null, department: v('dept'), job_title: v('title') || null, employment_type: 'Permanent', start_date: v('start') || null, basic_salary: v('basic') ? Number(v('basic')) : null, status: 'active', created_by: state.profile?.id || null };
    const { data, error } = await supabase.from('employees').insert(rec).select('id').single();
    go.disabled = false;
    if (error) { err.textContent = H.friendlyError(error); return; }
    addAudit(state.profile?.username, 'Employee onboarded', rec.full_name);
    const wantLogin = $('ob_login').checked && isAdmin();
    closeModal({ target: $('modalOverlay') }); toast(wantLogin || !$('ob_login').checked ? 'Employee saved' : 'Employee saved. An administrator must create the login.', 'success', 5000);
    await H.loadEmployees(); renderHR('employees');
    if (wantLogin) setTimeout(() => hrLoginFor(data.id), 250);
  };

  /* pre-fill the real Create User fields */
  function fill(e) {
    const set = (id, val) => { const el = $(id); if (el && val) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('cu_name', e.full_name); set('cu_email', e.email);
    set('cu_user', String(e.full_name || '').toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.'));
    fillGeneratedPassword('cu_password');                       // admin shares it with the employee
    const role = suggestRole(e.department), sel = $('cu_role');
    if (sel && role) { addHr(sel); sel.value = role; sel.dispatchEvent(new Event('change', { bubbles: true })); }   // change event ticks the matching hub boxes
  }
  window.hrLoginFor = function (id) {
    const e = (H.rows.employees || []).find(x => x.id === id); if (!e) return;
    if (!isAdmin()) return toast(`Only an administrator can create logins. Ask them to create one for ${e.full_name} (${e.email || 'no email on file'}).`, 'error', 6000);
    if (!e.email) return toast('Add an email to this employee first. It is used to link the login.', 'error', 5000);
    PENDING = id; showCreateUserModal(); setTimeout(() => fill(e), 60);
  };

  /* when the Create User dialog closes, link whatever was just created */
  const ov = $('modalOverlay');
  if (ov) new MutationObserver(async () => { if (!PENDING || ov.classList.contains('active')) return; PENDING = null; await hrLinkLogins(true); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
  window.hrLinkLogins = async function (quiet) {
    if (!hrCan()) return;
    const { data, error } = await supabase.rpc('hr_sync_people');
    if (error) return toast(H.friendlyError(error), 'error', 5000);
    if (!quiet || (data && (data.created || data.linked))) toast(`${(data && data.created) || 0} created, ${(data && data.linked) || 0} linked`, 'success');
    await H.loadEmployees(); if (window._hrTab === 'employees') renderHR('employees');
  };
})();