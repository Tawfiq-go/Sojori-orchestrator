/** Canonical registration form contract — consumed by listing, fulltask, reservations, chatbot, orchestrator. */

export const REGISTRATION_FORM_SCHEMA_VERSION = 2 as const

export type RegistrationFormSchemaVersion = 1 | 2

export type RegistrationLevel = 'simple' | 'complete'

export type RegistrationFieldType =
  | 'short_text'
  | 'long_text'
  | 'date'
  | 'time'
  | 'select'
  | 'multi_select'
  | 'boolean'

export type RegistrationFieldScope = 'per_stay' | 'per_traveler'

export type RegistrationFieldKind = 'builtin' | 'custom'

/** WhatsApp information screen (UPLOAD is technical and is not one of the two). */
export type RegistrationScreenPlacement = 'passport' | 'completion' | 'upload'

export type RegistrationValueSource = 'manual' | 'ocr'

/** Explicit passport/OCR properties that may be extracted. Not authenticity. */
export type PassportOcrProperty =
  | 'document_type'
  | 'first_name'
  | 'last_name'
  | 'document_number'
  | 'nationality'
  | 'issuing_country'
  | 'birth_date'
  | 'gender'
  | 'place_of_birth'
  | 'document_issued_on'
  | 'document_issued_at'
  | 'document_expiry_date'
  | 'residence_country'
  | 'personal_number'

export type BuiltinBinding =
  | 'first_name'
  | 'last_name'
  | 'birth_date'
  | 'place_of_birth'
  | 'nationality'
  | 'document_number'
  | 'document_issued_at'
  | 'document_issued_on'
  | 'document_type'
  | 'gender'
  | 'issuing_country'
  | 'document_expiry_date'
  | 'personal_number'
  | 'profession'
  | 'domicile'
  | 'city'
  | 'country'
  | 'coming_from'
  | 'going_to'
  | 'email'
  | 'phone'
  | 'entry_number_morocco'
  | 'passport_photo'
  | 'arrival_time'

export type RegistrationFormSourceKind =
  | 'preset:simple'
  | 'preset:complete'
  | 'custom'

export type EffectiveRegistrationFormOrigin = 'listing' | 'owner' | 'preset:simple' | 'preset:complete'

export interface RegistrationFieldOption {
  value: string
  label: string
  labels?: Record<string, string>
}

export interface RegistrationFieldValidation {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: string
  max?: string
}

export interface RegistrationFieldDef {
  id: string
  key: string
  kind: RegistrationFieldKind
  type: RegistrationFieldType
  label: string
  labels?: Record<string, string>
  required: boolean
  enabled: boolean
  order: number
  scope: RegistrationFieldScope
  options?: RegistrationFieldOption[]
  validation?: RegistrationFieldValidation
  binding?: BuiltinBinding
  /** Information screen. `upload` is only valid for passport_photo. */
  screen: RegistrationScreenPlacement
  /** Manual entry vs a supported passport/OCR property. Independent of screen. */
  valueSource: RegistrationValueSource
  /** Set only when valueSource is `ocr`. Must be a supported passport property. */
  ocrProperty?: PassportOcrProperty
  helperText?: string
}

export interface RegistrationFormSchema {
  version: RegistrationFormSchemaVersion
  source: RegistrationFormSourceKind
  fields: RegistrationFieldDef[]
}

export interface EffectiveRegistrationForm {
  schema: RegistrationFormSchema
  origin: EffectiveRegistrationFormOrigin
  override: boolean
  /** Derived for consumers that still only know simple | complete. */
  registrationLevel: RegistrationLevel
}

export type CustomAnswerMap = Record<string, unknown>

export interface RegistrationCustomAnswers {
  stay: CustomAnswerMap
  travelers: Record<string, CustomAnswerMap>
}

export interface RegistrationAnswerContext {
  members: Array<Record<string, unknown>>
  customAnswers?: RegistrationCustomAnswers | null
  stay?: Record<string, unknown> | null
  travelerCount?: number
}

export interface SchemaValidationResult {
  ok: boolean
  schema: RegistrationFormSchema | null
  errors: string[]
}
