/**
 * Config « Informer syndic » — aligné srv-listing / srv-fulltask.
 */

export type InformSyndicDayOffset = 0 | -1 | -2;

/** Heures d’envoi plan (check-in ± dayOffset). */
export type InformSyndicSendTime = '09:00' | '11:00' | '14:00' | '17:00';

export const INFORM_SYNDIC_SEND_TIMES: InformSyndicSendTime[] = [
  '09:00',
  '11:00',
  '14:00',
  '17:00',
];

/**
 * Jusqu’à quand le syndic peut consulter le contenu (Flow / images).
 */
export type InformSyndicAccessUntil =
  | 'stay'
  | 'checkout_plus_1_11h'
  | 'checkout_plus_2'
  | 'always';

export const INFORM_SYNDIC_ACCESS_UNTIL_OPTIONS: Array<{
  value: InformSyndicAccessUntil;
  label: string;
}> = [
  { value: 'stay', label: 'Pendant le séjour (jusqu’au checkout)' },
  { value: 'checkout_plus_1_11h', label: 'J+1 après checkout · jusqu’à 11h' },
  { value: 'checkout_plus_2', label: 'J+2 après checkout (fin de journée)' },
  { value: 'always', label: 'Toujours (pas d’expiration)' },
];

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
  sendTime: InformSyndicSendTime;
  accessUntil: InformSyndicAccessUntil;
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

export function normalizeInformSyndicSendTime(raw: unknown): InformSyndicSendTime {
  const s = String(raw ?? '').trim();
  if ((INFORM_SYNDIC_SEND_TIMES as string[]).includes(s)) return s as InformSyndicSendTime;
  if (s === '10:00' || s === '10h' || s === '10') return '09:00';
  const hour = Number.parseInt(s.slice(0, 2), 10);
  if (hour === 11) return '11:00';
  if (hour === 14 || hour === 15) return '14:00';
  if (hour === 17 || hour === 16 || hour === 18) return '17:00';
  return '09:00';
}

export function normalizeInformSyndicAccessUntil(raw: unknown): InformSyndicAccessUntil {
  const s = String(raw ?? '').trim();
  if (
    s === 'stay' ||
    s === 'checkout_plus_1_11h' ||
    s === 'checkout_plus_2' ||
    s === 'always'
  ) {
    return s;
  }
  return 'stay';
}

export function defaultInformSyndicGestion(): InformSyndicGestion {
  return {
    listingDisplayName: '',
    useListingNameFromDb: true,
    dayOffset: -1,
    sendTime: '09:00',
    accessUntil: 'stay',
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
  const dayOffset: InformSyndicDayOffset =
    day === 0 || day === -2 ? (day as InformSyndicDayOffset) : -1;
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
    sendTime: normalizeInformSyndicSendTime(g.sendTime ?? g.time),
    accessUntil: normalizeInformSyndicAccessUntil(g.accessUntil),
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
