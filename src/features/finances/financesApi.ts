import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import { isAxiosError } from 'axios';
import type {
  ExpenseCategory,
  LedgerEntry,
  ProfitReport,
  ProfitReportHeader,
  RecurringTemplate,
} from './types';

/** Même base que listing / user — pas de chemin relatif proxy-only en DEV. */
const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/fulltask`;

type ApiList<T> = { success?: boolean; data?: T; error?: string; message?: string };

type OwnerScope = { ownerId?: string | null };

function withOwnerParams(
  params: Record<string, string | number | undefined> = {},
  scope?: OwnerScope,
): Record<string, string | number | undefined> {
  const out = { ...params };
  if (scope?.ownerId) out.ownerId = scope.ownerId;
  return out;
}

function throwApiError(e: unknown, fallback: string): never {
  if (isAxiosError(e)) {
    const body = e.response?.data as ApiList<unknown> | undefined;
    const msg = body?.error || body?.message;
    if (msg) throw new Error(String(msg));
    if (e.response?.status === 403) {
      throw new Error('Sélectionnez un propriétaire PM dans la barre du haut.');
    }
  }
  throw e instanceof Error ? e : new Error(fallback);
}

async function apiGet<T>(url: string, params?: Record<string, string | number | undefined>): Promise<T> {
  try {
    const { data } = await apiClient.get<ApiList<T>>(url, { params });
    if (data?.success === false) throw new Error(data.error || data.message || 'Request failed');
    return (data?.data ?? []) as T;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) {
      return [] as T;
    }
    if (isAxiosError(e) && e.response?.status === 500) {
      const body = e.response?.data as ApiList<unknown> | undefined;
      const msg = body?.error || body?.message;
      if (msg) throw new Error(String(msg));
    }
    throwApiError(e, 'Chargement impossible');
  }
}

export async function listExpenseCategories(scope?: OwnerScope): Promise<ExpenseCategory[]> {
  return apiGet(`${BASE}/expense-categories`, withOwnerParams({}, scope));
}

export async function listLedgerEntries(
  params: Record<string, string | number | undefined> = {},
  scope?: OwnerScope,
) {
  return apiGet<LedgerEntry[]>(`${BASE}/expenses`, withOwnerParams(params, scope));
}

export async function createLedgerEntry(body: Record<string, unknown>, scope?: OwnerScope) {
  try {
    const { data } = await apiClient.post<ApiList<LedgerEntry>>(`${BASE}/expenses`, body, {
      params: withOwnerParams({}, scope),
    });
    if (!data.success) throw new Error(data.error || data.message || 'Create expense failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Enregistrement impossible');
  }
}

export async function createLedgerBundle(body: Record<string, unknown>, scope?: OwnerScope) {
  try {
    const { data } = await apiClient.post<ApiList<unknown>>(`${BASE}/ledger/bundle`, body, {
      params: withOwnerParams({}, scope),
    });
    if (!data.success) throw new Error(data.error || data.message || 'Create bundle failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Création du service impossible');
  }
}

export async function patchLedgerEntry(
  id: string,
  body: Record<string, unknown>,
  scope?: OwnerScope,
) {
  try {
    const { data } = await apiClient.patch<ApiList<LedgerEntry>>(`${BASE}/expenses/${id}`, body, {
      params: withOwnerParams({}, scope),
    });
    if (!data.success) throw new Error(data.error || data.message || 'Update failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Mise à jour impossible');
  }
}

export async function deleteLedgerEntry(id: string, scope?: OwnerScope) {
  try {
    const { data } = await apiClient.delete<ApiList<LedgerEntry>>(`${BASE}/expenses/${id}`, {
      params: withOwnerParams({}, scope),
    });
    if (!data.success) throw new Error(data.error || data.message || 'Delete failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Suppression impossible');
  }
}

export async function listRecurringTemplates(scope?: OwnerScope): Promise<RecurringTemplate[]> {
  return apiGet(`${BASE}/expense-recurring`, withOwnerParams({}, scope));
}

export async function createRecurringTemplate(body: Record<string, unknown>, scope?: OwnerScope) {
  try {
    const { data } = await apiClient.post<ApiList<RecurringTemplate>>(`${BASE}/expense-recurring`, body, {
      params: withOwnerParams({}, scope),
    });
    if (!data.success) throw new Error(data.error || data.message || 'Create recurring failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Création de la récurrence impossible');
  }
}

export async function runDueRecurringTemplates(scope?: OwnerScope) {
  try {
    const { data } = await apiClient.post<ApiList<{ processed: number; created: number; realigned: number }>>(
      `${BASE}/expense-recurring/run-due`,
      {},
      { params: withOwnerParams({}, scope) },
    );
    if (!data.success) throw new Error(data.error || data.message || 'Run due failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Génération des échéances impossible');
  }
}

export async function generateRecurringNow(id: string, scope?: OwnerScope) {
  try {
    const { data } = await apiClient.post<ApiList<{ created: number }>>(
      `${BASE}/expense-recurring/${encodeURIComponent(id)}/generate-now`,
      {},
      { params: withOwnerParams({}, scope) },
    );
    if (!data.success) throw new Error(data.error || data.message || 'Generate failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Génération impossible');
  }
}

export async function listProfitReports(scope?: OwnerScope): Promise<ProfitReport[]> {
  return apiGet(`${BASE}/profit-reports`, withOwnerParams({}, scope));
}

export async function getProfitReport(id: string, scope?: OwnerScope): Promise<ProfitReport | null> {
  const { data } = await apiClient.get<ApiList<ProfitReport>>(`${BASE}/profit-reports/${id}`, {
    params: withOwnerParams({}, scope),
  });
  return data.data ?? null;
}

export async function generateProfitReport(
  body: Record<string, unknown>,
  scope?: OwnerScope,
) {
  const { data } = await apiClient.post<ApiList<ProfitReport>>(`${BASE}/profit-reports/generate`, body, {
    params: withOwnerParams({}, scope),
  });
  if (!data.success) throw new Error(data.error || 'Generate report failed');
  return data.data;
}

export async function publishProfitReport(id: string, scope?: OwnerScope) {
  const { data } = await apiClient.post<ApiList<ProfitReport>>(
    `${BASE}/profit-reports/${id}/publish`,
    {},
    { params: withOwnerParams({}, scope) },
  );
  if (!data.success) throw new Error(data.error || 'Publish failed');
  return data.data;
}

export async function fetchProfitReportHtml(id: string, scope?: OwnerScope): Promise<string> {
  try {
    const { data } = await apiClient.get<string>(`${BASE}/profit-reports/${id}/html`, {
      params: withOwnerParams({}, scope),
      responseType: 'text',
      transformResponse: [(r) => r],
    });
    const html = typeof data === 'string' ? data : String(data ?? '');
    const trimmed = html.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
        throw new Error(parsed.error || parsed.message || 'Erreur serveur HTML');
      } catch (e) {
        if (e instanceof SyntaxError) {
          /* pas du JSON valide */
        } else if (e instanceof Error) {
          throw e;
        }
      }
    }
    if (trimmed.startsWith('<')) return html;
    throw new Error('Réponse HTML invalide');
  } catch (e) {
    throwApiError(e, 'Impossible de charger le HTML du rapport');
  }
}

export async function fetchProfitReportReservations(params: {
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  listingIds?: string[];
}): Promise<Array<Record<string, unknown>>> {
  const qs = new URLSearchParams({
    ownerId: params.ownerId,
    startDate: params.periodStart.slice(0, 10),
    endDate: params.periodEnd.slice(0, 10),
  });
  if (params.listingIds?.length) qs.set('listingIds', params.listingIds.join(','));
  const url = `${MICROSERVICE_BASE_URL.SRV_RESERVATION_INTERNAL}/reservations/for-profit-report?${qs}`;
  try {
    const { data } = await apiClient.get<ApiList<Array<Record<string, unknown>>>>(url, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    if (!data?.success) return [];
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function patchProfitReportColumnConfig(
  id: string,
  columnConfig: { reservations?: string[]; ledger?: string[] },
  scope?: OwnerScope,
) {
  const { data } = await apiClient.patch<ApiList<ProfitReport>>(
    `${BASE}/profit-reports/${id}/column-config`,
    columnConfig,
    { params: withOwnerParams({}, scope) },
  );
  if (!data.success) throw new Error(data.error || 'Mise à jour impossible');
  return data.data;
}

export async function fetchDefaultPmReportHeader(scope?: OwnerScope) {
  const { data } = await apiClient.get<ApiList<ProfitReportHeader>>(
    `${BASE}/profit-reports/pm-branding-default`,
    { params: withOwnerParams({}, scope) },
  );
  if (!data.success) throw new Error(data.error || 'Chargement en-tête impossible');
  return data.data ?? null;
}

export async function patchProfitReportHeader(
  id: string,
  header: Partial<ProfitReportHeader>,
  scope?: OwnerScope,
) {
  const { data } = await apiClient.patch<ApiList<ProfitReport>>(
    `${BASE}/profit-reports/${id}/header`,
    header,
    { params: withOwnerParams({}, scope) },
  );
  if (!data.success) throw new Error(data.error || 'Mise à jour en-tête impossible');
  return data.data;
}

export async function deleteProfitReport(id: string, scope?: OwnerScope) {
  try {
    const { data } = await apiClient.delete<ApiList<ProfitReport>>(
      `${BASE}/profit-reports/${encodeURIComponent(id)}`,
      { params: withOwnerParams({}, scope) },
    );
    if (!data.success) throw new Error(data.error || data.message || 'Delete failed');
    return data.data;
  } catch (e) {
    throwApiError(e, 'Suppression impossible');
  }
}

export function profitReportHtmlUrl(id: string): string {
  return `${BASE}/profit-reports/${id}/html`;
}
