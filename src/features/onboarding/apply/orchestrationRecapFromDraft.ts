import { CAPABILITY_REGISTRY } from '../../serviceMatrix/capabilityRegistry';
import type { WizardCapabilities, WizardConditions, WizardDeadlines, WizardDraft, WizardJxSettings } from '../types';
import { buildOwnerOrchestrationCapabilitiesFromWizard } from './buildOwnerOrchestrationFromWizard';
import { detectWizardOrchestrationGaps } from './onboardingOrchestrationAudit';
import {
  formatClientReminderLabel,
  formatStaffAssignLabel,
  resolveServiceRhythmRows,
  WORKFLOW_PRESET_OPTIONS,
} from '../onboardingWorkflowDefaults';
import { formatAdminEscalationDayLabel } from '../wizardStaffDeadlines';

const JX_PRESET_LABELS: Record<WizardJxSettings['preset'], string> = {
  standard: 'Standard',
  early: 'Early (accès anticipé)',
  secure: 'Sécurisé',
  custom: 'Personnalisé',
};

const CONDITIONS_PRESET_LABELS: Record<WizardConditions['preset'], string> = {
  secure: 'Sécurisé',
  flexible: 'Flexible',
  minimal: 'Minimal',
};

export type OrchestrationRecapStat = {
  icon: string;
  label: string;
  value: string;
};

export type OrchestrationRecapGroup = {
  group: string;
  items: string[];
};

export type OrchestrationDraftRecap = {
  configured: boolean;
  headline: string;
  stats: OrchestrationRecapStat[];
  serviceGroups: OrchestrationRecapGroup[];
  extras: string[];
  warnings: string[];
};

function formatDeadlinesLine(deadlines: WizardDeadlines, capabilities?: WizardCapabilities): string {
  const preset = WORKFLOW_PRESET_OPTIONS.find((p) => p.id === (deadlines.workflowPreset ?? 'balanced'));
  const rows = resolveServiceRhythmRows(deadlines, capabilities);
  const escalated = rows.filter((r) => r.escalationEnabled).length;
  const parts = [`Préréglage : ${preset?.title ?? 'Équilibré'}`, `${rows.length} service(s)`];
  if (escalated > 0) {
    parts.push(
      `escalade ${formatAdminEscalationDayLabel(deadlines.adminEscalationDay ?? -1)} à ${deadlines.adminEscalationHour}h (${escalated})`,
    );
  }
  const sample = rows.slice(0, 2).map((r) => {
    const rc = formatClientReminderLabel(r.clientReminderDays);
    const assign = formatStaffAssignLabel(r.staffAssignStyle, r.staffAssignDaysBefore);
    return `${r.emoji} ${assign}${rc !== '—' ? ` · RC ${rc}` : ''}`;
  });
  if (sample.length) parts.push(sample.join(' · '));
  return parts.join(' · ');
}

function countClientMenuCodes(activations: Record<string, boolean>): number {
  return CAPABILITY_REGISTRY.filter((d) => d.menuCodes.length > 0 && activations[d.key] === true).reduce(
    (sum, d) => sum + d.menuCodes.length,
    0,
  );
}

/**
 * Récap lisible du plan orchestration owner — dérivé du brouillon wizard (sans appel API).
 */
