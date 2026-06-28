import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import { isAxiosError } from 'axios';
import type {
  ExpenseCategory,
  LedgerEntry,
  ProfitReport,
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

export async function createLedgerEntry(body: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiList<LedgerEntry>>(`${BASE}/expenses`, body);
  if (!data.success) throw new Error(data.error || 'Create expense failed');
  return data.data;
}

export async function createLedgerBundle(body: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiList<unknown>>(`${BASE}/ledger/bundle`, body);
  if (!data.success) throw new Error(data.error || 'Create bundle failed');
  return data.data;
}

export async function patchLedgerEntry(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.patch<ApiList<LedgerEntry>>(`${BASE}/expenses/${id}`, body);
  if (!data.success) throw new Error(data.error || 'Update failed');
  return data.data;
}

export async function deleteLedgerEntry(id: string) {
  const { data } = await apiClient.delete<ApiList<LedgerEntry>>(`${BASE}/expenses/${id}`);
  if (!data.success) throw new Error(data.error || 'Delete failed');
  return data.data;
}

export async function listRecurringTemplates(scope?: OwnerScope): Promise<RecurringTemplate[]> {
  return apiGet(`${BASE}/expense-recurring`, withOwnerParams({}, scope));
}

export async function createRecurringTemplate(body: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiList<RecurringTemplate>>(`${BASE}/expense-recurring`, body);
  if (!data.success) throw new Error(data.error || 'Create recurring failed');
  return data.data;
}

export async function listProfitReports(scope?: OwnerScope): Promise<ProfitReport[]> {
  return apiGet(`${BASE}/profit-reports`, withOwnerParams({}, scope));
}

export async function getProfitReport(id: string): Promise<ProfitReport | null> {
  const { data } = await apiClient.get<ApiList<ProfitReport>>(`${BASE}/profit-reports/${id}`);
  return data.data ?? null;
}

export async function generateProfitReport(body: Record<string, unknown>) {
  const { data } = await apiClient.post<ApiList<ProfitReport>>(`${BASE}/profit-reports/generate`, body);
  if (!data.success) throw new Error(data.error || 'Generate report failed');
  return data.data;
}

export async function publishProfitReport(id: string) {
  const { data } = await apiClient.post<ApiList<ProfitReport>>(`${BASE}/profit-reports/${id}/publish`, {});
  if (!data.success) throw new Error(data.error || 'Publish failed');
  return data.data;
}

export function profitReportHtmlUrl(id: string): string {
  return `${BASE}/profit-reports/${id}/html`;
}
