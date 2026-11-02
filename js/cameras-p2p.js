'use strict';

(function () {
  const MAX_VIEWERS = 3;                 
  const MAX_BITRATE = 1200000;
  const HOST_TOPIC = 'p2pcam:host', VIEW_TOPIC = 'p2pcam:view', PIN_TABLE = 'p2p_dashboard_pins';
  const me = Math.random().toString(36).slice(2, 10);
  const $ = id => document.getElementById(id);
  const E = s => (window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const ST = () => (typeof state !== 'undefined' ? state : (window.state || null));   
  const prof = () => (ST() && ST().profile) || null;
  const isAdminUser = () => { const p = prof(); return !!(p && p.role === 'admin' && p.active !== false); };
  const signedIn = () => { const p = prof(); return !!(ST() && ST().currentUser && p && p.role !== 'driver'); };
  const canList = () => { const p = prof(); return !!(p && ['admin', 'ops'].includes(p.role) && p.active !== false); };   // may open the Recordings list
  const audit = (a, d) => { try { if (typeof addAudit === 'function') addAudit(prof() && prof().username, a, d); } catch (e) { } };
  const say = (m, t) => { try { if (typeof toast === 'function') toast(m, t || 'info', 4000); } catch (e) { } };
  const rtcConfig = () => ({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }].concat(((window.GARGO_CONFIG || {}).p2pTurn) || []) });

  let B = null;                          // broadcaster state (this phone)
  const W = { sess: new Map(), seen: new Map(), rooms: [], users: new Set(), ask: null };   // viewer state
  const M = { room: null, err: '' };     // the "Phone cameras" window
  let tab = 'watch';

  /* ───────── styles ───────── */
  const css = document.createElement('style');
  css.textContent = `
  .p2p-vid{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden;border:1px solid var(--border)}
  .p2p-vid video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
  .p2p-tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
  .p2p-room{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);margin-bottom:8px;flex-wrap:wrap}
  .p2p-room b{color:var(--text)} .p2p-room small{display:block;color:var(--text-3);font-size:11px}
  .p2p-dot{width:9px;height:9px;border-radius:50%;background:var(--green,#22c55e);flex:none;animation:p2pPulse 1.6s infinite}
  @keyframes p2pPulse{50%{opacity:.3}}
  .p2p-note{font-size:12px;color:var(--text-3);line-height:1.6;margin-top:8px}
  .p2p-err{color:var(--red,#ef4444);font-size:12.5px;min-height:16px;margin-top:8px;line-height:1.5}
  .p2p-badge{position:absolute;top:8px;left:8px;padding:3px 8px;font:600 10px var(--font-mono,monospace);letter-spacing:.8px;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.65)}
  .p2p-pill{position:fixed;left:14px;bottom:14px;z-index:9999;display:none;align-items:center;gap:8px;padding:9px 14px;border:0;border-radius:999px;background:#b91c1c;color:#fff;font:600 12px var(--font-mono,monospace);letter-spacing:.6px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)}
  .p2p-pill i{width:8px;height:8px;border-radius:50%;background:#fff;animation:p2pPulse 1.2s infinite}
  .p2p-unpin{position:absolute;top:6px;right:6px;z-index:2;width:26px;height:26px;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:13px;cursor:pointer}
  .p2p-unpin:hover{background:#b91c1c}
  #gateCamWall.p2p-has .gc-activate{display:none}
  /* a single feed fills the whole camera area instead of sitting in one small grid cell */
  #gateCamPanel #gateCamWall.p2p-solo{grid-template-columns:1fr}
  #gateCamPanel #gateCamWall.p2p-solo .cam-tile{max-height:75vh}
  .p2p-size{position:absolute;right:8px;bottom:8px;z-index:2;height:26px;padding:0 10px;border:0;background:rgba(0,0,0,.65);color:#fff;font:600 10px var(--font-mono,monospace);letter-spacing:.6px;cursor:pointer}
  .p2p-size:hover{background:rgba(0,0,0,.85)}
  .p2p-rec{position:absolute;top:6px;right:38px;z-index:2;height:26px;padding:0 9px;border:0;background:rgba(0,0,0,.65);color:#fff;font:600 10px var(--font-mono,monospace);letter-spacing:.6px;cursor:pointer}
  .p2p-rec.on{background:#b91c1c}
  .action-btn.p2p-rec-btn.on{background:#b91c1c;color:#fff;border-color:#b91c1c}
  `;
  document.head.appendChild(css);

  const pill = document.createElement('button');
  pill.className = 'p2p-pill';
  pill.innerHTML = '<i></i><span>LIVE · tap to open</span>';
  pill.onclick = () => P2PCAM.open('broadcast');
  document.body.appendChild(pill);


  const LIB_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  let RT = null, rtLoading = null;
  function ensureRT() {
    if (RT) return Promise.resolve(RT);
    if (rtLoading) return rtLoading;
    rtLoading = new Promise((resolve, reject) => {
      const prev = window.supabase;                       
      const el = document.createElement('script');
      el.src = LIB_URL;
      el.onload = () => {
        const lib = window.supabase; window.supabase = prev;
        const c = { supabaseUrl: (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : ''), supabaseAnon: (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '') };
        if (!lib || !lib.createClient || !c.supabaseUrl || !c.supabaseAnon) { rtLoading = null; return reject(new Error('Camera signaling could not start (missing Supabase settings).')); }
        RT = lib.createClient(c.supabaseUrl, c.supabaseAnon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        try { supabase.auth.onAuthStateChange((ev, sess) => { if (RT && sess && sess.access_token) RT.realtime.setAuth(sess.access_token); }); } catch (e) { }
        resolve(RT);
      };
      el.onerror = () => { window.supabase = prev; rtLoading = null; reject(new Error('Could not load the signaling library. Check the internet connection.')); };
      document.head.appendChild(el);
    });
    return rtLoading;
  }
  async function joinChannel(topic, setup) {
    const client = await ensureRT();
    const sess = (await supabase.auth.getSession()).data.session;
    if (!sess) throw new Error('Sign in again.');
    client.realtime.setAuth(sess.access_token);
    return new Promise((resolve, reject) => {
      const ch = client.channel(topic, { config: { private: true, broadcast: { self: false }, presence: { key: me } } });
      setup && setup(ch);
      const t = setTimeout(() => reject(new Error('Realtime timed out. Check your connection.')), 12000);
      ch.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') { clearTimeout(t); resolve(ch); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(t);
          reject(new Error((err && err.message) || ('Realtime ' + status + '. Your account may not be allowed to use cameras.')));
        }
      });
    });
  }
  const send = (ch, event, payload) => ch.send({ type: 'broadcast', event, payload });
  const drop = ch => { try { if (ch && RT) RT.removeChannel(ch); } catch (e) { } };

  /* One pair of channels per page, shared by the broadcaster, the dashboard and the window. */
  let CH = null, chLoading = null;
  function ensureChannels() {
    if (CH) return Promise.resolve(CH);
    if (chLoading) return chLoading;
    chLoading = (async () => {
      const V = await joinChannel(VIEW_TOPIC, ch => {              // messages from viewers (we are the phone)
        ch.on('broadcast', { event: 'join' }, ({ payload }) => onJoin(payload));
        ch.on('broadcast', { event: 'answer' }, ({ payload }) => onAnswer(payload));
        ch.on('broadcast', { event: 'ice' }, ({ payload }) => onViewerIce(payload));
        ch.on('broadcast', { event: 'bye' }, ({ payload }) => onBye(payload));
        ch.on('broadcast', { event: 'whois' }, () => beacon());
      });
      let H;
      try {
        H = await joinChannel(HOST_TOPIC, ch => {                  // messages from phones (we are a viewer)
          ch.on('presence', { event: 'sync' }, refreshRooms);
          ch.on('broadcast', { event: 'here' }, ({ payload }) => { if (payload && payload.room) { W.seen.set(payload.room, Object.assign({}, payload, { at: Date.now() })); refreshRooms(); } });
          ch.on('broadcast', { event: 'offer' }, ({ payload }) => onOffer(payload));
          ch.on('broadcast', { event: 'ice' }, ({ payload }) => onHostIce(payload));
          ch.on('broadcast', { event: 'full' }, ({ payload }) => onFull(payload));
          ch.on('broadcast', { event: 'pins' }, () => { refreshPins().then(() => dashTick()); });
        });
      } catch (e) { drop(V); throw e; }
      CH = { H, V };
      return CH;
    })();
    chLoading.then(() => { chLoading = null; }, () => { chLoading = null; });
    return chLoading;
  }

  /* ───────── BROADCASTER (admin phone) ───────── */
  async function getStream(facing, withAudio) {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
      audio: !!withAudio
    });
  }
  async function holdAwake() { try { if (navigator.wakeLock && B) B.wake = await navigator.wakeLock.request('screen'); } catch (e) { } }
  document.addEventListener('visibilitychange', () => { if (B && document.visibilityState === 'visible') holdAwake(); });

  async function startBroadcast() {
    const err = $('p2pErr'), btn = $('p2pStart');
    const name = ($('p2pName').value || '').trim() || 'Phone camera';
    const facing = $('p2pFacing').value, audio = $('p2pAudio').checked, pin = $('p2pPinStart').checked;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { err.textContent = 'This browser cannot use the camera here. Open the portal over https in Chrome or Safari.'; return; }
    btn.disabled = true; err.textContent = '';
    let stream;
    try { stream = await getStream(facing, audio); }
    catch (e) { btn.disabled = false; err.textContent = 'Camera blocked or unavailable: ' + (e.message || e.name) + '. Allow camera access for this site and try again.'; return; }
    B = { stream, name, room: 'r' + me, facing, audio, peers: new Map(), wake: null, startedAt: Date.now(), beat: null };
    try {
      await ensureChannels();
      await CH.H.track({ room: B.room, name, by: (prof() && prof().name) || 'Admin', since: new Date(B.startedAt).toISOString() });
    } catch (e) {
      stopBroadcast();
      const m = $('p2pErr'); if (m) m.textContent = 'Could not go live: ' + e.message;
      return;
    }
    beacon(); B.beat = setInterval(beacon, 5000);
    holdAwake();
    audit('Phone camera live', name);
    pill.style.display = 'flex';
    if (pin) setPin(name, true);
    render();
  }

  function beacon() {
    if (!B || !CH) return;
    try { send(CH.H, 'here', { room: B.room, name: B.name, by: (prof() && prof().name) || 'Admin', since: new Date(B.startedAt).toISOString(), key: me }); } catch (e) { }
  }

  async function onJoin(p) {
    if (!B || !CH || !p || p.room !== B.room || !p.from) return;
    closePeer(p.from);
    if (B.peers.size >= MAX_VIEWERS) { send(CH.H, 'full', { to: p.from, room: B.room, gen: p.gen }); return; }
    const pc = new RTCPeerConnection(rtcConfig());
    const peer = { pc, queue: [], gen: p.gen };
    B.peers.set(p.from, peer);
    B.stream.getTracks().forEach(t => pc.addTrack(t, B.stream));
    pc.onicecandidate = e => { if (e.candidate && B && B.peers.get(p.from) === peer) send(CH.H, 'ice', { to: p.from, from: me, room: B.room, gen: p.gen, c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) { if (B && B.peers.get(p.from) === peer) closePeer(p.from); }
      else updateCount();
    };
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      pc.getSenders().forEach(s => {
        if (!s.track || s.track.kind !== 'video') return;
        try { const prm = s.getParameters(); prm.encodings = prm.encodings && prm.encodings.length ? prm.encodings : [{}]; prm.encodings[0].maxBitrate = MAX_BITRATE; s.setParameters(prm); } catch (e) { }
      });
      send(CH.H, 'offer', { to: p.from, from: me, room: B.room, gen: p.gen, sdp: pc.localDescription.toJSON() });
    } catch (e) { console.warn('p2p offer failed', e); closePeer(p.from); }
    updateCount();
  }
  async function onAnswer(p) {
    if (!B || !p || p.to !== me) return;
    const peer = B.peers.get(p.from); if (!peer || peer.gen !== p.gen) return;
    try {
      await peer.pc.setRemoteDescription(p.sdp);
      for (const c of peer.queue.splice(0)) await peer.pc.addIceCandidate(c).catch(() => { });
    } catch (e) { console.warn('p2p answer failed', e); closePeer(p.from); }
  }
  async function onViewerIce(p) {
    if (!B || !p || p.to !== me) return;
    const peer = B.peers.get(p.from); if (!peer || peer.gen !== p.gen) return;
    if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(p.c).catch(() => { });
    else peer.queue.push(p.c);
  }
  function onBye(p) {
    if (!B || !p || !p.from) return;
    const peer = B.peers.get(p.from);
    if (peer && (!p.gen || peer.gen === p.gen)) closePeer(p.from);
  }
  function closePeer(id) {
    if (!B || !id) return;
    const peer = B.peers.get(id); if (!peer) return;
    B.peers.delete(id);
    try { peer.pc.close(); } catch (e) { }
    updateCount();
  }
  function updateCount() {
    const el = $('p2pCount');
    if (el && B) {
      const live = [...B.peers.values()].filter(p => p.pc.connectionState === 'connected').length;
      el.textContent = live + ' watching' + (B.peers.size > live ? ' · ' + (B.peers.size - live) + ' connecting' : '') + ' (max ' + MAX_VIEWERS + ')';
    }
  }

  async function switchCamera() {
    if (!B) return;
    const next = B.facing === 'environment' ? 'user' : 'environment';
    try {
      const ns = await getStream(next, B.audio);
      const nv = ns.getVideoTracks()[0];
      B.peers.forEach(({ pc }) => pc.getSenders().forEach(s => { if (s.track && s.track.kind === 'video') s.replaceTrack(nv); }));
      B.stream.getTracks().forEach(t => t.stop());
      B.stream = ns; B.facing = next;
      const v = $('p2pPreview'); if (v) v.srcObject = ns;
    } catch (e) { const m = $('p2pErr'); if (m) m.textContent = 'Could not switch camera: ' + e.message; }
  }

  function stopBroadcast() {
    if (!B) return;
    const b = B; B = null; clearInterval(b.beat);
    try { b.peers.forEach(p => p.pc.close()); } catch (e) { }
    try { if (CH) CH.H.untrack(); } catch (e) { }
    try { b.stream.getTracks().forEach(t => t.stop()); } catch (e) { }
    try { b.wake && b.wake.release(); } catch (e) { }
    pill.style.display = 'none';
    audit('Phone camera stopped', b.name);
    if ($('p2pRoot')) render();
  }

  /* ───────── VIEWER: finding cameras ───────── */
  const roomsFromPresence = () => {
    const out = [];
    if (!CH) return out;
    try { Object.entries(CH.H.presenceState()).forEach(([key, metas]) => { const m = metas[metas.length - 1]; if (m && m.room) out.push({ key, room: m.room, name: m.name, by: m.by, since: m.since }); }); } catch (e) { }
    return out;
  };
  const mergedRooms = () => {
    const out = [], seen = new Set();
    const add = r => { if (r && r.room && !seen.has(r.room)) { seen.add(r.room); out.push(r); } };
    roomsFromPresence().forEach(add);
    W.seen.forEach(r => { if (Date.now() - r.at < 16000) add(r); });
    return out;
  };
  const roomLive = room => W.rooms.some(r => r.room === room);

  function refreshRooms() {
    W.rooms = mergedRooms();
    [...W.sess.values()].forEach(s => {
      if (roomLive(s.room)) return;
      destroySession(s);
      if (M.room === s.room) { M.room = null; M.err = 'The camera went offline.'; }
    });
    notify();
  }

  async function viewerOn(consumer) {
    W.users.add(consumer);
    await ensureChannels();
    if (!W.ask) {
      send(CH.V, 'whois', { from: me });
      W.ask = setInterval(() => { if (!CH) return; send(CH.V, 'whois', { from: me }); refreshRooms(); }, 4000);
    }
    refreshRooms();
  }
  function viewerOff(consumer) {
    W.users.delete(consumer);
    if (!W.users.size) { clearInterval(W.ask); W.ask = null; }
  }

  /* ───────── VIEWER: one connection per camera, shared by the window and the dashboard ───────── */
  let genN = 0;
  function openSession(room, consumer) {
    let s = W.sess.get(room);
    if (!s) { s = { room, pc: null, stream: null, state: 'wait', msg: 'Connecting…', users: new Set(), queue: [], hostId: null, gen: '', timer: null, retry: null, route: '' }; W.sess.set(room, s); connectSession(s); }
    s.users.add(consumer);
    return s;
  }
  function closeSession(room, consumer) {
    const s = W.sess.get(room); if (!s) return;
    s.users.delete(consumer);
    if (!s.users.size) destroySession(s);
  }
  function teardownPc(s) {
    clearTimeout(s.timer);
    if (s.pc) { const pc = s.pc; s.pc = null; pc.ontrack = null; pc.onconnectionstatechange = null; pc.onicecandidate = null; try { pc.close(); } catch (e) { } }
  }
  function destroySession(s) {
    clearTimeout(s.retry);
    try { if (CH && s.hostId) send(CH.V, 'bye', { from: me, room: s.room, gen: s.gen }); } catch (e) { }
    teardownPc(s);
    W.sess.delete(s.room);
    notify();
  }
  function setSess(s, state, msg) { s.state = state; s.msg = msg; notify(); }
  function failSession(s, msg) {
    teardownPc(s); s.stream = null; s.hostId = null;
    setSess(s, 'off', msg);
    clearTimeout(s.retry);
    s.retry = setTimeout(() => { if (W.sess.get(s.room) === s && s.users.size && roomLive(s.room) && CH) connectSession(s); }, 15000);
  }

  function connectSession(s) {
    clearTimeout(s.retry); teardownPc(s);
    s.gen = (++genN) + '-' + me; s.queue = []; s.hostId = null; s.stream = null; s.route = '';
    setSess(s, 'wait', 'Connecting…');
    const pc = new RTCPeerConnection(rtcConfig()); s.pc = pc;
    pc.ontrack = e => { s.stream = e.streams[0]; notify(); };
    pc.onicecandidate = e => { if (e.candidate && s.pc === pc && s.hostId && CH) send(CH.V, 'ice', { to: s.hostId, from: me, room: s.room, gen: s.gen, c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = async () => {
      if (s.pc !== pc) return;
      if (pc.connectionState === 'connected') {
        clearTimeout(s.timer);
        s.route = await connectionRoute(pc);
        if (s.pc === pc) setSess(s, 'live', 'Live' + (s.route ? ' · ' + s.route : ''));
      } else if (pc.connectionState === 'failed') failSession(s, 'Connection lost. Retrying…');
    };
    s.timer = setTimeout(() => { if (s.pc === pc && pc.connectionState !== 'connected') failSession(s, 'No video. This network may block direct connections, so a TURN relay may be needed.'); }, 20000);
    if (CH) send(CH.V, 'join', { room: s.room, from: me, gen: s.gen });
  }

  async function onOffer(p) {
    if (!p || p.to !== me) return;
    const s = W.sess.get(p.room); if (!s || !s.pc || p.gen !== s.gen) return;
    s.hostId = p.from;
    try {
      await s.pc.setRemoteDescription(p.sdp);
      for (const x of s.queue.splice(0)) await s.pc.addIceCandidate(x).catch(() => { });
      const ans = await s.pc.createAnswer();
      await s.pc.setLocalDescription(ans);
      send(CH.V, 'answer', { to: p.from, from: me, room: s.room, gen: s.gen, sdp: s.pc.localDescription.toJSON() });
    } catch (e) { failSession(s, 'Connection failed. Retrying…'); }
  }
  async function onHostIce(p) {
    if (!p || p.to !== me) return;
    const s = W.sess.get(p.room); if (!s || !s.pc || p.gen !== s.gen || p.from !== s.hostId) return;
    if (s.pc.remoteDescription) await s.pc.addIceCandidate(p.c).catch(() => { });
    else s.queue.push(p.c);
  }
  function onFull(p) {
    if (!p || p.to !== me) return;
    const s = W.sess.get(p.room); if (!s || p.gen !== s.gen) return;
    failSession(s, 'Camera busy (' + MAX_VIEWERS + ' viewers already). Retrying…');
  }
  async function connectionRoute(pc) {
    try {
      const stats = await pc.getStats(); let pairId = null; const byId = {};
      stats.forEach(r => { byId[r.id] = r; if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId; });
      let pair = pairId ? byId[pairId] : null;
      if (!pair) stats.forEach(r => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
      const l = pair && byId[pair.localCandidateId], r2 = pair && byId[pair.remoteCandidateId];
      if (!l || !r2) return '';
      return (l.candidateType === 'relay' || r2.candidateType === 'relay') ? 'via relay' : 'direct';
    } catch (e) { return ''; }
  }
  function attach(video, stream) {
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    const p = video.play(); if (p && p.catch) p.catch(() => { });
  }

  /* ───────── pins: which cameras the administrator put on the dashboard ───────── */
  const D = { pins: new Set(), pinsAt: 0, tiles: new Map(), box: null, on: false, failAt: 0 };

  async function refreshPins() {
    D.pinsAt = Date.now();
    try {
      const { data, error } = await supabase.from(PIN_TABLE).select('name');
      if (error) throw error;
      D.pins = new Set((data || []).map(r => r.name));
    } catch (e) { console.warn('p2p pins', e && e.message); }
  }
  async function setPin(name, on) {
    if (!isAdminUser() || !name) return false;
    const r = on ? await supabase.from(PIN_TABLE).upsert({ name }, { onConflict: 'name', ignoreDuplicates: true })
                 : await supabase.from(PIN_TABLE).delete().eq('name', name);
    if (r.error) { say('Could not update the dashboard: ' + r.error.message, 'error'); return false; }
    on ? D.pins.add(name) : D.pins.delete(name);
    audit(on ? 'Phone camera shown on dashboard' : 'Phone camera removed from dashboard', name);
    try { const c = await ensureChannels(); send(c.H, 'pins', {}); } catch (e) { }   // tell open dashboards to update now
    dashTick(); notify();
    return true;
  }

  /* ───────── dashboard wall ───────── */
  const inView = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight); };

  function dashHost() {
    const wall = $('gateCamWall'); if (!wall) return null;
    if (!D.box) { D.box = document.createElement('div'); D.box.id = 'p2pDash'; D.box.style.display = 'contents'; }
    if (D.box.parentNode !== wall) wall.insertBefore(D.box, wall.firstChild);   // cameras.js rebuilds the wall now and then; put ours back
    return wall;
  }

  function makeTile(key, w) {
    const el = document.createElement('div');
    el.className = 'cam-tile p2p-tile';
    el.innerHTML = '<video muted playsinline autoplay></video><div class="cam-shade"></div>' +
      '<div class="cam-meta"><b>' + E(w.name) + '</b><span>Phone camera' + (w.by ? ' · ' + E(w.by) : '') + '</span></div>' +
      '<div class="cam-state" data-s="wait">Connecting…</div>' +
      (isAdminUser() ? '<button class="p2p-unpin" title="Remove from dashboard">✕</button>' : '') + recBtn(w.room, w.name, true);
    const t = { key, el, video: el.querySelector('video'), name: w.name, room: w.room, opened: false };
    el.addEventListener('click', () => {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
    });
    const x = el.querySelector('.p2p-unpin');
    if (x) x.addEventListener('click', e => { e.stopPropagation(); if (confirm('Remove "' + w.name + '" from the dashboard?')) setPin(w.name, false); });
    return t;
  }

  function paintTile(t) {
    const st = t.el.querySelector('.cam-state');
    let s, text, hint = '';
    if (!t.room) { s = 'idle'; text = 'Waiting for phone'; hint = 'This camera is chosen for the dashboard but is not live right now.'; }
    else if (B && B.room === t.room) { s = 'live'; text = 'Live · this phone'; attach(t.video, B.stream); }
    else {
      const x = W.sess.get(t.room);
      if (!x) { s = 'wait'; text = 'Connecting…'; }
      else { s = x.state === 'live' ? 'live' : x.state === 'wait' ? 'wait' : 'off'; text = x.msg; attach(t.video, x.stream); if (x.state === 'off') hint = x.msg; }
    }
    st.dataset.s = s; st.textContent = text; t.el.title = hint;
    t.el.classList.toggle('cam-down', s === 'idle' || s === 'off');
  }

  function dashStop() {
    if (!D.on && !D.tiles.size) return;
    D.tiles.forEach(t => { if (t.room && t.opened) closeSession(t.room, 'dash'); t.el.remove(); });
    D.tiles.clear();
    if (D.box && D.box.parentNode) D.box.remove();
    const wall = $('gateCamWall'); if (wall) wall.classList.remove('p2p-has');
    if (D.on) { D.on = false; viewerOff('dash'); }
  }

  function dashTick() {
    if (!camReady) return;                                        // cameras start after the app has finished loading
    const wall = $('gateCamWall'), panel = $('gateCamPanel');
    const show = signedIn() && wall && panel && panel.style.display !== 'none' && !document.hidden && inView(wall);
    if (!show) { dashStop(); return; }
    if (Date.now() - D.pinsAt > 10000) refreshPins().then(() => dashTick());
    if (!D.pins.size) { dashStop(); return; }                      // nothing chosen: do not even open the signaling channels
    if (!D.on) {
      if (Date.now() < D.failAt) return;
      D.on = true;
      viewerOn('dash').then(() => dashTick()).catch(e => { console.warn('p2p dashboard', e && e.message); D.on = false; D.failAt = Date.now() + 30000; viewerOff('dash'); });
    }
    if (!CH) return;
    dashHost();
    const want = new Map();
    D.pins.forEach(n => { const r = W.rooms.find(x => x.name === n); want.set(r ? r.room : 'pin:' + n, { name: n, room: r ? r.room : null, by: r && r.by }); });
    D.tiles.forEach((t, k) => { if (!want.has(k)) { if (t.room && t.opened) closeSession(t.room, 'dash'); t.el.remove(); D.tiles.delete(k); } });
    want.forEach((w, k) => {
      let t = D.tiles.get(k);
      if (!t) { t = makeTile(k, w); D.tiles.set(k, t); D.box.appendChild(t.el); }
      if (w.room && !t.opened) { t.opened = true; if (!(B && B.room === w.room)) openSession(w.room, 'dash'); }
    });
    D.tiles.forEach(paintTile);
    wall.classList.toggle('p2p-has', D.tiles.size > 0);
  }
  /* one feed (gateway camera or phone) = one big tile; two or more = the grid divides the screen */
  function layoutTick() {
    const wall = $('gateCamWall'); if (!wall || document.hidden) return;
    const tiles = wall.querySelectorAll('.cam-tile'), one = tiles.length === 1;
    let reduced = false; try { reduced = localStorage.getItem('gargo_cam_solo_reduced') === '1'; } catch (e) { }
    wall.classList.toggle('p2p-solo', one && !reduced);
    wall.querySelectorAll('.p2p-size').forEach(b => { if (!one || b.parentNode !== tiles[0]) b.remove(); });
    if (!one) return;
    let b = tiles[0].querySelector('.p2p-size');
    if (!b) {
      b = document.createElement('button'); b.className = 'p2p-size';
      b.addEventListener('click', e => {
        e.stopPropagation();
        let r = false; try { r = localStorage.getItem('gargo_cam_solo_reduced') === '1'; localStorage.setItem('gargo_cam_solo_reduced', r ? '0' : '1'); } catch (x) { r = wall.classList.contains('p2p-solo') ? false : true; }
        layoutTick();
      });
      tiles[0].appendChild(b);
    }
    b.textContent = reduced ? '⤢ Enlarge' : '⤡ Reduce';
    b.title = reduced ? 'Make the camera fill the whole area' : 'Make the camera smaller';
  }
  setInterval(layoutTick, 1000);
  setInterval(dashTick, 3000);
  setTimeout(dashTick, 6000);

  /* ───────── the "Phone cameras" window ───────── */
  function notify() { try { paintWatch(); } catch (e) { } try { D.tiles.size && D.tiles.forEach(paintTile); } catch (e) { } }

  function frame(inner) {
    const r = $('p2pRoot'); if (!r) return;
    const canB = isAdminUser();
    r.innerHTML = `<div class="p2p-tabs">
      <button class="action-btn ${tab === 'watch' ? '' : 'ghost'}" data-tab="watch">Watch phone cameras</button>
      ${canB ? `<button class="action-btn ${tab === 'broadcast' ? '' : 'ghost'}" data-tab="broadcast">Use this phone as a camera</button>` : ''}
      ${canList() ? `<button class="action-btn ${tab === 'rec' ? '' : 'ghost'}" data-tab="rec">Recordings</button>` : ''}
    </div><div id="p2pBody">${inner}</div>`;
    r.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  }

  function render() {
    if (!$('p2pRoot')) return;
    if (tab === 'broadcast' && !isAdminUser()) tab = 'watch';
    if (tab === 'rec' && !canList()) tab = 'watch';
    if (tab === 'broadcast') renderBroadcast();
    else if (tab === 'rec') renderRecordings();
    else {
      frame('');
      M.err = '';
      refreshPins().then(paintWatch);
      paintWatch('Looking for live phone cameras…');
      viewerOn('modal').catch(e => { M.err = 'Could not connect: ' + e.message; paintWatch(); });
    }
  }

  function renderBroadcast() {
    if (B) {
      frame(`<div class="p2p-vid"><video id="p2pPreview" autoplay muted playsinline></video><div class="p2p-badge">● Live · ${E(B.name)}</div></div>
        <div id="p2pCount" style="margin:10px 0;font-size:13px;color:var(--text-2)"></div>
        <label class="gc-chk"><input type="checkbox" id="p2pPinOwn"> Show this camera on the main dashboard</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${recBtn(B.room, B.name, false)}<button class="action-btn ghost" id="p2pFlip">Switch camera</button><button class="action-btn" id="p2pStop" style="background:#b91c1c">Stop broadcast</button></div>
        <div id="p2pErr" class="p2p-err"></div>
        <div class="p2p-note">Keep this screen open and the phone charging. Closing this window keeps the broadcast running; use the red LIVE button to come back.</div>`);
      $('p2pPreview').srcObject = B.stream;
      $('p2pFlip').onclick = switchCamera; $('p2pStop').onclick = stopBroadcast;
      const c = $('p2pPinOwn');
      c.onchange = async () => { const ok = await setPin(B.name, c.checked); if (!ok) c.checked = !c.checked; };
      refreshPins().then(() => { const x = $('p2pPinOwn'); if (x && B) x.checked = D.pins.has(B.name); });
      updateCount();
      return;
    }
    frame(`<div class="form-row-2">
        <div class="fg"><label>Camera name</label><input id="p2pName" maxlength="40" placeholder="e.g. Gate A (phone)" value="Phone camera"></div>
        <div class="fg"><label>Which camera</label><select id="p2pFacing"><option value="environment">Back camera</option><option value="user">Front camera</option></select></div>
      </div>
      <label class="gc-chk" style="margin-top:8px"><input type="checkbox" id="p2pAudio"> Include sound</label>
      <label class="gc-chk"><input type="checkbox" id="p2pPinStart"> Show on the main dashboard once live</label>
      <div id="p2pErr" class="p2p-err"></div>
      <button class="action-btn" id="p2pStart">Go live</button>
      <div class="p2p-note">Video goes straight from this phone to each viewer (up to ${MAX_VIEWERS} at once, dashboards included). Only signed-in staff can watch. Use Wi-Fi or good mobile data and keep the phone charging. Give each camera its own name: the dashboard remembers cameras by name.</div>`);
    $('p2pStart').onclick = startBroadcast;
  }

  function paintWatch(info) {
    const body = $('p2pBody'); if (!body || tab !== 'watch') return;
    if (M.room) {
      const s = W.sess.get(M.room);
      if (s) return paintStage(s);
      M.room = null;
    }
    const rooms = W.rooms.filter(r => !(B && r.room === B.room));
    const admin = isAdminUser();
    body.innerHTML = `<div id="p2pRooms">${rooms.length ? rooms.map(r => `<div class="p2p-room"><span class="p2p-dot"></span>
        <div style="flex:1;min-width:140px"><b>${E(r.name || 'Phone camera')}</b><small>${E(r.by || '')}${r.since ? ' · live since ' + new Date(r.since).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}</small></div>
        ${admin ? `<button class="action-btn ghost" data-pin="${E(r.name || '')}">${D.pins.has(r.name) ? 'On dashboard ✓ (remove)' : 'Show on dashboard'}</button>` : ''}
        <button class="action-btn" data-watch="${E(r.room)}">Watch</button></div>`).join('')
        : `<div class="gc-empty" style="min-height:90px">${E(info || 'No phone cameras are live. An admin can open this screen on a phone and press Go live.')}</div>`}</div>
      ${M.err ? `<div class="p2p-err">${E(M.err)}</div>` : ''}`;
    body.querySelectorAll('[data-watch]').forEach(b => b.onclick = () => { M.err = ''; M.room = b.dataset.watch; openSession(M.room, 'modal'); paintWatch(); });
    body.querySelectorAll('[data-pin]').forEach(b => b.onclick = async () => { b.disabled = true; await setPin(b.dataset.pin, !D.pins.has(b.dataset.pin)); paintWatch(); });
  }

  function paintStage(s) {
    const body = $('p2pBody'); if (!body) return;
    if (!$('p2pStage')) {
      const room = W.rooms.find(r => r.room === s.room) || {};
      const admin = isAdminUser();
      body.innerHTML = `<div id="p2pStage"><div class="p2p-vid" id="p2pBox"><video id="p2pRemote" autoplay muted playsinline></video><div class="p2p-badge" id="p2pStatus"></div></div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center"><b style="color:var(--text)">${E(room.name || 'Phone camera')}</b><span style="flex:1"></span>
        ${admin ? `<button class="action-btn ghost" id="p2pPinBtn"></button>` : ''}${recBtn(s.room, room.name, false)}
        <button class="action-btn ghost" id="p2pSound">Sound on</button><button class="action-btn ghost" id="p2pFull">Full screen</button><button class="action-btn" id="p2pBack">Stop watching</button></div></div>`;
      $('p2pBack').onclick = () => { closeSession(M.room, 'modal'); M.room = null; paintWatch(); };
      $('p2pFull').onclick = () => { const b = $('p2pBox'); (b.requestFullscreen || b.webkitRequestFullscreen || (() => { })).call(b); };
      $('p2pSound').onclick = () => { const v = $('p2pRemote'); v.muted = !v.muted; $('p2pSound').textContent = v.muted ? 'Sound on' : 'Sound off'; v.play().catch(() => { }); };
      const pb = $('p2pPinBtn');
      if (pb) pb.onclick = async () => { pb.disabled = true; await setPin(room.name, !D.pins.has(room.name)); pb.disabled = false; paintStage(s); };
    }
    const room = W.rooms.find(r => r.room === s.room) || {};
    const pb = $('p2pPinBtn'); if (pb) pb.textContent = D.pins.has(room.name) ? 'On dashboard ✓ (remove)' : 'Show on dashboard';
    const st = $('p2pStatus'); if (st) st.textContent = s.msg;
    attach($('p2pRemote'), s.stream);
  }



  const REC_BUCKET = 'camera-recordings', REC_SEG_MS = 5 * 60 * 1000, REC_BPS = 900000;
  const R = new Map();                    // room -> active recording
  const slug = x => String(x || 'camera').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'camera';
  const pickMime = () => { if (!window.MediaRecorder) return null; return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || ''; };
  const streamFor = room => (B && B.room === room) ? B.stream : ((W.sess.get(room) || {}).stream || null);
  const liveTrack = st => { const t = st && st.getVideoTracks()[0]; return t && t.readyState === 'live'; };
  const recBtn = (room, name, compact) => isAdminUser() && room
    ? `<button class="${compact ? 'p2p-rec' : 'action-btn ghost p2p-rec-btn'}" data-rec="${E(room)}" data-name="${E(name || 'Phone camera')}" data-compact="${compact ? 1 : 0}">${compact ? '● REC' : '● Record'}</button>` : '';

  function startRec(room, name) {
    if (!isAdminUser() || R.has(room)) return;
    const st = streamFor(room);
    if (!liveTrack(st)) { say('Nothing to record yet. Wait until the picture is live.', 'info'); return; }
    const mime = pickMime();
    if (mime === null) { say('This browser cannot record video.', 'error'); return; }
    const rec = { room, name: name || 'Phone camera', mime, start: Date.now(), segStart: 0, mr: null, keep: true, timer: null };
    R.set(room, rec); audit('Recording started', rec.name);
    segStart(rec); recTick();
  }
  function segStart(rec) {
    const st = streamFor(rec.room);
    if (!liveTrack(st)) return endRec(rec);
    const chunks = []; let mr;
    try { mr = new MediaRecorder(st, rec.mime ? { mimeType: rec.mime, videoBitsPerSecond: REC_BPS } : { videoBitsPerSecond: REC_BPS }); }
    catch (e) { say('Could not start recording: ' + e.message, 'error'); return endRec(rec); }
    rec.mr = mr; rec.segStart = Date.now();
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      clearTimeout(rec.timer);
      saveSeg(rec, new Blob(chunks, { type: mr.mimeType || rec.mime || 'video/webm' }), rec.segStart, Date.now());
      if (R.get(rec.room) !== rec) return;
      if (rec.keep) resumeWhenLive(rec, 0); else endRec(rec);
    };
    mr.start(2000);
    rec.timer = setTimeout(() => { try { if (mr.state !== 'inactive') mr.stop(); } catch (e) { } }, REC_SEG_MS);
  }
  function resumeWhenLive(rec, n) {                       // the piece ended (5 min up, or the feed reconnected): carry on when video is back
    if (R.get(rec.room) !== rec) return;
    if (liveTrack(streamFor(rec.room))) return segStart(rec);
    if (n > 15) { say('Recording ended: the camera went offline.', 'info'); return endRec(rec); }
    setTimeout(() => resumeWhenLive(rec, n + 1), 2000);
  }
  function stopRec(room) {
    const rec = R.get(room); if (!rec) return;
    rec.keep = false;
    try { if (rec.mr && rec.mr.state !== 'inactive') rec.mr.stop(); else endRec(rec); } catch (e) { endRec(rec); }
  }
  function endRec(rec) { clearTimeout(rec.timer); if (R.get(rec.room) === rec) { R.delete(rec.room); audit('Recording stopped', rec.name); } recTick(); }
  const stopAllRec = () => [...R.keys()].forEach(stopRec);

  async function saveSeg(rec, blob, t0, t1) {
    if (!blob.size || t1 - t0 < 1500) return;
    const type = (blob.type || 'video/webm').split(';')[0], ext = /mp4/.test(type) ? 'mp4' : 'webm';
    const d = new Date(t0), stamp = d.toISOString().replace(/[:.]/g, '-').slice(0, 19), fname = slug(rec.name) + '_' + stamp + '.' + ext;
    try {                                                  // 1. this device
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { console.warn('p2p local save', e); }
    const path = slug(rec.name) + '/' + d.toISOString().slice(0, 10) + '/' + fname;
    try {                                                  // 2. the cloud bucket
      const up = await supabase.storage.from(REC_BUCKET).upload(path, blob, { contentType: type, upsert: false });
      if (up.error) throw up.error;
      const ins = await supabase.from('p2p_recordings').insert({ camera_name: rec.name, path, started_at: d.toISOString(), duration_s: Math.round((t1 - t0) / 1000), size_bytes: blob.size, mime: type });
      if (ins.error) throw ins.error;
      say('Recording saved to this device and the cloud: ' + fname, 'success');
    } catch (e) { say('Saved to this device, but the cloud upload failed: ' + ((e && e.message) || e), 'error'); }
  }

  function recTick() {
    if (document.hidden) return;
    document.querySelectorAll('[data-rec]').forEach(el => {
      const rec = R.get(el.dataset.rec), compact = el.dataset.compact === '1';
      const sec = rec ? Math.floor((Date.now() - rec.start) / 1000) : 0;
      const mm = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
      el.classList.toggle('on', !!rec);
      el.textContent = rec ? (compact ? '■ ' + mm : '■ Stop recording · ' + mm) : (compact ? '● REC' : '● Record');
    });
  }
  setInterval(recTick, 1000);
  document.addEventListener('click', e => {               // capture phase: a tap on Record must not also open the tile full screen
    const b = e.target.closest && e.target.closest('[data-rec]'); if (!b) return;
    e.stopPropagation(); e.preventDefault();
    if (!isAdminUser()) return;
    R.has(b.dataset.rec) ? stopRec(b.dataset.rec) : startRec(b.dataset.rec, b.dataset.name);
  }, true);
  window.addEventListener('beforeunload', e => { if (R.size) { e.preventDefault(); e.returnValue = ''; } });

  /* Recordings tab: admins and operations */
  const fmtLen = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  async function renderRecordings() {
    frame('<div id="p2pRecList" style="font-size:13px;color:var(--text-2)">Loading…</div>');
    const { data, error } = await supabase.from('p2p_recordings').select('*').order('started_at', { ascending: false }).limit(100);
    const host = $('p2pRecList'); if (!host) return;
    if (error) { host.innerHTML = `<div class="p2p-err">${E(error.message)}</div>`; return; }
    const admin = isAdminUser();
    const rows = (data || []).map(r => `<tr><td>${E(r.camera_name)}</td><td>${E(new Date(r.started_at).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td>
      <td>${fmtLen(r.duration_s || 0)}</td><td>${fmtSize(r.size_bytes || 0)}</td>
      <td style="text-align:right;white-space:nowrap"><button class="action-btn ghost" data-play="${E(r.path)}">Play</button> <button class="action-btn ghost" data-dl="${E(r.path)}">Download</button>${admin ? ` <button class="action-btn ghost" data-del="${E(r.id)}" data-path="${E(r.path)}">Delete</button>` : ''}</td></tr>`).join('');
    host.innerHTML = `<div id="p2pPlayer"></div><div class="table-wrap" style="overflow-x:auto"><table class="data-table"><thead><tr><th>Camera</th><th>Started</th><th>Length</th><th>Size</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:18px">No recordings yet</td></tr>'}</tbody></table></div>
      <div class="p2p-note">Recordings are cut into 5-minute pieces and kept until an administrator deletes them.</div>`;
    const signed = async (path, opt) => { const r = await supabase.storage.from(REC_BUCKET).createSignedUrl(path, 3600, opt); if (r.error) { say(r.error.message, 'error'); return null; } return r.data.signedUrl; };
    host.querySelectorAll('[data-play]').forEach(b => b.onclick = async () => { const u = await signed(b.dataset.play); if (u && $('p2pPlayer')) $('p2pPlayer').innerHTML = `<video controls autoplay playsinline src="${E(u)}" style="width:100%;max-height:50vh;background:#000;margin-bottom:12px"></video>`; });
    host.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { const u = await signed(b.dataset.dl, { download: b.dataset.dl.split('/').pop() }); if (u) { const a = document.createElement('a'); a.href = u; document.body.appendChild(a); a.click(); a.remove(); } });
    host.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this recording permanently?')) return;
      const x = await supabase.storage.from(REC_BUCKET).remove([b.dataset.path]);
      if (x.error) { say(x.error.message, 'error'); return; }
      await supabase.from('p2p_recordings').delete().eq('id', b.dataset.del);
      audit('Recording deleted', b.dataset.path); renderRecordings();
    });
  }

  /* ───────── entry points ───────── */
  let modalPoll = null;
  const P2PCAM = {
    open(mode) {
      if (!signedIn()) return;
      tab = mode === 'broadcast' && isAdminUser() ? 'broadcast' : 'watch';
      if (typeof openModal !== 'function') return;
      openModal('Phone cameras (direct)', '<div id="p2pRoot"></div>');
      clearInterval(modalPoll);
      modalPoll = setInterval(() => {            // the window was closed: let go of the camera it was watching
        if ($('p2pRoot')) return;
        clearInterval(modalPoll);
        if (M.room) { closeSession(M.room, 'modal'); M.room = null; }
        viewerOff('modal');
      }, 1500);
      render();
    },
    stop: stopBroadcast
  };
  window.P2PCAM = P2PCAM;

  function teardownAll() {
    stopAllRec(); stopBroadcast(); dashStop();
    [...W.sess.values()].forEach(destroySession);
    clearInterval(W.ask); W.ask = null; W.users.clear(); W.seen.clear(); W.rooms = [];
    if (CH) { drop(CH.H); drop(CH.V); CH = null; }
    D.pins.clear(); D.pinsAt = 0;
    clearInterval(feedTimer); feedTimer = null;
  }
  const logout0 = window.performLogout;
  if (typeof logout0 === 'function') window.performLogout = function () { try { teardownAll(); } catch (e) { } return logout0.apply(this, arguments); };

  /* ───────── Gargo dashboard panel: live camera wall + latest gate movements ───────── */
  let feedTimer = null, feedAt = 0, feedBusy = false;
  const when = d => {
    const t = new Date(d); if (isNaN(t)) return '';
    if (!/T\d/.test(String(d))) return typeof fmtDate === 'function' ? fmtDate(d) : String(d);
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return m + ' min ago';
    const hm = t.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    return t.toDateString() === new Date().toDateString() ? 'Today ' + hm : (typeof fmtDate === 'function' ? fmtDate(d) : '') + ' ' + hm;
  };

  function paintFeed() {
    const host = $('gateCamFeed'); if (!host) return;
    const db = (ST() && ST().db) || {};
    const rows = (db.interchange || []).map((i, n) => ({ i, n }))
      .filter(x => /^(Gate|Depot)-(In|Out)$/.test(x.i.type || ''))
      .sort((a, b) => (new Date(b.i.date) - new Date(a.i.date)) || (b.n - a.n)).slice(0, 8).map(x => x.i);
    if (!rows.length) { host.innerHTML = '<div class="gc-empty" style="min-height:80px">No gate movements recorded yet</div>'; return; }
    host.innerHTML = rows.map(i => {
      const inn = /In$/.test(i.type), tr = (db.trucks || []).find(t => t.id === i.truck);
      const truck = tr ? tr.reg : (i.truckRegText || '');
      const line = i.line ? ((db.shippingLines || []).find(l => l.id === i.line) || {}).code || '' : '';
      const fresh = (Date.now() - new Date(i.date)) < 15 * 60000 && /T\d/.test(String(i.date));
      return '<div class="gc-row' + (fresh ? ' fresh' : '') + '"><i class="gc-dot ' + (inn ? 'in' : 'out') + '"></i>' +
        '<div class="gc-row-main"><b>' + E(i.container || '—') + '</b><span>' + E([i.type, truck, line].filter(Boolean).join(' · ')) + '</span></div>' +
        '<div class="gc-row-time">' + E(when(i.date)) + '</div></div>';
    }).join('');
  }
  /* interchange rows are loaded on demand in Gargo (ic-remote.js): ask for the latest movements, then draw */
  async function loadFeed() {
    if (feedBusy || Date.now() - feedAt < 10000) return;
    feedBusy = true; feedAt = Date.now();
    try {
      if (window.ICR && ICR.enabled && navigator.onLine) await ICR.search({ types: ['Gate-In', 'Depot-In', 'Gate-Out', 'Depot-Out'], waiting: 'include', limit: 8 });
    } catch (e) { console.warn('gate feed', e && e.message); }
    feedBusy = false; paintFeed();
  }

  function ensureWallHint() {
    const wall = $('gateCamWall'); if (!wall) return;
    let h = $('p2pEmpty');
    if (!h) {
      h = document.createElement('div'); h.id = 'p2pEmpty';
      h.addEventListener('click', () => { if (isAdminUser()) P2PCAM.open('broadcast'); });
      h.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && isAdminUser()) { e.preventDefault(); P2PCAM.open('broadcast'); } });
    }
    const admin = isAdminUser();
    h.className = 'gc-activate' + (admin ? ' gc-activate-on' : '');
    if (admin) { h.setAttribute('role', 'button'); h.tabIndex = 0; } else { h.removeAttribute('role'); h.removeAttribute('tabindex'); }
    h.innerHTML = '<div class="gc-activate-ring"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>' +
      '<div class="gc-activate-title">' + (admin ? 'Go live from this phone' : 'No camera on the dashboard') + '</div>' +
      '<div class="gc-activate-sub">' + (admin ? 'Tap to broadcast the gate straight from this phone to the office.' : 'When an administrator puts a phone camera on the dashboard, it appears here. Use “Phone cameras” to see any camera that is live.') + '</div>';
    if (h.parentNode !== wall) wall.appendChild(h);
  }

  function syncButtons() {
    const head = document.querySelector('#gateCamPanel .gc-head'); if (!head) return;
    if (!head.querySelector('.p2p-open')) {
      const b = document.createElement('button');
      b.className = 'action-btn ghost p2p-open'; b.style.marginLeft = '8px';
      b.textContent = 'Phone cameras';
      b.title = 'Watch or broadcast phone cameras directly (peer-to-peer)';
      b.onclick = e => { e.stopPropagation(); P2PCAM.open('watch'); };
      head.appendChild(b);
    }
    let g = head.querySelector('.p2p-golive');
    const can = isAdminUser() && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (can && !g) {
      g = document.createElement('button');
      g.className = 'action-btn p2p-golive'; g.style.marginLeft = '8px';
      g.textContent = 'Go live from this phone';
      g.onclick = e => { e.stopPropagation(); P2PCAM.open('broadcast'); };
      head.appendChild(g);
    } else if (!can && g) g.remove();
  }

  /* called on every dashboard paint */
  let camReady = false, camWait = null;
  function mount() {
    const panel = $('gateCamPanel'); if (!panel) return;
    if (!signedIn()) { panel.style.display = 'none'; return; }
    panel.style.display = '';
    syncButtons(); ensureWallHint(); paintFeed();
    if (!camReady) {                                           // first dashboard paint: let the app finish starting before any camera work
      if (!camWait) camWait = setTimeout(() => { camReady = true; camWait = null; try { mount(); } catch (e) { } }, 3500);
      return;
    }
    loadFeed();
    if (!feedTimer) feedTimer = setInterval(() => { if (!document.hidden && $('gateCamPanel') && $('gateCamPanel').style.display !== 'none') loadFeed(); }, 30000);
    dashTick();
  }
  window.GATECAM_P2P = { mount, paintFeed };

  /* hook into the dashboard (erp-hub.js wraps it too; this file loads after it) */
  const prevDash = window.renderDashboard;
  if (typeof prevDash === 'function') {
    window.renderDashboard = function () {
      const r = prevDash.apply(this, arguments);
      try { mount(); } catch (e) { console.warn('cameras', e); }
      return r;
    };
    if (typeof sectionRenderers !== 'undefined') sectionRenderers.dashboard = window.renderDashboard;
  }
})();