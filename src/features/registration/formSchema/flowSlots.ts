import { enabledFields, fieldLabel } from './completeness'
import type {
  RegistrationFieldDef,
  RegistrationFieldScope,
  RegistrationFieldType,
  RegistrationFormSchema,
} from './types'

/** Sojori product limit for extra fields rendered as WhatsApp Flow slots. Not Meta's official maximum. */
export const REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT = 10
export const REGISTRATION_FLOW_SLOTS_PER_PAGE = 5

export const REGISTRATION_FLOW_VARIANT_TYPES = [
  'short_text',
  'long_text',
  'date',
  'time',
  'select',
  'multi_select',
  'boolean',
] as const

export type RegistrationFlowVariantType = (typeof REGISTRATION_FLOW_VARIANT_TYPES)[number]

/**
 * Passport / OCR review fields already collected on FORM and UPLOAD.
 * These do not consume dynamic Flow slots.
 */
export const REGISTRATION_FLOW_STATIC_BINDINGS = [
  'first_name',
  'last_name',
  'birth_date',
  'place_of_birth',
  'nationality',
  'document_number',
  'document_issued_at',
  'document_issued_on',
  'passport_photo',
] as const

export type RegistrationFlowCustomScreenId =
  | 'CUSTOM_FIELDS_A'
  | 'CUSTOM_FIELDS_B'
  | 'STAY_FIELDS_A'
  | 'STAY_FIELDS_B'

export type RegistrationFlowSlotPage = 'A' | 'B'

export interface RegistrationFlowSlotBinding {
  slot: number
  field: RegistrationFieldDef
}

export interface WhatsAppFlowRenderCheck {
  ok: boolean
  errors: string[]
  dynamicCount: number
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function requiresDynamicFlowSlot(field: RegistrationFieldDef): boolean {
  if (field.enabled === false) return false
  if (field.kind === 'custom') return true
  if (!field.binding) return true
  return !(REGISTRATION_FLOW_STATIC_BINDINGS as readonly string[]).includes(field.binding)
}

export function dynamicFlowFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return enabledFields(schema).filter(requiresDynamicFlowSlot)
}

export function dynamicFlowSlotCount(schema: RegistrationFormSchema): number {
  return dynamicFlowFields(schema).length
}

export function dynamicFlowFieldsForScope(
  schema: RegistrationFormSchema,
  scope: RegistrationFieldScope,
): RegistrationFieldDef[] {
  return dynamicFlowFields(schema).filter((field) => field.scope === scope)
}

export function canAddDynamicRegistrationField(schema: RegistrationFormSchema): boolean {
  return dynamicFlowSlotCount(schema) < REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT
}

export function whatsAppFlowRenderCheck(schema: RegistrationFormSchema): WhatsAppFlowRenderCheck {
  const fields = dynamicFlowFields(schema)
  const errors: string[] = []
  if (fields.length > REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT) {
    errors.push(
      `at most ${REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT} extra WhatsApp Flow fields (got ${fields.length})`,
    )
  }
  for (const field of fields) {
    if (!REGISTRATION_FLOW_VARIANT_TYPES.includes(field.type as RegistrationFlowVariantType)) {
      errors.push(`unsupported Flow field type ${field.type} on ${field.id}`)
    }
  }
  return { ok: errors.length === 0, errors, dynamicCount: fields.length }
}

export function canRenderInWhatsAppFlow(schema: RegistrationFormSchema): boolean {
  return whatsAppFlowRenderCheck(schema).ok
}

export function slotNumbersForPage(page: RegistrationFlowSlotPage): number[] {
  const start = page === 'A' ? 1 : REGISTRATION_FLOW_SLOTS_PER_PAGE + 1
  return Array.from({ length: REGISTRATION_FLOW_SLOTS_PER_PAGE }, (_, i) => start + i)
}

export function pageForSlot(slot: number): RegistrationFlowSlotPage {
  return slot <= REGISTRATION_FLOW_SLOTS_PER_PAGE ? 'A' : 'B'
}

export function customScreenIdFor(
  scope: RegistrationFieldScope,
  page: RegistrationFlowSlotPage,
): RegistrationFlowCustomScreenId {
  if (scope === 'per_stay') return page === 'A' ? 'STAY_FIELDS_A' : 'STAY_FIELDS_B'
  return page === 'A' ? 'CUSTOM_FIELDS_A' : 'CUSTOM_FIELDS_B'
}

export function scopeAndPageFromScreen(
  screen: string,
): { scope: RegistrationFieldScope; page: RegistrationFlowSlotPage } | null {
  if (screen === 'CUSTOM_FIELDS_A') return { scope: 'per_traveler', page: 'A' }
  if (screen === 'CUSTOM_FIELDS_B') return { scope: 'per_traveler', page: 'B' }
  if (screen === 'STAY_FIELDS_A') return { scope: 'per_stay', page: 'A' }
  if (screen === 'STAY_FIELDS_B') return { scope: 'per_stay', page: 'B' }
  return null
}

export function isRegistrationCustomScreen(screen: string): screen is RegistrationFlowCustomScreenId {
  return scopeAndPageFromScreen(screen) != null
}

