import {
  DEFAULT_TS_CLEAN,
  type FrequencyTier,
} from '../../listing/components/ConfigOrchestration/cleaningConfigTypes';
import { cleaningIncludedToGestion } from '../../orchestrationListingV3/cleaningGestionHelpers';
import type { ListingCapabilityDoc } from '../../orchestrationListingV3/listingOrchestrationApi';
import { CONCIERGE_QUICK_PICKS } from '../onboardingOrchestrationDashboard';
import type { WizardCapabilities, WizardOrchestrationQuickConfig } from '../types';

function buildAirportTransportServices(
  prices: Record<string, number>,
  cities: string[],
  routesByCity: WizardOrchestrationQuickConfig['transportAirportRoutesByCity'] = {},
): Array<Record<string, unknown>> {
  const services: Array<Record<string, unknown>> = [];
  let order = 0;
  for (const city of cities) {
    const fallbackAmount = prices[city] ?? 0;
    const routePrices = routesByCity?.[city] ?? {
      airportToListing: fallbackAmount,
      listingToAirport: fallbackAmount,
    };
    const slug = city.toLowerCase().replace(/\s+/g, '_');
    const directions = [
      {
        key: 'airport_to_listing',
        amount: routePrices.airportToListing,
        label: `Navette aeroport -> logement · ${city}`,
        descriptionFr: `Transfert aeroport vers logement (${city})`,
        descriptionEn: `Airport to property transfer (${city})`,
        from: `Aeroport ${city}`,
        to: 'Logement',
        journeyTag: 'arrival',
      },
      {
        key: 'listing_to_airport',
        amount: routePrices.listingToAirport,
        label: `Navette logement -> aeroport · ${city}`,
        descriptionFr: `Transfert logement vers aeroport (${city})`,
        descriptionEn: `Property to airport transfer (${city})`,
        from: 'Logement',
        to: `Aeroport ${city}`,
        journeyTag: 'departure',
      },
    ] as const;

    for (const direction of directions) {
      if (!direction.amount || direction.amount <= 0) continue;
      services.push({
        id: `onboarding_${direction.key}_${slug}`,
        enabled: true,
        name: { fr: direction.label, en: direction.label, ar: direction.label },
        description: {
          fr: direction.descriptionFr,
          en: direction.descriptionEn,
          ar: direction.label,
        },
        route: {
          from: direction.from,
          to: direction.to,
          journeyTag: direction.journeyTag,
          externalLabel: `Aeroport ${city}`,
          externalKind: 'airport',
          propertyName: 'Logement',
          propertyAddress: '',
        },
        pricing: { type: 'total', amount: direction.amount, currency: 'MAD' },
        capacity: {
          maxPassengers: 4,
          errorMessage: {
            fr: 'Maximum 4 passagers',
            en: 'Maximum 4 passengers',
            ar: 'Maximum 4 passengers',
          },
        },
        clientFields: {},
        availability: { type: 'always' },
        images: [],
        order,
        cityIds: 'all',
      });
      order += 1;
    }
  }
  return services;
}

function buildLegacyAirportTransportServices(
  prices: Record<string, number>,
  cities: string[],
): Array<Record<string, unknown>> {
  const services: Array<Record<string, unknown>> = [];
  let order = 0;
  for (const city of cities) {
    const amount = prices[city];
    if (!amount || amount <= 0) continue;
    const label = `Navette aéroport · ${city}`;
    services.push({
      id: `onboarding_airport_${city.toLowerCase().replace(/\s+/g, '_')}`,
      enabled: true,
      name: { fr: label, en: label, ar: label },
      description: {
        fr: `Transfert aéroport ↔ logement (${city})`,
        en: `Airport transfer ↔ property (${city})`,
        ar: label,
      },
      route: {
        from: `Aéroport ${city}`,
        to: 'Logement',
        journeyTag: 'arrival',
        externalLabel: `Aéroport ${city}`,
        externalKind: 'airport',
        propertyName: 'Logement',
        propertyAddress: '',
      },
      pricing: { type: 'total', amount, currency: 'MAD' },
      capacity: {
        maxPassengers: 4,
        errorMessage: {
          fr: 'Maximum 4 passagers',
          en: 'Maximum 4 passengers',
          ar: 'الحد الأقصى 4 ركاب',
        },
      },
      clientFields: {},
      availability: { type: 'always' },
      images: [],
      order,
      cityIds: 'all',
    });
    order += 1;
  }
  return services;
}

function buildConciergeCustomServices(
  serviceIds: string[],
): Array<Record<string, unknown>> {
  return serviceIds
    .map((id, i) => {
      const pick = CONCIERGE_QUICK_PICKS.find((p) => p.id === id);
      if (!pick) return null;
      const label = pick.labelFr;
      return {
        id: `onboarding_${id}`,
        enabled: true,
        icon: pick.icon,
        name: { fr: label, en: label, ar: label },
        description: {
          fr: `${label} — tarif à confirmer avec le PM`,
          en: `${label} — rate to confirm with PM`,
          ar: label,
        },
        pricing: {
          type: 'fixed',
          amount: 0,
          currency: 'MAD',
          explanation: { fr: 'Sur devis', en: 'On request', ar: 'حسب الطلب' },
        },
        clientFields: {},
        availability: { type: 'always' },
        requiresPMValidation: true,
        images: [],
        order: i,
        cityIds: 'all',
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

function patchConciergeShellGestion(
  capabilities: Record<string, ListingCapabilityDoc>,
  patch: Record<string, unknown>,
): void {
  for (const key of ['transport', 'groceries', 'concierge'] as const) {
    const cap = capabilities[key];
    if (!cap?.decisions?.managed) continue;
    capabilities[key] = {
      ...cap,
      gestion: { ...(cap.gestion ?? {}), ...patch },
    };
  }
}

/** Applique les réglages rapides onboarding sur le doc capabilities (gestion). */
export function applyOrchestrationQuickConfig(
  capabilities: Record<string, ListingCapabilityDoc>,
  quick: WizardOrchestrationQuickConfig | undefined,
  caps: WizardCapabilities,
  cities: string[],
): void {
  if (!quick) return;

  if (caps.cleaningFree && capabilities.cleaning_free?.decisions?.managed) {
    const tiers: FrequencyTier[] =
      quick.cleaningFreeTiers?.length > 0
        ? quick.cleaningFreeTiers
        : [{ startDay: 1, endDay: 10, numberOfCleaning: 1 }];
    capabilities.cleaning_free = {
      ...capabilities.cleaning_free,
      gestion: cleaningIncludedToGestion({
        frequency: tiers,
        timeSlots: DEFAULT_TS_CLEAN.map((s) => ({ ...s })),
        descriptionFr:
          'Ménage inclus pendant votre séjour selon la durée de votre réservation.',
        extras: [],
      }),
    };
  }

  if (caps.transport) {
    const transportServices = buildAirportTransportServices(
      quick.transportAirportByCity ?? {},
      cities,
      quick.transportAirportRoutesByCity,
    );
    if (transportServices.length) {
      patchConciergeShellGestion(capabilities, { transportServices });
    }
  }

  if (caps.concierge) {
    const customServices = buildConciergeCustomServices(quick.conciergeServiceIds ?? []);
    if (customServices.length) {
      patchConciergeShellGestion(capabilities, { customServices });
    }
  }
}
