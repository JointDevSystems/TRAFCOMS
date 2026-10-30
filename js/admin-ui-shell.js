'use strict';


const ROLE_SIDEBAR = {
  admin:    ['dashboard','trucks','drivers','trips','dispatch','inward','publicbookings','depops','maintenance','fuel','shutout','interchange','prestaking','depotreport','shippinglines','requisitions','finance','hr','workshop'],
  clerk:    ['trucks','drivers','trips','dispatch','inward','publicbookings','depops','shutout','interchange','prestaking','depotreport'],
  dispatch: ['trucks','drivers','trips','dispatch','inward','publicbookings','depops','shutout','interchange','prestaking','depotreport','fuel'],
  ops:      ['trucks','drivers','trips','dispatch','inward','publicbookings','depops','maintenance','fuel','shutout','interchange','prestaking','depotreport','shippinglines','requisitions','workshop'],
  finance:  ['finance','trips','shippinglines'],
  hr:       ['hr','drivers'],
  viewer:   ['trucks','drivers','trips'],
};

function buildBadges() {
  const db=state.db;
  const set=(id,val)=>{ const el=document.getElementById(id); if(el){ el.textContent=val||''; el.style.display=val?'inline':'none'; } };
  set('badge-trucks',       db.trucks.filter(t=>t.status==='breakdown').length);
  set('badge-drivers',      db.drivers.filter(d=>d.status==='on_trip').length);
  set('badge-trips',        db.trips.filter(t=>t.status==='active').length);
  set('badge-dispatch',     awaitingDispatchTrips().length);
  set('badge-inward',       db.interchange.filter(i => (i.type==='Gate-In'||i.type==='Depot-In') && new Date(i.date).toDateString()===new Date().toDateString()).length);
  set('badge-allocation',   awaitingDispatchTrips().length);
  set('badge-maintenance',  db.maintenance.filter(m=>m.status==='open').length);
  set('badge-shutout',      db.shutouts.filter(s=>s.status==='open').length);
  set('badge-interchange',  db.interchange.filter(i=>i.status==='pending' && !icAwaitingSurvey(i)).length);
  set('badge-prestaking',   (db.vesselPrestaking||[]).filter(p=>p.status==='staged').length);
  set('badge-requisitions', db.requisitions.filter(r=>r.status==='pending').length);
  set('badge-workshop',     (db.containerRepairs||[]).filter(c=>c.status==='awaiting_approval').length);
  set('badge-invoices',     db.invoices.filter(i=>i.status==='overdue').length);
  set('badge-depotreport',  computeDepotReportDuplicates().length);
  if (typeof refreshBookingBadge === 'function') refreshBookingBadge();
}

function buildAlerts() {
  const db=state.db;
  const alerts=[];
  const C=(k,d)=>{ const v=window.cfgGet?window.cfgGet(k):undefined; return v===undefined||v===null||v===''?d:v; };   // optional System Settings

  db.maintenance.filter(m=>m.status==='open' && m.priority==='critical' && m.reportedByDriver).forEach(m=>{
    alerts.push({ type:'driver_breakdown', msg: `🚨 DRIVER BREAKDOWN REPORT — ${truckName(m.truckId)}: ${m.desc.slice(0,60)}…` });
  });
  db.maintenance.filter(m=>m.status==='open' && m.priority==='critical' && !m.reportedByDriver).forEach(m=>{
    alerts.push({ type:'crit', msg: `Critical breakdown — ${truckName(m.truckId)}: ${m.desc.slice(0,60)}…` });
  });
  db.trucks.filter(t=>t.fuelPct != null && t.fuelPct < C('alerts.lowFuelPct',20)).forEach(t=>{
    alerts.push({ type:'warn', msg: `Low fuel — ${t.reg}: ${truckFuelLabel(t)} remaining` });
  });
  db.trips.filter(t=>t.status==='delayed').forEach(t=>{
    alerts.push({ type:'warn', msg: `Trip delayed — ${truckName(t.truckId)} → ${t.dest}` });
  });
  db.drivers.filter(d=>{ const daysLeft=(new Date(d.licenceExp)-Date.now())/(86400000); return daysLeft < C('alerts.licenceDays',90) && daysLeft >0; }).forEach(d=>{
    const days=Math.round((new Date(d.licenceExp)-Date.now())/86400000);
    alerts.push({ type:'warn', msg: `Licence expiry — ${d.name}: ${days} days remaining` });
  });

  try {   // depot + system alerts (thresholds come from System Settings → Alerts)
    const idx = icOutIndex(), agedDays = Number(C('ops.agedDays',30)), inYard = (db.interchange||[]).filter(i=>icInYard(i,idx));
    if (C('alerts.agedContainers',true)!==false) { const n = inYard.filter(i=>(Date.now()-new Date(i.date))/864e5 > agedDays).length; if (n) alerts.push({ type:'warn', msg:`${n} container${n===1?'':'s'} in the yard longer than ${agedDays} days` }); }
    if (C('alerts.awaitingSurvey',true)!==false) { const hrs = Number(C('alerts.awaitingSurveyHours',24)); const n = inYard.filter(i=>i.surveyStatus==='awaiting_survey' && (Date.now()-new Date(i.date))/36e5 > hrs).length; if (n) alerts.push({ type:'warn', msg:`${n} gated-in container${n===1?'':'s'} waiting for survey for over ${hrs} h` }); }
    const bd = Number(C('alerts.backupDays',7));
    if (isAdmin() && bd > 0) { const last = db.settings && db.settings.backupDate, age = last ? (Date.now()-new Date(last))/864e5 : Infinity; if (age > bd) alerts.push({ type:'warn', msg: last ? `Backup overdue: the last one was ${Math.floor(age)} days ago` : 'No backup has been made yet' }); }
  } catch(e) { console.warn('depot alerts', e); }

  const priorityOrder = { driver_breakdown:0, crit:1, warn:2 };
  alerts.sort((a,b)=>(priorityOrder[a.type]??9)-(priorityOrder[b.type]??9));

  const list=document.getElementById('alertsList');
  if(list){
    list.innerHTML=alerts.length
      ? alerts.map(a=>`<div class="alert-item ${a.type==='driver_breakdown'?'crit':a.type}">${a.type==='driver_breakdown'?'<div class="alert-dot-sm" style="background:var(--red)"></div>':`<div class="alert-dot-sm" style="background:${a.type==='crit'?'var(--red)':'var(--amber)'}"></div>`}<span>${a.msg}</span></div>`).join('')
      : '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:12px">No active alerts</div>';
  }
  const dot=document.getElementById('alertDot');
  if(dot) dot.style.display=alerts.length?'block':'none';
}

