import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  WizardCapabilities,
  WizardCleaningFreeTier,
  WizardJxSettings,
  WizardOrchestrationQuickConfig,
  WizardPanel3,
} from '../types';
import {
  applyJxPreset,
  JX_PRESETS,
  jxSelectOptions,
  type JxRowDef,
} from '../wizardGuestAccess';
import { capabilitiesForJxPreset } from '../apply/wizardCapabilitiesToActivations';
import {
  capabilityKeysForDashboardRow,
  CONCIERGE_QUICK_PICKS,
  dashboardRowDef,
  defaultOrchestrationQuickConfig,
  groupHasEnabledQuickConfig,
  isDashboardRowServiceEnabled,
  ORCH_DASHBOARD_GROUPS,
  setDashboardRowServiceEnabled,
} from '../onboardingOrchestrationDashboard';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`ob-toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    />
  );
}

type Props = {
  panel3: WizardPanel3;
  cities: string[];
  onChange: (patch: Partial<WizardPanel3>) => void;
};

export default function OnboardingStepOrchestration({ panel3, cities, onChange }: Props) {
  const caps = panel3.capabilities;
  const jx = panel3.jx ?? applyJxPreset('standard');
  const quickConfig = panel3.quickConfig ?? defaultOrchestrationQuickConfig(cities);
  const [openQuick, setOpenQuick] = useState<Record<string, boolean>>({
    concierge: true,
    cleaning: true,
  });

  const setCaps = (next: WizardCapabilities) => onChange({ capabilities: next });
  const setJx = (next: WizardJxSettings) => onChange({ jx: next });
  const setQuick = (next: WizardOrchestrationQuickConfig) => onChange({ quickConfig: next });

  const setField = (key: keyof WizardJxSettings, value: string | boolean) => {
    setJx({ ...jx, [key]: value, preset: 'custom' });
  };

  const applyPreset = (id: WizardJxSettings['preset']) => {
    if (id === 'custom') return;
    const nextJx = applyJxPreset(id);
    const nextCaps = capabilitiesForJxPreset(id);
    const nextQuick = {
      ...quickConfig,
      cleaningModes: {
        free: nextCaps.cleaningFree,
        paid: nextCaps.cleaningPaid,
        sojori: nextCaps.cleaningSojori,
      },
    };
    onChange({
      jx: nextJx,
      capabilities: nextCaps,
      quickConfig: nextQuick,
    });
  };

  const renderJxControl = (row: JxRowDef) => {
    const val = jx[row.key];
    if (row.toggle) {
      return <Toggle on={Boolean(val)} onChange={(v) => setField(row.key, v)} />;
    }
    const options = jxSelectOptions(row, String(val ?? ''));
    return (
      <select
        className="ob-jx-select ob-field ob-field--dense"
        value={String(val ?? options[0] ?? '')}
        onChange={(e) => setField(row.key, e.target.value)}
        disabled={!isDashboardRowServiceEnabled(row, caps)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  };

  const updateCleaningTier = (index: number, patch: Partial<WizardCleaningFreeTier>) => {
    const tiers = [...quickConfig.cleaningFreeTiers];
    tiers[index] = { ...tiers[index], ...patch };
    setQuick({ ...quickConfig, cleaningFreeTiers: tiers });
  };

  const removeCleaningTier = (index: number) => {
    setQuick({
      ...quickConfig,
      cleaningFreeTiers: quickConfig.cleaningFreeTiers.filter((_, i) => i !== index),
    });
  };

  const addCleaningTier = () => {
    const last = quickConfig.cleaningFreeTiers[quickConfig.cleaningFreeTiers.length - 1];
    const startDay = last ? last.endDay + 1 : 11;
    setQuick({
      ...quickConfig,
      cleaningFreeTiers: [
        ...quickConfig.cleaningFreeTiers,
        { startDay, endDay: startDay + 9, numberOfCleaning: 1 },
      ],
    });
  };

  const setCleaningMode = (mode: keyof WizardOrchestrationQuickConfig['cleaningModes'], on: boolean) => {
    const cleaningModes = { ...quickConfig.cleaningModes, [mode]: on };
    const nextCaps = {
      ...caps,
      cleaningFree: cleaningModes.free,
      cleaningPaid: cleaningModes.paid,
      cleaningSojori: cleaningModes.sojori,
    };
    onChange({
      capabilities: nextCaps,
      quickConfig: { ...quickConfig, cleaningModes },
    });
  };

  const transportCities = useMemo(() => {
    const keys = Object.keys(quickConfig.transportAirportByCity);
    return keys.length ? keys : cities;
  }, [quickConfig.transportAirportByCity, cities]);

  const renderQuickConfig = (kind: 'cleaning' | 'transport' | 'concierge') => {
    if (kind === 'cleaning') {
      return (
        <div className="ob-orch-quick-body">
          <p className="ob-orch-quick-lead">Types de ménage proposés au voyageur</p>
          <div className="ob-orch-quick-modes">
            <label className="ob-orch-quick-mode">
              <Toggle
                on={quickConfig.cleaningModes.free}
                onChange={(v) => setCleaningMode('free', v)}
              />
              <span>Inclus (gratuit selon durée)</span>
            </label>
            <label className="ob-orch-quick-mode">
              <Toggle
                on={quickConfig.cleaningModes.paid}
                onChange={(v) => setCleaningMode('paid', v)}
              />
              <span>Payant à la demande</span>
            </label>
            <label className="ob-orch-quick-mode">
              <Toggle
                on={quickConfig.cleaningModes.sojori}
                onChange={(v) => setCleaningMode('sojori', v)}
              />
              <span>Ménage Sojori (post-checkout)</span>
            </label>
          </div>
          {quickConfig.cleaningModes.free ? (
            <>
              <p className="ob-orch-quick-lead">Ménages inclus — intervalles de nuitées</p>
              <div className="ob-orch-tier-table">
                {quickConfig.cleaningFreeTiers.map((tier, i) => (
                  <div key={`tier-${i}`} className="ob-orch-tier-row">
                    <label>
                      De
                      <input
                        className="ob-field ob-field--dense"
                        type="number"
                        min={1}
                        value={tier.startDay}
                        onChange={(e) =>
                          updateCleaningTier(i, { startDay: Number(e.target.value) || 1 })
                        }
                      />
                    </label>
                    <label>
                      à
                      <input
                        className="ob-field ob-field--dense"
                        type="number"
                        min={1}
                        value={tier.endDay}
                        onChange={(e) =>
                          updateCleaningTier(i, { endDay: Number(e.target.value) || 1 })
                        }
                      />
                      nuits
                    </label>
                    <label>
                      →
                      <input
                        className="ob-field ob-field--dense"
                        type="number"
                        min={0}
                        value={tier.numberOfCleaning}
                        onChange={(e) =>
                          updateCleaningTier(i, {
                            numberOfCleaning: Number(e.target.value) || 0,
                          })
                        }
                      />
                      ménage(s)
                    </label>
                    <button
                      type="button"
                      className="ob-orch-tier-remove"
                      title="Supprimer cet intervalle"
                      onClick={() => removeCleaningTier(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="ob-btn-ghost ob-orch-tier-add" onClick={addCleaningTier}>
                + Ajouter un intervalle
              </button>
            </>
          ) : null}
        </div>
      );
    }

    if (kind === 'transport') {
      return (
        <div className="ob-orch-quick-body">
          <p className="ob-orch-quick-lead">Navette aéroport — prix forfaitaire (MAD)</p>
          <div className="ob-orch-city-prices">
            {transportCities.map((city) => (
              <label key={city} className="ob-orch-city-price">
                <span>{city}</span>
                <input
                  className="ob-field ob-field--dense"
                  type="number"
                  min={0}
                  step={50}
                  value={quickConfig.transportAirportByCity[city] ?? ''}
                  onChange={(e) =>
                    setQuick({
                      ...quickConfig,
                      transportAirportByCity: {
                        ...quickConfig.transportAirportByCity,
                        [city]: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
                <span className="ob-orch-city-unit">MAD</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="ob-orch-quick-body">
        <p className="ob-orch-quick-lead">Services conciergerie à proposer (tarifs détaillés plus tard)</p>
        <div className="ob-chips ob-orch-concierge-picks">
          {CONCIERGE_QUICK_PICKS.map((pick) => {
            const on = quickConfig.conciergeServiceIds.includes(pick.id);
            return (
              <button
                key={pick.id}
                type="button"
                className={`ob-chip ${on ? 'on' : ''}`}
                onClick={() => {
                  const ids = on
                    ? quickConfig.conciergeServiceIds.filter((id) => id !== pick.id)
                    : [...quickConfig.conciergeServiceIds, pick.id];
                  setQuick({ ...quickConfig, conciergeServiceIds: ids });
                }}
              >
                {pick.icon} {pick.labelFr}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGroupQuick = (groupId: string, kind: 'cleaning' | 'transport' | 'concierge') => {
    const open = openQuick[groupId] ?? false;
    return (
      <div className="ob-orch-quick">
        <button
          type="button"
          className="ob-orch-quick-toggle"
          aria-expanded={open}
          onClick={() => setOpenQuick((s) => ({ ...s, [groupId]: !open }))}
        >
          <span>⚙️ Réglages rapides</span>
          <span className="ob-orch-quick-chevron">{open ? '▾' : '▸'}</span>
        </button>
        {open ? renderQuickConfig(kind) : null}
      </div>
    );
  };

  return (
    <div className="ob-sh">
      <div className="eyebrow">Étape 3 · Parcours client</div>
      <h1>Menu WhatsApp & parcours voyageur</h1>
      <p className="sub">
        Activez chaque service, définissez quand il apparaît (J-X), et préparez les bases métier.
        L&apos;affinage complet se fait dans le{' '}
        <Link to="/listings/orchestration-model?section=activation">modèle orchestration</Link>.
      </p>

      <div
        className="ob-cfg-banner"
        style={{
          background: 'rgba(200,30,30,0.08)',
          borderColor: 'rgba(200,30,30,0.25)',
          color: '#7a1a1a',
        }}
      >
        À l&apos;application (go live) : ce plan <b>remplace entièrement</b> l&apos;orchestration owner
        existante puis se propage aux listings importés.
      </div>

      <div className="ob-preset-grid ob-jx-preset-grid">
        {JX_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ob-preset ob-jx-preset${jx.preset === p.id ? ' on' : ''}`}
            onClick={() => applyPreset(p.id)}
          >
            <div style={{ fontWeight: 800 }}>
              {p.emoji} {p.title}
            </div>
            <div className="ob-jx-preset-desc">{p.desc}</div>
          </button>
        ))}
      </div>

      {ORCH_DASHBOARD_GROUPS.map((group) => (
        <section key={group.id} className="ob-orch-group">
          <header className="ob-orch-group-head">
            <span aria-hidden>{group.emoji}</span>
            <h2>{group.title}</h2>
          </header>
          <div className="ob-card">
            <div className="ob-card-b ob-orch-table">
              {group.rowKeys.map((rowKey) => {
                const row = dashboardRowDef(rowKey);
                if (!row) return null;
                const serviceKeys = capabilityKeysForDashboardRow(row);
                const serviceOn = isDashboardRowServiceEnabled(row, caps);
                const showServiceToggle = serviceKeys.length > 0;

                return (
                  <div
                    key={String(rowKey)}
                    className={`ob-orch-row${serviceOn ? '' : ' ob-orch-row--off'}`}
                  >
                    <span className="ob-jx-emoji" aria-hidden>
                      {row.emoji}
                    </span>
                    <div className="ob-jx-label">
                      <div className="ob-jx-label-title">{row.label}</div>
                      {row.hint ? <div className="ob-jx-label-hint">{row.hint}</div> : null}
                    </div>
                    {showServiceToggle ? (
                      <div className="ob-orch-service">
                        <span className="ob-orch-service-label">Actif</span>
                        <Toggle
                          on={serviceOn}
                          onChange={(v) => setCaps(setDashboardRowServiceEnabled(row, caps, v))}
                        />
                      </div>
                    ) : (
                      <div className="ob-orch-service ob-orch-service--empty" />
                    )}
                    <div className="ob-orch-timing">
                      <span className="ob-orch-timing-label">J-X</span>
                      {renderJxControl(row)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {group.quick === 'cleaning' && groupHasEnabledQuickConfig(group, caps)
            ? renderGroupQuick(group.id, 'cleaning')
            : null}
          {group.id === 'concierge' && caps.transport
            ? renderGroupQuick(`${group.id}-transport`, 'transport')
            : null}
          {group.id === 'concierge' && caps.concierge
            ? renderGroupQuick(`${group.id}-concierge`, 'concierge')
            : null}
        </section>
      ))}

      <div className="ob-cfg-banner ob-jx-note" style={{ marginTop: 8 }}>
        <span aria-hidden>💡</span>
        <div>
          <p style={{ margin: '0 0 6px' }}>
            Réglages en <strong>J-X</strong> — quand chaque option apparaît dans le menu WhatsApp.
            Messages planifiés et heures précises :{' '}
            <Link to="/listings/orchestration-model">Annonces → Modèle orchestration</Link>.
          </p>
          <p style={{ margin: 0 }}>
            L&apos;<strong>ordre obligatoire</strong> (enregistrement → créneau → codes) est déduit de
            vos choix — notamment le toggle <strong>codes bloqués sans enregistrement + créneau</strong>.
            Pas besoin d&apos;activer un service « parent » : chaque ligne est indépendante.
          </p>
        </div>
      </div>
    </div>
  );
}
