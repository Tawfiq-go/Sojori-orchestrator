import { useMemo } from 'react';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { usePmSimulation } from '../context/PmSimulationContext';
import { useAuth } from './useAuth';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';
import { getOwnerListLabel } from '../utils/ownerDisplay.utils';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';
import { isPlatformAdminRole } from '../utils/taskScope.utils';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../constants/orchestrationAdmin';

export type FulltaskConfigOwnerScope = {
  /** Clé API fulltask (Mongo ownerId, ou ORCHESTRATION_ADMIN_OWNER_ID pour templates admin). */
  ownerKey: string;
  /** Libellé affiché (nom PM ou « Config Admin globale »). */
  ownerDisplayName: string;
  /** Détail technique court (id ou description template admin). */
  ownerKeyDetail: string;
  /** Admin / staff : sélecteur propriétaire visible. */
  showOwnerPicker: boolean;
  /** True si on affiche les templates Admin (pas un Owner réel). */
  isAdminTemplate: boolean;
  /** Compte PM unique : pas de libellés « propriétaire » (scope implicite). */
  hideOwnerScopeLabels: boolean;
};

export function useFulltaskConfigOwner(): FulltaskConfigOwnerScope {
  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const legacyUser = useMemo(() => toLegacyAuthUser(user), [user]);
  const { selectedOwnerId, owners } = useAdminOwnerFilter();
  const { isActive: simulationActive, snapshot: simulationSnapshot } = usePmSimulation();

  const isPlatformAdmin = isPlatformAdminRole(String(legacyUser?.role ?? user?.role ?? ''));
  const effectiveIsPlatformAdmin = isPlatformAdmin && !simulationActive;

  const ownerKey = useMemo(() => {
    if (!scope.canAccessAllOwners) {
      const id = scope.ownerId || String(legacyUser?._id ?? legacyUser?.id ?? '');
      return id || 'unknown';
    }
    const sel = selectedOwnerId?.trim();
    if (sel && sel !== ORCHESTRATION_ADMIN_OWNER_ID) {
      return sel;
    }
    return 'global';
  }, [scope.canAccessAllOwners, scope.ownerId, legacyUser, selectedOwnerId]);

  const isAdminTemplate =
    effectiveIsPlatformAdmin && scope.canAccessAllOwners && ownerKey === 'global';
  const hideOwnerScopeLabels = !effectiveIsPlatformAdmin && !isAdminTemplate;

  const ownerDisplayName = useMemo(() => {
    if (simulationActive && simulationSnapshot?.ownerLabel) {
      return simulationSnapshot.ownerLabel;
    }
    if (scope.canAccessAllOwners) {
      const sel = selectedOwnerId?.trim();
      // Template Admin
      if (!sel || sel === ORCHESTRATION_ADMIN_OWNER_ID) {
        return 'Template Admin';
      }
      // PM spécifique
      const row = (owners || []).find(
        (o) => String(o?._id ?? o?.id) === String(sel),
      );
      return getOwnerListLabel(row) || sel;
    }
    if (legacyUser) {
      const label = getOwnerListLabel(legacyUser as Record<string, unknown>);
      if (label && label !== '—') return label;
    }
    const u = user as { email?: string; company?: string } | null;
    return u?.company || u?.email || 'Mon compte';
  }, [scope.canAccessAllOwners, selectedOwnerId, owners, legacyUser, user, simulationActive, simulationSnapshot?.ownerLabel]);

  const ownerKeyDetail = isAdminTemplate
    ? `Template Admin · ${ORCHESTRATION_ADMIN_OWNER_ID} · tous les PM`
    : `${ownerKey} · config propre PM`;

  return {
    ownerKey,
    ownerDisplayName,
    ownerKeyDetail,
    showOwnerPicker: effectiveIsPlatformAdmin,
    isAdminTemplate,
    hideOwnerScopeLabels,
  };
}
