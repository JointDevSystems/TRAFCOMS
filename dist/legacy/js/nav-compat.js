"use strict";
(function() {
  try {
    if (!window.state && typeof state !== "undefined") window.state = state;
  } catch (e) {
  }
  if (typeof window.icOutIndex !== "function") {
    window.icOutIndex = function() {
      const idx = /* @__PURE__ */ new Map();
      (window.state && state.db && state.db.interchange || []).forEach((o) => {
        if (!/Out$/.test(o.type || "")) return;
        const k = String(o.container || "").toUpperCase(), t = new Date(o.date).getTime();
        if (!idx.has(k) || t > idx.get(k)) idx.set(k, t);
      });
      return idx;
    };
  }
  if (typeof window.icExitDate !== "function") {
    window.icExitDate = function(ic, idx) {
      if (ic.dateOut) return ic.dateOut;
      const last = (idx || window.icOutIndex()).get(String(ic.container || "").toUpperCase());
      return last !== void 0 && last >= new Date(ic.date).getTime() ? new Date(last).toISOString() : null;
    };
  }
  if (typeof window.icInYard !== "function") {
    window.icInYard = function(ic, idx) {
      return (ic.type === "Gate-In" || ic.type === "Depot-In") && !window.icExitDate(ic, idx);
    };
  }
})();
