'use strict';


window.ghSupabase = supabase;

document.addEventListener('DOMContentLoaded', initTheme);

document.addEventListener('DOMContentLoaded', initScrollToTop);

const LOAD_STEPS = [
  [300,  'Connecting to Supabase…'],
  [700,  'Loading fleet database…'],
  [1100, 'Verifying container records…'],
  [1600, 'Building dispatch queue…'],
  [2000, 'Activating live tracking…'],
  [2400, 'System ready.'],
];

async function runLoader() {
  const fill = document.getElementById('loaderFill');
  const status = document.getElementById('loaderStatus');
  const loader = document.getElementById('loader');
  if (!fill || !status || !loader) return;

  await initDB();


  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profile && profile.active && !error) {
        state.profile = profile;
        state.currentUser = {
          id: session.user.id,
          email: profile.email,
          username: profile.username,
          name: profile.name,
          role: profile.role
        };
      }
    }
  } catch (e) {
    console.warn('Session check failed:', e);
  }

  LOAD_STEPS.forEach(([t, msg], i) => {
    setTimeout(() => {
      fill.style.width = `${Math.round(((i + 1) / LOAD_STEPS.length) * 100)}%`;
      status.textContent = msg;
      if (i === LOAD_STEPS.length - 1) {
        setTimeout(() => {
          loader.classList.add('out');
          setTimeout(() => {
            loader.style.display = 'none';
            if (state.currentUser && state.profile) {
              bootShell();
            } else {
              showLoginScreen();
            }
          }, 520);
        }, 400);
      }
    }, t);
  });
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
        toast('A new version is available — reloading…', 'info', 2500);
        setTimeout(() => window.location.reload(), 1200);
      }
    });
  });
}

initInstallApp();


window._repairItems = {};