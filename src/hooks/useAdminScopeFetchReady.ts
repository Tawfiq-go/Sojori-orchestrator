import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { useAuth } from './useAuth';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';
import {
  canSelectOwnerInAdminFilter,
  isPropertyScopedUser,
} from '../utils/taskScope.utils';

/** True when admin PM scope is chosen (or filter not shown). */
export function useAdminScopeFetchReady(): boolean {
  const { loading: authLoading, user: authUser } = useAuth();
  const { showOwnerFilter, ownerScopeUnset, requestOwnerId } = useAdminOwnerFilter();
  const user = toLegacyAuthUser(authUser);

  if (authLoading) return false;
  if (showOwnerFilter && ownerScopeUnset) return false;
  // Owner PM / scoped worker: wait until owner_id is resolved (avoid unscoped inbox flash).
  if (user && isPropertyScopedUser(user) && !canSelectOwnerInAdminFilter(user) && !requestOwnerId) {
    return false;
  }
  return true;
}
