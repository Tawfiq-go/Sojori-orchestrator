/**
 * API Channels admin — port fidèle de sojori-dashboard/channelsDashboardApi.js
 * Retourne des réponses Axios (result.data = { success, data, ... }) pour compat composants legacy.
 */
import apiClient from './apiClient';
import {
  channelsDashboardAxiosConfig,
  monitoringAxiosConfig,
  shouldRetryMonitoringRuApisWithoutEnrich,
} from '../utils/channelsAxiosConfig';

/** Chemins relatifs — baseURL via channelsDashboardAxiosConfig / monitoringAxiosConfig (proxy Vite en dev). */
const CHANNELS_DASHBOARD = '/api/v1/admin/channels-dashboard';
const MONITORING = '/api/monitoring';

export function mapOverviewHoursToRuTimeRange(hours: number | string | undefined) {
  const n = Number(hours);
  if (Number.isFinite(n) && n <= 6) return '6h';
  if (Number.isFinite(n) && n <= 24) return '24h';
  if (Number.isFinite(n) && n <= 72) return '7d';
  return '30d';
}

export function fetchChannelsCalendarRuApis(query: Record<string, unknown> = {}) {
  if (query.action) {
    return fetchChannelsDebugRuApis({
      page: query.page,
      limit: query.limit,
      action: query.action,
      period: query.period,
      from: query.from,
      to: query.to,
      hours: query.hours,
      orchestrationId: query.orchestrationId,
      listingId: query.listingId,
      ownerId: query.ownerId,
    });
  }
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  if (query.orchestrationId) params.set('orchestrationId', String(query.orchestrationId));
  if (query.listingId) params.set('listingId', String(query.listingId));
  if (query.ownerId) params.set('ownerId', String(query.ownerId));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-calendar-apis?${params.toString()}`, {
    timeout: 120_000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsCalendarRuCallBodies(id: string) {
  return fetchChannelsDistributionRuCallBodies(id);
}

/** OAuth PMS — RuCallApi srv-user via channels-dashboard (proxy interne admin → user). */
export function fetchChannelsOAuthRuApis(query: Record<string, unknown> = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-oauth-apis?${params.toString()}`, {
    timeout: 120_000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsOAuthRuCallBodies(id: string) {
  return apiClient.get(
    `${CHANNELS_DASHBOARD}/ru-oauth-call/${encodeURIComponent(String(id))}`,
    channelsDashboardAxiosConfig(),
  );
}

/** Messagerie REST RU (cron owner) — ChannelRuApiCall srv-channels. */
export function fetchChannelsMessagingRuApis(query: Record<string, unknown> = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  if (query.ownerId) params.set('ownerId', String(query.ownerId));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-messaging-apis?${params.toString()}`, {
    timeout: 120_000,
    ...channelsDashboardAxiosConfig(),
  });
}

/** Leads RU (Pull_GetLeads + webhook LNM) — ChannelRuApiCall srv-channels. */
export function fetchChannelsLeadsRuApis(query: Record<string, unknown> = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  if (query.ownerId) params.set('ownerId', String(query.ownerId));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-leads-apis?${params.toString()}`, {
    timeout: 120_000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsDebugRuApis(query: Record<string, unknown> = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  if (query.action) params.set('action', String(query.action));
  if (query.orchestrationId) params.set('orchestrationId', String(query.orchestrationId));
  if (query.listingId) params.set('listingId', String(query.listingId));
  if (query.ownerId) params.set('ownerId', String(query.ownerId));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-debug-apis?${params.toString()}`, channelsDashboardAxiosConfig());
}

/** File owner RU — ChannelRuApiCall via channels-dashboard (pas monitoring). */
export function fetchChannelsOwnerRuApis(query: Record<string, unknown> = {}) {
  return fetchChannelsOwnerRuApisNew(query);
}

export function fetchChannelsUserRuCallBodies(id: string) {
  return fetchChannelsCalendarRuCallBodies(id);
}

export const CHANNEL_LISTING_OTA_AUDIT_ACTION = 'ListingOtaSync_From_Channels';

/** ChannelRuApiCall srv-channels — toutes actions listing (Pull/Push propriété, sync, import). */
export function fetchChannelsListingRuApis(query: Record<string, unknown> = {}) {
  if (query.action) {
    return fetchChannelsDebugRuApis({
      page: query.page,
      limit: query.limit,
      action: query.action,
      period: query.period,
      from: query.from,
      to: query.to,
      hours: query.hours,
      orchestrationId: query.orchestrationId,
      listingId: query.listingId,
      ownerId: query.ownerId,
    });
  }
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  if (query.orchestrationId) params.set('orchestrationId', String(query.orchestrationId));
  if (query.listingId) params.set('listingId', String(query.listingId));
  if (query.ownerId) params.set('ownerId', String(query.ownerId));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-listing-apis?${params.toString()}`, {
    timeout: 120_000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsListingRuCallBodies(id: string) {
  return fetchChannelsDistributionRuCallBodies(id);
}

export function fetchChannelsDistributionRuApis(query: Record<string, unknown> = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  if (query.orchestrationId) params.set('orchestrationId', String(query.orchestrationId));
  if (query.listingId) params.set('listingId', String(query.listingId));
  if (query.ownerId) params.set('ownerId', String(query.ownerId));
  if (query.action) params.set('action', String(query.action));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-distribution-apis?${params.toString()}`, {
    timeout: 120000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsDistributionRuCallBodies(id: string) {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-distribution-call/${encodeURIComponent(String(id))}`, {
    timeout: 120000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsOwnerRuApisNew(query: Record<string, unknown> = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 25;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    const hours =
      query.hours != null ? Math.min(8760, Math.max(1, Math.floor(Number(query.hours)))) : 72;
    params.set('hours', String(hours));
  }
  if (query.action) params.set('action', String(query.action));
  if (query.accountId) params.set('accountId', String(query.accountId));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-owner-apis?${params.toString()}`, {
    timeout: 120000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsOwnerRuCallBodies(id: string) {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-owner-call/${encodeURIComponent(String(id))}`, {
    timeout: 120000,
    ...channelsDashboardAxiosConfig(),
  });
}

export function fetchChannelsKpi(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (query.hours != null) params.append('hours', String(query.hours));
  if (query.ownerId) params.append('ownerId', String(query.ownerId));
  if (query.listingId) params.append('listingId', String(query.listingId));
  const q = params.toString();
  return apiClient.get(q ? `${CHANNELS_DASHBOARD}/kpi?${q}` : `${CHANNELS_DASHBOARD}/kpi`, channelsDashboardAxiosConfig());
}

export function fetchChannelsKpiFilters() {
  return apiClient.get(`${CHANNELS_DASHBOARD}/kpi-filters`, { ...channelsDashboardAxiosConfig(), timeout: 15000 });
}

export function fetchChannelsKpiActionDetails(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (query.action) params.append('action', String(query.action));
  if (query.webhookType) params.append('webhookType', String(query.webhookType));
  if (query.hours != null) params.append('hours', String(query.hours));
  if (query.ownerId) params.append('ownerId', String(query.ownerId));
  if (query.listingId) params.append('listingId', String(query.listingId));
  if (query.limit) params.append('limit', String(query.limit));
  return apiClient.get(`${CHANNELS_DASHBOARD}/kpi-action-details?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 15000,
  });
}

export function fetchChannelsCronJobs() {
  return apiClient.get(`${CHANNELS_DASHBOARD}/cron-jobs`, { ...channelsDashboardAxiosConfig(), timeout: 60000 });
}

export function patchChannelsCronJob(cronId: string, body: { enabled: boolean }) {
  return apiClient.patch(`${CHANNELS_DASHBOARD}/cron-jobs/${encodeURIComponent(String(cronId))}`, body, {
    ...channelsDashboardAxiosConfig(),
    timeout: 60000,
  });
}

export function fetchChannelsConsumptionHints() {
  return apiClient.get(`${CHANNELS_DASHBOARD}/consumption-hints`, channelsDashboardAxiosConfig());
}

export function fetchChannelsOverview(query: Record<string, unknown>) {
  const params = new URLSearchParams();
  params.append('page', String(query.page));
  params.append('limit', String(query.limit));
  params.append('view', String(query.view));
  if (query.period === 'all') {
    params.append('period', 'all');
  } else if (query.from && query.to) {
    params.append('from', String(query.from));
    params.append('to', String(query.to));
  } else {
    params.append('hours', String(query.hours != null ? query.hours : 72));
  }
  return apiClient.get(`${CHANNELS_DASHBOARD}/overview?${params.toString()}`, channelsDashboardAxiosConfig());
}

export function fetchChannelsOverviewReviews(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  params.append('page', String(query.page || 1));
  params.append('limit', String(query.limit || 25));
  if (query.period === 'all') {
    params.append('period', 'all');
  } else if (query.from && query.to) {
    params.append('from', String(query.from));
    params.append('to', String(query.to));
  } else {
    params.append('hours', String(query.hours != null ? query.hours : 72));
  }
  return apiClient.get(`${CHANNELS_DASHBOARD}/overview-reviews?${params.toString()}`, channelsDashboardAxiosConfig());
}

export function fetchChannelsHttpAccessLogs(query: Record<string, unknown> = {}) {
  const page = query.page != null ? Math.max(1, Number(query.page)) : 1;
  const limit = query.limit != null ? Math.min(100, Math.max(1, Number(query.limit))) : 30;
  const hours = query.hours != null ? Math.min(168, Math.max(1, Math.floor(Number(query.hours)))) : 72;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  params.set('hours', String(hours));
  if (query.category) params.set('category', String(query.category));
  return apiClient.get(`${CHANNELS_DASHBOARD}/log-http?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 60000,
  });
}

export function fetchChannelsIngressList(query: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (query.hours != null) params.append('hours', String(query.hours));
  if (query.period) params.append('period', String(query.period));
  if (query.from) params.append('from', String(query.from));
  if (query.to) params.append('to', String(query.to));
  if (query.page != null) params.append('page', String(query.page));
  if (query.limit != null) params.append('limit', String(query.limit));
  if (query.channel) params.append('channel', String(query.channel));
  if (query.ruEventKey) params.append('ruEventKey', String(query.ruEventKey));
  if (query.correlationId) params.append('correlationId', String(query.correlationId));
  if (query.kind) params.append('kind', String(query.kind));
  return apiClient.get(`${CHANNELS_DASHBOARD}/ingress?${params.toString()}`, channelsDashboardAxiosConfig());
}

export function fetchChannelsIngressById(id: string) {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ingress/${encodeURIComponent(id)}`, channelsDashboardAxiosConfig());
}

export function fetchChannelsRuFieldMappings(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (query.domain) params.set('domain', String(query.domain));
  if (query.populate) params.set('populate', '1');
  const q = params.toString();
  return apiClient.get(q ? `${CHANNELS_DASHBOARD}/ru-field-mappings?${q}` : `${CHANNELS_DASHBOARD}/ru-field-mappings`, channelsDashboardAxiosConfig());
}

export function fetchChannelsRuLocationDictionaryTypes() {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-field-mappings/ru-location-dictionary-types`, channelsDashboardAxiosConfig());
}

export function fetchChannelsRuCountryDictionaryList(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (query.locationTypeId != null && query.locationTypeId !== '') {
    params.set('locationTypeId', String(query.locationTypeId));
  }
  const q = params.toString();
  return apiClient.get(
    q ? `${CHANNELS_DASHBOARD}/ru-field-mappings/ru-country-dictionary-list?${q}` : `${CHANNELS_DASHBOARD}/ru-field-mappings/ru-country-dictionary-list`,
    channelsDashboardAxiosConfig(),
  );
}

export function fetchChannelsRuLanguageDictionaryList() {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-field-mappings/ru-language-dictionary-list`, channelsDashboardAxiosConfig());
}

export function fetchChannelsFillCompanyReferencePickers() {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-field-mappings/fill-company-reference-pickers`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 120000,
  });
}

export function postChannelsRuFieldMappingsSeed(body: Record<string, unknown> = {}) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-field-mappings/seed`, body, channelsDashboardAxiosConfig());
}

export function postChannelsRuFieldMappingsSyncRuCountries(body: Record<string, unknown> = {}) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-field-mappings/sync-ru-countries`, body, channelsDashboardAxiosConfig());
}

