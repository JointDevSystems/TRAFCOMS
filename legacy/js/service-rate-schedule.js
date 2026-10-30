window.SERVICE_RATE_SCHEDULE = {
  currency: "USD",
  services: {
    lolo: {
      label: "LOLO (Lift On / Lift Off) \u2014 Empty Container",
      unit: "per move",
      rates: { "20ft": 30, "40ft": 50 }
    },
    loloBatch6: {
      label: "Empty Container Handling \u2014 Batch of 6 Moves",
      unit: "per move (batches of 6+)",
      rates: { "20ft": 25, "40ft": 50 }
    },
    serviceCharge: {
      label: "Service Charge",
      unit: "per container",
      rates: { "20ft": 5, "40ft": 8 }
    },
    storage: {
      label: "Storage Charge",
      unit: "per day, after free period",
      freeDays: 35,
      rates: { "20ft": 2, "40ft": 3 }
    },
    transport: {
      label: "Transport \u2014 Depot \u21C4 Port",
      unit: "per trip",
      rates: { "20ft": 30, "40ft": 50 }
    },
    reefer: {
      label: "Reefer Container Handling",
      unit: "per move",
      rates: { "20ft": 25, "40ft": 50 }
    },
    portPreStack1: {
      label: "Port Pre-Stack 1 \u2014 Port Area Charges",
      unit: "per container",
      rates: { "20ft": 20, "40ft": 30 }
    },
    lastMileTransport: {
      label: "Last Mile Transport \u2014 Area Charges",
      unit: "per trip",
      rates: { "20ft": 10, "40ft": 20 }
    },
    photoCharges: {
      label: "Photo Charges",
      unit: "per request",
      rates: { "20ft": 3, "40ft": 3 },
      uponRequestOnly: true,
      note: "Upon request only \u2014 any gate-in photos requested by the client are charged separately."
    }
  },
  lineOverrides: {
    PIL: {
      currency: "KES",
      services: {
        lolo: {
          label: "LOLO (Lift On / Lift Off) \u2014 PIL",
          unit: "per lift",
          rates: { "20ft": 125, "40ft": 250 }
        },
        transport: {
          label: "Transport \u2014 Depot \u21C4 Terminal (PIL)",
          unit: "per trip, either direction",
          rates: { "20ft": 250, "40ft": 500 }
        }
      }
    }
  }
};
window.getOfficialLineRates = function(code) {
  const sched = window.SERVICE_RATE_SCHEDULE;
  const override = sched.lineOverrides[code];
  const lolo = override && override.services && override.services.lolo || sched.services.lolo;
  const currency = override && override.currency || sched.currency;
  return {
    currency,
    rate20: lolo.rates["20ft"],
    rate40: lolo.rates["40ft"],
    rateHC: lolo.rates["40ft"]
  };
};
