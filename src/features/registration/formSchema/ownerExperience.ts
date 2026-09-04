import { REGISTRATION_FIELD_LABELS } from './builtinCatalog'
import { registrationCapacityReport } from './componentBudget'
import { defaultScreenForField, defaultValueSourceForField } from './screens'
import type {
  BuiltinBinding,
  RegistrationFieldDef,
  RegistrationFieldType,
  RegistrationFormSchema,
} from './types'

/** Maximum custom questions an owner may configure. */
export const OWNER_CUSTOM_QUESTION_LIMIT = 4

/** Maximum custom questions an admin may configure (absolute API ceiling). */
export const ADMIN_CUSTOM_QUESTION_LIMIT = 10

export type RegistrationEditorRole = 'owner' | 'admin'

/** Passport fields usually filled from MRZ / reliable OCR. */
export const RELIABLE_PASSPORT_BINDINGS: BuiltinBinding[] = [
  'document_type',
  'first_name',
  'last_name',
  'document_number',
  'nationality',
  'birth_date',
  'gender',
  'issuing_country',
  'document_expiry_date',
]

/** Passport fields that may come from visual OCR and often need manual correction. */
export const OPTIONAL_VISUAL_PASSPORT_BINDINGS: BuiltinBinding[] = [
  'place_of_birth',
  'document_issued_on',
  'document_issued_at',
]

