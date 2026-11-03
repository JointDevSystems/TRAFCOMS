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


const OPERATIONAL_WINDOW_DAYS = 90;

function operationalCutoffISO() {
  const d = new Date();
  d.setDate(d.getDate() - OPERATIONAL_WINDOW_DAYS);
  return d.toISOString();
}


async function fetchAllPaginated(queryFactory, pageSize = 1000, concurrency = 4) {
  
  let all = [];
  let from = 0;
  let first = true;
  for (;;) {
    const n = first ? 1 : concurrency;
    const reqs = [];
    for (let i = 0; i < n; i++) {
      const f = from + i * pageSize;
      reqs.push(Promise.resolve(queryFactory(f, f + pageSize - 1)));
    }
    const results = await Promise.all(reqs);
    for (let i = 0; i < results.length; i++) {
      const { data, error } = results[i];
      if (error) return { data: all, error };
      all = all.concat(data || []);
      if (!data || data.length < pageSize) return { data: all, error: null };   // later pages in this batch are ignored
    }
    from += n * pageSize;
    first = false;
  }
}


async function ensureRowsLoaded(table, ids, existing, fromRowFn) {
  const have = new Set(existing.map(r => r.id));
  const missing = [...new Set((ids || []).filter(Boolean))].filter(id => !have.has(id));
  if (!missing.length) return existing;
  const { data, error } = await supabase.from(table).select('*').in('id', missing);
  if (error) { console.error(`${table} backfill failed:`, error.message); return existing; }
  (data || []).forEach(row => existing.push(fromRowFn(row)));
  return existing;
}

async function ensureTripsLoaded(ids) {
  return ensureRowsLoaded('trips', ids, state.db.trips, tripFromRow);
}

async function ensureInterchangeLoaded(ids) {
  return ensureRowsLoaded('interchange', ids, state.db.interchange, icFromRow);
}

async function upsertRows(table, rows, opts) {
  if (!rows || !rows.length) return null;
  const { error } = await supabase.from(table).upsert(rows, opts || {});
  if (error) { console.error(`${table} save failed:`, error.message); return { table, error }; }
  return null;
}


const TRUCK_FUEL_COLS = ['fuel_baseline_litres', 'fuel_baseline_at', 'fuel_baseline_odo', 'tank_capacity', 'km_per_litre'];

// Trucks gained tank/fuel-baseline columns. If the table hasn't been migrated yet, retry without them
// so the rest of the truck save still goes through (fuel level then falls back to the legacy % value).
async function upsertTrucks(trucks) { return upsertTruckRows(trucks.map(truckToRow)); }

