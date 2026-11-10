"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const OUTWARD_TYPES = ["Repatriation to Port", "Shippers/Export", "Sale units"];
const ZONE_LOOKUP_INTERVAL_MS = 6e4;
let _lastZoneVal = null;
let _lastZoneFetch = 0;
function reverseGeocodeZone(lat, lng) {
  const run = _nominatimQueue.then(async () => {
    try {
      const res = await fetch("https://nominatim.openstreetmap.org/reverse?lat=".concat(lat, "&lon=").concat(lng, "&format=jsonv2&zoom=14&addressdetails=1"), {
        headers: { "Accept-Language": "en" }
      });
      const data = await res.json();
      const addr = data.address || {};
      const pick = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.town || addr.city || addr.village;
      return pick || (data.display_name || "").split(",")[0] || "".concat(lat.toFixed(4), ", ").concat(lng.toFixed(4));
    } catch (e) {
      console.warn("Reverse geocode failed:", e);
      return "".concat(lat.toFixed(4), ", ").concat(lng.toFixed(4));
    } finally {
      await new Promise((r) => setTimeout(r, 1100));
    }
  });
  _nominatimQueue = run;
  return run;
}
let _wialonLastZoneFetch = {};
let _inwardImages = [];
function renderInward() {
  populateInwardSelects();
  renderInwardAwaitingGateIn();
  renderInwardRecent();
  renderInwardAwaitingSurvey();
  renderInwardStillInStorage();
  clearInwardForm(true);
}
function populateInwardSelects() {
  if (typeof fillIncomingDatalists === "function") fillIncomingDatalists();
  else {
    fillDatalist("iwTruckList", state.db.trucks, (t) => t.reg);
    fillDatalist("iwDriverList", state.db.drivers, (d) => d.name);
  }
  if (typeof bindIncomingDriverAutofill === "function") bindIncomingDriverAutofill("iw");
  fillSelect("iw_line", state.db.shippingLines.filter((l) => l.active), (l) => [l.id, "".concat(l.code, " \u2014 ").concat(l.name)]);
  populateSizeTypeSelects("iw_size", "iw_type");
}
function renderInwardRecent() {
  const el = document.getElementById("inwardRecentList");
  const meta = document.getElementById("inwardRecentMeta");
  if (!el) return;
  const items = state.db.interchange.filter((i) => i.type === "Gate-In" || i.type === "Depot-In").sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  const _idx = icOutIndex();
  if (meta) meta.textContent = "".concat(items.length, " shown");
  el.innerHTML = items.map((ic) => '<div class="dispatch-queue-item" onclick="showSection(\'interchange\', document.querySelector(\'[data-section=&quot;interchange&quot;]\'))">\n      <div class="dqi-ref">'.concat(esc(ic.container), '</div>\n      <div class="dqi-route">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">').concat(esc(ic.type), " \xB7 ").concat(esc(lineName(ic.line)), '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || "\u2014"), " \xB7 ").concat(ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || "\u2014"), "</div>\n      </div>\n      ").concat(icAwaitingSurvey(ic) ? '<span class="sbadge s-pending">Awaiting survey</span>' : sbadge(ic.status), "\n      ").concat((() => {
    const x = icExitDate(ic, _idx);
    return x ? '<span class="sbadge" title="This container has left the yard" style="color:var(--text-3)">Exited '.concat(fmtDate(x), "</span>") : ic.surveyStatus === "awaiting_survey" ? "" : '<span class="sbadge s-active">In yard</span>';
  })(), '\n      <div class="dqi-time">').concat(timeAgo(ic.date), "</div>\n      ").concat(icInYard(ic, _idx) ? '<button class="modal-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="event.stopPropagation();quickDispatchOut(\''.concat(ic.id, "')\">Quick Dispatch \u2192</button>") : "", "\n    </div>")).join("") || '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No inward entries yet</div></div>';
}
function renderInwardStillInStorage() {
  const wrap = document.getElementById("inwardStillInStorageList");
  const meta = document.getElementById("inwardStillInStorageMeta");
  if (!wrap) return;
  const _idx = icOutIndex();
  const items = state.db.interchange.filter((i) => icInYard(i, _idx)).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (meta) meta.textContent = items.length ? "".concat(items.length, " without a recorded exit") : "";
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Everything logged has a recorded exit</div></div>';
    return;
  }
  wrap.innerHTML = items.map((ic) => '<div class="dispatch-queue-item">\n      <div class="dqi-ref">'.concat(esc(ic.container), '</div>\n      <div class="dqi-route">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">').concat(esc(ic.ctype || "\u2014"), " \xB7 ").concat(esc(lineName(ic.line)), '</div>\n        <div style="font-size:10px;color:var(--text-3)">In since ').concat(fmtDate(ic.date)).concat(ic.notes === "Bulk import" ? " \xB7 migrated record" : "", '</div>\n      </div>\n      <div style="display:flex;gap:6px;flex-shrink:0">\n        ').concat(!ic.surveyStatus ? '<button class="modal-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="sendToSurvey(\''.concat(ic.id, "')\">Send to Survey \u2192</button>") : "", '\n        <button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="quickDispatchOut(\'').concat(ic.id, "')\">Quick Dispatch \u2192</button>\n      </div>\n    </div>")).join("");
}
async function renderInwardAwaitingSurvey() {
  const wrap = document.getElementById("inwardAwaitingSurveyList");
  const meta = document.getElementById("inwardAwaitingSurveyMeta");
  if (!wrap) return;
  const items = state.db.interchange.filter((i) => i.surveyStatus === "awaiting_survey").sort((a, b) => new Date(a.date) - new Date(b.date));
  if (meta) meta.textContent = items.length ? "".concat(items.length, " waiting") : "";
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Nothing awaiting survey</div></div>';
    return;
  }
  let docsByIc = {}, docsByBooking = {};
  try {
    if (window.bookingDocs) {
      docsByIc = await window.bookingDocs.documentsForInterchanges(items.map((i) => i.id));
      const bIds = items.map((i) => i.bookingId).filter(Boolean);
      if (bIds.length) docsByBooking = await window.bookingDocs.documentsForBookings(bIds);
    }
  } catch (e) {
  }
  wrap.innerHTML = items.map((ic) => {
    const hasGuarantee = (docsByIc[ic.id] || []).some((d) => d.doc_type === "guarantee_form") || (docsByBooking[ic.bookingId] || []).some((d) => d.doc_type === "guarantee_form");
    return '<div class="dispatch-queue-item">\n      <div class="dqi-ref">'.concat(esc(ic.container), '</div>\n      <div class="dqi-route">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">').concat(esc(ic.type), " \xB7 ").concat(esc(lineName(ic.line)), '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || "\u2014"), " \xB7 ").concat(ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || "\u2014"), '</div>\n      </div>\n      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">\n        ').concat(hasGuarantee ? '<span class="sbadge s-approved">Guarantee form \u2713</span>' : '<span class="sbadge s-pending">No guarantee form</span>', '\n        <div class="dqi-time" style="margin:0">').concat(timeAgo(ic.date), '</div>\n      </div>\n      <button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="startSurveyForInterchange(\'').concat(ic.id, "')\">Start Survey \u2192</button>\n    </div>");
  }).join("");
}
function markInwardSurveyed(id) {
  const ic = state.db.interchange.find((i) => i.id === id);
  if (!ic) return;
  ic.surveyStatus = "surveyed";
  ic.surveyedAt = (/* @__PURE__ */ new Date()).toISOString();
  ic.surveyedBy = state.profile.username;
  ic._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, "Inward Entry Surveyed", ic.container);
  toast("".concat(ic.container, " marked surveyed"), "success");
  renderInwardAwaitingSurvey();
  renderInwardRecent();
}
let _inwardSaving = false;
let _inwardBooking = null;
async function createInwardEntry() {
  if (_inwardSaving) return;
  _inwardSaving = true;
  try {
    await _createInwardEntryInner();
  } finally {
    _inwardSaving = false;
  }
}
async function _createInwardEntryInner() {
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const cont = val("iw_container").toUpperCase();
  if (!cont) {
    toast("Container number required", "error");
    return;
  }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) {
    toast("Container number: ".concat(contIssue), "error");
    return;
  }
  const lineId = val("iw_line");
  if (!lineId) {
    toast("Choose the shipping line", "error");
    return;
  }
  if (!document.getElementById("iw_size").value || !document.getElementById("iw_type").value) {
    toast("Choose the container size and type", "error");
    return;
  }
  const truckVal = val("iw_truck"), driverVal = val("iw_driver"), driverIdVal = val("iw_driver_id");
  const cg = (k) => window.cfgGet ? window.cfgGet(k) : void 0;
  if (!truckVal && cg("gate.requireTruck") !== false) {
    toast("Lorry / truck number required", "error");
    return;
  }
  if (!val("iw_trailer") && cg("gate.requireTrailer")) {
    toast("Trailer number required", "error");
    return;
  }
  if (!driverVal) {
    toast("Driver name required", "error");
    return;
  }
  if (!driverIdVal && cg("gate.requireDriverId") !== false) {
    toast("Driver's ID / driving licence number required", "error");
    return;
  }
  const type = "Gate-In";
  const dateVal = (/* @__PURE__ */ new Date()).toISOString();
  const dupIc = findDuplicateInterchange(cont, type, dateVal);
  if (dupIc) {
    toast("".concat(cont, " already has a ").concat(type, " record logged on ").concat(fmtDate(dateVal)), "warning");
    return;
  }
  const booking = _inwardBooking;
  const avail = await checkContainerAvailable(cont, { bookingId: booking ? booking.id : null });
  if (avail) {
    toast(avail, "error", 7e3);
    return;
  }
  const truck = state.db.trucks.find((t) => t.reg.toLowerCase() === truckVal.toLowerCase());
  const driver = state.db.drivers.find((d) => d.name.toLowerCase() === driverVal.toLowerCase());
  const icId = uid("IC");
  const ctype = composeCtype(document.getElementById("iw_size").value, document.getElementById("iw_type").value);
  const bk = booking || {};
  const icRecord = {
    id: icId,
    container: cont,
    type,
    ctype,
    line: lineId,
    condition: "Good",
    truck: truck ? truck.id : "",
    driver: driver ? driver.id : "",
    truckRegText: truck ? "" : sanitize(truckVal),
    driverNameText: driver ? "" : sanitize(driverVal),
    driverIdNumber: sanitize(driverIdVal),
    trailerNo: sanitize(val("iw_trailer")),
    transporter: sanitize(bk.transporter || ""),
    eirNumber: "",
    clerkName: state.profile && state.profile.name || "",
    blNumber: sanitize(bk.bl_number || ""),
    guaranteeNo: sanitize(bk.bl_number || ""),
    vessel: sanitize(bk.vessel || ""),
    voyage: sanitize(bk.voyage || ""),
    deliveringParty: sanitize(bk.company || bk.full_name || ""),
    isoCode: "",
    grossWeight: "",
    manufactureDate: "",
    cargoStatus: "",
    repairs: [],
    repairTotal: 0,
    notes: booking ? "Booking ".concat(bk.reference || String(bk.id).slice(0, 8), " \xB7 ").concat(bk.full_name || "").concat(bk.phone ? " \xB7 " + bk.phone : "") : "",
    date: dateVal,
    gateInAt: dateVal,
    depotInAt: null,
    status: "pending",
    img: "",
    photos: [],
    dateOut: null,
    receivingParty: "",
    releaseOrderNo: "",
    needsSurvey: true,
    surveyStatus: "awaiting_survey",
    surveyedAt: null,
    surveyedBy: null,
    bookingId: booking ? booking.id : null,
    _dirty: true
  };
  const savedIc = await persistNewInterchange(icRecord);
  if (!savedIc.ok) {
    toast("Gate-In NOT saved \u2014 ".concat(savedIc.message), "error", 9e3);
    return;
  }
  buildBadges();
  if (typeof rememberIncomingDriver === "function" && !driver) {
    rememberIncomingDriver({ name: driverVal, idNo: driverIdVal, transporter: icRecord.transporter, truck: truck ? truck.reg : truckVal, trailer: icRecord.trailerNo });
  }
  if (booking) {
    const { error: bErr } = await supabase.from("public_bookings").update({
      status: "imported",
      storage_status: "awaiting_survey",
      gated_in_at: dateVal,
      truck_reg: truckVal,
      driver_name: driverVal,
      driver_id_number: driverIdVal,
      shipping_line_id: lineId,
      container: cont
    }).eq("id", booking.id).in("status", ["pending", "confirmed"]);
    if (bErr) toast("Gate-In saved, but the booking status could not be updated \u2014 ".concat(bErr.message), "warning", 8e3);
    addAudit(state.profile.username, "Booking Gated In", "".concat(bk.reference || String(bk.id).slice(0, 8), " \xB7 ").concat(cont));
  }
  addAudit(state.profile.username, "Gate-In Recorded", "".concat(cont, " \u2014 awaiting survey"));
  refreshContainerHistory();
  clearInwardForm();
  renderInterchange("all");
  renderInwardRecent();
  renderInwardAwaitingSurvey();
  renderInwardStillInStorage();
  renderInwardAwaitingGateIn();
  if (booking && typeof renderPublicBookings === "function" && state.currentSection === "publicbookings") renderPublicBookings();
  if (!booking) {
    try {
      const bookingId = await createDepotBookingFromInterchange(icRecord);
      if (bookingId) {
        icRecord.bookingId = bookingId;
        icRecord._dirty = true;
      }
    } catch (e) {
      toast("Gate-In saved, but couldn't queue ".concat(cont, " for survey (").concat(e.message || e, "). Use Start Survey in the Awaiting Survey list to retry."), "warning", 8e3);
    }
  }
  scheduleSave();
  renderInwardAwaitingSurvey();
  if (typeof renderDepOpsAwaitingSurvey === "function") renderDepOpsAwaitingSurvey();
  showInwardGated(icRecord);
  toast("Gate-In complete \u2014 ".concat(cont, ". Now awaiting survey; the interchange is issued after the survey."), "success", 5e3);
}
function showInwardGated(ic) {
  const el = document.getElementById("inwardJustGated");
  if (!el) return;
  el.style.display = "block";
  el.innerHTML = "<b>".concat(esc(ic.container), ' gated in</b><br>Step 2: survey it to complete the Depot-In. The interchange (EIR) is issued when the survey is saved.\n    <div style="margin-top:8px"><button class="action-btn" onclick="startSurveyForInterchange(\'').concat(ic.id, "')\">Start survey now &rarr;</button>\n    <button class=\"action-btn ghost\" onclick=\"this.closest('#inwardJustGated').style.display='none'\">Later</button></div>");
}
function iwDriverPicked(inp) {
  const d = (state.db.drivers || []).find((x) => (x.name || "").toLowerCase() === inp.value.trim().toLowerCase());
  if (!d) return;
  const idEl = document.getElementById("iw_driver_id"), trEl = document.getElementById("iw_truck");
  if (idEl && !idEl.value && d.idNo) idEl.value = d.idNo;
  if (trEl && !trEl.value && d.truckId) {
    const t = state.db.trucks.find((x) => x.id === d.truckId);
    if (t) trEl.value = t.reg;
  }
}
async function startSurveyForInterchange(icId) {
  const ic = state.db.interchange.find((i) => i.id === icId);
  if (!ic) {
    toast("Record not found", "error");
    return;
  }
  let bid = ic.bookingId;
  if (!bid) {
    try {
      bid = await createDepotBookingFromInterchange(ic);
    } catch (e) {
      toast("Could not prepare the survey: ".concat(e.message || e), "error", 7e3);
      return;
    }
    if (!bid) {
      toast("Could not prepare the survey for this container", "error");
      return;
    }
    ic.bookingId = bid;
    ic._dirty = true;
    scheduleSave();
  }
  openSurveyModal(bid);
}
function finalizeDepotIn(ic) {
  if (!ic || !isInwardMovement(ic.type)) return false;
  if (!ic.gateInAt) ic.gateInAt = ic.date;
  ic.type = "Depot-In";
  ic.depotInAt = ic.depotInAt || (/* @__PURE__ */ new Date()).toISOString();
  ic._dirty = true;
  return true;
}
function clearInwardForm(skipRepopulate) {
  ["iw_container", "iw_truck", "iw_driver", "iw_driver_id", "iw_trailer"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  _inwardBooking = null;
  const bn = document.getElementById("inwardBookingBanner");
  if (bn) {
    bn.style.display = "none";
    bn.innerHTML = "";
  }
  _inwardImages = [];
  if (!skipRepopulate) populateInwardSelects();
}
function switchInwardTab(tab, btn) {
  const show = (id, on) => {
    const el = document.getElementById(id);
    if (el) el.style.display = on ? "block" : "none";
  };
  show("inwardTabSingle", tab === "single");
  show("inwardTabBulk", tab === "bulk");
  show("inwardTabReports", tab === "reports");
  document.querySelectorAll("#sec-inward .filter-row .filter-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  if (tab === "reports") {
    fillSelect("iwRptLine", state.db.shippingLines, (l) => [l.id, "".concat(l.code, " \u2014 ").concat(l.name)]);
    {
      const s = document.getElementById("iwRptLine");
      if (s && s.options[0]) s.options[0].textContent = "All Lines";
    }
    renderInwardReports();
  }
}
let _iwRptRows = [];
function iwStatusOf(ic, exited) {
  const out = exited[String(ic.container || "").toUpperCase()];
  if (ic.dateOut || out && new Date(out) >= new Date(ic.gateInAt || ic.date)) return "exited";
  if (ic.surveyStatus === "awaiting_survey" || ic.surveyStatus === "escalated") return "awaiting_survey";
  return "in_storage";
}
const IW_STATUS_LABEL = { awaiting_survey: "Awaiting Survey", in_storage: "In Storage", exited: "Exited" };
function renderInwardReports() {
  const body = document.getElementById("iwRptBody");
  if (!body) return;
  const g = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
  };
  const line = g("iwRptLine"), mv = g("iwRptType"), st = g("iwRptStatus"), from = g("iwRptFrom"), to = g("iwRptTo");
  const exited = {};
  (state.db.interchange || []).filter((i) => /Out$/.test(i.type)).forEach((i) => {
    const k = String(i.container || "").toUpperCase();
    if (!exited[k] || new Date(i.date) > new Date(exited[k])) exited[k] = i.date;
  });
  const all = (state.db.interchange || []).filter((i) => isInwardMovement(i.type)).map((i) => ({ ic: i, status: iwStatusOf(i, exited), at: i.gateInAt || i.date }));
  _iwRptRows = all.filter((r) => (!line || r.ic.line === line) && (!mv || r.ic.type === mv) && (!st || r.status === st) && (!from || String(r.at).slice(0, 10) >= from) && (!to || String(r.at).slice(0, 10) <= to)).sort((a, b) => new Date(b.at) - new Date(a.at));
  const n = (s) => _iwRptRows.filter((r) => r.status === s).length;
  const sum = document.getElementById("iwRptSummary");
  if (sum) sum.innerHTML = '<div class="kpi-row" style="margin-bottom:14px">'.concat(kpiCard("Matching records", _iwRptRows.length, "", "kpi-blue")).concat(kpiCard("Awaiting survey", n("awaiting_survey"), "Gated in, not surveyed", n("awaiting_survey") ? "kpi-orange" : "kpi-green")).concat(kpiCard("In storage", n("in_storage"), "Surveyed, on the ground", "kpi-gold")).concat(kpiCard("Exited", n("exited"), "Released", "kpi-green"), "</div>");
  const meta = document.getElementById("iwRptMeta");
  if (meta) meta.textContent = "".concat(_iwRptRows.length, " record").concat(_iwRptRows.length === 1 ? "" : "s");
  const btn = document.getElementById("iwRptExportBtn");
  if (btn) btn.disabled = !_iwRptRows.length;
  body.innerHTML = _iwRptRows.map(({ ic, status, at }) => "<tr><td>".concat(fmtDate(at), "</td><td><b>").concat(esc(ic.container), "</b></td><td>").concat(esc(ic.type), "</td><td>").concat(esc(ic.ctype || "-"), "</td><td>").concat(esc(lineName(ic.line)), "</td>\n    <td>").concat(ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || "-"), "</td><td>").concat(ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || "-"), "</td><td>").concat(esc(IW_STATUS_LABEL[status]), "</td>\n    <td>").concat(status === "awaiting_survey" && ic.surveyStatus !== "escalated" ? '<button class="modal-btn primary" style="padding:3px 9px;font-size:10.5px" onclick="startSurveyForInterchange(\''.concat(ic.id, "')\">Survey</button>") : "", "</td></tr>")).join("") || '<tr><td colspan="9" class="empty-td">No inward entries match these filters</td></tr>';
}
function inwardReportsReset() {
  ["iwRptLine", "iwRptType", "iwRptStatus", "iwRptFrom", "iwRptTo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  renderInwardReports();
}
function downloadInwardReportCSV() {
  if (!_iwRptRows.length) {
    toast("Run the report first. There is nothing to export.", "warning");
    return;
  }
  const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const head = ["Gate-In date", "Depot-In date", "Container", "Movement", "Size/Type", "Shipping line", "EIR No.", "Truck", "Trailer", "Driver", "Driver ID", "Status"];
  const rows = _iwRptRows.map(({ ic, status, at }) => [
    at,
    ic.depotInAt || "",
    ic.container,
    ic.type,
    ic.ctype,
    lineName(ic.line),
    ic.eirNumber,
    ic.truck ? truckName(ic.truck) : ic.truckRegText,
    ic.trailerNo,
    ic.driver ? driverName(ic.driver) : ic.driverNameText,
    ic.driverIdNumber,
    IW_STATUS_LABEL[status]
  ]);
  const blob = new Blob(["\uFEFF" + [head].concat(rows).map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inward-report-".concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), ".csv");
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1e3);
}
async function createDepotBookingFromInterchange(ic) {
  const truck = ic.truck ? state.db.trucks.find((t) => t.id === ic.truck) : null;
  const driver = ic.driver ? state.db.drivers.find((d) => d.id === ic.driver) : null;
  const payload = {
    booking_kind: "depot",
    intake_source: "gate",
    status: "imported",
    service_type: "Depot Storage",
    storage_status: "awaiting_survey",
    full_name: driver ? driver.name : ic.driverNameText || "Gate Entry",
    company: ic.deliveringParty || "",
    email: "",
    phone: "",
    container: ic.container || "",
    cargo_type: ic.ctype || "",
    shipping_line_id: ic.line || null,
    vessel: ic.vessel || "",
    voyage: ic.voyage || "",
    bl_number: ic.blNumber || "",
    eir_number: ic.eirNumber || "",
    transporter: ic.transporter || "",
    truck_reg: truck ? truck.reg : ic.truckRegText || "",
    driver_name: driver ? driver.name : ic.driverNameText || "",
    driver_id_number: ic.driverIdNumber || ""
  };
  const { data, error } = await supabase.from("public_bookings").insert(payload).select("id").single();
  if (error) {
    toast("Could not create DepOps booking record: ".concat(error.message), "error");
    return null;
  }
  return data.id;
}
async function renderInwardAwaitingGateIn() {
  const wrap = document.getElementById("inwardAwaitingGateInList");
  const meta = document.getElementById("inwardAwaitingGateInMeta");
  if (!wrap) return;
  try {
    const { data, error } = await supabase.from("public_bookings").select("*").eq("status", "confirmed").order("confirmed_at", { ascending: true, nullsFirst: false });
    if (error) throw error;
    const list = data || [];
    if (meta) meta.textContent = list.length ? "".concat(list.length, " expected") : "";
    if (!list.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No confirmed bookings are waiting to arrive</div></div>';
      return;
    }
    let docs = {};
    try {
      if (window.bookingDocs) docs = await window.bookingDocs.documentsForBookings(list.map((b) => b.id));
    } catch (e) {
    }
    wrap.innerHTML = list.map((b) => {
      const hasG = (docs[b.id] || []).some((d) => d.doc_type === "guarantee_form");
      return '<div class="dispatch-queue-item" style="align-items:center;gap:10px">\n        <div class="dqi-ref">'.concat(esc(b.container || "No container no."), '</div>\n        <div class="dqi-route" style="flex:1;min-width:0">\n          <div style="font-size:12px;font-weight:600;color:var(--text)">').concat(esc(b.company || b.full_name || "\u2014"), '</div>\n          <div style="font-size:10px;color:var(--text-3)">').concat(esc(b.reference || b.id.slice(0, 8))).concat(b.bulk_ref ? " \xB7 " + esc(b.bulk_ref) : "").concat(b.cargo_type ? " \xB7 " + esc(b.cargo_type) : "").concat(b.pickup_date ? " \xB7 expected " + fmtDate(b.pickup_date) : "", '</div>\n          <div style="margin-top:3px">').concat(hasG ? '<span class="sbadge s-approved">Guarantee form \u2713</span>' : '<span class="sbadge s-pending">No guarantee form</span>', '</div>\n        </div>\n        <div style="display:flex;flex-direction:column;gap:5px">\n          <button class="modal-btn primary" onclick="startInwardFromBooking(\'').concat(b.id, '\')">Confirmed In \u2192</button>\n          <button class="modal-btn ghost" onclick="cancelPublicBooking(\'').concat(b.id, "','cancelled')\">Cancel</button>\n        </div>\n      </div>");
    }).join("");
  } catch (e) {
    console.warn("Awaiting gate-in load failed:", e);
    wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-label">Could not load bookings \u2014 check your connection</div></div>';
  }
}
function ctypeFromBookingText(txt) {
  const s = String(txt || "").toLowerCase();
  if (!s) return null;
  const m = s.match(/(20|40|45)\s*(?:ft|foot|')?/);
  const size = m ? (m[1] === "45" ? "40" : m[1]) + "ft" : null;
  let type = "Dry";
  if (/reefer|refrigerat/.test(s)) type = "Reefer";
  else if (/open\s*top/.test(s)) type = "Open Top";
  else if (/flat\s*rack/.test(s)) type = "Flat Rack";
  else if (/tank/.test(s)) type = "Tank";
  else if (/high\s*cube|\bhc\b/.test(s)) type = "HC";
  const combo = size ? "".concat(size, " ").concat(type) : type;
  if (CONTAINER_TYPE_OPTIONS.indexOf(combo) !== -1) return combo;
  if (CONTAINER_TYPE_OPTIONS.indexOf(type) !== -1) return type;
  return null;
}
async function startInwardFromBooking(bookingId) {
  const { data: b, error } = await supabase.from("public_bookings").select("*").eq("id", bookingId).single();
  if (error || !b) {
    toast("Booking not found", "error");
    return;
  }
  if (b.status !== "confirmed" && b.status !== "pending") {
    toast("This booking has already been received or closed", "warning");
    renderInwardAwaitingGateIn();
    return;
  }
  if (b.container) {
    const avail = await checkContainerAvailable(b.container, { bookingId: b.id });
    if (avail) {
      toast(avail, "error", 7e3);
      return;
    }
  }
  showSection("inward", document.querySelector('.nav-item[data-section="inward"]'));
  const firstTab = document.querySelector("#sec-inward .filter-row .filter-btn");
  if (typeof switchInwardTab === "function") switchInwardTab("single", firstTab);
  _inwardBooking = b;
  const setv = (id, v) => {
    const el = document.getElementById(id);
    if (el && v != null) el.value = v;
  };
  setv("iw_container", (b.container || "").toUpperCase());
  setv("iw_type_movement", "Gate-In");
  const ct = ctypeFromBookingText(b.cargo_type);
  if (ct) populateSizeTypeSelects("iw_size", "iw_type", ct);
  if (b.shipping_line_id && (state.db.shippingLines || []).some((l) => l.id === b.shipping_line_id)) setv("iw_line", b.shipping_line_id);
  setv("iw_delivering", b.company || b.full_name || "");
  setv("iw_guarantee_no", b.bl_number || "");
  setv("iw_vessel", b.vessel || "");
  setv("iw_voyage", b.voyage || "");
  setv("iw_transporter", b.transporter || "");
  setv("iw_truck", b.truck_reg || "");
  setv("iw_driver", b.driver_name || "");
  setv("iw_driver_id", b.driver_id_number || "");
  setv("iw_notes", "Booking ".concat(b.reference || b.id.slice(0, 8), " \xB7 ").concat(b.full_name || "").concat(b.phone ? " \xB7 " + b.phone : ""));
  const sv = document.getElementById("iw_needs_survey");
  if (sv) {
    sv.checked = true;
    sv.disabled = true;
  }
  const cEl = document.getElementById("iw_container");
  if (cEl && typeof markContainerValidity === "function") markContainerValidity(cEl);
  const bn = document.getElementById("inwardBookingBanner");
  if (bn) {
    bn.style.display = "block";
    bn.innerHTML = "<b>Receiving booking ".concat(esc(b.reference || b.id.slice(0, 8)), "</b> \u2014 ").concat(esc(b.company || b.full_name || "")).concat(b.container ? "" : '<br><span style="color:var(--amber)">This booking has no container number \u2014 enter it below.</span>', '\n      <br>Saving sends it to <b>Awaiting Survey</b>. <a href="#" onclick="clearInwardForm();return false" style="color:var(--gold)">Cancel / enter a different container</a>');
  }
  if (cEl) {
    cEl.scrollIntoView({ behavior: "smooth", block: "center" });
    cEl.focus();
  }
}
function previewInwardImg(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const room = 6 - _inwardImages.length;
  if (room <= 0) {
    toast("Maximum 6 photos \u2014 remove one to add another", "error");
    e.target.value = "";
    return;
  }
  files.slice(0, room).forEach((file) => {
    if (!file.type.startsWith("image/")) {
      toast("".concat(file.name, " skipped \u2014 not an image"), "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("".concat(file.name, " skipped \u2014 max 2MB"), "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      _inwardImages.push(ev.target.result);
      renderInwardImgPreview();
    };
    reader.readAsDataURL(file);
  });
  if (files.length > room) toast("Only ".concat(room, " more photo").concat(room === 1 ? "" : "s", " could be added (max 6)"), "warning");
  e.target.value = "";
}
function renderInwardImgPreview() {
  const wrap = document.getElementById("inwardImgPreview");
  const label = document.getElementById("inwardImgLabel");
  if (!wrap) return;
  if (!_inwardImages.length) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    if (label) label.textContent = "Upload container photos";
    return;
  }
  wrap.style.display = "block";
  wrap.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap">'.concat(_inwardImages.map((src, i) => '<div class="container-img-thumb"><img src="'.concat(src, '" /><button type="button" class="container-img-remove" onclick="clearInwardImg(').concat(i, ')" title="Remove">\u2715</button></div>')).join(""), "</div>");
  if (label) label.textContent = "".concat(_inwardImages.length, " photo").concat(_inwardImages.length > 1 ? "s" : "", " attached");
}
function clearInwardImg(i) {
  if (typeof i === "number") _inwardImages.splice(i, 1);
  else _inwardImages = [];
  const fileInput = document.getElementById("iw_img");
  if (fileInput) fileInput.value = "";
  renderInwardImgPreview();
}
let _inwardGuaranteeFile = null;
function previewInwardGuaranteeFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImg = file.type.startsWith("image/");
  if (!isPdf && !isImg) {
    toast("Upload an image or PDF", "error");
    e.target.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast("File too large \u2014 max 5MB", "error");
    e.target.value = "";
    return;
  }
  _inwardGuaranteeFile = file;
  renderInwardGuaranteePreview();
}
function renderInwardGuaranteePreview() {
  const wrap = document.getElementById("inwardGuaranteePreview");
  const label = document.getElementById("inwardGuaranteeLabel");
  if (!wrap) return;
  if (!_inwardGuaranteeFile) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    if (label) label.textContent = "Upload container guarantee form";
    return;
  }
  wrap.style.display = "block";
  wrap.innerHTML = '<div style="display:flex;align-items:center;gap:8px">\n      <span>\u{1F4CE} '.concat(esc(_inwardGuaranteeFile.name), " (").concat((_inwardGuaranteeFile.size / 1024).toFixed(0), ' KB)</span>\n      <button type="button" class="modal-btn ghost" style="padding:2px 8px;font-size:10px" onclick="clearInwardGuaranteeFile()">Remove</button>\n    </div>');
  if (label) label.textContent = "1 file attached";
}
function clearInwardGuaranteeFile() {
  _inwardGuaranteeFile = null;
  const fileInput = document.getElementById("iw_guarantee_file");
  if (fileInput) fileInput.value = "";
  renderInwardGuaranteePreview();
}
function handleInwardBulkDrop(e) {
  e.preventDefault();
  document.getElementById("inwardBulkDrop").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) processInwardBulkFile(file);
}
function handleInwardBulkFile(e) {
  const file = e.target.files[0];
  if (file) processInwardBulkFile(file);
}
function processInwardBulkFile(file) {
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
      rows = normalizeRowKeys(rows);
      const looksOutward = /outward|outwrd|_out\b|-out\b/i.test(name) && !/inward/i.test(name);
      const sniffedDirection = sniffBulkDirectionFromRows(rows);
      showInwardBulkPreview(rows, sniffedDirection || (looksOutward ? "out" : "in"));
    } catch (err) {
      toast("Could not parse file \u2014 check format", "error");
    }
  };
  if (isExcel) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}
