/** Role portals: shipping line overview, depot yard, depot space, booking form. */
import {S,vis,occupied,freeTeu,depot,depotName,lineName,zoneOcc} from '../store.js';
import {DEPOTS,LINES,SERVICES,ORIGINS,DOC_LABELS,COND,THRESHOLD} from '../config.js';
import {esc,pct} from '../util.js';
import {pill,table,card,kpi,bar,occTone,opts} from '../ui.js';

const short=n=>esc(n.replace(' Empty Container Depot',''));
export function lineOverview(){
 const C=vis('C'),y=C.filter(c=>c.status=='in_yard'),by={};y.forEach(c=>{(by[c.depotId]=by[c.depotId]||[]).push(c)});
 return`<div class="kpi-row">${kpi(y.length,'Containers in yards','kpi-gold',y.reduce((a,c)=>a+c.teu,0)+' TEU')}${kpi(C.filter(c=>['damaged','heavy_damage'].includes(c.condition)).length,'Damaged containers','kpi-red')}${kpi(vis('B').filter(b=>b.stage<3).length,'Bookings in progress','kpi-orange')}${kpi(vis('V').filter(v=>v.status!='acknowledged').length,'Surveys needing attention','kpi-blue')}</div>`+
 card('Where your containers are',table(['Depot','Containers','TEU','Damaged'],Object.entries(by).map(([id,l])=>[[short(depotName(id)),l.length,l.reduce((a,c)=>a+c.teu,0),l.filter(c=>c.condition=='damaged'||c.condition=='heavy_damage').length],'']),'No containers in depots.'),esc(lineName(S.session.lineId)));
}
export function depotOverview(){
 const id=S.session.depotId,d=depot(id),o=occupied(id),p=pct(o,d.cap),B=vis('B').filter(b=>b.stage<3);
 return`<div class="kpi-row">${kpi(p+'%','Yard occupancy',p>THRESHOLD?'kpi-red':'kpi-gold',o+' of '+d.cap+' TEU · '+freeTeu(id)+' free')}${kpi(B.length,'Bookings awaiting action','kpi-orange')}${kpi(vis('X').filter(x=>x.status=='pending_review').length,'Documents to review','kpi-blue')}${kpi(vis('V').filter(v=>v.status!='acknowledged').length,'Open joint surveys','kpi-green')}</div>`+
 (p>THRESHOLD?`<div class="panel" style="margin-bottom:14px"><div class="alert-item crit">Above the ${THRESHOLD}% threshold. Raise a capacity escalation.</div></div>`:'')+
 card('Zones',S.zones[id].map(z=>{const zo=zoneOcc(id,z.name),zp=pct(zo,z.cap);return`<div class="fsb-row"><span class="fsb-label">${z.name}</span><span class="fsb-count">${zo} of ${z.cap} TEU</span></div>${bar(zp,occTone(zp))}<div style="height:12px"></div>`}).join(''),esc(d.name));
}
export function space(){
 const agent=true,min=S.ui.min||0;
 return card('Available depot space',`<div class="filter-row" style="padding:12px 16px">${[0,10,50].map(n=>`<button class="pill ${min==n?'active':''}" data-umin="${n}">${n?`${n}+ TEU free`:'All depots'}</button>`).join('')}</div>`+
  table(['Depot','Location','Occupancy','Free TEU','Zones (free TEU)',''],DEPOTS.filter(d=>freeTeu(d.id)>=min).sort((a,b)=>freeTeu(b.id)-freeTeu(a.id)).map(d=>{const p=pct(occupied(d.id),d.cap);return[[short(d.name),d.loc.replace('Mombasa · ',''),`<div style="min-width:110px">${p}%${bar(p,occTone(p))}</div>`,`<b>${freeTeu(d.id)}</b>`,S.zones[d.id].map(z=>`${z.name.slice(-1)}: ${z.cap-zoneOcc(d.id,z.name)}`).join(' · '),`<button class="tbl-btn" data-book="${d.id}">Book here</button>`],'']}),'No depot has that much space.'));
}
export function book(){
 const pre=S.ui.bookDepot||'';
 return card(S.session.role=='cfagent'?'Submit a booking':'Book storage',`<div class="form-row-2">
  <div class="fg"><label>Service</label><select id="bs">${opts(Object.keys(SERVICES).map(s=>[s,s]))}</select></div>
  <div class="fg"><label>Depot</label><select id="bd">${opts(DEPOTS.map(d=>[d.id,`${short(d.name)} (${freeTeu(d.id)} TEU free)`]),pre)}</select></div>
  <div class="fg"><label>Container number</label><input id="bc" placeholder="e.g. MSCU4821374" maxlength="11" autocomplete="off"></div>
  <div class="fg"><label>Shipping line</label><select id="bl">${opts(LINES.map(l=>[l.id,l.name]))}</select></div>
  <div class="fg"><label>Size</label><select id="bt">${opts([[1,'20 ft (1 TEU)'],[2,'40 ft (2 TEU)']])}</select></div>
  <div class="fg"><label>Coming from</label><select id="bo">${opts(ORIGINS.map(o=>[o,o]))}</select></div>
  </div><button class="action-btn" data-submit>Submit booking</button>`)+
  card('Documents each service needs',table(['Service','Required documents'],Object.entries(SERVICES).map(([s,d])=>[[s,d.map(t=>DOC_LABELS[t]).join(', ')+'. The interchange receipt is added once the depot confirms the container.'],''])));
}
