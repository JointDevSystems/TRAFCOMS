"use strict";
(function() {
  const H = GARGO_HUB, $ = (id) => document.getElementById(id);
  if (typeof HR === "undefined" || !HR.employees) return console.error("hr-records.js needs hr.js first");
  const BUCKET = "hr-files", MAX_MB = 10, EXT = /\.(pdf|jpe?g|png|webp|docx?)$/i;
  const CATS = [
    "CV / Resume",
    "Academic Certificate",
    "Professional Certificate",
    "National ID / Passport copy",
    "KRA PIN Certificate",
    "NSSF / SHIF Card",
    "Employment Contract",
    "Offer / Appointment Letter",
    "Good Conduct / Police Clearance",
    "Reference Letter",
    "Other"
  ];
  const DEFAULTS = HR_DEPTS.slice();
  let deptRows = [], tableOk = false, deptAt = 0;
  const size = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round((n || 0) / 1024)) + " KB";
  const who = () => {
    var _a;
    return (_a = state.profile) == null ? void 0 : _a.username;
  };
  const shut = () => closeModal({ target: $("modalOverlay") });
  const miss = (e) => /does not exist|schema cache|42P01|relation|Bucket not found/i.test(String(e && (e.message || e)));
  const needSql = '<div class="ops-notice">This feature needs the database update. Run <b>supabase/hr-records.sql</b> once in the Supabase SQL editor, then reload.</div>';
  const errText = (e) => miss(e) ? "Database not updated yet. Run supabase/hr-records.sql in Supabase." : H.friendlyError(e);
  function sync() {
    const used = (H.rows.employees || []).map((e) => e.department).filter(Boolean);
    const base = tableOk ? deptRows.filter((d) => d.active !== false).map((d) => d.name) : DEFAULTS;
    const out = [];
    base.concat(used).forEach((n) => {
      if (n && !out.some((x) => x.toLowerCase() === n.toLowerCase())) out.push(n);
    });
    HR_DEPTS.length = 0;
    out.forEach((n) => HR_DEPTS.push(n));
  }
  async function loadDepts(force) {
    if (!force && Date.now() - deptAt < 6e4) return;
    if (!navigator.onLine) return;
    deptAt = Date.now();
    const { data, error } = await supabase.from("hr_departments").select("*").order("sort_order").order("name");
    if (error) {
      tableOk = false;
      return sync();
    }
    tableOk = true;
    deptRows = data || [];
    sync();
  }
  async function addDept(name) {
    var _a;
    name = String(name || "").trim().replace(/\s+/g, " ");
    if (name.length < 2) return { error: { message: "Enter a department name" } };
    const found = HR_DEPTS.find((d) => d.toLowerCase() === name.toLowerCase());
    if (found) return { name: found };
    const next = deptRows.reduce((m, d) => Math.max(m, Number(d.sort_order) || 0), 0) + 1;
    let r = await supabase.from("hr_departments").insert({ name, sort_order: next, active: true, created_by: ((_a = state.profile) == null ? void 0 : _a.id) || null });
    if (r.error && r.error.code === "23505") r = await supabase.from("hr_departments").update({ active: true }).ilike("name", name);
    if (r.error) return { error: r.error };
    addAudit(who(), "Department created", name);
    await loadDepts(true);
    return { name };
  }
  const _le = H.loadEmployees;
  H.loadEmployees = async function() {
    const r = await _le.apply(this, arguments);
    sync();
    return r;
  };
  const _bs = window.bootShell;
  if (typeof _bs === "function") window.bootShell = function() {
    const r = _bs.apply(this, arguments);
    setTimeout(() => {
      if (!isDriver()) loadDepts(true).catch(() => {
      });
    }, 1500);
    return r;
  };
  if (!HR_TABS.some((t) => t[0] === "records")) {
    const i = Math.max(0, HR_TABS.findIndex((t) => t[0] === "orgchart"));
    HR_TABS.splice(i, 0, ["records", "Records & Files"], ["departments", "Departments"]);
  }
  const _rh = window.renderHR;
  window.renderHR = async function(tab) {
    try {
      await loadDepts();
    } catch (e) {
    }
    if (tab === "records" || tab === "departments") {
      window._hrTab = tab;
      hrBuildTabs();
      try {
        return await (tab === "records" ? hrRecords() : hrDepartments());
      } catch (e) {
        console.error(tab, e);
        const b = $("hrBody");
        if (b) b.innerHTML = miss(e) ? needSql : '<div class="ops-notice">Could not open this tab. '.concat(esc(errText(e)), "</div>");
        return;
      }
    }
    return _rh.apply(this, arguments);
  };
  const _ra = HR.employees.rowActions;
  HR.employees.rowActions = (r) => _ra(r) + (hrCan() ? '<button class="action-btn ghost" onclick="hrFiles(\''.concat(r.id, "')\">Files</button> ") + (r.status !== "exited" ? '<button class="action-btn ghost" onclick="hrMoveDept(\''.concat(r.id, "')\">Move</button> ") : "") : "");
  async function hrDepartments() {
    const body = $("hrBody"), kp = $("hrKpis");
    body.innerHTML = '<div style="padding:24px;color:var(--text-2)">Loading\u2026</div>';
    const emps = await H.loadEmployees();
    await loadDepts(true);
    const act = emps.filter((e) => e.status !== "exited"), n = (d) => act.filter((e) => e.department === d).length, all = (d) => emps.filter((e) => e.department === d).length;
    kp.innerHTML = H.kpi("Departments", HR_DEPTS.length, "", "kpi-blue") + H.kpi("Active staff", act.length, "", "kpi-green") + H.kpi("Unassigned", act.filter((e) => !e.department).length, "No department set", act.some((e) => !e.department) ? "kpi-orange" : "kpi-green");
    const rows = HR_DEPTS.map((d) => {
      const row = deptRows.find((x) => x.name.toLowerCase() === d.toLowerCase());
      const canRetire = hrCan() && row && all(d) === 0;
      return "<tr><td><b>".concat(esc(d), "</b></td><td>").concat(n(d), "</td><td>").concat(all(d), '</td><td style="white-space:nowrap">').concat(hrCan() ? '<button class="action-btn ghost" onclick="hrDeptStaff(\''.concat(esc(d).replace(/'/g, "&#39;"), "')\">Staff</button> ") : "").concat(canRetire ? '<button class="action-btn ghost" onclick="hrDeptRetire(\''.concat(row.id, "')\">Retire</button>") : "", "</td></tr>");
    }).join("");
    body.innerHTML = "".concat(tableOk ? "" : needSql, '<div class="filter-row" style="margin-bottom:10px">').concat(hrCan() ? '<button class="action-btn" onclick="hrDeptNew()">+ New department</button>' : "", '</div>\n      <div class="table-wrap"><table class="data-table"><thead><tr><th>Department</th><th>Active staff</th><th>All records</th><th></th></tr></thead><tbody>').concat(rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:24px">No departments</td></tr>', "</tbody></table></div>");
  }
  window.hrDeptNew = function() {
    if (!hrCan()) return toast("HR access required", "error");
    openModal("New department", '<div class="fg"><label>Department name *</label><input id="dp_name" maxlength="60" placeholder="e.g. Customer Service"/></div>\n      <div id="dp_err" style="color:var(--red);font-size:12px;min-height:16px"></div>\n      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById(\'modalOverlay\')})">Cancel</button><button class="action-btn" id="dp_go" onclick="hrDeptSave()">Create</button></div>');
    setTimeout(() => $("dp_name") && $("dp_name").focus(), 80);
  };
  window.hrDeptSave = async function() {
    const go = $("dp_go");
    go.disabled = true;
    const r = await addDept($("dp_name").value);
    go.disabled = false;
    if (r.error) {
      $("dp_err").textContent = errText(r.error);
      return;
    }
    shut();
    toast('Department "' + r.name + '" ready', "success");
    renderHR("departments");
  };
  window.hrDeptRetire = async function(id) {
    if (!hrCan()) return;
    const d = deptRows.find((x) => x.id === id);
    if (!d || !confirm('Retire "' + d.name + '"? It disappears from the dropdowns. Departments with staff cannot be retired.')) return;
    const { error } = await supabase.from("hr_departments").update({ active: false }).eq("id", id);
    if (error) return toast(errText(error), "error", 5e3);
    addAudit(who(), "Department retired", d.name);
    await loadDepts(true);
    renderHR("departments");
  };
  window.hrDeptStaff = async function(d) {
    const emps = (await H.loadEmployees()).filter((e) => e.department === d && e.status !== "exited");
    openModal(d + " \u2014 staff", '<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data-table"><thead><tr><th>Name</th><th>Role</th><th></th></tr></thead><tbody>'.concat(emps.map((e) => "<tr><td>".concat(esc(e.full_name), '<br><small style="color:var(--text-3)">').concat(esc(e.staff_no || ""), "</small></td><td>").concat(esc(e.job_title || "\u2014"), '</td><td><button class="action-btn ghost" onclick="hrMoveDept(\'').concat(e.id, "')\">Move</button></td></tr>")).join("") || '<tr><td colspan="3" style="text-align:center;color:var(--text-3);padding:20px">No active staff</td></tr>', "</tbody></table></div>"));
  };
  window.hrMoveDept = async function(id) {
    if (!hrCan()) return toast("HR access required", "error");
    await loadDepts();
    if (!H.emp[id]) await H.loadEmployees();
    const e = H.emp[id];
    if (!e) return toast("Employee not found", "error");
    let hist = "";
    try {
      const { data } = await supabase.from("employee_moves").select("*").eq("employee_id", id).order("changed_at", { ascending: false }).limit(5);
      if (data && data.length) hist = '<div style="margin-top:12px;font-size:12px;color:var(--text-3)"><b>Recent moves</b>' + data.map((m) => "<div>".concat(esc(H.date(m.changed_at)), ": ").concat(esc(m.from_dept || "\u2014"), " \u2192 ").concat(esc(m.to_dept || "\u2014"), "</div>")).join("") + "</div>";
    } catch (x) {
    }
    openModal("Move \u2014 " + e.full_name, '<div style="font-size:13px;color:var(--text-2);margin-bottom:10px">Currently: <b>'.concat(esc(e.department || "No department"), "</b>").concat(e.job_title ? " \xB7 " + esc(e.job_title) : "", '</div>\n      <div class="form-row-2"><div class="fg"><label>New department</label><select id="mv_dept">').concat(HR_DEPTS.map((d) => '<option value="'.concat(esc(d), '" ').concat(d === e.department ? "selected" : "", ">").concat(esc(d), "</option>")).join(""), '</select></div>\n        <div class="fg"><label>\u2026or create a new one</label><input id="mv_new" maxlength="60" placeholder="Leave blank to use the list"/></div></div>\n      <div class="fg"><label>Job title</label><input id="mv_title" value="').concat(esc(e.job_title || ""), '"/></div>\n      <div id="mv_err" style="color:var(--red);font-size:12px;min-height:16px"></div>\n      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById(\'modalOverlay\')})">Cancel</button><button class="action-btn" id="mv_go" onclick="hrMoveSave(\'').concat(esc(id), "')\">Move</button></div>").concat(hist));
  };
  window.hrMoveSave = async function(id) {
    const e = H.emp[id], err = $("mv_err"), go = $("mv_go");
    if (!e) return;
    if (!navigator.onLine) {
      err.textContent = "You are offline.";
      return;
    }
    let dept = $("mv_dept").value;
    const nd = $("mv_new").value.trim(), title = $("mv_title").value.trim();
    go.disabled = true;
    err.textContent = "";
    if (nd) {
      const r = await addDept(nd);
      if (r.error) {
        go.disabled = false;
        err.textContent = errText(r.error);
        return;
      }
      dept = r.name;
    }
    if (dept === (e.department || "") && title === (e.job_title || "")) {
      go.disabled = false;
      err.textContent = "Nothing changed.";
      return;
    }
    const from = e.department || "\u2014";
    const { error } = await supabase.from("employees").update({ department: dept, job_title: title || null }).eq("id", id);
    go.disabled = false;
    if (error) {
      err.textContent = errText(error);
      return;
    }
    e.department = dept;
    e.job_title = title || null;
    addAudit(who(), "Employee moved", "".concat(e.full_name, ": ").concat(from, " \u2192 ").concat(dept));
    shut();
    toast("".concat(e.full_name, " moved to ").concat(dept), "success");
    await H.loadEmployees();
    renderHR(window._hrTab || "employees");
  };
  async function loadFiles(empId) {
    let q = supabase.from("employee_files").select("*").order("created_at", { ascending: false }).limit(2e3);
    if (empId) q = q.eq("employee_id", empId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  const fileRow = (f, showEmp) => {
    var _a;
    const emp = H.emp[f.employee_id];
    const del = isAdmin() || f.uploaded_by === ((_a = state.profile) == null ? void 0 : _a.id) ? ' <button class="action-btn ghost" onclick="hrFileDel(\''.concat(f.id, '\')" title="Delete">\u2715</button>') : "";
    return "<tr>".concat(showEmp ? "<td>".concat(esc(emp ? emp.full_name : "\u2014"), '<br><small style="color:var(--text-3)">').concat(esc(emp ? emp.staff_no || "" : ""), "</small></td>") : "", "<td><b>").concat(esc(f.category), '</b><br><small style="color:var(--text-3)">').concat(esc(f.title || ""), "</small></td>\n      <td>").concat(esc(f.issued_by || "\u2014"), '<br><small style="color:var(--text-3)">').concat(f.issue_date ? esc(H.date(f.issue_date)) : "", "</small></td>\n      <td><small>").concat(esc(f.file_name || ""), "<br>").concat(size(f.size_bytes), "</small></td><td>").concat(esc(H.date(f.created_at)), '</td>\n      <td style="white-space:nowrap"><button class="action-btn ghost" onclick="hrFileOpen(\'').concat(f.id, "','view')\">View</button> <button class=\"action-btn ghost\" onclick=\"hrFileOpen('").concat(f.id, "','dl')\">\u2B07</button>").concat(del, "</td></tr>");
  };
  const fileTable = (rows, showEmp) => '<div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr>'.concat(showEmp ? "<th>Employee</th>" : "", "<th>Document</th><th>Issued by</th><th>File</th><th>Uploaded</th><th></th></tr></thead><tbody>").concat(rows.length ? rows.map((f) => fileRow(f, showEmp)).join("") : '<tr><td colspan="'.concat(showEmp ? 6 : 5, '" style="text-align:center;color:var(--text-3);padding:24px">No documents on file</td></tr>'), "</tbody></table></div>");
  async function hrRecords() {
    const body = $("hrBody"), kp = $("hrKpis");
    body.innerHTML = '<div style="padding:24px;color:var(--text-2)">Loading\u2026</div>';
    const emps = await H.loadEmployees(), files = await loadFiles();
    window._rf = { files };
    const act = emps.filter((e) => e.status !== "exited"), cv = new Set(files.filter((f) => f.category === CATS[0]).map((f) => f.employee_id)), noCv = act.filter((e) => !cv.has(e.id)).length;
    kp.innerHTML = H.kpi("Files on record", files.length, "", "kpi-blue") + H.kpi("Staff with a CV", act.length - noCv, "of " + act.length + " active", "kpi-green") + H.kpi("CV missing", noCv, "Active staff", noCv ? "kpi-orange" : "kpi-green");
    body.innerHTML = '<div class="erp-tools"><input id="rfQ" placeholder="Search employee, staff no., document, file name\u2026" oninput="hrRfPaint()" style="flex:1;min-width:240px">\n      <select id="rfC" onchange="hrRfPaint()"><option value="">All types</option>'.concat(CATS.map((c) => "<option>".concat(esc(c), "</option>")).join(""), "</select>\n      ").concat(hrCan() ? '<button class="action-btn" onclick="hrFileForm(\'\')">\u2B06 Upload document</button>' : "", '</div><div id="rfOut"></div>');
    hrRfPaint();
  }
  window.hrRfPaint = function() {
    var _a, _b;
    const q = (((_a = $("rfQ")) == null ? void 0 : _a.value) || "").toLowerCase().trim(), c = ((_b = $("rfC")) == null ? void 0 : _b.value) || "", out = $("rfOut");
    if (!out) return;
    const rows = (window._rf && window._rf.files || []).filter((f) => {
      if (c && f.category !== c) return false;
      const e = H.emp[f.employee_id] || {};
      return !q || [e.full_name, e.staff_no, f.category, f.title, f.file_name, f.issued_by].some((v) => String(v || "").toLowerCase().includes(q));
    });
    out.innerHTML = fileTable(rows.slice(0, 300), true) + (rows.length > 300 ? '<div style="text-align:center;color:var(--text-3);margin:8px">Showing the newest 300. Narrow the search.</div>' : "");
  };
  window.hrFiles = async function(id) {
    if (!hrCan()) return toast("HR access required", "error");
    if (!H.emp[id]) await H.loadEmployees();
    const e = H.emp[id];
    if (!e) return;
    openModal("Records \u2014 " + e.full_name, '<div style="padding:12px;color:var(--text-2)">Loading\u2026</div>');
    try {
      const files = await loadFiles(id);
      window._rfOne = { id, files };
      $("modalBody").innerHTML = '<div class="filter-row" style="margin-bottom:10px"><button class="action-btn" onclick="hrFileForm(\''.concat(esc(id), "')\">\u2B06 Upload document</button></div>").concat(fileTable(files, false));
    } catch (x) {
      $("modalBody").innerHTML = miss(x) ? needSql : '<div class="ops-notice">'.concat(esc(errText(x)), "</div>");
    }
  };
  window.hrFileForm = async function(empId) {
    if (!hrCan()) return toast("HR access required", "error");
    if (!Object.keys(H.emp).length) await H.loadEmployees();
    const emps = Object.values(H.emp).filter((e) => e.status !== "exited").sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
    window._rfCtx = empId || "";
    openModal("Upload document", '<div class="fg"><label>Employee *</label><select id="rf_emp" '.concat(empId ? "disabled" : "", '><option value="">\u2014 select \u2014</option>').concat(emps.map((e) => '<option value="'.concat(e.id, '" ').concat(e.id === empId ? "selected" : "", ">").concat(esc(e.full_name), " (").concat(esc(e.staff_no || ""), ")</option>")).join(""), '</select></div>\n      <div class="form-row-2"><div class="fg"><label>Type *</label><select id="rf_cat">').concat(CATS.map((c) => "<option>".concat(esc(c), "</option>")).join(""), '</select></div><div class="fg"><label>Title</label><input id="rf_title" placeholder="e.g. Diploma in Logistics"/></div></div>\n      <div class="form-row-2"><div class="fg"><label>Issued by (institution)</label><input id="rf_by"/></div><div class="fg"><label>Date on document</label><input id="rf_date" type="date"/></div></div>\n      <div class="fg"><label>File * (PDF, photo, Word \u2014 max ').concat(MAX_MB, ' MB)</label><input id="rf_file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"/></div>\n      <div class="fg"><label>Notes</label><textarea id="rf_notes" rows="2"></textarea></div>\n      <div id="rf_err" style="color:var(--red);font-size:12px;min-height:16px"></div>\n      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="action-btn ghost" onclick="hrFileBack()">Cancel</button><button class="action-btn" id="rf_go" onclick="hrFileSave()">Upload</button></div>'));
  };
  window.hrFileBack = function() {
    if (window._rfCtx) hrFiles(window._rfCtx);
    else shut();
  };
  window.hrFileSave = async function() {
    var _a, _b;
    const v = (id) => {
      var _a2;
      return (((_a2 = $("rf_" + id)) == null ? void 0 : _a2.value) || "").trim();
    }, err = $("rf_err"), go = $("rf_go");
    const emp = window._rfCtx || v("emp"), file = $("rf_file").files[0];
    if (!emp) {
      err.textContent = "Choose an employee.";
      return;
    }
    if (!file) {
      err.textContent = "Choose a file.";
      return;
    }
    if (!EXT.test(file.name)) {
      err.textContent = "Only PDF, JPG, PNG, WEBP, DOC or DOCX files.";
      return;
    }
    if (file.size > MAX_MB * 1048576) {
      err.textContent = "File is ".concat(size(file.size), ". The limit is ").concat(MAX_MB, " MB.");
      return;
    }
    if (!navigator.onLine) {
      err.textContent = "You are offline. Uploads need a connection.";
      return;
    }
    go.disabled = true;
    go.textContent = "Uploading\u2026";
    err.textContent = "";
    const path = emp + "/" + Date.now() + "_" + file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || void 0, upsert: false });
    if (up.error) {
      go.disabled = false;
      go.textContent = "Upload";
      err.textContent = errText(up.error);
      return;
    }
    const rec = {
      employee_id: emp,
      category: v("cat"),
      title: v("title") || null,
      issued_by: v("by") || null,
      issue_date: v("date") || null,
      notes: v("notes") || null,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: ((_a = state.profile) == null ? void 0 : _a.id) || null
    };
    const { error } = await supabase.from("employee_files").insert(rec);
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      go.disabled = false;
      go.textContent = "Upload";
      err.textContent = errText(error);
      return;
    }
    addAudit(who(), "Employee document uploaded", "".concat(((_b = H.emp[emp]) == null ? void 0 : _b.full_name) || emp, ": ").concat(rec.category));
    toast("Document saved", "success");
    if (window._rfCtx) hrFiles(window._rfCtx);
    else {
      shut();
      renderHR("records");
    }
  };
  const findFile = (id) => [].concat(window._rf && window._rf.files || [], window._rfOne && window._rfOne.files || []).find((f) => f.id === id);
  window.hrFileOpen = async function(id, mode) {
    var _a;
    const f = findFile(id);
    if (!f) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.file_path, 300, mode === "dl" ? { download: f.file_name } : void 0);
    if (error || !data) return toast(errText(error || { message: "Could not open file" }), "error", 5e3);
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addAudit(who(), mode === "dl" ? "Employee document downloaded" : "Employee document viewed", "".concat(((_a = H.emp[f.employee_id]) == null ? void 0 : _a.full_name) || "", ": ").concat(f.category));
  };
  window.hrFileDel = async function(id) {
    var _a, _b;
    const f = findFile(id);
    if (!f || !confirm('Delete "' + (f.title || f.category) + '" (' + f.file_name + ")? This cannot be undone.")) return;
    const { error } = await supabase.from("employee_files").delete().eq("id", id);
    if (error) return toast(errText(error), "error", 5e3);
    await supabase.storage.from(BUCKET).remove([f.file_path]);
    addAudit(who(), "Employee document deleted", "".concat(((_a = H.emp[f.employee_id]) == null ? void 0 : _a.full_name) || "", ": ").concat(f.category));
    toast("Deleted", "success");
    if (((_b = $("modalOverlay")) == null ? void 0 : _b.classList.contains("active")) && window._rfOne) hrFiles(window._rfOne.id);
    else renderHR("records");
  };
})();
