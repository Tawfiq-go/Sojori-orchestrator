import { enabledFields, fieldLabel } from './completeness'
import { coerceAndValidateFlowAnswer, markedRequiredLabel } from './flowSlots'
import { builtinField } from './builtinCatalog'
import { PASSPORT_DEDICATED_PROPERTIES, isDedicatedPassportField } from './componentBudget'
import { schemaFieldForCanonicalBinding } from './canonicalOcr'
import { newCustomField, parseRegistrationFormSchema } from './normalize'
import { simplePresetSchema } from './presets'
import { resolveEffectiveRegistrationForm } from './resolve'
import { nextScreenAfterFormSave as nextInfoScreenAfterFormSave } from './screens'
import type { PassportOcrProperty, RegistrationFieldDef, RegistrationFormSchema } from './types'

/** Dedicated WhatsApp FORM / passport-information fields. */
export const REGISTRATION_FLOW_FORM_BINDINGS = PASSPORT_DEDICATED_PROPERTIES

export type RegistrationFlowFormBinding = (typeof REGISTRATION_FLOW_FORM_BINDINGS)[number]

/** @deprecated Residence is not a passport field. Hidden unless a matching enabled field exists on FORM. */
export const REGISTRATION_FLOW_FORM_LEGACY_COMPONENTS = ['residence_country'] as const

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isOcrReviewBinding(binding: string | undefined): boolean {
  if (!binding) return false
  return (REGISTRATION_FLOW_FORM_BINDINGS as readonly string[]).includes(binding)
}

export function isOcrReviewField(field: RegistrationFieldDef): boolean {
  return isDedicatedPassportField(field) || (field.kind === 'builtin' && isOcrReviewBinding(field.binding))
}

export function schemaFieldForBinding(
  schema: RegistrationFormSchema,
  binding: string,
): RegistrationFieldDef | null {
  return schemaFieldForCanonicalBinding(schema, binding)
}

export function isFormReviewFieldEnabled(
  schema: RegistrationFormSchema,
  binding: RegistrationFlowFormBinding,
): boolean {
  const field = schemaFieldForBinding(schema, binding)
  return Boolean(field && field.enabled !== false && (field.screen === 'passport' || field.screen == null))
}

