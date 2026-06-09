import { useMemo } from 'react';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import {
  ORCHESTRATION_ADMIN_EMAIL,
  ORCHESTRATION_ADMIN_OWNER_ID,
} from '../../../constants/orchestrationAdmin';
import { getOwnerListLabel } from '../../../utils/ownerDisplay.utils';
import './orchDesign.css';

export type OwnerConfigTabStatus = 'owner' | 'empty' | 'loading';

type Props = {
  activeScope: string;
  onChange: (scope: string) => void;
  ownerConfigStatus?: Record<string, OwnerConfigTabStatus>;
};

function isAdminOwnerRow(owner: { _id?: string; id?: string; email?: string }): boolean {
  const id = String(owner?._id ?? owner?.id ?? '');
  if (id === ORCHESTRATION_ADMIN_OWNER_ID) return true;
  return (owner.email || '').toLowerCase().trim() === ORCHESTRATION_ADMIN_EMAIL;
}

function ownerInitial(label: string): string {
  const t = label.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status?: OwnerConfigTabStatus }) {
  if (!status || status === 'loading') {
    return <span className="orch-owner-tab-badge orch-owner-tab-badge--loading" aria-hidden />;
  }
  if (status === 'owner') {
    return (
      <span className="orch-owner-tab-badge orch-owner-tab-badge--ok" title="Config propre en base">
        ok
      </span>
    );
  }
  return (
    <span className="orch-owner-tab-badge orch-owner-tab-badge--empty" title="Pas encore synchronisé">
      vide
    </span>
  );
}

export default function OrchestrationOwnerScopeTabs({
  activeScope,
  onChange,
  ownerConfigStatus = {},
}: Props) {
  const { owners, ownersLoading } = useAdminOwnerFilter();

  const pmOwners = useMemo(
    () =>
      (owners || []).filter((o) => {
        const id = o?._id ?? o?.id;
        if (id == null) return false;
        return !isAdminOwnerRow(o);
      }),
    [owners],
  );

  const okCount = pmOwners.filter(
    (o) => ownerConfigStatus[String(o._id ?? o.id)] === 'owner',
  ).length;

  return (
    <div className="orch-owner-scope-panel">
      <div className="orch-owner-scope-head">
        <div className="orch-owner-scope-title">
          <span className="orch-owner-scope-title-icon" aria-hidden>
            📋
          </span>
          <div>
            <strong>Configurations orchestration</strong>
            <span className="orch-owner-scope-sub">
              {pmOwners.length} PM{pmOwners.length !== 1 ? 's' : ''}
              {okCount > 0 ? ` · ${okCount} avec config propre` : ''}
            </span>
          </div>
        </div>
        {ownersLoading && pmOwners.length === 0 ? (
          <span className="orch-owner-scope-loading">Chargement…</span>
        ) : null}
      </div>

      <div className="orch-owner-scope-track" role="tablist" aria-label="Configurations par propriétaire">
        <button
          type="button"
          role="tab"
          aria-selected={activeScope === 'global'}
          className={`orch-owner-tab orch-owner-tab--admin${activeScope === 'global' ? ' is-active' : ''}`}
          onClick={() => onChange('global')}
        >
          <span className="orch-owner-tab-icon orch-owner-tab-icon--admin">
            <AdminPanelSettingsOutlined sx={{ fontSize: 16 }} />
          </span>
          <span className="orch-owner-tab-label">Template Admin</span>
          <span className="orch-owner-tab-badge orch-owner-tab-badge--template">référence</span>
        </button>

        {pmOwners.length > 0 ? <span className="orch-owner-scope-divider" aria-hidden /> : null}

        {pmOwners.map((o) => {
          const id = String(o._id ?? o.id);
          const status = ownerConfigStatus[id];
          const label = getOwnerListLabel(o);
          const active = activeScope === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`orch-owner-tab${active ? ' is-active' : ''}`}
              onClick={() => onChange(id)}
              title={id}
            >
              <span className="orch-owner-tab-icon orch-owner-tab-icon--pm">
                {ownerInitial(label)}
              </span>
              <span className="orch-owner-tab-label">{label}</span>
              <StatusBadge status={status} />
            </button>
          );
        })}
      </div>

      {activeScope === 'global' ? (
        <p className="orch-owner-scope-hint">
          <strong>Template global</strong> — modèle de référence pour tous les PMs. Passez sur un onglet
          PM pour voir ou éditer sa copie, ou utilisez <strong>Sync tous les PMs</strong> pour propager
          le template.
        </p>
      ) : (
        <p className="orch-owner-scope-hint orch-owner-scope-hint--pm">
          Config du PM sélectionné — les modifications n&apos;affectent que ce propriétaire.{' '}
          <strong>Sync PM</strong> recopie le template Admin vers ce compte.
        </p>
      )}
    </div>
  );
}
