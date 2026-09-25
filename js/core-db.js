'use strict';


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


async function saveDirty(table, rows, toRowFn) {
  const dirty = (rows || []).filter(r => r._dirty);
  if (!dirty.length) return null;
  const failure = await upsertRowsChunked(table, dirty.map(toRowFn));
  if (failure) return failure;
  dirty.forEach(r => { delete r._dirty; });
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

      supabase.from('audit_log').select('*').order('time', { ascending: false }).limit(1000),
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
    
    failures.push(await saveDirty('trips', db.trips, tripToRow));
   
    failures.push(await saveDirty('maintenance', db.maintenance, maintToRow));
    
    failures.push(await saveDirty('fuel_logs', db.fuel, fuelToRow));
    
    failures.push(await saveDirty('shutouts', db.shutouts, shutoutToRow));

    failures.push(await saveDirty('interchange', db.interchange, icToRow));
    
    failures.push(await saveDirty('requisitions', db.requisitions, reqToRow));
    
    failures.push(await saveDirty('workshop_jobs', db.workshop, wsToRow));

    failures.push(await saveDirty('invoices', db.invoices, invToRow));
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
      wialonHost: 'https://hst-api.wialon.com'
    };
  }
  if (!state.db.billingRates || !Object.keys(state.db.billingRates).length) {
    state.db.billingRates = defaultBillingRates();
  }
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
        if (_bulkWriteInProgress) return; 

        clearTimeout(_liveSyncDebounce);
        _liveSyncDebounce = setTimeout(refreshFromServer, 2000);
      }
    );
  });
  state._liveSyncChannel = channel.subscribe();
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