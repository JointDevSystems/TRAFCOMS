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


// ── Live GPS: server-synced Wialon + driver phones ────────────────────────────
// Wialon positions are pulled SERVER-SIDE by the wialon-sync edge function (cron, every minute)
// and written to tracking_positions; driver phones write their own rows. The browser only READS
// positions. It never talks to Wialon for live data and never holds the Wialon API token.

const TRACKING_REFRESH_MS = 30000;   // fallback refresh while Live Tracking is open (realtime does the rest)
const GPS_STALE_MINUTES = 15;        // a fix older than this can't be trusted as "current"
const SYNC_STALE_MINUTES = 6;        // wialon-sync runs every minute; older means the pipeline is behind
const MOVING_SPEED_THRESHOLD_KMH = 3;

let _trackingRefreshTimer = null;

function wialonConfig() {
  const s = state.db?.settings || {};
  return {
    enabled: !!s.wialonEnabled,
    host: (s.wialonHost || 'https://hst-api.wialon.com').trim().replace(/\/+$/, ''),
  };
}

function wialonTrackedTrucks() {
  return (state.db?.trucks || []).filter(t => t.wialonUnitId);
}

// One mapper for every path that loads a tracking_positions row (initial load, refresh, realtime).
function mapPositionRow(r) {
  return {
    lat: r.lat, lng: r.lng, speed: r.speed, heading: r.heading, zone: r.zone,
    lastUpdate: r.last_update, source: r.source || 'driver_app',
    moving: r.moving ?? null, stoppedSince: r.stopped_since || null, syncedAt: r.synced_at || null,
  };
}

function minutesSince(iso) {
  const t = iso ? new Date(iso).getTime() : NaN;
  return isNaN(t) ? Infinity : (Date.now() - t) / 60000;
}

function fmtStopDuration(mins) {
  if (typeof mins !== 'number' || !isFinite(mins) || mins < 0) return '';
  if (mins < 60) return Math.max(1, Math.round(mins)) + 'm';
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}

// Single source of truth for "what is this truck doing right now" — used by the badge, the list
// order, the map marker colour and the counts, so they can never disagree.
//   none    no position row at all
//   stale   we can't trust the data: server sync is behind (Wialon) or phone fix is old
//   offline the sync is healthy but the Wialon tracker itself stopped reporting
//   moving / stopped   a current fix (speed above a small noise threshold counts as moving)
function truckMovingState(truckId) {
  const p = state.db.trackingPositions?.[truckId];
  if (!p) return { kind: 'none', p: null };
  const fixAge = minutesSince(p.lastUpdate);
  if (p.source === 'wialon') {
    if (minutesSince(p.syncedAt || p.lastUpdate) > SYNC_STALE_MINUTES) return { kind: 'stale', p, fixAge };
    if (fixAge > GPS_STALE_MINUTES) return { kind: 'offline', p, fixAge };
  } else if (fixAge > GPS_STALE_MINUTES) {
    return { kind: 'stale', p, fixAge };
  }
  const moving = p.moving === true || (p.speed || 0) > MOVING_SPEED_THRESHOLD_KMH;
  const stopMin = (!moving && p.stoppedSince) ? minutesSince(p.stoppedSince) : null;
  return { kind: moving ? 'moving' : 'stopped', p, fixAge, stopMin };
}

function truckMovementBadge(truckId) {
  const s = truckMovingState(truckId);
  if (s.kind === 'none') return '<span style="color:var(--text-3)">— No GPS fix</span>';
  const p = s.p, seen = timeAgo(p.lastUpdate);
  if (s.kind === 'offline') return `<span style="color:#d99a2b">⚠ Tracker offline · last seen ${seen}</span>`;
  if (s.kind === 'stale') return `<span style="color:#d99a2b">⚠ No recent fix · last seen ${seen}</span>`;
  if (s.kind === 'moving') return `<span style="color:var(--green,#3ecf6e)">● Moving${p.speed > 0 ? ' · ' + Math.round(p.speed) + ' km/h' : ''}</span>`;
  const dur = fmtStopDuration(s.stopMin);
  return `<span style="color:var(--text-3)">■ Stopped${dur ? ' · ' + dur : ''}</span>`;
}

function truckMarkerColour(kind) {
  return kind === 'moving' ? '#3ecf6e' : kind === 'stopped' ? '#8b8b8b' : '#d99a2b';
}

function positionSourceLabel(p) { return p?.source === 'wialon' ? 'Wialon GPS' : 'Driver Phone'; }

