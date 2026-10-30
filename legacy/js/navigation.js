"use strict";
(function() {
  if (window.NAV) return;
  const $ = (id) => document.getElementById(id);
  const DB = () => window.state && window.state.db || {};
  const ready = () => !!(window.state && window.state.currentUser);
  const meta = (s) => typeof SECTION_META !== "undefined" && SECTION_META[s] || null;
  const visible = (s) => {
    try {
      return !!meta(s) && (canSeeSection(s) || canSeeAdminSection(s));
    } catch (e) {
      return false;
    }
  };
  const isDrv = () => {
    try {
      return isDriver();
    } catch (e) {
      return false;
    }
  };
  const landing = () => {
    try {
      return defaultSectionForRole();
    } catch (e) {
      return "dashboard";
    }
  };
  const titleOf = (s) => (meta(s) || [])[1] || s;
  const modalEl = () => $("modalOverlay");
  const modalActive = () => !!(modalEl() && modalEl().classList.contains("active"));
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const norm = (s) => String(s == null ? "" : s).trim().toUpperCase();
  const flat = (s) => norm(s).replace(/[^A-Z0-9]/g, "");
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tst = (m, t) => {
    try {
      toast(m, t || "info");
    } catch (e) {
    }
  };
  const byDateDesc = (k) => (a, b) => new Date(b[k] || 0) - new Date(a[k] || 0);
  const KIND_LABEL = { truck: "Truck", driver: "Driver", trip: "Trip", container: "Container", invoice: "Invoice", line: "Shipping line" };
  const KIND_SECTION = { truck: ["trucks"], driver: ["drivers"], trip: ["trips"], invoice: ["invoicing"], line: ["shippinglines"], container: ["interchange", "inward", "trips", "depops", "shutout"] };
  const KIND_HOME = { truck: "trucks", driver: "drivers", trip: "trips", invoice: "invoicing", line: "shippinglines", container: "interchange" };
  const OPENER = { truck: "showTruckDetail", driver: "showDriverDetail", trip: "showTripDetail", container: "showContainerDetail", invoice: "showInvoiceDetail" };
  const can = (k) => (KIND_SECTION[k] || []).some(visible);
  const TABS = { finance: { key: "_finTab", host: "financeTabs", fn: "renderFinance" }, hr: { key: "_hrTab", host: "hrTabs", fn: "renderHR" } };
  const normTab = (t) => !t || t === "overview" ? null : t;
  const tabOf = (s) => TABS[s] ? normTab(window[TABS[s].key]) : null;
  const boot = history.state && history.state.bcd ? history.state : null;
  let bootHash = location.hash;
  let idx = boot ? boot.i : 0, maxIdx = idx;
  let cur = null;
  let restoring = 0;
  let suppress = 0;
  let trapIgnore = 0;
  let afterTrap = null;
  const trail = [];
  const keyOf = (v) => v ? v.s + "/" + (v.t || "") : "";
  const urlFor = (v) => location.pathname + location.search + "#/" + v.s + (v.t ? "/" + encodeURIComponent(v.t) : "");
  const entityHash = (k, id) => "#/e/" + k + "/" + encodeURIComponent(id);
  const entityUrl = (k, id) => location.pathname + location.search + entityHash(k, id);
  const labelFor = (v) => titleOf(v.s) + (v.t ? " \xB7 " + tabLabel(v.s, v.t) : "");
  function tabLabel(sec, tab) {
    const T = TABS[sec];
    if (T) {
      const b = [...document.querySelectorAll("#" + T.host + " .filter-btn")].find((x) => (x.getAttribute("onclick") || "").includes("'" + tab + "'"));
      if (b && b.textContent.trim()) return b.textContent.trim();
    }
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  }
  function parseHash(h) {
    h = String(h == null ? location.hash : h).replace(/^#\/?/, "");
    if (!h) return null;
    const p = h.split("/").map((x) => {
      try {
        return decodeURIComponent(x);
      } catch (e) {
        return x;
      }
    });
    if (p[0] === "e" && p.length >= 3) return { e: { k: p[1], id: p.slice(2).join("/") } };
    if (meta(p[0])) return { s: p[0], t: normTab(p[1]) };
    return null;
  }
  function commit(v, replace) {
    if (replace) history.replaceState({ bcd: 1, i: idx, v }, "", urlFor(v));
    else {
      idx++;
      maxIdx = idx;
      history.pushState({ bcd: 1, i: idx, v }, "", urlFor(v));
    }
    cur = v;
    trail[idx] = labelFor(v);
    remember({ t: "v", s: v.s, tab: v.t || null, label: labelFor(v) });
    updateUI();
  }
  function viewChanged(v) {
    if (cur && keyOf(v) === keyOf(cur)) {
      cur = Object.assign({}, cur, v);
      updateUI();
      return;
    }
    commit(v, !cur);
  }
  function applyTab(sec, tab) {
    const T = TABS[sec];
    if (!T) return;
    tab = tab || "overview";
    const b = [...document.querySelectorAll("#" + T.host + " .filter-btn")].find((x) => (x.getAttribute("onclick") || "").includes("'" + tab + "'"));
    if (b) b.click();
    else if (typeof window[T.fn] === "function") window[T.fn](tab);
  }
  function applyFilter(sec, f) {
    const b = [...document.querySelectorAll("#sec-" + sec + " .filter-btn, #sec-" + sec + " .pill")].find((x) => (x.getAttribute("onclick") || "").includes("'" + f + "'"));
    if (b) b.click();
  }
  function openView(v) {
    if (!v || !visible(v.s)) {
      tst("You don't have access to that page", "error");
      return false;
    }
    const admin = v.a ? canSeeAdminSection(v.s) || !canSeeSection(v.s) : !canSeeSection(v.s);
    if (admin) window.showAdminSection(v.s, $("adminBtn-" + v.s) || null);
    else window.showSection(v.s, document.querySelector('.nav-item[data-section="' + v.s + '"]') || null);
    if (v.t) applyTab(v.s, v.t);
    return true;
  }
  function navigate(v, opts) {
    opts = opts || {};
    if (!ready()) return false;
    if (modalActive()) hardClose();
    closeMenu();
    let ok = false;
    restoring++;
    try {
      ok = openView(v);
      if (ok && opts.filter) applyFilter(v.s, opts.filter);
    } finally {
      restoring--;
    }
    if (!ok) return false;
    const nv = { s: v.s, t: normTab(v.t), a: v.a || void 0 };
    if (cur && keyOf(nv) === keyOf(cur) && !opts.replace) {
      updateUI();
      return true;
    }
    commit(nv, !!opts.replace || !cur);
    return true;
  }
  const go = (sec, o) => navigate({ s: sec, t: o && o.tab, a: o && o.admin }, o);
  function back() {
    if (!ready()) return;
    if (modalActive()) return modalBack();
    if (idx > 0) history.back();
    else if (cur && cur.s !== landing()) navigate({ s: landing() });
  }
  function forward() {
    if (idx < maxIdx) history.forward();
  }
  window.addEventListener("popstate", (e) => {
    if (trapIgnore) {
      trapIgnore--;
      if (!trapIgnore && afterTrap) {
        const f = afterTrap;
        afterTrap = null;
        f();
      }
      return;
    }
    if (!ready()) return;
    const st = e.state && e.state.bcd ? e.state : null;
    if (modalActive()) {
      if (st && st.i < idx) {
        trapIgnore++;
        afterTrap = modalBack;
        history.forward();
        setTimeout(() => {
          if (afterTrap) {
            const f = afterTrap;
            afterTrap = null;
            trapIgnore = 0;
            f();
          }
        }, 600);
        return;
      }
      hardClose();
    }
    closeMenu();
    if (!st) {
      const r = parseHash();
      if (r && r.e) {
        openRoute(r);
        return;
      }
      if (r && r.s) navigate(r, { replace: false });
      return;
    }
    restoring++;
    let ok = false;
    try {
      if (!cur || keyOf(st.v) !== keyOf(cur)) ok = openView(st.v);
      else ok = true;
    } finally {
      restoring--;
    }
    if (!ok) {
      restoring++;
      try {
        openView({ s: landing() });
      } finally {
        restoring--;
      }
    }
    idx = st.i;
    cur = ok ? st.v : { s: landing() };
    trail[idx] = labelFor(cur);
    updateUI();
  });
  let recent = [];
  const rKey = () => "gargo_nav_recent_" + (window.state && state.currentUser && state.currentUser.id || "anon");
  function loadRecent() {
    try {
      recent = JSON.parse(localStorage.getItem(rKey()) || "[]") || [];
    } catch (e) {
      recent = [];
    }
  }
  function remember(it) {
    if (!ready()) return;
    if (!recent.length) loadRecent();
    const k = it.t === "v" ? "v:" + it.s + "/" + (it.tab || "") : "e:" + it.k + "/" + it.id;
    recent = recent.filter((x) => (x.t === "v" ? "v:" + x.s + "/" + (x.tab || "") : "e:" + x.k + "/" + x.id) !== k);
    it.ts = Date.now();
    recent.unshift(it);
    recent = recent.slice(0, 14);
    try {
      localStorage.setItem(rKey(), JSON.stringify(recent));
    } catch (e) {
    }
  }
  const runRecent = (it) => it.t === "v" ? navigate({ s: it.s, t: it.tab }) : openEntity(it.k, it.id);
  let menuEl = null, menuAnchor = null;
  function closeMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
      menuAnchor = null;
    }
  }
  function showMenu(anchor, title, items) {
    if (menuEl && menuAnchor === anchor) {
      closeMenu();
      return;
    }
    closeMenu();
    const m = document.createElement("div");
    m.className = "nav-menu nav-ui";
    m.innerHTML = (title ? '<div class="nav-menu-title">' + esc(title) + "</div>" : "") + (items.length ? items.map((it, i) => '<button type="button" class="nav-menu-item" data-i="' + i + '"><span>' + esc(it.label) + "</span>" + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "") + "</button>").join("") : '<div class="nav-menu-empty">Nothing here yet</div>');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = Math.min(r.bottom + 6, window.innerHeight - 80) + "px";
    m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8)) + "px";
    m.addEventListener("click", (e) => {
      const b = e.target.closest(".nav-menu-item");
      if (!b) return;
      const it = items[+b.dataset.i];
      closeMenu();
      if (it && it.run) it.run();
    });
    menuEl = m;
    menuAnchor = anchor;
  }
  document.addEventListener("mousedown", (e) => {
    if (menuEl && !menuEl.contains(e.target) && !(menuAnchor && menuAnchor.contains(e.target))) closeMenu();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  function copyLink(url) {
    const full = url || location.origin + location.pathname + location.search + location.hash;
    const done = () => tst("Link copied", "success");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(done, () => fallbackCopy(full, done));
    else fallbackCopy(full, done);
  }
  function fallbackCopy(t, done) {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {
    }
    ta.remove();
  }
  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/></svg>',
    sep: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"><polyline points="9 18 15 12 9 6"/></svg>'
  };
  function buildTopbar() {
    if ($("navBack")) return;
    const left = document.querySelector("#sectionTopbar .section-topbar-left");
    if (!left) return;
    const ctl = document.createElement("div");
    ctl.className = "nav-ctl nav-ui";
    ctl.innerHTML = '<button type="button" class="nav-btn nav-back" id="navBack" aria-label="Back">' + ICON.back + '<span class="nav-back-k">Back</span><span class="nav-back-to"></span></button><button type="button" class="nav-btn" id="navFwd" aria-label="Forward">' + ICON.fwd + '</button><button type="button" class="nav-btn" id="navRecent" aria-label="Recent pages and items" title="Recent pages and items">' + ICON.clock + '</button><button type="button" class="nav-btn" id="navCopy" aria-label="Copy link to this page" title="Copy link to this page">' + ICON.link + "</button>";
    const ham = left.querySelector(".hamburger");
    left.insertBefore(ctl, ham ? ham.nextSibling : left.firstChild);
    $("navBack").addEventListener("click", back);
    $("navFwd").addEventListener("click", forward);
    $("navRecent").addEventListener("click", (e) => showMenu(e.currentTarget, "Recent", recentItems()));
    $("navCopy").addEventListener("click", () => copyLink());
    const area = $("topbarArea"), title = $("topbarTitle");
    if (area) {
      area.classList.add("nav-crumb-link");
      area.setAttribute("role", "button");
      area.tabIndex = 0;
      area.title = "Pages in this area";
      const open = (e) => showMenu(area, area.textContent, areaItems(area.textContent));
      area.addEventListener("click", open);
      area.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    }
    if (title && !$("navTabCrumb")) {
      const sep = document.createElement("span");
      sep.id = "navTabSep";
      sep.className = "nav-tabsep";
      sep.innerHTML = ICON.sep;
      sep.style.display = "none";
      const tab = document.createElement("span");
      tab.id = "navTabCrumb";
      tab.className = "breadcrumb-title";
      tab.style.display = "none";
      title.insertAdjacentElement("afterend", sep);
      sep.insertAdjacentElement("afterend", tab);
    }
    updateUI();
  }
  function areaItems(area) {
    const own = window.NX && NX.pagesOfLabel ? NX.pagesOfLabel(area) : null;
    return (own || Object.keys(SECTION_META).filter((s) => SECTION_META[s][0] === area)).filter(visible).map((s) => ({ label: SECTION_META[s][1], sub: cur && cur.s === s ? "You are here" : "", run: () => navigate({ s }) }));
  }
  function recentItems() {
    if (!recent.length) loadRecent();
    const items = recent.slice(0, 12).map((it) => ({ label: it.label, sub: it.t === "e" ? KIND_LABEL[it.k] : "Page", run: () => runRecent(it) }));
    items.push({ label: "Copy link to this page", sub: "", run: () => copyLink() });
    return items;
  }
  function updateUI() {
    const b = $("navBack"), f = $("navFwd");
    if (!b || !f) return;
    const home = landing(), away = !!cur && cur.s !== home;
    b.disabled = !(idx > 0 || away);
    b.title = idx > 0 ? "Back to " + (trail[idx - 1] || "the previous page") + "  (Alt+\u2190)" : away ? "Back to " + titleOf(home) : "Nothing to go back to";
    const bt = b.querySelector(".nav-back-to"), to = idx > 0 ? trail[idx - 1] || "" : away ? titleOf(home) : "";
    if (bt) {
      bt.textContent = to;
      bt.style.display = to ? "" : "none";
    }
    f.disabled = !(idx < maxIdx);
    f.title = idx < maxIdx ? "Forward to " + (trail[idx + 1] || "the next page") + "  (Alt+\u2192)" : "Nothing to go forward to";
    const tc = $("navTabCrumb"), ts = $("navTabSep"), show = !!(cur && cur.t);
    if (tc && ts) {
      tc.style.display = show ? "" : "none";
      ts.style.display = show ? "" : "none";
      if (show) tc.textContent = tabLabel(cur.s, cur.t);
    }
  }
  const RELATED = {
    dashboard: ["depops", "inward", "interchange", "trips", "trucks", "finance"],
    trucks: ["drivers", "trips", "maintenance", "fuel", "livetracking"],
    drivers: ["trucks", "trips", "dispatch", "people"],
    trips: ["dispatch", "trucks", "drivers", "invoicing", "livetracking"],
    dispatch: ["trips", "trucks", "drivers", "inward", "shippinglines"],
    inward: ["interchange", "depops", "allocation", "shutout", "shippinglines", "depotreport"],
    maintenance: ["trucks", "workshop", "fuel", "requisitions"],
    fuel: ["trucks", "requisitions", "maintenance", "finance"],
    shutout: ["interchange", "inward", "shippinglines"],
    interchange: ["inward", "depops", "shutout", "allocation", "depotreport", "shippinglines", "invoicing"],
    prestaking: ["shippinglines", "interchange", "depops", "allocation"],
    depotreport: ["interchange", "inward", "depops", "reports", "invoicing"],
    shippinglines: ["interchange", "invoicing", "allocation", "prestaking", "shutout"],
    requisitions: ["approvals", "finance", "fuel", "workshop"],
    workshop: ["maintenance", "trucks", "requisitions", "finance"],
    invoicing: ["finance", "trips", "shippinglines", "reports"],
    allocation: ["depops", "inward", "interchange", "shippinglines", "prestaking"],
    workanalysis: ["reports", "trips", "drivers", "trucks"],
    reports: ["tripreports", "workanalysis", "depotreport", "invoicing", "finance"],
    tripreports: ["trips", "reports", "drivers", "trucks"],
    livetracking: ["trucks", "trips", "drivers"],
    finance: ["approvals", "invoicing", "requisitions", "hr"],
    approvals: ["finance", "requisitions", "hr"],
    hr: ["people", "finance", "drivers"],
    people: ["hr", "drivers", "usermgmt"],
    usermgmt: ["people", "settings", "hr"],
    settings: ["usermgmt", "reports"],
    publicbookings: ["depops", "inward", "invoicing", "shippinglines"],
    depops: ["inward", "interchange", "allocation", "publicbookings", "depotreport", "shutout", "prestaking"]
  };
  function decorateSection(sec) {
    const el = $("sec-" + sec);
    if (!el) return;
    let bar = [...el.children].find((c) => c.classList && c.classList.contains("nav-related-bar"));
    const items = (RELATED[sec] || []).filter((s) => s !== sec && visible(s));
    if (!items.length) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "nav-related-bar nav-ui";
      el.insertBefore(bar, el.firstChild);
    }
    bar.innerHTML = '<span class="nav-rel-label">Related pages</span>' + items.map((s) => '<a class="nav-chip" href="#/' + s + '" data-go="' + s + '">' + esc(titleOf(s)) + "</a>").join("");
  }
  let chain = [];
  let entering = null;
  const origOpenModal = window.openModal, origCloseModal = window.closeModal;
  const nameOf = (k, id) => {
    const d = DB();
    try {
      if (k === "truck") {
        const t = (d.trucks || []).find((x) => x.id === id);
        return t ? t.reg : id;
      }
      if (k === "driver") return driverName(id);
      if (k === "trip") {
        const t = (d.trips || []).find((x) => x.id === id);
        return t ? t.container || id : id;
      }
      if (k === "invoice") {
        const t = (d.invoices || []).find((x) => x.id === id);
        return t ? t.ref : id;
      }
      if (k === "line") {
        const l = (d.shippingLines || []).find((x) => x.id === id);
        return l ? l.code : id;
      }
    } catch (e) {
    }
    return id;
  };
  const entLabel = (k, id) => KIND_LABEL[k] + " " + nameOf(k, id);
  function hardClose() {
    if (origCloseModal && modalEl()) origCloseModal({ target: modalEl() });
  }
  function modalBack() {
    if (chain.length > 1) {
      const prev = chain[chain.length - 2];
      chain.length -= 2;
      openEntity(prev.k, prev.id);
    } else hardClose();
  }
  function modalTo(level) {
    const t = chain[level];
    if (!t) return;
    chain.length = level;
    openEntity(t.k, t.id);
  }
  function ensureModalButtons() {
    const hdr = document.querySelector("#modalOverlay .modal-hdr");
    if (!hdr) return;
    if (!$("navModalBack")) {
      const b = document.createElement("button");
      b.type = "button";
      b.id = "navModalBack";
      b.className = "nav-btn nav-modal-btn nav-ui";
      b.innerHTML = ICON.back;
      b.setAttribute("aria-label", "Back");
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        modalBack();
      });
      hdr.insertBefore(b, hdr.firstChild);
      const l = document.createElement("button");
      l.type = "button";
      l.id = "navModalLink";
      l.className = "nav-btn nav-modal-btn nav-ui";
      l.innerHTML = ICON.link;
      l.title = "Copy link to this record";
      l.setAttribute("aria-label", "Copy link to this record");
      l.addEventListener("click", (e) => {
        e.stopPropagation();
        const t = chain[chain.length - 1];
        if (t) copyLink(location.origin + entityUrl(t.k, t.id));
      });
      const x = hdr.querySelector(".modal-close");
      hdr.insertBefore(l, x || null);
    }
  }
  function decorateModal() {
    ensureModalButtons();
    const back2 = $("navModalBack"), link = $("navModalLink"), body = $("modalBody");
    const top = chain[chain.length - 1];
    if (back2) {
      back2.style.display = chain.length > 1 ? "" : "none";
      back2.title = chain.length > 1 ? "Back to " + chain[chain.length - 2].label : "";
    }
    if (link) link.style.display = top ? "" : "none";
    if (!body) return;
    if (top) {
      try {
        history.replaceState(history.state, "", entityUrl(top.k, top.id));
      } catch (e) {
      }
      let html = "";
      if (chain.length > 1) html += '<div class="nav-trail nav-ui">' + chain.map((c, i) => i === chain.length - 1 ? "<span>" + esc(c.label) + "</span>" : '<a href="#" data-lvl="' + i + '">' + esc(c.label) + "</a>").join("<i>\u203A</i>") + "</div>";
      body.insertAdjacentHTML("afterbegin", html);
      if (!isDrv()) {
        const rel = relatedHtml(top.k, top.id);
        if (rel) body.insertAdjacentHTML("beforeend", '<div class="nav-related nav-ui"><div class="nav-rel-head">Related</div>' + rel + "</div>");
      }
    }
  }
  if (typeof origOpenModal === "function") {
    window.openModal = function() {
      const r = origOpenModal.apply(this, arguments);
      try {
        if (entering) {
          const e = entering, i = chain.findIndex((c) => c.k === e.k && c.id === e.id);
          if (i >= 0) chain.length = i;
          chain.push({ k: e.k, id: e.id, label: entLabel(e.k, e.id) });
          remember({ t: "e", k: e.k, id: e.id, label: entLabel(e.k, e.id) });
        } else chain = [];
        decorateModal();
      } catch (err) {
        console.warn("nav: modal decoration failed", err);
      }
      return r;
    };
  }
  function onModalClosed() {
    chain = [];
    const b = $("navModalBack"), l = $("navModalLink");
    if (b) b.style.display = "none";
    if (l) l.style.display = "none";
    if (cur) {
      try {
        history.replaceState(history.state, "", urlFor(cur));
      } catch (e) {
      }
    }
  }
  function watchModal() {
    const el = modalEl();
    if (!el || el._navWatch) return;
    el._navWatch = true;
    new MutationObserver(() => {
      if (!modalActive()) onModalClosed();
    }).observe(el, { attributes: true, attributeFilter: ["class"] });
  }
  function wrapOpeners() {
    Object.keys(OPENER).forEach((kind) => {
      const name = OPENER[kind], orig = window[name];
      if (typeof orig !== "function" || orig._navWrapped) return;
      const w = function(id) {
        const tok = { k: kind, id: kind === "container" ? norm(id) : id };
        entering = tok;
        let r;
        try {
          r = orig.apply(this, arguments);
        } catch (e) {
          entering = null;
          throw e;
        }
        if (r && typeof r.then === "function") r.then(() => {
          if (entering === tok) entering = null;
        }, () => {
          if (entering === tok) entering = null;
        });
        else entering = null;
        return r;
      };
      w._navWrapped = true;
      window[name] = w;
    });
  }
  function openEntity(kind, id) {
    if (!ready()) return;
    if (!can(kind)) {
      tst("You don't have access to that record", "error");
      return;
    }
    const s = $("searchResults");
    if (s) s.style.display = "none";
    closeMenu();
    if (kind === "line") return openLine(id);
    const fn = window[OPENER[kind]];
    if (typeof fn === "function") fn(id);
  }
  const hrefFor = (k, id) => entityHash(k, id);
  function chip(k, id, label, title) {
    if (!can(k)) return '<span class="nav-chip nav-chip-off">' + esc(label) + "</span>";
    return '<a class="xl nav-chip" href="' + hrefFor(k, id) + '" data-k="' + esc(k) + '" data-id="' + esc(id) + '"' + (title ? ' title="' + esc(title) + '"' : "") + ">" + esc(label) + "</a>";
  }
  const secChip = (sec, label) => visible(sec) ? '<a class="nav-chip nav-sec" href="#/' + sec + '" data-go="' + sec + '">' + esc(label) + " \u2192</a>" : "";
  function row(label, chips, more) {
    const c = chips.filter(Boolean).join("");
    return c ? '<div class="nav-rel-row"><span class="nav-rel-k">' + esc(label) + '</span><span class="nav-rel-v">' + c + (more > 0 ? '<span class="nav-more">+' + more + " more</span>" : "") + "</span></div>" : "";
  }
  const cap = (arr, n) => ({ list: arr.slice(0, n), more: Math.max(0, arr.length - n) });
  const truckReg = (id) => {
    const t = (DB().trucks || []).find((x) => x.id === id);
    return t ? t.reg : id;
  };
  const lineCode = (id) => {
    const l = (DB().shippingLines || []).find((x) => x.id === id);
    return l ? l.code : id;
  };
  const tripsOfContainer = (c) => (DB().trips || []).filter((t) => norm(t.container) === norm(c));
  const invoicesForTrips = (ids) => (DB().invoices || []).filter((i) => (i.trips || []).some((t) => ids.includes(t)));
  function relatedHtml(kind, id) {
    const d = DB();
    let h = "";
    const trips = d.trips || [], inv = d.invoices || [];
    if (kind === "truck") {
      const ts = trips.filter((t) => t.truckId === id).sort(byDateDesc("startTime"));
      const dr = cap(uniq(ts.map((t) => t.driverId)), 5), tc = cap(ts, 6), cn = cap(uniq(ts.map((t) => norm(t.container))), 6);
      const mOpen = (d.maintenance || []).filter((m) => m.truckId === id && m.status !== "resolved").length;
      const fuel = (d.fuel || []).filter((f) => (f.truckId || f.truck) === id).length;
      h = row("Drivers", dr.list.map((x) => chip("driver", x, driverName(x))), dr.more) + row("Trips", tc.list.map((t) => chip("trip", t.id, t.container || t.id, (t.origin || "") + " \u2192 " + (t.dest || ""))), tc.more) + row("Containers", cn.list.map((c) => chip("container", c, c)), cn.more) + row("Records", [secChip("maintenance", "Maintenance (" + mOpen + " open)"), secChip("fuel", "Fuel logs (" + fuel + ")"), secChip("livetracking", "Live tracking")]);
    } else if (kind === "driver") {
      const ts = trips.filter((t) => t.driverId === id).sort(byDateDesc("startTime"));
      const tr = cap(uniq(ts.map((t) => t.truckId)), 5), tc = cap(ts, 6), cn = cap(uniq(ts.map((t) => norm(t.container))), 6);
      h = row("Trucks", tr.list.map((x) => chip("truck", x, truckReg(x))), tr.more) + row("Trips", tc.list.map((t) => chip("trip", t.id, t.container || t.id, (t.origin || "") + " \u2192 " + (t.dest || ""))), tc.more) + row("Containers", cn.list.map((c) => chip("container", c, c)), cn.more) + row("Pages", [secChip("dispatch", "Dispatch console"), secChip("people", "People registry")]);
    } else if (kind === "trip") {
      const t = trips.find((x) => x.id === id);
      if (!t) return "";
      const iv = cap(invoicesForTrips([id]), 4);
      h = row("Truck", t.truckId ? [chip("truck", t.truckId, truckReg(t.truckId))] : []) + row("Driver", t.driverId ? [chip("driver", t.driverId, driverName(t.driverId))] : []) + row("Container", t.container ? [chip("container", norm(t.container), norm(t.container))] : []) + row("Shipping line", t.shippingLine ? [chip("line", t.shippingLine, lineCode(t.shippingLine))] : []) + row("Invoices", iv.list.map((i) => chip("invoice", i.id, i.ref)), iv.more) + row("Pages", [secChip("livetracking", "Live tracking"), secChip("dispatch", "Dispatch console")]);
    } else if (kind === "container") {
      const ts = tripsOfContainer(id), ic = (d.interchange || []).filter((i) => norm(i.container) === id), so = (d.shutouts || []).filter((s) => norm(s.container) === id);
      const tr = cap(uniq(ts.map((t) => t.truckId)), 5), dr = cap(uniq(ts.map((t) => t.driverId)), 5);
      const lines = cap(uniq([...ts.map((t) => t.shippingLine), ...ic.map((i) => i.line)]), 4);
      const ids = ts.map((t) => t.id);
      const iv = cap((d.invoices || []).filter((i) => (i.trips || []).some((t) => ids.includes(t)) || (i.lineItems || []).some((l) => norm(l.container) === id)), 4);
      h = row("Shipping line", lines.list.map((x) => chip("line", x, lineCode(x))), lines.more) + row("Trucks", tr.list.map((x) => chip("truck", x, truckReg(x))), tr.more) + row("Drivers", dr.list.map((x) => chip("driver", x, driverName(x))), dr.more) + row("Invoices", iv.list.map((i) => chip("invoice", i.id, i.ref)), iv.more) + row("Records", [ic.length ? secChip("interchange", "Interchange (" + ic.length + ")") : "", so.length ? secChip("shutout", "Shutouts (" + so.length + ")") : "", secChip("inward", "Inward entry"), secChip("depops", "DepOps")]);
    } else if (kind === "invoice") {
      const iv = inv.find((x) => x.id === id);
      if (!iv) return "";
      const tc = cap((iv.trips || []).map((t) => trips.find((x) => x.id === t)).filter(Boolean), 6);
      const cn = cap(uniq([...(iv.lineItems || []).map((l) => norm(l.container)), ...tc.list.map((t) => norm(t.container))]), 8);
      const ln = (d.shippingLines || []).find((l) => l.name && String(iv.client || "").toLowerCase().includes(String(l.name).toLowerCase()));
      h = row("Trips", tc.list.map((t) => chip("trip", t.id, t.container || t.id)), tc.more) + row("Containers", cn.list.map((c) => chip("container", c, c)), cn.more) + row("Shipping line", ln ? [chip("line", ln.id, ln.code)] : []) + row("Pages", [secChip("finance", "Finance hub"), secChip("invoicing", "All invoices")]);
    }
    return h;
  }
  function openLine(id) {
    const d = DB(), l = (d.shippingLines || []).find((x) => x.id === id);
    if (!l) {
      tst("Shipping line not found", "error");
      return;
    }
    let stock = [];
    try {
      const ix = icOutIndex();
      stock = (d.interchange || []).filter((i) => i.line === id && icInYard(i, ix));
    } catch (e) {
      stock = [];
    }
    const trips = (d.trips || []).filter((t) => t.shippingLine === id), so = (d.shutouts || []).filter((s) => s.line === id && !["resolved", "closed", "cleared"].includes(String(s.status || "").toLowerCase()));
    const invs = (d.invoices || []).filter((i) => (i.trips || []).some((t) => trips.some((x) => x.id === t)) || l.name && String(i.client || "").toLowerCase().includes(String(l.name).toLowerCase()));
    const st = cap(uniq(stock.map((i) => norm(i.container))), 12), tc = cap(trips.sort(byDateDesc("startTime")), 6), iv = cap(invs, 6);
    const stat = (v, k) => '<div class="nav-stat"><b>' + v + "</b><span>" + k + "</span></div>";
    const manage = window.LINE_PORTAL && ["admin", "ops"].includes(state.profile && state.profile.role) ? '<a class="nav-chip nav-sec" href="#" data-act="portal" data-id="' + esc(id) + '">Portal link \u2192</a>' : "";
    entering = { k: "line", id };
    try {
      window.openModal(
        "Shipping line \u2014 " + l.code,
        '<div style="margin-bottom:12px"><div style="font-size:16px;font-weight:700;color:var(--text)">' + esc(l.name || l.code) + "</div>" + (l.contact ? '<div style="font-size:12px;color:var(--text-3)">' + esc(l.contact) + "</div>" : "") + '</div><div class="nav-stats">' + stat(stock.length, "In yard") + stat(trips.length, "Trips") + stat(so.length, "Open shutouts") + stat(invs.length, "Invoices") + '</div><div class="nav-related nav-ui" style="margin-top:12px"><div class="nav-rel-head">Linked records</div>' + row("In yard", st.list.map((c) => chip("container", c, c)), st.more) + row("Trips", tc.list.map((t) => chip("trip", t.id, t.container || t.id)), tc.more) + row("Invoices", iv.list.map((i) => chip("invoice", i.id, i.ref)), iv.more) + row("Pages", [secChip("shippinglines", "All shipping lines"), secChip("interchange", "Interchange"), secChip("allocation", "Allocation"), secChip("prestaking", "Prestaking"), manage]) + "</div>"
      );
    } finally {
      entering = null;
    }
  }
  let idxSig = "", I = null;
  function buildIndex() {
    const d = DB();
    const sig = ["trucks", "drivers", "invoices", "trips", "shippingLines", "interchange"].map((k) => (d[k] || []).length).join("|") + "|" + (d.trucks && d.trucks[0] ? d.trucks[0].reg : "");
    if (I && sig === idxSig) return I;
    idxSig = sig;
    const cont = /* @__PURE__ */ new Map(), ref = /* @__PURE__ */ new Map(), alt = /* @__PURE__ */ new Map();
    const addCont = (c) => {
      const k = flat(c);
      if (k.length >= 8 && !cont.has(k)) cont.set(k, norm(c));
    };
    (d.trips || []).forEach((t) => {
      addCont(t.container);
      if (t.ref && String(t.ref).length >= 5) ref.set(norm(t.ref), { k: "trip", id: t.id });
    });
    (d.interchange || []).forEach((i) => {
      addCont(i.container);
      if (i.eirNumber && String(i.eirNumber).length >= 5 && !ref.has(norm(i.eirNumber))) ref.set(norm(i.eirNumber), { k: "container", id: norm(i.container) });
    });
    (d.shutouts || []).forEach((s) => addCont(s.container));
    (d.invoices || []).forEach((i) => {
      if (i.ref) ref.set(norm(i.ref), { k: "invoice", id: i.id });
    });
    const add = (txt, k, id, minLen) => {
      const t = String(txt || "").trim().replace(/\s+/g, " ");
      if (t.length >= minLen) alt.set(t.toLowerCase().replace(/\s+/g, ""), { k, id, src: t });
    };
    (d.trucks || []).forEach((t) => add(t.reg, "truck", t.id, 5));
    (d.drivers || []).forEach((x) => {
      if (/\s/.test(String(x.name || "").trim())) add(x.name, "driver", x.id, 5);
    });
    (d.shippingLines || []).forEach((l) => {
      add(l.code + " \u2014 " + l.name, "line", l.id, 6);
      add(l.name, "line", l.id, 6);
    });
    const srcs = [...alt.values()].map((v) => v.src).sort((a, b) => b.length - a.length);
    const altRe = srcs.length ? new RegExp("(^|[^A-Za-z0-9])(" + srcs.map((s) => reEsc(s).replace(/ /g, "\\s+")).join("|") + ")(?![A-Za-z0-9])", "gi") : null;
    I = { cont, ref, alt, altRe };
    return I;
  }
  function findMatches(text) {
    const ix = buildIndex(), out = [];
    let m;
    const cre = /(^|[^A-Za-z0-9])([A-Za-z]{4}[ -]?\d{6}[ -]?\d)(?![A-Za-z0-9])/g;
    while (m = cre.exec(text)) {
      const real = ix.cont.get(flat(m[2]));
      if (real && can("container")) out.push({ s: m.index + m[1].length, e: m.index + m[1].length + m[2].length, k: "container", id: real });
    }
    const tre = /[A-Za-z0-9][A-Za-z0-9\/_-]{4,}/g;
    while (m = tre.exec(text)) {
      const r = ix.ref.get(norm(m[0]));
      if (r && can(r.k)) out.push({ s: m.index, e: m.index + m[0].length, k: r.k, id: r.id });
    }
    if (ix.altRe) {
      ix.altRe.lastIndex = 0;
      while (m = ix.altRe.exec(text)) {
        const hit = ix.alt.get(m[2].toLowerCase().replace(/\s+/g, ""));
        if (hit && can(hit.k)) out.push({ s: m.index + m[1].length, e: m.index + m[1].length + m[2].length, k: hit.k, id: hit.id });
      }
    }
    if (!out.length) return out;
    out.sort((a, b) => a.s - b.s || b.e - b.s - (a.e - a.s));
    const res = [];
    let end = -1;
    out.forEach((x) => {
      if (x.s >= end) {
        res.push(x);
        end = x.e;
      }
    });
    return res;
  }
  const SKIP = 'a,button,input,select,textarea,option,script,style,svg,canvas,code,pre,.xl,.nav-ui,.no-xlink,.modal-hdr,.search-results-panel,#toastStack,th,.section-topbar,.sidebar,nav,[contenteditable="true"]';
  const inScope = (n) => {
    const el = n.nodeType === 1 ? n : n.parentElement;
    return !!(el && el.closest && el.closest("#shell, #modalOverlay") && !el.closest("#driverPortal"));
  };
  function linkifyText(node) {
    const text = node.nodeValue;
    if (!text || text.length < 5) return;
    const ms = findMatches(text);
    if (!ms.length) return;
    const frag = document.createDocumentFragment();
    let pos = 0;
    ms.forEach((x) => {
      if (x.s > pos) frag.appendChild(document.createTextNode(text.slice(pos, x.s)));
      const a = document.createElement("a");
      a.className = "xl";
      a.href = hrefFor(x.k, x.id);
      a.dataset.k = x.k;
      a.dataset.id = x.id;
      a.title = "Open " + KIND_LABEL[x.k].toLowerCase() + " " + text.slice(x.s, x.e);
      a.textContent = text.slice(x.s, x.e);
      frag.appendChild(a);
      pos = x.e;
    });
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  }
  const KPI = {
    dash: {
      "Fleet Size": ["trucks"],
      "Available": ["trucks", { filter: "available" }],
      "On Trip": ["trucks", { filter: "on_trip" }],
      "Breakdown": ["trucks", { filter: "breakdown" }],
      "Active Trips": ["trips", { filter: "active" }],
      "Drivers": ["drivers"],
      "Containers in Yard": ["inward"],
      "Gate-In Today": ["interchange"],
      "Gate-Out Today": ["interchange"],
      "Average Dwell": ["depotreport"],
      "Aged": ["inward"],
      "Awaiting Survey": ["inward"],
      "Open Shutouts": ["shutout"]
    },
    fin: { "Receipts": ["finance", { tab: "receipts" }], "Expenses": ["finance", { tab: "expenses" }], "Bills Payable": ["finance", { tab: "bills" }], "Overdue Bills": ["finance", { tab: "bills" }] }
  };
  function decorateKpi(card) {
    if (card.dataset.nav) return;
    const ctx = card.closest("#sec-dashboard, #fleetKpiRow, #kpiRow") ? "dash" : card.closest("#financeKpis") ? "fin" : null;
    if (!ctx) return;
    const lab = ((card.querySelector(".kpi-label") || {}).textContent || "").trim();
    const key = Object.keys(KPI[ctx]).find((k) => lab.startsWith(k));
    if (!key) return;
    const t = KPI[ctx][key];
    if (!visible(t[0])) return;
    card.dataset.nav = JSON.stringify(t);
    card.classList.add("nav-kpi");
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.title = "Open " + titleOf(t[0]);
  }
  let pending = /* @__PURE__ */ new Set(), queued = false, obs = null;
  function schedule(root) {
    pending.add(root);
    if (!queued) {
      queued = true;
      (window.requestAnimationFrame || setTimeout)(pump);
    }
  }
  function pump() {
    queued = false;
    if (!ready() || isDrv()) {
      pending.clear();
      return;
    }
    const t0 = performance.now();
    let leftover = false;
    if (obs) obs.disconnect();
    try {
      for (const root of [...pending]) {
        pending.delete(root);
        if (!root.isConnected || !inScope(root)) continue;
        if (root.nodeType === 3) {
          if (!root.parentElement.closest(SKIP)) linkifyText(root);
          continue;
        }
        if (root.closest && root.closest(SKIP) && root !== document.body) continue;
        (root.matches && root.matches(".kpi-card") ? [root] : [...root.querySelectorAll(".kpi-card")]).forEach(decorateKpi);
        const w = document.createTreeWalker(root, 5, { acceptNode: (n2) => n2.nodeType === 1 ? n2.matches(SKIP) ? 2 : 3 : n2.nodeValue.length >= 5 ? 1 : 3 });
        const nodes = [];
        let n;
        while (n = w.nextNode()) nodes.push(n);
        for (let i = 0; i < nodes.length; i++) {
          if (performance.now() - t0 > 10) {
            leftover = true;
            nodes.slice(i).forEach((x) => pending.add(x));
            break;
          }
          linkifyText(nodes[i]);
        }
        if (leftover) break;
      }
    } catch (e) {
      console.warn("nav: link pass failed", e);
    }
    start();
    if (leftover || pending.size) {
      queued = true;
      (window.requestAnimationFrame || setTimeout)(pump);
    }
  }
  function start() {
    if (obs) obs.observe(document.body, { childList: true, subtree: true });
  }
  function watchPage() {
    if (obs) return;
    obs = new MutationObserver((recs) => {
      for (const r of recs) r.addedNodes.forEach((n) => {
        if (n.nodeType === 1 || n.nodeType === 3) schedule(n);
      });
    });
    start();
    const sh = $("shell");
    if (sh) schedule(sh);
  }
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    const a = t.closest("a.xl");
    if (a) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      e.stopPropagation();
      openEntity(a.dataset.k, a.dataset.id);
      return;
    }
    const g = t.closest("[data-go]");
    if (g) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      navigate({ s: g.dataset.go });
      return;
    }
    const lv = t.closest(".nav-trail a[data-lvl]");
    if (lv) {
      e.preventDefault();
      e.stopPropagation();
      modalTo(+lv.dataset.lvl);
      return;
    }
    const act = t.closest('[data-act="portal"]');
    if (act) {
      e.preventDefault();
      e.stopPropagation();
      hardClose();
      if (window.LINE_PORTAL) window.LINE_PORTAL.open(act.dataset.id);
      return;
    }
    const k = t.closest(".nav-kpi");
    if (k) {
      e.preventDefault();
      e.stopPropagation();
      kpiGo(k);
    }
  }, true);
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target && e.target.classList && e.target.classList.contains("nav-kpi")) {
      e.preventDefault();
      kpiGo(e.target);
      return;
    }
    if (e.altKey && e.key === "Home" && ready()) {
      e.preventDefault();
      navigate({ s: landing() });
    }
  });
  function kpiGo(card) {
    try {
      const t = JSON.parse(card.dataset.nav);
      go(t[0], t[1] || {});
    } catch (e) {
    }
  }
  function wrapSearch() {
    const orig = window.handleSearch;
    if (typeof orig !== "function" || orig._nav) return;
    const w = function(q) {
      orig.apply(this, arguments);
      try {
        const panel = $("searchResults"), s = String(q || "").toLowerCase().trim();
        if (!panel || s.length < 2) return;
        const hits = Object.keys(SECTION_META).filter((k) => visible(k) && (SECTION_META[k][1].toLowerCase().includes(s) || SECTION_META[k][0].toLowerCase() === s)).slice(0, 4);
        if (!hits.length) return;
        const old = (window._searchResults || []).slice(), off = hits.length;
        const head = hits.map((k, i) => '<div class="search-result-item" onclick="runSearchResult(' + i + ')"><span class="search-result-type">Page</span> ' + esc(SECTION_META[k][1]) + '<span class="search-result-sub">' + esc(SECTION_META[k][0]) + "</span></div>").join("");
        const rest = panel.innerHTML.replace(/runSearchResult\((\d+)\)/g, (m, n) => "runSearchResult(" + (+n + off) + ")").replace(/<div class="search-result-item search-result-empty">.*?<\/div>/, "");
        panel.innerHTML = head + rest;
        window._searchResults = hits.map((k) => () => navigate({ s: k })).concat(old);
        panel.style.display = "block";
      } catch (e) {
        console.warn("nav: search wrap failed", e);
      }
    };
    w._nav = true;
    window.handleSearch = w;
    const input = $("globalSearch");
    if (input && !input._navFocus) {
      input._navFocus = true;
      input.addEventListener("focus", () => {
        if (input.value.trim()) return;
        if (!recent.length) loadRecent();
        if (!recent.length) return;
        const panel = $("searchResults");
        if (!panel) return;
        const items = recent.slice(0, 8);
        panel.innerHTML = items.map((it, i) => '<div class="search-result-item" onclick="runSearchResult(' + i + ')"><span class="search-result-type">Recent</span> ' + esc(it.label) + "</div>").join("");
        window._searchResults = items.map((it) => () => runRecent(it));
        panel.style.display = "block";
      });
    }
  }
  function wrapShow(name, admin) {
    const orig = window[name];
    if (typeof orig !== "function" || orig._nav) return;
    const w = function(sec) {
      let r;
      suppress++;
      try {
        r = orig.apply(this, arguments);
      } finally {
        suppress--;
      }
      try {
        const ok = admin ? window.state.currentAdminSection === sec : window.state.currentSection === sec;
        if (ok && ready()) {
          decorateSection(sec);
          if (!restoring) viewChanged({ s: sec, t: tabOf(sec), a: admin || void 0 });
        }
      } catch (e) {
        console.warn("nav: view tracking failed", e);
      }
      return r;
    };
    w._nav = true;
    window[name] = w;
  }
  function wrapTab(sec) {
    const T = TABS[sec], orig = window[T.fn];
    if (typeof orig !== "function" || orig._nav) return;
    const w = function() {
      const r = orig.apply(this, arguments);
      if (!restoring && !suppress && ready() && cur && cur.s === sec) viewChanged({ s: sec, t: tabOf(sec), a: cur.a });
      return r;
    };
    w._nav = true;
    window[T.fn] = w;
  }
  function openRoute(r) {
    if (!r) return;
    if (r.e) {
      const home = KIND_HOME[r.e.k];
      if (home && visible(home)) navigate({ s: home }, { replace: true });
      else if (!cur) navigate({ s: landing() }, { replace: true });
      openEntity(r.e.k, r.e.id);
    } else if (r.s) navigate(r, { replace: true });
  }
  function afterBoot() {
    buildTopbar();
    watchModal();
    wrapSearch();
    loadRecent();
    watchPage();
    if (isDrv()) return;
    const hashRoute = parseHash(bootHash);
    bootHash = "";
    if (hashRoute) openRoute(hashRoute);
    else if (boot && boot.v && keyOf(boot.v) !== keyOf(cur)) navigate(boot.v, { replace: true });
    updateUI();
  }
  function wrapLifecycle() {
    const ob = window.bootShell;
    if (typeof ob === "function" && !ob._nav) {
      const w = function() {
        const r = ob.apply(this, arguments);
        try {
          afterBoot();
        } catch (e) {
          console.warn("nav: boot hook failed", e);
        }
        return r;
      };
      w._nav = true;
      window.bootShell = w;
    }
    const ol = window.performLogout;
    if (typeof ol === "function" && !ol._nav) {
      const w = async function() {
        const r = await ol.apply(this, arguments);
        cur = null;
        chain = [];
        recent = [];
        idx = 0;
        maxIdx = 0;
        trail.length = 0;
        closeMenu();
        try {
          history.replaceState(null, "", location.pathname + location.search);
        } catch (e) {
        }
        return r;
      };
      w._nav = true;
      window.performLogout = w;
    }
  }
  wrapOpeners();
  wrapShow("showSection", false);
  wrapShow("showAdminSection", true);
  wrapTab("finance");
  wrapTab("hr");
  wrapLifecycle();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => {
    watchModal();
  });
  else watchModal();
  const css = document.createElement("style");
  css.id = "navStyles";
  css.textContent = "\n.nav-ctl{display:flex;align-items:center;gap:4px;margin-right:10px}\n.nav-btn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid var(--border,#2b3140);background:transparent;color:var(--text-2,#9aa3b2);border-radius:8px;cursor:pointer;transition:color .15s,border-color .15s,opacity .15s}\n.nav-btn svg{width:15px;height:15px}\n.nav-btn:hover:not(:disabled){color:var(--text,#fff);border-color:var(--gold,#c9a24a)}\n.nav-btn:focus-visible,.nav-crumb-link:focus-visible,.nav-chip:focus-visible,.nav-kpi:focus-visible{outline:2px solid var(--gold,#c9a24a);outline-offset:2px}\n.nav-btn:disabled{opacity:.35;cursor:default}\n.nav-btn.nav-back{width:auto;gap:6px;padding:0 10px;font:600 12px/1 inherit}\n.nav-back .nav-back-to{opacity:.7;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.nav-crumb-link{cursor:pointer;border-bottom:1px dotted currentColor}\n.nav-crumb-link:hover{color:var(--gold,#c9a24a)}\n.nav-tabsep{display:inline-flex;align-items:center}\n.nav-menu{position:fixed;z-index:10050;min-width:230px;max-width:min(360px,92vw);max-height:62vh;overflow:auto;background:var(--surface,#fff);color:var(--text,#111);border:1px solid var(--border,#d7dbe3);border-radius:10px;box-shadow:0 14px 36px rgba(0,0,0,.28);padding:6px}\n.nav-menu-title{padding:6px 10px 4px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3,#8a93a5)}\n.nav-menu-item{display:flex;justify-content:space-between;gap:12px;width:100%;text-align:left;background:none;border:0;border-radius:7px;padding:8px 10px;font:inherit;font-size:12.5px;color:inherit;cursor:pointer}\n.nav-menu-item:hover,.nav-menu-item:focus-visible{background:var(--gold-dim,rgba(201,162,74,.14));outline:none}\n.nav-menu-item small{color:var(--text-3,#8a93a5);font-size:11px;white-space:nowrap}\n.nav-menu-empty{padding:12px;font-size:12px;color:var(--text-3,#8a93a5)}\n.nav-modal-btn{width:28px;height:28px;margin-right:8px;flex:none}\n.modal-hdr .modal-title{flex:1;min-width:0}\n#navModalLink{margin:0 8px 0 0}\n.nav-trail{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 12px;font-size:11.5px;color:var(--text-3,#8a93a5)}\n.nav-trail a{color:var(--text-2,#9aa3b2);text-decoration:none}.nav-trail a:hover{color:var(--gold,#c9a24a);text-decoration:underline}\n.nav-trail i{font-style:normal;opacity:.5}.nav-trail span{color:var(--text,#111);font-weight:600}\n.nav-related{margin-top:16px;padding-top:12px;border-top:1px solid var(--border,#d7dbe3)}\n.nav-rel-head{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3,#8a93a5);margin-bottom:8px}\n.nav-rel-row{display:flex;gap:10px;margin-bottom:6px;align-items:baseline}\n.nav-rel-k{flex:0 0 92px;font-size:11.5px;color:var(--text-3,#8a93a5)}\n.nav-rel-v{flex:1;display:flex;flex-wrap:wrap;gap:6px;align-items:center}\n.nav-more{font-size:11px;color:var(--text-3,#8a93a5)}\n.nav-chip{display:inline-flex;align-items:center;padding:3px 10px;border:1px solid var(--border,#d7dbe3);border-radius:999px;font-size:11.5px;line-height:1.5;color:var(--text-2,#9aa3b2);text-decoration:none;cursor:pointer;transition:color .15s,border-color .15s}\n.nav-chip:hover{color:var(--gold,#c9a24a);border-color:var(--gold,#c9a24a)}\n.nav-chip-off{opacity:.6;cursor:default}.nav-chip-off:hover{color:inherit;border-color:var(--border,#d7dbe3)}\n.nav-sec{border-style:dashed}\n.nav-related-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 14px}\n.nav-rel-label{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3,#8a93a5);margin-right:4px}\n.nav-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}\n.nav-stat{border:1px solid var(--border,#d7dbe3);border-radius:8px;padding:8px 10px;text-align:center}\n.nav-stat b{display:block;font-size:18px;color:var(--text,#111)}.nav-stat span{font-size:11px;color:var(--text-3,#8a93a5)}\na.xl{color:inherit;text-decoration:underline dotted;text-decoration-color:var(--text-3,#8a93a5);text-underline-offset:3px;cursor:pointer}\na.xl:hover{color:var(--gold,#c9a24a);text-decoration-style:solid;text-decoration-color:var(--gold,#c9a24a)}\na.xl.nav-chip{text-decoration:none}\n.nav-kpi{cursor:pointer;transition:transform .12s,box-shadow .12s}.nav-kpi:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.18)}\n@media(max-width:640px){.nav-ctl{margin-right:6px;gap:3px}.nav-btn{width:28px;height:28px}#navCopy{display:none}.nav-rel-k{flex-basis:70px}.nav-stats{grid-template-columns:repeat(2,1fr)}}\n@media print{a.xl{text-decoration:none;color:inherit}.nav-ui{display:none!important}}";
  document.head.appendChild(css);
  window.NAV = {
    go,
    back,
    forward,
    open: openEntity,
    copyLink,
    link: (k, id, label) => chip(k, id, label || nameOf(k, id)),
    recent: () => recent.slice(),
    _debug: () => ({ idx, maxIdx, cur, chain: chain.slice(), trail: trail.slice() })
  };
})();
