/** Dé-enveloppe les réponses API admin/fulltask → srv-fulltask. */
export function unwrapFulltaskData<T>(body: unknown): T | null {
  if (body == null || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (b.success === false) return null
  if ('data' in b && b.data != null && typeof b.data === 'object') {
    return b.data as T
  }
  return b as T
}

export function fulltaskEnvelope(body: unknown): {
  success: boolean
  data: unknown
} {
  const data = unwrapFulltaskData(body)
  const b = body as Record<string, unknown> | null
  return {
    success: b?.success === true || data != null,
    data: data ?? body,
  }
}
