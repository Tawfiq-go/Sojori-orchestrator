import { useMemo } from 'react';
import { Roles } from '../constants/roles';
import { navGroupsForRole, type NavGroupConfig } from '../config/navConfig';
import { hasAdminAccess } from '../utils/rbac.utils';
import { usePmSimulation } from '../context/PmSimulationContext';
import type { FeatureGrant } from '../utils/ownerRoutePermissions';

export type SidebarNavUser = {
  role?: string | null;
  featureGrants?: FeatureGrant[];
  ownerAccess?: boolean;
};

export function useSidebarNav(user: SidebarNavUser | null | undefined): NavGroupConfig[] {
  const { isActive: simulationActive } = usePmSimulation();

  return useMemo(() => {
    if (simulationActive && hasAdminAccess(user?.role)) {
      return navGroupsForRole(Roles.Owner);
    }
    return navGroupsForRole(user?.role, user?.featureGrants, user?.ownerAccess);
  }, [user?.role, user?.featureGrants, user?.ownerAccess, simulationActive]);
}
