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
    vessel: p.vessel || "",
    // empty text, not null: a container at port has no vessel yet
    voyage: p.voyage || null,
    consignee: p.consignee || null,
    planned_date: p.plannedDate || null,
    shift: p.shift || null,
    origin: p.origin || null,
    destination: p.destination || null,
    // yard / block inside the port
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
const PS_QUEUE_DAYS = 14;
let _psTab = "arrive", _psQ = "";
const _psSel = /* @__PURE__ */ new Set();
let _psLoadIds = [];
const psNorm = (c) => String(c == null ? "" : c).toUpperCase().replace(/[^A-Z0-9]/g, "");
const psList = () => state.db.vesselPrestaking || (state.db.vesselPrestaking = []);
const psAtPort = () => psList().filter((p) => p.status === "staged");
const psById = (id) => psList().find((p) => p.id === id);
const psUser = () => state.profile && state.profile.username || "system";
const psPorts = () => window.bookingDocs && window.bookingDocs.PORT_LOCATIONS || [];
const psToday = () => {
  const d = /* @__PURE__ */ new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const psLineCode = (id) => {
  const l = id && state.db.shippingLines.find((x) => x.id === id);
  return l ? l.code || l.name : "";
};
const psTruck = (id) => {
  const t = id && state.db.trucks.find((x) => x.id === id);
  return t ? t.reg : "";
};
const psDriver = (id) => {
  const d = id && state.db.drivers.find((x) => x.id === id);
  return d ? d.name : "";
};
const psSameDay = (iso, d) => !!iso && new Date(iso).toDateString() === (d || /* @__PURE__ */ new Date()).toDateString();
function canManagePrestaking() {
  return isAdmin() || isDispatch() || isClerk();
}
function psChip(p) {
  const t = { staged: "At port", loaded: "On vessel", shutout: "Shutout", cancelled: "Removed" }[p.status] || p.status;
  return '<span class="sbadge s-'.concat(esc(p.status), '">').concat(t, "</span>");
}
function psNewRecord(o) {
  return Object.assign({
    id: uid("PSTG"),
    tripId: "",
    container: "",
    ctype: "",
    line: "",
    driverId: "",
    truckId: "",
    vessel: "",
    voyage: "",
    consignee: "",
    plannedDate: "",
    shift: "",
    origin: "",
    destination: "",
    notes: "",
    status: "staged",
    createdBy: psUser(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    resolvedAt: null,
    shutoutId: null,
    _dirty: true
  }, o);
}
function psUsedTripIds() {
  return new Set(psList().filter((p) => p.tripId && ["staged", "loaded", "shutout"].includes(p.status)).map((p) => p.tripId));
}
function prestakingEligibleTrips() {
  const used = psUsedTripIds(), cut = Date.now() - PS_QUEUE_DAYS * 864e5;
  return state.db.trips.filter((t) => isOutwardWorkType(t.workType) && t.status === "completed" && !used.has(t.id) && new Date(t.eta || t.startTime).getTime() >= cut).sort((a, b) => new Date(b.eta || b.startTime) - new Date(a.eta || a.startTime));
}
function psFromTrip(t, by) {
  return psNewRecord({
    tripId: t.id,
    container: t.container,
    ctype: t.ctype || "",
    line: t.shippingLine || "",
    driverId: t.driverId || "",
    truckId: t.truckId || "",
    vessel: t.vessel || "",
    voyage: t.voyage || "",
    consignee: t.receivingParty || "",
    origin: t.dest || "",
    createdBy: by || psUser()
  });
}
function psAfterChange(opts) {
  scheduleSave();
  try {
    buildBadges();
  } catch (e) {
  }
  if (!opts || !opts.noRender) renderPrestaking();
}
function psAutoArrive(t) {
  if (!t || !isOutwardWorkType(t.workType) || t.status !== "completed" || !t.container) return;
  if (psUsedTripIds().has(t.id)) return;
  const p = psFromTrip(t, "auto \xB7 trip completed");
  psList().push(p);
  scheduleSave();
  addAudit(psUser(), "Container Arrived at Port", "".concat(p.container, " \u2014 trip completed, recorded at port"));
  try {
    buildBadges();
  } catch (e) {
  }
  if (state.currentSection === "prestaking") renderPrestaking();
  toast("".concat(p.container, " recorded at port"), "info", 2500);
}
(function wireTripCompletion() {
  const wrap = () => {
    const orig = window.applyTripStatus;
    if (typeof orig !== "function" || orig._psw) return;
    const w = async function(t, status) {
      const r = await orig.apply(this, arguments);
      try {
        if (r && r.ok && status === "completed") psAutoArrive(t);
      } catch (e) {
        console.warn("prestaking auto-arrive:", e && e.message);
      }
      return r;
    };
    w._psw = true;
    window.applyTripStatus = w;
  };
  wrap();
  document.addEventListener("DOMContentLoaded", wrap);
})();
function psEnsureRoot() {
  const sec = document.getElementById("sec-prestaking");
  if (!sec) return null;
  if (!sec.querySelector("#psRoot")) sec.innerHTML = '<div class="sec-toolbar"><div class="sec-title">Vessel Prestaking</div></div><div id="psRoot"></div>';
  return document.getElementById("psRoot");
}
function renderPrestaking() {
  const root = psEnsureRoot();
  if (!root) return;
  const queue = prestakingEligibleTrips().length, at = psAtPort().length;
  const loadedToday = psList().filter((p) => p.status === "loaded" && psSameDay(p.resolvedAt)).length;
  const shut = state.db.shutouts.filter((s) => s.status === "open").length;
  const can = canManagePrestaking();
  root.innerHTML = '\n    <div class="ps-sum">\n      <div class="ps-stat"><b>'.concat(at, '</b><span>At port, waiting for a vessel</span></div>\n      <div class="ps-stat good"><b>').concat(loadedToday, '</b><span>Loaded on vessels today</span></div>\n      <div class="ps-stat ').concat(queue ? "warn" : "", '"><b>').concat(queue, '</b><span>Delivered, not yet recorded</span></div>\n      <div class="ps-stat ').concat(shut ? "bad" : "", '"><b>').concat(shut, '</b><span>Open shutouts</span></div>\n    </div>\n    <div class="gd-tabs">\n      <button type="button" class="gd-tab').concat(_psTab === "arrive" ? " on" : "", '" onclick="psTab(\'arrive\')">1 \xB7 Arrivals at port').concat(queue ? " (" + queue + " new)" : "", '</button>\n      <button type="button" class="gd-tab').concat(_psTab === "load" ? " on" : "", '" onclick="psTab(\'load\')">2 \xB7 Load to vessel (').concat(at, ')</button>\n    </div>\n    <div class="gs-bar">\n      <input class="gs-q" id="psSearch" type="search" autocomplete="off" placeholder="Search container, block, truck, line or vessel" value="').concat(esc(_psQ), '" oninput="psSearch(this.value)"/>\n      ').concat(_psTab === "arrive" && can ? '<button type="button" class="action-btn" onclick="showAddPrestakeModal()">+ Add container</button>' : "", '\n    </div>\n    <div id="psList"></div>');
  psPaintList();
}
function psTab(t) {
  _psTab = t;
  renderPrestaking();
}
function psSearch(v) {
  _psQ = String(v || "");
  psPaintList();
}
function filterPrestaking(f) {
  _psTab = f === "loaded" ? "load" : _psTab;
  renderPrestaking();
}
function psMatch(p) {
  const q = _psQ.trim().toUpperCase();
  if (!q) return true;
  return [p.container, p.destination, p.vessel, p.voyage, psLineCode(p.line), psTruck(p.truckId), psDriver(p.driverId), p.ctype].join(" ").toUpperCase().indexOf(q) > -1;
}
function psPaintList() {
  const el = document.getElementById("psList");
  if (!el) return;
  el.innerHTML = _psTab === "arrive" ? psArriveHtml() : psLoadHtml();
  psRefreshBar();
}
function psSub(p) {
  const bits = [p.ctype, psLineCode(p.line), p.origin].filter(Boolean).map(esc);
  const by = [psTruck(p.truckId), psDriver(p.driverId)].filter(Boolean).map(esc).join(" \xB7 ");
  return '<span class="ps-sub">'.concat(bits.join(" \xB7 ") || "\u2014", "</span>").concat(by ? '<span class="ps-sub">\u{1F69A} '.concat(by, "</span>") : "");
}
function psBlockInput(p) {
  if (!canManagePrestaking() || p.status !== "staged") return p.destination ? '<span class="ps-blk">'.concat(esc(p.destination), "</span>") : '<span class="ps-sub">\u2014</span>';
  return '<input class="ps-block" placeholder="Yard / block" maxlength="40" value="'.concat(esc(p.destination), '" onchange="psSaveBlock(\'').concat(p.id, '\',this.value)" aria-label="Yard or block for ').concat(esc(p.container), '"/>');
}
function psArriveHtml() {
  const can = canManagePrestaking(), q = _psQ.trim().toUpperCase();
  const queue = prestakingEligibleTrips().filter((t) => !q || [t.container, t.ctype, psLineCode(t.shippingLine), psTruck(t.truckId), psDriver(t.driverId)].join(" ").toUpperCase().indexOf(q) > -1);
  let html = "";
  if (queue.length) {
    html += '<div class="ps-card ps-queue"><div class="ps-card-h"><div><b>Delivered to port by Gargo, not yet recorded</b><span class="ps-sub">Completed Depot \u2192 Port trips from the last '.concat(PS_QUEUE_DAYS, " days</span></div>\n      ").concat(can ? '<button type="button" class="action-btn" onclick="psRecordAll()">Record all ('.concat(queue.length, ")</button>") : "", "</div>") + queue.slice(0, 30).map((t) => '<div class="ps-row">\n        <div class="ps-main"><b class="ps-cont">'.concat(esc(t.container), '</b><span class="ps-sub">').concat([t.ctype, psLineCode(t.shippingLine), t.dest].filter(Boolean).map(esc).join(" \xB7 ") || "\u2014", '</span></div>\n        <div class="ps-by"><span class="ps-sub">\u{1F69A} ').concat([psTruck(t.truckId), psDriver(t.driverId)].filter(Boolean).map(esc).join(" \xB7 ") || "\u2014", '</span></div>\n        <div class="ps-when">').concat(fmtDate(t.eta || t.startTime), '</div>\n        <div class="ps-acts">').concat(can ? '<button type="button" class="action-btn" onclick="psRecordTrip(\''.concat(t.id, "')\">Record at port</button>") : "", '<button type="button" class="action-btn ghost" onclick="showTripDetail(\'').concat(t.id, "')\">Trip</button></div>\n      </div>")).join("") + (queue.length > 30 ? '<div class="ps-sub" style="padding:8px 4px">+ '.concat(queue.length - 30, " more. Use \u201CRecord all\u201D.</div>") : "") + "</div>";
  }
  const rows = psList().filter((p) => p.status !== "cancelled" && psMatch(p)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  html += '<div class="ps-card"><div class="ps-card-h"><div><b>Containers recorded at port</b><span class="ps-sub">Newest first. Give each container its yard / block.</span></div></div>' + (rows.length ? rows.slice(0, 60).map((p) => '<div class="ps-row">\n        <div class="ps-main"><b class="ps-cont">'.concat(esc(p.container), "</b>").concat(psSub(p), '</div>\n        <div class="ps-by">').concat(psChip(p)).concat(p.status === "loaded" ? '<span class="ps-sub">'.concat(esc(p.vessel)).concat(p.voyage ? " \xB7 " + esc(p.voyage) : "", "</span>") : "", '</div>\n        <div class="ps-when">').concat(timeAgo(p.createdAt), '</div>\n        <div class="ps-acts">').concat(psBlockInput(p), '<button type="button" class="action-btn ghost" onclick="showPrestakeDetail(\'').concat(p.id, "')\">View</button></div>\n      </div>")).join("") + (rows.length > 60 ? '<div class="ps-sub" style="padding:8px 4px">Showing the latest 60 of '.concat(rows.length, ". Search to narrow down.</div>") : "") : '<div class="gd-empty">Nothing recorded at port yet.<br>Containers appear here when a Depot \u2192 Port trip is completed, or add one with \u201C+ Add container\u201D.</div>') + "</div>";
  return html;
}
function psLoadHtml() {
  const can = canManagePrestaking();
  const rows = psAtPort().filter(psMatch).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let html = '<div class="ps-card"><div class="ps-card-h"><div><b>In the port yard, waiting for a vessel</b><span class="ps-sub">Oldest first. Tick the containers going on the same vessel.</span></div>\n    '.concat(can ? '<div class="ps-acts"><label class="ps-all"><input type="checkbox" onchange="psSelectAll(this.checked)"/> Select all shown</label>\n    <button type="button" class="submit-btn ps-go" id="psLoadBtn" onclick="psLoadDialog()">Load on vessel \u2192</button></div>' : "", "</div>") + (rows.length ? rows.map((p) => '<div class="ps-row'.concat(_psSel.has(p.id) ? " sel" : "", '">\n        ').concat(can ? '<label class="ps-chk"><input type="checkbox" '.concat(_psSel.has(p.id) ? "checked" : "", " onchange=\"psToggle('").concat(p.id, '\',this.checked,this)" aria-label="Select ').concat(esc(p.container), '"/></label>') : "", '\n        <div class="ps-main"><b class="ps-cont">').concat(esc(p.container), "</b>").concat(psSub(p), '</div>\n        <div class="ps-by">').concat(psBlockInput(p), '</div>\n        <div class="ps-when">').concat(timeAgo(p.createdAt), '</div>\n        <div class="ps-acts">').concat(can ? '<button type="button" class="action-btn" onclick="psLoadDialog([\''.concat(p.id, "'])\">Load</button>") : "", '<button type="button" class="action-btn ghost" onclick="showPrestakeDetail(\'').concat(p.id, "')\">View</button></div>\n      </div>")).join("") : '<div class="gd-empty">'.concat(_psQ ? "No container at port matches your search." : "No containers are waiting at port.<br>Record arrivals in step 1 first.", "</div>")) + "</div>";
  const cut = Date.now() - 14 * 864e5, groups = {};
  psList().filter((p) => p.status === "loaded" && new Date(p.resolvedAt || p.createdAt).getTime() >= cut && psMatch(p)).forEach((p) => {
    const k = (p.vessel || "Vessel not named") + "|" + (p.voyage || "");
    (groups[k] = groups[k] || []).push(p);
  });
  const keys = Object.keys(groups).sort((a, b) => new Date(groups[b][0].resolvedAt) - new Date(groups[a][0].resolvedAt));
  if (keys.length) {
    html += '<div class="ps-card"><div class="ps-card-h"><div><b>Loaded on vessels</b><span class="ps-sub">Last 14 days</span></div></div>' + keys.map((k) => {
      const g = groups[k], last = g.reduce((m, p) => new Date(p.resolvedAt) > new Date(m) ? p.resolvedAt : m, g[0].resolvedAt);
      const [v, voy] = k.split("|");
      return '<div class="ps-grp"><div class="ps-grp-h"><b>'.concat(esc(v)).concat(voy ? " \xB7 Voyage " + esc(voy) : "", '</b><span class="ps-sub">').concat(g.length, " container").concat(g.length === 1 ? "" : "s", " \xB7 ").concat(fmtDate(last), '</span></div>\n          <div class="ps-tags">').concat(g.map((p) => '<button type="button" class="ps-tag" onclick="showPrestakeDetail(\''.concat(p.id, "')\">").concat(esc(p.container), "</button>")).join(""), "</div></div>");
    }).join("") + "</div>";
  }
  return html;
}
function psRefreshBar() {
  const b = document.getElementById("psLoadBtn");
  if (!b) return;
  const n = [..._psSel].filter((id) => {
    const p = psById(id);
    return p && p.status === "staged";
  }).length;
  b.textContent = n ? "Load ".concat(n, " on vessel \u2192") : "Load on vessel \u2192";
  b.disabled = !n;
}
function psToggle(id, on, el) {
  on ? _psSel.add(id) : _psSel.delete(id);
  const row = el && el.closest && el.closest(".ps-row");
  if (row) row.classList.toggle("sel", !!on);
  psRefreshBar();
}
function psSelectAll(on) {
  psAtPort().filter(psMatch).forEach((p) => on ? _psSel.add(p.id) : _psSel.delete(p.id));
  psPaintList();
}
function psSaveBlock(id, v) {
  const p = psById(id);
  if (!p || !canManagePrestaking() || p.status !== "staged") return;
  p.destination = String(v || "").trim().slice(0, 40);
  p._dirty = true;
  scheduleSave();
}
function psRecordTrip(tripId) {
  if (!canManagePrestaking()) {
    toast("You do not have permission to record containers", "error");
    return;
  }
  const t = state.db.trips.find((x) => x.id === tripId);
  if (!t || psUsedTripIds().has(tripId)) {
    renderPrestaking();
    return;
  }
  const p = psFromTrip(t);
  psList().push(p);
  addAudit(psUser(), "Container Arrived at Port", "".concat(p.container, " \u2014 recorded at port"));
  psAfterChange();
  toast("".concat(p.container, " recorded at port"), "success");
}
function psRecordAll() {
  if (!canManagePrestaking()) return;
  const q = prestakingEligibleTrips();
  if (!q.length) return;
  if (!confirm("Record all ".concat(q.length, " delivered container").concat(q.length === 1 ? "" : "s", " as arrived at port?"))) return;
  q.forEach((t) => {
    const p = psFromTrip(t);
    psList().push(p);
    addAudit(psUser(), "Container Arrived at Port", "".concat(p.container, " \u2014 recorded at port"));
  });
  psAfterChange();
  toast("".concat(q.length, " container").concat(q.length === 1 ? "" : "s", " recorded at port"), "success");
}
function showAddPrestakeModal() {
  if (!canManagePrestaking()) {
    toast("You do not have permission to record containers", "error");
    return;
  }
  const sizes = typeof CONTAINER_TYPE_OPTIONS !== "undefined" ? CONTAINER_TYPE_OPTIONS : ["20GP", "40GP", "40HC"];
  const ports = psPorts();
  openModal("Add container at port", '\n    <div class="fg"><label>Container number *</label><input id="ps_cont" placeholder="e.g. MSKU1234567" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase"/></div>\n    <div class="form-row-2">\n      <div class="fg"><label>Type / size</label><select id="ps_ctype"><option value="">Select\u2026</option>'.concat(sizes.map((s) => "<option>".concat(esc(s), "</option>")).join(""), '</select></div>\n      <div class="fg"><label>Shipping line</label><select id="ps_line"><option value="">Select\u2026</option>').concat(state.db.shippingLines.filter((l) => l.active).map((l) => '<option value="'.concat(l.id, '">').concat(esc(l.code), " \u2014 ").concat(esc(l.name), "</option>")).join(""), '</select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Port terminal</label><select id="ps_origin"><option value="">Select\u2026</option>').concat(ports.map((p) => "<option>".concat(esc(p), "</option>")).join(""), '</select></div>\n      <div class="fg"><label>Yard / block <span class="label-optional">(optional)</span></label><input id="ps_block" maxlength="40" placeholder="e.g. Block C4"/></div>\n    </div>\n    <div class="fg"><label>Remarks <span class="label-optional">(optional)</span></label><textarea id="ps_notes" rows="2"></textarea></div>\n    <div class="gs-hint">If this container has a completed Depot \u2192 Port trip, the truck, driver and line are filled in from it automatically.</div>\n    <button class="submit-btn" onclick="savePrestake()">Record at port \u2192</button>'));
}
function savePrestake() {
  const v = (id) => (document.getElementById(id) && document.getElementById(id).value || "").trim();
  const key = psNorm(v("ps_cont"));
  if (key.length < 10) {
    toast("Enter the full container number", "error");
    return;
  }
  if (psAtPort().some((p2) => psNorm(p2.container) === key)) {
    toast("This container is already at port", "error");
    return;
  }
  const used = psUsedTripIds();
  const trip = state.db.trips.filter((t) => isOutwardWorkType(t.workType) && t.status === "completed" && psNorm(t.container) === key && !used.has(t.id)).sort((a, b) => new Date(b.eta || b.startTime) - new Date(a.eta || a.startTime))[0];
  const p = trip ? psFromTrip(trip) : psNewRecord({});
  p.container = trip ? trip.container : v("ps_cont").toUpperCase().replace(/\s+/g, "");
  p.ctype = v("ps_ctype") || p.ctype;
  p.line = v("ps_line") || p.line;
  p.origin = v("ps_origin") || p.origin;
  p.destination = v("ps_block").slice(0, 40);
  p.notes = v("ps_notes");
  psList().push(p);
  addAudit(psUser(), "Container Arrived at Port", "".concat(p.container, " \u2014 added by hand").concat(trip ? " (linked to trip)" : ""));
  closeModal();
  psAfterChange();
  toast("".concat(p.container, " recorded at port").concat(trip ? " \xB7 linked to its trip" : ""), "success");
}
function psVesselNames() {
  const s = /* @__PURE__ */ new Set();
  psList().forEach((p) => {
    if (p.vessel) s.add(p.vessel);
  });
  state.db.trips.slice(-300).forEach((t) => {
    if (t.vessel) s.add(t.vessel);
  });
  return [...s].sort();
}
function psLoadDialog(ids) {
  if (!canManagePrestaking()) {
    toast("You do not have permission to load containers", "error");
    return;
  }
  _psLoadIds = (ids || [..._psSel]).filter((id) => {
    const p = psById(id);
    return p && p.status === "staged";
  });
  if (!_psLoadIds.length) {
    toast("Tick the containers that are going on the vessel", "info");
    return;
  }
  const ps = _psLoadIds.map(psById), first = ps[0];
  openModal("Load on vessel \u2014 ".concat(ps.length, " container").concat(ps.length === 1 ? "" : "s"), '\n    <div class="ps-tags" style="margin-bottom:12px">'.concat(ps.slice(0, 40).map((p) => '<span class="ps-tag static">'.concat(esc(p.container), "</span>")).join("")).concat(ps.length > 40 ? '<span class="ps-sub">+ '.concat(ps.length - 40, " more</span>") : "", '</div>\n    <div class="form-row-2">\n      <div class="fg"><label>Vessel name *</label><input id="ps_vessel" list="psVessels" value="').concat(esc(first.vessel), '" placeholder="e.g. MV Maersk Emerald" autocomplete="off"/><datalist id="psVessels">').concat(psVesselNames().map((n) => '<option value="'.concat(esc(n), '">')).join(""), '</datalist></div>\n      <div class="fg"><label>Voyage no. <span class="label-optional">(optional)</span></label><input id="ps_voyage" value="').concat(esc(first.voyage), '" placeholder="e.g. 234W"/></div>\n    </div>\n    <div class="fg"><label>Date loaded</label><input type="date" id="ps_date" value="').concat(psToday(), '"/></div>\n    <button class="submit-btn" onclick="psConfirmLoad()">Confirm loaded \u2192</button>'));
}
function psConfirmLoad() {
  const vessel = (document.getElementById("ps_vessel").value || "").trim().slice(0, 80);
  const voyage = (document.getElementById("ps_voyage").value || "").trim().slice(0, 40);
  const date = document.getElementById("ps_date").value || psToday();
  if (!vessel) {
    toast("Vessel name is required", "error");
    return;
  }
  const when = date === psToday() ? (/* @__PURE__ */ new Date()).toISOString() : (/* @__PURE__ */ new Date(date + "T12:00:00")).toISOString();
  let n = 0;
  _psLoadIds.forEach((id) => {
    const p = psById(id);
    if (!p || p.status !== "staged") return;
    p.vessel = vessel;
    p.voyage = voyage;
    p.plannedDate = date;
    p.status = "loaded";
    p.resolvedAt = when;
    p._dirty = true;
    const t = p.tripId && state.db.trips.find((x) => x.id === p.tripId);
    if (t && (!t.vessel || t.vessel !== vessel)) {
      t.vessel = vessel;
      if (voyage) t.voyage = voyage;
      t._dirty = true;
    }
    addAudit(psUser(), "Container Loaded on Vessel", "".concat(p.container, " \u2014 ").concat(vessel).concat(voyage ? " / " + voyage : ""));
    _psSel.delete(id);
    n++;
  });
  _psLoadIds = [];
  closeModal();
  psAfterChange();
  toast("".concat(n, " container").concat(n === 1 ? "" : "s", " loaded on ").concat(vessel), "success");
}
function showPrestakeDetail(id) {
  const p = psById(id);
  if (!p) return;
  const can = canManagePrestaking(), tr = psTruck(p.truckId), dr = psDriver(p.driverId);
  const fact = (k, v) => '<div class="fg" style="margin:0"><label>'.concat(k, '</label><div style="font-size:12.5px;color:var(--text)">').concat(v || "\u2014", "</div></div>");
  const step = (done, label, detail) => '<div class="ps-step'.concat(done ? " done" : "", '"><i></i><div><b>').concat(label, '</b><span class="ps-sub">').concat(detail || "", "</span></div></div>");
  const shut = p.status === "shutout", cancelled = p.status === "cancelled";
  openModal("Port & vessel \u2014 ".concat(p.container), '\n    <div style="margin-bottom:12px">'.concat(psChip(p), '</div>\n    <div class="ps-steps">\n      ').concat(step(true, "Arrived at port", "".concat(esc(p.origin || "Port"), " \xB7 ").concat(timeAgo(p.createdAt), " \xB7 ").concat(esc(p.createdBy || ""))), "\n      ").concat(step(!!p.destination, "Yard / block", esc(p.destination || "not set")), "\n      ").concat(step(p.status === "loaded", "Loaded on vessel", p.status === "loaded" ? "".concat(esc(p.vessel)).concat(p.voyage ? " \xB7 Voyage " + esc(p.voyage) : "", " \xB7 ").concat(fmtDate(p.resolvedAt)) : shut ? "Missed the vessel (shutout)" : cancelled ? "Removed from the list" : "waiting"), '\n    </div>\n    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">\n      ').concat(fact("Type", esc(p.ctype))).concat(fact("Shipping line", esc(psLineCode(p.line))), "\n      ").concat(fact("Brought by (truck)", esc(tr))).concat(fact("Driver", esc(dr)), "\n    </div>\n    ").concat(p.notes ? '<div class="ops-notice">'.concat(esc(p.notes), "</div>") : "", '\n    <div class="ps-links">\n      <button type="button" class="action-btn ghost" onclick="closeModal();showContainerDetail(\'').concat(esc(p.container), "')\">Container history</button>\n      ").concat(p.tripId && state.db.trips.some((t) => t.id === p.tripId) ? '<button type="button" class="action-btn ghost" onclick="closeModal();showTripDetail(\''.concat(p.tripId, "')\">Dispatch trip</button>") : "", "\n      ").concat(p.shutoutId ? '<button type="button" class="action-btn ghost" onclick="closeModal();showSection(\'shutout\',document.querySelector(\'.nav-item[data-section=shutout]\'))">Shutout register</button>' : "", "\n    </div>\n    ").concat(can && p.status === "staged" ? '<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">\n      <button class="modal-btn success" onclick="psLoadDialog([\''.concat(p.id, '\'])">\u2713 Load on vessel</button>\n      <button class="modal-btn danger" onclick="promptPrestakeShutout(\'').concat(p.id, '\')">\u26A0 Missed vessel (shutout)</button>\n      <button class="modal-btn ghost" onclick="cancelPrestake(\'').concat(p.id, "')\">Remove from list</button></div>") : "", "\n    ").concat(can && shut ? '<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:12px"><button class="modal-btn ghost" onclick="psRequeue(\''.concat(p.id, "')\">Put back on the port list for the next vessel</button></div>") : "", "\n  "));
}
function promptPrestakeShutout(id) {
  const p = psById(id);
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
  openModal("Missed vessel (shutout)", '\n    <div class="ops-notice" style="margin-bottom:10px">'.concat(esc(p.container), ' goes into the Shutout register as having missed its vessel. It stays on record so it can be put back on the port list.</div>\n    <div class="form-row-2">\n      <div class="fg"><label>Vessel it missed</label><input id="psShutVessel" value="').concat(esc(p.vessel), '" placeholder="e.g. MV Maersk Emerald"/></div>\n      <div class="fg"><label>Voyage <span class="label-optional">(optional)</span></label><input id="psShutVoyage" value="').concat(esc(p.voyage), '"/></div>\n    </div>\n    <div class="fg"><label>Reason (required)</label><textarea id="psShutoutReason" rows="3" placeholder="e.g. Vessel closed early, documents not cleared\u2026"></textarea></div>\n    ').concat(typeof shutoutPhotoPicker === "function" ? shutoutPhotoPicker("ps") : "", '\n    <button class="submit-btn" onclick="confirmPrestakeShutout(\'').concat(id, "')\">Confirm shutout \u2192</button>"));
}
function confirmPrestakeShutout(id) {
  const p = psById(id);
  if (!p) return;
  if (p.status !== "staged") {
    toast("This record is already resolved", "error");
    return;
  }
  const val = (el) => (document.getElementById(el) && document.getElementById(el).value || "").trim();
  const reason = val("psShutoutReason");
  if (!reason) {
    toast("A reason is required", "error");
    return;
  }
  const vessel = val("psShutVessel").slice(0, 80), voyage = val("psShutVoyage").slice(0, 40);
  const shutout = {
    id: uid("SHT"),
    container: p.container,
    line: p.line || "",
    vessel: vessel || p.vessel || "",
    voyage: voyage || p.voyage || "",
    reason: sanitize(reason),
    truckId: p.truckId || "",
    driverId: p.driverId || "",
    notes: "Logged from Vessel Prestaking record ".concat(p.id, ".").concat(p.destination ? " Block " + p.destination + "." : "").concat(p.notes ? " " + p.notes : ""),
    img: typeof _pendingShutoutImg !== "undefined" && _pendingShutoutImg.ps || "",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    status: "open",
    _dirty: true
  };
  state.db.shutouts.push(shutout);
  if (typeof _pendingShutoutImg !== "undefined") _pendingShutoutImg.ps = "";
  p.vessel = shutout.vessel;
  p.voyage = shutout.voyage;
  p.status = "shutout";
  p.shutoutId = shutout.id;
  p.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  p._dirty = true;
  _psSel.delete(id);
  addAudit(psUser(), "Prestaking Shutout", "".concat(p.container, " \u2014 ").concat(reason));
  closeModal();
  psAfterChange();
  if (typeof refreshContainerHistory === "function") refreshContainerHistory();
  toast("".concat(p.container, " moved to the Shutout register"), "warning");
}
function psRequeue(id) {
  const p = psById(id);
  if (!p || p.status !== "shutout" || !canManagePrestaking()) return;
  if (psAtPort().some((x) => psNorm(x.container) === psNorm(p.container))) {
    toast("This container is already on the port list", "error");
    return;
  }
  const n = psNewRecord({
    tripId: p.tripId,
    container: p.container,
    ctype: p.ctype,
    line: p.line,
    driverId: p.driverId,
    truckId: p.truckId,
    origin: p.origin,
    destination: p.destination,
    consignee: p.consignee,
    notes: "Put back after a shutout"
  });
  psList().push(n);
  addAudit(psUser(), "Container Arrived at Port", "".concat(n.container, " \u2014 back on the port list after a shutout"));
  closeModal();
  psAfterChange();
  toast("".concat(n.container, " is back on the port list"), "success");
}
function cancelPrestake(id) {
  const p = psById(id);
  if (!p) return;
  if (!canManagePrestaking()) {
    toast("You do not have permission to update this record", "error");
    return;
  }
  if (p.status !== "staged") {
    toast("This record is already resolved", "error");
    return;
  }
  if (!confirm("Remove ".concat(p.container, " from the port list? Use this only if it was recorded by mistake."))) return;
  p.status = "cancelled";
  p.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  p._dirty = true;
  _psSel.delete(id);
  addAudit(psUser(), "Prestaking Cancelled", p.container);
  closeModal();
  psAfterChange();
  toast("Removed from the port list", "info");
}
function markPrestakeLoaded(id) {
  psLoadDialog([id]);
}
function onPrestakeTripChange() {
}
function prestakeTripLabel(t) {
  return "".concat(t.container, " \u2014 ").concat(t.ctype || "\u2014", " \xB7 ").concat(t.shippingLine ? lineName(t.shippingLine) : "\u2014");
}
function renderPrestakingKpis() {
  renderPrestaking();
}
function renderPrestakingList() {
  psPaintList();
}
(function wireContainerHistory() {
  const wrap = () => {
    const orig = window.showContainerDetail;
    if (typeof orig !== "function" || orig._psw) return;
    const w = function(c) {
      const r = orig.apply(this, arguments);
      try {
        const key = psNorm(c);
        const recs = psList().filter((p) => psNorm(p.container) === key && p.status !== "cancelled").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const body = document.getElementById("modalBody");
        if (recs.length && body) {
          body.insertAdjacentHTML("beforeend", '<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Port &amp; Vessel ('.concat(recs.length, ")</div>") + recs.map((p) => '<div class="activity-row" style="cursor:pointer" onclick="closeModal();showPrestakeDetail(\''.concat(p.id, '\')"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">').concat(p.status === "loaded" ? esc(p.vessel || "Vessel") + (p.voyage ? " \xB7 Voyage " + esc(p.voyage) : "") : esc(p.origin || "Port") + (p.destination ? " \xB7 " + esc(p.destination) : ""), '</div><div style="font-size:10px;color:var(--text-3)">').concat(truckName(p.truckId), " \xB7 ").concat(driverName(p.driverId), "</div></div>").concat(psChip(p), '<div class="act-time">').concat(fmtDate(p.resolvedAt || p.createdAt), "</div></div>")).join(""));
        }
      } catch (e) {
        console.warn("prestaking history:", e && e.message);
      }
      return r;
    };
    w._psw = true;
    window.showContainerDetail = w;
  };
  wrap();
  document.addEventListener("DOMContentLoaded", wrap);
})();