export function postChannelsRuFieldMappingsSyncRuLanguages(body: Record<string, unknown> = {}) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-field-mappings/sync-ru-languages`, body, channelsDashboardAxiosConfig());
}

export function postChannelsRuFieldMapping(body: Record<string, unknown>) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-field-mappings`, body, channelsDashboardAxiosConfig());
}

export function patchChannelsRuFieldMapping(id: string, body: Record<string, unknown>) {
  return apiClient.patch(`${CHANNELS_DASHBOARD}/ru-field-mappings/${encodeURIComponent(String(id))}`, body, channelsDashboardAxiosConfig());
}

export function deleteChannelsRuFieldMapping(id: string) {
  return apiClient.delete(`${CHANNELS_DASHBOARD}/ru-field-mappings/${encodeURIComponent(String(id))}`, channelsDashboardAxiosConfig());
}

export function fetchRuOwnerProperties(ownerId: string) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-import/list-owner-properties`, { ownerId }, {
    ...channelsDashboardAxiosConfig(),
    timeout: 120000,
  });
}

export function importRuProperty(body: {
  ownerId: string;
  ruPropertyId: number;
  cityId: string;
  correlationId: string;
}) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-import/import`, body, {
    ...channelsDashboardAxiosConfig(),
    timeout: 300000,
  });
}

