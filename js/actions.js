/** Operations that change data. Each validates first, writes an audit entry, then commits. Returns {error} or {ok}. */
import {SERVICES,CATS,DOC_LABELS,STAGES,ROLES} from './config.js';
import {S,audit,commit,depotName,freeTeu,zoneFor,entity} from './store.js';
import {norm,validNo} from './util.js';

const fail=error=>({error});
const nextNo=(list,p,w)=>p+String(Math.max(0,...list.map(i=>+String(i.ref||i.id).replace(/\D/g,'')||0))+1).padStart(w,'0');

export function submitBooking(f){
 const ref=norm(f.container),s=S.session;
 if(!SERVICES[f.service])return fail('Choose a service type.');
 if(!validNo(ref))return fail('That container number is not valid. Check the four letters and the final check digit.');
 const live=S.C.find(c=>c.ref==ref&&(c.status=='in_yard'||c.status=='pending_docs'));
 if(live)return fail(ref+' is already booked or in a depot.');
 if(!f.depotId||!f.lineId)return fail('Choose a depot and a shipping line.');
 if(!f.origin)return fail('Choose where the container is coming from.');
 const teu=f.teu==2?2:1;
 if(teu>freeTeu(f.depotId))return fail(depotName(f.depotId)+' does not have room for '+teu+' TEU right now. Choose another depot.');
 const bref='BK-'+(Math.max(5099,...S.B.map(b=>+b.ref.slice(3)||0))+1);
 S.C.unshift({ref,depotId:f.depotId,lineId:f.lineId,teu,type:teu==1?'20GP':'40HC',status:'pending_docs',zone:null,condition:'full_grade',doc:'not_submitted',bookingRef:bref,t:Date.now()});
 S.B.unshift({ref:bref,role:s.role,company:s.company,service:f.service,containerRef:ref,depotId:f.depotId,lineId:f.lineId,origin:f.origin,stage:0,t:Date.now()});
 SERVICES[f.service].forEach(type=>S.X.push({id:nextNo(S.X.map(x=>({ref:x.id})),'DOC-',1),type,containerRef:ref,bookingRef:bref,depotId:f.depotId,lineId:f.lineId,status:'not_submitted',t:Date.now()}));
 audit('booking',`${bref} submitted for ${ref} at ${depotName(f.depotId)}`);commit();return{ok:bref};
}
/** Depot moves a booking forward. Confirming checks documents and capacity. */
export function advance(ref){
 const b=S.B.find(x=>x.ref==ref);if(!b)return fail('Booking not found.');
 const docs=S.X.filter(x=>x.bookingRef==ref),c=S.C.find(x=>x.ref==b.containerRef);
 if(b.stage==0){b.stage=1;audit('booking',`${ref} accepted by ${depotName(b.depotId)}`)}
 else if(b.stage==1){if(docs.some(x=>x.status=='not_submitted'||x.status=='rejected'))return fail('Every required document must be uploaded first.');b.stage=2;audit('booking',`${ref} moved to document review`)}
 else if(b.stage==2){
  if(docs.some(x=>x.status!='verified'))return fail('Every required document must be verified before confirming.');
  const z=zoneFor(b.depotId,c.teu);if(!z)return fail('No zone has room for '+c.teu+' TEU. Raise a capacity escalation.');
  c.status='in_yard';c.zone=z.name;c.doc='verified';b.stage=3;
  S.X.push({id:nextNo(S.X.map(x=>({ref:x.id})),'DOC-',1),type:'interchange',containerRef:c.ref,bookingRef:ref,depotId:b.depotId,lineId:b.lineId,status:'verified',t:Date.now()});
  audit('booking',`${ref} confirmed: ${c.ref} stored in ${z.name}`)}
 else return fail('This booking is already confirmed.');
 commit();return{ok:true};
}
export function uploadDoc(id){const x=S.X.find(d=>d.id==id);if(!x||!['not_submitted','rejected'].includes(x.status))return fail('Nothing to upload.');x.status='pending_review';x.t=Date.now();audit('document',`${DOC_LABELS[x.type]} uploaded for ${x.containerRef}`);commit();return{ok:true}}
export function reviewDoc(id,ok){const x=S.X.find(d=>d.id==id);if(!x||x.status!='pending_review')return fail('That document is not awaiting review.');x.status=ok?'verified':'rejected';x.t=Date.now();audit('document',`${DOC_LABELS[x.type]} for ${x.containerRef} ${ok?'verified':'rejected'}`);commit();return{ok:true}}
export function requestSurvey(ref,reason){const c=S.C.find(x=>x.ref==ref);if(!c)return fail('Container not found.');if(S.V.some(v=>v.containerRef==ref&&v.status!='acknowledged'))return fail('A joint survey is already open on this container.');
 S.V.unshift({id:nextNo(S.V.map(v=>({ref:v.id})),'SV-',1),containerRef:ref,depotId:c.depotId,lineId:c.lineId,reason:reason||'Requested',mandatory:c.condition=='heavy_damage',status:'requested',t:Date.now()});audit('survey',`Joint survey requested on ${ref}`);commit();return{ok:true}}
export function stepSurvey(id){const v=S.V.find(x=>x.id==id);if(!v||v.status=='acknowledged')return fail('Nothing to update.');v.status=v.status=='requested'?'scheduled':'acknowledged';v.t=Date.now();audit('survey',`Survey ${id} on ${v.containerRef} ${v.status}`);commit();return{ok:true}}
export function raise(f){const cat=CATS[f.key];if(!cat||!cat.roles.includes(S.session.role))return fail('Choose a category.');if(!f.subject||f.subject.trim().length<5)return fail('Describe the issue in at least 5 characters.');
 const e={ref:'ESC-2026-'+String(Math.max(0,...S.E.map(x=>+x.ref.slice(-4)))+1).padStart(4,'0'),role:S.session.role,entity:entity(),key:f.key,category:cat.label,desk:cat.desk,sla:cat.sla,pri:cat.pri,subject:f.subject.trim().slice(0,200),containerRef:norm(f.container),depotId:f.depotId||S.session.depotId||'',status:'open',t:Date.now()};
 S.E.unshift(e);audit('escalation',`${e.ref} raised: ${cat.label}`);commit();return{ok:e.ref}}
export function resolveEsc(ref){const e=S.E.find(x=>x.ref==ref);if(!e||e.status!='open')return fail('Already resolved.');e.status='resolved';audit('escalation',`${ref} resolved`);commit();return{ok:true}}
export const stageLabel=i=>STAGES[i];
