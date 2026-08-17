import { ALL_BUILTIN_BINDINGS, builtinField } from './builtinCatalog'
import { completePresetSchema, presetSchemaForLevel, simplePresetSchema } from './presets'
import type {
  BuiltinBinding,
  RegistrationFieldDef,
  RegistrationFieldKind,
  RegistrationFieldScope,
  RegistrationFieldType,
  RegistrationFormSchema,
  RegistrationFormSourceKind,
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

function normalizeField(raw: unknown, index: number, errors: string[]): RegistrationFieldDef | null {
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

  if (kind === 'builtin' && binding) {
    const base = builtinField(binding, {
      required: raw.required === true,
      enabled: raw.enabled !== false,
      order,
    })
    return {
      ...base,
      label: label || base.label,
      labels: asLabels(raw.labels),
      type: raw.type && FIELD_TYPES.includes(raw.type as RegistrationFieldType) ? type : base.type,
      scope: raw.scope && SCOPES.includes(raw.scope as RegistrationFieldScope) ? scope : base.scope,
      options: options ?? base.options,
      validation,
    }
  }

  return {
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
  }
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

export function parseRegistrationFormSchema(raw: unknown): SchemaValidationResult {
  if (raw == null) {
    return { ok: false, schema: null, errors: ['schema is required'] }
  }
  if (!isRecord(raw)) {
    return { ok: false, schema: null, errors: ['schema must be an object'] }
  }
  const errors: string[] = []
  const version = Number(raw.version ?? 1)
  if (version !== 1) errors.push('unsupported schema version')
  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : []
  if (fieldsRaw.length > MAX_FIELDS) errors.push(`at most ${MAX_FIELDS} fields`)
  const fields: RegistrationFieldDef[] = []
  const seen = new Set<string>()
  for (let i = 0; i < Math.min(fieldsRaw.length, MAX_FIELDS); i++) {
    const field = normalizeField(fieldsRaw[i], i, errors)
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
  const declared = SOURCES.includes(raw.source as RegistrationFormSourceKind)
    ? (raw.source as RegistrationFormSourceKind)
    : undefined
  const schema: RegistrationFormSchema = {
    version: 1,
    source: detectSource(fields, declared),
    fields,
  }
  return { ok: errors.length === 0, schema: errors.length === 0 ? schema : null, errors }
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
  return {
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
  }
}
