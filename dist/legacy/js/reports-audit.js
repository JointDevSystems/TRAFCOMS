"use strict";
function requireFinanceReport(tab, btn) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  renderReport("revenue");
  document.querySelectorAll("#sec-reports .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}
function renderWorkAnalysis(period, btn) {
  if (btn) {
    document.querySelectorAll("#sec-workanalysis .filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }
  const db = state.db;
  let trips = db.trips;
  const now = Date.now();
  if (period === "today") trips = trips.filter((t) => new Date(t.startTime).toDateString() === (/* @__PURE__ */ new Date()).toDateString());
  else if (period === "week") trips = trips.filter((t) => now - new Date(t.startTime) < 7 * 864e5);
  else if (period === "month") trips = trips.filter((t) => now - new Date(t.startTime) < 30 * 864e5);
  const workTypes = {};
  trips.forEach((t) => {
    workTypes[t.workType] = (workTypes[t.workType] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(workTypes), 1);
  const kpis = document.getElementById("waKpis");
  if (kpis) {
    kpis.innerHTML = "".concat(kpiCard("Total Trips", trips.length, "", "kpi-gold"), " ").concat(kpiCard("Work Types", Object.keys(workTypes).length, "", "kpi-blue"), " ").concat(kpiCard("Completed", trips.filter((t) => t.status === "completed").length, "", "kpi-green"), " ").concat(kpiCard("Delayed", trips.filter((t) => t.status === "delayed").length, "", "kpi-red"));
  }
  const vol = document.getElementById("waVolumeChart");
  if (vol) {
    vol.innerHTML = Object.entries(workTypes).sort((a, b) => b[1] - a[1]).map(([wt, cnt]) => '<div class="wt-bar-item"><div class="wt-bar-label" title="'.concat(wt, '">').concat(wt, '</div><div class="wt-bar-track"><div class="wt-bar-fill" style="width:').concat(Math.round(cnt / maxCount * 100), '%"></div></div><div class="wt-bar-count">').concat(cnt, "</div></div>")).join("") || '<div style="padding:12px;color:var(--text-3)">No data for this period</div>';
  }
  const matrixData = Object.entries(workTypes).map(([wt, cnt]) => {
    var _a, _b;
    const wtTrips = trips.filter((t) => t.workType === wt);
    const onTime = wtTrips.filter((t) => t.status === "completed" || t.status === "active").length;
    const onTimePct = wtTrips.length ? Math.round(onTime / wtTrips.length * 100) : 0;
    const truckCounts = {};
    wtTrips.forEach((t) => {
      truckCounts[t.truckId] = (truckCounts[t.truckId] || 0) + 1;
    });
    const topTruckId = (_a = Object.entries(truckCounts).sort((a, b) => b[1] - a[1])[0]) == null ? void 0 : _a[0];
    return { wt, cnt, onTimePct, topTruck: topTruckId ? ((_b = state.db.trucks.find((t) => t.id === topTruckId)) == null ? void 0 : _b.reg) || "\u2014" : "\u2014" };
  });
  const mat = document.getElementById("waMatrix");
  if (mat) {
    mat.innerHTML = matrixData.map((m) => "<tr><td>".concat(m.wt, '</td><td class="mono" style="text-align:center">').concat(m.cnt, '</td><td class="mono" style="text-align:center">~').concat(Math.round(1 + Math.random() * 2), 'h</td><td class="mono" style="text-align:center;color:').concat(m.onTimePct > 70 ? "var(--green)" : "var(--amber)", '">').concat(m.onTimePct, '%</td><td class="mono" style="color:var(--gold)">').concat(m.topTruck, "</td></tr>")).join("") || '<tr><td colspan="5" class="empty-td">No data</td></tr>';
  }
  const outwardTrips = trips.filter((t) => isOutwardWorkType(t.workType));
  const outwardTypeCounts = {};
  OUTWARD_TYPES.forEach((w) => {
    outwardTypeCounts[w] = 0;
  });
  outwardTrips.forEach((t) => {
    const key = t.outwardType || "Unclassified";
    outwardTypeCounts[key] = (outwardTypeCounts[key] || 0) + 1;
  });
  const outwardMax = Math.max(...Object.values(outwardTypeCounts), 1);
  const outwardChart = document.getElementById("waOutwardChart");
  if (outwardChart) {
    outwardChart.innerHTML = Object.entries(outwardTypeCounts).sort((a, b) => b[1] - a[1]).map(([wt, cnt]) => '<div class="wt-bar-item"><div class="wt-bar-label" title="'.concat(sanitize(wt), '">').concat(sanitize(wt), '</div><div class="wt-bar-track"><div class="wt-bar-fill" style="width:').concat(Math.round(cnt / outwardMax * 100), '%"></div></div><div class="wt-bar-count">').concat(cnt, "</div></div>")).join("") || '<div style="padding:12px;color:var(--text-3)">No outward trips for this period</div>';
  }
}
function renderReport(tab, btn) {
  if (btn) {
    document.querySelectorAll("#sec-reports .filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }
  const db = state.db;
  const out = document.getElementById("reportContent");
  if (!out) return;
  if (tab === "overview") {
    out.innerHTML = '<div class="two-col-grid"><div class="report-block"><h3>Fleet Overview</h3>'.concat(reportRow("Total Trucks", db.trucks.length)).concat(reportRow("Available", db.trucks.filter((t) => t.status === "available").length)).concat(reportRow("On Trip", db.trucks.filter((t) => t.status === "on_trip").length)).concat(reportRow("Breakdown/Maintenance", db.trucks.filter((t) => ["breakdown", "maintenance"].includes(t.status)).length), '</div><div class="report-block"><h3>Operations</h3>').concat(reportRow("Trips Today", db.trips.filter((t) => new Date(t.startTime).toDateString() === (/* @__PURE__ */ new Date()).toDateString()).length)).concat(reportRow("Active Trips", db.trips.filter((t) => t.status === "active").length)).concat(reportRow("Completed (All)", db.trips.filter((t) => t.status === "completed").length)).concat(reportRow("Total Distance (All)", fmt(db.trips.reduce((s, t) => s + t.distance, 0)) + " km"), '</div><div class="report-block"><h3>Fuel</h3>').concat(reportRow("Total Fills", db.fuel.filter((f) => f.litres > 0).length)).concat(reportRow("Total Litres", fmt(db.fuel.reduce((s, f) => s + f.litres, 0)) + " L")).concat(reportRow("Total Cost", fmtKsh(db.fuel.filter((f) => f.litres > 0).reduce((s, f) => s + fuelLogTotal(f), 0))), '</div><div class="report-block"><h3>Compliance</h3>').concat(reportRow("Open Maintenance", db.maintenance.filter((m) => m.status === "open").length)).concat(reportRow("Pending Requisitions", db.requisitions.filter((r) => r.status === "pending").length)).concat(reportRow("Shutouts Open", db.shutouts.filter((s) => s.status === "open").length), "</div></div>");
  } else if (tab === "fleet") {
    out.innerHTML = '<div class="report-block"><h3>Fleet Utilisation</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Truck</th><th>Status</th><th>Fuel</th><th>Mileage</th><th>Trips</th><th>Next Service</th></tr></thead><tbody>'.concat(db.trucks.map((t) => '<tr><td class="mono" style="color:var(--gold)">'.concat(t.reg, "</td><td>").concat(sbadge(t.status), "</td><td>").concat(truckFuelBar(t, "width:80px"), '<div style="font-size:9px;color:var(--text-3);margin-top:3px">').concat(truckFuelLabel(t), '</div></td><td class="mono">').concat(fmt(t.mileage), ' km</td><td class="mono">').concat(db.trips.filter((tr) => tr.truckId === t.id).length, '</td><td style="color:').concat(new Date(t.nextService) < Date.now() ? "var(--red)" : "var(--text-2)", '" class="mono">').concat(fmtDate(t.nextService), "</td></tr>")).join(""), "</tbody></table></div></div>");
  } else if (tab === "drivers") {
    out.innerHTML = '<div class="report-block"><h3>Driver Performance</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Driver</th><th>Status</th><th>Trips Today</th><th>Licence Exp.</th></tr></thead><tbody>'.concat(db.drivers.map((d) => "<tr><td>".concat(d.name, "</td><td>").concat(sbadge(d.status), '</td><td class="mono" style="text-align:center">').concat(d.tripsToday, '</td><td style="color:').concat(new Date(d.licenceExp) - Date.now() < 90 * 864e5 ? "var(--amber)" : "var(--text-2)", '" class="mono">').concat(fmtDate(d.licenceExp), "</td></tr>")).join(""), "</tbody></table></div></div>");
  } else if (tab === "maintenance") {
    const totalCost = db.maintenance.reduce((s, m) => s + m.cost, 0);
    out.innerHTML = '<div class="report-block"><h3>Maintenance Summary</h3>'.concat(reportRow("Total Issues", db.maintenance.length)).concat(reportRow("Open", db.maintenance.filter((m) => m.status === "open").length)).concat(reportRow("In Progress", db.maintenance.filter((m) => m.status === "in_progress").length)).concat(reportRow("Resolved", db.maintenance.filter((m) => m.status === "resolved").length)).concat(reportRow("Total Cost", fmtKsh(totalCost)), '</div><div class="report-block" style="margin-top:14px"><h3>Issues by Priority</h3>').concat(["critical", "high", "medium", "low"].map((p) => reportRow(p.charAt(0).toUpperCase() + p.slice(1), db.maintenance.filter((m) => m.priority === p).length)).join(""), "</div>");
  } else if (tab === "fuel") {
    out.innerHTML = '<div class="report-block"><h3>Fuel Report</h3>'.concat(reportRow("Total Fill-ups", db.fuel.filter((f) => f.litres > 0).length)).concat(reportRow("Total Litres", fmt(db.fuel.reduce((s, f) => s + f.litres, 0)) + " L")).concat(reportRow("Fuel Purchases", fmtKsh(db.fuel.filter((f) => f.litres > 0).reduce((s, f) => s + fuelLogTotal(f), 0))) + reportRow("Trip Payments (" + db.fuel.filter((f) => !(f.litres > 0)).length.toLocaleString() + ")", fmtKsh(db.fuel.filter((f) => !(f.litres > 0)).reduce((s, f) => s + fuelLogTotal(f), 0)))).concat(reportRow("Avg Price/Litre", "KSh " + (db.fuel.filter((f) => f.litres > 0).reduce((s, f) => s + fuelLogTotal(f), 0) / Math.max(db.fuel.reduce((s, f) => s + f.litres, 0), 1)).toFixed(2)), "</div>");
  } else if (tab === "revenue") {
    if (!isAdmin()) {
      toast("Admin rights required", "error");
      return;
    }
    const inv = db.invoices;
    out.innerHTML = '<div class="report-block"><h3>Revenue Report \u2014 CONFIDENTIAL</h3>'.concat(reportRow("Total Invoiced", fmtKsh(inv.reduce((s, i) => s + i.total, 0)))).concat(reportRow("Collected", fmtKsh(inv.reduce((s, i) => s + i.paid, 0)))).concat(reportRow("Outstanding", fmtKsh(inv.reduce((s, i) => s + (i.total - i.paid), 0)))).concat(reportRow("Overdue", fmtKsh(inv.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0))), "</div>");
  } else if (tab === "depops") {
    out.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
    renderReportDepOps(out);
  }
}
async function renderReportDepOps(out) {
  try {
    const [zones, awaitingSurvey, surveyedAwaitingAlloc, escalated] = await Promise.all([
      window.bookingDocs.listZones(),
      window.bookingDocs.awaitingSurveyBookings(),
      window.bookingDocs.surveyedAwaitingAllocation(),
      window.bookingDocs.escalatedBookings()
    ]);
    const inStorage = await depOpsRepatriationEligibleBookings();
    const totalCap = zones.reduce((s, z) => s + (z.capacity_teu || 0), 0);
    const totalOcc = zones.reduce((s, z) => s + (z.occupied_teu || 0), 0);
    const ic = state.db.interchange || [];
    const icPending = ic.filter((i) => i.status === "pending").length;
    const icApproved = ic.filter((i) => i.status === "approved").length;
    const icReconciled = ic.filter((i) => i.status === "reconciled").length;
    const icFromSurvey = ic.filter((i) => /Auto-generated from survey/.test(i.notes || "")).length;
    const icFlagged = ic.filter((i) => i.flaggedForReview).length;
    const tripsFlagged = (state.db.trips || []).filter((t) => t.flaggedForReview).length;
    if (!out || !out.isConnected) return;
    out.innerHTML = '<div class="two-col-grid">\n      <div class="report-block">\n        <h3>Depot Storage Pipeline</h3>\n        '.concat(reportRow("Awaiting Survey", awaitingSurvey.length), "\n        ").concat(reportRow("Surveyed \u2014 Awaiting Allocation", surveyedAwaitingAlloc.length), "\n        ").concat(reportRow("Escalated (Joint Survey Needed)", escalated.length), "\n        ").concat(reportRow("Currently In Storage", inStorage.length), '\n      </div>\n      <div class="report-block">\n        <h3>Zone Occupancy</h3>\n        ').concat(reportRow("Total Capacity", totalCap + " TEU"), "\n        ").concat(reportRow("Occupied", totalOcc + " TEU"), "\n        ").concat(reportRow("Free", Math.max(totalCap - totalOcc, 0) + " TEU"), "\n        ").concat(reportRow("Zones Configured", zones.length), '\n      </div>\n      <div class="report-block">\n        <h3>Interchange</h3>\n        ').concat(reportRow("Pending", icPending), "\n        ").concat(reportRow("Approved", icApproved), "\n        ").concat(reportRow("Reconciled", icReconciled), "\n        ").concat(reportRow("Generated From Survey", icFromSurvey + " / " + ic.length), "\n        ").concat(reportRow("Flagged for Review (Interchange)", icFlagged), "\n        ").concat(reportRow("Flagged for Review (Dispatch)", tripsFlagged), "\n      </div>\n      <div class=\"report-block\">\n        <h3>Jump To</h3>\n        <div style=\"display:flex;flex-direction:column;gap:8px;margin-top:6px\">\n          <button class=\"action-btn ghost\" onclick=\"showSection('depops', document.querySelector('[data-section=\\'depops\\']'))\">Open DepOps \u2192</button>\n          <button class=\"action-btn ghost\" onclick=\"showSection('interchange', document.querySelector('[data-section=\\'interchange\\']'))\">Open Interchange \u2192</button>\n        </div>\n      </div>\n    </div>");
  } catch (e) {
    if (out && out.isConnected) out.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function reportRow(label, val) {
  return '<div class="report-row"><span class="label">'.concat(label, '</span><span class="val">').concat(val, "</span></div>");
}
const trc = { tripRows: [], auditRows: [], period: "hourly", auditPeriod: "today" };
function trcSwitchTab(tab, btn) {
  document.querySelectorAll("#sec-tripreports > .sec-toolbar .filter-row .filter-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const tripsTab = document.getElementById("trcTab-trips");
  const auditTab = document.getElementById("trcTab-audit");
  if (tripsTab) tripsTab.style.display = tab === "trips" ? "" : "none";
  if (auditTab) auditTab.style.display = tab === "audit" ? "" : "none";
}
function trcInit() {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  trcPopulateFilterOptions();
  if (!document.getElementById("trcFrom").value) {
    trcSetPeriod("all", document.querySelector("#trcTab-trips .trc-period-row .filter-btn"));
  }
  if (!document.getElementById("trcAuditFrom").value) {
    trcSetAuditPeriod("today", document.querySelector("#trcTab-audit .trc-period-row .filter-btn"));
  }
}
function trcPopulateFilterOptions() {
  const truckSel = document.getElementById("trcTruck");
  if (truckSel && truckSel.options.length <= 1) {
    [...state.db.trucks].sort((a, b) => a.reg.localeCompare(b.reg)).forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.reg;
      truckSel.appendChild(o);
    });
  }
  const driverSel = document.getElementById("trcDriver");
  if (driverSel && driverSel.options.length <= 1) {
    [...state.db.drivers].sort((a, b) => a.name.localeCompare(b.name)).forEach((d) => {
      const o = document.createElement("option");
      o.value = d.id;
      o.textContent = d.name;
      driverSel.appendChild(o);
    });
  }
  const statusSel = document.getElementById("trcStatus");
  if (statusSel && statusSel.options.length <= 1) {
    TRIP_ALL_STATUSES.forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s.replace("_", " ");
      statusSel.appendChild(o);
    });
  }
  const workTypeSel = document.getElementById("trcWorkType");
  if (workTypeSel && workTypeSel.options.length <= 1) {
    [...new Set(state.db.trips.map((t) => t.workType))].sort().forEach((w) => {
      const o = document.createElement("option");
      o.value = w;
      o.textContent = w;
      workTypeSel.appendChild(o);
    });
  }
  const auditUserSel = document.getElementById("trcAuditUser");
  if (auditUserSel && auditUserSel.options.length <= 1) {
    [...state.db.profiles].sort((a, b) => a.username.localeCompare(b.username)).forEach((p) => {
      const o = document.createElement("option");
      o.value = p.username;
      o.textContent = "".concat(p.name, " (").concat(p.username, ")");
      auditUserSel.appendChild(o);
    });
  }
}
function trcPad(n) {
  return String(n).padStart(2, "0");
}
function trcLocalInputValue(d) {
  return "".concat(d.getFullYear(), "-").concat(trcPad(d.getMonth() + 1), "-").concat(trcPad(d.getDate()), "T").concat(trcPad(d.getHours()), ":").concat(trcPad(d.getMinutes()));
}
function trcSetPeriod(period, btn) {
  if (btn) {
    document.querySelectorAll("#trcTab-trips .trc-period-row .filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }
  trc.period = period;
  if (period === "custom") return;
  const now = /* @__PURE__ */ new Date();
  let from;
  if (period === "all") from = new Date(2e3, 0, 1);
  else if (period === "hourly") from = new Date(now.getTime() - 36e5);
  else if (period === "daily") {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    from = new Date(now);
    const day = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - day);
    from.setHours(0, 0, 0, 0);
  } else if (period === "monthly") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else from = new Date(now.getTime() - 36e5);
  document.getElementById("trcFrom").value = trcLocalInputValue(from);
  document.getElementById("trcTo").value = trcLocalInputValue(now);
}
function trcSetAuditPeriod(period, btn) {
  if (btn) {
    document.querySelectorAll("#trcTab-audit .trc-period-row .filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }
  trc.auditPeriod = period;
  if (period === "custom") return;
  const now = /* @__PURE__ */ new Date();
  let from;
  if (period === "today") {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    from = new Date(now);
    const day = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - day);
    from.setHours(0, 0, 0, 0);
  } else if (period === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else from = new Date(2e3, 0, 1);
  document.getElementById("trcAuditFrom").value = trcLocalInputValue(from);
  document.getElementById("trcAuditTo").value = trcLocalInputValue(now);
}
async function trcRunTripReport() {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const fromVal = document.getElementById("trcFrom").value;
  const toVal = document.getElementById("trcTo").value;
  const truckId = document.getElementById("trcTruck").value;
  const driverId = document.getElementById("trcDriver").value;
  const status = document.getElementById("trcStatus").value;
  const workType = document.getElementById("trcWorkType").value;
  const outwardTypeEl = document.getElementById("trcOutwardType");
  const outwardType = outwardTypeEl ? outwardTypeEl.value : "";
  const btn = document.querySelector("#trcTab-trips .action-btn:not(.ghost)");
  const origLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.textContent = "Running\u2026";
    btn.disabled = true;
  }
  try {
    const buildQuery = () => {
      let q = supabase.from("trips").select("*");
      if (fromVal) q = q.gte("start_time", new Date(fromVal).toISOString());
      if (toVal) q = q.lte("start_time", new Date(toVal).toISOString());
      if (truckId) q = q.eq("truck_id", truckId);
      if (driverId) q = q.eq("driver_id", driverId);
      if (status) q = q.eq("status", status);
      if (workType) q = q.eq("work_type", workType);
      if (outwardType) q = q.eq("outward_type", outwardType);
      return q.order("start_time", { ascending: false });
    };
    const { data, error } = await fetchAllPaginated((from, to) => buildQuery().range(from, to));
    if (error) throw error;
    const rows = (data || []).map(tripFromRow);
    trc.tripRows = rows;
    trcRenderTripSummary(rows);
    trcRenderTripTable(rows);
    const csvBtn = document.getElementById("trcExportTripsBtn");
    const jsonBtn = document.getElementById("trcExportTripsJsonBtn");
    if (csvBtn) csvBtn.disabled = rows.length === 0;
    if (jsonBtn) jsonBtn.disabled = rows.length === 0;
    toast("".concat(rows.length, " trip record(s) retrieved"), "success");
    addAudit(state.profile.username, "Trip Report Queried", "".concat(rows.length, " trips \xB7 ").concat(trc.period).concat(fromVal ? " \xB7 ".concat(fromVal.replace("T", " "), " \u2192 ").concat(toVal ? toVal.replace("T", " ") : "now") : ""));
  } catch (e) {
    console.error("Trip report query failed:", e.message);
    toast("Query failed \u2014 check your connection", "error");
  } finally {
    if (btn) {
      btn.textContent = origLabel;
      btn.disabled = false;
    }
  }
}
function trcRenderTripSummary(rows) {
  const el = document.getElementById("trcTripSummary");
  if (!el) return;
  if (!rows.length) {
    el.className = "";
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\u{1F4C4}</div><div class="empty-state-label">No trips match this query</div><div class="empty-state-sub">Adjust the date range or filters and run again</div></div>';
    return;
  }
  const totalDist = rows.reduce((s, t) => s + (Number(t.distance) || 0), 0);
  const completed = rows.filter((t) => t.status === "completed").length;
  const active = rows.filter((t) => t.status === "active").length;
  const delayed = rows.filter((t) => t.status === "delayed" || t.status === "breakdown").length;
  el.className = "kpi-row";
  el.innerHTML = "".concat(kpiCard("Total Trips", fmt(rows.length), "", "kpi-gold"), " ").concat(kpiCard("Completed", fmt(completed), "", "kpi-green"), " ").concat(kpiCard("Active", fmt(active), "", "kpi-blue"), " ").concat(kpiCard("Delayed / Breakdown", fmt(delayed), "", "kpi-red"), " ").concat(kpiCard("Total Distance", fmt(totalDist) + " km", "", "kpi-orange"));
}
function trcRenderTripTable(rows) {
  const meta = document.getElementById("trcTripMeta");
  if (meta) meta.textContent = "".concat(rows.length, " record(s)").concat(rows.length === 5e3 ? " (capped at 5000 \u2014 narrow your range)" : "");
  const body = document.getElementById("trcTripBody");
  if (!body) return;
  body.innerHTML = rows.map((t) => "<tr onclick=\"showTripDetail('".concat(t.id, '\')">\n    <td class="mono" style="color:var(--gold)">').concat(t.container, "</td>\n    <td>").concat(truckName(t.truckId), "</td>\n    <td>").concat(driverName(t.driverId), "</td>\n    <td>").concat(t.workType, "</td>\n    <td>").concat(t.outwardType || "\u2014", '</td>\n    <td style="font-size:11px">').concat(t.origin, " \u2192 ").concat(t.dest, "</td>\n    <td>").concat(sbadge(t.status), "</td>\n    <td>").concat(t.priority ? sbadge(t.priority.toLowerCase()) : "\u2014", '</td>\n    <td class="mono">').concat(t.distance, ' km</td>\n    <td class="mono" style="font-size:10.5px">').concat(fmtTime(t.startTime), " \xB7 ").concat(fmtDate(t.startTime), '</td>\n    <td class="mono" style="font-size:10.5px">').concat(fmtTime(t.eta), "</td>\n  </tr>")).join("") || "";
}
function trcExportTripsCSV() {
  if (!trc.tripRows.length) return;
  const headers = ["ID", "Container", "Type", "Truck", "Driver", "Work Type", "Outward Type", "Origin", "Destination", "Shipping Line", "Status", "Priority", "Distance (km)", "Start Time", "ETA", "Reference"];
  const lines = [headers.join(",")];
  trc.tripRows.forEach((t) => {
    lines.push([
      t.id,
      t.container,
      t.ctype,
      truckName(t.truckId),
      driverName(t.driverId),
      t.workType,
      t.outwardType || "",
      t.origin,
      t.dest,
      lineName(t.shippingLine),
      t.status,
      t.priority,
      t.distance,
      t.startTime,
      t.eta,
      t.ref
    ].map(csvEscape).join(","));
  });
  downloadTextFile("gargo-trip-report-".concat(Date.now(), ".csv"), lines.join("\n"), "text/csv");
  addAudit(state.profile.username, "Trip Report Exported", "".concat(trc.tripRows.length, " trips (CSV)"));
  toast("Trip report exported", "success");
}
function trcExportTripsJSON() {
  if (!trc.tripRows.length) return;
  downloadTextFile("gargo-trip-report-".concat(Date.now(), ".json"), JSON.stringify(trc.tripRows, null, 2), "application/json");
  addAudit(state.profile.username, "Trip Report Exported", "".concat(trc.tripRows.length, " trips (JSON)"));
  toast("Trip report exported", "success");
}
async function trcRunAuditQuery() {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const fromVal = document.getElementById("trcAuditFrom").value;
  const toVal = document.getElementById("trcAuditTo").value;
  const user = document.getElementById("trcAuditUser").value;
  const search = document.getElementById("trcAuditSearch").value.trim();
  const btn = document.querySelector("#trcTab-audit .action-btn:not(.ghost)");
  const origLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.textContent = "Running\u2026";
    btn.disabled = true;
  }
  try {
    const buildQuery = () => {
      let q = supabase.from("audit_log").select("*");
      if (fromVal) q = q.gte("time", new Date(fromVal).toISOString());
      if (toVal) q = q.lte("time", new Date(toVal).toISOString());
      if (user) q = q.eq("username", user);
      if (search) q = q.or("action.ilike.%".concat(search, "%,detail.ilike.%").concat(search, "%"));
      return q.order("time", { ascending: false });
    };
    const { data, error } = await fetchAllPaginated((from, to) => buildQuery().range(from, to));
    if (error) throw error;
    const rows = (data || []).map((a) => ({ id: a.id, user: a.username, action: a.action, detail: a.detail, time: a.time }));
    trc.auditRows = rows;
    trcRenderAuditSummary(rows);
    trcRenderAuditTable(rows);
    const csvBtn = document.getElementById("trcExportAuditBtn");
    if (csvBtn) csvBtn.disabled = rows.length === 0;
    toast("".concat(rows.length, " audit record(s) retrieved"), "success");
  } catch (e) {
    console.error("Audit query failed:", e.message);
    toast("Query failed \u2014 check your connection", "error");
  } finally {
    if (btn) {
      btn.textContent = origLabel;
      btn.disabled = false;
    }
  }
}
function trcRenderAuditSummary(rows) {
  const el = document.getElementById("trcAuditSummary");
  if (!el) return;
  if (!rows.length) {
    el.className = "";
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\u{1F5C2}</div><div class="empty-state-label">No audit entries match this query</div><div class="empty-state-sub">Widen the date range or clear filters and run again</div></div>';
    return;
  }
  const users = new Set(rows.map((r) => r.user)).size;
  const actions = new Set(rows.map((r) => r.action)).size;
  el.className = "kpi-row";
  el.innerHTML = "".concat(kpiCard("Total Entries", fmt(rows.length), "", "kpi-gold"), " ").concat(kpiCard("Distinct Users", fmt(users), "", "kpi-blue"), " ").concat(kpiCard("Action Types", fmt(actions), "", "kpi-orange"));
}
function trcRenderAuditTable(rows) {
  const meta = document.getElementById("trcAuditMeta");
  if (meta) meta.textContent = "".concat(rows.length, " record(s)").concat(rows.length === 2e3 ? " (capped at 2000 \u2014 narrow your range)" : "");
  const body = document.getElementById("trcAuditBody");
  if (!body) return;
  body.innerHTML = rows.map((a) => '<tr>\n    <td class="mono" style="font-size:10.5px;white-space:nowrap">'.concat(fmtTime(a.time), " \xB7 ").concat(fmtDate(a.time), "</td>\n    <td>").concat(a.user, '</td>\n    <td style="font-weight:600;color:var(--text)">').concat(a.action, '</td>\n    <td style="color:var(--text-2)">').concat(a.detail || "", "</td>\n  </tr>")).join("");
}
function trcExportAuditCSV() {
  if (!trc.auditRows.length) return;
  const headers = ["Time", "User", "Action", "Detail"];
  const lines = [headers.join(",")];
  trc.auditRows.forEach((a) => lines.push([a.time, a.user, a.action, a.detail].map(csvEscape).join(",")));
  downloadTextFile("gargo-audit-log-".concat(Date.now(), ".csv"), lines.join("\n"), "text/csv");
  addAudit(state.profile.username, "Audit Log Exported", "".concat(trc.auditRows.length, " entries (CSV)"));
  toast("Audit log exported", "success");
}
function addAudit(user, action, detail) {
  if (!user) user = "system";
  const log = state.db.auditLog || [];
  log.unshift({ user, action, detail, time: (/* @__PURE__ */ new Date()).toISOString() });
  if (log.length > 500) log.splice(500);
  state.db.auditLog = log;
  scheduleSave();
}
