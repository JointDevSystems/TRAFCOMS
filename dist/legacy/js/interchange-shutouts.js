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
function lineToRow(l) {
  return { id: l.id, code: l.code, name: l.name, contact: l.contact, rate_20ft: l.rate20, rate_40ft: l.rate40, rate_hc: l.rateHC, currency: l.currency || "USD", active: l.active, rates: l.rates && typeof l.rates === "object" ? l.rates : null };
}
function lineFromRow(r) {
  return { id: r.id, code: r.code, name: r.name, contact: r.contact, rate20: r.rate_20ft, rate40: r.rate_40ft, rateHC: r.rate_hc, currency: r.currency || (r.code === "PIL" ? "KES" : "USD"), active: r.active, rates: r.rates && typeof r.rates === "object" ? r.rates : null };
}
function lineCurrencySymbol(l) {
  return (l.currency || "USD") === "KES" ? "KSh" : l.currency === "USD" ? "US$" : l.currency || "US$";
}
function vlmFromRow(r) {
  return { id: r.id, pattern: r.pattern, matchType: r.match_type, lineId: r.line_id, priority: r.priority, source: r.source };
}
function shutoutToRow(s) {
  return { id: s.id, container: s.container, vessel: s.vessel, voyage: s.voyage, line_id: s.line || null, date: s.date, status: s.status, reason: s.reason, truck_id: s.truckId || null, driver_id: s.driverId || null, notes: s.notes, img: s.img || "" };
}
function shutoutFromRow(r) {
  return { id: r.id, container: r.container, vessel: r.vessel, voyage: r.voyage, line: r.line_id, date: r.date, status: r.status, reason: r.reason, truckId: r.truck_id, driverId: r.driver_id, notes: r.notes, img: r.img || "" };
}
function gxIcCustomOut(i) {
  try {
    return window.GargoForms && GargoForms.icOut ? GargoForms.icOut(i && i.custom) : {};
  } catch (e) {
    return {};
  }
}
function gxIcCustomIn(r) {
  try {
    return window.GargoForms && GargoForms.icIn ? GargoForms.icIn(r) : {};
  } catch (e) {
    return {};
  }
}
function icToRow(i) {
  return __spreadValues({ id: i.id, container: i.container, line_id: i.line || null, date: i.date, type: i.type, truck_id: i.truck || null, driver_id: i.driver || null, condition: i.condition, notes: i.notes, status: i.status, img: i.img || "", eir_number: i.eirNumber || null, vessel: i.vessel || null, voyage: i.voyage || null, bl_number: i.blNumber || null, ctype: i.ctype || null, repairs: JSON.stringify(i.repairs || []), repair_total: i.repairTotal || 0, survey_id: i.surveyId || null, booking_id: i.bookingId || null, truck_reg_text: i.truckRegText || null, driver_name_text: i.driverNameText || null, needs_survey: !!i.needsSurvey, survey_status: i.surveyStatus || null, surveyed_at: i.surveyedAt || null, surveyed_by: i.surveyedBy || null, delivering_party: i.deliveringParty || null, guarantee_no: i.guaranteeNo || null, cargo_status: i.cargoStatus || null, date_out: i.dateOut || null, receiving_party: i.receivingParty || null, release_order_no: i.releaseOrderNo || null, flagged_for_review: !!i.flaggedForReview, flag_reasons: JSON.stringify(i.flagReasons || []), duplicate_of_id: i.duplicateOfId || null, import_batch_id: i.importBatchId || null, transporter: i.transporter || null, driver_id_number: i.driverIdNumber || null, photos: JSON.stringify(i.photos || []), iso_code: i.isoCode || null, trailer_no: i.trailerNo || null, gross_weight: i.grossWeight === "" || i.grossWeight == null ? null : Number(i.grossWeight), manufacture_date: i.manufactureDate || null, clerk_name: i.clerkName || null, storage_zone: i.storageZone || null, storage_block: i.storageBlock || null, storage_slot: i.storageSlot || null }, gxIcCustomOut(i));
}
function icFromRow(r) {
  let repairs = [];
  try {
    repairs = r.repairs ? typeof r.repairs === "string" ? JSON.parse(r.repairs) : r.repairs : [];
  } catch (e) {
    repairs = [];
  }
  let flagReasons = [];
  try {
    flagReasons = r.flag_reasons ? typeof r.flag_reasons === "string" ? JSON.parse(r.flag_reasons) : r.flag_reasons : [];
  } catch (e) {
    flagReasons = [];
  }
  let photos = [];
  try {
    photos = r.photos ? typeof r.photos === "string" ? JSON.parse(r.photos) : r.photos : [];
  } catch (e) {
    photos = [];
  }
  return { gateInAt: r.date, depotInAt: r.type === "Depot-In" && r.survey_status && r.survey_status !== "awaiting_survey" ? r.surveyed_at || null : null, id: r.id, container: r.container, line: r.line_id, date: r.date, type: r.type, truck: r.truck_id, driver: r.driver_id, condition: r.condition, notes: r.notes, status: r.status, img: r.img || "", eirNumber: r.eir_number || "", vessel: r.vessel || "", voyage: r.voyage || "", blNumber: r.bl_number || "", ctype: r.ctype || "", repairs, repairTotal: r.repair_total || 0, surveyId: r.survey_id || null, bookingId: r.booking_id || null, truckRegText: r.truck_reg_text || "", driverNameText: r.driver_name_text || "", needsSurvey: !!r.needs_survey, surveyStatus: r.survey_status || null, surveyedAt: r.surveyed_at || null, surveyedBy: r.surveyed_by || null, deliveringParty: r.delivering_party || "", guaranteeNo: r.guarantee_no || "", cargoStatus: r.cargo_status || "", dateOut: r.date_out || null, receivingParty: r.receiving_party || "", releaseOrderNo: r.release_order_no || "", flaggedForReview: !!r.flagged_for_review, flagReasons, duplicateOfId: r.duplicate_of_id || null, importBatchId: r.import_batch_id || null, transporter: r.transporter || "", driverIdNumber: r.driver_id_number || "", photos, isoCode: r.iso_code || "", trailerNo: r.trailer_no || "", grossWeight: r.gross_weight == null ? "" : r.gross_weight, manufactureDate: r.manufacture_date || "", clerkName: r.clerk_name || "", storageZone: r.storage_zone || "", storageBlock: r.storage_block || "", storageSlot: r.storage_slot || "", custom: gxIcCustomIn(r) };
}
function normContainerKey(c) {
  return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function localContainerConflict(container, ignoreIcId) {
  const key = normContainerKey(container);
  if (!key) return null;
  const same = (state.db.interchange || []).filter((i) => normContainerKey(i.container) === key);
  const live = same.find((i) => i.id !== ignoreIcId && (i.type === "Gate-In" || i.type === "Depot-In") && !i.dateOut && !same.some((o) => (o.type === "Gate-Out" || o.type === "Depot-Out") && new Date(o.date) >= new Date(i.date)));
  return live ? "".concat(key, " is already in the yard (received ").concat(fmtDate(live.date), "). A container cannot be entered again until it has been gated out.") : null;
}
async function checkContainerAvailable(container, opts) {
  opts = opts || {};
  const cont = String(container || "").trim().toUpperCase();
  if (!cont) return null;
  const local = localContainerConflict(cont, opts.icId);
  if (local) return local;
  try {
    const { data, error } = await supabase.rpc("check_container_available", { p_container: cont, p_booking: opts.bookingId || null, p_interchange: opts.icId || null });
    if (error) {
      console.warn("check_container_available failed:", error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn("check_container_available error:", e);
    return null;
  }
}
async function persistNewInterchange(rec) {
  state.db.interchange.push(rec);
  const res = await saveNowAwaited();
  const fail = (res && res.failures || []).find((x) => x && x.table === "interchange");
  if (fail) {
    const idx = state.db.interchange.indexOf(rec);
    if (idx > -1) state.db.interchange.splice(idx, 1);
    return { ok: false, message: fail.error && fail.error.message || "The server refused the record" };
  }
  return { ok: true };
}
function icOutIndex() {
  const idx = /* @__PURE__ */ new Map();
  (state.db.interchange || []).forEach((o) => {
    if (!/Out$/.test(o.type || "")) return;
    const k = normContainerKey(o.container), t = new Date(o.date).getTime();
    if (!idx.has(k) || t > idx.get(k)) idx.set(k, t);
  });
  return idx;
}
function icExitDate(ic, idx) {
  if (ic.dateOut) return ic.dateOut;
  const last = (idx || icOutIndex()).get(normContainerKey(ic.container));
  return last !== void 0 && last >= new Date(ic.date).getTime() ? new Date(last).toISOString() : null;
}
function icInYard(ic, idx) {
  return (ic.type === "Gate-In" || ic.type === "Depot-In") && !icExitDate(ic, idx);
}
function icAwaitingSurvey(ic) {
  return (ic.type === "Gate-In" || ic.type === "Depot-In") && (ic.surveyStatus === "awaiting_survey" || ic.surveyStatus === "escalated");
}
function issuedInterchanges() {
  return (state.db.interchange || []).filter((i) => !icAwaitingSurvey(i));
}
function normVessel(v) {
  return (v || "").trim().toUpperCase().replace(/\s+/g, " ");
}
function resolveLineIdFromVessel(vesselText) {
  const v = normVessel(vesselText);
  if (!v) return null;
  const map = state.db.vesselLineMap || [];
  for (const m of map) {
    const p = normVessel(m.pattern);
    if (!p) continue;
    if (m.matchType === "prefix" && v.startsWith(p)) return m.lineId;
    if (m.matchType === "contains" && v.includes(p)) return m.lineId;
    if (m.matchType === "exact" && v === p) return m.lineId;
  }
  return null;
}
function findDuplicateInterchange(container, type, dateVal, excludeId) {
  const cont = (container || "").trim().toUpperCase();
  if (!cont || !type) return null;
  const day = new Date(dateVal || Date.now()).toDateString();
  return state.db.interchange.find(
    (i) => i.id !== excludeId && (i.container || "").toUpperCase() === cont && i.type === type && new Date(i.date).toDateString() === day
  ) || null;
}
function findLineByCode(code, excludeId) {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  return state.db.shippingLines.find((l) => l.id !== excludeId && (l.code || "").toUpperCase() === c) || null;
}
let _pendingShutoutImg = { sh: "", dp: "" };
function captureShutoutPhoto(input, boxId, key) {
  const file = input.files[0];
  if (!file) return;
  const problem = gxPhotoProblem(file);
  if (problem) {
    toast("Image " + problem, "error");
    input.value = "";
    return;
  }
  const reader = gxImageReader();
  reader.onload = () => {
    _pendingShutoutImg[key] = reader.result;
    const box = document.getElementById(boxId);
    if (box) box.innerHTML = '<img src="'.concat(reader.result, '" style="width:100%;height:100%;object-fit:cover;border-radius:6px" />');
  };
  reader.readAsDataURL(file);
}
function shutoutPhotoPicker(key) {
  const boxId = "sh_photo_box_".concat(key);
  const inputId = "sh_photo_input_".concat(key);
  return '<div class="fg"><label>Photo <span class="label-optional">(optional)</span></label>\n    <div id="'.concat(boxId, '" class="ic-card-img-placeholder" style="width:100%;height:90px;cursor:pointer" onclick="document.getElementById(\'').concat(inputId, '\').click()" title="Tap to add a photo">\n      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\n    </div>\n    <input type="file" id="').concat(inputId, '" accept="image/*" capture="environment" style="display:none" onchange="captureShutoutPhoto(this,\'').concat(boxId, "','").concat(key, "')\"/>\n  </div>");
}
function dpRenderShutoutTab(el, driver) {
  _pendingShutoutImg.dp = "";
  const mine = state.db.shutouts.filter((s) => s.driverId === driver.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = '\n    <div class="form-card" style="margin-bottom:14px">\n      <div class="form-card-head">Report Shutout</div>\n      <div class="form-card-body">\n        <div class="fg"><label>Container No.</label><input id="dp_sh_cont" list="containerHistory" placeholder="MSCU1234566" oninput="markContainerValidity(this)"/></div>\n        <div class="form-row-2">\n          <div class="fg"><label>Vessel</label><input id="dp_sh_vessel" placeholder="MSC VESSEL NAME"/></div>\n          <div class="fg"><label>Voyage No.</label><input id="dp_sh_voyage" placeholder="VA-001"/></div>\n        </div>\n        <div class="fg"><label>Shipping Line</label><select id="dp_sh_line">'.concat(state.db.shippingLines.map((l) => '<option value="'.concat(l.id, '">').concat(l.code, "</option>")).join(""), '</select></div>\n        <div class="fg"><label>Reason</label><input id="dp_sh_reason" placeholder="Why was this shutout?"/></div>\n        <div class="fg"><label>Notes</label><textarea id="dp_sh_notes" rows="2"></textarea></div>\n        ').concat(shutoutPhotoPicker("dp"), '\n        <button class="submit-btn" onclick="dpSaveShutout(\'').concat(driver.id, '\')">Flag Shutout \u2192</button>\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Shutout Reports</span><span class="panel-meta">').concat(mine.length, "</span></div>\n      <div>").concat(mine.map((s) => '<div class="shutout-card"><div style="display:flex;gap:12px;align-items:flex-start">'.concat(shutoutPhotoThumb(s, "()=>renderDriverPortal()"), '<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">').concat(s.container, '</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">').concat(s.vessel, " \xB7 Voyage ").concat(s.voyage, "</div></div>").concat(sbadge(s.status), '</div><div style="font-size:11.5px;color:var(--text-2)">Reason: ').concat(s.reason, "</div></div></div></div>")).join("") || '<div class="empty-state"><div class="empty-state-label">No shutouts reported yet</div></div>', "</div>\n    </div>\n  ");
}
function dpSaveShutout(driverId) {
  const cont = document.getElementById("dp_sh_cont").value.trim().toUpperCase();
  if (!cont) {
    toast("Container number required", "error");
    return;
  }
  if (!/^[A-Z0-9]{4,12}$/.test(cont)) {
    toast("Invalid container format", "error");
    return;
  }
  const driver = state.db.drivers.find((d) => d.id === driverId);
  state.db.shutouts.push({
    id: uid("SHT"),
    container: cont,
    line: document.getElementById("dp_sh_line").value,
    vessel: sanitize(document.getElementById("dp_sh_vessel").value.trim()),
    voyage: sanitize(document.getElementById("dp_sh_voyage").value.trim()),
    reason: sanitize(document.getElementById("dp_sh_reason").value.trim()),
    truckId: (driver == null ? void 0 : driver.truckId) || null,
    driverId,
    notes: sanitize(document.getElementById("dp_sh_notes").value.trim()),
    img: _pendingShutoutImg.dp || "",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    status: "open",
    _dirty: true
  });
  _pendingShutoutImg.dp = "";
  scheduleSave();
  buildBadges();
  addAudit(state.profile.username, "Shutout Flagged (Driver)", cont);
  toast("Shutout flagged", "success");
  renderDriverPortal();
}
let _shutoutFilter = "all";
function filterShutout(f, btn) {
  _shutoutFilter = f;
  document.querySelectorAll("#sec-shutout .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderShutout(f);
}
function shutoutPhotoThumb(s, afterFnCall) {
  return '<div class="ic-card-img-placeholder" style="cursor:pointer" onclick="event.stopPropagation();triggerImageUpload(\'shutouts\',\''.concat(s.id, "','img',").concat(afterFnCall, ')" title="').concat(s.img ? "Replace photo" : "Upload container photo", '">').concat(s.img ? '<img src="'.concat(s.img, '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;cursor:zoom-in" onclick="event.stopPropagation();openPhotoLightbox(\'').concat(s.img, "')\" />") : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>', "</div>");
}
function renderShutout(f) {
  let items = f === "all" ? state.db.shutouts : state.db.shutouts.filter((s) => s.status === f);
  const el = document.getElementById("shutoutList");
  if (!el) return;
  el.innerHTML = items.map((s) => '<div class="shutout-card"><div style="display:flex;gap:12px;align-items:flex-start">'.concat(shutoutPhotoThumb(s, "()=>renderShutout('".concat(f, "')")), '<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">').concat(s.container, '</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">').concat(s.vessel, " \xB7 Voyage ").concat(s.voyage, "</div></div>").concat(sbadge(s.status), '</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:6px">Reason: ').concat(s.reason, '</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--text-3)"><span>').concat(fmtDate(s.date), "</span><span>").concat(truckName(s.truckId), "</span></div>").concat(s.notes ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:6px;font-style:italic">'.concat(s.notes, "</div>") : "", "</div></div></div>")).join("") || '<div class="empty-state"><div class="empty-state-icon">\u{1F4E6}</div><div class="empty-state-label">No shutout records</div></div>';
}
function showAddShutoutModal() {
  _pendingShutoutImg.sh = "";
  openModal("Flag Shutout Container", '<div class="form-row-2"><div class="fg"><label>Container No.</label><input id="sh_cont" list="containerHistory" placeholder="MSCU1234566 \u2014 pick existing or type new" oninput="markContainerValidity(this)"/></div><div class="fg"><label>Shipping Line</label><select id="sh_line">'.concat(state.db.shippingLines.map((l) => '<option value="'.concat(l.id, '">').concat(l.code, "</option>")).join(""), '</select></div></div><div class="form-row-2"><div class="fg"><label>Vessel</label><input id="sh_vessel" placeholder="MSC VESSEL NAME"/></div><div class="fg"><label>Voyage No.</label><input id="sh_voyage" placeholder="VA-001"/></div></div><div class="fg"><label>Reason</label><input id="sh_reason" placeholder="Why was this shutout?"/></div><div class="form-row-2"><div class="fg"><label>Truck</label><select id="sh_truck">').concat(state.db.trucks.map((t) => '<option value="'.concat(t.id, '">').concat(t.reg, "</option>")).join(""), '</select></div><div class="fg"><label>Driver</label><select id="sh_driver">').concat(state.db.drivers.map((d) => '<option value="'.concat(d.id, '">').concat(d.name, "</option>")).join(""), '</select></div></div><div class="fg"><label>Notes</label><textarea id="sh_notes" rows="2"></textarea></div>').concat(shutoutPhotoPicker("sh"), '<button class="submit-btn" onclick="saveShutout()">Flag Shutout \u2192</button>'));
}
function saveShutout() {
  const cont = document.getElementById("sh_cont").value.trim().toUpperCase();
  if (!cont) {
    toast("Container number required", "error");
    return;
  }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) {
    toast("Container number: ".concat(contIssue), "error");
    return;
  }
  const dupShutout = state.db.shutouts.find((s) => (s.container || "").toUpperCase() === cont && s.status === "open");
  if (dupShutout) {
    toast("".concat(cont, " already has an open shutout record \u2014 resolve it before flagging again"), "error");
    return;
  }
  state.db.shutouts.push({
    id: uid("SHT"),
    container: cont,
    line: document.getElementById("sh_line").value,
    vessel: sanitize(document.getElementById("sh_vessel").value.trim()),
    voyage: sanitize(document.getElementById("sh_voyage").value.trim()),
    reason: sanitize(document.getElementById("sh_reason").value.trim()),
    truckId: document.getElementById("sh_truck").value,
    driverId: document.getElementById("sh_driver").value,
    notes: sanitize(document.getElementById("sh_notes").value.trim()),
    img: _pendingShutoutImg.sh || "",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    status: "open",
    _dirty: true
  });
  _pendingShutoutImg.sh = "";
  scheduleSave();
  buildBadges();
  addAudit(state.profile.username, "Shutout Flagged", cont);
  closeModal();
  renderShutout("all");
  refreshContainerHistory();
  toast("Shutout flagged", "success");
}
let _icFilter = "all";
function filterInterchange(f, btn) {
  _icFilter = f;
  document.querySelectorAll("#sec-interchange .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderInterchange(f);
}
const IC_PAGE = 40;
let _icShown = IC_PAGE, _icLastF = null;
function icShowMore(all) {
  _icShown = all ? Infinity : _icShown + IC_PAGE;
  renderInterchange(_icFilter);
}
function renderInterchange(f) {
  if (f !== _icLastF) {
    _icShown = IC_PAGE;
    _icLastF = f;
  }
  const issued = issuedInterchanges();
  const waiting = (state.db.interchange || []).length - issued.length;
  let items = f === "all" ? issued : f === "flagged" ? issued.filter((i) => i.flaggedForReview) : issued.filter((i) => i.status === f);
  const el = document.getElementById("interchangeList");
  if (!el) return;
  const _total = items.length;
  items = items.map((i) => [+new Date(i.date) || 0, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]).slice(0, _icShown);
  const _icIdx = icOutIndex();
  const waitNote = waiting ? '<div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0"><b>'.concat(waiting, "</b> gated-in container").concat(waiting === 1 ? " is" : "s are", " waiting for survey. The interchange (EIR) is issued automatically when the survey is complete.</span></div>") : "";
  el.innerHTML = waitNote + items.map((ic) => {
    const meta = [ic.eirNumber ? "EIR ".concat(ic.eirNumber) : null, ic.vessel || ic.voyage ? "".concat(ic.vessel || "\u2014", " / ").concat(ic.voyage || "\u2014") : null, ic.dateOut ? "Out ".concat(fmtDate(ic.dateOut)) : null].filter(Boolean).join(" \xB7 ");
    const repairBadge = ic.repairs && ic.repairs.length ? '<div style="font-size:10.5px;color:var(--red);margin-top:2px">'.concat(ic.repairs.length, " damage item").concat(ic.repairs.length > 1 ? "s" : "", " \xB7 ").concat(GargoMoney.fmt(ic.repairTotal || 0, GargoMoney.itemsCur(ic.repairs)), "</div>") : "";
    const canQuickDispatch = icInYard(ic, _icIdx);
    const canSendToSurvey = (ic.type === "Gate-In" || ic.type === "Depot-In") && !ic.surveyStatus;
    return '<div class="ic-card"><div class="ic-card-img-placeholder" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload(\'interchange\',\''.concat(ic.id, "','img',()=>renderInterchange('").concat(f, '\'))" title="Upload container photo">').concat(ic.img ? '<img loading="lazy" decoding="async" src="'.concat(ic.img, '" style="width:100%;height:100%;object-fit:cover" />') : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>', '</div><div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">').concat(ic.container, "</div>").concat(sbadge(ic.status)).concat(ic.flaggedForReview ? '<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="'.concat(esc((ic.flagReasons || []).join("; ")), '">\u26A0 Flagged</span>') : "", '</div><div style="font-size:11.5px;color:var(--text-2)">').concat(ic.type, " \xB7 ").concat(lineName(ic.line), " \xB7 ").concat(ic.condition).concat(ic.ctype ? " \xB7 " + ic.ctype : "", '</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">').concat(ic.truck ? truckName(ic.truck) : ic.truckRegText || "\u2014", " \xB7 ").concat(ic.driver ? driverName(ic.driver) : ic.driverNameText || "\u2014", " \xB7 ").concat(fmtDate(ic.date), "</div>").concat(meta ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">'.concat(meta, "</div>") : "").concat(repairBadge).concat(ic.notes ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">'.concat(ic.notes, "</div>") : "", '</div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">').concat(isAdmin() && ic.status === "pending" ? '<button class="modal-btn success" onclick="approveInterchange(\''.concat(ic.id, "')\">Approve</button>") : "").concat(canQuickDispatch ? '<button class="modal-btn ghost" onclick="quickDispatchOut(\''.concat(ic.id, "')\">Quick Dispatch \u2192</button>") : "").concat(canSendToSurvey ? '<button class="modal-btn ghost" onclick="sendToSurvey(\''.concat(ic.id, "')\">Send to Survey \u2192</button>") : "", '<button class="modal-btn ghost" onclick="downloadInterchangeSlip(\'').concat(ic.id, '\')">\u2B07 Download</button><button class="modal-btn ghost" onclick="printInterchangeSlip(\'').concat(ic.id, '\')" title="Print">\u{1F5A8} Print</button>').concat(ic.flaggedForReview ? "<button class=\"modal-btn ghost\" onclick=\"clearReviewFlag('interchange','".concat(ic.id, "')\">\u2713 Mark Reviewed</button>") : "").concat(ic.surveyId ? '<button class="modal-btn ghost" onclick="downloadInspectionReport(\''.concat(ic.surveyId, '\')">\u2B07 Inspection Report</button><button class="modal-btn ghost" onclick="printInspectionReport(\'').concat(ic.surveyId, '\')" title="Print">\u{1F5A8} Print Report</button>') : "").concat(ic.surveyId || ic.img || ic.photos && ic.photos.length ? '<button class="modal-btn ghost" onclick="showContainerPhotos(\''.concat(ic.id, "')\">\u{1F4F7} Photos</button>") : "", "</div></div>");
  }).join("") || '<div class="empty-state"><div class="empty-state-icon">\u{1F504}</div><div class="empty-state-label">No interchange records</div></div>';
  if (_total > items.length) el.innerHTML += '<div style="padding:14px;text-align:center;font-size:12px;color:var(--text-3)">Showing '.concat(items.length, " of ").concat(_total, ' \xB7 <button class="modal-btn ghost" onclick="icShowMore()">Show ').concat(IC_PAGE, " more</button> ").concat(_total <= 1e3 ? '<button class="modal-btn ghost" onclick="icShowMore(true)">Show all</button>' : "", "</div>");
}
async function sendToSurvey(id) {
  const ic = state.db.interchange.find((i) => i.id === id);
  if (!ic) {
    toast("Interchange record not found", "error");
    return;
  }
  if (ic.surveyStatus === "awaiting_survey") {
    toast("".concat(ic.container, " is already awaiting survey"), "info");
    return;
  }
  if (ic.surveyStatus === "surveyed") {
    toast("".concat(ic.container, " has already been surveyed"), "info");
    return;
  }
  ic.needsSurvey = true;
  ic.surveyStatus = "awaiting_survey";
  ic._dirty = true;
  if (!ic.bookingId) {
    try {
      const bookingId = await createDepotBookingFromInterchange(ic);
      if (bookingId) {
        ic.bookingId = bookingId;
        ic._dirty = true;
      }
    } catch (e) {
      toast("".concat(ic.container, " sent to Awaiting Survey, but couldn't queue it for DepOps (").concat(e.message || e, ")"), "warning", 6e3);
    }
  }
  scheduleSave();
  addAudit(state.profile.username, "Sent to Survey", ic.container);
  toast("".concat(ic.container, " sent to Awaiting Survey"), "success");
  renderInterchange(_icFilter);
  if (typeof renderInwardAwaitingSurvey === "function") renderInwardAwaitingSurvey();
  if (typeof renderInwardStillInStorage === "function") renderInwardStillInStorage();
  if (typeof renderDepOpsAwaitingSurvey === "function") renderDepOpsAwaitingSurvey();
}
async function showContainerPhotos(icId) {
  const ic = state.db.interchange.find((i) => i.id === icId);
  if (!ic) {
    toast("Interchange record not found", "error");
    return;
  }
  openModal("Photos \u2014 ".concat(sanitize(ic.container) || "Container"), '<div class="empty-state"><div class="empty-state-label">Loading\u2026</div></div>');
  let photos = ic.photos && ic.photos.length ? ic.photos.slice() : [];
  if (ic.surveyId) {
    let s = _surveyRegisterData.find((x) => x.id === ic.surveyId) || _surveyLookupCache[ic.surveyId];
    if (!s) {
      try {
        s = await window.bookingDocs.surveyById(ic.surveyId);
        if (s) _surveyLookupCache[s.id] = s;
      } catch (e) {
      }
    }
    if (s && Array.isArray(s.photos)) {
      s.photos.forEach((p) => {
        if (photos.indexOf(p) === -1) photos.push(p);
      });
    }
  }
  if (ic.img && photos.indexOf(ic.img) === -1) photos.unshift(ic.img);
  const body = document.getElementById("modalBody");
  if (!body) return;
  if (!photos.length) {
    body.innerHTML = '<div class="empty-state"><div class="empty-state-label">No photos on file for this container</div></div>';
    return;
  }
  body.innerHTML = '\n    <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">'.concat(photos.length, " photo").concat(photos.length > 1 ? "s" : "", " on file").concat(ic.surveyId ? " \xB7 captured at survey" : "", ' \u2014 tap to view full size</div>\n    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">').concat(photos.map(
    (src, i) => '<img src="'.concat(src, '" alt="Container photo ').concat(i + 1, '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid var(--border)" onclick="openPhotoLightbox(this.src)">')
  ).join(""), "</div>");
}
function printInterchangeList() {
  const items = _icFilter === "all" ? issuedInterchanges() : issuedInterchanges().filter((i) => i.status === _icFilter);
  if (!items.length) {
    toast("Nothing to print yet", "error");
    return;
  }
  const rows = items.map((ic) => "<tr>\n    <td>".concat(fmtDate(ic.date), "</td><td>").concat(sanitize(ic.container || "\u2014"), "</td><td>").concat(sanitize(ic.eirNumber || "\u2014"), "</td><td>").concat(sanitize(ic.type || "\u2014"), "</td>\n    <td>").concat(sanitize(lineName(ic.line)), "</td><td>").concat(sanitize(ic.condition || "\u2014"), "</td>\n    <td>").concat(sanitize(truckName(ic.truck)), "</td><td>").concat(sanitize(driverName(ic.driver)), "</td>\n    <td>").concat(ic.repairTotal ? GargoMoney.fmt(ic.repairTotal, GargoMoney.itemsCur(ic.repairs)) : "\u2014", "</td><td>").concat(sanitize((ic.status || "").toUpperCase()), "</td>\n  </tr>")).join("");
  const w = window.open("", "_blank");
  w.document.write("<html><head><title>Interchange Records</title><style>\n    body{font-family:Arial,sans-serif;padding:20px;color:#111}\n    table{width:100%;border-collapse:collapse;font-size:11px}\n    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}\n    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}\n    h2{margin-bottom:4px}\n  </style></head><body>".concat(ghPrintHeaderHtml(), '<h2>Interchange Records</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ').concat((/* @__PURE__ */ new Date()).toLocaleString("en-KE"), " \xB7 Filter: ").concat(_icFilter, "</div>\n  <table><thead><tr><th>Date</th><th>Container</th><th>EIR No.</th><th>Type</th><th>Line</th><th>Condition</th><th>Truck</th><th>Driver</th><th>Repair Cost</th><th>Status</th></tr></thead><tbody>").concat(rows, "</tbody></table>\n  </body></html>"));
  w.document.close();
  w.focus();
  w.print();
}
function downloadInterchangeCSV() {
  const items = _icFilter === "all" ? issuedInterchanges() : issuedInterchanges().filter((i) => i.status === _icFilter);
  if (!items.length) {
    toast("Nothing to download yet", "error");
    return;
  }
  const headers = ["Date", "Container", "EIR No.", "Type", "Container Type", "Shipping Line", "Vessel", "Voyage", "Consignee / C&F", "Guarantee / B/L No.", "ISO Code", "Trailer No.", "Gross Weight (kg)", "Date of Manufacture", "Transporter", "Driver ID / Driving No.", "Cargo Status", "Condition", "Truck", "Driver", "Date Out", "Receiving Party", "Release Order No.", "Repair Items", "Repair Total", "Status", "Notes"];
  const rows = items.map((ic) => [
    ic.date,
    ic.container,
    ic.eirNumber,
    ic.type,
    ic.ctype,
    lineName(ic.line),
    ic.vessel,
    ic.voyage,
    ic.deliveringParty,
    ic.guaranteeNo || ic.blNumber,
    ic.isoCode,
    ic.trailerNo,
    ic.grossWeight,
    ic.manufactureDate,
    ic.transporter,
    ic.driverIdNumber,
    ic.cargoStatus,
    ic.condition,
    truckName(ic.truck),
    driverName(ic.driver),
    ic.dateOut,
    ic.receivingParty,
    ic.releaseOrderNo,
    (ic.repairs || []).map((r) => "".concat(r.code, " (").concat(r.item, ")")).join("; "),
    ic.repairTotal || 0,
    ic.status,
    ic.notes
  ]);
  const csv = ghCsvPreamble("\n") + [headers, ...rows].map((r) => r.map((v) => '"'.concat(String(v == null ? "" : v).replace(/"/g, '""'), '"')).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "interchange-".concat(_icFilter, "-").concat((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), ".csv");
  a.click();
  URL.revokeObjectURL(a.href);
}
function _icSourceTag(rec) {
  const base = /bulk import/i.test(rec.notes || "") || rec.truckRegText || rec.driverNameText ? "Bulk" : "Manual";
  return rec._reportSource === "trips" ? "".concat(base, " \xB7 Trips") : base;
}
function approveInterchange(id) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const ic = state.db.interchange.find((i) => i.id === id);
  if (!ic) return;
  if (icAwaitingSurvey(ic)) {
    toast("This container has not been surveyed yet, so there is no interchange to approve", "error");
    return;
  }
  ic.status = "approved";
  ic._dirty = true;
  scheduleSave();
  buildBadges();
  addAudit(state.profile.username, "Interchange Approved", ic.container);
  renderInterchange(_icFilter);
  toast("Interchange approved", "success");
}
function isInwardMovement(type) {
  return type === "Gate-In" || type === "Depot-In";
}
function eirPrefixForLine(lineId) {
  const l = (state.db.shippingLines || []).find((x) => x.id === lineId);
  const letters = String(l && (l.code || l.name) || "").toUpperCase().replace(/[^A-Z]/g, "");
  return letters.slice(0, 3) || "EIR";
}
function eirNumberIsMissing(v) {
  return !v || /^(n\/?a|none|null|-+|—+)$/i.test(String(v).trim());
}
const EIR_INWARD_SCHEME = {
  ACL: { suffix: "ACLR", start: 268 },
  ALSL: { suffix: "ALSL", start: 10 },
  ASL: { suffix: "ASL", start: 140 },
  APS: { suffix: "APS", start: 78 },
  BLTC: { suffix: "BLTC", start: 262 },
  BLT: { suffix: "BLT", start: 20 },
  BWS: { suffix: "BWS", start: 218 },
  COSL: { suffix: "COSL", start: 4497 },
  COL: { suffix: "COL", start: 137 },
  DOSL: { suffix: "DOSL", start: 51 },
  PIL: { suffix: "PIL", start: 5538 },
  OFS: { suffix: "OFS", start: 227 },
  OLE: { suffix: "OLE", start: 58 },
  OSL: { suffix: "OSL", start: 21 },
  NML: { suffix: "NML", start: 2 },
  KVY: { suffix: "KVY", start: 8 },
  GDRC: { suffix: "GDRC", start: 41 },
  GHD: { suffix: "GHD", start: 188 },
  ECL: { suffix: "ECL", start: 4 }
};
const _eirIssued = {};
function eirInwardScheme(lineId) {
  const l = (state.db.shippingLines || []).find((x) => x.id === lineId);
  if (!l) return null;
  return EIR_INWARD_SCHEME[String(l.code || "").trim().toUpperCase()] || null;
}
async function nextSchemeEirNumber(sc, lineId) {
  const re = new RegExp("^(\\d+)" + sc.suffix + "$");
  try {
    const { data, error } = await supabase.rpc("next_inward_eir_number", { p_line_id: lineId });
    if (!error && typeof data === "string" && re.test(data)) {
      _eirIssued[sc.suffix] = parseInt(re.exec(data)[1], 10);
      return data;
    }
  } catch (e) {
  }
  const used = /* @__PURE__ */ new Set();
  (state.db.interchange || []).forEach((i) => {
    const m = re.exec(String(i.eirNumber || "").trim().toUpperCase());
    if (m) used.add(parseInt(m[1], 10));
  });
  let n = Math.max(sc.start, (_eirIssued[sc.suffix] || 0) + 1);
  while (used.has(n)) n++;
  _eirIssued[sc.suffix] = n;
  return n + sc.suffix;
}
async function nextEirNumber(movementType, lineId) {
  if (isInwardMovement(movementType)) {
    const sc = eirInwardScheme(lineId);
    if (sc) return nextSchemeEirNumber(sc, lineId);
  }
  const prefix = eirPrefixForLine(lineId);
  const re = new RegExp("^" + prefix + "(\\d+)$");
  const fmtNo = (n) => prefix + String(n).padStart(3, "0");
  try {
    const { data, error } = await supabase.rpc("next_eir_number_for_prefix", { p_prefix: prefix });
    if (!error && typeof data === "string" && re.test(data)) return data;
  } catch (e) {
  }
  let max = 0;
  (state.db.interchange || []).forEach((i) => {
    const m = re.exec(i.eirNumber || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  try {
    const { data } = await supabase.from("interchange").select("eir_number").like("eir_number", prefix + "%").order("created_at", { ascending: false }).limit(300);
    (data || []).forEach((r) => {
      const m = re.exec(r.eir_number || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
  } catch (e) {
  }
  return fmtNo(max + 1);
}
async function ensureEirNumber(ic) {
  if (!ic || !eirNumberIsMissing(ic.eirNumber)) return;
  ic.eirNumber = await nextEirNumber(ic.type, ic.line);
  ic._dirty = true;
  scheduleSave();
}
function normalizeManufactureDate(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  let mm, yyyy, m;
  if (m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{4})$/)) {
    mm = +m[1];
    yyyy = +m[2];
  } else if (m = s.match(/^(\d{4})\s*[\/\-.]\s*(\d{1,2})$/)) {
    yyyy = +m[1];
    mm = +m[2];
  } else return null;
  if (mm < 1 || mm > 12 || yyyy < 1970 || yyyy > (/* @__PURE__ */ new Date()).getFullYear() + 1) return null;
  return String(mm).padStart(2, "0") + "/" + yyyy;
}
function showAddInterchangeModal() {
  window._repairItems.ic = [];
  const typeOptions = CONTAINER_TYPE_OPTIONS.map((t) => "<option>".concat(t, "</option>")).join("");
  openModal("Record Interchange", '\n    <div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0">The <strong>EIR No.</strong> is generated automatically when the interchange is recorded. Inward interchanges (Gate-In / Depot-In) are not entered here: they are issued automatically when the container\'s survey is complete.</span></div>\n    <div class="form-row-2">\n      <div class="fg"><label>Container No.</label><input id="ic_cont" list="containerHistory" placeholder="MSCU1234566 \u2014 pick existing or type new" oninput="markContainerValidity(this)"/></div>\n      <div class="fg"><label>Movement</label><select id="ic_type"><option>Gate-Out</option><option>Depot-Out</option></select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Container Type/Size</label><select id="ic_ctype">'.concat(typeOptions, '</select></div>\n      <div class="fg"><label>ISO Code <span class="label-optional">(optional)</span></label><input id="ic_iso" placeholder="e.g. 22G1" maxlength="6" style="text-transform:uppercase"/></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Consignee / C&amp;F</label><input id="ic_consignee" placeholder="Consignee / clearing &amp; forwarding agent"/></div>\n      <div class="fg"><label>Shipping Line / Agent</label><select id="ic_line">').concat(state.db.shippingLines.map((l) => '<option value="'.concat(l.id, '">').concat(l.code, "</option>")).join(""), '</select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Vessel</label><input id="ic_vessel"/></div>\n      <div class="fg"><label>Voyage</label><input id="ic_voyage"/></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Guarantee / B/L No.</label><input id="ic_bl" placeholder="Guarantee form / B/L no."/></div>\n      <div class="fg"><label>Gross Weight (kg) <span class="label-optional">(optional)</span></label><input id="ic_gross" type="number" min="0" step="1" placeholder="e.g. 30480"/></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Lorry No.</label><select id="ic_truck">').concat(state.db.trucks.map((t) => '<option value="'.concat(t.id, '">').concat(t.reg, "</option>")).join(""), '</select></div>\n      <div class="fg"><label>Trailer No. <span class="label-optional">(optional)</span></label><input id="ic_trailer" placeholder="e.g. ZD502"/></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Driver Name</label><select id="ic_driver">').concat(state.db.drivers.map((d) => '<option value="'.concat(d.id, '">').concat(d.name, "</option>")).join(""), '</select></div>\n      <div class="fg"><label>ID / Driving No. <span class="label-optional">(optional)</span></label><input id="ic_driver_id" placeholder="National ID / driving licence no."/></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Transporter <span class="label-optional">(optional)</span></label><input id="ic_transporter" placeholder="Transporting company"/></div>\n      <div class="fg"><label>Date of Manufacture <span class="label-optional">(optional)</span></label><input id="ic_dom" placeholder="MM/YYYY" maxlength="7"/></div>\n    </div>\n    <div class="fg"><label>Container Status</label><select id="ic_cond"><option>Repat</option><option>Sale</option><option>Shipper</option></select></div>\n    ').concat(tariffPickerHtml("ic"), '\n    <div class="fg"><label>Notes</label><textarea id="ic_notes" rows="2" placeholder="Damage notes, remarks\u2026"></textarea></div>\n    <button class="submit-btn" onclick="saveInterchange()">Record Interchange \u2192</button>'));
  renderRepairItemsList("ic");
}
let _icSaving = false;
async function saveInterchange() {
  if (_icSaving) return;
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const cont = val("ic_cont").toUpperCase();
  if (!cont) {
    toast("Container number required", "error");
    return;
  }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) {
    toast("Container number: ".concat(contIssue), "error");
    return;
  }
  const type = val("ic_type");
  if (isInwardMovement(type)) {
    toast("Inward interchange is issued automatically after the survey. Record the Gate-In under Inward Container Entry, then survey it.", "error", 7e3);
    return;
  }
  const dupIc = findDuplicateInterchange(cont, type, (/* @__PURE__ */ new Date()).toISOString());
  if (dupIc) {
    toast("".concat(cont, " already has a ").concat(type, " interchange record logged today"), "warning");
    return;
  }
  const dom = normalizeManufactureDate(val("ic_dom"));
  if (dom === null) {
    toast("Date of manufacture must look like 05/2011", "error");
    return;
  }
  const grossRaw = val("ic_gross");
  const gross = grossRaw ? Number(grossRaw) : "";
  if (grossRaw && (!isFinite(gross) || gross <= 0)) {
    toast("Gross weight must be a positive number", "error");
    return;
  }
  _icSaving = true;
  try {
    const eirNumber = await nextEirNumber(type, val("ic_line"));
    const repairs = window._repairItems.ic || [];
    const ref = sanitize(val("ic_bl"));
    const icRec = {
      id: uid("IC"),
      container: cont,
      type,
      ctype: val("ic_ctype"),
      line: val("ic_line"),
      condition: val("ic_cond"),
      truck: val("ic_truck"),
      driver: val("ic_driver"),
      driverIdNumber: sanitize(val("ic_driver_id")),
      transporter: sanitize(val("ic_transporter")),
      trailerNo: sanitize(val("ic_trailer")),
      isoCode: sanitize(val("ic_iso")).toUpperCase(),
      grossWeight: gross,
      manufactureDate: dom,
      deliveringParty: sanitize(val("ic_consignee")),
      // consignee / C&F
      eirNumber,
      blNumber: ref,
      guaranteeNo: ref,
      clerkName: state.profile && state.profile.name || "",
      vessel: sanitize(val("ic_vessel")),
      voyage: sanitize(val("ic_voyage")),
      repairs,
      repairTotal: repairItemsTotal(repairs),
      notes: sanitize(val("ic_notes")),
      date: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      img: "",
      _dirty: true
    };
    const savedIc = await persistNewInterchange(icRec);
    if (!savedIc.ok) {
      toast("Not saved \u2014 ".concat(savedIc.message), "error", 9e3);
      return;
    }
    buildBadges();
    addAudit(state.profile.username, "Interchange Recorded", "".concat(cont, " \xB7 ").concat(eirNumber));
    closeModal();
    renderInterchange("all");
    refreshContainerHistory();
    toast("Interchange recorded \u2014 ".concat(eirNumber), "success");
  } finally {
    _icSaving = false;
  }
}
function buildInterchangeSlip(icId, opts) {
  opts = opts || {};
  const ic = state.db.interchange.find((i) => i.id === icId);
  if (!ic) {
    toast("Interchange record not found", "error");
    return null;
  }
  if (!window.jspdf) {
    toast("PDF library still loading \u2014 try again in a moment", "error");
    return null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;
  if (icAwaitingSurvey(ic)) {
    toast("The interchange is issued after the survey is complete", "warning");
    return null;
  }
  const inward = isInwardMovement(ic.type);
  if (!inward) return icBuildOutwardSlip(ic, doc, opts);
  const money = (n) => Number(n || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function cell(x, y2, w, h, label, value) {
    doc.setDrawColor(90);
    doc.setLineWidth(0.3);
    doc.rect(x, y2, w, h);
    doc.setFont(void 0, "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(90);
    doc.text(String(label).toUpperCase(), x + w / 2, y2 + 4.2, { align: "center" });
    doc.setTextColor(20);
    const text = String(value == null || value === "" ? "" : value);
    doc.setFontSize(9.5);
    let lines = doc.splitTextToSize(text, w - 4);
    if (lines.length > 1) {
      doc.setFontSize(7.5);
      lines = doc.splitTextToSize(text, w - 4).slice(0, 2);
      doc.text(lines, x + w / 2, y2 + 8, { align: "center", lineHeightFactor: 1.05 });
    } else {
      doc.text(lines, x + w / 2, y2 + 9.4, { align: "center" });
    }
  }
  ghPdfLetterhead(doc, MARGIN, 8, CONTENT_W);
  let y = 40;
  doc.setFont(void 0, "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("EIR NO. ".concat(ic.eirNumber || "\u2014"), MARGIN, y + 6);
  doc.setFontSize(14);
  doc.text(inward ? "INWARD INTERCHANGE" : "OUTWARD INTERCHANGE", 112, y + 6, { align: "center" });
  const when = new Date(ic.date);
  const timeStr = isNaN(when) ? "\u2014" : when.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  doc.setFontSize(9);
  doc.text("Date ".concat(inward ? "in" : "out", " :  ").concat(fmtDate(ic.date)), RIGHT, y + 3.5, { align: "right" });
  doc.text("Time ".concat(inward ? "in" : "out", " :  ").concat(timeStr), RIGHT, y + 8.5, { align: "right" });
  y += 13;
  const ROW = 12;
  const truckReg = ic.truck ? String(truckName(ic.truck)).split(" \xB7 ")[0] : ic.truckRegText || "";
  const lorry = [truckReg, ic.trailerNo].filter(Boolean).join(" / ");
  const drv = ic.driver ? state.db.drivers.find((d) => d.id === ic.driver) : null;
  const driverNm = ic.driver ? driverName(ic.driver) : ic.driverNameText || "";
  const driverIdNo = ic.driverIdNumber || drv && (drv.idNo || drv.id_no) || "";
  const sz = decomposeCtype(ic.ctype);
  const guaranteeBl = ic.guaranteeNo || ic.blNumber || "";
  const storageZone = ic.storageZone || "";
  const storageBlock = ic.storageBlock || "";
  const storageSlot = ic.storageSlot || "";
  cell(MARGIN, y, 91, ROW, "Consignee / C and F", ic.deliveringParty);
  cell(MARGIN + 91, y, 91, ROW, "Shipping Line / Agent", ic.line ? lineName(ic.line) : "");
  y += ROW;
  cell(MARGIN, y, 52, ROW, "Container No.", ic.container);
  cell(MARGIN + 52, y, 22, ROW, "ISO", ic.isoCode);
  cell(MARGIN + 74, y, 18, ROW, "Size", String(sz.size || "").replace(/ft$/i, ""));
  cell(MARGIN + 92, y, 22, ROW, "Type", sz.type);
  cell(MARGIN + 114, y, 40, ROW, "Vessel", ic.vessel);
  cell(MARGIN + 154, y, 28, ROW, "Voyage", ic.voyage);
  y += ROW;
  cell(MARGIN, y, 56, ROW, "Lorry No. / Trailer No.", lorry);
  cell(MARGIN + 56, y, 50, ROW, "Driver Name", driverNm);
  cell(MARGIN + 106, y, 40, ROW, "ID / Driving No.", driverIdNo);
  cell(MARGIN + 146, y, 36, ROW * 2, "Signature", "");
  y += ROW;
  cell(MARGIN, y, 73, ROW, "Transporter", ic.transporter);
  cell(MARGIN + 73, y, 73, ROW, "Guarantee / BL No.", guaranteeBl);
  y += ROW;
  cell(MARGIN, y, 56, ROW, "Clerk", ic.clerkName);
  cell(MARGIN + 56, y, 42, ROW, "Storage Zone", storageZone);
  cell(MARGIN + 98, y, 42, ROW, "Storage Block", storageBlock);
  cell(MARGIN + 140, y, 42, ROW, "Storage Slot", storageSlot);
  y += ROW;
  cell(MARGIN, y, 91, ROW, "Gross Weight (kg)", ic.grossWeight !== "" && ic.grossWeight != null ? Number(ic.grossWeight).toLocaleString() : "");
  cell(MARGIN + 91, y, 91, ROW, "Date of Manufacture", ic.manufactureDate);
  y += ROW + 6;
  const cols = [
    { label: "Repair Code", x: MARGIN, w: 26, align: "left" },
    { label: "Damage Description", x: MARGIN + 26, w: 70, align: "left" },
    { label: "Qty", x: MARGIN + 96, w: 12, align: "right" },
    { label: "Hrs", x: MARGIN + 108, w: 14, align: "right" },
    { label: "Labour Cost", x: MARGIN + 122, w: 20, align: "right" },
    { label: "Material Cost", x: MARGIN + 142, w: 22, align: "right" },
    { label: "Total Cost", x: MARGIN + 164, w: 18, align: "right" }
  ];
  const put = (i, txt, yy) => {
    const c = cols[i];
    if (c.align === "right") doc.text(String(txt), c.x + c.w - 1.5, yy, { align: "right" });
    else doc.text(String(txt), c.x + 1.5, yy);
  };
  doc.setDrawColor(90);
  doc.setLineWidth(0.3);
  doc.setFillColor(235, 235, 235);
  doc.rect(MARGIN, y, CONTENT_W, 7, "FD");
  cols.forEach((c) => doc.rect(c.x, y, c.w, 7));
  doc.setFont(void 0, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(60);
  cols.forEach((c, i) => {
    if (c.align === "right") doc.text(c.label, c.x + c.w - 1.5, y + 4.7, { align: "right" });
    else doc.text(c.label, c.x + 1.5, y + 4.7);
  });
  y += 7;
  const repairs = ic.repairs || [];
  let totHrs = 0, totLabour = 0, totMaterial = 0;
  doc.setFont(void 0, "normal");
  doc.setFontSize(8);
  doc.setTextColor(20);
  if (repairs.length) {
    repairs.forEach((r) => {
      const hrs = Number(r.hours || 0);
      const labour = hrs * GargoMoney.labourRate(GargoMoney.itemCur(r));
      const material = Number(r.material || 0);
      totHrs += hrs;
      totLabour += labour;
      totMaterial += material;
      const lines = doc.splitTextToSize(String(r.item || "\u2014"), cols[1].w - 3);
      const rowH = Math.max(7, lines.length * 3.6 + 3);
      if (y + rowH > 262) {
        doc.addPage();
        y = 20;
      }
      cols.forEach((c) => doc.rect(c.x, y, c.w, rowH));
      put(0, r.code || "\u2014", y + 4.6);
      doc.text(lines, cols[1].x + 1.5, y + 4.6);
      put(2, r.qty || 1, y + 4.6);
      put(3, hrs.toFixed(2), y + 4.6);
      put(4, money(labour), y + 4.6);
      put(5, money(material), y + 4.6);
      put(6, money(labour + material), y + 4.6);
      y += rowH;
    });
  } else {
    doc.rect(MARGIN, y, CONTENT_W, 8);
    doc.setFont(void 0, "italic");
    doc.setTextColor(100);
    doc.text("No damage items recorded.", MARGIN + 2, y + 5.3);
    doc.setFont(void 0, "normal");
    doc.setTextColor(20);
    y += 8;
  }
  doc.setFont(void 0, "bold");
  doc.setFontSize(8.5);
  cols.forEach((c) => doc.rect(c.x, y, c.w, 7.5));
  doc.text("Totals :   " + GargoMoney.sym(GargoMoney.itemsCur(repairs)), cols[1].x + cols[1].w - 1.5, y + 5, { align: "right" });
  put(3, totHrs.toFixed(2), y + 5);
  put(4, money(totLabour), y + 5);
  put(5, money(totMaterial), y + 5);
  put(6, money(totLabour + totMaterial), y + 5);
  y += 7.5 + 9;
  if (y > 262) {
    doc.addPage();
    y = 20;
  }
  doc.setFont(void 0, "bold");
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.text("THIS CONTAINER WAS ".concat(inward ? "RECEIVED" : "RELEASED", " IN GOOD CONDITION EXCEPT AS NOTED ABOVE."), MARGIN, y);
  y += 7;
  const slipNotes = /^Booking\s[^\u00b7]*\u00b7/.test(String(ic.notes || "")) ? "" : String(ic.notes || "");
  if (slipNotes) {
    const noteLines = doc.splitTextToSize(slipNotes, CONTENT_W - 4).slice(0, 5);
    const boxH = 9 + noteLines.length * 4;
    if (y + boxH > 285) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(90);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, CONTENT_W, boxH);
    doc.setFont(void 0, "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(90);
    doc.text("REMARKS", MARGIN + 2, y + 4.2);
    doc.setFont(void 0, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20);
    doc.text(noteLines, MARGIN + 2, y + 8.6);
    y += boxH + 4;
  }
  const SO_H = 36;
  let soY = Math.max(y + 4, 286 - SO_H);
  if (soY + SO_H > 288) {
    doc.addPage();
    soY = 20;
  }
  ghPdfSignOff(doc, MARGIN, soY, CONTENT_W, {
    surveyLabel: inward ? "Surveyed by" : "Issued by (clerk)",
    surveyor: ic.clerkName || "",
    surveyedAt: inward ? ic.surveyedAt || ic.depotInAt || ic.date : ic.date,
    printedBy: opts.printedBy || "",
    printedAt: /* @__PURE__ */ new Date()
  });
  return { doc, filename: "interchange-".concat((ic.container || ic.id).replace(/\s+/g, ""), ".pdf") };
}
const IC_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function icFmtDMY(v) {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (m && String(v).length <= 10) return m[3] + "-" + IC_MON[Number(m[2]) - 1] + "-" + m[1];
  const d = new Date(v);
  if (isNaN(d)) return "";
  return String(d.getDate()).padStart(2, "0") + "-" + IC_MON[d.getMonth()] + "-" + d.getFullYear();
}
function icFmtTime12(v) {
  const d = new Date(v);
  if (isNaN(d)) return "";
  const h = d.getHours(), h12 = h % 12 || 12;
  return String(h12).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM");
}
async function icSlipPrefetch(ic) {
  if (!ic || isInwardMovement(ic.type)) return;
  const S = ic._slip = { extra: {}, inward: null, survey: null, trip: null };
  try {
    const tid = typeof gxOutwardIcId === "function" ? gxOutwardIcId(ic.id) : null;
    if (tid) S.trip = (state.db.trips || []).find((t) => String(t.id).toLowerCase() === tid) || null;
  } catch (e) {
  }
  const key = normContainerKey(ic.container);
  let rows = (state.db.interchange || []).filter((i) => normContainerKey(i.container) === key);
  if (window.ICR && ICR.enabled && navigator.onLine) {
    try {
      rows = rows.concat(await ICR.byContainer(String(ic.container).trim().toUpperCase()));
    } catch (e) {
    }
  }
  const seen = /* @__PURE__ */ new Map();
  rows.forEach((r) => seen.set(r.id, r));
  const outAt = new Date(ic.date).getTime() + 864e5;
  const ins = Array.from(seen.values()).filter((i) => isInwardMovement(i.type) && !icAwaitingSurvey(i)).sort((a, b) => new Date(b.date) - new Date(a.date));
  S.inward = ins.find((i) => i.eirNumber && new Date(i.date).getTime() <= outAt) || ins.find((i) => i.eirNumber) || ins[0] || null;
  if (!navigator.onLine || typeof supabase === "undefined") return;
  try {
    const { data, error } = await supabase.from("interchange").select("release_order_date,final_destination,csc_approval").eq("id", ic.id).maybeSingle();
    if (!error && data) S.extra = data;
  } catch (e) {
  }
  if (S.inward && S.inward.surveyId) {
    try {
      let r = await supabase.from("depot_surveys").select("tare_weight,mgwt,iso_code,csc_approval").eq("id", S.inward.surveyId).maybeSingle();
      if (r.error) r = await supabase.from("depot_surveys").select("tare_weight,mgwt,iso_code").eq("id", S.inward.surveyId).maybeSingle();
      if (!r.error && r.data) S.survey = r.data;
    } catch (e) {
    }
  }
}
function icBuildOutwardSlip(ic, doc, opts) {
  opts = opts || {};
  const S = ic._slip || {}, X = S.extra || {}, inw = S.inward || null, sv = S.survey || {}, trip = S.trip || null;
  const U = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().toUpperCase();
  const num = (v) => v === "" || v == null || !isFinite(Number(v)) || Number(v) <= 0 ? "" : String(Number(v));
  const M = 14, W = 182, LINE = 150, INK = 20, VAL = 55;
  const lineRec = (state.db.shippingLines || []).find((l) => l.id === ic.line);
  const agent = lineRec ? lineRec.code || lineRec.name : ic.line ? lineName(ic.line) : "";
  const sz = ic.ctype ? decomposeCtype(ic.ctype) : { size: "", type: "" };
  const drv = ic.driver ? (state.db.drivers || []).find((d) => d.id === ic.driver) : null;
  const truckReg = ic.truck ? String(truckName(ic.truck)).split(" \xB7 ")[0] : ic.truckRegText || "";
  const tripRef = trip && trip.ref && !/^REF-\d+$/.test(trip.ref) ? trip.ref : "";
  const rmk = String(ic.notes || "").trim();
  const userRemark = /^(Auto-issued|Booking\s)/.test(rmk) ? "" : rmk;
  const D = {
    eir: ic.eirNumber || "",
    shipper: ic.receivingParty || trip && trip.receivingParty || ic.deliveringParty || "",
    reference: tripRef || ic.guaranteeNo || ic.blNumber || inw && (inw.guaranteeNo || inw.blNumber) || "",
    date: icFmtDMY(ic.date),
    time: icFmtTime12(ic.date),
    container: ic.container || "",
    agent,
    finalDest: X.final_destination || (trip && trip.dest && trip.dest !== "\u2014" ? trip.dest : ""),
    releaseNo: ic.releaseOrderNo || trip && trip.releaseOrderNo || "",
    releaseDate: icFmtDMY(X.release_order_date),
    iso: ic.isoCode || sv.iso_code || inw && inw.isoCode || "",
    size: String(sz.size || "").replace(/ft$/i, ""),
    type: sz.type || "",
    vessel: ic.vessel || trip && trip.vessel || "",
    voyage: ic.voyage || trip && trip.voyage || "",
    mtwt: num(sv.tare_weight),
    mgwt: num(sv.mgwt) || num(inw && inw.grossWeight),
    csc: X.csc_approval || sv.csc_approval || "",
    transporter: ic.transporter || "",
    lorry: [truckReg, ic.trailerNo].filter(Boolean).join("/"),
    driver: ic.driver ? driverName(ic.driver) : ic.driverNameText || "",
    driverId: ic.driverIdNumber || drv && (drv.idNo || drv.id_no) || "",
    preparedBy: opts.printedBy || "",
    clerk: ic.clerkName || "",
    remarks: [ic.condition, userRemark].filter(Boolean).join(" \u2014 "),
    inDate: inw ? icFmtDMY(inw.date) : "",
    inEir: inw ? inw.eirNumber || "" : "",
    inVessel: inw ? inw.vessel || "" : "",
    inVoyage: inw ? inw.voyage || "" : ""
  };
  const box = (x, y2, w, h) => {
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.25);
    doc.rect(x, y2, w, h);
  };
  const label = (t, x, y2, sz2, align) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sz2 || 7.4);
    doc.setTextColor(INK);
    doc.text(t, x, y2, align ? { align } : void 0);
  };
  const fit = (t, x, y2, w, size, o) => {
    o = o || {};
    let s = size;
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(s);
    doc.setTextColor(o.ink || VAL);
    while (s > 5 && doc.getTextWidth(t) > w) {
      s -= 0.25;
      doc.setFontSize(s);
    }
    doc.text(t, x, y2, o.align ? { align: o.align } : void 0);
  };
  const lv = (x, y2, w, h, cap, val, o) => {
    box(x, y2, w, h);
    label(cap, x + 2, y2 + 4.4);
    if (val) fit(o && o.raw ? String(val) : U(val), x + 2, y2 + h - 3.4, w - 4, o && o.size || 9, o);
  };
  const inline = (x, y2, w, h, cap, val) => {
    box(x, y2, w, h);
    label(cap, x + 2, y2 + h / 2 + 1.3, 8.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    const off = doc.getTextWidth(cap) + 4;
    if (val) fit(U(val), x + off, y2 + h / 2 + 1.7, w - off - 2, 11, { bold: true, ink: INK });
  };
  const strip = (x, y2, w, hH, hV, cap, val) => {
    box(x, y2, w, hH);
    label(cap, x + w / 2, y2 + hH - 1.9, 7.2, "center");
    box(x, y2 + hH, w, hV);
    if (val) fit(U(val), x + w / 2, y2 + hH + hV - 2.6, w - 3, 9, { align: "center" });
  };
  ghPdfLetterhead(doc, M, 8, W);
  let y = 37;
  box(M, y, 101, 11);
  label("CONTAINER INTERCHANGE REPORT / RECEIPT", M + 2, y + 6.9, 9.2);
  box(M + 101, y, 81, 11);
  label("OUTWARD EIR NO.", M + 103, y + 6.9, 8.6);
  if (D.eir) fit(U(D.eir), M + W - 3, y + 7.8, 38, 15, { bold: true, ink: INK, align: "right" });
  y += 11;
  lv(M, y, 87, 13, "SHIPPER NAME", D.shipper);
  lv(M + 87, y, 47, 13, "REFERENCE No", D.reference);
  lv(M + 134, y, 25, 13, "DATE", D.date, { size: 8.5, raw: true });
  lv(M + 159, y, 23, 13, "TIME", D.time, { size: 8.5, raw: true });
  y += 13;
  inline(M, y, 84, 11, "CONTAINER NO. :", D.container);
  inline(M + 84, y, 98, 11, "AGENT / LINE :", D.agent);
  y += 11;
  lv(M, y, 90, 14, "FINAL DESTINATION", D.finalDest);
  lv(M + 90, y, 50, 14, "RELEASE ORDER NO.", D.releaseNo);
  lv(M + 140, y, 42, 14, "R. ORDER DATE", D.releaseDate, { raw: true });
  y += 14;
  const strips = [
    ["ISO", 20, D.iso],
    ["SIZE", 15, D.size],
    ["TYPE", 15, D.type],
    ["VESSEL NAME", 35, D.vessel],
    ["VOY NO.", 22, D.voyage],
    ["MTWT", 19, D.mtwt],
    ["MGWT", 20, D.mgwt],
    ["CSC Approval", 36, D.csc]
  ];
  let sx = M;
  strips.forEach((s) => {
    strip(sx, y, s[1], 6, 8, s[0], s[2]);
    sx += s[1];
  });
  y += 14;
  lv(M, y, 38, 13, "TRANSPORTER", D.transporter);
  lv(M + 38, y, 46, 13, "TRUCK / TRAILER NO.", D.lorry);
  lv(M + 84, y, 44, 13, "DRIVER NAME", D.driver);
  lv(M + 128, y, 34, 13, "ID/DRIVING NO.", D.driverId);
  lv(M + 162, y, 20, 13, "SIGN.", "");
  y += 13;
  lv(M, y, 100, 13, "EIR PREPARED / COMPILED BY :", D.preparedBy, { size: 9.5 });
  lv(M + 100, y, 82, 13, "LOADING / RELEASING CLERK :", D.clerk, { size: 9.5 });
  y += 13;
  lv(M, y, 100, 13, "REMARKS :", D.remarks, { size: 9.5 });
  lv(M + 100, y, 82, 13, "GHD SIGN / STAMP :", "");
  y += 13 + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text([
    "NB: CONTAINER RELEASED / RECEIVED IN GOOD CONDITION.",
    "IT IS THE RESPONSIBILITY OF THE SHIPPER / TRANSPORTER / AGENT FOR ANY LOSS / DAMAGE",
    "OR CLEANLINESS OF THE EQUIPMENT AFTER IT HAS LEFT THE DEPOT."
  ], M, y, { lineHeightFactor: 1.35 });
  const fy = 262, cols = [["DATE IN", 41, D.inDate], ["EIR IN", 42, D.inEir], ["VESSEL IN", 53, D.inVessel], ["VOYAGE IN", 46, D.inVoyage]];
  let fx = M;
  cols.forEach((c) => {
    box(fx, fy, c[1], 7);
    label(c[0], fx + c[1] / 2, fy + 4.9, 8.4, "center");
    box(fx, fy + 7, c[1], 8);
    if (c[2]) fit(c[0] === "DATE IN" ? String(c[2]) : U(c[2]), fx + c[1] / 2, fy + 12.4, c[1] - 3, 9, { align: "center" });
    fx += c[1];
  });
  doc.setTextColor(INK);
  doc.setDrawColor(INK);
  return { doc, filename: "interchange-".concat(String(ic.container || ic.id).replace(/\s+/g, ""), ".pdf") };
}
async function icEditOutwardDetails(id) {
  let ic = (state.db.interchange || []).find((i) => i.id === id);
  if (!ic && window.ICR) {
    try {
      ic = await ICR.ensureRow(id);
    } catch (e) {
    }
  }
  if (!ic) {
    toast("Record not found on this device", "error");
    return;
  }
  await icSlipPrefetch(ic);
  const S = ic._slip || {}, X = S.extra || {}, sv = S.survey || {}, trip = S.trip || null;
  const f = (k, l, v, ex) => '<div class="fg"><label>'.concat(l, '</label><input id="oe_').concat(k, '" value="').concat(sanitize(v || ""), '" ').concat(ex || "", "/></div>");
  openModal("Outward EIR details \u2014 " + sanitize(ic.container), '\n    <div class="ops-notice" style="margin-bottom:12px">These print in the matching boxes of the outward EIR. Leave a box empty to print it blank.</div>\n    '.concat(f("shipper", "Shipper name", ic.receivingParty || trip && trip.receivingParty || ic.deliveringParty), '\n    <div class="form-row-2">').concat(f("dest", "Final destination", X.final_destination || (trip && trip.dest !== "\u2014" ? trip.dest : ""), 'placeholder="e.g. Shippers own"'), "\n    ").concat(f("rel", "Release order no.", ic.releaseOrderNo || trip && trip.releaseOrderNo), '</div>\n    <div class="form-row-2">').concat(f("reldate", "Release order date", X.release_order_date ? String(X.release_order_date).slice(0, 10) : "", 'type="date"'), "\n    ").concat(f("csc", "CSC approval", X.csc_approval || sv.csc_approval, 'placeholder="e.g. USA/AB-077/10-10"'), '</div>\n    <div class="form-row-2">').concat(f("trp", "Transporter", ic.transporter)).concat(f("trl", "Trailer no.", ic.trailerNo), "</div>\n    ").concat(f("did", "Driver ID / driving licence no.", ic.driverIdNumber), '\n    <button class="submit-btn" onclick="icEditOutwardSave(\'').concat(sanitize(id), "')\">Save details \u2192</button>"));
}
async function icEditOutwardSave(id) {
  const ic = (state.db.interchange || []).find((i) => i.id === id);
  if (!ic) {
    closeModal();
    return;
  }
  if (!navigator.onLine) {
    toast("You are offline \u2014 connect to save these details.", "error");
    return;
  }
  const v = (k) => sanitize(((document.getElementById("oe_" + k) || {}).value || "").trim());
  const patch = {
    receiving_party: v("shipper") || null,
    final_destination: v("dest") || null,
    release_order_no: v("rel") || null,
    release_order_date: v("reldate") || null,
    csc_approval: v("csc") || null,
    transporter: v("trp") || null,
    trailer_no: v("trl") || null,
    driver_id_number: v("did") || null
  };
  const { error } = await supabase.from("interchange").update(patch).eq("id", id);
  if (error) {
    const missing = /release_order_date|final_destination|csc_approval/i.test(error.message || "");
    toast(missing ? "Database not updated yet \u2014 run supabase_outward_eir_migration.sql first." : "Could not save: " + error.message, "error", 8e3);
    return;
  }
  ic.receivingParty = patch.receiving_party || "";
  ic.releaseOrderNo = patch.release_order_no || "";
  ic.transporter = patch.transporter || "";
  ic.trailerNo = patch.trailer_no || "";
  ic.driverIdNumber = patch.driver_id_number || "";
  if (ic._slip) ic._slip.extra = { release_order_date: patch.release_order_date, final_destination: patch.final_destination, csc_approval: patch.csc_approval };
  try {
    addAudit(state.profile.username, "Outward EIR Details Edited", "".concat(ic.container, " \xB7 ").concat(ic.eirNumber || ""));
  } catch (e) {
  }
  closeModal();
  toast("Outward EIR details saved", "success");
  if (window.GargoDocs) GargoDocs.eir(id, "preview");
}
async function icPrinter(ic, what) {
  if (typeof ghAskPrinter !== "function") return "";
  const by = await ghAskPrinter({ title: (what || "Interchange") + " \u2014 who is printing?", detail: ic ? [ic.container, ic.eirNumber].filter(Boolean).join(" \xB7 ") : "" });
  if (by) {
    try {
      addAudit(state.profile && state.profile.username || "system", (what || "Interchange") + " Printed", (ic ? [ic.container, ic.eirNumber].filter(Boolean).join(" \xB7 ") + " \xB7 " : "") + "by " + by);
    } catch (e) {
    }
  }
  return by;
}
async function downloadInterchangeSlip(icId) {
  const ic = state.db.interchange.find((x) => x.id === icId);
  if (ic && !icAwaitingSurvey(ic)) await ensureEirNumber(ic);
  if (ic) {
    try {
      await icSlipPrefetch(ic);
    } catch (e) {
      console.warn("slip data", e);
    }
  }
  const by = await icPrinter(ic);
  if (by === null) return;
  const r = buildInterchangeSlip(icId, { printedBy: by });
  if (r) r.doc.save(r.filename);
}
async function printInterchangeSlip(icId) {
  const ic = state.db.interchange.find((x) => x.id === icId);
  if (ic && !icAwaitingSurvey(ic)) await ensureEirNumber(ic);
  if (ic) {
    try {
      await icSlipPrefetch(ic);
    } catch (e) {
      console.warn("slip data", e);
    }
  }
  const by = await icPrinter(ic);
  if (by === null) return;
  const r = buildInterchangeSlip(icId, { printedBy: by });
  if (r) ghPrintPdf(r.doc);
}
async function collectInspectionPhotos(s) {
  const out = { survey: [], post_repair: [], other: [] }, seen = /* @__PURE__ */ new Set(), MAXG = 12;
  const push = (grp, url, title) => {
    if (!url || typeof url !== "string" || seen.has(url) || out[grp].length >= MAXG) return;
    seen.add(url);
    out[grp].push({ url, title: title || "" });
  };
  (Array.isArray(s.photos) ? s.photos : []).forEach((p, i) => push("survey", typeof p === "string" ? p : p && p.url, "Survey photo " + (i + 1)));
  try {
    if (window.GargoPhotos && s.container) {
      (await GargoPhotos.list(s.container, true)).forEach((r) => push(r.category === "survey" ? "survey" : r.category === "post_repair" ? "post_repair" : "other", r.url, r.title || GargoPhotos.catLabel(r.category)));
    }
  } catch (e) {
    console.warn("container photo file not loaded", e);
  }
  const all = [].concat(out.survey, out.post_repair, out.other);
  for (let i = 0; i < all.length; i += 4) await Promise.all(all.slice(i, i + 4).map(async (ph) => {
    ph.data = window.GargoPhotos ? await GargoPhotos.toDataUrl(ph.url) : /^data:/.test(ph.url) ? ph.url : "";
  }));
  return out;
}
async function buildInspectionReport(surveyId, opts) {
  opts = opts || {};
  if (!surveyId) {
    toast("No survey on file for this record", "error");
    return null;
  }
  let s = _surveyRegisterData.find((x) => x.id === surveyId) || _surveyLookupCache[surveyId];
  if (!s) {
    s = await window.bookingDocs.surveyById(surveyId);
    if (s) _surveyLookupCache[s.id] = s;
  }
  if (!s) {
    toast("Survey record not found", "error");
    return null;
  }
  if (!window.jspdf) {
    toast("PDF library still loading \u2014 try again in a moment", "error");
    return null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const GREEN = [46, 125, 50], BLUE = [30, 64, 175], GOLD = [201, 162, 39];
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;
  function infoBox(x, y2, w, h, fill) {
    doc.setFillColor(...fill);
    doc.setDrawColor(...fill);
    doc.roundedRect(x, y2, w, h, 1.5, 1.5, "F");
  }
  function kv(x, y2, label, value, valueColor) {
    doc.setFont(void 0, "normal");
    doc.setFontSize(7);
    doc.setTextColor(90);
    doc.text(String(label).toUpperCase(), x, y2);
    doc.setFont(void 0, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...valueColor || [20, 20, 20]);
    doc.text(String(value || "\u2014"), x, y2 + 5);
    doc.setTextColor(20);
  }
  function sectionHeading(text, y2) {
    doc.setFont(void 0, "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text(text.toUpperCase(), MARGIN, y2);
    doc.setDrawColor(20);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y2 + 1.5, RIGHT, y2 + 1.5);
  }
  function ensureSpace(y2, needed) {
    if (y2 + needed > 282) {
      doc.addPage();
      return 20;
    }
    return y2;
  }
  const repairs = s.tariff_items || [];
  const damageTotal = repairs.reduce((sum, r) => sum + (Number(r.price) || Number(r.material) || Number(r.hours || 0) * GargoMoney.labourRate(GargoMoney.itemCur(r)) || 0), 0);
  const now = /* @__PURE__ */ new Date();
  const reportId = "REP-INS-".concat(String(s.id).replace(/-/g, "").slice(0, 8).toUpperCase());
  ghPdfLetterhead(doc, MARGIN, 6, CONTENT_W);
  doc.setFont(void 0, "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text("CONTAINER INSPECTION REPORT", MARGIN, 38);
  doc.setFont(void 0, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(reportId, RIGHT, 36, { align: "right" });
  doc.setFont(void 0, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text(now.toLocaleString("en-KE"), RIGHT, 40.5, { align: "right" });
  doc.setTextColor(20);
  let y = 45;
  infoBox(MARGIN, y, CONTENT_W, 18, [232, 245, 233]);
  kv(MARGIN + 4, y + 8, "Report ID", reportId, GREEN);
  kv(MARGIN + 4, y + 15.5, "Type", "Container Inspection Report", GREEN);
  kv(MARGIN + 95, y + 8, "Generated", fmtDate(now.toISOString()), GREEN);
  kv(MARGIN + 95, y + 15.5, "Printed By", opts.printedBy || "\u2014", GREEN);
  y += 24;
  infoBox(MARGIN, y, CONTENT_W, 10, [219, 234, 254]);
  doc.setFont(void 0, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text("Container Inspection Report", MARGIN + 4, y + 6.7);
  doc.setTextColor(20);
  y += 16;
  sectionHeading("Inspection Information", y);
  y += 8;
  kv(MARGIN, y, "Inspection ID", "#" + String(s.id).slice(0, 8).toUpperCase());
  kv(MARGIN + 63, y, "Inspection Date", fmtDate(s.surveyed_at));
  kv(MARGIN + 126, y, "Status", s.escalated ? "Escalated" : "Completed");
  y += 12;
  kv(MARGIN, y, "Inspection Method", "Manual");
  kv(MARGIN + 63, y, "Overall Condition", conditionStatusLabel(s.condition_status).toUpperCase());
  kv(MARGIN + 126, y, "Surveyed By", s.clerk_name || "\u2014");
  y += 16;
  sectionHeading("Container Information", y);
  y += 8;
  kv(MARGIN, y, "Container Number", s.container);
  kv(MARGIN + 63, y, "Container Type", s.container_type);
  kv(MARGIN + 126, y, "ISO Code", s.iso_code);
  y += 12;
  kv(MARGIN, y, "Customer / Consignee", s.consignee);
  kv(MARGIN + 63, y, "Shipping Line", lineName(s.shipping_line_id));
  kv(MARGIN + 126, y, "Vessel / Voyage", "".concat(s.vessel || "\u2014", " / ").concat(s.voyage || "\u2014"));
  y += 16;
  sectionHeading("Weight & Safety Plate", y);
  y += 8;
  kv(MARGIN, y, "Max Gross Weight (MGW)", s.mgwt ? "".concat(s.mgwt, " kg") : "\u2014");
  kv(MARGIN + 63, y, "Tare Weight (TW)", s.tare_weight ? "".concat(s.tare_weight, " kg") : "\u2014");
  kv(MARGIN + 126, y, "Guarantee / B/L No.", s.bl_number);
  y += 16;
  sectionHeading("Transport & Driver Details", y);
  y += 8;
  kv(MARGIN, y, "Vehicle / Truck No.", s.truck_reg);
  kv(MARGIN + 63, y, "Trailer Number", s.trailer_number);
  kv(MARGIN + 126, y, "Transporter", s.transporter);
  y += 12;
  kv(MARGIN, y, "Driver's Name", s.driver_name);
  kv(MARGIN + 63, y, "Driver ID Number", s.driver_id_number);
  kv(MARGIN + 126, y, "EIR Number", s.eir_number);
  y += 12;
  kv(MARGIN, y, "Seal Number", s.seal_number);
  kv(MARGIN + 63, y, "Gate Pass No.", s.gate_pass_number);
  y += 18;
  const extraVals = window.GargoForms && GargoForms.valuesFromRow ? GargoForms.valuesFromRow("survey", s) : [];
  if (extraVals.length) {
    y = ensureSpace(y, 26);
    sectionHeading("Additional Details", y);
    y += 8;
    extraVals.forEach((x, i) => {
      if (i && i % 3 === 0) {
        y += 12;
        y = ensureSpace(y, 14);
      }
      const v = String(x.value);
      kv(MARGIN + i % 3 * 63, y, x.label, v.length > 34 ? v.slice(0, 33) + "\u2026" : v);
    });
    y += 18;
  }
  y = ensureSpace(y, 24);
  const stripW = CONTENT_W / 3 - 3;
  [
    { label: "DAMAGE REPORTS", value: String(repairs.length) },
    { label: "EST. REPAIR COST", value: GargoMoney.fmt(damageTotal, GargoMoney.itemsCur(repairs)) },
    { label: "CONDITION", value: conditionStatusLabel(s.condition_status).toUpperCase() }
  ].forEach((box, i) => {
    const bx = MARGIN + i * (stripW + 4.5);
    doc.setDrawColor(210);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, stripW, 18, 1.5, 1.5, "S");
    doc.setFont(void 0, "bold");
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(box.value, bx + stripW / 2, y + 8, { align: "center" });
    doc.setFont(void 0, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text(box.label, bx + stripW / 2, y + 14, { align: "center" });
  });
  y += 26;
  if (s.remarks) {
    y = ensureSpace(y, 20);
    sectionHeading("Inspector Notes", y);
    y += 7;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(MARGIN, y - 3, MARGIN, y + 6);
    doc.setFillColor(245, 245, 245);
    doc.rect(MARGIN + 2, y - 4, CONTENT_W - 2, 12, "F");
    doc.setFont(void 0, "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(s.remarks, CONTENT_W - 8);
    doc.text(lines.slice(0, 2), MARGIN + 5, y + 1);
    doc.setTextColor(20);
    y += 16;
  }
  const photoGroups = await collectInspectionPhotos(s);
  const photoSection = (title, list) => {
    if (!list.length) return;
    y = ensureSpace(y, 60);
    sectionHeading("".concat(title, " (").concat(list.length, ")"), y);
    y += 6;
    const cellW = (CONTENT_W - 8) / 3, cellH = 40, capH = 8;
    for (let i = 0; i < list.length; i += 3) {
      y = ensureSpace(y, cellH + capH + 2);
      list.slice(i, i + 3).forEach((ph, c) => {
        const px = MARGIN + c * (cellW + 4);
        doc.setDrawColor(210);
        doc.setLineWidth(0.3);
        doc.rect(px, y, cellW, cellH, "S");
        let drawn = false;
        if (ph.data) {
          try {
            const p = doc.getImageProperties(ph.data), sc = Math.min((cellW - 2) / p.width, (cellH - 2) / p.height), dw = p.width * sc, dh = p.height * sc;
            doc.addImage(ph.data, void 0, px + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh, void 0, "FAST");
            drawn = true;
          } catch (e) {
          }
        }
        if (!drawn) {
          doc.setFont(void 0, "italic");
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text("image unavailable", px + cellW / 2, y + cellH / 2, { align: "center" });
        }
        doc.setFont(void 0, "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(80);
        doc.text(doc.splitTextToSize(String(ph.title || ""), cellW - 1).slice(0, 2), px + 0.5, y + cellH + 3.4);
      });
      y += cellH + capH + 2;
    }
    doc.setTextColor(20);
    y += 4;
  };
  photoSection("Inspection Photos", photoGroups.survey);
  photoSection("Post-Repair Photos", photoGroups.post_repair);
  photoSection("Other Photos", photoGroups.other);
  y = ensureSpace(y, 20);
  sectionHeading("Damage Reports (".concat(repairs.length, ")"), y);
  y += 8;
  if (!repairs.length) {
    doc.setFont(void 0, "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text("No damage items recorded for this container.", MARGIN, y);
    doc.setTextColor(20);
    y += 10;
  } else {
    repairs.forEach((r) => {
      y = ensureSpace(y, 30);
      const price = Number(r.price) || Number(r.material) || Number(r.hours || 0) * GargoMoney.labourRate(GargoMoney.itemCur(r)) || 0;
      doc.setDrawColor(210);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, y, CONTENT_W, 26, 1.5, 1.5, "S");
      doc.setFont(void 0, "bold");
      doc.setFontSize(9);
      doc.setTextColor(20);
      doc.text("".concat(r.item || r.category || "Damage Item"), MARGIN + 3, y + 6);
      doc.setFillColor(219, 234, 254);
      doc.roundedRect(RIGHT - 24, y + 2.5, 20, 5, 1, 1, "F");
      doc.setFont(void 0, "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...BLUE);
      doc.text("MINOR", RIGHT - 14, y + 6, { align: "center" });
      doc.setTextColor(20);
      kv(MARGIN + 3, y + 15, "Location", r.side || "\u2014");
      kv(MARGIN + 63, y + 15, "Damage / Repair Code", r.code || "\u2014");
      kv(MARGIN + 126, y + 15, "Tariff / Repair Price", GargoMoney.fmt(price, GargoMoney.itemCur(r)), [200, 60, 60]);
      y += 30;
    });
  }
  y = ensureSpace(y, 70);
  doc.setDrawColor(20);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, y, CONTENT_W, 20);
  doc.setFont(void 0, "bold");
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.text("Certification", MARGIN + CONTENT_W / 2, y + 6.5, { align: "center" });
  doc.setFont(void 0, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80);
  doc.text(doc.splitTextToSize("This inspection report was generated by GARGO HAVEN DEPOT Ltd and represents an accurate record of the container inspection performed.", CONTENT_W - 8), MARGIN + CONTENT_W / 2, y + 12, { align: "center" });
  y += 26;
  ghPdfSignOff(doc, MARGIN, y, CONTENT_W, { surveyLabel: "Surveyed by", surveyor: s.clerk_name || "", surveyedAt: s.surveyed_at, printedBy: opts.printedBy || "", printedAt: now });
  return { doc, filename: "inspection-report-".concat((s.container || s.id).replace(/\s+/g, ""), ".pdf") };
}
async function downloadInspectionReport(surveyId) {
  const by = await icPrinter(null, "Inspection report");
  if (by === null) return;
  const r = await buildInspectionReport(surveyId, { printedBy: by });
  if (r) r.doc.save(r.filename);
}
async function printInspectionReport(surveyId) {
  const by = await icPrinter(null, "Inspection report");
  if (by === null) return;
  const r = await buildInspectionReport(surveyId, { printedBy: by });
  if (r) ghPrintPdf(r.doc);
}
let _linesFilter = "all";
function filterLines(f, btn) {
  _linesFilter = f;
  document.querySelectorAll("#sec-shippinglines .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderLines(f);
}
const LINE_RATE_GROUPS = [
  { title: "Empty Container Charges", keys: ["lolo", "loloBatch6"] },
  { title: "Service Charge", keys: ["serviceCharge"] },
  { title: "Storage Charge", keys: ["storage"] },
  { title: "Transport Rate", keys: ["transport"] },
  { title: "Reefer Containers", keys: ["reefer"] },
  { title: "Other Charges", keys: ["portPreStack1", "lastMileTransport", "photoCharges"] }
];
const LINE_RATE_KEYS = LINE_RATE_GROUPS.flatMap((g) => g.keys);
function lineServiceDef(key) {
  var _a;
  return (((_a = window.SERVICE_RATE_SCHEDULE) == null ? void 0 : _a.services) || {})[key] || { label: key, unit: "" };
}
function officialServiceRates(code, key) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const sched = window.SERVICE_RATE_SCHEDULE || {};
  const ov = code ? (_a = sched.lineOverrides) == null ? void 0 : _a[String(code).trim().toUpperCase()] : null;
  const base = ((_b = sched.services) == null ? void 0 : _b[key]) || {};
  const ovDef = (_c = ov == null ? void 0 : ov.services) == null ? void 0 : _c[key];
  const freeDays = (_e = (_d = ovDef == null ? void 0 : ovDef.freeDays) != null ? _d : base.freeDays) != null ? _e : null;
  if (!ovDef && (ov == null ? void 0 : ov.currency) && ov.currency !== sched.currency) return { "20ft": null, "40ft": null, freeDays };
  const def = ovDef || base;
  return { "20ft": (_g = (_f = def.rates) == null ? void 0 : _f["20ft"]) != null ? _g : null, "40ft": (_i = (_h = def.rates) == null ? void 0 : _h["40ft"]) != null ? _i : null, freeDays };
}
function lineServiceRates(l, key) {
  var _a, _b, _c, _d;
  const s = (_a = l == null ? void 0 : l.rates) == null ? void 0 : _a[key];
  if (s && typeof s === "object" && ("20ft" in s || "40ft" in s)) {
    return { "20ft": (_b = s["20ft"]) != null ? _b : null, "40ft": (_c = s["40ft"]) != null ? _c : null, freeDays: (_d = s.freeDays) != null ? _d : officialServiceRates(l.code, key).freeDays };
  }
  return officialServiceRates(l == null ? void 0 : l.code, key);
}
function customRowHTML(prefix, key, it) {
  const v = (x) => x == null ? "" : esc(x);
  return '<div class="'.concat(prefix, '-crow" data-key="').concat(esc(key), '" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px">\n    <div class="form-row-2" style="margin-bottom:8px">\n      <div class="fg" style="margin:0"><label>Item name</label><input class="crow-label" value="').concat(v(it.label), '" placeholder="e.g. Gate pass fee"/></div>\n      <div class="fg" style="margin:0"><label>Unit</label><input class="crow-unit" value="').concat(v(it.unit), '" placeholder="per container"/></div>\n    </div>\n    <div class="form-row-2" style="margin-bottom:0">\n      <div class="fg" style="margin:0"><label>20 ft</label><input class="crow-20" type="number" min="0" step="0.01" value="').concat(v(it["20ft"]), '"/></div>\n      <div class="fg" style="margin:0"><label>40 ft</label><input class="crow-40" type="number" min="0" step="0.01" value="').concat(v(it["40ft"]), '"/></div>\n    </div>\n    <button type="button" class="tbl-btn" style="margin-top:8px" onclick="this.closest(\'.').concat(prefix, "-crow').remove()\">Remove item</button>\n  </div>");
}
function customItemsHTML(prefix, l) {
  const items = Object.entries((l == null ? void 0 : l.rates) || {}).filter(([k, v]) => v && v.custom);
  return '<div style="margin:14px 0 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">Custom Billing Items</div>\n    <div id="'.concat(prefix, '_customList">').concat(items.map(([k, v]) => customRowHTML(prefix, k, v)).join(""), '</div>\n    <button type="button" class="tbl-btn" style="margin-bottom:8px" onclick="addCustomLineItem(\'').concat(prefix, "')\">+ Add billing item</button>");
}
function addCustomLineItem(prefix) {
  const key = "custom_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const list = document.getElementById(prefix + "_customList");
  if (list) list.insertAdjacentHTML("beforeend", customRowHTML(prefix, key, {}));
}
function lineRatesFormHTML(prefix, l, code) {
  const val = (v) => v == null ? "" : esc(v);
  const touch = "oninput=\"this.dataset.touched='1'\"";
  return LINE_RATE_GROUPS.map((g) => '\n    <div style="margin:14px 0 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">'.concat(esc(g.title), "</div>\n    ").concat(g.keys.map((key) => {
    const def = lineServiceDef(key);
    const r = l ? lineServiceRates(l, key) : officialServiceRates(code, key);
    return '<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">'.concat(esc(def.label), '</div>\n        <div style="font-size:10.5px;color:var(--text-3);margin:2px 0 8px">').concat(esc(def.unit || "")).concat(def.uponRequestOnly ? " \xB7 upon request only" : "", '</div>\n        <div class="form-row-2" style="margin-bottom:0">\n          <div class="fg" style="margin:0"><label>20 ft</label><input id="').concat(prefix, "_r_").concat(key, '_20" type="number" min="0" step="0.01" value="').concat(val(r["20ft"]), '" ').concat(touch, '/></div>\n          <div class="fg" style="margin:0"><label>40 ft</label><input id="').concat(prefix, "_r_").concat(key, '_40" type="number" min="0" step="0.01" value="').concat(val(r["40ft"]), '" ').concat(touch, "/></div>\n        </div>\n        ").concat(key === "storage" ? '<div class="fg" style="margin:8px 0 0"><label>Free storage period (days) \u2014 rates above apply thereafter</label><input id="'.concat(prefix, '_r_storage_free" type="number" min="0" step="1" value="').concat(val(r.freeDays), '" ').concat(touch, "/></div>") : "", "\n        ").concat(def.note ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:6px">'.concat(esc(def.note), "</div>") : "", "\n      </div>");
  }).join(""))).join("") + customItemsHTML(prefix, l) + '<div style="font-size:10.5px;color:var(--text-3);line-height:1.5;margin-top:2px">Leave a rate blank if that service is not charged for this line. Amounts are in the billing currency chosen above and are never converted.</div>';
}
function readLineRatesForm(prefix, existing, currency, currencyChanged) {
  var _a;
  const out = {};
  let bad = null;
  const num = (id) => {
    var _a2;
    const raw = (((_a2 = document.getElementById(id)) == null ? void 0 : _a2.value) || "").trim();
    if (raw === "") return null;
    const n = parseFloat(raw);
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
  };
  for (const key of LINE_RATE_KEYS) {
    const r20 = num("".concat(prefix, "_r_").concat(key, "_20")), r40 = num("".concat(prefix, "_r_").concat(key, "_40"));
    if (Number.isNaN(r20) || Number.isNaN(r40)) {
      bad = bad || lineServiceDef(key).label;
      continue;
    }
    const entry = { "20ft": r20, "40ft": r40 };
    if (key === "storage") {
      const fd = num("".concat(prefix, "_r_storage_free"));
      if (Number.isNaN(fd)) {
        bad = bad || "Free storage period";
        continue;
      }
      entry.freeDays = fd == null ? null : Math.round(fd);
    }
    const prev = (_a = existing == null ? void 0 : existing[key]) == null ? void 0 : _a.currency;
    entry.currency = !currencyChanged && prev ? prev : currency;
    out[key] = entry;
  }
  document.querySelectorAll("." + prefix + "-crow").forEach((row) => {
    var _a2;
    const label = row.querySelector(".crow-label").value.trim();
    if (!label) return;
    const rd = (sel) => {
      const raw = row.querySelector(sel).value.trim();
      if (raw === "") return null;
      const n = parseFloat(raw);
      return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
    };
    const a = rd(".crow-20"), b = rd(".crow-40");
    if (Number.isNaN(a) || Number.isNaN(b)) {
      bad = bad || label;
      return;
    }
    const key = row.dataset.key;
    const prev = (_a2 = existing == null ? void 0 : existing[key]) == null ? void 0 : _a2.currency;
    out[key] = { label, unit: row.querySelector(".crow-unit").value.trim(), "20ft": a, "40ft": b, currency: !currencyChanged && prev ? prev : currency, custom: true };
  });
  return { rates: out, error: bad ? 'Invalid rate for "'.concat(bad, '" \u2014 use a number of 0 or more') : null };
}
function lineLegacyRates(rates) {
  var _a, _b;
  const r20 = Math.round(Number((_a = rates == null ? void 0 : rates.lolo) == null ? void 0 : _a["20ft"]) || 0), r40 = Math.round(Number((_b = rates == null ? void 0 : rates.lolo) == null ? void 0 : _b["40ft"]) || 0);
  return { rate20: r20, rate40: r40 };
}
function lineCurrencyHint(extra) {
  return '<div style="font-size:11px;color:var(--text-3);margin-top:4px">'.concat(extra, "Rates are never auto-converted \u2014 pick the currency this line actually invoices in (e.g. PIL bills in KES cash).</div>");
}
function showEditLineModal(id) {
  if (!canFinance()) {
    toast("Admin or Finance rights required", "error");
    return;
  }
  const l = state.db.shippingLines.find((x) => x.id === id);
  if (!l) {
    toast("Shipping line not found", "error");
    return;
  }
  const cur = l.currency || (l.code === "PIL" ? "KES" : "USD");
  openModal("Edit ".concat(l.code, " \u2014 ").concat(l.name), '\n    <div class="form-row-2">\n      <div class="fg"><label>Code</label><input id="sle_code" value="'.concat(esc(l.code), '" maxlength="30"/></div>\n      <div class="fg"><label>Full Name</label><input id="sle_name" value="').concat(esc(l.name), '"/></div>\n    </div>\n    <div class="fg"><label>Contact Email</label><input id="sle_email" type="email" value="').concat(esc(l.contact || ""), '"/></div>\n    <div class="fg"><label>Billing Currency</label>\n      <select id="sle_currency"><option value="USD" ').concat(cur === "USD" ? "selected" : "", '>USD (per official schedule)</option><option value="KES" ').concat(cur === "KES" ? "selected" : "", ">KES \u2014 cash</option></select>\n      ").concat(lineCurrencyHint(""), "\n    </div>\n    ").concat(lineRatesFormHTML("sle", l), '\n    <div class="fg" style="margin-top:14px"><label>Status</label><select id="sle_active"><option value="true" ').concat(l.active ? "selected" : "", '>Active</option><option value="false" ').concat(!l.active ? "selected" : "", '>Inactive</option></select></div>\n    <button class="submit-btn" onclick="saveShippingLineEdit(\'').concat(esc(l.id), "')\">Save Changes \u2192</button>\n    ").concat(canFinance() ? '<button class="modal-btn danger" style="width:100%;margin-top:8px" onclick="deleteShippingLine(\''.concat(esc(l.id), "')\">\u{1F5D1} Delete ").concat(esc(l.code), "\u2026</button>") : ""));
}
function showAddLineModal() {
  if (!canFinance()) {
    toast("Admin or Finance rights required", "error");
    return;
  }
  openModal("Add Shipping Line", '\n    <div class="form-row-2">\n      <div class="fg"><label>Code</label><input id="sl_code" placeholder="MSC" maxlength="30" oninput="applyOfficialLineDefaults(this.value)"/></div>\n      <div class="fg"><label>Full Name</label><input id="sl_name" placeholder="Mediterranean Shipping Co."/></div>\n    </div>\n    <div class="fg"><label>Contact Email</label><input id="sl_email" type="email" placeholder="office@line.com"/></div>\n    <div class="fg"><label>Billing Currency</label>\n      <select id="sl_currency" onchange="this.dataset.touched=\'1\'"><option value="USD" selected>USD (per official schedule)</option><option value="KES">KES \u2014 cash</option></select>\n      '.concat(lineCurrencyHint("Rates below start from the official schedule and update as you type the code (e.g. PIL \u2192 KES). Edit any of them. "), "\n    </div>\n    ").concat(lineRatesFormHTML("sl", null, ""), '\n    <button class="submit-btn" onclick="saveShippingLine()">Add Line \u2192</button>'));
}
function applyOfficialLineDefaults(codeRaw) {
  const code = (codeRaw || "").trim().toUpperCase();
  const cur = document.getElementById("sl_currency");
  if (cur && !cur.dataset.touched && typeof getOfficialLineRates === "function") cur.value = getOfficialLineRates(code).currency;
  const fill = (id, v) => {
    const el = document.getElementById(id);
    if (el && !el.dataset.touched) el.value = v == null ? "" : v;
  };
  LINE_RATE_KEYS.forEach((key) => {
    const r = officialServiceRates(code, key);
    fill("sl_r_".concat(key, "_20"), r["20ft"]);
    fill("sl_r_".concat(key, "_40"), r["40ft"]);
    if (key === "storage") fill("sl_r_storage_free", r.freeDays);
  });
}
function renderLines(f) {
  let lines = f === "all" ? state.db.shippingLines : state.db.shippingLines.filter((l) => l.active);
  const unmappedTotal = (state.db.interchange || []).filter((ic) => !ic.line).length;
  const summary = document.getElementById("linesSummary");
  if (summary) {
    summary.innerHTML = '<div class="panel"><div class="panel-head"><span class="panel-title">Summary</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Lines</span><span class="fsr-val">'.concat(state.db.shippingLines.length, '</span></div><div class="fuel-summary-row"><span class="fsr-label">Active</span><span class="fsr-val">').concat(state.db.shippingLines.filter((l) => l.active).length, '</span></div><div class="fuel-summary-row"><span class="fsr-label">Trips (all)</span><span class="fsr-val">').concat(state.db.trips.length, "</span></div>").concat(unmappedTotal ? '<div class="fuel-summary-row"><span class="fsr-label" style="color:var(--gold)">\u26A0 Interchange records with no line</span><span class="fsr-val">'.concat(unmappedTotal, "</span></div>") : "", "</div>");
  }
  const unmappedBtn = document.getElementById("unmappedVesselsBtn");
  if (unmappedBtn) {
    unmappedBtn.style.display = unmappedTotal ? "inline-flex" : "none";
    unmappedBtn.textContent = "\u26A0 Resolve Unmapped Vessels (".concat(unmappedTotal, ")");
  }
  const grid = document.getElementById("linesGrid");
  if (!grid) return;
  grid.innerHTML = lines.map((l) => {
    const cur = lineCurrencySymbol(l);
    const lolo = lineServiceRates(l, "lolo"), trn = lineServiceRates(l, "transport");
    const show = (v) => v == null ? "\u2014" : fmt(v);
    return '<div class="line-card"><div class="line-code-badge">'.concat(esc(l.code), '</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">').concat(esc(l.name), '</div><div style="font-size:11px;color:var(--text-3);margin-bottom:10px">').concat(esc(l.contact || ""), '</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><div class="ts">').concat(cur, " ").concat(show(lolo["20ft"]), '<b>LOLO 20ft</b></div><div class="ts">').concat(cur, " ").concat(show(lolo["40ft"]), '<b>LOLO 40ft</b></div><div class="ts">').concat(cur, " ").concat(show(trn["20ft"]), " / ").concat(show(trn["40ft"]), '<b>Transport 20/40</b></div></div><div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">').concat(sbadge(l.active ? "active" : "off_duty"), '<div style="display:flex;gap:6px"><button class="tbl-btn" onclick="showLineRateCard(\'').concat(esc(l.id), "')\">Rates</button>").concat(canFinance() ? '<button class="tbl-btn" onclick="showEditLineModal(\''.concat(esc(l.id), "')\">\u270E Edit</button>") : "").concat(isAdmin() ? '<button class="tbl-btn" style="color:var(--red)" onclick="deleteShippingLine(\''.concat(esc(l.id), "')\">\u{1F5D1} Delete</button>") : "", "</div></div></div>");
  }).join("") || '<div class="empty-state"><div class="empty-state-label">No shipping lines</div></div>';
}
function showLineRateCard(id) {
  const l = state.db.shippingLines.find((x) => x.id === id);
  if (!l) return;
  const cur = lineCurrencySymbol(l);
  const cell = (v) => v == null ? '<span style="color:var(--text-3)">\u2014</span>' : "".concat(cur, " ").concat(fmt(v));
  const rows = LINE_RATE_GROUPS.map((g) => '<tr><td colspan="3" style="padding:12px 8px 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">'.concat(esc(g.title), "</td></tr>") + g.keys.map((key) => {
    const def = lineServiceDef(key), r = lineServiceRates(l, key);
    const extra = key === "storage" && r.freeDays != null ? '<div style="font-size:10px;color:var(--text-3)">Free for '.concat(esc(r.freeDays), " days, then per day</div>") : def.uponRequestOnly ? '<div style="font-size:10px;color:var(--text-3)">Upon request only</div>' : '<div style="font-size:10px;color:var(--text-3)">'.concat(esc(def.unit || ""), "</div>");
    return '<tr style="border-top:1px solid var(--border)"><td style="padding:7px 8px;font-size:12px">'.concat(esc(def.label)).concat(extra, '</td><td class="mono" style="padding:7px 8px;text-align:right">').concat(cell(r["20ft"]), '</td><td class="mono" style="padding:7px 8px;text-align:right">').concat(cell(r["40ft"]), "</td></tr>");
  }).join("")).join("");
  const customRows = Object.entries(l.rates || {}).filter(([k, v]) => v && v.custom).map(([k, v]) => '<tr style="border-top:1px solid var(--border)"><td style="padding:7px 8px;font-size:12px">'.concat(esc(v.label), '<div style="font-size:10px;color:var(--text-3)">').concat(esc(v.unit || ""), '</div></td><td class="mono" style="padding:7px 8px;text-align:right">').concat(cell(v["20ft"]), '</td><td class="mono" style="padding:7px 8px;text-align:right">').concat(cell(v["40ft"]), "</td></tr>")).join("");
  const customBlock = customRows ? '<tr><td colspan="3" style="padding:12px 8px 4px;font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase">Custom Billing Items</td></tr>' + customRows : "";
  openModal("".concat(esc(l.code), " \u2014 Rate Card"), '\n    <div style="font-size:11.5px;color:var(--text-2);margin-bottom:8px">'.concat(esc(l.name), " \xB7 billed in <b>").concat(esc(l.currency || "USD"), '</b></div>\n    <table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left;color:var(--text-3);font-size:10px;text-transform:uppercase;letter-spacing:1px"><th style="padding:6px 8px">Service</th><th style="padding:6px 8px;text-align:right">20 ft</th><th style="padding:6px 8px;text-align:right">40 ft</th></tr></thead><tbody>').concat(rows, "</tbody></table>\n    ").concat(canFinance() ? '<button class="submit-btn" style="margin-top:14px" onclick="showEditLineModal(\''.concat(esc(l.id), "')\">\u270E Edit this line</button>") : ""));
}
function saveShippingLineEdit(id) {
  if (!canFinance()) {
    toast("Admin or Finance rights required", "error");
    return;
  }
  const l = state.db.shippingLines.find((x) => x.id === id);
  if (!l) {
    toast("Shipping line not found", "error");
    return;
  }
  const code = document.getElementById("sle_code").value.trim().toUpperCase();
  const name = document.getElementById("sle_name").value.trim();
  if (!code || !name) {
    toast("Code and name required", "error");
    return;
  }
  if (code.length > 30) {
    toast("Code must be max 30 characters", "error");
    return;
  }
  const dupLine = findLineByCode(code, id);
  if (dupLine) {
    toast("Code ".concat(code, " is already used by ").concat(dupLine.name), "error");
    return;
  }
  const currency = document.getElementById("sle_currency").value;
  const parsed = readLineRatesForm("sle", l.rates, currency, currency !== (l.currency || "USD"));
  if (parsed.error) {
    toast(parsed.error, "error", 5e3);
    return;
  }
  const before = JSON.stringify(l.rates || {}) + "|" + l.currency;
  l.code = code;
  l.name = name;
  l.contact = sanitize(document.getElementById("sle_email").value.trim());
  l.currency = currency;
  l.rates = parsed.rates;
  Object.assign(l, lineLegacyRates(parsed.rates));
  l.rateHC = l.rate40;
  l.active = document.getElementById("sle_active").value === "true";
  scheduleSave();
  closeModal();
  renderLines(_linesFilter);
  const changedRates = before !== JSON.stringify(l.rates) + "|" + l.currency;
  addAudit(state.profile.username, changedRates ? "Shipping Line Rates Updated" : "Shipping Line Updated", "".concat(code, " \u2014 ").concat(currency, " \xB7 LOLO 20ft ").concat(l.rate20, " / 40ft ").concat(l.rate40));
  toast("".concat(code, " updated"), "success");
}
function saveShippingLine() {
  if (!canFinance()) {
    toast("Admin or Finance rights required", "error");
    return;
  }
  const code = document.getElementById("sl_code").value.trim().toUpperCase();
  const name = document.getElementById("sl_name").value.trim();
  if (!code || !name) {
    toast("Code and name required", "error");
    return;
  }
  if (code.length > 30) {
    toast("Code must be max 30 characters", "error");
    return;
  }
  const dupLine = findLineByCode(code);
  if (dupLine) {
    toast("Code ".concat(code, " is already used by ").concat(dupLine.name), "error");
    return;
  }
  const currency = document.getElementById("sl_currency").value;
  const parsed = readLineRatesForm("sl", null, currency, true);
  if (parsed.error) {
    toast(parsed.error, "error", 5e3);
    return;
  }
  const legacy = lineLegacyRates(parsed.rates);
  state.db.shippingLines.push({
    id: uid("SL"),
    code,
    name,
    contact: sanitize(document.getElementById("sl_email").value.trim()),
    currency,
    rates: parsed.rates,
    rate20: legacy.rate20,
    rate40: legacy.rate40,
    rateHC: legacy.rate40,
    active: true
  });
  scheduleSave();
  closeModal();
  renderLines("all");
  addAudit(state.profile.username, "Shipping Line Added", "".concat(code, " \u2014 ").concat(name, " (").concat(currency, ")"));
  toast("".concat(code, " added"), "success");
}
async function setShippingLineActive(id, active) {
  const l = state.db.shippingLines.find((x) => x.id === id);
  if (!l || !canFinance()) return;
  l.active = active;
  scheduleSave();
  closeModal();
  renderLines(_linesFilter);
  addAudit(state.profile.username, active ? "Shipping Line Activated" : "Shipping Line Deactivated", l.code);
  toast("".concat(l.code, " marked ").concat(active ? "active" : "inactive"), "success");
}
function deleteShippingLine(id) {
  if (!canFinance()) {
    toast("Admin or Finance rights required to delete shipping lines", "error");
    return;
  }
  const l = state.db.shippingLines.find((x) => x.id === id);
  if (!l) {
    toast("Shipping line not found", "error");
    return;
  }
  openModal("Delete ".concat(esc(l.code)), '\n    <div class="vault-banner"><div class="vault-banner-label">\u26A0 IRREVERSIBLE ACTION</div><div class="vault-banner-desc">Permanently delete <b>'.concat(esc(l.code), " \u2014 ").concat(esc(l.name), '</b> and its rate card. Trips, bookings, interchange and other records that used it are kept, but will show no shipping line.</div></div>\n    <div style="display:flex;gap:8px;margin-top:12px"><button class="modal-btn danger" onclick="executeDeleteShippingLine(\'').concat(esc(l.id), "')\">Delete ").concat(esc(l.code), '</button><button class="modal-btn ghost" onclick="closeModal()">Cancel</button></div>'));
}
async function executeDeleteShippingLine(id) {
  if (!canFinance()) {
    toast("Admin or Finance rights required", "error");
    return;
  }
  const idx = state.db.shippingLines.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const l = state.db.shippingLines[idx];
  const missing = (e) => e && (e.code === "PGRST205" || e.code === "42P01" || /does not exist|schema cache/i.test(e.message || ""));
  const detach = [
    ["trips", "shipping_line_id"],
    ["public_bookings", "shipping_line_id"],
    ["interchange", "line_id"],
    ["shutouts", "line_id"],
    ["vessel_prestaking", "line_id"],
    ["container_repairs", "line_id"],
    ["depot_storage_zones", "shipping_line_id"],
    ["depot_surveys", "shipping_line_id"]
  ];
  const remove = [["shipping_line_users", "shipping_line_id"], ["vessel_line_map", "line_id"], ["shipping_line_rate_overrides", "line_id"]];
  for (const [table, col] of detach) {
    const { error: error2 } = await supabase.from(table).update({ [col]: null }).eq(col, id);
    if (error2 && !missing(error2)) {
      toast("Could not detach ".concat(table, " \u2014 ").concat(error2.message), "error", 8e3);
      return;
    }
  }
  for (const [table, col] of remove) {
    const { error: error2 } = await supabase.from(table).delete().eq(col, id);
    if (error2 && !missing(error2)) {
      toast("Could not clear ".concat(table, " \u2014 ").concat(error2.message), "error", 8e3);
      return;
    }
  }
  const { data, error } = await supabase.from("shipping_lines").delete().eq("id", id).select("id");
  if (error) {
    toast("Could not delete \u2014 ".concat(error.message), "error", 8e3);
    return;
  }
  if (!data || !data.length) {
    toast("Nothing was deleted \u2014 you may not have permission (Supabase RLS), or it is already gone", "error", 8e3);
    return;
  }
  const clear = (arr, k) => (arr || []).forEach((r) => {
    if (r[k] === id) {
      r[k] = "";
      r._dirty = true;
    }
  });
  clear(state.db.trips, "shippingLine");
  clear(state.db.shutouts, "line");
  clear(state.db.interchange, "line");
  clear(state.db.vesselPrestaking, "line");
  clear(state.db.containerRepairs, "line");
  state.db.shippingLines.splice(idx, 1);
  state.db.vesselLineMap = (state.db.vesselLineMap || []).filter((m) => (m.line || m.lineId || m.line_id) !== id);
  addAudit(state.profile.username, "Shipping Line Deleted", "".concat(l.code, " \u2014 ").concat(l.name));
  closeModal();
  renderLines(_linesFilter);
  toast("".concat(l.code, " deleted"), "success");
}
const UNRESOLVABLE_VESSEL_VALUES = /* @__PURE__ */ new Set(["", "N/A", "NA", "N.A", "N./A", "N\\A", "TBA", "T.B.A", "TO BE ADVISED", "NOT CAPTURED", "DUMMY", "EMPTY DUMMY", "EMPTY DUMMY VESSEL", "N"]);
function _unmappedVesselGroups() {
  const groups = {};
  (state.db.interchange || []).forEach((ic) => {
    if (ic.line) return;
    const norm = normVessel(ic.vessel);
    if (UNRESOLVABLE_VESSEL_VALUES.has(norm)) return;
    groups[norm] = groups[norm] || { vessel: norm, count: 0, ids: [] };
    groups[norm].count++;
    groups[norm].ids.push(ic.id);
  });
  return Object.values(groups).sort((a, b) => b.count - a.count);
}
async function assignVesselToLine(idx) {
  var _a, _b, _c;
  const group = (window._uvmGroups || [])[idx];
  const sel = document.getElementById("uvm_sel_".concat(idx));
  const lineId = sel ? sel.value : "";
  if (!group) return;
  if (!lineId) {
    toast("Choose a shipping line first", "error");
    return;
  }
  const line = state.db.shippingLines.find((l) => l.id === lineId);
  if (!line) {
    toast("Shipping line not found", "error");
    return;
  }
  const row = document.getElementById("uvm_row_".concat(idx));
  const btn = row ? row.querySelector("button") : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Assigning\u2026";
  }
  try {
    const { error } = await supabase.from("interchange").update({ line_id: lineId }).is("line_id", null).in("id", group.ids);
    if (error) throw error;
    const { data: inserted, error: mapErr } = await supabase.from("vessel_line_map").insert({ pattern: group.vessel, match_type: "exact", line_id: lineId, priority: 100, source: "manual", created_by: ((_a = state.profile) == null ? void 0 : _a.username) || null }).select("*").single();
    if (!mapErr && inserted) state.db.vesselLineMap.push(vlmFromRow(inserted));
    const idSet = new Set(group.ids);
    state.db.interchange.forEach((ic) => {
      if (idSet.has(ic.id)) ic.line = lineId;
    });
    addAudit(state.profile.username, "Shipping Line Backfilled", "".concat(group.count, ' record(s) with vessel "').concat(group.vessel, '" \u2192 ').concat(line.code));
    toast("".concat(group.count, " record(s) assigned to ").concat(line.code), "success");
    if (row) row.remove();
    buildBadges();
    renderLines(_linesFilter);
    if ((_b = document.getElementById("sec-depotreport")) == null ? void 0 : _b.classList.contains("active")) renderDepotReport();
    if ((_c = document.getElementById("sec-depops")) == null ? void 0 : _c.classList.contains("active")) renderDepOpsReports();
  } catch (e) {
    console.error("assignVesselToLine failed:", e);
    toast("Could not save \u2014 try again", "error");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Assign \u2192";
    }
  }
}
function showContainerDetail(contRaw) {
  const cont = (contRaw || "").trim().toUpperCase();
  const db = state.db;
  const trips = db.trips.filter((t) => (t.container || "").toUpperCase() === cont).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const shutouts = db.shutouts.filter((s) => (s.container || "").toUpperCase() === cont).sort((a, b) => new Date(b.date) - new Date(a.date));
  const interchange = db.interchange.filter((i) => (i.container || "").toUpperCase() === cont).sort((a, b) => new Date(b.date) - new Date(a.date));
  const liveTrip = trips.find(isTripLive) || null;
  if (!trips.length && !shutouts.length && !interchange.length) {
    openModal("Container \u2014 ".concat(cont), '<div class="empty-state"><div class="empty-state-icon">\u{1F4E6}</div><div class="empty-state-label">No records found for '.concat(cont, "</div></div>"));
    return;
  }
  const summary = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">\n    <div class="mono" style="font-size:18px;color:var(--gold);font-weight:700">'.concat(cont, "</div>\n    ").concat(liveTrip ? sbadge(liveTrip.status) : '<span style="font-size:11px;color:var(--text-3)">No active trip</span>', "\n  </div>");
  const tripsHtml = '<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip History ('.concat(trips.length, ")</div>") + (trips.length ? trips.map((t) => '<div class="activity-row" style="cursor:pointer" onclick="closeModal();showTripDetail(\''.concat(t.id, '\')"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">').concat(t.origin, " \u2192 ").concat(t.dest, '</div><div style="font-size:10px;color:var(--text-3)">').concat(truckName(t.truckId), " \xB7 ").concat(driverName(t.driverId), "</div></div>").concat(sbadge(t.status), '<div class="act-time">').concat(fmtDate(t.startTime), "</div></div>")).join("") : '<div class="empty-state" style="padding:10px 0"><div class="empty-state-label">No trips recorded</div></div>');
  const shutoutsHtml = shutouts.length ? '<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Shutout History ('.concat(shutouts.length, ")</div>") + shutouts.map((s) => {
    const sthumb = s.img ? '<img src="'.concat(s.img, '" style="width:44px;height:44px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:pointer;flex-shrink:0" onclick="openPhotoLightbox(\'').concat(s.img, "')\" />") : '<div style="width:44px;height:44px;border-radius:5px;border:1px dashed var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:16px">\u{1F4E6}</div>';
    return '<div class="activity-row" style="align-items:flex-start;gap:10px">'.concat(sthumb, '<div style="flex:1"><div style="font-size:11.5px;color:var(--text)">').concat(s.reason || "\u2014", '</div><div style="font-size:10px;color:var(--text-3)">').concat(s.vessel || "", " ").concat(s.voyage ? "\xB7 Voyage ".concat(s.voyage) : "", "</div></div>").concat(sbadge(s.status), '<div class="act-time">').concat(fmtDate(s.date), "</div></div>");
  }).join("") : "";
  const interchangeHtml = interchange.length ? '<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Interchange History ('.concat(interchange.length, ")</div>") + interchange.map((i) => {
    const meta = [i.eirNumber ? "EIR ".concat(i.eirNumber) : null, i.vessel || i.voyage ? "".concat(i.vessel || "\u2014", " / ").concat(i.voyage || "\u2014") : null].filter(Boolean).join(" \xB7 ");
    const repairBadge = i.repairs && i.repairs.length ? '<div style="font-size:10.5px;color:var(--red);margin-top:2px">'.concat(i.repairs.length, " damage item").concat(i.repairs.length > 1 ? "s" : "", " \xB7 ").concat(GargoMoney.fmt(i.repairTotal || 0, GargoMoney.itemsCur(i.repairs)), "</div>") : "";
    const thumb = i.img ? '<img src="'.concat(i.img, '" style="width:44px;height:44px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:pointer;flex-shrink:0" onclick="showContainerPhotos(\'').concat(i.id, "')\" />") : '<div style="width:44px;height:44px;border-radius:5px;border:1px dashed var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:16px">\u{1F4E6}</div>';
    return '<div class="activity-row" style="align-items:flex-start;gap:10px">'.concat(thumb, '<div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:11.5px;color:var(--text)">').concat(i.type, " \xB7 ").concat(i.condition, "</div>").concat(sbadge(i.status), '</div><div style="font-size:10px;color:var(--text-3)">').concat(lineName(i.line), " \xB7 ").concat(fmtDate(i.date), "</div>").concat(meta ? '<div style="font-size:10px;color:var(--text-3);margin-top:2px">'.concat(meta, "</div>") : "").concat(repairBadge).concat(i.notes ? '<div style="font-size:10.5px;color:var(--text-3);margin-top:3px">'.concat(i.notes, "</div>") : "", '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">').concat(i.surveyId || i.img ? '<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="showContainerPhotos(\''.concat(i.id, "')\">\u{1F4F7} Photos</button>") : "").concat(i.surveyId ? '<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInspectionReport(\''.concat(i.surveyId, '\')">\u2B07 Inspection Report</button><button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="printInspectionReport(\'').concat(i.surveyId, '\')" title="Print">\u{1F5A8} Print Report</button>') : "", '<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInterchangeSlip(\'').concat(i.id, '\')">\u2B07 Slip</button><button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="printInterchangeSlip(\'').concat(i.id, '\')" title="Print">\u{1F5A8} Print</button></div></div></div>');
  }).join("") : "";
  const actions = [];
  if (liveTrip && canUpdateTripStatus(liveTrip)) {
    nextTripStatuses(liveTrip.status).forEach((s) => {
      actions.push('<button class="filter-btn" onclick="closeModal();quickSetTripStatus(\''.concat(liveTrip.id, "','").concat(s, "')\">").concat(s.replace("_", " "), "</button>"));
    });
  }
  if (liveTrip) actions.push('<button class="modal-btn ghost" onclick="closeModal();showTripDetail(\''.concat(liveTrip.id, "')\">View Trip \u2192</button>"));
  if (isAdmin() || isClerk() || isDispatch()) {
    actions.push('<button class="modal-btn ghost" onclick="closeModal();showAddShutoutModal()">Flag Shutout</button>');
    actions.push('<button class="modal-btn ghost" onclick="closeModal();showAddInterchangeModal()">Record Interchange</button>');
  }
  const actionsHtml = actions.length ? '<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:14px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Actions</div><div style="display:flex;gap:6px;flex-wrap:wrap">'.concat(actions.join(""), "</div></div>") : "";
  openModal("Container \u2014 ".concat(cont), "".concat(summary).concat(tripsHtml).concat(shutoutsHtml).concat(interchangeHtml).concat(actionsHtml));
}
let _chIndex = null;
function refreshContainerHistory() {
  _chIndex = null;
  const dl = document.getElementById("containerHistory");
  if (dl && dl.firstChild) dl.innerHTML = "";
}
function _chBuild() {
  const labels = /* @__PURE__ */ new Map();
  const tag = (c, label) => {
    if (c && !labels.has(c)) labels.set(c, label);
  };
  (state.db.trips || []).forEach((t) => {
    if (!t.container) return;
    tag(t.container, t.bookingId ? "Public Booking" : t.notes && /bulk/i.test(t.notes) ? "Bulk Upload" : "Dispatch");
  });
  (state.db.shutouts || []).forEach((s) => {
    tag(s.container, "Shutout");
  });
  (state.db.interchange || []).forEach((i) => {
    tag(i.container, "Interchange");
  });
  _chIndex = [...labels.keys()].sort().map((c) => [c.toUpperCase(), c, labels.get(c)]);
}
function _chFill(q) {
  const dl = document.getElementById("containerHistory");
  if (!dl) return;
  q = String(q || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (q.length < 2) {
    if (dl.firstChild) dl.innerHTML = "";
    return;
  }
  if (!_chIndex) _chBuild();
  const starts = [], inside = [];
  for (let k = 0; k < _chIndex.length && starts.length < 30; k++) {
    const e = _chIndex[k], p = e[0].replace(/[^A-Z0-9]/g, "").indexOf(q);
    if (p === 0) starts.push(e);
    else if (p > 0 && inside.length < 30) inside.push(e);
  }
  dl.innerHTML = starts.concat(inside).slice(0, 30).map((e) => '<option value="'.concat(esc(e[1]), '">').concat(esc(e[2]), "</option>")).join("");
}
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el && el.getAttribute && el.getAttribute("list") === "containerHistory") _chFill(el.value);
}, true);
function resolveBookingShippingLineId(booking) {
  if (!booking) return null;
  if (booking.shipping_line_id && state.db.shippingLines.some((l) => l.id === booking.shipping_line_id)) {
    return booking.shipping_line_id;
  }
  const raw = (booking.shipping_line || "").trim().toLowerCase();
  if (!raw) return null;
  const match = state.db.shippingLines.find(
    (l) => (l.code || "").toLowerCase() === raw || (l.name || "").toLowerCase() === raw || (l.name || "").toLowerCase().includes(raw) || raw.includes((l.name || "").toLowerCase())
  );
  return match ? match.id : null;
}
const REPAIR_LABOUR_RATE_PER_HOUR = 300;
function repairItemsFor(prefix) {
  return window._repairItems[prefix] || (window._repairItems[prefix] = []);
}
function repairItemsTotal(items) {
  return (items || []).reduce((sum, r) => sum + Number(r.hours || 0) * GargoMoney.labourRate(GargoMoney.itemCur(r)) + Number(r.material || 0), 0);
}
function tariffMode(prefix) {
  try {
    if (window.PIL_TARIFF_SCHEDULE && window.GargoMoney && GargoMoney.curFor(prefix) === "KES") return "PIL";
  } catch (e) {
  }
  return "GHD";
}
function tariffFor(prefix) {
  return (tariffMode(prefix) === "PIL" ? window.PIL_TARIFF_SCHEDULE : window.bookingDocs && window.bookingDocs.TARIFF_SCHEDULE) || {};
}
function _tariffCatOptions(prefix) {
  return Object.keys(tariffFor(prefix)).sort().map((c) => "<option>".concat(esc(c), "</option>")).join("");
}
function _tariffNote(prefix) {
  if (tariffMode(prefix) !== "PIL") return "";
  const want = Number((window.PIL_TARIFF_META || {}).labourRate) || 550;
  const have = window.GargoMoney && GargoMoney.labourRate ? GargoMoney.labourRate("KES") : 0;
  const warn = have !== want ? ' <span style="color:var(--amber)">Labour rate is set to KSh '.concat(have, "/hr but this tariff is built for KSh ").concat(want, "/hr, so totals will not match the PIL price list. An administrator sets it in Settings &rarr; Form Designer &rarr; Rules.</span>") : "";
  return "PIL tariff (KES): labour at KSh ".concat(want, "/hr plus material.").concat(warn);
}
function refreshTariffPicker(prefix) {
  const sel = document.getElementById("".concat(prefix, "_tcat"));
  if (!sel) return;
  const mode = tariffMode(prefix);
  if (sel.getAttribute("data-tariff") !== mode) {
    sel.setAttribute("data-tariff", mode);
    sel.innerHTML = '<option value="">\u2014</option>' + _tariffCatOptions(prefix);
    const codeSel = document.getElementById("".concat(prefix, "_tcode"));
    if (codeSel) codeSel.innerHTML = '<option value="">Select category first\u2026</option>';
    _tariffFill(prefix, null, "");
    const box = document.getElementById("".concat(prefix, "_tsearch"));
    if (box) box.value = "";
    const out = document.getElementById("".concat(prefix, "_tsearchResults"));
    if (out) {
      out.style.display = "none";
      out.innerHTML = "";
    }
  }
  const note = document.getElementById("".concat(prefix, "_tnote"));
  if (note) {
    const t = _tariffNote(prefix);
    note.innerHTML = t;
    note.style.display = t ? "block" : "none";
  }
  const wrap = document.getElementById("".concat(prefix, "_tsavewrap"));
  if (wrap) wrap.style.display = mode === "PIL" ? "none" : "flex";
}
function tariffPickerHtml(prefix) {
  const categoryOptions = _tariffCatOptions(prefix);
  const canSave = typeof canEditTariffCatalog === "function" && canEditTariffCatalog();
  return '\n    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:16px 0 8px;display:flex;justify-content:space-between;align-items:center">\n      <span>Damage / Repair Items</span>\n      '.concat(canSave ? '<button type="button" class="modal-btn ghost" style="padding:2px 8px;font-size:10px" onclick="openTariffCatalogEditor()">Edit tariff codes</button>' : "", '\n    </div>\n    <div class="fg"><label>Search tariff <span class="label-optional">(code or words, e.g. cold wash, D10)</span></label>\n      <input id="').concat(prefix, '_tsearch" autocomplete="off" placeholder="Type to search every category\u2026" oninput="onTariffSearch(\'').concat(prefix, '\')" />\n      <div id="').concat(prefix, '_tsearchResults" style="display:none;max-height:170px;overflow:auto;border:1px solid var(--border);border-radius:6px;margin-top:4px"></div>\n    </div>\n    <div id="').concat(prefix, '_tnote" style="display:none;font-size:11px;color:var(--text-2);margin:-2px 0 8px"></div>\n    <div class="form-row-2">\n      <div class="fg"><label>Category</label><select id="').concat(prefix, '_tcat" data-tariff="').concat(tariffMode(prefix), '" onchange="onRepairCategoryChange(\'').concat(prefix, '\')"><option value="">\u2014</option>').concat(categoryOptions, '</select></div>\n      <div class="fg"><label>Code / Item</label><select id="').concat(prefix, '_tcode" onchange="onRepairCodeChange(\'').concat(prefix, '\')"><option value="">Select category first\u2026</option></select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Code</label><input id="').concat(prefix, '_tcodetext" placeholder="Auto-filled \u2014 or type your own" /></div>\n      <div class="fg"><label>Description</label><input id="').concat(prefix, '_titem" placeholder="Auto-filled \u2014 editable" /></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Hours</label><input id="').concat(prefix, '_thours" type="number" step="0.1" min="0" placeholder="0" /></div>\n      <div class="fg"><label>Material (<span class="gx-cur" data-cur-for="').concat(prefix, '">USD</span>)</label><input id="').concat(prefix, '_tmaterial" type="number" step="0.01" min="0" placeholder="0" /></div>\n    </div>\n    <div class="fg"><label>Quantity <span class="label-optional">(how many of this item, e.g. 2 &mdash; or type "ABCD x2" in the search box)</span></label><input id="').concat(prefix, '_tqty" type="number" min="1" step="1" value="1" style="max-width:120px" /></div>\n    ').concat(canSave ? '<label id="'.concat(prefix, '_tsavewrap" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-2);margin-bottom:8px"><input type="checkbox" id="').concat(prefix, '_tsavecat" /> Also save this to the tariff catalog for next time</label>') : "", '\n    <button type="button" class="modal-btn ghost" style="margin-bottom:8px" onclick="addRepairItem(\'').concat(prefix, '\')">+ Add item</button>\n    <div id="').concat(prefix, '_repairList"></div>');
}
function _tariffRows(cat, prefix) {
  return tariffFor(prefix)[cat] || [];
}
function _tariffFill(prefix, row, cat) {
  const set = (id, v) => {
    const e = document.getElementById("".concat(prefix, "_").concat(id));
    if (e) e.value = v;
  };
  set("tcodetext", row ? row.code : "");
  set("titem", row ? row.item : "");
  set("thours", row ? row.hours : "");
  set("tmaterial", row ? row.material : "");
}
function _splitQty(text) {
  const m = String(text || "").match(/^(.*?)\s*[x\u00d7*]\s*(\d{1,3})\s*$/i);
  if (!m || !m[1].trim()) return { text: String(text || ""), qty: null };
  const q = parseInt(m[2], 10);
  return q >= 1 ? { text: m[1].trim(), qty: q } : { text: String(text || ""), qty: null };
}
function onTariffSearch(prefix) {
  const box = document.getElementById("".concat(prefix, "_tsearch"));
  const out = document.getElementById("".concat(prefix, "_tsearchResults"));
  if (!box || !out) return;
  const sq = _splitQty(box.value);
  if (sq.qty) {
    const qe = document.getElementById("".concat(prefix, "_tqty"));
    if (qe) qe.value = sq.qty;
  }
  const terms = sq.text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) {
    out.style.display = "none";
    out.innerHTML = "";
    return;
  }
  const hits = [];
  const sched = tariffFor(prefix);
  Object.keys(sched).forEach((cat) => sched[cat].forEach((row, idx) => {
    const hay = "".concat(row.code, " ").concat(row.item, " ").concat(cat).toLowerCase();
    if (terms.every((t) => hay.indexOf(t) !== -1)) hits.push({ cat, idx, row });
  }));
  if (!hits.length) {
    out.innerHTML = '<div style="padding:8px;font-size:11px;color:var(--text-3)">No match \u2014 fill in the code, description, hours and material below to add a one-off item.</div>';
    out.style.display = "block";
    return;
  }
  out.innerHTML = hits.slice(0, 40).map((h) => '<div class="tariff-hit" style="padding:6px 8px;font-size:11.5px;cursor:pointer;border-top:1px solid var(--border)" data-cat="'.concat(esc(h.cat), '" onclick="pickTariffHit(\'').concat(prefix, "',this.dataset.cat,").concat(h.idx, ')"><span class="mono" style="color:var(--gold)">').concat(esc(h.row.code), "</span> \u2014 ").concat(esc(h.row.item), ' <span style="color:var(--text-3)">\xB7 ').concat(esc(h.cat), "</span></div>")).join("") + (hits.length > 40 ? '<div style="padding:6px 8px;font-size:10.5px;color:var(--text-3)">'.concat(hits.length - 40, " more \u2014 keep typing to narrow it down.</div>") : "");
  out.style.display = "block";
}
function pickTariffHit(prefix, cat, idx) {
  const catSel = document.getElementById("".concat(prefix, "_tcat"));
  if (catSel) {
    catSel.value = cat;
    onRepairCategoryChange(prefix);
  }
  const codeSel = document.getElementById("".concat(prefix, "_tcode"));
  if (codeSel) codeSel.value = String(idx);
  _tariffFill(prefix, _tariffRows(cat, prefix)[idx], cat);
  const out = document.getElementById("".concat(prefix, "_tsearchResults"));
  if (out) out.style.display = "none";
}
function onRepairCategoryChange(prefix) {
  const cat = document.getElementById("".concat(prefix, "_tcat")).value;
  const codeSel = document.getElementById("".concat(prefix, "_tcode"));
  const rows = _tariffRows(cat, prefix);
  _tariffFill(prefix, null, cat);
  codeSel.innerHTML = rows.length ? '<option value="">Select\u2026</option>' + rows.map((r, i) => '<option value="'.concat(i, '">').concat(esc(r.code), " \u2014 ").concat(esc(r.item), "</option>")).join("") : '<option value="">Select category first\u2026</option>';
}
function onRepairCodeChange(prefix) {
  const cat = document.getElementById("".concat(prefix, "_tcat")).value;
  const idx = document.getElementById("".concat(prefix, "_tcode")).value;
  _tariffFill(prefix, _tariffRows(cat, prefix)[idx], cat);
}
function addRepairItem(prefix) {
  const val = (id) => {
    const e = document.getElementById("".concat(prefix, "_").concat(id));
    return e ? e.value.trim() : "";
  };
  const cat = val("tcat");
  const cq = _splitQty(val("tcodetext"));
  const code = cq.text.trim();
  const item = val("titem");
  let qty = parseInt(val("tqty"), 10) || 1;
  if (cq.qty) qty = cq.qty;
  qty = Math.min(999, Math.max(1, qty));
  if (!code && !item) {
    toast("Pick a tariff code, or type a code and description", "error");
    return;
  }
  if (!item) {
    toast("Add a description for this item", "error");
    return;
  }
  const hours = Math.max(0, parseFloat(val("thours")) || 0);
  const material = Math.max(0, parseFloat(val("tmaterial")) || 0);
  const r2 = (n) => Math.round(n * 100) / 100;
  const entry = { category: cat || "CUSTOM", code: sanitize(code) || "CUSTOM", item: sanitize(item), hours: r2(hours * qty), material: r2(material * qty), qty, unitHours: hours, unitMaterial: material, currency: GargoMoney.curFor(prefix) };
  const picked = _tariffRows(cat, prefix)[val("tcode")];
  if (!picked) entry.custom = true;
  repairItemsFor(prefix).push(entry);
  const save = document.getElementById("".concat(prefix, "_tsavecat"));
  if (save && save.checked && tariffMode(prefix) !== "PIL" && typeof saveTariffCatalogEntry === "function") {
    saveTariffCatalogEntry({ category: entry.category, code: entry.code, item: entry.item, hours, material }).catch(() => {
    });
    save.checked = false;
  }
  ["tsearch", "tcodetext", "titem", "thours", "tmaterial"].forEach((id) => {
    const e = document.getElementById("".concat(prefix, "_").concat(id));
    if (e) e.value = "";
  });
  const codeSel = document.getElementById("".concat(prefix, "_tcode"));
  if (codeSel) codeSel.value = "";
  const qtyEl = document.getElementById("".concat(prefix, "_tqty"));
  if (qtyEl) qtyEl.value = "1";
  renderRepairItemsList(prefix);
}
function setRepairQty(prefix, i, raw) {
  const r = repairItemsFor(prefix)[i];
  if (!r) return;
  const q = Math.min(999, Math.max(1, parseInt(raw, 10) || 1));
  const oldQ = Number(r.qty) || 1;
  const uh = r.unitHours != null ? Number(r.unitHours) : (Number(r.hours) || 0) / oldQ;
  const um = r.unitMaterial != null ? Number(r.unitMaterial) : (Number(r.material) || 0) / oldQ;
  const r2 = (n) => Math.round(n * 100) / 100;
  r.unitHours = uh;
  r.unitMaterial = um;
  r.qty = q;
  r.hours = r2(uh * q);
  r.material = r2(um * q);
  renderRepairItemsList(prefix);
}
function removeRepairItem(prefix, i) {
  repairItemsFor(prefix).splice(i, 1);
  renderRepairItemsList(prefix);
}
function renderRepairItemsList(prefix) {
  const el = document.getElementById("".concat(prefix, "_repairList"));
  if (!el) return;
  GargoMoney.refreshLabels();
  refreshTariffPicker(prefix);
  const items = repairItemsFor(prefix);
  if (!items.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-3)">No damage items added \u2014 container will be logged as good condition.</div>';
    return;
  }
  const rows = items.map((r, i) => '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--border)">\n    <div style="font-size:11.5px"><span class="mono" style="color:var(--gold)">'.concat(esc(r.code), "</span> \u2014 ").concat(esc(r.item)).concat(r.side ? ' <span style="color:var(--text-3)">('.concat(esc(r.side), ")</span>") : "").concat(r.custom ? ' <span class="sbadge s-pending" style="font-size:9px">custom</span>' : "", '</div>\n    <div style="font-size:11px;color:var(--text-2);display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end"><label style="display:inline-flex;align-items:center;gap:3px">&times;<input type="number" min="1" max="999" step="1" value="').concat(Number(r.qty) || 1, '" onchange="setRepairQty(\'').concat(prefix, "',").concat(i, ',this.value)" style="width:52px;min-height:0;padding:2px 4px;font-size:12px" title="Quantity"/></label>').concat(esc(r.hours), "h \xB7 ").concat(GargoMoney.sym(GargoMoney.itemCur(r)), " ").concat(Number(r.material).toLocaleString(), ' <button type="button" class="modal-btn danger" style="padding:2px 8px;margin-left:8px" onclick="removeRepairItem(\'').concat(prefix, "',").concat(i, ')">\u2715</button></div>\n  </div>')).join("");
  const total = repairItemsTotal(items);
  el.innerHTML = rows + '<div style="display:flex;justify-content:space-between;padding-top:8px;font-weight:700;font-size:12px">\n    <span>Total (labour @ '.concat(GargoMoney.sym(GargoMoney.itemsCur(items)), " ").concat(GargoMoney.labourRate(GargoMoney.itemsCur(items)), "/hr + material)</span><span>").concat(GargoMoney.fmt(total, GargoMoney.itemsCur(items)), "</span>\n  </div>").concat(GargoMoney.labourWarning(items));
}
function _tripToInterchangeReportRow(t) {
  const outward = isOutwardWorkType(t.workType);
  return {
    id: t.id,
    container: t.container,
    type: outward ? "Gate-Out" : "Gate-In",
    ctype: t.ctype || "",
    line: t.shippingLine || "",
    condition: "",
    truck: t.truckId || "",
    driver: t.driverId || "",
    status: t.status === "completed" ? "approved" : "pending",
    repairTotal: 0,
    date: outward ? t.dateOut || t.startTime : t.startTime,
    notes: t.notes || "",
    _reportSource: "trips"
  };
}
const IC_EDIT_FIELDS = [
  ["container", "Container No."],
  ["ctype", "Type / Size"],
  ["line", "Shipping Line"],
  ["date", "Date"],
  ["condition", "Condition / Status"],
  ["vessel", "Vessel"],
  ["voyage", "Voyage"],
  ["blNumber", "Guarantee / B/L No."],
  ["deliveringParty", "Consignee / C&F"],
  ["receivingParty", "Receiving Party"],
  ["releaseOrderNo", "Release Order No."],
  ["transporter", "Transporter"],
  ["truck", "Truck"],
  ["driver", "Driver"],
  ["driverIdNumber", "Driver ID No."],
  ["trailerNo", "Trailer No."],
  ["isoCode", "ISO Code"],
  ["grossWeight", "Gross Weight"],
  ["manufactureDate", "Date of Manufacture"],
  ["cargoStatus", "Cargo Status"],
  ["clerkName", "Clerk"],
  ["notes", "Notes"]
];
function _icLocalInput(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return "".concat(d.getFullYear(), "-").concat(p(d.getMonth() + 1), "-").concat(p(d.getDate()), "T").concat(p(d.getHours()), ":").concat(p(d.getMinutes()));
}
async function showEditInterchangeModal(icId) {
  if (!isAdmin()) {
    toast("Only an administrator can edit interchange details", "error");
    return;
  }
  let ic = null;
  try {
    ic = window.ICR && ICR.enabled ? await ICR.ensurePhotos(icId) : state.db.interchange.find((i) => i.id === icId);
  } catch (e) {
    console.warn("edit: could not load photos", e);
  }
  if (!ic) ic = state.db.interchange.find((i) => i.id === icId);
  if (!ic) {
    toast("Interchange record not found", "error");
    return;
  }
  if (ic._light) {
    toast("Could not load the full record. Check the connection and try again.", "error");
    return;
  }
  const v = (x) => esc(x == null ? "" : x);
  const lineOpts = '<option value="">\u2014</option>' + state.db.shippingLines.map((l) => '<option value="'.concat(esc(l.id), '" ').concat(l.id === ic.line ? "selected" : "", ">").concat(esc(l.code), " \u2014 ").concat(esc(l.name), "</option>")).join("");
  const types = CONTAINER_TYPE_OPTIONS.slice();
  if (ic.ctype && types.indexOf(ic.ctype) < 0) types.unshift(ic.ctype);
  const typeOpts = '<option value="">\u2014</option>' + types.map((t) => "<option ".concat(t === ic.ctype ? "selected" : "", ">").concat(esc(t), "</option>")).join("");
  const truckField = ic.truck ? '<select id="ice_truck">'.concat(state.db.trucks.map((t) => '<option value="'.concat(esc(t.id), '" ').concat(t.id === ic.truck ? "selected" : "", ">").concat(esc(t.reg), "</option>")).join(""), "</select>") : '<input id="ice_truckText" value="'.concat(v(ic.truckRegText), '"/>');
  const driverField = ic.driver ? '<select id="ice_driver">'.concat(state.db.drivers.map((d) => '<option value="'.concat(esc(d.id), '" ').concat(d.id === ic.driver ? "selected" : "", ">").concat(esc(d.name), "</option>")).join(""), "</select>") : '<input id="ice_driverText" value="'.concat(v(ic.driverNameText), '"/>');
  const f = (id, label, val, extra) => '<div class="fg"><label>'.concat(label, '</label><input id="ice_').concat(id, '" value="').concat(v(val), '" ').concat(extra || "", "/></div>");
  openModal("Edit interchange \u2014 ".concat(esc(ic.container)), '\n    <div class="ops-notice" style="margin-bottom:12px;font-size:11.5px"><span style="flex:1;min-width:0">Administrator only. Use this to correct details that were entered wrongly. The <b>EIR No. '.concat(v(ic.eirNumber) || "\u2014", '</b> cannot be changed. Every edit is recorded in the audit log.</span></div>\n    <div class="form-row-2">').concat(f("container", "Container No.", ic.container, 'style="text-transform:uppercase"'), '\n      <div class="fg"><label>Type / Size</label><select id="ice_ctype">').concat(typeOpts, '</select></div></div>\n    <div class="form-row-2"><div class="fg"><label>Shipping Line / Agent</label><select id="ice_line">').concat(lineOpts, '</select></div>\n      <div class="fg"><label>Date</label><input id="ice_date" type="datetime-local" value="').concat(_icLocalInput(ic.date), '"/></div></div>\n    <div class="form-row-2">').concat(f("condition", "Condition / Status", ic.condition)).concat(f("cargoStatus", "Cargo Status", ic.cargoStatus), '</div>\n    <div class="form-row-2">').concat(f("vessel", "Vessel", ic.vessel)).concat(f("voyage", "Voyage", ic.voyage), '</div>\n    <div class="form-row-2">').concat(f("bl", "Guarantee / B/L No.", ic.blNumber || ic.guaranteeNo)).concat(f("consignee", "Consignee / C&amp;F", ic.deliveringParty), '</div>\n    <div class="form-row-2">').concat(f("receiving", "Receiving Party", ic.receivingParty)).concat(f("ro", "Release Order No.", ic.releaseOrderNo), '</div>\n    <div class="form-row-2">').concat(f("transporter", "Transporter", ic.transporter)).concat(f("trailer", "Trailer No.", ic.trailerNo), '</div>\n    <div class="form-row-2"><div class="fg"><label>Truck</label>').concat(truckField, '</div><div class="fg"><label>Driver</label>').concat(driverField, '</div></div>\n    <div class="form-row-2">').concat(f("driverId", "Driver ID / Driving No.", ic.driverIdNumber)).concat(f("iso", "ISO Code", ic.isoCode, 'maxlength="6" style="text-transform:uppercase"'), '</div>\n    <div class="form-row-2"><div class="fg"><label>Gross Weight (kg)</label><input id="ice_gross" type="number" min="0" step="1" value="').concat(v(ic.grossWeight), '"/></div>\n      ').concat(f("dom", "Date of Manufacture (MM/YYYY)", ic.manufactureDate, 'maxlength="7" placeholder="MM/YYYY"'), "</div>\n    ").concat(f("clerk", "Clerk", ic.clerkName), '\n    <div class="fg"><label>Notes</label><textarea id="ice_notes" rows="2">').concat(v(ic.notes), '</textarea></div>\n    <div id="ice_err" style="color:var(--red);font-size:12px;min-height:16px"></div>\n    <button class="submit-btn" id="ice_go" onclick="saveEditedInterchange(\'').concat(esc(ic.id), "')\">Save changes \u2192</button>"));
}
let _iceSaving = false;
async function saveEditedInterchange(icId) {
  if (_iceSaving) return;
  if (!isAdmin()) {
    toast("Only an administrator can edit interchange details", "error");
    return;
  }
  const ic = state.db.interchange.find((i) => i.id === icId);
  if (!ic) {
    toast("Interchange record not found", "error");
    return;
  }
  const val = (id) => {
    const el = document.getElementById("ice_" + id);
    return el ? el.value.trim() : "";
  };
  const err = (m) => {
    const e = document.getElementById("ice_err");
    if (e) e.textContent = m;
    else toast(m, "error");
  };
  const cont = val("container").toUpperCase().replace(/\s+/g, "");
  if (!cont) return err("Container number is required.");
  if (cont !== String(ic.container || "").toUpperCase()) {
    const issue = containerFormatIssue(cont);
    if (issue) return err("Container number: " + issue);
  }
  const dom = normalizeManufactureDate(val("dom"));
  if (dom === null) return err("Date of manufacture must look like 05/2011.");
  const grossRaw = val("gross"), gross = grossRaw ? Number(grossRaw) : "";
  if (grossRaw && (!isFinite(gross) || gross <= 0)) return err("Gross weight must be a positive number.");
  const dateRaw = val("date");
  if (dateRaw && isNaN(new Date(dateRaw))) return err("The date is not valid.");
  const before = {};
  IC_EDIT_FIELDS.forEach(([k]) => {
    before[k] = ic[k];
  });
  const snap = Object.assign({}, ic);
  const bl = sanitize(val("bl"));
  Object.assign(ic, {
    container: cont,
    ctype: val("ctype"),
    line: val("line") || null,
    date: dateRaw ? new Date(dateRaw).toISOString() : ic.date,
    condition: sanitize(val("condition")),
    cargoStatus: sanitize(val("cargoStatus")),
    vessel: sanitize(val("vessel")),
    voyage: sanitize(val("voyage")),
    blNumber: bl,
    guaranteeNo: bl,
    deliveringParty: sanitize(val("consignee")),
    receivingParty: sanitize(val("receiving")),
    releaseOrderNo: sanitize(val("ro")),
    transporter: sanitize(val("transporter")),
    trailerNo: sanitize(val("trailer")),
    driverIdNumber: sanitize(val("driverId")),
    isoCode: sanitize(val("iso")).toUpperCase(),
    grossWeight: gross,
    manufactureDate: dom,
    clerkName: sanitize(val("clerk")),
    notes: sanitize(val("notes"))
  });
  if (document.getElementById("ice_truck")) ic.truck = val("truck");
  else ic.truckRegText = sanitize(val("truckText"));
  if (document.getElementById("ice_driver")) ic.driver = val("driver");
  else ic.driverNameText = sanitize(val("driverText"));
  const changed = IC_EDIT_FIELDS.filter(([k]) => String(before[k] == null ? "" : before[k]) !== String(ic[k] == null ? "" : ic[k]));
  if (!changed.length) {
    closeModal();
    toast("No changes to save", "info");
    return;
  }
  _iceSaving = true;
  const btn = document.getElementById("ice_go");
  if (btn) btn.disabled = true;
  try {
    ic._dirty = true;
    const res = await saveNowAwaited();
    const fail = (res && res.failures || []).find((x) => x && x.table === "interchange");
    if (fail) {
      Object.keys(ic).forEach((k) => {
        if (!(k in snap)) delete ic[k];
      });
      Object.assign(ic, snap);
      delete ic._dirty;
      err("Not saved: " + (fail.error && fail.error.message || "the server refused the change"));
      return;
    }
    addAudit(state.profile.username, "Interchange Edited", "".concat(cont, " \xB7 EIR ").concat(ic.eirNumber || "\u2014", " \xB7 ") + changed.map(([k, l]) => "".concat(l, ': "').concat(before[k] == null ? "" : before[k], '" \u2192 "').concat(ic[k] == null ? "" : ic[k], '"')).join("; ").slice(0, 900));
    closeModal();
    try {
      if (typeof refreshContainerHistory === "function") refreshContainerHistory();
      renderInterchange();
    } catch (e) {
    }
    toast("Interchange updated", "success");
  } finally {
    _iceSaving = false;
    if (btn) btn.disabled = false;
  }
}
