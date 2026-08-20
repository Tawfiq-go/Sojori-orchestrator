import { enabledFields, fieldLabel } from './completeness'
import {
  passportDedicatedCanonicalFields,
  passportGenericEligibleFields,
  schemaFieldForCanonicalBinding,
} from './canonicalOcr'
import { PASSPORT_DEDICATED_OCR_PROPERTIES } from './builtinCatalog'
import type {
  RegistrationFieldDef,
  RegistrationFieldType,
  RegistrationFormSchema,
  RegistrationScreenPlacement,
} from './types'

/** Meta WhatsApp Flow limit — every component in the screen tree, including If branches. */
export const META_FLOW_MAX_COMPONENTS_PER_SCREEN = 50

/** Heading + caption + Form + Footer. Navigation title is the screen `title`, not a component. */
export const FLOW_SCREEN_CHROME_COST = 4

/** One If wrapper + one input. helper-text is an input property, not a component. */
export const FLOW_DEDICATED_FIELD_COST = 2

/** Typed reserved slot: If + one typed input (no helper If, no unused type variants). */
export const FLOW_TYPED_SLOT_COST = 2

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

export type SlotBank = Record<RegistrationFlowVariantType, number>

/**
 * Passport screen: 12 dedicated OCR properties + generic typed bank for custom/manual
 * fields placed on the passport screen.
 * 12*2 + 10*2 + 4 chrome = 48.
 */
export const PASSPORT_DEDICATED_PROPERTIES = [...PASSPORT_DEDICATED_OCR_PROPERTIES] as const

export const PASSPORT_GENERIC_SLOT_BANK: SlotBank = {
  short_text: 5,
  long_text: 1,
  date: 1,
  time: 1,
  select: 1,
  multi_select: 0,
  boolean: 1,
}

/**
 * Completion screen typed bank (traveler extras + last-traveler stay fields).
 * 22*2 + 4 chrome = 48.
 */
export const COMPLETION_SLOT_BANK: SlotBank = {
  short_text: 12,
  long_text: 2,
  date: 2,
  time: 2,
  select: 2,
  multi_select: 1,
  boolean: 1,
}

export type ScreenCapacityId = 'passport' | 'completion'

export interface TypedSlotAssignment {
  field: RegistrationFieldDef
  type: RegistrationFlowVariantType
  index: number
  name: string
}

export interface SlotAssignmentResult {
  ok: boolean
  assignments: TypedSlotAssignment[]
  errors: string[]
  overflowFieldId?: string
  overflowFieldLabel?: string
  overflowType?: RegistrationFlowVariantType
}

export interface ScreenCapacity {
  screen: ScreenCapacityId
  components: number
  max: number
  chrome: number
  dedicatedCount: number
  dedicatedCost: number
  genericCount: number
  genericCost: number
  remaining: number
  ok: boolean
  overflowFieldId?: string
  overflowFieldLabel?: string
}

export interface RegistrationCapacityReport {
  ok: boolean
  errors: string[]
  passport: ScreenCapacity
  completion: ScreenCapacity
}

const COUNTED_LAYOUT_TYPES = new Set([
  'If',
  'Switch',
  'Form',
  'TextHeading',
  'TextSubheading',
  'TextCaption',
  'TextBody',
  'TextInput',
  'TextArea',
  'DatePicker',
  'Dropdown',
  'CheckboxGroup',
  'RadioButtonsGroup',
  'OptIn',
  'Footer',
  'EmbeddedLink',
  'Image',
  'ImageCarousel',
  'PhotoPicker',
  'DocumentPicker',
  'CalendarPicker',
  'ChipsSelector',
])

export function fieldTypeToVariant(type: RegistrationFieldType): RegistrationFlowVariantType {
  if (REGISTRATION_FLOW_VARIANT_TYPES.includes(type as RegistrationFlowVariantType)) {
    return type as RegistrationFlowVariantType
  }
  return 'short_text'
}

export function isDedicatedPassportField(
  field: RegistrationFieldDef,
  schema?: RegistrationFormSchema,
): boolean {
  if (field.enabled === false) return false
  if (fieldScreen(field) !== 'passport') return false
  if (schema) {
    const prop = field.ocrProperty || field.binding
    if (!prop || !(PASSPORT_DEDICATED_PROPERTIES as readonly string[]).includes(prop)) {
      return field.kind === 'builtin' && Boolean(field.binding && (PASSPORT_DEDICATED_PROPERTIES as readonly string[]).includes(field.binding))
    }
    const owner = schemaFieldForCanonicalBinding(schema, prop)
    return owner?.id === field.id
  }
  if (field.kind !== 'builtin') return false
  const prop = field.ocrProperty || field.binding
  return Boolean(prop && (PASSPORT_DEDICATED_PROPERTIES as readonly string[]).includes(prop))
}

