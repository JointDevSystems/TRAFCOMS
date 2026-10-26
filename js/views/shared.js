/** Sections shared across roles. Data is scoped by role through vis(). */
import {S,vis,depotName,lineName,entity,depot} from '../store.js';
import {DEPOTS,LINES,STATUS,COND,DOCST,SURVST,STAGES,DOC_LABELS,CATS,PRI,ROLES} from '../config.js';
import {esc,ago} from '../util.js';
import {meta,pill,table,card,opts,bar} from '../ui.js';

const role=()=>S.session.role,can=(...r)=>r.includes(role());
const chips=(items,cur,attr)=>`<div class="filter-row" style="padding:12px 16px 0">${items.map(([k,t])=>`<button class="pill ${cur==k?'active':''}" ${attr}="${k}">${t}</button>`).join('')}</div>`;

export function containers(){
 const u=S.ui,q=u.q.toLowerCase(),all=vis('C');
 const R=all.filter(c=>(u.f=='all'||c.condition==u.f)&&(u.depot=='all'||c.depotId==u.depot)&&(!q||(c.ref+lineName(c.lineId)+depotName(c.depotId)).toLowerCase().includes(q)));
 const filt=chips([['all','All'],...Object.entries(COND).map(([k,v])=>[k,v[0]])],u.f,'data-uf');
 const dsel=role()=='kma'?`<div class="fg" style="margin:0"><select data-udepot><option value="all">All depots</option>${opts(DEPOTS.map(d=>[d.id,d.name]),u.depot)}</select></div>`:'';
 return card(role()=='kma'?'Container registry':'Containers',`${filt}<div class="filter-row" style="padding:10px 16px 12px;justify-content:space-between">${dsel}<div class="fg" style="margin:0"><input id="q" placeholder="Search number, line or depot" value="${esc(u.q)}"></div></div>`+
  table(['Container',...(role()=='line'?[]:['Line']),...(role()=='depot'?[]:['Depot']),'Type','Status','Condition','Documents','Zone'],R.slice(0,60).map(c=>[[`<span class="mono">${c.ref}</span>`,...(role()=='line'?[]:[esc(lineName(c.lineId).split(' —')[0])]),...(role()=='depot'?[]:[esc(depotName(c.depotId).replace(' Empty Container Depot',''))]),c.type,meta(STATUS,c.status),meta(COND,c.condition),meta(DOCST,c.doc),c.zone||'—'],`data-c="${c.ref}"`]),'No containers match.')+
  `<p class="sub">${R.length} containers${R.length>60?' · showing the first 60, narrow with search or filters':''}</p>`);
}
export function bookings(){
 const dep=role()=='depot',B=vis('B'),next=['Accept booking','Start document review','Confirm into storage'];
 return card('Bookings',table(['Booking','Container','Service','Booked by',...(dep?[]:['Depot']),'Progress',''],B.slice(0,80).map(b=>[[`<span class="mono">${b.ref}</span>`,`<span class="mono">${b.containerRef}</span>`,esc(b.service),esc(b.company),...(dep?[]:[esc(depotName(b.depotId).replace(' Empty Container Depot',''))]),
  `${pill(STAGES[b.stage],b.stage==3?'ok':'warn')}<div class="prog" style="margin:8px 0 0"><i style="width:${(b.stage+1)*25}%;background:var(${b.stage==3?'--ok':'--bkd'})"></i></div>`,
  dep&&b.stage<3?`<button class="tbl-btn" data-adv="${b.ref}">${next[b.stage]}</button>`:''],'']),'No bookings yet.'));
}
export function documents(){
 const X=vis('X'),agent=can('transporter','cfagent'),review=can('depot','kma');
 return card('Documents',table(['Document','Container','Booking','Status',''],X.slice(0,100).map(x=>[[DOC_LABELS[x.type]||esc(x.type),`<span class="mono">${x.containerRef}</span>`,x.bookingRef||'—',meta(DOCST,x.status),
  (agent&&['not_submitted','rejected'].includes(x.status)?`<button class="tbl-btn" data-up="${x.id}">${x.status=='rejected'?'Resubmit':'Upload'}</button>`:'')+
  (review&&x.status=='pending_review'?`<button class="tbl-btn" data-rv="${x.id}:1">Verify</button> <button class="tbl-btn" data-rv="${x.id}:0">Reject</button>`:'')],'']),'No documents yet.'));
}
export function surveys(){
 const V=vis('V'),depotSide=can('depot','kma'),lineSide=can('line','kma');
 return card('Joint surveys',table(['Container','Depot','Reason','Status','Updated',''],V.map(v=>[[`<span class="mono">${v.containerRef}</span>`,esc(depotName(v.depotId).replace(' Empty Container Depot','')),esc(v.reason)+(v.mandatory?' ':''),meta(SURVST,v.status),ago(v.t),
  (v.status=='requested'&&depotSide?`<button class="tbl-btn" data-sv="${v.id}">Schedule</button>`:'')+(v.status=='scheduled'&&lineSide?`<button class="tbl-btn" data-sv="${v.id}">Acknowledge</button>`:'')],`data-c="${v.containerRef}"`]),'No joint surveys. Request one from a container.')+
  `<p class="sub">Heavy-damage containers always need a joint survey. Depots schedule it, shipping lines acknowledge it.</p>`);
}
export function escalations(){
 const E=vis('E'),mine=Object.entries(CATS).filter(([,c])=>c.roles.includes(role())),kma=role()=='kma';
 const form=`<div class="form-row-2"><div class="fg"><label>Category</label><select id="ek">${opts(mine.map(([k,c])=>[k,c.label]))}</select></div><div class="fg"><label>Container (optional)</label><input id="ec" placeholder="e.g. MSCU4821374" maxlength="11"></div>${role()=='depot'?'':`<div class="fg"><label>Depot</label><select id="ed">${opts(DEPOTS.map(d=>[d.id,d.name]))}</select></div>`}<div class="fg" style="grid-column:1/-1"><label>What happened?</label><input id="es" maxlength="200" placeholder="Describe the issue"></div></div><button class="action-btn" data-raise>Raise escalation</button>`;
 return card('Raise an escalation',form)+card(kma?'All escalations':'My escalations',table(['Ticket','Category','Raised by','SLA','Priority','Status',...(kma?['']:[])],E.slice(0,80).map(e=>[[`<span class="mono">${e.ref}</span>`,esc(e.category),esc(e.entity),e.sla,meta(PRI,e.pri),pill(e.status=='open'?'Open':'Resolved',e.status=='open'?'warn':'ok'),...(kma?[e.status=='open'?`<button class="tbl-btn" data-res="${e.ref}">Resolve</button>`:'']:[])],'']),'No escalations.'));
}
