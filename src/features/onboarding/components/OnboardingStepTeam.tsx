import { useEffect, useState } from 'react';
import { getListings } from '../../listing/services/serverApi.listing';
import type { WizardPanel1, WizardStaffRow } from '../types';
import { defaultStaffRow } from '../defaults';
import { staffDisplayName } from '../staffNormalize';
import {
  ObAdminWaRolePanel,
  ObDashboardRolePanel,
  ObStaffRolePanel,
} from './onboardingTeamWidgets';
import '../../taskHub/staff-design/staffDesign.css';

type RoleKey = 'taskStaff' | 'adminWhatsapp' | 'dashboardEmail';

type Props = {
  p1: WizardPanel1;
  ownerCities: string[];
  ownerId?: string | null;
  updatePanel: (patch: Partial<WizardPanel1>) => void;
};

const ADD_ROLES: { key: RoleKey; icon: string; label: string; hint: string }[] = [
  { key: 'taskStaff', icon: '🧹', label: 'Staff tâches', hint: 'OPS · ménage, accueil…' },
  { key: 'adminWhatsapp', icon: '📱', label: 'Admin WhatsApp', hint: 'Menus M·V·L·R·D·T' },
  { key: 'dashboardEmail', icon: '🖥', label: 'Dashboard', hint: 'Accès web par email' },
];

