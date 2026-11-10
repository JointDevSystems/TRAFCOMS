"use strict";
window.GARGO_PAYROLL = Object.freeze({
  verified: "2026-10-22",
  nssfRate: 0.06,
  // employee share, matched by employer
  nssfLower: 9e3,
  // Lower Earnings Limit (Tier I)
  nssfUpper: 108e3,
  // Upper Earnings Limit (Tier II); max employee contribution = 6,480
  shifRate: 0.0275,
  // SHIF: 2.75% of gross, no cap
  shifMin: 300,
  // SHIF minimum per month
  housingRate: 0.015,
  // Affordable Housing Levy: 1.5% of gross (employer matches)
  personalRelief: 2400,
  // per month
  payeBands: Object.freeze([
    // [band width, rate]
    [24e3, 0.1],
    [8333, 0.25],
    [467667, 0.3],
    [3e5, 0.325],
    [Infinity, 0.35]
  ])
});
