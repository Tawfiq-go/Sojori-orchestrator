import { parseRegistrationFormSchema } from './normalize'
import type {
  EffectiveRegistrationForm,
  EffectiveRegistrationFormOrigin,
  RegistrationFormSchema,
  RegistrationLevel,
} from './types'

export interface RegistrationFormSnapshot {
  registrationInstanceId: string
  schemaFingerprint: string
  schema: RegistrationFormSchema
  origin: EffectiveRegistrationFormOrigin
  override: boolean
  registrationLevel: RegistrationLevel
  registrationFormVersion: number
  snapshotAt: string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

export function newRegistrationInstanceId(): string {
  return `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Stable fingerprint of the enabled form configuration (not guest answers). */
export function registrationSchemaFingerprint(schema: RegistrationFormSchema): string {
  const rows = schema.fields
    .map((f) =>
      [
        f.id,
        f.enabled === false ? 0 : 1,
        f.required ? 1 : 0,
        f.type,
        f.screen,
        f.valueSource,
        f.ocrProperty || '',
        f.scope,
      ].join(':'),
    )
    .sort()
  return `v${schema.version}|${rows.join('|')}`
}

export function buildRegistrationFormSnapshot(
  form: EffectiveRegistrationForm,
  instanceId?: string,
): RegistrationFormSnapshot {
  const parsed = parseRegistrationFormSchema(form.schema, { mode: 'migrate' })
  const schema = parsed.schema ?? form.schema
  return {
    registrationInstanceId: instanceId || newRegistrationInstanceId(),
    schemaFingerprint: registrationSchemaFingerprint(schema),
    schema,
    origin: form.origin,
    override: form.override,
    registrationLevel: form.registrationLevel,
    registrationFormVersion: schema.version,
    snapshotAt: new Date().toISOString(),
  }
}

export function parseRegistrationFormSnapshot(raw: unknown): RegistrationFormSnapshot | null {
  if (!isRecord(raw)) return null
  const parsed = parseRegistrationFormSchema(raw.schema, { mode: 'migrate' })
  if (!parsed.ok || !parsed.schema) return null
  const instanceId = String(raw.registrationInstanceId || '').trim()
  return {
    registrationInstanceId: instanceId,
    schemaFingerprint: String(raw.schemaFingerprint || registrationSchemaFingerprint(parsed.schema)),
    schema: parsed.schema,
    origin: (raw.origin as EffectiveRegistrationFormOrigin) || 'listing',
    override: raw.override === true,
    registrationLevel: raw.registrationLevel === 'complete' ? 'complete' : 'simple',
    registrationFormVersion: Number(raw.registrationFormVersion ?? parsed.schema.version) || parsed.schema.version,
    snapshotAt: String(raw.snapshotAt || ''),
  }
}

export function hasRegistrationProgress(input: {
  guests?: Array<{ done?: boolean } | null | undefined>
  members?: Array<Record<string, unknown> | null | undefined>
}): boolean {
  const guests = Array.isArray(input.guests) ? input.guests : []
  if (guests.some((g) => g && g.done === true)) return true
  const members = Array.isArray(input.members) ? input.members : []
  return members.some((m) => {
    if (!m || typeof m !== 'object') return false
    if (m.status === 'COMPLETE' && m.draft !== true) return true
    const first = String(m.first_name ?? m.firstName ?? '').trim()
    const last = String(m.last_name ?? m.lastName ?? '').trim()
    const doc = String(m.document_number ?? m.passport ?? '').trim()
    return Boolean(first || last || doc)
  })
}

/**
 * Keep the attempt snapshot while the same registration instance is in progress or completed.
 * Legacy cached listing overrides without an instance id are kept only when progress exists.
 */
export function shouldKeepRegistrationSnapshot(input: {
  cached?: unknown
  guests?: Array<{ done?: boolean } | null | undefined>
  members?: Array<Record<string, unknown> | null | undefined>
}): boolean {
  const snap = parseRegistrationFormSnapshot(input.cached)
  if (!snap?.schema?.fields?.length) return false
  if (snap.registrationInstanceId) return true
  return hasRegistrationProgress(input)
}

export function flowSessionIsStale(
  session: Record<string, unknown> | null | undefined,
  current: { registrationInstanceId?: string; schemaFingerprint?: string },
): boolean {
  const row = session && typeof session === 'object' ? session : {}
  const sid = String(row.registrationInstanceId || '').trim()
  const fp = String(row.schemaFingerprint || '').trim()
  const currentId = String(current.registrationInstanceId || '').trim()
  const currentFp = String(current.schemaFingerprint || '').trim()
  const hasDrafts = Boolean(
    row.registrationFormDrafts &&
      typeof row.registrationFormDrafts === 'object' &&
      Object.keys(row.registrationFormDrafts as object).length,
  )
  if (!sid && !fp && !hasDrafts) return false
  if (currentId && sid !== currentId) return true
  if (currentFp && fp && fp !== currentFp) return true
  return false
}

export function emptyRegistrationGuests(total: number): Array<{ index: number; done: false }> {
  const n = Math.max(1, Number(total) || 1)
  return Array.from({ length: n }, (_, i) => ({ index: i, done: false as const }))
}