export function fieldScreen(field: RegistrationFieldDef): RegistrationScreenPlacement {
  if (field.binding === 'passport_photo' || field.screen === 'upload') return 'upload'
  if (field.valueSource === 'ocr') return 'passport'
  if (field.screen === 'passport' || field.screen === 'completion') {
    return field.screen
  }
  if (field.kind === 'builtin' && field.binding && (PASSPORT_DEDICATED_OCR_PROPERTIES as readonly string[]).includes(field.binding)) {
    return 'passport'
  }
  return 'completion'
}

export function slotPrefix(screen: ScreenCapacityId): string {
  return screen === 'passport' ? 'pg' : 'c'
}

export function typedSlotName(
  screen: ScreenCapacityId,
  type: RegistrationFlowVariantType,
  index: number,
): string {
  return `${slotPrefix(screen)}_${type}_${index}`
}

function bankKeys(bank: SlotBank): RegistrationFlowVariantType[] {
  return REGISTRATION_FLOW_VARIANT_TYPES.filter((t) => (bank[t] ?? 0) > 0)
}

export function assignFieldsToSlotBank(
  fields: RegistrationFieldDef[],
  bank: SlotBank,
  screen: ScreenCapacityId,
): SlotAssignmentResult {
  const used: SlotBank = {
    short_text: 0,
    long_text: 0,
    date: 0,
    time: 0,
    select: 0,
    multi_select: 0,
    boolean: 0,
  }
  const assignments: TypedSlotAssignment[] = []
  for (const field of fields) {
    const type = fieldTypeToVariant(field.type)
    const cap = bank[type] ?? 0
    if (used[type] >= cap) {
      const label = field.label || field.id
      return {
        ok: false,
        assignments,
        errors: [
          `Le champ « ${label} » (${type.replace('_', ' ')}) dépasse la capacité de l’écran ${
            screen === 'passport' ? 'passeport' : 'Compléter l’enregistrement'
          } (${used[type] + 1}/${cap || 0}).`,
        ],
        overflowFieldId: field.id,
        overflowFieldLabel: label,
        overflowType: type,
      }
    }
    used[type] += 1
    assignments.push({
      field,
      type,
      index: used[type],
      name: typedSlotName(screen, type, used[type]),
    })
  }
  return { ok: true, assignments, errors: [] }
}

export function passportDedicatedFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return passportDedicatedCanonicalFields(schema)
}

export function passportGenericFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return passportGenericEligibleFields(schema)
}

export function completionFields(
  schema: RegistrationFormSchema,
  opts?: { travelerIndex?: number; travelerCount?: number },
): RegistrationFieldDef[] {
  const all = enabledFields(schema).filter((f) => fieldScreen(f) === 'completion')
  const idx = opts?.travelerIndex
  const total = opts?.travelerCount
  if (idx == null || total == null) return all
  const last = total > 0 && idx === total - 1
  return all.filter((f) => (f.scope === 'per_stay' ? last : true))
}

export function completionFieldsForTraveler(
  schema: RegistrationFormSchema,
  travelerIndex: number,
  travelerCount: number,
): RegistrationFieldDef[] {
  return completionFields(schema, { travelerIndex, travelerCount })
}

function screenCapacityFromParts(
  screen: ScreenCapacityId,
  dedicatedCount: number,
  genericCount: number,
  overflow?: { overflowFieldId?: string; overflowFieldLabel?: string },
): ScreenCapacity {
  const dedicatedCost = dedicatedCount * FLOW_DEDICATED_FIELD_COST
  const genericCost = genericCount * FLOW_TYPED_SLOT_COST
  const components = FLOW_SCREEN_CHROME_COST + dedicatedCost + genericCost
  return {
    screen,
    components,
    max: META_FLOW_MAX_COMPONENTS_PER_SCREEN,
    chrome: FLOW_SCREEN_CHROME_COST,
    dedicatedCount,
    dedicatedCost,
    genericCount,
    genericCost,
    remaining: META_FLOW_MAX_COMPONENTS_PER_SCREEN - components,
    ok: components <= META_FLOW_MAX_COMPONENTS_PER_SCREEN && !overflow?.overflowFieldId,
    overflowFieldId: overflow?.overflowFieldId,
    overflowFieldLabel: overflow?.overflowFieldLabel,
  }
}

