import { isAnswerFilled, memberFieldValue, stayFieldValue } from './answers'
import { REGISTRATION_FIELD_LABELS } from './builtinCatalog'
import { coerceAndValidateFlowAnswer } from './flowSlots'
import type {
  BuiltinBinding,
  RegistrationAnswerContext,
  RegistrationFieldDef,
  RegistrationFormSchema,
  RegistrationLevel,
} from './types'

export function enabledFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return schema.fields
    .filter((f) => f.enabled !== false)
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function requiredEnabledFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return enabledFields(schema).filter((f) => f.required)
}

function customValue(
  answers: Record<string, unknown> | undefined,
  field: RegistrationFieldDef,
): unknown {
  if (!answers) return undefined
  if (answers[field.id] !== undefined) return answers[field.id]
  if (answers[field.key] !== undefined) return answers[field.key]
  return undefined
}

function compatibleValue(field: RegistrationFieldDef, raw: unknown): unknown {
  if (raw == null || raw === '') return raw
  const checked = coerceAndValidateFlowAnswer({ ...field, required: false }, raw)
  return checked.ok ? checked.value : ''
}

export function fieldValueForTraveler(
  field: RegistrationFieldDef,
  member: Record<string, unknown> | null | undefined,
  travelerAnswers?: Record<string, unknown>,
): unknown {
  if (field.kind === 'builtin' && field.binding) {
    const bound = memberFieldValue(member, field.binding)
    if (isAnswerFilled(bound)) return compatibleValue(field, bound)
  }
  return compatibleValue(field, customValue(travelerAnswers, field))
}

export function fieldValueForStay(
  field: RegistrationFieldDef,
  stay: Record<string, unknown> | null | undefined,
  stayAnswers?: Record<string, unknown>,
): unknown {
  if (field.kind === 'builtin' && field.binding) {
    const bound = stayFieldValue(stay, field.binding)
    if (isAnswerFilled(bound)) return compatibleValue(field, bound)
  }
  return compatibleValue(field, customValue(stayAnswers, field))
}

export function missingFieldsForMember(
  member: Record<string, unknown> | null | undefined,
  schema: RegistrationFormSchema,
  travelerAnswers?: Record<string, unknown>,
): string[] {
  return requiredEnabledFields(schema)
    .filter((f) => f.scope === 'per_traveler')
    .filter((f) => !isAnswerFilled(fieldValueForTraveler(f, member, travelerAnswers)))
    .map((f) => f.id)
}

export function missingStayFields(
  schema: RegistrationFormSchema,
  stay?: Record<string, unknown> | null,
  stayAnswers?: Record<string, unknown>,
): string[] {
  return requiredEnabledFields(schema)
    .filter((f) => f.scope === 'per_stay')
    .filter((f) => !isAnswerFilled(fieldValueForStay(f, stay, stayAnswers)))
    .map((f) => f.id)
}

export function evaluateRegistrationCompleteness(
  schema: RegistrationFormSchema,
  ctx: RegistrationAnswerContext,
): {
  complete: boolean
  stayMissing: string[]
  travelersMissing: string[][]
  registeredCount: number
  total: number
} {
  const stayMissing = missingStayFields(schema, ctx.stay, ctx.customAnswers?.stay)
  const members = Array.isArray(ctx.members) ? ctx.members : []
  const total = Math.max(1, Number(ctx.travelerCount ?? members.length) || 1)
  const travelersMissing: string[][] = []
  let registeredCount = 0
  for (let i = 0; i < total; i++) {
    const member = members[i] || {}
    const travelerAnswers = ctx.customAnswers?.travelers?.[String(i)]
    const missing = missingFieldsForMember(member, schema, travelerAnswers)
    travelersMissing.push(missing)
    if (missing.length === 0) registeredCount += 1
  }
  const complete = stayMissing.length === 0 && registeredCount >= total && total > 0
  return { complete, stayMissing, travelersMissing, registeredCount, total }
}

export function fieldLabel(field: RegistrationFieldDef, locale?: string): string {
  if (locale && field.labels?.[locale]) return field.labels[locale] as string
  if (field.kind === 'builtin' && field.binding) {
    return field.label || REGISTRATION_FIELD_LABELS[field.binding]
  }
  return field.label || field.key
}

export function formatMissingFieldsHint(
  missingIds: string[],
  schema: RegistrationFormSchema,
  level?: RegistrationLevel,
): string {
  if (!missingIds.length) {
    return level === 'complete' ? '✅ Fiche complète' : '✅ Passeport OK'
  }
  const byId = new Map(schema.fields.map((f) => [f.id, f]))
  const labels = missingIds
    .map((id) => {
      const f = byId.get(id)
      if (!f) return id
      return fieldLabel(f)
    })
    .slice(0, 8)
  const more = missingIds.length > 8 ? ` (+${missingIds.length - 8})` : ''
  const mode = schema.source === 'preset:simple' ? 'Simple' : schema.source === 'preset:complete' ? 'Complet' : 'Formulaire'
  return `⚠ ${mode} — manquent : ${labels.join(', ')}${more}`
}

export function markedFieldLabel(label: string, value: string | undefined | null): string {
  return String(value ?? '').trim() ? label : `⚠ ${label}`
}

export function formatFormMissingHeader(missingLabels: string[], opts?: { okHint?: string }): string {
  if (!missingLabels.length) {
    return opts?.okHint || '✅ Vérifiez les champs puis enregistrez.'
  }
  const labels = missingLabels.slice(0, 10)
  const more = missingLabels.length > 10 ? ` (+${missingLabels.length - 10})` : ''
  return `⚠️ Manquent : ${labels.join(', ')}${more}`
}

export function derivedRegistrationLevel(schema: RegistrationFormSchema): RegistrationLevel {
  if (schema.source === 'preset:simple') return 'simple'
  if (schema.source === 'preset:complete') return 'complete'
  const required = new Set(requiredEnabledFields(schema).map((f) => f.binding || f.id))
  const extras: BuiltinBinding[] = ['profession', 'coming_from', 'going_to', 'phone']
  return extras.some((k) => required.has(k)) ? 'complete' : 'simple'
}
