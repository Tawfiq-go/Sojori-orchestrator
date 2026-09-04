import { useMemo } from 'react';
import { Roles } from '../constants/roles';
import { navGroupsForAdminOnly, navGroupsForRole, type NavGroupConfig } from '../config/navConfig';
import { hasAdminAccess } from '../utils/rbac.utils';
import { useAdminView } from './useAdminView';
import { useRealAuth } from './useAuth';
import type { FeatureGrant } from '../utils/ownerRoutePermissions';

export type SidebarNavUser = {
  role?: string | null;
  featureGrants?: FeatureGrant[];
  ownerAccess?: boolean;
  /** Requis pour les entrées à verrou nominatif (CRM clients). */
  email?: string | null;
};

/**
 * Sidebar selon le rôle réel et, pour un admin, selon le mode de vue choisi
 * (2026-09-03) : owner seule, admin seule, ou les deux.
 */
export function useSidebarNav(user: SidebarNavUser | null | undefined): NavGroupConfig[] {
  const { sidebarMode } = useAdminView();
  // Le `user` reçu est l'utilisateur effectif (Owner en vue owner). Pour les
  // modes « admin » et « les deux », il faut le rôle réel.
  const { user: realUser } = useRealAuth();
  const admin = hasAdminAccess(realUser?.role);
  const realRole = realUser?.role;
  const realEmail = realUser?.email;

  return useMemo(() => {
    if (admin && sidebarMode === 'owner') {
      return navGroupsForRole(Roles.Owner);
    }
    if (admin && sidebarMode === 'admin') {
      return navGroupsForAdminOnly(realRole, realEmail);
    }
    if (admin) {
      return navGroupsForRole(realRole, undefined, undefined, realEmail);
    }
    return navGroupsForRole(
      user?.role,
      user?.featureGrants,
      user?.ownerAccess,
      user?.email,
    );
  }, [admin, sidebarMode, realRole, realEmail, user?.role, user?.featureGrants, user?.ownerAccess, user?.email]);
}
