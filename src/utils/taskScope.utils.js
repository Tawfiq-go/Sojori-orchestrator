import { Roles } from 'constants/roles';

/**
 * SuperAdmin / Admin: full platform access — task APIs should not be scoped by property owner id.
 */
export function isPlatformAdminRole(role) {
  if (role == null) return false;
  const r = String(role).trim();
  return (
    r === Roles.SuperAdmin ||
    r === Roles.Admin ||
    r.toLowerCase() === 'superadmin' ||
    r.toLowerCase() === 'admin'
  );
}

/** featureGrants like dev bypass / platform staff: can act across owners (not a property Owner account). */
export function hasWildcardFeatureGrants(user) {
  if (!user) return false;
  const grants = Array.isArray(user.featureGrants) ? user.featureGrants : [];
  return grants.some(
    (g) =>
      g?.feature === '*' ||
      (Array.isArray(g?.actions) && g.actions.includes('*')),
  );
}

/**
 * User may use the "Propriétaire" filter and load all owners when none is selected:
 * - SuperAdmin / Admin (role)
 * - Worker with no `ownerId` (internal / dashboard staff, not linked to one propriétaire)
 * - Other non-Owner accounts with wildcard featureGrants (`*` feature or `*` action)
 * Property Manager accounts (role Owner) never see this filter; they stay scoped to their data.
 */
export function canSelectOwnerInAdminFilter(user) {
  if (!user) return false;
  if (isPlatformAdminRole(user.role)) return true;
  if (String(user.role).trim() === Roles.Owner) return false;
  if (String(user.role).trim() === Roles.Worker) {
    const o = user.ownerId;
    // Worker lié à un propriétaire : données scopées à ownerId — jamais le filtre cross-owner.
    if (o != null && String(o).trim() !== '') return false;
    // Worker interne sans ownerId : filtre seulement si grants wildcard (staff plateforme).
    return hasWildcardFeatureGrants(user);
  }
  return hasWildcardFeatureGrants(user);
}

/**
 * Mongo id of the property manager whose listings/tasks we should load.
 * - null when the user can operate across owners (see canSelectOwnerInAdminFilter)
 * - Owner: their account id
 * - Worker: their employer's ownerId
 */
export function getPropertyOwnerScopeId(user) {
  if (!user) return null;
  if (canSelectOwnerInAdminFilter(user)) return null;
  if (String(user.role).trim() === Roles.Owner) return user._id || user.id || null;
  if (String(user.role).trim() === Roles.Worker) return user.ownerId || null;
  return user._id || user.id || null;
}

/**
 * `ownerId` (or `owner_id`) for list APIs: property owners & scoped workers use their scope;
 * platform / permission admins omit the param for “all” or set it when a propriétaire is selected.
 * @param {object} user
 * @param {string | null | undefined} adminSelectedOwnerId — when user can use the filter
 * @returns {string | null} null means “all owners” (only for users who may use the filter)
 */
export function getRequestOwnerIdParam(user, adminSelectedOwnerId) {
  if (!user) return null;
  if (canSelectOwnerInAdminFilter(user)) {
    if (adminSelectedOwnerId == null) return null;
    const s = String(adminSelectedOwnerId).trim();
    return s === '' ? null : s;
  }
  return getPropertyOwnerScopeId(user);
}
