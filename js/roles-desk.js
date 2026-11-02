'use strict';
/* Gargo floor roles. Loads AFTER hr-users.js and loading-instructions.js.
   Adds three roles (the database accepts them since the loading_desk_security migration):
     loading_clerk  - Loading Desk only: completes Part 2 of loading instructions (containers loaded, releasing clerk).
     field_marshal  - Loading Desk only: same, as the yard supervisor.
     security       - Gate Security only: the guard desk, verifies loading instructions at the gate.
   Also adds the "Loading Desk" page to the access grid so any other user can be given it. */
(function () {
  const $ = id => document.getElementById(id);
  if (typeof ROLE_SIDEBAR === 'undefined' || typeof ALL_SIDEBAR_SECTIONS === 'undefined') return console.error('roles-desk.js needs admin-ui-shell.js first');

  const LABEL = { loading_clerk: 'Loading Clerk', field_marshal: 'Field Marshal', security: 'Security Officer' };
  const PERMS = {
    loading_clerk: 'Loading Desk only. Completes Part 2 of a loading instruction (containers loaded, releasing clerk) and marks it loaded. Cannot create or edit Part 1.',
    field_marshal: 'Loading Desk only. Supervises loading in the yard: completes Part 2, picks containers from the yard and marks instructions loaded.',
    security: 'Gate Security only. Sees the trucks expected at the gate, verifies or rejects loading instructions and records vehicles in and out.',
  };
  const prevLabel = window.roleLabel;
  window.roleLabel = r => LABEL[r] || (prevLabel ? prevLabel(r) : r);

  ROLE_SIDEBAR.loading_clerk = ['loadingdesk'];
  ROLE_SIDEBAR.field_marshal = ['loadingdesk'];
  ROLE_SIDEBAR.security = ['gatesecurity'];
  ['loadingdesk', 'gatesecurity'].forEach(s => { if (ALL_SIDEBAR_SECTIONS.indexOf(s) < 0) ALL_SIDEBAR_SECTIONS.push(s); });
  SECTION_META.loadingdesk = ['Operations', 'Loading Desk'];

  /* the page itself (index.html already has it; this makes it work if it is missing) */
  function ensurePage() {
    if (!$('sec-loadingdesk')) {
      const after = $('sec-gatesecurity'), sec = document.createElement('section'); sec.className = 'section'; sec.id = 'sec-loadingdesk';
      if (after && after.parentNode) after.parentNode.insertBefore(sec, after.nextSibling);
    }
    if (!document.querySelector('.nav-item[data-section="loadingdesk"]')) {
      const gs = document.querySelector('.nav-item[data-section="gatesecurity"]');
      if (gs) {
        const b = document.createElement('button'); b.className = 'nav-item'; b.setAttribute('data-section', 'loadingdesk'); b.setAttribute('onclick', "showSection('loadingdesk',this)");
        b.innerHTML = '<svg class="nav-icon" viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="9" rx="1"/><path d="M16 10h3l2 3v3h-5"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg> Loading Desk';
        gs.parentNode.insertBefore(b, gs.nextSibling);
      }
    }
    if (typeof sectionRenderers !== 'undefined' && !sectionRenderers.loadingdesk) sectionRenderers.loadingdesk = function () { if (window.GargoLI) GargoLI.renderDesk(); };
  }
  ensurePage();

  /* ── role dropdowns (Create User, Edit Access) ── */
  function addRoles(sel, current) {
    if (!sel) return;
    Object.keys(LABEL).forEach(r => {
      if (![].some.call(sel.options, o => o.value === r)) { const o = document.createElement('option'); o.value = r; o.textContent = LABEL[r]; const d = [].find.call(sel.options, x => x.value === 'driver'); d ? sel.insertBefore(o, d) : sel.appendChild(o); }
    });
    if (current && LABEL[current]) sel.value = current;
  }
  const _cu = window.showCreateUserModal;
  window.showCreateUserModal = function () { const r = _cu.apply(this, arguments); addRoles($('cu_role')); return r; };
  const _ea = window.showEditAccessModal;
  window.showEditAccessModal = function (id) { const r = _ea.apply(this, arguments); const u = state.db.profiles.find(x => x.id === id); addRoles($('ea_role'), u && u.role); return r; };

  /* ── Access Roles card on the Users page ── */
  const _ru = window.renderUserMgmt;
  window.renderUserMgmt = function () {
    _ru.apply(this, arguments);
    const rl = $('roleList'); if (!rl || !isAdmin()) return;
    Object.keys(LABEL).forEach(r => { if (![].some.call(rl.querySelectorAll('.role-name'), n => n.textContent === LABEL[r])) rl.insertAdjacentHTML('beforeend', '<div class="role-card"><div class="role-name">' + LABEL[r] + '</div><div class="role-perms">' + PERMS[r] + '</div></div>'); });
  };
  if (typeof sectionRenderers !== 'undefined') sectionRenderers.usermgmt = window.renderUserMgmt;
})();