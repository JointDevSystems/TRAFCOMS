"use strict";
(function() {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const norm = (c) => String(c == null ? "" : c).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const COMPANY = { name: "GARGO HAVEN DEPOT LTD", addr: "P.O. Box 3291 - 80100, Refinery Road, Changamwe, Mombasa", tel: "+254 116307751 / +254 108613789", mail: "info@gargohavendepot.co.ke" };
  const ALIASES = {
    eir: ["eirNumber", "eirNo", "eir"],
    shipper: ["shipper", "shipperName", "customer", "client"],
    reference: ["reference", "referenceNo", "bookingRef", "bookingNo", "booking", "releaseOrderNo"],
    container: ["container", "containerNo"],
    line: ["line", "shippingLine", "agent", "agentLine"],
    destination: ["finalDestination", "destination", "pod", "portOfDischarge"],
    releaseOrder: ["releaseOrderNo", "releaseOrder", "roNo"],
    releaseDate: ["releaseOrderDate", "roDate", "releaseDate"],
    transporter: ["transporter", "haulier"],
    truck: ["truckRegText", "truckReg", "truckNo", "truck"],
    trailer: ["trailerNo", "trailer", "trailer_no"],
    driver: ["driverNameText", "driverName", "driver"],
    driverId: ["driverIdNumber", "driverId", "idNo", "id_no"],
    preparedBy: ["preparedBy", "compiledBy", "createdByName", "clerk", "user"],
    releasingClerk: ["releasingClerk", "loadingClerk", "releasedBy"],
    remarks: ["remarks", "remark", "notes"],
    booking: ["bookingNo", "bookingRef", "booking", "bookingNumber"],
    shipperOrder: ["shippersOrderNo", "shipperOrderNo", "shipperOrder", "shippersOrder"],
    cargoType: ["outwardType", "commodity", "workType"],
    iso: ["iso", "isoCode", "isoType"],
    size: ["size", "ctype", "csize"],
    type: ["type_", "cType", "containerType", "ctypeClass", "cont_type"],
    vessel: ["vessel", "vesselName"],
    voyage: ["voyage", "voy", "voyNo", "voyageNo"],
    mtwt: ["mtwt", "maxTare", "maxTareWeight", "tare", "tareWeight"],
    mgwt: ["mgwt", "maxGross", "maxGrossWeight", "grossWeight", "maxgross"],
    csc: ["csc", "cscApproval", "cscPlate"],
    date: ["date", "movementAt", "createdAt"]
  };
  const pick = (rec, key) => {
    if (!rec) return "";
    const srcs = [rec, rec.custom || {}, rec.survey || {}];
    for (const a of ALIASES[key] || []) for (const s of srcs) {
      const v = s[a];
      if (v !== void 0 && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fdate = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return String(d.getDate()).padStart(2, "0") + "-" + MON[d.getMonth()] + "-" + d.getFullYear();
  };
  const ftime = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d) || !/[T ]\d\d:\d\d/.test(String(v))) return "";
    return d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", hour12: true });
  };
  const kg = (v) => {
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    return n ? String(Math.round(n)) : String(v || "");
  };
  function surveyOf(out) {
    const k = norm(pick(out, "container"));
    const rows = (state.db.interchange || []).filter((i) => norm(i.container) === k && (i.type === "Gate-In" || i.type === "Depot-In"));
    rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return rows[0] || null;
  }
  function reserveOf(out) {
    const k = norm(pick(out, "container"));
    const db = state.db || {};
    for (const n of ["repatReserve", "repatReserves", "repat", "reserve"]) {
      const hit = (db[n] || []).find((r) => norm(r.container || r.containerNo) === k);
      if (hit) return hit;
    }
    return null;
  }
  function kindOf(rec, force) {
    if (force === "repat" || force === "export") return force;
    const t = String(pick(rec, "cargoType") + " " + (rec && rec.remarks || "")).toLowerCase();
    return /shipper|export/.test(t) ? "export" : "repat";
  }
  function gather(out, force) {
    const sv = surveyOf(out) || {}, rr = reserveOf(out) || {};
    const merged = Object.assign({}, rr, out);
    const kind = kindOf(merged, force), g = (k) => pick(merged, k);
    const s = (k) => pick(sv, k);
    const line = g("line");
    let lineName = line;
    try {
      const l = (state.db.shippingLines || []).find((x) => x.id === line);
      if (l) lineName = l.name || l.code || line;
    } catch (e) {
    }
    const when = out.date || rr.date;
    return {
      kind,
      refLabel: kind === "export" ? "Shipper's order no." : "Reference no",
      eir: g("eir"),
      shipper: g("shipper"),
      reference: kind === "export" ? g("shipperOrder") || g("releaseOrder") || g("reference") : g("reference") || g("releaseOrder"),
      date: fdate(when),
      time: ftime(when),
      container: norm(g("container")),
      line: lineName,
      destination: g("destination"),
      releaseOrder: g("releaseOrder"),
      releaseDate: fdate(g("releaseDate")),
      iso: s("iso") || g("iso"),
      size: (s("size") || g("size")).replace(/[^\d]/g, "").slice(0, 2),
      type: s("type") || g("type"),
      vessel: s("vessel") || g("vessel"),
      voyage: s("voyage") || g("voyage"),
      mtwt: kg(s("mtwt") || g("mtwt")),
      mgwt: kg(s("mgwt") || g("mgwt")),
      csc: s("csc") || g("csc"),
      transporter: g("transporter"),
      truck: [g("truck"), g("trailer")].filter(Boolean).join("/"),
      driver: g("driver"),
      driverId: g("driverId"),
      prepared: g("preparedBy") || state.profile && state.profile.name || "",
      clerk: g("releasingClerk"),
      remarks: g("remarks") || (kind === "export" ? g("booking") : "REPAT"),
      inDate: fdate(sv.date),
      inEir: pick(sv, "eir"),
      inVessel: s("vessel"),
      inVoyage: s("voyage")
    };
  }
  function logoUrl() {
    try {
      return new URL("icons/gargo-logo.png", document.baseURI.replace(/legacy\/.*$/, "")).href;
    } catch (e) {
      return "icons/gargo-logo.png";
    }
  }
  const WM = window.GargoWatermark = {
    css() {
      return '.gx-wm{position:fixed;left:0;top:0;right:0;bottom:0;z-index:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:none;transform:rotate(-24deg);opacity:.085;-webkit-print-color-adjust:exact;print-color-adjust:exact}.gx-wm img{width:300px;max-width:55%;height:auto}.gx-wm b{font:800 38px/1 Georgia,"Times New Roman",serif;letter-spacing:5px;color:#7a5c0c;white-space:nowrap}.gx-wm~*{position:relative;z-index:1}';
    },
    html() {
      return '<div class="gx-wm" aria-hidden="true"><img src="' + esc(logoUrl()) + '" alt=""><b>GARGO HAVEN DEPOT LTD</b></div>';
    },
    /* jsPDF: call on every page right after addPage()/at start, BEFORE drawing the content, so it sits behind it */
    pdf(doc) {
      try {
        const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
        const GS = doc.GState ? new doc.GState({ opacity: 0.08 }) : null;
        if (GS) doc.setGState(GS);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(34);
        doc.setTextColor(122, 92, 12);
        doc.text(COMPANY.name, w / 2, h / 2, { align: "center", angle: 24 });
        if (WM._img) {
          const iw = w * 0.5, ih = iw * (WM._ih / WM._iw || 0.5);
          doc.addImage(WM._img, "PNG", (w - iw) / 2, h / 2 - ih - 30, iw, ih);
        }
        if (GS) doc.setGState(new doc.GState({ opacity: 1 }));
        doc.setTextColor(0, 0, 0);
      } catch (e) {
        console.warn("watermark", e);
      }
    },
    /* preload the logo as a data URL for jsPDF */
    preload() {
      if (WM._img || WM._busy) return;
      WM._busy = true;
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = im.naturalWidth;
          c.height = im.naturalHeight;
          c.getContext("2d").drawImage(im, 0, 0);
          WM._img = c.toDataURL("image/png");
          WM._iw = c.width;
          WM._ih = c.height;
        } catch (e) {
        }
        WM._busy = false;
      };
      im.onerror = () => {
        WM._busy = false;
      };
      im.src = logoUrl();
    }
  };
  try {
    document.addEventListener("DOMContentLoaded", () => WM.preload());
  } catch (e) {
  }
  const CSS = '@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}html,body{margin:0;background:#e9e6dc}body{font:12px/1.35 "Segoe UI",Roboto,Arial,sans-serif;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.gx-page{width:190mm;min-height:277mm;margin:10px auto;background:#fff;padding:9mm 9mm 8mm;display:flex;flex-direction:column;position:relative;overflow:hidden}.hd{display:flex;align-items:center;gap:16px;padding-bottom:10px;border-bottom:3px solid #b2830a;margin-bottom:10px}.hd img{height:74px;width:auto}.hd h1{margin:0;font:800 25px/1.1 Georgia,"Times New Roman",serif;letter-spacing:1px;color:#14213d}.hd p{margin:3px 0 0;font-size:11px;color:#444}.hd .tl{font-weight:600}.ti{display:grid;grid-template-columns:1fr auto;border:1.5px solid #14213d;background:#14213d;color:#fff}.ti div{padding:8px 12px;font:700 13px var(--f,inherit);letter-spacing:.3px}.ti .no{background:#b2830a;color:#fff;font-size:15px;min-width:210px;text-align:right}.ti .no small{font-weight:600;font-size:10.5px;margin-right:8px;opacity:.9}.bx{display:grid;border:1px solid #14213d;border-top:0}.bx>div{padding:5px 9px 6px;border-right:1px solid #cdb872;min-height:40px;min-width:0}.bx>div:last-child{border-right:0}.bx+.bx{border-top:1px solid #cdb872}label{display:block;font:700 9.5px/1.2 Arial,sans-serif;letter-spacing:.5px;color:#7a5c0c;text-transform:uppercase;margin-bottom:3px}.v{font:600 13px/1.3 Arial,sans-serif;overflow-wrap:anywhere;min-height:15px}.big{font:800 17px/1.2 "Courier New",monospace;letter-spacing:1.5px;color:#14213d}.r1{grid-template-columns:2.2fr 1.5fr 1fr .9fr}.r2{grid-template-columns:1.5fr 1.5fr}.r3{grid-template-columns:1.6fr 1.3fr 1fr}.r4{grid-template-columns:.9fr .6fr .6fr 1.7fr 1fr .9fr .9fr 1.4fr}.r5{grid-template-columns:1.2fr 1.6fr 1.2fr 1fr .8fr}.r6{grid-template-columns:1fr 1fr}.r7{grid-template-columns:1fr 1fr}.stamp{min-height:62px}.nb{margin:12px 0 0;padding:9px 12px;border-left:4px solid #b2830a;background:#faf6e8;font:700 11px/1.5 Arial,sans-serif;color:#3a2f0b}.sp{flex:1}.in{border:1px solid #14213d;display:grid;grid-template-columns:repeat(4,1fr);margin-top:14px}.in .h{grid-column:1/-1;background:#14213d;color:#fff;padding:5px 10px;font:700 10.5px Arial;letter-spacing:.6px}.in div.c{padding:7px 10px;text-align:center;border-right:1px solid #cdb872;border-top:1px solid #cdb872}.in div.c:last-child{border-right:0}.in .c label{text-align:center}.gx-page .gx-wm{position:absolute;opacity:.14}.gx-page>*:not(.gx-wm){position:relative;z-index:1}.ft{margin-top:8px;text-align:center;font-size:9.5px;color:#777}.bar{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:8px;background:#14213d}.bar button{padding:8px 20px;border:1px solid #b2830a;border-radius:8px;background:#b2830a;color:#fff;font:700 13px Arial;cursor:pointer}.bar button.g{background:transparent;color:#e5c766}@media print{html,body{background:#fff}.bar{display:none}.gx-page{margin:0;width:auto;min-height:0;height:275mm;padding:0;overflow:hidden}}';
  function html(rec, kind) {
    const d = gather(rec, kind), lg = esc(logoUrl());
    const c = (l, v, cls) => "<div><label>" + l + '</label><div class="v ' + (cls || "") + '">' + esc(v) + "</div></div>";
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + (d.kind === "export" ? "Export" : "Repat") + " outward EIR " + esc(d.eir) + "</title><style>" + CSS + WM.css() + '</style></head><body><div class="bar"><button onclick="print()">Print</button><button class="g" onclick="close()">Close</button></div><div class="gx-page">' + WM.html() + '<div class="hd"><img src="' + lg + '" alt=""><div><h1>' + COMPANY.name + "</h1><p>" + esc(COMPANY.addr) + '</p><p class="tl">Tel: ' + esc(COMPANY.tel) + " &nbsp;|&nbsp; Email: " + esc(COMPANY.mail) + '</p></div></div><div class="ti"><div>CONTAINER INTERCHANGE REPORT / RECEIPT</div><div class="no"><small>OUTWARD EIR NO.</small>' + esc(d.eir) + '</div></div><div class="bx r1">' + c("Shipper name", d.shipper) + c(d.refLabel, d.reference) + c("Date", d.date) + c("Time", d.time) + '</div><div class="bx r2">' + c("Container no.", d.container, "big") + c("Agent / Line", d.line) + '</div><div class="bx r3">' + c("Final destination", d.destination) + c("Release order no.", d.releaseOrder) + c("R. order date", d.releaseDate) + '</div><div class="bx r4">' + c("ISO", d.iso) + c("Size", d.size) + c("Type", d.type) + c("Vessel name", d.vessel) + c("Voy no.", d.voyage) + c("MTWT (kg)", d.mtwt) + c("MGWT (kg)", d.mgwt) + c("CSC approval", d.csc) + '</div><div class="bx r5">' + c("Transporter", d.transporter) + c("Truck / Trailer no.", d.truck) + c("Driver name", d.driver) + c("ID / Driving no.", d.driverId) + '<div class="stamp"><label>Sign.</label></div></div><div class="bx r6">' + c("EIR prepared / compiled by", d.prepared) + c("Loading / releasing clerk", d.clerk) + '</div><div class="bx r7"><div class="stamp"><label>Remarks</label><div class="v">' + esc(d.remarks) + '</div></div><div class="stamp"><label>GHD sign / stamp</label></div></div><div class="nb">NB: CONTAINER RELEASED / RECEIVED IN GOOD CONDITION. IT IS THE RESPONSIBILITY OF THE SHIPPER / TRANSPORTER / AGENT FOR ANY LOSS / DAMAGE OR CLEANLINESS OF THE EQUIPMENT AFTER IT HAS LEFT THE DEPOT.</div><div class="sp"></div><div class="in"><div class="h">INWARD DETAILS (FROM SURVEY)</div><div class="c"><label>Date in</label><div class="v">' + esc(d.inDate) + '</div></div><div class="c"><label>EIR in</label><div class="v">' + esc(d.inEir) + '</div></div><div class="c"><label>Vessel in</label><div class="v">' + esc(d.inVessel) + '</div></div><div class="c"><label>Voyage in</label><div class="v">' + esc(d.inVoyage) + '</div></div></div><div class="ft">' + esc(COMPANY.name) + " &middot; Computer generated &middot; " + esc((/* @__PURE__ */ new Date()).toLocaleString("en-KE")) + "</div></div><script>window.onload=function(){var i=document.images,n=i.length,k=0;function go(){if(++k>=n)setTimeout(function(){window.focus()},50)}for(var j=0;j<n;j++){if(i[j].complete)go();else{i[j].onload=go;i[j].onerror=go}}}<\/script></body></html>";
  }
  window.GargoOutwardEIR = {
    html,
    gather,
    kindOf,
    /* kind is optional: 'repat' | 'export'. Left out, it is read from the record. */
    open(idOrRec, kind) {
      const rec = typeof idOrRec === "object" ? idOrRec : (state.db.interchange || []).find((i) => i.id === idOrRec);
      if (!rec) return toast("Outward record not found", "error");
      const w = window.open("", "_blank");
      if (!w) return toast("Allow pop-ups to open the EIR", "warning");
      w.document.open();
      w.document.write(html(rec, kind));
      w.document.close();
    }
  };
})();