async function upsertTruckRows(rows) {
  if (!rows || !rows.length) return null;
  let failure = await upsertRows('trucks', rows);
  if (failure && TRUCK_FUEL_COLS.some(col => new RegExp(`\\b${col}\\b`, 'i').test(failure.error?.message || ''))) {
    console.warn('trucks fuel columns not found \u2014 saving without them. Run fuel_tank_columns.sql');
    rows = rows.map(r => { const copy = { ...r }; TRUCK_FUEL_COLS.forEach(k => delete copy[k]); return copy; });
    failure = await upsertRows('trucks', rows);
  }
  return failure;
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
  let failure = await upsertRowsChunked(table, dirty.map(toRowFn));

  if (failure && table === 'invoices' && /line_items/i.test(failure.error?.message || '')) {
    console.warn('invoices.line_items column not found — saving without it. Run: alter table invoices add column if not exists line_items jsonb default \'[]\'::jsonb;');
    failure = await upsertRowsChunked(table, dirty.map(r => { const row = toRowFn(r); delete row.line_items; return row; }));
  }
  
  for (const col of ['currency', 'client_address', 'terms']) {
    if (failure && table === 'invoices' && new RegExp(`\\b${col}\\b`, 'i').test(failure.error?.message || '')) {
      console.warn(`invoices.${col} column not found — saving without it. Run: alter table invoices add column if not exists ${col} text default '';`);
      failure = await upsertRowsChunked(table, dirty.map(r => { const row = toRowFn(r); delete row[col]; return row; }));
    }
  }

  if (failure && table === 'shutouts' && /\bimg\b/i.test(failure.error?.message || '')) {
    console.warn('shutouts.img column not found — saving without it. Run: alter table shutouts add column if not exists img text default \'\';');
    failure = await upsertRowsChunked(table, dirty.map(r => { const row = toRowFn(r); delete row.img; return row; }));
  }

  if (failure && table === 'fuel_logs' && /total_paid/i.test(failure.error?.message || '')) {
    console.warn('fuel_logs.total_paid column not found — saving without it. Run: alter table fuel_logs add column if not exists total_paid numeric;');
    failure = await upsertRowsChunked(table, dirty.map(r => { const row = toRowFn(r); delete row.total_paid; return row; }));
  }
  
  if (failure && table === 'interchange') {
    const optionalCols = ['iso_code', 'trailer_no', 'gross_weight', 'manufacture_date', 'clerk_name', 'storage_zone', 'storage_block', 'storage_slot'];
    const dropped = [];
    while (failure) {
      const msg = failure.error?.message || '';
      const col = optionalCols.find(cn => dropped.indexOf(cn) === -1 && new RegExp(`\\b${cn}\\b`, 'i').test(msg));
      if (!col) break;
      dropped.push(col);
      console.warn(`interchange.${col} column not found — saving without it. Run supabase_interchange_eir_migration.sql.`);
      failure = await upsertRowsChunked(table, dirty.map(r => { const row = toRowFn(r); dropped.forEach(d => delete row[d]); return row; }));
    }
  }
  if (failure) return failure;
  dirty.forEach(r => { delete r._dirty; });
  return null;
}

async function syncInvoiceTrips(invoices) {
  let ok = true;
  const invoiceIds = invoices.map(i => i.id);
  if (invoiceIds.length) {
    const { error: delErr } = await supabase.from('invoice_trips').delete().in('invoice_id', invoiceIds);
    if (delErr) { ok = false; console.error('invoice_trips clear failed:', delErr.message); }
  }
  const rows = [];
  invoices.forEach(inv => (inv.trips || []).forEach(tripId => rows.push({ invoice_id: inv.id, trip_id: tripId })));
  if (rows.length) {
    const { error } = await supabase.from('invoice_trips').insert(rows);
    if (error) { ok = false; console.error('invoice_trips save failed:', error.message); }
  }
  return ok;
}


const SAVE_SNAP_SPECS = {
  shippingLines:   { rows: db => (db.shippingLines || []).map(lineToRow),  id: r => r.id },
  trucks:          { rows: db => (db.trucks || []).map(truckToRow),        id: r => r.id },
  drivers:         { rows: db => (db.drivers || []).map(driverToRow),      id: r => r.id },
  allocationRules: { rows: db => (db.allocationRules || []).map(allocToRow), id: r => r.id },
  billingRates:    { rows: db => Object.entries(db.billingRates || {}).map(([ctype, v]) => ({ ctype, base: v.base, per_km: v.perKm })), id: r => r.ctype },
};


const SAVE_SNAP_FOR_TABLE = {
  shipping_lines: ['shippingLines'], trucks: ['trucks'], drivers: ['drivers'],
  allocation_rules: ['allocationRules'], invoices: ['invoiceTrips'],
};

const _saveSnap = {};

function _invoiceTripsMap(db) {
  return new Map((db.invoices || []).map(i => [i.id, JSON.stringify([...(i.trips || [])].sort())]));
}


