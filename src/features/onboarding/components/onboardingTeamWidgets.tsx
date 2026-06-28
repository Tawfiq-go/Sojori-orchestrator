import { useMemo, useState } from 'react';
import StaffAccessMultiSelect from '../../taskHub/staff-design/StaffAccessMultiSelect';
import { STAFF_TASK_PILLS, DAY_LABELS } from '../../taskHub/staff-design/staffDesignConstants';

/** Libellés courts — tenir ~13 types sur 2 lignes */
const TASK_SHORT_LABEL: Record<string, string> = {
  arrival_choose: 'Arrivée',
  departure_choose: 'Départ',
  cleaning_free: 'Ménage gr.',
  arrival_declare: 'Décl. arr.',
  departure_declare: 'Décl. dép.',
  registration: 'Enregistr.',
  cleaning_paid: 'Ménage pay.',
  checkout_cleaning: 'Mén. checkout',
  transport: 'Transport',
  groceries: 'Courses',
  concierge: 'Concierge',
  support: 'Support',
  service_client: 'Svc client',
};

function taskShortLabel(key: string, fallback: string): string {
  return TASK_SHORT_LABEL[key] ?? fallback;
}
import type { WizardAdminWhatsappConfig, WizardDashboardMemberConfig, WizardStaffTaskConfig } from '../types';
import type { WizardAccessScope } from '../wizardScope';
import { scopeHasSelection } from '../wizardScope';
import {
  WA_MENU_TYPES,
  WA_PUSH_GROUPS_FOR_EXPAND,
  toggleWaMenuOnOff,
  toggleWaPushNotification,
} from '../wizardAdminWhatsapp';
import {
  ALL_ACTIONS,
  applyWizardDashboardAdmin,
  buildOwnerPermissionGroups,
  isCategoryFullyOn,
  isWizardDashboardAdmin,
  toggleDashboardCategory,
  toggleDashboardPageAction,
} from '../wizardDashboardAccess';

export type ListingOpt = { id: string; label: string; city?: string };

type ScopeProps = {
  scope: WizardAccessScope;
  ownerCities: string[];
  listings: ListingOpt[];
  onChange: (patch: Partial<WizardAccessScope>) => void;
};

type ScopeTab = 'ville' | 'annonce';

