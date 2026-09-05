import { builtinField, PASSPORT_DEDICATED_OCR_PROPERTIES } from './builtinCatalog'
import { applyOcrBindingToField } from './ocrBinding'
import type { BuiltinBinding, RegistrationFieldDef, RegistrationFormSchema, RegistrationLevel } from './types'

function cloneSchema(schema: RegistrationFormSchema): RegistrationFormSchema {
  return JSON.parse(JSON.stringify(schema)) as RegistrationFormSchema
}

/** Existing “simple” listings: passport / OCR core. */
export function simplePresetSchema(): RegistrationFormSchema {
  const fields = [
    builtinField('document_type', { required: false, enabled: true, order: 0 }),
    builtinField('first_name', { required: true, enabled: true, order: 1 }),
    builtinField('last_name', { required: true, enabled: true, order: 2 }),
    builtinField('document_number', { required: true, enabled: true, order: 3 }),
    builtinField('nationality', { required: true, enabled: true, order: 4 }),
    builtinField('issuing_country', { required: false, enabled: true, order: 5 }),
    builtinField('birth_date', { required: true, enabled: true, order: 6 }),
    builtinField('gender', { required: false, enabled: true, order: 7 }),
    builtinField('place_of_birth', { required: false, enabled: true, order: 8 }),
    builtinField('document_issued_on', { required: false, enabled: true, order: 9 }),
    builtinField('document_issued_at', { required: false, enabled: true, order: 10 }),
    builtinField('document_expiry_date', { required: false, enabled: true, order: 11 }),
    builtinField('passport_photo', { required: true, enabled: true, order: 12 }),
  ]
  return { version: 2, source: 'preset:simple', fields }
}

/**
 * “Complete” = fiche police field set.
 * Formulaire extras are required except n° d’entrée au Maroc (often unknown until arrival)
 * and phone / arrival time.
 */
export function completePresetSchema(): RegistrationFormSchema {
  const fields = [
    ...simplePresetSchema().fields,
    builtinField('profession', { required: true, enabled: true, order: 13 }),
    builtinField('coming_from', { required: true, enabled: true, order: 14 }),
    builtinField('going_to', { required: true, enabled: true, order: 15 }),
    builtinField('phone', { required: false, enabled: true, order: 16 }),
    builtinField('domicile', { required: true, enabled: true, order: 17 }),
    builtinField('city', { required: true, enabled: true, order: 18 }),
    builtinField('country', { required: true, enabled: true, order: 19 }),
    {
      ...builtinField('entry_number_morocco', { required: false, enabled: true, order: 20 }),
      helperText: DEFAULT_OPTIONAL_FIELD_HELPERS.entry_number_morocco,
    },
    builtinField('arrival_time', { required: false, enabled: true, order: 21 }),
  ]
  return { version: 2, source: 'preset:complete', fields }
}

export function presetSchemaForLevel(level: RegistrationLevel): RegistrationFormSchema {
  return cloneSchema(level === 'complete' ? completePresetSchema() : simplePresetSchema())
}

export const SIMPLE_REQUIRED_KEYS = [
  'first_name',
  'last_name',
  'birth_date',
  'nationality',
  'document_number',
  'passport_photo',
] as const

export const COMPLETE_EXTRA_REQUIRED_KEYS = [
  'profession',
  'coming_from',
  'going_to',
  'domicile',
  'city',
  'country',
] as const
export const COMPLETE_EXTRA_OPTIONAL_KEYS = [
  'phone',
  'entry_number_morocco',
  'arrival_time',
] as const

/** Texte client par défaut quand le champ est affiché mais pas obligatoire. */
export const DEFAULT_OPTIONAL_FIELD_HELPERS: Record<string, string> = {
  entry_number_morocco: 'Sera récupéré à votre arrivée.',
}

