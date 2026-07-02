/**
 * API LogApiRU — échanges Rental United (Synthèse / Journal / Détail).
 * Backend : srv-admin /api/v1/admin/channels-dashboard/ru-log-* → proxy srv-channels internal dashboard.
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';

const CHANNELS_DASHBOARD = '/api/v1/admin/channels-dashboard';

export type LogApiRuCategory =
  | 'calendar'
  | 'reservation'
  | 'listing'
  | 'owner'
  | 'lead'
  | 'messaging'
  | 'distribution'
  | 'dictionary'
  | 'other';

export type LogApiRuStatusFilter = '' | 'success' | 'warning' | 'error';
export type LogApiRuDirFilter = '' | 'push' | 'pull';

export interface LogApiRuListQuery {
  page?: number;
  limit?: number;
  hours?: number;
  status?: LogApiRuStatusFilter;
  dir?: LogApiRuDirFilter;
  category?: LogApiRuCategory | '';
  action?: string;
  ownerId?: string;
  listingId?: string;
  correlationId?: string;
  q?: string;
  minResponseTime?: number;
}

export interface LogApiRuItem {
  id: string;
  action: string;
  status: string;
  statusCode: string;
  responseMsg: string;
  responseTime: number | null;
  auditContext: Record<string, unknown>;
  createdAt: string;
  ownerId: string;
  ownerName: string;
  listingId: string;
  listingName: string;
  sojoriReservationNumber: string;
}

export interface LogApiRuListResponse {
  items: LogApiRuItem[];
  pagination: { total: number; page: number; limit: number };
}

export interface LogApiRuKpis {
  total: number;
  errors: number;
  warnings: number;
  slow: number;
  avgResponseTime: number | null;
}

export interface LogApiRuActionStat {
  action: string;
  category: LogApiRuCategory;
  calls: number;
  success: number;
  warnings: number;
  errors: number;
  avgResponseTime: number | null;
  lastUsed: string;
  lastStatus: string;
  lastStatusCode: string;
}

export interface LogApiRuOwnerStat {
  ownerId: string;
  ownerName: string;
  calls: number;
  errors: number;
  warnings: number;
  avgResponseTime: number | null;
  lastUsed: string;
}

export interface LogApiRuStatsResponse {
  kpis: LogApiRuKpis;
  byAction: LogApiRuActionStat[];
  byOwner: LogApiRuOwnerStat[];
}

export interface LogApiRuCallDetail {
  id: string;
  action: string;
  status: string;
  statusCode: string;
  responseMsg: string;
  responseTime: number | null;
  requestXml: string;
  responseXml: string;
  requestPayload: unknown;
  responseJson: unknown;
  auditContext: Record<string, unknown>;
  createdAt: string;
}

function buildParams(query: LogApiRuListQuery): URLSearchParams {
  const params = new URLSearchParams();
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(200, Math.max(1, Number(query.limit))) : 50;
  params.set('page', String(page));
  params.set('limit', String(limit));
  const hours =
    query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 24;
  params.set('hours', String(hours));
  if (query.status) params.set('status', query.status);
  if (query.dir) params.set('dir', query.dir);
  if (query.category) params.set('category', query.category);
  if (query.action) params.set('action', query.action);
  if (query.ownerId) params.set('ownerId', query.ownerId);
  if (query.listingId) params.set('listingId', query.listingId);
  if (query.correlationId) params.set('correlationId', query.correlationId);
  if (query.q) params.set('q', query.q);
  if (query.minResponseTime) params.set('minResponseTime', String(query.minResponseTime));
  return params;
}

export async function fetchLogApiRuList(query: LogApiRuListQuery = {}): Promise<LogApiRuListResponse> {
  const r = await apiClient.get(`${CHANNELS_DASHBOARD}/ru-log-apis?${buildParams(query).toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 120_000,
  });
  const data = (r.data as { data?: LogApiRuListResponse })?.data;
  return {
    items: data?.items ?? [],
    pagination: data?.pagination ?? { total: 0, page: 1, limit: 50 },
  };
}

export async function fetchLogApiRuStats(
  query: { hours?: number; ownerId?: string } = {},
): Promise<LogApiRuStatsResponse> {
  const params = new URLSearchParams();
  const hours =
    query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 24;
  params.set('hours', String(hours));
  if (query.ownerId) params.set('ownerId', query.ownerId);
  const r = await apiClient.get(`${CHANNELS_DASHBOARD}/ru-log-stats?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 120_000,
  });
  const data = (r.data as { data?: LogApiRuStatsResponse })?.data;
  return {
    kpis: data?.kpis ?? { total: 0, errors: 0, warnings: 0, slow: 0, avgResponseTime: null },
    byAction: data?.byAction ?? [],
    byOwner: data?.byOwner ?? [],
  };
}

export async function fetchLogApiRuCallDetail(id: string): Promise<LogApiRuCallDetail | null> {
  const r = await apiClient.get(
    `${CHANNELS_DASHBOARD}/ru-log-call/${encodeURIComponent(id)}`,
    { ...channelsDashboardAxiosConfig(), timeout: 120_000 },
  );
  return (r.data as { data?: LogApiRuCallDetail })?.data ?? null;
}
