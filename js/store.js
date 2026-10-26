/** Application state: seed data, persistence, role-scoped selectors, alerts and audit trail. */
import {KEY,DEPOTS,LINES,CATS,SERVICES,ORIGINS,ROLES,THRESHOLD} from './config.js';
import {mkNo,pct} from './util.js';

export let S;
export const setS=v=>{S=v};
let listener=()=>{};
export const onChange=f=>{listener=f};

export const depot=id=>DEPOTS.find(d=>d.id==id);
export const depotName=id=>depot(id)?.name||'Unknown depot';
export const lineName=id=>LINES.find(l=>l.id==id)?.name||'Unknown line';
export const occupied=id=>S.C.filter(c=>c.depotId==id&&c.status=='in_yard').reduce((a,c)=>a+c.teu,0);
export const zoneOcc=(id,z)=>S.C.filter(c=>c.depotId==id&&c.zone==z&&c.status=='in_yard').reduce((a,c)=>a+c.teu,0);
export const freeTeu=id=>depot(id).cap-occupied(id);
export const zoneFor=(id,teu)=>S.zones[id].find(z=>z.cap-zoneOcc(id,z.name)>=teu);

export function entity(){const s=S.session;return s.role=='kma'?ROLES.kma.label:s.role=='line'?lineName(s.lineId):s.role=='depot'?depotName(s.depotId):s.company}

/** Records visible to the signed-in role. kind: C containers, B bookings, X documents, V surveys, E escalations. */
export function vis(kind){
 const s=S.session,list=S[kind];
 if(s.role=='kma')return list;
 if(kind=='E')return list.filter(e=>e.role==s.role&&e.entity==entity());
 if(s.role=='line')return list.filter(i=>i.lineId==s.lineId);
 if(s.role=='depot')return list.filter(i=>i.depotId==s.depotId);
 if(kind=='B')return list.filter(b=>b.company==s.company&&b.role==s.role);
 if(kind=='X'){const mine=new Set(S.B.filter(b=>b.company==s.company).map(b=>b.ref));return list.filter(x=>mine.has(x.bookingRef))}
 return [];
}
export function audit(cat,m){const s=S.session;S.A.unshift({t:Date.now(),role:s?s.role:'system',entity:s?entity():'TRAFCOMS',cat,m});S.A=S.A.slice(0,800)}
export function commit(){save();listener()}
export function save(){try{localStorage.setItem(KEY,JSON.stringify(S));return true}catch(e){return false}}

/** Network alerts for the regulator. Each links to the section that resolves it. */
export function alerts(){
 const out=[];
 DEPOTS.forEach(d=>{const p=pct(occupied(d.id),d.cap);if(p>THRESHOLD)out.push({tone:'bad',go:'cap',m:`${d.name} is at ${p}% of approved capacity`})});
 const heavy=S.C.filter(c=>c.condition=='heavy_damage'&&c.status=='in_yard'&&!S.V.some(v=>v.containerRef==c.ref));
 if(heavy.length)out.push({tone:'bad',go:'ct',m:`${heavy.length} heavy-damage containers have no joint survey`});
 const rej=S.X.filter(x=>x.status=='rejected').length;if(rej)out.push({tone:'warn',go:'doc',m:`${rej} documents were rejected and need resubmission`});
 const urg=S.E.filter(e=>e.status=='open'&&e.pri=='urgent').length;if(urg)out.push({tone:'bad',go:'esc',m:`${urg} urgent escalations are open`});
 const pend=S.X.filter(x=>x.status=='pending_review').length;if(pend)out.push({tone:'info',go:'doc',m:`${pend} documents await review`});
 return out;
}