function snapshotSaved(names) {
  if (!state.db) return;
  const list = names || [...Object.keys(SAVE_SNAP_SPECS), 'invoiceTrips'];
  list.forEach(name => {
    try {
      if (name === 'invoiceTrips') { _saveSnap.invoiceTrips = _invoiceTripsMap(state.db); return; }
      const spec = SAVE_SNAP_SPECS[name];
      if (spec) _saveSnap[name] = new Map(spec.rows(state.db).map(r => [spec.id(r), JSON.stringify(r)]));
    } catch (e) { delete _saveSnap[name]; }
  });
}

function invalidateSaveSnapshots() {
  Object.keys(_saveSnap).forEach(k => delete _saveSnap[k]);
}

function _planBlindSave(name) {
  const spec = SAVE_SNAP_SPECS[name];
  const rows = spec.rows(state.db);
  const next = new Map(rows.map(r => [spec.id(r), JSON.stringify(r)]));
  const prev = _saveSnap[name];
  const changed = prev ? rows.filter(r => prev.get(spec.id(r)) !== next.get(spec.id(r))) : rows;
  return { rows: changed, commit() { _saveSnap[name] = next; } };
}

function _planInvoiceTripsSave() {
  const next = _invoiceTripsMap(state.db);
  const prev = _saveSnap.invoiceTrips;
  const changed = (state.db.invoices || []).filter(i => !prev || prev.get(i.id) !== next.get(i.id));
  return { invoices: changed, commit() { _saveSnap.invoiceTrips = next; } };
}

function _settingsRow(settings) {
  return {
    id: 1,
    company_name: settings.companyName,
    backup_date: settings.backupDate,
    map_api_key: settings.mapApiKey,
    whatsapp: settings.whatsapp,
    mpesa: settings.mpesa,
    invoice_config: settings.invoiceConfig || null,
    wialon_enabled: !!settings.wialonEnabled,
    wialon_host: settings.wialonHost || 'https://hst-api.wialon.com',
    fuel_price_history: settings.fuelPriceHistory || null,
  };
}

/* Interchange (~24,000 rows) is NOT loaded at start-up. ic-remote.js (ICR) fetches the pages each screen needs.
   ?ic=full on the URL (remembered on the device) restores the old load-everything behaviour; ?ic=lazy switches back. */
function _icFullLoad() {
  try {
    const m = /[?&]ic=(full|lazy)/.exec(location.search);
    if (m) return m[1] === 'full';
    return localStorage.getItem('gargo-ic-full') === '1';
  } catch (e) { return false; }
}

