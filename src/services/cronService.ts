// ════════════════════════════════════════════════════════════════════
// Sojori — cronService · API client for cron monitoring (srv-orchestrator)
// ════════════════════════════════════════════════════════════════════
import { getToken } from '../utils/authUtils';

import { isLocalViteDevHost } from '../config/resolveDevApiOrigin';
import { SOJORI_API_ORIGIN } from '../config/sojoriApiOrigins';

const API_BASE =
  import.meta.env.VITE_SRV_ORCHESTRATOR_URL?.trim() ||
  (isLocalViteDevHost() ? '' : SOJORI_API_ORIGIN);
const API_PREFIX = '/api/v1/orchestrator';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.append(k, String(v));
    });
  }
  const query = qs.toString();
  const url = `${API_BASE}${API_PREFIX}${path}${query ? `?${query}` : ''}`;
  const response = await fetch(url, { headers: getHeaders() });
  const json = await response.json().catch(() => ({ error: 'Network error' }));
  if (!response.ok || !json.success) {
    throw new Error(json.error || `HTTP ${response.status}`);
  }
  return json.data as T;
}

async function apiPost<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({ error: 'Network error' }));
  if (!response.ok || !json.success) {
    throw new Error(json.error || `HTTP ${response.status}`);
  }
  return json as T;
}

export type CronEventStatus = 'pending' | 'executed' | 'skipped' | 'failed' | 'rescheduled';

export type CronScheduleParams = {
  period?: string;
  status?: CronEventStatus | '';
  action?: string;
  category?: string;
  reservationNumber?: string;
  reservationStatus?: 'active' | 'terminated' | 'cancelled' | 'all';
  limit?: number;
  offset?: number;
};

export type CronEvent = {
  _id: string;
  reservationNumber: string;
  guestName?: string;
  listingName?: string;
  action: string;
  category: string;
  scheduledFor: string;
  status: CronEventStatus;
  retryCount?: number;
  error?: string;
  triggeredBy?: string;
  isManualExecution?: boolean;
  metadata?: Record<string, unknown>;
  executionResult?: Record<string, unknown>;
};

export type CronScheduleStats = {
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byReservation: { reservationNumber: string; count: number }[];
};

export type CronScheduleResponse = {
  events: CronEvent[];
  total: number;
  limit: number;
  offset: number;
  stats: CronScheduleStats;
};

export type CronNextExecutionResponse = {
  nextCronRun: string;
  eventsDueNextRun: Array<{
    reservationCode: string;
    actionKey: string;
    workflowCategory?: string;
    scheduledAt: string;
    condition?: string;
    conditionMet?: boolean;
  }>;
  stats: {
    nextCronRun: string;
    timeUntilNextRun: number;
    eventsDueNextRun: number;
    byAction: Record<string, number>;
  };
};

export type CronDayViewParams = {
  view: string;
  /** YYYY-MM-DD — jour unique (view custom_day) */
  date?: string;
  /** YYYY-MM-DD — intervalle (view custom_range) */
  dateFrom?: string;
  dateTo?: string;
  reservationNumber?: string;
  reservationStatus?: string;
};

export type CronDayViewResponse = {
  audit: CronEvent[];
  projection: Array<{
    reservationCode: string;
    actionId: string;
    actionKey: string;
    workflowCategory?: string;
    scheduledAt: string;
    attemptNumber?: number;
    condition?: string;
    conditionMet?: boolean;
    isOverdue?: boolean;
  }>;
  counts: { audit: number; projection: number };
  windows?: { audit?: { label: string }; projection?: { label: string } };
};

export async function getCronNextExecution(): Promise<CronNextExecutionResponse> {
  return apiGet<CronNextExecutionResponse>('/cron/next-execution');
}

export async function getCronSchedule(params: CronScheduleParams = {}): Promise<CronScheduleResponse> {
  return apiGet<CronScheduleResponse>('/cron/schedule', {
    period: params.period ?? 'next',
    limit: params.limit ?? 1000,
    offset: params.offset ?? 0,
    reservationStatus: params.reservationStatus ?? 'all',
    status: params.status || undefined,
    action: params.action || undefined,
    category: params.category || undefined,
    reservationNumber: params.reservationNumber || undefined,
  });
}

export async function getCronDayView(params: CronDayViewParams): Promise<CronDayViewResponse> {
  return apiGet<CronDayViewResponse>('/cron/day-view', {
    view: params.view,
    date: params.date || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    reservationStatus: params.reservationStatus ?? 'all',
    reservationNumber: params.reservationNumber || undefined,
  });
}

export async function forceExecuteAllCron(reservationNumber?: string): Promise<{
  success: boolean;
  summary: {
    total: number;
    executed: number;
    failed: number;
    reservationNumber?: string;
    errors: { eventId: string; error: string }[];
  };
}> {
  return apiPost('/cron/force-execute-all', {
    reservationNumber: reservationNumber || undefined,
  });
}
