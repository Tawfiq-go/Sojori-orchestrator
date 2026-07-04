import { getCapabilityDefinition } from '../../serviceMatrix/capabilityRegistry';
import type { ListingCapabilityDoc } from '../../orchestrationListingV3/listingOrchestrationApi';
import { buildFreshCapabilitiesFromActivations } from '../../orchestrationListingV3/ownerOrchestrationReplace';
import { deriveConditionsFromJx } from '../wizardGuestAccess';
import { defaultTaskBehaviorForType } from '../../taskHub/taskConfig/taskCompletionLabels';
import type { WizardConditions, WizardDraft, WizardJxSettings } from '../types';
import { JX_KEY_TO_CAPABILITY, wizardJxLabelToAvailability } from './wizardJxToAvailability';
import { applyOrchestrationQuickConfig } from './applyOrchestrationQuickConfig';
import { wizardCapabilitiesToActivations } from './wizardCapabilitiesToActivations';

type MenuOpt = { code?: string; enabled?: boolean; availability?: Record<string, unknown> };

function capabilityKeysForJxRow(
  jxKey: string,
  activations: Record<string, boolean>,
): string[] {
  if (jxKey === 'cleaning') {
    return (['cleaning_free', 'cleaning_paid', 'cleaning_sojori'] as const).filter(
      (k) => activations[k] === true,
    );
  }
  const capKey = JX_KEY_TO_CAPABILITY[jxKey];
  if (!capKey) return [];
  return activations[capKey] === true ? [capKey] : [];
}

function patchMenuOptionsAvailability(
  menuOptions: MenuOpt[],
  availability: Record<string, unknown>,
  clientEnabled: boolean,
): MenuOpt[] {
  return menuOptions.map((o) => ({
    ...o,
    availability,
    enabled: clientEnabled && o.enabled !== false,
  }));
}

function applyJxToCapabilities(
  capabilities: Record<string, ListingCapabilityDoc>,
  jx: WizardJxSettings,
  activations: Record<string, boolean>,
): number {
  let patched = 0;
  const jxKeys = [...Object.keys(JX_KEY_TO_CAPABILITY), 'cleaning'];

  for (const jxKey of jxKeys) {
    const capKeys = capabilityKeysForJxRow(jxKey, activations);
    if (!capKeys.length) continue;

    const label = jx[jxKey as keyof WizardJxSettings];
    if (typeof label !== 'string' || !label.trim()) continue;

    const availability = wizardJxLabelToAvailability(label, {
      codesAfterRegistration: jx.codesAfterRegistration,
    });

    for (const capKey of capKeys) {
      const def = getCapabilityDefinition(capKey);
      if (!def) continue;

      const cap = capabilities[capKey];
      if (!cap?.decisions?.managed) continue;

      const clientEnabled = cap.decisions.clientEnabled !== false;
      const menuOptions = (cap.whatsapp?.menuOptions?.length
        ? (cap.whatsapp.menuOptions as MenuOpt[])
        : def.menuCodes.map((code) => ({ code, enabled: true, availability: { type: 'always' } }))) as MenuOpt[];

      capabilities[capKey] = {
        ...cap,
        whatsapp: {
          menuCodes: def.menuCodes,
          menuOptions: patchMenuOptionsAvailability(menuOptions, availability, clientEnabled),
          overrides: def.menuCodes.map((code) => ({
            code,
            enabled: clientEnabled,
          })),
        },
      };
      patched += 1;
    }
  }

  return patched;
}

function buildRequires(conditions: WizardConditions): string | undefined {
  const parts: string[] = [];
  if (conditions.registrationBeforeArrival) parts.push('E_completed');
  if (conditions.arrivalBeforeCodes) parts.push('D1_completed');
  if (conditions.registrationBeforeStaff) parts.push('E_completed');
  if (conditions.arrivalBeforeStaff) parts.push('D1_completed');
  const unique = [...new Set(parts)];
  return unique.length ? unique.join(',') : undefined;
}

function applyConditionsToCapabilities(
  capabilities: Record<string, ListingCapabilityDoc>,
  conditions: WizardConditions,
): boolean {
  const requires = buildRequires(conditions);
  if (!requires) return false;

  const capKey = 'access';
  const def = getCapabilityDefinition(capKey);
  if (!def) return false;

  const cap = capabilities[capKey];
  if (!cap?.decisions?.managed) return false;

  const menuOptions = (cap.whatsapp?.menuOptions?.length
    ? (cap.whatsapp.menuOptions as MenuOpt[])
    : def.menuCodes.map((code) => ({ code, enabled: true, availability: { type: 'always' } }))
  ).map((raw) => ({
    ...raw,
    availability: {
      type: 'conditional_and_time',
      requires,
      ...(typeof raw.availability === 'object' && raw.availability ? raw.availability : {}),
    },
  }));

  capabilities[capKey] = {
    ...cap,
    whatsapp: {
      menuCodes: def.menuCodes,
      menuOptions,
      overrides: def.menuCodes.map((code) => ({ code, enabled: cap.decisions?.clientEnabled !== false })),
    },
    taskBehavior: {
      requiresClientAction: conditions.registrationBeforeStaff || conditions.arrivalBeforeStaff,
      autoCompletionTrigger: 'status_complete',
    },
  };

  return true;
}

/** Construit le document capabilities complet (replace) depuis le wizard — sans lecture de l'existant. */
export function buildOwnerOrchestrationCapabilitiesFromWizard(draft: WizardDraft): {
  capabilities: Record<string, ListingCapabilityDoc>;
  activations: Record<string, boolean>;
  jxPatched: number;
  conditionsApplied: boolean;
} {
  const p3 = draft.panels['3'];
  const p5 = draft.panels['5'];
  const p0 = draft.panels['0'];

  if (!p3?.capabilities) {
    throw new Error('Orchestration non configurée dans le wizard (étape 3).');
  }

  const activations = wizardCapabilitiesToActivations(p3.capabilities);
  const capabilities = buildFreshCapabilitiesFromActivations(activations);

  const jx = p3.jx ?? draft.panels['4']?.jx;

  let jxPatched = 0;
  if (jx) {
    jxPatched = applyJxToCapabilities(capabilities, jx, activations);
  }

  applyOrchestrationQuickConfig(
    capabilities,
    p3.quickConfig,
    p3.capabilities,
    p0?.cities?.length ? p0.cities : ['Marrakech'],
  );

  // Comportement tâche explicite (à la demande client / auto-complétion) —
  // aligné DEFAULT_TASK_TYPE_CONFIGS srv-fulltask, sinon la page modèle retombe sur « Manuel ».
  for (const [key, cap] of Object.entries(capabilities)) {
    const def = getCapabilityDefinition(key);
    if (!def?.taskType) continue;
    capabilities[key] = { ...cap, taskBehavior: defaultTaskBehaviorForType(def.taskType) };
  }

  const conditions =
    p5?.conditions ??
    (jx ? deriveConditionsFromJx(jx, p3.capabilities) : undefined);

  const conditionsApplied = conditions
    ? applyConditionsToCapabilities(capabilities, conditions)
    : false;

  return { capabilities, activations, jxPatched, conditionsApplied };
}
