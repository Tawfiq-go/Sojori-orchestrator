/** Aligné avec srv-fulltask/src/services/registrationLevel.ts */

export type RegistrationLevel = 'simple' | 'complete';

export type RegistrationFieldKey =
  | 'first_name'
  | 'last_name'
  | 'birth_date'
  | 'place_of_birth'
  | 'nationality'
  | 'document_number'
  | 'document_issued_at'
  | 'document_issued_on'
  | 'profession'
  | 'domicile'
  | 'city'
  | 'country'
  | 'coming_from'
  | 'going_to'
  | 'email'
  | 'phone'
  | 'entry_number_morocco'
  | 'passport_photo';

export const REGISTRATION_FIELD_LABELS: Record<RegistrationFieldKey, string> = {
  first_name: 'Prénom',
  last_name: 'Nom',
  birth_date: 'Date de naissance',
  place_of_birth: 'Lieu de naissance',
  nationality: 'Nationalité',
  document_number: 'N° CIN / Passeport',
  document_issued_at: 'Délivré à',
  document_issued_on: 'Délivré le',
  profession: 'Profession',
  domicile: 'Domicile habituel',
  city: 'Ville',
  country: 'Pays',
  coming_from: 'Lieu de provenance',
  going_to: 'Allant à',
  email: 'E-mail',
  phone: 'Téléphone',
  entry_number_morocco: "N° d'entrée au Maroc",
  passport_photo: 'Photo pièce',
};

const SIMPLE_REQUIRED: RegistrationFieldKey[] = [
  'first_name',
  'last_name',
  'birth_date',
  'nationality',
  'document_number',
  'passport_photo',
];

const COMPLETE_EXTRA: RegistrationFieldKey[] = [
  'place_of_birth',
  'profession',
  'domicile',
  'city',
  'country',
  'coming_from',
  'going_to',
  'document_issued_at',
  'document_issued_on',
  'email',
  'phone',
];

export function normalizeRegistrationLevel(raw: unknown): RegistrationLevel {
  return String(raw || '')
    .trim()
    .toLowerCase() === 'complete'
    ? 'complete'
    : 'simple';
}

export function requiredFieldsForLevel(level: RegistrationLevel): RegistrationFieldKey[] {
  return level === 'complete' ? [...SIMPLE_REQUIRED, ...COMPLETE_EXTRA] : [...SIMPLE_REQUIRED];
}

function pick(m: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = m[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export function memberFieldValue(
  member: Record<string, unknown> | null | undefined,
  key: RegistrationFieldKey,
): string {
  const m = member || {};
  switch (key) {
    case 'first_name':
      return pick(m, 'first_name', 'firstName');
    case 'last_name':
      return pick(m, 'last_name', 'lastName');
    case 'birth_date':
      return pick(m, 'birth_date', 'date_of_birth', 'birthDate');
    case 'place_of_birth':
      return pick(m, 'place_of_birth', 'birth_place');
    case 'nationality':
      return pick(m, 'nationality');
    case 'document_number':
      return pick(m, 'document_number', 'passport');
    case 'document_issued_at':
      return pick(m, 'document_issued_at', 'issued_at');
    case 'document_issued_on':
      return pick(m, 'document_issued_on', 'issued_on');
    case 'profession':
      return pick(m, 'profession', 'occupation');
    case 'domicile':
      return pick(m, 'domicile', 'address', 'habitual_address');
    case 'city':
      return pick(m, 'city', 'ville');
    case 'country':
      return pick(m, 'country', 'country_of_residence', 'residence_country');
    case 'coming_from':
      return pick(m, 'coming_from', 'provenance');
    case 'going_to':
      return pick(m, 'going_to', 'destination', 'allant');
    case 'email':
      return pick(m, 'email', 'guest_email');
    case 'phone':
      return pick(m, 'phone', 'telephone');
    case 'entry_number_morocco':
      return pick(m, 'entry_number_morocco', 'morocco_entry_number');
    case 'passport_photo':
      return pick(m, 'document_front_download', 'document_front_scan', 'passport_photo', 'photo_url')
        ? 'ok'
        : '';
    default:
      return '';
  }
}

export function missingFieldsForMember(
  member: Record<string, unknown> | null | undefined,
  level: RegistrationLevel,
): RegistrationFieldKey[] {
  return requiredFieldsForLevel(level).filter((k) => !memberFieldValue(member, k));
}
