import {
  PASSPORT_DEDICATED_OCR_PROPERTIES,
  PASSPORT_OCR_PROPERTY_LABELS,
  builtinField,
  defaultScreenForBinding,
} from './builtinCatalog'
import { enabledFields, fieldLabel } from './completeness'
import { applyOcrBindingToField } from './ocrBinding'
import { defaultScreenForField, effectiveOcrProperty } from './screens'
import type {
  BuiltinBinding,
  PassportOcrProperty,
  RegistrationFieldDef,
  RegistrationFormSchema,
} from './types'

export function isDedicatedOcrProperty(prop: string): prop is PassportOcrProperty {
  return (PASSPORT_DEDICATED_OCR_PROPERTIES as readonly string[]).includes(prop)
}

/** OCR property represented by a field on the passport screen (if any). */
export function dedicatedOcrPropertyForField(
  field: Pick<RegistrationFieldDef, 'kind' | 'binding' | 'scope' | 'valueSource' | 'ocrProperty' | 'enabled' | 'screen'>,
): PassportOcrProperty | undefined {
  if (field.enabled === false) return undefined
  if (defaultScreenForField(field) !== 'passport') return undefined
  const prop = effectiveOcrProperty(field as RegistrationFieldDef)
  if (!prop || !isDedicatedOcrProperty(prop)) return undefined
  return prop
}

/**
 * Exactly one enabled field owns each dedicated OCR property.
 * Prefer the enabled built-in whose binding matches the property.
 */
export function canonicalOwnerForDedicatedOcrProperty(
  schema: RegistrationFormSchema,
  prop: PassportOcrProperty,
): RegistrationFieldDef | null {
  const fields = schema.fields
  const enabledBuiltin = fields.find(
    (f) => f.kind === 'builtin' && f.binding === prop && f.enabled !== false,
  )
  if (enabledBuiltin) return enabledBuiltin

  const customOwner = fields.find(
    (f) =>
      f.enabled !== false &&
      f.kind === 'custom' &&
      f.valueSource === 'ocr' &&
      f.ocrProperty === prop &&
      defaultScreenForField(f) === 'passport',
  )
  return customOwner ?? null
}

export function isCanonicalDedicatedPassportField(
  field: RegistrationFieldDef,
  schema: RegistrationFormSchema,
): boolean {
  const prop = dedicatedOcrPropertyForField(field)
  if (!prop && field.kind === 'builtin' && field.binding && isDedicatedOcrProperty(field.binding)) {
    const owner = canonicalOwnerForDedicatedOcrProperty(schema, field.binding)
    return owner?.id === field.id
  }
  if (!prop) return false
  const owner = canonicalOwnerForDedicatedOcrProperty(schema, prop)
  return owner?.id === field.id
}

export function schemaFieldForCanonicalBinding(
  schema: RegistrationFormSchema,
  binding: string,
): RegistrationFieldDef | null {
  if (isDedicatedOcrProperty(binding)) {
    return canonicalOwnerForDedicatedOcrProperty(schema, binding)
  }
  return (
    schema.fields.find(
      (f) => f.binding === binding || f.id === binding || f.key === binding,
    ) ?? null
  )
}

export function passportDedicatedCanonicalFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  const out: RegistrationFieldDef[] = []
  for (const prop of PASSPORT_DEDICATED_OCR_PROPERTIES) {
    const owner = canonicalOwnerForDedicatedOcrProperty(schema, prop)
    if (owner) out.push(owner)
  }
  return out
}

export function passportGenericEligibleFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return enabledFields(schema).filter((f) => {
    if (defaultScreenForField(f) !== 'passport') return false
    if (f.binding === 'passport_photo') return false
    if (dedicatedOcrPropertyForField(f)) return false
    if (
      f.kind === 'builtin' &&
      f.binding &&
      isDedicatedOcrProperty(f.binding)
    ) {
      return false
    }
    return true
  })
}

/**
 * Normalize bad production configs on authorized save / migrate parse:
 * - misbound builtins (city → issuing_country) restored to manual completion
 * - duplicate custom OCR replaced by enabling the matching builtin
 */
export function migrateCanonicalOcrBindings(fields: RegistrationFieldDef[]): RegistrationFieldDef[] {
  const next = fields.map((f) => ({ ...f }))

  for (const prop of PASSPORT_DEDICATED_OCR_PROPERTIES) {
    const builtinIdx = next.findIndex((f) => f.kind === 'builtin' && f.binding === prop)

    const misboundBuiltins = next.filter(
      (f) =>
        f.enabled !== false &&
        f.kind === 'builtin' &&
        f.binding &&
        f.binding !== prop &&
        f.valueSource === 'ocr' &&
        f.ocrProperty === prop,
    )
    const customOwners = next.filter(
      (f) =>
        f.enabled !== false &&
        f.kind === 'custom' &&
        f.valueSource === 'ocr' &&
        f.ocrProperty === prop,
    )
    const shouldEnableBuiltin =
      builtinIdx >= 0 && (misboundBuiltins.length > 0 || customOwners.length > 0)
    const requiredFromShadow =
      misboundBuiltins.some((f) => f.required) ||
      customOwners.some((f) => f.required) ||
      (builtinIdx >= 0 && next[builtinIdx]!.required === true)

    for (const f of misboundBuiltins) {
      const i = next.findIndex((x) => x.id === f.id)
      const binding = f.binding as BuiltinBinding
      const template = builtinField(binding, {
        required: f.required === true,
        enabled: true,
        order: f.order,
      })
      next[i] = {
        ...f,
        valueSource: 'manual',
        ocrProperty: undefined,
        screen: defaultScreenForBinding(binding),
        type: template.type,
      }
    }

    if (shouldEnableBuiltin) {
      const builtin = next[builtinIdx]!
      next[builtinIdx] = applyOcrBindingToField(
        { ...builtin, enabled: true, required: requiredFromShadow },
        prop,
      ).field
    }

    for (const custom of customOwners) {
      const idx = next.findIndex((f) => f.id === custom.id)
      if (idx < 0) continue
      next[idx] = {
        ...custom,
        enabled: false,
        required: false,
        valueSource: 'manual',
        ocrProperty: undefined,
      }
    }
  }

  return next
}

export function registrationMissingLabels(
  schema: RegistrationFormSchema,
  missingKeys: string[],
  locale?: string | null,
): string[] {
  const byId = new Map(schema.fields.map((f) => [f.id, f]))
  return missingKeys.map((key) => {
    if (isDedicatedOcrProperty(key)) {
      const field = schemaFieldForCanonicalBinding(schema, key)
      if (field && field.enabled !== false) {
        return fieldLabel(field, locale || undefined)
      }
      return PASSPORT_OCR_PROPERTY_LABELS[key]
    }
    const byBinding = schemaFieldForCanonicalBinding(schema, key)
    if (byBinding && byBinding.enabled !== false) {
      return fieldLabel(byBinding, locale || undefined)
    }
    const field = byId.get(key)
    if (field) return fieldLabel(field, locale || undefined)
    return key.replace(/_/g, ' ')
  })
}

export function formReviewMissingLabels(
  schema: RegistrationFormSchema,
  missingBindings: string[],
  locale?: string | null,
): string[] {
  return registrationMissingLabels(schema, missingBindings, locale)
}
