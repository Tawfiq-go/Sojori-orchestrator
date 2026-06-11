// Catalogue routes transport (FR) — v1 sans API maps / km

import type { ListingPropertyPlace } from './transportListingProperty';

export type TransportJourneyTag = 'arrival' | 'departure' | 'other';
export type TransportPriceType = 'total' | 'per_person';
export type TransportExternalKind = 'airport' | 'station' | 'other';

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

/** Route vierge — ajout manuel PM uniquement (pas de seed CMN/RAK/gare). */
export function createBlankTransportRoute(order: number): Omit<TransportRouteItem, 'propertyPlace'> {
  return {
    id: `route_${Date.now()}_${order}_${Math.random().toString(36).slice(2, 8)}`,
    labelFr: 'Navette',
    descriptionFr: '',
    from: '',
    to: '',
    journeyTag: 'arrival',
    externalKind: 'other',
    externalLabel: '',
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
