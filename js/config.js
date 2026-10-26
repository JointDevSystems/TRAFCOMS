/** Static configuration: roles, depots, shipping lines, desks, document rules, icons, navigation. */
export const KEY='trafcoms.platform.v1';
export const THRESHOLD=85; // % of approved TEU that triggers a capacity alert
export const ROLES={
 kma:{label:'Kenya Maritime Authority',tag:'Full visibility',ctx:null,desc:'Sees every depot, shipping line, booking, document, escalation and joint survey. The only role that can pull cross-depot reports.'},
 line:{label:'Shipping line',tag:'Own containers only',ctx:'line',desc:'Sees only its own containers and bookings, plus the surveys and documents attached to them.'},
 transporter:{label:'Transporter',tag:'Space and bookings',ctx:'company',desc:'Sees available depot space by zone and books storage. No container or shipping-line detail beyond its own bookings.'},
 cfagent:{label:'Clearing & forwarding agent',tag:'Space and bookings',ctx:'company',desc:'Sees depot space and submits bookings for clients. Required documents are worked out automatically.'},
 depot:{label:'Depot operator',tag:'Own depot only',ctx:'depot',desc:'Sees the bookings, documents and surveys routed to its own yard, and confirms containers into storage.'}};
export const DEPOTS=[['gargo','Gargo Haven','Changamwe',320],['dodwell','Dodwell','Port Reitz',280],['hakika','Hakika','Jomvu Mikanjuni',240],['fortune','Fortune','Miritini',300],['creek','Creek','Port Reitz',220],['noah','Noah','Port Reitz',200],['apmt','APMT','Jomvu',360],['mahadi','Mahadi','Port Reitz',180],['suhara','Suhara','Port Reitz',210],['ubern-link','Ubern Link','Bokole Airport Area',160]]
 .map(([id,n,l,cap])=>({id,name:n+' Empty Container Depot',loc:'Mombasa · '+l,cap}));
export const LINES=[['msc','MSC — Mediterranean Shipping Company','MSCU'],['maersk','Maersk','MAEU'],['cma-cgm','CMA CGM','CMAU'],['hapag','Hapag-Lloyd','HLXU'],['cosco','COSCO Shipping Lines','CSNU'],['evergreen','Evergreen Line','EGHU'],['one','ONE — Ocean Network Express','ONEU'],['pil','PIL — Pacific International Lines','PCIU'],['oocl','OOCL — Orient Overseas Container Line','OOLU'],['wan-hai','Wan Hai Lines','WHSU'],['yang-ming','Yang Ming Marine Transport','YMLU'],['zim','ZIM Integrated Shipping Services','ZIMU']].map(([id,name,prefix])=>({id,name,prefix}));
export const CATS={
 booking_delay:{label:'Delayed booking complaint',sla:'4 business hours',desk:'Depot Operations Desk',pri:'high',roles:['transporter','cfagent']},
 space_check:{label:'Depot space or availability query',sla:'30 minutes',desk:'Depot Operations Desk',pri:'normal',roles:['transporter','cfagent','line','depot']},
 doc_rejected:{label:'Document rejected or verification issue',sla:'4 business hours',desk:'Document Review Desk',pri:'high',roles:['line','cfagent','transporter']},
 guarantee_expiry:{label:'Guarantee form expired or needs revalidation',sla:'4 business hours',desk:'Document Review Desk',pri:'high',roles:['line','cfagent','transporter','depot']},
 survey_dispute:{label:'Joint survey or container condition dispute',sla:'1 business day',desk:'Compliance & Survey Desk',pri:'high',roles:['depot','line','cfagent','transporter']},
 heavy_damage:{label:'Heavy damage: mandatory joint survey',sla:'4 business hours',desk:'Compliance & Survey Desk',pri:'urgent',roles:['depot','line','cfagent','transporter','kma']},
 capacity_breach:{label:'Occupancy above 85% / evacuation needed',sla:'2 business hours',desk:'Compliance & Survey Desk',pri:'urgent',roles:['depot','kma']},
 access_issue:{label:'Account access or login issue',sla:'2 business hours',desk:'Platform Support',pri:'normal',roles:['kma','line','transporter','cfagent','depot']},
 other:{label:'Something else',sla:'1 business day',desk:'General Desk',pri:'normal',roles:['kma','line','transporter','cfagent','depot']}};
export const SERVICES={'Depot storage':['guarantee_form','release_order'],'Port haulage':['release_order','delivery_order'],'Full transport package':['guarantee_form','release_order','delivery_order']};
export const DOC_LABELS={guarantee_form:'Guarantee form',release_order:'Release order',delivery_order:'Delivery order',interchange:'Interchange (EIR)'};
export const ORIGINS=['Mombasa Port (KPA)','APM Terminals Mombasa','Client premises — Nairobi','Client premises — Mombasa'];
export const STAGES=['Submitted','Accepted by depot','Documents under review','Confirmed in storage'];
export const TONE={ok:'--ok',warn:'--bkd',bad:'--dmg',info:'--in',mute:'--out'};
export const STATUS={in_yard:['In yard','ok'],pending_docs:['Pending documents','warn'],released:['Released','info'],in_transit:['In transit','mute']};
export const COND={full_grade:['Full grade','ok'],under_repair:['Under repair','warn'],damaged:['Damaged','bad'],heavy_damage:['Heavy damage','bad']};
export const DOCST={verified:['Verified','ok'],pending_review:['Pending review','warn'],rejected:['Rejected','bad'],not_submitted:['Not submitted','mute']};
export const SURVST={requested:['Requested','warn'],scheduled:['Scheduled','info'],acknowledged:['Acknowledged','ok']};
export const PRI={urgent:['Urgent','bad'],high:['High','warn'],normal:['Normal','mute']};
export const P={ov:"M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",ct:"M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",bk:"M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6",dp:"M3 21V9l9-6 9 6v12M9 21v-7h6v7",doc:"M7 3h8l4 4v14H7zM15 3v4h4M10 13h6M10 17h6",flag:"M5 21V4M5 4h11l-2 4 2 4H5",bell:"M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",chart:"M4 20V10M10 20V4M16 20v-8M22 20H2",log:"M3 12h4l3-8 4 16 3-8h4",plus:"M12 5v14M5 12h14",out:"M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",sun:"M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",moon:"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",rank:"M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"};
const A=[['ov','Overview','ov']],T=[['bk','Bookings','bk'],['doc','Documents','doc']];
export const NAV={
 kma:[['ov','Executive overview','ov'],['cap','Depot capacity','dp'],['ct','Container registry','ct'],['bk','Bookings','bk'],['doc','Documents','doc'],['esc','Escalations','bell'],['sv','Joint surveys','flag'],['score','Depot scorecard','rank'],['rep','Compliance reports','chart'],['aud','Audit log','log']],
 line:[['ov','Overview','ov'],['ct','My containers','ct'],['bk','Booking tracker','bk'],['doc','Documents','doc'],['sv','Joint surveys','flag'],['esc','Escalations','bell']],
 transporter:[['ov','Depot space','dp'],['new','Book storage','plus'],...T,['esc','Escalations','bell']],
 cfagent:[['ov','Depot space','dp'],['new','Submit booking','plus'],...T,['esc','Escalations','bell']],
 depot:[['ov','My yard','dp'],['bk','Bookings','bk'],['doc','Documents','doc'],['sv','Joint surveys','flag'],['ct','Containers','ct'],['esc','Escalations','bell']]};