export function ObScopePicker({ scope, ownerCities, listings, onChange }: ScopeProps) {
  const [expanded, setExpanded] = useState<Set<ScopeTab>>(() => new Set());

  const cityOptions = useMemo(
    () => ownerCities.map((c) => ({ id: c, label: c, emoji: '📍' })),
    [ownerCities],
  );
  const listingOptions = useMemo(
    () =>
      listings.map((l) => ({
        id: l.id,
        label: l.label,
        emoji: '🏠',
        sublabel: l.city,
      })),
    [listings],
  );

  const toggleAll = () => {
    if (scope.scopeAll) {
      onChange({ scopeAll: false });
      return;
    }
    setExpanded(new Set());
    onChange({ scopeAll: true, cities: [], listingIds: [] });
  };

  const togglePanel = (tab: ScopeTab) => {
    if (scope.scopeAll) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      return next;
    });
  };

  const setCities = (cities: string[]) => {
    onChange({ scopeAll: false, cities, listingIds: scope.listingIds });
  };

  const setListingIds = (listingIds: string[]) => {
    onChange({ scopeAll: false, cities: scope.cities, listingIds });
  };

  const needsPick = !scope.scopeAll && !scopeHasSelection(scope);
  const showPanels = !scope.scopeAll && expanded.size > 0;
  const listingLarge = listingOptions.length >= 25;

  return (
    <div className="ob-team-scope-block">
      <div className="ob-team-config-lbl">Périmètre annonces</div>

      <div className="ob-scope-tabbar" role="tablist" aria-label="Périmètre annonces">
        <button
          type="button"
          role="tab"
          aria-selected={scope.scopeAll}
          className={`ob-scope-tab${scope.scopeAll ? ' on active' : ''}`}
          onClick={toggleAll}
        >
          <span className="ob-scope-tab-ic">🌍</span>
          <span className="ob-scope-tab-txt">Toutes</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={expanded.has('ville')}
          aria-disabled={scope.scopeAll}
          disabled={scope.scopeAll}
          className={`ob-scope-tab${expanded.has('ville') ? ' active' : ''}${scope.cities.length ? ' has-sel' : ''}${scope.scopeAll ? ' is-off' : ''}`}
          onClick={() => togglePanel('ville')}
        >
          <span className="ob-scope-tab-ic">📍</span>
          <span className="ob-scope-tab-txt">
            Ville{scope.cities.length ? ` · ${scope.cities.length}` : ''}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={expanded.has('annonce')}
          aria-disabled={scope.scopeAll || !listingOptions.length}
          disabled={scope.scopeAll || !listingOptions.length}
          className={`ob-scope-tab${expanded.has('annonce') ? ' active' : ''}${scope.listingIds.length ? ' has-sel' : ''}${scope.scopeAll ? ' is-off' : ''}`}
          onClick={() => togglePanel('annonce')}
        >
          <span className="ob-scope-tab-ic">🏠</span>
          <span className="ob-scope-tab-txt">
            Annonces
            {listingOptions.length
              ? scope.listingIds.length
                ? ` · ${scope.listingIds.length}`
                : ` (${listingOptions.length})`
              : ''}
          </span>
        </button>
      </div>

      {scope.scopeAll ? (
        <p className="ob-scope-tab-hint">Tout le parc du propriétaire — ville et annonces non modifiables.</p>
      ) : null}

      {showPanels ? (
        <div
          className={`ob-scope-panels${expanded.size > 1 ? ' ob-scope-panels--split' : ''}`}
        >
          {expanded.has('ville') ? (
            <div className="ob-scope-panel" role="tabpanel">
              <div className="ob-scope-panel-hd">📍 Par ville</div>
              <StaffAccessMultiSelect
                inline
                compact
                options={cityOptions}
                selectedIds={scope.cities}
                onChange={setCities}
                placeholder="Aucune ville"
                searchPlaceholder="Rechercher une ville…"
                addLabel="Villes ▾"
                emptyLabel="Aucune ville disponible"
              />
            </div>
          ) : null}

          {expanded.has('annonce') ? (
            <div className="ob-scope-panel" role="tabpanel">
              <div className="ob-scope-panel-hd">🏠 Par annonce</div>
              <StaffAccessMultiSelect
                inline
                compact
                options={listingOptions}
                selectedIds={scope.listingIds}
                onChange={setListingIds}
                disabled={!listingOptions.length}
                largeList={listingLarge}
                placeholder="Aucune annonce"
                searchPlaceholder="Rechercher…"
                addLabel={`Annonces ▾ · ${listingOptions.length}`}
                emptyLabel="Aucune annonce trouvée"
              />
            </div>
          ) : null}
        </div>
      ) : !scope.scopeAll ? (
        <p className="ob-scope-tab-hint ob-scope-tab-hint--muted">
          Ouvrez <strong>Ville</strong> et/ou <strong>Annonces</strong> pour affiner (combinables).
        </p>
      ) : null}

      {needsPick ? (
        <p className="ob-team-scope-warn">
          Activez <strong>Toutes</strong>, ou sélectionnez au moins une ville ou une annonce.
        </p>
      ) : null}
    </div>
  );
}

function scopeFromConfig(c: {
  scopeAll: boolean;
  cities: string[];
  listingIds: string[];
}): WizardAccessScope {
  return { scopeAll: c.scopeAll, cities: c.cities, listingIds: c.listingIds };
}

