/**
 * API LogApiMews — échanges Connector Mews (Synthèse / Journal / Détail).
 * Backend : srv-admin …/mews-log-* → proxy srv-channels.
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';

const CHANNELS_DASHBOARD = '/api/v1/admin/channels-dashboard';

export type LogApiMewsCategory =
  | 'configuration'
  | 'listing'
  | 'availability'
  | 'reservation'
  | 'webhook'
  | 'other';

export type LogApiMewsStatusFilter = '' | 'success' | 'warning' | 'error';
export type LogApiMewsDirFilter = '' | 'push' | 'pull' | 'webhook';

export interface LogApiMewsListQuery {
  page?: number;
  limit?: number;
  hours?: number;
  status?: LogApiMewsStatusFilter;
  dir?: LogApiMewsDirFilter;
  category?: LogApiMewsCategory | '';
  action?: string;
  ownerId?: string;
  listingId?: string;
  correlationId?: string;
  q?: string;
  minResponseTime?: number;
}

export interface LogApiMewsItem {
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
  category?: string;
  dir?: string;
}

export interface LogApiMewsListResponse {
  items: LogApiMewsItem[];
  pagination: { total: number; page: number; limit: number };
}

export interface LogApiMewsKpis {
  total: number;
  errors: number;
  warnings: number;
  slow: number;
  avgResponseTime: number | null;
}

export interface LogApiMewsActionStat {
  action: string;
  category: LogApiMewsCategory | string;
  calls: number;
  success: number;
  warnings: number;
  errors: number;
  avgResponseTime: number | null;
  lastUsed: string;
  lastStatus: string;
  lastStatusCode: string;
  lastResponseTime?: number | null;
}

export interface LogApiMewsOwnerStat {
  ownerId: string;
  ownerName: string;
  calls: number;
  errors: number;
  warnings: number;
  avgResponseTime: number | null;
  lastUsed: string;
}

export interface LogApiMewsStatsResponse {
  kpis: LogApiMewsKpis;
  byAction: LogApiMewsActionStat[];
  byOwner: LogApiMewsOwnerStat[];
}

export interface LogApiMewsCallDetail {
  id: string;
  action: string;
  status: string;
  statusCode: string;
  responseMsg: string;
  responseTime: number | null;
  requestXml: string;
  responseXml: string;
  requestJson?: unknown;
  responseJson?: unknown;
  requestPayload: unknown;
  auditContext: Record<string, unknown>;
  createdAt: string;
}

function buildParams(query: LogApiMewsListQuery): URLSearchParams {
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

export async function fetchLogApiMewsList(
  query: LogApiMewsListQuery = {},
): Promise<LogApiMewsListResponse> {
  const r = await apiClient.get(
    `${CHANNELS_DASHBOARD}/mews-log-apis?${buildParams(query).toString()}`,
    { ...channelsDashboardAxiosConfig(), timeout: 120_000 },
  );
  const data = (r.data as { data?: LogApiMewsListResponse })?.data;
  return {
    items: data?.items ?? [],
    pagination: data?.pagination ?? { total: 0, page: 1, limit: 50 },
  };
}

export async function fetchLogApiMewsStats(
  query: { hours?: number; ownerId?: string } = {},
): Promise<LogApiMewsStatsResponse> {
  const params = new URLSearchParams();
  const hours =
    query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 24;
  params.set('hours', String(hours));
  if (query.ownerId) params.set('ownerId', query.ownerId);
  const r = await apiClient.get(`${CHANNELS_DASHBOARD}/mews-log-stats?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 120_000,
  });
  const data = (r.data as { data?: LogApiMewsStatsResponse })?.data;
  return {
    kpis: data?.kpis ?? { total: 0, errors: 0, warnings: 0, slow: 0, avgResponseTime: null },
    byAction: data?.byAction ?? [],
    byOwner: data?.byOwner ?? [],
  };
}

export async function fetchLogApiMewsCallDetail(id: string): Promise<LogApiMewsCallDetail | null> {
  const r = await apiClient.get(`${CHANNELS_DASHBOARD}/mews-log-call/${encodeURIComponent(id)}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 120_000,
  });
  return (r.data as { data?: LogApiMewsCallDetail })?.data ?? null;
}
