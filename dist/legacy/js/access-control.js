"use strict";
(function() {
  const $ = (id) => document.getElementById(id);
  const E = (s) => typeof esc === "function" ? esc(s) : String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  if (typeof ROLE_SIDEBAR === "undefined" || typeof ALL_SIDEBAR_SECTIONS === "undefined" || typeof ROLE_ADMINRAIL === "undefined" || typeof SECTION_META === "undefined")
    return console.error("access-control.js needs admin-ui-shell.js and core-state.js first");
  const ROLES = [
    ["admin", "System Administrator", "Full access to every module, Settings and User Management."],
    ["ops", "Operations Officer", "Fleet, dispatch, depot, maintenance, fuel, workshop and shipping lines."],
    ["dispatch", "Dispatch Controller", "Dispatch console, trips, drivers, trucks and the depot desks."],
    ["clerk", "Clerk", "Day-to-day entry: dispatch, inward, interchange, shutouts and depot reports."],
    ["finance", "Finance Manager", "Finance Hub, Approvals, invoicing, rates and finance reports. Approves payroll."],
    ["hr", "HR Manager", "HR Hub (employees, leave, payroll preparation, compliance) and Approvals."],
    ["viewer", "Read-Only Viewer", "Trucks, drivers, trips and the Data Hub. No editing."],
    ["loading_clerk", "Loading Clerk", "Loading Desk only: completes Part 2 of a loading instruction."],
    ["field_marshal", "Field Marshal", "Loading Desk only: supervises loading and picks containers in the yard."],
    ["security", "Security Officer", "Gate Processes only: verifies loading instructions, records vehicles in and out."],
    ["driver", "Driver", "Driver portal only (needs a driver record linked to the login)."]
  ];
  const ROLE_IDS = ROLES.map((r) => r[0]);
  const roleName = (r) => {
    try {
      return roleLabel(r);
    } catch (e) {
      return r;
    }
  };
  const CORE = { finance: "finance", hr: "hr", security: "gatesecurity", loading_clerk: "loadingdesk", field_marshal: "loadingdesk" };
  const ADMIN_ONLY = ["usermgmt", "settings"];
  ["gatesecurity", "loadingdesk", "repatreserve"].forEach((s) => {
    if (SECTION_META[s] && ALL_SIDEBAR_SECTIONS.indexOf(s) < 0) ALL_SIDEBAR_SECTIONS.push(s);
  });
  const SECTIONS = () => ALL_SIDEBAR_SECTIONS.filter((s) => SECTION_META[s]);
  const ADMIN_RAIL = () => typeof ALL_ADMINRAIL_SECTIONS !== "undefined" ? ALL_ADMINRAIL_SECTIONS : ROLE_ADMINRAIL.admin || [];
  const secLabel = (s) => SECTION_META[s] && SECTION_META[s][1] || s;
  const FIN_BASE = [["overview", "Overview"], ["receipts", "Receipts"], ["bills", "Supplier Bills"], ["expenses", "Expenses"], ["suppliers", "Suppliers"], ["controls", "Controls"]];
  const SUBS = {
    dispatch: { fn: "switchDispatchTab", re: /switchDispatchTab\(\s*'([\w-]+)'/, tabs: () => [["single", "Single Dispatch"], ["bulk", "Bulk Upload"]] },
    inward: { fn: "switchInwardTab", re: /switchInwardTab\(\s*'([\w-]+)'/, tabs: () => [["single", "Single Entry"], ["bulk", "Bulk Upload"], ["reports", "Reports"]] },
    depotreport: { fn: "switchDepotReportTab", re: /switchDepotReportTab\(\s*'([\w-]+)'/, tabs: () => [["inward", "Inward"], ["outward", "Outward"], ["dupes", "Duplicates"]] },
    depops: { fn: "switchDepOpsTab", re: /switchDepOpsTab\(\s*'([\w-]+)'/, tabs: () => [["inbound", "Inbound"], ["outward", "Outward / Repatriation"], ["zones", "Zones"], ["yard", "Yard Map"], ["escalations", "Escalations"], ["surveys", "Surveyed Register"], ["master", "Master List"], ["reports", "Reports"]] },
    hr: { fn: "renderHR", re: /renderHR\(\s*'([\w-]+)'/, first: "overview", tabs: () => typeof HR_TABS !== "undefined" ? HR_TABS.map((t) => [t[0], t[1]]) : [] },
    finance: {
      fn: "renderFinance",
      re: /renderFinance\(\s*'([\w-]+)'/,
      first: "overview",
      tabs: () => {
        const x = window.GARGO_FIN && GARGO_FIN.tabs || {};
        return FIN_BASE.concat(Object.keys(x).map((k) => [k, x[k].label || k]));
      }
    }
  };
  const subTabs = (sec) => SUBS[sec] ? SUBS[sec].tabs() : [];
  const deniedOf = (p) => {
    const a = p && (p.denied_subs || p.deniedSubs);
    return Array.isArray(a) ? a : [];
  };
  function isDenied(sec, sub, prof) {
    const p = prof || state.profile;
    if (!p || p.role === "admin") return false;
    return deniedOf(p).indexOf(sec + ":" + sub) > -1;
  }
  const firstAllowed = (sec) => {
    const t = subTabs(sec).filter((x) => !isDenied(sec, x[0]));
    return t.length ? t[0][0] : null;
  };
  function findBtn(sec, id) {
    const root = $("sec-" + sec), cfg = SUBS[sec];
    if (!root) return void 0;
    return Array.prototype.find.call(root.querySelectorAll("button[onclick]"), (b) => {
      const m = cfg.re.exec(b.getAttribute("onclick") || "");
      return m && m[1] === id;
    });
  }
  function wrapTabFn(sec) {
    const cfg = SUBS[sec], f = window[cfg.fn];
    if (typeof f !== "function" || f._acw) return;
    const w = function(tab) {
      const bad = tab == null ? cfg.first && isDenied(sec, cfg.first) : isDenied(sec, tab);
      if (!bad) return f.apply(this, arguments);
      const alt = firstAllowed(sec);
      if (alt == null) {
        if (typeof toast === "function") toast("You do not have access to any part of this section", "error");
        return;
      }
      return f.call(this, alt, findBtn(sec, alt));
    };
    w._acw = true;
    window[cfg.fn] = w;
  }
  function paintSection(sec) {
    const root = $("sec-" + sec), cfg = SUBS[sec];
    if (!root) return;
    root.querySelectorAll("button[onclick]").forEach((b) => {
      const m = cfg.re.exec(b.getAttribute("onclick") || "");
      if (!m) return;
      if (isDenied(sec, m[1])) {
        b.style.display = "none";
        b.setAttribute("data-ac-hid", "1");
      } else if (b.getAttribute("data-ac-hid")) {
        b.style.display = "";
        b.removeAttribute("data-ac-hid");
      }
    });
    root.querySelectorAll(".fin-grp").forEach((g) => {
      let n = g.nextElementSibling, any = false;
      while (n && !n.classList.contains("fin-grp")) {
        if (n.tagName === "BUTTON" && n.style.display !== "none") any = true;
        n = n.nextElementSibling;
      }
      if (!any) {
        g.style.display = "none";
        g.setAttribute("data-ac-hid", "1");
      } else if (g.getAttribute("data-ac-hid")) {
        g.style.display = "";
        g.removeAttribute("data-ac-hid");
      }
    });
  }
  function landing(sec) {
    const root = $("sec-" + sec), cfg = SUBS[sec];
    if (!root || sec === "hr" || sec === "finance") return;
    const act = Array.prototype.find.call(root.querySelectorAll("button.active[onclick]"), (b) => cfg.re.test(b.getAttribute("onclick") || ""));
    const m = act && cfg.re.exec(act.getAttribute("onclick"));
    if (m && isDenied(sec, m[1])) {
      const alt = firstAllowed(sec);
      if (alt) {
        const b = findBtn(sec, alt);
        if (b) b.click();
      }
    }
  }
  const watched = {};
  function watch(sec) {
    const root = $("sec-" + sec);
    if (!root || watched[sec]) return;
    watched[sec] = true;
    let q = 0;
    new MutationObserver(() => {
      if (q) return;
      q = requestAnimationFrame(() => {
        q = 0;
        paintSection(sec);
      });
    }).observe(root, { childList: true, subtree: true });
    new MutationObserver(() => {
      if (root.classList.contains("active")) {
        paintSection(sec);
        landing(sec);
      }
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
  }
  function enforceAll() {
    Object.keys(SUBS).forEach((sec) => {
      wrapTabFn(sec);
      watch(sec);
      paintSection(sec);
      if ($("sec-" + sec) && $("sec-" + sec).classList.contains("active")) landing(sec);
    });
  }
  const sig = (p) => JSON.stringify([p.role, !!p.active, p.nav_sections || null, p.admin_sections || null, p.denied_subs || null]);
  let syncing = false;
  async function syncSelf() {
    if (syncing || !navigator.onLine) return;
    try {
      if (!state.currentUser || !state.profile || document.hidden) return;
    } catch (e) {
      return;
    }
    syncing = true;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", state.currentUser.id).maybeSingle();
      if (error || !data) return;
      if (!data.active) {
        toast("Your account was deactivated by an administrator.", "error", 6e3);
        if (typeof forceLogout === "function") forceLogout("Account deactivated");
        return;
      }
      if (sig(data) === sig(state.profile)) return;
      const prev = state.profile.role;
      state.profile = data;
      state.currentUser.role = data.role;
      if (prev !== data.role && (prev === "driver" || data.role === "driver")) {
        toast("Your role changed. Reloading\u2026", "info", 2500);
        setTimeout(() => location.reload(), 1500);
        return;
      }
      if (typeof applyRoleUI === "function") applyRoleUI();
      enforceAll();
      try {
        buildBadges();
      } catch (e) {
      }
      const cur = document.querySelector(".section.active"), id = cur && cur.id.replace(/^sec-/, "");
      if (id && !canSeeSection(id) && !canSeeAdminSection(id)) {
        const d = defaultSectionForRole();
        showSection(d, document.querySelector('.nav-item[data-section="' + d + '"]'));
      }
      toast("Your access was updated by an administrator.", "info", 5e3);
    } catch (e) {
      console.warn("access sync:", e && e.message);
    } finally {
      syncing = false;
    }
  }
  setInterval(syncSelf, 45e3);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setTimeout(syncSelf, 600);
  });
  window.addEventListener("online", () => setTimeout(syncSelf, 3e3));
  const _boot = window.bootShell;
  if (typeof _boot === "function") window.bootShell = function() {
    const r = _boot.apply(this, arguments);
    try {
      enforceAll();
    } catch (e) {
      console.warn("enforce", e);
    }
    return r;
  };
  const _ss = window.showSection;
  if (typeof _ss === "function") window.showSection = function(sec) {
    const r = _ss.apply(this, arguments);
    try {
      if (SUBS[sec]) {
        paintSection(sec);
        landing(sec);
      }
    } catch (e) {
    }
    return r;
  };
  const css = document.createElement("style");
  css.textContent = "\n.modal-box.ac-wide{max-width:800px;width:min(800px,96vw)}\n.ac-bar{display:flex;flex-wrap:wrap;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);align-items:center}\n.ac-bar input,.ac-bar select{height:34px;min-height:0;padding:0 10px;font-size:12px;border-radius:8px;background:var(--surface);border:1px solid var(--border);color:var(--text)}\n.ac-bar input{flex:1;min-width:140px}\n.ac-bulk{display:none;gap:8px;align-items:center;padding:8px 12px;background:var(--gold-dim);border-bottom:1px solid var(--border-mid);font-size:12px;flex-wrap:wrap}\n.ac-bulk.on{display:flex}\n.ac-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer}\n.ac-row:hover{background:var(--hover)}\n.ac-row.off{opacity:.6}\n.ac-row input[type=checkbox]{flex:none;width:16px;height:16px;min-height:0}\n.ac-main{flex:1;min-width:0}\n.ac-name{font-size:13px;font-weight:600;color:var(--text);display:flex;flex-wrap:wrap;gap:6px;align-items:center}\n.ac-meta{font-size:11px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.ac-tag{font:600 9px var(--font-mono,monospace);letter-spacing:.5px;text-transform:uppercase;padding:2px 6px;border-radius:5px;border:1px solid var(--border-mid);color:var(--gold);background:var(--gold-dim)}\n.ac-tag.r{color:var(--red);border-color:var(--red);background:var(--red-dim)}.ac-tag.a{color:var(--amber);border-color:var(--amber);background:var(--amber-dim)}.ac-tag.g{color:var(--green);border-color:var(--green);background:var(--green-dim)}\n.ac-act{display:flex;gap:6px;flex:none}\n.ac-act button{padding:5px 10px;font-size:11px;min-height:0}\n.ac-empty{padding:24px;text-align:center;color:var(--text-3);font-size:12.5px}\n.ac-chk{padding:10px 12px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;font-size:12.5px}\n.ac-chk .ac-dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex:none}\n.ac-chk.bad .ac-dot{background:var(--red)}.ac-chk.warn .ac-dot{background:var(--amber)}.ac-chk.info .ac-dot{background:var(--blue)}\n.ac-chk .ac-x{flex:1;min-width:0;color:var(--text-2);line-height:1.45}.ac-chk b{color:var(--text)}\n.ac-grp{font:600 9px var(--font-mono,monospace);letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin:10px 0 5px}\n.ac-sec{border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface)}\n.ac-sec.has-deny{border-color:var(--amber)}\n.ac-sec>label{display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:12.5px;color:var(--text);cursor:pointer}\n.ac-sec input[type=checkbox]{width:16px;height:16px;min-height:0;flex:none}\n.ac-sec summary{padding:0 10px 8px 34px;font-size:11px;color:var(--text-3);cursor:pointer}\n.ac-sec.has-deny summary{color:var(--amber)}\n.ac-subgrid{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 8px 34px}\n.ac-subgrid label{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text);background:var(--bg);border:1px solid var(--border);padding:4px 8px;border-radius:5px;cursor:pointer}\n.ac-subgrid label.off{opacity:.4}\n.ac-subtools{padding:0 10px 8px 34px;display:flex;gap:6px}\n.ac-subtools button{padding:3px 9px;font-size:10.5px;min-height:0}\n.ac-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}\n.ac-tools button,.ac-tools select{padding:5px 10px;font-size:11px;min-height:0;height:30px}\n.ac-sum{font-size:11.5px;color:var(--text-2);padding:8px 10px;background:var(--surface);border-radius:6px;margin:8px 0}\n.ac-gridwrap.ac-lock{opacity:.35;pointer-events:none}\n.ac-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}\n.ac-chips span{font-size:11px;padding:3px 8px;border-radius:5px;background:var(--surface);border:1px solid var(--border);color:var(--text-2)}\n.ac-chips span.x{border-color:var(--amber);color:var(--amber)}\n.ac-cred{font-family:var(--font-mono,monospace);font-size:12.5px;line-height:1.9;padding:12px;background:var(--surface);border:1px solid var(--border-mid);border-radius:8px;user-select:all;word-break:break-all}\n";
  document.head.appendChild(css);
  const profiles = () => state.db && state.db.profiles || [];
  const navOf = (u) => Array.isArray(u.navSections) ? u.navSections : ROLE_SIDEBAR[u.role] || [];
  const admOf = (u) => Array.isArray(u.adminSections) ? u.adminSections : ROLE_ADMINRAIL[u.role] || [];
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.indexOf(x) > -1);
  const isCustom = (u) => u.role !== "admin" && (!!(u.deniedSubs && u.deniedSubs.length) || Array.isArray(u.navSections) && !sameSet(u.navSections, ROLE_SIDEBAR[u.role] || []) || Array.isArray(u.adminSections) && !sameSet(u.adminSections, ROLE_ADMINRAIL[u.role] || []));
  const daysAgo = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;
  const activeAdmins = () => profiles().filter((u) => u.role === "admin" && u.active).length;
  const token = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session && session.access_token || "";
  };
  const wide = () => {
    const b = document.querySelector("#modalOverlay .modal-box");
    if (b) b.classList.add("ac-wide");
  };
  const _om = window.openModal;
  if (typeof _om === "function") window.openModal = function() {
    const b = document.querySelector("#modalOverlay .modal-box");
    if (b) b.classList.remove("ac-wide");
    return _om.apply(this, arguments);
  };
  function gridHTML(p, nav, adm, den) {
    const groups = {};
    SECTIONS().forEach((s) => {
      const g = SECTION_META[s][0];
      (groups[g] = groups[g] || []).push(s);
    });
    const secs = Object.keys(groups).map((g) => '<div class="ac-grp">'.concat(E(g), "</div>") + groups[g].map((s) => {
      const tabs = subTabs(s), on = nav.indexOf(s) > -1;
      const subs = tabs.length ? '<details class="ac-subs"><summary id="'.concat(p, "_cnt_").concat(s, '"></summary>\n        <div class="ac-subgrid">').concat(tabs.map((t) => '<label id="'.concat(p, "_lab_").concat(s, "_").concat(t[0], '"><input type="checkbox" id="').concat(p, "_sub_").concat(s, "_").concat(t[0], '" ').concat(den.indexOf(s + ":" + t[0]) > -1 ? "" : "checked", " onchange=\"acRefresh('").concat(p, "')\"/> ").concat(E(t[1]), "</label>")).join(""), '</div>\n        <div class="ac-subtools"><button type="button" class="modal-btn" onclick="acSubAll(\'').concat(p, "','").concat(s, '\',true)">Allow all tabs</button><button type="button" class="modal-btn" onclick="acSubAll(\'').concat(p, "','").concat(s, "',false)\">Deny all tabs</button></div></details>") : "";
      return '<div class="ac-sec" id="'.concat(p, "_row_").concat(s, '"><label><input type="checkbox" id="').concat(p, "_nav_").concat(s, '" data-sec="').concat(s, '" ').concat(on ? "checked" : "", " onchange=\"acRefresh('").concat(p, "')\"/> ").concat(E(secLabel(s)), "</label>").concat(subs, "</div>");
    }).join("")).join("");
    const rail = ADMIN_RAIL().map((s) => {
      const lock = ADMIN_ONLY.indexOf(s) > -1;
      return '<label class="ac-sec" style="display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:12.5px;'.concat(lock ? "opacity:.55" : "cursor:pointer", '"><input type="checkbox" id="').concat(p, "_admin_").concat(s, '" ').concat(adm.indexOf(s) > -1 && !lock ? "checked" : "", " ").concat(lock ? "disabled" : "", " onchange=\"acRefresh('").concat(p, '\')" style="width:16px;height:16px;min-height:0"/> ').concat(E(secLabel(s))).concat(lock ? ' <span class="ac-tag">administrators only</span>' : "", "</label>");
    }).join("");
    const others = profiles().filter((u) => u.id !== (window._acEditId || ""));
    return '<div class="ac-tools">\n        <button type="button" class="modal-btn" onclick="acPreset(\''.concat(p, "',document.getElementById('").concat(p, '_role\').value)">Apply role defaults</button>\n        <button type="button" class="modal-btn" onclick="acAll(\'').concat(p, '\',true)">Tick all</button>\n        <button type="button" class="modal-btn" onclick="acAll(\'').concat(p, "',false)\">Untick all</button>\n        <select onchange=\"acCopy('").concat(p, "',this.value);this.value=''\"><option value=\"\">Copy access from\u2026</option>").concat(others.map((u) => '<option value="'.concat(u.id, '">').concat(E(u.name), " (").concat(E(roleName(u.role)), ")</option>")).join(""), '</select>\n      </div>\n      <div class="ac-sum" id="').concat(p, '_sum"></div>\n      <div class="ac-gridwrap" id="').concat(p, '_wrap">\n        <div class="fg"><label>Sections this user can open (expand a section to deny individual tabs inside it)</label>').concat(secs, '</div>\n        <div class="fg"><label>Admin rail</label>').concat(rail, "</div>\n      </div>");
  }
  window.acRefresh = function(p) {
    const role = ($(p + "_role") || {}).value, isAdm = role === "admin", isDrv = role === "driver";
    const wrap = $(p + "_wrap");
    if (wrap) wrap.classList.toggle("ac-lock", isAdm || isDrv);
    let secs = 0, hidden = 0;
    SECTIONS().forEach((s) => {
      const m = $(p + "_nav_" + s);
      if (!m) return;
      const tabs = subTabs(s);
      let ok = 0;
      tabs.forEach((t) => {
        const c = $(p + "_sub_" + s + "_" + t[0]);
        if (!c) return;
        c.disabled = !m.checked;
        if (c.checked) ok++;
        const l = $(p + "_lab_" + s + "_" + t[0]);
        if (l) l.classList.toggle("off", !m.checked || !c.checked);
      });
      if (m.checked) {
        secs++;
        hidden += tabs.length - ok;
      }
      const row = $(p + "_row_" + s);
      if (row) row.classList.toggle("has-deny", !!tabs.length && m.checked && ok < tabs.length);
      const cnt = $(p + "_cnt_" + s);
      if (cnt) cnt.textContent = !m.checked ? "Section off" : ok === tabs.length ? "All ".concat(tabs.length, " tabs allowed") : "".concat(ok, " of ").concat(tabs.length, " tabs allowed \xB7 ").concat(tabs.length - ok, " denied");
    });
    const rail = ADMIN_RAIL().filter((s) => {
      const c = $(p + "_admin_" + s);
      return c && c.checked;
    }).length;
    const sum = $(p + "_sum");
    if (sum) sum.textContent = isAdm ? "Administrators always have access to everything. The ticks below are ignored." : isDrv ? "Drivers only see the driver portal. The ticks below are ignored." : "".concat(secs, " section").concat(secs === 1 ? "" : "s", " \xB7 ").concat(hidden, " tab").concat(hidden === 1 ? "" : "s", " denied inside allowed sections \xB7 ").concat(rail, " admin rail page").concat(rail === 1 ? "" : "s");
  };
  document.addEventListener("change", (e) => {
    const t = e.target, m = t && /^(cu|ea)_nav_(gatesecurity|loadingdesk)$/.exec(t.id || "");
    if (!m || !t.checked) return;
    const other = $(m[1] + "_nav_" + (m[2] === "gatesecurity" ? "loadingdesk" : "gatesecurity"));
    if (other && !other.checked) {
      other.checked = true;
      window.acRefresh(m[1]);
      if (typeof toast === "function") toast("Gate Processes and Loading Desk are linked, so both were ticked. Untick one if this person only needs the other.", "info", 5e3);
    }
  });
  window.acSubAll = (p, s, on) => {
    subTabs(s).forEach((t) => {
      const c = $(p + "_sub_" + s + "_" + t[0]);
      if (c) c.checked = on;
    });
    acRefresh(p);
  };
  window.acAll = (p, on) => {
    SECTIONS().forEach((s) => {
      const c = $(p + "_nav_" + s);
      if (c) c.checked = on;
    });
    ADMIN_RAIL().forEach((s) => {
      const c = $(p + "_admin_" + s);
      if (c && !c.disabled) c.checked = on;
    });
    acRefresh(p);
  };
  function setGrid(p, nav, adm, den) {
    SECTIONS().forEach((s) => {
      const c = $(p + "_nav_" + s);
      if (c) c.checked = nav.indexOf(s) > -1;
      subTabs(s).forEach((t) => {
        const x = $(p + "_sub_" + s + "_" + t[0]);
        if (x) x.checked = den.indexOf(s + ":" + t[0]) < 0;
      });
    });
    ADMIN_RAIL().forEach((s) => {
      const c = $(p + "_admin_" + s);
      if (c && !c.disabled) c.checked = adm.indexOf(s) > -1;
    });
    acRefresh(p);
  }
  window.acPreset = (p, role) => setGrid(p, ROLE_SIDEBAR[role] || [], ROLE_ADMINRAIL[role] || [], []);
  window.acCopy = (p, id) => {
    const u = profiles().find((x) => x.id === id);
    if (u) setGrid(p, navOf(u), admOf(u), u.deniedSubs || []);
  };
  window.refreshAccessCheckboxesForRole = (p, role) => {
    if (typeof role === "string") window.acPreset(p, role);
  };
  function readAccess(p) {
    const navSections = SECTIONS().filter((s) => {
      const c = $(p + "_nav_" + s);
      return c && c.checked;
    });
    const adminSections = ADMIN_RAIL().filter((s) => {
      const c = $(p + "_admin_" + s);
      return c && c.checked && ADMIN_ONLY.indexOf(s) < 0;
    });
    const deniedSubs = [];
    let empty = null;
    navSections.forEach((s) => {
      const tabs = subTabs(s);
      if (!tabs.length) return;
      const off = tabs.filter((t) => {
        const c = $(p + "_sub_" + s + "_" + t[0]);
        return c && !c.checked;
      });
      off.forEach((t) => deniedSubs.push(s + ":" + t[0]));
      if (off.length === tabs.length) empty = s;
    });
    return { navSections, adminSections, deniedSubs, emptySection: empty };
  }
  const roleOptions = (cur) => ROLES.map((r) => '<option value="'.concat(r[0], '" ').concat(cur === r[0] ? "selected" : "", ">").concat(E(roleName(r[0])), "</option>")).join("");
  async function writeAccessDirect(id, a, role) {
    const out = { migration: false, row: null };
    if (role === "admin" || role === "driver") return out;
    const body = { nav_sections: a.navSections, admin_sections: a.adminSections.filter((s) => ADMIN_ONLY.indexOf(s) < 0), denied_subs: a.deniedSubs || [] };
    let r = await supabase.from("profiles").update(body).eq("id", id);
    if (r.error && /denied_subs|column|schema cache/i.test(r.error.message || "")) {
      out.migration = true;
      delete body.denied_subs;
      r = await supabase.from("profiles").update(body).eq("id", id);
    }
    if (r.error) throw new Error("Could not save access: " + r.error.message);
    const back = await supabase.from("profiles").select("role,nav_sections,admin_sections" + (out.migration ? "" : ",denied_subs")).eq("id", id).maybeSingle();
    if (back.error || !back.data) throw new Error("Access was saved but could not be checked. Open the user again to confirm.");
    const have = Array.isArray(back.data.nav_sections) ? back.data.nav_sections : [];
    const lost = a.navSections.filter((s) => have.indexOf(s) < 0);
    if (lost.length) throw new Error("These sections did not save: " + lost.map(secLabel).join(", ") + ". Another process is overwriting them.");
    out.row = back.data;
    return out;
  }
  async function persistAccess(id, a) {
    const res = await fetch("/api/update-access", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() }, body: JSON.stringify({ userId: id, role: a.role, navSections: a.navSections, adminSections: a.adminSections }) });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || "Could not update access");
    const u = profiles().find((x) => x.id === id);
    const out = await writeAccessDirect(id, a, result.profile && result.profile.role || a.role);
    const row = out.row || result.profile || {};
    if (u) {
      u.role = result.profile && result.profile.role || a.role;
      u.navSections = row.nav_sections || null;
      u.adminSections = row.admin_sections || null;
      u.deniedSubs = out.migration ? u.deniedSubs || [] : row.denied_subs || a.deniedSubs || [];
    }
    return { migration: out.migration };
  }
  const MIGRATION_MSG = "Tab restrictions were NOT saved: run sql/2026-11-access-control.sql in Supabase first.";
  window.showCreateUserModal = function() {
    if (!isAdmin()) {
      toast("Admin rights required", "error");
      return;
    }
    window._acEditId = "";
    openModal("Create User", '<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="cu_name" placeholder="Jane Doe" oninput="acSuggestUser()"/></div><div class="fg"><label>Username</label><input id="cu_user" placeholder="jane.doe"/></div></div>\n      <div class="fg"><label>Email</label><input id="cu_email" type="email" placeholder="jane@gargo.co.ke"/></div>\n      <div class="form-row-2"><div class="fg"><label>Role</label><select id="cu_role" onchange="acPreset(\'cu\',this.value)">'.concat(roleOptions("ops"), '</select></div>\n      <div class="fg"><label>Password</label><div style="display:flex;gap:6px"><input id="cu_password" type="text" placeholder="At least 8 characters" style="flex:1"/><button type="button" class="modal-btn" onclick="fillGeneratedPassword(\'cu_password\')">Generate</button></div></div></div>\n      <div class="ac-sum">The login is created directly with this password (no invitation email). The role loads the default access; fine-tune it below, including individual tabs.</div>\n      ').concat(gridHTML("cu", ROLE_SIDEBAR.ops || [], ROLE_ADMINRAIL.ops || [], []), '\n      <button class="submit-btn" id="cu_go" onclick="saveUser()" style="margin-top:10px">Create User \u2192</button>'));
    wide();
    acRefresh("cu");
  };
  window.acSuggestUser = function() {
    const u = $("cu_user"), n = $("cu_name");
    if (!u || !n || u.dataset.t === "1") return;
    u.value = String(n.value).toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
  };
  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "cu_user") e.target.dataset.t = "1";
  });
  window.saveUser = async function() {
    const v = (id) => $(id) ? $(id).value.trim() : "";
    const name = v("cu_name"), user = v("cu_user").toLowerCase(), email = v("cu_email"), password = $("cu_password").value, role = $("cu_role").value;
    if (!name || !user || !email || !password) return toast("Name, username, email and password required", "error");
    if (!validateEmail(email)) return toast("Invalid email format", "error");
    if (password.length < 8) return toast("Password must be at least 8 characters", "error");
    if (profiles().some((u) => u.username === user)) return toast("Username taken", "error");
    if (profiles().some((u) => String(u.email).toLowerCase() === email.toLowerCase())) return toast("That email already has a login", "error");
    const a = readAccess("cu");
    if (role !== "admin" && role !== "driver" && a.emptySection) return toast("Every tab of ".concat(secLabel(a.emptySection), " is denied. Untick the section instead."), "error", 5e3);
    if (role !== "admin" && role !== "driver" && !a.navSections.length && !a.adminSections.length && !confirm("No sections are ticked, so this user will only see the Data Hub. Continue?")) return;
    const btn = $("cu_go");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Creating\u2026";
    }
    try {
      const res = await fetch("/api/create-user", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() }, body: JSON.stringify({ name, username: user, email, password, role, navSections: a.navSections, adminSections: a.adminSections }) });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(result.error || "Could not create user", "error");
        return;
      }
      const p = result.profile;
      let mig = false, row = p, warn = "";
      try {
        const w = await writeAccessDirect(p.id, a, p.role);
        mig = w.migration;
        if (w.row) row = Object.assign({}, p, w.row);
      } catch (e) {
        warn = e.message;
        console.warn("create-user access write:", e);
      }
      profiles().push({ id: p.id, name: p.name, username: p.username, email: p.email, role: p.role, active: p.active, created: p.created_at, lastLogin: null, navSections: row.nav_sections || null, adminSections: row.admin_sections || null, deniedSubs: mig ? [] : row.denied_subs || a.deniedSubs || [] });
      addAudit(state.profile.username, "User Created", "".concat(name, " (").concat(user, ") as ").concat(roleName(role)));
      closeModal();
      renderUserMgmt();
      openModal("User created", '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:8px">Share these sign-in details with '.concat(E(name), ' directly.</div>\n        <div class="ac-cred" id="acCred">Address: ').concat(E(location.origin), "\nEmail: ").concat(E(email), "\nPassword: ").concat(E(password), "</div>\n        ").concat(mig ? '<div class="ac-sum" style="color:var(--amber)">'.concat(MIGRATION_MSG, "</div>") : "", "\n        ").concat(warn ? '<div class="ac-sum" style="color:var(--red)">'.concat(E(warn), " Open Edit Access for this user and save again.</div>") : "", '\n        <div style="display:flex;gap:8px;margin-top:10px"><button class="submit-btn" onclick="acCopyCred()">Copy details</button><button class="modal-btn" onclick="closeModal()">Done</button></div>'));
      $("acCred").style.whiteSpace = "pre-line";
    } catch (e) {
      console.error(e);
      toast("Network error creating user", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Create User \u2192";
      }
    }
  };
  window.acCopyCred = function() {
    const t = ($("acCred") || {}).innerText || "";
    try {
      navigator.clipboard.writeText(t).then(() => toast("Copied", "success"), () => toast("Select the text and copy it", "info"));
    } catch (e) {
      toast("Select the text and copy it", "info");
    }
  };
  window.showEditAccessModal = function(id) {
    if (!isAdmin()) {
      toast("Admin rights required", "error");
      return;
    }
    const u = profiles().find((x) => x.id === id);
    if (!u) return;
    window._acEditId = id;
    openModal("Edit Access \u2014 ".concat(u.name), '<div class="fg"><label>Role</label><select id="ea_role" onchange="acRefresh(\'ea\')">'.concat(roleOptions(u.role), '</select></div>\n      <div class="ac-sum">Changing the role does not change the ticks. Use <b>Apply role defaults</b> to load that role\'s standard access.</div>\n      ').concat(gridHTML("ea", navOf(u), admOf(u), u.deniedSubs || []), '\n      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="submit-btn" id="ea_go" onclick="saveUserAccess(\'').concat(id, '\')">Save Access</button><button class="modal-btn" onclick="showSetPasswordModal(\'').concat(id, "')\">Set New Password</button></div>"));
    wide();
    acRefresh("ea");
  };
  const diffText = (u, role, a) => {
    const oldN = navOf(u), oldD = u.deniedSubs || [], bits = [];
    if (u.role !== role) bits.push("role ".concat(roleName(u.role), " \u2192 ").concat(roleName(role)));
    const add = a.navSections.filter((s) => oldN.indexOf(s) < 0).map(secLabel), rem = oldN.filter((s) => a.navSections.indexOf(s) < 0).map(secLabel);
    if (add.length) bits.push("+" + add.join(", "));
    if (rem.length) bits.push("\u2212" + rem.join(", "));
    const dAdd = a.deniedSubs.filter((x) => oldD.indexOf(x) < 0), dRem = oldD.filter((x) => a.deniedSubs.indexOf(x) < 0);
    if (dAdd.length) bits.push("tabs denied: " + dAdd.join(", "));
    if (dRem.length) bits.push("tabs restored: " + dRem.join(", "));
    return bits.join("; ") || "no change";
  };
  window.saveUserAccess = async function(id) {
    const u = profiles().find((x) => x.id === id);
    if (!u) return;
    const role = $("ea_role").value, a = readAccess("ea");
    if (u.id === state.profile.id && u.role === "admin" && role !== "admin") return toast("You cannot remove your own administrator role.", "error", 4500);
    if (u.role === "admin" && role !== "admin" && u.active && activeAdmins() <= 1) return toast("This is the only active administrator. Make someone else an administrator first.", "error", 5e3);
    if (role !== "admin" && role !== "driver" && a.emptySection) return toast("Every tab of ".concat(secLabel(a.emptySection), " is denied. Untick the section instead."), "error", 5e3);
    if (role !== "admin" && role !== "driver" && !a.navSections.length && !a.adminSections.length && !confirm("No sections are ticked, so this user will only see the Data Hub. Save anyway?")) return;
    const btn = $("ea_go");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving\u2026";
    }
    try {
      const detail = diffText(u, role, a);
      const out = await persistAccess(id, Object.assign({ role }, a));
      addAudit(state.profile.username, "User Access Updated", "".concat(u.name, ": ").concat(detail));
      closeModal();
      renderUserMgmt();
      if (out.migration) toast(MIGRATION_MSG, "warning", 8e3);
      else toast("Access updated. It reaches the user within a minute.", "success", 4e3);
    } catch (e) {
      console.error(e);
      toast(e.message || "Network error updating access", "error");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save Access";
      }
    }
  };
  async function setActive(id, on, quiet) {
    const u = profiles().find((x) => x.id === id);
    if (!u || u.active === on) return true;
    if (!on && u.id === state.profile.id) {
      if (!quiet) toast("You cannot deactivate your own account.", "error");
      return false;
    }
    if (!on && u.role === "admin" && activeAdmins() <= 1) {
      if (!quiet) toast("This is the only active administrator.", "error", 4500);
      return false;
    }
    const { error } = await supabase.from("profiles").update({ active: on }).eq("id", id);
    if (error) {
      if (!quiet) toast("Could not update user", "warning");
      return false;
    }
    u.active = on;
    addAudit(state.profile.username, "User Status", "".concat(u.name, " \u2192 ").concat(on ? "active" : "deactivated"));
    return true;
  }
  window.toggleUserActive = async function(id) {
    const u = profiles().find((x) => x.id === id);
    if (!u) return;
    if (await setActive(id, !u.active)) {
      closeModal();
      renderUserMgmt();
      toast("".concat(u.name, " ").concat(u.active ? "activated" : "deactivated. They are signed out within a minute."), "success");
    }
  };
  window.deleteUser = async function(id) {
    const u = profiles().find((x) => x.id === id);
    if (!u) return;
    if (u.id === state.profile.id) {
      toast("You cannot delete your own account.", "error");
      return;
    }
    if (u.active) {
      toast("Deactivate this user first, then delete.", "warning");
      return;
    }
    if (!navigator.onLine) {
      toast("You are offline. Connect and try again.", "warning");
      return;
    }
    const typed = prompt("Permanently delete " + u.name + " (" + u.username + ")?\n\nThis removes their login and cannot be undone.\nType the username to confirm:");
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== String(u.username || "").toLowerCase()) {
      toast("Username did not match. Nothing was deleted.", "warning", 4500);
      return;
    }
    let res;
    try {
      res = await supabase.rpc("admin_delete_user", { p_user: id });
    } catch (e) {
      res = { error: e };
    }
    const d = res && res.data, err = res && res.error;
    if (err || !d) {
      console.warn("admin_delete_user failed:", err);
      toast("Could not delete user" + (err && err.message ? ": " + err.message : ""), "error", 6e3);
      return;
    }
    if (!d.ok) {
      const why = {
        self: "You cannot delete your own account.",
        not_found: "That user no longer exists.",
        still_active: "Deactivate this user first, then delete.",
        has_history: u.name + " has records in the system (" + String(d.table || "history").replace(/_/g, " ") + "), so the account cannot be erased. Leave it deactivated instead."
      };
      toast(why[d.reason] || "Could not delete user", d.reason === "has_history" ? "warning" : "error", 7e3);
      return;
    }
    state.db.profiles = profiles().filter((x) => x.id !== id);
    SEL.delete(id);
    addAudit(state.profile.username, "User Deleted", u.name + " (" + u.username + ") was " + roleName(u.role));
    closeModal();
    renderUserMgmt();
    toast(u.name + " deleted", "success");
  };
  window.showUserDetail = function(id) {
    const u = profiles().find((x) => x.id === id);
    if (!u) return;
    const nav = u.role === "admin" ? SECTIONS() : navOf(u), den = u.deniedSubs || [];
    const chips = u.role === "driver" ? "<span>Driver portal</span>" : nav.filter((s) => SECTION_META[s]).map((s) => {
      const d = den.filter((x) => x.indexOf(s + ":") === 0).length;
      return '<span class="'.concat(d ? "x" : "", '">').concat(E(secLabel(s))).concat(d ? " (\u2212".concat(d, " tab").concat(d > 1 ? "s" : "", ")") : "", "</span>");
    }).join("") || "<span>None (Data Hub only)</span>";
    const hid = den.map((x) => {
      const [s, t] = x.split(":"), f = subTabs(s).find((y) => y[0] === t);
      return '<span class="x">'.concat(E(secLabel(s)), " \u203A ").concat(E(f ? f[1] : t), "</span>");
    }).join("");
    openModal("User \u2014 ".concat(u.name), '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div class="user-av-lg" style="width:48px;height:48px;font-size:16px">'.concat(initials(u.name), '</div><div><div style="font-size:15px;font-weight:700;color:var(--text)">').concat(E(u.name), '</div><div class="mono" style="font-size:9px;color:var(--text-3)">').concat(E(u.id), '</div></div></div>\n      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">\n        <div class="fg" style="margin:0"><label>Username</label><div class="mono">').concat(E(u.username), '</div></div><div class="fg" style="margin:0"><label>Role</label><div>').concat(E(roleName(u.role))).concat(isCustom(u) ? ' <span class="ac-tag">custom</span>' : "", '</div></div>\n        <div class="fg" style="margin:0"><label>Email</label><div style="font-size:12px">').concat(E(u.email), '</div></div><div class="fg" style="margin:0"><label>Status</label><div>').concat(sbadge(u.active ? "active" : "off_duty"), '</div></div>\n        <div class="fg" style="margin:0"><label>Created</label><div class="mono" style="font-size:10px">').concat(fmtDate(u.created), '</div></div><div class="fg" style="margin:0"><label>Last Login</label><div class="mono" style="font-size:10px">').concat(u.lastLogin ? timeAgo(u.lastLogin) : "Never", '</div></div></div>\n      <div class="fg"><label>Can open</label><div class="ac-chips">').concat(chips, "</div></div>\n      ").concat(hid ? '<div class="fg"><label>Tabs denied</label><div class="ac-chips">'.concat(hid, "</div></div>") : "", '\n      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="modal-btn" onclick="showEditAccessModal(\'').concat(u.id, '\')">Edit Access</button><button class="modal-btn" onclick="showSetPasswordModal(\'').concat(u.id, "')\">Set New Password</button>\n      ").concat(u.id !== state.profile.id ? '<button class="modal-btn '.concat(u.active ? "danger" : "success", '" onclick="toggleUserActive(\'').concat(u.id, "')\">").concat(u.active ? "Deactivate" : "Activate", " User</button>").concat(u.active ? "" : '<button class="modal-btn danger" onclick="deleteUser(\''.concat(u.id, "')\">Delete User</button>")) : '<span style="font-size:11px;color:var(--text-3);align-self:center">This is your account</span>', "</div>"));
  };
  function checkAccess() {
    const out = [], P = profiles(), push = (u, level, msg, fix) => out.push({ u, level, msg, fix });
    if (P.filter((u) => u.role === "admin" && u.active).length === 1) out.push({ u: null, level: "warn", msg: "Only one active administrator. If that login is lost nobody can manage users. Make a second administrator." });
    P.forEach((u) => {
      if (!u.active) return;
      if (ROLE_IDS.indexOf(u.role) < 0) return push(u, "bad", 'Role "'.concat(E(u.role), '" is not recognised, so this user may not be able to open anything.'), "reset");
      if (u.role === "admin") return;
      const nav = navOf(u).filter((s) => SECTION_META[s]), adm = admOf(u);
      if (u.role === "driver") {
        if (!(state.db.drivers || []).some((d) => d.profileId === u.id)) push(u, "warn", "Driver login with no driver record linked, so the driver portal will be empty. Link it on the Drivers page.");
        return;
      }
      const stale = (navOf(u) || []).filter((s) => !SECTION_META[s]);
      if (!nav.filter((s) => s !== "reportcentre").length && !adm.length) push(u, "bad", "Cannot open any section (Data Hub only).", "reset");
      if (stale.length) push(u, "warn", "Access list holds retired sections (".concat(stale.join(", "), ")."), "reset");
      if (CORE[u.role] && nav.indexOf(CORE[u.role]) < 0) push(u, "warn", "".concat(roleName(u.role), " without ").concat(secLabel(CORE[u.role]), ", the section this role exists for."), "reset");
      const den = u.deniedSubs || [];
      Object.keys(SUBS).forEach((s) => {
        const t = subTabs(s);
        if (nav.indexOf(s) > -1 && t.length && t.every((x) => den.indexOf(s + ":" + x[0]) > -1)) push(u, "bad", "Every tab of ".concat(secLabel(s), " is denied, so the section opens empty."), "reset");
      });
      const age = daysAgo(u.lastLogin);
      if (age === null && daysAgo(u.created) > 7) push(u, "info", "Created ".concat(daysAgo(u.created), " days ago and never signed in."));
      else if (age !== null && age > 60) push(u, "info", "No sign-in for ".concat(age, " days. Deactivate if they have left."));
    });
    return out;
  }
  window.acFix = async function(id) {
    const u = profiles().find((x) => x.id === id);
    if (!u) return;
    const role = ROLE_IDS.indexOf(u.role) < 0 ? "viewer" : u.role;
    try {
      await persistAccess(id, { role, navSections: ROLE_SIDEBAR[role] || [], adminSections: (ROLE_ADMINRAIL[role] || []).filter((s) => ADMIN_ONLY.indexOf(s) < 0), deniedSubs: [] });
      addAudit(state.profile.username, "User Access Reset", "".concat(u.name, " \u2192 ").concat(roleName(role), " defaults"));
      toast("".concat(u.name, " reset to ").concat(roleName(role), " defaults"), "success");
      renderUserMgmt();
    } catch (e) {
      toast(e.message || "Could not reset", "error");
    }
  };
  window.acFixAll = async function() {
    const ids = Array.from(new Set(checkAccess().filter((i) => i.fix && i.u).map((i) => i.u.id)));
    if (!ids.length || !confirm("Reset ".concat(ids.length, " user").concat(ids.length > 1 ? "s" : "", " to their role defaults? Their custom ticks and denied tabs will be replaced."))) return;
    for (const id of ids) await window.acFix(id);
  };
  function renderCheck() {
    const host = $("acCheckPanel");
    if (!host) return;
    const items = checkAccess(), bad = items.filter((i) => i.level === "bad").length, warn = items.filter((i) => i.level === "warn").length, fixable = items.filter((i) => i.fix).length;
    host.innerHTML = '<div class="panel-head"><span class="panel-title">Access Check</span><span>'.concat(bad ? '<span class="ac-tag r">'.concat(bad, " problem").concat(bad > 1 ? "s" : "", "</span> ") : "").concat(warn ? '<span class="ac-tag a">'.concat(warn, " warning").concat(warn > 1 ? "s" : "", "</span> ") : "").concat(fixable ? '<button class="action-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="acFixAll()">Reset '.concat(fixable, " to role defaults</button>") : "", "</span></div>") + (items.length ? items.map((i) => '<div class="ac-chk '.concat(i.level, '"><span class="ac-dot"></span><div class="ac-x"><b>').concat(i.u ? E(i.u.name) : "System", "</b> \xB7 ").concat(i.msg, "</div>").concat(i.u ? '<div class="ac-act"><button class="modal-btn" onclick="showEditAccessModal(\''.concat(i.u.id, "')\">Edit</button>").concat(i.fix ? '<button class="modal-btn" onclick="acFix(\''.concat(i.u.id, "')\">Reset</button>") : "", "</div>") : "", "</div>")).join("") : '<div class="ac-empty">Every active user can open what their role needs.</div>');
  }
  const F = { q: "", role: "", st: "" }, SEL = /* @__PURE__ */ new Set();
  const KPI = (l, v, s, c) => typeof kpiCard === "function" ? kpiCard(l, v, s || "", c) : '<div class="kpi-card '.concat(c, '"><div class="kpi-label">').concat(l, '</div><div class="kpi-value">').concat(v, "</div></div>");
  function visibleUsers() {
    const q = F.q.toLowerCase();
    return profiles().filter((u) => {
      if (q && ![u.name, u.username, u.email, roleName(u.role)].some((x) => String(x || "").toLowerCase().indexOf(q) > -1)) return false;
      if (F.role && u.role !== F.role) return false;
      if (F.st === "active" && !u.active) return false;
      if (F.st === "inactive" && u.active) return false;
      if (F.st === "custom" && !isCustom(u)) return false;
      if (F.st === "never" && u.lastLogin) return false;
      if (F.st === "stale" && !(u.lastLogin && daysAgo(u.lastLogin) > 30)) return false;
      return true;
    }).sort((a, b) => b.active - a.active || String(a.name).localeCompare(String(b.name)));
  }
  function ensureBar() {
    const ul = $("userList");
    if (!ul || $("acBar")) return;
    ul.insertAdjacentHTML("beforebegin", '<div class="ac-bar" id="acBar"><input id="acQ" placeholder="Search name, username, email or role\u2026" oninput="acFilter()"/>\n      <select id="acRole" onchange="acFilter()"><option value="">All roles</option>'.concat(ROLES.map((r) => '<option value="'.concat(r[0], '">').concat(E(roleName(r[0])), "</option>")).join(""), '</select>\n      <select id="acSt" onchange="acFilter()"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="custom">Custom access</option><option value="never">Never signed in</option><option value="stale">No sign-in 30+ days</option></select></div>\n      <div class="ac-bulk" id="acBulk"><b id="acSelN"></b><button class="modal-btn" onclick="acBulk(\'on\')">Activate</button><button class="modal-btn danger" onclick="acBulk(\'off\')">Deactivate</button><button class="modal-btn" onclick="acBulk(\'reset\')">Reset to role defaults</button><button class="modal-btn" onclick="acBulk(\'clear\')">Clear</button></div>'));
    const gh = $("auditLog") && $("auditLog").closest(".panel");
    if (gh && !$("acCheckPanel")) gh.insertAdjacentHTML("beforebegin", '<div class="panel" id="acCheckPanel" style="margin-top:14px"></div>');
  }
  window.acFilter = function() {
    F.q = ($("acQ") || {}).value || "";
    F.role = ($("acRole") || {}).value || "";
    F.st = ($("acSt") || {}).value || "";
    renderList();
  };
  window.acSel = function(id, on, ev) {
    if (ev) ev.stopPropagation();
    on ? SEL.add(id) : SEL.delete(id);
    paintBulk();
  };
  function paintBulk() {
    const b = $("acBulk");
    if (!b) return;
    b.classList.toggle("on", SEL.size > 0);
    $("acSelN").textContent = SEL.size + " selected";
  }
  window.acBulk = async function(what) {
    if (what === "clear") {
      SEL.clear();
      renderList();
      return;
    }
    const ids = Array.from(SEL);
    if (!ids.length) return;
    if (what === "reset") {
      if (!confirm("Reset ".concat(ids.length, " user(s) to their role defaults?"))) return;
      for (const id of ids) await window.acFix(id);
      SEL.clear();
      return;
    }
    if (what === "off" && !confirm("Deactivate ".concat(ids.length, " user(s)? They are signed out within a minute."))) return;
    let ok = 0, skip = 0;
    for (const id of ids) {
      await setActive(id, what === "on", true) ? ok++ : skip++;
    }
    SEL.clear();
    renderUserMgmt();
    toast("".concat(ok, " updated").concat(skip ? ", ".concat(skip, " skipped (yourself or the last administrator)") : ""), skip ? "warning" : "success", 4500);
  };
  function renderList() {
    const ul = $("userList");
    if (!ul) return;
    const rows = visibleUsers();
    ul.innerHTML = rows.length ? rows.map((u) => {
      const den = (u.deniedSubs || []).length, age = daysAgo(u.lastLogin);
      return '<div class="ac-row '.concat(u.active ? "" : "off", '" onclick="showUserDetail(\'').concat(u.id, '\')"><input type="checkbox" ').concat(SEL.has(u.id) ? "checked" : "", " onclick=\"acSel('").concat(u.id, '\',this.checked,event)"/>\n        <div class="user-av-lg">').concat(initials(u.name), '</div>\n        <div class="ac-main"><div class="ac-name">').concat(E(u.name), " ").concat(!u.active ? '<span class="ac-tag r">inactive</span>' : "").concat(isCustom(u) ? '<span class="ac-tag">custom</span>' : "").concat(den ? '<span class="ac-tag a">'.concat(den, " tab").concat(den > 1 ? "s" : "", " denied</span>") : "").concat(!u.lastLogin ? '<span class="ac-tag a">never signed in</span>' : "", '</div>\n          <div class="ac-meta">').concat(E(u.username), " \xB7 ").concat(E(u.email), '</div></div>\n        <span class="sbadge s-').concat(u.role === "admin" ? "pending" : u.role === "finance" ? "completed" : "active", '" style="font-size:9px">').concat(E(roleName(u.role)), '</span>\n        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);min-width:64px;text-align:right">').concat(age === null ? "\u2014" : timeAgo(u.lastLogin), '</div>\n        <div class="ac-act" onclick="event.stopPropagation()"><button class="modal-btn" onclick="showEditAccessModal(\'').concat(u.id, "')\">Access</button></div></div>");
    }).join("") : '<div class="ac-empty">No users match these filters.</div>';
    paintBulk();
  }
  window.renderUserMgmt = function() {
    if (!isAdmin()) {
      const k2 = $("userKpis");
      if (k2) k2.innerHTML = '<div class="vault-locked-banner" style="grid-column:1/-1"><div><div class="title">Admin Access Required</div><div class="desc">User management is restricted to System Administrators.</div></div></div>';
      const ul = $("userList");
      if (ul) ul.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\u{1F512}</div>Admin access required.</div>';
      return;
    }
    ensureBar();
    const U = profiles(), k = $("userKpis");
    if (k) k.innerHTML = KPI("Users", U.length, "".concat(U.filter((u) => u.active).length, " active"), "kpi-gold") + KPI("Administrators", U.filter((u) => u.role === "admin" && u.active).length, "", "kpi-blue") + KPI("Custom access", U.filter(isCustom).length, "differs from role", "kpi-orange") + KPI("Never signed in", U.filter((u) => u.active && !u.lastLogin).length, "", U.some((u) => u.active && !u.lastLogin) ? "kpi-red" : "kpi-green");
    renderList();
    renderCheck();
    const rl = $("roleList");
    if (rl) rl.innerHTML = ROLES.map((r) => {
      const n = (ROLE_SIDEBAR[r[0]] || []).length, c = U.filter((u) => u.role === r[0] && u.active).length;
      return '<div class="role-card"><div class="role-name">'.concat(E(roleName(r[0])), ' <span class="ac-tag">').concat(c, " user").concat(c === 1 ? "" : "s", '</span></div><div class="role-perms">').concat(E(r[2])).concat(r[0] === "admin" || r[0] === "driver" ? "" : " Default: ".concat(n, " section").concat(n === 1 ? "" : "s", "."), "</div></div>");
    }).join("");
    const a = $("auditLog");
    if (a) a.innerHTML = [...state.db.auditLog].sort((x, y) => new Date(y.time) - new Date(x.time)).slice(0, 25).map((x) => '<div class="audit-row"><div class="audit-time">'.concat(fmtTime(x.time), " \xB7 ").concat(fmtDate(x.time), '</div><div class="user-av-rail" style="width:22px;height:22px;font-size:8px">').concat(initials(x.user), '</div><div style="flex:1;font-size:11.5px"><span style="font-weight:600;color:var(--text)">').concat(E(x.action), '</span><span style="color:var(--text-3);margin-left:6px">').concat(E(x.detail), "</span></div></div>")).join("");
  };
  if (typeof sectionRenderers !== "undefined") sectionRenderers.usermgmt = window.renderUserMgmt;
  window.GargoAccess = { isDenied, subTabs, checkAccess, syncSelf, enforce: enforceAll, ROLES };
  try {
    enforceAll();
  } catch (e) {
    console.warn("access-control init", e);
  }
})();