export function slotBindingsForPage(
  fields: RegistrationFieldDef[],
  page: RegistrationFlowSlotPage,
): Array<{ slot: number; field: RegistrationFieldDef | null }> {
  const offset = page === 'A' ? 0 : REGISTRATION_FLOW_SLOTS_PER_PAGE
  return slotNumbersForPage(page).map((slot, i) => ({
    slot,
    field: fields[offset + i] ?? null,
  }))
}

export function nextCustomScreen(
  scope: RegistrationFieldScope,
  page: RegistrationFlowSlotPage,
  fieldCount: number,
): RegistrationFlowCustomScreenId | null {
  if (page === 'A' && fieldCount > REGISTRATION_FLOW_SLOTS_PER_PAGE) {
    return customScreenIdFor(scope, 'B')
  }
  return null
}

export function fieldTypeToVariant(type: RegistrationFieldType): RegistrationFlowVariantType {
  if (REGISTRATION_FLOW_VARIANT_TYPES.includes(type as RegistrationFlowVariantType)) {
    return type as RegistrationFlowVariantType
  }
  return 'short_text'
}

export function markedRequiredLabel(label: string, required: boolean): string {
  const trimmed = label.trim() || ' '
  if (!required) return trimmed
  return trimmed.endsWith('*') ? trimmed : `${trimmed} *`
}

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v ?? '').trim()).filter(Boolean)
  if (raw == null || raw === '') return []
  const s = String(raw).trim()
  if (!s) return []
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s) as unknown
      if (Array.isArray(parsed)) return parsed.map((v) => String(v ?? '').trim()).filter(Boolean)
    } catch {
      /* fall through */
    }
  }
  return s.split(',').map((v) => v.trim()).filter(Boolean)
}

function optionAllowlist(field: RegistrationFieldDef): Set<string> {
  return new Set((field.options ?? []).map((opt) => opt.value))
}

export function coerceAndValidateFlowAnswer(
  field: RegistrationFieldDef,
  raw: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const variant = fieldTypeToVariant(field.type)
  if (variant === 'boolean') {
    if (raw === true || raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes') {
      return { ok: true, value: true }
    }
    if (raw === false || raw === 'false' || raw === '0' || raw === 'off' || raw === 'no' || raw == null || raw === '') {
      if (field.required) return { ok: false, error: 'required' }
      return { ok: true, value: false }
    }
    return { ok: false, error: 'invalid_boolean' }
  }

  if (variant === 'multi_select') {
    const values = asStringArray(raw)
    if (!values.length) {
      return field.required ? { ok: false, error: 'required' } : { ok: true, value: [] }
    }
    const allow = optionAllowlist(field)
    if (values.some((v) => !allow.has(v))) return { ok: false, error: 'invalid_option' }
    return { ok: true, value: values }
  }

  const text = raw == null ? '' : String(Array.isArray(raw) ? raw[0] ?? '' : raw).trim()
  if (!text) {
    return field.required ? { ok: false, error: 'required' } : { ok: true, value: '' }
  }

  if (variant === 'select') {
    if (!optionAllowlist(field).has(text)) return { ok: false, error: 'invalid_option' }
    return { ok: true, value: text }
  }
  if (variant === 'date' && !DATE_RE.test(text)) return { ok: false, error: 'invalid_date' }
  if (variant === 'time' && !TIME_RE.test(text)) return { ok: false, error: 'invalid_time' }

  const minLen = field.validation?.minLength
  const maxLen = field.validation?.maxLength
  if (typeof minLen === 'number' && text.length < minLen) return { ok: false, error: 'too_short' }
  if (typeof maxLen === 'number' && text.length > maxLen) return { ok: false, error: 'too_long' }
  if (field.validation?.pattern) {
    try {
      if (!new RegExp(field.validation.pattern).test(text)) return { ok: false, error: 'invalid_pattern' }
    } catch {
      /* ignore bad configured regex */
    }
  }
  return { ok: true, value: text }
}

export function extractActiveSlotRawValue(
  field: RegistrationFieldDef,
  slot: number,
  data: Record<string, unknown>,
): unknown {
  const variant = fieldTypeToVariant(field.type)
  const key = `slot_${slot}_${variant}`
  return data[key]
}

export function mapSlotAnswersFromFlowData(input: {
  fields: RegistrationFieldDef[]
  page: RegistrationFlowSlotPage
  data: Record<string, unknown>
}): {
  ok: boolean
  answers: Record<string, unknown>
  errors: Array<{ slot: number; fieldId: string; error: string }>
} {
  const answers: Record<string, unknown> = {}
  const errors: Array<{ slot: number; fieldId: string; error: string }> = []
  for (const { slot, field } of slotBindingsForPage(input.fields, input.page)) {
    if (!field) continue
    const raw = extractActiveSlotRawValue(field, slot, input.data)
    const checked = coerceAndValidateFlowAnswer(field, raw)
    if (!checked.ok) {
      errors.push({ slot, fieldId: field.id, error: checked.error })
      continue
    }
    answers[field.id] = checked.value
    if (field.key && field.key !== field.id) answers[field.key] = checked.value
  }
  return { ok: errors.length === 0, answers, errors }
}

