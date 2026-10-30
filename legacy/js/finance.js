"use strict";
(function() {
  const pad = (n) => String(n).padStart(2, "0");
  const todayISO = () => {
    const d = /* @__PURE__ */ new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  const monthStart = () => todayISO().slice(0, 8) + "01";
  const N = (v) => Number(v || 0);
  const TONE = {
    paid: "g",
    approved: "g",
    active: "g",
    present: "g",
    hired: "g",
    closed: "g",
    returned: "g",
    acknowledged: "g",
    pending: "a",
    draft: "a",
    unpaid: "a",
    partial: "a",
    late: "a",
    submitted: "a",
    interview: "a",
    offer: "a",
    shortlisted: "a",
    open: "a",
    on_leave: "a",
    issued: "b",
    applied: "b",
    leave: "b",
    off: "b",
    rejected: "r",
    overdue: "r",
    absent: "r",
    lost: "r",
    suspended: "r",
    exited: "r",
    appealed: "r"
  };
  const badge = (s) => {
    const k = String(s || "").toLowerCase();
    return '<span class="hb hb-'.concat(TONE[k] || "n", '">').concat(esc(k.replace(/_/g, " ")), "</span>");
  };
  const kpi = (l, v, s, c) => typeof kpiCard === "function" ? kpiCard(l, v, s || "", c || "kpi-gold") : '<div class="kpi-card '.concat(c || "kpi-gold", '"><div class="kpi-value">').concat(v, '</div><div class="kpi-label">').concat(l, "</div>").concat(s ? '<div class="kpi-sub">'.concat(s, "</div>") : "", "</div>");
  const closeM = () => {
    const o = document.getElementById("modalOverlay");
    closeModal(o ? { target: o } : void 0);
  };
  const canApprove = () => isAdmin() || currentRole() === "finance";
  if (typeof window.canApprove !== "function") window.canApprove = canApprove;
  const POLICY = { loaded: false, limit: 0, separate: true };
  async function loadPolicy(force) {
    if (POLICY.loaded && !force) return POLICY;
    let data = null, error = null;
    try {
      ({ data, error } = await withTimeout(supabase.from("finance_settings").select("approval_limit,separate_approver").eq("id", 1).single()));
    } catch (e) {
      error = e;
    }
    if (!error && data) {
      POLICY.limit = N(data.approval_limit);
      POLICY.separate = !!data.separate_approver;
      POLICY.loaded = true;
    }
    return POLICY;
  }
  async function approvalBlock(rec, amount) {
    var _a;
    if (!canApprove()) return "Only the Finance Manager or an Administrator can approve.";
    if (isAdmin()) return "";
    const p = await loadPolicy();
    if (!p.loaded) return "Could not load the approval rules, so this cannot be approved right now. Check your connection and try again.";
    if (p.limit > 0 && N(amount) > p.limit) return "This is above the KSh ".concat(p.limit.toLocaleString("en-KE"), " limit. An administrator must approve it.");
    if (p.separate && rec && rec.created_by && rec.created_by === ((_a = state.profile) == null ? void 0 : _a.id)) return "You entered this yourself, so someone else must approve it.";
    return "";
  }
  const cents = (v) => Math.round(N(v) * 100);
  const sumC = (rows, k) => rows.reduce((t, r) => t + cents(r[k || "amount"]), 0) / 100;
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("The server took too long to respond. Check your signal and try again.")), ms || 2e4))]);
  const escLike = (v) => String(v).replace(/[\\%_]/g, (m) => "\\" + m);
  const same = (a, b) => a == null && b == null || a != null && b != null && (String(a) === String(b) || a !== "" && b !== "" && !isNaN(a) && !isNaN(b) && Number(a) === Number(b));
  function friendlyError(e) {
    const msg = String(e && (e.message || e.error_description) || e || ""), code = e && e.code;
    if (!navigator.onLine || /failed to fetch|networkerror|load failed|network request/i.test(msg)) return "No internet connection. Nothing was saved. Your entries are still on screen, so try again once you have a signal.";
    if (/jwt|token.*expired|not authenticated/i.test(msg) || e && e.status === 401) return "Your session has expired. Sign in again, then retry.";
    if (code === "42501" || /row-level security|permission denied/i.test(msg)) return "You do not have permission to do that.";
    if (code === "23505") return "A record with the same unique value already exists.";
    if (code === "23503") return "This record is linked to other records, so that change is not allowed.";
    if (code === "23514" || code === "23502") return "The database rejected this entry: " + msg;
    return msg || "Something went wrong. Please try again.";
  }
  const csvCell = (v) => {
    if (typeof v === "number") return String(v);
    let t = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  };
  function downloadCSV(name, header, rows) {
    const text = "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3e3);
  }
  const dayNum = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN;
  };
  const HUB = {
    cfg: {},
    rows: {},
    emp: {},
    _tok: 0,
    err: {},
    stale: {},
    truncated: {},
    ui: {},
    _busy: false,
    money: (n) => "KSh " + N(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    date: (d) => d ? fmtDate(d) : "\u2014",
    todayISO,
    monthStart,
    badge,
    kpi: (label, val, sub, cls) => kpi(label, val, sub, cls),
    /* Pages through the table (no silent 2,000-row cap). On failure keeps the last good copy and records the reason. */
    async load(table) {
      const PAGE = 1e3, MAX = 2e4;
      let all = [];
      try {
        for (let from = 0; from < MAX; from += PAGE) {
          const { data, error } = await withTimeout(supabase.from(table).select("*").order("created_at", { ascending: false }).order("id").range(from, from + PAGE - 1));
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < PAGE) break;
        }
        this.rows[table] = all;
        this.stale[table] = false;
        this.truncated[table] = all.length >= MAX;
        delete this.err[table];
        return all;
      } catch (e) {
        console.error(table, e);
        this.err[table] = friendlyError(e);
        if (this.rows[table]) {
          this.stale[table] = true;
          return this.rows[table];
        }
        return [];
      }
    },
    async loadEmployees() {
      const rows = await this.load("employees");
      this.emp = Object.fromEntries(rows.map((e) => [e.id, e]));
      return rows;
    },
    cell(r, c) {
      var _a;
      const [k, , f] = c, v = r[k];
      if (f === "money") return this.money(v);
      if (f === "date") return this.date(v);
      if (f === "badge") return v ? badge(v) : "\u2014";
      if (f === "emp") return esc(((_a = this.emp[v]) == null ? void 0 : _a.full_name) || "\u2014");
      if (f === "expiry") {
        if (!v) return "\u2014";
        const d = Math.ceil((new Date(v) - Date.now()) / 864e5);
        return "".concat(this.date(v), " ") + (d < 0 ? '<span class="hb hb-r">Expired</span>' : d <= 30 ? '<span class="hb hb-a">'.concat(d, "d left</span>") : '<span class="hb hb-g">Valid</span>');
      }
      return esc(v != null ? v : "\u2014");
    },
    /* cfg: { table, host, kpiHost, cols:[[key,label,fmt]], fields:[{k,l,t,o,r,d,ro,money,min,max}], canEdit(), canDelete(), title, extra(), rowActions(r), rowLocked(r), dupFilters(rec), needsEmp, oninput, beforeSave(rec), newDefaults, refresh() } */
    plain(r, c) {
      var _a;
      const [k, , f] = c, v = r[k];
      if (f === "money") return N(v);
      if (f === "emp") return ((_a = this.emp[v]) == null ? void 0 : _a.full_name) || "";
      return v == null ? "" : String(v);
    },
    text(r, c) {
      const [k, , f] = c, v = r[k];
      if (f === "money") return this.money(v);
      if (f === "date") return v ? this.date(v) : "";
      return String(this.plain(r, c));
    },
    async render(cfg, kpiFn) {
      this.cfg[cfg.table] = cfg;
      const t = cfg.table, tok = ++this._tok, host = document.getElementById(cfg.host);
      if (!host) return;
      host.innerHTML = '<div class="hub-loading">Loading\u2026</div>';
      if (cfg.needsEmp) await this.loadEmployees();
      const rows = await this.load(t);
      if (tok !== this._tok) return;
      const kh = document.getElementById(cfg.kpiHost);
      if (this.err[t] && !this.rows[t]) {
        if (kh) kh.innerHTML = "";
        host.innerHTML = '<div class="ops-notice">Could not load '.concat(esc(cfg.title), " records. ").concat(esc(this.err[t]), ' <button class="action-btn" style="margin-left:8px" onclick="GARGO_HUB.retry(\'').concat(t, "')\">Retry</button></div>");
        return;
      }
      if (kh) kh.innerHTML = kpiFn ? kpiFn(rows) : "";
      const ui = this.ui[t] || (this.ui[t] = { q: "", status: "", from: "", to: "", shown: 100 });
      ui.shown = 100;
      const edit = cfg.canEdit(), hasStatus = cfg.cols.some((c) => c[0] === "status"), dateCol = cfg.cols.find((c) => c[2] === "date");
      const statuses = hasStatus ? [...new Set(rows.map((r) => r.status).filter(Boolean))].sort() : [];
      const notices = (this.stale[t] ? '<div class="ops-notice" style="margin-bottom:8px">Showing the last data that loaded. '.concat(esc(this.err[t] || ""), ' <button class="action-btn ghost" onclick="GARGO_HUB.retry(\'').concat(t, "')\">Retry</button></div>") : "") + (this.truncated[t] ? '<div class="ops-notice" style="margin-bottom:8px">Only the newest 20,000 records are loaded. Use the filters or export to narrow down.</div>' : "");
      host.innerHTML = "".concat(notices, '<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">').concat(cfg.title, ' <span id="hub_count_').concat(t, '" style="color:var(--text-3)"></span></div>\n        <div class="filter-row">').concat(edit ? '<button class="action-btn" onclick="GARGO_HUB.open(\''.concat(t, "')\">+ Add</button>") : "").concat(cfg.extra ? cfg.extra() : "", '</div></div>\n        <div class="filter-row" style="margin:6px 0;flex-wrap:wrap;gap:6px">\n          <input type="search" placeholder="Search\u2026" value="').concat(esc(ui.q), '" oninput="GARGO_HUB.filter(\'').concat(t, "','q',this.value)\" style=\"min-width:150px;flex:1\">\n          ").concat(hasStatus ? "<select onchange=\"GARGO_HUB.filter('".concat(t, "','status',this.value)\"><option value=\"\">All statuses</option>").concat(statuses.map((x) => '<option value="'.concat(esc(x), '" ').concat(ui.status === x ? "selected" : "", ">").concat(esc(x), "</option>")).join(""), "</select>") : "", "\n          ").concat(dateCol ? '<input type="date" title="From" value="'.concat(esc(ui.from), '" onchange="GARGO_HUB.filter(\'').concat(t, '\',\'from\',this.value)"><input type="date" title="To" value="').concat(esc(ui.to), '" onchange="GARGO_HUB.filter(\'').concat(t, "','to',this.value)\">") : "", '\n          <button class="action-btn ghost" onclick="GARGO_HUB.exportCSV(\'').concat(t, '\')">\u2B07 CSV</button></div>\n        <div id="hub_tbl_').concat(t, '"></div>');
      this.paint(t);
    },
    filtered(t) {
      const cfg = this.cfg[t], ui = this.ui[t], q = ui.q.trim().toLowerCase(), dc = cfg.cols.find((c) => c[2] === "date");
      return (this.rows[t] || []).filter((r) => {
        if (ui.status && r.status !== ui.status) return false;
        if (dc) {
          const d = String(r[dc[0]] || "").slice(0, 10);
          if (ui.from && (!d || d < ui.from)) return false;
          if (ui.to && (!d || d > ui.to)) return false;
        }
        return !q || cfg.cols.map((c) => this.plain(r, c)).join(" ").toLowerCase().includes(q);
      });
    },
    paint(t) {
      const cfg = this.cfg[t], ui = this.ui[t], el = document.getElementById("hub_tbl_" + t);
      if (!el) return;
      const all = this.rows[t] || [], rows = this.filtered(t), shown = rows.slice(0, ui.shown);
      const edit = cfg.canEdit(), acts = edit || !!(cfg.actionsForAll && cfg.rowActions), admin = isAdmin();
      const head = cfg.cols.map((c) => "<th>".concat(c[1], "</th>")).join("") + (acts ? "<th></th>" : "");
      const body = shown.map((r) => {
        const lock = cfg.rowLocked ? cfg.rowLocked(r) : "", id = esc(r.id);
        const editBtn = !edit ? "" : lock && !admin ? '<span title="'.concat(esc(lock), '" style="opacity:.6;padding:0 6px">\u{1F512}</span>') : '<button class="action-btn ghost" '.concat(lock ? 'title="'.concat(esc(lock), ' - administrator edit"') : "", " onclick=\"GARGO_HUB.open('").concat(t, "','").concat(id, "')\">Edit</button>");
        return "<tr>".concat(cfg.cols.map((c) => "<td>".concat(this.cell(r, c), "</td>")).join("")).concat(acts ? '<td style="white-space:nowrap">'.concat(cfg.rowActions ? cfg.rowActions(r) : "").concat(editBtn).concat(edit && cfg.canDelete() ? ' <button class="action-btn ghost" onclick="GARGO_HUB.del(\''.concat(t, "','").concat(id, '\')" title="Delete">\u2715</button>') : "", "</td>") : "", "</tr>");
      }).join("");
      const mc = cfg.cols.find((c) => c[2] === "money");
      const foot = mc && rows.length ? '<tfoot><tr><td colspan="'.concat(cfg.cols.length + (acts ? 1 : 0), '" style="text-align:right;font-weight:600">Total shown: ').concat(this.money(sumC(rows, mc[0])), "</td></tr></tfoot>") : "";
      const none = all.length ? "Nothing matches the current filters" : "No records yet";
      el.innerHTML = '<div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr>'.concat(head, "</tr></thead><tbody>").concat(body || '<tr><td colspan="'.concat(cfg.cols.length + 1, '" style="text-align:center;color:var(--text-3);padding:28px">').concat(none, "</td></tr>"), "</tbody>").concat(foot, "</table></div>") + (rows.length > shown.length ? '<div style="text-align:center;margin:10px"><button class="action-btn ghost" onclick="GARGO_HUB.more(\''.concat(t, "')\">Show more (").concat(rows.length - shown.length, " left)</button></div>") : "");
      const cnt = document.getElementById("hub_count_" + t);
      if (cnt) cnt.textContent = rows.length === all.length ? "(".concat(all.length, ")") : "(".concat(rows.length, " of ").concat(all.length, ")");
    },
    filter(t, key, val) {
      const ui = this.ui[t];
      if (!ui) return;
      ui[key] = val;
      ui.shown = 100;
      clearTimeout(this._ft);
      this._ft = setTimeout(() => this.paint(t), key === "q" ? 150 : 0);
    },
    more(t) {
      this.ui[t].shown += 100;
      this.paint(t);
    },
    retry(t) {
      const cfg = this.cfg[t];
      if (cfg) cfg.refresh ? cfg.refresh() : this.render(cfg);
    },
    exportCSV(t) {
      var _a;
      const cfg = this.cfg[t], rows = this.filtered(t);
      downloadCSV("".concat(t, "_").concat(todayISO(), ".csv"), cfg.cols.map((c) => c[1]), rows.map((r) => cfg.cols.map((c) => this.plain(r, c))));
      addAudit((_a = state.profile) == null ? void 0 : _a.username, "Exported " + cfg.title, rows.length + " rows");
    },
    open(table, id) {
      const cfg = this.cfg[table], r = (this.rows[table] || []).find((x) => x.id === id) || {};
      const inputs = cfg.fields.map((f) => {
        var _a, _b;
        const v = (_b = (_a = r[f.k]) != null ? _a : f.d) != null ? _b : "", a = 'id="bf_'.concat(f.k, '" ').concat(f.ro ? "readonly" : "", " ").concat(cfg.oninput ? 'oninput="'.concat(cfg.oninput, '"') : "");
        let el;
        if (f.t === "select") el = "<select ".concat(a, ">").concat(f.o.map((o) => '<option value="'.concat(esc(o), '" ').concat(String(o) === String(v) ? "selected" : "", ">").concat(esc(o), "</option>")).join(""), "</select>");
        else if (f.t === "emp") el = "<select ".concat(a, '><option value="">\u2014 select \u2014</option>').concat(Object.values(this.emp).filter((e) => e.status !== "exited").map((e) => '<option value="'.concat(e.id, '" ').concat(e.id === v ? "selected" : "", ">").concat(esc(e.full_name), " (").concat(esc(e.staff_no || ""), ")</option>")).join(""), "</select>");
        else if (f.t === "textarea") el = "<textarea ".concat(a, ' rows="2">').concat(esc(v), "</textarea>");
        else el = "<input ".concat(a, ' type="').concat(f.t || "text", '" ').concat(f.t === "number" ? 'step="0.01" inputmode="decimal"' + (f.min != null ? ' min="' + f.min + '"' : "") : "", ' value="').concat(esc(v), '"/>');
        return '<div class="fg"><label>'.concat(f.l).concat(f.r ? " *" : "", "</label>").concat(el, "</div>");
      });
      const rowsHtml = [];
      for (let i = 0; i < inputs.length; i += 2) rowsHtml.push('<div class="form-row-2">'.concat(inputs[i]).concat(inputs[i + 1] || "", "</div>"));
      openModal((id ? "Edit " : "Add ") + cfg.title, "".concat(rowsHtml.join(""), '<div id="bf_err" style="color:var(--red);font-size:12px;min-height:16px"></div>\n        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById(\'modalOverlay\')})">Cancel</button>\n        <button class="action-btn" id="bf_save" onclick="GARGO_HUB.save(\'').concat(table, "','").concat(id || "", "')\">Save</button></div>"));
      const fn = cfg.oninput && window[cfg.oninput.replace(/\(.*$/, "")];
      if (typeof fn === "function") {
        try {
          fn();
        } catch (e) {
        }
      }
    },
    async save(table, id) {
      var _a, _b, _c;
      if (this._busy) return;
      const cfg = this.cfg[table], rec = {}, err = document.getElementById("bf_err"), btn = document.getElementById("bf_save");
      const fail = (m) => {
        if (err) err.textContent = m;
      };
      if (err) err.textContent = "";
      if (cfg.canEdit && !cfg.canEdit()) return fail("You do not have permission to save this.");
      if (!navigator.onLine) return fail("You are offline. Nothing was saved. Your entries stay on screen, so try again once you have a signal.");
      for (const f of cfg.fields) {
        const raw = (_a = document.getElementById("bf_" + f.k)) == null ? void 0 : _a.value, v = raw == null ? raw : raw.trim();
        if (f.r && !v) return fail("".concat(f.l, " is required"));
        if (v === "" || v === void 0) {
          rec[f.k] = null;
          continue;
        }
        if (f.t === "number") {
          const n = Number(v);
          if (!Number.isFinite(n)) return fail("".concat(f.l, " must be a number"));
          if (f.min != null && n < f.min) return fail("".concat(f.l, " must be at least ").concat(f.min));
          if (f.max != null && n > f.max) return fail("".concat(f.l, " is too large"));
          if (f.money && Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return fail("".concat(f.l, " can have at most 2 decimal places"));
          rec[f.k] = f.money ? Math.round(n * 100) / 100 : n;
        } else rec[f.k] = v;
      }
      if (cfg.beforeSave) {
        const m = cfg.beforeSave(rec);
        if (m) return fail(m);
      }
      this._busy = true;
      if (btn) btn.disabled = true;
      try {
        let before = null;
        if (id) {
          const { data: cur, error: ce } = await withTimeout(supabase.from(table).select("*").eq("id", id).maybeSingle());
          if (ce) throw ce;
          if (!cur) return fail("This record no longer exists. Close this window and refresh.");
          const lock = cfg.rowLocked ? cfg.rowLocked(cur) : "";
          if (lock && !isAdmin()) return fail("".concat(lock, ", so it can no longer be edited."));
          const loaded = (this.rows[table] || []).find((x) => x.id === id);
          if (loaded && loaded.updated_at && cur.updated_at && loaded.updated_at !== cur.updated_at) return fail("Someone else changed this record while you were editing. Close this window and reopen it to see their changes.");
          if (lock && !confirm("".concat(lock, ". Changing it alters figures that were already signed off. Continue?"))) return;
          before = cur;
        }
        const df = cfg.dupFilters ? cfg.dupFilters(rec) : null;
        if (df) {
          try {
            let q = supabase.from(table).select("*").limit(5);
            df.forEach(([c, v, op]) => {
              q = op === "ilike" ? q.ilike(c, escLike(v)) : q.eq(c, v);
            });
            const { data } = await withTimeout(q);
            const hit = (data || []).filter((x) => x.id !== id);
            if (hit.length) {
              const lines = hit.slice(0, 3).map((x) => "\u2022 " + cfg.cols.slice(0, 5).map((c) => this.text(x, c)).filter(Boolean).join(" \xB7 ")).join("\n");
              if (!confirm("Possible duplicate: ".concat(hit.length, " similar ").concat(hit.length === 1 ? "record exists" : "records exist", ":\n").concat(lines, "\n\nSave anyway?"))) return;
            }
          } catch (e) {
            console.warn("Duplicate check skipped:", e);
          }
        }
        let error;
        if (id) {
          const r = await withTimeout(supabase.from(table).update(rec).eq("id", id).select("id"));
          error = r.error;
          if (!error && Array.isArray(r.data) && !r.data.length) error = { message: "The change was not applied. The record may have been removed, or you may not have permission." };
        } else {
          if (cfg.newDefaults) Object.assign(rec, cfg.newDefaults);
          rec.created_by = ((_b = state.profile) == null ? void 0 : _b.id) || null;
          ({ error } = await withTimeout(supabase.from(table).insert(rec)));
        }
        if (error) return fail(friendlyError(error));
        let detail;
        if (before) {
          const d = {};
          Object.keys(rec).forEach((k) => {
            var _a2;
            if (!same(before[k], rec[k])) d[k] = [(_a2 = before[k]) != null ? _a2 : null, rec[k]];
          });
          detail = JSON.stringify({ id, changes: d }).slice(0, 400);
        } else detail = JSON.stringify(rec).slice(0, 300);
        addAudit((_c = state.profile) == null ? void 0 : _c.username, (id ? "Updated " : "Created ") + cfg.title, detail);
        closeM();
        toast("Saved", "success");
        cfg.refresh();
      } catch (e) {
        console.error(e);
        fail(friendlyError(e));
      } finally {
        this._busy = false;
        if (btn) btn.disabled = false;
      }
    },
    async del(table, id) {
      var _a;
      if (this._busy) return;
      const cfg = this.cfg[table], rec = (this.rows[table] || []).find((x) => x.id === id);
      if (cfg.canDelete && !cfg.canDelete()) return toast("You do not have permission to delete this.", "error");
      if (!navigator.onLine) return toast("You are offline. Deleting needs a connection.", "error");
      const lock = rec && cfg.rowLocked ? cfg.rowLocked(rec) : "";
      const label = rec ? cfg.cols.slice(0, 4).map((c) => this.text(rec, c)).filter(Boolean).join(" \xB7 ") : id;
      if (!confirm("Delete this ".concat(cfg.title.toLowerCase(), "?\n\n").concat(label, "\n").concat(lock ? "\n\u26A0 ".concat(lock, ". Deleting removes a signed-off record.\n") : "", "\nThis cannot be undone."))) return;
      this._busy = true;
      try {
        const { data, error } = await withTimeout(supabase.from(table).delete().eq("id", id).select("id"));
        if (error) return toast(friendlyError(error), "error", 5e3);
        if (Array.isArray(data) && !data.length) return toast("Nothing was deleted. The record may already be gone, or you may not have permission.", "error", 5e3);
        addAudit((_a = state.profile) == null ? void 0 : _a.username, "Deleted " + cfg.title, JSON.stringify(rec || { id }).slice(0, 400));
        toast("Deleted", "success");
      } catch (e) {
        return toast(friendlyError(e), "error", 5e3);
      } finally {
        this._busy = false;
      }
      cfg.refresh();
    }
  };
  window.GARGO_HUB = HUB;
  const FIN_CATS = ["Fuel", "Repairs & Maintenance", "Spare Parts", "Tyres", "Salaries & Wages", "Utilities", "Rent & Rates", "Insurance", "Licences & Permits", "Security", "Equipment Hire", "Port & KPA Charges", "Admin & Office", "Professional Fees", "Other"];
  const FIN = {
    receipts: {
      table: "receipts",
      title: "Receipt",
      cols: [["receipt_date", "Date", "date"], ["payer", "Received From"], ["ref", "Reference"], ["invoice_no", "Invoice"], ["method", "Method"], ["amount", "Amount", "money"]],
      fields: [
        { k: "receipt_date", l: "Date", t: "date", r: 1, d: todayISO() },
        { k: "payer", l: "Received From", r: 1 },
        { k: "amount", l: "Amount (KSh)", t: "number", r: 1 },
        { k: "method", l: "Method", t: "select", o: ["M-Pesa", "Bank Transfer", "Cheque", "Cash", "RTGS/EFT"] },
        { k: "ref", l: "Reference / Txn No." },
        { k: "invoice_no", l: "Invoice No." },
        { k: "notes", l: "Notes", t: "textarea" }
      ]
    },
    bills: {
      table: "bills",
      title: "Supplier Bill",
      cols: [["bill_date", "Date", "date"], ["supplier", "Supplier"], ["bill_no", "Bill No."], ["category", "Category"], ["due_date", "Due", "date"], ["amount", "Amount", "money"], ["status", "Status", "badge"]],
      fields: [
        { k: "bill_date", l: "Bill Date", t: "date", r: 1, d: todayISO() },
        { k: "supplier", l: "Supplier", r: 1 },
        { k: "bill_no", l: "Bill / Invoice No." },
        { k: "category", l: "Category", t: "select", o: FIN_CATS },
        { k: "amount", l: "Amount (KSh)", t: "number", r: 1 },
        { k: "due_date", l: "Due Date", t: "date" },
        { k: "status", l: "Status", t: "select", o: ["unpaid", "partial", "paid"] },
        { k: "notes", l: "Notes", t: "textarea" }
      ],
      rowActions: (r) => r.status !== "paid" ? '<button class="action-btn ghost" onclick="finMarkPaid(\''.concat(r.id, "')\">Mark paid</button> ") : ""
    },
    expenses: {
      table: "expenses",
      title: "Expense",
      cols: [["expense_date", "Date", "date"], ["category", "Category"], ["description", "Description"], ["paid_via", "Paid Via"], ["amount", "Amount", "money"], ["status", "Status", "badge"]],
      fields: [
        { k: "expense_date", l: "Date", t: "date", r: 1, d: todayISO() },
        { k: "category", l: "Category", t: "select", o: FIN_CATS },
        { k: "description", l: "Description", r: 1 },
        { k: "amount", l: "Amount (KSh)", t: "number", r: 1 },
        { k: "paid_via", l: "Paid Via", t: "select", o: ["Petty Cash", "M-Pesa", "Bank", "Cheque"] },
        { k: "ref", l: "Receipt / Ref No." }
      ],
      /* Status is not a form field: a new expense starts pending and is approved only through the buttons below.
         The database enforces who may approve (Finance Manager / Administrator; never your own entry when "separate approver" is on). */
      newDefaults: { status: "pending" },
      rowActions: (r) => r.status === "pending" && canApprove() ? '<button class="action-btn ghost" onclick="finDecide(\''.concat(r.id, "','approved')\">\u2713 Approve</button><button class=\"action-btn ghost\" onclick=\"finDecide('").concat(r.id, "','rejected')\">\u2715 Reject</button> ") : ""
    },
    suppliers: {
      table: "suppliers",
      title: "Supplier",
      cols: [["name", "Supplier"], ["contact", "Contact"], ["phone", "Phone"], ["email", "Email"], ["kra_pin", "KRA PIN"], ["payment_terms", "Terms"]],
      fields: [{ k: "name", l: "Supplier Name", r: 1 }, { k: "contact", l: "Contact Person" }, { k: "phone", l: "Phone" }, { k: "email", l: "Email", t: "email" }, { k: "kra_pin", l: "KRA PIN" }, { k: "payment_terms", l: "Payment Terms", d: "30 days" }]
    }
  };
  Object.values(FIN).forEach((c) => {
    c.host = "financeBody";
    c.kpiHost = "financeKpis";
    c.canEdit = () => canFinance();
    c.canDelete = () => isAdmin();
    c.refresh = () => renderFinance(window._finTab || "overview");
  });
  Object.values(FIN).forEach((c) => c.fields.forEach((f) => {
    if (f.k === "amount") {
      f.money = true;
      f.min = 0.01;
      f.max = 1e9;
    }
  }));
  const nextDay = () => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  const dateIssue = (v, label, future) => !v ? "" : v < "2000-01-01" ? "".concat(label, " looks wrong (before year 2000)") : v > "2100-01-01" ? "".concat(label, " looks wrong (after year 2100)") : !future && v > nextDay() ? "".concat(label, " cannot be in the future") : "";
  FIN.receipts.beforeSave = (r) => dateIssue(r.receipt_date, "Receipt date");
  FIN.expenses.beforeSave = (r) => dateIssue(r.expense_date, "Expense date");
  FIN.bills.beforeSave = (r) => dateIssue(r.bill_date, "Bill date") || dateIssue(r.due_date, "Due date", true) || (r.due_date && r.bill_date && r.due_date < r.bill_date ? "Due date cannot be before the bill date" : "");
  FIN.expenses.rowLocked = (r) => r.status === "approved" || r.status === "rejected" ? "This expense is ".concat(r.status) : "";
  FIN.bills.rowLocked = (r) => r.status === "paid" ? "This bill is paid" : "";
  FIN.receipts.dupFilters = (r) => r.ref ? [["ref", r.ref, "ilike"]] : null;
  FIN.bills.dupFilters = (r) => r.supplier && r.bill_no ? [["supplier", r.supplier, "ilike"], ["bill_no", r.bill_no, "ilike"]] : null;
  FIN.expenses.dupFilters = (r) => r.ref ? [["ref", r.ref, "ilike"], ["amount", r.amount, "eq"]] : null;
  const FIN_KPI = {
    expenses: (r) => {
      const p = r.filter((x) => x.status === "pending");
      return kpi("Awaiting Approval", p.length, HUB.money(p.reduce((s, x) => s + N(x.amount), 0)), p.length ? "kpi-orange" : "kpi-green") + kpi("Approved (MTD)", HUB.money(r.filter((x) => x.status === "approved" && x.expense_date >= monthStart()).reduce((s, x) => s + N(x.amount), 0)), "", "kpi-blue");
    },
    bills: (r) => {
      const t = todayISO(), o = r.filter((b) => b.status !== "paid"), od = o.filter((b) => b.due_date && b.due_date < t);
      return kpi("Open Bills", o.length, HUB.money(o.reduce((s, b) => s + N(b.amount), 0)), "kpi-gold") + kpi("Overdue", od.length, HUB.money(od.reduce((s, b) => s + N(b.amount), 0)), od.length ? "kpi-red" : "kpi-green");
    }
  };
  const FIN_TABS = [["overview", "Overview"], ["receipts", "Receipts"], ["bills", "Supplier Bills"], ["expenses", "Expenses"], ["suppliers", "Suppliers"], ["controls", "Controls"]];
  const EXT = {};
  const GROUP_ORDER = ["Overview", "Billing & collections", "Payables & spending", "Cash & planning", "Control", "General ledger", "Assets & tax"];
  const BASE_GROUP = { overview: "Overview", receipts: "Billing & collections", bills: "Payables & spending", expenses: "Payables & spending", suppliers: "Payables & spending", controls: "Control" };
  const tabList = () => {
    const rows = FIN_TABS.map((t, i) => ({ id: t[0], label: t[1], group: BASE_GROUP[t[0]] || GROUP_ORDER[0], pos: (i + 1) * 100 }));
    Object.entries(EXT).forEach(([id, x], n) => {
      const anchor = x.after ? rows.find((r) => r.id === x.after) : null;
      rows.push({ id, label: x.label, group: x.group || (anchor ? anchor.group : "Payables & spending"), pos: x.pos != null ? x.pos : anchor ? anchor.pos + 1 + n / 1e3 : 1e3 + n });
    });
    return rows;
  };
  function finTabs(tab) {
    const el = document.getElementById("financeTabs");
    if (!el) return;
    const rows = tabList(), groups = GROUP_ORDER.concat([...new Set(rows.map((r) => r.group))].filter((g) => !GROUP_ORDER.includes(g)));
    el.innerHTML = groups.map((g) => {
      const ts = rows.filter((r) => r.group === g).sort((a, b) => a.pos - b.pos);
      return ts.length ? '<span class="fin-grp">'.concat(g, "</span>") + ts.map((r) => '<button class="filter-btn'.concat(r.id === tab ? " active" : "", '" onclick="renderFinance(\'').concat(r.id, "',this)\">").concat(r.label, "</button>")).join("") : "";
    }).join("");
  }
  window.renderFinance = async function(tab) {
    tab = tab || "overview";
    window._finTab = tab;
    finTabs(tab);
    const body = document.getElementById("financeBody"), kp = document.getElementById("financeKpis");
    if (!body) return;
    if (!canFinance()) {
      if (kp) kp.innerHTML = "";
      body.innerHTML = '<div class="ops-notice">The Finance Hub is restricted to the Finance Manager and Administrators.</div>';
      return;
    }
    if (EXT[tab]) {
      if (kp) kp.innerHTML = "";
      try {
        return await EXT[tab].run();
      } catch (e) {
        console.error(tab, e);
        body.innerHTML = '<div class="ops-notice">Could not open this tab. '.concat(esc(friendlyError(e)), "</div>");
        return;
      }
    }
    if (tab === "controls") return finControls();
    if (tab !== "overview") return HUB.render(FIN[tab], FIN_KPI[tab]);
    kp.innerHTML = "";
    body.innerHTML = '<div class="hub-loading">Loading\u2026</div>';
    const tok = ++HUB._tok;
    const [rc, bl, ex] = await Promise.all([HUB.load("receipts"), HUB.load("bills"), HUB.load("expenses")]);
    if (tok !== HUB._tok) return;
    const names = ["receipts", "bills", "expenses"], bad = names.filter((t) => HUB.err[t] && !HUB.rows[t]);
    if (bad.length) {
      body.innerHTML = '<div class="ops-notice">Could not load '.concat(bad.join(", "), ", so the figures are hidden rather than shown wrong. ").concat(esc(HUB.err[bad[0]]), ' <button class="action-btn" style="margin-left:8px" onclick="renderFinance(\'overview\')">Retry</button></div>');
      return;
    }
    const staleNote = names.some((t) => HUB.stale[t]) ? '<div class="ops-notice" style="margin-bottom:10px">Some figures come from the last data that loaded, not live data. <button class="action-btn ghost" onclick="renderFinance(\'overview\')">Retry</button></div>' : "";
    const ms = monthStart(), today = todayISO(), td = dayNum(today);
    const counted = ex.filter((r) => r.expense_date >= ms && r.status === "approved");
    const rcM = sumC(rc.filter((r) => r.receipt_date >= ms)), exM = sumC(counted), pend = ex.filter((r) => r.status === "pending");
    const open = bl.filter((b) => b.status !== "paid"), od = open.filter((b) => b.due_date && b.due_date < today);
    kp.innerHTML = kpi("Receipts (MTD)", HUB.money(rcM), "", "kpi-green") + kpi("Approved Expenses (MTD)", HUB.money(exM), "Pending ones are not counted", "kpi-orange") + kpi("Net Cash (MTD)", HUB.money(rcM - exM), "Receipts \u2212 approved expenses", rcM - exM >= 0 ? "kpi-blue" : "kpi-red") + kpi("Bills Payable", HUB.money(sumC(open)), "".concat(open.length, " open"), "kpi-gold") + kpi("Overdue Bills", od.length, HUB.money(sumC(od)), od.length ? "kpi-red" : "kpi-green") + kpi("Awaiting Approval", pend.length, HUB.money(sumC(pend)), pend.length ? "kpi-orange" : "kpi-green");
    const byCat = {};
    counted.forEach((r) => {
      const k = r.category || "Other";
      byCat[k] = (byCat[k] || 0) + cents(r.amount);
    });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const empty = (n, t) => '<tr><td colspan="'.concat(n, '" style="text-align:center;color:var(--text-3);padding:20px">').concat(t, "</td></tr>");
    const tbl = (head, rows, mt) => '<div class="table-wrap" style="'.concat(mt ? "margin-top:14px;" : "", 'overflow-x:auto"><table class="data-table"><thead><tr>').concat(head, "</tr></thead><tbody>").concat(rows, "</tbody></table></div>");
    const AG = ["Not yet due", "1\u201330 days overdue", "31\u201360 days overdue", "61\u201390 days overdue", "Over 90 days overdue", "No due date"], agV = AG.map(() => 0), agN = AG.map(() => 0);
    open.forEach((b) => {
      const d = b.due_date ? td - dayNum(b.due_date) : NaN, i = isNaN(d) ? 5 : d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4;
      agV[i] += cents(b.amount);
      agN[i]++;
    });
    const d0 = /* @__PURE__ */ new Date(), months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1);
      months.push([d.getFullYear() + "-" + pad(d.getMonth() + 1), d.toLocaleDateString("en-KE", { month: "short", year: "numeric" })]);
    }
    const mR = {}, mE = {};
    rc.forEach((r) => {
      const k = String(r.receipt_date || "").slice(0, 7);
      mR[k] = (mR[k] || 0) + cents(r.amount);
    });
    ex.filter((r) => r.status === "approved").forEach((r) => {
      const k = String(r.expense_date || "").slice(0, 7);
      mE[k] = (mE[k] || 0) + cents(r.amount);
    });
    const oldPend = pend.filter((x) => td - dayNum(x.expense_date) > 7).length, noRef = rc.filter((r) => !r.ref).length, noDue = open.filter((b) => !b.due_date).length;
    const flags = [oldPend && "".concat(oldPend, " expense").concat(oldPend === 1 ? "" : "s", " waiting for approval for over 7 days"), noRef && "".concat(noRef, " receipt").concat(noRef === 1 ? " has" : "s have", " no reference number"), noDue && "".concat(noDue, " open bill").concat(noDue === 1 ? " has" : "s have", " no due date")].filter(Boolean);
    body.innerHTML = staleNote + (flags.length ? '<div class="ops-notice" style="margin-bottom:10px"><b>Worth a look:</b> '.concat(flags.map(esc).join(" \xB7 "), "</div>") : "") + tbl(
      "<th>Bills due soonest</th><th>Due</th><th>Amount</th><th>Status</th>",
      open.slice().sort((a, b) => (a.due_date || "9").localeCompare(b.due_date || "9")).slice(0, 8).map((b) => "<tr><td>".concat(esc(b.supplier), "</td><td>").concat(HUB.date(b.due_date), "</td><td>").concat(HUB.money(b.amount), "</td><td>").concat(badge(b.due_date && b.due_date < today ? "overdue" : b.status), "</td></tr>")).join("") || empty(4, "No open bills")
    ) + tbl("<th>Payables ageing</th><th>Bills</th><th>Amount</th>", AG.map((l, i) => "<tr><td>".concat(l, "</td><td>").concat(agN[i], "</td><td").concat(i >= 1 && i <= 4 && agV[i] ? ' style="color:var(--red)"' : "", ">").concat(HUB.money(agV[i] / 100), "</td></tr>")).join(""), true) + tbl("<th>Month</th><th>Receipts</th><th>Approved expenses</th><th>Net</th>", months.map(([k, l]) => {
      const r = mR[k] || 0, e = mE[k] || 0;
      return "<tr><td>".concat(l, "</td><td>").concat(HUB.money(r / 100), "</td><td>").concat(HUB.money(e / 100), "</td><td").concat(r - e < 0 ? ' style="color:var(--red)"' : "", ">").concat(HUB.money((r - e) / 100), "</td></tr>");
    }).join(""), true) + tbl("<th>Approved expenses by category (this month)</th><th>Amount</th>", cats.map(([c, v]) => "<tr><td>".concat(esc(c), "</td><td>").concat(HUB.money(v / 100), "</td></tr>")).join("") || empty(2, "No approved expenses this month"), true) + '<p style="color:var(--text-3);font-size:12px;margin-top:10px">Customer invoices and billing rates are managed under <b>Invoicing</b>.</p>';
  };
  const _acting = /* @__PURE__ */ new Set();
  window.finDecide = async function(id, status) {
    var _a;
    if (_acting.has(id) || status !== "approved" && status !== "rejected") return;
    if (!canApprove()) return toast("Only the Finance Manager or an Administrator can decide on expenses.", "error");
    if (!navigator.onLine) return toast("You are offline. Approvals need a connection.", "error");
    _acting.add(id);
    try {
      const { data: rec, error: e0 } = await withTimeout(supabase.from("expenses").select("*").eq("id", id).maybeSingle());
      if (e0) return toast(friendlyError(e0), "error", 5e3);
      if (!rec) {
        toast("This expense no longer exists.", "error");
        return renderFinance("expenses");
      }
      if (rec.status !== "pending") {
        toast("This expense was already ".concat(rec.status, "."), "info", 4e3);
        return renderFinance("expenses");
      }
      if (status === "approved") {
        const m = await approvalBlock(rec, rec.amount);
        if (m) return toast(m, "error", 5e3);
      }
      const { data, error } = await withTimeout(supabase.from("expenses").update({ status }).eq("id", id).eq("status", "pending").select("id"));
      if (error) return toast(friendlyError(error), "error", 5e3);
      if (Array.isArray(data) && !data.length) {
        toast("Someone else already decided on this expense, or you are not allowed to change it.", "error", 5e3);
        return renderFinance("expenses");
      }
      addAudit((_a = state.profile) == null ? void 0 : _a.username, status === "approved" ? "Expense approved" : "Expense rejected", "".concat(rec.description, " \xB7 KSh ").concat(N(rec.amount).toLocaleString("en-KE")));
      toast(status === "approved" ? "Expense approved" : "Expense rejected", "success");
      renderFinance("expenses");
    } catch (e) {
      toast(friendlyError(e), "error", 5e3);
    } finally {
      _acting.delete(id);
    }
  };
  window.finMarkPaid = async function(id) {
    var _a;
    if (_acting.has(id)) return;
    if (!canFinance()) return;
    if (!navigator.onLine) return toast("You are offline. Marking a bill paid needs a connection.", "error");
    _acting.add(id);
    try {
      const { data: rec, error: e0 } = await withTimeout(supabase.from("bills").select("*").eq("id", id).maybeSingle());
      if (e0) return toast(friendlyError(e0), "error", 5e3);
      if (!rec) {
        toast("This bill no longer exists.", "error");
        return renderFinance("bills");
      }
      if (rec.status === "paid") {
        toast("This bill is already marked as paid.", "info", 4e3);
        return renderFinance("bills");
      }
      if (!confirm("Mark the bill from ".concat(rec.supplier, " (").concat(HUB.money(rec.amount), ") as paid?"))) return;
      const { data, error } = await withTimeout(supabase.from("bills").update({ status: "paid" }).eq("id", id).neq("status", "paid").select("id"));
      if (error) return toast(friendlyError(error), "error", 5e3);
      if (Array.isArray(data) && !data.length) {
        toast("The bill was changed by someone else, or you are not allowed to update it.", "error", 5e3);
        return renderFinance("bills");
      }
      addAudit((_a = state.profile) == null ? void 0 : _a.username, "Bill paid", "".concat(rec.supplier, " \xB7 ").concat(HUB.money(rec.amount)));
      toast("Bill marked as paid", "success");
      renderFinance("bills");
    } catch (e) {
      toast(friendlyError(e), "error", 5e3);
    } finally {
      _acting.delete(id);
    }
  };
  async function finControls() {
    const kp = document.getElementById("financeKpis"), body = document.getElementById("financeBody");
    kp.innerHTML = "";
    const { data: s, error } = await supabase.from("finance_settings").select("*").eq("id", 1).single();
    if (error) {
      body.innerHTML = '<div class="ops-notice">'.concat(esc(error.message), "</div>");
      return;
    }
    const adm = isAdmin(), dis = adm ? "" : "disabled";
    body.innerHTML = '<div class="sec-toolbar" style="margin:8px 0"><div class="sec-title-admin">Approval controls</div><div class="filter-row">'.concat(adm ? '<button class="action-btn" onclick="finSaveControls()">Save</button>' : "", "</div></div>\n      ").concat(adm ? "" : '<div class="ops-notice" style="margin-bottom:10px">Only an administrator can change these.</div>', '\n      <div class="hr-grid"><div class="hr-card"><h4>Approval rules</h4>\n        <div class="fg"><label>Administrator-only above (KSh, 0 = no limit)</label><input id="fc_limit" type="number" min="0" value="').concat(N(s.approval_limit), '" ').concat(dis, '></div>\n        <div class="fg"><label>Nobody approves their own entry (administrators excepted)</label><select id="fc_sep" ').concat(dis, '><option value="false" ').concat(s.separate_approver ? "" : "selected", '>Off</option><option value="true" ').concat(s.separate_approver ? "selected" : "", '>On</option></select></div></div>\n        <div class="hr-card"><h4>Month-end close <small>blocks edits for non-administrators</small></h4>\n          <div class="fg"><label>Books closed up to and including</label><input id="fc_lock" type="date" value="').concat(esc(s.lock_before || ""), '" ').concat(dis, '></div>\n          <p style="color:var(--text-3);font-size:12px">Receipts, expenses and bills dated on or before this day can no longer be added, changed or deleted by Finance. ').concat(adm ? '<button class="action-btn ghost" onclick="finCloseMonth()">Close last month</button> <button class="action-btn ghost" onclick="document.getElementById(\'fc_lock\').value=\'\'">Reopen all</button>' : "", '</p></div>\n        <div class="hr-card"><h4>Tax</h4><div class="fg"><label>VAT rate (%)</label><input id="fc_vat" type="number" min="0" max="100" step="0.01" value="').concat(N(s.vat_rate), '" ').concat(dis, '></div></div></div>\n      <p style="color:var(--text-3);font-size:12px">Only the Finance Manager and Administrators can approve money (expenses, payroll). HR prepares payroll; Finance approves it. With "nobody approves their own entry" on, a Finance user cannot approve what they entered themselves. Keep it on. The database enforces these rules, not just this screen.</p>');
  }
  window.finCloseMonth = function() {
    const n = /* @__PURE__ */ new Date(), d = new Date(n.getFullYear(), n.getMonth(), 0), el = document.getElementById("fc_lock");
    if (el) el.value = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  window.finSaveControls = async function() {
    var _a;
    if (!isAdmin()) return;
    const lk = document.getElementById("fc_lock").value || null, vat = N(document.getElementById("fc_vat").value);
    if (vat < 0 || vat > 100) return toast("VAT rate must be between 0 and 100", "error");
    if (lk && (lk < "2000-01-01" || lk > nextDay())) return toast("The close date looks wrong", "error");
    const u = { approval_limit: Math.max(0, N(document.getElementById("fc_limit").value)), separate_approver: document.getElementById("fc_sep").value === "true", lock_before: lk, vat_rate: vat, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    const { error } = await supabase.from("finance_settings").update(u).eq("id", 1);
    if (error) return toast(error.message, "error");
    POLICY.loaded = false;
    addAudit((_a = state.profile) == null ? void 0 : _a.username, "Finance controls changed", JSON.stringify(u).slice(0, 180));
    toast("Controls saved", "success");
    finControls();
  };
  Object.assign(HUB, { friendlyError, withTimeout, cents, sumC, downloadCSV, dayNum, N });
  window.GARGO_FIN = { FIN, FIN_CATS, FIN_KPI, approvalBlock, loadPolicy, canApprove, add(id, label, run, group, after, pos) {
    EXT[id] = { label, run, group, after, pos };
  }, tabs: EXT };
})();
