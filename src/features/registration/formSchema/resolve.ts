import { derivedRegistrationLevel } from './completeness'
import { canRenderInWhatsAppFlow } from './flowSlots'
import { schemaFromGestion, schemaFromLegacyLevel } from './normalize'
import type {
  EffectiveRegistrationForm,
  EffectiveRegistrationFormOrigin,
  RegistrationFormSchema,
} from './types'

export interface ResolveRegistrationFormInput {
  listingGestion?: Record<string, unknown> | null
  ownerGestion?: Record<string, unknown> | null
}

function listingOverrides(listingGestion?: Record<string, unknown> | null): boolean {
  return listingGestion?.registrationFormOverride === true
}

function fromLegacy(
  listingGestion?: Record<string, unknown> | null,
  ownerGestion?: Record<string, unknown> | null,
): { schema: RegistrationFormSchema; origin: EffectiveRegistrationFormOrigin } {
  const listingLevel = listingGestion?.registrationLevel
  if (listingLevel === 'simple' || listingLevel === 'complete') {
    return {
      schema: schemaFromLegacyLevel(listingLevel),
      origin: listingLevel === 'complete' ? 'preset:complete' : 'preset:simple',
    }
  }
  const ownerLevel = ownerGestion?.registrationLevel
  if (ownerLevel === 'simple' || ownerLevel === 'complete') {
    return {
      schema: schemaFromLegacyLevel(ownerLevel),
      origin: ownerLevel === 'complete' ? 'preset:complete' : 'preset:simple',
    }
  }
  return { schema: schemaFromLegacyLevel('simple'), origin: 'preset:simple' }
}

export function resolveEffectiveRegistrationForm(
  input: ResolveRegistrationFormInput,
): EffectiveRegistrationForm {
  const listingGestion = input.listingGestion ?? null
  const ownerGestion = input.ownerGestion ?? null

  if (listingOverrides(listingGestion)) {
    const listingSchema = schemaFromGestion(listingGestion)
    const schema = listingSchema ?? schemaFromLegacyLevel(listingGestion?.registrationLevel)
    return {
      schema,
      origin: 'listing',
      override: true,
      registrationLevel: derivedRegistrationLevel(schema),
    }
  }

  const ownerSchema = schemaFromGestion(ownerGestion)
  if (ownerSchema) {
    return {
      schema: ownerSchema,
      origin: 'owner',
      override: false,
      registrationLevel: derivedRegistrationLevel(ownerSchema),
    }
  }

  const legacy = fromLegacy(listingGestion, ownerGestion)
  return {
    schema: legacy.schema,
    origin: legacy.origin,
    override: false,
    registrationLevel: derivedRegistrationLevel(legacy.schema),
  }
}

export function resolveOwnerRegistrationForm(
  ownerGestion?: Record<string, unknown> | null,
): EffectiveRegistrationForm {
  const schema = schemaFromGestion(ownerGestion) ?? schemaFromLegacyLevel(ownerGestion?.registrationLevel)
  const origin: EffectiveRegistrationFormOrigin =
    schemaFromGestion(ownerGestion) ? 'owner' : derivedRegistrationLevel(schema) === 'complete' ? 'preset:complete' : 'preset:simple'
  return {
    schema,
    origin,
    override: false,
    registrationLevel: derivedRegistrationLevel(schema),
  }
}

/**
 * @deprecated Guest registration always stays inside the WhatsApp Flow.
 * Kept so existing snapshot/API fields do not break. Always false.
 * Use `canRenderInWhatsAppFlow` to know whether a schema fits the Flow slots.
 */
export function needsWebCheckin(_schema: RegistrationFormSchema): boolean {
  return false
}

export function registrationUsesWhatsAppFlow(schema: RegistrationFormSchema): boolean {
  return canRenderInWhatsAppFlow(schema)
}

export function gestionWithSchema(
  existing: Record<string, unknown>,
  schema: RegistrationFormSchema,
  opts?: { override?: boolean },
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...existing,
    registrationFormSchema: { ...schema, version: 2 },
    registrationLevel: derivedRegistrationLevel(schema),
  }
  if (opts?.override === true) next.registrationFormOverride = true
  if (opts?.override === false) {
    delete next.registrationFormOverride
    delete next.registrationFormSchema
  }
  return next
}

export function gestionResetToInherited(existing: Record<string, unknown>): Record<string, unknown> {
  const next = { ...existing }
  delete next.registrationFormSchema
  delete next.registrationFormOverride
  return next
}
