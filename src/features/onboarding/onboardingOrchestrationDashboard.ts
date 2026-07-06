import type { WizardCapabilities, WizardJxSettings, WizardOrchestrationQuickConfig } from './types';
import { JX_ROWS, type JxRowDef } from './wizardGuestAccess';

export type OrchestrationQuickKind = 'cleaning' | 'transport' | 'concierge';

export type OrchestrationDashboardGroup = {
  id: string;
  title: string;
  emoji: string;
  rowKeys: Array<keyof WizardJxSettings>;
  quick?: OrchestrationQuickKind;
};

export const CONCIERGE_QUICK_PICKS = [
  { id: 'massage', labelFr: 'Massage & spa', icon: '💆' },
  { id: 'restaurant', labelFr: 'Réservation restaurant', icon: '🍽' },
  { id: 'excursion', labelFr: 'Excursions', icon: '🏜' },
  { id: 'chef', labelFr: 'Chef à domicile', icon: '👨‍🍳' },
  { id: 'baby', labelFr: 'Équipement bébé', icon: '👶' },
] as const;

export const ORCH_DASHBOARD_GROUPS: OrchestrationDashboardGroup[] = [
  {
    id: 'core',
    title: 'Menu & accueil',
    emoji: '📱',
    rowKeys: ['menuActive', 'welcome'],
  },
  {
    id: 'stay',
    title: 'Arrivée & départ',
    emoji: '✈️',
    rowKeys: [
      'registration',
      'arrivalChoose',
      'departureChoose',
      'arrivalDeclare',
      'departureDeclare',
    ],
  },
  {
    id: 'comms',
    title: 'Communication',
    emoji: '💬',
    rowKeys: ['support', 'serviceClient'],
  },
  {
    id: 'concierge',
    title: 'Conciergerie',
    emoji: '🛎',
    rowKeys: ['transport', 'groceries', 'concierge'],
    quick: 'transport',
  },
  {
    id: 'cleaning',
    title: 'Ménage',
    emoji: '🧹',
    rowKeys: ['cleaning'],
    quick: 'cleaning',
  },
  {
    id: 'access',
    title: 'Accès & infos séjour',
    emoji: '🔑',
    rowKeys: ['accessCodes', 'wifi', 'rules', 'codesAfterRegistration'],
  },
];

const ROW_BY_KEY = Object.fromEntries(JX_ROWS.map((r) => [r.key, r])) as Record<
  keyof WizardJxSettings,
  JxRowDef | undefined
>;

export function dashboardRowDef(key: keyof WizardJxSettings): JxRowDef | undefined {
  return ROW_BY_KEY[key];
}

export function capabilityKeysForDashboardRow(row: JxRowDef): Array<keyof WizardCapabilities> {
  if (row.key === 'menuActive' || row.key === 'codesAfterRegistration') return [];
  if (row.capability === 'cleaning') return ['cleaningFree', 'cleaningPaid', 'cleaningSojori'];
  if (row.capability) return [row.capability];
  return [];
}

export function isDashboardRowServiceEnabled(row: JxRowDef, caps: WizardCapabilities): boolean {
  const keys = capabilityKeysForDashboardRow(row);
  if (!keys.length) return true;
  return keys.some((k) => caps[k]);
}

export function setDashboardRowServiceEnabled(
  row: JxRowDef,
  caps: WizardCapabilities,
  on: boolean,
): WizardCapabilities {
  const keys = capabilityKeysForDashboardRow(row);
  if (!keys.length) return caps;
  const next = { ...caps };
  if (row.capability === 'cleaning') {
    if (on) {
      next.cleaningFree = true;
    } else {
      next.cleaningFree = false;
      next.cleaningPaid = false;
      next.cleaningSojori = false;
    }
    return next;
  }
  for (const k of keys) next[k] = on;
  return next;
}

export function defaultTransportAirportPrices(cities: string[]): Record<string, number> {
  const defaults: Record<string, number> = {
    Casablanca: 500,
    Marrakech: 450,
    Agadir: 400,
    Tanger: 450,
    Essaouira: 350,
    Rabat: 400,
  };
  const out: Record<string, number> = {};
  for (const city of cities) {
    out[city] = defaults[city] ?? 400;
  }
  return out;
}

