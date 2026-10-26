/** App shell: sign-in, navigation, rendering, container modal and global events. */
import {S,setS,seed,onChange,commit,entity,alerts,depotName,lineName} from './store.js';
import {ROLES,NAV,DEPOTS,LINES,STATUS,COND,DOCST,STAGES} from './config.js';
import {$,esc,day,dl} from './util.js';
import {ic,toast,ov,closeAll,pill,meta,opts} from './ui.js';
import {VIEWS} from './views/index.js';
import {buildReport} from './views/kma.js';
import * as act from './actions.js';

const THEME='trafcoms-theme';
const initials=s=>String(s).split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'TR';

/* ---------- sign-in ---------- */
function loginForm(){
 const sel=$('#lr');if(!sel.options.length)sel.innerHTML=opts(Object.entries(ROLES).map(([k,r])=>[k,r.label]),'kma');
 const r=ROLES[sel.value],c=r.ctx;
 $('#lctx').innerHTML=c=='line'?`<label>Shipping line</label><select id="cx">${opts(LINES.map(l=>[l.id,l.name]))}</select>`:c=='depot'?`<label>Depot</label><select id="cx">${opts(DEPOTS.map(d=>[d.id,d.name]))}</select>`:c=='company'?`<label>Company name</label><input id="cx" maxlength="60" placeholder="Your company">`:'';
 $('#lblurb').textContent=r.desc;
}
function signIn(){
 const role=$('#lr').value,ctx=ROLES[role].ctx,v=$('#cx')?$('#cx').value.trim():'';
 if(ctx=='company'&&v.length<2){$('#loginError').textContent='Enter your company name.';$('#loginError').classList.add('show');return}
 S.session={role,lineId:ctx=='line'?v:null,depotId:ctx=='depot'?v:null,company:ctx=='company'?v:null};
 S.section=NAV[role][0][0];S.ui.f='all';S.ui.q='';S.ui.depot='all';commit();
}

