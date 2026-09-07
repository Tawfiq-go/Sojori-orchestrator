import { enabledFields, fieldLabel } from './completeness'
import { DEFAULT_OPTIONAL_FIELD_HELPERS } from './presets'
import {
  COMPLETION_SLOT_BANK,
  PASSPORT_DEDICATED_PROPERTIES,
  PASSPORT_GENERIC_SLOT_BANK,
  REGISTRATION_FLOW_VARIANT_TYPES,
  assignFieldsToSlotBank,
  completionFields,
  completionFieldsForTraveler,
  fieldScreen,
  fieldTypeToVariant,
  passportGenericFields,
  registrationCapacityReport,
  typedSlotName,
  type RegistrationFlowVariantType,
  type ScreenCapacityId,
  type SlotBank,
  type TypedSlotAssignment,
} from './componentBudget'
import { effectiveOcrProperty } from './screens'
import type {
  RegistrationFieldDef,
  RegistrationFieldScope,
  RegistrationFieldType,
  RegistrationFormSchema,
} from './types'

/** @deprecated Use typed slot banks + component budget. Kept as the completion short_text bank size. */
export const REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT = COMPLETION_SLOT_BANK.short_text

/** @deprecated Two information screens; leftover stay uses STAY_COMPLETE. */
export const REGISTRATION_FLOW_SLOTS_PER_PAGE = COMPLETION_SLOT_BANK.short_text

export type { RegistrationFlowVariantType }

/**
 * Dedicated passport/OCR properties collected on FORM (not generic slots).
 */
export const REGISTRATION_FLOW_STATIC_BINDINGS = [
  'document_type',
  'first_name',
  'last_name',
  'birth_date',
  'place_of_birth',
  'nationality',
  'document_number',
  'document_issued_at',
  'document_issued_on',
  'issuing_country',
  'gender',
  'document_expiry_date',
  'passport_photo',
] as const

export type RegistrationFlowCustomScreenId = 'COMPLETE' | 'STAY_COMPLETE'

export type RegistrationFlowSlotPage = 'A' | 'B'

export interface RegistrationFlowSlotBinding {
  slot: number
  field: RegistrationFieldDef
}

