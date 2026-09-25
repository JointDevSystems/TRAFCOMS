'use strict';


function truckToRow(t)  { return { id:t.id, reg:t.reg, make:t.make, type:t.type, year:t.year, colour:t.colour, status:t.status, fuel_pct:Math.round(t.fuelPct), mileage:t.mileage, last_service:t.lastService, next_service:t.nextService, notes:t.notes, licence_plate:t.licencePlate, vin:t.vin, img:t.img||'', wialon_unit_id:t.wialonUnitId||null }; }

function truckFromRow(r){ return { id:r.id, reg:r.reg, make:r.make, type:r.type, year:r.year, colour:r.colour, status:r.status, fuelPct:r.fuel_pct, mileage:r.mileage, driver:null, lastService:r.last_service, nextService:r.next_service, notes:r.notes||'', img:r.img||'', licencePlate:r.licence_plate, vin:r.vin||'', wialonUnitId:r.wialon_unit_id||'' }; }

function driverToRow(d)  { return { id:d.id, name:d.name, phone:d.phone, licence:d.licence, licence_exp:d.licenceExp, status:d.status, truck_id:d.truckId||null, trips_today:d.tripsToday, current_load:d.load, location:d.location, id_no:d.idNo, rating:d.rating, profile_id:d.profileId||null }; }

function driverFromRow(r){ return { id:r.id, name:r.name, phone:r.phone, licence:r.licence, licenceExp:r.licence_exp, status:r.status, truckId:r.truck_id, tripsToday:r.trips_today, load:r.current_load, location:r.location, idNo:r.id_no, rating:r.rating, profileId:r.profile_id||null }; }

function findTruckByReg(reg, excludeId) {
  if (!reg) return null;
  const r = reg.trim().toUpperCase();
  return state.db.trucks.find(t => t.id !== excludeId && (t.reg || '').toUpperCase() === r) || null;
}

function findDriverByPhone(phone, excludeId) {
  if (!phone) return null;
  const p = phone.replace(/\s+/g, '');
  return state.db.drivers.find(d => d.id !== excludeId && (d.phone || '').replace(/\s+/g, '') === p) || null;
}

let _truckFilter='all';

