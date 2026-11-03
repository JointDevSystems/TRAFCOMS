'use strict';


async function loadUserProfile(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Profile not found:', error);
      return false;
    }

    if (!profile.active) {
      toast('Account is deactivated', 'error');
      return false;
    }

    state.profile = profile;
    state.currentUser = { 
      id: userId, 
      email: profile.email,
      username: profile.username,
      name: profile.name,
      role: profile.role
    };

    await supabase.from('profiles').update({ 
      last_login: new Date().toISOString() 
    }).eq('id', userId);
    
    return true;
  } catch (e) {
    console.error('loadUserProfile error:', e);
    return false;
  }
}

function showLoginScreen() {
  const loginEl=document.getElementById('loginScreen');
  if(!loginEl) return;
  loginEl.style.display='flex';
  animateCounter('ls-fleet',   state.db.trucks.length,       0, 800);
  animateCounter('ls-drivers', state.db.drivers.length,      0, 800);
  animateCounter('ls-trips',   state.db.trips.filter(t=>t.status==='active').length, 0, 800);
  setTimeout(()=>document.getElementById('loginUser')?.focus(), 100);
}

window.doLogin = async function() {
  const email = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');

  if (!email || !password) {
    errEl.textContent = 'Email and password required.';
    return;
  }

  errEl.textContent = '';
  const btn = document.querySelector('.login-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span>Signing in…</span>'; }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error || !data.user) {
      errEl.textContent = 'Invalid email or password.';
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      errEl.textContent = 'Profile not found. Contact administrator.';
      await supabase.auth.signOut();
      return;
    }

    if (!profile.active) {
      errEl.textContent = 'Account is deactivated.';
      await supabase.auth.signOut();
      return;
    }

    state.profile = profile;
    state.currentUser = {
      id: data.user.id,
      email: profile.email,
      username: profile.username,
      name: profile.name,
      role: profile.role
    };

    await supabase.from('profiles').update({
      last_login: new Date().toISOString()
    }).eq('id', data.user.id);

    document.getElementById('loginScreen').style.display = 'none';
    bootShell();

  } catch (e) {
    console.error('Login error:', e);
    errEl.textContent = 'Connection error. Please try again.';
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Sign In</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'; }
  }
};

async function logout() {
  if (!confirm('Are you sure you want to sign out?')) return;
  await performLogout('User signed out');
}

async function forceLogout(reason) {
  await performLogout(reason || 'Session timed out (idle)');
}

async function performLogout(auditDetail) {
  stopDriverTracking();
  stopWialonPolling();
  stopAutoRefresh();
  addAudit(state.profile?.username || 'system', 'Logout', auditDetail);
  try { await saveNowAwaited(); } catch (e) {}   // send the Logout entry while the session is still valid
  try { if (window.GargoOffline) await GargoOffline.onLogout(); } catch (e) {}
  await supabase.auth.signOut();
  state.currentUser = null;
  state.profile = null;
  clearIdleTimer();
  document.getElementById('shell').style.display = 'none';
  const dp = document.getElementById('driverPortal');
  if (dp) dp.style.display = 'none';
  document.body.classList.remove('driver-portal-active');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginUser').focus();
}

function togglePwVis(inputId, btn) {
  const inp=document.getElementById(inputId);
  if(!inp) return;
  inp.type = inp.type==='password'?'text':'password';
  const circle=btn?.querySelector('svg circle');
  if(circle) circle.setAttribute('r', inp.type==='text'?'1':'3');
}

function bootShell() {
  // Offline layer: remember who is signed in, then replay any edits saved on this device.
  try {
    if (window.GargoOffline) {
      GargoOffline.remember();
      GargoOffline.afterLoad().then(n => {
        if (n) { try { buildBadges(); buildAlerts(); renderSection(state.currentSection); } catch (e) {} }
      });
    }
  } catch (e) { console.warn('Offline init failed:', e); }

  if (isDriver()) {
    document.body.classList.add('driver-portal-active');
    const shellEl = document.getElementById('shell');
    if (shellEl) shellEl.style.display = 'none';
    const dp = document.getElementById('driverPortal');
    if (dp) dp.style.display = 'flex';
    startClock();
    refreshContainerHistory();
    renderDriverPortal();
    startIdleTimer();
    return;
  }
  document.body.classList.remove('driver-portal-active');
  const dp = document.getElementById('driverPortal');
  if (dp) dp.style.display = 'none';
  document.getElementById('shell').style.display='flex';
  updateUserChip();
  startClock();
  applyRoleUI();
  buildBadges();
  buildAlerts();
  subscribeTrackingRealtime();
  subscribeLiveSync();
  startWialonPolling();
  initAutoRefresh();
  const landing = defaultSectionForRole();
  showSection(landing, document.querySelector(`.nav-item[data-section="${landing}"]`));
  populateSelects();
  startIdleTimer();
  startLivePulse();
}

function updateUserChip() {
  const p=state.profile;
  if(!p) return;
  const av=document.getElementById('railUserAv');
  if(av) av.textContent=initials(p.name);
  const nm=document.getElementById('railUserName');
  if(nm) nm.textContent=p.name.split(' ')[0];
  const rl=document.getElementById('railUserRole');
  if(rl) rl.textContent=roleLabel(p.role);
  const tc=document.getElementById('topbarRoleChip');
  if(tc) tc.textContent=roleLabel(p.role);
  const mh=document.getElementById('userMenuHeader');
  if(mh) mh.innerHTML= `<div class="user-menu-header-name">${p.name}</div><div class="user-menu-header-role">${roleLabel(p.role)}</div>`;
}

function roleLabel(r) { const m={ admin:'System Administrator', ops:'Operations Officer', finance:'Finance Manager', hr:'HR Manager', dispatch:'Dispatch Controller', clerk:'Clerk', viewer:'Read-Only Viewer', driver:'Driver' }; return m[r]||r; }

function startClock() {
  const update=()=>{
    const now=new Date();
    const clk=document.getElementById('liveTime');
    if(clk) clk.textContent=now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const td=document.getElementById('todayDate');
    if(td) td.textContent=now.toLocaleDateString('en-KE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
    const dpc=document.getElementById('dp_clock');
    if(dpc) dpc.textContent=now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
    if (isDriver()) renderDutyBar();
  };
  update();
  setInterval(update,1000);
}

async function submitChangePassword() {
  const neu = document.getElementById('cp_new').value;
  const conf = document.getElementById('cp_conf').value;
  const err = document.getElementById('cpError');

  if (!neu || !conf) { err.textContent = 'All fields required'; return; }
  if (neu.length < 6) { err.textContent = 'Password must be at least 6 characters'; return; }
  if (neu !== conf) { err.textContent = 'Passwords do not match'; return; }

  try {
    const { error } = await supabase.auth.updateUser({ password: neu });
    if (error) { err.textContent = 'Failed: ' + error.message; return; }
    addAudit(state.profile.username, 'Password Changed', 'Self-service change');
    closeModal();
    toast('Password updated successfully', 'success');
  } catch (e) {
    err.textContent = 'Connection error';
  }
}