'use strict';

(function () {
  const BUCKET = 'container-photos';
  const CATS = [['survey', 'Survey photos'], ['post_repair', 'Post-repair photos'], ['damage', 'Damage photos'], ['seal', 'Seal photos'], ['other', 'Other photos']];
  const CAT_ONE = { survey: 'Survey photo', post_repair: 'Post-repair photo', damage: 'Damage photo', seal: 'Seal photo', other: 'Photo' };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const client = () => (typeof supabase !== 'undefined' && supabase) || window.ghSupabase;
  const ckey = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNASSIGNED';
  const cnorm = c => String(c || '').trim().toUpperCase();
  const G = window.GargoPhotos = { BUCKET, CATS };

  G.catLabel = c => CAT_ONE[c] || 'Photo';
  G.isLink = s => typeof s === 'string' && /^https?:\/\//i.test(s);

  function toBlob(u) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(u); if (!m) return null;
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: m[1] });
  }
  const pathOf = url => { const k = '/object/public/' + BUCKET + '/', i = String(url).indexOf(k); return i < 0 ? '' : decodeURIComponent(String(url).slice(i + k.length).split('?')[0]); };

  /* upload one data URL -> { url, path, size } (throws on failure) */
  G.upload = async function (dataUrl, o) {
    o = o || {};
    const c = client(); if (!c) throw new Error('Not connected');
    if (!navigator.onLine) throw new Error('You are offline');
    const blob = toBlob(dataUrl); if (!blob) throw new Error('Not an image');
    const ext = /png/i.test(blob.type) ? 'png' : (/webp/i.test(blob.type) ? 'webp' : 'jpg');
    const path = (o.container ? ckey(o.container) : 'misc') + '/' + (o.category || 'other') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await c.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return { url: c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path, size: blob.size };
  };
  /* upload if it is still a data URL; otherwise return as is. Never loses a photo: on failure the data URL is returned. */
  G.put = async function (src, o) {
    if (!src || typeof src !== 'string' || src.indexOf('data:image') !== 0) return src;
    try { return (await G.upload(src, o)).url; }
    catch (e) { console.warn('Photo kept on this device (upload failed):', e && e.message); return src; }
  };
  G.migrateList = async function (list, o) {
    const out = [];
    for (let i = 0; i < (list || []).length; i++) out.push(await G.put(list[i], o));
    return out;
  };

  /* ── container file (container_photos) ── */
  const cache = {};
  G.list = async function (container, force) {
    const c = cnorm(container); if (!c) return [];
    if (!force && cache[c] && Date.now() - cache[c].at < 20000) return cache[c].rows;
    const { data, error } = await client().from('container_photos').select('*').eq('container', c).order('created_at', { ascending: true });
    if (error) throw error;
    cache[c] = { at: Date.now(), rows: data || [] };
    return cache[c].rows;
  };
  G.add = async function (o) {
    const c = cnorm(o.container); if (!c) throw new Error('Container number needed');
    const up = await G.upload(o.dataUrl, { container: c, category: o.category });
    const prof = (typeof state !== 'undefined' && state.profile) || {};
    const row = {
      container: c, category: o.category || 'other', title: String(o.title || '').trim(), file_path: up.path, url: up.url,
      mime_type: 'image/jpeg', file_size_bytes: up.size, uploader_name: prof.name || null,
      survey_id: UUID.test(o.surveyId || '') ? o.surveyId : null, interchange_id: UUID.test(o.interchangeId || '') ? o.interchangeId : null,
    };
    const { data, error } = await client().from('container_photos').insert(row).select().single();
    if (error) { try { await client().storage.from(BUCKET).remove([up.path]); } catch (e) {} throw error; }
    delete cache[c];
    return data;
  };
  G.remove = async function (row) {
    const { error } = await client().from('container_photos').delete().eq('id', row.id);
    if (error) throw error;
    try { await client().storage.from(BUCKET).remove([row.file_path || pathOf(row.url)]); } catch (e) {}
    delete cache[cnorm(row.container)];
  };
  /* survey photos are already uploaded as links; record them in the container file too (once each) */
  G.linkSurveyPhotos = async function (o) {
    const c = cnorm(o.container), urls = (o.urls || []).filter(u => G.isLink(u) && pathOf(u)); if (!c || !urls.length) return;
    const have = new Set((await G.list(c, true)).map(r => r.url));
    const rows = urls.filter(u => !have.has(u)).map((u, i) => ({
      container: c, category: 'survey', title: 'Survey photo ' + (i + 1), file_path: pathOf(u), url: u, mime_type: 'image/jpeg',
      uploader_name: ((typeof state !== 'undefined' && state.profile) || {}).name || null,
      survey_id: UUID.test(o.surveyId || '') ? o.surveyId : null, interchange_id: UUID.test(o.interchangeId || '') ? o.interchangeId : null,
    }));
    if (!rows.length) return;
    const { error } = await client().from('container_photos').insert(rows);
    if (error) console.warn('container file link failed:', error.message);
    delete cache[c];
  };

  /* a link -> a small data URL, for jsPDF (a PDF cannot embed a web link) */
  const dcache = new Map();
  G.toDataUrl = function (url) {
    if (!url) return Promise.resolve('');
    if (/^data:/.test(url)) return Promise.resolve(url);
    if (dcache.has(url)) return dcache.get(url);
    if (dcache.size > 30) dcache.clear();
    const p = new Promise(res => {
      const timer = setTimeout(() => res(''), 20000);
      const done = v => { clearTimeout(timer); res(v); };
      fetch(url, { mode: 'cors' }).then(r => r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))).then(blob => {
        const u = URL.createObjectURL(blob), im = new Image();
        im.onload = () => {
          try {
            const s = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas');
            cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
            const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(im, 0, 0, cv.width, cv.height);
            const out = cv.toDataURL('image/jpeg', 0.75); cv.width = 1; cv.height = 1; URL.revokeObjectURL(u); done(out);
          } catch (e) { URL.revokeObjectURL(u); done(''); }
        };
        im.onerror = () => { URL.revokeObjectURL(u); done(''); };
        im.src = u;
      }).catch(() => done(''));
    });
    dcache.set(url, p);
    return p;
  };

  /* ── viewer + uploader (drawn inside any element) ── */
  function css() {
    if (document.getElementById('gxpCss')) return;
    const s = document.createElement('style'); s.id = 'gxpCss';
    s.textContent = '.gxp{margin-top:14px;padding-top:12px;border-top:1px solid var(--border)}.gxp-h{font-family:var(--font-mono);font-size:8px;letter-spacing:1.5px;color:var(--text-3);text-transform:uppercase;margin:12px 0 6px}' +
      '.gxp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}.gxp-it{position:relative;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--surface-2)}' +
      '.gxp-it img{display:block;width:100%;height:84px;object-fit:cover;cursor:zoom-in}.gxp-cap{padding:4px 6px;font-size:10.5px;line-height:1.3;color:var(--text-2);word-break:break-word}' +
      '.gxp-cap small{display:block;color:var(--text-3);font-size:9.5px}.gxp-del{position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:12px;line-height:1;cursor:pointer;padding:0;min-height:0}' +
      '.gxp-add{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:8px;margin-top:10px}.gxp-add .full{grid-column:1/-1}.gxp-msg{font-size:11.5px;color:var(--text-3);margin-top:6px;min-height:16px}';
    document.head.appendChild(s);
  }
  let seq = 0;
  G.panel = async function (host, ctx) {
    if (!host) return;
    css(); ctx = ctx || {};
    const cont = cnorm(ctx.container), id = 'gxp' + (++seq);
    host.innerHTML = '<div class="gxp"><div class="gxp-h" style="margin-top:0">Container photo file' + (cont ? ' — ' + esc(cont) : '') + '</div><div class="gxd-meta" style="font-size:11px;color:var(--text-3)">Loading photos…</div></div>';
    let rows = [], failed = '';
    try { rows = cont ? await G.list(cont, true) : []; } catch (e) { failed = (e && e.message) || 'could not load'; }
    const can = typeof isAdmin === 'function' ? isAdmin() : false;
    let h = '<div class="gxp"><div class="gxp-h" style="margin-top:0">Container photo file' + (cont ? ' — ' + esc(cont) : '') + '</div>';
    if (failed) h += '<div class="gxp-msg" style="color:var(--amber)">Photos could not be loaded (' + esc(failed) + ').</div>';
    CATS.forEach(([k, label]) => {
      const list = rows.filter(r => r.category === k); if (!list.length) return;
      h += '<div class="gxp-h">' + label + ' (' + list.length + ')</div><div class="gxp-grid">' + list.map(r =>
        '<div class="gxp-it"><img loading="lazy" src="' + esc(r.url) + '" alt="' + esc(r.title || label) + '" onclick="openPhotoLightbox(this.src)">' +
        (can ? '<button type="button" class="gxp-del" data-del="' + esc(r.id) + '" title="Delete">×</button>' : '') +
        '<div class="gxp-cap">' + esc(r.title || G.catLabel(r.category)) + '<small>' + esc(new Date(r.created_at).toLocaleDateString('en-KE')) + (r.uploader_name ? ' · ' + esc(r.uploader_name) : '') + '</small></div></div>').join('') + '</div>';
    });
    if (!rows.length && !failed) h += '<div class="gxp-msg">No photos in this container\'s file yet.</div>';
    h += '<div class="gxp-add"><select id="' + id + 'c">' + CATS.map(([k]) => '<option value="' + k + '"' + (k === (ctx.category || 'post_repair') ? ' selected' : '') + '>' + G.catLabel(k) + '</option>').join('') + '</select>' +
      '<input id="' + id + 't" placeholder="Label / title (e.g. Rear door after repair)" maxlength="80">' +
      '<input id="' + id + 'f" type="file" accept="image/*" multiple class="full">' +
      '<button type="button" class="modal-btn full" id="' + id + 'u">⬆ Upload to container file</button></div><div class="gxp-msg" id="' + id + 'm"></div></div>';
    host.innerHTML = h;
    host.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const row = rows.find(r => r.id === b.getAttribute('data-del')); if (!row || !confirm('Delete this photo from the container file?')) return;
      try { await G.remove(row); toast('Photo deleted', 'success'); G.panel(host, ctx); } catch (e) { toast('Could not delete: ' + (e.message || e), 'error'); }
    });
    const up = document.getElementById(id + 'u'), msg = document.getElementById(id + 'm');
    if (up) up.onclick = async () => {
      const files = Array.from(document.getElementById(id + 'f').files || []);
      if (!cont) return toast('No container number', 'error');
      if (!files.length) { msg.textContent = 'Choose one or more photos first.'; return; }
      if (!navigator.onLine) { msg.textContent = 'You are offline. Photos go straight to the server, so connect and try again.'; return; }
      const cat = document.getElementById(id + 'c').value, title = document.getElementById(id + 't').value;
      up.disabled = true; let ok = 0;
      for (let i = 0; i < files.length; i++) {
        msg.textContent = 'Uploading ' + (i + 1) + ' of ' + files.length + '…';
        const problem = typeof gxPhotoProblem === 'function' ? gxPhotoProblem(files[i]) : '';
        if (problem) { toast(files[i].name + ' skipped — ' + problem, 'error'); continue; }
        try {
          const data = await gxCompressImage(files[i]);
          if (!data) throw new Error('could not read the file');
          await G.add({ container: cont, category: cat, title: title && files.length > 1 ? title + ' ' + (i + 1) : title, dataUrl: data, surveyId: ctx.surveyId, interchangeId: ctx.interchangeId });
          ok++;
        } catch (e) { toast((files[i].name || 'Photo') + ': ' + (e.message || e), 'error', 6000); }
      }
      up.disabled = false;
      if (ok) { toast(ok + ' photo' + (ok > 1 ? 's' : '') + ' added to the container file', 'success'); try { addAudit(state.profile.username, 'Container Photos Added', cont + ' · ' + ok + ' · ' + cat); } catch (e) {} }
      G.panel(host, ctx);
    };
  };
  /* stand-alone dialog for a container */
  G.openFile = function (container, ctx) {
    const c = cnorm(container); if (!c) return;
    openModal('Photo file — ' + c, '<div id="gxpModalHost"></div>');
    G.panel(document.getElementById('gxpModalHost'), Object.assign({ container: c }, ctx || {}));
  };
})();