function toggleAlerts() {
  const panel=document.getElementById('alertsPanel');
  if(!panel) return;
  state.alertsOpen=!state.alertsOpen;
  panel.classList.toggle('open', state.alertsOpen);
}

const SECTION_META = {
  dashboard:['Operations','Dashboard'], trucks:['Fleet Management','Trucks'], drivers:['Fleet Management','Drivers'],
  trips:['Fleet Management','Active Trips'], dispatch:['Operations','Dispatch Console'],
  inward: ['Operations', 'Inward Container Entry'],
  publicbookings: ['Operations', 'Public Bookings'],
  depops: ['Operations', 'DepOps'],
  maintenance:['Operations','Maintenance Log'], fuel:['Operations','Fuel Log'],
  shutout:['Container Ops','Shutout'], interchange:['Container Ops','Interchange'],
  prestaking:['Container Ops','Vessel Prestaking'],
  depotreport:['Container Ops','Depot Report'],
  shippinglines:['Container Ops','Shipping Lines'], requisitions:['Compliance','Requisitions'],
  workshop:['Compliance','Workshop'], invoicing:['Finance','Invoicing'],
  allocation:['Intelligence','Allocation'], workanalysis:['Intelligence','Work Analysis'],
  reports:['Intelligence','Reports'], tripreports:['Intelligence','Trip Reports & Audit Centre'],
  livetracking:['Platform','Live Tracking'],
  usermgmt:['Platform','User Management'], settings:['Platform','Settings'],
  finance:['Finance','Finance Hub'], hr:['Human Resources','HR Hub'],
  
};

function showSection(sec, btn) {
  if (!canSeeSection(sec)) { toast('You don\'t have access to this section', 'error'); return; }
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item, .admin-nav-item, .mobile-nav-item').forEach(n=>n.classList.remove('active'));
  const el=document.getElementById(`sec-${sec}`);
  if(el) el.classList.add('active');
  if(btn) btn.classList.add('active');
  document.querySelectorAll(`.nav-item[data-section="${sec}"], .mobile-nav-item[data-mobile-section="${sec}"]`).forEach(n=>n.classList.add('active'));
  state.currentSection=sec;
  const [area,title]=SECTION_META[sec]||['Operations',sec];
  const tb=document.getElementById('topbarArea');
  const tt=document.getElementById('topbarTitle');
  if(tb) tb.textContent=area;
  if(tt) tt.textContent=title;
  renderSection(sec);
  closeUserMenu();
  if(window.innerWidth<900) document.body.classList.remove('sidebar-open');
}

function showAdminSection(sec, btn) {
  if (!canSeeAdminSection(sec)) { toast('You don\'t have access to this section', 'error'); return; }
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item, .admin-nav-item, .mobile-nav-item').forEach(n=>n.classList.remove('active'));
  const el=document.getElementById(`sec-${sec}`);
  if(el) el.classList.add('active');
  if(btn) btn.classList.add('active');
  state.currentAdminSection=sec;
  const [area,title]=SECTION_META[sec]||['Admin',sec];
  const tb=document.getElementById('topbarArea');
  const tt=document.getElementById('topbarTitle');
  if(tb) tb.textContent=area;
  if(tt) tt.textContent=title;
  renderSection(sec);
  if(window.innerWidth<900) document.body.classList.remove('sidebar-open');
}

function renderSection(sec) {
  const fn=sectionRenderers[sec];
  if(fn) fn();
}

const sectionRenderers = {
  dashboard:renderDashboard, trucks:()=>renderTrucks('all'), drivers:()=>renderDrivers('all'),
  trips:()=>renderTrips('active'), dispatch:renderDispatch, maintenance:()=>renderMaint('all'),
  inward: renderInward,
  fuel:renderFuel, shutout:()=>renderShutout('all'), interchange:()=>renderInterchange('all'),
  prestaking:()=>renderPrestaking('staged'),
  depotreport: renderDepotReport,
  shippinglines:()=>renderLines('all'), requisitions:()=>renderRequisitions('all'),
  workshop:renderWorkshopSection, invoicing:()=>renderInvoicing('all'),
  allocation:()=>renderAllocation('auto'), workanalysis:()=>renderWorkAnalysis('all'),
  reports:()=>renderReport('overview'), tripreports:trcInit, livetracking:initTrackingSection,
  usermgmt:renderUserMgmt, settings:renderSettings,
  publicbookings: renderPublicBookings,
  depops: renderDepOps,
  finance: ()=>renderFinance('overview'), hr: ()=>renderHR('overview'),
};

function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }

function mobileNav(sec, btn) {
  showSection(sec, btn);
  document.body.classList.remove('sidebar-open');
}

