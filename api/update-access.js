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
  return list.filter((x) => s.has(x));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const auth = await requireAdmin(req);
  if (!auth.ok) return sendJson(res, auth.status, { error: auth.message });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { userId, role } = body || {};
  if (!userId) return sendJson(res, 400, { error: 'userId is required' });
  if (role && !VALID_ROLES.includes(role)) return sendJson(res, 400, { error: 'Invalid role' });

  const patch = {};
  if (role) patch.role = role;
  if ('navSections' in (body || {})) patch.nav_sections = cleanList(body.navSections, VALID_SIDEBAR_SECTIONS);
  if ('adminSections' in (body || {})) patch.admin_sections = cleanList(body.adminSections, VALID_ADMIN_SECTIONS);

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) return sendJson(res, 400, { error: error.message });
  return sendJson(res, 200, { profile });
};