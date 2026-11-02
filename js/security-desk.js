'use strict';
/* Gargo Gate Processes desk (was the guard desk). Loads AFTER gate-security.js and loading-instructions.js.
   The Gate Processes section has four tabs: Gate desk, Loading instructions (Part 1 form + register), Loading desk (Part 2) and Register.
   Original description:
   The Gate Processes section gets two tabs:
     "Gate desk"  - big, touch-friendly: Vehicle In / Vehicle Out, search by plate, and one card per loading instruction
                    (expected trucks) with Verify, View slip and Record out.
     "Register"   - the existing gate register (unchanged).
   Data: loading_instructions (read) and the li_verify() database function (write). Everything is checked again by the database. */
(function () {
  const SEC = 'gatesecurity';
  const $ = id => document.getElementById(id);
  const sb = () => (typeof supabase !== 'undefined' && supabase) || window.ghSupabase;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const asList = v => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : []); } catch (e) { return []; } };
  const D = window.GateDesk = {};
  const S = { rows: [], tab: 'desk', f: 'todo', q: '', busy: false, inN: 0, outN: 0, mounted: false, timer: 0, err: '' };

  function css() {
    if ($('gdCss')) return;
    const s = document.createElement('style'); s.id = 'gdCss';
    s.textContent =
      '.gd-tabs{display:flex;gap:6px;margin:0 0 14px;border-bottom:1px solid var(--border)}' +
      '.gd-tab{background:none;border:0;border-bottom:3px solid transparent;color:var(--text-2);font:600 14px var(--font-sans,sans-serif);padding:12px 18px;min-height:48px;cursor:pointer}' +
      '.gd-tab.on{color:var(--gold);border-bottom-color:var(--gold)}' +
      '.gd-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px}' +
      '.gd-clock{font:700 26px var(--font-mono,monospace);color:var(--text);line-height:1}.gd-date{font-size:12px;color:var(--text-3);margin-top:3px}' +
      '.gd-net{display:inline-block;padding:3px 10px;border-radius:999px;font:600 10px var(--font-mono,monospace);letter-spacing:.8px;border:1px solid var(--green);color:var(--green);background:var(--green-dim);margin-left:8px;vertical-align:middle}.gd-net.off{border-color:var(--red);color:var(--red);background:var(--red-dim)}' +
      '.gd-big{display:flex;gap:10px;flex-wrap:wrap}.gd-bigbtn{flex:1 1 150px;min-height:60px;border-radius:14px;border:1px solid var(--border-mid);font:700 16px var(--font-sans,sans-serif);cursor:pointer;padding:12px 18px;display:flex;align-items:center;justify-content:center;gap:10px}' +
      '.gd-bigbtn.in{background:var(--blue-dim);color:var(--blue);border-color:var(--blue)}.gd-bigbtn.out{background:var(--gold-dim);color:var(--gold);border-color:var(--gold)}' +
      '.gd-kpis{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:14px}.gd-kpi{border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:var(--surface)}' +
      '.gd-kpi b{display:block;font:800 28px var(--font-mono,monospace);color:var(--text);line-height:1.1}.gd-kpi span{font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.6px}' +
      '.gd-kpi.warn b{color:var(--amber)}.gd-kpi.good b{color:var(--green)}.gd-kpi.bad b{color:var(--red)}' +
      '.gd-search{width:100%;box-sizing:border-box;min-height:58px;font:700 22px var(--font-mono,monospace)!important;letter-spacing:1.5px;text-transform:uppercase;padding:0 16px;border-radius:14px;background:var(--surface-2);border:2px solid var(--border-mid);color:var(--text)}' +
      '.gd-search:focus{border-color:var(--gold);outline:none}.gd-search::placeholder{font-size:14px;letter-spacing:0;text-transform:none;font-family:var(--font-sans,sans-serif);font-weight:500}' +
      '.gd-chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.gd-chip{border:1px solid var(--border);border-radius:999px;background:var(--surface-2);color:var(--text-2);padding:10px 16px;min-height:44px;font-size:13px;font-weight:600;cursor:pointer}' +
      '.gd-chip.on{border-color:var(--gold);background:var(--gold-dim);color:var(--gold)}' +
      '.gd-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(310px,1fr))}' +
      '.gd-card{border:1px solid var(--border);border-left:6px solid var(--amber);border-radius:14px;padding:14px 16px;background:var(--surface)}' +
      '.gd-card.ok{border-left-color:var(--green)}.gd-card.rej{border-left-color:var(--red)}.gd-card.hit{box-shadow:0 0 0 2px var(--gold)}' +
      '.gd-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}' +
      '.gd-plate{font:800 28px var(--font-mono,monospace);letter-spacing:1.5px;color:var(--text);margin:6px 0 2px}' +
      '.gd-sub{font-size:12.5px;color:var(--text-2);margin-top:3px;line-height:1.45}.gd-sub b{color:var(--text)}' +
      '.gd-state{display:inline-block;padding:3px 10px;border-radius:999px;font:700 10px var(--font-mono,monospace);letter-spacing:.8px;text-transform:uppercase;border:1px solid var(--amber);color:var(--amber);background:var(--amber-dim)}' +
      '.gd-state.ok{border-color:var(--green);color:var(--green);background:var(--green-dim)}.gd-state.rej{border-color:var(--red);color:var(--red);background:var(--red-dim)}' +
      '.gd-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.gd-acts button{min-height:50px;font-size:14px}.gd-acts .submit-btn{flex:1 1 140px}' +
      '.gd-empty{border:1px dashed var(--border-mid);border-radius:14px;padding:24px;text-align:center;color:var(--text-2);font-size:14px;line-height:1.7}' +
      '.gd-warn{border:1px solid var(--red);background:var(--red-dim);color:var(--red);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:13px}' +
      '@media(max-width:600px){.gd-clock{font-size:22px}.gd-plate{font-size:24px}}';
    document.head.appendChild(s);
  }

  /* the section keeps its old content; two tabs choose what is visible */
  D.mount = function () {
    const sec = $('sec-' + SEC); if (!sec) return; css();
    if (!$('gsTabs')) {
      const tabs = document.createElement('div'); tabs.id = 'gsTabs'; tabs.className = 'gd-tabs';
      const T = (id, label) => '<button type=\"button\" class=\"gd-tab' + (id === 'desk' ? ' on' : '') + '\" data-t=\"' + id + '\" onclick=\"GateDesk.tab(\'' + id + '\')\">' + label + '</button>';
      const LIc = window.GargoLI && GargoLI.can;
      tabs.innerHTML = T('desk', 'Gate desk') + (LIc && LIc.view() ? T('li', 'Loading instructions') : '') + (LIc && LIc.complete() ? T('ld', 'Loading desk') : '') + T('register', 'Register');
      const desk = document.createElement('div'); desk.id = 'gsDesk';
      const li = document.createElement('div'); li.id = 'gsLIHost'; li.style.display = 'none';
      const ld = document.createElement('div'); ld.id = 'gsLDHost'; ld.style.display = 'none';
      sec.insertBefore(ld, sec.firstChild); sec.insertBefore(li, sec.firstChild); sec.insertBefore(desk, sec.firstChild); sec.insertBefore(tabs, sec.firstChild);
      S.mounted = true;
    }
    applyTab();
  };
  function applyTab() {
    const sec = $('sec-' + SEC); if (!sec) return;
    Array.prototype.forEach.call(sec.children, ch => {
      if (ch.id === 'gsTabs') return;
      const own = { gsDesk: 'desk', gsLIHost: 'li', gsLDHost: 'ld' }[ch.id];
      ch.style.display = own ? (S.tab === own ? '' : 'none') : (S.tab === 'register' ? '' : 'none');
    });
    Array.prototype.forEach.call(document.querySelectorAll('#gsTabs .gd-tab'), b => b.classList.toggle('on', b.getAttribute('data-t') === S.tab));
  }
  D.tab = function (t) {
    S.tab = t; applyTab();
    if (t === 'desk') D.render();
    else if (t === 'li') { if (window.GargoLI) GargoLI.open('gsLIHost'); }
    else if (t === 'ld') { if (window.GargoLI) GargoLI.renderDesk('gsLDHost'); }
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
    } catch (e) { S.err = navigator.onLine ? String((e && e.message) || 'Could not load') : 'offline'; console.warn('Gate desk load failed:', e && e.message); }
    finally { S.busy = false; }
  }
  D.refresh = async function () { if (S.tab !== 'desk' || state.currentSection !== SEC) return; await load(); paint(); };
  D.render = async function () {
    css(); D.mount();
    if (S.tab === 'li') { if (window.GargoLI) GargoLI.open('gsLIHost'); return; }
    if (S.tab === 'ld') { if (window.GargoLI) GargoLI.renderDesk('gsLDHost'); return; }
    if (S.tab !== 'desk') return;
    const host = $('gsDesk'); if (!host) return;
    if (!host.dataset.built) { host.dataset.built = '1'; paintShell(host); }
    await load(); paint();
    clearInterval(S.timer); S.timer = setInterval(() => { try { if (state.currentSection === SEC && document.visibilityState === 'visible' && !$('modalOverlay').classList.contains('active') && !(document.activeElement && document.activeElement.id === 'gdQ' && document.activeElement.value)) D.refresh(); } catch (e) {} }, 15000);
  };
  window.addEventListener('online', () => D.refresh && D.refresh());
  window.addEventListener('offline', () => { const n = $('gdNet'); if (n) { n.textContent = 'OFFLINE'; n.className = 'gd-net off'; } });

  function paintShell(host) {
    host.innerHTML = '<div class="gd-head"><div><div class="gd-clock" id="gdClock">--:--</div><div class="gd-date"><span id="gdDate"></span><span class="gd-net" id="gdNet">ONLINE</span></div></div>' +
      '<div class="gd-big" style="flex:1 1 320px;max-width:520px"><button type="button" class="gd-bigbtn in" onclick="GateSec.add(\'in\')">⬇ Vehicle IN</button><button type="button" class="gd-bigbtn out" onclick="GateSec.add(\'out\')">⬆ Vehicle OUT</button></div></div>' +
      '<div class="gd-kpis" id="gdKpis"></div>' +
      '<input class="gd-search" id="gdQ" type="search" placeholder="Type the truck plate or slip number to find its loading instruction" autocomplete="off" autocapitalize="characters" inputmode="text" oninput="GateDesk.search()"/>' +
      '<div class="gd-chips" id="gdChips"></div><div id="gdList"></div>';
    const tick = () => { const n = new Date(); const c = $('gdClock'); if (!c) return clearInterval(tick.t); c.textContent = n.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }); $('gdDate').textContent = n.toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long' }); const nt = $('gdNet'); if (nt) { nt.textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE'; nt.className = 'gd-net' + (navigator.onLine ? '' : ' off'); } };
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
    kp.innerHTML = '<div class="gd-kpi warn"><b>' + todo.length + '</b><span>To verify</span></div><div class="gd-kpi good"><b>' + ok.length + '</b><span>Verified today</span></div><div class="gd-kpi bad"><b>' + rej.length + '</b><span>Rejected today</span></div>' +
      '<div class="gd-kpi"><b>' + S.inN + '</b><span>Vehicles in today</span></div><div class="gd-kpi"><b>' + S.outN + '</b><span>Vehicles out today</span></div>';
    const C = [['todo', 'To verify (' + todo.length + ')'], ['ok', 'Verified'], ['rej', 'Rejected'], ['all', 'All (' + rows.length + ')']];
    chips.innerHTML = C.map(c => '<button type="button" class="gd-chip' + (S.f === c[0] ? ' on' : '') + '" onclick="GateDesk.filter(\'' + c[0] + '\')">' + c[1] + '</button>').join('');
    const q = clean(S.q), qt = String(S.q || '').toLowerCase().trim();
    let vis = rows.filter(r => S.f === 'all' ? true : S.f === 'todo' ? (state_(r) === 'todo' && r.status === 'issued') : S.f === 'ok' ? r.verify_result === 'verified' : r.verify_result === 'rejected');
    if (q) {
      /* a search looks through everything shown, whatever the chip says */
      vis = rows.filter(r => clean(r.truck_no).indexOf(q) > -1 || clean(r.serial_no).indexOf(q) > -1 || clean(r.container_text).indexOf(q) > -1 || String(r.shipper || '').toLowerCase().indexOf(qt) > -1);
    }
    const warn = S.err ? '<div class="gd-warn">' + (S.err === 'offline' ? 'No connection. The list may be out of date, and Verify needs a connection.' : 'Could not refresh: ' + esc(S.err)) + '</div>' : '';
    if (!vis.length) {
      list.innerHTML = warn + '<div class="gd-empty">' + (q ? 'No loading instruction found for <b>' + esc(S.q.toUpperCase()) + '</b>.<br>Do not let the truck load without a slip. If it should be here, ask the documentation clerk.<div class="gd-acts" style="justify-content:center"><button type="button" class="action-btn" onclick="GateSec.add(\'out\',{vehicle_no:\'' + esc(S.q.toUpperCase().replace(/[^A-Z0-9 ]/g, '')) + '\'})">Record this vehicle anyway</button></div>' : (S.f === 'todo' ? '✔ Nothing is waiting to be verified.' : 'Nothing to show.')) + '</div>';
      return;
    }
    list.innerHTML = warn + '<div class="gd-grid">' + vis.map(r => {
      const st = state_(r), cs = asList(r.containers).filter(c => c && c.no), exact = q && clean(r.truck_no) === q;
      const label = st === 'ok' ? '✓ Verified' : st === 'rej' ? '✖ Rejected' : 'Awaiting verification';
      return '<div class="gd-card ' + st + (exact ? ' hit' : '') + '"><div class="gd-top"><b style="color:var(--red);font:700 14px var(--font-mono,monospace)">' + esc(r.serial_no) + '</b><span class="gd-state ' + st + '">' + label + '</span></div>' +
        '<div class="gd-plate">' + esc(r.truck_no) + '</div><div class="gd-sub"><b>' + esc(r.shipper) + '</b></div>' +
        '<div class="gd-sub">' + esc(r.box_count === '2x20' ? '2 × 20ft' : r.box_count === '1x40' ? '1 × 40ft' : '1 × 20ft') + (cs.length ? ' · ' + cs.map(c => esc(c.no)).join(', ') : ' · container not yet entered') + (r.release_order_no ? ' · RO ' + esc(r.release_order_no) : '') + '</div>' +
        '<div class="gd-sub">' + (r.status === 'loaded' ? 'Loaded' + (r.loaded_at ? ' ' + esc(when(r.loaded_at)) : '') : 'Waiting to load') + (r.verified_at ? ' · ' + (st === 'rej' ? 'rejected' : 'verified') + ' by <b>' + esc(r.verified_by_name || '') + '</b> ' + esc(when(r.verified_at)) : '') + '</div>' +
        (st === 'rej' && r.verify_note ? '<div class="gd-sub" style="color:var(--red)">' + esc(r.verify_note) + '</div>' : '') +
        '<div class="gd-acts">' + (st === 'ok' ? '<button type="button" class="submit-btn" onclick="GargoLI.recordOut(\'' + esc(r.id) + '\')">Record vehicle out</button>' : '<button type="button" class="submit-btn" onclick="GargoLI.verifyDialog(\'' + esc(r.id) + '\')">' + (st === 'rej' ? 'Review' : '✔ Verify') + '</button>') +
        '<button type="button" class="action-btn ghost" onclick="GargoLI.docById(\'' + esc(r.id) + '\',\'preview\')">👁 View slip</button></div></div>';
    }).join('') + '</div>';
  }
  D.paint = paint;
})();