function renderDashboard() {
  const db=state.db;
  const trucks=db.trucks, trips=db.trips, maint=db.maintenance;
  const avail=trucks.filter(t=>t.status==='available').length;
  const onTrip=trucks.filter(t=>t.status==='on_trip').length;
  const brkdown=trucks.filter(t=>t.status==='breakdown').length;
  const activeT=trips.filter(t=>t.status==='active').length;
  
  const kpiRow=document.getElementById('kpiRow');
  if(kpiRow){
    kpiRow.innerHTML=`${kpiCard('Fleet Size',trucks.length,'','kpi-gold')} ${kpiCard('Available',avail,'Ready to deploy','kpi-green')} ${kpiCard('On Trip',onTrip,'Currently active','kpi-gold')} ${kpiCard('Breakdown',brkdown,'Requires attention','kpi-red')} ${kpiCard('Active Trips',activeT,'In progress','kpi-blue')} ${kpiCard('Drivers',db.drivers.filter(d=>d.status==='on_trip').length,'On duty','kpi-orange')}`;
  }
  
  const statusGroups=[ ['available','Available','var(--green)'], ['on_trip','On Trip','var(--gold)'], ['maintenance','Maintenance','var(--amber)'], ['breakdown','Breakdown','var(--red)'], ['off_duty','Off Duty','var(--text-3)'] ];
  const fBars=document.getElementById('fleetStatusBars');
  if(fBars){
    fBars.innerHTML=statusGroups.map(([st,lbl,col])=>{
      const cnt=trucks.filter(t=>t.status===st).length;
      const pct=trucks.length?Math.round(cnt/trucks.length*100):0;
      return `<div class="fleet-status-bar" style="padding:10px 14px"><div class="fsb-row"><span class="fsb-label">${lbl}</span><span class="fsb-count">${cnt} / ${trucks.length}</span></div><div class="fsb-track"><div class="fsb-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
    }).join('');
  }
  
  const fm=document.getElementById('fleetStatusMeta');
  if(fm) fm.textContent= `${trucks.length} total`;
  
  const liveT=trips.filter(t=>t.status==='active');
  const ltc=document.getElementById('liveTripsCount');
  if(ltc) ltc.textContent= `${liveT.length} active`;
  
  const lt=document.getElementById('liveTrips');
  if(lt){
    lt.innerHTML=liveT.length
      ? liveT.map(t=>`<div class="live-trip-row" onclick="showTripDetail('${t.id}')"><div class="ltr-dot" style="background:${t.status==='delayed'?'var(--amber)':'var(--green)'}"></div><div class="ltr-info"><div class="ltr-route">${t.origin} → ${t.dest}</div><div class="ltr-meta">${truckName(t.truckId)} · ${t.container} · ETA ${fmtTime(t.eta)}</div></div>${sbadge(t.status)}</div>`).join('')
      : '<div class="empty-state"><div class="empty-state-label">No active trips</div></div>';
  }
  
  renderActivityFeed('all');
  
  const open=maint.filter(m=>m.status!=='resolved').sort((a,b)=>(['critical','high','medium','low'].indexOf(a.priority))-(['critical','high','medium','low'].indexOf(b.priority)));
  const ma=document.getElementById('maintAlerts');
  if(ma){
    ma.innerHTML=open.length
      ? open.map(m=>`<div class="maint-alert-row" onclick="showSection('maintenance',null)"><div style="width:8px;height:8px;border-radius:50%;background:${m.priority==='critical'?'var(--red)':m.priority==='high'?'var(--amber)':'var(--gold)'}"></div><div style="flex:1"><div style="font-size:11.5px;font-weight:600;color:var(--text)">${truckName(m.truckId)}</div><div style="font-size:10.5px;color:var(--text-3)">${m.desc.slice(0,55)}…</div></div>${sbadge(m.status)}</div>`).join('')
      : '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-label">No open issues</div></div>';
  }
}

function kpiCard(label,val,sub='',cls='kpi-gold') {
  return `<div class="kpi-card ${cls}"><div class="kpi-value">${val}</div><div class="kpi-label">${label}</div>${sub?`<div class="kpi-sub">${sub}</div>`:''}</div>`;
}

let _activityFilter='all';

function filterActivity(f,btn){ _activityFilter=f; document.querySelectorAll('#sec-dashboard .pill').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderActivityFeed(f); }

function renderActivityFeed(f){
  const db=state.db;
  const all=[];
  db.trips.forEach(t=>{ all.push({ type:'dispatch', icon:'🚛', msg: `Dispatched ${t.container} — ${t.origin} → ${t.dest}`, time:t.startTime }); if(t.status==='completed') all.push({ type:'return', icon:'✅', msg: `Completed — ${truckName(t.truckId)} returned`, time:t.eta }); });
  db.maintenance.forEach(m=>{ if(m.status==='open') all.push({ type:'issue', icon:'️', msg: `Issue logged — ${truckName(m.truckId)}: ${m.type}`, time:m.date }); });
  const filtered=f==='all'?all:all.filter(a=>a.type===f);
  filtered.sort((a,b)=>new Date(b.time)-new Date(a.time));
  const al=document.getElementById('activityList');
  if(al){
    al.innerHTML=filtered.slice(0,12).map(a=>`<div class="activity-row"><div class="act-icon">${a.icon}</div><div style="flex:1;font-size:11.5px;color:var(--text-2)">${a.msg}</div><div class="act-time">${timeAgo(a.time)}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No activity</div></div>';
  }
}

function showAddTruckModal() {
  openModal('Add New Truck', `<div class="form-row-2"><div class="fg"><label>Registration</label><input id="nt_reg" placeholder="KDA 000A"/></div><div class="fg"><label>Make / Model</label><input id="nt_make" placeholder="ISUZU FVZ"/></div></div><div class="form-row-2"><div class="fg"><label>Type</label><select id="nt_type"><option>Prime Mover</option><option>Flatbed</option><option>Tipper</option><option>Tanker</option><option>Lowbed</option></select></div><div class="fg"><label>Year</label><input id="nt_year" type="number" placeholder="${new Date().getFullYear()}"/></div></div><div class="form-row-2"><div class="fg"><label>Colour</label><input id="nt_colour" placeholder="White"/></div><div class="fg"><label>Fuel Level</label><input placeholder="Taken from fuel logs" disabled/></div></div><div class="form-row-2"><div class="fg"><label>Tank Capacity (L)</label><input id="nt_cap" type="number" step="1" min="0" placeholder="Optional"/></div><div class="fg"><label>Fuel Economy (km/L) <span class="label-optional">(optional)</span></label><input id="nt_kmpl" type="number" step="0.1" min="0" placeholder="e.g. 3"/></div></div><div class="fg"><label>Odometer (km)</label><input id="nt_odo" type="number" placeholder="0"/></div><div class="fg"><label>Wialon Unit ID (optional)</label><input id="nt_wialon" placeholder="Leave blank if tracked via driver phone"/></div><div class="fg"><label>Notes</label><textarea id="nt_notes" rows="2" placeholder="Any notes…"></textarea></div><button class="submit-btn" onclick="saveTruck()">Add Truck →</button>`);
}

function showAddDriverModal() {
  openModal('Add New Driver', `<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="nd_name" placeholder="John Doe"/></div><div class="fg"><label>Phone</label><input id="nd_phone" placeholder="+254 7XX XXX XXX"/></div></div><div class="form-row-2"><div class="fg"><label>Licence No.</label><input id="nd_lic" placeholder="DL-A0000"/></div><div class="fg"><label>Licence Expiry</label><input id="nd_licexp" type="date"/></div></div><div class="form-row-2"><div class="fg"><label>ID Number</label><input id="nd_idno" placeholder="ID number"/></div><div class="fg"><label>Rating</label><input id="nd_rating" type="number" placeholder="4.0" min="0" max="5" step="0.1"/></div></div><button class="submit-btn" onclick="saveDriver()">Add Driver →</button>`);
}

// Shipping-line Add / Edit modals live in interchange-shutouts.js (showAddLineModal, showEditLineModal,
// applyOfficialLineDefaults) next to the rate-card code that reads their fields. They used to be duplicated
// here with an old 3-rate form; because this file loads later it silently overrode the real ones.

function openUnmappedVesselsModal() {
  const groups = _unmappedVesselGroups();
  const noVesselCount = (state.db.interchange || []).filter(ic => !ic.line && UNRESOLVABLE_VESSEL_VALUES.has(normVessel(ic.vessel))).length;
  const lineOptions = state.db.shippingLines.filter(l => l.active).map(l => `<option value="${l.id}">${esc(l.code)} — ${esc(l.name)}</option>`).join('');

  if (!groups.length) {
    openModal('Resolve Unmapped Vessels', `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-label">No vessel names left to resolve</div></div>${noVesselCount ? `<div class="ops-notice" style="margin-top:10px">${noVesselCount} record(s) have no line and no vessel recorded either — those need a data fix at the source, not a mapping.</div>` : ''}`);
    return;
  }

  const rows = groups.slice(0, 80).map((g, i) => `
    <tr id="uvm_row_${i}">
      <td class="mono" style="max-width:220px">${esc(g.vessel)}</td>
      <td class="mono" style="text-align:right">${g.count}</td>
      <td><select id="uvm_sel_${i}" style="min-width:220px"><option value="">— choose line —</option>${lineOptions}</select></td>
      <td><button class="tbl-btn" onclick="assignVesselToLine(${i})">Assign →</button></td>
    </tr>`).join('');

  openModal('Resolve Unmapped Vessels', `
    <div style="font-size:12px;color:var(--text-3);margin-bottom:10px">
      ${groups.reduce((s, g) => s + g.count, 0)} interchange records across ${groups.length} distinct vessel name${groups.length === 1 ? '' : 's'} have no shipping line. Assigning a vessel here updates every matching record immediately and remembers the mapping for future imports.
      ${groups.length > 80 ? `<br>Showing the top 80 by record count.` : ''}
    </div>
    <div class="table-wrap" style="max-height:420px;overflow-y:auto">
      <table class="data-table"><thead><tr><th>Vessel</th><th style="text-align:right">Records</th><th>Assign to line</th><th></th></tr></thead>
      <tbody id="uvmTableBody">${rows}</tbody></table>
    </div>
    <div id="uvmGroupsData" style="display:none">${esc(JSON.stringify(groups.slice(0, 80)))}</div>
  `);
  window._uvmGroups = groups.slice(0, 80);
}


const AUTO_REFRESH_STORAGE_KEY = 'gargo_auto_refresh';

const AUTO_REFRESH_DEFAULT_SECS = 60;

let _autoRefreshTimer = null;

function autoRefreshConfig() {
  try {
    const raw = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
    if (!raw) return { enabled: false, intervalSecs: AUTO_REFRESH_DEFAULT_SECS };
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      intervalSecs: Number(parsed.intervalSecs) > 0 ? Number(parsed.intervalSecs) : AUTO_REFRESH_DEFAULT_SECS,
    };
  } catch { return { enabled: false, intervalSecs: AUTO_REFRESH_DEFAULT_SECS }; }
}

function saveAutoRefreshConfig(cfg) {
  try { localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, JSON.stringify(cfg)); } catch {}
}