function showInwardBulkPreview(rows, direction) {
  if (!rows.length) {
    toast("No rows found in file", "error");
    return;
  }
  const keys = Object.keys(rows[0]);
  const tbl = document.getElementById("inwardBulkPreviewTable");
  tbl.querySelector("thead").innerHTML = "<tr>".concat(keys.map((k) => "<th>".concat(esc(k), "</th>")).join(""), "</tr>");
  tbl.querySelector("tbody").innerHTML = rows.slice(0, 10).map((r) => "<tr>".concat(keys.map((k) => "<td>".concat(esc(r[k]), "</td>")).join(""), "</tr>")).join("");
  document.getElementById("inwardBulkRowCount").textContent = "".concat(rows.length, " rows");
  document.getElementById("inwardBulkPreview").style.display = "block";
  document.getElementById("inwardBulkPreview").dataset.rows = JSON.stringify(rows);
  const dirSel = document.getElementById("iw_bulk_direction");
  dirSel.value = direction === "out" ? "out" : "in";
  updateBulkDirectionLabel();
  dirSel.onchange = updateBulkDirectionLabel;
}
async function processBulkInward() {
  var _a;
  const rows = JSON.parse(document.getElementById("inwardBulkPreview").dataset.rows || "[]");
  const direction = ((_a = document.getElementById("iw_bulk_direction")) == null ? void 0 : _a.value) === "out" ? "out" : "in";
  const VALID_TYPES = {
    "gatein": "Gate-In",
    "gate-in": "Gate-In",
    "depotin": "Depot-In",
    "depot-in": "Depot-In",
    "gateout": "Gate-Out",
    "gate-out": "Gate-Out",
    "depotout": "Depot-Out",
    "depot-out": "Depot-Out"
  };
  const defaultType = direction === "out" ? "Gate-Out" : "Gate-In";
  const VALID_COND = ["Good", "Damaged", "Dirty", "Needs Repair"];
  let serverConflicts = {};
  try {
    const keys = [...new Set(rows.map((r) => normContainerKey(pickField(r, ["container", "containerno", "containernumber", "containernrno"]))).filter(Boolean))];
    for (let i = 0; i < keys.length; i += 1e3) {
      const { data, error } = await supabase.rpc("check_containers_available", { p_containers: keys.slice(i, i + 1e3) });
      if (error) throw error;
      Object.assign(serverConflicts, data || {});
    }
  } catch (e) {
    console.warn("bulk duplicate pre-check failed:", e);
    toast("Could not verify duplicates with the server \u2014 nothing was imported. Please try again.", "error", 7e3);
    return;
  }
  const skipped = [];
  const liveInFile = /* @__PURE__ */ new Set();
  let created = 0;
  const flagged = [];
  const seenInBatch = /* @__PURE__ */ new Set();
  const importBatchId = "INW-".concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), "-").concat(Date.now().toString(36).toUpperCase());
  rows.forEach((r, idx) => {
    const contRaw = pickField(r, ["container", "containerno", "containernumber", "containernrno"]);
    const rowLabel = contRaw || "row ".concat(idx + 1);
    let cont = contRaw ? contRaw.toUpperCase() : "";
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
    const typeRaw = pickField(r, ["movement", "type"]).toLowerCase().replace(/[^a-z]/g, "");
    const type = VALID_TYPES[typeRaw] || defaultType;
    let dateVal = (/* @__PURE__ */ new Date()).toISOString();
    const dateRaw = pickField(r, ["date", "entrydate", "datein", "dateout", "gateindate", "gateoutdate", "inwarddate", "outwarddate", "entrydatetime"]);
    {
      const d = parseFlexibleDate(dateRaw);
      if (d) {
        dateVal = d.toISOString();
        flagIfImplausibleDate(d, issueTags, flagged, rowLabel);
      }
    }
    const dupKey = "".concat(cont, "::").concat(type, "::").concat(new Date(dateVal).toDateString());
    if (seenInBatch.has(dupKey)) {
      issueTags.push("duplicate within this file (same container, type & date)");
      flagged.push("".concat(cont, ": duplicate within this file (same container, type & date)"));
    }
    const dupIc = findDuplicateInterchange(cont, type, dateVal);
    if (dupIc) {
      issueTags.push("possible duplicate of an existing ".concat(type, " record on ").concat(fmtDate(dateVal)));
      flagged.push("".concat(cont, ": already has a ").concat(type, " record logged on ").concat(fmtDate(dateVal)));
    }
    seenInBatch.add(dupKey);
    const truckVal = pickField(r, ["truck", "truckreg", "vehicle", "reg", "truckno", "lorryno", "transporters", "transporter"]);
    const driverVal = pickField(r, ["driver", "drivername", "driversname"]);
    const lineVal = pickField(r, ["line", "shippingline", "linecode", "shippinglines"]);
    const vesselVal = pickField(r, ["vessel", "exvessel"]);
    const truck = truckVal ? state.db.trucks.find((t) => t.reg.toLowerCase() === truckVal.toLowerCase() || t.id === truckVal) : null;
    const driver = driverVal ? state.db.drivers.find((d) => d.name.toLowerCase() === driverVal.toLowerCase() || d.id === driverVal) : null;
    let line = findShippingLineByText(lineVal);
    if (!line && vesselVal) {
      const guessedId = resolveLineIdFromVessel(vesselVal);
      if (guessedId) line = state.db.shippingLines.find((l) => l.id === guessedId);
    }
    if (!line) {
      const lineIssue = lineVal ? 'shipping line "'.concat(lineVal, '" not found in Shipping Lines') : "no shipping line in file";
      issueTags.push(lineIssue);
      flagged.push("".concat(cont, ": ").concat(lineIssue));
    }
    const ctypeExplicit = pickField(r, ["ctype"]);
    const sizeRaw = pickField(r, ["size"]);
    const containerTypeRaw = pickField(r, ["containertype", "type"]);
    let ctype = CONTAINER_TYPE_OPTIONS.find((c) => c.toLowerCase() === ctypeExplicit.toLowerCase());
    if (!ctype && sizeRaw && containerTypeRaw) ctype = composeCtypeFromDepotCode(sizeRaw, containerTypeRaw);
    if (!ctype) ctype = CONTAINER_TYPE_OPTIONS[0];
    const condRaw = pickField(r, ["condition"]);
    const condition = VALID_COND.find((c) => c.toLowerCase() === condRaw.toLowerCase()) || "Good";
    let dateOutVal = null;
    const dateOutRaw = pickField(r, ["dateout", "exitdate", "gateoutdate", "dateexited"]);
    {
      const dOut = parseFlexibleDate(dateOutRaw);
      if (dOut) dateOutVal = dOut.toISOString();
    }
    if ((type === "Gate-In" || type === "Depot-In") && !dateOutVal) {
      const key = normContainerKey(cont);
      const why = serverConflicts[key] || localContainerConflict(cont) || (liveInFile.has(key) ? "".concat(cont, " appears more than once in this file as a container still in the yard") : null);
      if (why) {
        skipped.push(why);
        return;
      }
      liveInFile.add(key);
    }
    const cargoStatusRaw = pickField(r, ["cargostatus"]);
    const cargoStatus = CARGO_STATUS_OPTIONS.find((c) => c.toLowerCase() === cargoStatusRaw.toLowerCase()) || sanitize(cargoStatusRaw);
    const guaranteeBlVal = sanitize(pickField(r, ["guaranteeno", "guaranteenumber", "guranteeformno", "guaranteeformno", "bl", "blnumber", "blno"]));
    state.db.interchange.push({
      id: uid("IC"),
      container: cont,
      type,
      ctype,
      line: line ? line.id : "",
      condition,
      truck: truck ? truck.id : "",
      driver: driver ? driver.id : "",
      truckRegText: truck ? "" : sanitize(truckVal),
      driverNameText: driver ? "" : sanitize(driverVal),
      eirNumber: sanitize(pickField(r, ["eir", "eirnumber", "eirno", "ineirno", "outeirno", "outeir", "refinno", "refoutno", "inwardno"])),
      blNumber: guaranteeBlVal,
      vessel: sanitize(vesselVal),
      voyage: sanitize(pickField(r, ["voyage", "voy"])),
      deliveringParty: sanitize(pickField(r, ["deliveringparty", "delivering", "shipper"])),
      guaranteeNo: guaranteeBlVal,
      cargoStatus,
      repairs: [],
      repairTotal: 0,
      notes: [sanitize(pickField(r, ["notes", "remarks"])) || "Bulk import", ...issueTags.map((t) => "\u26A0 ".concat(t))].filter(Boolean).join(" \u2014 "),
      date: dateVal,
      status: "approved",
      img: "",
      dateOut: dateOutVal,
      receivingParty: sanitize(pickField(r, ["receivingparty"])),
      releaseOrderNo: sanitize(pickField(r, ["releaseorderno", "releaseorder"])),
      flaggedForReview: issueTags.length > 0,
      flagReasons: issueTags.slice(),
      duplicateOfId: dupIc ? dupIc.id : null,
      importBatchId,
      _dirty: true
    });
    created++;
  });
  scheduleSave();
  buildBadges();
  addAudit(state.profile.username, "Bulk Inward Entry", "".concat(created, " entries imported").concat(flagged.length ? ", ".concat(flagged.length, " flagged for review") : "", " (batch ").concat(importBatchId, ")"));
  if (skipped.length) {
    toast("".concat(created, " created \u2014 ").concat(skipped.length, " skipped (container already in the system)"), "warning", 8e3);
    openModal("Bulk Inward Entry Result", '<div style="margin-bottom:10px;font-size:12px;color:var(--text)">'.concat(created, " entry(ies) created. <b>").concat(skipped.length, ' row(s) were NOT imported</b> because that container is already in the system:</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-2);max-height:300px;overflow:auto">').concat(skipped.map((x) => esc(x)).join("<br>"), "</div>").concat(flagged.length ? '<div style="margin-top:10px;font-size:11.5px;color:var(--text-3)">'.concat(flagged.length, " imported row(s) are also flagged for cleanup in the Depot Report.</div>") : ""));
  } else if (flagged.length) {
    toast("".concat(created, " created \u2014 ").concat(flagged.length, " flagged for cleanup (see details)"), "warning", 6e3);
    openModal("Bulk Inward Entry Result", '<div style="margin-bottom:10px;font-size:12px;color:var(--text)">'.concat(created, ' entry(ies) created successfully \u2014 all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (').concat(flagged.length, ')</div><div style="max-height:240px;overflow-y:auto">').concat(flaggedPreview(flagged).map((s) => '<div class="ops-notice" style="margin-bottom:6px">'.concat(esc(s), "</div>")).join(""), "</div>"));
  } else {
    toast("".concat(created, " inward entries created"), "success");
  }
  refreshContainerHistory();
  renderInterchange("all");
  renderInwardRecent();
  renderInwardStillInStorage();
  document.getElementById("inwardBulkPreview").style.display = "none";
}
function downloadInwardBulkTemplate() {
  const csv = "container,type,size,containerType,line,truck,driver,eir,bl,vessel,voyage,deliveringParty,guaranteeNo,cargoStatus,condition,date,dateOut,receivingParty,releaseOrderNo,notes\nMSCU1234566,Gate-In,40ft,Dry,MSC,KDX 655V,James Otieno,EIR-00123,BL-4471,MSC VESSEL,VA-001,ACME Traders,GTE-00981,Laden / Full,Good,,,,,Delivered in good condition";
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,".concat(encodeURIComponent(csv));
  a.download = "gargo_inward_bulk_template.csv";
  a.click();
}
const INWARD_IC_TYPES = ["Gate-In", "Depot-In"];
const OUTWARD_IC_TYPES = ["Gate-Out", "Depot-Out"];
let _depotReportTab = "inward";
let _depotReportRange = "all";
let _depotReportLine = "all";
let _depotReportDupes = [];
function switchDepotReportTab(tab, btn) {
  _depotReportTab = tab;
  document.querySelectorAll("#sec-depotreport .filter-row .filter-btn[data-tab]").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderDepotReport();
}
function filterDepotReportRange(range, btn) {
  _depotReportRange = range;
  document.querySelectorAll("#sec-depotreport .filter-row .filter-btn[data-range]").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderDepotReport();
}
function filterDepotReportLine() {
  const sel = document.getElementById("drLineFilter");
  _depotReportLine = sel ? sel.value : "all";
  renderDepotReport();
}
function _depotReportInRange(dateStr) {
  if (_depotReportRange === "all") return true;
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setDate(cutoff.getDate() - Number(_depotReportRange));
  return new Date(dateStr) >= cutoff;
}
function _depotReportLineMatch(rec) {
  return _depotReportLine === "all" || (_depotReportLine === "__unmapped__" ? !rec.line : rec.line === _depotReportLine);
}
function _tripToDepotReportRecord(t) {
  const outward = isOutwardWorkType(t.workType);
  return {
    id: t.id,
    container: t.container,
    type: outward ? t.outwardType || "Dispatch (Depot \u2192 Port)" : "Inward (Port \u2192 Depot)",
    line: t.shippingLine || "",
    condition: "",
    truck: t.truckId || "",
    driver: t.driverId || "",
    truckRegText: "",
    driverNameText: "",
    eirNumber: t.eirNumber || "",
    vessel: t.vessel || "",
    voyage: t.voyage || "",
    date: outward ? t.dateOut || t.startTime : t.startTime,
    status: t.status,
    notes: t.notes || "",
    flaggedForReview: !!t.flaggedForReview,
    flagReasons: t.flagReasons || [],
    importBatchId: t.importBatchId || null,
    _reportSource: "trips"
  };
}
function _depotReportInwardEntries() {
  const fromInterchange = state.db.interchange.filter((ic) => INWARD_IC_TYPES.includes(ic.type)).map((ic) => __spreadProps(__spreadValues({}, ic), { _reportSource: "interchange" }));
  const fromTrips = state.db.trips.filter((t) => !isOutwardWorkType(t.workType)).map(_tripToDepotReportRecord);
  return [...fromInterchange, ...fromTrips].filter(_depotReportLineMatch).filter((rec) => _depotReportInRange(rec.date)).sort((a, b) => new Date(b.date) - new Date(a.date));
}
function _depotReportOutwardEntries() {
  const fromInterchange = state.db.interchange.filter((ic) => OUTWARD_IC_TYPES.includes(ic.type)).map((ic) => __spreadProps(__spreadValues({}, ic), { _reportSource: "interchange" }));
  const fromTrips = state.db.trips.filter((t) => isOutwardWorkType(t.workType)).map(_tripToDepotReportRecord);
  return [...fromInterchange, ...fromTrips].filter(_depotReportLineMatch).filter((rec) => _depotReportInRange(rec.date)).sort((a, b) => new Date(b.date) - new Date(a.date));
}
function populateDepotReportLineFilter() {
  const sel = document.getElementById("drLineFilter");
  if (!sel || sel.dataset.populated) return;
  sel.innerHTML = '<option value="all">All Lines</option><option value="__unmapped__">\u26A0 No Line Assigned</option>' + state.db.shippingLines.map((l) => '<option value="'.concat(l.id, '">').concat(esc(l.code), "</option>")).join("");
  sel.dataset.populated = "1";
}
async function computeDepotReportDuplicates() {
  try {
    const { data, error } = await supabase.rpc("find_interchange_duplicates");
    if (error) throw error;
    const rows = (data || []).map(icFromRow);
    const dayGroups = {};
    rows.forEach((ic) => {
      const key = "".concat((ic.container || "").toUpperCase(), "::").concat(ic.type, "::").concat(new Date(ic.date).toDateString());
      (dayGroups[key] = dayGroups[key] || []).push(ic);
    });
    _depotReportDupes = Object.values(dayGroups).filter((list) => list.length > 1).map((list) => ({ kind: "Same container, type & day", records: list, ids: list.map((i) => i.id) }));
  } catch (e) {
    console.error("Duplicate scan failed:", e.message);
    toast("Duplicate scan failed \u2014 check your connection", "error");
    _depotReportDupes = [];
  }
  return _depotReportDupes;
}
let _depotReportLoadedFrom = null;
let _depotReportLoadedDb = null;
async function ensureDepotReportRangeLoaded() {
  if (_depotReportLoadedDb !== state.db) {
    _depotReportLoadedDb = state.db;
    _depotReportLoadedFrom = null;
  }
  if (_depotReportLoadedFrom === "all") return;
  const windowCut = operationalCutoffISO();
  let wantFrom = null;
  if (_depotReportRange !== "all") {
    const c = /* @__PURE__ */ new Date();
    c.setDate(c.getDate() - Number(_depotReportRange));
    wantFrom = c.toISOString();
    if (wantFrom >= windowCut) return;
    if (_depotReportLoadedFrom && _depotReportLoadedFrom <= wantFrom) return;
  }
  const tripQ = (from, to) => {
    let q = supabase.from("trips").select("*").eq("status", "completed").lt("start_time", windowCut);
    if (wantFrom) q = q.or("start_time.gte.".concat(wantFrom, ",date_out.gte.").concat(wantFrom));
    return q.order("start_time", { ascending: false }).range(from, to);
  };
  const icQ = (from, to) => {
    let q = supabase.from("interchange").select("*").eq("status", "reconciled").lt("date", windowCut);
    if (wantFrom) q = q.gte("date", wantFrom);
    return q.order("date", { ascending: false }).range(from, to);
  };
  const [tRes, iRes] = await Promise.all([fetchAllPaginated(tripQ), fetchAllPaginated(icQ)]);
  if (tRes.error || iRes.error) {
    console.error("Depot report history load failed:", (tRes.error || iRes.error).message);
    toast("Could not load older records \u2014 report may be incomplete", "error");
    return;
  }
  const haveT = new Set(state.db.trips.map((t) => t.id));
  tRes.data.forEach((r) => {
    if (!haveT.has(r.id)) state.db.trips.push(tripFromRow(r));
  });
  const haveI = new Set(state.db.interchange.map((i) => i.id));
  iRes.data.forEach((r) => {
    if (!haveI.has(r.id)) state.db.interchange.push(icFromRow(r));
  });
  _depotReportLoadedFrom = wantFrom || "all";
}
async function fetchUnmappedLineTotal() {
  try {
    const [a, b] = await Promise.all([
      supabase.from("interchange").select("id", { count: "exact", head: true }).is("line_id", null),
      supabase.from("trips").select("id", { count: "exact", head: true }).is("shipping_line_id", null)
    ]);
    if (a.error || b.error) throw a.error || b.error;
    return (a.count || 0) + (b.count || 0);
  } catch (e) {
    return state.db.interchange.filter((ic) => !ic.line).length + state.db.trips.filter((t) => !t.shippingLine).length;
  }
}
async function renderDepotReport() {
  populateDepotReportLineFilter();
  if (_depotReportTab === "dupes") {
    const dupesEl = document.getElementById("depotReportDupesList");
    if (dupesEl) dupesEl.innerHTML = '<div class="empty-state"><div class="empty-state-label">Scanning register\u2026</div></div>';
  }
  await computeDepotReportDuplicates();
  await ensureDepotReportRangeLoaded();
  const inward = _depotReportInwardEntries();
  const outward = _depotReportOutwardEntries();
  const unmappedTotal = await fetchUnmappedLineTotal();
  const kpi = document.getElementById("depotReportKpis");
  if (kpi) {
    kpi.innerHTML = [
      kpiCard("Inward Entries", inward.length, INWARD_IC_TYPES.join(" / "), "kpi-green"),
      kpiCard("Outward Entries", outward.length, [...OUTWARD_IC_TYPES, "Dispatch trips"].join(" / "), "kpi-gold"),
      kpiCard("Net Movement", inward.length - outward.length, "Inward \u2212 outward, in range", "kpi-blue"),
      kpiCard("Duplicates Flagged", _depotReportDupes.length, "Across full register", _depotReportDupes.length ? "kpi-red" : "kpi-green")
    ].join("");
  }
  const unmappedEl = document.getElementById("depotReportUnmappedNotice");
  if (unmappedEl) {
    unmappedEl.style.display = unmappedTotal ? "flex" : "none";
    unmappedEl.innerHTML = unmappedTotal ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> '.concat(unmappedTotal, " record").concat(unmappedTotal === 1 ? "" : "s", ' across the whole register have no shipping line assigned and won\'t appear under any line filter. <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold);font-weight:600">Resolve them \u2192</a>') : "";
  }
  const dupeCountEl = document.getElementById("depotReportDupeCount");
  if (dupeCountEl) dupeCountEl.textContent = _depotReportDupes.length ? "(".concat(_depotReportDupes.length, ")") : "";
  const tabInward = document.getElementById("depotReportTabInward");
  const tabOutward = document.getElementById("depotReportTabOutward");
  const tabDupes = document.getElementById("depotReportTabDupes");
  if (tabInward) tabInward.style.display = _depotReportTab === "inward" ? "block" : "none";
  if (tabOutward) tabOutward.style.display = _depotReportTab === "outward" ? "block" : "none";
  if (tabDupes) tabDupes.style.display = _depotReportTab === "dupes" ? "block" : "none";
  if (_depotReportTab === "inward") renderDepotReportTable("depotReportInwardList", inward);
  if (_depotReportTab === "outward") renderDepotReportTable("depotReportOutwardList", outward);
  if (_depotReportTab === "dupes") renderDepotReportDupesList();
}
function renderDepotReportTable(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\u{1F4CB}</div><div class="empty-state-label">No entries in this range</div></div>';
    return;
  }
  const flaggedIds = new Set(_depotReportDupes.flatMap((d) => d.ids));
  el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>\n      <th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Vessel / Voyage</th>\n      <th>Truck</th><th>Driver</th><th>Condition</th><th>Status</th><th>Source</th>\n    </tr></thead><tbody>'.concat(items.map((ic) => "<tr".concat(flaggedIds.has(ic.id) || ic.flaggedForReview ? ' style="background:rgba(220,60,60,0.08)"' : "", '>\n      <td class="mono">').concat(fmtDate(ic.date), '</td>\n      <td class="mono" style="color:var(--gold)">').concat(esc(ic.container)).concat(flaggedIds.has(ic.id) || ic.flaggedForReview ? " \u26A0" : "", "</td>\n      <td>").concat(esc(ic.type), "</td>\n      <td>").concat(esc(lineName(ic.line)), '</td>\n      <td class="mono">').concat(esc(ic.eirNumber || "\u2014"), "</td>\n      <td>").concat(esc(ic.vessel || "\u2014")).concat(ic.voyage ? " / " + esc(ic.voyage) : "", "</td>\n      <td>").concat(ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || "\u2014"), "</td>\n      <td>").concat(ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || "\u2014"), "</td>\n      <td>").concat(esc(ic.condition || "\u2014"), "</td>\n      <td>").concat(sbadge(ic.status), "</td>\n      <td>").concat(_icSourceTag(ic), "</td>\n    </tr>")).join(""), "</tbody></table></div>");
}
function renderDepotReportDupesList() {
  const el = document.getElementById("depotReportDupesList");
  if (!el) return;
  if (!_depotReportDupes.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\u2705</div><div class="empty-state-label">No duplicates found across the register</div></div>';
    return;
  }
  el.innerHTML = _depotReportDupes.map((dup) => '\n    <div class="ic-card" style="flex-direction:column;align-items:stretch;margin-bottom:10px">\n      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">\n        <div style="font-size:12px;font-weight:600;color:var(--red)">'.concat(esc(dup.kind), '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(dup.records.length, " records</div>\n      </div>\n      ").concat(dup.records.map((r) => '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--border);font-size:11px">\n          <div class="mono" style="color:var(--text-2)"><span style="color:var(--gold)">'.concat(esc(r.container), "</span> \xB7 ").concat(esc(r.type), " \xB7 ").concat(fmtDate(r.date), " \xB7 EIR ").concat(esc(r.eirNumber || "\u2014"), " \xB7 ").concat(_icSourceTag(r), '</div>\n          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">\n            ').concat(sbadge(r.status), "\n          </div>\n        </div>")).join(""), "\n    </div>")).join("");
}
function printDepotReport() {
  const items = _depotReportTab === "outward" ? _depotReportOutwardEntries() : _depotReportInwardEntries();
  if (!items.length) {
    toast("Nothing to print yet", "error");
    return;
  }
  const rows = items.map((ic) => "<tr>\n    <td>".concat(fmtDate(ic.date), "</td><td>").concat(sanitize(ic.container || "\u2014"), "</td><td>").concat(sanitize(ic.type || "\u2014"), "</td>\n    <td>").concat(sanitize(lineName(ic.line)), "</td><td>").concat(sanitize(ic.eirNumber || "\u2014"), "</td>\n    <td>").concat(sanitize(ic.truck ? truckName(ic.truck) : ic.truckRegText || "\u2014"), "</td>\n    <td>").concat(sanitize(ic.driver ? driverName(ic.driver) : ic.driverNameText || "\u2014"), "</td>\n    <td>").concat(sanitize((ic.status || "").toUpperCase()), "</td><td>").concat(_icSourceTag(ic), "</td>\n  </tr>")).join("");
  const w = window.open("", "_blank");
  w.document.write("<html><head><title>Depot Report</title><style>\n    body{font-family:Arial,sans-serif;padding:20px;color:#111}\n    table{width:100%;border-collapse:collapse;font-size:11px}\n    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}\n    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}\n    h2{margin-bottom:4px}\n  </style></head><body>".concat(ghPrintHeaderHtml(), "<h2>").concat(_depotReportTab === "outward" ? "Outward" : "Inward", ' Register</h2>\n  <div style="font-size:11px;color:#555;margin-bottom:12px">Generated ').concat((/* @__PURE__ */ new Date()).toLocaleString("en-KE"), " \xB7 Range: ").concat(_depotReportRange === "all" ? "All time" : "Last ".concat(_depotReportRange, " days"), " \xB7 ").concat(items.length, " record(s)</div>\n  <table><thead><tr><th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Truck</th><th>Driver</th><th>Status</th><th>Source</th></tr></thead><tbody>").concat(rows, "</tbody></table>\n  </body></html>"));
  w.document.close();
  w.focus();
  w.print();
}
function downloadDepotReportCSV() {
  const items = _depotReportTab === "outward" ? _depotReportOutwardEntries() : _depotReportInwardEntries();
  if (!items.length) {
    toast("Nothing to download yet", "error");
    return;
  }
  const headers = ["Date", "Container", "Type", "Shipping Line", "EIR No.", "Vessel", "Voyage", "Truck", "Driver", "Condition", "Status", "Source"];
  const rows = items.map((ic) => [
    ic.date,
    ic.container,
    ic.type,
    lineName(ic.line),
    ic.eirNumber,
    ic.vessel,
    ic.voyage,
    ic.truck ? truckName(ic.truck) : ic.truckRegText,
    ic.driver ? driverName(ic.driver) : ic.driverNameText,
    ic.condition,
    ic.status,
    _icSourceTag(ic)
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => '"'.concat(String(v == null ? "" : v).replace(/"/g, '""'), '"')).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "depot-report-".concat(_depotReportTab, "-").concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), ".csv");
  a.click();
  URL.revokeObjectURL(a.href);
}
function toggleDangerZone() {
  const dz = document.getElementById("dangerZone");
  const btn = document.getElementById("dangerZoneToggle");
  const open = dz.style.display === "none";
  dz.style.display = open ? "block" : "none";
  btn.textContent = open ? "\u25B2 Hide Danger Zone" : "\u25BC Show Danger Zone";
}
const DEPOPS_DOC_LABELS = {
  guarantee_form: "Container Guarantee Form",
  release_order: "Release Order (CRO)",
  delivery_order: "Delivery Order"
};
let _depOpsTab = "inbound";
let _depOpsInboundFilter = "pending_review";
let _depOpsOutwardFilter = "pending_review";
function depOpsFmtDT(raw) {
  if (!raw) return "\u2014";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? String(raw) : d.toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function docStatusBadge(status) {
  const styleKey = { verified: "approved", pending_review: "pending", rejected: "rejected" }[status] || "pending";
  const label = status === "pending_review" ? "Pending Review" : status.charAt(0).toUpperCase() + status.slice(1);
  return '<span class="sbadge s-'.concat(styleKey, '">').concat(label, "</span>");
}
function switchDepOpsTab(tab, btn) {
  _depOpsTab = tab;
  document.querySelectorAll("#sec-depops .depops-tab-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.querySelectorAll("#sec-depops .depops-tab-panel").forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById("depopsPanel-" + tab);
  if (panel) panel.classList.add("active");
  renderDepOps();
}
async function renderDepOps() {
  renderDepOpsZones();
  renderDepOpsStorageList();
  updateDepOpsBadge();
  if (_depOpsTab === "inbound") await renderDepOpsInbound();
  else if (_depOpsTab === "zones") await renderDepOpsZoneAdmin();
  else if (_depOpsTab === "escalations") await renderDepOpsEscalations();
  else if (_depOpsTab === "yard") await renderDepOpsYardMap();
  else if (_depOpsTab === "surveys") await renderDepOpsSurveyRegister();
  else if (_depOpsTab === "master") await renderDepOpsMasterList();
  else if (_depOpsTab === "reports") await renderDepOpsReports();
  else await renderDepOpsOutward();
}
async function updateDepOpsBadge() {
  const badge = document.getElementById("badge-depops");
  if (!badge || !window.bookingDocs) return;
  try {
    const [inboundPending, outwardPending] = await Promise.all([
      window.bookingDocs.reviewQueue("pending_review"),
      window.bookingDocs.outwardReviewQueue("pending_review")
    ]);
    const count = inboundPending.length + outwardPending.length;
    badge.textContent = count || "";
    badge.style.display = count ? "inline" : "none";
  } catch (e) {
  }
}
async function renderDepOpsZones() {
  const wrap = document.getElementById("depopsZones");
  if (!wrap) return;
  try {
    const zones = await window.bookingDocs.listZones();
    if (!zones.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-state-label">No storage zones configured yet</div></div>';
      return;
    }
    wrap.innerHTML = '<table style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Line</th><th style="padding:6px 8px">Occupied</th><th style="padding:6px 8px">Free</th>\n      </tr></thead><tbody>'.concat(zones.map((z) => {
      const cap = z.capacity_teu || 0, occ = z.occupied_teu || 0, free = Math.max(cap - occ, 0);
      const pct = cap > 0 ? Math.min(100, Math.round(occ / cap * 100)) : 0;
      const lineLabel = z.shipping_lines ? "".concat(sanitize(z.shipping_lines.code)) : '<span style="color:var(--text-3)">Unassigned</span>';
      return '<tr style="border-top:1px solid var(--border)">\n          <td style="padding:6px 8px">'.concat(sanitize(z.zone_code || ""), " \xB7 ").concat(sanitize(z.zone_name), '</td>\n          <td style="padding:6px 8px">').concat(lineLabel, '</td>\n          <td style="padding:6px 8px">').concat(occ, " / ").concat(cap, ' TEU<div style="width:100px;height:5px;background:#222;border-radius:3px;overflow:hidden;margin-top:4px"><div style="width:').concat(pct, '%;height:100%;background:var(--gold)"></div></div></td>\n          <td style="padding:6px 8px">').concat(free, " TEU</td>\n        </tr>");
    }).join(""), "</tbody></table>");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
async function renderDepOpsStorageList() {
  const wrap = document.getElementById("depopsStorageList");
  if (!wrap) return;
  try {
    const [bookings, zones] = await Promise.all([
      depOpsRepatriationEligibleBookings(),
      window.bookingDocs.storageAvailability()
    ]);
    if (!bookings.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers currently in storage</div></div>';
      return;
    }
    const zoneMap = {};
    zones.forEach((z) => {
      zoneMap[z.id] = z.zone_name;
    });
    const surveys = await Promise.all(bookings.map((b) => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    wrap.innerHTML = '<table style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px"></th>\n      </tr></thead><tbody>'.concat(bookings.map((b, i) => {
      const zoneName = b.storage_zone_id && zoneMap[b.storage_zone_id] || "Unknown zone";
      const survey = surveys[i];
      const icCell = !survey ? '<span style="color:var(--text-3);font-size:10.5px">No survey on file</span>' : survey.interchange_generated_at ? '<span class="sbadge s-approved" title="Generated '.concat(fmtDate(survey.interchange_generated_at), '">\u2713 Generated</span>').concat(survey.interchange_id ? ' <button class="tbl-btn" onclick="downloadInterchangeSlip(\''.concat(survey.interchange_id, '\')">\u2B07</button><button class="tbl-btn" onclick="printInterchangeSlip(\'').concat(survey.interchange_id, '\')" title="Print">\u{1F5A8}</button>') : "") : '<button class="modal-btn primary" onclick="generateInterchangeFromSurvey(\''.concat(b.id, "','").concat(survey.id, "')\">Generate \u2192</button>");
      return '<tr style="border-top:1px solid var(--border)">\n          <td style="padding:6px 8px" class="mono">'.concat(sanitize(b.container) || "\u2014", '</td>\n          <td style="padding:6px 8px">').concat(sanitize(zoneName), '</td>\n          <td style="padding:6px 8px">').concat(sanitize(b.full_name)).concat(b.company ? " \xB7 " + sanitize(b.company) : "", '</td>\n          <td style="padding:6px 8px">').concat(icCell, '</td>\n          <td style="padding:6px 8px"><button class="modal-btn ghost" onclick="depOpsDispatchContainer(\'').concat(b.id, "')\">Dispatch \u2192</button></td>\n        </tr>");
    }).join(""), "</tbody></table>");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function filterDepOpsInbound(status, btn) {
  _depOpsInboundFilter = status;
  document.querySelectorAll("#depopsPanel-inbound .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderDepOpsInbound();
}
async function renderDepOpsInbound() {
  await renderDepOpsReadyToProcess();
  await renderDepOpsAwaitingSurvey();
  await renderDepOpsAllocationQueue();
  const container = document.getElementById("depopsInboundQueue");
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const docs = await window.bookingDocs.reviewQueue(_depOpsInboundFilter);
    if (!docs.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-label">No '.concat(_depOpsInboundFilter.replace(/_/g, " "), " documents</div></div>");
      return;
    }
    container.innerHTML = docs.map((d) => depOpsDocCard(d, "inbound")).join("");
  } catch (e) {
    container.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
async function renderDepOpsReadyToProcess() {
  const wrap = document.getElementById("depopsReadyList");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const ready = await window.bookingDocs.readyToProcessBookings();
    if (!ready.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No bookings are fully verified yet</div></div>';
      return;
    }
    wrap.innerHTML = ready.map((entry) => depOpsReadyCard(entry)).join("");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function depOpsReadyCard(entry) {
  const b = entry.booking;
  return '<div style="border:1px solid rgba(34,197,94,0.35);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(34,197,94,0.05)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong>'.concat(sanitize(b.full_name), "</strong>").concat(b.company ? " \xB7 " + sanitize(b.company) : "", '\n        <div style="font-size:11px;color:var(--text-3)">').concat(sanitize(b.service_type), " \xB7 Container: ").concat(sanitize(b.container) || "\u2014", '</div>\n        <div style="font-size:10px;color:var(--text-3)">Booking ').concat(b.id.slice(0, 8), " \xB7 Verified: ").concat(entry.required.join(", ").replace(/_/g, " "), '</div>\n      </div>\n      <span class="sbadge s-approved">verified & ready</span>\n    </div>\n    <div style="margin-top:8px;font-size:11px;color:var(--text-3)">Confirming moves this booking to Awaiting Gate-In. It reaches Awaiting Survey once it is recorded at the gate.</div>\n    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">\n      <button class="modal-btn primary" onclick="confirmPublicBooking(\'').concat(b.id, "')\">Confirm Booking \u2192</button>").concat(bookingIsMovement(b.service_type) ? ' <button class="modal-btn ghost" onclick="importPublicBooking(\''.concat(b.id, "')\">Import to Fleet</button>") : "", '\n      <button class="modal-btn ghost" onclick="showPublicBookingDetail(\'').concat(b.id, "')\">View</button>\n    </div>\n  </div>");
}
const DEPOT_TYPE_CODE_MAP = {
  "DV": "Dry",
  "HD": "Dry",
  "HC": "HC",
  "FR": "Flat Rack",
  "FL": "Flat Rack",
  "OT": "Open Top",
  "PL": "Platform",
  "TK": "Tank",
  "LC": "LC (Unspecified)"
};
function composeCtypeFromDepotCode(sizeRaw, codeRaw) {
  const sizeStr = String(sizeRaw || "").trim();
  const sizeFt = sizeStr ? /ft$/i.test(sizeStr) ? sizeStr : "".concat(parseInt(sizeStr, 10), "ft") : "";
  const code = String(codeRaw || "").trim().toUpperCase();
  const mapped = DEPOT_TYPE_CODE_MAP[code];
  if (mapped) return composeCtype(sizeFt, mapped);
  return composeCtype(sizeFt || sizeStr, codeRaw);
}
async function renderDepOpsAwaitingSurvey() {
  const wrap = document.getElementById("depopsAwaitingSurveyList");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const bookings = await window.bookingDocs.awaitingSurveyBookings();
    if (!bookings.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Nothing awaiting survey</div></div>';
      return;
    }
    wrap.innerHTML = bookings.map((b) => '<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">\n      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n        <div>\n          <strong class="mono" style="color:var(--gold)">'.concat(sanitize(b.container) || "No container on file", '</strong>\n          <div style="font-size:11px;color:var(--text-3)">').concat(sanitize(b.full_name)).concat(b.company ? " \xB7 " + sanitize(b.company) : "", " \xB7 ").concat(sanitize(b.cargo_type || "\u2014"), '</div>\n          <div style="font-size:10px;color:var(--text-3)">Booking ').concat(b.id.slice(0, 8), '</div>\n        </div>\n        <span class="sbadge s-pending">awaiting survey</span>\n      </div>\n      <div style="margin-top:10px"><button class="modal-btn primary" onclick="openSurveyModal(\'').concat(b.id, "')\">Start Survey \u2192</button></div>\n    </div>")).join("");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
let _surveyImages = [];
let _surveyGuaranteeFile = null;
function _svLocalInput(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return "".concat(d.getFullYear(), "-").concat(p(d.getMonth() + 1), "-").concat(p(d.getDate()), "T").concat(p(d.getHours()), ":").concat(p(d.getMinutes()));
}
async function openSurveyModal(bookingId) {
  const { data: booking, error } = await supabase.from("public_bookings").select("*").eq("id", bookingId).single();
  if (error || !booking) {
    toast("Booking not found", "error");
    return;
  }
  const ic = state.db.interchange.find((i) => i.bookingId === bookingId) || null;
  const x = ic || {};
  const lineId = x.line || resolveBookingShippingLineId(booking);
  const lineOptions = state.db.shippingLines.map((l) => '<option value="'.concat(l.id, '" ').concat(l.id === lineId ? "selected" : "", ">").concat(sanitize(l.code), " \u2014 ").concat(sanitize(l.name), "</option>")).join("");
  const curType = x.ctype || booking.cargo_type;
  const typeOptions = CONTAINER_TYPE_OPTIONS.map((t) => "<option ".concat(curType === t ? "selected" : "", ">").concat(t, "</option>")).join("");
  const cargoOpts = ["", "Empty", "Laden / Full", "Part Load", "Damaged Cargo"].map((o) => '<option value="'.concat(o, '" ').concat(x.cargoStatus === o ? "selected" : "", ">").concat(o || "\u2014", "</option>")).join("");
  const pick = (a, b) => sanitize(a || b || "");
  _surveyImages = x.photos && x.photos.length ? x.photos.slice() : [];
  _surveyGuaranteeFile = null;
  window._repairItems.sv = [];
  openModal("Survey \u2014 ".concat(sanitize(x.container || booking.container) || "Container"), "\n    ".concat(ic ? '<div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0">Gate-In recorded '.concat(fmtDate(ic.gateInAt || ic.date), ". Saving this survey completes the <b>Depot-In</b> and issues the <b>interchange (EIR)</b>; the gate-in time is kept.</span></div>") : "", '\n    <div class="form-row-2">\n      <div class="fg"><label>Container No.</label><input id="sv_container" value="').concat(pick(x.container, booking.container), '" oninput="markContainerValidity(this)"></div>\n      <div class="fg"><label>Type / Size</label><select id="sv_ctype">').concat(typeOptions, '</select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Date IN</label><input id="sv_datein" type="datetime-local" value="').concat(_svLocalInput(x.gateInAt || x.date || booking.gated_in_at), '"></div>\n      <div class="fg"><label>Shipping Line</label><select id="sv_line"><option value="">\u2014</option>').concat(lineOptions, '</select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Consignee / C&amp;F</label><input id="sv_consignee" value="').concat(pick(x.deliveringParty, booking.company || booking.full_name), '"></div>\n      <div class="fg"><label>Guarantee / B/L Number</label><input id="sv_bl" value="').concat(pick(x.blNumber, booking.bl_number), '"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Ex Vessel</label><input id="sv_vessel" value="').concat(pick(x.vessel, booking.vessel), '"></div>\n      <div class="fg"><label>Voyage</label><input id="sv_voyage" value="').concat(pick(x.voyage, booking.voyage), '"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Transporter</label><input id="sv_transporter" value="').concat(pick(x.transporter, booking.transporter), '"></div>\n      <div class="fg"><label>ISO Code</label><input id="sv_iso" placeholder="e.g. 22G1" maxlength="6" style="text-transform:uppercase" value="').concat(pick(x.isoCode), '"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Max Gross Weight \u2014 MGW (kg)</label><input id="sv_mgwt" type="number" min="0" value="').concat(x.grossWeight || "", '"></div>\n      <div class="fg"><label>Tare Weight \u2014 TW (kg)</label><input id="sv_tare" type="number" min="0"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Gross Weight (kg) <span class="label-optional">(optional)</span></label><input id="sv_gross" type="number" min="0" step="1" placeholder="e.g. 30480" value="').concat(x.grossWeight || "", '"></div>\n      <div class="fg"><label>Date of Manufacture <span class="label-optional">(optional)</span></label><input id="sv_dom" placeholder="MM/YYYY" maxlength="7" value="').concat(pick(x.manufactureDate), '"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Cargo Status <span class="label-optional">(optional)</span></label><select id="sv_cargo">').concat(cargoOpts, '</select></div>\n      <div class="fg"><label>Gate Pass No.</label><input id="sv_gatepass"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Vehicle / Truck No.</label><input id="sv_truck" list="iwTruckList" value="').concat(sanitize(x.truck ? truckName(x.truck).split(" \xB7 ")[0] : x.truckRegText || booking.truck_reg || ""), '"></div>\n      <div class="fg"><label>Trailer Number</label><input id="sv_trailer" value="').concat(pick(x.trailerNo), '"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Driver Name</label><input id="sv_driver" list="iwDriverList" value="').concat(sanitize(x.driver ? driverName(x.driver) : x.driverNameText || booking.driver_name || ""), '"></div>\n      <div class="fg"><label>Driver ID Number</label><input id="sv_driver_id" value="').concat(pick(x.driverIdNumber, booking.driver_id_number), '"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Surveyed By</label><input id="sv_clerk" value="').concat(sanitize(state.profile && state.profile.name || ""), '"></div>\n      <div class="fg"><label>Seal Number</label><input id="sv_seal"></div>\n    </div>\n\n    <div class="fg"><label>Overall Condition</label><select id="sv_condition" onchange="onSurveyConditionChange()">\n      <option value="food_grade">Food Grade</option>\n      <option value="under_repair">Under Repair</option>\n      <option value="damaged">Damaged</option>\n      <option value="heavily_damaged">Heavily Damaged \u2014 requires joint survey</option>\n    </select></div>\n    <div id="sv_heavily_damaged_note" style="display:none;margin-bottom:10px" class="ops-notice">\n      This container will be sent to <b>Escalations</b> and cannot be allocated to storage until a second surveyor records a joint finding. It stays a Gate-In until then.\n    </div>\n\n    ').concat(tariffPickerHtml("sv"), '\n\n    <div class="fg"><label>Survey Photos <span class="label-optional">(up to 6)</span></label><input type="file" id="sv_images" accept="image/*" multiple onchange="onSurveyImagesSelected(event)"><div id="sv_images_preview" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div></div>\n    <div class="fg"><label>Guarantee Form <span class="label-optional">(optional, image or PDF)</span></label><input type="file" id="sv_guarantee_file" accept="image/*,.pdf" onchange="onSurveyGuaranteePicked(event)"><div id="sv_guarantee_label" style="font-size:11.5px;color:var(--text-2);margin-top:4px"></div></div>\n    <div class="fg"><label>Remarks / Notes</label><textarea id="sv_remarks" rows="3" placeholder="Damage notes, discrepancies, etc.">').concat(sanitize(x.notes || ""), '</textarea></div>\n    <button class="submit-btn" onclick="saveSurvey(\'').concat(bookingId, "')\">").concat(ic ? "Save Survey &amp; Complete Depot-In" : "Save Survey", " \u2192</button>\n  "));
  const svContEl = document.getElementById("sv_container");
  if (svContEl) markContainerValidity(svContEl);
  renderRepairItemsList("sv");
  _renderSurveyPhotos();
  if (typeof bindIncomingDriverAutofill === "function") bindIncomingDriverAutofill("sv");
}
function _renderSurveyPhotos() {
  const preview = document.getElementById("sv_images_preview");
  if (!preview) return;
  preview.innerHTML = _surveyImages.map(
    (src, i) => '<div style="position:relative"><img src="'.concat(src, '" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)" /><button type="button" onclick="removeSurveyImage(').concat(i, ')" title="Remove" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;line-height:14px;padding:0;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer">\xD7</button></div>')
  ).join("");
}
function removeSurveyImage(i) {
  _surveyImages.splice(i, 1);
  _renderSurveyPhotos();
}
function onSurveyConditionChange() {
  const el = document.getElementById("sv_condition");
  const note = document.getElementById("sv_heavily_damaged_note");
  if (note) note.style.display = el && el.value === "heavily_damaged" ? "block" : "none";
}
function onSurveyImagesSelected(e) {
  const files = Array.from(e.target.files || []);
  const room = 6 - _surveyImages.length;
  if (room <= 0) {
    toast("Maximum 6 photos \u2014 remove one to add another", "error");
    e.target.value = "";
    return;
  }
  files.slice(0, room).forEach((file) => {
    if (!file.type.startsWith("image/")) {
      toast("".concat(file.name, " skipped \u2014 not an image"), "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("".concat(file.name, " skipped \u2014 max 2MB per photo"), "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      _surveyImages.push(reader.result);
      _renderSurveyPhotos();
    };
    reader.readAsDataURL(file);
  });
  if (files.length > room) toast("Only ".concat(room, " more photo").concat(room === 1 ? "" : "s", " could be added (max 6)"), "warning");
  e.target.value = "";
}
function onSurveyGuaranteePicked(e) {
  const file = e.target.files && e.target.files[0];
  const lab = document.getElementById("sv_guarantee_label");
  if (!file) {
    _surveyGuaranteeFile = null;
    if (lab) lab.textContent = "";
    return;
  }
  const ok = file.type === "application/pdf" || /\.pdf$/i.test(file.name) || file.type.startsWith("image/");
  if (!ok) {
    toast("Upload an image or PDF", "error");
    e.target.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast("File too large \u2014 max 5MB", "error");
    e.target.value = "";
    return;
  }
  _surveyGuaranteeFile = file;
  if (lab) lab.textContent = "\u{1F4CE} ".concat(file.name, " (").concat((file.size / 1024).toFixed(0), " KB)");
}
async function saveSurvey(bookingId) {
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const container = val("sv_container").toUpperCase();
  if (container) {
    const containerIssue = containerFormatIssue(container);
    if (containerIssue) {
      toast("Container number: ".concat(containerIssue), "error");
      return;
    }
  }
  const dom = normalizeManufactureDate(val("sv_dom"));
  if (dom === null) {
    toast("Date of manufacture must look like 05/2011", "error");
    return;
  }
  const grossRaw = val("sv_gross"), gross = grossRaw ? Number(grossRaw) : "";
  if (grossRaw && (!isFinite(gross) || gross <= 0)) {
    toast("Gross weight must be a positive number", "error");
    return;
  }
  const dateInRaw = val("sv_datein");
  if (dateInRaw && isNaN(new Date(dateInRaw))) {
    toast("Date IN is not a valid date", "error");
    return;
  }
  const cg = (k) => window.cfgGet ? window.cfgGet(k) : void 0;
  const need = (cond, msg) => {
    if (cond) {
      toast(msg, "error");
      return true;
    }
    return false;
  };
  if (need(cg("survey.requireIso") && !val("sv_iso"), "ISO code is required")) return;
  if (need(cg("survey.requireWeight") && !grossRaw && !val("sv_mgwt"), "Gross weight is required")) return;
  if (need(cg("survey.requireManufactureDate") && !val("sv_dom"), "Date of manufacture is required")) return;
  if (need(cg("survey.requireCargoStatus") && !val("sv_cargo"), "Cargo status is required")) return;
  if (need(_surveyImages.length < (Number(cg("survey.minPhotos")) || 0), "At least ".concat(cg("survey.minPhotos"), " survey photo").concat(Number(cg("survey.minPhotos")) === 1 ? "" : "s", " required"))) return;
  const repairItems = repairItemsFor("sv");
  const sourceIc = state.db.interchange.find((i) => i.bookingId === bookingId);
  if (container) {
    const avail = await checkContainerAvailable(container, { bookingId, icId: sourceIc ? sourceIc.id : null });
    if (avail) {
      toast(avail, "error", 7e3);
      return;
    }
  }
  if (cg("survey.requireGuarantee") && !_surveyGuaranteeFile) {
    let have = false;
    try {
      if (sourceIc && window.bookingDocs) {
        const d = await window.bookingDocs.documentsForInterchanges([sourceIc.id]);
        have = (d[sourceIc.id] || []).some((x) => x.doc_type === "guarantee_form");
      }
    } catch (e) {
    }
    if (!have) {
      toast("Upload the guarantee form (required by your settings)", "error");
      return;
    }
  }
  const btn = document.querySelector("#modalOverlay .submit-btn");
  if (btn) btn.disabled = true;
  try {
    const willEscalate = val("sv_condition") === "heavily_damaged";
    let eirForSurvey = sourceIc ? sourceIc.eirNumber || "" : "";
    if (sourceIc && !eirForSurvey && !willEscalate) eirForSurvey = await nextEirNumber("Depot-In", val("sv_line") || sourceIc.line || "");
    const survey = await window.bookingDocs.recordSurvey({
      bookingId,
      sourceInterchangeId: sourceIc ? sourceIc.id : null,
      container,
      containerType: val("sv_ctype"),
      containerSize: val("sv_ctype"),
      shippingLineId: val("sv_line") || null,
      consignee: val("sv_consignee"),
      blNumber: val("sv_bl"),
      eirNumber: eirForSurvey,
      // EIR is system-generated at survey completion; never typed in
      isoCode: val("sv_iso").toUpperCase(),
      mgwt: val("sv_mgwt") ? parseFloat(val("sv_mgwt")) : null,
      tareWeight: val("sv_tare") ? parseFloat(val("sv_tare")) : null,
      vessel: val("sv_vessel"),
      voyage: val("sv_voyage"),
      transporter: val("sv_transporter"),
      truckReg: val("sv_truck"),
      trailerNumber: val("sv_trailer"),
      driverName: val("sv_driver"),
      driverIdNumber: val("sv_driver_id"),
      clerkName: val("sv_clerk"),
      sealNumber: val("sv_seal"),
      gatePassNumber: val("sv_gatepass"),
      conditionStatus: val("sv_condition") || "food_grade",
      remarks: val("sv_remarks"),
      photos: _surveyImages,
      tariffItems: repairItems
    });
    const heavy = val("sv_condition") === "heavily_damaged";
    const extra = {
      dateIn: dateInRaw ? new Date(dateInRaw).toISOString() : null,
      dateInInput: dateInRaw,
      manufactureDate: dom,
      cargoStatus: val("sv_cargo"),
      gross,
      deliveringParty: sanitize(val("sv_consignee")),
      notes: sanitize(val("sv_remarks")),
      truckReg: val("sv_truck"),
      driverName: val("sv_driver"),
      ctype: val("sv_ctype"),
      line: val("sv_line")
    };
    if (typeof rememberIncomingDriver === "function" && val("sv_driver")) {
      const svDriverName = val("sv_driver").toLowerCase();
      if (!state.db.drivers.some((d) => (d.name || "").toLowerCase() === svDriverName)) {
        rememberIncomingDriver({ name: val("sv_driver"), idNo: val("sv_driver_id"), transporter: val("sv_transporter"), truck: val("sv_truck"), trailer: val("sv_trailer") });
      }
    }
    if (sourceIc) {
      if (eirForSurvey) sourceIc.eirNumber = eirForSurvey;
      syncSurveyBackToInterchange(sourceIc, survey, heavy, extra);
      if (!heavy) {
        finalizeDepotIn(sourceIc);
        if (sourceIc.eirNumber) supabase.from("public_bookings").update({ eir_number: sourceIc.eirNumber }).eq("id", bookingId).then(() => {
        }, () => {
        });
        try {
          await window.bookingDocs.markInterchangeGenerated(survey.id, sourceIc.id);
        } catch (e) {
          console.warn("markInterchangeGenerated", e);
        }
      }
    } else if (!heavy && bookingId && survey && survey.id) {
      await generateInterchangeFromSurvey(bookingId, survey.id);
    }
    if (_surveyGuaranteeFile) {
      const file = _surveyGuaranteeFile;
      try {
        await saveNowAwaited();
        if (sourceIc) await window.bookingDocs.uploadInterchangeDocument({ interchangeId: sourceIc.id, docType: "guarantee_form", containerNo: container, file, autoVerify: true });
        else await window.bookingDocs.uploadBookingDocument({ bookingId, docType: "guarantee_form", containerNo: container, file });
        toast("Guarantee form uploaded", "success");
      } catch (e) {
        toast("Survey saved, but the guarantee form upload failed: ".concat(e.message || e), "warning", 7e3);
      }
      _surveyGuaranteeFile = null;
    }
    toast(heavy ? "Survey saved \u2014 escalated for joint survey (stays Gate-In until cleared)" : sourceIc ? "Survey saved \u2014 ".concat(container || sourceIc.container, " is now Depot-In \xB7 interchange ").concat(sourceIc.eirNumber || "", " issued") : "Survey saved", heavy ? "warning" : "success", 5e3);
    closeModal();
    renderDepOpsAwaitingSurvey();
    renderDepOpsAllocationQueue();
    renderDepOpsStorageList();
    if (typeof renderDepOpsEscalations === "function") renderDepOpsEscalations();
    if (typeof renderInwardAwaitingSurvey === "function") renderInwardAwaitingSurvey();
    if (typeof renderInwardStillInStorage === "function") renderInwardStillInStorage();
    if (typeof renderInwardRecent === "function") renderInwardRecent();
    if (typeof buildBadges === "function") buildBadges();
    if (state.currentSection === "interchange") renderInterchange(_icFilter || "all");
    if (state.currentSection === "dashboard" && typeof renderDashboard === "function") renderDashboard();
  } catch (e) {
    if (btn) btn.disabled = false;
    toast(e.message || "Could not save survey", "error");
  }
}
function syncSurveyBackToInterchange(ic, survey, heavy, x) {
  x = x || {};
  const conditionMap = { food_grade: "Good", under_repair: "Needs Repair", damaged: "Damaged", heavily_damaged: "Damaged" };
  if (survey.container) ic.container = survey.container.toUpperCase();
  ic.condition = conditionMap[survey.condition_status] || ic.condition;
  ic.surveyId = survey.id;
  ic.surveyStatus = heavy ? "escalated" : "surveyed";
  ic.surveyedAt = survey.surveyed_at || (/* @__PURE__ */ new Date()).toISOString();
  ic.surveyedBy = state.profile && state.profile.username || ic.surveyedBy;
  if (survey.vessel != null) ic.vessel = survey.vessel || "";
  if (survey.voyage != null) ic.voyage = survey.voyage || "";
  if (survey.bl_number) {
    ic.blNumber = survey.bl_number;
    ic.guaranteeNo = survey.bl_number;
  }
  if (survey.transporter != null) ic.transporter = survey.transporter || "";
  if (survey.clerk_name) ic.clerkName = survey.clerk_name;
  if (survey.driver_id_number) ic.driverIdNumber = survey.driver_id_number;
  if (survey.iso_code) ic.isoCode = survey.iso_code;
  if (survey.trailer_number != null) ic.trailerNo = survey.trailer_number || "";
  if (survey.shipping_line_id) ic.line = survey.shipping_line_id;
  if (x.ctype) ic.ctype = x.ctype;
  if (x.gross !== void 0 && x.gross !== "") ic.grossWeight = x.gross;
  else if (survey.mgwt) ic.grossWeight = survey.mgwt;
  if (x.manufactureDate !== void 0) ic.manufactureDate = x.manufactureDate;
  if (x.cargoStatus !== void 0) ic.cargoStatus = x.cargoStatus;
  if (x.deliveringParty) ic.deliveringParty = x.deliveringParty;
  if (x.notes) ic.notes = x.notes;
  if (x.dateIn && x.dateInInput !== _svLocalInput(ic.gateInAt || ic.date)) {
    ic.date = x.dateIn;
    ic.gateInAt = x.dateIn;
  }
  if (x.truckReg) {
    const t = state.db.trucks.find((t2) => (t2.reg || "").toLowerCase() === x.truckReg.toLowerCase());
    ic.truck = t ? t.id : "";
    ic.truckRegText = t ? "" : sanitize(x.truckReg);
  }
  if (x.driverName) {
    const d = state.db.drivers.find((d2) => (d2.name || "").toLowerCase() === x.driverName.toLowerCase());
    ic.driver = d ? d.id : "";
    ic.driverNameText = d ? "" : sanitize(x.driverName);
  }
  ic.photos = (survey.photos || []).slice();
  ic.img = ic.photos[0] || "";
  if (survey.tariff_items && survey.tariff_items.length) {
    ic.repairs = survey.tariff_items;
    ic.repairTotal = repairItemsTotal(survey.tariff_items);
  }
  ic._dirty = true;
  scheduleSave();
  addAudit(state.profile && state.profile.username || "system", heavy ? "Gate-In Surveyed (escalated)" : "Depot-In Completed (surveyed)", ic.container);
}
async function generateInterchangeFromSurvey(bookingId, surveyId) {
  try {
    const { data: booking } = await supabase.from("public_bookings").select("*").eq("id", bookingId).single();
    if (!booking) {
      toast("Booking not found for this container", "error");
      return;
    }
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    if (!survey) {
      toast("No survey found for this container", "error");
      return;
    }
    if (survey.interchange_generated_at) {
      return;
    }
    const conditionMap = { food_grade: "Good", under_repair: "Needs Repair", damaged: "Damaged", heavily_damaged: "Damaged" };
    const matchedTruck = state.db.trucks.find((t) => (t.reg || "").toUpperCase() === (survey.truck_reg || "").toUpperCase());
    const matchedDriver = state.db.drivers.find((d) => (d.name || "").toLowerCase() === (survey.driver_name || "").toLowerCase());
    let storageZone = "", storageBlock = "", storageSlot = "";
    if (booking.storage_status === "allocated") {
      try {
        const zones = await window.bookingDocs.listZones();
        const zone = zones.find((z) => z.id === booking.storage_zone_id);
        storageZone = zone ? zone.zone_code || zone.zone_name || "" : "";
        if (booking.storage_block_id) {
          const blocks = await window.bookingDocs.listBlocks(booking.storage_zone_id);
          const blk = blocks.find((x) => x.id === booking.storage_block_id);
          storageBlock = blk ? blk.block_code || "" : "";
        }
        storageSlot = booking.storage_slot_number ? String(booking.storage_slot_number) : "";
      } catch (e) {
      }
    }
    {
      const availDup = await checkContainerAvailable((survey.container || booking && booking.container || "").toUpperCase(), { bookingId });
      if (availDup) {
        toast(availDup, "error", 8e3);
        return;
      }
    }
    const eirNumber = await nextEirNumber("Depot-In", survey.shipping_line_id || booking && booking.shipping_line_id || "");
    const icRecord = {
      id: uid("IC"),
      container: (survey.container || booking && booking.container || "").toUpperCase(),
      type: "Depot-In",
      line: survey.shipping_line_id || "",
      condition: conditionMap[survey.condition_status] || "Good",
      truck: matchedTruck ? matchedTruck.id : "",
      driver: matchedDriver ? matchedDriver.id : "",
      ctype: survey.container_type || "",
      vessel: survey.vessel || "",
      voyage: survey.voyage || "",
      blNumber: survey.bl_number || "",
      guaranteeNo: survey.bl_number || "",
      eirNumber,
      deliveringParty: survey.consignee || "",
      transporter: survey.transporter || "",
      driverIdNumber: survey.driver_id_number || "",
      isoCode: survey.iso_code || "",
      trailerNo: survey.trailer_number || "",
      grossWeight: survey.mgwt || "",
      repairs: survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : survey.tariff_code ? [{ category: survey.tariff_category, code: survey.tariff_code, side: survey.tariff_side, item: survey.tariff_item, hours: survey.tariff_hours, material: survey.tariff_material }] : [],
      repairTotal: repairItemsTotal(survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : survey.tariff_code ? [{ hours: survey.tariff_hours, material: survey.tariff_material }] : []),
      notes: sanitize(survey.remarks || ""),
      clerkName: survey.clerk_name || "",
      storageZone,
      storageBlock,
      storageSlot,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      img: survey.photos && survey.photos[0] || "",
      surveyId: survey.id,
      bookingId: bookingId || null,
      truckRegText: !matchedTruck ? survey.truck_reg || "" : "",
      driverNameText: !matchedDriver ? survey.driver_name || "" : "",
      _dirty: true
    };
    const savedGen = await persistNewInterchange(icRecord);
    if (!savedGen.ok) {
      toast("Interchange not saved \u2014 ".concat(savedGen.message), "error", 9e3);
      return;
    }
    buildBadges();
    addAudit(state.profile.username, "Interchange Generated (from survey)", icRecord.container);
    await window.bookingDocs.markInterchangeGenerated(surveyId, icRecord.id);
    toast("Interchange generated for ".concat(icRecord.container, " \u2014 awaiting admin approval to release payment"), "success", 5e3);
    renderDepOpsStorageList();
    if (state.currentSection === "interchange") renderInterchange("all");
  } catch (e) {
    toast(e.message || "Could not generate interchange", "error");
  }
}
async function depOpsAllocZoneChanged(bookingId) {
  const zoneSel = document.getElementById("alloc-zone-" + bookingId);
  const blockSel = document.getElementById("alloc-block-" + bookingId);
  const slotSel = document.getElementById("alloc-slot-" + bookingId);
  if (!zoneSel || !blockSel || !slotSel) return;
  const zoneId = zoneSel.value;
  slotSel.innerHTML = '<option value="">\u2014</option>';
  if (!zoneId) {
    blockSel.innerHTML = '<option value="">Select zone first\u2026</option>';
    return;
  }
  blockSel.innerHTML = '<option value="">Loading\u2026</option>';
  try {
    const blocks = await window.bookingDocs.listBlocks(zoneId);
    if (!blocks.length) {
      blockSel.innerHTML = '<option value="">No blocks in this zone</option>';
      return;
    }
    blockSel.innerHTML = '<option value="">Select\u2026</option>' + blocks.map(
      (bl) => '<option value="'.concat(bl.id, '">').concat(sanitize(bl.block_code), " \xB7 ").concat(sanitize(bl.container_type), "</option>")
    ).join("");
  } catch (e) {
    blockSel.innerHTML = '<option value="">Error loading blocks</option>';
  }
}
async function depOpsAllocBlockChanged(bookingId) {
  const blockSel = document.getElementById("alloc-block-" + bookingId);
  const slotSel = document.getElementById("alloc-slot-" + bookingId);
  if (!blockSel || !slotSel) return;
  const blockId = blockSel.value;
  if (!blockId) {
    slotSel.innerHTML = '<option value="">\u2014</option>';
    return;
  }
  slotSel.innerHTML = '<option value="">Loading\u2026</option>';
  try {
    const slots = await window.bookingDocs.blockSlots(blockId);
    const free = slots.filter((s) => !s.booking_id && !s.trip_id && !s.container);
    if (!free.length) {
      slotSel.innerHTML = '<option value="">No free slots</option>';
      return;
    }
    slotSel.innerHTML = '<option value="">Select\u2026</option>' + free.map((s) => '<option value="'.concat(s.slot_number, '">Slot ').concat(s.slot_number, "</option>")).join("");
  } catch (e) {
    slotSel.innerHTML = '<option value="">Error loading slots</option>';
  }
}
async function renderDepOpsEscalations() {
  const wrap = document.getElementById("depopsEscalationsList");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const bookings = await window.bookingDocs.escalatedBookings();
    if (!bookings.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers awaiting joint survey</div></div>';
      return;
    }
    const surveys = await Promise.all(bookings.map((b) => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    wrap.innerHTML = bookings.map((b, i) => depOpsEscalationCard(b, surveys[i])).join("");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function depOpsEscalationCard(b, survey) {
  return '<div style="border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(239,68,68,0.06)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong class="mono" style="color:var(--red,#ef4444)">'.concat(sanitize(b.container) || "No container on file", '</strong>\n        <div style="font-size:11px;color:var(--text-3)">').concat(sanitize(b.full_name)).concat(b.company ? " \xB7 " + sanitize(b.company) : "", " \xB7 ").concat(sanitize(b.cargo_type || "\u2014"), "</div>\n        ").concat(survey ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">First survey by '.concat(sanitize(survey.clerk_name || "\u2014"), " on ").concat(fmtDate(survey.surveyed_at)).concat(survey.remarks ? " \u2014 " + sanitize(survey.remarks) : "", "</div>") : "", '\n      </div>\n      <span class="sbadge s-rejected">heavily damaged</span>\n    </div>\n    <div style="margin-top:10px"><button class="modal-btn primary" onclick="openJointSurveyModal(\'').concat(b.id, "','").concat(survey ? survey.id : "", "')\">Record Joint Survey \u2192</button></div>\n  </div>");
}
function openJointSurveyModal(bookingId, surveyId) {
  if (!surveyId) {
    toast("Original survey not found for this container", "error");
    return;
  }
  openModal("Joint Survey", '\n    <div class="ops-notice" style="margin-bottom:12px">A second, independent surveyor must confirm the condition before this container can be accepted into storage or rejected.</div>\n    <div class="fg"><label>Joint Surveyor Name</label><input id="js_by" value="'.concat(sanitize(state.profile && state.profile.name || ""), '"></div>\n    <div class="fg"><label>Final Condition</label><select id="js_condition">\n      <option value="damaged">Damaged \u2014 accept into storage as damaged</option>\n      <option value="under_repair">Under Repair \u2014 accept, route to workshop</option>\n      <option value="food_grade">Food Grade \u2014 original finding overturned</option>\n    </select></div>\n    <div class="fg"><label>Joint Survey Notes</label><textarea id="js_notes" rows="3" placeholder="Findings, agreement/disagreement with first survey..."></textarea></div>\n    <div style="display:flex;gap:8px;margin-top:6px">\n      <button class="submit-btn" style="flex:1" onclick="saveJointSurvey(\'').concat(bookingId, "','").concat(surveyId, '\', false)">Accept Into Storage \u2192</button>\n      <button class="modal-btn danger" onclick="saveJointSurvey(\'').concat(bookingId, "','").concat(surveyId, "', true)\">Reject Container</button>\n    </div>\n  "));
}
async function saveJointSurvey(bookingId, surveyId, reject) {
  const by = document.getElementById("js_by").value.trim();
  const notes = document.getElementById("js_notes").value.trim();
  const condition = document.getElementById("js_condition").value;
  if (!by) {
    toast("Joint surveyor name is required", "error");
    return;
  }
  if (reject && !confirm("Reject this container? It will be removed from the storage-allocation flow entirely.")) return;
  try {
    await window.bookingDocs.recordJointSurvey({ bookingId, surveyId, jointSurveyBy: by, jointSurveyNotes: notes, finalConditionStatus: condition, reject });
    addAudit(state.profile.username, reject ? "Container Rejected (joint survey)" : "Joint Survey Recorded", bookingId);
    if (!reject && bookingId && surveyId) {
      const srcIc = state.db.interchange.find((i) => i.bookingId === bookingId);
      if (srcIc) {
        srcIc.condition = { food_grade: "Good", under_repair: "Needs Repair", damaged: "Damaged" }[condition] || srcIc.condition;
        srcIc.surveyStatus = "surveyed";
        srcIc.surveyedAt = srcIc.surveyedAt || (/* @__PURE__ */ new Date()).toISOString();
        if (!srcIc.eirNumber) srcIc.eirNumber = await nextEirNumber("Depot-In", srcIc.line || "");
        finalizeDepotIn(srcIc);
        scheduleSave();
        supabase.from("public_bookings").update({ eir_number: srcIc.eirNumber }).eq("id", bookingId).then(() => {
        }, () => {
        });
        try {
          await window.bookingDocs.markInterchangeGenerated(surveyId, srcIc.id);
        } catch (e) {
          console.warn("markInterchangeGenerated", e);
        }
      } else {
        await generateInterchangeFromSurvey(bookingId, surveyId);
      }
    }
    toast(reject ? "Container rejected" : "Joint survey recorded \u2014 container is now Depot-In", reject ? "warning" : "success");
    if (typeof renderInwardAwaitingSurvey === "function") renderInwardAwaitingSurvey();
    closeModal();
    renderDepOpsEscalations();
    renderDepOpsAllocationQueue();
    renderDepOpsStorageList();
  } catch (e) {
    toast(e.message || "Could not save joint survey", "error");
  }
}
async function renderDepOpsYardMap() {
  const wrap = document.getElementById("depopsYardMap");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const zones = await window.bookingDocs.listZones();
    if (!zones.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No storage zones configured yet</div></div>';
      return;
    }
    let html = '<div class="ops-notice" style="margin-bottom:14px">\n      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>\n      Stacking heights follow KMA Regulatory Guidelines \xA76.2: 7-high for standard dry empty containers, 6-high for reefers, unless otherwise approved.\n    </div>';
    for (const z of zones) {
      const blocks = await window.bookingDocs.listBlocks(z.id);
      html += '<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span class="panel-title">'.concat(sanitize(z.zone_code || ""), " \xB7 ").concat(sanitize(z.zone_name), '</span><span class="panel-meta">').concat(z.shipping_lines ? sanitize(z.shipping_lines.code) : "Unassigned", '</span></div><div style="padding:12px 14px">');
      if (!blocks.length) {
        html += '<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone</div></div>';
      }
      for (const bl of blocks) {
        const slots = await window.bookingDocs.blockSlots(bl.id);
        const maxStack = bl.max_stack_height || window.bookingDocs.kmaMaxStackHeight(bl.container_type);
        const occCount = slots.filter((s) => s.condition_status !== "empty").length;
        const overLimit = occCount > slots.length;
        html += '<div style="margin-bottom:14px">\n          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">\n            <div style="font-size:12px;font-weight:600">Block '.concat(sanitize(bl.block_code), " \xB7 ").concat(sanitize(bl.container_type), '</div>\n            <div style="font-size:10.5px;color:var(--text-3)">').concat(occCount, "/").concat(slots.length, " slots \xB7 max ").concat(maxStack, '-high</div>\n          </div>\n          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:3px">\n            ').concat(slots.map((s) => '<div title="Slot '.concat(s.slot_number).concat(s.container ? " \u2014 " + sanitize(s.container) : "", " (").concat(conditionStatusLabel(s.condition_status), ')" class="yard-slot yard-slot-').concat(s.condition_status, '"></div>')).join(""), "\n          </div>\n          ").concat(overLimit ? '<div style="font-size:10.5px;color:var(--red,#ef4444);margin-top:4px">\u26A0 Occupancy exceeds declared capacity \u2014 review against KMA \xA76.1 (85% max occupancy)</div>' : "", "\n        </div>");
      }
      html += "</div></div>";
    }
    html += '<div class="panel"><div class="panel-head"><span class="panel-title">Legend</span></div><div style="padding:10px 14px;display:flex;gap:14px;flex-wrap:wrap;font-size:11px">\n      <span><span class="yard-slot yard-slot-empty" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Empty</span>\n      <span><span class="yard-slot yard-slot-food_grade" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Food Grade</span>\n      <span><span class="yard-slot yard-slot-under_repair" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Under Repair</span>\n      <span><span class="yard-slot yard-slot-damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Damaged</span>\n      <span><span class="yard-slot yard-slot-heavily_damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Heavily Damaged</span>\n    </div></div>';
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
let _surveyRegisterData = [];
let _surveyLookupCache = {};
async function renderDepOpsSurveyRegister() {
  const wrap = document.getElementById("depopsSurveyRegister");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    _surveyRegisterData = await window.bookingDocs.listAllSurveys();
    _surveyRegisterData.forEach((s) => {
      _surveyLookupCache[s.id] = s;
    });
    if (!_surveyRegisterData.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No surveys recorded yet</div></div>';
      return;
    }
    wrap.innerHTML = '<div style="overflow-x:auto"><table class="tbl" id="surveyRegisterTable" style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Date</th><th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Type</th>\n        <th style="padding:6px 8px">Consignee</th><th style="padding:6px 8px">Transporter</th><th style="padding:6px 8px">Truck</th>\n        <th style="padding:6px 8px">Clerk</th><th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px">Inspection Report</th><th style="padding:6px 8px">Photos</th>\n      </tr></thead><tbody>'.concat(_surveyRegisterData.map((s) => '<tr style="border-top:1px solid var(--border)">\n        <td style="padding:6px 8px">'.concat(fmtDate(s.surveyed_at), '</td>\n        <td style="padding:6px 8px" class="mono">').concat(sanitize(s.container || "\u2014"), '</td>\n        <td style="padding:6px 8px">').concat(sanitize(s.container_type || "\u2014"), '</td>\n        <td style="padding:6px 8px">').concat(sanitize(s.consignee || "\u2014"), '</td>\n        <td style="padding:6px 8px">').concat(sanitize(s.transporter || "\u2014"), '</td>\n        <td style="padding:6px 8px">').concat(sanitize(s.truck_reg || "\u2014"), '</td>\n        <td style="padding:6px 8px">').concat(sanitize(s.clerk_name || "\u2014"), '</td>\n        <td style="padding:6px 8px">').concat(sbadge(s.condition_status === "heavily_damaged" ? "rejected" : s.condition_status === "food_grade" ? "approved" : "pending"), " ").concat(sanitize(conditionStatusLabel(s.condition_status)), '</td>\n        <td style="padding:6px 8px">').concat(s.interchange_generated_at ? "\u2713 Generated".concat(s.interchange_id ? ' <button class="tbl-btn" onclick="downloadInterchangeSlip(\''.concat(s.interchange_id, '\')">\u2B07</button><button class="tbl-btn" onclick="printInterchangeSlip(\'').concat(s.interchange_id, '\')" title="Print">\u{1F5A8}</button>') : "") : "\u2014", '</td>\n        <td style="padding:6px 8px"><button class="tbl-btn" onclick="downloadInspectionReport(\'').concat(s.id, '\')">\u2B07 Report</button><button class="tbl-btn" onclick="printInspectionReport(\'').concat(s.id, '\')" title="Print">\u{1F5A8}</button></td>\n        <td style="padding:6px 8px">').concat(Array.isArray(s.photos) && s.photos.length ? '<button class="tbl-btn" onclick="viewSurveyPhotos(\''.concat(s.id, "')\">\u{1F4F7} ").concat(s.photos.length, "</button>") : '<span style="color:var(--text-3);font-size:10.5px">\u2014</span>', "</td>\n      </tr>")).join(""), "</tbody></table></div>");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function viewSurveyPhotos(surveyId) {
  const s = _surveyRegisterData.find((x) => x.id === surveyId);
  if (!s) {
    toast("Survey not found", "error");
    return;
  }
  const photos = Array.isArray(s.photos) ? s.photos : [];
  const gallery = photos.length ? '<div class="container-img-grid">'.concat(photos.map((src) => '<div class="container-img-thumb view-only"><img src="'.concat(src, '" onclick="window.open(\'').concat(src, "','_blank')\" /></div>")).join(""), "</div>") : '<div class="empty-state"><div class="empty-state-label">No photos on file for this survey</div></div>';
  openModal("Survey Photos \u2014 ".concat(sanitize(s.container || "Container")), '<div style="margin-bottom:10px;font-size:11px;color:var(--text-3)">Surveyed '.concat(fmtDate(s.surveyed_at), " by ").concat(sanitize(s.clerk_name || "\u2014"), "</div>").concat(gallery));
}
function printSurveyRegister() {
  const table = document.getElementById("surveyRegisterTable");
  if (!table) {
    toast("Nothing to print yet", "error");
    return;
  }
  const w = window.open("", "_blank");
  w.document.write("<html><head><title>Surveyed Containers</title><style>\n    body{font-family:Arial,sans-serif;padding:20px;color:#111}\n    table{width:100%;border-collapse:collapse;font-size:11px}\n    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}\n    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}\n    h2{margin-bottom:4px}\n  </style></head><body>".concat(ghPrintHeaderHtml(), '<h2>Surveyed Containers</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ').concat((/* @__PURE__ */ new Date()).toLocaleString("en-KE"), "</div>").concat(table.outerHTML, "</body></html>"));
  w.document.close();
  w.focus();
  w.print();
}
function downloadSurveyRegisterCSV() {
  if (!_surveyRegisterData.length) {
    toast("Nothing to download yet", "error");
    return;
  }
  const headers = ["Date", "Container", "Type", "ISO Code", "Line ID", "Consignee", "Guarantee/B-L", "Vessel", "Voyage", "Transporter", "Vehicle No", "Trailer No", "Driver", "Driver ID No", "Surveyed By", "Seal", "Gate Pass", "MGW", "TW", "Condition", "Escalated", "Interchange Generated", "Photos"];
  const rows = _surveyRegisterData.map((s) => [
    s.surveyed_at,
    s.container,
    s.container_type,
    s.iso_code,
    s.shipping_line_id,
    s.consignee,
    s.bl_number,
    s.vessel,
    s.voyage,
    s.transporter,
    s.truck_reg,
    s.trailer_number,
    s.driver_name,
    s.driver_id_number,
    s.clerk_name,
    s.seal_number,
    s.gate_pass_number,
    s.mgwt,
    s.tare_weight,
    s.condition_status,
    s.escalated ? "Yes" : "No",
    s.interchange_generated_at ? "Yes" : "No",
    Array.isArray(s.photos) ? s.photos.length : 0
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => '"'.concat(String(v == null ? "" : v).replace(/"/g, '""'), '"')).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "surveyed-containers-".concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), ".csv");
  a.click();
  URL.revokeObjectURL(a.href);
}
let _masterListFilter = "all";
function filterDepOpsMasterList(status, btn) {
  _masterListFilter = status;
  document.querySelectorAll("#depopsPanel-master .filter-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderDepOpsMasterList();
}
const MASTER_STATUS_LABELS = {
  awaiting_survey: "Awaiting Survey",
  escalated: "Escalated (Joint Survey)",
  surveyed: "Surveyed",
  allocated: "In Storage",
  survey_rejected: "Rejected",
  dispatched: "Dispatched"
};
async function renderDepOpsMasterList() {
  const wrap = document.getElementById("depopsMasterList");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    let entries = await window.bookingDocs.masterContainerList();
    if (_masterListFilter !== "all") entries = entries.filter((e) => e.booking.storage_status === _masterListFilter);
    if (!entries.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers match this filter</div></div>';
      return;
    }
    wrap.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Status</th>\n        <th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Location</th><th style="padding:6px 8px">Interchange</th>\n      </tr></thead><tbody>'.concat(entries.map((e) => {
      const b = e.booking, s = e.survey, slot = e.slot;
      const loc = slot ? "".concat(slot.depot_blocks ? sanitize(slot.depot_blocks.block_code) : "", " \xB7 Slot ").concat(slot.slot_number) : b.storage_zone_id ? "Zone assigned" : "\u2014";
      return '<tr style="border-top:1px solid var(--border)">\n          <td style="padding:6px 8px" class="mono">'.concat(sanitize(b.container || "\u2014"), '</td>\n          <td style="padding:6px 8px">').concat(sanitize(b.full_name)).concat(b.company ? " \xB7 " + sanitize(b.company) : "", '</td>\n          <td style="padding:6px 8px">').concat(sbadge(b.storage_status === "escalated" ? "rejected" : b.storage_status === "surveyed" || b.storage_status === "allocated" ? "approved" : "pending"), " ").concat(MASTER_STATUS_LABELS[b.storage_status] || sanitize(b.storage_status || "\u2014"), '</td>\n          <td style="padding:6px 8px">').concat(s ? sanitize(conditionStatusLabel(s.condition_status)) : "\u2014", '</td>\n          <td style="padding:6px 8px">').concat(loc, '</td>\n          <td style="padding:6px 8px">').concat(s && s.interchange_generated_at ? "\u2713".concat(s.interchange_id ? ' <button class="tbl-btn" onclick="downloadInterchangeSlip(\''.concat(s.interchange_id, '\')">\u2B07</button><button class="tbl-btn" onclick="printInterchangeSlip(\'').concat(s.interchange_id, '\')" title="Print">\u{1F5A8}</button>') : "") : "\u2014", "</td>\n        </tr>");
    }).join(""), "</tbody></table></div>");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
let _depOpsRptRows = [];
function depOpsReportsPopulateLines() {
  const sel = document.getElementById("depopsRptLine");
  if (!sel || sel.dataset.populated) return;
  const unmapped = document.createElement("option");
  unmapped.value = "__unmapped__";
  unmapped.textContent = "\u26A0 No Line Assigned";
  sel.appendChild(unmapped);
  state.db.shippingLines.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = "".concat(l.code, " \u2014 ").concat(l.name);
    sel.appendChild(opt);
  });
  sel.dataset.populated = "1";
}
function depOpsReportsReset() {
  ["depopsRptLine", "depopsRptType", "depopsRptStatus", "depopsRptFrom", "depopsRptTo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  renderDepOpsReports();
}
async function renderDepOpsReports() {
  var _a, _b, _c, _d, _e;
  depOpsReportsPopulateLines();
  const lineId = ((_a = document.getElementById("depopsRptLine")) == null ? void 0 : _a.value) || "";
  const type = ((_b = document.getElementById("depopsRptType")) == null ? void 0 : _b.value) || "";
  const status = ((_c = document.getElementById("depopsRptStatus")) == null ? void 0 : _c.value) || "";
  const from = ((_d = document.getElementById("depopsRptFrom")) == null ? void 0 : _d.value) || "";
  const to = ((_e = document.getElementById("depopsRptTo")) == null ? void 0 : _e.value) || "";
  let rows = [
    ...(state.db.interchange || []).map((i) => __spreadProps(__spreadValues({}, i), { _reportSource: "interchange" })),
    ...(state.db.trips || []).map(_tripToInterchangeReportRow)
  ];
  if (lineId === "__unmapped__") rows = rows.filter((i) => !i.line);
  else if (lineId) rows = rows.filter((i) => i.line === lineId);
  if (type) rows = rows.filter((i) => i.type === type);
  if (status) rows = rows.filter((i) => i.status === status);
  if (from) rows = rows.filter((i) => new Date(i.date) >= new Date(from));
  if (to) rows = rows.filter((i) => new Date(i.date) <= /* @__PURE__ */ new Date(to + "T23:59:59"));
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  _depOpsRptRows = rows;
  const body = document.getElementById("depopsRptBody");
  const meta = document.getElementById("depopsRptMeta");
  const exportBtn = document.getElementById("depopsRptExportBtn");
  const unmappedCount = (state.db.interchange || []).filter((i) => !i.line).length + (state.db.trips || []).filter((t) => !t.shippingLine).length;
  if (meta) meta.textContent = "".concat(rows.length, " record").concat(rows.length === 1 ? "" : "s") + (unmappedCount ? " \xB7 ".concat(unmappedCount, ' total with no shipping line \u2014 <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold)">resolve them \u2192</a>') : "");
  if (exportBtn) exportBtn.disabled = !rows.length;
  if (body) {
    body.innerHTML = rows.length ? rows.map((ic) => '<tr>\n      <td class="mono">'.concat(fmtDate(ic.date), '</td>\n      <td class="mono" style="color:var(--gold)">').concat(sanitize(ic.container || "\u2014"), "</td>\n      <td>").concat(sanitize(ic.type || "\u2014"), "</td>\n      <td>").concat(sanitize(ic.ctype || "\u2014"), "</td>\n      <td>").concat(ic.line ? sanitize(lineName(ic.line)) : '<span style="color:var(--danger,#c0392b)">\u26A0 No Line</span>', "</td>\n      <td>").concat(sanitize(ic.condition || "\u2014"), "</td>\n      <td>").concat(ic.truck ? sanitize(truckName(ic.truck)) : "\u2014", "</td>\n      <td>").concat(ic.driver ? sanitize(driverName(ic.driver)) : "\u2014", "</td>\n      <td>").concat(sbadge(ic.status), '</td>\n      <td class="mono">').concat(ic.repairTotal ? fmtKsh(ic.repairTotal) : "\u2014", "</td>\n    </tr>")).join("") : '<tr><td colspan="10" class="empty-td">No interchange records match these filters</td></tr>';
  }
  const byLine = {};
  rows.forEach((ic) => {
    const key = ic.line ? lineName(ic.line) : "\u26A0 No Line Assigned";
    byLine[key] = (byLine[key] || 0) + 1;
  });
  const repairTotal = rows.reduce((s, ic) => s + (ic.repairTotal || 0), 0);
  const summary = document.getElementById("depopsRptSummary");
  if (summary) {
    summary.innerHTML = '<div class="two-col-grid">\n      <div class="report-block">\n        <h3>Summary</h3>\n        '.concat(reportRow("Total Records", rows.length), "\n        ").concat(reportRow("Pending", rows.filter((i) => i.status === "pending").length), "\n        ").concat(reportRow("Approved", rows.filter((i) => i.status === "approved").length), "\n        ").concat(reportRow("Reconciled", rows.filter((i) => i.status === "reconciled").length), "\n        ").concat(reportRow("Repair Costs Total", fmtKsh(repairTotal)), '\n      </div>\n      <div class="report-block">\n        <h3>By Shipping Line</h3>\n        ').concat(Object.entries(byLine).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => reportRow(k, v)).join("") || '<div style="color:var(--text-3);font-size:12px">No data for these filters</div>', "\n      </div>\n    </div>");
  }
}
function downloadDepOpsReportCSV() {
  if (!_depOpsRptRows.length) {
    toast("Nothing to download yet", "error");
    return;
  }
  const headers = ["Date", "Container", "Movement", "Type", "Shipping Line", "Condition", "Truck", "Driver", "Status", "Repair Cost"];
  const rows = _depOpsRptRows.map((ic) => [
    ic.date,
    ic.container,
    ic.type,
    ic.ctype,
    lineName(ic.line),
    ic.condition,
    ic.truck ? truckName(ic.truck) : "",
    ic.driver ? driverName(ic.driver) : "",
    ic.status,
    ic.repairTotal || 0
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => '"'.concat(String(v == null ? "" : v).replace(/"/g, '""'), '"')).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "depops-interchange-report-".concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), ".csv");
  a.click();
  URL.revokeObjectURL(a.href);
}
async function renderDepOpsZoneAdmin() {
  const wrap = document.getElementById("depopsZoneAdmin");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const zones = await window.bookingDocs.listZones();
    const blocksByZone = {};
    for (const z of zones) blocksByZone[z.id] = await window.bookingDocs.listBlocks(z.id);
    wrap.innerHTML = '\n      <div style="margin-bottom:14px"><button class="action-btn" onclick="showAddZoneModal()">+ Create Zone</button></div>\n      '.concat(zones.length ? zones.map((z) => depOpsZoneAdminCard(z, blocksByZone[z.id] || [])).join("") : '<div class="empty-state"><div class="empty-state-label">No zones yet \u2014 create one above</div></div>', "\n    ");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function depOpsZoneAdminCard(z, blocks) {
  const cap = z.capacity_teu || 0, occ = z.occupied_teu || 0;
  const lineLabel = z.shipping_lines ? "".concat(sanitize(z.shipping_lines.code), " \u2014 ").concat(sanitize(z.shipping_lines.name)) : "Unassigned";
  return '<div class="panel" style="margin-bottom:14px">\n    <div class="panel-head">\n      <span class="panel-title">'.concat(sanitize(z.zone_code || ""), " \xB7 ").concat(sanitize(z.zone_name), '</span>\n      <span style="display:flex;gap:8px;align-items:center">\n        <span class="panel-meta">').concat(lineLabel, " \xB7 ").concat(occ, "/").concat(cap, ' TEU</span>\n        <button class="modal-btn ghost" onclick="showEditZoneModal(\'').concat(z.id, '\')">Edit</button>\n      </span>\n    </div>\n    <div style="padding:12px 14px">\n      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">\n        <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase">Blocks</div>\n        <button class="modal-btn ghost" onclick="showAddBlockModal(\'').concat(z.id, "','").concat(sanitize(z.zone_name).replace(/'/g, "\\'"), "')\">+ Add Block</button>\n      </div>\n      ").concat(blocks.length ? blocks.map((bl) => depOpsBlockRow(bl)).join("") : '<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone yet</div></div>', "\n    </div>\n  </div>");
}
function depOpsBlockRow(bl) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border)">\n    <div>\n      <strong style="font-size:12.5px">'.concat(sanitize(bl.block_code), '</strong>\n      <span style="font-size:11px;color:var(--text-3)"> \xB7 ').concat(sanitize(bl.container_type), " \xB7 ").concat(bl.capacity_slots, ' slots</span>\n    </div>\n    <button class="modal-btn ghost" onclick="showBlockSlotsModal(\'').concat(bl.id, "')\">View Slots \u2192</button>\n  </div>");
}
function showAddZoneModal() {
  const lineOptions = state.db.shippingLines.filter((l) => l.active).map((l) => '<option value="'.concat(l.id, '">').concat(sanitize(l.code), " \u2014 ").concat(sanitize(l.name), "</option>")).join("");
  openModal("Create Storage Zone", '\n    <div class="form-row-2">\n      <div class="fg"><label>Zone Code</label><input id="zn_code" placeholder="A" maxlength="8"></div>\n      <div class="fg"><label>Zone Name</label><input id="zn_name" placeholder="Zone A"></div>\n    </div>\n    <div class="fg"><label>Shipping Line</label><select id="zn_line"><option value="">Unassigned / shared</option>'.concat(lineOptions, '</select></div>\n    <div class="fg"><label>Capacity (TEU)</label><input id="zn_cap" type="number" min="0" placeholder="100"></div>\n    <div class="fg"><label>Notes</label><input id="zn_notes" placeholder="Optional"></div>\n    <button class="submit-btn" onclick="saveZone()">Create Zone \u2192</button>\n  '));
}
async function saveZone() {
  const code = document.getElementById("zn_code").value.trim();
  const name = document.getElementById("zn_name").value.trim();
  const lineId = document.getElementById("zn_line").value || null;
  const cap = document.getElementById("zn_cap").value;
  const notes = document.getElementById("zn_notes").value.trim();
  if (!code || !name) {
    toast("Zone code and name are required", "error");
    return;
  }
  try {
    await window.bookingDocs.createZone({ zoneCode: code, zoneName: name, shippingLineId: lineId, capacityTeu: cap, notes });
    toast("Zone ".concat(code, " created"), "success");
    closeModal();
    renderDepOpsZoneAdmin();
    renderDepOpsZones();
  } catch (e) {
    toast(e.message || "Could not create zone", "error");
  }
}
async function showEditZoneModal(zoneId) {
  try {
    const zones = await window.bookingDocs.listZones();
    const z = zones.find((x) => x.id === zoneId);
    if (!z) {
      toast("Zone not found", "error");
      return;
    }
    const lineOptions = state.db.shippingLines.filter((l) => l.active).map(
      (l) => '<option value="'.concat(l.id, '" ').concat(z.shipping_line_id === l.id ? "selected" : "", ">").concat(sanitize(l.code), " \u2014 ").concat(sanitize(l.name), "</option>")
    ).join("");
    openModal("Edit Zone \u2014 ".concat(sanitize(z.zone_code || z.zone_name)), '\n      <div class="form-row-2">\n        <div class="fg"><label>Zone Code</label><input id="zn_edit_code" value="'.concat(sanitize(z.zone_code || ""), '" maxlength="8"></div>\n        <div class="fg"><label>Zone Name</label><input id="zn_edit_name" value="').concat(sanitize(z.zone_name), '"></div>\n      </div>\n      <div class="fg"><label>Shipping Line</label><select id="zn_edit_line"><option value="">Unassigned / shared</option>').concat(lineOptions, '</select></div>\n      <div class="fg"><label>Capacity (TEU)</label><input id="zn_edit_cap" type="number" min="0" value="').concat(z.capacity_teu || 0, '"></div>\n      <button class="submit-btn" onclick="saveZoneEdit(\'').concat(zoneId, "')\">Save Changes \u2192</button>\n    "));
  } catch (e) {
    toast(e.message || "Could not load zone", "error");
  }
}
async function saveZoneEdit(zoneId) {
  const code = document.getElementById("zn_edit_code").value.trim();
  const name = document.getElementById("zn_edit_name").value.trim();
  const lineId = document.getElementById("zn_edit_line").value || null;
  const cap = parseInt(document.getElementById("zn_edit_cap").value, 10) || 0;
  if (!code || !name) {
    toast("Zone code and name are required", "error");
    return;
  }
  try {
    await window.bookingDocs.updateZone(zoneId, { zone_code: code.toUpperCase(), zone_name: name, shipping_line_id: lineId, capacity_teu: cap });
    toast("Zone updated", "success");
    closeModal();
    renderDepOpsZoneAdmin();
    renderDepOpsZones();
  } catch (e) {
    toast(e.message || "Could not update zone", "error");
  }
}
function showAddBlockModal(zoneId, zoneName) {
  const typeOptions = ["Any", ...CONTAINER_TYPE_OPTIONS].map((t) => "<option>".concat(t, "</option>")).join("");
  openModal("Add Block \u2014 ".concat(sanitize(zoneName)), '\n    <div class="form-row-2">\n      <div class="fg"><label>Block Code</label><input id="bl_code" placeholder="1"></div>\n      <div class="fg"><label>Container Type</label><select id="bl_ctype">'.concat(typeOptions, '</select></div>\n    </div>\n    <div class="fg"><label>Capacity (number of slots)</label><input id="bl_cap" type="number" min="1" value="20"></div>\n    <div class="fg"><label>Notes</label><input id="bl_notes" placeholder="Optional"></div>\n    <button class="submit-btn" onclick="saveBlock(\'').concat(zoneId, "')\">Create Block \u2192</button>\n  "));
}
async function saveBlock(zoneId) {
  const code = document.getElementById("bl_code").value.trim();
  const ctype = document.getElementById("bl_ctype").value;
  const cap = document.getElementById("bl_cap").value;
  const notes = document.getElementById("bl_notes").value.trim();
  if (!code) {
    toast("Block code is required", "error");
    return;
  }
  try {
    await window.bookingDocs.createBlock({ zoneId, blockCode: code, containerType: ctype, capacitySlots: cap, notes });
    toast("Block ".concat(code, " created"), "success");
    closeModal();
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || "Could not create block", "error");
  }
}
async function showBlockSlotsModal(blockId) {
  openModal("Block Slots", '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>');
  try {
    const slots = await window.bookingDocs.blockSlots(blockId);
    const grid = slots.map((s) => {
      const linked = !!(s.booking_id || s.trip_id);
      const manual = !linked && !!s.container;
      const occupied = linked || manual;
      const colour = !occupied ? "var(--border-mid)" : s.condition_status === "under_repair" ? "var(--red)" : s.condition_status === "damaged" ? "#b45309" : "var(--green)";
      const label = occupied ? sanitize(s.container || "\u2022") : s.slot_number;
      let clickAction;
      if (manual) clickAction = "releaseSlotFromGrid('".concat(blockId, "',").concat(s.slot_number, ")");
      else if (linked) clickAction = "toast('Linked to a booking/trip \u2014 release it from Outward / Repatriation instead', 'info', 5000)";
      else clickAction = "manualAssignSlot('".concat(blockId, "',").concat(s.slot_number, ")");
      const titleTip = !occupied ? "empty \xB7 click to assign" : manual ? (s.condition_status || "") + " \xB7 click to release" : (s.condition_status || "") + " \xB7 linked booking/trip";
      return '<div class="slot-cell" style="border-color:'.concat(colour, ";color:").concat(occupied ? "#fff" : "var(--text-3)", ";background:").concat(occupied ? colour : "transparent", '" title="Slot ').concat(s.slot_number, " \xB7 ").concat(titleTip, '" onclick="').concat(clickAction, '">').concat(label, "</div>");
    }).join("");
    openModal("Block Slots", '\n      <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">Click an empty slot to manually place a container. Slots linked to a booking/trip release automatically through Outward / Repatriation.</div>\n      <div class="slot-grid">'.concat(grid || '<div class="empty-state"><div class="empty-state-label">No slots</div></div>', "</div>\n    "));
  } catch (e) {
    openModal("Block Slots", '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>"));
  }
}
function manualAssignSlot(blockId, slotNumber) {
  openModal("Assign Slot ".concat(slotNumber), '\n    <div class="fg"><label>Container No.</label><input id="ms_container" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>\n    <div class="fg"><label>Condition</label><select id="ms_condition"><option value="food_grade">Food Grade</option><option value="under_repair">Under Repair</option><option value="damaged">Damaged</option></select></div>\n    <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Use this for containers already on-site with no matching booking \u2014 e.g. after a physical stock-take. Containers coming through Public Bookings should go through Survey/Allocation above instead, so their paperwork stays linked.</div>\n    <button class="submit-btn" onclick="saveManualAssignSlot(\''.concat(blockId, "',").concat(slotNumber, ')">Assign \u2192</button>\n  '));
}
async function saveManualAssignSlot(blockId, slotNumber) {
  const container = document.getElementById("ms_container").value.trim().toUpperCase();
  const condition = document.getElementById("ms_condition").value;
  const containerIssue = containerFormatIssue(container);
  if (containerIssue) {
    toast("Container number: ".concat(containerIssue), "error");
    return;
  }
  try {
    await window.bookingDocs.occupySlot({ blockId, slotNumber, container, conditionStatus: condition });
    toast("".concat(container, " placed in slot ").concat(slotNumber), "success");
    showBlockSlotsModal(blockId);
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || "Could not assign slot", "error");
  }
}
async function releaseSlotFromGrid(blockId, slotNumber) {
  if (!confirm("Release slot ".concat(slotNumber, "?"))) return;
  try {
    await window.bookingDocs.releaseSlotByNumber(blockId, slotNumber);
    toast("Slot released", "success");
    showBlockSlotsModal(blockId);
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || "Could not release slot", "error");
  }
}
function filterDepOpsOutward(status, btn) {
  _depOpsOutwardFilter = status;
  document.querySelectorAll("#depopsPanel-outward .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderDepOpsOutward();
}
async function renderDepOpsOutward() {
  await renderDepOpsEligible();
  await renderDepOpsOutwardTrips();
  const container = document.getElementById("depopsOutwardQueue");
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const docs = await window.bookingDocs.outwardReviewQueue(_depOpsOutwardFilter);
    if (!docs.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-label">No '.concat(_depOpsOutwardFilter.replace(/_/g, " "), " release orders</div></div>");
      return;
    }
    container.innerHTML = docs.map((d) => depOpsDocCard(d, "outward")).join("");
  } catch (e) {
    container.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
async function depOpsRepatriationEligibleBookings() {
  const { data, error } = await supabase.from("public_bookings").select("*").eq("status", "imported").eq("storage_status", "allocated").order("created_at", { ascending: true });
  if (error) throw new Error(error.message || "Could not load bookings");
  const outwardBookingIds = new Set(
    state.db.trips.filter((t) => t.workType === "Depot \u2192 Port" && t.bookingId).map((t) => t.bookingId)
  );
  return (data || []).filter((b) => !outwardBookingIds.has(b.id));
}
async function renderDepOpsEligible() {
  const wrap = document.getElementById("depopsEligibleList");
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const [bookings, zones] = await Promise.all([
      depOpsRepatriationEligibleBookings(),
      window.bookingDocs.storageAvailability()
    ]);
    if (!bookings.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No depot-held containers awaiting repatriation</div></div>';
      return;
    }
    const zoneMap = {};
    zones.forEach((z) => {
      zoneMap[z.id] = z.zone_name;
    });
    wrap.innerHTML = bookings.map((b) => depOpsEligibleCard(b, zoneMap)).join("");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function depOpsEligibleCard(b, zoneMap) {
  const zoneName = b.storage_zone_id && zoneMap[b.storage_zone_id] || "Unknown zone";
  const portOptions = window.bookingDocs.PORT_LOCATIONS.map((p) => '<option value="'.concat(sanitize(p), '">').concat(sanitize(p), "</option>")).join("");
  const outwardTypeOptions = OUTWARD_TYPES.map((w) => '<option value="'.concat(sanitize(w), '">').concat(sanitize(w), "</option>")).join("");
  return '<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">\n    <div><strong>'.concat(sanitize(b.container) || "No container on file", '</strong> <span style="font-size:11px;color:var(--text-3)">\xB7 ').concat(sanitize(b.full_name)).concat(b.company ? " \xB7 " + sanitize(b.company) : "", '</span></div>\n    <div style="font-size:10.5px;color:var(--text-3);margin-top:2px">Booking ').concat(b.id.slice(0, 8), " \xB7 Currently in ").concat(sanitize(zoneName), '</div>\n    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:end">\n      <input type="number" id="depopsRelTeu-').concat(b.id, '" min="1" value="1" title="TEU to release from ').concat(sanitize(zoneName), ' once this container departs" style="width:64px;padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">\n      <select id="depopsDest-').concat(b.id, '" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">').concat(portOptions, '</select>\n      <select id="depopsOutwardType-').concat(b.id, '" title="Outward type" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="">Outward type\u2026</option>').concat(outwardTypeOptions, '</select>\n      <button class="modal-btn primary" onclick="depOpsCreateOutwardFromBooking(\'').concat(b.id, "')\">Create Outward Trip \u2192</button>\n    </div>\n  </div>");
}
async function depOpsCreateOutwardFromBooking(bookingId) {
  const teuEl = document.getElementById("depopsRelTeu-" + bookingId);
  const destEl = document.getElementById("depopsDest-" + bookingId);
  const outwardTypeEl = document.getElementById("depopsOutwardType-" + bookingId);
  const teu = teuEl ? parseInt(teuEl.value, 10) : 0;
  const dest = destEl ? destEl.value : "";
  const outwardType = outwardTypeEl ? outwardTypeEl.value : "";
  if (!teu || teu < 1) {
    toast("Enter a valid TEU amount", "error");
    return;
  }
  if (!OUTWARD_TYPES.includes(outwardType)) {
    toast("Select an outward type \u2014 Repatriation to Port, Shippers/Export, or Sale units", "error");
    return;
  }
  const { data: booking, error } = await supabase.from("public_bookings").select("*").eq("id", bookingId).single();
  if (error || !booking) {
    toast("Booking not found", "error");
    return;
  }
  if (!booking.storage_zone_id) {
    toast("This booking has no recorded storage zone", "error");
    return;
  }
  const container = (booking.container || "").trim().toUpperCase() || "REPAT-".concat(booking.id.slice(0, 8));
  const dupTrip = findLiveTripByContainer(container);
  if (dupTrip) {
    toast("".concat(container, " is already on an active trip (").concat(dupTrip.origin, " \u2192 ").concat(dupTrip.dest, ")"), "error");
    return;
  }
  const trip = {
    id: uid("TRIP"),
    container,
    ctype: booking.cargo_type || "20ft Dry",
    workType: "Depot \u2192 Port",
    outwardType,
    origin: "Depot",
    dest,
    shippingLine: resolveBookingShippingLineId(booking),
    status: "active",
    startTime: (/* @__PURE__ */ new Date()).toISOString(),
    eta: new Date(Date.now() + 4 * 36e5).toISOString(),
    distance: 0,
    priority: "Normal",
    notes: "Repatriation for booking #".concat(booking.id),
    ref: "REPAT-".concat(booking.id.slice(0, 8)),
    truckId: null,
    driverId: null,
    containerImages: [],
    bookingId: booking.id,
    storageZoneId: booking.storage_zone_id,
    storageTeu: teu,
    storageReleased: false,
    _dirty: true
  };
  state.db.trips.push(trip);
  scheduleSave();
  toast("Outward trip created \u2014 upload the release order next", "success");
  renderDepOpsOutward();
  renderDepOpsStorageList();
  refreshAwaitingDispatchUI();
}
async function depOpsCreateManualOutward() {
  const containerEl = document.getElementById("depopsManualContainer");
  const zoneEl = document.getElementById("depopsManualZone");
  const teuEl = document.getElementById("depopsManualTeu");
  const destEl = document.getElementById("depopsManualDest");
  const lineEl = document.getElementById("depopsManualLine");
  const outwardTypeEl = document.getElementById("depopsManualOutwardType");
  const container = (containerEl.value || "").trim().toUpperCase();
  const zoneId = zoneEl.value;
  const teu = parseInt(teuEl.value, 10);
  const dest = destEl.value;
  const lineId = lineEl ? lineEl.value : "";
  const outwardType = outwardTypeEl ? outwardTypeEl.value : "";
  const containerIssue = containerFormatIssue(container);
  if (containerIssue) {
    toast("Container number: ".concat(containerIssue), "error");
    return;
  }
  if (!zoneId) {
    toast("Select a zone", "error");
    return;
  }
  if (!teu || teu < 1) {
    toast("Enter a valid TEU amount", "error");
    return;
  }
  if (!lineId) {
    toast("Select the shipping line \u2014 without it this container won\u2019t show up under any line\u2019s account", "error");
    return;
  }
  if (!OUTWARD_TYPES.includes(outwardType)) {
    toast("Select an outward type \u2014 Repatriation to Port, Shippers/Export, or Sale units", "error");
    return;
  }
  const dupTrip = findLiveTripByContainer(container);
  if (dupTrip) {
    toast("".concat(container, " is already on an active trip (").concat(dupTrip.origin, " \u2192 ").concat(dupTrip.dest, ")"), "error");
    return;
  }
  const trip = {
    id: uid("TRIP"),
    container,
    ctype: "20ft Dry",
    workType: "Depot \u2192 Port",
    outwardType,
    origin: "Depot",
    dest,
    shippingLine: lineId,
    status: "active",
    startTime: (/* @__PURE__ */ new Date()).toISOString(),
    eta: new Date(Date.now() + 4 * 36e5).toISOString(),
    distance: 0,
    priority: "Normal",
    notes: "Manually added repatriation container (no originating booking)",
    ref: "REPAT-".concat(container),
    truckId: null,
    driverId: null,
    containerImages: [],
    bookingId: null,
    storageZoneId: zoneId,
    storageTeu: teu,
    storageReleased: false,
    _dirty: true
  };
  state.db.trips.push(trip);
  scheduleSave();
  toast("Outward trip created \u2014 upload the release order next", "success");
  containerEl.value = "";
  if (lineEl) lineEl.value = "";
  renderDepOpsOutward();
  refreshAwaitingDispatchUI();
}
async function renderDepOpsOutwardTrips() {
  const wrap = document.getElementById("depopsOutwardTripsList");
  const formWrap = document.getElementById("depopsManualForm");
  if (formWrap && !formWrap.dataset.loaded) {
    try {
      const zones = await window.bookingDocs.storageAvailability();
      const zoneOptions = zones.map((z) => '<option value="'.concat(z.id, '">').concat(sanitize(z.zone_name), "</option>")).join("");
      const portOptions = window.bookingDocs.PORT_LOCATIONS.map((p) => '<option value="'.concat(sanitize(p), '">').concat(sanitize(p), "</option>")).join("");
      const lineOptions = state.db.shippingLines.filter((l) => l.active).map((l) => '<option value="'.concat(l.id, '">').concat(sanitize(l.code), " \u2014 ").concat(sanitize(l.name), "</option>")).join("");
      const outwardTypeOptions = OUTWARD_TYPES.map((w) => '<option value="'.concat(sanitize(w), '">').concat(sanitize(w), "</option>")).join("");
      formWrap.innerHTML = '<div class="panel" style="margin-bottom:14px">\n        <div class="panel-head"><span class="panel-title">Add Outward Container Manually</span></div>\n        <div style="padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;align-items:end">\n          <div class="fg" style="margin:0"><label>Container No.</label><input id="depopsManualContainer" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>\n          <div class="fg" style="margin:0"><label>Zone</label><select id="depopsManualZone"><option value="">Select\u2026</option>'.concat(zoneOptions, '</select></div>\n          <div class="fg" style="margin:0"><label>TEU</label><input type="number" id="depopsManualTeu" min="1" value="1"></div>\n          <div class="fg" style="margin:0"><label>Destination</label><select id="depopsManualDest">').concat(portOptions, '</select></div>\n          <div class="fg" style="margin:0"><label>Shipping Line</label><select id="depopsManualLine"><option value="">Select\u2026</option>').concat(lineOptions, '</select></div>\n          <div class="fg" style="margin:0"><label>Outward Type</label><select id="depopsManualOutwardType"><option value="">Select\u2026</option>').concat(outwardTypeOptions, '</select></div>\n          <button class="modal-btn primary" onclick="depOpsCreateManualOutward()">Create \u2192</button>\n        </div>\n      </div>');
      formWrap.dataset.loaded = "1";
    } catch (e) {
    }
  }
  if (!wrap) return;
  const trips = state.db.trips.filter((t) => t.workType === "Depot \u2192 Port");
  if (!trips.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No outward/repatriation trips yet</div></div>';
    return;
  }
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>';
  try {
    const docsByTrip = await window.bookingDocs.documentsForTrips(trips.map((t) => t.id));
    wrap.innerHTML = trips.map((t) => depOpsOutwardTripCard(t, docsByTrip[t.id] || [])).join("");
  } catch (e) {
    wrap.innerHTML = '<div class="empty-state">Error: '.concat(sanitize(e.message || ""), "</div>");
  }
}
function depOpsOutwardTripCard(t, docs) {
  const doc = docs.find((d) => d.doc_type === "release_order");
  const docBlock = doc ? docStatusBadge(doc.status) : '<button class="modal-btn primary" onclick="depOpsUploadReleaseOrder(\''.concat(t.id, "','").concat(sanitize(t.container), "')\">Upload Release Order</button>");
  const storageBlock = t.storageZoneId ? t.storageReleased ? '<span class="sbadge s-approved">storage released</span>' : '<span class="sbadge s-pending">'.concat(t.storageTeu || "?", " TEU pending release</span>") : "";
  const outwardTypeBlock = t.outwardType ? '<span style="font-size:10px;padding:2px 8px;border-radius:20px;border:1px solid var(--gold-border);color:var(--gold);background:var(--gold-dim)">'.concat(sanitize(t.outwardType), "</span>") : "";
  return '<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong class="mono" style="color:var(--gold)">'.concat(sanitize(t.container), '</strong>\n        <div style="font-size:11px;color:var(--text-3)">').concat(sanitize(t.origin), " \u2192 ").concat(sanitize(t.dest), '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(sanitize(t.ref), '</div>\n      </div>\n      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">\n        ').concat(sbadge(t.status), "\n        ").concat(outwardTypeBlock, "\n        ").concat(storageBlock, '\n      </div>\n    </div>\n    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">\n      ').concat(docBlock, '\n      <button class="modal-btn ghost" onclick="showTripDetail(\'').concat(t.id, "')\">View / Manage Trip</button>\n    </div>\n  </div>");
}
function depOpsUploadReleaseOrder(tripId, container) {
  openModal("Upload Release Order", '\n    <div class="fg"><label>Container</label><input value="'.concat(sanitize(container), '" disabled></div>\n    <div class="fg"><label>Release Order File</label><input type="file" id="depopsReleaseFile" accept=".pdf,.jpg,.jpeg,.png"></div>\n    <div id="depopsUploadMsg" style="font-size:12px;min-height:16px;margin-bottom:8px"></div>\n    <button class="submit-btn" onclick="depOpsConfirmUploadReleaseOrder(\'').concat(tripId, "','").concat(sanitize(container).replace(/'/g, "\\'"), "')\">Upload</button>\n  "));
}
async function depOpsConfirmUploadReleaseOrder(tripId, container) {
  const fileInput = document.getElementById("depopsReleaseFile");
  const msg = document.getElementById("depopsUploadMsg");
  const file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) {
    msg.textContent = "Select a file first.";
    msg.style.color = "var(--red)";
    return;
  }
  msg.textContent = "Uploading\u2026";
  msg.style.color = "var(--text-3)";
  try {
    await window.bookingDocs.uploadTripDocument({ tripId, docType: "release_order", containerNo: container, file });
    msg.textContent = "\u2713 Uploaded";
    msg.style.color = "var(--green)";
    setTimeout(() => {
      closeModal();
      renderDepOpsOutward();
    }, 600);
  } catch (e) {
    msg.textContent = e.message || "Upload failed";
    msg.style.color = "var(--red)";
  }
}
function depOpsDocCard(doc, kind) {
  const parent = kind === "inbound" ? doc.public_bookings || {} : doc.trips || {};
  const ref = kind === "inbound" ? parent.full_name ? parent.full_name : (doc.booking_id || "").slice(0, 8) : parent.container || (doc.trip_id || "").slice(0, 8);
  const who = kind === "inbound" ? [parent.company, parent.service_type].filter(Boolean).join(" \xB7 ") || "Public booking" : "".concat(sanitize(parent.origin || ""), " \u2192 ").concat(sanitize(parent.destination || ""));
  const label = DEPOPS_DOC_LABELS[doc.doc_type] || doc.doc_type;
  const status = doc.status || "pending_review";
  const isPending = status === "pending_review";
  const actions = isPending ? '<button class="modal-btn ghost" onclick="depOpsViewDoc(\''.concat(doc.file_path.replace(/'/g, "\\'"), '\')">View / Download</button>\n       <button class="modal-btn primary" onclick="depOpsVerifyDoc(\'').concat(doc.id, "','").concat(kind, '\')">Verify</button>\n       <button class="modal-btn danger" onclick="depOpsRejectDoc(\'').concat(doc.id, "','").concat(kind, "')\">Reject\u2026</button>") : '<button class="modal-btn ghost" onclick="depOpsViewDoc(\''.concat(doc.file_path.replace(/'/g, "\\'"), "')\">View / Download</button>");
  return '<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)" id="depopsDoc-'.concat(doc.id, '">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong>').concat(sanitize(String(ref)), '</strong>\n        <div style="font-size:11px;color:var(--text-3)">').concat(who, '</div>\n        <div style="font-size:10px;color:var(--text-3)">').concat(doc.container_no ? "Container: " + sanitize(doc.container_no) + " \xB7 " : "", "Uploaded ").concat(depOpsFmtDT(doc.uploaded_at), '</div>\n      </div>\n      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">\n        <span style="font-size:10.5px;padding:3px 9px;border-radius:20px;background:rgba(201,162,39,0.12);color:var(--gold);border:1px solid var(--gold-border);white-space:nowrap">').concat(sanitize(label), "</span>\n        ").concat(!isPending ? docStatusBadge(status) : "", '\n      </div>\n    </div>\n    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">').concat(actions, "</div>\n    ").concat(!isPending && doc.review_notes ? '<div style="margin-top:8px;font-size:11px;color:var(--text-3)">'.concat(depOpsFmtDT(doc.reviewed_at), " \u2014 ").concat(sanitize(doc.review_notes), "</div>") : "", "\n  </div>");
}
function depOpsViewDoc(filePath) {
  window.bookingDocs.getDownloadUrl(filePath, 300).then((url) => window.open(url, "_blank", "noopener")).catch((err) => toast(err.message || "Could not open document", "error"));
}
async function depOpsVerifyDoc(docId, kind) {
  try {
    await window.bookingDocs.verifyDocument(docId, null);
    toast("Document verified", "success");
    if (kind === "inbound") renderDepOpsInbound();
    else renderDepOpsOutward();
    updateDepOpsBadge();
  } catch (e) {
    toast(e.message || "Could not verify document", "error");
  }
}
function depOpsRejectDoc(docId, kind) {
  openModal("Reject Document", '\n    <div class="fg"><label>Reason (required \u2014 shown to the uploader)</label>\n    <textarea id="depopsRejectNote" rows="3" placeholder="e.g. Scan is illegible, wrong container number\u2026"></textarea></div>\n    <button class="submit-btn" onclick="depOpsConfirmReject(\''.concat(docId, "','").concat(kind, "')\">Confirm Reject</button>\n  "));
}
async function depOpsConfirmReject(docId, kind) {
  const noteEl = document.getElementById("depopsRejectNote");
  const note = (noteEl && noteEl.value || "").trim();
  if (!note) {
    toast("A reason is required", "error");
    return;
  }
  try {
    await window.bookingDocs.rejectDocument(docId, note);
    closeModal();
    toast("Document rejected", "warning");
    if (kind === "inbound") renderDepOpsInbound();
    else renderDepOpsOutward();
    updateDepOpsBadge();
  } catch (e) {
    toast(e.message || "Could not reject document", "error");
  }
}
async function syncStorageToInterchange(bookingId, zoneId, blockId, slotNumber) {
  try {
    let zoneName = "", blockCode = "";
    const zones = await window.bookingDocs.listZones();
    const zone = zones.find((z) => z.id === zoneId);
    zoneName = zone ? zone.zone_code || zone.zone_name || "" : "";
    if (blockId) {
      const blocks = await window.bookingDocs.listBlocks(zoneId);
      const blk = blocks.find((x) => x.id === blockId);
      blockCode = blk ? blk.block_code || "" : "";
    }
    const patch = { storage_zone: zoneName || null, storage_block: blockCode || null, storage_slot: slotNumber ? String(slotNumber) : null };
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    const icId = survey && survey.interchange_id;
    let q = supabase.from("interchange").update(patch);
    q = icId ? q.eq("id", icId) : q.eq("booking_id", bookingId);
    const { error } = await q;
    if (error) {
      console.warn("Could not copy storage location to the EIR (run supabase_clerk_tools_migration.sql):", error.message);
      return;
    }
    (state.db.interchange || []).filter((i) => icId && i.id === icId || i.bookingId === bookingId).forEach((i) => {
      i.storageZone = zoneName;
      i.storageBlock = blockCode;
      i.storageSlot = slotNumber ? String(slotNumber) : "";
    });
  } catch (e) {
    console.warn("syncStorageToInterchange failed:", e);
  }
}