function flowOptionList(
  field: RegistrationFieldDef | null,
  locale?: string | null,
): Array<{ id: string; title: string }> {
  const options = field?.options ?? []
  if (!options.length) return [{ id: '_', title: '—' }]
  return options.map((opt) => ({
    id: opt.value,
    title: (locale && opt.labels?.[locale]) || opt.label || opt.value,
  }))
}

function booleanOptions(locale?: string | null): Array<{ id: string; title: string }> {
  const lang = String(locale || 'fr').toLowerCase()
  const yes = lang.startsWith('en') ? 'Yes' : 'Oui'
  const no = lang.startsWith('en') ? 'No' : 'Non'
  return [
    { id: 'true', title: yes },
    { id: 'false', title: no },
  ]
}

function initString(value: unknown): string {
  if (value == null || value === false) return ''
  if (value === true) return 'true'
  if (Array.isArray(value)) return ''
  return String(value)
}

function initMulti(value: unknown): string[] {
  return asStringArray(value)
}

function initBoolean(value: unknown): string {
  if (value === true || value === 'true' || value === '1' || value === 'yes') return 'true'
  if (value === false || value === 'false' || value === '0' || value === 'no') return 'false'
  return ''
}

export function emptySlotFlowData(slot: number): Record<string, unknown> {
  return {
    [`slot_${slot}_show_short_text`]: false,
    [`slot_${slot}_show_long_text`]: false,
    [`slot_${slot}_show_date`]: false,
    [`slot_${slot}_show_time`]: false,
    [`slot_${slot}_show_select`]: false,
    [`slot_${slot}_show_multi_select`]: false,
    [`slot_${slot}_show_boolean`]: false,
    [`slot_${slot}_label`]: ' ',
    [`slot_${slot}_helper`]: ' ',
    [`slot_${slot}_init_short_text`]: '',
    [`slot_${slot}_init_long_text`]: '',
    [`slot_${slot}_init_date`]: '',
    [`slot_${slot}_init_time`]: '',
    [`slot_${slot}_init_select`]: '',
    [`slot_${slot}_init_multi_select`]: [],
    [`slot_${slot}_init_boolean`]: '',
    [`slot_${slot}_select_options`]: [{ id: '_', title: '—' }],
    [`slot_${slot}_multi_options`]: [{ id: '_', title: '—' }],
    [`slot_${slot}_boolean_options`]: booleanOptions('fr'),
  }
}

export function buildSlotFlowData(input: {
  slot: number
  field: RegistrationFieldDef | null
  value?: unknown
  helper?: string
  locale?: string | null
}): Record<string, unknown> {
  const base = emptySlotFlowData(input.slot)
  const field = input.field
  if (!field) return base
  const variant = fieldTypeToVariant(field.type)
  const label = markedRequiredLabel(fieldLabel(field, input.locale || undefined), field.required)
  return {
    ...base,
    [`slot_${input.slot}_show_${variant}`]: true,
    [`slot_${input.slot}_label`]: label,
    [`slot_${input.slot}_helper`]: (input.helper || ' ').trim() || ' ',
    [`slot_${input.slot}_init_short_text`]: variant === 'short_text' ? initString(input.value) : '',
    [`slot_${input.slot}_init_long_text`]: variant === 'long_text' ? initString(input.value) : '',
    [`slot_${input.slot}_init_date`]: variant === 'date' ? initString(input.value) : '',
    [`slot_${input.slot}_init_time`]: variant === 'time' ? initString(input.value) : '',
    [`slot_${input.slot}_init_select`]: variant === 'select' ? initString(input.value) : '',
    [`slot_${input.slot}_init_multi_select`]: variant === 'multi_select' ? initMulti(input.value) : [],
    [`slot_${input.slot}_init_boolean`]: variant === 'boolean' ? initBoolean(input.value) : '',
    [`slot_${input.slot}_select_options`]: flowOptionList(field, input.locale),
    [`slot_${input.slot}_multi_options`]: flowOptionList(field, input.locale),
    [`slot_${input.slot}_boolean_options`]: booleanOptions(input.locale),
  }
}

export function splitSlotAnswersByKind(
  fields: RegistrationFieldDef[],
  answers: Record<string, unknown>,
): { custom: Record<string, unknown>; builtins: Record<string, unknown> } {
  const custom: Record<string, unknown> = {}
  const builtins: Record<string, unknown> = {}
  for (const field of fields) {
    if (!(field.id in answers) && !(field.key in answers)) continue
    const value = answers[field.id] ?? answers[field.key]
    if (field.kind === 'builtin' && field.binding) {
      builtins[field.binding] = value
    } else {
      custom[field.id] = value
    }
  }
  return { custom, builtins }
}

export function reconstructSlotMapping(input: {
  schema: RegistrationFormSchema
  scope: RegistrationFieldScope
  page: RegistrationFlowSlotPage
}): Array<{ slot: number; field: RegistrationFieldDef | null }> {
  return slotBindingsForPage(dynamicFlowFieldsForScope(input.schema, input.scope), input.page)
}