// Fallback refresh, only while Live Tracking is open and the tab is visible. Realtime already pushes
// changes; this just covers a dropped websocket. (Old function names are kept as thin wrappers because
// login, logout and truck-linking code still call them.)
function startTrackingAutoRefresh() {
  if (_trackingRefreshTimer) return;
  _trackingRefreshTimer = setInterval(() => {
    if (document.hidden || state.currentSection !== 'livetracking') return;
    refreshTracking(true);
  }, TRACKING_REFRESH_MS);
}
function stopTrackingAutoRefresh() {
  if (_trackingRefreshTimer) { clearInterval(_trackingRefreshTimer); _trackingRefreshTimer = null; }
}
function startWialonPolling() { startTrackingAutoRefresh(); }
function stopWialonPolling() { stopTrackingAutoRefresh(); }

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.currentUser && state.currentSection === 'livetracking') refreshTracking(true);
});

// ── Admin-only: test a token that was just typed into the settings form ──────────────────────────
// This is the ONLY place the browser talks to Wialon, and only with a token the admin is typing right now
// (to check it and to list unit IDs). Saved tokens live on the server and can't be read back.
async function wialonRemoteCall(host, svc, params, sid) {
  const url = `${host}/wialon/ajax.html?svc=${encodeURIComponent(svc)}&params=${encodeURIComponent(JSON.stringify(params))}${sid ? `&sid=${encodeURIComponent(sid)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wialon HTTP ${res.status}`);
  const data = await res.json();
  if (data && typeof data.error === 'number' && data.error !== 0) throw new Error(`Wialon error ${data.error}`);
  return data;
}

async function testWialonConnection() {
  const host  = (document.getElementById('st_wialonHost')?.value || 'https://hst-api.wialon.com').trim().replace(/\/+$/, '');
  const token = (document.getElementById('st_wialonToken')?.value || '').trim();
  if (!token) { toast('Paste a token into the field to test it — a saved token is only used by the server and can\u2019t be read back', 'info', 4500); return; }
  toast('Testing Wialon connection…', 'info', 1500);
  let sid;
  try {
    const login = await wialonRemoteCall(host, 'token/login', { token });
    sid = login?.eid;
    if (!sid) throw new Error('No session returned');
    const found = await wialonRemoteCall(host, 'core/search_items', {
      spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
      force: 1, flags: 1, from: 0, to: 0,
    }, sid);
    const units = (found?.items || []).slice().sort((a, b) => String(a.nm).localeCompare(String(b.nm)));
    const linked = new Map(wialonTrackedTrucks().map(t => [String(t.wialonUnitId), t.reg]));
    toast(`Connected to Wialon${login.user?.nm ? ' as ' + login.user.nm : ''} ✓`, 'success');
    openModal('Wialon units this token can see', `
      <div style="font-size:11.5px;color:var(--text-2);line-height:1.6;margin-bottom:10px">
        Enter the <b>ID</b> on the matching truck's detail card under Fleet → Wialon GPS Unit. Remember to click <b>Save</b> on the settings form to store the token.
      </div>
      <div style="max-height:320px;overflow:auto;border:1px solid var(--border);border-radius:8px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="text-align:left;color:var(--text-3);font-size:10px;text-transform:uppercase;letter-spacing:1px"><th style="padding:8px">Unit name</th><th style="padding:8px">ID</th><th style="padding:8px">Linked to</th></tr></thead>
          <tbody>${units.map(u => `<tr style="border-top:1px solid var(--border)"><td style="padding:8px">${esc(u.nm)}</td><td class="mono" style="padding:8px;color:var(--gold)">${esc(u.id)}</td><td style="padding:8px;color:var(--text-3)">${linked.has(String(u.id)) ? esc(linked.get(String(u.id))) : '—'}</td></tr>`).join('') || '<tr><td colspan="3" style="padding:12px;color:var(--text-3)">This token can\u2019t see any units — check the Wialon user\u2019s access rights.</td></tr>'}</tbody>
        </table>
      </div>`);
  } catch (e) {
    toast(`Wialon connection failed — ${e.message}`, 'error');
  } finally {
    if (sid) { try { await wialonRemoteCall(host, 'core/logout', {}, sid); } catch { /* best effort */ } }
  }
}

async function saveWialonSettings() {
  if (!isAdmin()) { toast('Only administrators can change GPS settings', 'error'); return; }
  const enabled = !!document.getElementById('st_wialonEnabled')?.checked;
  const host    = (document.getElementById('st_wialonHost')?.value || '').trim() || 'https://hst-api.wialon.com';
  const token   = (document.getElementById('st_wialonToken')?.value || '').trim();
  if (!/^https:\/\//i.test(host)) { toast('Wialon host must start with https://', 'error'); return; }

  if (token) {
    const { error } = await supabase.rpc('set_wialon_token', { p_token: token });
    if (error) { toast('Could not save the token — ' + error.message, 'error', 5000); return; }
  }
  state.db.settings = state.db.settings || {};
  state.db.settings.wialonEnabled = enabled;
  state.db.settings.wialonHost = host;
  scheduleSave();
  addAudit(state.profile.username, 'Wialon Settings', `GPS integration ${enabled ? 'enabled' : 'disabled'}${token ? ' · API token updated' : ''}`);
  toast('Wialon settings saved', 'success');
  renderSettings();
}

async function clearWialonToken() {
  if (!isAdmin()) return;
  if (!confirm('Remove the saved Wialon token? Live Wialon positions will stop updating until a new token is saved.')) return;
  const { error } = await supabase.rpc('set_wialon_token', { p_token: '' });
  if (error) { toast('Could not remove the token — ' + error.message, 'error'); return; }
  addAudit(state.profile.username, 'Wialon Settings', 'API token removed');
  toast('Wialon token removed', 'success');
  renderWialonSettingsForm();
}

// Inline "Wialon Unit ID" editor on the truck detail modal (admin only).
function saveTruckWialonId(id) {
  const t = state.db.trucks.find(t => t.id === id);
  if (!t) return;
  const val = (document.getElementById('tw_wialonId')?.value || '').trim();
  t.wialonUnitId = val;
  scheduleSave();
  addAudit(state.profile.username, 'Wialon Unit Linked', `${t.reg} → ${val || '(cleared)'}`);
  toast(val ? `${t.reg} linked to Wialon unit ${val} — first position arrives within a minute` : `${t.reg} unlinked from Wialon`, 'success');
  showTruckDetail(id);
}

function initTrackingSection() {
  renderTracking();
  initTrackingMap();
}


const TRACKABLE_TRUCK_STATUSES = ['available', 'on_trip', 'breakdown'];

function renderTracking() {
  const pos = state.db.trackingPositions || {};
  const activeTrucks = state.db.trucks.filter(t => TRACKABLE_TRUCK_STATUSES.includes(t.status));
  const states = activeTrucks.map(t => truckMovingState(t.id));
  const n = k => states.filter(s => s.kind === k).length;
  const noSignal = n('offline') + n('stale') + n('none');
  document.getElementById('trackingMeta').textContent =
    `${activeTrucks.length} vehicle${activeTrucks.length===1?'':'s'} tracked · ${n('moving')} moving · ${n('stopped')} stopped · ${noSignal} no signal`;

  const vehicles = document.getElementById('trackingVehicles');
  if (vehicles) {
    vehicles.innerHTML = activeTrucks.map(t=>{
      const p = pos[t.id];
      const dr = state.db.drivers.find(d=>d.truckId===t.id);
      const hasFix = !!p;
      const srcTag = hasFix
        ? `<span>${truckMovementBadge(t.id)}</span>`
        : `<span style="color:var(--text-3)">${t.wialonUnitId ? 'No Wialon signal yet — unit may be offline or not synced' : 'No phone signal — driver may be off duty or offline'}</span>`;
      return `<div class="tv-item" ${hasFix ? `onclick="focusTruckOnMap('${t.id}')"` : ''}>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><span class="tv-reg">${esc(t.reg)}</span>${sbadge(t.status)}</div>
        <div style="margin-top:2px">${dr ? esc(dr.name) : 'Unassigned'}</div>
        <div style="font-size:9px;margin-top:2px">${srcTag}</div>
        ${hasFix ? `<div style="font-size:9px;color:var(--text-3);margin-top:2px">${esc(p.zone||'')} · ${positionSourceLabel(p)}</div>` : ''}
        <button class="tbl-btn" style="margin-top:6px;width:100%" ${hasFix?'':'disabled'} onclick="event.stopPropagation();${hasFix?`showStreetView(${p.lat},${p.lng},'${esc(t.reg)}')`:''}">🧭 Street View</button>
      </div>`;
    }).join('') || '<div style="padding:10px;color:var(--text-3);font-size:11px">No vehicles to track</div>';
  }

  const movements = document.getElementById('trackingMovements');
  if (movements) {
    const rows = activeTrucks.filter(t => pos[t.id]).sort((a, b) => {
      const rank = k => (k === 'moving' ? 0 : k === 'stopped' ? 1 : 2);
      return rank(truckMovingState(a.id).kind) - rank(truckMovingState(b.id).kind);
    });
    movements.innerHTML = rows.map(t=>{
      const p = pos[t.id];
      return `<div class="movement-row" onclick="focusTruckOnMap('${t.id}')"><div class="mono" style="font-size:10px;color:var(--gold)">${esc(t.reg)}</div><div style="font-size:11px;color:var(--text-2)">${esc(p.zone||'')}</div><div style="font-size:10.5px">${truckMovementBadge(t.id)}</div></div>`;
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

async function refreshTracking(silent) {
  const { data, error } = await supabase.from('tracking_positions').select('*');
  if (error) { if (!silent) toast('Could not refresh tracking data', 'error'); return; }
  const fresh = {};
  (data || []).forEach(r => { fresh[r.truck_id] = mapPositionRow(r); });
  state.db.trackingPositions = fresh;
  renderTracking();
  updateTrackingMarkers();
  if (!silent) toast('Tracking positions refreshed', 'info', 1800);
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
        state.db.trackingPositions[r.truck_id] = mapPositionRow(r);
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
    const dotColor = truckMarkerColour(truckMovingState(truckId).kind);
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
        marker.setPopupContent(`<div style="font-family:sans-serif;font-size:12px;color:#111"><b>${label}</b><br>${esc(cur.zone||'')}<br>${truckMovementBadge(truckId)}<br>${cur.speed} km/h · ${cur.heading}<br><span style="color:#888;font-size:10px">${positionSourceLabel(cur)} · updated ${timeAgo(cur.lastUpdate)}</span><br><button class="tbl-btn" style="margin-top:6px" onclick="showStreetView(${cur.lat},${cur.lng},'${esc(label)}')">🧭 Street View</button></div>`);
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

async function renderWialonSettingsForm() {
  const el = document.getElementById('wialonConfigForm');
  if (!el) return;
  const s = state.db.settings || {};
  const trucksWithUnit = wialonTrackedTrucks();
  el.innerHTML = `
    <label style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-2);cursor:pointer">
      <input type="checkbox" id="st_wialonEnabled" ${s.wialonEnabled ? 'checked' : ''} style="accent-color:var(--gold)"/> Enable Wialon GPS integration
    </label>
    <div class="fg" style="margin:0"><label>Wialon Host</label><input id="st_wialonHost" value="${esc(s.wialonHost || 'https://hst-api.wialon.com')}" placeholder="https://hst-api.wialon.com"/></div>
    <div class="fg" style="margin:0"><label>API Token</label><input id="st_wialonToken" type="password" autocomplete="off" value="" placeholder="Paste a token to set or replace it"/></div>
    <div id="st_wialonTokenStatus" style="font-size:10px;color:var(--text-3)">Checking saved token…</div>
    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">
      ${trucksWithUnit.length
        ? `${trucksWithUnit.length} truck${trucksWithUnit.length===1?'':'s'} linked to a Wialon unit ID — set per-truck under Fleet → truck detail.`
        : `No trucks are linked to a Wialon unit yet — open a truck's detail card under Fleet and set its Wialon Unit ID (Test Connection lists the IDs).`}
      The server pulls positions every minute; they appear on the live tracking map tagged "Wialon GPS". The token is stored on the server only and can't be read back.
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="action-btn ghost" style="flex:1" onclick="testWialonConnection()">Test Connection</button>
      <button class="submit-btn" style="flex:1;margin-top:0" onclick="saveWialonSettings()">Save →</button>
    </div>
  `;
  const { data, error } = await supabase.rpc('wialon_token_configured');
  const status = document.getElementById('st_wialonTokenStatus');
  if (!status) return;
  if (error) { status.textContent = 'Could not check the saved token status'; return; }
  status.innerHTML = data === true
    ? `<span style="color:var(--green,#3ecf6e)">✓ A token is saved on the server</span> · <a href="#" style="color:var(--red,#e5484d)" onclick="event.preventDefault();clearWialonToken()">Remove</a>`
    : '<span style="color:var(--amber,#d99a2b)">No token saved yet — live Wialon positions won\u2019t sync until one is saved</span>';
}