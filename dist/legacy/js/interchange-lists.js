"use strict";
(function() {
  const $ = (id) => document.getElementById(id);
  const SEC = "sec-interchange", PAGE = 40, CHUNK = 200, SHOW_ALL_MAX = 1e3;
  const DIRS = {
    inward: { label: "Inward", types: ["Gate-In", "Depot-In"], blurb: "Containers received into the depot. The interchange (EIR) is issued once the survey is complete." },
    outward: { label: "Outward", types: ["Gate-Out", "Depot-Out"], blurb: "Containers released from the depot, with their release order and receiving party." }
  };
  const FILTERS = ["all", "pending", "approved", "reconciled", "flagged"];
  const FLABEL = { all: "All", pending: "Pending", approved: "Approved", reconciled: "Reconciled", flagged: "\u26A0 Flagged for Review" };
  const mk = () => ({ filter: "all", q: "", from: "", to: "", items: [], total: 0, busy: false, err: "", seq: 0, loaded: false, local: false, stale: true });
  const S = { dir: "inward", inward: mk(), outward: mk(), counts: { inward: null, outward: null }, waiting: 0, countsAt: 0, built: false };
  try {
    const d = localStorage.getItem("gargo-ic-dir");
    if (d === "inward" || d === "outward") S.dir = d;
  } catch (e) {
  }
  const isIn = (t) => t === "Gate-In" || t === "Depot-In";
  const isOut = (t) => /Out$/.test(t || "");
  const inDir = (ic, dir) => dir === "inward" ? isIn(ic.type) : isOut(ic.type);
  const E = (v) => typeof esc === "function" ? esc(v) : String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const T = (m, k, d) => {
    try {
      if (typeof toast === "function") toast(m, k || "info", d);
    } catch (e) {
    }
  };
  const useServer = () => !!(window.ICR && ICR.enabled && navigator.onLine);
  const dayStart = (s) => /* @__PURE__ */ new Date(s + "T00:00:00"), dayEnd = (s) => /* @__PURE__ */ new Date(s + "T23:59:59.999");
  const lc = (v) => String(v == null ? "" : v).toLowerCase();
  const nk = (v) => String(v == null ? "" : v).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const setIcFilter = (f) => {
    try {
      _icFilter = f;
    } catch (e) {
    }
  };
  function matches(ic, st, dir, server) {
    if (!inDir(ic, dir)) return false;
    if (typeof icAwaitingSurvey === "function" && icAwaitingSurvey(ic)) return false;
    if (st.filter === "flagged") {
      if (!ic.flaggedForReview) return false;
    } else if (st.filter !== "all" && ic.status !== st.filter) return false;
    if (server) return true;
    const t = new Date(ic.date).getTime();
    if (st.from && t < dayStart(st.from).getTime()) return false;
    if (st.to && t > dayEnd(st.to).getTime()) return false;
    const q = lc(st.q).trim();
    if (q) {
      const qk = nk(q);
      const hay = [ic.eirNumber, ic.vessel, ic.voyage, ic.releaseOrderNo, ic.receivingParty, ic.deliveringParty, ic.blNumber, ic.guaranteeNo, ic.truckRegText, ic.driverNameText, ic.transporter, ic.notes].map(lc).join(" ");
      if (hay.indexOf(q) < 0 && !(qk && nk(ic.container).indexOf(qk) >= 0)) return false;
    }
    return true;
  }
  function localAll(dir, st) {
    return (state.db.interchange || []).filter((ic) => matches(ic, st, dir, false)).sort((a, b) => (+new Date(b.date) || 0) - (+new Date(a.date) || 0));
  }
  function srvOpts(dir, st, limit, offset) {
    return {
      types: DIRS[dir].types,
      q: st.q.trim() || null,
      status: st.filter !== "all" && st.filter !== "flagged" ? st.filter : null,
      flagged: st.filter === "flagged",
      from: st.from ? dayStart(st.from).toISOString() : null,
      to: st.to ? dayEnd(st.to).toISOString() : null,
      limit,
      offset
    };
  }
  async function load(dir, o) {
    o = o || {};
    const st = S[dir], my = ++st.seq;
    st.err = "";
    st.stale = false;
    const fromDevice = (note) => {
      const all = localAll(dir, st), n = o.more ? st.items.length + (o.chunk || PAGE) : Math.max(PAGE, o.keep ? st.items.length : 0);
      st.items = all.slice(0, n);
      st.total = all.length;
      st.local = true;
      st.loaded = true;
      st.busy = false;
      if (note) st.err = note;
    };
    if (!useServer()) {
      fromDevice();
      paint();
      return;
    }
    st.local = false;
    st.busy = true;
    if (!o.keep) paint();
    try {
      const offset = o.more ? st.items.length : 0;
      const limit = o.more ? o.chunk || PAGE : Math.min(400, Math.max(PAGE, o.keep ? st.items.length : PAGE));
      const r = await ICR.search(srvOpts(dir, st, limit, offset));
      if (my !== st.seq) return;
      const fresh = r.items.filter((ic) => matches(ic, st, dir, true));
      if (o.more) {
        const have = new Set(st.items);
        st.items = st.items.concat(fresh.filter((x) => !have.has(x)));
      } else st.items = fresh;
      st.total = r.total;
      st.loaded = true;
    } catch (e) {
      if (my !== st.seq) return;
      console.warn("interchange list:", e && e.message);
      if (o.more) st.err = "Could not load more records: " + (e && e.message || "connection problem");
      else fromDevice("Could not reach the server. Showing records saved on this device.");
    }
    st.busy = false;
    paint();
  }
  let timer = null;
  function refreshSoon(dir) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const el = $(SEC);
      if (el && el.classList.contains("active")) load(dir || S.dir, { keep: true });
    }, 300);
  }
  async function loadCounts(force) {
    if (!force && Date.now() - S.countsAt < 3e4) return;
    S.countsAt = Date.now();
    if (!useServer()) {
      const rows = (state.db.interchange || []).filter((ic) => !(typeof icAwaitingSurvey === "function" && icAwaitingSurvey(ic)));
      S.counts = { inward: rows.filter((ic) => isIn(ic.type)).length, outward: rows.filter((ic) => isOut(ic.type)).length };
      S.waiting = (state.db.interchange || []).length - rows.length;
      paintTabs();
      paintList();
      return;
    }
    try {
      const r = await Promise.all(["inward", "outward"].map((d) => ICR.search({ types: DIRS[d].types, limit: 1 })).concat([ICR.search({ waiting: "only", limit: 1 })]));
      S.counts = { inward: r[0].total, outward: r[1].total };
      S.waiting = r[2].total;
      paintTabs();
      paintList();
    } catch (e) {
      S.countsAt = 0;
    }
  }
  function css() {
    if ($("icxCss")) return;
    const st = document.createElement("style");
    st.id = "icxCss";
    st.textContent = '\n    /* Glass layer. Colours match the inspection report: blue = inward, gold = outward, green = good/complete.\n       Only the big panels blur; cards inside them use translucent fills + a light edge (nested blur is slow on tablets and\n       cannot see through its parent anyway). Lite mode (html.gx-lite) already removes blur and makes the variables solid. */\n    .icx-tabs{display:flex;gap:6px;flex-wrap:wrap;width:fit-content;max-width:100%;padding:5px;border:1px solid var(--glass-edge,var(--border));border-radius:16px;\n      background:var(--glass,var(--surface));-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);\n      box-shadow:0 1px 0 var(--glass-hi,transparent) inset,var(--card-shadow,0 14px 30px -22px rgba(0,0,0,.6))}\n    .icx-tab{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:12px;border:1px solid transparent;background:transparent;color:var(--text-2);font:600 13px var(--font-body,inherit);cursor:pointer;min-height:44px;transition:background .18s,color .18s,border-color .18s,box-shadow .18s}\n    .icx-tab:hover{background:var(--hover);color:var(--text)}\n    .icx-tab .icx-n{min-width:26px;padding:1px 8px;border-radius:999px;background:var(--glass-hi,var(--surface-2));border:1px solid var(--glass-edge,var(--border));color:var(--text-3);font-size:11px;text-align:center}\n    .icx-tab[data-d=inward][aria-selected=true]{color:var(--blue);border-color:var(--blue);background:linear-gradient(180deg,var(--glass-hi,transparent),var(--blue-dim));box-shadow:0 1px 0 var(--glass-hi,transparent) inset,0 6px 18px -10px var(--blue)}\n    .icx-tab[data-d=outward][aria-selected=true]{color:var(--gold);border-color:var(--gold-border);background:linear-gradient(180deg,var(--glass-hi,transparent),var(--gold-dim));box-shadow:0 1px 0 var(--glass-hi,transparent) inset,0 6px 18px -10px var(--gold)}\n    .icx-tab[aria-selected=true] .icx-n{color:inherit;border-color:currentColor}\n    .icx-tab:focus-visible{outline:2px solid var(--gold);outline-offset:2px}\n    .icx-area{--ax:var(--gold);--ax-t:var(--gold-dim);position:relative;overflow:hidden;margin-top:14px;padding:16px 16px 10px 20px;border:1px solid var(--glass-edge,var(--border));border-radius:18px;\n      background:radial-gradient(70% 90% at 100% 0,var(--ax-t),transparent 70%),var(--glass,var(--surface));\n      -webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);\n      box-shadow:0 1px 0 var(--glass-hi,transparent) inset,var(--card-shadow,0 18px 40px -26px rgba(0,0,0,.7))}\n    .icx-area::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:var(--ax)}\n    .icx-area[data-d=inward]{--ax:var(--blue);--ax-t:var(--blue-dim)}\n    .icx-blurb{font-size:12px;color:var(--text-3);margin:0 0 10px;line-height:1.5}\n    .icx-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}\n    .icx-bar input[type=search]{flex:1;min-width:190px;background:var(--surface-2);border:1px solid var(--glass-edge,var(--border));border-radius:12px;box-shadow:0 1px 0 var(--glass-hi,transparent) inset;transition:border-color .15s,box-shadow .15s}\n    .icx-bar input[type=search]:focus{outline:none;border-color:var(--ax);box-shadow:0 0 0 3px var(--ax-t)}\n    .icx-bar label{font-size:11px;color:var(--text-3);display:flex;gap:5px;align-items:center}\n    .icx-note{font-size:11.5px;padding:8px 12px;border-radius:12px;margin-bottom:10px;border:1px solid var(--glass-edge,var(--border));background:var(--glass-hi,transparent);color:var(--text-2)}\n    .icx-note.warn{border-color:var(--amber);background:var(--amber-dim);color:var(--amber)}\n    .icx-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10.5px;font-weight:600;margin-left:6px;border:1px solid var(--glass-edge,var(--border));background:var(--glass-hi,transparent)}\n    .icx-pill.in{color:var(--blue);border-color:var(--blue);background:var(--blue-dim)}\n    .icx-pill.out{color:var(--text-3)}\n    .icx-pill.cond{color:var(--green);border-color:var(--green);background:var(--green-dim)}\n    .icx-more{padding:14px;text-align:center;font-size:12px;color:var(--text-3)}\n    .icx-thumb img{width:100%;height:100%;object-fit:cover}\n    /* record cards (also the Inward page): frosted tile, bright top edge, accent edge on hover */\n    .icx-area .ic-card,#sec-inward .ic-card{border:1px solid var(--glass-edge,var(--border));border-radius:14px!important;\n      background:linear-gradient(135deg,var(--glass-hi,transparent) 0%,transparent 55%),var(--surface);\n      box-shadow:0 1px 0 var(--glass-hi,transparent) inset,0 10px 26px -20px rgba(0,0,0,.75);\n      transition:border-color .18s,box-shadow .18s,transform .18s}\n    .icx-area .ic-card:hover,#sec-inward .ic-card:hover{border-color:var(--ax,var(--border-mid));box-shadow:0 1px 0 var(--glass-hi,transparent) inset,0 14px 30px -18px var(--ax,rgba(0,0,0,.8))}\n    .icx-area .ic-card-img,.icx-area .ic-card-img-placeholder,#sec-inward .ic-card-img,#sec-inward .ic-card-img-placeholder{border-radius:10px;border-color:var(--glass-edge,var(--border))}\n    [data-theme=light] .icx-area .ic-card,[data-theme=light] #sec-inward .ic-card{box-shadow:0 1px 0 #fff inset,0 10px 24px -20px rgba(16,20,32,.35)}\n    @supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.icx-tabs,.icx-area{background:var(--surface)}}\n    @media(prefers-reduced-motion:reduce){.icx-tab,.icx-area .ic-card,#sec-inward .ic-card{transition:none}}\n    @media(max-width:700px){.icx-tab{flex:1;justify-content:center}.icx-tabs{width:100%}.icx-area{padding:12px 12px 6px 16px;border-radius:16px}}';
    document.head.appendChild(st);
  }
  function build() {
    const sec = $(SEC);
    if (!sec) return false;
    css();
    if (S.built && $("icxBody")) return true;
    sec.innerHTML = '<div class="sec-toolbar"><div class="sec-title">Interchange Management</div>\n      <div class="icx-tabs" role="tablist" aria-label="Interchange direction">\n        '.concat(["inward", "outward"].map((d) => '<button type="button" class="icx-tab" role="tab" data-d="'.concat(d, '" id="icxTab-').concat(d, '" aria-selected="false" onclick="IcxLists.tab(\'').concat(d, "')\">").concat(DIRS[d].label, ' interchange <span class="icx-n" id="icxN-').concat(d, '">\u2013</span></button>')).join(""), '\n      </div></div>\n      <div id="icxBody"></div>');
    S.built = true;
    paintHead();
    return true;
  }
  function paintTabs() {
    ["inward", "outward"].forEach((d) => {
      const b = $("icxTab-" + d), n = $("icxN-" + d);
      if (b) b.setAttribute("aria-selected", String(S.dir === d));
      if (n) {
        const c = S.counts[d];
        n.textContent = c == null ? "\u2013" : Number(c).toLocaleString();
      }
    });
  }
  function paintHead() {
    const host = $("icxBody");
    if (!host) return;
    const dir = S.dir, d = DIRS[dir], st = S[dir];
    const canRecord = typeof canSeeSection !== "function" || canSeeSection("interchange");
    const action = dir === "outward" ? canRecord ? '<button class="action-btn" onclick="showAddInterchangeModal()">+ Record Outward Interchange</button>' : "" : typeof canSeeSection !== "function" || canSeeSection("inward") ? "<button class=\"action-btn ghost\" onclick=\"showSection('inward',document.querySelector('.nav-item[data-section=&quot;inward&quot;]'))\">Gate-In entry</button>" : "";
    host.innerHTML = '<div class="icx-area" data-d="'.concat(dir, '" role="tabpanel" aria-labelledby="icxTab-').concat(dir, '">\n      <p class="icx-blurb">').concat(E(d.blurb), '</p>\n      <div class="filter-row" style="margin-bottom:10px">').concat(FILTERS.map((f) => '<button class="filter-btn'.concat(st.filter === f ? " active" : "", '" onclick="filterInterchange(\'').concat(f, "',this)\">").concat(FLABEL[f], "</button>")).join(""), '</div>\n      <div class="icx-bar">\n        <input type="search" id="icxQ" placeholder="').concat(dir === "inward" ? "Search container, EIR, vessel, consignee\u2026" : "Search container, EIR, release order, receiving party\u2026", '" value="').concat(E(st.q), '" oninput="IcxLists.search(this.value)" autocomplete="off">\n        <label>From <input type="date" id="icxFrom" value="').concat(E(st.from), '" onchange="IcxLists.dates()"></label>\n        <label>To <input type="date" id="icxTo" value="').concat(E(st.to), '" onchange="IcxLists.dates()"></label>\n        <button class="action-btn ghost" onclick="printInterchangeList()">\u{1F5A8} Print</button>\n        <button class="action-btn ghost" onclick="downloadInterchangeCSV()">\u2B07 Download CSV</button>\n        ').concat(action, '\n      </div>\n      <div id="icxList"></div></div>');
    paintTabs();
    paintList();
  }
  const SVG_IMG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  function cardHtml(ic, dir, idx) {
    const inward = dir === "inward", id = ic.id;
    const thumb = ic.img ? '<img loading="lazy" decoding="async" src="'.concat(ic.img, '" alt="">') : ic.hasImg ? '<img loading="lazy" decoding="async" data-icimg="'.concat(E(id), '" alt="">') : SVG_IMG;
    let pill = "", meta;
    if (inward) {
      const inYard = ic._inYard !== void 0 ? ic._inYard : icInYard(ic, idx);
      if (inYard) {
        const days = Math.max(0, Math.floor((Date.now() - new Date(ic.date).getTime()) / 864e5));
        pill = '<span class="icx-pill in">In yard \xB7 '.concat(days, " d</span>");
      } else {
        const out = ic._exitAt || ic.dateOut || (typeof icExitDate === "function" ? icExitDate(ic, idx) : null);
        pill = '<span class="icx-pill out">Left yard'.concat(out ? " " + E(fmtDate(out)) : "", "</span>");
      }
      meta = [
        ic.eirNumber ? "EIR " + ic.eirNumber : "",
        ic.vessel || ic.voyage ? (ic.vessel || "\u2014") + " / " + (ic.voyage || "\u2014") : "",
        ic.deliveringParty ? "Consignee " + ic.deliveringParty : "",
        ic.dateOut ? "Out " + fmtDate(ic.dateOut) : "",
        ic.dateOut && ic.receivingParty ? "To " + ic.receivingParty : "",
        ic.dateOut && ic.releaseOrderNo ? "RO " + ic.releaseOrderNo : ""
      ].filter(Boolean).join(" \xB7 ");
    } else {
      if (ic.condition) pill = '<span class="icx-pill cond">'.concat(E(ic.condition), "</span>");
      meta = [
        ic.eirNumber ? "EIR " + ic.eirNumber : "",
        ic.releaseOrderNo ? "Release order " + ic.releaseOrderNo : "",
        ic.receivingParty ? "Receiving " + ic.receivingParty : "",
        ic.deliveringParty ? "Consignee " + ic.deliveringParty : "",
        ic.blNumber || ic.guaranteeNo ? "B/L " + (ic.blNumber || ic.guaranteeNo) : "",
        ic.vessel || ic.voyage ? (ic.vessel || "\u2014") + " / " + (ic.voyage || "\u2014") : ""
      ].filter(Boolean).join(" \xB7 ");
    }
    const kind = [ic.type, lineName(ic.line), inward ? ic.condition : "", ic.ctype].filter(Boolean).map(E).join(" \xB7 ");
    const who = [ic.truck ? truckName(ic.truck) : ic.truckRegText || "\u2014", ic.trailerNo && !inward ? "Trailer " + ic.trailerNo : "", ic.driver ? driverName(ic.driver) : ic.driverNameText || "\u2014", fmtDate(ic.date)].filter(Boolean).map(E).join(" \xB7 ");
    const repair = inward && ic.repairs && ic.repairs.length ? '<div style="font-size:10.5px;color:var(--red);margin-top:2px'.concat(isAdmin() ? ";cursor:pointer;text-decoration:underline dotted" : "", '" ').concat(isAdmin() ? "onclick=\"showEditInterchangeModal('".concat(id, "','repairs')\" title=\"Edit damage items and tariff amounts (administrator)\"") : "", ">").concat(ic.repairs.length, " damage item").concat(ic.repairs.length > 1 ? "s" : "", " \xB7 ").concat(GargoMoney.fmt(ic.repairTotal || 0, GargoMoney.itemsCur(ic.repairs)), "</div>") : "";
    const inYardNow = inward && (ic._inYard !== void 0 ? ic._inYard : icInYard(ic, idx));
    const btns = [];
    if (isAdmin() && ic.status === "pending") btns.push('<button class="modal-btn success" onclick="approveInterchange(\''.concat(id, "')\">Approve</button>"));
    if (inYardNow) btns.push('<button class="modal-btn ghost" onclick="quickDispatchOut(\''.concat(id, "')\">Quick Dispatch \u2192</button>"));
    if (inward && !ic.surveyStatus) btns.push('<button class="modal-btn ghost" onclick="sendToSurvey(\''.concat(id, "')\">Send to Survey \u2192</button>"));
    btns.push('<button class="modal-btn ghost" onclick="downloadInterchangeSlip(\''.concat(id, "')\">\u2B07 Download</button>"), '<button class="modal-btn ghost" onclick="printInterchangeSlip(\''.concat(id, '\')" title="Print">\u{1F5A8} Print</button>'));
    if (isAdmin()) btns.push('<button class="modal-btn ghost" onclick="showEditInterchangeModal(\''.concat(id, '\')" title="Correct details, damage items and tariff amounts (administrator only)">\u270E Edit</button>'));
    if (ic.flaggedForReview) btns.push("<button class=\"modal-btn ghost\" onclick=\"clearReviewFlag('interchange','".concat(id, "')\">\u2713 Mark Reviewed</button>"));
    if (ic.surveyId) btns.push('<button class="modal-btn ghost" onclick="downloadInspectionReport(\''.concat(ic.surveyId, "')\">\u2B07 Inspection Report</button>"), '<button class="modal-btn ghost" onclick="printInspectionReport(\''.concat(ic.surveyId, '\')" title="Print">\u{1F5A8} Print Report</button>'));
    if (ic.surveyId || ic.img || ic.hasImg || ic.hasPhotos || ic.photos && ic.photos.length) btns.push('<button class="modal-btn ghost" onclick="showContainerPhotos(\''.concat(id, "')\">\u{1F4F7} Photos</button>"));
    return '<div class="ic-card"><div class="ic-card-img-placeholder icx-thumb" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload(\'interchange\',\''.concat(id, "','img',()=>renderInterchange())\" title=\"Upload container photo\">").concat(thumb, '</div>\n      <div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">').concat(E(ic.container)).concat(pill, "</div>\n      <div>").concat(sbadge(ic.status)).concat(ic.flaggedForReview ? '<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="'.concat(E((ic.flagReasons || []).join("; ")), '">\u26A0 Flagged</span>') : "", '</div></div>\n      <div style="font-size:11.5px;color:var(--text-2)">').concat(kind, '</div>\n      <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">').concat(who, "</div>\n      ").concat(meta ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">'.concat(E(meta), "</div>") : "").concat(repair).concat(ic.notes ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">'.concat(E(ic.notes), "</div>") : "", '</div>\n      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">').concat(btns.join(""), "</div></div>");
  }
  function paintList() {
    const host = $("icxList");
    if (!host) return;
    const dir = S.dir, st = S[dir], d = DIRS[dir];
    let html = "";
    if (st.err) html += '<div class="icx-note warn">'.concat(E(st.err), "</div>");
    else if (st.local && st.loaded) html += '<div class="icx-note">Showing records saved on this device.</div>';
    if (dir === "inward" && st.loaded) {
      const w = Number(S.waiting) || 0;
      if (w) html += '<div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0"><b>'.concat(w, "</b> gated-in container").concat(w === 1 ? " is" : "s are", " waiting for survey. Its interchange (EIR) is issued automatically when the survey is complete.</span></div>");
    }
    if (!st.loaded && !st.err) html += '<div class="empty-state"><div class="empty-state-label">Loading ' + d.label.toLowerCase() + " interchange\u2026</div></div>";
    else if (!st.items.length) {
      const filtered = st.filter !== "all" || st.q || st.from || st.to;
      html += '<div class="empty-state"><div class="empty-state-icon">\u{1F504}</div><div class="empty-state-label">'.concat(filtered ? "No " + d.label.toLowerCase() + " records match these filters" : "No " + d.label.toLowerCase() + " interchange records", "</div></div>");
    } else {
      const idx = dir === "inward" ? icOutIndex() : null;
      html += st.items.map((ic) => cardHtml(ic, dir, idx)).join("");
      if (st.total > st.items.length) html += '<div class="icx-more">Showing '.concat(st.items.length.toLocaleString(), " of ").concat(st.total.toLocaleString(), ' \xB7 <button class="modal-btn ghost" ').concat(st.busy ? "disabled" : "", ' onclick="IcxLists.more()">Show ').concat(PAGE, " more</button> ").concat(st.total <= SHOW_ALL_MAX ? '<button class="modal-btn ghost" '.concat(st.busy ? "disabled" : "", ' onclick="IcxLists.more(true)">Show all</button>') : "", "</div>");
      else html += '<div class="icx-more">'.concat(st.total.toLocaleString(), " record").concat(st.total === 1 ? "" : "s", "</div>");
    }
    host.innerHTML = html;
    if (window.ICR && ICR.enabled && ICR.fillThumbs) {
      try {
        ICR.fillThumbs(host);
      } catch (e) {
      }
    }
  }
  function paint() {
    paintTabs();
    paintList();
  }
  window.renderInterchange = function(f) {
    if (!build()) return;
    const st = S[S.dir];
    if (f && FILTERS.indexOf(f) >= 0 && f !== st.filter) {
      st.filter = f;
      paintHead();
    }
    setIcFilter(st.filter);
    paint();
    loadCounts(false);
    if (!st.loaded) load(S.dir);
    else refreshSoon(S.dir);
  };
  window.filterInterchange = function(f, btn) {
    const st = S[S.dir];
    st.filter = f;
    setIcFilter(f);
    document.querySelectorAll("#icxBody .filter-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    st.items = [];
    st.loaded = false;
    load(S.dir);
  };
  window.icShowMore = (all) => IcxLists.more(all);
  const IcxLists = window.IcxLists = {
    state: S,
    tab(d) {
      if (!DIRS[d] || d === S.dir) return;
      S.dir = d;
      try {
        localStorage.setItem("gargo-ic-dir", d);
      } catch (e) {
      }
      setIcFilter(S[d].filter);
      paintHead();
      if (!S[d].loaded) load(d);
      else refreshSoon(d);
    },
    search(v) {
      const st = S[S.dir];
      st.q = v;
      clearTimeout(IcxLists._t);
      IcxLists._t = setTimeout(() => {
        st.items = [];
        st.loaded = false;
        load(S.dir);
      }, 300);
    },
    dates() {
      const st = S[S.dir], a = $("icxFrom"), b = $("icxTo");
      st.from = a ? a.value : "";
      st.to = b ? b.value : "";
      if (st.from && st.to && st.from > st.to) {
        T('"From" is after "To"', "error");
        return;
      }
      st.items = [];
      st.loaded = false;
      load(S.dir);
    },
    async more(all) {
      const dir = S.dir, st = S[dir];
      if (st.busy) return;
      if (!all) return load(dir, { more: true });
      let guard = 0;
      while (st.items.length < st.total && st.items.length < SHOW_ALL_MAX && guard++ < 10 && !st.err) await load(dir, { more: true, chunk: CHUNK });
    },
    refresh() {
      loadCounts(true);
      load(S.dir, { keep: true });
    }
  };
  async function collect(dir) {
    const st = S[dir];
    if (!useServer()) return localAll(dir, st);
    const out = [], seen = /* @__PURE__ */ new Set();
    let total = Infinity, offset = 0;
    T("Collecting records\u2026", "info", 2e3);
    while (offset < total && out.length < 2e4) {
      const r = await ICR.search(srvOpts(dir, st, CHUNK, offset));
      total = r.total;
      if (!r.items.length) break;
      offset += r.items.length;
      r.items.forEach((ic) => {
        if (!seen.has(ic.id) && matches(ic, st, dir, true)) {
          seen.add(ic.id);
          out.push(ic);
        }
      });
    }
    return out;
  }
  const money = (ic) => ic.repairTotal ? GargoMoney.fmt(ic.repairTotal, GargoMoney.itemsCur(ic.repairs)) : "";
  const COLS = {
    inward: [
      ["Date", (ic) => ic.date],
      ["Container", (ic) => ic.container],
      ["EIR No.", (ic) => ic.eirNumber],
      ["Movement", (ic) => ic.type],
      ["Container Type", (ic) => ic.ctype],
      ["Shipping Line", (ic) => lineName(ic.line)],
      ["Vessel", (ic) => ic.vessel],
      ["Voyage", (ic) => ic.voyage],
      ["Consignee / C&F", (ic) => ic.deliveringParty],
      ["Guarantee / B/L No.", (ic) => ic.guaranteeNo || ic.blNumber],
      ["ISO Code", (ic) => ic.isoCode],
      ["Trailer No.", (ic) => ic.trailerNo],
      ["Gross Weight (kg)", (ic) => ic.grossWeight],
      ["Date of Manufacture", (ic) => ic.manufactureDate],
      ["Transporter", (ic) => ic.transporter],
      ["Driver ID / Driving No.", (ic) => ic.driverIdNumber],
      ["Cargo Status", (ic) => ic.cargoStatus],
      ["Condition", (ic) => ic.condition],
      ["Truck", (ic) => ic.truck ? truckName(ic.truck) : ic.truckRegText],
      ["Driver", (ic) => ic.driver ? driverName(ic.driver) : ic.driverNameText],
      ["Left Yard", (ic) => ic._exitAt || ic.dateOut],
      ["Receiving Party", (ic) => ic.receivingParty],
      ["Release Order No.", (ic) => ic.releaseOrderNo],
      ["Repair Items", (ic) => (ic.repairs || []).map((r) => "".concat(r.code, " (").concat(r.item, ")")).join("; ")],
      ["Repair Total", money],
      ["Status", (ic) => ic.status],
      ["Notes", (ic) => ic.notes]
    ],
    outward: [
      ["Date", (ic) => ic.date],
      ["Container", (ic) => ic.container],
      ["EIR No.", (ic) => ic.eirNumber],
      ["Movement", (ic) => ic.type],
      ["Container Type", (ic) => ic.ctype],
      ["Shipping Line", (ic) => lineName(ic.line)],
      ["Container Status", (ic) => ic.condition],
      ["Release Order No.", (ic) => ic.releaseOrderNo],
      ["Receiving Party", (ic) => ic.receivingParty],
      ["Consignee / C&F", (ic) => ic.deliveringParty],
      ["Guarantee / B/L No.", (ic) => ic.guaranteeNo || ic.blNumber],
      ["Vessel", (ic) => ic.vessel],
      ["Voyage", (ic) => ic.voyage],
      ["Truck", (ic) => ic.truck ? truckName(ic.truck) : ic.truckRegText],
      ["Trailer No.", (ic) => ic.trailerNo],
      ["Driver", (ic) => ic.driver ? driverName(ic.driver) : ic.driverNameText],
      ["Driver ID / Driving No.", (ic) => ic.driverIdNumber],
      ["Transporter", (ic) => ic.transporter],
      ["ISO Code", (ic) => ic.isoCode],
      ["Gross Weight (kg)", (ic) => ic.grossWeight],
      ["Status", (ic) => ic.status],
      ["Notes", (ic) => ic.notes]
    ]
  };
  const PRINT_COLS = {
    inward: [["Date", (ic) => fmtDate(ic.date)], ["Container", (ic) => ic.container], ["EIR No.", (ic) => ic.eirNumber], ["Type", (ic) => ic.type], ["Line", (ic) => lineName(ic.line)], ["Condition", (ic) => ic.condition], ["Truck", (ic) => ic.truck ? truckName(ic.truck) : ic.truckRegText], ["Driver", (ic) => ic.driver ? driverName(ic.driver) : ic.driverNameText], ["Repair Cost", money], ["Status", (ic) => String(ic.status || "").toUpperCase()]],
    outward: [["Date", (ic) => fmtDate(ic.date)], ["Container", (ic) => ic.container], ["EIR No.", (ic) => ic.eirNumber], ["Type", (ic) => ic.type], ["Line", (ic) => lineName(ic.line)], ["Release Order", (ic) => ic.releaseOrderNo], ["Receiving Party", (ic) => ic.receivingParty], ["Truck", (ic) => ic.truck ? truckName(ic.truck) : ic.truckRegText], ["Driver", (ic) => ic.driver ? driverName(ic.driver) : ic.driverNameText], ["Status", (ic) => String(ic.status || "").toUpperCase()]]
  };
  const filterText = (st) => [st.filter !== "all" ? FLABEL[st.filter].replace("\u26A0 ", "") : "all statuses", st.q ? 'search "' + st.q + '"' : "", st.from ? "from " + st.from : "", st.to ? "to " + st.to : ""].filter(Boolean).join(", ");
  window.printInterchangeList = async function() {
    const dir = S.dir, st = S[dir];
    let items;
    try {
      items = await collect(dir);
    } catch (e) {
      return T("Could not load the records to print: " + (e && e.message || e), "error", 6e3);
    }
    if (!items.length) return T("Nothing to print yet", "error");
    const cols = PRINT_COLS[dir], c = (v) => E(v == null || v === "" ? "\u2014" : v);
    const rows = items.map((ic) => "<tr>" + cols.map((x) => "<td>" + c(x[1](ic)) + "</td>").join("") + "</tr>").join("");
    const w = window.open("", "_blank");
    if (!w) return T("Allow pop-ups to print this list", "error", 5e3);
    w.document.write("<html><head><title>".concat(DIRS[dir].label, " Interchange Records</title><style>\n      body{font-family:Arial,sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse;font-size:11px}\n      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f2f2f2;text-transform:uppercase;font-size:9px}h2{margin-bottom:4px}\n      </style></head><body>").concat(typeof ghPrintHeaderHtml === "function" ? ghPrintHeaderHtml() : "", "<h2>").concat(DIRS[dir].label, ' Interchange Records</h2>\n      <div style="font-size:11px;color:#555;margin-bottom:12px">Generated ').concat((/* @__PURE__ */ new Date()).toLocaleString("en-KE"), " \xB7 ").concat(items.length, " record").concat(items.length === 1 ? "" : "s", " \xB7 ").concat(E(filterText(st)), "</div>\n      <table><thead><tr>").concat(cols.map((x) => "<th>" + E(x[0]) + "</th>").join(""), "</tr></thead><tbody>").concat(rows, "</tbody></table></body></html>"));
    w.document.close();
    w.focus();
    w.print();
  };
  window.downloadInterchangeCSV = async function() {
    const dir = S.dir, st = S[dir];
    let items;
    try {
      items = await collect(dir);
    } catch (e) {
      return T("Could not load the records to download: " + (e && e.message || e), "error", 6e3);
    }
    if (!items.length) return T("Nothing to download yet", "error");
    const cols = COLS[dir], q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const csv = (typeof ghCsvPreamble === "function" ? ghCsvPreamble("\n") : "") + [cols.map((x) => x[0])].concat(items.map((ic) => cols.map((x) => x[1](ic)))).map((r) => r.map(q).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "interchange-".concat(dir, "-").concat(st.filter, "-").concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), ".csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
  };
  window.addEventListener("online", () => setTimeout(() => {
    const el = $(SEC);
    if (el && el.classList.contains("active")) {
      loadCounts(true);
      load(S.dir, { keep: true });
    }
  }, 3e3));
})();