export const OWNER_FRIENDLY_FIELD_TYPES: { id: RegistrationFieldType; label: string }[] = [
  { id: 'short_text', label: 'Réponse courte' },
  { id: 'long_text', label: 'Réponse longue' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Heure' },
  { id: 'boolean', label: 'Oui / Non' },
  { id: 'select', label: 'Choix dans une liste' },
]

export function customQuestionLimitForRole(role: RegistrationEditorRole): number {
  return role === 'admin' ? ADMIN_CUSTOM_QUESTION_LIMIT : OWNER_CUSTOM_QUESTION_LIMIT
}

export function countEnabledCustomQuestions(schema: RegistrationFormSchema): number {
  return schema.fields.filter((f) => f.kind === 'custom' && f.enabled !== false).length
}

export function countCustomQuestions(schema: RegistrationFormSchema): number {
  return schema.fields.filter((f) => f.kind === 'custom').length
}

export function customQuestionLimitError(role: RegistrationEditorRole): string {
  const max = customQuestionLimitForRole(role)
  return `Vous avez atteint la limite de ${max} questions personnalisées.`
}

export function canAddCustomQuestion(
  schema: RegistrationFormSchema,
  role: RegistrationEditorRole,
): { ok: boolean; reason?: string } {
  const max = customQuestionLimitForRole(role)
  if (countEnabledCustomQuestions(schema) >= max) {
    return { ok: false, reason: customQuestionLimitError(role) }
  }
  const cap = registrationCapacityReport(schema)
  if (!cap.ok) {
    return {
      ok: false,
      reason:
        role === 'admin'
          ? cap.errors[0] || 'Capacité WhatsApp dépassée.'
          : 'Le formulaire contient trop de champs. Désactivez une question avant d’en ajouter une autre.',
    }
  }
  // Trial add on completion screen
  const trial: RegistrationFieldDef = {
    id: `__trial_custom_${schema.fields.length}`,
    key: `__trial_custom_${schema.fields.length}`,
    kind: 'custom',
    type: 'short_text',
    label: 'Nouvelle question',
    required: false,
    enabled: true,
    order: schema.fields.length,
    scope: 'per_traveler',
    screen: 'completion',
    valueSource: 'manual',
  }
  const next = registrationCapacityReport({ ...schema, fields: [...schema.fields, trial] })
  if (!next.ok) {
    return {
      ok: false,
      reason:
        role === 'admin'
          ? next.errors[0] || 'Capacité WhatsApp dépassée.'
          : 'Le formulaire contient trop de champs. Désactivez une question avant d’en ajouter une autre.',
    }
  }
  return { ok: true }
}

/** Strict schema validation helper — absolute ceiling is always the admin limit. */
export function customQuestionCountErrors(
  schema: RegistrationFormSchema,
  max: number = ADMIN_CUSTOM_QUESTION_LIMIT,
): string[] {
  const n = countEnabledCustomQuestions(schema)
  if (n > max) {
    return [`Au plus ${max} questions personnalisées actives (actuellement ${n}).`]
  }
  return []
}

export function ownerFacingSourceBadge(field: RegistrationFieldDef): string {
  if (field.binding === 'passport_photo') return 'Photo du document'
  if (defaultValueSourceForField(field) === 'ocr' || defaultScreenForField(field) === 'passport') {
    return 'Lu sur le passeport'
  }
  return 'À renseigner par le voyageur'
}

/** WhatsApp visibility — independent from required. */
export function ownerFacingWhatsAppLabel(field: RegistrationFieldDef): string {
  return field.enabled === false ? 'Masqué' : 'WhatsApp'
}

/**
 * Client obligation — independent from WhatsApp visibility.
 * Example: N° d’entrée can be on WhatsApp but facultatif (guest gets it on arrival).
 */
export function ownerFacingRequiredLabel(field: RegistrationFieldDef): string {
  if (field.enabled === false) return '—'
  return field.required ? 'Obligatoire' : 'Facultatif'
}

/** Combined status line for owner rows. */
export function ownerFacingFieldStatusLine(field: RegistrationFieldDef): string {
  if (field.enabled === false) return 'Masqué (pas sur WhatsApp)'
  return field.required ? 'WhatsApp · Obligatoire pour le client' : 'WhatsApp · Facultatif pour le client'
}

export function ownerFacingFieldTypeLabel(type: RegistrationFieldType): string {
  return OWNER_FRIENDLY_FIELD_TYPES.find((t) => t.id === type)?.label || 'Réponse courte'
}

export function isCoreProtectedField(field: RegistrationFieldDef): boolean {
  return field.binding === 'passport_photo' || field.binding === 'document_number'
}

export function coreProtectedFieldExplanation(field: RegistrationFieldDef): string {
  if (field.binding === 'passport_photo') {
    return 'La photo du document est nécessaire pour lire le passeport. Vous pouvez la rendre facultative, mais il est recommandé de la garder active.'
  }
  if (field.binding === 'document_number') {
    return 'Le numéro de document est une information d’identité essentielle pour l’enregistrement.'
  }
  return ''
}

export function fieldsForOwnerPassportTab(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return [...schema.fields]
    .filter((f) => f.binding !== 'passport_photo')
    .filter((f) => defaultScreenForField(f) === 'passport')
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function fieldsForOwnerCompletionTab(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return [...schema.fields]
    .filter((f) => defaultScreenForField(f) === 'completion')
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function findPassportPhotoField(schema: RegistrationFormSchema): RegistrationFieldDef | undefined {
  return schema.fields.find((f) => f.binding === 'passport_photo')
}

export function inheritanceStatusLabel(input: {
  ownerMode: boolean
  override: boolean
  origin: string
}): string {
  if (input.ownerMode) return 'Configuration du propriétaire'
  if (input.override) return 'Configuration personnalisée pour ce logement'
  if (input.origin === 'owner') return 'Configuration du propriétaire'
  if (input.origin === 'preset:complete') return 'Fiche de police'
  return 'Essentiel'
}

export function presetConfirmMessage(preset: 'essential' | 'police'): string {
  if (preset === 'police') {
    return 'Appliquer « Fiche de police » remplacera les champs actifs. Continuer ?'
  }
  return 'Appliquer « Essentiel » remplacera les champs actifs. Continuer ?'
}

export function builtinLabel(binding: BuiltinBinding): string {
  return REGISTRATION_FIELD_LABELS[binding] || binding
}
