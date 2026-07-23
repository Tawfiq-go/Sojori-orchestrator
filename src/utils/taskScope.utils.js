import { Roles } from 'constants/roles';

/** Normalize API / mock roles (owner, Owner, staff…) to canonical Roles.* values. */
export function normalizeUserRole(role) {
  if (role == null) return '';
  const r = String(role).trim();
  const lower = r.toLowerCase();
  if (r === Roles.SuperAdmin || lower === 'superadmin') return Roles.SuperAdmin;
  if (r === Roles.Admin || lower === 'admin') return Roles.Admin;
  if (r === Roles.Owner || lower === 'owner') return Roles.Owner;
  if (r === Roles.Worker || lower === 'worker' || lower === 'staff') return Roles.Worker;
  if (r === Roles.Landlord || lower === 'landlord') return Roles.Landlord;
  return r;
}

/**
 * SuperAdmin / Admin: full platform access — task APIs should not be scoped by property owner id.
 */
export function isPlatformAdminRole(role) {
  const r = normalizeUserRole(role);
  return r === Roles.SuperAdmin || r === Roles.Admin;
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
  const role = normalizeUserRole(user.role);
  // Propriétaire immobilier : jamais le sélecteur PM / « Tous plateforme ».
  if (role === Roles.Landlord) return false;
  if (isPlatformAdminRole(role)) return true;
  if (role === Roles.Owner) return false;
  if (role === Roles.Worker) {
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
  const role = normalizeUserRole(user.role);
  if (role === Roles.Owner) {
    const id = user._id || user.id || null;
    return id != null && String(id).trim() !== '' ? String(id).trim() : null;
  }
  // Landlord / Worker : données du PM (ownerId), pas l’id du compte lui-même.
  if (role === Roles.Worker || role === Roles.Landlord) {
    const o = user.ownerId;
    return o != null && String(o).trim() !== '' ? String(o).trim() : null;
  }
  const fallback = user._id || user.id || null;
  return fallback != null && String(fallback).trim() !== '' ? String(fallback).trim() : null;
}

/** PM / worker accounts that must never load cross-owner inbox data without owner_id. */
export function isPropertyScopedUser(user) {
  return getPropertyOwnerScopeId(user) != null;
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
