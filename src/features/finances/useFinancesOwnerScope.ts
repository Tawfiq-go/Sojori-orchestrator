import { useAuth } from '../../hooks/useAuth';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { hasAdminAccess } from '../../utils/rbac.utils';
import { resolveOwnerId } from '../onboarding/resolveOwnerId';

/** ownerId PM pour les APIs finances (Owner session, Worker, ou filtre admin). */
export function useFinancesOwnerScope() {
  const { user } = useAuth();
  const { requestOwnerId, showOwnerFilter } = useAdminOwnerFilter();
  const isPlatformAdmin = hasAdminAccess(user?.role);
  const sessionOwnerId = resolveOwnerId(user);
  const ownerId =
    isPlatformAdmin && showOwnerFilter ? requestOwnerId?.trim() || null : sessionOwnerId;
  const needsOwnerPick = Boolean(isPlatformAdmin && showOwnerFilter && !ownerId);
  return { ownerId, needsOwnerPick, isPlatformAdmin };
}
