(function() {
  var d = document.documentElement, ua = navigator.userAgent || "";
  var cm = ua.match(/Chrome\/(\d+)/), am = ua.match(/Android (\d+)/), sm = ua.match(/SamsungBrowser\/(\d+)/);
  var chrome = cm ? +cm[1] : 0, android = am ? +am[1] : 0, samsung = sm ? +sm[1] : 0;
  var firefox = /Firefox\//.test(ua), opera = /OPR\/|Opera/.test(ua), uc = /UCBrowser/.test(ua), edge = /EdgA\//.test(ua);
  var mem = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 4;
  var touch = !!(window.matchMedia && matchMedia("(pointer:coarse)").matches);
  var inLegacy = /\/legacy\//.test(location.pathname);
  var lite = android && android <= 9 || mem && mem <= 2 || cores <= 4 || chrome && chrome < 90 || inLegacy;
  try {
    var q = /[?&]lite=([01])/.exec(location.search);
    if (q) localStorage.setItem("gargo-lite", q[1]);
    var f = localStorage.getItem("gargo-lite");
    if (f === "1") lite = true;
    else if (f === "0") lite = false;
  } catch (e) {
  }
  d.className += (touch ? " gx-touch" : " gx-mouse") + (lite ? " gx-lite" : "") + (inLegacy ? " gx-legacy-build" : "");
  var syntaxOld = false, canAsync = true;
  try {
    new Function("var a={};return a?.b??1");
  } catch (e) {
    syntaxOld = e instanceof SyntaxError;
  }
  try {
    new Function("return async function(){}");
  } catch (e) {
    canAsync = false;
  }
  if (syntaxOld && !inLegacy) {
    d.className += " gx-legacy";
    window.addEventListener("load", function() {
      setTimeout(function() {
        if (typeof window.showLoginScreen === "function") return;
        if (canAsync && window.XMLHttpRequest) {
          try {
            var x = new XMLHttpRequest();
            x.open("HEAD", "legacy/index.html", true);
            x.onload = function() {
              if (x.status === 200) location.replace("legacy/index.html" + location.search + location.hash);
              else showOld();
            };
            x.onerror = showOld;
            x.send();
            return;
          } catch (e) {
          }
        }
        showOld();
      }, 300);
    });
  }
  function showOld() {
    if (document.getElementById("gxLegacy")) return;
    var b = document.createElement("div");
    b.id = "gxLegacy";
    b.innerHTML = "<div><h2>Browser engine too old</h2><p>This tablet\u2019s web engine (" + (chrome ? "Chrome " + chrome : "unknown version") + ") can\u2019t run Gargo yet.</p><p>Open <b>Google Play Store</b> \u2192 update <b>Android System WebView</b> and <b>Google Chrome</b>, then reopen Gargo.</p>" + (canAsync ? "" : "<p>If no update is offered, open this address in a newer browser on another device.</p>") + '<p><button type="button" id="gxLegacyX" style="padding:10px 18px;border-radius:10px;border:1px solid #C9A227;background:transparent;color:#C9A227;font-size:15px">Dismiss</button></p></div>';
    document.body.appendChild(b);
    document.getElementById("gxLegacyX").onclick = function() {
      b.parentNode.removeChild(b);
    };
  }
  function $(id) {
    return document.getElementById(id);
  }
  function closeSearch() {
    document.body.className = document.body.className.replace(/\s*gx-search-open/g, "");
    var p = $("searchResults");
    if (p) p.style.display = "none";
    var g = $("globalSearch");
    if (g) g.blur();
  }
  function openSearch() {
    var g = $("globalSearch");
    if (!g) return;
    if (document.body.className.indexOf("gx-search-open") < 0) document.body.className += " gx-search-open";
    var j = $("gxJump");
    if (j) j.style.display = $("nxJump") ? "" : "none";
    setTimeout(function() {
      g.focus();
      if (g.value && window.handleSearch) window.handleSearch(g.value);
    }, 60);
  }
  document.addEventListener("DOMContentLoaded", function() {
    var wrap = document.querySelector(".search-wrap"), g = $("globalSearch"), anchor = $("themeBtn");
    if (!wrap || !g || !anchor || $("gxSearchBtn")) return;
    var btn = document.createElement("button");
    btn.id = "gxSearchBtn";
    btn.type = "button";
    btn.className = "gx-search-btn";
    btn.setAttribute("aria-label", "Search trucks, drivers, containers");
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    btn.onclick = openSearch;
    anchor.parentNode.insertBefore(btn, anchor);
    var scrim = document.createElement("div");
    scrim.id = "gxSearchScrim";
    scrim.onclick = closeSearch;
    document.body.appendChild(scrim);
    var jump = document.createElement("button");
    jump.id = "gxJump";
    jump.type = "button";
    jump.className = "gx-jump";
    jump.textContent = "Jump to page";
    jump.onclick = function() {
      closeSearch();
      var n = $("nxJump");
      if (n) n.click();
    };
    wrap.appendChild(jump);
    var t;
    g.addEventListener("input", function() {
      clearTimeout(t);
      t = setTimeout(function() {
        if (window.handleSearch && document.body.className.indexOf("gx-search-open") > -1) window.handleSearch(g.value);
      }, 250);
    });
    var res = $("searchResults");
    if (res) res.addEventListener("click", function() {
      setTimeout(closeSearch, 0);
    });
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") closeSearch();
    });
    window.addEventListener("resize", function() {
      if (window.innerWidth > 900) closeSearch();
    });
  });
  var installEvt = null;
  function standalone() {
    return window.matchMedia && matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function showInstall(on) {
    var b = $("installAppBtn");
    if (b) b.style.display = on ? "flex" : "none";
  }
  window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    installEvt = e;
    if (!standalone()) showInstall(true);
  });
  window.addEventListener("appinstalled", function() {
    installEvt = null;
    showInstall(false);
    if (window.toast) window.toast("Gargo installed", "success");
  });
  function browserName() {
    if (samsung) return "Samsung Internet " + samsung;
    if (firefox) return "Firefox";
    if (opera) return "Opera";
    if (uc) return "UC Browser";
    if (edge) return "Edge";
    if (chrome) return "Chrome " + chrome;
    return "this browser";
  }
  function installSteps() {
    if (samsung) return ["Tap the <b>\u2630</b> menu (bottom-right).", "Tap <b>Add page to</b> \u2192 <b>Home screen</b>.", "Tap <b>Add</b>."];
    if (firefox) return ["Tap the <b>\u22EE</b> menu.", "Tap <b>Install</b> (or <b>Add to Home screen</b>).", "Confirm with <b>Add</b>."];
    if (opera) return ["Tap the menu (<b>\u22EE</b> or the Opera logo).", "Tap <b>Home screen</b> or <b>Add to Home screen</b>.", "Confirm."];
    if (uc) return ["Tap the <b>\u2630</b> menu.", "Tap <b>Tools</b> \u2192 <b>Add to Home screen</b>.", "Confirm."];
    return ["Tap the <b>\u22EE</b> menu (top-right).", "Tap <b>Install app</b> or <b>Add to Home screen</b>.", "Tap <b>Install</b> or <b>Add</b>."];
  }
  function appAddress() {
    return location.origin + location.pathname.replace(/\/legacy\/.*$/, "/").replace(/index\.html$/, "");
  }
  window.gxCopyAddress = function() {
    var t = document.createElement("textarea");
    t.value = appAddress();
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    var done = false;
    try {
      done = document.execCommand("copy");
    } catch (e) {
    }
    document.body.removeChild(t);
    if (window.toast) window.toast(done ? "Address copied" : appAddress(), done ? "success" : "info", 6e3);
  };
  function showInstallHelp() {
    var steps = installSteps(), li = "";
    for (var i = 0; i < steps.length; i++) li += "<li>" + steps[i] + "</li>";
    var notes = "";
    if (chrome && chrome < 57 && !samsung)
      notes += '<p style="margin:10px 0 0">This Chrome version can only add a shortcut that opens in the browser. Update Chrome in Play Store for a full-screen app.</p>';
    if (!samsung && !(chrome && !firefox && !opera && !uc && !edge))
      notes += '<p style="margin:10px 0 0">No install option here? Open this address in <b>Chrome</b> and repeat the steps:</p><p style="margin:6px 0 0"><button type="button" class="action-btn" onclick="gxCopyAddress()">Copy app address</button></p>';
    notes += '<p style="margin:10px 0 0;color:var(--text-3);font-size:12px">Use the https:// address. If \u201CInstall app\u201D is missing, update ' + (samsung ? "Samsung Internet" : "Chrome") + " from the store.</p>";
    window.openModal(
      "Install Gargo",
      '<div style="font-size:14px;line-height:1.7;color:var(--text-2)"><p style="margin:0 0 8px;color:var(--text-3);font-size:12px">Detected: ' + browserName() + (android ? " on Android " + android : "") + '</p><p style="margin:0 0 6px">Add Gargo to the home screen for one-tap use:</p><ol style="padding-left:20px;margin:0">' + li + "</ol>" + notes + "</div>"
    );
  }
  function installClick() {
    if (installEvt) {
      var ev = installEvt;
      installEvt = null;
      ev.prompt();
      if (ev.userChoice && ev.userChoice.then) ev.userChoice.then(function(r) {
        if (r && r.outcome === "accepted" && window.toast) window.toast("Installing Gargo\u2026", "success");
        else showInstall(true);
      });
      return;
    }
    if (/iPad|iPhone|iPod/.test(ua) && window.handleInstallClick) return window.handleInstallClick();
    if (window.openModal) showInstallHelp();
  }
  document.addEventListener("DOMContentLoaded", function() {
    var b = $("installAppBtn");
    if (!b) return;
    b.removeAttribute("onclick");
    b.onclick = installClick;
    if (standalone()) showInstall(false);
    else if (touch || installEvt) showInstall(true);
  });
})();