function startAutoRefresh(intervalSecs) {
  stopAutoRefresh();
  const secs = Number(intervalSecs) > 0 ? Number(intervalSecs) : AUTO_REFRESH_DEFAULT_SECS;
  _autoRefreshTimer = setInterval(() => { refreshFromServer(); }, secs * 1000);
}

function stopAutoRefresh() {
  if (_autoRefreshTimer) { clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }
}

// Called once at boot to resume the user's saved preference.
function initAutoRefresh() {
  const cfg = autoRefreshConfig();
  if (cfg.enabled) startAutoRefresh(cfg.intervalSecs);
}

// Wired to the Settings → Auto-Refresh Mode toggle.
function saveAutoRefreshSettings() {
  const enabled = !!document.getElementById('st_autoRefreshEnabled')?.checked;
  const intervalSecs = Number(document.getElementById('st_autoRefreshInterval')?.value) || AUTO_REFRESH_DEFAULT_SECS;
  const cfg = { enabled, intervalSecs };
  saveAutoRefreshConfig(cfg);
  if (enabled) { startAutoRefresh(intervalSecs); toast(`Auto-refresh enabled — refreshing every ${intervalSecs}s`, 'success', 2200); }
  else { stopAutoRefresh(); toast('Auto-refresh disabled', 'info', 1800); }
  renderAutoRefreshSettingsForm();
}

function renderAutoRefreshSettingsForm() {
  const el = document.getElementById('autoRefreshConfigForm');
  if (!el) return;
  const cfg = autoRefreshConfig();
  const options = [15, 30, 60, 120, 300].map(s =>
    `<option value="${s}" ${cfg.intervalSecs === s ? 'selected' : ''}>${s < 60 ? s + 's' : (s / 60) + ' min'}</option>`
  ).join('');
  el.innerHTML = `
    <label style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-2);cursor:pointer">
      <input type="checkbox" id="st_autoRefreshEnabled" ${cfg.enabled ? 'checked' : ''} style="accent-color:var(--gold)"/> Enable auto-refresh mode
    </label>
    <div class="fg" style="margin:0"><label>Refresh Interval</label>
      <select id="st_autoRefreshInterval">${options}</select>
    </div>
    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">
      Re-fetches all app data from the server on this schedule, on top of the instant realtime sync — a safety net for unreliable connections or unattended screens. This device only.
    </div>
    <button class="submit-btn" style="margin-top:4px" onclick="saveAutoRefreshSettings()">Save →</button>
  `;
}

