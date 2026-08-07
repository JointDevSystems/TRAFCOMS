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

function tripToRow(t)  { return { id:t.id, truck_id:t.truckId||null, driver_id:t.driverId||null, container:t.container, container_type:t.ctype, work_type:t.workType, outward_type:t.outwardType||null, origin:t.origin, destination:t.dest, shipping_line_id:t.shippingLine||null, status:t.status, start_time:t.startTime, eta:t.eta, distance:t.distance, priority:t.priority, notes:t.notes, reference:t.ref, container_images:JSON.stringify(t.containerImages||[]), booking_id:t.bookingId||null, storage_zone_id:t.storageZoneId||null, storage_teu:t.storageTeu||null, storage_released:!!t.storageReleased }; }
function tripFromRow(r){ let imgs=[]; try{ imgs = r.container_images ? JSON.parse(r.container_images) : []; }catch(e){ imgs=[]; } return { id:r.id, truckId:r.truck_id, driverId:r.driver_id, container:r.container, ctype:r.container_type, workType:r.work_type, outwardType:r.outward_type||null, origin:r.origin, dest:r.destination, shippingLine:r.shipping_line_id, status:r.status, startTime:r.start_time, eta:r.eta, distance:r.distance, priority:r.priority, notes:r.notes, ref:r.reference, containerImages:imgs, bookingId:r.booking_id||null, storageZoneId:r.storage_zone_id||null, storageTeu:r.storage_teu||null, storageReleased:!!r.storage_released }; }

// The three allowed outward_type values, matching the trips_outward_type_check
// constraint in the DB exactly. Only meaningful when work_type is the
// outward direction ('Depot → Port'); NULL for everything else.
const OUTWARD_TYPES = ['Repatriation to Port', 'Shippers/Export', 'Sale units'];
function isOutwardWorkType(workType) { return workType === 'Depot → Port'; }

function maintToRow(m)  { return { id:m.id, truck_id:m.truckId||null, type:m.type, description:m.desc, priority:m.priority, status:m.status, date:m.date, cost:m.cost, technician:m.tech, resolved_date:m.resolvedDate }; }
function maintFromRow(r){ return { id:r.id, truckId:r.truck_id, type:r.type, desc:r.description, priority:r.priority, status:r.status, date:r.date, cost:r.cost, tech:r.technician, resolvedDate:r.resolved_date }; }

function fuelToRow(f)  { return { id:f.id, truck_id:f.truckId||null, driver_id:f.driverId||null, date:f.date, litres:f.litres, price_per_litre:f.pricePerLitre, station:f.station, odometer:f.odometer, receipt:f.receipt }; }
function fuelFromRow(r){ return { id:r.id, truckId:r.truck_id, driverId:r.driver_id, date:r.date, litres:r.litres, pricePerLitre:r.price_per_litre, station:r.station, odometer:r.odometer, receipt:r.receipt }; }

function lineToRow(l)  { return { id:l.id, code:l.code, name:l.name, contact:l.contact, rate_20ft:l.rate20, rate_40ft:l.rate40, rate_hc:l.rateHC, active:l.active }; }
function lineFromRow(r){ return { id:r.id, code:r.code, name:r.name, contact:r.contact, rate20:r.rate_20ft, rate40:r.rate_40ft, rateHC:r.rate_hc, active:r.active }; }

function shutoutToRow(s)  { return { id:s.id, container:s.container, vessel:s.vessel, voyage:s.voyage, line_id:s.line||null, date:s.date, status:s.status, reason:s.reason, truck_id:s.truckId||null, driver_id:s.driverId||null, notes:s.notes }; }
function shutoutFromRow(r){ return { id:r.id, container:r.container, vessel:r.vessel, voyage:r.voyage, line:r.line_id, date:r.date, status:r.status, reason:r.reason, truckId:r.truck_id, driverId:r.driver_id, notes:r.notes }; }



