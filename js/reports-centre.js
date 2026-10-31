'use strict';

(function () {
  if (typeof state === 'undefined' || !state.db) { console.error('report-centre.js needs the Gargo core scripts first'); return; }
  const $ = id => document.getElementById(id);
  const e = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const IN_TYPES = ['Gate-In', 'Depot-In'], OUT_TYPES = ['Gate-Out', 'Depot-Out'];
  const LS = 'gargo-rc', LSV = 'gargo-rc-views', CO = 'GARGO HAVEN DEPOT LTD', DAY = 86400000;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const RC = window.ReportCentre = { cur: 'daily_in', last: null, dirty: false, S: { lay: {} } };

  /* ───────────────────────── small helpers ───────────────────────── */
  const pad = n => String(n).padStart(2, '0');
  const ts = d => (d == null || d === '' ? NaN : (typeof d === 'number' ? d : Date.parse(d)));
  const dObj = d => { const x = new Date(d); return isNaN(x) ? null : x; };
  function fd(d, style) {
    const x = dObj(d); if (!x) return '';
    if (style === 'mdy') return pad(x.getMonth() + 1) + '/' + pad(x.getDate()) + '/' + x.getFullYear();
    if (style === 'mon') return MON[x.getMonth()] + ' ' + pad(x.getDate()) + ' ' + x.getFullYear();
    return pad(x.getDate()) + '/' + pad(x.getMonth() + 1) + '/' + x.getFullYear();
  }
  const ft = d => { const x = dObj(d); return x ? pad(x.getHours()) + ':' + pad(x.getMinutes()) : ''; };
  const isoOf = x => x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  const todayIso = () => isoOf(new Date());
  const addDays = (iso, n) => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + n); return isoOf(x); };
  const dayStart = iso => new Date(iso + 'T00:00:00').getTime();
  const dayEnd = iso => new Date(iso + 'T23:59:59.999').getTime();
  const fIso = (iso, style) => (iso ? fd(iso + 'T12:00:00', style) : '');
  const num2 = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const key = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const up = s => String(s == null ? '' : s).toUpperCase();
  const sty = (f, def) => (f.dfmt && f.dfmt !== 'auto' ? f.dfmt : def);
  const txt = c => (c && typeof c === 'object' ? c.t : c);
  const val = c => (c && typeof c === 'object' ? c.v : c);
  const N = (v, t) => ({ v: Number(v) || 0, t: t != null ? t : num2(v) });
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (x) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (x) {} };
  const userName = () => (state.profile && state.profile.username) || '';
  const regOf = id => { const t = (state.db.trucks || []).find(x => x.id === id); return t ? t.reg : ''; };
  const drvOf = id => { const d = (state.db.drivers || []).find(x => x.id === id); return d ? d.name : ''; };

  /* container size + type as the old reports print them: 20 / 40, HD HC OT LC FR RF ... */
  const TYPES = ['HD', 'HC', 'OT', 'LC', 'FR', 'RF', 'TK', 'PL', 'HZ'];
  const W = (code, word) => new RegExp('(?:^|[^a-z])' + code + '(?![a-z])' + (word ? '|' + word : ''), 'i');
  const RX = { HC: W('hc', 'high\\s*cube|(?:^|[^a-z])hq(?![a-z])'), OT: W('ot', 'open\\s*top'), FR: W('fr', 'flat\\s*rack'), RF: W('rf', 'reefer'), TK: W('tk', 'tank'), PL: W('pl', 'platform'), HZ: W('hz', 'hazmat'), LC: W('lc', 'lcl') };
  const stCache = new Map();
  function sizeType(ctype, iso) {
    const ck = ctype + '|' + iso, hit = stCache.get(ck); if (hit) return hit;
    const s = String(ctype || ''), m = s.match(/(20|40|45)/), I = String(iso || '').toUpperCase();
    let size = m ? (m[1] === '45' ? '40' : m[1]) : '';
    if (!size && I) size = I[0] === '2' ? '20' : (I[0] === '4' || I[0] === 'L' ? '40' : '');
    let type = null;
    ['HC', 'OT', 'FR', 'RF', 'TK', 'PL', 'HZ', 'LC'].some(t => { if (RX[t].test(s)) { type = t; return true; } return false; });
    if (!type && I.length > 2) type = I[1] === '5' ? 'HC' : ({ R: 'RF', U: 'OT', P: 'FR', T: 'TK' }[I[2]] || null);
    const r = { size, type: type || 'HD' }; stCache.set(ck, r); return r;
  }
  const lines = () => state.db.shippingLines || [];
  const lineOf = id => lines().find(l => l.id === id) || null;
  const lineLabel = id => { const l = lineOf(id); return l ? up(l.name || l.code) : 'NO LINE ASSIGNED'; };
  const ORD1 = ['HD', 'OT', 'LC', 'HC', 'FR', 'RF', 'TK', 'PL', 'HZ'];
  const stOrd = (a, b) => { const x = String(a[0]).split(' '), y = String(b[0]).split(' '); return (Number(x[0] || 99) - Number(y[0] || 99)) || (TYPES.indexOf(x[1]) - TYPES.indexOf(y[1])); };

  const lorryOf = ic => [ic.truckRegText || (ic.truck ? regOf(ic.truck) : ''), ic.trailerNo].filter(Boolean).join(' / ');
  const driverOf = ic => ic.driverNameText || (ic.driver ? drvOf(ic.driver) : '') || '';
  const repairText = ic => {
    const r = (ic.repairs || []).map(x => up(x.item || x.code)).filter(Boolean);
    if (r.length) return r.join(', ');
    return ic.condition && !/^(good|available|food grade|repat|sale|shipper)$/i.test(ic.condition) ? up(ic.condition) : '';
  };
  const domText = d => { if (!d) return ''; const s = String(d); if (/^\d{4}-\d{2}/.test(s)) return s.slice(5, 7) + '/' + s.slice(0, 4); return up(s); };

  /* WASH = cleaning only (or no repairs)  SWASH = steam / chemical wash  MINOR = repairs up to N labour hours  MAJOR = above N */
  const isClean = r => /wash|clean|steam|chemical|debris|sweep|degrease/i.test((r.item || '') + ' ' + (r.category || ''));
  function condClass(ic, minorMax) {
    if (ic.surveyStatus === 'awaiting_survey') return 'UNSURVEYED';
    const items = ic.repairs || [];
    if (!items.length) return 'WASH';
    const rep = items.filter(r => !isClean(r));
    if (rep.length) return rep.reduce((s, r) => s + Number(r.hours || 0), 0) > minorMax ? 'MAJOR' : 'MINOR';
    return items.some(r => /steam|chemical/i.test((r.item || '') + ' ' + (r.code || ''))) ? 'SWASH' : 'WASH';
  }
  const COND = [['WASH', 'WASH'], ['SWASH', 'SWASH'], ['MINOR', 'MINOR'], ['MAJOR', 'MAJOR'], ['UNSURVEYED', 'Not surveyed']];

  /* money: survey-currency.js (GargoMoney) knows the currencies and labour rates */
  const GM = () => window.GargoMoney || null;
  const sym = c => (GM() ? GM().sym(c) : (c === 'KES' ? 'KSh' : (c || 'USD')));
  const moneyStr = by => { const k = Object.keys(by).filter(c => by[c]); return k.length ? k.map(c => sym(c) + ' ' + num2(by[c])).join(' + ') : '0.00'; };
  function repairCost(ic) {
    const by = {}; let hrs = 0, items = 0;
    (ic.repairs || []).forEach(r => {
      const cur = GM() ? GM().itemCur(r) : (r.currency || 'KES');
      const rate = GM() ? GM().labourRate(cur) : (cur === 'KES' ? 300 : 0);
      by[cur] = (by[cur] || 0) + Number(r.material || 0) + Number(r.hours || 0) * rate;
      hrs += Number(r.hours || 0); items++;
    });
    return { by, hrs, items };
  }
  /* what a line charges per container for a service. Falls back to the line's own 20 / 40 / HC columns for lift. */
  function rateOf(line, st, basis) {
    if (!line) return { amount: 0, cur: 'USD' };
    let r = null; try { if (typeof lineServiceRates === 'function') r = lineServiceRates(line, basis); } catch (x) {}
    const raw = r ? (st.size === '20' ? r['20ft'] : r['40ft']) : null;
    let a = raw == null ? NaN : Number(raw);
    if (!isFinite(a) && (!basis || basis === 'lolo')) a = Number(st.size === '20' ? line.rate20 : (st.type === 'HC' && line.rateHC ? line.rateHC : line.rate40));
    const cur = (line.rates && line.rates[basis] && line.rates[basis].currency) || line.currency || 'USD';
    return { amount: isFinite(a) ? a : 0, cur };
  }

  /* ───────────────────────── data: index, visits, trips ───────────────────────── */
  async function ensureData(rep, f) {
    if (!(window.ICR && ICR.enabled) || rep.needs === 'none') return;
    try {
      if (rep.needs === 'history') {
        const t = f._tok;
        if (t.length && t.every(x => x.length >= 10) && t.length <= 40) { for (const x of t) await ICR.byContainer(x); return; }
        await ICR.ensureAll(null); return;
      }
      await ICR.ensureAll(rep.needs === 'all' ? null : new Date(dayStart(f.from)).toISOString());
    } catch (x) { console.warn('Report Centre: could not load records', x); if (typeof toast === 'function') toast('Could not load all records. The report may be incomplete.', 'error', 6000); }
  }
  function makeCtx() {
    const idx = new Map();
    (state.db.interchange || []).forEach(ic => {
      const k = key(ic.container); if (!k) return;
      const isIn = IN_TYPES.indexOf(ic.type) > -1, isOut = OUT_TYPES.indexOf(ic.type) > -1; if (!isIn && !isOut) return;
      let h = idx.get(k); if (!h) idx.set(k, h = { ins: [], outs: [] });
      (isIn ? h.ins : h.outs).push(ic);
    });
    const visits = [], vmap = new Map();
    idx.forEach((h, k) => {
      h.ins.sort((a, b) => ts(a.date) - ts(b.date)); h.outs.sort((a, b) => ts(a.date) - ts(b.date));
      h.ins.forEach((inn, i) => {
        const at = ts(inn.date), nextIn = h.ins[i + 1] ? ts(h.ins[i + 1].date) : Infinity;
        const out = h.outs.find(o => { const t = ts(o.date); return t >= at - 1000 && t < nextIn; }) || null;
        const outAt = out ? ts(out.date) : (inn.dateOut ? ts(inn.dateOut) : Infinity);
        const v = { k, inn, out, at, outAt: isNaN(outAt) ? Infinity : outAt, st: sizeType(inn.ctype, inn.isoCode) };
        visits.push(v); vmap.set(inn.id, v);
      });
    });
    const tripsBy = new Map();
    (state.db.trips || []).forEach(t => { if (!t.container || typeof isOutwardWorkType !== 'function' || !isOutwardWorkType(t.workType)) return; const k = key(t.container); (tripsBy.get(k) || tripsBy.set(k, []).get(k)).push(t); });
    return { idx, visits, vmap, tripsBy };
  }
  const inFor = (h, outTs) => { if (!h) return null; let best = null; for (const i of h.ins) { if (ts(i.date) <= outTs + 1000) best = i; else break; } return best || h.ins[h.ins.length - 1] || null; };
  const tripFor = (list, outTs) => { let best = null, gap = 1e15; (list || []).forEach(t => { const g = Math.abs(ts(t.dateOut || t.startTime) - outTs); if (g < gap && g <= 3 * DAY) { best = t; gap = g; } }); return best; };

  /* one normalised row per record, so every filter works the same way on every report */
  function norm(ic) {
    const st = sizeType(ic.ctype, ic.isoCode), isIn = IN_TYPES.indexOf(ic.type) > -1;
    return { ic, at: ts(ic.date), container: up(ic.container), line: ic.line || '', size: st.size, type: st.type, st, move: ic.type,
      eir: up(ic.eirNumber), vessel: up(ic.vessel), voyage: up(ic.voyage), party: up(isIn ? ic.deliveringParty : ic.receivingParty),
      transporter: up(ic.transporter), lorry: up(lorryOf(ic)), driver: up(driverOf(ic)),
      ref: up(isIn ? (ic.guaranteeNo || ic.blNumber) : (ic.releaseOrderNo || ic.blNumber)), clerk: up(ic.clerkName),
      zone: up([ic.storageZone, ic.storageBlock, ic.storageSlot].filter(Boolean).join('-')) };
  }
  function enrichIn(ic, ctx) {
    const o = norm(ic), v = ctx.vmap.get(ic.id);
    o.visit = v || null; o.out = v ? v.out : null; o.outAt = v ? v.outAt : Infinity; o.inYard = !isFinite(o.outAt);
    o.days = Math.max(0, Math.floor(((isFinite(o.outAt) ? Math.min(o.outAt, Date.now()) : Date.now()) - o.at) / DAY));
    o.dom = domText(ic.manufactureDate); o.remarks = repairText(ic); o.gno = up(ic.guaranteeNo || ic.blNumber);
    return o;
  }
  function enrichOut(ic, ctx) {
    const o = norm(ic), k = key(ic.container), inn = inFor(ctx.idx.get(k), o.at), tr = tripFor(ctx.tripsBy.get(k), o.at);
    o.inn = inn; o.trip = tr;
    o.eir = up(ic.eirNumber || (tr && tr.eirNumber)); o.party = up(ic.receivingParty || (tr && tr.receivingParty));
    o.vessel = up(ic.vessel || (inn && inn.vessel) || (tr && tr.vessel)); o.voyage = up(ic.voyage || (inn && inn.voyage) || (tr && tr.voyage));
    o.ref = up(ic.releaseOrderNo || (tr && tr.releaseOrderNo) || ic.blNumber); o.transporter = up(ic.transporter || (inn && inn.transporter));
    o.lorry = up(lorryOf(ic) || (tr && tr.truckId ? regOf(tr.truckId) : '')); o.driver = up(driverOf(ic) || (tr && tr.driverId ? drvOf(tr.driverId) : ''));
    o.dest = up(tr && tr.dest); o.dateIn = inn ? ts(inn.date) : NaN; o.inEir = inn ? up(inn.eirNumber) : '';
    o.days = inn && isFinite(o.dateIn) ? Math.max(0, Math.floor((o.at - o.dateIn) / DAY)) : null;
    o.remarks = up(ic.notes && !/^(auto|bulk)/i.test(ic.notes) ? ic.notes : '');
    return o;
  }
  /* outward dispatch trips that have no Gate-Out record of their own still count as a release */
  function synthTrips(f, ctx, a, b, have) {
    const out = [];
    ctx.tripsBy.forEach((list, k) => list.forEach(t => {
      const at = ts(t.dateOut || t.startTime); if (!(at >= a && at <= b)) return;
      if (have.has(k + '|' + new Date(at).toDateString())) return;
      const st = sizeType(t.ctype), inn = inFor(ctx.idx.get(k), at);
      const o = { ic: null, trip: t, inn, synth: true, at, container: up(t.container), line: t.shippingLine || '', size: st.size, type: st.type, st, move: 'Dispatch',
        eir: up(t.eirNumber), vessel: up(t.vessel || (inn && inn.vessel)), voyage: up(t.voyage || (inn && inn.voyage)), party: up(t.receivingParty), ref: up(t.releaseOrderNo),
        transporter: up(inn && inn.transporter), lorry: up(t.truckId ? regOf(t.truckId) : ''), driver: up(t.driverId ? drvOf(t.driverId) : ''), clerk: '', zone: '',
        dest: up(t.dest), dateIn: inn ? ts(inn.date) : NaN, inEir: inn ? up(inn.eirNumber) : '', remarks: up(t.notes) };
      o.days = inn ? Math.max(0, Math.floor((at - o.dateIn) / DAY)) : null;
      if (pass(f, o)) out.push(o);
    }));
    return out;
  }

  /* ───────────────────────── filters ───────────────────────── */
  const tokens = f => String(f.container || '').toUpperCase().split(/[\s,;]+/).map(key).filter(Boolean);
  const hasTxt = (hay, needle) => !needle || String(hay == null ? '' : hay).toLowerCase().indexOf(String(needle).toLowerCase()) > -1;
  const numOk = v => v !== '' && v != null && isFinite(Number(v));
  function pass(f, o) {
    if (f.line && f.line.length && !f.line.some(l => (l === '__none__' ? !o.line : o.line === l))) return false;
    if (f.size && f.size.length && f.size.indexOf(o.size) < 0) return false;
    if (f.type && f.type.length && f.type.indexOf(o.type) < 0) return false;
    if (f.move && f.move.length && o.move && f.move.indexOf(o.move) < 0) return false;
    if (f._tok && f._tok.length) { const k = key(o.container); if (!f._tok.some(t => k.indexOf(t) > -1)) return false; }
    const T = ['eir', 'vessel', 'voyage', 'party', 'transporter', 'lorry', 'driver', 'ref', 'clerk', 'zone'];
    for (let i = 0; i < T.length; i++) if (f[T[i]] && !hasTxt(o[T[i]], f[T[i]])) return false;
    if (f.status && !hasTxt(o.status, f.status)) return false;
    if (f.reason && !hasTxt(o.reason, f.reason)) return false;
    if (f.q) { const q = o._q || (o._q = [o.container, o.eir, o.vessel, o.voyage, o.party, o.transporter, o.lorry, o.driver, o.ref, o.clerk, o.zone, o.remarks, o.dest, o.status, o.reason, o.move, lineLabel(o.line)].join(' ').toLowerCase()); if (q.indexOf(String(f.q).toLowerCase()) < 0) return false; }
    if (f.yard && f.yard !== 'all' && o.inYard !== undefined && (f.yard === 'in') !== o.inYard) return false;
    if (numOk(f.minDays) && o.days != null && o.days < Number(f.minDays)) return false;
    if (numOk(f.maxDays) && o.days != null && o.days > Number(f.maxDays)) return false;
    const ic = o.ic;
    if (ic) {
      if (f.flagged === 'only' && !(ic.flaggedForReview || ic.duplicateOfId)) return false;
      if (f.flagged === 'exclude' && (ic.flaggedForReview || ic.duplicateOfId)) return false;
      if (IN_TYPES.indexOf(o.move) > -1) {
        if (f.survey === 'awaiting' && ic.surveyStatus !== 'awaiting_survey') return false;
        if (f.survey === 'done' && (!ic.surveyStatus || ic.surveyStatus === 'awaiting_survey')) return false;
        if (f.cond && f.cond.length && f.cond.indexOf(condClass(ic, numOk(f.minor) ? Number(f.minor) : 4)) < 0) return false;
      }
    }
    return true;
  }
  function sortRows(rows, f, keys, defKey) {
    const k = keys[f.sort] ? f.sort : defKey, g = keys[k], dir = f.dir === 'desc' ? -1 : 1;
    return rows.slice().sort((x, y) => {
      const a = g(x), b = g(y); let c;
      if (typeof a === 'number' && typeof b === 'number') c = (isNaN(a) ? 1e18 : a) - (isNaN(b) ? 1e18 : b);
      else c = String(a).localeCompare(String(b), undefined, { numeric: true });
      return c ? dir * c : String(x.container || '').localeCompare(String(y.container || ''));
    });
  }
  const SORT_IC = { date: r => r.at, container: r => r.container, line: r => lineLabel(r.line), size: r => Number(r.size || 99), eir: r => r.eir, vessel: r => r.vessel, party: r => r.party, transporter: r => r.transporter, days: r => (r.days == null ? -1 : r.days) };
  const SORT_OPTS = [['date', 'Date'], ['container', 'Container No.'], ['line', 'Shipping line'], ['size', 'Size'], ['eir', 'EIR No.'], ['vessel', 'Vessel'], ['party', 'Party'], ['transporter', 'Transporter'], ['days', 'Days in yard']];

  /* group definitions shared by the list reports */
  const GRP = {
    none: { l: 'No grouping', fn: () => '' },
    sizetype: { l: 'Size & type', fn: r => (r.size + ' ' + r.type).trim(), ord: stOrd },
    size: { l: 'Size', fn: r => (r.size ? r.size : 'n/a'), ord: (a, b) => Number(a[0]) - Number(b[0]) },
    line: { l: 'Shipping line', fn: r => lineLabel(r.line) },
    date: { l: 'Date', fn: r => fd(r.at, 'dmy'), ord: (a, b) => a[1][0].at - b[1][0].at },
    vessel: { l: 'Vessel', fn: r => r.vessel || '(none)' },
    transporter: { l: 'Transporter', fn: r => r.transporter || '(none)' },
    party: { l: 'Party', fn: r => r.party || '(none)' },
    move: { l: 'Movement', fn: r => r.move || '' },
    cond: { l: 'Condition class', fn: r => r.cls || '' },
    status: { l: 'Status', fn: r => r.status || '(none)' },
    reason: { l: 'Reason', fn: r => r.reason || '(none)' },
    bucket: { l: 'Days in yard band', fn: r => r.band || '', ord: (a, b) => a[1][0].days - b[1][0].days },
  };
  const grpOpts = ids => ids.map(i => [i, GRP[i].l]);

  /* ───────────────────────── table model ─────────────────────────
     table = { title?, head[], align[] ('' | 'n' | 'wrap'), numbered, hideLabels, box, pb, groups:[{label, rows:[cells], foot?}], foot?, empty? }
     foot = { text, span?, cells? }   cell = string | number | {v, t}  (v = raw number for Excel, t = text shown) */
  function makeList(rows, cols, o) {
    o = o || {};
    const gm = new Map(), G = GRP[o.group] || GRP.none;
    rows.forEach(r => { const g = G.fn(r); (gm.get(g) || gm.set(g, []).get(g)).push(r); });
    let ents = [...gm.entries()]; if (G.ord) ents.sort(G.ord); else if (o.group && o.group !== 'none') ents.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return { head: cols.map(c => c.h), align: cols.map(c => (c.num ? 'n' : (c.wrap ? 'wrap' : ''))), numbered: o.numbered !== false, hideLabels: !!o.hideLabels, box: !!o.box, title: o.title, pb: o.pb, empty: o.empty,
      groups: ents.map(([label, rs]) => ({ label, rows: rs.map(r => cols.map(c => c.get(r))), foot: o.foot ? o.foot(label, rs) : null })), foot: o.grand ? o.grand(rows) : null };
  }
  const pickCols = (rep, f) => { const sel = f.cols && f.cols.length ? f.cols : null; return rep.cols.filter(c => (sel ? sel.indexOf(c.k) > -1 : c.on)); };
  const subFoot = g => (g.id !== 'sizetype' && g.id !== 'none' ? (label, rs) => ({ text: 'Sub-total : ' + rs.length }) : null);
  const lineText = f => {
    if (!f.line || !f.line.length) return 'ALL SHIPPING LINES';
    const n = f.line.map(l => (l === '__none__' ? 'NO LINE ASSIGNED' : lineLabel(l)));
    return n.length > 3 ? n.slice(0, 3).join(', ') + ' + ' + (n.length - 3) + ' more' : n.join(', ');
  };
  const hdrSty = f => sty(f, 'mdy');
  const hdrDefault = f => [['Agent / Line', lineText(f)], ['Report No', f.no || ''], ['From Date', fIso(f.from, hdrSty(f))], ['To Date', fIso(f.to, hdrSty(f))]];

  /* ───────────────────────── report builders ───────────────────────── */
  const C = (k, h, get, x) => Object.assign({ k, h, get }, x || {});
  const IN_COLS = [
    C('date', 'Date In', r => fd(r.at, r.sty), { on: 1 }), C('party', 'Deliver Party', r => r.party, { on: 1 }), C('container', 'Cont No.', r => r.container, { on: 1 }),
    C('size', 'Size', r => r.size, { on: 1 }), C('type', 'Type', r => r.type, { on: 1 }), C('eir', 'EIR No.', r => r.eir, { on: 1 }), C('dom', 'DOM', r => r.dom, { on: 1 }),
    C('remarks', 'Remarks', r => r.remarks, { on: 1, wrap: 1 }), C('lorry', 'Lorry No.', r => r.lorry, { on: 1 }), C('vessel', 'Vessel', r => r.vessel, { on: 1 }),
    C('voyage', 'Voyage', r => r.voyage, { on: 1 }), C('gno', 'GNo.', r => r.gno, { on: 1 }), C('transporter', 'Transporter', r => r.transporter, { on: 1 }),
    C('time', 'Time In', r => ft(r.at)), C('line', 'Line', r => lineLabel(r.line)), C('driver', 'Driver', r => r.driver), C('clerk', 'Clerk', r => r.clerk), C('zone', 'Yard Slot', r => r.zone),
    C('iso', 'ISO', r => up(r.ic && r.ic.isoCode)), C('weight', 'Gross Wt', r => (r.ic && r.ic.grossWeight) || ''), C('cargo', 'Cargo', r => up(r.ic && r.ic.cargoStatus)),
    C('days', 'Days in Yard', r => r.days, { num: 1 }), C('yard', 'In Yard?', r => (r.inYard ? 'YES' : 'NO')),
  ];
  const OUT_COLS = [
    C('date', 'Date Out', r => fd(r.at, r.sty), { on: 1 }), C('eir', 'Out EIR No.', r => r.eir, { on: 1 }), C('container', 'Container No.', r => r.container, { on: 1 }),
    C('party', 'Collecting Party', r => r.party, { on: 1 }), C('vessel', 'Vessel', r => r.vessel, { on: 1 }), C('voyage', 'Voy', r => r.voyage, { on: 1 }),
    C('ref', 'Release Order No', r => r.ref, { on: 1 }), C('datein', 'Date In', r => (isFinite(r.dateIn) ? fd(r.dateIn, r.sty) : ''), { on: 1 }), C('ineir', 'In EIR No', r => r.inEir, { on: 1 }),
    C('dest', 'Final Destination', r => r.dest, { on: 1 }), C('transporter', 'Transporter', r => r.transporter, { on: 1 }), C('lorry', 'Lorry No', r => r.lorry, { on: 1 }),
    C('driver', 'Driver', r => r.driver, { on: 1 }), C('remarks', 'Remarks', r => r.remarks, { on: 1, wrap: 1 }),
    C('time', 'Time Out', r => ft(r.at)), C('line', 'Line', r => lineLabel(r.line)), C('size', 'Size', r => r.size), C('type', 'Type', r => r.type), C('clerk', 'Clerk', r => r.clerk),
    C('days', 'Days in Yard', r => r.days, { num: 1 }), C('outtype', 'Outward Type', r => up(outwardTypeLabel(r.trip && r.trip.outwardType))), C('source', 'Source', r => (r.synth ? 'DISPATCH TRIP' : 'GATE-OUT')),
  ];
  function dailyBuild(isIn) {
    return function (f, ctx) {
      const a = dayStart(f.from), b = dayEnd(f.to), types = isIn ? IN_TYPES : OUT_TYPES, s = sty(f, 'dmy'), have = new Set();
      let rows = [];
      (state.db.interchange || []).forEach(ic => {
        if (types.indexOf(ic.type) < 0) return; const at = ts(ic.date); if (!(at >= a && at <= b)) return;
        if (!isIn) have.add(key(ic.container) + '|' + new Date(at).toDateString());
        const o = isIn ? enrichIn(ic, ctx) : enrichOut(ic, ctx); if (!pass(f, o)) return; o.sty = s; rows.push(o);
      });
      if (!isIn) synthTrips(f, ctx, a, b, have).forEach(o => { o.sty = s; rows.push(o); });
      rows = sortRows(rows, f, SORT_IC, 'date');
      const rep = REP[isIn ? 'daily_in' : 'daily_out'], gid = GRP[f.group] ? f.group : 'sizetype';
      return { title: 'Daily Container Report', badge: isIn ? 'IN' : 'OUT', count: rows.length, landscape: true,
        tables: [makeList(rows, pickCols(rep, f), { group: gid, foot: subFoot({ id: gid }), grand: rs => ({ text: 'Total Containers : ' + rs.length }) })] };
    };
  }

  const LIFT_COLS = (m, f) => {
    const on = m === 'on', both = m === 'both';
    return [C('container', 'CONT. NO', r => r.container, { on: 1 }), C('size', 'SIZE', r => r.size, { on: 1 }), C('type', 'TYPE', r => r.type, { on: 1 }),
      C('lift', 'LIFT', r => (r.lift === 'on' ? 'ON' : 'OFF'), { on: both }), C('date', both ? 'DATE' : (on ? 'DATE' : 'DATE IN'), r => fd(r.at, r.sty), { on: 1 }),
      C('eir', both ? 'EIR' : (on ? 'OUT EIR' : 'IN EIR'), r => r.eir, { on: 1 }), C('vessel', 'VESSEL', r => r.vessel, { on: 1 }), C('voyage', 'VOY', r => r.voyage, { on: 1 }),
      C('ref', 'REFERENCE', r => r.ref, { on: 1 }), C('line', 'LINE', r => lineLabel(r.line)), C('party', 'PARTY', r => r.party), C('transporter', 'TRANSPORTER', r => r.transporter), C('lorry', 'LORRY', r => r.lorry),
      C('driver', 'DRIVER', r => r.driver), C('days', 'DAYS IN YARD', r => r.days, { num: 1 }), C('amount', 'AMOUNT', r => r.amtCell, { on: 1, num: 1 })];
  };
  function liftBuild(f, ctx) {
    const a = dayStart(f.from), b = dayEnd(f.to), s = sty(f, 'mon'), m = f.lift || 'on', modes = m === 'both' ? ['on', 'off'] : [m], have = new Set();
    let rows = [];
    modes.forEach(md => {
      (state.db.interchange || []).forEach(ic => {
        if ((md === 'on' ? OUT_TYPES : IN_TYPES).indexOf(ic.type) < 0) return; const at = ts(ic.date); if (!(at >= a && at <= b)) return;
        if (md === 'on') have.add(key(ic.container) + '|' + new Date(at).toDateString());
        const o = md === 'on' ? enrichOut(ic, ctx) : enrichIn(ic, ctx); if (!pass(f, o)) return; o.lift = md; o.sty = s; rows.push(o);
      });
      if (md === 'on') synthTrips(f, ctx, a, b, have).forEach(o => { o.lift = 'on'; o.sty = s; rows.push(o); });
    });
    const basis = f.basis || 'lolo', curs = new Set();
    rows.forEach(o => { const r = rateOf(lineOf(o.line), o.st, basis); o.amount = r.amount; o.cur = r.cur; curs.add(r.cur); });
    const multi = curs.size > 1;
    rows.forEach(o => { o.amtCell = N(o.amount, o.amount ? (multi ? o.cur + ' ' : '') + num2(o.amount) : '—'); });
    rows = sortRows(rows, f, SORT_IC, 'date');
    const cols = pickCols({ cols: LIFT_COLS(m) }, f), by = o => { const x = {}; o.forEach(r => { x[r.cur] = (x[r.cur] || 0) + r.amount; }); return x; };
    const g = f.group || 'size', sizeGrp = g === 'size';
    const amt = o => { const x = by(o), k = Object.keys(x); return k.length === 1 ? N(x[k[0]], (multi ? k[0] + ' ' : '') + num2(x[k[0]])) : N(0, moneyStr(x)); };
    const t = makeList(rows, cols, { group: g, hideLabels: sizeGrp, foot: (label, rs) => ({ text: sizeGrp ? 'Total Containers  ' + label + '  Feet : ' + rs.length : 'Total Containers : ' + rs.length, cells: cols.some(c => c.k === 'amount') ? [amt(rs)] : [] }),
      grand: rs => ({ text: 'GRAND TOTAL: ' + rs.length + ' container' + (rs.length === 1 ? '' : 's'), cells: cols.some(c => c.k === 'amount') ? [amt(rs)] : [] }) });
    const noRate = rows.some(r => !r.amount);
    return { title: m === 'on' ? 'LIFT - ON REPORT' : (m === 'off' ? 'LIFT - OFF REPORT' : 'LIFT ON & OFF REPORT'), count: rows.length, landscape: false, tables: [t],
      notes: noRate ? ['Containers showing "—" have no rate: set one in Shipping Lines → rates (service "' + basis + '").'] : [] };
  }

  const stockOne = (vs, f, a, b, minor) => {
    const t1 = new Map(), t2 = new Map(), row = (m, st) => { const k = st.type + '|' + st.size; let r = m.get(k); if (!r) m.set(k, r = { type: st.type, size: st.size, open: 0, rec: 0, rel: 0, bal: 0, WASH: 0, SWASH: 0, MINOR: 0, MAJOR: 0, UNSURVEYED: 0 }); return r; };
    vs.forEach(v => {
      const r = row(t1, v.st);
      if (v.at < a && v.outAt >= a) r.open++;
      if (v.at >= a && v.at <= b) r.rec++;
      if (v.outAt >= a && v.outAt <= b) r.rel++;
      if (v.at <= b && v.outAt > b) { r.bal++; row(t2, v.st)[condClass(v.inn, minor)]++; }
    });
    const A = [...t1.values()].filter(r => r.open || r.rec || r.rel || r.bal).sort((x, y) => (Number(x.size || 99) - Number(y.size || 99)) || (ORD1.indexOf(x.type) - ORD1.indexOf(y.type)));
    const B = [...t2.values()].sort((x, y) => (Number(x.size || 99) - Number(y.size || 99)) || x.type.localeCompare(y.type));
    const sum = (rs, k) => rs.reduce((s, r) => s + r[k], 0), un = sum(B, 'UNSURVEYED') > 0, z = n => (n ? n : '');
    const ta = { head: ['TYPE', 'SIZE', 'OPENING STOCK', 'RECEIVED', 'RELEASED', 'STOCK BALANCE'], align: ['', '', 'n', 'n', 'n', 'n'], numbered: false, box: true, empty: 'No stock for these filters.',
      groups: [{ label: '', rows: A.map(r => [r.type, r.size || '—', z(r.open), z(r.rec), z(r.rel), r.bal]), foot: A.length ? { text: 'TOTALS', span: 2, cells: ['open', 'rec', 'rel', 'bal'].map(k => sum(A, k)) } : null }] };
    const hd = ['SIZE', 'TYPE', 'WASH', 'SWASH', 'MINOR', 'MAJOR'].concat(un ? ['NOT SURVEYED'] : []), ks = ['WASH', 'SWASH', 'MINOR', 'MAJOR'].concat(un ? ['UNSURVEYED'] : []);
    const tb = { head: hd, align: hd.map((x, i) => (i > 1 ? 'n' : '')), numbered: false, box: true, empty: 'No stock.',
      groups: [{ label: '', rows: B.map(r => [r.size || '—', r.type].concat(ks.map(k => r[k]))), foot: B.length ? { text: 'TOTALS', span: 2, cells: ks.map(k => sum(B, k)) } : null }] };
    return [ta, tb];
  };
  function stockBuild(f, ctx) {
    const a = dayStart(f.from), b = dayEnd(f.to), minor = numOk(f.minor) ? Number(f.minor) : 4;
    const vs = ctx.visits.filter(v => pass(f, norm(v.inn))); let tables = [], n = 0;
    vs.forEach(v => { if (v.at <= b && v.outAt > b) n++; });
    if (f.group === 'line') {
      const by = new Map(); vs.forEach(v => { const k = v.inn.line || ''; (by.get(k) || by.set(k, []).get(k)).push(v); });
      [...by.entries()].sort((x, y) => lineLabel(x[0]).localeCompare(lineLabel(y[0]))).forEach(([id, list], i) => {
        const tt = stockOne(list, f, a, b, minor); if (!tt[0].groups[0].rows.length) return;
        tt[0].title = lineLabel(id); tt[0].pb = i > 0; tables = tables.concat(tt);
      });
      if (!tables.length) tables = stockOne([], f, a, b, minor);
    } else tables = stockOne(vs, f, a, b, minor);
    const same = f.from === f.to;
    return { title: 'Stock Advising Report', titleCls: 'blue', count: n, landscape: false, tables,
      hdr: [['', lineText(f)], [same ? 'Date' : 'Period', same ? fIso(f.from, hdrSty(f)) : fIso(f.from, hdrSty(f)) + ' - ' + fIso(f.to, hdrSty(f))], ['CC', f.cc || ''], ['Report No', f.no || '']].filter(p => p[1] || p[0] === 'CC'),
      notes: ['WASH = cleaning only · SWASH = steam / chemical wash · MINOR = repairs up to ' + minor + ' labour hours · MAJOR = repairs above ' + minor + ' labour hours. Opening stock = containers in the yard at the start of ' + (same ? 'the day' : 'the period') + '.'] };
  }

  const YARD_COLS = [
    C('container', 'Container No.', r => r.container, { on: 1 }), C('line', 'Line', r => lineLabel(r.line), { on: 1 }), C('size', 'Size', r => r.size, { on: 1 }), C('type', 'Type', r => r.type, { on: 1 }),
    C('date', 'Date In', r => fd(r.at, r.sty), { on: 1 }), C('days', 'Days', r => r.days, { on: 1, num: 1 }), C('eir', 'EIR No.', r => r.eir, { on: 1 }), C('vessel', 'Vessel', r => r.vessel, { on: 1 }),
    C('party', 'Deliver Party', r => r.party, { on: 1 }), C('cls', 'Condition', r => r.cls, { on: 1 }), C('zone', 'Yard Slot', r => r.zone, { on: 1 }), C('remarks', 'Remarks', r => r.remarks, { on: 1, wrap: 1 }),
    C('voyage', 'Voyage', r => r.voyage), C('transporter', 'Transporter', r => r.transporter), C('lorry', 'Lorry', r => r.lorry), C('gno', 'GNo.', r => r.gno), C('dom', 'DOM', r => r.dom),
    C('survey', 'Survey', r => (r.ic.surveyStatus === 'awaiting_survey' ? 'AWAITING' : (r.ic.surveyStatus ? 'DONE' : ''))), C('cargo', 'Cargo', r => up(r.ic.cargoStatus)),
  ];
  const BANDS = f => { const cut = String(f.buckets || '7,14,30,60,90').split(/[\s,;]+/).map(Number).filter(n => n > 0).sort((x, y) => x - y); const u = cut.filter((n, i) => cut.indexOf(n) === i); const out = []; let lo = 0; u.forEach(n => { out.push([lo, n, lo + '-' + n]); lo = n + 1; }); out.push([lo, Infinity, lo + '+']); return out; };
  const bandOf = (bands, d) => { for (let i = 0; i < bands.length; i++) if (d >= bands[i][0] && d <= bands[i][1]) return i; return bands.length - 1; };
  function yardRows(f, ctx) {
    const b = dayEnd(f.to), ref = Math.min(b, Date.now()), s = sty(f, 'dmy'), minor = numOk(f.minor) ? Number(f.minor) : 4, rows = [];
    ctx.visits.forEach(v => {
      if (!(v.at <= b && v.outAt > b)) return;
      const o = norm(v.inn); o.visit = v; o.days = Math.max(0, Math.floor((ref - v.at) / DAY)); o.inYard = true; o.sty = s; o.cls = condClass(v.inn, minor);
      o.remarks = repairText(v.inn); o.gno = up(v.inn.guaranteeNo || v.inn.blNumber); o.dom = domText(v.inn.manufactureDate);
      if (pass(f, o)) rows.push(o);
    });
    return rows;
  }
  function yardBuild(f, ctx) {
    let rows = yardRows(f, ctx); const bands = BANDS(f);
    rows.forEach(r => { r.band = bands[bandOf(bands, r.days)][2] + ' days'; });
    rows = sortRows(rows, f, SORT_IC, 'days');
    const by = {}; rows.forEach(r => { const k = (r.size || '?') + 'ft'; by[k] = (by[k] || 0) + 1; });
    const sz = Object.keys(by).sort().map(k => k + ': ' + by[k]).join('  ·  ');
    return { title: 'Containers in Yard', count: rows.length, landscape: true, hdrAsAt: true,
      hdr: [['Agent / Line', lineText(f)], ['Report No', f.no || ''], ['As at', fIso(f.to, hdrSty(f))]],
      tables: [makeList(rows, pickCols(REP.yard, f), { group: f.group || 'none', foot: subFoot({ id: f.group || 'none' }), grand: rs => ({ text: 'Total in yard : ' + rs.length + (sz ? '   (' + sz + ')' : '') }) })] };
  }
  function dwellBuild(f, ctx) {
    const rows = yardRows(f, ctx), bands = BANDS(f), dim = f.dwby || 'line', pk = { line: r => lineLabel(r.line), sizetype: r => (r.size + ' ' + r.type).trim(), vessel: r => r.vessel || '(none)', party: r => r.party || '(none)' }[dim] || (r => lineLabel(r.line));
    const g = new Map(), tot = { n: 0, b: bands.map(() => 0), days: 0, max: 0, over: 0, est: {} };
    let anyEst = false;
    const est = r => { const l = lineOf(r.line); let rt = null; try { rt = typeof lineServiceRates === 'function' ? lineServiceRates(l, 'storage') : null; } catch (x) {} if (!rt || rt.freeDays == null) return null; const rate = Number(r.size === '20' ? rt['20ft'] : rt['40ft']); if (!(rate > 0)) return null; const over = Math.max(0, r.days - Number(rt.freeDays)); return { over, amt: over * rate, cur: (l && l.currency) || 'USD' }; };
    rows.forEach(r => {
      const k = pk(r); let x = g.get(k); if (!x) g.set(k, x = { n: 0, b: bands.map(() => 0), days: 0, max: 0, over: 0, est: {} });
      const bi = bandOf(bands, r.days), e2 = est(r);
      [x, tot].forEach(t => { t.n++; t.b[bi]++; t.days += r.days; t.max = Math.max(t.max, r.days); if (e2) { anyEst = true; t.over += e2.over > 0 ? 1 : 0; t.est[e2.cur] = (t.est[e2.cur] || 0) + e2.amt; } });
    });
    const head = [{ line: 'SHIPPING LINE', sizetype: 'SIZE & TYPE', vessel: 'VESSEL', party: 'PARTY' }[dim] || 'GROUP'].concat(bands.map(b => b[2] + ' DAYS'), ['TOTAL', 'AVG DAYS', 'MAX DAYS'], anyEst ? ['OVER FREE DAYS', 'EST. STORAGE'] : []);
    const line = (k, x) => [k].concat(x.b.map(v => v || ''), [x.n, Math.round(x.days / (x.n || 1)), x.max], anyEst ? [x.over || '', moneyStr(x.est)] : []);
    const ents = [...g.entries()].sort((a, b) => (dim === 'sizetype' ? stOrd(a, b) : b[1].n - a[1].n));
    const t = { head, align: head.map((h, i) => (i ? 'n' : '')), numbered: false, box: true, empty: 'No containers in the yard for these filters.',
      groups: [{ label: '', rows: ents.map(([k, x]) => line(k, x)), foot: ents.length ? { text: 'TOTALS', span: 1, cells: line('', tot).slice(1) } : null }] };
    return { title: 'Yard Ageing / Dwell Report', count: rows.length, landscape: true, hdr: [['Agent / Line', lineText(f)], ['Report No', f.no || ''], ['As at', fIso(f.to, hdrSty(f))]], tables: [t],
      notes: ['Days in yard = days since gate-in, counted to the As-at date.' + (anyEst ? ' Est. storage = days beyond the line\'s free period × its storage rate (an estimate for follow-up, not an invoice).' : '')] };
  }

  const MOVE_COLS = [
    C('date', 'Date', r => fd(r.at, r.sty), { on: 1 }), C('time', 'Time', r => ft(r.at), { on: 1 }), C('move', 'Movement', r => r.move, { on: 1 }), C('container', 'Container No.', r => r.container, { on: 1 }),
    C('line', 'Line', r => lineLabel(r.line), { on: 1 }), C('size', 'Size', r => r.size, { on: 1 }), C('type', 'Type', r => r.type, { on: 1 }), C('eir', 'EIR No.', r => r.eir, { on: 1 }),
    C('vessel', 'Vessel', r => r.vessel, { on: 1 }), C('voyage', 'Voyage', r => r.voyage, { on: 1 }), C('party', 'Party', r => r.party, { on: 1 }), C('transporter', 'Transporter', r => r.transporter, { on: 1 }),
    C('lorry', 'Lorry', r => r.lorry, { on: 1 }), C('driver', 'Driver', r => r.driver, { on: 1 }), C('ref', 'Reference', r => r.ref), C('clerk', 'Clerk', r => r.clerk), C('zone', 'Yard Slot', r => r.zone),
    C('remarks', 'Remarks', r => r.remarks, { wrap: 1 }), C('days', 'Days in Yard', r => r.days, { num: 1 }), C('status', 'Status', r => up(r.ic && r.ic.status)),
  ];
  function movementsBuild(f, ctx) {
    const a = dayStart(f.from), b = dayEnd(f.to), s = sty(f, 'dmy'); let rows = [];
    (state.db.interchange || []).forEach(ic => {
      const isIn = IN_TYPES.indexOf(ic.type) > -1, isOut = OUT_TYPES.indexOf(ic.type) > -1; if (!isIn && !isOut) return;
      const at = ts(ic.date); if (!(at >= a && at <= b)) return;
      const o = isIn ? enrichIn(ic, ctx) : enrichOut(ic, ctx); if (!pass(f, o)) return; o.sty = s; rows.push(o);
    });
    rows = sortRows(rows, f, SORT_IC, 'date');
    return { title: 'Gate Movement Log', count: rows.length, landscape: true, tables: [makeList(rows, pickCols(REP.movements, f), { group: f.group || 'none', foot: subFoot({ id: f.group || 'none' }), grand: rs => ({ text: 'Total movements : ' + rs.length + '   (IN ' + rs.filter(r => IN_TYPES.indexOf(r.move) > -1).length + ' · OUT ' + rs.filter(r => OUT_TYPES.indexOf(r.move) > -1).length + ')' }) })] };
  }

  const HIST_COLS = [
    C('move', 'Movement', r => r.move, { on: 1 }), C('date', 'Date', r => fd(r.at, r.sty), { on: 1 }), C('time', 'Time', r => ft(r.at), { on: 1 }), C('eir', 'EIR No.', r => r.eir, { on: 1 }),
    C('line', 'Line', r => lineLabel(r.line), { on: 1 }), C('vessel', 'Vessel', r => r.vessel, { on: 1 }), C('voyage', 'Voyage', r => r.voyage, { on: 1 }), C('party', 'Party', r => r.party, { on: 1 }),
    C('transporter', 'Transporter', r => r.transporter, { on: 1 }), C('lorry', 'Lorry', r => r.lorry, { on: 1 }), C('driver', 'Driver', r => r.driver, { on: 1 }), C('ref', 'Reference', r => r.ref, { on: 1 }),
    C('remarks', 'Remarks / repairs', r => r.remarks, { on: 1, wrap: 1 }), C('days', 'Days in Yard', r => r.days, { on: 1, num: 1 }), C('clerk', 'Clerk', r => r.clerk),
  ];
  function historyBuild(f, ctx) {
    const s = sty(f, 'dmy'), rows = [];
    ctx.idx.forEach((h, k) => {
      if (!f._tok.some(t => k.indexOf(t) > -1)) return;
      h.ins.concat(h.outs).forEach(ic => { const o = IN_TYPES.indexOf(ic.type) > -1 ? enrichIn(ic, ctx) : enrichOut(ic, ctx); o.sty = s; rows.push(o); });
    });
    const filt = rows.filter(o => pass(Object.assign({}, f, { _tok: [], container: '' }), o));
    filt.sort((x, y) => (x.container < y.container ? -1 : x.container > y.container ? 1 : x.at - y.at));
    const gm = new Map(); filt.forEach(r => { (gm.get(r.container) || gm.set(r.container, []).get(r.container)).push(r); });
    const cols = pickCols(REP.history, f), t = makeList([], cols, { group: 'none', numbered: true });
    t.groups = [...gm.entries()].map(([c, rs]) => {
      const ins = rs.filter(r => IN_TYPES.indexOf(r.move) > -1), outs = rs.filter(r => OUT_TYPES.indexOf(r.move) > -1), days = outs.reduce((x, r) => x + (r.days || 0), 0);
      const l = rs[0], inYard = ins.length && ins[ins.length - 1].inYard;
      return { label: c + ' · ' + lineLabel(l.line) + ' · ' + (l.size + ' ' + l.type).trim(), rows: rs.map(r => cols.map(cc => cc.get(r))), foot: { text: 'Visits : ' + ins.length + '   ·   Completed days in yard : ' + days + (inYard ? '   ·   Currently in yard (' + ins[ins.length - 1].days + ' days)' : '') } };
    });
    t.empty = 'No movements found for those container numbers.';
    return { title: 'Container Movement History', count: filt.length, landscape: true, hdr: [['Containers', f._tok.length + ' searched'], ['Report No', f.no || '']], tables: [t], notes: ['The period is ignored: the full history of each container is shown.'] };
  }

  const BY = {
    date: { h: 'DATE', k: o => isoOf(new Date(o.at)), l: k => fIso(k, 'dmy') },
    week: { h: 'WEEK STARTING', k: o => { const x = new Date(o.at); x.setHours(12); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return isoOf(x); }, l: k => fIso(k, 'dmy') },
    month: { h: 'MONTH', k: o => isoOf(new Date(o.at)).slice(0, 7), l: k => MON[Number(k.slice(5)) - 1] + ' ' + k.slice(0, 4) },
    line: { h: 'SHIPPING LINE', k: o => o.line || '', l: k => lineLabel(k), bal: o => o.line || '' },
    sizetype: { h: 'SIZE & TYPE', k: o => (o.size + ' ' + o.type).trim(), l: k => k, bal: o => (o.size + ' ' + o.type).trim() },
    transporter: { h: 'TRANSPORTER', k: o => o.transporter || '(none)', l: k => k },
    vessel: { h: 'VESSEL', k: o => o.vessel || '(none)', l: k => k, bal: o => up(o.ic && o.ic.vessel) || '(none)' },
    party: { h: 'PARTY', k: o => o.party || '(none)', l: k => k },
  };
  function summaryBuild(f, ctx) {
    const a = dayStart(f.from), b = dayEnd(f.to), D = BY[f.by] || BY.date, time = f.by === 'date' || f.by === 'week' || f.by === 'month', g = new Map();
    const row = k => { let r = g.get(k); if (!r) g.set(k, r = { k, in20: 0, in40: 0, inO: 0, out20: 0, out40: 0, outO: 0, bal: null }); return r; };
    (state.db.interchange || []).forEach(ic => {
      const isIn = IN_TYPES.indexOf(ic.type) > -1, isOut = OUT_TYPES.indexOf(ic.type) > -1; if (!isIn && !isOut) return;
      const at = ts(ic.date); if (!(at >= a && at <= b)) return;
      const o = isIn ? enrichIn(ic, ctx) : enrichOut(ic, ctx); if (!pass(f, o)) return;
      const r = row(D.k(o)), z = o.size === '20' ? '20' : (o.size === '40' ? '40' : 'O');
      r[(isIn ? 'in' : 'out') + z]++;
    });
    let open = 0;
    const vs = ctx.visits.filter(v => pass(f, norm(v.inn)));
    if (time) { vs.forEach(v => { if (v.at < a && v.outAt >= a) open++; }); }
    else if (D.bal) { vs.forEach(v => { if (v.at <= b && v.outAt > b) { const r = row(D.bal(norm(v.inn))); r.bal = (r.bal || 0) + 1; } }); g.forEach(r => { if (r.bal == null) r.bal = 0; }); }
    let ents = [...g.values()];
    if (time) { ents.sort((x, y) => (x.k < y.k ? -1 : 1)); let bal = open; ents.forEach(r => { bal += r.in20 + r.in40 + r.inO - r.out20 - r.out40 - r.outO; r.bal = bal; }); }
    else ents.sort((x, y) => (y.in20 + y.in40 + y.inO + y.out20 + y.out40 + y.outO) - (x.in20 + x.in40 + x.inO + x.out20 + x.out40 + x.outO));
    if (f.dir === 'desc') ents.reverse();
    const showBal = time || !!D.bal, head = [D.h, 'IN 20', 'IN 40', 'IN TOTAL', 'OUT 20', 'OUT 40', 'OUT TOTAL', 'NET'].concat(showBal ? [time ? 'YARD BALANCE (END)' : 'IN YARD (AS AT TO DATE)'] : []);
    const inT = r => r.in20 + r.in40 + r.inO, outT = r => r.out20 + r.out40 + r.outO, z = n => (n ? n : '');
    const line = r => [D.l(r.k), z(r.in20), z(r.in40), inT(r), z(r.out20), z(r.out40), outT(r), inT(r) - outT(r)].concat(showBal ? [r.bal == null ? '' : r.bal] : []);
    const S = k => ents.reduce((s, r) => s + r[k], 0), tot = { in20: S('in20'), in40: S('in40'), inO: S('inO'), out20: S('out20'), out40: S('out40'), outO: S('outO') };
    const tl = [z(tot.in20), z(tot.in40), tot.in20 + tot.in40 + tot.inO, z(tot.out20), z(tot.out40), tot.out20 + tot.out40 + tot.outO, (tot.in20 + tot.in40 + tot.inO) - (tot.out20 + tot.out40 + tot.outO)].concat(showBal ? [time && ents.length ? ents[ents.length - 1].bal : (D.bal ? ents.reduce((s, r) => s + (r.bal || 0), 0) : '')] : []);
    const t = { head, align: head.map((h, i) => (i ? 'n' : '')), numbered: false, box: true, empty: 'No movements for these filters.', groups: [{ label: '', rows: ents.map(line), foot: ents.length ? { text: 'TOTALS', span: 1, cells: tl } : null }] };
    return { title: 'Activity Summary', count: tot.in20 + tot.in40 + tot.inO + tot.out20 + tot.out40 + tot.outO, landscape: true, tables: [t],
      notes: time ? ['Yard balance = opening stock (' + open + ') + received − released, counted from the movements in this period.'] : [] };
  }

  const SV_COLS = [
    C('container', 'Container No.', r => r.container, { on: 1 }), C('line', 'Line', r => lineLabel(r.line), { on: 1 }), C('size', 'Size', r => r.size, { on: 1 }), C('type', 'Type', r => r.type, { on: 1 }),
    C('date', 'Date In', r => fd(r.at, r.sty), { on: 1 }), C('state', 'Survey', r => r.stateTxt, { on: 1 }), C('surveyed', 'Surveyed On', r => (r.ic.surveyedAt ? fd(r.ic.surveyedAt, r.sty) : ''), { on: 1 }),
    C('by', 'Surveyor', r => up(r.ic.surveyedBy), { on: 1 }), C('cls', 'Class', r => r.cls, { on: 1 }), C('items', 'Items', r => r.cost.items, { on: 1, num: 1 }), C('hours', 'Labour Hrs', r => N(r.cost.hrs, num2(r.cost.hrs)), { on: 1, num: 1 }),
    C('total', 'Estimate', r => N(Object.keys(r.cost.by).reduce((s, c) => s + r.cost.by[c], 0), moneyStr(r.cost.by)), { on: 1, num: 1 }), C('remarks', 'Repairs', r => r.remarks, { on: 1, wrap: 1 }),
    C('eir', 'EIR No.', r => r.eir), C('vessel', 'Vessel', r => r.vessel), C('party', 'Deliver Party', r => r.party), C('days', 'Days in Yard', r => r.days, { num: 1 }),
  ];
  function surveyBuild(f, ctx) {
    const a = dayStart(f.from), b = dayEnd(f.to), s = sty(f, 'dmy'), minor = numOk(f.minor) ? Number(f.minor) : 4; let rows = [];
    (state.db.interchange || []).forEach(ic => {
      if (IN_TYPES.indexOf(ic.type) < 0) return; const at = ts(ic.date); if (!(at >= a && at <= b)) return;
      const o = enrichIn(ic, ctx); if (!pass(f, o)) return;
      o.sty = s; o.cls = condClass(ic, minor); o.cost = repairCost(ic); o.stateTxt = ic.surveyStatus === 'awaiting_survey' ? 'AWAITING' : (ic.surveyStatus ? 'DONE' : '—'); rows.push(o);
    });
    rows = sortRows(rows, f, SORT_IC, 'date');
    const sum = rs => { const by = {}; let h = 0, it = 0; rs.forEach(r => { Object.keys(r.cost.by).forEach(c => { by[c] = (by[c] || 0) + r.cost.by[c]; }); h += r.cost.hrs; it += r.cost.items; }); return { by, h, it }; };
    const cols = pickCols(REP.survey, f), first = cols.findIndex(c => ['items', 'hours', 'total'].indexOf(c.k) > -1);
    const mk = (text, rs) => {
      if (first < 0) return { text };
      const x = sum(rs);
      return { text, span: 1 + first, cells: cols.slice(first).map(c => (c.k === 'items' ? x.it : c.k === 'hours' ? N(x.h) : c.k === 'total' ? N(0, moneyStr(x.by)) : '')) };
    };
    const t = makeList(rows, cols, { group: f.group || 'none', foot: (l, rs) => (f.group && f.group !== 'none' ? mk('Sub-total : ' + rs.length, rs) : null), grand: rs => mk('Total Containers : ' + rs.length + '   ·   Awaiting survey : ' + rs.filter(r => r.stateTxt === 'AWAITING').length, rs) });
    return { title: 'Survey & Repair Report', count: rows.length, landscape: true, tables: [t],
      notes: ['Estimate = material + labour hours × the labour rate set for each currency (Settings → Form Designer → Rules). Items with no rate set are not priced for labour.'] };
  }

  const SO_COLS = [
    C('date', 'Date', r => fd(r.at, r.sty), { on: 1 }), C('container', 'Container No.', r => r.container, { on: 1 }), C('line', 'Line', r => lineLabel(r.line), { on: 1 }), C('vessel', 'Vessel', r => r.vessel, { on: 1 }),
    C('voyage', 'Voyage', r => r.voyage, { on: 1 }), C('status', 'Status', r => r.status, { on: 1 }), C('reason', 'Reason', r => r.reason, { on: 1, wrap: 1 }), C('lorry', 'Lorry', r => r.lorry, { on: 1 }),
    C('driver', 'Driver', r => r.driver, { on: 1 }), C('remarks', 'Notes', r => r.remarks, { on: 1, wrap: 1 }),
  ];
  function shutoutsBuild(f) {
    const a = dayStart(f.from), b = dayEnd(f.to), s = sty(f, 'dmy'); let rows = [];
    (state.db.shutouts || []).forEach(x => {
      const at = ts(x.date); if (!(at >= a && at <= b)) return;
      const o = { ic: null, at, container: up(x.container), line: x.line || '', size: '', type: '', vessel: up(x.vessel), voyage: up(x.voyage), status: up(x.status), reason: up(x.reason), lorry: up(x.truckId ? regOf(x.truckId) : ''), driver: up(x.driverId ? drvOf(x.driverId) : ''), remarks: up(x.notes), sty: s };
      if (pass(f, o)) rows.push(o);
    });
    rows = sortRows(rows, f, SORT_IC, 'date');
    return { title: 'Shutout Report', count: rows.length, landscape: true, tables: [makeList(rows, pickCols(REP.shutouts, f), { group: f.group || 'none', foot: subFoot({ id: f.group || 'none' }), grand: rs => ({ text: 'Total shutouts : ' + rs.length }) })] };
  }

  const FL_COLS = [
    C('date', 'Date', r => fd(r.at, r.sty), { on: 1 }), C('move', 'Movement', r => r.move, { on: 1 }), C('container', 'Container No.', r => r.container, { on: 1 }), C('line', 'Line', r => lineLabel(r.line), { on: 1 }),
    C('eir', 'EIR No.', r => r.eir, { on: 1 }), C('reason', 'Flag reason', r => r.reason, { on: 1, wrap: 1 }), C('dupof', 'Duplicate of', r => r.ic.duplicateOfId || '', { on: 1 }), C('batch', 'Import batch', r => r.ic.importBatchId || '', { on: 1 }),
    C('clerk', 'Clerk', r => r.clerk, { on: 1 }), C('lorry', 'Lorry', r => r.lorry), C('vessel', 'Vessel', r => r.vessel),
  ];
  function flaggedBuild(f, ctx) {
    const a = dayStart(f.from), b = dayEnd(f.to), s = sty(f, 'dmy'); let rows = [];
    (state.db.interchange || []).forEach(ic => {
      if (!(ic.flaggedForReview || ic.duplicateOfId)) return; const at = ts(ic.date); if (!(at >= a && at <= b)) return;
      const o = norm(ic); o.sty = s; o.reason = up((ic.flagReasons || []).map(x => (typeof x === 'string' ? x : (x && (x.message || x.reason)) || '')).filter(Boolean).join('; ') || (ic.duplicateOfId ? 'DUPLICATE' : 'FLAGGED'));
      if (pass(Object.assign({}, f, { flagged: 'all' }), o)) rows.push(o);
    });
    rows = sortRows(rows, f, SORT_IC, 'date');
    return { title: 'Flagged / Duplicate Records', count: rows.length, landscape: true, tables: [makeList(rows, pickCols(REP.flagged, f), { group: f.group || 'none', foot: subFoot({ id: f.group || 'none' }), grand: rs => ({ text: 'Total flagged : ' + rs.length }) })] };
  }

  const DP_COLS = [
    C('date', 'Date Out', r => fd(r.at, r.sty), { on: 1 }), C('container', 'Container No.', r => r.container, { on: 1 }), C('size', 'Size', r => r.size, { on: 1 }), C('type', 'Type', r => r.type, { on: 1 }),
    C('line', 'Line', r => lineLabel(r.line), { on: 1 }), C('dest', 'Destination', r => r.dest, { on: 1 }), C('party', 'Receiving Party', r => r.party, { on: 1 }), C('ref', 'Release Order', r => r.ref, { on: 1 }),
    C('vessel', 'Vessel', r => r.vessel, { on: 1 }), C('voyage', 'Voy', r => r.voyage, { on: 1 }), C('lorry', 'Truck', r => r.lorry, { on: 1 }), C('driver', 'Driver', r => r.driver, { on: 1 }),
    C('status', 'Status', r => r.status, { on: 1 }), C('eir', 'EIR No.', r => r.eir), C('outtype', 'Outward Type', r => up(outwardTypeLabel(r.trip && r.trip.outwardType))), C('remarks', 'Notes', r => r.remarks, { wrap: 1 }),
  ];
  function dispatchBuild(f, ctx) {
    const a = dayStart(f.from), b = dayEnd(f.to), s = sty(f, 'dmy'); let rows = [];
    ctx.tripsBy.forEach((list, k) => list.forEach(t => {
      const at = ts(t.dateOut || t.startTime); if (!(at >= a && at <= b)) return;
      const st = sizeType(t.ctype), inn = inFor(ctx.idx.get(k), at);
      const o = { ic: null, trip: t, at, container: up(t.container), line: t.shippingLine || '', size: st.size, type: st.type, st, eir: up(t.eirNumber), vessel: up(t.vessel || (inn && inn.vessel)), voyage: up(t.voyage || (inn && inn.voyage)),
        party: up(t.receivingParty), ref: up(t.releaseOrderNo), dest: up(t.dest), lorry: up(regOf(t.truckId)), driver: up(t.driverId ? drvOf(t.driverId) : ''), status: up(t.status), remarks: up(t.notes), transporter: up(inn && inn.transporter), sty: s };
      if (pass(f, o)) rows.push(o);
    }));
    rows = sortRows(rows, f, SORT_IC, 'date');
    return { title: 'Outward Dispatch Trips', count: rows.length, landscape: true, tables: [makeList(rows, pickCols(REP.dispatch, f), { group: f.group || 'none', foot: subFoot({ id: f.group || 'none' }), grand: rs => ({ text: 'Total trips : ' + rs.length }) })] };
  }

  /* ───────────────────────── report registry ───────────────────────── */
  const BASE = ['line', 'size', 'type', 'container', 'q'];
  const ADV_IC = ['eir', 'vessel', 'voyage', 'party', 'transporter', 'lorry', 'driver', 'ref', 'clerk', 'zone', 'move', 'flagged'];
  const REP = {};
  const def = (id, o) => { o.id = id; REP[id] = o; };
  def('daily_in', { g: 'Depot registers', label: 'Daily Container Report — IN', desc: 'Containers received, grouped by size and type (as the previous system prints it).', needs: 'range',
    filters: BASE.concat(ADV_IC, ['yard', 'survey', 'cond', 'minor', 'minDays', 'maxDays']), cols: IN_COLS, sorts: SORT_OPTS, groups: grpOpts(['sizetype', 'none', 'line', 'date', 'vessel', 'transporter', 'party']), defGroup: 'sizetype', build: dailyBuild(true) });
  def('daily_out', { g: 'Depot registers', label: 'Daily Container Report — OUT', desc: 'Containers released, with release order, destination and the matching gate-in.', needs: 'all',
    filters: BASE.concat(ADV_IC, ['minDays', 'maxDays']), cols: OUT_COLS, sorts: SORT_OPTS, groups: grpOpts(['sizetype', 'none', 'line', 'date', 'vessel', 'transporter', 'party']), defGroup: 'sizetype', build: dailyBuild(false) });
  def('lift', { g: 'Depot registers', label: 'Lift On / Lift Off Report', desc: 'Lifts per container with the amount from the line\'s rates, totalled per size.', needs: 'all',
    filters: BASE.concat(['lift', 'basis', 'eir', 'vessel', 'voyage', 'party', 'transporter', 'lorry', 'driver', 'ref', 'move', 'flagged']), cols: LIFT_COLS('on'), colsFn: f => LIFT_COLS(f.lift || 'on'), sorts: SORT_OPTS, groups: grpOpts(['size', 'none', 'sizetype', 'line', 'date', 'vessel']), defGroup: 'size', build: liftBuild });
  def('stock', { g: 'Depot registers', label: 'Stock Advising Report', desc: 'Opening stock, received, released, balance by type and size, then WASH / SWASH / MINOR / MAJOR.', needs: 'all',
    filters: ['line', 'size', 'type', 'container', 'q', 'vessel', 'voyage', 'party', 'transporter', 'minor'], cols: [], sorts: [], groups: [['none', 'One combined report'], ['line', 'Separate page for each line']], defGroup: 'none', build: stockBuild, noCols: true });
  def('yard', { g: 'Yard', asAt: true, defSort: 'days', defDir: 'desc', label: 'Containers in Yard', desc: 'Everything still in the yard on a date, with days in yard, condition and slot.', needs: 'all',
    filters: BASE.concat(['eir', 'vessel', 'voyage', 'party', 'transporter', 'lorry', 'ref', 'zone', 'cond', 'minor', 'survey', 'minDays', 'maxDays', 'buckets']), cols: YARD_COLS, sorts: SORT_OPTS, groups: grpOpts(['none', 'line', 'sizetype', 'cond', 'bucket', 'vessel', 'party']), defGroup: 'none', build: yardBuild });
  def('dwell', { g: 'Yard', asAt: true, label: 'Ageing / Dwell Report', desc: 'How long containers have been in the yard, in bands, with an estimate of storage owed.', needs: 'all',
    filters: ['line', 'size', 'type', 'container', 'q', 'vessel', 'party', 'cond', 'minor', 'buckets', 'dwby'], cols: [], sorts: [], groups: [], defGroup: 'none', build: dwellBuild, noCols: true });
  def('movements', { g: 'Movements', label: 'Gate Movement Log', desc: 'Every gate / depot in and out in the period, with time stamps. The all-purpose register.', needs: 'range',
    filters: BASE.concat(ADV_IC, ['yard', 'survey', 'cond', 'minor', 'minDays', 'maxDays']), cols: MOVE_COLS, sorts: SORT_OPTS, groups: grpOpts(['none', 'date', 'move', 'line', 'sizetype', 'vessel', 'transporter', 'party']), defGroup: 'none', build: movementsBuild });
  def('history', { g: 'Movements', label: 'Container History', desc: 'The full life of one or many containers: every visit, release, lorry and repair.', needs: 'history', needTok: true,
    filters: ['container', 'line', 'move'], cols: HIST_COLS, sorts: [], groups: [], defGroup: 'none', build: historyBuild });
  def('summary', { g: 'Movements', label: 'Activity Summary', desc: 'Counts in and out by day, week, month, line, transporter, vessel, party or size and type.', needs: 'range',
    filters: BASE.concat(['vessel', 'voyage', 'party', 'transporter', 'move', 'by']), cols: [], sorts: [], groups: [], defGroup: 'none', build: summaryBuild, noCols: true, needsAllForBalance: true });
  def('survey', { g: 'Survey & repairs', label: 'Survey & Repair Report', desc: 'Survey status, repair items, labour hours, material and totals per currency.', needs: 'range',
    filters: BASE.concat(['eir', 'vessel', 'party', 'transporter', 'survey', 'cond', 'minor', 'flagged', 'minDays', 'maxDays']), cols: SV_COLS, sorts: SORT_OPTS, groups: grpOpts(['none', 'line', 'cond', 'sizetype', 'date']), defGroup: 'none', build: surveyBuild });
  def('shutouts', { g: 'Exceptions', label: 'Shutout Report', desc: 'Containers turned away, with reason and status.', needs: 'none',
    filters: ['line', 'container', 'q', 'vessel', 'voyage', 'lorry', 'driver', 'status', 'reason'], cols: SO_COLS, sorts: SORT_OPTS.slice(0, 3), groups: grpOpts(['none', 'line', 'status', 'reason', 'date', 'vessel']), defGroup: 'none', build: shutoutsBuild });
  def('flagged', { g: 'Exceptions', label: 'Flagged / Duplicate Records', desc: 'Records the system flagged for review or marked as duplicates.', needs: 'range',
    filters: ['line', 'size', 'type', 'container', 'q', 'eir', 'vessel', 'clerk', 'move'], cols: FL_COLS, sorts: SORT_OPTS.slice(0, 5), groups: grpOpts(['none', 'line', 'move', 'date']), defGroup: 'none', build: flaggedBuild });
  def('dispatch', { g: 'Trips & dispatch', label: 'Outward Dispatch Trips', desc: 'Depot → Port trips: truck, driver, destination, release order and status.', needs: 'all',
    filters: BASE.concat(['vessel', 'voyage', 'party', 'lorry', 'driver', 'ref', 'status']), cols: DP_COLS, sorts: SORT_OPTS.slice(0, 6), groups: grpOpts(['none', 'status', 'line', 'date', 'vessel', 'party']), defGroup: 'none', build: dispatchBuild });
  const ORDER = ['Overview', 'Depot registers', 'Yard', 'Movements', 'Survey & repairs', 'Exceptions', 'Trips & dispatch', 'Fleet & drivers', 'Maintenance & fuel', 'Finance', 'People (HR)'];
  /* who may open a report: everyone except drivers; a report with roles[] is for those roles and administrators */
  const ROLE = () => (state.profile && state.profile.role) || (state.currentUser && state.currentUser.role) || '';
  const canSee = rep => { if (!rep) return false; const r = ROLE(); if (r === 'driver') return false; if (!rep.roles || r === 'admin') return true; return rep.roles.indexOf(r) > -1; };
  /* first preview puts the shipping line first: reports that can be grouped by line open grouped by line */
  const defGroupOf = rep => { const g = (rep.groups || []).find(x => /(^|\.)line$/.test(x[0])); return g ? g[0] : rep.defGroup; };
  /* reports that read well after this one; they open with the same shipping line and dates */
  const RELATED = {
    daily_in: ['yard', 'stock', 'lift', 'movements', 'survey'], daily_out: ['dispatch', 'lift', 'stock', 'movements'], lift: ['daily_out', 'daily_in', 'stock', 'summary'],
    stock: ['yard', 'daily_in', 'daily_out', 'dwell', 'summary'], yard: ['stock', 'dwell', 'daily_in', 'survey'], dwell: ['yard', 'stock', 'summary'],
    movements: ['daily_in', 'daily_out', 'history', 'summary'], history: ['movements', 'survey', 'dispatch'], summary: ['stock', 'movements', 'lift'], survey: ['yard', 'daily_in', 'flagged'],
    shutouts: ['prestaking', 'movements', 'dispatch'], flagged: ['dupes', 'movements'], dispatch: ['daily_out', 'trips', 'prestaking'], trips: ['dispatch', 'fleet', 'drivers', 'fuel', 'maintenance'],
    prestaking: ['dispatch', 'shutouts', 'daily_out'], fleet: ['maintenance', 'workshop', 'fleetcost', 'trips'], drivers: ['trips', 'fuel', 'fleet'], maintenance: ['workshop', 'fleetcost', 'fleet'],
    workshop: ['maintenance', 'requisitions', 'fleetcost'], requisitions: ['workshop', 'fuel', 'fin_summary'], fuel: ['fleetcost', 'trips', 'fin_summary'], fleetcost: ['fuel', 'maintenance', 'fin_summary'],
    receivables: ['fin_summary', 'daily_out', 'lift'], fin_summary: ['receivables', 'hr_payroll', 'fleetcost'], hr_staff: ['hr_leave', 'hr_attendance', 'hr_payroll'], hr_leave: ['hr_staff', 'hr_attendance'],
    hr_attendance: ['hr_staff', 'hr_leave'], hr_payroll: ['hr_staff', 'fin_summary'], snapshot: ['stock', 'pipeline', 'yard', 'trips', 'fleet'], pipeline: ['yard', 'stock', 'snapshot'], dupes: ['flagged', 'movements'],
  };

  /* ───────────────────────── filter widgets ───────────────────────── */
  const lineOpts = () => lines().map(l => [l.id, l.code + (l.name && l.name !== l.code ? ' — ' + l.name : '')]).concat([['__none__', '⚠ No line assigned']]);
  const F = {
    line: { l: 'Agent / Line', k: 'multi', o: lineOpts, all: 'All shipping lines' }, size: { l: 'Size', k: 'multi', o: [['20', '20 ft'], ['40', '40 ft']], all: 'All sizes' },
    type: { l: 'Type', k: 'multi', o: TYPES.map(t => [t, t]), all: 'All types' },
    container: { l: 'Container No(s).', k: 'text', ph: 'one or many, separated by space or comma' }, q: { l: 'Search anything', k: 'text', ph: 'any word in the record' },
    eir: { l: 'EIR No.', k: 'text' }, vessel: { l: 'Vessel', k: 'text', dl: 'vessel' }, voyage: { l: 'Voyage', k: 'text' }, party: { l: 'Delivering / collecting party', k: 'text', dl: 'party' },
    transporter: { l: 'Transporter', k: 'text', dl: 'transporter' }, lorry: { l: 'Lorry / trailer', k: 'text' }, driver: { l: 'Driver', k: 'text' }, ref: { l: 'Reference (GNo / BL / release order)', k: 'text' },
    clerk: { l: 'Clerk', k: 'text', dl: 'clerk' }, zone: { l: 'Yard slot / block', k: 'text' }, status: { l: 'Status', k: 'text' }, reason: { l: 'Reason', k: 'text' },
    move: { l: 'Movement', k: 'multi', o: [['Gate-In', 'Gate-In'], ['Depot-In', 'Depot-In'], ['Gate-Out', 'Gate-Out'], ['Depot-Out', 'Depot-Out']], all: 'All movements' },
    yard: { l: 'Yard status', k: 'select', o: [['all', 'Any'], ['in', 'Still in the yard'], ['out', 'Already gone out']] },
    cond: { l: 'Condition class', k: 'multi', o: COND, all: 'All classes' },
    survey: { l: 'Survey', k: 'select', o: [['all', 'Any'], ['awaiting', 'Awaiting survey'], ['done', 'Surveyed']] },
    flagged: { l: 'Flagged / duplicate', k: 'select', o: [['all', 'Include all'], ['only', 'Flagged only'], ['exclude', 'Exclude flagged']] },
    minDays: { l: 'Days in yard: at least', k: 'number' }, maxDays: { l: 'Days in yard: at most', k: 'number' },
    lift: { l: 'Lift Type', k: 'select', o: [['on', 'LIFT ON (out)'], ['off', 'LIFT OFF (in)'], ['both', 'Both on and off']] },
    basis: { l: 'Amount per container uses', k: 'select', o: [['lolo', 'LOLO (lift on / off)'], ['serviceCharge', 'Service charge'], ['loloBatch6', 'Batch of 6 moves'], ['transport', 'Transport'], ['reefer', 'Reefer handling']] },
    minor: { l: 'MINOR repair = up to (labour hrs)', k: 'number', def: 4 }, buckets: { l: 'Day bands (upper limits)', k: 'text', def: '7,14,30,60,90' },
    dwby: { l: 'Break down by', k: 'select', o: [['line', 'Shipping line'], ['sizetype', 'Size & type'], ['vessel', 'Vessel'], ['party', 'Party']] },
    by: { l: 'Summarise by', k: 'select', o: [['line', 'Shipping line'], ['date', 'Day'], ['week', 'Week'], ['month', 'Month'], ['sizetype', 'Size & type'], ['transporter', 'Transporter'], ['vessel', 'Vessel'], ['party', 'Party']] },
    no: { l: 'Report No.', k: 'text', ph: 'printed on the report' }, cc: { l: 'CC', k: 'text', ph: 'printed on the stock report' },
    dfmt: { l: 'Date style', k: 'select', o: [['auto', 'As the old system'], ['dmy', 'DD/MM/YYYY'], ['mdy', 'MM/DD/YYYY'], ['mon', 'Mon DD YYYY']] },
    orient: { l: 'Paper', k: 'select', o: [['auto', 'Automatic'], ['portrait', 'Portrait'], ['landscape', 'Landscape']] },
  };
  const optsOf = d => (typeof d.o === 'function' ? d.o() : d.o || []);
  const defOf = d => (d.k === 'multi' ? [] : (d.k === 'select' ? (optsOf(d)[0] || [''])[0] : (d.def != null ? d.def : '')));
  const optLabel = (d, v) => { const o = optsOf(d).find(x => String(x[0]) === String(v)); return o ? o[1] : v; };
  /* ═══════════════════════════════════════════════════════════════════════════════════════
     DATA HUB: whole-system reports (fleet, drivers, trips, maintenance, fuel, finance, HR).
     Same engine as the depot reports: filters, grouping, column picker, print, Excel, CSV.
     Each report says who may see it (roles) and loads only when it is run.
     ═══════════════════════════════════════════════════════════════════════════════════════ */
  const A = x => (Array.isArray(x) ? x : []);
  const nz = v => Number(v) || 0;
  const ucw = s => String(s == null ? '' : s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const isoRx = /^\d{4}-\d{2}-\d{2}$/;
  const tsx = v => (isoRx.test(String(v || '')) ? new Date(v + 'T12:00:00').getTime() : ts(v));   // date-only values are read at noon so time zones cannot move the day
  const fdx = (v, st) => (!v ? '' : (isoRx.test(String(v)) ? fIso(v, st) : fd(v, st)));
  const daysTo = v => { if (!v) return null; const t = tsx(v); return isNaN(t) ? null : Math.ceil((t - Date.now()) / DAY); };
  const monthOf = v => { const t = tsx(v); if (isNaN(t)) return '(no date)'; const x = new Date(t); return x.getFullYear() + '-' + pad(x.getMonth() + 1); };
  const dayOf = v => { const t = tsx(v); return isNaN(t) ? '(no date)' : fd(t, 'dmy'); };
  const optsFrom = (list, fn, lab) => { const s = new Set(); A(list).forEach(x => { const v = fn(x); if (v != null && v !== '') s.add(String(v)); }); return [...s].sort().map(v => [v, lab ? lab(v) : ucw(v)]); };
  const inSet = (arr, v) => !arr || !arr.length || arr.indexOf(String(v)) > -1;
  const txtOk = (needle, v) => !needle || String(v == null ? '' : v).toLowerCase().indexOf(String(needle).toLowerCase()) > -1;
  const money = (v, cur) => N(v, (cur ? sym(cur) + ' ' : '') + num2(v));
  const kpiTable = pairs => ({ head: pairs.map(p => p[0]), align: pairs.map(() => 'n'), numbered: false, box: true, groups: [{ label: '', rows: [pairs.map(p => p[1])] }] });
  const kvTable = (title, head, rows, extra) => Object.assign({ title, head, align: head.map((h, i) => (i ? 'n' : '')), numbered: false, groups: [{ label: '', rows }], empty: 'Nothing to show for these filters.' }, extra || {});
  const sumBy = (rs, fnCur, fnVal) => { const by = {}; rs.forEach(r => { const c = fnCur(r); by[c] = (by[c] || 0) + nz(fnVal(r)); }); return by; };
  const rpcOrThrow = async (name, args) => {
    if (typeof supabase === 'undefined') throw new Error('Not connected to the database');
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw new Error(error.message || 'The server could not build this report');
    return data;
  };

  Object.assign(F, {
    truck: { l: 'Truck', k: 'multi', o: () => A(state.db.trucks).slice().sort((a, b) => String(a.reg).localeCompare(String(b.reg))).map(t => [t.id, up(t.reg)]), all: 'All trucks' },
    tkstatus: { l: 'Truck status', k: 'multi', o: () => optsFrom(state.db.trucks, t => t.status), all: 'All statuses' },
    dstatus: { l: 'Driver status', k: 'multi', o: () => optsFrom(state.db.drivers, d => d.status), all: 'All statuses' },
    tstatus: { l: 'Trip status', k: 'multi', o: () => (typeof TRIP_ALL_STATUSES !== 'undefined' && TRIP_ALL_STATUSES.length ? TRIP_ALL_STATUSES.map(s => [s, ucw(s)]) : optsFrom(state.db.trips, t => t.status)), all: 'All statuses' },
    wtype: { l: 'Work type', k: 'multi', o: () => optsFrom(state.db.trips, t => t.workType, x => x), all: 'All work types' },
    otype: { l: 'Outward type', k: 'multi', o: () => (typeof OUTWARD_TYPES !== 'undefined' ? OUTWARD_TYPES : []).map(x => [x, (typeof outwardTypeLabel === 'function' ? outwardTypeLabel(x) : x)]), all: 'All outward types' },
    mstatus: { l: 'Status', k: 'multi', o: () => optsFrom(state.db.maintenance, m => m.status), all: 'All statuses' },
    wsstatus: { l: 'Status', k: 'multi', o: () => optsFrom(state.db.workshop, m => m.status), all: 'All statuses' },
    rqstatus: { l: 'Status', k: 'multi', o: () => optsFrom(state.db.requisitions, m => m.status), all: 'All statuses' },
    psstatus: { l: 'Status', k: 'multi', o: () => optsFrom(state.db.vesselPrestaking, m => m.status), all: 'All statuses' },
    within: { l: 'Due / expiring within (days)', k: 'number', ph: 'e.g. 30 (includes overdue)' },
    fkind: { l: 'Entry kind', k: 'select', o: [['all', 'Pump fills and trip payments'], ['fills', 'Pump fills only (litres recorded)'], ['trips', 'Trip payments only']] },
    invstatus: { l: 'Invoice status', k: 'multi', o: () => optsFrom(state.db.invoices, i => i.status), all: 'All statuses' },
    curr: { l: 'Currency', k: 'multi', o: () => optsFrom(state.db.invoices, i => i.currency, x => x), all: 'All currencies' },
    invview: { l: 'Show', k: 'select', o: [['all', 'All invoices'], ['open', 'Unpaid balances only'], ['overdue', 'Overdue only']] },
    fdept: { l: 'Department / cost centre', k: 'select', o: () => [['', 'All departments']].concat((typeof HR_DEPTS !== 'undefined' ? HR_DEPTS : []).map(d => [d, d])) },
    fcat: { l: 'Expense category', k: 'select', o: () => [['', 'All categories']].concat(A(window.GARGO_FIN && GARGO_FIN.FIN_CATS).map(d => [d, d])) },
    fscope: { l: 'Show', k: 'select', o: [['full', 'Full summary'], ['revenue', 'Revenue & VAT'], ['payroll', 'Payroll'], ['expenses', 'Expenses'], ['payables', 'Payables'], ['ops', 'Workshop, requisitions, fuel']] },
    dept: { l: 'Department', k: 'multi', o: () => (typeof HR_DEPTS !== 'undefined' ? HR_DEPTS : []).map(d => [d, d]), all: 'All departments' },
    hrstatus: { l: 'Employment status', k: 'multi', o: [['active', 'Active'], ['exited', 'Exited']], all: 'All' },
    lstatus: { l: 'Leave status', k: 'multi', o: [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']], all: 'All statuses' },
    ltype: { l: 'Leave type', k: 'multi', o: ['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Study', 'Unpaid'].map(x => [x, x]), all: 'All types' },
    astatus: { l: 'Attendance status', k: 'multi', o: ['present', 'late', 'absent', 'leave', 'off'].map(x => [x, ucw(x)]), all: 'All statuses' },
    pstatus: { l: 'Payslip status', k: 'multi', o: ['draft', 'approved', 'paid'].map(x => [x, ucw(x)]), all: 'All statuses' },
  });

  /* A list report in a few lines. o.load(f) returns plain row objects; the engine filters, sorts, groups and prints them. */
  function sysRep(id, o) {
    const gl = [['none', 'No grouping']], keys = {};
    A(o.groups).forEach(g => { GRP[id + '.' + g[0]] = { l: g[1], fn: g[2], ord: g[3] }; gl.push([id + '.' + g[0], g[1]]); });
    A(o.sorts).forEach(s => { keys[s[0]] = s[2]; });
    def(id, Object.assign({ needs: 'none', noCtx: true }, o, {
      sorts: A(o.sorts).map(s => [s[0], s[1]]), groups: o.groups ? gl : [], defGroup: o.defGroup && o.defGroup !== 'none' ? id + '.' + o.defGroup : 'none',
      build: async function (f) {
        const rep = REP[id], st = sty(f, 'dmy');
        let rows = A(await o.load(f));
        if (o.dateOf) { const a = dayStart(f.from), b = dayEnd(f.to); rows = rows.filter(r => { const t = tsx(o.dateOf(r)); return t >= a && t <= b; }); }
        if (o.pass) rows = rows.filter(r => o.pass(f, r));
        rows.forEach(r => { r.sty = st; });
        if (f.q) { const q = String(f.q).toLowerCase(); rows = rows.filter(r => (r._h || (r._h = o.cols.map(c => String(txt(c.get(r)) == null ? '' : txt(c.get(r)))).join(' ').toLowerCase())).indexOf(q) > -1); }
        if (A(o.sorts).length) rows = sortRows(rows, f, keys, o.defSort || o.sorts[0][0]);
        const grouped = f.group && f.group !== 'none', tables = [];
        if (o.kpis) { const k = o.kpis(rows, f); if (k && k.length) tables.push(kpiTable(k)); }
        tables.push(makeList(rows, pickCols(rep, f), {
          group: f.group, foot: grouped ? (l, rs) => ({ text: 'Sub-total : ' + rs.length + (o.sum ? '    ' + o.sum(rs) : '') }) : null,
          grand: rs => ({ text: 'Total ' + (o.noun || 'records') + ' : ' + rs.length + (o.sum && rs.length ? '    ' + o.sum(rs) : '') }), empty: o.empty,
        }));
        const hdr = (o.dateOf || o.range) ? [['From Date', fIso(f.from, st)], ['To Date', fIso(f.to, st)], ['Report No', f.no || '']] : [['As at', fIso(todayIso(), st)], ['Report No', f.no || '']];
        return { title: o.title || o.label, count: rows.length, landscape: o.landscape !== false, hdr: hdr.filter(p => p[1]), tables, notes: o.notes };
      },
    }));
  }

  /* ───────── FLEET & DRIVERS ───────── */
  sysRep('fleet', {
    g: 'Fleet & drivers', label: 'Fleet Register & Service Due', desc: 'Every truck with status, driver, fuel level, mileage and when it is next due for service.', noRange: true,
    main: ['q', 'tkstatus', 'within'], filters: ['q', 'tkstatus', 'within'], noun: 'trucks',
    cols: [
      C('reg', 'Truck', r => r.reg, { on: 1 }), C('make', 'Make', r => up(r.make), { on: 1 }), C('type', 'Type', r => up(r.type), { on: 1 }), C('year', 'Year', r => r.year, { on: 1 }), C('status', 'Status', r => ucw(r.status), { on: 1 }),
      C('driver', 'Driver', r => up(r.driver), { on: 1 }), C('fuel', 'Fuel %', r => (r.fuel == null ? '' : N(r.fuel, Math.round(nz(r.fuel)) + '%')), { on: 1, num: 1 }), C('mileage', 'Mileage (km)', r => N(r.mileage, Math.round(r.mileage).toLocaleString('en-US')), { on: 1, num: 1 }),
      C('trips', 'Trips', r => r.trips, { on: 1, num: 1 }), C('last', 'Last service', r => fdx(r.last, r.sty), { on: 1 }), C('next', 'Next service', r => fdx(r.next, r.sty), { on: 1 }),
      C('days', 'Service in (days)', r => (r.days == null ? '' : r.days), { on: 1, num: 1 }), C('vin', 'VIN', r => r.vin), C('notes', 'Notes', r => r.notes, { wrap: 1 }),
    ],
    sorts: [['reg', 'Truck', r => r.reg], ['status', 'Status', r => r.status], ['mileage', 'Mileage', r => r.mileage], ['fuel', 'Fuel %', r => nz(r.fuel)], ['next', 'Next service', r => (r.days == null ? 1e9 : r.days)], ['trips', 'Trips', r => r.trips]],
    groups: [['status', 'Status', r => ucw(r.status) || '(none)'], ['make', 'Make', r => up(r.make) || '(none)']], defGroup: 'none',
    load: async () => {
      const dr = new Map(), tc = {};
      A(state.db.drivers).forEach(d => { if (d.truckId) dr.set(d.truckId, d.name); });
      A(state.db.trips).forEach(t => { tc[t.truckId] = (tc[t.truckId] || 0) + 1; });
      return A(state.db.trucks).map(t => ({ reg: up(t.reg), make: t.make || '', type: t.type || '', year: t.year || '', status: t.status || '', driver: dr.get(t.id) || '', fuel: t.fuelPct, mileage: nz(t.mileage), trips: tc[t.id] || 0, last: t.lastService, next: t.nextService, vin: up(t.vin), notes: t.notes || '', days: daysTo(t.nextService) }));
    },
    pass: (f, r) => inSet(f.tkstatus, r.status) && (!numOk(f.within) || (r.days != null && r.days <= Number(f.within))),
  });

  sysRep('drivers', {
    g: 'Fleet & drivers', label: 'Driver Register & Licences', desc: 'Drivers with phone, licence number and expiry, assigned truck and trips. Find licences about to expire.', noRange: true,
    main: ['q', 'dstatus', 'within'], filters: ['q', 'dstatus', 'within'], noun: 'drivers',
    cols: [
      C('name', 'Driver', r => up(r.name), { on: 1 }), C('phone', 'Phone', r => r.phone, { on: 1 }), C('idno', 'ID No.', r => r.idNo, { on: 1 }), C('status', 'Status', r => ucw(r.status), { on: 1 }), C('truck', 'Truck', r => r.truck, { on: 1 }),
      C('licence', 'Licence No.', r => up(r.licence), { on: 1 }), C('exp', 'Licence expiry', r => fdx(r.exp, r.sty), { on: 1 }), C('days', 'Days left', r => (r.days == null ? '' : r.days), { on: 1, num: 1 }),
      C('state', 'Licence', r => (r.days == null ? 'NO EXPIRY ON FILE' : r.days < 0 ? 'EXPIRED' : r.days <= 30 ? 'EXPIRES SOON' : 'VALID'), { on: 1 }), C('trips', 'Trips', r => r.trips, { on: 1, num: 1 }), C('rating', 'Rating', r => (r.rating == null ? '' : r.rating)),
    ],
    sorts: [['name', 'Driver', r => r.name], ['status', 'Status', r => r.status], ['days', 'Licence expiry', r => (r.days == null ? 1e9 : r.days)], ['trips', 'Trips', r => r.trips]], defSort: 'name',
    groups: [['status', 'Status', r => ucw(r.status) || '(none)'], ['truck', 'Truck', r => r.truck || '(unassigned)']], defGroup: 'none',
    load: async () => {
      const tc = {}; A(state.db.trips).forEach(t => { tc[t.driverId] = (tc[t.driverId] || 0) + 1; });
      return A(state.db.drivers).map(d => ({ name: d.name || '', phone: d.phone || '', idNo: d.idNo || '', status: d.status || '', truck: up(d.truckId ? regOf(d.truckId) : ''), licence: d.licence || '', exp: d.licenceExp, days: daysTo(d.licenceExp), trips: tc[d.id] || 0, rating: d.rating }));
    },
    pass: (f, r) => inSet(f.dstatus, r.status) && (!numOk(f.within) || (r.days != null && r.days <= Number(f.within))),
  });

  /* ───────── TRIPS ───────── */
  async function loadTrips(f) {
    const mem = () => A(state.db.trips);
    if (!navigator.onLine || typeof fetchAllPaginated !== 'function' || typeof supabase === 'undefined' || typeof tripFromRow !== 'function') return mem();
    try {
      const a = new Date(dayStart(f.from)).toISOString(), b = new Date(dayEnd(f.to)).toISOString();
      const build = () => {
        let q = supabase.from('trips').select('*').gte('start_time', a).lte('start_time', b);
        if (f.truck && f.truck.length) q = q.in('truck_id', f.truck);
        if (f.tstatus && f.tstatus.length) q = q.in('status', f.tstatus);
        if (f.wtype && f.wtype.length) q = q.in('work_type', f.wtype);
        if (f.otype && f.otype.length) q = q.in('outward_type', f.otype);
        return q.order('start_time', { ascending: false });
      };
      const { data, error } = await fetchAllPaginated((from, to) => build().range(from, to));
      if (error) throw error;
      return (data || []).map(tripFromRow);
    } catch (x) {
      console.warn('Data Hub: trip query failed, using the trips already loaded', x);
      if (typeof toast === 'function') toast('Could not reach the server. Showing the trips already on this device.', 'error', 5000);
      return mem();
    }
  }
  sysRep('trips', {
    g: 'Trips & dispatch', label: 'Trip Report', desc: 'Every trip in the period: truck, driver, work type, route, status and distance. Reads the full history from the server.',
    main: ['line', 'truck', 'tstatus', 'wtype', 'otype', 'container', 'q'], filters: ['line', 'truck', 'tstatus', 'wtype', 'otype', 'container', 'driver', 'q'], noun: 'trips',
    cols: [
      C('date', 'Started', r => fdx(r.t.startTime, r.sty) + ' ' + ft(r.t.startTime), { on: 1 }), C('container', 'Container No.', r => r.container, { on: 1 }), C('ctype', 'Size / type', r => up(r.t.ctype), { on: 1 }),
      C('truck', 'Truck', r => r.truck, { on: 1 }), C('driver', 'Driver', r => r.driver, { on: 1 }), C('work', 'Work type', r => r.work, { on: 1 }), C('otype', 'Outward type', r => (typeof outwardTypeLabel === 'function' ? outwardTypeLabel(r.otype) : r.otype), { on: 1 }),
      C('route', 'Route', r => r.route, { on: 1, wrap: 1 }), C('status', 'Status', r => ucw(r.t.status), { on: 1 }), C('prio', 'Priority', r => ucw(r.t.priority), { on: 1 }), C('dist', 'Distance (km)', r => N(r.t.distance, String(nz(r.t.distance))), { on: 1, num: 1 }),
      C('eta', 'ETA', r => ft(r.t.eta)), C('line', 'Line', r => lineLabel(r.t.shippingLine)), C('ref', 'Reference', r => up(r.t.ref || r.t.releaseOrderNo)), C('vessel', 'Vessel', r => up(r.t.vessel)), C('notes', 'Notes', r => up(r.t.notes), { wrap: 1 }),
    ],
    sorts: [['date', 'Start time', r => r.at], ['container', 'Container No.', r => r.container], ['truck', 'Truck', r => r.truck], ['driver', 'Driver', r => r.driver], ['status', 'Status', r => r.t.status || ''], ['dist', 'Distance', r => nz(r.t.distance)]], defSort: 'date', defDir: 'desc',
    groups: [['line', 'Shipping line', r => lineLabel(r.t.shippingLine)], ['status', 'Status', r => ucw(r.t.status) || '(none)'], ['work', 'Work type', r => r.work || '(none)'], ['truck', 'Truck', r => r.truck || '(none)'], ['driver', 'Driver', r => r.driver || '(none)'],
      ['day', 'Day', r => dayOf(r.at), (a, b) => a[1][0].at - b[1][0].at], ['month', 'Month', r => monthOf(r.at)]], defGroup: 'none',
    dateOf: r => r.at,
    load: async f => (await loadTrips(f)).map(t => ({ t, at: tsx(t.startTime), container: up(t.container), truckId: t.truckId, truck: up(regOf(t.truckId)), driver: up(t.driverId ? drvOf(t.driverId) : ''), work: t.workType || '', otype: t.outwardType || '', route: (up(t.origin) + ' → ' + up(t.dest)).trim() })),
    pass: (f, r) => inSet(f.truck, r.truckId) && inSet(f.tstatus, r.t.status) && inSet(f.wtype, r.work) && inSet(f.otype, r.otype) && txtOk(f.driver, r.driver) &&
      (!f.line || !f.line.length || f.line.some(l => (l === '__none__' ? !r.t.shippingLine : r.t.shippingLine === l))) && (!f._tok.length || f._tok.some(k => key(r.container).indexOf(k) > -1)),
    kpis: rows => [['Trips', rows.length], ['Completed', rows.filter(r => r.t.status === 'completed').length], ['Active', rows.filter(r => r.t.status === 'active').length], ['Delayed / breakdown', rows.filter(r => r.t.status === 'delayed' || r.t.status === 'breakdown').length], ['Distance (km)', Math.round(rows.reduce((s, r) => s + nz(r.t.distance), 0)).toLocaleString('en-US')]],
    sum: rs => 'Distance : ' + Math.round(rs.reduce((s, r) => s + nz(r.t.distance), 0)).toLocaleString('en-US') + ' km',
  });

  /* ───────── MAINTENANCE, WORKSHOP, REQUISITIONS, FUEL, FLEET COST ───────── */
  sysRep('maintenance', {
    g: 'Maintenance & fuel', label: 'Maintenance Log', desc: 'Breakdowns and servicing by truck: type, priority, status, technician and cost.',
    main: ['lorry', 'mstatus', 'q'], filters: ['lorry', 'mstatus', 'q'], noun: 'issues',
    cols: [
      C('date', 'Date', r => fdx(r.m.date, r.sty), { on: 1 }), C('truck', 'Truck', r => r.truck, { on: 1 }), C('type', 'Type', r => ucw(r.m.type), { on: 1 }), C('desc', 'Description', r => r.m.desc || '', { on: 1, wrap: 1 }),
      C('prio', 'Priority', r => ucw(r.m.priority), { on: 1 }), C('status', 'Status', r => ucw(r.m.status), { on: 1 }), C('tech', 'Technician', r => r.m.tech || '', { on: 1 }), C('cost', 'Cost (KSh)', r => N(r.m.cost), { on: 1, num: 1 }), C('resolved', 'Resolved', r => fdx(r.m.resolvedDate, r.sty), { on: 1 }),
    ],
    sorts: [['date', 'Date', r => r.at], ['truck', 'Truck', r => r.truck], ['status', 'Status', r => r.m.status || ''], ['cost', 'Cost', r => nz(r.m.cost)]], defSort: 'date', defDir: 'desc',
    groups: [['truck', 'Truck', r => r.truck || '(none)'], ['status', 'Status', r => ucw(r.m.status) || '(none)'], ['type', 'Type', r => ucw(r.m.type) || '(none)'], ['month', 'Month', r => monthOf(r.m.date)]], defGroup: 'none',
    dateOf: r => r.m.date,
    load: async () => A(state.db.maintenance).map(m => ({ m, at: tsx(m.date), truckId: m.truckId, truck: up(regOf(m.truckId)) })),
    pass: (f, r) => inSet(f.mstatus, r.m.status) && txtOk(f.lorry, r.truck),
    sum: rs => 'Cost : KSh ' + num2(rs.reduce((s, r) => s + nz(r.m.cost), 0)),
  });

  sysRep('workshop', {
    g: 'Maintenance & fuel', label: 'Workshop Jobs', desc: 'Truck workshop jobs with diagnosis, parts, labour and total cost.',
    main: ['lorry', 'wsstatus', 'q'], filters: ['lorry', 'wsstatus', 'q'], noun: 'jobs',
    cols: [
      C('date', 'Reported', r => fdx(r.w.reported, r.sty), { on: 1 }), C('truck', 'Truck', r => r.truck, { on: 1 }), C('title', 'Job', r => r.w.title || '', { on: 1, wrap: 1 }), C('desc', 'Description', r => r.w.desc || '', { on: 1, wrap: 1 }),
      C('tech', 'Technician', r => r.w.tech || '', { on: 1 }), C('status', 'Status', r => ucw(r.w.status), { on: 1 }), C('diag', 'Diagnosed', r => fdx(r.w.diagnosed, r.sty), { on: 1 }),
      C('parts', 'Parts (KSh)', r => N(r.w.parts), { on: 1, num: 1 }), C('labour', 'Labour (KSh)', r => N(r.w.labour), { on: 1, num: 1 }), C('total', 'Total (KSh)', r => N(r.w.total), { on: 1, num: 1 }),
    ],
    sorts: [['date', 'Reported', r => r.at], ['truck', 'Truck', r => r.truck], ['status', 'Status', r => r.w.status || ''], ['total', 'Total', r => nz(r.w.total)]], defSort: 'date', defDir: 'desc',
    groups: [['truck', 'Truck', r => r.truck || '(none)'], ['status', 'Status', r => ucw(r.w.status) || '(none)'], ['month', 'Month', r => monthOf(r.w.reported)]], defGroup: 'none',
    dateOf: r => r.w.reported,
    load: async () => A(state.db.workshop).map(w => ({ w, at: tsx(w.reported), truck: up(regOf(w.truckId)) })),
    pass: (f, r) => inSet(f.wsstatus, r.w.status) && txtOk(f.lorry, r.truck),
    sum: rs => 'Total : KSh ' + num2(rs.reduce((s, r) => s + nz(r.w.total), 0)),
  });

  sysRep('requisitions', {
    g: 'Maintenance & fuel', label: 'Requisitions', desc: 'Requests for fuel, parts and cash: who asked, what for, how much and who approved.',
    main: ['rqstatus', 'q'], filters: ['rqstatus', 'q'], noun: 'requisitions',
    cols: [
      C('date', 'Date', r => fdx(r.r.date, r.sty), { on: 1 }), C('who', 'Requested by', r => r.r.requester || '', { on: 1 }), C('cat', 'Category', r => ucw(r.r.category), { on: 1 }), C('items', 'Items', r => r.r.items || '', { on: 1, wrap: 1 }),
      C('amount', 'Amount (KSh)', r => N(r.r.amount), { on: 1, num: 1 }), C('status', 'Status', r => ucw(r.r.status), { on: 1 }), C('appr', 'Approved by', r => r.r.approver || '', { on: 1 }), C('appd', 'Approved on', r => fdx(r.r.approvedDate, r.sty), { on: 1 }), C('notes', 'Notes', r => r.r.notes || '', { wrap: 1 }),
    ],
    sorts: [['date', 'Date', r => r.at], ['who', 'Requested by', r => r.r.requester || ''], ['amount', 'Amount', r => nz(r.r.amount)], ['status', 'Status', r => r.r.status || '']], defSort: 'date', defDir: 'desc',
    groups: [['status', 'Status', r => ucw(r.r.status) || '(none)'], ['cat', 'Category', r => ucw(r.r.category) || '(none)'], ['who', 'Requested by', r => r.r.requester || '(none)'], ['month', 'Month', r => monthOf(r.r.date)]], defGroup: 'none',
    dateOf: r => r.r.date,
    load: async () => A(state.db.requisitions).map(x => ({ r: x, at: tsx(x.date) })),
    pass: (f, r) => inSet(f.rqstatus, r.r.status),
    sum: rs => 'Amount : KSh ' + num2(rs.reduce((s, r) => s + nz(r.r.amount), 0)),
  });

  const fuelTot = f => (typeof fuelLogTotal === 'function' ? fuelLogTotal(f) : (nz(f.totalPaid) || nz(f.litres) * nz(f.pricePerLitre)));
  sysRep('fuel', {
    g: 'Maintenance & fuel', label: 'Fuel & Trip Payments', desc: 'Pump fills and imported trip payments: litres, price, total paid, route and container size. Group by truck, driver, route, size, day or month.',
    main: ['lorry', 'driver', 'fkind', 'q'], filters: ['lorry', 'driver', 'fkind', 'q'], noun: 'entries',
    cols: [
      C('date', 'Date', r => fdx(r.f.date, r.sty), { on: 1 }), C('truck', 'Truck', r => r.truck, { on: 1 }), C('driver', 'Driver', r => r.driver, { on: 1 }), C('container', 'Container', r => up(r.f.container), { on: 1 }), C('size', 'Size / type', r => up(r.f.ctype), { on: 1 }),
      C('from', 'From', r => up(r.f.routeFrom), { on: 1 }), C('to', 'To', r => up(r.f.routeTo), { on: 1 }), C('litres', 'Litres', r => N(r.f.litres, nz(r.f.litres) ? nz(r.f.litres).toFixed(1) : ''), { on: 1, num: 1 }),
      C('ppl', 'KSh / litre', r => N(r.f.pricePerLitre, nz(r.f.pricePerLitre) ? num2(r.f.pricePerLitre) : ''), { on: 1, num: 1 }), C('total', 'Total (KSh)', r => N(r.total), { on: 1, num: 1 }), C('station', 'Station / route', r => r.f.station || '', { on: 1 }),
      C('receipt', 'Reference', r => r.f.receipt || ''), C('odo', 'Odometer', r => r.f.odometer || '', { num: 1 }),
    ],
    sorts: [['date', 'Date', r => r.at], ['truck', 'Truck', r => r.truck], ['driver', 'Driver', r => r.driver], ['total', 'Total paid', r => r.total], ['litres', 'Litres', r => nz(r.f.litres)]], defSort: 'date', defDir: 'desc',
    groups: [['truck', 'Truck', r => r.truck || '(none)'], ['driver', 'Driver', r => r.driver || '(none)'], ['route', 'Route', r => ((up(r.f.routeFrom) + ' → ' + up(r.f.routeTo)).replace(/^ → $/, '') || '(no route)')],
      ['size', 'Container size', r => (r.st.size ? r.st.size + ' ft' : 'Unknown')], ['station', 'Station', r => r.f.station || '(none)'], ['day', 'Day', r => dayOf(r.f.date), (a, b) => a[1][0].at - b[1][0].at], ['month', 'Month', r => monthOf(r.f.date)]], defGroup: 'none',
    dateOf: r => r.f.date,
    load: async () => A(state.db.fuel).map(f => ({ f, at: tsx(f.date), total: fuelTot(f), st: sizeType(f.ctype), truck: up(typeof fuelTruckLabel === 'function' ? fuelTruckLabel(f) : (f.truckRegText || regOf(f.truckId))), driver: up(typeof fuelDriverLabel === 'function' ? fuelDriverLabel(f) : (f.driverNameText || (f.driverId ? drvOf(f.driverId) : ''))) })),
    pass: (f, r) => txtOk(f.lorry, r.truck) && txtOk(f.driver, r.driver) && (f.fkind === 'fills' ? nz(r.f.litres) > 0 : f.fkind === 'trips' ? !(nz(r.f.litres) > 0) : true),
    kpis: rows => [['Entries', rows.length], ['Total paid (KSh)', num2(rows.reduce((s, r) => s + r.total, 0))], ['Litres', Math.round(rows.reduce((s, r) => s + nz(r.f.litres), 0)).toLocaleString('en-US')], ['Average per entry (KSh)', rows.length ? num2(rows.reduce((s, r) => s + r.total, 0) / rows.length) : '0.00']],
    sum: rs => 'Litres : ' + Math.round(rs.reduce((s, r) => s + nz(r.f.litres), 0)).toLocaleString('en-US') + '    Paid : KSh ' + num2(rs.reduce((s, r) => s + r.total, 0)),
  });

  sysRep('fleetcost', {
    g: 'Maintenance & fuel', label: 'Fleet Running Costs by Truck', desc: 'Fuel and maintenance cost per truck for the period, with the grand total.', range: true,
    main: ['lorry', 'q'], filters: ['lorry', 'q'], noun: 'trucks',
    cols: [
      C('truck', 'Truck', r => r.truck, { on: 1 }), C('fe', 'Fuel entries', r => r.fe, { on: 1, num: 1 }), C('lit', 'Litres', r => N(r.lit, r.lit ? r.lit.toFixed(1) : '0'), { on: 1, num: 1 }), C('fuel', 'Fuel (KSh)', r => N(r.fuel), { on: 1, num: 1 }),
      C('mi', 'Maintenance issues', r => r.mi, { on: 1, num: 1 }), C('maint', 'Maintenance (KSh)', r => N(r.maint), { on: 1, num: 1 }), C('tot', 'Total (KSh)', r => N(r.fuel + r.maint), { on: 1, num: 1 }),
    ],
    sorts: [['truck', 'Truck', r => r.truck], ['tot', 'Total cost', r => r.fuel + r.maint], ['fuel', 'Fuel cost', r => r.fuel], ['maint', 'Maintenance cost', r => r.maint]], defSort: 'tot', defDir: 'desc',
    load: async f => {
      const a = dayStart(f.from), b = dayEnd(f.to), by = new Map(), get = k => { let o = by.get(k); if (!o) by.set(k, o = { truck: k, fe: 0, lit: 0, fuel: 0, mi: 0, maint: 0 }); return o; };
      A(state.db.fuel).forEach(x => { const t = tsx(x.date); if (!(t >= a && t <= b)) return; const o = get(up(typeof fuelTruckLabel === 'function' ? fuelTruckLabel(x) : (x.truckRegText || regOf(x.truckId))) || '(none)'); o.fe++; o.lit += nz(x.litres); o.fuel += fuelTot(x); });
      A(state.db.maintenance).forEach(x => { const t = tsx(x.date); if (!(t >= a && t <= b)) return; const o = get(up(regOf(x.truckId)) || '(none)'); o.mi++; o.maint += nz(x.cost); });
      return [...by.values()];
    },
    pass: (f, r) => txtOk(f.lorry, r.truck),
    sum: rs => 'Fuel : KSh ' + num2(rs.reduce((s, r) => s + r.fuel, 0)) + '    Maintenance : KSh ' + num2(rs.reduce((s, r) => s + r.maint, 0)) + '    Total : KSh ' + num2(rs.reduce((s, r) => s + r.fuel + r.maint, 0)),
  });

  /* ───────── VESSEL PRESTAKING ───────── */
  sysRep('prestaking', {
    g: 'Trips & dispatch', label: 'Vessel Prestaking', desc: 'Containers staged ahead of a vessel: planned date, shift, vessel and voyage, truck and driver, and whether they were shipped or shut out.',
    main: ['line', 'container', 'psstatus', 'vessel', 'q'], filters: ['line', 'container', 'psstatus', 'vessel', 'voyage', 'q'], noun: 'containers',
    cols: [
      C('date', 'Planned', r => fdx(r.p.plannedDate, r.sty), { on: 1 }), C('shift', 'Shift', r => ucw(r.p.shift), { on: 1 }), C('container', 'Container No.', r => r.container, { on: 1 }), C('ctype', 'Size / type', r => up(r.p.ctype), { on: 1 }), C('line', 'Line', r => lineLabel(r.p.line), { on: 1 }),
      C('vessel', 'Vessel', r => up(r.p.vessel), { on: 1 }), C('voyage', 'Voyage', r => up(r.p.voyage), { on: 1 }), C('consignee', 'Consignee', r => up(r.p.consignee), { on: 1 }), C('truck', 'Truck', r => r.truck, { on: 1 }), C('driver', 'Driver', r => r.driver, { on: 1 }),
      C('status', 'Status', r => ucw(r.p.status), { on: 1 }), C('orig', 'Origin', r => up(r.p.origin)), C('dest', 'Destination', r => up(r.p.destination)), C('notes', 'Notes', r => r.p.notes || '', { wrap: 1 }),
    ],
    sorts: [['date', 'Planned date', r => r.at], ['container', 'Container No.', r => r.container], ['vessel', 'Vessel', r => up(r.p.vessel)], ['status', 'Status', r => r.p.status || '']], defSort: 'date', defDir: 'desc',
    groups: [['line', 'Shipping line', r => lineLabel(r.p.line)], ['status', 'Status', r => ucw(r.p.status) || '(none)'], ['vessel', 'Vessel', r => up(r.p.vessel) || '(none)'], ['day', 'Planned day', r => dayOf(r.p.plannedDate), (a, b) => a[1][0].at - b[1][0].at]], defGroup: 'none',
    dateOf: r => r.p.plannedDate || r.p.createdAt,
    load: async () => A(state.db.vesselPrestaking).map(p => ({ p, at: tsx(p.plannedDate || p.createdAt), container: up(p.container), truck: up(p.truckId ? regOf(p.truckId) : ''), driver: up(p.driverId ? drvOf(p.driverId) : '') })),
    pass: (f, r) => inSet(f.psstatus, r.p.status) && txtOk(f.vessel, r.p.vessel) && txtOk(f.voyage, r.p.voyage) && (!f.line || !f.line.length || f.line.some(l => (l === '__none__' ? !r.p.line : r.p.line === l))) && (!f._tok.length || f._tok.some(k => key(r.container).indexOf(k) > -1)),
  });

  /* ───────── FINANCE (Finance and Administrators) ───────── */
  const invBal = i => Math.max(0, nz(i.total) - nz(i.paid));
  const curText = by => { const k = Object.keys(by).filter(c => by[c]); return k.length ? k.map(c => sym(c) + ' ' + num2(by[c])).join(' + ') : '0.00'; };
  sysRep('receivables', {
    g: 'Finance', roles: ['finance'], label: 'Customer Invoices & Receivables', desc: 'Invoices with total, paid, balance and days overdue. Switch to unpaid or overdue only.',
    main: ['invstatus', 'curr', 'invview', 'q'], filters: ['invstatus', 'curr', 'invview', 'q'], noun: 'invoices',
    cols: [
      C('date', 'Invoice date', r => fdx(r.i.date, r.sty), { on: 1 }), C('ref', 'Invoice', r => r.i.ref || String(r.i.id).slice(0, 8), { on: 1 }), C('client', 'Client', r => up(r.i.client), { on: 1 }), C('due', 'Due', r => fdx(r.i.due, r.sty), { on: 1 }),
      C('cur', 'Currency', r => r.i.currency || '', { on: 1 }), C('total', 'Total', r => N(r.i.total), { on: 1, num: 1 }), C('paid', 'Paid', r => N(r.i.paid), { on: 1, num: 1 }), C('bal', 'Balance', r => N(r.bal), { on: 1, num: 1 }),
      C('status', 'Status', r => ucw(r.i.status), { on: 1 }), C('over', 'Days overdue', r => (r.over > 0 ? r.over : ''), { on: 1, num: 1 }), C('terms', 'Terms', r => r.i.terms || ''),
    ],
    sorts: [['date', 'Invoice date', r => r.at], ['client', 'Client', r => up(r.i.client)], ['due', 'Due date', r => tsx(r.i.due) || 0], ['bal', 'Balance', r => r.bal], ['over', 'Days overdue', r => r.over]], defSort: 'date', defDir: 'desc',
    groups: [['client', 'Client', r => up(r.i.client) || '(none)'], ['status', 'Status', r => ucw(r.i.status) || '(none)'], ['cur', 'Currency', r => r.i.currency || '(none)'], ['month', 'Month', r => monthOf(r.i.date)]], defGroup: 'none',
    dateOf: r => r.i.date,
    load: async () => { const t = Date.now(); return A(state.db.invoices).map(i => { const bal = invBal(i), due = tsx(i.due); return { i, at: tsx(i.date), bal, over: bal > 0 && due && due < t ? Math.floor((t - due) / DAY) : 0 }; }); },
    pass: (f, r) => inSet(f.invstatus, r.i.status) && inSet(f.curr, r.i.currency) && (f.invview === 'open' ? r.bal > 0 && r.i.status !== 'draft' : f.invview === 'overdue' ? r.over > 0 : true),
    kpis: rows => [['Invoices', rows.length], ['Invoiced', curText(sumBy(rows, r => r.i.currency || 'USD', r => r.i.total))], ['Collected', curText(sumBy(rows, r => r.i.currency || 'USD', r => r.i.paid))], ['Outstanding', curText(sumBy(rows, r => r.i.currency || 'USD', r => r.bal))]],
    sum: rs => 'Balance : ' + curText(sumBy(rs, r => r.i.currency || 'USD', r => r.bal)),
  });

  def('fin_summary', {
    g: 'Finance', roles: ['finance'], label: 'Finance Summary (revenue, payroll, expenses)', desc: 'Revenue, VAT, payroll, operating expenses, payables and unposted operations costs for a period. Built on the server and re-checked against your role.',
    needs: 'none', noCtx: true, noCols: true, main: ['fdept', 'fcat', 'fscope'], filters: ['fdept', 'fcat', 'fscope'], cols: [], sorts: [], groups: [], defGroup: 'none',
    build: async function (f) {
      const d = await rpcOrThrow('fin_report', { p_from: f.from, p_to: f.to, p_dept: f.fdept || null, p_cat: f.fcat || null });
      if (!d) throw new Error('The finance report came back empty');
      const rv = d.revenue || {}, ex = d.expenses || {}, py = d.payroll || {}, bl = d.bills || {}, ops = A(d.ops), sc = s => f.fscope === 'full' || f.fscope === s;
      const unposted = Math.max(0, nz(py.gross) - nz(ex.salaries_posted)), net = nz(rv.total) - nz(ex.total) - unposted;
      const pairs = (title, arr, head) => kvTable(title, [head || 'Item', 'Amount (KSh)'], A(arr).map(p => [String(p[0]), money(p[1])]), { empty: 'No data in this range.' });
      const T = [kpiTable([['Revenue', num2(rv.total)], ['Operating expenses', num2(ex.total)], ['Payroll (approved / paid)', num2(py.gross)], ['Net result', f.fdept ? 'n/a' : num2(net)], ['Open payables', num2(bl.open)]])];
      if (sc('revenue')) {
        T.push(pairs('Revenue by stream', rv.by_stream, 'Stream'));
        T.push(kvTable('VAT and withholding tax', ['Item', 'Amount (KSh)'], [['VAT on receipts', money(rv.vat)], ['VAT on expenses (input)', money(ex.vat)], ['Withholding tax on expenses', money(ex.wht)]]));
        if (A(d.invoiced).length) T.push(kvTable('Invoiced in the period', ['Currency', 'Total', 'VAT'], A(d.invoiced).map(i => [String(i.currency), money(i.total), money(i.vat)])));
      }
      if (sc('payroll')) {
        T.push(kvTable('Payroll', ['Item', 'Amount (KSh)'], [['Gross', money(py.gross)], ['PAYE', money(py.paye)], ['NSSF', money(py.nssf)], ['SHIF', money(py.shif)], ['Housing levy', money(py.housing)], ['Net pay', money(py.net)], ['Posted to expenses', money(ex.salaries_posted)], ['Not yet posted', money(unposted)], ['Draft payslips (excluded)', N(py.drafts, String(nz(py.drafts)))]]));
        T.push(pairs('Payroll by department (gross)', py.by_dept, 'Department'));
      }
      if (sc('expenses')) { T.push(pairs('Expenses by category', ex.by_category, 'Category')); T.push(pairs('Expenses by cost centre', ex.by_cost_centre, 'Cost centre')); T.push(pairs('Expenses by payment method', ex.by_method, 'Method')); T.push(kvTable('Approval', ['Item', 'Amount (KSh)'], [['Awaiting approval', money(ex.pending)]])); }
      if (sc('payables')) { T.push(kvTable('Payables (bills dated in the range)', ['Item', 'Amount (KSh)'], [['Open', money(bl.open)], ['Overdue', money(bl.overdue)], ['Paid', money(bl.paid)]])); T.push(pairs('Open payables by supplier', bl.by_supplier, 'Supplier')); }
      if (sc('ops')) T.push(kvTable('Operations costs flowing to Finance', ['Source', 'Entries', 'Total (KSh)', 'Not yet posted (KSh)'], ops.map(o => [ucw(o.type), N(o.count, String(nz(o.count))), money(o.total), money(nz(o.total) - nz(o.posted))]), { empty: 'No operations costs in this range.' }));
      if (f.fscope === 'full') T.push(kvTable('Month by month', ['Month', 'Revenue', 'Expenses', 'Payroll gross', 'Revenue − expenses'], A(d.trend).map(t => [String(t.m), money(t.revenue), money(t.expenses), money(t.payroll), money(nz(t.revenue) - nz(t.expenses))]), { empty: 'No months in this range.' }));
      const st = sty(f, 'dmy');
      return { title: 'Finance Summary', count: nz(rv.count) + nz(ex.count) + nz(py.count), landscape: false, hdr: [['From Date', fIso(f.from, st)], ['To Date', fIso(f.to, st)], ['Department', f.fdept || 'All'], ['Category', f.fcat || 'All'], ['Report No', f.no || '']].filter(p => p[1]), tables: T,
        notes: ['Revenue is not split by department, so the net result is hidden when a department is chosen.'] };
    },
  });

  /* ───────── PEOPLE / HR ───────── */
  const HUB = () => window.GARGO_HUB || null;
  async function hrLoad(tables) {
    const H = HUB(); if (!H) throw new Error('The HR hub is not loaded on this device');
    await H.loadEmployees();
    return Promise.all(tables.map(t => H.load(t)));
  }
  const empOf = id => { const H = HUB(); return (H && H.emp && H.emp[id]) || {}; };
  const yrs = v => { const t = tsx(v); return isNaN(t) ? '' : Math.max(0, (Date.now() - t) / 3.156e10).toFixed(1); };

  sysRep('hr_staff', {
    g: 'People (HR)', roles: ['hr', 'finance'], label: 'Staff Register', desc: 'Every employee with department, job title, start date, tenure and status.', noRange: true,
    main: ['dept', 'hrstatus', 'q'], filters: ['dept', 'hrstatus', 'q'], noun: 'employees',
    cols: [
      C('no', 'Staff No.', r => r.e.staff_no || '', { on: 1 }), C('name', 'Name', r => up(r.e.full_name), { on: 1 }), C('dept', 'Department', r => r.e.department || '', { on: 1 }), C('title', 'Job title', r => r.e.job_title || '', { on: 1 }),
      C('type', 'Type', r => r.e.employment_type || '', { on: 1 }), C('start', 'Start date', r => fdx(r.e.start_date, r.sty), { on: 1 }), C('ten', 'Tenure (yrs)', r => yrs(r.e.start_date), { on: 1, num: 1 }), C('status', 'Status', r => ucw(r.e.status), { on: 1 }),
      C('phone', 'Phone', r => r.e.phone || '', { on: 1 }), C('email', 'Email', r => r.e.email || ''), C('gender', 'Gender', r => r.e.gender || ''), C('basic', 'Basic salary (KSh)', r => N(r.e.basic_salary), { num: 1 }),
    ],
    sorts: [['name', 'Name', r => up(r.e.full_name)], ['no', 'Staff No.', r => r.e.staff_no || ''], ['dept', 'Department', r => r.e.department || ''], ['start', 'Start date', r => tsx(r.e.start_date) || 0]], defSort: 'name',
    groups: [['dept', 'Department', r => r.e.department || 'Unassigned'], ['status', 'Status', r => ucw(r.e.status) || '(none)'], ['type', 'Employment type', r => r.e.employment_type || '(none)'], ['gender', 'Gender', r => r.e.gender || 'Not stated']], defGroup: 'none',
    load: async () => { const [e] = await hrLoad(['employees']); return e.map(x => ({ e: x })); },
    pass: (f, r) => inSet(f.dept, r.e.department || 'Unassigned') && inSet(f.hrstatus, r.e.status),
  });

  sysRep('hr_leave', {
    g: 'People (HR)', roles: ['hr'], label: 'Leave Requests', desc: 'Leave by employee, type and status for a period, with working days.',
    main: ['dept', 'ltype', 'lstatus', 'q'], filters: ['dept', 'ltype', 'lstatus', 'q'], noun: 'requests',
    cols: [
      C('name', 'Employee', r => up(r.who.full_name), { on: 1 }), C('dept', 'Department', r => r.who.department || '', { on: 1 }), C('type', 'Leave type', r => r.l.leave_type || '', { on: 1 }), C('from', 'From', r => fdx(r.l.start_date, r.sty), { on: 1 }),
      C('to', 'To', r => fdx(r.l.end_date, r.sty), { on: 1 }), C('days', 'Days', r => N(r.l.days, String(nz(r.l.days))), { on: 1, num: 1 }), C('status', 'Status', r => ucw(r.l.status), { on: 1 }), C('reason', 'Reason', r => r.l.reason || '', { on: 1, wrap: 1 }),
    ],
    sorts: [['from', 'From date', r => tsx(r.l.start_date) || 0], ['name', 'Employee', r => up(r.who.full_name)], ['days', 'Days', r => nz(r.l.days)], ['status', 'Status', r => r.l.status || '']], defSort: 'from', defDir: 'desc',
    groups: [['name', 'Employee', r => up(r.who.full_name) || '(unknown)'], ['type', 'Leave type', r => r.l.leave_type || '(none)'], ['status', 'Status', r => ucw(r.l.status) || '(none)'], ['dept', 'Department', r => r.who.department || 'Unassigned']], defGroup: 'none',
    dateOf: r => r.l.start_date,
    load: async () => { const [l] = await hrLoad(['leave_requests']); return l.map(x => ({ l: x, who: empOf(x.employee_id) })); },
    pass: (f, r) => inSet(f.dept, r.who.department || 'Unassigned') && inSet(f.ltype, r.l.leave_type) && inSet(f.lstatus, r.l.status),
    sum: rs => 'Days : ' + rs.reduce((s, r) => s + nz(r.l.days), 0),
  });

  sysRep('hr_attendance', {
    g: 'People (HR)', roles: ['hr'], label: 'Attendance Register', desc: 'Daily attendance with time in and out. Group by employee to see lateness and absences.',
    main: ['dept', 'astatus', 'q'], filters: ['dept', 'astatus', 'q'], noun: 'entries',
    cols: [
      C('date', 'Date', r => fdx(r.a.work_date, r.sty), { on: 1 }), C('name', 'Employee', r => up(r.who.full_name), { on: 1 }), C('dept', 'Department', r => r.who.department || '', { on: 1 }), C('in', 'Time in', r => r.a.time_in || '', { on: 1 }),
      C('out', 'Time out', r => r.a.time_out || '', { on: 1 }), C('status', 'Status', r => ucw(r.a.status), { on: 1 }),
    ],
    sorts: [['date', 'Date', r => tsx(r.a.work_date) || 0], ['name', 'Employee', r => up(r.who.full_name)], ['status', 'Status', r => r.a.status || '']], defSort: 'date', defDir: 'desc',
    groups: [['name', 'Employee', r => up(r.who.full_name) || '(unknown)'], ['status', 'Status', r => ucw(r.a.status) || '(none)'], ['dept', 'Department', r => r.who.department || 'Unassigned'], ['day', 'Day', r => dayOf(r.a.work_date), (a, b) => a[1][0].at - b[1][0].at]], defGroup: 'none',
    dateOf: r => r.a.work_date,
    load: async () => { const [a] = await hrLoad(['attendance']); return a.map(x => ({ a: x, at: tsx(x.work_date), who: empOf(x.employee_id) })); },
    pass: (f, r) => inSet(f.dept, r.who.department || 'Unassigned') && inSet(f.astatus, r.a.status),
    sum: rs => ['present', 'late', 'absent', 'leave', 'off'].map(s => ucw(s) + ' : ' + rs.filter(r => r.a.status === s).length).join('    '),
  });

  sysRep('hr_payroll', {
    g: 'People (HR)', roles: ['hr', 'finance'], label: 'Payroll Register', desc: 'Payslips by period with PAYE, NSSF, SHIF, housing levy and net pay. The range picks whole months.', range: true,
    main: ['dept', 'pstatus', 'q'], filters: ['dept', 'pstatus', 'q'], noun: 'payslips',
    cols: [
      C('period', 'Period', r => r.p.period || '', { on: 1 }), C('name', 'Employee', r => up(r.who.full_name), { on: 1 }), C('dept', 'Department', r => r.who.department || '', { on: 1 }), C('basic', 'Basic', r => N(r.p.basic), { on: 1, num: 1 }),
      C('allow', 'Allowances', r => N(r.p.allowances), { num: 1 }), C('gross', 'Gross', r => N(r.p.gross), { on: 1, num: 1 }), C('paye', 'PAYE', r => N(r.p.paye), { on: 1, num: 1 }), C('nssf', 'NSSF', r => N(r.p.nssf), { on: 1, num: 1 }),
      C('shif', 'SHIF', r => N(r.p.shif), { on: 1, num: 1 }), C('ahl', 'Housing levy', r => N(r.p.housing_levy), { on: 1, num: 1 }), C('oth', 'Other deductions', r => N(r.p.other_deductions), { num: 1 }), C('net', 'Net pay', r => N(r.p.net), { on: 1, num: 1 }), C('status', 'Status', r => ucw(r.p.status), { on: 1 }),
    ],
    sorts: [['period', 'Period', r => r.p.period || ''], ['name', 'Employee', r => up(r.who.full_name)], ['gross', 'Gross', r => nz(r.p.gross)], ['net', 'Net pay', r => nz(r.p.net)]], defSort: 'period', defDir: 'desc',
    groups: [['period', 'Period', r => r.p.period || '(none)'], ['dept', 'Department', r => r.who.department || 'Unassigned'], ['status', 'Status', r => ucw(r.p.status) || '(none)'], ['name', 'Employee', r => up(r.who.full_name) || '(unknown)']], defGroup: 'none',
    load: async () => { const [p] = await hrLoad(['payroll']); return p.map(x => ({ p: x, who: empOf(x.employee_id) })); },
    pass: (f, r) => (r.p.period || '') >= f.from.slice(0, 7) && (r.p.period || '') <= f.to.slice(0, 7) && inSet(f.dept, r.who.department || 'Unassigned') && inSet(f.pstatus, r.p.status),
    sum: rs => { const s = k => num2(rs.reduce((a, r) => a + nz(r.p[k]), 0)); return 'Gross : ' + s('gross') + '    PAYE : ' + s('paye') + '    NSSF : ' + s('nssf') + '    SHIF : ' + s('shif') + '    Levy : ' + s('housing_levy') + '    Net : ' + s('net'); },
  });

  /* ───────── OVERVIEW: one page that captures the whole system ───────── */
  def('snapshot', {
    g: 'Overview', label: 'System Snapshot', desc: 'One page for the whole operation right now: fleet, drivers, trips, depot, workshop, requisitions and money owed.',
    needs: 'none', noCtx: true, noCols: true, noRange: true, filters: [], cols: [], sorts: [], groups: [], defGroup: 'none',
    build: async function (f) {
      const db = state.db, T = [], by = (list, fn) => { const m = {}; A(list).forEach(x => { const k = fn(x) || '(none)'; m[k] = (m[k] || 0) + 1; }); return m; };
      const cnt = (list, fn) => A(list).filter(fn).length, today = new Date().toDateString();
      const rows = obj => Object.keys(obj).sort().map(k => [ucw(k), N(obj[k], String(obj[k]))]);
      T.push(kvTable('Fleet', ['Measure', 'Trucks'], [['Trucks on the register', N(A(db.trucks).length, String(A(db.trucks).length))]].concat(rows(by(db.trucks, t => t.status))).concat([['Service due within 14 days (or overdue)', N(cnt(db.trucks, t => { const d = daysTo(t.nextService); return d != null && d <= 14; }))]])));
      T.push(kvTable('Drivers', ['Measure', 'Drivers'], [['Drivers on the register', N(A(db.drivers).length)]].concat(rows(by(db.drivers, d => d.status))).concat([['Licence expired', N(cnt(db.drivers, d => { const x = daysTo(d.licenceExp); return x != null && x < 0; }))], ['Licence expires within 30 days', N(cnt(db.drivers, d => { const x = daysTo(d.licenceExp); return x != null && x >= 0 && x <= 30; }))]])));
      T.push(kvTable('Trips on this device', ['Measure', 'Trips'], rows(by(db.trips, t => t.status)).concat([['Started today', N(cnt(db.trips, t => new Date(t.startTime).toDateString() === today))]]), { empty: 'No trips loaded.' }));
      let depot = [['Shutouts open', N(cnt(db.shutouts, s => s.status === 'open'))], ['Prestaked containers waiting', N(cnt(db.vesselPrestaking, p => p.status === 'staged'))]];
      try { if (window.ICR && ICR.enabled && navigator.onLine) { const c = await ICR.counts(); depot = [['Gate-ins today', N(nz(c.gate_in_today))], ['Interchange records pending', N(nz(c.pending))]].concat(depot); } else depot = [['Gate-ins today', N(cnt(db.interchange, i => (i.type === 'Gate-In' || i.type === 'Depot-In') && new Date(i.date).toDateString() === today))]].concat(depot); } catch (x) { /* counts are a bonus */ }
      T.push(kvTable('Depot', ['Measure', 'Count'], depot));
      T.push(kvTable('Maintenance, workshop and requisitions', ['Measure', 'Count'], [['Maintenance issues open', N(cnt(db.maintenance, m => m.status === 'open'))], ['Maintenance issues in progress', N(cnt(db.maintenance, m => m.status === 'in_progress'))], ['Workshop jobs not finished', N(cnt(db.workshop, w => w.status && !/complete|closed|done/i.test(w.status)))], ['Container repairs awaiting approval', N(cnt(db.containerRepairs, c => c.status === 'awaiting_approval'))], ['Requisitions pending', N(cnt(db.requisitions, r => r.status === 'pending'))]]));
      if (typeof canFinance === 'function' && canFinance()) {
        const open = A(db.invoices).filter(i => invBal(i) > 0 && i.status !== 'draft'), over = open.filter(i => { const d = tsx(i.due); return d && d < Date.now(); });
        T.push(kvTable('Customer invoices', ['Measure', 'Value'], [['Unpaid invoices', N(open.length)], ['Unpaid balance', curText(sumBy(open, i => i.currency || 'USD', invBal))], ['Overdue invoices', N(over.length)], ['Overdue balance', curText(sumBy(over, i => i.currency || 'USD', invBal))]]));
      }
      return { title: 'System Snapshot', count: T.length, landscape: false, hdr: [['As at', fIso(todayIso(), sty(f, 'dmy')) + ' ' + ft(new Date())], ['Report No', f.no || '']].filter(p => p[1]), tables: T, notes: ['Counts come from the data loaded on this device and from the server where marked. Use the other reports for detail.'] };
    },
  });

  def('pipeline', {
    g: 'Overview', label: 'Depot Storage Pipeline & Zone Occupancy', desc: 'Bookings waiting for survey or allocation, containers in storage, and how full each storage zone is.',
    needs: 'none', noCtx: true, noCols: true, noRange: true, filters: [], cols: [], sorts: [], groups: [], defGroup: 'none',
    build: async function (f) {
      const bd = window.bookingDocs; if (!bd) throw new Error('Depot bookings are not available on this device');
      const [zones, awaiting, surveyed, escalated] = await Promise.all([bd.listZones(), bd.awaitingSurveyBookings(), bd.surveyedAwaitingAllocation(), bd.escalatedBookings()]);
      let inStore = []; try { if (typeof depOpsRepatriationEligibleBookings === 'function') inStore = await depOpsRepatriationEligibleBookings(); } catch (x) { /* optional */ }
      const cap = A(zones).reduce((s, z) => s + nz(z.capacity_teu), 0), occ = A(zones).reduce((s, z) => s + nz(z.occupied_teu), 0);
      const T = [kvTable('Storage pipeline', ['Stage', 'Bookings'], [['Awaiting survey', N(A(awaiting).length)], ['Surveyed, awaiting allocation', N(A(surveyed).length)], ['Escalated (joint survey needed)', N(A(escalated).length)], ['Currently in storage', N(A(inStore).length)]]),
        kvTable('Zone occupancy', ['Zone', 'Capacity (TEU)', 'Occupied (TEU)', 'Free (TEU)', 'Full %'], A(zones).map(z => [String(z.name || z.zone_name || z.code || z.id), N(z.capacity_teu), N(z.occupied_teu), N(Math.max(nz(z.capacity_teu) - nz(z.occupied_teu), 0)), N(nz(z.capacity_teu) ? nz(z.occupied_teu) / nz(z.capacity_teu) * 100 : 0, nz(z.capacity_teu) ? Math.round(nz(z.occupied_teu) / nz(z.capacity_teu) * 100) + '%' : '')]).concat([['ALL ZONES', N(cap), N(occ), N(Math.max(cap - occ, 0)), N(cap ? occ / cap * 100 : 0, cap ? Math.round(occ / cap * 100) + '%' : '')]]))];
      return { title: 'Depot Storage Pipeline & Zone Occupancy', count: A(zones).length, landscape: false, hdr: [['As at', fIso(todayIso(), sty(f, 'dmy'))], ['Report No', f.no || '']].filter(p => p[1]), tables: T };
    },
  });

  def('dupes', {
    g: 'Exceptions', label: 'Duplicate Scan (same container, type and day)', desc: 'Searches the whole register on the server for repeats: the same container, movement type and day entered more than once. Runs only when you press Preview.',
    needs: 'none', noCtx: true, noCols: true, noRange: true, main: ['container', 'q'], filters: ['container', 'q'], cols: [], sorts: [], groups: [], defGroup: 'none',
    build: async function (f) {
      const data = await rpcOrThrow('find_interchange_duplicates');
      const rows = A(data).map(r => { const ic = icFromRow(r); return { container: up(ic.container), type: ic.type, at: ts(ic.date), eir: up(ic.eirNumber), status: ic.status, clerk: up(ic.clerkName), id: ic.id }; });
      const g = new Map(); rows.forEach(r => { const k = r.container + '::' + r.type + '::' + new Date(r.at).toDateString(); (g.get(k) || g.set(k, []).get(k)).push(r); });
      const toks = tokens(f), st = sty(f, 'dmy'); let sets = [...g.values()].filter(l => l.length > 1);
      if (toks.length) sets = sets.filter(l => toks.some(t => key(l[0].container).indexOf(t) > -1));
      if (f.q) sets = sets.filter(l => l.some(r => [r.container, r.type, r.eir, r.status, r.clerk].join(' ').toLowerCase().indexOf(String(f.q).toLowerCase()) > -1));
      sets.sort((a, b) => a[0].container.localeCompare(b[0].container));
      const t = { head: ['Container No.', 'Movement', 'Date', 'EIR No.', 'Status', 'Clerk'], align: ['', '', '', '', '', ''], numbered: false, empty: 'No duplicates found across the register.',
        groups: sets.map(l => ({ label: l[0].container + '  ·  ' + l[0].type + '  ·  ' + fd(l[0].at, st) + '  (' + l.length + ' records)', rows: l.map(r => [r.container, r.type, fd(r.at, st) + ' ' + ft(r.at), r.eir, ucw(r.status), r.clerk]) })) };
      return { title: 'Duplicate Scan', count: sets.reduce((s, l) => s + l.length, 0), landscape: true, hdr: [['As at', fIso(todayIso(), st)], ['Duplicate sets', String(sets.length)], ['Report No', f.no || '']].filter(p => p[1]), tables: [t],
        notes: ['Review these in Interchange. Genuine repeats can be flagged or removed there.'] };
    },
  });

  const PRESETS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 days'], ['last30', 'Last 30 days'], ['week', 'This week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['custom', 'Custom']];
  function presetRange(p) {
    const t = todayIso(), d = new Date();
    switch (p) {
      case 'today': return [t, t]; case 'yesterday': { const y = addDays(t, -1); return [y, y]; }
      case 'last7': return [addDays(t, -6), t]; case 'last30': return [addDays(t, -29), t];
      case 'week': return [addDays(t, -((d.getDay() + 6) % 7)), t]; case 'month': return [t.slice(0, 8) + '01', t];
      case 'lastmonth': return [isoOf(new Date(d.getFullYear(), d.getMonth() - 1, 1)), isoOf(new Date(d.getFullYear(), d.getMonth(), 0))];
      case 'year': return [d.getFullYear() + '-01-01', t];
    }
    return null;
  }
  function distinct(field) {
    const s = new Set(); (state.db.interchange || []).forEach(ic => { const v = field === 'vessel' ? ic.vessel : field === 'party' ? (ic.deliveringParty || ic.receivingParty) : field === 'transporter' ? ic.transporter : ic.clerkName; if (v && s.size < 400) s.add(up(v)); });
    return [...s].sort();
  }

  function fieldHtml(k, S, rep) {
    const d = F[k]; if (!d) return '';
    const v = S[k] !== undefined ? S[k] : defOf(d), id = 'rc_' + k;
    let inner = '';
    if (d.k === 'multi') {
      const sel = Array.isArray(v) ? v.map(String) : [];
      inner = '<details class="rc-ms" data-k="' + k + '"><summary class="rc-sum" data-all="' + e(d.all || 'All') + '">' + e(sel.length ? sel.map(x => optLabel(d, x)).join(', ') : (d.all || 'All')) + '</summary><div class="rc-box">' +
        optsOf(d).map(o => '<label><input type="checkbox" value="' + e(o[0]) + '"' + (sel.indexOf(String(o[0])) > -1 ? ' checked' : '') + '> ' + e(o[1]) + '</label>').join('') +
        '<div class="rc-box-foot"><button type="button" class="tbl-btn" data-rc="clear:' + k + '">Clear</button></div></div></details>';
    } else if (d.k === 'select') inner = '<select id="' + id + '">' + optsOf(d).map(o => '<option value="' + e(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select>';
    else if (d.k === 'number') inner = '<input id="' + id + '" type="number" min="0" step="0.5" value="' + e(v) + '">';
    else inner = '<input id="' + id + '" value="' + e(v) + '"' + (d.ph ? ' placeholder="' + e(d.ph) + '"' : '') + (d.dl ? ' list="rc_dl_' + d.dl + '"' : '') + ' autocomplete="off">';
    return '<div class="fg"><label>' + e(d.l) + '</label>' + inner + '</div>';
  }
  function relatedHtml(rep) {
    const ids = (RELATED[rep.id] || []).filter(k => REP[k] && canSee(REP[k])); if (!ids.length) return '';
    return '<div class="rc-related"><span class="rc-rel-l">Related reports</span>' + ids.map(k => '<button type="button" class="rc-chip" data-rc="go:' + k + '" title="Opens with the same shipping line and dates">' + e(REP[k].label) + '</button>').join('') + '</div>';
  }
  /* preview only: a container number opens that container's full history */
  function decorateLinks(out) {
    if (RC.cur === 'history') return;
    out.querySelectorAll('.rcp table').forEach(t => {
      const heads = [].map.call(t.querySelectorAll('thead th'), th => th.textContent.trim()), idx = heads.findIndex(h => /^cont(ainer)?\.?\s*no\.?$/i.test(h)); if (idx < 0) return;
      t.querySelectorAll('tbody tr').forEach(tr => { const td = tr.children[idx]; if (!td || td.querySelector('a')) return; const v = td.textContent.trim().toUpperCase(); if (/^[A-Z]{4}\d{7}$/.test(v)) td.innerHTML = '<a href="#" class="rc-link" data-rc="hist:' + v + '" title="Open the full history of this container">' + e(v) + '</a>'; });
    });
  }
  const layOf = rep => (RC.S.lay && RC.S.lay[rep.id]) || {};
  function uiHtml() {
    const rep = REP[RC.cur], S = RC.S, lay = layOf(rep), views = lsGet(LSV, {});
    const nav = ORDER.map(g => { const ks = Object.keys(REP).filter(k => REP[k].g === g && canSee(REP[k])); return !ks.length ? '' : '<div class="rc-nav-g">' + e(g) + '</div>' + ks.map(k => '<button type="button" class="' + (k === RC.cur ? 'on' : '') + '" data-rc="rep:' + k + '" title="' + e(REP[k].desc) + '">' + e(REP[k].label) + '</button>').join(''); }).join('');
    const mainWant = (rep.main || ['line', 'size', 'type', 'container', 'q']).slice(), main = rep.filters.filter(k => mainWant.indexOf(k) > -1).sort((a, b) => (b === 'line') - (a === 'line')), more = rep.filters.filter(k => main.indexOf(k) < 0);
    const cols = rep.colsFn ? rep.colsFn({ lift: S.lift }) : rep.cols, onCols = lay.cols && lay.cols.length ? lay.cols : cols.filter(c => c.on).map(c => c.k);
    const lsel = (id, label, opts, cur) => '<div class="fg"><label>' + label + '</label><select id="' + id + '">' + opts.map(o => '<option value="' + e(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select></div>';
    const colPick = cols.length ? '<div class="fg"><label>Columns</label><details class="rc-ms" data-k="cols"><summary class="rc-sum" data-all="Default columns">' + e(lay.cols && lay.cols.length ? lay.cols.length + ' columns chosen' : 'Default columns') + '</summary><div class="rc-box">' +
      cols.map(c => '<label><input type="checkbox" value="' + e(c.k) + '"' + (onCols.indexOf(c.k) > -1 ? ' checked' : '') + '> ' + e(c.h) + '</label>').join('') + '<div class="rc-box-foot"><button type="button" class="tbl-btn" data-rc="clear:cols">Use default</button></div></div></details></div>' : '';
    const layout = (rep.sorts.length ? lsel('rc_sort', 'Sort by', rep.sorts, lay.sort || rep.defSort || rep.sorts[0][0]) + lsel('rc_dir', 'Order', [['asc', 'Ascending'], ['desc', 'Descending']], lay.dir || rep.defDir || 'asc') : '<input type="hidden" id="rc_sort"><input type="hidden" id="rc_dir">') +
      (rep.groups.length ? lsel('rc_group', rep.id === 'stock' ? 'Layout' : 'Group by', rep.groups, lay.group || defGroupOf(rep)) : '<input type="hidden" id="rc_group">') + colPick;
    const vnames = Object.keys(views).sort();
    const dls = ['vessel', 'party', 'transporter', 'clerk'].filter(d => rep.filters.some(k => F[k] && F[k].dl === d)).map(d => '<datalist id="rc_dl_' + d + '">' + distinct(d).map(x => '<option value="' + e(x) + '">').join('') + '</datalist>').join('');
    return '<div class="rc-wrap"><div class="rc-nav">' + nav + '</div><div class="rc-main">' +
      '<div class="rc-panel"><div class="rc-title">' + e(rep.label) + '</div><div class="rc-desc">' + e(rep.desc) + '</div>' +
      (rep.needTok || rep.noRange ? '' : '<div class="rc-chips">' + PRESETS.map(p => '<button type="button" class="filter-btn' + ((S.preset || 'today') === p[0] ? ' active' : '') + '" data-rc="preset:' + p[0] + '">' + p[1] + '</button>').join('') + '</div>') +
      '<div class="rc-grid">' + (rep.needTok || rep.noRange ? '' : (rep.asAt ? '<input id="rc_from" type="hidden" value="' + e(S.to) + '"><div class="fg"><label>As at (date)</label><input id="rc_to" type="date" value="' + e(S.to) + '"></div>'
        : '<div class="fg"><label>From Date</label><input id="rc_from" type="date" value="' + e(S.from) + '"></div><div class="fg"><label>To Date</label><input id="rc_to" type="date" value="' + e(S.to) + '"></div>')) + main.map(k => fieldHtml(k, S, rep)).join('') + '</div>' +
      (more.length ? '<details class="rc-more"><summary>More filters (' + more.length + ')</summary><div class="rc-grid">' + more.map(k => fieldHtml(k, S, rep)).join('') + '</div></details>' : '') +
      '<details class="rc-more" open><summary>Layout &amp; print options</summary><div class="rc-grid">' + layout + ['no', 'dfmt', 'orient'].concat(rep.id === 'stock' ? ['cc'] : []).map(k => fieldHtml(k, S, rep)).join('') + '</div></details>' +
      '<div class="rc-actions"><button class="action-btn" data-rc="run">Preview</button><button class="action-btn ghost" data-rc="print">Print / PDF</button><button class="action-btn ghost" data-rc="excel">Excel</button><button class="action-btn ghost" data-rc="csv">CSV</button><button class="action-btn ghost" data-rc="copy">Copy</button><button class="action-btn ghost" data-rc="reset">Reset filters</button></div>' +
      relatedHtml(rep) + '<div class="rc-views"><input id="rc_vname" placeholder="Name this set of filters" maxlength="40"><button class="action-btn ghost" data-rc="saveview">Save view</button>' +
      (vnames.length ? '<select id="rc_vsel">' + vnames.map(n => '<option>' + e(n) + '</option>').join('') + '</select><button class="action-btn ghost" data-rc="loadview">Open</button><button class="action-btn ghost" data-rc="delview">Delete</button>' : '') + '</div>' + dls + '</div>' +
      '<div id="rcOut"></div></div></div>';
  }

  /* ───────────────────────── read / remember the form ───────────────────────── */
  const V = id => { const x = $(id); return x ? x.value : ''; };
  function multiRead(k) { const w = document.querySelector('#rcRoot .rc-ms[data-k="' + k + '"]'); return w ? [...w.querySelectorAll('input:checked')].map(i => i.value) : []; }
  function readForm(rep) {
    const f = {}, keys = rep.filters.concat(['no', 'cc', 'dfmt', 'orient']);
    keys.forEach(k => { const d = F[k]; if (!d) return; if (d.k === 'multi') f[k] = multiRead(k); else if (!$('rc_' + k)) f[k] = defOf(d); else if (d.k === 'number') { const v = V('rc_' + k); f[k] = v === '' ? '' : Number(v); } else f[k] = V('rc_' + k).trim(); });
    f.from = V('rc_from') || todayIso(); f.to = V('rc_to') || f.from; f.preset = RC.S.preset || 'custom';
    if (rep.asAt) f.from = f.to;
    f.sort = V('rc_sort'); f.dir = V('rc_dir'); f.group = V('rc_group') || defGroupOf(rep); f._tok = tokens(f);
    f.cols = multiRead('cols'); const dk = (rep.colsFn ? rep.colsFn(f) : rep.cols).filter(c => c.on).map(c => c.k);
    if (f.cols.length === dk.length && f.cols.every(k => dk.indexOf(k) > -1)) f.cols = [];     // untouched default set = "use default"
    return f;
  }
  function remember(rep, f) {
    const S = RC.S; S.rep = rep.id; S.from = f.from; S.to = f.to;
    Object.keys(f).forEach(k => { if (F[k]) S[k] = f[k]; });
    (S.lay = S.lay || {})[rep.id] = { sort: f.sort, dir: f.dir, group: f.group, cols: f.cols };
    lsSet(LS, S);
  }
  function stash() { const rep = REP[RC.cur]; if (rep && $('rcOut')) { try { const f = readForm(rep); const S = RC.S; S.from = f.from; S.to = f.to; Object.keys(f).forEach(k => { if (F[k]) S[k] = f[k]; }); (S.lay = S.lay || {})[rep.id] = { sort: f.sort, dir: f.dir, group: f.group, cols: f.cols }; } catch (x) {} } }

  /* ───────────────────────── rendering ───────────────────────── */
  const PAPER = `.rcp{background:#fff;color:#111;font:12px/1.35 Arial,Helvetica,sans-serif;padding:18px 22px;border-radius:6px;overflow-x:auto}
.rcp h1{margin:0 auto 6px;text-align:center;font-size:20px;letter-spacing:.3px;border:1px solid #444;padding:5px 12px;max-width:520px}
.rcp h2{margin:6px 0 10px;text-align:center;font-size:14px}.rcp h2.blue{color:#1a4fd6}
.rcp h3{margin:14px 0 6px;font-size:13px}
.rcp .hdr{display:grid;grid-template-columns:1fr 1fr;grid-gap:2px 24px;gap:2px 24px;margin:6px 0 8px;font-size:12px}
.rcp .hdr b{margin-right:4px}
.rcp .lnrow{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:15px;margin:6px 0}
.rcp .lnrow .bd{font-size:17px}
.rcp .fl{font-size:10px;color:#555;margin:2px 0 6px}
.rcp table{width:100%;border-collapse:collapse;font-size:11px}
.rcp th{text-align:left;font-size:10.5px;padding:4px 5px;border-top:1px solid #444;border-bottom:1px solid #444;white-space:nowrap}
.rcp td{padding:3px 5px;vertical-align:top;border-bottom:1px dotted #ddd;word-break:break-word}
.rcp td.n,.rcp th.n{text-align:right}
.rcp td.wrap{min-width:160px;max-width:300px}
.rcp .grp td{font-weight:700;border-bottom:1px solid #888;padding-top:8px}
.rcp .tot td{font-weight:700;border-top:1px solid #444;border-bottom:none;padding-top:6px}
.rcp .box{border:1px solid #444;margin:8px 0 14px;width:auto;min-width:60%}
.rcp .box th,.rcp .box td{border:1px solid #444;padding:4px 10px;text-align:center}
.rcp .box th{background:#f2f2f2}.rcp .box .tot td{border-top:2px solid #444}
.rcp .note{font-size:10px;color:#555;margin-top:8px}.rcp .empty{padding:18px;text-align:center;color:#666}`;
  const UI_CSS = `.rc-wrap{display:grid;grid-template-columns:230px minmax(0,1fr);grid-gap:14px;gap:14px;align-items:start}
.rc-nav{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:8px 10px 12px}
.rc-nav-g{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--text-3);margin:12px 4px 5px}
.rc-nav button{display:block;width:100%;text-align:left;padding:8px 10px;margin-bottom:2px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--text-2);font-size:12.5px;cursor:pointer}
.rc-nav button:hover{background:var(--hover)}.rc-nav button.on{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold);font-weight:600}
.rc-main{min-width:0}.rc-panel{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px}
.rc-title{font-size:16px;font-weight:700;color:var(--text)}.rc-desc{font-size:12px;color:var(--text-2);margin:2px 0 10px}
.rc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.rc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));grid-gap:10px;gap:10px;margin-bottom:10px}.rc-grid .fg{margin:0}
.rc-more{margin:6px 0 10px}.rc-more>summary{cursor:pointer;font-size:12px;color:var(--gold);padding:6px 0}
.rc-ms{position:relative}.rc-sum{list-style:none;cursor:pointer;border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--surface-2);color:var(--text);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:40px;box-sizing:border-box}
.rc-sum::-webkit-details-marker{display:none}
.rc-box{position:absolute;z-index:40;left:0;right:0;min-width:200px;max-height:260px;overflow:auto;background:var(--glass-strong);border:1px solid var(--border-mid);border-radius:10px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.rc-box label{display:flex;align-items:center;gap:8px;padding:7px 8px;font-size:12.5px;color:var(--text);cursor:pointer;border-radius:6px;margin:0}
.rc-box label:hover{background:var(--hover)}.rc-box input{width:auto;min-height:0}.rc-box-foot{padding:6px 8px 2px}
.rc-actions,.rc-views{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}.rc-views input,.rc-views select{max-width:210px}
.rc-related{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px}.rc-rel-l{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-3);margin-right:2px}
.rc-chip{padding:5px 11px;border:1px solid var(--border);border-radius:999px;background:transparent;color:var(--text-2);font-size:12px;cursor:pointer}.rc-chip:hover{background:var(--hover);color:var(--gold);border-color:var(--gold-border)}
.rcp a.rc-link{color:#1a4fd6;text-decoration:underline;cursor:pointer}
.rc-stat{font-size:11.5px;color:var(--text-2);margin:0 2px 8px}.rc-warn{padding:14px;color:var(--amber);font-size:13px}
@media (max-width:900px){.rc-wrap{grid-template-columns:minmax(0,1fr)}.rc-nav{display:flex;overflow-x:auto;gap:6px;padding:8px;-webkit-overflow-scrolling:touch}.rc-nav-g{display:none}.rc-nav button{width:auto;flex:0 0 auto;white-space:nowrap;border-color:var(--border)}}`;

  const hdrItems = (res, f) => res.hdr || hdrDefault(f);
  function describe(f, rep) {
    const out = [];
    rep.filters.forEach(k => {
      const d = F[k]; if (!d || k === 'line') return; const v = f[k];
      if (d.k === 'multi') { if (v && v.length) out.push(d.l + ': ' + v.map(x => optLabel(d, x)).join(', ')); }
      else if (d.k === 'select') { if (v && String(v) !== String(defOf(d))) out.push(d.l + ': ' + optLabel(d, v)); }
      else if (v !== '' && v != null && !(k === 'minor' || k === 'buckets')) out.push(d.l + ': ' + v);
    });
    return out.join('  ·  ');
  }
  function footRow(ft, cols) {
    const cells = ft.cells || [], span = ft.span || Math.max(1, cols - cells.length);
    return '<tr class="tot"><td colspan="' + span + '">' + e(ft.text) + '</td>' + cells.map(c => '<td class="n">' + e(txt(c)) + '</td>').join('') + '</tr>';
  }
  function tableHtml(t, lim) {
    const cols = t.head.length + (t.numbered ? 1 : 0); let any = false;
    let h = (t.title ? '<h3' + (t.pb ? ' style="page-break-before:always"' : '') + '>' + e(t.title) + '</h3>' : '') + '<table' + (t.box ? ' class="box"' : '') + '><thead><tr>' + (t.numbered ? '<th class="n">No.</th>' : '') +
      t.head.map((x, i) => '<th' + (t.align[i] === 'n' ? ' class="n"' : '') + '>' + e(x) + '</th>').join('') + '</tr></thead><tbody>';
    t.groups.forEach(g => {
      if (!g.rows.length && !g.foot) return;
      if (g.label && !t.hideLabels) h += '<tr class="grp"><td colspan="' + cols + '">' + e(g.label) + '</td></tr>';
      g.rows.forEach((r, i) => {
        any = true; if (lim && lim.left <= 0) { lim.cut++; return; } if (lim) lim.left--;
        h += '<tr>' + (t.numbered ? '<td class="n">' + (i + 1) + '</td>' : '') + r.map((c, j) => '<td' + (t.align[j] ? ' class="' + t.align[j] + '"' : '') + '>' + e(txt(c)) + '</td>').join('') + '</tr>';
      });
      if (g.foot) h += footRow(g.foot, cols);
    });
    if (!any) h += '<tr><td colspan="' + cols + '" class="empty">' + e(t.empty || 'No records for these filters.') + '</td></tr>';
    if (t.foot) h += footRow(t.foot, cols);
    return h + '</tbody></table>';
  }
  function renderRes(res, f, cap) {
    const rep = res.rep, lim = cap ? { left: cap, cut: 0 } : null, ln = hdrItems(res, f);
    let h = '<h1>' + CO + '</h1><h2' + (res.titleCls ? ' class="' + res.titleCls + '"' : '') + '>' + e(res.title) + '</h2>';
    if (res.badge) h += '<div class="lnrow"><span>' + e(lineText(f)) + '</span><span class="bd">' + e(res.badge) + '</span><span></span></div><div class="hdr">' + ln.slice(1).filter(p => p[1]).map(p => '<div><b>' + e(p[0]) + ' :</b> ' + e(p[1]) + '</div>').join('') + '</div>';
    else h += '<div class="hdr">' + ln.map(p => '<div><b>' + (p[0] ? e(p[0]) + ' :' : '') + '</b> ' + e(p[1]) + '</div>').join('') + '</div>';
    const d = describe(f, rep); if (d) h += '<div class="fl">Filters: ' + e(d) + '</div>';
    h += res.tables.map(t => tableHtml(t, lim)).join('');
    if (lim && lim.cut) h += '<div class="note"><b>Preview shows the first ' + cap + ' rows; ' + lim.cut + ' more are not shown here. Print, Excel and CSV include every row.</b></div>';
    (res.notes || []).forEach(n => { h += '<div class="note">' + e(n) + '</div>'; });
    return h + '<div class="note">Printed ' + e(fd(new Date(), 'dmy') + ' ' + ft(new Date())) + (userName() ? ' by ' + e(userName()) : '') + ' · ' + res.count + ' record' + (res.count === 1 ? '' : 's') + '</div>';
  }
  const footAoa = (ft, cols) => { const cells = ft.cells || [], span = ft.span || Math.max(1, cols - cells.length), r = [ft.text]; for (let i = 1; i < span; i++) r.push(''); return r.concat(cells.map(val)); };
  function aoaOf(res, f) {
    const a = [[CO], [res.title + (res.badge ? ' ' + res.badge : '')]];
    (res.badge ? [['Agent / Line', lineText(f)]].concat(hdrItems(res, f).slice(1)) : hdrItems(res, f)).forEach(p => { if (p[1]) a.push([p[0], p[1]]); });
    const d = describe(f, res.rep); if (d) a.push(['Filters', d]); a.push([]);
    res.tables.forEach(t => {
      const cols = t.head.length + (t.numbered ? 1 : 0); if (t.title) a.push([t.title]);
      a.push((t.numbered ? ['No.'] : []).concat(t.head));
      t.groups.forEach(g => { if (!g.rows.length && !g.foot) return; if (g.label && !t.hideLabels) a.push([g.label]); g.rows.forEach((r, i) => a.push((t.numbered ? [i + 1] : []).concat(r.map(val)))); if (g.foot) a.push(footAoa(g.foot, cols)); });
      if (t.foot) a.push(footAoa(t.foot, cols)); a.push([]);
    });
    (res.notes || []).forEach(n => a.push([n]));
    return a;
  }
  const fileBase = l => (l.res.title + (l.res.badge ? ' ' + l.res.badge : '')).replace(/[^A-Za-z0-9]+/g, '_') + '_' + l.f.from + '_' + l.f.to;

  /* ───────────────────────── run / print / export ───────────────────────── */
  const notice = m => '<div class="rc-panel rc-warn">' + e(m) + '</div>';
  RC.compute = async function (id, filters) {                       // headless: build a report with given filters, no screen needed
    const rep = REP[id]; if (!rep) throw new Error('Unknown report ' + id);
    const f = Object.assign({ from: todayIso(), to: todayIso(), group: defGroupOf(rep), sort: rep.defSort, dir: rep.defDir }, filters || {}); if (rep.asAt) f.from = f.to;
    Object.keys(F).forEach(k => { if (f[k] === undefined) f[k] = defOf(F[k]); }); f._tok = tokens(f);
    const res = await rep.build(f, rep.noCtx ? null : makeCtx()); res.rep = rep; return { rep, f, res, html: renderRes(res, f, 0), aoa: aoaOf(res, f) };
  };
  async function run(after) {
    const rep = REP[RC.cur], out = $('rcOut'); if (!rep || !out) return null;
    if (!canSee(rep)) { out.innerHTML = notice('Your role cannot open this report.'); return null; }
    const f = readForm(rep);
    if (f.from > f.to) { toast('From Date must not be after To Date', 'error'); return null; }
    if (rep.needTok && !f._tok.length) { out.innerHTML = notice('Type one or more container numbers above, then press Preview.'); return null; }
    remember(rep, f);
    out.innerHTML = '<div class="empty-state"><div class="empty-state-label">Preparing report…</div></div>';
    const t0 = Date.now();
    try {
      await ensureData(rep, f);
      const res = await rep.build(f, rep.noCtx ? null : makeCtx()); res.rep = rep;
      RC.last = { rep, f, res, at: new Date() }; RC.dirty = false;
      const cap = document.documentElement.classList.contains('gx-lite') ? 600 : 1500;
      out.innerHTML = '<div class="rc-stat">' + res.count + ' record' + (res.count === 1 ? '' : 's') + ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s · this preview is what prints</div><div class="rcp">' + renderRes(res, f, cap) + '</div>'; decorateLinks(out);
    } catch (x) { console.error('Report Centre:', x); out.innerHTML = notice('The report could not be built: ' + (x && x.message)); toast('Report failed: ' + (x && x.message), 'error', 6000); return null; }
    if (after === 'print') RC.print();
    return RC.last;
  }
  const need = async () => { if (!RC.last || RC.dirty) await run(); return RC.last; };
  RC.run = () => run();
  RC.print = async function () {
    const l = await need(); if (!l) return;
    const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print, or use Excel / CSV', 'error', 5000); return; }
    const o = l.f.orient === 'portrait' ? 'portrait' : (l.f.orient === 'landscape' || l.res.landscape ? 'landscape' : 'portrait');
    w.document.write('<html><head><title>' + e(l.res.title) + '</title><style>@page{size:A4 ' + o + ';margin:10mm}body{margin:0}' + PAPER + '.rcp{padding:0}thead{display:table-header-group}tr{page-break-inside:avoid}</style></head><body><div class="rcp">' + renderRes(l.res, l.f, 0) + '</div></body></html>');
    w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch (x) {} }, 350);
  };
  RC.excel = async function () {
    const l = await need(); if (!l) return; const aoa = aoaOf(l.res, l.f);
    if (!window.XLSX) return RC.csv();
    const ws = XLSX.utils.aoa_to_sheet(aoa), wb = XLSX.utils.book_new(), w = [];
    aoa.forEach(r => r.forEach((c, i) => { w[i] = Math.min(48, Math.max(w[i] || 8, String(c == null ? '' : c).length + 2)); })); ws['!cols'] = w.map(x => ({ wch: x }));
    XLSX.utils.book_append_sheet(wb, ws, 'Report'); XLSX.writeFile(wb, fileBase(l) + '.xlsx');
  };
  RC.csv = async function () {
    const l = await need(); if (!l) return;
    const csv = aoaOf(l.res, l.f).map(r => r.map(c => { const s = String(c == null ? '' : c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = fileBase(l) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  RC.copy = async function () {
    const l = await need(); if (!l) return; const t = aoaOf(l.res, l.f).map(r => r.join('\t')).join('\n');
    try { await navigator.clipboard.writeText(t); toast('Report copied. Paste it into Excel or an email.', 'success'); } catch (x) { toast('Copy is blocked on this browser. Use Excel or CSV.', 'error'); }
  };

  /* ───────────────────────── page: mount, events ───────────────────────── */
  function initState() {
    const S = Object.assign({ lay: {} }, lsGet(LS, {})); RC.S = S; if (S.rep && REP[S.rep] && canSee(REP[S.rep])) RC.cur = S.rep;
    S.preset = S.preset || 'today';
    const r = S.preset !== 'custom' ? presetRange(S.preset) : null;
    if (r) { S.from = r[0]; S.to = r[1]; } else { S.from = S.from || todayIso(); S.to = S.to || S.from; }
  }
  function paint() { const root = $('rcRoot'); if (!root) return; root.innerHTML = uiHtml(); RC.dirty = true; RC.last = null; }
  RC.render = function () {
    const r = $('rcRoot'); if (!r) return; if (!RC.S.from) initState();
    if (!canSee(REP[RC.cur])) RC.cur = 'daily_in';
    if (!r.dataset.built || r.dataset.role !== ROLE()) { r.dataset.built = '1'; r.dataset.role = ROLE(); paint(); }
  };
  /* open a given report from anywhere: ReportCentre.open('stock', { line: ['<line id>'] }) */
  RC.open = function (id, filters) { if (!REP[id] || !canSee(REP[id])) return false; RC.cur = id; RC.S.rep = id; Object.assign(RC.S, filters || {}); RC.show(); if ($('rcRoot')) { $('rcRoot').dataset.role = ROLE(); paint(); } return true; };
  RC.show = function () { if (typeof showSection === 'function') showSection('reportcentre', document.querySelector('.nav-item[data-section="reportcentre"]')); };
  const root = () => $('rcRoot');
  function act(a, el) {
    const [cmd, arg] = a.split(':');
    if (cmd === 'rep') { stash(); RC.cur = arg; RC.S.rep = arg; paint(); return; }
    if (cmd === 'go') { if (!REP[arg] || !canSee(REP[arg])) return; stash(); RC.cur = arg; RC.S.rep = arg; paint(); return run(); }
    if (cmd === 'hist') { if (!REP.history) return; stash(); RC.S.container = arg; RC.cur = 'history'; RC.S.rep = 'history'; paint(); return run(); }
    if (cmd === 'preset') {
      const r = presetRange(arg); RC.S.preset = arg;
      root().querySelectorAll('.rc-chips .filter-btn').forEach(b => b.classList.toggle('active', b === el));
      if (r && $('rc_from')) { $('rc_from').value = r[0]; $('rc_to').value = r[1]; } RC.dirty = true; return;
    }
    if (cmd === 'clear') { const w = root().querySelector('.rc-ms[data-k="' + arg + '"]'); if (w) { w.querySelectorAll('input').forEach(i => { i.checked = false; }); sumOf(w); } RC.dirty = true; return; }
    if (cmd === 'run') return run(); if (cmd === 'print') return RC.print(); if (cmd === 'excel') return RC.excel(); if (cmd === 'csv') return RC.csv(); if (cmd === 'copy') return RC.copy();
    if (cmd === 'reset') { const keep = { from: RC.S.from, to: RC.S.to, preset: RC.S.preset, rep: RC.cur, lay: {} }; RC.S = keep; lsSet(LS, keep); paint(); return; }
    if (cmd === 'saveview') {
      const n = V('rc_vname').trim(); if (!n) { toast('Give this view a name first', 'error'); return; } stash();
      const v = lsGet(LSV, {}); v[n] = { rep: RC.cur, S: JSON.parse(JSON.stringify(RC.S)) }; lsSet(LSV, v); paint(); toast('View saved on this device', 'success'); return;
    }
    if (cmd === 'loadview' || cmd === 'delview') {
      const n = V('rc_vsel'), v = lsGet(LSV, {}); if (!n || !v[n]) return;
      if (cmd === 'delview') { delete v[n]; lsSet(LSV, v); paint(); return; }
      RC.S = Object.assign({ lay: {} }, v[n].S); RC.cur = v[n].rep; if (RC.S.preset && RC.S.preset !== 'custom') { const r = presetRange(RC.S.preset); if (r) { RC.S.from = r[0]; RC.S.to = r[1]; } }
      paint(); run();
    }
  }
  function sumOf(w) {
    const s = w.querySelector('summary'), on = [...w.querySelectorAll('input:checked')], k = w.getAttribute('data-k');
    s.textContent = !on.length ? s.getAttribute('data-all') : (k === 'cols' ? on.length + ' columns chosen' : on.map(i => i.parentNode.textContent.trim()).join(', '));
  }
  function wire() {
    const r = root(); if (!r || r.dataset.wired) return; r.dataset.wired = '1';
    r.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-rc]'); if (b) { ev.preventDefault(); act(b.getAttribute('data-rc'), b); } });
    r.addEventListener('change', ev => { RC.dirty = true; const w = ev.target.closest && ev.target.closest('.rc-ms'); if (w) sumOf(w); if (ev.target.id === 'rc_from' || ev.target.id === 'rc_to') { RC.S.preset = 'custom'; r.querySelectorAll('.rc-chips .filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-rc') === 'preset:custom')); } if (ev.target.id === 'rc_lift') { stash(); if (RC.S.lay[RC.cur]) RC.S.lay[RC.cur].cols = []; paint(); } });
    r.addEventListener('input', () => { RC.dirty = true; });
    r.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && ev.target.type !== 'checkbox') { ev.preventDefault(); run(); } });
    document.addEventListener('click', ev => { document.querySelectorAll('#rcRoot .rc-ms[open]').forEach(d => { if (!d.contains(ev.target)) d.removeAttribute('open'); }); });
  }
  function ensureSection() {
    if ($('sec-reportcentre')) return true;
    const anchor = $('sec-depotreport'); if (!anchor || !anchor.parentNode) return false;
    const s = document.createElement('section'); s.className = 'section'; s.id = 'sec-reportcentre';
    s.innerHTML = '<div class="sec-toolbar"><div class="sec-title">Data Hub — depot, fleet, finance and HR reports in one place</div></div><div id="rcRoot"></div>';
    anchor.parentNode.insertBefore(s, anchor.nextSibling);
    if (!$('rcStyle')) { const st = document.createElement('style'); st.id = 'rcStyle'; st.textContent = UI_CSS + PAPER; document.head.appendChild(st); }
    return true;
  }
  function register() {
    try { if (typeof SECTION_META !== 'undefined') SECTION_META.reportcentre = ['Insights', 'Data Hub']; } catch (x) {}
    try {
      if (typeof ALL_SIDEBAR_SECTIONS !== 'undefined' && ALL_SIDEBAR_SECTIONS.indexOf('reportcentre') < 0) ALL_SIDEBAR_SECTIONS.push('reportcentre');
      ['admin', 'ops', 'clerk', 'dispatch', 'finance', 'hr', 'viewer'].forEach(r => { ROLE_SIDEBAR[r] = ROLE_SIDEBAR[r] || []; if (ROLE_SIDEBAR[r].indexOf('reportcentre') < 0) ROLE_SIDEBAR[r].push('reportcentre'); });
    } catch (x) {}
    try { if (typeof sectionRenderers !== 'undefined') sectionRenderers.reportcentre = RC.render; } catch (x) {}
  }
  /* shortcut on the Depot Report page */
  function mountShortcut() {
    const sec = $('sec-depotreport'); if (!sec || $('rcOpenBtn')) return;
    const row = sec.querySelector('.sec-toolbar .filter-row'); if (!row) return;
    const b = document.createElement('button'); b.id = 'rcOpenBtn'; b.type = 'button'; b.className = 'filter-btn'; b.textContent = 'Data Hub ↗'; b.title = 'Daily IN / OUT, Lift, Stock Advising, fleet, finance, HR and many more reports';
    b.onclick = () => RC.show(); row.appendChild(b);
  }
  /* Home dashboard: Data Hub button for everyone except drivers (and anyone whose access list leaves it out) */
  function syncDashButton() {
    const b = $('dashDataHubBtn'); if (!b) return;
    let ok = !!ROLE() && ROLE() !== 'driver';
    try { if (ok && typeof canSeeSection === 'function') ok = !!canSeeSection('reportcentre'); } catch (x) {}
    b.style.display = ok ? '' : 'none';
  }
  RC.syncDash = syncDashButton;
  function hookDash() {
    const b = $('dashDataHubBtn'); if (b && !b.dataset.rc) { b.dataset.rc = '1'; b.onclick = () => RC.show(); }
    ['bootShell', 'applyRoleUI'].forEach(n => { const f = window[n]; if (typeof f === 'function' && !f._rcDash) { const w = function () { const r = f.apply(this, arguments); try { syncDashButton(); } catch (x) {} return r; }; w._rcDash = true; window[n] = w; } });
    syncDashButton();
  }
  function boot() {
    if (!ensureSection()) { console.warn('Report Centre: Depot Report section not found'); return; }
    register(); initState(); wire(); mountShortcut(); hookDash();
    const _r = window.renderDepotReport;
    if (typeof _r === 'function' && !_r._rc) { const w = function () { mountShortcut(); return _r.apply(this, arguments); }; w._rc = true; window.renderDepotReport = w; try { if (typeof sectionRenderers !== 'undefined') sectionRenderers.depotreport = w; } catch (x) {} }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();