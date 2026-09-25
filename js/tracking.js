'use strict';


const GEO_PING_INTERVAL_MS = 10000;

async function checkGeoPermission() {
  if (!navigator.permissions?.query) { state.geoPermission = 'unknown'; return; }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    state.geoPermission = status.state;
    if (!state._geoPermWatched) {
      state._geoPermWatched = true;
      status.onchange = () => {
        state.geoPermission = status.state;
        const driver = myDriverRecord();
        if (status.state === 'granted' && driverShouldTrack(driver)) startDriverTracking();
        if (status.state === 'denied') stopDriverTracking();
        renderDutyBar();
      };
    }
  } catch {
    state.geoPermission = 'unknown';
  }
}

function requestLocationAccess() {
  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) return;
  if (!navigator.geolocation) { toast('This device does not support GPS location', 'error'); return; }
  toast('Requesting location access…', 'info', 1500);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.geoPermission = 'granted';
      onDriverPosition(pos);
      startDriverTracking();
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) state.geoPermission = 'denied';
      onDriverGeoError(err);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function startDriverTracking() {
  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) { stopDriverTracking(); return; }
  if (state.geoWatchId != null) return; // already running
  if (!navigator.geolocation) { toast('This device does not support GPS location', 'error'); return; }
  if (state.geoPermission === 'denied') { renderDutyBar(); return; } // don't spam the prompt if already blocked
  state.geoWatchId = navigator.geolocation.watchPosition(onDriverPosition, onDriverGeoError, {
    enableHighAccuracy: true, maximumAge: 5000, timeout: 20000,
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
    if (driver?.truckId) {
      const { error } = await supabase.from('tracking_positions').delete().eq('truck_id', driver.truckId);
      if (error) console.error('tracking_positions clear failed:', error.message);
      delete state.db.trackingPositions[driver.truckId];
      if (state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
    }
  }
  renderDutyBar();
}

function headingToCompass(deg) {
  if (deg == null || isNaN(deg)) return '—';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

async function onDriverPosition(pos) {
  const now = Date.now();
  if (now - state.lastGeoSend < GEO_PING_INTERVAL_MS) return; // throttle
  state.lastGeoSend = now;

  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) { stopDriverTracking(); return; }

  const { latitude, longitude, speed, heading } = pos.coords;
  const kph = (speed != null && speed >= 0 && !isNaN(speed)) ? Math.round(speed * 3.6) : 0;
  const hd  = headingToCompass(heading);

  let zone = _lastZoneVal;
  if (!zone || now - _lastZoneFetch > ZONE_LOOKUP_INTERVAL_MS) {
    zone = await reverseGeocodeZone(latitude, longitude);
    _lastZoneVal = zone;
    _lastZoneFetch = now;
  }

  const row = { truck_id: driver.truckId, lat: latitude, lng: longitude, speed: kph, heading: hd, zone, last_update: new Date().toISOString(), source: 'driver_app' };
  const { error } = await supabase.from('tracking_positions').upsert(row, { onConflict: 'truck_id' });
  if (error) {
    console.error('tracking ping failed:', error.message);
  } else {
    state.db.trackingPositions[driver.truckId] = { lat: latitude, lng: longitude, speed: kph, heading: hd, zone, lastUpdate: row.last_update, source: 'driver_app' };
    if (state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
  }
  state.trackingActive = true;
  renderDutyBar();
}

function onDriverGeoError(err) {
  state.trackingActive = false;
  let msg = 'GPS signal lost — retrying…';
  if (err.code === err.PERMISSION_DENIED) { msg = 'Location permission denied — enable location access to allow tracking'; state.geoPermission = 'denied'; }
  else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location unavailable — check your device GPS/network';
  toast(msg, 'error', 4500);
  renderDutyBar();
}

let _nominatimQueue = Promise.resolve();


const WIALON_POLL_INTERVAL_MS = 25000;

let _wialonSid = null;

let _wialonPollTimer = null;

function wialonConfig() {
  const s = state.db?.settings || {};
  return {
    enabled: !!s.wialonEnabled,
    token: (s.wialonToken || '').trim(),
    host: (s.wialonHost || 'https://hst-api.wialon.com').trim().replace(/\/+$/, ''),
  };
}

function wialonTrackedTrucks() {
  return (state.db?.trucks || []).filter(t => t.wialonUnitId);
}

async function wialonApi(host, svc, params, sid) {
  const url = `${host}/wialon/ajax.html?svc=${encodeURIComponent(svc)}&params=${encodeURIComponent(JSON.stringify(params))}${sid ? `&sid=${encodeURIComponent(sid)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wialon HTTP ${res.status}`);
  const data = await res.json();
  if (data && typeof data.error === 'number' && data.error !== 0) {
    const err = new Error(`Wialon error ${data.error}`);
    err.wialonCode = data.error;
    throw err;
  }
  return data;
}

// token/login — exchanges the long-lived API token for a session id (sid/eid).
async function wialonLogin(force) {
  const { token, host } = wialonConfig();
  if (!token) throw new Error('No Wialon API token configured');
  if (_wialonSid && !force) return _wialonSid;
  const data = await wialonApi(host, 'token/login', { token });
  if (!data?.eid) throw new Error('Wialon login did not return a session id');
  _wialonSid = data.eid;
  return _wialonSid;
}


async function wialonFetchAllUnits() {
  const { host } = wialonConfig();
  const spec = { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' };
  let sid = await wialonLogin();
  try {
    return await wialonApi(host, 'core/search_items', { spec, force: 1, flags: 1025, from: 0, to: 0 }, sid);
  } catch (e) {
    if (e.wialonCode === 1 || e.wialonCode === 4) { // 1=not logged in, 4=invalid session — retry once with a fresh login
      sid = await wialonLogin(true);
      return await wialonApi(host, 'core/search_items', { spec, force: 1, flags: 1025, from: 0, to: 0 }, sid);
    }
    throw e;
  }
}


async function pollWialonPositions() {
  const cfg = wialonConfig();
  if (!cfg.enabled || !cfg.token) return;

  const trackedTrucks = wialonTrackedTrucks();
  if (!trackedTrucks.length) return;

  let result;
  try {
    result = await wialonFetchAllUnits();
  } catch (e) {
    console.warn('Wialon poll failed:', e.message);
    return;
  }

  const byId = {};
  (result?.items || []).forEach(u => { byId[String(u.id)] = u; });

  let changed = false;
  for (const truck of trackedTrucks) {
    const unit = byId[String(truck.wialonUnitId)];
    const p = unit?.pos;
    if (!p) continue; // unit not visible to this token, or no fix reported yet

    const speed = Math.max(0, Math.round(p.s || 0));
    const heading = headingToCompass(p.c);

    let zone = state.db.trackingPositions?.[truck.id]?.zone;
    const zoneStale = !zone || (Date.now() - (_wialonLastZoneFetch[truck.id] || 0) > ZONE_LOOKUP_INTERVAL_MS);
    if (zoneStale) {
      try { zone = await reverseGeocodeZone(p.y, p.x); } catch { /* keep previous zone on failure */ }
      _wialonLastZoneFetch[truck.id] = Date.now();
    }

    const lastUpdate = p.t ? new Date(p.t * 1000).toISOString() : new Date().toISOString();
    const row = { truck_id: truck.id, lat: p.y, lng: p.x, speed, heading, zone, last_update: lastUpdate, source: 'wialon' };
    const { error } = await supabase.from('tracking_positions').upsert(row, { onConflict: 'truck_id' });
    if (error) { console.error('Wialon tracking write failed:', truck.reg, error.message); continue; }
    state.db.trackingPositions[truck.id] = { lat: p.y, lng: p.x, speed, heading, zone, lastUpdate, source: 'wialon' };
    changed = true;
  }

  if (changed && state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
}

function startWialonPolling() {
  const cfg = wialonConfig();
  if (!cfg.enabled || !cfg.token || !wialonTrackedTrucks().length) { stopWialonPolling(); return; }
  if (_wialonPollTimer) return;
  pollWialonPositions();
  _wialonPollTimer = setInterval(pollWialonPositions, WIALON_POLL_INTERVAL_MS);
}

function stopWialonPolling() {
  if (_wialonPollTimer) { clearInterval(_wialonPollTimer); _wialonPollTimer = null; }
  _wialonSid = null;
}


async function testWialonConnection() {
  const hostEl  = document.getElementById('st_wialonHost');
  const tokenEl = document.getElementById('st_wialonToken');
  const host  = (hostEl?.value || 'https://hst-api.wialon.com').trim().replace(/\/+$/, '');
  const token = (tokenEl?.value || '').trim();
  if (!token) { toast('Enter a Wialon API token first', 'error'); return; }
  toast('Testing Wialon connection…', 'info', 1500);
  try {
    const data = await wialonApi(host, 'token/login', { token });
    if (!data?.eid) throw new Error('No session returned');
    _wialonSid = data.eid;
    toast(`Connected to Wialon${data.user?.nm ? ' as ' + data.user.nm : ''} ✓`, 'success');
  } catch (e) {
    toast(`Wialon connection failed — ${e.message}`, 'error');
  }
}

function saveWialonSettings() {
  const enabled = !!document.getElementById('st_wialonEnabled')?.checked;
  const host    = (document.getElementById('st_wialonHost')?.value || '').trim() || 'https://hst-api.wialon.com';
  const token   = (document.getElementById('st_wialonToken')?.value || '').trim();

  state.db.settings = state.db.settings || {};
  state.db.settings.wialonEnabled = enabled;
  state.db.settings.wialonHost = host;
  state.db.settings.wialonToken = token;
  scheduleSave();
  addAudit(state.profile.username, 'Wialon Settings', `GPS integration ${enabled ? 'enabled' : 'disabled'}`);
  toast('Wialon settings saved', 'success');
  renderSettings();
  if (enabled) startWialonPolling(); else stopWialonPolling();
}

// Inline "Wialon Unit ID" editor on the truck detail modal (admin only).
function saveTruckWialonId(id) {
  const t = state.db.trucks.find(t => t.id === id);
  if (!t) return;
  const val = (document.getElementById('tw_wialonId')?.value || '').trim();
  t.wialonUnitId = val;
  scheduleSave();
  addAudit(state.profile.username, 'Wialon Unit Linked', `${t.reg} → ${val || '(cleared)'}`);
  toast(val ? `${t.reg} linked to Wialon unit ${val}` : `${t.reg} unlinked from Wialon`, 'success');
  showTruckDetail(id);
  if (state.db.settings?.wialonEnabled) startWialonPolling();
}

function initTrackingSection() {
  renderTracking();
  initTrackingMap();
}


const TRACKABLE_TRUCK_STATUSES = ['available', 'on_trip', 'breakdown'];

function renderTracking() {
  const pos = state.db.trackingPositions || {};
  const activeTrucks = state.db.trucks.filter(t => TRACKABLE_TRUCK_STATUSES.includes(t.status));
  const liveCount = activeTrucks.filter(t => pos[t.id]).length;
  document.getElementById('trackingMeta').textContent =
    `${activeTrucks.length} vehicle${activeTrucks.length===1?'':'s'} tracked · ${liveCount} reporting live`;

  const vehicles = document.getElementById('trackingVehicles');
  if (vehicles) {

    vehicles.innerHTML = activeTrucks.map(t=>{
      const p = pos[t.id];
      const dr = state.db.drivers.find(d=>d.truckId===t.id);
      const hasFix = !!p;
      const srcLabel = p?.source === 'wialon' ? 'Wialon GPS' : 'Driver Phone';
      const srcTag = hasFix
        ? `<span style="color:var(--green,#3ecf6e)">● Live — ${srcLabel} · ${timeAgo(p.lastUpdate)}</span>`
        : `<span style="color:var(--text-3)">${t.wialonUnitId ? 'No Wialon signal — unit may be offline' : 'No phone signal — driver may be off duty or offline'}</span>`;
      return `<div class="tv-item" ${hasFix ? `onclick="focusTruckOnMap('${t.id}')"` : ''}>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><span class="tv-reg">${esc(t.reg)}</span>${sbadge(t.status)}</div>
        <div style="margin-top:2px">${dr ? esc(dr.name) : 'Unassigned'}</div>
        <div style="font-size:9px;margin-top:2px">${srcTag}</div>
        ${hasFix ? `<div style="font-size:9px;color:var(--text-3);margin-top:2px">${esc(p.zone||'')} · ${p.speed>0?p.speed+' km/h':'Stationary'}</div>` : ''}
        <button class="tbl-btn" style="margin-top:6px;width:100%" ${hasFix?'':'disabled'} onclick="event.stopPropagation();${hasFix?`showStreetView(${p.lat},${p.lng},'${esc(t.reg)}')`:''}">🧭 Street View</button>
      </div>`;
    }).join('') || '<div style="padding:10px;color:var(--text-3);font-size:11px">No vehicles to track</div>';
  }

  const movements = document.getElementById('trackingMovements');
  if (movements) {
    const liveIds = Object.keys(pos);
    movements.innerHTML = liveIds.map(id=>{
      const p=pos[id]; const t=state.db.trucks.find(t=>t.id===id);
      return `<div class="movement-row" onclick="focusTruckOnMap('${id}')"><div class="mono" style="font-size:10px;color:var(--gold)">${t?esc(t.reg):id}</div><div style="font-size:11px;color:var(--text-2)">${esc(p.zone||'')} · ${p.speed>0?p.speed+' km/h':'Stationary'}</div><div style="font-size:9.5px;color:var(--text-3)">${timeAgo(p.lastUpdate)}</div></div>`;
    }).join('') || '<div style="padding:12px;color:var(--text-3)">No active movements</div>';
  }

  const geofence = document.getElementById('trackingGeofence');
  if (geofence) {
    geofence.innerHTML = geofenceEvents().slice(0, 8).map(e => `<div class="geofence-row-wrap">
      <div class="activity-row" style="cursor:pointer" onclick="toggleGeofenceEvent('${e.id}')">
        <span class="act-icon">${e.icon}</span><span style="flex:1">${esc(e.text)}</span>
        <span class="act-time">${timeAgo(e.time)}</span>
        <span style="margin-left:6px;opacity:0.6;font-size:10px">${state.geofenceExpanded.has(e.id) ? '▲' : '▼'}</span>
      </div>
      ${state.geofenceExpanded.has(e.id) ? renderGeofenceEventDetail(e) : ''}
    </div>`).join('') || '<div style="padding:12px;color:var(--text-3);font-size:10.5px">No gate events recorded</div>';
  }
}

// Lightweight, status-derived stand-in for real geofence entry/exit
// detection — no zone/radius math yet, just turns trip status into a
// plausible gate-style feed so dispatch has something actionable to click.
function geofenceEvents() {
  const events = [];
  (state.db.trips||[]).forEach(t => {
    events.push({ id: t.id+'-out', tripId: t.id, text: `Gate-out — ${t.container} departed ${t.origin}`, time: t.startTime, icon: '📤' });
    if (t.status === 'completed') events.push({ id: t.id+'-in', tripId: t.id, text: `Gate-in — ${t.container} arrived ${t.dest}`, time: t.startTime, icon: '📥' });
    if (t.status === 'delayed') events.push({ id: t.id+'-hold', tripId: t.id, text: `Holding near ${t.dest} — ${t.container} (Delayed)`, time: t.startTime, icon: '⏱️' });
    if (t.status === 'breakdown') events.push({ id: t.id+'-stop', tripId: t.id, text: `Stopped en route — ${t.container} (Breakdown)`, time: t.startTime, icon: '⚠️' });
  });
  events.sort((a,b)=> new Date(b.time) - new Date(a.time));
  return events;
}

function toggleGeofenceEvent(id) {
  if (state.geofenceExpanded.has(id)) state.geofenceExpanded.delete(id); else state.geofenceExpanded.add(id);
  renderTracking();
}

function renderGeofenceEventDetail(e) {
  const t = state.db.trips.find(x=>x.id===e.tripId);
  if (!t) return '';
  return `<div style="padding:10px 12px 12px;margin:2px 0 6px;background:var(--surface-2);border-radius:8px">
    <div class="detail-row"><span>Route</span><b>${esc(t.origin)} → ${esc(t.dest)}</b></div>
    <div class="detail-row"><span>Truck / Driver</span><b>${esc(truckName(t.truckId))} · ${esc(driverName(t.driverId))}</b></div>
    <div class="detail-row"><span>Distance</span><b>${t.distance||0} km</b></div>
    <div class="detail-row"><span>Status</span><b>${sbadge(t.status)}</b></div>
    <div style="margin-top:10px"><button class="tbl-btn" onclick="event.stopPropagation();closeModal();showTripDetail('${t.id}')">View Trip →</button></div>
  </div>`;
}


function showStreetView(lat, lng, label) {
  const embedUrl = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&output=svembed`;
  const openUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  openModal('Street View' + (label ? ' — ' + esc(label) : ''), `
    <div style="position:relative;width:100%;padding-top:64%;border-radius:8px;overflow:hidden;background:var(--surface)">
      <iframe src="${embedUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
    <a class="modal-btn ghost" style="margin-top:12px;width:100%;text-decoration:none;box-sizing:border-box;display:block;text-align:center" href="${openUrl}" target="_blank" rel="noopener">↗ Open Full Street View in Google Maps</a>
  `);
}

function focusTruckOnMap(truckId) {
  const p = state.db.trackingPositions?.[truckId];
  if (!p || !state.trackingMap) return;
  state.trackingMap.setView([p.lat, p.lng], Math.max(state.trackingMap.getZoom(), 13), { animate: true });
  const marker = state.truckMarkers[truckId];
  if (marker) marker.openPopup();
}

function fitTrackingBounds() {
  if (!state.trackingMap) return;
  const markers = Object.values(state.truckMarkers);
  if (!markers.length) { toast('No vehicles currently tracked', 'info', 1800); return; }
  const group = L.featureGroup(markers);
  state.trackingMap.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 });
}

async function refreshTracking() {
  const { data, error } = await supabase.from('tracking_positions').select('*');
  if (error) { toast('Could not refresh tracking data', 'error'); return; }
  const fresh = {};
  (data || []).forEach(r => { fresh[r.truck_id] = { lat:r.lat, lng:r.lng, speed:r.speed, heading:r.heading, zone:r.zone, lastUpdate:r.last_update, source:r.source||'driver_app' }; });
  state.db.trackingPositions = fresh;
  renderTracking();
  updateTrackingMarkers();
  toast('Tracking positions refreshed', 'info', 1800);
}

function subscribeTrackingRealtime() {
  if (state._trackingChannel) return;
  state._trackingChannel = supabase.channel('tracking-positions-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_positions' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const id = payload.old?.truck_id;
        if (id) delete state.db.trackingPositions[id];
      } else {
        const r = payload.new;
        state.db.trackingPositions[r.truck_id] = { lat:r.lat, lng:r.lng, speed:r.speed, heading:r.heading, zone:r.zone, lastUpdate:r.last_update, source:r.source||'driver_app' };
      }
      if (state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
    })
    .subscribe();
}

