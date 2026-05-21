import type { ListingPropertyPlace } from './transportListingProperty';
import { formatPropertyLine, sanitizeFreePlaceLabel } from './transportListingProperty';
import type { TransportRouteItem } from './transportRouteCatalog';

export function syncRouteEndpoints(
  route: TransportRouteItem,
  property: ListingPropertyPlace,
): TransportRouteItem {
  const propertyLabel = formatPropertyLine(property);
  if (route.journeyTag === 'arrival') {
    return {
      ...route,
      departureType: 'from_external',
      arrivalType: 'to_property',
      to: propertyLabel,
      from: route.externalLabel || route.from,
      propertyPlace: property,
    };
  }
  if (route.journeyTag === 'departure') {
    return {
      ...route,
      departureType: 'from_property',
      arrivalType: 'to_external',
      from: propertyLabel,
      to: route.externalLabel || route.to,
      propertyPlace: property,
    };
  }
  // Autre : Depuis et Vers libres (sans snapshot logement)
  return {
    ...route,
    departureType: undefined,
    arrivalType: undefined,
    from: sanitizeFreePlaceLabel(route.from || '', property),
    to: sanitizeFreePlaceLabel(route.to || '', property),
    propertyPlace: property,
  };
}

export const TRANSPORT_V1_NOTE =
  'V1 : prix fixe ou par personne · pas de calcul km ni recherche cartes (prochaine version).';
