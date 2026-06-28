import { useAuth } from '../../hooks/useAuth';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { toLegacyAuthUser } from '../../utils/legacyAuthUser';
import { canSelectOwnerInAdminFilter } from '../../utils/taskScope.utils';
import { resolveOwnerId } from '../onboarding/resolveOwnerId';

/** ownerId PM pour les APIs finances (Owner session, Worker, ou filtre admin). */
export function useFinancesOwnerScope() {
  const { user } = useAuth();
  const legacyUser = toLegacyAuthUser(user);
  const { requestOwnerId, owners, selectedOwnerId } = useAdminOwnerFilter();
  const adminCanPick = canSelectOwnerInAdminFilter(legacyUser);
  const sessionOwnerId = resolveOwnerId(user);
  const pickedOwnerId = selectedOwnerId?.trim() || requestOwnerId?.trim() || null;
  const ownerId = adminCanPick ? pickedOwnerId : sessionOwnerId;
  const needsOwnerPick = Boolean(adminCanPick && !ownerId);
  return { ownerId, needsOwnerPick, isPlatformAdmin: adminCanPick, owners, selectedOwnerId };
}
