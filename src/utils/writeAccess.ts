/**
 * Accès écriture vs lecture seule (Landlord = toujours read-only).
 */
import { Roles } from '../constants/roles';
import type { FeatureGrant } from './ownerRoutePermissions';
import { grantAllows } from './ownerRoutePermissions';

export type WriteAccessUser = {
  role?: string | null;
  featureGrants?: FeatureGrant[];
  ownerAccess?: boolean;
} | null | undefined;

/** Propriétaire immobilier — lecture seule, aucune mutation métier. */
export function isLandlordRole(role?: string | null): boolean {
  return String(role || '').trim() === Roles.Landlord;
}

/** True si l’utilisateur ne doit jamais créer / modifier / supprimer. */
export function isReadOnlyUser(user: WriteAccessUser): boolean {
  return isLandlordRole(user?.role);
}

/**
 * Peut-il écrire sur une feature (update/create/delete) ?
 * Landlord → toujours false.
 * Owner/Admin/SA → true.
 * Worker → selon featureGrants (sans traiter `*` get-only comme admin).
 */
export function userCanWrite(user: WriteAccessUser, featureKey?: string): boolean {
  if (!user?.role) return false;
  if (isLandlordRole(user.role)) return false;
  if (
    user.role === Roles.SuperAdmin ||
    user.role === Roles.Admin ||
    user.role === Roles.Owner
  ) {
    return true;
  }
  if (user.role === Roles.Worker) {
    if (user.ownerAccess) return true;
    const grants = Array.isArray(user.featureGrants) ? user.featureGrants : [];
    if (!featureKey) {
      return grants.some(
        (g) =>
          (g?.actions || []).includes('*') ||
          (g?.actions || []).includes('update') ||
          (g?.actions || []).includes('create') ||
          (g?.actions || []).includes('delete'),
      );
    }
    return (
      grantAllows(grants, featureKey, 'update', user.ownerAccess) ||
      grantAllows(grants, featureKey, 'create', user.ownerAccess) ||
      grantAllows(grants, featureKey, 'delete', user.ownerAccess)
    );
  }
  return false;
}

/** URLs HTTP autorisées en mutation même pour un Landlord (auth / session). */
export function isLandlordMutationAllowlisted(url?: string): boolean {
  const u = String(url || '').toLowerCase();
  if (!u) return false;
  return (
    u.includes('/login') ||
    u.includes('/logout') ||
    u.includes('/register') ||
    u.includes('/refresh') ||
    u.includes('/valid-token') ||
    u.includes('/reset-password') ||
    u.includes('/complete-reset') ||
    u.includes('/auth/')
  );
}
