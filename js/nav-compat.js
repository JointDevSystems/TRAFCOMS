'use strict';
/* Helpers the navigation layer relies on. Defined only when missing, so they never override Gargo's own versions. */
(function () {
  if (typeof window.icOutIndex !== 'function') {
    window.icOutIndex = function () {
      const idx = new Map();
      ((window.state && state.db && state.db.interchange) || []).forEach(o => {
        if (!/Out$/.test(o.type || '')) return;
        const k = String(o.container || '').toUpperCase(), t = new Date(o.date).getTime();
        if (!idx.has(k) || t > idx.get(k)) idx.set(k, t);
      });
      return idx;
    };
  }
  if (typeof window.icExitDate !== 'function') {
    window.icExitDate = function (ic, idx) {
      if (ic.dateOut) return ic.dateOut;
      const last = (idx || window.icOutIndex()).get(String(ic.container || '').toUpperCase());
      return last !== undefined && last >= new Date(ic.date).getTime() ? new Date(last).toISOString() : null;
    };
  }
  if (typeof window.icInYard !== 'function') {
    window.icInYard = function (ic, idx) { return (ic.type === 'Gate-In' || ic.type === 'Depot-In') && !window.icExitDate(ic, idx); };
  }
})();