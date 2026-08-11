'use strict';


const { supabaseAdmin, requireAdmin, sendJson } = require('./_lib/adminAuth');

const VALID_ROLES = ['admin', 'ops', 'dispatch', 'clerk', 'finance', 'viewer', 'driver'];

const VALID_SIDEBAR_SECTIONS = [
  'dashboard', 'trucks', 'drivers', 'trips', 'dispatch', 'inward', 'publicbookings',
  'depops', 'maintenance', 'fuel', 'shutout', 'interchange', 'depotreport',
  'shippinglines', 'requisitions', 'workshop',
];
const VALID_ADMIN_SECTIONS = [
  'invoicing', 'allocation', 'workanalysis', 'reports', 'tripreports',
  'livetracking', 'usermgmt', 'settings',
];

function cleanList(list, allowed) {
  if (!Array.isArray(list)) return null;
  const s = new Set(allowed);
  const out = list.filter((x) => s.has(x));
  return out; // may be [] — an intentional "no access to anything" grant
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const auth = await requireAdmin(req);
  if (!auth.ok) return sendJson(res, auth.status, { error: auth.message });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { name, username, email, password, role } = body || {};

  if (!name || !username || !email || !password || !role) {
    return sendJson(res, 400, { error: 'name, username, email, password and role are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendJson(res, 400, { error: 'Invalid email format' });
  }
  if (String(password).length < 8) {
    return sendJson(res, 400, { error: 'Password must be at least 8 characters' });
  }
  if (!VALID_ROLES.includes(role)) {
    return sendJson(res, 400, { error: 'Invalid role' });
  }

  const usernameNorm = String(username).trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', usernameNorm)
    .maybeSingle();
  if (existing) return sendJson(res, 409, { error: 'Username already taken' });

  const navSections = cleanList(body.navSections, VALID_SIDEBAR_SECTIONS);
  const adminSections = cleanList(body.adminSections, VALID_ADMIN_SECTIONS);

  // 1. Create the auth user directly, with a real password and the email
  //    pre-confirmed — this is what skips the "send invitation" flow.
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username: usernameNorm },
  });
  if (createErr) return sendJson(res, 400, { error: createErr.message });

  const newUserId = created.user.id;

  // 2. Create the matching profile row.
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: newUserId,
      name,
      username: usernameNorm,
      email,
      role,
      active: true,
      nav_sections: navSections,
      admin_sections: adminSections,
      created_at: new Date().toISOString(),
      last_login: null,
    })
    .select('*')
    .single();

  if (profileErr) {
    // Roll back the auth user so we don't leave an orphaned login with no profile.
    await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
    return sendJson(res, 400, { error: profileErr.message });
  }

  return sendJson(res, 200, { profile });
};