import { useMemo } from 'react';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { useAuth } from '../../../hooks/useAuth';
import { toLegacyAuthUser } from '../../../utils/legacyAuthUser';
import { getOwnerListLabel } from '../../../utils/ownerDisplay.utils';
import { canSelectOwnerInAdminFilter } from '../../../utils/taskScope.utils';
import { SearchSelect } from '../utils/financesSearchSelect.tsx';

/** Filtre PM (propriétaire gestionnaire) — obligatoire pour Admin avant finances / propriétaires immobiliers. */
export function FinancesOwnerScopeBar() {
  const { user } = useAuth();
  const legacyUser = useMemo(() => toLegacyAuthUser(user), [user]);
  const adminCanPick = canSelectOwnerInAdminFilter(legacyUser);
  const { selectedOwnerId, setSelectedOwnerId, owners, ownersLoading } = useAdminOwnerFilter();

  const ownerOptions = useMemo(
    () =>
      (owners || [])
        .filter((o) => o?._id != null || o?.id != null)
        .map((o) => {
          const id = String(o._id ?? o.id);
          const email = o.email || o?.email_addresses?.[0]?.email_address;
          const company = o?.fillCompany?.companyName || o?.companyName;
          return {
            value: id,
            label: getOwnerListLabel(o) || email || id,
            hint: [email, company].filter(Boolean).join(' · ') || undefined,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [owners],
  );

  const selectedLabel = useMemo(() => {
    if (!selectedOwnerId) return '';
    return ownerOptions.find((o) => o.value === selectedOwnerId)?.label || '';
  }, [selectedOwnerId, ownerOptions]);

  if (!adminCanPick) return null;

  const hasSelection = Boolean(selectedOwnerId?.trim());

  return (
    <div className={`fin-owner-bar${hasSelection ? '' : ' warn'}`}>
      <div className="fin-owner-bar-main">
        <span className="fin-owner-kicker">Propriétaire PM</span>
        <div className="fin-owner-picker">
          {ownersLoading && !ownerOptions.length ? (
            <div className="fin fin-owner-loading">Chargement des PM…</div>
          ) : (
            <SearchSelect
              options={ownerOptions}
              value={selectedOwnerId}
              onChange={(id) => setSelectedOwnerId(id)}
              placeholder="Choisir un PM…"
              searchPlaceholder="Nom, email, société…"
              emptyMessage={
                ownersLoading ? 'Chargement…' : ownerOptions.length ? 'Aucun PM trouvé' : 'Aucun PM disponible'
              }
            />
          )}
        </div>
      </div>
      <p className="fin-owner-hint">
        {hasSelection ? (
          <>
            Données et invitations rattachées à <b>{selectedLabel}</b>.
          </>
        ) : (
          <>Choisissez le PM dans la liste — recherche par nom ou email — avant d&apos;ajouter un proprio ou une récurrence.</>
        )}
      </p>
    </div>
  );
}
