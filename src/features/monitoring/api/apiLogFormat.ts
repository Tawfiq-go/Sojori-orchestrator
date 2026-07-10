export type ApiProblemType = 'api_slow' | 'api_error' | 'api_client_error'

export type ApiLogEntry = {
  logId?: string
  severity?: string
  message?: string
  timestamp?: string | Date
  ownerId?: string
  service?: string
  httpMethod?: string
  httpPath?: string
  httpUrl?: string
  durationMs?: number
  statusCode?: number
  problemType?: ApiProblemType | string
  failureClass?: 'transient' | 'persistent' | string
  correlationId?: string
}

const PROBLEM_LABELS: Record<string, string> = {
  api_slow: 'Lent (>2s)',
  api_error: 'Erreur 5xx',
  api_client_error: 'Erreur 4xx',
}

export function apiProblemLabel(type?: string): string {
  if (!type) return 'API'
  return PROBLEM_LABELS[type] || type
}

export function apiLogTitle(entry: ApiLogEntry): string {
  const method = entry.httpMethod || 'GET'
  const path = entry.httpPath || entry.httpUrl || entry.message || '—'
  const ms = entry.durationMs != null ? `${entry.durationMs}ms` : ''
  const status = entry.statusCode != null ? `HTTP ${entry.statusCode}` : ''
  return [method, path, ms, status].filter(Boolean).join(' · ')
}

export function apiLogContextLine(entry: ApiLogEntry): string {
  const parts: string[] = []
  if (entry.service) parts.push(entry.service)
  if (entry.httpUrl && entry.httpUrl !== entry.httpPath) parts.push(entry.httpUrl)
  if (entry.correlationId) parts.push(`corr ${entry.correlationId.slice(0, 12)}`)
  return parts.join(' · ')
}

export function failureClassLabel(value?: string): string {
  if (value === 'persistent') return 'Permanent'
  if (value === 'transient') return 'Temporaire'
  return value || '—'
}
