'use strict';

(function () {
  const G = window.GargoForms = window.GargoForms || {};
  const $ = id => document.getElementById(id);
  const LS_DEFS = 'gargo-cf-defs';
  const TABLES = { inward: 'interchange', survey: 'depot_surveys' };
  const FORMS = ['survey'];
  const TYPES = [['text', 'Short text'], ['longtext', 'Long text'], ['number', 'Number'], ['date', 'Date'], ['bool', 'Yes / No'], ['select', 'Dropdown list']];

  
  const BUILTIN = {
    inward: [],
    survey: [
      ['sv_container', 'Container No.', { locked: 1 }], ['sv_ctype', 'Type / Size', { locked: 1 }], ['sv_condition', 'Overall Condition', { locked: 1 }],
      ['sv_datein', 'Date IN'], ['sv_line', 'Shipping Line'], ['sv_consignee', 'Consignee / C&F'], ['sv_bl', 'Guarantee / B/L Number'],
      ['sv_vessel', 'Ex Vessel'], ['sv_voyage', 'Voyage'], ['sv_transporter', 'Transporter'],
      ['sv_iso', 'ISO Code', { cfg: 'survey.requireIso', def: false }], ['sv_mgwt', 'Max Gross Weight (kg)'], ['sv_tare', 'Tare Weight (kg)'],
      ['sv_gross', 'Gross Weight (kg)', { cfg: 'survey.requireWeight', def: false }],
      ['sv_dom', 'Date of Manufacture', { cfg: 'survey.requireManufactureDate', def: false }],
      ['sv_cargo', 'Cargo Status', { cfg: 'survey.requireCargoStatus', def: false }],
      ['sv_gatepass', 'Gate Pass No.'], ['sv_truck', 'Vehicle / Truck No.'], ['sv_trailer', 'Trailer Number'],
      ['sv_driver', 'Driver Name'], ['sv_driver_id', 'Driver ID Number'], ['sv_clerk', 'Surveyed By'], ['sv_seal', 'Seal Number'], ['sv_remarks', 'Remarks / Notes'],
    ],
  };
  const RULES = [
    { key: 'survey.minPhotos', label: 'Minimum survey photos', type: 'number', def: 0, max: 20, hint: '0 = photos optional' },
    { key: 'survey.requireGuarantee', label: 'Guarantee form must be uploaded before a survey can be saved', type: 'bool', def: false },
    { key: 'survey.labourRate.USD', label: 'Repair labour rate per hour (USD)', type: 'number', def: 0, max: 100000, step: '0.01', hint: 'Tariff hours x this rate = labour, for surveys priced in USD. 0 = not set, so hours are not priced.' },
    { key: 'survey.labourRate.KES', label: 'Repair labour rate per hour (KES, used for PIL)', type: 'number', def: 300, max: 100000, step: '0.01', hint: 'Surveys priced in KES. The app has always used 300.' },
    { key: 'ops.checkDigit', label: 'Container number check-digit', type: 'select', def: 'block', choices: [['block', 'Block invalid numbers'], ['warn', 'Warn only'], ['off', 'Off']] },
  ];

  /* ── definitions: cached on the device so forms and settings work before / without the network ── */
  G.defs = [];
  G.backend = { ok: null, reason: '' };
  try { G.defs = JSON.parse(localStorage.getItem(LS_DEFS) || '[]') || []; } catch (e) { G.defs = []; }

  const custom = (form) => G.defs.filter(d => d.form_key === form && d.kind === 'field').sort((a, b) => (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)));
  const overrideOf = (form, id) => G.defs.find(d => d.form_key === form && d.kind === 'override' && d.field_key === id);
  const ruleRow = (key) => G.defs.find(d => d.kind === 'rule' && d.field_key === key);
  const live = (form) => custom(form).filter(d => d.active && d.column_status === 'ready');

  function persist() { try { localStorage.setItem(LS_DEFS, JSON.stringify(G.defs)); } catch (e) {} }

  /* columns the save code may write for a table (only custom fields whose column is ready) */
  G.columnsFor = function (table) {
    return G.defs.filter(d => d.kind === 'field' && d.column_status === 'ready' && d.column_name && TABLES[d.form_key] === table).map(d => d.column_name);
  };

  G.load = async function (force) {
    if (G._loading && !force) return G._loading;
    if (!force && G._at && Date.now() - G._at < 60000) return G.defs;      // fresh enough: do not delay opening a form
    G._loading = (async () => {
      try {
        const { data, error } = await supabase.from('form_fields').select('*').order('sort_order', { ascending: true });
        if (error) {
          const missing = /does not exist|schema cache|relation|404/i.test(error.message || '');
          G.backend = { ok: false, reason: missing ? 'missing' : (error.message || 'error') };
        } else {
          G.defs = data || []; G.backend = { ok: true, reason: '' }; G._at = Date.now(); persist();
        }
      } catch (e) { G.backend = { ok: false, reason: 'offline' }; }
      G._loading = null;
      return G.defs;
    })();
    return G._loading;
  };

  /* ── settings the save code asks for through cfgGet ── */
  G.cfg = function (k) {
    const r = ruleRow(k);
    if (r) { const v = r.options && r.options.value; return v === undefined ? undefined : v; }
    for (const form of Object.keys(BUILTIN)) {
      const b = BUILTIN[form].find(x => x[2] && x[2].cfg === k);
      if (b) { const o = overrideOf(form, b[0]); if (o) return o.hidden ? false : !!o.required; }
    }
    return undefined;
  };
  if (typeof window.cfgGet !== 'function') window.cfgGet = k => G.cfg(k);

  /* ── rendering custom fields + built-in tweaks into the live survey form ── */
  function fieldHtml(form, d) {
    const id = `gf_${form}_${d.field_key}`, ph = d.placeholder ? ` placeholder="${esc(d.placeholder)}"` : '';
    let inp;
    if (d.field_type === 'longtext') inp = `<textarea id="${id}" rows="3"${ph}></textarea>`;
    else if (d.field_type === 'number') inp = `<input id="${id}" type="number" step="any" inputmode="decimal"${ph}>`;
    else if (d.field_type === 'date') inp = `<input id="${id}" type="date">`;
    else if (d.field_type === 'bool') inp = `<select id="${id}"><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select>`;
    else if (d.field_type === 'select') inp = `<select id="${id}"><option value="">—</option>${(d.options || []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
    else inp = `<input id="${id}" type="text"${ph}>`;
    return `<div class="fg gf-field"><label>${esc(d.label || d.field_key)}${d.required ? ' <span class="gf-req">*</span>' : ''}</label>${inp}${d.help_text ? `<div class="gf-help">${esc(d.help_text)}</div>` : ''}</div>`;
  }
  function rootOf(form) { return form === 'inward' ? $('inwardTabSingle') : $('modalBody'); }

  G.decorate = function (form) {
    const root = rootOf(form); if (!root) return;
    (BUILTIN[form] || []).forEach(([id, label0, opt]) => {
      const el = root.querySelector('#' + id); if (!el) return;
      const wrap = el.closest('.fg'); if (!wrap) return;
      const ov = overrideOf(form, id), lab = wrap.querySelector('label');
      wrap.style.display = (ov && ov.hidden && !(opt && opt.locked)) ? 'none' : '';
      if (lab) {
        if (!lab.dataset.gf0) lab.dataset.gf0 = lab.innerHTML;
        if (ov && ov.label) lab.textContent = ov.label; else lab.innerHTML = lab.dataset.gf0;
        const req = ov ? ov.required : false;
        if (req && !(opt && opt.locked) && !lab.querySelector('.gf-req')) lab.insertAdjacentHTML('beforeend', ' <span class="gf-req">*</span>');
      }
    });
    const defs = live(form), boxId = 'gfCustom_' + form;
    let box = root.querySelector('#' + boxId);
    const sig = JSON.stringify(defs.map(d => [d.field_key, d.label, d.field_type, d.required, d.options, d.help_text, d.placeholder]));
    if (!defs.length) { if (box) box.remove(); return; }
    if (box && box.dataset.sig === sig) return;
    const keep = {}; if (box) defs.forEach(d => { const e = $(`gf_${form}_${d.field_key}`); if (e) keep[d.field_key] = e.value; });
    if (!box) {
      box = document.createElement('div'); box.id = boxId; box.className = 'gf-custom';
      const submit = root.querySelector('.submit-btn');
      if (submit && submit.parentNode) submit.parentNode.insertBefore(box, submit); else root.appendChild(box);
    }
    box.dataset.sig = sig;
    box.innerHTML = `<div class="gf-custom-head">Additional details</div><div class="gf-grid">${defs.map(d => fieldHtml(form, d)).join('')}</div>`;
    defs.forEach(d => { const e = $(`gf_${form}_${d.field_key}`); if (e && keep[d.field_key] !== undefined) e.value = keep[d.field_key]; });
  };

  G.collect = function (form) {
    const out = {};
    live(form).forEach(d => {
      const e = $(`gf_${form}_${d.field_key}`); if (!e) return;
      let v = String(e.value || '').trim();
      if (d.field_type === 'number') out[d.field_key] = v === '' ? null : Number(v);
      else if (d.field_type === 'bool') out[d.field_key] = v === '' ? null : v === 'yes';
      else out[d.field_key] = v === '' ? null : v;
    });
    return out;
  };

  /* returns an error message, or '' when the form is fine */
  G.validate = function (form) {
    for (const d of live(form)) {
      const e = $(`gf_${form}_${d.field_key}`); if (!e) continue;
      const v = String(e.value || '').trim();
      if (d.required && v === '') return `${d.label || d.field_key} is required`;
      if (d.field_type === 'number' && v !== '' && !isFinite(Number(v))) return `${d.label || d.field_key} must be a number`;
    }
    const root = rootOf(form);
    for (const [id, label0, opt] of (BUILTIN[form] || [])) {
      if (opt && (opt.locked || opt.cfg)) continue;           // locked / already enforced by the save code
      const ov = overrideOf(form, id); if (!ov || !ov.required || ov.hidden) continue;
      const e = root && root.querySelector('#' + id);
      if (e && String(e.value || '').trim() === '') return `${ov.label || label0} is required`;
    }
    return '';
  };

  G.clearForm = function (form) { live(form).forEach(d => { const e = $(`gf_${form}_${d.field_key}`); if (e) e.value = ''; }); };

  /* custom values -> database columns for depot_surveys (spread into the insert by recordSurvey) */
  G.surveyOut = function (cust) {
    const row = {}; if (!cust) return row;
    G.columnsFor('depot_surveys').forEach(col => { const k = col.slice(3); if (k in cust) row[col] = cust[k] === '' ? null : cust[k]; });
    return row;
  };

  /* ── database: create / verify columns ── */
  async function ensureColumn(row) {
    const { data, error } = await supabase.rpc('gargo_ensure_field_column', { p_form: row.form_key, p_field_key: row.field_key, p_type: row.field_type });
    const ok = !error && data && data.ok;
    const patch = ok ? { column_name: data.column, column_status: 'ready', column_error: null }
                     : { column_status: 'error', column_error: (error && error.message) || 'The database refused the change' };
    const up = await supabase.from('form_fields').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', row.id).select('*').single();
    if (up.data) Object.assign(row, up.data); else Object.assign(row, patch);
    return { ok, message: ok ? '' : patch.column_error, created: ok && data.created };
  }
  G.ensureColumn = ensureColumn;

  function afterSchemaChange() {
    persist();
    document.querySelectorAll('.gf-custom').forEach(b => b.remove());
    G.decorate('survey');
  }

  /* ── designer UI ── */
  const D = { tab: 'survey', editing: null, adding: false };
  const css = `
.gf-custom{margin:12px 0 4px;padding:12px;border:1px dashed var(--border-mid);border-radius:12px}
.gf-custom-head{font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-3);margin-bottom:8px}
.gf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.gf-req{color:var(--red)} .gf-help{font-size:11px;color:var(--text-3);margin-top:3px}
.gf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.gf-row{display:grid;grid-template-columns:minmax(0,1.6fr) auto auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)}
.gf-row input[type=text],.gf-row select{width:100%}
.gf-chip{display:inline-block;font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid var(--border)}
.gf-chip.ready{color:var(--green);border-color:var(--green)} .gf-chip.error{color:var(--red);border-color:var(--red)} .gf-chip.pending{color:var(--amber);border-color:var(--amber)}
.gf-sub{font-size:11px;color:var(--text-3)} .gf-h{font-size:12px;font-weight:600;margin:16px 0 6px;color:var(--gold)}
.gf-box{border:1px solid var(--border);border-radius:12px;padding:12px;margin-top:10px;background:var(--surface-2)}
.gf-mini{padding:4px 9px;font-size:11px}
@media (max-width:640px){.gf-row{grid-template-columns:1fr 1fr}.gf-row>:first-child{grid-column:1/-1}}`;
  if (!$('gfStyle')) { const st = document.createElement('style'); st.id = 'gfStyle'; st.textContent = css; document.head.appendChild(st); }

  const slug = s => { let k = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40); if (!/^[a-z]/.test(k)) k = 'f_' + k; return k.replace(/_+$/, ''); };

  function backendBanner() {
    if (G.backend.ok !== false) return '';
    const missing = G.backend.reason === 'missing';
    return `<div class="ops-notice" style="margin-bottom:12px;border-color:var(--amber)"><span style="flex:1;min-width:0">${missing
      ? '<b>The form settings table is missing in the database.</b> Ask the developer to run the form designer migration, then press Re-check.'
      : `<b>Could not reach the form settings</b> (${esc(G.backend.reason)}). Changes cannot be saved until you are online.`}
      <br><button class="action-btn gf-mini" style="margin-top:8px" onclick="GargoForms.recheck()">Re-check</button></span></div>`;
  }

  function tabsHtml() {
    const t = (k, l) => `<button class="filter-btn ${D.tab === k ? 'active' : ''}" onclick="GargoForms.tab('${k}')">${l}</button>`;
    return `<div class="gf-tabs">${t('survey', 'Survey form')}${t('rules', 'Rules')}${t('db', 'Database')}</div>`;
  }

  function builtinTable(form) {
    return `<div class="gf-h">Built-in fields</div><div class="gf-sub" style="margin-bottom:6px">Rename a field, hide it, or make it required. Fields marked 🔒 are needed by the system.</div>` +
      BUILTIN[form].map(([id, label0, opt]) => {
        opt = opt || {}; const ov = overrideOf(form, id) || {};
        const hidden = !!ov.hidden, req = opt.cfg ? (ov.required !== undefined && ov.required !== null && G.defs.includes(ov) ? !!ov.required : !!opt.def) : !!ov.required;
        return `<div class="gf-row"><input type="text" value="${esc(ov.label || label0)}" onchange="GargoForms.setLabel('${form}','${id}',this.value)" aria-label="Label for ${esc(label0)}">
          <label class="gf-sub" style="display:flex;gap:6px;align-items:center;white-space:nowrap"><input type="checkbox" ${hidden ? '' : 'checked'} ${opt.locked ? 'disabled' : ''} onchange="GargoForms.setFlag('${form}','${id}','hidden',!this.checked)"> ${opt.locked ? '🔒 shown' : 'Shown'}</label>
          <label class="gf-sub" style="display:flex;gap:6px;align-items:center;white-space:nowrap"><input type="checkbox" ${req || opt.locked ? 'checked' : ''} ${opt.locked ? 'disabled' : ''} onchange="GargoForms.setFlag('${form}','${id}','required',this.checked)"> Required</label></div>`;
      }).join('');
  }

  function customTable(form) {
    const list = custom(form);
    const rows = list.map((d, i) => `<div class="gf-row" style="${d.active ? '' : 'opacity:.55'}">
      <div><b>${esc(d.label)}</b> <span class="gf-sub">· ${esc((TYPES.find(t => t[0] === d.field_type) || [0, d.field_type])[1])}${d.required ? ' · required' : ''}${d.active ? '' : ' · archived'}</span><br>
        <span class="gf-chip ${esc(d.column_status)}">${d.column_status === 'ready' ? 'database column ready' : d.column_status === 'error' ? 'database error' : 'database pending'}</span>
        <span class="gf-sub">${esc(TABLES[form])}.${esc(d.column_name || 'cf_' + d.field_key)}</span>
        ${d.column_error ? `<div class="gf-sub" style="color:var(--red)">${esc(d.column_error)}</div>` : ''}</div>
      <div style="display:flex;gap:4px"><button class="action-btn ghost gf-mini" ${i === 0 ? 'disabled' : ''} onclick="GargoForms.move('${d.id}',-1)" aria-label="Move up">▲</button><button class="action-btn ghost gf-mini" ${i === list.length - 1 ? 'disabled' : ''} onclick="GargoForms.move('${d.id}',1)" aria-label="Move down">▼</button></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${d.column_status !== 'ready' ? `<button class="action-btn gf-mini" onclick="GargoForms.retry('${d.id}')">Create column</button>` : ''}<button class="action-btn ghost gf-mini" onclick="GargoForms.edit('${d.id}')">Edit</button><button class="action-btn ghost gf-mini" onclick="GargoForms.toggleActive('${d.id}')">${d.active ? 'Archive' : 'Restore'}</button></div></div>`).join('');
    return `<div class="gf-h">Custom fields</div><div class="gf-sub" style="margin-bottom:6px">The <b>Currency</b> field below is a custom field: click Edit to change which currencies are offered (one per line).</div>${rows || '<div class="gf-sub" style="padding:8px 0">No custom fields yet.</div>'}
      <div style="margin-top:10px"><button class="action-btn" onclick="GargoForms.startAdd()">+ Add a field</button></div>${editorHtml(form)}`;
  }

  function editorHtml(form) {
    if (!D.adding && !D.editing) return '';
    const ed = D.editing ? G.defs.find(d => d.id === D.editing) : null;
    const v = ed || { label: '', field_type: 'text', required: false, options: [], placeholder: '', help_text: '' };
    return `<div class="gf-box" id="gfEditor"><div class="gf-h" style="margin-top:0">${ed ? 'Edit field' : 'New field'}</div>
      <div class="form-row-2"><div class="fg"><label>Label *</label><input id="gfe_label" type="text" value="${esc(v.label)}" placeholder="e.g. Seal condition"></div>
      <div class="fg"><label>Type</label><select id="gfe_type" ${ed ? 'disabled' : ''} onchange="GargoForms.typeChanged()">${TYPES.map(t => `<option value="${t[0]}" ${v.field_type === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select>${ed ? '<div class="gf-help">The type is fixed once the database column exists.</div>' : ''}</div></div>
      <div class="fg" id="gfe_opts_wrap" style="display:${v.field_type === 'select' ? 'block' : 'none'}"><label>Dropdown choices (one per line)</label><textarea id="gfe_opts" rows="4">${esc((v.options || []).join('\n'))}</textarea></div>
      <div class="form-row-2"><div class="fg"><label>Placeholder</label><input id="gfe_ph" type="text" value="${esc(v.placeholder || '')}"></div><div class="fg"><label>Help text</label><input id="gfe_help" type="text" value="${esc(v.help_text || '')}"></div></div>
      <label class="gf-sub" style="display:flex;gap:6px;align-items:center;margin:6px 0 10px"><input type="checkbox" id="gfe_req" ${v.required ? 'checked' : ''}> Required on this form</label>
      <div id="gfe_err" style="color:var(--red);font-size:12px;min-height:16px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="action-btn ghost" onclick="GargoForms.cancelEdit()">Cancel</button><button class="action-btn" id="gfe_go" onclick="GargoForms.saveEditor('${form}')">${ed ? 'Save changes' : 'Add field and create database column'}</button></div></div>`;
  }

  function rulesHtml() {
    return `<div class="gf-h">Rules</div>` + RULES.map(r => {
      const cur = G.cfg(r.key); const val = cur === undefined ? r.def : cur;
      let ctl;
      if (r.type === 'bool') ctl = `<input type="checkbox" ${val ? 'checked' : ''} onchange="GargoForms.setRule('${r.key}',this.checked)">`;
      else if (r.type === 'select') ctl = `<select onchange="GargoForms.setRule('${r.key}',this.value)">${r.choices.map(c => `<option value="${c[0]}" ${val === c[0] ? 'selected' : ''}>${c[1]}</option>`).join('')}</select>`;
      else ctl = `<input type="number" min="0" max="${r.max || 20}" step="${r.step || 1}" value="${esc(val)}" style="width:110px" onchange="GargoForms.setRule('${r.key}',Number(this.value)||0)">`;
      return `<div class="gf-row" style="grid-template-columns:minmax(0,1fr) auto"><div>${esc(r.label)}${r.hint ? `<div class="gf-sub">${esc(r.hint)}</div>` : ''}</div><div>${ctl}</div></div>`;
    }).join('');
  }

  function dbHtml() {
    const all = G.defs.filter(d => d.kind === 'field');
    const rows = all.map(d => `<div class="gf-row" style="grid-template-columns:minmax(0,1fr) auto"><div>${esc(d.label)} <span class="gf-sub">${esc(TABLES[d.form_key])}.${esc(d.column_name || 'cf_' + d.field_key)}</span>${d.column_error ? `<div class="gf-sub" style="color:var(--red)">${esc(d.column_error)}</div>` : ''}</div><span class="gf-chip ${esc(d.column_status)}">${esc(d.column_status)}</span></div>`).join('');
    return `<div class="gf-h">Database</div><div class="gf-sub" style="margin-bottom:8px">Each custom field is stored in its own column of <b>depot_surveys</b>. Columns are only ever added, never changed or removed, so archiving a field keeps its data.</div>
      <button class="action-btn" id="gfVerifyBtn" onclick="GargoForms.verify()">Verify and repair all columns</button><div id="gfVerifyOut" class="gf-sub" style="margin-top:8px;min-height:18px"></div>${rows || '<div class="gf-sub" style="padding:8px 0">No custom fields yet.</div>'}`;
  }

  function render() {
    const body = $('modalBody'); if (!body) return;
    let inner = backendBanner() + tabsHtml();
    if (D.tab === 'survey') inner += builtinTable('survey') + customTable('survey');
    else if (D.tab === 'rules') inner += rulesHtml();
    else inner += dbHtml();
    body.innerHTML = inner;
  }

  G.open = async function (tab) {
    if (!isAdmin()) { toast('Administrator access required', 'error'); return; }
    D.tab = tab || 'survey'; D.adding = false; D.editing = null;
    openModal('Form Designer', '<div class="empty-state"><div class="empty-state-label">Loading…</div></div>');
    await G.load(true); render();
  };
  G.tab = (t) => { D.tab = t; D.adding = false; D.editing = null; render(); };
  G.recheck = async () => { await G.load(true); render(); if (G.backend.ok) toast('Form settings reachable', 'success'); };
  G.startAdd = () => { D.adding = true; D.editing = null; render(); const e = $('gfEditor'); if (e) e.scrollIntoView({ block: 'center' }); };
  G.edit = (id) => { D.editing = id; D.adding = false; render(); const e = $('gfEditor'); if (e) e.scrollIntoView({ block: 'center' }); };
  G.cancelEdit = () => { D.adding = false; D.editing = null; render(); };
  G.typeChanged = () => { const t = $('gfe_type'), w = $('gfe_opts_wrap'); if (t && w) w.style.display = t.value === 'select' ? 'block' : 'none'; };

  function need() { if (!isAdmin()) { toast('Administrator access required', 'error'); return false; } if (G.backend.ok === false) { toast('The form settings table is not reachable (see the banner)', 'warning', 5000); return false; } return true; }

  G.saveEditor = async function (form) {
    if (!need()) return;
    const err = $('gfe_err'), go = $('gfe_go'), val = id => ($(id) ? $(id).value.trim() : '');
    const label = val('gfe_label'), type = D.editing ? G.defs.find(d => d.id === D.editing).field_type : val('gfe_type');
    const opts = val('gfe_opts').split('\n').map(s => s.trim()).filter(Boolean);
    if (!label) { err.textContent = 'Give the field a label.'; return; }
    if (type === 'select' && opts.length < 2) { err.textContent = 'A dropdown needs at least two choices.'; return; }
    go.disabled = true; err.textContent = '';
    try {
      if (D.editing) {
        const row = G.defs.find(d => d.id === D.editing);
        const patch = { label, required: $('gfe_req').checked, placeholder: val('gfe_ph') || null, help_text: val('gfe_help') || null, options: type === 'select' ? opts : [], updated_at: new Date().toISOString() };
        const { data, error } = await supabase.from('form_fields').update(patch).eq('id', row.id).select('*').single();
        if (error) throw error; Object.assign(row, data);
        addAudit(state.profile.username, 'Form field edited', `${form}: ${label}`);
        toast('Field updated', 'success');
      } else {
        let key = slug(label), n = 2; const taken = new Set(G.defs.filter(d => d.form_key === form && d.kind === 'field').map(d => d.field_key));
        const base = key; while (taken.has(key)) key = (base + '_' + n++).slice(0, 40);
        const sort = custom(form).reduce((m, d) => Math.max(m, d.sort_order || 0), 100) + 10;
        const { data, error } = await supabase.from('form_fields').insert({ form_key: form, kind: 'field', field_key: key, label, field_type: type, required: $('gfe_req').checked, placeholder: val('gfe_ph') || null, help_text: val('gfe_help') || null, options: type === 'select' ? opts : [], sort_order: sort, column_name: 'cf_' + key, column_status: 'pending' }).select('*').single();
        if (error) throw error;
        G.defs.push(data);
        const r = await ensureColumn(data);
        addAudit(state.profile.username, 'Form field added', `${form}: ${label} (cf_${key})`);
        if (r.ok) toast(`Field added. Database column cf_${key} ${r.created ? 'created' : 'already existed'}.`, 'success', 5000);
        else toast(`Field saved, but the database column could not be created: ${r.message}`, 'error', 9000);
      }
      D.adding = false; D.editing = null; afterSchemaChange(); render();
    } catch (e) {
      go.disabled = false; err.textContent = (e && e.message) || 'Could not save';
    }
  };

  G.retry = async function (id) {
    if (!need()) return; const row = G.defs.find(d => d.id === id); if (!row) return;
    const r = await ensureColumn(row);
    toast(r.ok ? 'Database column ready' : `Still failing: ${r.message}`, r.ok ? 'success' : 'error', 6000);
    afterSchemaChange(); render();
  };

  G.toggleActive = async function (id) {
    if (!need()) return; const row = G.defs.find(d => d.id === id); if (!row) return;
    const { data, error } = await supabase.from('form_fields').update({ active: !row.active, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) return toast(error.message, 'error');
    Object.assign(row, data); afterSchemaChange(); render();
  };

  G.move = async function (id, dir) {
    if (!need()) return; const row = G.defs.find(d => d.id === id); if (!row) return;
    const list = custom(row.form_key), i = list.findIndex(d => d.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[i], b = list[j]; let sa = a.sort_order, sb = b.sort_order;
    if (sa === sb) sb = sa + dir;                                   // keep them distinct
    const up = await supabase.from('form_fields').upsert([{ ...a, sort_order: sb }, { ...b, sort_order: sa }], { onConflict: 'id' }).select('*');
    if (up.error) return toast(up.error.message, 'error');
    (up.data || []).forEach(r => { const t = G.defs.find(d => d.id === r.id); if (t) Object.assign(t, r); });
    afterSchemaChange(); render();
  };

  async function saveOverride(form, id, patch) {
    if (!need()) return false;
    let row = overrideOf(form, id);
    const rec = { form_key: form, kind: 'override', field_key: id, label: row ? row.label : null, required: row ? row.required : false, hidden: row ? row.hidden : false, active: true, updated_at: new Date().toISOString(), ...patch };
    const { data, error } = await supabase.from('form_fields').upsert(rec, { onConflict: 'form_key,kind,field_key' }).select('*').single();
    if (error) { toast(error.message, 'error'); return false; }
    if (row) Object.assign(row, data); else G.defs.push(data);
    persist();
    return true;
  }
  G.setLabel = async (form, id, v) => { const b = BUILTIN[form].find(x => x[0] === id); v = String(v || '').trim(); if (await saveOverride(form, id, { label: (!v || v === b[1]) ? null : v })) toast('Saved', 'success', 1200); };
  G.setFlag = async (form, id, flag, on) => { if (await saveOverride(form, id, { [flag]: !!on })) { toast('Saved', 'success', 1200); } render(); };

  G.setRule = async function (key, value) {
    if (!need()) return;
    const rec = { form_key: key.startsWith('survey') ? 'survey' : 'inward', kind: 'rule', field_key: key, options: { value }, active: true, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('form_fields').upsert(rec, { onConflict: 'form_key,kind,field_key' }).select('*').single();
    if (error) return toast(error.message, 'error');
    const row = ruleRow(key); if (row) Object.assign(row, data); else G.defs.push(data);
    persist(); toast('Saved', 'success', 1200);
  };

  G.verify = async function () {
    if (!need()) return;
    const out = $('gfVerifyOut'), btn = $('gfVerifyBtn'); if (btn) btn.disabled = true; if (out) out.textContent = 'Checking…';
    let fixed = 0, bad = 0;
    try {
      const { data, error } = await supabase.rpc('gargo_custom_columns');
      if (error) throw error;
      const have = new Set((data || []).map(c => c.table + '.' + c.column));
      for (const row of G.defs.filter(d => d.kind === 'field')) {
        const here = have.has(TABLES[row.form_key] + '.cf_' + row.field_key);
        if (here && row.column_status === 'ready') continue;
        const r = await ensureColumn(row);
        if (r.ok) fixed++; else bad++;
      }
    } catch (e) { if (out) out.textContent = 'Could not check: ' + ((e && e.message) || e); if (btn) btn.disabled = false; return; }
    persist(); afterSchemaChange(); render();
    const o2 = $('gfVerifyOut'); if (o2) o2.textContent = bad ? `${bad} field(s) still failing. See the messages below.` : (fixed ? `${fixed} column(s) created or repaired. Everything is in place.` : 'Everything is in place.');
  };

  /* ── Settings page entry ── */
  function settingsBlock() {
    if (!isAdmin()) return;
    const grid = document.querySelector('#sec-settings .settings-grid'); if (!grid) return;
    let blk = $('gfSettingsBlock');
    if (!blk) { blk = document.createElement('div'); blk.id = 'gfSettingsBlock'; blk.className = 'report-block'; blk.style.gridColumn = '1/-1'; grid.insertBefore(blk, grid.firstChild); }
    const n = G.defs.filter(d => d.kind === 'field').length, bad = G.defs.filter(d => d.kind === 'field' && d.column_status !== 'ready').length;
    blk.innerHTML = `<h3>Form Designer</h3>
      <div class="detail-row"><span>Customise</span><b>Survey form (fields, currency, rules)</b></div>
      <div class="detail-row"><span>Custom fields</span><b>${n}${bad ? ` <span class="gf-chip error">${bad} need attention</span>` : ''}</b></div>
      <div class="detail-row"><span>Database</span><b>${G.backend.ok === false ? '<span class="gf-chip pending">not reachable</span>' : 'new fields create their own columns automatically'}</b></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="action-btn" onclick="GargoForms.open('survey')">Edit Survey form</button><button class="action-btn ghost" onclick="GargoForms.open('rules')">Rules &amp; labour rates</button><button class="action-btn ghost" onclick="GargoForms.open('db')">Database</button></div>`;
  }

  /* ── wire into the app ── */
  const _rs = window.renderSettings;
  if (typeof _rs === 'function') {
    window.renderSettings = function () { const r = _rs.apply(this, arguments); settingsBlock(); G.load().then(settingsBlock); return r; };
    if (typeof sectionRenderers !== 'undefined') sectionRenderers.settings = window.renderSettings;
  }
  const _os = window.openSurveyModal;
  if (typeof _os === 'function') {
    window.openSurveyModal = async function () {
      await G.load();                                  // definitions first (cached for a minute), so the form opens complete
      const r = await _os.apply(this, arguments);
      G.decorate('survey');
      return r;
    };
  }
  const _bs = window.bootShell;
  if (typeof _bs === 'function') window.bootShell = function () { const r = _bs.apply(this, arguments); G.load(); return r; };
})();