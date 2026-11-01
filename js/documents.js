'use strict';

(function () {
  const $ = id => document.getElementById(id);
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const D = window.GargoDocs = {};
  let url = null;

  function css() {
    if ($('gxDocCss')) return;
    const s = document.createElement('style'); s.id = 'gxDocCss';
    s.textContent = '.gxd-ov{position:fixed;top:0;right:0;bottom:0;left:0;z-index:10050;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:2vh 2vw}' +
      '.gxd-box{display:flex;flex-direction:column;width:100%;max-width:1000px;height:100%;max-height:96vh;border:1px solid var(--border-mid);border-radius:14px;overflow:hidden;background:var(--bg)}' +
      '.gxd-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);background:var(--glass-strong)}' +
      '.gxd-title{font-size:14px;font-weight:600;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.gxd-acts{display:flex;gap:6px;flex-wrap:wrap}.gxd-acts a{text-decoration:none;display:inline-flex;align-items:center}' +
      '.gxd-frame{flex:1;width:100%;border:0;background:#fff}.gxd-mob{padding:28px 18px;text-align:center;color:var(--text-2);font-size:13px;line-height:1.6}' +
      '.gxd-row{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--border)}' +
      '.gxd-row b{color:var(--text)}.gxd-meta{font-size:11px;color:var(--text-3);margin-top:2px}.gxd-btns{display:flex;gap:6px;flex-wrap:wrap}' +
      '.gxd-h{font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:14px 0 6px}';
    document.head.appendChild(s);
  }
  D.close = function () {
    const o = $('gxDocView'); if (o && o.parentNode) o.parentNode.removeChild(o);
    if (url) { try { URL.revokeObjectURL(url); } catch (x) {} url = null; }
    document.removeEventListener('keydown', esc);
  };
  function esc(ev) { if (ev.key === 'Escape') D.close(); }

  /* show a built jsPDF document ({doc, filename}) in a large preview with Download / Print */
  D.view = function (r, title) {
    if (!r || !r.doc) return;
    css(); D.close();
    try { url = URL.createObjectURL(r.doc.output('blob')); } catch (x) { r.doc.save(r.filename); return; }
    const ov = document.createElement('div'); ov.id = 'gxDocView'; ov.className = 'gxd-ov';
    ov.innerHTML = '<div class="gxd-box"><div class="gxd-bar"><div class="gxd-title">' + e(title || r.filename) + '</div><div class="gxd-acts">' +
      '<button type="button" class="action-btn" id="gxdDl">⬇ Download</button><button type="button" class="action-btn ghost" id="gxdPr">🖨 Print</button>' +
      '<a class="action-btn ghost" href="' + url + '" target="_blank" rel="noopener">Open in new tab</a><button type="button" class="action-btn ghost" id="gxdX">✕ Close</button></div></div>' +
      (MOBILE ? '<div class="gxd-mob">This device cannot show a PDF inside the page.<br>Use <b>Open in new tab</b> to read it, or <b>Download</b>.</div>' : '<iframe class="gxd-frame" src="' + url + '" title="' + e(title || 'Document') + '"></iframe>') + '</div>';
    ov.addEventListener('click', ev => { if (ev.target === ov) D.close(); });
    document.body.appendChild(ov);
    $('gxdDl').onclick = () => r.doc.save(r.filename);
    $('gxdPr').onclick = () => { try { if (typeof ghPrintPdf === 'function') ghPrintPdf(r.doc); else window.open(url); } catch (x) { window.open(url); } };
    $('gxdX').onclick = D.close;
    document.addEventListener('keydown', esc);
  };
  const act = (r, mode, title) => { if (!r) return; if (mode === 'download') r.doc.save(r.filename); else if (mode === 'print') ghPrintPdf(r.doc); else D.view(r, title); };

  /* interchange slip (inward or outward EIR). mode: 'preview' | 'download' | 'print' */
  D.eir = async function (id, mode) {
    try {
      if (window.ICR && ICR.enabled && ICR.ensurePhotos) { try { await ICR.ensurePhotos(id); } catch (x) { /* build without photos */ } }
      const ic = (state.db.interchange || []).find(x => x.id === id);
      if (!ic) return toast('Record not found on this device', 'error');
      if (typeof icAwaitingSurvey === 'function' && !icAwaitingSurvey(ic) && typeof ensureEirNumber === 'function') await ensureEirNumber(ic);
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
        '<div class="gxd-meta">' + e(i.type) + ' · ' + e(typeof fmtDate === 'function' ? fmtDate(i.date) : i.date) + (i.condition ? ' · ' + e(i.condition) : '') + (i.vessel ? ' · ' + e(i.vessel) + (i.voyage ? ' / ' + e(i.voyage) : '') : '') + '</div></div>' +
        '<div class="gxd-btns">' + trio('eir', i.id) + (hasPhotos ? '<button type="button" class="tbl-btn" onclick="closeModal();showContainerPhotos(\'' + e(i.id) + '\')">🖼 Photos</button>' : '') + '</div></div>';
      if (i.surveyId) h += '<div class="gxd-row" style="padding-left:14px"><div><b>Inspection report</b><div class="gxd-meta">Survey for the ' + (inward ? 'inward' : 'outward') + ' record above</div></div><div class="gxd-btns">' + trio('inspection', i.surveyId) + '</div></div>';
    });
    if (trips.length) {
      h += '<div class="gxd-h">Trips and dispatch</div>';
      trips.forEach(t => { h += '<div class="gxd-row"><div><b>' + e(t.origin || '—') + ' → ' + e(t.dest || '—') + '</b><div class="gxd-meta">' + e(t.workType || '') + ' · ' + e(t.status || '') + ' · ' + e(typeof fmtDate === 'function' ? fmtDate(t.startTime) : t.startTime) + '</div></div><div class="gxd-btns"><button type="button" class="tbl-btn" onclick="closeModal();showTripDetail(\'' + e(t.id) + '\')">Open trip</button></div></div>'; });
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