export function patchBuiltinField(
  schema: RegistrationFormSchema,
  binding: string,
  patch: { required?: boolean; enabled?: boolean; helperText?: string | null },
): RegistrationFormSchema {
  const fromComplete = completePresetSchema().fields.find((f) => f.binding === binding)
  let found = false
  const fields = schema.fields.map((f) => {
    if ((f.binding || f.id) !== binding) return f
    found = true
    return applyBuiltinPatch(f, patch)
  })
  if (!found && fromComplete) {
    fields.push({ ...applyBuiltinPatch(fromComplete, patch), order: fields.length })
  }
  return { ...schema, version: 2, fields: fields.map((f, i) => ({ ...f, order: i })) }
}

function applyBuiltinPatch(
  field: RegistrationFieldDef,
  patch: { required?: boolean; enabled?: boolean; helperText?: string | null },
): RegistrationFieldDef {
  const next = { ...field }
  if (patch.required !== undefined) next.required = patch.required
  if (patch.enabled !== undefined) next.enabled = patch.enabled
  if (patch.helperText !== undefined) {
    const text = String(patch.helperText || '').trim()
    next.helperText = text || undefined
  }
  if (next.required) next.enabled = true
  if (next.enabled === false) next.required = false
  return next
}

/** Toggle WhatsApp-required on a builtin field; adds the complete-preset field if missing. */
export function setBuiltinRequired(
  schema: RegistrationFormSchema,
  binding: string,
  required: boolean,
): RegistrationFormSchema {
  return patchBuiltinField(schema, binding, { required })
}

const MAX_PASSPORT_CORE_REQUIRED = new Set([
  'first_name',
  'last_name',
  'document_number',
  'nationality',
  'birth_date',
  'passport_photo',
])

/**
 * Enable every supported passport OCR field on the passport screen.
 * Required flags stay as they were (or the simple-core defaults for new fields).
 * Completion extras are preserved.
 */
export function applyMaxPassportExtraction(schema: RegistrationFormSchema): RegistrationFormSchema {
  const existing = new Map(schema.fields.map((f) => [f.id, f]))
  const next: RegistrationFieldDef[] = []
  let order = 0
  const taken = new Set<string>()

  for (const binding of PASSPORT_DEDICATED_OCR_PROPERTIES as BuiltinBinding[]) {
    const prev = existing.get(binding)
    const field = builtinField(binding, {
      required: prev ? prev.required === true : MAX_PASSPORT_CORE_REQUIRED.has(binding),
      enabled: true,
      order: order++,
    })
    next.push({
      ...field,
      label: prev?.label || field.label,
      helperText: prev?.helperText,
      required: prev ? prev.required === true : field.required,
    })
    taken.add(binding)
  }

  const photoPrev = existing.get('passport_photo')
  next.push({
    ...builtinField('passport_photo', {
      required: photoPrev ? photoPrev.required === true : true,
      enabled: true,
      order: order++,
    }),
    required: photoPrev ? photoPrev.required === true : true,
    label: photoPrev?.label || 'Photo pièce',
  })
  taken.add('passport_photo')

  const countryPrev = existing.get('country')
  const countryBase = builtinField('country', {
    required: countryPrev ? countryPrev.required === true : false,
    enabled: true,
    order: order++,
  })
  next.push(
    applyOcrBindingToField(
      {
        ...countryBase,
        required: countryPrev ? countryPrev.required === true : false,
        label: countryPrev?.label || countryBase.label,
      },
      'residence_country',
    ).field,
  )
  taken.add('country')

  const personalPrev = existing.get('personal_number')
  next.push(
    builtinField('personal_number', {
      required: personalPrev ? personalPrev.required === true : false,
      enabled: true,
      order: order++,
    }),
  )
  taken.add('personal_number')

  for (const field of schema.fields) {
    if (taken.has(field.id) || (field.binding && taken.has(field.binding))) continue
    next.push({ ...field, order: order++ })
  }

  return { version: 2, source: 'custom', fields: next }
}
