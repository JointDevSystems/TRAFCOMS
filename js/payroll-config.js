'use strict';
/* Gargo payroll configuration: Kenya statutory rates (monthly).
   Verified 22 Oct 2026 against: NSSF Year 4 notice (effective 1 Feb 2026), KRA PAYE bands (Finance Act 2023 bands,
   unchanged for 2026), SHA/SHIF and Affordable Housing Levy guidance. NSSF, SHIF and the housing levy are deducted
   before PAYE is worked out.
   >>> Re-check these every February (NSSF limits step up) and after every Finance Act. A wrong figure here changes
   real salaries. Worked check: gross 100,000 -> NSSF 6,000, SHIF 2,750, AHL 1,500, PAYE 19,308.35. */
window.GARGO_PAYROLL = Object.freeze({
  verified: '2026-10-22',
  nssfRate: 0.06,            // employee share, matched by employer
  nssfLower: 9000,           // Lower Earnings Limit (Tier I)
  nssfUpper: 108000,         // Upper Earnings Limit (Tier II); max employee contribution = 6,480
  shifRate: 0.0275,          // SHIF: 2.75% of gross, no cap
  shifMin: 300,              // SHIF minimum per month
  housingRate: 0.015,        // Affordable Housing Levy: 1.5% of gross (employer matches)
  personalRelief: 2400,      // per month
  payeBands: Object.freeze([ // [band width, rate]
    [24000, 0.10], [8333, 0.25], [467667, 0.30], [300000, 0.325], [Infinity, 0.35],
  ]),
});