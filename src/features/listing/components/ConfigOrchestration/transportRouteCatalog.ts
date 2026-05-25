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
};

export const TRANSPORT_ROUTE_PRESETS: Omit<TransportRouteItem, 'enabled' | 'order' | 'propertyPlace'>[] = [
  {
    id: 'arrival_airport_cmn',
    labelFr: 'Arrivée depuis aéroport Casablanca',
    descriptionFr: 'Transfert CMN → logement',
    from: 'Aéroport Mohammed V, Casablanca',
    to: '',
    journeyTag: 'arrival',
    externalKind: 'airport',
    externalLabel: 'Aéroport Mohammed V, Casablanca',
    departureType: 'from_external',
    arrivalType: 'to_property',
    priceType: 'total',
    price: 400,
    maxPassengers: 4,
    estimatedDuration: '45 min',
  },
  {
    id: 'arrival_airport_rak',
    labelFr: 'Arrivée depuis aéroport Marrakech',
    descriptionFr: 'Transfert RAK → logement',
    from: 'Aéroport Marrakech Ménara',
    to: '',
    journeyTag: 'arrival',
    externalKind: 'airport',
    externalLabel: 'Aéroport Marrakech Ménara',
    priceType: 'total',
    price: 350,
    maxPassengers: 4,
    estimatedDuration: '35 min',
  },
  {
    id: 'departure_airport_cmn',
    labelFr: 'Départ vers aéroport Casablanca',
    descriptionFr: 'Transfert logement → CMN',
    from: '',
    to: 'Aéroport Mohammed V, Casablanca',
    journeyTag: 'departure',
    externalKind: 'airport',
    externalLabel: 'Aéroport Mohammed V, Casablanca',
    departureType: 'from_property',
    arrivalType: 'to_external',
    priceType: 'total',
    price: 400,
    maxPassengers: 4,
    estimatedDuration: '45 min',
  },
  {
    id: 'arrival_station_casa',
    labelFr: 'Arrivée depuis gare Casa-Voyageurs',
    descriptionFr: 'Transfert gare → logement',
    from: 'Gare Casa-Voyageurs',
    to: '',
    journeyTag: 'arrival',
    externalKind: 'station',
    externalLabel: 'Gare Casa-Voyageurs',
    priceType: 'total',
    price: 250,
    maxPassengers: 4,
    estimatedDuration: '30 min',
  },
];

export const TRANSPORT_JOURNEY_OPTIONS: TransportJourneyTag[] = ['arrival', 'departure', 'other'];

export function journeyLabel(tag: TransportJourneyTag): string {
  if (tag === 'arrival') return 'Arrivée';
  if (tag === 'departure') return 'Départ';
  return 'Autre';
}
