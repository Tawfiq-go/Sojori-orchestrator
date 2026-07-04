import type { WizardPanel1, WizardStaffRow } from '../types';
import { defaultStaffRow } from '../defaults';
import { staffDisplayName } from '../staffNormalize';

type AccessKey = keyof WizardStaffRow['roles'];

const ACCESS_DEFS: Array<{ key: AccessKey; emoji: string; label: string; hint: string }> = [
  { key: 'taskStaff', emoji: '👷', label: 'Staff terrain', hint: 'reçoit et exécute les tâches (WhatsApp)' },
  { key: 'adminWhatsapp', emoji: '📱', label: 'Admin WhatsApp', hint: 'pilote la conciergerie depuis WhatsApp' },
  { key: 'dashboardEmail', emoji: '🖥', label: 'Dashboard', hint: 'accès web par email' },
];

type Props = {
  p1: WizardPanel1;
  ownerCities: string[];
  updatePanel: (patch: Partial<WizardPanel1>) => void;
};

export default function OnboardingStepTeamExpress({ p1, ownerCities, updatePanel }: Props) {
  const updateRow = (idx: number, patch: Partial<WizardStaffRow>) => {
    const staff = [...p1.staff];
    staff[idx] = { ...staff[idx], ...patch };
    updatePanel({ staff });
  };

  const toggleAccess = (idx: number, key: AccessKey) => {
    const row = p1.staff[idx];
    updateRow(idx, { roles: { ...row.roles, [key]: !row.roles[key] } });
  };

  /** Config périmètre (scopeAll + cities) associée à chaque accès. */
  const SCOPE_FIELD: Record<AccessKey, 'taskStaff' | 'adminWhatsapp' | 'dashboard'> = {
    taskStaff: 'taskStaff',
    adminWhatsapp: 'adminWhatsapp',
    dashboardEmail: 'dashboard',
  };

  /** Périmètre villes d'un accès — « Toutes » = scopeAll. */
  const setAllCities = (idx: number, key: AccessKey) => {
    const row = p1.staff[idx];
    const field = SCOPE_FIELD[key];
    updateRow(idx, { [field]: { ...row[field], scopeAll: true, cities: [] } } as Partial<WizardStaffRow>);
  };

  const toggleCity = (idx: number, key: AccessKey, city: string) => {
    const row = p1.staff[idx];
    const field = SCOPE_FIELD[key];
    const scope = row[field];
    const current = scope.scopeAll ? [] : scope.cities;
    const cities = current.includes(city)
      ? current.filter((c) => c !== city)
      : [...current, city];
    updateRow(idx, {
      [field]: { ...scope, scopeAll: cities.length === 0, cities },
    } as Partial<WizardStaffRow>);
  };

  const addPerson = () => updatePanel({ staff: [...p1.staff, defaultStaffRow()] });
  const removePerson = (idx: number) => updatePanel({ staff: p1.staff.filter((_, i) => i !== idx) });

  return (
    <div className="ob-x">
      {p1.staff.map((row, idx) => {
        const needsEmail = row.roles.dashboardEmail;
        const needsWhatsapp = row.roles.taskStaff || row.roles.adminWhatsapp;
        return (
          <section key={row.id} className="ob-card ob-x-section">
            <div className="ob-card-b">
              <div className="ob-x-person-head">
                <p className="ob-x-title" style={{ margin: 0 }}>
                  👤 {staffDisplayName(row) || `Personne ${idx + 1}`}
                </p>
                <button
                  type="button"
                  className="ob-orch-tier-remove"
                  title="Retirer cette personne"
                  onClick={() => removePerson(idx)}
                >
                  ×
                </button>
              </div>
              <div className="ob-x-person-fields">
                <input
                  className="ob-field ob-field--dense"
                  placeholder="Prénom"
                  value={row.firstName}
                  onChange={(e) => updateRow(idx, { firstName: e.target.value })}
                />
                <input
                  className="ob-field ob-field--dense"
                  placeholder="Nom"
                  value={row.lastName}
                  onChange={(e) => updateRow(idx, { lastName: e.target.value })}
                />
                <input
                  className="ob-field ob-field--dense"
                  placeholder={`WhatsApp (+212…)${needsWhatsapp ? ' *' : ''}`}
                  value={row.whatsapp}
                  onChange={(e) => updateRow(idx, { whatsapp: e.target.value })}
                />
                <input
                  className="ob-field ob-field--dense"
                  placeholder={`Email${needsEmail ? ' *' : ''}`}
                  value={row.email}
                  onChange={(e) => updateRow(idx, { email: e.target.value })}
                />
              </div>
              <div className="ob-x-rows" style={{ marginTop: 10 }}>
                {ACCESS_DEFS.map((a) => {
                  const scope = row[SCOPE_FIELD[a.key]];
                  return (
                    <div key={a.key}>
                      <div className="ob-x-row">
                        <span className="ob-x-row-label">
                          {a.emoji} {a.label}
                          <span className="ob-x-access-hint"> — {a.hint}</span>
                        </span>
                        <button
                          type="button"
                          className={`ob-toggle ${row.roles[a.key] ? 'on' : ''}`}
                          aria-pressed={row.roles[a.key]}
                          onClick={() => toggleAccess(idx, a.key)}
                        />
                      </div>
                      {row.roles[a.key] && (
                        <div className="ob-x-cities">
                          <span className="ob-x-access-hint">Villes :</span>
                          <button
                            type="button"
                            className={`ob-chip ob-x-day${scope.scopeAll ? ' on' : ''}`}
                            onClick={() => setAllCities(idx, a.key)}
                          >
                            Toutes
                          </button>
                          {ownerCities.map((city) => {
                            const on = !scope.scopeAll && scope.cities.includes(city);
                            return (
                              <button
                                key={city}
                                type="button"
                                className={`ob-chip ob-x-day${on ? ' on' : ''}`}
                                onClick={() => toggleCity(idx, a.key, city)}
                              >
                                {city}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <button type="button" className="ob-btn-ghost ob-orch-tier-add" onClick={addPerson}>
        + Ajouter une personne
      </button>

      <p className="ob-x-auto">
        Réglé automatiquement : accès à toutes les annonces, contrat employé, menus WhatsApp et
        notifications par défaut. Contrats, permissions menu par menu, horaires et périmètre par
        ville : onglet « Avancé ».
      </p>
    </div>
  );
}