export default function OnboardingStepTeam({ p1, ownerCities, ownerId, updatePanel }: Props) {
  const [listings, setListings] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getListings({
          page: 0,
          limit: 200,
          ownerId,
          useActiveFilter: true,
          active: true,
          compact: true,
        });
        if (cancelled) return;
        const rows = Array.isArray(result?.data?.data) ? result.data.data : [];
        setListings(
          rows
            .filter((l) => l?._id)
            .map((l) => ({
              id: String(l._id),
              label: l.name || String(l._id),
              city:
                typeof l.city === 'string'
                  ? l.city
                  : (l.city as { name?: string } | undefined)?.name || '',
            })),
        );
      } catch {
        if (!cancelled) setListings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const updateStaffRow = (idx: number, patch: Partial<WizardStaffRow>) => {
    const staff = [...p1.staff];
    staff[idx] = { ...staff[idx], ...patch };
    updatePanel({ staff });
  };

  const patchTask = (idx: number, patch: Partial<WizardStaffRow['taskStaff']>) => {
    const row = p1.staff[idx];
    updateStaffRow(idx, { taskStaff: { ...row.taskStaff, ...patch } });
  };

  const patchAdminWa = (idx: number, patch: Partial<WizardStaffRow['adminWhatsapp']>) => {
    const row = p1.staff[idx];
    updateStaffRow(idx, { adminWhatsapp: { ...row.adminWhatsapp, ...patch } });
  };

  const patchDashboard = (idx: number, patch: Partial<WizardStaffRow['dashboard']>) => {
    const row = p1.staff[idx];
    updateStaffRow(idx, { dashboard: { ...row.dashboard, ...patch } });
  };

  const addRole = (idx: number, role: RoleKey) => {
    const row = p1.staff[idx];
    updateStaffRow(idx, { roles: { ...row.roles, [role]: true } });
  };

  const removeRole = (idx: number, role: RoleKey) => {
    const row = p1.staff[idx];
    updateStaffRow(idx, { roles: { ...row.roles, [role]: false } });
  };

  const removePerson = (idx: number) => {
    updatePanel({ staff: p1.staff.filter((_, i) => i !== idx) });
  };

  return (
    <div className="ob-sh ob-team ob-team--simple">
      <div className="eyebrow">Étape 1 · Équipe</div>
      <h1>Qui fait quoi ?</h1>
      <p className="sub">
        Config compacte ici — granularité complète dans <strong>Task · Équipe</strong> ou{' '}
        <strong>Workers</strong> après apply.
      </p>

      {p1.staff.length === 0 ? (
        <div className="ob-team-empty">
          <div className="ob-team-empty-icon">👥</div>
          <p className="ob-team-empty-title">Aucun membre pour l&apos;instant</p>
          <p className="ob-team-empty-sub">
            Ajoutez une personne, puis ses rôles (staff, admin WA, dashboard).
          </p>
          <button
            type="button"
            className="ob-btn-primary ob-team-empty-cta"
            onClick={() => updatePanel({ staff: [defaultStaffRow()] })}
          >
            + Ajouter une personne
          </button>
        </div>
      ) : (
        <>
          <div className="ob-team-list">
            {p1.staff.map((row, idx) => {
              const displayName = staffDisplayName(row) || `Personne ${idx + 1}`;
              const missingRoles = ADD_ROLES.filter((r) => !row.roles[r.key]);

              return (
                <article key={row.id} className="ob-team-member ob-team-member--simple">
                  <header className="ob-team-member-summary">
                    <strong>{displayName}</strong>
                    {row.whatsapp ? <span>{row.whatsapp}</span> : null}
                    <button
                      type="button"
                      className="ob-team-remove"
                      title="Retirer cette personne"
                      onClick={() => removePerson(idx)}
                    >
                      ×
                    </button>
                  </header>

                  <div className="ob-team-identity-grid ob-team-identity-grid--compact">
                    <label className="ob-team-field-lbl">
                      Prénom
                      <input
                        className="ob-field ob-field--dense"
                        value={row.firstName}
                        onChange={(e) => updateStaffRow(idx, { firstName: e.target.value })}
                      />
                    </label>
                    <label className="ob-team-field-lbl">
                      Nom
                      <input
                        className="ob-field ob-field--dense"
                        value={row.lastName}
                        onChange={(e) => updateStaffRow(idx, { lastName: e.target.value })}
                      />
                    </label>
                    <label className="ob-team-field-lbl">
                      WhatsApp
                      <input
                        className="ob-field ob-field--dense"
                        placeholder="+212…"
                        value={row.whatsapp}
                        onChange={(e) => updateStaffRow(idx, { whatsapp: e.target.value })}
                      />
                    </label>
                    <label className="ob-team-field-lbl">
                      Email
                      <input
                        className="ob-field ob-field--dense"
                        type="email"
                        value={row.email}
                        onChange={(e) => updateStaffRow(idx, { email: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="ob-team-roles-block">
                    <div className="ob-team-roles-block-title">Rôles</div>

                    {row.roles.taskStaff && (
                      <div className="ob-team-role-card ob-team-role-card--task">
                        <div className="ob-team-role-card-hd">
                          <span>🧹 Staff tâches</span>
                          <button
                            type="button"
                            className="ob-team-role-remove"
                            onClick={() => removeRole(idx, 'taskStaff')}
                          >
                            Retirer
                          </button>
                        </div>
                        <ObStaffRolePanel
                          config={row.taskStaff}
                          ownerCities={ownerCities}
                          listings={listings}
                          onChange={(patch) => patchTask(idx, patch)}
                        />
                      </div>
                    )}

                    {row.roles.adminWhatsapp && (
                      <div className="ob-team-role-card ob-team-role-card--wa">
                        <div className="ob-team-role-card-hd">
                          <span>📱 Admin WhatsApp</span>
                          <button
                            type="button"
                            className="ob-team-role-remove"
                            onClick={() => removeRole(idx, 'adminWhatsapp')}
                          >
                            Retirer
                          </button>
                        </div>
                        <ObAdminWaRolePanel
                          config={row.adminWhatsapp}
                          ownerCities={ownerCities}
                          listings={listings}
                          onChange={(patch) => patchAdminWa(idx, patch)}
                        />
                      </div>
                    )}

                    {row.roles.dashboardEmail && (
                      <div className="ob-team-role-card ob-team-role-card--dash">
                        <div className="ob-team-role-card-hd">
                          <span>🖥 Dashboard</span>
                          <button
                            type="button"
                            className="ob-team-role-remove"
                            onClick={() => removeRole(idx, 'dashboardEmail')}
                          >
                            Retirer
                          </button>
                        </div>
                        <ObDashboardRolePanel
                          config={row.dashboard}
                          email={row.email}
                          ownerCities={ownerCities}
                          listings={listings}
                          onChange={(patch) => patchDashboard(idx, patch)}
                        />
                      </div>
                    )}

                    {missingRoles.length > 0 && (
                      <div className="ob-team-add-roles">
                        {missingRoles.map((r) => (
                          <button
                            key={r.key}
                            type="button"
                            className={`ob-team-add-role ob-team-add-role--${r.key}`}
                            title={r.hint}
                            onClick={() => addRole(idx, r.key)}
                          >
                            + {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            className="ob-btn-ghost ob-team-add"
            onClick={() => updatePanel({ staff: [...p1.staff, defaultStaffRow()] })}
          >
            + Ajouter une autre personne
          </button>
        </>
      )}
    </div>
  );
}
