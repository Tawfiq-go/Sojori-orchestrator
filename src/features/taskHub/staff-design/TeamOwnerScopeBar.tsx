import { useMemo } from 'react';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { useAuth } from '../../../hooks/useAuth';
import { getOwnerListLabel } from '../../../utils/ownerDisplay.utils';
import { toLegacyAuthUser } from '../../../utils/legacyAuthUser';
import { normalizeOwnerId } from '../../../utils/fulltaskMappers';
import { canSelectOwnerInAdminFilter } from '../../../utils/taskScope.utils';
import OwnerFilterField from '../../../components/OwnerFilterBar/OwnerFilterField';

export default function TeamOwnerScopeBar() {
  const { user } = useAuth();
  const legacyUser = useMemo(() => toLegacyAuthUser(user), [user]);
  const isCrossOwnerUser = canSelectOwnerInAdminFilter(legacyUser);
  const { selectedOwnerId } = useAdminOwnerFilter();

  if (isCrossOwnerUser) {
    const adminLabel =
      getOwnerListLabel(legacyUser) ||
      (user as { company?: string })?.company ||
      user?.email ||
      'Admin Sojori';
    const hasSelection = Boolean(normalizeOwnerId(selectedOwnerId));

    return (
      <div className="tasks-team-owner-bar">
        <span className="tasks-team-owner-kicker">Compte admin</span>
        <span className="tasks-team-owner-value">{adminLabel}</span>
        <OwnerFilterField
          toolbarInputHeight={36}
          sx={{ minWidth: 260, maxWidth: 360, flex: '1 1 260px' }}
        />
        <span className={`tasks-team-owner-hint${hasSelection ? '' : ' warn'}`}>
          {hasSelection
            ? 'Annonces filtrées pour ce propriétaire. Le nouveau staff sera rattaché à ce PM.'
            : 'Choisissez le propriétaire (PM) pour filtrer les annonces et créer du staff.'}
        </span>
      </div>
    );
  }

  // Owner : pas de bandeau « limité à votre compte » — le scope est implicite.
  return null;
}
