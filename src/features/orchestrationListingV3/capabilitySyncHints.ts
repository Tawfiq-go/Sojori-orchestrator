import { CAPABILITY_REGISTRY } from '../serviceMatrix/capabilityRegistry';
import type { OwnerOrchestrationDoc } from './ownerOrchestrationApi';
import type { ListingOrchestrationDoc } from './listingOrchestrationApi';

export type CapabilitySyncHint = 'admin' | 'local' | 'customized' | 'pm' | 'listing';

export type OwnerTemplateSyncMeta = {
  sections?: Partial<
    Record<
      'access' | 'support' | 'concierge' | 'listing' | 'serviceClient' | 'chatbot' | 'rulesAndInfo',
      { customized?: boolean }
    >
  >;
};

const CONCIERGE_KEYS = new Set(['transport', 'groceries', 'concierge']);
const LISTING_TEMPLATE_KEYS = new Set([
  'cleaning_free',
  'cleaning_paid',
  'cleaning_sojori',
  'arrival_choose',
  'departure_choose',
]);

function sectionForCapability(key: string): keyof NonNullable<OwnerTemplateSyncMeta['sections']> {
  if (CONCIERGE_KEYS.has(key)) return 'concierge';
  if (key === 'support') return 'support';
  if (key === 'service_client') return 'serviceClient';
  if (key === 'access') return 'access';
  if (key === 'house_rules') return 'rulesAndInfo';
  if (LISTING_TEMPLATE_KEYS.has(key)) return 'listing';
  if (key === 'menu_navigation') return 'chatbot';
  return 'listing';
}

/** Badges rail — modèle Admin / PM / annonce. */
export function buildCapabilitySyncHints(input: {
  isAdminTemplate: boolean;
  ownerTemplateMode: boolean;
  ownerKey: string;
  orchestrationDoc: OwnerOrchestrationDoc | ListingOrchestrationDoc | null;
  syncMeta: OwnerTemplateSyncMeta | null;
  listingScope?: boolean;
}): Record<string, CapabilitySyncHint> {
  const hints: Record<string, CapabilitySyncHint> = {};

  if (input.isAdminTemplate) {
    for (const def of CAPABILITY_REGISTRY) {
      hints[def.key] = 'admin';
    }
    return hints;
  }

  if (input.listingScope) {
    const src = input.orchestrationDoc?.source;
    const fromPm = src !== 'legacy_assembled' && src !== 'migration';
    for (const def of CAPABILITY_REGISTRY) {
      if (def.key === 'access' || def.key === 'property_wifi') {
        hints[def.key] = 'listing';
      } else {
        hints[def.key] = fromPm ? 'pm' : 'listing';
      }
    }
    return hints;
  }

  if (input.ownerTemplateMode) {
    const fromAdmin = input.orchestrationDoc?.source === 'admin_sync';
    for (const def of CAPABILITY_REGISTRY) {
      const section = sectionForCapability(def.key);
      const customized = input.syncMeta?.sections?.[section]?.customized === true;
      if (customized) {
        hints[def.key] = 'customized';
      } else if (CONCIERGE_KEYS.has(def.key)) {
        hints[def.key] = fromAdmin ? 'admin' : 'local';
      } else {
        hints[def.key] = fromAdmin ? 'admin' : 'local';
      }
    }
    return hints;
  }

  return hints;
}

export function syncHintLabel(hint: CapabilitySyncHint | undefined): string | null {
  switch (hint) {
    case 'admin':
      return 'Modèle admin';
    case 'customized':
      return null;
    case 'local':
      return null;
    case 'pm':
      return 'Modèle PM';
    case 'listing':
      return 'Annonce';
    default:
      return null;
  }
}

export function syncHintTone(hint: CapabilitySyncHint | undefined): 'ok' | 'owner' | 'todo' {
  switch (hint) {
    case 'admin':
    case 'pm':
      return 'ok';
    case 'customized':
      return 'todo';
    case 'local':
      return 'ok';
    case 'listing':
      return 'owner';
    default:
      return 'ok';
  }
}
