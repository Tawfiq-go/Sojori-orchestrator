import { useMemo } from 'react';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';
import { useAuth } from './useAuth';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';
import { getRequestOwnerIdParam } from '../utils/taskScope.utils';
import { useAdminScopeFetchReady } from './useAdminScopeFetchReady';

/** Tasks / planning scope — merges session role with admin PM filter. */
export function usePmTasksScope() {
  const { user: authUser } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const base = useMemo(() => resolveTasksUserScope(authUser), [authUser]);
  const { selectedOwnerId, showOwnerFilter, ownerScopeAll } = useAdminOwnerFilter();
  const scopeFetchReady = useAdminScopeFetchReady();

  const requestOwnerId = useMemo(
    () => getRequestOwnerIdParam(user, selectedOwnerId),
    [user, selectedOwnerId],
  );

  const ownerId = useMemo(() => {
    if (base.canAccessAllOwners) {
      return requestOwnerId || undefined;
    }
    return base.ownerId;
  }, [base.canAccessAllOwners, base.ownerId, requestOwnerId]);

  const filterOwnerId = useMemo(() => {
    if (!base.canAccessAllOwners) return ownerId;
    return requestOwnerId || undefined;
  }, [base.canAccessAllOwners, ownerId, requestOwnerId]);

  const scopeCacheKey = useMemo(() => {
    if (base.canAccessAllOwners) {
      if (ownerScopeAll) return '__all__';
      if (filterOwnerId) return `owner:${filterOwnerId}`;
      if (showOwnerFilter) return '__unset__';
      return '__all__';
    }
    return ownerId ? `owner:${ownerId}` : '__none__';
  }, [base.canAccessAllOwners, ownerScopeAll, filterOwnerId, showOwnerFilter, ownerId]);

  return {
    ...base,
    scopeFetchReady,
    ownerId,
    filterOwnerId,
    scopeCacheKey,
    requestOwnerId,
    ownerScopeAll,
    showOwnerFilter,
  };
}
