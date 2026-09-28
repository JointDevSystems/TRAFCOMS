'use strict';


const IDLE_TIMEOUT  = 15 * 60 * 1000;

const SUPABASE_URL = 'https://okisjizcyidvvwdwehaa.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9raXNqaXpjeWlkdnZ3ZHdlaGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTYzNjMsImV4cCI6MjA5ODM5MjM2M30.O_0EeK297a07B7FLunpWr6HDlqrfP5Z8Owyp3qE4hQE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const labels={ available:'Available', on_trip:'On Trip', maintenance:'Maintenance', breakdown:'Breakdown', off_duty:'Off Duty', grounded:'Grounded', active:'Active', completed:'Completed', delayed:'Delayed', pending:'Pending', approved:'Approved', rejected:'Rejected', fulfilled:'Fulfilled', overdue:'Overdue', draft:'Draft', sent:'Sent', paid:'Paid', partial:'Partial', critical:'Critical', in_progress:'In Progress', reported:'Reported', diagnosed:'Diagnosed', suspended:'Suspended', reconciled:'Reconciled', open:'Open', resolved:'Resolved', redelivery:'Redelivery', loaded:'Loaded', offloaded:'Offloaded', staged:'Staged', shutout:'Shutout', cancelled:'Cancelled', awaiting_approval:'Awaiting Approval' };
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

function canFinance() { return isAdmin() || currentRole() === 'finance'; }

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

function fillSelect(id, arr, mapFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<option value="">Select…</option>` + arr.map(i=>{ const [v,l]=mapFn(i); return `<option value="${v}">${l}</option>`; }).join('');
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

function fillDatalist(id, arr, mapFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = arr.map(i => `<option value="${esc(mapFn(i))}"></option>`).join('');
}


function normalizeRowKeys(rows) {
  return rows.map(r => {
    const norm = {};
    Object.entries(r || {}).forEach(([k, v]) => {
      const key = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      // Strip stray wrapping double-quotes (straight or curly) left over from CSV exports,
      // so "PIL" matches the line PIL and "MSCU1234567" is a valid container number.
      if (key) norm[key] = typeof v === 'string' ? v.trim().replace(/^["\u201C\u201D]+|["\u201C\u201D]+$/g, '').trim() : (v == null ? '' : v);
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

function updateBulkDirectionLabel() {
  const isOut = document.getElementById('iw_bulk_direction').value === 'out';
  document.getElementById('iw_bulk_direction_label').textContent = isOut ? 'Gate-Out' : 'Gate-In';
}

// ── CSV parsing ──────────────────────────────────────────────────────────
// RFC-4180 style parser. The old importers used line.split(','), which (a) kept
// the literal quote characters around every value ("PIL" never equals PIL, so no
// shipping line ever matched) and (b) shifted every column after a comma inside
// a quoted field. Handles quotes, escaped "" quotes, commas/newlines inside
// quotes, CRLF and a UTF-8 BOM.
function parseCsvText(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"' && field.trim() === '') { inQ = true; field = ''; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* ignore — \n ends the row */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

function csvTextToRows(text) {
  const grid = parseCsvText(text);
  if (grid.length < 2) return [];
  const headers = grid[0].map(h => String(h).trim());
  return grid.slice(1).map(cells => {
    const o = {};
    headers.forEach((h, i) => { if (h) o[h] = cells[i] != null ? String(cells[i]).trim() : ''; });
    return o;
  });
}

// Matches free text from an import file to a shipping line by code, name or id,
// ignoring case, spaces, hyphens and quotes ("A-S" = "A S" = "as").
function findShippingLineByText(text) {
  const raw = String(text == null ? '' : text).trim();
  if (!raw) return null;
  const ALIASES = { 'TERMCO': 'TMT' };
  const resolved = ALIASES[raw.toUpperCase()] || raw;
  const n = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const target = n(resolved);
  if (!target) return null;
  return (state.db.shippingLines || []).find(l => l.id === resolved || n(l.code) === target || n(l.name) === target) || null;
}

// A 10,000-row import can flag thousands of rows; rendering all of them in a
// modal freezes the page. Show the first `max` and summarise the rest.
function flaggedPreview(list, max = 200) {
  return list.length > max
    ? [...list.slice(0, max), `…and ${list.length - max} more — open the Depot Report and look for rows marked ⚠`]
    : list;
}

function pickField(r, keys) {
  for (const k of keys) { if (r[k] != null && String(r[k]).trim() !== '') return String(r[k]).trim(); }
  return '';
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

/* ──────────────────────────────────────────────────────────────────
   § 28  ADMIN ACTION GUARD (vault/PIN flows removed — admin role only)
────────────────────────────────────────────────────────────────── */
function requireAdminAction(callback, actionKey) {
  if (isAdmin()) { callback(); return; }
  toast('Admin rights required for this action', 'error');
}

function adminDeleteBtn(table, id) {
  // Deletion is disabled by policy — admins can edit/correct records but not
  // remove them outright, so this always renders nothing now.
  return '';
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

function sbadgeText(status) {
  const labels={ available:'Available', on_trip:'On Trip', maintenance:'Maintenance', breakdown:'Breakdown', off_duty:'Off Duty', grounded:'Grounded', active:'Active', completed:'Completed', delayed:'Delayed', pending:'Pending', approved:'Approved', rejected:'Rejected', fulfilled:'Fulfilled', overdue:'Overdue', draft:'Draft', sent:'Sent', paid:'Paid', partial:'Partial' };
  return labels[status] || status || '';
}

function populateSelects() {
  fillSelect('f_truck',  state.db.trucks,  t=>[t.id, `${t.reg} — ${t.make}`]);
  fillSelect('f_driver', state.db.drivers, d=>[d.id, d.name]);
  refreshContainerHistory();
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

const CONTAINER_TYPE_OPTIONS = ['20ft Dry', '40ft Dry', '20ft HC', '40ft HC', '20ft Reefer', '40ft Reefer', 'Flat Rack', 'Open Top', 'Tank', 'Hazmat', 'Heavy Duty', 'LCL', 'Platform', 'LC (Unspecified)'];

const CARGO_STATUS_OPTIONS = ['Empty', 'Laden / Full', 'Part Load', 'Damaged Cargo'];

// Size + Type are derived from CONTAINER_TYPE_OPTIONS rather than a separate
// hardcoded list, so the Dispatch/Inward "Size" + "Type" selects can never
// produce a combination that the rest of the app (reports, filters, bulk
// import matching) doesn't already recognise as a valid container type.
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