import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';

/** True when admin PM scope is chosen (or filter not shown). */
export function useAdminScopeFetchReady(): boolean {
  const { showOwnerFilter, ownerScopeUnset } = useAdminOwnerFilter();
  if (!showOwnerFilter) return true;
  return !ownerScopeUnset;
}
