/**
 * Admin → Logs Sojori — proxy srv-channels (channels-dashboard).
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';

const CHANNELS_DASHBOARD = '/api/v1/admin/channels-dashboard';

export function fetchSojoriAirroiApis(query: {
  page?: number;
  limit?: number;
  endpoint?: string;
  ownerId?: string;
  period?: 'all';
  from?: string;
  to?: string;
  hours?: number;
  success?: string;
} = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.endpoint) params.set('endpoint', String(query.endpoint));
  if (query.ownerId) params.set('ownerId', String(query.ownerId));
  if (query.success) params.set('success', String(query.success));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 168;
    params.set('hours', String(hours));
  }
  return apiClient.get(`${CHANNELS_DASHBOARD}/airroi-apis?${params.toString()}`, {
    timeout: 120_000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchSojoriAirroiCallDetail(id: string) {
  return apiClient.get(
    `${CHANNELS_DASHBOARD}/airroi-call/${encodeURIComponent(String(id))}`,
    channelsDashboardAxiosConfig(),
  );
}
