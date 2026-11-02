'use strict';



/* ───────────── shared helpers ───────────── */
function _ctTitleCase(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
}
function _ctKey(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function _ctFillList(id, values) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = values.map(v => `<option value="${esc(v)}"></option>`).join('');
}
let _ctWarned = {};
function _ctMissingTable(name, err) {
  const msg = (err && err.message) || '';
  const missing = /does not exist|schema cache|relation|column|violates|check constraint/i.test(msg);
  if (missing && !_ctWarned[name]) {
    _ctWarned[name] = true;
    console.warn(`${name}: ${msg} — run supabase_clerk_tools_migration.sql`);
  }
  return missing;
}

/* ═════════════════════ 1. INCOMING DRIVER DIRECTORY ═════════════════════ */
const IncomingDrivers = { list: [], loaded: false, loading: null };

async function loadIncomingDrivers() {
  if (IncomingDrivers.loading) return IncomingDrivers.loading;
  IncomingDrivers.loading = (async () => {
    try {
      const { data, error } = await supabase.from('incoming_drivers').select('*').order('last_seen', { ascending: false }).limit(3000);
      if (error) { _ctMissingTable('incoming_drivers', error); }
      else IncomingDrivers.list = data || [];
    } catch (e) { console.warn('incoming_drivers load failed:', e); }
    IncomingDrivers.loaded = true;
    IncomingDrivers.loading = null;
    return IncomingDrivers.list;
  })();
  return IncomingDrivers.loading;
}

// Datalists for the Lorry / Driver pickers: Gargo's own plus everyone remembered.
function fillIncomingDatalists() {
  const render = () => {
    const drivers = new Map();
    (state.db.drivers || []).forEach(d => drivers.set(_ctKey(d.name), d.name));
    IncomingDrivers.list.forEach(d => { if (!drivers.has(d.name_key)) drivers.set(d.name_key, d.name); });
    const trucks = new Map();
    (state.db.trucks || []).forEach(t => trucks.set(_ctKey(t.reg), t.reg));
    IncomingDrivers.list.forEach(d => { if (d.last_truck && !trucks.has(_ctKey(d.last_truck))) trucks.set(_ctKey(d.last_truck), d.last_truck); });
    _ctFillList('iwDriverList', [...drivers.values()]);
    _ctFillList('iwTruckList', [...trucks.values()]);
  };
  render();
  if (!IncomingDrivers.loaded) loadIncomingDrivers().then(render);
}

