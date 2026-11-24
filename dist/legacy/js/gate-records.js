"use strict";
(function() {
  const TABLE = "gate_records", IMPORTS = "gate_record_imports", PAGE = 50, MAPKEY = "gargo-gate-rec-maps";
  const $ = (id) => document.getElementById(id);
  const sb = () => typeof supabase !== "undefined" && supabase || window.ghSupabase;
  const R = window.GateRecords = {};
  const S = { rows: [], total: 0, c20: 0, c40: 0, flagged: 0, span: null, q: "", from: "", to: "", shift: "", dir: "", flag: false, limit: PAGE, busy: false, err: "", built: false };
  let W = null;
  const role = () => {
    try {
      return state.profile && state.profile.role || "";
    } catch (e) {
      return "";
    }
  };
  const can = () => {
    try {
      return isAdmin() || canSeeSection("gatesecurity");
    } catch (e) {
      return false;
    }
  };
  const canImport = () => {
    try {
      return isAdmin() || role() === "ops" || role() === "clerk";
    } catch (e) {
      return false;
    }
  };
  const canFix = () => {
    try {
      return isAdmin();
    } catch (e) {
      return false;
    }
  };
  const nk = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const alnum = (s) => String(s == null ? "" : s).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const str = (v) => v == null ? "" : String(v).replace(/\s+/g, " ").trim();
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const FIELDS = [
    { k: "date", l: "Date", need: true, syn: ["date", "day", "gatedate", "movementdate", "recorddate", "dateout", "datein", "dateofmovement"] },
    { k: "time", l: "Time", syn: ["time", "timeout", "timein", "timeofmovement", "gatetime", "timeoutofgate"] },
    { k: "shift", l: "Shift", syn: ["shift"] },
    { k: "direction", l: "Movement (in / out)", syn: ["direction", "movement", "inout", "gatemovement", "movementtype"] },
    { k: "driver", l: "Driver's name", syn: ["driver", "drivername", "driversname", "names", "name", "driverfullname"] },
    { k: "phone", l: "Phone", syn: ["phone", "phoneno", "phonenumber", "tel", "telephone", "mobile", "mobileno", "contact"] },
    { k: "id_no", l: "Driver ID number", syn: ["idno", "id", "idnumber", "nationalid", "driverid", "identification", "idnoofdriver"] },
    { k: "truck", l: "Truck / vehicle no.", syn: ["truck", "truckno", "trucknumber", "vehicle", "vehicleno", "vehiclenumber", "registration", "regno", "reg", "plate", "platenumber", "vehiclereg"] },
    { k: "trailer", l: "Trailer no.", syn: ["trailer", "trailerno", "trailernumber"] },
    { k: "company", l: "Company / transporter", syn: ["company", "companystandardised", "companystandardized", "transporter", "haulier", "hauler", "customer"] },
    { k: "company_raw", l: "Company (as written)", syn: ["companyaswritten", "companyraw", "aswritten", "originalcompany"] },
    { k: "container", l: "Container no.", syn: ["container", "containerno", "containernumber", "cntr", "cntrno", "ctr", "ctrno"] },
    { k: "eir", l: "EIR no.", syn: ["eir", "eirno", "eirnumber", "eirref"] },
    { k: "line", l: "Shipping line", syn: ["line", "shippingline", "linetype", "carrier", "lineoperator", "linecode"] },
    { k: "size", l: "Size (ft)", syn: ["size", "sizeft", "ft", "containersize", "length"] },
    { k: "needs_check", l: "Needs check (flag)", syn: ["needscheck", "check", "flag", "flagged", "tocheck"] },
    { k: "notes", l: "Notes", syn: ["notes", "note", "remarks", "remark", "comment", "comments"] },
    { k: "source", l: "Source / page ref", syn: ["sourcepage", "source", "page", "sourceref"] }
  ];
  const SYNSET = /* @__PURE__ */ new Set();
  FIELDS.forEach((f) => f.syn.forEach((s) => SYNSET.add(s)));
  const validYMD = (y, m, d) => {
    if (y < 2e3 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
    return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
  };
  const iso = (y, m, d) => y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  function parseDate(v, dayFirst) {
    if (v == null || v === "") return null;
    if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === "number") {
      if (v < 2e4 || v > 8e4) return null;
      const d = new Date(Math.round((Math.floor(v) - 25569) * 864e5));
      return validYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) ? iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) : null;
    }
    const s = String(v).trim();
    let m;
    if (m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s)) return validYMD(+m[1], +m[2], +m[3]) ? iso(+m[1], +m[2], +m[3]) : null;
    if (m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s)) {
      let a = +m[1], b = +m[2], y = +m[3];
      if (y < 100) y += 2e3;
      let d = dayFirst === false ? b : a, mo = dayFirst === false ? a : b;
      if (a > 12) {
        d = a;
        mo = b;
      } else if (b > 12) {
        d = b;
        mo = a;
      }
      return validYMD(y, mo, d) ? iso(y, mo, d) : null;
    }
    if (m = /^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/.exec(s)) {
      const mo = MON.findIndex((x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase()) + 1;
      return mo && validYMD(+m[3], mo, +m[1]) ? iso(+m[3], mo, +m[1]) : null;
    }
    return null;
  }
  function parseTime(v) {
    if (v == null || v === "") return null;
    const hm = (h2, mi2) => h2 >= 0 && h2 < 24 && mi2 >= 0 && mi2 < 60 ? String(h2).padStart(2, "0") + ":" + String(mi2).padStart(2, "0") : null;
    if (v instanceof Date && !isNaN(v)) return hm(v.getHours(), v.getMinutes());
    if (typeof v === "number") {
      const f = v - Math.floor(v);
      if (f <= 0 && v !== 0) return null;
      const t = Math.round(f * 1440);
      return hm(Math.floor(t / 60) % 24, t % 60);
    }
    const m = /(\d{1,2})\s*[:.h]\s*(\d{2})(?:\s*[:.]\s*\d{2})?\s*([AaPp])?\.?\s*[Mm]?/.exec(String(v));
    if (!m) return null;
    let h = +m[1];
    const mi = +m[2];
    if (m[3]) {
      const pm = /p/i.test(m[3]);
      if (h > 12) return null;
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
    return hm(h, mi);
  }
  const fmtCont = (c) => /^[A-Z]{4}\d{7}$/.test(c) ? c.slice(0, 4) + " " + c.slice(4, 10) + "-" + c.slice(10) : c;
  const LETTER = (() => {
    const m = {};
    let n = 10;
    for (let i = 0; i < 26; i++) {
      if (n % 11 === 0) n++;
      m[String.fromCharCode(65 + i)] = n++;
    }
    return m;
  })();
  function isoOk(c) {
    if (!/^[A-Z]{4}\d{7}$/.test(c)) return false;
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += (i < 4 ? LETTER[c[i]] : +c[i]) * Math.pow(2, i);
    return sum % 11 % 10 === +c[10];
  }
  const fmtTruck = (s) => {
    s = alnum(s);
    let m;
    if (m = /^(K[A-Z]{2})(\d{3}[A-Z])$/.exec(s)) return m[1] + " " + m[2];
    if (m = /^(Z[A-Z])(\d{3,4}[A-Z]?)$/.exec(s)) return m[1] + " " + m[2];
    return s;
  };
  const fmtPlate = (s) => {
    const t = str(s).toUpperCase();
    const a = alnum(t);
    return /^(K[A-Z]{2}\d{3}[A-Z]|Z[A-Z]\d{3,4}[A-Z]?)$/.test(a) ? fmtTruck(a) : t;
  };
  const phoneOf = (v) => {
    let d = typeof v === "number" ? String(Math.round(v)) : String(v == null ? "" : v);
    d = d.replace(/\D/g, "");
    if (/^254[17]\d{8}$/.test(d)) d = "0" + d.slice(3);
    if (/^[17]\d{8}$/.test(d)) d = "0" + d;
    return d;
  };
  const idOf = (v) => typeof v === "number" ? String(Math.round(v)) : str(v);
  const shiftOf = (v) => {
    const s = str(v);
    return /^n/i.test(s) ? "Night" : /^d/i.test(s) ? "Day" : s;
  };
  const dirOf = (v) => {
    const s = str(v).toLowerCase();
    return /^(both|in[\s_-]*(and|&|\/|\+)?[\s_-]*out)/.test(s) ? "in_out" : /^(in|gate-?in|entry|enter|inward)/.test(s) ? "in" : /^(out|gate-?out|exit|outward|release)/.test(s) ? "out" : "";
  };
  const dirLabel = (d) => d === "in" ? "In" : d === "in_out" ? "In & Out" : "Out";
  const yes = (v) => /^(y|yes|true|1|x|check)/i.test(str(v));
  const colLetter = (i) => {
    let s = "", n = i + 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const fmtDay = (d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || "");
    return m ? m[3] + " " + MON[+m[2] - 1] + " " + m[1] : d || "";
  };
  function headerScore(row) {
    let n = 0;
    (row || []).forEach((c) => {
      const k = nk(c);
      if (k && SYNSET.has(k)) n++;
    });
    return n;
  }
  function findHeader(grid) {
    let best = 0, at = 0;
    for (let i = 0; i < Math.min(grid.length, 25); i++) {
      const s = headerScore(grid[i]);
      if (s > best) {
        best = s;
        at = i;
      }
    }
    return { row: at, score: best };
  }
  const SNIFF = {
    container: (v) => /^[A-Z]{4}\d{7}$/.test(alnum(v)),
    truck: (v) => /^K[A-Z]{2}\d{3}[A-Z]$/.test(alnum(v)),
    trailer: (v) => /^Z[A-Z]\d{3,4}[A-Z]?$/.test(alnum(v)),
    phone: (v) => /^0?[17]\d{8}$/.test(phoneOf(v).replace(/^0/, "")) && phoneOf(v).length === 10,
    id_no: (v) => /^\d{7,8}$/.test(idOf(v)),
    date: (v) => !!parseDate(v, true),
    time: (v) => typeof v === "number" && v < 1 && v > 0 || /^\s*\d{1,2}:\d{2}/.test(String(v)),
    size: (v) => /^(20|40|45)$/.test(String(v).trim())
  };
  function autoMap(headers, rows) {
    const cand = [];
    headers.forEach((h, i) => {
      const k = nk(h);
      if (!k) return;
      FIELDS.forEach((f) => {
        let s = 0;
        if (f.syn.indexOf(k) > -1) s = 10;
        else if (f.syn.some((x) => x.length >= 4 && k.indexOf(x) > -1)) s = 5;
        if (s) cand.push({ i, k: f.k, s });
      });
    });
    const map = {}, used = {};
    const take = (list) => {
      list.sort((a, b) => b.s - a.s || a.i - b.i).forEach((c) => {
        if (map[c.k] !== void 0 || used[c.i]) return;
        map[c.k] = c.i;
        used[c.i] = 1;
      });
    };
    take(cand);
    const sn = [];
    headers.forEach((h, i) => {
      if (used[i]) return;
      const vals = [];
      for (let r = 0; r < rows.length && vals.length < 60; r++) {
        const v = rows[r][i];
        if (v !== "" && v != null) vals.push(v);
      }
      if (vals.length < 3) return;
      Object.keys(SNIFF).forEach((k) => {
        if (map[k] !== void 0) return;
        const hit = vals.filter(SNIFF[k]).length / vals.length;
        if (hit >= 0.6) sn.push({ i, k, s: 4 + hit });
      });
    });
    take(sn);
    return map;
  }
  function dayFirstOf(rows, idx) {
    if (idx == null || idx < 0) return true;
    for (let r = 0; r < rows.length; r++) {
      const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.]\d{2,4}/.exec(String(rows[r][idx] == null ? "" : rows[r][idx]).trim());
      if (m) {
        if (+m[1] > 12) return true;
        if (+m[2] > 12) return false;
      }
    }
    return true;
  }
  function build(grid, hdrRow, map, opt) {
    const headers = (grid[hdrRow] || []).map((h) => str(h)), rows = grid.slice(hdrRow + 1);
    const at = (row, k) => {
      const i = map[k];
      return i === void 0 || i < 0 ? "" : row[i] == null ? "" : row[i];
    };
    const mapped = {};
    Object.keys(map).forEach((k) => {
      if (map[k] >= 0) mapped[map[k]] = 1;
    });
    const out = { records: [], skipped: [], total: 0, blank: 0, flagged: 0, badCont: 0, from: "", to: "" }, seen = {};
    let lastDate = "";
    rows.forEach((row, n) => {
      if (!row || !row.some((c) => c !== "" && c != null && String(c).trim() !== "")) {
        out.blank++;
        return;
      }
      out.total++;
      const rowNo = hdrRow + n + 2;
      let date = parseDate(at(row, "date"), opt.dayFirst);
      if (!date && opt.fillDown && lastDate && (at(row, "date") === "" || at(row, "date") == null)) date = lastDate;
      const truck = fmtPlate(at(row, "truck")), cont = alnum(at(row, "container")), driver = str(at(row, "driver"));
      if (!truck && !cont && !driver) {
        out.skipped.push({ row: rowNo, why: "no truck, container or driver" });
        return;
      }
      if (!date) {
        out.skipped.push({ row: rowNo, why: "no valid date" });
        return;
      }
      lastDate = date;
      const extra = {};
      headers.forEach((h, i) => {
        if (mapped[i]) return;
        const v = row[i];
        if (v === "" || v == null) return;
        const t = v instanceof Date ? v.toISOString().slice(0, 10) : str(v);
        if (t) extra[h || "Column " + colLetter(i)] = t;
      });
      const tRaw = at(row, "time"), time = parseTime(tRaw);
      if (!time && str(tRaw)) extra["Time (as written)"] = str(tRaw);
      const shiftRaw = str(at(row, "shift")), shift = shiftOf(shiftRaw);
      if (shiftRaw && shiftRaw !== shift) extra["Shift (as written)"] = shiftRaw;
      let eir = str(at(row, "eir")), line = str(at(row, "line"));
      if (eir && !line) {
        let m;
        if (m = /^(\d+)\s*[-\/]?\s*([A-Za-z][A-Za-z ]*)$/.exec(eir)) {
          eir = m[1];
          line = m[2].trim().toUpperCase();
        } else if (/^[A-Za-z][A-Za-z ]*$/.test(eir)) {
          line = eir.toUpperCase();
          eir = "";
        }
      }
      const sz = parseInt(String(at(row, "size")).replace(/[^\d]/g, ""), 10);
      let dir = map.direction >= 0 && map.direction !== void 0 ? dirOf(at(row, "direction")) : "";
      dir = dir || opt.dir || "out";
      const ok = cont ? isoOk(cont) : true;
      if (cont && !ok) out.badCont++;
      const flagged = map.needs_check !== void 0 && map.needs_check >= 0 ? yes(at(row, "needs_check")) : !ok;
      if (flagged) out.flagged++;
      const rec = {
        record_date: date,
        time_at: time,
        shift: shift || null,
        direction: dir,
        driver_name: driver || null,
        phone: phoneOf(at(row, "phone")) || null,
        id_no: idOf(at(row, "id_no")) || null,
        truck_no: truck || null,
        trailer_no: fmtPlate(at(row, "trailer")) || null,
        company: str(at(row, "company")) || null,
        company_raw: str(at(row, "company_raw")) || null,
        container_no: cont || null,
        eir_no: eir || null,
        line: line || null,
        size_ft: isFinite(sz) ? sz : null,
        needs_check: flagged,
        notes: str(at(row, "notes")) || null,
        source_ref: str(at(row, "source")) || null,
        extra
      };
      let key = [date, time || "", alnum(truck), cont].join("|");
      if (!cont) key += "|" + nk(driver) + "|" + alnum(eir);
      seen[key] = (seen[key] || 0) + 1;
      rec.row_key = seen[key] > 1 ? key + "#" + seen[key] : key;
      rec.search_key = [rec.truck_no, rec.trailer_no, rec.container_no, rec.eir_no, rec.id_no, rec.phone, rec.driver_name, rec.company, rec.company_raw, rec.line].map(alnum).join("|").toLowerCase();
      if (!out.from || date < out.from) out.from = date;
      if (!out.to || date > out.to) out.to = date;
      out.records.push(rec);
    });
    return out;
  }
  const sigOf = (headers) => headers.map(nk).filter(Boolean).join(".");
  const maps = () => {
    try {
      return JSON.parse(localStorage.getItem(MAPKEY) || "{}");
    } catch (e) {
      return {};
    }
  };
  const saveMap = (headers, map) => {
    try {
      const all = maps(), m = {};
      Object.keys(map).forEach((k) => {
        if (map[k] >= 0) m[k] = headers[map[k]];
      });
      all[sigOf(headers)] = m;
      const keys = Object.keys(all);
      if (keys.length > 20) delete all[keys[0]];
      localStorage.setItem(MAPKEY, JSON.stringify(all));
    } catch (e) {
    }
  };
  const savedMap = (headers) => {
    const m = maps()[sigOf(headers)];
    if (!m) return null;
    const out = {};
    Object.keys(m).forEach((k) => {
      const i = headers.findIndex((h) => h === m[k]);
      if (i > -1) out[k] = i;
    });
    return Object.keys(out).length ? out : null;
  };
  function applyF(q) {
    if (S.from) q = q.gte("record_date", S.from);
    if (S.to) q = q.lte("record_date", S.to);
    if (S.shift) q = q.eq("shift", S.shift);
    if (S.dir) q = q.eq("direction", S.dir);
    if (S.flag) q = q.eq("needs_check", true);
    const t = alnum(S.q).toLowerCase();
    if (t) q = q.ilike("search_key", "%" + t + "%");
    return q;
  }
  const missingTable = (e) => !!e && /does not exist|schema cache|could not find the table|relation/i.test(String(e.message || e));
  async function load() {
    if (!sb() || !can()) return;
    S.busy = true;
    S.err = "";
    try {
      const head = (k, v) => applyF(sb().from(TABLE).select("id", { count: "exact", head: true }).eq(k, v));
      const [list, c20, c40, fl] = await Promise.all([
        applyF(sb().from(TABLE).select("*", { count: "exact" })).order("record_date", { ascending: false }).order("time_at", { ascending: false, nullsFirst: false }).order("id").range(0, S.limit - 1),
        head("size_ft", 20),
        head("size_ft", 40),
        head("needs_check", true)
      ]);
      if (list.error) throw list.error;
      S.rows = list.data || [];
      S.total = list.count || 0;
      S.c20 = c20.count || 0;
      S.c40 = c40.count || 0;
      S.flagged = fl.count || 0;
      if (!S.span) {
        const [a, b] = await Promise.all([sb().from(TABLE).select("record_date").order("record_date", { ascending: true }).limit(1), sb().from(TABLE).select("record_date").order("record_date", { ascending: false }).limit(1)]);
        if (a.data && a.data[0] && b.data && b.data[0]) S.span = [a.data[0].record_date, b.data[0].record_date];
      }
    } catch (e) {
      S.err = missingTable(e) ? "setup" : navigator.onLine ? String(e && e.message || "Could not load") : "offline";
      console.warn("Gate records load failed:", e && e.message);
    } finally {
      S.busy = false;
    }
  }
  R.open = async function(hostId) {
    const host = $(hostId || "gsRecHost");
    if (!host) return;
    if (!can()) {
      host.innerHTML = '<div class="empty-state"><div class="empty-state-label">You do not have access to Gate Processes</div></div>';
      return;
    }
    if (!host.dataset.built) {
      host.dataset.built = "1";
      const imp = canImport();
      host.innerHTML = '<div class="gs-bar"><input class="gs-q" id="grQ" type="search" placeholder="Search truck, trailer, driver, container, company, EIR, ID\u2026" oninput="GateRecords.search()" autocomplete="off"/><label>From <input id="grFrom" type="date" onchange="GateRecords.search()"/></label><label>To <input id="grTo" type="date" onchange="GateRecords.search()"/></label><select id="grShift" onchange="GateRecords.search()"><option value="">All shifts</option><option>Day</option><option>Night</option></select><select id="grDir" onchange="GateRecords.search()"><option value="">All movements</option><option value="in">In only</option><option value="out">Out only</option><option value="in_out">In &amp; Out</option></select><label><input type="checkbox" id="grFlag" onchange="GateRecords.search()" style="min-height:0;width:auto"/> Needs check</label><span style="flex:1"></span><button type="button" class="action-btn ghost" onclick="GateRecords.exportXlsx()">\u2B07 Export</button>' + (canFix() ? '<button type="button" class="action-btn ghost" onclick="GateRecords.imports()">Imports</button>' : "") + (imp ? '<button type="button" class="action-btn" onclick="GateRecords.upload()">\u2B06 Upload Excel / CSV</button>' : "") + '</div><div class="gd-kpis" id="grKpis"></div><div id="grList"></div>';
    }
    await load();
    R.paint();
  };
  const cell = (t, sub) => esc(t) + (sub ? '<span class="gs-sub">' + sub + "</span>" : "");
  R.paint = function() {
    const list = $("grList"), kp = $("grKpis");
    if (!list) return;
    kp.innerHTML = '<div class="gd-kpi"><b>' + S.total.toLocaleString() + "</b><span>Records" + (S.q || S.from || S.to || S.shift || S.dir || S.flag ? " matching" : "") + '</span></div><div class="gd-kpi"><b>' + S.c40.toLocaleString() + '</b><span>40 ft</span></div><div class="gd-kpi"><b>' + S.c20.toLocaleString() + '</b><span>20 ft</span></div><div class="gd-kpi warn"><b>' + S.flagged.toLocaleString() + '</b><span>Need a check</span></div><div class="gd-kpi"><b style="font-size:15px">' + (S.span ? esc(fmtDay(S.span[0])) + "<br>to " + esc(fmtDay(S.span[1])) : "\u2014") + "</b><span>Archive covers</span></div>";
    if (S.err === "setup") {
      list.innerHTML = '<div class="gd-warn">The records tables do not exist yet. Run <b>gate-records.sql</b> in the Supabase SQL editor, then reopen this tab.</div>';
      return;
    }
    const warn = S.err ? '<div class="gd-warn">' + (S.err === "offline" ? "No connection. Records need the internet." : "Could not load: " + esc(S.err)) + "</div>" : "";
    if (!S.rows.length) {
      list.innerHTML = warn + '<div class="gd-empty">' + (S.total === 0 && !(S.q || S.from || S.to || S.shift || S.dir || S.flag) ? "No records yet." + (canImport() ? "<br>Use <b>Upload Excel / CSV</b> to add a gate log." : "") : "No records match.") + "</div>";
      return;
    }
    const dash = '<span class="gs-dim">\u2014</span>';
    list.innerHTML = warn + '<div class="table-wrap"><table class="data-table"><thead><tr><th>Date &amp; time</th><th>Move</th><th>Vehicle</th><th>Driver</th><th>Company</th><th>Container</th><th>Notes</th><th></th></tr></thead><tbody>' + S.rows.map((r) => "<tr" + (r.needs_check ? ' class="gr-flag"' : "") + '><td style="white-space:nowrap">' + esc(fmtDay(r.record_date)) + (r.time_at ? " " + esc(r.time_at) : "") + (r.shift ? '<span class="gs-sub">' + esc(r.shift) + "</span>" : "") + '</td><td><span class="gs-dir ' + esc(r.direction) + '">' + dirLabel(r.direction) + '</span></td><td><span class="gs-mono">' + (esc(r.truck_no) || dash) + "</span>" + (r.trailer_no ? '<span class="gs-sub">Trailer ' + esc(r.trailer_no) + "</span>" : "") + "</td><td>" + (esc(r.driver_name) || dash) + (r.phone || r.id_no ? '<span class="gs-sub">' + [r.phone, r.id_no ? "ID " + r.id_no : ""].filter(Boolean).map(esc).join(" \xB7 ") + "</span>" : "") + "</td><td>" + (esc(r.company) || dash) + (r.line || r.eir_no ? '<span class="gs-sub">' + [r.line, r.eir_no ? "EIR " + r.eir_no : ""].filter(Boolean).map(esc).join(" \xB7 ") + "</span>" : "") + '</td><td class="gs-mono">' + (esc(fmtCont(r.container_no || "")) || dash) + (r.size_ft ? '<span class="gs-sub">' + esc(r.size_ft) + " ft</span>" : "") + "</td><td>" + (r.needs_check ? '<span class="gs-tag">Check</span> ' : "") + esc(r.notes || "") + '</td><td style="white-space:nowrap"><button type="button" class="tbl-btn" onclick="GateRecords.details(\'' + esc(r.id) + "')\">Details</button>" + (canFix() ? ' <button type="button" class="tbl-btn" onclick="GateRecords.remove(\'' + esc(r.id) + "')\">Delete</button>" : "") + "</td></tr>").join("") + "</tbody></table></div>" + (S.rows.length < S.total ? '<div class="gs-more"><button type="button" class="action-btn ghost" onclick="GateRecords.more()">Show more (' + (S.total - S.rows.length).toLocaleString() + " left)</button></div>" : "");
  };
  let tm = 0;
  R.search = function() {
    clearTimeout(tm);
    tm = setTimeout(async () => {
      const v = (id) => $(id) ? $(id).value : "";
      S.q = v("grQ").trim();
      S.from = v("grFrom");
      S.to = v("grTo");
      S.shift = v("grShift");
      S.dir = v("grDir");
      S.flag = !!($("grFlag") && $("grFlag").checked);
      S.limit = PAGE;
      await load();
      R.paint();
    }, 300);
  };
  R.more = async function() {
    S.limit += PAGE;
    await load();
    R.paint();
  };
  R.reload = async function() {
    S.span = null;
    await load();
    R.paint();
  };
  R.details = function(id) {
    const r = S.rows.find((x) => x.id === id);
    if (!r) return;
    const row = (k, v) => v ? '<tr><td style="color:var(--text-3);padding:4px 14px 4px 0;white-space:nowrap">' + esc(k) + "</td><td>" + esc(v) + "</td></tr>" : "";
    const ex = r.extra && typeof r.extra === "object" ? Object.keys(r.extra).map((k) => row(k, r.extra[k])).join("") : "";
    openModal("Gate record", '<table style="font-size:13px;line-height:1.5">' + row("Date", fmtDay(r.record_date)) + row("Time", r.time_at) + row("Shift", r.shift) + row("Movement", dirLabel(r.direction)) + row("Truck", r.truck_no) + row("Trailer", r.trailer_no) + row("Driver", r.driver_name) + row("Phone", r.phone) + row("ID number", r.id_no) + row("Company", r.company) + row("Company (as written)", r.company_raw) + row("Container", fmtCont(r.container_no || "")) + row("EIR", r.eir_no) + row("Line", r.line) + row("Size", r.size_ft ? r.size_ft + " ft" : "") + row("Needs check", r.needs_check ? "Yes" : "") + row("Notes", r.notes) + row("Source", r.source_ref) + "</table>" + (ex ? '<div style="margin:14px 0 6px;font:600 12px var(--font-ui);color:var(--text-2)">Other columns from the file</div><table style="font-size:13px;line-height:1.5">' + ex + "</table>" : ""));
  };
  R.remove = async function(id) {
    if (!canFix()) return toast("Only an administrator can delete a record", "error");
    const r = S.rows.find((x) => x.id === id);
    if (!r) return;
    if (!confirm("Delete the record for " + (r.truck_no || r.container_no || "this movement") + " on " + fmtDay(r.record_date) + "? This cannot be undone.")) return;
    const { error } = await sb().from(TABLE).delete().eq("id", id);
    if (error) return toast("Could not delete: " + error.message, "error");
    toast("Record deleted", "success");
    R.reload();
  };
  R.exportXlsx = async function() {
    if (!navigator.onLine) return toast("You are offline.", "warning");
    try {
      toast("Preparing the export\u2026", "info", 2500);
      if (window.ensureExportLibs) await window.ensureExportLibs();
      const res = await fetchAllPaginated((a, b) => applyF(sb().from(TABLE).select("*")).order("record_date", { ascending: false }).order("time_at", { ascending: false, nullsFirst: false }).order("id").range(a, b));
      if (res.error) throw res.error;
      const extraKeys = [];
      res.data.forEach((r) => Object.keys(r.extra || {}).forEach((k) => {
        if (extraKeys.indexOf(k) < 0) extraKeys.push(k);
      }));
      const head = ["Date", "Time", "Shift", "Movement", "Truck No", "Trailer No", "Driver", "Phone", "ID No", "Company", "Company (as written)", "Container No", "EIR No", "Line", "Size (ft)", "Needs Check", "Notes", "Source"].concat(extraKeys);
      const aoa = [head].concat(res.data.map((r) => [r.record_date, r.time_at || "", r.shift || "", dirLabel(r.direction), r.truck_no || "", r.trailer_no || "", r.driver_name || "", r.phone || "", r.id_no || "", r.company || "", r.company_raw || "", fmtCont(r.container_no || ""), r.eir_no || "", r.line || "", r.size_ft || "", r.needs_check ? "Yes" : "No", r.notes || "", r.source_ref || ""].concat(extraKeys.map((k) => (r.extra || {})[k] || ""))));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Gate records");
      XLSX.writeFile(wb, "gate_records_" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".xlsx");
    } catch (e) {
      toast("Export failed: " + (e && e.message || "error"), "error");
    }
  };
  R.upload = function() {
    if (!canImport()) return toast("You are not allowed to upload gate records", "error");
    if (!navigator.onLine) return toast("You are offline. Uploading needs the internet.", "warning");
    W = null;
    openModal("Upload gate records", '<div id="grWiz"><div style="font-size:13px;line-height:1.6;color:var(--text-2)">Choose an Excel (.xlsx, .xls) or CSV file. Columns can be in any order and have any names. Gargo matches them for you and shows the result before anything is saved.</div><label class="gr-drop" id="grDrop"><input type="file" id="grFile" accept=".xlsx,.xls,.csv" onchange="GateRecords.pick(this)" style="display:none"/><b>Tap to choose a file</b><span>or drop it here</span></label></div>');
    const d = $("grDrop");
    if (d) {
      ["dragover", "dragenter"].forEach((ev) => d.addEventListener(ev, (e) => {
        e.preventDefault();
        d.classList.add("on");
      }));
      d.addEventListener("dragleave", () => d.classList.remove("on"));
      d.addEventListener("drop", (e) => {
        e.preventDefault();
        d.classList.remove("on");
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) R.pick({ files: [f] });
      });
    }
  };
  const wiz = (h) => {
    const el = $("grWiz");
    if (el) el.innerHTML = h;
  };
  R.pick = async function(inp) {
    const file = inp.files && inp.files[0];
    if (!file) return;
    wiz('<div class="gd-empty">Reading ' + esc(file.name) + "\u2026</div>");
    try {
      if (window.ensureExportLibs) await window.ensureExportLibs();
      if (!window.XLSX) throw new Error("The Excel reader could not load. Check the connection and try again.");
      const wb = /\.csv$/i.test(file.name) ? XLSX.read(await file.text(), { type: "string", raw: true }) : XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheets = {};
      let bestName = "", bestScore = -1, bestRows = -1;
      wb.SheetNames.forEach((n) => {
        const grid = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }), h = findHeader(grid);
        sheets[n] = { grid, hdr: h.row, score: h.score };
        if (h.score > bestScore || h.score === bestScore && grid.length > bestRows) {
          bestName = n;
          bestScore = h.score;
          bestRows = grid.length;
        }
      });
      W = { file, sheets, names: wb.SheetNames, fillDown: true, dir: "", dayFirst: null };
      setSheet(bestName);
      paintWiz();
    } catch (e) {
      wiz('<div class="gd-warn">' + esc(e && e.message || "Could not read that file") + '</div><button type="button" class="action-btn" onclick="GateRecords.upload()">Choose another file</button>');
    }
  };
  function setSheet(name) {
    const sh = W.sheets[name];
    W.sheet = name;
    W.hdr = sh.hdr;
    remap();
  }
  function remap() {
    const grid = W.sheets[W.sheet].grid, headers = (grid[W.hdr] || []).map(str), rows = grid.slice(W.hdr + 1);
    W.map = savedMap(headers) || autoMap(headers, rows);
    W.remembered = !!savedMap(headers);
    W.dayFirst = dayFirstOf(rows, W.map.date);
    const tk = W.map.time !== void 0 ? nk(headers[W.map.time]) : "";
    W.dir = /in$/.test(tk) && !/out/.test(tk) ? "in" : "out";
  }
  function current() {
    return build(W.sheets[W.sheet].grid, W.hdr, W.map, { dayFirst: W.dayFirst, fillDown: W.fillDown, dir: W.dir });
  }
  function paintWiz() {
    const grid = W.sheets[W.sheet].grid, headers = (grid[W.hdr] || []).map(str), rows = grid.slice(W.hdr + 1);
    const sample = (i) => {
      for (let r = 0; r < rows.length; r++) {
        const v = rows[r][i];
        if (v !== "" && v != null) return String(v instanceof Date ? v.toISOString().slice(0, 10) : v).slice(0, 18);
      }
      return "";
    };
    const opts = (sel) => '<option value="-1">\u2014 not in this file \u2014</option>' + headers.map((h, i) => h || sample(i) ? '<option value="' + i + '"' + (sel === i ? " selected" : "") + ">" + colLetter(i) + ": " + esc(h || "(no name)") + (sample(i) ? "  e.g. " + esc(sample(i)) : "") + "</option>" : "").join("");
    const out = current(), unmapped = headers.filter((h, i) => h && !Object.keys(W.map).some((k) => W.map[k] === i));
    const dirMapped = W.map.direction !== void 0 && W.map.direction >= 0;
    const prev = out.records.slice(0, 5).map((r) => "<tr><td>" + esc(r.record_date) + "</td><td>" + esc(r.time_at || "") + "</td><td>" + esc(r.truck_no || "") + "</td><td>" + esc(r.driver_name || "") + "</td><td>" + esc(fmtCont(r.container_no || "")) + "</td><td>" + esc(r.company || "") + "</td><td>" + esc(r.size_ft || "") + "</td></tr>").join("");
    const reasons = {};
    out.skipped.forEach((s) => {
      reasons[s.why] = (reasons[s.why] || 0) + 1;
    });
    wiz('<div class="gr-wiz"><div class="gr-file"><b>' + esc(W.file.name) + "</b> \xB7 " + out.total.toLocaleString() + " data rows" + (W.remembered ? ' \xB7 <span style="color:var(--green)">layout remembered from an earlier upload</span>' : "") + '</div><div class="form-row-2"><div class="fg"><label>Sheet</label><select onchange="GateRecords.w.sheet(this.value)">' + W.names.map((n) => "<option" + (n === W.sheet ? " selected" : "") + ' value="' + esc(n) + '">' + esc(n) + " (" + W.sheets[n].grid.length + " rows)</option>").join("") + '</select></div><div class="fg"><label>Header is on row</label><input type="number" min="1" max="' + Math.max(1, W.sheets[W.sheet].grid.length) + '" value="' + (W.hdr + 1) + '" onchange="GateRecords.w.hdr(this.value)"/></div></div><div class="gr-h">Match the columns <span>Gargo guessed these. Change any that are wrong.</span></div><div class="gr-map">' + FIELDS.map((f) => "<label>" + esc(f.l) + (f.need ? " <i>*</i>" : "") + "</label><select onchange=\"GateRecords.w.set('" + f.k + "',this.value)\">" + opts(W.map[f.k] === void 0 ? -1 : W.map[f.k]) + "</select>").join("") + "</div>" + (unmapped.length ? '<div class="gs-hint">Kept as extra details on each record: ' + unmapped.map(esc).join(", ") + "</div>" : "") + '<div class="form-row-2"><div class="fg"><label>Dates are written as</label><select onchange="GateRecords.w.df(this.value)"><option value="1"' + (W.dayFirst ? " selected" : "") + '>Day / Month / Year</option><option value="0"' + (W.dayFirst ? "" : " selected") + ">Month / Day / Year</option></select></div>" + (dirMapped ? "" : '<div class="fg"><label>Every row is a vehicle going</label><select onchange="GateRecords.w.dir(this.value)"><option value="out"' + (W.dir === "out" ? " selected" : "") + '>Out</option><option value="in"' + (W.dir === "in" ? " selected" : "") + '>In</option><option value="in_out"' + (W.dir === "in_out" ? " selected" : "") + ">In &amp; Out</option></select></div>") + '</div><div class="fg" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="grFill" ' + (W.fillDown ? "checked" : "") + ' style="width:auto;min-height:0" onchange="GateRecords.w.fill(this.checked)"/><label for="grFill" style="margin:0">If a date cell is empty, use the date from the row above</label></div><div class="gr-h">Preview <span>' + out.records.length.toLocaleString() + " records ready" + (out.from ? " \xB7 " + esc(fmtDay(out.from)) + " to " + esc(fmtDay(out.to)) : "") + (out.flagged ? " \xB7 " + out.flagged.toLocaleString() + " flagged for checking" : "") + "</span></div>" + (prev ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Time</th><th>Truck</th><th>Driver</th><th>Container</th><th>Company</th><th>Size</th></tr></thead><tbody>' + prev + "</tbody></table></div>" : '<div class="gd-warn">No usable rows yet. Check the header row and that Date is matched.</div>') + (out.skipped.length ? '<div class="gs-hint">' + out.skipped.length.toLocaleString() + " rows will be skipped: " + Object.keys(reasons).map((k) => reasons[k] + " with " + esc(k)).join(", ") + ".</div>" : "") + '<div class="gs-hint">Rows already stored (same date, time, truck and container) are skipped, so uploading an overlapping file is safe.</div><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="action-btn ghost" onclick="closeModal()">Cancel</button><button type="button" class="submit-btn" style="width:auto;margin:0;padding:0 22px" ' + (out.records.length ? "" : "disabled") + ' onclick="GateRecords.doImport()">Import ' + out.records.length.toLocaleString() + " records</button></div></div>");
  }
  R.w = {
    sheet: (n) => {
      setSheet(n);
      paintWiz();
    },
    hdr: (v) => {
      W.hdr = Math.max(0, (parseInt(v, 10) || 1) - 1);
      remap();
      paintWiz();
    },
    set: (k, v) => {
      v = parseInt(v, 10);
      if (v >= 0) {
        Object.keys(W.map).forEach((o) => {
          if (o !== k && W.map[o] === v) delete W.map[o];
        });
        W.map[k] = v;
      } else delete W.map[k];
      if (k === "date") W.dayFirst = dayFirstOf(W.sheets[W.sheet].grid.slice(W.hdr + 1), W.map.date);
      W.remembered = false;
      paintWiz();
    },
    df: (v) => {
      W.dayFirst = v === "1";
      paintWiz();
    },
    dir: (v) => {
      W.dir = v;
      paintWiz();
    },
    fill: (c) => {
      W.fillDown = !!c;
      paintWiz();
    }
  };
  R.doImport = async function() {
    if (!W || !sb()) return;
    if (!navigator.onLine) return toast("You are offline. Uploading needs the internet.", "warning");
    if (W.map.date === void 0) return toast("Match the Date column first.", "error");
    const out = current(), recs = out.records;
    if (!recs.length) return;
    const me = state.currentUser && state.currentUser.id || null, impId = uid();
    const headers = (W.sheets[W.sheet].grid[W.hdr] || []).map(str), mapNames = {};
    Object.keys(W.map).forEach((k) => {
      if (W.map[k] >= 0) mapNames[k] = headers[W.map[k]];
    });
    const fail = (e) => wiz('<div class="gd-warn">' + (missingTable(e) ? "The records tables do not exist yet. Run <b>gate-records.sql</b> in Supabase, then try again." : /row-level security|permission/i.test(String(e && e.message || "")) ? "You are not allowed to add gate records." : "Could not save: " + esc(e && e.message || "error")) + '</div><button type="button" class="action-btn" onclick="closeModal()">Close</button>');
    wiz('<div class="gd-empty" id="grProg">Importing 0 of ' + recs.length.toLocaleString() + "\u2026</div>");
    let ins = 0;
    try {
      const a = await sb().from(IMPORTS).insert({ id: impId, file_name: W.file.name, sheet_name: W.sheet, total_rows: out.total, mapping: mapNames, created_by: me });
      if (a.error) throw a.error;
      for (let i = 0; i < recs.length; i += 400) {
        const chunk = recs.slice(i, i + 400).map((r) => Object.assign({}, r, { import_id: impId, created_by: me }));
        const res = await sb().from(TABLE).upsert(chunk, { onConflict: "row_key", ignoreDuplicates: true }).select("id");
        if (res.error) throw res.error;
        ins += (res.data || []).length;
        const p = $("grProg");
        if (p) p.textContent = "Importing " + Math.min(i + 400, recs.length).toLocaleString() + " of " + recs.length.toLocaleString() + "\u2026";
      }
    } catch (e) {
      console.warn("Gate records import failed:", e);
      if (ins === 0) {
        try {
          await sb().from(IMPORTS).delete().eq("id", impId);
        } catch (x) {
        }
      }
      return fail(e);
    }
    const dup = recs.length - ins;
    if (ins === 0) {
      try {
        await sb().from(IMPORTS).delete().eq("id", impId);
      } catch (e) {
      }
    } else {
      try {
        await sb().from(IMPORTS).update({ inserted: ins, duplicates: dup, skipped: out.skipped.length }).eq("id", impId);
      } catch (e) {
      }
    }
    saveMap(headers, W.map);
    try {
      addAudit(state.profile && state.profile.username || "system", "Gate Records Imported", W.file.name + " \xB7 " + ins + " added, " + dup + " already stored");
    } catch (e) {
    }
    wiz('<div class="gr-done"><div class="gr-big">' + ins.toLocaleString() + '</div><div>records added</div></div><div style="font-size:13px;line-height:1.7;color:var(--text-2);margin:10px 0 14px">' + (dup ? dup.toLocaleString() + " were already stored and were skipped.<br>" : "") + (out.skipped.length ? out.skipped.length.toLocaleString() + " rows could not be used (" + out.skipped.slice(0, 5).map((s) => "row " + s.row + ": " + esc(s.why)).join("; ") + (out.skipped.length > 5 ? "\u2026" : "") + ")." : "") + '</div><button type="button" class="submit-btn" onclick="closeModal();GateRecords.reload()">Done</button>');
    W = null;
  };
  R.imports = async function() {
    if (!canFix()) return;
    const { data, error } = await sb().from(IMPORTS).select("*").order("created_at", { ascending: false }).limit(60);
    if (error) return toast(missingTable(error) ? "Run gate-records.sql first." : "Could not load: " + error.message, "error");
    openModal("Uploads", data && data.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>File</th><th>Added</th><th>Skipped</th><th></th></tr></thead><tbody>' + data.map((i) => '<tr><td style="white-space:nowrap">' + esc(new Date(i.created_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })) + "</td><td>" + esc(i.file_name || "") + '<span class="gs-sub">' + esc(i.sheet_name || "") + "</span></td><td>" + (i.inserted || 0).toLocaleString() + "</td><td>" + ((i.duplicates || 0) + (i.skipped || 0)).toLocaleString() + '</td><td><button type="button" class="tbl-btn" onclick="GateRecords.undo(\'' + esc(i.id) + "')\">Undo</button></td></tr>").join("") + "</tbody></table></div>" : '<div class="gd-empty">No uploads yet.</div>');
  };
  R.undo = async function(id) {
    if (!canFix()) return;
    if (!confirm("Remove every record added by this upload? This cannot be undone.")) return;
    const { error } = await sb().from(IMPORTS).delete().eq("id", id);
    if (error) return toast("Could not undo: " + error.message, "error");
    toast("Upload removed", "success");
    closeModal();
    R.reload();
  };
  R._t = { parseDate, parseTime, isoOk, fmtCont, autoMap, findHeader, build, phoneOf, fmtPlate, dayFirstOf };
})();
