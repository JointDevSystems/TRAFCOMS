'use strict';


function requireFinanceReport(tab, btn) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  renderReport('revenue');
  document.querySelectorAll('#sec-reports .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

/* ──────────────────────────────────────────────────────────────────
   § 23  WORK ANALYSIS
────────────────────────────────────────────────────────────────── */
function renderWorkAnalysis(period, btn) {
  if (btn) { document.querySelectorAll('#sec-workanalysis .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
  const db=state.db;
  let trips=db.trips;
  const now=Date.now();
  if(period==='today') trips=trips.filter(t=>new Date(t.startTime).toDateString()===new Date().toDateString());
  else if(period==='week') trips=trips.filter(t=>now-new Date(t.startTime)<7*86400000);
  else if(period==='month') trips=trips.filter(t=>now-new Date(t.startTime)<30*86400000);
  const workTypes={};
  trips.forEach(t=>{ workTypes[t.workType]=(workTypes[t.workType]||0)+1; });
  const maxCount=Math.max(...Object.values(workTypes),1);
  const kpis=document.getElementById('waKpis');
  if(kpis){
    kpis.innerHTML= `${kpiCard('Total Trips', trips.length, '', 'kpi-gold')} ${kpiCard('Work Types', Object.keys(workTypes).length, '', 'kpi-blue')} ${kpiCard('Completed', trips.filter(t=>t.status==='completed').length, '', 'kpi-green')} ${kpiCard('Delayed', trips.filter(t=>t.status==='delayed').length, '', 'kpi-red')}`;
  }
  const vol=document.getElementById('waVolumeChart');
  if(vol){
    vol.innerHTML=Object.entries(workTypes).sort((a,b)=>b[1]-a[1]).map(([wt,cnt])=>`<div class="wt-bar-item"><div class="wt-bar-label" title="${wt}">${wt}</div><div class="wt-bar-track"><div class="wt-bar-fill" style="width:${Math.round(cnt/maxCount*100)}%"></div></div><div class="wt-bar-count">${cnt}</div></div>`).join('')||'<div style="padding:12px;color:var(--text-3)">No data for this period</div>';
  }
  const matrixData=Object.entries(workTypes).map(([wt,cnt])=>{
    const wtTrips=trips.filter(t=>t.workType===wt);
    const onTime=wtTrips.filter(t=>t.status==='completed'||t.status==='active').length;
    const onTimePct=wtTrips.length?Math.round(onTime/wtTrips.length*100):0;
    const truckCounts={};
    wtTrips.forEach(t=>{ truckCounts[t.truckId]=(truckCounts[t.truckId]||0)+1; });
    const topTruckId=Object.entries(truckCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];
    return { wt, cnt, onTimePct, topTruck: topTruckId?state.db.trucks.find(t=>t.id===topTruckId)?.reg||'—':'—' };
  });
  const mat=document.getElementById('waMatrix');
  if(mat){
    mat.innerHTML=matrixData.map(m=>`<tr><td>${m.wt}</td><td class="mono" style="text-align:center">${m.cnt}</td><td class="mono" style="text-align:center">~${Math.round(1+(Math.random()*2))}h</td><td class="mono" style="text-align:center;color:${m.onTimePct>70?'var(--green)':'var(--amber)'}">${m.onTimePct}%</td><td class="mono" style="color:var(--gold)">${m.topTruck}</td></tr>`).join('')||`<tr><td colspan="5" class="empty-td">No data</td></tr>`;
  }
  const outwardTrips = trips.filter(t => isOutwardWorkType(t.workType));
  const outwardTypeCounts = {};
  OUTWARD_TYPES.forEach(w => { outwardTypeCounts[w] = 0; });
  outwardTrips.forEach(t => { const key = t.outwardType || 'Unclassified'; outwardTypeCounts[key] = (outwardTypeCounts[key]||0) + 1; });
  const outwardMax = Math.max(...Object.values(outwardTypeCounts), 1);
  const outwardChart = document.getElementById('waOutwardChart');
  if (outwardChart) {
    outwardChart.innerHTML = Object.entries(outwardTypeCounts).sort((a,b)=>b[1]-a[1]).map(([wt,cnt])=>`<div class="wt-bar-item"><div class="wt-bar-label" title="${sanitize(wt)}">${sanitize(wt)}</div><div class="wt-bar-track"><div class="wt-bar-fill" style="width:${Math.round(cnt/outwardMax*100)}%"></div></div><div class="wt-bar-count">${cnt}</div></div>`).join('') || '<div style="padding:12px;color:var(--text-3)">No outward trips for this period</div>';
  }
}

/* ─────────────────────────────────────────────────────────────────
   § 24  REPORTS (with finance lock)
────────────────────────────────────────────────────────────────── */
function renderReport(tab, btn) {
  if (btn) { document.querySelectorAll('#sec-reports .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
  const db=state.db;
  const out=document.getElementById('reportContent');
  if(!out) return;
  if(tab==='overview'){
    out.innerHTML=`<div class="two-col-grid"><div class="report-block"><h3>Fleet Overview</h3>${reportRow('Total Trucks', db.trucks.length)}${reportRow('Available', db.trucks.filter(t=>t.status==='available').length)}${reportRow('On Trip', db.trucks.filter(t=>t.status==='on_trip').length)}${reportRow('Breakdown/Maintenance', db.trucks.filter(t=>['breakdown','maintenance'].includes(t.status)).length)}</div><div class="report-block"><h3>Operations</h3>${reportRow('Trips Today', db.trips.filter(t=>new Date(t.startTime).toDateString()===new Date().toDateString()).length)}${reportRow('Active Trips', db.trips.filter(t=>t.status==='active').length)}${reportRow('Completed (All)', db.trips.filter(t=>t.status==='completed').length)}${reportRow('Total Distance (All)', fmt(db.trips.reduce((s,t)=>s+t.distance,0))+' km')}</div><div class="report-block"><h3>Fuel</h3>${reportRow('Total Fills', db.fuel.filter(f=>f.litres>0).length)}${reportRow('Total Litres', fmt(db.fuel.reduce((s,f)=>s+f.litres,0))+' L')}${reportRow('Total Cost', fmtKsh(db.fuel.filter(f=>f.litres>0).reduce((s,f)=>s+fuelLogTotal(f),0)))}</div><div class="report-block"><h3>Compliance</h3>${reportRow('Open Maintenance', db.maintenance.filter(m=>m.status==='open').length)}${reportRow('Pending Requisitions', db.requisitions.filter(r=>r.status==='pending').length)}${reportRow('Shutouts Open', db.shutouts.filter(s=>s.status==='open').length)}</div></div>`;
  } else if(tab==='fleet'){
    out.innerHTML=`<div class="report-block"><h3>Fleet Utilisation</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Truck</th><th>Status</th><th>Fuel</th><th>Mileage</th><th>Trips</th><th>Next Service</th></tr></thead><tbody>${db.trucks.map(t=>`<tr><td class="mono" style="color:var(--gold)">${t.reg}</td><td>${sbadge(t.status)}</td><td>${truckFuelBar(t, 'width:80px')}<div style="font-size:9px;color:var(--text-3);margin-top:3px">${truckFuelLabel(t)}</div></td><td class="mono">${fmt(t.mileage)} km</td><td class="mono">${db.trips.filter(tr=>tr.truckId===t.id).length}</td><td style="color:${new Date(t.nextService) < Date.now()?'var(--red)':'var(--text-2)'}" class="mono">${fmtDate(t.nextService)}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if(tab==='drivers'){
    out.innerHTML=`<div class="report-block"><h3>Driver Performance</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Driver</th><th>Status</th><th>Trips Today</th><th>Licence Exp.</th></tr></thead><tbody>${db.drivers.map(d=>`<tr><td>${d.name}</td><td>${sbadge(d.status)}</td><td class="mono" style="text-align:center">${d.tripsToday}</td><td style="color:${(new Date(d.licenceExp)-Date.now())<90*86400000?'var(--amber)':'var(--text-2)'}" class="mono">${fmtDate(d.licenceExp)}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if(tab==='maintenance'){
    const totalCost=db.maintenance.reduce((s,m)=>s+m.cost,0);
    out.innerHTML=`<div class="report-block"><h3>Maintenance Summary</h3>${reportRow('Total Issues',db.maintenance.length)}${reportRow('Open',db.maintenance.filter(m=>m.status==='open').length)}${reportRow('In Progress',db.maintenance.filter(m=>m.status==='in_progress').length)}${reportRow('Resolved',db.maintenance.filter(m=>m.status==='resolved').length)}${reportRow('Total Cost',fmtKsh(totalCost))}</div><div class="report-block" style="margin-top:14px"><h3>Issues by Priority</h3>${['critical','high','medium','low'].map(p=>reportRow(p.charAt(0).toUpperCase()+p.slice(1),db.maintenance.filter(m=>m.priority===p).length)).join('')}</div>`;
  } else if(tab==='fuel'){
    out.innerHTML=`<div class="report-block"><h3>Fuel Report</h3>${reportRow('Total Fill-ups',db.fuel.filter(f=>f.litres>0).length)}${reportRow('Total Litres',fmt(db.fuel.reduce((s,f)=>s+f.litres,0))+' L')}${reportRow('Fuel Purchases',fmtKsh(db.fuel.filter(f=>f.litres>0).reduce((s,f)=>s+fuelLogTotal(f),0)))+reportRow('Trip Payments ('+db.fuel.filter(f=>!(f.litres>0)).length.toLocaleString()+')',fmtKsh(db.fuel.filter(f=>!(f.litres>0)).reduce((s,f)=>s+fuelLogTotal(f),0)))}${reportRow('Avg Price/Litre','KSh '+(db.fuel.filter(f=>f.litres>0).reduce((s,f)=>s+fuelLogTotal(f),0)/Math.max(db.fuel.reduce((s,f)=>s+f.litres,0),1)).toFixed(2))}</div>`;
  } else if(tab==='revenue'){
    if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
    const inv=db.invoices;
    out.innerHTML=`<div class="report-block"><h3>Revenue Report — CONFIDENTIAL</h3>${reportRow('Total Invoiced',fmtKsh(inv.reduce((s,i)=>s+i.total,0)))}${reportRow('Collected',fmtKsh(inv.reduce((s,i)=>s+i.paid,0)))}${reportRow('Outstanding',fmtKsh(inv.reduce((s,i)=>s+(i.total-i.paid),0)))}${reportRow('Overdue',fmtKsh(inv.filter(i=>i.status==='overdue').reduce((s,i)=>s+i.total,0)))}</div>`;
  } else if(tab==='depops'){
    out.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
    renderReportDepOps(out);
  }
}

async function renderReportDepOps(out) {
  try {
    const [zones, awaitingSurvey, surveyedAwaitingAlloc, escalated] = await Promise.all([
      window.bookingDocs.listZones(),
      window.bookingDocs.awaitingSurveyBookings(),
      window.bookingDocs.surveyedAwaitingAllocation(),
      window.bookingDocs.escalatedBookings(),
    ]);
    const inStorage = await depOpsRepatriationEligibleBookings();
    const totalCap = zones.reduce((s,z)=>s+(z.capacity_teu||0),0);
    const totalOcc = zones.reduce((s,z)=>s+(z.occupied_teu||0),0);
    const ic = state.db.interchange || [];
    const icPending = ic.filter(i=>i.status==='pending').length;
    const icApproved = ic.filter(i=>i.status==='approved').length;
    const icReconciled = ic.filter(i=>i.status==='reconciled').length;
    const icFromSurvey = ic.filter(i=>/Auto-generated from survey/.test(i.notes||'')).length;
    const icFlagged = ic.filter(i=>i.flaggedForReview).length;
    const tripsFlagged = (state.db.trips||[]).filter(t=>t.flaggedForReview).length;

    if (!out || !out.isConnected) return; // tab may have been switched away while loading

    out.innerHTML = `<div class="two-col-grid">
      <div class="report-block">
        <h3>Depot Storage Pipeline</h3>
        ${reportRow('Awaiting Survey', awaitingSurvey.length)}
        ${reportRow('Surveyed — Awaiting Allocation', surveyedAwaitingAlloc.length)}
        ${reportRow('Escalated (Joint Survey Needed)', escalated.length)}
        ${reportRow('Currently In Storage', inStorage.length)}
      </div>
      <div class="report-block">
        <h3>Zone Occupancy</h3>
        ${reportRow('Total Capacity', totalCap + ' TEU')}
        ${reportRow('Occupied', totalOcc + ' TEU')}
        ${reportRow('Free', Math.max(totalCap-totalOcc,0) + ' TEU')}
        ${reportRow('Zones Configured', zones.length)}
      </div>
      <div class="report-block">
        <h3>Interchange</h3>
        ${reportRow('Pending', icPending)}
        ${reportRow('Approved', icApproved)}
        ${reportRow('Reconciled', icReconciled)}
        ${reportRow('Generated From Survey', icFromSurvey + ' / ' + ic.length)}
        ${reportRow('Flagged for Review (Interchange)', icFlagged)}
        ${reportRow('Flagged for Review (Dispatch)', tripsFlagged)}
      </div>
      <div class="report-block">
        <h3>Jump To</h3>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
          <button class="action-btn ghost" onclick="showSection('depops', document.querySelector('[data-section=\\'depops\\']'))">Open DepOps →</button>
          <button class="action-btn ghost" onclick="showSection('interchange', document.querySelector('[data-section=\\'interchange\\']'))">Open Interchange →</button>
        </div>
      </div>
    </div>`;
  } catch (e) {
    if (out && out.isConnected) out.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function reportRow(label, val) {
  return `<div class="report-row"><span class="label">${label}</span><span class="val">${val}</span></div>`;
}

const trc = { tripRows: [], auditRows: [], period: 'hourly', auditPeriod: 'today' };

function trcSwitchTab(tab, btn) {
  document.querySelectorAll('#sec-tripreports > .sec-toolbar .filter-row .filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const tripsTab = document.getElementById('trcTab-trips');
  const auditTab = document.getElementById('trcTab-audit');
  if (tripsTab) tripsTab.style.display = tab==='trips' ? '' : 'none';
  if (auditTab) auditTab.style.display = tab==='audit' ? '' : 'none';
}

function trcInit() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  trcPopulateFilterOptions();
  if (!document.getElementById('trcFrom').value) {

    trcSetPeriod('all', document.querySelector('#trcTab-trips .trc-period-row .filter-btn'));
  }
  if (!document.getElementById('trcAuditFrom').value) {
    trcSetAuditPeriod('today', document.querySelector('#trcTab-audit .trc-period-row .filter-btn'));
  }
}

function trcPopulateFilterOptions() {
  const truckSel = document.getElementById('trcTruck');
  if (truckSel && truckSel.options.length <= 1) {
    [...state.db.trucks].sort((a,b)=>a.reg.localeCompare(b.reg)).forEach(t=>{
      const o=document.createElement('option'); o.value=t.id; o.textContent=t.reg; truckSel.appendChild(o);
    });
  }
  const driverSel = document.getElementById('trcDriver');
  if (driverSel && driverSel.options.length <= 1) {
    [...state.db.drivers].sort((a,b)=>a.name.localeCompare(b.name)).forEach(d=>{
      const o=document.createElement('option'); o.value=d.id; o.textContent=d.name; driverSel.appendChild(o);
    });
  }
  const statusSel = document.getElementById('trcStatus');
  if (statusSel && statusSel.options.length <= 1) {
    TRIP_ALL_STATUSES.forEach(s=>{
      const o=document.createElement('option'); o.value=s; o.textContent=s.replace('_',' '); statusSel.appendChild(o);
    });
  }
  const workTypeSel = document.getElementById('trcWorkType');
  if (workTypeSel && workTypeSel.options.length <= 1) {
    [...new Set(state.db.trips.map(t=>t.workType))].sort().forEach(w=>{
      const o=document.createElement('option'); o.value=w; o.textContent=w; workTypeSel.appendChild(o);
    });
  }
  const auditUserSel = document.getElementById('trcAuditUser');
  if (auditUserSel && auditUserSel.options.length <= 1) {
    [...state.db.profiles].sort((a,b)=>a.username.localeCompare(b.username)).forEach(p=>{
      const o=document.createElement('option'); o.value=p.username; o.textContent=`${p.name} (${p.username})`; auditUserSel.appendChild(o);
    });
  }
}

function trcPad(n) { return String(n).padStart(2,'0'); }

function trcLocalInputValue(d) { return `${d.getFullYear()}-${trcPad(d.getMonth()+1)}-${trcPad(d.getDate())}T${trcPad(d.getHours())}:${trcPad(d.getMinutes())}`; }

function trcSetPeriod(period, btn) {
  if (btn) { document.querySelectorAll('#trcTab-trips .trc-period-row .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
  trc.period = period;
  if (period === 'custom') return; // leave from/to as-is for manual editing
  const now = new Date();
  let from;
  if (period === 'all')          from = new Date(2000,0,1); // covers any historical bulk-imported start_time
  else if (period === 'hourly')  from = new Date(now.getTime() - 3600000);
  else if (period === 'daily')   { from = new Date(now); from.setHours(0,0,0,0); }
  else if (period === 'weekly')  { from = new Date(now); const day=(from.getDay()+6)%7; from.setDate(from.getDate()-day); from.setHours(0,0,0,0); }
  else if (period === 'monthly') from = new Date(now.getFullYear(), now.getMonth(), 1);
  else from = new Date(now.getTime() - 3600000);
  document.getElementById('trcFrom').value = trcLocalInputValue(from);
  document.getElementById('trcTo').value   = trcLocalInputValue(now);
}

function trcSetAuditPeriod(period, btn) {
  if (btn) { document.querySelectorAll('#trcTab-audit .trc-period-row .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
  trc.auditPeriod = period;
  if (period === 'custom') return;
  const now = new Date();
  let from;
  if (period === 'today')      { from = new Date(now); from.setHours(0,0,0,0); }
  else if (period === 'week')  { from = new Date(now); const day=(from.getDay()+6)%7; from.setDate(from.getDate()-day); from.setHours(0,0,0,0); }
  else if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
  else from = new Date(2000,0,1); // 'all'
  document.getElementById('trcAuditFrom').value = trcLocalInputValue(from);
  document.getElementById('trcAuditTo').value   = trcLocalInputValue(now);
}

async function trcRunTripReport() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const fromVal   = document.getElementById('trcFrom').value;
  const toVal     = document.getElementById('trcTo').value;
  const truckId   = document.getElementById('trcTruck').value;
  const driverId  = document.getElementById('trcDriver').value;
  const status    = document.getElementById('trcStatus').value;
  const workType  = document.getElementById('trcWorkType').value;
  const outwardTypeEl = document.getElementById('trcOutwardType');
  const outwardType = outwardTypeEl ? outwardTypeEl.value : '';

  const btn = document.querySelector('#trcTab-trips .action-btn:not(.ghost)');
  const origLabel = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Running…'; btn.disabled = true; }

  try {
    const buildQuery = () => {
      let q = supabase.from('trips').select('*');
      if (fromVal)  q = q.gte('start_time', new Date(fromVal).toISOString());
      if (toVal)    q = q.lte('start_time', new Date(toVal).toISOString());
      if (truckId)  q = q.eq('truck_id', truckId);
      if (driverId) q = q.eq('driver_id', driverId);
      if (status)   q = q.eq('status', status);
      if (workType) q = q.eq('work_type', workType);
      if (outwardType) q = q.eq('outward_type', outwardType);
      return q.order('start_time', { ascending: false });
    };

    // Uses the same fetchAllPaginated helper as loadDB() (core-db.js) so a
    // wide date range can't silently truncate the report at a fixed row
    // count — the summary and export should always reflect every matching
    // trip, not just the first page of them. Each page rebuilds the query
    // from scratch rather than re-ranging one shared builder, since a
    // Supabase query builder shouldn't be re-awaited after it has already
    // been sent once.
    const { data, error } = await fetchAllPaginated((from, to) => buildQuery().range(from, to));
    if (error) throw error;

    const rows = (data || []).map(tripFromRow);
    trc.tripRows = rows;
    trcRenderTripSummary(rows);
    trcRenderTripTable(rows);
    const csvBtn = document.getElementById('trcExportTripsBtn');
    const jsonBtn = document.getElementById('trcExportTripsJsonBtn');
    if (csvBtn) csvBtn.disabled = rows.length === 0;
    if (jsonBtn) jsonBtn.disabled = rows.length === 0;
    toast(`${rows.length} trip record(s) retrieved`, 'success');
    addAudit(state.profile.username, 'Trip Report Queried', `${rows.length} trips · ${trc.period}${fromVal ? ` · ${fromVal.replace('T',' ')} → ${toVal ? toVal.replace('T',' ') : 'now'}` : ''}`);
  } catch (e) {
    console.error('Trip report query failed:', e.message);
    toast('Query failed — check your connection', 'error');
  } finally {
    if (btn) { btn.textContent = origLabel; btn.disabled = false; }
  }
}

function trcRenderTripSummary(rows) {
  const el = document.getElementById('trcTripSummary');
  if (!el) return;
  if (!rows.length) {
    el.className = '';
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-label">No trips match this query</div><div class="empty-state-sub">Adjust the date range or filters and run again</div></div>';
    return;
  }
  const totalDist = rows.reduce((s,t)=>s+(Number(t.distance)||0), 0);
  const completed = rows.filter(t=>t.status==='completed').length;
  const active    = rows.filter(t=>t.status==='active').length;
  const delayed   = rows.filter(t=>t.status==='delayed'||t.status==='breakdown').length;
  el.className = 'kpi-row';
  el.innerHTML = `${kpiCard('Total Trips', fmt(rows.length), '', 'kpi-gold')} ${kpiCard('Completed', fmt(completed), '', 'kpi-green')} ${kpiCard('Active', fmt(active), '', 'kpi-blue')} ${kpiCard('Delayed / Breakdown', fmt(delayed), '', 'kpi-red')} ${kpiCard('Total Distance', fmt(totalDist)+' km', '', 'kpi-orange')}`;
}

function trcRenderTripTable(rows) {
  const meta = document.getElementById('trcTripMeta');
  if (meta) meta.textContent = `${rows.length} record(s)${rows.length===5000 ? ' (capped at 5000 — narrow your range)' : ''}`;
  const body = document.getElementById('trcTripBody');
  if (!body) return;
  body.innerHTML = rows.map(t=>`<tr onclick="showTripDetail('${t.id}')">
    <td class="mono" style="color:var(--gold)">${t.container}</td>
    <td>${truckName(t.truckId)}</td>
    <td>${driverName(t.driverId)}</td>
    <td>${t.workType}</td>
    <td>${t.outwardType || '—'}</td>
    <td style="font-size:11px">${t.origin} → ${t.dest}</td>
    <td>${sbadge(t.status)}</td>
    <td>${t.priority ? sbadge(t.priority.toLowerCase()) : '—'}</td>
    <td class="mono">${t.distance} km</td>
    <td class="mono" style="font-size:10.5px">${fmtTime(t.startTime)} · ${fmtDate(t.startTime)}</td>
    <td class="mono" style="font-size:10.5px">${fmtTime(t.eta)}</td>
  </tr>`).join('') || '';
}

function trcExportTripsCSV() {
  if (!trc.tripRows.length) return;
  const headers = ['ID','Container','Type','Truck','Driver','Work Type','Outward Type','Origin','Destination','Shipping Line','Status','Priority','Distance (km)','Start Time','ETA','Reference'];
  const lines = [headers.join(',')];
  trc.tripRows.forEach(t=>{
    lines.push([
      t.id, t.container, t.ctype, truckName(t.truckId), driverName(t.driverId), t.workType, t.outwardType || '',
      t.origin, t.dest, lineName(t.shippingLine), t.status, t.priority, t.distance,
      t.startTime, t.eta, t.ref,
    ].map(csvEscape).join(','));
  });
  downloadTextFile(`gargo-trip-report-${Date.now()}.csv`, lines.join('\n'), 'text/csv');
  addAudit(state.profile.username, 'Trip Report Exported', `${trc.tripRows.length} trips (CSV)`);
  toast('Trip report exported', 'success');
}

function trcExportTripsJSON() {
  if (!trc.tripRows.length) return;
  downloadTextFile(`gargo-trip-report-${Date.now()}.json`, JSON.stringify(trc.tripRows, null, 2), 'application/json');
  addAudit(state.profile.username, 'Trip Report Exported', `${trc.tripRows.length} trips (JSON)`);
  toast('Trip report exported', 'success');
}

async function trcRunAuditQuery() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const fromVal = document.getElementById('trcAuditFrom').value;
  const toVal   = document.getElementById('trcAuditTo').value;
  const user    = document.getElementById('trcAuditUser').value;
  const search  = document.getElementById('trcAuditSearch').value.trim();

  const btn = document.querySelector('#trcTab-audit .action-btn:not(.ghost)');
  const origLabel = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Running…'; btn.disabled = true; }

  try {
    const buildQuery = () => {
      let q = supabase.from('audit_log').select('*');
      if (fromVal) q = q.gte('time', new Date(fromVal).toISOString());
      if (toVal)   q = q.lte('time', new Date(toVal).toISOString());
      if (user)    q = q.eq('username', user);
      if (search)  q = q.or(`action.ilike.%${search}%,detail.ilike.%${search}%`);
      return q.order('time', { ascending: false });
    };

    const { data, error } = await fetchAllPaginated((from, to) => buildQuery().range(from, to));
    if (error) throw error;

    const rows = (data || []).map(a=>({ id:a.id, user:a.username, action:a.action, detail:a.detail, time:a.time }));
    trc.auditRows = rows;
    trcRenderAuditSummary(rows);
    trcRenderAuditTable(rows);
    const csvBtn = document.getElementById('trcExportAuditBtn');
    if (csvBtn) csvBtn.disabled = rows.length === 0;
    toast(`${rows.length} audit record(s) retrieved`, 'success');
  } catch (e) {
    console.error('Audit query failed:', e.message);
    toast('Query failed — check your connection', 'error');
  } finally {
    if (btn) { btn.textContent = origLabel; btn.disabled = false; }
  }
}

function trcRenderAuditSummary(rows) {
  const el = document.getElementById('trcAuditSummary');
  if (!el) return;
  if (!rows.length) {
    el.className = '';
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🗂</div><div class="empty-state-label">No audit entries match this query</div><div class="empty-state-sub">Widen the date range or clear filters and run again</div></div>';
    return;
  }
  const users   = new Set(rows.map(r=>r.user)).size;
  const actions = new Set(rows.map(r=>r.action)).size;
  el.className = 'kpi-row';
  el.innerHTML = `${kpiCard('Total Entries', fmt(rows.length), '', 'kpi-gold')} ${kpiCard('Distinct Users', fmt(users), '', 'kpi-blue')} ${kpiCard('Action Types', fmt(actions), '', 'kpi-orange')}`;
}

function trcRenderAuditTable(rows) {
  const meta = document.getElementById('trcAuditMeta');
  if (meta) meta.textContent = `${rows.length} record(s)${rows.length===2000 ? ' (capped at 2000 — narrow your range)' : ''}`;
  const body = document.getElementById('trcAuditBody');
  if (!body) return;
  body.innerHTML = rows.map(a=>`<tr>
    <td class="mono" style="font-size:10.5px;white-space:nowrap">${fmtTime(a.time)} · ${fmtDate(a.time)}</td>
    <td>${a.user}</td>
    <td style="font-weight:600;color:var(--text)">${a.action}</td>
    <td style="color:var(--text-2)">${a.detail||''}</td>
  </tr>`).join('');
}

function trcExportAuditCSV() {
  if (!trc.auditRows.length) return;
  const headers = ['Time','User','Action','Detail'];
  const lines = [headers.join(',')];
  trc.auditRows.forEach(a=>lines.push([a.time, a.user, a.action, a.detail].map(csvEscape).join(',')));
  downloadTextFile(`gargo-audit-log-${Date.now()}.csv`, lines.join('\n'), 'text/csv');
  addAudit(state.profile.username, 'Audit Log Exported', `${trc.auditRows.length} entries (CSV)`);
  toast('Audit log exported', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 35  AUDIT LOG HELPER
────────────────────────────────────────────────────────────────── */
function addAudit(user, action, detail) {
  if (!user) user = 'system';
  const log = state.db.auditLog || [];
  log.unshift({ user, action, detail, time: new Date().toISOString() });
  if (log.length > 500) log.splice(500);
  state.db.auditLog = log;
  scheduleSave();
}