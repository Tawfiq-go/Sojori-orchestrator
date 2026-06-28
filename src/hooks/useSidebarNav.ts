import { useMemo } from 'react';
import { navGroupsForRole, type NavGroupConfig } from '../config/navConfig';
import type { FeatureGrant } from '../utils/ownerRoutePermissions';

export type SidebarNavUser = {
  role?: string | null;
  featureGrants?: FeatureGrant[];
  ownerAccess?: boolean;
};

export function useSidebarNav(user: SidebarNavUser | null | undefined): NavGroupConfig[] {
  return useMemo(
    () =>
      navGroupsForRole(
        user?.role,
        user?.featureGrants,
        user?.ownerAccess,
      ),
    [user?.role, user?.featureGrants, user?.ownerAccess],
  );
}
