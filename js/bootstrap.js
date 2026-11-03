'use strict';


window.ghSupabase = supabase;

document.addEventListener('DOMContentLoaded', initTheme);

document.addEventListener('DOMContentLoaded', initScrollToTop);

const LOAD_STEPS = [
  'Connecting to Supabase…', 'Loading fleet database…', 'Verifying container records…',
  'Building dispatch queue…', 'Activating live tracking…',
];

async function restoreSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile && profile.active && !error) {
        state.profile = profile;
        state.currentUser = { id: session.user.id, email: profile.email, username: profile.username, name: profile.name, role: profile.role };
        return;
      }
    }
  } catch (e) { console.warn('Session check failed:', e); }
  // No network (or server unreachable): reopen as the last signed-in user, from the saved device copy.
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
  const fill = document.getElementById('loaderFill');
  const status = document.getElementById('loaderStatus');
  const loader = document.getElementById('loader');
  if (!fill || !status || !loader) return;

  // Progress is cosmetic and capped; the loader closes as soon as the real work is done.
  const t0 = Date.now();
  let step = 0;
  const tick = setInterval(() => {
    if (step >= LOAD_STEPS.length) return;
    status.textContent = LOAD_STEPS[step++];
    fill.style.width = Math.round((step / (LOAD_STEPS.length + 1)) * 100) + '%';
  }, 200);

  // The session check and the data load do not depend on each other: run them together.
  const sess = restoreSession();
  await initDB();
  await sess;
  if (!state.currentUser && state.offlineData) await restoreSession();   // data came from the device copy: reopen as the last user
  clearInterval(tick);
  fill.style.width = '100%';
  status.textContent = state.offlineData ? 'Offline — using saved data.' : 'System ready.';
  setTimeout(() => {
    loader.classList.add('out');
    setTimeout(() => {
      loader.style.display = 'none';
      if (state.currentUser && state.profile) bootShell(); else showLoginScreen();
    }, 350);
  }, Math.max(0, 300 - (Date.now() - t0)));
}

document.addEventListener('click', e=>{
  const chip = document.querySelector('.user-chip-rail');
  const menu = document.getElementById('userMenu');
  if (menu && chip && !chip.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display='none';
  }
  const results = document.getElementById('searchResults');
  const search  = document.querySelector('.search-wrap');
  if (results && search && !search.contains(e.target)) {
    results.style.display='none';
  }
});

/* ──────────────────────────────────────────────────────────────────
   § 36  KEYBOARD SHORTCUTS
────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e=>{
  if (!state.currentUser) return;
  if (e.key==='Escape') {
    closeModal();
    closeUserMenu();
    const p=document.getElementById('searchResults'); if(p)p.style.display='none';
  }
  if ((e.ctrlKey||e.metaKey) && e.key==='k') {
    e.preventDefault();
    document.getElementById('globalSearch')?.focus();
  }
  if ((e.ctrlKey||e.metaKey) && e.key==='/') {
    e.preventDefault();
    toggleSidebar();
  }
});

(function init() {
  try {
    runLoader();
  } catch(e) {
    console.error('Initialization error:', e);
    toast('System initialization error. Please refresh.', 'error');
  }


})();

let deferredInstallPrompt = null;

function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS Safari
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function setInstallButtonVisible(visible) {
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.style.display = visible ? 'flex' : 'none';
}

function initInstallApp() {
  if (isStandaloneDisplay()) {
    setInstallButtonVisible(false);
    return;
  }

 
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    setInstallButtonVisible(true);
  });

  
  if (isIOSDevice()) {
    setInstallButtonVisible(true);
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallButtonVisible(false);
    toast('Gargo installed', 'success');
  });
}

async function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      toast('Installing Gargo…', 'success');
    }
    deferredInstallPrompt = null;
    return;
  }

  if (isIOSDevice()) {
    openModal('Install Gargo', `
      <div style="font-size:13px;line-height:1.7;color:var(--text-2)">
        <p style="margin-bottom:10px">Add Gargo to your Home Screen for one-tap, full-screen access:</p>
        <ol style="padding-left:18px;margin:0">
          <li>Tap the <strong>Share</strong> icon in Safari's toolbar.</li>
          <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top-right corner.</li>
        </ol>
      </div>
    `);
    return;
  }

  openModal('Install Gargo', `
    <div style="font-size:13px;line-height:1.7;color:var(--text-2)">
      Your browser didn't offer an install prompt yet — this can happen if the app is already installed,
      or if your browser doesn't support installing web apps. Look for an install icon in the address bar,
      or check your browser's menu for an "Install app" / "Add to Home Screen" option.
    </div>
  `);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
 
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        if (window.GargoOffline && GargoOffline.unsavedCount() > 0) {
          toast('A new version is ready — it will load after your changes sync', 'info', 4000);
          return;
        }
        toast('A new version is available — reloading…', 'info', 2500);
        setTimeout(() => window.location.reload(), 1200);
      }
    });
  });
}

initInstallApp();


window._repairItems = {};

/* ── Sync pill (top bar): shows Online / Offline / Unsaved changes, and a tap refreshes from the server ── */
function paintSyncStatus(mode) {
  const el = document.getElementById('syncStatus'), lb = document.getElementById('syncLabel');
  if (!el || !lb) return;
  let unsaved = 0;
  try { if (window.GargoOffline) unsaved = GargoOffline.unsavedCount(); } catch (e) {}
  const m = mode || (!navigator.onLine ? 'offline' : (unsaved > 0 ? 'unsaved' : 'synced'));
  el.classList.remove('synced', 'syncing', 'sync-error');
  el.classList.add(m === 'syncing' ? 'syncing' : (m === 'synced' ? 'synced' : 'sync-error'));
  lb.textContent = m === 'syncing' ? 'Syncing…' : m === 'offline' ? 'Offline' : m === 'unsaved' ? unsaved + ' unsaved' : 'Synced';
}
async function handleSyncStatusClick() {
  if (!navigator.onLine) { toast('You are offline. Changes are kept on this device and sync when the signal returns.', 'warning', 4000); paintSyncStatus(); return; }
  paintSyncStatus('syncing');
  try { await refreshFromServer(); } catch (e) { console.warn('Manual refresh failed:', e); toast('Could not refresh. Try again.', 'error'); }
  paintSyncStatus();
}
window.addEventListener('online', () => setTimeout(paintSyncStatus, 500));
window.addEventListener('offline', () => paintSyncStatus());
setInterval(() => { if (!document.hidden) paintSyncStatus(); }, 5000);
document.addEventListener('DOMContentLoaded', () => paintSyncStatus());