import type { BuiltinBinding } from './types'

function pick(m: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = m[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function hasPassportPhoto(m: Record<string, unknown>): boolean {
  return Boolean(
    pick(m, 'document_front_download', 'document_front_scan', 'passport_photo', 'photo_url'),
  )
}

export function memberFieldValue(
  member: Record<string, unknown> | null | undefined,
  key: BuiltinBinding,
): string {
  const m = member || {}
  switch (key) {
    case 'first_name':
      return pick(m, 'first_name', 'firstName')
    case 'last_name':
      return pick(m, 'last_name', 'lastName')
    case 'birth_date':
      return pick(m, 'birth_date', 'date_of_birth', 'birthDate')
    case 'place_of_birth':
      return pick(m, 'place_of_birth', 'birth_place')
    case 'nationality':
      return pick(m, 'nationality')
    case 'document_number':
      return pick(m, 'document_number', 'passport')
    case 'document_issued_at':
      return pick(m, 'document_issued_at', 'issued_at')
    case 'document_issued_on':
      return pick(m, 'document_issued_on', 'issued_on')
    case 'document_expiry_date':
      return pick(m, 'document_expiry_date', 'expiry_date', 'document_expires_on')
    case 'document_type':
      return pick(m, 'document_type')
    case 'gender':
      return pick(m, 'gender')
    case 'issuing_country':
      return pick(m, 'issuing_country', 'document_issuing_country')
    case 'personal_number':
      return pick(m, 'personal_number', 'optional_data')
    case 'profession':
      return pick(m, 'profession', 'occupation')
    case 'domicile':
      return pick(m, 'domicile', 'address', 'habitual_address')
    case 'city':
      return pick(m, 'city', 'ville')
    case 'country':
      return pick(m, 'country', 'country_of_residence', 'residence_country')
    case 'coming_from':
      return pick(m, 'coming_from', 'provenance')
    case 'going_to':
      return pick(m, 'going_to', 'destination', 'allant')
    case 'email':
      return pick(m, 'email', 'guest_email')
    case 'phone':
      return pick(m, 'phone', 'telephone')
    case 'entry_number_morocco':
      return pick(m, 'entry_number_morocco', 'morocco_entry_number')
    case 'passport_photo':
      return hasPassportPhoto(m) ? 'ok' : ''
    case 'arrival_time':
      return pick(m, 'arrival_time', 'checkInTime', 'check_in_time')
    default:
      return ''
  }
}

export function stayFieldValue(
  stay: Record<string, unknown> | null | undefined,
  key: BuiltinBinding,
): string {
  const s = stay || {}
  if (key === 'arrival_time') {
    return pick(s, 'arrival_time', 'checkInTime', 'check_in_time', 'confirmedCheckInTime')
  }
  return memberFieldValue(s, key)
}

export function isAnswerFilled(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.some((v) => String(v ?? '').trim() !== '')
  return String(value).trim() !== ''
}

function asMap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return { ...(raw as Record<string, unknown>) }
}

export function emptyCustomAnswers(): { stay: Record<string, unknown>; travelers: Record<string, Record<string, unknown>> } {
  return { stay: {}, travelers: {} }
}

export function normalizeCustomAnswers(raw: unknown): {
  stay: Record<string, unknown>
  travelers: Record<string, Record<string, unknown>>
} {
  const root = asMap(raw)
  const stay = asMap(root.stay)
  const travelersRaw = asMap(root.travelers)
  const travelers: Record<string, Record<string, unknown>> = {}
  for (const [k, v] of Object.entries(travelersRaw)) {
    travelers[String(k)] = asMap(v)
  }
  return { stay, travelers }
}

/**
 * Merge incoming answers onto existing ones. Unknown keys are kept when the
 * form configuration later drops or renames fields.
 */
export function mergeCustomAnswers(
  existingRaw: unknown,
  patchRaw: unknown,
): {
  stay: Record<string, unknown>
  travelers: Record<string, Record<string, unknown>>
} {
  const existing = normalizeCustomAnswers(existingRaw)
  const patch = normalizeCustomAnswers(patchRaw)
  const stay = { ...existing.stay, ...patch.stay }
  const travelers = { ...existing.travelers }
  for (const [index, answers] of Object.entries(patch.travelers)) {
    travelers[index] = { ...(travelers[index] || {}), ...answers }
  }
  return { stay, travelers }
}

export function splitMemberPayload(input: Record<string, unknown>): {
  member: Record<string, unknown>
  travelerAnswers: Record<string, unknown>
  stayAnswers: Record<string, unknown>
} {
  const travelerAnswers = asMap(input.customAnswers ?? input._customAnswers)
  const stayAnswers = asMap(input.stayAnswers ?? input._stayAnswers)
  const member = { ...input }
  delete member.customAnswers
  delete member._customAnswers
  delete member.stayAnswers
  delete member._stayAnswers
  return { member, travelerAnswers, stayAnswers }
}
