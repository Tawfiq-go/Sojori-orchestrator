import {
  ALL_BUILTIN_BINDINGS,
  builtinField,
  defaultOcrPropertyForBinding,
  isPassportOcrProperty,
} from './builtinCatalog'
import { whatsAppFlowRenderCheck } from './flowSlots'
import {
  applyOcrBindingToField,
  coerceOcrFieldForMigrate,
  ocrCompatibilityErrors,
} from './ocrBinding'
import { completePresetSchema, presetSchemaForLevel, simplePresetSchema } from './presets'
import { defaultScreenForField, defaultValueSourceForField, effectiveOcrProperty } from './screens'
import type {
  BuiltinBinding,
  PassportOcrProperty,
  RegistrationFieldDef,
  RegistrationFieldKind,
  RegistrationFieldScope,
  RegistrationFieldType,
  RegistrationFormSchema,
  RegistrationFormSchemaVersion,
  RegistrationFormSourceKind,
  RegistrationScreenPlacement,
  RegistrationValueSource,
  SchemaValidationResult,
} from './types'

const FIELD_TYPES: RegistrationFieldType[] = [
  'short_text',
  'long_text',
  'date',
  'time',
  'select',
  'multi_select',
  'boolean',
]

const SCOPES: RegistrationFieldScope[] = ['per_stay', 'per_traveler']
const KINDS: RegistrationFieldKind[] = ['builtin', 'custom']
const SOURCES: RegistrationFormSourceKind[] = ['preset:simple', 'preset:complete', 'custom']
const SCREENS: RegistrationScreenPlacement[] = ['passport', 'completion', 'upload']
const VALUE_SOURCES: RegistrationValueSource[] = ['manual', 'ocr']
const MAX_FIELDS = 40
const MAX_OPTIONS = 30
const ID_RE = /^[a-z][a-z0-9_]{0,47}$/
const CUSTOM_KEY_RE = /^[a-z][a-z0-9_]{1,47}$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function str(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v).trim()
}

function asLabels(raw: unknown): Record<string, string> | undefined {
  if (!isRecord(raw)) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const label = str(v)
    if (k && label) out[k] = label.slice(0, 160)
  }
  return Object.keys(out).length ? out : undefined
}

export function normalizeRegistrationLevel(raw: unknown): 'simple' | 'complete' {
  return String(raw || '').trim().toLowerCase() === 'complete' ? 'complete' : 'simple'
}

function normalizeScreen(
  raw: unknown,
  fallback: RegistrationScreenPlacement,
): RegistrationScreenPlacement {
  return SCREENS.includes(raw as RegistrationScreenPlacement)
    ? (raw as RegistrationScreenPlacement)
    : fallback
}

export type ParseRegistrationFormMode = 'strict' | 'migrate'

