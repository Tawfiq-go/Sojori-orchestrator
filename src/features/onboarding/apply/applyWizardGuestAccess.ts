import listingsService from '../../../services/listingsService';
import { getCapabilityDefinition } from '../../serviceMatrix/capabilityRegistry';
import type { OwnerOrchestrationDoc } from '../../orchestrationListingV3/ownerOrchestrationApi';
import type { WizardJxSettings } from '../types';
import { JX_KEY_TO_CAPABILITY, wizardJxLabelToAvailability } from './wizardJxToAvailability';

type MenuOpt = { code?: string; enabled?: boolean; availability?: Record<string, unknown> };

function patchMenuOptionsAvailability(
  menuOptions: unknown[],
  availability: Record<string, unknown>,
): MenuOpt[] {
  return (menuOptions || []).map((raw) => {
    const o = { ...(raw as MenuOpt) };
    o.availability = availability;
    o.enabled = o.enabled !== false;
    return o;
  });
}

/** Applique les fenêtres J-X sur les menuOptions des capabilities owner. */
export async function applyWizardGuestAccess(
  ownerId: string,
  jx: WizardJxSettings,
  existing: OwnerOrchestrationDoc | null,
): Promise<number> {
  const capabilitiesPatch: Record<string, Record<string, unknown>> = {};
  let patched = 0;

  for (const [jxKey, capKey] of Object.entries(JX_KEY_TO_CAPABILITY)) {
    if (!capKey) continue;
    const label = jx[jxKey as keyof WizardJxSettings];
    if (typeof label !== 'string') continue;

    const def = getCapabilityDefinition(capKey);
    if (!def) continue;

    const availability = wizardJxLabelToAvailability(label, {
      codesAfterRegistration: jx.codesAfterRegistration,
    });
    const existingCap = existing?.capabilities?.[capKey];
    const menuOptions = existingCap?.whatsapp?.menuOptions?.length
      ? existingCap.whatsapp.menuOptions
      : def.menuCodes.map((code) => ({ code, enabled: true, availability: { type: 'always' } }));

    capabilitiesPatch[capKey] = {
      key: capKey,
      taskType: def.taskType,
      decisions: existingCap?.decisions ?? {
        managed: true,
        clientEnabled: true,
        orchestrated: def.columns.orchestrated === 'yes',
        taskEnabled: def.columns.task === 'yes',
      },
      whatsapp: {
        menuCodes: def.menuCodes,
        menuOptions: patchMenuOptionsAvailability(menuOptions, availability),
        overrides: existingCap?.whatsapp?.overrides ?? [],
      },
      gestion: existingCap?.gestion,
      taskBehavior: existingCap?.taskBehavior,
      execution: existingCap?.execution,
    };
    patched += 1;
  }

  if (patched === 0) return 0;
  await listingsService.putOwnerOrchestration(ownerId, { capabilities: capabilitiesPatch });
  return patched;
}
