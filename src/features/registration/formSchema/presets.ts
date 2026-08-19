import { builtinField } from './builtinCatalog'
import type { RegistrationFormSchema, RegistrationLevel } from './types'

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

/** Existing “complete” listings: police-form field set. */
export function completePresetSchema(): RegistrationFormSchema {
  const fields = [
    ...simplePresetSchema().fields,
    builtinField('profession', { required: true, enabled: true, order: 13 }),
    builtinField('coming_from', { required: true, enabled: true, order: 14 }),
    builtinField('going_to', { required: true, enabled: true, order: 15 }),
    builtinField('phone', { required: true, enabled: true, order: 16 }),
    builtinField('domicile', { required: false, enabled: true, order: 17 }),
    builtinField('city', { required: false, enabled: true, order: 18 }),
    builtinField('country', { required: false, enabled: true, order: 19 }),
    builtinField('arrival_time', { required: false, enabled: true, order: 20 }),
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
  'phone',
] as const
