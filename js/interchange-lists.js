'use strict';

(function () {
  const $ = id => document.getElementById(id);
  const SEC = 'sec-interchange', PAGE = 40, CHUNK = 200, SHOW_ALL_MAX = 1000;
  const DIRS = {
    inward:  { label: 'Inward',  types: ['Gate-In', 'Depot-In'],   blurb: 'Containers received into the depot. The interchange (EIR) is issued once the survey is complete.' },
    outward: { label: 'Outward', types: ['Gate-Out', 'Depot-Out'], blurb: 'Containers released from the depot, with their release order and receiving party.' },
  };
  const FILTERS = ['all', 'pending', 'approved', 'reconciled', 'flagged'];
  const FLABEL = { all: 'All', pending: 'Pending', approved: 'Approved', reconciled: 'Reconciled', flagged: '⚠ Flagged for Review' };
  const mk = () => ({ filter: 'all', q: '', from: '', to: '', items: [], total: 0, busy: false, err: '', seq: 0, loaded: false, local: false, stale: true });
  const S = { dir: 'inward', inward: mk(), outward: mk(), counts: { inward: null, outward: null }, waiting: 0, countsAt: 0, built: false };
  try { const d = localStorage.getItem('gargo-ic-dir'); if (d === 'inward' || d === 'outward') S.dir = d; } catch (e) {}

  const isIn = t => t === 'Gate-In' || t === 'Depot-In';
  const isOut = t => /Out$/.test(t || '');
  const inDir = (ic, dir) => dir === 'inward' ? isIn(ic.type) : isOut(ic.type);
  const E = v => (typeof esc === 'function' ? esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const T = (m, k, d) => { try { if (typeof toast === 'function') toast(m, k || 'info', d); } catch (e) {} };
  const useServer = () => !!(window.ICR && ICR.enabled && navigator.onLine);
  const dayStart = s => new Date(s + 'T00:00:00'), dayEnd = s => new Date(s + 'T23:59:59.999');
  const lc = v => String(v == null ? '' : v).toLowerCase();
  const nk = v => String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const setIcFilter = f => { try { _icFilter = f; } catch (e) {} };

  /* ── which records belong in a list ──
     server = true: the database already applied search and dates, so only guard against local edits that changed a record since. */
  function matches(ic, st, dir, server) {
    if (!inDir(ic, dir)) return false;
    if (typeof icAwaitingSurvey === 'function' && icAwaitingSurvey(ic)) return false;
    if (st.filter === 'flagged') { if (!ic.flaggedForReview) return false; }
    else if (st.filter !== 'all' && ic.status !== st.filter) return false;
    if (server) return true;
    const t = new Date(ic.date).getTime();
    if (st.from && t < dayStart(st.from).getTime()) return false;
    if (st.to && t > dayEnd(st.to).getTime()) return false;
    const q = lc(st.q).trim();
    if (q) {
      const qk = nk(q);
      const hay = [ic.eirNumber, ic.vessel, ic.voyage, ic.releaseOrderNo, ic.receivingParty, ic.deliveringParty, ic.blNumber, ic.guaranteeNo, ic.truckRegText, ic.driverNameText, ic.transporter, ic.notes].map(lc).join(' ');
      if (hay.indexOf(q) < 0 && !(qk && nk(ic.container).indexOf(qk) >= 0)) return false;
    }
    return true;
  }
  function localAll(dir, st) {
    return (state.db.interchange || []).filter(ic => matches(ic, st, dir, false)).sort((a, b) => (+new Date(b.date) || 0) - (+new Date(a.date) || 0));
  }
  function srvOpts(dir, st, limit, offset) {
    return {
      types: DIRS[dir].types, q: st.q.trim() || null,
      status: (st.filter !== 'all' && st.filter !== 'flagged') ? st.filter : null, flagged: st.filter === 'flagged',
      from: st.from ? dayStart(st.from).toISOString() : null, to: st.to ? dayEnd(st.to).toISOString() : null,
      limit, offset,
    };
  }

  /* ── loading ── */
  async function load(dir, o) {
    o = o || {};
    const st = S[dir], my = ++st.seq;
    st.err = ''; st.stale = false;
    const fromDevice = (note) => {
      const all = localAll(dir, st), n = o.more ? st.items.length + (o.chunk || PAGE) : Math.max(PAGE, o.keep ? st.items.length : 0);
      st.items = all.slice(0, n); st.total = all.length; st.local = true; st.loaded = true; st.busy = false; if (note) st.err = note;
    };
    if (!useServer()) { fromDevice(); paint(); return; }
    st.local = false; st.busy = true;
    if (!o.keep) paint();
    try {
      const offset = o.more ? st.items.length : 0;
      const limit = o.more ? (o.chunk || PAGE) : Math.min(400, Math.max(PAGE, o.keep ? st.items.length : PAGE));
      const r = await ICR.search(srvOpts(dir, st, limit, offset));
      if (my !== st.seq) return;
      const fresh = r.items.filter(ic => matches(ic, st, dir, true));
      if (o.more) { const have = new Set(st.items); st.items = st.items.concat(fresh.filter(x => !have.has(x))); } else st.items = fresh;
      st.total = r.total; st.loaded = true;
    } catch (e) {
      if (my !== st.seq) return;
      console.warn('interchange list:', e && e.message);
      if (o.more) st.err = 'Could not load more records: ' + ((e && e.message) || 'connection problem');
      else fromDevice('Could not reach the server. Showing records saved on this device.');
    }
    st.busy = false; paint();
  }
  let timer = null;
  function refreshSoon(dir) {              // many callers re-render after every edit or live change: collapse them into one fetch
    clearTimeout(timer);
    timer = setTimeout(() => { const el = $(SEC); if (el && el.classList.contains('active')) load(dir || S.dir, { keep: true }); }, 300);
  }
  async function loadCounts(force) {
    if (!force && Date.now() - S.countsAt < 30000) return;
    S.countsAt = Date.now();
    if (!useServer()) {
      const rows = (state.db.interchange || []).filter(ic => !(typeof icAwaitingSurvey === 'function' && icAwaitingSurvey(ic)));
      S.counts = { inward: rows.filter(ic => isIn(ic.type)).length, outward: rows.filter(ic => isOut(ic.type)).length };
      S.waiting = (state.db.interchange || []).length - rows.length; paintTabs(); paintList(); return;
    }
    try {
      const r = await Promise.all(['inward', 'outward'].map(d => ICR.search({ types: DIRS[d].types, limit: 1 })).concat([ICR.search({ waiting: 'only', limit: 1 })]));
      S.counts = { inward: r[0].total, outward: r[1].total }; S.waiting = r[2].total; paintTabs(); paintList();
    } catch (e) { S.countsAt = 0; }
  }

  /* ── styles (scoped, theme variables only) ── */
  function css() {
    if ($('icxCss')) return;
    const st = document.createElement('style'); st.id = 'icxCss';
    st.textContent = `
    .icx-tabs{display:flex;gap:8px;flex-wrap:wrap}
    .icx-tab{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text-2);font:600 13px var(--font-body,inherit);cursor:pointer;min-height:44px}
    .icx-tab .icx-n{min-width:26px;padding:1px 8px;border-radius:999px;background:var(--surface-2);color:var(--text-3);font-size:11px;text-align:center}
    .icx-tab[data-d=inward][aria-selected=true]{color:var(--blue);border-color:var(--blue);background:var(--blue-dim)}
    .icx-tab[data-d=outward][aria-selected=true]{color:var(--gold);border-color:var(--gold-border);background:var(--gold-dim)}
    .icx-tab:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
    .icx-area{border-left:3px solid var(--gold);padding-left:14px;margin-top:14px}
    .icx-area[data-d=inward]{border-left-color:var(--blue)}
    .icx-blurb{font-size:12px;color:var(--text-3);margin:0 0 10px;line-height:1.5}
    .icx-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}
    .icx-bar input[type=search]{flex:1;min-width:190px}
    .icx-bar label{font-size:11px;color:var(--text-3);display:flex;gap:5px;align-items:center}
    .icx-note{font-size:11.5px;padding:8px 12px;border-radius:10px;margin-bottom:10px;border:1px solid var(--border);color:var(--text-2)}
    .icx-note.warn{border-color:var(--amber);color:var(--amber)}
    .icx-pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:600;margin-left:6px;border:1px solid var(--border)}
    .icx-pill.in{color:var(--blue);border-color:var(--blue);background:var(--blue-dim)}
    .icx-pill.out{color:var(--text-3)}
    .icx-pill.cond{color:var(--gold);border-color:var(--gold-border);background:var(--gold-dim)}
    .icx-more{padding:14px;text-align:center;font-size:12px;color:var(--text-3)}
    .icx-thumb img{width:100%;height:100%;object-fit:cover}
    @media(max-width:700px){.icx-tab{flex:1;justify-content:center}.icx-area{padding-left:10px}}`;
    document.head.appendChild(st);
  }

  /* ── page skeleton ── */
  function build() {
    const sec = $(SEC); if (!sec) return false;
    css();
    if (S.built && $('icxBody')) return true;
    sec.innerHTML = `<div class="sec-toolbar"><div class="sec-title">Interchange Management</div>
      <div class="icx-tabs" role="tablist" aria-label="Interchange direction">
        ${['inward', 'outward'].map(d => `<button type="button" class="icx-tab" role="tab" data-d="${d}" id="icxTab-${d}" aria-selected="false" onclick="IcxLists.tab('${d}')">${DIRS[d].label} interchange <span class="icx-n" id="icxN-${d}">–</span></button>`).join('')}
      </div></div>
      <div id="icxBody"></div>`;
    S.built = true; paintHead();
    return true;
  }
  function paintTabs() {
    ['inward', 'outward'].forEach(d => {
      const b = $('icxTab-' + d), n = $('icxN-' + d);
      if (b) b.setAttribute('aria-selected', String(S.dir === d));
      if (n) { const c = S.counts[d]; n.textContent = c == null ? '–' : Number(c).toLocaleString(); }
    });
  }
  function paintHead() {
    const host = $('icxBody'); if (!host) return;
    const dir = S.dir, d = DIRS[dir], st = S[dir];
    const canRecord = typeof canSeeSection !== 'function' || canSeeSection('interchange');
    const action = dir === 'outward'
      ? (canRecord ? '<button class="action-btn" onclick="showAddInterchangeModal()">+ Record Outward Interchange</button>' : '')
      : ((typeof canSeeSection !== 'function' || canSeeSection('inward')) ? `<button class="action-btn ghost" onclick="showSection('inward',document.querySelector('.nav-item[data-section=&quot;inward&quot;]'))">Gate-In entry</button>` : '');
    host.innerHTML = `<div class="icx-area" data-d="${dir}" role="tabpanel" aria-labelledby="icxTab-${dir}">
      <p class="icx-blurb">${E(d.blurb)}</p>
      <div class="filter-row" style="margin-bottom:10px">${FILTERS.map(f => `<button class="filter-btn${st.filter === f ? ' active' : ''}" onclick="filterInterchange('${f}',this)">${FLABEL[f]}</button>`).join('')}</div>
      <div class="icx-bar">
        <input type="search" id="icxQ" placeholder="${dir === 'inward' ? 'Search container, EIR, vessel, consignee…' : 'Search container, EIR, release order, receiving party…'}" value="${E(st.q)}" oninput="IcxLists.search(this.value)" autocomplete="off">
        <label>From <input type="date" id="icxFrom" value="${E(st.from)}" onchange="IcxLists.dates()"></label>
        <label>To <input type="date" id="icxTo" value="${E(st.to)}" onchange="IcxLists.dates()"></label>
        <button class="action-btn ghost" onclick="printInterchangeList()">🖨 Print</button>
        <button class="action-btn ghost" onclick="downloadInterchangeCSV()">⬇ Download CSV</button>
        ${action}
      </div>
      <div id="icxList"></div></div>`;
    paintTabs(); paintList();
  }

  /* ── cards ── */
  const SVG_IMG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  function cardHtml(ic, dir, idx) {
    const inward = dir === 'inward', id = ic.id;
    const thumb = ic.img ? `<img loading="lazy" decoding="async" src="${ic.img}" alt="">` : (ic.hasImg ? `<img loading="lazy" decoding="async" data-icimg="${E(id)}" alt="">` : SVG_IMG);
    let pill = '', meta;
    if (inward) {
      const inYard = ic._inYard !== undefined ? ic._inYard : icInYard(ic, idx);
      if (inYard) { const days = Math.max(0, Math.floor((Date.now() - new Date(ic.date).getTime()) / 864e5)); pill = `<span class="icx-pill in">In yard · ${days} d</span>`; }
      else { const out = ic._exitAt || ic.dateOut || (typeof icExitDate === 'function' ? icExitDate(ic, idx) : null); pill = `<span class="icx-pill out">Left yard${out ? ' ' + E(fmtDate(out)) : ''}</span>`; }
      meta = [ic.eirNumber ? 'EIR ' + ic.eirNumber : '', (ic.vessel || ic.voyage) ? (ic.vessel || '—') + ' / ' + (ic.voyage || '—') : '', ic.deliveringParty ? 'Consignee ' + ic.deliveringParty : '',
        ic.dateOut ? 'Out ' + fmtDate(ic.dateOut) : '', ic.dateOut && ic.receivingParty ? 'To ' + ic.receivingParty : '', ic.dateOut && ic.releaseOrderNo ? 'RO ' + ic.releaseOrderNo : ''].filter(Boolean).join(' · ');
    } else {
      if (ic.condition) pill = `<span class="icx-pill cond">${E(ic.condition)}</span>`;
      meta = [ic.eirNumber ? 'EIR ' + ic.eirNumber : '', ic.releaseOrderNo ? 'Release order ' + ic.releaseOrderNo : '', ic.receivingParty ? 'Receiving ' + ic.receivingParty : '',
        ic.deliveringParty ? 'Consignee ' + ic.deliveringParty : '', (ic.blNumber || ic.guaranteeNo) ? 'B/L ' + (ic.blNumber || ic.guaranteeNo) : '', (ic.vessel || ic.voyage) ? (ic.vessel || '—') + ' / ' + (ic.voyage || '—') : ''].filter(Boolean).join(' · ');
    }
    const kind = [ic.type, lineName(ic.line), inward ? ic.condition : '', ic.ctype].filter(Boolean).map(E).join(' · ');
    const who = [ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—'), ic.trailerNo && !inward ? 'Trailer ' + ic.trailerNo : '', ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—'), fmtDate(ic.date)].filter(Boolean).map(E).join(' · ');
    const repair = (inward && ic.repairs && ic.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${ic.repairs.length} damage item${ic.repairs.length > 1 ? 's' : ''} · ${GargoMoney.fmt(ic.repairTotal || 0, GargoMoney.itemsCur(ic.repairs))}</div>` : '';
    const inYardNow = inward && (ic._inYard !== undefined ? ic._inYard : icInYard(ic, idx));
    const btns = [];
    if (isAdmin() && ic.status === 'pending') btns.push(`<button class="modal-btn success" onclick="approveInterchange('${id}')">Approve</button>`);
    if (inYardNow) btns.push(`<button class="modal-btn ghost" onclick="quickDispatchOut('${id}')">Quick Dispatch →</button>`);
    if (inward && !ic.surveyStatus) btns.push(`<button class="modal-btn ghost" onclick="sendToSurvey('${id}')">Send to Survey →</button>`);
    btns.push(`<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${id}')">⬇ Download</button>`, `<button class="modal-btn ghost" onclick="printInterchangeSlip('${id}')" title="Print">🖨 Print</button>`);
    if (ic.flaggedForReview) btns.push(`<button class="modal-btn ghost" onclick="clearReviewFlag('interchange','${id}')">✓ Mark Reviewed</button>`);
    if (ic.surveyId) btns.push(`<button class="modal-btn ghost" onclick="downloadInspectionReport('${ic.surveyId}')">⬇ Inspection Report</button>`, `<button class="modal-btn ghost" onclick="printInspectionReport('${ic.surveyId}')" title="Print">🖨 Print Report</button>`);
    if (ic.surveyId || ic.img || ic.hasImg || ic.hasPhotos || (ic.photos && ic.photos.length)) btns.push(`<button class="modal-btn ghost" onclick="showContainerPhotos('${id}')">📷 Photos</button>`);
    return `<div class="ic-card"><div class="ic-card-img-placeholder icx-thumb" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload('interchange','${id}','img',()=>renderInterchange())" title="Upload container photo">${thumb}</div>
      <div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">${E(ic.container)}${pill}</div>
      <div>${sbadge(ic.status)}${ic.flaggedForReview ? `<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${E((ic.flagReasons || []).join('; '))}">⚠ Flagged</span>` : ''}</div></div>
      <div style="font-size:11.5px;color:var(--text-2)">${kind}</div>
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">${who}</div>
      ${meta ? `<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${E(meta)}</div>` : ''}${repair}${ic.notes ? `<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${E(ic.notes)}</div>` : ''}</div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">${btns.join('')}</div></div>`;
  }

  function paintList() {
    const host = $('icxList'); if (!host) return;
    const dir = S.dir, st = S[dir], d = DIRS[dir];
    let html = '';
    if (st.err) html += `<div class="icx-note warn">${E(st.err)}</div>`;
    else if (st.local && st.loaded) html += '<div class="icx-note">Showing records saved on this device.</div>';
    if (dir === 'inward' && st.loaded) {
      const w = Number(S.waiting) || 0;
      if (w) html += `<div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0"><b>${w}</b> gated-in container${w === 1 ? ' is' : 's are'} waiting for survey. Its interchange (EIR) is issued automatically when the survey is complete.</span></div>`;
    }
    if (!st.loaded && !st.err) html += '<div class="empty-state"><div class="empty-state-label">Loading ' + d.label.toLowerCase() + ' interchange…</div></div>';
    else if (!st.items.length) {
      const filtered = st.filter !== 'all' || st.q || st.from || st.to;
      html += `<div class="empty-state"><div class="empty-state-icon">\u{1F504}</div><div class="empty-state-label">${filtered ? 'No ' + d.label.toLowerCase() + ' records match these filters' : 'No ' + d.label.toLowerCase() + ' interchange records'}</div></div>`;
    } else {
      const idx = dir === 'inward' ? icOutIndex() : null;
      html += st.items.map(ic => cardHtml(ic, dir, idx)).join('');
      if (st.total > st.items.length) html += `<div class="icx-more">Showing ${st.items.length.toLocaleString()} of ${st.total.toLocaleString()} · <button class="modal-btn ghost" ${st.busy ? 'disabled' : ''} onclick="IcxLists.more()">Show ${PAGE} more</button> ${st.total <= SHOW_ALL_MAX ? `<button class="modal-btn ghost" ${st.busy ? 'disabled' : ''} onclick="IcxLists.more(true)">Show all</button>` : ''}</div>`;
      else html += `<div class="icx-more">${st.total.toLocaleString()} record${st.total === 1 ? '' : 's'}</div>`;
    }
    host.innerHTML = html;
    if (window.ICR && ICR.enabled && ICR.fillThumbs) { try { ICR.fillThumbs(host); } catch (e) {} }
  }
  function paint() { paintTabs(); paintList(); }

  /* ── public entry points (names kept from the old single list) ── */
  window.renderInterchange = function (f) {
    if (!build()) return;
    const st = S[S.dir];
    if (f && FILTERS.indexOf(f) >= 0 && f !== st.filter) { st.filter = f; paintHead(); }
    setIcFilter(st.filter);
    paint();                                  // instant: what we already have, including edits not yet saved
    loadCounts(false);
    if (!st.loaded) load(S.dir); else refreshSoon(S.dir);
  };
  window.filterInterchange = function (f, btn) {
    const st = S[S.dir]; st.filter = f; setIcFilter(f);
    document.querySelectorAll('#icxBody .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    st.items = []; st.loaded = false; load(S.dir);
  };
  window.icShowMore = all => IcxLists.more(all);

  const IcxLists = window.IcxLists = {
    state: S,
    tab(d) {
      if (!DIRS[d] || d === S.dir) return;
      S.dir = d; try { localStorage.setItem('gargo-ic-dir', d); } catch (e) {}
      setIcFilter(S[d].filter);
      paintHead();
      if (!S[d].loaded) load(d); else refreshSoon(d);
    },
    search(v) {
      const st = S[S.dir]; st.q = v; clearTimeout(IcxLists._t);
      IcxLists._t = setTimeout(() => { st.items = []; st.loaded = false; load(S.dir); }, 300);
    },
    dates() {
      const st = S[S.dir], a = $('icxFrom'), b = $('icxTo');
      st.from = a ? a.value : ''; st.to = b ? b.value : '';
      if (st.from && st.to && st.from > st.to) { T('"From" is after "To"', 'error'); return; }
      st.items = []; st.loaded = false; load(S.dir);
    },
    async more(all) {
      const dir = S.dir, st = S[dir];
      if (st.busy) return;
      if (!all) return load(dir, { more: true });
      let guard = 0;
      while (st.items.length < st.total && st.items.length < SHOW_ALL_MAX && guard++ < 10 && !st.err) await load(dir, { more: true, chunk: CHUNK });
    },
    refresh() { loadCounts(true); load(S.dir, { keep: true }); },
  };

  /* ── export: every record that matches the current filters, not just the page on screen ── */
  async function collect(dir) {
    const st = S[dir];
    if (!useServer()) return localAll(dir, st);
    const out = [], seen = new Set();
    let total = Infinity, offset = 0;
    T('Collecting records…', 'info', 2000);
    while (offset < total && out.length < 20000) {
      const r = await ICR.search(srvOpts(dir, st, CHUNK, offset));
      total = r.total;
      if (!r.items.length) break;
      offset += r.items.length;
      r.items.forEach(ic => { if (!seen.has(ic.id) && matches(ic, st, dir, true)) { seen.add(ic.id); out.push(ic); } });
    }
    return out;
  }
  const money = ic => (ic.repairTotal ? GargoMoney.fmt(ic.repairTotal, GargoMoney.itemsCur(ic.repairs)) : '');
  const COLS = {
    inward: [
      ['Date', ic => ic.date], ['Container', ic => ic.container], ['EIR No.', ic => ic.eirNumber], ['Movement', ic => ic.type], ['Container Type', ic => ic.ctype],
      ['Shipping Line', ic => lineName(ic.line)], ['Vessel', ic => ic.vessel], ['Voyage', ic => ic.voyage], ['Consignee / C&F', ic => ic.deliveringParty],
      ['Guarantee / B/L No.', ic => ic.guaranteeNo || ic.blNumber], ['ISO Code', ic => ic.isoCode], ['Trailer No.', ic => ic.trailerNo], ['Gross Weight (kg)', ic => ic.grossWeight],
      ['Date of Manufacture', ic => ic.manufactureDate], ['Transporter', ic => ic.transporter], ['Driver ID / Driving No.', ic => ic.driverIdNumber], ['Cargo Status', ic => ic.cargoStatus],
      ['Condition', ic => ic.condition], ['Truck', ic => ic.truck ? truckName(ic.truck) : ic.truckRegText], ['Driver', ic => ic.driver ? driverName(ic.driver) : ic.driverNameText],
      ['Left Yard', ic => ic._exitAt || ic.dateOut], ['Receiving Party', ic => ic.receivingParty], ['Release Order No.', ic => ic.releaseOrderNo],
      ['Repair Items', ic => (ic.repairs || []).map(r => `${r.code} (${r.item})`).join('; ')], ['Repair Total', money], ['Status', ic => ic.status], ['Notes', ic => ic.notes],
    ],
    outward: [
      ['Date', ic => ic.date], ['Container', ic => ic.container], ['EIR No.', ic => ic.eirNumber], ['Movement', ic => ic.type], ['Container Type', ic => ic.ctype],
      ['Shipping Line', ic => lineName(ic.line)], ['Container Status', ic => ic.condition], ['Release Order No.', ic => ic.releaseOrderNo], ['Receiving Party', ic => ic.receivingParty],
      ['Consignee / C&F', ic => ic.deliveringParty], ['Guarantee / B/L No.', ic => ic.guaranteeNo || ic.blNumber], ['Vessel', ic => ic.vessel], ['Voyage', ic => ic.voyage],
      ['Truck', ic => ic.truck ? truckName(ic.truck) : ic.truckRegText], ['Trailer No.', ic => ic.trailerNo], ['Driver', ic => ic.driver ? driverName(ic.driver) : ic.driverNameText],
      ['Driver ID / Driving No.', ic => ic.driverIdNumber], ['Transporter', ic => ic.transporter], ['ISO Code', ic => ic.isoCode], ['Gross Weight (kg)', ic => ic.grossWeight],
      ['Status', ic => ic.status], ['Notes', ic => ic.notes],
    ],
  };
  const PRINT_COLS = {
    inward: [['Date', ic => fmtDate(ic.date)], ['Container', ic => ic.container], ['EIR No.', ic => ic.eirNumber], ['Type', ic => ic.type], ['Line', ic => lineName(ic.line)], ['Condition', ic => ic.condition], ['Truck', ic => ic.truck ? truckName(ic.truck) : ic.truckRegText], ['Driver', ic => ic.driver ? driverName(ic.driver) : ic.driverNameText], ['Repair Cost', money], ['Status', ic => String(ic.status || '').toUpperCase()]],
    outward: [['Date', ic => fmtDate(ic.date)], ['Container', ic => ic.container], ['EIR No.', ic => ic.eirNumber], ['Type', ic => ic.type], ['Line', ic => lineName(ic.line)], ['Release Order', ic => ic.releaseOrderNo], ['Receiving Party', ic => ic.receivingParty], ['Truck', ic => ic.truck ? truckName(ic.truck) : ic.truckRegText], ['Driver', ic => ic.driver ? driverName(ic.driver) : ic.driverNameText], ['Status', ic => String(ic.status || '').toUpperCase()]],
  };
  const filterText = st => [st.filter !== 'all' ? FLABEL[st.filter].replace('⚠ ', '') : 'all statuses', st.q ? 'search "' + st.q + '"' : '', st.from ? 'from ' + st.from : '', st.to ? 'to ' + st.to : ''].filter(Boolean).join(', ');

  window.printInterchangeList = async function () {
    const dir = S.dir, st = S[dir];
    let items; try { items = await collect(dir); } catch (e) { return T('Could not load the records to print: ' + ((e && e.message) || e), 'error', 6000); }
    if (!items.length) return T('Nothing to print yet', 'error');
    const cols = PRINT_COLS[dir], c = v => E(v == null || v === '' ? '—' : v);
    const rows = items.map(ic => '<tr>' + cols.map(x => '<td>' + c(x[1](ic)) + '</td>').join('') + '</tr>').join('');
    const w = window.open('', '_blank'); if (!w) return T('Allow pop-ups to print this list', 'error', 5000);
    w.document.write(`<html><head><title>${DIRS[dir].label} Interchange Records</title><style>
      body{font-family:Arial,sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f2f2f2;text-transform:uppercase;font-size:9px}h2{margin-bottom:4px}
      </style></head><body>${typeof ghPrintHeaderHtml === 'function' ? ghPrintHeaderHtml() : ''}<h2>${DIRS[dir].label} Interchange Records</h2>
      <div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')} · ${items.length} record${items.length === 1 ? '' : 's'} · ${E(filterText(st))}</div>
      <table><thead><tr>${cols.map(x => '<th>' + E(x[0]) + '</th>').join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  window.downloadInterchangeCSV = async function () {
    const dir = S.dir, st = S[dir];
    let items; try { items = await collect(dir); } catch (e) { return T('Could not load the records to download: ' + ((e && e.message) || e), 'error', 6000); }
    if (!items.length) return T('Nothing to download yet', 'error');
    const cols = COLS[dir], q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = (typeof ghCsvPreamble === 'function' ? ghCsvPreamble('\n') : '') + [cols.map(x => x[0])].concat(items.map(ic => cols.map(x => x[1](ic)))).map(r => r.map(q).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `interchange-${dir}-${st.filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  /* come back online: refresh whatever is showing (offline.js pushes unsaved edits first) */
  window.addEventListener('online', () => setTimeout(() => { const el = $(SEC); if (el && el.classList.contains('active')) { loadCounts(true); load(S.dir, { keep: true }); } }, 3000));
})();