/** Regulator-only sections: overview, capacity, scorecard, compliance reports, audit log. */
import {S,occupied,freeTeu,depotName,lineName,alerts,zoneOcc} from '../store.js';
import {DEPOTS,LINES,THRESHOLD,DOC_LABELS,STAGES} from '../config.js';
import {esc,ago,pct,csv} from '../util.js';
import {pill,table,card,kpi,bar,occTone,opts} from '../ui.js';

const short=n=>esc(n.replace(' Empty Container Depot',''));
export function overview(){
 const cap=DEPOTS.reduce((a,d)=>a+d.cap,0),occ=DEPOTS.reduce((a,d)=>a+occupied(d.id),0),A=alerts(),P=pct(occ,cap);
 return`<div class="kpi-row">${kpi(P+'%','Network occupancy','kpi-gold',occ+' of '+cap+' approved TEU')}${kpi(S.C.filter(c=>c.status=='in_yard').length,'Containers in yards','kpi-blue')}${kpi(S.E.filter(e=>e.status=='open').length,'Open escalations','kpi-red')}${kpi(S.X.filter(x=>x.status=='pending_review').length,'Documents awaiting review','kpi-orange')}${kpi(S.V.filter(v=>v.status!='acknowledged').length,'Joint surveys in progress','kpi-green')}</div>
 <div class="two-col-grid">${card('Alerts',A.length?A.map(a=>`<div class="alert-item ${a.tone=='bad'?'crit':'warn'}" data-go="${a.go}" style="cursor:pointer">${a.m}</div>`).join(''):'<div class="empty-state"><div class="empty-state-label">No alerts. The network is within limits.</div></div>',A.length+' active',true)}
 ${card('Depot occupancy','<div class="wt-bars-grid">'+DEPOTS.map(d=>{const p=pct(occupied(d.id),d.cap),c=occTone(p);return`<div class="wt-bar-item" data-go="cap" style="cursor:pointer"><span class="wt-bar-label">${short(d.name)}</span><div class="wt-bar-track"><div class="wt-bar-fill" style="width:${p}%;background:${c}"></div></div><span class="wt-bar-count" style="color:${c}">${p}%</span></div>`}).join('')+'</div>','Alert at '+THRESHOLD+'%',true)}</div>`;
}
export function capacity(){
 return`<div class="two-col-grid">${DEPOTS.map(d=>{const o=occupied(d.id),p=pct(o,d.cap);return card(short(d.name),`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span class="sub">${d.loc.replace('Mombasa · ','')} · ${freeTeu(d.id)} TEU free</span>${p>THRESHOLD?pill('Above '+THRESHOLD+'%','bad'):pill('Within limit','ok')}</div>`+S.zones[d.id].map(z=>{const zo=zoneOcc(d.id,z.name),zp=pct(zo,z.cap);return`<div class="fsb-row"><span class="fsb-label">${z.name}</span><span class="fsb-count">${zo}/${z.cap} TEU</span></div>${bar(zp,occTone(zp))}<div style="height:10px"></div>`}).join(''),o+'/'+d.cap+' TEU · '+p+'%')}).join('')}</div>`;
}
export function scorecard(){
 const rows=DEPOTS.map(d=>{const p=pct(occupied(d.id),d.cap),rej=S.X.filter(x=>x.depotId==d.id&&x.status=='rejected').length,sv=S.V.filter(v=>v.depotId==d.id&&v.status!='acknowledged').length,esc=S.E.filter(e=>e.depotId==d.id&&e.status=='open').length;
  return{d,p,rej,sv,esc,score:Math.max(0,Math.round(100-Math.max(0,p-THRESHOLD)*2-rej*4-sv*5-esc*5))}}).sort((a,b)=>b.score-a.score);
 return card('Depot scorecard',table(['Rank','Depot','Occupancy','Rejected docs','Open surveys','Open escalations','Score'],rows.map((r,i)=>[[i+1,short(r.d.name),r.p+'%',r.rej,r.sv,r.esc,`<div style="min-width:120px"><b>${r.score}</b>${bar(r.score,r.score>80?'var(--ok)':r.score>60?'var(--bkd)':'var(--dmg)')}</div>`],'']),'')+
  `<p class="sub">Score starts at 100. It loses 2 points per percent above ${THRESHOLD}% occupancy, 4 per rejected document, 5 per open survey and 5 per open escalation.</p>`);
}
export const REPORTS={
 containers:['Container registry','Every container with depot, line, condition and document status.'],
 bookings:['Bookings','Every booking with its stage, depot and who booked it.'],
 documents:['Documents and compliance','Guarantee forms, release and delivery orders and interchange receipts.'],
 escalations:['Escalations','Every ticket with SLA, priority and status.'],
 surveys:['Joint surveys','Mandatory and disputed-condition surveys.'],
 occupancy:['Depot occupancy','Approved TEU against occupancy, by depot and zone.'],
 audit:['Activity and audit trail','The full platform activity log.']};
