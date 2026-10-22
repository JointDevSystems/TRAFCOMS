'use strict';

(function () {
  if (window.NX) return;

  /* ───────────── helpers ───────────── */
  const $ = id => document.getElementById(id);
  const ready = () => !!(window.state && window.state.currentUser);
  const isDrv = () => { try { return isDriver(); } catch (e) { return false; } };
  const canSee = s => { try { return canSeeSection(s) || canSeeAdminSection(s); } catch (e) { return false; } };
  const metaOf = s => (typeof SECTION_META !== 'undefined' && SECTION_META[s]) || null;
  const titleOf = s => (metaOf(s) || [])[1] || s;
  const landing = () => { try { return defaultSectionForRole(); } catch (e) { return 'dashboard'; } };
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
  const mobile = window.matchMedia('(max-width:900px)');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  const go = (sec, o) => { if (window.NAV && NAV.go) return NAV.go(sec, o); const b = document.querySelector('.nav-item[data-section="' + sec + '"]') || $('adminBtn-' + sec); return window.showSection(sec, b); };

  const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IC = {
    home: svg('<path d="M3 11.5L12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>'),
    depot: svg('<rect x="2.5" y="5" width="19" height="6" rx=".5"/><rect x="2.5" y="13" width="19" height="6" rx=".5"/><path d="M7 5v6M12 5v6M17 5v6M7 13v6M12 13v6M17 13v6"/>'),
    fleet: svg('<path d="M1.5 6.5h12v9.5h-12z"/><path d="M13.5 9.5h4.2l3.3 3.3V16h-7.5z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    compliance: svg('<path d="M12 3l7.5 2.8v5.6c0 4.3-3 7.6-7.5 9.6-4.5-2-7.5-5.3-7.5-9.6V5.8z"/><path d="M8.7 12l2.3 2.3 4.3-4.6"/>'),
    finance: svg('<path d="M4 7.5A2.5 2.5 0 016.5 5H18v3"/><rect x="3" y="8" width="18" height="11.5" rx="1"/><circle cx="16.5" cy="13.8" r="1.2"/>'),
    insights: svg('<path d="M3.5 20.5h17"/><path d="M6.5 20.5v-7M12 20.5V5M17.5 20.5v-10.5"/>'),
    platform: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
    more: svg('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
    pin: svg('<rect x="3" y="4.5" width="18" height="15" rx="1"/><path d="M9.5 4.5v15"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16 16"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    bolt: svg('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
    back: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  };

  /* ───────────── what lives where ───────────── */
  const AREAS = [
    { id: 'home', label: 'Home', short: 'Home', blurb: 'Where you start', hue: '#FF9A52', icon: IC.home, groups: [['', ['dashboard']]] },
    { id: 'depot', label: 'Depot', short: 'Depot', blurb: 'Gate, yard and shipping lines', hue: '#FF9A52', icon: IC.depot,
      groups: [['Gate and yard', ['depops', 'inward', 'publicbookings', 'interchange', 'shutout']], ['Vessels and lines', ['prestaking', 'depotreport', 'shippinglines']]] },
    { id: 'fleet', label: 'Fleet', short: 'Fleet', blurb: 'Trucks, drivers and trips', hue: '#5AA4DB', icon: IC.fleet,
      groups: [['Movement', ['dispatch', 'trips', 'livetracking']], ['Assets', ['trucks', 'drivers', 'maintenance', 'fuel']]] },
    { id: 'compliance', label: 'Compliance', short: 'Compliance', blurb: 'Requests and workshop jobs', hue: '#3FB5B0', icon: IC.compliance,
      groups: [['', ['requisitions', 'workshop']]] },
    { id: 'finance', label: 'Finance & HR', short: 'Finance', blurb: 'Money, approvals and people', hue: '#3DB486', icon: IC.finance,
      groups: [['Finance', ['finance', 'invoicing', 'approvals']], ['People', ['hr', 'people']]] },
    { id: 'insights', label: 'Insights', short: 'Insights', blurb: 'Allocation, analysis and reports', hue: '#9C8FE0', icon: IC.insights,
      groups: [['', ['allocation', 'workanalysis', 'reports', 'tripreports']]] },
    { id: 'platform', label: 'Platform', short: 'Platform', blurb: 'Users and system settings', hue: '#A9B7D6', icon: IC.platform, bottom: true,
      groups: [['', ['usermgmt', 'settings']]] },
  ];
  AREAS.forEach(a => { a.pages = a.groups.reduce((n, g) => n.concat(g[1]), []); a.rgb = rgbOf(a.hue); });

  const DESC = {
    dashboard: 'Depot overview, gate cameras and live yard figures',
    depops: 'Zones, yard map, surveys and the master container list',
    inward: 'Receive containers and record their details',
    publicbookings: 'Bookings sent in through the public booking page',
    interchange: 'Gate-in and gate-out records',
    shutout: 'Containers turned away at the gate',
    prestaking: 'Containers staged ahead of a vessel',
    depotreport: 'Inward and outward register',
    shippinglines: 'Shipping lines, contacts and portal links',
    dispatch: 'Assign trucks and drivers to waiting jobs',
    trips: 'Trips in progress and trip history',
    livetracking: 'Where every truck is right now',
    trucks: 'Fleet register and truck status',
    drivers: 'Driver register, licences and duty status',
    maintenance: 'Breakdowns and servicing',
    fuel: 'Fuel issued to trucks',
    requisitions: 'Requests for fuel, parts and cash',
    workshop: 'Container repair jobs and approvals',
    finance: 'Receipts, bills, expenses and suppliers',
    invoicing: 'Customer invoices and billing rates',
    approvals: 'Items waiting for a decision',
    hr: 'Leave, attendance, payroll and documents',
    people: 'Staff records and contacts',
    allocation: 'Match waiting containers to trucks',
    workanalysis: 'Work done, by type',
    reports: 'Operational and financial reports',
    tripreports: 'Trip reports and the audit centre',
    usermgmt: 'Staff accounts, roles and access',
    settings: 'System settings and thresholds',
  };
  const KW = {
    interchange: 'gate in out eir receipt', inward: 'receive arrival gate in', shutout: 'refused rejected', trips: 'journey haulage',
    livetracking: 'map gps position wialon', finance: 'receipts bills expenses suppliers money', hr: 'leave payroll attendance staff',
    people: 'employees staff', invoicing: 'billing rates customers', approvals: 'inbox pending authorise', trucks: 'vehicles fleet',
    drivers: 'licence duty', dispatch: 'assign allocate', depops: 'yard zones surveys master', reports: 'analytics export', settings: 'configuration admin',
    usermgmt: 'accounts roles access passwords', requisitions: 'requests purchase', workshop: 'repairs survey', allocation: 'engine auto',
  };

  /* ───────────── state ───────────── */
  let nx = null, built = false, panel, scroll, filterIn, filterBox, emptyMsg, titleEl, blurbEl, recentBox, pinBtn;
  const links = {};                      // section id -> moved nav button
  let curSec = null, curArea = null, viewArea = 'home', pinned = false, stuck = false;
  let hoverT = 0, leaveT = 0;
  const area = id => AREAS.find(a => a.id === id) || null;
  const areaOf = sec => AREAS.find(a => a.pages.includes(sec)) || null;

  /* ───────────── build ───────────── */
  function prep(btn, sec) {
    btn.classList.add('nx-link'); btn.dataset.nx = sec;
    const icon = btn.querySelector('svg:not(.lock-icon)');
    if (icon) { icon.classList.add('nav-icon'); icon.removeAttribute('width'); icon.removeAttribute('height'); }
    btn.querySelectorAll('svg.lock-icon').forEach(x => x.remove());
    [...btn.childNodes].forEach(n => { if (n.nodeType === 3 && n.nodeValue.trim()) { const s = el('span', 'nx-label'); s.textContent = n.nodeValue.trim(); btn.replaceChild(s, n); } });
    if (DESC[sec]) btn.title = DESC[sec];
  }

  function build() {
    const sb = $('sidebar'); if (!sb) return false;
    if (built) return true;
    const find = sec => document.querySelector('.nav-item[data-section="' + sec + '"]') || $('adminBtn-' + sec);
    const brandTile = sb.querySelector('.dock-mark .brand-tile');
    const footer = sb.querySelector('.sidebar-footer');

    // any page button that has no home in AREAS goes under "More" so nothing is ever lost
    const known = new Set(AREAS.reduce((n, a) => n.concat(a.pages), []));
    const extra = [...document.querySelectorAll('.nav-item[data-section]')].map(b => b.dataset.section).filter(s => !known.has(s));
    if (extra.length) AREAS.splice(AREAS.length - 1, 0, { id: 'more', label: 'More', short: 'More', blurb: 'Other pages', hue: '#A9B7D6', rgb: rgbOf('#A9B7D6'), icon: IC.more, groups: [['', extra]], pages: extra });

    // rail
    const rail = el('div', 'nx-rail');
    const brand = el('button', 'nx-brand'); brand.type = 'button'; brand.title = 'Home'; brand.setAttribute('aria-label', 'Home');
    if (brandTile) brand.appendChild(brandTile);
    brand.addEventListener('click', () => go(landing()));
    const list = el('div', 'nx-rail-list'), foot = el('div', 'nx-rail-foot');
    rail.append(brand, list, foot);

    // panel
    panel = el('div', 'nx-panel');
    panel.setAttribute('aria-label', 'Pages');
    const head = el('div', 'nx-panel-head', '<div class="nx-panel-titles"><h2 class="nx-area-title"></h2><p class="nx-area-blurb"></p></div>');
    titleEl = head.querySelector('.nx-area-title'); blurbEl = head.querySelector('.nx-area-blurb');
    pinBtn = el('button', 'nx-pin', IC.pin); pinBtn.type = 'button';
    pinBtn.addEventListener('click', () => setPinned(!pinned));
    head.appendChild(pinBtn);
    filterBox = el('div', 'nx-filter', IC.search + '<input type="text" placeholder="Filter pages" aria-label="Filter pages" autocomplete="off" spellcheck="false">');
    filterIn = filterBox.querySelector('input');
    scroll = el('div', 'nx-scroll');
    emptyMsg = el('div', 'nx-none', 'No pages match'); emptyMsg.hidden = true;
    recentBox = el('div', 'nx-recent');
    const pfoot = el('div', 'nx-panel-foot');
    panel.append(head, filterBox, scroll, pfoot);

    AREAS.forEach(a => {
      a.set = el('section', 'nx-set'); a.set.dataset.area = a.id; a.set.hidden = true;
      a.set.style.setProperty('--nx-hue', a.hue); a.set.style.setProperty('--nx-hue-rgb', a.rgb);
      a.groupEls = a.groups.map(([name, pages]) => {
        const g = el('div', 'nx-group'); if (name) g.appendChild(el('div', 'nx-group-title', h(name)));
        pages.forEach(sec => { const b = find(sec); if (!b) return; prep(b, sec); links[sec] = b; g.appendChild(b); });
        a.set.appendChild(g); return g;
      });
      scroll.appendChild(a.set);

      a.btn = el('button', 'nx-ra', a.icon + '<span>' + h(a.short) + '</span><i class="nx-dot" hidden></i>');
      a.btn.type = 'button'; a.btn.dataset.area = a.id; a.btn.title = a.blurb;
      a.btn.style.setProperty('--nx-hue', a.hue); a.btn.style.setProperty('--nx-hue-rgb', a.rgb);
      a.dot = a.btn.querySelector('.nx-dot');
      (a.bottom ? foot : list).appendChild(a.btn);
    });
    scroll.append(emptyMsg, recentBox);
    if (footer) pfoot.appendChild(footer);

    // swap the old sidebar content for the new structure
    sb.textContent = '';
    sb.append(rail, panel);
    sb.classList.add('nx'); sb.setAttribute('role', 'navigation'); sb.setAttribute('aria-label', 'Main navigation');
    nx = sb;

    // the three admin pills that lived in the top bar are now pages in the panel; add the palette button there instead
    const adminNav = $('adminNav'); if (adminNav) adminNav.remove();
    const left = document.querySelector('.admin-rail-left');
    if (left && !$('nxJump')) {
      const j = el('button', 'nx-jump', IC.search + '<span class="nx-jump-t">Jump to a page</span><kbd>' + (isMac ? '⌘K' : 'Ctrl K') + '</kbd>');
      j.type = 'button'; j.id = 'nxJump'; j.setAttribute('aria-label', 'Jump to a page or action'); j.title = 'Jump to a page or action (' + (isMac ? '⌘K' : 'Ctrl K') + ')';
      j.addEventListener('click', () => palette.open());
      left.appendChild(j);
    }

    wire();
    try { pinned = (localStorage.getItem('gargo_nx_pin') ?? (window.innerWidth >= 1360 ? '1' : '0')) === '1'; } catch (e) { pinned = window.innerWidth >= 1360; }
    applyPin();
    built = true;
    return true;
  }

  /* ───────────── painting ───────────── */
  function visibleAreas() { return AREAS.filter(a => a.pages.some(canSee)); }

  function refreshAreas() {
    AREAS.forEach(a => {
      const vis = a.pages.some(canSee);
      a.btn.hidden = !vis;
      a.pages.forEach(s => { if (links[s]) links[s].hidden = !canSee(s); });
    });
    const vis = visibleAreas();
    if (!vis.some(a => a.id === viewArea)) viewArea = (vis[0] || AREAS[0]).id;
  }

  function applyFilter() {
    const a = area(viewArea); if (!a) return;
    const q = filterIn.value.trim().toLowerCase();
    let shown = 0;
    a.groupEls.forEach(g => {
      let any = 0;
      g.querySelectorAll('.nx-link').forEach(b => {
        const s = b.dataset.nx, txt = (b.textContent + ' ' + (DESC[s] || '') + ' ' + (KW[s] || '')).toLowerCase();
        const ok = canSee(s) && (!q || txt.includes(q));
        b.hidden = !ok; if (ok) any++;
      });
      g.hidden = !any; shown += any;
    });
    emptyMsg.hidden = shown > 0;
  }

  function paintRecent() {
    let items = [];
    try { items = (window.NAV && NAV.recent ? NAV.recent() : []).filter(x => x.t === 'v' && x.s !== curSec && canSee(x.s)); } catch (e) { items = []; }
    items = items.slice(0, viewArea === 'home' ? 6 : 3);
    recentBox._items = items;
    recentBox.hidden = !items.length || !!filterIn.value.trim();
    recentBox.innerHTML = items.length ? '<div class="nx-group-title">Recent</div>' + items.map((it, i) => {
      const a = areaOf(it.s);
      return '<button type="button" class="nx-recent-row" data-i="' + i + '"' + (a ? ' style="--nx-hue:' + a.hue + '"' : '') + '><i class="nx-pip"></i><span>' + h(it.label) + '</span></button>';
    }).join('') : '';
  }

  function paintDots() {
    AREAS.forEach(a => {
      let n = 0, warn = false;
      a.pages.forEach(s => {
        const b = links[s]; if (!b || !canSee(s)) return;
        b.querySelectorAll('.nav-badge,.rail-badge').forEach(x => {
          if ((x.textContent || '').trim() && x.style.display !== 'none') { n++; if (x.classList.contains('warn')) warn = true; }
        });
      });
      a.dot.hidden = !n; a.dot.classList.toggle('warn', warn);
    });
  }

  function paint() {
    if (!built) return;
    const showing = area(viewArea) || AREAS[0];
    AREAS.forEach(a => {
      a.btn.classList.toggle('is-current', a.id === curArea);
      a.btn.classList.toggle('is-view', a.id === viewArea && a.id !== curArea);
      a.btn.setAttribute('aria-expanded', String(a.id === viewArea && (pinned || nx.classList.contains('is-open'))));
      a.set.hidden = a.id !== showing.id;
    });
    titleEl.textContent = showing.label; blurbEl.textContent = showing.blurb;
    panel.style.setProperty('--nx-hue', showing.hue); panel.style.setProperty('--nx-hue-rgb', showing.rgb);
    const count = showing.pages.filter(canSee).length;
    filterBox.hidden = count <= 6;
    if (filterBox.hidden) filterIn.value = '';
    applyFilter(); paintRecent();
  }

  function paintBar(a) {
    const tb = $('sectionTopbar'); if (tb) tb.style.setProperty('--nx-hue', a ? a.hue : '#FF9A52');
    const ta = $('topbarArea'); if (ta && a) ta.textContent = a.label;
  }

  function setCurrent(sec) {
    curSec = sec;
    const a = areaOf(sec);
    curArea = a ? a.id : null;
    Object.keys(links).forEach(s => {
      const on = s === sec; links[s].classList.toggle('is-current', on);
      if (on) links[s].setAttribute('aria-current', 'page'); else links[s].removeAttribute('aria-current');
    });
    if (curArea) viewArea = curArea;
    filterIn.value = '';
    paint(); paintBar(a);
    const cur = links[sec]; if (cur && !mobile.matches) { try { cur.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  }

  /* ───────────── pin / overlay ───────────── */
  function effectivePinned() { return pinned && !mobile.matches && window.innerWidth >= 1100; }
  function applyPin() {
    const on = effectivePinned();
    document.body.classList.toggle('nx-pinned', on);
    if (pinBtn) { pinBtn.setAttribute('aria-pressed', String(pinned)); pinBtn.title = pinned ? 'Unpin the page list' : 'Keep the page list open'; }
    if (on && nx) nx.classList.remove('is-open');
    paint();
  }
  function setPinned(v) {
    pinned = !!v;
    try { localStorage.setItem('gargo_nx_pin', pinned ? '1' : '0'); } catch (e) {}
    applyPin();
  }
  function openOverlay(id, sticky) {
    clearTimeout(leaveT); viewArea = id; stuck = !!sticky;
    nx.classList.add('is-open'); paint();
  }
  function closeOverlay() {
    clearTimeout(hoverT); clearTimeout(leaveT);
    if (!nx || !nx.classList.contains('is-open')) return;
    nx.classList.remove('is-open'); stuck = false;
    if (curArea) viewArea = curArea;
    paint();
  }

  /* ───────────── events ───────────── */
  function focusables() { return [...panel.querySelectorAll('.nx-filter input, .nx-link, .nx-recent-row')].filter(x => !x.hidden && !x.closest('[hidden]') && x.offsetParent !== null); }

  function wire() {
    // rail
    nx.querySelector('.nx-rail').addEventListener('click', e => {
      const b = e.target.closest('.nx-ra'); if (!b) return;
      const id = b.dataset.area;
      if (id === 'home') { viewArea = 'home'; go('dashboard'); if (!effectivePinned()) closeOverlay(); paint(); return; }
      if (mobile.matches || effectivePinned()) { viewArea = id; filterIn.value = ''; paint(); if (e.detail === 0) { const f = focusables()[0]; if (f) f.focus(); } return; }
      if (nx.classList.contains('is-open') && viewArea === id && stuck) { closeOverlay(); return; }
      openOverlay(id, true);
      if (e.detail === 0) { const f = focusables()[0]; if (f) f.focus(); }
    });
    nx.querySelector('.nx-rail').addEventListener('mouseover', e => {
      const b = e.target.closest('.nx-ra'); if (!b || mobile.matches || effectivePinned() || b.dataset.area === 'home') return;
      clearTimeout(hoverT); const id = b.dataset.area;
      hoverT = setTimeout(() => { if (!nx.classList.contains('is-open') || !stuck) openOverlay(id, false); }, 130);
    });
    nx.addEventListener('mouseenter', () => clearTimeout(leaveT));
    nx.addEventListener('mouseleave', () => {
      clearTimeout(hoverT);
      if (effectivePinned() || mobile.matches || stuck) return;
      clearTimeout(leaveT); leaveT = setTimeout(closeOverlay, 260);
    });
    document.addEventListener('mousedown', e => { if (nx.classList.contains('is-open') && !nx.contains(e.target)) closeOverlay(); }, true);

    // panel
    panel.addEventListener('click', e => {
      const rr = e.target.closest('.nx-recent-row');
      if (rr) { const it = recentBox._items[+rr.dataset.i]; if (it) go(it.s, { tab: it.tab }); }
      if (e.target.closest('.nx-link, .nx-recent-row')) setTimeout(() => { if (!effectivePinned()) closeOverlay(); }, 0);
    });
    filterIn.addEventListener('input', () => { applyFilter(); paintRecent(); });
    nx.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (nx.classList.contains('is-open')) { const b = nx.querySelector('.nx-ra[data-area="' + viewArea + '"]'); closeOverlay(); if (b) b.focus(); e.stopPropagation(); } return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const inRail = !!e.target.closest('.nx-rail');
      const set = inRail ? [...nx.querySelectorAll('.nx-ra')].filter(x => !x.hidden) : focusables();
      const i = set.indexOf(document.activeElement); if (i < 0 && !inRail) return;
      e.preventDefault();
      const n = e.key === 'ArrowDown' ? (i + 1) % set.length : (i - 1 + set.length) % set.length;
      if (set[n]) set[n].focus();
    });
    filterIn.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const f = focusables().find(x => x.classList.contains('nx-link')); if (f) { e.preventDefault(); f.click(); } }
    });

    // live badges → rail dots
    let raf = 0;
    new MutationObserver(() => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paintDots(); }); })
      .observe(scroll, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });

    mobile.addEventListener ? mobile.addEventListener('change', applyPin) : mobile.addListener(applyPin);
    window.addEventListener('resize', applyPin);
  }

  /* ───────────── command palette ───────────── */
  const palette = (function () {
    let root, input, list, rows = [], idx = 0, prev = null, isOpen = false;

    const actions = () => [
      { label: 'Go back', hint: isMac ? '⌥ ←' : 'Alt ←', kw: 'previous', run: () => window.NAV && NAV.back() },
      { label: 'Go forward', hint: isMac ? '⌥ →' : 'Alt →', kw: 'next', run: () => window.NAV && NAV.forward() },
      { label: 'Switch light or dark theme', kw: 'dark mode appearance colours', run: () => window.toggleTheme && toggleTheme() },
      { label: 'Sync with the server', kw: 'save refresh reload data', run: () => window.handleSyncStatusClick && handleSyncStatusClick() },
      { label: 'Show alerts', kw: 'notifications warnings', run: () => window.toggleAlerts && toggleAlerts() },
      { label: 'Copy link to this page', kw: 'share url', run: () => window.NAV && NAV.copyLink() },
    ].concat(mobile.matches ? [] : [{ label: pinned ? 'Unpin the page list' : 'Keep the page list open', hint: 'Ctrl /', kw: 'sidebar navigation pin', run: () => setPinned(!pinned) }])
      .concat([{ label: 'Sign out', kw: 'log out exit', run: () => window.logout && logout() }]);

    function pages() {
      const out = [];
      AREAS.forEach(a => a.pages.forEach(s => { if (canSee(s) && links[s]) out.push({ kind: 'page', sec: s, label: titleOf(s), sub: a.label, desc: DESC[s] || '', kw: KW[s] || '', hue: a.hue, icon: links[s].querySelector('svg') }); }));
      return out;
    }
    const score = (it, q) => {
      const L = it.label.toLowerCase(), hay = (L + ' ' + (it.sub || '') + ' ' + (it.kw || '') + ' ' + (it.desc || '')).toLowerCase();
      if (L === q) return 100; if (L.startsWith(q)) return 80;
      if (L.split(/[\s&·\-]+/).some(w => w.startsWith(q))) return 60;
      if (hay.includes(q)) return 30;
      const t = q.split(/\s+/); return t.length > 1 && t.every(x => hay.includes(x)) ? 20 : 0;
    };

    function compute(q) {
      q = q.trim().toLowerCase();
      const out = [], pg = pages();
      if (!q) {
        let rec = []; try { rec = (window.NAV ? NAV.recent() : []).filter(x => x.t === 'v' && x.s !== curSec && canSee(x.s)).slice(0, 4); } catch (e) {}
        if (rec.length) { out.push({ head: 'Recent' }); rec.forEach(r => { const a = areaOf(r.s); out.push({ kind: 'page', sec: r.s, tab: r.tab, label: r.label, sub: a ? a.label : '', hue: a ? a.hue : '#FF9A52', icon: links[r.s] && links[r.s].querySelector('svg'), recent: true }); }); }
        AREAS.forEach(a => { const ps = pg.filter(p => p.sub === a.label); if (ps.length) { out.push({ head: a.label }); ps.forEach(p => out.push(p)); } });
        out.push({ head: 'Actions' }); actions().forEach(x => out.push(Object.assign({ kind: 'action', icon: IC.bolt }, x)));
        return out;
      }
      const ps = pg.map(p => [score(p, q), p]).filter(x => x[0]).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
      const as = actions().map(x => [score(x, q), x]).filter(x => x[0]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(x => Object.assign({ kind: 'action', icon: IC.bolt }, x[1]));
      if (ps.length) { out.push({ head: 'Pages' }); ps.forEach(p => out.push(p)); }
      if (as.length) { out.push({ head: 'Actions' }); as.forEach(p => out.push(p)); }
      if (q.length >= 2) { out.push({ head: 'Records' }); out.push({ kind: 'search', label: 'Search trucks, drivers, containers and invoices for “' + input.value.trim() + '”', q: input.value.trim(), icon: IC.search }); }
      return out;
    }

    function draw() {
      const data = compute(input.value); rows = data.filter(x => !x.head);
      if (idx >= rows.length) idx = Math.max(0, rows.length - 1);
      let n = -1;
      list.innerHTML = rows.length ? data.map(x => {
        if (x.head) return '<div class="nxp-head">' + h(x.head) + '</div>';
        n++;
        const ico = x.icon ? (typeof x.icon === 'string' ? x.icon : x.icon.outerHTML) : '';
        const here = x.kind === 'page' && x.sec === curSec && !x.recent;
        return '<div class="nxp-row' + (n === idx ? ' on' : '') + '" role="option" id="nxpr' + n + '" data-i="' + n + '"' + (x.hue ? ' style="--nx-hue:' + x.hue + '"' : '') + '>' +
          '<span class="nxp-ico">' + ico + '</span><span class="nxp-main"><b>' + h(x.label) + '</b>' + (x.desc ? '<small>' + h(x.desc) + '</small>' : '') + '</span>' +
          (here ? '<span class="nxp-tag">You are here</span>' : x.sub ? '<span class="nxp-sub">' + h(x.sub) + '</span>' : x.hint ? '<kbd>' + h(x.hint) + '</kbd>' : '') + '</div>';
      }).join('') : '<div class="nxp-none">Nothing matches “' + h(input.value.trim()) + '”.</div>';
      input.setAttribute('aria-activedescendant', rows.length ? 'nxpr' + idx : '');
      const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    }

    function run(i) {
      const x = rows[i]; if (!x) return; close();
      setTimeout(() => {
        if (x.kind === 'page') go(x.sec, x.tab ? { tab: x.tab } : undefined);
        else if (x.kind === 'action') x.run();
        else if (x.kind === 'search') { const g = $('globalSearch'); if (g) { g.value = x.q; g.focus(); if (window.handleSearch) handleSearch(x.q); } }
      }, 0);
    }

    function make() {
      root = el('div', 'nxp'); root.hidden = true;
      root.innerHTML = '<div class="nxp-box" role="dialog" aria-modal="true" aria-label="Jump to a page or action"><div class="nxp-in">' + IC.search +
        '<input type="text" placeholder="Jump to a page or run an action" aria-label="Jump to a page or action" role="combobox" aria-expanded="true" aria-controls="nxpList" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>' +
        '<div class="nxp-list" id="nxpList" role="listbox"></div>' +
        '<div class="nxp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div>';
      document.body.appendChild(root);
      input = root.querySelector('input'); list = root.querySelector('.nxp-list');
      root.addEventListener('mousedown', e => { if (e.target === root) close(); });
      input.addEventListener('input', () => { idx = 0; draw(); });
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); idx = rows.length ? (idx + 1) % rows.length : 0; draw(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); idx = rows.length ? (idx - 1 + rows.length) % rows.length : 0; draw(); }
        else if (e.key === 'Enter') { e.preventDefault(); run(idx); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'Tab') e.preventDefault();
      });
      list.addEventListener('mousemove', e => { const r = e.target.closest('.nxp-row'); if (r && +r.dataset.i !== idx) { list.querySelector('.on')?.classList.remove('on'); idx = +r.dataset.i; r.classList.add('on'); } });
      list.addEventListener('click', e => { const r = e.target.closest('.nxp-row'); if (r) run(+r.dataset.i); });
    }

    function open() {
      if (!ready() || isDrv() || !built) return;
      if (!root) make();
      if (isOpen) { input.focus(); input.select(); return; }
      prev = document.activeElement; isOpen = true; closeOverlay();
      document.body.classList.remove('sidebar-open');
      root.hidden = false; input.value = ''; idx = 0; draw(); input.focus();
    }
    function close() {
      if (!isOpen) return; isOpen = false; root.hidden = true;
      if (prev && prev.focus && document.contains(prev)) { try { prev.focus(); } catch (e) {} }
    }
    return { open, close, toggle: () => (isOpen ? close() : open()), get isOpen() { return isOpen; } };
  })();

  document.addEventListener('keydown', e => {
    if (!ready() || isDrv()) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); e.stopImmediatePropagation(); palette.toggle(); }
  }, true);

  /* ───────────── driver portal: Back between tabs ───────────── */
  const DP = { trip: 'My Trip', completed: 'Completed Trips', fuel: 'Fuel Log', requisitions: 'Requisitions', workshop: 'Workshop', shutouts: 'Shutouts' };
  const dpStack = []; let dpOrig = null;
  const dpTab = () => { try { return _dpTab; } catch (e) { return 'trip'; } };
  function paintDpBack() {
    const b = $('dpBack'); if (!b) return;
    const tab = dpTab(), to = dpStack.length ? dpStack[dpStack.length - 1] : (tab === 'trip' ? null : 'trip');
    b.disabled = !to;
    const t = b.querySelector('.nav-back-to'); if (t) { t.textContent = to ? DP[to] || '' : ''; t.style.display = to ? '' : 'none'; }
    b.title = to ? 'Back to ' + (DP[to] || 'the previous page') : 'Nothing to go back to';
  }
  function buildDriverBack() {
    const left = document.querySelector('#driverPortal .section-topbar-left');
    if (!left || $('dpBack')) { paintDpBack(); return; }
    const b = el('button', 'nav-btn nav-back nx-back', IC.back + '<span class="nav-back-k">Back</span><span class="nav-back-to"></span>');
    b.type = 'button'; b.id = 'dpBack'; b.setAttribute('aria-label', 'Back');
    b.addEventListener('click', () => {
      const prevTab = dpStack.pop() || 'trip';
      if (prevTab !== dpTab() && dpOrig) dpOrig(prevTab);
      paintDpBack();
    });
    left.insertBefore(b, left.firstChild);
    paintDpBack();
  }
  (function wrapDriverTabs() {
    const o = window.dpSwitchTab; if (typeof o !== 'function' || o._nx) return;
    dpOrig = o;
    const w = function (tab) {
      const prev = dpTab();
      if (tab !== prev) { dpStack.push(prev); if (dpStack.length > 20) dpStack.shift(); }
      const r = o.apply(this, arguments); paintDpBack(); return r;
    };
    w._nx = true; window.dpSwitchTab = w;
  })();

  /* ───────────── lifecycle ───────────── */
  function wrapShow(name) {
    const o = window[name]; if (typeof o !== 'function' || o._nx) return;
    const w = function (sec) {
      const r = o.apply(this, arguments);
      try {
        if (built && ready() && !isDrv()) { const s = $('sec-' + sec); if (s && s.classList.contains('active')) setCurrent(sec); }
      } catch (e) { console.warn('nx: page hook failed', e); }
      return r;
    };
    w._nx = true; window[name] = w;
  }

  function start() {
    if (isDrv()) { dpStack.length = 0; buildDriverBack(); return; }
    if (!build()) return;
    document.body.classList.add('nx-on');
    refreshAreas();
    document.querySelectorAll('.mobile-nav-item[data-mobile-section]').forEach(b => { b.hidden = !canSee(b.dataset.mobileSection); });
    const act = document.querySelector('.section.active');
    setCurrent(act ? act.id.replace(/^sec-/, '') : landing());
    paintDots();
  }

  (function wrapLifecycle() {
    const ob = window.bootShell;
    if (typeof ob === 'function' && !ob._nx) {
      const w = function () { const r = ob.apply(this, arguments); try { start(); } catch (e) { console.warn('nx: boot hook failed', e); } return r; };
      w._nx = true; window.bootShell = w;
    }
    const ts = window.toggleSidebar;      // on a desktop screen the drawer does not exist: Ctrl + / pins or unpins the page list instead
    if (typeof ts === 'function' && !ts._nx) {
      const w = function () { if (built && !mobile.matches && document.body.classList.contains('nx-on')) return setPinned(!pinned); return ts.apply(this, arguments); };
      w._nx = true; window.toggleSidebar = w;
    }
    const ol = window.performLogout;
    if (typeof ol === 'function' && !ol._nx) {
      const w = async function () { const r = await ol.apply(this, arguments); try { palette.close(); closeOverlay(); curSec = null; dpStack.length = 0; } catch (e) {} return r; };
      w._nx = true; window.performLogout = w;
    }
  })();
  wrapShow('showSection'); wrapShow('showAdminSection');

  window.NX = {
    palette,
    areaOf: sec => (areaOf(sec) || {}).id || null,
    /* page ids of the area whose label is shown in the breadcrumb (navigation.js uses this for the area menu) */
    pagesOfLabel: label => { const a = AREAS.find(x => x.label === label); return a ? a.pages.slice() : null; },
    openArea(id) {
      if (!built) return;
      id = id || curArea || viewArea;
      if (mobile.matches) { viewArea = id; paint(); document.body.classList.add('sidebar-open'); return; }
      if (effectivePinned()) { viewArea = id; paint(); const f = focusables()[0]; if (f) f.focus(); return; }
      openOverlay(id, true); const f = focusables()[0]; if (f) f.focus();
    },
    pin: setPinned,
    refresh() { if (built) { refreshAreas(); paint(); paintDots(); } },
  };
})();