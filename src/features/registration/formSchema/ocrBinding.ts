import {
  defaultOcrPropertyForBinding,
  documentTypeOptions,
  genderOptions,
  isPassportOcrProperty,
} from './builtinCatalog'
import type {
  PassportOcrProperty,
  RegistrationFieldDef,
  RegistrationFieldOption,
  RegistrationFieldType,
} from './types'

export const OCR_SOURCE_PASSPORT_HINT =
  'Les champs OCR sont préremplis depuis le document et affichés sur l’écran passeport.'

/** Canonical component type for each supported OCR property. */
export const OCR_PROPERTY_FIELD_TYPE: Record<PassportOcrProperty, RegistrationFieldType> = {
  document_type: 'select',
  gender: 'select',
  birth_date: 'date',
  document_issued_on: 'date',
  document_expiry_date: 'date',
  first_name: 'short_text',
  last_name: 'short_text',
  document_number: 'short_text',
  nationality: 'short_text',
  issuing_country: 'short_text',
  place_of_birth: 'short_text',
  document_issued_at: 'short_text',
  residence_country: 'short_text',
  personal_number: 'short_text',
}

export function ocrPropertyFieldType(prop: PassportOcrProperty): RegistrationFieldType {
  return OCR_PROPERTY_FIELD_TYPE[prop]
}

export function canonicalOcrSelectOptions(prop: PassportOcrProperty): RegistrationFieldOption[] | undefined {
  if (prop === 'gender') return genderOptions()
  if (prop === 'document_type') return documentTypeOptions()
  return undefined
}

export function ocrTypeMismatchMessage(
  field: Pick<RegistrationFieldDef, 'id' | 'label' | 'type'>,
  prop: PassportOcrProperty,
): string {
  const expected = ocrPropertyFieldType(prop)
  const name = field.label || field.id
  return `Le champ « ${name} » lié à OCR « ${prop} » doit être de type ${expected}, pas ${field.type}.`
}

export function disabledBuiltinOcrHint(
  fields: RegistrationFieldDef[],
  ocrProperty: PassportOcrProperty,
  currentFieldId?: string,
): string | null {
  const builtin = fields.find(
    (f) =>
      f.id !== currentFieldId &&
      f.kind === 'builtin' &&
      f.enabled === false &&
      (f.ocrProperty === ocrProperty || f.binding === ocrProperty),
  )
  if (!builtin) return null
  return `Le champ intégré « ${builtin.label || builtin.id} » existe déjà mais est désactivé. Activez-le plutôt que de lier une question personnalisée à OCR « ${ocrProperty} ».`
}

/**
 * OCR source always lives on the passport-information screen.
 * Selecting an OCR property installs the compatible type and canonical options.
 */
export function applyOcrBindingToField(
  field: RegistrationFieldDef,
  ocrProperty: PassportOcrProperty,
  allFields: RegistrationFieldDef[] = [],
): { field: RegistrationFieldDef; typeAdjusted: boolean; notice?: string } {
  const expected = ocrPropertyFieldType(ocrProperty)
  const options = canonicalOcrSelectOptions(ocrProperty)
  const typeAdjusted = field.type !== expected
  const next: RegistrationFieldDef = {
    ...field,
    valueSource: 'ocr',
    ocrProperty,
    screen: field.binding === 'passport_photo' ? 'upload' : 'passport',
    type: expected,
    options: options ?? (expected === 'select' || expected === 'multi_select' ? field.options : undefined),
  }
  const noticeParts: string[] = []
  if (typeAdjusted) {
    noticeParts.push(
      `Type ajusté en ${expected} pour correspondre à OCR « ${ocrProperty} ».`,
    )
  }
  const hint = disabledBuiltinOcrHint(allFields, ocrProperty, field.id)
  if (hint) noticeParts.push(hint)
  noticeParts.push(OCR_SOURCE_PASSPORT_HINT)
  return { field: next, typeAdjusted, notice: noticeParts.join(' ') }
}

export function ocrCompatibilityError(
  field: Pick<
    RegistrationFieldDef,
    'id' | 'label' | 'type' | 'ocrProperty' | 'valueSource' | 'kind' | 'binding' | 'enabled' | 'screen'
  >,
): string | null {
  const errors = ocrCompatibilityErrors(field)
  return errors[0] ?? null
}

export function ocrCompatibilityErrors(
  field: Pick<
    RegistrationFieldDef,
    'id' | 'label' | 'type' | 'ocrProperty' | 'valueSource' | 'kind' | 'binding' | 'enabled' | 'screen'
  >,
): string[] {
  if (field.enabled === false) return []
  if (field.valueSource !== 'ocr') return []
  const out: string[] = []
  const prop = field.ocrProperty
  if (!prop || !isPassportOcrProperty(prop)) {
    return [`Le champ « ${field.label || field.id} » en source OCR doit lier une propriété passeport prise en charge.`]
  }
  if (field.type !== ocrPropertyFieldType(prop)) {
    out.push(ocrTypeMismatchMessage(field, prop))
  }
  if (field.screen && field.screen !== 'passport' && field.binding !== 'passport_photo') {
    out.push(`Le champ OCR « ${field.label || field.id} » doit être affiché sur l’écran passeport.`)
  }
  if (field.kind === 'builtin' && field.binding) {
    const own = defaultOcrPropertyForBinding(field.binding)
    if (own && prop !== own) {
      out.push(`Le champ intégré « ${field.label || field.id} » doit rester lié à OCR « ${own} ».`)
    }
  }
  return out
}

export function coerceOcrFieldForMigrate(field: RegistrationFieldDef): RegistrationFieldDef {
  if (field.enabled === false) return field
  if (field.valueSource !== 'ocr') return field
  const prop =
    field.ocrProperty && isPassportOcrProperty(field.ocrProperty)
      ? field.ocrProperty
      : field.kind === 'builtin' && field.binding
        ? defaultOcrPropertyForBinding(field.binding)
        : undefined
  if (!prop) {
    return { ...field, valueSource: 'manual', ocrProperty: undefined }
  }
  const own =
    field.kind === 'builtin' && field.binding ? defaultOcrPropertyForBinding(field.binding) : undefined
  const bound = own ?? prop
  return applyOcrBindingToField({ ...field, ocrProperty: bound }, bound).field
}
