import apiClient from './apiClient';

function resolveApiOrigin(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return 'https://dev.sojori.com';
  const normalized = configured.replace(/\/+$/, '');
  if (
    normalized === 'http://localhost' ||
    normalized === 'http://127.0.0.1' ||
    normalized === 'https://localhost'
  ) {
    return 'https://dev.sojori.com';
  }
  return normalized;
}

const BASE = `${resolveApiOrigin()}/api/v1/admin/channels-dashboard`;

export interface RuOwnerProperty {
  ruPropertyId: number;
  name: string;
  alreadyImported?: boolean;
  sojoriListingId?: string;
}

export interface RuImportBatchResult {
  success?: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results?: Array<{
    ruPropertyId: number;
    success: boolean;
    listingId?: string;
    calendarEntriesUpdated?: number;
    errors?: string[];
  }>;
}

export function fetchRuOwnerProperties(ownerId: string) {
  return apiClient.post(
    `${BASE}/ru-import/list-owner-properties`,
    { ownerId },
    { timeout: 120_000 },
  );
}

export function importRuProperty(params: {
  ownerId: string;
  ruPropertyId: number;
  cityId: string;
  correlationId: string;
}) {
  return apiClient.post(`${BASE}/ru-import/import`, params, { timeout: 300_000 });
}

export function importRuPropertyBatch(params: {
  ownerId: string;
  cityId: string;
  ruPropertyIds: number[];
  correlationId: string;
}) {
  return apiClient.post(`${BASE}/ru-import/import-batch`, params, { timeout: 600_000 });
}

export function fetchRuImportProgress(correlationId: string) {
  return apiClient.get(`${BASE}/ru-import/progress/${encodeURIComponent(correlationId)}`, {
    timeout: 15_000,
  });
}
