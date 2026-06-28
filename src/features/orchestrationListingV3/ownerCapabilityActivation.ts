import listingsService from '../../services/listingsService';
import {
  CAPABILITY_REGISTRY,
  defaultCapabilityRowState,
  getCapabilityDefinition,
  type CapabilityDefinition,
} from '../serviceMatrix/capabilityRegistry';
import { applyDependencyRules } from '../serviceMatrix/matrixStateUtils';
import type { CapabilityRowState } from '../serviceMatrix/types';
import type { ListingCapabilityDoc } from './listingOrchestrationApi';
import type { OwnerOrchestrationDoc } from './ownerOrchestrationApi';

/** Capacité activée pour le PM (visible dans le rail + configurable). */
export function isCapabilityActivated(row: CapabilityRowState | undefined): boolean {
  return row?.managed === true;
}

export function activationsFromRows(rows: CapabilityRowState[]): Record<string, boolean> {
  return Object.fromEntries(rows.map(r => [r.key, isCapabilityActivated(r)]));
}

export function defaultActivationsAllOff(): Record<string, boolean> {
  return Object.fromEntries(CAPABILITY_REGISTRY.map(def => [def.key, false]));
}

export function buildOrchestrationFlagsFromActivations(
  activations: Record<string, boolean>,
): Record<string, boolean> {
  const anyActive = CAPABILITY_REGISTRY.some(def => activations[def.key] === true);
  const flags: Record<string, boolean> = {
    orchestrationEnabled: anyActive,
  };
  for (const def of CAPABILITY_REGISTRY) {
    if (def.orchestrationFlag) {
      flags[def.orchestrationFlag] = activations[def.key] === true;
    }
  }
  return flags;
}

function capabilityDocFromActivation(
  def: CapabilityDefinition,
  active: boolean,
  existing?: ListingCapabilityDoc,
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

  const decisions = {
    managed: row.managed,
    clientEnabled: row.clientEnabled,
    orchestrated: row.orchestrated,
    taskEnabled: row.taskEnabled,
  };

  const cap: ListingCapabilityDoc = {
    key: def.key,
    taskType: def.taskType,
    decisions,
    taskBehavior: existing?.taskBehavior,
    gestion: existing?.gestion,
    execution: active ? existing?.execution : undefined,
    whatsapp: existing?.whatsapp,
  };

  if (def.menuCodes.length) {
    cap.whatsapp = {
      menuCodes: def.menuCodes,
      menuOptions: (existing?.whatsapp?.menuOptions ?? []).map(o => {
        const code = String((o as { code?: string }).code ?? '');
        if (!def.menuCodes.includes(code)) return o;
        return { ...(o as object), enabled: active && row.clientEnabled };
      }),
      overrides: def.menuCodes.map(code => ({
        code,
        enabled: active && row.clientEnabled,
      })),
    };
  }

  return cap;
}

export function buildCapabilitiesPatchFromActivations(
  activations: Record<string, boolean>,
  existingDoc?: OwnerOrchestrationDoc | null,
): Record<string, ListingCapabilityDoc> {
  const out: Record<string, ListingCapabilityDoc> = {};
  for (const def of CAPABILITY_REGISTRY) {
    const active = activations[def.key] === true;
    out[def.key] = capabilityDocFromActivation(
      def,
      active,
      existingDoc?.capabilities?.[def.key],
    );
  }
  return out;
}

/** Persiste l’activation PM (merge partiel — préférer replaceOwnerOrchestrationCapabilities pour onboarding). */
export async function saveOwnerCapabilityActivations(
  ownerKey: string,
  activations: Record<string, boolean>,
  existingDoc?: OwnerOrchestrationDoc | null,
): Promise<void> {
  const allCapabilities = buildCapabilitiesPatchFromActivations(activations, existingDoc);
  const orchestrationEnabled = CAPABILITY_REGISTRY.some(def => activations[def.key] === true);

  const capabilities: Record<string, ListingCapabilityDoc> = {};
  for (const [key, cap] of Object.entries(allCapabilities)) {
    const prevManaged = existingDoc?.capabilities?.[key]?.decisions?.managed;
    const nextManaged = cap.decisions?.managed === true;
    if (!existingDoc || prevManaged !== nextManaged) {
      capabilities[key] = cap;
    }
  }

  await listingsService.putOwnerOrchestration(ownerKey, {
    orchestrationEnabled,
    capabilities: Object.keys(capabilities).length > 0 ? capabilities : allCapabilities,
  });
}

/** Nouveau owner : tout désactivé sauf sélection explicite à la création. */
export async function initializeOwnerOrchestrationFromActivations(
  ownerKey: string,
  activations: Record<string, boolean>,
): Promise<void> {
  const merged = { ...defaultActivationsAllOff(), ...activations };
  const { buildFreshCapabilitiesFromActivations, replaceOwnerOrchestrationCapabilities } =
    await import('./ownerOrchestrationReplace');
  const capabilities = buildFreshCapabilitiesFromActivations(merged);
  await replaceOwnerOrchestrationCapabilities(ownerKey, capabilities, merged);
}

export function firstActivatedCapabilityKey(rows: CapabilityRowState[]): string | null {
  const menu = rows.find(r => r.key === 'menu_navigation' && isCapabilityActivated(r));
  if (menu) return 'menu_navigation';
  const other = rows.find(r => r.key !== 'menu_navigation' && isCapabilityActivated(r));
  return other?.key ?? null;
}

export function getCapabilityDefinitionOrThrow(key: string) {
  const def = getCapabilityDefinition(key);
  if (!def) throw new Error(`Capacité inconnue: ${key}`);
  return def;
}
