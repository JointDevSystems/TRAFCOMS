"use strict";
function prestakeToRow(p) {
  return {
    id: p.id,
    trip_id: p.tripId || null,
    container: p.container,
    ctype: p.ctype || null,
    line_id: p.line || null,
    driver_id: p.driverId || null,
    truck_id: p.truckId || null,
    vessel: p.vessel || null,
    voyage: p.voyage || null,
    consignee: p.consignee || null,
    planned_date: p.plannedDate || null,
    shift: p.shift || null,
    origin: p.origin || null,
    destination: p.destination || null,
    notes: p.notes || null,
    status: p.status,
    created_by: p.createdBy || null,
    created_at: p.createdAt,
    resolved_at: p.resolvedAt || null,
    shutout_id: p.shutoutId || null
  };
}
function prestakeFromRow(r) {
  return {
    id: r.id,
    tripId: r.trip_id,
    container: r.container,
    ctype: r.ctype || "",
    line: r.line_id,
    driverId: r.driver_id,
    truckId: r.truck_id,
    vessel: r.vessel || "",
    voyage: r.voyage || "",
    consignee: r.consignee || "",
    plannedDate: r.planned_date || "",
    shift: r.shift || "",
    origin: r.origin || "",
    destination: r.destination || "",
    notes: r.notes || "",
    status: r.status,
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    resolvedAt: r.resolved_at || null,
    shutoutId: r.shutout_id || null
  };
}
function prestakingEligibleTrips() {
  const staged = new Set(
    (state.db.vesselPrestaking || []).filter((p) => p.status === "staged").map((p) => p.tripId)
  );
  return state.db.trips.filter((t) => isOutwardWorkType(t.workType) && t.status === "completed" && !staged.has(t.id)).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
}
function prestakeTripLabel(t) {
  const line = t.shippingLine ? lineName(t.shippingLine) : "\u2014";
  return "".concat(t.container, " \u2014 ").concat(t.ctype || "\u2014", " \xB7 ").concat(line).concat(t.outwardType ? " \xB7 " + t.outwardType : "");
}
function canManagePrestaking() {
  return isAdmin() || isDispatch() || isClerk();
}
let _prestakeFilter = "staged";
function filterPrestaking(f, btn) {
  _prestakeFilter = f;
  document.querySelectorAll("#sec-prestaking .filter-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderPrestakingList(f);
}
function renderPrestaking(f) {
  _prestakeFilter = f || _prestakeFilter;
  renderPrestakingKpis();
  renderPrestakingList(_prestakeFilter);
}
function renderPrestakingKpis() {
  const all = state.db.vesselPrestaking || [];
  const staged = all.filter((p) => p.status === "staged").length;
  const loaded = all.filter((p) => p.status === "loaded").length;
  const shutout = all.filter((p) => p.status === "shutout").length;
  const el = document.getElementById("prestakingKpis");
  if (!el) return;
  el.innerHTML = [
    kpiCard("Awaiting Vessel Loading", staged, "Staged, not yet loaded", "kpi-gold"),
    kpiCard("Loaded", loaded, "Confirmed on board", "kpi-green"),
    kpiCard("Shutouts", shutout, "Missed their vessel", "kpi-red"),
    kpiCard("Eligible Containers", prestakingEligibleTrips().length, "Arrived at port, not yet staged", "kpi-blue")
  ].join("");
}
function renderPrestakingList(f) {
  const all = state.db.vesselPrestaking || [];
  const items = (f === "all" ? all : all.filter((p) => p.status === f)).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const el = document.getElementById("prestakingList");
  if (!el) return;
  el.innerHTML = items.map(prestakeCard).join("") || '<div class="empty-state"><div class="empty-state-icon">\u{1F6A2}</div><div class="empty-state-label">No prestaking records in this filter</div></div>';
}
function prestakeCard(p) {
  const line = p.line ? lineName(p.line) : "\u2014";
  return '<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong class="mono" style="color:var(--gold)">'.concat(esc(p.container), '</strong>\n        <div style="font-size:11px;color:var(--text-3)">').concat(esc(p.origin || "\u2014"), " \u2192 ").concat(esc(p.destination || "\u2014"), '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(esc(p.vessel || "Vessel TBC")).concat(p.voyage ? " \xB7 Voyage " + esc(p.voyage) : "", " \xB7 ").concat(line, '</div>\n      </div>\n      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">\n        ').concat(sbadge(p.status), '\n        <div class="dqi-time">').concat(timeAgo(p.createdAt), '</div>\n      </div>\n    </div>\n    <div style="margin-top:8px;font-size:11px;color:var(--text-2);display:flex;gap:14px;flex-wrap:wrap">\n      <span>\u{1F69A} ').concat(truckName(p.truckId), "</span>\n      <span>\u{1F464} ").concat(driverName(p.driverId), "</span>\n      ").concat(p.plannedDate ? "<span>\u{1F4C5} ".concat(fmtDate(p.plannedDate)).concat(p.shift ? " \xB7 " + esc(p.shift) : "", "</span>") : "", "\n      ").concat(p.consignee ? "<span>\u{1F3F7} ".concat(esc(p.consignee), "</span>") : "", "\n    </div>\n    ").concat(p.notes ? '<div style="margin-top:8px;font-size:10.5px;color:var(--text-3);font-style:italic">'.concat(esc(p.notes), "</div>") : "", '\n    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">\n      <button class="modal-btn ghost" onclick="showPrestakeDetail(\'').concat(p.id, "')\">View / Manage</button>\n    </div>\n  </div>");
}
function showAddPrestakeModal() {
  if (!canManagePrestaking()) {
    toast("You do not have permission to stage containers", "error");
    return;
  }
  const eligible = prestakingEligibleTrips();
  const portLocations = window.bookingDocs && window.bookingDocs.PORT_LOCATIONS || [];
  const portOptions = portLocations.map((loc) => '<option value="'.concat(sanitize(loc), '">').concat(sanitize(loc), "</option>")).join("");
  openModal("Prestake Container for Vessel Loading", "\n    ".concat(!eligible.length ? '<div class="ops-notice" style="margin-bottom:12px">No containers are currently eligible. A container must have a completed Depot \u2192 Port outward trip that hasn\u2019t already been staged.</div>' : "", '\n    <div class="fg"><label>Container <span class="label-optional">(only completed Depot \u2192 Port arrivals shown)</span></label>\n      <select id="ps_trip" onchange="onPrestakeTripChange()">\n        <option value="">\u2014 Select container \u2014</option>\n        ').concat(eligible.map((t) => '<option value="'.concat(t.id, '">').concat(esc(prestakeTripLabel(t)), "</option>")).join(""), '\n      </select>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Driver <span class="label-optional">(vessel-side movement)</span></label><select id="ps_driver"><option value="">Select driver\u2026</option>').concat(state.db.drivers.map((d) => '<option value="'.concat(d.id, '">').concat(esc(d.name), "</option>")).join(""), '</select></div>\n      <div class="fg"><label>Truck</label><select id="ps_truck"><option value="">Select truck\u2026</option>').concat(state.db.trucks.map((t) => '<option value="'.concat(t.id, '">').concat(esc(t.reg), "</option>")).join(""), '</select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Vessel Name</label><input id="ps_vessel" placeholder="e.g. MV Maersk Emerald"/></div>\n      <div class="fg"><label>Voyage No. <span class="label-optional">(optional)</span></label><input id="ps_voyage" placeholder="e.g. 234W"/></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Consignee / Account <span class="label-optional">(optional)</span></label><input id="ps_consignee" placeholder="e.g. ABC Exporters Ltd"/></div>\n      <div class="fg"><label>Shipping Line</label><select id="ps_line"><option value="">Select\u2026</option>').concat(state.db.shippingLines.filter((l) => l.active).map((l) => '<option value="'.concat(l.id, '">').concat(l.code, " \u2014 ").concat(esc(l.name), "</option>")).join(""), '</select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Planned Date <span class="label-optional">(optional)</span></label><input type="date" id="ps_date"/></div>\n      <div class="fg"><label>Shift <span class="label-optional">(optional)</span></label><select id="ps_shift"><option value="">Select shift\u2026</option><option>Day</option><option>Night</option></select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Origin</label><select id="ps_origin"><option value="">Select origin\u2026</option>').concat(portOptions, '</select></div>\n      <div class="fg"><label>Destination / Berth <span class="label-optional">(optional)</span></label><input id="ps_dest" placeholder="e.g. Berth 12, KPA Container Terminal 2"/></div>\n    </div>\n    <div class="fg"><label>Remarks / Instructions <span class="label-optional">(optional)</span></label><textarea id="ps_notes" rows="2" placeholder="Gate pass reference, priority, special handling, expected time\u2026"></textarea></div>\n    <button class="submit-btn" onclick="savePrestake()">Save Prestaking \u2192</button>\n  '));
}
function onPrestakeTripChange() {
  const tripEl = document.getElementById("ps_trip");
  const trip = tripEl && state.db.trips.find((t) => t.id === tripEl.value);
  if (!trip) return;
  const lineEl = document.getElementById("ps_line");
  if (lineEl && trip.shippingLine && !lineEl.value) lineEl.value = trip.shippingLine;
  const originEl = document.getElementById("ps_origin");
  if (originEl && trip.dest && !originEl.value) {
    const hasOpt = [...originEl.options].some((o) => o.value === trip.dest);
    if (hasOpt) originEl.value = trip.dest;
  }
}
function savePrestake() {
  const tripEl = document.getElementById("ps_trip");
  const tripId = tripEl ? tripEl.value : "";
  if (!tripId) {
    toast("Select a container first", "error");
    return;
  }
  const trip = state.db.trips.find((t) => t.id === tripId);
  if (!trip) {
    toast("That trip could not be found \u2014 refresh and try again", "error");
    return;
  }
  if (!isOutwardWorkType(trip.workType) || trip.status !== "completed") {
    toast("This container is no longer eligible \u2014 it must be a completed Depot \u2192 Port arrival", "error");
    return;
  }
  const alreadyStaged = (state.db.vesselPrestaking || []).some((p2) => p2.tripId === tripId && p2.status === "staged");
  if (alreadyStaged) {
    toast("This container already has an open prestaking record", "error");
    return;
  }
  const vessel = sanitize(document.getElementById("ps_vessel").value.trim());
  if (!vessel) {
    toast("Vessel name is required", "error");
    return;
  }
  const voyage = sanitize(document.getElementById("ps_voyage").value.trim());
  const p = {
    id: uid("PSTG"),
    tripId,
    container: trip.container,
    ctype: trip.ctype || "",
    line: document.getElementById("ps_line").value || trip.shippingLine || "",
    driverId: document.getElementById("ps_driver").value || "",
    truckId: document.getElementById("ps_truck").value || "",
    vessel,
    voyage,
    consignee: sanitize(document.getElementById("ps_consignee").value.trim()),
    plannedDate: document.getElementById("ps_date").value || "",
    shift: document.getElementById("ps_shift").value || "",
    origin: document.getElementById("ps_origin").value || trip.dest || "",
    destination: sanitize(document.getElementById("ps_dest").value.trim()),
    notes: sanitize(document.getElementById("ps_notes").value.trim()),
    status: "staged",
    createdBy: state.profile.username,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    resolvedAt: null,
    shutoutId: null,
    _dirty: true
  };
  state.db.vesselPrestaking = state.db.vesselPrestaking || [];
  state.db.vesselPrestaking.push(p);
  scheduleSave();
  addAudit(state.profile.username, "Container Prestaked", "".concat(p.container, " \u2192 ").concat(vessel).concat(voyage ? " / " + voyage : ""));
  closeModal();
  renderPrestaking("staged");
  buildBadges();
  toast("".concat(p.container, " staged for vessel loading"), "success");
}
function showPrestakeDetail(id) {
  const p = (state.db.vesselPrestaking || []).find((x) => x.id === id);
  if (!p) return;
  const line = p.line ? lineName(p.line) : "\u2014";
  const canAct = canManagePrestaking() && p.status === "staged";
  openModal("Prestaking \u2014 ".concat(p.container), '\n    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">\n      <div class="fg" style="margin:0"><label>Container</label><div class="mono" style="color:var(--gold);font-size:13px">'.concat(esc(p.container), '</div></div>\n      <div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">').concat(esc(p.ctype || "\u2014"), '</div></div>\n      <div class="fg" style="margin:0"><label>Vessel</label><div style="font-size:12px;color:var(--text)">').concat(esc(p.vessel || "\u2014"), '</div></div>\n      <div class="fg" style="margin:0"><label>Voyage</label><div style="font-size:12px;color:var(--text)">').concat(esc(p.voyage || "\u2014"), '</div></div>\n      <div class="fg" style="margin:0"><label>Shipping Line</label><div style="font-size:12px;color:var(--text)">').concat(line, '</div></div>\n      <div class="fg" style="margin:0"><label>Consignee / Account</label><div style="font-size:12px;color:var(--text)">').concat(esc(p.consignee || "\u2014"), '</div></div>\n      <div class="fg" style="margin:0"><label>Driver</label><div style="font-size:12px;color:var(--text)">').concat(driverName(p.driverId), '</div></div>\n      <div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">').concat(truckName(p.truckId), '</div></div>\n      <div class="fg" style="margin:0"><label>Origin</label><div style="font-size:12px;color:var(--text)">').concat(esc(p.origin || "\u2014"), '</div></div>\n      <div class="fg" style="margin:0"><label>Destination</label><div style="font-size:12px;color:var(--text)">').concat(esc(p.destination || "\u2014"), '</div></div>\n      <div class="fg" style="margin:0"><label>Planned Date</label><div style="font-size:12px;color:var(--text)">').concat(p.plannedDate ? fmtDate(p.plannedDate) : "\u2014").concat(p.shift ? " \xB7 " + esc(p.shift) : "", '</div></div>\n      <div class="fg" style="margin:0"><label>Status</label><div>').concat(sbadge(p.status), "</div></div>\n    </div>\n    ").concat(p.notes ? '<div class="ops-notice">'.concat(esc(p.notes), "</div>") : "", "\n    ").concat(p.shutoutId ? '<div class="ops-notice" style="margin-top:10px">This container\'s prestaking was converted to a Shutout record \u2014 see the Shutout section for details.</div>' : "", '\n    <div style="font-size:10px;color:var(--text-3);margin-top:10px">Staged by ').concat(esc(p.createdBy || "\u2014"), " \xB7 ").concat(timeAgo(p.createdAt), "</div>\n    ").concat(canAct ? '<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">\n      <button class="modal-btn success" onclick="markPrestakeLoaded(\''.concat(p.id, '\')">\u2713 Mark Loaded on Vessel</button>\n      <button class="modal-btn danger" onclick="promptPrestakeShutout(\'').concat(p.id, '\')">\u26A0 Report Shutout</button>\n      <button class="modal-btn ghost" onclick="cancelPrestake(\'').concat(p.id, "')\">Cancel Record</button>\n    </div>") : p.status !== "staged" ? '<div style="font-size:11px;color:var(--text-3);margin-top:10px">This record is resolved \u2014 no further changes.</div>' : "", "\n  "));
}
function markPrestakeLoaded(id) {
  const p = (state.db.vesselPrestaking || []).find((x) => x.id === id);
  if (!p) return;
  if (!canManagePrestaking()) {
    toast("You do not have permission to update this record", "error");
    return;
  }
  if (p.status !== "staged") {
    toast("This record is already resolved", "error");
    return;
  }
  p.status = "loaded";
  p.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  p._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, "Container Loaded on Vessel", "".concat(p.container, " \u2014 ").concat(p.vessel || "vessel").concat(p.voyage ? " / " + p.voyage : ""));
  closeModal();
  renderPrestaking(_prestakeFilter);
  buildBadges();
  toast("".concat(p.container, " marked loaded"), "success");
}
function promptPrestakeShutout(id) {
  const p = (state.db.vesselPrestaking || []).find((x) => x.id === id);
  if (!p) return;
  if (!canManagePrestaking()) {
    toast("You do not have permission to update this record", "error");
    return;
  }
  if (p.status !== "staged") {
    toast("This record is already resolved", "error");
    return;
  }
  if (typeof _pendingShutoutImg !== "undefined") _pendingShutoutImg.ps = "";
  openModal("Report Shutout", '\n    <div class="ops-notice" style="margin-bottom:10px">This moves '.concat(esc(p.container), ' into the Shutout register as having missed its vessel.</div>\n    <div class="fg"><label>Reason (required)</label><textarea id="psShutoutReason" rows="3" placeholder="e.g. Vessel closed early, container arrived late\u2026"></textarea></div>\n    ').concat(typeof shutoutPhotoPicker === "function" ? shutoutPhotoPicker("ps") : "", '\n    <button class="submit-btn" onclick="confirmPrestakeShutout(\'').concat(id, "')\">Confirm Shutout \u2192</button>\n  "));
}
function confirmPrestakeShutout(id) {
  const p = (state.db.vesselPrestaking || []).find((x) => x.id === id);
  if (!p) return;
  if (p.status !== "staged") {
    toast("This record is already resolved", "error");
    return;
  }
  const reasonEl = document.getElementById("psShutoutReason");
  const reason = (reasonEl && reasonEl.value || "").trim();
  if (!reason) {
    toast("A reason is required", "error");
    return;
  }
  const shutout = {
    id: uid("SHT"),
    container: p.container,
    line: p.line || "",
    vessel: p.vessel || "",
    voyage: p.voyage || "",
    reason: sanitize(reason),
    truckId: p.truckId || "",
    driverId: p.driverId || "",
    notes: "Auto-logged from Prestaking record ".concat(p.id, ".").concat(p.notes ? " " + p.notes : ""),
    img: typeof _pendingShutoutImg !== "undefined" && _pendingShutoutImg.ps || "",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    status: "open",
    _dirty: true
  };
  state.db.shutouts.push(shutout);
  if (typeof _pendingShutoutImg !== "undefined") _pendingShutoutImg.ps = "";
  p.status = "shutout";
  p.shutoutId = shutout.id;
  p.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  p._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, "Prestaking Shutout", "".concat(p.container, " \u2014 ").concat(reason));
  closeModal();
  renderPrestaking(_prestakeFilter);
  buildBadges();
  if (typeof refreshContainerHistory === "function") refreshContainerHistory();
  toast("".concat(p.container, " moved to Shutout register"), "warning");
}
function cancelPrestake(id) {
  const p = (state.db.vesselPrestaking || []).find((x) => x.id === id);
  if (!p) return;
  if (!canManagePrestaking()) {
    toast("You do not have permission to update this record", "error");
    return;
  }
  if (p.status !== "staged") {
    toast("This record is already resolved", "error");
    return;
  }
  if (!confirm("Cancel the prestaking record for ".concat(p.container, "? The container will become available to stage again."))) return;
  p.status = "cancelled";
  p.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  p._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, "Prestaking Cancelled", p.container);
  closeModal();
  renderPrestaking(_prestakeFilter);
  buildBadges();
  toast("Prestaking record cancelled", "info");
}