function icToRow(i)  { return { id:i.id, container:i.container, line_id:i.line||null, date:i.date, type:i.type, truck_id:i.truck||null, driver_id:i.driver||null, condition:i.condition, notes:i.notes, status:i.status, img:i.img||'', eir_number:i.eirNumber||null, vessel:i.vessel||null, voyage:i.voyage||null, bl_number:i.blNumber||null, ctype:i.ctype||null, repairs:JSON.stringify(i.repairs||[]), repair_total:i.repairTotal||0, survey_id:i.surveyId||null, booking_id:i.bookingId||null, truck_reg_text:i.truckRegText||null, driver_name_text:i.driverNameText||null }; }
function icFromRow(r){ let repairs=[]; try{ repairs = r.repairs ? (typeof r.repairs==='string' ? JSON.parse(r.repairs) : r.repairs) : []; }catch(e){ repairs=[]; } return { id:r.id, container:r.container, line:r.line_id, date:r.date, type:r.type, truck:r.truck_id, driver:r.driver_id, condition:r.condition, notes:r.notes, status:r.status, img:r.img||'', eirNumber:r.eir_number||'', vessel:r.vessel||'', voyage:r.voyage||'', blNumber:r.bl_number||'', ctype:r.ctype||'', repairs, repairTotal:r.repair_total||0, surveyId:r.survey_id||null, bookingId:r.booking_id||null, truckRegText:r.truck_reg_text||'', driverNameText:r.driver_name_text||'' }; }

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
    ]);

    if (trucksRes.error) throw trucksRes.error;

    const trucks  = (trucksRes.data || []).map(truckFromRow);
    const drivers = (driversRes.data || []).map(driverFromRow);

    drivers.forEach(d => { if (d.truckId) { const t = trucks.find(x => x.id === d.truckId); if (t) t.driver = d.id; } });

    const trips         = (tripsRes.data || []).map(tripFromRow);
    const maintenance    = (maintRes.data || []).map(maintFromRow);
    const fuel           = (fuelRes.data || []).map(fuelFromRow);
    const shippingLines  = (linesRes.data || []).map(lineFromRow);
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
      ? { backupDate: s.backup_date, mapApiKey: s.map_api_key || '', whatsapp: !!s.whatsapp, mpesa: !!s.mpesa, companyName: s.company_name || 'Gargo Logistics Ltd', invoiceConfig: s.invoice_config || null,
          wialonEnabled: !!s.wialon_enabled, wialonToken: s.wialon_token || '', wialonHost: s.wialon_host || 'https://hst-api.wialon.com', wialonLastSync: s.wialon_last_sync || null, wialonLastResult: s.wialon_last_result || '' }
      : { backupDate: null, mapApiKey: '', whatsapp: true, mpesa: false, companyName: 'Gargo Logistics Ltd', invoiceConfig: null,
          wialonEnabled: false, wialonToken: '', wialonHost: 'https://hst-api.wialon.com', wialonLastSync: null, wialonLastResult: '' };

  
    const profiles = (profilesRes.data || []).map(p => ({
      id: p.id, name: p.name, username: p.username, email: p.email,
      role: p.role, active: p.active,
      created: p.created_at || p.created || new Date().toISOString(),
      lastLogin: p.last_login || null,
    }));

    return {
      trucks, drivers, trips, maintenance, fuel, shippingLines, shutouts,
      interchange, requisitions, workshop, invoices, billingRates,
      allocationRules, trackingPositions, auditLog, settings, profiles,
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
    failures.push(await upsertRows('trips',          db.trips.map(tripToRow)));
    failures.push(await upsertRows('maintenance',    db.maintenance.map(maintToRow)));
    failures.push(await upsertRows('fuel_logs',      db.fuel.map(fuelToRow)));
    failures.push(await upsertRows('shutouts',       db.shutouts.map(shutoutToRow)));
    failures.push(await upsertRows('interchange',    db.interchange.map(icToRow)));
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
        // wialon_last_sync / wialon_last_result are NOT written here — the
        // wialon-sync edge function owns those, and this generic save runs
        // far more often (any admin edit anywhere) than a Wialon config
        // change, so writing stale cached values would clobber the real
        // last-sync breadcrumb.
        wialon_enabled: !!db.settings.wialonEnabled,
        wialon_token: db.settings.wialonToken || null,
        wialon_host: db.settings.wialonHost || 'https://hst-api.wialon.com',
      };
      let { error } = await supabase.from('app_settings').upsert(settingsRow, { onConflict: 'id' });
      if (error && /invoice_config/i.test(error.message || '')) {
        // invoice_config column not migrated yet on this Supabase project — retry without it
        // so the rest of settings still save. Run the migration in the docs to persist invoicing config.
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

/* Finance/Settings PIN vault removed — access to Settings, Admin, Finance
   and Invoicing sections is now gated purely by admin role (see isAdmin()). */


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
  // Children before parents.
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
      wialonHost: 'https://hst-api.wialon.com',
      wialonLastSync: null,
      wialonLastResult: ''
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
function initials(name) { if(!name)return '?'; return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function fuelColour(pct) { if(pct >60)return 'var(--green)'; if(pct >30)return 'var(--amber)'; return 'var(--red)'; }
function isAdmin() { return state.profile?.role === 'admin'; }
function isDriver() { return state.profile?.role === 'driver'; }
function isClerk() { return state.profile?.role === 'clerk'; }
function isDispatch() { return state.profile?.role === 'dispatch'; }
function currentRole() { return state.profile?.role || 'viewer'; }


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
  admin:    ['dashboard','trucks','drivers','trips','dispatch','publicbookings','depops','maintenance','fuel','shutout','interchange','shippinglines','requisitions','workshop'],
  clerk:    ['trucks','drivers','trips','dispatch','publicbookings','depops','shutout','interchange'],
  dispatch: ['trucks','drivers','trips','dispatch','publicbookings','depops','shutout','interchange','fuel'],
  ops:      ['trucks','drivers','trips','dispatch','publicbookings','depops','maintenance','fuel','shutout','interchange','shippinglines','requisitions','workshop'],
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
function allowedSidebarSections() { return isAdmin() ? ROLE_SIDEBAR.admin : (ROLE_SIDEBAR[currentRole()] || []); }
function allowedAdminRailSections() { return isAdmin() ? ROLE_ADMINRAIL.admin : (ROLE_ADMINRAIL[currentRole()] || []); }
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
  addAudit(state.profile?.username || 'system', 'Logout', auditDetail);
  await supabase.auth.signOut();
  state.currentUser = null;
  state.profile = null;
  clearIdleTimer();
  document.getElementById('shell').style.display = 'none';
  const dp = document.getElementById('driverPortal');
  if (dp) dp.style.display = 'none';
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
  set('badge-allocation',   awaitingDispatchTrips().length);
  set('badge-maintenance',  db.maintenance.filter(m=>m.status==='open').length);
  set('badge-shutout',      db.shutouts.filter(s=>s.status==='open').length);
  set('badge-interchange',  db.interchange.filter(i=>i.status==='pending').length);
  set('badge-requisitions', db.requisitions.filter(r=>r.status==='pending').length);
  set('badge-invoices',     db.invoices.filter(i=>i.status==='overdue').length);
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
  publicbookings: ['Operations', 'Public Bookings'],
  depops: ['Operations', 'DepOps'],
  maintenance:['Operations','Maintenance Log'], fuel:['Operations','Fuel Log'],
  shutout:['Container Ops','Shutout'], interchange:['Container Ops','Interchange'],
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
  document.querySelectorAll('.nav-item, .admin-nav-item').forEach(n=>n.classList.remove('active'));
  const el=document.getElementById(`sec-${sec}`);
  if(el) el.classList.add('active');
  if(btn) btn.classList.add('active');
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
  document.querySelectorAll('.nav-item, .admin-nav-item').forEach(n=>n.classList.remove('active'));
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
}

function renderSection(sec) {
  const fn=sectionRenderers[sec];
  if(fn) fn();
}

const sectionRenderers = {
  dashboard:renderDashboard, trucks:()=>renderTrucks('all'), drivers:()=>renderDrivers('all'),
  trips:()=>renderTrips('active'), dispatch:renderDispatch, maintenance:()=>renderMaint('all'),
  fuel:renderFuel, shutout:()=>renderShutout('all'), interchange:()=>renderInterchange('all'),
  shippinglines:()=>renderLines('all'), requisitions:()=>renderRequisitions('all'),
  workshop:()=>renderWorkshop('all'), invoicing:()=>renderInvoicing('all'),
  allocation:()=>renderAllocation('auto'), workanalysis:()=>renderWorkAnalysis('all'),
  reports:()=>renderReport('overview'), tripreports:trcInit, livetracking:initTrackingSection,
  usermgmt:renderUserMgmt, settings:renderSettings,
  publicbookings: renderPublicBookings,
  depops: renderDepOps,
};

function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }


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
  openModal(`Truck — ${t.reg}`, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Registration</label><div class="mono" style="padding:8px;background:var(--surface);border-radius:5px;color:var(--gold)">${t.reg}</div></div><div class="fg" style="margin:0"><label>Status</label><div style="padding:6px 0">${sbadge(t.status)}</div></div><div class="fg" style="margin:0"><label>Make / Model</label><div style="font-size:12px;color:var(--text)">${t.make}</div></div><div class="fg" style="margin:0"><label>Year</label><div style="font-size:12px;color:var(--text)">${t.year}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.type}</div></div><div class="fg" style="margin:0"><label>Colour</label><div style="font-size:12px;color:var(--text)">${t.colour}</div></div><div class="fg" style="margin:0"><label>Odometer</label><div style="font-size:12px;color:var(--text)">${fmt(t.mileage)} km</div></div><div class="fg" style="margin:0"><label>Fuel</label><div><div style="font-size:12px;color:${fuelColour(t.fuelPct)};font-weight:700">${t.fuelPct}%</div><div class="fuel-bar" style="margin-top:4px"><div class="fuel-fill" style="width:${t.fuelPct}%;background:${fuelColour(t.fuelPct)}"></div></div></div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Assigned Driver</label><div style="font-size:12px;color:var(--text)">${t.driver ? driverName(t.driver) : 'Unassigned'}</div></div></div><div style="margin-bottom:10px"><div class="fg" style="margin:0"><label>Last Service</label><div style="font-size:12px;color:var(--text)">${fmtDate(t.lastService)}</div></div></div><div style="margin-bottom:14px"><div class="fg" style="margin:0"><label>Next Service Due</label><div style="font-size:12px;color:${new Date(t.nextService) < Date.now()?'var(--red)':'var(--text)'}">${fmtDate(t.nextService)}</div></div></div>${t.notes?`<div class="ops-notice" style="margin-bottom:14px">${t.notes}</div>`:''}<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:6px">Recent Trips (${trips.length})</div>${trips.length ? trips.map(tr=>`<div class="activity-row"><div style="flex:1;font-size:11px;color:var(--text-2)">${tr.origin} → ${tr.dest} · ${tr.container}</div>${sbadge(tr.status)}<div class="act-time">${fmtDate(tr.startTime)}</div></div>`).join('') : '<div style="color:var(--text-3);font-size:11px;padding:8px 0">No trips recorded</div>'}${isAdmin() ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Admin — Status Override</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['available','on_trip','maintenance','breakdown','off_duty'].map(s=>`<button class="filter-btn${t.status===s?' active':''}" onclick="quickSetTruckStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('')}</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="action-btn ghost" onclick="triggerImageUpload('trucks','${id}','img',()=>showTruckDetail('${id}'))">📷 Upload Truck Photo</button></div><div style="margin-top:14px"><label style="font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;font-family:var(--font-mono)">GPS Source — Wialon Unit ID</label><div style="font-size:9.5px;color:var(--text-3);margin:4px 0 6px;line-height:1.5">Leave blank to track this truck via the driver's phone. Set a Wialon avl_unit ID to switch this truck to hardware GPS — the phone will automatically stand down while that feed is live and take back over if it goes quiet.</div><div style="display:flex;gap:6px"><input id="td_wialon_${id}" value="${esc(t.wialonUnitId||'')}" placeholder="e.g. 24681012" style="flex:1;background:var(--surface-2);border:1px solid var(--border);color:var(--text);padding:7px;border-radius:5px;font-size:12px"/><button class="tbl-btn" onclick="updateTruckWialonId('${id}')">Save</button></div></div>${adminDeleteBtn('trucks', id)}</div>`: ''}`);
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

