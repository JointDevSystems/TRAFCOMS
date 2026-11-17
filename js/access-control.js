'use strict';
/* Gargo access control. Loads LAST (after form-guard.js).
   1. Sub-section access: an administrator can allow a section but deny single tabs inside it
      (e.g. HR Hub allowed, but not Payroll). Stored as profiles.denied_subs = ["hr:payroll", "finance:bills", ...].
   2. User Management rebuilt: search + filters, bulk actions, one access editor for every role, role defaults,
      copy-access-from-user, safety guards (last admin, self demotion) and an Access Check that finds users who cannot do their job.
   3. Live sync: a signed-in user picks up access changes (or a deactivation) within ~45 s, without signing out.
   NOTE: this is interface-level control, like the existing section ticks. Data protection itself must be enforced by Supabase RLS. */
(function () {
  const $ = id => document.getElementById(id);
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  if (typeof ROLE_SIDEBAR === 'undefined' || typeof ALL_SIDEBAR_SECTIONS === 'undefined' || typeof ROLE_ADMINRAIL === 'undefined' || typeof SECTION_META === 'undefined')
    return console.error('access-control.js needs admin-ui-shell.js and core-state.js first');

  /* ═════════════ 1. CATALOGUE ═════════════ */
  const ROLES = [
    ['admin', 'System Administrator', 'Full access to every module, Settings and User Management.'],
    ['ops', 'Operations Officer', 'Fleet, dispatch, depot, maintenance, fuel, workshop and shipping lines.'],
    ['dispatch', 'Dispatch Controller', 'Dispatch console, trips, drivers, trucks and the depot desks.'],
    ['clerk', 'Clerk', 'Day-to-day entry: dispatch, inward, interchange, shutouts and depot reports.'],
    ['finance', 'Finance Manager', 'Finance Hub, Approvals, invoicing, rates and finance reports. Approves payroll.'],
    ['hr', 'HR Manager', 'HR Hub (employees, leave, payroll preparation, compliance) and Approvals.'],
    ['viewer', 'Read-Only Viewer', 'Trucks, drivers, trips and the Data Hub. No editing.'],
    ['loading_clerk', 'Loading Clerk', 'Loading Desk only: completes Part 2 of a loading instruction.'],
    ['field_marshal', 'Field Marshal', 'Loading Desk only: supervises loading and picks containers in the yard.'],
    ['security', 'Security Officer', 'Gate Processes only: verifies loading instructions, records vehicles in and out.'],
    ['driver', 'Driver', 'Driver portal only (needs a driver record linked to the login).'],
  ];
  const ROLE_IDS = ROLES.map(r => r[0]);
  const roleName = r => { try { return roleLabel(r); } catch (e) { return r; } };
  /* the one section each role cannot work without (used by the Access Check) */
  const CORE = { finance: 'finance', hr: 'hr', security: 'gatesecurity', loading_clerk: 'loadingdesk', field_marshal: 'loadingdesk' };
  /* admin rail pages that only administrators can actually open, so ticking them for anyone else would do nothing */
  const ADMIN_ONLY = ['usermgmt', 'settings'];

  ['gatesecurity', 'loadingdesk', 'repatreserve'].forEach(s => { if (SECTION_META[s] && ALL_SIDEBAR_SECTIONS.indexOf(s) < 0) ALL_SIDEBAR_SECTIONS.push(s); });
  const SECTIONS = () => ALL_SIDEBAR_SECTIONS.filter(s => SECTION_META[s]);
  const ADMIN_RAIL = () => (typeof ALL_ADMINRAIL_SECTIONS !== 'undefined' ? ALL_ADMINRAIL_SECTIONS : (ROLE_ADMINRAIL.admin || []));
  const secLabel = s => (SECTION_META[s] && SECTION_META[s][1]) || s;

  /* Sub-sections = the tabs inside a section. fn/re identify the tab buttons and the function that opens a tab. */
  const FIN_BASE = [['overview', 'Overview'], ['receipts', 'Receipts'], ['bills', 'Supplier Bills'], ['expenses', 'Expenses'], ['suppliers', 'Suppliers'], ['controls', 'Controls']];
  const SUBS = {
    dispatch: { fn: 'switchDispatchTab', re: /switchDispatchTab\(\s*'([\w-]+)'/, tabs: () => [['single', 'Single Dispatch'], ['bulk', 'Bulk Upload']] },
    inward: { fn: 'switchInwardTab', re: /switchInwardTab\(\s*'([\w-]+)'/, tabs: () => [['single', 'Single Entry'], ['bulk', 'Bulk Upload'], ['reports', 'Reports']] },
    depotreport: { fn: 'switchDepotReportTab', re: /switchDepotReportTab\(\s*'([\w-]+)'/, tabs: () => [['inward', 'Inward'], ['outward', 'Outward'], ['dupes', 'Duplicates']] },
    depops: { fn: 'switchDepOpsTab', re: /switchDepOpsTab\(\s*'([\w-]+)'/, tabs: () => [['inbound', 'Inbound'], ['outward', 'Outward / Repatriation'], ['zones', 'Zones'], ['yard', 'Yard Map'], ['escalations', 'Escalations'], ['surveys', 'Surveyed Register'], ['master', 'Master List'], ['reports', 'Reports']] },
    hr: { fn: 'renderHR', re: /renderHR\(\s*'([\w-]+)'/, first: 'overview', tabs: () => (typeof HR_TABS !== 'undefined' ? HR_TABS.map(t => [t[0], t[1]]) : []) },
    finance: {
      fn: 'renderFinance', re: /renderFinance\(\s*'([\w-]+)'/, first: 'overview',
      tabs: () => { const x = (window.GARGO_FIN && GARGO_FIN.tabs) || {}; return FIN_BASE.concat(Object.keys(x).map(k => [k, x[k].label || k])); },
    },
  };
  const subTabs = sec => (SUBS[sec] ? SUBS[sec].tabs() : []);

  /* ═════════════ 2. DENIED TABS: enforcement ═════════════ */
  const deniedOf = p => { const a = p && (p.denied_subs || p.deniedSubs); return Array.isArray(a) ? a : []; };
  function isDenied(sec, sub, prof) {
    const p = prof || state.profile; if (!p || p.role === 'admin') return false;
    return deniedOf(p).indexOf(sec + ':' + sub) > -1;
  }
  const firstAllowed = sec => { const t = subTabs(sec).filter(x => !isDenied(sec, x[0])); return t.length ? t[0][0] : null; };
  function findBtn(sec, id) {
    const root = $('sec-' + sec), cfg = SUBS[sec]; if (!root) return undefined;
    return Array.prototype.find.call(root.querySelectorAll('button[onclick]'), b => { const m = cfg.re.exec(b.getAttribute('onclick') || ''); return m && m[1] === id; });
  }

  function wrapTabFn(sec) {
    const cfg = SUBS[sec], f = window[cfg.fn];
    if (typeof f !== 'function' || f._acw) return;
    const w = function (tab) {
      const bad = tab == null ? (cfg.first && isDenied(sec, cfg.first)) : isDenied(sec, tab);
      if (!bad) return f.apply(this, arguments);
      const alt = firstAllowed(sec);
      if (alt == null) { if (typeof toast === 'function') toast('You do not have access to any part of this section', 'error'); return; }
      return f.call(this, alt, findBtn(sec, alt));
    };
    w._acw = true; window[cfg.fn] = w;
  }

  function paintSection(sec) {
    const root = $('sec-' + sec), cfg = SUBS[sec]; if (!root) return;
    root.querySelectorAll('button[onclick]').forEach(b => {
      const m = cfg.re.exec(b.getAttribute('onclick') || ''); if (!m) return;
      if (isDenied(sec, m[1])) { b.style.display = 'none'; b.setAttribute('data-ac-hid', '1'); }
      else if (b.getAttribute('data-ac-hid')) { b.style.display = ''; b.removeAttribute('data-ac-hid'); }
    });
    root.querySelectorAll('.fin-grp').forEach(g => {            /* a Finance group heading with every tab hidden goes too */
      let n = g.nextElementSibling, any = false;
      while (n && !n.classList.contains('fin-grp')) { if (n.tagName === 'BUTTON' && n.style.display !== 'none') any = true; n = n.nextElementSibling; }
      if (!any) { g.style.display = 'none'; g.setAttribute('data-ac-hid', '1'); } else if (g.getAttribute('data-ac-hid')) { g.style.display = ''; g.removeAttribute('data-ac-hid'); }
    });
  }
  /* static tab bars (dispatch, inward...): if the tab that is showing is denied, open the first allowed one */
  function landing(sec) {
    const root = $('sec-' + sec), cfg = SUBS[sec]; if (!root || sec === 'hr' || sec === 'finance') return;
    const act = Array.prototype.find.call(root.querySelectorAll('button.active[onclick]'), b => cfg.re.test(b.getAttribute('onclick') || ''));
    const m = act && cfg.re.exec(act.getAttribute('onclick'));
    if (m && isDenied(sec, m[1])) { const alt = firstAllowed(sec); if (alt) { const b = findBtn(sec, alt); if (b) b.click(); } }
  }
  const watched = {};
  function watch(sec) {
    const root = $('sec-' + sec); if (!root || watched[sec]) return; watched[sec] = true;
    let q = 0;
    new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; paintSection(sec); }); }).observe(root, { childList: true, subtree: true });
    new MutationObserver(() => { if (root.classList.contains('active')) { paintSection(sec); landing(sec); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  function enforceAll() { Object.keys(SUBS).forEach(sec => { wrapTabFn(sec); watch(sec); paintSection(sec); if ($('sec-' + sec) && $('sec-' + sec).classList.contains('active')) landing(sec); }); }

  /* ═════════════ 3. LIVE SYNC OF THE SIGNED-IN USER ═════════════ */
  const sig = p => JSON.stringify([p.role, !!p.active, p.nav_sections || null, p.admin_sections || null, p.denied_subs || null]);
  let syncing = false;
  async function syncSelf() {
    if (syncing || !navigator.onLine) return;
    try { if (!state.currentUser || !state.profile || document.hidden) return; } catch (e) { return; }
    syncing = true;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', state.currentUser.id).maybeSingle();
      if (error || !data) return;
      if (!data.active) { toast('Your account was deactivated by an administrator.', 'error', 6000); if (typeof forceLogout === 'function') forceLogout('Account deactivated'); return; }
      if (sig(data) === sig(state.profile)) return;
      const prev = state.profile.role; state.profile = data; state.currentUser.role = data.role;
      if (prev !== data.role && (prev === 'driver' || data.role === 'driver')) { toast('Your role changed. Reloading…', 'info', 2500); setTimeout(() => location.reload(), 1500); return; }
      if (typeof applyRoleUI === 'function') applyRoleUI();
      enforceAll();
      try { buildBadges(); } catch (e) {}
      const cur = document.querySelector('.section.active'), id = cur && cur.id.replace(/^sec-/, '');
      if (id && !canSeeSection(id) && !canSeeAdminSection(id)) { const d = defaultSectionForRole(); showSection(d, document.querySelector('.nav-item[data-section="' + d + '"]')); }
      toast('Your access was updated by an administrator.', 'info', 5000);
    } catch (e) { console.warn('access sync:', e && e.message); } finally { syncing = false; }
  }
  setInterval(syncSelf, 45000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(syncSelf, 600); });
  window.addEventListener('online', () => setTimeout(syncSelf, 3000));

  const _boot = window.bootShell;
  if (typeof _boot === 'function') window.bootShell = function () { const r = _boot.apply(this, arguments); try { enforceAll(); } catch (e) { console.warn('enforce', e); } return r; };
  const _ss = window.showSection;
  if (typeof _ss === 'function') window.showSection = function (sec) { const r = _ss.apply(this, arguments); try { if (SUBS[sec]) { paintSection(sec); landing(sec); } } catch (e) {} return r; };

  /* ═════════════ 4. USER MANAGEMENT ═════════════ */
  const css = document.createElement('style');
  css.textContent = `
.modal-box.ac-wide{max-width:800px;width:min(800px,96vw)}
.ac-bar{display:flex;flex-wrap:wrap;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);align-items:center}
.ac-bar input,.ac-bar select{height:34px;min-height:0;padding:0 10px;font-size:12px;border-radius:8px;background:var(--surface);border:1px solid var(--border);color:var(--text)}
.ac-bar input{flex:1;min-width:140px}
.ac-bulk{display:none;gap:8px;align-items:center;padding:8px 12px;background:var(--gold-dim);border-bottom:1px solid var(--border-mid);font-size:12px;flex-wrap:wrap}
.ac-bulk.on{display:flex}
.ac-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer}
.ac-row:hover{background:var(--hover)}
.ac-row.off{opacity:.6}
.ac-row input[type=checkbox]{flex:none;width:16px;height:16px;min-height:0}
.ac-main{flex:1;min-width:0}
.ac-name{font-size:13px;font-weight:600;color:var(--text);display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ac-meta{font-size:11px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-tag{font:600 9px var(--font-mono,monospace);letter-spacing:.5px;text-transform:uppercase;padding:2px 6px;border-radius:5px;border:1px solid var(--border-mid);color:var(--gold);background:var(--gold-dim)}
.ac-tag.r{color:var(--red);border-color:var(--red);background:var(--red-dim)}.ac-tag.a{color:var(--amber);border-color:var(--amber);background:var(--amber-dim)}.ac-tag.g{color:var(--green);border-color:var(--green);background:var(--green-dim)}
.ac-act{display:flex;gap:6px;flex:none}
.ac-act button{padding:5px 10px;font-size:11px;min-height:0}
.ac-empty{padding:24px;text-align:center;color:var(--text-3);font-size:12.5px}
.ac-chk{padding:10px 12px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;font-size:12.5px}
.ac-chk .ac-dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex:none}
.ac-chk.bad .ac-dot{background:var(--red)}.ac-chk.warn .ac-dot{background:var(--amber)}.ac-chk.info .ac-dot{background:var(--blue)}
.ac-chk .ac-x{flex:1;min-width:0;color:var(--text-2);line-height:1.45}.ac-chk b{color:var(--text)}
.ac-grp{font:600 9px var(--font-mono,monospace);letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin:10px 0 5px}
.ac-sec{border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface)}
.ac-sec.has-deny{border-color:var(--amber)}
.ac-sec>label{display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:12.5px;color:var(--text);cursor:pointer}
.ac-sec input[type=checkbox]{width:16px;height:16px;min-height:0;flex:none}
.ac-sec summary{padding:0 10px 8px 34px;font-size:11px;color:var(--text-3);cursor:pointer}
.ac-sec.has-deny summary{color:var(--amber)}
.ac-subgrid{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 8px 34px}
.ac-subgrid label{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text);background:var(--bg);border:1px solid var(--border);padding:4px 8px;border-radius:5px;cursor:pointer}
.ac-subgrid label.off{opacity:.4}
.ac-subtools{padding:0 10px 8px 34px;display:flex;gap:6px}
.ac-subtools button{padding:3px 9px;font-size:10.5px;min-height:0}
.ac-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.ac-tools button,.ac-tools select{padding:5px 10px;font-size:11px;min-height:0;height:30px}
.ac-sum{font-size:11.5px;color:var(--text-2);padding:8px 10px;background:var(--surface);border-radius:6px;margin:8px 0}
.ac-gridwrap.ac-lock{opacity:.35;pointer-events:none}
.ac-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.ac-chips span{font-size:11px;padding:3px 8px;border-radius:5px;background:var(--surface);border:1px solid var(--border);color:var(--text-2)}
.ac-chips span.x{border-color:var(--amber);color:var(--amber)}
.ac-cred{font-family:var(--font-mono,monospace);font-size:12.5px;line-height:1.9;padding:12px;background:var(--surface);border:1px solid var(--border-mid);border-radius:8px;user-select:all;word-break:break-all}
`;
  document.head.appendChild(css);

  /* ── helpers ── */
  const profiles = () => (state.db && state.db.profiles) || [];
  const navOf = u => (Array.isArray(u.navSections) ? u.navSections : (ROLE_SIDEBAR[u.role] || []));
  const admOf = u => (Array.isArray(u.adminSections) ? u.adminSections : (ROLE_ADMINRAIL[u.role] || []));
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.indexOf(x) > -1);
  const isCustom = u => u.role !== 'admin' && (!!(u.deniedSubs && u.deniedSubs.length) || (Array.isArray(u.navSections) && !sameSet(u.navSections, ROLE_SIDEBAR[u.role] || [])) || (Array.isArray(u.adminSections) && !sameSet(u.adminSections, ROLE_ADMINRAIL[u.role] || [])));
  const daysAgo = iso => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null);
  const activeAdmins = () => profiles().filter(u => u.role === 'admin' && u.active).length;
  const token = async () => { const { data: { session } } = await supabase.auth.getSession(); return (session && session.access_token) || ''; };
  const wide = () => { const b = document.querySelector('#modalOverlay .modal-box'); if (b) b.classList.add('ac-wide'); };
  const _om = window.openModal;
  if (typeof _om === 'function') window.openModal = function () { const b = document.querySelector('#modalOverlay .modal-box'); if (b) b.classList.remove('ac-wide'); return _om.apply(this, arguments); };

  /* ── the access editor (shared by Create User and Edit Access) ── */
  function gridHTML(p, nav, adm, den) {
    const groups = {};
    SECTIONS().forEach(s => { const g = SECTION_META[s][0]; (groups[g] = groups[g] || []).push(s); });
    const secs = Object.keys(groups).map(g => `<div class="ac-grp">${E(g)}</div>` + groups[g].map(s => {
      const tabs = subTabs(s), on = nav.indexOf(s) > -1;
      const subs = tabs.length ? `<details class="ac-subs"><summary id="${p}_cnt_${s}"></summary>
        <div class="ac-subgrid">${tabs.map(t => `<label id="${p}_lab_${s}_${t[0]}"><input type="checkbox" id="${p}_sub_${s}_${t[0]}" ${den.indexOf(s + ':' + t[0]) > -1 ? '' : 'checked'} onchange="acRefresh('${p}')"/> ${E(t[1])}</label>`).join('')}</div>
        <div class="ac-subtools"><button type="button" class="modal-btn" onclick="acSubAll('${p}','${s}',true)">Allow all tabs</button><button type="button" class="modal-btn" onclick="acSubAll('${p}','${s}',false)">Deny all tabs</button></div></details>` : '';
      return `<div class="ac-sec" id="${p}_row_${s}"><label><input type="checkbox" id="${p}_nav_${s}" data-sec="${s}" ${on ? 'checked' : ''} onchange="acRefresh('${p}')"/> ${E(secLabel(s))}</label>${subs}</div>`;
    }).join('')).join('');
    const rail = ADMIN_RAIL().map(s => {
      const lock = ADMIN_ONLY.indexOf(s) > -1;
      return `<label class="ac-sec" style="display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:12.5px;${lock ? 'opacity:.55' : 'cursor:pointer'}"><input type="checkbox" id="${p}_admin_${s}" ${adm.indexOf(s) > -1 && !lock ? 'checked' : ''} ${lock ? 'disabled' : ''} onchange="acRefresh('${p}')" style="width:16px;height:16px;min-height:0"/> ${E(secLabel(s))}${lock ? ' <span class="ac-tag">administrators only</span>' : ''}</label>`;
    }).join('');
    const others = profiles().filter(u => u.id !== (window._acEditId || ''));
    return `<div class="ac-tools">
        <button type="button" class="modal-btn" onclick="acPreset('${p}',document.getElementById('${p}_role').value)">Apply role defaults</button>
        <button type="button" class="modal-btn" onclick="acAll('${p}',true)">Tick all</button>
        <button type="button" class="modal-btn" onclick="acAll('${p}',false)">Untick all</button>
        <select onchange="acCopy('${p}',this.value);this.value=''"><option value="">Copy access from…</option>${others.map(u => `<option value="${u.id}">${E(u.name)} (${E(roleName(u.role))})</option>`).join('')}</select>
      </div>
      <div class="ac-sum" id="${p}_sum"></div>
      <div class="ac-gridwrap" id="${p}_wrap">
        <div class="fg"><label>Sections this user can open (expand a section to deny individual tabs inside it)</label>${secs}</div>
        <div class="fg"><label>Admin rail</label>${rail}</div>
      </div>`;
  }
  window.acRefresh = function (p) {
    const role = ($(p + '_role') || {}).value, isAdm = role === 'admin', isDrv = role === 'driver';
    const wrap = $(p + '_wrap'); if (wrap) wrap.classList.toggle('ac-lock', isAdm || isDrv);
    let secs = 0, hidden = 0;
    SECTIONS().forEach(s => {
      const m = $(p + '_nav_' + s); if (!m) return;
      const tabs = subTabs(s); let ok = 0;
      tabs.forEach(t => { const c = $(p + '_sub_' + s + '_' + t[0]); if (!c) return; c.disabled = !m.checked; if (c.checked) ok++; const l = $(p + '_lab_' + s + '_' + t[0]); if (l) l.classList.toggle('off', !m.checked || !c.checked); });
      if (m.checked) { secs++; hidden += tabs.length - ok; }
      const row = $(p + '_row_' + s); if (row) row.classList.toggle('has-deny', !!tabs.length && m.checked && ok < tabs.length);
      const cnt = $(p + '_cnt_' + s);
      if (cnt) cnt.textContent = !m.checked ? 'Section off' : (ok === tabs.length ? `All ${tabs.length} tabs allowed` : `${ok} of ${tabs.length} tabs allowed · ${tabs.length - ok} denied`);
    });
    const rail = ADMIN_RAIL().filter(s => { const c = $(p + '_admin_' + s); return c && c.checked; }).length;
    const sum = $(p + '_sum');
    if (sum) sum.textContent = isAdm ? 'Administrators always have access to everything. The ticks below are ignored.' : isDrv ? 'Drivers only see the driver portal. The ticks below are ignored.' : `${secs} section${secs === 1 ? '' : 's'} · ${hidden} tab${hidden === 1 ? '' : 's'} denied inside allowed sections · ${rail} admin rail page${rail === 1 ? '' : 's'}`;
  };
  window.acSubAll = (p, s, on) => { subTabs(s).forEach(t => { const c = $(p + '_sub_' + s + '_' + t[0]); if (c) c.checked = on; }); acRefresh(p); };
  window.acAll = (p, on) => { SECTIONS().forEach(s => { const c = $(p + '_nav_' + s); if (c) c.checked = on; }); ADMIN_RAIL().forEach(s => { const c = $(p + '_admin_' + s); if (c && !c.disabled) c.checked = on; }); acRefresh(p); };
  function setGrid(p, nav, adm, den) {
    SECTIONS().forEach(s => { const c = $(p + '_nav_' + s); if (c) c.checked = nav.indexOf(s) > -1; subTabs(s).forEach(t => { const x = $(p + '_sub_' + s + '_' + t[0]); if (x) x.checked = den.indexOf(s + ':' + t[0]) < 0; }); });
    ADMIN_RAIL().forEach(s => { const c = $(p + '_admin_' + s); if (c && !c.disabled) c.checked = adm.indexOf(s) > -1; });
    acRefresh(p);
  }
  window.acPreset = (p, role) => setGrid(p, ROLE_SIDEBAR[role] || [], ROLE_ADMINRAIL[role] || [], []);
  window.acCopy = (p, id) => { const u = profiles().find(x => x.id === id); if (u) setGrid(p, navOf(u), admOf(u), u.deniedSubs || []); };
  /* kept under the old name too: other scripts call it when the role dropdown changes */
  window.refreshAccessCheckboxesForRole = (p, role) => { if (typeof role === 'string') window.acPreset(p, role); };

  function readAccess(p) {
    const navSections = SECTIONS().filter(s => { const c = $(p + '_nav_' + s); return c && c.checked; });
    const adminSections = ADMIN_RAIL().filter(s => { const c = $(p + '_admin_' + s); return c && c.checked && ADMIN_ONLY.indexOf(s) < 0; });
    const deniedSubs = []; let empty = null;
    navSections.forEach(s => {
      const tabs = subTabs(s); if (!tabs.length) return;
      const off = tabs.filter(t => { const c = $(p + '_sub_' + s + '_' + t[0]); return c && !c.checked; });
      off.forEach(t => deniedSubs.push(s + ':' + t[0]));
      if (off.length === tabs.length) empty = s;
    });
    return { navSections, adminSections, deniedSubs, emptySection: empty };
  }
  const roleOptions = cur => ROLES.map(r => `<option value="${r[0]}" ${cur === r[0] ? 'selected' : ''}>${E(roleName(r[0]))}</option>`).join('');

  /* one write path for create / edit / bulk reset: server API for role + sections, direct update for denied tabs */
  async function persistAccess(id, a) {
    const res = await fetch('/api/update-access', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ userId: id, role: a.role, navSections: a.navSections, adminSections: a.adminSections }) });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || 'Could not update access');
    const u = profiles().find(x => x.id === id), out = { migration: false };
    const { error } = await supabase.from('profiles').update({ denied_subs: a.deniedSubs }).eq('id', id);
    if (error) { if (/denied_subs|column|schema cache/i.test(error.message || '')) out.migration = true; else throw new Error(error.message); }
    if (u) { u.role = result.profile.role; u.navSections = result.profile.nav_sections || null; u.adminSections = result.profile.admin_sections || null; u.deniedSubs = out.migration ? (u.deniedSubs || []) : a.deniedSubs; }
    return out;
  }
  const MIGRATION_MSG = 'Tab restrictions were NOT saved: run sql/2026-11-access-control.sql in Supabase first.';

  /* ── Create user ── */
  window.showCreateUserModal = function () {
    if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
    window._acEditId = '';
    openModal('Create User', `<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="cu_name" placeholder="Jane Doe" oninput="acSuggestUser()"/></div><div class="fg"><label>Username</label><input id="cu_user" placeholder="jane.doe"/></div></div>
      <div class="fg"><label>Email</label><input id="cu_email" type="email" placeholder="jane@gargo.co.ke"/></div>
      <div class="form-row-2"><div class="fg"><label>Role</label><select id="cu_role" onchange="acPreset('cu',this.value)">${roleOptions('ops')}</select></div>
      <div class="fg"><label>Password</label><div style="display:flex;gap:6px"><input id="cu_password" type="text" placeholder="At least 8 characters" style="flex:1"/><button type="button" class="modal-btn" onclick="fillGeneratedPassword('cu_password')">Generate</button></div></div></div>
      <div class="ac-sum">The login is created directly with this password (no invitation email). The role loads the default access; fine-tune it below, including individual tabs.</div>
      ${gridHTML('cu', ROLE_SIDEBAR.ops || [], ROLE_ADMINRAIL.ops || [], [])}
      <button class="submit-btn" id="cu_go" onclick="saveUser()" style="margin-top:10px">Create User →</button>`);
    wide(); acRefresh('cu');
  };
  window.acSuggestUser = function () {
    const u = $('cu_user'), n = $('cu_name'); if (!u || !n || u.dataset.t === '1') return;
    u.value = String(n.value).toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
  };
  document.addEventListener('input', e => { if (e.target && e.target.id === 'cu_user') e.target.dataset.t = '1'; });

  window.saveUser = async function () {
    const v = id => ($(id) ? $(id).value.trim() : '');
    const name = v('cu_name'), user = v('cu_user').toLowerCase(), email = v('cu_email'), password = $('cu_password').value, role = $('cu_role').value;
    if (!name || !user || !email || !password) return toast('Name, username, email and password required', 'error');
    if (!validateEmail(email)) return toast('Invalid email format', 'error');
    if (password.length < 8) return toast('Password must be at least 8 characters', 'error');
    if (profiles().some(u => u.username === user)) return toast('Username taken', 'error');
    if (profiles().some(u => String(u.email).toLowerCase() === email.toLowerCase())) return toast('That email already has a login', 'error');
    const a = readAccess('cu');
    if (role !== 'admin' && role !== 'driver' && a.emptySection) return toast(`Every tab of ${secLabel(a.emptySection)} is denied. Untick the section instead.`, 'error', 5000);
    if (role !== 'admin' && role !== 'driver' && !a.navSections.length && !a.adminSections.length && !confirm('No sections are ticked, so this user will only see the Data Hub. Continue?')) return;
    const btn = $('cu_go'); if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ name, username: user, email, password, role, navSections: a.navSections, adminSections: a.adminSections }) });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { toast(result.error || 'Could not create user', 'error'); return; }
      const p = result.profile; let mig = false;
      if (a.deniedSubs.length) { const { error } = await supabase.from('profiles').update({ denied_subs: a.deniedSubs }).eq('id', p.id); if (error) mig = true; }
      profiles().push({ id: p.id, name: p.name, username: p.username, email: p.email, role: p.role, active: p.active, created: p.created_at, lastLogin: null, navSections: p.nav_sections || null, adminSections: p.admin_sections || null, deniedSubs: mig ? [] : a.deniedSubs });
      addAudit(state.profile.username, 'User Created', `${name} (${user}) as ${roleName(role)}`);
      closeModal(); renderUserMgmt();
      openModal('User created', `<div style="font-size:12.5px;color:var(--text-2);margin-bottom:8px">Share these sign-in details with ${E(name)} directly.</div>
        <div class="ac-cred" id="acCred">Address: ${E(location.origin)}\nEmail: ${E(email)}\nPassword: ${E(password)}</div>
        ${mig ? `<div class="ac-sum" style="color:var(--amber)">${MIGRATION_MSG}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:10px"><button class="submit-btn" onclick="acCopyCred()">Copy details</button><button class="modal-btn" onclick="closeModal()">Done</button></div>`);
      $('acCred').style.whiteSpace = 'pre-line';
    } catch (e) { console.error(e); toast('Network error creating user', 'error'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Create User →'; } }
  };
  window.acCopyCred = function () {
    const t = ($('acCred') || {}).innerText || '';
    try { navigator.clipboard.writeText(t).then(() => toast('Copied', 'success'), () => toast('Select the text and copy it', 'info')); } catch (e) { toast('Select the text and copy it', 'info'); }
  };

  /* ── Edit access ── */
  window.showEditAccessModal = function (id) {
    if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
    const u = profiles().find(x => x.id === id); if (!u) return;
    window._acEditId = id;
    openModal(`Edit Access — ${u.name}`, `<div class="fg"><label>Role</label><select id="ea_role" onchange="acRefresh('ea')">${roleOptions(u.role)}</select></div>
      <div class="ac-sum">Changing the role does not change the ticks. Use <b>Apply role defaults</b> to load that role's standard access.</div>
      ${gridHTML('ea', navOf(u), admOf(u), u.deniedSubs || [])}
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="submit-btn" id="ea_go" onclick="saveUserAccess('${id}')">Save Access</button><button class="modal-btn" onclick="showSetPasswordModal('${id}')">Set New Password</button></div>`);
    wide(); acRefresh('ea');
  };
  const diffText = (u, role, a) => {
    const oldN = navOf(u), oldD = u.deniedSubs || [], bits = [];
    if (u.role !== role) bits.push(`role ${roleName(u.role)} → ${roleName(role)}`);
    const add = a.navSections.filter(s => oldN.indexOf(s) < 0).map(secLabel), rem = oldN.filter(s => a.navSections.indexOf(s) < 0).map(secLabel);
    if (add.length) bits.push('+' + add.join(', ')); if (rem.length) bits.push('−' + rem.join(', '));
    const dAdd = a.deniedSubs.filter(x => oldD.indexOf(x) < 0), dRem = oldD.filter(x => a.deniedSubs.indexOf(x) < 0);
    if (dAdd.length) bits.push('tabs denied: ' + dAdd.join(', ')); if (dRem.length) bits.push('tabs restored: ' + dRem.join(', '));
    return bits.join('; ') || 'no change';
  };
  window.saveUserAccess = async function (id) {
    const u = profiles().find(x => x.id === id); if (!u) return;
    const role = $('ea_role').value, a = readAccess('ea');
    if (u.id === state.profile.id && u.role === 'admin' && role !== 'admin') return toast('You cannot remove your own administrator role.', 'error', 4500);
    if (u.role === 'admin' && role !== 'admin' && u.active && activeAdmins() <= 1) return toast('This is the only active administrator. Make someone else an administrator first.', 'error', 5000);
    if (role !== 'admin' && role !== 'driver' && a.emptySection) return toast(`Every tab of ${secLabel(a.emptySection)} is denied. Untick the section instead.`, 'error', 5000);
    if (role !== 'admin' && role !== 'driver' && !a.navSections.length && !a.adminSections.length && !confirm('No sections are ticked, so this user will only see the Data Hub. Save anyway?')) return;
    const btn = $('ea_go'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const detail = diffText(u, role, a);
      const out = await persistAccess(id, Object.assign({ role }, a));
      addAudit(state.profile.username, 'User Access Updated', `${u.name}: ${detail}`);
      closeModal(); renderUserMgmt();
      if (out.migration) toast(MIGRATION_MSG, 'warning', 8000); else toast('Access updated. It reaches the user within a minute.', 'success', 4000);
    } catch (e) { console.error(e); toast(e.message || 'Network error updating access', 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Save Access'; } }
  };

  /* ── status toggle with the last-admin guard ── */
  async function setActive(id, on, quiet) {
    const u = profiles().find(x => x.id === id); if (!u || u.active === on) return true;
    if (!on && u.id === state.profile.id) { if (!quiet) toast('You cannot deactivate your own account.', 'error'); return false; }
    if (!on && u.role === 'admin' && activeAdmins() <= 1) { if (!quiet) toast('This is the only active administrator.', 'error', 4500); return false; }
    const { error } = await supabase.from('profiles').update({ active: on }).eq('id', id);
    if (error) { if (!quiet) toast('Could not update user', 'warning'); return false; }
    u.active = on; addAudit(state.profile.username, 'User Status', `${u.name} → ${on ? 'active' : 'deactivated'}`);
    return true;
  }
  window.toggleUserActive = async function (id) {
    const u = profiles().find(x => x.id === id); if (!u) return;
    if (await setActive(id, !u.active)) { closeModal(); renderUserMgmt(); toast(`${u.name} ${u.active ? 'activated' : 'deactivated. They are signed out within a minute.'}`, 'success'); }
  };

  /* ── user detail: effective access at a glance ── */
  window.showUserDetail = function (id) {
    const u = profiles().find(x => x.id === id); if (!u) return;
    const nav = u.role === 'admin' ? SECTIONS() : navOf(u), den = u.deniedSubs || [];
    const chips = u.role === 'driver' ? '<span>Driver portal</span>' : nav.filter(s => SECTION_META[s]).map(s => { const d = den.filter(x => x.indexOf(s + ':') === 0).length; return `<span class="${d ? 'x' : ''}">${E(secLabel(s))}${d ? ` (−${d} tab${d > 1 ? 's' : ''})` : ''}</span>`; }).join('') || '<span>None (Data Hub only)</span>';
    const hid = den.map(x => { const [s, t] = x.split(':'), f = subTabs(s).find(y => y[0] === t); return `<span class="x">${E(secLabel(s))} › ${E(f ? f[1] : t)}</span>`; }).join('');
    openModal(`User — ${u.name}`, `<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div class="user-av-lg" style="width:48px;height:48px;font-size:16px">${initials(u.name)}</div><div><div style="font-size:15px;font-weight:700;color:var(--text)">${E(u.name)}</div><div class="mono" style="font-size:9px;color:var(--text-3)">${E(u.id)}</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="fg" style="margin:0"><label>Username</label><div class="mono">${E(u.username)}</div></div><div class="fg" style="margin:0"><label>Role</label><div>${E(roleName(u.role))}${isCustom(u) ? ' <span class="ac-tag">custom</span>' : ''}</div></div>
        <div class="fg" style="margin:0"><label>Email</label><div style="font-size:12px">${E(u.email)}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(u.active ? 'active' : 'off_duty')}</div></div>
        <div class="fg" style="margin:0"><label>Created</label><div class="mono" style="font-size:10px">${fmtDate(u.created)}</div></div><div class="fg" style="margin:0"><label>Last Login</label><div class="mono" style="font-size:10px">${u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}</div></div></div>
      <div class="fg"><label>Can open</label><div class="ac-chips">${chips}</div></div>
      ${hid ? `<div class="fg"><label>Tabs denied</label><div class="ac-chips">${hid}</div></div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="modal-btn" onclick="showEditAccessModal('${u.id}')">Edit Access</button><button class="modal-btn" onclick="showSetPasswordModal('${u.id}')">Set New Password</button>
      ${u.id !== state.profile.id ? `<button class="modal-btn ${u.active ? 'danger' : 'success'}" onclick="toggleUserActive('${u.id}')">${u.active ? 'Deactivate' : 'Activate'} User</button>` : '<span style="font-size:11px;color:var(--text-3);align-self:center">This is your account</span>'}</div>`);
  };

  /* ── Access Check ── */
  function checkAccess() {
    const out = [], P = profiles(), push = (u, level, msg, fix) => out.push({ u, level, msg, fix });
    if (P.filter(u => u.role === 'admin' && u.active).length === 1) out.push({ u: null, level: 'warn', msg: 'Only one active administrator. If that login is lost nobody can manage users. Make a second administrator.' });
    P.forEach(u => {
      if (!u.active) return;
      if (ROLE_IDS.indexOf(u.role) < 0) return push(u, 'bad', `Role "${E(u.role)}" is not recognised, so this user may not be able to open anything.`, 'reset');
      if (u.role === 'admin') return;
      const nav = navOf(u).filter(s => SECTION_META[s]), adm = admOf(u);
      if (u.role === 'driver') { if (!(state.db.drivers || []).some(d => d.profileId === u.id)) push(u, 'warn', 'Driver login with no driver record linked, so the driver portal will be empty. Link it on the Drivers page.'); return; }
      const stale = (navOf(u) || []).filter(s => !SECTION_META[s]);
      if (!nav.filter(s => s !== 'reportcentre').length && !adm.length) push(u, 'bad', 'Cannot open any section (Data Hub only).', 'reset');
      if (stale.length) push(u, 'warn', `Access list holds retired sections (${stale.join(', ')}).`, 'reset');
      if (CORE[u.role] && nav.indexOf(CORE[u.role]) < 0) push(u, 'warn', `${roleName(u.role)} without ${secLabel(CORE[u.role])}, the section this role exists for.`, 'reset');
      const den = u.deniedSubs || [];
      Object.keys(SUBS).forEach(s => { const t = subTabs(s); if (nav.indexOf(s) > -1 && t.length && t.every(x => den.indexOf(s + ':' + x[0]) > -1)) push(u, 'bad', `Every tab of ${secLabel(s)} is denied, so the section opens empty.`, 'reset'); });
      const age = daysAgo(u.lastLogin);
      if (age === null && daysAgo(u.created) > 7) push(u, 'info', `Created ${daysAgo(u.created)} days ago and never signed in.`);
      else if (age !== null && age > 60) push(u, 'info', `No sign-in for ${age} days. Deactivate if they have left.`);
    });
    return out;
  }
  window.acFix = async function (id) {
    const u = profiles().find(x => x.id === id); if (!u) return;
    const role = ROLE_IDS.indexOf(u.role) < 0 ? 'viewer' : u.role;
    try { await persistAccess(id, { role, navSections: ROLE_SIDEBAR[role] || [], adminSections: (ROLE_ADMINRAIL[role] || []).filter(s => ADMIN_ONLY.indexOf(s) < 0), deniedSubs: [] }); addAudit(state.profile.username, 'User Access Reset', `${u.name} → ${roleName(role)} defaults`); toast(`${u.name} reset to ${roleName(role)} defaults`, 'success'); renderUserMgmt(); }
    catch (e) { toast(e.message || 'Could not reset', 'error'); }
  };
  window.acFixAll = async function () {
    const ids = Array.from(new Set(checkAccess().filter(i => i.fix && i.u).map(i => i.u.id)));
    if (!ids.length || !confirm(`Reset ${ids.length} user${ids.length > 1 ? 's' : ''} to their role defaults? Their custom ticks and denied tabs will be replaced.`)) return;
    for (const id of ids) await window.acFix(id);
  };
  function renderCheck() {
    const host = $('acCheckPanel'); if (!host) return;
    const items = checkAccess(), bad = items.filter(i => i.level === 'bad').length, warn = items.filter(i => i.level === 'warn').length, fixable = items.filter(i => i.fix).length;
    host.innerHTML = `<div class="panel-head"><span class="panel-title">Access Check</span><span>${bad ? `<span class="ac-tag r">${bad} problem${bad > 1 ? 's' : ''}</span> ` : ''}${warn ? `<span class="ac-tag a">${warn} warning${warn > 1 ? 's' : ''}</span> ` : ''}${fixable ? `<button class="action-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="acFixAll()">Reset ${fixable} to role defaults</button>` : ''}</span></div>` +
      (items.length ? items.map(i => `<div class="ac-chk ${i.level}"><span class="ac-dot"></span><div class="ac-x"><b>${i.u ? E(i.u.name) : 'System'}</b> · ${i.msg}</div>${i.u ? `<div class="ac-act"><button class="modal-btn" onclick="showEditAccessModal('${i.u.id}')">Edit</button>${i.fix ? `<button class="modal-btn" onclick="acFix('${i.u.id}')">Reset</button>` : ''}</div>` : ''}</div>`).join('') : '<div class="ac-empty">Every active user can open what their role needs.</div>');
  }

  /* ── user list: search, filters, bulk ── */
  const F = { q: '', role: '', st: '' }, SEL = new Set();
  const KPI = (l, v, s, c) => (typeof kpiCard === 'function' ? kpiCard(l, v, s || '', c) : `<div class="kpi-card ${c}"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`);
  function visibleUsers() {
    const q = F.q.toLowerCase();
    return profiles().filter(u => {
      if (q && ![u.name, u.username, u.email, roleName(u.role)].some(x => String(x || '').toLowerCase().indexOf(q) > -1)) return false;
      if (F.role && u.role !== F.role) return false;
      if (F.st === 'active' && !u.active) return false;
      if (F.st === 'inactive' && u.active) return false;
      if (F.st === 'custom' && !isCustom(u)) return false;
      if (F.st === 'never' && u.lastLogin) return false;
      if (F.st === 'stale' && !(u.lastLogin && daysAgo(u.lastLogin) > 30)) return false;
      return true;
    }).sort((a, b) => (b.active - a.active) || String(a.name).localeCompare(String(b.name)));
  }
  function ensureBar() {
    const ul = $('userList'); if (!ul || $('acBar')) return;
    ul.insertAdjacentHTML('beforebegin', `<div class="ac-bar" id="acBar"><input id="acQ" placeholder="Search name, username, email or role…" oninput="acFilter()"/>
      <select id="acRole" onchange="acFilter()"><option value="">All roles</option>${ROLES.map(r => `<option value="${r[0]}">${E(roleName(r[0]))}</option>`).join('')}</select>
      <select id="acSt" onchange="acFilter()"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="custom">Custom access</option><option value="never">Never signed in</option><option value="stale">No sign-in 30+ days</option></select></div>
      <div class="ac-bulk" id="acBulk"><b id="acSelN"></b><button class="modal-btn" onclick="acBulk('on')">Activate</button><button class="modal-btn danger" onclick="acBulk('off')">Deactivate</button><button class="modal-btn" onclick="acBulk('reset')">Reset to role defaults</button><button class="modal-btn" onclick="acBulk('clear')">Clear</button></div>`);
    const gh = $('auditLog') && $('auditLog').closest('.panel');
    if (gh && !$('acCheckPanel')) gh.insertAdjacentHTML('beforebegin', '<div class="panel" id="acCheckPanel" style="margin-top:14px"></div>');
  }
  window.acFilter = function () { F.q = ($('acQ') || {}).value || ''; F.role = ($('acRole') || {}).value || ''; F.st = ($('acSt') || {}).value || ''; renderList(); };
  window.acSel = function (id, on, ev) { if (ev) ev.stopPropagation(); on ? SEL.add(id) : SEL.delete(id); paintBulk(); };
  function paintBulk() { const b = $('acBulk'); if (!b) return; b.classList.toggle('on', SEL.size > 0); $('acSelN').textContent = SEL.size + ' selected'; }
  window.acBulk = async function (what) {
    if (what === 'clear') { SEL.clear(); renderList(); return; }
    const ids = Array.from(SEL); if (!ids.length) return;
    if (what === 'reset') { if (!confirm(`Reset ${ids.length} user(s) to their role defaults?`)) return; for (const id of ids) await window.acFix(id); SEL.clear(); return; }
    if (what === 'off' && !confirm(`Deactivate ${ids.length} user(s)? They are signed out within a minute.`)) return;
    let ok = 0, skip = 0; for (const id of ids) { (await setActive(id, what === 'on', true)) ? ok++ : skip++; }
    SEL.clear(); renderUserMgmt(); toast(`${ok} updated${skip ? `, ${skip} skipped (yourself or the last administrator)` : ''}`, skip ? 'warning' : 'success', 4500);
  };
  function renderList() {
    const ul = $('userList'); if (!ul) return;
    const rows = visibleUsers();
    ul.innerHTML = rows.length ? rows.map(u => {
      const den = (u.deniedSubs || []).length, age = daysAgo(u.lastLogin);
      return `<div class="ac-row ${u.active ? '' : 'off'}" onclick="showUserDetail('${u.id}')"><input type="checkbox" ${SEL.has(u.id) ? 'checked' : ''} onclick="acSel('${u.id}',this.checked,event)"/>
        <div class="user-av-lg">${initials(u.name)}</div>
        <div class="ac-main"><div class="ac-name">${E(u.name)} ${!u.active ? '<span class="ac-tag r">inactive</span>' : ''}${isCustom(u) ? '<span class="ac-tag">custom</span>' : ''}${den ? `<span class="ac-tag a">${den} tab${den > 1 ? 's' : ''} denied</span>` : ''}${!u.lastLogin ? '<span class="ac-tag a">never signed in</span>' : ''}</div>
          <div class="ac-meta">${E(u.username)} · ${E(u.email)}</div></div>
        <span class="sbadge s-${u.role === 'admin' ? 'pending' : u.role === 'finance' ? 'completed' : 'active'}" style="font-size:9px">${E(roleName(u.role))}</span>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);min-width:64px;text-align:right">${age === null ? '—' : timeAgo(u.lastLogin)}</div>
        <div class="ac-act" onclick="event.stopPropagation()"><button class="modal-btn" onclick="showEditAccessModal('${u.id}')">Access</button></div></div>`;
    }).join('') : '<div class="ac-empty">No users match these filters.</div>';
    paintBulk();
  }

  window.renderUserMgmt = function () {
    if (!isAdmin()) {
      const k = $('userKpis'); if (k) k.innerHTML = `<div class="vault-locked-banner" style="grid-column:1/-1"><div><div class="title">Admin Access Required</div><div class="desc">User management is restricted to System Administrators.</div></div></div>`;
      const ul = $('userList'); if (ul) ul.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div>Admin access required.</div>'; return;
    }
    ensureBar();
    const U = profiles(), k = $('userKpis');
    if (k) k.innerHTML = KPI('Users', U.length, `${U.filter(u => u.active).length} active`, 'kpi-gold') + KPI('Administrators', U.filter(u => u.role === 'admin' && u.active).length, '', 'kpi-blue') + KPI('Custom access', U.filter(isCustom).length, 'differs from role', 'kpi-orange') + KPI('Never signed in', U.filter(u => u.active && !u.lastLogin).length, '', U.some(u => u.active && !u.lastLogin) ? 'kpi-red' : 'kpi-green');
    renderList(); renderCheck();
    const rl = $('roleList');
    if (rl) rl.innerHTML = ROLES.map(r => { const n = (ROLE_SIDEBAR[r[0]] || []).length, c = U.filter(u => u.role === r[0] && u.active).length; return `<div class="role-card"><div class="role-name">${E(roleName(r[0]))} <span class="ac-tag">${c} user${c === 1 ? '' : 's'}</span></div><div class="role-perms">${E(r[2])}${r[0] === 'admin' || r[0] === 'driver' ? '' : ` Default: ${n} section${n === 1 ? '' : 's'}.`}</div></div>`; }).join('');
    const a = $('auditLog');
    if (a) a.innerHTML = [...state.db.auditLog].sort((x, y) => new Date(y.time) - new Date(x.time)).slice(0, 25).map(x => `<div class="audit-row"><div class="audit-time">${fmtTime(x.time)} · ${fmtDate(x.time)}</div><div class="user-av-rail" style="width:22px;height:22px;font-size:8px">${initials(x.user)}</div><div style="flex:1;font-size:11.5px"><span style="font-weight:600;color:var(--text)">${E(x.action)}</span><span style="color:var(--text-3);margin-left:6px">${E(x.detail)}</span></div></div>`).join('');
  };
  if (typeof sectionRenderers !== 'undefined') sectionRenderers.usermgmt = window.renderUserMgmt;

  window.GargoAccess = { isDenied, subTabs, checkAccess, syncSelf, enforce: enforceAll, ROLES };
  try { enforceAll(); } catch (e) { console.warn('access-control init', e); }
})();