function normalizeField(
  raw: unknown,
  index: number,
  errors: string[],
  mode: ParseRegistrationFormMode,
): RegistrationFieldDef | null {
  if (!isRecord(raw)) {
    errors.push(`fields[${index}] must be an object`)
    return null
  }
  const kind: RegistrationFieldKind = KINDS.includes(raw.kind as RegistrationFieldKind)
    ? (raw.kind as RegistrationFieldKind)
    : raw.binding
      ? 'builtin'
      : 'custom'
  const type: RegistrationFieldType = FIELD_TYPES.includes(raw.type as RegistrationFieldType)
    ? (raw.type as RegistrationFieldType)
    : 'short_text'
  const scope: RegistrationFieldScope = SCOPES.includes(raw.scope as RegistrationFieldScope)
    ? (raw.scope as RegistrationFieldScope)
    : 'per_traveler'
  const id = str(raw.id || raw.key)
  if (!id || !ID_RE.test(id)) {
    errors.push(`fields[${index}].id is invalid`)
    return null
  }
  const key = str(raw.key, id)
  if (kind === 'custom' && !CUSTOM_KEY_RE.test(key)) {
    errors.push(`fields[${index}].key is invalid`)
    return null
  }
  const binding = kind === 'builtin' ? (str(raw.binding, id) as BuiltinBinding) : undefined
  if (kind === 'builtin' && (!binding || !ALL_BUILTIN_BINDINGS.includes(binding))) {
    errors.push(`fields[${index}].binding is not a known builtin`)
    return null
  }
  const label = str(raw.label) || (binding ? '' : key) || key
  const optionsRaw = Array.isArray(raw.options) ? raw.options : []
  if (optionsRaw.length > MAX_OPTIONS) {
    errors.push(`fields[${index}] has too many options`)
  }
  const options =
    type === 'select' || type === 'multi_select'
      ? optionsRaw.slice(0, MAX_OPTIONS).flatMap((opt, oi) => {
          if (!isRecord(opt)) return []
          const value = str(opt.value)
          const optLabel = str(opt.label, value)
          if (!value) {
            errors.push(`fields[${index}].options[${oi}].value required`)
            return []
          }
          return [{ value: value.slice(0, 80), label: optLabel.slice(0, 120), labels: asLabels(opt.labels) }]
        })
      : undefined

  const validation = isRecord(raw.validation)
    ? {
        minLength: typeof raw.validation.minLength === 'number' ? raw.validation.minLength : undefined,
        maxLength: typeof raw.validation.maxLength === 'number' ? raw.validation.maxLength : undefined,
        pattern: typeof raw.validation.pattern === 'string' ? raw.validation.pattern.slice(0, 200) : undefined,
        min: typeof raw.validation.min === 'string' ? raw.validation.min : undefined,
        max: typeof raw.validation.max === 'string' ? raw.validation.max : undefined,
      }
    : undefined

  const order = Number.isFinite(Number(raw.order)) ? Number(raw.order) : index
  const helperText = str(raw.helperText) || undefined

  let ocrProperty: PassportOcrProperty | undefined
  if (raw.ocrProperty != null && str(raw.ocrProperty)) {
    if (!isPassportOcrProperty(str(raw.ocrProperty))) {
      errors.push(`fields[${index}].ocrProperty is not a supported passport/OCR field`)
    } else {
      ocrProperty = str(raw.ocrProperty) as PassportOcrProperty
    }
  }

  if (kind === 'builtin' && binding) {
    const base = builtinField(binding, {
      required: raw.required === true,
      enabled: raw.enabled !== false,
      order,
    })
    const valueSource: RegistrationValueSource = VALUE_SOURCES.includes(raw.valueSource as RegistrationValueSource)
      ? (raw.valueSource as RegistrationValueSource)
      : defaultValueSourceForField({ ...base, ocrProperty: ocrProperty ?? base.ocrProperty })
    const ownOcr = defaultOcrPropertyForBinding(binding)
    let resolvedOcr =
      valueSource === 'ocr' ? ocrProperty ?? effectiveOcrProperty({ ...base, valueSource, ocrProperty }) : undefined
    if (valueSource === 'ocr' && ownOcr) {
      if (resolvedOcr && resolvedOcr !== ownOcr) {
        const msg = `Le champ intégré « ${label || base.label} » doit rester lié à OCR « ${ownOcr} ».`
        if (mode === 'strict') errors.push(msg)
        resolvedOcr = ownOcr
      } else {
        resolvedOcr = ownOcr
      }
    }
    if (valueSource === 'ocr' && !resolvedOcr) {
      errors.push(`fields[${index}] OCR source requires a supported passport property`)
    }
    const screenFallback = defaultScreenForField({
      ...base,
      valueSource,
      ocrProperty: resolvedOcr,
    })
    const screen = normalizeScreen(raw.screen, screenFallback)
    let field: RegistrationFieldDef = {
      ...base,
      label: label || base.label,
      labels: asLabels(raw.labels),
      type: raw.type && FIELD_TYPES.includes(raw.type as RegistrationFieldType) ? type : base.type,
      scope: raw.scope && SCOPES.includes(raw.scope as RegistrationFieldScope) ? scope : base.scope,
      options: options ?? base.options,
      validation,
      screen: binding === 'passport_photo' ? 'upload' : screen === 'upload' ? base.screen : screen,
      valueSource,
      ocrProperty: valueSource === 'ocr' ? resolvedOcr : undefined,
      helperText: helperText ?? base.helperText,
    }
    if (field.valueSource === 'ocr' && field.ocrProperty) {
      if (mode === 'migrate') {
        field = coerceOcrFieldForMigrate(field)
      } else {
        const mismatch = ocrCompatibilityErrors(field)
        errors.push(...mismatch)
        field = {
          ...field,
          screen: field.binding === 'passport_photo' ? 'upload' : 'passport',
        }
      }
    }
    return field
  }

  const valueSource: RegistrationValueSource = VALUE_SOURCES.includes(raw.valueSource as RegistrationValueSource)
    ? (raw.valueSource as RegistrationValueSource)
    : ocrProperty
      ? 'ocr'
      : 'manual'
  if (valueSource === 'ocr' && !ocrProperty) {
    errors.push(`fields[${index}] custom OCR field must bind to a supported passport property`)
  }
  const screenFallback = valueSource === 'ocr' ? 'passport' : 'completion'
  const screen = normalizeScreen(raw.screen, screenFallback)
  if (screen === 'upload') {
    errors.push(`fields[${index}] only passport_photo may use the upload screen`)
  }

  let field: RegistrationFieldDef = {
    id,
    key,
    kind: 'custom',
    type,
    label: label.slice(0, 160),
    labels: asLabels(raw.labels),
    required: raw.required === true,
    enabled: raw.enabled !== false,
    order,
    scope,
    options,
    validation,
    screen: screen === 'upload' ? 'completion' : screen,
    valueSource: valueSource === 'ocr' && ocrProperty ? 'ocr' : 'manual',
    ocrProperty: valueSource === 'ocr' ? ocrProperty : undefined,
    helperText,
  }
  if (field.valueSource === 'ocr' && field.ocrProperty) {
    if (mode === 'migrate') {
      field = coerceOcrFieldForMigrate(field)
    } else {
      errors.push(...ocrCompatibilityErrors(field))
      field = { ...field, screen: 'passport' }
    }
  }
  return field
}