function updateTruckWialonId(id) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const t = state.db.trucks.find(t=>t.id===id);
  if (!t) return;
  const input = document.getElementById(`td_wialon_${id}`);
  const val = sanitize((input?.value || '').trim());
  const prev = t.wialonUnitId || '';
  if (val === prev) { toast('No change', 'info', 1200); return; }
  t.wialonUnitId = val;
  scheduleSave();
  addAudit(state.profile.username, 'Wialon Unit Assigned', val ? `${t.reg} → Wialon unit ${val}` : `${t.reg} → GPS unit unassigned (back to driver phone)`);
  toast(val ? `${t.reg} now tracked via Wialon unit ${val}` : `${t.reg} reverted to driver-phone tracking`, 'success');
  if (state.currentSection === 'livetracking') { renderTracking(); }
}

function showAddTruckModal() {
  openModal('Add New Truck', `<div class="form-row-2"><div class="fg"><label>Registration</label><input id="nt_reg" placeholder="KDA 000A"/></div><div class="fg"><label>Make / Model</label><input id="nt_make" placeholder="ISUZU FVZ"/></div></div><div class="form-row-2"><div class="fg"><label>Type</label><select id="nt_type"><option>Prime Mover</option><option>Flatbed</option><option>Tipper</option><option>Tanker</option><option>Lowbed</option></select></div><div class="fg"><label>Year</label><input id="nt_year" type="number" placeholder="${new Date().getFullYear()}"/></div></div><div class="form-row-2"><div class="fg"><label>Colour</label><input id="nt_colour" placeholder="White"/></div><div class="fg"><label>Fuel Level %</label><input id="nt_fuel" type="number" placeholder="100" min="0" max="100"/></div></div><div class="fg"><label>Odometer (km)</label><input id="nt_odo" type="number" placeholder="0"/></div><div class="fg"><label>Wialon Unit ID <span style="color:var(--text-3);font-weight:400">(optional — leave blank to track via driver phone)</span></label><input id="nt_wialon" placeholder="e.g. 24681012"/></div><div class="fg"><label>Notes</label><textarea id="nt_notes" rows="2" placeholder="Any notes…"></textarea></div><button class="submit-btn" onclick="saveTruck()">Add Truck →</button>`);
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
    wialonUnitId: sanitize(document.getElementById('nt_wialon')?.value.trim() || ''),
  };
  state.db.trucks.push(t);
  scheduleSave();
  addAudit(state.profile.username, 'Truck Added', `${reg} — ${make}`);
  buildBadges();
  closeModal();
  renderTrucks('all');
  toast(`${reg} added to fleet`, 'success');
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
  if(f!=='all') trips=trips.filter(t=>t.status===f);
  const el=document.getElementById('tripsList');
  if(!el) return;
  el.innerHTML=trips.map(t=>`<div class="trip-card status-${t.status}" onclick="showTripDetail('${t.id}')"><div class="trip-card-head"><div class="trip-route">${t.origin}<span class="arrow">→</span>${t.dest}</div>${sbadge(t.status)}</div><div class="trip-meta"><span>🚛 ${truckName(t.truckId)}</span><span>👤 ${driverName(t.driverId)}</span><span class="mono" style="font-size:10.5px;color:var(--gold)">${t.container}</span><span>${t.ctype} · ${t.workType}${t.outwardType ? ' · ' + sanitize(t.outwardType) : ''}</span><span>🕐 Started ${timeAgo(t.startTime)} · ETA ${fmtTime(t.eta)}</span><span>${t.distance}km · ${sbadge(t.priority.toLowerCase())}</span></div></div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-label">No trips in this filter</div></div>';
}

function showTripDetail(id) {
  const t = state.db.trips.find(t=>t.id===id);
  if (!t) return;
  const line = state.db.shippingLines.find(l=>l.id===t.shippingLine);
  const needsDispatch = isTripLive(t) && (!t.truckId || !t.driverId);
  const gallery = Array.isArray(t.containerImages) && t.containerImages.length
    ? `<div style="margin-bottom:14px"><div class="fg" style="margin:0 0 6px"><label>Container Photos (${t.containerImages.length})</label></div><div class="container-img-grid">${t.containerImages.map(src=>`<div class="container-img-thumb view-only"><img src="${src}" onclick="window.open('${src}','_blank')" /></div>`).join('')}</div></div>`
    : '';
  openModal(`Trip — ${t.container}`, `${needsDispatch ? `<div class="ops-notice" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>This trip is awaiting a truck/driver assignment.</span><button class="modal-btn primary" onclick="closeModal();jumpToCompleteDispatch('${t.id}')">Complete in Dispatch →</button></div>` : ''}${gallery}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Container</label><div class="mono" style="color:var(--gold);font-size:13px">${t.container}</div></div><div class="fg" style="margin:0"><label>Type</label><div style="font-size:12px;color:var(--text)">${t.ctype}</div></div><div class="fg" style="margin:0"><label>Truck</label><div style="font-size:12px;color:var(--text)">${truckName(t.truckId)}</div></div><div class="fg" style="margin:0"><label>Driver</label><div style="font-size:12px;color:var(--text)">${driverName(t.driverId)}</div></div><div class="fg" style="margin:0"><label>Origin</label><div style="font-size:12px;color:var(--text)">${t.origin}</div></div><div class="fg" style="margin:0"><label>Destination</label><div style="font-size:12px;color:var(--text)">${t.dest}</div></div><div class="fg" style="margin:0"><label>Work Type</label><div style="font-size:12px;color:var(--text)">${t.workType}</div></div>${t.outwardType ? `<div class="fg" style="margin:0"><label>Outward Type</label><div style="font-size:12px;color:var(--gold)">${sanitize(t.outwardType)}</div></div>` : ''}<div class="fg" style="margin:0"><label>Distance</label><div style="font-size:12px;color:var(--text)">${t.distance} km</div></div><div class="fg" style="margin:0"><label>Started</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.startTime)}</div></div><div class="fg" style="margin:0"><label>ETA</label><div style="font-size:12px;color:var(--text)">${fmtTime(t.eta)}</div></div><div class="fg" style="margin:0"><label>Shipping Line</label><div style="font-size:12px;color:var(--text)">${line?line.name:'—'}</div></div><div class="fg" style="margin:0"><label>Priority</label><div>${sbadge(t.priority.toLowerCase())}</div></div><div class="fg" style="margin:0"><label>Reference</label><div class="mono" style="font-size:11px;color:var(--text-2)">${t.ref}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(t.status)}</div></div></div>${t.notes?`<div class="ops-notice">${t.notes}</div>`:''}${canUpdateTripStatus(t)?`<div style="padding-top:12px;border-top:1px solid var(--border);margin-top:10px"><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Trip Step Update ${t.status==='completed'?'— trip complete, no further changes':'(forward only)'}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${nextTripStatuses(t.status).length ? nextTripStatuses(t.status).map(s=>`<button class="filter-btn" onclick="quickSetTripStatus('${id}','${s}')">${s.replace('_',' ')}</button>`).join('') : '<span style="font-size:11px;color:var(--text-3)">No further status changes available</span>'}</div>${isAdmin()?adminDeleteBtn('trips', id):''}</div>`:''}`);
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
  return !!(driver && driver.truckId && driver.status !== 'off_duty' && driver.status !== 'suspended');
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
      // Only clear a phone-sourced fix. If this truck has hardware GPS
      // reporting via Wialon, that position is independent of driver duty
      // status and shouldn't disappear just because the driver went off
      // duty on their phone.
      const existing = state.db.trackingPositions[driver.truckId];
      if (!existing || existing.source !== 'wialon') {
        const { error } = await supabase.from('tracking_positions').delete().eq('truck_id', driver.truckId);
        if (error) console.error('tracking_positions clear failed:', error.message);
        delete state.db.trackingPositions[driver.truckId];
      }
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

// A truck fitted with a Wialon GPS unit is polled server-side every minute
// (see the wialon-sync edge function + cron job) independent of whether
// anyone has this page open. If that feed is currently fresh, the phone
// doesn't need to fight it for the single tracking_positions row — but if
// the hardware unit ever goes quiet (power loss, out of coverage, unit
// removed), the phone automatically takes back over. Trucks with no Wialon
// unit assigned are unaffected and always tracked by phone, exactly as
// before.
const WIALON_STALE_MS = 3 * 60 * 1000; // 3 missed cron cycles

async function onDriverPosition(pos) {
  const now = Date.now();
  if (now - state.lastGeoSend < GEO_PING_INTERVAL_MS) return; // throttle
  state.lastGeoSend = now;

  const driver = myDriverRecord();
  if (!driverShouldTrack(driver)) { stopDriverTracking(); return; }

  const truck = driver.truckId ? state.db.trucks.find(t => t.id === driver.truckId) : null;
  if (truck?.wialonUnitId) {
    const existing = state.db.trackingPositions[driver.truckId];
    const wialonFresh = existing?.source === 'wialon' && existing.lastUpdate
      && (now - new Date(existing.lastUpdate).getTime() < WIALON_STALE_MS);
    if (wialonFresh) {
      // Hardware GPS is reporting fine — leave it as the source of truth.
      state.trackingActive = true;
      renderDutyBar();
      return;
    }
  }

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
  document.getElementById('d_ctype').value    = t.ctype || '20ft Dry';
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
  ['d_truck','d_driver','d_container','d_origin','d_dest','d_distance','d_ref','d_notes'].forEach(id=>{ const el=document.getElementById(id); if (el) el.value=''; });
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

  if (!truck || !driver || !cont || !origin || !dest) {
    toast('Fill in all required fields', 'error');
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
  const dupTruck = state.db.trucks.find(tr=>tr.id===truck);
  if (dupTruck && dupTruck.status !== 'available') {
    toast(`${dupTruck.reg} is no longer available (status: ${dupTruck.status.replace('_',' ')}). Refresh and pick another truck.`, 'error');
    return;
  }
  const dupDriver = state.db.drivers.find(d=>d.id===driver);
  if (dupDriver && dupDriver.status !== 'available') {
    toast(`${dupDriver.name} is no longer available (status: ${dupDriver.status.replace('_',' ')}). Refresh and pick another driver.`, 'error');
    return;
  }
  const ctype    = document.getElementById('d_ctype').value;
  const workType = document.getElementById('d_worktype').value;
  const line     = document.getElementById('d_line').value;
  const priority = document.getElementById('d_priority').value;
  const ref      = document.getElementById('d_ref').value.trim() || `REF-${Date.now().toString().slice(-6)}`;
  const notes    = sanitize(document.getElementById('d_notes').value.trim());
  const images   = [..._dispatchContainerImages];
  const outwardTypeSel = document.getElementById('d_outwardtype');
  const outwardType = isOutwardWorkType(workType) ? (outwardTypeSel ? outwardTypeSel.value : '') : null;
  if (isOutwardWorkType(workType) && !OUTWARD_TYPES.includes(outwardType)) {
    toast('Select an outward type — Repatriation to Port, Shippers/Export, or Sale units', 'error');
    return;
  }

  if (editingId) {

    const t = state.db.trips.find(tr=>tr.id===editingId);
    if (!t) { toast('That trip no longer exists — it may have been removed.', 'error'); cancelDispatchEdit(); return; }

    // Depot -> Port containers can't be dispatched without a verified
    // release order on file for this trip — enforced here so it can't be
    // bypassed by completing dispatch straight from the Dispatch Console.
    if (workType === 'Depot → Port') {
      try {
        const docs = await window.bookingDocs.documentsForTrip(t.id);
        const hasVerifiedRelease = docs.some(d => d.doc_type === 'release_order' && d.status === 'verified');
        if (!hasVerifiedRelease) {
          toast('A verified release order is required before this container can be dispatched to port. Upload it from DepOps → Outward / Repatriation.', 'error', 6000);
          return;
        }
      } catch (e) {
        toast(`Could not confirm release order status (${(e && e.message) || 'error'}) — dispatch blocked until this can be checked.`, 'error', 6000);
        return;
      }
    }

    Object.assign(t, { truckId: truck, driverId: driver, container: cont, ctype, workType, outwardType, origin, dest, shippingLine: line, distance: dist, priority, notes, ref, containerImages: images });
    const tk = state.db.trucks.find(tr=>tr.id===truck);
    const dv = state.db.drivers.find(d=>d.id===driver);
    if (tk) tk.status = 'on_trip';
    if (dv) { dv.status='on_trip'; dv.load=cont; dv.truckId=truck; }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, 'Dispatch Completed', `${cont} — ${origin} → ${dest}`);
    toast(`Dispatch completed — ${cont}`, 'success');
    _dispatchEditingTripId = null;
    const banner = document.getElementById('dispatchEditBanner');
    if (banner) banner.style.display = 'none';
    const btn = document.getElementById('dispatchSubmitBtn');
    if (btn) btn.textContent = 'Create Dispatch Order →';
  } else {
    const etaMs = Date.now() + (dist/35)*3600000;
    const trip = {
      id: uid('TRIP'), truckId: truck, driverId: driver, container: cont,
      ctype, workType, outwardType, origin, dest, shippingLine: line,
      status: 'active', startTime: new Date().toISOString(),
      eta: new Date(etaMs).toISOString(), distance: dist, priority, notes, ref,
      containerImages: images,
    };
    state.db.trips.push(trip);
    const t = state.db.trucks.find(t=>t.id===truck);
    const d = state.db.drivers.find(d=>d.id===driver);
    if (t) t.status = 'on_trip';
    if (d) { d.status='on_trip'; d.load=cont; d.truckId=truck; }
    scheduleSave();
    buildBadges();
    addAudit(state.profile.username, 'Dispatch Created', `${cont} — ${origin} → ${dest}`);
    toast(`Dispatch created — ${cont}`, 'success');
  }

  clearContainerImgs();
  ['d_truck','d_driver','d_container','d_origin','d_dest','d_distance','d_ref','d_notes'].forEach(id=>{ const el=document.getElementById(id); if (el) el.value=''; });
  const outwardTypeResetSel = document.getElementById('d_outwardtype');
  if (outwardTypeResetSel) outwardTypeResetSel.value = '';
  toggleDispatchOutwardType();
  renderDispatch();
  refreshAwaitingDispatchUI();
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

function processBulkFile(file) {
  if (file.size > 5*1024*1024) { toast('File too large. Max 5MB.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rows = [];
      if (file.name.endsWith('.json')) {
        rows = JSON.parse(e.target.result);
      } else {
        const lines = e.target.result.split('\n').filter(l=>l.trim());
        const headers = lines[0].split(',').map(h=>h.trim());
        rows = lines.slice(1).map(l=>{ const vals=l.split(','); return Object.fromEntries(headers.map((h,i)=>[h,vals[i]?.trim()])); });
      }
      showBulkPreview(rows);
    } catch(err) { toast('Could not parse file — check format', 'error'); }
  };
  reader.readAsText(file);
}

function showBulkPreview(rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const tbl  = document.getElementById('bulkPreviewTable');
  tbl.querySelector('thead').innerHTML = `<tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>`;
  tbl.querySelector('tbody').innerHTML = rows.slice(0,10).map(r=>`<tr>${keys.map(k=>`<td>${r[k]||''}</td>`).join('')}</tr>`).join('');
  document.getElementById('bulkRowCount').textContent = `${rows.length} rows`;
  document.getElementById('bulkDispatchPreview').style.display = 'block';
  document.getElementById('bulkDispatchPreview').dataset.rows = JSON.stringify(rows);
}

function processBulkDispatch() {
  const rows = JSON.parse(document.getElementById('bulkDispatchPreview').dataset.rows||'[]');
  let created = 0;
  const skipped = [];
  const seenInBatch = new Set();
  const busyTrucks  = new Set(); 
  const busyDrivers = new Set();

  rows.forEach((r, idx)=>{
    const rowLabel = r.container ? r.container : `row ${idx+1}`;
    if (!r.container) { skipped.push(`${rowLabel}: missing container number`); return; }
    const cont = r.container.trim().toUpperCase();
    const contIssue = containerFormatIssue(cont);
    if (contIssue) { skipped.push(`${cont}: ${contIssue}`); return; }
    if (seenInBatch.has(cont)) { skipped.push(`${cont}: duplicate container within this file`); return; }
    const dupTrip = findLiveTripByContainer(cont);
    if (dupTrip) { skipped.push(`${cont}: already on an active trip`); return; }

    const truck  = state.db.trucks.find(t=>t.reg===r.truck||t.id===r.truck);
    const driver = state.db.drivers.find(d=>d.name===r.driver||d.id===r.driver);
    if (truck && (truck.status !== 'available' || busyTrucks.has(truck.id))) { skipped.push(`${cont}: truck ${truck.reg} unavailable or already used in this batch`); return; }
    if (driver && (driver.status !== 'available' || busyDrivers.has(driver.id))) { skipped.push(`${cont}: driver ${driver.name} unavailable or already used in this batch`); return; }

    seenInBatch.add(cont);
    if (truck)  busyTrucks.add(truck.id);
    if (driver) busyDrivers.add(driver.id);

    const trip = {
      id: uid('TRIP'), container: cont,
      truckId: truck?.id||'', driverId: driver?.id||'',
      ctype: r.ctype||'20ft Dry', workType: r.workType||'Port → Depot',
      origin: r.origin||'', dest: r.dest||'', distance: parseInt(r.distance)||0,
      shippingLine:'', priority:'Normal', notes:'Bulk import',
      ref: `BULK-${Date.now()}-${created}`,
      status:'active', startTime:new Date().toISOString(), eta:new Date(Date.now()+4*3600000).toISOString(),
    };
    state.db.trips.push(trip);
    if (truck)  truck.status  = 'on_trip';
    if (driver) { driver.status='on_trip'; driver.load=cont; }
    created++;
  });
  scheduleSave(); buildBadges();
  addAudit(state.profile.username, 'Bulk Dispatch', `${created} dispatches imported${skipped.length?`, ${skipped.length} skipped`:''}`);
  if (skipped.length) {
    toast(`${created} created, ${skipped.length} skipped — see details`, skipped.length && !created ? 'error' : 'warning', 6000);
    openModal('Bulk Dispatch Result', `<div style="margin-bottom:10px;font-size:12px;color:var(--text)">${created} dispatch(es) created successfully.</div><div style="font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Skipped Rows (${skipped.length})</div><div style="max-height:240px;overflow-y:auto">${skipped.map(s=>`<div class="ops-notice" style="margin-bottom:6px">${s}</div>`).join('')}</div>`);
  } else {
    toast(`${created} dispatches created`, 'success');
  }
  refreshAwaitingDispatchUI();
  document.getElementById('bulkDispatchPreview').style.display = 'none';
  renderDispatchQueue();
}

