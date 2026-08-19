import type {
  BuiltinBinding,
  PassportOcrProperty,
  RegistrationFieldDef,
  RegistrationFieldOption,
  RegistrationFieldScope,
  RegistrationFieldType,
  RegistrationScreenPlacement,
  RegistrationValueSource,
} from './types'

export const REGISTRATION_FIELD_LABELS: Record<BuiltinBinding, string> = {
  first_name: 'Prénom',
  last_name: 'Nom',
  birth_date: 'Date de naissance',
  place_of_birth: 'Lieu de naissance',
  nationality: 'Nationalité',
  document_number: 'N° CIN / Passeport',
  document_issued_at: 'Autorité / lieu de délivrance',
  document_issued_on: 'Date de délivrance',
  document_type: 'Type de document',
  gender: 'Genre',
  issuing_country: 'Pays émetteur',
  document_expiry_date: 'Date d’expiration',
  profession: 'Profession',
  domicile: 'Domicile habituel',
  city: 'Ville',
  country: 'Pays de résidence',
  coming_from: 'Lieu de provenance',
  going_to: 'Allant à',
  email: 'E-mail',
  phone: 'Téléphone',
  entry_number_morocco: "N° d'entrée au Maroc",
  passport_photo: 'Photo pièce',
  arrival_time: "Heure d'arrivée estimée",
}

export const PASSPORT_OCR_PROPERTIES: PassportOcrProperty[] = [
  'document_type',
  'first_name',
  'last_name',
  'document_number',
  'nationality',
  'issuing_country',
  'birth_date',
  'gender',
  'place_of_birth',
  'document_issued_on',
  'document_issued_at',
  'document_expiry_date',
]

export const PASSPORT_OCR_PROPERTY_LABELS: Record<PassportOcrProperty, string> = {
  document_type: 'Type de document',
  first_name: 'Prénom',
  last_name: 'Nom',
  document_number: 'N° CIN / Passeport',
  nationality: 'Nationalité',
  issuing_country: 'Pays émetteur',
  birth_date: 'Date de naissance',
  gender: 'Genre',
  place_of_birth: 'Lieu de naissance',
  document_issued_on: 'Date de délivrance',
  document_issued_at: 'Autorité / lieu de délivrance',
  document_expiry_date: 'Date d’expiration',
}

const BINDING_TYPE: Record<BuiltinBinding, RegistrationFieldType> = {
  first_name: 'short_text',
  last_name: 'short_text',
  birth_date: 'date',
  place_of_birth: 'short_text',
  nationality: 'short_text',
  document_number: 'short_text',
  document_issued_at: 'short_text',
  document_issued_on: 'date',
  document_type: 'select',
  gender: 'select',
  issuing_country: 'short_text',
  document_expiry_date: 'date',
  profession: 'short_text',
  domicile: 'short_text',
  city: 'short_text',
  country: 'short_text',
  coming_from: 'short_text',
  going_to: 'short_text',
  email: 'short_text',
  phone: 'short_text',
  entry_number_morocco: 'short_text',
  passport_photo: 'short_text',
  arrival_time: 'time',
}

const BINDING_SCOPE: Record<BuiltinBinding, RegistrationFieldScope> = {
  first_name: 'per_traveler',
  last_name: 'per_traveler',
  birth_date: 'per_traveler',
  place_of_birth: 'per_traveler',
  nationality: 'per_traveler',
  document_number: 'per_traveler',
  document_issued_at: 'per_traveler',
  document_issued_on: 'per_traveler',
  document_type: 'per_traveler',
  gender: 'per_traveler',
  issuing_country: 'per_traveler',
  document_expiry_date: 'per_traveler',
  profession: 'per_traveler',
  domicile: 'per_traveler',
  city: 'per_traveler',
  country: 'per_traveler',
  coming_from: 'per_traveler',
  going_to: 'per_traveler',
  email: 'per_traveler',
  phone: 'per_traveler',
  entry_number_morocco: 'per_traveler',
  passport_photo: 'per_traveler',
  arrival_time: 'per_stay',
}

export function defaultScreenForBinding(binding: BuiltinBinding): RegistrationScreenPlacement {
  if (binding === 'passport_photo') return 'upload'
  if ((PASSPORT_OCR_PROPERTIES as readonly string[]).includes(binding)) return 'passport'
  return 'completion'
}

export function defaultValueSourceForBinding(binding: BuiltinBinding): RegistrationValueSource {
  if ((PASSPORT_OCR_PROPERTIES as readonly string[]).includes(binding)) return 'ocr'
  return 'manual'
}

export function defaultOcrPropertyForBinding(binding: BuiltinBinding): PassportOcrProperty | undefined {
  if ((PASSPORT_OCR_PROPERTIES as readonly string[]).includes(binding)) {
    return binding as PassportOcrProperty
  }
  return undefined
}

function documentTypeOptions(): RegistrationFieldOption[] {
  return [
    { value: 'passport', label: 'Passeport', labels: { en: 'Passport', fr: 'Passeport' } },
    {
      value: 'national_id',
      label: 'Carte d’identité',
      labels: { en: 'National ID', fr: 'Carte d’identité' },
    },
  ]
}

function genderOptions(): RegistrationFieldOption[] {
  return [
    { value: 'Male', label: 'Homme', labels: { en: 'Male', fr: 'Homme' } },
    { value: 'Female', label: 'Femme', labels: { en: 'Female', fr: 'Femme' } },
  ]
}

export const ALL_BUILTIN_BINDINGS: BuiltinBinding[] = Object.keys(
  REGISTRATION_FIELD_LABELS,
) as BuiltinBinding[]

/**
 * Dedicated FORM/passport components (not generic typed slots).
 * Extra builtins (profession, phone, …) use typed slots on the completion screen
 * unless the listing places them on the passport screen.
 */
export const WHATSAPP_FLOW_SUPPORTED_BINDINGS: BuiltinBinding[] = [
  'document_type',
  'first_name',
  'last_name',
  'document_number',
  'nationality',
  'issuing_country',
  'birth_date',
  'gender',
  'place_of_birth',
  'document_issued_at',
  'document_issued_on',
  'document_expiry_date',
  'profession',
  'domicile',
  'city',
  'country',
  'coming_from',
  'going_to',
  'email',
  'phone',
  'entry_number_morocco',
  'arrival_time',
  'passport_photo',
]

export function builtinField(
  binding: BuiltinBinding,
  opts: { required: boolean; enabled: boolean; order: number },
): RegistrationFieldDef {
  const screen = defaultScreenForBinding(binding)
  const valueSource = defaultValueSourceForBinding(binding)
  const ocrProperty = defaultOcrPropertyForBinding(binding)
  return {
    id: binding,
    key: binding,
    kind: 'builtin',
    type: BINDING_TYPE[binding],
    label: REGISTRATION_FIELD_LABELS[binding],
    required: opts.required,
    enabled: opts.enabled,
    order: opts.order,
    scope: BINDING_SCOPE[binding],
    binding,
    screen,
    valueSource,
    ocrProperty,
    options:
      binding === 'document_type'
        ? documentTypeOptions()
        : binding === 'gender'
          ? genderOptions()
          : undefined,
  }
}

export function builtinCatalog(): RegistrationFieldDef[] {
  return ALL_BUILTIN_BINDINGS.map((binding, i) =>
    builtinField(binding, { required: false, enabled: false, order: i }),
  )
}

export function isPassportOcrProperty(value: string | undefined): value is PassportOcrProperty {
  return Boolean(value && (PASSPORT_OCR_PROPERTIES as readonly string[]).includes(value))
}