export function buildReport(type,depotId){
 const f=l=>depotId?l.filter(i=>i.depotId==depotId):l,dn=id=>depotName(id);
 const R={
  containers:()=>[['Container','Depot','Line','TEU','Status','Condition','Documents','Zone'],f(S.C).map(c=>[c.ref,dn(c.depotId),lineName(c.lineId),c.teu,c.status,c.condition,c.doc,c.zone||''])],
  bookings:()=>[['Booking','Container','Service','Booked by','Depot','Stage'],f(S.B).map(b=>[b.ref,b.containerRef,b.service,b.company,dn(b.depotId),STAGES[b.stage]])],
  documents:()=>[['Document','Container','Booking','Depot','Status'],f(S.X).map(x=>[DOC_LABELS[x.type]||x.type,x.containerRef,x.bookingRef||'',dn(x.depotId),x.status])],
  escalations:()=>[['Ticket','Category','Raised by','Desk','SLA','Priority','Status','Raised'],f(S.E).map(e=>[e.ref,e.category,e.entity,e.desk,e.sla,e.pri,e.status,new Date(e.t).toISOString()])],
  surveys:()=>[['Survey','Container','Depot','Reason','Mandatory','Status'],f(S.V).map(v=>[v.id,v.containerRef,dn(v.depotId),v.reason,v.mandatory?'Yes':'No',v.status])],
  occupancy:()=>[['Depot','Zone','Capacity TEU','Occupied TEU','Occupancy %'],DEPOTS.filter(d=>!depotId||d.id==depotId).flatMap(d=>S.zones[d.id].map(z=>[d.name,z.name,z.cap,zoneOcc(d.id,z.name),pct(zoneOcc(d.id,z.name),z.cap)]))],
  audit:()=>[['Time','Role','Entity','Category','Event'],S.A.map(a=>[new Date(a.t).toISOString(),a.role,a.entity,a.cat,a.m])]};
 const [h,rows]=R[type]();return[type,csv(h,rows),rows.length];
}
export function reports(){
 const u=S.ui;
 return card('Compliance reports',`<div class="form-row-2"><div class="fg"><label>Report</label><select id="rt">${opts(Object.entries(REPORTS).map(([k,v])=>[k,v[0]]),u.rep)}</select></div><div class="fg"><label>Depot</label><select id="rd"><option value="">All depots</option>${opts(DEPOTS.map(d=>[d.id,d.name]),u.repDepot)}</select></div></div><button class="action-btn" data-report>Download CSV</button><p class="sub" style="margin-top:12px">${REPORTS[u.rep][1]}</p>`);
}
export function audit(){
 const q=(S.ui.aq||'').toLowerCase(),A=S.A.filter(a=>!q||(a.m+a.entity+a.cat).toLowerCase().includes(q));
 return card('Activity and audit log',`<div class="filter-row" style="padding:12px 16px"><div class="fg" style="margin:0"><input id="aq" placeholder="Search the log" value="${esc(S.ui.aq||'')}"></div></div>`+table(['When','Who','Type','Event'],A.slice(0,120).map(a=>[[`<span title="${new Date(a.t).toLocaleString()}">${ago(a.t)}</span>`,esc(a.entity),esc(a.cat),esc(a.m)],'']),'No activity matches.'));
}
