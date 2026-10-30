"use strict";
const GEO_PING_INTERVAL_MS = 1e4;
async function checkGeoPermission() {
  var _a;
  if (!((_a = navigator.permissions) == null ? void 0 : _a.query)) {
    state.geoPermission = "unknown";
    return;
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    state.geoPermission = status.state;
    if (!state._geoPermWatched) {
      state._geoPermWatched = true;
      status.onchange = () => {
        state.geoPermission = status.state;
        const driver = myDriverRecord();
        if (status.state === "granted" && driverShouldTrack(driver)) startDriverTracking();
        if (status.state === "denied") stopDriverTracking();
        renderDutyBar();
      };
    }
  } catch (e) {
    state.geoPermission = "unknown";
  }
}
function requestLocationAccess() {
  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) return;
  if (!navigator.geolocation) {
    toast("This device does not support GPS location", "error");
    return;
  }
  toast("Requesting location access\u2026", "info", 1500);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.geoPermission = "granted";
      onDriverPosition(pos);
      startDriverTracking();
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) state.geoPermission = "denied";
      onDriverGeoError(err);
    },
    { enableHighAccuracy: true, timeout: 15e3, maximumAge: 0 }
  );
}
function startDriverTracking() {
  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) {
    stopDriverTracking();
    return;
  }
  if (state.geoWatchId != null) return;
  if (!navigator.geolocation) {
    toast("This device does not support GPS location", "error");
    return;
  }
  if (state.geoPermission === "denied") {
    renderDutyBar();
    return;
  }
  state.geoWatchId = navigator.geolocation.watchPosition(onDriverPosition, onDriverGeoError, {
    enableHighAccuracy: true,
    maximumAge: 5e3,
    timeout: 2e4
  });
}
async function stopDriverTracking(clearRemote) {
  if (state.geoWatchId != null) {
    navigator.geolocation.clearWatch(state.geoWatchId);
    state.geoWatchId = null;
  }
  state.trackingActive = false;
  if (clearRemote) {
    const driver = myDriverRecord();
    if (driver == null ? void 0 : driver.truckId) {
      const { error } = await supabase.from("tracking_positions").delete().eq("truck_id", driver.truckId);
      if (error) console.error("tracking_positions clear failed:", error.message);
      delete state.db.trackingPositions[driver.truckId];
      if (state.currentSection === "livetracking") {
        renderTracking();
        updateTrackingMarkers();
      }
    }
  }
  renderDutyBar();
}
function headingToCompass(deg) {
  if (deg == null || isNaN(deg)) return "\u2014";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
async function onDriverPosition(pos) {
  const now = Date.now();
  if (now - state.lastGeoSend < GEO_PING_INTERVAL_MS) return;
  state.lastGeoSend = now;
  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) {
    stopDriverTracking();
    return;
  }
  const { latitude, longitude, speed, heading } = pos.coords;
  const kph = speed != null && speed >= 0 && !isNaN(speed) ? Math.round(speed * 3.6) : 0;
  const hd = headingToCompass(heading);
  let zone = _lastZoneVal;
  if (!zone || now - _lastZoneFetch > ZONE_LOOKUP_INTERVAL_MS) {
    zone = await reverseGeocodeZone(latitude, longitude);
    _lastZoneVal = zone;
    _lastZoneFetch = now;
  }
  const row = { truck_id: driver.truckId, lat: latitude, lng: longitude, speed: kph, heading: hd, zone, last_update: (/* @__PURE__ */ new Date()).toISOString(), source: "driver_app" };
  const { error } = await supabase.from("tracking_positions").upsert(row, { onConflict: "truck_id" });
  if (error) {
    console.error("tracking ping failed:", error.message);
  } else {
    state.db.trackingPositions[driver.truckId] = { lat: latitude, lng: longitude, speed: kph, heading: hd, zone, lastUpdate: row.last_update, source: "driver_app" };
    if (state.currentSection === "livetracking") {
      renderTracking();
      updateTrackingMarkers();
    }
  }
  state.trackingActive = true;
  renderDutyBar();
}
function onDriverGeoError(err) {
  state.trackingActive = false;
  let msg = "GPS signal lost \u2014 retrying\u2026";
  if (err.code === err.PERMISSION_DENIED) {
    msg = "Location permission denied \u2014 enable location access to allow tracking";
    state.geoPermission = "denied";
  } else if (err.code === err.POSITION_UNAVAILABLE) msg = "Location unavailable \u2014 check your device GPS/network";
  toast(msg, "error", 4500);
  renderDutyBar();
}
let _nominatimQueue = Promise.resolve();
const TRACKING_REFRESH_MS = 3e4;
const GPS_STALE_MINUTES = 15;
const SYNC_STALE_MINUTES = 6;
const MOVING_SPEED_THRESHOLD_KMH = 3;
let _trackingRefreshTimer = null;
function wialonConfig() {
  var _a;
  const s = ((_a = state.db) == null ? void 0 : _a.settings) || {};
  return {
    enabled: !!s.wialonEnabled,
    host: (s.wialonHost || "https://hst-api.wialon.com").trim().replace(/\/+$/, "")
  };
}
function wialonTrackedTrucks() {
  var _a;
  return (((_a = state.db) == null ? void 0 : _a.trucks) || []).filter((t) => t.wialonUnitId);
}
function mapPositionRow(r) {
  var _a;
  return {
    lat: r.lat,
    lng: r.lng,
    speed: r.speed,
    heading: r.heading,
    zone: r.zone,
    lastUpdate: r.last_update,
    source: r.source || "driver_app",
    moving: (_a = r.moving) != null ? _a : null,
    stoppedSince: r.stopped_since || null,
    syncedAt: r.synced_at || null
  };
}
function minutesSince(iso) {
  const t = iso ? new Date(iso).getTime() : NaN;
  return isNaN(t) ? Infinity : (Date.now() - t) / 6e4;
}
function fmtStopDuration(mins) {
  if (typeof mins !== "number" || !isFinite(mins) || mins < 0) return "";
  if (mins < 60) return Math.max(1, Math.round(mins)) + "m";
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h + "h" + (m ? " " + m + "m" : "");
}
function truckMovingState(truckId) {
  var _a;
  const p = (_a = state.db.trackingPositions) == null ? void 0 : _a[truckId];
  if (!p) return { kind: "none", p: null };
  const fixAge = minutesSince(p.lastUpdate);
  if (p.source === "wialon") {
    if (minutesSince(p.syncedAt || p.lastUpdate) > SYNC_STALE_MINUTES) return { kind: "stale", p, fixAge };
    if (fixAge > GPS_STALE_MINUTES) return { kind: "offline", p, fixAge };
  } else if (fixAge > GPS_STALE_MINUTES) {
    return { kind: "stale", p, fixAge };
  }
  const moving = p.moving === true || (p.speed || 0) > MOVING_SPEED_THRESHOLD_KMH;
  const stopMin = !moving && p.stoppedSince ? minutesSince(p.stoppedSince) : null;
  return { kind: moving ? "moving" : "stopped", p, fixAge, stopMin };
}
function truckMovementBadge(truckId) {
  const s = truckMovingState(truckId);
  if (s.kind === "none") return '<span style="color:var(--text-3)">\u2014 No GPS fix</span>';
  const p = s.p, seen = timeAgo(p.lastUpdate);
  if (s.kind === "offline") return '<span style="color:#d99a2b">\u26A0 Tracker offline \xB7 last seen '.concat(seen, "</span>");
  if (s.kind === "stale") return '<span style="color:#d99a2b">\u26A0 No recent fix \xB7 last seen '.concat(seen, "</span>");
  if (s.kind === "moving") return '<span style="color:var(--green,#3ecf6e)">\u25CF Moving'.concat(p.speed > 0 ? " \xB7 " + Math.round(p.speed) + " km/h" : "", "</span>");
  const dur = fmtStopDuration(s.stopMin);
  return '<span style="color:var(--text-3)">\u25A0 Stopped'.concat(dur ? " \xB7 " + dur : "", "</span>");
}
function truckMarkerColour(kind) {
  return kind === "moving" ? "#3ecf6e" : kind === "stopped" ? "#8b8b8b" : "#d99a2b";
}
function positionSourceLabel(p) {
  return (p == null ? void 0 : p.source) === "wialon" ? "Wialon GPS" : "Driver Phone";
}
function startTrackingAutoRefresh() {
  if (_trackingRefreshTimer) return;
  _trackingRefreshTimer = setInterval(() => {
    if (document.hidden || state.currentSection !== "livetracking") return;
    refreshTracking(true);
  }, TRACKING_REFRESH_MS);
}
function stopTrackingAutoRefresh() {
  if (_trackingRefreshTimer) {
    clearInterval(_trackingRefreshTimer);
    _trackingRefreshTimer = null;
  }
}
function startWialonPolling() {
  startTrackingAutoRefresh();
}
function stopWialonPolling() {
  stopTrackingAutoRefresh();
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.currentUser && state.currentSection === "livetracking") refreshTracking(true);
});
async function wialonRemoteCall(host, svc, params, sid) {
  const url = "".concat(host, "/wialon/ajax.html?svc=").concat(encodeURIComponent(svc), "&params=").concat(encodeURIComponent(JSON.stringify(params))).concat(sid ? "&sid=".concat(encodeURIComponent(sid)) : "");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Wialon HTTP ".concat(res.status));
  const data = await res.json();
  if (data && typeof data.error === "number" && data.error !== 0) throw new Error("Wialon error ".concat(data.error));
  return data;
}
async function testWialonConnection() {
  var _a, _b, _c;
  const host = (((_a = document.getElementById("st_wialonHost")) == null ? void 0 : _a.value) || "https://hst-api.wialon.com").trim().replace(/\/+$/, "");
  const token = (((_b = document.getElementById("st_wialonToken")) == null ? void 0 : _b.value) || "").trim();
  if (!token) {
    toast("Paste a token into the field to test it \u2014 a saved token is only used by the server and can\u2019t be read back", "info", 4500);
    return;
  }
  toast("Testing Wialon connection\u2026", "info", 1500);
  let sid;
  try {
    const login = await wialonRemoteCall(host, "token/login", { token });
    sid = login == null ? void 0 : login.eid;
    if (!sid) throw new Error("No session returned");
    const found = await wialonRemoteCall(host, "core/search_items", {
      spec: { itemsType: "avl_unit", propName: "sys_name", propValueMask: "*", sortType: "sys_name" },
      force: 1,
      flags: 1,
      from: 0,
      to: 0
    }, sid);
    const units = ((found == null ? void 0 : found.items) || []).slice().sort((a, b) => String(a.nm).localeCompare(String(b.nm)));
    const linked = new Map(wialonTrackedTrucks().map((t) => [String(t.wialonUnitId), t.reg]));
    toast("Connected to Wialon".concat(((_c = login.user) == null ? void 0 : _c.nm) ? " as " + login.user.nm : "", " \u2713"), "success");
    openModal("Wialon units this token can see", '\n      <div style="font-size:11.5px;color:var(--text-2);line-height:1.6;margin-bottom:10px">\n        Enter the <b>ID</b> on the matching truck\'s detail card under Fleet \u2192 Wialon GPS Unit. Remember to click <b>Save</b> on the settings form to store the token.\n      </div>\n      <div style="max-height:320px;overflow:auto;border:1px solid var(--border);border-radius:8px">\n        <table style="width:100%;border-collapse:collapse;font-size:12px">\n          <thead><tr style="text-align:left;color:var(--text-3);font-size:10px;text-transform:uppercase;letter-spacing:1px"><th style="padding:8px">Unit name</th><th style="padding:8px">ID</th><th style="padding:8px">Linked to</th></tr></thead>\n          <tbody>'.concat(units.map((u) => '<tr style="border-top:1px solid var(--border)"><td style="padding:8px">'.concat(esc(u.nm), '</td><td class="mono" style="padding:8px;color:var(--gold)">').concat(esc(u.id), '</td><td style="padding:8px;color:var(--text-3)">').concat(linked.has(String(u.id)) ? esc(linked.get(String(u.id))) : "\u2014", "</td></tr>")).join("") || '<tr><td colspan="3" style="padding:12px;color:var(--text-3)">This token can\u2019t see any units \u2014 check the Wialon user\u2019s access rights.</td></tr>', "</tbody>\n        </table>\n      </div>"));
  } catch (e) {
    toast("Wialon connection failed \u2014 ".concat(e.message), "error");
  } finally {
    if (sid) {
      try {
        await wialonRemoteCall(host, "core/logout", {}, sid);
      } catch (e) {
      }
    }
  }
}
async function saveWialonSettings() {
  var _a, _b, _c;
  if (!isAdmin()) {
    toast("Only administrators can change GPS settings", "error");
    return;
  }
  const enabled = !!((_a = document.getElementById("st_wialonEnabled")) == null ? void 0 : _a.checked);
  const host = (((_b = document.getElementById("st_wialonHost")) == null ? void 0 : _b.value) || "").trim() || "https://hst-api.wialon.com";
  const token = (((_c = document.getElementById("st_wialonToken")) == null ? void 0 : _c.value) || "").trim();
  if (!/^https:\/\//i.test(host)) {
    toast("Wialon host must start with https://", "error");
    return;
  }
  if (token) {
    const { error } = await supabase.rpc("set_wialon_token", { p_token: token });
    if (error) {
      toast("Could not save the token \u2014 " + error.message, "error", 5e3);
      return;
    }
  }
  state.db.settings = state.db.settings || {};
  state.db.settings.wialonEnabled = enabled;
  state.db.settings.wialonHost = host;
  scheduleSave();
  addAudit(state.profile.username, "Wialon Settings", "GPS integration ".concat(enabled ? "enabled" : "disabled").concat(token ? " \xB7 API token updated" : ""));
  toast("Wialon settings saved", "success");
  renderSettings();
}
async function clearWialonToken() {
  if (!isAdmin()) return;
  if (!confirm("Remove the saved Wialon token? Live Wialon positions will stop updating until a new token is saved.")) return;
  const { error } = await supabase.rpc("set_wialon_token", { p_token: "" });
  if (error) {
    toast("Could not remove the token \u2014 " + error.message, "error");
    return;
  }
  addAudit(state.profile.username, "Wialon Settings", "API token removed");
  toast("Wialon token removed", "success");
  renderWialonSettingsForm();
}
async function saveTruckWialonId(id) {
  var _a;
  if (!isAdmin()) {
    toast("Only administrators can link Wialon units", "error");
    return;
  }
  const t = state.db.trucks.find((t2) => t2.id === id);
  if (!t) return;
  const val = (((_a = document.getElementById("tw_wialonId")) == null ? void 0 : _a.value) || "").trim();
  if (val && !/^\d+$/.test(val)) {
    toast("A Wialon unit ID is a number, e.g. 601620738 (not the tracker IMEI)", "error", 5e3);
    return;
  }
  const { error } = await supabase.rpc("set_truck_wialon_unit", { p_truck_id: id, p_unit: val });
  if (error) {
    toast("Could not save the Wialon unit ID \u2014 " + error.message, "error", 5e3);
    return;
  }
  t.wialonUnitId = val;
  addAudit(state.profile.username, "Wialon Unit Linked", "".concat(t.reg, " \u2192 ").concat(val || "(cleared)"));
  toast(val ? "".concat(t.reg, " linked to Wialon unit ").concat(val, " \u2014 first position arrives within a minute") : "".concat(t.reg, " unlinked from Wialon"), "success");
  showTruckDetail(id);
}
function initTrackingSection() {
  renderTracking();
  initTrackingMap();
}
const TRACKABLE_TRUCK_STATUSES = ["available", "on_trip", "breakdown"];
function renderTracking() {
  const pos = state.db.trackingPositions || {};
  const activeTrucks = state.db.trucks.filter((t) => TRACKABLE_TRUCK_STATUSES.includes(t.status));
  const states = activeTrucks.map((t) => truckMovingState(t.id));
  const n = (k) => states.filter((s) => s.kind === k).length;
  const noSignal = n("offline") + n("stale") + n("none");
  document.getElementById("trackingMeta").textContent = "".concat(activeTrucks.length, " vehicle").concat(activeTrucks.length === 1 ? "" : "s", " tracked \xB7 ").concat(n("moving"), " moving \xB7 ").concat(n("stopped"), " stopped \xB7 ").concat(noSignal, " no signal");
  const vehicles = document.getElementById("trackingVehicles");
  if (vehicles) {
    vehicles.innerHTML = activeTrucks.map((t) => {
      const p = pos[t.id];
      const dr = state.db.drivers.find((d) => d.truckId === t.id);
      const hasFix = !!p;
      const srcTag = hasFix ? "<span>".concat(truckMovementBadge(t.id), "</span>") : '<span style="color:var(--text-3)">'.concat(t.wialonUnitId ? "No Wialon signal yet \u2014 unit may be offline or not synced" : "No phone signal \u2014 driver may be off duty or offline", "</span>");
      return '<div class="tv-item" '.concat(hasFix ? "onclick=\"focusTruckOnMap('".concat(t.id, "')\"") : "", '>\n        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><span class="tv-reg">').concat(esc(t.reg), "</span>").concat(sbadge(t.status), '</div>\n        <div style="margin-top:2px">').concat(dr ? esc(dr.name) : "Unassigned", '</div>\n        <div style="font-size:9px;margin-top:2px">').concat(srcTag, "</div>\n        ").concat(hasFix ? '<div style="font-size:9px;color:var(--text-3);margin-top:2px">'.concat(esc(p.zone || ""), " \xB7 ").concat(positionSourceLabel(p), "</div>") : "", '\n        <button class="tbl-btn" style="margin-top:6px;width:100%" ').concat(hasFix ? "" : "disabled", ' onclick="event.stopPropagation();').concat(hasFix ? "showStreetView(".concat(p.lat, ",").concat(p.lng, ",'").concat(esc(t.reg), "')") : "", '">\u{1F9ED} Street View</button>\n      </div>');
    }).join("") || '<div style="padding:10px;color:var(--text-3);font-size:11px">No vehicles to track</div>';
  }
  const movements = document.getElementById("trackingMovements");
  if (movements) {
    const rows = activeTrucks.filter((t) => pos[t.id]).sort((a, b) => {
      const rank = (k) => k === "moving" ? 0 : k === "stopped" ? 1 : 2;
      return rank(truckMovingState(a.id).kind) - rank(truckMovingState(b.id).kind);
    });
    movements.innerHTML = rows.map((t) => {
      const p = pos[t.id];
      return '<div class="movement-row" onclick="focusTruckOnMap(\''.concat(t.id, '\')"><div class="mono" style="font-size:10px;color:var(--gold)">').concat(esc(t.reg), '</div><div style="font-size:11px;color:var(--text-2)">').concat(esc(p.zone || ""), '</div><div style="font-size:10.5px">').concat(truckMovementBadge(t.id), "</div></div>");
    }).join("") || '<div style="padding:12px;color:var(--text-3)">No active movements</div>';
  }
  const geofence = document.getElementById("trackingGeofence");
  if (geofence) {
    geofence.innerHTML = geofenceEvents().slice(0, 8).map((e) => '<div class="geofence-row-wrap">\n      <div class="activity-row" style="cursor:pointer" onclick="toggleGeofenceEvent(\''.concat(e.id, '\')">\n        <span class="act-icon">').concat(e.icon, '</span><span style="flex:1">').concat(esc(e.text), '</span>\n        <span class="act-time">').concat(timeAgo(e.time), '</span>\n        <span style="margin-left:6px;opacity:0.6;font-size:10px">').concat(state.geofenceExpanded.has(e.id) ? "\u25B2" : "\u25BC", "</span>\n      </div>\n      ").concat(state.geofenceExpanded.has(e.id) ? renderGeofenceEventDetail(e) : "", "\n    </div>")).join("") || '<div style="padding:12px;color:var(--text-3);font-size:10.5px">No gate events recorded</div>';
  }
}
function geofenceEvents() {
  const events = [];
  (state.db.trips || []).forEach((t) => {
    events.push({ id: t.id + "-out", tripId: t.id, text: "Gate-out \u2014 ".concat(t.container, " departed ").concat(t.origin), time: t.startTime, icon: "\u{1F4E4}" });
    if (t.status === "completed") events.push({ id: t.id + "-in", tripId: t.id, text: "Gate-in \u2014 ".concat(t.container, " arrived ").concat(t.dest), time: t.startTime, icon: "\u{1F4E5}" });
    if (t.status === "delayed") events.push({ id: t.id + "-hold", tripId: t.id, text: "Holding near ".concat(t.dest, " \u2014 ").concat(t.container, " (Delayed)"), time: t.startTime, icon: "\u23F1\uFE0F" });
    if (t.status === "breakdown") events.push({ id: t.id + "-stop", tripId: t.id, text: "Stopped en route \u2014 ".concat(t.container, " (Breakdown)"), time: t.startTime, icon: "\u26A0\uFE0F" });
  });
  events.sort((a, b) => new Date(b.time) - new Date(a.time));
  return events;
}
function toggleGeofenceEvent(id) {
  if (state.geofenceExpanded.has(id)) state.geofenceExpanded.delete(id);
  else state.geofenceExpanded.add(id);
  renderTracking();
}
function renderGeofenceEventDetail(e) {
  const t = state.db.trips.find((x) => x.id === e.tripId);
  if (!t) return "";
  return '<div style="padding:10px 12px 12px;margin:2px 0 6px;background:var(--surface-2);border-radius:8px">\n    <div class="detail-row"><span>Route</span><b>'.concat(esc(t.origin), " \u2192 ").concat(esc(t.dest), '</b></div>\n    <div class="detail-row"><span>Truck / Driver</span><b>').concat(esc(truckName(t.truckId)), " \xB7 ").concat(esc(driverName(t.driverId)), '</b></div>\n    <div class="detail-row"><span>Distance</span><b>').concat(t.distance || 0, ' km</b></div>\n    <div class="detail-row"><span>Status</span><b>').concat(sbadge(t.status), '</b></div>\n    <div style="margin-top:10px"><button class="tbl-btn" onclick="event.stopPropagation();closeModal();showTripDetail(\'').concat(t.id, "')\">View Trip \u2192</button></div>\n  </div>");
}
function showStreetView(lat, lng, label) {
  const embedUrl = "https://www.google.com/maps?layer=c&cbll=".concat(lat, ",").concat(lng, "&output=svembed");
  const openUrl = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=".concat(lat, ",").concat(lng);
  openModal("Street View" + (label ? " \u2014 " + esc(label) : ""), '\n    <div style="position:relative;width:100%;padding-top:64%;border-radius:8px;overflow:hidden;background:var(--surface)">\n      <iframe src="'.concat(embedUrl, '" style="position:absolute;inset:0;width:100%;height:100%;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>\n    </div>\n    <a class="modal-btn ghost" style="margin-top:12px;width:100%;text-decoration:none;box-sizing:border-box;display:block;text-align:center" href="').concat(openUrl, '" target="_blank" rel="noopener">\u2197 Open Full Street View in Google Maps</a>\n  '));
}
function focusTruckOnMap(truckId) {
  var _a;
  const p = (_a = state.db.trackingPositions) == null ? void 0 : _a[truckId];
  if (!p || !state.trackingMap) return;
  state.trackingMap.setView([p.lat, p.lng], Math.max(state.trackingMap.getZoom(), 13), { animate: true });
  const marker = state.truckMarkers[truckId];
  if (marker) marker.openPopup();
}
function fitTrackingBounds() {
  if (!state.trackingMap) return;
  const markers = Object.values(state.truckMarkers);
  if (!markers.length) {
    toast("No vehicles currently tracked", "info", 1800);
    return;
  }
  const group = L.featureGroup(markers);
  state.trackingMap.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 });
}
async function refreshTracking(silent) {
  const { data, error } = await supabase.from("tracking_positions").select("*");
  if (error) {
    if (!silent) toast("Could not refresh tracking data", "error");
    return;
  }
  const fresh = {};
  (data || []).forEach((r) => {
    fresh[r.truck_id] = mapPositionRow(r);
  });
  state.db.trackingPositions = fresh;
  renderTracking();
  updateTrackingMarkers();
  if (!silent) toast("Tracking positions refreshed", "info", 1800);
}
function subscribeTrackingRealtime() {
  if (state._trackingChannel) return;
  state._trackingChannel = supabase.channel("tracking-positions-live").on("postgres_changes", { event: "*", schema: "public", table: "tracking_positions" }, (payload) => {
    var _a;
    if (payload.eventType === "DELETE") {
      const id = (_a = payload.old) == null ? void 0 : _a.truck_id;
      if (id) delete state.db.trackingPositions[id];
    } else {
      const r = payload.new;
      state.db.trackingPositions[r.truck_id] = mapPositionRow(r);
    }
    if (state.currentSection === "livetracking") {
      renderTracking();
      updateTrackingMarkers();
    }
  }).subscribe();
}
function loadGoogleMapsScript(cb) {
  if (window.L) {
    cb(null);
    return;
  }
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (window.L) {
      clearInterval(iv);
      cb(null);
    } else if (tries > 20) {
      clearInterval(iv);
      cb(new Error("load-failed"));
    }
  }, 150);
}
function initTrackingMap() {
  const canvas = document.getElementById("trackingMapCanvas");
  if (!canvas) return;
  if (state.trackingMap) {
    updateTrackingMarkers();
    return;
  }
  loadGoogleMapsScript((err) => {
    if (err) {
      canvas.innerHTML = '<div class="tracking-map-placeholder"><div style="font-family:var(--font-brand);font-size:20px;color:var(--gold);margin-bottom:8px">GARGO</div><div style="font-size:12px;color:var(--text-2);max-width:380px;line-height:1.6">Map failed to load \u2014 check your internet connection. Vehicle data will still populate the lists on the right.</div></div>';
      return;
    }
    canvas.innerHTML = "";
    state.trackingMap = L.map(canvas, {
      center: [-4.0435, 39.6682],
      // Mombasa
      zoom: 12
    });
    const streetLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    });
    let savedLayer = "street";
    try {
      savedLayer = localStorage.getItem("gargo-map-layer") === "satellite" ? "satellite" : "street";
    } catch (e) {
    }
    (savedLayer === "satellite" ? satelliteLayer : streetLayer).addTo(state.trackingMap);
    L.control.layers({ "Street": streetLayer, "Satellite": satelliteLayer }, null, { position: "topright", collapsed: true }).addTo(state.trackingMap);
    state.trackingMap.on("baselayerchange", (e) => {
      try {
        localStorage.setItem("gargo-map-layer", e.layer === satelliteLayer ? "satellite" : "street");
      } catch (err2) {
      }
    });
    state.truckMarkers = {};
    updateTrackingMarkers();
    fitTrackingBounds();
  });
}
function updateTrackingMarkers() {
  if (!state.trackingMap || !window.L) return;
  const pos = state.db.trackingPositions || {};
  const seen = /* @__PURE__ */ new Set();
  Object.entries(pos).forEach(([truckId, p]) => {
    seen.add(truckId);
    const truck = state.db.trucks.find((t) => t.id === truckId);
    const label = esc((truck == null ? void 0 : truck.reg) || truckId);
    const dotColor = truckMarkerColour(truckMovingState(truckId).kind);
    const icon = L.divIcon({
      className: "truck-marker",
      html: '<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:14px;height:14px;border-radius:50%;background:'.concat(dotColor, ';border:2px solid #0b0b0b;box-shadow:0 0 0 1px rgba(255,255,255,.15)"></div><div style="font-size:9px;font-weight:700;color:#fff;background:rgba(11,11,11,.75);padding:1px 5px;border-radius:3px;white-space:nowrap">').concat(label, "</div></div>"),
      iconSize: [60, 30],
      iconAnchor: [7, 7]
    });
    let marker = state.truckMarkers[truckId];
    if (!marker) {
      marker = L.marker([p.lat, p.lng], { icon }).addTo(state.trackingMap);
      marker.bindPopup("");
      marker.on("click", () => {
        const cur = state.db.trackingPositions[truckId];
        if (!cur) return;
        marker.setPopupContent('<div style="font-family:sans-serif;font-size:12px;color:#111"><b>'.concat(label, "</b><br>").concat(esc(cur.zone || ""), "<br>").concat(truckMovementBadge(truckId), "<br>").concat(cur.speed, " km/h \xB7 ").concat(cur.heading, '<br><span style="color:#888;font-size:10px">').concat(positionSourceLabel(cur), " \xB7 updated ").concat(timeAgo(cur.lastUpdate), '</span><br><button class="tbl-btn" style="margin-top:6px" onclick="showStreetView(').concat(cur.lat, ",").concat(cur.lng, ",'").concat(label, "')\">\u{1F9ED} Street View</button></div>"));
      });
      state.truckMarkers[truckId] = marker;
    } else {
      marker.setLatLng([p.lat, p.lng]);
      marker.setIcon(icon);
    }
  });
  Object.keys(state.truckMarkers).forEach((id) => {
    if (!seen.has(id)) {
      state.trackingMap.removeLayer(state.truckMarkers[id]);
      delete state.truckMarkers[id];
    }
  });
}
async function renderWialonSettingsForm() {
  const el = document.getElementById("wialonConfigForm");
  if (!el) return;
  const s = state.db.settings || {};
  const trucksWithUnit = wialonTrackedTrucks();
  el.innerHTML = '\n    <label style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-2);cursor:pointer">\n      <input type="checkbox" id="st_wialonEnabled" '.concat(s.wialonEnabled ? "checked" : "", ' style="accent-color:var(--gold)"/> Enable Wialon GPS integration\n    </label>\n    <div class="fg" style="margin:0"><label>Wialon Host</label><input id="st_wialonHost" value="').concat(esc(s.wialonHost || "https://hst-api.wialon.com"), '" placeholder="https://hst-api.wialon.com"/></div>\n    <div class="fg" style="margin:0"><label>API Token</label><input id="st_wialonToken" type="password" autocomplete="off" value="" placeholder="Paste a token to set or replace it"/></div>\n    <div id="st_wialonTokenStatus" style="font-size:10px;color:var(--text-3)">Checking saved token\u2026</div>\n    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">\n      ').concat(trucksWithUnit.length ? "".concat(trucksWithUnit.length, " truck").concat(trucksWithUnit.length === 1 ? "" : "s", " linked to a Wialon unit ID \u2014 set per-truck under Fleet \u2192 truck detail.") : "No trucks are linked to a Wialon unit yet \u2014 open a truck's detail card under Fleet and set its Wialon Unit ID (Test Connection lists the IDs).", '\n      The server pulls positions every minute; they appear on the live tracking map tagged "Wialon GPS". The token is stored on the server only and can\'t be read back.\n    </div>\n    <div style="display:flex;gap:8px;margin-top:4px">\n      <button class="action-btn ghost" style="flex:1" onclick="testWialonConnection()">Test Connection</button>\n      <button class="submit-btn" style="flex:1;margin-top:0" onclick="saveWialonSettings()">Save \u2192</button>\n    </div>\n  ');
  const { data, error } = await supabase.rpc("wialon_token_configured");
  const status = document.getElementById("st_wialonTokenStatus");
  if (!status) return;
  if (error) {
    status.textContent = "Could not check the saved token status";
    return;
  }
  status.innerHTML = data === true ? '<span style="color:var(--green,#3ecf6e)">\u2713 A token is saved on the server</span> \xB7 <a href="#" style="color:var(--red,#e5484d)" onclick="event.preventDefault();clearWialonToken()">Remove</a>' : '<span style="color:var(--amber,#d99a2b)">No token saved yet \u2014 live Wialon positions won\u2019t sync until one is saved</span>';
}
