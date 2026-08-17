import { enabledFields, fieldLabel } from './completeness'
import {
  REGISTRATION_FLOW_STATIC_BINDINGS,
  coerceAndValidateFlowAnswer,
  dynamicFlowFieldsForScope,
  markedRequiredLabel,
} from './flowSlots'
import { builtinField } from './builtinCatalog'
import { newCustomField } from './normalize'
import { simplePresetSchema } from './presets'
import type {
  RegistrationFieldDef,
  RegistrationFormSchema,
} from './types'

/** Built-in fields shown on the WhatsApp FORM review screen (not UPLOAD). */
export const REGISTRATION_FLOW_FORM_BINDINGS = [
  'first_name',
  'last_name',
  'document_number',
  'nationality',
  'birth_date',
  'place_of_birth',
  'document_issued_at',
  'document_issued_on',
] as const

export type RegistrationFlowFormBinding = (typeof REGISTRATION_FLOW_FORM_BINDINGS)[number]

/** Legacy FORM extras that are not in the builtin catalog. Hidden unless a matching enabled field exists. */
export const REGISTRATION_FLOW_FORM_LEGACY_COMPONENTS = ['gender', 'residence_country'] as const

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isOcrReviewBinding(binding: string | undefined): boolean {
  if (!binding) return false
  return (REGISTRATION_FLOW_STATIC_BINDINGS as readonly string[]).includes(binding)
}

export function isOcrReviewField(field: RegistrationFieldDef): boolean {
  return field.kind === 'builtin' && isOcrReviewBinding(field.binding)
}

export function schemaFieldForBinding(
  schema: RegistrationFormSchema,
  binding: string,
): RegistrationFieldDef | null {
  const enabled = enabledFields(schema)
  const exact = enabled.find(
    (f) => f.binding === binding || f.id === binding || f.key === binding,
  )
  return exact ?? null
}

export function isFormReviewFieldEnabled(
  schema: RegistrationFormSchema,
  binding: RegistrationFlowFormBinding,
): boolean {
  const field = schemaFieldForBinding(schema, binding)
  return Boolean(field && field.enabled !== false)
}

export function isLegacyFormComponentEnabled(
  schema: RegistrationFormSchema,
  name: (typeof REGISTRATION_FLOW_FORM_LEGACY_COMPONENTS)[number],
): boolean {
  const enabled = enabledFields(schema)
  if (name === 'gender') {
    return enabled.some((f) => f.id === 'gender' || f.key === 'gender')
  }
  return enabled.some((f) => f.id === 'residence_country' || f.key === 'residence_country')
}

export function passportPhotoField(schema: RegistrationFormSchema): RegistrationFieldDef | null {
  return schemaFieldForBinding(schema, 'passport_photo')
}

export function isPassportPhotoEnabled(schema: RegistrationFormSchema): boolean {
  const field = passportPhotoField(schema)
  return Boolean(field && field.enabled !== false)
}

export function isPassportPhotoRequired(schema: RegistrationFormSchema): boolean {
  const field = passportPhotoField(schema)
  return Boolean(field && field.enabled !== false && field.required)
}

export function nextScreenAfterFormSave(
  schema: RegistrationFormSchema,
): 'CUSTOM_FIELDS_A' | 'LIST_REFRESH' {
  return dynamicFlowFieldsForScope(schema, 'per_traveler').length > 0
    ? 'CUSTOM_FIELDS_A'
    : 'LIST_REFRESH'
}

export function registrationNavigationDiagnostics(
  schema: RegistrationFormSchema,
  extra?: {
    reservationId?: string
    origin?: string
    override?: boolean
  },
): Record<string, unknown> {
  return {
    reservationId: extra?.reservationId,
    origin: extra?.origin,
    override: extra?.override,
    enabledFieldIds: enabledFields(schema).map((f) => f.id),
    travelerDynamicIds: dynamicFlowFieldsForScope(schema, 'per_traveler').map((f) => f.id),
    stayDynamicIds: dynamicFlowFieldsForScope(schema, 'per_stay').map((f) => f.id),
    nextScreen: nextScreenAfterFormSave(schema),
  }
}

function fallbackFormField(binding: RegistrationFlowFormBinding): RegistrationFieldDef {
  return builtinField(binding, { required: false, enabled: false, order: 0 })
}

export function formReviewControlFlags(
  schema: RegistrationFormSchema,
  binding: RegistrationFlowFormBinding,
  locale?: string | null,
): {
  visible: boolean
  required: boolean
  label: string
  showDate: boolean
  showText: boolean
} {
  const field = schemaFieldForBinding(schema, binding)
  if (!field || field.enabled === false) {
    const base = fallbackFormField(binding)
    return {
      visible: false,
      required: false,
      label: markedRequiredLabel(fieldLabel(base, locale || undefined), false),
      showDate: false,
      showText: false,
    }
  }
  const isDate = field.type === 'date'
  return {
    visible: true,
    required: field.required === true,
    label: markedRequiredLabel(fieldLabel(field, locale || undefined), field.required === true),
    showDate: isDate,
    showText: !isDate,
  }
}

