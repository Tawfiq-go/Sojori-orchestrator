import { CAPABILITY_REGISTRY } from '../../serviceMatrix/capabilityRegistry';
import type { ListingCapabilityDoc } from '../../orchestrationListingV3/listingOrchestrationApi';
import listingsService from '../../../services/listingsService';
import type { WizardCapabilities, WizardDraft } from '../types';
import { wizardCapabilitiesToActivations } from './wizardCapabilitiesToActivations';

const WIZARD_CAP_LABELS: Partial<Record<keyof WizardCapabilities, string>> = {
  welcome: 'Bienvenue',
  registration: 'Enregistrement',
  support: 'Support',
  serviceClient: 'Service client',
  arrivalChoose: 'Arrivée',
  departureChoose: 'Départ',
  arrivalDeclare: 'Déclarer arrivée',
  departureDeclare: 'Déclarer départ',
  transport: 'Transport',
  groceries: 'Courses',
  concierge: 'Conciergerie',
  cleaningFree: 'Ménage inclus',
  cleaningPaid: 'Ménage payant',
  cleaningSojori: 'Ménage Sojori',
  accessCodes: 'Codes accès',
  wifi: 'WiFi',
  rules: 'Règles',
};

export type OrchestrationApplyAudit = {
  ownerId: string;
  at: string;
  wizardCapsOn: string[];
  activationsSentOn: string[];
  activationsSentOff: string[];
  capabilitiesSentCount: number;
  managedSentOn: string[];
  jxPatched: number;
  conditionsApplied: boolean;
  replaceMode: boolean;
  ownerAfterOn: string[];
  ownerAfterOff: string[];
  mismatches: string[];
};

function capLabel(key: string): string {
  const def = CAPABILITY_REGISTRY.find((c) => c.key === key);
  return def?.label ?? key;
}

function wizardCapsOnList(caps: WizardCapabilities): string[] {
  return (Object.entries(caps) as Array<[keyof WizardCapabilities, boolean]>)
    .filter(([, on]) => on)
    .map(([k]) => WIZARD_CAP_LABELS[k] ?? k);
}

function managedOnFromDoc(
  capabilities: Record<string, ListingCapabilityDoc> | undefined,
): string[] {
  if (!capabilities) return [];
  return Object.entries(capabilities)
    .filter(([, cap]) => cap?.decisions?.managed === true)
    .map(([key]) => capLabel(key));
}

export function buildOrchestrationApplyAudit(input: {
  ownerId: string;
  draft: WizardDraft;
  activations: Record<string, boolean>;
  capabilities: Record<string, ListingCapabilityDoc>;
  jxPatched: number;
  conditionsApplied: boolean;
}): OrchestrationApplyAudit {
  const caps = input.draft.panels['3']?.capabilities;
  if (!caps) {
    throw new Error('Audit orchestration : panel 3 manquant');
  }

  const activationsSentOn = Object.entries(input.activations)
    .filter(([, on]) => on)
    .map(([k]) => capLabel(k));
  const activationsSentOff = Object.entries(input.activations)
    .filter(([, on]) => !on)
    .map(([k]) => capLabel(k));
  const managedSentOn = managedOnFromDoc(input.capabilities);

  return {
    ownerId: input.ownerId,
    at: new Date().toISOString(),
    wizardCapsOn: wizardCapsOnList(caps),
    activationsSentOn,
    activationsSentOff,
    capabilitiesSentCount: Object.keys(input.capabilities).length,
    managedSentOn,
    jxPatched: input.jxPatched,
    conditionsApplied: input.conditionsApplied,
    replaceMode: true,
    ownerAfterOn: [],
    ownerAfterOff: [],
    mismatches: [],
  };
}

export async function verifyOwnerOrchestrationAfterApply(
  audit: OrchestrationApplyAudit,
  activations: Record<string, boolean>,
): Promise<OrchestrationApplyAudit> {
  const raw = await listingsService.getOwnerOrchestrationCompiled(audit.ownerId);
  const doc = (raw as { data?: { capabilities?: Record<string, ListingCapabilityDoc> } })?.data ?? raw;
  const capabilities = (doc as { capabilities?: Record<string, ListingCapabilityDoc> }).capabilities;

  const ownerAfterOn = managedOnFromDoc(capabilities);
  const ownerAfterOff = CAPABILITY_REGISTRY.map((d) => d.key)
    .filter((key) => capabilities?.[key]?.decisions?.managed !== true)
    .map((key) => capLabel(key));

  const expectedOn = Object.entries(activations)
    .filter(([, on]) => on)
    .map(([k]) => capLabel(k));
  const mismatches: string[] = [];

  for (const label of expectedOn) {
    if (!ownerAfterOn.includes(label)) {
      mismatches.push(`manquant sur owner : ${label}`);
    }
  }

  audit.ownerAfterOn = ownerAfterOn;
  audit.ownerAfterOff = ownerAfterOff;
  audit.mismatches = mismatches;
  return audit;
}

export function formatOrchestrationAuditLines(audit: OrchestrationApplyAudit): string[] {
  const lines = [
    `[${audit.at}] Owner ${audit.ownerId} — replace=${audit.replaceMode ? 'oui' : 'non'}`,
    `Wizard ON (${audit.wizardCapsOn.length}) : ${audit.wizardCapsOn.join(', ') || 'aucun'}`,
    `Activations envoyées ON (${audit.activationsSentOn.length}) : ${audit.activationsSentOn.join(', ') || 'aucun'}`,
    `Capabilities PUT (${audit.capabilitiesSentCount}) · managed ON : ${audit.managedSentOn.join(', ') || 'aucun'}`,
    `J-X patchés : ${audit.jxPatched} · conditions : ${audit.conditionsApplied ? 'oui' : 'non'}`,
    `Owner après GET ON (${audit.ownerAfterOn.length}) : ${audit.ownerAfterOn.join(', ') || 'aucun'}`,
  ];
  if (audit.mismatches.length) {
    lines.push(`⚠ Écarts : ${audit.mismatches.join(' · ')}`);
  }
  return lines;
}

export function logOnboardingAudit(scope: string, lines: string[]): void {
  for (const line of lines) {
    const msg = `[onboarding:${scope}] ${line}`;
    if (import.meta.env.DEV) {
      console.info(msg);
    }
  }
}

/** Résumé wizard panel 3 avant apply — détecte capabilities toutes OFF alors que J-X preset actif. */
export function detectWizardOrchestrationGaps(draft: WizardDraft): string[] {
  const p3 = draft.panels['3'];
  if (!p3?.capabilities) return ['Panel 3 capabilities absent'];
  const caps = p3.capabilities;
  const onCount = Object.values(caps).filter(Boolean).length;
  const warnings: string[] = [];
  if (onCount === 0) {
    warnings.push('Aucun service activé dans le wizard (toggles OFF) — owner sera tout désactivé');
  }
  const jx = p3.jx ?? draft.panels['4']?.jx;
  if (jx?.preset && jx.preset !== 'custom' && onCount < 3) {
    warnings.push(
      `Préréglage J-X « ${jx.preset} » mais seulement ${onCount} service(s) activé(s) — vérifier les toggles`,
    );
  }
  const activations = wizardCapabilitiesToActivations(caps);
  const actOn = Object.values(activations).filter(Boolean).length;
  if (onCount > 0 && actOn === 0) {
    warnings.push('Mapping wizard → registry a échoué (activations vides)');
  }
  return warnings;
}
