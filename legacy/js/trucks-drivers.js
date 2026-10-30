"use strict";
function truckToRow(t) {
  return { id: t.id, reg: t.reg, make: t.make, type: t.type, year: t.year, colour: t.colour, status: t.status, fuel_pct: t.fuelPct == null ? null : Math.round(t.fuelPct), mileage: t.mileage, last_service: t.lastService, next_service: t.nextService, notes: t.notes, licence_plate: t.licencePlate, vin: t.vin, img: t.img || "", wialon_unit_id: t.wialonUnitId || null, tank_capacity: Number(t.tankCapacity) > 0 ? Number(t.tankCapacity) : null, km_per_litre: Number(t.kmPerLitre) > 0 ? Number(t.kmPerLitre) : null, fuel_baseline_litres: t.fuelBaselineAt ? Number(t.fuelBaselineLitres) || 0 : null, fuel_baseline_at: t.fuelBaselineAt || null, fuel_baseline_odo: t.fuelBaselineAt ? Number(t.fuelBaselineOdo) || 0 : null };
}
function truckFromRow(r) {
  return { id: r.id, reg: r.reg, make: r.make, type: r.type, year: r.year, colour: r.colour, status: r.status, fuelPct: r.fuel_pct, mileage: r.mileage, driver: null, lastService: r.last_service, nextService: r.next_service, notes: r.notes || "", img: r.img || "", licencePlate: r.licence_plate, vin: r.vin || "", wialonUnitId: r.wialon_unit_id || "", tankCapacity: r.tank_capacity != null ? Number(r.tank_capacity) : null, kmPerLitre: r.km_per_litre != null ? Number(r.km_per_litre) : null, fuelBaselineLitres: r.fuel_baseline_litres != null ? Number(r.fuel_baseline_litres) : null, fuelBaselineAt: r.fuel_baseline_at || null, fuelBaselineOdo: r.fuel_baseline_odo != null ? Number(r.fuel_baseline_odo) : 0 };
}
function driverToRow(d) {
  return { id: d.id, name: d.name, phone: d.phone, licence: d.licence, licence_exp: d.licenceExp, status: d.status, truck_id: d.truckId || null, trips_today: d.tripsToday, current_load: d.load, location: d.location, id_no: d.idNo, rating: d.rating, profile_id: d.profileId || null };
}
function driverFromRow(r) {
  return { id: r.id, name: r.name, phone: r.phone, licence: r.licence, licenceExp: r.licence_exp, status: r.status, truckId: r.truck_id, tripsToday: r.trips_today, load: r.current_load, location: r.location, idNo: r.id_no, rating: r.rating, profileId: r.profile_id || null };
}
function findTruckByReg(reg, excludeId) {
  if (!reg) return null;
  const r = reg.trim().toUpperCase();
  return state.db.trucks.find((t) => t.id !== excludeId && (t.reg || "").toUpperCase() === r) || null;
}
function findDriverByPhone(phone, excludeId) {
  if (!phone) return null;
  const p = phone.replace(/\s+/g, "");
  return state.db.drivers.find((d) => d.id !== excludeId && (d.phone || "").replace(/\s+/g, "") === p) || null;
}
let _truckFilter = "all";
function filterTrucks(f, btn) {
  _truckFilter = f;
  document.querySelectorAll("#sec-trucks .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderTrucks(f);
}
function renderTrucks(f) {
  const trucks = f === "all" ? state.db.trucks : state.db.trucks.filter((t) => t.status === f);
  const grid = document.getElementById("truckGrid");
  if (!grid) return;
  grid.innerHTML = trucks.map((t) => '<div class="truck-card'.concat(t.img ? " has-photo" : "", '" onclick="showTruckDetail(\'').concat(t.id, "')\">").concat(t.img ? '<img class="truck-card-img" src="'.concat(t.img, '" alt="').concat(t.reg, '" /><div class="truck-card-img-overlay"></div>') : "", '<div class="truck-card-inner"><div class="truck-card-status-bar ').concat(t.status, '"></div><div class="truck-card-body"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="truck-card-reg">').concat(t.reg, '</div><div class="truck-card-make">').concat(t.make, " \xB7 ").concat(t.year, '</div><div class="truck-card-type">').concat(t.type, "</div></div>").concat(sbadge(t.status), '</div><div class="truck-card-stats"><div class="ts"><b>').concat(fmt(t.mileage), ' km</b>Odometer</div><div class="ts"><b>').concat(t.driver ? driverName(t.driver).split(" ")[0] : "\u2014", '</b>Driver</div><div class="ts"><b>').concat(t.colour, '</b>Colour</div><div class="fuel-bar-outer"><div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-3);margin-top:6px"><span>Fuel</span><span style="color:').concat(truckFuelColour(t), '">').concat(truckFuelLabel(t), "</span></div>").concat(truckFuelBar(t), "</div></div></div></div></div>")).join("") || '<div class="empty-state"><div class="empty-state-icon">\u{1F69B}</div><div class="empty-state-label">No trucks match this filter</div></div>';
}
function showTruckDetail(id) {
  const t = state.db.trucks.find((t2) => t2.id === id);
  if (!t) return;
  const trips = state.db.trips.filter((tr) => tr.truckId === id).slice(-5);
  const maint = state.db.maintenance.filter((m) => m.truckId === id);
  openModal("Truck \u2014 ".concat(t.reg), '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Registration</label><div class="mono" style="padding:8px;background:var(--surface);border-radius:5px;color:var(--gold)">'.concat(t.reg, '</div></div><div class="fg" style="margin:0"><label>Status</label><div style="padding:6px 0">').concat(sbadge(t.status), '</div></div><div class="fg" style="margin:0"><label>Make / Model</label><div style="font-size:12px;color:var(--text)">').concat(t.make, '</div></div><div class="fg" style="margin:0"><label>Year</label><div style="font-size:12px;color:var(--text)">').concat(t.year, '</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">').concat(t.type, '</div></div><div class="fg" style="margin:0"><label>Colour</label><div style="font-size:12px;color:var(--text)">').concat(t.colour, '</div></div><div class="fg" style="margin:0"><label>Odometer</label><div style="font-size:12px;color:var(--text)">').concat(fmt(t.mileage), ' km</div></div><div class="fg" style="margin:0"><label>Fuel</label><div><div style="font-size:12px;color:').concat(truckFuelColour(t), ';font-weight:700">').concat(truckFuelLabel(t)).concat(truckCapacity(t) ? ' <span style="color:var(--text-3);font-weight:400;font-size:10.5px">of '.concat(fmt(truckCapacity(t)), " L tank</span>") : "", "</div>").concat(truckFuelBar(t, "margin-top:4px"), '</div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Assigned Driver</label><div style="font-size:12px;color:var(--text)">').concat(t.driver ? driverName(t.driver) : "Unassigned", '</div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Last Service</label><div style="font-size:12px;color:var(--text)">').concat(fmtDate(t.lastService), '</div></div></div><div style="margin-bottom:14px"><div class="fg" style="margin:0"><label>Next Service Due</label><div style="font-size:12px;color:').concat(new Date(t.nextService) < Date.now() ? "var(--red)" : "var(--text)", '">').concat(fmtDate(t.nextService), "</div></div></div>").concat(t.notes ? '<div class="ops-notice" style="margin-bottom:14px">'.concat(t.notes, "</div>") : "", '<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:6px">Recent Trips (').concat(trips.length, ")</div>").concat(trips.length ? trips.map((tr) => '<div class="activity-row"><div style="flex:1;font-size:11px;color:var(--text-2)">'.concat(tr.origin, " \u2192 ").concat(tr.dest, " \xB7 ").concat(tr.container, "</div>").concat(sbadge(tr.status), '<div class="act-time">').concat(fmtDate(tr.startTime), "</div></div>")).join("") : '<div style="color:var(--text-3);font-size:11px;padding:8px 0">No trips recorded</div>').concat(isAdmin() ? '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Admin \u2014 Status Override</div><div style="display:flex;gap:6px;flex-wrap:wrap">'.concat(["available", "on_trip", "maintenance", "breakdown", "off_duty"].map((s) => '<button class="filter-btn'.concat(t.status === s ? " active" : "", '" onclick="quickSetTruckStatus(\'').concat(id, "','").concat(s, "')\">").concat(s.replace("_", " "), "</button>")).join(""), '</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="action-btn" onclick="showEditTruckModal(\'').concat(id, "')\">\u270F\uFE0F Edit Truck Details</button><button class=\"action-btn ghost\" onclick=\"triggerImageUpload('trucks','").concat(id, "','img',()=>showTruckDetail('").concat(id, '\'))">\u{1F4F7} Upload Truck Photo</button></div><div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Wialon GPS Unit</div><div style="font-size:9.5px;color:var(--text-3);margin-bottom:8px;line-height:1.5">If this truck has a dedicated Wialon AVL tracker fitted, enter its Wialon unit ID (from core/search_items) to source its live position from Wialon instead of the driver\'s phone.</div><div style="display:flex;gap:6px"><input id="tw_wialonId" value="').concat(esc(t.wialonUnitId || ""), '" placeholder="Wialon unit ID" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:5px;font-size:11.5px"/><button class="tbl-btn" onclick="saveTruckWialonId(\'').concat(id, "')\">Save</button></div></div>").concat(adminDeleteBtn("trucks", id), "</div>") : ""));
}
function quickSetTruckStatus(id, status) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const t = state.db.trucks.find((t2) => t2.id === id);
  if (!t) return;
  t.status = status;
  scheduleSave();
  addAudit(state.profile.username, "Status Override", "".concat(t.reg, " \u2192 ").concat(status));
  buildBadges();
  closeModal();
  renderTrucks(_truckFilter);
  toast("".concat(t.reg, " status set to ").concat(status), "success");
}
function saveTruck() {
  var _a;
  const reg = document.getElementById("nt_reg").value.trim().toUpperCase();
  const make = document.getElementById("nt_make").value.trim();
  if (!reg || !make) {
    toast("Registration and make are required", "error");
    return;
  }
  if (!/^[A-Z0-9\s]{3,10}$/.test(reg)) {
    toast("Invalid registration format. Use letters and numbers only.", "error");
    return;
  }
  const dupTruck = findTruckByReg(reg);
  if (dupTruck) {
    toast("".concat(reg, " is already registered in the fleet"), "error");
    return;
  }
  const t = {
    id: uid("TRK"),
    reg,
    make,
    type: document.getElementById("nt_type").value,
    year: parseInt(document.getElementById("nt_year").value) || (/* @__PURE__ */ new Date()).getFullYear(),
    colour: document.getElementById("nt_colour").value.trim() || "White",
    fuelPct: null,
    mileage: Math.max(0, parseInt(document.getElementById("nt_odo").value) || 0),
    status: "available",
    driver: null,
    lastService: (/* @__PURE__ */ new Date()).toISOString(),
    nextService: new Date(Date.now() + 90 * 864e5).toISOString(),
    notes: sanitize(document.getElementById("nt_notes").value.trim()),
    img: "",
    licencePlate: reg,
    vin: "",
    wialonUnitId: document.getElementById("nt_wialon").value.trim()
  };
  applyTruckFuelInputs(t, {
    capacity: parseFloat(document.getElementById("nt_cap").value),
    kmpl: parseFloat(document.getElementById("nt_kmpl").value)
  });
  state.db.trucks.push(t);
  scheduleSave();
  addAudit(state.profile.username, "Truck Added", "".concat(reg, " \u2014 ").concat(make));
  buildBadges();
  closeModal();
  renderTrucks("all");
  toast("".concat(reg, " added to fleet"), "success");
  if (t.wialonUnitId && ((_a = state.db.settings) == null ? void 0 : _a.wialonEnabled)) startWialonPolling();
}
function showEditTruckModal(id) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const t = state.db.trucks.find((t2) => t2.id === id);
  if (!t) return;
  const typeOptions = ["Prime Mover", "Flatbed", "Tipper", "Tanker", "Lowbed"];
  openModal("Edit Truck \u2014 ".concat(t.reg), '<div class="form-row-2"><div class="fg"><label>Registration</label><input id="et_reg" value="'.concat(esc(t.reg), '" placeholder="KDA 000A"/></div><div class="fg"><label>Make / Model</label><input id="et_make" value="').concat(esc(t.make), '" placeholder="ISUZU FVZ"/></div></div><div class="form-row-2"><div class="fg"><label>Type</label><select id="et_type">').concat(typeOptions.map((o) => "<option ".concat(t.type === o ? "selected" : "", ">").concat(o, "</option>")).join(""), '</select></div><div class="fg"><label>Year</label><input id="et_year" type="number" value="').concat(t.year || "", '"/></div></div><div class="form-row-2"><div class="fg"><label>Colour</label><input id="et_colour" value="').concat(esc(t.colour || ""), '"/></div><div class="fg"><label>Fuel Level (from fuel logs)</label><input value="').concat(esc(truckFuelLabel(t)), '" disabled/></div></div><div class="form-row-2"><div class="fg"><label>Tank Capacity (L)</label><input id="et_cap" type="number" step="1" min="0" value="').concat(t.tankCapacity || "", '" placeholder="Optional"/></div><div class="fg"><label>Fuel Economy (km/L) <span class="label-optional">(optional)</span></label><input id="et_kmpl" type="number" step="0.1" min="0" value="').concat(t.kmPerLitre || "", '" placeholder="e.g. 3"/></div></div><div style="font-size:10px;color:var(--text-3);margin:-4px 0 10px;line-height:1.5">The fuel level comes only from the fuel logs. Tank capacity is optional and only used to show a % bar. With km/L set, fuel used between fills is deducted using odometer readings.</div><div class="form-row-2"><div class="fg"><label>Odometer (km)</label><input id="et_odo" type="number" value="').concat(t.mileage || 0, '"/></div><div class="fg"><label>Licence Plate</label><input id="et_plate" value="').concat(esc(t.licencePlate || ""), '"/></div></div><div class="fg"><label>VIN / Chassis No. <span class="label-optional">(optional)</span></label><input id="et_vin" value="').concat(esc(t.vin || ""), '"/></div><div class="form-row-2"><div class="fg"><label>Last Service</label><input id="et_lastsvc" type="date" value="').concat(t.lastService ? String(t.lastService).slice(0, 10) : "", '"/></div><div class="fg"><label>Next Service Due</label><input id="et_nextsvc" type="date" value="').concat(t.nextService ? String(t.nextService).slice(0, 10) : "", '"/></div></div><div class="fg"><label>Notes</label><textarea id="et_notes" rows="2">').concat(esc(t.notes || ""), '</textarea></div><button class="submit-btn" onclick="saveTruckEdit(\'').concat(id, "')\">Save Changes \u2192</button>"));
}
function saveTruckEdit(id) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const t = state.db.trucks.find((t2) => t2.id === id);
  if (!t) return;
  const reg = document.getElementById("et_reg").value.trim().toUpperCase();
  const make = document.getElementById("et_make").value.trim();
  if (!reg || !make) {
    toast("Registration and make are required", "error");
    return;
  }
  if (!/^[A-Z0-9\s]{3,10}$/.test(reg)) {
    toast("Invalid registration format. Use letters and numbers only.", "error");
    return;
  }
  const dup = findTruckByReg(reg, id);
  if (dup) {
    toast("".concat(reg, " is already registered to another truck"), "error");
    return;
  }
  const oldReg = t.reg;
  t.reg = reg;
  t.make = make;
  t.type = document.getElementById("et_type").value;
  t.year = parseInt(document.getElementById("et_year").value) || t.year;
  t.colour = document.getElementById("et_colour").value.trim() || t.colour;
  t.mileage = Math.max(0, parseInt(document.getElementById("et_odo").value) || 0);
  applyTruckFuelInputs(t, {
    capacity: parseFloat(document.getElementById("et_cap").value),
    kmpl: parseFloat(document.getElementById("et_kmpl").value)
  });
  t.licencePlate = document.getElementById("et_plate").value.trim() || reg;
  t.vin = document.getElementById("et_vin").value.trim();
  const lastSvc = document.getElementById("et_lastsvc").value;
  const nextSvc = document.getElementById("et_nextsvc").value;
  if (lastSvc) t.lastService = new Date(lastSvc).toISOString();
  if (nextSvc) t.nextService = new Date(nextSvc).toISOString();
  t.notes = sanitize(document.getElementById("et_notes").value.trim());
  scheduleSave();
  addAudit(state.profile.username, "Truck Edited", "".concat(oldReg).concat(oldReg !== reg ? " \u2192 ".concat(reg) : "", " \u2014 details updated"));
  buildBadges();
  closeModal();
  renderTrucks(_truckFilter);
  toast("".concat(reg, " updated"), "success");
}
let _driverFilter = "all";
function filterDrivers(f, btn) {
  _driverFilter = f;
  document.querySelectorAll("#sec-drivers .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderDrivers(f);
}
function renderDrivers(f) {
  const drivers = f === "all" ? state.db.drivers : state.db.drivers.filter((d) => d.status === f);
  const tbody = document.getElementById("driverTableBody");
  if (!tbody) return;
  tbody.innerHTML = drivers.map((d) => {
    var _a;
    return "<tr onclick=\"showDriverDetail('".concat(d.id, '\')"><td><div class="driver-cell"><div class="driver-avatar">').concat(initials(d.name), '</div><div><div class="driver-name">').concat(d.name, '</div><div class="driver-id">').concat(d.id, '</div></div></div></td><td class="mono">').concat(d.phone, '</td><td class="mono">').concat(d.licence, "</td><td>").concat(d.truckId ? '<span class="mono" style="color:var(--gold)">'.concat(((_a = state.db.trucks.find((t) => t.id === d.truckId)) == null ? void 0 : _a.reg) || "\u2014", "</span>") : "\u2014", "</td><td>").concat(sbadge(d.status), '</td><td style="text-align:center;font-family:var(--font-mono)">').concat(d.tripsToday, '</td><td class="mono" style="font-size:10px">').concat(d.load || "\u2014", '</td><td style="font-size:11px;color:var(--text-3)">').concat(d.location, '</td><td><button class="tbl-btn" onclick="event.stopPropagation();showDriverDetail(\'').concat(d.id, "')\">View</button></td></tr>");
  }).join("") || '<tr><td colspan="9" class="empty-td">No drivers match this filter</td></tr>';
}
function showDriverDetail(id) {
  const d = state.db.drivers.find((d2) => d2.id === id);
  if (!d) return;
  const licDays = Math.round((new Date(d.licenceExp) - Date.now()) / 864e5);
  const licWarn = licDays < 90;
  openModal("Driver \u2014 ".concat(d.name), '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div style="width:52px;height:52px;border-radius:50%;background:var(--gold-dim);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--gold)">'.concat(initials(d.name), '</div><div><div style="font-size:16px;font-weight:700;color:var(--text)">').concat(d.name, '</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3)">').concat(d.id, '</div></div><div style="margin-left:auto">').concat(sbadge(d.status), '</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Phone</label><div class="mono" style="font-size:12px;color:var(--text)">').concat(d.phone, '</div></div><div class="fg" style="margin:0"><label>Licence</label><div class="mono" style="font-size:12px;color:var(--text)">').concat(d.licence, '</div></div><div class="fg" style="margin:0"><label>Licence Expiry</label><div style="font-size:12px;color:').concat(licWarn ? "var(--amber)" : "var(--text)", ";font-weight:").concat(licWarn ? "700" : "400", '">').concat(fmtDate(d.licenceExp)).concat(licWarn ? " \u26A0" : "", '</div></div><div class="fg" style="margin:0"><label>Trips Today</label><div class="mono" style="font-size:16px;color:var(--gold);font-weight:700">').concat(d.tripsToday, '</div></div><div class="fg" style="margin:0"><label>Assigned Truck</label><div style="font-size:12px;color:var(--text)">').concat(d.truckId ? truckName(d.truckId) : "Not assigned", '</div></div><div class="fg" style="margin:0"><label>Current Load</label><div class="mono" style="font-size:11px;color:var(--text)">').concat(d.load || "None", '</div></div><div class="fg" style="margin:0"><label>Location</label><div style="font-size:12px;color:var(--text)">').concat(d.location, '</div></div><div class="fg" style="margin:0"><label>Rating</label><div style="font-size:12px;color:var(--gold)">\u2B50 ').concat(d.rating || 0, '/5.0</div></div><div class="fg" style="margin:0"><label>ID No.</label><div class="mono" style="font-size:12px;color:var(--text)">').concat(d.idNo || "\u2014", "</div></div></div>").concat(isAdmin() ? '<div style="padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Admin \u2014 Status Override</div><div style="display:flex;gap:6px;flex-wrap:wrap">'.concat(["available", "on_trip", "off_duty", "suspended"].map((s) => '<button class="filter-btn'.concat(d.status === s ? " active" : "", '" onclick="quickSetDriverStatus(\'').concat(id, "','").concat(s, "')\">").concat(s.replace("_", " "), "</button>")).join(""), '</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="action-btn" onclick="showEditDriverModal(\'').concat(id, '\')">\u270F\uFE0F Edit Driver Details</button></div><div style="margin-top:14px"><label style="font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;font-family:var(--font-mono)">Linked Login (Driver Portal Access)</label><select onchange="linkDriverProfile(\'').concat(id, '\', this.value)" style="width:100%;margin-top:6px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:7px;border-radius:5px;font-size:12px"><option value="">\u2014 Not linked \u2014</option>').concat(state.db.profiles.filter((p) => p.role === "driver").map((p) => '<option value="'.concat(p.id, '" ').concat(d.profileId === p.id ? "selected" : "", ">").concat(p.name, " (").concat(p.username, ")</option>")).join(""), "</select></div>").concat(adminDeleteBtn("drivers", id), "</div>") : ""));
}
function quickSetDriverStatus(id, status) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const d = state.db.drivers.find((d2) => d2.id === id);
  if (!d) return;
  d.status = status;
  scheduleSave();
  addAudit(state.profile.username, "Driver Status Override", "".concat(d.name, " \u2192 ").concat(status));
  closeModal();
  renderDrivers(_driverFilter);
  toast("".concat(d.name, " status updated"), "success");
}
function linkDriverProfile(driverId, profileId) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const d = state.db.drivers.find((d2) => d2.id === driverId);
  if (!d) return;
  d.profileId = profileId || null;
  scheduleSave();
  const p = profileId ? state.db.profiles.find((p2) => p2.id === profileId) : null;
  addAudit(state.profile.username, "Driver Login Linked", "".concat(d.name, " \u2194 ").concat(p ? "".concat(p.name, " (").concat(p.username, ")") : "unlinked"));
  toast(p ? "".concat(d.name, " linked to ").concat(p.name, "'s login") : "".concat(d.name, " unlinked from login"), "success");
  showDriverDetail(driverId);
}
function saveDriver() {
  const name = document.getElementById("nd_name").value.trim();
  const phone = document.getElementById("nd_phone").value.trim();
  const lic = document.getElementById("nd_lic").value.trim().toUpperCase();
  if (!name) {
    toast("Full name is required", "error");
    return;
  }
  if (!validatePhone(phone)) {
    toast("Invalid phone number format", "error");
    return;
  }
  if (!lic) {
    toast("Licence number is required", "error");
    return;
  }
  const dupPhone = findDriverByPhone(phone);
  if (dupPhone) {
    toast("A driver with phone ".concat(phone, " already exists (").concat(dupPhone.name, ")"), "error");
    return;
  }
  const dupLic = state.db.drivers.find((dr) => (dr.licence || "").toUpperCase() === lic);
  if (dupLic) {
    toast("Licence ".concat(lic, " is already registered to ").concat(dupLic.name), "error");
    return;
  }
  const d = {
    id: uid("DRV"),
    name,
    initials: initials(name),
    phone,
    licence: lic,
    licenceExp: document.getElementById("nd_licexp").value || new Date(Date.now() + 365 * 864e5).toISOString(),
    status: "available",
    truckId: null,
    tripsToday: 0,
    load: null,
    location: "Gargo Yard",
    idNo: document.getElementById("nd_idno").value.trim() || "",
    rating: Math.min(5, Math.max(0, parseFloat(document.getElementById("nd_rating").value) || 4))
  };
  state.db.drivers.push(d);
  scheduleSave();
  addAudit(state.profile.username, "Driver Added", "".concat(name));
  closeModal();
  renderDrivers("all");
  toast("".concat(name, " added"), "success");
}
function showEditDriverModal(id) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const d = state.db.drivers.find((d2) => d2.id === id);
  if (!d) return;
  openModal("Edit Driver \u2014 ".concat(d.name), '<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="ed_name" value="'.concat(esc(d.name), '"/></div><div class="fg"><label>Phone</label><input id="ed_phone" value="').concat(esc(d.phone || ""), '"/></div></div><div class="form-row-2"><div class="fg"><label>Licence No.</label><input id="ed_lic" value="').concat(esc(d.licence || ""), '"/></div><div class="fg"><label>Licence Expiry</label><input id="ed_licexp" type="date" value="').concat(d.licenceExp ? String(d.licenceExp).slice(0, 10) : "", '"/></div></div><div class="form-row-2"><div class="fg"><label>ID Number</label><input id="ed_idno" value="').concat(esc(d.idNo || ""), '"/></div><div class="fg"><label>Rating</label><input id="ed_rating" type="number" min="0" max="5" step="0.1" value="').concat(d.rating || 0, '"/></div></div><div class="form-row-2"><div class="fg"><label>Assigned Truck</label><select id="ed_truck"><option value="">\u2014 Unassigned \u2014</option>').concat(state.db.trucks.map((t) => '<option value="'.concat(t.id, '" ').concat(d.truckId === t.id ? "selected" : "", ">").concat(t.reg, " \u2014 ").concat(t.make, "</option>")).join(""), '</select></div><div class="fg"><label>Location</label><input id="ed_location" value="').concat(esc(d.location || ""), '"/></div></div><div class="fg"><label>Current Load <span class="label-optional">(optional)</span></label><input id="ed_load" value="').concat(esc(d.load || ""), '" placeholder="e.g. container no. \u2014 leave blank if none"/></div><button class="submit-btn" onclick="saveDriverEdit(\'').concat(id, "')\">Save Changes \u2192</button>"));
}
function saveDriverEdit(id) {
  if (!isAdmin()) {
    toast("Admin rights required", "error");
    return;
  }
  const d = state.db.drivers.find((d2) => d2.id === id);
  if (!d) return;
  const name = document.getElementById("ed_name").value.trim();
  const phone = document.getElementById("ed_phone").value.trim();
  const lic = document.getElementById("ed_lic").value.trim().toUpperCase();
  if (!name) {
    toast("Full name is required", "error");
    return;
  }
  if (!validatePhone(phone)) {
    toast("Invalid phone number format", "error");
    return;
  }
  if (!lic) {
    toast("Licence number is required", "error");
    return;
  }
  const dupPhone = findDriverByPhone(phone, id);
  if (dupPhone) {
    toast("A driver with phone ".concat(phone, " already exists (").concat(dupPhone.name, ")"), "error");
    return;
  }
  const dupLic = state.db.drivers.find((dr) => dr.id !== id && (dr.licence || "").toUpperCase() === lic);
  if (dupLic) {
    toast("Licence ".concat(lic, " is already registered to ").concat(dupLic.name), "error");
    return;
  }
  const oldName = d.name;
  d.name = name;
  d.phone = phone;
  d.licence = lic;
  const licExp = document.getElementById("ed_licexp").value;
  if (licExp) d.licenceExp = new Date(licExp).toISOString();
  d.idNo = document.getElementById("ed_idno").value.trim();
  d.rating = Math.min(5, Math.max(0, parseFloat(document.getElementById("ed_rating").value) || 0));
  d.location = document.getElementById("ed_location").value.trim() || d.location;
  d.load = document.getElementById("ed_load").value.trim() || null;
  const newTruckId = document.getElementById("ed_truck").value || null;
  if (newTruckId !== (d.truckId || null)) {
    if (d.truckId) {
      const oldT = state.db.trucks.find((t) => t.id === d.truckId);
      if (oldT && oldT.driver === d.id) oldT.driver = null;
    }
    if (newTruckId) {
      pairDriverTruck(newTruckId, d.id);
    } else {
      d.truckId = null;
    }
  }
  scheduleSave();
  addAudit(state.profile.username, "Driver Edited", "".concat(oldName).concat(oldName !== name ? " \u2192 ".concat(name) : "", " \u2014 details updated"));
  closeModal();
  renderDrivers(_driverFilter);
  renderTrucks(_truckFilter);
  toast("".concat(name, " updated"), "success");
}
const DRIVER_TRIP_STEPS = ["loaded", "on_trip", "offloaded", "breakdown", "completed"];
async function driverAdvanceTrip(tripId, status) {
  const driver = myDriverRecord();
  const t = state.db.trips.find((tr) => tr.id === tripId);
  if (!driver || !t || t.driverId !== driver.id) {
    toast("Not authorized for this trip", "error");
    return;
  }
  if (!DRIVER_TRIP_STEPS.includes(status)) {
    toast("Invalid status", "error");
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
      toast("Not authorized for this trip", "error");
    }
    renderDriverPortal();
    return;
  }
  toast(status === "breakdown" ? "Breakdown reported \u2014 dispatch notified" : "Trip updated to ".concat(status.replace("_", " ")), status === "breakdown" ? "error" : "success");
  renderDriverPortal();
}
function driverShouldTrack(driver) {
  var _a, _b;
  if (!driver || !driver.truckId || driver.status === "off_duty" || driver.status === "suspended") return false;
  const truck = (_b = (_a = state.db) == null ? void 0 : _a.trucks) == null ? void 0 : _b.find((t) => t.id === driver.truckId);
  if (truck == null ? void 0 : truck.wialonUnitId) return false;
  return true;
}
function driverReportBreakdown(truckId) {
  openModal("Report Breakdown", '\n    <div class="ops-notice" style="margin-bottom:12px">This will immediately flag your truck as broken down and alert dispatch/admin as a priority.</div>\n    <div class="fg"><label>What\'s wrong?</label><textarea id="bd_desc" rows="3" placeholder="Describe the breakdown\u2026"></textarea></div>\n    <div class="fg"><label>Location</label><input id="bd_loc" placeholder="e.g. B8 Highway, near Miritini"/></div>\n    <button class="submit-btn" onclick="submitDriverBreakdown(\''.concat(truckId, "')\">\u{1F6A8} Submit Breakdown Report \u2192</button>\n  "));
}
