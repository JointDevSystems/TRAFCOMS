"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
const hrCan = () => isAdmin() || currentRole() === "hr";
const HR_DEPTS = ["Gate & Security", "Yard Operations", "Weighbridge", "Workshop", "Reefer Unit", "Transport & Fleet", "Finance", "HR & Admin", "Management"];
const today10 = () => {
  const d = /* @__PURE__ */ new Date(), p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
};
const HR_ANNUAL_DAYS = 21;
const hrDaysTo = (d) => Math.ceil((new Date(d) - Date.now()) / 864e5);
function hrCalcPayroll(basic, allow, other) {
  const P = window.GARGO_PAYROLL, gross = (Number(basic) || 0) + (Number(allow) || 0);
  const nssf = Math.round(P.nssfRate * Math.min(gross, P.nssfUpper) * 100) / 100;
  const shif = Math.max(P.shifMin, Math.round(gross * P.shifRate * 100) / 100);
  const ahl = Math.round(gross * P.housingRate * 100) / 100;
  let taxable = Math.max(0, gross - nssf - shif - ahl), tax = 0;
  for (const [band, rate] of P.payeBands) {
    const t = Math.min(taxable, band);
    tax += t * rate;
    taxable -= t;
    if (taxable <= 0) break;
  }
  const paye = Math.max(0, Math.round((tax - P.personalRelief) * 100) / 100);
  const net = Math.round((gross - paye - nssf - shif - ahl - (Number(other) || 0)) * 100) / 100;
  return { gross, nssf, shif, housing_levy: ahl, paye, net };
}
function hrPayrollForm() {
  var _a, _b, _c;
  const g = (id) => document.getElementById("bf_" + id), c = hrCalcPayroll((_a = g("basic")) == null ? void 0 : _a.value, (_b = g("allowances")) == null ? void 0 : _b.value, (_c = g("other_deductions")) == null ? void 0 : _c.value);
  Object.entries(c).forEach(([k, v]) => {
    if (g(k)) g(k).value = v.toFixed(2);
  });
}
function hrLeaveForm() {
  var _a, _b;
  const s = (_a = document.getElementById("bf_start_date")) == null ? void 0 : _a.value, e = (_b = document.getElementById("bf_end_date")) == null ? void 0 : _b.value, out = document.getElementById("bf_days");
  if (!s || !e || !out) return;
  let n = 0;
  for (let d = new Date(s); d <= new Date(e); d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w && w < 6) n++;
  }
  out.value = n;
}
function hrCsv(name, rows) {
  const q = (v) => '"' + String(v != null ? v : "").replace(/"/g, '""') + '"';
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
}
const stageBtn = (table, id, field, val, label) => '<button class="action-btn ghost" onclick="hrSetField(\''.concat(table, "','").concat(id, "','").concat(field, "','").concat(val, "')\">").concat(label, "</button> ");
const HR = {
  employees: {
    table: "employees",
    title: "Employee",
    host: "hrBody",
    kpiHost: "hrKpis",
    cols: [["staff_no", "Staff No."], ["full_name", "Name"], ["department", "Department"], ["job_title", "Role"], ["employment_type", "Contract"], ["phone", "Phone"], ["start_date", "Joined", "date"], ["status", "Status", "badge"]],
    fields: [
      { k: "staff_no", l: "Staff No.", r: 1 },
      { k: "full_name", l: "Full Name", r: 1 },
      { k: "id_no", l: "National ID / Passport" },
      { k: "kra_pin", l: "KRA PIN" },
      { k: "nssf_no", l: "NSSF No." },
      { k: "shif_no", l: "SHA / SHIF No." },
      { k: "phone", l: "Phone" },
      { k: "email", l: "Email", t: "email" },
      { k: "dob", l: "Date of Birth", t: "date" },
      { k: "gender", l: "Gender", t: "select", o: ["", "Female", "Male", "Other"] },
      { k: "department", l: "Department", t: "select", o: HR_DEPTS },
      { k: "job_title", l: "Job Title" },
      { k: "employment_type", l: "Contract", t: "select", o: ["Permanent", "Fixed-term", "Casual", "Intern"] },
      { k: "start_date", l: "Start Date", t: "date" },
      { k: "probation_end", l: "Probation Ends", t: "date" },
      { k: "basic_salary", l: "Basic Salary (KSh)", t: "number" },
      { k: "bank_name", l: "Bank" },
      { k: "bank_account", l: "Account No." },
      { k: "next_of_kin", l: "Next of Kin" },
      { k: "next_of_kin_phone", l: "Next of Kin Phone" },
      { k: "address", l: "Residence" },
      { k: "status", l: "Status", t: "select", o: ["active", "on_leave", "suspended", "exited"] }
    ],
    rowActions: (r) => '<button class="action-btn ghost" onclick="hrProfile(\''.concat(r.id, "')\">Profile</button> "),
    extra: () => '<button class="action-btn ghost" onclick="hrExportEmployees()">\u2B07 Export CSV</button>'
  },
  leave: {
    table: "leave_requests",
    title: "Leave Request",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    oninput: "hrLeaveForm()",
    cols: [["employee_id", "Employee", "emp"], ["leave_type", "Type"], ["start_date", "From", "date"], ["end_date", "To", "date"], ["days", "Days"], ["status", "Status", "badge"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "leave_type", l: "Type", t: "select", o: ["Annual", "Sick", "Maternity", "Paternity", "Compassionate", "Study", "Unpaid"] },
      { k: "start_date", l: "From", t: "date", r: 1 },
      { k: "end_date", l: "To", t: "date", r: 1 },
      { k: "days", l: "Working Days", t: "number" },
      { k: "status", l: "Status", t: "select", o: ["pending", "approved", "rejected"] },
      { k: "reason", l: "Reason", t: "textarea" }
    ],
    rowActions: (r) => r.status === "pending" ? stageBtn("leave_requests", r.id, "status", "approved", "\u2713 Approve") + stageBtn("leave_requests", r.id, "status", "rejected", "\u2715 Reject") : "",
    extra: () => '<button class="action-btn ghost" onclick="hrLeaveBalances()">Leave balances</button>'
  },
  attendance: {
    table: "attendance",
    title: "Attendance",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    cols: [["work_date", "Date", "date"], ["employee_id", "Employee", "emp"], ["time_in", "In"], ["time_out", "Out"], ["status", "Status", "badge"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "work_date", l: "Date", t: "date", r: 1, d: today10() },
      { k: "time_in", l: "Time In", t: "time" },
      { k: "time_out", l: "Time Out", t: "time" },
      { k: "status", l: "Status", t: "select", o: ["present", "late", "absent", "leave", "off"] }
    ],
    extra: () => '<button class="action-btn ghost" onclick="hrBulkAttendance()">\u26A1 Mark all present today</button>'
  },
  payroll: {
    table: "payroll",
    title: "Payslip",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    oninput: "hrPayrollForm()",
    cols: [["period", "Period"], ["employee_id", "Employee", "emp"], ["gross", "Gross", "money"], ["paye", "PAYE", "money"], ["nssf", "NSSF", "money"], ["shif", "SHIF", "money"], ["housing_levy", "AHL", "money"], ["net", "Net Pay", "money"], ["status", "Status", "badge"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "period", l: "Period (YYYY-MM)", r: 1, d: today10().slice(0, 7) },
      { k: "basic", l: "Basic", t: "number", r: 1 },
      { k: "allowances", l: "Allowances", t: "number", d: 0 },
      { k: "other_deductions", l: "Other Deductions (loans, advances)", t: "number", d: 0 },
      { k: "gross", l: "Gross", t: "number", ro: 1 },
      { k: "paye", l: "PAYE", t: "number", ro: 1 },
      { k: "nssf", l: "NSSF", t: "number", ro: 1 },
      { k: "shif", l: "SHIF", t: "number", ro: 1 },
      { k: "housing_levy", l: "Housing Levy", t: "number", ro: 1 },
      { k: "net", l: "Net Pay", t: "number", ro: 1 },
      { k: "status", l: "Status", t: "select", o: ["draft", "approved", "paid"] }
    ],
    rowActions: (r) => '<button class="action-btn ghost" onclick="hrPayslipPdf(\''.concat(r.id, "')\">Payslip PDF</button> "),
    extra: () => '<button class="action-btn ghost" onclick="hrRunPayroll()">\u2699 Run payroll</button>'.concat(canApprove() ? '<button class="action-btn ghost" onclick="hrApproveDrafts()">\u2713 Approve drafts</button>' : "", '<button class="action-btn ghost" onclick="hrExportBank()">\u2B07 Bank file</button><button class="action-btn ghost" onclick="hrExportStatutory()">\u2B07 Statutory</button>')
  },
  compliance: {
    table: "staff_documents",
    title: "Document",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    cols: [["employee_id", "Employee", "emp"], ["doc_type", "Document"], ["doc_no", "Number"], ["expiry_date", "Expiry", "expiry"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "doc_type", l: "Document", t: "select", o: ["Driving Licence", "PSV / Badge", "Medical Certificate", "Police Clearance", "Port Pass (KPA)", "First Aid", "Contract", "Other"] },
      { k: "doc_no", l: "Number" },
      { k: "issue_date", l: "Issued", t: "date" },
      { k: "expiry_date", l: "Expiry", t: "date", r: 1 }
    ]
  },
  recruitment: {
    table: "candidates",
    title: "Candidate",
    host: "hrBody",
    kpiHost: "hrKpis",
    cols: [["full_name", "Candidate"], ["position", "Position"], ["department", "Department"], ["phone", "Phone"], ["interview_date", "Interview", "date"], ["expected_salary", "Expected", "money"], ["stage", "Stage", "badge"]],
    fields: [
      { k: "full_name", l: "Full Name", r: 1 },
      { k: "position", l: "Position Applied", r: 1 },
      { k: "department", l: "Department", t: "select", o: HR_DEPTS },
      { k: "phone", l: "Phone" },
      { k: "email", l: "Email", t: "email" },
      { k: "stage", l: "Stage", t: "select", o: ["applied", "shortlisted", "interview", "offer", "hired", "rejected"] },
      { k: "interview_date", l: "Interview Date", t: "date" },
      { k: "expected_salary", l: "Expected Salary (KSh)", t: "number" },
      { k: "notes", l: "Notes", t: "textarea" }
    ],
    rowActions: (r) => ({ applied: "shortlisted", shortlisted: "interview", interview: "offer", offer: "hired" })[r.stage] ? stageBtn("candidates", r.id, "stage", { applied: "shortlisted", shortlisted: "interview", interview: "offer", offer: "hired" }[r.stage], "Advance \u2192") : ""
  },
  performance: {
    table: "performance_reviews",
    title: "Review",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    cols: [["employee_id", "Employee", "emp"], ["period", "Period"], ["rating", "Rating (1\u20135)"], ["reviewer", "Reviewer"], ["status", "Status", "badge"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "period", l: "Period", r: 1, d: "H1 " + (/* @__PURE__ */ new Date()).getFullYear() },
      { k: "rating", l: "Rating (1\u20135)", t: "select", o: ["5", "4", "3", "2", "1"] },
      { k: "reviewer", l: "Reviewer" },
      { k: "goals", l: "Goals & targets", t: "textarea" },
      { k: "strengths", l: "Strengths", t: "textarea" },
      { k: "improvements", l: "Areas to improve", t: "textarea" },
      { k: "status", l: "Status", t: "select", o: ["draft", "submitted", "acknowledged"] }
    ]
  },
  training: {
    table: "training_records",
    title: "Training",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    cols: [["employee_id", "Employee", "emp"], ["course", "Course"], ["provider", "Provider"], ["completed_on", "Completed", "date"], ["expiry_date", "Valid Until", "expiry"], ["cost", "Cost", "money"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "course", l: "Course", t: "select", o: ["Forklift / RTG Operation", "Defensive Driving", "First Aid", "Fire Safety", "Dangerous Goods (IMDG)", "Reefer Handling", "Container Inspection (IICL)", "ISPS Security", "Other"] },
      { k: "provider", l: "Provider" },
      { k: "completed_on", l: "Completed", t: "date", r: 1 },
      { k: "expiry_date", l: "Valid Until", t: "date" },
      { k: "cost", l: "Cost (KSh)", t: "number" }
    ]
  },
  discipline: {
    table: "disciplinary_cases",
    title: "Case",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    cols: [["case_date", "Date", "date"], ["employee_id", "Employee", "emp"], ["action", "Action"], ["summary", "Summary"], ["status", "Status", "badge"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "case_date", l: "Date", t: "date", r: 1, d: today10() },
      { k: "action", l: "Action", t: "select", o: ["Verbal warning", "Written warning", "Final warning", "Suspension", "Dismissal", "No action"] },
      { k: "summary", l: "Summary of incident", t: "textarea", r: 1 },
      { k: "status", l: "Status", t: "select", o: ["open", "closed", "appealed"] }
    ]
  },
  assets: {
    table: "staff_assets",
    title: "Issued Item",
    host: "hrBody",
    kpiHost: "hrKpis",
    needsEmp: true,
    cols: [["employee_id", "Employee", "emp"], ["item", "Item"], ["serial", "Serial / Size"], ["issued_on", "Issued", "date"], ["returned_on", "Returned", "date"], ["status", "Status", "badge"]],
    fields: [
      { k: "employee_id", l: "Employee", t: "emp", r: 1 },
      { k: "item", l: "Item", t: "select", o: ["Safety boots", "Reflective vest", "Helmet", "Uniform", "Radio", "Phone", "Laptop", "Access card", "Keys", "Other"] },
      { k: "serial", l: "Serial / Size" },
      { k: "issued_on", l: "Issued On", t: "date", d: today10() },
      { k: "returned_on", l: "Returned On", t: "date" },
      { k: "status", l: "Status", t: "select", o: ["issued", "returned", "lost"] }
    ],
    rowActions: (r) => r.status === "issued" ? stageBtn("staff_assets", r.id, "status", "returned", "Mark returned") : ""
  }
};
Object.values(HR).forEach((c) => {
  c.canEdit = hrCan;
  c.canDelete = isAdmin;
  c.refresh = () => renderHR(window._hrTab || "overview");
});
HR.payroll.beforeSave = (rec) => {
  Object.assign(rec, hrCalcPayroll(rec.basic, rec.allowances, rec.other_deductions));
  return null;
};
HR.leave.beforeSave = (rec) => rec.end_date < rec.start_date ? "End date is before start date" : null;
const hrK = (l, v, s, c) => GARGO_HUB.kpi(l, v, s, c);
const HR_KPI = {
  employees: (r) => {
    const a = r.filter((e) => e.status !== "exited");
    return hrK("Headcount", a.length, "Active staff", "kpi-gold") + hrK("On Leave", r.filter((e) => e.status === "on_leave").length, "", "kpi-blue") + hrK("On Probation", a.filter((e) => e.probation_end && e.probation_end >= today10()).length, "", "kpi-orange") + hrK("Monthly Basic Payroll", GARGO_HUB.money(a.reduce((s, e) => s + Number(e.basic_salary || 0), 0)), "", "kpi-green");
  },
  leave: (r) => hrK("Pending Approval", r.filter((l) => l.status === "pending").length, "", "kpi-orange") + hrK("Approved", r.filter((l) => l.status === "approved").length, "", "kpi-green") + hrK("Days Approved (YTD)", r.filter((l) => l.status === "approved" && String(l.start_date).startsWith(String((/* @__PURE__ */ new Date()).getFullYear()))).reduce((s, l) => s + Number(l.days || 0), 0), "", "kpi-blue"),
  attendance: (r) => {
    const t = r.filter((a) => a.work_date === today10());
    return hrK("Present Today", t.filter((a) => a.status === "present" || a.status === "late").length, "", "kpi-green") + hrK("Late", t.filter((a) => a.status === "late").length, "", "kpi-orange") + hrK("Absent", t.filter((a) => a.status === "absent").length, "", "kpi-red");
  },
  payroll: (r) => {
    const p = today10().slice(0, 7), m = r.filter((x) => x.period === p), s = (q) => m.reduce((a, x) => a + Number(x[q] || 0), 0);
    return hrK("Gross (".concat(p, ")"), GARGO_HUB.money(s("gross")), "".concat(m.length, " payslips"), "kpi-gold") + hrK("Net Pay", GARGO_HUB.money(s("net")), "", "kpi-green") + hrK("Statutory (PAYE+NSSF+SHIF+AHL)", GARGO_HUB.money(s("paye") + s("nssf") + s("shif") + s("housing_levy")), "Remit by the 9th", "kpi-blue");
  },
  compliance: (r) => {
    const d = (x) => hrDaysTo(x.expiry_date);
    return hrK("Expired", r.filter((x) => d(x) < 0).length, "", "kpi-red") + hrK("Expiring \u2264 30 days", r.filter((x) => d(x) >= 0 && d(x) <= 30).length, "", "kpi-orange") + hrK("Valid", r.filter((x) => d(x) > 30).length, "", "kpi-green");
  },
  recruitment: (r) => ["applied", "shortlisted", "interview", "offer", "hired"].map((s, i) => hrK(s[0].toUpperCase() + s.slice(1), r.filter((c) => c.stage === s).length, "", ["kpi-blue", "kpi-blue", "kpi-gold", "kpi-orange", "kpi-green"][i])).join(""),
  performance: (r) => {
    const rated = r.filter((x) => x.rating);
    const avg = rated.length ? (rated.reduce((s, x) => s + Number(x.rating), 0) / rated.length).toFixed(1) : "\u2014";
    return hrK("Reviews", r.length, "", "kpi-blue") + hrK("Average Rating", avg, "out of 5", "kpi-gold") + hrK("Top Performers", r.filter((x) => Number(x.rating) >= 4).length, "Rated 4\u20135", "kpi-green") + hrK("Needs Support", r.filter((x) => Number(x.rating) && Number(x.rating) <= 2).length, "Rated 1\u20132", "kpi-red");
  },
  training: (r) => hrK("Records", r.length, "", "kpi-blue") + hrK("Expiring \u2264 60 days", r.filter((x) => x.expiry_date && hrDaysTo(x.expiry_date) >= 0 && hrDaysTo(x.expiry_date) <= 60).length, "Renew soon", "kpi-orange") + hrK("Expired", r.filter((x) => x.expiry_date && hrDaysTo(x.expiry_date) < 0).length, "", "kpi-red") + hrK("Spend (YTD)", GARGO_HUB.money(r.reduce((s, x) => s + Number(x.cost || 0), 0)), "", "kpi-gold"),
  discipline: (r) => hrK("Open Cases", r.filter((x) => x.status === "open").length, "", "kpi-orange") + hrK("Warnings (YTD)", r.filter((x) => /warning/i.test(x.action || "")).length, "", "kpi-gold") + hrK("Suspensions / Dismissals", r.filter((x) => /Suspension|Dismissal/.test(x.action || "")).length, "", "kpi-red"),
  assets: (r) => hrK("Items Issued", r.filter((x) => x.status === "issued").length, "With staff", "kpi-blue") + hrK("Returned", r.filter((x) => x.status === "returned").length, "", "kpi-green") + hrK("Lost", r.filter((x) => x.status === "lost").length, "", "kpi-red")
};
const HR_TABS = [["overview", "Overview"], ["employees", "Employees"], ["leave", "Leave"], ["attendance", "Attendance"], ["payroll", "Payroll"], ["compliance", "Licences & Compliance"], ["recruitment", "Recruitment"], ["performance", "Performance"], ["training", "Training"], ["discipline", "Discipline"], ["assets", "Assets & PPE"]];
function hrBuildTabs() {
  const el = document.getElementById("hrTabs");
  if (!el) return;
  el.classList.add("hr-tabs-scroll");
  el.innerHTML = HR_TABS.map(([id, l]) => '<button class="filter-btn'.concat(id === (window._hrTab || "overview") ? " active" : "", '" onclick="renderHR(\'').concat(id, "',this)\">").concat(l, "</button>")).join("");
}
async function renderHR(tab, btn) {
  tab = tab || "overview";
  window._hrTab = tab;
  if (!document.querySelector("#hrTabs [onclick^=\"renderHR('overview'\"]")) hrBuildTabs();
  if (btn) document.querySelectorAll("#hrTabs .filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
  if (tab === "overview") return hrOverview();
  return GARGO_HUB.render(HR[tab], HR_KPI[tab]);
}
async function hrOverview() {
  const body = document.getElementById("hrBody"), kp = document.getElementById("hrKpis");
  body.innerHTML = '<div style="padding:24px;color:var(--text-2)">Loading\u2026</div>';
  const emps = await GARGO_HUB.loadEmployees();
  const [lv, at, dc, pr] = await Promise.all(["leave_requests", "attendance", "staff_documents", "payroll"].map((t2) => GARGO_HUB.load(t2)));
  const act = emps.filter((e) => e.status !== "exited"), t = today10(), pm = t.slice(0, 7);
  const present = at.filter((a) => a.work_date === t && ["present", "late"].includes(a.status)).length;
  const pend = lv.filter((l) => l.status === "pending");
  const docsBad = dc.filter((d) => d.expiry_date && hrDaysTo(d.expiry_date) <= 30).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  const probation = act.filter((e) => e.probation_end && e.probation_end >= t && hrDaysTo(e.probation_end) <= 30);
  const cost = pr.filter((p) => p.period === pm).reduce((s, p) => s + Number(p.gross || 0), 0) || act.reduce((s, e) => s + Number(e.basic_salary || 0), 0);
  kp.innerHTML = hrK("Headcount", act.length, "".concat(emps.length - act.length, " exited"), "kpi-blue") + hrK("Present Today", present, act.length ? Math.round(present / act.length * 100) + "% attendance" : "", "kpi-green") + hrK("Pending Leave", pend.length, "Awaiting approval", pend.length ? "kpi-orange" : "kpi-green") + hrK("Compliance Alerts", docsBad.length, "Expired or due \u2264 30 d", docsBad.length ? "kpi-red" : "kpi-green") + hrK("Monthly Payroll Cost", GARGO_HUB.money(cost), pm, "kpi-gold");
  const grp = (arr, f) => Object.entries(arr.reduce((m, x) => (m[f(x) || "Unassigned"] = (m[f(x) || "Unassigned"] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
  const bars = (list, tot) => list.map(([n, v]) => '<div style="padding:6px 0"><div class="hr-row" style="border:0;padding:0"><span>'.concat(esc(n), "</span><b>").concat(v, '</b></div><div class="hr-bar"><i style="width:').concat(Math.round(v / (tot || 1) * 100), '%"></i></div></div>')).join("") || '<div style="color:var(--text-3)">No data</div>';
  const nm = (id) => {
    var _a;
    return esc(((_a = GARGO_HUB.emp[id]) == null ? void 0 : _a.full_name) || "\u2014");
  };
  const mon = (/* @__PURE__ */ new Date()).getMonth(), bdays = act.filter((e) => e.dob && new Date(e.dob).getMonth() === mon).sort((a, b) => new Date(a.dob).getDate() - new Date(b.dob).getDate());
  const anniv = act.filter((e) => e.start_date && new Date(e.start_date).getMonth() === mon && new Date(e.start_date).getFullYear() < (/* @__PURE__ */ new Date()).getFullYear());
  body.innerHTML = '<div class="hr-grid">\n    <div class="hr-card"><h4>Headcount by department <small>'.concat(act.length, " active</small></h4>").concat(bars(grp(act, (e) => e.department), act.length), '</div>\n    <div class="hr-card"><h4>Contract mix</h4>').concat(bars(grp(act, (e) => e.employment_type), act.length), '</div>\n    <div class="hr-card"><h4>Leave awaiting approval <small>').concat(pend.length, "</small></h4>").concat(pend.slice(0, 6).map((l) => '<div class="hr-row"><span><b>'.concat(nm(l.employee_id), "</b><br>").concat(esc(l.leave_type), " \xB7 ").concat(GARGO_HUB.date(l.start_date), " \u2013 ").concat(GARGO_HUB.date(l.end_date), "</span><span>").concat(hrCan() ? stageBtn("leave_requests", l.id, "status", "approved", "\u2713") + stageBtn("leave_requests", l.id, "status", "rejected", "\u2715") : "", "</span></div>")).join("") || '<div style="color:var(--text-3)">Nothing pending</div>', '</div>\n    <div class="hr-card"><h4>Compliance alerts <small>').concat(docsBad.length, "</small></h4>").concat(docsBad.slice(0, 7).map((d) => '<div class="hr-row"><span><b>'.concat(nm(d.employee_id), "</b><br>").concat(esc(d.doc_type), "</span><span>").concat(GARGO_HUB.cell(d, ["expiry_date", "", "expiry"]), "</span></div>")).join("") || '<div style="color:var(--text-3)">All documents valid</div>', '</div>\n    <div class="hr-card"><h4>Probation ending \u2264 30 days <small>').concat(probation.length, "</small></h4>").concat(probation.map((e) => '<div class="hr-row"><span><b>'.concat(esc(e.full_name), "</b><br>").concat(esc(e.department || ""), "</span><span>").concat(GARGO_HUB.date(e.probation_end), "</span></div>")).join("") || '<div style="color:var(--text-3)">None</div>', '</div>\n    <div class="hr-card"><h4>This month <small>').concat((/* @__PURE__ */ new Date()).toLocaleString("en-KE", { month: "long" }), "</small></h4>").concat(bdays.map((e) => '<div class="hr-row"><span>\u{1F382} <b>'.concat(esc(e.full_name), "</b></span><span>").concat(new Date(e.dob).getDate(), "</span></div>")).join("")).concat(anniv.map((e) => '<div class="hr-row"><span>\u{1F3C5} <b>'.concat(esc(e.full_name), "</b> work anniversary</span><span>").concat((/* @__PURE__ */ new Date()).getFullYear() - new Date(e.start_date).getFullYear(), " yr</span></div>")).join("") || (bdays.length ? "" : '<div style="color:var(--text-3)">No birthdays or anniversaries</div>'), "</div>\n  </div>");
}
async function hrSetField(table, id, field, val) {
  var _a;
  if (!hrCan()) return toast("HR access required", "error");
  const { error } = await supabase.from(table).update({ [field]: val }).eq("id", id);
  if (error) return toast(error.message, "error");
  addAudit((_a = state.profile) == null ? void 0 : _a.username, "HR update", "".concat(table, " ").concat(id, ": ").concat(field, "=").concat(val));
  toast("Updated", "success");
  renderHR(window._hrTab);
}
async function hrProfile(id) {
  await GARGO_HUB.loadEmployees();
  const e = GARGO_HUB.emp[id];
  if (!e) return;
  const [lv, dc, as, pr] = await Promise.all(["leave_requests", "staff_documents", "staff_assets", "payroll"].map((t) => GARGO_HUB.load(t)));
  const mine = (a) => a.filter((x) => x.employee_id === id), yr = String((/* @__PURE__ */ new Date()).getFullYear());
  const used = mine(lv).filter((l) => l.status === "approved" && l.leave_type === "Annual" && String(l.start_date).startsWith(yr)).reduce((s, l) => s + Number(l.days || 0), 0);
  const F = (l, v) => "<div><span>".concat(l, "</span>").concat(esc(v || "\u2014"), "</div>");
  const tenure = e.start_date ? ((Date.now() - new Date(e.start_date)) / 3156e7).toFixed(1) + " yrs" : "\u2014";
  openModal(esc(e.full_name), '<div class="hr-profile">'.concat(F("Staff No.", e.staff_no)).concat(F("Department", e.department)).concat(F("Job title", e.job_title)).concat(F("Contract", e.employment_type)).concat(F("Tenure", tenure)).concat(F("Phone", e.phone)).concat(F("National ID", e.id_no)).concat(F("KRA PIN", e.kra_pin)).concat(F("NSSF", e.nssf_no)).concat(F("SHIF", e.shif_no)).concat(F("Bank", (e.bank_name || "") + " " + (e.bank_account || ""))).concat(F("Next of kin", (e.next_of_kin || "") + " " + (e.next_of_kin_phone || "")), '</div>\n    <div class="hr-row" style="margin-top:12px"><span>Annual leave balance</span><b>').concat(Math.max(0, HR_ANNUAL_DAYS - used), " of ").concat(HR_ANNUAL_DAYS, ' days</b></div>\n    <div class="hr-row"><span>Documents on file</span><b>').concat(mine(dc).length).concat(mine(dc).some((d) => hrDaysTo(d.expiry_date) < 0) ? " \xB7 has expired" : "", '</b></div>\n    <div class="hr-row"><span>Items issued</span><b>').concat(mine(as).filter((a) => a.status === "issued").length, '</b></div>\n    <div class="hr-row"><span>Last payslip</span><b>').concat(mine(pr)[0] ? mine(pr)[0].period + " \xB7 " + GARGO_HUB.money(mine(pr)[0].net) : "\u2014", "</b></div>"));
}
async function hrLeaveBalances() {
  await GARGO_HUB.loadEmployees();
  const lv = await GARGO_HUB.load("leave_requests"), yr = String((/* @__PURE__ */ new Date()).getFullYear());
  const rows = Object.values(GARGO_HUB.emp).filter((e) => e.status !== "exited").map((e) => {
    const u = lv.filter((l) => l.employee_id === e.id && l.status === "approved" && l.leave_type === "Annual" && String(l.start_date).startsWith(yr)).reduce((s, l) => s + Number(l.days || 0), 0);
    return "<tr><td>".concat(esc(e.full_name), "</td><td>").concat(HR_ANNUAL_DAYS, "</td><td>").concat(u, "</td><td><b>").concat(HR_ANNUAL_DAYS - u, "</b></td></tr>");
  }).join("");
  openModal("Annual leave balances " + yr, '<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data-table"><thead><tr><th>Employee</th><th>Entitled</th><th>Taken</th><th>Balance</th></tr></thead><tbody>'.concat(rows, "</tbody></table></div>"));
}
async function hrBulkAttendance() {
  if (!hrCan()) return;
  const emps = (await GARGO_HUB.loadEmployees()).filter((e) => e.status === "active"), have = new Set((await GARGO_HUB.load("attendance")).filter((a) => a.work_date === today10()).map((a) => a.employee_id));
  const rows = emps.filter((e) => !have.has(e.id)).map((e) => {
    var _a;
    return { employee_id: e.id, work_date: today10(), status: "present", created_by: (_a = state.profile) == null ? void 0 : _a.id };
  });
  if (!rows.length) return toast("Everyone already has a record for today", "info");
  const { error } = await supabase.from("attendance").insert(rows);
  if (error) return toast(error.message, "error");
  toast("".concat(rows.length, " marked present"), "success");
  renderHR("attendance");
}
async function hrRunPayroll() {
  var _a;
  const period = prompt("Generate draft payslips for which month? (YYYY-MM)", today10().slice(0, 7));
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return;
  const emps = (await GARGO_HUB.loadEmployees()).filter((e) => e.status === "active" && Number(e.basic_salary) > 0);
  const have = new Set((await GARGO_HUB.load("payroll")).filter((p) => p.period === period).map((p) => p.employee_id));
  const rows = emps.filter((e) => !have.has(e.id)).map((e) => {
    var _a2;
    return __spreadValues({ employee_id: e.id, period, basic: e.basic_salary, allowances: 0, other_deductions: 0, status: "draft", created_by: (_a2 = state.profile) == null ? void 0 : _a2.id }, hrCalcPayroll(e.basic_salary, 0, 0));
  });
  if (!rows.length) return toast("Nothing to generate \u2014 all active staff already have payslips for " + period, "info");
  const { error } = await supabase.from("payroll").insert(rows);
  if (error) return toast(error.message, "error");
  addAudit((_a = state.profile) == null ? void 0 : _a.username, "Payroll run", "".concat(period, ": ").concat(rows.length, " draft payslips"));
  toast("".concat(rows.length, " draft payslips created"), "success");
  renderHR("payroll");
}
async function hrApproveDrafts() {
  var _a;
  if (!canApprove()) return toast("Only the Finance Manager or an Administrator can approve payroll. HR prepares the run; Finance approves it.", "error");
  const period = prompt("Approve all draft payslips for which month? (YYYY-MM)", today10().slice(0, 7));
  if (!period || !confirm("Approve every draft payslip for ".concat(period, "?"))) return;
  const { error } = await supabase.from("payroll").update({ status: "approved" }).eq("period", period).eq("status", "draft");
  if (error) return toast(error.message, "error");
  addAudit((_a = state.profile) == null ? void 0 : _a.username, "Payroll approved", period);
  toast("Drafts approved", "success");
  renderHR("payroll");
}
const hrPeriodRows = (msg) => {
  const p = prompt(msg, today10().slice(0, 7));
  return p ? (GARGO_HUB.rows.payroll || []).filter((r) => r.period === p).map((r) => [r, p]) : [];
};
function hrExportBank() {
  const rows = hrPeriodRows("Bank file for which month? (YYYY-MM)").filter(([r]) => r.status !== "draft");
  if (!rows.length) return toast("No approved or paid payslips for that month", "info");
  hrCsv("bank-payments-".concat(rows[0][1], ".csv"), [["Staff No", "Name", "Bank", "Account", "Net Pay"]].concat(rows.map(([r]) => {
    const e = GARGO_HUB.emp[r.employee_id] || {};
    return [e.staff_no, e.full_name, e.bank_name, e.bank_account, r.net];
  })));
}
function hrExportStatutory() {
  const rows = hrPeriodRows("Statutory returns for which month? (YYYY-MM)");
  if (!rows.length) return toast("No payslips for that month", "info");
  hrCsv("statutory-".concat(rows[0][1], ".csv"), [["Name", "KRA PIN", "NSSF No", "SHIF No", "Gross", "PAYE", "NSSF", "SHIF", "Housing Levy"]].concat(rows.map(([r]) => {
    const e = GARGO_HUB.emp[r.employee_id] || {};
    return [e.full_name, e.kra_pin, e.nssf_no, e.shif_no, r.gross, r.paye, r.nssf, r.shif, r.housing_levy];
  })));
}
async function hrExportEmployees() {
  const rows = await GARGO_HUB.loadEmployees();
  hrCsv("employees.csv", [["Staff No", "Name", "Department", "Title", "Contract", "Phone", "Start", "Status"]].concat(rows.map((e) => [e.staff_no, e.full_name, e.department, e.job_title, e.employment_type, e.phone, e.start_date, e.status])));
}
function hrPayslipPdf(id) {
  const r = (GARGO_HUB.rows.payroll || []).find((x) => x.id === id), e = GARGO_HUB.emp[r == null ? void 0 : r.employee_id] || {};
  if (!r || !window.jspdf) return toast("PDF library not loaded", "error");
  const doc = new window.jspdf.jsPDF();
  let y = window.ghPdfLetterhead(doc, 14, 10, 182) + 8;
  doc.setFont(void 0, "bold");
  doc.setFontSize(14);
  doc.setTextColor(10, 42, 122);
  doc.text("PAYSLIP \u2014 " + r.period, 14, y);
  y += 9;
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.setFont(void 0, "normal");
  [["Employee", e.full_name], ["Staff No.", e.staff_no], ["Department", e.department], ["KRA PIN", e.kra_pin], ["NSSF No.", e.nssf_no], ["SHIF No.", e.shif_no]].forEach(([a, b]) => {
    doc.text(a + ":", 14, y);
    doc.text(String(b || "\u2014"), 55, y);
    y += 6;
  });
  y += 4;
  doc.setDrawColor(255, 106, 10);
  doc.line(14, y, 196, y);
  y += 7;
  const money = (n) => Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 });
  [["Basic salary", r.basic], ["Allowances", r.allowances], ["Gross pay", r.gross], ["PAYE", -r.paye], ["NSSF", -r.nssf], ["SHIF", -r.shif], ["Affordable Housing Levy", -r.housing_levy], ["Other deductions", -r.other_deductions]].forEach(([a, b]) => {
    doc.text(a, 14, y);
    doc.text(money(b), 196, y, { align: "right" });
    y += 6.5;
  });
  y += 2;
  doc.line(14, y, 196, y);
  y += 8;
  doc.setFont(void 0, "bold");
  doc.setFontSize(12);
  doc.text("NET PAY (KSh)", 14, y);
  doc.text(money(r.net), 196, y, { align: "right" });
  doc.save("payslip-".concat(e.staff_no || "staff", "-").concat(r.period, ".pdf"));
}