function filterTrucks(f,btn){ _truckFilter=f; document.querySelectorAll('#sec-trucks .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderTrucks(f); }

function renderTrucks(f){
  const trucks=f==='all'?state.db.trucks:state.db.trucks.filter(t=>t.status===f);
  const grid=document.getElementById('truckGrid');
  if(!grid) return;
  grid.innerHTML=trucks.map(t=>`<div class="truck-card${t.img?' has-photo':''}" onclick="showTruckDetail('${t.id}')">${t.img?`<img class="truck-card-img" src="${t.img}" alt="${t.reg}" /><div class="truck-card-img-overlay"></div>`:''}<div class="truck-card-inner"><div class="truck-card-status-bar ${t.status}"></div><div class="truck-card-body"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="truck-card-reg">${t.reg}</div><div class="truck-card-make">${t.make} · ${t.year}</div><div class="truck-card-type">${t.type}</div></div>${sbadge(t.status)}</div><div class="truck-card-stats"><div class="ts"><b>${fmt(t.mileage)} km</b>Odometer</div><div class="ts"><b>${t.driver?driverName(t.driver).split(' ')[0]:'—'}</b>Driver</div><div class="ts"><b>${t.colour}</b>Colour</div><div class="fuel-bar-outer"><div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-3);margin-top:6px"><span>Fuel</span><span style="color:${fuelColour(t.fuelPct)}">${t.fuelPct}%</span></div><div class="fuel-bar"><div class="fuel-fill" style="width:${t.fuelPct}%;background:${fuelColour(t.fuelPct)}"></div></div></div></div></div></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🚛</div><div class="empty-state-label">No trucks match this filter</div></div>';
}

function showTruckDetail(id) {
  const t = state.db.trucks.find(t=>t.id===id);
  if (!t) return;
  const trips = state.db.trips.filter(tr=>tr.truckId===id).slice(-5);
  const maint = state.db.maintenance.filter(m=>m.truckId===id);
  openModal(`Truck — ${t.reg}`, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Registration</label><div class="mono" style="padding:8px;background:var(--surface);border-radius:5px;color:var(--gold)">${t.reg}</div></div><div class="fg" style="margin:0"><label>Status</label><div style="padding:6px 0">${sbadge(t.status)}</div></div><div class="fg" style="margin:0"><label>Make / Model</label><div style="font-size:12px;color:var(--text)">${t.make}</div></div><div class="fg" style="margin:0"><label>Year</label><div style="font-size:12px;color:var(--text)">${t.year}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.type}</div></div><div class="fg" style="margin:0"><label>Colour</label><div style="font-size:12px;color:var(--text)">${t.colour}</div></div><div class="fg" style="margin:0"><label>Odometer</label><div style="font-size:12px;color:var(--text)">${fmt(t.mileage)} km</div></div><div class="fg" style="margin:0"><label>Fuel</label><div><div style="font-size:12px;color:${fuelColour(t.fuelPct)};font-weight:700">${t.fuelPct}%</div><div class="fuel-bar" style="margin-top:4px"><div class="fuel-fill" style="width:${t.fuelPct}%;background:${fuelColour(t.fuelPct)}"></div></div></div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Assigned Driver</label><div style="font-size:12px;color:var(--text)">${t.driver ? driverName(t.driver) : 'Unassigned'}</div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Last Service</label><div style="font-size:12px;color:var(--text)">${fmtDate(t.lastService)}</div></div></div><div style="margin-bottom:14px"><div class="fg" style="margin:0"><label>Next Service Due</label><div style="font-size:12px;color:${new Date(t.nextService) < Date.now()?'var(--red)':'var(--text)'}">${fmtDate(t.nextService)}</div></div></div>${t.notes?`<div class="ops-notice" style="margin-bottom:14px">${t.notes}</div>`:''}<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:6px">Recent Trips (${trips.length})</div>${trips.length ? trips.map(tr=>`<div class="activity-row"><div style="flex:1;font-size:11px;color:var(--text-2)">${tr.origin} → ${tr.dest} · ${tr.container}</div>${sbadge(tr.status)}<div class="act-time">${fmtDate(tr.startTime)}</div></div>`).join('') : '<div style="color:var(--text-3);font-size:11px;padding:8px 0">No trips recorded</div>'}${isAdmin() ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Admin — Status Override</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['available','on_trip','maintenance','breakdown','off_duty'].map(s=>`<button class="filter-btn${t.status===s?' active':''}" onclick="quickSetTruckStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="action-btn ghost" onclick="triggerImageUpload('trucks','${id}','img',()=>showTruckDetail('${id}'))">📷 Upload Truck Photo</button></div><div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Wialon GPS Unit</div><div style="font-size:9.5px;color:var(--text-3);margin-bottom:8px;line-height:1.5">If this truck has a dedicated Wialon AVL tracker fitted, enter its Wialon unit ID (from core/search_items) to source its live position from Wialon instead of the driver's phone.</div><div style="display:flex;gap:6px"><input id="tw_wialonId" value="${esc(t.wialonUnitId||'')}" placeholder="Wialon unit ID" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:5px;font-size:11.5px"/><button class="tbl-btn" onclick="saveTruckWialonId('${id}')">Save</button></div></div>${adminDeleteBtn('trucks', id)}</div>`: ''}`);
}

function quickSetTruckStatus(id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const t = state.db.trucks.find(t=>t.id===id);
  if (!t) return;
  t.status = status;
  scheduleSave();
  addAudit(state.profile.username, 'Status Override', `${t.reg} → ${status}`);
  buildBadges();
  closeModal();
  renderTrucks(_truckFilter);
  toast(`${t.reg} status set to ${status}`, 'success');
}

function saveTruck() {
  const reg   = document.getElementById('nt_reg').value.trim().toUpperCase();
  const make  = document.getElementById('nt_make').value.trim();
  if (!reg || !make) { toast('Registration and make are required', 'error'); return; }
  if (!/^[A-Z0-9\s]{3,10}$/.test(reg)) { toast('Invalid registration format. Use letters and numbers only.', 'error'); return; }
  const dupTruck = findTruckByReg(reg);
  if (dupTruck) { toast(`${reg} is already registered in the fleet`, 'error'); return; }
  const t = {
    id: uid('TRK'), reg, make,
    type:    document.getElementById('nt_type').value,
    year:    parseInt(document.getElementById('nt_year').value)||new Date().getFullYear(),
    colour:  document.getElementById('nt_colour').value.trim()||'White',
    fuelPct: Math.min(100, Math.max(0, parseInt(document.getElementById('nt_fuel').value)||100)),
    mileage: Math.max(0, parseInt(document.getElementById('nt_odo').value)||0),
    status:  'available',
    driver:  null,
    lastService: new Date().toISOString(),
    nextService: new Date(Date.now()+90*86400000).toISOString(),
    notes:   sanitize(document.getElementById('nt_notes').value.trim()),
    img:'',
    licencePlate: reg,
    vin: '',
    wialonUnitId: document.getElementById('nt_wialon').value.trim(),
  };
  state.db.trucks.push(t);
  scheduleSave();
  addAudit(state.profile.username, 'Truck Added', `${reg} — ${make}`);
  buildBadges();
  closeModal();
  renderTrucks('all');
  toast(`${reg} added to fleet`, 'success');
  if (t.wialonUnitId && state.db.settings?.wialonEnabled) startWialonPolling();
}

let _driverFilter='all';

function filterDrivers(f,btn){ _driverFilter=f; document.querySelectorAll('#sec-drivers .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderDrivers(f); }

function renderDrivers(f){
  const drivers=f==='all'?state.db.drivers:state.db.drivers.filter(d=>d.status===f);
  const tbody=document.getElementById('driverTableBody');
  if(!tbody) return;
  tbody.innerHTML=drivers.map(d=>`<tr onclick="showDriverDetail('${d.id}')"><td><div class="driver-cell"><div class="driver-avatar">${initials(d.name)}</div><div><div class="driver-name">${d.name}</div><div class="driver-id">${d.id}</div></div></div></td><td class="mono">${d.phone}</td><td class="mono">${d.licence}</td><td>${d.truckId ? `<span class="mono" style="color:var(--gold)">${state.db.trucks.find(t=>t.id===d.truckId)?.reg||'—'}</span>`: '—'}</td><td>${sbadge(d.status)}</td><td style="text-align:center;font-family:var(--font-mono)">${d.tripsToday}</td><td class="mono" style="font-size:10px">${d.load||'—'}</td><td style="font-size:11px;color:var(--text-3)">${d.location}</td><td><button class="tbl-btn" onclick="event.stopPropagation();showDriverDetail('${d.id}')">View</button></td></tr>`).join('')||`<tr><td colspan="9" class="empty-td">No drivers match this filter</td></tr>`;
}

function showDriverDetail(id) {
  const d = state.db.drivers.find(d=>d.id===id);
  if (!d) return;
  const licDays = Math.round((new Date(d.licenceExp)-Date.now())/86400000);
  const licWarn = licDays < 90;
  openModal(`Driver — ${d.name}`, `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div style="width:52px;height:52px;border-radius:50%;background:var(--gold-dim);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--gold)">${initials(d.name)}</div><div><div style="font-size:16px;font-weight:700;color:var(--text)">${d.name}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3)">${d.id}</div></div><div style="margin-left:auto">${sbadge(d.status)}</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Phone</label><div class="mono" style="font-size:12px;color:var(--text)">${d.phone}</div></div><div class="fg" style="margin:0"><label>Licence</label><div class="mono" style="font-size:12px;color:var(--text)">${d.licence}</div></div><div class="fg" style="margin:0"><label>Licence Expiry</label><div style="font-size:12px;color:${licWarn?'var(--amber)':'var(--text)'};font-weight:${licWarn?'700':'400'}">${fmtDate(d.licenceExp)}${licWarn?' ⚠':''}</div></div><div class="fg" style="margin:0"><label>Trips Today</label><div class="mono" style="font-size:16px;color:var(--gold);font-weight:700">${d.tripsToday}</div></div><div class="fg" style="margin:0"><label>Assigned Truck</label><div style="font-size:12px;color:var(--text)">${d.truckId?truckName(d.truckId):'Not assigned'}</div></div><div class="fg" style="margin:0"><label>Current Load</label><div class="mono" style="font-size:11px;color:var(--text)">${d.load||'None'}</div></div><div class="fg" style="margin:0"><label>Location</label><div style="font-size:12px;color:var(--text)">${d.location}</div></div><div class="fg" style="margin:0"><label>Rating</label><div style="font-size:12px;color:var(--gold)">⭐ ${d.rating||0}/5.0</div></div><div class="fg" style="margin:0"><label>ID No.</label><div class="mono" style="font-size:12px;color:var(--text)">${d.idNo||'—'}</div></div></div>${isAdmin()?`<div style="padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Admin — Status Override</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['available','on_trip','off_duty','suspended'].map(s=>`<button class="filter-btn${d.status===s?' active':''}" onclick="quickSetDriverStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div><div style="margin-top:14px"><label style="font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;font-family:var(--font-mono)">Linked Login (Driver Portal Access)</label><select onchange="linkDriverProfile('${id}', this.value)" style="width:100%;margin-top:6px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:7px;border-radius:5px;font-size:12px"><option value="">— Not linked —</option>${state.db.profiles.filter(p=>p.role==='driver').map(p=>`<option value="${p.id}" ${d.profileId===p.id?'selected':''}>${p.name} (${p.username})</option>`).join('')}</select></div>${adminDeleteBtn('drivers', id)}</div>`:''}`);
}

function quickSetDriverStatus(id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const d = state.db.drivers.find(d=>d.id===id);
  if (!d) return;
  d.status = status;
  scheduleSave();
  addAudit(state.profile.username, 'Driver Status Override', `${d.name} → ${status}`);
  closeModal();
  renderDrivers(_driverFilter);
  toast(`${d.name} status updated`, 'success');
}

function linkDriverProfile(driverId, profileId) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const d = state.db.drivers.find(d=>d.id===driverId);
  if (!d) return;
  d.profileId = profileId || null;
  scheduleSave();
  const p = profileId ? state.db.profiles.find(p=>p.id===profileId) : null;
  addAudit(state.profile.username, 'Driver Login Linked', `${d.name} ↔ ${p ? `${p.name} (${p.username})` : 'unlinked'}`);
  toast(p ? `${d.name} linked to ${p.name}'s login` : `${d.name} unlinked from login`, 'success');
  showDriverDetail(driverId);
}

function saveDriver() {
  const name = document.getElementById('nd_name').value.trim();
  const phone= document.getElementById('nd_phone').value.trim();
  const lic  = document.getElementById('nd_lic').value.trim().toUpperCase();
  if (!name) { toast('Full name is required', 'error'); return; }
  if (!validatePhone(phone)) { toast('Invalid phone number format', 'error'); return; }
  if (!lic) { toast('Licence number is required', 'error'); return; }
  const dupPhone = findDriverByPhone(phone);
  if (dupPhone) { toast(`A driver with phone ${phone} already exists (${dupPhone.name})`, 'error'); return; }
  const dupLic = state.db.drivers.find(dr=>(dr.licence||'').toUpperCase()===lic);
  if (dupLic) { toast(`Licence ${lic} is already registered to ${dupLic.name}`, 'error'); return; }
  const d = {
    id: uid('DRV'),
    name,
    initials: initials(name),
    phone,
    licence: lic,
    licenceExp: document.getElementById('nd_licexp').value||new Date(Date.now()+365*86400000).toISOString(),
    status:'available',
    truckId:null,
    tripsToday:0,
    load:null,
    location:'Gargo Yard',
    idNo: document.getElementById('nd_idno').value.trim()||'',
    rating: Math.min(5, Math.max(0, parseFloat(document.getElementById('nd_rating').value)||4.0)),
  };
  state.db.drivers.push(d);
  scheduleSave();
  addAudit(state.profile.username, 'Driver Added', `${name}`);
  closeModal();
  renderDrivers('all');
  toast(`${name} added`, 'success');
}

const DRIVER_TRIP_STEPS = ['loaded','on_trip','offloaded','breakdown','completed'];

async function driverAdvanceTrip(tripId, status) {
  const driver = myDriverRecord();
  const t = state.db.trips.find(tr=>tr.id===tripId);
  if (!driver || !t || t.driverId !== driver.id) { toast('Not authorized for this trip', 'error'); return; }
  if (!DRIVER_TRIP_STEPS.includes(status)) { toast('Invalid status', 'error'); return; }
  toast('Saving…', 'info', 1200);
  const res = await applyTripStatus(t, status, state.profile.username);
  if (!res.ok) {
    if (res.reason === 'transition') {
      toast(`Cannot change status from "${res.from.replace('_',' ')}" to "${status.replace('_',' ')}" — trips can only move forward`, 'error');
    } else if (res.reason === 'save') {
      toast(res.message ? `Could not save this update — ${res.message}` : 'Could not save this update — check your connection and try again', 'error', 5000);
    } else {
      toast('Not authorized for this trip', 'error');
    }
    renderDriverPortal();
    return;
  }
  toast(status==='breakdown' ? 'Breakdown reported — dispatch notified' : `Trip updated to ${status.replace('_',' ')}`, status==='breakdown'?'error':'success');
  renderDriverPortal();
}

function driverShouldTrack(driver) {
  if (!driver || !driver.truckId || driver.status === 'off_duty' || driver.status === 'suspended') return false;

  const truck = state.db?.trucks?.find(t => t.id === driver.truckId);
  if (truck?.wialonUnitId) return false;
  return true;
}

function driverReportBreakdown(truckId) {
  openModal('Report Breakdown', `
    <div class="ops-notice" style="margin-bottom:12px">This will immediately flag your truck as broken down and alert dispatch/admin as a priority.</div>
    <div class="fg"><label>What's wrong?</label><textarea id="bd_desc" rows="3" placeholder="Describe the breakdown…"></textarea></div>
    <div class="fg"><label>Location</label><input id="bd_loc" placeholder="e.g. B8 Highway, near Miritini"/></div>
    <button class="submit-btn" onclick="submitDriverBreakdown('${truckId}')">🚨 Submit Breakdown Report →</button>
  `);
}