export function registrationCapacityReport(
  schema: RegistrationFormSchema,
): RegistrationCapacityReport {
  const errors: string[] = []
  const dedicated = passportDedicatedFields(schema)
  const passportGeneric = passportGenericFields(schema)
  const passportAssign = assignFieldsToSlotBank(passportGeneric, PASSPORT_GENERIC_SLOT_BANK, 'passport')
  if (!passportAssign.ok) errors.push(...passportAssign.errors)

  const completionAll = completionFields(schema)
  const completionAssign = assignFieldsToSlotBank(completionAll, COMPLETION_SLOT_BANK, 'completion')
  if (!completionAssign.ok) errors.push(...completionAssign.errors)

  const passport = screenCapacityFromParts(
    'passport',
    dedicated.length,
    passportAssign.ok ? passportAssign.assignments.length : passportGeneric.length,
    passportAssign.ok ? undefined : passportAssign,
  )
  const completion = screenCapacityFromParts(
    'completion',
    0,
    completionAssign.ok ? completionAssign.assignments.length : completionAll.length,
    completionAssign.ok ? undefined : completionAssign,
  )
  if (!passport.ok && passport.components > META_FLOW_MAX_COMPONENTS_PER_SCREEN) {
    errors.push(
      `Écran passeport: ${passport.components}/50 composants${
        passport.overflowFieldLabel ? ` (bloqué par « ${passport.overflowFieldLabel} »)` : ''
      }.`,
    )
  }
  if (!completion.ok && completion.components > META_FLOW_MAX_COMPONENTS_PER_SCREEN) {
    errors.push(
      `Compléter l’enregistrement: ${completion.components}/50 composants${
        completion.overflowFieldLabel ? ` (bloqué par « ${completion.overflowFieldLabel} »)` : ''
      }.`,
    )
  }
  return {
    ok: errors.length === 0 && passport.ok && completion.ok,
    errors,
    passport,
    completion,
  }
}

export function staticPassportScreenComponentCount(): number {
  return (
    FLOW_SCREEN_CHROME_COST +
    PASSPORT_DEDICATED_PROPERTIES.length * FLOW_DEDICATED_FIELD_COST +
    Object.values(PASSPORT_GENERIC_SLOT_BANK).reduce((a, n) => a + n, 0) * FLOW_TYPED_SLOT_COST
  )
}

export function staticCompletionScreenComponentCount(): number {
  return (
    FLOW_SCREEN_CHROME_COST +
    Object.values(COMPLETION_SLOT_BANK).reduce((a, n) => a + n, 0) * FLOW_TYPED_SLOT_COST
  )
}

export function countFlowScreenComponents(layout: unknown): number {
  let count = 0
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (typeof o.type === 'string' && COUNTED_LAYOUT_TYPES.has(o.type)) count += 1
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') walk(v)
    }
  }
  walk(layout)
  return count
}

export function formatCapacityCounter(cap: ScreenCapacity): string {
  const screenLabel = cap.screen === 'passport' ? 'Écran passeport' : 'Compléter l’enregistrement'
  return `${screenLabel}: ${cap.components}/50 composants`
}

export function canAddFieldToSchema(
  schema: RegistrationFormSchema,
  field: RegistrationFieldDef,
): { ok: boolean; error?: string } {
  const next: RegistrationFormSchema = {
    ...schema,
    fields: [...schema.fields, { ...field, order: schema.fields.length }],
  }
  const report = registrationCapacityReport(next)
  if (report.ok) return { ok: true }
  return { ok: false, error: report.errors[0] || 'Capacité WhatsApp dépassée' }
}

export function fieldCost(field: RegistrationFieldDef): number {
  if (field.enabled === false) return 0
  if (field.binding === 'passport_photo') return 0
  return isDedicatedPassportField(field) ? FLOW_DEDICATED_FIELD_COST : FLOW_TYPED_SLOT_COST
}

export function overflowMessage(report: RegistrationCapacityReport): string {
  return report.errors.join(' ')
}

export function slotBankEntries(bank: SlotBank): Array<{ type: RegistrationFlowVariantType; count: number }> {
  return bankKeys(bank).map((type) => ({ type, count: bank[type] }))
}

export function capacityFieldHint(field: RegistrationFieldDef, locale?: string): string {
  const label = fieldLabel(field, locale)
  const screen = fieldScreen(field) === 'passport' ? 'passeport' : 'complétion'
  return `« ${label} » (${fieldTypeToVariant(field.type)}, écran ${screen})`
}
