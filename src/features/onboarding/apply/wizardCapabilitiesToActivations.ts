import type { WizardCapabilities } from '../types';

/** Mappe les toggles wizard (étape 3) vers les clés du registre V3. */
const WIZARD_TO_REGISTRY: Partial<Record<keyof WizardCapabilities, string>> = {
  registration: 'registration',
  support: 'support',
  serviceClient: 'service_client',
  arrivalChoose: 'arrival_choose',
  departureChoose: 'departure_choose',
  arrivalDeclare: 'arrival_declare',
  departureDeclare: 'departure_declare',
  transport: 'transport',
  groceries: 'groceries',
  concierge: 'concierge',
  cleaningFree: 'cleaning_free',
  cleaningPaid: 'cleaning_paid',
  cleaningSojori: 'cleaning_sojori',
  accessCodes: 'access',
  wifi: 'property_wifi',
  rules: 'house_rules',
};

/** Préréglages pack — utilisés si l'UI pack est branchée plus tard. */
export const WIZARD_PACK_CAPABILITIES: Record<
  'essential' | 'standard' | 'complete' | 'premium',
  WizardCapabilities
> = {
  essential: {
    welcome: true,
    registration: true,
    support: true,
    serviceClient: false,
    arrivalChoose: true,
    departureChoose: true,
    arrivalDeclare: false,
    departureDeclare: false,
    transport: false,
    groceries: false,
    concierge: false,
    cleaningFree: true,
    cleaningPaid: false,
    cleaningSojori: false,
    accessCodes: true,
    wifi: true,
    rules: true,
  },
  standard: {
    welcome: true,
    registration: true,
    support: true,
    serviceClient: true,
    arrivalChoose: true,
    departureChoose: true,
    arrivalDeclare: false,
    departureDeclare: false,
    transport: true,
    groceries: false,
    concierge: false,
    cleaningFree: true,
    cleaningPaid: true,
    cleaningSojori: false,
    accessCodes: true,
    wifi: true,
    rules: true,
  },
  complete: {
    welcome: true,
    registration: true,
    support: true,
    serviceClient: true,
    arrivalChoose: true,
    departureChoose: true,
    arrivalDeclare: true,
    departureDeclare: true,
    transport: true,
    groceries: true,
    concierge: true,
    cleaningFree: true,
    cleaningPaid: true,
    cleaningSojori: false,
    accessCodes: true,
    wifi: true,
    rules: true,
  },
  premium: {
    welcome: true,
    registration: true,
    support: true,
    serviceClient: true,
    arrivalChoose: true,
    departureChoose: true,
    arrivalDeclare: true,
    departureDeclare: true,
    transport: true,
    groceries: true,
    concierge: true,
    cleaningFree: true,
    cleaningPaid: true,
    cleaningSojori: true,
    accessCodes: true,
    wifi: true,
    rules: true,
  },
};

export function wizardCapabilitiesToActivations(
  caps: WizardCapabilities,
): Record<string, boolean> {
  const activations: Record<string, boolean> = {};
  for (const [wizardKey, registryKey] of Object.entries(WIZARD_TO_REGISTRY)) {
    if (!registryKey) continue;
    activations[registryKey] = Boolean(caps[wizardKey as keyof WizardCapabilities]);
  }
  const anyGuestFeature = Object.values(activations).some(Boolean);
  activations.menu_navigation = anyGuestFeature || caps.welcome === true;
  return activations;
}

/** Active les toggles wizard alignés sur un préréglage J-X (standard / early / secure). */
export function capabilitiesForJxPreset(
  preset: 'standard' | 'early' | 'secure',
): WizardCapabilities {
  if (preset === 'early') return { ...WIZARD_PACK_CAPABILITIES.complete };
  if (preset === 'secure') return { ...WIZARD_PACK_CAPABILITIES.essential };
  return { ...WIZARD_PACK_CAPABILITIES.standard };
}