/* ──────────────────────────────────────────────────────────────────
   § 26  USER MANAGEMENT
────────────────────────────────────────────────────────────────── */
function renderUserMgmt() {
  if (!isAdmin()) {
    const kpis = document.getElementById('userKpis');
    if (kpis) kpis.innerHTML = `<div class="vault-locked-banner" style="grid-column:1/-1"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><div><div class="title">Admin Access Required</div><div class="desc">User management is restricted to System Administrators.</div></div></div>`;
    const ul = document.getElementById('userList');
    if (ul) ul.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div>Admin access required.</div>`;
    return;
  }
  const users  = state.db.profiles;
  const kpis   = document.getElementById('userKpis');
  if (kpis) {
    kpis.innerHTML = `${kpiCard('Total Users', users.length, '', 'kpi-gold')} ${kpiCard('Active', users.filter(u=>u.active).length, '', 'kpi-green')} ${kpiCard('Admins', users.filter(u=>u.role==='admin').length, '', 'kpi-blue')}`;
  }
  const ul = document.getElementById('userList');
  if (ul) {
    ul.innerHTML = users.map(u=>`<div class="user-row" onclick="showUserDetail('${u.id}')"><div class="user-av-lg">${initials(u.name)}</div><div class="user-row-info"><div class="user-row-name">${u.name}${!u.active?'<span style="font-size:9px;color:var(--text-3)">(inactive)</span>':''}</div><div class="user-row-meta">${u.username} · ${u.email}</div></div><span class="sbadge s-${u.role==='admin'?'pending':u.role==='finance'?'completed':'active'}" style="font-size:9px">${roleLabel(u.role)}</span><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3)">Last: ${timeAgo(u.lastLogin)}</div></div>`).join('');
  }
  const roles=[
    {name:'System Administrator',perms:'Full access — all modules including Settings, Finance & Invoicing'},
    {name:'Operations Officer',  perms:'Dashboard, Fleet, Dispatch, Maintenance, Fuel, Shutout, Interchange'},
    {name:'Finance Manager',     perms:'Revenue Reports (admin only), Billing Rates (admin only)'},
    {name:'Dispatch Controller', perms:'Dispatch Console, Active Trips, Driver/Truck visibility'},
    {name:'Read-Only Viewer',    perms:'Dashboard and reports only — no edit access'},
  ];
  const rl = document.getElementById('roleList');
  if (rl) {
    rl.innerHTML = roles.map(r=>`<div class="role-card"><div class="role-name">${r.name}</div><div class="role-perms">${r.perms}</div></div>`).join('');
  }
  const audit = document.getElementById('auditLog');
  if (audit) {
    audit.innerHTML = [...state.db.auditLog].sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,20).map(a=>`<div class="audit-row"><div class="audit-time">${fmtTime(a.time)} · ${fmtDate(a.time)}</div><div class="user-av-rail" style="width:22px;height:22px;font-size:8px">${initials(a.user)}</div><div style="flex:1;font-size:11.5px"><span style="font-weight:600;color:var(--text)">${a.action}</span><span style="color:var(--text-3);margin-left:6px">${a.detail}</span></div></div>`).join('');
  }
}

function showUserDetail(id) {
  const u = state.db.profiles.find(u=>u.id===id);
  if (!u) return;
  openModal(`User — ${u.name}`, `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div class="user-av-lg" style="width:48px;height:48px;font-size:16px">${initials(u.name)}</div><div><div style="font-size:15px;font-weight:700;color:var(--text)">${u.name}</div><div class="mono" style="font-size:9px;color:var(--text-3)">${u.id}</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Username</label><div class="mono">${u.username}</div></div><div class="fg" style="margin:0"><label>Role</label><div>${roleLabel(u.role)}</div></div><div class="fg" style="margin:0"><label>Email</label><div style="font-size:12px">${u.email}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(u.active?'active':'off_duty')}</div></div><div class="fg" style="margin:0"><label>Created</label><div class="mono" style="font-size:10px">${fmtDate(u.created)}</div></div><div class="fg" style="margin:0"><label>Last Login</label><div class="mono" style="font-size:10px">${timeAgo(u.lastLogin)}</div></div></div>${isAdmin() ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="modal-btn" onclick="showEditAccessModal('${u.id}')">Edit Access</button>
      <button class="modal-btn" onclick="showSetPasswordModal('${u.id}')">Set New Password</button>
      ${u.id!==state.profile?.id?`<button class="modal-btn ${u.active?'danger':'success'}" onclick="toggleUserActive('${u.id}')">${u.active?'Deactivate':'Activate'} User</button>`:''}
    </div>` : (u.id===state.profile?.id ? '<div style="font-size:11px;color:var(--text-3)">This is your account</div>' : '')}`);
}

async function toggleUserActive(id) {
  const u=state.db.profiles.find(u=>u.id===id);
  if(!u) return;
  u.active=!u.active;
  const { error } = await supabase.from('profiles').update({ active: u.active }).eq('id', id);
  if (error) { console.error('profiles update failed:', error.message); toast('Could not update user', 'warning'); }
  addAudit(state.profile.username,'User Status', `${u.name} → ${u.active?'active':'deactivated'}`);
  closeModal(); renderUserMgmt();
  toast(`${u.name} ${u.active?'activated':'deactivated'}`, 'success');
}

/* ── Section-access checkbox grid, shared by Create User + Edit Access ── */
const ALL_SIDEBAR_SECTIONS = ['dashboard','trucks','drivers','trips','dispatch','inward','publicbookings','depops','maintenance','fuel','shutout','interchange','depotreport','shippinglines','requisitions','workshop'];

const ALL_ADMINRAIL_SECTIONS = ['invoicing','allocation','workanalysis','reports','tripreports','livetracking','usermgmt','settings'];

function groupedSectionCheckboxes(idPrefix, sections, selected) {
  const groups = {};
  sections.forEach(sec => {
    const [group, label] = SECTION_META[sec] || ['Other', sec];
    (groups[group] = groups[group] || []).push([sec, label]);
  });
  return Object.entries(groups).map(([group, items]) => `
    <div style="margin-bottom:8px">
      <div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:5px">${group}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${items.map(([sec,label]) => `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text);background:var(--surface);border:1px solid var(--border);padding:5px 9px;border-radius:5px;cursor:pointer">
          <input type="checkbox" id="${idPrefix}_${sec}" data-sec="${sec}" ${selected.includes(sec)?'checked':''}/> ${label}
        </label>`).join('')}
      </div>
    </div>`).join('');
}

function sectionAccessFieldsHTML(idPrefix, role) {
  const nav = ROLE_SIDEBAR[role] || [];
  const admin = ROLE_ADMINRAIL[role] || [];
  return `
    <div class="fg">
      <label>Nav Bar Access — sections this user can see</label>
      ${groupedSectionCheckboxes(idPrefix+'_nav', ALL_SIDEBAR_SECTIONS, nav)}
    </div>
    <div class="fg">
      <label>Admin Rail Access — sections this user can see</label>
      ${groupedSectionCheckboxes(idPrefix+'_admin', ALL_ADMINRAIL_SECTIONS, admin)}
    </div>`;
}

function refreshAccessCheckboxesForRole(idPrefix, role) {
  const nav = ROLE_SIDEBAR[role] || [];
  const admin = ROLE_ADMINRAIL[role] || [];
  ALL_SIDEBAR_SECTIONS.forEach(sec => {
    const el = document.getElementById(`${idPrefix}_nav_${sec}`);
    if (el) el.checked = nav.includes(sec);
  });
  ALL_ADMINRAIL_SECTIONS.forEach(sec => {
    const el = document.getElementById(`${idPrefix}_admin_${sec}`);
    if (el) el.checked = admin.includes(sec);
  });
}

function readAccessCheckboxes(idPrefix) {
  const navSections = ALL_SIDEBAR_SECTIONS.filter(sec => document.getElementById(`${idPrefix}_nav_${sec}`)?.checked);
  const adminSections = ALL_ADMINRAIL_SECTIONS.filter(sec => document.getElementById(`${idPrefix}_admin_${sec}`)?.checked);
  return { navSections, adminSections };
}

