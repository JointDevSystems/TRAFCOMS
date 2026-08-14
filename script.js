<<<<<<< HEAD
"use strict";const IDLE_TIMEOUT=9e5,SUPABASE_URL="https://okisjizcyidvvwdwehaa.supabase.co",SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9raXNqaXpjeWlkdnZ3ZHdlaGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTYzNjMsImV4cCI6MjA5ODM5MjM2M30.O_0EeK297a07B7FLunpWr6HDlqrfP5Z8Owyp3qE4hQE",supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);window.ghSupabase=supabase;let state={currentUser:null,profile:null,currentSection:"dashboard",currentAdminSection:null,alertsOpen:!1,db:null,pendingFinanceAction:null,idleTimer:null,lastActivity:Date.now(),sessionTimeout:null,_saveDebounce:null,geoWatchId:null,trackingActive:!1,geoPermission:"unknown",lastGeoSend:0,trackingMap:null,truckMarkers:{},_gmapsLoading:!1,_gmapsCallbacks:[],_trackingChannel:null,_liveSyncChannel:null,geofenceExpanded:new Set};function applyTheme(e){var t=document.documentElement,i="light"===e;i?t.setAttribute("data-theme","light"):t.removeAttribute("data-theme");var n=document.querySelector('meta[name="theme-color"]');n&&n.setAttribute("content",i?"#FBF6E9":"#06080F");var a=document.querySelector("#themeBtn .theme-icon-sun"),o=document.querySelector("#themeBtn .theme-icon-moon");a&&o&&(a.style.display=i?"none":"",o.style.display=i?"":"none");var r=document.getElementById("themeBtn");r&&(r.title=i?"Switch to dark mode":"Switch to light mode")}function toggleTheme(){var e="light"===("light"===document.documentElement.getAttribute("data-theme")?"light":"dark")?"dark":"light";try{localStorage.setItem("gargo-theme",e)}catch(e){}applyTheme(e)}function initTheme(){var e="dark";try{e="light"===localStorage.getItem("gargo-theme")?"light":"dark"}catch(e){}applyTheme(e)}function scrollToTop(){var e=document.querySelector(".content");e&&e.scrollTo({top:0,behavior:"smooth"});var t=document.getElementById("dp_body");t&&t.scrollTo({top:0,behavior:"smooth"}),window.scrollTo({top:0,behavior:"smooth"})}function initScrollToTop(){var e=document.getElementById("scrollTopBtn");if(e){var t=[document.querySelector(".content"),document.getElementById("dp_body"),window].filter(Boolean);t.forEach(function(e){e.addEventListener("scroll",i,{passive:!0})}),i()}function i(){var i;i=0,t.forEach(function(e){var t=e===window?window.scrollY||document.documentElement.scrollTop||0:e.scrollTop;t>i&&(i=t)}),i>360?e.classList.add("visible"):e.classList.remove("visible")}}function defaultBillingRates(){return{"20ft Dry":{base:0,perKm:0},"40ft Dry":{base:0,perKm:0},"40ft HC":{base:0,perKm:0},"20ft Reefer":{base:0,perKm:0},"40ft Reefer":{base:0,perKm:0},"Flat Rack":{base:0,perKm:0},"Open Top":{base:0,perKm:0},Tank:{base:0,perKm:0},Hazmat:{base:0,perKm:0}}}function truckToRow(e){return{id:e.id,reg:e.reg,make:e.make,type:e.type,year:e.year,colour:e.colour,status:e.status,fuel_pct:Math.round(e.fuelPct),mileage:e.mileage,last_service:e.lastService,next_service:e.nextService,notes:e.notes,licence_plate:e.licencePlate,vin:e.vin,img:e.img||"",wialon_unit_id:e.wialonUnitId||null}}function truckFromRow(e){return{id:e.id,reg:e.reg,make:e.make,type:e.type,year:e.year,colour:e.colour,status:e.status,fuelPct:e.fuel_pct,mileage:e.mileage,driver:null,lastService:e.last_service,nextService:e.next_service,notes:e.notes||"",img:e.img||"",licencePlate:e.licence_plate,vin:e.vin||"",wialonUnitId:e.wialon_unit_id||""}}function driverToRow(e){return{id:e.id,name:e.name,phone:e.phone,licence:e.licence,licence_exp:e.licenceExp,status:e.status,truck_id:e.truckId||null,trips_today:e.tripsToday,current_load:e.load,location:e.location,id_no:e.idNo,rating:e.rating,profile_id:e.profileId||null}}function driverFromRow(e){return{id:e.id,name:e.name,phone:e.phone,licence:e.licence,licenceExp:e.licence_exp,status:e.status,truckId:e.truck_id,tripsToday:e.trips_today,load:e.current_load,location:e.location,idNo:e.id_no,rating:e.rating,profileId:e.profile_id||null}}function tripToRow(e){return{id:e.id,truck_id:e.truckId||null,driver_id:e.driverId||null,container:e.container,container_type:e.ctype,work_type:e.workType,outward_type:e.outwardType||null,origin:e.origin,destination:e.dest,shipping_line_id:e.shippingLine||null,status:e.status,start_time:e.startTime,eta:e.eta,distance:e.distance,priority:e.priority,notes:e.notes,reference:e.ref,container_images:JSON.stringify(e.containerImages||[]),booking_id:e.bookingId||null,storage_zone_id:e.storageZoneId||null,storage_teu:e.storageTeu||null,storage_released:!!e.storageReleased,eir_number:e.eirNumber||null,receiving_party:e.receivingParty||null,release_order_no:e.releaseOrderNo||null,vessel:e.vessel||null,voyage:e.voyage||null,date_out:e.dateOut||null,flagged_for_review:!!e.flaggedForReview,flag_reasons:JSON.stringify(e.flagReasons||[]),duplicate_of_id:e.duplicateOfId||null,import_batch_id:e.importBatchId||null}}function tripFromRow(e){let t=[];try{t=e.container_images?JSON.parse(e.container_images):[]}catch(e){t=[]}let i=[];try{i=e.flag_reasons?"string"==typeof e.flag_reasons?JSON.parse(e.flag_reasons):e.flag_reasons:[]}catch(e){i=[]}return{id:e.id,truckId:e.truck_id,driverId:e.driver_id,container:e.container,ctype:e.container_type,workType:e.work_type,outwardType:e.outward_type||null,origin:e.origin,dest:e.destination,shippingLine:e.shipping_line_id,status:e.status,startTime:e.start_time,eta:e.eta,distance:e.distance,priority:e.priority,notes:e.notes,ref:e.reference,containerImages:t,bookingId:e.booking_id||null,storageZoneId:e.storage_zone_id||null,storageTeu:e.storage_teu||null,storageReleased:!!e.storage_released,eirNumber:e.eir_number||"",receivingParty:e.receiving_party||"",releaseOrderNo:e.release_order_no||"",vessel:e.vessel||"",voyage:e.voyage||"",dateOut:e.date_out||null,flaggedForReview:!!e.flagged_for_review,flagReasons:i,duplicateOfId:e.duplicate_of_id||null,importBatchId:e.import_batch_id||null}}document.addEventListener("DOMContentLoaded",initTheme),document.addEventListener("DOMContentLoaded",initScrollToTop);const OUTWARD_TYPES=["Repatriation to Port","Shippers/Export","Sale units"];function isOutwardWorkType(e){return"Depot → Port"===e}function maintToRow(e){return{id:e.id,truck_id:e.truckId||null,type:e.type,description:e.desc,priority:e.priority,status:e.status,date:e.date,cost:e.cost,technician:e.tech,resolved_date:e.resolvedDate}}function maintFromRow(e){return{id:e.id,truckId:e.truck_id,type:e.type,desc:e.description,priority:e.priority,status:e.status,date:e.date,cost:e.cost,tech:e.technician,resolvedDate:e.resolved_date}}function fuelToRow(e){return{id:e.id,truck_id:e.truckId||null,driver_id:e.driverId||null,date:e.date,litres:e.litres,price_per_litre:e.pricePerLitre,station:e.station,odometer:e.odometer,receipt:e.receipt}}function fuelFromRow(e){return{id:e.id,truckId:e.truck_id,driverId:e.driver_id,date:e.date,litres:e.litres,pricePerLitre:e.price_per_litre,station:e.station,odometer:e.odometer,receipt:e.receipt}}function lineToRow(e){return{id:e.id,code:e.code,name:e.name,contact:e.contact,rate_20ft:e.rate20,rate_40ft:e.rate40,rate_hc:e.rateHC,active:e.active}}function lineFromRow(e){return{id:e.id,code:e.code,name:e.name,contact:e.contact,rate20:e.rate_20ft,rate40:e.rate_40ft,rateHC:e.rate_hc,active:e.active}}function vlmFromRow(e){return{id:e.id,pattern:e.pattern,matchType:e.match_type,lineId:e.line_id,priority:e.priority,source:e.source}}function shutoutToRow(e){return{id:e.id,container:e.container,vessel:e.vessel,voyage:e.voyage,line_id:e.line||null,date:e.date,status:e.status,reason:e.reason,truck_id:e.truckId||null,driver_id:e.driverId||null,notes:e.notes}}function shutoutFromRow(e){return{id:e.id,container:e.container,vessel:e.vessel,voyage:e.voyage,line:e.line_id,date:e.date,status:e.status,reason:e.reason,truckId:e.truck_id,driverId:e.driver_id,notes:e.notes}}function icToRow(e){return{id:e.id,container:e.container,line_id:e.line||null,date:e.date,type:e.type,truck_id:e.truck||null,driver_id:e.driver||null,condition:e.condition,notes:e.notes,status:e.status,img:e.img||"",eir_number:e.eirNumber||null,vessel:e.vessel||null,voyage:e.voyage||null,bl_number:e.blNumber||null,ctype:e.ctype||null,repairs:JSON.stringify(e.repairs||[]),repair_total:e.repairTotal||0,survey_id:e.surveyId||null,booking_id:e.bookingId||null,truck_reg_text:e.truckRegText||null,driver_name_text:e.driverNameText||null,needs_survey:!!e.needsSurvey,survey_status:e.surveyStatus||null,surveyed_at:e.surveyedAt||null,surveyed_by:e.surveyedBy||null,delivering_party:e.deliveringParty||null,guarantee_no:e.guaranteeNo||null,cargo_status:e.cargoStatus||null,date_out:e.dateOut||null,receiving_party:e.receivingParty||null,release_order_no:e.releaseOrderNo||null,flagged_for_review:!!e.flaggedForReview,flag_reasons:JSON.stringify(e.flagReasons||[]),duplicate_of_id:e.duplicateOfId||null,import_batch_id:e.importBatchId||null}}function icFromRow(e){let t=[];try{t=e.repairs?"string"==typeof e.repairs?JSON.parse(e.repairs):e.repairs:[]}catch(e){t=[]}let i=[];try{i=e.flag_reasons?"string"==typeof e.flag_reasons?JSON.parse(e.flag_reasons):e.flag_reasons:[]}catch(e){i=[]}return{id:e.id,container:e.container,line:e.line_id,date:e.date,type:e.type,truck:e.truck_id,driver:e.driver_id,condition:e.condition,notes:e.notes,status:e.status,img:e.img||"",eirNumber:e.eir_number||"",vessel:e.vessel||"",voyage:e.voyage||"",blNumber:e.bl_number||"",ctype:e.ctype||"",repairs:t,repairTotal:e.repair_total||0,surveyId:e.survey_id||null,bookingId:e.booking_id||null,truckRegText:e.truck_reg_text||"",driverNameText:e.driver_name_text||"",needsSurvey:!!e.needs_survey,surveyStatus:e.survey_status||null,surveyedAt:e.surveyed_at||null,surveyedBy:e.surveyed_by||null,deliveringParty:e.delivering_party||"",guaranteeNo:e.guarantee_no||"",cargoStatus:e.cargo_status||"",dateOut:e.date_out||null,receivingParty:e.receiving_party||"",releaseOrderNo:e.release_order_no||"",flaggedForReview:!!e.flagged_for_review,flagReasons:i,duplicateOfId:e.duplicate_of_id||null,importBatchId:e.import_batch_id||null}}function reqToRow(e){return{id:e.id,requester:e.requester,requester_id:e.requesterId||null,category:e.category,items:e.items,amount:e.amount,date:e.date,status:e.status,approver:e.approver,approved_date:e.approvedDate,notes:e.notes}}function reqFromRow(e){return{id:e.id,requester:e.requester,requesterId:e.requester_id||null,category:e.category,items:e.items,amount:e.amount,date:e.date,status:e.status,approver:e.approver,approvedDate:e.approved_date,notes:e.notes}}function wsToRow(e){return{id:e.id,truck_id:e.truckId||null,title:e.title,description:e.desc,tech:e.tech,status:e.status,reported:e.reported,diagnosed:e.diagnosed,parts:e.parts,labour:e.labour,total:e.total}}function wsFromRow(e){return{id:e.id,truckId:e.truck_id,title:e.title,desc:e.description,tech:e.tech,status:e.status,reported:e.reported,diagnosed:e.diagnosed,parts:e.parts,labour:e.labour,total:e.total}}function invToRow(e){return{id:e.id,client:e.client,date:e.date,due:e.due,status:e.status,subtotal:e.subtotal,vat:e.vat,total:e.total,paid:e.paid,ref:e.ref,notes:e.notes}}function invFromRow(e){return{id:e.id,client:e.client,date:e.date,due:e.due,status:e.status,subtotal:e.subtotal,vat:e.vat,total:e.total,paid:e.paid,ref:e.ref,notes:e.notes,trips:[]}}function allocToRow(e){return{id:e.id,name:e.name,description:e.desc,weight:e.weight,active:e.active}}function allocFromRow(e){return{id:e.id,name:e.name,desc:e.description,weight:e.weight,active:e.active}}function auditToRow(e){return{username:e.user,action:e.action,detail:e.detail,time:e.time}}async function upsertRows(e,t,i){if(!t||!t.length)return null;const{error:n}=await supabase.from(e).upsert(t,i||{});return n?(console.error(`${e} save failed:`,n.message),{table:e,error:n}):null}async function upsertRowsChunked(e,t,i,n=500){if(!t||!t.length)return null;for(let a=0;a<t.length;a+=n){const o=t.slice(a,a+n),{error:r}=await supabase.from(e).upsert(o,i||{});if(r)return console.error(`${e} save failed (rows ${a}-${a+o.length}):`,r.message),{table:e,error:r,failedFrom:a}}return null}async function syncInvoiceTrips(e){const t=e.map(e=>e.id);if(t.length){const{error:e}=await supabase.from("invoice_trips").delete().in("invoice_id",t);e&&console.error("invoice_trips clear failed:",e.message)}const i=[];if(e.forEach(e=>(e.trips||[]).forEach(t=>i.push({invoice_id:e.id,trip_id:t}))),i.length){const{error:e}=await supabase.from("invoice_trips").insert(i);e&&console.error("invoice_trips save failed:",e.message)}}async function loadDB(){try{const[e,t,i,n,a,o,r,s,d,l,c,p,u,m,v,g,f,y,b]=await Promise.all([supabase.from("trucks").select("*"),supabase.from("drivers").select("*"),supabase.from("trips").select("*"),supabase.from("maintenance").select("*"),supabase.from("fuel_logs").select("*"),supabase.from("shipping_lines").select("*"),supabase.from("shutouts").select("*"),supabase.from("interchange").select("*"),supabase.from("requisitions").select("*"),supabase.from("workshop_jobs").select("*"),supabase.from("invoices").select("*"),supabase.from("invoice_trips").select("*"),supabase.from("billing_rates").select("*"),supabase.from("allocation_rules").select("*"),supabase.from("tracking_positions").select("*"),supabase.from("audit_log").select("*"),supabase.from("app_settings").select("*").eq("id",1).maybeSingle(),supabase.from("profiles").select("*"),supabase.from("vessel_line_map").select("*")]);if(e.error)throw e.error;const h=(e.data||[]).map(truckFromRow),w=(t.data||[]).map(driverFromRow);w.forEach(e=>{if(e.truckId){const t=h.find(t=>t.id===e.truckId);t&&(t.driver=e.id)}});const k=(i.data||[]).map(tripFromRow),_=(n.data||[]).map(maintFromRow),x=(a.data||[]).map(fuelFromRow),$=(o.data||[]).map(lineFromRow),I=(b.data||[]).map(vlmFromRow).sort((e,t)=>e.priority-t.priority),S=(r.data||[]).map(shutoutFromRow),T=(s.data||[]).map(icFromRow),E=(d.data||[]).map(reqFromRow),D=(l.data||[]).map(wsFromRow),R=(c.data||[]).map(invFromRow),L={};(p.data||[]).forEach(e=>{(L[e.invoice_id]=L[e.invoice_id]||[]).push(e.trip_id)}),R.forEach(e=>{e.trips=L[e.id]||[]});const C={};(u.data||[]).forEach(e=>{C[e.ctype]={base:e.base,perKm:e.per_km}});const B=(m.data||[]).map(allocFromRow),A={};(v.data||[]).forEach(e=>{A[e.truck_id]={lat:e.lat,lng:e.lng,speed:e.speed,heading:e.heading,zone:e.zone,lastUpdate:e.last_update,source:e.source||"driver_app"}});const O=(g.data||[]).map(e=>({id:e.id,user:e.username,action:e.action,detail:e.detail,time:e.time,_saved:!0})).sort((e,t)=>new Date(t.time)-new Date(e.time)),M=f.data,z=M?{backupDate:M.backup_date,mapApiKey:M.map_api_key||"",whatsapp:!!M.whatsapp,mpesa:!!M.mpesa,companyName:M.company_name||"Gargo Logistics Ltd",invoiceConfig:M.invoice_config||null,wialonEnabled:!!M.wialon_enabled,wialonToken:M.wialon_token||"",wialonHost:M.wialon_host||"https://hst-api.wialon.com"}:{backupDate:null,mapApiKey:"",whatsapp:!0,mpesa:!1,companyName:"Gargo Logistics Ltd",invoiceConfig:null,wialonEnabled:!1,wialonToken:"",wialonHost:"https://hst-api.wialon.com"},N=(y.data||[]).map(e=>({id:e.id,name:e.name,username:e.username,email:e.email,role:e.role,active:e.active,created:e.created_at||e.created||(new Date).toISOString(),lastLogin:e.last_login||null,navSections:Array.isArray(e.nav_sections)?e.nav_sections:null,adminSections:Array.isArray(e.admin_sections)?e.admin_sections:null}));return{trucks:h,drivers:w,trips:k,maintenance:_,fuel:x,shippingLines:$,shutouts:S,interchange:T,requisitions:E,workshop:D,invoices:R,billingRates:C,allocationRules:B,trackingPositions:A,auditLog:O,settings:z,profiles:N,vesselLineMap:I}}catch(e){return console.warn("Failed to load from Supabase:",e),null}}async function saveDB(){if(!state.db)return{ok:!0,failures:[]};const e=state.db,t=[];try{t.push(await upsertRows("shipping_lines",e.shippingLines.map(lineToRow))),t.push(await upsertRows("trucks",e.trucks.map(truckToRow))),t.push(await upsertRows("drivers",e.drivers.map(driverToRow))),t.push(await upsertRowsChunked("trips",e.trips.map(tripToRow))),t.push(await upsertRows("maintenance",e.maintenance.map(maintToRow))),t.push(await upsertRows("fuel_logs",e.fuel.map(fuelToRow))),t.push(await upsertRows("shutouts",e.shutouts.map(shutoutToRow)));const i=(e.interchange||[]).filter(e=>e._dirty);if(i.length){const e=await upsertRowsChunked("interchange",i.map(icToRow));e?t.push(e):i.forEach(e=>{delete e._dirty})}t.push(await upsertRows("requisitions",e.requisitions.map(reqToRow))),t.push(await upsertRows("workshop_jobs",e.workshop.map(wsToRow))),t.push(await upsertRows("invoices",e.invoices.map(invToRow))),await syncInvoiceTrips(e.invoices);const n=Object.entries(e.billingRates||{}).map(([e,t])=>({ctype:e,base:t.base,per_km:t.perKm}));t.push(await upsertRows("billing_rates",n,{onConflict:"ctype"})),t.push(await upsertRows("allocation_rules",e.allocationRules.map(allocToRow)));const a=Object.entries(e.trackingPositions||{}).map(([e,t])=>({truck_id:e,lat:t.lat,lng:t.lng,speed:t.speed,heading:t.heading,zone:t.zone,last_update:t.lastUpdate,source:t.source||"driver_app"}));t.push(await upsertRows("tracking_positions",a,{onConflict:"truck_id"}));const o=(e.auditLog||[]).filter(e=>!e._saved);if(o.length){const{error:e}=await supabase.from("audit_log").insert(o.map(auditToRow));e?(console.error("audit_log save failed:",e.message),t.push({table:"audit_log",error:e})):o.forEach(e=>{e._saved=!0})}if(e.settings){const i={id:1,company_name:e.settings.companyName,backup_date:e.settings.backupDate,map_api_key:e.settings.mapApiKey,whatsapp:e.settings.whatsapp,mpesa:e.settings.mpesa,invoice_config:e.settings.invoiceConfig||null,wialon_enabled:!!e.settings.wialonEnabled,wialon_token:e.settings.wialonToken||null,wialon_host:e.settings.wialonHost||"https://hst-api.wialon.com"};let{error:n}=await supabase.from("app_settings").upsert(i,{onConflict:"id"});n&&/invoice_config/i.test(n.message||"")&&(delete i.invoice_config,({error:n}=await supabase.from("app_settings").upsert(i,{onConflict:"id"}))),n&&(console.error("app_settings save failed:",n.message),t.push({table:"app_settings",error:n}))}}catch(e){return console.warn("Unable to save to Supabase:",e),toast("Could not save data. Check network.","warning",4e3),{ok:!1,failures:[{table:"_unknown",error:e}]}}const i=t.filter(Boolean);if(i.length){const e=i.map(e=>e.table).join(", ");return console.error("Save completed with errors in:",e,i),toast(`Some changes didn't save (${e}) — please retry or check your connection`,"error",5e3),{ok:!1,failures:i}}return{ok:!0,failures:[]}}function scheduleSave(){state._saveDebounce&&clearTimeout(state._saveDebounce),state._saveDebounce=setTimeout(()=>{saveDB(),state._saveDebounce=null},300)}function saveNowAwaited(){return state._saveDebounce&&(clearTimeout(state._saveDebounce),state._saveDebounce=null),saveDB()}function remapSeedIds(e){const t={trucks:new Map,drivers:new Map,trips:new Map,shippingLines:new Map,invoices:new Map},i=(e,t)=>(e||[]).forEach(e=>{const i=uid();t&&t.set(e.id,i),e.id=i});i(e.shippingLines,t.shippingLines),i(e.trucks,t.trucks),i(e.drivers,t.drivers),i(e.trips,t.trips),i(e.invoices,t.invoices),[e.maintenance,e.fuel,e.shutouts,e.interchange,e.requisitions,e.workshop,e.profiles,e.auditLog,e.allocationRules].forEach(e=>i(e,null)),e.drivers.forEach(e=>{e.truckId=e.truckId&&t.trucks.get(e.truckId)||null}),e.trucks.forEach(e=>{e.driver=e.driver&&t.drivers.get(e.driver)||null}),e.trips.forEach(e=>{e.truckId=e.truckId&&t.trucks.get(e.truckId)||null,e.driverId=e.driverId&&t.drivers.get(e.driverId)||null,e.shippingLine=e.shippingLine&&t.shippingLines.get(e.shippingLine)||null}),e.maintenance.forEach(e=>{e.truckId=e.truckId&&t.trucks.get(e.truckId)||null}),e.fuel.forEach(e=>{e.truckId=e.truckId&&t.trucks.get(e.truckId)||null,e.driverId=e.driverId&&t.drivers.get(e.driverId)||null}),e.shutouts.forEach(e=>{e.line=e.line&&t.shippingLines.get(e.line)||null,e.truckId=e.truckId&&t.trucks.get(e.truckId)||null,e.driverId=e.driverId&&t.drivers.get(e.driverId)||null}),e.interchange.forEach(e=>{e.line=e.line&&t.shippingLines.get(e.line)||null,e.truck=e.truck&&t.trucks.get(e.truck)||null,e.driver=e.driver&&t.drivers.get(e.driver)||null}),e.workshop.forEach(e=>{e.truckId=e.truckId&&t.trucks.get(e.truckId)||null}),e.requisitions.forEach(e=>{t.drivers.has(e.requester)&&(e.requester=t.drivers.get(e.requester))}),e.invoices.forEach(e=>{e.trips=(e.trips||[]).map(e=>t.trips.get(e)).filter(Boolean)});const n={};return Object.entries(e.trackingPositions||{}).forEach(([e,i])=>{const a=t.trucks.get(e);a&&(n[a]=i)}),e.trackingPositions=n,e}async function clearAllTables(){const e=async(e,t)=>{const{error:i}=await supabase.from(e).delete().not(t,"is",null);i&&console.error(`${e} clear failed:`,i.message)};await e("booking_documents","id"),await e("depot_surveys","id");{const{error:e}=await supabase.from("depot_block_slots").update({booking_id:null,trip_id:null,container:null,condition_status:"empty",released_at:(new Date).toISOString()}).or("booking_id.not.is.null,trip_id.not.is.null,container.not.is.null");e&&console.error("depot_block_slots reset failed:",e.message)}await e("invoice_trips","invoice_id"),await e("invoices","id"),await e("audit_log","id"),await e("tracking_positions","truck_id"),await e("allocation_rules","id"),await e("billing_rates","ctype"),await e("workshop_jobs","id"),await e("requisitions","id"),await e("interchange","id"),await e("shutouts","id"),await e("fuel_logs","id"),await e("maintenance","id"),await e("trips","id"),await e("public_bookings","id");{const{error:e}=await supabase.from("depot_storage_zones").update({occupied_teu:0});e&&console.error("depot_storage_zones reset failed:",e.message)}await e("drivers","id"),await e("trucks","id");{const{error:e}=await supabase.from("depot_storage_zones").update({shipping_line_id:null}).not("id","is",null);e&&console.error("depot_storage_zones link clear failed:",e.message)}await e("shipping_lines","id")}async function initDB(){const e=await loadDB();state.db=e||{trucks:[],drivers:[],trips:[],maintenance:[],fuel:[],shippingLines:[],shutouts:[],interchange:[],requisitions:[],workshop:[],invoices:[],billingRates:defaultBillingRates(),allocationRules:[],trackingPositions:{},auditLog:[],settings:{},profiles:[]},state.db.settings||(state.db.settings={backupDate:null,mapApiKey:"",whatsapp:!0,mpesa:!1,companyName:"Gargo Logistics Ltd",invoiceConfig:null,wialonEnabled:!1,wialonToken:"",wialonHost:"https://hst-api.wialon.com"}),state.db.billingRates&&Object.keys(state.db.billingRates).length||(state.db.billingRates=defaultBillingRates())}function uid(e="ID"){return window.crypto&&window.crypto.randomUUID?window.crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,e=>{const t=16*Math.random()|0;return("x"===e?t:3&t|8).toString(16)})}function fmt(e){return Number(e).toLocaleString("en-KE")}function fmtKsh(e,t=!1){return t?'<span class="money-mask">KSh ••••••</span>':`KSh ${fmt(e)}`}function timeAgo(e){const t=(Date.now()-new Date(e).getTime())/1e3;return t<60?`${Math.round(t)}s ago`:t<3600?`${Math.round(t/60)}m ago`:t<86400?`${Math.round(t/3600)}h ago`:`${Math.round(t/86400)}d ago`}function fmtTime(e){return new Date(e).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}function fmtDate(e){return new Date(e).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"})}function sbadge(e){return`<span class="sbadge s-${e}">${{available:"Available",on_trip:"On Trip",maintenance:"Maintenance",breakdown:"Breakdown",off_duty:"Off Duty",grounded:"Grounded",active:"Active",completed:"Completed",delayed:"Delayed",pending:"Pending",approved:"Approved",rejected:"Rejected",fulfilled:"Fulfilled",overdue:"Overdue",draft:"Draft",sent:"Sent",paid:"Paid",partial:"Partial",critical:"Critical",in_progress:"In Progress",reported:"Reported",diagnosed:"Diagnosed",suspended:"Suspended",reconciled:"Reconciled",open:"Open",resolved:"Resolved",redelivery:"Redelivery",loaded:"Loaded",offloaded:"Offloaded"}[e]||e}</span>`}function esc(e){return String(null==e?"":e).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[e]))}function truckName(e){if(!e)return"—";const t=state.db.trucks.find(t=>t.id===e);return t?`${t.reg} · ${t.make}`:e}function driverName(e){if(!e)return"—";const t=state.db.drivers.find(t=>t.id===e);return t?t.name:e}function lineName(e){if(!e)return"—";const t=state.db.shippingLines.find(t=>t.id===e);return t?`${t.code} — ${t.name}`:e}function normVessel(e){return(e||"").trim().toUpperCase().replace(/\s+/g," ")}function resolveLineIdFromVessel(e){const t=normVessel(e);if(!t)return null;const i=state.db.vesselLineMap||[];for(const e of i){const i=normVessel(e.pattern);if(i){if("prefix"===e.matchType&&t.startsWith(i))return e.lineId;if("contains"===e.matchType&&t.includes(i))return e.lineId;if("exact"===e.matchType&&t===i)return e.lineId}}return null}function initials(e){return e?e.split(" ").map(e=>e[0]).join("").slice(0,2).toUpperCase():"?"}function fuelColour(e){return e>60?"var(--green)":e>30?"var(--amber)":"var(--red)"}function isAdmin(){return"admin"===state.profile?.role}function isDriver(){return"driver"===state.profile?.role}function isClerk(){return"clerk"===state.profile?.role}function isDispatch(){return"dispatch"===state.profile?.role}function currentRole(){return state.profile?.role||"viewer"}function clearReviewFlag(e,t){const i=("trips"===e?state.db.trips:state.db.interchange).find(e=>e.id===t);i&&(i.flaggedForReview=!1,i._dirty=!0,scheduleSave(),toast("Marked as reviewed","success"),"trips"===e?renderTrips(_tripFilter||"all"):renderInterchange(_icFilter||"all"))}const TERMINAL_TRIP_STATUSES=["completed"];function isTripLive(e){return!TERMINAL_TRIP_STATUSES.includes(e.status)}function findLiveTripByContainer(e,t){if(!e)return null;const i=e.trim().toUpperCase();return state.db.trips.find(e=>e.id!==t&&isTripLive(e)&&(e.container||"").toUpperCase()===i)||null}const ISO6346_LETTER_VALUES={A:10,B:12,C:13,D:14,E:15,F:16,G:17,H:18,I:19,J:20,K:21,L:23,M:24,N:25,O:26,P:27,Q:28,R:29,S:30,T:31,U:32,V:34,W:35,X:36,Y:37,Z:38};function iso6346CheckDigit(e){let t=0;for(let i=0;i<10;i++){const n=e[i],a=/[0-9]/.test(n)?parseInt(n,10):ISO6346_LETTER_VALUES[n];if(void 0===a)return null;t+=a*Math.pow(2,i)}const i=t%11;return 10===i?0:i}function containerFormatIssue(e){const t=(e||"").trim().toUpperCase();if(!t)return"Container number is required";if(11!==t.length)return`Must be 11 characters (owner code + serial + check digit) — got ${t.length}`;if(!/^[A-Z]{3}/.test(t))return"First 3 characters must be letters (owner code)";if(!/^[A-Z]{3}[UJZ]/.test(t))return"4th character must be U, J, or Z (equipment category)";if(!/^[A-Z]{4}\d{6}\d$/.test(t))return"Characters 5–11 must be digits (serial number + check digit)";const i=iso6346CheckDigit(t.slice(0,10)),n=parseInt(t[10],10);return null===i?"Could not compute check digit":i!==n?`Check digit should be ${i}, not ${n} — verify the container number`:null}function isValidContainerFormat(e){return null===containerFormatIssue(e)}function findDuplicateInterchange(e,t,i,n){const a=(e||"").trim().toUpperCase();if(!a||!t)return null;const o=new Date(i||Date.now()).toDateString();return state.db.interchange.find(e=>e.id!==n&&(e.container||"").toUpperCase()===a&&e.type===t&&new Date(e.date).toDateString()===o)||null}function markContainerValidity(e){const t=e.selectionStart,i=e.selectionEnd;e.value=e.value.toUpperCase(),e.setSelectionRange&&e.setSelectionRange(t,i);const n=e.value.trim();e.classList.remove("input-valid","input-invalid"),n.length<4||e.classList.add(isValidContainerFormat(n)?"input-valid":"input-invalid")}function findTruckByReg(e,t){if(!e)return null;const i=e.trim().toUpperCase();return state.db.trucks.find(e=>e.id!==t&&(e.reg||"").toUpperCase()===i)||null}function findDriverByPhone(e,t){if(!e)return null;const i=e.replace(/\s+/g,"");return state.db.drivers.find(e=>e.id!==t&&(e.phone||"").replace(/\s+/g,"")===i)||null}function findLineByCode(e,t){if(!e)return null;const i=e.trim().toUpperCase();return state.db.shippingLines.find(e=>e.id!==t&&(e.code||"").toUpperCase()===i)||null}const ROLE_SIDEBAR={admin:["dashboard","trucks","drivers","trips","dispatch","inward","publicbookings","depops","maintenance","fuel","shutout","interchange","depotreport","shippinglines","requisitions","workshop"],clerk:["trucks","drivers","trips","dispatch","inward","publicbookings","depops","shutout","interchange","depotreport"],dispatch:["trucks","drivers","trips","dispatch","inward","publicbookings","depops","shutout","interchange","depotreport","fuel"],ops:["trucks","drivers","trips","dispatch","inward","publicbookings","depops","maintenance","fuel","shutout","interchange","depotreport","shippinglines","requisitions","workshop"],finance:["trips","shippinglines"],viewer:["trucks","drivers","trips"]},ROLE_ADMINRAIL={admin:["invoicing","allocation","workanalysis","reports","tripreports","livetracking","usermgmt","settings"],clerk:["allocation"],dispatch:["allocation"],finance:["invoicing","workanalysis","reports"],ops:["workanalysis","reports"],viewer:[]};function allowedSidebarSections(){if(isAdmin())return ROLE_SIDEBAR.admin;const e=state.profile?.nav_sections;return Array.isArray(e)?e:ROLE_SIDEBAR[currentRole()]||[]}function allowedAdminRailSections(){if(isAdmin())return ROLE_ADMINRAIL.admin;const e=state.profile?.admin_sections;return Array.isArray(e)?e:ROLE_ADMINRAIL[currentRole()]||[]}function canSeeSection(e){return isAdmin()||allowedSidebarSections().includes(e)}function canSeeAdminSection(e){return isAdmin()||allowedAdminRailSections().includes(e)}function applyRoleUI(){if(isAdmin()){document.querySelectorAll(".nav-item[data-section]").forEach(e=>e.style.display=""),document.querySelectorAll(".admin-nav-item").forEach(e=>e.style.display="");const e=document.getElementById("sidebarAdminGroupLabel");return void(e&&(e.style.display=""))}const e=allowedSidebarSections();document.querySelectorAll(".nav-item[data-section]").forEach(t=>{const i=t.getAttribute("data-section");t.style.display=e.includes(i)?"":"none"});const t=document.querySelector('.nav-item[data-section="dashboard"]');t&&(t.style.display="none");const i=allowedAdminRailSections();["invoicing","allocation","workanalysis","reports","tripreports","livetracking","usermgmt","settings"].forEach(e=>{const t=document.getElementById(`adminBtn-${e}`);t&&(t.style.display=i.includes(e)?"":"none")}),document.querySelectorAll(".admin-nav-group").forEach(e=>{const t=[...e.querySelectorAll(".admin-nav-item")].some(e=>"none"!==e.style.display);e.style.display=t?"":"none"});const n=document.getElementById("sidebarAdminGroupLabel");if(n){const e=["allocation","workanalysis","reports","tripreports","livetracking"].some(e=>{const t=document.getElementById(`adminBtn-${e}`);return t&&"none"!==t.style.display});n.style.display=e?"":"none"}const a=document.querySelector('.user-menu-item[onclick*="usermgmt"]');a&&(a.style.display=i.includes("usermgmt")?"":"none"),["allocTabBtn-requisitions","allocTabBtn-workshop"].forEach(e=>{const t=document.getElementById(e);t&&(t.style.display="none")});const o=document.getElementById("adminStatusOverridePanel");o&&(o.style.display="none")}function defaultSectionForRole(){if(isAdmin())return"dashboard";return allowedSidebarSections()[0]||"trips"}function myDriverRecord(){return state.db.drivers.find(e=>e.profileId===state.profile?.id)||null}function canFinance(){return isAdmin()}function validateEmail(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}function validatePhone(e){return/^\+?[0-9\s\-()]{7,20}$/.test(e)}function sanitize(e){return e?e.replace(/[<>]/g,""):""}function toast(e,t="info",i=3200){const n=document.createElement("div");n.className=`toast ${t}`,n.innerHTML=`<span>${{success:"✓",error:"✕",warning:"⚠",info:"ℹ"}[t]||"ℹ"}</span><span>${e}</span>`;const a=document.getElementById("toastStack");a&&a.prepend(n),setTimeout(()=>{n.classList.add("out"),setTimeout(()=>n.remove(),350)},i)}const LOAD_STEPS=[[300,"Connecting to Supabase…"],[700,"Loading fleet database…"],[1100,"Verifying container records…"],[1600,"Building dispatch queue…"],[2e3,"Activating live tracking…"],[2400,"System ready."]];async function runLoader(){const e=document.getElementById("loaderFill"),t=document.getElementById("loaderStatus"),i=document.getElementById("loader");if(e&&t&&i){await initDB();try{const{data:{session:e}}=await supabase.auth.getSession();if(e&&e.user){const{data:t,error:i}=await supabase.from("profiles").select("*").eq("id",e.user.id).single();t&&t.active&&!i&&(state.profile=t,state.currentUser={id:e.user.id,email:t.email,username:t.username,name:t.name,role:t.role})}}catch(e){console.warn("Session check failed:",e)}LOAD_STEPS.forEach(([n,a],o)=>{setTimeout(()=>{e.style.width=`${Math.round((o+1)/LOAD_STEPS.length*100)}%`,t.textContent=a,o===LOAD_STEPS.length-1&&setTimeout(()=>{i.classList.add("out"),setTimeout(()=>{i.style.display="none",state.currentUser&&state.profile?bootShell():showLoginScreen()},520)},400)},n)})}}async function loadUserProfile(e){try{const{data:t,error:i}=await supabase.from("profiles").select("*").eq("id",e).single();return i||!t?(console.error("Profile not found:",i),!1):t.active?(state.profile=t,state.currentUser={id:e,email:t.email,username:t.username,name:t.name,role:t.role},await supabase.from("profiles").update({last_login:(new Date).toISOString()}).eq("id",e),!0):(toast("Account is deactivated","error"),!1)}catch(e){return console.error("loadUserProfile error:",e),!1}}function showLoginScreen(){const e=document.getElementById("loginScreen");e&&(e.style.display="flex",animateCounter("ls-fleet",state.db.trucks.length,0,800),animateCounter("ls-drivers",state.db.drivers.length,0,800),animateCounter("ls-trips",state.db.trips.filter(e=>"active"===e.status).length,0,800),setTimeout(()=>document.getElementById("loginUser")?.focus(),100))}function animateCounter(e,t,i=0,n=600){const a=document.getElementById(e);if(!a)return;const o=(t-i)/(n/16);let r=i;const s=()=>{r=Math.min(r+o,t),a.textContent=Math.round(r),r<t&&requestAnimationFrame(s)};requestAnimationFrame(s)}async function loadUserProfile(e){try{const{data:t,error:i}=await supabase.from("profiles").select("*").eq("id",e).single();return i||!t?(console.error("Profile not found:",i),!1):t.active?(state.profile=t,state.currentUser={id:e,email:t.email,username:t.username,name:t.name,role:t.role},await supabase.from("profiles").update({last_login:(new Date).toISOString()}).eq("id",e),!0):(toast("Account is deactivated","error"),!1)}catch(e){return console.error("loadUserProfile error:",e),!1}}async function logout(){confirm("Are you sure you want to sign out?")&&await performLogout("User signed out")}async function forceLogout(e){await performLogout(e||"Session timed out (idle)")}async function performLogout(e){stopDriverTracking(),stopWialonPolling(),stopAutoRefresh(),addAudit(state.profile?.username||"system","Logout",e),await supabase.auth.signOut(),state.currentUser=null,state.profile=null,clearIdleTimer(),document.getElementById("shell").style.display="none";const t=document.getElementById("driverPortal");t&&(t.style.display="none"),document.body.classList.remove("driver-portal-active"),document.getElementById("loginScreen").style.display="flex",document.getElementById("loginUser").value="",document.getElementById("loginPass").value="",document.getElementById("loginError").textContent="",document.getElementById("loginUser").focus()}function togglePwVis(e,t){const i=document.getElementById(e);if(!i)return;i.type="password"===i.type?"text":"password";const n=t?.querySelector("svg circle");n&&n.setAttribute("r","text"===i.type?"1":"3")}function bootShell(){if(isDriver()){document.body.classList.add("driver-portal-active");const e=document.getElementById("shell");e&&(e.style.display="none");const t=document.getElementById("driverPortal");return t&&(t.style.display="flex"),startClock(),refreshContainerHistory(),renderDriverPortal(),void startIdleTimer()}document.body.classList.remove("driver-portal-active");const e=document.getElementById("driverPortal");e&&(e.style.display="none"),document.getElementById("shell").style.display="flex",updateUserChip(),startClock(),applyRoleUI(),buildBadges(),buildAlerts(),subscribeTrackingRealtime(),subscribeLiveSync(),startWialonPolling(),initAutoRefresh();const t=defaultSectionForRole();showSection(t,document.querySelector(`.nav-item[data-section="${t}"]`)),populateSelects(),startIdleTimer(),startLivePulse()}function updateUserChip(){const e=state.profile;if(!e)return;const t=document.getElementById("railUserAv");t&&(t.textContent=initials(e.name));const i=document.getElementById("railUserName");i&&(i.textContent=e.name.split(" ")[0]);const n=document.getElementById("railUserRole");n&&(n.textContent=roleLabel(e.role));const a=document.getElementById("topbarRoleChip");a&&(a.textContent=roleLabel(e.role));const o=document.getElementById("userMenuHeader");o&&(o.innerHTML=`<div class="user-menu-header-name">${e.name}</div><div class="user-menu-header-role">${roleLabel(e.role)}</div>`)}function roleLabel(e){return{admin:"System Administrator",ops:"Operations Officer",finance:"Finance Manager",dispatch:"Dispatch Controller",clerk:"Clerk",viewer:"Read-Only Viewer",driver:"Driver"}[e]||e}function startClock(){const e=()=>{const e=new Date,t=document.getElementById("liveTime");t&&(t.textContent=e.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));const i=document.getElementById("todayDate");i&&(i.textContent=e.toLocaleDateString("en-KE",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}));const n=document.getElementById("dp_clock");n&&(n.textContent=e.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})),isDriver()&&renderDutyBar()};e(),setInterval(e,1e3)}function buildBadges(){const e=state.db,t=(e,t)=>{const i=document.getElementById(e);i&&(i.textContent=t||"",i.style.display=t?"inline":"none")};t("badge-trucks",e.trucks.filter(e=>"breakdown"===e.status).length),t("badge-drivers",e.drivers.filter(e=>"on_trip"===e.status).length),t("badge-trips",e.trips.filter(e=>"active"===e.status).length),t("badge-dispatch",awaitingDispatchTrips().length),t("badge-inward",e.interchange.filter(e=>("Gate-In"===e.type||"Depot-In"===e.type)&&new Date(e.date).toDateString()===(new Date).toDateString()).length),t("badge-allocation",awaitingDispatchTrips().length),t("badge-maintenance",e.maintenance.filter(e=>"open"===e.status).length),t("badge-shutout",e.shutouts.filter(e=>"open"===e.status).length),t("badge-interchange",e.interchange.filter(e=>"pending"===e.status).length),t("badge-requisitions",e.requisitions.filter(e=>"pending"===e.status).length),t("badge-invoices",e.invoices.filter(e=>"overdue"===e.status).length),t("badge-depotreport",computeDepotReportDuplicates().length)}function buildAlerts(){const e=state.db,t=[];e.maintenance.filter(e=>"open"===e.status&&"critical"===e.priority&&e.reportedByDriver).forEach(e=>{t.push({type:"driver_breakdown",msg:`🚨 DRIVER BREAKDOWN REPORT — ${truckName(e.truckId)}: ${e.desc.slice(0,60)}…`})}),e.maintenance.filter(e=>"open"===e.status&&"critical"===e.priority&&!e.reportedByDriver).forEach(e=>{t.push({type:"crit",msg:`Critical breakdown — ${truckName(e.truckId)}: ${e.desc.slice(0,60)}…`})}),e.trucks.filter(e=>e.fuelPct<20).forEach(e=>{t.push({type:"warn",msg:`Low fuel — ${e.reg}: ${e.fuelPct}% remaining`})}),e.trips.filter(e=>"delayed"===e.status).forEach(e=>{t.push({type:"warn",msg:`Trip delayed — ${truckName(e.truckId)} → ${e.dest}`})}),e.drivers.filter(e=>{const t=(new Date(e.licenceExp)-Date.now())/864e5;return t<90&&t>0}).forEach(e=>{const i=Math.round((new Date(e.licenceExp)-Date.now())/864e5);t.push({type:"warn",msg:`Licence expiry — ${e.name}: ${i} days remaining`})});const i={driver_breakdown:0,crit:1,warn:2};t.sort((e,t)=>(i[e.type]??9)-(i[t.type]??9));const n=document.getElementById("alertsList");n&&(n.innerHTML=t.length?t.map(e=>`<div class="alert-item ${"driver_breakdown"===e.type?"crit":e.type}">${"driver_breakdown"===e.type?'<div class="alert-dot-sm" style="background:var(--red)"></div>':`<div class="alert-dot-sm" style="background:${"crit"===e.type?"var(--red)":"var(--amber)"}"></div>`}<span>${e.msg}</span></div>`).join(""):'<div style="padding:16px;text-align:center;color:var(--text-3);font-size:12px">No active alerts</div>');const a=document.getElementById("alertDot");a&&(a.style.display=t.length?"block":"none")}function toggleAlerts(){const e=document.getElementById("alertsPanel");e&&(state.alertsOpen=!state.alertsOpen,e.classList.toggle("open",state.alertsOpen))}window.doLogin=async function(){const e=document.getElementById("loginUser").value.trim(),t=document.getElementById("loginPass").value,i=document.getElementById("loginError");if(!e||!t)return void(i.textContent="Email and password required.");i.textContent="";const n=document.querySelector(".login-btn");n&&(n.disabled=!0,n.innerHTML="<span>Signing in…</span>");try{const{data:n,error:a}=await supabase.auth.signInWithPassword({email:e,password:t});if(a||!n.user)return void(i.textContent="Invalid email or password.");const{data:o,error:r}=await supabase.from("profiles").select("*").eq("id",n.user.id).single();if(r||!o)return i.textContent="Profile not found. Contact administrator.",void await supabase.auth.signOut();if(!o.active)return i.textContent="Account is deactivated.",void await supabase.auth.signOut();state.profile=o,state.currentUser={id:n.user.id,email:o.email,username:o.username,name:o.name,role:o.role},await supabase.from("profiles").update({last_login:(new Date).toISOString()}).eq("id",n.user.id),document.getElementById("loginScreen").style.display="none",bootShell()}catch(e){console.error("Login error:",e),i.textContent="Connection error. Please try again."}finally{n&&(n.disabled=!1,n.innerHTML='<span>Sign In</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>')}};const SECTION_META={dashboard:["Operations","Dashboard"],trucks:["Fleet Management","Trucks"],drivers:["Fleet Management","Drivers"],trips:["Fleet Management","Active Trips"],dispatch:["Operations","Dispatch Console"],inward:["Operations","Inward Container Entry"],publicbookings:["Operations","Public Bookings"],depops:["Operations","DepOps"],maintenance:["Operations","Maintenance Log"],fuel:["Operations","Fuel Log"],shutout:["Container Ops","Shutout"],interchange:["Container Ops","Interchange"],depotreport:["Container Ops","Depot Report"],shippinglines:["Container Ops","Shipping Lines"],requisitions:["Compliance","Requisitions"],workshop:["Compliance","Workshop"],invoicing:["Finance","Invoicing"],allocation:["Intelligence","Allocation"],workanalysis:["Intelligence","Work Analysis"],reports:["Intelligence","Reports"],tripreports:["Intelligence","Trip Reports & Audit Centre"],livetracking:["Platform","Live Tracking"],usermgmt:["Platform","User Management"],settings:["Platform","Settings"]};function showSection(e,t){if(!canSeeSection(e))return void toast("You don't have access to this section","error");document.querySelectorAll(".section").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-item, .admin-nav-item, .mobile-nav-item").forEach(e=>e.classList.remove("active"));const i=document.getElementById(`sec-${e}`);i&&i.classList.add("active"),t&&t.classList.add("active"),document.querySelectorAll(`.nav-item[data-section="${e}"], .mobile-nav-item[data-mobile-section="${e}"]`).forEach(e=>e.classList.add("active")),state.currentSection=e;const[n,a]=SECTION_META[e]||["Operations",e],o=document.getElementById("topbarArea"),r=document.getElementById("topbarTitle");o&&(o.textContent=n),r&&(r.textContent=a),renderSection(e),closeUserMenu(),window.innerWidth<900&&document.body.classList.remove("sidebar-open")}function showAdminSection(e,t){if(!canSeeAdminSection(e))return void toast("You don't have access to this section","error");document.querySelectorAll(".section").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-item, .admin-nav-item, .mobile-nav-item").forEach(e=>e.classList.remove("active"));const i=document.getElementById(`sec-${e}`);i&&i.classList.add("active"),t&&t.classList.add("active"),state.currentAdminSection=e;const[n,a]=SECTION_META[e]||["Admin",e],o=document.getElementById("topbarArea"),r=document.getElementById("topbarTitle");o&&(o.textContent=n),r&&(r.textContent=a),renderSection(e),window.innerWidth<900&&document.body.classList.remove("sidebar-open")}function renderSection(e){const t=sectionRenderers[e];t&&t()}const sectionRenderers={dashboard:renderDashboard,trucks:()=>renderTrucks("all"),drivers:()=>renderDrivers("all"),trips:()=>renderTrips("active"),dispatch:renderDispatch,maintenance:()=>renderMaint("all"),inward:renderInward,fuel:renderFuel,shutout:()=>renderShutout("all"),interchange:()=>renderInterchange("all"),depotreport:renderDepotReport,shippinglines:()=>renderLines("all"),requisitions:()=>renderRequisitions("all"),workshop:()=>renderWorkshop("all"),invoicing:()=>renderInvoicing("all"),allocation:()=>renderAllocation("auto"),workanalysis:()=>renderWorkAnalysis("all"),reports:()=>renderReport("overview"),tripreports:trcInit,livetracking:initTrackingSection,usermgmt:renderUserMgmt,settings:renderSettings,publicbookings:renderPublicBookings,depops:renderDepOps};function toggleSidebar(){document.body.classList.toggle("sidebar-open")}function mobileNav(e,t){showSection(e,t),document.body.classList.remove("sidebar-open")}function renderDashboard(){const e=state.db,t=e.trucks,i=e.trips,n=e.maintenance,a=t.filter(e=>"available"===e.status).length,o=t.filter(e=>"on_trip"===e.status).length,r=t.filter(e=>"breakdown"===e.status).length,s=i.filter(e=>"active"===e.status).length,d=document.getElementById("kpiRow");d&&(d.innerHTML=`${kpiCard("Fleet Size",t.length,"","kpi-gold")} ${kpiCard("Available",a,"Ready to deploy","kpi-green")} ${kpiCard("On Trip",o,"Currently active","kpi-gold")} ${kpiCard("Breakdown",r,"Requires attention","kpi-red")} ${kpiCard("Active Trips",s,"In progress","kpi-blue")} ${kpiCard("Drivers",e.drivers.filter(e=>"on_trip"===e.status).length,"On duty","kpi-orange")}`);const l=[["available","Available","var(--green)"],["on_trip","On Trip","var(--gold)"],["maintenance","Maintenance","var(--amber)"],["breakdown","Breakdown","var(--red)"],["off_duty","Off Duty","var(--text-3)"]],c=document.getElementById("fleetStatusBars");c&&(c.innerHTML=l.map(([e,i,n])=>{const a=t.filter(t=>t.status===e).length,o=t.length?Math.round(a/t.length*100):0;return`<div class="fleet-status-bar" style="padding:10px 14px"><div class="fsb-row"><span class="fsb-label">${i}</span><span class="fsb-count">${a} / ${t.length}</span></div><div class="fsb-track"><div class="fsb-fill" style="width:${o}%;background:${n}"></div></div></div>`}).join(""));const p=document.getElementById("fleetStatusMeta");p&&(p.textContent=`${t.length} total`);const u=i.filter(e=>"active"===e.status),m=document.getElementById("liveTripsCount");m&&(m.textContent=`${u.length} active`);const v=document.getElementById("liveTrips");v&&(v.innerHTML=u.length?u.map(e=>`<div class="live-trip-row" onclick="showTripDetail('${e.id}')"><div class="ltr-dot" style="background:${"delayed"===e.status?"var(--amber)":"var(--green)"}"></div><div class="ltr-info"><div class="ltr-route">${e.origin} → ${e.dest}</div><div class="ltr-meta">${truckName(e.truckId)} · ${e.container} · ETA ${fmtTime(e.eta)}</div></div>${sbadge(e.status)}</div>`).join(""):'<div class="empty-state"><div class="empty-state-label">No active trips</div></div>'),renderActivityFeed("all");const g=n.filter(e=>"resolved"!==e.status).sort((e,t)=>["critical","high","medium","low"].indexOf(e.priority)-["critical","high","medium","low"].indexOf(t.priority)),f=document.getElementById("maintAlerts");f&&(f.innerHTML=g.length?g.map(e=>`<div class="maint-alert-row" onclick="showSection('maintenance',null)"><div style="width:8px;height:8px;border-radius:50%;background:${"critical"===e.priority?"var(--red)":"high"===e.priority?"var(--amber)":"var(--gold)"}"></div><div style="flex:1"><div style="font-size:11.5px;font-weight:600;color:var(--text)">${truckName(e.truckId)}</div><div style="font-size:10.5px;color:var(--text-3)">${e.desc.slice(0,55)}…</div></div>${sbadge(e.status)}</div>`).join(""):'<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-label">No open issues</div></div>')}function kpiCard(e,t,i="",n="kpi-gold"){return`<div class="kpi-card ${n}"><div class="kpi-value">${t}</div><div class="kpi-label">${e}</div>${i?`<div class="kpi-sub">${i}</div>`:""}</div>`}let _activityFilter="all";function filterActivity(e,t){_activityFilter=e,document.querySelectorAll("#sec-dashboard .pill").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderActivityFeed(e)}function renderActivityFeed(e){const t=state.db,i=[];t.trips.forEach(e=>{i.push({type:"dispatch",icon:"🚛",msg:`Dispatched ${e.container} — ${e.origin} → ${e.dest}`,time:e.startTime}),"completed"===e.status&&i.push({type:"return",icon:"✅",msg:`Completed — ${truckName(e.truckId)} returned`,time:e.eta})}),t.maintenance.forEach(e=>{"open"===e.status&&i.push({type:"issue",icon:"️",msg:`Issue logged — ${truckName(e.truckId)}: ${e.type}`,time:e.date})});const n="all"===e?i:i.filter(t=>t.type===e);n.sort((e,t)=>new Date(t.time)-new Date(e.time));const a=document.getElementById("activityList");a&&(a.innerHTML=n.slice(0,12).map(e=>`<div class="activity-row"><div class="act-icon">${e.icon}</div><div style="flex:1;font-size:11.5px;color:var(--text-2)">${e.msg}</div><div class="act-time">${timeAgo(e.time)}</div></div>`).join("")||'<div class="empty-state"><div class="empty-state-label">No activity</div></div>')}let _truckFilter="all";function filterTrucks(e,t){_truckFilter=e,document.querySelectorAll("#sec-trucks .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderTrucks(e)}function renderTrucks(e){const t="all"===e?state.db.trucks:state.db.trucks.filter(t=>t.status===e),i=document.getElementById("truckGrid");i&&(i.innerHTML=t.map(e=>`<div class="truck-card${e.img?" has-photo":""}" onclick="showTruckDetail('${e.id}')">${e.img?`<img class="truck-card-img" src="${e.img}" alt="${e.reg}" /><div class="truck-card-img-overlay"></div>`:""}<div class="truck-card-inner"><div class="truck-card-status-bar ${e.status}"></div><div class="truck-card-body"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="truck-card-reg">${e.reg}</div><div class="truck-card-make">${e.make} · ${e.year}</div><div class="truck-card-type">${e.type}</div></div>${sbadge(e.status)}</div><div class="truck-card-stats"><div class="ts"><b>${fmt(e.mileage)} km</b>Odometer</div><div class="ts"><b>${e.driver?driverName(e.driver).split(" ")[0]:"—"}</b>Driver</div><div class="ts"><b>${e.colour}</b>Colour</div><div class="fuel-bar-outer"><div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-3);margin-top:6px"><span>Fuel</span><span style="color:${fuelColour(e.fuelPct)}">${e.fuelPct}%</span></div><div class="fuel-bar"><div class="fuel-fill" style="width:${e.fuelPct}%;background:${fuelColour(e.fuelPct)}"></div></div></div></div></div></div></div>`).join("")||'<div class="empty-state"><div class="empty-state-icon">🚛</div><div class="empty-state-label">No trucks match this filter</div></div>')}function showTruckDetail(e){const t=state.db.trucks.find(t=>t.id===e);if(!t)return;const i=state.db.trips.filter(t=>t.truckId===e).slice(-5);state.db.maintenance.filter(t=>t.truckId===e);openModal(`Truck — ${t.reg}`,`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Registration</label><div class="mono" style="padding:8px;background:var(--surface);border-radius:5px;color:var(--gold)">${t.reg}</div></div><div class="fg" style="margin:0"><label>Status</label><div style="padding:6px 0">${sbadge(t.status)}</div></div><div class="fg" style="margin:0"><label>Make / Model</label><div style="font-size:12px;color:var(--text)">${t.make}</div></div><div class="fg" style="margin:0"><label>Year</label><div style="font-size:12px;color:var(--text)">${t.year}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.type}</div></div><div class="fg" style="margin:0"><label>Colour</label><div style="font-size:12px;color:var(--text)">${t.colour}</div></div><div class="fg" style="margin:0"><label>Odometer</label><div style="font-size:12px;color:var(--text)">${fmt(t.mileage)} km</div></div><div class="fg" style="margin:0"><label>Fuel</label><div><div style="font-size:12px;color:${fuelColour(t.fuelPct)};font-weight:700">${t.fuelPct}%</div><div class="fuel-bar" style="margin-top:4px"><div class="fuel-fill" style="width:${t.fuelPct}%;background:${fuelColour(t.fuelPct)}"></div></div></div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Assigned Driver</label><div style="font-size:12px;color:var(--text)">${t.driver?driverName(t.driver):"Unassigned"}</div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Last Service</label><div style="font-size:12px;color:var(--text)">${fmtDate(t.lastService)}</div></div></div><div style="margin-bottom:14px"><div class="fg" style="margin:0"><label>Next Service Due</label><div style="font-size:12px;color:${new Date(t.nextService)<Date.now()?"var(--red)":"var(--text)"}">${fmtDate(t.nextService)}</div></div></div>${t.notes?`<div class="ops-notice" style="margin-bottom:14px">${t.notes}</div>`:""}<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:6px">Recent Trips (${i.length})</div>${i.length?i.map(e=>`<div class="activity-row"><div style="flex:1;font-size:11px;color:var(--text-2)">${e.origin} → ${e.dest} · ${e.container}</div>${sbadge(e.status)}<div class="act-time">${fmtDate(e.startTime)}</div></div>`).join(""):'<div style="color:var(--text-3);font-size:11px;padding:8px 0">No trips recorded</div>'}${isAdmin()?`<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Admin — Status Override</div><div style="display:flex;gap:6px;flex-wrap:wrap">${["available","on_trip","maintenance","breakdown","off_duty"].map(i=>`<button class="filter-btn${t.status===i?" active":""}" onclick="quickSetTruckStatus('${e}','${i}')">${i.replace("_"," ")}</button>`).join("")}</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="action-btn ghost" onclick="triggerImageUpload('trucks','${e}','img',()=>showTruckDetail('${e}'))">📷 Upload Truck Photo</button></div><div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Wialon GPS Unit</div><div style="font-size:9.5px;color:var(--text-3);margin-bottom:8px;line-height:1.5">If this truck has a dedicated Wialon AVL tracker fitted, enter its Wialon unit ID (from core/search_items) to source its live position from Wialon instead of the driver's phone.</div><div style="display:flex;gap:6px"><input id="tw_wialonId" value="${esc(t.wialonUnitId||"")}" placeholder="Wialon unit ID" style="flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:5px;font-size:11.5px"/><button class="tbl-btn" onclick="saveTruckWialonId('${e}')">Save</button></div></div>${adminDeleteBtn("trucks",e)}</div>`:""}`)}function quickSetTruckStatus(e,t){if(!isAdmin())return void toast("Admin rights required","error");const i=state.db.trucks.find(t=>t.id===e);i&&(i.status=t,scheduleSave(),addAudit(state.profile.username,"Status Override",`${i.reg} → ${t}`),buildBadges(),closeModal(),renderTrucks(_truckFilter),toast(`${i.reg} status set to ${t}`,"success"))}function showAddTruckModal(){openModal("Add New Truck",`<div class="form-row-2"><div class="fg"><label>Registration</label><input id="nt_reg" placeholder="KDA 000A"/></div><div class="fg"><label>Make / Model</label><input id="nt_make" placeholder="ISUZU FVZ"/></div></div><div class="form-row-2"><div class="fg"><label>Type</label><select id="nt_type"><option>Prime Mover</option><option>Flatbed</option><option>Tipper</option><option>Tanker</option><option>Lowbed</option></select></div><div class="fg"><label>Year</label><input id="nt_year" type="number" placeholder="${(new Date).getFullYear()}"/></div></div><div class="form-row-2"><div class="fg"><label>Colour</label><input id="nt_colour" placeholder="White"/></div><div class="fg"><label>Fuel Level %</label><input id="nt_fuel" type="number" placeholder="100" min="0" max="100"/></div></div><div class="fg"><label>Odometer (km)</label><input id="nt_odo" type="number" placeholder="0"/></div><div class="fg"><label>Wialon Unit ID (optional)</label><input id="nt_wialon" placeholder="Leave blank if tracked via driver phone"/></div><div class="fg"><label>Notes</label><textarea id="nt_notes" rows="2" placeholder="Any notes…"></textarea></div><button class="submit-btn" onclick="saveTruck()">Add Truck →</button>`)}function saveTruck(){const e=document.getElementById("nt_reg").value.trim().toUpperCase(),t=document.getElementById("nt_make").value.trim();if(!e||!t)return void toast("Registration and make are required","error");if(!/^[A-Z0-9\s]{3,10}$/.test(e))return void toast("Invalid registration format. Use letters and numbers only.","error");if(findTruckByReg(e))return void toast(`${e} is already registered in the fleet`,"error");const i={id:uid("TRK"),reg:e,make:t,type:document.getElementById("nt_type").value,year:parseInt(document.getElementById("nt_year").value)||(new Date).getFullYear(),colour:document.getElementById("nt_colour").value.trim()||"White",fuelPct:Math.min(100,Math.max(0,parseInt(document.getElementById("nt_fuel").value)||100)),mileage:Math.max(0,parseInt(document.getElementById("nt_odo").value)||0),status:"available",driver:null,lastService:(new Date).toISOString(),nextService:new Date(Date.now()+7776e6).toISOString(),notes:sanitize(document.getElementById("nt_notes").value.trim()),img:"",licencePlate:e,vin:"",wialonUnitId:document.getElementById("nt_wialon").value.trim()};state.db.trucks.push(i),scheduleSave(),addAudit(state.profile.username,"Truck Added",`${e} — ${t}`),buildBadges(),closeModal(),renderTrucks("all"),toast(`${e} added to fleet`,"success"),i.wialonUnitId&&state.db.settings?.wialonEnabled&&startWialonPolling()}let _driverFilter="all";function filterDrivers(e,t){_driverFilter=e,document.querySelectorAll("#sec-drivers .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderDrivers(e)}function renderDrivers(e){const t="all"===e?state.db.drivers:state.db.drivers.filter(t=>t.status===e),i=document.getElementById("driverTableBody");i&&(i.innerHTML=t.map(e=>`<tr onclick="showDriverDetail('${e.id}')"><td><div class="driver-cell"><div class="driver-avatar">${initials(e.name)}</div><div><div class="driver-name">${e.name}</div><div class="driver-id">${e.id}</div></div></div></td><td class="mono">${e.phone}</td><td class="mono">${e.licence}</td><td>${e.truckId?`<span class="mono" style="color:var(--gold)">${state.db.trucks.find(t=>t.id===e.truckId)?.reg||"—"}</span>`:"—"}</td><td>${sbadge(e.status)}</td><td style="text-align:center;font-family:var(--font-mono)">${e.tripsToday}</td><td class="mono" style="font-size:10px">${e.load||"—"}</td><td style="font-size:11px;color:var(--text-3)">${e.location}</td><td><button class="tbl-btn" onclick="event.stopPropagation();showDriverDetail('${e.id}')">View</button></td></tr>`).join("")||'<tr><td colspan="9" class="empty-td">No drivers match this filter</td></tr>')}function showDriverDetail(e){const t=state.db.drivers.find(t=>t.id===e);if(!t)return;const i=Math.round((new Date(t.licenceExp)-Date.now())/864e5)<90;openModal(`Driver — ${t.name}`,`<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div style="width:52px;height:52px;border-radius:50%;background:var(--gold-dim);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--gold)">${initials(t.name)}</div><div><div style="font-size:16px;font-weight:700;color:var(--text)">${t.name}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3)">${t.id}</div></div><div style="margin-left:auto">${sbadge(t.status)}</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Phone</label><div class="mono" style="font-size:12px;color:var(--text)">${t.phone}</div></div><div class="fg" style="margin:0"><label>Licence</label><div class="mono" style="font-size:12px;color:var(--text)">${t.licence}</div></div><div class="fg" style="margin:0"><label>Licence Expiry</label><div style="font-size:12px;color:${i?"var(--amber)":"var(--text)"};font-weight:${i?"700":"400"}">${fmtDate(t.licenceExp)}${i?" ⚠":""}</div></div><div class="fg" style="margin:0"><label>Trips Today</label><div class="mono" style="font-size:16px;color:var(--gold);font-weight:700">${t.tripsToday}</div></div><div class="fg" style="margin:0"><label>Assigned Truck</label><div style="font-size:12px;color:var(--text)">${t.truckId?truckName(t.truckId):"Not assigned"}</div></div><div class="fg" style="margin:0"><label>Current Load</label><div class="mono" style="font-size:11px;color:var(--text)">${t.load||"None"}</div></div><div class="fg" style="margin:0"><label>Location</label><div style="font-size:12px;color:var(--text)">${t.location}</div></div><div class="fg" style="margin:0"><label>Rating</label><div style="font-size:12px;color:var(--gold)">⭐ ${t.rating||0}/5.0</div></div><div class="fg" style="margin:0"><label>ID No.</label><div class="mono" style="font-size:12px;color:var(--text)">${t.idNo||"—"}</div></div></div>${isAdmin()?`<div style="padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Admin — Status Override</div><div style="display:flex;gap:6px;flex-wrap:wrap">${["available","on_trip","off_duty","suspended"].map(i=>`<button class="filter-btn${t.status===i?" active":""}" onclick="quickSetDriverStatus('${e}','${i}')">${i.replace("_"," ")}</button>`).join("")}</div><div style="margin-top:14px"><label style="font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;font-family:var(--font-mono)">Linked Login (Driver Portal Access)</label><select onchange="linkDriverProfile('${e}', this.value)" style="width:100%;margin-top:6px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:7px;border-radius:5px;font-size:12px"><option value="">— Not linked —</option>${state.db.profiles.filter(e=>"driver"===e.role).map(e=>`<option value="${e.id}" ${t.profileId===e.id?"selected":""}>${e.name} (${e.username})</option>`).join("")}</select></div>${adminDeleteBtn("drivers",e)}</div>`:""}`)}function quickSetDriverStatus(e,t){if(!isAdmin())return void toast("Admin rights required","error");const i=state.db.drivers.find(t=>t.id===e);i&&(i.status=t,scheduleSave(),addAudit(state.profile.username,"Driver Status Override",`${i.name} → ${t}`),closeModal(),renderDrivers(_driverFilter),toast(`${i.name} status updated`,"success"))}function linkDriverProfile(e,t){if(!isAdmin())return void toast("Admin rights required","error");const i=state.db.drivers.find(t=>t.id===e);if(!i)return;i.profileId=t||null,scheduleSave();const n=t?state.db.profiles.find(e=>e.id===t):null;addAudit(state.profile.username,"Driver Login Linked",`${i.name} ↔ ${n?`${n.name} (${n.username})`:"unlinked"}`),toast(n?`${i.name} linked to ${n.name}'s login`:`${i.name} unlinked from login`,"success"),showDriverDetail(e)}function showAddDriverModal(){openModal("Add New Driver",'<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="nd_name" placeholder="John Doe"/></div><div class="fg"><label>Phone</label><input id="nd_phone" placeholder="+254 7XX XXX XXX"/></div></div><div class="form-row-2"><div class="fg"><label>Licence No.</label><input id="nd_lic" placeholder="DL-A0000"/></div><div class="fg"><label>Licence Expiry</label><input id="nd_licexp" type="date"/></div></div><div class="form-row-2"><div class="fg"><label>ID Number</label><input id="nd_idno" placeholder="ID number"/></div><div class="fg"><label>Rating</label><input id="nd_rating" type="number" placeholder="4.0" min="0" max="5" step="0.1"/></div></div><button class="submit-btn" onclick="saveDriver()">Add Driver →</button>')}function saveDriver(){const e=document.getElementById("nd_name").value.trim(),t=document.getElementById("nd_phone").value.trim(),i=document.getElementById("nd_lic").value.trim().toUpperCase();if(!e)return void toast("Full name is required","error");if(!validatePhone(t))return void toast("Invalid phone number format","error");if(!i)return void toast("Licence number is required","error");const n=findDriverByPhone(t);if(n)return void toast(`A driver with phone ${t} already exists (${n.name})`,"error");const a=state.db.drivers.find(e=>(e.licence||"").toUpperCase()===i);if(a)return void toast(`Licence ${i} is already registered to ${a.name}`,"error");const o={id:uid("DRV"),name:e,initials:initials(e),phone:t,licence:i,licenceExp:document.getElementById("nd_licexp").value||new Date(Date.now()+31536e6).toISOString(),status:"available",truckId:null,tripsToday:0,load:null,location:"Gargo Yard",idNo:document.getElementById("nd_idno").value.trim()||"",rating:Math.min(5,Math.max(0,parseFloat(document.getElementById("nd_rating").value)||4))};state.db.drivers.push(o),scheduleSave(),addAudit(state.profile.username,"Driver Added",`${e}`),closeModal(),renderDrivers("all"),toast(`${e} added`,"success")}let _tripFilter="active";function filterTrips(e,t){_tripFilter=e,document.querySelectorAll("#sec-trips .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderTrips(e)}function renderTrips(e){let t=state.db.trips;"flagged"===e?t=t.filter(e=>e.flaggedForReview):"all"!==e&&(t=t.filter(t=>t.status===e));const i=document.getElementById("tripsList");i&&(i.innerHTML=t.map(e=>`<div class="trip-card status-${e.status}" onclick="showTripDetail('${e.id}')"><div class="trip-card-head"><div class="trip-route">${e.origin}<span class="arrow">→</span>${e.dest}</div>${sbadge(e.status)}${e.flaggedForReview?`<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${esc((e.flagReasons||[]).join("; "))}">⚠ Flagged</span>`:""}</div><div class="trip-meta"><span>🚛 ${truckName(e.truckId)}</span><span>👤 ${driverName(e.driverId)}</span><span class="mono" style="font-size:10.5px;color:var(--gold)">${e.container}</span><span>${e.ctype} · ${e.workType}${e.outwardType?" · "+sanitize(e.outwardType):""}</span><span>🕐 Started ${timeAgo(e.startTime)} · ETA ${fmtTime(e.eta)}</span><span>${e.distance}km · ${sbadge(e.priority.toLowerCase())}</span></div></div>`).join("")||'<div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-label">No trips in this filter</div></div>')}function showTripDetail(e){const t=state.db.trips.find(t=>t.id===e);if(!t)return;const i=state.db.shippingLines.find(e=>e.id===t.shippingLine),n=isTripLive(t)&&(!t.truckId||!t.driverId),a=Array.isArray(t.containerImages)&&t.containerImages.length?`<div style="margin-bottom:14px"><div class="fg" style="margin:0 0 6px"><label>Container Photos (${t.containerImages.length})</label></div><div class="container-img-grid">${t.containerImages.map(e=>`<div class="container-img-thumb view-only"><img src="${e}" onclick="window.open('${e}','_blank')" /></div>`).join("")}</div></div>`:"";openModal(`Trip — ${t.container}`,`${n?`<div class="ops-notice" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>This trip is awaiting a truck/driver assignment.</span><button class="modal-btn primary" onclick="closeModal();jumpToCompleteDispatch('${t.id}')">Complete in Dispatch →</button></div>`:""}${a}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Container</label><div class="mono" style="color:var(--gold);font-size:13px">${t.container}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.ctype}</div></div><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(t.truckId)}</div></div><div class="fg" style="margin:0"><label>Driver</label><div style="font-size:12px;color:var(--text)">${driverName(t.driverId)}</div></div><div class="fg" style="margin:0"><label>Origin</label><div style="font-size:12px;color:var(--text)">${t.origin}</div></div><div class="fg" style="margin:0"><label>Destination</label><div style="font-size:12px;color:var(--text)">${t.dest}</div></div><div class="fg" style="margin:0"><label>Work Type</label><div style="font-size:12px;color:var(--text)">${t.workType}</div></div>${t.outwardType?`<div class="fg" style="margin:0"><label>Outward Type</label><div style="font-size:12px;color:var(--gold)">${sanitize(t.outwardType)}</div></div>`:""}<div class="fg" style="margin:0"><label>Distance</label><div style="font-size:12px;color:var(--text)">${t.distance} km</div></div><div class="fg" style="margin:0"><label>Started</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.startTime)}</div></div><div class="fg" style="margin:0"><label>ETA</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.eta)}</div></div><div class="fg" style="margin:0"><label>Shipping Line</label><div style="font-size:12px;color:var(--text)">${i?i.name:"—"}</div></div><div class="fg" style="margin:0"><label>Priority</label><div>${sbadge(t.priority.toLowerCase())}</div></div><div class="fg" style="margin:0"><label>Reference</label><div class="mono" style="font-size:11px;color:var(--text-2)">${t.ref}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(t.status)}</div></div></div>${t.notes?`<div class="ops-notice">${t.notes}</div>`:""}${t.flaggedForReview?`<div class="ops-notice" style="margin-top:10px"><div style="margin-bottom:6px">⚠ Flagged on import: ${esc((t.flagReasons||[]).join("; "))}</div><button class="modal-btn ghost" onclick="clearReviewFlag('trips','${t.id}');closeModal()">✓ Mark Reviewed</button></div>`:""}${canUpdateTripStatus(t)?`<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:10px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip Step Update ${"completed"===t.status?"— trip complete, no further changes":"(forward only)"}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${nextTripStatuses(t.status).length?nextTripStatuses(t.status).map(t=>`<button class="filter-btn" onclick="quickSetTripStatus('${e}','${t}')">${t.replace("_"," ")}</button>`).join(""):'<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>'}</div>${isAdmin()?adminDeleteBtn("trips",e):""}</div>`:""}`)}const TRIP_STATUS_RANK={active:0,loaded:1,on_trip:2,delayed:2,breakdown:2,offloaded:3,completed:4},TRIP_ALL_STATUSES=Object.keys(TRIP_STATUS_RANK);function canTransitionTripStatus(e,t){return e in TRIP_STATUS_RANK&&t in TRIP_STATUS_RANK&&(e!==t&&("completed"!==e&&TRIP_STATUS_RANK[t]>=TRIP_STATUS_RANK[e]))}function nextTripStatuses(e){return TRIP_ALL_STATUSES.filter(t=>canTransitionTripStatus(e,t))}function canUpdateTripStatus(e){if(!e)return!1;if(isAdmin()||isClerk()||isDispatch())return!0;if(isDriver()){const t=myDriverRecord();return!!t&&e.driverId===t.id}return!1}async function applyTripStatus(e,t,i){if(!canUpdateTripStatus(e))return{ok:!1,reason:"permission"};if(!canTransitionTripStatus(e.status,t))return{ok:!1,reason:"transition",from:e.status};const n=e.status,a=state.db.trucks.find(t=>t.id===e.truckId),o=state.db.drivers.find(t=>t.id===e.driverId),r=a?{...a}:null,s=o?{...o}:null;e.status=t;let d=!1,l=!1,c=null;if("breakdown"===t){a&&(a.status="breakdown",d=!0);const t=state.db.maintenance.find(t=>t.truckId===e.truckId&&"resolved"!==t.status&&"Breakdown"===t.type);t?t.reportedByDriver=t.reportedByDriver||isDriver():(c={id:uid("MNT"),truckId:e.truckId,type:"Breakdown",desc:`Breakdown reported on trip ${e.container} (${e.origin} → ${e.dest}).`,priority:"critical",status:"open",date:(new Date).toISOString(),cost:0,tech:"",resolvedDate:null,reportedByDriver:isDriver()},state.db.maintenance.push(c))}"completed"===t&&(a&&"on_trip"===a.status&&(a.status="available",d=!0),o&&"on_trip"===o.status&&(o.status="available",l=!0),o&&(o.load=null,o.tripsToday++,l=!0));try{const t=[supabase.from("trips").update(tripToRow(e)).eq("id",e.id)];a&&d&&t.push(supabase.from("trucks").update(truckToRow(a)).eq("id",a.id)),o&&l&&t.push(supabase.from("drivers").update(driverToRow(o)).eq("id",o.id));const i=(await Promise.all(t)).find(e=>e&&e.error);if(i)throw i.error;if(c){const{error:e}=await supabase.from("maintenance").insert(maintToRow(c));if(e)throw e}}catch(t){if(console.error("Trip status save failed:",t&&t.message,t),e.status=n,a&&r&&Object.assign(a,r),o&&s&&Object.assign(o,s),c){const e=state.db.maintenance.indexOf(c);e>-1&&state.db.maintenance.splice(e,1)}return buildBadges(),{ok:!1,reason:"save",error:t,message:t&&t.message||""}}if("breakdown"===t&&buildAlerts(),buildBadges(),addAudit(i,"Trip Status Update",`${e.container} ${n} → ${t}`),"completed"===t&&e.storageZoneId&&!e.storageReleased)try{const t=await window.bookingDocs.releaseStorageForTrip(e.id);t&&t.released&&(e.storageReleased=!0)}catch(e){console.error("Depot storage release failed:",e&&e.message,e),toast(`Trip completed, but couldn't auto-release depot storage — release it manually from DepOps (${e&&e.message||"error"})`,"warning",6e3)}return{ok:!0,old:n,status:t}}async function quickSetTripStatus(e,t){const i=state.db.trips.find(t=>t.id===e);if(!i)return void toast("Trip not found","error");if(!canUpdateTripStatus(i))return void toast("You do not have permission to update this trip","error");toast("Saving…","info",1200);const n=await applyTripStatus(i,t,state.profile.username);n.ok?(closeModal(),document.getElementById("tripsList")&&renderTrips(_tripFilter),toast(`Trip updated to ${t.replace("_"," ")}`,"success")):"transition"===n.reason?toast(`Cannot change status from "${n.from.replace("_"," ")}" to "${t.replace("_"," ")}" — trips can only move forward`,"error"):"save"===n.reason?toast(n.message?`Could not save this update — ${n.message}`:"Could not save this update — check your connection and try again","error",5e3):toast("You do not have permission to update this trip","error")}const DRIVER_TRIP_STEPS=["loaded","on_trip","offloaded","breakdown","completed"];let _dpTab="trip";function renderDriverPortal(){const e=state.profile,t=document.getElementById("dp_driverAv");t&&(t.textContent=initials(e?.name||"D"));const i=document.getElementById("dp_driverName");i&&(i.textContent=e?.name||"Driver");const n=document.getElementById("dp_driverRole");n&&(n.textContent=roleLabel(e?.role));const a=document.getElementById("dp_body");if(!a)return;const o=myDriverRecord();o?(checkGeoPermission().then(()=>{driverShouldTrack(o)&&"denied"!==state.geoPermission?startDriverTracking():driverShouldTrack(o)||stopDriverTracking(),renderDutyBar()}),renderDutyBar(),a.innerHTML=`\n    <div class="filter-row" style="margin-bottom:14px;flex-wrap:wrap">\n      <button class="filter-btn${"trip"===_dpTab?" active":""}" onclick="dpSwitchTab('trip')">My Trip</button>\n      <button class="filter-btn${"completed"===_dpTab?" active":""}" onclick="dpSwitchTab('completed')">Completed Trips</button>\n      <button class="filter-btn${"fuel"===_dpTab?" active":""}" onclick="dpSwitchTab('fuel')">Fuel Log</button>\n      <button class="filter-btn${"requisitions"===_dpTab?" active":""}" onclick="dpSwitchTab('requisitions')">Requisitions</button>\n      <button class="filter-btn${"workshop"===_dpTab?" active":""}" onclick="dpSwitchTab('workshop')">Workshop</button>\n      <button class="filter-btn${"shutouts"===_dpTab?" active":""}" onclick="dpSwitchTab('shutouts')">Shutouts</button>\n    </div>\n    <div id="dp_tabBody"></div>\n  `,dpRenderTab(o)):a.innerHTML='<div class="empty-state"><div class="empty-state-icon">🚚</div><div class="empty-state-label">Your login isn\'t linked to a driver record yet. Ask an administrator to link it in Driver → Edit.</div></div>'}function dpSwitchTab(e){_dpTab=e,renderDriverPortal()}function dpRenderTab(e){const t=document.getElementById("dp_tabBody");if(t)return"trip"===_dpTab?dpRenderTripTab(t,e):"completed"===_dpTab?dpRenderCompletedTripsTab(t,e):"fuel"===_dpTab?dpRenderFuelTab(t,e):"requisitions"===_dpTab?dpRenderReqTab(t,e):"workshop"===_dpTab?dpRenderWorkshopTab(t,e):"shutouts"===_dpTab?dpRenderShutoutTab(t,e):void 0}function dpRenderTripTab(e,t){const i=t.truckId?state.db.trucks.find(e=>e.id===t.truckId):null,n=state.db.trips.filter(e=>e.driverId===t.id&&"completed"!==e.status).sort((e,t)=>new Date(t.startTime)-new Date(e.startTime))[0];e.innerHTML=`\n    <div class="panel" style="margin-bottom:14px">\n      <div class="panel-head"><span class="panel-title">My Truck</span>${i?sbadge(i.status):""}</div>\n      <div style="padding:14px;font-size:13px;color:var(--text);display:flex;justify-content:space-between;align-items:center">\n        <span>${i?`${i.reg} — ${i.make}`:"No truck currently assigned"}</span>\n        ${i?`<button class="action-btn danger" style="flex-shrink:0" onclick="driverReportBreakdown('${i.id}')">⚠ Report Breakdown</button>`:""}\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Active Trip</span></div>\n      <div style="padding:14px">\n        ${n?`\n          <div style="margin-bottom:12px">\n            <div class="mono" style="color:var(--gold);font-size:15px">${n.container}</div>\n            <div style="font-size:12px;color:var(--text-2);margin-top:2px">${n.origin} → ${n.dest}</div>\n            <div style="font-size:11px;color:var(--text-3);margin-top:4px">${n.workType} · ${n.ctype}</div>\n            <div style="margin-top:8px">${sbadge(n.status)}</div>\n          </div>\n          <div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Update Trip Step (forward only)</div>\n          <div style="display:flex;gap:6px;flex-wrap:wrap">\n            ${nextTripStatuses(n.status).filter(e=>DRIVER_TRIP_STEPS.includes(e)).map(e=>`<button class="filter-btn" onclick="driverAdvanceTrip('${n.id}','${e}')">${e.replace("_"," ")}</button>`).join("")||'<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>'}\n          </div>\n        `:'<div class="empty-state"><div class="empty-state-label">No active trip assigned right now</div></div>'}\n      </div>\n    </div>\n  `}async function driverAdvanceTrip(e,t){const i=myDriverRecord(),n=state.db.trips.find(t=>t.id===e);if(!i||!n||n.driverId!==i.id)return void toast("Not authorized for this trip","error");if(!DRIVER_TRIP_STEPS.includes(t))return void toast("Invalid status","error");toast("Saving…","info",1200);const a=await applyTripStatus(n,t,state.profile.username);if(!a.ok)return"transition"===a.reason?toast(`Cannot change status from "${a.from.replace("_"," ")}" to "${t.replace("_"," ")}" — trips can only move forward`,"error"):"save"===a.reason?toast(a.message?`Could not save this update — ${a.message}`:"Could not save this update — check your connection and try again","error",5e3):toast("Not authorized for this trip","error"),void renderDriverPortal();toast("breakdown"===t?"Breakdown reported — dispatch notified":`Trip updated to ${t.replace("_"," ")}`,"breakdown"===t?"error":"success"),renderDriverPortal()}function dpRenderCompletedTripsTab(e,t){const i=state.db.trips.filter(e=>e.driverId===t.id&&"completed"===e.status).sort((e,t)=>new Date(t.eta)-new Date(e.eta));e.innerHTML=`\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Completed Trips</span><span class="panel-meta">${i.length} total</span></div>\n      <div class="table-wrap"><table class="data-table">\n        <thead><tr><th>Container</th><th>Route</th><th>Type</th><th>Distance</th><th>Completed</th><th>Reference</th></tr></thead>\n        <tbody>\n          ${i.length?i.map(e=>`<tr onclick="showTripDetail('${e.id}')" style="cursor:pointer"><td class="mono" style="color:var(--gold)">${e.container}</td><td>${e.origin} → ${e.dest}</td><td>${e.ctype}</td><td>${e.distance}km</td><td>${fmtDate(e.eta)}</td><td class="mono" style="font-size:10px;color:var(--text-3)">${e.ref}</td></tr>`).join(""):'<tr><td colspan="6" class="empty-td">No completed trips yet</td></tr>'}\n        </tbody>\n      </table></div>\n    </div>\n  `}const GEO_PING_INTERVAL_MS=1e4,ZONE_LOOKUP_INTERVAL_MS=6e4;let _lastZoneVal=null,_lastZoneFetch=0;function driverShouldTrack(e){if(!e||!e.truckId||"off_duty"===e.status||"suspended"===e.status)return!1;const t=state.db?.trucks?.find(t=>t.id===e.truckId);return!t?.wialonUnitId}async function checkGeoPermission(){if(navigator.permissions?.query)try{const e=await navigator.permissions.query({name:"geolocation"});state.geoPermission=e.state,state._geoPermWatched||(state._geoPermWatched=!0,e.onchange=()=>{state.geoPermission=e.state;const t=myDriverRecord();"granted"===e.state&&driverShouldTrack(t)&&startDriverTracking(),"denied"===e.state&&stopDriverTracking(),renderDutyBar()})}catch{state.geoPermission="unknown"}else state.geoPermission="unknown"}function requestLocationAccess(){driverShouldTrack(myDriverRecord())&&(navigator.geolocation?(toast("Requesting location access…","info",1500),navigator.geolocation.getCurrentPosition(e=>{state.geoPermission="granted",onDriverPosition(e),startDriverTracking()},e=>{e.code===e.PERMISSION_DENIED&&(state.geoPermission="denied"),onDriverGeoError(e)},{enableHighAccuracy:!0,timeout:15e3,maximumAge:0})):toast("This device does not support GPS location","error"))}function startDriverTracking(){driverShouldTrack(myDriverRecord())?null==state.geoWatchId&&(navigator.geolocation?"denied"!==state.geoPermission?state.geoWatchId=navigator.geolocation.watchPosition(onDriverPosition,onDriverGeoError,{enableHighAccuracy:!0,maximumAge:5e3,timeout:2e4}):renderDutyBar():toast("This device does not support GPS location","error")):stopDriverTracking()}async function stopDriverTracking(e){if(null!=state.geoWatchId&&(navigator.geolocation.clearWatch(state.geoWatchId),state.geoWatchId=null),state.trackingActive=!1,e){const e=myDriverRecord();if(e?.truckId){const{error:t}=await supabase.from("tracking_positions").delete().eq("truck_id",e.truckId);t&&console.error("tracking_positions clear failed:",t.message),delete state.db.trackingPositions[e.truckId],"livetracking"===state.currentSection&&(renderTracking(),updateTrackingMarkers())}}renderDutyBar()}function headingToCompass(e){if(null==e||isNaN(e))return"—";return["N","NE","E","SE","S","SW","W","NW"][Math.round(e/45)%8]}async function onDriverPosition(e){const t=Date.now();if(t-state.lastGeoSend<1e4)return;state.lastGeoSend=t;const i=myDriverRecord();if(!driverShouldTrack(i))return void stopDriverTracking();const{latitude:n,longitude:a,speed:o,heading:r}=e.coords,s=null!=o&&o>=0&&!isNaN(o)?Math.round(3.6*o):0,d=headingToCompass(r);let l=_lastZoneVal;(!l||t-_lastZoneFetch>6e4)&&(l=await reverseGeocodeZone(n,a),_lastZoneVal=l,_lastZoneFetch=t);const c={truck_id:i.truckId,lat:n,lng:a,speed:s,heading:d,zone:l,last_update:(new Date).toISOString(),source:"driver_app"},{error:p}=await supabase.from("tracking_positions").upsert(c,{onConflict:"truck_id"});p?console.error("tracking ping failed:",p.message):(state.db.trackingPositions[i.truckId]={lat:n,lng:a,speed:s,heading:d,zone:l,lastUpdate:c.last_update,source:"driver_app"},"livetracking"===state.currentSection&&(renderTracking(),updateTrackingMarkers())),state.trackingActive=!0,renderDutyBar()}function onDriverGeoError(e){state.trackingActive=!1;let t="GPS signal lost — retrying…";e.code===e.PERMISSION_DENIED?(t="Location permission denied — enable location access to allow tracking",state.geoPermission="denied"):e.code===e.POSITION_UNAVAILABLE&&(t="Location unavailable — check your device GPS/network"),toast(t,"error",4500),renderDutyBar()}let _nominatimQueue=Promise.resolve();function reverseGeocodeZone(e,t){const i=_nominatimQueue.then(async()=>{try{const i=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e}&lon=${t}&format=jsonv2&zoom=14&addressdetails=1`,{headers:{"Accept-Language":"en"}}),n=await i.json(),a=n.address||{};return a.suburb||a.neighbourhood||a.quarter||a.city_district||a.town||a.city||a.village||(n.display_name||"").split(",")[0]||`${e.toFixed(4)}, ${t.toFixed(4)}`}catch(i){return console.warn("Reverse geocode failed:",i),`${e.toFixed(4)}, ${t.toFixed(4)}`}finally{await new Promise(e=>setTimeout(e,1100))}});return _nominatimQueue=i,i}const WIALON_POLL_INTERVAL_MS=25e3;let _wialonSid=null,_wialonPollTimer=null,_wialonLastZoneFetch={};function wialonConfig(){const e=state.db?.settings||{};return{enabled:!!e.wialonEnabled,token:(e.wialonToken||"").trim(),host:(e.wialonHost||"https://hst-api.wialon.com").trim().replace(/\/+$/,"")}}function wialonTrackedTrucks(){return(state.db?.trucks||[]).filter(e=>e.wialonUnitId)}async function wialonApi(e,t,i,n){const a=`${e}/wialon/ajax.html?svc=${encodeURIComponent(t)}&params=${encodeURIComponent(JSON.stringify(i))}${n?`&sid=${encodeURIComponent(n)}`:""}`,o=await fetch(a);if(!o.ok)throw new Error(`Wialon HTTP ${o.status}`);const r=await o.json();if(r&&"number"==typeof r.error&&0!==r.error){const e=new Error(`Wialon error ${r.error}`);throw e.wialonCode=r.error,e}return r}async function wialonLogin(e){const{token:t,host:i}=wialonConfig();if(!t)throw new Error("No Wialon API token configured");if(_wialonSid&&!e)return _wialonSid;const n=await wialonApi(i,"token/login",{token:t});if(!n?.eid)throw new Error("Wialon login did not return a session id");return _wialonSid=n.eid,_wialonSid}async function wialonFetchAllUnits(){const{host:e}=wialonConfig(),t={itemsType:"avl_unit",propName:"sys_name",propValueMask:"*",sortType:"sys_name"};let i=await wialonLogin();try{return await wialonApi(e,"core/search_items",{spec:t,force:1,flags:1025,from:0,to:0},i)}catch(n){if(1===n.wialonCode||4===n.wialonCode)return i=await wialonLogin(!0),await wialonApi(e,"core/search_items",{spec:t,force:1,flags:1025,from:0,to:0},i);throw n}}async function pollWialonPositions(){const e=wialonConfig();if(!e.enabled||!e.token)return;const t=wialonTrackedTrucks();if(!t.length)return;let i;try{i=await wialonFetchAllUnits()}catch(e){return void console.warn("Wialon poll failed:",e.message)}const n={};(i?.items||[]).forEach(e=>{n[String(e.id)]=e});let a=!1;for(const e of t){const t=n[String(e.wialonUnitId)],i=t?.pos;if(!i)continue;const o=Math.max(0,Math.round(i.s||0)),r=headingToCompass(i.c);let s=state.db.trackingPositions?.[e.id]?.zone;if(!s||Date.now()-(_wialonLastZoneFetch[e.id]||0)>6e4){try{s=await reverseGeocodeZone(i.y,i.x)}catch{}_wialonLastZoneFetch[e.id]=Date.now()}const d=i.t?new Date(1e3*i.t).toISOString():(new Date).toISOString(),l={truck_id:e.id,lat:i.y,lng:i.x,speed:o,heading:r,zone:s,last_update:d,source:"wialon"},{error:c}=await supabase.from("tracking_positions").upsert(l,{onConflict:"truck_id"});c?console.error("Wialon tracking write failed:",e.reg,c.message):(state.db.trackingPositions[e.id]={lat:i.y,lng:i.x,speed:o,heading:r,zone:s,lastUpdate:d,source:"wialon"},a=!0)}a&&"livetracking"===state.currentSection&&(renderTracking(),updateTrackingMarkers())}function startWialonPolling(){const e=wialonConfig();e.enabled&&e.token&&wialonTrackedTrucks().length?_wialonPollTimer||(pollWialonPositions(),_wialonPollTimer=setInterval(pollWialonPositions,WIALON_POLL_INTERVAL_MS)):stopWialonPolling()}function stopWialonPolling(){_wialonPollTimer&&(clearInterval(_wialonPollTimer),_wialonPollTimer=null),_wialonSid=null}async function testWialonConnection(){const e=document.getElementById("st_wialonHost"),t=document.getElementById("st_wialonToken"),i=(e?.value||"https://hst-api.wialon.com").trim().replace(/\/+$/,""),n=(t?.value||"").trim();if(n){toast("Testing Wialon connection…","info",1500);try{const e=await wialonApi(i,"token/login",{token:n});if(!e?.eid)throw new Error("No session returned");_wialonSid=e.eid,toast(`Connected to Wialon${e.user?.nm?" as "+e.user.nm:""} ✓`,"success")}catch(e){toast(`Wialon connection failed — ${e.message}`,"error")}}else toast("Enter a Wialon API token first","error")}function saveWialonSettings(){const e=!!document.getElementById("st_wialonEnabled")?.checked,t=(document.getElementById("st_wialonHost")?.value||"").trim()||"https://hst-api.wialon.com",i=(document.getElementById("st_wialonToken")?.value||"").trim();state.db.settings=state.db.settings||{},state.db.settings.wialonEnabled=e,state.db.settings.wialonHost=t,state.db.settings.wialonToken=i,scheduleSave(),addAudit(state.profile.username,"Wialon Settings","GPS integration "+(e?"enabled":"disabled")),toast("Wialon settings saved","success"),renderSettings(),e?startWialonPolling():stopWialonPolling()}function saveTruckWialonId(e){const t=state.db.trucks.find(t=>t.id===e);if(!t)return;const i=(document.getElementById("tw_wialonId")?.value||"").trim();t.wialonUnitId=i,scheduleSave(),addAudit(state.profile.username,"Wialon Unit Linked",`${t.reg} → ${i||"(cleared)"}`),toast(i?`${t.reg} linked to Wialon unit ${i}`:`${t.reg} unlinked from Wialon`,"success"),showTruckDetail(e),state.db.settings?.wialonEnabled&&startWialonPolling()}function dpToggleDuty(){const e=myDriverRecord();if(!e)return;if("off_duty"!==e.status&&"suspended"!==e.status)openModal("Go Off Duty",'\n      <div class="ops-notice" style="margin-bottom:14px">Going off duty will immediately stop live GPS tracking for your truck and mark you unavailable for new trips. You can go back on duty any time.</div>\n      <button class="submit-btn" style="background:var(--red)" onclick="confirmGoOffDuty()">Confirm — Go Off Duty</button>\n    ');else{const t=state.db.trips.some(t=>t.driverId===e.id&&"completed"!==t.status);e.status=t?"on_trip":"available",scheduleSave(),addAudit(state.profile.username,"Duty Status",`${e.name} went ON duty`),toast("You are now on duty — location tracking started","success"),renderDriverPortal()}}function confirmGoOffDuty(){const e=myDriverRecord();e&&(e.status="off_duty",scheduleSave(),addAudit(state.profile.username,"Duty Status",`${e.name} went OFF duty`),closeModal(),stopDriverTracking(!0),toast("You are now off duty — location tracking stopped","info"),renderDriverPortal())}function renderDutyBar(){const e=document.getElementById("dp_dutyBar");if(!e)return;const t=myDriverRecord();if(!t)return void(e.innerHTML="");const i="off_duty"!==t.status&&"suspended"!==t.status,n=state.trackingActive&&i,a=t.truckId?state.db.trackingPositions[t.truckId]:null,o=i&&t.truckId&&!n&&"denied"!==state.geoPermission,r=i&&t.truckId&&"denied"===state.geoPermission;let s;s=t.truckId?i?r?"Location access is blocked for this site":n&&a?`Live · ${a.zone} · updated ${timeAgo(a.lastUpdate)}`:o?"Location access needed to start tracking":"Acquiring GPS signal…":"Tracking stopped":"No truck assigned — tracking unavailable",e.innerHTML=`\n    <div class="duty-bar">\n      <div class="duty-status">\n        <span class="duty-dot ${n?"live":""}"></span>\n        <div>\n          <div class="duty-label">${i?"on_trip"===t.status?"On Duty · On Trip":"On Duty · Available":"Off Duty"}</div>\n          <div class="duty-sub">${s}</div>\n        </div>\n      </div>\n      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">\n        ${o?'<button class="action-btn duty-cta" onclick="requestLocationAccess()">📍 Enable Location Tracking</button>':""}\n        <button class="action-btn ${i?"danger":""}" onclick="dpToggleDuty()">${i?"Go Off Duty":"Go On Duty"}</button>\n      </div>\n    </div>\n    ${r?'\n      <div class="duty-blocked-banner">\n        <b>Location is blocked for this site.</b> Your truck can\'t be tracked until you re-enable it:\n        <ul>\n          <li><b>Chrome/Android:</b> tap the lock icon next to the address bar → Permissions → Location → Allow</li>\n          <li><b>Safari/iOS:</b> Settings app → Safari (or this app, if installed to Home Screen) → Location → Allow</li>\n        </ul>\n        Then tap <b>Enable Location Tracking</b> above again.\n      </div>\n    ':""}\n  `}function driverReportBreakdown(e){openModal("Report Breakdown",`\n    <div class="ops-notice" style="margin-bottom:12px">This will immediately flag your truck as broken down and alert dispatch/admin as a priority.</div>\n    <div class="fg"><label>What's wrong?</label><textarea id="bd_desc" rows="3" placeholder="Describe the breakdown…"></textarea></div>\n    <div class="fg"><label>Location</label><input id="bd_loc" placeholder="e.g. B8 Highway, near Miritini"/></div>\n    <button class="submit-btn" onclick="submitDriverBreakdown('${e}')">🚨 Submit Breakdown Report →</button>\n  `)}async function submitDriverBreakdown(e){const t=document.getElementById("bd_desc").value.trim();if(!t)return void toast("Please describe the issue","error");const i=sanitize(document.getElementById("bd_loc").value.trim()),n=state.db.trucks.find(t=>t.id===e),a=n?{...n}:null;n&&(n.status="breakdown");const o={id:uid("MNT"),truckId:e,type:"Breakdown",desc:i?`${t} (Location: ${i})`:t,priority:"critical",status:"open",date:(new Date).toISOString(),cost:0,tech:"",resolvedDate:null,reportedByDriver:!0};state.db.maintenance.push(o),buildBadges(),buildAlerts(),toast("Saving…","info",1200);if(!(await saveNowAwaited()).ok){n&&a&&Object.assign(n,a);const e=state.db.maintenance.indexOf(o);return e>-1&&state.db.maintenance.splice(e,1),buildBadges(),buildAlerts(),void toast("Could not submit breakdown report — check your connection and try again","error",5e3)}addAudit(state.profile.username,"Driver Breakdown Report",`${truckName(e)} — ${t.slice(0,60)}`),closeModal(),toast("Breakdown reported — dispatch notified","error"),renderDriverPortal()}function dpRenderFuelTab(e,t){const i=state.db.fuel.filter(e=>e.driverId===t.id).sort((e,t)=>new Date(t.date)-new Date(e.date));e.innerHTML=`\n    <div class="form-card" style="margin-bottom:14px">\n      <div class="form-card-head">Log Fuel Fill-up</div>\n      <div class="form-card-body">\n        <div class="form-row-2">\n          <div class="fg"><label>Litres</label><input id="dp_f_litres" type="number" placeholder="180"/></div>\n          <div class="fg"><label>Price / Litre (KSh)</label><input id="dp_f_price" type="number" placeholder="155"/></div>\n        </div>\n        <div class="form-row-2">\n          <div class="fg"><label>Station</label><input id="dp_f_station" placeholder="Kobil Shimanzi"/></div>\n          <div class="fg"><label>Odometer (km)</label><input id="dp_f_odo" type="number" placeholder="142300"/></div>\n        </div>\n        <div class="fg"><label>Receipt No. <span class="label-optional">(optional)</span></label><input id="dp_f_receipt" placeholder="RCP-000"/></div>\n        <button class="submit-btn" onclick="dpAddFuelLog()">Save Fuel Log →</button>\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Fuel History</span><span class="panel-meta">${i.length} entries</span></div>\n      <div class="table-wrap"><table class="data-table">\n        <thead><tr><th>Date</th><th>Litres</th><th>Price/L</th><th>Total</th><th>Station</th></tr></thead>\n        <tbody>${i.map(e=>`<tr><td class="mono" style="font-size:10px">${fmtDate(e.date)}</td><td class="mono">${fmt(e.litres)} L</td><td class="mono">${fmt(e.pricePerLitre)}</td><td class="mono" style="color:var(--gold);font-weight:700">${fmtKsh(e.litres*e.pricePerLitre)}</td><td style="font-size:11px;color:var(--text-3)">${e.station}</td></tr>`).join("")||'<tr><td colspan="5" class="empty-td">No fuel logs yet</td></tr>'}</tbody>\n      </table></div>\n    </div>\n  `}function dpAddFuelLog(){const e=myDriverRecord();if(!e)return;const t=parseFloat(document.getElementById("dp_f_litres").value)||0,i=parseFloat(document.getElementById("dp_f_price").value)||0;if(t<=0||i<=0)return void toast("Litres and price are required","error");if(t>1e3)return void toast("Litres exceed reasonable limit (1000L)","error");const n={id:uid("FUEL"),truckId:e.truckId||null,driverId:e.id,date:(new Date).toISOString(),litres:t,pricePerLitre:i,station:sanitize(document.getElementById("dp_f_station").value.trim())||"Unknown",odometer:Math.max(0,parseInt(document.getElementById("dp_f_odo").value)||0),receipt:document.getElementById("dp_f_receipt").value.trim()||uid("RCP")};state.db.fuel.push(n);const a=e.truckId?state.db.trucks.find(t=>t.id===e.truckId):null;a&&(a.fuelPct=Math.min(100,Math.round(t/400*100+a.fuelPct)),a.mileage=n.odometer||a.mileage),scheduleSave(),addAudit(state.profile.username,"Fuel Log (Driver)",`${truckName(e.truckId)} — ${t}L at KSh ${i}/L`),toast(`Fuel log saved — ${fmtKsh(t*i)}`,"success"),renderDriverPortal()}function dpRenderReqTab(e,t){const i=state.db.requisitions.filter(e=>e.requesterId===state.profile.id||e.requester===state.profile.name||e.requester===t.id).sort((e,t)=>new Date(t.date)-new Date(e.date));e.innerHTML=`\n    <div class="form-card" style="margin-bottom:14px">\n      <div class="form-card-head">New Requisition</div>\n      <div class="form-card-body">\n        <div class="form-row-2">\n          <div class="fg"><label>Category</label><select id="dp_rq_cat"><option>Fuel Advance</option><option>Tyre Parts</option><option>Tool Purchase</option><option>Medical</option><option>Lubricants</option><option>Other</option></select></div>\n          <div class="fg"><label>Amount (KSh)</label><input id="dp_rq_amt" type="number" placeholder="0"/></div>\n        </div>\n        <div class="fg"><label>Items / Description</label><textarea id="dp_rq_items" rows="3" placeholder="List what is needed…"></textarea></div>\n        <div class="fg"><label>Notes</label><input id="dp_rq_notes" placeholder="Additional context…"/></div>\n        <button class="submit-btn" onclick="dpSaveRequisition()">Submit Requisition →</button>\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Requisitions</span><span class="panel-meta">${i.length}</span></div>\n      <div>${i.map(e=>`<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${e.category}</div><div class="req-meta">${e.id} · ${fmtDate(e.date)}</div></div><div style="text-align:right">${sbadge(e.status)}<div class="req-amount" style="margin-top:4px">${fmtKsh(e.amount)}</div></div></div><div class="req-items">${e.items}</div></div>`).join("")||'<div class="empty-state"><div class="empty-state-label">No requisitions submitted yet</div></div>'}</div>\n    </div>\n  `}function dpSaveRequisition(){const e=document.getElementById("dp_rq_items").value.trim(),t=Math.max(0,parseInt(document.getElementById("dp_rq_amt").value)||0);e&&t?state.profile?.id?(state.db.requisitions.push({id:uid("REQ"),requester:state.profile.name,requesterId:state.profile.id,category:document.getElementById("dp_rq_cat").value,items:e,amount:t,notes:sanitize(document.getElementById("dp_rq_notes").value.trim()),date:(new Date).toISOString(),status:"pending",approver:null,approvedDate:null}),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Requisition Submitted (Driver)",`${e.slice(0,50)}…`),toast("Requisition submitted — pending approval","success"),renderDriverPortal()):toast("Session error — please log in again","error"):toast("Items and amount required","error")}function dpRenderWorkshopTab(e,t){const i=t.truckId?state.db.trucks.find(e=>e.id===t.truckId):null,n=i?state.db.workshop.filter(e=>e.truckId===i.id).sort((e,t)=>new Date(t.reported)-new Date(e.reported)):[];e.innerHTML=`\n    <div class="form-card" style="margin-bottom:14px">\n      <div class="form-card-head">Report Vehicle Issue</div>\n      <div class="form-card-body">\n        ${i?`\n        <div class="fg"><label>Truck</label><div class="mono" style="padding:8px;background:var(--surface);border-radius:5px;color:var(--gold)">${i.reg} — ${i.make}</div></div>\n        <div class="fg"><label>Job Title</label><input id="dp_ws_title" placeholder="Describe the issue…"/></div>\n        <div class="fg"><label>Description</label><textarea id="dp_ws_desc" rows="3" placeholder="Detailed description…"></textarea></div>\n        <button class="submit-btn" onclick="dpSaveWorkshopJob('${i.id}')">Submit Job Card →</button>\n        `:'<div class="ops-notice">No truck currently assigned — an admin must assign one before you can log a workshop job.</div>'}\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Truck's Workshop Jobs</span><span class="panel-meta">${n.length}</span></div>\n      <div>${n.map(e=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${e.title}</div><div style="font-size:10.5px;color:var(--text-3);margin-top:2px">${e.id}</div></div>${sbadge(e.status)}</div><div style="font-size:11.5px;color:var(--text-2)">${e.desc}</div></div>`).join("")||'<div class="empty-state"><div class="empty-state-label">No workshop jobs for your truck</div></div>'}</div>\n    </div>\n  `}function dpSaveWorkshopJob(e){const t=document.getElementById("dp_ws_title").value.trim();t?(state.db.workshop.push({id:uid("WS"),truckId:e,title:t,desc:sanitize(document.getElementById("dp_ws_desc").value.trim()),tech:"",parts:"",labour:0,total:0,status:"reported",reported:(new Date).toISOString(),diagnosed:null}),scheduleSave(),addAudit(state.profile.username,"Workshop Job Reported (Driver)",t),toast("Job card submitted to workshop","success"),renderDriverPortal()):toast("Job title required","error")}function dpRenderShutoutTab(e,t){const i=state.db.shutouts.filter(e=>e.driverId===t.id).sort((e,t)=>new Date(t.date)-new Date(e.date));e.innerHTML=`\n    <div class="form-card" style="margin-bottom:14px">\n      <div class="form-card-head">Report Shutout</div>\n      <div class="form-card-body">\n        <div class="fg"><label>Container No.</label><input id="dp_sh_cont" list="containerHistory" placeholder="MSCU1234566" oninput="markContainerValidity(this)"/></div>\n        <div class="form-row-2">\n          <div class="fg"><label>Vessel</label><input id="dp_sh_vessel" placeholder="MSC VESSEL NAME"/></div>\n          <div class="fg"><label>Voyage No.</label><input id="dp_sh_voyage" placeholder="VA-001"/></div>\n        </div>\n        <div class="fg"><label>Shipping Line</label><select id="dp_sh_line">${state.db.shippingLines.map(e=>`<option value="${e.id}">${e.code}</option>`).join("")}</select></div>\n        <div class="fg"><label>Reason</label><input id="dp_sh_reason" placeholder="Why was this shutout?"/></div>\n        <div class="fg"><label>Notes</label><textarea id="dp_sh_notes" rows="2"></textarea></div>\n        <button class="submit-btn" onclick="dpSaveShutout('${t.id}')">Flag Shutout →</button>\n      </div>\n    </div>\n    <div class="panel">\n      <div class="panel-head"><span class="panel-title">My Shutout Reports</span><span class="panel-meta">${i.length}</span></div>\n      <div>${i.map(e=>`<div class="shutout-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">${e.container}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${e.vessel} · Voyage ${e.voyage}</div></div>${sbadge(e.status)}</div><div style="font-size:11.5px;color:var(--text-2)">Reason: ${e.reason}</div></div>`).join("")||'<div class="empty-state"><div class="empty-state-label">No shutouts reported yet</div></div>'}</div>\n    </div>\n  `}function dpSaveShutout(e){const t=document.getElementById("dp_sh_cont").value.trim().toUpperCase();if(!t)return void toast("Container number required","error");if(!/^[A-Z0-9]{4,12}$/.test(t))return void toast("Invalid container format","error");const i=state.db.drivers.find(t=>t.id===e);state.db.shutouts.push({id:uid("SHT"),container:t,line:document.getElementById("dp_sh_line").value,vessel:sanitize(document.getElementById("dp_sh_vessel").value.trim()),voyage:sanitize(document.getElementById("dp_sh_voyage").value.trim()),reason:sanitize(document.getElementById("dp_sh_reason").value.trim()),truckId:i?.truckId||null,driverId:e,notes:sanitize(document.getElementById("dp_sh_notes").value.trim()),date:(new Date).toISOString(),status:"open"}),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Shutout Flagged (Driver)",t),toast("Shutout flagged","success"),renderDriverPortal()}let _dispatchEditingTripId=null,_dispatchContainerImages=[];function renderDispatch(){populateDispatchSelects(),renderDispatchQueue(),renderAwaitingDispatch()}function populateDispatchSelects(){const e=state.db.trucks.filter(e=>"available"===e.status),t=state.db.drivers.filter(e=>"available"===e.status);fillSelect("d_truck",e,e=>[e.id,`${e.reg} — ${e.make} (Fuel: ${e.fuelPct}%)`]),fillSelect("d_driver",t,e=>[e.id,e.name]),fillSelect("d_line",state.db.shippingLines.filter(e=>e.active),e=>[e.id,`${e.code} — ${e.name}`]),populateSizeTypeSelects("d_size","d_type")}function fillSelect(e,t,i){const n=document.getElementById(e);n&&(n.innerHTML='<option value="">Select…</option>'+t.map(e=>{const[t,n]=i(e);return`<option value="${t}">${n}</option>`}).join(""))}function renderDispatchQueue(){const e=state.db.trips.filter(e=>"active"===e.status).slice(-8).reverse(),t=document.getElementById("dispatchQueue");t&&(t.innerHTML=`<div class="panel"><div class="panel-head"><span class="panel-title">Dispatch Queue</span><span class="panel-meta">${e.length} active</span></div><div>${e.map(e=>`<div class="dispatch-queue-item" onclick="showTripDetail('${e.id}')"><div class="dqi-ref">${e.container.slice(-7)}</div><div class="dqi-route"><div style="font-size:12px;font-weight:600;color:var(--text)">${e.origin}→${e.dest}</div><div style="font-size:10px;color:var(--text-3)">${truckName(e.truckId)}</div></div>${sbadge(e.status)}<div class="dqi-time">${timeAgo(e.startTime)}</div></div>`).join("")||'<div class="empty-state" style="padding:20px"><div class="empty-state-label">No dispatches yet</div></div>'}</div></div>`)}function awaitingDispatchTrips(){return state.db.trips.filter(e=>isTripLive(e)&&(!e.truckId||!e.driverId))}function refreshAwaitingDispatchUI(){buildBadges(),refreshContainerHistory(),document.getElementById("awaitingDispatchList")&&renderAwaitingDispatch(),document.getElementById("allocQueue")&&renderAllocAuto(),document.getElementById("allocManualAwaitingList")&&renderAllocAwaitingList("allocManualAwaitingList","allocManualAwaitingMeta")}function renderAllocAwaitingList(e,t){const i=document.getElementById(e);if(!i)return;const n=awaitingDispatchTrips().sort((e,t)=>new Date(t.startTime)-new Date(e.startTime));if(t){const e=document.getElementById(t);e&&(e.textContent=n.length?`${n.length} awaiting`:"")}i.innerHTML=n.map(e=>`\n    <div class="dispatch-queue-item" style="cursor:default">\n      <div class="dqi-ref">${(e.container||"").slice(-7)}</div>\n      <div class="dqi-route">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">${e.origin} → ${e.dest}</div>\n        <div style="font-size:10px;color:var(--text-3)">${e.bookingId?"From public booking":"Needs truck & driver"} · ${e.workType}</div>\n      </div>\n      <button class="modal-btn primary" onclick="jumpToCompleteDispatch('${e.id}')">Match &amp; Dispatch →</button>\n    </div>\n  `).join("")||'<div class="empty-state" style="padding:20px"><div class="empty-state-icon">✅</div><div class="empty-state-label">Nothing awaiting dispatch</div></div>'}function jumpToCompleteDispatch(e){showSection("dispatch",document.querySelector('[data-section="dispatch"]')),loadTripIntoDispatchForm(e)}function renderAwaitingDispatch(){const e=document.getElementById("awaitingDispatchList"),t=document.getElementById("awaitingDispatchMeta");if(!e)return;const i=awaitingDispatchTrips().sort((e,t)=>new Date(t.startTime)-new Date(e.startTime));t&&(t.textContent=i.length?`${i.length} awaiting`:""),e.innerHTML=i.map(e=>`\n    <div class="dispatch-queue-item" style="cursor:default">\n      <div class="dqi-ref">${(e.container||"").slice(-7)}</div>\n      <div class="dqi-route">\n        <div style="font-size:12px;font-weight:600;color:var(--text)">${e.origin} → ${e.dest}</div>\n        <div style="font-size:10px;color:var(--text-3)">${e.bookingId?"From public booking":"Needs truck & driver"} · ${e.workType}</div>\n      </div>\n      <button class="modal-btn primary" onclick="loadTripIntoDispatchForm('${e.id}')">Complete Dispatch →</button>\n    </div>\n  `).join("")||'<div class="empty-state" style="padding:20px"><div class="empty-state-icon">✅</div><div class="empty-state-label">Nothing awaiting dispatch</div></div>'}function toggleDispatchOutwardType(){const e=document.getElementById("d_worktype").value,t=document.getElementById("d_outwardtype_row");if(t&&(t.style.display=isOutwardWorkType(e)?"block":"none",!isOutwardWorkType(e))){const e=document.getElementById("d_outwardtype");e&&(e.value="")}}function loadTripIntoDispatchForm(e){const t=state.db.trips.find(t=>t.id===e);if(!t)return void toast("Trip not found","error");_dispatchEditingTripId=e,_dispatchContainerImages=Array.isArray(t.containerImages)?[...t.containerImages]:[],switchDispatchTab("single",document.querySelector("#sec-dispatch .filter-btn")),populateDispatchSelects(),document.getElementById("d_truck").value=t.truckId||"",document.getElementById("d_driver").value=t.driverId||"",document.getElementById("d_container").value=t.container&&!t.container.startsWith("PUB-")?t.container:"",populateSizeTypeSelects("d_size","d_type",t.ctype||"20ft Dry"),document.getElementById("d_worktype").value=t.workType||"Port → Depot",document.getElementById("d_line").value=t.shippingLine||"";const i=document.getElementById("d_outwardtype");i&&(i.value=t.outwardType||""),toggleDispatchOutwardType(),document.getElementById("d_origin").value=t.origin&&"—"!==t.origin?t.origin:"",document.getElementById("d_dest").value=t.dest&&"—"!==t.dest?t.dest:"",document.getElementById("d_distance").value=t.distance||"",document.getElementById("d_priority").value=t.priority||"Normal",document.getElementById("d_ref").value=t.ref||"",document.getElementById("d_notes").value=t.notes||"",document.getElementById("d_eir").value=t.eirNumber||"",document.getElementById("d_receiving").value=t.receivingParty||"",document.getElementById("d_release_no").value=t.releaseOrderNo||"",document.getElementById("d_vessel").value=t.vessel||"",document.getElementById("d_voyage").value=t.voyage||"";const n=document.getElementById("d_dateout");n&&(n.value=""),renderContainerImgGrid();const a=document.getElementById("dispatchEditBanner");a&&(a.style.display="flex");const o=document.getElementById("dispatchSubmitBtn");o&&(o.textContent="Complete Dispatch →"),document.getElementById("dispatchTabSingle").scrollIntoView({behavior:"smooth",block:"start"})}function cancelDispatchEdit(){_dispatchEditingTripId=null,clearContainerImgs(),clearDispatchReleaseFile(),["d_truck","d_driver","d_container","d_origin","d_dest","d_distance","d_ref","d_notes","d_eir","d_receiving","d_release_no","d_vessel","d_voyage","d_dateout"].forEach(e=>{const t=document.getElementById(e);t&&(t.value="")});const e=document.getElementById("d_outwardtype");e&&(e.value=""),toggleDispatchOutwardType(),populateDispatchSelects();const t=document.getElementById("dispatchEditBanner");t&&(t.style.display="none");const i=document.getElementById("dispatchSubmitBtn");i&&(i.textContent="Create Dispatch Order →"),toast("Dispatch form cleared","info")}async function createDispatch(){const e=document.getElementById("d_truck").value,t=document.getElementById("d_driver").value,i=document.getElementById("d_container").value.trim().toUpperCase(),n=document.getElementById("d_origin").value.trim(),a=document.getElementById("d_dest").value.trim(),o=parseInt(document.getElementById("d_distance").value)||0,r=_dispatchEditingTripId;if(!i)return void toast("Container number is required","error");const s=containerFormatIssue(i);if(s)return void toast(`Container number: ${s}`,"error");const d=findLiveTripByContainer(i,r||void 0);if(d)return void toast(`${i} is already on an active trip (${d.origin} → ${d.dest}, status: ${d.status.replace("_"," ")}). Complete or resolve it before re-dispatching this container.`,"error");const l=e?state.db.trucks.find(t=>t.id===e):null;if(l&&"available"!==l.status)return void toast(`${l.reg} is no longer available (status: ${l.status.replace("_"," ")}). Refresh and pick another truck.`,"error");const c=t?state.db.drivers.find(e=>e.id===t):null;if(c&&"available"!==c.status)return void toast(`${c.name} is no longer available (status: ${c.status.replace("_"," ")}). Refresh and pick another driver.`,"error");const p=composeCtype(document.getElementById("d_size").value,document.getElementById("d_type").value),u=document.getElementById("d_worktype").value,m=document.getElementById("d_line").value,v=document.getElementById("d_priority").value,g=document.getElementById("d_ref").value.trim()||`REF-${Date.now().toString().slice(-6)}`,f=sanitize(document.getElementById("d_notes").value.trim()),y=[..._dispatchContainerImages],b=sanitize(document.getElementById("d_eir").value.trim()),h=sanitize(document.getElementById("d_receiving").value.trim()),w=sanitize(document.getElementById("d_release_no").value.trim()),k=sanitize(document.getElementById("d_vessel").value.trim()),_=sanitize(document.getElementById("d_voyage").value.trim()),x=document.getElementById("d_dateout").value,$=x?new Date(x).toISOString():(new Date).toISOString(),I=_dispatchReleaseFile,S=document.getElementById("d_outwardtype"),T=isOutwardWorkType(u)?S?S.value:"":null;if(isOutwardWorkType(u)&&!OUTWARD_TYPES.includes(T))return void toast("Select an outward type — Repatriation to Port, Shippers/Export, or Sale units","error");let E=null;if(r){const s=state.db.trips.find(e=>e.id===r);if(!s)return toast("That trip no longer exists — it may have been removed.","error"),void cancelDispatchEdit();if("Depot → Port"===u&&!I)try{const e=await window.bookingDocs.documentsForTrip(s.id);if(!e.some(e=>"release_order"===e.doc_type&&"verified"===e.status))return void toast("A verified release order is required before this container can be dispatched to port — upload it below, or from DepOps → Outward / Repatriation.","error",6e3)}catch(e){return void toast(`Could not confirm release order status (${e&&e.message||"error"}) — dispatch blocked until this can be checked.`,"error",6e3)}Object.assign(s,{truckId:e,driverId:t,container:i,ctype:p,workType:u,outwardType:T,origin:n,dest:a,shippingLine:m,distance:o,priority:v,notes:f,ref:g,containerImages:y,eirNumber:b,receivingParty:h,releaseOrderNo:w,vessel:k,voyage:_,dateOut:$});const d=state.db.trucks.find(t=>t.id===e),l=state.db.drivers.find(e=>e.id===t);d&&(d.status="on_trip"),l&&(l.status="on_trip",l.load=i,l.truckId=e),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Dispatch Completed",`${i} — ${n} → ${a}`),toast(`Dispatch completed — ${i}`,"success"),E=s.id,_dispatchEditingTripId=null;const c=document.getElementById("dispatchEditBanner");c&&(c.style.display="none");const x=document.getElementById("dispatchSubmitBtn");x&&(x.textContent="Create Dispatch Order →")}else{"Depot → Port"!==u||I||toast("A release order is required for Depot → Port dispatches — upload it below, or complete this later once the container is matched to a trip in DepOps → Outward / Repatriation.","warning",6e3);const r=Date.now()+o/35*36e5,s={id:uid("TRIP"),truckId:e,driverId:t,container:i,ctype:p,workType:u,outwardType:T,origin:n,dest:a,shippingLine:m,status:"active",startTime:(new Date).toISOString(),eta:new Date(r).toISOString(),distance:o,priority:v,notes:f,ref:g,containerImages:y,eirNumber:b,receivingParty:h,releaseOrderNo:w,vessel:k,voyage:_,dateOut:$};state.db.trips.push(s),E=s.id;const d=state.db.trucks.find(t=>t.id===e),l=state.db.drivers.find(e=>e.id===t);d&&(d.status="on_trip"),l&&(l.status="on_trip",l.load=i,l.truckId=e),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Dispatch Created",`${i} — ${n} → ${a}`),toast(`Dispatch created — ${i}`,"success")}if(I&&E)try{await saveNowAwaited(),await window.bookingDocs.uploadTripDocument({tripId:E,docType:"release_order",containerNo:i,file:I,autoVerify:!0}),toast("Release order uploaded","success")}catch(e){toast(`Dispatch saved, but release order upload failed: ${e.message||e}`,"warning")}clearContainerImgs(),clearDispatchReleaseFile(),["d_truck","d_driver","d_container","d_origin","d_dest","d_distance","d_ref","d_notes","d_eir","d_receiving","d_release_no","d_vessel","d_voyage","d_dateout"].forEach(e=>{const t=document.getElementById(e);t&&(t.value="")});const D=document.getElementById("d_outwardtype");D&&(D.value=""),toggleDispatchOutwardType(),renderDispatch(),refreshAwaitingDispatchUI()}let _dispatchReleaseFile=null;function previewDispatchReleaseFile(e){const t=e.target.files[0];if(!t)return;_dispatchReleaseFile=t;const i=document.getElementById("dispatchReleasePreview");i.style.display="block",i.innerHTML=`📄 ${esc(t.name)} <button class="pill" style="font-size:9px;margin-left:6px" onclick="clearDispatchReleaseFile()">✕ Remove</button>`}function clearDispatchReleaseFile(){_dispatchReleaseFile=null;const e=document.getElementById("d_release_file");e&&(e.value="");const t=document.getElementById("dispatchReleasePreview");t&&(t.style.display="none",t.innerHTML="")}function switchDispatchTab(e,t){document.getElementById("dispatchTabSingle").style.display="single"===e?"block":"none",document.getElementById("dispatchTabBulk").style.display="bulk"===e?"block":"none",document.querySelectorAll("#sec-dispatch .filter-row .filter-btn").forEach(e=>e.classList.remove("active")),t&&t.classList.add("active")}function previewContainerImgs(e){const t=Array.from(e.target.files||[]);t.length&&(t.forEach(e=>{if(!e.type.startsWith("image/"))return void toast(`${e.name} is not an image — skipped`,"error");if(e.size>2097152)return void toast(`${e.name} is too large — max 2MB. Skipped.`,"error");const t=new FileReader;t.onload=e=>{_dispatchContainerImages.push(e.target.result),renderContainerImgGrid()},t.readAsDataURL(e)}),e.target.value="")}function renderContainerImgGrid(){const e=document.getElementById("containerImgPreview"),t=document.getElementById("containerImgGrid"),i=document.getElementById("containerImgLabel");if(e&&t){if(!_dispatchContainerImages.length)return e.style.display="none",void(i&&(i.textContent="Upload container photos"));e.style.display="block",i&&(i.textContent=`${_dispatchContainerImages.length} photo${_dispatchContainerImages.length>1?"s":""} attached`),t.innerHTML=_dispatchContainerImages.map((e,t)=>`<div class="container-img-thumb"><img src="${e}" /><button type="button" class="container-img-remove" onclick="removeContainerImgAt(${t})" title="Remove">✕</button></div>`).join("")}}function removeContainerImgAt(e){_dispatchContainerImages.splice(e,1),renderContainerImgGrid()}function clearContainerImgs(){_dispatchContainerImages=[];const e=document.getElementById("d_container_img");e&&(e.value=""),renderContainerImgGrid()}function handleBulkDrop(e){e.preventDefault(),document.getElementById("bulkDispatchDrop").classList.remove("drag-over");const t=e.dataTransfer.files[0];t&&processBulkFile(t)}function handleBulkFile(e){const t=e.target.files[0];t&&processBulkFile(t)}const _EXCEL_HEADER_HINTS=["container","size","type","eir","date","delivering","vessel","voyage","guarantee","gurantee","shipping","line","receiving","release","transporter","dispatch","driver","truck","reg","condition","notes","remarks","bl","cargo","work"];function readAllExcelSheetsAsRows(e){let t=null;const i=[];return e.SheetNames.forEach(n=>{const a=e.Sheets[n],o=XLSX.utils.sheet_to_json(a,{header:1,defval:"",raw:!0});if(!o.length)return;const r=o[0].map(e=>String(null==e?"":e).trim());let s,d;r.filter(e=>_EXCEL_HEADER_HINTS.some(t=>e.toLowerCase().replace(/[^a-z]/g,"").includes(t))).length>=2?(s=r,d=o.slice(1),t=s):t?(s=t,d=o):(s=r.map((e,t)=>`Column${t+1}`),d=o),d.forEach(e=>{const t={};s.forEach((i,n)=>{i&&(t[i]=null!=e[n]?e[n]:"")}),i.push(t)})}),i}function flagIfImplausibleDate(e,t,i,n){if(!e)return;const a=new Date;if(12*(e.getFullYear()-a.getFullYear())+(e.getMonth()-a.getMonth())>12){const a=`date unusually far in the future (${e.toISOString().slice(0,10)}) — verify year`;t.push(a),i&&i.push(`${n}: ${a}`)}else if(e.getFullYear()<2015){const a=`date unusually far in the past (${e.toISOString().slice(0,10)}) — verify year`;t.push(a),i&&i.push(`${n}: ${a}`)}}function parseFlexibleDate(e){if(null==e||""===e)return null;if(e instanceof Date)return isNaN(e.getTime())?null:e;const t=String(e).trim(),i=t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);if(i){let[,e,t,n,a,o,r]=i;if(e=parseInt(e,10),t=parseInt(t,10),n=parseInt(n,10),n<100&&(n+=n<70?2e3:1900),t>12&&e<=12){const i=e;e=t,t=i}if(t>=1&&t<=12&&e>=1&&e<=31){const i=new Date(n,t-1,e,parseInt(a||0,10),parseInt(o||0,10),parseInt(r||0,10));if(!isNaN(i.getTime()))return i}}const n=new Date(t);return isNaN(n.getTime())?null:n}function processBulkFile(e){if(e.size>5242880)return void toast("File too large. Max 5MB.","error");const t=e.name.toLowerCase(),i=t.endsWith(".xlsx")||t.endsWith(".xls"),n=new FileReader;n.onload=e=>{try{let n=[];if(i){if(!window.XLSX)return void toast("Spreadsheet reader still loading — try again in a moment","error");n=readAllExcelSheetsAsRows(XLSX.read(e.target.result,{type:"array",cellDates:!0}))}else if(t.endsWith(".json"))n=JSON.parse(e.target.result);else{const t=e.target.result.split("\n").filter(e=>e.trim()),i=t[0].split(",").map(e=>e.trim());n=t.slice(1).map(e=>{const t=e.split(",");return Object.fromEntries(i.map((e,i)=>[e,t[i]?.trim()]))})}const a=/inward|inwrd|_in\b|-in\b/i.test(t)&&!/outward/i.test(t),o=normalizeRowKeys(n);showBulkPreview(o,sniffBulkDirectionFromRows(o)||(a?"in":"out"))}catch(e){toast("Could not parse file — check format","error")}},i?n.readAsArrayBuffer(e):n.readAsText(e)}function showBulkPreview(e,t){if(!e.length)return;const i=Object.keys(e[0]),n=document.getElementById("bulkPreviewTable");n.querySelector("thead").innerHTML=`<tr>${i.map(e=>`<th>${e}</th>`).join("")}</tr>`,n.querySelector("tbody").innerHTML=e.slice(0,10).map(e=>`<tr>${i.map(t=>`<td>${e[t]||""}</td>`).join("")}</tr>`).join(""),document.getElementById("bulkRowCount").textContent=`${e.length} rows`,document.getElementById("bulkDispatchPreview").style.display="block",document.getElementById("bulkDispatchPreview").dataset.rows=JSON.stringify(e);const a=document.getElementById("bd_bulk_direction");a&&(a.value="in"===t?"in":"out"),updateBulkDispatchDirectionUI()}function updateBulkDispatchDirectionUI(){const e=document.getElementById("bd_bulk_direction"),t=document.getElementById("bd_bulk_outwardtype_row");e&&t&&(t.style.display="out"===e.value?"block":"none")}async function processBulkDispatch(){if(_bulkWriteInProgress)return void toast("A dispatch import is already in progress — please wait","warning");const e=JSON.parse(document.getElementById("bulkDispatchPreview").dataset.rows||"[]");if(!e.length)return void toast("No rows to process","error");const t="in"===document.getElementById("bd_bulk_direction")?.value?"in":"out",i=document.getElementById("bd_bulk_outwardtype")?.value||OUTWARD_TYPES[0],n={depotport:"Depot → Port",depottoport:"Depot → Port",outward:"Depot → Port",out:"Depot → Port",dispatch:"Depot → Port",portdepot:"Port → Depot",porttodepot:"Port → Depot",inward:"Port → Depot",in:"Port → Depot"},a={repatriationtoport:"Repatriation to Port",repatriation:"Repatriation to Port",shippersexport:"Shippers/Export",export:"Shippers/Export",shippers:"Shippers/Export",saleunits:"Sale units",sale:"Sale units"},o=document.getElementById("bulkDispatchSubmitBtn"),r=o?o.textContent:"";o&&(o.disabled=!0,o.textContent=`Processing ${e.length} row(s)…`),toast(`Processing ${e.length} dispatch(es) — this can take a moment for large files…`,"info",5e3),_bulkWriteInProgress=!0,await new Promise(e=>setTimeout(e,0));try{let r=0;const s=[],d=new Set,l=new Set,c=new Set,p=[],u=`DSP-${(new Date).toISOString().slice(0,10)}-${Date.now().toString(36).toUpperCase()}`,m=new Map;state.db.trips.forEach(e=>{if(isTripLive(e)&&e.container){const t=e.container.toUpperCase();m.has(t)||m.set(t,e)}});const v=300;for(let g=0;g<e.length;g+=v){const f=e.slice(g,g+v);o&&e.length>v&&(o.textContent=`Processing ${Math.min(g+v,e.length)}/${e.length}…`),f.forEach((e,o)=>{const v=g+o,f=pickField(e,["container","containerno","containernumber","containernrno"]),y=f||`row ${v+1}`;let b=f?f.trim().toUpperCase():"";const h=[];if(b){const e=containerFormatIssue(b);e&&(h.push(e),s.push(`${b}: ${e}`))}else b=`UNKNOWN-ROW${v+1}-${Date.now().toString(36).toUpperCase()}`,h.push("missing container number — placeholder assigned"),s.push(`${y}: missing container number (placeholder ${b})`);d.has(b)&&(h.push("duplicate container within this file"),s.push(`${b}: duplicate container within this file`));const w=m.get(b)||null;w&&(h.push("already on an active trip"),s.push(`${b}: already on an active trip`)),d.add(b);const k=pickField(e,["truck","truckreg","vehicle","reg","truckno","lorryno"]),_=pickField(e,["transporters","transporter"]),x=pickField(e,["driver","drivername","driversname"]),$=state.db.trucks.find(e=>e.reg===k||e.id===k||e.reg===_),I=state.db.drivers.find(e=>e.name===x||e.id===x),S=$&&l.has($.id),T=I&&c.has(I.id);S&&(h.push(`truck ${$.reg} used more than once in this batch`),s.push(`${b}: truck ${$.reg} used more than once in this batch`)),T&&(h.push(`driver ${I.name} used more than once in this batch`),s.push(`${b}: driver ${I.name} used more than once in this batch`)),$&&l.add($.id),I&&c.add(I.id);const E=pickField(e,["line","shippingline","linecode","shippinglines"]),D=E?{TERMCO:"TMT"}[E.toUpperCase()]||E:"",R=D?state.db.shippingLines.find(e=>e.code.toLowerCase()===D.toLowerCase()||e.name.toLowerCase()===D.toLowerCase()||e.id===D):null,L=pickField(e,["size"]),C=pickField(e,["containertype","type"]),B=pickField(e,["ctype"]),A=L&&C?composeCtypeFromDepotCode(L,C):CONTAINER_TYPE_OPTIONS.find(e=>e.toLowerCase()===B.toLowerCase())||B||"20ft Dry";let O=null;{const t=parseFlexibleDate(pickField(e,["dateout","dateexited"]));t&&(O=t.toISOString())}let M=O||(new Date).toISOString();{const t=parseFlexibleDate(pickField(e,["date","dispatchdate","startdate","starttime","datedispatched","datein","entrydate","dategatein"]));t&&(M=t.toISOString(),flagIfImplausibleDate(t,h,s,y))}const z=["Bulk import"];_&&!$&&z.push(`Transporter: ${_}`),z.push(...h.map(e=>`⚠ ${e}`));const N=pickField(e,["worktype","workType","direction","movement"]).toLowerCase().replace(/[^a-z]/g,""),P=n[N]||("in"===t?"Port → Depot":"Depot → Port");let F=null;if(isOutwardWorkType(P)){const t=pickField(e,["outwardtype","movementtype"]).toLowerCase().replace(/[^a-z\/]/g,"");F=a[t]||i}const U={id:uid("TRIP"),container:b,truckId:$?$.id:"",driverId:I?I.id:"",ctype:A,workType:P,outwardType:F,origin:e.origin||"",dest:e.destination||e.dest||"",distance:parseInt(e.distance)||0,shippingLine:R?.id||"",priority:"Normal",notes:z.join(" — "),ref:`BULK-${Date.now()}-${r}`,status:"completed",startTime:M,eta:O||new Date(new Date(M).getTime()+144e5).toISOString(),eirNumber:sanitize(pickField(e,["eir","eirno"])),receivingParty:sanitize(pickField(e,["receivingparty","deliveringparty"])),releaseOrderNo:sanitize(pickField(e,["releaseorderno"])),vessel:sanitize(pickField(e,["vessel","exvessel"])),voyage:sanitize(pickField(e,["voyage"])),dateOut:O||M,flaggedForReview:h.length>0,flagReasons:h.slice(),duplicateOfId:w?w.id:null,importBatchId:u,_dirty:!0};state.db.trips.push(U),p.push(U),r++}),await new Promise(e=>setTimeout(e,0))}let g=null;try{g=await upsertRowsChunked("trips",p.map(tripToRow))}catch(e){console.error("Bulk dispatch save failed:",e&&e.message,e),g={table:"trips",error:e}}p.forEach(e=>{delete e._dirty}),buildBadges(),addAudit(state.profile.username,"Bulk Dispatch",`${r} dispatches imported${s.length?`, ${s.length} flagged for review`:""} (batch ${u})`),scheduleSave(),g?toast(`Import saved with errors — check console and retry if rows are missing (${g.error&&g.error.message||"see console"})`,"error",7e3):s.length?(toast(`${r} created — ${s.length} flagged for cleanup (see details)`,"warning",6e3),openModal("Bulk Dispatch Result",`<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${r} dispatch(es) created successfully — all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (${s.length})</div><div style="max-height:240px;overflow-y:auto">${s.map(e=>`<div class="ops-notice" style="margin-bottom:6px">${esc(e)}</div>`).join("")}</div>`)):toast(`${r} dispatches created`,"success"),refreshAwaitingDispatchUI(),document.getElementById("bulkDispatchPreview").style.display="none",renderDispatchQueue()}catch(e){console.error("Bulk dispatch failed:",e&&e.message,e),toast(`Bulk dispatch failed — ${e&&e.message||"unexpected error"}. Nothing further was imported.`,"error",7e3)}finally{_bulkWriteInProgress=!1,o&&(o.disabled=!1,o.textContent=r||"Process All Dispatches →")}}function downloadBulkTemplate(){const e=document.createElement("a");e.href=`data:text/csv;charset=utf-8,${encodeURIComponent("container,size,type,eir,dateOut,receivingParty,releaseOrderNo,vessel,voyage,truck,driver,origin,destination,workType,distance\nMSCU1234566,40ft,Dry,EIR-00789,,,,,,KDA 001A,James Otieno,Kilindini Port,Shimanzi ICD,Port → Depot,18")}`,e.download="gargo_bulk_template.csv",e.click()}let _inwardImg="";function renderInward(){populateInwardSelects(),clearInwardForm(!0)}function populateInwardSelects(){fillDatalist("iwTruckList",state.db.trucks,e=>e.reg),fillDatalist("iwDriverList",state.db.drivers,e=>e.name),fillSelect("iw_line",state.db.shippingLines.filter(e=>e.active),e=>[e.id,`${e.code} — ${e.name}`]),populateSizeTypeSelects("iw_size","iw_type")}function fillDatalist(e,t,i){const n=document.getElementById(e);n&&(n.innerHTML=t.map(e=>`<option value="${esc(i(e))}"></option>`).join(""))}function quickDispatchOut(e){const t=state.db.interchange.find(t=>t.id===e);t&&openModal(`Quick Dispatch — ${sanitize(t.container)}`,`\n    <div class="ops-notice" style="margin-bottom:12px">\n      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>\n      Use this to record that a container already left the depot without creating a full dispatch trip — for containers that left before this system was in use, or whose exit wasn't captured through Dispatch Console. It won't ask for a truck or driver.\n    </div>\n    <div class="fg"><label>Date Out <span class="label-optional">(optional, defaults to now)</span></label><input id="qd_dateout" type="datetime-local" /></div>\n    <div class="fg"><label>Receiving Party</label><input id="qd_receiving" placeholder="Consignee / receiving party" /></div>\n    <div class="fg"><label>Release Order No.</label><input id="qd_release_no" placeholder="CRO / release order no. (if any)" /></div>\n    <button class="submit-btn" onclick="confirmQuickDispatchOut('${e}')">Mark as Dispatched →</button>\n  `)}function confirmQuickDispatchOut(e){const t=state.db.interchange.find(t=>t.id===e);if(!t)return void closeModal();const i=document.getElementById("qd_dateout").value;t.dateOut=i?new Date(i).toISOString():(new Date).toISOString(),t.receivingParty=sanitize(document.getElementById("qd_receiving").value.trim()),t.releaseOrderNo=sanitize(document.getElementById("qd_release_no").value.trim()),t._dirty=!0,scheduleSave(),addAudit(state.profile.username,"Quick Dispatch (No Trip)",`${t.container} marked out — bypassed full dispatch process`),toast(`${t.container} marked as dispatched`,"success"),closeModal(),refreshInwardReportsIfOpen(),renderInterchange(_icFilter||"all")}function markInwardSurveyed(e){const t=state.db.interchange.find(t=>t.id===e);t&&(t.surveyStatus="surveyed",t.surveyedAt=(new Date).toISOString(),t.surveyedBy=state.profile.username,t._dirty=!0,scheduleSave(),addAudit(state.profile.username,"Inward Entry Surveyed",t.container),toast(`${t.container} marked surveyed`,"success"),refreshInwardReportsIfOpen())}function switchInwardTab(e,t){document.getElementById("inwardTabSingle").style.display="single"===e?"block":"none",document.getElementById("inwardTabBulk").style.display="bulk"===e?"block":"none",document.getElementById("inwardTabReports").style.display="reports"===e?"block":"none",document.querySelectorAll("#sec-inward .filter-row .filter-btn").forEach(e=>e.classList.remove("active")),t&&t.classList.add("active"),"reports"===e&&renderInwardReports()}function refreshInwardReportsIfOpen(){const e=document.getElementById("inwardTabReports");e&&"none"!==e.style.display&&renderInwardReports()}let _inwardRptRows=[];function inwardReportsPopulateLines(){const e=document.getElementById("iwRptLine");e&&!e.dataset.populated&&(state.db.shippingLines.forEach(t=>{const i=document.createElement("option");i.value=t.id,i.textContent=`${t.code} — ${t.name}`,e.appendChild(i)}),e.dataset.populated="1")}function inwardReportsReset(){["iwRptLine","iwRptType","iwRptStatus","iwRptFrom","iwRptTo"].forEach(e=>{const t=document.getElementById(e);t&&(t.value="")}),renderInwardReports()}function inwardEntryStatus(e,t){return"awaiting_survey"===e.surveyStatus?"awaiting_survey":e.dateOut||t.has(e.container)?"exited":"in_storage"}function exitedContainerSet(){const e=state.db.interchange.filter(e=>"Gate-Out"===e.type||"Depot-Out"===e.type).map(e=>e.container),t=state.db.trips.filter(e=>isOutwardWorkType(e.workType)).map(e=>e.container);return new Set([...e,...t].filter(Boolean))}const INWARD_STATUS_LABELS={awaiting_survey:"Awaiting Survey",in_storage:"In Storage",exited:"Exited"},INWARD_STATUS_BADGE_CLASS={awaiting_survey:"s-pending",in_storage:"s-active",exited:"s-completed"};function inwardStatusBadge(e){return`<span class="sbadge ${INWARD_STATUS_BADGE_CLASS[e]||""}">${INWARD_STATUS_LABELS[e]||e}</span>`}async function renderInwardReports(){inwardReportsPopulateLines();const e=document.getElementById("iwRptLine")?.value||"",t=document.getElementById("iwRptType")?.value||"",i=document.getElementById("iwRptStatus")?.value||"",n=document.getElementById("iwRptFrom")?.value||"",a=document.getElementById("iwRptTo")?.value||"",o=exitedContainerSet(),r=state.db.interchange.filter(e=>"Gate-In"===e.type||"Depot-In"===e.type).map(e=>({...e,_status:inwardEntryStatus(e,o)}));let s=r;e&&(s=s.filter(t=>t.line===e)),t&&(s=s.filter(e=>e.type===t)),i&&(s=s.filter(e=>e._status===i)),n&&(s=s.filter(e=>new Date(e.date)>=new Date(n))),a&&(s=s.filter(e=>new Date(e.date)<=new Date(a+"T23:59:59"))),s=s.sort((e,t)=>"awaiting_survey"===i||"in_storage"===i?new Date(e.date)-new Date(t.date):new Date(t.date)-new Date(e.date)),_inwardRptRows=s;let d={};const l=s.filter(e=>"awaiting_survey"===e._status).map(e=>e.id);if(l.length)try{window.bookingDocs&&(d=await window.bookingDocs.documentsForInterchanges(l))}catch(e){}const c=document.getElementById("iwRptBody"),p=document.getElementById("iwRptMeta"),u=document.getElementById("iwRptExportBtn");p&&(p.textContent=`${s.length} record${1===s.length?"":"s"}`),u&&(u.disabled=!s.length),c&&(c.innerHTML=s.length?s.map(e=>{let t="—";"awaiting_survey"===e._status?t=`<button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="markInwardSurveyed('${e.id}')">Mark Surveyed →</button>`:"in_storage"===e._status&&(t=`<button class="modal-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="quickDispatchOut('${e.id}')">Quick Dispatch →</button>`);const i="awaiting_survey"===e._status?(d[e.id]||[]).some(e=>"guarantee_form"===e.doc_type)?'<div style="font-size:9.5px;color:var(--text-3);margin-top:3px">Guarantee form ✓</div>':'<div style="font-size:9.5px;color:var(--text-3);margin-top:3px">No guarantee form</div>':"";return`<tr>\n        <td class="mono">${fmtDate(e.date)}</td>\n        <td class="mono" style="color:var(--gold)">${sanitize(e.container||"—")}</td>\n        <td>${sanitize(e.type||"—")}</td>\n        <td>${sanitize(e.ctype||"—")}</td>\n        <td>${e.line?sanitize(lineName(e.line)):'<span style="color:var(--danger,#c0392b)">⚠ No Line</span>'}</td>\n        <td>${e.truck?sanitize(truckName(e.truck)):sanitize(e.truckRegText||"—")}</td>\n        <td>${e.driver?sanitize(driverName(e.driver)):sanitize(e.driverNameText||"—")}</td>\n        <td>${inwardStatusBadge(e._status)}${i}</td>\n        <td>${t}</td>\n      </tr>`}).join(""):'<tr><td colspan="9" class="empty-td">No inward entries match these filters</td></tr>');const m=document.getElementById("iwRptSummary");m&&(m.innerHTML=`<div class="two-col-grid">\n      <div class="report-block">\n        <h3>Inward Pipeline (All Time)</h3>\n        ${reportRow("Awaiting Survey",r.filter(e=>"awaiting_survey"===e._status).length)}\n        ${reportRow("Still In Storage",r.filter(e=>"in_storage"===e._status).length)}\n        ${reportRow("Exited",r.filter(e=>"exited"===e._status).length)}\n        ${reportRow("Total Inward Entries",r.length)}\n      </div>\n      <div class="report-block">\n        <h3>Matching These Filters</h3>\n        ${reportRow("Records",s.length)}\n        ${reportRow("Awaiting Survey",s.filter(e=>"awaiting_survey"===e._status).length)}\n        ${reportRow("Still In Storage",s.filter(e=>"in_storage"===e._status).length)}\n        ${reportRow("Exited",s.filter(e=>"exited"===e._status).length)}\n      </div>\n    </div>`)}function downloadInwardReportCSV(){if(!_inwardRptRows.length)return void toast("Nothing to download yet","error");const e=[["Date","Container","Movement","Type","Shipping Line","Truck","Driver","Status"],..._inwardRptRows.map(e=>[e.date,e.container,e.type,e.ctype,lineName(e.line),e.truck?truckName(e.truck):e.truckRegText||"",e.driver?driverName(e.driver):e.driverNameText||"",INWARD_STATUS_LABELS[e._status]||e._status])].map(e=>e.map(e=>`"${String(null==e?"":e).replace(/"/g,'""')}"`).join(",")).join("\n"),t=new Blob([e],{type:"text/csv"}),i=document.createElement("a");i.href=URL.createObjectURL(t),i.download=`inward-report-${(new Date).toISOString().slice(0,10)}.csv`,i.click(),URL.revokeObjectURL(i.href)}async function createInwardEntry(){const e=document.getElementById("iw_container").value.trim().toUpperCase();if(!e)return void toast("Container number required","error");const t=containerFormatIssue(e);if(t)return void toast(`Container number: ${t}`,"error");const i=document.getElementById("iw_type_movement").value,n=document.getElementById("iw_date").value,a=n?new Date(n).toISOString():(new Date).toISOString();if(findDuplicateInterchange(e,i,a))return void toast(`${e} already has a ${i} record logged on ${fmtDate(a)}`,"warning");const o=document.getElementById("iw_truck").value.trim(),r=document.getElementById("iw_driver").value.trim(),s=o?state.db.trucks.find(e=>e.reg.toLowerCase()===o.toLowerCase()):null,d=r?state.db.drivers.find(e=>e.name.toLowerCase()===r.toLowerCase()):null,l=!!document.getElementById("iw_needs_survey").checked,c=_inwardGuaranteeFile,p=uid("IC"),u=composeCtype(document.getElementById("iw_size").value,document.getElementById("iw_type").value),m=document.getElementById("iw_cargo_status");if(state.db.interchange.push({id:p,container:e,type:i,ctype:u,line:document.getElementById("iw_line").value,condition:document.getElementById("iw_cond").value,truck:s?s.id:"",driver:d?d.id:"",truckRegText:s?"":sanitize(o),driverNameText:d?"":sanitize(r),eirNumber:sanitize(document.getElementById("iw_eir").value.trim()),blNumber:sanitize(document.getElementById("iw_bl").value.trim()),vessel:sanitize(document.getElementById("iw_vessel").value.trim()),voyage:sanitize(document.getElementById("iw_voyage").value.trim()),deliveringParty:sanitize(document.getElementById("iw_delivering").value.trim()),guaranteeNo:sanitize(document.getElementById("iw_guarantee_no").value.trim()),cargoStatus:m?m.value:"",repairs:[],repairTotal:0,notes:sanitize(document.getElementById("iw_notes").value.trim()),date:a,status:"pending",img:_inwardImg||"",dateOut:null,receivingParty:"",releaseOrderNo:"",needsSurvey:l,surveyStatus:l?"awaiting_survey":null,surveyedAt:null,surveyedBy:null,_dirty:!0}),buildBadges(),addAudit(state.profile.username,"Inward Entry Recorded",`${e} (${i})${l?" — sent to Awaiting Survey":""}`),refreshContainerHistory(),toast(`Inward entry recorded — ${e}`,"success"),clearInwardForm(),renderInterchange("all"),refreshInwardReportsIfOpen(),c)try{await saveNowAwaited(),await window.bookingDocs.uploadInterchangeDocument({interchangeId:p,docType:"guarantee_form",containerNo:e,file:c,autoVerify:!0}),toast("Guarantee form uploaded","success"),refreshInwardReportsIfOpen()}catch(e){toast(`Entry saved, but guarantee form upload failed: ${e.message||e}`,"warning")}else scheduleSave()}function clearInwardForm(e){["iw_container","iw_truck","iw_driver","iw_eir","iw_bl","iw_vessel","iw_voyage","iw_notes","iw_delivering","iw_guarantee_no"].forEach(e=>{const t=document.getElementById(e);t&&(t.value="")});const t=document.getElementById("iw_date");t&&(t.value="");const i=document.getElementById("iw_type_movement");i&&(i.value="Gate-In");const n=document.getElementById("iw_cond");n&&(n.value="Good");const a=document.getElementById("iw_cargo_status");a&&(a.value="");const o=document.getElementById("iw_needs_survey");o&&(o.checked=!1),_inwardImg="";const r=document.getElementById("iw_img");r&&(r.value=""),renderInwardImgPreview(),clearInwardGuaranteeFile(),e||populateInwardSelects()}function previewInwardImg(e){const t=e.target.files[0];if(!t)return;if(!t.type.startsWith("image/"))return void toast("Not an image file","error");if(t.size>2097152)return void toast("Image too large — max 2MB","error");const i=new FileReader;i.onload=e=>{_inwardImg=e.target.result,renderInwardImgPreview()},i.readAsDataURL(t),e.target.value=""}function renderInwardImgPreview(){const e=document.getElementById("inwardImgPreview"),t=document.getElementById("inwardImgLabel");if(e){if(!_inwardImg)return e.style.display="none",e.innerHTML="",void(t&&(t.textContent="Upload container photo"));e.style.display="block",e.innerHTML=`<div class="container-img-thumb"><img src="${_inwardImg}" /><button type="button" class="container-img-remove" onclick="clearInwardImg()" title="Remove">✕</button></div>`,t&&(t.textContent="1 photo attached")}}function clearInwardImg(){_inwardImg="";const e=document.getElementById("iw_img");e&&(e.value=""),renderInwardImgPreview()}let _inwardGuaranteeFile=null;function previewInwardGuaranteeFile(e){const t=e.target.files[0];if(!t)return;const i="application/pdf"===t.type||/\.pdf$/i.test(t.name),n=t.type.startsWith("image/");return i||n?t.size>5242880?(toast("File too large — max 5MB","error"),void(e.target.value="")):(_inwardGuaranteeFile=t,void renderInwardGuaranteePreview()):(toast("Upload an image or PDF","error"),void(e.target.value=""))}function renderInwardGuaranteePreview(){const e=document.getElementById("inwardGuaranteePreview"),t=document.getElementById("inwardGuaranteeLabel");if(e){if(!_inwardGuaranteeFile)return e.style.display="none",e.innerHTML="",void(t&&(t.textContent="Upload container guarantee form"));e.style.display="block",e.innerHTML=`<div style="display:flex;align-items:center;gap:8px">\n      <span>📎 ${esc(_inwardGuaranteeFile.name)} (${(_inwardGuaranteeFile.size/1024).toFixed(0)} KB)</span>\n      <button type="button" class="modal-btn ghost" style="padding:2px 8px;font-size:10px" onclick="clearInwardGuaranteeFile()">Remove</button>\n    </div>`,t&&(t.textContent="1 file attached")}}function clearInwardGuaranteeFile(){_inwardGuaranteeFile=null;const e=document.getElementById("iw_guarantee_file");e&&(e.value=""),renderInwardGuaranteePreview()}function handleInwardBulkDrop(e){e.preventDefault(),document.getElementById("inwardBulkDrop").classList.remove("drag-over");const t=e.dataTransfer.files[0];t&&processInwardBulkFile(t)}function handleInwardBulkFile(e){const t=e.target.files[0];t&&processInwardBulkFile(t)}function normalizeRowKeys(e){return e.map(e=>{const t={};return Object.entries(e||{}).forEach(([e,i])=>{const n=String(e).trim().toLowerCase().replace(/[^a-z0-9]/g,"");n&&(t[n]="string"==typeof i?i.trim():null==i?"":i)}),t})}function sniffBulkDirectionFromRows(e){if(!e||!e.length)return null;const t=new Set;e.slice(0,10).forEach(e=>Object.keys(e).forEach(e=>t.add(e)));const i=["dateout","receivingparty","releaseorderno","transporters"].filter(e=>t.has(e)).length,n=["datein","deliveringparty","exvessel","guranteeformno","guaranteeformno"].filter(e=>t.has(e)).length;return i>n&&i>0?"out":n>i&&n>0?"in":null}function processInwardBulkFile(e){if(e.size>5242880)return void toast("File too large. Max 5MB.","error");const t=e.name.toLowerCase(),i=t.endsWith(".xlsx")||t.endsWith(".xls"),n=new FileReader;n.onload=e=>{try{let n=[];if(i){if(!window.XLSX)return void toast("Spreadsheet reader still loading — try again in a moment","error");n=readAllExcelSheetsAsRows(XLSX.read(e.target.result,{type:"array",cellDates:!0}))}else if(t.endsWith(".json"))n=JSON.parse(e.target.result);else{const t=e.target.result.split("\n").filter(e=>e.trim()),i=t[0].split(",").map(e=>e.trim());n=t.slice(1).map(e=>{const t=e.split(",");return Object.fromEntries(i.map((e,i)=>[e,t[i]?.trim()]))})}n=normalizeRowKeys(n);const a=/outward|outwrd|_out\b|-out\b/i.test(t)&&!/inward/i.test(t);showInwardBulkPreview(n,sniffBulkDirectionFromRows(n)||(a?"out":"in"))}catch(e){toast("Could not parse file — check format","error")}},i?n.readAsArrayBuffer(e):n.readAsText(e)}function showInwardBulkPreview(e,t){if(!e.length)return void toast("No rows found in file","error");const i=Object.keys(e[0]),n=document.getElementById("inwardBulkPreviewTable");n.querySelector("thead").innerHTML=`<tr>${i.map(e=>`<th>${esc(e)}</th>`).join("")}</tr>`,n.querySelector("tbody").innerHTML=e.slice(0,10).map(e=>`<tr>${i.map(t=>`<td>${esc(e[t])}</td>`).join("")}</tr>`).join(""),document.getElementById("inwardBulkRowCount").textContent=`${e.length} rows`,document.getElementById("inwardBulkPreview").style.display="block",document.getElementById("inwardBulkPreview").dataset.rows=JSON.stringify(e);const a=document.getElementById("iw_bulk_direction");a.value="out"===t?"out":"in",updateBulkDirectionLabel(),a.onchange=updateBulkDirectionLabel}function updateBulkDirectionLabel(){const e="out"===document.getElementById("iw_bulk_direction").value;document.getElementById("iw_bulk_direction_label").textContent=e?"Gate-Out":"Gate-In"}function pickField(e,t){for(const i of t)if(null!=e[i]&&""!==String(e[i]).trim())return String(e[i]).trim();return""}function processBulkInward(){const e=JSON.parse(document.getElementById("inwardBulkPreview").dataset.rows||"[]"),t="out"===document.getElementById("iw_bulk_direction")?.value?"out":"in",i={gatein:"Gate-In","gate-in":"Gate-In",depotin:"Depot-In","depot-in":"Depot-In",gateout:"Gate-Out","gate-out":"Gate-Out",depotout:"Depot-Out","depot-out":"Depot-Out"},n="out"===t?"Gate-Out":"Gate-In",a=["Good","Damaged","Dirty","Needs Repair"];let o=0;const r=[],s=new Set,d=`INW-${(new Date).toISOString().slice(0,10)}-${Date.now().toString(36).toUpperCase()}`;e.forEach((e,t)=>{const l=pickField(e,["container","containerno","containernumber","containernrno"]),c=l||`row ${t+1}`;let p=l?l.toUpperCase():"";const u=[];if(p){const e=containerFormatIssue(p);e&&(u.push(e),r.push(`${p}: ${e}`))}else p=`UNKNOWN-ROW${t+1}-${Date.now().toString(36).toUpperCase()}`,u.push("missing container number — placeholder assigned"),r.push(`${c}: missing container number (placeholder ${p})`);const m=pickField(e,["movement","type"]).toLowerCase().replace(/[^a-z]/g,""),v=i[m]||n;let g=(new Date).toISOString();{const t=parseFlexibleDate(pickField(e,["date","entrydate","datein","dateout","gateindate","gateoutdate","inwarddate","outwarddate","entrydatetime"]));t&&(g=t.toISOString(),flagIfImplausibleDate(t,u,r,c))}const f=`${p}::${v}::${new Date(g).toDateString()}`;s.has(f)&&(u.push("duplicate within this file (same container, type & date)"),r.push(`${p}: duplicate within this file (same container, type & date)`));const y=findDuplicateInterchange(p,v,g);y&&(u.push(`possible duplicate of an existing ${v} record on ${fmtDate(g)}`),r.push(`${p}: already has a ${v} record logged on ${fmtDate(g)}`)),s.add(f);const b=pickField(e,["truck","truckreg","vehicle","reg","truckno","lorryno","transporters","transporter"]),h=pickField(e,["driver","drivername","driversname"]),w=pickField(e,["line","shippingline","linecode","shippinglines"]),k=pickField(e,["vessel","exvessel"]),_=b?state.db.trucks.find(e=>e.reg.toLowerCase()===b.toLowerCase()||e.id===b):null,x=h?state.db.drivers.find(e=>e.name.toLowerCase()===h.toLowerCase()||e.id===h):null,$={TERMCO:"TMT"}[w.toUpperCase()]||w;let I=$?state.db.shippingLines.find(e=>normVessel(e.code).toLowerCase()===normVessel($).toLowerCase()||normVessel(e.name).toLowerCase()===normVessel($).toLowerCase()||e.id===$):null;if(!I&&k){const e=resolveLineIdFromVessel(k);e&&(I=state.db.shippingLines.find(t=>t.id===e))}const S=pickField(e,["ctype"]),T=pickField(e,["size"]),E=pickField(e,["containertype","type"]);let D=CONTAINER_TYPE_OPTIONS.find(e=>e.toLowerCase()===S.toLowerCase());!D&&T&&E&&(D=composeCtypeFromDepotCode(T,E)),D||(D=CONTAINER_TYPE_OPTIONS[0]);const R=pickField(e,["condition"]),L=a.find(e=>e.toLowerCase()===R.toLowerCase())||"Good";let C=null;{const t=parseFlexibleDate(pickField(e,["dateout","exitdate","gateoutdate","dateexited"]));t&&(C=t.toISOString())}const B=pickField(e,["cargostatus"]),A=CARGO_STATUS_OPTIONS.find(e=>e.toLowerCase()===B.toLowerCase())||sanitize(B);state.db.interchange.push({id:uid("IC"),container:p,type:v,ctype:D,line:I?I.id:"",condition:L,truck:_?_.id:"",driver:x?x.id:"",truckRegText:_?"":sanitize(b),driverNameText:x?"":sanitize(h),eirNumber:sanitize(pickField(e,["eir","eirnumber","eirno","ineirno","outeirno","outeir","refinno","refoutno","inwardno"])),blNumber:sanitize(pickField(e,["bl","blnumber","blno"])),vessel:sanitize(k),voyage:sanitize(pickField(e,["voyage","voy"])),deliveringParty:sanitize(pickField(e,["deliveringparty","delivering","shipper"])),guaranteeNo:sanitize(pickField(e,["guaranteeno","guaranteenumber","guranteeformno","guaranteeformno"])),cargoStatus:A,repairs:[],repairTotal:0,notes:[sanitize(pickField(e,["notes","remarks"]))||"Bulk import",...u.map(e=>`⚠ ${e}`)].filter(Boolean).join(" — "),date:g,status:"approved",img:"",dateOut:C,receivingParty:sanitize(pickField(e,["receivingparty"])),releaseOrderNo:sanitize(pickField(e,["releaseorderno","releaseorder"])),flaggedForReview:u.length>0,flagReasons:u.slice(),duplicateOfId:y?y.id:null,importBatchId:d,_dirty:!0}),o++}),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Bulk Inward Entry",`${o} entries imported${r.length?`, ${r.length} flagged for review`:""} (batch ${d})`),r.length?(toast(`${o} created — ${r.length} flagged for cleanup (see details)`,"warning",6e3),openModal("Bulk Inward Entry Result",`<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${o} entry(ies) created successfully — all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (${r.length})</div><div style="max-height:240px;overflow-y:auto">${r.map(e=>`<div class="ops-notice" style="margin-bottom:6px">${esc(e)}</div>`).join("")}</div>`)):toast(`${o} inward entries created`,"success"),refreshContainerHistory(),renderInterchange("all"),refreshInwardReportsIfOpen(),document.getElementById("inwardBulkPreview").style.display="none"}function downloadInwardBulkTemplate(){const e=document.createElement("a");e.href=`data:text/csv;charset=utf-8,${encodeURIComponent("container,type,size,containerType,line,truck,driver,eir,bl,vessel,voyage,deliveringParty,guaranteeNo,cargoStatus,condition,date,dateOut,receivingParty,releaseOrderNo,notes\nMSCU1234566,Gate-In,40ft,Dry,MSC,KDX 655V,James Otieno,EIR-00123,BL-4471,MSC VESSEL,VA-001,ACME Traders,GTE-00981,Laden / Full,Good,,,,,Delivered in good condition")}`,e.download="gargo_inward_bulk_template.csv",e.click()}let _maintFilter="all";function filterMaint(e,t){_maintFilter=e,document.querySelectorAll("#sec-maintenance .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderMaint(e)}function renderMaint(e){let t=state.db.maintenance;"all"!==e&&(t=t.filter(t=>t.status===e)),t=t.sort((e,t)=>{const i=["critical","high","medium","low"];return i.indexOf(e.priority)-i.indexOf(t.priority)});const i=document.getElementById("maintList");i&&(i.innerHTML=t.map(e=>`<div class="maint-card p-${e.priority}" onclick="showMaintDetail('${e.id}')"><div class="maint-card-head"><div><div style="font-size:12px;font-weight:700;color:var(--text)">${truckName(e.truckId)}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:2px">${e.type} · ${fmtDate(e.date)}</div></div><div style="display:flex;gap:6px;align-items:center">${sbadge(e.priority)} ${sbadge(e.status)}</div></div><div class="maint-desc">${e.desc}</div><div class="maint-meta">Tech: ${e.tech||"Unassigned"} · Cost: ${e.cost?fmtKsh(e.cost):"TBC"}</div></div>`).join("")||'<div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-label">No maintenance records</div></div>')}function showMaintDetail(e){const t=state.db.maintenance.find(t=>t.id===e);t&&openModal(`Maintenance — ${truckName(t.truckId)}`,`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(t.truckId)}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.type}</div></div><div class="fg" style="margin:0"><label>Priority</label>${sbadge(t.priority)}</div><div class="fg" style="margin:0"><label>Status</label>${sbadge(t.status)}</div><div class="fg" style="margin:0"><label>Date</label><div style="font-size:12px;color:var(--text)">${fmtDate(t.date)}</div></div><div class="fg" style="margin:0"><label>Cost (KSh)</label><div style="font-size:12px;color:var(--gold);font-weight:700">${t.cost?fmt(t.cost):"TBC"}</div></div><div class="fg" style="margin:0"><label>Technician</label><div style="font-size:12px;color:var(--text)">${t.tech||"Unassigned"}</div></div>${t.resolvedDate?`<div class="fg" style="margin:0"><label>Resolved</label><div style="font-size:12px;color:var(--green)">${fmtDate(t.resolvedDate)}</div></div>`:""}</div><div class="fg" style="margin-bottom:14px"><label>Description</label><div style="font-size:12px;color:var(--text-2);line-height:1.6;padding:10px;background:var(--surface);border-radius:5px">${t.desc}</div></div>${isAdmin()?`<div style="padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Update Status</div><div style="display:flex;gap:6px;flex-wrap:wrap">${["open","in_progress","resolved"].map(i=>`<button class="filter-btn${t.status===i?" active":""}" onclick="updateMaintStatus('${e}','${i}')">${i.replace("_"," ")}</button>`).join("")}</div>${adminDeleteBtn("maintenance",e)}</div>`:""}`)}function updateMaintStatus(e,t){if(!isAdmin())return void toast("Admin rights required","error");const i=state.db.maintenance.find(t=>t.id===e);i&&(i.status=t,"resolved"===t&&(i.resolvedDate=(new Date).toISOString()),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Maintenance Update",`${truckName(i.truckId)} → ${t}`),closeModal(),renderMaint(_maintFilter),toast("Maintenance record updated","success"))}function showMaintModal(){openModal("Log Maintenance Issue",`<div class="fg"><label>Truck</label><select id="m_truck">${state.db.trucks.map(e=>`<option value="${e.id}">${e.reg} — ${e.make}</option>`).join("")}</select></div><div class="form-row-2"><div class="fg"><label>Issue Type</label><select id="m_type"><option>Breakdown</option><option>Scheduled</option><option>Preventive</option><option>Electrical</option><option>Tyre</option><option>Engine</option><option>Brake</option><option>Suspension</option></select></div><div class="fg"><label>Priority</label><select id="m_priority"><option value="critical">Critical</option><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div></div><div class="fg"><label>Description</label><textarea id="m_desc" rows="3" placeholder="Describe the issue…"></textarea></div><div class="form-row-2"><div class="fg"><label>Technician</label><input id="m_tech" placeholder="Tech name"/></div><div class="fg"><label>Estimated Cost (KSh)</label><input id="m_cost" type="number" placeholder="0"/></div></div><button class="submit-btn" onclick="saveMaint()">Log Issue →</button>`)}function saveMaint(){const e=document.getElementById("m_desc").value.trim();if(!e)return void toast("Description required","error");const t={id:uid("MNT"),truckId:document.getElementById("m_truck").value,type:document.getElementById("m_type").value,priority:document.getElementById("m_priority").value,desc:e,tech:document.getElementById("m_tech").value.trim(),cost:Math.max(0,parseInt(document.getElementById("m_cost").value)||0),status:"open",date:(new Date).toISOString(),resolvedDate:null};state.db.maintenance.push(t);const i=state.db.trucks.find(e=>e.id===t.truckId);i&&"critical"===t.priority?i.status="breakdown":!i||"high"!==t.priority&&"medium"!==t.priority||"available"!==i.status||(i.status="maintenance"),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Maintenance Logged",`${truckName(t.truckId)} — ${t.type}`),closeModal(),renderMaint("all"),toast("Issue logged","success")}function renderFuel(){fillSelect("f_truck",state.db.trucks,e=>[e.id,`${e.reg} — ${e.make}`]),fillSelect("f_driver",state.db.drivers,e=>[e.id,e.name]),renderFuelTable(),renderFuelSummary()}function renderFuelTable(){const e=[...state.db.fuel].sort((e,t)=>new Date(t.date)-new Date(e.date)),t=document.getElementById("fuelTableBody");t&&(t.innerHTML=e.map(e=>`<tr><td class="mono" style="font-size:10px">${fmtDate(e.date)}</td><td>${state.db.trucks.find(t=>t.id===e.truckId)?.reg||e.truckId}</td><td>${driverName(e.driverId)}</td><td class="mono" style="text-align:right">${fmt(e.litres)} L</td><td class="mono" style="text-align:right">${fmt(e.pricePerLitre)}</td><td class="mono" style="text-align:right;color:var(--gold);font-weight:700">${fmtKsh(e.litres*e.pricePerLitre)}</td><td style="color:var(--text-3);font-size:11px">${e.station}</td></tr>`).join("")||'<tr><td colspan="7" class="empty-td">No fuel logs</td></tr>')}function renderFuelSummary(){const e=state.db.fuel,t=e.reduce((e,t)=>e+t.litres,0),i=e.reduce((e,t)=>e+t.litres*t.pricePerLitre,0),n=e.length?i/t:0,a=document.getElementById("fuelSummary");a&&(a.innerHTML=`<div class="fuel-summary-row"><span class="fsr-label">Total Litres</span><span class="fsr-val">${fmt(t)} L</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Cost</span><span class="fsr-val">${fmtKsh(i)}</span></div><div class="fuel-summary-row"><span class="fsr-label">Avg Price/Litre</span><span class="fsr-val">KSh ${n.toFixed(2)}</span></div><div class="fuel-summary-row"><span class="fsr-label">Fill-ups Logged</span><span class="fsr-val">${e.length}</span></div>`)}function addFuelLog(){const e=document.getElementById("f_truck").value,t=document.getElementById("f_driver").value,i=parseFloat(document.getElementById("f_litres").value)||0,n=parseFloat(document.getElementById("f_price").value)||0;if(!e||i<=0||n<=0)return void toast("Truck, litres and price required","error");if(i>1e3)return void toast("Litres exceed reasonable limit (1000L)","error");const a={id:uid("FUEL"),truckId:e,driverId:t,date:(new Date).toISOString(),litres:i,pricePerLitre:n,station:sanitize(document.getElementById("f_station").value.trim())||"Unknown",odometer:Math.max(0,parseInt(document.getElementById("f_odo").value)||0),receipt:document.getElementById("f_receipt").value.trim()||uid("RCP")};state.db.fuel.push(a);const o=state.db.trucks.find(t=>t.id===e);o&&(o.fuelPct=Math.min(100,Math.round(i/400*100+o.fuelPct)),o.mileage=a.odometer||o.mileage),scheduleSave(),addAudit(state.profile.username,"Fuel Log",`${truckName(e)} — ${i}L at KSh ${n}/L`),["f_litres","f_price","f_station","f_odo","f_receipt"].forEach(e=>{const t=document.getElementById(e);t&&(t.value="")}),renderFuelTable(),renderFuelSummary(),toast(`Fuel log saved — ${fmtKsh(i*n)}`,"success")}let _shutoutFilter="all";function filterShutout(e,t){_shutoutFilter=e,document.querySelectorAll("#sec-shutout .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderShutout(e)}function renderShutout(e){let t="all"===e?state.db.shutouts:state.db.shutouts.filter(t=>t.status===e);const i=document.getElementById("shutoutList");i&&(i.innerHTML=t.map(e=>`<div class="shutout-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">${e.container}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${e.vessel} · Voyage ${e.voyage}</div></div>${sbadge(e.status)}</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:6px">Reason: ${e.reason}</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--text-3)"><span>${fmtDate(e.date)}</span><span>${truckName(e.truckId)}</span></div>${e.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:6px;font-style:italic">${e.notes}</div>`:""}</div>`).join("")||'<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-label">No shutout records</div></div>')}function showAddShutoutModal(){openModal("Flag Shutout Container",`<div class="form-row-2"><div class="fg"><label>Container No.</label><input id="sh_cont" list="containerHistory" placeholder="MSCU1234566 — pick existing or type new" oninput="markContainerValidity(this)"/></div><div class="fg"><label>Shipping Line</label><select id="sh_line">${state.db.shippingLines.map(e=>`<option value="${e.id}">${e.code}</option>`).join("")}</select></div></div><div class="form-row-2"><div class="fg"><label>Vessel</label><input id="sh_vessel" placeholder="MSC VESSEL NAME"/></div><div class="fg"><label>Voyage No.</label><input id="sh_voyage" placeholder="VA-001"/></div></div><div class="fg"><label>Reason</label><input id="sh_reason" placeholder="Why was this shutout?"/></div><div class="form-row-2"><div class="fg"><label>Truck</label><select id="sh_truck">${state.db.trucks.map(e=>`<option value="${e.id}">${e.reg}</option>`).join("")}</select></div><div class="fg"><label>Driver</label><select id="sh_driver">${state.db.drivers.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}</select></div></div><div class="fg"><label>Notes</label><textarea id="sh_notes" rows="2"></textarea></div><button class="submit-btn" onclick="saveShutout()">Flag Shutout →</button>`)}function saveShutout(){const e=document.getElementById("sh_cont").value.trim().toUpperCase();if(!e)return void toast("Container number required","error");const t=containerFormatIssue(e);if(t)return void toast(`Container number: ${t}`,"error");state.db.shutouts.find(t=>(t.container||"").toUpperCase()===e&&"open"===t.status)?toast(`${e} already has an open shutout record — resolve it before flagging again`,"error"):(state.db.shutouts.push({id:uid("SHT"),container:e,line:document.getElementById("sh_line").value,vessel:sanitize(document.getElementById("sh_vessel").value.trim()),voyage:sanitize(document.getElementById("sh_voyage").value.trim()),reason:sanitize(document.getElementById("sh_reason").value.trim()),truckId:document.getElementById("sh_truck").value,driverId:document.getElementById("sh_driver").value,notes:sanitize(document.getElementById("sh_notes").value.trim()),date:(new Date).toISOString(),status:"open"}),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Shutout Flagged",e),closeModal(),renderShutout("all"),refreshContainerHistory(),toast("Shutout flagged","success"))}let _icFilter="all";function filterInterchange(e,t){_icFilter=e,document.querySelectorAll("#sec-interchange .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderInterchange(e)}function renderInterchange(e){let t="all"===e?state.db.interchange:"flagged"===e?state.db.interchange.filter(e=>e.flaggedForReview):state.db.interchange.filter(t=>t.status===e);const i=document.getElementById("interchangeList");if(!i)return;const n=exitedContainerSet();i.innerHTML=t.map(t=>{const i=[t.eirNumber?`EIR ${t.eirNumber}`:null,t.vessel||t.voyage?`${t.vessel||"—"} / ${t.voyage||"—"}`:null,t.dateOut?`Out ${fmtDate(t.dateOut)}`:null].filter(Boolean).join(" · "),a=t.repairs&&t.repairs.length?`<div style="font-size:10.5px;color:var(--red);margin-top:2px">${t.repairs.length} damage item${t.repairs.length>1?"s":""} · KSh ${Number(t.repairTotal||0).toLocaleString(void 0,{minimumFractionDigits:2})}</div>`:"",o=!("Gate-In"!==t.type&&"Depot-In"!==t.type||t.dateOut||n.has(t.container));return`<div class="ic-card"><div class="ic-card-img-placeholder" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload('interchange','${t.id}','img',()=>renderInterchange('${e}'))" title="Upload container photo">${t.img?`<img src="${t.img}" style="width:100%;height:100%;object-fit:cover" />`:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">${t.container}</div>${sbadge(t.status)}${t.flaggedForReview?`<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${esc((t.flagReasons||[]).join("; "))}">⚠ Flagged</span>`:""}</div><div style="font-size:11.5px;color:var(--text-2)">${t.type} · ${lineName(t.line)} · ${t.condition}${t.ctype?" · "+t.ctype:""}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">${t.truck?truckName(t.truck):t.truckRegText||"—"} · ${t.driver?driverName(t.driver):t.driverNameText||"—"} · ${fmtDate(t.date)}</div>${i?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${i}</div>`:""}${a}${t.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${t.notes}</div>`:""}</div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">${isAdmin()&&"pending"===t.status?`<button class="modal-btn success" onclick="approveInterchange('${t.id}')">Approve</button>`:""}${o?`<button class="modal-btn ghost" onclick="quickDispatchOut('${t.id}')">Quick Dispatch →</button>`:""}<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${t.id}')">⬇ Download</button>${t.flaggedForReview?`<button class="modal-btn ghost" onclick="clearReviewFlag('interchange','${t.id}')">✓ Mark Reviewed</button>`:""}${t.surveyId?`<button class="modal-btn ghost" onclick="downloadInspectionReport('${t.surveyId}')">⬇ Inspection Report</button>`:""}${t.surveyId||t.img?`<button class="modal-btn ghost" onclick="showContainerPhotos('${t.id}')">📷 Photos</button>`:""}</div></div>`}).join("")||'<div class="empty-state"><div class="empty-state-icon">🔄</div><div class="empty-state-label">No interchange records</div></div>'}async function showContainerPhotos(e){const t=state.db.interchange.find(t=>t.id===e);if(!t)return void toast("Interchange record not found","error");openModal(`Photos — ${sanitize(t.container)||"Container"}`,'<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');let i=[];if(t.surveyId){let e=_surveyRegisterData.find(e=>e.id===t.surveyId)||_surveyLookupCache[t.surveyId];if(!e)try{e=await window.bookingDocs.surveyById(t.surveyId),e&&(_surveyLookupCache[e.id]=e)}catch(e){}e&&Array.isArray(e.photos)&&(i=e.photos.slice())}t.img&&-1===i.indexOf(t.img)&&i.unshift(t.img);const n=document.getElementById("modalBody");n&&(i.length?n.innerHTML=`\n    <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${i.length} photo${i.length>1?"s":""} on file${t.surveyId?" · captured at survey":""} — tap to view full size</div>\n    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${i.map((e,t)=>`<img src="${e}" alt="Container photo ${t+1}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid var(--border)" onclick="openPhotoLightbox(this.src)">`).join("")}</div>`:n.innerHTML='<div class="empty-state"><div class="empty-state-label">No photos on file for this container</div></div>')}function openPhotoLightbox(e){const t=document.createElement("div");t.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px";const i=document.createElement("img");i.src=e,i.style.cssText="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px",t.appendChild(i),t.onclick=()=>t.remove(),document.body.appendChild(t)}function printInterchangeList(){const e="all"===_icFilter?state.db.interchange:state.db.interchange.filter(e=>e.status===_icFilter);if(!e.length)return void toast("Nothing to print yet","error");const t=e.map(e=>`<tr>\n    <td>${fmtDate(e.date)}</td><td>${sanitize(e.container||"—")}</td><td>${sanitize(e.eirNumber||"—")}</td><td>${sanitize(e.type||"—")}</td>\n    <td>${sanitize(lineName(e.line))}</td><td>${sanitize(e.condition||"—")}</td>\n    <td>${sanitize(truckName(e.truck))}</td><td>${sanitize(driverName(e.driver))}</td>\n    <td>${e.repairTotal?"KSh "+Number(e.repairTotal).toLocaleString(void 0,{minimumFractionDigits:2}):"—"}</td><td>${sanitize((e.status||"").toUpperCase())}</td>\n  </tr>`).join(""),i=window.open("","_blank");i.document.write(`<html><head><title>Interchange Records</title><style>\n    body{font-family:Arial,sans-serif;padding:20px;color:#111}\n    table{width:100%;border-collapse:collapse;font-size:11px}\n    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}\n    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}\n    h2{margin-bottom:4px}\n  </style></head><body><h2>Gargo Haven Depot — Interchange Records</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${(new Date).toLocaleString("en-KE")} · Filter: ${_icFilter}</div>\n  <table><thead><tr><th>Date</th><th>Container</th><th>EIR No.</th><th>Type</th><th>Line</th><th>Condition</th><th>Truck</th><th>Driver</th><th>Repair Cost</th><th>Status</th></tr></thead><tbody>${t}</tbody></table>\n  </body></html>`),i.document.close(),i.focus(),i.print()}function downloadInterchangeCSV(){const e="all"===_icFilter?state.db.interchange:state.db.interchange.filter(e=>e.status===_icFilter);if(!e.length)return void toast("Nothing to download yet","error");const t=[["Date","Container","EIR No.","Type","Container Type","Shipping Line","Vessel","Voyage","Delivering Party","Guarantee No.","Cargo Status","Condition","Truck","Driver","Date Out","Receiving Party","Release Order No.","Repair Items","Repair Total","Status","Notes"],...e.map(e=>[e.date,e.container,e.eirNumber,e.type,e.ctype,lineName(e.line),e.vessel,e.voyage,e.deliveringParty,e.guaranteeNo,e.cargoStatus,e.condition,truckName(e.truck),driverName(e.driver),e.dateOut,e.receivingParty,e.releaseOrderNo,(e.repairs||[]).map(e=>`${e.code} (${e.item})`).join("; "),e.repairTotal||0,e.status,e.notes])].map(e=>e.map(e=>`"${String(null==e?"":e).replace(/"/g,'""')}"`).join(",")).join("\n"),i=new Blob([t],{type:"text/csv"}),n=document.createElement("a");n.href=URL.createObjectURL(i),n.download=`interchange-${_icFilter}-${(new Date).toISOString().slice(0,10)}.csv`,n.click(),URL.revokeObjectURL(n.href)}const INWARD_IC_TYPES=["Gate-In","Depot-In"],OUTWARD_IC_TYPES=["Gate-Out","Depot-Out"];let _depotReportTab="inward",_depotReportRange="all",_depotReportLine="all",_depotReportDupes=[];function switchDepotReportTab(e,t){_depotReportTab=e,document.querySelectorAll("#sec-depotreport .filter-row .filter-btn[data-tab]").forEach(e=>e.classList.remove("active")),t&&t.classList.add("active"),renderDepotReport()}function filterDepotReportRange(e,t){_depotReportRange=e,document.querySelectorAll("#sec-depotreport .filter-row .filter-btn[data-range]").forEach(e=>e.classList.remove("active")),t&&t.classList.add("active"),renderDepotReport()}function filterDepotReportLine(){const e=document.getElementById("drLineFilter");_depotReportLine=e?e.value:"all",renderDepotReport()}function _depotReportInRange(e){if("all"===_depotReportRange)return!0;const t=new Date;return t.setDate(t.getDate()-Number(_depotReportRange)),new Date(e)>=t}function _depotReportLineMatch(e){return"all"===_depotReportLine||("__unmapped__"===_depotReportLine?!e.line:e.line===_depotReportLine)}function _tripToDepotReportRecord(e){const t=isOutwardWorkType(e.workType);return{id:e.id,container:e.container,type:t?e.outwardType||"Dispatch (Depot → Port)":"Inward (Port → Depot)",line:e.shippingLine||"",condition:"",truck:e.truckId||"",driver:e.driverId||"",truckRegText:"",driverNameText:"",eirNumber:e.eirNumber||"",vessel:e.vessel||"",voyage:e.voyage||"",date:t&&e.dateOut||e.startTime,status:e.status,notes:e.notes||"",flaggedForReview:!!e.flaggedForReview,flagReasons:e.flagReasons||[],importBatchId:e.importBatchId||null,_reportSource:"trips"}}function _depotReportInwardEntries(){return[...state.db.interchange.filter(e=>INWARD_IC_TYPES.includes(e.type)).map(e=>({...e,_reportSource:"interchange"})),...state.db.trips.filter(e=>!isOutwardWorkType(e.workType)).map(_tripToDepotReportRecord)].filter(_depotReportLineMatch).filter(e=>_depotReportInRange(e.date)).sort((e,t)=>new Date(t.date)-new Date(e.date))}function _depotReportOutwardEntries(){return[...state.db.interchange.filter(e=>OUTWARD_IC_TYPES.includes(e.type)).map(e=>({...e,_reportSource:"interchange"})),...state.db.trips.filter(e=>isOutwardWorkType(e.workType)).map(_tripToDepotReportRecord)].filter(_depotReportLineMatch).filter(e=>_depotReportInRange(e.date)).sort((e,t)=>new Date(t.date)-new Date(e.date))}function _icSourceTag(e){const t=/bulk import/i.test(e.notes||"")||e.truckRegText||e.driverNameText?"Bulk":"Manual";return"trips"===e._reportSource?`${t} · Trips`:t}function populateDepotReportLineFilter(){const e=document.getElementById("drLineFilter");e&&!e.dataset.populated&&(e.innerHTML='<option value="all">All Lines</option><option value="__unmapped__">⚠ No Line Assigned</option>'+state.db.shippingLines.map(e=>`<option value="${e.id}">${esc(e.code)}</option>`).join(""),e.dataset.populated="1")}function computeDepotReportDuplicates(){const e=state.db.interchange,t={};e.forEach(e=>{const i=`${(e.container||"").toUpperCase()}::${e.type}::${new Date(e.date).toDateString()}`;(t[i]=t[i]||[]).push(e)});const i=Object.values(t).filter(e=>e.length>1).map(e=>({kind:"Same container, type & day",records:e,ids:e.map(e=>e.id)}));return _depotReportDupes=[...i],_depotReportDupes}function renderDepotReport(){populateDepotReportLineFilter(),computeDepotReportDuplicates();const e=_depotReportInwardEntries(),t=_depotReportOutwardEntries(),i=state.db.interchange.filter(e=>!e.line).length+state.db.trips.filter(e=>!e.shippingLine).length,n=document.getElementById("depotReportKpis");n&&(n.innerHTML=[kpiCard("Inward Entries",e.length,INWARD_IC_TYPES.join(" / "),"kpi-green"),kpiCard("Outward Entries",t.length,[...OUTWARD_IC_TYPES,"Dispatch trips"].join(" / "),"kpi-gold"),kpiCard("Net Movement",e.length-t.length,"Inward − outward, in range","kpi-blue"),kpiCard("Duplicates Flagged",_depotReportDupes.length,"Across full register",_depotReportDupes.length?"kpi-red":"kpi-green")].join(""));const a=document.getElementById("depotReportUnmappedNotice");a&&(a.style.display=i?"flex":"none",a.innerHTML=i?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> ${i} record${1===i?"":"s"} across the whole register have no shipping line assigned and won't appear under any line filter. <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold);font-weight:600">Resolve them →</a>`:"");const o=document.getElementById("depotReportDupeCount");o&&(o.textContent=_depotReportDupes.length?`(${_depotReportDupes.length})`:"");const r=document.getElementById("depotReportTabInward"),s=document.getElementById("depotReportTabOutward"),d=document.getElementById("depotReportTabDupes");r&&(r.style.display="inward"===_depotReportTab?"block":"none"),s&&(s.style.display="outward"===_depotReportTab?"block":"none"),d&&(d.style.display="dupes"===_depotReportTab?"block":"none"),"inward"===_depotReportTab&&renderDepotReportTable("depotReportInwardList",e),"outward"===_depotReportTab&&renderDepotReportTable("depotReportOutwardList",t),"dupes"===_depotReportTab&&renderDepotReportDupesList()}function renderDepotReportTable(e,t){const i=document.getElementById(e);if(!i)return;if(!t.length)return void(i.innerHTML='<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-label">No entries in this range</div></div>');const n=new Set(_depotReportDupes.flatMap(e=>e.ids));i.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr>\n      <th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Vessel / Voyage</th>\n      <th>Truck</th><th>Driver</th><th>Condition</th><th>Status</th><th>Source</th>\n    </tr></thead><tbody>${t.map(e=>`<tr${n.has(e.id)||e.flaggedForReview?' style="background:rgba(220,60,60,0.08)"':""}>\n      <td class="mono">${fmtDate(e.date)}</td>\n      <td class="mono" style="color:var(--gold)">${esc(e.container)}${n.has(e.id)||e.flaggedForReview?" ⚠":""}</td>\n      <td>${esc(e.type)}</td>\n      <td>${esc(lineName(e.line))}</td>\n      <td class="mono">${esc(e.eirNumber||"—")}</td>\n      <td>${esc(e.vessel||"—")}${e.voyage?" / "+esc(e.voyage):""}</td>\n      <td>${e.truck?esc(truckName(e.truck)):esc(e.truckRegText||"—")}</td>\n      <td>${e.driver?esc(driverName(e.driver)):esc(e.driverNameText||"—")}</td>\n      <td>${esc(e.condition||"—")}</td>\n      <td>${sbadge(e.status)}</td>\n      <td>${_icSourceTag(e)}</td>\n    </tr>`).join("")}</tbody></table></div>`}function renderDepotReportDupesList(){const e=document.getElementById("depotReportDupesList");e&&(_depotReportDupes.length?e.innerHTML=_depotReportDupes.map(e=>`\n    <div class="ic-card" style="flex-direction:column;align-items:stretch;margin-bottom:10px">\n      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">\n        <div style="font-size:12px;font-weight:600;color:var(--red)">${esc(e.kind)}</div>\n        <div style="font-size:10px;color:var(--text-3)">${e.records.length} records</div>\n      </div>\n      ${e.records.map(e=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--border);font-size:11px">\n          <div class="mono" style="color:var(--text-2)"><span style="color:var(--gold)">${esc(e.container)}</span> · ${esc(e.type)} · ${fmtDate(e.date)} · EIR ${esc(e.eirNumber||"—")} · ${_icSourceTag(e)}</div>\n          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">\n            ${sbadge(e.status)}\n          </div>\n        </div>`).join("")}\n    </div>`).join(""):e.innerHTML='<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-label">No duplicates found across the register</div></div>')}function printDepotReport(){const e="outward"===_depotReportTab?_depotReportOutwardEntries():_depotReportInwardEntries();if(!e.length)return void toast("Nothing to print yet","error");const t=e.map(e=>`<tr>\n    <td>${fmtDate(e.date)}</td><td>${sanitize(e.container||"—")}</td><td>${sanitize(e.type||"—")}</td>\n    <td>${sanitize(lineName(e.line))}</td><td>${sanitize(e.eirNumber||"—")}</td>\n    <td>${sanitize(e.truck?truckName(e.truck):e.truckRegText||"—")}</td>\n    <td>${sanitize(e.driver?driverName(e.driver):e.driverNameText||"—")}</td>\n    <td>${sanitize((e.status||"").toUpperCase())}</td><td>${_icSourceTag(e)}</td>\n  </tr>`).join(""),i=window.open("","_blank");i.document.write(`<html><head><title>Depot Report</title><style>\n    body{font-family:Arial,sans-serif;padding:20px;color:#111}\n    table{width:100%;border-collapse:collapse;font-size:11px}\n    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}\n    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}\n    h2{margin-bottom:4px}\n  </style></head><body><h2>Gargo Haven Depot — ${"outward"===_depotReportTab?"Outward":"Inward"} Register</h2>\n  <div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${(new Date).toLocaleString("en-KE")} · Range: ${"all"===_depotReportRange?"All time":`Last ${_depotReportRange} days`} · ${e.length} record(s)</div>\n  <table><thead><tr><th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Truck</th><th>Driver</th><th>Status</th><th>Source</th></tr></thead><tbody>${t}</tbody></table>\n  </body></html>`),i.document.close(),i.focus(),i.print()}function downloadDepotReportCSV(){const e="outward"===_depotReportTab?_depotReportOutwardEntries():_depotReportInwardEntries();if(!e.length)return void toast("Nothing to download yet","error");const t=[["Date","Container","Type","Shipping Line","EIR No.","Vessel","Voyage","Truck","Driver","Condition","Status","Source"],...e.map(e=>[e.date,e.container,e.type,lineName(e.line),e.eirNumber,e.vessel,e.voyage,e.truck?truckName(e.truck):e.truckRegText,e.driver?driverName(e.driver):e.driverNameText,e.condition,e.status,_icSourceTag(e)])].map(e=>e.map(e=>`"${String(null==e?"":e).replace(/"/g,'""')}"`).join(",")).join("\n"),i=new Blob([t],{type:"text/csv"}),n=document.createElement("a");n.href=URL.createObjectURL(i),n.download=`depot-report-${_depotReportTab}-${(new Date).toISOString().slice(0,10)}.csv`,n.click(),URL.revokeObjectURL(n.href)}function approveInterchange(e){if(!isAdmin())return void toast("Admin rights required","error");const t=state.db.interchange.find(t=>t.id===e);t&&(t.status="approved",t._dirty=!0,scheduleSave(),buildBadges(),addAudit(state.profile.username,"Interchange Approved",t.container),renderInterchange(_icFilter),toast("Interchange approved","success"))}function showAddInterchangeModal(){window._repairItems.ic=[];openModal("Record Interchange",`<div class="form-row-2"><div class="fg"><label>Container No.</label><input id="ic_cont" list="containerHistory" placeholder="MSCU1234566 — pick existing or type new" oninput="markContainerValidity(this)"/></div><div class="fg"><label>Movement</label><select id="ic_type"><option>Gate-In</option><option>Gate-Out</option><option>Depot-In</option><option>Depot-Out</option></select></div></div><div class="form-row-2"><div class="fg"><label>Container Type/Size</label><select id="ic_ctype">${CONTAINER_TYPE_OPTIONS.map(e=>`<option>${e}</option>`).join("")}</select></div><div class="fg"><label>Shipping Line</label><select id="ic_line">${state.db.shippingLines.map(e=>`<option value="${e.id}">${e.code}</option>`).join("")}</select></div></div><div class="form-row-2"><div class="fg"><label>EIR / Reference No.</label><input id="ic_eir" placeholder="Transporter's own EIR no."/></div><div class="fg"><label>B/L Number</label><input id="ic_bl"/></div></div><div class="form-row-2"><div class="fg"><label>Vessel</label><input id="ic_vessel"/></div><div class="fg"><label>Voyage</label><input id="ic_voyage"/></div></div><div class="form-row-2"><div class="fg"><label>Truck</label><select id="ic_truck">${state.db.trucks.map(e=>`<option value="${e.id}">${e.reg}</option>`).join("")}</select></div><div class="fg"><label>Driver</label><select id="ic_driver">${state.db.drivers.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}</select></div></div><div class="fg"><label>Overall Condition</label><select id="ic_cond"><option>Good</option><option>Damaged</option><option>Dirty</option><option>Needs Repair</option></select></div>${tariffPickerHtml("ic")}<div class="fg"><label>Notes</label><textarea id="ic_notes" rows="2" placeholder="Damage notes, remarks…"></textarea></div><button class="submit-btn" onclick="saveInterchange()">Record Interchange →</button>`),renderRepairItemsList("ic")}function saveInterchange(){const e=document.getElementById("ic_cont").value.trim().toUpperCase();if(!e)return void toast("Container number required","error");const t=containerFormatIssue(e);if(t)return void toast(`Container number: ${t}`,"error");if(findDuplicateInterchange(e,document.getElementById("ic_type").value,(new Date).toISOString()))return void toast(`${e} already has a ${document.getElementById("ic_type").value} interchange record logged today`,"warning");const i=window._repairItems.ic||[];state.db.interchange.push({id:uid("IC"),container:e,type:document.getElementById("ic_type").value,ctype:document.getElementById("ic_ctype").value,line:document.getElementById("ic_line").value,condition:document.getElementById("ic_cond").value,truck:document.getElementById("ic_truck").value,driver:document.getElementById("ic_driver").value,eirNumber:sanitize(document.getElementById("ic_eir").value.trim()),blNumber:sanitize(document.getElementById("ic_bl").value.trim()),vessel:sanitize(document.getElementById("ic_vessel").value.trim()),voyage:sanitize(document.getElementById("ic_voyage").value.trim()),repairs:i,repairTotal:repairItemsTotal(i),notes:sanitize(document.getElementById("ic_notes").value.trim()),date:(new Date).toISOString(),status:"pending",img:"",_dirty:!0}),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Interchange Recorded",e),closeModal(),renderInterchange("all"),refreshContainerHistory(),toast("Interchange recorded","success")}function downloadInterchangeSlip(e){const t=state.db.interchange.find(t=>t.id===e);if(!t)return void toast("Interchange record not found","error");if(!window.jspdf)return void toast("PDF library still loading — try again in a moment","error");const{jsPDF:i}=window.jspdf,n=new i,a=[201,162,39],o=14,r=182,s=196;function d(e,t,i,a,o,r){n.setDrawColor(150),n.setLineWidth(.25),n.rect(e,t,i,a),n.setFont(void 0,"normal"),n.setFontSize(6.5),n.setTextColor(120),n.text(String(o).toUpperCase(),e+2,t+4.5),n.setFont(void 0,"bold"),n.setFontSize(9.5),n.setTextColor(20);const s=n.splitTextToSize(String(r||"—"),i-4);n.text(s.slice(0,2),e+2,t+(a>10?10:9))}function l(e,t){n.setFont(void 0,"bold"),n.setFontSize(8.5),n.setTextColor(...a),n.text(e.toUpperCase(),o,t),n.setDrawColor(...a),n.setLineWidth(.4),n.line(o,t+1.5,s,t+1.5),n.setTextColor(20)}n.setFont(void 0,"bold"),n.setFontSize(15),n.setTextColor(20),n.text("GARGO HAVEN DEPOT LIMITED",o,20),n.setFont(void 0,"italic"),n.setFontSize(9.5),n.setTextColor(...a),n.text("Container Interchange Report",o,26.5),n.setFont(void 0,"normal"),n.setFontSize(7.5),n.setTextColor(120),n.text("Mombasa, Kenya  ·  Generated automatically for reference only",o,31.5),d(140,12,28,10,t.type?`${t.type} Date`:"Date",fmtDate(t.date)),d(168,12,28,10,"EIR / IER No.",t.eirNumber||t.id.slice(0,8).toUpperCase()),n.setDrawColor(180),n.setLineWidth(.3),n.line(o,36,s,36);let c=41;d(o,c,r,11,"Shipping Line",lineName(t.line)),c+=14,d(o,c,62,11,"Container No.",t.container),d(79,c,42,11,"Type / Size",t.ctype),d(124,c,33,11,"Movement",t.type),d(160,c,36,11,"Condition",(t.condition||"—").toUpperCase()),c+=14,d(o,c,60,11,"Vessel Name",t.vessel),d(77,c,40,11,"Voyage No.",t.voyage),d(120,c,76,11,"B/L Number",t.blNumber),c+=14,d(o,c,92,11,"Party Delivering / Receiving",t.truck?truckName(t.truck):t.truckRegText||"—"),d(109,c,42,11,"Vehicle No.",t.truck?truckName(t.truck).split(" · ")[0]:t.truckRegText||"—"),d(154,c,42,11,"Driver",t.driver?driverName(t.driver):t.driverNameText||"—"),c+=18,l("Container Inspection",c),c+=6;const p=o,u=c,m=62,v=38,g=[{code:"T",label:"Top / Roof"},{code:"L",label:"Left Side"},{code:"R",label:"Right Side"},{code:"F",label:"Front"},{code:"D",label:"Rear / Door"},{code:"B",label:"Floor / Bottom"}],f=t.repairs||[];const y=new Set(g.filter(e=>f.some(t=>function(e,t){if(!e)return!1;const i=String(e).toLowerCase();return new RegExp({T:"top|roof",L:"left",R:"right",F:"front",D:"rear|door",B:"floor|bottom"}[t]).test(i)}(t.side,e.code))).map(e=>e.code));n.setDrawColor(150),n.setLineWidth(.3),n.rect(p,u,m,v),n.setDrawColor(190),n.line(p,u+8.36,76,u+8.36),n.line(p,u+29.64,76,u+29.64),n.line(45,u,45,u+v);[{code:"T",x:45,y:u+4.18},{code:"F",x:29.5,y:u+19},{code:"D",x:60.5,y:u+19},{code:"B",x:45,y:u+33.82}].forEach(e=>{const t=y.has(e.code);n.setDrawColor(t?200:160,t?40:160,t?40:160),n.setFillColor(t?220:245,t?60:245,t?60:245),n.circle(e.x,e.y,3.4,"FD"),n.setFont(void 0,"bold"),n.setFontSize(7),n.setTextColor(t?255:90,t?255:90,t?255:90),n.text(e.code,e.x,e.y+1.3,{align:"center"})}),["L","R"].forEach(e=>{const t=y.has(e),i="L"===e?9.5:80.5;n.setDrawColor(t?200:160,t?40:160,t?40:160),n.setFillColor(t?220:245,t?60:245,t?60:245),n.circle(i,u+19,3.4,"FD"),n.setFont(void 0,"bold"),n.setFontSize(7),n.setTextColor(t?255:90,t?255:90,t?255:90),n.text(e,i,u+19+1.3,{align:"center"})}),n.setTextColor(20);let b=u+3;n.setFont(void 0,"bold"),n.setFontSize(7),n.setTextColor(120),n.text("LOCATION LEGEND",90,b),b+=5,g.forEach(e=>{const t=y.has(e.code);n.setDrawColor(t?200:170,t?40:170,t?40:170),n.setFillColor(t?220:255,t?60:255,t?60:255),n.circle(91.6,b-1,1.8,"FD"),n.setFont(void 0,t?"bold":"normal"),n.setFontSize(7.5),n.setTextColor(t?160:60,t?30:60,t?30:60),n.text(`${e.code} — ${e.label}${t?"  (damage noted)":""}`,96,b),b+=5}),n.setTextColor(20),c=u+v+10,l("Repair Estimate",c),c+=5;const h=[{key:"code",label:"Code",x:o,w:18},{key:"item",label:"Description of Damage / Repair",x:32,w:92},{key:"side",label:"Side",x:124,w:18},{key:"labour",label:"Labour Cost",x:142,w:27},{key:"material",label:"Material Cost",x:169,w:27}];n.setDrawColor(150),n.setLineWidth(.25),n.setFillColor(235,235,235),n.rect(o,c,r,7,"FD"),h.forEach(e=>n.rect(e.x,c,e.w,7)),n.setFont(void 0,"bold"),n.setFontSize(7.5),n.setTextColor(60),h.forEach(e=>n.text(e.label,e.x+1.5,c+4.7)),c+=7,n.setFont(void 0,"normal"),n.setFontSize(8),n.setTextColor(20);let w=0;f.length?f.forEach(e=>{const t=Number(e.hours||0)*REPAIR_LABOUR_RATE_PER_HOUR,i=Number(e.material||0);w+=t+i;const a=n.splitTextToSize(e.item||"—",h[1].w-3),o=Math.max(7,3.6*a.length+3);h.forEach(e=>n.rect(e.x,c,e.w,o)),n.text(String(e.code||"—"),h[0].x+1.5,c+4.6),n.text(a,h[1].x+1.5,c+4.6),n.text(String(e.side||"—"),h[2].x+1.5,c+4.6),n.text(t.toLocaleString(void 0,{minimumFractionDigits:2}),h[3].x+h[3].w-1.5,c+4.6,{align:"right"}),n.text(i.toLocaleString(void 0,{minimumFractionDigits:2}),h[4].x+h[4].w-1.5,c+4.6,{align:"right"}),c+=o}):(n.rect(o,c,r,8),n.setFont(void 0,"italic"),n.setTextColor(100),n.text("Container received in good condition — no damage items recorded.",16,c+5.3),n.setFont(void 0,"normal"),n.setTextColor(20),c+=8);const k=Number(t.repairTotal||w||repairItemsTotal(f)||0);n.setDrawColor(150),n.rect(o,c,148,8),n.rect(162,c,34,8,"S"),n.setFont(void 0,"bold"),n.setFontSize(8.5),n.text("TOTAL (LABOUR + MATERIAL)",16,c+5.3),n.text(`KSh ${k.toLocaleString(void 0,{minimumFractionDigits:2})}`,194,c+5.3,{align:"right"}),c+=14,c>250&&(n.addPage(),c=20),d(o,c,60,11,"Place of Inspection","Gargo Haven Depot, Mombasa"),d(77,c,55,11,"Inspector Name",""),d(135,c,61,11,"Approval Date",""),c+=14,d(o,c,r,16,"Remarks",t.notes||""),c+=24,n.setDrawColor(180),n.setLineWidth(.3),n.line(o,c,90,c),n.line(120,c,s,c),n.setFont(void 0,"normal"),n.setFontSize(8.5),n.setTextColor(110),n.text("Depot Officer Signature",o,c+5),n.text("Driver / Transporter Signature",120,c+5),n.setFontSize(7.5),n.setTextColor(150),n.text("This document confirms container delivery/receipt at Gargo Haven Depot and supports transporter payment processing.",o,289),n.save(`interchange-${(t.container||t.id).replace(/\s+/g,"")}.pdf`)}async function downloadInspectionReport(e){if(!e)return void toast("No survey on file for this record","error");let t=_surveyRegisterData.find(t=>t.id===e)||_surveyLookupCache[e];if(t||(t=await window.bookingDocs.surveyById(e),t&&(_surveyLookupCache[t.id]=t)),!t)return void toast("Survey record not found","error");if(!window.jspdf)return void toast("PDF library still loading — try again in a moment","error");const{jsPDF:i}=window.jspdf,n=new i,a=[46,125,50],o=[30,64,175],r=[201,162,39],s=14,d=182,l=196;function c(e,t,i,a,o){n.setFillColor(...o),n.setDrawColor(...o),n.roundedRect(e,t,i,a,1.5,1.5,"F")}function p(e,t,i,a,o){n.setFont(void 0,"normal"),n.setFontSize(7),n.setTextColor(90),n.text(String(i).toUpperCase(),e,t),n.setFont(void 0,"bold"),n.setFontSize(9.5),n.setTextColor(...o||[20,20,20]),n.text(String(a||"—"),e,t+5),n.setTextColor(20)}function u(e,t){n.setFont(void 0,"bold"),n.setFontSize(10),n.setTextColor(20),n.text(e.toUpperCase(),s,t),n.setDrawColor(20),n.setLineWidth(.5),n.line(s,t+1.5,l,t+1.5)}function m(e,t){return e+t>282?(n.addPage(),20):e}const v=t.tariff_items||[],g=v.reduce((e,t)=>e+(Number(t.price)||Number(t.material)||Number(t.hours||0)*REPAIR_LABOUR_RATE_PER_HOUR||0),0),f=new Date,y=`REP-INS-${String(t.id).replace(/-/g,"").slice(0,8).toUpperCase()}`;n.setFont(void 0,"bold"),n.setFontSize(13),n.setTextColor(20),n.text("GARGO HAVEN DEPOT Ltd",s,18),n.setFont(void 0,"normal"),n.setFontSize(7.5),n.setTextColor(110),n.text("Refinery Road, Changamwe, Mombasa. P.O. Box 3291 - 80100 GPO, MSA",s,23.5),n.text("Email: info@gargohavendepot.co.ke",s,27.5),n.setFont(void 0,"bold"),n.setFontSize(20),n.setTextColor(20),n.text("INSPECTION",l,17,{align:"right"}),n.setFont(void 0,"bold"),n.setFontSize(8.5),n.setTextColor(...r),n.text(y,l,23,{align:"right"}),n.setFont(void 0,"normal"),n.setFontSize(7.5),n.setTextColor(140),n.text(f.toLocaleString("en-KE"),l,27.5,{align:"right"}),n.setDrawColor(20),n.setLineWidth(.6),n.line(s,31,l,31);let b=37;c(s,b,d,18,[232,245,233]),p(18,b+8,"Report ID",y,a),p(18,b+15.5,"Type","Container Inspection Report",a),p(109,b+8,"Generated",fmtDate(f.toISOString()),a),p(109,b+15.5,"Generated By",t.clerk_name||"—",a),b+=24,c(s,b,d,10,[219,234,254]),n.setFont(void 0,"bold"),n.setFontSize(11),n.setTextColor(...o),n.text("Container Inspection Report",18,b+6.7),n.setTextColor(20),b+=16,u("Inspection Information",b),b+=8,p(s,b,"Inspection ID","#"+String(t.id).slice(0,8).toUpperCase()),p(77,b,"Inspection Date",fmtDate(t.surveyed_at)),p(140,b,"Status",t.escalated?"Escalated":"Completed"),b+=12,p(s,b,"Inspection Method","Manual"),p(77,b,"Overall Condition",(t.condition_status||"").replace(/_/g," ").toUpperCase()),p(140,b,"Surveyed By",t.clerk_name||"—"),b+=16,u("Container Information",b),b+=8,p(s,b,"Container Number",t.container),p(77,b,"Container Type",t.container_type),p(140,b,"ISO Code",t.iso_code),b+=12,p(s,b,"Customer / Consignee",t.consignee),p(77,b,"Shipping Line",lineName(t.shipping_line_id)),p(140,b,"Vessel / Voyage",`${t.vessel||"—"} / ${t.voyage||"—"}`),b+=16,u("Weight & Safety Plate",b),b+=8,p(s,b,"Max Gross Weight (MGW)",t.mgwt?`${t.mgwt} kg`:"—"),p(77,b,"Tare Weight (TW)",t.tare_weight?`${t.tare_weight} kg`:"—"),p(140,b,"Guarantee / B/L No.",t.bl_number),b+=16,u("Transport & Driver Details",b),b+=8,p(s,b,"Vehicle / Truck No.",t.truck_reg),p(77,b,"Trailer Number",t.trailer_number),p(140,b,"Transporter",t.transporter),b+=12,p(s,b,"Driver's Name",t.driver_name),p(77,b,"Driver ID Number",t.driver_id_number),p(140,b,"EIR Number",t.eir_number),b+=12,p(s,b,"Seal Number",t.seal_number),p(77,b,"Gate Pass No.",t.gate_pass_number),b+=18,b=m(b,24);const h=d/3-3;if([{label:"DAMAGE REPORTS",value:String(v.length)},{label:"EST. REPAIR COST",value:`KSh ${g.toLocaleString(void 0,{minimumFractionDigits:2})}`},{label:"CONDITION",value:(t.condition_status||"").replace(/_/g," ").toUpperCase()}].forEach((e,t)=>{const i=s+t*(h+4.5);n.setDrawColor(210),n.setLineWidth(.3),n.roundedRect(i,b,h,18,1.5,1.5,"S"),n.setFont(void 0,"bold"),n.setFontSize(13),n.setTextColor(20),n.text(e.value,i+h/2,b+8,{align:"center"}),n.setFont(void 0,"normal"),n.setFontSize(6.5),n.setTextColor(120),n.text(e.label,i+h/2,b+14,{align:"center"})}),b+=26,t.remarks){b=m(b,20),u("Inspector Notes",b),b+=7,n.setDrawColor(...r),n.setLineWidth(1),n.line(s,b-3,s,b+6),n.setFillColor(245,245,245),n.rect(16,b-4,180,12,"F"),n.setFont(void 0,"italic"),n.setFontSize(8.5),n.setTextColor(60);const e=n.splitTextToSize(t.remarks,174);n.text(e.slice(0,2),19,b+1),n.setTextColor(20),b+=16}const w=Array.isArray(t.photos)?t.photos:[];if(w.length){b=m(b,20),u("Inspection Photos",b),b+=7;const e=58,t=32;w.slice(0,9).forEach((i,a)=>{const o=a%3,r=Math.floor(a/3);r>0&&r%3==0&&0===o&&(n.addPage(),b=20);const d=s+o*(e+4),l=b+r%3*(t+4);try{n.addImage(i,void 0,d,l,e,t,void 0,"FAST")}catch(e){}n.setDrawColor(210),n.rect(d,l,e,t,"S")}),b+=Math.ceil(Math.min(w.length,9)/3)*(t+4)+4}b=m(b,20),u(`Damage Reports (${v.length})`,b),b+=8,v.length?v.forEach(e=>{b=m(b,30);const t=Number(e.price)||Number(e.material)||Number(e.hours||0)*REPAIR_LABOUR_RATE_PER_HOUR||0;n.setDrawColor(210),n.setLineWidth(.3),n.roundedRect(s,b,d,26,1.5,1.5,"S"),n.setFont(void 0,"bold"),n.setFontSize(9),n.setTextColor(20),n.text(`${e.item||e.category||"Damage Item"}`,17,b+6),n.setFillColor(219,234,254),n.roundedRect(172,b+2.5,20,5,1,1,"F"),n.setFont(void 0,"bold"),n.setFontSize(6.5),n.setTextColor(...o),n.text("MINOR",182,b+6,{align:"center"}),n.setTextColor(20),p(17,b+15,"Location",e.side||"—"),p(77,b+15,"Damage / Repair Code",e.code||"—"),p(140,b+15,"Tariff / Repair Price",`KSh ${t.toLocaleString(void 0,{minimumFractionDigits:2})}`,[200,60,60]),b+=30}):(n.setFont(void 0,"italic"),n.setFontSize(8.5),n.setTextColor(100),n.text("No damage items recorded for this container.",s,b),n.setTextColor(20),b+=10),b=m(b,40),n.setDrawColor(20),n.setLineWidth(.5),n.rect(s,b,d,22),n.setFont(void 0,"bold"),n.setFontSize(9),n.setTextColor(20),n.text("Certification",105,b+7,{align:"center"}),n.setFont(void 0,"normal"),n.setFontSize(7.5),n.setTextColor(80);const k=n.splitTextToSize("This inspection report was generated by GARGO HAVEN DEPOT Ltd and represents an accurate record of the container inspection performed.",174);n.text(k,105,b+13,{align:"center"}),b+=30,n.setDrawColor(150),n.line(s,b,84,b),n.setFont(void 0,"normal"),n.setFontSize(8),n.setTextColor(110),n.text("Inspector Signature",s,b+5),n.setFontSize(7.5),n.setTextColor(150),n.text(`GARGO HAVEN DEPOT Ltd — Generated by ${t.clerk_name||"system"} on ${f.toLocaleDateString("en-KE")}`,l,b+5,{align:"right"}),n.save(`inspection-report-${(t.container||t.id).replace(/\s+/g,"")}.pdf`)}let _linesFilter="all";function filterLines(e,t){_linesFilter=e,document.querySelectorAll("#sec-shippinglines .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderLines(e)}function renderLines(e){let t="all"===e?state.db.shippingLines:state.db.shippingLines.filter(e=>e.active);const i=(state.db.interchange||[]).filter(e=>!e.line).length,n=document.getElementById("linesSummary");n&&(n.innerHTML=`<div class="panel"><div class="panel-head"><span class="panel-title">Summary</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Lines</span><span class="fsr-val">${state.db.shippingLines.length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Active</span><span class="fsr-val">${state.db.shippingLines.filter(e=>e.active).length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Trips (all)</span><span class="fsr-val">${state.db.trips.length}</span></div>${i?`<div class="fuel-summary-row"><span class="fsr-label" style="color:var(--gold)">⚠ Interchange records with no line</span><span class="fsr-val">${i}</span></div>`:""}</div>`);const a=document.getElementById("unmappedVesselsBtn");a&&(a.style.display=i?"inline-flex":"none",a.textContent=`⚠ Resolve Unmapped Vessels (${i})`);const o=document.getElementById("linesGrid");o&&(o.innerHTML=t.map(e=>`<div class="line-card"><div class="line-code-badge">${e.code}</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${e.name}</div><div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${e.contact}</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><div class="ts">KSh ${fmt(e.rate20)}<b>20ft Rate</b></div><div class="ts">KSh ${fmt(e.rate40)}<b>40ft Rate</b></div><div class="ts">KSh ${fmt(e.rateHC)}<b>HC Rate</b></div></div><div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">${sbadge(e.active?"active":"off_duty")}${isAdmin()?`<button class="tbl-btn" onclick="showEditLineModal('${e.id}')">✎ Edit Rates</button>`:""}</div></div>`).join("")||'<div class="empty-state"><div class="empty-state-label">No shipping lines</div></div>')}function showEditLineModal(e){if(!isAdmin())return void toast("Admin rights required","error");const t=state.db.shippingLines.find(t=>t.id===e);t?openModal(`Edit ${esc(t.code)} — ${esc(t.name)}`,`<div class="form-row-2"><div class="fg"><label>Code</label><input id="sle_code" value="${esc(t.code)}" maxlength="6"/></div><div class="fg"><label>Full Name</label><input id="sle_name" value="${esc(t.name)}"/></div></div><div class="fg"><label>Contact Email</label><input id="sle_email" type="email" value="${esc(t.contact||"")}"/></div><div class="form-row-2"><div class="fg"><label>20ft Rate (KSh)</label><input id="sle_r20" type="number" min="0" value="${t.rate20}"/></div><div class="fg"><label>40ft Rate (KSh)</label><input id="sle_r40" type="number" min="0" value="${t.rate40}"/></div></div><div class="fg"><label>40ft HC Rate (KSh)</label><input id="sle_rhc" type="number" min="0" value="${t.rateHC}"/></div><div class="fg"><label>Status</label><select id="sle_active"><option value="true" ${t.active?"selected":""}>Active</option><option value="false" ${t.active?"":"selected"}>Inactive</option></select></div><button class="submit-btn" onclick="saveShippingLineEdit('${t.id}')">Save Changes →</button>`):toast("Shipping line not found","error")}function saveShippingLineEdit(e){const t=state.db.shippingLines.find(t=>t.id===e);if(!t)return void toast("Shipping line not found","error");const i=document.getElementById("sle_code").value.trim().toUpperCase(),n=document.getElementById("sle_name").value.trim();if(!i||!n)return void toast("Code and name required","error");if(i.length>6)return void toast("Code must be max 6 characters","error");const a=findLineByCode(i,e);a?toast(`Code ${i} is already used by ${a.name}`,"error"):(t.code=i,t.name=n,t.contact=sanitize(document.getElementById("sle_email").value.trim()),t.rate20=Math.max(0,parseInt(document.getElementById("sle_r20").value)||0),t.rate40=Math.max(0,parseInt(document.getElementById("sle_r40").value)||0),t.rateHC=Math.max(0,parseInt(document.getElementById("sle_rhc").value)||0),t.active="true"===document.getElementById("sle_active").value,scheduleSave(),closeModal(),renderLines(_linesFilter),addAudit(state.profile.username,"Shipping Line Rates Updated",`${i} — 20ft KSh ${fmt(t.rate20)} · 40ft KSh ${fmt(t.rate40)} · HC KSh ${fmt(t.rateHC)}`),toast(`${i} rates updated`,"success"))}function showAddLineModal(){openModal("Add Shipping Line",'<div class="form-row-2"><div class="fg"><label>Code</label><input id="sl_code" placeholder="MSC" maxlength="6"/></div><div class="fg"><label>Full Name</label><input id="sl_name" placeholder="Mediterranean Shipping Co."/></div></div><div class="fg"><label>Contact Email</label><input id="sl_email" type="email" placeholder="office@line.com"/></div><div class="form-row-2"><div class="fg"><label>20ft Rate (KSh)</label><input id="sl_r20" type="number" placeholder="10000"/></div><div class="fg"><label>40ft Rate (KSh)</label><input id="sl_r40" type="number" placeholder="14000"/></div></div><div class="fg"><label>40ft HC Rate (KSh)</label><input id="sl_rhc" type="number" placeholder="16000"/></div><button class="submit-btn" onclick="saveShippingLine()">Add Line →</button>')}function saveShippingLine(){const e=document.getElementById("sl_code").value.trim().toUpperCase(),t=document.getElementById("sl_name").value.trim();if(!e||!t)return void toast("Code and name required","error");if(e.length>6)return void toast("Code must be max 6 characters","error");const i=findLineByCode(e);i?toast(`Code ${e} is already used by ${i.name}`,"error"):(state.db.shippingLines.push({id:uid("SL"),code:e,name:t,contact:sanitize(document.getElementById("sl_email").value.trim()),rate20:Math.max(0,parseInt(document.getElementById("sl_r20").value)||1e4),rate40:Math.max(0,parseInt(document.getElementById("sl_r40").value)||14e3),rateHC:Math.max(0,parseInt(document.getElementById("sl_rhc").value)||16e3),active:!0}),scheduleSave(),closeModal(),renderLines("all"),toast(`${e} added`,"success"))}const UNRESOLVABLE_VESSEL_VALUES=new Set(["","N/A","NA","N.A","N./A","N\\A","TBA","T.B.A","TO BE ADVISED","NOT CAPTURED","DUMMY","EMPTY DUMMY","EMPTY DUMMY VESSEL","N"]);function _unmappedVesselGroups(){const e={};return(state.db.interchange||[]).forEach(t=>{if(t.line)return;const i=normVessel(t.vessel);UNRESOLVABLE_VESSEL_VALUES.has(i)||(e[i]=e[i]||{vessel:i,count:0,ids:[]},e[i].count++,e[i].ids.push(t.id))}),Object.values(e).sort((e,t)=>t.count-e.count)}function openUnmappedVesselsModal(){const e=_unmappedVesselGroups(),t=(state.db.interchange||[]).filter(e=>!e.line&&UNRESOLVABLE_VESSEL_VALUES.has(normVessel(e.vessel))).length,i=state.db.shippingLines.filter(e=>e.active).map(e=>`<option value="${e.id}">${esc(e.code)} — ${esc(e.name)}</option>`).join("");if(!e.length)return void openModal("Resolve Unmapped Vessels",'<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-label">No vessel names left to resolve</div></div>'+(t?`<div class="ops-notice" style="margin-top:10px">${t} record(s) have no line and no vessel recorded either — those need a data fix at the source, not a mapping.</div>`:""));const n=e.slice(0,80).map((e,t)=>`\n    <tr id="uvm_row_${t}">\n      <td class="mono" style="max-width:220px">${esc(e.vessel)}</td>\n      <td class="mono" style="text-align:right">${e.count}</td>\n      <td><select id="uvm_sel_${t}" style="min-width:220px"><option value="">— choose line —</option>${i}</select></td>\n      <td><button class="tbl-btn" onclick="assignVesselToLine(${t})">Assign →</button></td>\n    </tr>`).join("");openModal("Resolve Unmapped Vessels",`\n    <div style="font-size:12px;color:var(--text-3);margin-bottom:10px">\n      ${e.reduce((e,t)=>e+t.count,0)} interchange records across ${e.length} distinct vessel name${1===e.length?"":"s"} have no shipping line. Assigning a vessel here updates every matching record immediately and remembers the mapping for future imports.\n      ${e.length>80?"<br>Showing the top 80 by record count.":""}\n    </div>\n    <div class="table-wrap" style="max-height:420px;overflow-y:auto">\n      <table class="data-table"><thead><tr><th>Vessel</th><th style="text-align:right">Records</th><th>Assign to line</th><th></th></tr></thead>\n      <tbody id="uvmTableBody">${n}</tbody></table>\n    </div>\n    <div id="uvmGroupsData" style="display:none">${esc(JSON.stringify(e.slice(0,80)))}</div>\n  `),window._uvmGroups=e.slice(0,80)}async function assignVesselToLine(e){const t=(window._uvmGroups||[])[e],i=document.getElementById(`uvm_sel_${e}`),n=i?i.value:"";if(!t)return;if(!n)return void toast("Choose a shipping line first","error");const a=state.db.shippingLines.find(e=>e.id===n);if(!a)return void toast("Shipping line not found","error");const o=document.getElementById(`uvm_row_${e}`),r=o?o.querySelector("button"):null;r&&(r.disabled=!0,r.textContent="Assigning…");try{const{error:e}=await supabase.from("interchange").update({line_id:n}).is("line_id",null).in("id",t.ids);if(e)throw e;const{data:i,error:r}=await supabase.from("vessel_line_map").insert({pattern:t.vessel,match_type:"exact",line_id:n,priority:100,source:"manual",created_by:state.profile?.username||null}).select("*").single();!r&&i&&state.db.vesselLineMap.push(vlmFromRow(i));const s=new Set(t.ids);state.db.interchange.forEach(e=>{s.has(e.id)&&(e.line=n)}),addAudit(state.profile.username,"Shipping Line Backfilled",`${t.count} record(s) with vessel "${t.vessel}" → ${a.code}`),toast(`${t.count} record(s) assigned to ${a.code}`,"success"),o&&o.remove(),buildBadges(),renderLines(_linesFilter),document.getElementById("sec-depotreport")?.classList.contains("active")&&renderDepotReport(),document.getElementById("sec-depops")?.classList.contains("active")&&renderDepOpsReports()}catch(e){console.error("assignVesselToLine failed:",e),toast("Could not save — try again","error"),r&&(r.disabled=!1,r.textContent="Assign →")}}let _reqFilter="all";function filterRequisitions(e,t){_reqFilter=e,document.querySelectorAll("#sec-requisitions .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderRequisitions(e)}function renderRequisitions(e){let t="all"===e?state.db.requisitions:state.db.requisitions.filter(t=>t.status===e);const i=document.getElementById("reqList");i&&(i.innerHTML=t.map(e=>`<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${e.category}</div><div class="req-meta">${e.id} · ${fmtDate(e.date)}</div></div><div style="text-align:right">${sbadge(e.status)}<div class="req-amount" style="margin-top:4px">${fmtKsh(e.amount)}</div></div></div><div class="req-items">${e.items}</div><div class="req-meta" style="margin-top:6px">Requester: ${e.requester}${e.approver?` · Approved by: ${e.approver}`:""}</div>${e.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px;font-style:italic">${e.notes}</div>`:""}</div>`).join("")||'<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-label">No requisitions</div></div>')}function showAddRequisitionModal(){openModal("New Requisition",'<div class="form-row-2"><div class="fg"><label>Category</label><select id="rq_cat"><option>Fuel Advance</option><option>Tyre Parts</option><option>Tool Purchase</option><option>Medical</option><option>Lubricants</option><option>Other</option></select></div><div class="fg"><label>Amount (KSh)</label><input id="rq_amt" type="number" placeholder="0"/></div></div><div class="fg"><label>Items / Description</label><textarea id="rq_items" rows="3" placeholder="List what is needed…"></textarea></div><div class="fg"><label>Notes</label><input id="rq_notes" placeholder="Additional context…"/></div><button class="submit-btn" onclick="saveRequisition()">Submit Requisition →</button>')}function saveRequisition(){const e=document.getElementById("rq_items").value.trim(),t=Math.max(0,parseInt(document.getElementById("rq_amt").value)||0);e&&t?state.profile?.id?(state.db.requisitions.push({id:uid("REQ"),requester:state.profile.name,requesterId:state.profile.id,category:document.getElementById("rq_cat").value,items:e,amount:t,notes:sanitize(document.getElementById("rq_notes").value.trim()),date:(new Date).toISOString(),status:"pending",approver:null,approvedDate:null}),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Requisition Submitted",`${e.slice(0,50)}…`),closeModal(),renderRequisitions("all"),toast("Requisition submitted","success")):toast("Session error — please log in again","error"):toast("Items and amount required","error")}let _wsFilter="all";function filterWorkshop(e,t){_wsFilter=e,document.querySelectorAll("#sec-workshop .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderWorkshop(e)}function renderWorkshop(e){let t="all"===e?state.db.workshop:state.db.workshop.filter(t=>t.status===e);const i=document.getElementById("workshopList");i&&(i.innerHTML=t.map(e=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${e.title}</div><div style="font-size:10.5px;color:var(--text-3);margin-top:2px">${e.id} · ${truckName(e.truckId)}</div></div>${sbadge(e.status)}</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:8px">${e.desc}</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9.5px;color:var(--text-3)"><span>Tech: ${e.tech}</span><span>Total: <span style="color:var(--gold);font-weight:700">${fmtKsh(e.total)}</span></span></div></div>`).join("")||'<div class="empty-state"><div class="empty-state-icon">🔩</div><div class="empty-state-label">No workshop jobs</div></div>')}function showAddWorkshopJobModal(){openModal("New Workshop Job Card",`<div class="fg"><label>Truck</label><select id="ws_truck">${state.db.trucks.map(e=>`<option value="${e.id}">${e.reg} — ${e.make}</option>`).join("")}</select></div><div class="fg"><label>Job Title</label><input id="ws_title" placeholder="Describe the job…"/></div><div class="fg"><label>Description</label><textarea id="ws_desc" rows="3" placeholder="Detailed scope of work…"></textarea></div><div class="form-row-2"><div class="fg"><label>Technician</label><input id="ws_tech" placeholder="Tech name"/></div><div class="fg"><label>Labour (KSh)</label><input id="ws_labour" type="number" placeholder="0"/></div></div><div class="form-row-2"><div class="fg"><label>Parts Description</label><input id="ws_parts" placeholder="Parts list…"/></div><div class="fg"><label>Parts Cost (KSh)</label><input id="ws_pcost" type="number" placeholder="0"/></div></div><button class="submit-btn" onclick="saveWorkshopJob()">Create Job Card →</button>`)}function saveWorkshopJob(){const e=document.getElementById("ws_title").value.trim();if(!e)return void toast("Job title required","error");const t=Math.max(0,parseInt(document.getElementById("ws_labour").value)||0),i=Math.max(0,parseInt(document.getElementById("ws_pcost").value)||0);state.db.workshop.push({id:uid("WS"),truckId:document.getElementById("ws_truck").value,title:e,desc:sanitize(document.getElementById("ws_desc").value.trim()),tech:sanitize(document.getElementById("ws_tech").value.trim()),parts:sanitize(document.getElementById("ws_parts").value.trim()),labour:t,total:t+i,status:"reported",reported:(new Date).toISOString(),diagnosed:null}),scheduleSave(),addAudit(state.profile.username,"Workshop Job Created",e),closeModal(),renderWorkshop("all"),toast("Job card created","success")}function renderInvoicing(e){isAdmin()&&(renderInvoiceKpis(),renderInvoiceList(e))}function renderInvoiceKpis(){const e=state.db.invoices,t=e.reduce((e,t)=>e+t.total,0),i=e.reduce((e,t)=>e+t.paid,0),n=t-i,a=e.filter(e=>"overdue"===e.status).reduce((e,t)=>e+(t.total-t.paid),0),o=document.getElementById("invKpis");o&&(o.innerHTML=`${kpiCard("Total Invoiced",fmtKsh(t),`${e.length} invoices`,"kpi-gold")} ${kpiCard("Collected",fmtKsh(i),`${Math.round(i/t*100)||0}% collected`,"kpi-green")} ${kpiCard("Outstanding",fmtKsh(n),"Pending payment","kpi-blue")} ${kpiCard("Overdue",fmtKsh(a),`${e.filter(e=>"overdue"===e.status).length} invoices`,"kpi-red")}`)}let _invFilter="all";function filterInvoices(e,t){_invFilter=e,document.querySelectorAll("#sec-invoicing .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderInvoiceList(e)}function renderInvoiceList(e){let t="all"===e?state.db.invoices:state.db.invoices.filter(t=>t.status===e);const i=document.getElementById("invoicesList");i&&(i.innerHTML=`<div class="inv-grid">${t.map(e=>`<div class="inv-card ${e.status}" onclick="showInvoiceDetail('${e.id}')"><div class="inv-type-tag">${e.ref}</div><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${e.client}</div><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px"><div><div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--gold)">${fmtKsh(e.total)}</div><div style="font-size:10px;color:var(--text-3);margin-top:2px">${e.paid?`Paid: ${fmtKsh(e.paid)}`:"Unpaid"}</div></div>${sbadge(e.status)}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:8px">Due: ${fmtDate(e.due)}</div></div>`).join("")||'<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-label">No invoices</div></div>'}</div>`)}function showInvoiceDetail(e){const t=state.db.invoices.find(t=>t.id===e);if(!t)return;const i=state.db.trips.filter(e=>t.trips.includes(e.id)),n=invoiceConfig();openModal(`Invoice — ${t.ref}`,`<div class="inv-doc"><div class="inv-doc-head"><div><div class="inv-doc-company-name">${n.companyName}</div><div class="inv-doc-company-details">${n.companyName} · ${n.companyLocation}<br>${n.companyTel} · KRA: ${n.kraPin}</div></div><div style="text-align:right"><div class="inv-doc-id">${t.ref}</div><div class="inv-doc-type">Tax Invoice</div><div class="inv-doc-status">${sbadge(t.status)}</div></div></div><div class="inv-billing-row"><div><div class="inv-bill-label">Bill To</div><div class="inv-bill-name">${t.client}</div></div><div><div class="inv-bill-label">Invoice Date</div><div class="inv-bill-detail">${fmtDate(t.date)}</div><div class="inv-bill-label" style="margin-top:6px">Due Date</div><div class="inv-bill-detail">${fmtDate(t.due)}</div></div></div><div class="inv-items-table-wrap"><table class="inv-items-table"><thead><tr><th>Description</th><th>Container</th><th>Work Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>${i.map(e=>`<tr><td>Haulage — ${e.ctype}</td><td class="mono">${e.container}</td><td>${e.workType}</td><td class="mono" style="text-align:right">${fmtKsh(t.subtotal/Math.max(i.length,1))}</td></tr>`).join("")||'<tr><td colspan="4" style="text-align:center;color:var(--text-3)">General haulage services</td></tr>'}</tbody></table></div><div class="inv-totals"><div class="inv-totals-row"><span>Subtotal</span><span class="inv-amount">${fmtKsh(t.subtotal)}</span></div><div class="inv-totals-row"><span>VAT ${n.vatRate}%</span><span class="inv-amount">${fmtKsh(t.vat)}</span></div>${t.paid?`<div class="inv-totals-row"><span>Amount Paid</span><span class="inv-amount" style="color:var(--green)">-${fmtKsh(t.paid)}</span></div>`:""}<div class="inv-totals-row total-row"><span style="font-weight:700">Balance Due</span><span class="inv-amount" style="font-size:16px;color:var(--gold);font-weight:700">${fmtKsh(t.total-t.paid)}</span></div></div><div class="inv-bank">Bank: ${n.bankName} · A/C: ${n.bankAccount} · Swift: ${n.bankSwift} · Ref: ${t.ref}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${"paid"!==t.status?`<button class="modal-btn success" onclick="markInvoicePaid('${e}')">Mark as Paid</button>`:""}${"draft"===t.status?`<button class="modal-btn primary" onclick="markInvoiceSent('${e}')">Mark as Sent</button>`:""}<button class="modal-btn ghost" onclick="downloadInvoicePDF('${e}')">⬇ Download PDF</button></div>`)}function markInvoicePaid(e){const t=state.db.invoices.find(t=>t.id===e);t&&(t.status="paid",t.paid=t.total,scheduleSave(),addAudit(state.profile.username,"Invoice Paid",`${t.ref} — ${fmtKsh(t.total)}`),closeModal(),renderInvoiceList(_invFilter),renderInvoiceKpis(),toast(`${t.ref} marked as paid`,"success"))}function markInvoiceSent(e){const t=state.db.invoices.find(t=>t.id===e);t&&(t.status="sent",scheduleSave(),addAudit(state.profile.username,"Invoice Sent",t.ref),closeModal(),renderInvoiceList(_invFilter),toast(`${t.ref} marked as sent`,"success"))}function downloadInvoicePDF(e){toast("PDF export — integrate with jsPDF for production","info")}function showCreateInvoiceModal(){isAdmin()?openModal("Create Invoice",`<div class="fg"><label>Client Name</label><input id="ci_client" placeholder="Company Ltd"/></div><div class="form-row-2"><div class="fg"><label>Subtotal (KSh)</label><input id="ci_sub" type="number" placeholder="0"/></div><div class="fg"><label>Due Date</label><input id="ci_due" type="date"/></div></div><div class="fg"><label>Select Trips</label><div style="max-height:150px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:8px">${state.db.trips.map(e=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px;cursor:pointer"><input type="checkbox" value="${e.id}" style="accent-color:var(--gold)">${e.container} — ${e.origin}→${e.dest}</label>`).join("")}</div></div><div class="fg"><label>Notes</label><textarea id="ci_notes" rows="2"></textarea></div><button class="submit-btn" onclick="saveInvoice()">Create Invoice →</button>`):toast("Admin rights required","error")}function saveInvoice(){const e=document.getElementById("ci_client").value.trim(),t=Math.max(0,parseInt(document.getElementById("ci_sub").value)||0);if(!e||!t)return void toast("Client and amount required","error");const i=Math.round(t*invoiceVatRate()),n=t+i,a=[...document.querySelectorAll("#modalBody input[type=checkbox]:checked")].map(e=>e.value),o={id:uid("INV"),client:e,subtotal:t,vat:i,total:n,paid:0,trips:a,status:"draft",ref:`INV-${Date.now().toString().slice(-6)}`,date:(new Date).toISOString(),due:document.getElementById("ci_due").value||new Date(Date.now()+2592e6).toISOString(),notes:sanitize(document.getElementById("ci_notes").value.trim())};state.db.invoices.push(o),scheduleSave(),addAudit(state.profile.username,"Invoice Created",`${o.ref} — ${e}`),closeModal(),renderInvoicing(_invFilter),toast(`Invoice ${o.ref} created`,"success")}function autoGenerateInvoices(){if(!isAdmin())return void toast("Admin rights required","error");const e=state.db.trips.filter(e=>"completed"===e.status&&!state.db.invoices.some(t=>t.trips.includes(e.id)));e.length?(e.forEach(e=>{const t=state.db.shippingLines.find(t=>t.id===e.shippingLine),i=state.db.billingRates[e.ctype]||{base:12e3,perKm:180},n=i.base+i.perKm*e.distance,a=Math.round(n*invoiceVatRate());state.db.invoices.push({id:uid("INV"),client:t?`${t.name} (Auto)`:"Client (Auto)",subtotal:n,vat:a,total:n+a,paid:0,trips:[e.id],status:"draft",ref:`INV-${Date.now().toString().slice(-4)}-${uid("").slice(0,3)}`,date:(new Date).toISOString(),due:new Date(Date.now()+2592e6).toISOString(),notes:"Auto-generated from completed trip"})}),scheduleSave(),addAudit(state.profile.username,"Auto Invoices",`${e.length} generated`),renderInvoicing(_invFilter),toast(`${e.length} invoice(s) generated`,"success")):toast("All completed trips already invoiced","info")}function showBillingRatesModal(){if(!isAdmin())return void toast("Admin rights required","error");const e=state.db.billingRates;openModal("Billing Rates",`<div class="table-wrap"><table class="data-table"><thead><tr><th>Container Type</th><th>Base Rate (KSh)</th><th>Per km (KSh)</th><th></th></tr></thead><tbody id="billingRatesRows">${Object.entries(e).map(([e,t])=>`<tr><td>${e}</td><td><input type="number" value="${t.base}" onchange="updateRate('${e}','base',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><input type="number" value="${t.perKm}" onchange="updateRate('${e}','perKm',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><button class="tbl-btn" style="color:var(--red)" onclick="removeBillingRateType('${e}')">🗑</button></td></tr>`).join("")}</tbody></table></div><div class="form-row-2" style="margin-top:12px"><div class="fg"><label>New Container Type</label><input id="brNewType" placeholder="e.g. 20ft"/></div><div class="fg"><label>Base Rate (KSh)</label><input id="brNewBase" type="number" placeholder="0"/></div></div><div class="fg"><label>Per km (KSh)</label><input id="brNewPerKm" type="number" placeholder="0"/></div><button class="action-btn ghost" onclick="addBillingRateType()">+ Add Container Type</button><button class="submit-btn" style="margin-top:12px" onclick="saveBillingRates()">Save Rates →</button>`)}function updateRate(e,t,i){state.db.billingRates[e][t]=Math.max(0,parseInt(i)||0)}function addBillingRateType(){const e=sanitize(document.getElementById("brNewType").value.trim()),t=Math.max(0,parseInt(document.getElementById("brNewBase").value)||0),i=Math.max(0,parseInt(document.getElementById("brNewPerKm").value)||0);e?(state.db.billingRates[e]={base:t,perKm:i},showBillingRatesModal()):toast("Container type required","error")}function removeBillingRateType(e){delete state.db.billingRates[e],showBillingRatesModal()}function saveBillingRates(){scheduleSave(),addAudit(state.profile.username,"Billing Rates","Updated"),closeModal(),toast("Billing rates updated","success")}function requireFinanceReport(e,t){isAdmin()?(renderReport("revenue"),document.querySelectorAll("#sec-reports .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active")):toast("Admin rights required","error")}let _allocTab="auto";function switchAllocTab(e,t){if(("requisitions"===e||"workshop"===e)&&!isAdmin())return void toast("Admin rights required","error");_allocTab=e,["allocTabAuto","allocTabManual","allocTabRequisitions","allocTabWorkshop"].forEach(e=>{const t=document.getElementById(e);t&&(t.style.display="none")});const i=document.getElementById({auto:"allocTabAuto",manual:"allocTabManual",requisitions:"allocTabRequisitions",workshop:"allocTabWorkshop"}[e]);i&&(i.style.display="block"),document.querySelectorAll("#sec-allocation .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),"auto"===e&&renderAllocAuto(),"manual"===e&&renderAllocManual(),"requisitions"===e&&renderAdminRequisitions(),"workshop"===e&&renderAdminWorkshop()}function renderAllocation(){renderAllocAuto()}function renderAllocAuto(){const e=state.db,t=e.trucks.filter(e=>"available"===e.status).length,i=e.drivers.filter(e=>"available"===e.status).length,n=awaitingDispatchTrips().length,a=e.trips.filter(e=>"active"===e.status).length;document.getElementById("allocKpis").innerHTML=`${kpiCard("Available Trucks",t,"","kpi-green")} ${kpiCard("Available Drivers",i,"","kpi-gold")} ${kpiCard("Awaiting Dispatch",n,"","kpi-orange")} ${kpiCard("Active Dispatches",a,"","kpi-blue")}`,renderAllocAwaitingList("allocQueue","allocQueueMeta"),document.getElementById("allocRules").innerHTML=e.allocationRules.map(e=>`<div class="alloc-rule"><div style="display:flex;justify-content:space-between;align-items:center"><div class="rule-name">${e.name}</div><div class="rule-weight">${e.weight}%</div></div><div class="rule-desc">${e.desc}</div></div>`).join(""),document.getElementById("allocRecommendations").innerHTML='<div style="padding:16px;color:var(--text-3);font-size:11.5px">Run auto-allocation to generate recommendations</div>'}function renderAllocManual(){fillSelect("ma_truck",state.db.trucks,e=>[e.id,`${e.reg} — ${e.status}`]),fillSelect("ma_driver",state.db.drivers.filter(e=>"available"===e.status),e=>[e.id,e.name]),renderStatusOverridePanel(),renderAllocAwaitingList("allocManualAwaitingList","allocManualAwaitingMeta")}function renderStatusOverridePanel(){const e=[...state.db.trucks.slice(0,5).map(e=>({label:e.reg,kind:"Truck",id:e.id,status:e.status,type:"truck"})),...state.db.drivers.slice(0,5).map(e=>({label:e.name,kind:"Driver",id:e.id,status:e.status,type:"driver"}))],t=document.getElementById("adminStatusPanel");t&&(t.innerHTML=e.map(e=>`<div class="admin-status-row"><div><div style="font-size:12px;color:var(--text)">${e.label}</div><div style="font-size:10px;color:var(--text-3)">${e.kind}</div></div>${sbadge(e.status)}<div style="display:flex;gap:4px">${("truck"===e.type?["available","on_trip","maintenance","breakdown","off_duty"]:["available","on_trip","off_duty","suspended"]).map(t=>`<button class="tbl-btn" onclick="adminOverrideStatus('${e.type}','${e.id}','${t}')">${t.replace("_"," ")}</button>`).join("")}</div></div>`).join(""))}function adminOverrideStatus(e,t,i){if(isAdmin()){if("truck"===e){const e=state.db.trucks.find(e=>e.id===t);e&&(e.status=i,addAudit(state.profile.username,"Status Override",`${e.reg} → ${i}`))}else{const e=state.db.drivers.find(e=>e.id===t);e&&(e.status=i,addAudit(state.profile.username,"Status Override",`${e.name} → ${i}`))}scheduleSave(),buildBadges(),renderStatusOverridePanel(),toast(`Status updated to ${i}`,"success")}else toast("Admin rights required","error")}function runAllocation(){const e=state.db.trucks.filter(e=>"available"===e.status&&e.fuelPct>=40),t=state.db.drivers.filter(e=>"available"===e.status);if(!e.length||!t.length)return void toast("No available trucks/drivers for allocation","warning");const i=e.slice(0,3).map((e,i)=>({truck:e,driver:t[i%t.length],score:Math.round(70+30*Math.random())}));document.getElementById("allocRecommendations").innerHTML=i.map(e=>`<div class="recommend-card"><div><div class="rc-label">Truck</div><div class="rc-val">${e.truck.reg}</div></div><div><div class="rc-label">Driver</div><div class="rc-val">${e.driver.name}</div></div><div><div class="rc-label">Match Score</div><div class="rc-val" style="color:var(--gold)">${e.score}%</div></div><button class="modal-btn primary" onclick="applyAllocation('${e.truck.id}','${e.driver.id}')">Assign</button></div>`).join(""),toast(`${i.length} recommendations generated`,"success")}function applyAllocation(e,t){const i=pairDriverTruck(e,t);if(!i)return void toast("Truck or driver not found","error");const{t:n,d:a}=i;scheduleSave(),addAudit(state.profile.username,"Auto Allocation",`${n.reg} ← ${a.name}`),toast(`${a.name} assigned to ${n.reg}`,"success"),renderAllocAuto()}function pairDriverTruck(e,t){const i=state.db.trucks.find(t=>t.id===e),n=state.db.drivers.find(e=>e.id===t);return i&&n?(state.db.drivers.forEach(t=>{t.id!==n.id&&t.truckId===e&&(t.truckId=null)}),i.driver=t,n.truckId=e,{t:i,d:n}):null}function manualAssignDriverToTruck(){const e=document.getElementById("ma_truck").value,t=document.getElementById("ma_driver").value,i=sanitize((document.getElementById("ma_notes")?.value||"").trim());if(!e||!t)return void toast("Select truck and driver","error");const n=pairDriverTruck(e,t);if(!n)return void toast("Truck or driver not found","error");const{t:a,d:o}=n;scheduleSave(),addAudit(state.profile.username,"Manual Assignment",`${a?.reg} ← ${o?.name}${i?` — ${i}`:""}`),toast(`${o?.name} assigned to ${a?.reg}. Open Dispatch Console to put them on a trip.`,"success");const r=document.getElementById("ma_notes");r&&(r.value=""),renderAllocManual()}function showAllocationRulesModal(){openModal("Configure Allocation Rules",`${state.db.allocationRules.map(e=>`<div style="padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:12px;font-weight:600;color:var(--text)">${e.name}</div><input type="number" value="${e.weight}" min="0" max="100" style="width:60px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:4px;text-align:center" onchange="updateRuleWeight('${e.id}',this.value)"/></div><div style="font-size:11px;color:var(--text-3)">${e.desc}</div></div>`).join("")}<button class="submit-btn" onclick="saveAllocRules()">Save Rules →</button>`)}function updateRuleWeight(e,t){const i=state.db.allocationRules.find(t=>t.id===e);i&&(i.weight=Math.max(0,parseInt(t)||0))}function saveAllocRules(){scheduleSave(),closeModal(),toast("Allocation rules saved","success")}function renderAdminRequisitions(){const e=state.db.requisitions.filter(e=>"pending"===e.status),t=document.getElementById("adminReqList");t&&(t.innerHTML=e.map(e=>`<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${e.category}</div><div class="req-meta">${e.requester} · ${fmtDate(e.date)}</div></div><div class="req-amount">${fmtKsh(e.amount)}</div></div><div class="req-items">${e.items}</div><div style="display:flex;gap:8px;margin-top:10px"><button class="modal-btn success" onclick="reviewReq('${e.id}','approved')">Approve</button><button class="modal-btn danger" onclick="reviewReq('${e.id}','rejected')">Reject</button></div></div>`).join("")||'<div class="empty-state"><div class="empty-state-label">No pending requisitions</div></div>')}function reviewReq(e,t){if(!isAdmin())return void toast("Admin rights required","error");const i=state.db.requisitions.find(t=>t.id===e);i&&(i.status=t,i.approver=state.profile.username,i.approvedDate=(new Date).toISOString(),scheduleSave(),buildBadges(),addAudit(state.profile.username,`Requisition ${t}`,`${i.category} — ${fmtKsh(i.amount)}`),renderAdminRequisitions(),renderRequisitions(_reqFilter),toast(`Requisition ${t}`,"approved"===t?"success":"warning"))}function renderAdminWorkshop(){const e=state.db.workshop.filter(e=>"completed"!==e.status),t=document.getElementById("adminWorkshopList");t&&(t.innerHTML=e.map(e=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${e.title}</div><div style="font-size:10.5px;color:var(--text-3)">${truckName(e.truckId)} · ${e.tech}</div></div>${sbadge(e.status)}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${["reported","diagnosed","in_progress","completed"].map(t=>`<button class="filter-btn${e.status===t?" active":""}" onclick="advanceWorkshop('${e.id}','${t}')">${t.replace("_"," ")}</button>`).join("")}</div></div>`).join("")||'<div class="empty-state"><div class="empty-state-label">No open workshop jobs</div></div>')}function advanceWorkshop(e,t){if(!isAdmin())return void toast("Admin rights required","error");const i=state.db.workshop.find(t=>t.id===e);if(i){if(i.status=t,"completed"===t){const e=state.db.trucks.find(e=>e.id===i.truckId);e&&"maintenance"===e.status&&(e.status="available")}scheduleSave(),buildBadges(),addAudit(state.profile.username,"Workshop Update",`${i.title} → ${t}`),renderAdminWorkshop(),renderWorkshop(_wsFilter),toast(`Job updated to ${t}`,"success")}}function renderWorkAnalysis(e,t){t&&(document.querySelectorAll("#sec-workanalysis .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"));let i=state.db.trips;const n=Date.now();"today"===e?i=i.filter(e=>new Date(e.startTime).toDateString()===(new Date).toDateString()):"week"===e?i=i.filter(e=>n-new Date(e.startTime)<6048e5):"month"===e&&(i=i.filter(e=>n-new Date(e.startTime)<2592e6));const a={};i.forEach(e=>{a[e.workType]=(a[e.workType]||0)+1});const o=Math.max(...Object.values(a),1),r=document.getElementById("waKpis");r&&(r.innerHTML=`${kpiCard("Total Trips",i.length,"","kpi-gold")} ${kpiCard("Work Types",Object.keys(a).length,"","kpi-blue")} ${kpiCard("Completed",i.filter(e=>"completed"===e.status).length,"","kpi-green")} ${kpiCard("Delayed",i.filter(e=>"delayed"===e.status).length,"","kpi-red")}`);const s=document.getElementById("waVolumeChart");s&&(s.innerHTML=Object.entries(a).sort((e,t)=>t[1]-e[1]).map(([e,t])=>`<div class="wt-bar-item"><div class="wt-bar-label" title="${e}">${e}</div><div class="wt-bar-track"><div class="wt-bar-fill" style="width:${Math.round(t/o*100)}%"></div></div><div class="wt-bar-count">${t}</div></div>`).join("")||'<div style="padding:12px;color:var(--text-3)">No data for this period</div>');const d=Object.entries(a).map(([e,t])=>{const n=i.filter(t=>t.workType===e),a=n.filter(e=>"completed"===e.status||"active"===e.status).length,o=n.length?Math.round(a/n.length*100):0,r={};n.forEach(e=>{r[e.truckId]=(r[e.truckId]||0)+1});const s=Object.entries(r).sort((e,t)=>t[1]-e[1])[0]?.[0];return{wt:e,cnt:t,onTimePct:o,topTruck:s&&state.db.trucks.find(e=>e.id===s)?.reg||"—"}}),l=document.getElementById("waMatrix");l&&(l.innerHTML=d.map(e=>`<tr><td>${e.wt}</td><td class="mono" style="text-align:center">${e.cnt}</td><td class="mono" style="text-align:center">~${Math.round(1+2*Math.random())}h</td><td class="mono" style="text-align:center;color:${e.onTimePct>70?"var(--green)":"var(--amber)"}">${e.onTimePct}%</td><td class="mono" style="color:var(--gold)">${e.topTruck}</td></tr>`).join("")||'<tr><td colspan="5" class="empty-td">No data</td></tr>');const c=i.filter(e=>isOutwardWorkType(e.workType)),p={};OUTWARD_TYPES.forEach(e=>{p[e]=0}),c.forEach(e=>{const t=e.outwardType||"Unclassified";p[t]=(p[t]||0)+1});const u=Math.max(...Object.values(p),1),m=document.getElementById("waOutwardChart");m&&(m.innerHTML=Object.entries(p).sort((e,t)=>t[1]-e[1]).map(([e,t])=>`<div class="wt-bar-item"><div class="wt-bar-label" title="${sanitize(e)}">${sanitize(e)}</div><div class="wt-bar-track"><div class="wt-bar-fill" style="width:${Math.round(t/u*100)}%"></div></div><div class="wt-bar-count">${t}</div></div>`).join("")||'<div style="padding:12px;color:var(--text-3)">No outward trips for this period</div>')}function renderReport(e,t){t&&(document.querySelectorAll("#sec-reports .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"));const i=state.db,n=document.getElementById("reportContent");if(n)if("overview"===e)n.innerHTML=`<div class="two-col-grid"><div class="report-block"><h3>Fleet Overview</h3>${reportRow("Total Trucks",i.trucks.length)}${reportRow("Available",i.trucks.filter(e=>"available"===e.status).length)}${reportRow("On Trip",i.trucks.filter(e=>"on_trip"===e.status).length)}${reportRow("Breakdown/Maintenance",i.trucks.filter(e=>["breakdown","maintenance"].includes(e.status)).length)}</div><div class="report-block"><h3>Operations</h3>${reportRow("Trips Today",i.trips.filter(e=>new Date(e.startTime).toDateString()===(new Date).toDateString()).length)}${reportRow("Active Trips",i.trips.filter(e=>"active"===e.status).length)}${reportRow("Completed (All)",i.trips.filter(e=>"completed"===e.status).length)}${reportRow("Total Distance (All)",fmt(i.trips.reduce((e,t)=>e+t.distance,0))+" km")}</div><div class="report-block"><h3>Fuel</h3>${reportRow("Total Fills",i.fuel.length)}${reportRow("Total Litres",fmt(i.fuel.reduce((e,t)=>e+t.litres,0))+" L")}${reportRow("Total Cost",fmtKsh(i.fuel.reduce((e,t)=>e+t.litres*t.pricePerLitre,0)))}</div><div class="report-block"><h3>Compliance</h3>${reportRow("Open Maintenance",i.maintenance.filter(e=>"open"===e.status).length)}${reportRow("Pending Requisitions",i.requisitions.filter(e=>"pending"===e.status).length)}${reportRow("Shutouts Open",i.shutouts.filter(e=>"open"===e.status).length)}</div></div>`;else if("fleet"===e)n.innerHTML=`<div class="report-block"><h3>Fleet Utilisation</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Truck</th><th>Status</th><th>Fuel</th><th>Mileage</th><th>Trips</th><th>Next Service</th></tr></thead><tbody>${i.trucks.map(e=>`<tr><td class="mono" style="color:var(--gold)">${e.reg}</td><td>${sbadge(e.status)}</td><td><div class="fuel-bar" style="width:80px"><div class="fuel-fill" style="width:${e.fuelPct}%;background:${fuelColour(e.fuelPct)}"></div></div></td><td class="mono">${fmt(e.mileage)} km</td><td class="mono">${i.trips.filter(t=>t.truckId===e.id).length}</td><td style="color:${new Date(e.nextService)<Date.now()?"var(--red)":"var(--text-2)"}" class="mono">${fmtDate(e.nextService)}</td></tr>`).join("")}</tbody></table></div></div>`;else if("drivers"===e)n.innerHTML=`<div class="report-block"><h3>Driver Performance</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Driver</th><th>Status</th><th>Trips Today</th><th>Licence Exp.</th></tr></thead><tbody>${i.drivers.map(e=>`<tr><td>${e.name}</td><td>${sbadge(e.status)}</td><td class="mono" style="text-align:center">${e.tripsToday}</td><td style="color:${new Date(e.licenceExp)-Date.now()<7776e6?"var(--amber)":"var(--text-2)"}" class="mono">${fmtDate(e.licenceExp)}</td></tr>`).join("")}</tbody></table></div></div>`;else if("maintenance"===e){const e=i.maintenance.reduce((e,t)=>e+t.cost,0);n.innerHTML=`<div class="report-block"><h3>Maintenance Summary</h3>${reportRow("Total Issues",i.maintenance.length)}${reportRow("Open",i.maintenance.filter(e=>"open"===e.status).length)}${reportRow("In Progress",i.maintenance.filter(e=>"in_progress"===e.status).length)}${reportRow("Resolved",i.maintenance.filter(e=>"resolved"===e.status).length)}${reportRow("Total Cost",fmtKsh(e))}</div><div class="report-block" style="margin-top:14px"><h3>Issues by Priority</h3>${["critical","high","medium","low"].map(e=>reportRow(e.charAt(0).toUpperCase()+e.slice(1),i.maintenance.filter(t=>t.priority===e).length)).join("")}</div>`}else if("fuel"===e)n.innerHTML=`<div class="report-block"><h3>Fuel Report</h3>${reportRow("Total Fill-ups",i.fuel.length)}${reportRow("Total Litres",fmt(i.fuel.reduce((e,t)=>e+t.litres,0))+" L")}${reportRow("Total Spend",fmtKsh(i.fuel.reduce((e,t)=>e+t.litres*t.pricePerLitre,0)))}${reportRow("Avg Price/Litre","KSh "+(i.fuel.reduce((e,t)=>e+t.pricePerLitre,0)/Math.max(i.fuel.length,1)).toFixed(2))}</div>`;else if("revenue"===e){if(!isAdmin())return void toast("Admin rights required","error");const e=i.invoices;n.innerHTML=`<div class="report-block"><h3>Revenue Report — CONFIDENTIAL</h3>${reportRow("Total Invoiced",fmtKsh(e.reduce((e,t)=>e+t.total,0)))}${reportRow("Collected",fmtKsh(e.reduce((e,t)=>e+t.paid,0)))}${reportRow("Outstanding",fmtKsh(e.reduce((e,t)=>e+(t.total-t.paid),0)))}${reportRow("Overdue",fmtKsh(e.filter(e=>"overdue"===e.status).reduce((e,t)=>e+t.total,0)))}</div>`}else"depops"===e&&(n.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>',renderReportDepOps(n))}async function renderReportDepOps(e){try{const[t,i,n,a]=await Promise.all([window.bookingDocs.listZones(),window.bookingDocs.awaitingSurveyBookings(),window.bookingDocs.surveyedAwaitingAllocation(),window.bookingDocs.escalatedBookings()]),o=await depOpsRepatriationEligibleBookings(),r=t.reduce((e,t)=>e+(t.capacity_teu||0),0),s=t.reduce((e,t)=>e+(t.occupied_teu||0),0),d=state.db.interchange||[],l=d.filter(e=>"pending"===e.status).length,c=d.filter(e=>"approved"===e.status).length,p=d.filter(e=>"reconciled"===e.status).length,u=d.filter(e=>/Auto-generated from survey/.test(e.notes||"")).length,m=d.filter(e=>e.flaggedForReview).length,v=(state.db.trips||[]).filter(e=>e.flaggedForReview).length;if(!e||!e.isConnected)return;e.innerHTML=`<div class="two-col-grid">\n      <div class="report-block">\n        <h3>Depot Storage Pipeline</h3>\n        ${reportRow("Awaiting Survey",i.length)}\n        ${reportRow("Surveyed — Awaiting Allocation",n.length)}\n        ${reportRow("Escalated (Joint Survey Needed)",a.length)}\n        ${reportRow("Currently In Storage",o.length)}\n      </div>\n      <div class="report-block">\n        <h3>Zone Occupancy</h3>\n        ${reportRow("Total Capacity",r+" TEU")}\n        ${reportRow("Occupied",s+" TEU")}\n        ${reportRow("Free",Math.max(r-s,0)+" TEU")}\n        ${reportRow("Zones Configured",t.length)}\n      </div>\n      <div class="report-block">\n        <h3>Interchange</h3>\n        ${reportRow("Pending",l)}\n        ${reportRow("Approved",c)}\n        ${reportRow("Reconciled",p)}\n        ${reportRow("Generated From Survey",u+" / "+d.length)}\n        ${reportRow("Flagged for Review (Interchange)",m)}\n        ${reportRow("Flagged for Review (Dispatch)",v)}\n      </div>\n      <div class="report-block">\n        <h3>Jump To</h3>\n        <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">\n          <button class="action-btn ghost" onclick="showSection('depops', document.querySelector('[data-section=\\'depops\\']'))">Open DepOps →</button>\n          <button class="action-btn ghost" onclick="showSection('interchange', document.querySelector('[data-section=\\'interchange\\']'))">Open Interchange →</button>\n        </div>\n      </div>\n    </div>`}catch(t){e&&e.isConnected&&(e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`)}}function reportRow(e,t){return`<div class="report-row"><span class="label">${e}</span><span class="val">${t}</span></div>`}const trc={tripRows:[],auditRows:[],period:"hourly",auditPeriod:"today"};function trcSwitchTab(e,t){document.querySelectorAll("#sec-tripreports > .sec-toolbar .filter-row .filter-btn").forEach(e=>e.classList.remove("active")),t&&t.classList.add("active");const i=document.getElementById("trcTab-trips"),n=document.getElementById("trcTab-audit");i&&(i.style.display="trips"===e?"":"none"),n&&(n.style.display="audit"===e?"":"none")}function trcInit(){isAdmin()?(trcPopulateFilterOptions(),document.getElementById("trcFrom").value||trcSetPeriod("all",document.querySelector("#trcTab-trips .trc-period-row .filter-btn")),document.getElementById("trcAuditFrom").value||trcSetAuditPeriod("today",document.querySelector("#trcTab-audit .trc-period-row .filter-btn"))):toast("Admin rights required","error")}function trcPopulateFilterOptions(){const e=document.getElementById("trcTruck");e&&e.options.length<=1&&[...state.db.trucks].sort((e,t)=>e.reg.localeCompare(t.reg)).forEach(t=>{const i=document.createElement("option");i.value=t.id,i.textContent=t.reg,e.appendChild(i)});const t=document.getElementById("trcDriver");t&&t.options.length<=1&&[...state.db.drivers].sort((e,t)=>e.name.localeCompare(t.name)).forEach(e=>{const i=document.createElement("option");i.value=e.id,i.textContent=e.name,t.appendChild(i)});const i=document.getElementById("trcStatus");i&&i.options.length<=1&&TRIP_ALL_STATUSES.forEach(e=>{const t=document.createElement("option");t.value=e,t.textContent=e.replace("_"," "),i.appendChild(t)});const n=document.getElementById("trcWorkType");n&&n.options.length<=1&&[...new Set(state.db.trips.map(e=>e.workType))].sort().forEach(e=>{const t=document.createElement("option");t.value=e,t.textContent=e,n.appendChild(t)});const a=document.getElementById("trcAuditUser");a&&a.options.length<=1&&[...state.db.profiles].sort((e,t)=>e.username.localeCompare(t.username)).forEach(e=>{const t=document.createElement("option");t.value=e.username,t.textContent=`${e.name} (${e.username})`,a.appendChild(t)})}function trcPad(e){return String(e).padStart(2,"0")}function trcLocalInputValue(e){return`${e.getFullYear()}-${trcPad(e.getMonth()+1)}-${trcPad(e.getDate())}T${trcPad(e.getHours())}:${trcPad(e.getMinutes())}`}function trcSetPeriod(e,t){if(t&&(document.querySelectorAll("#trcTab-trips .trc-period-row .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active")),trc.period=e,"custom"===e)return;const i=new Date;let n;if("all"===e)n=new Date(2e3,0,1);else if("hourly"===e)n=new Date(i.getTime()-36e5);else if("daily"===e)n=new Date(i),n.setHours(0,0,0,0);else if("weekly"===e){n=new Date(i);const e=(n.getDay()+6)%7;n.setDate(n.getDate()-e),n.setHours(0,0,0,0)}else n="monthly"===e?new Date(i.getFullYear(),i.getMonth(),1):new Date(i.getTime()-36e5);document.getElementById("trcFrom").value=trcLocalInputValue(n),document.getElementById("trcTo").value=trcLocalInputValue(i)}function trcSetAuditPeriod(e,t){if(t&&(document.querySelectorAll("#trcTab-audit .trc-period-row .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active")),trc.auditPeriod=e,"custom"===e)return;const i=new Date;let n;if("today"===e)n=new Date(i),n.setHours(0,0,0,0);else if("week"===e){n=new Date(i);const e=(n.getDay()+6)%7;n.setDate(n.getDate()-e),n.setHours(0,0,0,0)}else n="month"===e?new Date(i.getFullYear(),i.getMonth(),1):new Date(2e3,0,1);document.getElementById("trcAuditFrom").value=trcLocalInputValue(n),document.getElementById("trcAuditTo").value=trcLocalInputValue(i)}async function trcRunTripReport(){if(!isAdmin())return void toast("Admin rights required","error");const e=document.getElementById("trcFrom").value,t=document.getElementById("trcTo").value,i=document.getElementById("trcTruck").value,n=document.getElementById("trcDriver").value,a=document.getElementById("trcStatus").value,o=document.getElementById("trcWorkType").value,r=document.getElementById("trcOutwardType"),s=r?r.value:"",d=document.querySelector("#trcTab-trips .action-btn:not(.ghost)"),l=d?d.textContent:"";d&&(d.textContent="Running…",d.disabled=!0);try{let r=supabase.from("trips").select("*");e&&(r=r.gte("start_time",new Date(e).toISOString())),t&&(r=r.lte("start_time",new Date(t).toISOString())),i&&(r=r.eq("truck_id",i)),n&&(r=r.eq("driver_id",n)),a&&(r=r.eq("status",a)),o&&(r=r.eq("work_type",o)),s&&(r=r.eq("outward_type",s)),r=r.order("start_time",{ascending:!1}).limit(5e3);const{data:d,error:l}=await r;if(l)throw l;const c=(d||[]).map(tripFromRow);trc.tripRows=c,trcRenderTripSummary(c),trcRenderTripTable(c);const p=document.getElementById("trcExportTripsBtn"),u=document.getElementById("trcExportTripsJsonBtn");p&&(p.disabled=0===c.length),u&&(u.disabled=0===c.length),toast(`${c.length} trip record(s) retrieved`,"success"),addAudit(state.profile.username,"Trip Report Queried",`${c.length} trips · ${trc.period}${e?` · ${e.replace("T"," ")} → ${t?t.replace("T"," "):"now"}`:""}`)}catch(e){console.error("Trip report query failed:",e.message),toast("Query failed — check your connection","error")}finally{d&&(d.textContent=l,d.disabled=!1)}}function trcRenderTripSummary(e){const t=document.getElementById("trcTripSummary");if(!t)return;if(!e.length)return t.className="",void(t.innerHTML='<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-label">No trips match this query</div><div class="empty-state-sub">Adjust the date range or filters and run again</div></div>');const i=e.reduce((e,t)=>e+(Number(t.distance)||0),0),n=e.filter(e=>"completed"===e.status).length,a=e.filter(e=>"active"===e.status).length,o=e.filter(e=>"delayed"===e.status||"breakdown"===e.status).length;t.className="kpi-row",t.innerHTML=`${kpiCard("Total Trips",fmt(e.length),"","kpi-gold")} ${kpiCard("Completed",fmt(n),"","kpi-green")} ${kpiCard("Active",fmt(a),"","kpi-blue")} ${kpiCard("Delayed / Breakdown",fmt(o),"","kpi-red")} ${kpiCard("Total Distance",fmt(i)+" km","","kpi-orange")}`}function trcRenderTripTable(e){const t=document.getElementById("trcTripMeta");t&&(t.textContent=`${e.length} record(s)${5e3===e.length?" (capped at 5000 — narrow your range)":""}`);const i=document.getElementById("trcTripBody");i&&(i.innerHTML=e.map(e=>`<tr onclick="showTripDetail('${e.id}')">\n    <td class="mono" style="color:var(--gold)">${e.container}</td>\n    <td>${truckName(e.truckId)}</td>\n    <td>${driverName(e.driverId)}</td>\n    <td>${e.workType}</td>\n    <td>${e.outwardType||"—"}</td>\n    <td style="font-size:11px">${e.origin} → ${e.dest}</td>\n    <td>${sbadge(e.status)}</td>\n    <td>${e.priority?sbadge(e.priority.toLowerCase()):"—"}</td>\n    <td class="mono">${e.distance} km</td>\n    <td class="mono" style="font-size:10.5px">${fmtTime(e.startTime)} · ${fmtDate(e.startTime)}</td>\n    <td class="mono" style="font-size:10.5px">${fmtTime(e.eta)}</td>\n  </tr>`).join("")||"")}function trcExportTripsCSV(){if(!trc.tripRows.length)return;const e=[["ID","Container","Type","Truck","Driver","Work Type","Outward Type","Origin","Destination","Shipping Line","Status","Priority","Distance (km)","Start Time","ETA","Reference"].join(",")];trc.tripRows.forEach(t=>{e.push([t.id,t.container,t.ctype,truckName(t.truckId),driverName(t.driverId),t.workType,t.outwardType||"",t.origin,t.dest,lineName(t.shippingLine),t.status,t.priority,t.distance,t.startTime,t.eta,t.ref].map(csvEscape).join(","))}),downloadTextFile(`gargo-trip-report-${Date.now()}.csv`,e.join("\n"),"text/csv"),addAudit(state.profile.username,"Trip Report Exported",`${trc.tripRows.length} trips (CSV)`),toast("Trip report exported","success")}function trcExportTripsJSON(){trc.tripRows.length&&(downloadTextFile(`gargo-trip-report-${Date.now()}.json`,JSON.stringify(trc.tripRows,null,2),"application/json"),addAudit(state.profile.username,"Trip Report Exported",`${trc.tripRows.length} trips (JSON)`),toast("Trip report exported","success"))}async function trcRunAuditQuery(){if(!isAdmin())return void toast("Admin rights required","error");const e=document.getElementById("trcAuditFrom").value,t=document.getElementById("trcAuditTo").value,i=document.getElementById("trcAuditUser").value,n=document.getElementById("trcAuditSearch").value.trim(),a=document.querySelector("#trcTab-audit .action-btn:not(.ghost)"),o=a?a.textContent:"";a&&(a.textContent="Running…",a.disabled=!0);try{let a=supabase.from("audit_log").select("*");e&&(a=a.gte("time",new Date(e).toISOString())),t&&(a=a.lte("time",new Date(t).toISOString())),i&&(a=a.eq("username",i)),n&&(a=a.or(`action.ilike.%${n}%,detail.ilike.%${n}%`)),a=a.order("time",{ascending:!1}).limit(2e3);const{data:o,error:r}=await a;if(r)throw r;const s=(o||[]).map(e=>({id:e.id,user:e.username,action:e.action,detail:e.detail,time:e.time}));trc.auditRows=s,trcRenderAuditSummary(s),trcRenderAuditTable(s);const d=document.getElementById("trcExportAuditBtn");d&&(d.disabled=0===s.length),toast(`${s.length} audit record(s) retrieved`,"success")}catch(e){console.error("Audit query failed:",e.message),toast("Query failed — check your connection","error")}finally{a&&(a.textContent=o,a.disabled=!1)}}function trcRenderAuditSummary(e){const t=document.getElementById("trcAuditSummary");if(!t)return;if(!e.length)return t.className="",void(t.innerHTML='<div class="empty-state"><div class="empty-state-icon">🗂</div><div class="empty-state-label">No audit entries match this query</div><div class="empty-state-sub">Widen the date range or clear filters and run again</div></div>');const i=new Set(e.map(e=>e.user)).size,n=new Set(e.map(e=>e.action)).size;t.className="kpi-row",t.innerHTML=`${kpiCard("Total Entries",fmt(e.length),"","kpi-gold")} ${kpiCard("Distinct Users",fmt(i),"","kpi-blue")} ${kpiCard("Action Types",fmt(n),"","kpi-orange")}`}function trcRenderAuditTable(e){const t=document.getElementById("trcAuditMeta");t&&(t.textContent=`${e.length} record(s)${2e3===e.length?" (capped at 2000 — narrow your range)":""}`);const i=document.getElementById("trcAuditBody");i&&(i.innerHTML=e.map(e=>`<tr>\n    <td class="mono" style="font-size:10.5px;white-space:nowrap">${fmtTime(e.time)} · ${fmtDate(e.time)}</td>\n    <td>${e.user}</td>\n    <td style="font-weight:600;color:var(--text)">${e.action}</td>\n    <td style="color:var(--text-2)">${e.detail||""}</td>\n  </tr>`).join(""))}function trcExportAuditCSV(){if(!trc.auditRows.length)return;const e=[["Time","User","Action","Detail"].join(",")];trc.auditRows.forEach(t=>e.push([t.time,t.user,t.action,t.detail].map(csvEscape).join(","))),downloadTextFile(`gargo-audit-log-${Date.now()}.csv`,e.join("\n"),"text/csv"),addAudit(state.profile.username,"Audit Log Exported",`${trc.auditRows.length} entries (CSV)`),toast("Audit log exported","success")}function csvEscape(e){if(null==e)return"";const t=String(e);return/[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}function downloadTextFile(e,t,i){const n=new Blob([t],{type:`${i};charset=utf-8`}),a=URL.createObjectURL(n),o=document.createElement("a");o.href=a,o.download=e,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(a)}function initTrackingSection(){renderTracking(),initTrackingMap()}const TRACKABLE_TRUCK_STATUSES=["available","on_trip","breakdown"];function renderTracking(){const e=state.db.trackingPositions||{},t=state.db.trucks.filter(e=>TRACKABLE_TRUCK_STATUSES.includes(e.status)),i=t.filter(t=>e[t.id]).length;document.getElementById("trackingMeta").textContent=`${t.length} vehicle${1===t.length?"":"s"} tracked · ${i} reporting live`;const n=document.getElementById("trackingVehicles");n&&(n.innerHTML=t.map(t=>{const i=e[t.id],n=state.db.drivers.find(e=>e.truckId===t.id),a=!!i,o=a?`<span style="color:var(--green,#3ecf6e)">● Live — ${"wialon"===i?.source?"Wialon GPS":"Driver Phone"} · ${timeAgo(i.lastUpdate)}</span>`:`<span style="color:var(--text-3)">${t.wialonUnitId?"No Wialon signal — unit may be offline":"No phone signal — driver may be off duty or offline"}</span>`;return`<div class="tv-item" ${a?`onclick="focusTruckOnMap('${t.id}')"`:""}>\n        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><span class="tv-reg">${esc(t.reg)}</span>${sbadge(t.status)}</div>\n        <div style="margin-top:2px">${n?esc(n.name):"Unassigned"}</div>\n        <div style="font-size:9px;margin-top:2px">${o}</div>\n        ${a?`<div style="font-size:9px;color:var(--text-3);margin-top:2px">${esc(i.zone||"")} · ${i.speed>0?i.speed+" km/h":"Stationary"}</div>`:""}\n        <button class="tbl-btn" style="margin-top:6px;width:100%" ${a?"":"disabled"} onclick="event.stopPropagation();${a?`showStreetView(${i.lat},${i.lng},'${esc(t.reg)}')`:""}">🧭 Street View</button>\n      </div>`}).join("")||'<div style="padding:10px;color:var(--text-3);font-size:11px">No vehicles to track</div>');const a=document.getElementById("trackingMovements");if(a){const t=Object.keys(e);a.innerHTML=t.map(t=>{const i=e[t],n=state.db.trucks.find(e=>e.id===t);return`<div class="movement-row" onclick="focusTruckOnMap('${t}')"><div class="mono" style="font-size:10px;color:var(--gold)">${n?esc(n.reg):t}</div><div style="font-size:11px;color:var(--text-2)">${esc(i.zone||"")} · ${i.speed>0?i.speed+" km/h":"Stationary"}</div><div style="font-size:9.5px;color:var(--text-3)">${timeAgo(i.lastUpdate)}</div></div>`}).join("")||'<div style="padding:12px;color:var(--text-3)">No active movements</div>'}const o=document.getElementById("trackingGeofence");o&&(o.innerHTML=geofenceEvents().slice(0,8).map(e=>`<div class="geofence-row-wrap">\n      <div class="activity-row" style="cursor:pointer" onclick="toggleGeofenceEvent('${e.id}')">\n        <span class="act-icon">${e.icon}</span><span style="flex:1">${esc(e.text)}</span>\n        <span class="act-time">${timeAgo(e.time)}</span>\n        <span style="margin-left:6px;opacity:0.6;font-size:10px">${state.geofenceExpanded.has(e.id)?"▲":"▼"}</span>\n      </div>\n      ${state.geofenceExpanded.has(e.id)?renderGeofenceEventDetail(e):""}\n    </div>`).join("")||'<div style="padding:12px;color:var(--text-3);font-size:10.5px">No gate events recorded</div>')}function geofenceEvents(){const e=[];return(state.db.trips||[]).forEach(t=>{e.push({id:t.id+"-out",tripId:t.id,text:`Gate-out — ${t.container} departed ${t.origin}`,time:t.startTime,icon:"📤"}),"completed"===t.status&&e.push({id:t.id+"-in",tripId:t.id,text:`Gate-in — ${t.container} arrived ${t.dest}`,time:t.startTime,icon:"📥"}),"delayed"===t.status&&e.push({id:t.id+"-hold",tripId:t.id,text:`Holding near ${t.dest} — ${t.container} (Delayed)`,time:t.startTime,icon:"⏱️"}),"breakdown"===t.status&&e.push({id:t.id+"-stop",tripId:t.id,text:`Stopped en route — ${t.container} (Breakdown)`,time:t.startTime,icon:"⚠️"})}),e.sort((e,t)=>new Date(t.time)-new Date(e.time)),e}function toggleGeofenceEvent(e){state.geofenceExpanded.has(e)?state.geofenceExpanded.delete(e):state.geofenceExpanded.add(e),renderTracking()}function renderGeofenceEventDetail(e){const t=state.db.trips.find(t=>t.id===e.tripId);return t?`<div style="padding:10px 12px 12px;margin:2px 0 6px;background:var(--surface-2);border-radius:8px">\n    <div class="detail-row"><span>Route</span><b>${esc(t.origin)} → ${esc(t.dest)}</b></div>\n    <div class="detail-row"><span>Truck / Driver</span><b>${esc(truckName(t.truckId))} · ${esc(driverName(t.driverId))}</b></div>\n    <div class="detail-row"><span>Distance</span><b>${t.distance||0} km</b></div>\n    <div class="detail-row"><span>Status</span><b>${sbadge(t.status)}</b></div>\n    <div style="margin-top:10px"><button class="tbl-btn" onclick="event.stopPropagation();closeModal();showTripDetail('${t.id}')">View Trip →</button></div>\n  </div>`:""}function showStreetView(e,t,i){const n=`https://www.google.com/maps?layer=c&cbll=${e},${t}&output=svembed`,a=`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e},${t}`;openModal("Street View"+(i?" — "+esc(i):""),`\n    <div style="position:relative;width:100%;padding-top:64%;border-radius:8px;overflow:hidden;background:var(--surface)">\n      <iframe src="${n}" style="position:absolute;inset:0;width:100%;height:100%;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>\n    </div>\n    <a class="modal-btn ghost" style="margin-top:12px;width:100%;text-decoration:none;box-sizing:border-box;display:block;text-align:center" href="${a}" target="_blank" rel="noopener">↗ Open Full Street View in Google Maps</a>\n  `)}function focusTruckOnMap(e){const t=state.db.trackingPositions?.[e];if(!t||!state.trackingMap)return;state.trackingMap.setView([t.lat,t.lng],Math.max(state.trackingMap.getZoom(),13),{animate:!0});const i=state.truckMarkers[e];i&&i.openPopup()}function fitTrackingBounds(){if(!state.trackingMap)return;const e=Object.values(state.truckMarkers);if(!e.length)return void toast("No vehicles currently tracked","info",1800);const t=L.featureGroup(e);state.trackingMap.fitBounds(t.getBounds(),{padding:[40,40],maxZoom:14})}async function refreshTracking(){const{data:e,error:t}=await supabase.from("tracking_positions").select("*");if(t)return void toast("Could not refresh tracking data","error");const i={};(e||[]).forEach(e=>{i[e.truck_id]={lat:e.lat,lng:e.lng,speed:e.speed,heading:e.heading,zone:e.zone,lastUpdate:e.last_update,source:e.source||"driver_app"}}),state.db.trackingPositions=i,renderTracking(),updateTrackingMarkers(),toast("Tracking positions refreshed","info",1800)}function subscribeTrackingRealtime(){state._trackingChannel||(state._trackingChannel=supabase.channel("tracking-positions-live").on("postgres_changes",{event:"*",schema:"public",table:"tracking_positions"},e=>{if("DELETE"===e.eventType){const t=e.old?.truck_id;t&&delete state.db.trackingPositions[t]}else{const t=e.new;state.db.trackingPositions[t.truck_id]={lat:t.lat,lng:t.lng,speed:t.speed,heading:t.heading,zone:t.zone,lastUpdate:t.last_update,source:t.source||"driver_app"}}"livetracking"===state.currentSection&&(renderTracking(),updateTrackingMarkers())}).subscribe())}let _liveSyncDebounce=null,_bulkWriteInProgress=!1;function subscribeLiveSync(){if(state._liveSyncChannel)return;let e=supabase.channel("gargo-live-sync");["trucks","drivers","trips","maintenance","fuel_logs","shutouts","interchange","requisitions","workshop_jobs","invoices","shipping_lines","allocation_rules"].forEach(t=>{e=e.on("postgres_changes",{event:"*",schema:"public",table:t},()=>{_bulkWriteInProgress||(clearTimeout(_liveSyncDebounce),_liveSyncDebounce=setTimeout(refreshFromServer,2e3))})}),state._liveSyncChannel=e.subscribe()}const AUTO_REFRESH_STORAGE_KEY="gargo_auto_refresh",AUTO_REFRESH_DEFAULT_SECS=60;let _autoRefreshTimer=null;function autoRefreshConfig(){try{const e=localStorage.getItem("gargo_auto_refresh");if(!e)return{enabled:!1,intervalSecs:60};const t=JSON.parse(e);return{enabled:!!t.enabled,intervalSecs:Number(t.intervalSecs)>0?Number(t.intervalSecs):60}}catch{return{enabled:!1,intervalSecs:60}}}function saveAutoRefreshConfig(e){try{localStorage.setItem("gargo_auto_refresh",JSON.stringify(e))}catch{}}function startAutoRefresh(e){stopAutoRefresh();const t=Number(e)>0?Number(e):60;_autoRefreshTimer=setInterval(()=>{refreshFromServer()},1e3*t)}function stopAutoRefresh(){_autoRefreshTimer&&(clearInterval(_autoRefreshTimer),_autoRefreshTimer=null)}function initAutoRefresh(){const e=autoRefreshConfig();e.enabled&&startAutoRefresh(e.intervalSecs)}function saveAutoRefreshSettings(){const e=!!document.getElementById("st_autoRefreshEnabled")?.checked,t=Number(document.getElementById("st_autoRefreshInterval")?.value)||60;saveAutoRefreshConfig({enabled:e,intervalSecs:t}),e?(startAutoRefresh(t),toast(`Auto-refresh enabled — refreshing every ${t}s`,"success",2200)):(stopAutoRefresh(),toast("Auto-refresh disabled","info",1800)),renderAutoRefreshSettingsForm()}function renderAutoRefreshSettingsForm(){const e=document.getElementById("autoRefreshConfigForm");if(!e)return;const t=autoRefreshConfig(),i=[15,30,60,120,300].map(e=>`<option value="${e}" ${t.intervalSecs===e?"selected":""}>${e<60?e+"s":e/60+" min"}</option>`).join("");e.innerHTML=`\n    <label style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-2);cursor:pointer">\n      <input type="checkbox" id="st_autoRefreshEnabled" ${t.enabled?"checked":""} style="accent-color:var(--gold)"/> Enable auto-refresh mode\n    </label>\n    <div class="fg" style="margin:0"><label>Refresh Interval</label>\n      <select id="st_autoRefreshInterval">${i}</select>\n    </div>\n    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">\n      Re-fetches all app data from the server on this schedule, on top of the instant realtime sync — a safety net for unreliable connections or unattended screens. This device only.\n    </div>\n    <button class="submit-btn" style="margin-top:4px" onclick="saveAutoRefreshSettings()">Save →</button>\n  `}let _refreshInFlight=!1,_refreshQueuedAgain=!1;async function refreshFromServer(){const e=document.getElementById("modalOverlay")?.classList.contains("active");if(e)_liveSyncDebounce=setTimeout(refreshFromServer,1500);else if(_refreshInFlight)_refreshQueuedAgain=!0;else{_refreshInFlight=!0;try{const e=await loadDB();e&&(state.db=e,buildBadges(),buildAlerts(),renderSection(state.currentSection),startWialonPolling())}catch(e){console.warn("Live sync refresh failed:",e)}finally{_refreshInFlight=!1,_refreshQueuedAgain&&(_refreshQueuedAgain=!1,clearTimeout(_liveSyncDebounce),_liveSyncDebounce=setTimeout(refreshFromServer,700))}}}function loadGoogleMapsScript(e){if(window.L)return void e(null);let t=0;const i=setInterval(()=>{t++,window.L?(clearInterval(i),e(null)):t>20&&(clearInterval(i),e(new Error("load-failed")))},150)}function initTrackingMap(){const e=document.getElementById("trackingMapCanvas");e&&(state.trackingMap?updateTrackingMarkers():loadGoogleMapsScript(t=>{t?e.innerHTML='<div class="tracking-map-placeholder"><div style="font-family:var(--font-brand);font-size:20px;color:var(--gold);margin-bottom:8px">GARGO</div><div style="font-size:12px;color:var(--text-2);max-width:380px;line-height:1.6">Map failed to load — check your internet connection. Vehicle data will still populate the lists on the right.</div></div>':(e.innerHTML="",state.trackingMap=L.map(e,{center:[-4.0435,39.6682],zoom:12}),L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:19,subdomains:"abcd"}).addTo(state.trackingMap),state.truckMarkers={},updateTrackingMarkers(),fitTrackingBounds())}))}function updateTrackingMarkers(){if(!state.trackingMap||!window.L)return;const e=state.db.trackingPositions||{},t=new Set;Object.entries(e).forEach(([e,i])=>{t.add(e);const n=state.db.trucks.find(t=>t.id===e),a=n?.reg||e,o=i.speed>0?"#3ecf6e":"#8b8b8b",r=L.divIcon({className:"truck-marker",html:`<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:14px;height:14px;border-radius:50%;background:${o};border:2px solid #0b0b0b;box-shadow:0 0 0 1px rgba(255,255,255,.15)"></div><div style="font-size:9px;font-weight:700;color:#fff;background:rgba(11,11,11,.75);padding:1px 5px;border-radius:3px;white-space:nowrap">${a}</div></div>`,iconSize:[60,30],iconAnchor:[7,7]});let s=state.truckMarkers[e];s?(s.setLatLng([i.lat,i.lng]),s.setIcon(r)):(s=L.marker([i.lat,i.lng],{icon:r}).addTo(state.trackingMap),s.bindPopup(""),s.on("click",()=>{const t=state.db.trackingPositions[e];t&&s.setPopupContent(`<div style="font-family:sans-serif;font-size:12px;color:#111"><b>${a}</b><br>${t.zone}<br>${t.speed} km/h · ${t.heading}<br><span style="color:#888;font-size:10px">${"wialon"===t.source?"Wialon GPS":"Driver Phone"} · ${timeAgo(t.lastUpdate)}</span><br><button class="tbl-btn" style="margin-top:6px" onclick="showStreetView(${t.lat},${t.lng},'${esc(a)}')">🧭 Street View</button></div>`)}),state.truckMarkers[e]=s)}),Object.keys(state.truckMarkers).forEach(e=>{t.has(e)||(state.trackingMap.removeLayer(state.truckMarkers[e]),delete state.truckMarkers[e])})}function renderUserMgmt(){if(!isAdmin()){const e=document.getElementById("userKpis");e&&(e.innerHTML='<div class="vault-locked-banner" style="grid-column:1/-1"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><div><div class="title">Admin Access Required</div><div class="desc">User management is restricted to System Administrators.</div></div></div>');const t=document.getElementById("userList");return void(t&&(t.innerHTML='<div class="empty-state"><div class="empty-state-icon">🔒</div>Admin access required.</div>'))}const e=state.db.profiles,t=document.getElementById("userKpis");t&&(t.innerHTML=`${kpiCard("Total Users",e.length,"","kpi-gold")} ${kpiCard("Active",e.filter(e=>e.active).length,"","kpi-green")} ${kpiCard("Admins",e.filter(e=>"admin"===e.role).length,"","kpi-blue")}`);const i=document.getElementById("userList");i&&(i.innerHTML=e.map(e=>`<div class="user-row" onclick="showUserDetail('${e.id}')"><div class="user-av-lg">${initials(e.name)}</div><div class="user-row-info"><div class="user-row-name">${e.name}${e.active?"":'<span style="font-size:9px;color:var(--text-3)">(inactive)</span>'}</div><div class="user-row-meta">${e.username} · ${e.email}</div></div><span class="sbadge s-${"admin"===e.role?"pending":"finance"===e.role?"completed":"active"}" style="font-size:9px">${roleLabel(e.role)}</span><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3)">Last: ${timeAgo(e.lastLogin)}</div></div>`).join(""));const n=[{name:"System Administrator",perms:"Full access — all modules including Settings, Finance & Invoicing"},{name:"Operations Officer",perms:"Dashboard, Fleet, Dispatch, Maintenance, Fuel, Shutout, Interchange"},{name:"Finance Manager",perms:"Revenue Reports (admin only), Billing Rates (admin only)"},{name:"Dispatch Controller",perms:"Dispatch Console, Active Trips, Driver/Truck visibility"},{name:"Read-Only Viewer",perms:"Dashboard and reports only — no edit access"}],a=document.getElementById("roleList");a&&(a.innerHTML=n.map(e=>`<div class="role-card"><div class="role-name">${e.name}</div><div class="role-perms">${e.perms}</div></div>`).join(""));const o=document.getElementById("auditLog");o&&(o.innerHTML=[...state.db.auditLog].sort((e,t)=>new Date(t.time)-new Date(e.time)).slice(0,20).map(e=>`<div class="audit-row"><div class="audit-time">${fmtTime(e.time)} · ${fmtDate(e.time)}</div><div class="user-av-rail" style="width:22px;height:22px;font-size:8px">${initials(e.user)}</div><div style="flex:1;font-size:11.5px"><span style="font-weight:600;color:var(--text)">${e.action}</span><span style="color:var(--text-3);margin-left:6px">${e.detail}</span></div></div>`).join(""))}function showUserDetail(e){const t=state.db.profiles.find(t=>t.id===e);t&&openModal(`User — ${t.name}`,`<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div class="user-av-lg" style="width:48px;height:48px;font-size:16px">${initials(t.name)}</div><div><div style="font-size:15px;font-weight:700;color:var(--text)">${t.name}</div><div class="mono" style="font-size:9px;color:var(--text-3)">${t.id}</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Username</label><div class="mono">${t.username}</div></div><div class="fg" style="margin:0"><label>Role</label><div>${roleLabel(t.role)}</div></div><div class="fg" style="margin:0"><label>Email</label><div style="font-size:12px">${t.email}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(t.active?"active":"off_duty")}</div></div><div class="fg" style="margin:0"><label>Created</label><div class="mono" style="font-size:10px">${fmtDate(t.created)}</div></div><div class="fg" style="margin:0"><label>Last Login</label><div class="mono" style="font-size:10px">${timeAgo(t.lastLogin)}</div></div></div>${isAdmin()?`<div style="display:flex;gap:8px;flex-wrap:wrap">\n      <button class="modal-btn" onclick="showEditAccessModal('${t.id}')">Edit Access</button>\n      <button class="modal-btn" onclick="showSetPasswordModal('${t.id}')">Set New Password</button>\n      ${t.id!==state.profile?.id?`<button class="modal-btn ${t.active?"danger":"success"}" onclick="toggleUserActive('${t.id}')">${t.active?"Deactivate":"Activate"} User</button>`:""}\n    </div>`:t.id===state.profile?.id?'<div style="font-size:11px;color:var(--text-3)">This is your account</div>':""}`)}async function toggleUserActive(e){const t=state.db.profiles.find(t=>t.id===e);if(!t)return;t.active=!t.active;const{error:i}=await supabase.from("profiles").update({active:t.active}).eq("id",e);i&&(console.error("profiles update failed:",i.message),toast("Could not update user","warning")),addAudit(state.profile.username,"User Status",`${t.name} → ${t.active?"active":"deactivated"}`),closeModal(),renderUserMgmt(),toast(`${t.name} ${t.active?"activated":"deactivated"}`,"success")}const ALL_SIDEBAR_SECTIONS=["dashboard","trucks","drivers","trips","dispatch","inward","publicbookings","depops","maintenance","fuel","shutout","interchange","depotreport","shippinglines","requisitions","workshop"],ALL_ADMINRAIL_SECTIONS=["invoicing","allocation","workanalysis","reports","tripreports","livetracking","usermgmt","settings"];function groupedSectionCheckboxes(e,t,i){const n={};return t.forEach(e=>{const[t,i]=SECTION_META[e]||["Other",e];(n[t]=n[t]||[]).push([e,i])}),Object.entries(n).map(([t,n])=>`\n    <div style="margin-bottom:8px">\n      <div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:5px">${t}</div>\n      <div style="display:flex;flex-wrap:wrap;gap:6px">\n        ${n.map(([t,n])=>`<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text);background:var(--surface);border:1px solid var(--border);padding:5px 9px;border-radius:5px;cursor:pointer">\n          <input type="checkbox" id="${e}_${t}" data-sec="${t}" ${i.includes(t)?"checked":""}/> ${n}\n        </label>`).join("")}\n      </div>\n    </div>`).join("")}function sectionAccessFieldsHTML(e,t){const i=ROLE_ADMINRAIL[t]||[];return`\n    <div class="fg">\n      <label>Nav Bar Access — sections this user can see</label>\n      ${groupedSectionCheckboxes(e+"_nav",ALL_SIDEBAR_SECTIONS,ROLE_SIDEBAR[t]||[])}\n    </div>\n    <div class="fg">\n      <label>Admin Rail Access — sections this user can see</label>\n      ${groupedSectionCheckboxes(e+"_admin",ALL_ADMINRAIL_SECTIONS,i)}\n    </div>`}function refreshAccessCheckboxesForRole(e,t){const i=ROLE_SIDEBAR[t]||[],n=ROLE_ADMINRAIL[t]||[];ALL_SIDEBAR_SECTIONS.forEach(t=>{const n=document.getElementById(`${e}_nav_${t}`);n&&(n.checked=i.includes(t))}),ALL_ADMINRAIL_SECTIONS.forEach(t=>{const i=document.getElementById(`${e}_admin_${t}`);i&&(i.checked=n.includes(t))})}function readAccessCheckboxes(e){return{navSections:ALL_SIDEBAR_SECTIONS.filter(t=>document.getElementById(`${e}_nav_${t}`)?.checked),adminSections:ALL_ADMINRAIL_SECTIONS.filter(t=>document.getElementById(`${e}_admin_${t}`)?.checked)}}function genPassword(){const e="ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";let t="";const i=new Uint32Array(12);return crypto.getRandomValues(i),i.forEach(i=>t+=e[i%60]),t}function fillGeneratedPassword(e){const t=genPassword(),i=document.getElementById(e);i&&(i.value=t,i.type="text")}function showCreateUserModal(){isAdmin()?openModal("Create User",`<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="cu_name" placeholder="Jane Doe"/></div><div class="fg"><label>Username</label><input id="cu_user" placeholder="jane.doe"/></div></div><div class="fg"><label>Email</label><input id="cu_email" type="email" placeholder="jane@gargo.co.ke"/></div><div class="form-row-2"><div class="fg"><label>Role</label><select id="cu_role" onchange="refreshAccessCheckboxesForRole('cu', this.value)"><option value="ops">Operations Officer</option><option value="dispatch">Dispatch Controller</option><option value="clerk">Clerk</option><option value="finance">Finance Manager</option><option value="viewer">Read-Only Viewer</option><option value="driver">Driver</option><option value="admin">System Administrator</option></select></div><div class="fg"><label>Password</label><div style="display:flex;gap:6px"><input id="cu_password" type="text" placeholder="Set a password" style="flex:1"/><button type="button" class="modal-btn" onclick="fillGeneratedPassword('cu_password')">Generate</button></div></div></div><div style="font-size:11px;color:var(--text-3);padding:10px;background:var(--surface);border-radius:5px;margin-bottom:12px">This creates the login directly with the password above — no invitation email, the user can sign in immediately. Role sets the defaults below; untick/tick boxes to fine-tune exactly what this user can access.</div>${sectionAccessFieldsHTML("cu","ops")}<button class="submit-btn" onclick="saveUser()" style="margin-top:10px">Create User →</button>`):toast("Admin rights required","error")}async function saveUser(){const e=document.getElementById("cu_name").value.trim(),t=document.getElementById("cu_user").value.trim().toLowerCase(),i=document.getElementById("cu_email").value.trim(),n=document.getElementById("cu_password").value,a=document.getElementById("cu_role").value;if(!(e&&t&&i&&n))return void toast("Name, username, email and password required","error");if(!validateEmail(i))return void toast("Invalid email format","error");if(n.length<8)return void toast("Password must be at least 8 characters","error");if(state.db.profiles.some(e=>e.username===t))return void toast("Username taken","error");const{navSections:o,adminSections:r}=readAccessCheckboxes("cu"),s=document.querySelector(".submit-btn");s&&(s.disabled=!0,s.textContent="Creating…");try{const{data:{session:s}}=await supabase.auth.getSession(),d=await fetch("/api/create-user",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s?.access_token||""}`},body:JSON.stringify({name:e,username:t,email:i,password:n,role:a,navSections:o,adminSections:r})}),l=await d.json();if(!d.ok)return void toast(l.error||"Could not create user","error");const c=l.profile;state.db.profiles.push({id:c.id,name:c.name,username:c.username,email:c.email,role:c.role,active:c.active,created:c.created_at,lastLogin:null,navSections:c.nav_sections||null,adminSections:c.admin_sections||null}),addAudit(state.profile.username,"User Created",`${e} (${t})`),closeModal(),renderUserMgmt(),toast(`${e} created — they can sign in with the password you set.`,"success")}catch(e){console.error(e),toast("Network error creating user","error")}finally{s&&(s.disabled=!1,s.textContent="Create User →")}}function showEditAccessModal(e){if(!isAdmin())return void toast("Admin rights required","error");const t=state.db.profiles.find(t=>t.id===e);if(!t)return;const i=Array.isArray(t.navSections)?t.navSections:ROLE_SIDEBAR[t.role]||[],n=Array.isArray(t.adminSections)?t.adminSections:ROLE_ADMINRAIL[t.role]||[];openModal(`Edit Access — ${t.name}`,`\n    <div class="fg"><label>Role</label><select id="ea_role" onchange="refreshAccessCheckboxesForRole('ea', this.value)">\n      ${["ops","dispatch","clerk","finance","viewer","driver","admin"].map(e=>`<option value="${e}" ${t.role===e?"selected":""}>${roleLabel(e)}</option>`).join("")}\n    </select></div>\n    <div style="font-size:11px;color:var(--text-3);padding:10px;background:var(--surface);border-radius:5px;margin-bottom:12px">Tick exactly which nav bar and admin sections ${t.name} can access. Changing role does not reset your ticks unless you use the checkboxes yourself.</div>\n    <div class="fg"><label>Nav Bar Access</label>${groupedSectionCheckboxes("ea_nav",ALL_SIDEBAR_SECTIONS,i)}</div><div class="fg"><label>Admin Rail Access</label>${groupedSectionCheckboxes("ea_admin",ALL_ADMINRAIL_SECTIONS,n)}</div>\n    <div style="display:flex;gap:8px;margin-top:10px">\n      <button class="submit-btn" onclick="saveUserAccess('${e}')">Save Access</button>\n      <button class="modal-btn" onclick="showSetPasswordModal('${e}')">Set New Password</button>\n    </div>`)}async function saveUserAccess(e){const t=document.getElementById("ea_role").value,{navSections:i,adminSections:n}=readAccessCheckboxes("ea");try{const{data:{session:a}}=await supabase.auth.getSession(),o=await fetch("/api/update-access",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${a?.access_token||""}`},body:JSON.stringify({userId:e,role:t,navSections:i,adminSections:n})}),r=await o.json();if(!o.ok)return void toast(r.error||"Could not update access","error");const s=state.db.profiles.find(t=>t.id===e);s&&(s.role=r.profile.role,s.navSections=r.profile.nav_sections||null,s.adminSections=r.profile.admin_sections||null),addAudit(state.profile.username,"User Access Updated",`${s?.name||e}`),closeModal(),renderUserMgmt(),toast("Access updated","success")}catch(e){console.error(e),toast("Network error updating access","error")}}function showSetPasswordModal(e){if(!isAdmin())return void toast("Admin rights required","error");const t=state.db.profiles.find(t=>t.id===e);t&&openModal(`Set New Password — ${t.name}`,`\n    <div class="fg"><label>New Password</label><div style="display:flex;gap:6px"><input id="sp_password" type="text" placeholder="New password" style="flex:1"/><button type="button" class="modal-btn" onclick="fillGeneratedPassword('sp_password')">Generate</button></div></div>\n    <div style="font-size:11px;color:var(--text-3);padding:10px;background:var(--surface);border-radius:5px;margin-bottom:12px">This immediately overwrites their password — share it with them directly.</div>\n    <button class="submit-btn" onclick="submitSetPassword('${e}')">Set Password →</button>`)}async function submitSetPassword(e){const t=document.getElementById("sp_password").value;if(t.length<8)toast("Password must be at least 8 characters","error");else try{const{data:{session:i}}=await supabase.auth.getSession(),n=await fetch("/api/set-password",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i?.access_token||""}`},body:JSON.stringify({userId:e,password:t})}),a=await n.json();if(!n.ok)return void toast(a.error||"Could not set password","error");addAudit(state.profile.username,"Password Reset",`${e}`),closeModal(),toast("Password updated","success")}catch(e){console.error(e),toast("Network error setting password","error")}}function renderSettings(){if(!isAdmin())return void(document.querySelector("#sec-settings .settings-grid").innerHTML='<div class="vault-locked-banner" style="grid-column:1/-1"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83"/></svg><div><div class="title">Admin Access Required</div><div class="desc">System settings are restricted to System Administrators.</div></div></div>');const e=Object.values(state.db).reduce((e,t)=>e+(Array.isArray(t)?t.length:0),0);document.getElementById("totalRecords").textContent=e;const t=state.db.settings?.backupDate;document.getElementById("lastBackup").textContent=t?fmtDate(t):"Never";const i=document.getElementById("gpsStatusVal");if(i){const e=wialonConfig(),t=wialonTrackedTrucks().length;e.enabled&&e.token&&t?(i.textContent=`Live · Driver GPS + Wialon (${t} unit${1===t?"":"s"})`,i.style.color="var(--green)"):e.enabled&&e.token?(i.textContent="Live · Driver GPS (Wialon enabled, no units linked)",i.style.color="var(--amber, #d99a2b)"):(i.textContent="Live · Driver GPS",i.style.color="var(--green)")}renderInvoiceConfigForm(),renderWialonSettingsForm(),renderAutoRefreshSettingsForm()}function renderWialonSettingsForm(){const e=document.getElementById("wialonConfigForm");if(!e)return;const t=state.db.settings||{},i=wialonTrackedTrucks();e.innerHTML=`\n    <label style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-2);cursor:pointer">\n      <input type="checkbox" id="st_wialonEnabled" ${t.wialonEnabled?"checked":""} style="accent-color:var(--gold)"/> Enable Wialon GPS integration\n    </label>\n    <div class="fg" style="margin:0"><label>Wialon Host</label><input id="st_wialonHost" value="${esc(t.wialonHost||"https://hst-api.wialon.com")}" placeholder="https://hst-api.wialon.com"/></div>\n    <div class="fg" style="margin:0"><label>API Token</label><input id="st_wialonToken" type="password" value="${esc(t.wialonToken||"")}" placeholder="Wialon Remote API token"/></div>\n    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">\n      ${i.length?`${i.length} truck${1===i.length?"":"s"} linked to a Wialon unit ID — set per-truck under Fleet → truck detail.`:"No trucks are linked to a Wialon unit yet — open a truck's detail card under Fleet and set its Wialon Unit ID."}\n      Positions refresh every ${WIALON_POLL_INTERVAL_MS/1e3}s and appear on the live tracking map tagged "Wialon GPS".\n    </div>\n    <div style="display:flex;gap:8px;margin-top:4px">\n      <button class="action-btn ghost" style="flex:1" onclick="testWialonConnection()">Test Connection</button>\n      <button class="submit-btn" style="flex:1;margin-top:0" onclick="saveWialonSettings()">Save →</button>\n    </div>\n  `}function invoiceConfig(){const e=state.db.settings?.invoiceConfig||{};return{companyName:e.companyName||state.db.settings?.companyName||"Gargo Logistics Ltd",companyLocation:e.companyLocation||"Mombasa, Kenya",companyTel:e.companyTel||"+254 116 307 751",kraPin:e.kraPin||"P051234567X",bankName:e.bankName||"Equity Bank",bankAccount:e.bankAccount||"1234567890",bankSwift:e.bankSwift||"EQBLKENX",vatRate:"number"==typeof e.vatRate?e.vatRate:16}}function invoiceVatRate(){return invoiceConfig().vatRate/100}function renderInvoiceConfigForm(){const e=document.getElementById("invoiceConfigForm");if(!e)return;const t=invoiceConfig();e.innerHTML=`\n    <div class="fg" style="margin:0"><label>Company Name</label><input id="ic_companyName" value="${t.companyName}"/></div>\n    <div class="fg" style="margin:0"><label>Location</label><input id="ic_companyLocation" value="${t.companyLocation}"/></div>\n    <div class="fg" style="margin:0"><label>Phone</label><input id="ic_companyTel" value="${t.companyTel}"/></div>\n    <div class="fg" style="margin:0"><label>KRA PIN</label><input id="ic_kraPin" value="${t.kraPin}"/></div>\n    <div class="fg" style="margin:0"><label>Bank Name</label><input id="ic_bankName" value="${t.bankName}"/></div>\n    <div class="fg" style="margin:0"><label>Bank Account</label><input id="ic_bankAccount" value="${t.bankAccount}"/></div>\n    <div class="fg" style="margin:0"><label>Bank Swift</label><input id="ic_bankSwift" value="${t.bankSwift}"/></div>\n    <div class="fg" style="margin:0"><label>VAT Rate (%)</label><input id="ic_vatRate" type="number" step="0.1" value="${t.vatRate}"/></div>\n  `}function saveInvoiceConfig(){const e={companyName:sanitize(document.getElementById("ic_companyName").value.trim())||"Gargo Logistics Ltd",companyLocation:sanitize(document.getElementById("ic_companyLocation").value.trim()),companyTel:sanitize(document.getElementById("ic_companyTel").value.trim()),kraPin:sanitize(document.getElementById("ic_kraPin").value.trim()),bankName:sanitize(document.getElementById("ic_bankName").value.trim()),bankAccount:sanitize(document.getElementById("ic_bankAccount").value.trim()),bankSwift:sanitize(document.getElementById("ic_bankSwift").value.trim()),vatRate:Math.max(0,parseFloat(document.getElementById("ic_vatRate").value)||0)};state.db.settings=state.db.settings||{},state.db.settings.invoiceConfig=e,state.db.settings.companyName=e.companyName,scheduleSave(),addAudit(state.profile.username,"Invoice Settings","Updated company & billing details"),toast("Invoicing details saved","success")}function exportAllData(){const e=JSON.stringify(state.db,null,2),t=document.createElement("a");t.href=`data:application/json;charset=utf-8,${encodeURIComponent(e)}`,t.download=`gargo-backup-${(new Date).toISOString().slice(0,10)}.json`,t.click(),toast("Data exported","success")}function importData(e){const t=e.target.files[0];if(!t)return;if(t.size>10485760)return void toast("File too large. Max 10MB.","error");const i=new FileReader;i.onload=e=>{try{const t=JSON.parse(e.target.result);if(!t.trucks||!t.drivers)throw new Error("Invalid format");const i=e=>"string"==typeof e&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e),n=t.trucks.length&&!i(t.trucks[0].id);state.db=n?remapSeedIds(t):t,scheduleSave(),buildBadges(),buildAlerts(),renderSection(state.currentSection),toast("Data imported successfully","success")}catch(e){toast("Import failed — invalid file","error")}},i.readAsText(t),e.target.value=""}function createBackup(){state.db.settings=state.db.settings||{},state.db.settings.backupDate=(new Date).toISOString(),scheduleSave(),exportAllData(),document.getElementById("lastBackup").textContent=fmtDate(state.db.settings.backupDate),toast("Backup created","success")}function toggleDangerZone(){const e=document.getElementById("dangerZone"),t=document.getElementById("dangerZoneToggle"),i="none"===e.style.display;e.style.display=i?"block":"none",t.textContent=i?"▲ Hide Danger Zone":"▼ Show Danger Zone"}function clearAllData(){isAdmin()?openModal("Confirm: Clear All Data",'<div class="vault-banner"><div class="vault-banner-label">⚠ IRREVERSIBLE ACTION</div><div class="vault-banner-desc">This will permanently delete all trucks, drivers, trips, maintenance records, and financial data. This cannot be undone.</div></div><div class="fg"><label>Type CLEAR to confirm</label><input id="clearConfirm" placeholder="CLEAR" autocomplete="off"/></div><div style="display:flex;gap:8px;margin-top:10px"><button class="modal-btn danger" onclick="executeClearData()">Delete Everything</button><button class="modal-btn ghost" onclick="closeModal()">Cancel</button></div>'):toast("Admin rights required","error")}async function executeClearData(){"CLEAR"===document.getElementById("clearConfirm")?.value?(closeModal(),toast("Clearing all data…","info",2e3),await clearAllTables(),state.db={trucks:[],drivers:[],trips:[],maintenance:[],fuel:[],shippingLines:[],shutouts:[],interchange:[],requisitions:[],vesselLineMap:[],workshop:[],invoices:[],billingRates:defaultBillingRates(),allocationRules:[],trackingPositions:{},auditLog:[],settings:state.db.settings||{backupDate:null,mapApiKey:"",whatsapp:!0,mpesa:!1,companyName:"Gargo Logistics Ltd",invoiceConfig:null,wialonEnabled:!1,wialonToken:"",wialonHost:"https://hst-api.wialon.com"},profiles:state.db.profiles||[]},await saveDB(),buildBadges(),buildAlerts(),renderSection(state.currentSection),toast("All data cleared","warning")):toast("Type CLEAR to confirm","error")}function requireAdminAction(e,t){isAdmin()?e():toast("Admin rights required for this action","error")}function showChangePasswordModal(){state.currentUser?openModal("Change Password",'\n    <div class="fg"><label>New Password</label>\n      <div class="pw-wrap"><input type="password" id="cp_new" placeholder="Min 6 characters"/></div>\n    </div>\n    <div class="fg"><label>Confirm New Password</label>\n      <div class="pw-wrap"><input type="password" id="cp_conf" placeholder="Confirm password"/></div>\n    </div>\n    <div class="login-error" id="cpError"></div>\n    <button class="submit-btn" onclick="submitChangePassword()">Change Password →</button>\n  '):toast("Not logged in","error")}async function submitChangePassword(){const e=document.getElementById("cp_new").value,t=document.getElementById("cp_conf").value,i=document.getElementById("cpError");if(e&&t)if(e.length<6)i.textContent="Password must be at least 6 characters";else if(e===t)try{const{error:t}=await supabase.auth.updateUser({password:e});if(t)return void(i.textContent="Failed: "+t.message);addAudit(state.profile.username,"Password Changed","Self-service change"),closeModal(),toast("Password updated successfully","success")}catch(e){i.textContent="Connection error"}else i.textContent="Passwords do not match";else i.textContent="All fields required"}const DELETE_TABLE_LABELS={trucks:"Truck",drivers:"Driver",trips:"Trip",maintenance:"Maintenance record",fuel:"Fuel log",shutouts:"Shutout record",interchange:"Interchange record",shippingLines:"Shipping line",requisitions:"Requisition",workshop:"Workshop job",invoices:"Invoice"},DELETE_TABLE_SUPABASE_NAMES={trucks:"trucks",drivers:"drivers",trips:"trips",maintenance:"maintenance",fuel:"fuel_logs",shutouts:"shutouts",interchange:"interchange",shippingLines:"shipping_lines",requisitions:"requisitions",workshop:"workshop_jobs",invoices:"invoices"};function adminDeleteBtn(e,t){return""}async function confirmDeleteRecord(e,t){if(!isAdmin())return void toast("Admin rights required to delete records","error");const i=DELETE_TABLE_LABELS[e]||"record";if(!confirm(`Delete this ${i.toLowerCase()}? This cannot be undone.`))return;const n=state.db[e];if(!Array.isArray(n))return;const a=n.findIndex(e=>e.id===t);if(-1===a)return void toast("Record not found","error");const o=DELETE_TABLE_SUPABASE_NAMES[e];if(o){toast("Deleting…","info",1500);const{error:e}=await supabase.from(o).delete().eq("id",t);if(e)return console.error(`${o} delete failed:`,e.message),void toast(`Could not delete — ${e.message}`,"error",6e3)}n.splice(a,1),addAudit(state.profile.username,"Record Deleted",`${i} — ${t}`),buildBadges(),closeModal(),toast(`${i} deleted`,"success"),state.currentSection&&renderSection(state.currentSection),state.currentAdminSection&&renderSection(state.currentAdminSection)}function triggerImageUpload(e,t,i,n){const a=document.createElement("input");a.type="file",a.accept="image/*",a.onchange=a=>{const o=a.target.files[0];if(!o)return;if(o.size>2097152)return void toast("Image too large — max 2MB","error");const r=new FileReader;r.onload=()=>{const a=state.db[e].find(e=>e.id===t);a&&(a[i]=r.result,a._dirty=!0,scheduleSave(),toast("Image uploaded","success"),state.currentSection&&renderSection(state.currentSection),state.currentAdminSection&&renderSection(state.currentAdminSection),"function"==typeof n&&n())},r.readAsDataURL(o)},a.click()}function openModal(e,t){document.getElementById("modalTitle").textContent=e,document.getElementById("modalBody").innerHTML=t,document.getElementById("modalOverlay").classList.add("active")}function closeModal(e){e&&e.target!==document.getElementById("modalOverlay")||document.getElementById("modalOverlay").classList.remove("active")}function handleSearch(e){e=(e||"").toLowerCase().trim();const t=document.getElementById("searchResults");if(!e||!state.db)return void(t.style.display="none");const i=state.db,n=[];i.trucks.forEach(t=>{((t.reg||"").toLowerCase().includes(e)||(t.id||"").toLowerCase().includes(e)||(t.make||"").toLowerCase().includes(e)||(t.vin||"").toLowerCase().includes(e)||(t.licencePlate||"").toLowerCase().includes(e))&&n.push({type:"Truck",label:`${t.reg} — ${t.make}`,sub:sbadgeText(t.status),action:()=>showTruckDetail(t.id)})}),i.drivers.forEach(t=>{((t.name||"").toLowerCase().includes(e)||(t.phone||"").includes(e)||(t.licence||"").toLowerCase().includes(e)||(t.idNo||"").toLowerCase().includes(e))&&n.push({type:"Driver",label:t.name,sub:sbadgeText(t.status),action:()=>showDriverDetail(t.id)})});const a=new Set;i.trips.forEach(t=>{(t.container||"").toLowerCase().includes(e)&&a.add(t.container.toUpperCase())}),i.shutouts.forEach(t=>{(t.container||"").toLowerCase().includes(e)&&a.add(t.container.toUpperCase())}),i.interchange.forEach(t=>{((t.container||"").toLowerCase().includes(e)||(t.eirNumber||"").toLowerCase().includes(e)||(t.vessel||"").toLowerCase().includes(e)||(t.voyage||"").toLowerCase().includes(e)||(t.blNumber||"").toLowerCase().includes(e))&&a.add(t.container.toUpperCase())}),[...a].forEach(e=>{const t=i.trips.filter(t=>(t.container||"").toUpperCase()===e).length;n.push({type:"Container",label:e,sub:t?`${t} trip(s) on record`:"View full history",action:()=>showContainerDetail(e)})}),i.trips.forEach(t=>{((t.origin||"").toLowerCase().includes(e)||(t.dest||"").toLowerCase().includes(e)||(t.ref||"").toLowerCase().includes(e))&&n.push({type:"Trip",label:`${t.container} — ${t.origin}→${t.dest}`,sub:sbadgeText(t.status),action:()=>showTripDetail(t.id)})}),i.invoices.forEach(t=>{((t.client||"").toLowerCase().includes(e)||(t.ref||"").toLowerCase().includes(e))&&n.push({type:"Invoice",label:`${t.ref} — ${t.client}`,sub:sbadgeText(t.status),action:()=>showInvoiceDetail(t.id)})});const o=n.slice(0,10);t.innerHTML=o.length?o.map((e,t)=>`<div class="search-result-item" onclick="runSearchResult(${t})"><span class="search-result-type">${esc(e.type)}</span> ${esc(e.label)}${e.sub?`<span class="search-result-sub">${esc(e.sub)}</span>`:""}</div>`).join(""):'<div class="search-result-item search-result-empty">No matches</div>',window._searchResults=o.map(e=>e.action),t.style.display="block"}function sbadgeText(e){return{available:"Available",on_trip:"On Trip",maintenance:"Maintenance",breakdown:"Breakdown",off_duty:"Off Duty",grounded:"Grounded",active:"Active",completed:"Completed",delayed:"Delayed",pending:"Pending",approved:"Approved",rejected:"Rejected",fulfilled:"Fulfilled",overdue:"Overdue",draft:"Draft",sent:"Sent",paid:"Paid",partial:"Partial"}[e]||e||""}function runSearchResult(e){const t=document.getElementById("searchResults");t&&(t.style.display="none");const i=document.getElementById("globalSearch");i&&i.blur(),window._searchResults&&window._searchResults[e]&&window._searchResults[e]()}function showContainerDetail(e){const t=(e||"").trim().toUpperCase(),i=state.db,n=i.trips.filter(e=>(e.container||"").toUpperCase()===t).sort((e,t)=>new Date(t.startTime)-new Date(e.startTime)),a=i.shutouts.filter(e=>(e.container||"").toUpperCase()===t).sort((e,t)=>new Date(t.date)-new Date(e.date)),o=i.interchange.filter(e=>(e.container||"").toUpperCase()===t).sort((e,t)=>new Date(t.date)-new Date(e.date)),r=n.find(isTripLive)||null;if(!n.length&&!a.length&&!o.length)return void openModal(`Container — ${t}`,`<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-label">No records found for ${t}</div></div>`);const s=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">\n    <div class="mono" style="font-size:18px;color:var(--gold);font-weight:700">${t}</div>\n    ${r?sbadge(r.status):'<span style="font-size:11px;color:var(--text-3)">No active trip</span>'}\n  </div>`,d=`<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip History (${n.length})</div>`+(n.length?n.map(e=>`<div class="activity-row" style="cursor:pointer" onclick="closeModal();showTripDetail('${e.id}')"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">${e.origin} → ${e.dest}</div><div style="font-size:10px;color:var(--text-3)">${truckName(e.truckId)} · ${driverName(e.driverId)}</div></div>${sbadge(e.status)}<div class="act-time">${fmtDate(e.startTime)}</div></div>`).join(""):'<div class="empty-state" style="padding:10px 0"><div class="empty-state-label">No trips recorded</div></div>'),l=a.length?`<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Shutout History (${a.length})</div>`+a.map(e=>`<div class="activity-row"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">${e.reason||"—"}</div><div style="font-size:10px;color:var(--text-3)">${e.vessel||""} ${e.voyage?`· Voyage ${e.voyage}`:""}</div></div>${sbadge(e.status)}<div class="act-time">${fmtDate(e.date)}</div></div>`).join(""):"",c=o.length?`<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Interchange History (${o.length})</div>`+o.map(e=>{const t=[e.eirNumber?`EIR ${e.eirNumber}`:null,e.vessel||e.voyage?`${e.vessel||"—"} / ${e.voyage||"—"}`:null].filter(Boolean).join(" · "),i=e.repairs&&e.repairs.length?`<div style="font-size:10.5px;color:var(--red);margin-top:2px">${e.repairs.length} damage item${e.repairs.length>1?"s":""} · KSh ${Number(e.repairTotal||0).toLocaleString(void 0,{minimumFractionDigits:2})}</div>`:"";return`<div class="activity-row" style="align-items:flex-start;gap:10px">${e.img?`<img src="${e.img}" style="width:44px;height:44px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:pointer;flex-shrink:0" onclick="showContainerPhotos('${e.id}')" />`:'<div style="width:44px;height:44px;border-radius:5px;border:1px dashed var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:16px">📦</div>'}<div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:11.5px;color:var(--text)">${e.type} · ${e.condition}</div>${sbadge(e.status)}</div><div style="font-size:10px;color:var(--text-3)">${lineName(e.line)} · ${fmtDate(e.date)}</div>${t?`<div style="font-size:10px;color:var(--text-3);margin-top:2px">${t}</div>`:""}${i}${e.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:3px">${e.notes}</div>`:""}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${e.surveyId||e.img?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="showContainerPhotos('${e.id}')">📷 Photos</button>`:""}${e.surveyId?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInspectionReport('${e.surveyId}')">⬇ Inspection Report</button>`:""}<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInterchangeSlip('${e.id}')">⬇ Slip</button></div></div></div>`}).join(""):"",p=[];r&&canUpdateTripStatus(r)&&nextTripStatuses(r.status).forEach(e=>{p.push(`<button class="filter-btn" onclick="closeModal();quickSetTripStatus('${r.id}','${e}')">${e.replace("_"," ")}</button>`)}),r&&p.push(`<button class="modal-btn ghost" onclick="closeModal();showTripDetail('${r.id}')">View Trip →</button>`),(isAdmin()||isClerk()||isDispatch())&&(p.push('<button class="modal-btn ghost" onclick="closeModal();showAddShutoutModal()">Flag Shutout</button>'),p.push('<button class="modal-btn ghost" onclick="closeModal();showAddInterchangeModal()">Record Interchange</button>'));const u=p.length?`<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:14px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Actions</div><div style="display:flex;gap:6px;flex-wrap:wrap">${p.join("")}</div></div>`:"";openModal(`Container — ${t}`,`${s}${d}${l}${c}${u}`)}function toggleUserMenu(){const e=document.getElementById("userMenu");e&&(e.style.display="none"===e.style.display?"block":"none")}function closeUserMenu(){const e=document.getElementById("userMenu");e&&(e.style.display="none")}function populateSelects(){fillSelect("f_truck",state.db.trucks,e=>[e.id,`${e.reg} — ${e.make}`]),fillSelect("f_driver",state.db.drivers,e=>[e.id,e.name]),refreshContainerHistory()}function refreshContainerHistory(){const e=document.getElementById("containerHistory");if(!e)return;const t=new Map,i=(e,i)=>{e&&!t.has(e)&&t.set(e,i)};(state.db.trips||[]).forEach(e=>{e.container&&i(e.container,e.bookingId?"Public Booking":e.notes&&/bulk/i.test(e.notes)?"Bulk Upload":"Dispatch")}),(state.db.shutouts||[]).forEach(e=>{i(e.container,"Shutout")}),(state.db.interchange||[]).forEach(e=>{i(e.container,"Interchange")}),e.innerHTML=[...t.keys()].sort().map(e=>`<option value="${e}">${t.get(e)}</option>`).join("")}function startIdleTimer(){clearIdleTimer();const e=()=>{state.lastActivity=Date.now()};["mousemove","keydown","click","scroll","touchstart"].forEach(t=>document.addEventListener(t,e,{passive:!0})),state.idleTimer=setInterval(()=>{Date.now()-state.lastActivity>9e5&&(clearIdleTimer(),toast("Session timed out — please sign in again","warning",5e3),setTimeout(()=>forceLogout("Session timed out (idle)"),2e3))},6e4)}function clearIdleTimer(){state.idleTimer&&clearInterval(state.idleTimer),state.idleTimer=null}function startLivePulse(){setInterval(()=>{state.db.trucks.filter(e=>"on_trip"===e.status).forEach(e=>{e.fuelPct=Math.max(0,e.fuelPct-.1)}),buildAlerts(),"dashboard"===state.currentSection&&renderDashboard(),"livetracking"===state.currentSection&&renderTracking()},3e4)}function addAudit(e,t,i){e||(e="system");const n=state.db.auditLog||[];n.unshift({user:e,action:t,detail:i,time:(new Date).toISOString()}),n.length>500&&n.splice(500),state.db.auditLog=n,scheduleSave()}document.addEventListener("click",e=>{const t=document.querySelector(".user-chip-rail"),i=document.getElementById("userMenu");i&&t&&!t.contains(e.target)&&!i.contains(e.target)&&(i.style.display="none");const n=document.getElementById("searchResults"),a=document.querySelector(".search-wrap");n&&a&&!a.contains(e.target)&&(n.style.display="none")}),document.addEventListener("keydown",e=>{if(state.currentUser){if("Escape"===e.key){closeModal(),closeUserMenu();const e=document.getElementById("searchResults");e&&(e.style.display="none")}(e.ctrlKey||e.metaKey)&&"k"===e.key&&(e.preventDefault(),document.getElementById("globalSearch")?.focus()),(e.ctrlKey||e.metaKey)&&"/"===e.key&&(e.preventDefault(),toggleSidebar())}});const ADMIN_ONLY_SECTIONS=["invoicing","settings","usermgmt"],origShowAdminSection=window.showAdminSection||showAdminSection;window.showAdminSection=function(e,t){!ADMIN_ONLY_SECTIONS.includes(e)||isAdmin()?(origShowAdminSection(e,t),"invoicing"===e&&renderInvoicing(_invFilter)):toast("Admin rights required","error")};let _publicBookingFilter="pending";function filterPublicBookings(e,t){_publicBookingFilter=e,document.querySelectorAll("#sec-publicbookings .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderPublicBookings()}async function renderPublicBookings(){const e=document.getElementById("publicBookingsList");if(!e)return;let t=supabase.from("public_bookings").select("*");"all"!==_publicBookingFilter&&(t=t.eq("status",_publicBookingFilter));const{data:i,error:n}=await t.order("created_at",{ascending:!1});if(n)return void(e.innerHTML=`<div class="empty-state">Error: ${n.message}</div>`);if(!i||0===i.length)return void(e.innerHTML=`<div class="empty-state">No ${_publicBookingFilter} bookings</div>`);e.innerHTML=i.map(e=>{let t="";if("imported"===e.status){const i=findTripByBookingId(e.id);!i||i.truckId&&i.driverId?i&&(t=`<button class="modal-btn ghost" onclick="showTripDetail('${i.id}')">View Trip</button>`):t=`<button class="modal-btn primary" onclick="jumpToCompleteDispatch('${i.id}')">Complete Dispatch →</button>`}return`\n    <div style="border:1px solid #333;border-radius:8px;padding:12px;margin-bottom:10px;background:#111;">\n      <div><strong>${sanitize(e.full_name)}</strong> (${sanitize(e.email)})</div>\n      <div>Service: ${sanitize(e.service_type)}</div>\n<div>Container: ${sanitize(e.container)||"Not provided"}</div>\n<div style="font-size:10px;color:var(--text-3);">Booking ID: ${e.id.slice(0,8)}</div>\n      <div>Pickup: ${sanitize(e.pickup_location)} → Drop: ${sanitize(e.dropoff_location)}</div>\n      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">\n        <span class="sbadge s-${e.status}">${e.status}</span>\n        ${"pending"===e.status?`<button class="modal-btn primary" onclick="importPublicBooking('${e.id}')">Import to Fleet</button>`:""}\n        ${t}\n        <button class="modal-btn ghost" onclick="showPublicBookingDetail('${e.id}')">View</button>\n      </div>\n    </div>\n  `}).join("");const a=document.getElementById("badge-publicbookings");if(a){const e=i.filter(e=>"pending"===e.status).length;a.textContent=e||"",a.style.display=e?"inline":"none"}}function resolveBookingShippingLineId(e){if(!e)return null;if(e.shipping_line_id&&state.db.shippingLines.some(t=>t.id===e.shipping_line_id))return e.shipping_line_id;const t=(e.shipping_line||"").trim().toLowerCase();if(!t)return null;const i=state.db.shippingLines.find(e=>(e.code||"").toLowerCase()===t||(e.name||"").toLowerCase()===t||(e.name||"").toLowerCase().includes(t)||t.includes((e.name||"").toLowerCase()));return i?i.id:null}function findTripByBookingId(e){return state.db.trips.find(t=>t.bookingId===e)}async function importPublicBooking(e){if(!confirm("Import this booking?"))return;const{data:t,error:i}=await supabase.from("public_bookings").select("*").eq("id",e).single();if(i||!t)return void toast("Booking not found","error");if("pending"!==t.status)return void toast("Already processed","warning");try{const i=window.bookingDocs.getRequiredDocTypes({serviceType:t.service_type,origin:t.pickup_location,destination:t.dropoff_location});if(i.length){const t=await window.bookingDocs.documentsForBooking(e),n={};t.forEach(e=>{"verified"===e.status&&(n[e.doc_type]=!0)});const a=i.filter(e=>!n[e]);if(a.length)return void toast(`Can't import — still missing verified: ${a.join(", ").replace(/_/g," ")}. Verify documents in DepOps first.`,"error",6e3)}}catch(e){return void toast(`Could not confirm document status (${e&&e.message||"error"}) — import blocked until this can be checked.`,"error",6e3)}const n=(t.container||"").trim().toUpperCase();if(n){const e=containerFormatIssue(n);if(e)return void toast(`Booking's container number ${n}: ${e} — fix it before importing`,"error",6e3);const t=findLiveTripByContainer(n);if(t)return void toast(`${n} is already on an active trip (${t.origin} → ${t.dest}). Resolve that trip first, or correct the container number on this booking.`,"error")}const{data:a,error:o}=await supabase.from("public_bookings").update({status:"imported"}).eq("id",e).eq("status","pending").select();if(o)return void toast(`Import failed — could not update booking status (${o.message}). No trip was created.`,"error");if(!a||0===a.length)return toast("Import failed — booking was already processed by someone else. Refresh and check.","warning"),void renderPublicBookings();if("Depot Storage"===t.service_type){const{error:t}=await supabase.from("public_bookings").update({storage_status:"awaiting_survey"}).eq("id",e);return t?toast(`Imported, but couldn't set survey status (${t.message}) — check DepOps → Zones`,"warning",6e3):toast("Imported — now awaiting survey in DepOps","success"),void renderPublicBookings()}const r={id:uid("TRIP"),container:n||`PUB-${t.id.slice(0,8)}`,ctype:t.cargo_type||"20ft Dry",workType:t.service_type||"Other",origin:t.pickup_location||"—",dest:t.dropoff_location||"—",shippingLine:resolveBookingShippingLineId(t),status:"active",startTime:(new Date).toISOString(),eta:new Date(Date.now()+144e5).toISOString(),distance:0,priority:"Normal",notes:`Imported from public booking #${t.id}`,ref:`PUB-${t.id.slice(0,8)}`,truckId:null,driverId:null,containerImages:[],bookingId:t.id};state.db.trips.push(r),scheduleSave(),toast("Imported — awaiting dispatch (trip "+r.id.slice(-6)+")","success"),renderPublicBookings(),refreshAwaitingDispatchUI()}async function showPublicBookingDetail(e){const{data:t,error:i}=await supabase.from("public_bookings").select("*").eq("id",e).single();!i&&t?openModal("Booking Detail",`<pre>${JSON.stringify(t,null,2)}</pre>`):toast("Not found","error")}async function refreshPublicBookings(){toast("Refreshing...","info"),await renderPublicBookings()}!function(){try{runLoader()}catch(e){console.error("Initialization error:",e),toast("System initialization error. Please refresh.","error")}}();let deferredInstallPrompt=null;function isStandaloneDisplay(){return window.matchMedia("(display-mode: standalone)").matches||!0===window.navigator.standalone}function isIOSDevice(){return/iPad|iPhone|iPod/.test(navigator.userAgent)||"MacIntel"===navigator.platform&&navigator.maxTouchPoints>1}function setInstallButtonVisible(e){const t=document.getElementById("installAppBtn");t&&(t.style.display=e?"flex":"none")}function initInstallApp(){isStandaloneDisplay()?setInstallButtonVisible(!1):(window.addEventListener("beforeinstallprompt",e=>{e.preventDefault(),deferredInstallPrompt=e,setInstallButtonVisible(!0)}),isIOSDevice()&&setInstallButtonVisible(!0),window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null,setInstallButtonVisible(!1),toast("Gargo installed","success")}))}async function handleInstallClick(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();const{outcome:e}=await deferredInstallPrompt.userChoice;return"accepted"===e&&toast("Installing Gargo…","success"),void(deferredInstallPrompt=null)}isIOSDevice()?openModal("Install Gargo",'\n      <div style="font-size:13px;line-height:1.7;color:var(--text-2)">\n        <p style="margin-bottom:10px">Add Gargo to your Home Screen for one-tap, full-screen access:</p>\n        <ol style="padding-left:18px;margin:0">\n          <li>Tap the <strong>Share</strong> icon in Safari\'s toolbar.</li>\n          <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>\n          <li>Tap <strong>Add</strong> in the top-right corner.</li>\n        </ol>\n      </div>\n    '):openModal("Install Gargo",'\n    <div style="font-size:13px;line-height:1.7;color:var(--text-2)">\n      Your browser didn\'t offer an install prompt yet — this can happen if the app is already installed,\n      or if your browser doesn\'t support installing web apps. Look for an install icon in the address bar,\n      or check your browser\'s menu for an "Install app" / "Add to Home Screen" option.\n    </div>\n  ')}async function hardRefreshSystem(){const e=document.getElementById("refreshAppBtn"),t=document.getElementById("refreshIcon");e&&(e.disabled=!0),t&&t.classList.add("spinning"),toast("Refreshing system…","info",4e3);try{if("serviceWorker"in navigator){const e=await navigator.serviceWorker.getRegistrations();await Promise.all(e.map(e=>e.unregister()))}if("caches"in window){const e=await caches.keys();await Promise.all(e.map(e=>caches.delete(e)))}}catch(e){console.warn("Could not clear cache/service worker during refresh:",e)}const i=new URL(window.location.href);i.searchParams.set("_refresh",Date.now()),window.location.replace(i.toString())}"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(e=>{console.error("Service worker registration failed:",e)}),navigator.serviceWorker.addEventListener("message",e=>{e.data&&"SW_UPDATED"===e.data.type&&(toast("A new version is available — reloading…","info",2500),setTimeout(()=>window.location.reload(),1200))})}),initInstallApp();const DEPOPS_DOC_LABELS={guarantee_form:"Container Guarantee Form",release_order:"Release Order (CRO)",delivery_order:"Delivery Order"};let _depOpsTab="inbound",_depOpsInboundFilter="pending_review",_depOpsOutwardFilter="pending_review";function depOpsFmtDT(e){if(!e)return"—";const t=new Date(e);return isNaN(t.getTime())?String(e):t.toLocaleString("en-KE",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}function docStatusBadge(e){return`<span class="sbadge s-${{verified:"approved",pending_review:"pending",rejected:"rejected"}[e]||"pending"}">${"pending_review"===e?"Pending Review":e.charAt(0).toUpperCase()+e.slice(1)}</span>`}function switchDepOpsTab(e,t){_depOpsTab=e,document.querySelectorAll("#sec-depops .depops-tab-btn").forEach(e=>e.classList.remove("active")),t&&t.classList.add("active"),document.querySelectorAll("#sec-depops .depops-tab-panel").forEach(e=>e.classList.remove("active"));const i=document.getElementById("depopsPanel-"+e);i&&i.classList.add("active"),renderDepOps()}async function renderDepOps(){renderDepOpsZones(),renderDepOpsStorageList(),updateDepOpsBadge(),"inbound"===_depOpsTab?await renderDepOpsInbound():"zones"===_depOpsTab?await renderDepOpsZoneAdmin():"escalations"===_depOpsTab?await renderDepOpsEscalations():"yard"===_depOpsTab?await renderDepOpsYardMap():"surveys"===_depOpsTab?await renderDepOpsSurveyRegister():"master"===_depOpsTab?await renderDepOpsMasterList():"reports"===_depOpsTab?await renderDepOpsReports():await renderDepOpsOutward()}async function updateDepOpsBadge(){const e=document.getElementById("badge-depops");if(e&&window.bookingDocs)try{const[t,i]=await Promise.all([window.bookingDocs.reviewQueue("pending_review"),window.bookingDocs.outwardReviewQueue("pending_review")]),n=t.length+i.length;e.textContent=n||"",e.style.display=n?"inline":"none"}catch(e){}}async function renderDepOpsZones(){const e=document.getElementById("depopsZones");if(e)try{const t=await window.bookingDocs.listZones();if(!t.length)return void(e.innerHTML='<div class="empty-state" style="padding:16px"><div class="empty-state-label">No storage zones configured yet</div></div>');e.innerHTML=`<table style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Line</th><th style="padding:6px 8px">Occupied</th><th style="padding:6px 8px">Free</th>\n      </tr></thead><tbody>${t.map(e=>{const t=e.capacity_teu||0,i=e.occupied_teu||0,n=Math.max(t-i,0),a=t>0?Math.min(100,Math.round(i/t*100)):0,o=e.shipping_lines?`${sanitize(e.shipping_lines.code)}`:'<span style="color:var(--text-3)">Unassigned</span>';return`<tr style="border-top:1px solid var(--border)">\n          <td style="padding:6px 8px">${sanitize(e.zone_code||"")} · ${sanitize(e.zone_name)}</td>\n          <td style="padding:6px 8px">${o}</td>\n          <td style="padding:6px 8px">${i} / ${t} TEU<div style="width:100px;height:5px;background:#222;border-radius:3px;overflow:hidden;margin-top:4px"><div style="width:${a}%;height:100%;background:var(--gold)"></div></div></td>\n          <td style="padding:6px 8px">${n} TEU</td>\n        </tr>`}).join("")}</tbody></table>`}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}async function renderDepOpsStorageList(){const e=document.getElementById("depopsStorageList");if(e)try{const[t,i]=await Promise.all([depOpsRepatriationEligibleBookings(),window.bookingDocs.storageAvailability()]);if(!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">No containers currently in storage</div></div>');const n={};i.forEach(e=>{n[e.id]=e.zone_name});const a=await Promise.all(t.map(e=>window.bookingDocs.surveyForOccupant({bookingId:e.id})));e.innerHTML=`<table style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px"></th>\n      </tr></thead><tbody>${t.map((e,t)=>{const i=e.storage_zone_id&&n[e.storage_zone_id]||"Unknown zone",o=a[t],r=o?o.interchange_generated_at?`<span class="sbadge s-approved" title="Generated ${fmtDate(o.interchange_generated_at)}">✓ Generated</span>${o.interchange_id?` <button class="tbl-btn" onclick="downloadInterchangeSlip('${o.interchange_id}')">⬇</button>`:""}`:`<button class="modal-btn primary" onclick="generateInterchangeFromSurvey('${e.id}','${o.id}')">Generate →</button>`:'<span style="color:var(--text-3);font-size:10.5px">No survey on file</span>';return`<tr style="border-top:1px solid var(--border)">\n          <td style="padding:6px 8px" class="mono">${sanitize(e.container)||"—"}</td>\n          <td style="padding:6px 8px">${sanitize(i)}</td>\n          <td style="padding:6px 8px">${sanitize(e.full_name)}${e.company?" · "+sanitize(e.company):""}</td>\n          <td style="padding:6px 8px">${r}</td>\n          <td style="padding:6px 8px"><button class="modal-btn ghost" onclick="depOpsDispatchContainer('${e.id}')">Dispatch →</button></td>\n        </tr>`}).join("")}</tbody></table>`}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}function depOpsDispatchContainer(e){const t=state.db.trips.find(t=>"Depot → Port"===t.workType&&t.bookingId===e);t?jumpToCompleteDispatch(t.id):(showSection("depops",document.querySelector('[data-section="depops"]')),switchDepOpsTab("outward",document.querySelector(".depops-tab-btn:nth-child(2)")),toast("Pick a destination and create the outward trip below — it will then appear in the Dispatch Console.","info",5e3),setTimeout(()=>{const e=document.getElementById("depopsEligibleList");e&&e.scrollIntoView({behavior:"smooth",block:"start"})},150))}function filterDepOpsInbound(e,t){_depOpsInboundFilter=e,document.querySelectorAll("#depopsPanel-inbound .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderDepOpsInbound()}async function renderDepOpsInbound(){await renderDepOpsReadyToProcess(),await renderDepOpsAwaitingSurvey(),await renderDepOpsAllocationQueue();const e=document.getElementById("depopsInboundQueue");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.reviewQueue(_depOpsInboundFilter);if(!t.length)return void(e.innerHTML=`<div class="empty-state"><div class="empty-state-label">No ${_depOpsInboundFilter.replace(/_/g," ")} documents</div></div>`);e.innerHTML=t.map(e=>depOpsDocCard(e,"inbound")).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}async function renderDepOpsReadyToProcess(){const e=document.getElementById("depopsReadyList");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.readyToProcessBookings();if(!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">No bookings are fully verified yet</div></div>');e.innerHTML=t.map(e=>depOpsReadyCard(e)).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}function depOpsReadyCard(e){const t=e.booking;return`<div style="border:1px solid rgba(34,197,94,0.35);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(34,197,94,0.05)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong>${sanitize(t.full_name)}</strong>${t.company?" · "+sanitize(t.company):""}\n        <div style="font-size:11px;color:var(--text-3)">${sanitize(t.service_type)} · Container: ${sanitize(t.container)||"—"}</div>\n        <div style="font-size:10px;color:var(--text-3)">Booking ${t.id.slice(0,8)} · Verified: ${e.required.join(", ").replace(/_/g," ")}</div>\n      </div>\n      <span class="sbadge s-approved">verified & ready</span>\n    </div>\n    ${"Depot Storage"===t.service_type?'<div style="margin-top:8px;font-size:11px;color:var(--text-3)">Importing will send this container to Awaiting Survey below.</div>':""}\n    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">\n      <button class="modal-btn primary" onclick="importPublicBooking('${t.id}')">${"Depot Storage"===t.service_type?"Confirm Into Storage →":"Import to Fleet →"}</button>\n      <button class="modal-btn ghost" onclick="showPublicBookingDetail('${t.id}')">View</button>\n    </div>\n  </div>`}const CONTAINER_TYPE_OPTIONS=["20ft Dry","40ft Dry","20ft HC","40ft HC","20ft Reefer","40ft Reefer","Flat Rack","Open Top","Tank","Hazmat","Heavy Duty","LCL","Platform","LC (Unspecified)"],DEPOT_TYPE_CODE_MAP={DV:"Dry",HD:"Dry",HC:"HC",FR:"Flat Rack",FL:"Flat Rack",OT:"Open Top",PL:"Platform",TK:"Tank",LC:"LC (Unspecified)"};function composeCtypeFromDepotCode(e,t){const i=String(e||"").trim(),n=i?/ft$/i.test(i)?i:`${parseInt(i,10)}ft`:"",a=String(t||"").trim().toUpperCase(),o=DEPOT_TYPE_CODE_MAP[a];return o?composeCtype(n,o):composeCtype(n||i,t)}const CARGO_STATUS_OPTIONS=["Empty","Laden / Full","Part Load","Damaged Cargo"];function ctypeSizeOptions(){const e=[];return CONTAINER_TYPE_OPTIONS.forEach(t=>{const i=t.match(/^(\d+ft)\s/);i&&-1===e.indexOf(i[1])&&e.push(i[1])}),e}function ctypeTypeOptionsForSize(e){return[...CONTAINER_TYPE_OPTIONS.filter(t=>0===t.indexOf(e+" ")).map(t=>t.slice(e.length+1)),...CONTAINER_TYPE_OPTIONS.filter(e=>!/^\d+ft\s/.test(e))]}function composeCtype(e,t){if(!t)return CONTAINER_TYPE_OPTIONS[0];const i=`${e} ${t}`;return-1!==CONTAINER_TYPE_OPTIONS.indexOf(i)?i:-1!==CONTAINER_TYPE_OPTIONS.indexOf(t)?t:i}function decomposeCtype(e){const t=e||CONTAINER_TYPE_OPTIONS[0],i=t.match(/^(\d+ft)\s(.+)$/);return i?{size:i[1],type:i[2]}:{size:ctypeSizeOptions()[0],type:t}}function populateSizeTypeSelects(e,t,i){const n=document.getElementById(e),a=document.getElementById(t);if(!n||!a)return;const{size:o,type:r}=decomposeCtype(i);n.innerHTML=ctypeSizeOptions().map(e=>`<option${e===o?" selected":""}>${e}</option>`).join(""),a.innerHTML=ctypeTypeOptionsForSize(n.value||o).map(e=>`<option${e===r?" selected":""}>${e}</option>`).join("")}function refreshTypeSelectForSize(e,t){const i=document.getElementById(e),n=document.getElementById(t);if(!i||!n)return;const a=n.value;n.innerHTML=ctypeTypeOptionsForSize(i.value).map(e=>`<option${e===a?" selected":""}>${e}</option>`).join("")}const REPAIR_LABOUR_RATE_PER_HOUR=300;function repairItemsFor(e){return window._repairItems[e]||(window._repairItems[e]=[])}function repairItemsTotal(e){return(e||[]).reduce((e,t)=>e+Number(t.hours||0)*REPAIR_LABOUR_RATE_PER_HOUR+Number(t.material||0),0)}function tariffPickerHtml(e){return`\n    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:16px 0 8px">Damage / Repair Items</div>\n    <div class="form-row-2">\n      <div class="fg"><label>Category</label><select id="${e}_tcat" onchange="onRepairCategoryChange('${e}')"><option value="">—</option>${Object.keys(window.bookingDocs.TARIFF_SCHEDULE||{}).map(e=>`<option>${e}</option>`).join("")}</select></div>\n      <div class="fg"><label>Code / Item</label><select id="${e}_tcode" onchange="onRepairCodeChange('${e}')"><option value="">Select category first…</option></select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Hours</label><input id="${e}_thours" type="number" step="0.1" readonly placeholder="Auto-filled"></div>\n      <div class="fg"><label>Material (KSh)</label><input id="${e}_tmaterial" type="number" step="0.01" readonly placeholder="Auto-filled"></div>\n    </div>\n    <button type="button" class="modal-btn ghost" style="margin-bottom:8px" onclick="addRepairItem('${e}')">+ Add item</button>\n    <div id="${e}_repairList"></div>`}function onRepairCategoryChange(e){const t=document.getElementById(`${e}_tcat`).value,i=document.getElementById(`${e}_tcode`),n=(window.bookingDocs.TARIFF_SCHEDULE||{})[t]||[];[`${e}_thours`,`${e}_tmaterial`].forEach(e=>{const t=document.getElementById(e);t&&(t.value="")}),i.innerHTML=n.length?'<option value="">Select…</option>'+n.map((e,t)=>`<option value="${t}">${e.code} — ${e.item}</option>`).join(""):'<option value="">Select category first…</option>'}function onRepairCodeChange(e){const t=document.getElementById(`${e}_tcat`).value,i=document.getElementById(`${e}_tcode`).value,n=((window.bookingDocs.TARIFF_SCHEDULE||{})[t]||[])[i];document.getElementById(`${e}_thours`).value=n?n.hours:"",document.getElementById(`${e}_tmaterial`).value=n?n.material:""}function addRepairItem(e){const t=document.getElementById(`${e}_tcat`).value,i=document.getElementById(`${e}_tcode`).value,n=((window.bookingDocs.TARIFF_SCHEDULE||{})[t]||[])[i];n?(repairItemsFor(e).push({category:t,code:n.code,side:n.side,item:n.item,hours:n.hours,material:n.material}),renderRepairItemsList(e)):toast("Pick a category and code first","error")}function removeRepairItem(e,t){repairItemsFor(e).splice(t,1),renderRepairItemsList(e)}function renderRepairItemsList(e){const t=document.getElementById(`${e}_repairList`);if(!t)return;const i=repairItemsFor(e);if(!i.length)return void(t.innerHTML='<div style="font-size:11px;color:var(--text-3)">No damage items added — container will be logged as good condition.</div>');const n=i.map((t,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--border)">\n    <div style="font-size:11.5px"><span class="mono" style="color:var(--gold)">${t.code}</span> — ${sanitize(t.item)} <span style="color:var(--text-3)">(${t.side})</span></div>\n    <div style="font-size:11px;color:var(--text-2)">${t.hours}h · KSh ${Number(t.material).toLocaleString()} <button type="button" class="modal-btn danger" style="padding:2px 8px;margin-left:8px" onclick="removeRepairItem('${e}',${i})">✕</button></div>\n  </div>`).join(""),a=repairItemsTotal(i);t.innerHTML=n+`<div style="display:flex;justify-content:space-between;padding-top:8px;font-weight:700;font-size:12px">\n    <span>Total (labour @ KSh ${REPAIR_LABOUR_RATE_PER_HOUR}/hr + material)</span><span>KSh ${a.toLocaleString(void 0,{minimumFractionDigits:2})}</span>\n  </div>`}async function renderDepOpsAwaitingSurvey(){const e=document.getElementById("depopsAwaitingSurveyList");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.awaitingSurveyBookings();if(!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">Nothing awaiting survey</div></div>');e.innerHTML=t.map(e=>`<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">\n      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n        <div>\n          <strong class="mono" style="color:var(--gold)">${sanitize(e.container)||"No container on file"}</strong>\n          <div style="font-size:11px;color:var(--text-3)">${sanitize(e.full_name)}${e.company?" · "+sanitize(e.company):""} · ${sanitize(e.cargo_type||"—")}</div>\n          <div style="font-size:10px;color:var(--text-3)">Booking ${e.id.slice(0,8)}</div>\n        </div>\n        <span class="sbadge s-pending">awaiting survey</span>\n      </div>\n      <div style="margin-top:10px"><button class="modal-btn primary" onclick="openSurveyModal('${e.id}')">Start Survey →</button></div>\n    </div>`).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}window._repairItems={};let _surveyImages=[];async function openSurveyModal(e){const{data:t,error:i}=await supabase.from("public_bookings").select("*").eq("id",e).single();if(i||!t)return void toast("Booking not found","error");const n=resolveBookingShippingLineId(t),a=state.db.shippingLines.map(e=>`<option value="${e.id}" ${e.id===n?"selected":""}>${sanitize(e.code)} — ${sanitize(e.name)}</option>`).join(""),o=CONTAINER_TYPE_OPTIONS.map(e=>`<option ${t.cargo_type===e?"selected":""}>${e}</option>`).join("");_surveyImages=[],window._repairItems.sv=[],openModal(`Survey — ${sanitize(t.container)||"Container"}`,`\n    <div class="form-row-2">\n      <div class="fg"><label>Container No.</label><input id="sv_container" value="${sanitize(t.container||"")}" oninput="markContainerValidity(this)"></div>\n      <div class="fg"><label>Type / Size</label><select id="sv_ctype">${o}</select></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Shipping Line</label><select id="sv_line"><option value="">—</option>${a}</select></div>\n      <div class="fg"><label>Consignee</label><input id="sv_consignee" value="${sanitize(t.company||t.full_name||"")}"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Guarantee / B/L Number</label><input id="sv_bl"></div>\n      <div class="fg"><label>EIR / Reference No.</label><input id="sv_eir" placeholder="Transporter's own EIR no."></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Vessel</label><input id="sv_vessel"></div>\n      <div class="fg"><label>Voyage</label><input id="sv_voyage"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Transporter</label><input id="sv_transporter"></div>\n      <div class="fg"><label>ISO Code</label><input id="sv_iso" placeholder="e.g. 22G1"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Max Gross Weight — MGW (kg)</label><input id="sv_mgwt" type="number"></div>\n      <div class="fg"><label>Tare Weight — TW (kg)</label><input id="sv_tare" type="number"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Vehicle / Truck No.</label><input id="sv_truck"></div>\n      <div class="fg"><label>Trailer Number</label><input id="sv_trailer"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Driver Name</label><input id="sv_driver"></div>\n      <div class="fg"><label>Driver ID Number</label><input id="sv_driver_id"></div>\n    </div>\n    <div class="form-row-2">\n      <div class="fg"><label>Surveyed By</label><input id="sv_clerk" value="${sanitize(state.profile&&state.profile.name||"")}"></div>\n      <div class="fg"><label>Seal Number</label><input id="sv_seal"></div>\n    </div>\n    <div class="fg"><label>Gate Pass No.</label><input id="sv_gatepass"></div>\n\n    <div class="fg"><label>Overall Condition</label><select id="sv_condition" onchange="onSurveyConditionChange()">\n      <option value="full_grade">Full Grade</option>\n      <option value="under_repair">Under Repair</option>\n      <option value="damaged">Damaged</option>\n      <option value="heavily_damaged">Heavily Damaged — requires joint survey</option>\n    </select></div>\n    <div id="sv_heavily_damaged_note" style="display:none;margin-bottom:10px" class="ops-notice">\n      This container will be sent to <b>Escalations</b> and cannot be allocated to storage until a second surveyor records a joint finding.\n    </div>\n\n    ${tariffPickerHtml("sv")}\n\n    <div class="fg"><label>Survey Photos</label><input type="file" id="sv_images" accept="image/*" multiple onchange="onSurveyImagesSelected(event)"><div id="sv_images_preview" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div></div>\n    <div class="fg"><label>Remarks</label><textarea id="sv_remarks" rows="3" placeholder="Damage notes, discrepancies, etc."></textarea></div>\n    <button class="submit-btn" onclick="saveSurvey('${e}')">Save Survey →</button>\n  `);const r=document.getElementById("sv_container");r&&markContainerValidity(r),renderRepairItemsList("sv")}function onSurveyConditionChange(){const e=document.getElementById("sv_condition"),t=document.getElementById("sv_heavily_damaged_note");t&&(t.style.display=e&&"heavily_damaged"===e.value?"block":"none")}function onSurveyImagesSelected(e){const t=Array.from(e.target.files||[]).slice(0,6),i=document.getElementById("sv_images_preview");i.innerHTML="",_surveyImages=[],t.forEach(e=>{if(e.size>2097152)return void toast(`${e.name} skipped — max 2MB per photo`,"error");const t=new FileReader;t.onload=()=>{_surveyImages.push(t.result);const e=document.createElement("img");e.src=t.result,e.style.cssText="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)",i.appendChild(e)},t.readAsDataURL(e)})}async function saveSurvey(e){const t=e=>{const t=document.getElementById(e);return t?t.value.trim():""},i=t("sv_container").toUpperCase();if(i){const e=containerFormatIssue(i);if(e)return void toast(`Container number: ${e}`,"error")}const n=repairItemsFor("sv");try{const a=await window.bookingDocs.recordSurvey({bookingId:e,container:i,containerType:t("sv_ctype"),containerSize:t("sv_ctype"),shippingLineId:t("sv_line")||null,consignee:t("sv_consignee"),blNumber:t("sv_bl"),eirNumber:t("sv_eir"),isoCode:t("sv_iso"),mgwt:t("sv_mgwt")?parseFloat(t("sv_mgwt")):null,tareWeight:t("sv_tare")?parseFloat(t("sv_tare")):null,vessel:t("sv_vessel"),voyage:t("sv_voyage"),transporter:t("sv_transporter"),truckReg:t("sv_truck"),trailerNumber:t("sv_trailer"),driverName:t("sv_driver"),driverIdNumber:t("sv_driver_id"),clerkName:t("sv_clerk"),sealNumber:t("sv_seal"),gatePassNumber:t("sv_gatepass"),conditionStatus:t("sv_condition")||"full_grade",remarks:t("sv_remarks"),photos:_surveyImages,tariffItems:n}),o="heavily_damaged"===t("sv_condition");!o&&e&&a&&a.id&&await generateInterchangeFromSurvey(e,a.id),toast(o?"Survey saved — escalated for joint survey":"Survey saved",o?"warning":"success"),closeModal(),renderDepOpsAwaitingSurvey(),renderDepOpsAllocationQueue(),renderDepOpsStorageList(),"function"==typeof renderDepOpsEscalations&&renderDepOpsEscalations()}catch(e){toast(e.message||"Could not save survey","error")}}async function renderDepOpsAllocationQueue(){const e=document.getElementById("depopsAllocationList");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const[t,i]=await Promise.all([window.bookingDocs.surveyedAwaitingAllocation(),window.bookingDocs.listZones()]);if(!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">Nothing ready for allocation</div></div>');const n=await Promise.all(t.map(e=>window.bookingDocs.surveyForOccupant({bookingId:e.id})));n.forEach(e=>{e&&(_surveyLookupCache[e.id]=e)}),e.innerHTML=t.map((e,t)=>depOpsAllocationCard(e,i,n[t])).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}function depOpsAllocationCard(e,t,i){const n=resolveBookingShippingLineId(e),a=t.map(e=>{const t=Math.max((e.capacity_teu||0)-(e.occupied_teu||0),0),i=n&&e.shipping_line_id===n;return`<option value="${e.id}" ${i?"selected":""}>${sanitize(e.zone_code||e.zone_name)}${e.shipping_lines?" · "+sanitize(e.shipping_lines.code):""} (${t} TEU free)</option>`}).join(""),o=i&&i.interchange_generated_at&&i.interchange_id?`<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${i.interchange_id}')">⬇ Interchange</button>`:"",r=i?`<button class="modal-btn ghost" onclick="downloadInspectionReport('${i.id}')">⬇ Inspection Report</button>`:"";return`<div style="border:1px solid rgba(201,162,39,0.35);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--gold-dim)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong class="mono" style="color:var(--gold)">${sanitize(e.container)||"No container on file"}</strong>\n        <div style="font-size:11px;color:var(--text-3)">${sanitize(e.full_name)}${e.company?" · "+sanitize(e.company):""} · ${sanitize(e.cargo_type||"—")}</div>\n      </div>\n      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="sbadge s-approved">surveyed</span>${o}${r}</div>\n    </div>\n    <div style="margin-top:10px;font-size:11px;color:var(--text-3)">Allocate a storage slot below to record where this container sits in the yard.</div>\n    <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 90px 70px auto;gap:6px;align-items:end">\n      <div class="fg" style="margin:0"><label>Zone</label><select id="alloc-zone-${e.id}" onchange="depOpsAllocZoneChanged('${e.id}')"><option value="">Select…</option>${a}</select></div>\n      <div class="fg" style="margin:0"><label>Block</label><select id="alloc-block-${e.id}" onchange="depOpsAllocBlockChanged('${e.id}')"><option value="">Select zone first…</option></select></div>\n      <div class="fg" style="margin:0"><label>Slot</label><select id="alloc-slot-${e.id}"><option value="">—</option></select></div>\n      <div class="fg" style="margin:0"><label>TEU</label><input type="number" id="alloc-teu-${e.id}" min="1" value="1"></div>\n      <button class="action-btn" onclick="depOpsAllocateBookingToSlot('${e.id}')">Allocate</button>\n    </div>\n  </div>`}async function generateInterchangeFromSurvey(e,t){try{const{data:i}=await supabase.from("public_bookings").select("*").eq("id",e).single();if(!i)return void toast("Booking not found for this container","error");const n=await window.bookingDocs.surveyForOccupant({bookingId:e});if(!n)return void toast("No survey found for this container","error");if(n.interchange_generated_at)return;const a={full_grade:"Good",under_repair:"Needs Repair",damaged:"Damaged",heavily_damaged:"Damaged"},o=state.db.trucks.find(e=>(e.reg||"").toUpperCase()===(n.truck_reg||"").toUpperCase()),r=state.db.drivers.find(e=>(e.name||"").toLowerCase()===(n.driver_name||"").toLowerCase());let s="—";if("allocated"===i.storage_status)try{const e=(await window.bookingDocs.listZones()).find(e=>e.id===i.storage_zone_id);s=[e?e.zone_code||e.zone_name:null,i.storage_block_id?`Block ${i.storage_block_id}`:null,i.storage_slot_number?`Slot ${i.storage_slot_number}`:null].filter(Boolean).join(" · ")||"—"}catch(e){}const d={id:uid("IC"),container:(n.container||i&&i.container||"").toUpperCase(),type:"Depot-In",line:n.shipping_line_id||"",condition:a[n.condition_status]||"Good",truck:o?o.id:"",driver:r?r.id:"",ctype:n.container_type||"",vessel:n.vessel||"",voyage:n.voyage||"",blNumber:n.bl_number||"",eirNumber:n.eir_number||"",repairs:n.tariff_items&&n.tariff_items.length?n.tariff_items:n.tariff_code?[{category:n.tariff_category,code:n.tariff_code,side:n.tariff_side,item:n.tariff_item,hours:n.tariff_hours,material:n.tariff_material}]:[],repairTotal:repairItemsTotal(n.tariff_items&&n.tariff_items.length?n.tariff_items:n.tariff_code?[{hours:n.tariff_hours,material:n.tariff_material}]:[]),notes:sanitize(`Auto-generated from survey · Clerk: ${n.clerk_name||"—"} · Transporter: ${n.transporter||"—"}${!o&&n.truck_reg?" · Truck: "+n.truck_reg:""}${!r&&n.driver_name?" · Driver: "+n.driver_name:""} · Storage: ${s}`),date:(new Date).toISOString(),status:"pending",img:n.photos&&n.photos[0]||"",surveyId:n.id,bookingId:e||null,truckRegText:o?"":n.truck_reg||"",driverNameText:r?"":n.driver_name||"",_dirty:!0};state.db.interchange.push(d),scheduleSave(),buildBadges(),addAudit(state.profile.username,"Interchange Generated (from survey)",d.container),await window.bookingDocs.markInterchangeGenerated(t,d.id),toast(`Interchange generated for ${d.container} — awaiting admin approval to release payment`,"success",5e3),renderDepOpsStorageList(),"interchange"===state.currentSection&&renderInterchange("all")}catch(e){toast(e.message||"Could not generate interchange","error")}}async function depOpsAllocZoneChanged(e){const t=document.getElementById("alloc-zone-"+e),i=document.getElementById("alloc-block-"+e),n=document.getElementById("alloc-slot-"+e);if(!t||!i||!n)return;const a=t.value;if(n.innerHTML='<option value="">—</option>',a){i.innerHTML='<option value="">Loading…</option>';try{const e=await window.bookingDocs.listBlocks(a);if(!e.length)return void(i.innerHTML='<option value="">No blocks in this zone</option>');i.innerHTML='<option value="">Select…</option>'+e.map(e=>`<option value="${e.id}">${sanitize(e.block_code)} · ${sanitize(e.container_type)}</option>`).join("")}catch(e){i.innerHTML='<option value="">Error loading blocks</option>'}}else i.innerHTML='<option value="">Select zone first…</option>'}async function depOpsAllocBlockChanged(e){const t=document.getElementById("alloc-block-"+e),i=document.getElementById("alloc-slot-"+e);if(!t||!i)return;const n=t.value;if(n){i.innerHTML='<option value="">Loading…</option>';try{const e=(await window.bookingDocs.blockSlots(n)).filter(e=>!e.booking_id&&!e.trip_id&&!e.container);if(!e.length)return void(i.innerHTML='<option value="">No free slots</option>');i.innerHTML='<option value="">Select…</option>'+e.map(e=>`<option value="${e.slot_number}">Slot ${e.slot_number}</option>`).join("")}catch(e){i.innerHTML='<option value="">Error loading slots</option>'}}else i.innerHTML='<option value="">—</option>'}async function depOpsAllocateBookingToSlot(e){const t=(document.getElementById("alloc-zone-"+e)||{}).value,i=(document.getElementById("alloc-block-"+e)||{}).value,n=(document.getElementById("alloc-slot-"+e)||{}).value,a=parseInt((document.getElementById("alloc-teu-"+e)||{}).value,10);if(t)if(!a||a<1)toast("Enter a valid TEU amount","error");else try{const{data:o}=await supabase.from("public_bookings").select("container").eq("id",e).single(),r=await window.bookingDocs.surveyForOccupant({bookingId:e});await window.bookingDocs.allocateStorage(e,t,a,{blockId:i||null,slotNumber:n?parseInt(n,10):null,container:o?o.container:null,conditionStatus:r?r.condition_status:"full_grade"}),addAudit(state.profile.username,"Storage Allocated",o?o.container:e),toast("Storage allocated"+(o&&o.container?" for "+o.container:""),"success"),renderDepOpsAllocationQueue(),renderDepOpsZones(),renderDepOpsStorageList()}catch(e){toast(e.message||"Could not allocate storage","error")}else toast("Select a zone","error")}async function renderDepOpsEscalations(){const e=document.getElementById("depopsEscalationsList");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.escalatedBookings();if(!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">No containers awaiting joint survey</div></div>');const i=await Promise.all(t.map(e=>window.bookingDocs.surveyForOccupant({bookingId:e.id})));e.innerHTML=t.map((e,t)=>depOpsEscalationCard(e,i[t])).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}function depOpsEscalationCard(e,t){return`<div style="border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(239,68,68,0.06)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong class="mono" style="color:var(--red,#ef4444)">${sanitize(e.container)||"No container on file"}</strong>\n        <div style="font-size:11px;color:var(--text-3)">${sanitize(e.full_name)}${e.company?" · "+sanitize(e.company):""} · ${sanitize(e.cargo_type||"—")}</div>\n        ${t?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">First survey by ${sanitize(t.clerk_name||"—")} on ${fmtDate(t.surveyed_at)}${t.remarks?" — "+sanitize(t.remarks):""}</div>`:""}\n      </div>\n      <span class="sbadge s-rejected">heavily damaged</span>\n    </div>\n    <div style="margin-top:10px"><button class="modal-btn primary" onclick="openJointSurveyModal('${e.id}','${t?t.id:""}')">Record Joint Survey →</button></div>\n  </div>`}function openJointSurveyModal(e,t){t?openModal("Joint Survey",`\n    <div class="ops-notice" style="margin-bottom:12px">A second, independent surveyor must confirm the condition before this container can be accepted into storage or rejected.</div>\n    <div class="fg"><label>Joint Surveyor Name</label><input id="js_by" value="${sanitize(state.profile&&state.profile.name||"")}"></div>\n    <div class="fg"><label>Final Condition</label><select id="js_condition">\n      <option value="damaged">Damaged — accept into storage as damaged</option>\n      <option value="under_repair">Under Repair — accept, route to workshop</option>\n      <option value="full_grade">Full Grade — original finding overturned</option>\n    </select></div>\n    <div class="fg"><label>Joint Survey Notes</label><textarea id="js_notes" rows="3" placeholder="Findings, agreement/disagreement with first survey..."></textarea></div>\n    <div style="display:flex;gap:8px;margin-top:6px">\n      <button class="submit-btn" style="flex:1" onclick="saveJointSurvey('${e}','${t}', false)">Accept Into Storage →</button>\n      <button class="modal-btn danger" onclick="saveJointSurvey('${e}','${t}', true)">Reject Container</button>\n    </div>\n  `):toast("Original survey not found for this container","error")}async function saveJointSurvey(e,t,i){const n=document.getElementById("js_by").value.trim(),a=document.getElementById("js_notes").value.trim(),o=document.getElementById("js_condition").value;if(n){if(!i||confirm("Reject this container? It will be removed from the storage-allocation flow entirely."))try{await window.bookingDocs.recordJointSurvey({bookingId:e,surveyId:t,jointSurveyBy:n,jointSurveyNotes:a,finalConditionStatus:o,reject:i}),addAudit(state.profile.username,i?"Container Rejected (joint survey)":"Joint Survey Recorded",e),!i&&e&&t&&await generateInterchangeFromSurvey(e,t),toast(i?"Container rejected":"Joint survey recorded — interchange generated",i?"warning":"success"),closeModal(),renderDepOpsEscalations(),renderDepOpsAllocationQueue(),renderDepOpsStorageList()}catch(e){toast(e.message||"Could not save joint survey","error")}}else toast("Joint surveyor name is required","error")}async function renderDepOpsYardMap(){const e=document.getElementById("depopsYardMap");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.listZones();if(!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">No storage zones configured yet</div></div>');let i='<div class="ops-notice" style="margin-bottom:14px">\n      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>\n      Stacking heights follow KMA Regulatory Guidelines §6.2: 7-high for standard dry empty containers, 6-high for reefers, unless otherwise approved.\n    </div>';for(const e of t){const t=await window.bookingDocs.listBlocks(e.id);i+=`<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span class="panel-title">${sanitize(e.zone_code||"")} · ${sanitize(e.zone_name)}</span><span class="panel-meta">${e.shipping_lines?sanitize(e.shipping_lines.code):"Unassigned"}</span></div><div style="padding:12px 14px">`,t.length||(i+='<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone</div></div>');for(const e of t){const t=await window.bookingDocs.blockSlots(e.id),n=e.max_stack_height||window.bookingDocs.kmaMaxStackHeight(e.container_type),a=t.filter(e=>"empty"!==e.condition_status).length,o=a>t.length;i+=`<div style="margin-bottom:14px">\n          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">\n            <div style="font-size:12px;font-weight:600">Block ${sanitize(e.block_code)} · ${sanitize(e.container_type)}</div>\n            <div style="font-size:10.5px;color:var(--text-3)">${a}/${t.length} slots · max ${n}-high</div>\n          </div>\n          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:3px">\n            ${t.map(e=>`<div title="Slot ${e.slot_number}${e.container?" — "+sanitize(e.container):""} (${e.condition_status})" class="yard-slot yard-slot-${e.condition_status}"></div>`).join("")}\n          </div>\n          ${o?'<div style="font-size:10.5px;color:var(--red,#ef4444);margin-top:4px">⚠ Occupancy exceeds declared capacity — review against KMA §6.1 (85% max occupancy)</div>':""}\n        </div>`}i+="</div></div>"}i+='<div class="panel"><div class="panel-head"><span class="panel-title">Legend</span></div><div style="padding:10px 14px;display:flex;gap:14px;flex-wrap:wrap;font-size:11px">\n      <span><span class="yard-slot yard-slot-empty" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Empty</span>\n      <span><span class="yard-slot yard-slot-full_grade" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Full Grade</span>\n      <span><span class="yard-slot yard-slot-under_repair" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Under Repair</span>\n      <span><span class="yard-slot yard-slot-damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Damaged</span>\n      <span><span class="yard-slot yard-slot-heavily_damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Heavily Damaged</span>\n    </div></div>',e.innerHTML=i}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}let _surveyRegisterData=[],_surveyLookupCache={};async function renderDepOpsSurveyRegister(){const e=document.getElementById("depopsSurveyRegister");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{if(_surveyRegisterData=await window.bookingDocs.listAllSurveys(),_surveyRegisterData.forEach(e=>{_surveyLookupCache[e.id]=e}),!_surveyRegisterData.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">No surveys recorded yet</div></div>');e.innerHTML=`<div style="overflow-x:auto"><table class="tbl" id="surveyRegisterTable" style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Date</th><th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Type</th>\n        <th style="padding:6px 8px">Consignee</th><th style="padding:6px 8px">Transporter</th><th style="padding:6px 8px">Truck</th>\n        <th style="padding:6px 8px">Clerk</th><th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px">Inspection Report</th><th style="padding:6px 8px">Photos</th>\n      </tr></thead><tbody>${_surveyRegisterData.map(e=>`<tr style="border-top:1px solid var(--border)">\n        <td style="padding:6px 8px">${fmtDate(e.surveyed_at)}</td>\n        <td style="padding:6px 8px" class="mono">${sanitize(e.container||"—")}</td>\n        <td style="padding:6px 8px">${sanitize(e.container_type||"—")}</td>\n        <td style="padding:6px 8px">${sanitize(e.consignee||"—")}</td>\n        <td style="padding:6px 8px">${sanitize(e.transporter||"—")}</td>\n        <td style="padding:6px 8px">${sanitize(e.truck_reg||"—")}</td>\n        <td style="padding:6px 8px">${sanitize(e.clerk_name||"—")}</td>\n        <td style="padding:6px 8px">${sbadge("heavily_damaged"===e.condition_status?"rejected":"full_grade"===e.condition_status?"approved":"pending")} ${sanitize((e.condition_status||"").replace(/_/g," "))}</td>\n        <td style="padding:6px 8px">${e.interchange_generated_at?"✓ Generated"+(e.interchange_id?` <button class="tbl-btn" onclick="downloadInterchangeSlip('${e.interchange_id}')">⬇</button>`:""):"—"}</td>\n        <td style="padding:6px 8px"><button class="tbl-btn" onclick="downloadInspectionReport('${e.id}')">⬇ Report</button></td>\n        <td style="padding:6px 8px">${Array.isArray(e.photos)&&e.photos.length?`<button class="tbl-btn" onclick="viewSurveyPhotos('${e.id}')">📷 ${e.photos.length}</button>`:'<span style="color:var(--text-3);font-size:10.5px">—</span>'}</td>\n      </tr>`).join("")}</tbody></table></div>`}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}function viewSurveyPhotos(e){const t=_surveyRegisterData.find(t=>t.id===e);if(!t)return void toast("Survey not found","error");const i=Array.isArray(t.photos)?t.photos:[],n=i.length?`<div class="container-img-grid">${i.map(e=>`<div class="container-img-thumb view-only"><img src="${e}" onclick="window.open('${e}','_blank')" /></div>`).join("")}</div>`:'<div class="empty-state"><div class="empty-state-label">No photos on file for this survey</div></div>';openModal(`Survey Photos — ${sanitize(t.container||"Container")}`,`<div style="margin-bottom:10px;font-size:11px;color:var(--text-3)">Surveyed ${fmtDate(t.surveyed_at)} by ${sanitize(t.clerk_name||"—")}</div>${n}`)}function printSurveyRegister(){const e=document.getElementById("surveyRegisterTable");if(!e)return void toast("Nothing to print yet","error");const t=window.open("","_blank");t.document.write(`<html><head><title>Surveyed Containers</title><style>\n    body{font-family:Arial,sans-serif;padding:20px;color:#111}\n    table{width:100%;border-collapse:collapse;font-size:11px}\n    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}\n    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}\n    h2{margin-bottom:4px}\n  </style></head><body><h2>Gargo Haven Depot — Surveyed Containers</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${(new Date).toLocaleString("en-KE")}</div>${e.outerHTML}</body></html>`),t.document.close(),t.focus(),t.print()}function downloadSurveyRegisterCSV(){if(!_surveyRegisterData.length)return void toast("Nothing to download yet","error");const e=[["Date","Container","Type","ISO Code","Line ID","Consignee","Guarantee/B-L","Vessel","Voyage","Transporter","Vehicle No","Trailer No","Driver","Driver ID No","Surveyed By","Seal","Gate Pass","MGW","TW","Condition","Escalated","Interchange Generated","Photos"],..._surveyRegisterData.map(e=>[e.surveyed_at,e.container,e.container_type,e.iso_code,e.shipping_line_id,e.consignee,e.bl_number,e.vessel,e.voyage,e.transporter,e.truck_reg,e.trailer_number,e.driver_name,e.driver_id_number,e.clerk_name,e.seal_number,e.gate_pass_number,e.mgwt,e.tare_weight,e.condition_status,e.escalated?"Yes":"No",e.interchange_generated_at?"Yes":"No",Array.isArray(e.photos)?e.photos.length:0])].map(e=>e.map(e=>`"${String(null==e?"":e).replace(/"/g,'""')}"`).join(",")).join("\n"),t=new Blob([e],{type:"text/csv"}),i=document.createElement("a");i.href=URL.createObjectURL(t),i.download=`surveyed-containers-${(new Date).toISOString().slice(0,10)}.csv`,i.click(),URL.revokeObjectURL(i.href)}let _masterListFilter="all";function filterDepOpsMasterList(e,t){_masterListFilter=e,document.querySelectorAll("#depopsPanel-master .filter-btn").forEach(e=>e.classList.remove("active")),t&&t.classList.add("active"),renderDepOpsMasterList()}const MASTER_STATUS_LABELS={awaiting_survey:"Awaiting Survey",escalated:"Escalated (Joint Survey)",surveyed:"Surveyed",allocated:"In Storage",survey_rejected:"Rejected",dispatched:"Dispatched"};async function renderDepOpsMasterList(){const e=document.getElementById("depopsMasterList");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{let t=await window.bookingDocs.masterContainerList();if("all"!==_masterListFilter&&(t=t.filter(e=>e.booking.storage_status===_masterListFilter)),!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">No containers match this filter</div></div>');e.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">\n      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">\n        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Status</th>\n        <th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Location</th><th style="padding:6px 8px">Interchange</th>\n      </tr></thead><tbody>${t.map(e=>{const t=e.booking,i=e.survey,n=e.slot,a=n?`${n.depot_blocks?sanitize(n.depot_blocks.block_code):""} · Slot ${n.slot_number}`:t.storage_zone_id?"Zone assigned":"—";return`<tr style="border-top:1px solid var(--border)">\n          <td style="padding:6px 8px" class="mono">${sanitize(t.container||"—")}</td>\n          <td style="padding:6px 8px">${sanitize(t.full_name)}${t.company?" · "+sanitize(t.company):""}</td>\n          <td style="padding:6px 8px">${sbadge("escalated"===t.storage_status?"rejected":"surveyed"===t.storage_status||"allocated"===t.storage_status?"approved":"pending")} ${MASTER_STATUS_LABELS[t.storage_status]||sanitize(t.storage_status||"—")}</td>\n          <td style="padding:6px 8px">${i?sanitize((i.condition_status||"").replace(/_/g," ")):"—"}</td>\n          <td style="padding:6px 8px">${a}</td>\n          <td style="padding:6px 8px">${i&&i.interchange_generated_at?"✓"+(i.interchange_id?` <button class="tbl-btn" onclick="downloadInterchangeSlip('${i.interchange_id}')">⬇</button>`:""):"—"}</td>\n        </tr>`}).join("")}</tbody></table></div>`}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}let _depOpsRptRows=[];function depOpsReportsPopulateLines(){const e=document.getElementById("depopsRptLine");if(!e||e.dataset.populated)return;const t=document.createElement("option");t.value="__unmapped__",t.textContent="⚠ No Line Assigned",e.appendChild(t),state.db.shippingLines.forEach(t=>{const i=document.createElement("option");i.value=t.id,i.textContent=`${t.code} — ${t.name}`,e.appendChild(i)}),e.dataset.populated="1"}function depOpsReportsReset(){["depopsRptLine","depopsRptType","depopsRptStatus","depopsRptFrom","depopsRptTo"].forEach(e=>{const t=document.getElementById(e);t&&(t.value="")}),renderDepOpsReports()}function _tripToInterchangeReportRow(e){const t=isOutwardWorkType(e.workType);return{id:e.id,container:e.container,type:t?"Gate-Out":"Gate-In",ctype:e.ctype||"",line:e.shippingLine||"",condition:"",truck:e.truckId||"",driver:e.driverId||"",status:"completed"===e.status?"approved":"pending",repairTotal:0,date:t&&e.dateOut||e.startTime,notes:e.notes||"",_reportSource:"trips"}}async function renderDepOpsReports(){depOpsReportsPopulateLines();const e=document.getElementById("depopsRptLine")?.value||"",t=document.getElementById("depopsRptType")?.value||"",i=document.getElementById("depopsRptStatus")?.value||"",n=document.getElementById("depopsRptFrom")?.value||"",a=document.getElementById("depopsRptTo")?.value||"";let o=[...(state.db.interchange||[]).map(e=>({...e,_reportSource:"interchange"})),...(state.db.trips||[]).map(_tripToInterchangeReportRow)];"__unmapped__"===e?o=o.filter(e=>!e.line):e&&(o=o.filter(t=>t.line===e)),t&&(o=o.filter(e=>e.type===t)),i&&(o=o.filter(e=>e.status===i)),n&&(o=o.filter(e=>new Date(e.date)>=new Date(n))),a&&(o=o.filter(e=>new Date(e.date)<=new Date(a+"T23:59:59"))),o.sort((e,t)=>new Date(t.date)-new Date(e.date)),_depOpsRptRows=o;const r=document.getElementById("depopsRptBody"),s=document.getElementById("depopsRptMeta"),d=document.getElementById("depopsRptExportBtn"),l=(state.db.interchange||[]).filter(e=>!e.line).length+(state.db.trips||[]).filter(e=>!e.shippingLine).length;s&&(s.textContent=`${o.length} record${1===o.length?"":"s"}`+(l?` · ${l} total with no shipping line — <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold)">resolve them →</a>`:"")),d&&(d.disabled=!o.length),r&&(r.innerHTML=o.length?o.map(e=>`<tr>\n      <td class="mono">${fmtDate(e.date)}</td>\n      <td class="mono" style="color:var(--gold)">${sanitize(e.container||"—")}</td>\n      <td>${sanitize(e.type||"—")}</td>\n      <td>${sanitize(e.ctype||"—")}</td>\n      <td>${e.line?sanitize(lineName(e.line)):'<span style="color:var(--danger,#c0392b)">⚠ No Line</span>'}</td>\n      <td>${sanitize(e.condition||"—")}</td>\n      <td>${e.truck?sanitize(truckName(e.truck)):"—"}</td>\n      <td>${e.driver?sanitize(driverName(e.driver)):"—"}</td>\n      <td>${sbadge(e.status)}</td>\n      <td class="mono">${e.repairTotal?fmtKsh(e.repairTotal):"—"}</td>\n    </tr>`).join(""):'<tr><td colspan="10" class="empty-td">No interchange records match these filters</td></tr>');const c={};o.forEach(e=>{const t=e.line?lineName(e.line):"⚠ No Line Assigned";c[t]=(c[t]||0)+1});const p=o.reduce((e,t)=>e+(t.repairTotal||0),0),u=document.getElementById("depopsRptSummary");u&&(u.innerHTML=`<div class="two-col-grid">\n      <div class="report-block">\n        <h3>Summary</h3>\n        ${reportRow("Total Records",o.length)}\n        ${reportRow("Pending",o.filter(e=>"pending"===e.status).length)}\n        ${reportRow("Approved",o.filter(e=>"approved"===e.status).length)}\n        ${reportRow("Reconciled",o.filter(e=>"reconciled"===e.status).length)}\n        ${reportRow("Repair Costs Total",fmtKsh(p))}\n      </div>\n      <div class="report-block">\n        <h3>By Shipping Line</h3>\n        ${Object.entries(c).sort((e,t)=>t[1]-e[1]).slice(0,8).map(([e,t])=>reportRow(e,t)).join("")||'<div style="color:var(--text-3);font-size:12px">No data for these filters</div>'}\n      </div>\n    </div>`)}function downloadDepOpsReportCSV(){if(!_depOpsRptRows.length)return void toast("Nothing to download yet","error");const e=[["Date","Container","Movement","Type","Shipping Line","Condition","Truck","Driver","Status","Repair Cost"],..._depOpsRptRows.map(e=>[e.date,e.container,e.type,e.ctype,lineName(e.line),e.condition,e.truck?truckName(e.truck):"",e.driver?driverName(e.driver):"",e.status,e.repairTotal||0])].map(e=>e.map(e=>`"${String(null==e?"":e).replace(/"/g,'""')}"`).join(",")).join("\n"),t=new Blob([e],{type:"text/csv"}),i=document.createElement("a");i.href=URL.createObjectURL(t),i.download=`depops-interchange-report-${(new Date).toISOString().slice(0,10)}.csv`,i.click(),URL.revokeObjectURL(i.href)}async function renderDepOpsZoneAdmin(){const e=document.getElementById("depopsZoneAdmin");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.listZones(),i={};for(const e of t)i[e.id]=await window.bookingDocs.listBlocks(e.id);e.innerHTML=`\n      <div style="margin-bottom:14px"><button class="action-btn" onclick="showAddZoneModal()">+ Create Zone</button></div>\n      ${t.length?t.map(e=>depOpsZoneAdminCard(e,i[e.id]||[])).join(""):'<div class="empty-state"><div class="empty-state-label">No zones yet — create one above</div></div>'}\n    `}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}function depOpsZoneAdminCard(e,t){const i=e.capacity_teu||0,n=e.occupied_teu||0,a=e.shipping_lines?`${sanitize(e.shipping_lines.code)} — ${sanitize(e.shipping_lines.name)}`:"Unassigned";return`<div class="panel" style="margin-bottom:14px">\n    <div class="panel-head">\n      <span class="panel-title">${sanitize(e.zone_code||"")} · ${sanitize(e.zone_name)}</span>\n      <span style="display:flex;gap:8px;align-items:center">\n        <span class="panel-meta">${a} · ${n}/${i} TEU</span>\n        <button class="modal-btn ghost" onclick="showEditZoneModal('${e.id}')">Edit</button>\n      </span>\n    </div>\n    <div style="padding:12px 14px">\n      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">\n        <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase">Blocks</div>\n        <button class="modal-btn ghost" onclick="showAddBlockModal('${e.id}','${sanitize(e.zone_name).replace(/'/g,"\\'")}')">+ Add Block</button>\n      </div>\n      ${t.length?t.map(e=>depOpsBlockRow(e)).join(""):'<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone yet</div></div>'}\n    </div>\n  </div>`}function depOpsBlockRow(e){return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border)">\n    <div>\n      <strong style="font-size:12.5px">${sanitize(e.block_code)}</strong>\n      <span style="font-size:11px;color:var(--text-3)"> · ${sanitize(e.container_type)} · ${e.capacity_slots} slots</span>\n    </div>\n    <button class="modal-btn ghost" onclick="showBlockSlotsModal('${e.id}')">View Slots →</button>\n  </div>`}function showAddZoneModal(){openModal("Create Storage Zone",`\n    <div class="form-row-2">\n      <div class="fg"><label>Zone Code</label><input id="zn_code" placeholder="A" maxlength="8"></div>\n      <div class="fg"><label>Zone Name</label><input id="zn_name" placeholder="Zone A"></div>\n    </div>\n    <div class="fg"><label>Shipping Line</label><select id="zn_line"><option value="">Unassigned / shared</option>${state.db.shippingLines.filter(e=>e.active).map(e=>`<option value="${e.id}">${sanitize(e.code)} — ${sanitize(e.name)}</option>`).join("")}</select></div>\n    <div class="fg"><label>Capacity (TEU)</label><input id="zn_cap" type="number" min="0" placeholder="100"></div>\n    <div class="fg"><label>Notes</label><input id="zn_notes" placeholder="Optional"></div>\n    <button class="submit-btn" onclick="saveZone()">Create Zone →</button>\n  `)}async function saveZone(){const e=document.getElementById("zn_code").value.trim(),t=document.getElementById("zn_name").value.trim(),i=document.getElementById("zn_line").value||null,n=document.getElementById("zn_cap").value,a=document.getElementById("zn_notes").value.trim();if(e&&t)try{await window.bookingDocs.createZone({zoneCode:e,zoneName:t,shippingLineId:i,capacityTeu:n,notes:a}),toast(`Zone ${e} created`,"success"),closeModal(),renderDepOpsZoneAdmin(),renderDepOpsZones()}catch(e){toast(e.message||"Could not create zone","error")}else toast("Zone code and name are required","error")}async function showEditZoneModal(e){try{const t=(await window.bookingDocs.listZones()).find(t=>t.id===e);if(!t)return void toast("Zone not found","error");const i=state.db.shippingLines.filter(e=>e.active).map(e=>`<option value="${e.id}" ${t.shipping_line_id===e.id?"selected":""}>${sanitize(e.code)} — ${sanitize(e.name)}</option>`).join("");openModal(`Edit Zone — ${sanitize(t.zone_code||t.zone_name)}`,`\n      <div class="form-row-2">\n        <div class="fg"><label>Zone Code</label><input id="zn_edit_code" value="${sanitize(t.zone_code||"")}" maxlength="8"></div>\n        <div class="fg"><label>Zone Name</label><input id="zn_edit_name" value="${sanitize(t.zone_name)}"></div>\n      </div>\n      <div class="fg"><label>Shipping Line</label><select id="zn_edit_line"><option value="">Unassigned / shared</option>${i}</select></div>\n      <div class="fg"><label>Capacity (TEU)</label><input id="zn_edit_cap" type="number" min="0" value="${t.capacity_teu||0}"></div>\n      <button class="submit-btn" onclick="saveZoneEdit('${e}')">Save Changes →</button>\n    `)}catch(e){toast(e.message||"Could not load zone","error")}}async function saveZoneEdit(e){const t=document.getElementById("zn_edit_code").value.trim(),i=document.getElementById("zn_edit_name").value.trim(),n=document.getElementById("zn_edit_line").value||null,a=parseInt(document.getElementById("zn_edit_cap").value,10)||0;if(t&&i)try{await window.bookingDocs.updateZone(e,{zone_code:t.toUpperCase(),zone_name:i,shipping_line_id:n,capacity_teu:a}),toast("Zone updated","success"),closeModal(),renderDepOpsZoneAdmin(),renderDepOpsZones()}catch(e){toast(e.message||"Could not update zone","error")}else toast("Zone code and name are required","error")}function showAddBlockModal(e,t){const i=["Any",...CONTAINER_TYPE_OPTIONS].map(e=>`<option>${e}</option>`).join("");openModal(`Add Block — ${sanitize(t)}`,`\n    <div class="form-row-2">\n      <div class="fg"><label>Block Code</label><input id="bl_code" placeholder="1"></div>\n      <div class="fg"><label>Container Type</label><select id="bl_ctype">${i}</select></div>\n    </div>\n    <div class="fg"><label>Capacity (number of slots)</label><input id="bl_cap" type="number" min="1" value="20"></div>\n    <div class="fg"><label>Notes</label><input id="bl_notes" placeholder="Optional"></div>\n    <button class="submit-btn" onclick="saveBlock('${e}')">Create Block →</button>\n  `)}async function saveBlock(e){const t=document.getElementById("bl_code").value.trim(),i=document.getElementById("bl_ctype").value,n=document.getElementById("bl_cap").value,a=document.getElementById("bl_notes").value.trim();if(t)try{await window.bookingDocs.createBlock({zoneId:e,blockCode:t,containerType:i,capacitySlots:n,notes:a}),toast(`Block ${t} created`,"success"),closeModal(),renderDepOpsZoneAdmin()}catch(e){toast(e.message||"Could not create block","error")}else toast("Block code is required","error")}async function showBlockSlotsModal(e){openModal("Block Slots",'<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');try{const t=await window.bookingDocs.blockSlots(e);openModal("Block Slots",`\n      <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">Click an empty slot to manually place a container. Slots linked to a booking/trip release automatically through Outward / Repatriation.</div>\n      <div class="slot-grid">${t.map(t=>{const i=!(!t.booking_id&&!t.trip_id),n=!i&&!!t.container,a=i||n,o=a?"under_repair"===t.condition_status?"var(--red)":"damaged"===t.condition_status?"#b45309":"var(--green)":"var(--border-mid)",r=a?sanitize(t.container||"•"):t.slot_number;let s;s=n?`releaseSlotFromGrid('${e}',${t.slot_number})`:i?"toast('Linked to a booking/trip — release it from Outward / Repatriation instead', 'info', 5000)":`manualAssignSlot('${e}',${t.slot_number})`;const d=a?n?(t.condition_status||"")+" · click to release":(t.condition_status||"")+" · linked booking/trip":"empty · click to assign";return`<div class="slot-cell" style="border-color:${o};color:${a?"#fff":"var(--text-3)"};background:${a?o:"transparent"}" title="Slot ${t.slot_number} · ${d}" onclick="${s}">${r}</div>`}).join("")||'<div class="empty-state"><div class="empty-state-label">No slots</div></div>'}</div>\n    `)}catch(e){openModal("Block Slots",`<div class="empty-state">Error: ${sanitize(e.message||"")}</div>`)}}function manualAssignSlot(e,t){openModal(`Assign Slot ${t}`,`\n    <div class="fg"><label>Container No.</label><input id="ms_container" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>\n    <div class="fg"><label>Condition</label><select id="ms_condition"><option value="full_grade">Full Grade</option><option value="under_repair">Under Repair</option><option value="damaged">Damaged</option></select></div>\n    <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Use this for containers already on-site with no matching booking — e.g. after a physical stock-take. Containers coming through Public Bookings should go through Survey/Allocation above instead, so their paperwork stays linked.</div>\n    <button class="submit-btn" onclick="saveManualAssignSlot('${e}',${t})">Assign →</button>\n  `)}async function saveManualAssignSlot(e,t){const i=document.getElementById("ms_container").value.trim().toUpperCase(),n=document.getElementById("ms_condition").value,a=containerFormatIssue(i);if(a)toast(`Container number: ${a}`,"error");else try{await window.bookingDocs.occupySlot({blockId:e,slotNumber:t,container:i,conditionStatus:n}),toast(`${i} placed in slot ${t}`,"success"),showBlockSlotsModal(e),renderDepOpsZoneAdmin()}catch(e){toast(e.message||"Could not assign slot","error")}}async function releaseSlotFromGrid(e,t){if(confirm(`Release slot ${t}?`))try{await window.bookingDocs.releaseSlotByNumber(e,t),toast("Slot released","success"),showBlockSlotsModal(e),renderDepOpsZoneAdmin()}catch(e){toast(e.message||"Could not release slot","error")}}function filterDepOpsOutward(e,t){_depOpsOutwardFilter=e,document.querySelectorAll("#depopsPanel-outward .filter-btn").forEach(e=>e.classList.remove("active")),t.classList.add("active"),renderDepOpsOutward()}async function renderDepOpsOutward(){await renderDepOpsEligible(),await renderDepOpsOutwardTrips();const e=document.getElementById("depopsOutwardQueue");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.outwardReviewQueue(_depOpsOutwardFilter);if(!t.length)return void(e.innerHTML=`<div class="empty-state"><div class="empty-state-label">No ${_depOpsOutwardFilter.replace(/_/g," ")} release orders</div></div>`);e.innerHTML=t.map(e=>depOpsDocCard(e,"outward")).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}async function depOpsRepatriationEligibleBookings(){const{data:e,error:t}=await supabase.from("public_bookings").select("*").eq("status","imported").eq("storage_status","allocated").order("created_at",{ascending:!0});if(t)throw new Error(t.message||"Could not load bookings");const i=new Set(state.db.trips.filter(e=>"Depot → Port"===e.workType&&e.bookingId).map(e=>e.bookingId));return(e||[]).filter(e=>!i.has(e.id))}async function renderDepOpsEligible(){const e=document.getElementById("depopsEligibleList");if(e){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const[t,i]=await Promise.all([depOpsRepatriationEligibleBookings(),window.bookingDocs.storageAvailability()]);if(!t.length)return void(e.innerHTML='<div class="empty-state"><div class="empty-state-label">No depot-held containers awaiting repatriation</div></div>');const n={};i.forEach(e=>{n[e.id]=e.zone_name}),e.innerHTML=t.map(e=>depOpsEligibleCard(e,n)).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}}function depOpsEligibleCard(e,t){const i=e.storage_zone_id&&t[e.storage_zone_id]||"Unknown zone",n=window.bookingDocs.PORT_LOCATIONS.map(e=>`<option value="${sanitize(e)}">${sanitize(e)}</option>`).join(""),a=OUTWARD_TYPES.map(e=>`<option value="${sanitize(e)}">${sanitize(e)}</option>`).join("");return`<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">\n    <div><strong>${sanitize(e.container)||"No container on file"}</strong> <span style="font-size:11px;color:var(--text-3)">· ${sanitize(e.full_name)}${e.company?" · "+sanitize(e.company):""}</span></div>\n    <div style="font-size:10.5px;color:var(--text-3);margin-top:2px">Booking ${e.id.slice(0,8)} · Currently in ${sanitize(i)}</div>\n    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:end">\n      <input type="number" id="depopsRelTeu-${e.id}" min="1" value="1" title="TEU to release from ${sanitize(i)} once this container departs" style="width:64px;padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">\n      <select id="depopsDest-${e.id}" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">${n}</select>\n      <select id="depopsOutwardType-${e.id}" title="Outward type" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="">Outward type…</option>${a}</select>\n      <button class="modal-btn primary" onclick="depOpsCreateOutwardFromBooking('${e.id}')">Create Outward Trip →</button>\n    </div>\n  </div>`}async function depOpsCreateOutwardFromBooking(e){const t=document.getElementById("depopsRelTeu-"+e),i=document.getElementById("depopsDest-"+e),n=document.getElementById("depopsOutwardType-"+e),a=t?parseInt(t.value,10):0,o=i?i.value:"",r=n?n.value:"";if(!a||a<1)return void toast("Enter a valid TEU amount","error");if(!OUTWARD_TYPES.includes(r))return void toast("Select an outward type — Repatriation to Port, Shippers/Export, or Sale units","error");const{data:s,error:d}=await supabase.from("public_bookings").select("*").eq("id",e).single();if(d||!s)return void toast("Booking not found","error");if(!s.storage_zone_id)return void toast("This booking has no recorded storage zone","error");const l=(s.container||"").trim().toUpperCase()||`REPAT-${s.id.slice(0,8)}`,c=findLiveTripByContainer(l);if(c)return void toast(`${l} is already on an active trip (${c.origin} → ${c.dest})`,"error");const p={id:uid("TRIP"),container:l,ctype:s.cargo_type||"20ft Dry",workType:"Depot → Port",outwardType:r,origin:"Depot",dest:o,shippingLine:resolveBookingShippingLineId(s),status:"active",startTime:(new Date).toISOString(),eta:new Date(Date.now()+144e5).toISOString(),distance:0,priority:"Normal",notes:`Repatriation for booking #${s.id}`,ref:`REPAT-${s.id.slice(0,8)}`,truckId:null,driverId:null,containerImages:[],bookingId:s.id,storageZoneId:s.storage_zone_id,storageTeu:a,storageReleased:!1};state.db.trips.push(p),scheduleSave(),toast("Outward trip created — upload the release order next","success"),renderDepOpsOutward(),renderDepOpsStorageList(),refreshAwaitingDispatchUI()}async function depOpsCreateManualOutward(){const e=document.getElementById("depopsManualContainer"),t=document.getElementById("depopsManualZone"),i=document.getElementById("depopsManualTeu"),n=document.getElementById("depopsManualDest"),a=document.getElementById("depopsManualLine"),o=document.getElementById("depopsManualOutwardType"),r=(e.value||"").trim().toUpperCase(),s=t.value,d=parseInt(i.value,10),l=n.value,c=a?a.value:"",p=o?o.value:"",u=containerFormatIssue(r);if(u)return void toast(`Container number: ${u}`,"error");if(!s)return void toast("Select a zone","error");if(!d||d<1)return void toast("Enter a valid TEU amount","error");if(!c)return void toast("Select the shipping line — without it this container won’t show up under any line’s account","error");if(!OUTWARD_TYPES.includes(p))return void toast("Select an outward type — Repatriation to Port, Shippers/Export, or Sale units","error");const m=findLiveTripByContainer(r);if(m)return void toast(`${r} is already on an active trip (${m.origin} → ${m.dest})`,"error");const v={id:uid("TRIP"),container:r,ctype:"20ft Dry",workType:"Depot → Port",outwardType:p,origin:"Depot",dest:l,shippingLine:c,status:"active",startTime:(new Date).toISOString(),eta:new Date(Date.now()+144e5).toISOString(),distance:0,priority:"Normal",notes:"Manually added repatriation container (no originating booking)",ref:`REPAT-${r}`,truckId:null,driverId:null,containerImages:[],bookingId:null,storageZoneId:s,storageTeu:d,storageReleased:!1};state.db.trips.push(v),scheduleSave(),toast("Outward trip created — upload the release order next","success"),e.value="",a&&(a.value=""),renderDepOpsOutward(),refreshAwaitingDispatchUI()}async function renderDepOpsOutwardTrips(){const e=document.getElementById("depopsOutwardTripsList"),t=document.getElementById("depopsManualForm");if(t&&!t.dataset.loaded)try{const e=(await window.bookingDocs.storageAvailability()).map(e=>`<option value="${e.id}">${sanitize(e.zone_name)}</option>`).join(""),i=window.bookingDocs.PORT_LOCATIONS.map(e=>`<option value="${sanitize(e)}">${sanitize(e)}</option>`).join(""),n=state.db.shippingLines.filter(e=>e.active).map(e=>`<option value="${e.id}">${sanitize(e.code)} — ${sanitize(e.name)}</option>`).join(""),a=OUTWARD_TYPES.map(e=>`<option value="${sanitize(e)}">${sanitize(e)}</option>`).join("");t.innerHTML=`<div class="panel" style="margin-bottom:14px">\n        <div class="panel-head"><span class="panel-title">Add Outward Container Manually</span></div>\n        <div style="padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;align-items:end">\n          <div class="fg" style="margin:0"><label>Container No.</label><input id="depopsManualContainer" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>\n          <div class="fg" style="margin:0"><label>Zone</label><select id="depopsManualZone"><option value="">Select…</option>${e}</select></div>\n          <div class="fg" style="margin:0"><label>TEU</label><input type="number" id="depopsManualTeu" min="1" value="1"></div>\n          <div class="fg" style="margin:0"><label>Destination</label><select id="depopsManualDest">${i}</select></div>\n          <div class="fg" style="margin:0"><label>Shipping Line</label><select id="depopsManualLine"><option value="">Select…</option>${n}</select></div>\n          <div class="fg" style="margin:0"><label>Outward Type</label><select id="depopsManualOutwardType"><option value="">Select…</option>${a}</select></div>\n          <button class="modal-btn primary" onclick="depOpsCreateManualOutward()">Create →</button>\n        </div>\n      </div>`,t.dataset.loaded="1"}catch(e){}if(!e)return;const i=state.db.trips.filter(e=>"Depot → Port"===e.workType);if(i.length){e.innerHTML='<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';try{const t=await window.bookingDocs.documentsForTrips(i.map(e=>e.id));e.innerHTML=i.map(e=>depOpsOutwardTripCard(e,t[e.id]||[])).join("")}catch(t){e.innerHTML=`<div class="empty-state">Error: ${sanitize(t.message||"")}</div>`}}else e.innerHTML='<div class="empty-state"><div class="empty-state-label">No outward/repatriation trips yet</div></div>'}function depOpsOutwardTripCard(e,t){const i=t.find(e=>"release_order"===e.doc_type),n=i?docStatusBadge(i.status):`<button class="modal-btn primary" onclick="depOpsUploadReleaseOrder('${e.id}','${sanitize(e.container)}')">Upload Release Order</button>`,a=e.storageZoneId?e.storageReleased?'<span class="sbadge s-approved">storage released</span>':`<span class="sbadge s-pending">${e.storageTeu||"?"} TEU pending release</span>`:"",o=e.outwardType?`<span style="font-size:10px;padding:2px 8px;border-radius:20px;border:1px solid var(--gold-border);color:var(--gold);background:var(--gold-dim)">${sanitize(e.outwardType)}</span>`:"";return`<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong class="mono" style="color:var(--gold)">${sanitize(e.container)}</strong>\n        <div style="font-size:11px;color:var(--text-3)">${sanitize(e.origin)} → ${sanitize(e.dest)}</div>\n        <div style="font-size:10px;color:var(--text-3)">${sanitize(e.ref)}</div>\n      </div>\n      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">\n        ${sbadge(e.status)}\n        ${o}\n        ${a}\n      </div>\n    </div>\n    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">\n      ${n}\n      <button class="modal-btn ghost" onclick="showTripDetail('${e.id}')">View / Manage Trip</button>\n    </div>\n  </div>`}function depOpsUploadReleaseOrder(e,t){openModal("Upload Release Order",`\n    <div class="fg"><label>Container</label><input value="${sanitize(t)}" disabled></div>\n    <div class="fg"><label>Release Order File</label><input type="file" id="depopsReleaseFile" accept=".pdf,.jpg,.jpeg,.png"></div>\n    <div id="depopsUploadMsg" style="font-size:12px;min-height:16px;margin-bottom:8px"></div>\n    <button class="submit-btn" onclick="depOpsConfirmUploadReleaseOrder('${e}','${sanitize(t).replace(/'/g,"\\'")}')">Upload</button>\n  `)}async function depOpsConfirmUploadReleaseOrder(e,t){const i=document.getElementById("depopsReleaseFile"),n=document.getElementById("depopsUploadMsg"),a=i&&i.files&&i.files[0];if(!a)return n.textContent="Select a file first.",void(n.style.color="var(--red)");n.textContent="Uploading…",n.style.color="var(--text-3)";try{await window.bookingDocs.uploadTripDocument({tripId:e,docType:"release_order",containerNo:t,file:a}),n.textContent="✓ Uploaded",n.style.color="var(--green)",setTimeout(()=>{closeModal(),renderDepOpsOutward()},600)}catch(e){n.textContent=e.message||"Upload failed",n.style.color="var(--red)"}}function depOpsDocCard(e,t){const i="inbound"===t?e.public_bookings||{}:e.trips||{},n="inbound"===t?i.full_name?i.full_name:(e.booking_id||"").slice(0,8):i.container||(e.trip_id||"").slice(0,8),a="inbound"===t?[i.company,i.service_type].filter(Boolean).join(" · ")||"Public booking":`${sanitize(i.origin||"")} → ${sanitize(i.destination||"")}`,o=DEPOPS_DOC_LABELS[e.doc_type]||e.doc_type,r=e.status||"pending_review",s="pending_review"===r,d=s?`<button class="modal-btn ghost" onclick="depOpsViewDoc('${e.file_path.replace(/'/g,"\\'")}')">View / Download</button>\n       <button class="modal-btn primary" onclick="depOpsVerifyDoc('${e.id}','${t}')">Verify</button>\n       <button class="modal-btn danger" onclick="depOpsRejectDoc('${e.id}','${t}')">Reject…</button>`:`<button class="modal-btn ghost" onclick="depOpsViewDoc('${e.file_path.replace(/'/g,"\\'")}')">View / Download</button>`;return`<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)" id="depopsDoc-${e.id}">\n    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">\n      <div>\n        <strong>${sanitize(String(n))}</strong>\n        <div style="font-size:11px;color:var(--text-3)">${a}</div>\n        <div style="font-size:10px;color:var(--text-3)">${e.container_no?"Container: "+sanitize(e.container_no)+" · ":""}Uploaded ${depOpsFmtDT(e.uploaded_at)}</div>\n      </div>\n      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">\n        <span style="font-size:10.5px;padding:3px 9px;border-radius:20px;background:rgba(201,162,39,0.12);color:var(--gold);border:1px solid var(--gold-border);white-space:nowrap">${sanitize(o)}</span>\n        ${s?"":docStatusBadge(r)}\n      </div>\n    </div>\n    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${d}</div>\n    ${!s&&e.review_notes?`<div style="margin-top:8px;font-size:11px;color:var(--text-3)">${depOpsFmtDT(e.reviewed_at)} — ${sanitize(e.review_notes)}</div>`:""}\n  </div>`}function depOpsViewDoc(e){window.bookingDocs.getDownloadUrl(e,300).then(e=>window.open(e,"_blank","noopener")).catch(e=>toast(e.message||"Could not open document","error"))}async function depOpsVerifyDoc(e,t){try{await window.bookingDocs.verifyDocument(e,null),toast("Document verified","success"),"inbound"===t?renderDepOpsInbound():renderDepOpsOutward(),updateDepOpsBadge()}catch(e){toast(e.message||"Could not verify document","error")}}function depOpsRejectDoc(e,t){openModal("Reject Document",`\n    <div class="fg"><label>Reason (required — shown to the uploader)</label>\n    <textarea id="depopsRejectNote" rows="3" placeholder="e.g. Scan is illegible, wrong container number…"></textarea></div>\n    <button class="submit-btn" onclick="depOpsConfirmReject('${e}','${t}')">Confirm Reject</button>\n  `)}async function depOpsConfirmReject(e,t){const i=document.getElementById("depopsRejectNote"),n=(i&&i.value||"").trim();if(n)try{await window.bookingDocs.rejectDocument(e,n),closeModal(),toast("Document rejected","warning"),"inbound"===t?renderDepOpsInbound():renderDepOpsOutward(),updateDepOpsBadge()}catch(e){toast(e.message||"Could not reject document","error")}else toast("A reason is required","error")}
//# sourceMappingURL=script.js.map
=======
'use strict';

const IDLE_TIMEOUT  = 15 * 60 * 1000;

const SUPABASE_URL = 'https://okisjizcyidvvwdwehaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9raXNqaXpjeWlkdnZ3ZHdlaGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTYzNjMsImV4cCI6MjA5ODM5MjM2M30.O_0EeK297a07B7FLunpWr6HDlqrfP5Z8Owyp3qE4hQE';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.ghSupabase = supabase;

let state = {
  currentUser       : null,
  profile           : null,
  currentSection    : 'dashboard',
  currentAdminSection: null,
  alertsOpen        : false,
  db                : null,
  pendingFinanceAction: null,
  idleTimer         : null,
  lastActivity      : Date.now(),
  sessionTimeout    : null,
  _saveDebounce     : null,

  
  geoWatchId        : null,   
  trackingActive    : false,  
  geoPermission     : 'unknown', 
  lastGeoSend       : 0,   
  trackingMap       : null,   
  truckMarkers      : {},     
  _gmapsLoading     : false,
  _gmapsCallbacks   : [],
  _trackingChannel  : null,   
  _liveSyncChannel  : null,   
  geofenceExpanded  : new Set(),
};


/* ══ THEME (light / dark) ══ */
function applyTheme(mode) {
  var root = document.documentElement;
  var isLight = mode === 'light';
  if (isLight) root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isLight ? '#FBF6E9' : '#06080F');

  var sun = document.querySelector('#themeBtn .theme-icon-sun');
  var moon = document.querySelector('#themeBtn .theme-icon-moon');
  if (sun && moon) {
    sun.style.display = isLight ? 'none' : '';
    moon.style.display = isLight ? '' : 'none';
  }
  var btn = document.getElementById('themeBtn');
  if (btn) btn.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var next = current === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('gargo-theme', next); } catch(e) {}
  applyTheme(next);
}

function initTheme() {
  var saved = 'dark';
  try { saved = localStorage.getItem('gargo-theme') === 'light' ? 'light' : 'dark'; } catch(e) {}
  applyTheme(saved);
}

document.addEventListener('DOMContentLoaded', initTheme);

/* ══ SCROLL-TO-TOP NAVIGATION ══ */
function scrollToTop() {
  var content = document.querySelector('.content');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  var dpBody = document.getElementById('dp_body');
  if (dpBody) dpBody.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initScrollToTop() {
  var btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  var threshold = 360;
  var scrollTargets = [document.querySelector('.content'), document.getElementById('dp_body'), window].filter(Boolean);

  function currentScrollY() {
    var max = 0;
    scrollTargets.forEach(function(el) {
      var y = el === window ? (window.scrollY || document.documentElement.scrollTop || 0) : el.scrollTop;
      if (y > max) max = y;
    });
    return max;
  }

  function checkScroll() {
    if (currentScrollY() > threshold) btn.classList.add('visible');
    else btn.classList.remove('visible');
  }

  scrollTargets.forEach(function(el) {
    el.addEventListener('scroll', checkScroll, { passive: true });
  });
  checkScroll();
}

document.addEventListener('DOMContentLoaded', initScrollToTop);

function defaultBillingRates() {
  return {
    '20ft Dry': { base:0, perKm:0 },
    '40ft Dry': { base:0, perKm:0 },
    '40ft HC': { base:0, perKm:0 },
    '20ft Reefer': { base:0, perKm:0 },
    '40ft Reefer': { base:0, perKm:0 },
    'Flat Rack': { base:0, perKm:0 },
    'Open Top': { base:0, perKm:0 },
    'Tank': { base:0, perKm:0 },
    'Hazmat': { base:0, perKm:0 },
  };
}




function truckToRow(t)  { return { id:t.id, reg:t.reg, make:t.make, type:t.type, year:t.year, colour:t.colour, status:t.status, fuel_pct:Math.round(t.fuelPct), mileage:t.mileage, last_service:t.lastService, next_service:t.nextService, notes:t.notes, licence_plate:t.licencePlate, vin:t.vin, img:t.img||'', wialon_unit_id:t.wialonUnitId||null }; }
function truckFromRow(r){ return { id:r.id, reg:r.reg, make:r.make, type:r.type, year:r.year, colour:r.colour, status:r.status, fuelPct:r.fuel_pct, mileage:r.mileage, driver:null, lastService:r.last_service, nextService:r.next_service, notes:r.notes||'', img:r.img||'', licencePlate:r.licence_plate, vin:r.vin||'', wialonUnitId:r.wialon_unit_id||'' }; }

function driverToRow(d)  { return { id:d.id, name:d.name, phone:d.phone, licence:d.licence, licence_exp:d.licenceExp, status:d.status, truck_id:d.truckId||null, trips_today:d.tripsToday, current_load:d.load, location:d.location, id_no:d.idNo, rating:d.rating, profile_id:d.profileId||null }; }
function driverFromRow(r){ return { id:r.id, name:r.name, phone:r.phone, licence:r.licence, licenceExp:r.licence_exp, status:r.status, truckId:r.truck_id, tripsToday:r.trips_today, load:r.current_load, location:r.location, idNo:r.id_no, rating:r.rating, profileId:r.profile_id||null }; }

function tripToRow(t)  { return { id:t.id, truck_id:t.truckId||null, driver_id:t.driverId||null, container:t.container, container_type:t.ctype, work_type:t.workType, outward_type:t.outwardType||null, origin:t.origin, destination:t.dest, shipping_line_id:t.shippingLine||null, status:t.status, start_time:t.startTime, eta:t.eta, distance:t.distance, priority:t.priority, notes:t.notes, reference:t.ref, container_images:JSON.stringify(t.containerImages||[]), booking_id:t.bookingId||null, storage_zone_id:t.storageZoneId||null, storage_teu:t.storageTeu||null, storage_released:!!t.storageReleased, eir_number:t.eirNumber||null, receiving_party:t.receivingParty||null, release_order_no:t.releaseOrderNo||null, vessel:t.vessel||null, voyage:t.voyage||null, date_out:t.dateOut||null, flagged_for_review:!!t.flaggedForReview, flag_reasons:JSON.stringify(t.flagReasons||[]), duplicate_of_id:t.duplicateOfId||null, import_batch_id:t.importBatchId||null }; }
function tripFromRow(r){ let imgs=[]; try{ imgs = r.container_images ? JSON.parse(r.container_images) : []; }catch(e){ imgs=[]; } let flagReasons=[]; try{ flagReasons = r.flag_reasons ? (typeof r.flag_reasons==='string' ? JSON.parse(r.flag_reasons) : r.flag_reasons) : []; }catch(e){ flagReasons=[]; } return { id:r.id, truckId:r.truck_id, driverId:r.driver_id, container:r.container, ctype:r.container_type, workType:r.work_type, outwardType:r.outward_type||null, origin:r.origin, dest:r.destination, shippingLine:r.shipping_line_id, status:r.status, startTime:r.start_time, eta:r.eta, distance:r.distance, priority:r.priority, notes:r.notes, ref:r.reference, containerImages:imgs, bookingId:r.booking_id||null, storageZoneId:r.storage_zone_id||null, storageTeu:r.storage_teu||null, storageReleased:!!r.storage_released, eirNumber:r.eir_number||'', receivingParty:r.receiving_party||'', releaseOrderNo:r.release_order_no||'', vessel:r.vessel||'', voyage:r.voyage||'', dateOut:r.date_out||null, flaggedForReview:!!r.flagged_for_review, flagReasons, duplicateOfId:r.duplicate_of_id||null, importBatchId:r.import_batch_id||null }; }


const OUTWARD_TYPES = ['Repatriation to Port', 'Shippers/Export', 'Sale units'];
function isOutwardWorkType(workType) { return workType === 'Depot → Port'; }

function maintToRow(m)  { return { id:m.id, truck_id:m.truckId||null, type:m.type, description:m.desc, priority:m.priority, status:m.status, date:m.date, cost:m.cost, technician:m.tech, resolved_date:m.resolvedDate }; }
function maintFromRow(r){ return { id:r.id, truckId:r.truck_id, type:r.type, desc:r.description, priority:r.priority, status:r.status, date:r.date, cost:r.cost, tech:r.technician, resolvedDate:r.resolved_date }; }

function fuelToRow(f)  { return { id:f.id, truck_id:f.truckId||null, driver_id:f.driverId||null, date:f.date, litres:f.litres, price_per_litre:f.pricePerLitre, station:f.station, odometer:f.odometer, receipt:f.receipt }; }
function fuelFromRow(r){ return { id:r.id, truckId:r.truck_id, driverId:r.driver_id, date:r.date, litres:r.litres, pricePerLitre:r.price_per_litre, station:r.station, odometer:r.odometer, receipt:r.receipt }; }

function lineToRow(l)  { return { id:l.id, code:l.code, name:l.name, contact:l.contact, rate_20ft:l.rate20, rate_40ft:l.rate40, rate_hc:l.rateHC, active:l.active }; }
function lineFromRow(r){ return { id:r.id, code:r.code, name:r.name, contact:r.contact, rate20:r.rate_20ft, rate40:r.rate_40ft, rateHC:r.rate_hc, active:r.active }; }

function vlmFromRow(r){ return { id:r.id, pattern:r.pattern, matchType:r.match_type, lineId:r.line_id, priority:r.priority, source:r.source }; }

function shutoutToRow(s)  { return { id:s.id, container:s.container, vessel:s.vessel, voyage:s.voyage, line_id:s.line||null, date:s.date, status:s.status, reason:s.reason, truck_id:s.truckId||null, driver_id:s.driverId||null, notes:s.notes }; }
function shutoutFromRow(r){ return { id:r.id, container:r.container, vessel:r.vessel, voyage:r.voyage, line:r.line_id, date:r.date, status:r.status, reason:r.reason, truckId:r.truck_id, driverId:r.driver_id, notes:r.notes }; }



function icToRow(i)  { return { id:i.id, container:i.container, line_id:i.line||null, date:i.date, type:i.type, truck_id:i.truck||null, driver_id:i.driver||null, condition:i.condition, notes:i.notes, status:i.status, img:i.img||'', eir_number:i.eirNumber||null, vessel:i.vessel||null, voyage:i.voyage||null, bl_number:i.blNumber||null, ctype:i.ctype||null, repairs:JSON.stringify(i.repairs||[]), repair_total:i.repairTotal||0, survey_id:i.surveyId||null, booking_id:i.bookingId||null, truck_reg_text:i.truckRegText||null, driver_name_text:i.driverNameText||null, needs_survey:!!i.needsSurvey, survey_status:i.surveyStatus||null, surveyed_at:i.surveyedAt||null, surveyed_by:i.surveyedBy||null, delivering_party:i.deliveringParty||null, guarantee_no:i.guaranteeNo||null, cargo_status:i.cargoStatus||null, date_out:i.dateOut||null, receiving_party:i.receivingParty||null, release_order_no:i.releaseOrderNo||null, flagged_for_review:!!i.flaggedForReview, flag_reasons:JSON.stringify(i.flagReasons||[]), duplicate_of_id:i.duplicateOfId||null, import_batch_id:i.importBatchId||null }; }
function icFromRow(r){ let repairs=[]; try{ repairs = r.repairs ? (typeof r.repairs==='string' ? JSON.parse(r.repairs) : r.repairs) : []; }catch(e){ repairs=[]; } let flagReasons=[]; try{ flagReasons = r.flag_reasons ? (typeof r.flag_reasons==='string' ? JSON.parse(r.flag_reasons) : r.flag_reasons) : []; }catch(e){ flagReasons=[]; } return { id:r.id, container:r.container, line:r.line_id, date:r.date, type:r.type, truck:r.truck_id, driver:r.driver_id, condition:r.condition, notes:r.notes, status:r.status, img:r.img||'', eirNumber:r.eir_number||'', vessel:r.vessel||'', voyage:r.voyage||'', blNumber:r.bl_number||'', ctype:r.ctype||'', repairs, repairTotal:r.repair_total||0, surveyId:r.survey_id||null, bookingId:r.booking_id||null, truckRegText:r.truck_reg_text||'', driverNameText:r.driver_name_text||'', needsSurvey:!!r.needs_survey, surveyStatus:r.survey_status||null, surveyedAt:r.surveyed_at||null, surveyedBy:r.surveyed_by||null, deliveringParty:r.delivering_party||'', guaranteeNo:r.guarantee_no||'', cargoStatus:r.cargo_status||'', dateOut:r.date_out||null, receivingParty:r.receiving_party||'', releaseOrderNo:r.release_order_no||'', flaggedForReview:!!r.flagged_for_review, flagReasons, duplicateOfId:r.duplicate_of_id||null, importBatchId:r.import_batch_id||null }; }

function reqToRow(r)   { return { id:r.id, requester:r.requester, requester_id:r.requesterId||null, category:r.category, items:r.items, amount:r.amount, date:r.date, status:r.status, approver:r.approver, approved_date:r.approvedDate, notes:r.notes }; }
function reqFromRow(r) { return { id:r.id, requester:r.requester, requesterId:r.requester_id||null, category:r.category, items:r.items, amount:r.amount, date:r.date, status:r.status, approver:r.approver, approvedDate:r.approved_date, notes:r.notes }; }

function wsToRow(w)  { return { id:w.id, truck_id:w.truckId||null, title:w.title, description:w.desc, tech:w.tech, status:w.status, reported:w.reported, diagnosed:w.diagnosed, parts:w.parts, labour:w.labour, total:w.total }; }
function wsFromRow(r){ return { id:r.id, truckId:r.truck_id, title:r.title, desc:r.description, tech:r.tech, status:r.status, reported:r.reported, diagnosed:r.diagnosed, parts:r.parts, labour:r.labour, total:r.total }; }

function invToRow(i)  { return { id:i.id, client:i.client, date:i.date, due:i.due, status:i.status, subtotal:i.subtotal, vat:i.vat, total:i.total, paid:i.paid, ref:i.ref, notes:i.notes }; }
function invFromRow(r){ return { id:r.id, client:r.client, date:r.date, due:r.due, status:r.status, subtotal:r.subtotal, vat:r.vat, total:r.total, paid:r.paid, ref:r.ref, notes:r.notes, trips:[] }; }

function allocToRow(a)  { return { id:a.id, name:a.name, description:a.desc, weight:a.weight, active:a.active }; }
function allocFromRow(r){ return { id:r.id, name:r.name, desc:r.description, weight:r.weight, active:r.active }; }

function auditToRow(a) { return { username:a.user, action:a.action, detail:a.detail, time:a.time }; }


async function upsertRows(table, rows, opts) {
  if (!rows || !rows.length) return null;
  const { error } = await supabase.from(table).upsert(rows, opts || {});
  if (error) { console.error(`${table} save failed:`, error.message); return { table, error }; }
  return null;
}


async function upsertRowsChunked(table, rows, opts, chunkSize = 500) {
  if (!rows || !rows.length) return null;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, opts || {});
    if (error) {
      console.error(`${table} save failed (rows ${i}-${i + chunk.length}):`, error.message);
      return { table, error, failedFrom: i };
    }
  }
  return null;
}


async function syncInvoiceTrips(invoices) {
  const invoiceIds = invoices.map(i => i.id);
  if (invoiceIds.length) {
    const { error: delErr } = await supabase.from('invoice_trips').delete().in('invoice_id', invoiceIds);
    if (delErr) console.error('invoice_trips clear failed:', delErr.message);
  }
  const rows = [];
  invoices.forEach(inv => (inv.trips || []).forEach(tripId => rows.push({ invoice_id: inv.id, trip_id: tripId })));
  if (rows.length) {
    const { error } = await supabase.from('invoice_trips').insert(rows);
    if (error) console.error('invoice_trips save failed:', error.message);
  }
}


async function loadDB() {
  try {
    const [
      trucksRes, driversRes, tripsRes, maintRes, fuelRes, linesRes,
      shutoutsRes, icRes, reqRes, wsRes, invRes, invTripsRes,
      billingRes, allocRes, trackRes, auditRes, settingsRes, profilesRes,
      vlmRes,
    ] = await Promise.all([
      supabase.from('trucks').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('maintenance').select('*'),
      supabase.from('fuel_logs').select('*'),
      supabase.from('shipping_lines').select('*'),
      supabase.from('shutouts').select('*'),
      supabase.from('interchange').select('*'),
      supabase.from('requisitions').select('*'),
      supabase.from('workshop_jobs').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('invoice_trips').select('*'),
      supabase.from('billing_rates').select('*'),
      supabase.from('allocation_rules').select('*'),
      supabase.from('tracking_positions').select('*'),
      supabase.from('audit_log').select('*'),
      supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('profiles').select('*'),
      supabase.from('vessel_line_map').select('*'),
    ]);

    if (trucksRes.error) throw trucksRes.error;

    const trucks  = (trucksRes.data || []).map(truckFromRow);
    const drivers = (driversRes.data || []).map(driverFromRow);

    drivers.forEach(d => { if (d.truckId) { const t = trucks.find(x => x.id === d.truckId); if (t) t.driver = d.id; } });

    const trips         = (tripsRes.data || []).map(tripFromRow);
    const maintenance    = (maintRes.data || []).map(maintFromRow);
    const fuel           = (fuelRes.data || []).map(fuelFromRow);
    const shippingLines  = (linesRes.data || []).map(lineFromRow);
    const vesselLineMap  = (vlmRes.data || []).map(vlmFromRow).sort((a, b) => a.priority - b.priority);
    const shutouts       = (shutoutsRes.data || []).map(shutoutFromRow);
    const interchange    = (icRes.data || []).map(icFromRow);
    const requisitions   = (reqRes.data || []).map(reqFromRow);
    const workshop        = (wsRes.data || []).map(wsFromRow);
    const invoices        = (invRes.data || []).map(invFromRow);

    const tripsByInvoice = {};
    (invTripsRes.data || []).forEach(row => {
      (tripsByInvoice[row.invoice_id] = tripsByInvoice[row.invoice_id] || []).push(row.trip_id);
    });
    invoices.forEach(inv => { inv.trips = tripsByInvoice[inv.id] || []; });

    const billingRates = {};
    (billingRes.data || []).forEach(r => { billingRates[r.ctype] = { base: r.base, perKm: r.per_km }; });

    const allocationRules = (allocRes.data || []).map(allocFromRow);

    const trackingPositions = {};
    (trackRes.data || []).forEach(r => {
      trackingPositions[r.truck_id] = { lat: r.lat, lng: r.lng, speed: r.speed, heading: r.heading, zone: r.zone, lastUpdate: r.last_update, source: r.source || 'driver_app' };
    });

    const auditLog = (auditRes.data || [])
      .map(a => ({ id: a.id, user: a.username, action: a.action, detail: a.detail, time: a.time, _saved: true }))
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    const s = settingsRes.data;
    const settings = s
      ? { backupDate: s.backup_date, mapApiKey: s.map_api_key || '', whatsapp: !!s.whatsapp, mpesa: !!s.mpesa, companyName: s.company_name || 'Gargo Logistics Ltd', invoiceConfig: s.invoice_config || null, wialonEnabled: !!s.wialon_enabled, wialonToken: s.wialon_token || '', wialonHost: s.wialon_host || 'https://hst-api.wialon.com' }
      : { backupDate: null, mapApiKey: '', whatsapp: true, mpesa: false, companyName: 'Gargo Logistics Ltd', invoiceConfig: null, wialonEnabled: false, wialonToken: '', wialonHost: 'https://hst-api.wialon.com' };

  
    const profiles = (profilesRes.data || []).map(p => ({
      id: p.id, name: p.name, username: p.username, email: p.email,
      role: p.role, active: p.active,
      created: p.created_at || p.created || new Date().toISOString(),
      lastLogin: p.last_login || null,
      navSections: Array.isArray(p.nav_sections) ? p.nav_sections : null,
      adminSections: Array.isArray(p.admin_sections) ? p.admin_sections : null,
    }));

    return {
      trucks, drivers, trips, maintenance, fuel, shippingLines, shutouts,
      interchange, requisitions, workshop, invoices, billingRates,
      allocationRules, trackingPositions, auditLog, settings, profiles,
      vesselLineMap,
    };
  } catch (e) {
    console.warn('Failed to load from Supabase:', e);
    return null;
  }
}


async function saveDB() {
  if (!state.db) return { ok: true, failures: [] };
  const db = state.db;
  const failures = [];
  try {

    failures.push(await upsertRows('shipping_lines', db.shippingLines.map(lineToRow)));
    failures.push(await upsertRows('trucks',         db.trucks.map(truckToRow)));
    failures.push(await upsertRows('drivers',        db.drivers.map(driverToRow)));

    failures.push(await upsertRowsChunked('trips', db.trips.map(tripToRow)));
    failures.push(await upsertRows('maintenance',    db.maintenance.map(maintToRow)));
    failures.push(await upsertRows('fuel_logs',      db.fuel.map(fuelToRow)));
    failures.push(await upsertRows('shutouts',       db.shutouts.map(shutoutToRow)));

    const dirtyInterchange = (db.interchange || []).filter(i => i._dirty);
    if (dirtyInterchange.length) {
      const icFailure = await upsertRowsChunked('interchange', dirtyInterchange.map(icToRow));
      if (icFailure) failures.push(icFailure);
      else dirtyInterchange.forEach(i => { delete i._dirty; });
    }
    failures.push(await upsertRows('requisitions',   db.requisitions.map(reqToRow)));
    failures.push(await upsertRows('workshop_jobs',  db.workshop.map(wsToRow)));
    failures.push(await upsertRows('invoices',       db.invoices.map(invToRow)));
    await syncInvoiceTrips(db.invoices);

    const billingRows = Object.entries(db.billingRates || {}).map(([ctype, v]) => ({ ctype, base: v.base, per_km: v.perKm }));
    failures.push(await upsertRows('billing_rates', billingRows, { onConflict: 'ctype' }));

    failures.push(await upsertRows('allocation_rules', db.allocationRules.map(allocToRow)));

    const trackingRows = Object.entries(db.trackingPositions || {}).map(([truckId, p]) => ({
      truck_id: truckId, lat: p.lat, lng: p.lng, speed: p.speed, heading: p.heading, zone: p.zone, last_update: p.lastUpdate, source: p.source || 'driver_app',
    }));
    failures.push(await upsertRows('tracking_positions', trackingRows, { onConflict: 'truck_id' }));

    const unsavedAudit = (db.auditLog || []).filter(a => !a._saved);
    if (unsavedAudit.length) {
      const { error: auditErr } = await supabase.from('audit_log').insert(unsavedAudit.map(auditToRow));
      if (auditErr) { console.error('audit_log save failed:', auditErr.message); failures.push({ table: 'audit_log', error: auditErr }); }
      else unsavedAudit.forEach(a => { a._saved = true; });
    }

    if (db.settings) {
      const settingsRow = {
        id: 1,
        company_name: db.settings.companyName,
        backup_date: db.settings.backupDate,
        map_api_key: db.settings.mapApiKey,
        whatsapp: db.settings.whatsapp,
        mpesa: db.settings.mpesa,
        invoice_config: db.settings.invoiceConfig || null,
        wialon_enabled: !!db.settings.wialonEnabled,
        wialon_token: db.settings.wialonToken || null,
        wialon_host: db.settings.wialonHost || 'https://hst-api.wialon.com',
      };
      let { error } = await supabase.from('app_settings').upsert(settingsRow, { onConflict: 'id' });
      if (error && /invoice_config/i.test(error.message || '')) {

        delete settingsRow.invoice_config;
        ({ error } = await supabase.from('app_settings').upsert(settingsRow, { onConflict: 'id' }));
      }
      if (error) { console.error('app_settings save failed:', error.message); failures.push({ table: 'app_settings', error }); }
    }
  } catch (e) {
    console.warn('Unable to save to Supabase:', e);
    toast('Could not save data. Check network.', 'warning', 4000);
    return { ok: false, failures: [{ table: '_unknown', error: e }] };
  }

  const realFailures = failures.filter(Boolean);
  if (realFailures.length) {
    const names = realFailures.map(f => f.table).join(', ');
    console.error('Save completed with errors in:', names, realFailures);
    toast(`Some changes didn't save (${names}) — please retry or check your connection`, 'error', 5000);
    return { ok: false, failures: realFailures };
  }
  return { ok: true, failures: [] };
}

function scheduleSave() {
  if (state._saveDebounce) clearTimeout(state._saveDebounce);
  state._saveDebounce = setTimeout(() => {
    saveDB();
    state._saveDebounce = null;
  }, 300);
}


function saveNowAwaited() {
  if (state._saveDebounce) { clearTimeout(state._saveDebounce); state._saveDebounce = null; }
  return saveDB();
}




function remapSeedIds(db) {
  const idMap = { trucks: new Map(), drivers: new Map(), trips: new Map(), shippingLines: new Map(), invoices: new Map() };
  const remapOwnIds = (arr, map) => (arr || []).forEach(o => { const fresh = uid(); if (map) map.set(o.id, fresh); o.id = fresh; });

  remapOwnIds(db.shippingLines, idMap.shippingLines);
  remapOwnIds(db.trucks,        idMap.trucks);
  remapOwnIds(db.drivers,       idMap.drivers);
  remapOwnIds(db.trips,         idMap.trips);
  remapOwnIds(db.invoices,      idMap.invoices);
  [db.maintenance, db.fuel, db.shutouts, db.interchange, db.requisitions, db.workshop, db.profiles, db.auditLog, db.allocationRules]
    .forEach(arr => remapOwnIds(arr, null));

  db.drivers.forEach(d => { d.truckId = d.truckId ? (idMap.trucks.get(d.truckId) || null) : null; });
  db.trucks.forEach(t  => { t.driver  = t.driver  ? (idMap.drivers.get(t.driver)  || null) : null; });
  db.trips.forEach(t => {
    t.truckId      = t.truckId      ? (idMap.trucks.get(t.truckId)             || null) : null;
    t.driverId     = t.driverId     ? (idMap.drivers.get(t.driverId)           || null) : null;
    t.shippingLine = t.shippingLine ? (idMap.shippingLines.get(t.shippingLine) || null) : null;
  });
  db.maintenance.forEach(m => { m.truckId = m.truckId ? (idMap.trucks.get(m.truckId) || null) : null; });
  db.fuel.forEach(f => {
    f.truckId  = f.truckId  ? (idMap.trucks.get(f.truckId)   || null) : null;
    f.driverId = f.driverId ? (idMap.drivers.get(f.driverId) || null) : null;
  });
  db.shutouts.forEach(s => {
    s.line     = s.line     ? (idMap.shippingLines.get(s.line) || null) : null;
    s.truckId  = s.truckId  ? (idMap.trucks.get(s.truckId)      || null) : null;
    s.driverId = s.driverId ? (idMap.drivers.get(s.driverId)    || null) : null;
  });
  db.interchange.forEach(i => {
    i.line   = i.line   ? (idMap.shippingLines.get(i.line) || null) : null;
    i.truck  = i.truck  ? (idMap.trucks.get(i.truck)         || null) : null;
    i.driver = i.driver ? (idMap.drivers.get(i.driver)       || null) : null;
  });
  db.workshop.forEach(w => { w.truckId = w.truckId ? (idMap.trucks.get(w.truckId) || null) : null; });
  db.requisitions.forEach(r => { if (idMap.drivers.has(r.requester)) r.requester = idMap.drivers.get(r.requester); });
  db.invoices.forEach(inv => { inv.trips = (inv.trips || []).map(tid => idMap.trips.get(tid)).filter(Boolean); });

  const newTracking = {};
  Object.entries(db.trackingPositions || {}).forEach(([oldTruckId, p]) => {
    const freshId = idMap.trucks.get(oldTruckId);
    if (freshId) newTracking[freshId] = p;
  });
  db.trackingPositions = newTracking;

  return db;
}


async function clearAllTables() {
  const del = async (table, col) => {
    const { error } = await supabase.from(table).delete().not(col, 'is', null);
    if (error) console.error(`${table} clear failed:`, error.message);
  };

  await del('booking_documents', 'id');
  await del('depot_surveys', 'id');


  {
    const { error } = await supabase.from('depot_block_slots').update({
      booking_id: null, trip_id: null, container: null,
      condition_status: 'empty', released_at: new Date().toISOString(),
    }).or('booking_id.not.is.null,trip_id.not.is.null,container.not.is.null');
    if (error) console.error('depot_block_slots reset failed:', error.message);
  }

  await del('invoice_trips', 'invoice_id');
  await del('invoices', 'id');
  await del('audit_log', 'id');
  await del('tracking_positions', 'truck_id');
  await del('allocation_rules', 'id');
  await del('billing_rates', 'ctype');
  await del('workshop_jobs', 'id');
  await del('requisitions', 'id');
  await del('interchange', 'id');
  await del('shutouts', 'id');
  await del('fuel_logs', 'id');
  await del('maintenance', 'id');
  await del('trips', 'id');
  await del('public_bookings', 'id');

  
  {
    const { error } = await supabase.from('depot_storage_zones').update({ occupied_teu: 0 });
    if (error) console.error('depot_storage_zones reset failed:', error.message);
  }

  await del('drivers', 'id');
  await del('trucks', 'id');


  {
    const { error } = await supabase.from('depot_storage_zones').update({ shipping_line_id: null }).not('id', 'is', null);
    if (error) console.error('depot_storage_zones link clear failed:', error.message);
  }
  await del('shipping_lines', 'id');
}

async function initDB() {
  const loaded = await loadDB();
  if (loaded) {
    state.db = loaded;
  } else {
   
    state.db = {
      trucks: [],
      drivers: [],
      trips: [],
      maintenance: [],
      fuel: [],
      shippingLines: [],
      shutouts: [],
      interchange: [],
      requisitions: [],
      workshop: [],
      invoices: [],
      billingRates: defaultBillingRates(),
      allocationRules: [],
      trackingPositions: {},
      auditLog: [],
      settings: {},
      profiles: []
    };
  }
  if (!state.db.settings) {
    state.db.settings = {
      backupDate: null,
      mapApiKey: '',
      whatsapp: true,
      mpesa: false,
      companyName: 'Gargo Logistics Ltd',
      invoiceConfig: null,
      wialonEnabled: false,
      wialonToken: '',
      wialonHost: 'https://hst-api.wialon.com'
    };
  }
  if (!state.db.billingRates || !Object.keys(state.db.billingRates).length) {
    state.db.billingRates = defaultBillingRates();
  }
}

function uid(pfx='ID') {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function fmt(n) { return Number(n).toLocaleString('en-KE'); }
function fmtKsh(n, mask=false) { 
  if (mask) return '<span class="money-mask">KSh ••••••</span>'; 
  return `KSh ${fmt(n)}`; 
}
function timeAgo(iso) { 
  const s=(Date.now()-new Date(iso).getTime())/1000; 
  if(s <60)return `${Math.round(s)}s ago`; 
  if(s <3600)return `${Math.round(s/60)}m ago`; 
  if(s <86400)return `${Math.round(s/3600)}h ago`; 
  return `${Math.round(s/86400)}d ago`; 
}
function fmtTime(iso) { return new Date(iso).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}); }

function sbadge(status) {
  const labels={ available:'Available', on_trip:'On Trip', maintenance:'Maintenance', breakdown:'Breakdown', off_duty:'Off Duty', grounded:'Grounded', active:'Active', completed:'Completed', delayed:'Delayed', pending:'Pending', approved:'Approved', rejected:'Rejected', fulfilled:'Fulfilled', overdue:'Overdue', draft:'Draft', sent:'Sent', paid:'Paid', partial:'Partial', critical:'Critical', in_progress:'In Progress', reported:'Reported', diagnosed:'Diagnosed', suspended:'Suspended', reconciled:'Reconciled', open:'Open', resolved:'Resolved', redelivery:'Redelivery', loaded:'Loaded', offloaded:'Offloaded' };
  return `<span class="sbadge s-${status}">${labels[status]||status}</span>`;
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function truckName(id) { if(!id)return '—'; const t=state.db.trucks.find(t=>t.id===id); return t? `${t.reg} · ${t.make}` :id; }
function driverName(id) { if(!id)return '—'; const d=state.db.drivers.find(d=>d.id===id); return d?d.name:id; }
function lineName(id) { if(!id)return '—'; const l=state.db.shippingLines.find(l=>l.id===id); return l? `${l.code} — ${l.name}` :id; }


function normVessel(v) { return (v || '').trim().toUpperCase().replace(/\s+/g, ' '); }


function resolveLineIdFromVessel(vesselText) {
  const v = normVessel(vesselText);
  if (!v) return null;
  const map = state.db.vesselLineMap || [];
  for (const m of map) {
    const p = normVessel(m.pattern);
    if (!p) continue;
    if (m.matchType === 'prefix'   && v.startsWith(p)) return m.lineId;
    if (m.matchType === 'contains' && v.includes(p))   return m.lineId;
    if (m.matchType === 'exact'    && v === p)          return m.lineId;
  }
  return null;
}
function initials(name) { if(!name)return '?'; return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function fuelColour(pct) { if(pct >60)return 'var(--green)'; if(pct >30)return 'var(--amber)'; return 'var(--red)'; }
function isAdmin() { return state.profile?.role === 'admin'; }
function isDriver() { return state.profile?.role === 'driver'; }
function isClerk() { return state.profile?.role === 'clerk'; }
function isDispatch() { return state.profile?.role === 'dispatch'; }
function currentRole() { return state.profile?.role || 'viewer'; }



function clearReviewFlag(kind, id) {
  const arr = kind === 'trips' ? state.db.trips : state.db.interchange;
  const rec = arr.find(x => x.id === id);
  if (!rec) return;
  rec.flaggedForReview = false;
  rec._dirty = true;
  scheduleSave();
  toast('Marked as reviewed', 'success');
  if (kind === 'trips') renderTrips(_tripFilter || 'all'); else renderInterchange(_icFilter || 'all');
}

const TERMINAL_TRIP_STATUSES = ['completed'];
function isTripLive(t) { return !TERMINAL_TRIP_STATUSES.includes(t.status); }


function findLiveTripByContainer(cont, excludeTripId) {
  if (!cont) return null;
  const c = cont.trim().toUpperCase();
  return state.db.trips.find(t => t.id !== excludeTripId && isTripLive(t) && (t.container || '').toUpperCase() === c) || null;
}


const ISO6346_LETTER_VALUES = {
  A:10,B:12,C:13,D:14,E:15,F:16,G:17,H:18,I:19,J:20,K:21,L:23,M:24,N:25,
  O:26,P:27,Q:28,R:29,S:30,T:31,U:32,V:34,W:35,X:36,Y:37,Z:38,
};

function iso6346CheckDigit(first10) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = first10[i];
    const val = /[0-9]/.test(ch) ? parseInt(ch, 10) : ISO6346_LETTER_VALUES[ch];
    if (val === undefined) return null;
    sum += val * Math.pow(2, i);
  }
  const rem = sum % 11;
  return rem === 10 ? 0 : rem;
}


function containerFormatIssue(cont) {
  const c = (cont || '').trim().toUpperCase();
  if (!c) return 'Container number is required';
  if (c.length !== 11) return `Must be 11 characters (owner code + serial + check digit) — got ${c.length}`;
  if (!/^[A-Z]{3}/.test(c)) return 'First 3 characters must be letters (owner code)';
  if (!/^[A-Z]{3}[UJZ]/.test(c)) return "4th character must be U, J, or Z (equipment category)";
  if (!/^[A-Z]{4}\d{6}\d$/.test(c)) return 'Characters 5–11 must be digits (serial number + check digit)';
  const expected = iso6346CheckDigit(c.slice(0, 10));
  const actual = parseInt(c[10], 10);
  if (expected === null) return 'Could not compute check digit';
  if (expected !== actual) return `Check digit should be ${expected}, not ${actual} — verify the container number`;
  return null;
}

function isValidContainerFormat(cont) {
  return containerFormatIssue(cont) === null;
}


function findDuplicateInterchange(container, type, dateVal, excludeId) {
  const cont = (container || '').trim().toUpperCase();
  if (!cont || !type) return null;
  const day = new Date(dateVal || Date.now()).toDateString();
  return state.db.interchange.find(i =>
    i.id !== excludeId &&
    (i.container || '').toUpperCase() === cont &&
    i.type === type &&
    new Date(i.date).toDateString() === day
  ) || null;
}


function markContainerValidity(el) {
  const start = el.selectionStart, end = el.selectionEnd;
  el.value = el.value.toUpperCase();
  if (el.setSelectionRange) el.setSelectionRange(start, end);
  const v = el.value.trim();
  el.classList.remove('input-valid', 'input-invalid');
  if (v.length < 4) return;
  el.classList.add(isValidContainerFormat(v) ? 'input-valid' : 'input-invalid');
}

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

function findLineByCode(code, excludeId) {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  return state.db.shippingLines.find(l => l.id !== excludeId && (l.code || '').toUpperCase() === c) || null;
}


const ROLE_SIDEBAR = {
  admin:    ['dashboard','trucks','drivers','trips','dispatch','inward','publicbookings','depops','maintenance','fuel','shutout','interchange','depotreport','shippinglines','requisitions','workshop'],
  clerk:    ['trucks','drivers','trips','dispatch','inward','publicbookings','depops','shutout','interchange','depotreport'],
  dispatch: ['trucks','drivers','trips','dispatch','inward','publicbookings','depops','shutout','interchange','depotreport','fuel'],
  ops:      ['trucks','drivers','trips','dispatch','inward','publicbookings','depops','maintenance','fuel','shutout','interchange','depotreport','shippinglines','requisitions','workshop'],
  finance:  ['trips','shippinglines'],
  viewer:   ['trucks','drivers','trips'],
};
const ROLE_ADMINRAIL = {
  admin:    ['invoicing','allocation','workanalysis','reports','tripreports','livetracking','usermgmt','settings'],
  clerk:    ['allocation'],
  dispatch: ['allocation'],
  finance:  ['invoicing','workanalysis','reports'],
  ops:      ['workanalysis','reports'],
  viewer:   [],
};
function allowedSidebarSections() {
  if (isAdmin()) return ROLE_SIDEBAR.admin;
  const custom = state.profile?.nav_sections;
  if (Array.isArray(custom)) return custom; // per-user override set by an admin (may be [])
  return ROLE_SIDEBAR[currentRole()] || [];
}
function allowedAdminRailSections() {
  if (isAdmin()) return ROLE_ADMINRAIL.admin;
  const custom = state.profile?.admin_sections;
  if (Array.isArray(custom)) return custom; // per-user override set by an admin (may be [])
  return ROLE_ADMINRAIL[currentRole()] || [];
}
function canSeeSection(sec) { return isAdmin() || allowedSidebarSections().includes(sec); }
function canSeeAdminSection(sec) { return isAdmin() || allowedAdminRailSections().includes(sec); }


function applyRoleUI() {
  if (isAdmin()) {
    document.querySelectorAll('.nav-item[data-section]').forEach(n=>n.style.display='');
    document.querySelectorAll('.admin-nav-item').forEach(n=>n.style.display='');
    const adminGroupLabel0=document.getElementById('sidebarAdminGroupLabel');
    if (adminGroupLabel0) adminGroupLabel0.style.display='';
    return;
  }
  const sidebarAllowed = allowedSidebarSections();
  document.querySelectorAll('.nav-item[data-section]').forEach(n=>{
    const sec = n.getAttribute('data-section');
    n.style.display = sidebarAllowed.includes(sec) ? '' : 'none';
  });
 
  const dashBtn=document.querySelector('.nav-item[data-section="dashboard"]');
  if (dashBtn) dashBtn.style.display='none';

  const railAllowed = allowedAdminRailSections();
  ['invoicing','allocation','workanalysis','reports','tripreports','livetracking','usermgmt','settings'].forEach(sec=>{
    const btn=document.getElementById(`adminBtn-${sec}`);
    if (btn) btn.style.display = railAllowed.includes(sec) ? '' : 'none';
  });
  document.querySelectorAll('.admin-nav-group').forEach(grp=>{
    const visibleBtns = [...grp.querySelectorAll('.admin-nav-item')].some(b=>b.style.display!=='none');
    grp.style.display = visibleBtns ? '' : 'none';
  });
  const adminGroupLabel=document.getElementById('sidebarAdminGroupLabel');
  if (adminGroupLabel) {
    const anyAdminVisible = ['allocation','workanalysis','reports','tripreports','livetracking'].some(sec=>{
      const b=document.getElementById(`adminBtn-${sec}`); return b && b.style.display!=='none';
    });
    adminGroupLabel.style.display = anyAdminVisible ? '' : 'none';
  }
  const muItem = document.querySelector('.user-menu-item[onclick*="usermgmt"]');
  if (muItem) muItem.style.display = railAllowed.includes('usermgmt') ? '' : 'none';


  ['allocTabBtn-requisitions','allocTabBtn-workshop'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const statusOverride = document.getElementById('adminStatusOverridePanel');
  if (statusOverride) statusOverride.style.display='none';
}


function defaultSectionForRole() {
  if (isAdmin()) return 'dashboard';
  const allowed = allowedSidebarSections();
  return allowed[0] || 'trips';
}

function myDriverRecord() { return state.db.drivers.find(d => d.profileId === state.profile?.id) || null; }
function canFinance() { return isAdmin(); }
function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validatePhone(phone) { return /^\+?[0-9\s\-()]{7,20}$/.test(phone); }
function sanitize(str) { if(!str)return ''; return str.replace(/[<>]/g,''); }


function toast(msg, type='info', dur=3200) {
  const icons={ success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
  const stack=document.getElementById('toastStack');
  if(stack) stack.prepend(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),350); }, dur);
}


const LOAD_STEPS = [
  [300,  'Connecting to Supabase…'],
  [700,  'Loading fleet database…'],
  [1100, 'Verifying container records…'],
  [1600, 'Building dispatch queue…'],
  [2000, 'Activating live tracking…'],
  [2400, 'System ready.'],
];

async function runLoader() {
  const fill = document.getElementById('loaderFill');
  const status = document.getElementById('loaderStatus');
  const loader = document.getElementById('loader');
  if (!fill || !status || !loader) return;

  await initDB();


  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profile && profile.active && !error) {
        state.profile = profile;
        state.currentUser = {
          id: session.user.id,
          email: profile.email,
          username: profile.username,
          name: profile.name,
          role: profile.role
        };
      }
    }
  } catch (e) {
    console.warn('Session check failed:', e);
  }

  LOAD_STEPS.forEach(([t, msg], i) => {
    setTimeout(() => {
      fill.style.width = `${Math.round(((i + 1) / LOAD_STEPS.length) * 100)}%`;
      status.textContent = msg;
      if (i === LOAD_STEPS.length - 1) {
        setTimeout(() => {
          loader.classList.add('out');
          setTimeout(() => {
            loader.style.display = 'none';
            if (state.currentUser && state.profile) {
              bootShell();
            } else {
              showLoginScreen();
            }
          }, 520);
        }, 400);
      }
    }, t);
  });
}


async function loadUserProfile(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Profile not found:', error);
      return false;
    }

    if (!profile.active) {
      toast('Account is deactivated', 'error');
      return false;
    }

    state.profile = profile;
    state.currentUser = { 
      id: userId, 
      email: profile.email,
      username: profile.username,
      name: profile.name,
      role: profile.role
    };

    await supabase.from('profiles').update({ 
      last_login: new Date().toISOString() 
    }).eq('id', userId);
    
    return true;
  } catch (e) {
    console.error('loadUserProfile error:', e);
    return false;
  }
}

function showLoginScreen() {
  const loginEl=document.getElementById('loginScreen');
  if(!loginEl) return;
  loginEl.style.display='flex';
  animateCounter('ls-fleet',   state.db.trucks.length,       0, 800);
  animateCounter('ls-drivers', state.db.drivers.length,      0, 800);
  animateCounter('ls-trips',   state.db.trips.filter(t=>t.status==='active').length, 0, 800);
  setTimeout(()=>document.getElementById('loginUser')?.focus(), 100);
}

function animateCounter(id, target, start=0, dur=600) {
  const el=document.getElementById(id);
  if(!el) return;
  const step=(target-start)/(dur/16);
  let cur=start;
  const tick=()=>{
    cur=Math.min(cur+step, target);
    el.textContent=Math.round(cur);
    if(cur<target) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
window.doLogin = async function() {
  const email = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');

  if (!email || !password) {
    errEl.textContent = 'Email and password required.';
    return;
  }

  errEl.textContent = '';
  const btn = document.querySelector('.login-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span>Signing in…</span>'; }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error || !data.user) {
      errEl.textContent = 'Invalid email or password.';
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      errEl.textContent = 'Profile not found. Contact administrator.';
      await supabase.auth.signOut();
      return;
    }

    if (!profile.active) {
      errEl.textContent = 'Account is deactivated.';
      await supabase.auth.signOut();
      return;
    }

    state.profile = profile;
    state.currentUser = {
      id: data.user.id,
      email: profile.email,
      username: profile.username,
      name: profile.name,
      role: profile.role
    };

    await supabase.from('profiles').update({
      last_login: new Date().toISOString()
    }).eq('id', data.user.id);

    document.getElementById('loginScreen').style.display = 'none';
    bootShell();

  } catch (e) {
    console.error('Login error:', e);
    errEl.textContent = 'Connection error. Please try again.';
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Sign In</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'; }
  }
};
 


async function loadUserProfile(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      console.error('Profile not found:', error);
      return false;
    }
    
    if (!profile.active) {
      toast('Account is deactivated', 'error');
      return false;
    }
    
    state.profile = profile;
    state.currentUser = { 
      id: userId, 
      email: profile.email,
      username: profile.username,
      name: profile.name,
      role: profile.role
    };
    
    await supabase.from('profiles').update({ 
      last_login: new Date().toISOString() 
    }).eq('id', userId);
    
    return true;
  } catch (e) {
    console.error('loadUserProfile error:', e);
    return false;
  }
}

async function logout() {
  if (!confirm('Are you sure you want to sign out?')) return;
  await performLogout('User signed out');
}


async function forceLogout(reason) {
  await performLogout(reason || 'Session timed out (idle)');
}

async function performLogout(auditDetail) {
  stopDriverTracking();
  stopWialonPolling();
  stopAutoRefresh();
  addAudit(state.profile?.username || 'system', 'Logout', auditDetail);
  await supabase.auth.signOut();
  state.currentUser = null;
  state.profile = null;
  clearIdleTimer();
  document.getElementById('shell').style.display = 'none';
  const dp = document.getElementById('driverPortal');
  if (dp) dp.style.display = 'none';
  document.body.classList.remove('driver-portal-active');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginUser').focus();
}

function togglePwVis(inputId, btn) {
  const inp=document.getElementById(inputId);
  if(!inp) return;
  inp.type = inp.type==='password'?'text':'password';
  const circle=btn?.querySelector('svg circle');
  if(circle) circle.setAttribute('r', inp.type==='text'?'1':'3');
}


function bootShell() {

  if (isDriver()) {
    document.body.classList.add('driver-portal-active');
    const shellEl = document.getElementById('shell');
    if (shellEl) shellEl.style.display = 'none';
    const dp = document.getElementById('driverPortal');
    if (dp) dp.style.display = 'flex';
    startClock();
    refreshContainerHistory();
    renderDriverPortal();
    startIdleTimer();
    return;
  }
  document.body.classList.remove('driver-portal-active');
  const dp = document.getElementById('driverPortal');
  if (dp) dp.style.display = 'none';
  document.getElementById('shell').style.display='flex';
  updateUserChip();
  startClock();
  applyRoleUI();
  buildBadges();
  buildAlerts();
  subscribeTrackingRealtime();
  subscribeLiveSync();
  startWialonPolling();
  initAutoRefresh();
  const landing = defaultSectionForRole();
  showSection(landing, document.querySelector(`.nav-item[data-section="${landing}"]`));
  populateSelects();
  startIdleTimer();
  startLivePulse();
}

function updateUserChip() {
  const p=state.profile;
  if(!p) return;
  const av=document.getElementById('railUserAv');
  if(av) av.textContent=initials(p.name);
  const nm=document.getElementById('railUserName');
  if(nm) nm.textContent=p.name.split(' ')[0];
  const rl=document.getElementById('railUserRole');
  if(rl) rl.textContent=roleLabel(p.role);
  const tc=document.getElementById('topbarRoleChip');
  if(tc) tc.textContent=roleLabel(p.role);
  const mh=document.getElementById('userMenuHeader');
  if(mh) mh.innerHTML= `<div class="user-menu-header-name">${p.name}</div><div class="user-menu-header-role">${roleLabel(p.role)}</div>`;
}

function roleLabel(r) { const m={ admin:'System Administrator', ops:'Operations Officer', finance:'Finance Manager', dispatch:'Dispatch Controller', clerk:'Clerk', viewer:'Read-Only Viewer', driver:'Driver' }; return m[r]||r; }

function startClock() {
  const update=()=>{
    const now=new Date();
    const clk=document.getElementById('liveTime');
    if(clk) clk.textContent=now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const td=document.getElementById('todayDate');
    if(td) td.textContent=now.toLocaleDateString('en-KE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
    const dpc=document.getElementById('dp_clock');
    if(dpc) dpc.textContent=now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
    if (isDriver()) renderDutyBar();
  };
  update();
  setInterval(update,1000);
}

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
  set('badge-interchange',  db.interchange.filter(i=>i.status==='pending').length);
  set('badge-requisitions', db.requisitions.filter(r=>r.status==='pending').length);
  set('badge-invoices',     db.invoices.filter(i=>i.status==='overdue').length);
  set('badge-depotreport',  computeDepotReportDuplicates().length);
}

function buildAlerts() {
  const db=state.db;
  const alerts=[];

  db.maintenance.filter(m=>m.status==='open' && m.priority==='critical' && m.reportedByDriver).forEach(m=>{
    alerts.push({ type:'driver_breakdown', msg: `🚨 DRIVER BREAKDOWN REPORT — ${truckName(m.truckId)}: ${m.desc.slice(0,60)}…` });
  });
  db.maintenance.filter(m=>m.status==='open' && m.priority==='critical' && !m.reportedByDriver).forEach(m=>{
    alerts.push({ type:'crit', msg: `Critical breakdown — ${truckName(m.truckId)}: ${m.desc.slice(0,60)}…` });
  });
  db.trucks.filter(t=>t.fuelPct <20).forEach(t=>{
    alerts.push({ type:'warn', msg: `Low fuel — ${t.reg}: ${t.fuelPct}% remaining` });
  });
  db.trips.filter(t=>t.status==='delayed').forEach(t=>{
    alerts.push({ type:'warn', msg: `Trip delayed — ${truckName(t.truckId)} → ${t.dest}` });
  });
  db.drivers.filter(d=>{ const daysLeft=(new Date(d.licenceExp)-Date.now())/(86400000); return daysLeft <90 && daysLeft >0; }).forEach(d=>{
    const days=Math.round((new Date(d.licenceExp)-Date.now())/86400000);
    alerts.push({ type:'warn', msg: `Licence expiry — ${d.name}: ${days} days remaining` });
  });


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
  depotreport:['Container Ops','Depot Report'],
  shippinglines:['Container Ops','Shipping Lines'], requisitions:['Compliance','Requisitions'],
  workshop:['Compliance','Workshop'], invoicing:['Finance','Invoicing'],
  allocation:['Intelligence','Allocation'], workanalysis:['Intelligence','Work Analysis'],
  reports:['Intelligence','Reports'], tripreports:['Intelligence','Trip Reports & Audit Centre'],
  livetracking:['Platform','Live Tracking'],
  usermgmt:['Platform','User Management'], settings:['Platform','Settings'],
  
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
  depotreport: renderDepotReport,
  shippinglines:()=>renderLines('all'), requisitions:()=>renderRequisitions('all'),
  workshop:()=>renderWorkshop('all'), invoicing:()=>renderInvoicing('all'),
  allocation:()=>renderAllocation('auto'), workanalysis:()=>renderWorkAnalysis('all'),
  reports:()=>renderReport('overview'), tripreports:trcInit, livetracking:initTrackingSection,
  usermgmt:renderUserMgmt, settings:renderSettings,
  publicbookings: renderPublicBookings,
  depops: renderDepOps,
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

function showAddTruckModal() {
  openModal('Add New Truck', `<div class="form-row-2"><div class="fg"><label>Registration</label><input id="nt_reg" placeholder="KDA 000A"/></div><div class="fg"><label>Make / Model</label><input id="nt_make" placeholder="ISUZU FVZ"/></div></div><div class="form-row-2"><div class="fg"><label>Type</label><select id="nt_type"><option>Prime Mover</option><option>Flatbed</option><option>Tipper</option><option>Tanker</option><option>Lowbed</option></select></div><div class="fg"><label>Year</label><input id="nt_year" type="number" placeholder="${new Date().getFullYear()}"/></div></div><div class="form-row-2"><div class="fg"><label>Colour</label><input id="nt_colour" placeholder="White"/></div><div class="fg"><label>Fuel Level %</label><input id="nt_fuel" type="number" placeholder="100" min="0" max="100"/></div></div><div class="fg"><label>Odometer (km)</label><input id="nt_odo" type="number" placeholder="0"/></div><div class="fg"><label>Wialon Unit ID (optional)</label><input id="nt_wialon" placeholder="Leave blank if tracked via driver phone"/></div><div class="fg"><label>Notes</label><textarea id="nt_notes" rows="2" placeholder="Any notes…"></textarea></div><button class="submit-btn" onclick="saveTruck()">Add Truck →</button>`);
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

function showAddDriverModal() {
  openModal('Add New Driver', `<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="nd_name" placeholder="John Doe"/></div><div class="fg"><label>Phone</label><input id="nd_phone" placeholder="+254 7XX XXX XXX"/></div></div><div class="form-row-2"><div class="fg"><label>Licence No.</label><input id="nd_lic" placeholder="DL-A0000"/></div><div class="fg"><label>Licence Expiry</label><input id="nd_licexp" type="date"/></div></div><div class="form-row-2"><div class="fg"><label>ID Number</label><input id="nd_idno" placeholder="ID number"/></div><div class="fg"><label>Rating</label><input id="nd_rating" type="number" placeholder="4.0" min="0" max="5" step="0.1"/></div></div><button class="submit-btn" onclick="saveDriver()">Add Driver →</button>`);
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


let _tripFilter='active';
function filterTrips(f,btn){ _tripFilter=f; document.querySelectorAll('#sec-trips .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderTrips(f); }

function renderTrips(f){
  let trips=state.db.trips;
  if(f==='flagged') trips=trips.filter(t=>t.flaggedForReview);
  else if(f!=='all') trips=trips.filter(t=>t.status===f);
  const el=document.getElementById('tripsList');
  if(!el) return;
  el.innerHTML=trips.map(t=>`<div class="trip-card status-${t.status}" onclick="showTripDetail('${t.id}')"><div class="trip-card-head"><div class="trip-route">${t.origin}<span class="arrow">→</span>${t.dest}</div>${sbadge(t.status)}${t.flaggedForReview?`<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${esc((t.flagReasons||[]).join('; '))}">⚠ Flagged</span>`:''}</div><div class="trip-meta"><span>🚛 ${truckName(t.truckId)}</span><span>👤 ${driverName(t.driverId)}</span><span class="mono" style="font-size:10.5px;color:var(--gold)">${t.container}</span><span>${t.ctype} · ${t.workType}${t.outwardType ? ' · ' + sanitize(t.outwardType) : ''}</span><span>🕐 Started ${timeAgo(t.startTime)} · ETA ${fmtTime(t.eta)}</span><span>${t.distance}km · ${sbadge(t.priority.toLowerCase())}</span></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-label">No trips in this filter</div></div>';
}

function showTripDetail(id) {
  const t = state.db.trips.find(t=>t.id===id);
  if (!t) return;
  const line = state.db.shippingLines.find(l=>l.id===t.shippingLine);
  const needsDispatch = isTripLive(t) && (!t.truckId || !t.driverId);
  const gallery = Array.isArray(t.containerImages) && t.containerImages.length
    ? `<div style="margin-bottom:14px"><div class="fg" style="margin:0 0 6px"><label>Container Photos (${t.containerImages.length})</label></div><div class="container-img-grid">${t.containerImages.map(src=>`<div class="container-img-thumb view-only"><img src="${src}" onclick="window.open('${src}','_blank')" /></div>`).join('')}</div></div>`
    : '';
  openModal(`Trip — ${t.container}`, `${needsDispatch ? `<div class="ops-notice" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>This trip is awaiting a truck/driver assignment.</span><button class="modal-btn primary" onclick="closeModal();jumpToCompleteDispatch('${t.id}')">Complete in Dispatch →</button></div>` : ''}${gallery}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Container</label><div class="mono" style="color:var(--gold);font-size:13px">${t.container}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.ctype}</div></div><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(t.truckId)}</div></div><div class="fg" style="margin:0"><label>Driver</label><div style="font-size:12px;color:var(--text)">${driverName(t.driverId)}</div></div><div class="fg" style="margin:0"><label>Origin</label><div style="font-size:12px;color:var(--text)">${t.origin}</div></div><div class="fg" style="margin:0"><label>Destination</label><div style="font-size:12px;color:var(--text)">${t.dest}</div></div><div class="fg" style="margin:0"><label>Work Type</label><div style="font-size:12px;color:var(--text)">${t.workType}</div></div>${t.outwardType ? `<div class="fg" style="margin:0"><label>Outward Type</label><div style="font-size:12px;color:var(--gold)">${sanitize(t.outwardType)}</div></div>` : ''}<div class="fg" style="margin:0"><label>Distance</label><div style="font-size:12px;color:var(--text)">${t.distance} km</div></div><div class="fg" style="margin:0"><label>Started</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.startTime)}</div></div><div class="fg" style="margin:0"><label>ETA</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.eta)}</div></div><div class="fg" style="margin:0"><label>Shipping Line</label><div style="font-size:12px;color:var(--text)">${line?line.name:'—'}</div></div><div class="fg" style="margin:0"><label>Priority</label><div>${sbadge(t.priority.toLowerCase())}</div></div><div class="fg" style="margin:0"><label>Reference</label><div class="mono" style="font-size:11px;color:var(--text-2)">${t.ref}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(t.status)}</div></div></div>${t.notes?`<div class="ops-notice">${t.notes}</div>`:''}${t.flaggedForReview?`<div class="ops-notice" style="margin-top:10px"><div style="margin-bottom:6px">⚠ Flagged on import: ${esc((t.flagReasons||[]).join('; '))}</div><button class="modal-btn ghost" onclick="clearReviewFlag('trips','${t.id}');closeModal()">✓ Mark Reviewed</button></div>`:''}${canUpdateTripStatus(t)?`<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:10px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip Step Update ${t.status==='completed'?'— trip complete, no further changes':'(forward only)'}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${nextTripStatuses(t.status).length ? nextTripStatuses(t.status).map(s=>`<button class="filter-btn" onclick="quickSetTripStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('') : '<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>'}</div>${isAdmin()?adminDeleteBtn('trips', id):''}</div>`:''}`);
}


const TRIP_STATUS_RANK = { active:0, loaded:1, on_trip:2, delayed:2, breakdown:2, offloaded:3, completed:4 };
const TRIP_ALL_STATUSES = Object.keys(TRIP_STATUS_RANK);

function canTransitionTripStatus(from, to) {
  if (!(from in TRIP_STATUS_RANK) || !(to in TRIP_STATUS_RANK)) return false;
  if (from === to) return false;               
  if (from === 'completed') return false;         
  return TRIP_STATUS_RANK[to] >= TRIP_STATUS_RANK[from];
}


function nextTripStatuses(currentStatus) {
  return TRIP_ALL_STATUSES.filter(s => canTransitionTripStatus(currentStatus, s));
}


function canUpdateTripStatus(t) {
  if (!t) return false;
  if (isAdmin() || isClerk() || isDispatch()) return true;
  if (isDriver()) { const d = myDriverRecord(); return !!d && t.driverId === d.id; }
  return false;
}


async function applyTripStatus(t, status, actorLabel) {
  if (!canUpdateTripStatus(t)) return { ok:false, reason:'permission' };
  if (!canTransitionTripStatus(t.status, status)) return { ok:false, reason:'transition', from:t.status };

  const old = t.status;
  const truck  = state.db.trucks.find(tr=>tr.id===t.truckId);
  const driver = state.db.drivers.find(d=>d.id===t.driverId);
  const truckSnapshot  = truck  ? { ...truck }  : null;
  const driverSnapshot = driver ? { ...driver } : null;

  t.status = status;

  let truckChanged = false, driverChanged = false;
  let newMaintenanceTicket = null;
  if (status === 'breakdown') {
    if (truck) { truck.status = 'breakdown'; truckChanged = true; }

    const existing = state.db.maintenance.find(m=>m.truckId===t.truckId && m.status!=='resolved' && m.type==='Breakdown');
    if (existing) {
      existing.reportedByDriver = existing.reportedByDriver || isDriver();
    } else {
      newMaintenanceTicket = {
        id: uid('MNT'), truckId: t.truckId, type:'Breakdown',
        desc: `Breakdown reported on trip ${t.container} (${t.origin} → ${t.dest}).`,
        priority:'critical', status:'open', date:new Date().toISOString(),
        cost:0, tech:'', resolvedDate:null, reportedByDriver: isDriver(),
      };
      state.db.maintenance.push(newMaintenanceTicket);
    }
  }
  if (status === 'completed') {
    if (truck && truck.status ==='on_trip')  { truck.status  = 'available'; truckChanged = true; }
    if (driver && driver.status==='on_trip')  { driver.status = 'available'; driverChanged = true; }
    if (driver) { driver.load = null; driver.tripsToday++; driverChanged = true; }
  }


  try {
    const writes = [ supabase.from('trips').update(tripToRow(t)).eq('id', t.id) ];
    if (truck  && truckChanged)  writes.push(supabase.from('trucks').update(truckToRow(truck)).eq('id', truck.id));
    if (driver && driverChanged) writes.push(supabase.from('drivers').update(driverToRow(driver)).eq('id', driver.id));
    const results = await Promise.all(writes);
    const failed = results.find(r => r && r.error);
    if (failed) throw failed.error;
    if (newMaintenanceTicket) {
      const { error: mErr } = await supabase.from('maintenance').insert(maintToRow(newMaintenanceTicket));
      if (mErr) throw mErr;
    }
  } catch (e) {
    console.error('Trip status save failed:', e && e.message, e);

    t.status = old;
    if (truck  && truckSnapshot)  Object.assign(truck,  truckSnapshot);
    if (driver && driverSnapshot) Object.assign(driver, driverSnapshot);
    if (newMaintenanceTicket) {
      const idx = state.db.maintenance.indexOf(newMaintenanceTicket);
      if (idx > -1) state.db.maintenance.splice(idx, 1);
    }
    buildBadges();
    return { ok:false, reason:'save', error:e, message: (e && e.message) || '' };
  }

  if (status === 'breakdown') buildAlerts();
  buildBadges();
  addAudit(actorLabel, 'Trip Status Update', `${t.container} ${old} → ${status}`);


  if (status === 'completed' && t.storageZoneId && !t.storageReleased) {
    try {
      const res = await window.bookingDocs.releaseStorageForTrip(t.id);
      if (res && res.released) t.storageReleased = true;
    } catch (e) {
      console.error('Depot storage release failed:', e && e.message, e);
      toast(`Trip completed, but couldn't auto-release depot storage — release it manually from DepOps (${(e && e.message) || 'error'})`, 'warning', 6000);
    }
  }

  return { ok:true, old, status };
}


async function quickSetTripStatus(id, status) {
  const t = state.db.trips.find(t=>t.id===id);
  if (!t) { toast('Trip not found', 'error'); return; }
  if (!canUpdateTripStatus(t)) { toast('You do not have permission to update this trip', 'error'); return; }
  toast('Saving…', 'info', 1200);
  const res = await applyTripStatus(t, status, state.profile.username);
  if (!res.ok) {
    if (res.reason === 'transition') {
      toast(`Cannot change status from "${res.from.replace('_',' ')}" to "${status.replace('_',' ')}" — trips can only move forward`, 'error');
    } else if (res.reason === 'save') {
      toast(res.message ? `Could not save this update — ${res.message}` : 'Could not save this update — check your connection and try again', 'error', 5000);
    } else {
      toast('You do not have permission to update this trip', 'error');
    }
    return;
  }
  closeModal();
  if (document.getElementById('tripsList')) renderTrips(_tripFilter);
  toast(`Trip updated to ${status.replace('_',' ')}`, 'success');
}


const DRIVER_TRIP_STEPS = ['loaded','on_trip','offloaded','breakdown','completed'];
let _dpTab = 'trip';

function renderDriverPortal() {
  const p = state.profile;
  const av = document.getElementById('dp_driverAv'); if (av) av.textContent = initials(p?.name||'D');
  const nm = document.getElementById('dp_driverName'); if (nm) nm.textContent = p?.name||'Driver';
  const rl = document.getElementById('dp_driverRole'); if (rl) rl.textContent = roleLabel(p?.role);

  const body = document.getElementById('dp_body');
  if (!body) return;

  const driver = myDriverRecord();
  if (!driver) {
    body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚚</div><div class="empty-state-label">Your login isn't linked to a driver record yet. Ask an administrator to link it in Driver → Edit.</div></div>`;
    return;
  }


  checkGeoPermission().then(() => {
    if (driverShouldTrack(driver) && state.geoPermission !== 'denied') startDriverTracking();
    else if (!driverShouldTrack(driver)) stopDriverTracking();
    renderDutyBar();
  });
  renderDutyBar();

  body.innerHTML = `
    <div class="filter-row" style="margin-bottom:14px;flex-wrap:wrap">
      <button class="filter-btn${_dpTab==='trip'?' active':''}" onclick="dpSwitchTab('trip')">My Trip</button>
      <button class="filter-btn${_dpTab==='completed'?' active':''}" onclick="dpSwitchTab('completed')">Completed Trips</button>
      <button class="filter-btn${_dpTab==='fuel'?' active':''}" onclick="dpSwitchTab('fuel')">Fuel Log</button>
      <button class="filter-btn${_dpTab==='requisitions'?' active':''}" onclick="dpSwitchTab('requisitions')">Requisitions</button>
      <button class="filter-btn${_dpTab==='workshop'?' active':''}" onclick="dpSwitchTab('workshop')">Workshop</button>
      <button class="filter-btn${_dpTab==='shutouts'?' active':''}" onclick="dpSwitchTab('shutouts')">Shutouts</button>
    </div>
    <div id="dp_tabBody"></div>
  `;
  dpRenderTab(driver);
}

function dpSwitchTab(tab) { _dpTab = tab; renderDriverPortal(); }

function dpRenderTab(driver) {
  const el = document.getElementById('dp_tabBody');
  if (!el) return;
  if (_dpTab === 'trip')          return dpRenderTripTab(el, driver);
  if (_dpTab === 'completed')     return dpRenderCompletedTripsTab(el, driver);
  if (_dpTab === 'fuel')          return dpRenderFuelTab(el, driver);
  if (_dpTab === 'requisitions')  return dpRenderReqTab(el, driver);
  if (_dpTab === 'workshop')      return dpRenderWorkshopTab(el, driver);
  if (_dpTab === 'shutouts')      return dpRenderShutoutTab(el, driver);
}

/* ── My Trip tab ────────────────────────────────────────────────── */
function dpRenderTripTab(el, driver) {
  const truck = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  const myTrips = state.db.trips
    .filter(t=>t.driverId===driver.id && t.status!=='completed')
    .sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  const active = myTrips[0];

  el.innerHTML = `
    <div class="panel" style="margin-bottom:14px">
      <div class="panel-head"><span class="panel-title">My Truck</span>${truck?sbadge(truck.status):''}</div>
      <div style="padding:14px;font-size:13px;color:var(--text);display:flex;justify-content:space-between;align-items:center">
        <span>${truck ? `${truck.reg} — ${truck.make}` : 'No truck currently assigned'}</span>
        ${truck?`<button class="action-btn danger" style="flex-shrink:0" onclick="driverReportBreakdown('${truck.id}')">⚠ Report Breakdown</button>`:''}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Active Trip</span></div>
      <div style="padding:14px">
        ${active ? `
          <div style="margin-bottom:12px">
            <div class="mono" style="color:var(--gold);font-size:15px">${active.container}</div>
            <div style="font-size:12px;color:var(--text-2);margin-top:2px">${active.origin} → ${active.dest}</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">${active.workType} · ${active.ctype}</div>
            <div style="margin-top:8px">${sbadge(active.status)}</div>
          </div>
          <div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Update Trip Step (forward only)</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${nextTripStatuses(active.status).filter(s=>DRIVER_TRIP_STEPS.includes(s)).map(s=>`<button class="filter-btn" onclick="driverAdvanceTrip('${active.id}','${s}')">${s.replace('_',' ')}</button>`).join('') || '<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>'}
          </div>
        ` : '<div class="empty-state"><div class="empty-state-label">No active trip assigned right now</div></div>'}
      </div>
    </div>
  `;
}

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


function dpRenderCompletedTripsTab(el, driver) {
  const trips = state.db.trips
    .filter(t=>t.driverId===driver.id && t.status==='completed')
    .sort((a,b)=>new Date(b.eta)-new Date(a.eta));

  el.innerHTML = `
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Completed Trips</span><span class="panel-meta">${trips.length} total</span></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Container</th><th>Route</th><th>Type</th><th>Distance</th><th>Completed</th><th>Reference</th></tr></thead>
        <tbody>
          ${trips.length ? trips.map(t=>`<tr onclick="showTripDetail('${t.id}')" style="cursor:pointer"><td class="mono" style="color:var(--gold)">${t.container}</td><td>${t.origin} → ${t.dest}</td><td>${t.ctype}</td><td>${t.distance}km</td><td>${fmtDate(t.eta)}</td><td class="mono" style="font-size:10px;color:var(--text-3)">${t.ref}</td></tr>`).join('')
            : `<tr><td colspan="6" class="empty-td">No completed trips yet</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;
}

const GEO_PING_INTERVAL_MS = 10000;   
const ZONE_LOOKUP_INTERVAL_MS = 60000; 
let _lastZoneVal = null;
let _lastZoneFetch = 0;

function driverShouldTrack(driver) {
  if (!driver || !driver.truckId || driver.status === 'off_duty' || driver.status === 'suspended') return false;
  // A truck fitted with its own Wialon GPS tracker is tracked server-side —
  // don't also drain the driver's phone battery pinging duplicate positions.
  const truck = state.db?.trucks?.find(t => t.id === driver.truckId);
  if (truck?.wialonUnitId) return false;
  return true;
}


async function checkGeoPermission() {
  if (!navigator.permissions?.query) { state.geoPermission = 'unknown'; return; }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    state.geoPermission = status.state;
    if (!state._geoPermWatched) {
      state._geoPermWatched = true;
      status.onchange = () => {
        state.geoPermission = status.state;
        const driver = myDriverRecord();
        if (status.state === 'granted' && driverShouldTrack(driver)) startDriverTracking();
        if (status.state === 'denied') stopDriverTracking();
        renderDutyBar();
      };
    }
  } catch {
    state.geoPermission = 'unknown';
  }
}


function requestLocationAccess() {
  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) return;
  if (!navigator.geolocation) { toast('This device does not support GPS location', 'error'); return; }
  toast('Requesting location access…', 'info', 1500);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.geoPermission = 'granted';
      onDriverPosition(pos);
      startDriverTracking();
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) state.geoPermission = 'denied';
      onDriverGeoError(err);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function startDriverTracking() {
  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) { stopDriverTracking(); return; }
  if (state.geoWatchId != null) return; // already running
  if (!navigator.geolocation) { toast('This device does not support GPS location', 'error'); return; }
  if (state.geoPermission === 'denied') { renderDutyBar(); return; } // don't spam the prompt if already blocked
  state.geoWatchId = navigator.geolocation.watchPosition(onDriverPosition, onDriverGeoError, {
    enableHighAccuracy: true, maximumAge: 5000, timeout: 20000,
  });
}

async function stopDriverTracking(clearRemote) {
  if (state.geoWatchId != null) {
    navigator.geolocation.clearWatch(state.geoWatchId);
    state.geoWatchId = null;
  }
  state.trackingActive = false;
  if (clearRemote) {
    const driver = myDriverRecord();
    if (driver?.truckId) {
      const { error } = await supabase.from('tracking_positions').delete().eq('truck_id', driver.truckId);
      if (error) console.error('tracking_positions clear failed:', error.message);
      delete state.db.trackingPositions[driver.truckId];
      if (state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
    }
  }
  renderDutyBar();
}

function headingToCompass(deg) {
  if (deg == null || isNaN(deg)) return '—';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

async function onDriverPosition(pos) {
  const now = Date.now();
  if (now - state.lastGeoSend < GEO_PING_INTERVAL_MS) return; // throttle
  state.lastGeoSend = now;

  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) { stopDriverTracking(); return; }

  const { latitude, longitude, speed, heading } = pos.coords;
  const kph = (speed != null && speed >= 0 && !isNaN(speed)) ? Math.round(speed * 3.6) : 0;
  const hd  = headingToCompass(heading);

  let zone = _lastZoneVal;
  if (!zone || now - _lastZoneFetch > ZONE_LOOKUP_INTERVAL_MS) {
    zone = await reverseGeocodeZone(latitude, longitude);
    _lastZoneVal = zone;
    _lastZoneFetch = now;
  }

  const row = { truck_id: driver.truckId, lat: latitude, lng: longitude, speed: kph, heading: hd, zone, last_update: new Date().toISOString(), source: 'driver_app' };
  const { error } = await supabase.from('tracking_positions').upsert(row, { onConflict: 'truck_id' });
  if (error) {
    console.error('tracking ping failed:', error.message);
  } else {
    state.db.trackingPositions[driver.truckId] = { lat: latitude, lng: longitude, speed: kph, heading: hd, zone, lastUpdate: row.last_update, source: 'driver_app' };
    if (state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
  }
  state.trackingActive = true;
  renderDutyBar();
}

function onDriverGeoError(err) {
  state.trackingActive = false;
  let msg = 'GPS signal lost — retrying…';
  if (err.code === err.PERMISSION_DENIED) { msg = 'Location permission denied — enable location access to allow tracking'; state.geoPermission = 'denied'; }
  else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location unavailable — check your device GPS/network';
  toast(msg, 'error', 4500);
  renderDutyBar();
}

let _nominatimQueue = Promise.resolve();
function reverseGeocodeZone(lat, lng) {
  const run = _nominatimQueue.then(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=14&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      const addr = data.address || {};
      const pick = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.town || addr.city || addr.village;
      return pick || (data.display_name || '').split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } finally {

      await new Promise(r => setTimeout(r, 1100));
    }
  });
  _nominatimQueue = run;
  return run;
}


/* ──────────────────────────────────────────────────────────────────
   § WIALON GPS INTEGRATION
   Trucks fitted with a dedicated Wialon AVL unit (trucks.wialon_unit_id
   set) get their live position pulled from the Wialon Remote API on a
   timer instead of relying on the driver's phone. Configured under
   Settings → GPS Tracking (Wialon): enable toggle, host, API token —
   all stored in app_settings (wialon_enabled / wialon_host / wialon_token).
   Positions are written into the same tracking_positions table the
   driver-phone flow uses, tagged source:'wialon', so the live map,
   tracking board and everything downstream works unchanged.
────────────────────────────────────────────────────────────────── */
const WIALON_POLL_INTERVAL_MS = 25000;

let _wialonSid = null;
let _wialonPollTimer = null;
let _wialonLastZoneFetch = {};

function wialonConfig() {
  const s = state.db?.settings || {};
  return {
    enabled: !!s.wialonEnabled,
    token: (s.wialonToken || '').trim(),
    host: (s.wialonHost || 'https://hst-api.wialon.com').trim().replace(/\/+$/, ''),
  };
}

function wialonTrackedTrucks() {
  return (state.db?.trucks || []).filter(t => t.wialonUnitId);
}

async function wialonApi(host, svc, params, sid) {
  const url = `${host}/wialon/ajax.html?svc=${encodeURIComponent(svc)}&params=${encodeURIComponent(JSON.stringify(params))}${sid ? `&sid=${encodeURIComponent(sid)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wialon HTTP ${res.status}`);
  const data = await res.json();
  if (data && typeof data.error === 'number' && data.error !== 0) {
    const err = new Error(`Wialon error ${data.error}`);
    err.wialonCode = data.error;
    throw err;
  }
  return data;
}

// token/login — exchanges the long-lived API token for a session id (sid/eid).
async function wialonLogin(force) {
  const { token, host } = wialonConfig();
  if (!token) throw new Error('No Wialon API token configured');
  if (_wialonSid && !force) return _wialonSid;
  const data = await wialonApi(host, 'token/login', { token });
  if (!data?.eid) throw new Error('Wialon login did not return a session id');
  _wialonSid = data.eid;
  return _wialonSid;
}

// Pulls base info + last known position (flags 1 + 1024 = 1025) for every
// avl_unit visible to this token in one request, then the caller filters
// down to the units mapped to our trucks.
async function wialonFetchAllUnits() {
  const { host } = wialonConfig();
  const spec = { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' };
  let sid = await wialonLogin();
  try {
    return await wialonApi(host, 'core/search_items', { spec, force: 1, flags: 1025, from: 0, to: 0 }, sid);
  } catch (e) {
    if (e.wialonCode === 1 || e.wialonCode === 4) { // 1=not logged in, 4=invalid session — retry once with a fresh login
      sid = await wialonLogin(true);
      return await wialonApi(host, 'core/search_items', { spec, force: 1, flags: 1025, from: 0, to: 0 }, sid);
    }
    throw e;
  }
}


async function pollWialonPositions() {
  const cfg = wialonConfig();
  if (!cfg.enabled || !cfg.token) return;

  const trackedTrucks = wialonTrackedTrucks();
  if (!trackedTrucks.length) return;

  let result;
  try {
    result = await wialonFetchAllUnits();
  } catch (e) {
    console.warn('Wialon poll failed:', e.message);
    return;
  }

  const byId = {};
  (result?.items || []).forEach(u => { byId[String(u.id)] = u; });

  let changed = false;
  for (const truck of trackedTrucks) {
    const unit = byId[String(truck.wialonUnitId)];
    const p = unit?.pos;
    if (!p) continue; // unit not visible to this token, or no fix reported yet

    const speed = Math.max(0, Math.round(p.s || 0));
    const heading = headingToCompass(p.c);

    let zone = state.db.trackingPositions?.[truck.id]?.zone;
    const zoneStale = !zone || (Date.now() - (_wialonLastZoneFetch[truck.id] || 0) > ZONE_LOOKUP_INTERVAL_MS);
    if (zoneStale) {
      try { zone = await reverseGeocodeZone(p.y, p.x); } catch { /* keep previous zone on failure */ }
      _wialonLastZoneFetch[truck.id] = Date.now();
    }

    const lastUpdate = p.t ? new Date(p.t * 1000).toISOString() : new Date().toISOString();
    const row = { truck_id: truck.id, lat: p.y, lng: p.x, speed, heading, zone, last_update: lastUpdate, source: 'wialon' };
    const { error } = await supabase.from('tracking_positions').upsert(row, { onConflict: 'truck_id' });
    if (error) { console.error('Wialon tracking write failed:', truck.reg, error.message); continue; }
    state.db.trackingPositions[truck.id] = { lat: p.y, lng: p.x, speed, heading, zone, lastUpdate, source: 'wialon' };
    changed = true;
  }

  if (changed && state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
}

function startWialonPolling() {
  const cfg = wialonConfig();
  if (!cfg.enabled || !cfg.token || !wialonTrackedTrucks().length) { stopWialonPolling(); return; }
  if (_wialonPollTimer) return;
  pollWialonPositions();
  _wialonPollTimer = setInterval(pollWialonPositions, WIALON_POLL_INTERVAL_MS);
}

function stopWialonPolling() {
  if (_wialonPollTimer) { clearInterval(_wialonPollTimer); _wialonPollTimer = null; }
  _wialonSid = null;
}


async function testWialonConnection() {
  const hostEl  = document.getElementById('st_wialonHost');
  const tokenEl = document.getElementById('st_wialonToken');
  const host  = (hostEl?.value || 'https://hst-api.wialon.com').trim().replace(/\/+$/, '');
  const token = (tokenEl?.value || '').trim();
  if (!token) { toast('Enter a Wialon API token first', 'error'); return; }
  toast('Testing Wialon connection…', 'info', 1500);
  try {
    const data = await wialonApi(host, 'token/login', { token });
    if (!data?.eid) throw new Error('No session returned');
    _wialonSid = data.eid;
    toast(`Connected to Wialon${data.user?.nm ? ' as ' + data.user.nm : ''} ✓`, 'success');
  } catch (e) {
    toast(`Wialon connection failed — ${e.message}`, 'error');
  }
}

function saveWialonSettings() {
  const enabled = !!document.getElementById('st_wialonEnabled')?.checked;
  const host    = (document.getElementById('st_wialonHost')?.value || '').trim() || 'https://hst-api.wialon.com';
  const token   = (document.getElementById('st_wialonToken')?.value || '').trim();

  state.db.settings = state.db.settings || {};
  state.db.settings.wialonEnabled = enabled;
  state.db.settings.wialonHost = host;
  state.db.settings.wialonToken = token;
  scheduleSave();
  addAudit(state.profile.username, 'Wialon Settings', `GPS integration ${enabled ? 'enabled' : 'disabled'}`);
  toast('Wialon settings saved', 'success');
  renderSettings();
  if (enabled) startWialonPolling(); else stopWialonPolling();
}

// Inline "Wialon Unit ID" editor on the truck detail modal (admin only).
function saveTruckWialonId(id) {
  const t = state.db.trucks.find(t => t.id === id);
  if (!t) return;
  const val = (document.getElementById('tw_wialonId')?.value || '').trim();
  t.wialonUnitId = val;
  scheduleSave();
  addAudit(state.profile.username, 'Wialon Unit Linked', `${t.reg} → ${val || '(cleared)'}`);
  toast(val ? `${t.reg} linked to Wialon unit ${val}` : `${t.reg} unlinked from Wialon`, 'success');
  showTruckDetail(id);
  if (state.db.settings?.wialonEnabled) startWialonPolling();
}


function dpToggleDuty() {
  const driver = myDriverRecord();
  if (!driver) return;
  const onDuty = driver.status !== 'off_duty' && driver.status !== 'suspended';
  if (onDuty) {
    openModal('Go Off Duty', `
      <div class="ops-notice" style="margin-bottom:14px">Going off duty will immediately stop live GPS tracking for your truck and mark you unavailable for new trips. You can go back on duty any time.</div>
      <button class="submit-btn" style="background:var(--red)" onclick="confirmGoOffDuty()">Confirm — Go Off Duty</button>
    `);
  } else {
    const hasActiveTrip = state.db.trips.some(t => t.driverId === driver.id && t.status !== 'completed');
    driver.status = hasActiveTrip ? 'on_trip' : 'available';
    scheduleSave();
    addAudit(state.profile.username, 'Duty Status', `${driver.name} went ON duty`);
    toast('You are now on duty — location tracking started', 'success');
    renderDriverPortal();
  }
}

function confirmGoOffDuty() {
  const driver = myDriverRecord();
  if (!driver) return;
  driver.status = 'off_duty';
  scheduleSave();
  addAudit(state.profile.username, 'Duty Status', `${driver.name} went OFF duty`);
  closeModal();
  stopDriverTracking(true);
  toast('You are now off duty — location tracking stopped', 'info');
  renderDriverPortal();
}


function renderDutyBar() {
  const el = document.getElementById('dp_dutyBar');
  if (!el) return;
  const driver = myDriverRecord();
  if (!driver) { el.innerHTML = ''; return; }
  const onDuty = driver.status !== 'off_duty' && driver.status !== 'suspended';
  const tracking = state.trackingActive && onDuty;
  const pos = driver.truckId ? state.db.trackingPositions[driver.truckId] : null;
  const needsAccess = onDuty && driver.truckId && !tracking && state.geoPermission !== 'denied';
  const blocked = onDuty && driver.truckId && state.geoPermission === 'denied';

  let sub;
  if (!driver.truckId) sub = 'No truck assigned — tracking unavailable';
  else if (!onDuty) sub = 'Tracking stopped';
  else if (blocked) sub = 'Location access is blocked for this site';
  else if (tracking && pos) sub = `Live · ${pos.zone} · updated ${timeAgo(pos.lastUpdate)}`;
  else if (needsAccess) sub = 'Location access needed to start tracking';
  else sub = 'Acquiring GPS signal…';

  el.innerHTML = `
    <div class="duty-bar">
      <div class="duty-status">
        <span class="duty-dot ${tracking ? 'live' : ''}"></span>
        <div>
          <div class="duty-label">${onDuty ? (driver.status === 'on_trip' ? 'On Duty · On Trip' : 'On Duty · Available') : 'Off Duty'}</div>
          <div class="duty-sub">${sub}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
        ${needsAccess ? `<button class="action-btn duty-cta" onclick="requestLocationAccess()">📍 Enable Location Tracking</button>` : ''}
        <button class="action-btn ${onDuty ? 'danger' : ''}" onclick="dpToggleDuty()">${onDuty ? 'Go Off Duty' : 'Go On Duty'}</button>
      </div>
    </div>
    ${blocked ? `
      <div class="duty-blocked-banner">
        <b>Location is blocked for this site.</b> Your truck can't be tracked until you re-enable it:
        <ul>
          <li><b>Chrome/Android:</b> tap the lock icon next to the address bar → Permissions → Location → Allow</li>
          <li><b>Safari/iOS:</b> Settings app → Safari (or this app, if installed to Home Screen) → Location → Allow</li>
        </ul>
        Then tap <b>Enable Location Tracking</b> above again.
      </div>
    ` : ''}
  `;
}


function driverReportBreakdown(truckId) {
  openModal('Report Breakdown', `
    <div class="ops-notice" style="margin-bottom:12px">This will immediately flag your truck as broken down and alert dispatch/admin as a priority.</div>
    <div class="fg"><label>What's wrong?</label><textarea id="bd_desc" rows="3" placeholder="Describe the breakdown…"></textarea></div>
    <div class="fg"><label>Location</label><input id="bd_loc" placeholder="e.g. B8 Highway, near Miritini"/></div>
    <button class="submit-btn" onclick="submitDriverBreakdown('${truckId}')">🚨 Submit Breakdown Report →</button>
  `);
}

async function submitDriverBreakdown(truckId) {
  const desc = document.getElementById('bd_desc').value.trim();
  if (!desc) { toast('Please describe the issue', 'error'); return; }
  const loc = sanitize(document.getElementById('bd_loc').value.trim());
  const truck = state.db.trucks.find(t=>t.id===truckId);
  const truckSnapshot = truck ? { ...truck } : null;
  if (truck) truck.status = 'breakdown';
  const ticket = {
    id: uid('MNT'), truckId, type:'Breakdown',
    desc: loc ? `${desc} (Location: ${loc})` : desc,
    priority:'critical', status:'open', date:new Date().toISOString(),
    cost:0, tech:'', resolvedDate:null, reportedByDriver:true,
  };
  state.db.maintenance.push(ticket);
  buildBadges(); buildAlerts();
  toast('Saving…', 'info', 1200);

  const res = await saveNowAwaited();
  if (!res.ok) {
    // Roll back the optimistic local change so the UI matches reality —
    // a breakdown report is safety-critical and must not silently "succeed".
    if (truck && truckSnapshot) Object.assign(truck, truckSnapshot);
    const idx = state.db.maintenance.indexOf(ticket);
    if (idx > -1) state.db.maintenance.splice(idx, 1);
    buildBadges(); buildAlerts();
    toast('Could not submit breakdown report — check your connection and try again', 'error', 5000);
    return;
  }

  addAudit(state.profile.username, 'Driver Breakdown Report', `${truckName(truckId)} — ${desc.slice(0,60)}`);
  closeModal();
  toast('Breakdown reported — dispatch notified', 'error');
  renderDriverPortal();
}


function dpRenderFuelTab(el, driver) {
  const logs = state.db.fuel.filter(f=>f.driverId===driver.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">Log Fuel Fill-up</div>
      <div class="form-card-body">
        <div class="form-row-2">
          <div class="fg"><label>Litres</label><input id="dp_f_litres" type="number" placeholder="180"/></div>
          <div class="fg"><label>Price / Litre (KSh)</label><input id="dp_f_price" type="number" placeholder="155"/></div>
        </div>
        <div class="form-row-2">
          <div class="fg"><label>Station</label><input id="dp_f_station" placeholder="Kobil Shimanzi"/></div>
          <div class="fg"><label>Odometer (km)</label><input id="dp_f_odo" type="number" placeholder="142300"/></div>
        </div>
        <div class="fg"><label>Receipt No. <span class="label-optional">(optional)</span></label><input id="dp_f_receipt" placeholder="RCP-000"/></div>
        <button class="submit-btn" onclick="dpAddFuelLog()">Save Fuel Log →</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Fuel History</span><span class="panel-meta">${logs.length} entries</span></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Date</th><th>Litres</th><th>Price/L</th><th>Total</th><th>Station</th></tr></thead>
        <tbody>${logs.map(f=>`<tr><td class="mono" style="font-size:10px">${fmtDate(f.date)}</td><td class="mono">${fmt(f.litres)} L</td><td class="mono">${fmt(f.pricePerLitre)}</td><td class="mono" style="color:var(--gold);font-weight:700">${fmtKsh(f.litres*f.pricePerLitre)}</td><td style="font-size:11px;color:var(--text-3)">${f.station}</td></tr>`).join('')||`<tr><td colspan="5" class="empty-td">No fuel logs yet</td></tr>`}</tbody>
      </table></div>
    </div>
  `;
}

function dpAddFuelLog() {
  const driver = myDriverRecord();
  if (!driver) return;
  const litres = parseFloat(document.getElementById('dp_f_litres').value)||0;
  const price  = parseFloat(document.getElementById('dp_f_price').value)||0;
  if (litres<=0 || price<=0) { toast('Litres and price are required', 'error'); return; }
  if (litres > 1000) { toast('Litres exceed reasonable limit (1000L)', 'error'); return; }
  const log = {
    id: uid('FUEL'), truckId: driver.truckId||null, driverId: driver.id,
    date: new Date().toISOString(), litres, pricePerLitre: price,
    station: sanitize(document.getElementById('dp_f_station').value.trim())||'Unknown',
    odometer: Math.max(0, parseInt(document.getElementById('dp_f_odo').value)||0),
    receipt: document.getElementById('dp_f_receipt').value.trim()||uid('RCP'),
  };
  state.db.fuel.push(log);
  const t = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  if (t) { t.fuelPct = Math.min(100, Math.round((litres/400)*100 + t.fuelPct)); t.mileage = log.odometer||t.mileage; }
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Log (Driver)', `${truckName(driver.truckId)} — ${litres}L at KSh ${price}/L`);
  toast(`Fuel log saved — ${fmtKsh(litres*price)}`, 'success');
  renderDriverPortal();
}


function dpRenderReqTab(el, driver) {
  const mine = state.db.requisitions.filter(r=>r.requesterId===state.profile.id || r.requester===state.profile.name || r.requester===driver.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">New Requisition</div>
      <div class="form-card-body">
        <div class="form-row-2">
          <div class="fg"><label>Category</label><select id="dp_rq_cat"><option>Fuel Advance</option><option>Tyre Parts</option><option>Tool Purchase</option><option>Medical</option><option>Lubricants</option><option>Other</option></select></div>
          <div class="fg"><label>Amount (KSh)</label><input id="dp_rq_amt" type="number" placeholder="0"/></div>
        </div>
        <div class="fg"><label>Items / Description</label><textarea id="dp_rq_items" rows="3" placeholder="List what is needed…"></textarea></div>
        <div class="fg"><label>Notes</label><input id="dp_rq_notes" placeholder="Additional context…"/></div>
        <button class="submit-btn" onclick="dpSaveRequisition()">Submit Requisition →</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Requisitions</span><span class="panel-meta">${mine.length}</span></div>
      <div>${mine.map(r=>`<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${r.category}</div><div class="req-meta">${r.id} · ${fmtDate(r.date)}</div></div><div style="text-align:right">${sbadge(r.status)}<div class="req-amount" style="margin-top:4px">${fmtKsh(r.amount)}</div></div></div><div class="req-items">${r.items}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No requisitions submitted yet</div></div>'}</div>
    </div>
  `;
}

function dpSaveRequisition() {
  const items = document.getElementById('dp_rq_items').value.trim();
  const amt   = Math.max(0, parseInt(document.getElementById('dp_rq_amt').value)||0);
  if (!items||!amt) { toast('Items and amount required','error'); return; }
  if (!state.profile?.id) { toast('Session error — please log in again', 'error'); return; }
  state.db.requisitions.push({
    id: uid('REQ'), requester: state.profile.name, requesterId: state.profile.id,
    category: document.getElementById('dp_rq_cat').value,
    items, amount: amt,
    notes: sanitize(document.getElementById('dp_rq_notes').value.trim()),
    date: new Date().toISOString(), status:'pending',
    approver:null, approvedDate:null,
  });
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Requisition Submitted (Driver)', `${items.slice(0,50)}…`);
  toast('Requisition submitted — pending approval', 'success');
  renderDriverPortal();
}


function dpRenderWorkshopTab(el, driver) {
  const truck = driver.truckId ? state.db.trucks.find(t=>t.id===driver.truckId) : null;
  const mine = truck ? state.db.workshop.filter(w=>w.truckId===truck.id).sort((a,b)=>new Date(b.reported)-new Date(a.reported)) : [];
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">Report Vehicle Issue</div>
      <div class="form-card-body">
        ${!truck ? '<div class="ops-notice">No truck currently assigned — an admin must assign one before you can log a workshop job.</div>' : `
        <div class="fg"><label>Truck</label><div class="mono" style="padding:8px;background:var(--surface);border-radius:5px;color:var(--gold)">${truck.reg} — ${truck.make}</div></div>
        <div class="fg"><label>Job Title</label><input id="dp_ws_title" placeholder="Describe the issue…"/></div>
        <div class="fg"><label>Description</label><textarea id="dp_ws_desc" rows="3" placeholder="Detailed description…"></textarea></div>
        <button class="submit-btn" onclick="dpSaveWorkshopJob('${truck.id}')">Submit Job Card →</button>
        `}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Truck's Workshop Jobs</span><span class="panel-meta">${mine.length}</span></div>
      <div>${mine.map(w=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${w.title}</div><div style="font-size:10.5px;color:var(--text-3);margin-top:2px">${w.id}</div></div>${sbadge(w.status)}</div><div style="font-size:11.5px;color:var(--text-2)">${w.desc}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No workshop jobs for your truck</div></div>'}</div>
    </div>
  `;
}

function dpSaveWorkshopJob(truckId) {
  const title = document.getElementById('dp_ws_title').value.trim();
  if (!title) { toast('Job title required','error'); return; }
  state.db.workshop.push({
    id: uid('WS'), truckId,
    title, desc: sanitize(document.getElementById('dp_ws_desc').value.trim()),
    tech:'', parts:'', labour:0, total:0,
    status:'reported', reported: new Date().toISOString(), diagnosed:null,
  });
  scheduleSave();
  addAudit(state.profile.username, 'Workshop Job Reported (Driver)', title);
  toast('Job card submitted to workshop', 'success');
  renderDriverPortal();
}

/* ── Shutouts tab ───────────────────────────────────────────────── */
function dpRenderShutoutTab(el, driver) {
  const mine = state.db.shutouts.filter(s=>s.driverId===driver.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  el.innerHTML = `
    <div class="form-card" style="margin-bottom:14px">
      <div class="form-card-head">Report Shutout</div>
      <div class="form-card-body">
        <div class="fg"><label>Container No.</label><input id="dp_sh_cont" list="containerHistory" placeholder="MSCU1234566" oninput="markContainerValidity(this)"/></div>
        <div class="form-row-2">
          <div class="fg"><label>Vessel</label><input id="dp_sh_vessel" placeholder="MSC VESSEL NAME"/></div>
          <div class="fg"><label>Voyage No.</label><input id="dp_sh_voyage" placeholder="VA-001"/></div>
        </div>
        <div class="fg"><label>Shipping Line</label><select id="dp_sh_line">${state.db.shippingLines.map(l=>`<option value="${l.id}">${l.code}</option>`).join('')}</select></div>
        <div class="fg"><label>Reason</label><input id="dp_sh_reason" placeholder="Why was this shutout?"/></div>
        <div class="fg"><label>Notes</label><textarea id="dp_sh_notes" rows="2"></textarea></div>
        <button class="submit-btn" onclick="dpSaveShutout('${driver.id}')">Flag Shutout →</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">My Shutout Reports</span><span class="panel-meta">${mine.length}</span></div>
      <div>${mine.map(s=>`<div class="shutout-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">${s.container}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${s.vessel} · Voyage ${s.voyage}</div></div>${sbadge(s.status)}</div><div style="font-size:11.5px;color:var(--text-2)">Reason: ${s.reason}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No shutouts reported yet</div></div>'}</div>
    </div>
  `;
}

function dpSaveShutout(driverId) {
  const cont = document.getElementById('dp_sh_cont').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  if (!/^[A-Z0-9]{4,12}$/.test(cont)) { toast('Invalid container format', 'error'); return; }
  const driver = state.db.drivers.find(d=>d.id===driverId);
  state.db.shutouts.push({
    id: uid('SHT'), container: cont,
    line: document.getElementById('dp_sh_line').value,
    vessel: sanitize(document.getElementById('dp_sh_vessel').value.trim()),
    voyage: sanitize(document.getElementById('dp_sh_voyage').value.trim()),
    reason: sanitize(document.getElementById('dp_sh_reason').value.trim()),
    truckId: driver?.truckId||null, driverId,
    notes: sanitize(document.getElementById('dp_sh_notes').value.trim()),
    date: new Date().toISOString(), status:'open',
  });
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Shutout Flagged (Driver)', cont);
  toast('Shutout flagged', 'success');
  renderDriverPortal();
}


let _dispatchEditingTripId = null;   
let _dispatchContainerImages = [];   

function renderDispatch() {
  populateDispatchSelects();
  renderDispatchQueue();
  renderAwaitingDispatch();
}

function populateDispatchSelects() {
  const avlTrucks  = state.db.trucks.filter(t=>t.status==='available');
  const avlDrivers = state.db.drivers.filter(d=>d.status==='available');
  fillSelect('d_truck',  avlTrucks,  t=>[t.id, `${t.reg} — ${t.make} (Fuel: ${t.fuelPct}%)`]);
  fillSelect('d_driver', avlDrivers, d=>[d.id, d.name]);
  fillSelect('d_line',   state.db.shippingLines.filter(l=>l.active), l=>[l.id, `${l.code} — ${l.name}`]);
  populateSizeTypeSelects('d_size', 'd_type');
}

function fillSelect(id, arr, mapFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<option value="">Select…</option>` + arr.map(i=>{ const [v,l]=mapFn(i); return `<option value="${v}">${l}</option>`; }).join('');
}

function renderDispatchQueue() {
  const pending = state.db.trips.filter(t=>t.status==='active').slice(-8).reverse();
  const container = document.getElementById('dispatchQueue');
  if (!container) return;
  container.innerHTML = `<div class="panel"><div class="panel-head"><span class="panel-title">Dispatch Queue</span><span class="panel-meta">${pending.length} active</span></div><div>${pending.map(t=>`<div class="dispatch-queue-item" onclick="showTripDetail('${t.id}')"><div class="dqi-ref">${t.container.slice(-7)}</div><div class="dqi-route"><div style="font-size:12px;font-weight:600;color:var(--text)">${t.origin}→${t.dest}</div><div style="font-size:10px;color:var(--text-3)">${truckName(t.truckId)}</div></div>${sbadge(t.status)}<div class="dqi-time">${timeAgo(t.startTime)}</div></div>`).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-label">No dispatches yet</div></div>'}</div></div>`;
}


function awaitingDispatchTrips() {
  return state.db.trips.filter(t => isTripLive(t) && (!t.truckId || !t.driverId));
}


function refreshAwaitingDispatchUI() {
  buildBadges();
  refreshContainerHistory();
  if (document.getElementById('awaitingDispatchList')) renderAwaitingDispatch();
  if (document.getElementById('allocQueue'))            renderAllocAuto();
  if (document.getElementById('allocManualAwaitingList')) renderAllocAwaitingList('allocManualAwaitingList', 'allocManualAwaitingMeta');
}


function renderAllocAwaitingList(targetId, metaId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const rows = awaitingDispatchTrips().sort((a,b)=> new Date(b.startTime)-new Date(a.startTime));
  if (metaId) { const meta = document.getElementById(metaId); if (meta) meta.textContent = rows.length ? `${rows.length} awaiting` : ''; }
  el.innerHTML = rows.map(t => `
    <div class="dispatch-queue-item" style="cursor:default">
      <div class="dqi-ref">${(t.container||'').slice(-7)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${t.origin} → ${t.dest}</div>
        <div style="font-size:10px;color:var(--text-3)">${t.bookingId ? 'From public booking' : 'Needs truck & driver'} · ${t.workType}</div>
      </div>
      <button class="modal-btn primary" onclick="jumpToCompleteDispatch('${t.id}')">Match &amp; Dispatch →</button>
    </div>
  `).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">✅</div><div class="empty-state-label">Nothing awaiting dispatch</div></div>';
}


function jumpToCompleteDispatch(tripId) {
  showSection('dispatch', document.querySelector('[data-section="dispatch"]'));
  loadTripIntoDispatchForm(tripId);
}

function renderAwaitingDispatch() {
  const el = document.getElementById('awaitingDispatchList');
  const meta = document.getElementById('awaitingDispatchMeta');
  if (!el) return;
  const rows = awaitingDispatchTrips().sort((a,b)=> new Date(b.startTime)-new Date(a.startTime));
  if (meta) meta.textContent = rows.length ? `${rows.length} awaiting` : '';
  el.innerHTML = rows.map(t => `
    <div class="dispatch-queue-item" style="cursor:default">
      <div class="dqi-ref">${(t.container||'').slice(-7)}</div>
      <div class="dqi-route">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${t.origin} → ${t.dest}</div>
        <div style="font-size:10px;color:var(--text-3)">${t.bookingId ? 'From public booking' : 'Needs truck & driver'} · ${t.workType}</div>
      </div>
      <button class="modal-btn primary" onclick="loadTripIntoDispatchForm('${t.id}')">Complete Dispatch →</button>
    </div>
  `).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">✅</div><div class="empty-state-label">Nothing awaiting dispatch</div></div>';
}


function toggleDispatchOutwardType() {
  const workType = document.getElementById('d_worktype').value;
  const row = document.getElementById('d_outwardtype_row');
  if (!row) return;
  row.style.display = isOutwardWorkType(workType) ? 'block' : 'none';
  if (!isOutwardWorkType(workType)) {
    const sel = document.getElementById('d_outwardtype');
    if (sel) sel.value = '';
  }
}

function loadTripIntoDispatchForm(tripId) {
  const t = state.db.trips.find(tr=>tr.id===tripId);
  if (!t) { toast('Trip not found', 'error'); return; }
  _dispatchEditingTripId = tripId;
  _dispatchContainerImages = Array.isArray(t.containerImages) ? [...t.containerImages] : [];

  switchDispatchTab('single', document.querySelector('#sec-dispatch .filter-btn'));
  populateDispatchSelects();

  document.getElementById('d_truck').value    = t.truckId || '';
  document.getElementById('d_driver').value   = t.driverId || '';
  document.getElementById('d_container').value= t.container && !t.container.startsWith('PUB-') ? t.container : '';
  populateSizeTypeSelects('d_size', 'd_type', t.ctype || '20ft Dry');
  document.getElementById('d_worktype').value = t.workType || 'Port → Depot';
  document.getElementById('d_line').value     = t.shippingLine || '';
  const outwardTypeSel = document.getElementById('d_outwardtype');
  if (outwardTypeSel) outwardTypeSel.value = t.outwardType || '';
  toggleDispatchOutwardType();
  document.getElementById('d_origin').value   = t.origin && t.origin !== '—' ? t.origin : '';
  document.getElementById('d_dest').value     = t.dest && t.dest !== '—' ? t.dest : '';
  document.getElementById('d_distance').value = t.distance || '';
  document.getElementById('d_priority').value = t.priority || 'Normal';
  document.getElementById('d_ref').value      = t.ref || '';
  document.getElementById('d_notes').value    = t.notes || '';
  document.getElementById('d_eir').value        = t.eirNumber || '';
  document.getElementById('d_receiving').value  = t.receivingParty || '';
  document.getElementById('d_release_no').value = t.releaseOrderNo || '';
  document.getElementById('d_vessel').value     = t.vessel || '';
  document.getElementById('d_voyage').value     = t.voyage || '';
  const dateOutEl = document.getElementById('d_dateout'); if (dateOutEl) dateOutEl.value = '';

  renderContainerImgGrid();

  const banner = document.getElementById('dispatchEditBanner');
  if (banner) banner.style.display = 'flex';
  const btn = document.getElementById('dispatchSubmitBtn');
  if (btn) btn.textContent = 'Complete Dispatch →';

  document.getElementById('dispatchTabSingle').scrollIntoView({ behavior:'smooth', block:'start' });
}

function cancelDispatchEdit() {
  _dispatchEditingTripId = null;
  clearContainerImgs();
  clearDispatchReleaseFile();
  ['d_truck','d_driver','d_container','d_origin','d_dest','d_distance','d_ref','d_notes','d_eir','d_receiving','d_release_no','d_vessel','d_voyage','d_dateout'].forEach(id=>{ const el=document.getElementById(id); if (el) el.value=''; });
  const outwardTypeSel = document.getElementById('d_outwardtype');
  if (outwardTypeSel) outwardTypeSel.value = '';
  toggleDispatchOutwardType();
  populateDispatchSelects();
  const banner = document.getElementById('dispatchEditBanner');
  if (banner) banner.style.display = 'none';
  const btn = document.getElementById('dispatchSubmitBtn');
  if (btn) btn.textContent = 'Create Dispatch Order →';
  toast('Dispatch form cleared', 'info');
}

async function createDispatch() {
  const truck  = document.getElementById('d_truck').value;
  const driver = document.getElementById('d_driver').value;
  const cont   = document.getElementById('d_container').value.trim().toUpperCase();
  const origin = document.getElementById('d_origin').value.trim();
  const dest   = document.getElementById('d_dest').value.trim();
  const dist   = parseInt(document.getElementById('d_distance').value)||0;
  const editingId = _dispatchEditingTripId;


  if (!cont) {
    toast('Container number is required', 'error');
    return;
  }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) {
    toast(`Container number: ${contIssue}`, 'error');
    return;
  }
  const dupTrip = findLiveTripByContainer(cont, editingId || undefined);
  if (dupTrip) {
    toast(`${cont} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest}, status: ${dupTrip.status.replace('_',' ')}). Complete or resolve it before re-dispatching this container.`, 'error');
    return;
  }
  const dupTruck = truck ? state.db.trucks.find(tr=>tr.id===truck) : null;
  if (dupTruck && dupTruck.status !== 'available') {
    toast(`${dupTruck.reg} is no longer available (status: ${dupTruck.status.replace('_',' ')}). Refresh and pick another truck.`, 'error');
    return;
  }
  const dupDriver = driver ? state.db.drivers.find(d=>d.id===driver) : null;
  if (dupDriver && dupDriver.status !== 'available') {
    toast(`${dupDriver.name} is no longer available (status: ${dupDriver.status.replace('_',' ')}). Refresh and pick another driver.`, 'error');
    return;
  }
  const ctype    = composeCtype(document.getElementById('d_size').value, document.getElementById('d_type').value);
  const workType = document.getElementById('d_worktype').value;
  const line     = document.getElementById('d_line').value;
  const priority = document.getElementById('d_priority').value;
  const ref      = document.getElementById('d_ref').value.trim() || `REF-${Date.now().toString().slice(-6)}`;
  const notes    = sanitize(document.getElementById('d_notes').value.trim());
  const images   = [..._dispatchContainerImages];
  const eirNumber      = sanitize(document.getElementById('d_eir').value.trim());
  const receivingParty = sanitize(document.getElementById('d_receiving').value.trim());
  const releaseOrderNo = sanitize(document.getElementById('d_release_no').value.trim());
  const vessel          = sanitize(document.getElementById('d_vessel').value.trim());
  const voyage           = sanitize(document.getElementById('d_voyage').value.trim());
  const dateOutInput    = document.getElementById('d_dateout').value;
  const dateOut         = dateOutInput ? new Date(dateOutInput).toISOString() : new Date().toISOString();
  const releaseFile     = _dispatchReleaseFile;
  const outwardTypeSel = document.getElementById('d_outwardtype');
  const outwardType = isOutwardWorkType(workType) ? (outwardTypeSel ? outwardTypeSel.value : '') : null;
  if (isOutwardWorkType(workType) && !OUTWARD_TYPES.includes(outwardType)) {
    toast('Select an outward type — Repatriation to Port, Shippers/Export, or Sale units', 'error');
    return;
  }

  let newTripId = null;

  if (editingId) {

    const t = state.db.trips.find(tr=>tr.id===editingId);
    if (!t) { toast('That trip no longer exists — it may have been removed.', 'error'); cancelDispatchEdit(); return; }

    if (workType === 'Depot → Port' && !releaseFile) {
      try {
        const docs = await window.bookingDocs.documentsForTrip(t.id);
        const hasVerifiedRelease = docs.some(d => d.doc_type === 'release_order' && d.status === 'verified');
        if (!hasVerifiedRelease) {
          toast('A verified release order is required before this container can be dispatched to port — upload it below, or from DepOps → Outward / Repatriation.', 'error', 6000);
          return;
        }
      } catch (e) {
        toast(`Could not confirm release order status (${(e && e.message) || 'error'}) — dispatch blocked until this can be checked.`, 'error', 6000);
        return;
      }
    }

    Object.assign(t, { truckId: truck, driverId: driver, container: cont, ctype, workType, outwardType, origin, dest, shippingLine: line, distance: dist, priority, notes, ref, containerImages: images, eirNumber, receivingParty, releaseOrderNo, vessel, voyage, dateOut });
    const tk = state.db.trucks.find(tr=>tr.id===truck);
    const dv = state.db.drivers.find(d=>d.id===driver);
    if (tk) tk.status = 'on_trip';
    if (dv) { dv.status='on_trip'; dv.load=cont; dv.truckId=truck; }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, 'Dispatch Completed', `${cont} — ${origin} → ${dest}`);
    toast(`Dispatch completed — ${cont}`, 'success');
    newTripId = t.id;
    _dispatchEditingTripId = null;
    const banner = document.getElementById('dispatchEditBanner');
    if (banner) banner.style.display = 'none';
    const btn = document.getElementById('dispatchSubmitBtn');
    if (btn) btn.textContent = 'Create Dispatch Order →';
  } else {
    if (workType === 'Depot → Port' && !releaseFile) {
      toast('A release order is required for Depot → Port dispatches — upload it below, or complete this later once the container is matched to a trip in DepOps → Outward / Repatriation.', 'warning', 6000);
    }
    const etaMs = Date.now() + (dist/35)*3600000;
    const trip = {
      id: uid('TRIP'), truckId: truck, driverId: driver, container: cont,
      ctype, workType, outwardType, origin, dest, shippingLine: line,
      status: 'active', startTime: new Date().toISOString(),
      eta: new Date(etaMs).toISOString(), distance: dist, priority, notes, ref,
      containerImages: images, eirNumber, receivingParty, releaseOrderNo, vessel, voyage, dateOut,
    };
    state.db.trips.push(trip);
    newTripId = trip.id;
    const t = state.db.trucks.find(t=>t.id===truck);
    const d = state.db.drivers.find(d=>d.id===driver);
    if (t) t.status = 'on_trip';
    if (d) { d.status='on_trip'; d.load=cont; d.truckId=truck; }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, 'Dispatch Created', `${cont} — ${origin} → ${dest}`);
    toast(`Dispatch created — ${cont}`, 'success');
  }


  if (releaseFile && newTripId) {
    try {
      await saveNowAwaited();
      await window.bookingDocs.uploadTripDocument({ tripId: newTripId, docType: 'release_order', containerNo: cont, file: releaseFile, autoVerify: true });
      toast('Release order uploaded', 'success');
    } catch (e) {
      toast(`Dispatch saved, but release order upload failed: ${e.message || e}`, 'warning');
    }
  }

  clearContainerImgs();
  clearDispatchReleaseFile();
  ['d_truck','d_driver','d_container','d_origin','d_dest','d_distance','d_ref','d_notes','d_eir','d_receiving','d_release_no','d_vessel','d_voyage','d_dateout'].forEach(id=>{ const el=document.getElementById(id); if (el) el.value=''; });
  const outwardTypeResetSel = document.getElementById('d_outwardtype');
  if (outwardTypeResetSel) outwardTypeResetSel.value = '';
  toggleDispatchOutwardType();
  renderDispatch();
  refreshAwaitingDispatchUI();
}

let _dispatchReleaseFile = null;

function previewDispatchReleaseFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  _dispatchReleaseFile = file;
  const preview = document.getElementById('dispatchReleasePreview');
  preview.style.display = 'block';
  preview.innerHTML = `📄 ${esc(file.name)} <button class="pill" style="font-size:9px;margin-left:6px" onclick="clearDispatchReleaseFile()">✕ Remove</button>`;
}

function clearDispatchReleaseFile() {
  _dispatchReleaseFile = null;
  const fileInput = document.getElementById('d_release_file'); if (fileInput) fileInput.value = '';
  const preview = document.getElementById('dispatchReleasePreview');
  if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
}

function switchDispatchTab(tab, btn) {
  document.getElementById('dispatchTabSingle').style.display = tab==='single' ? 'block' : 'none';
  document.getElementById('dispatchTabBulk').style.display   = tab==='bulk'   ? 'block' : 'none';
  document.querySelectorAll('#sec-dispatch .filter-row .filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}


function previewContainerImgs(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  files.forEach(file => {
    if (!file.type.startsWith('image/')) { toast(`${file.name} is not an image — skipped`, 'error'); return; }
    if (file.size > 2*1024*1024) { toast(`${file.name} is too large — max 2MB. Skipped.`, 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      _dispatchContainerImages.push(ev.target.result);
      renderContainerImgGrid();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = ''; 
}

function renderContainerImgGrid() {
  const wrap = document.getElementById('containerImgPreview');
  const grid = document.getElementById('containerImgGrid');
  const label = document.getElementById('containerImgLabel');
  if (!wrap || !grid) return;
  if (!_dispatchContainerImages.length) {
    wrap.style.display = 'none';
    if (label) label.textContent = 'Upload container photos';
    return;
  }
  wrap.style.display = 'block';
  if (label) label.textContent = `${_dispatchContainerImages.length} photo${_dispatchContainerImages.length>1?'s':''} attached`;
  grid.innerHTML = _dispatchContainerImages.map((src,i)=>`<div class="container-img-thumb"><img src="${src}" /><button type="button" class="container-img-remove" onclick="removeContainerImgAt(${i})" title="Remove">✕</button></div>`).join('');
}

function removeContainerImgAt(idx) {
  _dispatchContainerImages.splice(idx,1);
  renderContainerImgGrid();
}

function clearContainerImgs() {
  _dispatchContainerImages = [];
  const fileInput = document.getElementById('d_container_img');
  if (fileInput) fileInput.value = '';
  renderContainerImgGrid();
}

function handleBulkDrop(e) {
  e.preventDefault();
  document.getElementById('bulkDispatchDrop').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processBulkFile(file);
}

function handleBulkFile(e) {
  const file = e.target.files[0];
  if (file) processBulkFile(file);
}


const _EXCEL_HEADER_HINTS = ['container','size','type','eir','date','delivering','vessel','voyage','guarantee','gurantee','shipping','line','receiving','release','transporter','dispatch','driver','truck','reg','condition','notes','remarks','bl','cargo','work'];
function readAllExcelSheetsAsRows(wb) {
  let lastHeader = null;
  const allRows = [];
  wb.SheetNames.forEach(sn => {
    const sheet = wb.Sheets[sn];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    if (!aoa.length) return;
    const firstRow = aoa[0].map(c => String(c == null ? '' : c).trim());
    const hintHits = firstRow.filter(c => _EXCEL_HEADER_HINTS.some(h => c.toLowerCase().replace(/[^a-z]/g,'').includes(h))).length;
    let header, dataRows;
    if (hintHits >= 2) {
      header = firstRow;
      dataRows = aoa.slice(1);
      lastHeader = header;
    } else if (lastHeader) {
      header = lastHeader;
      dataRows = aoa; // no header row on this sheet — every row here is data
    } else {
      header = firstRow.map((_, i) => `Column${i + 1}`);
      dataRows = aoa;
    }
    dataRows.forEach(r => {
      const obj = {};
      header.forEach((h, i) => { if (h) obj[h] = r[i] != null ? r[i] : ''; });
      allRows.push(obj);
    });
  });
  return allRows;
}


function flagIfImplausibleDate(dt, issueTags, flagged, label) {
  if (!dt) return;
  const now = new Date();
  const monthsAhead = (dt.getFullYear() - now.getFullYear()) * 12 + (dt.getMonth() - now.getMonth());
  if (monthsAhead > 12) {
    const msg = `date unusually far in the future (${dt.toISOString().slice(0,10)}) — verify year`;
    issueTags.push(msg);
    if (flagged) flagged.push(`${label}: ${msg}`);
  } else if (dt.getFullYear() < 2015) {
    const msg = `date unusually far in the past (${dt.toISOString().slice(0,10)}) — verify year`;
    issueTags.push(msg);
    if (flagged) flagged.push(`${label}: ${msg}`);
  }
}


function parseFlexibleDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    let [, d, mo, y, h, mi, se] = m;
    d = parseInt(d, 10); mo = parseInt(mo, 10); y = parseInt(y, 10);
    if (y < 100) y += y < 70 ? 2000 : 1900;

    if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, mo - 1, d, parseInt(h || 0, 10), parseInt(mi || 0, 10), parseInt(se || 0, 10));
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function processBulkFile(file) {
  if (file.size > 5*1024*1024) { toast('File too large. Max 5MB.', 'error'); return; }
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rows = [];
      if (isExcel) {
        if (!window.XLSX) { toast('Spreadsheet reader still loading — try again in a moment', 'error'); return; }
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        rows = readAllExcelSheetsAsRows(wb);
      } else if (name.endsWith('.json')) {
        rows = JSON.parse(e.target.result);
      } else {
        const lines = e.target.result.split('\n').filter(l=>l.trim());
        const headers = lines[0].split(',').map(h=>h.trim());
        rows = lines.slice(1).map(l=>{ const vals=l.split(','); return Object.fromEntries(headers.map((h,i)=>[h,vals[i]?.trim()])); });
      }

      const looksInward = /inward|inwrd|_in\b|-in\b/i.test(name) && !/outward/i.test(name);
      const normalizedRows = normalizeRowKeys(rows);
      const sniffedDirection = sniffBulkDirectionFromRows(normalizedRows);
      showBulkPreview(normalizedRows, sniffedDirection || (looksInward ? 'in' : 'out'));
    } catch(err) { toast('Could not parse file — check format', 'error'); }
  };
  if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
}

function showBulkPreview(rows, direction) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const tbl  = document.getElementById('bulkPreviewTable');
  tbl.querySelector('thead').innerHTML = `<tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>`;
  tbl.querySelector('tbody').innerHTML = rows.slice(0,10).map(r=>`<tr>${keys.map(k=>`<td>${r[k]||''}</td>`).join('')}</tr>`).join('');
  document.getElementById('bulkRowCount').textContent = `${rows.length} rows`;
  document.getElementById('bulkDispatchPreview').style.display = 'block';
  document.getElementById('bulkDispatchPreview').dataset.rows = JSON.stringify(rows);
  const dirSel = document.getElementById('bd_bulk_direction');
  if (dirSel) dirSel.value = direction === 'in' ? 'in' : 'out';
  updateBulkDispatchDirectionUI();
}


function updateBulkDispatchDirectionUI() {
  const dirSel = document.getElementById('bd_bulk_direction');
  const row = document.getElementById('bd_bulk_outwardtype_row');
  if (!dirSel || !row) return;
  row.style.display = dirSel.value === 'out' ? 'block' : 'none';
}

async function processBulkDispatch() {

  if (_bulkWriteInProgress) { toast('A dispatch import is already in progress — please wait', 'warning'); return; }
  const rows = JSON.parse(document.getElementById('bulkDispatchPreview').dataset.rows||'[]');
  if (!rows.length) { toast('No rows to process', 'error'); return; }


  const batchDirection = document.getElementById('bd_bulk_direction')?.value === 'in' ? 'in' : 'out';
  const batchOutwardType = document.getElementById('bd_bulk_outwardtype')?.value || OUTWARD_TYPES[0];
  const WORKTYPE_ALIASES = {
    'depotport':'Depot → Port', 'depottoport':'Depot → Port', 'outward':'Depot → Port', 'out':'Depot → Port', 'dispatch':'Depot → Port',
    'portdepot':'Port → Depot', 'porttodepot':'Port → Depot', 'inward':'Port → Depot', 'in':'Port → Depot',
  };
  const OUTWARDTYPE_ALIASES = {
    'repatriationtoport':'Repatriation to Port', 'repatriation':'Repatriation to Port',
    'shippersexport':'Shippers/Export', 'export':'Shippers/Export', 'shippers':'Shippers/Export',
    'saleunits':'Sale units', 'sale':'Sale units',
  };

  const btn = document.getElementById('bulkDispatchSubmitBtn');
  const btnOriginalText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = `Processing ${rows.length} row(s)…`; }
  toast(`Processing ${rows.length} dispatch(es) — this can take a moment for large files…`, 'info', 5000);


  _bulkWriteInProgress = true;


  await new Promise(r => setTimeout(r, 0));

  try {

  let created = 0;
  const flagged = []; // rows still created, but tagged for later cleanup
  const seenInBatch = new Set();
  const usedTrucksInBatch  = new Set();
  const usedDriversInBatch = new Set();
  const newTrips = []; // collected for a direct, chunked save below
  const importBatchId = `DSP-${new Date().toISOString().slice(0,10)}-${Date.now().toString(36).toUpperCase()}`;


  const liveTripByContainer = new Map();
  state.db.trips.forEach(t => {
    if (isTripLive(t) && t.container) {
      const key = t.container.toUpperCase();
      if (!liveTripByContainer.has(key)) liveTripByContainer.set(key, t);
    }
  });


  const CHUNK = 300;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunkRows = rows.slice(start, start + CHUNK);
    if (btn && rows.length > CHUNK) btn.textContent = `Processing ${Math.min(start + CHUNK, rows.length)}/${rows.length}…`;

    chunkRows.forEach((r, chunkIdx) => {
      const idx = start + chunkIdx;

    const contRaw = pickField(r, ['container','containerno','containernumber','containernrno']);
    const rowLabel = contRaw ? contRaw : `row ${idx+1}`;

    let cont = contRaw ? contRaw.trim().toUpperCase() : '';
    const issueTags = [];
    if (!cont) {
      cont = `UNKNOWN-ROW${idx+1}-${Date.now().toString(36).toUpperCase()}`;
      issueTags.push('missing container number — placeholder assigned');
      flagged.push(`${rowLabel}: missing container number (placeholder ${cont})`);
    } else {
      const contIssue = containerFormatIssue(cont);
      if (contIssue) { issueTags.push(contIssue); flagged.push(`${cont}: ${contIssue}`); }
    }
    if (seenInBatch.has(cont)) { issueTags.push('duplicate container within this file'); flagged.push(`${cont}: duplicate container within this file`); }
    const dupTrip = liveTripByContainer.get(cont) || null;
    if (dupTrip) { issueTags.push('already on an active trip'); flagged.push(`${cont}: already on an active trip`); }
    seenInBatch.add(cont);


    const truckRaw  = pickField(r, ['truck','truckreg','vehicle','reg','truckno','lorryno']);
    const transporterRaw = pickField(r, ['transporters','transporter']);
    const driverRaw = pickField(r, ['driver','drivername','driversname']);
    const truck  = state.db.trucks.find(t=>t.reg===truckRaw||t.id===truckRaw||t.reg===transporterRaw);
    const driver = state.db.drivers.find(d=>d.name===driverRaw||d.id===driverRaw);

    const truckConflict  = truck  && usedTrucksInBatch.has(truck.id);
    const driverConflict = driver && usedDriversInBatch.has(driver.id);
    if (truckConflict)  { issueTags.push(`truck ${truck.reg} used more than once in this batch`); flagged.push(`${cont}: truck ${truck.reg} used more than once in this batch`); }
    if (driverConflict) { issueTags.push(`driver ${driver.name} used more than once in this batch`); flagged.push(`${cont}: driver ${driver.name} used more than once in this batch`); }
    if (truck)  usedTrucksInBatch.add(truck.id);
    if (driver) usedDriversInBatch.add(driver.id);

    const lineRaw = pickField(r, ['line','shippingline','linecode','shippinglines']);
    const LINE_TEXT_ALIASES = { 'TERMCO': 'TMT' };
    const lineResolved = lineRaw ? (LINE_TEXT_ALIASES[lineRaw.toUpperCase()] || lineRaw) : '';
    const line = lineResolved
      ? state.db.shippingLines.find(l => l.code.toLowerCase()===lineResolved.toLowerCase() || l.name.toLowerCase()===lineResolved.toLowerCase() || l.id===lineResolved)
      : null;

    const sizeRaw = pickField(r, ['size']);
    const typeRaw = pickField(r, ['containertype','type']);
    const ctypeExplicit = pickField(r, ['ctype']);


    const ctype = (sizeRaw && typeRaw) ? composeCtypeFromDepotCode(sizeRaw, typeRaw)
      : (CONTAINER_TYPE_OPTIONS.find(c => c.toLowerCase() === ctypeExplicit.toLowerCase()) || ctypeExplicit || '20ft Dry');


    const dateOutRaw = pickField(r, ['dateout','dateexited']);
    let dateOutVal = null;
    { const dOut = parseFlexibleDate(dateOutRaw); if (dOut) dateOutVal = dOut.toISOString(); }

    let dateVal = dateOutVal || new Date().toISOString();
    const dateRaw = pickField(r, ['date','dispatchdate','startdate','starttime','datedispatched','datein','entrydate','dategatein']);
    { const d = parseFlexibleDate(dateRaw); if (d) { dateVal = d.toISOString(); flagIfImplausibleDate(d, issueTags, flagged, rowLabel); } }

    const notesParts = ['Bulk import'];
    if (transporterRaw && !truck) notesParts.push(`Transporter: ${transporterRaw}`);
    notesParts.push(...issueTags.map(t=>`⚠ ${t}`));


    const worktypeRaw = pickField(r, ['worktype','workType','direction','movement']).toLowerCase().replace(/[^a-z]/g,'');
    const workType = WORKTYPE_ALIASES[worktypeRaw] || (batchDirection === 'in' ? 'Port → Depot' : 'Depot → Port');
    let outwardType = null;
    if (isOutwardWorkType(workType)) {
      const outwardTypeRaw = pickField(r, ['outwardtype','movementtype']).toLowerCase().replace(/[^a-z\/]/g,'');
      outwardType = OUTWARDTYPE_ALIASES[outwardTypeRaw] || batchOutwardType;
    }

    const trip = {
      id: uid('TRIP'), container: cont,
      truckId: truck?truck.id:'', driverId: driver?driver.id:'',
      ctype, workType, outwardType,
      origin: r.origin||'', dest: r.destination||r.dest||'', distance: parseInt(r.distance)||0,
      shippingLine: line?.id||'', priority:'Normal', notes: notesParts.join(' — '),
      ref: `BULK-${Date.now()}-${created}`,

      status: 'completed',
      startTime: dateVal, eta: dateOutVal || new Date(new Date(dateVal).getTime()+4*3600000).toISOString(),
      eirNumber: sanitize(pickField(r, ['eir','eirno'])),
      receivingParty: sanitize(pickField(r, ['receivingparty','deliveringparty'])),
      releaseOrderNo: sanitize(pickField(r, ['releaseorderno'])),
      vessel: sanitize(pickField(r, ['vessel','exvessel'])),
      voyage: sanitize(pickField(r, ['voyage'])),
      dateOut: dateOutVal || dateVal,
      flaggedForReview: issueTags.length > 0,
      flagReasons: issueTags.slice(),
      duplicateOfId: dupTrip ? dupTrip.id : null,
      importBatchId,
      _dirty: true,
    };
    state.db.trips.push(trip);
    newTrips.push(trip);

    created++;
    });


    await new Promise(r => setTimeout(r, 0));
  }


  let saveResult = null;
  try {
    saveResult = await upsertRowsChunked('trips', newTrips.map(tripToRow));
  } catch (e) {
    console.error('Bulk dispatch save failed:', e && e.message, e);
    saveResult = { table: 'trips', error: e };
  }
  newTrips.forEach(t => { delete t._dirty; });
  buildBadges();
  addAudit(state.profile.username, 'Bulk Dispatch', `${created} dispatches imported${flagged.length?`, ${flagged.length} flagged for review`:''} (batch ${importBatchId})`);
  scheduleSave(); // persists the audit log entry above
  if (saveResult) {
    toast(`Import saved with errors — check console and retry if rows are missing (${(saveResult.error && saveResult.error.message) || 'see console'})`, 'error', 7000);
  } else if (flagged.length) {
    toast(`${created} created — ${flagged.length} flagged for cleanup (see details)`, 'warning', 6000);
    openModal('Bulk Dispatch Result', `<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${created} dispatch(es) created successfully — all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (${flagged.length})</div><div style="max-height:240px;overflow-y:auto">${flagged.map(s=>`<div class="ops-notice" style="margin-bottom:6px">${esc(s)}</div>`).join('')}</div>`);
  } else {
    toast(`${created} dispatches created`, 'success');
  }
  refreshAwaitingDispatchUI();
  document.getElementById('bulkDispatchPreview').style.display = 'none';
  renderDispatchQueue();

  } catch (e) {
 
    console.error('Bulk dispatch failed:', e && e.message, e);
    toast(`Bulk dispatch failed — ${(e && e.message) || 'unexpected error'}. Nothing further was imported.`, 'error', 7000);
  } finally {
    _bulkWriteInProgress = false;
    if (btn) { btn.disabled = false; btn.textContent = btnOriginalText || 'Process All Dispatches →'; }
  }
}

function downloadBulkTemplate() {
  const csv = 'container,size,type,eir,dateOut,receivingParty,releaseOrderNo,vessel,voyage,truck,driver,origin,destination,workType,distance\nMSCU1234566,40ft,Dry,EIR-00789,,,,,,KDA 001A,James Otieno,Kilindini Port,Shimanzi ICD,Port → Depot,18';
  const a   = document.createElement('a');
  a.href     = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = 'gargo_bulk_template.csv';
  a.click();
}



let _inwardImg = '';

function renderInward() {
  populateInwardSelects();
  clearInwardForm(true);
}

function populateInwardSelects() {
  fillDatalist('iwTruckList',  state.db.trucks,  t=>t.reg);
  fillDatalist('iwDriverList', state.db.drivers, d=>d.name);
  fillSelect('iw_line',   state.db.shippingLines.filter(l=>l.active), l=>[l.id, `${l.code} — ${l.name}`]);
  populateSizeTypeSelects('iw_size', 'iw_type');
}

function fillDatalist(id, arr, mapFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = arr.map(i => `<option value="${esc(mapFn(i))}"></option>`).join('');
}

function quickDispatchOut(id) {
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) return;
  openModal(`Quick Dispatch — ${sanitize(ic.container)}`, `
    <div class="ops-notice" style="margin-bottom:12px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      Use this to record that a container already left the depot without creating a full dispatch trip — for containers that left before this system was in use, or whose exit wasn't captured through Dispatch Console. It won't ask for a truck or driver.
    </div>
    <div class="fg"><label>Date Out <span class="label-optional">(optional, defaults to now)</span></label><input id="qd_dateout" type="datetime-local" /></div>
    <div class="fg"><label>Receiving Party</label><input id="qd_receiving" placeholder="Consignee / receiving party" /></div>
    <div class="fg"><label>Release Order No.</label><input id="qd_release_no" placeholder="CRO / release order no. (if any)" /></div>
    <button class="submit-btn" onclick="confirmQuickDispatchOut('${id}')">Mark as Dispatched →</button>
  `);
}

function confirmQuickDispatchOut(id) {
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) { closeModal(); return; }
  const dateInput = document.getElementById('qd_dateout').value;
  ic.dateOut = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
  ic.receivingParty = sanitize(document.getElementById('qd_receiving').value.trim());
  ic.releaseOrderNo = sanitize(document.getElementById('qd_release_no').value.trim());
  ic._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Quick Dispatch (No Trip)', `${ic.container} marked out — bypassed full dispatch process`);
  toast(`${ic.container} marked as dispatched`, 'success');
  closeModal();
  refreshInwardReportsIfOpen();
  renderInterchange(_icFilter || 'all');
}

function markInwardSurveyed(id) {
  const ic = state.db.interchange.find(i => i.id === id);
  if (!ic) return;
  ic.surveyStatus = 'surveyed';
  ic.surveyedAt = new Date().toISOString();
  ic.surveyedBy = state.profile.username;
  ic._dirty = true;
  scheduleSave();
  addAudit(state.profile.username, 'Inward Entry Surveyed', ic.container);
  toast(`${ic.container} marked surveyed`, 'success');
  refreshInwardReportsIfOpen();
}

function switchInwardTab(tab, btn) {
  document.getElementById('inwardTabSingle').style.display  = tab==='single'  ? 'block' : 'none';
  document.getElementById('inwardTabBulk').style.display    = tab==='bulk'    ? 'block' : 'none';
  document.getElementById('inwardTabReports').style.display = tab==='reports' ? 'block' : 'none';
  document.querySelectorAll('#sec-inward .filter-row .filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'reports') renderInwardReports();
}

function refreshInwardReportsIfOpen() {
  const panel = document.getElementById('inwardTabReports');
  if (panel && panel.style.display !== 'none') renderInwardReports();
}



let _inwardRptRows = [];

function inwardReportsPopulateLines() {
  const sel = document.getElementById('iwRptLine');
  if (!sel || sel.dataset.populated) return;
  state.db.shippingLines.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = `${l.code} — ${l.name}`;
    sel.appendChild(opt);
  });
  sel.dataset.populated = '1';
}

function inwardReportsReset() {
  ['iwRptLine', 'iwRptType', 'iwRptStatus', 'iwRptFrom', 'iwRptTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderInwardReports();
}

function inwardEntryStatus(ic, exitedContainers) {
  if (ic.surveyStatus === 'awaiting_survey') return 'awaiting_survey';
  if (!ic.dateOut && !exitedContainers.has(ic.container)) return 'in_storage';
  return 'exited';
}


function exitedContainerSet() {
  const fromInterchange = state.db.interchange
    .filter(i => i.type === 'Gate-Out' || i.type === 'Depot-Out')
    .map(i => i.container);
  const fromTrips = state.db.trips
    .filter(t => isOutwardWorkType(t.workType))
    .map(t => t.container);
  return new Set([...fromInterchange, ...fromTrips].filter(Boolean));
}

const INWARD_STATUS_LABELS = { awaiting_survey: 'Awaiting Survey', in_storage: 'In Storage', exited: 'Exited' };
const INWARD_STATUS_BADGE_CLASS = { awaiting_survey: 's-pending', in_storage: 's-active', exited: 's-completed' };

function inwardStatusBadge(status) {
  return `<span class="sbadge ${INWARD_STATUS_BADGE_CLASS[status] || ''}">${INWARD_STATUS_LABELS[status] || status}</span>`;
}

async function renderInwardReports() {
  inwardReportsPopulateLines();

  const lineId = document.getElementById('iwRptLine')?.value   || '';
  const type   = document.getElementById('iwRptType')?.value   || '';
  const status = document.getElementById('iwRptStatus')?.value || '';
  const from   = document.getElementById('iwRptFrom')?.value   || '';
  const to     = document.getElementById('iwRptTo')?.value     || '';

  const exitedContainers = exitedContainerSet();
  const allInward = state.db.interchange
    .filter(i => i.type === 'Gate-In' || i.type === 'Depot-In')
    .map(i => ({ ...i, _status: inwardEntryStatus(i, exitedContainers) }));

  let rows = allInward;
  if (lineId) rows = rows.filter(i => i.line === lineId);
  if (type) rows = rows.filter(i => i.type === type);
  if (status) rows = rows.filter(i => i._status === status);
  if (from) rows = rows.filter(i => new Date(i.date) >= new Date(from));
  if (to) rows = rows.filter(i => new Date(i.date) <= new Date(to + 'T23:59:59'));

  rows = rows.sort((a, b) => (status === 'awaiting_survey' || status === 'in_storage')
    ? new Date(a.date) - new Date(b.date)
    : new Date(b.date) - new Date(a.date));

  _inwardRptRows = rows;

  let docsByIc = {};
  const awaitingIds = rows.filter(i => i._status === 'awaiting_survey').map(i => i.id);
  if (awaitingIds.length) {
    try {
      if (window.bookingDocs) docsByIc = await window.bookingDocs.documentsForInterchanges(awaitingIds);
    } catch (e) { /* guarantee-form status is best-effort — table still renders without it */ }
  }

  const body = document.getElementById('iwRptBody');
  const meta = document.getElementById('iwRptMeta');
  const exportBtn = document.getElementById('iwRptExportBtn');
  if (meta) meta.textContent = `${rows.length} record${rows.length === 1 ? '' : 's'}`;
  if (exportBtn) exportBtn.disabled = !rows.length;

  if (body) {
    body.innerHTML = rows.length ? rows.map(ic => {
      let action = '—';
      if (ic._status === 'awaiting_survey') {
        action = `<button class="modal-btn primary" style="padding:4px 10px;font-size:10.5px" onclick="markInwardSurveyed('${ic.id}')">Mark Surveyed →</button>`;
      } else if (ic._status === 'in_storage') {
        action = `<button class="modal-btn ghost" style="padding:4px 10px;font-size:10.5px" onclick="quickDispatchOut('${ic.id}')">Quick Dispatch →</button>`;
      }
      const guaranteeNote = ic._status === 'awaiting_survey'
        ? ((docsByIc[ic.id] || []).some(d => d.doc_type === 'guarantee_form')
            ? '<div style="font-size:9.5px;color:var(--text-3);margin-top:3px">Guarantee form ✓</div>'
            : '<div style="font-size:9.5px;color:var(--text-3);margin-top:3px">No guarantee form</div>')
        : '';
      return `<tr>
        <td class="mono">${fmtDate(ic.date)}</td>
        <td class="mono" style="color:var(--gold)">${sanitize(ic.container || '—')}</td>
        <td>${sanitize(ic.type || '—')}</td>
        <td>${sanitize(ic.ctype || '—')}</td>
        <td>${ic.line ? sanitize(lineName(ic.line)) : '<span style="color:var(--danger,#c0392b)">⚠ No Line</span>'}</td>
        <td>${ic.truck ? sanitize(truckName(ic.truck)) : sanitize(ic.truckRegText || '—')}</td>
        <td>${ic.driver ? sanitize(driverName(ic.driver)) : sanitize(ic.driverNameText || '—')}</td>
        <td>${inwardStatusBadge(ic._status)}${guaranteeNote}</td>
        <td>${action}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="9" class="empty-td">No inward entries match these filters</td></tr>`;
  }

  const summary = document.getElementById('iwRptSummary');
  if (summary) {
    summary.innerHTML = `<div class="two-col-grid">
      <div class="report-block">
        <h3>Inward Pipeline (All Time)</h3>
        ${reportRow('Awaiting Survey', allInward.filter(i => i._status === 'awaiting_survey').length)}
        ${reportRow('Still In Storage', allInward.filter(i => i._status === 'in_storage').length)}
        ${reportRow('Exited', allInward.filter(i => i._status === 'exited').length)}
        ${reportRow('Total Inward Entries', allInward.length)}
      </div>
      <div class="report-block">
        <h3>Matching These Filters</h3>
        ${reportRow('Records', rows.length)}
        ${reportRow('Awaiting Survey', rows.filter(i => i._status === 'awaiting_survey').length)}
        ${reportRow('Still In Storage', rows.filter(i => i._status === 'in_storage').length)}
        ${reportRow('Exited', rows.filter(i => i._status === 'exited').length)}
      </div>
    </div>`;
  }
}

function downloadInwardReportCSV() {
  if (!_inwardRptRows.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'Movement', 'Type', 'Shipping Line', 'Truck', 'Driver', 'Status'];
  const rows = _inwardRptRows.map(ic => [
    ic.date, ic.container, ic.type, ic.ctype, lineName(ic.line),
    ic.truck ? truckName(ic.truck) : (ic.truckRegText || ''),
    ic.driver ? driverName(ic.driver) : (ic.driverNameText || ''),
    INWARD_STATUS_LABELS[ic._status] || ic._status,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `inward-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function createInwardEntry() {
  const cont = document.getElementById('iw_container').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }

  const type = document.getElementById('iw_type_movement').value;
  const dateInput = document.getElementById('iw_date').value;
  const dateVal = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();

  const dupIc = findDuplicateInterchange(cont, type, dateVal);
  if (dupIc) { toast(`${cont} already has a ${type} record logged on ${fmtDate(dateVal)}`, 'warning'); return; }


  const truckVal  = document.getElementById('iw_truck').value.trim();
  const driverVal = document.getElementById('iw_driver').value.trim();
  const truck  = truckVal  ? state.db.trucks.find(t => t.reg.toLowerCase()===truckVal.toLowerCase())   : null;
  const driver = driverVal ? state.db.drivers.find(d => d.name.toLowerCase()===driverVal.toLowerCase()) : null;

  const needsSurvey = !!document.getElementById('iw_needs_survey').checked;
  const guaranteeFile = _inwardGuaranteeFile;
  const icId = uid('IC');
  const ctype = composeCtype(document.getElementById('iw_size').value, document.getElementById('iw_type').value);
  const cargoStatusEl = document.getElementById('iw_cargo_status');

  state.db.interchange.push({
    id: icId, container: cont, type,
    ctype,
    line: document.getElementById('iw_line').value,
    condition: document.getElementById('iw_cond').value,
    truck:  truck  ? truck.id  : '',
    driver: driver ? driver.id : '',
    truckRegText:   truck  ? '' : sanitize(truckVal),
    driverNameText: driver ? '' : sanitize(driverVal),
    eirNumber: sanitize(document.getElementById('iw_eir').value.trim()),
    blNumber: sanitize(document.getElementById('iw_bl').value.trim()),
    vessel: sanitize(document.getElementById('iw_vessel').value.trim()),
    voyage: sanitize(document.getElementById('iw_voyage').value.trim()),
    deliveringParty: sanitize(document.getElementById('iw_delivering').value.trim()),
    guaranteeNo: sanitize(document.getElementById('iw_guarantee_no').value.trim()),
    cargoStatus: cargoStatusEl ? cargoStatusEl.value : '',
    repairs: [], repairTotal: 0,
    notes: sanitize(document.getElementById('iw_notes').value.trim()),
    date: dateVal, status: 'pending', img: _inwardImg || '',
    dateOut: null, receivingParty: '', releaseOrderNo: '',
    needsSurvey, surveyStatus: needsSurvey ? 'awaiting_survey' : null,
    surveyedAt: null, surveyedBy: null,
    _dirty: true,
  });
  buildBadges();
  addAudit(state.profile.username, 'Inward Entry Recorded', `${cont} (${type})${needsSurvey ? ' — sent to Awaiting Survey' : ''}`);
  refreshContainerHistory();
  toast(`Inward entry recorded — ${cont}`, 'success');
  clearInwardForm();
  renderInterchange('all');
  refreshInwardReportsIfOpen();


  if (guaranteeFile) {
    try {
      await saveNowAwaited();
      await window.bookingDocs.uploadInterchangeDocument({ interchangeId: icId, docType: 'guarantee_form', containerNo: cont, file: guaranteeFile, autoVerify: true });
      toast('Guarantee form uploaded', 'success');
      refreshInwardReportsIfOpen();
    } catch (e) {
      toast(`Entry saved, but guarantee form upload failed: ${e.message || e}`, 'warning');
    }
  } else {
    scheduleSave();
  }
}

function clearInwardForm(skipRepopulate) {
  ['iw_container','iw_truck','iw_driver','iw_eir','iw_bl','iw_vessel','iw_voyage','iw_notes','iw_delivering','iw_guarantee_no'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const dateEl = document.getElementById('iw_date'); if (dateEl) dateEl.value = '';
  const typeEl = document.getElementById('iw_type_movement'); if (typeEl) typeEl.value = 'Gate-In';
  const condEl = document.getElementById('iw_cond'); if (condEl) condEl.value = 'Good';
  const cargoStatusEl = document.getElementById('iw_cargo_status'); if (cargoStatusEl) cargoStatusEl.value = '';
  const surveyEl = document.getElementById('iw_needs_survey'); if (surveyEl) surveyEl.checked = false;
  _inwardImg = '';
  const fileInput = document.getElementById('iw_img'); if (fileInput) fileInput.value = '';
  renderInwardImgPreview();
  clearInwardGuaranteeFile();
  if (!skipRepopulate) populateInwardSelects();
}

function previewInwardImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Not an image file', 'error'); return; }
  if (file.size > 2*1024*1024) { toast('Image too large — max 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => { _inwardImg = ev.target.result; renderInwardImgPreview(); };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderInwardImgPreview() {
  const wrap  = document.getElementById('inwardImgPreview');
  const label = document.getElementById('inwardImgLabel');
  if (!wrap) return;
  if (!_inwardImg) { wrap.style.display = 'none'; wrap.innerHTML=''; if (label) label.textContent = 'Upload container photo'; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `<div class="container-img-thumb"><img src="${_inwardImg}" /><button type="button" class="container-img-remove" onclick="clearInwardImg()" title="Remove">✕</button></div>`;
  if (label) label.textContent = '1 photo attached';
}

function clearInwardImg() {
  _inwardImg = '';
  const fileInput = document.getElementById('iw_img'); if (fileInput) fileInput.value = '';
  renderInwardImgPreview();
}

let _inwardGuaranteeFile = null;

function previewInwardGuaranteeFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImg = file.type.startsWith('image/');
  if (!isPdf && !isImg) { toast('Upload an image or PDF', 'error'); e.target.value = ''; return; }
  if (file.size > 5*1024*1024) { toast('File too large — max 5MB', 'error'); e.target.value = ''; return; }
  _inwardGuaranteeFile = file;
  renderInwardGuaranteePreview();
}

function renderInwardGuaranteePreview() {
  const wrap  = document.getElementById('inwardGuaranteePreview');
  const label = document.getElementById('inwardGuaranteeLabel');
  if (!wrap) return;
  if (!_inwardGuaranteeFile) { wrap.style.display = 'none'; wrap.innerHTML = ''; if (label) label.textContent = 'Upload container guarantee form'; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
      <span>📎 ${esc(_inwardGuaranteeFile.name)} (${(_inwardGuaranteeFile.size/1024).toFixed(0)} KB)</span>
      <button type="button" class="modal-btn ghost" style="padding:2px 8px;font-size:10px" onclick="clearInwardGuaranteeFile()">Remove</button>
    </div>`;
  if (label) label.textContent = '1 file attached';
}

function clearInwardGuaranteeFile() {
  _inwardGuaranteeFile = null;
  const fileInput = document.getElementById('iw_guarantee_file'); if (fileInput) fileInput.value = '';
  renderInwardGuaranteePreview();
}


function handleInwardBulkDrop(e) {
  e.preventDefault();
  document.getElementById('inwardBulkDrop').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processInwardBulkFile(file);
}

function handleInwardBulkFile(e) {
  const file = e.target.files[0];
  if (file) processInwardBulkFile(file);
}


function normalizeRowKeys(rows) {
  return rows.map(r => {
    const norm = {};
    Object.entries(r || {}).forEach(([k, v]) => {
      const key = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (key) norm[key] = typeof v === 'string' ? v.trim() : (v == null ? '' : v);
    });
    return norm;
  });
}


function sniffBulkDirectionFromRows(normalizedRows) {
  if (!normalizedRows || !normalizedRows.length) return null;
  const keys = new Set();
  normalizedRows.slice(0, 10).forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  const outSignals = ['dateout', 'receivingparty', 'releaseorderno', 'transporters'];
  const inSignals  = ['datein', 'deliveringparty', 'exvessel', 'guranteeformno', 'guaranteeformno'];
  const outHits = outSignals.filter(k => keys.has(k)).length;
  const inHits  = inSignals.filter(k => keys.has(k)).length;
  if (outHits > inHits && outHits > 0) return 'out';
  if (inHits > outHits && inHits > 0) return 'in';
  return null; // ambiguous/generic template — let the filename heuristic decide
}

function processInwardBulkFile(file) {
  if (file.size > 5*1024*1024) { toast('File too large. Max 5MB.', 'error'); return; }
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rows = [];
      if (isExcel) {
        if (!window.XLSX) { toast('Spreadsheet reader still loading — try again in a moment', 'error'); return; }
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        rows = readAllExcelSheetsAsRows(wb);
      } else if (name.endsWith('.json')) {
        rows = JSON.parse(e.target.result);
      } else {
        const lines = e.target.result.split('\n').filter(l=>l.trim());
        const headers = lines[0].split(',').map(h=>h.trim());
        rows = lines.slice(1).map(l=>{ const vals=l.split(','); return Object.fromEntries(headers.map((h,i)=>[h,vals[i]?.trim()])); });
      }
      rows = normalizeRowKeys(rows);
      const looksOutward = /outward|outwrd|_out\b|-out\b/i.test(name) && !/inward/i.test(name);
      const sniffedDirection = sniffBulkDirectionFromRows(rows);
      showInwardBulkPreview(rows, sniffedDirection || (looksOutward ? 'out' : 'in'));
    } catch(err) { toast('Could not parse file — check format', 'error'); }
  };
  if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
}

function showInwardBulkPreview(rows, direction) {
  if (!rows.length) { toast('No rows found in file', 'error'); return; }
  const keys = Object.keys(rows[0]);
  const tbl  = document.getElementById('inwardBulkPreviewTable');
  tbl.querySelector('thead').innerHTML = `<tr>${keys.map(k=>`<th>${esc(k)}</th>`).join('')}</tr>`;
  tbl.querySelector('tbody').innerHTML = rows.slice(0,10).map(r=>`<tr>${keys.map(k=>`<td>${esc(r[k])}</td>`).join('')}</tr>`).join('');
  document.getElementById('inwardBulkRowCount').textContent = `${rows.length} rows`;
  document.getElementById('inwardBulkPreview').style.display = 'block';
  document.getElementById('inwardBulkPreview').dataset.rows = JSON.stringify(rows);
  const dirSel = document.getElementById('iw_bulk_direction');
  dirSel.value = direction === 'out' ? 'out' : 'in';
  updateBulkDirectionLabel();
  dirSel.onchange = updateBulkDirectionLabel;
}

function updateBulkDirectionLabel() {
  const isOut = document.getElementById('iw_bulk_direction').value === 'out';
  document.getElementById('iw_bulk_direction_label').textContent = isOut ? 'Gate-Out' : 'Gate-In';
}

function pickField(r, keys) {
  for (const k of keys) { if (r[k] != null && String(r[k]).trim() !== '') return String(r[k]).trim(); }
  return '';
}

function processBulkInward() {
  const rows = JSON.parse(document.getElementById('inwardBulkPreview').dataset.rows || '[]');
  const direction = document.getElementById('iw_bulk_direction')?.value === 'out' ? 'out' : 'in';
  const VALID_TYPES = {
    'gatein':'Gate-In', 'gate-in':'Gate-In', 'depotin':'Depot-In', 'depot-in':'Depot-In',
    'gateout':'Gate-Out', 'gate-out':'Gate-Out', 'depotout':'Depot-Out', 'depot-out':'Depot-Out'
  };
  const defaultType = direction === 'out' ? 'Gate-Out' : 'Gate-In';
  const VALID_COND  = ['Good','Damaged','Dirty','Needs Repair'];

  let created = 0;
  const flagged = []; // rows still created, but tagged for later cleanup
  const seenInBatch = new Set();
  const importBatchId = `INW-${new Date().toISOString().slice(0,10)}-${Date.now().toString(36).toUpperCase()}`;

  rows.forEach((r, idx) => {
    const contRaw = pickField(r, ['container','containerno','containernumber','containernrno']);
    const rowLabel = contRaw || `row ${idx+1}`;
    // A container number is the one thing we truly cannot do without (the
    // DB column is NOT NULL) — everything else gets imported as-is and
    // flagged for cleanup rather than dropped.
    let cont = contRaw ? contRaw.toUpperCase() : '';
    const issueTags = [];
    if (!cont) {
      cont = `UNKNOWN-ROW${idx+1}-${Date.now().toString(36).toUpperCase()}`;
      issueTags.push('missing container number — placeholder assigned');
      flagged.push(`${rowLabel}: missing container number (placeholder ${cont})`);
    } else {
      const contIssue = containerFormatIssue(cont);
      if (contIssue) { issueTags.push(contIssue); flagged.push(`${cont}: ${contIssue}`); }
    }

    const typeRaw = pickField(r, ['movement','type']).toLowerCase().replace(/[^a-z]/g,'');
    const type = VALID_TYPES[typeRaw] || defaultType;

    let dateVal = new Date().toISOString();
    const dateRaw = pickField(r, ['date','entrydate','datein','dateout','gateindate','gateoutdate','inwarddate','outwarddate','entrydatetime']);
    { const d = parseFlexibleDate(dateRaw); if (d) { dateVal = d.toISOString(); flagIfImplausibleDate(d, issueTags, flagged, rowLabel); } }


    const dupKey = `${cont}::${type}::${new Date(dateVal).toDateString()}`;
    if (seenInBatch.has(dupKey)) { issueTags.push('duplicate within this file (same container, type & date)'); flagged.push(`${cont}: duplicate within this file (same container, type & date)`); }
    const dupIc = findDuplicateInterchange(cont, type, dateVal);
    if (dupIc) { issueTags.push(`possible duplicate of an existing ${type} record on ${fmtDate(dateVal)}`); flagged.push(`${cont}: already has a ${type} record logged on ${fmtDate(dateVal)}`); }
    seenInBatch.add(dupKey);


    const truckVal  = pickField(r, ['truck','truckreg','vehicle','reg','truckno','lorryno','transporters','transporter']);
    const driverVal = pickField(r, ['driver','drivername','driversname']);
    const lineVal   = pickField(r, ['line','shippingline','linecode','shippinglines']);
  
    const vesselVal = pickField(r, ['vessel','exvessel']);

    const truck  = truckVal  ? state.db.trucks.find(t => t.reg.toLowerCase()===truckVal.toLowerCase() || t.id===truckVal) : null;
    const driver = driverVal ? state.db.drivers.find(d => d.name.toLowerCase()===driverVal.toLowerCase() || d.id===driverVal) : null;

    const LINE_TEXT_ALIASES = { 'TERMCO': 'TMT' };
    const lineValResolved = LINE_TEXT_ALIASES[lineVal.toUpperCase()] || lineVal;

    let line = lineValResolved
      ? state.db.shippingLines.find(l => normVessel(l.code).toLowerCase()===normVessel(lineValResolved).toLowerCase() || normVessel(l.name).toLowerCase()===normVessel(lineValResolved).toLowerCase() || l.id===lineValResolved)
      : null;

    if (!line && vesselVal) {
      const guessedId = resolveLineIdFromVessel(vesselVal);
      if (guessedId) line = state.db.shippingLines.find(l => l.id === guessedId);
    }

    const ctypeExplicit    = pickField(r, ['ctype']);
    const sizeRaw          = pickField(r, ['size']);

    const containerTypeRaw = pickField(r, ['containertype','type']);
    let ctype = CONTAINER_TYPE_OPTIONS.find(c => c.toLowerCase() === ctypeExplicit.toLowerCase());
    if (!ctype && sizeRaw && containerTypeRaw) ctype = composeCtypeFromDepotCode(sizeRaw, containerTypeRaw);
    if (!ctype) ctype = CONTAINER_TYPE_OPTIONS[0];

    const condRaw = pickField(r, ['condition']);
    const condition = VALID_COND.find(c => c.toLowerCase() === condRaw.toLowerCase()) || 'Good';


    let dateOutVal = null;
    const dateOutRaw = pickField(r, ['dateout','exitdate','gateoutdate','dateexited']);
    { const dOut = parseFlexibleDate(dateOutRaw); if (dOut) dateOutVal = dOut.toISOString(); }

    const cargoStatusRaw = pickField(r, ['cargostatus']);
    const cargoStatus = CARGO_STATUS_OPTIONS.find(c => c.toLowerCase() === cargoStatusRaw.toLowerCase()) || sanitize(cargoStatusRaw);

    state.db.interchange.push({
      id: uid('IC'), container: cont, type, ctype,
      line: line ? line.id : '',
      condition,
      truck: truck ? truck.id : '', driver: driver ? driver.id : '',
      truckRegText: truck ? '' : sanitize(truckVal),
      driverNameText: driver ? '' : sanitize(driverVal),
      eirNumber: sanitize(pickField(r, ['eir','eirnumber','eirno','ineirno','outeirno','outeir','refinno','refoutno','inwardno'])),
      blNumber:  sanitize(pickField(r, ['bl','blnumber','blno'])),
      vessel:    sanitize(vesselVal),
      voyage:    sanitize(pickField(r, ['voyage','voy'])),
      deliveringParty: sanitize(pickField(r, ['deliveringparty','delivering','shipper'])),
     
      guaranteeNo:     sanitize(pickField(r, ['guaranteeno','guaranteenumber','guranteeformno','guaranteeformno'])),
      cargoStatus,
      repairs: [], repairTotal: 0,
      notes: [sanitize(pickField(r, ['notes','remarks'])) || 'Bulk import', ...issueTags.map(t=>`⚠ ${t}`)].filter(Boolean).join(' — '),
     
      date: dateVal, status: 'approved', img: '',
      dateOut: dateOutVal,
      receivingParty: sanitize(pickField(r, ['receivingparty'])),
      releaseOrderNo: sanitize(pickField(r, ['releaseorderno','releaseorder'])),

      flaggedForReview: issueTags.length > 0,
      flagReasons: issueTags.slice(),
      duplicateOfId: dupIc ? dupIc.id : null,
      importBatchId,
      _dirty: true,
    });
    created++;
  });

  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Bulk Inward Entry', `${created} entries imported${flagged.length?`, ${flagged.length} flagged for review`:''} (batch ${importBatchId})`);
  if (flagged.length) {
    toast(`${created} created — ${flagged.length} flagged for cleanup (see details)`, 'warning', 6000);
    openModal('Bulk Inward Entry Result', `<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${created} entry(ies) created successfully — all imported, nothing skipped.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Flagged For Review (${flagged.length})</div><div style="max-height:240px;overflow-y:auto">${flagged.map(s=>`<div class="ops-notice" style="margin-bottom:6px">${esc(s)}</div>`).join('')}</div>`);
  } else {
    toast(`${created} inward entries created`, 'success');
  }
  refreshContainerHistory();
  renderInterchange('all');
  refreshInwardReportsIfOpen();
  document.getElementById('inwardBulkPreview').style.display = 'none';
}

function downloadInwardBulkTemplate() {
  const csv = 'container,type,size,containerType,line,truck,driver,eir,bl,vessel,voyage,deliveringParty,guaranteeNo,cargoStatus,condition,date,dateOut,receivingParty,releaseOrderNo,notes\nMSCU1234566,Gate-In,40ft,Dry,MSC,KDX 655V,James Otieno,EIR-00123,BL-4471,MSC VESSEL,VA-001,ACME Traders,GTE-00981,Laden / Full,Good,,,,,Delivered in good condition';
  const a = document.createElement('a');
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = 'gargo_inward_bulk_template.csv';
  a.click();
}


let _maintFilter='all';
function filterMaint(f,btn){ _maintFilter=f; document.querySelectorAll('#sec-maintenance .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderMaint(f); }

function renderMaint(f){
  let items=state.db.maintenance;
  if(f!=='all') items=items.filter(m=>m.status===f);
  items=items.sort((a,b)=>{ const p=['critical','high','medium','low']; return p.indexOf(a.priority)-p.indexOf(b.priority); });
  const el=document.getElementById('maintList');
  if(!el) return;
  el.innerHTML=items.map(m=>`<div class="maint-card p-${m.priority}" onclick="showMaintDetail('${m.id}')"><div class="maint-card-head"><div><div style="font-size:12px;font-weight:700;color:var(--text)">${truckName(m.truckId)}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:2px">${m.type} · ${fmtDate(m.date)}</div></div><div style="display:flex;gap:6px;align-items:center">${sbadge(m.priority)} ${sbadge(m.status)}</div></div><div class="maint-desc">${m.desc}</div><div class="maint-meta">Tech: ${m.tech||'Unassigned'} · Cost: ${m.cost?fmtKsh(m.cost):'TBC'}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-label">No maintenance records</div></div>';
}

function showMaintDetail(id) {
  const m = state.db.maintenance.find(m=>m.id===id);
  if (!m) return;
  openModal(`Maintenance — ${truckName(m.truckId)}`, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(m.truckId)}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${m.type}</div></div><div class="fg" style="margin:0"><label>Priority</label>${sbadge(m.priority)}</div><div class="fg" style="margin:0"><label>Status</label>${sbadge(m.status)}</div><div class="fg" style="margin:0"><label>Date</label><div style="font-size:12px;color:var(--text)">${fmtDate(m.date)}</div></div><div class="fg" style="margin:0"><label>Cost (KSh)</label><div style="font-size:12px;color:var(--gold);font-weight:700">${m.cost?fmt(m.cost):'TBC'}</div></div><div class="fg" style="margin:0"><label>Technician</label><div style="font-size:12px;color:var(--text)">${m.tech||'Unassigned'}</div></div>${m.resolvedDate?`<div class="fg" style="margin:0"><label>Resolved</label><div style="font-size:12px;color:var(--green)">${fmtDate(m.resolvedDate)}</div></div>`:''}</div><div class="fg" style="margin-bottom:14px"><label>Description</label><div style="font-size:12px;color:var(--text-2);line-height:1.6;padding:10px;background:var(--surface);border-radius:5px">${m.desc}</div></div>${isAdmin()?`<div style="padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Update Status</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['open','in_progress','resolved'].map(s=>`<button class="filter-btn${m.status===s?' active':''}" onclick="updateMaintStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div>${adminDeleteBtn('maintenance', id)}</div>`:''}`);
}

function updateMaintStatus(id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const m = state.db.maintenance.find(m=>m.id===id);
  if (!m) return;
  m.status = status;
  if (status==='resolved') m.resolvedDate = new Date().toISOString();
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Maintenance Update', `${truckName(m.truckId)} → ${status}`);
  closeModal();
  renderMaint(_maintFilter);
  toast('Maintenance record updated', 'success');
}

function showMaintModal() {
  openModal('Log Maintenance Issue', `<div class="fg"><label>Truck</label><select id="m_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg} — ${t.make}</option>`).join('')}</select></div><div class="form-row-2"><div class="fg"><label>Issue Type</label><select id="m_type"><option>Breakdown</option><option>Scheduled</option><option>Preventive</option><option>Electrical</option><option>Tyre</option><option>Engine</option><option>Brake</option><option>Suspension</option></select></div><div class="fg"><label>Priority</label><select id="m_priority"><option value="critical">Critical</option><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div></div><div class="fg"><label>Description</label><textarea id="m_desc" rows="3" placeholder="Describe the issue…"></textarea></div><div class="form-row-2"><div class="fg"><label>Technician</label><input id="m_tech" placeholder="Tech name"/></div><div class="fg"><label>Estimated Cost (KSh)</label><input id="m_cost" type="number" placeholder="0"/></div></div><button class="submit-btn" onclick="saveMaint()">Log Issue →</button>`);
}

function saveMaint() {
  const desc = document.getElementById('m_desc').value.trim();
  if (!desc) { toast('Description required', 'error'); return; }
  const m = {
    id: uid('MNT'), truckId: document.getElementById('m_truck').value,
    type: document.getElementById('m_type').value, priority: document.getElementById('m_priority').value,
    desc, tech: document.getElementById('m_tech').value.trim(),
    cost: Math.max(0, parseInt(document.getElementById('m_cost').value)||0),
    status:'open', date: new Date().toISOString(), resolvedDate: null,
  };
  state.db.maintenance.push(m);
  const t = state.db.trucks.find(t=>t.id===m.truckId);
  if (t && m.priority==='critical') t.status='breakdown';
  else if (t && (m.priority==='high'||m.priority==='medium') && t.status==='available') t.status='maintenance';
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Maintenance Logged', `${truckName(m.truckId)} — ${m.type}`);
  closeModal(); renderMaint('all');
  toast('Issue logged', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 15  FUEL LOG
────────────────────────────────────────────────────────────────── */
function renderFuel() {
  fillSelect('f_truck',  state.db.trucks,  t=>[t.id, `${t.reg} — ${t.make}`]);
  fillSelect('f_driver', state.db.drivers, d=>[d.id, d.name]);
  renderFuelTable();
  renderFuelSummary();
}

function renderFuelTable() {
  const logs = [...state.db.fuel].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tbody = document.getElementById('fuelTableBody');
  if (!tbody) return;
  tbody.innerHTML = logs.map(f=>`<tr><td class="mono" style="font-size:10px">${fmtDate(f.date)}</td><td>${state.db.trucks.find(t=>t.id===f.truckId)?.reg||f.truckId}</td><td>${driverName(f.driverId)}</td><td class="mono" style="text-align:right">${fmt(f.litres)} L</td><td class="mono" style="text-align:right">${fmt(f.pricePerLitre)}</td><td class="mono" style="text-align:right;color:var(--gold);font-weight:700">${fmtKsh(f.litres*f.pricePerLitre)}</td><td style="color:var(--text-3);font-size:11px">${f.station}</td></tr>`).join('') || `<tr><td colspan="7" class="empty-td">No fuel logs</td></tr>`;
}

function renderFuelSummary() {
  const logs = state.db.fuel;
  const totalL   = logs.reduce((s,f)=>s+f.litres, 0);
  const totalKsh = logs.reduce((s,f)=>s+f.litres*f.pricePerLitre, 0);
  const avgPpl   = logs.length ? totalKsh/totalL : 0;
  const el = document.getElementById('fuelSummary');
  if (!el) return;
  el.innerHTML = `<div class="fuel-summary-row"><span class="fsr-label">Total Litres</span><span class="fsr-val">${fmt(totalL)} L</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Cost</span><span class="fsr-val">${fmtKsh(totalKsh)}</span></div><div class="fuel-summary-row"><span class="fsr-label">Avg Price/Litre</span><span class="fsr-val">KSh ${avgPpl.toFixed(2)}</span></div><div class="fuel-summary-row"><span class="fsr-label">Fill-ups Logged</span><span class="fsr-val">${logs.length}</span></div>`;
}

function addFuelLog() {
  const truck  = document.getElementById('f_truck').value;
  const driver = document.getElementById('f_driver').value;
  const litres = parseFloat(document.getElementById('f_litres').value)||0;
  const price  = parseFloat(document.getElementById('f_price').value)||0;
  if (!truck || litres <=0 || price <=0) { toast('Truck, litres and price required', 'error'); return; }
  if (litres > 1000) { toast('Litres exceed reasonable limit (1000L)', 'error'); return; }
  const log = {
    id: uid('FUEL'), truckId: truck, driverId: driver,
    date: new Date().toISOString(), litres, pricePerLitre: price,
    station: sanitize(document.getElementById('f_station').value.trim())||'Unknown',
    odometer: Math.max(0, parseInt(document.getElementById('f_odo').value)||0),
    receipt: document.getElementById('f_receipt').value.trim()||uid('RCP'),
  };
  state.db.fuel.push(log);
  const t = state.db.trucks.find(t=>t.id===truck);
  if (t) { t.fuelPct = Math.min(100, Math.round((litres/400)*100 + t.fuelPct)); t.mileage = log.odometer||t.mileage; }
  scheduleSave();
  addAudit(state.profile.username, 'Fuel Log', `${truckName(truck)} — ${litres}L at KSh ${price}/L`);
  ['f_litres','f_price','f_station','f_odo','f_receipt'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  renderFuelTable(); renderFuelSummary();
  toast(`Fuel log saved — ${fmtKsh(litres*price)}`, 'success');
}


let _shutoutFilter='all';
function filterShutout(f,btn){ _shutoutFilter=f; document.querySelectorAll('#sec-shutout .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderShutout(f); }

function renderShutout(f){
  let items=f==='all'?state.db.shutouts:state.db.shutouts.filter(s=>s.status===f);
  const el=document.getElementById('shutoutList');
  if(!el) return;
  el.innerHTML=items.map(s=>`<div class="shutout-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">${s.container}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${s.vessel} · Voyage ${s.voyage}</div></div>${sbadge(s.status)}</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:6px">Reason: ${s.reason}</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--text-3)"><span>${fmtDate(s.date)}</span><span>${truckName(s.truckId)}</span></div>${s.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:6px;font-style:italic">${s.notes}</div>`:''}</div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-label">No shutout records</div></div>';
}

function showAddShutoutModal() {
  openModal('Flag Shutout Container', `<div class="form-row-2"><div class="fg"><label>Container No.</label><input id="sh_cont" list="containerHistory" placeholder="MSCU1234566 — pick existing or type new" oninput="markContainerValidity(this)"/></div><div class="fg"><label>Shipping Line</label><select id="sh_line">${state.db.shippingLines.map(l=>`<option value="${l.id}">${l.code}</option>`).join('')}</select></div></div><div class="form-row-2"><div class="fg"><label>Vessel</label><input id="sh_vessel" placeholder="MSC VESSEL NAME"/></div><div class="fg"><label>Voyage No.</label><input id="sh_voyage" placeholder="VA-001"/></div></div><div class="fg"><label>Reason</label><input id="sh_reason" placeholder="Why was this shutout?"/></div><div class="form-row-2"><div class="fg"><label>Truck</label><select id="sh_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg}</option>`).join('')}</select></div><div class="fg"><label>Driver</label><select id="sh_driver">${state.db.drivers.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div></div><div class="fg"><label>Notes</label><textarea id="sh_notes" rows="2"></textarea></div><button class="submit-btn" onclick="saveShutout()">Flag Shutout →</button>`);
}

function saveShutout() {
  const cont = document.getElementById('sh_cont').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }
  const dupShutout = state.db.shutouts.find(s=>(s.container||'').toUpperCase()===cont && s.status==='open');
  if (dupShutout) { toast(`${cont} already has an open shutout record — resolve it before flagging again`, 'error'); return; }
  state.db.shutouts.push({
    id: uid('SHT'), container: cont,
    line: document.getElementById('sh_line').value,
    vessel: sanitize(document.getElementById('sh_vessel').value.trim()),
    voyage: sanitize(document.getElementById('sh_voyage').value.trim()),
    reason: sanitize(document.getElementById('sh_reason').value.trim()),
    truckId:  document.getElementById('sh_truck').value,
    driverId: document.getElementById('sh_driver').value,
    notes: sanitize(document.getElementById('sh_notes').value.trim()),
    date: new Date().toISOString(), status:'open',
  });
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Shutout Flagged', cont);
  closeModal(); renderShutout('all');
  refreshContainerHistory();
  toast('Shutout flagged', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 17  INTERCHANGE
────────────────────────────────────────────────────────────────── */
let _icFilter='all';
function filterInterchange(f,btn){ _icFilter=f; document.querySelectorAll('#sec-interchange .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderInterchange(f); }

function renderInterchange(f){
  let items = f==='all' ? state.db.interchange
    : f==='flagged' ? state.db.interchange.filter(i=>i.flaggedForReview)
    : state.db.interchange.filter(i=>i.status===f);
  const el=document.getElementById('interchangeList');
  if(!el) return;

  const exitedContainers = exitedContainerSet();
  el.innerHTML=items.map(ic=>{
    const meta = [ic.eirNumber ? `EIR ${ic.eirNumber}` : null, (ic.vessel || ic.voyage) ? `${ic.vessel||'—'} / ${ic.voyage||'—'}` : null, ic.dateOut ? `Out ${fmtDate(ic.dateOut)}` : null].filter(Boolean).join(' · ');
    const repairBadge = (ic.repairs && ic.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${ic.repairs.length} damage item${ic.repairs.length>1?'s':''} · KSh ${Number(ic.repairTotal||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>` : '';
    const canQuickDispatch = (ic.type === 'Gate-In' || ic.type === 'Depot-In') && !ic.dateOut && !exitedContainers.has(ic.container);
    return `<div class="ic-card"><div class="ic-card-img-placeholder" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload('interchange','${ic.id}','img',()=>renderInterchange('${f}'))" title="Upload container photo">${ic.img?`<img src="${ic.img}" style="width:100%;height:100%;object-fit:cover" />`:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">${ic.container}</div>${sbadge(ic.status)}${ic.flaggedForReview?`<span class="status-badge" style="background:rgba(230,160,60,.15);color:#e6a03c" title="${esc((ic.flagReasons||[]).join('; '))}">⚠ Flagged</span>`:''}</div><div style="font-size:11.5px;color:var(--text-2)">${ic.type} · ${lineName(ic.line)} · ${ic.condition}${ic.ctype ? ' · ' + ic.ctype : ''}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">${ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—')} · ${ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—')} · ${fmtDate(ic.date)}</div>${meta?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${meta}</div>`:''}${repairBadge}${ic.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${ic.notes}</div>`:''}</div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">${isAdmin() && ic.status==='pending'?`<button class="modal-btn success" onclick="approveInterchange('${ic.id}')">Approve</button>`:''}${canQuickDispatch?`<button class="modal-btn ghost" onclick="quickDispatchOut('${ic.id}')">Quick Dispatch →</button>`:''}<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${ic.id}')">⬇ Download</button>${ic.flaggedForReview?`<button class="modal-btn ghost" onclick="clearReviewFlag('interchange','${ic.id}')">✓ Mark Reviewed</button>`:''}${ic.surveyId?`<button class="modal-btn ghost" onclick="downloadInspectionReport('${ic.surveyId}')">⬇ Inspection Report</button>`:''}${(ic.surveyId || ic.img)?`<button class="modal-btn ghost" onclick="showContainerPhotos('${ic.id}')">📷 Photos</button>`:''}</div></div>`;
  }).join('')||'<div class="empty-state"><div class="empty-state-icon">🔄</div><div class="empty-state-label">No interchange records</div></div>';
}


async function showContainerPhotos(icId) {
  const ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Interchange record not found', 'error'); return; }
  openModal(`Photos — ${sanitize(ic.container) || 'Container'}`, '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');

  let photos = [];
  if (ic.surveyId) {
    let s = (_surveyRegisterData.find(x => x.id === ic.surveyId)) || _surveyLookupCache[ic.surveyId];
    if (!s) {
      try { s = await window.bookingDocs.surveyById(ic.surveyId); if (s) _surveyLookupCache[s.id] = s; } catch (e) { /* fall through to whatever we already have */ }
    }
    if (s && Array.isArray(s.photos)) photos = s.photos.slice();
  }

  if (ic.img && photos.indexOf(ic.img) === -1) photos.unshift(ic.img);

  const body = document.getElementById('modalBody');
  if (!body) return;
  if (!photos.length) {
    body.innerHTML = '<div class="empty-state"><div class="empty-state-label">No photos on file for this container</div></div>';
    return;
  }
  body.innerHTML = `
    <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${photos.length} photo${photos.length > 1 ? 's' : ''} on file${ic.surveyId ? ' · captured at survey' : ''} — tap to view full size</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${photos.map((src, i) =>
      `<img src="${src}" alt="Container photo ${i + 1}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid var(--border)" onclick="openPhotoLightbox(this.src)">`
    ).join('')}</div>`;
}


function openPhotoLightbox(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:4px';
  overlay.appendChild(img);
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

function printInterchangeList() {
  const items = _icFilter === 'all' ? state.db.interchange : state.db.interchange.filter(i => i.status === _icFilter);
  if (!items.length) { toast('Nothing to print yet', 'error'); return; }
  const rows = items.map(ic => `<tr>
    <td>${fmtDate(ic.date)}</td><td>${sanitize(ic.container || '—')}</td><td>${sanitize(ic.eirNumber || '—')}</td><td>${sanitize(ic.type || '—')}</td>
    <td>${sanitize(lineName(ic.line))}</td><td>${sanitize(ic.condition || '—')}</td>
    <td>${sanitize(truckName(ic.truck))}</td><td>${sanitize(driverName(ic.driver))}</td>
    <td>${ic.repairTotal ? 'KSh ' + Number(ic.repairTotal).toLocaleString(undefined,{minimumFractionDigits:2}) : '—'}</td><td>${sanitize((ic.status || '').toUpperCase())}</td>
  </tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Interchange Records</title><style>
    body{font-family:Arial,sans-serif;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}
    h2{margin-bottom:4px}
  </style></head><body><h2>Gargo Haven Depot — Interchange Records</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')} · Filter: ${_icFilter}</div>
  <table><thead><tr><th>Date</th><th>Container</th><th>EIR No.</th><th>Type</th><th>Line</th><th>Condition</th><th>Truck</th><th>Driver</th><th>Repair Cost</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function downloadInterchangeCSV() {
  const items = _icFilter === 'all' ? state.db.interchange : state.db.interchange.filter(i => i.status === _icFilter);
  if (!items.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'EIR No.', 'Type', 'Container Type', 'Shipping Line', 'Vessel', 'Voyage', 'Delivering Party', 'Guarantee No.', 'Cargo Status', 'Condition', 'Truck', 'Driver', 'Date Out', 'Receiving Party', 'Release Order No.', 'Repair Items', 'Repair Total', 'Status', 'Notes'];
  const rows = items.map(ic => [
    ic.date, ic.container, ic.eirNumber, ic.type, ic.ctype, lineName(ic.line), ic.vessel, ic.voyage, ic.deliveringParty, ic.guaranteeNo, ic.cargoStatus, ic.condition, truckName(ic.truck), driverName(ic.driver),
    ic.dateOut, ic.receivingParty, ic.releaseOrderNo,
    (ic.repairs || []).map(r => `${r.code} (${r.item})`).join('; '), ic.repairTotal || 0, ic.status, ic.notes,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `interchange-${_icFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}



const INWARD_IC_TYPES  = ['Gate-In', 'Depot-In'];
const OUTWARD_IC_TYPES = ['Gate-Out', 'Depot-Out'];

let _depotReportTab   = 'inward';   // inward | outward | dupes
let _depotReportRange = 'all';      // all | 7 | 30 | 90 (days)
let _depotReportLine  = 'all';
let _depotReportDupes = [];

function switchDepotReportTab(tab, btn) {
  _depotReportTab = tab;
  document.querySelectorAll('#sec-depotreport .filter-row .filter-btn[data-tab]').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDepotReport();
}

function filterDepotReportRange(range, btn) {
  _depotReportRange = range;
  document.querySelectorAll('#sec-depotreport .filter-row .filter-btn[data-range]').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDepotReport();
}

function filterDepotReportLine() {
  const sel = document.getElementById('drLineFilter');
  _depotReportLine = sel ? sel.value : 'all';
  renderDepotReport();
}

function _depotReportInRange(dateStr) {
  if (_depotReportRange === 'all') return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(_depotReportRange));
  return new Date(dateStr) >= cutoff;
}

function _depotReportLineMatch(rec) {
  return _depotReportLine === 'all' || (_depotReportLine === '__unmapped__' ? !rec.line : rec.line === _depotReportLine);
}


function _tripToDepotReportRecord(t) {
  const outward = isOutwardWorkType(t.workType);
  return {
    id: t.id, container: t.container,
    type: outward ? (t.outwardType || 'Dispatch (Depot → Port)') : 'Inward (Port → Depot)',
    line: t.shippingLine || '', condition: '',
    truck: t.truckId || '', driver: t.driverId || '', truckRegText: '', driverNameText: '',
    eirNumber: t.eirNumber || '', vessel: t.vessel || '', voyage: t.voyage || '',

    date: outward ? (t.dateOut || t.startTime) : t.startTime,
    status: t.status, notes: t.notes || '',
    flaggedForReview: !!t.flaggedForReview, flagReasons: t.flagReasons || [],
    importBatchId: t.importBatchId || null,
    _reportSource: 'trips',
  };
}


function _depotReportInwardEntries() {
  const fromInterchange = state.db.interchange
    .filter(ic => INWARD_IC_TYPES.includes(ic.type))
    .map(ic => ({ ...ic, _reportSource: 'interchange' }));
  const fromTrips = state.db.trips
    .filter(t => !isOutwardWorkType(t.workType))
    .map(_tripToDepotReportRecord);
  return [...fromInterchange, ...fromTrips]
    .filter(_depotReportLineMatch)
    .filter(rec => _depotReportInRange(rec.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}


function _depotReportOutwardEntries() {
  const fromInterchange = state.db.interchange
    .filter(ic => OUTWARD_IC_TYPES.includes(ic.type))
    .map(ic => ({ ...ic, _reportSource: 'interchange' }));
  const fromTrips = state.db.trips
    .filter(t => isOutwardWorkType(t.workType))
    .map(_tripToDepotReportRecord);
  return [...fromInterchange, ...fromTrips]
    .filter(_depotReportLineMatch)
    .filter(rec => _depotReportInRange(rec.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}


function _icSourceTag(rec) {
  const base = /bulk import/i.test(rec.notes || '') || rec.truckRegText || rec.driverNameText ? 'Bulk' : 'Manual';
  return rec._reportSource === 'trips' ? `${base} · Trips` : base;
}

function populateDepotReportLineFilter() {
  const sel = document.getElementById('drLineFilter');
  if (!sel || sel.dataset.populated) return;
  sel.innerHTML = '<option value="all">All Lines</option>' +
    '<option value="__unmapped__">⚠ No Line Assigned</option>' +
    state.db.shippingLines.map(l => `<option value="${l.id}">${esc(l.code)}</option>`).join('');
  sel.dataset.populated = '1';
}


function computeDepotReportDuplicates() {
  const all = state.db.interchange;

  const dayGroups = {};
  all.forEach(ic => {
    const key = `${(ic.container || '').toUpperCase()}::${ic.type}::${new Date(ic.date).toDateString()}`;
    (dayGroups[key] = dayGroups[key] || []).push(ic);
  });
  const exactDupes = Object.values(dayGroups)
    .filter(list => list.length > 1)
    .map(list => ({ kind: 'Same container, type & day', records: list, ids: list.map(i => i.id) }));

  _depotReportDupes = [...exactDupes];
  return _depotReportDupes;
}

function renderDepotReport() {
  populateDepotReportLineFilter();
  computeDepotReportDuplicates();

  const inward  = _depotReportInwardEntries();
  const outward = _depotReportOutwardEntries();
  const unmappedTotal = state.db.interchange.filter(ic => !ic.line).length
    + state.db.trips.filter(t => !t.shippingLine).length;

  const kpi = document.getElementById('depotReportKpis');
  if (kpi) {
    kpi.innerHTML = [
      kpiCard('Inward Entries', inward.length, INWARD_IC_TYPES.join(' / '), 'kpi-green'),
      kpiCard('Outward Entries', outward.length, [...OUTWARD_IC_TYPES, 'Dispatch trips'].join(' / '), 'kpi-gold'),
      kpiCard('Net Movement', inward.length - outward.length, 'Inward − outward, in range', 'kpi-blue'),
      kpiCard('Duplicates Flagged', _depotReportDupes.length, 'Across full register', _depotReportDupes.length ? 'kpi-red' : 'kpi-green'),
    ].join('');
  }

  const unmappedEl = document.getElementById('depotReportUnmappedNotice');
  if (unmappedEl) {
    unmappedEl.style.display = unmappedTotal ? 'flex' : 'none';
    unmappedEl.innerHTML = unmappedTotal ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> ${unmappedTotal} record${unmappedTotal === 1 ? '' : 's'} across the whole register have no shipping line assigned and won't appear under any line filter. <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold);font-weight:600">Resolve them →</a>` : '';
  }

  const dupeCountEl = document.getElementById('depotReportDupeCount');
  if (dupeCountEl) dupeCountEl.textContent = _depotReportDupes.length ? `(${_depotReportDupes.length})` : '';

  const tabInward  = document.getElementById('depotReportTabInward');
  const tabOutward = document.getElementById('depotReportTabOutward');
  const tabDupes   = document.getElementById('depotReportTabDupes');
  if (tabInward)  tabInward.style.display  = _depotReportTab === 'inward'  ? 'block' : 'none';
  if (tabOutward) tabOutward.style.display = _depotReportTab === 'outward' ? 'block' : 'none';
  if (tabDupes)   tabDupes.style.display   = _depotReportTab === 'dupes'   ? 'block' : 'none';

  if (_depotReportTab === 'inward')  renderDepotReportTable('depotReportInwardList', inward);
  if (_depotReportTab === 'outward') renderDepotReportTable('depotReportOutwardList', outward);
  if (_depotReportTab === 'dupes')   renderDepotReportDupesList();
}

function renderDepotReportTable(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-label">No entries in this range</div></div>';
    return;
  }
  const flaggedIds = new Set(_depotReportDupes.flatMap(d => d.ids));
  el.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Vessel / Voyage</th>
      <th>Truck</th><th>Driver</th><th>Condition</th><th>Status</th><th>Source</th>
    </tr></thead><tbody>${items.map(ic => `<tr${(flaggedIds.has(ic.id) || ic.flaggedForReview) ? ' style="background:rgba(220,60,60,0.08)"' : ''}>
      <td class="mono">${fmtDate(ic.date)}</td>
      <td class="mono" style="color:var(--gold)">${esc(ic.container)}${(flaggedIds.has(ic.id) || ic.flaggedForReview) ? ' ⚠' : ''}</td>
      <td>${esc(ic.type)}</td>
      <td>${esc(lineName(ic.line))}</td>
      <td class="mono">${esc(ic.eirNumber || '—')}</td>
      <td>${esc(ic.vessel || '—')}${ic.voyage ? ' / ' + esc(ic.voyage) : ''}</td>
      <td>${ic.truck ? esc(truckName(ic.truck)) : esc(ic.truckRegText || '—')}</td>
      <td>${ic.driver ? esc(driverName(ic.driver)) : esc(ic.driverNameText || '—')}</td>
      <td>${esc(ic.condition || '—')}</td>
      <td>${sbadge(ic.status)}</td>
      <td>${_icSourceTag(ic)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderDepotReportDupesList() {
  const el = document.getElementById('depotReportDupesList');
  if (!el) return;
  if (!_depotReportDupes.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-label">No duplicates found across the register</div></div>';
    return;
  }
  el.innerHTML = _depotReportDupes.map(dup => `
    <div class="ic-card" style="flex-direction:column;align-items:stretch;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:12px;font-weight:600;color:var(--red)">${esc(dup.kind)}</div>
        <div style="font-size:10px;color:var(--text-3)">${dup.records.length} records</div>
      </div>
      ${dup.records.map(r => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--border);font-size:11px">
          <div class="mono" style="color:var(--text-2)"><span style="color:var(--gold)">${esc(r.container)}</span> · ${esc(r.type)} · ${fmtDate(r.date)} · EIR ${esc(r.eirNumber || '—')} · ${_icSourceTag(r)}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            ${sbadge(r.status)}
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function printDepotReport() {
  const items = _depotReportTab === 'outward' ? _depotReportOutwardEntries() : _depotReportInwardEntries();
  if (!items.length) { toast('Nothing to print yet', 'error'); return; }
  const rows = items.map(ic => `<tr>
    <td>${fmtDate(ic.date)}</td><td>${sanitize(ic.container || '—')}</td><td>${sanitize(ic.type || '—')}</td>
    <td>${sanitize(lineName(ic.line))}</td><td>${sanitize(ic.eirNumber || '—')}</td>
    <td>${sanitize(ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—'))}</td>
    <td>${sanitize(ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—'))}</td>
    <td>${sanitize((ic.status || '').toUpperCase())}</td><td>${_icSourceTag(ic)}</td>
  </tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Depot Report</title><style>
    body{font-family:Arial,sans-serif;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}
    h2{margin-bottom:4px}
  </style></head><body><h2>Gargo Haven Depot — ${_depotReportTab === 'outward' ? 'Outward' : 'Inward'} Register</h2>
  <div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')} · Range: ${_depotReportRange === 'all' ? 'All time' : `Last ${_depotReportRange} days`} · ${items.length} record(s)</div>
  <table><thead><tr><th>Date</th><th>Container</th><th>Type</th><th>Line</th><th>EIR No.</th><th>Truck</th><th>Driver</th><th>Status</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function downloadDepotReportCSV() {
  const items = _depotReportTab === 'outward' ? _depotReportOutwardEntries() : _depotReportInwardEntries();
  if (!items.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'Type', 'Shipping Line', 'EIR No.', 'Vessel', 'Voyage', 'Truck', 'Driver', 'Condition', 'Status', 'Source'];
  const rows = items.map(ic => [
    ic.date, ic.container, ic.type, lineName(ic.line), ic.eirNumber, ic.vessel, ic.voyage,
    ic.truck ? truckName(ic.truck) : ic.truckRegText, ic.driver ? driverName(ic.driver) : ic.driverNameText,
    ic.condition, ic.status, _icSourceTag(ic),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `depot-report-${_depotReportTab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function approveInterchange(id) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const ic = state.db.interchange.find(i=>i.id===id);
  if (!ic) return;
  ic.status='approved';
  ic._dirty = true;
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Interchange Approved', ic.container);
  renderInterchange(_icFilter);
  toast('Interchange approved', 'success');
}

function showAddInterchangeModal() {
  window._repairItems.ic = [];
  const typeOptions = CONTAINER_TYPE_OPTIONS.map(t => `<option>${t}</option>`).join('');
  openModal('Record Interchange', `<div class="form-row-2"><div class="fg"><label>Container No.</label><input id="ic_cont" list="containerHistory" placeholder="MSCU1234566 — pick existing or type new" oninput="markContainerValidity(this)"/></div><div class="fg"><label>Movement</label><select id="ic_type"><option>Gate-In</option><option>Gate-Out</option><option>Depot-In</option><option>Depot-Out</option></select></div></div><div class="form-row-2"><div class="fg"><label>Container Type/Size</label><select id="ic_ctype">${typeOptions}</select></div><div class="fg"><label>Shipping Line</label><select id="ic_line">${state.db.shippingLines.map(l=>`<option value="${l.id}">${l.code}</option>`).join('')}</select></div></div><div class="form-row-2"><div class="fg"><label>EIR / Reference No.</label><input id="ic_eir" placeholder="Transporter's own EIR no."/></div><div class="fg"><label>B/L Number</label><input id="ic_bl"/></div></div><div class="form-row-2"><div class="fg"><label>Vessel</label><input id="ic_vessel"/></div><div class="fg"><label>Voyage</label><input id="ic_voyage"/></div></div><div class="form-row-2"><div class="fg"><label>Truck</label><select id="ic_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg}</option>`).join('')}</select></div><div class="fg"><label>Driver</label><select id="ic_driver">${state.db.drivers.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div></div><div class="fg"><label>Overall Condition</label><select id="ic_cond"><option>Good</option><option>Damaged</option><option>Dirty</option><option>Needs Repair</option></select></div>${tariffPickerHtml('ic')}<div class="fg"><label>Notes</label><textarea id="ic_notes" rows="2" placeholder="Damage notes, remarks…"></textarea></div><button class="submit-btn" onclick="saveInterchange()">Record Interchange →</button>`);
  renderRepairItemsList('ic');
}

function saveInterchange() {
  const cont = document.getElementById('ic_cont').value.trim().toUpperCase();
  if (!cont) { toast('Container number required', 'error'); return; }
  const contIssue = containerFormatIssue(cont);
  if (contIssue) { toast(`Container number: ${contIssue}`, 'error'); return; }
  const dupIc = findDuplicateInterchange(cont, document.getElementById('ic_type').value, new Date().toISOString());
  if (dupIc) { toast(`${cont} already has a ${document.getElementById('ic_type').value} interchange record logged today`, 'warning'); return; }
  const repairs = window._repairItems.ic || [];
  state.db.interchange.push({
    id: uid('IC'), container: cont,
    type: document.getElementById('ic_type').value,
    ctype: document.getElementById('ic_ctype').value,
    line: document.getElementById('ic_line').value,
    condition: document.getElementById('ic_cond').value,
    truck:  document.getElementById('ic_truck').value,
    driver: document.getElementById('ic_driver').value,
    eirNumber: sanitize(document.getElementById('ic_eir').value.trim()),
    blNumber: sanitize(document.getElementById('ic_bl').value.trim()),
    vessel: sanitize(document.getElementById('ic_vessel').value.trim()),
    voyage: sanitize(document.getElementById('ic_voyage').value.trim()),
    repairs, repairTotal: repairItemsTotal(repairs),
    notes:  sanitize(document.getElementById('ic_notes').value.trim()),
    date: new Date().toISOString(), status:'pending', img:'',
    _dirty: true,
  });
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Interchange Recorded', cont);
  closeModal(); renderInterchange('all');
  refreshContainerHistory();
  toast('Interchange recorded', 'success');
}


function downloadInterchangeSlip(icId) {
  const ic = state.db.interchange.find(i => i.id === icId);
  if (!ic) { toast('Interchange record not found', 'error'); return; }
  if (!window.jspdf) { toast('PDF library still loading — try again in a moment', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const GOLD = [201, 162, 39];
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;


  function fieldBox(x, y, w, h, label, value) {
    doc.setDrawColor(150); doc.setLineWidth(0.25); doc.rect(x, y, w, h);
    doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); doc.setTextColor(120);
    doc.text(String(label).toUpperCase(), x + 2, y + 4.5);
    doc.setFont(undefined, 'bold'); doc.setFontSize(9.5); doc.setTextColor(20);
    const val = doc.splitTextToSize(String(value || '—'), w - 4);
    doc.text(val.slice(0, 2), x + 2, y + (h > 10 ? 10 : 9));
  }
  function sectionLabel(text, y) {
    doc.setFont(undefined, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GOLD);
    doc.text(text.toUpperCase(), MARGIN, y);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.line(MARGIN, y + 1.5, RIGHT, y + 1.5);
    doc.setTextColor(20);
  }

  // ---- header ----------------------------------------------------------
  doc.setFont(undefined, 'bold'); doc.setFontSize(15); doc.setTextColor(20);
  doc.text('GARGO HAVEN DEPOT LIMITED', MARGIN, 20);
  doc.setFont(undefined, 'italic'); doc.setFontSize(9.5); doc.setTextColor(...GOLD);
  doc.text('Container Interchange Report', MARGIN, 26.5);
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(120);
  doc.text('Mombasa, Kenya  ·  Generated automatically for reference only', MARGIN, 31.5);

  // Top-right stacked boxes, mirroring the "Inward Date / Inward IER" boxes
  // on the Dodwell form.
  fieldBox(140, 12, 28, 10, ic.type ? `${ic.type} Date` : 'Date', fmtDate(ic.date));
  fieldBox(168, 12, 28, 10, 'EIR / IER No.', ic.eirNumber || ic.id.slice(0, 8).toUpperCase());
  doc.setDrawColor(180); doc.setLineWidth(0.3); doc.line(MARGIN, 36, RIGHT, 36);

  // ---- field grid --------------------------------------------------------
  let y = 41;
  fieldBox(MARGIN, y, CONTENT_W, 11, 'Shipping Line', lineName(ic.line));
  y += 14;
  fieldBox(MARGIN, y, 62, 11, 'Container No.', ic.container);
  fieldBox(MARGIN + 65, y, 42, 11, 'Type / Size', ic.ctype);
  fieldBox(MARGIN + 110, y, 33, 11, 'Movement', ic.type);
  fieldBox(MARGIN + 146, y, 36, 11, 'Condition', (ic.condition || '—').toUpperCase());
  y += 14;
  fieldBox(MARGIN, y, 60, 11, 'Vessel Name', ic.vessel);
  fieldBox(MARGIN + 63, y, 40, 11, 'Voyage No.', ic.voyage);
  fieldBox(MARGIN + 106, y, 76, 11, 'B/L Number', ic.blNumber);
  y += 14;
  fieldBox(MARGIN, y, 92, 11, 'Party Delivering / Receiving', ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—'));
  fieldBox(MARGIN + 95, y, 42, 11, 'Vehicle No.', ic.truck ? truckName(ic.truck).split(' · ')[0] : (ic.truckRegText || '—'));
  fieldBox(MARGIN + 140, y, 42, 11, 'Driver', ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—'));
  y += 18;

  // ---- container diagram + damage legend --------------------------------
  sectionLabel('Container Inspection', y); y += 6;
  const diagX = MARGIN, diagY = y, diagW = 62, diagH = 38;
  const sideDefs = [
    { code: 'T', label: 'Top / Roof' }, { code: 'L', label: 'Left Side' },
    { code: 'R', label: 'Right Side' }, { code: 'F', label: 'Front' },
    { code: 'D', label: 'Rear / Door' }, { code: 'B', label: 'Floor / Bottom' },
  ];
  const repairs = ic.repairs || [];
  function sideMatches(sideText, code) {
    if (!sideText) return false;
    const s = String(sideText).toLowerCase();
    const map = { T: 'top|roof', L: 'left', R: 'right', F: 'front', D: 'rear|door', B: 'floor|bottom' };
    return new RegExp(map[code]).test(s);
  }
  const flagged = new Set(sideDefs.filter(sd => repairs.some(r => sideMatches(r.side, sd.code))).map(sd => sd.code));

  doc.setDrawColor(150); doc.setLineWidth(0.3); doc.rect(diagX, diagY, diagW, diagH);
  doc.setDrawColor(190); doc.line(diagX, diagY + diagH * 0.22, diagX + diagW, diagY + diagH * 0.22);
  doc.line(diagX, diagY + diagH * 0.78, diagX + diagW, diagY + diagH * 0.78);
  doc.line(diagX + diagW * 0.5, diagY, diagX + diagW * 0.5, diagY + diagH);
  const marks = [
    { code: 'T', x: diagX + diagW * 0.5, y: diagY + diagH * 0.11 },
    { code: 'F', x: diagX + diagW * 0.25, y: diagY + diagH * 0.5 },
    { code: 'D', x: diagX + diagW * 0.75, y: diagY + diagH * 0.5 },
    { code: 'B', x: diagX + diagW * 0.5, y: diagY + diagH * 0.89 },
  ];
  marks.forEach(m => {
    const isFlagged = flagged.has(m.code);
    doc.setDrawColor(isFlagged ? 200 : 160, isFlagged ? 40 : 160, isFlagged ? 40 : 160);
    doc.setFillColor(isFlagged ? 220 : 245, isFlagged ? 60 : 245, isFlagged ? 60 : 245);
    doc.circle(m.x, m.y, 3.4, 'FD');
    doc.setFont(undefined, 'bold'); doc.setFontSize(7);
    doc.setTextColor(isFlagged ? 255 : 90, isFlagged ? 255 : 90, isFlagged ? 255 : 90);
    doc.text(m.code, m.x, m.y + 1.3, { align: 'center' });
  });
  ['L', 'R'].forEach(code => {
    const isFlagged = flagged.has(code);
    const mx = code === 'L' ? diagX - 4.5 : diagX + diagW + 4.5;
    doc.setDrawColor(isFlagged ? 200 : 160, isFlagged ? 40 : 160, isFlagged ? 40 : 160);
    doc.setFillColor(isFlagged ? 220 : 245, isFlagged ? 60 : 245, isFlagged ? 60 : 245);
    doc.circle(mx, diagY + diagH * 0.5, 3.4, 'FD');
    doc.setFont(undefined, 'bold'); doc.setFontSize(7);
    doc.setTextColor(isFlagged ? 255 : 90, isFlagged ? 255 : 90, isFlagged ? 255 : 90);
    doc.text(code, mx, diagY + diagH * 0.5 + 1.3, { align: 'center' });
  });

  // legend beside the diagram
  doc.setTextColor(20);
  let lx = diagX + diagW + 14, ly = diagY + 3;
  doc.setFont(undefined, 'bold'); doc.setFontSize(7); doc.setTextColor(120);
  doc.text('LOCATION LEGEND', lx, ly); ly += 5;
  sideDefs.forEach(sd => {
    const isFlagged = flagged.has(sd.code);
    doc.setDrawColor(isFlagged ? 200 : 170, isFlagged ? 40 : 170, isFlagged ? 40 : 170);
    doc.setFillColor(isFlagged ? 220 : 255, isFlagged ? 60 : 255, isFlagged ? 60 : 255);
    doc.circle(lx + 1.6, ly - 1, 1.8, 'FD');
    doc.setFont(undefined, isFlagged ? 'bold' : 'normal'); doc.setFontSize(7.5);
    doc.setTextColor(isFlagged ? 160 : 60, isFlagged ? 30 : 60, isFlagged ? 30 : 60);
    doc.text(`${sd.code} — ${sd.label}${isFlagged ? '  (damage noted)' : ''}`, lx + 6, ly);
    ly += 5;
  });
  doc.setTextColor(20);
  y = diagY + diagH + 10;

  // ---- repair estimate table --------------------------------------------
  sectionLabel('Repair Estimate', y); y += 5;
  const cols = [
    { key: 'code', label: 'Code', x: MARGIN, w: 18 },
    { key: 'item', label: 'Description of Damage / Repair', x: MARGIN + 18, w: 92 },
    { key: 'side', label: 'Side', x: MARGIN + 110, w: 18 },
    { key: 'labour', label: 'Labour Cost', x: MARGIN + 128, w: 27 },
    { key: 'material', label: 'Material Cost', x: MARGIN + 155, w: 27 },
  ];
  doc.setDrawColor(150); doc.setLineWidth(0.25);
  doc.setFillColor(235, 235, 235);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'FD');
  cols.forEach(c => doc.rect(c.x, y, c.w, 7));
  doc.setFont(undefined, 'bold'); doc.setFontSize(7.5); doc.setTextColor(60);
  cols.forEach(c => doc.text(c.label, c.x + 1.5, y + 4.7));
  y += 7;

  doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(20);
  let repairTotal = 0;
  if (repairs.length) {
    repairs.forEach(r => {
      const hours = Number(r.hours || 0);
      const labour = hours * REPAIR_LABOUR_RATE_PER_HOUR;
      const material = Number(r.material || 0);
      repairTotal += labour + material;
      const lines = doc.splitTextToSize(r.item || '—', cols[1].w - 3);
      const rowH = Math.max(7, lines.length * 3.6 + 3);
      cols.forEach(c => doc.rect(c.x, y, c.w, rowH));
      doc.text(String(r.code || '—'), cols[0].x + 1.5, y + 4.6);
      doc.text(lines, cols[1].x + 1.5, y + 4.6);
      doc.text(String(r.side || '—'), cols[2].x + 1.5, y + 4.6);
      doc.text(labour.toLocaleString(undefined, { minimumFractionDigits: 2 }), cols[3].x + cols[3].w - 1.5, y + 4.6, { align: 'right' });
      doc.text(material.toLocaleString(undefined, { minimumFractionDigits: 2 }), cols[4].x + cols[4].w - 1.5, y + 4.6, { align: 'right' });
      y += rowH;
    });
  } else {
    doc.rect(MARGIN, y, CONTENT_W, 8);
    doc.setFont(undefined, 'italic'); doc.setTextColor(100);
    doc.text('Container received in good condition — no damage items recorded.', MARGIN + 2, y + 5.3);
    doc.setFont(undefined, 'normal'); doc.setTextColor(20);
    y += 8;
  }
  const total = Number(ic.repairTotal || repairTotal || repairItemsTotal(repairs) || 0);
  doc.setDrawColor(150); doc.rect(MARGIN, y, CONTENT_W - 34, 8);
  doc.rect(RIGHT - 34, y, 34, 8, 'S');
  doc.setFont(undefined, 'bold'); doc.setFontSize(8.5);
  doc.text('TOTAL (LABOUR + MATERIAL)', MARGIN + 2, y + 5.3);
  doc.text(`KSh ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, RIGHT - 2, y + 5.3, { align: 'right' });
  y += 14;

  // ---- inspection / remarks / signatures ---------------------------------
  if (y > 250) { doc.addPage(); y = 20; }
  fieldBox(MARGIN, y, 60, 11, 'Place of Inspection', 'Gargo Haven Depot, Mombasa');
  fieldBox(MARGIN + 63, y, 55, 11, 'Inspector Name', '');
  fieldBox(MARGIN + 121, y, 61, 11, 'Approval Date', '');
  y += 14;
  fieldBox(MARGIN, y, CONTENT_W, 16, 'Remarks', ic.notes || '');
  y += 24;

  doc.setDrawColor(180); doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 76, y); doc.line(RIGHT - 76, y, RIGHT, y);
  doc.setFont(undefined, 'normal'); doc.setFontSize(8.5); doc.setTextColor(110);
  doc.text('Depot Officer Signature', MARGIN, y + 5);
  doc.text('Driver / Transporter Signature', RIGHT - 76, y + 5);

  doc.setFontSize(7.5); doc.setTextColor(150);
  doc.text('This document confirms container delivery/receipt at Gargo Haven Depot and supports transporter payment processing.', MARGIN, 289);

  doc.save(`interchange-${(ic.container || ic.id).replace(/\s+/g, '')}.pdf`);
}


async function downloadInspectionReport(surveyId) {
  if (!surveyId) { toast('No survey on file for this record', 'error'); return; }
  let s = (_surveyRegisterData.find(x => x.id === surveyId)) || _surveyLookupCache[surveyId];
  if (!s) {

    s = await window.bookingDocs.surveyById(surveyId);
    if (s) _surveyLookupCache[s.id] = s;
  }
  if (!s) { toast('Survey record not found', 'error'); return; }
  if (!window.jspdf) { toast('PDF library still loading — try again in a moment', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const GREEN = [46, 125, 50], BLUE = [30, 64, 175], GOLD = [201, 162, 39];
  const MARGIN = 14, CONTENT_W = 182, RIGHT = MARGIN + CONTENT_W;

  function infoBox(x, y, w, h, fill) {
    doc.setFillColor(...fill); doc.setDrawColor(...fill);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
  }
  function kv(x, y, label, value, valueColor) {
    doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(90);
    doc.text(String(label).toUpperCase(), x, y);
    doc.setFont(undefined, 'bold'); doc.setFontSize(9.5); doc.setTextColor(...(valueColor || [20,20,20]));
    doc.text(String(value || '—'), x, y + 5);
    doc.setTextColor(20);
  }
  function sectionHeading(text, y) {
    doc.setFont(undefined, 'bold'); doc.setFontSize(10); doc.setTextColor(20);
    doc.text(text.toUpperCase(), MARGIN, y);
    doc.setDrawColor(20); doc.setLineWidth(0.5); doc.line(MARGIN, y + 1.5, RIGHT, y + 1.5);
  }
  function ensureSpace(y, needed) {
    if (y + needed > 282) { doc.addPage(); return 20; }
    return y;
  }

  const repairs = s.tariff_items || [];
  const damageTotal = repairs.reduce((sum, r) => sum + (Number(r.price) || Number(r.material) || (Number(r.hours||0) * REPAIR_LABOUR_RATE_PER_HOUR) || 0), 0);
  const now = new Date();
  const reportId = `REP-INS-${String(s.id).replace(/-/g,'').slice(0,8).toUpperCase()}`;

  // ---- header ----------------------------------------------------------
  doc.setFont(undefined, 'bold'); doc.setFontSize(13); doc.setTextColor(20);
  doc.text('GARGO HAVEN DEPOT Ltd', MARGIN, 18);
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(110);
  doc.text('Refinery Road, Changamwe, Mombasa. P.O. Box 3291 - 80100 GPO, MSA', MARGIN, 23.5);
  doc.text('Email: info@gargohavendepot.co.ke', MARGIN, 27.5);

  doc.setFont(undefined, 'bold'); doc.setFontSize(20); doc.setTextColor(20);
  doc.text('INSPECTION', RIGHT, 17, { align: 'right' });
  doc.setFont(undefined, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GOLD);
  doc.text(reportId, RIGHT, 23, { align: 'right' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(140);
  doc.text(now.toLocaleString('en-KE'), RIGHT, 27.5, { align: 'right' });

  doc.setDrawColor(20); doc.setLineWidth(0.6); doc.line(MARGIN, 31, RIGHT, 31);

  // ---- report information panel (green) --------------------------------
  let y = 37;
  infoBox(MARGIN, y, CONTENT_W, 18, [232, 245, 233]);
  kv(MARGIN + 4, y + 8, 'Report ID', reportId, GREEN);
  kv(MARGIN + 4, y + 15.5, 'Type', 'Container Inspection Report', GREEN);
  kv(MARGIN + 95, y + 8, 'Generated', fmtDate(now.toISOString()), GREEN);
  kv(MARGIN + 95, y + 15.5, 'Generated By', s.clerk_name || '—', GREEN);
  y += 24;

  // ---- title banner (blue) ---------------------------------------------
  infoBox(MARGIN, y, CONTENT_W, 10, [219, 234, 254]);
  doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE);
  doc.text('Container Inspection Report', MARGIN + 4, y + 6.7);
  doc.setTextColor(20);
  y += 16;

  // ---- inspection information --------------------------------------------
  sectionHeading('Inspection Information', y); y += 8;
  kv(MARGIN, y, 'Inspection ID', '#' + String(s.id).slice(0, 8).toUpperCase()); 
  kv(MARGIN + 63, y, 'Inspection Date', fmtDate(s.surveyed_at));
  kv(MARGIN + 126, y, 'Status', s.escalated ? 'Escalated' : 'Completed');
  y += 12;
  kv(MARGIN, y, 'Inspection Method', 'Manual');
  kv(MARGIN + 63, y, 'Overall Condition', (s.condition_status||'').replace(/_/g,' ').toUpperCase());
  kv(MARGIN + 126, y, 'Surveyed By', s.clerk_name || '—');
  y += 16;

  // ---- container information ---------------------------------------------
  sectionHeading('Container Information', y); y += 8;
  kv(MARGIN, y, 'Container Number', s.container);
  kv(MARGIN + 63, y, 'Container Type', s.container_type);
  kv(MARGIN + 126, y, 'ISO Code', s.iso_code);
  y += 12;
  kv(MARGIN, y, 'Customer / Consignee', s.consignee);
  kv(MARGIN + 63, y, 'Shipping Line', lineName(s.shipping_line_id));
  kv(MARGIN + 126, y, 'Vessel / Voyage', `${s.vessel || '—'} / ${s.voyage || '—'}`);
  y += 16;

  // ---- weight / safety plate ----------------------------------------------
  sectionHeading('Weight & Safety Plate', y); y += 8;
  kv(MARGIN, y, 'Max Gross Weight (MGW)', s.mgwt ? `${s.mgwt} kg` : '—');
  kv(MARGIN + 63, y, 'Tare Weight (TW)', s.tare_weight ? `${s.tare_weight} kg` : '—');
  kv(MARGIN + 126, y, 'Guarantee / B/L No.', s.bl_number);
  y += 16;

  // ---- transport / driver details -----------------------------------------
  sectionHeading('Transport & Driver Details', y); y += 8;
  kv(MARGIN, y, 'Vehicle / Truck No.', s.truck_reg);
  kv(MARGIN + 63, y, 'Trailer Number', s.trailer_number);
  kv(MARGIN + 126, y, 'Transporter', s.transporter);
  y += 12;
  kv(MARGIN, y, "Driver's Name", s.driver_name);
  kv(MARGIN + 63, y, 'Driver ID Number', s.driver_id_number);
  kv(MARGIN + 126, y, 'EIR Number', s.eir_number);
  y += 12;
  kv(MARGIN, y, 'Seal Number', s.seal_number);
  kv(MARGIN + 63, y, 'Gate Pass No.', s.gate_pass_number);
  y += 18;

  // ---- inspection results summary strip -----------------------------------
  y = ensureSpace(y, 24);
  const stripW = CONTENT_W / 3 - 3;
  [
    { label: 'DAMAGE REPORTS', value: String(repairs.length) },
    { label: 'EST. REPAIR COST', value: `KSh ${damageTotal.toLocaleString(undefined,{minimumFractionDigits:2})}` },
    { label: 'CONDITION', value: (s.condition_status||'').replace(/_/g,' ').toUpperCase() },
  ].forEach((box, i) => {
    const bx = MARGIN + i * (stripW + 4.5);
    doc.setDrawColor(210); doc.setLineWidth(0.3); doc.roundedRect(bx, y, stripW, 18, 1.5, 1.5, 'S');
    doc.setFont(undefined, 'bold'); doc.setFontSize(13); doc.setTextColor(20);
    doc.text(box.value, bx + stripW/2, y + 8, { align: 'center' });
    doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); doc.setTextColor(120);
    doc.text(box.label, bx + stripW/2, y + 14, { align: 'center' });
  });
  y += 26;

  // ---- inspector notes ------------------------------------------------------
  if (s.remarks) {
    y = ensureSpace(y, 20);
    sectionHeading('Inspector Notes', y); y += 7;
    doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.line(MARGIN, y - 3, MARGIN, y + 6);
    doc.setFillColor(245,245,245); doc.rect(MARGIN + 2, y - 4, CONTENT_W - 2, 12, 'F');
    doc.setFont(undefined, 'italic'); doc.setFontSize(8.5); doc.setTextColor(60);
    const lines = doc.splitTextToSize(s.remarks, CONTENT_W - 8);
    doc.text(lines.slice(0,2), MARGIN + 5, y + 1);
    doc.setTextColor(20);
    y += 16;
  }

  // ---- inspection photos ------------------------------------------------------
  const photos = Array.isArray(s.photos) ? s.photos : [];
  if (photos.length) {
    y = ensureSpace(y, 20);
    sectionHeading('Inspection Photos', y); y += 7;
    const cellW = (CONTENT_W - 8) / 3, cellH = 32;
    photos.slice(0, 9).forEach((src, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      if (row > 0 && row % 3 === 0 && col === 0) { doc.addPage(); y = 20; }
      const px = MARGIN + col * (cellW + 4);
      const py = y + (row % 3) * (cellH + 4);
      try {
        doc.addImage(src, undefined, px, py, cellW, cellH, undefined, 'FAST');
      } catch (e) { /* skip unreadable image */ }
      doc.setDrawColor(210); doc.rect(px, py, cellW, cellH, 'S');
    });
    y += Math.ceil(Math.min(photos.length, 9) / 3) * (cellH + 4) + 4;
  }

  // ---- damage reports ------------------------------------------------------
  y = ensureSpace(y, 20);
  sectionHeading(`Damage Reports (${repairs.length})`, y); y += 8;
  if (!repairs.length) {
    doc.setFont(undefined, 'italic'); doc.setFontSize(8.5); doc.setTextColor(100);
    doc.text('No damage items recorded for this container.', MARGIN, y);
    doc.setTextColor(20); y += 10;
  } else {
    repairs.forEach(r => {
      y = ensureSpace(y, 30);
      const price = Number(r.price) || Number(r.material) || (Number(r.hours||0) * REPAIR_LABOUR_RATE_PER_HOUR) || 0;
      doc.setDrawColor(210); doc.setLineWidth(0.3); doc.roundedRect(MARGIN, y, CONTENT_W, 26, 1.5, 1.5, 'S');
      doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(20);
      doc.text(`${r.item || r.category || 'Damage Item'}`, MARGIN + 3, y + 6);
      doc.setFillColor(219, 234, 254); doc.roundedRect(RIGHT - 24, y + 2.5, 20, 5, 1, 1, 'F');
      doc.setFont(undefined, 'bold'); doc.setFontSize(6.5); doc.setTextColor(...BLUE);
      doc.text('MINOR', RIGHT - 14, y + 6, { align: 'center' });
      doc.setTextColor(20);
      kv(MARGIN + 3, y + 15, 'Location', r.side || '—');
      kv(MARGIN + 63, y + 15, 'Damage / Repair Code', r.code || '—');
      kv(MARGIN + 126, y + 15, 'Tariff / Repair Price', `KSh ${price.toLocaleString(undefined,{minimumFractionDigits:2})}`, [200,60,60]);
      y += 30;
    });
  }

  // ---- certification ------------------------------------------------------
  y = ensureSpace(y, 40);
  doc.setDrawColor(20); doc.setLineWidth(0.5); doc.rect(MARGIN, y, CONTENT_W, 22);
  doc.setFont(undefined, 'bold'); doc.setFontSize(9); doc.setTextColor(20);
  doc.text('Certification', MARGIN + CONTENT_W/2, y + 7, { align: 'center' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(80);
  const certLines = doc.splitTextToSize('This inspection report was generated by GARGO HAVEN DEPOT Ltd and represents an accurate record of the container inspection performed.', CONTENT_W - 8);
  doc.text(certLines, MARGIN + CONTENT_W/2, y + 13, { align: 'center' });
  y += 30;

  doc.setDrawColor(150); doc.line(MARGIN, y, MARGIN + 70, y);
  doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(110);
  doc.text('Inspector Signature', MARGIN, y + 5);
  doc.setFontSize(7.5); doc.setTextColor(150);
  doc.text(`GARGO HAVEN DEPOT Ltd — Generated by ${s.clerk_name || 'system'} on ${now.toLocaleDateString('en-KE')}`, RIGHT, y + 5, { align: 'right' });

  doc.save(`inspection-report-${(s.container || s.id).replace(/\s+/g, '')}.pdf`);
}


let _linesFilter='all';
function filterLines(f,btn){ _linesFilter=f; document.querySelectorAll('#sec-shippinglines .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderLines(f); }

function renderLines(f){
  let lines=f==='all'?state.db.shippingLines:state.db.shippingLines.filter(l=>l.active);
  const unmappedTotal = (state.db.interchange||[]).filter(ic=>!ic.line).length;
  const summary=document.getElementById('linesSummary');
  if(summary){
    summary.innerHTML=`<div class="panel"><div class="panel-head"><span class="panel-title">Summary</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Lines</span><span class="fsr-val">${state.db.shippingLines.length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Active</span><span class="fsr-val">${state.db.shippingLines.filter(l=>l.active).length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Trips (all)</span><span class="fsr-val">${state.db.trips.length}</span></div>${unmappedTotal?`<div class="fuel-summary-row"><span class="fsr-label" style="color:var(--gold)">⚠ Interchange records with no line</span><span class="fsr-val">${unmappedTotal}</span></div>`:''}</div>`;
  }
  const unmappedBtn = document.getElementById('unmappedVesselsBtn');
  if (unmappedBtn) { unmappedBtn.style.display = unmappedTotal ? 'inline-flex' : 'none'; unmappedBtn.textContent = `⚠ Resolve Unmapped Vessels (${unmappedTotal})`; }
  const grid=document.getElementById('linesGrid');
  if(!grid) return;
  grid.innerHTML=lines.map(l=>`<div class="line-card"><div class="line-code-badge">${l.code}</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${l.name}</div><div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${l.contact}</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><div class="ts">KSh ${fmt(l.rate20)}<b>20ft Rate</b></div><div class="ts">KSh ${fmt(l.rate40)}<b>40ft Rate</b></div><div class="ts">KSh ${fmt(l.rateHC)}<b>HC Rate</b></div></div><div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">${sbadge(l.active?'active':'off_duty')}${isAdmin()?`<button class="tbl-btn" onclick="showEditLineModal('${l.id}')">✎ Edit Rates</button>`:''}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No shipping lines</div></div>';
}

function showEditLineModal(id) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l) { toast('Shipping line not found', 'error'); return; }
  openModal(`Edit ${esc(l.code)} — ${esc(l.name)}`, `<div class="form-row-2"><div class="fg"><label>Code</label><input id="sle_code" value="${esc(l.code)}" maxlength="6"/></div><div class="fg"><label>Full Name</label><input id="sle_name" value="${esc(l.name)}"/></div></div><div class="fg"><label>Contact Email</label><input id="sle_email" type="email" value="${esc(l.contact||'')}"/></div><div class="form-row-2"><div class="fg"><label>20ft Rate (KSh)</label><input id="sle_r20" type="number" min="0" value="${l.rate20}"/></div><div class="fg"><label>40ft Rate (KSh)</label><input id="sle_r40" type="number" min="0" value="${l.rate40}"/></div></div><div class="fg"><label>40ft HC Rate (KSh)</label><input id="sle_rhc" type="number" min="0" value="${l.rateHC}"/></div><div class="fg"><label>Status</label><select id="sle_active"><option value="true" ${l.active?'selected':''}>Active</option><option value="false" ${!l.active?'selected':''}>Inactive</option></select></div><button class="submit-btn" onclick="saveShippingLineEdit('${l.id}')">Save Changes →</button>`);
}

function saveShippingLineEdit(id) {
  const l = state.db.shippingLines.find(x => x.id === id);
  if (!l) { toast('Shipping line not found', 'error'); return; }
  const code = document.getElementById('sle_code').value.trim().toUpperCase();
  const name = document.getElementById('sle_name').value.trim();
  if (!code || !name) { toast('Code and name required', 'error'); return; }
  if (code.length > 6) { toast('Code must be max 6 characters', 'error'); return; }
  const dupLine = findLineByCode(code, id);
  if (dupLine) { toast(`Code ${code} is already used by ${dupLine.name}`, 'error'); return; }
  l.code = code;
  l.name = name;
  l.contact = sanitize(document.getElementById('sle_email').value.trim());
  l.rate20 = Math.max(0, parseInt(document.getElementById('sle_r20').value) || 0);
  l.rate40 = Math.max(0, parseInt(document.getElementById('sle_r40').value) || 0);
  l.rateHC = Math.max(0, parseInt(document.getElementById('sle_rhc').value) || 0);
  l.active = document.getElementById('sle_active').value === 'true';
  scheduleSave(); closeModal(); renderLines(_linesFilter);
  addAudit(state.profile.username, 'Shipping Line Rates Updated', `${code} — 20ft KSh ${fmt(l.rate20)} · 40ft KSh ${fmt(l.rate40)} · HC KSh ${fmt(l.rateHC)}`);
  toast(`${code} rates updated`, 'success');
}

function showAddLineModal() {
  openModal('Add Shipping Line', `<div class="form-row-2"><div class="fg"><label>Code</label><input id="sl_code" placeholder="MSC" maxlength="6"/></div><div class="fg"><label>Full Name</label><input id="sl_name" placeholder="Mediterranean Shipping Co."/></div></div><div class="fg"><label>Contact Email</label><input id="sl_email" type="email" placeholder="office@line.com"/></div><div class="form-row-2"><div class="fg"><label>20ft Rate (KSh)</label><input id="sl_r20" type="number" placeholder="10000"/></div><div class="fg"><label>40ft Rate (KSh)</label><input id="sl_r40" type="number" placeholder="14000"/></div></div><div class="fg"><label>40ft HC Rate (KSh)</label><input id="sl_rhc" type="number" placeholder="16000"/></div><button class="submit-btn" onclick="saveShippingLine()">Add Line →</button>`);
}

function saveShippingLine() {
  const code = document.getElementById('sl_code').value.trim().toUpperCase();
  const name = document.getElementById('sl_name').value.trim();
  if (!code||!name) { toast('Code and name required', 'error'); return; }
  if (code.length > 6) { toast('Code must be max 6 characters', 'error'); return; }
  const dupLine = findLineByCode(code);
  if (dupLine) { toast(`Code ${code} is already used by ${dupLine.name}`, 'error'); return; }
  state.db.shippingLines.push({
    id: uid('SL'), code, name,
    contact: sanitize(document.getElementById('sl_email').value.trim()),
    rate20: Math.max(0, parseInt(document.getElementById('sl_r20').value)||10000),
    rate40: Math.max(0, parseInt(document.getElementById('sl_r40').value)||14000),
    rateHC: Math.max(0, parseInt(document.getElementById('sl_rhc').value)||16000),
    active: true,
  });
  scheduleSave(); closeModal(); renderLines('all');
  toast(`${code} added`, 'success');
}


const UNRESOLVABLE_VESSEL_VALUES = new Set(['', 'N/A', 'NA', 'N.A', 'N./A', 'N\\A', 'TBA', 'T.B.A', 'TO BE ADVISED', 'NOT CAPTURED', 'DUMMY', 'EMPTY DUMMY', 'EMPTY DUMMY VESSEL', 'N']);

function _unmappedVesselGroups() {
  const groups = {};
  (state.db.interchange || []).forEach(ic => {
    if (ic.line) return;
    const norm = normVessel(ic.vessel);
    if (UNRESOLVABLE_VESSEL_VALUES.has(norm)) return;
    (groups[norm] = groups[norm] || { vessel: norm, count: 0, ids: [] });
    groups[norm].count++;
    groups[norm].ids.push(ic.id);
  });
  return Object.values(groups).sort((a, b) => b.count - a.count);
}

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

async function assignVesselToLine(idx) {
  const group = (window._uvmGroups || [])[idx];
  const sel = document.getElementById(`uvm_sel_${idx}`);
  const lineId = sel ? sel.value : '';
  if (!group) return;
  if (!lineId) { toast('Choose a shipping line first', 'error'); return; }
  const line = state.db.shippingLines.find(l => l.id === lineId);
  if (!line) { toast('Shipping line not found', 'error'); return; }

  const row = document.getElementById(`uvm_row_${idx}`);
  const btn = row ? row.querySelector('button') : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Assigning…'; }

  try {
  
    const { error } = await supabase.from('interchange')
      .update({ line_id: lineId })
      .is('line_id', null)
      .in('id', group.ids);
    if (error) throw error;



    const { data: inserted, error: mapErr } = await supabase.from('vessel_line_map')
      .insert({ pattern: group.vessel, match_type: 'exact', line_id: lineId, priority: 100, source: 'manual', created_by: state.profile?.username || null })
      .select('*').single();
    if (!mapErr && inserted) state.db.vesselLineMap.push(vlmFromRow(inserted));


    const idSet = new Set(group.ids);
    state.db.interchange.forEach(ic => { if (idSet.has(ic.id)) ic.line = lineId; });

    addAudit(state.profile.username, 'Shipping Line Backfilled', `${group.count} record(s) with vessel "${group.vessel}" → ${line.code}`);
    toast(`${group.count} record(s) assigned to ${line.code}`, 'success');

    if (row) row.remove();
    buildBadges();
    renderLines(_linesFilter);
    if (document.getElementById('sec-depotreport')?.classList.contains('active')) renderDepotReport();
    if (document.getElementById('sec-depops')?.classList.contains('active')) renderDepOpsReports();
  } catch (e) {
    console.error('assignVesselToLine failed:', e);
    toast('Could not save — try again', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Assign →'; }
  }
}

/* ──────────────────────────────────────────────────────────────────
   § 19  REQUISITIONS
────────────────────────────────────────────────────────────────── */
let _reqFilter='all';
function filterRequisitions(f,btn){ _reqFilter=f; document.querySelectorAll('#sec-requisitions .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderRequisitions(f); }

function renderRequisitions(f){
  let items=f==='all'?state.db.requisitions:state.db.requisitions.filter(r=>r.status===f);
  const el=document.getElementById('reqList');
  if(!el) return;
  el.innerHTML=items.map(r=>`<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${r.category}</div><div class="req-meta">${r.id} · ${fmtDate(r.date)}</div></div><div style="text-align:right">${sbadge(r.status)}<div class="req-amount" style="margin-top:4px">${fmtKsh(r.amount)}</div></div></div><div class="req-items">${r.items}</div><div class="req-meta" style="margin-top:6px">Requester: ${r.requester}${r.approver?` · Approved by: ${r.approver}`:''}</div>${r.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px;font-style:italic">${r.notes}</div>`:''}</div>`).join('')||'<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-label">No requisitions</div></div>';
}

function showAddRequisitionModal() {
  openModal('New Requisition', `<div class="form-row-2"><div class="fg"><label>Category</label><select id="rq_cat"><option>Fuel Advance</option><option>Tyre Parts</option><option>Tool Purchase</option><option>Medical</option><option>Lubricants</option><option>Other</option></select></div><div class="fg"><label>Amount (KSh)</label><input id="rq_amt" type="number" placeholder="0"/></div></div><div class="fg"><label>Items / Description</label><textarea id="rq_items" rows="3" placeholder="List what is needed…"></textarea></div><div class="fg"><label>Notes</label><input id="rq_notes" placeholder="Additional context…"/></div><button class="submit-btn" onclick="saveRequisition()">Submit Requisition →</button>`);
}

function saveRequisition() {
  const items = document.getElementById('rq_items').value.trim();
  const amt   = Math.max(0, parseInt(document.getElementById('rq_amt').value)||0);
  if (!items||!amt) { toast('Items and amount required','error'); return; }
  if (!state.profile?.id) { toast('Session error — please log in again', 'error'); return; }
  state.db.requisitions.push({
    id: uid('REQ'), requester: state.profile.name, requesterId: state.profile.id,
    category: document.getElementById('rq_cat').value,
    items, amount: amt,
    notes: sanitize(document.getElementById('rq_notes').value.trim()),
    date: new Date().toISOString(), status:'pending',
    approver:null, approvedDate:null,
  });
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Requisition Submitted', `${items.slice(0,50)}…`);
  closeModal(); renderRequisitions('all');
  toast('Requisition submitted', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 20  WORKSHOP
────────────────────────────────────────────────────────────────── */
let _wsFilter='all';
function filterWorkshop(f,btn){ _wsFilter=f; document.querySelectorAll('#sec-workshop .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderWorkshop(f); }

function renderWorkshop(f){
  let items=f==='all'?state.db.workshop:state.db.workshop.filter(w=>w.status===f);
  const el=document.getElementById('workshopList');
  if(!el) return;
  el.innerHTML=items.map(w=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${w.title}</div><div style="font-size:10.5px;color:var(--text-3);margin-top:2px">${w.id} · ${truckName(w.truckId)}</div></div>${sbadge(w.status)}</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:8px">${w.desc}</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9.5px;color:var(--text-3)"><span>Tech: ${w.tech}</span><span>Total: <span style="color:var(--gold);font-weight:700">${fmtKsh(w.total)}</span></span></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🔩</div><div class="empty-state-label">No workshop jobs</div></div>';
}

function showAddWorkshopJobModal() {
  openModal('New Workshop Job Card', `<div class="fg"><label>Truck</label><select id="ws_truck">${state.db.trucks.map(t=>`<option value="${t.id}">${t.reg} — ${t.make}</option>`).join('')}</select></div><div class="fg"><label>Job Title</label><input id="ws_title" placeholder="Describe the job…"/></div><div class="fg"><label>Description</label><textarea id="ws_desc" rows="3" placeholder="Detailed scope of work…"></textarea></div><div class="form-row-2"><div class="fg"><label>Technician</label><input id="ws_tech" placeholder="Tech name"/></div><div class="fg"><label>Labour (KSh)</label><input id="ws_labour" type="number" placeholder="0"/></div></div><div class="form-row-2"><div class="fg"><label>Parts Description</label><input id="ws_parts" placeholder="Parts list…"/></div><div class="fg"><label>Parts Cost (KSh)</label><input id="ws_pcost" type="number" placeholder="0"/></div></div><button class="submit-btn" onclick="saveWorkshopJob()">Create Job Card →</button>`);
}

function saveWorkshopJob() {
  const title = document.getElementById('ws_title').value.trim();
  if (!title) { toast('Job title required','error'); return; }
  const labour = Math.max(0, parseInt(document.getElementById('ws_labour').value)||0);
  const pcost  = Math.max(0, parseInt(document.getElementById('ws_pcost').value)||0);
  state.db.workshop.push({
    id: uid('WS'), truckId: document.getElementById('ws_truck').value,
    title, desc: sanitize(document.getElementById('ws_desc').value.trim()),
    tech: sanitize(document.getElementById('ws_tech').value.trim()),
    parts: sanitize(document.getElementById('ws_parts').value.trim()),
    labour, total: labour+pcost,
    status:'reported', reported: new Date().toISOString(), diagnosed:null,
  });
  scheduleSave();
  addAudit(state.profile.username, 'Workshop Job Created', title);
  closeModal(); renderWorkshop('all');
  toast('Job card created', 'success');
}

/* ──────────────────────────────────────────────────────────────────
   § 21  INVOICING (admin-only)
────────────────────────────────────────────────────────────────── */
function renderInvoicing(f) {
  if (!isAdmin()) return;
  renderInvoiceKpis();
  renderInvoiceList(f);
}

function renderInvoiceKpis() {
  const inv = state.db.invoices;
  const total    = inv.reduce((s,i)=>s+i.total,0);
  const paid     = inv.reduce((s,i)=>s+i.paid,0);
  const outstanding = total - paid;
  const overdue  = inv.filter(i=>i.status==='overdue').reduce((s,i)=>s+(i.total-i.paid),0);
  const kpis = document.getElementById('invKpis');
  if (!kpis) return;
  kpis.innerHTML = `${kpiCard('Total Invoiced', fmtKsh(total), `${inv.length} invoices`, 'kpi-gold')} ${kpiCard('Collected', fmtKsh(paid), `${Math.round(paid/total*100)||0}% collected`, 'kpi-green')} ${kpiCard('Outstanding', fmtKsh(outstanding), 'Pending payment', 'kpi-blue')} ${kpiCard('Overdue', fmtKsh(overdue), `${inv.filter(i=>i.status==='overdue').length} invoices`, 'kpi-red')}`;
}

let _invFilter='all';
function filterInvoices(f,btn){ _invFilter=f; document.querySelectorAll('#sec-invoicing .filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderInvoiceList(f); }

function renderInvoiceList(f){
  let items=f==='all'?state.db.invoices:state.db.invoices.filter(i=>i.status===f);
  const el=document.getElementById('invoicesList');
  if(!el) return;
  el.innerHTML=`<div class="inv-grid">${items.map(inv=>`<div class="inv-card ${inv.status}" onclick="showInvoiceDetail('${inv.id}')"><div class="inv-type-tag">${inv.ref}</div><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${inv.client}</div><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px"><div><div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--gold)">${fmtKsh(inv.total)}</div><div style="font-size:10px;color:var(--text-3);margin-top:2px">${inv.paid?`Paid: ${fmtKsh(inv.paid)}`:'Unpaid'}</div></div>${sbadge(inv.status)}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:8px">Due: ${fmtDate(inv.due)}</div></div>`).join('')||'<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-label">No invoices</div></div>'}</div>`;
}

function showInvoiceDetail(id) {
  const inv = state.db.invoices.find(i=>i.id===id);
  if (!inv) return;
  const trips = state.db.trips.filter(t=>inv.trips.includes(t.id));
  const ic = invoiceConfig();
  openModal(`Invoice — ${inv.ref}`, `<div class="inv-doc"><div class="inv-doc-head"><div><div class="inv-doc-company-name">${ic.companyName}</div><div class="inv-doc-company-details">${ic.companyName} · ${ic.companyLocation}<br>${ic.companyTel} · KRA: ${ic.kraPin}</div></div><div style="text-align:right"><div class="inv-doc-id">${inv.ref}</div><div class="inv-doc-type">Tax Invoice</div><div class="inv-doc-status">${sbadge(inv.status)}</div></div></div><div class="inv-billing-row"><div><div class="inv-bill-label">Bill To</div><div class="inv-bill-name">${inv.client}</div></div><div><div class="inv-bill-label">Invoice Date</div><div class="inv-bill-detail">${fmtDate(inv.date)}</div><div class="inv-bill-label" style="margin-top:6px">Due Date</div><div class="inv-bill-detail">${fmtDate(inv.due)}</div></div></div><div class="inv-items-table-wrap"><table class="inv-items-table"><thead><tr><th>Description</th><th>Container</th><th>Work Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>${trips.map(t=>`<tr><td>Haulage — ${t.ctype}</td><td class="mono">${t.container}</td><td>${t.workType}</td><td class="mono" style="text-align:right">${fmtKsh(inv.subtotal/Math.max(trips.length,1))}</td></tr>`).join('')||`<tr><td colspan="4" style="text-align:center;color:var(--text-3)">General haulage services</td></tr>`}</tbody></table></div><div class="inv-totals"><div class="inv-totals-row"><span>Subtotal</span><span class="inv-amount">${fmtKsh(inv.subtotal)}</span></div><div class="inv-totals-row"><span>VAT ${ic.vatRate}%</span><span class="inv-amount">${fmtKsh(inv.vat)}</span></div>${inv.paid?`<div class="inv-totals-row"><span>Amount Paid</span><span class="inv-amount" style="color:var(--green)">-${fmtKsh(inv.paid)}</span></div>`:''}<div class="inv-totals-row total-row"><span style="font-weight:700">Balance Due</span><span class="inv-amount" style="font-size:16px;color:var(--gold);font-weight:700">${fmtKsh(inv.total-inv.paid)}</span></div></div><div class="inv-bank">Bank: ${ic.bankName} · A/C: ${ic.bankAccount} · Swift: ${ic.bankSwift} · Ref: ${inv.ref}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${inv.status!=='paid'?`<button class="modal-btn success" onclick="markInvoicePaid('${id}')">Mark as Paid</button>`:''}${inv.status==='draft'?`<button class="modal-btn primary" onclick="markInvoiceSent('${id}')">Mark as Sent</button>`:''}<button class="modal-btn ghost" onclick="downloadInvoicePDF('${id}')">⬇ Download PDF</button></div>`);
}

function markInvoicePaid(id) {
  const inv = state.db.invoices.find(i=>i.id===id);
  if (!inv) return;
  inv.status='paid'; inv.paid=inv.total;
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Paid', `${inv.ref} — ${fmtKsh(inv.total)}`);
  closeModal(); renderInvoiceList(_invFilter); renderInvoiceKpis();
  toast(`${inv.ref} marked as paid`, 'success');
}

function markInvoiceSent(id) {
  const inv = state.db.invoices.find(i=>i.id===id);
  if (!inv) return;
  inv.status='sent';
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Sent', inv.ref);
  closeModal(); renderInvoiceList(_invFilter);
  toast(`${inv.ref} marked as sent`, 'success');
}

function downloadInvoicePDF(id) { toast('PDF export — integrate with jsPDF for production', 'info'); }

function showCreateInvoiceModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  openModal('Create Invoice', `<div class="fg"><label>Client Name</label><input id="ci_client" placeholder="Company Ltd"/></div><div class="form-row-2"><div class="fg"><label>Subtotal (KSh)</label><input id="ci_sub" type="number" placeholder="0"/></div><div class="fg"><label>Due Date</label><input id="ci_due" type="date"/></div></div><div class="fg"><label>Select Trips</label><div style="max-height:150px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:8px">${state.db.trips.map(t=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px;cursor:pointer"><input type="checkbox" value="${t.id}" style="accent-color:var(--gold)">${t.container} — ${t.origin}→${t.dest}</label>`).join('')}</div></div><div class="fg"><label>Notes</label><textarea id="ci_notes" rows="2"></textarea></div><button class="submit-btn" onclick="saveInvoice()">Create Invoice →</button>`);
}

function saveInvoice() {
  const client = document.getElementById('ci_client').value.trim();
  const sub    = Math.max(0, parseInt(document.getElementById('ci_sub').value)||0);
  if (!client||!sub) { toast('Client and amount required','error'); return; }
  const vat   = Math.round(sub * invoiceVatRate());
  const total = sub+vat;
  const trips = [...document.querySelectorAll('#modalBody input[type=checkbox]:checked')].map(cb=>cb.value);
  const inv = {
    id: uid('INV'), client, subtotal:sub, vat, total, paid:0,
    trips, status:'draft', ref: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    due: document.getElementById('ci_due').value||new Date(Date.now()+30*86400000).toISOString(),
    notes: sanitize(document.getElementById('ci_notes').value.trim()),
  };
  state.db.invoices.push(inv);
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Created', `${inv.ref} — ${client}`);
  closeModal(); renderInvoicing(_invFilter);
  toast(`Invoice ${inv.ref} created`, 'success');
}

function autoGenerateInvoices() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const tripsWithoutInvoice = state.db.trips.filter(t=>t.status==='completed' && !state.db.invoices.some(i=>i.trips.includes(t.id)));
  if (!tripsWithoutInvoice.length) { toast('All completed trips already invoiced','info'); return; }
  tripsWithoutInvoice.forEach(t=>{
    const line  = state.db.shippingLines.find(l=>l.id===t.shippingLine);
    const rates = state.db.billingRates[t.ctype]||{base:12000,perKm:180};
    const sub   = rates.base + rates.perKm * t.distance;
    const vat   = Math.round(sub * invoiceVatRate());
    state.db.invoices.push({
      id: uid('INV'), client: line? `${line.name} (Auto)` :'Client (Auto)',
      subtotal:sub, vat, total:sub+vat, paid:0,
      trips:[t.id], status:'draft',
      ref: `INV-${Date.now().toString().slice(-4)}-${uid('').slice(0,3)}`,
      date: new Date().toISOString(),
      due: new Date(Date.now()+30*86400000).toISOString(),
      notes:'Auto-generated from completed trip',
    });
  });
  scheduleSave();
  addAudit(state.profile.username, 'Auto Invoices', `${tripsWithoutInvoice.length} generated`);
  renderInvoicing(_invFilter);
  toast(`${tripsWithoutInvoice.length} invoice(s) generated`, 'success');
}

function showBillingRatesModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const rates = state.db.billingRates;
  openModal('Billing Rates', `<div class="table-wrap"><table class="data-table"><thead><tr><th>Container Type</th><th>Base Rate (KSh)</th><th>Per km (KSh)</th><th></th></tr></thead><tbody id="billingRatesRows">${Object.entries(rates).map(([k,v])=>`<tr><td>${k}</td><td><input type="number" value="${v.base}" onchange="updateRate('${k}','base',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><input type="number" value="${v.perKm}" onchange="updateRate('${k}','perKm',this.value)" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;width:100px"/></td><td><button class="tbl-btn" style="color:var(--red)" onclick="removeBillingRateType('${k}')">🗑</button></td></tr>`).join('')}</tbody></table></div><div class="form-row-2" style="margin-top:12px"><div class="fg"><label>New Container Type</label><input id="brNewType" placeholder="e.g. 20ft"/></div><div class="fg"><label>Base Rate (KSh)</label><input id="brNewBase" type="number" placeholder="0"/></div></div><div class="fg"><label>Per km (KSh)</label><input id="brNewPerKm" type="number" placeholder="0"/></div><button class="action-btn ghost" onclick="addBillingRateType()">+ Add Container Type</button><button class="submit-btn" style="margin-top:12px" onclick="saveBillingRates()">Save Rates →</button>`);
}

function updateRate(ctype, field, val) { state.db.billingRates[ctype][field] = Math.max(0, parseInt(val)||0); }

function addBillingRateType() {
  const type  = sanitize(document.getElementById('brNewType').value.trim());
  const base  = Math.max(0, parseInt(document.getElementById('brNewBase').value)||0);
  const perKm = Math.max(0, parseInt(document.getElementById('brNewPerKm').value)||0);
  if (!type) { toast('Container type required', 'error'); return; }
  state.db.billingRates[type] = { base, perKm };
  showBillingRatesModal();
}

function removeBillingRateType(ctype) {
  delete state.db.billingRates[ctype];
  showBillingRatesModal();
}

function saveBillingRates() { scheduleSave(); addAudit(state.profile.username,'Billing Rates','Updated'); closeModal(); toast('Billing rates updated', 'success'); }

function requireFinanceReport(tab, btn) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  renderReport('revenue');
  document.querySelectorAll('#sec-reports .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

/* ──────────────────────────────────────────────────────────────────
   § 22  ALLOCATION ENGINE
────────────────────────────────────────────────────────────────── */
let _allocTab='auto';
function switchAllocTab(tab, btn) {
  if ((tab==='requisitions'||tab==='workshop') && !isAdmin()) { toast('Admin rights required', 'error'); return; }
  _allocTab=tab;
  ['allocTabAuto','allocTabManual','allocTabRequisitions','allocTabWorkshop'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
  const map={auto:'allocTabAuto',manual:'allocTabManual',requisitions:'allocTabRequisitions',workshop:'allocTabWorkshop'};
  const el=document.getElementById(map[tab]);
  if(el) el.style.display='block';
  document.querySelectorAll('#sec-allocation .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(tab==='auto') renderAllocAuto();
  if(tab==='manual') renderAllocManual();
  if(tab==='requisitions') renderAdminRequisitions();
  if(tab==='workshop') renderAdminWorkshop();
}

function renderAllocation() { renderAllocAuto(); }

function renderAllocAuto() {
  const db=state.db;
  const avail    = db.trucks.filter(t=>t.status==='available').length;
  const drivers  = db.drivers.filter(d=>d.status==='available').length;
  const awaiting = awaitingDispatchTrips().length;
  const pending  = db.trips.filter(t=>t.status==='active').length;
  document.getElementById('allocKpis').innerHTML= `${kpiCard('Available Trucks', avail, '', 'kpi-green')} ${kpiCard('Available Drivers', drivers, '', 'kpi-gold')} ${kpiCard('Awaiting Dispatch', awaiting, '', 'kpi-orange')} ${kpiCard('Active Dispatches', pending, '', 'kpi-blue')}`;
  renderAllocAwaitingList('allocQueue', 'allocQueueMeta');
  document.getElementById('allocRules').innerHTML=db.allocationRules.map(r=>`<div class="alloc-rule"><div style="display:flex;justify-content:space-between;align-items:center"><div class="rule-name">${r.name}</div><div class="rule-weight">${r.weight}%</div></div><div class="rule-desc">${r.desc}</div></div>`).join('');
  document.getElementById('allocRecommendations').innerHTML='<div style="padding:16px;color:var(--text-3);font-size:11.5px">Run auto-allocation to generate recommendations</div>';
}

function renderAllocManual() {

  fillSelect('ma_truck',  state.db.trucks,  t=>[t.id, `${t.reg} — ${t.status}`]);
  fillSelect('ma_driver', state.db.drivers.filter(d=>d.status==='available'), d=>[d.id, d.name]);
  renderStatusOverridePanel();
  renderAllocAwaitingList('allocManualAwaitingList', 'allocManualAwaitingMeta');
}

function renderStatusOverridePanel() {
  const rows = [...state.db.trucks.slice(0,5).map(t=>({ label:t.reg, kind:'Truck', id:t.id, status:t.status, type:'truck' })), ...state.db.drivers.slice(0,5).map(d=>({ label:d.name, kind:'Driver', id:d.id, status:d.status, type:'driver' }))];
  const panel=document.getElementById('adminStatusPanel');
  if(!panel) return;
  panel.innerHTML=rows.map(r=>`<div class="admin-status-row"><div><div style="font-size:12px;color:var(--text)">${r.label}</div><div style="font-size:10px;color:var(--text-3)">${r.kind}</div></div>${sbadge(r.status)}<div style="display:flex;gap:4px">${(r.type==='truck'?['available','on_trip','maintenance','breakdown','off_duty']:['available','on_trip','off_duty','suspended']).map(s=>`<button class="tbl-btn" onclick="adminOverrideStatus('${r.type}','${r.id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div></div>`).join('');
}

function adminOverrideStatus(type, id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  if(type==='truck'){ const t=state.db.trucks.find(t=>t.id===id); if(t){t.status=status; addAudit(state.profile.username,'Status Override', `${t.reg} → ${status}`);} }
  else { const d=state.db.drivers.find(d=>d.id===id); if(d){d.status=status; addAudit(state.profile.username,'Status Override', `${d.name} → ${status}`);} }
  scheduleSave(); buildBadges(); renderStatusOverridePanel(); toast(`Status updated to ${status}`,'success');
}

function runAllocation() {
  const avail   = state.db.trucks.filter(t=>t.status==='available' && t.fuelPct >=40);
  const drivers = state.db.drivers.filter(d=>d.status==='available');
  if (!avail.length || !drivers.length) { toast('No available trucks/drivers for allocation','warning'); return; }
  const recs = avail.slice(0,3).map((t,i)=>({ truck:t, driver:drivers[i%drivers.length], score:Math.round(70+Math.random()*30) }));
  document.getElementById('allocRecommendations').innerHTML=recs.map(r=>`<div class="recommend-card"><div><div class="rc-label">Truck</div><div class="rc-val">${r.truck.reg}</div></div><div><div class="rc-label">Driver</div><div class="rc-val">${r.driver.name}</div></div><div><div class="rc-label">Match Score</div><div class="rc-val" style="color:var(--gold)">${r.score}%</div></div><button class="modal-btn primary" onclick="applyAllocation('${r.truck.id}','${r.driver.id}')">Assign</button></div>`).join('');
  toast(`${recs.length} recommendations generated`, 'success');
}

function applyAllocation(truckId, driverId) {
  const result = pairDriverTruck(truckId, driverId);
  if (!result) { toast('Truck or driver not found', 'error'); return; }
  const { t, d } = result;
  scheduleSave();
  addAudit(state.profile.username, 'Auto Allocation', `${t.reg} ← ${d.name}`);
  toast(`${d.name} assigned to ${t.reg}`, 'success');
  renderAllocAuto();
}


function pairDriverTruck(truckId, driverId) {
  const t = state.db.trucks.find(tr=>tr.id===truckId);
  const d = state.db.drivers.find(dr=>dr.id===driverId);
  if (!t || !d) return null;
  state.db.drivers.forEach(other => { if (other.id !== d.id && other.truckId === truckId) other.truckId = null; });
  t.driver = driverId;
  d.truckId = truckId;
  return { t, d };
}

function manualAssignDriverToTruck() {
  const truck  = document.getElementById('ma_truck').value;
  const driver = document.getElementById('ma_driver').value;
  const notes  = sanitize((document.getElementById('ma_notes')?.value||'').trim());
  if (!truck||!driver) { toast('Select truck and driver','error'); return; }
  const result = pairDriverTruck(truck, driver);
  if (!result) { toast('Truck or driver not found', 'error'); return; }
  const { t, d } = result;

  scheduleSave();
  addAudit(state.profile.username, 'Manual Assignment', `${t?.reg} ← ${d?.name}${notes?` — ${notes}`:''}`);
  toast(`${d?.name} assigned to ${t?.reg}. Open Dispatch Console to put them on a trip.`, 'success');
  const notesEl = document.getElementById('ma_notes');
  if (notesEl) notesEl.value = '';
  renderAllocManual();
}

function showAllocationRulesModal() {
  openModal('Configure Allocation Rules', `${state.db.allocationRules.map(r=>`<div style="padding:10px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:12px;font-weight:600;color:var(--text)">${r.name}</div><input type="number" value="${r.weight}" min="0" max="100" style="width:60px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:4px;text-align:center" onchange="updateRuleWeight('${r.id}',this.value)"/></div><div style="font-size:11px;color:var(--text-3)">${r.desc}</div></div>`).join('')}<button class="submit-btn" onclick="saveAllocRules()">Save Rules →</button>`);
}

function updateRuleWeight(id, val) { const r=state.db.allocationRules.find(r=>r.id===id); if(r) r.weight=Math.max(0, parseInt(val)||0); }
function saveAllocRules() { scheduleSave(); closeModal(); toast('Allocation rules saved','success'); }

function renderAdminRequisitions() {
  const pending = state.db.requisitions.filter(r=>r.status==='pending');
  const el=document.getElementById('adminReqList');
  if(!el) return;
  el.innerHTML=pending.map(r=>`<div class="req-card"><div class="req-card-head"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${r.category}</div><div class="req-meta">${r.requester} · ${fmtDate(r.date)}</div></div><div class="req-amount">${fmtKsh(r.amount)}</div></div><div class="req-items">${r.items}</div><div style="display:flex;gap:8px;margin-top:10px"><button class="modal-btn success" onclick="reviewReq('${r.id}','approved')">Approve</button><button class="modal-btn danger" onclick="reviewReq('${r.id}','rejected')">Reject</button></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No pending requisitions</div></div>';
}

function reviewReq(id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const r=state.db.requisitions.find(r=>r.id===id);
  if(!r) return;
  r.status=status; r.approver=state.profile.username; r.approvedDate=new Date().toISOString();
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, `Requisition ${status}`, `${r.category} — ${fmtKsh(r.amount)}`);
  renderAdminRequisitions(); renderRequisitions(_reqFilter);
  toast(`Requisition ${status}`, status==='approved'?'success':'warning');
}

function renderAdminWorkshop() {
  const items=state.db.workshop.filter(w=>w.status!=='completed');
  const el=document.getElementById('adminWorkshopList');
  if(!el) return;
  el.innerHTML=items.map(w=>`<div class="ws-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div style="font-size:12.5px;font-weight:700;color:var(--text)">${w.title}</div><div style="font-size:10.5px;color:var(--text-3)">${truckName(w.truckId)} · ${w.tech}</div></div>${sbadge(w.status)}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['reported','diagnosed','in_progress','completed'].map(s=>`<button class="filter-btn${w.status===s?' active':''}" onclick="advanceWorkshop('${w.id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No open workshop jobs</div></div>';
}

function advanceWorkshop(id, status) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const w=state.db.workshop.find(w=>w.id===id);
  if(!w) return;
  w.status=status;
  if(status==='completed') { const t=state.db.trucks.find(t=>t.id===w.truckId); if(t && t.status==='maintenance')t.status='available'; }
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Workshop Update', `${w.title} → ${status}`);
  renderAdminWorkshop(); renderWorkshop(_wsFilter);
  toast(`Job updated to ${status}`, 'success');
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
    out.innerHTML=`<div class="two-col-grid"><div class="report-block"><h3>Fleet Overview</h3>${reportRow('Total Trucks', db.trucks.length)}${reportRow('Available', db.trucks.filter(t=>t.status==='available').length)}${reportRow('On Trip', db.trucks.filter(t=>t.status==='on_trip').length)}${reportRow('Breakdown/Maintenance', db.trucks.filter(t=>['breakdown','maintenance'].includes(t.status)).length)}</div><div class="report-block"><h3>Operations</h3>${reportRow('Trips Today', db.trips.filter(t=>new Date(t.startTime).toDateString()===new Date().toDateString()).length)}${reportRow('Active Trips', db.trips.filter(t=>t.status==='active').length)}${reportRow('Completed (All)', db.trips.filter(t=>t.status==='completed').length)}${reportRow('Total Distance (All)', fmt(db.trips.reduce((s,t)=>s+t.distance,0))+' km')}</div><div class="report-block"><h3>Fuel</h3>${reportRow('Total Fills', db.fuel.length)}${reportRow('Total Litres', fmt(db.fuel.reduce((s,f)=>s+f.litres,0))+' L')}${reportRow('Total Cost', fmtKsh(db.fuel.reduce((s,f)=>s+f.litres*f.pricePerLitre,0)))}</div><div class="report-block"><h3>Compliance</h3>${reportRow('Open Maintenance', db.maintenance.filter(m=>m.status==='open').length)}${reportRow('Pending Requisitions', db.requisitions.filter(r=>r.status==='pending').length)}${reportRow('Shutouts Open', db.shutouts.filter(s=>s.status==='open').length)}</div></div>`;
  } else if(tab==='fleet'){
    out.innerHTML=`<div class="report-block"><h3>Fleet Utilisation</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Truck</th><th>Status</th><th>Fuel</th><th>Mileage</th><th>Trips</th><th>Next Service</th></tr></thead><tbody>${db.trucks.map(t=>`<tr><td class="mono" style="color:var(--gold)">${t.reg}</td><td>${sbadge(t.status)}</td><td><div class="fuel-bar" style="width:80px"><div class="fuel-fill" style="width:${t.fuelPct}%;background:${fuelColour(t.fuelPct)}"></div></div></td><td class="mono">${fmt(t.mileage)} km</td><td class="mono">${db.trips.filter(tr=>tr.truckId===t.id).length}</td><td style="color:${new Date(t.nextService) < Date.now()?'var(--red)':'var(--text-2)'}" class="mono">${fmtDate(t.nextService)}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if(tab==='drivers'){
    out.innerHTML=`<div class="report-block"><h3>Driver Performance</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Driver</th><th>Status</th><th>Trips Today</th><th>Licence Exp.</th></tr></thead><tbody>${db.drivers.map(d=>`<tr><td>${d.name}</td><td>${sbadge(d.status)}</td><td class="mono" style="text-align:center">${d.tripsToday}</td><td style="color:${(new Date(d.licenceExp)-Date.now())<90*86400000?'var(--amber)':'var(--text-2)'}" class="mono">${fmtDate(d.licenceExp)}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if(tab==='maintenance'){
    const totalCost=db.maintenance.reduce((s,m)=>s+m.cost,0);
    out.innerHTML=`<div class="report-block"><h3>Maintenance Summary</h3>${reportRow('Total Issues',db.maintenance.length)}${reportRow('Open',db.maintenance.filter(m=>m.status==='open').length)}${reportRow('In Progress',db.maintenance.filter(m=>m.status==='in_progress').length)}${reportRow('Resolved',db.maintenance.filter(m=>m.status==='resolved').length)}${reportRow('Total Cost',fmtKsh(totalCost))}</div><div class="report-block" style="margin-top:14px"><h3>Issues by Priority</h3>${['critical','high','medium','low'].map(p=>reportRow(p.charAt(0).toUpperCase()+p.slice(1),db.maintenance.filter(m=>m.priority===p).length)).join('')}</div>`;
  } else if(tab==='fuel'){
    out.innerHTML=`<div class="report-block"><h3>Fuel Report</h3>${reportRow('Total Fill-ups',db.fuel.length)}${reportRow('Total Litres',fmt(db.fuel.reduce((s,f)=>s+f.litres,0))+' L')}${reportRow('Total Spend',fmtKsh(db.fuel.reduce((s,f)=>s+f.litres*f.pricePerLitre,0)))}${reportRow('Avg Price/Litre','KSh '+(db.fuel.reduce((s,f)=>s+f.pricePerLitre,0)/Math.max(db.fuel.length,1)).toFixed(2))}</div>`;
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
    /

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
    let q = supabase.from('trips').select('*');
    if (fromVal)  q = q.gte('start_time', new Date(fromVal).toISOString());
    if (toVal)    q = q.lte('start_time', new Date(toVal).toISOString());
    if (truckId)  q = q.eq('truck_id', truckId);
    if (driverId) q = q.eq('driver_id', driverId);
    if (status)   q = q.eq('status', status);
    if (workType) q = q.eq('work_type', workType);
    if (outwardType) q = q.eq('outward_type', outwardType);
    q = q.order('start_time', { ascending: false }).limit(5000);

    const { data, error } = await q;
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
    let q = supabase.from('audit_log').select('*');
    if (fromVal) q = q.gte('time', new Date(fromVal).toISOString());
    if (toVal)   q = q.lte('time', new Date(toVal).toISOString());
    if (user)    q = q.eq('username', user);
    if (search)  q = q.or(`action.ilike.%${search}%,detail.ilike.%${search}%`);
    q = q.order('time', { ascending: false }).limit(2000);

    const { data, error } = await q;
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

/* ---- shared CSV/file-download helpers --------------------------- */
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function initTrackingSection() {
  renderTracking();
  initTrackingMap();
}

// Trucks worth showing on the tracking board — on the road or stopped on
// the road (breakdown). Parked/off-duty/in-workshop trucks are excluded
// since there's no driver phone to report a position for them anyway.
const TRACKABLE_TRUCK_STATUSES = ['available', 'on_trip', 'breakdown'];

function renderTracking() {
  const pos = state.db.trackingPositions || {};
  const activeTrucks = state.db.trucks.filter(t => TRACKABLE_TRUCK_STATUSES.includes(t.status));
  const liveCount = activeTrucks.filter(t => pos[t.id]).length;
  document.getElementById('trackingMeta').textContent =
    `${activeTrucks.length} vehicle${activeTrucks.length===1?'':'s'} tracked · ${liveCount} reporting live`;

  const vehicles = document.getElementById('trackingVehicles');
  if (vehicles) {

    vehicles.innerHTML = activeTrucks.map(t=>{
      const p = pos[t.id];
      const dr = state.db.drivers.find(d=>d.truckId===t.id);
      const hasFix = !!p;
      const srcLabel = p?.source === 'wialon' ? 'Wialon GPS' : 'Driver Phone';
      const srcTag = hasFix
        ? `<span style="color:var(--green,#3ecf6e)">● Live — ${srcLabel} · ${timeAgo(p.lastUpdate)}</span>`
        : `<span style="color:var(--text-3)">${t.wialonUnitId ? 'No Wialon signal — unit may be offline' : 'No phone signal — driver may be off duty or offline'}</span>`;
      return `<div class="tv-item" ${hasFix ? `onclick="focusTruckOnMap('${t.id}')"` : ''}>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><span class="tv-reg">${esc(t.reg)}</span>${sbadge(t.status)}</div>
        <div style="margin-top:2px">${dr ? esc(dr.name) : 'Unassigned'}</div>
        <div style="font-size:9px;margin-top:2px">${srcTag}</div>
        ${hasFix ? `<div style="font-size:9px;color:var(--text-3);margin-top:2px">${esc(p.zone||'')} · ${p.speed>0?p.speed+' km/h':'Stationary'}</div>` : ''}
        <button class="tbl-btn" style="margin-top:6px;width:100%" ${hasFix?'':'disabled'} onclick="event.stopPropagation();${hasFix?`showStreetView(${p.lat},${p.lng},'${esc(t.reg)}')`:''}">🧭 Street View</button>
      </div>`;
    }).join('') || '<div style="padding:10px;color:var(--text-3);font-size:11px">No vehicles to track</div>';
  }

  const movements = document.getElementById('trackingMovements');
  if (movements) {
    const liveIds = Object.keys(pos);
    movements.innerHTML = liveIds.map(id=>{
      const p=pos[id]; const t=state.db.trucks.find(t=>t.id===id);
      return `<div class="movement-row" onclick="focusTruckOnMap('${id}')"><div class="mono" style="font-size:10px;color:var(--gold)">${t?esc(t.reg):id}</div><div style="font-size:11px;color:var(--text-2)">${esc(p.zone||'')} · ${p.speed>0?p.speed+' km/h':'Stationary'}</div><div style="font-size:9.5px;color:var(--text-3)">${timeAgo(p.lastUpdate)}</div></div>`;
    }).join('') || '<div style="padding:12px;color:var(--text-3)">No active movements</div>';
  }

  const geofence = document.getElementById('trackingGeofence');
  if (geofence) {
    geofence.innerHTML = geofenceEvents().slice(0, 8).map(e => `<div class="geofence-row-wrap">
      <div class="activity-row" style="cursor:pointer" onclick="toggleGeofenceEvent('${e.id}')">
        <span class="act-icon">${e.icon}</span><span style="flex:1">${esc(e.text)}</span>
        <span class="act-time">${timeAgo(e.time)}</span>
        <span style="margin-left:6px;opacity:0.6;font-size:10px">${state.geofenceExpanded.has(e.id) ? '▲' : '▼'}</span>
      </div>
      ${state.geofenceExpanded.has(e.id) ? renderGeofenceEventDetail(e) : ''}
    </div>`).join('') || '<div style="padding:12px;color:var(--text-3);font-size:10.5px">No gate events recorded</div>';
  }
}


function geofenceEvents() {
  const events = [];
  (state.db.trips||[]).forEach(t => {
    events.push({ id: t.id+'-out', tripId: t.id, text: `Gate-out — ${t.container} departed ${t.origin}`, time: t.startTime, icon: '📤' });
    if (t.status === 'completed') events.push({ id: t.id+'-in', tripId: t.id, text: `Gate-in — ${t.container} arrived ${t.dest}`, time: t.startTime, icon: '📥' });
    if (t.status === 'delayed') events.push({ id: t.id+'-hold', tripId: t.id, text: `Holding near ${t.dest} — ${t.container} (Delayed)`, time: t.startTime, icon: '⏱️' });
    if (t.status === 'breakdown') events.push({ id: t.id+'-stop', tripId: t.id, text: `Stopped en route — ${t.container} (Breakdown)`, time: t.startTime, icon: '⚠️' });
  });
  events.sort((a,b)=> new Date(b.time) - new Date(a.time));
  return events;
}

function toggleGeofenceEvent(id) {
  if (state.geofenceExpanded.has(id)) state.geofenceExpanded.delete(id); else state.geofenceExpanded.add(id);
  renderTracking();
}

function renderGeofenceEventDetail(e) {
  const t = state.db.trips.find(x=>x.id===e.tripId);
  if (!t) return '';
  return `<div style="padding:10px 12px 12px;margin:2px 0 6px;background:var(--surface-2);border-radius:8px">
    <div class="detail-row"><span>Route</span><b>${esc(t.origin)} → ${esc(t.dest)}</b></div>
    <div class="detail-row"><span>Truck / Driver</span><b>${esc(truckName(t.truckId))} · ${esc(driverName(t.driverId))}</b></div>
    <div class="detail-row"><span>Distance</span><b>${t.distance||0} km</b></div>
    <div class="detail-row"><span>Status</span><b>${sbadge(t.status)}</b></div>
    <div style="margin-top:10px"><button class="tbl-btn" onclick="event.stopPropagation();closeModal();showTripDetail('${t.id}')">View Trip →</button></div>
  </div>`;
}


function showStreetView(lat, lng, label) {
  const embedUrl = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&output=svembed`;
  const openUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  openModal('Street View' + (label ? ' — ' + esc(label) : ''), `
    <div style="position:relative;width:100%;padding-top:64%;border-radius:8px;overflow:hidden;background:var(--surface)">
      <iframe src="${embedUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
    <a class="modal-btn ghost" style="margin-top:12px;width:100%;text-decoration:none;box-sizing:border-box;display:block;text-align:center" href="${openUrl}" target="_blank" rel="noopener">↗ Open Full Street View in Google Maps</a>
  `);
}


function focusTruckOnMap(truckId) {
  const p = state.db.trackingPositions?.[truckId];
  if (!p || !state.trackingMap) return;
  state.trackingMap.setView([p.lat, p.lng], Math.max(state.trackingMap.getZoom(), 13), { animate: true });
  const marker = state.truckMarkers[truckId];
  if (marker) marker.openPopup();
}


function fitTrackingBounds() {
  if (!state.trackingMap) return;
  const markers = Object.values(state.truckMarkers);
  if (!markers.length) { toast('No vehicles currently tracked', 'info', 1800); return; }
  const group = L.featureGroup(markers);
  state.trackingMap.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14 });
}


async function refreshTracking() {
  const { data, error } = await supabase.from('tracking_positions').select('*');
  if (error) { toast('Could not refresh tracking data', 'error'); return; }
  const fresh = {};
  (data || []).forEach(r => { fresh[r.truck_id] = { lat:r.lat, lng:r.lng, speed:r.speed, heading:r.heading, zone:r.zone, lastUpdate:r.last_update, source:r.source||'driver_app' }; });
  state.db.trackingPositions = fresh;
  renderTracking();
  updateTrackingMarkers();
  toast('Tracking positions refreshed', 'info', 1800);
}


function subscribeTrackingRealtime() {
  if (state._trackingChannel) return;
  state._trackingChannel = supabase.channel('tracking-positions-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_positions' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const id = payload.old?.truck_id;
        if (id) delete state.db.trackingPositions[id];
      } else {
        const r = payload.new;
        state.db.trackingPositions[r.truck_id] = { lat:r.lat, lng:r.lng, speed:r.speed, heading:r.heading, zone:r.zone, lastUpdate:r.last_update, source:r.source||'driver_app' };
      }
      if (state.currentSection === 'livetracking') { renderTracking(); updateTrackingMarkers(); }
    })
    .subscribe();
}


let _liveSyncDebounce = null;

let _bulkWriteInProgress = false;

function subscribeLiveSync() {
  if (state._liveSyncChannel) return;
  const tables = [
    'trucks', 'drivers', 'trips', 'maintenance', 'fuel_logs', 'shutouts',
    'interchange', 'requisitions', 'workshop_jobs', 'invoices',
    'shipping_lines', 'allocation_rules',
  ];

  let channel = supabase.channel('gargo-live-sync');
  tables.forEach(t => {
    channel = channel.on(
      'postgres_changes', { event: '*', schema: 'public', table: t },
      () => {
        if (_bulkWriteInProgress) return; // the importer will refresh the UI itself when done
        // Debounced — a bulk import touching many rows triggers one
        // refresh, not one per row. 2s comfortably outlasts a burst of
        // realtime events from a single chunked upsert.
        clearTimeout(_liveSyncDebounce);
        _liveSyncDebounce = setTimeout(refreshFromServer, 2000);
      }
    );
  });
  state._liveSyncChannel = channel.subscribe();
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


function initAutoRefresh() {
  const cfg = autoRefreshConfig();
  if (cfg.enabled) startAutoRefresh(cfg.intervalSecs);
}


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

let _refreshInFlight = false;
let _refreshQueuedAgain = false;

async function refreshFromServer() {

  const modalOpen = document.getElementById('modalOverlay')?.classList.contains('active');
  if (modalOpen) { _liveSyncDebounce = setTimeout(refreshFromServer, 1500); return; }


  if (_refreshInFlight) { _refreshQueuedAgain = true; return; }
  _refreshInFlight = true;

  try {
    const fresh = await loadDB();
    if (fresh) {
      state.db = fresh;
      buildBadges();
      buildAlerts();
      renderSection(state.currentSection);
      startWialonPolling();
    }
  } catch (e) {
    console.warn('Live sync refresh failed:', e);
  } finally {
    _refreshInFlight = false;
    if (_refreshQueuedAgain) {
      _refreshQueuedAgain = false;
      clearTimeout(_liveSyncDebounce);
      _liveSyncDebounce = setTimeout(refreshFromServer, 700);
    }
  }
}

function loadGoogleMapsScript(cb) {
  if (window.L) { cb(null); return; }
 
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (window.L) { clearInterval(iv); cb(null); }
    else if (tries > 20) { clearInterval(iv); cb(new Error('load-failed')); }
  }, 150);
}

function initTrackingMap() {
  const canvas = document.getElementById('trackingMapCanvas');
  if (!canvas) return;
  if (state.trackingMap) { updateTrackingMarkers(); return; }
  loadGoogleMapsScript((err) => {
    if (err) {
      canvas.innerHTML = `<div class="tracking-map-placeholder"><div style="font-family:var(--font-brand);font-size:20px;color:var(--gold);margin-bottom:8px">GARGO</div><div style="font-size:12px;color:var(--text-2);max-width:380px;line-height:1.6">Map failed to load — check your internet connection. Vehicle data will still populate the lists on the right.</div></div>`;
      return;
    }
    canvas.innerHTML = '';
    state.trackingMap = L.map(canvas, {
      center: [-4.0435, 39.6682], // Mombasa
      zoom: 12,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(state.trackingMap);
    state.truckMarkers = {};
    updateTrackingMarkers();
    fitTrackingBounds();
  });
}

function updateTrackingMarkers() {
  if (!state.trackingMap || !window.L) return;
  const pos = state.db.trackingPositions || {};
  const seen = new Set();
  Object.entries(pos).forEach(([truckId, p]) => {
    seen.add(truckId);
    const truck = state.db.trucks.find(t => t.id === truckId);
    const label = truck?.reg || truckId;
    const isMoving = p.speed > 0;
    const dotColor = isMoving ? '#3ecf6e' : '#8b8b8b';
    const icon = L.divIcon({
      className: 'truck-marker',
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:14px;height:14px;border-radius:50%;background:${dotColor};border:2px solid #0b0b0b;box-shadow:0 0 0 1px rgba(255,255,255,.15)"></div><div style="font-size:9px;font-weight:700;color:#fff;background:rgba(11,11,11,.75);padding:1px 5px;border-radius:3px;white-space:nowrap">${label}</div></div>`,
      iconSize: [60, 30],
      iconAnchor: [7, 7],
    });
    let marker = state.truckMarkers[truckId];
    if (!marker) {
      marker = L.marker([p.lat, p.lng], { icon }).addTo(state.trackingMap);
      marker.bindPopup('');
      marker.on('click', () => {
        const cur = state.db.trackingPositions[truckId];
        if (!cur) return;
        marker.setPopupContent(`<div style="font-family:sans-serif;font-size:12px;color:#111"><b>${label}</b><br>${cur.zone}<br>${cur.speed} km/h · ${cur.heading}<br><span style="color:#888;font-size:10px">${cur.source==='wialon'?'Wialon GPS':'Driver Phone'} · ${timeAgo(cur.lastUpdate)}</span><br><button class="tbl-btn" style="margin-top:6px" onclick="showStreetView(${cur.lat},${cur.lng},'${esc(label)}')">🧭 Street View</button></div>`);
      });
      state.truckMarkers[truckId] = marker;
    } else {
      marker.setLatLng([p.lat, p.lng]);
      marker.setIcon(icon);
    }
  });

  Object.keys(state.truckMarkers).forEach(id => {
    if (!seen.has(id)) { state.trackingMap.removeLayer(state.truckMarkers[id]); delete state.truckMarkers[id]; }
  });
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
    if (wCfg.enabled && wCfg.token && wCount) {
      gpsStatus.textContent = `Live · Driver GPS + Wialon (${wCount} unit${wCount===1?'':'s'})`;
      gpsStatus.style.color = 'var(--green)';
    } else if (wCfg.enabled && wCfg.token) {
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

function renderWialonSettingsForm() {
  const el = document.getElementById('wialonConfigForm');
  if (!el) return;
  const s = state.db.settings || {};
  const trucksWithUnit = wialonTrackedTrucks();
  el.innerHTML = `
    <label style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-2);cursor:pointer">
      <input type="checkbox" id="st_wialonEnabled" ${s.wialonEnabled ? 'checked' : ''} style="accent-color:var(--gold)"/> Enable Wialon GPS integration
    </label>
    <div class="fg" style="margin:0"><label>Wialon Host</label><input id="st_wialonHost" value="${esc(s.wialonHost || 'https://hst-api.wialon.com')}" placeholder="https://hst-api.wialon.com"/></div>
    <div class="fg" style="margin:0"><label>API Token</label><input id="st_wialonToken" type="password" value="${esc(s.wialonToken || '')}" placeholder="Wialon Remote API token"/></div>
    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">
      ${trucksWithUnit.length
        ? `${trucksWithUnit.length} truck${trucksWithUnit.length===1?'':'s'} linked to a Wialon unit ID — set per-truck under Fleet → truck detail.`
        : `No trucks are linked to a Wialon unit yet — open a truck's detail card under Fleet and set its Wialon Unit ID.`}
      Positions refresh every ${WIALON_POLL_INTERVAL_MS/1000}s and appear on the live tracking map tagged "Wialon GPS".
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="action-btn ghost" style="flex:1" onclick="testWialonConnection()">Test Connection</button>
      <button class="submit-btn" style="flex:1;margin-top:0" onclick="saveWialonSettings()">Save →</button>
    </div>
  `;
}

/* Invoicing & billing configuration — editable by any admin, no redeploy needed. */
function invoiceConfig() {
  const c = state.db.settings?.invoiceConfig || {};
  return {
    companyName:     c.companyName     || state.db.settings?.companyName || 'Gargo Logistics Ltd',
    companyLocation: c.companyLocation || 'Mombasa, Kenya',
    companyTel:      c.companyTel      || '+254 116 307 751',
    kraPin:          c.kraPin          || 'P051234567X',
    bankName:        c.bankName        || 'Equity Bank',
    bankAccount:     c.bankAccount     || '1234567890',
    bankSwift:       c.bankSwift       || 'EQBLKENX',
    vatRate:         (typeof c.vatRate === 'number') ? c.vatRate : 16,
  };
}
function invoiceVatRate() { return invoiceConfig().vatRate / 100; }

function renderInvoiceConfigForm() {
  const el = document.getElementById('invoiceConfigForm');
  if (!el) return;
  const c = invoiceConfig();
  el.innerHTML = `
    <div class="fg" style="margin:0"><label>Company Name</label><input id="ic_companyName" value="${c.companyName}"/></div>
    <div class="fg" style="margin:0"><label>Location</label><input id="ic_companyLocation" value="${c.companyLocation}"/></div>
    <div class="fg" style="margin:0"><label>Phone</label><input id="ic_companyTel" value="${c.companyTel}"/></div>
    <div class="fg" style="margin:0"><label>KRA PIN</label><input id="ic_kraPin" value="${c.kraPin}"/></div>
    <div class="fg" style="margin:0"><label>Bank Name</label><input id="ic_bankName" value="${c.bankName}"/></div>
    <div class="fg" style="margin:0"><label>Bank Account</label><input id="ic_bankAccount" value="${c.bankAccount}"/></div>
    <div class="fg" style="margin:0"><label>Bank Swift</label><input id="ic_bankSwift" value="${c.bankSwift}"/></div>
    <div class="fg" style="margin:0"><label>VAT Rate (%)</label><input id="ic_vatRate" type="number" step="0.1" value="${c.vatRate}"/></div>
  `;
}

function saveInvoiceConfig() {
  const cfg = {
    companyName:     sanitize(document.getElementById('ic_companyName').value.trim())     || 'Gargo Logistics Ltd',
    companyLocation: sanitize(document.getElementById('ic_companyLocation').value.trim()),
    companyTel:      sanitize(document.getElementById('ic_companyTel').value.trim()),
    kraPin:          sanitize(document.getElementById('ic_kraPin').value.trim()),
    bankName:        sanitize(document.getElementById('ic_bankName').value.trim()),
    bankAccount:     sanitize(document.getElementById('ic_bankAccount').value.trim()),
    bankSwift:       sanitize(document.getElementById('ic_bankSwift').value.trim()),
    vatRate:         Math.max(0, parseFloat(document.getElementById('ic_vatRate').value) || 0),
  };
  state.db.settings = state.db.settings || {};
  state.db.settings.invoiceConfig = cfg;
  state.db.settings.companyName = cfg.companyName;
  scheduleSave();
  addAudit(state.profile.username, 'Invoice Settings', 'Updated company & billing details');
  toast('Invoicing details saved', 'success');
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
      // Older exports may carry legacy short ids (e.g. 'TRK001') from
      // pre-migration backups — those aren't valid uuids, so remap them.
      const isUuid = s => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const looksLegacy = data.trucks.length && !isUuid(data.trucks[0].id);
      state.db = looksLegacy ? remapSeedIds(data) : data;
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

function toggleDangerZone() {
  const dz  = document.getElementById('dangerZone');
  const btn = document.getElementById('dangerZoneToggle');
  const open= dz.style.display==='none';
  dz.style.display = open?'block':'none';
  btn.textContent   = open ? '▲ Hide Danger Zone' : '▼ Show Danger Zone';
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
    vesselLineMap: [],
    workshop: [], invoices: [], billingRates: defaultBillingRates(),
    allocationRules: [], trackingPositions: {}, auditLog: [],
    settings: state.db.settings || {
      backupDate: null, mapApiKey: '', whatsapp: true, mpesa: false,
      companyName: 'Gargo Logistics Ltd', invoiceConfig: null,
      wialonEnabled: false, wialonToken: '', wialonHost: 'https://hst-api.wialon.com'
    },
    profiles: state.db.profiles || [],
  };
  await saveDB();
  buildBadges(); buildAlerts();
  renderSection(state.currentSection);
  toast('All data cleared','warning');
}

/* ──────────────────────────────────────────────────────────────────
   § 28  ADMIN ACTION GUARD (vault/PIN flows removed — admin role only)
────────────────────────────────────────────────────────────────── */
function requireAdminAction(callback, actionKey) {
  if (isAdmin()) { callback(); return; }
  toast('Admin rights required for this action', 'error');
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

async function submitChangePassword() {
  const neu = document.getElementById('cp_new').value;
  const conf = document.getElementById('cp_conf').value;
  const err = document.getElementById('cpError');

  if (!neu || !conf) { err.textContent = 'All fields required'; return; }
  if (neu.length < 6) { err.textContent = 'Password must be at least 6 characters'; return; }
  if (neu !== conf) { err.textContent = 'Passwords do not match'; return; }

  try {
    const { error } = await supabase.auth.updateUser({ password: neu });
    if (error) { err.textContent = 'Failed: ' + error.message; return; }
    addAudit(state.profile.username, 'Password Changed', 'Self-service change');
    closeModal();
    toast('Password updated successfully', 'success');
  } catch (e) {
    err.textContent = 'Connection error';
  }
}

const DELETE_TABLE_LABELS = {
  trucks:'Truck', drivers:'Driver', trips:'Trip', maintenance:'Maintenance record',
  fuel:'Fuel log', shutouts:'Shutout record', interchange:'Interchange record',
  shippingLines:'Shipping line', requisitions:'Requisition', workshop:'Workshop job',
  invoices:'Invoice',
};

// Local state.db array keys don't always match the real Supabase table names
// (e.g. `fuel` -> `fuel_logs`, `shippingLines` -> `shipping_lines`). Deletes
// used to only splice the local array — saveDB()'s upsert calls have no way
// to express "this row is gone", so the row was never actually removed from
// Supabase and would reappear on the next full reload. Delete straight from
// the right table instead.
const DELETE_TABLE_SUPABASE_NAMES = {
  trucks:'trucks', drivers:'drivers', trips:'trips', maintenance:'maintenance',
  fuel:'fuel_logs', shutouts:'shutouts', interchange:'interchange',
  shippingLines:'shipping_lines', requisitions:'requisitions', workshop:'workshop_jobs',
  invoices:'invoices',
};

function adminDeleteBtn(table, id) {
  // Deletion is disabled by policy — admins can edit/correct records but not
  // remove them outright, so this always renders nothing now.
  return '';
}

async function confirmDeleteRecord(table, id) {
  if (!isAdmin()) { toast('Admin rights required to delete records', 'error'); return; }
  const label = DELETE_TABLE_LABELS[table] || 'record';
  if (!confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) return;
  const arr = state.db[table];
  if (!Array.isArray(arr)) return;
  const idx = arr.findIndex(r=>r.id===id);
  if (idx===-1) { toast('Record not found', 'error'); return; }

  const supaTable = DELETE_TABLE_SUPABASE_NAMES[table];
  if (supaTable) {
    toast('Deleting…', 'info', 1500);
    const { error } = await supabase.from(supaTable).delete().eq('id', id);
    if (error) {
      // Most likely another row still references this one (e.g. a trip
      // pointing at this truck/driver) and the foreign key blocked it.
      console.error(`${supaTable} delete failed:`, error.message);
      toast(`Could not delete — ${error.message}`, 'error', 6000);
      return;
    }
  }

  arr.splice(idx,1);
  addAudit(state.profile.username, 'Record Deleted', `${label} — ${id}`);
  buildBadges();
  closeModal();
  toast(`${label} deleted`, 'success');
  if (state.currentSection) renderSection(state.currentSection);
  if (state.currentAdminSection) renderSection(state.currentAdminSection);
}


function triggerImageUpload(table, id, field, afterFn) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { toast('Image too large — max 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const rec = state.db[table].find(r=>r.id===id);
      if (!rec) return;
      rec[field] = reader.result;
      rec._dirty = true;
      scheduleSave();
      toast('Image uploaded', 'success');
      if (state.currentSection) renderSection(state.currentSection);
      if (state.currentAdminSection) renderSection(state.currentAdminSection);
      if (typeof afterFn === 'function') afterFn();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}


function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = body;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('active');
}

/* ──────────────────────────────────────────────────────────────────
   § 30  GLOBAL SEARCH  (ported 1:1 from Jastar's pattern: search fires
   only on Enter, the dropdown lists every match, and each row calls back
   through a safe numeric index — never through data interpolated into
   an onclick="" string, which is what silently broke Gargo's old search
   on any name/container containing a quote, e.g. "O'Brien Logistics".)
────────────────────────────────────────────────────────────────── */
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

function sbadgeText(status) {
  const labels={ available:'Available', on_trip:'On Trip', maintenance:'Maintenance', breakdown:'Breakdown', off_duty:'Off Duty', grounded:'Grounded', active:'Active', completed:'Completed', delayed:'Delayed', pending:'Pending', approved:'Approved', rejected:'Rejected', fulfilled:'Fulfilled', overdue:'Overdue', draft:'Draft', sent:'Sent', paid:'Paid', partial:'Partial' };
  return labels[status] || status || '';
}

function runSearchResult(i) {
  const panel = document.getElementById('searchResults'); if (panel) panel.style.display = 'none';
  const gs = document.getElementById('globalSearch'); if (gs) gs.blur();
  if (window._searchResults && window._searchResults[i]) window._searchResults[i]();
}


function showContainerDetail(contRaw) {
  const cont = (contRaw||'').trim().toUpperCase();
  const db = state.db;
  const trips = db.trips.filter(t=>(t.container||'').toUpperCase()===cont).sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  const shutouts = db.shutouts.filter(s=>(s.container||'').toUpperCase()===cont).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const interchange = db.interchange.filter(i=>(i.container||'').toUpperCase()===cont).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const liveTrip = trips.find(isTripLive) || null;

  if (!trips.length && !shutouts.length && !interchange.length) {
    openModal(`Container — ${cont}`, `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-label">No records found for ${cont}</div></div>`);
    return;
  }

  const summary = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">
    <div class="mono" style="font-size:18px;color:var(--gold);font-weight:700">${cont}</div>
    ${liveTrip ? sbadge(liveTrip.status) : '<span style="font-size:11px;color:var(--text-3)">No active trip</span>'}
  </div>`;

  const tripsHtml = `<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip History (${trips.length})</div>` + (
    trips.length ? trips.map(t=>`<div class="activity-row" style="cursor:pointer" onclick="closeModal();showTripDetail('${t.id}')"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">${t.origin} → ${t.dest}</div><div style="font-size:10px;color:var(--text-3)">${truckName(t.truckId)} · ${driverName(t.driverId)}</div></div>${sbadge(t.status)}<div class="act-time">${fmtDate(t.startTime)}</div></div>`).join('')
    : '<div class="empty-state" style="padding:10px 0"><div class="empty-state-label">No trips recorded</div></div>'
  );

  const shutoutsHtml = shutouts.length ? `<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Shutout History (${shutouts.length})</div>` +
    shutouts.map(s=>`<div class="activity-row"><div style="flex:1"><div style="font-size:11.5px;color:var(--text)">${s.reason||'—'}</div><div style="font-size:10px;color:var(--text-3)">${s.vessel||''} ${s.voyage?`· Voyage ${s.voyage}`:''}</div></div>${sbadge(s.status)}<div class="act-time">${fmtDate(s.date)}</div></div>`).join('') : '';

  const interchangeHtml = interchange.length ? `<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 8px">Interchange History (${interchange.length})</div>` +
    interchange.map(i=>{
      const meta = [i.eirNumber ? `EIR ${i.eirNumber}` : null, (i.vessel || i.voyage) ? `${i.vessel||'—'} / ${i.voyage||'—'}` : null].filter(Boolean).join(' · ');
      const repairBadge = (i.repairs && i.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${i.repairs.length} damage item${i.repairs.length>1?'s':''} · KSh ${Number(i.repairTotal||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>` : '';
      const thumb = i.img ? `<img src="${i.img}" style="width:44px;height:44px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:pointer;flex-shrink:0" onclick="showContainerPhotos('${i.id}')" />` : `<div style="width:44px;height:44px;border-radius:5px;border:1px dashed var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:16px">📦</div>`;
      return `<div class="activity-row" style="align-items:flex-start;gap:10px">${thumb}<div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:11.5px;color:var(--text)">${i.type} · ${i.condition}</div>${sbadge(i.status)}</div><div style="font-size:10px;color:var(--text-3)">${lineName(i.line)} · ${fmtDate(i.date)}</div>${meta?`<div style="font-size:10px;color:var(--text-3);margin-top:2px">${meta}</div>`:''}${repairBadge}${i.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:3px">${i.notes}</div>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${(i.surveyId || i.img)?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="showContainerPhotos('${i.id}')">📷 Photos</button>`:''}${i.surveyId?`<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInspectionReport('${i.surveyId}')">⬇ Inspection Report</button>`:''}<button class="modal-btn ghost" style="padding:3px 8px;font-size:10px" onclick="downloadInterchangeSlip('${i.id}')">⬇ Slip</button></div></div></div>`;
    }).join('') : '';


  const actions = [];
  if (liveTrip && canUpdateTripStatus(liveTrip)) {
    nextTripStatuses(liveTrip.status).forEach(s=>{
      actions.push(`<button class="filter-btn" onclick="closeModal();quickSetTripStatus('${liveTrip.id}','${s}')">${s.replace('_',' ')}</button>`);
    });
  }
  if (liveTrip) actions.push(`<button class="modal-btn ghost" onclick="closeModal();showTripDetail('${liveTrip.id}')">View Trip →</button>`);
  if (isAdmin() || isClerk() || isDispatch()) {
    actions.push(`<button class="modal-btn ghost" onclick="closeModal();showAddShutoutModal()">Flag Shutout</button>`);
    actions.push(`<button class="modal-btn ghost" onclick="closeModal();showAddInterchangeModal()">Record Interchange</button>`);
  }

  const actionsHtml = actions.length ? `<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:14px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Actions</div><div style="display:flex;gap:6px;flex-wrap:wrap">${actions.join('')}</div></div>` : '';

  openModal(`Container — ${cont}`, `${summary}${tripsHtml}${shutoutsHtml}${interchangeHtml}${actionsHtml}`);
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

document.addEventListener('click', e=>{
  const chip = document.querySelector('.user-chip-rail');
  const menu = document.getElementById('userMenu');
  if (menu && chip && !chip.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display='none';
  }
  const results = document.getElementById('searchResults');
  const search  = document.querySelector('.search-wrap');
  if (results && search && !search.contains(e.target)) {
    results.style.display='none';
  }
});


function populateSelects() {
  fillSelect('f_truck',  state.db.trucks,  t=>[t.id, `${t.reg} — ${t.make}`]);
  fillSelect('f_driver', state.db.drivers, d=>[d.id, d.name]);
  refreshContainerHistory();
}


function refreshContainerHistory() {
  const dl = document.getElementById('containerHistory');
  if (!dl) return;

  const labels = new Map();
  const tag = (c, label) => { if (c && !labels.has(c)) labels.set(c, label); };
  (state.db.trips||[]).forEach(t=>{
    if (!t.container) return;
    tag(t.container, t.bookingId ? 'Public Booking' : (t.notes && /bulk/i.test(t.notes) ? 'Bulk Upload' : 'Dispatch'));
  });
  (state.db.shutouts||[]).forEach(s=>{ tag(s.container, 'Shutout'); });
  (state.db.interchange||[]).forEach(i=>{ tag(i.container, 'Interchange'); });
  dl.innerHTML = [...labels.keys()].sort().map(c=>`<option value="${c}">${labels.get(c)}</option>`).join('');
}

/* ──────────────────────────────────────────────────────────────────
   § 33  IDLE TIMER & AUTO-LOCK
────────────────────────────────────────────────────────────────── */
function startIdleTimer() {
  clearIdleTimer();
  const resetIdle = ()=>{ state.lastActivity = Date.now(); };
  ['mousemove','keydown','click','scroll','touchstart'].forEach(ev=>document.addEventListener(ev, resetIdle, { passive:true }));
  state.idleTimer = setInterval(()=>{
    if (Date.now() - state.lastActivity > IDLE_TIMEOUT) {
      clearIdleTimer();
      toast('Session timed out — please sign in again','warning',5000);
      setTimeout(()=>forceLogout('Session timed out (idle)'), 2000);
    }
  }, 60000);
}

function clearIdleTimer() {
  if (state.idleTimer) clearInterval(state.idleTimer);
  state.idleTimer = null;
}

/* ──────────────────────────────────────────────────────────────────
   § 34  LIVE PULSE
────────────────────────────────────────────────────────────────── */
function startLivePulse() {
  setInterval(()=>{
    state.db.trucks.filter(t=>t.status==='on_trip').forEach(t=>{
      t.fuelPct = Math.max(0, t.fuelPct - 0.1);
    });

    buildAlerts();
    if (state.currentSection==='dashboard') renderDashboard();
    if (state.currentSection==='livetracking') renderTracking();
  }, 30000);
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

/* ──────────────────────────────────────────────────────────────────
   § 36  KEYBOARD SHORTCUTS
────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e=>{
  if (!state.currentUser) return;
  if (e.key==='Escape') {
    closeModal();
    closeUserMenu();
    const p=document.getElementById('searchResults'); if(p)p.style.display='none';
  }
  if ((e.ctrlKey||e.metaKey) && e.key==='k') {
    e.preventDefault();
    document.getElementById('globalSearch')?.focus();
  }
  if ((e.ctrlKey||e.metaKey) && e.key==='/') {
    e.preventDefault();
    toggleSidebar();
  }
});

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

 // ================== PUBLIC BOOKINGS ==================

let _publicBookingFilter = 'pending';

function filterPublicBookings(filter, btn) {
  _publicBookingFilter = filter;
  document.querySelectorAll('#sec-publicbookings .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPublicBookings();
}

async function renderPublicBookings() {
  const container = document.getElementById('publicBookingsList');
  if (!container) return;

  let query = supabase.from('public_bookings').select('*');
  if (_publicBookingFilter !== 'all') {
    query = query.eq('status', _publicBookingFilter);
  }
  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">No ${_publicBookingFilter} bookings</div>`;
    return;
  }

  container.innerHTML = data.map(b => {
    let importedAction = '';
    if (b.status === 'imported') {
      const trip = findTripByBookingId(b.id);
      if (trip && (!trip.truckId || !trip.driverId)) {
        importedAction = `<button class="modal-btn primary" onclick="jumpToCompleteDispatch('${trip.id}')">Complete Dispatch →</button>`;
      } else if (trip) {
        importedAction = `<button class="modal-btn ghost" onclick="showTripDetail('${trip.id}')">View Trip</button>`;
      }
    }
    return `
    <div style="border:1px solid #333;border-radius:8px;padding:12px;margin-bottom:10px;background:#111;">
      <div><strong>${sanitize(b.full_name)}</strong> (${sanitize(b.email)})</div>
      <div>Service: ${sanitize(b.service_type)}</div>
<div>Container: ${sanitize(b.container) || 'Not provided'}</div>
<div style="font-size:10px;color:var(--text-3);">Booking ID: ${b.id.slice(0,8)}</div>
      <div>Pickup: ${sanitize(b.pickup_location)} → Drop: ${sanitize(b.dropoff_location)}</div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="sbadge s-${b.status}">${b.status}</span>
        ${b.status === 'pending' ? `<button class="modal-btn primary" onclick="importPublicBooking('${b.id}')">Import to Fleet</button>` : ''}
        ${importedAction}
        <button class="modal-btn ghost" onclick="showPublicBookingDetail('${b.id}')">View</button>
      </div>
    </div>
  `; }).join('');

  // Update badge
  const badge = document.getElementById('badge-publicbookings');
  if (badge) {
    const pending = data.filter(b => b.status === 'pending').length;
    badge.textContent = pending || '';
    badge.style.display = pending ? 'inline' : 'none';
  }
}



function resolveBookingShippingLineId(booking) {
  if (!booking) return null;
  if (booking.shipping_line_id && state.db.shippingLines.some(l => l.id === booking.shipping_line_id)) {
    return booking.shipping_line_id;
  }
  const raw = (booking.shipping_line || '').trim().toLowerCase();
  if (!raw) return null;
  const match = state.db.shippingLines.find(l =>
    (l.code || '').toLowerCase() === raw ||
    (l.name || '').toLowerCase() === raw ||
    (l.name || '').toLowerCase().includes(raw) ||
    raw.includes((l.name || '').toLowerCase())
  );
  return match ? match.id : null;
}

function findTripByBookingId(bookingId) {
  return state.db.trips.find(t => t.bookingId === bookingId);
}

async function importPublicBooking(bookingId) {
  if (!confirm('Import this booking?')) return;
  const { data: booking, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) { toast('Booking not found', 'error'); return; }
  if (booking.status !== 'pending') { toast('Already processed', 'warning'); return; }



  try {
    const required = window.bookingDocs.getRequiredDocTypes({
      serviceType: booking.service_type,
      origin: booking.pickup_location,
      destination: booking.dropoff_location,
    });
    if (required.length) {
      const docs = await window.bookingDocs.documentsForBooking(bookingId);
      const verifiedTypes = {};
      docs.forEach(d => { if (d.status === 'verified') verifiedTypes[d.doc_type] = true; });
      const missing = required.filter(rt => !verifiedTypes[rt]);
      if (missing.length) {
        toast(`Can't import — still missing verified: ${missing.join(', ').replace(/_/g,' ')}. Verify documents in DepOps first.`, 'error', 6000);
        return;
      }
    }
  } catch (e) {
    toast(`Could not confirm document status (${(e && e.message) || 'error'}) — import blocked until this can be checked.`, 'error', 6000);
    return;
  }

  const rawCont = (booking.container || '').trim().toUpperCase();
  if (rawCont) {
    const rawContIssue = containerFormatIssue(rawCont);
    if (rawContIssue) { toast(`Booking's container number ${rawCont}: ${rawContIssue} — fix it before importing`, 'error', 6000); return; }
    const dupTrip = findLiveTripByContainer(rawCont);
    if (dupTrip) { toast(`${rawCont} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest}). Resolve that trip first, or correct the container number on this booking.`, 'error'); return; }
  }


  const { data: updatedRows, error: updateErr } = await supabase
    .from('public_bookings')
    .update({ status: 'imported' })
    .eq('id', bookingId)
    .eq('status', 'pending') 
    .select();

  if (updateErr) {
    toast(`Import failed — could not update booking status (${updateErr.message}). No trip was created.`, 'error');
    return;
  }
  if (!updatedRows || updatedRows.length === 0) {
    toast('Import failed — booking was already processed by someone else. Refresh and check.', 'warning');
    renderPublicBookings();
    return;
  }



  if (booking.service_type === 'Depot Storage') {
    const { error: statusErr } = await supabase
      .from('public_bookings')
      .update({ storage_status: 'awaiting_survey' })
      .eq('id', bookingId);
    if (statusErr) {
      toast(`Imported, but couldn't set survey status (${statusErr.message}) — check DepOps → Zones`, 'warning', 6000);
    } else {
      toast('Imported — now awaiting survey in DepOps', 'success');
    }
    renderPublicBookings();
    return;
  }

  const trip = {
    id: uid('TRIP'),
    container: rawCont || `PUB-${booking.id.slice(0,8)}`,
    ctype: booking.cargo_type || '20ft Dry',
    workType: booking.service_type || 'Other',
    origin: booking.pickup_location || '—',
    dest: booking.dropoff_location || '—',
    shippingLine: resolveBookingShippingLineId(booking),
    status: 'active',
    startTime: new Date().toISOString(),
    eta: new Date(Date.now() + 4*3600000).toISOString(),
    distance: 0,
    priority: 'Normal',
    notes: `Imported from public booking #${booking.id}`,
    ref: `PUB-${booking.id.slice(0,8)}`,
    truckId: null,
    driverId: null,
    containerImages: [],
    bookingId: booking.id,
  };
  state.db.trips.push(trip);
  scheduleSave();

  toast('Imported — awaiting dispatch (trip ' + trip.id.slice(-6) + ')', 'success');
  renderPublicBookings();
  refreshAwaitingDispatchUI();
}

async function showPublicBookingDetail(id) {
  const { data: b, error } = await supabase.from('public_bookings').select('*').eq('id', id).single();
  if (error || !b) { toast('Not found', 'error'); return; }
  openModal('Booking Detail', `<pre>${JSON.stringify(b, null, 2)}</pre>`);
}

async function refreshPublicBookings() {
  toast('Refreshing...', 'info');
  await renderPublicBookings();
}

(function init() {
  try {
    runLoader();
  } catch(e) {
    console.error('Initialization error:', e);
    toast('System initialization error. Please refresh.', 'error');
  }


})();


let deferredInstallPrompt = null;

function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS Safari
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function setInstallButtonVisible(visible) {
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.style.display = visible ? 'flex' : 'none';
}

function initInstallApp() {
  if (isStandaloneDisplay()) {
    setInstallButtonVisible(false);
    return;
  }

 
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    setInstallButtonVisible(true);
  });

  
  if (isIOSDevice()) {
    setInstallButtonVisible(true);
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallButtonVisible(false);
    toast('Gargo installed', 'success');
  });
}

async function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      toast('Installing Gargo…', 'success');
    }
    deferredInstallPrompt = null;
    return;
  }

  if (isIOSDevice()) {
    openModal('Install Gargo', `
      <div style="font-size:13px;line-height:1.7;color:var(--text-2)">
        <p style="margin-bottom:10px">Add Gargo to your Home Screen for one-tap, full-screen access:</p>
        <ol style="padding-left:18px;margin:0">
          <li>Tap the <strong>Share</strong> icon in Safari's toolbar.</li>
          <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top-right corner.</li>
        </ol>
      </div>
    `);
    return;
  }

  openModal('Install Gargo', `
    <div style="font-size:13px;line-height:1.7;color:var(--text-2)">
      Your browser didn't offer an install prompt yet — this can happen if the app is already installed,
      or if your browser doesn't support installing web apps. Look for an install icon in the address bar,
      or check your browser's menu for an "Install app" / "Add to Home Screen" option.
    </div>
  `);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
 
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        toast('A new version is available — reloading…', 'info', 2500);
        setTimeout(() => window.location.reload(), 1200);
      }
    });
  });
}

initInstallApp();


async function hardRefreshSystem() {
  const btn = document.getElementById('refreshAppBtn');
  const icon = document.getElementById('refreshIcon');
  if (btn) btn.disabled = true;
  if (icon) icon.classList.add('spinning');
  toast('Refreshing system…', 'info', 4000);

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.warn('Could not clear cache/service worker during refresh:', e);
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_refresh', Date.now());
  window.location.replace(url.toString());
}



const DEPOPS_DOC_LABELS = {
  guarantee_form: 'Container Guarantee Form',
  release_order: 'Release Order (CRO)',
  delivery_order: 'Delivery Order',
};

let _depOpsTab = 'inbound';
let _depOpsInboundFilter = 'pending_review';
let _depOpsOutwardFilter = 'pending_review';

function depOpsFmtDT(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? String(raw) : d.toLocaleString('en-KE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}


function docStatusBadge(status) {
  const styleKey = { verified: 'approved', pending_review: 'pending', rejected: 'rejected' }[status] || 'pending';
  const label = status === 'pending_review' ? 'Pending Review' : (status.charAt(0).toUpperCase() + status.slice(1));
  return `<span class="sbadge s-${styleKey}">${label}</span>`;
}

function switchDepOpsTab(tab, btn) {
  _depOpsTab = tab;
  document.querySelectorAll('#sec-depops .depops-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#sec-depops .depops-tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('depopsPanel-' + tab);
  if (panel) panel.classList.add('active');
  renderDepOps();
}

async function renderDepOps() {
  renderDepOpsZones();
  renderDepOpsStorageList();
  updateDepOpsBadge();
  if (_depOpsTab === 'inbound') await renderDepOpsInbound();
  else if (_depOpsTab === 'zones') await renderDepOpsZoneAdmin();
  else if (_depOpsTab === 'escalations') await renderDepOpsEscalations();
  else if (_depOpsTab === 'yard') await renderDepOpsYardMap();
  else if (_depOpsTab === 'surveys') await renderDepOpsSurveyRegister();
  else if (_depOpsTab === 'master') await renderDepOpsMasterList();
  else if (_depOpsTab === 'reports') await renderDepOpsReports();
  else await renderDepOpsOutward();
}

async function updateDepOpsBadge() {
  const badge = document.getElementById('badge-depops');
  if (!badge || !window.bookingDocs) return;
  try {
    const [inboundPending, outwardPending] = await Promise.all([
      window.bookingDocs.reviewQueue('pending_review'),
      window.bookingDocs.outwardReviewQueue('pending_review'),
    ]);
    const count = inboundPending.length + outwardPending.length;
    badge.textContent = count || '';
    badge.style.display = count ? 'inline' : 'none';
  } catch (e) { /* badge is best-effort, never blocks the section */ }
}

async function renderDepOpsZones() {
  const wrap = document.getElementById('depopsZones');
  if (!wrap) return;
  try {
    const zones = await window.bookingDocs.listZones();
    if (!zones.length) { wrap.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-state-label">No storage zones configured yet</div></div>'; return; }
    wrap.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Line</th><th style="padding:6px 8px">Occupied</th><th style="padding:6px 8px">Free</th>
      </tr></thead><tbody>${zones.map(z => {
        const cap = z.capacity_teu || 0, occ = z.occupied_teu || 0, free = Math.max(cap - occ, 0);
        const pct = cap > 0 ? Math.min(100, Math.round(occ / cap * 100)) : 0;
        const lineLabel = z.shipping_lines ? `${sanitize(z.shipping_lines.code)}` : '<span style="color:var(--text-3)">Unassigned</span>';
        return `<tr style="border-top:1px solid var(--border)">
          <td style="padding:6px 8px">${sanitize(z.zone_code || '')} · ${sanitize(z.zone_name)}</td>
          <td style="padding:6px 8px">${lineLabel}</td>
          <td style="padding:6px 8px">${occ} / ${cap} TEU<div style="width:100px;height:5px;background:#222;border-radius:3px;overflow:hidden;margin-top:4px"><div style="width:${pct}%;height:100%;background:var(--gold)"></div></div></td>
          <td style="padding:6px 8px">${free} TEU</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}


async function renderDepOpsStorageList() {
  const wrap = document.getElementById('depopsStorageList');
  if (!wrap) return;
  try {
    const [bookings, zones] = await Promise.all([
      depOpsRepatriationEligibleBookings(),
      window.bookingDocs.storageAvailability(),
    ]);
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers currently in storage</div></div>'; return; }
    const zoneMap = {}; zones.forEach(z => { zoneMap[z.id] = z.zone_name; });
    const surveys = await Promise.all(bookings.map(b => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    wrap.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Zone</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px"></th>
      </tr></thead><tbody>${bookings.map((b,i) => {
        const zoneName = (b.storage_zone_id && zoneMap[b.storage_zone_id]) || 'Unknown zone';
        const survey = surveys[i];
        const icCell = !survey
          ? '<span style="color:var(--text-3);font-size:10.5px">No survey on file</span>'
          : survey.interchange_generated_at
            ? `<span class="sbadge s-approved" title="Generated ${fmtDate(survey.interchange_generated_at)}">✓ Generated</span>${survey.interchange_id ? ` <button class="tbl-btn" onclick="downloadInterchangeSlip('${survey.interchange_id}')">⬇</button>` : ''}`
            : `<button class="modal-btn primary" onclick="generateInterchangeFromSurvey('${b.id}','${survey.id}')">Generate →</button>`;
        return `<tr style="border-top:1px solid var(--border)">
          <td style="padding:6px 8px" class="mono">${sanitize(b.container) || '—'}</td>
          <td style="padding:6px 8px">${sanitize(zoneName)}</td>
          <td style="padding:6px 8px">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''}</td>
          <td style="padding:6px 8px">${icCell}</td>
          <td style="padding:6px 8px"><button class="modal-btn ghost" onclick="depOpsDispatchContainer('${b.id}')">Dispatch →</button></td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}


function depOpsDispatchContainer(bookingId) {
  const existingTrip = state.db.trips.find(t => t.workType === 'Depot → Port' && t.bookingId === bookingId);
  if (existingTrip) {
    jumpToCompleteDispatch(existingTrip.id);
    return;
  }
  showSection('depops', document.querySelector('[data-section="depops"]'));
  switchDepOpsTab('outward', document.querySelector('.depops-tab-btn:nth-child(2)'));
  toast('Pick a destination and create the outward trip below — it will then appear in the Dispatch Console.', 'info', 5000);
  setTimeout(() => {
    const el = document.getElementById('depopsEligibleList');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

// ---------- Inbound ----------

function filterDepOpsInbound(status, btn) {
  _depOpsInboundFilter = status;
  document.querySelectorAll('#depopsPanel-inbound .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDepOpsInbound();
}

async function renderDepOpsInbound() {
  await renderDepOpsReadyToProcess();
  await renderDepOpsAwaitingSurvey();
  await renderDepOpsAllocationQueue();
  const container = document.getElementById('depopsInboundQueue');
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const docs = await window.bookingDocs.reviewQueue(_depOpsInboundFilter);
    if (!docs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-label">No ${_depOpsInboundFilter.replace(/_/g,' ')} documents</div></div>`; return; }
    container.innerHTML = docs.map(d => depOpsDocCard(d, 'inbound')).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

async function renderDepOpsReadyToProcess() {
  const wrap = document.getElementById('depopsReadyList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const ready = await window.bookingDocs.readyToProcessBookings();
    if (!ready.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No bookings are fully verified yet</div></div>'; return; }
    wrap.innerHTML = ready.map(entry => depOpsReadyCard(entry)).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}


function depOpsReadyCard(entry) {
  const b = entry.booking;
  return `<div style="border:1px solid rgba(34,197,94,0.35);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(34,197,94,0.05)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong>${sanitize(b.full_name)}</strong>${b.company ? ' · ' + sanitize(b.company) : ''}
        <div style="font-size:11px;color:var(--text-3)">${sanitize(b.service_type)} · Container: ${sanitize(b.container) || '—'}</div>
        <div style="font-size:10px;color:var(--text-3)">Booking ${b.id.slice(0,8)} · Verified: ${entry.required.join(', ').replace(/_/g,' ')}</div>
      </div>
      <span class="sbadge s-approved">verified & ready</span>
    </div>
    ${b.service_type === 'Depot Storage' ? '<div style="margin-top:8px;font-size:11px;color:var(--text-3)">Importing will send this container to Awaiting Survey below.</div>' : ''}
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="modal-btn primary" onclick="importPublicBooking('${b.id}')">${b.service_type === 'Depot Storage' ? 'Confirm Into Storage →' : 'Import to Fleet →'}</button>
      <button class="modal-btn ghost" onclick="showPublicBookingDetail('${b.id}')">View</button>
    </div>
  </div>`;
}



const CONTAINER_TYPE_OPTIONS = ['20ft Dry', '40ft Dry', '20ft HC', '40ft HC', '20ft Reefer', '40ft Reefer', 'Flat Rack', 'Open Top', 'Tank', 'Hazmat', 'Heavy Duty', 'LCL', 'Platform', 'LC (Unspecified)'];


const DEPOT_TYPE_CODE_MAP = {
  'DV': 'Dry', 'HD': 'Dry', 'HC': 'HC',
  'FR': 'Flat Rack', 'FL': 'Flat Rack', 'OT': 'Open Top',
  'PL': 'Platform', 'TK': 'Tank', 'LC': 'LC (Unspecified)',
};

function composeCtypeFromDepotCode(sizeRaw, codeRaw) {
  const sizeStr = String(sizeRaw || '').trim();
  const sizeFt = sizeStr ? (/ft$/i.test(sizeStr) ? sizeStr : `${parseInt(sizeStr, 10)}ft`) : '';
  const code = String(codeRaw || '').trim().toUpperCase();
  const mapped = DEPOT_TYPE_CODE_MAP[code];
  if (mapped) return composeCtype(sizeFt, mapped);

  return composeCtype(sizeFt || sizeStr, codeRaw);
}
const CARGO_STATUS_OPTIONS = ['Empty', 'Laden / Full', 'Part Load', 'Damaged Cargo'];


function ctypeSizeOptions() {
  const sizes = [];
  CONTAINER_TYPE_OPTIONS.forEach(o => { const m = o.match(/^(\d+ft)\s/); if (m && sizes.indexOf(m[1]) === -1) sizes.push(m[1]); });
  return sizes; // e.g. ['20ft','40ft']
}
function ctypeTypeOptionsForSize(size) {
  const sized   = CONTAINER_TYPE_OPTIONS.filter(o => o.indexOf(size + ' ') === 0).map(o => o.slice(size.length + 1));
  const unsized = CONTAINER_TYPE_OPTIONS.filter(o => !/^\d+ft\s/.test(o));
  return [...sized, ...unsized];
}
function composeCtype(size, type) {
  if (!type) return CONTAINER_TYPE_OPTIONS[0];
  const combo = `${size} ${type}`;
  if (CONTAINER_TYPE_OPTIONS.indexOf(combo) !== -1) return combo;
  if (CONTAINER_TYPE_OPTIONS.indexOf(type) !== -1) return type; // unsized type (Flat Rack, Tank, etc.)
  return combo;
}
function decomposeCtype(ctype) {
  const val = ctype || CONTAINER_TYPE_OPTIONS[0];
  const m = val.match(/^(\d+ft)\s(.+)$/);
  if (m) return { size: m[1], type: m[2] };
  return { size: ctypeSizeOptions()[0], type: val };
}
function populateSizeTypeSelects(sizeId, typeId, currentCtype) {
  const sizeEl = document.getElementById(sizeId);
  const typeEl = document.getElementById(typeId);
  if (!sizeEl || !typeEl) return;
  const { size, type } = decomposeCtype(currentCtype);
  sizeEl.innerHTML = ctypeSizeOptions().map(s => `<option${s===size?' selected':''}>${s}</option>`).join('');
  typeEl.innerHTML = ctypeTypeOptionsForSize(sizeEl.value || size).map(t => `<option${t===type?' selected':''}>${t}</option>`).join('');
}
function refreshTypeSelectForSize(sizeId, typeId) {
  const sizeEl = document.getElementById(sizeId);
  const typeEl = document.getElementById(typeId);
  if (!sizeEl || !typeEl) return;
  const keepType = typeEl.value;
  typeEl.innerHTML = ctypeTypeOptionsForSize(sizeEl.value).map(t => `<option${t===keepType?' selected':''}>${t}</option>`).join('');
}


const REPAIR_LABOUR_RATE_PER_HOUR = 300; // KSh/hr — matches the labour rate implied by the Hakika sample (750/2.5hrs, 450/1.5hrs)

// items: array of {category, code, side, item, hours, material}
window._repairItems = {};

function repairItemsFor(prefix) { return window._repairItems[prefix] || (window._repairItems[prefix] = []); }

function repairItemsTotal(items) {
  return (items || []).reduce((sum, r) => sum + (Number(r.hours || 0) * REPAIR_LABOUR_RATE_PER_HOUR) + Number(r.material || 0), 0);
}

function tariffPickerHtml(prefix) {
  const categoryOptions = Object.keys(window.bookingDocs.TARIFF_SCHEDULE || {}).map(c => `<option>${c}</option>`).join('');
  return `
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:16px 0 8px">Damage / Repair Items</div>
    <div class="form-row-2">
      <div class="fg"><label>Category</label><select id="${prefix}_tcat" onchange="onRepairCategoryChange('${prefix}')"><option value="">—</option>${categoryOptions}</select></div>
      <div class="fg"><label>Code / Item</label><select id="${prefix}_tcode" onchange="onRepairCodeChange('${prefix}')"><option value="">Select category first…</option></select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Hours</label><input id="${prefix}_thours" type="number" step="0.1" readonly placeholder="Auto-filled"></div>
      <div class="fg"><label>Material (KSh)</label><input id="${prefix}_tmaterial" type="number" step="0.01" readonly placeholder="Auto-filled"></div>
    </div>
    <button type="button" class="modal-btn ghost" style="margin-bottom:8px" onclick="addRepairItem('${prefix}')">+ Add item</button>
    <div id="${prefix}_repairList"></div>`;
}

function onRepairCategoryChange(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const codeSel = document.getElementById(`${prefix}_tcode`);
  const rows = (window.bookingDocs.TARIFF_SCHEDULE || {})[cat] || [];
  [`${prefix}_thours`, `${prefix}_tmaterial`].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  codeSel.innerHTML = rows.length ? '<option value="">Select…</option>' + rows.map((r,i) => `<option value="${i}">${r.code} — ${r.item}</option>`).join('') : '<option value="">Select category first…</option>';
}

function onRepairCodeChange(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const idx = document.getElementById(`${prefix}_tcode`).value;
  const row = ((window.bookingDocs.TARIFF_SCHEDULE || {})[cat] || [])[idx];
  document.getElementById(`${prefix}_thours`).value = row ? row.hours : '';
  document.getElementById(`${prefix}_tmaterial`).value = row ? row.material : '';
}

function addRepairItem(prefix) {
  const cat = document.getElementById(`${prefix}_tcat`).value;
  const idx = document.getElementById(`${prefix}_tcode`).value;
  const row = ((window.bookingDocs.TARIFF_SCHEDULE || {})[cat] || [])[idx];
  if (!row) { toast('Pick a category and code first', 'error'); return; }
  repairItemsFor(prefix).push({ category: cat, code: row.code, side: row.side, item: row.item, hours: row.hours, material: row.material });
  renderRepairItemsList(prefix);
}

function removeRepairItem(prefix, i) {
  repairItemsFor(prefix).splice(i, 1);
  renderRepairItemsList(prefix);
}

function renderRepairItemsList(prefix) {
  const el = document.getElementById(`${prefix}_repairList`);
  if (!el) return;
  const items = repairItemsFor(prefix);
  if (!items.length) { el.innerHTML = '<div style="font-size:11px;color:var(--text-3)">No damage items added — container will be logged as good condition.</div>'; return; }
  const rows = items.map((r, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--border)">
    <div style="font-size:11.5px"><span class="mono" style="color:var(--gold)">${r.code}</span> — ${sanitize(r.item)} <span style="color:var(--text-3)">(${r.side})</span></div>
    <div style="font-size:11px;color:var(--text-2)">${r.hours}h · KSh ${Number(r.material).toLocaleString()} <button type="button" class="modal-btn danger" style="padding:2px 8px;margin-left:8px" onclick="removeRepairItem('${prefix}',${i})">✕</button></div>
  </div>`).join('');
  const total = repairItemsTotal(items);
  el.innerHTML = rows + `<div style="display:flex;justify-content:space-between;padding-top:8px;font-weight:700;font-size:12px">
    <span>Total (labour @ KSh ${REPAIR_LABOUR_RATE_PER_HOUR}/hr + material)</span><span>KSh ${total.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
  </div>`;
}

async function renderDepOpsAwaitingSurvey() {
  const wrap = document.getElementById('depopsAwaitingSurveyList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const bookings = await window.bookingDocs.awaitingSurveyBookings();
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Nothing awaiting survey</div></div>'; return; }
    wrap.innerHTML = bookings.map(b => `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <strong class="mono" style="color:var(--gold)">${sanitize(b.container) || 'No container on file'}</strong>
          <div style="font-size:11px;color:var(--text-3)">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''} · ${sanitize(b.cargo_type || '—')}</div>
          <div style="font-size:10px;color:var(--text-3)">Booking ${b.id.slice(0,8)}</div>
        </div>
        <span class="sbadge s-pending">awaiting survey</span>
      </div>
      <div style="margin-top:10px"><button class="modal-btn primary" onclick="openSurveyModal('${b.id}')">Start Survey →</button></div>
    </div>`).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

let _surveyImages = [];

async function openSurveyModal(bookingId) {
  const { data: booking, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) { toast('Booking not found', 'error'); return; }
  const lineId = resolveBookingShippingLineId(booking);
  const lineOptions = state.db.shippingLines.map(l => `<option value="${l.id}" ${l.id === lineId ? 'selected' : ''}>${sanitize(l.code)} — ${sanitize(l.name)}</option>`).join('');
  const typeOptions = CONTAINER_TYPE_OPTIONS.map(t => `<option ${booking.cargo_type === t ? 'selected' : ''}>${t}</option>`).join('');
  _surveyImages = [];
  window._repairItems.sv = [];

  openModal(`Survey — ${sanitize(booking.container) || 'Container'}`, `
    <div class="form-row-2">
      <div class="fg"><label>Container No.</label><input id="sv_container" value="${sanitize(booking.container || '')}" oninput="markContainerValidity(this)"></div>
      <div class="fg"><label>Type / Size</label><select id="sv_ctype">${typeOptions}</select></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Shipping Line</label><select id="sv_line"><option value="">—</option>${lineOptions}</select></div>
      <div class="fg"><label>Consignee</label><input id="sv_consignee" value="${sanitize(booking.company || booking.full_name || '')}"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Guarantee / B/L Number</label><input id="sv_bl"></div>
      <div class="fg"><label>EIR / Reference No.</label><input id="sv_eir" placeholder="Transporter's own EIR no."></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Vessel</label><input id="sv_vessel"></div>
      <div class="fg"><label>Voyage</label><input id="sv_voyage"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Transporter</label><input id="sv_transporter"></div>
      <div class="fg"><label>ISO Code</label><input id="sv_iso" placeholder="e.g. 22G1"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Max Gross Weight — MGW (kg)</label><input id="sv_mgwt" type="number"></div>
      <div class="fg"><label>Tare Weight — TW (kg)</label><input id="sv_tare" type="number"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Vehicle / Truck No.</label><input id="sv_truck"></div>
      <div class="fg"><label>Trailer Number</label><input id="sv_trailer"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Driver Name</label><input id="sv_driver"></div>
      <div class="fg"><label>Driver ID Number</label><input id="sv_driver_id"></div>
    </div>
    <div class="form-row-2">
      <div class="fg"><label>Surveyed By</label><input id="sv_clerk" value="${sanitize((state.profile && state.profile.name) || '')}"></div>
      <div class="fg"><label>Seal Number</label><input id="sv_seal"></div>
    </div>
    <div class="fg"><label>Gate Pass No.</label><input id="sv_gatepass"></div>

    <div class="fg"><label>Overall Condition</label><select id="sv_condition" onchange="onSurveyConditionChange()">
      <option value="full_grade">Full Grade</option>
      <option value="under_repair">Under Repair</option>
      <option value="damaged">Damaged</option>
      <option value="heavily_damaged">Heavily Damaged — requires joint survey</option>
    </select></div>
    <div id="sv_heavily_damaged_note" style="display:none;margin-bottom:10px" class="ops-notice">
      This container will be sent to <b>Escalations</b> and cannot be allocated to storage until a second surveyor records a joint finding.
    </div>

    ${tariffPickerHtml('sv')}

    <div class="fg"><label>Survey Photos</label><input type="file" id="sv_images" accept="image/*" multiple onchange="onSurveyImagesSelected(event)"><div id="sv_images_preview" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div></div>
    <div class="fg"><label>Remarks</label><textarea id="sv_remarks" rows="3" placeholder="Damage notes, discrepancies, etc."></textarea></div>
    <button class="submit-btn" onclick="saveSurvey('${bookingId}')">Save Survey →</button>
  `);
  const svContEl = document.getElementById('sv_container');
  if (svContEl) markContainerValidity(svContEl);
  renderRepairItemsList('sv');
}

function onSurveyConditionChange() {
  const el = document.getElementById('sv_condition');
  const note = document.getElementById('sv_heavily_damaged_note');
  if (note) note.style.display = (el && el.value === 'heavily_damaged') ? 'block' : 'none';
}

function onSurveyImagesSelected(e) {
  const files = Array.from(e.target.files || []).slice(0, 6);
  const preview = document.getElementById('sv_images_preview');
  preview.innerHTML = '';
  _surveyImages = [];
  files.forEach(file => {
    if (file.size > 2*1024*1024) { toast(`${file.name} skipped — max 2MB per photo`, 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      _surveyImages.push(reader.result);
      const img = document.createElement('img');
      img.src = reader.result;
      img.style.cssText = 'width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid var(--border)';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

async function saveSurvey(bookingId) {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const container = val('sv_container').toUpperCase();
  if (container) {
    const containerIssue = containerFormatIssue(container);
    if (containerIssue) { toast(`Container number: ${containerIssue}`, 'error'); return; }
  }
  const repairItems = repairItemsFor('sv');
  try {
    const survey = await window.bookingDocs.recordSurvey({
      bookingId,
      container,
      containerType: val('sv_ctype'),
      containerSize: val('sv_ctype'),
      shippingLineId: val('sv_line') || null,
      consignee: val('sv_consignee'),
      blNumber: val('sv_bl'),
      eirNumber: val('sv_eir'),
      isoCode: val('sv_iso'),
      mgwt: val('sv_mgwt') ? parseFloat(val('sv_mgwt')) : null,
      tareWeight: val('sv_tare') ? parseFloat(val('sv_tare')) : null,
      vessel: val('sv_vessel'),
      voyage: val('sv_voyage'),
      transporter: val('sv_transporter'),
      truckReg: val('sv_truck'),
      trailerNumber: val('sv_trailer'),
      driverName: val('sv_driver'),
      driverIdNumber: val('sv_driver_id'),
      clerkName: val('sv_clerk'),
      sealNumber: val('sv_seal'),
      gatePassNumber: val('sv_gatepass'),
      conditionStatus: val('sv_condition') || 'full_grade',
      remarks: val('sv_remarks'),
      photos: _surveyImages,
      tariffItems: repairItems,
    });
    const heavy = val('sv_condition') === 'heavily_damaged';


    if (!heavy && bookingId && survey && survey.id) {
      await generateInterchangeFromSurvey(bookingId, survey.id);
    }

    toast(heavy ? 'Survey saved — escalated for joint survey' : 'Survey saved', heavy ? 'warning' : 'success');
    closeModal();
    renderDepOpsAwaitingSurvey();
    renderDepOpsAllocationQueue();
    renderDepOpsStorageList();
    if (typeof renderDepOpsEscalations === 'function') renderDepOpsEscalations();
  } catch (e) {
    toast(e.message || 'Could not save survey', 'error');
  }
}

// ---------- Ready for Storage Allocation (post-survey) ----------

async function renderDepOpsAllocationQueue() {
  const wrap = document.getElementById('depopsAllocationList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const [bookings, zones] = await Promise.all([
      window.bookingDocs.surveyedAwaitingAllocation(),
      window.bookingDocs.listZones(),
    ]);
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Nothing ready for allocation</div></div>'; return; }
    const surveys = await Promise.all(bookings.map(b => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    surveys.forEach(s => { if (s) _surveyLookupCache[s.id] = s; });
    wrap.innerHTML = bookings.map((b,i) => depOpsAllocationCard(b, zones, surveys[i])).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsAllocationCard(b, zones, survey) {
  const bookingLineId = resolveBookingShippingLineId(b);
  const zoneOptions = zones.map(z => {
    const free = Math.max((z.capacity_teu || 0) - (z.occupied_teu || 0), 0);
    const match = bookingLineId && z.shipping_line_id === bookingLineId;
    return `<option value="${z.id}" ${match ? 'selected' : ''}>${sanitize(z.zone_code || z.zone_name)}${z.shipping_lines ? ' · ' + sanitize(z.shipping_lines.code) : ''} (${free} TEU free)</option>`;
  }).join('');
  const icBtn = (survey && survey.interchange_generated_at && survey.interchange_id)
    ? `<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${survey.interchange_id}')">⬇ Interchange</button>`
    : '';
  const reportBtn = survey
    ? `<button class="modal-btn ghost" onclick="downloadInspectionReport('${survey.id}')">⬇ Inspection Report</button>`
    : '';
  return `<div style="border:1px solid rgba(201,162,39,0.35);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--gold-dim)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong class="mono" style="color:var(--gold)">${sanitize(b.container) || 'No container on file'}</strong>
        <div style="font-size:11px;color:var(--text-3)">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''} · ${sanitize(b.cargo_type || '—')}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="sbadge s-approved">surveyed</span>${icBtn}${reportBtn}</div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--text-3)">Allocate a storage slot below to record where this container sits in the yard.</div>
    <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 90px 70px auto;gap:6px;align-items:end">
      <div class="fg" style="margin:0"><label>Zone</label><select id="alloc-zone-${b.id}" onchange="depOpsAllocZoneChanged('${b.id}')"><option value="">Select…</option>${zoneOptions}</select></div>
      <div class="fg" style="margin:0"><label>Block</label><select id="alloc-block-${b.id}" onchange="depOpsAllocBlockChanged('${b.id}')"><option value="">Select zone first…</option></select></div>
      <div class="fg" style="margin:0"><label>Slot</label><select id="alloc-slot-${b.id}"><option value="">—</option></select></div>
      <div class="fg" style="margin:0"><label>TEU</label><input type="number" id="alloc-teu-${b.id}" min="1" value="1"></div>
      <button class="action-btn" onclick="depOpsAllocateBookingToSlot('${b.id}')">Allocate</button>
    </div>
  </div>`;
}


async function generateInterchangeFromSurvey(bookingId, surveyId) {
  try {
    const { data: booking } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
    if (!booking) { toast('Booking not found for this container', 'error'); return; }
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    if (!survey) { toast('No survey found for this container', 'error'); return; }
    if (survey.interchange_generated_at) { return; }
    const conditionMap = { full_grade: 'Good', under_repair: 'Needs Repair', damaged: 'Damaged', heavily_damaged: 'Damaged' };
    const matchedTruck = state.db.trucks.find(t => (t.reg || '').toUpperCase() === (survey.truck_reg || '').toUpperCase());
    const matchedDriver = state.db.drivers.find(d => (d.name || '').toLowerCase() === (survey.driver_name || '').toLowerCase());


    let storageLocation = '—';
    if (booking.storage_status === 'allocated') {
      try {
        const zones = await window.bookingDocs.listZones();
        const zone = zones.find(z => z.id === booking.storage_zone_id);
        storageLocation = [
          zone ? (zone.zone_code || zone.zone_name) : null,
          booking.storage_block_id ? `Block ${booking.storage_block_id}` : null,
          booking.storage_slot_number ? `Slot ${booking.storage_slot_number}` : null,
        ].filter(Boolean).join(' · ') || '—';
      } catch (e) { /* storage location is a nice-to-have on the slip, never blocks generation */ }
    }

    const icRecord = {
      id: uid('IC'),
      container: (survey.container || (booking && booking.container) || '').toUpperCase(),
      type: 'Depot-In',
      line: survey.shipping_line_id || '',
      condition: conditionMap[survey.condition_status] || 'Good',
      truck: matchedTruck ? matchedTruck.id : '',
      driver: matchedDriver ? matchedDriver.id : '',
      ctype: survey.container_type || '',
      vessel: survey.vessel || '',
      voyage: survey.voyage || '',
      blNumber: survey.bl_number || '',
      eirNumber: survey.eir_number || '',
      repairs: survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : (survey.tariff_code ? [{ category: survey.tariff_category, code: survey.tariff_code, side: survey.tariff_side, item: survey.tariff_item, hours: survey.tariff_hours, material: survey.tariff_material }] : []),
      repairTotal: repairItemsTotal(survey.tariff_items && survey.tariff_items.length ? survey.tariff_items : (survey.tariff_code ? [{ hours: survey.tariff_hours, material: survey.tariff_material }] : [])),
      notes: sanitize(`Auto-generated from survey · Clerk: ${survey.clerk_name || '—'} · Transporter: ${survey.transporter || '—'}${!matchedTruck && survey.truck_reg ? ' · Truck: ' + survey.truck_reg : ''}${!matchedDriver && survey.driver_name ? ' · Driver: ' + survey.driver_name : ''} · Storage: ${storageLocation}`),
      date: new Date().toISOString(),
      status: 'pending',
      img: (survey.photos && survey.photos[0]) || '',
      surveyId: survey.id,
      bookingId: bookingId || null,
      truckRegText: !matchedTruck ? (survey.truck_reg || '') : '',
      driverNameText: !matchedDriver ? (survey.driver_name || '') : '',
      _dirty: true,
    };
    state.db.interchange.push(icRecord);
    scheduleSave(); buildBadges();
    addAudit(state.profile.username, 'Interchange Generated (from survey)', icRecord.container);
    await window.bookingDocs.markInterchangeGenerated(surveyId, icRecord.id);
    toast(`Interchange generated for ${icRecord.container} — awaiting admin approval to release payment`, 'success', 5000);
    renderDepOpsStorageList();
    if (state.currentSection === 'interchange') renderInterchange('all');
  } catch (e) {
    toast(e.message || 'Could not generate interchange', 'error');
  }
}

async function depOpsAllocZoneChanged(bookingId) {
  const zoneSel = document.getElementById('alloc-zone-' + bookingId);
  const blockSel = document.getElementById('alloc-block-' + bookingId);
  const slotSel = document.getElementById('alloc-slot-' + bookingId);
  if (!zoneSel || !blockSel || !slotSel) return;
  const zoneId = zoneSel.value;
  slotSel.innerHTML = '<option value="">—</option>';
  if (!zoneId) { blockSel.innerHTML = '<option value="">Select zone first…</option>'; return; }
  blockSel.innerHTML = '<option value="">Loading…</option>';
  try {
    const blocks = await window.bookingDocs.listBlocks(zoneId);
    if (!blocks.length) { blockSel.innerHTML = '<option value="">No blocks in this zone</option>'; return; }
    blockSel.innerHTML = '<option value="">Select…</option>' + blocks.map(bl =>
      `<option value="${bl.id}">${sanitize(bl.block_code)} · ${sanitize(bl.container_type)}</option>`
    ).join('');
  } catch (e) {
    blockSel.innerHTML = '<option value="">Error loading blocks</option>';
  }
}

async function depOpsAllocBlockChanged(bookingId) {
  const blockSel = document.getElementById('alloc-block-' + bookingId);
  const slotSel = document.getElementById('alloc-slot-' + bookingId);
  if (!blockSel || !slotSel) return;
  const blockId = blockSel.value;
  if (!blockId) { slotSel.innerHTML = '<option value="">—</option>'; return; }
  slotSel.innerHTML = '<option value="">Loading…</option>';
  try {
    const slots = await window.bookingDocs.blockSlots(blockId);
    const free = slots.filter(s => !s.booking_id && !s.trip_id && !s.container);
    if (!free.length) { slotSel.innerHTML = '<option value="">No free slots</option>'; return; }
    slotSel.innerHTML = '<option value="">Select…</option>' + free.map(s => `<option value="${s.slot_number}">Slot ${s.slot_number}</option>`).join('');
  } catch (e) {
    slotSel.innerHTML = '<option value="">Error loading slots</option>';
  }
}

async function depOpsAllocateBookingToSlot(bookingId) {
  const zoneId = (document.getElementById('alloc-zone-' + bookingId) || {}).value;
  const blockId = (document.getElementById('alloc-block-' + bookingId) || {}).value;
  const slotNumber = (document.getElementById('alloc-slot-' + bookingId) || {}).value;
  const teu = parseInt((document.getElementById('alloc-teu-' + bookingId) || {}).value, 10);
  if (!zoneId) { toast('Select a zone', 'error'); return; }
  if (!teu || teu < 1) { toast('Enter a valid TEU amount', 'error'); return; }
  try {
    const { data: booking } = await supabase.from('public_bookings').select('container').eq('id', bookingId).single();
    const survey = await window.bookingDocs.surveyForOccupant({ bookingId });
    await window.bookingDocs.allocateStorage(bookingId, zoneId, teu, {
      blockId: blockId || null,
      slotNumber: slotNumber ? parseInt(slotNumber, 10) : null,
      container: booking ? booking.container : null,
      conditionStatus: survey ? survey.condition_status : 'full_grade',
    });
    addAudit(state.profile.username, 'Storage Allocated', booking ? booking.container : bookingId);
    toast(`Storage allocated${booking && booking.container ? ' for ' + booking.container : ''}`, 'success');
    renderDepOpsAllocationQueue();
    renderDepOpsZones();
    renderDepOpsStorageList();
  } catch (e) {
    toast(e.message || 'Could not allocate storage', 'error');
  }
}

// ---------- Escalations (heavily damaged → joint survey) ----------

async function renderDepOpsEscalations() {
  const wrap = document.getElementById('depopsEscalationsList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const bookings = await window.bookingDocs.escalatedBookings();
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers awaiting joint survey</div></div>'; return; }
    const surveys = await Promise.all(bookings.map(b => window.bookingDocs.surveyForOccupant({ bookingId: b.id })));
    wrap.innerHTML = bookings.map((b,i) => depOpsEscalationCard(b, surveys[i])).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsEscalationCard(b, survey) {
  return `<div style="border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:rgba(239,68,68,0.06)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong class="mono" style="color:var(--red,#ef4444)">${sanitize(b.container) || 'No container on file'}</strong>
        <div style="font-size:11px;color:var(--text-3)">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''} · ${sanitize(b.cargo_type || '—')}</div>
        ${survey ? `<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">First survey by ${sanitize(survey.clerk_name||'—')} on ${fmtDate(survey.surveyed_at)}${survey.remarks ? ' — ' + sanitize(survey.remarks) : ''}</div>` : ''}
      </div>
      <span class="sbadge s-rejected">heavily damaged</span>
    </div>
    <div style="margin-top:10px"><button class="modal-btn primary" onclick="openJointSurveyModal('${b.id}','${survey ? survey.id : ''}')">Record Joint Survey →</button></div>
  </div>`;
}

function openJointSurveyModal(bookingId, surveyId) {
  if (!surveyId) { toast('Original survey not found for this container', 'error'); return; }
  openModal('Joint Survey', `
    <div class="ops-notice" style="margin-bottom:12px">A second, independent surveyor must confirm the condition before this container can be accepted into storage or rejected.</div>
    <div class="fg"><label>Joint Surveyor Name</label><input id="js_by" value="${sanitize((state.profile && state.profile.name) || '')}"></div>
    <div class="fg"><label>Final Condition</label><select id="js_condition">
      <option value="damaged">Damaged — accept into storage as damaged</option>
      <option value="under_repair">Under Repair — accept, route to workshop</option>
      <option value="full_grade">Full Grade — original finding overturned</option>
    </select></div>
    <div class="fg"><label>Joint Survey Notes</label><textarea id="js_notes" rows="3" placeholder="Findings, agreement/disagreement with first survey..."></textarea></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="submit-btn" style="flex:1" onclick="saveJointSurvey('${bookingId}','${surveyId}', false)">Accept Into Storage →</button>
      <button class="modal-btn danger" onclick="saveJointSurvey('${bookingId}','${surveyId}', true)">Reject Container</button>
    </div>
  `);
}

async function saveJointSurvey(bookingId, surveyId, reject) {
  const by = document.getElementById('js_by').value.trim();
  const notes = document.getElementById('js_notes').value.trim();
  const condition = document.getElementById('js_condition').value;
  if (!by) { toast('Joint surveyor name is required', 'error'); return; }
  if (reject && !confirm('Reject this container? It will be removed from the storage-allocation flow entirely.')) return;
  try {
    await window.bookingDocs.recordJointSurvey({ bookingId, surveyId, jointSurveyBy: by, jointSurveyNotes: notes, finalConditionStatus: condition, reject });
    addAudit(state.profile.username, reject ? 'Container Rejected (joint survey)' : 'Joint Survey Recorded', bookingId);

    // A joint survey is the final word for a heavily-damaged container —
    // if it's accepted (not rejected), that's "survey completion" too, so
    // generate interchange right here rather than waiting on a manual step.
    if (!reject && bookingId && surveyId) {
      await generateInterchangeFromSurvey(bookingId, surveyId);
    }

    toast(reject ? 'Container rejected' : 'Joint survey recorded — interchange generated', reject ? 'warning' : 'success');
    closeModal();
    renderDepOpsEscalations();
    renderDepOpsAllocationQueue();
    renderDepOpsStorageList();
  } catch (e) {
    toast(e.message || 'Could not save joint survey', 'error');
  }
}

// ---------- Yard Map (zone → block → slot visualization, KMA stacking rules) ----------

async function renderDepOpsYardMap() {
  const wrap = document.getElementById('depopsYardMap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const zones = await window.bookingDocs.listZones();
    if (!zones.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No storage zones configured yet</div></div>'; return; }
    let html = `<div class="ops-notice" style="margin-bottom:14px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      Stacking heights follow KMA Regulatory Guidelines §6.2: 7-high for standard dry empty containers, 6-high for reefers, unless otherwise approved.
    </div>`;
    for (const z of zones) {
      const blocks = await window.bookingDocs.listBlocks(z.id);
      html += `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span class="panel-title">${sanitize(z.zone_code||'')} · ${sanitize(z.zone_name)}</span><span class="panel-meta">${z.shipping_lines ? sanitize(z.shipping_lines.code) : 'Unassigned'}</span></div><div style="padding:12px 14px">`;
      if (!blocks.length) { html += '<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone</div></div>'; }
      for (const bl of blocks) {
        const slots = await window.bookingDocs.blockSlots(bl.id);
        const maxStack = bl.max_stack_height || window.bookingDocs.kmaMaxStackHeight(bl.container_type);
        const occCount = slots.filter(s => s.condition_status !== 'empty').length;
        const overLimit = occCount > slots.length;
        html += `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:12px;font-weight:600">Block ${sanitize(bl.block_code)} · ${sanitize(bl.container_type)}</div>
            <div style="font-size:10.5px;color:var(--text-3)">${occCount}/${slots.length} slots · max ${maxStack}-high</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:3px">
            ${slots.map(s => `<div title="Slot ${s.slot_number}${s.container ? ' — ' + sanitize(s.container) : ''} (${s.condition_status})" class="yard-slot yard-slot-${s.condition_status}"></div>`).join('')}
          </div>
          ${overLimit ? `<div style="font-size:10.5px;color:var(--red,#ef4444);margin-top:4px">⚠ Occupancy exceeds declared capacity — review against KMA §6.1 (85% max occupancy)</div>` : ''}
        </div>`;
      }
      html += `</div></div>`;
    }
    html += `<div class="panel"><div class="panel-head"><span class="panel-title">Legend</span></div><div style="padding:10px 14px;display:flex;gap:14px;flex-wrap:wrap;font-size:11px">
      <span><span class="yard-slot yard-slot-empty" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Empty</span>
      <span><span class="yard-slot yard-slot-full_grade" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Full Grade</span>
      <span><span class="yard-slot yard-slot-under_repair" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Under Repair</span>
      <span><span class="yard-slot yard-slot-damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Damaged</span>
      <span><span class="yard-slot yard-slot-heavily_damaged" style="display:inline-block;vertical-align:middle;margin-right:5px"></span>Heavily Damaged</span>
    </div></div>`;
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

// ---------- Surveyed Containers Register (printable / downloadable) ----------

let _surveyRegisterData = [];
let _surveyLookupCache = {}; // keyed by survey id, populated wherever a depot_surveys row passes through (allocation queue, register, etc.) so downloadInspectionReport() can find it regardless of which screen triggered it

async function renderDepOpsSurveyRegister() {
  const wrap = document.getElementById('depopsSurveyRegister');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    _surveyRegisterData = await window.bookingDocs.listAllSurveys();
    _surveyRegisterData.forEach(s => { _surveyLookupCache[s.id] = s; });
    if (!_surveyRegisterData.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No surveys recorded yet</div></div>'; return; }
    wrap.innerHTML = `<div style="overflow-x:auto"><table class="tbl" id="surveyRegisterTable" style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Date</th><th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Type</th>
        <th style="padding:6px 8px">Consignee</th><th style="padding:6px 8px">Transporter</th><th style="padding:6px 8px">Truck</th>
        <th style="padding:6px 8px">Clerk</th><th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Interchange</th><th style="padding:6px 8px">Inspection Report</th><th style="padding:6px 8px">Photos</th>
      </tr></thead><tbody>${_surveyRegisterData.map(s => `<tr style="border-top:1px solid var(--border)">
        <td style="padding:6px 8px">${fmtDate(s.surveyed_at)}</td>
        <td style="padding:6px 8px" class="mono">${sanitize(s.container||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.container_type||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.consignee||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.transporter||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.truck_reg||'—')}</td>
        <td style="padding:6px 8px">${sanitize(s.clerk_name||'—')}</td>
        <td style="padding:6px 8px">${sbadge(s.condition_status === 'heavily_damaged' ? 'rejected' : (s.condition_status === 'full_grade' ? 'approved' : 'pending'))} ${sanitize((s.condition_status||'').replace(/_/g,' '))}</td>
        <td style="padding:6px 8px">${s.interchange_generated_at ? `✓ Generated${s.interchange_id ? ` <button class="tbl-btn" onclick="downloadInterchangeSlip('${s.interchange_id}')">⬇</button>` : ''}` : '—'}</td>
        <td style="padding:6px 8px"><button class="tbl-btn" onclick="downloadInspectionReport('${s.id}')">⬇ Report</button></td>
        <td style="padding:6px 8px">${Array.isArray(s.photos) && s.photos.length ? `<button class="tbl-btn" onclick="viewSurveyPhotos('${s.id}')">📷 ${s.photos.length}</button>` : '<span style="color:var(--text-3);font-size:10.5px">—</span>'}</td>
      </tr>`).join('')}</tbody></table></div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function viewSurveyPhotos(surveyId) {
  const s = _surveyRegisterData.find(x => x.id === surveyId);
  if (!s) { toast('Survey not found', 'error'); return; }
  const photos = Array.isArray(s.photos) ? s.photos : [];
  const gallery = photos.length
    ? `<div class="container-img-grid">${photos.map(src => `<div class="container-img-thumb view-only"><img src="${src}" onclick="window.open('${src}','_blank')" /></div>`).join('')}</div>`
    : '<div class="empty-state"><div class="empty-state-label">No photos on file for this survey</div></div>';
  openModal(`Survey Photos — ${sanitize(s.container || 'Container')}`, `<div style="margin-bottom:10px;font-size:11px;color:var(--text-3)">Surveyed ${fmtDate(s.surveyed_at)} by ${sanitize(s.clerk_name||'—')}</div>${gallery}`);
}

function printSurveyRegister() {
  const table = document.getElementById('surveyRegisterTable');
  if (!table) { toast('Nothing to print yet', 'error'); return; }
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Surveyed Containers</title><style>
    body{font-family:Arial,sans-serif;padding:20px;color:#111}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#f2f2f2;text-transform:uppercase;font-size:9px}
    h2{margin-bottom:4px}
  </style></head><body><h2>Gargo Haven Depot — Surveyed Containers</h2><div style="font-size:11px;color:#555;margin-bottom:12px">Generated ${new Date().toLocaleString('en-KE')}</div>${table.outerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function downloadSurveyRegisterCSV() {
  if (!_surveyRegisterData.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date','Container','Type','ISO Code','Line ID','Consignee','Guarantee/B-L','Vessel','Voyage','Transporter','Vehicle No','Trailer No','Driver','Driver ID No','Surveyed By','Seal','Gate Pass','MGW','TW','Condition','Escalated','Interchange Generated','Photos'];
  const rows = _surveyRegisterData.map(s => [
    s.surveyed_at, s.container, s.container_type, s.iso_code, s.shipping_line_id, s.consignee, s.bl_number, s.vessel, s.voyage,
    s.transporter, s.truck_reg, s.trailer_number, s.driver_name, s.driver_id_number, s.clerk_name, s.seal_number, s.gate_pass_number,
    s.mgwt, s.tare_weight, s.condition_status,
    s.escalated ? 'Yes' : 'No', s.interchange_generated_at ? 'Yes' : 'No',
    Array.isArray(s.photos) ? s.photos.length : 0,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v==null?'':v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `surveyed-containers-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Master Container List (all statuses) ----------

let _masterListFilter = 'all';

function filterDepOpsMasterList(status, btn) {
  _masterListFilter = status;
  document.querySelectorAll('#depopsPanel-master .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDepOpsMasterList();
}

const MASTER_STATUS_LABELS = {
  awaiting_survey: 'Awaiting Survey', escalated: 'Escalated (Joint Survey)', surveyed: 'Surveyed',
  allocated: 'In Storage', survey_rejected: 'Rejected', dispatched: 'Dispatched',
};

async function renderDepOpsMasterList() {
  const wrap = document.getElementById('depopsMasterList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    let entries = await window.bookingDocs.masterContainerList();
    if (_masterListFilter !== 'all') entries = entries.filter(e => e.booking.storage_status === _masterListFilter);
    if (!entries.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No containers match this filter</div></div>'; return; }
    wrap.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="text-align:left;font-size:10.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">
        <th style="padding:6px 8px">Container</th><th style="padding:6px 8px">Client</th><th style="padding:6px 8px">Status</th>
        <th style="padding:6px 8px">Condition</th><th style="padding:6px 8px">Location</th><th style="padding:6px 8px">Interchange</th>
      </tr></thead><tbody>${entries.map(e => {
        const b = e.booking, s = e.survey, slot = e.slot;
        const loc = slot ? `${slot.depot_blocks ? sanitize(slot.depot_blocks.block_code) : ''} · Slot ${slot.slot_number}` : (b.storage_zone_id ? 'Zone assigned' : '—');
        return `<tr style="border-top:1px solid var(--border)">
          <td style="padding:6px 8px" class="mono">${sanitize(b.container||'—')}</td>
          <td style="padding:6px 8px">${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''}</td>
          <td style="padding:6px 8px">${sbadge(b.storage_status==='escalated'?'rejected':b.storage_status==='surveyed'||b.storage_status==='allocated'?'approved':'pending')} ${MASTER_STATUS_LABELS[b.storage_status] || sanitize(b.storage_status||'—')}</td>
          <td style="padding:6px 8px">${s ? sanitize((s.condition_status||'').replace(/_/g,' ')) : '—'}</td>
          <td style="padding:6px 8px">${loc}</td>
          <td style="padding:6px 8px">${s && s.interchange_generated_at ? `✓${s.interchange_id ? ` <button class="tbl-btn" onclick="downloadInterchangeSlip('${s.interchange_id}')">⬇</button>` : ''}` : '—'}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

// ---------- DepOps Reports (pulls from Interchange, filterable by shipping line) ----------

let _depOpsRptRows = [];

function depOpsReportsPopulateLines() {
  const sel = document.getElementById('depopsRptLine');
  if (!sel || sel.dataset.populated) return;
  const unmapped = document.createElement('option');
  unmapped.value = '__unmapped__';
  unmapped.textContent = '⚠ No Line Assigned';
  sel.appendChild(unmapped);
  state.db.shippingLines.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = `${l.code} — ${l.name}`;
    sel.appendChild(opt);
  });
  sel.dataset.populated = '1';
}

function depOpsReportsReset() {
  ['depopsRptLine', 'depopsRptType', 'depopsRptStatus', 'depopsRptFrom', 'depopsRptTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderDepOpsReports();
}


function _tripToInterchangeReportRow(t) {
  const outward = isOutwardWorkType(t.workType);
  return {
    id: t.id, container: t.container, type: outward ? 'Gate-Out' : 'Gate-In',
    ctype: t.ctype || '', line: t.shippingLine || '', condition: '',
    truck: t.truckId || '', driver: t.driverId || '',

    status: t.status === 'completed' ? 'approved' : 'pending',
    repairTotal: 0,
    date: outward ? (t.dateOut || t.startTime) : t.startTime,
    notes: t.notes || '',
    _reportSource: 'trips',
  };
}

async function renderDepOpsReports() {
  depOpsReportsPopulateLines();

  const lineId = document.getElementById('depopsRptLine')?.value || '';
  const type = document.getElementById('depopsRptType')?.value || '';
  const status = document.getElementById('depopsRptStatus')?.value || '';
  const from = document.getElementById('depopsRptFrom')?.value || '';
  const to = document.getElementById('depopsRptTo')?.value || '';


  let rows = [
    ...(state.db.interchange || []).map(i => ({ ...i, _reportSource: 'interchange' })),
    ...(state.db.trips || []).map(_tripToInterchangeReportRow),
  ];
  if (lineId === '__unmapped__') rows = rows.filter(i => !i.line);
  else if (lineId) rows = rows.filter(i => i.line === lineId);
  if (type) rows = rows.filter(i => i.type === type);
  if (status) rows = rows.filter(i => i.status === status);
  if (from) rows = rows.filter(i => new Date(i.date) >= new Date(from));
  if (to) rows = rows.filter(i => new Date(i.date) <= new Date(to + 'T23:59:59'));
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  _depOpsRptRows = rows;

  const body = document.getElementById('depopsRptBody');
  const meta = document.getElementById('depopsRptMeta');
  const exportBtn = document.getElementById('depopsRptExportBtn');
  const unmappedCount = (state.db.interchange || []).filter(i => !i.line).length
    + (state.db.trips || []).filter(t => !t.shippingLine).length;
  if (meta) meta.textContent = `${rows.length} record${rows.length === 1 ? '' : 's'}` + (unmappedCount ? ` · ${unmappedCount} total with no shipping line — <a href="#" onclick="openUnmappedVesselsModal();return false" style="color:var(--gold)">resolve them →</a>` : '');
  if (exportBtn) exportBtn.disabled = !rows.length;

  if (body) {
    body.innerHTML = rows.length ? rows.map(ic => `<tr>
      <td class="mono">${fmtDate(ic.date)}</td>
      <td class="mono" style="color:var(--gold)">${sanitize(ic.container || '—')}</td>
      <td>${sanitize(ic.type || '—')}</td>
      <td>${sanitize(ic.ctype || '—')}</td>
      <td>${ic.line ? sanitize(lineName(ic.line)) : '<span style="color:var(--danger,#c0392b)">⚠ No Line</span>'}</td>
      <td>${sanitize(ic.condition || '—')}</td>
      <td>${ic.truck ? sanitize(truckName(ic.truck)) : '—'}</td>
      <td>${ic.driver ? sanitize(driverName(ic.driver)) : '—'}</td>
      <td>${sbadge(ic.status)}</td>
      <td class="mono">${ic.repairTotal ? fmtKsh(ic.repairTotal) : '—'}</td>
    </tr>`).join('') : `<tr><td colspan="10" class="empty-td">No interchange records match these filters</td></tr>`;
  }

  const byLine = {};
  rows.forEach(ic => { const key = ic.line ? lineName(ic.line) : '⚠ No Line Assigned'; byLine[key] = (byLine[key] || 0) + 1; });
  const repairTotal = rows.reduce((s, ic) => s + (ic.repairTotal || 0), 0);

  const summary = document.getElementById('depopsRptSummary');
  if (summary) {
    summary.innerHTML = `<div class="two-col-grid">
      <div class="report-block">
        <h3>Summary</h3>
        ${reportRow('Total Records', rows.length)}
        ${reportRow('Pending', rows.filter(i => i.status === 'pending').length)}
        ${reportRow('Approved', rows.filter(i => i.status === 'approved').length)}
        ${reportRow('Reconciled', rows.filter(i => i.status === 'reconciled').length)}
        ${reportRow('Repair Costs Total', fmtKsh(repairTotal))}
      </div>
      <div class="report-block">
        <h3>By Shipping Line</h3>
        ${Object.entries(byLine).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => reportRow(k, v)).join('') || '<div style="color:var(--text-3);font-size:12px">No data for these filters</div>'}
      </div>
    </div>`;
  }
}


function downloadDepOpsReportCSV() {
  if (!_depOpsRptRows.length) { toast('Nothing to download yet', 'error'); return; }
  const headers = ['Date', 'Container', 'Movement', 'Type', 'Shipping Line', 'Condition', 'Truck', 'Driver', 'Status', 'Repair Cost'];
  const rows = _depOpsRptRows.map(ic => [
    ic.date, ic.container, ic.type, ic.ctype, lineName(ic.line), ic.condition,
    ic.truck ? truckName(ic.truck) : '', ic.driver ? driverName(ic.driver) : '', ic.status, ic.repairTotal || 0,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `depops-interchange-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}



async function renderDepOpsZoneAdmin() {
  const wrap = document.getElementById('depopsZoneAdmin');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const zones = await window.bookingDocs.listZones();
    const blocksByZone = {};
    for (const z of zones) blocksByZone[z.id] = await window.bookingDocs.listBlocks(z.id);
    wrap.innerHTML = `
      <div style="margin-bottom:14px"><button class="action-btn" onclick="showAddZoneModal()">+ Create Zone</button></div>
      ${zones.length ? zones.map(z => depOpsZoneAdminCard(z, blocksByZone[z.id] || [])).join('') : '<div class="empty-state"><div class="empty-state-label">No zones yet — create one above</div></div>'}
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsZoneAdminCard(z, blocks) {
  const cap = z.capacity_teu || 0, occ = z.occupied_teu || 0;
  const lineLabel = z.shipping_lines ? `${sanitize(z.shipping_lines.code)} — ${sanitize(z.shipping_lines.name)}` : 'Unassigned';
  return `<div class="panel" style="margin-bottom:14px">
    <div class="panel-head">
      <span class="panel-title">${sanitize(z.zone_code || '')} · ${sanitize(z.zone_name)}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <span class="panel-meta">${lineLabel} · ${occ}/${cap} TEU</span>
        <button class="modal-btn ghost" onclick="showEditZoneModal('${z.id}')">Edit</button>
      </span>
    </div>
    <div style="padding:12px 14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase">Blocks</div>
        <button class="modal-btn ghost" onclick="showAddBlockModal('${z.id}','${sanitize(z.zone_name).replace(/'/g,"\\'")}')">+ Add Block</button>
      </div>
      ${blocks.length ? blocks.map(bl => depOpsBlockRow(bl)).join('') : '<div class="empty-state" style="padding:10px"><div class="empty-state-label">No blocks in this zone yet</div></div>'}
    </div>
  </div>`;
}

function depOpsBlockRow(bl) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border)">
    <div>
      <strong style="font-size:12.5px">${sanitize(bl.block_code)}</strong>
      <span style="font-size:11px;color:var(--text-3)"> · ${sanitize(bl.container_type)} · ${bl.capacity_slots} slots</span>
    </div>
    <button class="modal-btn ghost" onclick="showBlockSlotsModal('${bl.id}')">View Slots →</button>
  </div>`;
}

function showAddZoneModal() {
  const lineOptions = state.db.shippingLines.filter(l => l.active).map(l => `<option value="${l.id}">${sanitize(l.code)} — ${sanitize(l.name)}</option>`).join('');
  openModal('Create Storage Zone', `
    <div class="form-row-2">
      <div class="fg"><label>Zone Code</label><input id="zn_code" placeholder="A" maxlength="8"></div>
      <div class="fg"><label>Zone Name</label><input id="zn_name" placeholder="Zone A"></div>
    </div>
    <div class="fg"><label>Shipping Line</label><select id="zn_line"><option value="">Unassigned / shared</option>${lineOptions}</select></div>
    <div class="fg"><label>Capacity (TEU)</label><input id="zn_cap" type="number" min="0" placeholder="100"></div>
    <div class="fg"><label>Notes</label><input id="zn_notes" placeholder="Optional"></div>
    <button class="submit-btn" onclick="saveZone()">Create Zone →</button>
  `);
}

async function saveZone() {
  const code = document.getElementById('zn_code').value.trim();
  const name = document.getElementById('zn_name').value.trim();
  const lineId = document.getElementById('zn_line').value || null;
  const cap = document.getElementById('zn_cap').value;
  const notes = document.getElementById('zn_notes').value.trim();
  if (!code || !name) { toast('Zone code and name are required', 'error'); return; }
  try {
    await window.bookingDocs.createZone({ zoneCode: code, zoneName: name, shippingLineId: lineId, capacityTeu: cap, notes });
    toast(`Zone ${code} created`, 'success');
    closeModal();
    renderDepOpsZoneAdmin();
    renderDepOpsZones();
  } catch (e) {
    toast(e.message || 'Could not create zone', 'error');
  }
}

async function showEditZoneModal(zoneId) {
  try {
    const zones = await window.bookingDocs.listZones();
    const z = zones.find(x => x.id === zoneId);
    if (!z) { toast('Zone not found', 'error'); return; }
    const lineOptions = state.db.shippingLines.filter(l => l.active).map(l =>
      `<option value="${l.id}" ${z.shipping_line_id === l.id ? 'selected' : ''}>${sanitize(l.code)} — ${sanitize(l.name)}</option>`
    ).join('');
    openModal(`Edit Zone — ${sanitize(z.zone_code || z.zone_name)}`, `
      <div class="form-row-2">
        <div class="fg"><label>Zone Code</label><input id="zn_edit_code" value="${sanitize(z.zone_code || '')}" maxlength="8"></div>
        <div class="fg"><label>Zone Name</label><input id="zn_edit_name" value="${sanitize(z.zone_name)}"></div>
      </div>
      <div class="fg"><label>Shipping Line</label><select id="zn_edit_line"><option value="">Unassigned / shared</option>${lineOptions}</select></div>
      <div class="fg"><label>Capacity (TEU)</label><input id="zn_edit_cap" type="number" min="0" value="${z.capacity_teu || 0}"></div>
      <button class="submit-btn" onclick="saveZoneEdit('${zoneId}')">Save Changes →</button>
    `);
  } catch (e) {
    toast(e.message || 'Could not load zone', 'error');
  }
}

async function saveZoneEdit(zoneId) {
  const code = document.getElementById('zn_edit_code').value.trim();
  const name = document.getElementById('zn_edit_name').value.trim();
  const lineId = document.getElementById('zn_edit_line').value || null;
  const cap = parseInt(document.getElementById('zn_edit_cap').value, 10) || 0;
  if (!code || !name) { toast('Zone code and name are required', 'error'); return; }
  try {
    await window.bookingDocs.updateZone(zoneId, { zone_code: code.toUpperCase(), zone_name: name, shipping_line_id: lineId, capacity_teu: cap });
    toast('Zone updated', 'success');
    closeModal();
    renderDepOpsZoneAdmin();
    renderDepOpsZones();
  } catch (e) {
    toast(e.message || 'Could not update zone', 'error');
  }
}

function showAddBlockModal(zoneId, zoneName) {
  const typeOptions = ['Any', ...CONTAINER_TYPE_OPTIONS].map(t => `<option>${t}</option>`).join('');
  openModal(`Add Block — ${sanitize(zoneName)}`, `
    <div class="form-row-2">
      <div class="fg"><label>Block Code</label><input id="bl_code" placeholder="1"></div>
      <div class="fg"><label>Container Type</label><select id="bl_ctype">${typeOptions}</select></div>
    </div>
    <div class="fg"><label>Capacity (number of slots)</label><input id="bl_cap" type="number" min="1" value="20"></div>
    <div class="fg"><label>Notes</label><input id="bl_notes" placeholder="Optional"></div>
    <button class="submit-btn" onclick="saveBlock('${zoneId}')">Create Block →</button>
  `);
}

async function saveBlock(zoneId) {
  const code = document.getElementById('bl_code').value.trim();
  const ctype = document.getElementById('bl_ctype').value;
  const cap = document.getElementById('bl_cap').value;
  const notes = document.getElementById('bl_notes').value.trim();
  if (!code) { toast('Block code is required', 'error'); return; }
  try {
    await window.bookingDocs.createBlock({ zoneId, blockCode: code, containerType: ctype, capacitySlots: cap, notes });
    toast(`Block ${code} created`, 'success');
    closeModal();
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || 'Could not create block', 'error');
  }
}

async function showBlockSlotsModal(blockId) {
  openModal('Block Slots', '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');
  try {
    const slots = await window.bookingDocs.blockSlots(blockId);
    const grid = slots.map(s => {
      const linked = !!(s.booking_id || s.trip_id);
      const manual = !linked && !!s.container;
      const occupied = linked || manual;
      const colour = !occupied ? 'var(--border-mid)' : (s.condition_status === 'under_repair' ? 'var(--red)' : s.condition_status === 'damaged' ? '#b45309' : 'var(--green)');
      const label = occupied ? sanitize(s.container || '•') : s.slot_number;
      let clickAction;
      if (manual) clickAction = `releaseSlotFromGrid('${blockId}',${s.slot_number})`;
      else if (linked) clickAction = `toast('Linked to a booking/trip — release it from Outward / Repatriation instead', 'info', 5000)`;
      else clickAction = `manualAssignSlot('${blockId}',${s.slot_number})`;
      const titleTip = !occupied ? 'empty · click to assign' : (manual ? (s.condition_status || '') + ' · click to release' : (s.condition_status || '') + ' · linked booking/trip');
      return `<div class="slot-cell" style="border-color:${colour};color:${occupied ? '#fff' : 'var(--text-3)'};background:${occupied ? colour : 'transparent'}" title="Slot ${s.slot_number} · ${titleTip}" onclick="${clickAction}">${label}</div>`;
    }).join('');
    openModal('Block Slots', `
      <div style="font-size:11px;color:var(--text-3);margin-bottom:10px">Click an empty slot to manually place a container. Slots linked to a booking/trip release automatically through Outward / Repatriation.</div>
      <div class="slot-grid">${grid || '<div class="empty-state"><div class="empty-state-label">No slots</div></div>'}</div>
    `);
  } catch (e) {
    openModal('Block Slots', `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`);
  }
}

function manualAssignSlot(blockId, slotNumber) {
  openModal(`Assign Slot ${slotNumber}`, `
    <div class="fg"><label>Container No.</label><input id="ms_container" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>
    <div class="fg"><label>Condition</label><select id="ms_condition"><option value="full_grade">Full Grade</option><option value="under_repair">Under Repair</option><option value="damaged">Damaged</option></select></div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Use this for containers already on-site with no matching booking — e.g. after a physical stock-take. Containers coming through Public Bookings should go through Survey/Allocation above instead, so their paperwork stays linked.</div>
    <button class="submit-btn" onclick="saveManualAssignSlot('${blockId}',${slotNumber})">Assign →</button>
  `);
}

async function saveManualAssignSlot(blockId, slotNumber) {
  const container = document.getElementById('ms_container').value.trim().toUpperCase();
  const condition = document.getElementById('ms_condition').value;
  const containerIssue = containerFormatIssue(container);
  if (containerIssue) { toast(`Container number: ${containerIssue}`, 'error'); return; }
  try {
    await window.bookingDocs.occupySlot({ blockId, slotNumber, container, conditionStatus: condition });
    toast(`${container} placed in slot ${slotNumber}`, 'success');
    showBlockSlotsModal(blockId);
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || 'Could not assign slot', 'error');
  }
}

async function releaseSlotFromGrid(blockId, slotNumber) {
  if (!confirm(`Release slot ${slotNumber}?`)) return;
  try {
    await window.bookingDocs.releaseSlotByNumber(blockId, slotNumber);
    toast('Slot released', 'success');
    showBlockSlotsModal(blockId);
    renderDepOpsZoneAdmin();
  } catch (e) {
    toast(e.message || 'Could not release slot', 'error');
  }
}

// ---------- Outward / repatriation ----------

function filterDepOpsOutward(status, btn) {
  _depOpsOutwardFilter = status;
  document.querySelectorAll('#depopsPanel-outward .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDepOpsOutward();
}

async function renderDepOpsOutward() {
  await renderDepOpsEligible();
  await renderDepOpsOutwardTrips();
  const container = document.getElementById('depopsOutwardQueue');
  if (!container) return;
  container.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const docs = await window.bookingDocs.outwardReviewQueue(_depOpsOutwardFilter);
    if (!docs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-label">No ${_depOpsOutwardFilter.replace(/_/g,' ')} release orders</div></div>`; return; }
    container.innerHTML = docs.map(d => depOpsDocCard(d, 'outward')).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}


async function depOpsRepatriationEligibleBookings() {
  const { data, error } = await supabase
    .from('public_bookings')
    .select('*')
    .eq('status', 'imported')
    .eq('storage_status', 'allocated')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message || 'Could not load bookings');
  const outwardBookingIds = new Set(
    state.db.trips.filter(t => t.workType === 'Depot → Port' && t.bookingId).map(t => t.bookingId)
  );
  return (data || []).filter(b => !outwardBookingIds.has(b.id));
}

async function renderDepOpsEligible() {
  const wrap = document.getElementById('depopsEligibleList');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const [bookings, zones] = await Promise.all([
      depOpsRepatriationEligibleBookings(),
      window.bookingDocs.storageAvailability(),
    ]);
    if (!bookings.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No depot-held containers awaiting repatriation</div></div>'; return; }
    const zoneMap = {}; zones.forEach(z => { zoneMap[z.id] = z.zone_name; });
    wrap.innerHTML = bookings.map(b => depOpsEligibleCard(b, zoneMap)).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsEligibleCard(b, zoneMap) {
  const zoneName = (b.storage_zone_id && zoneMap[b.storage_zone_id]) || 'Unknown zone';
  const portOptions = window.bookingDocs.PORT_LOCATIONS.map(p => `<option value="${sanitize(p)}">${sanitize(p)}</option>`).join('');
  const outwardTypeOptions = OUTWARD_TYPES.map(w => `<option value="${sanitize(w)}">${sanitize(w)}</option>`).join('');
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
    <div><strong>${sanitize(b.container) || 'No container on file'}</strong> <span style="font-size:11px;color:var(--text-3)">· ${sanitize(b.full_name)}${b.company ? ' · ' + sanitize(b.company) : ''}</span></div>
    <div style="font-size:10.5px;color:var(--text-3);margin-top:2px">Booking ${b.id.slice(0,8)} · Currently in ${sanitize(zoneName)}</div>
    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:end">
      <input type="number" id="depopsRelTeu-${b.id}" min="1" value="1" title="TEU to release from ${sanitize(zoneName)} once this container departs" style="width:64px;padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
      <select id="depopsDest-${b.id}" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">${portOptions}</select>
      <select id="depopsOutwardType-${b.id}" title="Outward type" style="padding:6px 8px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="">Outward type…</option>${outwardTypeOptions}</select>
      <button class="modal-btn primary" onclick="depOpsCreateOutwardFromBooking('${b.id}')">Create Outward Trip →</button>
    </div>
  </div>`;
}

async function depOpsCreateOutwardFromBooking(bookingId) {
  const teuEl = document.getElementById('depopsRelTeu-' + bookingId);
  const destEl = document.getElementById('depopsDest-' + bookingId);
  const outwardTypeEl = document.getElementById('depopsOutwardType-' + bookingId);
  const teu = teuEl ? parseInt(teuEl.value, 10) : 0;
  const dest = destEl ? destEl.value : '';
  const outwardType = outwardTypeEl ? outwardTypeEl.value : '';
  if (!teu || teu < 1) { toast('Enter a valid TEU amount', 'error'); return; }
  if (!OUTWARD_TYPES.includes(outwardType)) { toast('Select an outward type — Repatriation to Port, Shippers/Export, or Sale units', 'error'); return; }

  const { data: booking, error } = await supabase.from('public_bookings').select('*').eq('id', bookingId).single();
  if (error || !booking) { toast('Booking not found', 'error'); return; }
  if (!booking.storage_zone_id) { toast('This booking has no recorded storage zone', 'error'); return; }

  const container = (booking.container || '').trim().toUpperCase() || `REPAT-${booking.id.slice(0,8)}`;
  const dupTrip = findLiveTripByContainer(container);
  if (dupTrip) { toast(`${container} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest})`, 'error'); return; }

  const trip = {
    id: uid('TRIP'), container, ctype: booking.cargo_type || '20ft Dry',
    workType: 'Depot → Port', outwardType, origin: 'Depot', dest,
    shippingLine: resolveBookingShippingLineId(booking), status: 'active', startTime: new Date().toISOString(),
    eta: new Date(Date.now() + 4*3600000).toISOString(), distance: 0, priority: 'Normal',
    notes: `Repatriation for booking #${booking.id}`, ref: `REPAT-${booking.id.slice(0,8)}`,
    truckId: null, driverId: null, containerImages: [], bookingId: booking.id,
    storageZoneId: booking.storage_zone_id, storageTeu: teu, storageReleased: false,
  };
  state.db.trips.push(trip);
  scheduleSave();
  toast('Outward trip created — upload the release order next', 'success');
  renderDepOpsOutward();
  renderDepOpsStorageList();
  refreshAwaitingDispatchUI();
}

async function depOpsCreateManualOutward() {
  const containerEl = document.getElementById('depopsManualContainer');
  const zoneEl = document.getElementById('depopsManualZone');
  const teuEl = document.getElementById('depopsManualTeu');
  const destEl = document.getElementById('depopsManualDest');
  const lineEl = document.getElementById('depopsManualLine');
  const outwardTypeEl = document.getElementById('depopsManualOutwardType');
  const container = (containerEl.value || '').trim().toUpperCase();
  const zoneId = zoneEl.value;
  const teu = parseInt(teuEl.value, 10);
  const dest = destEl.value;
  const lineId = lineEl ? lineEl.value : '';
  const outwardType = outwardTypeEl ? outwardTypeEl.value : '';

  const containerIssue = containerFormatIssue(container);
  if (containerIssue) { toast(`Container number: ${containerIssue}`, 'error'); return; }
  if (!zoneId) { toast('Select a zone', 'error'); return; }
  if (!teu || teu < 1) { toast('Enter a valid TEU amount', 'error'); return; }
  if (!lineId) { toast('Select the shipping line — without it this container won\u2019t show up under any line\u2019s account', 'error'); return; }
  if (!OUTWARD_TYPES.includes(outwardType)) { toast('Select an outward type — Repatriation to Port, Shippers/Export, or Sale units', 'error'); return; }
  const dupTrip = findLiveTripByContainer(container);
  if (dupTrip) { toast(`${container} is already on an active trip (${dupTrip.origin} → ${dupTrip.dest})`, 'error'); return; }

  const trip = {
    id: uid('TRIP'), container, ctype: '20ft Dry', workType: 'Depot → Port', outwardType, origin: 'Depot', dest,
    shippingLine: lineId, status: 'active', startTime: new Date().toISOString(),
    eta: new Date(Date.now() + 4*3600000).toISOString(), distance: 0, priority: 'Normal',
    notes: 'Manually added repatriation container (no originating booking)', ref: `REPAT-${container}`,
    truckId: null, driverId: null, containerImages: [], bookingId: null,
    storageZoneId: zoneId, storageTeu: teu, storageReleased: false,
  };
  state.db.trips.push(trip);
  scheduleSave();
  toast('Outward trip created — upload the release order next', 'success');
  containerEl.value = '';
  if (lineEl) lineEl.value = '';
  renderDepOpsOutward();
  refreshAwaitingDispatchUI();
}

async function renderDepOpsOutwardTrips() {
  const wrap = document.getElementById('depopsOutwardTripsList');
  const formWrap = document.getElementById('depopsManualForm');
  if (formWrap && !formWrap.dataset.loaded) {
    try {
      const zones = await window.bookingDocs.storageAvailability();
      const zoneOptions = zones.map(z => `<option value="${z.id}">${sanitize(z.zone_name)}</option>`).join('');
      const portOptions = window.bookingDocs.PORT_LOCATIONS.map(p => `<option value="${sanitize(p)}">${sanitize(p)}</option>`).join('');
      const lineOptions = state.db.shippingLines.filter(l=>l.active).map(l => `<option value="${l.id}">${sanitize(l.code)} — ${sanitize(l.name)}</option>`).join('');
      const outwardTypeOptions = OUTWARD_TYPES.map(w => `<option value="${sanitize(w)}">${sanitize(w)}</option>`).join('');
      formWrap.innerHTML = `<div class="panel" style="margin-bottom:14px">
        <div class="panel-head"><span class="panel-title">Add Outward Container Manually</span></div>
        <div style="padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;align-items:end">
          <div class="fg" style="margin:0"><label>Container No.</label><input id="depopsManualContainer" placeholder="e.g. MSCU1234566" oninput="markContainerValidity(this)"></div>
          <div class="fg" style="margin:0"><label>Zone</label><select id="depopsManualZone"><option value="">Select…</option>${zoneOptions}</select></div>
          <div class="fg" style="margin:0"><label>TEU</label><input type="number" id="depopsManualTeu" min="1" value="1"></div>
          <div class="fg" style="margin:0"><label>Destination</label><select id="depopsManualDest">${portOptions}</select></div>
          <div class="fg" style="margin:0"><label>Shipping Line</label><select id="depopsManualLine"><option value="">Select…</option>${lineOptions}</select></div>
          <div class="fg" style="margin:0"><label>Outward Type</label><select id="depopsManualOutwardType"><option value="">Select…</option>${outwardTypeOptions}</select></div>
          <button class="modal-btn primary" onclick="depOpsCreateManualOutward()">Create →</button>
        </div>
      </div>`;
      formWrap.dataset.loaded = '1';
    } catch (e) { /* form is a nice-to-have; the eligible/queue lists still work without it */ }
  }

  if (!wrap) return;
  const trips = state.db.trips.filter(t => t.workType === 'Depot → Port');
  if (!trips.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">No outward/repatriation trips yet</div></div>'; return; }
  wrap.innerHTML = '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>';
  try {
    const docsByTrip = await window.bookingDocs.documentsForTrips(trips.map(t => t.id));
    wrap.innerHTML = trips.map(t => depOpsOutwardTripCard(t, docsByTrip[t.id] || [])).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">Error: ${sanitize(e.message || '')}</div>`;
  }
}

function depOpsOutwardTripCard(t, docs) {
  const doc = docs.find(d => d.doc_type === 'release_order');
  const docBlock = doc
    ? docStatusBadge(doc.status)
    : `<button class="modal-btn primary" onclick="depOpsUploadReleaseOrder('${t.id}','${sanitize(t.container)}')">Upload Release Order</button>`;
  const storageBlock = t.storageZoneId
    ? (t.storageReleased ? '<span class="sbadge s-approved">storage released</span>' : `<span class="sbadge s-pending">${t.storageTeu || '?'} TEU pending release</span>`)
    : '';
  const outwardTypeBlock = t.outwardType
    ? `<span style="font-size:10px;padding:2px 8px;border-radius:20px;border:1px solid var(--gold-border);color:var(--gold);background:var(--gold-dim)">${sanitize(t.outwardType)}</span>`
    : '';
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong class="mono" style="color:var(--gold)">${sanitize(t.container)}</strong>
        <div style="font-size:11px;color:var(--text-3)">${sanitize(t.origin)} → ${sanitize(t.dest)}</div>
        <div style="font-size:10px;color:var(--text-3)">${sanitize(t.ref)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${sbadge(t.status)}
        ${outwardTypeBlock}
        ${storageBlock}
      </div>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      ${docBlock}
      <button class="modal-btn ghost" onclick="showTripDetail('${t.id}')">View / Manage Trip</button>
    </div>
  </div>`;
}

function depOpsUploadReleaseOrder(tripId, container) {
  openModal('Upload Release Order', `
    <div class="fg"><label>Container</label><input value="${sanitize(container)}" disabled></div>
    <div class="fg"><label>Release Order File</label><input type="file" id="depopsReleaseFile" accept=".pdf,.jpg,.jpeg,.png"></div>
    <div id="depopsUploadMsg" style="font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <button class="submit-btn" onclick="depOpsConfirmUploadReleaseOrder('${tripId}','${sanitize(container).replace(/'/g,"\\'")}')">Upload</button>
  `);
}

async function depOpsConfirmUploadReleaseOrder(tripId, container) {
  const fileInput = document.getElementById('depopsReleaseFile');
  const msg = document.getElementById('depopsUploadMsg');
  const file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) { msg.textContent = 'Select a file first.'; msg.style.color = 'var(--red)'; return; }
  msg.textContent = 'Uploading…'; msg.style.color = 'var(--text-3)';
  try {
    await window.bookingDocs.uploadTripDocument({ tripId, docType: 'release_order', containerNo: container, file });
    msg.textContent = '✓ Uploaded'; msg.style.color = 'var(--green)';
    setTimeout(() => { closeModal(); renderDepOpsOutward(); }, 600);
  } catch (e) {
    msg.textContent = e.message || 'Upload failed'; msg.style.color = 'var(--red)';
  }
}

// ---------- Shared doc card + review actions (both tabs) ----------

function depOpsDocCard(doc, kind) {
  const parent = kind === 'inbound' ? (doc.public_bookings || {}) : (doc.trips || {});
  const ref = kind === 'inbound' ? (parent.full_name ? parent.full_name : (doc.booking_id || '').slice(0,8)) : (parent.container || (doc.trip_id || '').slice(0,8));
  const who = kind === 'inbound'
    ? [parent.company, parent.service_type].filter(Boolean).join(' · ') || 'Public booking'
    : `${sanitize(parent.origin || '')} → ${sanitize(parent.destination || '')}`;
  const label = DEPOPS_DOC_LABELS[doc.doc_type] || doc.doc_type;
  const status = doc.status || 'pending_review';
  const isPending = status === 'pending_review';

  const actions = isPending
    ? `<button class="modal-btn ghost" onclick="depOpsViewDoc('${doc.file_path.replace(/'/g,"\\'")}')">View / Download</button>
       <button class="modal-btn primary" onclick="depOpsVerifyDoc('${doc.id}','${kind}')">Verify</button>
       <button class="modal-btn danger" onclick="depOpsRejectDoc('${doc.id}','${kind}')">Reject…</button>`
    : `<button class="modal-btn ghost" onclick="depOpsViewDoc('${doc.file_path.replace(/'/g,"\\'")}')">View / Download</button>`;

  return `<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;background:var(--surface)" id="depopsDoc-${doc.id}">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong>${sanitize(String(ref))}</strong>
        <div style="font-size:11px;color:var(--text-3)">${who}</div>
        <div style="font-size:10px;color:var(--text-3)">${doc.container_no ? 'Container: ' + sanitize(doc.container_no) + ' · ' : ''}Uploaded ${depOpsFmtDT(doc.uploaded_at)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <span style="font-size:10.5px;padding:3px 9px;border-radius:20px;background:rgba(201,162,39,0.12);color:var(--gold);border:1px solid var(--gold-border);white-space:nowrap">${sanitize(label)}</span>
        ${!isPending ? docStatusBadge(status) : ''}
      </div>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${actions}</div>
    ${!isPending && doc.review_notes ? `<div style="margin-top:8px;font-size:11px;color:var(--text-3)">${depOpsFmtDT(doc.reviewed_at)} — ${sanitize(doc.review_notes)}</div>` : ''}
  </div>`;
}

function depOpsViewDoc(filePath) {
  window.bookingDocs.getDownloadUrl(filePath, 300)
    .then(url => window.open(url, '_blank', 'noopener'))
    .catch(err => toast(err.message || 'Could not open document', 'error'));
}

async function depOpsVerifyDoc(docId, kind) {
  try {
    await window.bookingDocs.verifyDocument(docId, null);
    toast('Document verified', 'success');
    if (kind === 'inbound') renderDepOpsInbound(); else renderDepOpsOutward();
    updateDepOpsBadge();
  } catch (e) { toast(e.message || 'Could not verify document', 'error'); }
}

function depOpsRejectDoc(docId, kind) {
  openModal('Reject Document', `
    <div class="fg"><label>Reason (required — shown to the uploader)</label>
    <textarea id="depopsRejectNote" rows="3" placeholder="e.g. Scan is illegible, wrong container number…"></textarea></div>
    <button class="submit-btn" onclick="depOpsConfirmReject('${docId}','${kind}')">Confirm Reject</button>
  `);
}

async function depOpsConfirmReject(docId, kind) {
  const noteEl = document.getElementById('depopsRejectNote');
  const note = (noteEl && noteEl.value || '').trim();
  if (!note) { toast('A reason is required', 'error'); return; }
  try {
    await window.bookingDocs.rejectDocument(docId, note);
    closeModal();
    toast('Document rejected', 'warning');
    if (kind === 'inbound') renderDepOpsInbound(); else renderDepOpsOutward();
    updateDepOpsBadge();
  } catch (e) { toast(e.message || 'Could not reject document', 'error'); }
}
>>>>>>> 98e3300cb5d4878765c6b8f6bb191307e1dbdcf3
