'use strict';

(function () {
  const SEC = 'gatesecurity';
  const $ = id => document.getElementById(id);
  const sb = () => (typeof supabase !== 'undefined' && supabase) || window.ghSupabase;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const asList = v => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : []); } catch (e) { return []; } };
  const D = window.GateDesk = {};
  const S = { rows: [], tab: 'desk', f: 'todo', q: '', busy: false, inN: 0, outN: 0, mounted: false, timer: 0, err: '' };

  function css() { /* styles live in gate-desk.css */ }

  /* the section keeps its old content; two tabs choose what is visible */
  D.mount = function () {
    const sec = $('sec-' + SEC); if (!sec) return; css();
    if (!$('gsTabs')) {
      const tabs = document.createElement('div'); tabs.id = 'gsTabs'; tabs.className = 'gd-tabs';
      const T = (id, label) => '<button type=\"button\" class=\"gd-tab' + (id === 'desk' ? ' on' : '') + '\" data-t=\"' + id + '\" onclick=\"GateDesk.tab(\'' + id + '\')\">' + label + '</button>';
      const LIc = window.GargoLI && GargoLI.can;
      tabs.innerHTML = T('desk', 'Gate desk') + (LIc && LIc.view() ? T('li', 'Loading instructions') : '') + (LIc && LIc.complete() ? T('ld', 'Loading desk') : '') + T('register', 'Register') + (window.GateRecords ? T('rec', 'Records') : '');
      const desk = document.createElement('div'); desk.id = 'gsDesk';
      const li = document.createElement('div'); li.id = 'gsLIHost'; li.style.display = 'none';
      const ld = document.createElement('div'); ld.id = 'gsLDHost'; ld.style.display = 'none';
      const rc = document.createElement('div'); rc.id = 'gsRecHost'; rc.style.display = 'none';
      sec.insertBefore(rc, sec.firstChild); sec.insertBefore(ld, sec.firstChild); sec.insertBefore(li, sec.firstChild); sec.insertBefore(desk, sec.firstChild); sec.insertBefore(tabs, sec.firstChild);
      S.mounted = true;
    }
    applyTab();
  };
  function applyTab() {
    const sec = $('sec-' + SEC); if (!sec) return;
    Array.prototype.forEach.call(sec.children, ch => {
      if (ch.id === 'gsTabs') return;
      const own = { gsDesk: 'desk', gsLIHost: 'li', gsLDHost: 'ld', gsRecHost: 'rec' }[ch.id];
      ch.style.display = own ? (S.tab === own ? '' : 'none') : (S.tab === 'register' ? '' : 'none');
    });
    Array.prototype.forEach.call(document.querySelectorAll('#gsTabs .gd-tab'), b => b.classList.toggle('on', b.getAttribute('data-t') === S.tab));
  }
  D.tab = function (t) {
    S.tab = t; applyTab();
    if (t === 'desk') D.render();
    else if (t === 'li') { if (window.GargoLI) GargoLI.open('gsLIHost'); }
    else if (t === 'ld') { if (window.GargoLI) GargoLI.renderDesk('gsLDHost'); }
    else if (t === 'rec') { if (window.GateRecords) GateRecords.open('gsRecHost'); }
    else if (window.GateSec) GateSec.render();
  };

  /* ── data ── */
  async function load() {
    if (S.busy || !sb()) return; S.busy = true; S.err = '';
    try {
      S.rows = await GargoLI.gateRows();
      if (GargoLI.gateAt) S.err = 'offline';                 // the list came from the device copy
      const d = new Date(); d.setHours(0, 0, 0, 0); const t0 = d.toISOString();
      const CKEY = 'gargo-gd-counts', me = (state.currentUser && state.currentUser.id) || '';
      const [a, b] = await Promise.all([
        sb().from('gate_security_log').select('id', { count: 'exact', head: true }).eq('direction', 'in').gte('movement_at', t0),
        sb().from('gate_security_log').select('id', { count: 'exact', head: true }).eq('direction', 'out').gte('movement_at', t0)]);
      if (a.error || b.error || a.count == null || b.count == null) {          // no signal: keep the last good numbers instead of showing zeros
        let c = null; try { c = JSON.parse(localStorage.getItem(CKEY) || 'null'); } catch (e) {}
        if (!S.counted && c && c.uid === me && c.day === todayStr()) { S.inN = c.inN; S.outN = c.outN; S.counted = true; }
        if (!S.err) S.err = navigator.onLine ? '' : 'offline';
      } else {
        S.inN = a.count; S.outN = b.count; S.counted = true;
        try { localStorage.setItem(CKEY, JSON.stringify({ uid: me, day: todayStr(), inN: S.inN, outN: S.outN })); } catch (e) {}
      }
    } catch (e) { S.err = navigator.onLine ? (/permission denied|jwt|not authenticated/i.test(String((e && e.message) || '')) ? 'auth' : String((e && e.message) || 'Could not load')) : 'offline'; console.warn('Gate desk load failed:', e && e.message); }
    finally { S.busy = false; }
  }
  D.refresh = async function () { if (S.tab !== 'desk' || state.currentSection !== SEC) return; await load(); paint(); };
  D.render = async function () {
    css(); D.mount();
    if (S.tab === 'li') { if (window.GargoLI) GargoLI.open('gsLIHost'); return; }
    if (S.tab === 'ld') { if (window.GargoLI) GargoLI.renderDesk('gsLDHost'); return; }
    if (S.tab === 'rec') { if (window.GateRecords) GateRecords.open('gsRecHost'); return; }
    if (S.tab !== 'desk') return;
    const host = $('gsDesk'); if (!host) return;
    if (!host.dataset.built) { host.dataset.built = '1'; paintShell(host); }
    await load(); paint();
    clearInterval(S.timer); S.timer = setInterval(() => { try { if (state.currentSection === SEC && document.visibilityState === 'visible' && !$('modalOverlay').classList.contains('active') && !(document.activeElement && document.activeElement.id === 'gdQ' && document.activeElement.value)) D.refresh(); } catch (e) {} }, 15000);
  };
  window.addEventListener('online', () => D.refresh && D.refresh());
  /* a renewed sign-in token: reload the desk (setTimeout: auth callbacks must not call the client directly) */
  try { supabase.auth.onAuthStateChange((ev) => { if (ev === 'TOKEN_REFRESHED' || ev === 'SIGNED_IN') setTimeout(() => { try { D.refresh && D.refresh(); } catch (e) {} }, 400); }); } catch (e) {}
  window.addEventListener('offline', () => { const n = $('gdNet'); if (n) { n.textContent = 'Offline'; n.className = 'gd-net off'; } });

  function paintShell(host) {
    host.innerHTML = '<div class="gd-head"><div><div class="gd-clock" id="gdClock">--:--</div><div class="gd-date"><span id="gdDate"></span><span class="gd-net" id="gdNet">Online</span></div></div>' +
      '<div class="gd-big"><button type="button" class="gd-bigbtn in" onclick="GateSec.add(\'in\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v13M6 12l6 6 6-6M5 21h14"/></svg> Vehicle in</button><button type="button" class="gd-bigbtn out" onclick="GateSec.add(\'out\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V7M6 12l6-6 6 6M5 3h14"/></svg> Vehicle out</button></div></div>' +
      '<div class="gd-searchwrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input class="gd-search" id="gdQ" type="search" placeholder="Type a truck plate, driver ID or slip number to find its loading instruction" autocomplete="off" autocapitalize="characters" inputmode="text" oninput="GateDesk.search()"/></div>' +
      '<div class="gd-chips" id="gdChips"></div><div id="gdList"></div>';
    const tick = () => { const n = new Date(); const c = $('gdClock'); if (!c) return clearInterval(tick.t); c.textContent = n.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }); $('gdDate').textContent = n.toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long' }); const nt = $('gdNet'); if (nt) { nt.textContent = navigator.onLine ? 'Online' : 'Offline'; nt.className = 'gd-net' + (navigator.onLine ? '' : ' off'); } };
    tick(); tick.t = setInterval(tick, 5000);
  }
  let qt = 0; D.search = function () { clearTimeout(qt); qt = setTimeout(() => { S.q = ($('gdQ').value || ''); paint(); }, 120); };
  D.filter = function (f) { S.f = f; paint(); };

  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const when = iso => { try { return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const state_ = r => r.verify_result === 'verified' ? 'ok' : r.verify_result === 'rejected' ? 'rej' : 'todo';

  function paint() {
    const list = $('gdList'), kp = $('gdKpis'), chips = $('gdChips'); if (!list) return;
    const rows = S.rows, td = todayStr();
    const todo = rows.filter(r => state_(r) === 'todo' && r.status === 'issued');
    const ok = rows.filter(r => r.verify_result === 'verified' && String(r.verified_at || '').slice(0, 10) >= td);
    const rej = rows.filter(r => r.verify_result === 'rejected' && String(r.verified_at || '').slice(0, 10) >= td);
    if (kp) kp.innerHTML = '<div class="gd-kpi warn"><b>' + todo.length + '</b><span>To verify</span></div><div class="gd-kpi good"><b>' + ok.length + '</b><span>Verified today</span></div><div class="gd-kpi bad"><b>' + rej.length + '</b><span>Rejected today</span></div>' +
      '<div class="gd-kpi"><b>' + S.inN + '</b><span>Vehicles in today</span></div><div class="gd-kpi"><b>' + S.outN + '</b><span>Vehicles out today</span></div>';
    const C = [['todo', 'To verify (' + todo.length + ')'], ['ok', 'Verified'], ['rej', 'Rejected'], ['all', 'All (' + rows.length + ')']];
    chips.innerHTML = C.map(c => '<button type="button" class="gd-chip' + (S.f === c[0] ? ' on' : '') + '" onclick="GateDesk.filter(\'' + c[0] + '\')">' + c[1] + '</button>').join('');
    const q = clean(S.q), qt = String(S.q || '').toLowerCase().trim();
    let vis = rows.filter(r => S.f === 'all' ? true : S.f === 'todo' ? (state_(r) === 'todo' && r.status === 'issued') : S.f === 'ok' ? r.verify_result === 'verified' : r.verify_result === 'rejected');
    if (q) {
      /* a search looks through everything shown, whatever the chip says */
      vis = rows.filter(r => clean(r.truck_no).indexOf(q) > -1 || clean(r.serial_no).indexOf(q) > -1 || clean(r.container_text).indexOf(q) > -1 || clean(r.driver_id_number).indexOf(q) > -1 || String(r.shipper || '').toLowerCase().indexOf(qt) > -1 || String(r.driver_name || '').toLowerCase().indexOf(qt) > -1 || String(r.shipping_line || '').toLowerCase().indexOf(qt) > -1 || String(r.transporter || '').toLowerCase().indexOf(qt) > -1);
    }
    const warn = S.err ? '<div class="gd-warn">' + (S.err === 'offline' ? 'No connection. The list may be out of date, and Verify needs a connection.' : S.err === 'auth' ? 'Your sign-in needs renewing. Tap Refresh at the top. If this stays, sign out and sign in again.' : 'Could not refresh: ' + esc(S.err)) + '</div>' : '';
    if (!vis.length) {
      list.innerHTML = warn + '<div class="gd-empty">' + (q ? 'No loading instruction found for <b>' + esc(S.q.toUpperCase()) + '</b>.<br>Do not let the truck load without a slip. If it should be here, ask the documentation clerk.<div class="gd-acts" style="justify-content:center"><button type="button" class="action-btn" onclick="GateSec.add(\'out\',{vehicle_no:\'' + esc(S.q.toUpperCase().replace(/[^A-Z0-9 ]/g, '')) + '\'})">Record this vehicle anyway</button></div>' : (S.f === 'todo' ? '✔ Nothing is waiting to be verified.' : 'Nothing to show.')) + '</div>';
      return;
    }
    list.innerHTML = warn + '<div class="gd-grid">' + vis.map(r => {
      const st = state_(r), cs = asList(r.containers).filter(c => c && c.no), exact = q && clean(r.truck_no) === q;
      const label = st === 'ok' ? '✓ Verified' : st === 'rej' ? '✖ Rejected' : 'Awaiting verification';
      const boxes = r.box_count === '2x20' ? '2 × 20ft' : r.box_count === '1x40' ? '1 × 40ft' : '1 × 20ft';
      const fact = (k, v) => v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : '';
      const loaded = r.status === 'loaded' ? 'Loaded' + (r.loaded_at ? ' ' + esc(when(r.loaded_at)) : '') : 'Waiting to load';
      const checked = r.verified_at ? (st === 'rej' ? 'Rejected' : 'Verified') + ' by <b>' + esc(r.verified_by_name || '') + '</b> ' + esc(when(r.verified_at)) : '';
      return '<div class="gd-card ' + st + (exact ? ' hit' : '') + '"><div class="gd-top"><span class="gd-serial">' + esc(r.serial_no) + '</span><span class="gd-state ' + st + '">' + label + '</span></div>' +
        '<div class="gd-plate">' + esc(r.truck_no) + '</div><div class="gd-shipper">' + esc(r.shipper) + '</div>' +
        '<dl class="gd-facts">' + fact('Shipping line', esc(r.shipping_line)) + fact('Transporter', esc(r.transporter)) + fact('Driver', esc(r.driver_name) + (r.driver_id_number ? ' · ID ' + esc(r.driver_id_number) : '')) + fact('Boxes', esc(boxes)) + fact('Containers', cs.length ? cs.map(c => esc(c.no)).join(', ') : '<span class="gs-dim">Not yet entered</span>') + fact('Release order', esc(r.release_order_no)) + fact('Commodity', esc(r.commodity)) + fact('Loading', loaded) + fact('Gate check', checked) + '</dl>' +
        (st === 'rej' && r.verify_note ? '<div class="gd-note">' + esc(r.verify_note) + '</div>' : '') +
        '<div class="gd-acts">' + (st === 'ok' ? '<button type="button" class="submit-btn" onclick="GargoLI.recordOut(\'' + esc(r.id) + '\')">Record vehicle out</button>' : '<button type="button" class="submit-btn" onclick="GargoLI.verifyDialog(\'' + esc(r.id) + '\')">' + (st === 'rej' ? 'Review' : '✔ Verify') + '</button>') +
        '<button type="button" class="action-btn ghost" onclick="GargoLI.docById(\'' + esc(r.id) + '\',\'preview\')">👁 View slip</button></div></div>';
    }).join('') + '</div>';
  }
  D.paint = paint;
})();