async function loadDB() {
  try {
    const [
      trucksRes, driversRes, tripsRes, maintRes, fuelRes, linesRes,
      shutoutsRes, icRes, reqRes, wsRes, invRes, invTripsRes,
      billingRes, allocRes, trackRes, auditRes, settingsRes, profilesRes,
      vlmRes, vpsRes, crRes,
    ] = await Promise.all([
      supabase.from('trucks').select('*'),
      supabase.from('drivers').select('*'),

      fetchAllPaginated((from, to) =>
        supabase.from('trips').select('*')
          .or(`status.neq.completed,start_time.gte.${operationalCutoffISO()}`)
          .order('start_time', { ascending: false })
          .range(from, to)
      ),
      supabase.from('maintenance').select('*'),
      
      fetchAllPaginated((from, to) => supabase.from('fuel_logs').select('*').order('date', { ascending: false }).range(from, to)),
      supabase.from('shipping_lines_with_rates').select('*'),   // rates come from shipping_line_rates: filled for admin/finance, null for everyone else (RLS)
      supabase.from('shutouts').select('*'),
      
      _icFullLoad() ? fetchAllPaginated((from, to) =>
        supabase.from('interchange').select('*')
          .or(`status.neq.reconciled,date.gte.${operationalCutoffISO()}`)
          .order('date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to)
      ) : Promise.resolve({ data: [], error: null }),   // ~24k rows: loaded on demand by ic-remote.js, not at start-up
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
      supabase.from('vessel_prestaking').select('*'),
      supabase.from('container_repairs').select('*').order('created_at', { ascending: false }).limit(2000),
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
    const vesselPrestaking = (vpsRes.data || []).map(prestakeFromRow);
    const containerRepairs = (crRes.data || []).map(crFromRow);
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
      trackingPositions[r.truck_id] = mapPositionRow(r);
    });

    const auditLog = (auditRes.data || [])
      .map(a => ({ id: a.id, user: a.username, action: a.action, detail: a.detail, time: a.time, _saved: true }))
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    const s = settingsRes.data;
    const settings = s
      ? { backupDate: s.backup_date, mapApiKey: s.map_api_key || '', whatsapp: !!s.whatsapp, mpesa: !!s.mpesa, companyName: s.company_name || 'Gargo Logistics Ltd', invoiceConfig: s.invoice_config || null, wialonEnabled: !!s.wialon_enabled, wialonHost: s.wialon_host || 'https://hst-api.wialon.com', fuelPriceHistory: Array.isArray(s.fuel_price_history) ? s.fuel_price_history : [] }
      : { backupDate: null, mapApiKey: '', whatsapp: true, mpesa: false, companyName: 'Gargo Logistics Ltd', invoiceConfig: null, wialonEnabled: false, wialonHost: 'https://hst-api.wialon.com', fuelPriceHistory: [] };

  
    const profiles = (profilesRes.data || []).map(p => ({
      id: p.id, name: p.name, username: p.username, email: p.email,
      role: p.role, active: p.active,
      created: p.created_at || p.created || new Date().toISOString(),
      lastLogin: p.last_login || null,
      navSections: Array.isArray(p.nav_sections) ? p.nav_sections : null,
      adminSections: Array.isArray(p.admin_sections) ? p.admin_sections : null,
    }));

    if (typeof recomputeAllTruckFuel === 'function') recomputeAllTruckFuel(trucks, fuel);

    return {
      trucks, drivers, trips, maintenance, fuel, shippingLines, shutouts,
      interchange, requisitions, workshop, invoices, billingRates,
      allocationRules, trackingPositions, auditLog, settings, profiles,
      vesselLineMap, vesselPrestaking, containerRepairs,
    };
  } catch (e) {
    console.warn('Failed to load from Supabase:', e);
    return null;
  }
}

async function saveDB() {
  if (!state.db) return { ok: true, failures: [] };
  if (!state.currentUser) return { ok: true, failures: [] };   // signed out: RLS would reject every write
  const db = state.db;
  const failures = [];
  try {

    // Send only rows that changed since the database last held them.
    const saveChanged = async (name, write) => {
      const plan = _planBlindSave(name);
      const failure = await write(plan.rows);
      failures.push(failure);
      if (!failure) plan.commit();
    };

    await saveChanged('shippingLines', rows => upsertRows('shipping_lines', rows));
    await saveChanged('trucks',        rows => upsertTruckRows(rows));
    await saveChanged('drivers',       rows => upsertRows('drivers', rows));
    
    failures.push(await saveDirty('trips', db.trips, tripToRow));
   
    failures.push(await saveDirty('maintenance', db.maintenance, maintToRow));
    
    failures.push(await saveDirty('fuel_logs', db.fuel, fuelToRow));
    
    failures.push(await saveDirty('shutouts', db.shutouts, shutoutToRow));

    failures.push(await saveDirty('interchange', db.interchange, icToRow));

    failures.push(await saveDirty('vessel_prestaking', db.vesselPrestaking, prestakeToRow));
    
    failures.push(await saveDirty('requisitions', db.requisitions, reqToRow));
    
    failures.push(await saveDirty('workshop_jobs', db.workshop, wsToRow));

    failures.push(await saveDirty('container_repairs', db.containerRepairs, crToRow));

    failures.push(await saveDirty('invoices', db.invoices, invToRow));
    {
      const plan = _planInvoiceTripsSave();
      if (plan.invoices.length) {
        if (await syncInvoiceTrips(plan.invoices)) plan.commit();
      } else {
        plan.commit(); // nothing changed; also drops links of deleted invoices from the snapshot
      }
    }

    if (typeof canFinance === 'function' && canFinance()) {   // other roles cannot read or write rates, so they never send them
      await saveChanged('billingRates',    rows => upsertRows('billing_rates', rows, { onConflict: 'ctype' }));
    }
    await saveChanged('allocationRules', rows => upsertRows('allocation_rules', rows));

    // NOTE: tracking_positions is deliberately NOT written from here. Positions are owned by the
    // wialon-sync edge function (Wialon trucks) and by each driver's own pings (phone trucks).
    // Re-upserting this browser's in-memory copy on every save used to overwrite fresh server
    // positions with stale ones.

    const unsavedAudit = (db.auditLog || []).filter(a => !a._saved);
    if (unsavedAudit.length) {
      const { error: auditErr } = await supabase.from('audit_log').insert(unsavedAudit.map(auditToRow));
      if (auditErr) { console.error('audit_log save failed:', auditErr.message); failures.push({ table: 'audit_log', error: auditErr }); }
      else unsavedAudit.forEach(a => { a._saved = true; });
    }

    if (db.settings) {
      const settingsRow = _settingsRow(db.settings);
      const settingsJson = JSON.stringify(settingsRow);
      if (_saveSnap.settings !== settingsJson) {
      let { error } = await supabase.from('app_settings').upsert(settingsRow, { onConflict: 'id' });
      if (error && /invoice_config/i.test(error.message || '')) {

        delete settingsRow.invoice_config;
        ({ error } = await supabase.from('app_settings').upsert(settingsRow, { onConflict: 'id' }));
      }
      if (error && /fuel_price_history/i.test(error.message || '')) {
        delete settingsRow.fuel_price_history;
        ({ error } = await supabase.from('app_settings').upsert(settingsRow, { onConflict: 'id' }));
      }
      if (error) { console.error('app_settings save failed:', error.message); failures.push({ table: 'app_settings', error }); }
      else _saveSnap.settings = settingsJson;
      }
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
  [db.maintenance, db.fuel, db.shutouts, db.interchange, db.requisitions, db.workshop, db.profiles, db.auditLog, db.allocationRules, db.vesselPrestaking, db.containerRepairs]
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
  (db.vesselPrestaking || []).forEach(p => {
    p.tripId   = p.tripId   ? (idMap.trips.get(p.tripId)          || null) : null;
    p.line     = p.line     ? (idMap.shippingLines.get(p.line)    || null) : null;
    p.truckId  = p.truckId  ? (idMap.trucks.get(p.truckId)        || null) : null;
    p.driverId = p.driverId ? (idMap.drivers.get(p.driverId)      || null) : null;
  });
  db.workshop.forEach(w => { w.truckId = w.truckId ? (idMap.trucks.get(w.truckId) || null) : null; });
  (db.containerRepairs || []).forEach(c => {
    c.line = c.line ? (idMap.shippingLines.get(c.line) || null) : null;
  });
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
  await del('container_repairs', 'id');
  await del('requisitions', 'id');
  await del('interchange', 'id');
  await del('shutouts', 'id');
  await del('vessel_prestaking', 'id');
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
  invalidateSaveSnapshots(); // tables are empty now: the next save must write everything
}

async function initDB() {
  let loaded = await loadDB();
  if (!loaded && window.GargoOffline) {
   
    const snap = await GargoOffline.loadSnapshot();
    if (snap) { loaded = snap.db; state.offlineData = true; console.warn('Opened from offline snapshot'); }
  }
  if (loaded) {
    state.db = loaded;
  
    snapshotSaved();
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
      containerRepairs: [],
      invoices: [],
      billingRates: defaultBillingRates(),
      allocationRules: [],
      trackingPositions: {},
      auditLog: [],
      settings: {},
      profiles: [],
      vesselLineMap: [],
      vesselPrestaking: []
    };
  }
  if (!Array.isArray(state.db.containerRepairs)) {
    state.db.containerRepairs = [];
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
      wialonHost: 'https://hst-api.wialon.com'
    };
  }
  if (!state.db.billingRates || !Object.keys(state.db.billingRates).length) {
    state.db.billingRates = defaultBillingRates();
  }
}

let _liveSyncDebounce = null;


let _bulkWriteInProgress = false;


const _liveRows = async (q) => { const { data, error } = await q; if (error) throw error; return data || []; };
const _livePaged = async (factory) => { const { data, error } = await fetchAllPaginated(factory); if (error) throw error; return data || []; };

const LIVE_TABLE_LOADERS = {
  trucks:            { key: 'trucks',           load: async () => (await _liveRows(supabase.from('trucks').select('*'))).map(truckFromRow) },
  drivers:           { key: 'drivers',          load: async () => (await _liveRows(supabase.from('drivers').select('*'))).map(driverFromRow) },
  trips:             { key: 'trips',            load: async () => (await _livePaged((from, to) =>
                        supabase.from('trips').select('*')
                          .or(`status.neq.completed,start_time.gte.${operationalCutoffISO()}`)
                          .order('start_time', { ascending: false }).range(from, to))).map(tripFromRow) },
  maintenance:       { key: 'maintenance',      load: async () => (await _liveRows(supabase.from('maintenance').select('*'))).map(maintFromRow) },
  fuel_logs:         { key: 'fuel',             load: async () => (await _livePaged((from, to) =>
                        supabase.from('fuel_logs').select('*').order('date', { ascending: false }).range(from, to))).map(fuelFromRow) },
  shipping_lines:    { key: 'shippingLines',    load: async () => (await _liveRows(supabase.from('shipping_lines_with_rates').select('*'))).map(lineFromRow) },
  shutouts:          { key: 'shutouts',         load: async () => (await _liveRows(supabase.from('shutouts').select('*'))).map(shutoutFromRow) },
  interchange:       { key: 'interchange',      load: async () => {
                        if (!_icFullLoad()) return (state.db && state.db.interchange) || [];   // on-demand cache: row patches keep it current
                        return (await _livePaged((from, to) =>
                          supabase.from('interchange').select('*')
                            .or(`status.neq.reconciled,date.gte.${operationalCutoffISO()}`)
                            .order('date', { ascending: false }).order('id', { ascending: false }).range(from, to))).map(icFromRow);
                      } },
  requisitions:      { key: 'requisitions',     load: async () => (await _liveRows(supabase.from('requisitions').select('*'))).map(reqFromRow) },
  workshop_jobs:     { key: 'workshop',         load: async () => (await _liveRows(supabase.from('workshop_jobs').select('*'))).map(wsFromRow) },
  invoices:          { key: 'invoices',         load: async () => {
                        const [invRows, linkRows] = await Promise.all([
                          _liveRows(supabase.from('invoices').select('*')),
                          _liveRows(supabase.from('invoice_trips').select('*')),
                        ]);
                        const invoices = invRows.map(invFromRow);
                        const byInvoice = {};
                        linkRows.forEach(r => { (byInvoice[r.invoice_id] = byInvoice[r.invoice_id] || []).push(r.trip_id); });
                        invoices.forEach(inv => { inv.trips = byInvoice[inv.id] || []; });
                        return invoices;
                      } },
  allocation_rules:  { key: 'allocationRules',  load: async () => (await _liveRows(supabase.from('allocation_rules').select('*'))).map(allocFromRow) },
  vessel_prestaking: { key: 'vesselPrestaking', load: async () => (await _liveRows(supabase.from('vessel_prestaking').select('*'))).map(prestakeFromRow) },
  container_repairs: { key: 'containerRepairs', load: async () => (await _liveRows(
                        supabase.from('container_repairs').select('*').order('created_at', { ascending: false }).limit(2000))).map(crFromRow) },
};

let _livePendingTables = new Set();
let _livePendingFull = false;

function queueLiveRefresh(table, delayMs) {
  if (table && LIVE_TABLE_LOADERS[table]) _livePendingTables.add(table);
  else _livePendingFull = true; // unknown table -> be safe, reload everything
  clearTimeout(_liveSyncDebounce);
  _liveSyncDebounce = setTimeout(_runQueuedLiveRefresh, delayMs);
}

function _runQueuedLiveRefresh() { return refreshFromServer({ queued: true }); }


const _PATCHABLE = {   // mappers are looked up lazily: those scripts load AFTER this one
  interchange: { key: 'interchange', from: r => icFromRow(r) },
  trips:       { key: 'trips',       from: r => tripFromRow(r) },
};
const PATCH_MAX = 25, PATCH_DELAY = 800;
let _patchQ = {}, _patchTimer = null;

function queueRowPatch(table, payload) {
  const p = _PATCHABLE[table];
  const ev = payload && payload.eventType;
  const id = payload && ((payload.new && payload.new.id) || (payload.old && payload.old.id));
  if (!p || !id || (ev !== 'INSERT' && ev !== 'UPDATE' && ev !== 'DELETE')) return false;
  const b = _patchQ[table] || (_patchQ[table] = { ids: new Map(), full: false });
  if (!b.full) { b.ids.set(id, ev === 'DELETE'); if (b.ids.size > PATCH_MAX) { b.full = true; b.ids.clear(); } }
  clearTimeout(_patchTimer);
  _patchTimer = setTimeout(_flushRowPatches, PATCH_DELAY);
  return true;
}

async function _flushRowPatches() {
  if (document.getElementById('modalOverlay')?.classList.contains('active')) { _patchTimer = setTimeout(_flushRowPatches, 1500); return; }
  const q = _patchQ; _patchQ = {}; _patchTimer = null;
  let changed = false;
  for (const table of Object.keys(q)) {
    const b = q[table], p = _PATCHABLE[table], arr = state.db && state.db[p.key];
    if (b.full || !Array.isArray(arr) || !navigator.onLine) { queueLiveRefresh(table, 0); continue; }
    try {
      const upIds = [];
      b.ids.forEach((isDel, id) => {
        if (!isDel) { upIds.push(id); return; }
        const i = arr.findIndex(r => r.id === id);
        if (i > -1 && !arr[i]._dirty) { arr.splice(i, 1); changed = true; }
      });
      if (upIds.length) {
        const { data, error } = await supabase.from(table).select('*').in('id', upIds);
        if (error) throw error;
        const at = new Map(arr.map((r, i) => [r.id, i]));
        (data || []).forEach(row => {
          const next = p.from(row), i = at.get(row.id);
          if (i === undefined) { arr.unshift(next); changed = true; }              // lists are newest-first
          else if (!arr[i]._dirty) { Object.assign(arr[i], next); changed = true; }
        });
      }
    } catch (e) {
      console.warn('Live sync row patch failed, reloading ' + table + ':', e);
      queueLiveRefresh(table, 0);
    }
  }
  if (changed) { buildBadges(); buildAlerts(); renderSection(state.currentSection); }
}

function subscribeLiveSync() {
  if (state._liveSyncChannel) return;
  const tables = Object.keys(LIVE_TABLE_LOADERS);

  let channel = supabase.channel('gargo-live-sync');
  tables.forEach(t => {
    channel = channel.on(
      'postgres_changes', { event: '*', schema: 'public', table: t },
      (payload) => {
        if (_bulkWriteInProgress) return;
        const table = (payload && payload.table) || t;
        if (queueRowPatch(table, payload)) return;     // interchange / trips: fetch just the changed rows
        queueLiveRefresh(table, 2000);
      }
    );
  });
  state._liveSyncChannel = channel.subscribe();
}

let _refreshInFlight = false;

let _refreshQueuedAgain = false;

function _relinkDriversToTrucks() {
  const db = state.db;
  (db.trucks || []).forEach(t => { t.driver = null; });
  (db.drivers || []).forEach(d => {
    if (d.truckId) { const t = db.trucks.find(x => x.id === d.truckId); if (t) t.driver = d.id; }
  });
}

// Re-fetch only the given realtime tables into state.db.
// Returns the set of tables that were actually refreshed.
async function _refreshTables(tables) {
  const keep = window.GargoOffline ? GargoOffline._t.dirtyRows().rows : null;
  const results = await Promise.allSettled(tables.map(t => LIVE_TABLE_LOADERS[t].load()));
  const done = new Set();
  results.forEach((res, i) => {
    const t = tables[i];
    if (res.status === 'fulfilled') {
      state.db[LIVE_TABLE_LOADERS[t].key] = res.value;
      done.add(t);
    } else {
      console.warn(`Live sync: ${t} refresh failed, keeping existing data:`, res.reason);
    }
  });

  if (keep) {   // re-apply unsaved rows for the slices just replaced
    const refreshed = new Set([...done].map(t => LIVE_TABLE_LOADERS[t].key));
    const sub = {};
    Object.keys(keep).forEach(k => { if (refreshed.has(k)) sub[k] = keep[k]; });
    if (Object.keys(sub).length) GargoOffline._t.mergePending(sub);
  }

  // Cross-table derived state that loadDB() computes after loading.
  if (done.has('trucks') || done.has('drivers')) _relinkDriversToTrucks();
  if ((done.has('trucks') || done.has('fuel_logs')) && typeof recomputeAllTruckFuel === 'function') {
    recomputeAllTruckFuel(state.db.trucks, state.db.fuel);
  }
  // Only the tables just re-fetched: other tables may hold unsaved local edits.
  snapshotSaved([...done].flatMap(t => SAVE_SNAP_FOR_TABLE[t] || []));
  return done;
}


async function refreshFromServer(opts) {
  if (!(opts && opts.queued)) _livePendingFull = true;
  if (!navigator.onLine) return;   // stays queued; offline.js refreshes after it reconnects

  const modalOpen = document.getElementById('modalOverlay')?.classList.contains('active');
  if (modalOpen) { _liveSyncDebounce = setTimeout(_runQueuedLiveRefresh, 1500); return; }

 
  if (_refreshInFlight) { _refreshQueuedAgain = true; return; }
  _refreshInFlight = true;

  const full = _livePendingFull;
  const tables = [..._livePendingTables];
  _livePendingFull = false;
  _livePendingTables.clear();

  try {
    if (full) {
      const fresh = await loadDB();
      if (fresh) {
        // Unsaved local rows must survive the replacement of state.db.
        const keep = window.GargoOffline ? GargoOffline._t.dirtyRows().rows : null;
        state.db = fresh;
        snapshotSaved();
        if (keep && Object.keys(keep).length) GargoOffline._t.mergePending(keep);
        if (state.offlineData) { state.offlineData = false; GargoOffline.refreshBanner(); }
        buildBadges();
        buildAlerts();
        renderSection(state.currentSection);
        startWialonPolling();
        window._gargoLastRefresh = Date.now();   // lets the Refresh button report success honestly
      }
    } else if (tables.length) {
      const done = await _refreshTables(tables);
      if (done.size) {
        buildBadges();
        buildAlerts();
        renderSection(state.currentSection);
        if (done.has('trucks') || done.has('drivers')) startWialonPolling();
      }
    }
  } catch (e) {
    console.warn('Live sync refresh failed:', e);
  } finally {
    _refreshInFlight = false;
    if (_refreshQueuedAgain || _livePendingFull || _livePendingTables.size) {
      _refreshQueuedAgain = false;
      clearTimeout(_liveSyncDebounce);
      _liveSyncDebounce = setTimeout(_runQueuedLiveRefresh, 700);
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