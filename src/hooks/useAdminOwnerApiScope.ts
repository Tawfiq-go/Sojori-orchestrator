import { useMemo } from 'react';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { useAdminScopeFetchReady } from './useAdminScopeFetchReady';

/** Admin PM scope for listing / reservation / payment APIs. */
export function useAdminOwnerApiScope() {
  const { requestOwnerId, ownerScopeAll, selectedOwnerIds } = useAdminOwnerFilter();
  const scopeFetchReady = useAdminScopeFetchReady();

  const filterOwnerIds = useMemo(() => {
    if (requestOwnerId) return [requestOwnerId];
    if (ownerScopeAll) return [];
    return selectedOwnerIds;
  }, [requestOwnerId, ownerScopeAll, selectedOwnerIds]);

  return {
    scopeFetchReady,
    requestOwnerId,
    ownerScopeAll,
    filterOwnerIds,
    selectedOwnerIds,
  };
}