function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  arr.forEach(n => out += chars[n % chars.length]);
  return out;
}

function fillGeneratedPassword(fieldId) {
  const pw = genPassword();
  const field = document.getElementById(fieldId);
  if (field) { field.value = pw; field.type = 'text'; }
}

function showCreateUserModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  openModal('Create User', `<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="cu_name" placeholder="Jane Doe"/></div><div class="fg"><label>Username</label><input id="cu_user" placeholder="jane.doe"/></div></div><div class="fg"><label>Email</label><input id="cu_email" type="email" placeholder="jane@gargo.co.ke"/></div><div class="form-row-2"><div class="fg"><label>Role</label><select id="cu_role" onchange="refreshAccessCheckboxesForRole('cu', this.value)"><option value="ops">Operations Officer</option><option value="dispatch">Dispatch Controller</option><option value="clerk">Clerk</option><option value="finance">Finance Manager</option><option value="viewer">Read-Only Viewer</option><option value="driver">Driver</option><option value="admin">System Administrator</option></select></div><div class="fg"><label>Password</label><div style="display:flex;gap:6px"><input id="cu_password" type="text" placeholder="Set a password" style="flex:1"/><button type="button" class="modal-btn" onclick="fillGeneratedPassword('cu_password')">Generate</button></div></div></div><div style="font-size:11px;color:var(--text-3);padding:10px;background:var(--surface);border-radius:5px;margin-bottom:12px">This creates the login directly with the password above — no invitation email, the user can sign in immediately. Role sets the defaults below; untick/tick boxes to fine-tune exactly what this user can access.</div>${sectionAccessFieldsHTML('cu','ops')}<button class="submit-btn" onclick="saveUser()" style="margin-top:10px">Create User →</button>`);
}

async function saveUser() {
  const name=document.getElementById('cu_name').value.trim();
  const user=document.getElementById('cu_user').value.trim().toLowerCase();
  const email=document.getElementById('cu_email').value.trim();
  const password=document.getElementById('cu_password').value;
  const role=document.getElementById('cu_role').value;
  if(!name||!user||!email||!password) { toast('Name, username, email and password required','error'); return; }
  if(!validateEmail(email)) { toast('Invalid email format','error'); return; }
  if(password.length < 8) { toast('Password must be at least 8 characters','error'); return; }
  if(state.db.profiles.some(u=>u.username===user)) { toast('Username taken','error'); return; }

  const { navSections, adminSections } = readAccessCheckboxes('cu');

  const btn = document.querySelector('.submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ name, username: user, email, password, role, navSections, adminSections }),
    });
    const result = await res.json();
    if (!res.ok) { toast(result.error || 'Could not create user', 'error'); return; }

    const p = result.profile;
    state.db.profiles.push({
      id: p.id, name: p.name, username: p.username, email: p.email,
      role: p.role, active: p.active,
      created: p.created_at, lastLogin: null,
      navSections: p.nav_sections || null, adminSections: p.admin_sections || null,
    });
    addAudit(state.profile.username,'User Created', `${name} (${user})`);
    closeModal(); renderUserMgmt();
    toast(`${name} created — they can sign in with the password you set.`, 'success');
  } catch (e) {
    console.error(e);
    toast('Network error creating user', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create User →'; }
  }
}

function showEditAccessModal(id) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const u = state.db.profiles.find(u=>u.id===id);
  if (!u) return;
  const nav = Array.isArray(u.navSections) ? u.navSections : (ROLE_SIDEBAR[u.role] || []);
  const admin = Array.isArray(u.adminSections) ? u.adminSections : (ROLE_ADMINRAIL[u.role] || []);
  openModal(`Edit Access — ${u.name}`, `
    <div class="fg"><label>Role</label><select id="ea_role" onchange="refreshAccessCheckboxesForRole('ea', this.value)">
      ${['ops','dispatch','clerk','finance','viewer','driver','admin'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${roleLabel(r)}</option>`).join('')}
    </select></div>
    <div style="font-size:11px;color:var(--text-3);padding:10px;background:var(--surface);border-radius:5px;margin-bottom:12px">Tick exactly which nav bar and admin sections ${u.name} can access. Changing role does not reset your ticks unless you use the checkboxes yourself.</div>
    ${(function(){ // build with this user's actual current selection, not the plain role default
        const navHtml = groupedSectionCheckboxes('ea_nav', ALL_SIDEBAR_SECTIONS, nav);
        const adminHtml = groupedSectionCheckboxes('ea_admin', ALL_ADMINRAIL_SECTIONS, admin);
        return `<div class="fg"><label>Nav Bar Access</label>${navHtml}</div><div class="fg"><label>Admin Rail Access</label>${adminHtml}</div>`;
      })()}
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="submit-btn" onclick="saveUserAccess('${id}')">Save Access</button>
      <button class="modal-btn" onclick="showSetPasswordModal('${id}')">Set New Password</button>
    </div>`);
}

async function saveUserAccess(id) {
  const role = document.getElementById('ea_role').value;
  const { navSections, adminSections } = readAccessCheckboxes('ea');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/update-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ userId: id, role, navSections, adminSections }),
    });
    const result = await res.json();
    if (!res.ok) { toast(result.error || 'Could not update access', 'error'); return; }
    const u = state.db.profiles.find(u=>u.id===id);
    if (u) { u.role = result.profile.role; u.navSections = result.profile.nav_sections || null; u.adminSections = result.profile.admin_sections || null; }
    addAudit(state.profile.username,'User Access Updated', `${u?.name || id}`);
    closeModal(); renderUserMgmt();
    toast('Access updated', 'success');
  } catch (e) {
    console.error(e);
    toast('Network error updating access', 'error');
  }
}

function showSetPasswordModal(id) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const u = state.db.profiles.find(u=>u.id===id);
  if (!u) return;
  openModal(`Set New Password — ${u.name}`, `
    <div class="fg"><label>New Password</label><div style="display:flex;gap:6px"><input id="sp_password" type="text" placeholder="New password" style="flex:1"/><button type="button" class="modal-btn" onclick="fillGeneratedPassword('sp_password')">Generate</button></div></div>
    <div style="font-size:11px;color:var(--text-3);padding:10px;background:var(--surface);border-radius:5px;margin-bottom:12px">This immediately overwrites their password — share it with them directly.</div>
    <button class="submit-btn" onclick="submitSetPassword('${id}')">Set Password →</button>`);
}

async function submitSetPassword(id) {
  const password = document.getElementById('sp_password').value;
  if (password.length < 8) { toast('Password must be at least 8 characters','error'); return; }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ userId: id, password }),
    });
    const result = await res.json();
    if (!res.ok) { toast(result.error || 'Could not set password', 'error'); return; }
    addAudit(state.profile.username,'Password Reset', `${id}`);
    closeModal();
    toast('Password updated', 'success');
  } catch (e) {
    console.error(e);
    toast('Network error setting password', 'error');
  }
}

/* ──────────────────────────────────────────────────────────────────
   § 27  SETTINGS (admin-only, no vault)
────────────────────────────────────────────────────────────────── */
function renderSettings() {
  if (!isAdmin()) {
    document.querySelector('#sec-settings .settings-grid').innerHTML = `<div class="vault-locked-banner" style="grid-column:1/-1"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83"/></svg><div><div class="title">Admin Access Required</div><div class="desc">System settings are restricted to System Administrators.</div></div></div>`;
    return;
  }
  const total = Object.values(state.db).reduce((s,v)=>s+(Array.isArray(v)?v.length:0),0);
  document.getElementById('totalRecords').textContent = total;
  const bk = state.db.settings?.backupDate;
  document.getElementById('lastBackup').textContent = bk ? fmtDate(bk) : 'Never';

  const gpsStatus = document.getElementById('gpsStatusVal');
  if (gpsStatus) {
    const wCfg = wialonConfig();
    const wCount = wialonTrackedTrucks().length;
    if (wCfg.enabled && wCount) {
      gpsStatus.textContent = `Live · Driver GPS + Wialon (${wCount} unit${wCount===1?'':'s'}, synced by server)`;
      gpsStatus.style.color = 'var(--green)';
    } else if (wCfg.enabled) {
      gpsStatus.textContent = 'Live · Driver GPS (Wialon enabled, no units linked)';
      gpsStatus.style.color = 'var(--amber, #d99a2b)';
    } else {
      gpsStatus.textContent = 'Live · Driver GPS';
      gpsStatus.style.color = 'var(--green)';
    }
  }

  renderInvoiceConfigForm();
  renderWialonSettingsForm();
  renderAutoRefreshSettingsForm();
}

