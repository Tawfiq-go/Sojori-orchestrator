/** Compat — canonical rules: ./formSchema (mirror of @sojori/registration-form). */
import {
  REGISTRATION_FIELD_LABELS as CANONICAL_LABELS,
  memberFieldValue as canonicalMemberFieldValue,
  missingFieldsForMember as missingForSchema,
  normalizeRegistrationLevel as canonicalNormalize,
  presetSchemaForLevel,
  requiredEnabledFields,
  type BuiltinBinding,
  type RegistrationLevel,
} from './formSchema';

export type { RegistrationLevel };
export type RegistrationFieldKey = BuiltinBinding;

export const REGISTRATION_FIELD_LABELS: Record<RegistrationFieldKey, string> = {
  ...CANONICAL_LABELS,
};

export const PASSPORT_OPTIONAL_OCR: RegistrationFieldKey[] = [
  'place_of_birth',
  'document_issued_at',
  'document_issued_on',
];

export const SIMPLE_DISPLAY_FIELDS: RegistrationFieldKey[] = [
  'first_name',
  'last_name',
  'birth_date',
  'nationality',
  'document_number',
  'place_of_birth',
  'document_issued_at',
  'document_issued_on',
  'passport_photo',
];

export const COMPLETE_DISPLAY_FIELDS: RegistrationFieldKey[] = [
  'profession',
  'coming_from',
  'going_to',
  'phone',
  'domicile',
  'city',
];

export function normalizeRegistrationLevel(raw: unknown): RegistrationLevel {
  return canonicalNormalize(raw);
}

export function requiredFieldsForLevel(level: RegistrationLevel): RegistrationFieldKey[] {
  return requiredEnabledFields(presetSchemaForLevel(level)).map((f) => f.id as RegistrationFieldKey);
}

export function memberFieldValue(
  member: Record<string, unknown> | null | undefined,
  key: RegistrationFieldKey,
): string {
  return canonicalMemberFieldValue(member, key);
}

export function missingFieldsForMember(
  member: Record<string, unknown> | null | undefined,
  level: RegistrationLevel,
): RegistrationFieldKey[] {
  return missingForSchema(member, presetSchemaForLevel(level)) as RegistrationFieldKey[];
}