function downloadBulkTemplate() {
  const csv = 'container,truck,driver,origin,destination,ctype,workType,distance\nMSCU1234566,KDA 001A,James Otieno,Kilindini Port,Shimanzi ICD,40ft Dry,Port → Depot,18';
  const a   = document.createElement('a');
  a.href     = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = 'gargo_bulk_template.csv';
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
  el.innerHTML=items.map(s=>`<div class="shutout-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><div class="mono" style="font-size:13px;color:var(--gold)">${s.container}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${s.vessel} · Voyage ${s.voyage}</div></div>${sbadge(s.status)}</div><div style="font-size:11.5px;color:var(--text-2);margin-bottom:6px">Reason: ${s.reason}</div><div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--text-3)"><span>${fmtDate(s.date)}</span><span>${truckName(s.truckId)}</span></div>${s.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:6px;font-style:italic">${s.notes}</div>`:''}${isAdmin()?`<button class="modal-btn danger" style="margin-top:8px" onclick="confirmDeleteRecord('shutouts','${s.id}')">🗑 Delete</button>`:''}</div>`).join('')||'<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-label">No shutout records</div></div>';
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
  let items=f==='all'?state.db.interchange:state.db.interchange.filter(i=>i.status===f);
  const el=document.getElementById('interchangeList');
  if(!el) return;
  el.innerHTML=items.map(ic=>{
    const meta = [ic.eirNumber ? `EIR ${ic.eirNumber}` : null, (ic.vessel || ic.voyage) ? `${ic.vessel||'—'} / ${ic.voyage||'—'}` : null].filter(Boolean).join(' · ');
    const repairBadge = (ic.repairs && ic.repairs.length) ? `<div style="font-size:10.5px;color:var(--red);margin-top:2px">${ic.repairs.length} damage item${ic.repairs.length>1?'s':''} · KSh ${Number(ic.repairTotal||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>` : '';
    return `<div class="ic-card"><div class="ic-card-img-placeholder" style="cursor:pointer;position:relative;overflow:hidden" onclick="triggerImageUpload('interchange','${ic.id}','img',()=>renderInterchange('${f}'))" title="Upload container photo">${ic.img?`<img src="${ic.img}" style="width:100%;height:100%;object-fit:cover" />`:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="mono" style="font-size:13px;color:var(--gold)">${ic.container}</div>${sbadge(ic.status)}</div><div style="font-size:11.5px;color:var(--text-2)">${ic.type} · ${lineName(ic.line)} · ${ic.condition}${ic.ctype ? ' · ' + ic.ctype : ''}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-3);margin-top:4px">${ic.truck ? truckName(ic.truck) : (ic.truckRegText || '—')} · ${ic.driver ? driverName(ic.driver) : (ic.driverNameText || '—')} · ${fmtDate(ic.date)}</div>${meta?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${meta}</div>`:''}${repairBadge}${ic.notes?`<div style="font-size:10.5px;color:var(--text-3);margin-top:4px">${ic.notes}</div>`:''}</div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">${isAdmin() && ic.status==='pending'?`<button class="modal-btn success" onclick="approveInterchange('${ic.id}')">Approve</button>`:''}<button class="modal-btn ghost" onclick="downloadInterchangeSlip('${ic.id}')">⬇ Download</button>${ic.surveyId?`<button class="modal-btn ghost" onclick="downloadInspectionReport('${ic.surveyId}')">⬇ Inspection Report</button>`:''}${(ic.surveyId || ic.img)?`<button class="modal-btn ghost" onclick="showContainerPhotos('${ic.id}')">📷 Photos</button>`:''}${isAdmin()?`<button class="modal-btn danger" onclick="confirmDeleteRecord('interchange','${ic.id}')">🗑 Delete</button>`:''}</div></div>`;
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
  const headers = ['Date', 'Container', 'EIR No.', 'Type', 'Container Type', 'Shipping Line', 'Vessel', 'Voyage', 'Condition', 'Truck', 'Driver', 'Repair Items', 'Repair Total', 'Status', 'Notes'];
  const rows = items.map(ic => [
    ic.date, ic.container, ic.eirNumber, ic.type, ic.ctype, lineName(ic.line), ic.vessel, ic.voyage, ic.condition, truckName(ic.truck), driverName(ic.driver),
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

function approveInterchange(id) {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  const ic = state.db.interchange.find(i=>i.id===id);
  if (!ic) return;
  ic.status='approved';
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
  const dupIc = state.db.interchange.find(i=>(i.container||'').toUpperCase()===cont && i.type===document.getElementById('ic_type').value && new Date(i.date).toDateString()===new Date().toDateString());
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
  const summary=document.getElementById('linesSummary');
  if(summary){
    summary.innerHTML=`<div class="panel"><div class="panel-head"><span class="panel-title">Summary</span></div><div class="fuel-summary-row"><span class="fsr-label">Total Lines</span><span class="fsr-val">${state.db.shippingLines.length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Active</span><span class="fsr-val">${state.db.shippingLines.filter(l=>l.active).length}</span></div><div class="fuel-summary-row"><span class="fsr-label">Trips (all)</span><span class="fsr-val">${state.db.trips.length}</span></div></div>`;
  }
  const grid=document.getElementById('linesGrid');
  if(!grid) return;
  grid.innerHTML=lines.map(l=>`<div class="line-card"><div class="line-code-badge">${l.code}</div><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${l.name}</div><div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${l.contact}</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><div class="ts">KSh ${fmt(l.rate20)}<b>20ft Rate</b></div><div class="ts">KSh ${fmt(l.rate40)}<b>40ft Rate</b></div><div class="ts">KSh ${fmt(l.rateHC)}<b>HC Rate</b></div></div><div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">${sbadge(l.active?'active':'off_duty')}${isAdmin()?`<button class="tbl-btn" style="color:var(--red)" onclick="confirmDeleteRecord('shippingLines','${l.id}')">🗑 Delete</button>`:''}</div></div>`).join('')||'<div class="empty-state"><div class="empty-state-label">No shipping lines</div></div>';
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
    trcSetPeriod('hourly', document.querySelector('#trcTab-trips .trc-period-row .filter-btn'));
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
  if (period === 'hourly')       from = new Date(now.getTime() - 3600000);
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

function trackingSourceLabel(p) {
  if (!p) return '';
  return p.source === 'wialon' ? '📡 Live — Wialon GPS' : '📱 Live — Driver Phone';
}

function renderTracking() {
  const pos = state.db.trackingPositions || {};
  // Trucks worth showing: normal on-the-road statuses, PLUS any truck
  // fitted with a Wialon unit — hardware GPS reports on its own schedule
  // regardless of duty status, so it's still useful to see e.g. a truck
  // sitting in the yard or flagged for maintenance.
  const activeTrucks = state.db.trucks.filter(t => TRACKABLE_TRUCK_STATUSES.includes(t.status) || t.wialonUnitId);
  const liveCount = activeTrucks.filter(t => pos[t.id]).length;
  const wialonCount = activeTrucks.filter(t => pos[t.id]?.source === 'wialon').length;
  document.getElementById('trackingMeta').textContent =
    `${activeTrucks.length} vehicle${activeTrucks.length===1?'':'s'} tracked · ${liveCount} reporting live${wialonCount ? ` (${wialonCount} via Wialon GPS)` : ''}`;

  const vehicles = document.getElementById('trackingVehicles');
  if (vehicles) {
    // Show every truck that should be on the road, not just the ones that
    // happen to have a fresh GPS ping — a truck with no signal is exactly
    // the thing dispatch needs to notice, not something to hide.
    vehicles.innerHTML = activeTrucks.map(t=>{
      const p = pos[t.id];
      const dr = state.db.drivers.find(d=>d.truckId===t.id);
      const hasFix = !!p;
      const noSignalMsg = t.wialonUnitId
        ? 'No GPS fix yet — check the Wialon unit is powered and reporting'
        : 'No phone signal — driver may be off duty or offline';
      const srcTag = hasFix
        ? `<span style="color:var(--green,#3ecf6e)">● ${trackingSourceLabel(p)} · ${timeAgo(p.lastUpdate)}</span>`
        : `<span style="color:var(--text-3)">${noSignalMsg}</span>`;
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
      const srcIcon = p.source === 'wialon' ? '📡' : '📱';
      return `<div class="movement-row" onclick="focusTruckOnMap('${id}')"><div class="mono" style="font-size:10px;color:var(--gold)">${srcIcon} ${t?esc(t.reg):id}</div><div style="font-size:11px;color:var(--text-2)">${esc(p.zone||'')} · ${p.speed>0?p.speed+' km/h':'Stationary'}</div><div style="font-size:9.5px;color:var(--text-3)">${timeAgo(p.lastUpdate)}</div></div>`;
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

// Lightweight, status-derived stand-in for real geofence entry/exit
// detection — no zone/radius math yet, just turns trip status into a
// plausible gate-style feed so dispatch has something actionable to click.
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

// Free, no-API-key street-level imagery via Google's public embed — same
// approach as Jastar. If Google hasn't photographed the exact spot (common
// at depots/private yards), the iframe just stays blank and the "Open in
// Google Maps" link still lets dispatch check the surrounding area.
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
        // Debounced — a bulk import touching many rows triggers one
        // refresh, not one per row.
        clearTimeout(_liveSyncDebounce);
        _liveSyncDebounce = setTimeout(refreshFromServer, 700);
      }
    );
  });
  state._liveSyncChannel = channel.subscribe();
}

async function refreshFromServer() {

  const modalOpen = document.getElementById('modalOverlay')?.classList.contains('active');
  if (modalOpen) { _liveSyncDebounce = setTimeout(refreshFromServer, 1500); return; }

  try {
    const fresh = await loadDB();
    if (fresh) {
      state.db = fresh;
      buildBadges();
      buildAlerts();
      renderSection(state.currentSection);
    }
  } catch (e) {
    console.warn('Live sync refresh failed:', e);
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
    const isWialon = p.source === 'wialon';
    const dotColor = isMoving ? '#3ecf6e' : '#8b8b8b';
    // Wialon-sourced markers get a small gold ring so dispatch can tell
    // hardware-GPS trucks apart from phone-tracked ones at a glance.
    const ringStyle = isWialon ? 'box-shadow:0 0 0 1px rgba(255,255,255,.15),0 0 0 3px rgba(201,162,39,.55)' : 'box-shadow:0 0 0 1px rgba(255,255,255,.15)';
    const srcIcon = isWialon ? '📡' : '📱';
    const icon = L.divIcon({
      className: 'truck-marker',
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:14px;height:14px;border-radius:50%;background:${dotColor};border:2px solid #0b0b0b;${ringStyle}"></div><div style="font-size:9px;font-weight:700;color:#fff;background:rgba(11,11,11,.75);padding:1px 5px;border-radius:3px;white-space:nowrap">${srcIcon} ${label}</div></div>`,
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
        marker.setPopupContent(`<div style="font-family:sans-serif;font-size:12px;color:#111"><b>${label}</b><br>${cur.zone||''}<br>${cur.speed} km/h · ${cur.heading}<br><span style="color:#888;font-size:10px">${cur.source==='wialon'?'📡 Wialon GPS':'📱 Driver phone'} · ${timeAgo(cur.lastUpdate)}</span><br><button class="tbl-btn" style="margin-top:6px" onclick="showStreetView(${cur.lat},${cur.lng},'${esc(label)}')">🧭 Street View</button></div>`);
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
  openModal(`User — ${u.name}`, `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)"><div class="user-av-lg" style="width:48px;height:48px;font-size:16px">${initials(u.name)}</div><div><div style="font-size:15px;font-weight:700;color:var(--text)">${u.name}</div><div class="mono" style="font-size:9px;color:var(--text-3)">${u.id}</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div class="fg" style="margin:0"><label>Username</label><div class="mono">${u.username}</div></div><div class="fg" style="margin:0"><label>Role</label><div>${roleLabel(u.role)}</div></div><div class="fg" style="margin:0"><label>Email</label><div style="font-size:12px">${u.email}</div></div><div class="fg" style="margin:0"><label>Status</label><div>${sbadge(u.active?'active':'off_duty')}</div></div><div class="fg" style="margin:0"><label>Created</label><div class="mono" style="font-size:10px">${fmtDate(u.created)}</div></div><div class="fg" style="margin:0"><label>Last Login</label><div class="mono" style="font-size:10px">${timeAgo(u.lastLogin)}</div></div></div>${u.id!==state.profile?.id?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="modal-btn ${u.active?'danger':'success'}" onclick="toggleUserActive('${u.id}')">${u.active?'Deactivate':'Activate'} User</button></div>`:'<div style="font-size:11px;color:var(--text-3)">This is your account</div>'}`);
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

function showCreateUserModal() {
  if (!isAdmin()) { toast('Admin rights required', 'error'); return; }
  openModal('Create User', `<div class="form-row-2"><div class="fg"><label>Full Name</label><input id="cu_name" placeholder="Jane Doe"/></div><div class="fg"><label>Username</label><input id="cu_user" placeholder="jane.doe"/></div></div><div class="fg"><label>Email</label><input id="cu_email" type="email" placeholder="jane@gargo.co.ke"/></div><div class="form-row-2"><div class="fg"><label>Role</label><select id="cu_role"><option value="ops">Operations Officer</option><option value="dispatch">Dispatch Controller</option><option value="clerk">Clerk</option><option value="finance">Finance Manager</option><option value="viewer">Read-Only Viewer</option><option value="driver">Driver</option><option value="admin">System Administrator</option></select></div></div><div style="font-size:11px;color:var(--text-3);padding:10px;background:var(--surface);border-radius:5px;margin-bottom:12px">User will receive an email invitation to set their password via Supabase Auth.</div><button class="submit-btn" onclick="saveUser()">Create User →</button>`);
}

async function saveUser() {
  const name=document.getElementById('cu_name').value.trim();
  const user=document.getElementById('cu_user').value.trim().toLowerCase();
  const email=document.getElementById('cu_email').value.trim();
  if(!name||!user||!email) { toast('Name, username and email required','error'); return; }
  if(!validateEmail(email)) { toast('Invalid email format','error'); return; }
  if(state.db.profiles.some(u=>u.username===user)) { toast('Username taken','error'); return; }
  

  state.db.profiles.push({
    id:uid('USR'), name, username:user,
    email: email,
    role:  document.getElementById('cu_role').value,
    active:true,
    created: new Date().toISOString(), lastLogin: null,
  });
  addAudit(state.profile.username,'User Created', `${name} (${user})`);
  closeModal(); renderUserMgmt();
  toast(`${name} previewed. Send invitation email via Supabase Dashboard.`, 'success');
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

  renderGpsStatus();
  renderInvoiceConfigForm();
  renderWialonConfigForm();
}

function renderGpsStatus() {
  const gpsStatus = document.getElementById('gpsStatusVal');
  if (!gpsStatus) return;
  const s = state.db.settings || {};
  const equippedCount = state.db.trucks.filter(t => t.wialonUnitId).length;
  if (s.wialonEnabled && s.wialonToken) {
    gpsStatus.textContent = `Live · Driver Phone + Wialon GPS (${equippedCount} unit${equippedCount===1?'':'s'} mapped)`;
    gpsStatus.style.color = 'var(--green)';
  } else {
    gpsStatus.textContent = 'Live · Driver Phone only';
    gpsStatus.style.color = 'var(--green)';
  }
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

/* Wialon GPS integration — server-side sync (edge function + cron, runs
   every minute) fetches positions for any truck with a Wialon Unit ID
   assigned and writes them into tracking_positions with source='wialon'.
   This panel only manages the connection config; the actual sync never
   touches the browser except when an admin explicitly hits "Sync Now". */
function wialonSettings() {
  const s = state.db.settings || {};
  return {
    enabled: !!s.wialonEnabled,
    token: s.wialonToken || '',
    host: s.wialonHost || 'https://hst-api.wialon.com',
    lastSync: s.wialonLastSync || null,
    lastResult: s.wialonLastResult || '',
  };
}

function renderWialonConfigForm() {
  const el = document.getElementById('wialonConfigForm');
  if (!el) return;
  const w = wialonSettings();
  const equipped = state.db.trucks.filter(t => t.wialonUnitId);
  el.innerHTML = `
    <div class="fg" style="margin:0"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="wc_enabled" type="checkbox" ${w.enabled?'checked':''} style="width:14px;height:14px"/> Enable Wialon GPS sync</label></div>
    <div class="fg" style="margin:0"><label>Wialon API Token</label><div style="display:flex;gap:6px"><input id="wc_token" type="password" value="${esc(w.token)}" placeholder="Wialon Remote API token"/><button class="tbl-btn" type="button" onclick="togglePwVis('wc_token', this)">👁</button></div></div>
    <div class="fg" style="margin:0"><label>Wialon Host</label><input id="wc_host" value="${esc(w.host)}" placeholder="https://hst-api.wialon.com"/></div>
    <div style="font-size:9.5px;color:var(--text-3);line-height:1.5">${equipped.length} truck${equipped.length===1?'':'s'} currently mapped to a Wialon unit (set per-truck from the truck's detail view). Trucks without a Wialon Unit ID keep tracking via the driver's phone automatically — nothing else changes for them.</div>
    <div style="font-size:9.5px;color:var(--text-3);margin-top:2px">Last sync: <b style="color:var(--text-2)">${w.lastSync ? timeAgo(w.lastSync) : 'Never'}</b>${w.lastResult ? ` · ${esc(w.lastResult)}` : ''}</div>
    <div id="wialonSyncStatus" style="font-size:9.5px;margin-top:2px"></div>
  `;
}

function saveWialonConfig() {
  const enabled = document.getElementById('wc_enabled').checked;
  const token = document.getElementById('wc_token').value.trim();
  const host = document.getElementById('wc_host').value.trim() || 'https://hst-api.wialon.com';
  if (enabled && !token) { toast('Add a Wialon API token before enabling sync', 'error'); return; }
  state.db.settings = state.db.settings || {};
  state.db.settings.wialonEnabled = enabled;
  state.db.settings.wialonToken = token;
  state.db.settings.wialonHost = host;
  scheduleSave();
  addAudit(state.profile.username, 'GPS Settings', `Wialon sync ${enabled ? 'enabled' : 'disabled'}`);
  renderGpsStatus();
  toast('Wialon settings saved', 'success');
}

async function syncWialonNow() {
  const statusEl = document.getElementById('wialonSyncStatus');
  if (statusEl) { statusEl.style.color = 'var(--text-3)'; statusEl.textContent = 'Syncing…'; }
  try {
    const { data, error } = await supabase.functions.invoke('wialon-sync');
    if (error) throw error;
    if (data?.skipped) {
      if (statusEl) { statusEl.style.color = 'var(--amber)'; statusEl.textContent = data.reason || 'Sync skipped'; }
      toast(data.reason || 'Wialon sync skipped — check your settings are saved', 'info');
      return;
    }
    if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
    const msg = `${data.positionsWritten}/${data.trucksMapped} unit(s) reporting`;
    if (statusEl) { statusEl.style.color = 'var(--green)'; statusEl.textContent = `✓ ${msg} (${data.unitsFound} total units on Wialon account)`; }
    state.db.settings = state.db.settings || {};
    state.db.settings.wialonLastSync = new Date().toISOString();
    state.db.settings.wialonLastResult = msg;
    toast(`Wialon sync complete — ${msg}`, 'success');
    // Pull the freshly-written positions in so the map/list update immediately.
    await refreshTracking();
    renderGpsStatus();
  } catch (e) {
    console.error('Wialon manual sync failed:', e);
    if (statusEl) { statusEl.style.color = 'var(--red)'; statusEl.textContent = `Sync failed — ${e.message || e}`; }
    toast('Wialon sync failed — check token/host and try again', 'error');
  }
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
    workshop: [], invoices: [], billingRates: defaultBillingRates(),
    allocationRules: [], trackingPositions: {}, auditLog: [],
    settings: state.db.settings || {
      backupDate: null, mapApiKey: '', whatsapp: true, mpesa: false,
      companyName: 'Gargo Logistics Ltd', invoiceConfig: null,
      wialonEnabled: false, wialonToken: '', wialonHost: 'https://hst-api.wialon.com',
      wialonLastSync: null, wialonLastResult: ''
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

function adminDeleteBtn(table, id) {
  if (!isAdmin()) return '';
  return `<button class="modal-btn danger" onclick="confirmDeleteRecord('${table}','${id}')" style="margin-top:10px">🗑 Delete ${DELETE_TABLE_LABELS[table]||'Record'}</button>`;
}

function confirmDeleteRecord(table, id) {
  if (!isAdmin()) { toast('Admin rights required to delete records', 'error'); return; }
  const label = DELETE_TABLE_LABELS[table] || 'record';
  if (!confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) return;
  const arr = state.db[table];
  if (!Array.isArray(arr)) return;
  const idx = arr.findIndex(r=>r.id===id);
  if (idx===-1) { toast('Record not found', 'error'); return; }
  arr.splice(idx,1);
  scheduleSave();
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



const CONTAINER_TYPE_OPTIONS = ['20ft Dry', '40ft Dry', '40ft HC', '20ft Reefer', '40ft Reefer', 'Flat Rack', 'Open Top', 'Tank', 'Hazmat'];


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

async function renderDepOpsReports() {
  depOpsReportsPopulateLines();

  const lineId = document.getElementById('depopsRptLine')?.value || '';
  const type = document.getElementById('depopsRptType')?.value || '';
  const status = document.getElementById('depopsRptStatus')?.value || '';
  const from = document.getElementById('depopsRptFrom')?.value || '';
  const to = document.getElementById('depopsRptTo')?.value || '';

  let rows = (state.db.interchange || []).slice();
  if (lineId) rows = rows.filter(i => i.line === lineId);
  if (type) rows = rows.filter(i => i.type === type);
  if (status) rows = rows.filter(i => i.status === status);
  if (from) rows = rows.filter(i => new Date(i.date) >= new Date(from));
  if (to) rows = rows.filter(i => new Date(i.date) <= new Date(to + 'T23:59:59'));
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  _depOpsRptRows = rows;

  const body = document.getElementById('depopsRptBody');
  const meta = document.getElementById('depopsRptMeta');
  const exportBtn = document.getElementById('depopsRptExportBtn');
  if (meta) meta.textContent = `${rows.length} record${rows.length === 1 ? '' : 's'}`;
  if (exportBtn) exportBtn.disabled = !rows.length;

  if (body) {
    body.innerHTML = rows.length ? rows.map(ic => `<tr>
      <td class="mono">${fmtDate(ic.date)}</td>
      <td class="mono" style="color:var(--gold)">${sanitize(ic.container || '—')}</td>
      <td>${sanitize(ic.type || '—')}</td>
      <td>${sanitize(ic.ctype || '—')}</td>
      <td>${sanitize(lineName(ic.line))}</td>
      <td>${sanitize(ic.condition || '—')}</td>
      <td>${ic.truck ? sanitize(truckName(ic.truck)) : '—'}</td>
      <td>${ic.driver ? sanitize(driverName(ic.driver)) : '—'}</td>
      <td>${sbadge(ic.status)}</td>
      <td class="mono">${ic.repairTotal ? fmtKsh(ic.repairTotal) : '—'}</td>
    </tr>`).join('') : `<tr><td colspan="10" class="empty-td">No interchange records match these filters</td></tr>`;
  }

  const byLine = {};
  rows.forEach(ic => { const key = lineName(ic.line); byLine[key] = (byLine[key] || 0) + 1; });
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