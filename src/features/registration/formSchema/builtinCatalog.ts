import type {
  BuiltinBinding,
  RegistrationFieldDef,
  RegistrationFieldType,
  RegistrationFieldScope,
} from './types'

export const REGISTRATION_FIELD_LABELS: Record<BuiltinBinding, string> = {
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
  arrival_time: "Heure d'arrivée estimée",
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

export const ALL_BUILTIN_BINDINGS: BuiltinBinding[] = Object.keys(
  REGISTRATION_FIELD_LABELS,
) as BuiltinBinding[]

/**
 * Built-in fields collected on the static FORM / UPLOAD screens.
 * Extra builtins (profession, phone, …) use dynamic Flow slots.
 */
export const WHATSAPP_FLOW_SUPPORTED_BINDINGS: BuiltinBinding[] = [
  'first_name',
  'last_name',
  'birth_date',
  'place_of_birth',
  'nationality',
  'document_number',
  'document_issued_at',
  'document_issued_on',
  'profession',
  'domicile',
  'city',
  'coming_from',
  'going_to',
  'phone',
  'passport_photo',
]

export function builtinField(
  binding: BuiltinBinding,
  opts: { required: boolean; enabled: boolean; order: number },
): RegistrationFieldDef {
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
  }
}

export function builtinCatalog(): RegistrationFieldDef[] {
  return ALL_BUILTIN_BINDINGS.map((binding, i) =>
    builtinField(binding, { required: false, enabled: false, order: i }),
  )
}
