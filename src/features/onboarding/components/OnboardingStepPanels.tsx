import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { UsePmOnboardingWizardResult } from '../hooks/usePmOnboardingWizard';
import type { WizardDraft } from '../types';
import { CITY_OPTIONS } from '../types';
import { deriveConditionsFromJx } from '../wizardGuestAccess';
import { defaultJx } from '../defaults';
import OnboardingStepTeam from './OnboardingStepTeam';
import OnboardingStepOrchestration from './OnboardingStepOrchestration';
import OnboardingStepDeadlines from './OnboardingStepDeadlines';
import OnboardingStepImport from './OnboardingStepImport';
import { staffDisplayName } from '../staffNormalize';
import { formatStaffPersonRecap, staffApplyAccountCounts } from '../staffRecap';
import { buildOrchestrationRecapFromDraft } from '../apply/orchestrationRecapFromDraft';
import { WIZARD_EDIT_STEPS, WIZARD_STEP_COUNT, WIZARD_VISIBLE_PANELS } from '../wizardNavigation';

interface StepPanelsProps {
  wizard: UsePmOnboardingWizardResult;
  ownerId: string;
}

export function OnboardingStepPanels({ wizard, ownerId }: StepPanelsProps) {
  const { draft, updatePanel, setPath, setCurrentPanel, validateCurrentPanel } = wizard;
  const panel = draft.currentPanel;

  const p0 = draft.panels['0']!;
  const p1 = draft.panels['1']!;
  const p3 = draft.panels['3']!;
  const p6 = draft.panels['6']!;

  useEffect(() => {
    if (panel === 2) setCurrentPanel(3);
    if (panel === 4 || panel === 5) setCurrentPanel(3);
    if (panel === 5) setCurrentPanel(6);
  }, [panel, setCurrentPanel]);

  if (panel === 0) {
    return (
      <div className="ob-sh">
        <div className="eyebrow">Étape 0 · Profil</div>
        <h1>Votre parcours de configuration</h1>
        <p className="sub">Quelques questions pour adapter le wizard à votre situation.</p>
        <div className="ob-cfg-banner">
          Phase configuration : aucun message voyageur pendant l&apos;import silencieux. L&apos;orchestration se lance réservation par réservation.
        </div>
        <div className="ob-card">
          <div className="ob-card-b">
            <p style={{ fontWeight: 700, marginBottom: 10 }}>Vos biens sont-ils sur Airbnb ?</p>
            <div className="ob-radios">
              <button
                type="button"
                className={`ob-rcard ${draft.path === 'A' ? 'on' : ''}`}
                onClick={() => {
                  setPath('A');
                  updatePanel('0', { hasAirbnb: true });
                }}
              >
                <span style={{ fontSize: 20 }}>🏠</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Oui — import Rentals United</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ob-t3)' }}>Parcours A (recommandé)</div>
                </div>
              </button>
              <button
                type="button"
                className={`ob-rcard ${draft.path === 'B' ? 'on' : ''}`}
                onClick={() => {
                  setPath('B');
                  updatePanel('0', { hasAirbnb: false });
                }}
              >
                <span style={{ fontSize: 20 }}>✏️</span>
                <div>
                  <div style={{ fontWeight: 700 }}>Non — création manuelle</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ob-t3)' }}>Parcours B</div>
                </div>
              </button>
            </div>
            <p style={{ fontWeight: 700, margin: '16px 0 8px' }}>Villes</p>
            <div className="ob-chips">
              {CITY_OPTIONS.map((city) => {
                const on = p0.cities.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    className={`ob-chip ${on ? 'on' : ''}`}
                    onClick={() => {
                      const cities = on ? p0.cities.filter((c) => c !== city) : [...p0.cities, city];
                      updatePanel('0', { cities });
                    }}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
            <label style={{ display: 'block', marginTop: 16, fontWeight: 700 }}>Nombre de biens estimé</label>
            <input
              className="ob-field"
              type="number"
              min={1}
              value={p0.expectedListings}
              onChange={(e) => updatePanel('0', { expectedListings: Number(e.target.value) || 1 })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (panel === 1) {
    const ownerCities = draft.panels['0']?.cities?.length
      ? draft.panels['0']!.cities
      : CITY_OPTIONS;

    return (
      <OnboardingStepTeam
        p1={p1}
        ownerCities={ownerCities}
        ownerId={ownerId}
        updatePanel={(patch) => updatePanel('1', patch)}
      />
    );
  }

  if (panel === 3) {
    const ownerCities = p0.cities?.length ? p0.cities : CITY_OPTIONS;
    return (
      <OnboardingStepOrchestration
        panel3={{
          ...p3,
          jx: p3.jx ?? draft.panels['4']?.jx ?? defaultJx(),
        }}
        cities={ownerCities}
        onChange={(patch) => {
          const caps = patch.capabilities ?? p3.capabilities;
          const jx = patch.jx ?? p3.jx ?? draft.panels['4']?.jx ?? defaultJx();
          updatePanel('3', patch);
          if (jx) {
            updatePanel('5', { conditions: deriveConditionsFromJx(jx, caps) });
          }
        }}
      />
    );
  }

  if (panel === 6) {
    return (
      <OnboardingStepDeadlines
        deadlines={p6.deadlines}
        capabilities={p3.capabilities}
        onChange={(patch) => updatePanel('6', { deadlines: { ...p6.deadlines, ...patch } })}
      />
    );
  }

  if (panel === 7) {
    const p7 = draft.panels['7'] ?? { importSubtab: 'selection' as const };

    const handleSkipImport = () => {
      updatePanel('7', { importSkippedLater: true, selectedRuIds: [], selectedRuPreview: [] });
      void validateCurrentPanel().then((ok) => {
        if (ok) toast.success('Import reporté — visible dans le récap et l\'étape Suite');
      });
    };

    return (
      <div className="ob-sh">
        <div className="eyebrow">Étape 6 · Import</div>
        <h1>{draft.path === 'A' ? 'Sélection des annonces Airbnb' : 'Création de vos annonces'}</h1>
        <p className="sub">
          {draft.path === 'A'
            ? 'Choisissez les annonces Rentals United à importer — l\'exécution se fera après le récapitulatif.'
            : 'Créez vos listings manuellement depuis le catalogue.'}
        </p>
        {draft.path === 'A' ? (
          <OnboardingStepImport
            ownerId={ownerId}
            panel={p7}
            onChange={(patch) => updatePanel('7', patch)}
            onSkipLater={handleSkipImport}
          />
        ) : (
          <a href="/listings" className="ob-btn-primary" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 16 }}>
            Aller au catalogue annonces
          </a>
        )}
      </div>
    );
  }

  return <Step8GoLive draft={draft} wizard={wizard} />;
}

function Step8GoLive({
  draft,
  wizard,
}: {
  draft: WizardDraft;
  wizard: UsePmOnboardingWizardResult;
}) {
  const navigate = useNavigate();
  const p0 = draft.panels['0'];
  const p1 = draft.panels['1'];
  const p7 = draft.panels['7'];
  const importCount = p7?.selectedRuIds?.length ?? 0;
  const importSkipped = p7?.importSkippedLater;
  const teamPeople = (p1?.staff ?? []).filter((s) => staffDisplayName(s));
  const teamAccounts = staffApplyAccountCounts(teamPeople);
  const importCityLabel = useMemo(() => {
    const names = [...new Set((p7?.selectedRuPreview ?? []).map((r) => r.cityName).filter(Boolean))];
    if (names.length === 0) return '';
    if (names.length === 1) return ` · ${names[0]}`;
    return ` · ${names.join(', ')}`;
  }, [p7?.selectedRuPreview]);

  const orchRecap = useMemo(() => buildOrchestrationRecapFromDraft(draft), [draft]);

  const suiteAlreadyRun = Boolean(draft.applyLog?.suiteRunAt);

  const launchSuite = async (autoRun: boolean) => {
    await wizard.relaunchSuiteApply();
    navigate(autoRun ? '/onboarding/suite?run=1' : '/onboarding/suite');
  };

  return (
    <div className="ob-sh">
      <div className="eyebrow">Étape 7 · Go live</div>
      <h1>Récapitulatif</h1>

      <div className="ob-go-live-cta">
        <p className="ob-go-live-cta-title">
          {suiteAlreadyRun ? 'Relancer l\u2019application' : 'Appliquer la configuration'}
        </p>
        <p className="ob-go-live-cta-sub">
          Ordre automatique : <strong>admin WhatsApp</strong> ({teamAccounts.adminWhatsapp}) →{' '}
          <strong>staff OPS</strong> ({teamAccounts.staffSimplified}) →{' '}
          <strong>dashboard</strong> ({teamAccounts.dashboardWorkers}) →{' '}
          <strong>plan orchestration</strong> → <strong>import Airbnb</strong> ({importCount}{' '}
          annonce{importCount > 1 ? 's' : ''}, une par une).
        </p>
        <div className="ob-go-live-cta-actions">
          <button
            type="button"
            className="ob-btn-primary"
            onClick={() => void launchSuite(true)}
          >
            {suiteAlreadyRun ? 'Relancer depuis le début' : 'Lancer l\u2019onboarding'}
          </button>
          <button
            type="button"
            className="ob-btn-ghost"
            onClick={() => void launchSuite(false)}
          >
            Suite · étape par étape
          </button>
        </div>
      </div>

      <div className="ob-card">
        <div className="ob-card-b ob-recap-grid">
          <div className="ob-recap-row">
            <span>Parcours</span>
            <strong>{draft.path === 'A' ? 'Airbnb / RU' : 'Manuel'}</strong>
          </div>
          <div className="ob-recap-row">
            <span>Villes</span>
            <strong>{p0?.cities?.join(', ') || '—'}</strong>
          </div>
          <div className="ob-recap-row">
            <span>Biens estimés</span>
            <strong>{p0?.expectedListings ?? '—'}</strong>
          </div>
          <div className="ob-recap-row ob-recap-row--team">
            <span>Équipe</span>
            <div className="ob-recap-team-detail">
              {(p1?.staff ?? []).filter((s) => staffDisplayName(s)).length === 0 ? (
                <strong>—</strong>
              ) : (
                <>
                  <strong>
                    {teamPeople.length} personne
                    {teamPeople.length > 1 ? 's' : ''}
                    {teamPeople.length > 0 && (
                      <>
                        {' '}
                        · {teamAccounts.staffSimplified} staff · {teamAccounts.adminWhatsapp} admin
                        WA · {teamAccounts.dashboardWorkers} dashboard
                      </>
                    )}
                  </strong>
                  <ul className="ob-recap-people">
                    {teamPeople.map((row) => (
                        <li key={row.id}>
                          {formatStaffPersonRecap(row)}
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          </div>
          <div className="ob-recap-row ob-recap-row--orch">
            <span>Orchestration owner</span>
            <div className="ob-recap-orch-detail">
              <strong className="ob-recap-orch-headline">{orchRecap.headline}</strong>
              {orchRecap.stats.length > 0 && (
                <div className="ob-recap-orch-stats">
                  {orchRecap.stats.map((stat) => (
                    <div key={stat.label} className="ob-recap-orch-stat" title={stat.label}>
                      <span className="ob-recap-orch-stat-icon">{stat.icon}</span>
                      <span className="ob-recap-orch-stat-value">{stat.value}</span>
                      <span className="ob-recap-orch-stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {orchRecap.serviceGroups.length > 0 && (
                <div className="ob-recap-orch-groups">
                  {orchRecap.serviceGroups.map((g) => (
                    <div key={g.group} className="ob-recap-orch-group">
                      <span className="ob-recap-orch-group-title">{g.group}</span>
                      <div className="ob-recap-orch-chips">
                        {g.items.map((item) => (
                          <span key={item} className="ob-recap-chip ob-recap-chip--orch">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {orchRecap.extras.length > 0 && (
                <ul className="ob-recap-orch-extras">
                  {orchRecap.extras.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {orchRecap.warnings.length > 0 && (
                <ul className="ob-recap-orch-warnings">
                  {orchRecap.warnings.map((w) => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="ob-recap-row">
            <span>Import Airbnb</span>
            <strong>
              {importSkipped
                ? 'Reporté'
                : importCount > 0
                  ? `${importCount} annonce(s) sélectionnée(s)${importCityLabel}`
                  : 'Aucune sélection'}
            </strong>
          </div>
          {importCount > 0 && (p7?.selectedRuPreview?.length ?? 0) > 0 && (
            <div className="ob-recap-import-list">
              {(p7?.selectedRuPreview ?? []).slice(0, 6).map((row) => (
                <span key={row.ruPropertyId} className="ob-recap-chip">
                  {row.name}
                  {(row.cityName || row.ruCity) && (
                    <span className="ob-recap-chip-city">
                      {' '}
                      · {row.cityName || row.ruCity}
                    </span>
                  )}
                </span>
              ))}
              {(p7?.selectedRuPreview?.length ?? 0) > 6 && (
                <span className="ob-recap-chip muted">+{(p7?.selectedRuPreview?.length ?? 0) - 6}</span>
              )}
            </div>
          )}
          <div className="ob-recap-row">
            <span>Étapes validées</span>
            <strong>
              {WIZARD_VISIBLE_PANELS.filter((p) => draft.panelsValidated.includes(p)).length}/
              {WIZARD_STEP_COUNT}
            </strong>
          </div>
        </div>
      </div>

      <div className="ob-recap-edit">
        <p className="ob-recap-edit-title">Modifier la configuration initiale</p>
        <p className="ob-recap-edit-hint">
          Cliquez une étape pour revenir en arrière — vos réponses restent enregistrées dans le
          brouillon.
        </p>
        <div className="ob-recap-edit-steps">
          {WIZARD_EDIT_STEPS.map(({ label, panel }) => (
            <button
              key={panel}
              type="button"
              className="ob-recap-edit-btn"
              onClick={() => wizard.setCurrentPanel(panel)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-actions">
        <button
          type="button"
          className="ob-btn-ghost"
          onClick={() => wizard.setCurrentPanel(7)}
        >
          ← Retour · Import
        </button>
      </div>
    </div>
  );
}