function exportAllData() {
  const json = JSON.stringify(state.db, null, 2);
  const a    = document.createElement('a');
  a.href     = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
  a.download = `gargo-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('Data exported','success');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 10*1024*1024) { toast('File too large. Max 10MB.', 'error'); return; }
  const r = new FileReader();
  r.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.trucks || !data.drivers) throw new Error('Invalid format');

      const isUuid = s => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const looksLegacy = data.trucks.length && !isUuid(data.trucks[0].id);
      state.db = looksLegacy ? remapSeedIds(data) : data;
      invalidateSaveSnapshots(); // a restored backup must be written in full, not diffed
      scheduleSave(); buildBadges(); buildAlerts();
      renderSection(state.currentSection);
      toast('Data imported successfully','success');
    } catch(err) { toast('Import failed — invalid file','error'); }
  };
  r.readAsText(file);
  e.target.value='';
}

function createBackup() {
  state.db.settings = state.db.settings || {};
  state.db.settings.backupDate = new Date().toISOString();
  scheduleSave(); exportAllData();
  document.getElementById('lastBackup').textContent = fmtDate(state.db.settings.backupDate);
  toast('Backup created','success');
}

function clearAllData() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  openModal('Confirm: Clear All Data', `<div class="vault-banner"><div class="vault-banner-label">⚠ IRREVERSIBLE ACTION</div><div class="vault-banner-desc">This will permanently delete all trucks, drivers, trips, maintenance records, and financial data. This cannot be undone.</div></div><div class="fg"><label>Type CLEAR to confirm</label><input id="clearConfirm" placeholder="CLEAR" autocomplete="off"/></div><div style="display:flex;gap:8px;margin-top:10px"><button class="modal-btn danger" onclick="executeClearData()">Delete Everything</button><button class="modal-btn ghost" onclick="closeModal()">Cancel</button></div>`);
}

async function executeClearData() {
  if (document.getElementById('clearConfirm')?.value !== 'CLEAR') { toast('Type CLEAR to confirm','error'); return; }
  closeModal();
  toast('Clearing all data…', 'info', 2000);
  await clearAllTables();
  state.db = {
    trucks: [], drivers: [], trips: [], maintenance: [], fuel: [],
    shippingLines: [], shutouts: [], interchange: [], requisitions: [],
    vesselLineMap: [], vesselPrestaking: [],
    workshop: [], invoices: [], billingRates: defaultBillingRates(),
    allocationRules: [], trackingPositions: {}, auditLog: [],
    settings: state.db.settings || {
      backupDate: null, mapApiKey: '', whatsapp: true, mpesa: false,
      companyName: 'Gargo Logistics Ltd', invoiceConfig: null,
      wialonEnabled: false, wialonHost: 'https://hst-api.wialon.com'
    },
    profiles: state.db.profiles || [],
  };
  await saveDB();
  buildBadges(); buildAlerts();
  renderSection(state.currentSection);
  toast('All data cleared','warning');
}

function showChangePasswordModal() {
  if (!state.currentUser) { toast('Not logged in', 'error'); return; }
  openModal('Change Password', `
    <div class="fg"><label>New Password</label>
      <div class="pw-wrap"><input type="password" id="cp_new" placeholder="Min 6 characters"/></div>
    </div>
    <div class="fg"><label>Confirm New Password</label>
      <div class="pw-wrap"><input type="password" id="cp_conf" placeholder="Confirm password"/></div>
    </div>
    <div class="login-error" id="cpError"></div>
    <button class="submit-btn" onclick="submitChangePassword()">Change Password →</button>
  `);
}

const DELETE_TABLE_LABELS = {
  trucks:'Truck', drivers:'Driver', trips:'Trip', maintenance:'Maintenance record',
  fuel:'Fuel log', shutouts:'Shutout record', interchange:'Interchange record',
  shippingLines:'Shipping line', requisitions:'Requisition', workshop:'Workshop job',
  invoices:'Invoice', vesselPrestaking:'Vessel prestaking record',
  containerRepairs:'Container repair job',
};


const DELETE_TABLE_SUPABASE_NAMES = {
  trucks:'trucks', drivers:'drivers', trips:'trips', maintenance:'maintenance',
  fuel:'fuel_logs', shutouts:'shutouts', interchange:'interchange',
  shippingLines:'shipping_lines', requisitions:'requisitions', workshop:'workshop_jobs',
  invoices:'invoices', vesselPrestaking:'vessel_prestaking',
  containerRepairs:'container_repairs',
};

function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = body;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('active');
}


function handleSearch(q) {
  q = (q || '').toLowerCase().trim();
  const panel = document.getElementById('searchResults');
  if (!q || !state.db) { panel.style.display = 'none'; return; }
  const db = state.db;
  const results = [];

  db.trucks.forEach(t => {
    if ((t.reg||'').toLowerCase().includes(q) || (t.id||'').toLowerCase().includes(q) || (t.make||'').toLowerCase().includes(q) || (t.vin||'').toLowerCase().includes(q) || (t.licencePlate||'').toLowerCase().includes(q)) {
      results.push({ type: 'Truck', label: `${t.reg} — ${t.make}`, sub: sbadgeText(t.status), action: () => showTruckDetail(t.id) });
    }
  });

  db.drivers.forEach(d => {
    if ((d.name||'').toLowerCase().includes(q) || (d.phone||'').includes(q) || (d.licence||'').toLowerCase().includes(q) || (d.idNo||'').toLowerCase().includes(q)) {
      results.push({ type: 'Driver', label: d.name, sub: sbadgeText(d.status), action: () => showDriverDetail(d.id) });
    }
  });

  const containers = new Set();
  db.trips.forEach(t => { if ((t.container||'').toLowerCase().includes(q)) containers.add(t.container.toUpperCase()); });
  db.shutouts.forEach(s => { if ((s.container||'').toLowerCase().includes(q)) containers.add(s.container.toUpperCase()); });
  db.interchange.forEach(i => {
    if ((i.container||'').toLowerCase().includes(q) || (i.eirNumber||'').toLowerCase().includes(q) || (i.vessel||'').toLowerCase().includes(q) || (i.voyage||'').toLowerCase().includes(q) || (i.blNumber||'').toLowerCase().includes(q))
      containers.add(i.container.toUpperCase());
  });
  [...containers].forEach(c => {
    const tripCount = db.trips.filter(t => (t.container||'').toUpperCase() === c).length;
    results.push({ type: 'Container', label: c, sub: tripCount ? `${tripCount} trip(s) on record` : 'View full history', action: () => showContainerDetail(c) });
  });

  db.trips.forEach(t => {
    if ((t.origin||'').toLowerCase().includes(q) || (t.dest||'').toLowerCase().includes(q) || (t.ref||'').toLowerCase().includes(q)) {
      results.push({ type: 'Trip', label: `${t.container} — ${t.origin}→${t.dest}`, sub: sbadgeText(t.status), action: () => showTripDetail(t.id) });
    }
  });

  db.invoices.forEach(i => {
    if ((i.client||'').toLowerCase().includes(q) || (i.ref||'').toLowerCase().includes(q)) {
      results.push({ type: 'Invoice', label: `${i.ref} — ${i.client}`, sub: sbadgeText(i.status), action: () => showInvoiceDetail(i.id) });
    }
  });

  const shown = results.slice(0, 10);
  panel.innerHTML = shown.length ? shown.map((r, i) =>
    `<div class="search-result-item" onclick="runSearchResult(${i})"><span class="search-result-type">${esc(r.type)}</span> ${esc(r.label)}${r.sub ? `<span class="search-result-sub">${esc(r.sub)}</span>` : ''}</div>`
  ).join('') : `<div class="search-result-item search-result-empty">No matches</div>`;
  window._searchResults = shown.map(r => r.action);
  panel.style.display = 'block';
}

function runSearchResult(i) {
  const panel = document.getElementById('searchResults'); if (panel) panel.style.display = 'none';
  const gs = document.getElementById('globalSearch'); if (gs) gs.blur();
  if (window._searchResults && window._searchResults[i]) window._searchResults[i]();
}

/* ──────────────────────────────────────────────────────────────────
   § 31  USER MENU
────────────────────────────────────────────────────────────────── */
function toggleUserMenu() {
  const m = document.getElementById('userMenu');
  if (m) m.style.display = m.style.display==='none' ? 'block' : 'none';
}

function closeUserMenu() {
  const m = document.getElementById('userMenu');
  if (m) m.style.display='none';
}

/* ──────────────────────────────────────────────────────────────────
   § 34  LIVE PULSE
────────────────────────────────────────────────────────────────── */
function startLivePulse() {
  setInterval(()=>{
    // Fuel levels now come from the fuel logs (see computeTruckFuel), not from a simulated drain.

    buildAlerts();
    if (state.currentSection==='dashboard') renderDashboard();
    if (state.currentSection==='livetracking') renderTracking();
  }, 30000);
}

/* ──────────────────────────────────────────────────────────────────
   § 37  ADMIN-ONLY SECTION GUARD (Invoicing, Settings, Finance, Admin)
────────────────────────────────────────────────────────────────── */
const ADMIN_ONLY_SECTIONS = ['invoicing', 'settings', 'usermgmt'];

const origShowAdminSection = window.showAdminSection || showAdminSection;

window.showAdminSection = function(sec, btn) {
  if (ADMIN_ONLY_SECTIONS.includes(sec) && !isAdmin()) {
    toast('Admin rights required', 'error');
    return;
  }
  origShowAdminSection(sec, btn);
  if (sec === 'invoicing') renderInvoicing(_invFilter);
};

async function hardRefreshSystem() {
  const btn = document.getElementById('refreshAppBtn');
  const icon = document.getElementById('refreshIcon');
  if (btn && btn.disabled) return;
  if (!navigator.onLine) { toast('You are offline -- showing saved data. It refreshes by itself when the connection returns.', 'warning', 4500); return; }
  if (document.getElementById('modalOverlay')?.classList.contains('active')) { toast('Close the open dialog first, then refresh.', 'warning', 3500); return; }
  if (typeof _refreshInFlight !== 'undefined' && _refreshInFlight) { toast('Already refreshing...', 'info', 1800); return; }

  if (btn) btn.disabled = true;
  if (icon) icon.classList.add('spinning');
  const before = window._gargoLastRefresh || 0;
  try {
    await refreshFromServer();                        // full data reload; re-renders the current section in place
    if ((window._gargoLastRefresh || 0) > before) toast('Data refreshed', 'success', 1800);
    else toast('Could not refresh -- check your connection', 'error', 4000);
    // Quietly look for a newer app version; the existing update flow applies it once unsaved changes are synced.
    try { if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); } catch (e) {}
  } catch (e) {
    console.warn('Refresh failed:', e);
    toast('Could not refresh -- check your connection', 'error', 4000);
  } finally {
    setTimeout(() => { if (btn) btn.disabled = false; if (icon) icon.classList.remove('spinning'); }, 400);
  }
}