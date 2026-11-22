'use strict';

(function () {
  if (typeof state === 'undefined') { console.error('edi-codeco.js needs the Gargo core scripts first'); return; }
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = () => (typeof supabase !== 'undefined' && supabase) || window.ghSupabase;
  const IN_TYPES = ['Gate-In', 'Depot-In'], OUT_TYPES = ['Gate-Out', 'Depot-Out'];
  const EAT = 3 * 3600000;                                   // Kenya is UTC+3 all year; stamps are written in depot local time
  const p2 = n => String(n).padStart(2, '0');
  const role = () => (state.profile && state.profile.role) || '';
  const canUse = () => role() === 'admin' || role() === 'ops' || role() === 'clerk';
  const canAdmin = () => role() === 'admin';
  const toastX = (m, t, ms) => { try { toast(m, t || 'info', ms); } catch (e) { console.log(m); } };

  /* ───────────── EDIFACT text helpers ───────────── */
  const X = s => String(s == null ? '' : s).replace(/[?'+:]/g, m => '?' + m);                // release character
  const ID = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const FT = (s, n) => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9 .,\-()\/=&]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const eat = ms => new Date(ms + EAT);
  const stamp = ms => { const d = eat(ms); return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + p2(d.getUTCHours()) + p2(d.getUTCMinutes()); };   // CCYYMMDDHHMM (format 203)
  const isoDay = ms => { const d = eat(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); };
  const dayMs = (iso, end) => Date.parse(iso + (end ? 'T23:59:59.999+03:00' : 'T00:00:00+03:00'));

  /* ISO 6346 check digit */
  const LV = (() => { const m = {}; let v = 10; 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(c => { if (v % 11 === 0) v++; m[c] = v++; }); return m; })();
  function boxCheck(n) {
    let sum = 0; for (let i = 0; i < 10; i++) { const c = n[i]; sum += (/\d/.test(c) ? +c : LV[c]) * Math.pow(2, i); }
    return (sum % 11) % 10 === +n[10];
  }

  /* ───────────── size/type -> ISO 6346 code ───────────── */
  const DEFAULT_ISO = {
    '20HD': '22G1', '20HC': '25G1', '40HD': '42G1', '40HC': '45G1', '45HD': 'L5G1', '45HC': 'L5G1',
    '20OT': '22U1', '40OT': '42U1', '40OTHC': '45U1', '20FR': '22P1', '40FR': '42P1', '20PL': '22P1', '40PL': '42P1',
    '20RF': '22R1', '40RF': '42R1', '40RFHC': '45R1', '20TK': '22T0', '40TK': '42T0',
  };
  function isoFor(ic, map) {
    const given = String(ic.isoCode || '').toUpperCase().replace(/\s/g, '');
    if (/^[2-4LM][0-9A-Z][A-Z][0-9]$/.test(given)) return { code: given };
    const s = String(ic.ctype || '').toUpperCase(), m = s.match(/(20|40|45)/);
    if (!m) return { err: 'no container size on the record' };
    const w = (code, word) => new RegExp('(^|[^A-Z])' + code + '(?![A-Z])' + (word ? '|' + word : '')).test(s);
    const hc = w('HC', 'HIGH\\s*CUBE|(^|[^A-Z])HQ(?![A-Z])');
    let type = w('OT', 'OPEN\\s*TOP') ? 'OT' : w('FR', 'FLAT\\s*RACK') ? 'FR' : w('RF', 'REEFER') ? 'RF' : w('TK', 'TANK') ? 'TK' : w('PL', 'PLATFORM') ? 'PL' : (hc ? 'HC' : 'HD');
    const key = m[1] + type + (hc && type !== 'HC' && type !== 'HD' ? 'HC' : '');
    const code = (map && map[key]) || DEFAULT_ISO[key] || (hc && DEFAULT_ISO[m[1] + 'HC']) || '';
    return code ? { code } : { err: 'no ISO size/type code for "' + (ic.ctype || key) + '" (add it under Size/type codes in the profile)' };
  }
  const fullEmpty = ic => (/empty/i.test(ic.cargoStatus || '') || !ic.cargoStatus) ? '4' : (/laden|full|part/i.test(ic.cargoStatus) ? '5' : '4');
  const GOOD = /^(good|available|food grade|repat|sale|shipper)$/i;
  const damageText = ic => {
    const r = (ic.repairs || []).map(x => String(x.item || x.code || '').trim()).filter(Boolean);
    if (r.length) return 'DAMAGE: ' + r.join(', ');
    return ic.condition && !GOOD.test(String(ic.condition).trim()) ? 'CONDITION: ' + ic.condition : '';
  };
  const regOf = id => { const t = (state.db.trucks || []).find(x => x.id === id); return t ? t.reg : ''; };

  /* ───────────── profile check ───────────── */
  function profileGaps(p) {
    const g = [];
    if (!p) return ['profile not created'];
    if (!String(p.sender_id || '').trim()) g.push('sender ID');
    if (!String(p.receiver_id || '').trim()) g.push('receiver ID');
    if (!String(p.syntax || '').trim()) g.push('syntax');
    if (!/^[A-Z0-9]{5}$/.test(String(p.depot_locode || '').toUpperCase())) g.push('depot UN/LOCODE');
    return g;
  }

  /* ───────────── the message builder ───────────── */
  function buildInterchange(profile, line, items, o) {
    const ref = String(o.ref), now = o.now || Date.now(), seg = [];
    const q = v => (v ? ':' + X(String(v).toUpperCase()) : '');
    const opCode = X(ID(profile.operator_code) || ID(line.code));
    const loc = 'LOC+165+' + X(String(profile.depot_locode).toUpperCase()) + ':139:6' + (profile.depot_code ? '+' + X(ID(profile.depot_code)) + ':TER:ZZZ' : '');
    const nd = eat(now), yymmdd = String(nd.getUTCFullYear()).slice(2) + p2(nd.getUTCMonth() + 1) + p2(nd.getUTCDate()), hhmm = p2(nd.getUTCHours()) + p2(nd.getUTCMinutes());
    seg.push('UNB+' + String(profile.syntax).toUpperCase().replace(/[^A-Z0-9:]/g, '') + '+' + X(profile.sender_id) + q(profile.sender_qual) + '+' + X(profile.receiver_id) + q(profile.receiver_qual) + '+' + yymmdd + ':' + hhmm + '+' + ref + '++CODECO' + (profile.test_mode ? '++++1' : ''));
    let msgs = 0;
    [['in', '34'], ['out', '36']].forEach(([dir, bgm]) => {
      const list = items.filter(i => i.dir === dir); if (!list.length) return;
      msgs++; const start = seg.length, mref = String(msgs);
      seg.push('UNH+' + mref + '+CODECO:D:95B:UN' + (profile.assoc_code ? ':' + X(profile.assoc_code) : ''));
      seg.push('BGM+' + bgm + '+' + ref + mref + '+9');
      seg.push('NAD+MS+' + X(profile.sender_id) + ':160:ZZZ');
      list.forEach(i => {
        const ic = i.ic;
        seg.push('EQD+CN+' + i.box + '+' + i.iso + ':102:5+++' + fullEmpty(ic));
        if (ic.releaseOrderNo && ID(ic.releaseOrderNo)) seg.push('RFF+BN:' + X(ID(ic.releaseOrderNo).slice(0, 35)));
        if (ic.blNumber && ID(ic.blNumber)) seg.push('RFF+BM:' + X(ID(ic.blNumber).slice(0, 35)));
        seg.push('DTM+7:' + stamp(i.at) + ':203');
        seg.push(loc);
        const kg = Number(ic.grossWeight); if (kg > 0) seg.push('MEA+AAE+G+KGM:' + Math.round(kg));
        const dmg = damageText(ic);
        if (dmg) { const t = FT(dmg, 350), parts = []; for (let k = 0; k < t.length; k += 70) parts.push(X(t.slice(k, k + 70))); seg.push('FTX+DAR+++' + parts.join(':')); }
        if (ic.eirNumber && FT(ic.eirNumber, 70)) seg.push('FTX+AAI+++EIR ' + X(FT(ic.eirNumber, 60)));
        const truck = ID(ic.truckRegText || (ic.truck ? regOf(ic.truck) : ''));
        if (truck) seg.push('TDT+1++3+31++++' + X(truck.slice(0, 35)) + ':146');
        seg.push('NAD+CF+' + opCode + ':160:ZZZ');
      });
      seg.push('CNT+16:' + list.length);
      seg.push('UNT+' + (seg.length - start + 1) + '+' + mref);
    });
    seg.push('UNZ+' + msgs + '+' + ref);
    return { text: "UNA:+.? '\n" + seg.map(s => s + "'").join('\n') + '\n', messages: msgs };
  }

  /* ───────────── pick the movements for a line and period ───────────── */
  async function collect(profile, line, from, to, includeSent, test) {
    if (window.ICR && ICR.enabled) await ICR.ensureAll(new Date(dayMs(from)).toISOString());
    const t0 = dayMs(from), t1 = dayMs(to, true), map = profile && profile.iso_map || {};
    const rows = (state.db.interchange || []).filter(ic => ic.line === line.id && !ic.duplicateOfId && (IN_TYPES.indexOf(ic.type) > -1 || OUT_TYPES.indexOf(ic.type) > -1)
      && (() => { const t = Date.parse(ic.date); return t >= t0 && t <= t1; })());
    rows.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    let sent = new Set();
    if (!includeSent && rows.length && sb()) {
      const ids = rows.map(r => r.id);
      for (let i = 0; i < ids.length; i += 150) {
        const { data, error } = await sb().from('edi_exported').select('ic_id,bgm').eq('line_code', line.code).in('ic_id', ids.slice(i, i + 150));
        if (error) throw error;
        (data || []).forEach(r => sent.add(r.ic_id + '|' + r.bgm));
      }
    }
    const items = [], skipped = [], warnings = [], seen = new Set(); let already = 0;
    rows.forEach(ic => {
      const dir = IN_TYPES.indexOf(ic.type) > -1 ? 'in' : 'out', bgm = dir === 'in' ? '34' : '36';
      const box = ID(ic.container), why = m => skipped.push({ container: box || String(ic.container || ''), type: ic.type, at: ic.date, reason: m });
      if (sent.has(ic.id + '|' + bgm)) { already++; return; }
      if (!/^[A-Z]{4}[0-9]{7}$/.test(box)) return why('container number is not 4 letters + 7 digits');
      const iso = isoFor(ic, map); if (iso.err) return why(iso.err);
      const at = Date.parse(ic.date); if (isNaN(at)) return why('no valid date');
      const dk = box + '|' + bgm + '|' + stamp(at); if (seen.has(dk)) return why('duplicate of another record in this file');
      seen.add(dk);
      if (!boxCheck(box)) warnings.push(box + ' has an ISO 6346 check digit that does not match (sent as recorded)');
      items.push({ ic, dir, bgm, box, iso: iso.code, at });
    });
    return { items, skipped, warnings, already, total: rows.length };
  }

  /* ───────────── data access ───────────── */
  const S = { profiles: {}, outbox: [], line: '', from: '', to: '', inc: false, busy: false, last: null };
  const lines = () => (state.db.shippingLines || []).slice().sort((a, b) => (/^(PIL|COSCO|COS)/i.test(b.code) - /^(PIL|COSCO|COS)/i.test(a.code)) || String(a.code).localeCompare(String(b.code)));
  const lineById = id => (state.db.shippingLines || []).find(l => l.id === id) || null;
  async function loadProfiles() {
    const { data, error } = await sb().from('edi_profiles').select('*');
    if (error) throw error;
    S.profiles = {}; (data || []).forEach(p => { S.profiles[p.line_code] = p; });
  }
  async function loadOutbox() {
    const { data, error } = await sb().from('edi_outbox').select('id,line_code,interchange_ref,is_test,from_date,to_date,gate_in_count,gate_out_count,file_name,status,sent_at,sent_via,note,created_at,skipped').order('created_at', { ascending: false }).limit(40);
    if (error) throw error;
    S.outbox = data || [];
  }
  const dbMissing = e => e && /edi_(profiles|outbox|exported)|does not exist|schema cache/i.test(String(e.message || ''));

  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=us-ascii' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const fileName = (line, ref, test) => 'CODECO_' + (ID(line.code) || 'LINE') + '_' + ref + '_' + stamp(Date.now()) + (test ? '_TEST' : '') + '.edi';

  /* ───────────── actions ───────────── */
  function readForm() {
    S.line = ($('edi_line') || {}).value || S.line; S.from = ($('edi_from') || {}).value || S.from; S.to = ($('edi_to') || {}).value || S.to; S.inc = !!($('edi_inc') || {}).checked;
    const line = lineById(S.line), profile = line && S.profiles[line.code];
    return { line, profile };
  }
  async function preview() {
    const { line, profile } = readForm(), out = $('edi_out'); if (!out) return;
    if (!line) { out.innerHTML = '<div class="rc-warn rc-panel">Choose a shipping line.</div>'; return; }
    if (S.from > S.to) { toastX('From date must not be after To date', 'error'); return; }
    out.innerHTML = '<div class="empty-state"><div class="empty-state-label">Checking movements…</div></div>';
    try {
      const r = await collect(profile || {}, line, S.from, S.to, S.inc);
      S.last = r; const gaps = profileGaps(profile);
      const nIn = r.items.filter(i => i.dir === 'in').length, nOut = r.items.length - nIn;
      let h = '<div class="rc-stat">' + esc(line.code) + ' · ' + esc(S.from) + ' to ' + esc(S.to) + ': <b>' + nIn + '</b> gate-in, <b>' + nOut + '</b> gate-out to report' + (r.already ? ', ' + r.already + ' already sent earlier' : '') + (r.skipped.length ? ', <b>' + r.skipped.length + '</b> left out' : '') + '</div>';
      if (gaps.length) h += '<div class="rc-panel rc-warn">The ' + esc(line.code) + ' profile is incomplete (' + esc(gaps.join(', ')) + '). Fill it in under <b>Profile setup</b> with the values from the line\'s EDI onboarding. A file cannot be built until then.</div>';
      if (r.skipped.length) h += '<div class="rc-panel"><b>Left out of the file</b> (fix the record, then generate again)<div class="table-wrap"><table class="data-table"><thead><tr><th>Container</th><th>Movement</th><th>Date</th><th>Reason</th></tr></thead><tbody>' + r.skipped.slice(0, 200).map(s => '<tr><td>' + esc(s.container) + '</td><td>' + esc(s.type) + '</td><td>' + esc(String(s.at || '').slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(s.reason) + '</td></tr>').join('') + '</tbody></table></div></div>';
      if (r.warnings.length) h += '<div class="rc-panel"><b>Check these container numbers</b><br>' + r.warnings.slice(0, 50).map(esc).join('<br>') + '</div>';
      if (!gaps.length && r.items.length) {
        const sample = buildInterchange(profile, line, r.items, { ref: 'PREVIEW', now: Date.now() });
        h += '<div class="rc-panel"><b>EDIFACT preview</b> (reference number is assigned when you generate)<pre class="edi-pre">' + esc(sample.text.slice(0, 6000)) + (sample.text.length > 6000 ? '\n… (the file is longer)' : '') + '</pre></div>';
      }
      out.innerHTML = h;
    } catch (e) { console.error('EDI preview', e); out.innerHTML = '<div class="rc-panel rc-warn">' + (dbMissing(e) ? 'The EDI tables are not in the database yet. Run sql/edi_codeco.sql in Supabase first.' : 'Could not check the movements: ' + esc(e.message || e)) + '</div>'; }
  }
  async function generate() {
    if (S.busy) return;
    const { line, profile } = readForm(); if (!line) return toastX('Choose a shipping line', 'error');
    if (S.from > S.to) return toastX('From date must not be after To date', 'error');
    if (!navigator.onLine) return toastX('You are offline. The reference number and outbox need a connection.', 'error', 5000);
    const gaps = profileGaps(profile); if (gaps.length) return toastX('The ' + line.code + ' profile is incomplete: ' + gaps.join(', '), 'error', 6000);
    S.busy = true;
    try {
      const r = await collect(profile, line, S.from, S.to, S.inc); S.last = r;
      if (!r.items.length) { toastX(r.already ? 'Everything in this period was already sent.' : 'No movements to report for this line and period.', 'info', 5000); await preview(); return; }
      const test = !!profile.test_mode, nIn = r.items.filter(i => i.dir === 'in').length, nOut = r.items.length - nIn;
      if (!test && !confirm('Generate a LIVE ' + line.code + ' file with ' + nIn + ' gate-in and ' + nOut + ' gate-out movements?\n\nThese movements will be recorded as sent to the line and will not be included in later files.')) return;
      const { data: n, error: re } = await sb().rpc('edi_next_ref', { p_line: line.code }); if (re) throw re;
      const ref = String(n).padStart(8, '0'), b = buildInterchange(profile, line, r.items, { ref }), name = fileName(line, ref, test);
      const row = { line_code: line.code, interchange_ref: ref, is_test: test, from_date: S.from, to_date: S.to, gate_in_count: nIn, gate_out_count: nOut, file_name: name, content: b.text, skipped: r.skipped.slice(0, 500), status: 'generated', created_by: (state.currentUser && state.currentUser.id) || null };
      const { data: ob, error: oe } = await sb().from('edi_outbox').insert(row).select('id').single(); if (oe) throw oe;
      if (!test) {
        const ex = r.items.map(i => ({ ic_id: i.ic.id, line_code: line.code, bgm: i.bgm, outbox_id: ob.id }));
        for (let i = 0; i < ex.length; i += 500) {
          const { error: ee } = await sb().from('edi_exported').insert(ex.slice(i, i + 500));
          if (ee) { await sb().from('edi_outbox').delete().eq('id', ob.id); throw ee; }      // roll back: nothing half-recorded
        }
      }
      download(name, b.text);
      try { addAudit(state.profile && state.profile.username, 'EDI CODECO generated', line.code + ' ' + ref + (test ? ' (test)' : ' (live)') + ': ' + nIn + ' in, ' + nOut + ' out'); } catch (e) {}
      toastX((test ? 'Test file ' : 'File ') + name + ' downloaded', 'success', 5000);
      await loadOutbox(); paintOutbox(); await preview();
    } catch (e) { console.error('EDI generate', e); toastX(dbMissing(e) ? 'The EDI tables are not in the database yet. Run sql/edi_codeco.sql first.' : 'Could not generate the file: ' + (e.message || e), 'error', 7000); }
    finally { S.busy = false; }
  }
  async function redownload(id) {
    const { data, error } = await sb().from('edi_outbox').select('file_name,content').eq('id', id).single();
    if (error || !data) return toastX('Could not load the file', 'error'); download(data.file_name, data.content);
  }
  async function markSent(id) {
    const via = prompt('How was this file delivered to the line? (email, SFTP, portal, other)', 'email'); if (via === null) return;
    const { error } = await sb().from('edi_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), sent_via: via.trim() || 'manual' }).eq('id', id);
    if (error) return toastX('Could not update: ' + error.message, 'error'); await loadOutbox(); paintOutbox();
  }
  async function setStatus(id, st) {
    const { error } = await sb().from('edi_outbox').update({ status: st }).eq('id', id);
    if (error) return toastX('Could not update: ' + error.message, 'error'); await loadOutbox(); paintOutbox();
  }
  async function voidFile(id) {
    if (!canAdmin()) return;
    if (!confirm('Void this file? Its movements become available again for the next file. Only do this if the line never received it.')) return;
    const a = await sb().from('edi_exported').delete().eq('outbox_id', id); if (a.error) return toastX('Could not void: ' + a.error.message, 'error');
    const b = await sb().from('edi_outbox').update({ status: 'cancelled' }).eq('id', id); if (b.error) return toastX('Could not void: ' + b.error.message, 'error');
    await loadOutbox(); paintOutbox();
  }

  /* ───────────── profile setup (administrator) ───────────── */
  const isoText = m => Object.keys(m || {}).map(k => k + '=' + m[k]).join('\n');
  const isoParse = t => { const m = {}; String(t || '').split(/\n|,/).forEach(x => { const p = x.split('='); if (p.length === 2 && p[0].trim() && p[1].trim()) m[p[0].trim().toUpperCase()] = p[1].trim().toUpperCase(); }); return m; };
  function profileForm() {
    if (!canAdmin()) return toastX('Only an administrator can edit EDI profiles', 'error');
    const sel = lineById(($('edi_line') || {}).value) || lines()[0]; if (!sel) return;
    const opts = lines().map(l => '<option value="' + esc(l.id) + '"' + (l.id === sel.id ? ' selected' : '') + '>' + esc(l.code) + (S.profiles[l.code] ? (S.profiles[l.code].enabled ? ' · on' : ' · set up') : '') + '</option>').join('');
    openModal('EDI profile', '<div class="fg"><label>Shipping line</label><select id="ep_line" onchange="GargoEDI.profileFor(this.value)">' + opts + '</select></div><div id="ep_body"></div>');
    paintProfile(sel);
  }
  function paintProfile(line) {
    const p = S.profiles[line.code] || { enabled: false, syntax: 'UNOA:2', depot_locode: 'KEMBA', test_mode: true, iso_map: {} }, f = (id, l, v, ex) => '<div class="fg"><label>' + l + '</label><input id="ep_' + id + '" value="' + esc(v == null ? '' : v) + '" ' + (ex || '') + '></div>';
    $('ep_body').innerHTML = '<div class="form-row-2">' + f('sender', 'Sender ID (UNB) *', p.sender_id) + f('sq', 'Sender qualifier', p.sender_qual) + '</div><div class="form-row-2">' + f('recv', 'Receiver ID (UNB) *', p.receiver_id) + f('rq', 'Receiver qualifier', p.receiver_qual) + '</div>' +
      '<div class="form-row-2">' + f('syn', 'Syntax identifier', p.syntax) + f('assoc', 'Association code (UNH), if the line names one', p.assoc_code) + '</div><div class="form-row-2">' + f('loc', 'Depot UN/LOCODE', p.depot_locode) + f('dep', 'Depot / terminal code given by the line', p.depot_code) + '</div>' +
      f('op', 'Container operator code (NAD+CF). Blank uses "' + esc(line.code) + '"', p.operator_code) +
      '<div class="fg"><label>Size/type codes that differ for this line (one per row, e.g. 40HC=45G1)</label><textarea id="ep_iso" rows="3">' + esc(isoText(p.iso_map)) + '</textarea></div>' +
      '<div class="fg" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ep_test" style="width:auto"' + (p.test_mode ? ' checked' : '') + '><label style="margin:0">Test mode (marks files as test in the UNB). Untick only after the line has approved your test files.</label></div>' +
      '<div class="fg" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ep_on" style="width:auto"' + (p.enabled ? ' checked' : '') + '><label style="margin:0">Profile in use</label></div>' +
      '<div id="ep_err" style="color:var(--red);font-size:12px;min-height:16px"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="action-btn ghost" onclick="closeModal({target:document.getElementById(\'modalOverlay\')})">Cancel</button><button class="action-btn" onclick="GargoEDI.saveProfile()">Save</button></div>';
  }
  async function saveProfile() {
    const line = lineById($('ep_line').value), v = id => ($('ep_' + id).value || '').trim(), err = $('ep_err');
    if (!line) return;
    if (!/^[A-Za-z0-9]{5}$/.test(v('loc'))) { err.textContent = 'Depot UN/LOCODE must be 5 letters/digits (Mombasa is KEMBA).'; return; }
    if (!/^UNO[A-Z]:[1-4]$/.test(v('syn').toUpperCase())) { err.textContent = 'Syntax should look like UNOA:2 or UNOC:3.'; return; }
    const prev = S.profiles[line.code] || {};
    const rec = { line_code: line.code, enabled: $('ep_on').checked, sender_id: v('sender') || null, sender_qual: v('sq') || null, receiver_id: v('recv') || null, receiver_qual: v('rq') || null, syntax: v('syn').toUpperCase(), assoc_code: v('assoc') || null, operator_code: v('op') || null, depot_locode: v('loc').toUpperCase(), depot_code: v('dep') || null, test_mode: $('ep_test').checked, iso_map: isoParse($('ep_iso').value), updated_by: (state.currentUser && state.currentUser.id) || null, updated_at: new Date().toISOString() };
    /* next_ref is deliberately not sent: an upsert leaves it alone, so the running reference is never reset */
    if (prev.test_mode && !rec.test_mode && !confirm('Switch ' + line.code + ' to LIVE? Files will no longer be marked as test.')) return;
    const { error } = await sb().from('edi_profiles').upsert(rec, { onConflict: 'line_code' });
    if (error) { err.textContent = dbMissing(error) ? 'The EDI tables are not in the database yet. Run sql/edi_codeco.sql first.' : error.message; return; }
    try { addAudit(state.profile && state.profile.username, 'EDI profile saved', line.code + (rec.test_mode ? ' (test)' : ' (live)')); } catch (e) {}
    closeModal({ target: $('modalOverlay') }); toastX(line.code + ' EDI profile saved', 'success'); await loadProfiles(); paintPanel();
  }

  /* ───────────── panel in the Data Hub ───────────── */
  const CSS = '.edi-pre{max-height:360px;overflow:auto;margin:8px 0 0;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);font:12px/1.5 var(--font-mono,monospace);white-space:pre;color:var(--text)}.edi-b{display:inline-block;padding:2px 8px;border-radius:999px;font:600 11px var(--font-ui);border:1px solid var(--border)}.edi-b.t{color:var(--amber);border-color:var(--amber)}.edi-b.l{color:var(--green);border-color:var(--green)}.edi-b.x{color:var(--text-3)}';
  function paintOutbox() {
    const host = $('edi_box'); if (!host) return;
    if (!S.outbox.length) { host.innerHTML = '<div class="gd-empty" style="padding:16px;color:var(--text-2)">No files generated yet.</div>'; return; }
    host.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Created</th><th>Line</th><th>Ref</th><th>Period</th><th>In / Out</th><th>Mode</th><th>Status</th><th></th></tr></thead><tbody>' + S.outbox.map(o => {
      const sk = (o.skipped && o.skipped.length) ? ' · ' + o.skipped.length + ' left out' : '';
      return '<tr><td>' + esc(String(o.created_at || '').slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(o.line_code) + '</td><td>' + esc(o.interchange_ref) + '</td><td>' + esc(o.from_date) + (o.to_date !== o.from_date ? ' → ' + esc(o.to_date) : '') + '</td><td>' + o.gate_in_count + ' / ' + o.gate_out_count + esc(sk) + '</td><td><span class="edi-b ' + (o.is_test ? 't' : 'l') + '">' + (o.is_test ? 'TEST' : 'LIVE') + '</span></td><td><span class="edi-b ' + (o.status === 'cancelled' ? 'x' : '') + '">' + esc(o.status) + (o.sent_via ? ' · ' + esc(o.sent_via) : '') + '</span></td><td style="white-space:nowrap">' +
        '<button class="tbl-btn" data-edi="dl:' + o.id + '">Download</button>' +
        (o.status === 'generated' ? ' <button class="tbl-btn" data-edi="sent:' + o.id + '">Mark sent</button>' : '') +
        (o.status === 'sent' ? ' <button class="tbl-btn" data-edi="ack:' + o.id + '">Acknowledged</button> <button class="tbl-btn" data-edi="fail:' + o.id + '">Rejected</button>' : '') +
        (canAdmin() && !o.is_test && o.status !== 'cancelled' && o.status !== 'acknowledged' ? ' <button class="tbl-btn" data-edi="void:' + o.id + '">Void</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function paintPanel() {
    const main = document.querySelector('#rcRoot .rc-main'); if (!main) return;
    const ls = lines(); if (!S.line || !lineById(S.line)) S.line = (ls[0] || {}).id || '';
    const today = isoDay(Date.now()); S.from = S.from || today; S.to = S.to || today;
    const sel = lineById(S.line), p = sel && S.profiles[sel.code], gaps = profileGaps(p);
    const opts = ls.map(l => { const pr = S.profiles[l.code]; return '<option value="' + esc(l.id) + '"' + (l.id === S.line ? ' selected' : '') + '>' + esc(l.code) + (l.name && l.name !== l.code ? ' — ' + esc(l.name) : '') + (pr ? (profileGaps(pr).length ? ' (profile incomplete)' : '') : ' (no profile)') + '</option>'; }).join('');
    const badge = p ? '<span class="edi-b ' + (p.test_mode ? 't' : 'l') + '">' + (p.test_mode ? 'TEST mode' : 'LIVE') + '</span>' : '';
    main.innerHTML = '<div class="rc-panel"><div class="rc-title">CODECO / EDIFACT gate reports</div><div class="rc-desc">One EDIFACT D.95B interchange per shipping line: gate-in (BGM 34) and gate-out (BGM 36) movements for the period, built from the interchange records.</div>' +
      '<div class="rc-chips"><button type="button" class="filter-btn" data-edi="d:0">Today</button><button type="button" class="filter-btn" data-edi="d:1">Yesterday</button><button type="button" class="filter-btn" data-edi="d:7">Last 7 days</button></div>' +
      '<div class="rc-grid"><div class="fg"><label>Shipping line</label><select id="edi_line">' + opts + '</select></div><div class="fg"><label>From date</label><input id="edi_from" type="date" value="' + esc(S.from) + '"></div><div class="fg"><label>To date</label><input id="edi_to" type="date" value="' + esc(S.to) + '"></div>' +
      '<div class="fg"><label>&nbsp;</label><label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0"><input type="checkbox" id="edi_inc" style="width:auto"' + (S.inc ? ' checked' : '') + '> Include movements already sent</label></div></div>' +
      (sel && gaps.length ? '<div class="rc-panel rc-warn">The ' + esc(sel.code) + ' profile is incomplete (' + esc(gaps.join(', ')) + '). ' + (canAdmin() ? 'Open Profile setup and enter the values from the line\'s EDI onboarding.' : 'Ask an administrator to complete it.') + '</div>' : '') +
      '<div class="rc-actions"><button class="action-btn" data-edi="gen">Generate &amp; download</button><button class="action-btn ghost" data-edi="prev">Check / preview</button>' + (canAdmin() ? '<button class="action-btn ghost" data-edi="prof">Profile setup</button>' : '') + ' ' + badge + '</div></div>' +
      '<div id="edi_out"></div><div class="rc-panel"><div class="rc-title" style="font-size:15px">Generated files</div><div id="edi_box"></div></div>';
    paintOutbox();
  }
  async function openPanel() {
    if (!canUse()) return toastX('Your role cannot open EDI reports', 'error');
    document.querySelectorAll('#rcRoot .rc-nav button').forEach(b => b.classList.toggle('on', b.id === 'ediNavBtn'));
    if (!$('ediStyle')) { const st = document.createElement('style'); st.id = 'ediStyle'; st.textContent = CSS; document.head.appendChild(st); }
    paintPanel();
    try { await Promise.all([loadProfiles(), loadOutbox()]); paintPanel(); }
    catch (e) { const out = $('edi_out'); if (out) out.innerHTML = '<div class="rc-panel rc-warn">' + (dbMissing(e) ? 'The EDI tables are not in the database yet. An administrator must run sql/edi_codeco.sql in Supabase.' : 'Could not load EDI data: ' + esc(e.message || e)) + '</div>'; }
  }
  function mountNav() {
    const nav = document.querySelector('#rcRoot .rc-nav'); if (!nav || $('ediNavBtn') || !canUse()) return;
    nav.insertAdjacentHTML('beforeend', '<div class="rc-nav-g">EDI</div><button type="button" id="ediNavBtn" title="CODECO gate-in / gate-out files for shipping lines">CODECO / EDIFACT</button>');
  }
  function onClick(ev) {
    const nb = ev.target.closest && ev.target.closest('#ediNavBtn'); if (nb) { ev.preventDefault(); openPanel(); return; }
    const b = ev.target.closest && ev.target.closest('[data-edi]'); if (!b) return; ev.preventDefault();
    const [cmd, arg] = b.getAttribute('data-edi').split(':');
    if (cmd === 'gen') return generate(); if (cmd === 'prev') return preview(); if (cmd === 'prof') return profileForm();
    if (cmd === 'dl') return redownload(arg); if (cmd === 'sent') return markSent(arg); if (cmd === 'ack') return setStatus(arg, 'acknowledged'); if (cmd === 'fail') return setStatus(arg, 'failed'); if (cmd === 'void') return voidFile(arg);
    if (cmd === 'd') { const n = Number(arg), t = Date.now(); S.to = isoDay(n === 1 ? t - 86400000 : t); S.from = n === 7 ? isoDay(t - 6 * 86400000) : S.to; if ($('edi_from')) { $('edi_from').value = S.from; $('edi_to').value = S.to; } }
  }
  function boot() {
    let tries = 0;
    const attach = () => {
      const root = $('rcRoot');
      if (!root) { if (++tries < 40) setTimeout(attach, 500); return; }
      if (root.dataset.ediWired) return; root.dataset.ediWired = '1';
      root.addEventListener('click', onClick);
      root.addEventListener('change', ev => { if (ev.target && /^edi_/.test(ev.target.id || '')) { readForm(); if (ev.target.id === 'edi_line') paintPanel(); } });
      new MutationObserver(mountNav).observe(root, { childList: true });          // the Data Hub repaints its whole root when a report is chosen
      mountNav();
    };
    attach();
  }
  window.GargoEDI = { build: buildInterchange, collect, isoFor, boxCheck, profileGaps, profileFor: id => { const l = lineById(id); if (l) paintProfile(l); }, saveProfile, open: openPanel };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0)); else boot();
})();