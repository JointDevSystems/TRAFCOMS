'use strict';

const { supabaseAdmin, requireAdmin, sendJson } = require('./_lib/adminAuth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const auth = await requireAdmin(req);
  if (!auth.ok) return sendJson(res, auth.status, { error: auth.message });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { userId, password } = body || {};

  if (!userId || !password) return sendJson(res, 400, { error: 'userId and password are required' });
  if (String(password).length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters' });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) return sendJson(res, 400, { error: error.message });

  return sendJson(res, 200, { ok: true });
};