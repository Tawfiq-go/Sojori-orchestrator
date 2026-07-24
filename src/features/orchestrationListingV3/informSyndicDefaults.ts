/**
 * Config « Informer syndic » — aligné srv-listing / srv-fulltask.
 */

export type InformSyndicDayOffset = 0 | -1 | -2;
export type InformSyndicTravelersMode = 'reservation_guest' | 'all_registered';

export type InformSyndicReservationFields = {
  lastName: boolean;
  firstName: boolean;
  nationality: boolean;
};

export type InformSyndicTravelerFields = {
  lastName: boolean;
  firstName: boolean;
  nationality: boolean;
  passportNumber: boolean;
  passportImage: boolean;
};

export type InformSyndicGestion = {
  listingDisplayName: string;
  useListingNameFromDb: boolean;
  dayOffset: InformSyndicDayOffset;
  messageBody: string;
  reservationFields: InformSyndicReservationFields;
  travelersMode: InformSyndicTravelersMode;
  travelerFields: InformSyndicTravelerFields;
};

export const DEFAULT_INFORM_SYNDIC_MESSAGE = `Bonjour,

Nous vous informons d'une arrivée prévue au logement {{listingName}}.

Check-in : {{checkIn}}
Check-out : {{checkOut}}

{{reservationBlock}}{{guestsBlock}}
Cordialement,
Sojori`;

export function defaultInformSyndicGestion(): InformSyndicGestion {
  return {
    listingDisplayName: '',
    useListingNameFromDb: true,
    dayOffset: -1,
    messageBody: DEFAULT_INFORM_SYNDIC_MESSAGE,
    reservationFields: {
      lastName: true,
      firstName: true,
      nationality: false,
    },
    travelersMode: 'reservation_guest',
    travelerFields: {
      lastName: true,
      firstName: true,
      nationality: true,
      passportNumber: false,
      passportImage: false,
    },
  };
}

export function normalizeInformSyndicGestion(raw: unknown): InformSyndicGestion {
  const base = defaultInformSyndicGestion();
  if (!raw || typeof raw !== 'object') return base;
  const g = raw as Record<string, unknown>;
  const day = Number(g.dayOffset);
  const dayOffset: InformSyndicDayOffset = day === 0 || day === -2 ? (day as InformSyndicDayOffset) : -1;
  const rf = (
    g.reservationFields && typeof g.reservationFields === 'object' ? g.reservationFields : {}
  ) as Record<string, unknown>;
  const tf = (
    g.travelerFields && typeof g.travelerFields === 'object' ? g.travelerFields : {}
  ) as Record<string, unknown>;
  return {
    listingDisplayName: typeof g.listingDisplayName === 'string' ? g.listingDisplayName : '',
    useListingNameFromDb: g.useListingNameFromDb !== false,
    dayOffset,
    messageBody:
      typeof g.messageBody === 'string' && g.messageBody.trim() ? g.messageBody : base.messageBody,
    reservationFields: {
      lastName: rf.lastName !== false,
      firstName: rf.firstName !== false,
      nationality: rf.nationality === true,
    },
    travelersMode: g.travelersMode === 'all_registered' ? 'all_registered' : 'reservation_guest',
    travelerFields: {
      lastName: tf.lastName !== false,
      firstName: tf.firstName !== false,
      nationality: tf.nationality === true,
      passportNumber: tf.passportNumber === true,
      passportImage: tf.passportImage === true,
    },
  };
}