export function importRuPropertyBatch(body: {
  ownerId: string;
  cityId: string;
  ruPropertyIds: number[];
  correlationId: string;
}) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-import/import-batch`, body, {
    ...channelsDashboardAxiosConfig(),
    timeout: 600000,
  });
}

export function fetchRuImportProgress(correlationId: string) {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-import/progress/${encodeURIComponent(String(correlationId))}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 15000,
  });
}

export function fetchChannelsRuUserOwners() {
  return apiClient.get(`${CHANNELS_DASHBOARD}/ru-user-owners`, { ...channelsDashboardAxiosConfig(), timeout: 120000 });
}

export function archiveChannelsRuUserOwner(ruOwnerId: string) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/ru-user-archive`, { ruOwnerId }, {
    ...channelsDashboardAxiosConfig(),
    timeout: 60000,
  });
}

export function resolveChannelsOwnerNames(ownerIds: string[]) {
  return apiClient.post(`${CHANNELS_DASHBOARD}/resolve-owner-names`, { ownerIds }, {
    ...channelsDashboardAxiosConfig(),
    timeout: 15000,
  });
}

export function fetchBusinessOwnerStats(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    params.set('hours', String(query.hours ?? 72));
  }
  return apiClient.get(`${CHANNELS_DASHBOARD}/business-owner-stats?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 30000,
  });
}

export function fetchBusinessListingStats(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  if (query.period === 'all') {
    params.set('period', 'all');
  } else if (query.from && query.to) {
    params.set('from', String(query.from));
    params.set('to', String(query.to));
  } else {
    params.set('hours', String(query.hours ?? 72));
  }
  return apiClient.get(`${CHANNELS_DASHBOARD}/business-listing-stats?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 30000,
  });
}