export interface WhatsAppFlowRenderCheck {
  ok: boolean
  errors: string[]
  dynamicCount: number
  passportComponents: number
  completionComponents: number
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function requiresDynamicFlowSlot(field: RegistrationFieldDef): boolean {
  if (field.enabled === false) return false
  if (field.binding === 'passport_photo') return false
  if (fieldScreen(field) === 'upload') return false
  const dedicatedProp = effectiveOcrProperty(field)
  if (
    dedicatedProp &&
    (PASSPORT_DEDICATED_PROPERTIES as readonly string[]).includes(dedicatedProp)
  ) {
    return false
  }
  if (
    field.kind === 'builtin' &&
    fieldScreen(field) === 'passport' &&
    (REGISTRATION_FLOW_STATIC_BINDINGS as readonly string[]).includes(field.binding || '')
  ) {
    return false
  }
  return fieldScreen(field) === 'passport' || fieldScreen(field) === 'completion'
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
  const trial: RegistrationFieldDef = {
    id: `__trial_${schema.fields.length}`,
    key: `__trial_${schema.fields.length}`,
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
  return registrationCapacityReport({
    ...schema,
    fields: [...schema.fields, trial],
  }).ok
}

export function whatsAppFlowRenderCheck(schema: RegistrationFormSchema): WhatsAppFlowRenderCheck {
  const report = registrationCapacityReport(schema)
  const fields = dynamicFlowFields(schema)
  const errors = [...report.errors]
  for (const field of fields) {
    if (!REGISTRATION_FLOW_VARIANT_TYPES.includes(field.type as RegistrationFlowVariantType)) {
      errors.push(`unsupported Flow field type ${field.type} on ${field.id}`)
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    dynamicCount: fields.length,
    passportComponents: report.passport.components,
    completionComponents: report.completion.components,
  }
}

export function canRenderInWhatsAppFlow(schema: RegistrationFormSchema): boolean {
  return whatsAppFlowRenderCheck(schema).ok
}

export function slotNumbersForPage(page: RegistrationFlowSlotPage): number[] {
  const start = page === 'A' ? 1 : 6
  return Array.from({ length: 5 }, (_, i) => start + i)
}

export function pageForSlot(slot: number): RegistrationFlowSlotPage {
  return slot <= 5 ? 'A' : 'B'
}

export function customScreenIdFor(
  scope: RegistrationFieldScope,
  _page?: RegistrationFlowSlotPage,
): RegistrationFlowCustomScreenId {
  return scope === 'per_stay' ? 'STAY_COMPLETE' : 'COMPLETE'
}

export function scopeAndPageFromScreen(
  screen: string,
): { scope: RegistrationFieldScope; page: RegistrationFlowSlotPage } | null {
  if (screen === 'COMPLETE' || screen === 'CUSTOM_FIELDS_A' || screen === 'CUSTOM_FIELDS_B') {
    return { scope: 'per_traveler', page: 'A' }
  }
  if (screen === 'STAY_COMPLETE' || screen === 'STAY_FIELDS_A' || screen === 'STAY_FIELDS_B') {
    return { scope: 'per_stay', page: 'A' }
  }
  return null
}

export function isRegistrationCustomScreen(screen: string): screen is RegistrationFlowCustomScreenId {
  return screen === 'COMPLETE' || screen === 'STAY_COMPLETE'
}

export function slotBindingsForPage(
  fields: RegistrationFieldDef[],
  page: RegistrationFlowSlotPage,
): Array<{ slot: number; field: RegistrationFieldDef | null }> {
  const offset = page === 'A' ? 0 : 5
  return slotNumbersForPage(page).map((slot, i) => ({
    slot,
    field: fields[offset + i] ?? null,
  }))
}

export function nextCustomScreen(
  _scope: RegistrationFieldScope,
  _page: RegistrationFlowSlotPage,
  _fieldCount: number,
): RegistrationFlowCustomScreenId | null {
  return null
}

export { fieldTypeToVariant }

export function markedRequiredLabel(label: string, required: boolean): string {
  const trimmed = label.trim() || ' '
  if (/\(\s*optional\s*\)/i.test(trimmed) && required) {
    return trimmed.replace(/\(\s*optional\s*\)/gi, '').trim()
  }
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
  slotNameOrNumber: number | string,
  data: Record<string, unknown>,
): unknown {
  const variant = fieldTypeToVariant(field.type)
  if (typeof slotNameOrNumber === 'string') {
    return data[slotNameOrNumber] ?? data[`${slotNameOrNumber}_${variant}`]
  }
  const key = `slot_${slotNameOrNumber}_${variant}`
  return data[key]
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

function timeHelper(locale?: string | null): string {
  return String(locale || '').toLowerCase().startsWith('en')
    ? 'Use HH:MM (24h).'
    : 'Format HH:MM (24h).'
}

export function emptyTypedSlotFlowData(
  screen: ScreenCapacityId,
  type: RegistrationFlowVariantType,
  index: number,
  locale?: string | null,
): Record<string, unknown> {
  const name = typedSlotName(screen, type, index)
  const init: unknown = type === 'multi_select' ? [] : ''
  return {
    [`${name}_visible`]: false,
    [`${name}_required`]: false,
    [`${name}_label`]: ' ',
    [`${name}_helper`]: ' ',
    [`${name}_init`]: init,
    [`${name}_options`]: type === 'boolean' ? booleanOptions(locale) : [{ id: '_', title: '—' }],
  }
}

export function buildTypedSlotFlowData(input: {
  assignment: TypedSlotAssignment
  screen: ScreenCapacityId
  value?: unknown
  helper?: string
  locale?: string | null
}): Record<string, unknown> {
  const { assignment, screen } = input
  const name = assignment.name
  const field = assignment.field
  const required = field.required === true
  const label = markedRequiredLabel(fieldLabel(field, input.locale || undefined), required)
  const helper =
    (
      input.helper ||
      field.helperText ||
      (!required ? DEFAULT_OPTIONAL_FIELD_HELPERS[field.binding || field.id] : '') ||
      (assignment.type === 'time' ? timeHelper(input.locale) : '')
    ).trim() || ' '
  const init =
    assignment.type === 'multi_select'
      ? initMulti(input.value)
      : assignment.type === 'boolean'
        ? initBoolean(input.value)
        : initString(input.value)
  return {
    [`${name}_visible`]: true,
    [`${name}_required`]: required,
    [`${name}_label`]: label,
    [`${name}_helper`]: helper,
    [`${name}_init`]: init,
    [`${name}_options`]:
      assignment.type === 'boolean'
        ? booleanOptions(input.locale)
        : flowOptionList(field, input.locale),
  }
}

export function emptyBankFlowData(screen: ScreenCapacityId, bank: SlotBank, locale?: string | null): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [type, count] of Object.entries(bank) as Array<[RegistrationFlowVariantType, number]>) {
    for (let i = 1; i <= count; i++) {
      Object.assign(data, emptyTypedSlotFlowData(screen, type, i, locale))
    }
  }
  return data
}

export function buildBankFlowData(input: {
  screen: ScreenCapacityId
  bank: SlotBank
  assignments: TypedSlotAssignment[]
  values?: Record<string, unknown>
  helpers?: Record<string, string>
  locale?: string | null
}): Record<string, unknown> {
  const data = emptyBankFlowData(input.screen, input.bank, input.locale)
  for (const assignment of input.assignments) {
    const value =
      input.values?.[assignment.field.id] ??
      (assignment.field.key ? input.values?.[assignment.field.key] : undefined)
    Object.assign(
      data,
      buildTypedSlotFlowData({
        assignment,
        screen: input.screen,
        value,
        helper: input.helpers?.[assignment.field.id],
        locale: input.locale,
      }),
    )
  }
  return data
}

export function mapTypedSlotAnswers(input: {
  assignments: TypedSlotAssignment[]
  data: Record<string, unknown>
}): {
  ok: boolean
  answers: Record<string, unknown>
  errors: Array<{ name: string; fieldId: string; error: string }>
} {
  const answers: Record<string, unknown> = {}
  const errors: Array<{ name: string; fieldId: string; error: string }> = []
  for (const assignment of input.assignments) {
    const raw = input.data[assignment.name]
    const checked = coerceAndValidateFlowAnswer(assignment.field, raw)
    if (!checked.ok) {
      errors.push({ name: assignment.name, fieldId: assignment.field.id, error: checked.error })
      continue
    }
    answers[assignment.field.id] = checked.value
    if (assignment.field.key && assignment.field.key !== assignment.field.id) {
      answers[assignment.field.key] = checked.value
    }
  }
  return { ok: errors.length === 0, answers, errors }
}

export function assignPassportGenericSlots(schema: RegistrationFormSchema): ReturnType<typeof assignFieldsToSlotBank> {
  return assignFieldsToSlotBank(passportGenericFields(schema), PASSPORT_GENERIC_SLOT_BANK, 'passport')
}

export function assignCompletionSlots(
  schema: RegistrationFormSchema,
  opts?: { travelerIndex?: number; travelerCount?: number; stayOnly?: boolean },
): ReturnType<typeof assignFieldsToSlotBank> {
  const fields = opts?.stayOnly
    ? completionFields(schema).filter((f) => f.scope === 'per_stay')
    : opts?.travelerIndex != null && opts.travelerCount != null
      ? completionFieldsForTraveler(schema, opts.travelerIndex, opts.travelerCount)
      : completionFields(schema)
  return assignFieldsToSlotBank(fields, COMPLETION_SLOT_BANK, 'completion')
}

/** Legacy page mapping used by older tests — maps typed assignments onto slot_N_* keys. */
export function emptySlotFlowData(slot: number): Record<string, unknown> {
  return {
    [`slot_${slot}_active`]: false,
    [`slot_${slot}_show_helper`]: false,
    [`slot_${slot}_show_short_text`]: false,
    [`slot_${slot}_show_long_text`]: false,
    [`slot_${slot}_show_date`]: false,
    [`slot_${slot}_show_time`]: false,
    [`slot_${slot}_show_select`]: false,
    [`slot_${slot}_show_multi_select`]: false,
    [`slot_${slot}_show_boolean`]: false,
    [`slot_${slot}_short_text_required`]: false,
    [`slot_${slot}_long_text_required`]: false,
    [`slot_${slot}_date_required`]: false,
    [`slot_${slot}_time_required`]: false,
    [`slot_${slot}_select_required`]: false,
    [`slot_${slot}_multi_select_required`]: false,
    [`slot_${slot}_boolean_required`]: false,
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
  const required = field.required === true
  const label = markedRequiredLabel(fieldLabel(field, input.locale || undefined), required)
  const helper = (
    input.helper ||
    field.helperText ||
    (!required ? DEFAULT_OPTIONAL_FIELD_HELPERS[field.binding || field.id] : '') ||
    (variant === 'time' ? timeHelper(input.locale) : '')
  ).trim()
  return {
    ...base,
    [`slot_${input.slot}_active`]: true,
    [`slot_${input.slot}_show_helper`]: false,
    [`slot_${input.slot}_show_${variant}`]: true,
    [`slot_${input.slot}_${variant}_required`]: required,
    [`slot_${input.slot}_label`]: label,
    [`slot_${input.slot}_helper`]: helper || ' ',
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
    const variant = fieldTypeToVariant(field.type)
    const typedName = typedSlotName('completion', variant, slot)
    const raw = input.data[typedName] ?? extractActiveSlotRawValue(field, slot, input.data)
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