export type FormReviewValues = {
  first_name?: string
  last_name?: string
  document_number?: string
  nationality?: string
  birth_date?: string
  place_of_birth?: string
  document_issued_at?: string
  document_issued_on?: string
  gender?: string
  residence_country?: string
  hasVerifiedPhoto?: boolean
}

export function validateFormReviewFields(
  schema: RegistrationFormSchema,
  values: FormReviewValues,
): { ok: true; birthDate: string } | { ok: false; missing: string[] } {
  const missing: string[] = []
  for (const binding of REGISTRATION_FLOW_FORM_BINDINGS) {
    const field = schemaFieldForBinding(schema, binding)
    if (!field || field.enabled === false || field.required !== true) continue
    const raw = values[binding]
    const checked = coerceAndValidateFlowAnswer(field, raw)
    if (!checked.ok) missing.push(binding)
  }
  if (isPassportPhotoRequired(schema) && !values.hasVerifiedPhoto) {
    missing.push('passport_photo')
  }
  const birthRaw = String(values.birth_date ?? '').trim()
  if (birthRaw && !DATE_RE.test(birthRaw)) {
    if (!missing.includes('birth_date')) missing.push('birth_date')
  }
  const issuedRaw = String(values.document_issued_on ?? '').trim()
  if (issuedRaw && !DATE_RE.test(issuedRaw) && isFormReviewFieldEnabled(schema, 'document_issued_on')) {
    if (!missing.includes('document_issued_on')) missing.push('document_issued_on')
  }
  if (missing.length) return { ok: false, missing }
  return { ok: true, birthDate: birthRaw }
}

const MEMBER_KEY: Record<string, string> = {
  first_name: 'first_name',
  last_name: 'last_name',
  document_number: 'document_number',
  nationality: 'nationality',
  birth_date: 'date_of_birth',
  place_of_birth: 'place_of_birth',
  document_issued_at: 'document_issued_at',
  document_issued_on: 'document_issued_on',
  gender: 'gender',
  residence_country: 'residence_country',
  country: 'residence_country',
}

/** Only enabled FORM fields — omitted keys must not be written as empty strings. */
export function pickEnabledFormMemberPatch(
  schema: RegistrationFormSchema,
  values: FormReviewValues,
): Record<string, string> {
  const patch: Record<string, string> = {}
  for (const binding of REGISTRATION_FLOW_FORM_BINDINGS) {
    if (!isFormReviewFieldEnabled(schema, binding)) continue
    const memberKey = MEMBER_KEY[binding]
    if (!memberKey) continue
    patch[memberKey] = String(values[binding] ?? '').trim()
  }
  if (isLegacyFormComponentEnabled(schema, 'gender')) {
    patch.gender = String(values.gender ?? '').trim()
  }
  if (isLegacyFormComponentEnabled(schema, 'residence_country')) {
    patch.residence_country = String(values.residence_country ?? '').trim()
  }
  return patch
}

export function registrationFieldTypeLabel(field: RegistrationFieldDef): string {
  if (field.binding === 'passport_photo') return 'photo/document'
  const labels: Record<string, string> = {
    short_text: 'texte court',
    long_text: 'texte long',
    date: 'date',
    time: 'heure',
    select: 'liste',
    multi_select: 'liste multiple',
    boolean: 'oui / non',
  }
  return labels[field.type] || field.type
}

/** Exact production screenshot schema used for navigation regressions. */
export function screenshotHotelRegistrationSchema(): RegistrationFormSchema {
  return {
    version: 1,
    source: 'custom',
    fields: [
      builtinField('first_name', { required: false, enabled: true, order: 0 }),
      builtinField('last_name', { required: true, enabled: true, order: 1 }),
      builtinField('birth_date', { required: true, enabled: true, order: 2 }),
      builtinField('nationality', { required: true, enabled: true, order: 3 }),
      builtinField('document_number', { required: true, enabled: true, order: 4 }),
      builtinField('passport_photo', { required: true, enabled: true, order: 5 }),
      builtinField('place_of_birth', { required: false, enabled: true, order: 6 }),
      builtinField('document_issued_at', { required: false, enabled: true, order: 7 }),
      builtinField('document_issued_on', { required: false, enabled: true, order: 8 }),
      builtinField('profession', { required: true, enabled: true, order: 9 }),
      builtinField('coming_from', { required: true, enabled: true, order: 10 }),
      builtinField('going_to', { required: true, enabled: true, order: 11 }),
      builtinField('phone', { required: true, enabled: true, order: 12 }),
      newCustomField({
        id: 'nouvelle_question',
        key: 'nouvelle_question',
        label: 'Nouvelle question',
        type: 'time',
        required: true,
        enabled: true,
        scope: 'per_traveler',
        order: 13,
      }),
      builtinField('domicile', { required: false, enabled: true, order: 14 }),
      builtinField('city', { required: false, enabled: true, order: 15 }),
    ],
  }
}

export function defaultFormReviewSchema(): RegistrationFormSchema {
  return simplePresetSchema()
}
