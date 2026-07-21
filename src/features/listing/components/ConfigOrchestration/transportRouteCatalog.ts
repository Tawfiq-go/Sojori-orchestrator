// Catalogue routes transport — v2 hub type + auto i18n label

import type { ListingPropertyPlace } from './transportListingProperty';

export type TransportJourneyTag = 'arrival' | 'departure' | 'other';
export type TransportPriceType = 'total' | 'per_person';
export type TransportExternalKind = 'airport' | 'station' | 'port' | 'other';

export type TransportRouteItem = {
  id: string;
  labelFr: string;
  descriptionFr: string;
  from: string;
  to: string;
  journeyTag: TransportJourneyTag;
  departureType?: 'from_property' | 'from_external';
  arrivalType?: 'to_property' | 'to_external';
  /** Lieu externe (aéroport, gare…) — libellé saisi par le PM */
  externalLabel: string;
  externalKind: TransportExternalKind;
  /** Nom du hub saisi par le PM (ex: "Casablanca", "Menara") */
  hubName: string;
  /** Snapshot logement (listing) — non modifiable côté arrivée/départ */
  propertyPlace?: ListingPropertyPlace;
  priceType: TransportPriceType;
  price: number;
  pricePerPerson?: number;
  maxPassengers: number;
  estimatedDuration: string;
  enabled: boolean;
  order: number;
  /** `'all'` ou cityIds Sojori — absent = toutes les villes */
  cityIds?: 'all' | string[];
};

export function cloneCityAssociation(value: 'all' | string[] | undefined): 'all' | string[] {
  if (value === 'all' || value === undefined) return 'all';
  if (!Array.isArray(value) || value.length === 0) return 'all';
  return [...value];
}

/* ── Hub type catalogue ── */

export const HUB_TYPES: TransportExternalKind[] = ['airport', 'station', 'port', 'other'];

const HUB_TYPE_LABELS: Record<TransportExternalKind, { fr: string; en: string; ar: string }> = {
  airport:  { fr: 'Aéroport', en: 'Airport', ar: 'مطار' },
  station:  { fr: 'Gare',     en: 'Train Station', ar: 'محطة قطار' },
  port:     { fr: 'Port',     en: 'Port', ar: 'ميناء' },
  other:    { fr: 'Navette',  en: 'Shuttle', ar: 'نقل' },
};

export function hubTypeLabel(kind: TransportExternalKind): string {
  return HUB_TYPE_LABELS[kind]?.fr ?? 'Navette';
}

export function hubTypeLabelI18n(
  kind: TransportExternalKind,
  lang: 'fr' | 'en' | 'ar',
): string {
  return HUB_TYPE_LABELS[kind]?.[lang] ?? HUB_TYPE_LABELS.other[lang];
}

/**
 * Construit le nom affiché multi-langue à partir du type de hub + nom du lieu.
 * Ex: kind=airport, hubName="Marrakech" → { fr: "Aéroport Marrakech", en: "Marrakech Airport", ar: "مطار مراكش" }
 */
export function buildRouteLabel(
  kind: TransportExternalKind,
  hubName: string,
  journeyTag: TransportJourneyTag,
): { fr: string; en: string; ar: string } {
  const name = hubName.trim();
  if (!name) {
    const prefix = HUB_TYPE_LABELS[kind] || HUB_TYPE_LABELS.other;
    return { fr: prefix.fr, en: prefix.en, ar: prefix.ar };
  }
  const labels = HUB_TYPE_LABELS[kind] || HUB_TYPE_LABELS.other;
  return {
    fr: `${labels.fr} ${name}`,
    en: `${name} ${labels.en}`,
    ar: `${labels.ar} ${name}`,
  };
}

/** Route vierge — ajout manuel PM uniquement (pas de seed CMN/RAK/gare). */
export function createBlankTransportRoute(order: number): Omit<TransportRouteItem, 'propertyPlace'> {
  return {
    id: `route_${Date.now()}_${order}_${Math.random().toString(36).slice(2, 8)}`,
    labelFr: 'Aéroport',
    descriptionFr: '',
    from: '',
    to: '',
    journeyTag: 'arrival',
    externalKind: 'airport',
    externalLabel: '',
    hubName: '',
    priceType: 'total',
    price: 0,
    maxPassengers: 4,
    estimatedDuration: '',
    enabled: true,
    order,
    cityIds: 'all',
  };
}

export const TRANSPORT_JOURNEY_OPTIONS: TransportJourneyTag[] = ['arrival', 'departure', 'other'];

export function journeyLabel(tag: TransportJourneyTag): string {
  if (tag === 'arrival') return 'Arrivée';
  if (tag === 'departure') return 'Départ';
  return 'Autre';
}
