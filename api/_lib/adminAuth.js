'use strict';


const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
 
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}


const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});


async function requireAdmin(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { ok: false, status: 401, message: 'Missing bearer token' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userRes || !userRes.user) {
    return { ok: false, status: 401, message: 'Invalid or expired session' };
  }

  const callerId = userRes.user.id;
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('id, role, active')
    .eq('id', callerId)
    .single();

  if (profErr || !profile) return { ok: false, status: 403, message: 'Profile not found' };
  if (!profile.active) return { ok: false, status: 403, message: 'Account deactivated' };
  if (profile.role !== 'admin') return { ok: false, status: 403, message: 'Admin rights required' };

  return { ok: true, userId: callerId };
}

function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

module.exports = { supabaseAdmin, requireAdmin, sendJson };