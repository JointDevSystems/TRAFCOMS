'use strict';

(function () {
  const norm = c => String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const DAY = 86400000;
  const when = v => { const t = new Date(v).getTime(); return isNaN(t) ? 0 : t; };

  /* "MSKU1234567", "MSKU 123456-7", or two numbers split by / , ; | or a line break (a 2 x 20ft load) */
  function list(v) {
    const parts = String(v == null ? '' : v).split(/[,;/|\n]+/).map(norm).filter(Boolean);
    if (parts.length === 1 && parts[0].length === 22) return [parts[0].slice(0, 11), parts[0].slice(11)];
    const out = []; parts.forEach(p => { if (p.length >= 10 && out.indexOf(p) < 0) out.push(p); });
    return out;
  }

  const truckReg = id => { try { const t = (state.db.trucks || []).find(x => x.id === id); return t ? (t.reg || t.licencePlate || '') : ''; } catch (e) { return ''; } };
  const driverOf = id => { try { return (state.db.drivers || []).find(x => x.id === id) || null; } catch (e) { return null; } };
  const lineCode = id => { try { const l = (state.db.shippingLines || []).find(x => x.id === id); return l ? (l.code || l.name || '') : (id || ''); } catch (e) { return ''; } };
  /* dispatch stores 'Repatriation to Port' / 'Shippers/Export' / 'Sale units'; the gate form says Repat / Export / Sale Unit */
  const commodityOf = v => { const s = String(v || '').toLowerCase(); return /repat/.test(s) ? 'Repat' : /shipper|export/.test(s) ? 'Export' : /sale/.test(s) ? 'Sale Unit' : ''; };
  const outward = t => { try { return isOutwardWorkType(t.workType); } catch (e) { return t.workType === 'Depot → Port'; } };
  const live = t => { try { return isTripLive(t); } catch (e) { return t.status !== 'completed'; } };

  async function find(containers, dir) {
    dir = dir === 'in' ? 'in' : 'out';
    const keys = (Array.isArray(containers) ? containers : list(containers)).map(norm).filter(k => k.length >= 10);
    if (!keys.length) return null;
    const out = { truck: '', trailer: '', driver: '', driverId: '', transporter: '', commodity: '', gatePass: '', eir: '', line: '', size: '', releaseOrder: '', from: [] };
    const take = (f, v, src) => { v = String(v == null ? '' : v).trim(); if (!v || out[f]) return; out[f] = v; if (out.from.indexOf(src) < 0) out.from.push(src); };

    for (const key of keys) {
      /* 1. dispatch trip */
      try {
        const trips = (state.db.trips || []).filter(t => norm(t.container) === key && live(t) && (dir === 'out' ? outward(t) : !outward(t)))
          .sort((a, b) => when(b.startTime) - when(a.startTime));
        const t = trips[0];
        if (t) {
          const src = dir === 'out' ? 'dispatch trip' : 'inward trip', d = driverOf(t.driverId), c = t.custom || {};
          take('truck', truckReg(t.truckId), src); take('driver', d && d.name, src); take('driverId', d && (d.idNo || d.id_no), src);
          take('transporter', c.transporter, src); take('trailer', c.trailer_no, src);
          if (dir === 'out') take('commodity', commodityOf(t.outwardType), src);
          take('eir', t.eirNumber, src); take('releaseOrder', t.releaseOrderNo, src); take('line', lineCode(t.shippingLine), src); take('size', t.ctype, src);
        }
      } catch (e) { console.warn('container link (trip):', e && e.message); }

      /* 2. loading instruction (vehicle going out only) */
      if (dir === 'out' && window.GargoLI && GargoLI.forContainer && navigator.onLine !== false) {
        try {
          const rows = await GargoLI.forContainer(key);
          const r = (rows || []).find(x => (x.status === 'issued' || x.status === 'loaded') && Date.now() - when(x.issue_date || x.created_at) < 14 * DAY);
          if (r) {
            const src = 'loading instruction';
            take('truck', r.truck_no, src); take('driver', r.driver_name, src); take('driverId', r.driver_id_number, src); take('transporter', r.transporter, src);
            take('commodity', r.commodity, src); take('gatePass', r.serial_no, src); take('releaseOrder', r.release_order_no, src); take('line', r.shipping_line, src);
          }
        } catch (e) { console.warn('container link (loading instruction):', e && e.message); }
      }

     
      if (dir === 'out') {
        try {
          if (window.ICR && ICR.enabled && ICR.byContainer && navigator.onLine !== false) { try { await ICR.byContainer(key); } catch (e) { /* use what is in memory */ } }
          const recs = (state.db.interchange || []).filter(i => norm(i.container) === key && i.type === 'Gate-Out' && Date.now() - when(i.date) < 3 * DAY)
            .sort((a, b) => when(b.date) - when(a.date));
          const i = recs[0];
          if (i) {
            const src = 'outward interchange', d = driverOf(i.driver);
            take('truck', i.truckRegText || truckReg(i.truck), src); take('driver', i.driverNameText || (d && d.name), src); take('driverId', i.driverIdNumber || (d && (d.idNo || d.id_no)), src);
            take('transporter', i.transporter, src); take('trailer', i.trailerNo, src);
            take('eir', i.eirNumber, src); take('releaseOrder', i.releaseOrderNo, src); take('line', i.line, src); take('size', i.ctype, src);
          }
        } catch (e) { console.warn('container link (interchange):', e && e.message); }
      }
    }
    return out.from.length ? out : null;
  }

  window.GargoContainer = { list: list, find: find, norm: norm };
})();