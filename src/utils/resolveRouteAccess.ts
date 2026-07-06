import { Roles } from '../constants/roles';
import { OWNER_NAV_GROUPS, ADMIN_ROLES } from '../config/navConfig';
import {
  isPlatformAdminPath,
  normalizeDashboardRole,
} from '../config/routeAccessPolicy';
import {
  buildOwnerRouteRows,
  grantAllows,
  LANDLORD_PM_ONLY_FEATURES,
  type FeatureGrant,
} from './ownerRoutePermissions';
import { hasAdminAccess } from './rbac.utils';
import { resolveNavIdFromPath } from './pathToNavId';

export type RouteAccessReason =
  | 'unauthenticated'
  | 'platform_admin_denied'
  | 'platform_admin_allowed'
  | 'admin_full_access'
  | 'owner_allowed'
  | 'owner_denied'
  | 'grant_allowed'
  | 'grant_denied'
  | 'landlord_pm_only'
  | 'unknown_role';

export type RouteAccessInput = {
  pathname: string;
  search?: string;
  role?: string | null;
  featureGrants?: FeatureGrant[];
  ownerAccess?: boolean;
};

export type RouteAccessResult = {
  allowed: boolean;
  zone: 'platform_admin' | 'pm';
  reason: RouteAccessReason;
  navId?: string;
};

function roleAllowedOnNavItem(
  navId: string,
  role: string,
): boolean {
  for (const group of OWNER_NAV_GROUPS) {
    if (group.roles?.length && !group.roles.includes(role as (typeof ADMIN_ROLES)[number])) {
      continue;
    }
    const walk = (items: typeof group.items): boolean => {
      for (const item of items) {
        if (item.id === navId) {
          if (!item.roles?.length) return true;
          return item.roles.includes(role as (typeof ADMIN_ROLES)[number]);
        }
        if (item.sub?.length && walk(item.sub)) return true;
      }
      return false;
    };
    if (walk(group.items)) return true;
  }
  return false;
}

function pathGrantedByPrefix(
  pathname: string,
  grants: FeatureGrant[],
  ownerAccess?: boolean,
): boolean {
  const rows = buildOwnerRouteRows();
  const hit = rows.find(
    (r) => pathname === r.path || pathname.startsWith(`${r.path}/`),
  );
  if (!hit) return false;
  return grantAllows(grants, hit.featureKey, 'get', ownerAccess);
}

/** Vérifie si l'utilisateur peut accéder à cette URL (garde front — le backend reste autoritaire). */
export function resolveRouteAccess(input: RouteAccessInput): RouteAccessResult {
  const { pathname, search = '', role, featureGrants = [], ownerAccess } = input;
  const navRole = normalizeDashboardRole(role);
  const platformPath = isPlatformAdminPath(pathname);
  const navId = resolveNavIdFromPath(pathname, search);

  if (platformPath && navRole === Roles.Owner && (navId === 'staff' || navId === 'equipe/onboarding')) {
    const allowed = roleAllowedOnNavItem(navId, Roles.Owner);
    return {
      allowed,
      zone: 'pm',
      reason: allowed ? 'owner_allowed' : 'owner_denied',
      navId,
    };
  }

  if (platformPath) {
    const allowed = hasAdminAccess(navRole);
    return {
      allowed,
      zone: 'platform_admin',
      reason: allowed ? 'platform_admin_allowed' : 'platform_admin_denied',
      navId,
    };
  }

  if (hasAdminAccess(navRole)) {
    return { allowed: true, zone: 'pm', reason: 'admin_full_access', navId };
  }

  if (navRole === Roles.Owner) {
    const allowed = roleAllowedOnNavItem(navId, Roles.Owner);
    return {
      allowed,
      zone: 'pm',
      reason: allowed ? 'owner_allowed' : 'owner_denied',
      navId,
    };
  }

  if (navRole === Roles.Worker || navRole === Roles.Landlord) {
    if (navRole === Roles.Landlord && LANDLORD_PM_ONLY_FEATURES.has(navId)) {
      return { allowed: false, zone: 'pm', reason: 'landlord_pm_only', navId };
    }
    const byNav = grantAllows(featureGrants, navId, 'get', ownerAccess);
    const byPrefix = byNav ? true : pathGrantedByPrefix(pathname, featureGrants, ownerAccess);
    const allowed = byNav || byPrefix;
    return {
      allowed,
      zone: 'pm',
      reason: allowed ? 'grant_allowed' : 'grant_denied',
      navId,
    };
  }

  return { allowed: false, zone: 'pm', reason: 'unknown_role', navId };
}