export function ObStaffRolePanel({
  config,
  ownerCities,
  listings,
  onChange,
}: {
  config: WizardStaffTaskConfig;
  ownerCities: string[];
  listings: ListingOpt[];
  onChange: (patch: Partial<WizardStaffTaskConfig>) => void;
}) {
  const toggleTask = (key: string) => {
    const set = new Set(config.allowedTaskTypes);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    onChange({ allowedTaskTypes: [...set] });
  };

  const toggleDay = (d: number) => {
    const set = new Set(config.daysOfWeek);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    onChange({ daysOfWeek: [...set].sort((a, b) => a - b) });
  };

  return (
    <div className="ob-team-role-body so-staff-root ob-team-role-body--staff">
      <div className="ob-team-task-hd">
        <span className="ob-team-config-lbl ob-team-config-lbl--inline">Types de tâches</span>
        {config.allowedTaskTypes.length === 0 ? (
          <span className="ob-team-task-hd-warn">aucun</span>
        ) : (
          <span className="ob-team-task-hd-count">{config.allowedTaskTypes.length} sélectionné(s)</span>
        )}
      </div>
      <div className="ob-team-task-grid" role="group" aria-label="Types de tâches">
        {STAFF_TASK_PILLS.map((p) => {
          const on = config.allowedTaskTypes.includes(p.key);
          const short = taskShortLabel(p.key, p.label);
          return (
            <button
              key={p.key}
              type="button"
              className={`ob-team-task-pill${on ? ' on' : ''}`}
              onClick={() => toggleTask(p.key)}
              title={p.label}
            >
              <span className="ob-team-task-pill-emoji">{p.emoji}</span>
              <span className="ob-team-task-pill-label">{short}</span>
            </button>
          );
        })}
      </div>

      <div className="ob-team-schedule">
        <div className="ob-team-schedule-days">
          <span className="ob-team-schedule-lbl">Jours</span>
          <div className="ob-team-row ob-team-row--days">
            {DAY_LABELS.map((lbl, i) => (
              <button
                key={`day-${lbl}-${i}`}
                type="button"
                className={`ob-team-day${config.daysOfWeek.includes(i) ? ' on' : ''}`}
                onClick={() => toggleDay(i)}
                aria-pressed={config.daysOfWeek.includes(i)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div className="ob-team-schedule-times">
          <span className="ob-team-schedule-lbl">Horaires</span>
          <div className="ob-team-time">
            <input
              type="time"
              className="ob-field ob-field--dense ob-field--time"
              value={config.timeStart}
              onChange={(e) => onChange({ timeStart: e.target.value })}
            />
            <span className="ob-team-time-sep">→</span>
            <input
              type="time"
              className="ob-field ob-field--dense ob-field--time"
              value={config.timeEnd}
              onChange={(e) => onChange({ timeEnd: e.target.value })}
            />
          </div>
        </div>
        <div className="ob-team-schedule-ops">
          <button
            type="button"
            className={`ob-team-ops-admin${config.isOpsAdmin ? ' on' : ''}`}
            onClick={() => onChange({ isOpsAdmin: !config.isOpsAdmin })}
            title="Escalades + auto-accept des tâches"
          >
            👑 Ops admin
          </button>
        </div>
      </div>

      <ObScopePicker
        scope={scopeFromConfig(config)}
        ownerCities={ownerCities}
        listings={listings}
        onChange={(patch) => onChange(patch)}
      />
    </div>
  );
}

export function ObAdminWaRolePanel({
  config,
  ownerCities,
  listings,
  onChange,
}: {
  config: WizardAdminWhatsappConfig;
  ownerCities: string[];
  listings: ListingOpt[];
  onChange: (patch: Partial<WizardAdminWhatsappConfig>) => void;
}) {
  const [expandNotifs, setExpandNotifs] = useState(false);

  const toggleMenu = (menuType: string) => {
    const next = toggleWaMenuOnOff(config.menuPermissions, config.pushNotifications, menuType);
    onChange({
      menuPermissions: next.menuPermissions,
      pushNotifications: next.pushNotifications,
      notifCategories: next.notifCategories,
    });
    if (menuType === 'Message' && next.menuPermissions.Message !== 'none') {
      setExpandNotifs(true);
    }
  };

  const togglePush = (key: string) => {
    const next = toggleWaPushNotification(config.pushNotifications, key);
    onChange({
      pushNotifications: next.pushNotifications,
      notifCategories: next.notifCategories,
    });
  };

  const pushOn = (key: string) => config.pushNotifications[key] === true;
  const resMenuOn = (config.menuPermissions.Message ?? 'none') !== 'none';

  return (
    <div className="ob-team-role-body so-staff-root">
      <p className="ob-team-wa-hint ob-team-wa-hint--inline">
        Cliquez pour activer / désactiver chaque menu (accès écriture). Détail N·R·W dans{' '}
        <strong>Task · Admin WhatsApp</strong>.
      </p>
      <div className="pill-group ob-team-pill-group ob-team-wa-menus">
        {WA_MENU_TYPES.map((meta) => {
          const on = (config.menuPermissions[meta.type] ?? 'none') !== 'none';
          return (
            <button
              key={meta.type}
              type="button"
              className={`pill-toggle ob-team-wa-menu${on ? ' on' : ''}`}
              onClick={() => toggleMenu(meta.type)}
            >
              <strong>{meta.menuLetter}</strong> · {meta.label}
              <span className="ob-team-wa-acc">{on ? ' · ON' : ''}</span>
            </button>
          );
        })}
      </div>

      {resMenuOn && (
        <div className="ob-team-wa-res-auto">
          <div className="ob-team-config-lbl">Réservation · auto (menu M)</div>
          <div className="pill-group ob-team-pill-group">
            {WA_PUSH_GROUPS_FOR_EXPAND.find((g) => g.title === 'Réservation')?.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`pill-toggle${pushOn(item.key) ? ' on' : ''}`}
                onClick={() => togglePush(item.key)}
              >
                {pushOn(item.key) ? '🔔' : '🔕'} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!expandNotifs ? (
        <button type="button" className="ob-team-link-btn" onClick={() => setExpandNotifs(true)}>
          + Autres notifications push
        </button>
      ) : (
        <div className="ob-team-wa-notif-expand">
          <div className="ob-team-wa-expand-hd">
            <span>Notifications push</span>
            <button type="button" className="ob-team-link-btn" onClick={() => setExpandNotifs(false)}>
              Masquer
            </button>
          </div>
          {WA_PUSH_GROUPS_FOR_EXPAND.filter((g) => g.title !== 'Réservation' || !resMenuOn).map(
            (group) => (
              <div key={group.title} className="ob-team-wa-block">
                <div className="ob-team-wa-block-title">{group.title}</div>
                {group.hint ? <p className="ob-team-wa-hint">{group.hint}</p> : null}
                <div className="pill-group ob-team-pill-group">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`pill-toggle${pushOn(item.key) ? ' on' : ''}`}
                      onClick={() => togglePush(item.key)}
                    >
                      {pushOn(item.key) ? '🔔' : '🔕'} {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <ObScopePicker
        scope={scopeFromConfig(config)}
        ownerCities={ownerCities}
        listings={listings}
        onChange={(patch) => onChange(patch)}
      />
    </div>
  );
}

export function ObDashboardRolePanel({
  config,
  email,
  ownerCities,
  listings,
  onChange,
}: {
  config: WizardDashboardMemberConfig;
  email: string;
  ownerCities: string[];
  listings: ListingOpt[];
  onChange: (patch: Partial<WizardDashboardMemberConfig>) => void;
}) {
  const groups = useMemo(() => buildOwnerPermissionGroups(), []);
  const isAdmin = isWizardDashboardAdmin(config.featureGrants, config.isAdmin);
  const [activeGroup, setActiveGroup] = useState<string | null>(() => groups[0]?.group ?? null);

  const active = useMemo(
    () => groups.find((g) => g.group === activeGroup) ?? groups[0] ?? null,
    [groups, activeGroup],
  );

  const setAdmin = (on: boolean) => {
    onChange({
      isAdmin: on,
      featureGrants: applyWizardDashboardAdmin(on, config.featureGrants),
    });
  };

  const toggleCategory = (group: string, featureKeys: string[]) => {
    const on = !isCategoryFullyOn(config.featureGrants, featureKeys);
    onChange({ featureGrants: toggleDashboardCategory(config.featureGrants, featureKeys, on) });
    setActiveGroup(group);
  };

  return (
    <div className="ob-team-role-body so-staff-root">
      {email ? (
        <p className="ob-team-dash-email-note">
          Email : <strong>{email}</strong>
        </p>
      ) : null}

      <div className="ob-team-admin-row">
        <div>
          <strong>Accès admin dashboard</strong>
          <p className="ob-team-role-note">Toutes les pages Owner</p>
        </div>
        <button
          type="button"
          className={`ob-team-toggle${isAdmin ? ' on' : ''}`}
          onClick={() => setAdmin(!isAdmin)}
          aria-pressed={isAdmin}
        />
      </div>

      {isAdmin ? (
        <p className="ob-team-dash-admin-note">
          Mode admin — accès complet à toutes les catégories et pages. Aucune sélection granulaire
          nécessaire.
        </p>
      ) : (
        <>
          <p className="ob-team-wa-hint ob-team-wa-hint--dash">
            Choisissez une catégorie, puis activez les pages. Catégorie ON = toutes les pages
            incluses.
          </p>

          <div className="ob-team-dash-tabbar" role="tablist" aria-label="Catégories dashboard">
            {groups.map((g) => {
              const featureKeys = g.features.map((f) => f.featureKey);
              const fullOn = isCategoryFullyOn(config.featureGrants, featureKeys);
              const selected = active?.group === g.group;
              return (
                <button
                  key={g.group}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`ob-team-dash-tab${selected ? ' active' : ''}${fullOn ? ' on' : ''}`}
                  onClick={() => setActiveGroup(g.group)}
                >
                  {g.group}
                </button>
              );
            })}
          </div>

          {active ? (
            <div className="ob-team-dash-panel" role="tabpanel">
              {(() => {
                const featureKeys = active.features.map((f) => f.featureKey);
                const fullOn = isCategoryFullyOn(config.featureGrants, featureKeys);
                return (
                  <>
                    <div className="ob-team-dash-panel-hd">
                      <div>
                        <strong>{active.group}</strong>
                        <p className="ob-team-dash-panel-sub">
                          {active.features.map((f) => f.label).join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`ob-team-dash-cat-toggle${fullOn ? ' on' : ''}`}
                        onClick={() => toggleCategory(active.group, featureKeys)}
                      >
                        {fullOn ? '✓ Catégorie ON' : 'Activer catégorie'}
                      </button>
                    </div>
                    <div className="ob-team-dash-pages">
                      {active.features.map((f) => {
                        const pageOn = ALL_ACTIONS.every((a) =>
                          config.featureGrants.some(
                            (gr) =>
                              gr.feature === f.featureKey && (gr.actions || []).includes(a),
                          ),
                        );
                        const greyed = fullOn;
                        return (
                          <button
                            key={f.featureKey}
                            type="button"
                            className={`ob-team-dash-page${pageOn ? ' on' : ''}${greyed ? ' included' : ''}`}
                            disabled={greyed}
                            title={greyed ? 'Inclus via la catégorie' : f.label}
                            onClick={() => {
                              const nextOn = !pageOn;
                              let grants = config.featureGrants;
                              for (const action of ALL_ACTIONS) {
                                grants = toggleDashboardPageAction(
                                  grants,
                                  f.featureKey,
                                  action,
                                  nextOn,
                                );
                              }
                              onChange({ featureGrants: grants });
                            }}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </>
      )}

      <ObScopePicker
        scope={scopeFromConfig(config)}
        ownerCities={ownerCities}
        listings={listings}
        onChange={(patch) => onChange(patch)}
      />
    </div>
  );
}
