'use strict';

(function () {
  const $ = id => document.getElementById(id);
  const FIELD = 'gf_survey_currency';
  const KES_LINES = ['PIL'];
  const cfg = k => { try { return window.cfgGet ? window.cfgGet(k) : undefined; } catch (e) { return undefined; } };
  const num = (n, d) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  const M = window.GargoMoney = {
    defaultFor(lineText) {
      return KES_LINES.some(c => new RegExp('^\\s*' + c + '\\b', 'i').test(String(lineText || ''))) ? 'KES' : 'USD';
    },
    sym(c) { return c === 'KES' ? 'KSh' : (c || 'USD'); },
    itemCur(r) { return (r && r.currency) || 'KES'; },                        // unstamped = saved before currencies existed = KES
    itemsCur(items) { return (items && items.length) ? M.itemCur(items[0]) : 'KES'; },
    lineText(prefix) {
      const el = $(prefix + '_line') || $('sv_line'); if (!el) return '';
      if (el.tagName === 'SELECT') { const o = el.options[el.selectedIndex]; return String((o && (o.text || o.value)) || ''); }
      return String(el.value || '');
    },
   
    curFor(prefix) {
      const items = (window._repairItems && window._repairItems[prefix]) || [];
      if (items.length) return M.itemCur(items[0]);
      if (prefix === 'sv') { const f = $(FIELD); if (f && f.value) return f.value; }
      return M.defaultFor(M.lineText(prefix));
    },
    labourRate(c) {
      const v = Number(cfg('survey.labourRate.' + c));
      if (v > 0) return v;
      return c === 'KES' ? 300 : 0;                                            // 300 = the rate the app always used for KES
    },
    fmt(n, c) { return M.sym(c) + ' ' + num(n, 2); },
    fmtMixed(list) {                                                           // [{amount, cur}] -> "USD 1,200.00 + KSh 3,000.00"
      const by = {}; (list || []).forEach(x => { if (x.amount) by[x.cur] = (by[x.cur] || 0) + Number(x.amount); });
      const parts = Object.keys(by).map(c => M.fmt(by[c], c));
      return parts.length ? parts.join(' + ') : M.fmt(0, 'USD');
    },
    labourWarning(items) {
      const c = M.itemsCur(items);
      if (!items || !items.length || M.labourRate(c) > 0 || !items.some(r => Number(r.hours) > 0)) return '';
      return `<div style="margin-top:6px;font-size:11px;color:var(--amber)">Labour rate for ${c} is not set, so the hours are not priced. An administrator sets it in Settings &rarr; Form Designer &rarr; Rules.</div>`;
    },
    refreshLabels() {
      document.querySelectorAll('.gx-cur').forEach(s => {
        const p = s.getAttribute('data-cur-for');
        s.textContent = M.sym(M.curFor(p));
        if (typeof window.refreshTariffPicker === 'function') window.refreshTariffPicker(p);   // PIL (KES) forms switch to the PIL tariff
      });
    },
  };

  /* ── survey form: default the Currency dropdown, keep the damage items in step with it ── */
  function restamp() {
    const f = $(FIELD), items = window._repairItems && window._repairItems.sv;
    if (f && f.value && items && items.length) {
      items.forEach(r => { r.currency = f.value; });
      if (typeof window.renderRepairItemsList === 'function') window.renderRepairItemsList('sv');
    }
    M.refreshLabels();
  }
  function apply(force) {
    const f = $(FIELD); if (!f) return;
    if (f.dataset.touched === '1' && !force) return;                           // the user chose one: leave it
    const want = M.defaultFor(M.lineText('sv'));
    if (![...f.options].some(o => o.value === want)) return;                   // an admin removed it from the list
    if (f.value !== want) { f.value = want; restamp(); }
  }
  function wire() {
    const f = $(FIELD); if (!f || f.dataset.scWired) { M.refreshLabels(); return; }
    f.dataset.scWired = '1';
    f.addEventListener('change', () => { f.dataset.touched = '1'; restamp(); });
    const line = $('sv_line');
    if (line) { line.addEventListener('change', () => apply(false)); line.addEventListener('input', () => apply(false)); }
    if (!f.value) apply(true); else M.refreshLabels();
  }

  /* any form whose shipping line or currency changes re-points its tariff picker (sv has its own handlers too; this also covers ic and cr) */
  document.addEventListener('change', e => {
    const id = e.target && e.target.id;
    if (id === 'sv_line' || id === 'ic_line' || id === 'cr_line' || id === FIELD) M.refreshLabels();
  });

  const _os = window.openSurveyModal;
  if (typeof _os === 'function') {
    window.openSurveyModal = async function () {
      const r = await _os.apply(this, arguments);
      setTimeout(wire, 0);                                                     // the designer has added the field by now
      return r;
    };
  }
})();