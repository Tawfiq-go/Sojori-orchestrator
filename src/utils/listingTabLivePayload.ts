import type { ListingFormData } from '../data/catalogueMock';

export type LiveListingTabKey = keyof ListingFormData;

function pick(raw: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in raw && raw[k] !== undefined) {
      out[k] = raw[k];
    }
  }
  return out;
}

/**
 * Extrait du document `GET /listings/by-id` les champs utiles par onglet orchestrateur
 * (lecture seule — aligné domaines dashboard).
 */
export function buildListingTabLivePayload(
  tab: LiveListingTabKey,
  raw: Record<string, unknown> | null | undefined,
): unknown {
  if (!raw) {
    return {
      _note: 'Pas de document API — ouvrez un listing chargé depuis srv-listing (ObjectId valide).',
    };
  }

  switch (tab) {
    case 'basic':
      return pick(raw, [
        'name',
        'propertyType',
        'propertyTypeId',
        'propertyUnit',
        'surface',
        'personCapacityMax',
        'active',
        'staging',
        'draft',
        'ownerId',
        'owner',
        'description',
        'typeOfProperty',
      ]);
    case 'address':
      return pick(raw, [
        'address',
        'city',
        'country',
        'zipcode',
        'postalCode',
        'state',
        'region',
        'lat',
        'lng',
        'place',
        'howToArrive',
        'timeZoneName',
        'cityId',
      ]);
    case 'media':
      return {
        listingImages: raw.listingImages,
        videoTourUrl: raw.videoTourUrl,
        imagesCount: Array.isArray(raw.listingImages) ? raw.listingImages.length : 0,
      };
    case 'equipment':
      return { listingAmenitiesIds: raw.listingAmenitiesIds };
    case 'pricing':
      return pick(raw, [
        'currencyCode',
        'currency',
        'extra',
        'roomTypes',
        'basePrice',
        'minNights',
        'maxNights',
        'additionalFees',
        'touristTax',
        'cityTaxEnabled',
        'cityTaxPerAdultPerNight',
      ]);
    case 'availability':
      return pick(raw, [
        'minNights',
        'maxNights',
        'preparationTimeBeforeArrivalInHours',
        'cityTaxEnabled',
        'cityTaxPerAdultPerNight',
        'onlineCheckIn',
        'checkInTimeStart',
        'checkInTimeEnd',
        'checkOutTime',
        'instantBookable',
        'advanceNoticeHours',
        'maxDaysInAdvance',
        'minDaysInAdvance',
        'schedule',
        'schedule_live',
      ]);
    case 'deposit':
      return {
        deposit: raw.deposit,
        securityDeposit: raw.securityDeposit,
        additionalFees: raw.additionalFees,
      };
    case 'channels':
      return pick(raw, [
        'channelManager',
        'channexListingId',
        'channexIntegrationId',
        'otaChannelsSnapshot',
        'distribution',
      ]);
    case 'roomtypes':
      return pick(raw, ['roomTypes', 'compositionRooms']);
    case 'licenses':
      return { licenceInfo: raw.licenceInfo };
    case 'houserules':
      return {
        ...pick(raw, [
          'description',
          'checkInTimeStart',
          'checkInTimeEnd',
          'checkOutTime',
          'houseRules',
          'rulesAndInfo',
        ]),
      };
    case 'orchestration':
      return pick(raw, [
        'orchestration_registration',
        'orchestration_choose_arrival',
        'orchestration_choose_departure',
        'orchestration_declare_arrival',
        'orchestration_declare_departure',
        'orchestration_transport',
        'orchestration_grocery',
        'orchestration_custom',
        'orchestration_support',
        'orchestration_service_client',
        'orchestration_cleaning_free',
        'orchestration_cleaning_paid',
      ]);
    case 'cleaning':
      return pick(raw, ['paidCleaningConfig', 'freeCleaningConfig', 'frequency']);
    case 'access':
      return { accessDetails: raw.accessDetails };
    case 'whatsapp':
      return { whatsappServiceSettings: raw.whatsappServiceSettings };
    case 'concierge':
      return pick(raw, ['orchestration_transport', 'orchestration_grocery', 'orchestration_custom']);
    case 'support':
      return pick(raw, [
        'arrivalPhone',
        'arrivalEmail',
        'orchestration_support',
        'orchestration_service_client',
      ]);
    case 'rules':
      return pick(raw, ['description', 'rulesAndInfo', 'houseRules']);
    case 'services':
      return {
        services: raw.services,
        servicesCount: Array.isArray(raw.services) ? raw.services.length : 0,
      };
    case 'automsg':
      return pick(raw, [
        'messageCheckin',
        'messageCheckout',
        'messageGeneral',
        'messageBookingConfirmed',
        'messagePreArrival',
      ]);
    case 'wifi':
      return pick(raw, ['wifiUsername', 'wifiPassword']);
    case 'autotasks':
      return { tasks: raw.tasks };
    case 'iot':
      return pick(raw, ['iot', 'connectedDevices']);
    case 'extras':
      return {
        additionalFees: raw.additionalFees,
        extra: raw.extra,
        distribution: raw.distribution,
      };
  }
}
