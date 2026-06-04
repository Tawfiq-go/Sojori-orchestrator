import { useMemo } from 'react';
import { navGroupsForRole, type NavGroupConfig } from '../config/navConfig';

export function useSidebarNav(role: string | null | undefined): NavGroupConfig[] {
  return useMemo(() => navGroupsForRole(role), [role]);
}