function detectSource(fields: RegistrationFieldDef[], declared?: RegistrationFormSourceKind): RegistrationFormSourceKind {
  if (declared === 'custom') return 'custom'
  const enabledCustom = fields.some((f) => f.enabled !== false && f.kind === 'custom')
  if (enabledCustom) return 'custom'
  const fingerprint = (schema: RegistrationFormSchema) =>
    schema.fields
      .filter((f) => f.enabled !== false)
      .map((f) => `${f.id}:${f.required ? 1 : 0}:${f.scope}`)
      .sort()
      .join('|')
  const current = fingerprint({ version: 1, source: 'custom', fields })
  if (current === fingerprint(simplePresetSchema())) return 'preset:simple'
  if (current === fingerprint(completePresetSchema())) return 'preset:complete'
  if (declared && SOURCES.includes(declared)) return declared
  return 'custom'
}

function collectOcrBindingErrors(fields: RegistrationFieldDef[]): string[] {
  const errors: string[] = []
  const seen = new Map<string, string>()
  for (const field of fields) {
    if (field.enabled === false) continue
    if (defaultValueSourceForField(field) !== 'ocr') continue
    const prop = effectiveOcrProperty(field)
    if (!prop) continue
    const prev = seen.get(prop)
    if (prev) {
      errors.push(
        `Deux champs (« ${prev} » et « ${field.label || field.id} ») sont liés à la même propriété passeport « ${prop} ».`,
      )
    } else {
      seen.set(prop, field.label || field.id)
    }
  }
  return errors
}