function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function seed(){
 const r=rng(11),pick=a=>a[Math.floor(r()*a.length)],now=Date.now(),C=[],B=[],X=[],V=[],E=[],A=[];let n=410000;
 const zones={},zo={};
 DEPOTS.forEach(d=>{zones[d.id]=[['Zone A',.4],['Zone B',.35],['Zone C',.25]].map(([name,f])=>({name,cap:Math.round(d.cap*f)}))});
 const mk=(d,ln,status)=>{const teu=r()<.6?1:2,x=r(),y=r();return{ref:mkNo(ln.prefix,n+=17+Math.floor(r()*90)),depotId:d.id,lineId:ln.id,teu,type:teu==1?'20GP':'40HC',status,zone:null,
  condition:x<.78?'full_grade':x<.86?'under_repair':x<.95?'damaged':'heavy_damage',
  doc:status=='in_yard'?(y<.75?'verified':y<.9?'pending_review':'rejected'):status=='released'?'verified':'not_submitted',t:now-r()*864e5*20}};
 DEPOTS.forEach(d=>{const target=d.cap*(.45+r()*.52);let occ=0,tries=0;
  while(occ<target&&tries++<500){const c=mk(d,pick(LINES),'in_yard'),z=zones[d.id].find(z=>(zo[d.id+z.name]||0)+c.teu<=z.cap);if(!z)continue;c.zone=z.name;zo[d.id+z.name]=(zo[d.id+z.name]||0)+c.teu;occ+=c.teu;C.push(c)}
  for(let i=0;i<4;i++)C.push(mk(d,pick(LINES),pick(['pending_docs','pending_docs','released','in_transit'])))});
 const cos=[['transporter','Coastline Haulage Ltd'],['transporter','Bahari Transporters'],['cfagent','Acme Logistics Ltd'],['cfagent','Swift Clearing & Forwarding']];
 C.filter(c=>c.status=='pending_docs').forEach((c,i)=>{const [role,company]=pick(cos),service=pick(Object.keys(SERVICES)),stage=Math.floor(r()*3),ref='BK-'+(5100+i);c.bookingRef=ref;
  B.push({ref,role,company,service,containerRef:c.ref,depotId:c.depotId,lineId:c.lineId,origin:pick(ORIGINS),stage,t:now-r()*864e5*6});
  SERVICES[service].forEach(type=>X.push({id:'DOC-'+(X.length+1),type,containerRef:c.ref,bookingRef:ref,depotId:c.depotId,lineId:c.lineId,status:stage==0?'not_submitted':stage==1?'pending_review':pick(['verified','pending_review','rejected']),t:now-r()*864e5*3}))});
 C.filter(c=>c.condition=='heavy_damage'&&c.status=='in_yard'&&r()<.7).forEach((c,i)=>V.push({id:'SV-'+(i+1),containerRef:c.ref,depotId:c.depotId,lineId:c.lineId,reason:'Mandatory: heavy damage',mandatory:true,status:pick(['requested','scheduled','acknowledged']),t:now-r()*864e5*8}));
 C.filter(c=>c.condition=='damaged'&&c.status=='in_yard'&&r()<.3).forEach(c=>V.push({id:'SV-'+(V.length+1),containerRef:c.ref,depotId:c.depotId,lineId:c.lineId,reason:'Condition disputed',mandatory:false,status:pick(['requested','scheduled']),t:now-r()*864e5*5}));
 const who=role=>role=='kma'?ROLES.kma.label:role=='line'?pick(LINES).name:role=='depot'?pick(DEPOTS).name:pick(cos.filter(c=>c[0]==role))[1];
 for(let i=0;i<12;i++){const key=pick(Object.keys(CATS)),cat=CATS[key],role=pick(cat.roles),entity=who(role);
  E.push({ref:'ESC-2026-'+String(i+1).padStart(4,'0'),role,entity,key,category:cat.label,desk:cat.desk,sla:cat.sla,pri:cat.pri,subject:cat.label,containerRef:'',depotId:pick(DEPOTS).id,status:r()<.7?'open':'resolved',t:now-r()*864e5*7})}
 E.forEach(e=>A.push({t:e.t,role:e.role,entity:e.entity,cat:'escalation',m:`${e.ref} raised: ${e.category}`}));
 B.forEach(b=>A.push({t:b.t,role:b.role,entity:b.company,cat:'booking',m:`${b.ref} submitted for ${b.containerRef}`}));
 A.sort((a,b)=>b.t-a.t);
 return{v:1,zones,C,B,X,V,E,A,session:null,section:null,theme:'light',ui:{f:'all',q:'',depot:'all',rep:'containers',repDepot:''}};
}
export function load(){
 try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v==1&&['C','B','X','V','E','A'].every(k=>Array.isArray(s[k]))&&s.zones)return s}catch(e){}
 return seed();
}
S=load();
