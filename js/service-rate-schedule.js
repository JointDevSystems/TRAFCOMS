
(function () {
  'use strict';
  var BLANK = function () { return { '20ft': null, '40ft': null }; };

  var sched = window.SERVICE_RATE_SCHEDULE = {
    currency: 'USD',
    services: {
      lolo:              { label: 'LOLO (Lift On / Lift Off) \u2014 Empty Container',       unit: 'per move',                    rates: BLANK() },
      loloBatch6:        { label: 'Empty Container Handling \u2014 Batch of 6 Moves',       unit: 'per move (batches of 6+)',    rates: BLANK() },
      serviceCharge:     { label: 'Service Charge',                                         unit: 'per container',               rates: BLANK() },
      storage:           { label: 'Storage Charge',                                         unit: 'per day, after free period',  rates: BLANK(), freeDays: 35 },
      transport:         { label: 'Transport \u2014 Depot \u21C4 Port',                     unit: 'per trip',                    rates: BLANK() },
      reefer:            { label: 'Reefer Container Handling',                              unit: 'per move',                    rates: BLANK() },
      portPreStack1:     { label: 'Port Pre-Stack 1 \u2014 Port Area Charges',              unit: 'per container',               rates: BLANK() },
      lastMileTransport: { label: 'Last Mile Transport \u2014 Area Charges',                unit: 'per trip',                    rates: BLANK() },
      photoCharges:      { label: 'Photo Charges',                                          unit: 'per request',                 rates: BLANK(),
                           uponRequestOnly: true, note: 'Upon request only \u2014 any gate-in photos requested by the client are charged separately.' },
    },
    lineOverrides: {
      PIL: {
        currency: 'KES',
        services: {
          lolo:      { label: 'LOLO (Lift On / Lift Off) \u2014 PIL',                unit: 'per lift',                    rates: BLANK() },
          transport: { label: 'Transport \u2014 Depot \u21C4 Terminal (PIL)',        unit: 'per trip, either direction',  rates: BLANK() },
        },
      },
    },
  };

  var KEY = 'gargo-rates-v1';
  var loaded = false, inflight = null;
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function me() { try { return (state && state.currentUser && state.currentUser.id) || ''; } catch (e) { return ''; } }
  function allowed() { try { return typeof canFinance === 'function' && canFinance(); } catch (e) { return false; } }
  function sb() { try { return supabase; } catch (e) { return null; } }

  function blankAll() {
    Object.keys(sched.services).forEach(function (k) { sched.services[k].rates = BLANK(); });
    Object.keys(sched.lineOverrides).forEach(function (c) {
      Object.keys(sched.lineOverrides[c].services).forEach(function (k) { sched.lineOverrides[c].services[k].rates = BLANK(); });
    });
  }
  var num = function (v) { return v === null || v === undefined || v === '' ? null : Number(v); };

  /* data = { svc: [service_rates rows], ovr: [{ code, service_key, currency, rate_20ft, rate_40ft }] } */
  function apply(data) {
    blankAll();
    var counts = {};
    (data.svc || []).forEach(function (r) {
      var d = sched.services[r.service_key];
      if (!d) d = sched.services[r.service_key] = { label: r.label || r.service_key, unit: r.unit || '', rates: BLANK() };
      if (r.label) d.label = r.label;
      if (r.unit) d.unit = r.unit;
      if (r.note) d.note = r.note;
      d.uponRequestOnly = !!r.upon_request_only;
      if (r.free_days !== null && r.free_days !== undefined) d.freeDays = Number(r.free_days);
      if (r.active !== false) d.rates = { '20ft': num(r.rate_20ft), '40ft': num(r.rate_40ft) };   // inactive service = not charged
      if (r.currency) counts[r.currency] = (counts[r.currency] || 0) + 1;
    });
    var best = null; Object.keys(counts).forEach(function (c) { if (!best || counts[c] > counts[best]) best = c; });
    if (best) sched.currency = best;
    (data.ovr || []).forEach(function (o) {
      var code = String(o.code || '').trim().toUpperCase(); if (!code) return;
      var ov = sched.lineOverrides[code] || (sched.lineOverrides[code] = { currency: o.currency || sched.currency, services: {} });
      if (o.currency) ov.currency = o.currency;
      var base = sched.services[o.service_key] || {};
      var d = ov.services[o.service_key] || (ov.services[o.service_key] = { label: base.label || o.service_key, unit: base.unit || '', rates: BLANK() });
      d.rates = { '20ft': num(o.rate_20ft), '40ft': num(o.rate_40ft) };
    });
    loaded = true;
  }

  function repaint() {   // redraw whatever screen is showing rates
    try {
      var s = state.currentSection;
      if ((s === 'shippinglines' || s === 'finance' || s === 'invoicing') && typeof renderSection === 'function') renderSection(s);
    } catch (e) {}
  }

  function readCache() {
    try { var s = ls(); var c = s && JSON.parse(s.getItem(KEY) || 'null'); return c && c.uid === me() && c.data ? c.data : null; } catch (e) { return null; }
  }
  function writeCache(data) { try { var s = ls(); if (s) s.setItem(KEY, JSON.stringify({ uid: me(), at: Date.now(), data: data })); } catch (e) {} }

  window.GargoRates = {
    isLoaded: function () { return loaded || !allowed(); },      // non-finance roles never need rates, so they are never "waiting"
    load: function (force) {
      if (!allowed()) { blankAll(); loaded = false; return Promise.resolve(false); }
      if (inflight && !force) return inflight;
      var cached = readCache();
      if (cached && !loaded) { apply(cached); repaint(); }      // device copy first: invoicing keeps working without a signal
      var db = sb();
      if (!db || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve(loaded);
      inflight = Promise.all([
        db.from('service_rates').select('service_key,label,unit,currency,rate_20ft,rate_40ft,free_days,upon_request_only,note,sort_order,active').order('sort_order'),
        db.from('shipping_line_rate_overrides').select('line_id,service_key,currency,rate_20ft,rate_40ft'),
      ]).then(function (res) {
        var a = res[0], b = res[1];
        if (a.error) throw a.error;
        if (b.error) throw b.error;
        var lines = {}; ((state.db && state.db.shippingLines) || []).forEach(function (l) { lines[l.id] = l.code; });
        var data = { svc: a.data || [], ovr: (b.data || []).map(function (o) { return { code: lines[o.line_id], service_key: o.service_key, currency: o.currency, rate_20ft: o.rate_20ft, rate_40ft: o.rate_40ft }; }) };
        if (!data.svc.length) throw new Error('service_rates returned no rows');   // never replace a good rate card with an empty one
        apply(data); writeCache(data); repaint();
        return true;
      }).catch(function (e) {
        console.warn('Rate card load failed:', e && e.message ? e.message : e);
        return loaded;
      }).then(function (ok) { inflight = null; return ok; });
      return inflight;
    },
    clear: function () { blankAll(); loaded = false; inflight = null; try { var s = ls(); if (s) s.removeItem(KEY); } catch (e) {} },
  };

  /* Same helper as before. Currency comes from the structure; amounts are blank unless the rate card is loaded. */
  window.getOfficialLineRates = function (code) {
    var override = sched.lineOverrides[code];
    var lolo = (override && override.services && override.services.lolo) || sched.services.lolo;
    var currency = (override && override.currency) || sched.currency;
    return { currency: currency, rate20: lolo.rates['20ft'], rate40: lolo.rates['40ft'], rateHC: lolo.rates['40ft'] };
  };
})();