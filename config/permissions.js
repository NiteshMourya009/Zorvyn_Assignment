/**
 * Centralized Permissions Matrix — Single Source of Truth for RBAC
 *
 * Format: { 'resource:action': ['AllowedRole1', 'AllowedRole2'] }
 * This eliminates scattered restrictTo() calls across routes and controllers.
 */

export const PERMISSIONS = {
  // ── Transaction Permissions ──────────────────────────────────────────────
  'transaction:create':    ['Admin'],
  'transaction:update':    ['Admin'],
  'transaction:delete':    ['Admin'],
  'transaction:readAll':   ['Admin', 'Analyst'],  // Viewer is scoped in controller
  'transaction:analytics': ['Admin', 'Analyst'],

  // ── User Management Permissions ──────────────────────────────────────────
  'user:readAll':  ['Admin'],
  'user:readOne':  ['Admin'],
  'user:create':   ['Admin'],
  'user:update':   ['Admin'],
  'user:delete':   ['Admin'],
};

/**
 * Helper: check if a role has a given permission
 * @param {string} role - The user's role
 * @param {string} action - The action string, e.g. 'transaction:create'
 * @returns {boolean}
 */
export const hasPermission = (role, action) => {
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
};
