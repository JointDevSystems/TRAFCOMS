'use strict';
/* Gargo on-demand interchange.
   Interchange rows are NOT loaded at start-up any more. Screens ask the database for the page they show
   (ic_search / interchange_yard / ic_counts), and reports load what they need when they are run.
   Rows that were fetched stay in state.db.interchange as a small cache, so existing code that does
   state.db.interchange.find(...) keeps working for anything on screen.
   Photos (img / photos) are never part of a list query: they are fetched for one record when it is opened or saved.
   Roll back at any time: open the app once with ?ic=full (old behaviour, everything loaded), ?ic=lazy to switch back. */
(function () {
  let full = false;
  try {
    const q = /[?&]ic=(full|lazy)/.exec(location.search);
    if (q) localStorage.setItem('gargo-ic-full', q[1] === 'full' ? '1' : '0');
    full = localStorage.getItem('gargo-ic-full') === '1';
  } catch (e) {}

  const cfg = (k, d) => { try { const v = window.cfgGet ? window.cfgGet(k) : undefined; const n = Number(v); return n > 0 ? n : d; } catch (e) { return d; } };
  const parsePhotos = p => { try { return Array.isArray(p) ? p : (p ? JSON.parse(p) : []); } catch (e) { return []; } };

  const ICR = window.ICR = {
    enabled: !full,
    _at: null, _atLen: -1,
    _counts: null, _countsAt: 0, _countsBusy: false,
    _allSince: undefined,            // undefined = nothing bulk-loaded yet; null = everything; ISO string = rows from that date

    /* a database row (list view / ic_search) -> app record. Photos are not in it, so the record is marked _light. */
    mapRow(r) {
      const ic = icFromRow(r);
      ic.hasImg = !!(r.has_img || r.img);
      ic.hasPhotos = !!(r.has_photos || (Array.isArray(r.photos) && r.photos.length));
      ic._light = r.img === undefined && r.photos === undefined;
      if (r.in_yard !== undefined) ic._inYard = !!r.in_yard;
      if (r.exit_at !== undefined) ic._exitAt = r.exit_at || null;
      return ic;
    },

    _index() {
      const arr = state.db.interchange || (state.db.interchange = []);
      if (ICR._arr !== arr) { ICR._arr = arr; ICR._at = null; ICR._allSince = undefined; }   // state.db was replaced (full reload)
      if (!ICR._at || ICR._atLen !== arr.length) { ICR._at = new Map(arr.map(r => [r.id, r])); ICR._atLen = arr.length; }
      return arr;
    },
    row(id) { ICR._index(); return ICR._at.get(id) || null; },

    /* put fetched records into the cache. Unsaved local edits and already-loaded photos are never overwritten. */
    merge(rows) {
      const arr = ICR._index(), out = [];
      rows.forEach(next => {
        const cur = ICR._at.get(next.id);
        if (!cur) { arr.push(next); ICR._at.set(next.id, next); ICR._atLen = arr.length; out.push(next); return; }
        if (cur._dirty) { out.push(cur); return; }
        let keep = null;
        if (next._light) { keep = { img: cur.img }; if (!cur._light) { keep.photos = cur.photos; keep._light = false; } }
        Object.assign(cur, next);
        if (keep) Object.assign(cur, keep);
        out.push(cur);
      });
      return out;
    },

    /* ── paged queries ── */
    async search(o) {
      o = o || {};
      const { data, error } = await supabase.rpc('ic_search', {
        p_q: o.q || null, p_status: o.status || null, p_flagged: !!o.flagged, p_yard_only: !!o.yardOnly,
        p_from: o.from || null, p_to: o.to || null, p_limit: o.limit || 40, p_offset: o.offset || 0,
        p_types: o.types || null, p_waiting: o.waiting || null, p_asc: !!o.asc,
      });
      if (error) throw error;
      return { total: Number(data && data.total) || 0, items: ICR.merge(((data && data.rows) || []).map(ICR.mapRow)) };
    },
    /* Inward panels: all use the same server search, which also says whether each container is still in the yard */
    yard(o) { return ICR.search(Object.assign({ yardOnly: true, waiting: 'include', asc: true }, o)); },
    awaitingSurvey(o) { return ICR.search(Object.assign({ waiting: 'only', asc: true }, o)); },
    recentInward(n) { return ICR.search({ types: ['Gate-In', 'Depot-In'], waiting: 'include', limit: n || 8 }); },
    async byContainer(key) {
      const { data, error } = await supabase.rpc('ic_by_container', { p_key: key });
      if (error) throw error;
      return ICR.merge((data || []).map(ICR.mapRow));
    },
    async byBooking(bookingId) {
      if (!bookingId) return null;
      const hit = (state.db.interchange || []).find(i => i.bookingId === bookingId);
      if (hit) return hit;
      const { data, error } = await supabase.rpc('ic_by_booking', { p_booking: bookingId });
      if (error) throw error;
      return ICR.merge((data || []).map(ICR.mapRow))[0] || null;
    },
    async ensureRow(id) {
      const r = ICR.row(id); if (r) return r;
      const { data, error } = await supabase.from('interchange_list').select('*').eq('id', id).maybeSingle();
      if (error || !data) return null;
      return ICR.merge([ICR.mapRow(data)])[0];
    },

    /* ── counts for the sidebar badges and alerts (cached 15 s) ── */
    async counts(force) {
      if (!force && ICR._counts && Date.now() - ICR._countsAt < 15000) return ICR._counts;
      const { data, error } = await supabase.rpc('ic_counts', { p_aged_days: cfg('ops.agedDays', 30), p_survey_hours: cfg('alerts.awaitingSurveyHours', 24) });
      if (error) throw error;
      ICR._counts = data; ICR._countsAt = Date.now();
      return data;
    },
    applyBadges() {
      const c = ICR._counts; if (!c) return;
      const set = (id, v) => { const el = document.getElementById(id); if (el) { el.textContent = v || ''; el.style.display = v ? 'inline' : 'none'; } };
      set('badge-inward', c.gate_in_today); set('badge-interchange', c.pending);
    },
    /* called from buildBadges / buildAlerts: show what we have, refresh in the background, redraw only if it changed */
    refreshCounts() {
      ICR.applyBadges();
      if (!navigator.onLine || ICR._countsBusy || (ICR._counts && Date.now() - ICR._countsAt < 15000)) return;
      ICR._countsBusy = true;
      const before = JSON.stringify(ICR._counts);
      ICR.counts(true).then(() => {
        if (JSON.stringify(ICR._counts) !== before) { ICR.applyBadges(); try { buildAlerts(); } catch (e) {} }
      }).catch(e => console.warn('ic_counts failed:', e && e.message)).then(() => { ICR._countsBusy = false; });
    },

    /* ── photos ── */
    async fillThumbs(root) {
      const need = [];
      root.querySelectorAll('img[data-icimg]').forEach(im => {
        const r = ICR.row(im.getAttribute('data-icimg'));
        if (r && r.img) { im.src = r.img; im.removeAttribute('data-icimg'); } else if (r) need.push(im);
      });
      if (!need.length) return;
      const ids = Array.from(new Set(need.map(i => i.getAttribute('data-icimg'))));
      const { data, error } = await supabase.from('interchange').select('id,img').in('id', ids);
      if (error) return;
      const by = new Map((data || []).map(r => [r.id, r.img]));
      need.forEach(im => {
        const id = im.getAttribute('data-icimg'), v = by.get(id), r = ICR.row(id);
        if (v) { if (r && !r.img) r.img = v; im.src = v; }
        im.removeAttribute('data-icimg');
      });
    },
    /* Load img + photos into records that only have the light columns. Fills only EMPTY fields, so a photo
       added locally (upload / survey) is never replaced. Used before saving and before opening photos. */
    async hydrate(rows) {
      const need = rows.filter(r => r._light && (r.hasImg || r.hasPhotos));
      if (!need.length) { rows.forEach(r => { if (r._light && !r.hasImg && !r.hasPhotos) r._light = false; }); return null; }
      for (let i = 0; i < need.length; i += 20) {
        const ids = need.slice(i, i + 20).map(r => r.id);
        const { data, error } = await supabase.from('interchange').select('id,img,photos').in('id', ids);
        if (error) return { table: 'interchange', error };
        (data || []).forEach(d => {
          const r = ICR.row(d.id); if (!r) return;
          if (!r.img) r.img = d.img || '';
          const ph = parsePhotos(d.photos);
          if (!r.photos || !r.photos.length) r.photos = ph;
          r._light = false;
        });
      }
      rows.forEach(r => { if (r._light && !r.hasImg && !r.hasPhotos) r._light = false; });
      return null;
    },
    async ensurePhotos(id) {
      const r = await ICR.ensureRow(id);
      if (r && r._light) { const f = await ICR.hydrate([r]); if (f) throw f.error; }
      return r;
    },

    /* ── bulk load for reports and for screens not yet converted to paged queries ──
       Loads the light columns (no photos) of every record from `fromISO` (or all), once; later calls are free. */
    async ensureAll(fromISO) {
      fromISO = fromISO || null;
      const have = ICR._allSince;
      if (have === null || (have !== undefined && fromISO && fromISO >= have)) return;
      if (typeof toast === 'function') toast('Loading records for this report…', 'info', 2500);
      const rows = await fetchAllPaginated((a, b) => {
        let q = supabase.from('interchange_list').select('*');
        if (fromISO) q = q.gte('date', fromISO);
        return q.order('date', { ascending: false }).order('id', { ascending: false }).range(a, b);
      });
      if (rows.error) throw rows.error;
      ICR.merge((rows.data || []).map(ICR.mapRow));
      ICR._allSince = fromISO;
    },
    forget() { ICR._at = null; ICR._atLen = -1; ICR._allSince = undefined; },
  };

  /* Entry points that still read the whole interchange array: load it (once, without photos) when they are opened. */
  function guard(name, from) {
    const f = window[name];
    if (typeof f !== 'function' || f._icGuard) return;
    const w = function () {
      const args = arguments, self = this;
      if (!ICR.enabled) return f.apply(self, args);
      return ICR.ensureAll(from ? from() : null).catch(e => { console.warn(name + ': could not load records', e); if (typeof toast === 'function') toast('Could not load all records — report may be incomplete', 'error'); })
        .then(() => f.apply(self, args));
    };
    w._icGuard = true; window[name] = w;
  }
  /* Entry points that need photos of one record: make sure they are loaded first. */
  function needPhotos(name) {
    const f = window[name];
    if (typeof f !== 'function' || f._icPhoto) return;
    const w = async function (id) {
      if (ICR.enabled) { try { await ICR.ensurePhotos(id); } catch (e) { console.warn(name + ': photo load failed', e); } }
      return f.apply(this, arguments);
    };
    w._icPhoto = true; window[name] = w;
  }
  /* A container's history screen: fetch that container's records first. */
  function needContainer(name) {
    const f = window[name];
    if (typeof f !== 'function' || f._icCont) return;
    const w = async function (c) {
      if (ICR.enabled) { try { await ICR.byContainer(c); } catch (e) { console.warn(name + ': container load failed', e); } }
      return f.apply(this, arguments);
    };
    w._icCont = true; window[name] = w;
  }

  const wire = () => {
    ['renderInwardReports', 'renderDepOpsReports', 'renderDepotReport', 'renderReportDepOps'].forEach(n => guard(n));
    ['downloadInterchangeSlip', 'printInterchangeSlip', 'showContainerPhotos'].forEach(needPhotos);
    needContainer('showContainerDetail');
    /* the report tables are re-run from the section dropdowns: keep the section renderer table pointing at the guarded versions */
    try { if (typeof sectionRenderers !== 'undefined') sectionRenderers.depotreport = window.renderDepotReport; } catch (e) {}
  };
  /* all app scripts are deferred and run in order before DOMContentLoaded; wire once everything is defined */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();