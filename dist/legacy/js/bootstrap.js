"use strict";
window.ghSupabase = supabase;
document.addEventListener("DOMContentLoaded", initTheme);
document.addEventListener("DOMContentLoaded", initScrollToTop);
const LOAD_STEPS = [
  "Connecting to Supabase\u2026",
  "Loading fleet database\u2026",
  "Verifying container records\u2026",
  "Building dispatch queue\u2026",
  "Activating live tracking\u2026"
];
async function restoreSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profile && profile.active && !error) {
        state.profile = profile;
        state.currentUser = { id: session.user.id, email: profile.email, username: profile.username, name: profile.name, role: profile.role };
        return;
      }
    }
  } catch (e) {
    console.warn("Session check failed:", e);
  }
  if (!state.currentUser && window.GargoOffline && (state.offlineData || !navigator.onLine)) {
    const id = await GargoOffline.offlineIdentity();
    if (id) {
      const p = id.profile;
      state.profile = p;
      state.currentUser = { id: id.userId, email: p.email, username: p.username, name: p.name, role: p.role };
    }
  }
}
async function runLoader() {
  const fill = document.getElementById("loaderFill");
  const status = document.getElementById("loaderStatus");
  const loader = document.getElementById("loader");
  if (!fill || !status || !loader) return;
  const t0 = Date.now();
  let step = 0;
  const tick = setInterval(() => {
    if (step >= LOAD_STEPS.length) return;
    status.textContent = LOAD_STEPS[step++];
    fill.style.width = Math.round(step / (LOAD_STEPS.length + 1) * 100) + "%";
  }, 200);
  const sess = restoreSession();
  await initDB();
  await sess;
  if (!state.currentUser && state.offlineData) await restoreSession();
  clearInterval(tick);
  fill.style.width = "100%";
  status.textContent = state.offlineData ? "Offline \u2014 using saved data." : "System ready.";
  setTimeout(() => {
    loader.classList.add("out");
    setTimeout(() => {
      loader.style.display = "none";
      if (state.currentUser && state.profile) bootShell();
      else showLoginScreen();
    }, 350);
  }, Math.max(0, 300 - (Date.now() - t0)));
}
document.addEventListener("click", (e) => {
  const chip = document.querySelector(".user-chip-rail");
  const menu = document.getElementById("userMenu");
  if (menu && chip && !chip.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display = "none";
  }
  const results = document.getElementById("searchResults");
  const search = document.querySelector(".search-wrap");
  if (results && search && !search.contains(e.target)) {
    results.style.display = "none";
  }
});
document.addEventListener("keydown", (e) => {
  var _a;
  if (!state.currentUser) return;
  if (e.key === "Escape") {
    closeModal();
    closeUserMenu();
    const p = document.getElementById("searchResults");
    if (p) p.style.display = "none";
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    (_a = document.getElementById("globalSearch")) == null ? void 0 : _a.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    e.preventDefault();
    toggleSidebar();
  }
});
(function init() {
  try {
    runLoader();
  } catch (e) {
    console.error("Initialization error:", e);
    toast("System initialization error. Please refresh.", "error");
  }
})();
let deferredInstallPrompt = null;
function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
function setInstallButtonVisible(visible) {
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.style.display = visible ? "flex" : "none";
}
function initInstallApp() {
  if (isStandaloneDisplay()) {
    setInstallButtonVisible(false);
    return;
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    setInstallButtonVisible(true);
  });
  if (isIOSDevice()) {
    setInstallButtonVisible(true);
  }
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setInstallButtonVisible(false);
    toast("Gargo installed", "success");
  });
}
async function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      toast("Installing Gargo\u2026", "success");
    }
    deferredInstallPrompt = null;
    return;
  }
  if (isIOSDevice()) {
    openModal("Install Gargo", '\n      <div style="font-size:13px;line-height:1.7;color:var(--text-2)">\n        <p style="margin-bottom:10px">Add Gargo to your Home Screen for one-tap, full-screen access:</p>\n        <ol style="padding-left:18px;margin:0">\n          <li>Tap the <strong>Share</strong> icon in Safari\'s toolbar.</li>\n          <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>\n          <li>Tap <strong>Add</strong> in the top-right corner.</li>\n        </ol>\n      </div>\n    ');
    return;
  }
  openModal("Install Gargo", '\n    <div style="font-size:13px;line-height:1.7;color:var(--text-2)">\n      Your browser didn\'t offer an install prompt yet \u2014 this can happen if the app is already installed,\n      or if your browser doesn\'t support installing web apps. Look for an install icon in the address bar,\n      or check your browser\'s menu for an "Install app" / "Add to Home Screen" option.\n    </div>\n  ');
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      const check = () => {
        try {
          if (navigator.onLine) reg.update();
        } catch (e) {
        }
      };
      setInterval(check, 15 * 60 * 1e3);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    }).catch((err) => {
      console.error("Service worker registration failed:", err);
    });
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SW_UPDATED") {
        if (window.GargoOffline && GargoOffline.unsavedCount() > 0) {
          toast("A new version is ready \u2014 it will load after your changes sync", "info", 4e3);
          return;
        }
        const reloadWhenIdle = () => {
          const ov = document.getElementById("modalOverlay");
          if (ov && ov.classList.contains("active")) {
            setTimeout(reloadWhenIdle, 1e4);
            return;
          }
          toast("A new version is available \u2014 reloading\u2026", "info", 2500);
          setTimeout(() => window.location.reload(), 1200);
        };
        reloadWhenIdle();
      }
    });
  });
}
initInstallApp();
window._repairItems = {};
function paintSyncStatus(mode) {
  const el = document.getElementById("syncStatus"), lb = document.getElementById("syncLabel");
  if (!el || !lb) return;
  let unsaved = 0;
  try {
    if (window.GargoOffline) unsaved = GargoOffline.unsavedCount();
  } catch (e) {
  }
  const m = mode || (!navigator.onLine ? "offline" : unsaved > 0 ? "unsaved" : "synced");
  el.classList.remove("synced", "syncing", "sync-error");
  el.classList.add(m === "syncing" ? "syncing" : m === "synced" ? "synced" : "sync-error");
  lb.textContent = m === "syncing" ? "Syncing\u2026" : m === "offline" ? "Offline" : m === "unsaved" ? unsaved + " unsaved" : "Synced";
}
async function handleSyncStatusClick() {
  if (!navigator.onLine) {
    toast("You are offline. Changes are kept on this device and sync when the signal returns.", "warning", 4e3);
    paintSyncStatus();
    return;
  }
  paintSyncStatus("syncing");
  try {
    await refreshFromServer();
  } catch (e) {
    console.warn("Manual refresh failed:", e);
    toast("Could not refresh. Try again.", "error");
  }
  paintSyncStatus();
}
window.addEventListener("online", () => setTimeout(paintSyncStatus, 500));
window.addEventListener("offline", () => paintSyncStatus());
setInterval(() => {
  if (!document.hidden) paintSyncStatus();
}, 5e3);
document.addEventListener("DOMContentLoaded", () => paintSyncStatus());
