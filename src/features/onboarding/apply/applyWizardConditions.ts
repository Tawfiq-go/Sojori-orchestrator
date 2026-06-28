import listingsService from '../../../services/listingsService';
import { getCapabilityDefinition } from '../../serviceMatrix/capabilityRegistry';
import type { OwnerOrchestrationDoc } from '../../orchestrationListingV3/ownerOrchestrationApi';
import type { WizardConditions } from '../types';

function buildRequires(conditions: WizardConditions): string | undefined {
  const parts: string[] = [];
  if (conditions.registrationBeforeArrival) parts.push('E_completed');
  if (conditions.arrivalBeforeCodes) parts.push('D1_completed');
  if (conditions.registrationBeforeStaff) parts.push('E_completed');
  if (conditions.arrivalBeforeStaff) parts.push('D1_completed');
  const unique = [...new Set(parts)];
  return unique.length ? unique.join(',') : undefined;
}

/** Prérequis enchaînés sur l'option codes d'accès. */
export async function applyWizardConditions(
  ownerId: string,
  conditions: WizardConditions,
  existing: OwnerOrchestrationDoc | null,
): Promise<boolean> {
  const requires = buildRequires(conditions);
  if (!requires) return false;

  const capKey = 'access';
  const def = getCapabilityDefinition(capKey);
  if (!def) return false;

  const existingCap = existing?.capabilities?.[capKey];
  const menuOptions = (existingCap?.whatsapp?.menuOptions || []).map((raw) => {
    const o = { ...(raw as Record<string, unknown>) };
    o.availability = {
      type: 'conditional_and_time',
      requires,
      ...(typeof o.availability === 'object' && o.availability ? o.availability : {}),
    };
    return o;
  });

  if (!menuOptions.length) {
    menuOptions.push(
      ...def.menuCodes.map((code) => ({
        code,
        enabled: true,
        availability: { type: 'conditional_and_time', requires },
      })),
    );
  }

  await listingsService.putOwnerOrchestration(ownerId, {
    capabilities: {
      [capKey]: {
        key: capKey,
        taskType: def.taskType,
        decisions: existingCap?.decisions,
        whatsapp: {
          menuCodes: def.menuCodes,
          menuOptions,
          overrides: existingCap?.whatsapp?.overrides ?? [],
        },
        taskBehavior: {
          requiresClientAction: conditions.registrationBeforeStaff || conditions.arrivalBeforeStaff,
          autoCompletionTrigger: 'status_complete',
        },
        gestion: existingCap?.gestion,
        execution: existingCap?.execution,
      },
    },
  });
  return true;
}