export function buildOrchestrationRecapFromDraft(draft: WizardDraft): OrchestrationDraftRecap {
  const p3 = draft.panels['3'];
  const empty: OrchestrationDraftRecap = {
    configured: false,
    headline: 'Non configuré — complétez l’étape Parcours client',
    stats: [],
    serviceGroups: [],
    extras: [],
    warnings: [],
  };

  if (!p3?.capabilities) return empty;

  try {
    const built = buildOwnerOrchestrationCapabilitiesFromWizard(draft);
    const { activations, capabilities, jxPatched, conditionsApplied } = built;

    const servicesOn = Object.values(activations).filter(Boolean).length;
    const workflowsActive = CAPABILITY_REGISTRY.filter(
      (d) => d.workflowKey && activations[d.key] === true,
    ).length;
    const taskEnabledCount = Object.values(capabilities).filter(
      (c) => c?.decisions?.managed && c?.decisions?.taskEnabled,
    ).length;
    const orchestratedCount = Object.values(capabilities).filter(
      (c) => c?.decisions?.managed && c?.decisions?.orchestrated,
    ).length;
    const clientMenuCodes = countClientMenuCodes(activations);

    const byGroup = new Map<string, string[]>();
    for (const def of CAPABILITY_REGISTRY) {
      if (!activations[def.key]) continue;
      const g = def.groupLabel;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(`${def.emoji} ${def.label}`);
    }

    const jx = p3.jx ?? draft.panels['4']?.jx;
    const conditions = draft.panels['5']?.conditions;
    const p6 = draft.panels['6'];

    const cleaningModes: string[] = [];
    if (activations.cleaning_free) cleaningModes.push('inclus');
    if (activations.cleaning_paid) cleaningModes.push('payant');
    if (activations.cleaning_sojori) cleaningModes.push('Sojori');

    const extras: string[] = [];
    if (jx?.preset) extras.push(`Préréglage parcours : ${JX_PRESET_LABELS[jx.preset]}`);
    if (p3.pack) extras.push(`Pack : ${p3.pack}`);
    if (cleaningModes.length) extras.push(`Ménage : ${cleaningModes.join(' · ')}`);
    if (p3.quickConfig?.cleaningFreeTiers?.length) {
      extras.push(`${p3.quickConfig.cleaningFreeTiers.length} palier(s) ménage inclus`);
    }
    const transportCities = Object.keys(p3.quickConfig?.transportAirportByCity ?? {}).filter(Boolean);
    if (transportCities.length) {
      extras.push(`Transport aéroport : ${transportCities.join(', ')}`);
    }
    if ((p3.quickConfig?.conciergeServiceIds?.length ?? 0) > 0) {
      extras.push(`Conciergerie : ${p3.quickConfig!.conciergeServiceIds!.length} prestation(s)`);
    }
    if (conditionsApplied && conditions) {
      extras.push(`Conditions accès : ${CONDITIONS_PRESET_LABELS[conditions.preset]}`);
    }
    if (p6?.deadlines) extras.push(formatDeadlinesLine(p6.deadlines, p3.capabilities));

    const headline = [
      `${servicesOn} service${servicesOn > 1 ? 's' : ''} actif${servicesOn > 1 ? 's' : ''}`,
      `${jxPatched} menu${jxPatched > 1 ? 's' : ''} J-X`,
      `${workflowsActive} workflow${workflowsActive > 1 ? 's' : ''}`,
      `${orchestratedCount} orchestré${orchestratedCount > 1 ? 's' : ''}`,
    ].join(' · ');

    return {
      configured: true,
      headline,
      stats: [
        { icon: '⚙️', label: 'Services métier', value: String(servicesOn) },
        { icon: '💬', label: 'Menus voyageur (codes)', value: String(clientMenuCodes) },
        { icon: '📅', label: 'Fenêtres J-X', value: String(jxPatched) },
        { icon: '🔁', label: 'Workflows actifs', value: String(workflowsActive) },
        { icon: '🤖', label: 'Messages orchestrés', value: String(orchestratedCount) },
        { icon: '👷', label: 'Tâches staff', value: String(taskEnabledCount) },
      ],
      serviceGroups: [...byGroup.entries()].map(([group, items]) => ({ group, items })),
      extras,
      warnings: detectWizardOrchestrationGaps(draft),
    };
  } catch {
    const onCount = Object.values(p3.capabilities).filter(Boolean).length;
    return {
      ...empty,
      configured: onCount > 0,
      headline: `${onCount} toggle(s) wizard — détail orchestration indisponible`,
      stats: [{ icon: '⚙️', label: 'Services wizard', value: String(onCount) }],
      warnings: detectWizardOrchestrationGaps(draft),
    };
  }
}
