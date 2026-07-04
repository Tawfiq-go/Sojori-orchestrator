import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UsePmOnboardingWizardResult } from '../hooks/usePmOnboardingWizard';
import type { WizardDraft } from '../types';
import { CITY_OPTIONS } from '../types';
import { deriveConditionsFromJx } from '../wizardGuestAccess';
import { defaultJx } from '../defaults';
import OnboardingStepTeam from './OnboardingStepTeam';
import OnboardingStepTeamExpress from './OnboardingStepTeamExpress';
import OnboardingStepOrchestration from './OnboardingStepOrchestration';
import OnboardingStepOrchestrationExpress from './OnboardingStepOrchestrationExpress';
import OnboardingStepDeadlines from './OnboardingStepDeadlines';
import { staffDisplayName } from '../staffNormalize';
import { staffApplyAccountCounts } from '../staffRecap';
import { buildOrchestrationRecapFromDraft } from '../apply/orchestrationRecapFromDraft';

interface StepPanelsProps {
  wizard: UsePmOnboardingWizardResult;
  ownerId: string;
}

export function OnboardingStepPanels({ wizard, ownerId }: StepPanelsProps) {
  const { draft, updatePanel, setPath, setCurrentPanel } = wizard;
  const panel = draft.currentPanel;
  const [orchView, setOrchView] = useState<'express' | 'parcours' | 'delais'>('express');
  const [teamView, setTeamView] = useState<'express' | 'avance'>('express');

  const p0 = draft.panels['0']!;
  const p1 = draft.panels['1']!;
  const p3 = draft.panels['3']!;
  const p6 = draft.panels['6']!;

  useEffect(() => {
    if (panel === 2) setCurrentPanel(3);
    if (panel === 4 || panel === 5) setCurrentPanel(3);
    if (panel === 7) setCurrentPanel(8);
  }, [panel, setCurrentPanel]);

  if (panel === 0) {
    return (
      <div className="ob-sh">
        <div className="eyebrow">Étape 1 · Profil</div>
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
      <div className="ob-sh">
        <div className="eyebrow">Étape 2 · Équipe</div>
        <h1>Qui fait quoi ?</h1>
        <p className="sub">
          Une personne = un contact + ses accès. Contrats, permissions fines et périmètres :
          onglet <strong>Avancé</strong>.
        </p>
        <div className="ob-x-tabs">
          <button
            type="button"
            className={`ob-x-tab${teamView === 'express' ? ' on' : ''}`}
            onClick={() => setTeamView('express')}
          >
            ⚡ Express
          </button>
          <button
            type="button"
            className={`ob-x-tab${teamView === 'avance' ? ' on' : ''}`}
            onClick={() => setTeamView('avance')}
          >
            Avancé · Détails par personne
          </button>
        </div>
        {teamView === 'express' ? (
          <OnboardingStepTeamExpress p1={p1} updatePanel={(patch) => updatePanel('1', patch)} />
        ) : (
          <OnboardingStepTeam
            p1={p1}
            ownerCities={ownerCities}
            ownerId={ownerId}
            updatePanel={(patch) => updatePanel('1', patch)}
          />
        )}
      </div>
    );
  }

  if (panel === 3 || panel === 6) {
    const ownerCities = p0.cities?.length ? p0.cities : CITY_OPTIONS;
    const panel3WithJx = { ...p3, jx: p3.jx ?? draft.panels['4']?.jx ?? defaultJx() };
    const handlePanel3Change = (patch: Partial<typeof p3>) => {
      const caps = patch.capabilities ?? p3.capabilities;
      const jx = patch.jx ?? p3.jx ?? draft.panels['4']?.jx ?? defaultJx();
      updatePanel('3', patch);
      if (jx) {
        updatePanel('5', { conditions: deriveConditionsFromJx(jx, caps) });
      }
    };
    const handleDeadlinesChange = (patch: Partial<typeof p6.deadlines>) =>
      updatePanel('6', { deadlines: { ...p6.deadlines, ...patch } });

    return (
      <div className="ob-sh">
        <div className="eyebrow">Étape 3 · Orchestration</div>
        <h1>Comment votre conciergerie fonctionne</h1>
        <p className="sub">
          Répondez en langage métier — quand proposer chaque service, quand assigner le staff,
          quand relancer. Le mode <strong>Avancé</strong> ouvre le détail ligne par ligne.
        </p>
        <div className="ob-x-tabs">
          <button
            type="button"
            className={`ob-x-tab${orchView === 'express' ? ' on' : ''}`}
            onClick={() => setOrchView('express')}
          >
            ⚡ Express
          </button>
          <button
            type="button"
            className={`ob-x-tab${orchView === 'parcours' ? ' on' : ''}`}
            onClick={() => setOrchView('parcours')}
          >
            Avancé · Parcours voyageur
          </button>
          <button
            type="button"
            className={`ob-x-tab${orchView === 'delais' ? ' on' : ''}`}
            onClick={() => setOrchView('delais')}
          >
            Avancé · Délais équipe
          </button>
        </div>
        {orchView === 'express' && (
          <OnboardingStepOrchestrationExpress
            panel3={panel3WithJx}
            deadlines={p6.deadlines}
            cities={ownerCities}
            onChangePanel3={handlePanel3Change}
            onChangeDeadlines={handleDeadlinesChange}
          />
        )}
        {orchView === 'parcours' && (
          <OnboardingStepOrchestration
            panel3={panel3WithJx}
            cities={ownerCities}
            onChange={handlePanel3Change}
          />
        )}
        {orchView === 'delais' && (
          <OnboardingStepDeadlines
            deadlines={p6.deadlines}
            capabilities={p3.capabilities}
            onChange={handleDeadlinesChange}
          />
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
  const teamPeople = (p1?.staff ?? []).filter((s) => staffDisplayName(s));
  const teamAccounts = staffApplyAccountCounts(teamPeople);

  const orchRecap = useMemo(() => buildOrchestrationRecapFromDraft(draft), [draft]);

  const suiteAlreadyRun = Boolean(draft.applyLog?.suiteRunAt);

  const launchSuite = async (autoRun: boolean) => {
    await wizard.relaunchSuiteApply();
    navigate(autoRun ? '/onboarding/suite?run=1' : '/onboarding/suite');
  };

  return (
    <div className="ob-sh">
      <div className="eyebrow">Étape 5 · Go live</div>
      <h1>Récapitulatif</h1>

      <div className="ob-go-live-cta">
        <p className="ob-go-live-cta-title">
          {suiteAlreadyRun ? 'Relancer l\u2019application' : 'Appliquer la configuration'}
        </p>
        <p className="ob-go-live-cta-sub">
          Ordre automatique : <strong>admin WhatsApp</strong> ({teamAccounts.adminWhatsapp}) →{' '}
          <strong>staff OPS</strong> ({teamAccounts.staffSimplified}) →{' '}
          <strong>dashboard</strong> ({teamAccounts.dashboardWorkers}) →{' '}
          <strong>plan orchestration</strong>. L&apos;import des annonces se fait ensuite depuis{' '}
          <strong>Annonces → Importer</strong> — le plan s&apos;y applique automatiquement.
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
          <div className="ob-recap-row ob-recap-row--go">
            <span>👤 Profil</span>
            <strong>
              {draft.path === 'A' ? 'Airbnb / RU' : 'Manuel'} · {p0?.cities?.join(', ') || '—'} ·{' '}
              {p0?.expectedListings ?? '—'} bien(s)
            </strong>
            <button type="button" className="ob-recap-go-edit" onClick={() => wizard.setCurrentPanel(0)}>
              Modifier →
            </button>
          </div>
          <div className="ob-recap-row ob-recap-row--go">
            <span>👥 Équipe</span>
            <strong>
              {teamPeople.length === 0
                ? '—'
                : `${teamPeople.map((row) => staffDisplayName(row)).join(', ')} — ${teamAccounts.staffSimplified} staff · ${teamAccounts.adminWhatsapp} admin WA · ${teamAccounts.dashboardWorkers} dashboard`}
            </strong>
            <button type="button" className="ob-recap-go-edit" onClick={() => wizard.setCurrentPanel(1)}>
              Modifier →
            </button>
          </div>
          <div className="ob-recap-row ob-recap-row--go">
            <span>⚙️ Orchestration</span>
            <strong>{orchRecap.headline}</strong>
            <button type="button" className="ob-recap-go-edit" onClick={() => wizard.setCurrentPanel(3)}>
              Modifier →
            </button>
          </div>
          <div className="ob-recap-row ob-recap-row--go">
            <span>🏠 Annonces</span>
            <strong>Import après l&apos;onboarding — le plan s&apos;applique automatiquement</strong>
          </div>
          {orchRecap.warnings.length > 0 && (
            <ul className="ob-recap-orch-warnings">
              {orchRecap.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
