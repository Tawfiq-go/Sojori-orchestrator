import type { ListingPropertyPlace } from './transportListingProperty';
import { isAutoPropertyPlaceLabel } from './transportListingProperty';
import type { TransportJourneyTag, TransportRouteItem } from './transportRouteCatalog';

function pickExternalLabel(route: TransportRouteItem, property: ListingPropertyPlace): string {
  const stored = (route.externalLabel || '').trim();
  if (stored) return stored;
  if (route.journeyTag === 'arrival') {
    const from = (route.from || '').trim();
    return isAutoPropertyPlaceLabel(from, property) ? '' : from;
  }
  if (route.journeyTag === 'departure') {
    const to = (route.to || '').trim();
    return isAutoPropertyPlaceLabel(to, property) ? '' : to;
  }
  const from = (route.from || '').trim();
  return isAutoPropertyPlaceLabel(from, property) ? '' : from;
}

/** Bascule Arrivée / Départ / Autre — conserve le libellé externe (aéroport, gare…). */
export function migrateJourneyTag(
  route: TransportRouteItem,
  property: ListingPropertyPlace,
  nextTag: TransportJourneyTag,
): Partial<TransportRouteItem> {
  const externalLabel = pickExternalLabel(route, property);
  return { journeyTag: nextTag, externalLabel };
}

export function syncRouteEndpoints(
  route: TransportRouteItem,
  property: ListingPropertyPlace,
): TransportRouteItem {
  const propName = (property.name || 'Logement').trim();
  const externalLabel = pickExternalLabel(route, property);

  if (route.journeyTag === 'arrival') {
    return {
      ...route,
      departureType: 'from_external',
      arrivalType: 'to_property',
      from: externalLabel,
      to: propName,
      externalLabel,
      externalKind: route.externalKind || 'other',
      propertyPlace: property,
    };
  }
  if (route.journeyTag === 'departure') {
    return {
      ...route,
      departureType: 'from_property',
      arrivalType: 'to_external',
      from: propName,
      to: externalLabel,
      externalLabel,
      externalKind: route.externalKind || 'other',
      propertyPlace: property,
    };
  }
  const from = isAutoPropertyPlaceLabel(route.from || '', property) ? '' : (route.from || '').trim();
  const to = isAutoPropertyPlaceLabel(route.to || '', property) ? '' : (route.to || '').trim();
  return {
    ...route,
    journeyTag: 'other',
    departureType: undefined,
    arrivalType: undefined,
    from,
    to,
    externalLabel: externalLabel || from,
    externalKind: route.externalKind || 'other',
    propertyPlace: property,
  };
}

export const TRANSPORT_V1_NOTE =
  'Arrivée / Départ : le logement est fixe (nom + adresse). L’autre point = navette (aéroport, gare…). Autre = les deux libres.';