export function isLegacyFormComponentEnabled(
  schema: RegistrationFormSchema,
  name: (typeof REGISTRATION_FLOW_FORM_LEGACY_COMPONENTS)[number] | 'gender',
): boolean {
  if (name === 'gender') {
    return isFormReviewFieldEnabled(schema, 'gender')
  }
  const enabled = enabledFields(schema)
  return enabled.some(
    (f) =>
      (f.id === 'residence_country' || f.key === 'residence_country' || f.binding === 'country') &&
      f.screen === 'passport',
  )
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

export function registrationNavigationDiagnostics(
  schema: RegistrationFormSchema,
  extra?: {
    reservationId?: string
    listingId?: string
    origin?: string
    override?: boolean
    selectedNextScreen?: string
    travelerIndex?: number
    travelerCount?: number
  },
): Record<string, unknown> {
  const flags = formScreenFlowFlags(schema)
  const travelerIndex = extra?.travelerIndex ?? 0
  const travelerCount = extra?.travelerCount ?? 1
  return {
    reservationId: extra?.reservationId,
    listingId: extra?.listingId,
    origin: extra?.origin,
    override: extra?.override,
    enabledFieldIds: enabledFields(schema).map((f) => f.id),
    disabledFieldIds: schema.fields.filter((f) => f.enabled === false).map((f) => f.id),
    requiredFieldIds: enabledFields(schema).filter((f) => f.required).map((f) => f.id),
    formVisibilityFlags: {
      document_type_visible: flags.document_type_visible,
      first_name_visible: flags.first_name_visible,
      last_name_visible: flags.last_name_visible,
      birth_date_visible: flags.birth_date_visible,
      nationality_visible: flags.nationality_visible,
      document_number_visible: flags.document_number_visible,
      issuing_country_visible: flags.issuing_country_visible,
      place_of_birth_visible: flags.place_of_birth_visible,
      document_issued_at_visible: flags.document_issued_at_visible,
      document_issued_on_visible: flags.document_issued_on_visible,
      document_expiry_date_visible: flags.document_expiry_date_visible,
      gender_visible: flags.gender_visible,
      residence_country_visible: flags.residence_country_visible,
    },
    formRequiredFlags: {
      document_type_required: flags.document_type_required,
      first_name_required: flags.first_name_required,
      last_name_required: flags.last_name_required,
      birth_date_required: flags.birth_date_required,
      nationality_required: flags.nationality_required,
      document_number_required: flags.document_number_required,
      issuing_country_required: flags.issuing_country_required,
      place_of_birth_required: flags.place_of_birth_required,
      document_issued_at_required: flags.document_issued_at_required,
      document_issued_on_required: flags.document_issued_on_required,
      document_expiry_date_required: flags.document_expiry_date_required,
      gender_required: flags.gender_required,
    },
    travelerDynamicIds: enabledFields(schema)
      .filter((f) => f.screen === 'completion' && f.scope === 'per_traveler')
      .map((f) => f.id),
    stayDynamicIds: enabledFields(schema)
      .filter((f) => f.screen === 'completion' && f.scope === 'per_stay')
      .map((f) => f.id),
    selectedNextScreen: extra?.selectedNextScreen ?? nextInfoScreenAfterFormSave(schema, travelerIndex, travelerCount),
  }
}

/** Prefer the attached listing/owner schema. Never replace a custom override with the simple preset. */
export function schemaFromFlowState(state: {
  registrationForm?: {
    schema?: RegistrationFormSchema | null
    origin?: string
    override?: boolean
  } | null
  registrationLevel?: string | null
} | null | undefined): RegistrationFormSchema {
  const attached = state?.registrationForm?.schema
  if (attached && Array.isArray(attached.fields) && attached.fields.length) {
    const parsed = parseRegistrationFormSchema(attached)
    return parsed.schema ?? attached
  }
  const origin = String(state?.registrationForm?.origin || '')
  if (origin && !origin.startsWith('preset:')) {
    return { version: 1, source: 'custom', fields: [] }
  }
  return resolveEffectiveRegistrationForm({
    listingGestion: { registrationLevel: state?.registrationLevel },
  }).schema
}

const DATE_RE_STRICT = /^\d{4}-\d{2}-\d{2}$/

export function sanitizeFlowDateValue(raw: unknown): string {
  const text = String(raw ?? '').trim()
  return DATE_RE_STRICT.test(text) ? text : ''
}

export function formScreenFlowFlags(
  schema: RegistrationFormSchema,
  locale?: string | null,
): Record<string, boolean | string> {
  const flags: Record<string, boolean | string> = {}
  for (const binding of REGISTRATION_FLOW_FORM_BINDINGS) {
    const control = formReviewControlFlags(schema, binding, locale)
    flags[`${binding}_visible`] = control.visible
    flags[`${binding}_required`] = control.visible && control.required
    flags[`${binding}_label`] = control.label
    flags[`${binding}_helper`] = control.helper
  }
  flags.gender_visible = Boolean(flags.gender_visible)
  flags.gender_required = Boolean(flags.gender_required)
  flags.residence_country_visible = false
  flags.residence_country_required = false
  return flags
}

function fallbackFormField(binding: RegistrationFlowFormBinding): RegistrationFieldDef {
  return builtinField(binding as 'first_name', { required: false, enabled: false, order: 0 })
}

export function formReviewControlFlags(
  schema: RegistrationFormSchema,
  binding: RegistrationFlowFormBinding,
  locale?: string | null,
): {
  visible: boolean
  required: boolean
  label: string
  helper: string
  showDate: boolean
  showText: boolean
} {
  const field = schemaFieldForBinding(schema, binding)
  if (!field || field.enabled === false || field.screen === 'completion' || field.screen === 'upload') {
    const base = fallbackFormField(binding)
    return {
      visible: false,
      required: false,
      label: markedRequiredLabel(fieldLabel(base, locale || undefined), false),
      helper: ' ',
      showDate: false,
      showText: false,
    }
  }
  const isDate = field.type === 'date'
  return {
    visible: true,
    required: field.required === true,
    label: markedRequiredLabel(fieldLabel(field, locale || undefined), field.required === true),
    helper: (field.helperText || ' ').trim() || ' ',
    showDate: isDate,
    showText: false,
  }
}

export type FormReviewValues = {
  document_type?: string
  first_name?: string
  last_name?: string
  document_number?: string
  nationality?: string
  issuing_country?: string
  birth_date?: string
  place_of_birth?: string
  document_issued_at?: string
  document_issued_on?: string
  document_expiry_date?: string
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
    if (field.screen === 'completion' || field.screen === 'upload') continue
    const raw = values[binding as keyof FormReviewValues]
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
  const expiryRaw = String(values.document_expiry_date ?? '').trim()
  if (expiryRaw && !DATE_RE.test(expiryRaw) && isFormReviewFieldEnabled(schema, 'document_expiry_date')) {
    if (!missing.includes('document_expiry_date')) missing.push('document_expiry_date')
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
  document_expiry_date: 'document_expiry_date',
  document_type: 'document_type',
  gender: 'gender',
  issuing_country: 'issuing_country',
  residence_country: 'residence_country',
  country: 'residence_country',
  personal_number: 'personal_number',
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
    patch[memberKey] = String(values[binding as keyof FormReviewValues] ?? '').trim()
  }
  return patch
}

export function ocrPrefillForField(
  field: RegistrationFieldDef,
  ocr: Record<string, unknown> | null | undefined,
): unknown {
  if (!ocr) return undefined
  const prop = field.ocrProperty || (field.valueSource === 'ocr' ? field.binding : undefined)
  if (!prop) return undefined
  const raw = ocr[prop]
  if (raw == null) return undefined
  const text = String(raw).trim()
  if (!text) return undefined
  const checked = coerceAndValidateFlowAnswer({ ...field, required: false }, text)
  return checked.ok && checked.value !== '' && checked.value !== false ? checked.value : undefined
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

/** Exact production listing-override fixture (Ray Ain Diab / latest screenshots). */
export function screenshotHotelRegistrationSchema(): RegistrationFormSchema {
  return {
    version: 1,
    source: 'custom',
    fields: [
      builtinField('first_name', { required: false, enabled: false, order: 0 }),
      builtinField('last_name', { required: false, enabled: false, order: 1 }),
      builtinField('birth_date', { required: false, enabled: true, order: 2 }),
      builtinField('nationality', { required: true, enabled: true, order: 3 }),
      builtinField('document_number', { required: true, enabled: true, order: 4 }),
      builtinField('passport_photo', { required: true, enabled: true, order: 5 }),
      builtinField('place_of_birth', { required: false, enabled: true, order: 6 }),
      builtinField('document_issued_at', { required: false, enabled: false, order: 7 }),
      builtinField('document_issued_on', { required: false, enabled: false, order: 8 }),
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
      builtinField('city', { required: true, enabled: true, order: 15 }),
    ],
  }
}

export function defaultFormReviewSchema(): RegistrationFormSchema {
  return simplePresetSchema()
}

export type { PassportOcrProperty }
