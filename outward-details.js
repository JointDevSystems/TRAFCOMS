'use strict';

(function () {
  const orig = window.icEditOutwardDetails;
  if (typeof orig !== 'function' || orig._odWrapped) return;

  /* editor box -> field returned by GargoContainer.find(container, 'out') */
  const MAP = [
    ['oe_rel', 'releaseOrder', 'release order'],
    ['oe_trp', 'transporter', 'transporter'],
    ['oe_trl', 'trailer', 'trailer no.'],
    ['oe_did', 'driverId', 'driver ID'],
  ];
  const $ = id => document.getElementById(id);
  const recordOf = id => { try { return (state.db.interchange || []).find(i => i.id === id) || null; } catch (e) { return null; } };

  async function prefill(id) {
    const GC = window.GargoContainer;
    const ic = recordOf(id) || (window.ICR && ICR.row ? ICR.row(id) : null);
    if (!GC || !GC.find || !ic || !ic.container) return;
    const boxes = MAP.filter(m => { const el = $(m[0]); return el && !String(el.value || '').trim(); });
    if (!boxes.length) return;                                   // everything is already filled: nothing to suggest

    let hit = null;
    try { hit = await GC.find(ic.container, 'out'); } catch (e) { console.warn('outward details: lookup failed', e && e.message); }
    if (!hit) return;

    const filled = [];
    boxes.forEach(m => {
      const el = $(m[0]), v = String(hit[m[1]] || '').trim();
      if (!el || !v || String(el.value || '').trim()) return;    // the user may have typed while we were looking
      el.value = v;
      el.setAttribute('data-auto', '1');
      el.style.borderColor = 'var(--gold)';
      el.addEventListener('input', () => { el.removeAttribute('data-auto'); el.style.borderColor = ''; }, { once: true });
      filled.push(m[2]);
    });
    if (!filled.length) return;

    const first = $('oe_shipper');
    const anchor = first && first.closest ? first.closest('.fg') : null;
    if (anchor && !$('oe_autonote')) {
      const n = document.createElement('div');
      n.id = 'oe_autonote'; n.className = 'ops-notice'; n.style.cssText = 'margin-bottom:12px;font-size:12px';
      n.textContent = 'Filled in for you from the ' + (hit.from && hit.from.length ? hit.from.join(' / ') : 'container records') + ': ' +
        filled.join(', ') + '. Check them, then press Save. Boxes outlined in gold were filled automatically.';
      anchor.parentNode.insertBefore(n, anchor);
    }
  }

  const wrapped = async function (id) {
    const r = await orig.apply(this, arguments);                 // the original editor opens first, exactly as before
    try { await prefill(id); } catch (e) { console.warn('outward details: pre-fill skipped', e && e.message); }
    return r;
  };
  wrapped._odWrapped = true;
  window.icEditOutwardDetails = wrapped;
})();