function loadGoogleMapsScript(cb) {
  if (window.L) { cb(null); return; }
 
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (window.L) { clearInterval(iv); cb(null); }
    else if (tries > 20) { clearInterval(iv); cb(new Error('load-failed')); }
  }, 150);
}

function initTrackingMap() {
  const canvas = document.getElementById('trackingMapCanvas');
  if (!canvas) return;
  if (state.trackingMap) { updateTrackingMarkers(); return; }
  loadGoogleMapsScript((err) => {
    if (err) {
      canvas.innerHTML = `<div class="tracking-map-placeholder"><div style="font-family:var(--font-brand);font-size:20px;color:var(--gold);margin-bottom:8px">GARGO</div><div style="font-size:12px;color:var(--text-2);max-width:380px;line-height:1.6">Map failed to load — check your internet connection. Vehicle data will still populate the lists on the right.</div></div>`;
      return;
    }
    canvas.innerHTML = '';
    state.trackingMap = L.map(canvas, {
      center: [-4.0435, 39.6682], // Mombasa
      zoom: 12,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(state.trackingMap);
    state.truckMarkers = {};
    updateTrackingMarkers();
    fitTrackingBounds();
  });
}

function updateTrackingMarkers() {
  if (!state.trackingMap || !window.L) return;
  const pos = state.db.trackingPositions || {};
  const seen = new Set();
  Object.entries(pos).forEach(([truckId, p]) => {
    seen.add(truckId);
    const truck = state.db.trucks.find(t => t.id === truckId);
    const label = truck?.reg || truckId;
    const isMoving = p.speed > 0;
    const dotColor = isMoving ? '#3ecf6e' : '#8b8b8b';
    const icon = L.divIcon({
      className: 'truck-marker',
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:14px;height:14px;border-radius:50%;background:${dotColor};border:2px solid #0b0b0b;box-shadow:0 0 0 1px rgba(255,255,255,.15)"></div><div style="font-size:9px;font-weight:700;color:#fff;background:rgba(11,11,11,.75);padding:1px 5px;border-radius:3px;white-space:nowrap">${label}</div></div>`,
      iconSize: [60, 30],
      iconAnchor: [7, 7],
    });
    let marker = state.truckMarkers[truckId];
    if (!marker) {
      marker = L.marker([p.lat, p.lng], { icon }).addTo(state.trackingMap);
      marker.bindPopup('');
      marker.on('click', () => {
        const cur = state.db.trackingPositions[truckId];
        if (!cur) return;
        marker.setPopupContent(`<div style="font-family:sans-serif;font-size:12px;color:#111"><b>${label}</b><br>${cur.zone}<br>${cur.speed} km/h · ${cur.heading}<br><span style="color:#888;font-size:10px">${cur.source==='wialon'?'Wialon GPS':'Driver Phone'} · ${timeAgo(cur.lastUpdate)}</span><br><button class="tbl-btn" style="margin-top:6px" onclick="showStreetView(${cur.lat},${cur.lng},'${esc(label)}')">🧭 Street View</button></div>`);
      });
      state.truckMarkers[truckId] = marker;
    } else {
      marker.setLatLng([p.lat, p.lng]);
      marker.setIcon(icon);
    }
  });

  Object.keys(state.truckMarkers).forEach(id => {
    if (!seen.has(id)) { state.trackingMap.removeLayer(state.truckMarkers[id]); delete state.truckMarkers[id]; }
  });
}

function renderWialonSettingsForm() {
  const el = document.getElementById('wialonConfigForm');
  if (!el) return;
  const s = state.db.settings || {};
  const trucksWithUnit = wialonTrackedTrucks();
  el.innerHTML = `
    <label style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-2);cursor:pointer">
      <input type="checkbox" id="st_wialonEnabled" ${s.wialonEnabled ? 'checked' : ''} style="accent-color:var(--gold)"/> Enable Wialon GPS integration
    </label>
    <div class="fg" style="margin:0"><label>Wialon Host</label><input id="st_wialonHost" value="${esc(s.wialonHost || 'https://hst-api.wialon.com')}" placeholder="https://hst-api.wialon.com"/></div>
    <div class="fg" style="margin:0"><label>API Token</label><input id="st_wialonToken" type="password" value="${esc(s.wialonToken || '')}" placeholder="Wialon Remote API token"/></div>
    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">
      ${trucksWithUnit.length
        ? `${trucksWithUnit.length} truck${trucksWithUnit.length===1?'':'s'} linked to a Wialon unit ID — set per-truck under Fleet → truck detail.`
        : `No trucks are linked to a Wialon unit yet — open a truck's detail card under Fleet and set its Wialon Unit ID.`}
      Positions refresh every ${WIALON_POLL_INTERVAL_MS/1000}s and appear on the live tracking map tagged "Wialon GPS".
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="action-btn ghost" style="flex:1" onclick="testWialonConnection()">Test Connection</button>
      <button class="submit-btn" style="flex:1;margin-top:0" onclick="saveWialonSettings()">Save →</button>
    </div>
  `;
}