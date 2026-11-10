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
function tripToRow(t) {
  return { id: t.id, truck_id: t.truckId || null, driver_id: t.driverId || null, container: t.container, container_type: t.ctype, work_type: t.workType, outward_type: t.outwardType || null, origin: t.origin, destination: t.dest, shipping_line_id: t.shippingLine || null, status: t.status, start_time: t.startTime, eta: t.eta, distance: t.distance, priority: t.priority, notes: t.notes, reference: t.ref, container_images: JSON.stringify(t.containerImages || []), booking_id: t.bookingId || null, storage_zone_id: t.storageZoneId || null, storage_teu: t.storageTeu || null, storage_released: !!t.storageReleased, eir_number: t.eirNumber || null, receiving_party: t.receivingParty || null, release_order_no: t.releaseOrderNo || null, vessel: t.vessel || null, voyage: t.voyage || null, date_out: t.dateOut || null, flagged_for_review: !!t.flaggedForReview, flag_reasons: JSON.stringify(t.flagReasons || []), duplicate_of_id: t.duplicateOfId || null, import_batch_id: t.importBatchId || null };
}
function tripFromRow(r) {
  let imgs = [];
  try {
    imgs = r.container_images ? JSON.parse(r.container_images) : [];
  } catch (e) {
    imgs = [];
  }
  let flagReasons = [];
  try {
    flagReasons = r.flag_reasons ? typeof r.flag_reasons === "string" ? JSON.parse(r.flag_reasons) : r.flag_reasons : [];
  } catch (e) {
    flagReasons = [];
  }
  return { id: r.id, truckId: r.truck_id, driverId: r.driver_id, container: r.container, ctype: r.container_type, workType: r.work_type, outwardType: r.outward_type || null, origin: r.origin, dest: r.destination, shippingLine: r.shipping_line_id, status: r.status, startTime: r.start_time, eta: r.eta, distance: r.distance, priority: r.priority, notes: r.notes, ref: r.reference, containerImages: imgs, bookingId: r.booking_id || null, storageZoneId: r.storage_zone_id || null, storageTeu: r.storage_teu || null, storageReleased: !!r.storage_released, eirNumber: r.eir_number || "", receivingParty: r.receiving_party || "", releaseOrderNo: r.release_order_no || "", vessel: r.vessel || "", voyage: r.voyage || "", dateOut: r.date_out || null, flaggedForReview: !!r.flagged_for_review, flagReasons, duplicateOfId: r.duplicate_of_id || null, importBatchId: r.import_batch_id || null };
}
function isOutwardWorkType(workType) {
  return workType === "Depot \u2192 Port";
}
const TERMINAL_TRIP_STATUSES = ["completed"];
function isTripLive(t) {
  return !TERMINAL_TRIP_STATUSES.includes(t.status);
}
function findLiveTripByContainer(cont, excludeTripId) {
  if (!cont) return null;
  const c = cont.trim().toUpperCase();
  return state.db.trips.find((t) => t.id !== excludeTripId && isTripLive(t) && (t.container || "").toUpperCase() === c) || null;
}
const ISO6346_LETTER_VALUES = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38
};
function iso6346CheckDigit(first10) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = first10[i];
    const val = /[0-9]/.test(ch) ? parseInt(ch, 10) : ISO6346_LETTER_VALUES[ch];
    if (val === void 0) return null;
    sum += val * Math.pow(2, i);
  }
  const rem = sum % 11;
  return rem === 10 ? 0 : rem;
}
function containerFormatIssue(cont) {
  const c = (cont || "").trim().toUpperCase();
  if (!c) return "Container number is required";
  if (c.length !== 11) return "Must be 11 characters (owner code + serial + check digit) \u2014 got ".concat(c.length);
  if (!/^[A-Z]{3}/.test(c)) return "First 3 characters must be letters (owner code)";
  if (!/^[A-Z]{3}[UJZ]/.test(c)) return "4th character must be U, J, or Z (equipment category)";
  if (!/^[A-Z]{4}\d{6}\d$/.test(c)) return "Characters 5\u201311 must be digits (serial number + check digit)";
  const expected = iso6346CheckDigit(c.slice(0, 10));
  const actual = parseInt(c[10], 10);
  if (expected === null) return "Could not compute check digit";
  if (expected !== actual) {
    const mode = window.cfgGet && window.cfgGet("ops.checkDigit") || "block";
    const msg = "Check digit should be ".concat(expected, ", not ").concat(actual, " \u2014 verify the container number");
    if (mode === "off") return null;
    if (mode === "warn") {
      window.__cdWarned = window.__cdWarned || /* @__PURE__ */ new Set();
      if (!window.__cdWarned.has(c)) {
        window.__cdWarned.add(c);
        if (window.toast) toast(c + ": " + msg + " (allowed by your settings)", "warning", 6e3);
      }
      return null;
    }
    return msg;
  }
  return null;
}
function isValidContainerFormat(cont) {
  return containerFormatIssue(cont) === null;
}
function markContainerValidity(el) {
  const start = el.selectionStart, end = el.selectionEnd;
  el.value = el.value.toUpperCase();
  if (el.setSelectionRange) el.setSelectionRange(start, end);
  const v = el.value.trim();
  el.classList.remove("input-valid", "input-invalid");
  if (v.length < 4) return;
  el.classList.add(isValidContainerFormat(v) ? "input-valid" : "input-invalid");
}
let _tripFilter = "active";
function filterTrips(f, btn) {
  _tripFilter = f;
  document.querySelectorAll("#sec-trips .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderTrips(f);
}
function renderTrips(f) {
  let trips = state.db.trips;
  if (f === "flagged") trips = trips.filter((t) => t.flaggedForReview);
  else if (f !== "all") trips = trips.filter((t) => t.status === f);
  const el = document.getElementById("tripsList");
  if (!el) return;
  el.innerHTML = trips.map((t) => '<div class="trip-card status-'.concat(t.status, '" onclick="showTripDetail(\'').concat(t.id, '\')"><div class="trip-card-head"><div class="trip-route">').concat(t.origin, '<span class="arrow">\u2192</span>').concat(t.dest, "</div>").concat(sbadge(t.status)).concat(t.flaggedForReview ? '<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="'.concat(esc((t.flagReasons || []).join("; ")), '">\u26A0 Flagged</span>') : "", '</div><div class="trip-meta"><span>\u{1F69B} ').concat(truckName(t.truckId), "</span><span>\u{1F464} ").concat(driverName(t.driverId), '</span><span class="mono" style="font-size:10.5px;color:var(--gold)">').concat(t.container, "</span><span>").concat(t.ctype, " \xB7 ").concat(t.workType).concat(t.outwardType ? " \xB7 " + sanitize(t.outwardType) : "", "</span><span>\u{1F550} Started ").concat(timeAgo(t.startTime), " \xB7 ETA ").concat(fmtTime(t.eta), "</span><span>").concat(t.distance, "km \xB7 ").concat(sbadge(t.priority.toLowerCase()), "</span></div></div>")).join("") || '<div class="empty-state"><div class="empty-state-icon">\u{1F5FA}\uFE0F</div><div class="empty-state-label">No trips in this filter</div></div>';
}
function showTripDetail(id) {
  const t = state.db.trips.find((t2) => t2.id === id);
  if (!t) return;
  const line = state.db.shippingLines.find((l) => l.id === t.shippingLine);
  const needsDispatch = isTripLive(t) && (!t.truckId || !t.driverId);
  const gallery = Array.isArray(t.containerImages) && t.containerImages.length ? '<div style="margin-bottom:14px"><div class="fg" style="margin:0 0 6px"><label>Container Photos ('.concat(t.containerImages.length, ')</label></div><div class="container-img-grid">').concat(t.containerImages.map((src) => '<div class="container-img-thumb view-only"><img src="'.concat(src, '" onclick="window.open(\'').concat(src, "','_blank')\" /></div>")).join(""), "</div></div>") : "";
  openModal("Trip \u2014 ".concat(t.container), "".concat(needsDispatch ? '<div class="ops-notice" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>This trip is awaiting a truck/driver assignment.</span><button class="modal-btn primary" onclick="closeModal();jumpToCompleteDispatch(\''.concat(t.id, "')\">Complete in Dispatch \u2192</button></div>") : "").concat(gallery, '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Container</label><div class="mono" style="color:var(--gold);font-size:13px">').concat(t.container, '</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">').concat(t.ctype, '</div></div><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">').concat(truckName(t.truckId), '</div></div><div class="fg" style="margin:0"><label>Driver</label><div style="font-size:12px;color:var(--text)">').concat(driverName(t.driverId), '</div></div><div class="fg" style="margin:0"><label>Origin</label><div style="font-size:12px;color:var(--text)">').concat(t.origin, '</div></div><div class="fg" style="margin:0"><label>Destination</label><div style="font-size:12px;color:var(--text)">').concat(t.dest, '</div></div><div class="fg" style="margin:0"><label>Work Type</label><div style="font-size:12px;color:var(--text)">').concat(t.workType, "</div></div>").concat(t.outwardType ? '<div class="fg" style="margin:0"><label>Outward Type</label><div style="font-size:12px;color:var(--gold)">'.concat(sanitize(t.outwardType), "</div></div>") : "", '<div class="fg" style="margin:0"><label>Distance</label><div style="font-size:12px;color:var(--text)">').concat(t.distance, ' km</div></div><div class="fg" style="margin:0"><label>Started</label><div style="font-size:12px;color:var(--text)">').concat(fmtTime(t.startTime), '</div></div><div class="fg" style="margin:0"><label>ETA</label><div style="font-size:12px;color:var(--text)">').concat(fmtTime(t.eta), '</div></div><div class="fg" style="margin:0"><label>Shipping Line</label><div style="font-size:12px;color:var(--text)">').concat(line ? line.name : "\u2014", '</div></div><div class="fg" style="margin:0"><label>Priority</label><div>').concat(sbadge(t.priority.toLowerCase()), '</div></div><div class="fg" style="margin:0"><label>Reference</label><div class="mono" style="font-size:11px;color:var(--text-2)">').concat(t.ref, '</div></div><div class="fg" style="margin:0"><label>Status</label><div>').concat(sbadge(t.status), "</div></div></div>").concat(t.notes ? '<div class="ops-notice">'.concat(t.notes, "</div>") : "").concat(t.flaggedForReview ? '<div class="ops-notice" style="margin-top:10px"><div style="margin-bottom:6px">\u26A0 Flagged on import: '.concat(esc((t.flagReasons || []).join("; ")), "</div><button class=\"modal-btn ghost\" onclick=\"clearReviewFlag('trips','").concat(t.id, "');closeModal()\">\u2713 Mark Reviewed</button></div>") : "").concat(canUpdateTripStatus(t) ? '<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:10px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip Step Update '.concat(t.status === "completed" ? "\u2014 trip complete, no further changes" : "(forward only)", '</div><div style="display:flex;gap:6px;flex-wrap:wrap">').concat(nextTripStatuses(t.status).length ? nextTripStatuses(t.status).map((s) => '<button class="filter-btn" onclick="quickSetTripStatus(\''.concat(id, "','").concat(s, "')\">").concat(s.replace("_", " "), "</button>")).join("") : '<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>', "</div>").concat(isAdmin() ? adminDeleteBtn("trips", id) : "", "</div>") : ""));
}
const TRIP_STATUS_RANK = { active: 0, loaded: 1, on_trip: 2, delayed: 2, breakdown: 2, offloaded: 3, completed: 4 };
const TRIP_ALL_STATUSES = Object.keys(TRIP_STATUS_RANK);
function canTransitionTripStatus(from, to) {
  if (!(from in TRIP_STATUS_RANK) || !(to in TRIP_STATUS_RANK)) return false;
  if (from === to) return false;
  if (from === "completed") return false;
  return TRIP_STATUS_RANK[to] >= TRIP_STATUS_RANK[from];
}
function nextTripStatuses(currentStatus) {
  return TRIP_ALL_STATUSES.filter((s) => canTransitionTripStatus(currentStatus, s));
}
function canUpdateTripStatus(t) {
  if (!t) return false;
  if (isAdmin() || isClerk() || isDispatch()) return true;
  if (isDriver()) {
    const d = myDriverRecord();
    return !!d && t.driverId === d.id;
  }
  return false;
}
async function applyTripStatus(t, status, actorLabel) {
  if (!canUpdateTripStatus(t)) return { ok: false, reason: "permission" };
  if (!canTransitionTripStatus(t.status, status)) return { ok: false, reason: "transition", from: t.status };
  const old = t.status;
  const truck = state.db.trucks.find((tr) => tr.id === t.truckId);
  const driver = state.db.drivers.find((d) => d.id === t.driverId);
  const truckSnapshot = truck ? __spreadValues({}, truck) : null;
  const driverSnapshot = driver ? __spreadValues({}, driver) : null;
  t.status = status;
  let truckChanged = false, driverChanged = false;
  let newMaintenanceTicket = null;
  if (status === "breakdown") {
    if (truck) {
      truck.status = "breakdown";
      truckChanged = true;
    }
    const existing = state.db.maintenance.find((m) => m.truckId === t.truckId && m.status !== "resolved" && m.type === "Breakdown");
    if (existing) {
      existing.reportedByDriver = existing.reportedByDriver || isDriver();
    } else {
      newMaintenanceTicket = {
        id: uid("MNT"),
        truckId: t.truckId,
        type: "Breakdown",
        desc: "Breakdown reported on trip ".concat(t.container, " (").concat(t.origin, " \u2192 ").concat(t.dest, ")."),
        priority: "critical",
        status: "open",
        date: (/* @__PURE__ */ new Date()).toISOString(),
        cost: 0,
        tech: "",
        resolvedDate: null,
        reportedByDriver: isDriver()
      };
      state.db.maintenance.push(newMaintenanceTicket);
    }
  }
  if (status === "completed") {
    if (truck && truck.status === "on_trip") {
      truck.status = "available";
      truckChanged = true;
    }
    if (driver && driver.status === "on_trip") {
      driver.status = "available";
      driverChanged = true;
    }
    if (driver) {
      driver.load = null;
      driver.tripsToday++;
      driverChanged = true;
    }
  }
  try {
    const writes = [supabase.from("trips").update(tripToRow(t)).eq("id", t.id)];
    if (truck && truckChanged) writes.push(supabase.from("trucks").update(truckToRow(truck)).eq("id", truck.id));
    if (driver && driverChanged) writes.push(supabase.from("drivers").update(driverToRow(driver)).eq("id", driver.id));
    const results = await Promise.all(writes);
    const failed = results.find((r) => r && r.error);
    if (failed) throw failed.error;
    if (newMaintenanceTicket) {
      const { error: mErr } = await supabase.from("maintenance").insert(maintToRow(newMaintenanceTicket));
      if (mErr) throw mErr;
    }
  } catch (e) {
    console.error("Trip status save failed:", e && e.message, e);
    t.status = old;
    if (truck && truckSnapshot) Object.assign(truck, truckSnapshot);
    if (driver && driverSnapshot) Object.assign(driver, driverSnapshot);
    if (newMaintenanceTicket) {
      const idx = state.db.maintenance.indexOf(newMaintenanceTicket);
      if (idx > -1) state.db.maintenance.splice(idx, 1);
    }
    buildBadges();
    return { ok: false, reason: "save", error: e, message: e && e.message || "" };
  }
  if (status === "breakdown") buildAlerts();
  buildBadges();
  addAudit(actorLabel, "Trip Status Update", "".concat(t.container, " ").concat(old, " \u2192 ").concat(status));
  if (status === "completed" && t.storageZoneId && !t.storageReleased) {
    try {
      const res = await window.bookingDocs.releaseStorageForTrip(t.id);
      if (res && res.released) t.storageReleased = true;
    } catch (e) {
      console.error("Depot storage release failed:", e && e.message, e);
      toast("Trip completed, but couldn't auto-release depot storage \u2014 release it manually from DepOps (".concat(e && e.message || "error", ")"), "warning", 6e3);
    }
  }
  return { ok: true, old, status };
}
async function quickSetTripStatus(id, status) {
  const t = state.db.trips.find((t2) => t2.id === id);
  if (!t) {
    toast("Trip not found", "error");
    return;
  }
  if (!canUpdateTripStatus(t)) {
    toast("You do not have permission to update this trip", "error");
    return;
  }
  toast("Saving\u2026", "info", 1200);
  const res = await applyTripStatus(t, status, state.profile.username);
  if (!res.ok) {
    if (res.reason === "transition") {
      toast('Cannot change status from "'.concat(res.from.replace("_", " "), '" to "').concat(status.replace("_", " "), '" \u2014 trips can only move forward'), "error");
    } else if (res.reason === "save") {
      toast(res.message ? "Could not save this update \u2014 ".concat(res.message) : "Could not save this update \u2014 check your connection and try again", "error", 5e3);
    } else {
      toast("You do not have permission to update this trip", "error");
    }
    return;
  }
  closeModal();
  if (document.getElementById("tripsList")) renderTrips(_tripFilter);
  toast("Trip updated to ".concat(status.replace("_", " ")), "success");
}
let _dpTab = "trip";
function renderDriverPortal() {
  const p = state.profile;
  const av = document.getElementById("dp_driverAv");
  if (av) av.textContent = initials((p == null ? void 0 : p.name) || "D");
  const nm = document.getElementById("dp_driverName");
  if (nm) nm.textContent = (p == null ? void 0 : p.name) || "Driver";
  const rl = document.getElementById("dp_driverRole");
  if (rl) rl.textContent = roleLabel(p == null ? void 0 : p.role);
  const body = document.getElementById("dp_body");
  if (!body) return;
  const driver = myDriverRecord();
  if (!driver) {
    body.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\u{1F69A}</div><div class="empty-state-label">Your login isn\'t linked to a driver record yet. Ask an administrator to link it in Driver \u2192 Edit.</div></div>';
    return;
  }
  checkGeoPermission().then(() => {
    if (driverShouldTrack(driver) && state.geoPermission !== "denied") startDriverTracking();
    else if (!driverShouldTrack(driver)) stopDriverTracking();
    renderDutyBar();
  });
  renderDutyBar();
  body.innerHTML = '\n    <div class="filter-row" style="margin-bottom:14px;flex-wrap:wrap">\n      <button class="filter-btn'.concat(_dpTab === "trip" ? " active" : "", '" onclick="dpSwitchTab(\'trip\')">My Trip</button>\n      <button class="filter-btn').concat(_dpTab === "completed" ? " active" : "", '" onclick="dpSwitchTab(\'completed\')">Completed Trips</button>\n      <button class="filter-btn').concat(_dpTab === "fuel" ? " active" : "", '" onclick="dpSwitchTab(\'fuel\')">Fuel Log</button>\n      <button class="filter-btn').concat(_dpTab === "requisitions" ? " active" : "", '" onclick="dpSwitchTab(\'requisitions\')">Requisitions</button>\n      <button class="filter-btn').concat(_dpTab === "workshop" ? " active" : "", '" onclick="dpSwitchTab(\'workshop\')">Workshop</button>\n      <button class="filter-btn').concat(_dpTab === "shutouts" ? " active" : "", '" onclick="dpSwitchTab(\'shutouts\')">Shutouts</button>\n    </div>\n    <div id="dp_tabBody"></div>\n  ');
  dpRenderTab(driver);
}
function dpSwitchTab(tab) {
  _dpTab = tab;
  renderDriverPortal();
}
function dpRenderTab(driver) {
  const el = document.getElementById("dp_tabBody");
  if (!el) return;
  if (_dpTab === "trip") return dpRenderTripTab(el, driver);
  if (_dpTab === "completed") return dpRenderCompletedTripsTab(el, driver);
  if (_dpTab === "fuel") return dpRenderFuelTab(el, driver);
  if (_dpTab === "requisitions") return dpRenderReqTab(el, driver);
  if (_dpTab === "workshop") return dpRenderWorkshopTab(el, driver);
  if (_dpTab === "shutouts") return dpRenderShutoutTab(el, driver);
}
function dpRenderTripTab(el, driver) {
  const truck = driver.truckId ? state.db.trucks.find((t) => t.id === driver.truckId) : null;
  const myTrips = state.db.trips.filter((t) => t.driverId === driver.id && t.status !== "completed").sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const active = myTrips[0];
  el.innerHTML = '\n    <div class="panel" style="margin-bottom:14px">\n      <div class="panel-head"><span class="panel-title">My Truck</span>'.concat(truck ? sbadge(truck.status) : "", '</div>\n      <div style="padding:14px;font-size:13px;color:var(--text);display:flex;justify-content:space-between;align-items:center">\n        <span>').concat(truck ? "".concat(truck.reg, " \u2014 ").concat(truck.make) : "No truck currently assigned", "</span>\n        ").concat(truck ? '<button class="action-btn danger" style="flex-shrink:0" onclick="driverReportBreakdown(\''.concat(truck.id, "')\">\u26A0 Report Breakdown</button>") : "", '\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Active Trip</span></div>\n      <div style="padding:14px">\n        ').concat(active ? '\n          <div style="margin-bottom:12px">\n            <div class="mono" style="color:var(--gold);font-size:15px">'.concat(active.container, '</div>\n            <div style="font-size:12px;color:var(--text-2);margin-top:2px">').concat(active.origin, " \u2192 ").concat(active.dest, '</div>\n            <div style="font-size:11px;color:var(--text-3);margin-top:4px">').concat(active.workType, " \xB7 ").concat(active.ctype, '</div>\n            <div style="margin-top:8px">').concat(sbadge(active.status), '</div>\n          </div>\n          <div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Update Trip Step (forward only)</div>\n          <div style="display:flex;gap:6px;flex-wrap:wrap">\n            ').concat(nextTripStatuses(active.status).filter((s) => DRIVER_TRIP_STEPS.includes(s)).map((s) => '<button class="filter-btn" onclick="driverAdvanceTrip(\''.concat(active.id, "','").concat(s, "')\">").concat(s.replace("_", " "), "</button>")).join("") || '<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>', "\n          </div>\n        ") : '<div class="empty-state"><div class="empty-state-label">No active trip assigned right now</div></div>', "\n      </div>\n    </div>\n  ");
}
function dpRenderCompletedTripsTab(el, driver) {
  const trips = state.db.trips.filter((t) => t.driverId === driver.id && t.status === "completed").sort((a, b) => new Date(b.eta) - new Date(a.eta));
  el.innerHTML = '\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Completed Trips</span><span class="panel-meta">'.concat(trips.length, ' total</span></div>\n      <div class="table-wrap"><table class="data-table">\n        <thead><tr><th>Container</th><th>Route</th><th>Type</th><th>Distance</th><th>Completed</th><th>Reference</th></tr></thead>\n        <tbody>\n          ').concat(trips.length ? trips.map((t) => "<tr onclick=\"showTripDetail('".concat(t.id, '\')" style="cursor:pointer"><td class="mono" style="color:var(--gold)">').concat(t.container, "</td><td>").concat(t.origin, " \u2192 ").concat(t.dest, "</td><td>").concat(t.ctype, "</td><td>").concat(t.distance, "km</td><td>").concat(fmtDate(t.eta), '</td><td class="mono" style="font-size:10px;color:var(--text-3)">').concat(t.ref, "</td></tr>")).join("") : '<tr><td colspan="6" class="empty-td">No completed trips yet</td></tr>', "\n        </tbody>\n      </table></div>\n    </div>\n  ");
}
function dpToggleDuty() {
  const driver = myDriverRecord();
  if (!driver) return;
  const onDuty = driver.status !== "off_duty" && driver.status !== "suspended";
  if (onDuty) {
    openModal("Go Off Duty", '\n      <div class="ops-notice" style="margin-bottom:14px">Going off duty will immediately stop live GPS tracking for your truck and mark you unavailable for new trips. You can go back on duty any time.</div>\n      <button class="submit-btn" style="background:var(--red)" onclick="confirmGoOffDuty()">Confirm \u2014 Go Off Duty</button>\n    ');
  } else {
    const hasActiveTrip = state.db.trips.some((t) => t.driverId === driver.id && t.status !== "completed");
    driver.status = hasActiveTrip ? "on_trip" : "available";
    scheduleSave();
    addAudit(state.profile.username, "Duty Status", "".concat(driver.name, " went ON duty"));
    toast("You are now on duty \u2014 location tracking started", "success");
    renderDriverPortal();
  }
}
function confirmGoOffDuty() {
  const driver = myDriverRecord();
  if (!driver) return;
  driver.status = "off_duty";
  scheduleSave();
  addAudit(state.profile.username, "Duty Status", "".concat(driver.name, " went OFF duty"));
  closeModal();
  stopDriverTracking(true);
  toast("You are now off duty \u2014 location tracking stopped", "info");
  renderDriverPortal();
}
function renderDutyBar() {
  const el = document.getElementById("dp_dutyBar");
  if (!el) return;
  const driver = myDriverRecord();
  if (!driver) {
    el.innerHTML = "";
    return;
  }
  const onDuty = driver.status !== "off_duty" && driver.status !== "suspended";
  const tracking = state.trackingActive && onDuty;
  const pos = driver.truckId ? state.db.trackingPositions[driver.truckId] : null;
  const needsAccess = onDuty && driver.truckId && !tracking && state.geoPermission !== "denied";
  const blocked = onDuty && driver.truckId && state.geoPermission === "denied";
  let sub;
  if (!driver.truckId) sub = "No truck assigned \u2014 tracking unavailable";
  else if (!onDuty) sub = "Tracking stopped";
  else if (blocked) sub = "Location access is blocked for this site";
  else if (tracking && pos) sub = "Live \xB7 ".concat(pos.zone, " \xB7 updated ").concat(timeAgo(pos.lastUpdate));
  else if (needsAccess) sub = "Location access needed to start tracking";
  else sub = "Acquiring GPS signal\u2026";
  el.innerHTML = '\n    <div class="duty-bar">\n      <div class="duty-status">\n        <span class="duty-dot '.concat(tracking ? "live" : "", '"></span>\n        <div>\n          <div class="duty-label">').concat(onDuty ? driver.status === "on_trip" ? "On Duty \xB7 On Trip" : "On Duty \xB7 Available" : "Off Duty", '</div>\n          <div class="duty-sub">').concat(sub, '</div>\n        </div>\n      </div>\n      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">\n        ').concat(needsAccess ? '<button class="action-btn duty-cta" onclick="requestLocationAccess()">\u{1F4CD} Enable Location Tracking</button>' : "", '\n        <button class="action-btn ').concat(onDuty ? "danger" : "", '" onclick="dpToggleDuty()">').concat(onDuty ? "Go Off Duty" : "Go On Duty", "</button>\n      </div>\n    </div>\n    ").concat(blocked ? '\n      <div class="duty-blocked-banner">\n        <b>Location is blocked for this site.</b> Your truck can\'t be tracked until you re-enable it:\n        <ul>\n          <li><b>Chrome/Android:</b> tap the lock icon next to the address bar \u2192 Permissions \u2192 Location \u2192 Allow</li>\n          <li><b>Safari/iOS:</b> Settings app \u2192 Safari (or this app, if installed to Home Screen) \u2192 Location \u2192 Allow</li>\n        </ul>\n        Then tap <b>Enable Location Tracking</b> above again.\n      </div>\n    ' : "", "\n  ");
}
async function submitDriverBreakdown(truckId) {
  const desc = document.getElementById("bd_desc").value.trim();
  if (!desc) {
    toast("Please describe the issue", "error");
    return;
  }
  const loc = sanitize(document.getElementById("bd_loc").value.trim());
  const truck = state.db.trucks.find((t) => t.id === truckId);
  const truckSnapshot = truck ? __spreadValues({}, truck) : null;
  if (truck) truck.status = "breakdown";
  const ticket = {
    id: uid("MNT"),
    truckId,
    type: "Breakdown",
    desc: loc ? "".concat(desc, " (Location: ").concat(loc, ")") : desc,
    priority: "critical",
    status: "open",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    cost: 0,
    tech: "",
    resolvedDate: null,
    reportedByDriver: true
  };
  state.db.maintenance.push(ticket);
  ticket._dirty = true;
  buildBadges();
  buildAlerts();
  toast("Saving\u2026", "info", 1200);
  const res = await saveNowAwaited();
  if (!res.ok) {
    if (truck && truckSnapshot) Object.assign(truck, truckSnapshot);
    const idx = state.db.maintenance.indexOf(ticket);
    if (idx > -1) state.db.maintenance.splice(idx, 1);
    buildBadges();
    buildAlerts();
    toast("Could not submit breakdown report \u2014 check your connection and try again", "error", 5e3);
    return;
  }
  addAudit(state.profile.username, "Driver Breakdown Report", "".concat(truckName(truckId), " \u2014 ").concat(desc.slice(0, 60)));
  closeModal();
  toast("Breakdown reported \u2014 dispatch notified", "error");
  renderDriverPortal();
}
function dpRenderReqTab(el, driver) {
  const mine = state.db.requisitions.filter((r) => r.requesterId === state.profile.id || r.requester === state.profile.name || r.requester === driver.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = '\n    <div class="form-card" style="margin-bottom:14px">\n      <div class="form-card-head">New Requisition</div>\n      <div class="form-card-body">\n        <div class="form-row-2">\n          <div class="fg"><label>Category</label><select id="dp_rq_cat"><option>Fuel Advance</option><option>Tyre Parts</option><option>Tool Purchase</option><option>Medical</option><option>Lubricants</option><option>Other</option></select></div>\n          <div class="fg"><label>Amount (KSh)</label><input id="dp_rq_amt" type="number" placeholder="0"/></div>\n        </div>\n        <div class="fg"><label>Items / Description</label><textarea id="dp_rq_items" rows="3" placeholder="List what is needed\u2026"></textarea></div>\n        <div class="fg"><label>Notes</label><input id="dp_rq_notes" placeholder="Additional context\u2026"/></div>\n        <button class="submit-btn" onclick="dpSaveRequisition()">Submit Requisition \u2192</button>\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Requisitions</span><span class="panel-meta">'.concat(mine.length, "</span></div>\n      <div>").concat(mine.map((r) => '<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">'.concat(r.category, '</div><div class="req-meta">').concat(r.id, " \xB7 ").concat(fmtDate(r.date), '</div></div><div style="text-align:right">').concat(sbadge(r.status), '<div class="req-amount" style="margin-top:4px">').concat(fmtKsh(r.amount), '</div></div></div><div class="req-items">').concat(r.items, "</div></div>")).join("") || '<div class="empty-state"><div class="empty-state-label">No requisitions submitted yet</div></div>', "</div>\n    </div>\n  ");
}
let _dispatchEditingTripId = null;
let _dispatchContainerImages = [];
function renderDispatch() {
  populateDispatchSelects();
  renderDispatchQueue();
  renderAwaitingDispatch();
}
function populateDispatchSelects() {
  const avlTrucks = state.db.trucks.filter((t) => t.status === "available");
  const avlDrivers = state.db.drivers.filter((d) => d.status === "available");
  fillSelect("d_truck", avlTrucks, (t) => [t.id, "".concat(t.reg, " \u2014 ").concat(t.make, " (Fuel: ").concat(truckFuelLabel(t), ")")]);
  fillSelect("d_driver", avlDrivers, (d) => [d.id, d.name]);
  fillSelect("d_line", state.db.shippingLines.filter((l) => l.active), (l) => [l.id, "".concat(l.code, " \u2014 ").concat(l.name)]);
  populateSizeTypeSelects("d_size", "d_type");
}
function renderDispatchQueue() {
  const pending = state.db.trips.filter((t) => t.status === "active").slice(-8).reverse();
  const container = document.getElementById("dispatchQueue");
  if (!container) return;
  container.innerHTML = '<div class="panel"><div class="panel-head"><span class="panel-title">Dispatch Queue</span><span class="panel-meta">'.concat(pending.length, " active</span></div><div>").concat(pending.map((t) => '<div class="dispatch-queue-item" onclick="showTripDetail(\''.concat(t.id, '\')"><div class="dqi-ref">').concat(t.container.slice(-7), '</div><div class="dqi-route"><div style="font-size:12px;font-weight:600;color:var(--text)">').concat(t.origin, "\u2192").concat(t.dest, '</div><div style="font-size:10px;color:var(--text-3)">').concat(truckName(t.truckId), "</div></div>").concat(sbadge(t.status), '<div class="dqi-time">').concat(timeAgo(t.startTime), "</div></div>")).join("") || '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No dispatches yet</div></div>', "</div></div>");
}
function awaitingDispatchTrips() {
  return state.db.trips.filter((t) => isTripLive(t) && (!t.truckId || !t.driverId));
}
function refreshAwaitingDispatchUI() {
  buildBadges();
  refreshContainerHistory();
  if (document.getElementById("awaitingDispatchList")) renderAwaitingDispatch();
  if (document.getElementById("allocQueue")) renderAllocAuto();
  if (document.getElementById("allocManualAwaitingList")) renderAllocAwaitingList("allocManualAwaitingList", "allocManualAwaitingMeta");
}
function jumpToCompleteDispatch(tripId) {
  showSection("dispatch", document.querySelector('[data-section="dispatch"]'));
  loadTripIntoDispatchForm(tripId);
}
function renderAwaitingDispatch() {
  const el = document.getElementById("awaitingDispatchList");
  const meta = document.getElementById("awaitingDispatchMeta");
  if (!el) return;
  const rows = awaitingDispatchTrips().sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  if (meta) meta.textContent = rows.length ? "".concat(rows.length, " awaiting") : "";
  el.innerHTML = rows.map((t) => '\n    <div class="dispatch-queue-item" style="cursor:default">\n      <div class="dqi-ref">'.concat((t.container || "").slice(-7), '</div>\n      <div class="dqi-route">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">').concat(t.origin, " \u2192 ").concat(t.dest, '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(t.bookingId ? "From public booking" : "Needs truck & driver", " \xB7 ").concat(t.workType, '</div>\n      </div>\n      <button class="modal-btn primary" onclick="loadTripIntoDispatchForm(\'').concat(t.id, "')\">Complete Dispatch \u2192</button>\n    </div>\n  ")).join("") || '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">\u2705</div><div class="empty-state-label">Nothing awaiting dispatch</div></div>';
}
function toggleDispatchOutwardType() {
  const workType = document.getElementById("d_worktype").value;
  const row = document.getElementById("d_outwardtype_row");
  if (!row) return;
  row.style.display = isOutwardWorkType(workType) ? "block" : "none";
  if (!isOutwardWorkType(workType)) {
    const sel = document.getElementById("d_outwardtype");
    if (sel) sel.value = "";
  }
}
function loadTripIntoDispatchForm(tripId) {
  const t = state.db.trips.find((tr) => tr.id === tripId);
  if (!t) {
    toast("Trip not found", "error");
    return;
  }
  _dispatchEditingTripId = tripId;
  _dispatchContainerImages = Array.isArray(t.containerImages) ? [...t.containerImages] : [];
  switchDispatchTab("single", document.querySelector("#sec-dispatch .filter-btn"));
  populateDispatchSelects();
  document.getElementById("d_truck").value = t.truckId || "";
  document.getElementById("d_driver").value = t.driverId || "";
  document.getElementById("d_container").value = t.container && !t.container.startsWith("PUB-") ? t.container : "";
  populateSizeTypeSelects("d_size", "d_type", t.ctype || "20ft Dry");
  document.getElementById("d_worktype").value = t.workType || "Port \u2192 Depot";
  document.getElementById("d_line").value = t.shippingLine || "";
  const outwardTypeSel = document.getElementById("d_outwardtype");
  if (outwardTypeSel) outwardTypeSel.value = t.outwardType || "";
  toggleDispatchOutwardType();
  document.getElementById("d_origin").value = t.origin && t.origin !== "\u2014" ? t.origin : "";
  document.getElementById("d_dest").value = t.dest && t.dest !== "\u2014" ? t.dest : "";
  document.getElementById("d_distance").value = t.distance || "";
  document.getElementById("d_priority").value = t.priority || "Normal";
  document.getElementById("d_ref").value = t.ref || "";
  document.getElementById("d_notes").value = t.notes || "";
  document.getElementById("d_eir").value = t.eirNumber || "";
  document.getElementById("d_receiving").value = t.receivingParty || "";
  document.getElementById("d_release_no").value = t.releaseOrderNo || "";
  document.getElementById("d_vessel").value = t.vessel || "";
  document.getElementById("d_voyage").value = t.voyage || "";
  const dateOutEl = document.getElementById("d_dateout");
  if (dateOutEl) dateOutEl.value = "";
  renderContainerImgGrid();
  const banner = document.getElementById("dispatchEditBanner");
  if (banner) banner.style.display = "flex";
  const btn = document.getElementById("dispatchSubmitBtn");
  if (btn) btn.textContent = "Complete Dispatch \u2192";
  document.getElementById("dispatchTabSingle").scrollIntoView({ behavior: "smooth", block: "start" });
}
function cancelDispatchEdit() {
  _dispatchEditingTripId = null;
  clearContainerImgs();
  clearDispatchReleaseFile();
  ["d_truck", "d_driver", "d_container", "d_origin", "d_dest", "d_distance", "d_ref", "d_notes", "d_eir", "d_receiving", "d_release_no", "d_vessel", "d_voyage", "d_dateout"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const outwardTypeSel = document.getElementById("d_outwardtype");
  if (outwardTypeSel) outwardTypeSel.value = "";
  toggleDispatchOutwardType();
  populateDispatchSelects();
  const banner = document.getElementById("dispatchEditBanner");
  if (banner) banner.style.display = "none";
  const btn = document.getElementById("dispatchSubmitBtn");
  if (btn) btn.textContent = "Create Dispatch Order \u2192";
  toast("Dispatch form cleared", "info");
}
async function createDispatch() {
  const truck = document.getElementById("d_truck").value;
  const driver = document.getElementById("d_driver").value;
  const cont = document.getElementById("d_container").value.trim().toUpperCase();
  const origin = document.getElementById("d_origin").value.trim();
  const dest = document.getElementById("d_dest").value.trim();
  const dist = parseInt(document.getElementById("d_distance").value) || 0;
  const editingId = _dispatchEditingTripId;
  if (!cont) {
    toast("Container number is required", "error");
    return;
  }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) {
    toast("Container number: ".concat(contIssue), "error");
    return;
  }
  const dupTrip = findLiveTripByContainer(cont, editingId || void 0);
  if (dupTrip) {
    toast("".concat(cont, " is already on an active trip (").concat(dupTrip.origin, " \u2192 ").concat(dupTrip.dest, ", status: ").concat(dupTrip.status.replace("_", " "), "). Complete or resolve it before re-dispatching this container."), "error");
    return;
  }
  const dupTruck = truck ? state.db.trucks.find((tr) => tr.id === truck) : null;
  if (dupTruck && dupTruck.status !== "available") {
    toast("".concat(dupTruck.reg, " is no longer available (status: ").concat(dupTruck.status.replace("_", " "), "). Refresh and pick another truck."), "error");
    return;
  }
  const dupDriver = driver ? state.db.drivers.find((d) => d.id === driver) : null;
  if (dupDriver && dupDriver.status !== "available") {
    toast("".concat(dupDriver.name, " is no longer available (status: ").concat(dupDriver.status.replace("_", " "), "). Refresh and pick another driver."), "error");
    return;
  }
  const ctype = composeCtype(document.getElementById("d_size").value, document.getElementById("d_type").value);
  const workType = document.getElementById("d_worktype").value;
  const line = document.getElementById("d_line").value;
  const priority = document.getElementById("d_priority").value;
  const ref = document.getElementById("d_ref").value.trim() || "REF-".concat(Date.now().toString().slice(-6));
  const notes = sanitize(document.getElementById("d_notes").value.trim());
  const images = [..._dispatchContainerImages];
  const eirNumber = sanitize(document.getElementById("d_eir").value.trim());
  const receivingParty = sanitize(document.getElementById("d_receiving").value.trim());
  const releaseOrderNo = sanitize(document.getElementById("d_release_no").value.trim());
  const vessel = sanitize(document.getElementById("d_vessel").value.trim());
  const voyage = sanitize(document.getElementById("d_voyage").value.trim());
  const dateOutInput = document.getElementById("d_dateout").value;
  const dateOut = dateOutInput ? new Date(dateOutInput).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
  const releaseFile = _dispatchReleaseFile;
  const outwardTypeSel = document.getElementById("d_outwardtype");
  const outwardType = isOutwardWorkType(workType) ? outwardTypeSel ? outwardTypeSel.value : "" : null;
  if (isOutwardWorkType(workType) && !OUTWARD_TYPES.includes(outwardType)) {
    toast("Select an outward type \u2014 Repatriation to Port, Shippers/Export, or Sale units", "error");
    return;
  }
  let newTripId = null;
  if (editingId) {
    const t = state.db.trips.find((tr) => tr.id === editingId);
    if (!t) {
      toast("That trip no longer exists \u2014 it may have been removed.", "error");
      cancelDispatchEdit();
      return;
    }
    if (workType === "Depot \u2192 Port" && !releaseFile) {
      try {
        const docs = await window.bookingDocs.documentsForTrip(t.id);
        const hasVerifiedRelease = docs.some((d) => d.doc_type === "release_order" && d.status === "verified");
        if (!hasVerifiedRelease) {
          toast("A verified release order is required before this container can be dispatched to port \u2014 upload it below, or from DepOps \u2192 Outward / Repatriation.", "error", 6e3);
          return;
        }
      } catch (e) {
        toast("Could not confirm release order status (".concat(e && e.message || "error", ") \u2014 dispatch blocked until this can be checked."), "error", 6e3);
        return;
      }
    }
    Object.assign(t, { truckId: truck, driverId: driver, container: cont, ctype, workType, outwardType, origin, dest, shippingLine: line, distance: dist, priority, notes, ref, containerImages: images, eirNumber, receivingParty, releaseOrderNo, vessel, voyage, dateOut });
    t._dirty = true;
    const tk = state.db.trucks.find((tr) => tr.id === truck);
    const dv = state.db.drivers.find((d) => d.id === driver);
    if (tk) tk.status = "on_trip";
    if (dv) {
      dv.status = "on_trip";
      dv.load = cont;
      dv.truckId = truck;
    }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, "Dispatch Completed", "".concat(cont, " \u2014 ").concat(origin, " \u2192 ").concat(dest));
    toast("Dispatch completed \u2014 ".concat(cont), "success");
    newTripId = t.id;
    _dispatchEditingTripId = null;
    const banner = document.getElementById("dispatchEditBanner");
    if (banner) banner.style.display = "none";
    const btn = document.getElementById("dispatchSubmitBtn");
    if (btn) btn.textContent = "Create Dispatch Order \u2192";
  } else {
    if (workType === "Depot \u2192 Port" && !releaseFile) {
      toast("A release order is required for Depot \u2192 Port dispatches \u2014 upload it below, or complete this later once the container is matched to a trip in DepOps \u2192 Outward / Repatriation.", "warning", 6e3);
    }
    const etaMs = Date.now() + dist / 35 * 36e5;
    const trip = {
      id: uid("TRIP"),
      truckId: truck,
      driverId: driver,
      container: cont,
      ctype,
      workType,
      outwardType,
      origin,
      dest,
      shippingLine: line,
      status: "active",
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      eta: new Date(etaMs).toISOString(),
      distance: dist,
      priority,
      notes,
      ref,
      containerImages: images,
      eirNumber,
      receivingParty,
      releaseOrderNo,
      vessel,
      voyage,
      dateOut,
      _dirty: true
    };
    state.db.trips.push(trip);
    newTripId = trip.id;
    const t = state.db.trucks.find((t2) => t2.id === truck);
    const d = state.db.drivers.find((d2) => d2.id === driver);
    if (t) t.status = "on_trip";
    if (d) {
      d.status = "on_trip";
      d.load = cont;
      d.truckId = truck;
    }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, "Dispatch Created", "".concat(cont, " \u2014 ").concat(origin, " \u2192 ").concat(dest));
    toast("Dispatch created \u2014 ".concat(cont), "success");
  }
  if (releaseFile && newTripId) {
    try {
      await saveNowAwaited();
      await window.bookingDocs.uploadTripDocument({ tripId: newTripId, docType: "release_order", containerNo: cont, file: releaseFile, autoVerify: true });
      toast("Release order uploaded", "success");
    } catch (e) {
      toast("Dispatch saved, but release order upload failed: ".concat(e.message || e), "warning");
    }
  }
  clearContainerImgs();
  clearDispatchReleaseFile();
  ["d_truck", "d_driver", "d_container", "d_origin", "d_dest", "d_distance", "d_ref", "d_notes", "d_eir", "d_receiving", "d_release_no", "d_vessel", "d_voyage", "d_dateout"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const outwardTypeResetSel = document.getElementById("d_outwardtype");
  if (outwardTypeResetSel) outwardTypeResetSel.value = "";
  toggleDispatchOutwardType();
  renderDispatch();
  refreshAwaitingDispatchUI();
}
let _dispatchReleaseFile = null;
function previewDispatchReleaseFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  _dispatchReleaseFile = file;
  const preview = document.getElementById("dispatchReleasePreview");
  preview.style.display = "block";
  preview.innerHTML = "\u{1F4C4} ".concat(esc(file.name), ' <button class="pill" style="font-size:9px;margin-left:6px" onclick="clearDispatchReleaseFile()">\u2715 Remove</button>');
}
function clearDispatchReleaseFile() {
  _dispatchReleaseFile = null;
  const fileInput = document.getElementById("d_release_file");
  if (fileInput) fileInput.value = "";
  const preview = document.getElementById("dispatchReleasePreview");
  if (preview) {
    preview.style.display = "none";
    preview.innerHTML = "";
  }
}
function switchDispatchTab(tab, btn) {
  document.getElementById("dispatchTabSingle").style.display = tab === "single" ? "block" : "none";
  document.getElementById("dispatchTabBulk").style.display = tab === "bulk" ? "block" : "none";
  document.querySelectorAll("#sec-dispatch .filter-row .filter-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
}
function previewContainerImgs(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  files.forEach((file) => {
    if (!file.type.startsWith("image/")) {
      toast("".concat(file.name, " is not an image \u2014 skipped"), "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("".concat(file.name, " is too large \u2014 max 2MB. Skipped."), "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      _dispatchContainerImages.push(ev.target.result);
      renderContainerImgGrid();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = "";
}
function renderContainerImgGrid() {
  const wrap = document.getElementById("containerImgPreview");
  const grid = document.getElementById("containerImgGrid");
  const label = document.getElementById("containerImgLabel");
  if (!wrap || !grid) return;
  if (!_dispatchContainerImages.length) {
    wrap.style.display = "none";
    if (label) label.textContent = "Upload container photos";
    return;
  }
  wrap.style.display = "block";
  if (label) label.textContent = "".concat(_dispatchContainerImages.length, " photo").concat(_dispatchContainerImages.length > 1 ? "s" : "", " attached");
  grid.innerHTML = _dispatchContainerImages.map((src, i) => '<div class="container-img-thumb"><img src="'.concat(src, '" /><button type="button" class="container-img-remove" onclick="removeContainerImgAt(').concat(i, ')" title="Remove">\u2715</button></div>')).join("");
}
function removeContainerImgAt(idx) {
  _dispatchContainerImages.splice(idx, 1);
  renderContainerImgGrid();
}
function clearContainerImgs() {
  _dispatchContainerImages = [];
  const fileInput = document.getElementById("d_container_img");
  if (fileInput) fileInput.value = "";
  renderContainerImgGrid();
}
function handleBulkDrop(e) {
  e.preventDefault();
  document.getElementById("bulkDispatchDrop").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) processBulkFile(file);
}
function handleBulkFile(e) {
  const file = e.target.files[0];
  if (file) processBulkFile(file);
}
function processBulkFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    toast("File too large. Max 5MB.", "error");
    return;
  }
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let rows = [];
      if (isExcel) {
        if (!window.XLSX) {
          toast("Spreadsheet reader still loading \u2014 try again in a moment", "error");
          return;
        }
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        rows = readAllExcelSheetsAsRows(wb);
      } else if (name.endsWith(".json")) {
        rows = JSON.parse(e.target.result);
      } else {
        rows = csvTextToRows(e.target.result);
      }
      const looksInward = /inward|inwrd|_in\b|-in\b/i.test(name) && !/outward/i.test(name);
      const normalizedRows = normalizeRowKeys(rows);
      const sniffedDirection = sniffBulkDirectionFromRows(normalizedRows);
      showBulkPreview(normalizedRows, sniffedDirection || (looksInward ? "in" : "out"));
    } catch (err) {
      toast("Could not parse file \u2014 check format", "error");
    }
  };
  if (isExcel) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}
function showBulkPreview(rows, direction) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const tbl = document.getElementById("bulkPreviewTable");
  tbl.querySelector("thead").innerHTML = "<tr>".concat(keys.map((k) => "<th>".concat(k, "</th>")).join(""), "</tr>");
  tbl.querySelector("tbody").innerHTML = rows.slice(0, 10).map((r) => "<tr>".concat(keys.map((k) => "<td>".concat(r[k] || "", "</td>")).join(""), "</tr>")).join("");
  document.getElementById("bulkRowCount").textContent = "".concat(rows.length, " rows");
  document.getElementById("bulkDispatchPreview").style.display = "block";
  document.getElementById("bulkDispatchPreview").dataset.rows = JSON.stringify(rows);
  const dirSel = document.getElementById("bd_bulk_direction");
  if (dirSel) dirSel.value = direction === "in" ? "in" : "out";
  updateBulkDispatchDirectionUI();
}
function updateBulkDispatchDirectionUI() {
  const dirSel = document.getElementById("bd_bulk_direction");
  const row = document.getElementById("bd_bulk_outwardtype_row");
  if (!dirSel || !row) return;
  row.style.display = dirSel.value === "out" ? "block" : "none";
}
async function processBulkDispatch() {
  var _a, _b;
  if (_bulkWriteInProgress) {
    toast("A dispatch import is already in progress \u2014 please wait", "warning");
    return;
  }
  const rows = JSON.parse(document.getElementById("bulkDispatchPreview").dataset.rows || "[]");
  if (!rows.length) {
    toast("No rows to process", "error");
    return;
  }
  const batchDirection = ((_a = document.getElementById("bd_bulk_direction")) == null ? void 0 : _a.value) === "in" ? "in" : "out";
  const batchOutwardType = ((_b = document.getElementById("bd_bulk_outwardtype")) == null ? void 0 : _b.value) || OUTWARD_TYPES[0];
  const WORKTYPE_ALIASES = {
    "depotport": "Depot \u2192 Port",
    "depottoport": "Depot \u2192 Port",
    "outward": "Depot \u2192 Port",
    "out": "Depot \u2192 Port",
    "dispatch": "Depot \u2192 Port",
    "portdepot": "Port \u2192 Depot",
    "porttodepot": "Port \u2192 Depot",
    "inward": "Port \u2192 Depot",
    "in": "Port \u2192 Depot"
  };
  const OUTWARDTYPE_ALIASES = {
    "repatriationtoport": "Repatriation to Port",
    "repatriation": "Repatriation to Port",
    "shippersexport": "Shippers/Export",
    "export": "Shippers/Export",
    "shippers": "Shippers/Export",
    "saleunits": "Sale units",
    "sale": "Sale units"
  };
  const btn = document.getElementById("bulkDispatchSubmitBtn");
  const btnOriginalText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Processing ".concat(rows.length, " row(s)\u2026");
  }
  toast("Processing ".concat(rows.length, " dispatch(es) \u2014 this can take a moment for large files\u2026"), "info", 5e3);
  _bulkWriteInProgress = true;
  await new Promise((r) => setTimeout(r, 0));
  try {
    let created = 0;
    const flagged = [];
    const seenInBatch = /* @__PURE__ */ new Set();
    const usedTrucksInBatch = /* @__PURE__ */ new Set();
    const usedDriversInBatch = /* @__PURE__ */ new Set();
    const newTrips = [];
    const importBatchId = "DSP-".concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), "-").concat(Date.now().toString(36).toUpperCase());
    const liveTripByContainer = /* @__PURE__ */ new Map();
    state.db.trips.forEach((t) => {
      if (isTripLive(t) && t.container) {
        const key = t.container.toUpperCase();
        if (!liveTripByContainer.has(key)) liveTripByContainer.set(key, t);
      }
    });
    const CHUNK = 300;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunkRows = rows.slice(start, start + CHUNK);
      if (btn && rows.length > CHUNK) btn.textContent = "Processing ".concat(Math.min(start + CHUNK, rows.length), "/").concat(rows.length, "\u2026");
      chunkRows.forEach((r, chunkIdx) => {
        const idx = start + chunkIdx;
        const contRaw = pickField(r, ["container", "containerno", "containernumber", "containernrno"]);
        const rowLabel = contRaw ? contRaw : "row ".concat(idx + 1);
        let cont = contRaw ? contRaw.trim().toUpperCase() : "";
        const issueTags = [];
        if (!cont) {
          cont = "UNKNOWN-ROW".concat(idx + 1, "-").concat(Date.now().toString(36).toUpperCase());
          issueTags.push("missing container number \u2014 placeholder assigned");
          flagged.push("".concat(rowLabel, ": missing container number (placeholder ").concat(cont, ")"));
        } else {
          const contIssue = containerFormatIssue(cont);
          if (contIssue) {
            issueTags.push(contIssue);
            flagged.push("".concat(cont, ": ").concat(contIssue));
          }
        }
        if (seenInBatch.has(cont)) {
          issueTags.push("duplicate container within this file");
          flagged.push("".concat(cont, ": duplicate container within this file"));
        }
        const dupTrip = liveTripByContainer.get(cont) || null;
        if (dupTrip) {
          issueTags.push("already on an active trip");
          flagged.push("".concat(cont, ": already on an active trip"));
        }
        seenInBatch.add(cont);
        const truckRaw = pickField(r, ["truck", "truckreg", "vehicle", "reg", "truckno", "lorryno"]);
        const transporterRaw = pickField(r, ["transporters", "transporter"]);
        const driverRaw = pickField(r, ["driver", "drivername", "driversname"]);
        const truck = state.db.trucks.find((t) => t.reg === truckRaw || t.id === truckRaw || t.reg === transporterRaw);
        const driver = state.db.drivers.find((d) => d.name === driverRaw || d.id === driverRaw);
        const truckConflict = truck && usedTrucksInBatch.has(truck.id);
        const driverConflict = driver && usedDriversInBatch.has(driver.id);
        if (truckConflict) {
          issueTags.push("truck ".concat(truck.reg, " used more than once in this batch"));
          flagged.push("".concat(cont, ": truck ").concat(truck.reg, " used more than once in this batch"));
        }
        if (driverConflict) {
          issueTags.push("driver ".concat(driver.name, " used more than once in this batch"));
          flagged.push("".concat(cont, ": driver ").concat(driver.name, " used more than once in this batch"));
        }
        if (truck) usedTrucksInBatch.add(truck.id);
        if (driver) usedDriversInBatch.add(driver.id);
        const lineRaw = pickField(r, ["line", "shippingline", "linecode", "shippinglines"]);
        let line = findShippingLineByText(lineRaw);
        const vesselForLine = pickField(r, ["vessel", "exvessel"]);
        if (!line && vesselForLine) {
          const guessedLineId = resolveLineIdFromVessel(vesselForLine);
          if (guessedLineId) line = state.db.shippingLines.find((l) => l.id === guessedLineId) || null;
        }
        if (!line) {
          const lineIssue = lineRaw ? 'shipping line "'.concat(lineRaw, '" not found in Shipping Lines') : "no shipping line in file";
          issueTags.push(lineIssue);
          flagged.push("".concat(cont, ": ").concat(lineIssue));
        }
        const sizeRaw = pickField(r, ["size"]);
        const typeRaw = pickField(r, ["containertype", "type"]);
        const ctypeExplicit = pickField(r, ["ctype"]);
        const ctype = sizeRaw && typeRaw ? composeCtypeFromDepotCode(sizeRaw, typeRaw) : CONTAINER_TYPE_OPTIONS.find((c) => c.toLowerCase() === ctypeExplicit.toLowerCase()) || ctypeExplicit || "20ft Dry";
        const dateOutRaw = pickField(r, ["dateout", "dateexited"]);
        let dateOutVal = null;
        {
          const dOut = parseFlexibleDate(dateOutRaw);
          if (dOut) dateOutVal = dOut.toISOString();
        }
        let dateVal = dateOutVal || (/* @__PURE__ */ new Date()).toISOString();
        const dateRaw = pickField(r, ["date", "dispatchdate", "startdate", "starttime", "datedispatched", "datein", "entrydate", "dategatein"]);
        {
          const d = parseFlexibleDate(dateRaw);
          if (d) {
            dateVal = d.toISOString();
            flagIfImplausibleDate(d, issueTags, flagged, rowLabel);
          }
        }
        const notesParts = ["Bulk import"];
        if (transporterRaw && !truck) notesParts.push("Transporter: ".concat(transporterRaw));
        notesParts.push(...issueTags.map((t) => "\u26A0 ".concat(t)));
        const worktypeRaw = pickField(r, ["worktype", "workType", "direction", "movement"]).toLowerCase().replace(/[^a-z]/g, "");
        const workType = WORKTYPE_ALIASES[worktypeRaw] || (batchDirection === "in" ? "Port \u2192 Depot" : "Depot \u2192 Port");
        let outwardType = null;
        if (isOutwardWorkType(workType)) {
          const outwardTypeRaw = pickField(r, ["outwardtype", "movementtype"]).toLowerCase().replace(/[^a-z\/]/g, "");
          outwardType = OUTWARDTYPE_ALIASES[outwardTypeRaw] || batchOutwardType;
        }
        const trip = {
          id: uid("TRIP"),
          container: cont,
          truckId: truck ? truck.id : "",
          driverId: driver ? driver.id : "",
          ctype,
          workType,
          outwardType,
          origin: r.origin || "",
          dest: r.destination || r.dest || "",
          distance: parseInt(r.distance) || 0,
          shippingLine: (line == null ? void 0 : line.id) || "",
          priority: "Normal",
          notes: notesParts.join(" \u2014 "),
          ref: "BULK-".concat(Date.now(), "-").concat(created),
          status: "completed",
          startTime: dateVal,
          eta: dateOutVal || new Date(new Date(dateVal).getTime() + 4 * 36e5).toISOString(),
          eirNumber: sanitize(pickField(r, ["eir", "eirno"])),
          receivingParty: sanitize(pickField(r, ["receivingparty", "deliveringparty"])),
          releaseOrderNo: sanitize(pickField(r, ["releaseorderno"])),
          vessel: sanitize(pickField(r, ["vessel", "exvessel"])),
          voyage: sanitize(pickField(r, ["voyage"])),
          dateOut: dateOutVal || dateVal,
          flaggedForReview: issueTags.length > 0,
          flagReasons: issueTags.slice(),
          duplicateOfId: dupTrip ? dupTrip.id : null,
          importBatchId,
          _dirty: true
        };
        state.db.trips.push(trip);
        newTrips.push(trip);
        created++;
      });
      await new Promise((r) => setTimeout(r, 0));
    }
    let saveResult = null;
    try {
      saveResult = await upsertRowsChunked("trips", newTrips.map(tripToRow));
    } catch (e) {
      console.error("Bulk dispatch save failed:", e && e.message, e);
      saveResult = { table: "trips", error: e };
    }
    newTrips.forEach((t) => {
      delete t._dirty;
    });
    buildBadges();
    addAudit(state.profile.username, "Bulk Dispatch", "".concat(created, " dispatches imported").concat(flagged.length ? ", ".concat(flagged.length, " flagged for review") : "", " (batch ").concat(importBatchId, ")"));
    scheduleSave();
    if (saveResult) {
      toast("Import saved with errors \u2014 check console and retry if rows are missing (".concat(saveResult.error && saveResult.error.message || "see console", ")"), "error", 7e3);
    } else if (flagged.length) {
      toast("".concat(created, " created \u2014 ").concat(flagged.length, " flagged for cleanup (see details)"), "warning", 6e3);
      openModal("Bulk Dispatch Result", '<div style="margin-bottom:10px;font-size:12px;color:var(--text)">'.concat(created, ' dispatch(es) created successfully \u2014 all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (').concat(flagged.length, ')</div><div style="max-height:240px;overflow-y:auto">').concat(flaggedPreview(flagged).map((s) => '<div class="ops-notice" style="margin-bottom:6px">'.concat(esc(s), "</div>")).join(""), "</div>"));
    } else {
      toast("".concat(created, " dispatches created"), "success");
    }
    refreshAwaitingDispatchUI();
    document.getElementById("bulkDispatchPreview").style.display = "none";
    renderDispatchQueue();
  } catch (e) {
    console.error("Bulk dispatch failed:", e && e.message, e);
    toast("Bulk dispatch failed \u2014 ".concat(e && e.message || "unexpected error", ". Nothing further was imported."), "error", 7e3);
  } finally {
    _bulkWriteInProgress = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnOriginalText || "Process All Dispatches \u2192";
    }
  }
}
function downloadBulkTemplate() {
  const csv = "container,size,type,eir,dateOut,receivingParty,releaseOrderNo,vessel,voyage,truck,driver,origin,destination,workType,distance\nMSCU1234566,40ft,Dry,EIR-00789,,,,,,KDA 001A,James Otieno,Kilindini Port,Shimanzi ICD,Port \u2192 Depot,18";
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,".concat(encodeURIComponent(csv));
  a.download = "gargo_bulk_template.csv";
  a.click();
}
function quickDispatchOut(id) {
  const ic = state.db.interchange.find((i) => i.id === id);
  if (!ic) return;
  openModal("Quick Dispatch \u2014 ".concat(sanitize(ic.container)), '\n    <div class="ops-notice" style="margin-bottom:12px">\n      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>\n      Use this to record that a container already left the depot without creating a full dispatch trip \u2014 for containers that left before this system was in use, or whose exit wasn\'t captured through Dispatch Console. It won\'t ask for a truck or driver.\n    </div>\n    <div class="fg"><label>Date Out <span class="label-optional">(optional, defaults to now)</span></label><input id="qd_dateout" type="datetime-local" /></div>\n    <div class="fg"><label>Receiving Party</label><input id="qd_receiving" placeholder="Consignee / receiving party" /></div>\n    <div class="fg"><label>Release Order No.</label><input id="qd_release_no" placeholder="CRO / release order no. (if any)" /></div>\n    <button class="submit-btn" onclick="confirmQuickDispatchOut(\''.concat(id, "')\">Mark as Dispatched \u2192</button>\n  "));
}
function confirmQuickDispatchOut(id) {
  const ic = state.db.interchange.find((i) => i.id === id);
  if (!ic) {
    closeModal();
    return;
  }
  const dateInput = document.getElementById("qd_dateout").value;
  ic.dateOut = dateInput ? new Date(dateInput).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
  ic.receivingParty = sanitize(document.getElementById("qd_receiving").value.trim());
  ic.releaseOrderNo = sanitize(document.getElementById("qd_release_no").value.trim());
  ic._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, "Quick Dispatch (No Trip)", "".concat(ic.container, " marked out \u2014 bypassed full dispatch process"));
  toast("".concat(ic.container, " marked as dispatched"), "success");
  closeModal();
  renderInwardRecent();
  renderInwardStillInStorage();
  renderInterchange(_icFilter || "all");
}
function bookingIsMovement(serviceType) {
  const x = String(serviceType || "").toLowerCase();
  return x.includes("transport") || x.includes("return") || x.includes("haulage");
}
const BOOKING_STATUS_LABEL = { pending: "Pending", confirmed: "Awaiting gate-in", imported: "Gated in", cancelled: "Cancelled", rejected: "Rejected" };
const BOOKING_STATUS_CLASS = { pending: "s-pending", confirmed: "s-approved", imported: "s-imported", cancelled: "s-cancelled", rejected: "s-cancelled" };
let _publicBookingFilter = "pending";
function filterPublicBookings(filter, btn) {
  _publicBookingFilter = filter;
  document.querySelectorAll("#sec-publicbookings .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderPublicBookings();
}
async function renderPublicBookings() {
  const container = document.getElementById("publicBookingsList");
  if (!container) return;
  let query = supabase.from("public_bookings").select("*");
  if (_publicBookingFilter !== "all") {
    query = query.eq("status", _publicBookingFilter);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    container.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(error.message), "</div>");
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state">No '.concat(_publicBookingFilter === "all" ? "" : (BOOKING_STATUS_LABEL[_publicBookingFilter] || _publicBookingFilter).toLowerCase() + " ", "bookings</div>");
    refreshBookingBadge(true);
    return;
  }
  let docs = {};
  try {
    if (window.bookingDocs) docs = await window.bookingDocs.documentsForBookings(data.map((b) => b.id));
  } catch (e) {
  }
  container.innerHTML = data.map((b) => {
    const movement = bookingIsMovement(b.service_type);
    let actions = "";
    if (b.status === "pending") {
      actions += '<button class="modal-btn primary" onclick="confirmPublicBooking(\''.concat(b.id, "')\">Confirm Booking</button>");
      if (movement) actions += '<button class="modal-btn ghost" onclick="importPublicBooking(\''.concat(b.id, "')\">Import to Fleet</button>");
      actions += '<button class="modal-btn ghost" onclick="cancelPublicBooking(\''.concat(b.id, "','rejected')\">Reject</button>");
    } else if (b.status === "confirmed") {
      actions += '<button class="modal-btn primary" onclick="startInwardFromBooking(\''.concat(b.id, "')\">Confirmed In \u2192</button>");
      actions += '<button class="modal-btn ghost" onclick="cancelPublicBooking(\''.concat(b.id, "','cancelled')\">Cancel</button>");
    } else if (b.status === "imported") {
      const trip = findTripByBookingId(b.id);
      if (trip && (!trip.truckId || !trip.driverId)) {
        actions += '<button class="modal-btn primary" onclick="jumpToCompleteDispatch(\''.concat(trip.id, "')\">Complete Dispatch \u2192</button>");
      } else if (trip) {
        actions += '<button class="modal-btn ghost" onclick="showTripDetail(\''.concat(trip.id, "')\">View Trip</button>");
      }
    }
    const hasG = (docs[b.id] || []).some((d) => d.doc_type === "guarantee_form");
    const gBadge = movement ? "" : hasG ? '<span class="sbadge s-approved">Guarantee form \u2713</span>' : '<span class="sbadge s-pending">No guarantee form</span>';
    return '\n    <div style="border:1px solid var(--glass-edge,#333);padding:12px;margin-bottom:10px;background:var(--glass,#111);">\n      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">\n        <div><strong>'.concat(sanitize(b.full_name), "</strong>").concat(b.company ? " \xB7 " + sanitize(b.company) : "", ' <span style="color:var(--text-3);font-size:11px">').concat(sanitize(b.email)).concat(b.phone ? " \xB7 " + sanitize(b.phone) : "", '</span></div>\n        <div style="font-size:11px;color:var(--text-3)">').concat(b.intake_source === "portal" ? "Customer account" : b.intake_source === "website" ? "Website" : sanitize(b.intake_source || ""), "</div>\n      </div>\n      <div>Service: ").concat(sanitize(b.service_type)).concat(b.cargo_type ? " \xB7 " + sanitize(b.cargo_type) : "", "</div>\n      <div>Container: <strong>").concat(sanitize(b.container) || "Not provided", '</strong></div>\n      <div style="font-size:10px;color:var(--text-3);">Ref: ').concat(sanitize(b.reference || b.id.slice(0, 8))).concat(b.bulk_ref ? " \xB7 Bulk " + sanitize(b.bulk_ref) : "").concat(b.pickup_date ? " \xB7 Expected " + fmtDate(b.pickup_date) : "", "</div>\n      <div>").concat(sanitize(b.pickup_location), " \u2192 ").concat(sanitize(b.dropoff_location), '</div>\n      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">\n        <span class="sbadge ').concat(BOOKING_STATUS_CLASS[b.status] || "s-" + b.status, '">').concat(BOOKING_STATUS_LABEL[b.status] || sanitize(b.status), "</span>\n        ").concat(gBadge, "\n        ").concat(actions, '\n        <button class="modal-btn ghost" onclick="showPublicBookingDetail(\'').concat(b.id, "')\">View</button>\n      </div>\n    </div>\n  ");
  }).join("");
  refreshBookingBadge(true);
}
let _bkBadgeAt = 0;
async function refreshBookingBadge(force) {
  if (!force && Date.now() - _bkBadgeAt < 2e4) return;
  _bkBadgeAt = Date.now();
  try {
    const { count, error } = await supabase.from("public_bookings").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (error) return;
    const badge = document.getElementById("badge-publicbookings");
    if (badge) {
      badge.textContent = count || "";
      badge.style.display = count ? "inline" : "none";
    }
  } catch (e) {
  }
}
async function confirmPublicBooking(bookingId) {
  const { data: b, error } = await supabase.from("public_bookings").select("*").eq("id", bookingId).single();
  if (error || !b) {
    toast("Booking not found", "error");
    return;
  }
  if (b.status !== "pending") {
    toast("Already processed", "warning");
    renderPublicBookings();
    return;
  }
  if (b.container) {
    const issue = containerFormatIssue(b.container);
    if (issue && !confirm('Container number "'.concat(b.container, '" looks wrong: ').concat(issue, ".\n\nConfirm the booking anyway?"))) return;
    const avail = await checkContainerAvailable(b.container, { bookingId: b.id });
    if (avail) {
      toast(avail, "error", 7e3);
      return;
    }
  }
  const { data: rows, error: upErr } = await supabase.from("public_bookings").update({ status: "confirmed", confirmed_at: (/* @__PURE__ */ new Date()).toISOString(), confirmed_by: state.profile ? state.profile.id : null }).eq("id", bookingId).eq("status", "pending").select();
  if (upErr) {
    toast("Could not confirm \u2014 ".concat(upErr.message), "error", 8e3);
    return;
  }
  if (!rows || !rows.length) {
    toast("Already processed by someone else", "warning");
    renderPublicBookings();
    return;
  }
  addAudit(state.profile.username, "Booking Confirmed", "".concat(b.container || b.reference || b.id.slice(0, 8), " \u2014 awaiting gate-in"));
  toast("Booking confirmed \u2014 it is now in Awaiting Gate-In", "success");
  renderPublicBookings();
  if (typeof renderInwardAwaitingGateIn === "function") renderInwardAwaitingGateIn();
}
async function cancelPublicBooking(bookingId, newStatus) {
  const verb = newStatus === "rejected" ? "Reject" : "Cancel";
  if (!confirm("".concat(verb, " this booking? The container number will be free to book again."))) return;
  const { data: rows, error } = await supabase.from("public_bookings").update({ status: newStatus === "rejected" ? "rejected" : "cancelled", cancelled_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", bookingId).in("status", ["pending", "confirmed"]).select();
  if (error) {
    toast("Could not ".concat(verb.toLowerCase(), " \u2014 ").concat(error.message), "error", 8e3);
    return;
  }
  if (!rows || !rows.length) {
    toast("This booking can no longer be changed", "warning");
  } else addAudit(state.profile.username, "Booking ".concat(newStatus === "rejected" ? "Rejected" : "Cancelled"), rows[0].container || rows[0].reference || bookingId.slice(0, 8));
  renderPublicBookings();
  if (typeof renderInwardAwaitingGateIn === "function") renderInwardAwaitingGateIn();
}
function findTripByBookingId(bookingId) {
  return state.db.trips.find((t) => t.bookingId === bookingId);
}
async function importPublicBooking(bookingId) {
  const { data: booking, error } = await supabase.from("public_bookings").select("*").eq("id", bookingId).single();
  if (error || !booking) {
    toast("Booking not found", "error");
    return;
  }
  if (booking.status !== "pending") {
    toast("Already processed", "warning");
    return;
  }
  if (!bookingIsMovement(booking.service_type)) return confirmPublicBooking(bookingId);
  if (!confirm("Import this booking?")) return;
  try {
    const required = window.bookingDocs.getRequiredDocTypes({
      serviceType: booking.service_type,
      origin: booking.pickup_location,
      destination: booking.dropoff_location
    });
    if (required.length) {
      const docs = await window.bookingDocs.documentsForBooking(bookingId);
      const verifiedTypes = {};
      docs.forEach((d) => {
        if (d.status === "verified") verifiedTypes[d.doc_type] = true;
      });
      const missing = required.filter((rt) => !verifiedTypes[rt]);
      if (missing.length) {
        toast("Can't import \u2014 still missing verified: ".concat(missing.join(", ").replace(/_/g, " "), ". Verify documents in DepOps first."), "error", 6e3);
        return;
      }
    }
  } catch (e) {
    toast("Could not confirm document status (".concat(e && e.message || "error", ") \u2014 import blocked until this can be checked."), "error", 6e3);
    return;
  }
  const rawCont = (booking.container || "").trim().toUpperCase();
  if (rawCont) {
    const rawContIssue = containerFormatIssue(rawCont);
    if (rawContIssue) {
      toast("Booking's container number ".concat(rawCont, ": ").concat(rawContIssue, " \u2014 fix it before importing"), "error", 6e3);
      return;
    }
    const dupTrip = findLiveTripByContainer(rawCont);
    if (dupTrip) {
      toast("".concat(rawCont, " is already on an active trip (").concat(dupTrip.origin, " \u2192 ").concat(dupTrip.dest, "). Resolve that trip first, or correct the container number on this booking."), "error");
      return;
    }
  }
  const { data: updatedRows, error: updateErr } = await supabase.from("public_bookings").update({ status: "imported" }).eq("id", bookingId).eq("status", "pending").select();
  if (updateErr) {
    toast("Import failed \u2014 could not update booking status (".concat(updateErr.message, "). No trip was created."), "error");
    return;
  }
  if (!updatedRows || updatedRows.length === 0) {
    toast("Import failed \u2014 booking was already processed by someone else. Refresh and check.", "warning");
    renderPublicBookings();
    return;
  }
  if (booking.service_type === "Depot Storage") {
    const { error: statusErr } = await supabase.from("public_bookings").update({ storage_status: "awaiting_survey" }).eq("id", bookingId);
    if (statusErr) {
      toast("Imported, but couldn't set survey status (".concat(statusErr.message, ") \u2014 check DepOps \u2192 Zones"), "warning", 6e3);
    } else {
      toast("Imported \u2014 now awaiting survey in DepOps", "success");
    }
    renderPublicBookings();
    return;
  }
  const trip = {
    id: uid("TRIP"),
    container: rawCont || "PUB-".concat(booking.id.slice(0, 8)),
    ctype: booking.cargo_type || "20ft Dry",
    workType: booking.service_type || "Other",
    origin: booking.pickup_location || "\u2014",
    dest: booking.dropoff_location || "\u2014",
    shippingLine: resolveBookingShippingLineId(booking),
    status: "active",
    startTime: (/* @__PURE__ */ new Date()).toISOString(),
    eta: new Date(Date.now() + 4 * 36e5).toISOString(),
    distance: 0,
    priority: "Normal",
    notes: "Imported from public booking #".concat(booking.id),
    ref: "PUB-".concat(booking.id.slice(0, 8)),
    truckId: null,
    driverId: null,
    containerImages: [],
    bookingId: booking.id,
    _dirty: true
  };
  state.db.trips.push(trip);
  scheduleSave();
  toast("Imported \u2014 awaiting dispatch (trip " + trip.id.slice(-6) + ")", "success");
  renderPublicBookings();
  refreshAwaitingDispatchUI();
}
async function showPublicBookingDetail(id) {
  const { data: b, error } = await supabase.from("public_bookings").select("*").eq("id", id).single();
  if (error || !b) {
    toast("Not found", "error");
    return;
  }
  openModal("Booking Detail", "<pre>".concat(JSON.stringify(b, null, 2), "</pre>"));
}
async function refreshPublicBookings() {
  toast("Refreshing...", "info");
  await renderPublicBookings();
}
function depOpsDispatchContainer(bookingId) {
  const existingTrip = state.db.trips.find((t) => t.workType === "Depot \u2192 Port" && t.bookingId === bookingId);
  if (existingTrip) {
    jumpToCompleteDispatch(existingTrip.id);
    return;
  }
  showSection("depops", document.querySelector('[data-section="depops"]'));
  switchDepOpsTab("outward", document.querySelector(".depops-tab-btn:nth-child(2)"));
  toast("Pick a destination and create the outward trip below \u2014 it will then appear in the Dispatch Console.", "info", 5e3);
  setTimeout(() => {
    const el = document.getElementById("depopsEligibleList");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}
