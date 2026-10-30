"use strict";
function reqToRow(r) {
  return { id: r.id, requester: r.requester, requester_id: r.requesterId || null, category: r.category, items: r.items, amount: r.amount, date: r.date, status: r.status, approver: r.approver, approved_date: r.approvedDate, notes: r.notes };
}
function reqFromRow(r) {
  return { id: r.id, requester: r.requester, requesterId: r.requester_id || null, category: r.category, items: r.items, amount: r.amount, date: r.date, status: r.status, approver: r.approver, approvedDate: r.approved_date, notes: r.notes };
}
function allocToRow(a) {
  return { id: a.id, name: a.name, description: a.desc, weight: a.weight, active: a.active };
}
function allocFromRow(r) {
  return { id: r.id, name: r.name, desc: r.description, weight: r.weight, active: r.active };
}
function dpSaveRequisition() {
  var _a;
  const items = document.getElementById("dp_rq_items").value.trim();
  const amt = Math.max(0, parseInt(document.getElementById("dp_rq_amt").value) || 0);
  if (!items || !amt) {
    toast("Items and amount required", "error");
    return;
  }
  if (!((_a = state.profile) == null ? void 0 : _a.id)) {
    toast("Session error \u2014 please log in again", "error");
    return;
  }
  state.db.requisitions.push({
    id: uid("REQ"),
    requester: state.profile.name,
    requesterId: state.profile.id,
    category: document.getElementById("dp_rq_cat").value,
    items,
    amount: amt,
    notes: sanitize(document.getElementById("dp_rq_notes").value.trim()),
    date: (/* @__PURE__ */ new Date()).toISOString(),
    status: "pending",
    approver: null,
    approvedDate: null,
    _dirty: true
  });
  scheduleSave();
  buildBadges();
  addAudit(state.profile.username, "Requisition Submitted (Driver)", "".concat(items.slice(0, 50), "\u2026"));
  toast("Requisition submitted \u2014 pending approval", "success");
  renderDriverPortal();
}
function renderAllocAwaitingList(targetId, metaId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const rows = awaitingDispatchTrips().sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  if (metaId) {
    const meta = document.getElementById(metaId);
    if (meta) meta.textContent = rows.length ? "".concat(rows.length, " awaiting") : "";
  }
  el.innerHTML = rows.map((t) => '\n    <div class="dispatch-queue-item" style="cursor:default">\n      <div class="dqi-ref">'.concat((t.container || "").slice(-7), '</div>\n      <div class="dqi-route">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">').concat(t.origin, " \u2192 ").concat(t.dest, '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(t.bookingId ? "From public booking" : "Needs truck & driver", " \xB7 ").concat(t.workType, '</div>\n      </div>\n      <button class="modal-btn primary" onclick="jumpToCompleteDispatch(\'').concat(t.id, "')\">Match &amp; Dispatch \u2192</button>\n    </div>\n  ")).join("") || '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">\u2705</div><div class="empty-state-label">Nothing awaiting dispatch</div></div>';
}
let _reqFilter = "all";
function filterRequisitions(f, btn) {
  _reqFilter = f;
  document.querySelectorAll("#sec-requisitions .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderRequisitions(f);
}
function renderRequisitions(f) {
  let items = f === "all" ? state.db.requisitions : state.db.requisitions.filter((r) => r.status === f);
  const el = document.getElementById("reqList");
  if (!el) return;
  el.innerHTML = items.map((r) => '<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">'.concat(r.category, '</div><div class="req-meta">').concat(r.id, " \xB7 ").concat(fmtDate(r.date), '</div></div><div style="text-align:right">').concat(sbadge(r.status), '<div class="req-amount" style="margin-top:4px">').concat(fmtKsh(r.amount), '</div></div></div><div class="req-items">').concat(r.items, '</div><div class="req-meta" style="margin-top:6px">Requester: ').concat(r.requester).concat(r.approver ? " \xB7 Approved by: ".concat(r.approver) : "", "</div>").concat(r.notes ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:4px;font-style:italic">'.concat(r.notes, "</div>") : "", "</div>")).join("") || '<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-label">No requisitions</div></div>';
}
function showAddRequisitionModal() {
  openModal("New Requisition", '<div class="form-row-2"><div class="fg"><label>Category</label><select id="rq_cat"><option>Fuel Advance</option><option>Tyre Parts</option><option>Tool Purchase</option><option>Medical</option><option>Lubricants</option><option>Other</option></select></div><div class="fg"><label>Amount (KSh)</label><input id="rq_amt" type="number" placeholder="0"/></div></div><div class="fg"><label>Items / Description</label><textarea id="rq_items" rows="3" placeholder="List what is needed\u2026"></textarea></div><div class="fg"><label>Notes</label><input id="rq_notes" placeholder="Additional context\u2026"/></div><button class="submit-btn" onclick="saveRequisition()">Submit Requisition \u2192</button>');
}
function saveRequisition() {
  var _a;
  const items = document.getElementById("rq_items").value.trim();
  const amt = Math.max(0, parseInt(document.getElementById("rq_amt").value) || 0);
  if (!items || !amt) {
    toast("Items and amount required", "error");
    return;
  }
  if (!((_a = state.profile) == null ? void 0 : _a.id)) {
    toast("Session error \u2014 please log in again", "error");
    return;
  }
  state.db.requisitions.push({
    id: uid("REQ"),
    requester: state.profile.name,
    requesterId: state.profile.id,
    category: document.getElementById("rq_cat").value,
    items,
    amount: amt,
    notes: sanitize(document.getElementById("rq_notes").value.trim()),
    date: (/* @__PURE__ */ new Date()).toISOString(),
    status: "pending",
    approver: null,
    approvedDate: null,
    _dirty: true
  });
  scheduleSave();
  buildBadges();
  addAudit(state.profile.username, "Requisition Submitted", "".concat(items.slice(0, 50), "\u2026"));
  closeModal();
  renderRequisitions("all");
  toast("Requisition submitted", "success");
}
let _allocTab = "auto";
function switchAllocTab(tab, btn) {
  if ((tab === "requisitions" || tab === "workshop") && !isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  _allocTab = tab;
  ["allocTabAuto", "allocTabManual", "allocTabRequisitions", "allocTabWorkshop"].forEach((id) => {
    const el2 = document.getElementById(id);
    if (el2) el2.style.display = "none";
  });
  const map = { auto: "allocTabAuto", manual: "allocTabManual", requisitions: "allocTabRequisitions", workshop: "allocTabWorkshop" };
  const el = document.getElementById(map[tab]);
  if (el) el.style.display = "block";
  document.querySelectorAll("#sec-allocation .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  if (tab === "auto") renderAllocAuto();
  if (tab === "manual") renderAllocManual();
  if (tab === "requisitions") renderAdminRequisitions();
  if (tab === "workshop") renderAdminWorkshop();
}
function renderAllocation() {
  renderAllocAuto();
}
function renderAllocAuto() {
  const db = state.db;
  const avail = db.trucks.filter((t) => t.status === "available").length;
  const drivers = db.drivers.filter((d) => d.status === "available").length;
  const awaiting = awaitingDispatchTrips().length;
  const pending = db.trips.filter((t) => t.status === "active").length;
  document.getElementById("allocKpis").innerHTML = "".concat(kpiCard("Available Trucks", avail, "", "kpi-green"), " ").concat(kpiCard("Available Drivers", drivers, "", "kpi-gold"), " ").concat(kpiCard("Awaiting Dispatch", awaiting, "", "kpi-orange"), " ").concat(kpiCard("Active Dispatches", pending, "", "kpi-blue"));
  renderAllocAwaitingList("allocQueue", "allocQueueMeta");
  document.getElementById("allocRules").innerHTML = db.allocationRules.map((r) => '<div class="alloc-rule"><div style="display:flex;justify-content:space-between;align-items:center"><div class="rule-name">'.concat(r.name, '</div><div class="rule-weight">').concat(r.weight, '%</div></div><div class="rule-desc">').concat(r.desc, "</div></div>")).join("");
  document.getElementById("allocRecommendations").innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:11.5px">Run auto-allocation to generate recommendations</div>';
}
function renderAllocManual() {
  fillSelect("ma_truck", state.db.trucks, (t) => [t.id, "".concat(t.reg, " \u2014 ").concat(t.status)]);
  fillSelect("ma_driver", state.db.drivers.filter((d) => d.status === "available"), (d) => [d.id, d.name]);
  renderStatusOverridePanel();
  renderAllocAwaitingList("allocManualAwaitingList", "allocManualAwaitingMeta");
}
function renderStatusOverridePanel() {
  const rows = [...state.db.trucks.slice(0, 5).map((t) => ({ label: t.reg, kind: "Truck", id: t.id, status: t.status, type: "truck" })), ...state.db.drivers.slice(0, 5).map((d) => ({ label: d.name, kind: "Driver", id: d.id, status: d.status, type: "driver" }))];
  const panel = document.getElementById("adminStatusPanel");
  if (!panel) return;
  panel.innerHTML = rows.map((r) => '<div class="admin-status-row"><div><div style="font-size:12px;color:var(--text)">'.concat(r.label, '</div><div style="font-size:10px;color:var(--text-3)">').concat(r.kind, "</div></div>").concat(sbadge(r.status), '<div style="display:flex;gap:4px">').concat((r.type === "truck" ? ["available", "on_trip", "maintenance", "breakdown", "off_duty"] : ["available", "on_trip", "off_duty", "suspended"]).map((s) => '<button class="tbl-btn" onclick="adminOverrideStatus(\''.concat(r.type, "','").concat(r.id, "','").concat(s, "')\">").concat(s.replace("_", " "), "</button>")).join(""), "</div></div>")).join("");
}
function adminOverrideStatus(type, id, status) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  if (type === "truck") {
    const t = state.db.trucks.find((t2) => t2.id === id);
    if (t) {
      t.status = status;
      addAudit(state.profile.username, "Status Override", "".concat(t.reg, " \u2192 ").concat(status));
    }
  } else {
    const d = state.db.drivers.find((d2) => d2.id === id);
    if (d) {
      d.status = status;
      addAudit(state.profile.username, "Status Override", "".concat(d.name, " \u2192 ").concat(status));
    }
  }
  scheduleSave();
  buildBadges();
  renderStatusOverridePanel();
  toast("Status updated to ".concat(status), "success");
}
function runAllocation() {
  const avail = state.db.trucks.filter((t) => t.status === "available" && (t.fuelPct == null || t.fuelPct >= 40));
  const drivers = state.db.drivers.filter((d) => d.status === "available");
  if (!avail.length || !drivers.length) {
    toast("No available trucks/drivers for allocation", "warning");
    return;
  }
  const recs = avail.slice(0, 3).map((t, i) => ({ truck: t, driver: drivers[i % drivers.length], score: Math.round(70 + Math.random() * 30) }));
  document.getElementById("allocRecommendations").innerHTML = recs.map((r) => '<div class="recommend-card"><div><div class="rc-label">Truck</div><div class="rc-val">'.concat(r.truck.reg, '</div></div><div><div class="rc-label">Driver</div><div class="rc-val">').concat(r.driver.name, '</div></div><div><div class="rc-label">Match Score</div><div class="rc-val" style="color:var(--gold)">').concat(r.score, '%</div></div><button class="modal-btn primary" onclick="applyAllocation(\'').concat(r.truck.id, "','").concat(r.driver.id, "')\">Assign</button></div>")).join("");
  toast("".concat(recs.length, " recommendations generated"), "success");
}
function applyAllocation(truckId, driverId) {
  const result = pairDriverTruck(truckId, driverId);
  if (!result) {
    toast("Truck or driver not found", "error");
    return;
  }
  const { t, d } = result;
  scheduleSave();
  addAudit(state.profile.username, "Auto Allocation", "".concat(t.reg, " \u2190 ").concat(d.name));
  toast("".concat(d.name, " assigned to ").concat(t.reg), "success");
  renderAllocAuto();
}
function pairDriverTruck(truckId, driverId) {
  const t = state.db.trucks.find((tr) => tr.id === truckId);
  const d = state.db.drivers.find((dr) => dr.id === driverId);
  if (!t || !d) return null;
  state.db.drivers.forEach((other) => {
    if (other.id !== d.id && other.truckId === truckId) other.truckId = null;
  });
  t.driver = driverId;
  d.truckId = truckId;
  return { t, d };
}
function manualAssignDriverToTruck() {
  var _a;
  const truck = document.getElementById("ma_truck").value;
  const driver = document.getElementById("ma_driver").value;
  const notes = sanitize((((_a = document.getElementById("ma_notes")) == null ? void 0 : _a.value) || "").trim());
  if (!truck || !driver) {
    toast("Select truck and driver", "error");
    return;
  }
  const result = pairDriverTruck(truck, driver);
  if (!result) {
    toast("Truck or driver not found", "error");
    return;
  }
  const { t, d } = result;
  scheduleSave();
  addAudit(state.profile.username, "Manual Assignment", "".concat(t == null ? void 0 : t.reg, " \u2190 ").concat(d == null ? void 0 : d.name).concat(notes ? " \u2014 ".concat(notes) : ""));
  toast("".concat(d == null ? void 0 : d.name, " assigned to ").concat(t == null ? void 0 : t.reg, ". Open Dispatch Console to put them on a trip."), "success");
  const notesEl = document.getElementById("ma_notes");
  if (notesEl) notesEl.value = "";
  renderAllocManual();
}
function showAllocationRulesModal() {
  openModal("Configure Allocation Rules", "".concat(state.db.allocationRules.map((r) => '<div style="padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:12px;font-weight:600;color:var(--text)">'.concat(r.name, '</div><input type="number" value="').concat(r.weight, '" min="0" max="100" style="width:60px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:4px;text-align:center" onchange="updateRuleWeight(\'').concat(r.id, '\',this.value)"/></div><div style="font-size:11px;color:var(--text-3)">').concat(r.desc, "</div></div>")).join(""), '<button class="submit-btn" onclick="saveAllocRules()">Save Rules \u2192</button>'));
}
function updateRuleWeight(id, val) {
  const r = state.db.allocationRules.find((r2) => r2.id === id);
  if (r) r.weight = Math.max(0, parseInt(val) || 0);
}
function saveAllocRules() {
  scheduleSave();
  closeModal();
  toast("Allocation rules saved", "success");
}
function renderAdminRequisitions() {
  const pending = state.db.requisitions.filter((r) => r.status === "pending");
  const el = document.getElementById("adminReqList");
  if (!el) return;
  el.innerHTML = pending.map((r) => '<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">'.concat(r.category, '</div><div class="req-meta">').concat(r.requester, " \xB7 ").concat(fmtDate(r.date), '</div></div><div class="req-amount">').concat(fmtKsh(r.amount), '</div></div><div class="req-items">').concat(r.items, '</div><div style="display:flex;gap:8px;margin-top:10px"><button class="modal-btn success" onclick="reviewReq(\'').concat(r.id, "','approved')\">Approve</button><button class=\"modal-btn danger\" onclick=\"reviewReq('").concat(r.id, "','rejected')\">Reject</button></div></div>")).join("") || '<div class="empty-state"><div class="empty-state-label">No pending requisitions</div></div>';
}
function reviewReq(id, status) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const r = state.db.requisitions.find((r2) => r2.id === id);
  if (!r) return;
  r.status = status;
  r.approver = state.profile.username;
  r.approvedDate = (/* @__PURE__ */ new Date()).toISOString();
  r._dirty = true;
  scheduleSave();
  buildBadges();
  addAudit(state.profile.username, "Requisition ".concat(status), "".concat(r.category, " \u2014 ").concat(fmtKsh(r.amount)));
  renderAdminRequisitions();
  renderRequisitions(_reqFilter);
  toast("Requisition ".concat(status), status === "approved" ? "success" : "warning");
}
async function renderDepOpsAllocationQueue() {
  const wrap = document.getElementById("depopsAllocationList");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const [bookings, zones] = await Promise.all([
      window.bookingDocs.surveyedAwaitingAllocation(),
      window.bookingDocs.listZones()
    ]);
    if (!bookings.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Nothing ready for allocation</div></div>';
      return;
    }
    const surveys = await Promise.all(bookings.map((b) => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    surveys.forEach((s) => {
      if (s) _surveyLookupCache[s.id] = s;
    });
    wrap.innerHTML = bookings.map((b, i) => depOpsAllocationCard(b, zones, surveys[i])).join("");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function depOpsAllocationCard(b, zones, survey) {
  const bookingLineId = resolveBookingShippingLineId(b);
  const zoneOptions = zones.map((z) => {
    const free = Math.max((z.capacity_teu || 0) - (z.occupied_teu || 0), 0);
    const match = bookingLineId && z.shipping_line_id === bookingLineId;
    return '<option value="'.concat(z.id, '" ').concat(match ? "selected" : "", ">").concat(sanitize(z.zone_code || z.zone_name)).concat(z.shipping_lines ? " \xB7 " + sanitize(z.shipping_lines.code) : "", " (").concat(free, " TEU free)</option>");
  }).join("");
  const icBtn = survey && survey.interchange_generated_at && survey.interchange_id ? '<button class="modal-btn ghost" onclick="downloadInterchangeSlip(\''.concat(survey.interchange_id, "')\">\u2B07 Interchange</button>") : "";
  const reportBtn = survey ? '<button class="modal-btn ghost" onclick="downloadInspectionReport(\''.concat(survey.id, "')\">\u2B07 Inspection Report</button>") : "";
  return '<div style="border:1px solid rgba(201,162,39,0.35);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--gold-dim)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong class="mono" style="color:var(--gold)">'.concat(sanitize(b.container) || "No container on file", '</strong>\n        <div style="font-size:11px;color:var(--text-3)">').concat(sanitize(b.full_name)).concat(b.company ? " \xB7 " + sanitize(b.company) : "", " \xB7 ").concat(sanitize(b.cargo_type || "\u2014"), '</div>\n      </div>\n      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="sbadge s-approved">surveyed</span>').concat(icBtn).concat(reportBtn, '</div>\n    </div>\n    <div style="margin-top:10px;font-size:11px;color:var(--text-3)">Allocate a storage slot below to record where this container sits in the yard.</div>\n    <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 90px 70px auto;gap:6px;align-items:end">\n      <div class="fg" style="margin:0"><label>Zone</label><select id="alloc-zone-').concat(b.id, '" onchange="depOpsAllocZoneChanged(\'').concat(b.id, '\')"><option value="">Select\u2026</option>').concat(zoneOptions, '</select></div>\n      <div class="fg" style="margin:0"><label>Block</label><select id="alloc-block-').concat(b.id, '" onchange="depOpsAllocBlockChanged(\'').concat(b.id, '\')"><option value="">Select zone first\u2026</option></select></div>\n      <div class="fg" style="margin:0"><label>Slot</label><select id="alloc-slot-').concat(b.id, '"><option value="">\u2014</option></select></div>\n      <div class="fg" style="margin:0"><label>TEU</label><input type="number" id="alloc-teu-').concat(b.id, '" min="1" value="1"></div>\n      <button class="action-btn" onclick="depOpsAllocateBookingToSlot(\'').concat(b.id, "')\">Allocate</button>\n    </div>\n  </div>");
}
async function depOpsAllocateBookingToSlot(bookingId) {
  const zoneId = (document.getElementById("alloc-zone-" + bookingId) || {}).value;
  const blockId = (document.getElementById("alloc-block-" + bookingId) || {}).value;
  const slotNumber = (document.getElementById("alloc-slot-" + bookingId) || {}).value;
  const teu = parseInt((document.getElementById("alloc-teu-" + bookingId) || {}).value, 10);
  if (!zoneId) {
    toast("Select a zone", "error");
    return;
  }
  if (!teu || teu < 1) {
    toast("Enter a valid TEU amount", "error");
    return;
  }
  try {
    const { data: booking } = await supabase.from("public_bookings").select("container").eq("id", bookingId).single();
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    await window.bookingDocs.allocateStorage(bookingId, zoneId, teu, {
      blockId: blockId || null,
      slotNumber: slotNumber ? parseInt(slotNumber, 10) : null,
      container: booking ? booking.container : null,
      conditionStatus: survey ? survey.condition_status : "food_grade"
    });
    syncStorageToInterchange(bookingId, zoneId, blockId || null, slotNumber ? parseInt(slotNumber, 10) : null);
    addAudit(state.profile.username, "Storage Allocated", booking ? booking.container : bookingId);
    toast("Storage allocated".concat(booking && booking.container ? " for " + booking.container : ""), "success");
    renderDepOpsAllocationQueue();
    renderDepOpsZones();
    renderDepOpsStorageList();
  } catch (e) {
    toast(e.message || "Could not allocate storage", "error");
  }
}
