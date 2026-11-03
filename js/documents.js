'use strict';

(function () {
  const $ = id => document.getElementById(id);
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const D = window.GargoDocs = {};
  let url = null;

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pdfP = null, view = null, rawSave = null;

  function css() {
    if ($('gxDocCss')) return;
    const s = document.createElement('style'); s.id = 'gxDocCss';
    s.textContent = '.gxd-ov{position:fixed;top:0;right:0;bottom:0;left:0;z-index:10050;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:1.5vh 1.5vw}' +
      '.gxd-box{display:flex;flex-direction:column;width:100%;max-width:1180px;height:100%;max-height:97vh;border:1px solid var(--border-mid);border-radius:14px;overflow:hidden;background:var(--bg)}' +
      '.gxd-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);background:var(--glass-strong)}' +
      '.gxd-title{font-size:14px;font-weight:600;color:var(--text);min-width:0;flex:1 1 180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.gxd-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.gxd-acts a{text-decoration:none;display:inline-flex;align-items:center}' +
      '.gxd-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center;padding:6px 10px;border-bottom:1px solid var(--border);background:var(--surface-2)}' +
      '.gxd-tools .tbl-btn{min-width:36px;text-align:center}.gxd-pg{font:600 12px var(--font-mono,monospace);color:var(--text-2);min-width:74px;text-align:center}' +
      '.gxd-zoom{font:600 12px var(--font-mono,monospace);color:var(--text);min-width:48px;text-align:center}' +
      '.gxd-scroll{flex:1;overflow:auto;background:#3a3f4b;-webkit-overflow-scrolling:touch;padding:14px 0;touch-action:pan-x pan-y}' +
      '.gxd-pages{display:flex;flex-direction:column;align-items:flex-start;gap:12px;min-width:min-content;margin:0 auto;width:max-content;padding:0 14px}' +
      '.gxd-page{position:relative;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.45);margin:0 auto}.gxd-page canvas{display:block;width:100%;height:100%}' +
      '.gxd-spin{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}' +
      '.gxd-frame{flex:1;width:100%;border:0;background:#fff}.gxd-mob{padding:28px 18px;text-align:center;color:var(--text-2);font-size:13px;line-height:1.6}' +
      '.gxd-msg{padding:40px 18px;text-align:center;color:#cbd5e1;font-size:13px}' +
      '.gxd-row{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--border)}' +
      '.gxd-row b{color:var(--text)}.gxd-meta{font-size:11px;color:var(--text-3);margin-top:2px}.gxd-btns{display:flex;gap:6px;flex-wrap:wrap}' +
      '.gxd-h{font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 6px}' +
      '@media(max-width:700px){.gxd-ov{padding:0}.gxd-box{max-height:100vh;border-radius:0;border:0}.gxd-tools{gap:4px}}';
    document.head.appendChild(s);
  }

  /* the real jsPDF save, before the preview-first patch below replaces it */
  D.rawSave = function (r) { if (!r || !r.doc) return; D._bypass = true; try { (rawSave || r.doc.save).call(r.doc, r.filename); } finally { D._bypass = false; } };

  D.close = function () {
    const o = $('gxDocView'); if (o && o.parentNode) o.parentNode.removeChild(o);
    if (view) { try { if (view.io) view.io.disconnect(); if (view.pdf) view.pdf.destroy(); } catch (x) {} view = null; }
    if (url) { try { URL.revokeObjectURL(url); } catch (x) {} url = null; }
    document.removeEventListener('keydown', onKey);
  };
  function onKey(ev) {
    if (ev.key === 'Escape') return D.close();
    if (!view) return;
    if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); zoom(1.2); }
    else if (ev.key === '-') { ev.preventDefault(); zoom(1 / 1.2); }
    else if (ev.key === '0') fit('width');
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfP) return pdfP;
    pdfP = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = PDFJS; s.async = true;
      s.onload = () => { if (window.pdfjsLib) { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; } catch (x) {} ok(window.pdfjsLib); } else no(new Error('pdf.js missing')); };
      s.onerror = () => no(new Error('pdf.js could not load'));
      document.head.appendChild(s);
    });
    pdfP.catch(() => { pdfP = null; });
    return pdfP;
  }

  /* ── page rendering ── */
  function pageScale(p) {
    const host = view.scroll, vp = p.page.getViewport({ scale: 1, rotation: view.rot });
    const w = Math.max(200, host.clientWidth - 28), h = Math.max(200, host.clientHeight - 28);
    if (typeof view.fit === 'number') return view.fit;
    const sw = w / vp.width, sp = Math.min(sw, h / vp.height);
    return view.fit === 'page' ? sp : sw;
  }
  function layout() {
    if (!view) return;
    view.pages.forEach(p => {
      const sc = pageScale(p), vp = p.page.getViewport({ scale: sc, rotation: view.rot });
      p.sc = sc; p.div.style.width = Math.round(vp.width) + 'px'; p.div.style.height = Math.round(vp.height) + 'px'; p.key = null;
    });
    if (view.pages[0]) { view.cur = view.pages[0].sc; const z = $('gxdZ'); if (z) z.textContent = Math.round(view.cur * 100) + '%'; }
    view.pages.forEach(p => { if (p.vis) paint(p); });
  }
  async function paint(p) {
    if (!view) return;
    const key = p.sc.toFixed(3) + '|' + view.rot; if (p.key === key) return; p.key = key;
    try { if (p.task) p.task.cancel(); } catch (x) {}
    const lite = /gx-lite/.test(document.documentElement.className), dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2.5);
    const vp = p.page.getViewport({ scale: p.sc * dpr, rotation: view.rot });
    const cv = document.createElement('canvas'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
    try {
      p.task = p.page.render({ canvasContext: cv.getContext('2d'), viewport: vp });
      await p.task.promise;
      if (!view || p.key !== key) return;
      const old = p.div.querySelector('canvas'); if (old) old.remove();
      const sp = p.div.querySelector('.gxd-spin'); if (sp) sp.remove();
      p.div.appendChild(cv);
    } catch (x) { if (x && x.name !== 'RenderingCancelledException') { p.key = null; console.warn('page render', x); } }
  }
  function zoom(f) { if (!view) return; view.fit = Math.min(6, Math.max(0.3, view.cur * f)); layout(); }
  function fit(m) { if (!view) return; view.fit = m; layout(); }
  function goPage(n) { if (!view) return; n = Math.min(view.pages.length, Math.max(1, n)); const p = view.pages[n - 1]; if (p) view.scroll.scrollTop = p.div.offsetTop - 10; }
  function curPage() {
    if (!view) return 1; const mid = view.scroll.scrollTop + view.scroll.clientHeight / 3; let n = 1;
    view.pages.forEach((p, i) => { if (p.div.offsetTop <= mid) n = i + 1; }); return n;
  }

  async function mountPdf(blob, scroll, box) {
    const lib = await loadPdfJs();
    const buf = await blob.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    view = { pdf, scroll, pages: [], fit: 'width', rot: 0, cur: 1, io: null };
    const host = document.createElement('div'); host.className = 'gxd-pages'; scroll.innerHTML = ''; scroll.appendChild(host);
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i), div = document.createElement('div'); div.className = 'gxd-page'; div.innerHTML = '<div class="gxd-spin">Page ' + i + '…</div>';
      host.appendChild(div); view.pages.push({ page, div, sc: 1, key: null, vis: false, task: null });
    }
    if ('IntersectionObserver' in window) {
      view.io = new IntersectionObserver(es => es.forEach(en => { const p = view && view.pages.find(x => x.div === en.target); if (p) { p.vis = en.isIntersecting; if (p.vis) paint(p); } }), { root: scroll, rootMargin: '700px 0px' });
      view.pages.forEach(p => view.io.observe(p.div));
    } else view.pages.forEach(p => { p.vis = true; });
    layout();
    const pg = $('gxdPg'); const upd = () => { if (pg && view) pg.textContent = curPage() + ' / ' + view.pages.length; };
    scroll.addEventListener('scroll', upd); upd();
    scroll.addEventListener('wheel', ev => { if (ev.ctrlKey) { ev.preventDefault(); zoom(ev.deltaY < 0 ? 1.1 : 1 / 1.1); } }, { passive: false });
    let d0 = 0, c0 = 1;                                               /* two-finger pinch */
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    scroll.addEventListener('touchstart', ev => { if (ev.touches.length === 2) { d0 = dist(ev.touches); c0 = view ? view.cur : 1; } }, { passive: true });
    scroll.addEventListener('touchend', ev => { if (d0 && ev.touches.length < 2 && view) { const f = view.pinch || 1; view.pinch = 1; d0 = 0; host.style.transform = ''; if (Math.abs(f - 1) > .04) { view.fit = Math.min(6, Math.max(.3, c0 * f)); layout(); } } }, { passive: true });
    scroll.addEventListener('touchmove', ev => { if (ev.touches.length === 2 && d0 && view) { view.pinch = dist(ev.touches) / d0; host.style.transform = 'scale(' + view.pinch + ')'; host.style.transformOrigin = 'top center'; } }, { passive: true });
    window.addEventListener('resize', onResize);
  }
  function onResize() { if (!view) return window.removeEventListener('resize', onResize); if (typeof view.fit !== 'number') layout(); }

  /* ── the viewer shell, shared by PDF and HTML documents ── */
  function shell(title, extraActs, body, tools) {
    css(); D.close();
    const ov = document.createElement('div'); ov.id = 'gxDocView'; ov.className = 'gxd-ov';
    ov.innerHTML = '<div class="gxd-box"><div class="gxd-bar"><div class="gxd-title">' + e(title) + '</div><div class="gxd-acts">' + extraActs + '<button type="button" class="action-btn ghost" id="gxdX">✕ Close</button></div></div>' + (tools || '') + body + '</div>';
    ov.addEventListener('click', ev => { if (ev.target === ov) D.close(); });
    document.body.appendChild(ov); document.addEventListener('keydown', onKey);
    $('gxdX').onclick = D.close;
    return ov;
  }

  /* show a built jsPDF document ({doc, filename}) in a large preview: zoom, fit, rotate, pages, Download, Print */
  D.view = function (r, title) {
    if (!r || !r.doc) return;
    css(); D.close(); patchSave();
    let blob;
    try { blob = r.doc.output('blob'); url = URL.createObjectURL(blob); } catch (x) { D.rawSave(r); return; }
    const tools = '<div class="gxd-tools"><button type="button" class="tbl-btn" id="gxdPrev" title="Previous page">◀</button><span class="gxd-pg" id="gxdPg">1 / 1</span><button type="button" class="tbl-btn" id="gxdNext" title="Next page">▶</button>' +
      '<span style="width:10px"></span><button type="button" class="tbl-btn" id="gxdZo" title="Zoom out">−</button><span class="gxd-zoom" id="gxdZ">100%</span><button type="button" class="tbl-btn" id="gxdZi" title="Zoom in">+</button>' +
      '<button type="button" class="tbl-btn" id="gxdFw">Fit width</button><button type="button" class="tbl-btn" id="gxdFp">Fit page</button><button type="button" class="tbl-btn" id="gxdRot" title="Rotate">⟳</button></div>';
    const acts = '<button type="button" class="action-btn" id="gxdDl">⬇ Download</button><button type="button" class="action-btn ghost" id="gxdPr">🖨 Print</button><a class="action-btn ghost" id="gxdTab" href="' + url + '" target="_blank" rel="noopener">Open in new tab</a>';
    shell(title || r.filename, acts, '<div class="gxd-scroll" id="gxdScroll"><div class="gxd-msg">Preparing preview…</div></div>', tools);
    $('gxdDl').onclick = () => D.rawSave(r);
    $('gxdPr').onclick = () => { try { if (typeof ghPrintPdf === 'function') ghPrintPdf(r.doc); else window.open(url); } catch (x) { window.open(url); } };
    $('gxdPrev').onclick = () => goPage(curPage() - 1); $('gxdNext').onclick = () => goPage(curPage() + 1);
    $('gxdZo').onclick = () => zoom(1 / 1.2); $('gxdZi').onclick = () => zoom(1.2);
    $('gxdFw').onclick = () => fit('width'); $('gxdFp').onclick = () => fit('page');
    $('gxdRot').onclick = () => { if (view) { view.rot = (view.rot + 90) % 360; layout(); } };
    const scroll = $('gxdScroll');
    mountPdf(blob, scroll).catch(x => {                                /* no pdf.js (offline first run / very old engine): browser viewer, or a clear fallback */
      console.warn('preview fallback', x);
      const tb = document.querySelector('#gxDocView .gxd-tools'); if (tb) tb.style.display = 'none';
      if (MOBILE) scroll.outerHTML = '<div class="gxd-mob">This device cannot show the document inside the page.<br>Use <b>Open in new tab</b> to read it, or <b>Download</b>.</div>';
      else scroll.outerHTML = '<iframe class="gxd-frame" src="' + url + '" title="' + e(title || 'Document') + '"></iframe>';
    });
  };

  /* preview an HTML document (reports, statements): rendered in a frame, with Print */
  D.html = function (title, html, opts) {
    opts = opts || {}; css(); D.close();
    const acts = '<button type="button" class="action-btn" id="gxdPr">🖨 Print</button>' + (opts.onDownload ? '<button type="button" class="action-btn ghost" id="gxdDl">⬇ Download</button>' : '');
    shell(title, acts, '<iframe class="gxd-frame" id="gxdHF" title="' + e(title) + '"></iframe>');
    const f = $('gxdHF'); f.srcdoc = html;
    $('gxdPr').onclick = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (x) { toast('Could not open the print dialog', 'error'); } };
    if (opts.onDownload) $('gxdDl').onclick = opts.onDownload;
  };

  /* Every PDF the app offers to download opens here first (preview, then Download / Print). A burst of saves (bulk export) still downloads normally. */
  D.autoPreview = true;
  let lastAt = 0, held = null, burstUntil = 0, tries = 0;
  function patchSave() {
    const J = window.jspdf && window.jspdf.jsPDF; if (!J || J.prototype.save._gxd) return !!(J && J.prototype.save._gxd);
    rawSave = J.prototype.save;
    const w = function (name) {
      if (D._bypass || !D.autoPreview) return rawSave.apply(this, arguments);
      const now = Date.now(), fn = (typeof name === 'string' && name) || 'document.pdf';
      if (now < burstUntil) return rawSave.apply(this, arguments);
      if (held && now - lastAt < 1500) { burstUntil = now + 1500; D.close(); D.rawSave(held); held = null; return rawSave.apply(this, arguments); }
      lastAt = now; held = { doc: this, filename: fn };
      D.view(held, fn.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
    };
    w._gxd = true; J.prototype.save = w; return true;
  }
  const pt = setInterval(() => { if (patchSave() || ++tries > 120) clearInterval(pt); }, 1000);

  /* Hand a built jsPDF result ({doc, filename}) to the right action. mode: 'preview' | 'download' | 'print'.
     (D.eir and D.inspection called this but it was never defined: "act is not defined".) */
  function act(r, mode, title) {
    if (!r || !r.doc) return toast('Nothing to show: the document could not be built', 'error');
    if (mode === 'download') return D.rawSave(r);                     /* rawSave bypasses the preview-first patch */
    if (mode === 'print') { if (typeof window.ghPrintPdf === 'function') return window.ghPrintPdf(r.doc); return D.view(r, title); }
    return D.view(r, title);
  }

  /* interchange slip (inward or outward EIR). mode: 'preview' | 'download' | 'print' */
  D.eir = async function (id, mode) {
    try {
      if (window.ICR && ICR.enabled && ICR.ensurePhotos) { try { await ICR.ensurePhotos(id); } catch (x) { /* build without photos */ } }
      const ic = (state.db.interchange || []).find(x => x.id === id);
      if (!ic) return toast('Record not found on this device', 'error');
      if (typeof icAwaitingSurvey === 'function' && !icAwaitingSurvey(ic) && typeof ensureEirNumber === 'function') await ensureEirNumber(ic);
      if (typeof icSlipPrefetch === 'function') { try { await icSlipPrefetch(ic); } catch (x) { /* print what we have */ } }
      const by = await icPrinter(ic); if (by === null) return;
      const r = buildInterchangeSlip(id, { printedBy: by });
      act(r, mode, (/^(Gate|Depot)-In$/.test(ic.type) ? 'Inward' : 'Outward') + ' EIR — ' + ic.container + (ic.eirNumber ? ' · ' + ic.eirNumber : ''));
    } catch (x) { console.error(x); toast('Could not build the interchange: ' + (x && x.message), 'error'); }
  };
  D.inspection = async function (surveyId, mode) {
    try { const by = await icPrinter(null, 'Inspection report'); if (by === null) return; const r = await buildInspectionReport(surveyId, { printedBy: by }); act(r, mode, 'Inspection report'); }
    catch (x) { console.error(x); toast('Could not build the inspection report: ' + (x && x.message), 'error'); }
  };

  /* everything on file for one container */
  D.open = async function (contRaw) {
    const cont = String(contRaw || '').trim().toUpperCase(); if (!cont) return;
    css(); openModal('Documents — ' + cont, '<div class="gxd-meta" style="padding:12px 0">Loading documents…</div>');
    try { if (window.ICR && ICR.enabled && navigator.onLine) await ICR.byContainer(cont); } catch (x) { /* show what is on this device */ }
    const key = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rows = (state.db.interchange || []).filter(i => key(i.container) === key(cont)).sort((a, b) => new Date(b.date) - new Date(a.date));
    const trips = (state.db.trips || []).filter(t => key(t.container) === key(cont)).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    const btn = (fn, id, mode, label, title) => '<button type="button" class="tbl-btn" onclick="GargoDocs.' + fn + '(\'' + e(id) + '\',\'' + mode + '\')"' + (title ? ' title="' + title + '"' : '') + '>' + label + '</button>';
    const trio = (fn, id) => btn(fn, id, 'preview', '👁 Preview') + btn(fn, id, 'download', '⬇ Download') + btn(fn, id, 'print', '🖨', 'Print');
    let h = '<div class="mono" style="font-size:16px;color:var(--gold);font-weight:700;margin-bottom:4px">' + e(cont) + '</div>';
    h += '<div class="gxd-h">Interchange (EIR) and inspection</div>';
    if (!rows.length) h += '<div class="gxd-meta">No interchange records on file for this container.</div>';
    rows.forEach(i => {
      const inward = /^(Gate|Depot)-In$/.test(i.type), pending = typeof icAwaitingSurvey === 'function' && icAwaitingSurvey(i);
      const hasPhotos = !!(i.img || i.hasImg || i.hasPhotos || (i.photos && i.photos.length));
      h += '<div class="gxd-row"><div><b>' + (inward ? 'Inward' : 'Outward') + ' EIR</b> ' + (i.eirNumber ? '<span class="mono">' + e(i.eirNumber) + '</span>' : '<span style="color:var(--amber)">' + (pending ? 'issued after survey' : 'number pending') + '</span>') +
        '<div class="gxd-meta">' + e(i.type) + ' · <b>Line:</b> ' + e(i.line && typeof lineName === 'function' ? lineName(i.line) : '— not set') + ' · ' + e(typeof fmtDate === 'function' ? fmtDate(i.date) : i.date) + (i.condition ? ' · ' + e(i.condition) : '') + (i.vessel ? ' · ' + e(i.vessel) + (i.voyage ? ' / ' + e(i.voyage) : '') : '') + '</div></div>' +
        '<div class="gxd-btns">' + trio('eir', i.id) + (inward ? '' : '<button type="button" class="tbl-btn" onclick="closeModal();icEditOutwardDetails(\'' + e(i.id) + '\')">✎ Slip details</button>') + (hasPhotos ? '<button type="button" class="tbl-btn" onclick="closeModal();showContainerPhotos(\'' + e(i.id) + '\')">🖼 Photos</button>' : '') + '</div></div>';
      if (i.surveyId) h += '<div class="gxd-row" style="padding-left:14px"><div><b>Inspection report</b><div class="gxd-meta">Survey for the ' + (inward ? 'inward' : 'outward') + ' record above</div></div><div class="gxd-btns">' + trio('inspection', i.surveyId) + '</div></div>';
    });
    if (trips.length) {
      h += '<div class="gxd-h">Trips and dispatch</div>';
      trips.forEach(t => { h += '<div class="gxd-row"><div><b>' + e(t.origin || '—') + ' → ' + e(t.dest || '—') + '</b><div class="gxd-meta">' + e(t.workType || '') + (t.shippingLine && typeof lineName === 'function' ? ' · <b>Line:</b> ' + e(lineName(t.shippingLine)) : '') + ' · ' + e(t.status || '') + ' · ' + e(typeof fmtDate === 'function' ? fmtDate(t.startTime) : t.startTime) + '</div></div><div class="gxd-btns"><button type="button" class="tbl-btn" onclick="closeModal();showTripDetail(\'' + e(t.id) + '\')">Open trip</button></div></div>'; });
    }
    h += '<div id="gxpDocHost"></div>';
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button type="button" class="modal-btn" onclick="closeModal();ReportCentre.open(\'history\',{container:\'' + e(cont) + '\'},true)">Open full history in Data Hub</button></div>';
    const body = $('modalBody'), ttl = $('modalTitle');
    if (body && ttl && ttl.textContent.indexOf(cont) > -1) {
      body.innerHTML = h;
      const sv = rows.find(i => i.surveyId);
      if (window.GargoPhotos) GargoPhotos.panel($('gxpDocHost'), { container: cont, surveyId: sv ? sv.surveyId : null, interchangeId: rows[0] ? rows[0].id : null });
    }
  };

  /* right after a dispatch is saved / completed: the outward EIR that was just issued */
  D.offerOutward = function (ic) {
    if (!ic) return; css();
    const b = (mode, label) => '<button type="button" class="modal-btn' + (mode === 'preview' ? '' : ' ghost') + '" onclick="GargoDocs.eir(\'' + e(ic.id) + '\',\'' + mode + '\')">' + label + '</button>';
    openModal('Outward EIR issued', '<div style="font-size:13px;line-height:1.6;color:var(--text-2)"><div style="margin-bottom:12px">The outward interchange for <b class="mono" style="color:var(--gold)">' + e(ic.container) + '</b> was issued automatically as <b>' + e(ic.eirNumber) + '</b>' + (ic.condition ? ' (' + e(ic.condition) + ')' : '') + '.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + b('preview', '👁 Preview') + b('download', '⬇ Download') + b('print', '🖨 Print') +
      '<button type="button" class="modal-btn ghost" onclick="icEditOutwardDetails(\'' + e(ic.id) + '\')">✎ Slip details</button>' +
      '<button type="button" class="modal-btn ghost" onclick="GargoDocs.open(\'' + e(ic.container) + '\')">All documents for this container</button></div></div>');
  };

  /* a Documents button inside the container and trip dialogs */
  function decorate(cont) {
    const body = $('modalBody'), ttl = $('modalTitle'); if (!body || !ttl || !cont) return;
    if (body.querySelector('[data-gxdocs]') || !/^(Container|Trip) — /.test(ttl.textContent) || /No records found/.test(body.textContent)) return;
    body.insertAdjacentHTML('beforeend', '<div data-gxdocs style="padding-top:12px;border-top:1px solid var(--border);margin-top:14px"><button type="button" class="modal-btn" onclick="GargoDocs.open(\'' + e(cont) + '\')">📄 Documents — EIR, inspection report, photos</button></div>');
  }
  ['showTripDetail', 'showContainerDetail'].forEach(n => {
    const f = window[n]; if (typeof f !== 'function' || f._gxd) return;
    const w = function (a) {
      const r = f.apply(this, arguments);
      const cont = n === 'showTripDetail' ? ((state.db.trips.find(t => t.id === a) || {}).container) : a, after = () => { try { decorate(cont); } catch (x) {} };
      if (r && typeof r.then === 'function') r.then(after); else after();
      return r;
    };
    w._gxd = true; window[n] = w;
  });
})();