import {
  CAPABILITY_REGISTRY,
  defaultCapabilityRowState,
  type CapabilityDefinition,
} from '../serviceMatrix/capabilityRegistry';
import { applyDependencyRules } from '../serviceMatrix/matrixStateUtils';
import type { ListingCapabilityDoc } from './listingOrchestrationApi';
import listingsService from '../../services/listingsService';
import { buildOrchestrationFlagsFromActivations } from './ownerCapabilityActivation';

/** Capacité neuve — n'hérite jamais d'un doc existant (replace onboarding). */
export function buildFreshCapabilityDoc(
  def: CapabilityDefinition,
  active: boolean,
): ListingCapabilityDoc {
  const base = defaultCapabilityRowState(def);
  const row = applyDependencyRules(base, {
    managed: active,
    inherited: false,
    ...(active
      ? {}
      : {
          clientEnabled: false,
          orchestrated: false,
          taskEnabled: false,
        }),
  });

  const cap: ListingCapabilityDoc = {
    key: def.key,
    taskType: def.taskType,
    decisions: {
      managed: row.managed,
      clientEnabled: row.clientEnabled,
      orchestrated: row.orchestrated,
      taskEnabled: row.taskEnabled,
    },
  };

  // Workflows / execution détaillés : seed fulltask + applyWizardDeadlines — pas de flags booléens ici
  // (le schéma Mongo owner_orchestrations attend staffAssignment objet, pas boolean).

  if (def.menuCodes.length) {
    const enabled = active && row.clientEnabled;
    cap.whatsapp = {
      menuCodes: [...def.menuCodes],
      menuOptions: def.menuCodes.map((code) => ({
        code,
        enabled,
        availability: { type: 'always' },
      })),
      overrides: def.menuCodes.map((code) => ({
        code,
        enabled,
      })),
    };
  }

  return cap;
}

/** Les 16 capabilities — état neuf dérivé uniquement des activations wizard. */
export function buildFreshCapabilitiesFromActivations(
  activations: Record<string, boolean>,
): Record<string, ListingCapabilityDoc> {
  const out: Record<string, ListingCapabilityDoc> = {};
  for (const def of CAPABILITY_REGISTRY) {
    const active = activations[def.key] === true;
    out[def.key] = buildFreshCapabilityDoc(def, active);
  }
  return out;
}

/**
 * Remplace entièrement owner_orchestrations (toutes les capabilities).
 * Les clés absentes du patch backend seraient conservées — on envoie toujours les 16.
 */
export async function replaceOwnerOrchestrationCapabilities(
  ownerKey: string,
  capabilities: Record<string, ListingCapabilityDoc>,
  activations: Record<string, boolean>,
  options?: { orchestrationEnabled?: boolean },
): Promise<void> {
  const flags = buildOrchestrationFlagsFromActivations(
    activations,
    options?.orchestrationEnabled,
  );
  await listingsService.putOwnerOrchestration(ownerKey, {
    orchestrationEnabled: flags.orchestrationEnabled,
    capabilities,
    replaceCapabilities: true,
  });
}