async function rememberIncomingDriver(d) {
  try {
    const name = String(d.name || '').trim();
    if (!name) return;
    const key = _ctKey(name);
    if ((state.db.drivers || []).some(g => _ctKey(g.name) === key)) return;   // Gargo's own drivers aren't "incoming"
    const row = IncomingDrivers.list.find(x => x.name_key === key);
    const typed = (name === name.toUpperCase() || name === name.toLowerCase()) ? _ctTitleCase(name) : name;
    const rec = {
      name_key: key,
      name: row ? row.name : typed,
      id_no: (d.idNo || '').trim() || (row && row.id_no) || null,
      transporter: (d.transporter || '').trim() || (row && row.transporter) || null,
      phone: (d.phone || '').trim() || (row && row.phone) || null,
      last_truck: (d.truck || '').trim() || (row && row.last_truck) || null,
      last_trailer: (d.trailer || '').trim() || (row && row.last_trailer) || null,
      times_seen: ((row && row.times_seen) || 0) + 1,
      last_seen: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('incoming_drivers').upsert(rec, { onConflict: 'name_key' }).select().single();
    if (error) { _ctMissingTable('incoming_drivers', error); return; }
    const i = IncomingDrivers.list.findIndex(x => x.name_key === key);
    if (i >= 0) IncomingDrivers.list[i] = data; else IncomingDrivers.list.unshift(data);
  } catch (e) { console.warn('rememberIncomingDriver failed:', e); }
}

// Wire the driver-name (and driver-ID) fields of a form so a known driver fills in
// ID, transporter, truck and trailer. Works for prefix 'iw' (inward) and 'sv' (survey).
function bindIncomingDriverAutofill(prefix) {
  const f = k => document.getElementById(`${prefix}_${k}`);
  const nameEl = f('driver');
  if (!nameEl || nameEl.dataset.incBound === '1') return;
  nameEl.dataset.incBound = '1';
  const targets = { id: f('driver_id'), transporter: f('transporter'), truck: f('truck'), trailer: f('trailer') };
  Object.values(targets).forEach(el => { if (el) el.addEventListener('input', () => { el.dataset.autofilled = '0'; }); });

  const setIfAllowed = (el, v) => {
    if (!el || !v) return false;
    if (!el.value || el.dataset.autofilled === '1') { el.value = v; el.dataset.autofilled = '1'; return true; }
    return false;
  };
  const clearAutofilled = () => Object.values(targets).forEach(el => { if (el && el.dataset.autofilled === '1') { el.value = ''; el.dataset.autofilled = '0'; } });
  const apply = rec => {
    let n = 0;
    n += setIfAllowed(targets.id, rec.id_no) ? 1 : 0;
    n += setIfAllowed(targets.transporter, rec.transporter) ? 1 : 0;
    n += setIfAllowed(targets.truck, rec.last_truck) ? 1 : 0;
    n += setIfAllowed(targets.trailer, rec.last_trailer) ? 1 : 0;
    if (n) toast('Filled in from saved driver details', 'info', 1800);
  };

  const onName = () => {
    const rec = IncomingDrivers.list.find(x => x.name_key === _ctKey(nameEl.value));
    if (rec) apply(rec); else clearAutofilled();
  };
  nameEl.addEventListener('input', onName);
  nameEl.addEventListener('change', onName);

  // Typing a known ID number brings up the name too.
  const idEl = targets.id;
  if (idEl) idEl.addEventListener('input', () => {
    const v = idEl.value.trim();
    if (v.length < 5 || nameEl.value.trim()) return;
    const rec = IncomingDrivers.list.find(x => x.id_no && x.id_no === v);
    if (rec) { nameEl.value = rec.name; apply(rec); }
  });
  if (!IncomingDrivers.loaded) loadIncomingDrivers();
}

/* ═════════════════════ 2. TARIFF CATALOG ═════════════════════ */
let _tariffBase = null;        // untouched copy of the shipped schedule
let _tariffOverrides = [];     // rows from tariff_codes
let _tariffLoaded = false;

function canEditTariffCatalog() { return typeof isAdmin === 'function' && isAdmin(); }
function _tKey(code, item) { return `${String(code || '').trim()}|${String(item || '').trim()}`.toUpperCase(); }

function _tariffSnapshotBase() {
  if (_tariffBase) return true;
  const sched = window.bookingDocs && window.bookingDocs.TARIFF_SCHEDULE;
  if (!sched) return false;
  _tariffBase = JSON.parse(JSON.stringify(sched));
  return true;
}

// Rebuild the live schedule (mutated in place so every reference to it stays valid).
function rebuildTariffSchedule() {
  if (!_tariffSnapshotBase()) return;
  const target = window.bookingDocs.TARIFF_SCHEDULE;
  const hidden = new Set(), edits = new Map(), customs = [];
  _tariffOverrides.forEach(r => {
    if (r.base_key) { if (r.active === false) hidden.add(r.base_key); else edits.set(r.base_key, r); }
    else if (r.active !== false) customs.push(r);
  });
  Object.keys(target).forEach(k => { delete target[k]; });
  const put = (cat, row) => { (target[cat] = target[cat] || []).push(row); };
  Object.keys(_tariffBase).forEach(cat => {
    _tariffBase[cat].forEach(row => {
      const key = _tKey(row.code, row.item);
      if (hidden.has(key)) return;
      const ov = edits.get(key);
      if (ov) put(ov.category || cat, { code: ov.code, item: ov.item, hours: Number(ov.hours) || 0, material: Number(ov.material) || 0 });
      else put(cat, Object.assign({}, row));
    });
  });
  customs.forEach(r => put(r.category || 'CUSTOM', { code: r.code, item: r.item, hours: Number(r.hours) || 0, material: Number(r.material) || 0 }));
}

async function loadTariffCatalog() {
  if (!_tariffSnapshotBase()) return;
  try {
    const { data, error } = await supabase.from('tariff_codes').select('*').limit(5000);
    if (error) { _ctMissingTable('tariff_codes', error); return; }
    _tariffOverrides = data || [];
    _tariffLoaded = true;
    rebuildTariffSchedule();
  } catch (e) { console.warn('tariff_codes load failed:', e); }
}

// Add or update a catalog entry from a repair line (used by "save to catalog").
async function saveTariffCatalogEntry(e) {
  const key = _tKey(e.code, e.item);
  _tariffSnapshotBase();
  let inBase = false;
  Object.keys(_tariffBase || {}).forEach(cat => _tariffBase[cat].forEach(r => { if (_tKey(r.code, r.item) === key) inBase = true; }));
  const existing = _tariffOverrides.find(r => inBase ? r.base_key === key : (!r.base_key && _tKey(r.code, r.item) === key));
  return _tcUpsert({
    id: existing && existing.id, base_key: inBase ? key : null,
    category: e.category || 'CUSTOM', code: e.code, item: e.item, hours: e.hours || 0, material: e.material || 0, active: true,
  }, true);
}

async function _tcUpsert(rec, announce) {
  const body = {
    base_key: rec.base_key || null, category: rec.category || 'CUSTOM', code: String(rec.code || '').trim(),
    item: String(rec.item || '').trim(), hours: Number(rec.hours) || 0, material: Number(rec.material) || 0,
    active: rec.active !== false, updated_by: (state.profile && state.profile.username) || null, updated_at: new Date().toISOString(),
  };
  const q = rec.id ? supabase.from('tariff_codes').update(body).eq('id', rec.id) : supabase.from('tariff_codes').insert(body);
  const { data, error } = await q.select().single();
  if (error) {
    if (_ctMissingTable('tariff_codes', error)) toast('Tariff editing needs the database update — run supabase_clerk_tools_migration.sql', 'error', 6000);
    else toast(`Could not save tariff code: ${error.message}`, 'error');
    throw error;
  }
  const i = _tariffOverrides.findIndex(r => r.id === data.id);
  if (i >= 0) _tariffOverrides[i] = data; else _tariffOverrides.push(data);
  rebuildTariffSchedule();
  if (announce) toast(`Tariff code ${body.code} saved`, 'success');
  return data;
}

async function _tcDelete(id) {
  const { error } = await supabase.from('tariff_codes').delete().eq('id', id);
  if (error) { toast(`Could not remove: ${error.message}`, 'error'); throw error; }
  _tariffOverrides = _tariffOverrides.filter(r => r.id !== id);
  rebuildTariffSchedule();
}

/* ── editor modal ── */
let _tcRows = [];
let _tcQuery = '';

function _tcBuildRows() {
  _tariffSnapshotBase();
  const rows = [];
  const byBase = new Map();
  _tariffOverrides.filter(r => r.base_key).forEach(r => byBase.set(r.base_key, r));
  Object.keys(_tariffBase || {}).forEach(cat => _tariffBase[cat].forEach(row => {
    const key = _tKey(row.code, row.item);
    const ov = byBase.get(key);
    if (!ov) rows.push({ state: 'base', key, category: cat, code: row.code, item: row.item, hours: row.hours, material: row.material });
    else if (ov.active === false) rows.push({ state: 'hidden', key, category: cat, code: row.code, item: row.item, hours: row.hours, material: row.material, id: ov.id });
    else rows.push({ state: 'edited', key, category: ov.category || cat, code: ov.code, item: ov.item, hours: Number(ov.hours), material: Number(ov.material), id: ov.id, base: row });
  }));
  _tariffOverrides.filter(r => !r.base_key && r.active !== false).forEach(r =>
    rows.push({ state: 'custom', key: _tKey(r.code, r.item), category: r.category, code: r.code, item: r.item, hours: Number(r.hours), material: Number(r.material), id: r.id }));
  return rows;
}

function openTariffCatalogEditor() {
  if (!canEditTariffCatalog()) { toast('Only an administrator can edit tariff codes', 'error'); return; }
  _tcQuery = '';
  const cats = Object.keys(_tariffBase || (window.bookingDocs && window.bookingDocs.TARIFF_SCHEDULE) || {}).sort();
  openModal('Tariff Codes', `
    <div class="ops-notice" style="margin-bottom:10px;font-size:11.5px">Search for a code, adjust its description, hours or material and save — or add a new one. Hidden codes stay available to restore. Records already saved keep the values they were created with.</div>
    <div class="fg"><label>Search</label><input id="tc_search" autocomplete="off" placeholder="e.g. cold wash, EECW40, door seal…" oninput="tcSearch()" /></div>
    <div id="tc_list" style="max-height:300px;overflow:auto;border:1px solid var(--border);border-radius:6px;margin-bottom:12px"></div>
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:6px 0 8px">Add a new code</div>
    <datalist id="tc_cats">${cats.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>
    <div class="form-row-2">
      <div class="fg"><label>Category</label><input id="tc_new_cat" list="tc_cats" placeholder="Pick one or type a new category" /></div>
      <div class="fg"><label>Code</label><input id="tc_new_code" placeholder="e.g. CW40" style="text-transform:uppercase" /></div>
    </div>
    <div class="fg"><label>Description</label><input id="tc_new_item" placeholder="e.g. COLD WASH 40FT" /></div>
    <div class="form-row-2">
      <div class="fg"><label>Hours</label><input id="tc_new_hours" type="number" step="0.1" min="0" value="0" /></div>
      <div class="fg"><label>Material (KSh)</label><input id="tc_new_material" type="number" step="0.01" min="0" value="0" /></div>
    </div>
    <button class="submit-btn" onclick="tcAdd()">Add code →</button>
  `);
  tcSearch();
}

function tcSearch() {
  const box = document.getElementById('tc_search');
  _tcQuery = box ? box.value : '';
  _tcRows = _tcBuildRows();
  const terms = _tcQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = [];
  _tcRows.forEach((r, i) => {
    const hay = `${r.code} ${r.item} ${r.category}`.toLowerCase();
    if (!terms.length ? (r.state !== 'base') : terms.every(t => hay.indexOf(t) !== -1)) matches.push(i);
  });
  const el = document.getElementById('tc_list');
  if (!el) return;
  if (!matches.length) { el.innerHTML = `<div style="padding:12px;font-size:11.5px;color:var(--text-3)">${terms.length ? 'Nothing matches — add it below.' : 'Type to search. Codes you have added, edited or hidden show here.'}</div>`; return; }
  const badge = s => ({ custom: '<span class="sbadge s-approved" style="font-size:9px">added</span>', edited: '<span class="sbadge s-pending" style="font-size:9px">edited</span>', hidden: '<span class="sbadge s-rejected" style="font-size:9px">hidden</span>', base: '' }[s]);
  el.innerHTML = matches.slice(0, 40).map(i => {
    const r = _tcRows[i];
    const dis = r.state === 'hidden' ? 'disabled' : '';
    const btn = (label, fn, cls) => `<button type="button" class="modal-btn ${cls || 'ghost'}" style="padding:2px 8px;font-size:10px" onclick="${fn}(${i})">${label}</button>`;
    return `<div style="padding:8px 10px;border-top:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;margin-bottom:4px"><span><span class="mono" style="color:var(--gold)">${esc(r.code)}</span> · <span style="color:var(--text-3)">${esc(r.category)}</span></span>${badge(r.state)}</div>
      <input id="tcr_item_${i}" value="${esc(r.item)}" ${dis} style="width:100%;margin-bottom:4px" />
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <label style="font-size:10px;color:var(--text-3)">Hrs</label><input id="tcr_hours_${i}" type="number" step="0.1" min="0" value="${esc(r.hours)}" ${dis} style="width:70px" />
        <label style="font-size:10px;color:var(--text-3)">Material</label><input id="tcr_material_${i}" type="number" step="0.01" min="0" value="${esc(r.material)}" ${dis} style="width:90px" />
        <span style="flex:1"></span>
        ${r.state === 'hidden' ? btn('Restore', 'tcRestoreRow') : btn('Save', 'tcSaveRow', 'primary')}
        ${r.state === 'base' ? btn('Hide', 'tcHideRow') : ''}
        ${r.state === 'edited' ? btn('Reset to original', 'tcResetRow') : ''}
        ${r.state === 'custom' ? btn('Delete', 'tcDeleteRow', 'danger') : ''}
      </div></div>`;
  }).join('') + (matches.length > 40 ? `<div style="padding:8px 10px;font-size:10.5px;color:var(--text-3)">${matches.length - 40} more — keep typing to narrow it down.</div>` : '');
}

async function tcSaveRow(i) {
  const r = _tcRows[i]; if (!r) return;
  const val = id => (document.getElementById(`${id}_${i}`) || {}).value;
  const item = String(val('tcr_item') || '').trim();
  if (!item) { toast('Description can\'t be empty', 'error'); return; }
  try {
    await _tcUpsert({
      id: r.id, base_key: r.state === 'custom' ? null : r.key, category: r.category, code: r.code,
      item, hours: val('tcr_hours'), material: val('tcr_material'), active: true,
    }, true);
    tcSearch();
  } catch (e) { /* toast already shown */ }
}
async function tcHideRow(i) {
  const r = _tcRows[i]; if (!r) return;
  try { await _tcUpsert({ base_key: r.key, category: r.category, code: r.code, item: r.item, hours: r.hours, material: r.material, active: false }, false); toast(`${r.code} hidden`, 'success'); tcSearch(); } catch (e) {}
}
async function tcRestoreRow(i) {
  const r = _tcRows[i]; if (!r || !r.id) return;
  try { await _tcDelete(r.id); toast(`${r.code} restored`, 'success'); tcSearch(); } catch (e) {}
}
async function tcResetRow(i) {
  const r = _tcRows[i]; if (!r || !r.id) return;
  try { await _tcDelete(r.id); toast(`${r.code} reset to the original`, 'success'); tcSearch(); } catch (e) {}
}
async function tcDeleteRow(i) {
  const r = _tcRows[i]; if (!r || !r.id) return;
  if (!confirm(`Delete ${r.code} — ${r.item}?`)) return;
  try { await _tcDelete(r.id); toast(`${r.code} deleted`, 'success'); tcSearch(); } catch (e) {}
}
async function tcAdd() {
  const val = id => (document.getElementById(id) || {}).value || '';
  const code = val('tc_new_code').trim().toUpperCase(), item = val('tc_new_item').trim(), cat = val('tc_new_cat').trim().toUpperCase() || 'CUSTOM';
  if (!code || !item) { toast('A code and a description are required', 'error'); return; }
  try {
    await _tcUpsert({ category: cat, code, item, hours: val('tc_new_hours'), material: val('tc_new_material'), active: true }, true);
    ['tc_new_code', 'tc_new_item'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    const s = document.getElementById('tc_search'); if (s) { s.value = code; }
    tcSearch();
  } catch (e) {}
}

/* ═════════════════════ 3. FUEL REPORT BULK UPLOAD ═════════════════════ */

function _frNormReg(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

// Excel serial, Date, "24/07/2026" (day first) or "2026-07-24" -> {y,m,d} or null.
function parseReportDate(v) {
  if (v == null || v === '') return null;
  const ok = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1) ? { y, m, d } : null;
  if (v instanceof Date && !isNaN(v)) { const t = new Date(v.getTime() + 12 * 3600 * 1000); return ok(t.getFullYear(), t.getMonth() + 1, t.getDate()); }
  if (typeof v === 'number') {
    if (v < 1 || v > 80000) return null;
    const t = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return ok(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) return ok(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) return ok(+m[1], +m[2], +m[3]);
  return null;
}
const _frYmd = p => `${String(p.y).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
const _frTs = p => Date.UTC(p.y, p.m - 1, p.d);

// 3500 -> 3500; "3,500" -> 3500; "3,500,00" (typo for 3,500.00) -> 3500.
function parseReportAmount(v) {
  if (typeof v === 'number') return isFinite(v) ? { value: v, fixed: false } : null;
  const s = String(v == null ? '' : v).trim().replace(/[^\d.,]/g, '');
  if (!s) return null;
  let m = s.match(/^(\d{1,3}(?:,\d{3})*),(\d{2})$/);
  if (m) return { value: parseFloat(m[1].replace(/,/g, '') + '.' + m[2]), fixed: true };
  const n = parseFloat(s.replace(/,/g, ''));
  return isFinite(n) ? { value: n, fixed: false } : null;
}

function _frRoute(s) {
  let t = String(s == null ? '' : s).trim().replace(/^(from|to)\s+/i, '').replace(/\s+/g, ' ');
  if (!t) return '';
  if (/^shuting$/i.test(t)) t = 'shunting';
  return t.length <= 3 ? t.toUpperCase() : _ctTitleCase(t);
}

const _FR_HEADERS = [
  ['item', /^item/], ['container', /container/], ['size', /^size/], ['type', /^type/], ['truck', /truck|vehicle|lorry/],
  ['date', /^date/], ['pmt', /^(pmt|payment|amount)/], ['id', /^id\b|id no/], ['from', /^from/], ['to', /^to$/], ['driver', /driver|^name/],
];

function parseFuelReport(grid, fileName, ctx) {
  ctx = ctx || { trucks: [], drivers: [], existingKeys: new Set(), today: new Date() };
  let hi = grid.findIndex(r => (r || []).some(c => /container/i.test(String(c == null ? '' : c))));
  if (hi < 0) throw new Error('Could not find a "CONTAINER NO" header row');
  const head = grid[hi].map(c => String(c == null ? '' : c).trim().toLowerCase());
  const col = {};
  head.forEach((h, i) => { if (!h) return; for (const [k, re] of _FR_HEADERS) { if (col[k] == null && re.test(h)) { col[k] = i; break; } } });
  if (col.pmt != null && col.driver == null && !head[col.pmt + 1]) col.driver = col.pmt + 1;   // the driver column has no header in the standard report
  ['container', 'date', 'pmt'].forEach(k => { if (col[k] == null) throw new Error(`Missing column: ${k.toUpperCase()}`); });

  const rows = [];
  for (let r = hi + 1; r < grid.length; r++) {
    const g = grid[r] || [];
    const cell = k => (col[k] == null ? null : g[col[k]]);
    if (!g.some(c => c != null && String(c).trim() !== '')) continue;
    const container = String(cell('container') == null ? '' : cell('container')).toUpperCase().replace(/[\s\-]/g, '');
    if (!container && cell('pmt') == null) continue;
    const row = { n: rows.length, item: cell('item'), container, flags: [], include: true, status: 'ok' };
    row.size = cell('size') != null ? String(cell('size')).trim() : '';
    row.type = String(cell('type') == null ? '' : cell('type')).trim().toUpperCase();
    row.ctype = `${row.size}${row.type}`;
    const truckRaw = String(cell('truck') == null ? '' : cell('truck')).trim();
    const [prime, trailer] = truckRaw.split('/');
    row.truckReg = (prime || '').toUpperCase().replace(/\s+/g, ' ').trim();
    row.trailer = (trailer || '').toUpperCase().replace(/\s+/g, '');
    const truck = ctx.trucks.find(t => _frNormReg(t.reg) === _frNormReg(prime));
    row.truckId = truck ? truck.id : null;
    row.truckKey = _frNormReg(prime);
    const dn = String(cell('driver') == null ? '' : cell('driver')).trim();
    row.driverName = dn ? _ctTitleCase(dn) : '';
    const drv = row.driverName ? ctx.drivers.find(d => _ctKey(d.name) === _ctKey(row.driverName)) : null;
    row.driverId = drv ? drv.id : null;
    row.from = _frRoute(cell('from'));
    row.to = _frRoute(cell('to'));

    const amt = parseReportAmount(cell('pmt'));
    if (!amt || !(amt.value > 0)) { row.status = 'error'; row.include = false; row.flags.push('Payment amount missing or not a number'); row.amount = 0; }
    else { row.amount = amt.value; if (amt.fixed) { row.status = 'fix'; row.flags.push(`Amount read as ${amt.value.toLocaleString()} (was "${cell('pmt')}")`); } }

    row.dateOrig = cell('date');
    row.datePart = parseReportDate(row.dateOrig);
    if (container && !/^[A-Z]{4}\d{7}$/.test(container)) { if (row.status === 'ok') row.status = 'warn'; row.flags.push('Container number format looks off'); }
    rows.push(row);
  }

  // Dates: judge each against the rest of the report, and suggest a fix for year typos.
  const valid = rows.map(r => r.datePart).filter(Boolean).map(_frTs).sort((a, b) => a - b);
  const mid = valid.length ? valid[Math.floor(valid.length / 2)] : _frTs({ y: ctx.today.getFullYear(), m: ctx.today.getMonth() + 1, d: ctx.today.getDate() });
  const lo = mid - 150 * 86400000, hi2 = Date.UTC(ctx.today.getFullYear(), ctx.today.getMonth(), ctx.today.getDate()) + 86400000;
  const midYear = new Date(mid).getUTCFullYear();
  rows.forEach(r => {
    const p = r.datePart;
    const inWin = q => q && _frTs(q) >= lo && _frTs(q) <= hi2;
    if (inWin(p)) { r.dateYmd = _frYmd(p); return; }
    const raw = r.dateOrig == null || r.dateOrig === '' ? '(blank)' : (p ? _frYmd(p) : String(r.dateOrig));
    const alt = p ? [midYear, midYear - 1, midYear + 1].map(y => ({ y, m: p.m, d: p.d })).find(inWin) : null;
    if (alt) {
      r.dateYmd = _frYmd(alt); r.status = r.status === 'error' ? 'error' : 'fix';
      r.flags.push(`Date ${raw} looks like a typo — changed to ${r.dateYmd}`);
    } else {
      r.dateYmd = ''; r.status = 'error'; r.include = false;
      r.flags.push(`Date ${raw} is missing or out of range — pick the right date`);
    }
  });

  // Duplicates: inside the file, and against rows imported earlier.
  const seen = new Set();
  rows.forEach(r => {
    r.key = [r.container, r.dateYmd, r.truckKey, _ctKey(r.from), _ctKey(r.to)].join('|');
    if (!r.dateYmd) return;
    if (ctx.existingKeys.has(r.key)) { r.status = 'dup'; r.include = false; r.flags.push('Already imported'); }
    else if (seen.has(r.key)) { r.status = 'dup'; r.include = false; r.flags.push('Same container, date, truck and route appears earlier in this file'); }
    seen.add(r.key);
  });
  return { fileName: fileName || 'report', rows };
}

function _frContext() {
  const existing = new Set();
  (state.db.fuel || []).filter(f => f.source === 'import' && f.container).forEach(f => {
    const d = new Date(f.date);
    const ymd = isNaN(d) ? '' : _frYmd({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
    const truck = state.db.trucks.find(t => t.id === f.truckId);
    existing.add([f.container, ymd, _frNormReg(truck ? truck.reg : (f.truckRegText || '')), _ctKey(f.routeFrom), _ctKey(f.routeTo)].join('|'));
  });
  return { trucks: state.db.trucks || [], drivers: state.db.drivers || [], existingKeys: existing, today: new Date() };
}

function downloadFuelReportTemplate() {
  if (typeof XLSX === 'undefined') { toast('Spreadsheet library still loading — try again in a moment', 'error'); return; }
  const aoa = [
    ['ITEM', 'CONTAINER NO', 'SIZE', 'TYPE', 'TRUCK DETAILS', 'DATE', 'PMT', 'DRIVER', 'ID', 'FROM', 'TO'],
    [1, 'MSCU1234567', 40, 'HC', 'KDX 655V/ZJ3120', new Date(), 3500, 'John Mwangi', '12345678', 'Gargo', 'Port'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  if (ws.F2) ws.F2.z = 'dd/mm/yyyy';
  ws['!cols'] = [6, 15, 6, 7, 18, 12, 8, 16, 12, 12, 12].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Total Trips');
  XLSX.writeFile(wb, 'fuel_report_template.xlsx');
}

let _fuelImport = null;

async function onFuelReportFile(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (typeof XLSX === 'undefined') { toast('Spreadsheet reader still loading — try again in a moment', 'error'); return; }
  try {
    let wb;
    if (/\.csv$/i.test(file.name)) wb = XLSX.read(await file.text(), { type: 'string', raw: true });   // raw keeps dd/mm/yyyy text as typed
    else wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    const parsed = parseFuelReport(grid, file.name, _frContext());
    if (!parsed.rows.length) { toast('No rows found in that file', 'warning'); return; }
    parsed.batchId = 'FR-' + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    _fuelImport = parsed;
    openFuelImportPreview();
  } catch (e) {
    toast(`Could not read that report: ${e.message || e}`, 'error', 5000);
  }
}

function _frSummary() {
  const rows = _fuelImport.rows;
  const ready = rows.filter(r => r.include && r.dateYmd && r.amount > 0);
  const c = s => rows.filter(r => r.status === s).length;
  const unmatched = {};
  ready.filter(r => !r.truckId).forEach(r => { unmatched[r.truckReg || '(blank)'] = (unmatched[r.truckReg || '(blank)'] || 0) + 1; });
  return { total: rows.length, ready: ready.length, amount: ready.reduce((s, r) => s + r.amount, 0), fixed: c('fix'), warn: c('warn'), errors: rows.filter(r => r.status === 'error' && !(r.include && r.dateYmd && r.amount > 0)).length, dups: c('dup'), unmatched };
}

function _frRenderSummary() {
  const el = document.getElementById('fi_summary');
  if (!el) return;
  const s = _frSummary();
  const un = Object.entries(s.unmatched);
  el.innerHTML = `
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin-bottom:8px">
      <span><strong>${s.total}</strong> rows read</span>
      <span style="color:var(--green,#2e7d32)"><strong>${s.ready}</strong> ready</span>
      ${s.fixed ? `<span style="color:var(--gold)"><strong>${s.fixed}</strong> auto-corrected</span>` : ''}
      ${s.errors ? `<span style="color:var(--red,#c62828)"><strong>${s.errors}</strong> need a fix</span>` : ''}
      ${s.dups ? `<span style="color:var(--text-3)"><strong>${s.dups}</strong> duplicates skipped</span>` : ''}
    </div>
    ${un.length ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:8px">Trucks not in the fleet list (kept by registration as typed): ${un.map(([k, v]) => `${esc(k)} (${v})`).join(', ')}</div>` : ''}`;
  const btn = document.getElementById('fi_run');
  if (btn) { btn.disabled = !s.ready; btn.textContent = s.ready ? `Import ${s.ready} row${s.ready === 1 ? '' : 's'} →` : 'Nothing ready to import'; }
}

function openFuelImportPreview() {
  const rows = _fuelImport.rows;
  const attention = rows.filter(r => r.status !== 'ok');
  const shown = attention.slice(0, 150);
  const tr = r => `<tr>
    <td><input type="checkbox" id="fi_inc_${r.n}" ${r.include ? 'checked' : ''} onchange="fiToggle(${r.n}, this.checked)" /></td>
    <td class="mono" style="font-size:10px">${esc(r.item == null ? r.n + 1 : r.item)}</td>
    <td class="mono" style="font-size:10.5px">${esc(r.container)}</td>
    <td style="font-size:10.5px">${esc(r.truckReg)}</td>
    <td><input type="date" id="fi_date_${r.n}" value="${esc(r.dateYmd || '')}" onchange="fiSetDate(${r.n}, this.value)" style="width:130px" /></td>
    <td class="mono" style="text-align:right">${r.amount ? r.amount.toLocaleString() : '—'}</td>
    <td style="font-size:10.5px;color:${r.status === 'error' ? 'var(--red,#c62828)' : 'var(--text-2)'}">${r.flags.map(esc).join('<br>')}</td></tr>`;
  openModal(`Import fuel report — ${esc(_fuelImport.fileName)}`, `
    <div id="fi_summary"></div>
    ${attention.length ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:6px">${attention.length} row${attention.length === 1 ? '' : 's'} to look at. Everything else is clean and will be imported as it is.</div>
    <div style="max-height:320px;overflow:auto;border:1px solid var(--border);border-radius:6px;margin-bottom:12px">
      <table class="data-table"><thead><tr><th></th><th>#</th><th>Container</th><th>Truck</th><th>Date</th><th style="text-align:right">PMT</th><th>Note</th></tr></thead>
      <tbody>${shown.map(tr).join('')}</tbody></table></div>
    ${attention.length > shown.length ? `<div style="font-size:10.5px;color:var(--text-3);margin-bottom:8px">Showing the first ${shown.length} of ${attention.length}.</div>` : ''}` : '<div style="font-size:12px;margin-bottom:12px">Every row looks clean.</div>'}
    <div style="font-size:10.5px;color:var(--text-3);margin-bottom:10px">Each row is saved as a fuel entry for that trip: the PMT amount goes in as the total paid, with no litres or price per litre (the report doesn't carry them).</div>
    <button class="submit-btn" id="fi_run" onclick="fiRun()">Import →</button>`);
  _frRenderSummary();
}

function fiToggle(n, checked) {
  const r = _fuelImport.rows[n]; if (!r) return;
  r.include = !!checked;
  _frRenderSummary();
}

function fiSetDate(n, value) {
  const r = _fuelImport.rows[n]; if (!r) return;
  const p = parseReportDate(value);
  if (!p || p.y < 2000 || p.y > 2100) { r.dateYmd = ''; r.include = false; }
  else { r.dateYmd = _frYmd(p); r.include = r.status !== 'dup'; if (r.status === 'error' && r.amount > 0) { r.status = 'fix'; r.flags = r.flags.filter(f => !/^Date /.test(f)); r.flags.push(`Date set to ${r.dateYmd}`); } }
  const cb = document.getElementById(`fi_inc_${n}`); if (cb) cb.checked = r.include;
  _frRenderSummary();
}

async function fiRun() {
  if (!_fuelImport) return;
  const rows = _fuelImport.rows.filter(r => r.include && r.dateYmd && r.amount > 0);
  if (!rows.length) return;
  const btn = document.getElementById('fi_run');
  if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }
  const dbRows = rows.map(r => {
    const [y, m, d] = r.dateYmd.split('-').map(Number);
    return {
      truck_id: r.truckId, driver_id: r.driverId,
      date: new Date(y, m - 1, d, 12, 0, 0).toISOString(),
      litres: 0, price_per_litre: 0, total_paid: r.amount,
      station: `${r.from || '?'} → ${r.to || '?'}`,
      receipt: `${_fuelImport.batchId}-${r.item == null ? r.n + 1 : r.item}`,
      truck_reg_text: r.truckId ? null : (r.truckReg || null),
      driver_name_text: r.driverId ? null : (r.driverName || null),
      container: r.container || null, ctype: r.ctype || null,
      route_from: r.from || null, route_to: r.to || null,
      source: 'import', import_batch_id: _fuelImport.batchId,
    };
  });
  let saved = 0, total = 0;
  try {
    for (let i = 0; i < dbRows.length; i += 200) {
      const chunk = dbRows.slice(i, i + 200);
      const { data, error } = await supabase.from('fuel_logs').insert(chunk).select();
      if (error) {
        const needsMigration = _ctMissingTable('fuel_logs', error);
        toast(needsMigration
          ? `Import stopped after ${saved} rows — the fuel table needs the database update (run supabase_clerk_tools_migration.sql). ${error.message}`
          : `Import stopped after ${saved} rows: ${error.message}`, 'error', 9000);
        break;
      }
      (data || []).forEach(rw => { state.db.fuel.push(fuelFromRow(rw)); saved++; total += Number(rw.total_paid) || 0; });
      if (btn) btn.textContent = `Importing… ${saved} / ${dbRows.length}`;
    }
  } catch (e) {
    toast(`Import failed: ${e.message || e}`, 'error', 7000);
  }
  if (saved) {
    addAudit(state.profile.username, 'Fuel Report Imported', `${saved} trip payments · KSh ${total.toLocaleString()} · ${_fuelImport.fileName}`);
    renderFuelTable(); renderFuelSummary();
    toast(`Imported ${saved} trip payment${saved === 1 ? '' : 's'}`, 'success', 5000);
    closeModal();
    _fuelImport = null;
  } else if (btn) { btn.disabled = false; _frRenderSummary(); }
}

/* ═════════════════════ 4. FUEL & TRIP PAYMENTS REPORT ═════════════════════
   Lives on the fuel page and recalculates by itself whenever a fuel entry is added,
   edited, deleted or imported (renderFuelSummary calls it). */
const _FREP = { range: 'all', from: '', to: '', by: 'truck' };
const _FREP_RANGES = [['all', 'All time'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['30', 'Last 30 days'], ['custom', 'Custom']];
const _FREP_GROUPS = [['truck', 'Truck'], ['driver', 'Driver'], ['route', 'Route'], ['size', 'Container size'], ['day', 'Day'], ['month', 'Month']];

function _frepBounds() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const at = (a, b, c) => new Date(a, b, c, 0, 0, 0, 0);
  const far = new Date(8.64e15), zero = new Date(0);
  switch (_FREP.range) {
    case 'today': return [at(y, m, d), at(y, m, d + 1)];
    case 'week': { const dow = (now.getDay() + 6) % 7; return [at(y, m, d - dow), at(y, m, d - dow + 7)]; }
    case 'month': return [at(y, m, 1), at(y, m + 1, 1)];
    case 'lastmonth': return [at(y, m - 1, 1), at(y, m, 1)];
    case '30': return [at(y, m, d - 29), at(y, m, d + 1)];
    case 'custom': {
      const f = _FREP.from ? new Date(_FREP.from + 'T00:00:00') : null, t = _FREP.to ? new Date(_FREP.to + 'T00:00:00') : null;
      return [f || zero, t ? new Date(t.getTime() + 86400000) : far];
    }
    default: return [zero, far];
  }
}

function _frepGroupKey(f) {
  const dt = new Date(f.date);
  const ymd = isNaN(dt) ? '—' : _frYmd({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() });
  switch (_FREP.by) {
    case 'driver': return fuelDriverLabel(f);
    case 'route': return f.source === 'import' ? `${f.routeFrom || '?'} → ${f.routeTo || '?'}` : (f.station || '—');
    case 'size': return f.ctype || 'Fuel fill (no container)';
    case 'day': return ymd;
    case 'month': return ymd.slice(0, 7);
    default: return fuelTruckLabel(f);
  }
}

function _frepRows() {
  const [lo, hi] = _frepBounds();
  const logs = (state.db.fuel || []).filter(f => { const d = new Date(f.date); return !isNaN(d) && d >= lo && d < hi; });
  const groups = new Map();
  logs.forEach(f => {
    const k = _frepGroupKey(f);
    const g = groups.get(k) || { label: k, entries: 0, amount: 0, litres: 0 };
    g.entries++; g.amount += fuelLogTotal(f); g.litres += Number(f.litres) || 0;
    groups.set(k, g);
  });
  const rows = [...groups.values()];
  if (_FREP.by === 'day' || _FREP.by === 'month') rows.sort((a, b) => a.label.localeCompare(b.label));
  else rows.sort((a, b) => b.amount - a.amount);
  return { logs, rows, total: logs.reduce((s, f) => s + fuelLogTotal(f), 0), litres: logs.reduce((s, f) => s + (Number(f.litres) || 0), 0) };
}

function renderFuelReport() {
  const host = document.getElementById('fuelReportPanel');
  if (!host) return;
  if (!document.getElementById('frep_results')) {
    host.innerHTML = `
      <div class="panel-head"><span class="panel-title">Fuel &amp; Trip Payments Report</span>
        <span class="panel-meta"><button type="button" class="modal-btn ghost" style="padding:2px 10px;font-size:10px" onclick="exportFuelReport()">Export to Excel</button> <button type="button" class="modal-btn ghost" style="padding:2px 10px;font-size:10px" onclick="exportFuelReport('print')">Print</button></span></div>
      <div style="padding:10px 14px 4px">
        <div id="frep_ranges" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>
        <div id="frep_custom" style="display:none;gap:8px;align-items:center;margin-bottom:8px;font-size:11px;color:var(--text-3)">
          From <input type="date" id="frep_from" onchange="frepSet('from', this.value)" /> to <input type="date" id="frep_to" onchange="frepSet('to', this.value)" />
        </div>
        <div id="frep_groups" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"></div>
      </div>
      <div id="frep_results" style="padding:0 14px 14px"></div>`;
  }
  const chip = (key, cur, label, fn) => `<button type="button" class="modal-btn ${key === cur ? '' : 'ghost'}" style="padding:3px 10px;font-size:10.5px" onclick="${fn}('${key}')">${label}</button>`;
  document.getElementById('frep_ranges').innerHTML = _FREP_RANGES.map(([k, l]) => chip(k, _FREP.range, l, 'frepRange')).join('');
  document.getElementById('frep_groups').innerHTML = '<span style="font-size:10.5px;color:var(--text-3);align-self:center">Group by</span>' + _FREP_GROUPS.map(([k, l]) => chip(k, _FREP.by, l, 'frepBy')).join('');
  document.getElementById('frep_custom').style.display = _FREP.range === 'custom' ? 'flex' : 'none';

  const r = _frepRows();
  const kpi = (label, val) => `<div style="flex:1;min-width:110px;background:var(--surface-2,rgba(255,255,255,.03));border:1px solid var(--border);border-radius:6px;padding:8px 10px"><div style="font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:var(--text-3)">${label}</div><div style="font-size:15px;font-weight:700;margin-top:2px">${val}</div></div>`;
  const kshFmt = n => 'KSh ' + Math.round(n).toLocaleString('en-KE');
  const out = document.getElementById('frep_results');
  if (!r.logs.length) { out.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:10px 0">No fuel entries in this period.</div>'; return; }
  out.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${kpi('Total paid', kshFmt(r.total))}${kpi('Entries', r.logs.length.toLocaleString())}${kpi('Average per entry', kshFmt(r.total / r.logs.length))}${r.litres ? kpi('Litres', Math.round(r.litres).toLocaleString() + ' L') : ''}
    </div>
    <div class="table-wrap" style="max-height:340px;overflow:auto"><table class="data-table">
      <thead><tr><th>${esc((_FREP_GROUPS.find(g => g[0] === _FREP.by) || [])[1] || '')}</th><th style="text-align:right">Entries</th><th style="text-align:right">Total (KSh)</th><th style="text-align:right">Avg / entry</th><th style="text-align:right">Share</th></tr></thead>
      <tbody>${r.rows.map(g => `<tr><td>${esc(g.label)}</td><td class="mono" style="text-align:right">${g.entries.toLocaleString()}</td><td class="mono" style="text-align:right">${Math.round(g.amount).toLocaleString('en-KE')}</td><td class="mono" style="text-align:right">${Math.round(g.amount / g.entries).toLocaleString('en-KE')}</td><td class="mono" style="text-align:right">${r.total ? (g.amount / r.total * 100).toFixed(1) : '0.0'}%</td></tr>`).join('')}
      <tr style="font-weight:700;border-top:2px solid var(--border)"><td>Total</td><td class="mono" style="text-align:right">${r.logs.length.toLocaleString()}</td><td class="mono" style="text-align:right">${Math.round(r.total).toLocaleString('en-KE')}</td><td></td><td></td></tr></tbody>
    </table></div>`;
}

function frepRange(k) { _FREP.range = k; renderFuelReport(); }
function frepBy(k) { _FREP.by = k; renderFuelReport(); }
function frepSet(which, v) { _FREP[which] = v; renderFuelReport(); }

function exportFuelReport(mode) {
  if (mode !== 'print' && typeof XLSX === 'undefined') { toast('Spreadsheet library still loading — try again in a moment', 'error'); return; }
  const r = _frepRows();
  if (!r.logs.length) { toast('Nothing to export for this period', 'warning'); return; }
  const by = (_FREP_GROUPS.find(g => g[0] === _FREP.by) || [])[1] || 'Group';
  const sum = [[by, 'Entries', 'Total (KSh)', 'Avg / entry (KSh)']].concat(r.rows.map(g => [g.label, g.entries, Math.round(g.amount * 100) / 100, Math.round(g.amount / g.entries)]));
  sum.push(['TOTAL', r.logs.length, Math.round(r.total * 100) / 100, Math.round(r.total / r.logs.length)]);
  const detail = [['Date', 'Truck', 'Driver', 'Container', 'Size/Type', 'From', 'To', 'Litres', 'KSh per litre', 'Total (KSh)', 'Station / route', 'Reference']].concat(
    r.logs.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map(f => [
      String(f.date).slice(0, 10), fuelTruckLabel(f), fuelDriverLabel(f), f.container || '', f.ctype || '', f.routeFrom || '', f.routeTo || '',
      Number(f.litres) || 0, Number(f.pricePerLitre) || 0, fuelLogTotal(f), f.station || '', f.receipt || '']));
  const top = ((window.GH_BRAND && GH_BRAND.lines) || ['GARGO HAVEN DEPOT LIMITED']).map(l => [l]).concat([['Fuel Report'], []]);   // same heading as invoices / interchanges
  if (mode === 'print') { if (window.GargoPrint) GargoPrint.sheets('Fuel Report', [{ title: 'By ' + by, rows: sum }, { title: 'Entries', rows: detail }]); return; }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(top.concat(sum)), `By ${by}`.slice(0, 31));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(top.concat(detail)), 'Entries');
  XLSX.writeFile(wb, `fuel_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ───────────── load the catalog + directory once someone has signed in ───────────── */
(function waitForSignIn() {
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    const signedIn = typeof state !== 'undefined' && state && state.currentUser && window.bookingDocs;
    if (signedIn) {
      clearInterval(timer);
      loadTariffCatalog();
      loadIncomingDrivers();
    } else if (tries > 600) clearInterval(timer);
  }, 1500);
})();