export function defaultTransportAirportRoutes(
  cities: string[],
): NonNullable<WizardOrchestrationQuickConfig['transportAirportRoutesByCity']> {
  const base = defaultTransportAirportPrices(cities);
  const out: NonNullable<WizardOrchestrationQuickConfig['transportAirportRoutesByCity']> = {};
  for (const city of cities) {
    const amount = base[city] ?? 400;
    out[city] = {
      airportToListing: amount,
      listingToAirport: amount,
    };
  }
  return out;
}

export function defaultOrchestrationQuickConfig(
  cities: string[] = ['Marrakech'],
): WizardOrchestrationQuickConfig {
  return {
    cleaningModes: { free: true, paid: false, sojori: false },
    cleaningFreeTiers: [{ startDay: 1, endDay: 10, numberOfCleaning: 1 }],
    transportAirportByCity: defaultTransportAirportPrices(cities),
    transportAirportRoutesByCity: defaultTransportAirportRoutes(cities),
    conciergeServiceIds: [],
  };
}

export function normalizeOrchestrationQuickConfig(
  raw: Partial<WizardOrchestrationQuickConfig> | undefined,
  cities: string[],
  caps?: WizardCapabilities,
): WizardOrchestrationQuickConfig {
  const base = defaultOrchestrationQuickConfig(cities);
  if (!raw) return base;
  const transportAirportByCity = { ...base.transportAirportByCity, ...(raw.transportAirportByCity ?? {}) };
  const transportAirportRoutesByCity = {
    ...base.transportAirportRoutesByCity,
    ...(raw.transportAirportRoutesByCity ?? {}),
  };
  for (const city of cities) {
    if (transportAirportByCity[city] == null) {
      transportAirportByCity[city] = base.transportAirportByCity[city] ?? 400;
    }
    const legacyAmount = transportAirportByCity[city] ?? base.transportAirportByCity[city] ?? 400;
    const route = transportAirportRoutesByCity[city];
    transportAirportRoutesByCity[city] = {
      airportToListing: Number(route?.airportToListing ?? legacyAmount) || 0,
      listingToAirport: Number(route?.listingToAirport ?? legacyAmount) || 0,
    };
  }
  const cleaningModes = {
    free: raw.cleaningModes?.free ?? (caps?.cleaningFree ?? base.cleaningModes.free),
    paid: raw.cleaningModes?.paid ?? (caps?.cleaningPaid ?? base.cleaningModes.paid),
    sojori: raw.cleaningModes?.sojori ?? (caps?.cleaningSojori ?? base.cleaningModes.sojori),
  };
  return {
    cleaningModes,
    cleaningFreeTiers:
      Array.isArray(raw.cleaningFreeTiers) && raw.cleaningFreeTiers.length
        ? raw.cleaningFreeTiers.map((t) => ({
            startDay: Number(t.startDay) || 1,
            endDay: Number(t.endDay) || 1,
            numberOfCleaning: Number(t.numberOfCleaning) || 0,
          }))
        : base.cleaningFreeTiers,
    transportAirportByCity,
    transportAirportRoutesByCity,
    conciergeServiceIds: Array.isArray(raw.conciergeServiceIds) ? [...raw.conciergeServiceIds] : [],
  };
}

export function syncQuickConfigCleaningModes(
  quick: WizardOrchestrationQuickConfig,
  caps: WizardCapabilities,
): { quick: WizardOrchestrationQuickConfig; caps: WizardCapabilities } {
  const nextCaps = {
    ...caps,
    cleaningFree: quick.cleaningModes.free,
    cleaningPaid: quick.cleaningModes.paid,
    cleaningSojori: quick.cleaningModes.sojori,
  };
  return { quick, caps: nextCaps };
}

export function groupHasEnabledQuickConfig(
  group: OrchestrationDashboardGroup,
  caps: WizardCapabilities,
): boolean {
  if (!group.quick) return false;
  if (group.quick === 'cleaning') {
    return caps.cleaningFree || caps.cleaningPaid || caps.cleaningSojori;
  }
  if (group.quick === 'transport') return caps.transport;
  if (group.quick === 'concierge') return caps.concierge;
  return false;
}