export function parseRegistrationFormSchema(
  raw: unknown,
  options?: { mode?: ParseRegistrationFormMode },
): SchemaValidationResult {
  const mode: ParseRegistrationFormMode = options?.mode === 'strict' ? 'strict' : 'migrate'
  if (raw == null) {
    return { ok: false, schema: null, errors: ['schema is required'] }
  }
  if (!isRecord(raw)) {
    return { ok: false, schema: null, errors: ['schema must be an object'] }
  }
  const errors: string[] = []
  const versionNum = Number(raw.version ?? 1)
  if (versionNum !== 1 && versionNum !== 2) errors.push('unsupported schema version')
  const version: RegistrationFormSchemaVersion = versionNum === 2 ? 2 : 1
  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : []
  if (fieldsRaw.length > MAX_FIELDS) errors.push(`at most ${MAX_FIELDS} fields`)
  const fields: RegistrationFieldDef[] = []
  const seen = new Set<string>()
  for (let i = 0; i < Math.min(fieldsRaw.length, MAX_FIELDS); i++) {
    const field = normalizeField(fieldsRaw[i], i, errors, mode)
    if (!field) continue
    if (seen.has(field.id)) {
      errors.push(`duplicate field id ${field.id}`)
      continue
    }
    seen.add(field.id)
    fields.push(field)
  }
  fields.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  fields.forEach((f, i) => {
    f.order = i
  })
  errors.push(...collectOcrBindingErrors(fields))
  const declared = SOURCES.includes(raw.source as RegistrationFormSourceKind)
    ? (raw.source as RegistrationFormSourceKind)
    : undefined
  const schema: RegistrationFormSchema = {
    version,
    source: detectSource(fields, declared),
    fields,
  }
  const flowCheck = whatsAppFlowRenderCheck(schema)
  if (!flowCheck.ok) errors.push(...flowCheck.errors)
  return { ok: errors.length === 0, schema: errors.length === 0 ? schema : null, errors }
}

export function parseRegistrationFormSchemaStrict(raw: unknown): SchemaValidationResult {
  return parseRegistrationFormSchema(raw, { mode: 'strict' })
}

export function schemaFromGestion(gestion: Record<string, unknown> | null | undefined): RegistrationFormSchema | null {
  if (!gestion) return null
  const parsed = parseRegistrationFormSchema(gestion.registrationFormSchema)
  return parsed.ok ? parsed.schema : null
}

export function schemaFromLegacyLevel(rawLevel: unknown): RegistrationFormSchema {
  return presetSchemaForLevel(normalizeRegistrationLevel(rawLevel))
}

export function newCustomField(partial?: Partial<RegistrationFieldDef>): RegistrationFieldDef {
  const nonce = Math.random().toString(36).slice(2, 10)
  const id = str(partial?.id) || `c_${nonce}`
  const key = str(partial?.key) || id
  const valueSource: RegistrationValueSource =
    partial?.valueSource === 'ocr' && isPassportOcrProperty(partial.ocrProperty || '')
      ? 'ocr'
      : 'manual'
  const base: RegistrationFieldDef = {
    id,
    key,
    kind: 'custom',
    type: partial?.type && FIELD_TYPES.includes(partial.type) ? partial.type : 'short_text',
    label: str(partial?.label, 'Nouvelle question') || 'Nouvelle question',
    labels: partial?.labels,
    required: partial?.required === true,
    enabled: partial?.enabled !== false,
    order: Number.isFinite(Number(partial?.order)) ? Number(partial?.order) : 99,
    scope: partial?.scope === 'per_stay' ? 'per_stay' : 'per_traveler',
    options: partial?.options,
    validation: partial?.validation,
    screen: partial?.screen === 'passport' ? 'passport' : 'completion',
    valueSource,
    ocrProperty: valueSource === 'ocr' ? partial?.ocrProperty : undefined,
    helperText: partial?.helperText,
  }
  if (valueSource === 'ocr' && base.ocrProperty) {
    return applyOcrBindingToField(base, base.ocrProperty).field
  }
  return base
}
