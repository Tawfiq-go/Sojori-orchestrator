import type { ListingPropertyPlace } from './transportListingProperty';
import { isAutoPropertyPlaceLabel } from './transportListingProperty';
import type { TransportJourneyTag, TransportRouteItem } from './transportRouteCatalog';
import { buildRouteLabel, cloneCityAssociation } from './transportRouteCatalog';

function pickExternalLabel(route: TransportRouteItem, property: ListingPropertyPlace): string {
  if (typeof route.externalLabel === 'string') {
    return route.externalLabel;
  }
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

function syncLabelFromHub(route: TransportRouteItem): string {
  const hubName = (route.hubName || '').trim();
  return buildRouteLabel(route.externalKind, hubName, route.journeyTag).fr;
}

export function migrateJourneyTag(
  route: TransportRouteItem,
  property: ListingPropertyPlace,
  nextTag: TransportJourneyTag,
): Partial<TransportRouteItem> {
  const externalLabel = pickExternalLabel(route, property);
  const labelFr = buildRouteLabel(route.externalKind, route.hubName || '', nextTag).fr;
  return { journeyTag: nextTag, externalLabel, labelFr };
}

export function syncRouteEndpoints(
  route: TransportRouteItem,
  property: ListingPropertyPlace,
): TransportRouteItem {
  const propName = (property.name || 'Logement').trim();
  const externalLabel = pickExternalLabel(route, property);
  const labelFr = syncLabelFromHub(route);
  const hubName = route.hubName || '';

  if (route.journeyTag === 'arrival') {
    return {
      ...route,
      labelFr,
      hubName,
      cityIds: cloneCityAssociation(route.cityIds),
      departureType: 'from_external',
      arrivalType: 'to_property',
      from: externalLabel,
      to: propName,
      externalLabel,
      externalKind: route.externalKind || 'airport',
      propertyPlace: property,
    };
  }
  if (route.journeyTag === 'departure') {
    return {
      ...route,
      labelFr,
      hubName,
      cityIds: cloneCityAssociation(route.cityIds),
      departureType: 'from_property',
      arrivalType: 'to_external',
      from: propName,
      to: externalLabel,
      externalLabel,
      externalKind: route.externalKind || 'airport',
      propertyPlace: property,
    };
  }
  const from = isAutoPropertyPlaceLabel(route.from || '', property) ? '' : route.from || '';
  const to = isAutoPropertyPlaceLabel(route.to || '', property) ? '' : route.to || '';
  return {
    ...route,
    labelFr,
    hubName,
    cityIds: cloneCityAssociation(route.cityIds),
    journeyTag: 'other',
    departureType: undefined,
    arrivalType: undefined,
    from,
    to,
    externalLabel: externalLabel || from,
    externalKind: route.externalKind || 'airport',
    propertyPlace: property,
  };
}

export const TRANSPORT_V1_NOTE =
  "Choisissez le type (A\u00e9roport, Gare\u2026) et le nom du lieu. Le syst\u00e8me g\u00e9n\u00e8re le nom en FR, EN, AR.";