/* ---------- shell ---------- */
function shell(){
 const s=S.session,on=!!s;
 $('#loginScreen').style.display=on?'none':'flex';$('#shell').style.display=on?'flex':'none';
 const dark=S.theme=='dark';document.documentElement.setAttribute('data-theme',dark?'dark':'light');
 document.querySelector('.theme-icon-sun').style.display=dark?'':'none';document.querySelector('.theme-icon-moon').style.display=dark?'none':'';
 if(!on)return loginForm();
 const r=ROLES[s.role],cur=NAV[s.role].find(n=>n[0]==S.section)||NAV[s.role][0];
 $('#sbLabel').textContent=r.label;
 $('#sbNav').innerHTML=NAV[s.role].map(([id,t,i])=>`<button class="nav-item ${id==cur[0]?'active':''}" data-v="${id}">${ic(i)}${t}</button>`).join('');
 $('#railUserAv').textContent=initials(entity());$('#railUserName').textContent=entity();$('#railUserRole').textContent=r.label;
 $('#userMenuHeader').innerHTML=`<div class="user-menu-header-name">${esc(entity())}</div><div class="user-menu-header-role">${r.label}</div>`;
 $('#topbarArea').textContent=r.label;$('#topbarTitle').textContent=cur[1];$('#secTitle').textContent=cur[1];
 $('#topbarRoleChip').textContent=r.tag;$('#todayDate').textContent=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
 $('#secActs').innerHTML=['transporter','cfagent'].includes(s.role)&&cur[0]!='new'?`<button class="action-btn" data-v="new">${s.role=='cfagent'?'Submit booking':'Book storage'}</button>`:'';
 const A=s.role=='kma'?alerts():[];$('#alertDot').style.display=A.length?'':'none';
 $('#alertsList').innerHTML=A.map(a=>`<div class="alert-item ${a.tone=='bad'?'crit':'warn'}" data-go="${a.go}" style="cursor:pointer">${a.m}</div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No alerts</div></div>';
 document.body.classList.remove('sidebar-open');
}
export function render(){
 try{shell();const s=S.session;if(!s)return;
  const fn=VIEWS[s.role][S.section]||VIEWS[s.role].ov;$('#v').innerHTML=fn();
 }catch(e){console.error(e);toast('This page could not be drawn. Your data is safe. Try another section.','error')}
}
function clock(){const e=$('#liveTime');if(e)e.textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Nairobi'})}
setInterval(clock,15000);clock();

/* ---------- container modal ---------- */
function containerModal(ref){
 const c=S.C.find(x=>x.ref==ref);if(!c)return;const s=S.session,B=S.B.find(b=>b.ref==c.bookingRef),V=S.V.filter(v=>v.containerRef==ref);
 const canSurvey=['kma','depot','line'].includes(s.role)&&!V.some(v=>v.status!='acknowledged');
 ov(`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${meta(STATUS,c.status)}${meta(COND,c.condition)}${meta(DOCST,c.doc)}</div>
 <div class="detail-row" style="margin-bottom:8px"><b>${c.type}</b> · ${c.teu} TEU · ${esc(lineName(c.lineId))}</div>
 <p class="sub">${esc(depotName(c.depotId))}${c.zone?' · '+c.zone:''}</p>
 ${B?`<p style="margin-top:12px">Booking <span class="mono">${B.ref}</span> · ${pill(STAGES[B.stage],B.stage==3?'ok':'warn')} · ${esc(B.company)}</p>`:''}
 ${c.condition=='heavy_damage'?`<div class="alert-item crit" style="margin-top:12px">Heavy damage: a joint survey is mandatory.</div>`:''}
 <h4 style="margin:16px 0 6px">Joint surveys</h4>${V.map(v=>`<p class="sub">${v.id} · ${esc(v.reason)} · ${v.status}</p>`).join('')||'<p class="sub">None on record.</p>'}
 ${canSurvey?`<div style="margin-top:16px"><button class="modal-btn primary" data-survey="${c.ref}">Request joint survey</button></div>`:''}`,c.ref);
}

/* ---------- events ---------- */
const done=(r,msg)=>r.error?toast(r.error,'error'):msg&&toast(msg);
const val=id=>$('#'+id)?.value??'';
document.addEventListener('click',e=>{
 const t=e.target.closest('button,tr,[data-go],[data-a],.user-menu-item');
 if(e.target.id=='modalOverlay')return closeAll();
 if(!e.target.closest('.user-chip-rail,.user-menu'))$('#userMenu').style.display='none';
 if(!t)return;const d=t.dataset;
 if(d.a=='login')return signIn();
 if(d.a=='closemodal')return closeAll();
 if(d.a=='sidebar')return document.body.classList.toggle('sidebar-open');
 if(d.a=='alerts')return $('#alertsPanel').classList.toggle('open');
 if(d.a=='usermenu'){const m=$('#userMenu');return m.style.display=m.style.display=='none'?'block':'none'}
 if(d.a=='theme'){S.theme=S.theme=='dark'?'light':'dark';try{localStorage.setItem(THEME,S.theme)}catch(x){}return commit()}
 if(d.a=='out'){S.session=null;S.section=null;$('#userMenu').style.display='none';return commit()}
 if(d.a=='resetdemo'){if(confirm('Restore the demo data? Your changes will be lost.')){const k={session:S.session,section:S.section,theme:S.theme};setS(Object.assign(seed(),k));commit()}return}
 if(d.v){S.section=d.v;$('#alertsPanel').classList.remove('open');commit()}else if(d.go){S.section=d.go;$('#alertsPanel').classList.remove('open');commit()}
 else if(d.c)containerModal(d.c);
 else if(d.adv)done(act.advance(d.adv),'Booking updated');
 else if(d.up)done(act.uploadDoc(d.up),'Document uploaded for review');
 else if(d.rv){const [id,ok]=d.rv.split(':');done(act.reviewDoc(id,ok=='1'),ok=='1'?'Document verified':'Document rejected')}
 else if(d.sv)done(act.stepSurvey(d.sv),'Survey updated');
 else if(d.res)done(act.resolveEsc(d.res),'Escalation resolved');
 else if(d.survey){const c=S.C.find(x=>x.ref==d.survey);closeAll();done(act.requestSurvey(d.survey,c.condition=='heavy_damage'?'Mandatory: heavy damage':'Condition disputed'),'Joint survey requested')}
 else if(d.uf!==undefined){S.ui.f=d.uf;commit()}
 else if(d.umin!==undefined){S.ui.min=+d.umin;commit()}
 else if(d.book){S.ui.bookDepot=d.book;S.section='new';commit()}
 else if(d.raise!==undefined){const r=act.raise({key:val('ek'),container:val('ec'),depotId:val('ed'),subject:val('es')});done(r,r.ok&&'Escalation '+r.ok+' raised')}
 else if(d.submit!==undefined){const r=act.submitBooking({service:val('bs'),depotId:val('bd'),container:val('bc'),lineId:val('bl'),teu:+val('bt'),origin:val('bo')});if(r.error)toast(r.error,'error');else{toast('Booking '+r.ok+' submitted');S.section='bk';commit()}}
 else if(d.report!==undefined){S.ui.rep=val('rt');S.ui.repDepot=val('rd');const [n,text,rows]=buildReport(S.ui.rep,S.ui.repDepot);dl(`trafcoms-${n}-${day()}.csv`,text);toast(`Exported ${rows} rows`)}
});
document.addEventListener('change',e=>{const el=e.target;if(el.id=='lr')loginForm();else if(el.dataset.udepot!==undefined){S.ui.depot=el.value;commit()}else if(el.id=='rt'||el.id=='rd'){S.ui.rep=val('rt');S.ui.repDepot=val('rd');commit()}});
document.addEventListener('input',e=>{if(!['q','aq'].includes(e.target.id))return;S.ui[e.target.id]=e.target.value.slice(0,60);const id=e.target.id,p=e.target.selectionStart;render();const n=$('#'+id);n.focus();n.setSelectionRange(p,p)});
document.addEventListener('keydown',e=>{if(e.key=='Escape'){closeAll();$('#alertsPanel')?.classList.remove('open')}});
addEventListener('error',()=>toast('Something unexpected happened. Your data is safe.','error'));
try{const t=localStorage.getItem(THEME);if(t)S.theme=t}catch(e){}
onChange(render);
render();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
