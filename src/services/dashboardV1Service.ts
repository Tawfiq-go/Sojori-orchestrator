import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type {
  DashboardCheckFlowItem,
  DashboardKpiValue,
  DashboardKpis,
  DashboardPeriod,
  DashboardPropertyOption,
  DashboardSnapshot,
} from '../types/dashboard.types';
import { logDashboard, logDashboardApiDetail, logDashboardKpisSummary } from '../utils/dashboardDebug';

function isAbortError(error: unknown): boolean {
  const e = error as { code?: string; name?: string };
  return e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError';
}

const DEFAULT_CHECK_FLOW: DashboardCheckFlowItem[] = [
  { label: "Aujourd'hui", checkIns: 0, checkOuts: 0 },
  { label: 'Demain', checkIns: 0, checkOuts: 0 },
  { label: 'J+2', checkIns: 0, checkOuts: 0 },
  { label: 'J+3', checkIns: 0, checkOuts: 0 },
];

function kpiValue(raw: unknown, fallback = 0): DashboardKpiValue {
  if (raw != null && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if ('value' in o || 'trend' in o) {
      const n = Number(o.value);
      return {
        value: Number.isFinite(n) ? n : fallback,
        trend: typeof o.trend === 'string' && o.trend.length > 0 ? o.trend : '—',
      };
    }
  }
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return { value: n, trend: '—' };
  }
  return { value: fallback, trend: '—' };
}

/** KPIs complets — évite crash si l’API / le cache renvoie un objet partiel. */
export function normalizeDashboardKpis(raw: unknown): DashboardKpis {
  const k = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    totalReservations: kpiValue(k.totalReservations),
    monthlyRevenue: kpiValue(k.monthlyRevenue),
    occupancyRate: kpiValue(k.occupancyRate),
    adr: kpiValue(k.adr),
    revpar: kpiValue(k.revpar),
    guestsThisMonth: kpiValue(k.guestsThisMonth),
    activeProperties: kpiValue(k.activeProperties),
    averageRating: kpiValue(k.averageRating),
  };
}

export const EMPTY_DASHBOARD_SNAPSHOT: DashboardSnapshot = {
  listingIdsHint: [],
  properties: [],
  kpis: normalizeDashboardKpis(null),
  revenueChart: [],
  sourceDistribution: [],
  occupancyByProperty: [],
  alerts: [],
  checkFlow: DEFAULT_CHECK_FLOW,
  upcomingCheckIns: [],
  upcomingCheckOuts: [],
  recentBookings: [],
  urgentTasks: [],
  unreadMessages: [],
  recentReviews: [],
};

export function ensureDashboardSnapshot(
  input: Partial<DashboardSnapshot> | null | undefined,
): DashboardSnapshot {
  const s = input ?? {};
  return {
    listingIdsHint: Array.isArray(s.listingIdsHint) ? s.listingIdsHint : [],
    properties: Array.isArray(s.properties) ? s.properties : [],
    kpis: normalizeDashboardKpis(s.kpis),
    revenueChart: Array.isArray(s.revenueChart) ? s.revenueChart : [],
    sourceDistribution: Array.isArray(s.sourceDistribution) ? s.sourceDistribution : [],
    occupancyByProperty: Array.isArray(s.occupancyByProperty) ? s.occupancyByProperty : [],
    alerts: Array.isArray(s.alerts) ? s.alerts : [],
    checkFlow:
      Array.isArray(s.checkFlow) && s.checkFlow.length > 0 ? s.checkFlow : DEFAULT_CHECK_FLOW,
    upcomingCheckIns: Array.isArray(s.upcomingCheckIns) ? s.upcomingCheckIns : [],
    upcomingCheckOuts: Array.isArray(s.upcomingCheckOuts) ? s.upcomingCheckOuts : [],
    recentBookings: Array.isArray(s.recentBookings) ? s.recentBookings : [],
    urgentTasks: Array.isArray(s.urgentTasks) ? s.urgentTasks : [],
    unreadMessages: Array.isArray(s.unreadMessages) ? s.unreadMessages : [],
    recentReviews: Array.isArray(s.recentReviews) ? s.recentReviews : [],
  };
}

function pickDefinedKpis(
  kpis: Partial<DashboardKpis> | undefined,
  base?: DashboardKpis,
): Partial<DashboardKpis> {
  if (!kpis) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(kpis).filter(([key, value]) => {
      if (value == null) return false;
      const nextValue = Number((value as DashboardKpiValue).value);
      const baseValue = Number(base?.[key as keyof DashboardKpis]?.value ?? 0);
      if (Number.isFinite(nextValue) && nextValue <= 0 && baseValue > 0) {
        return false;
      }
      return true;
    }),
  ) as Partial<DashboardKpis>;
}

export interface DashboardV1Query {
  period: DashboardPeriod;
  listingIds?: string[];
  /** IDs du core — débloque revenue-per-l-and-r si listing-directory timeout. */
  listingIdsHint?: string[];
  ownerId?: string | null;
  /** fast = KPIs seuls (~8s), charts = graphiques seuls, complete = tout (défaut). */
  mode?: 'fast' | 'charts' | 'complete';
  signal?: AbortSignal;
}

function extractData<T>(payload: unknown, label: string): T {
  if (payload == null || typeof payload !== 'object') {
    throw new Error(`Réponse ${label} invalide`);
  }
  const record = payload as Record<string, unknown>;
  if (record.success === false) {
    throw new Error(String(record.error || `Échec ${label}`));
  }
  if (record.message === 'Service OK' && !('data' in record) && !('kpis' in record)) {
    throw new Error(
      `Endpoint ${label} indisponible (srv-admin renvoie health check). Utiliser dashboardService.getSnapshot.`,
    );
  }
  const data = ('data' in record ? record.data : record) as T | undefined;
  if (data == null || typeof data !== 'object') {
    throw new Error(`Données ${label} absentes`);
  }
  return data;
}

function snapshotParams(
  period: DashboardPeriod,
  listingIds: string[],
  ownerId?: string | null,
  listingIdsHint?: string[],
  mode?: DashboardV1Query['mode'],
) {
  const params: Record<string, string | string[]> = { period };
  if (listingIds.length > 0) {
    params.listingIds = listingIds;
  }
  if (listingIdsHint && listingIdsHint.length > 0) {
    params.listingIdsHint = listingIdsHint;
  }
  if (ownerId) {
    params.ownerId = ownerId;
  }
  if (mode && mode !== 'complete') {
    params.mode = mode;
  }
  return params;
}

function normalizeSnapshot(data: Record<string, unknown>): DashboardSnapshot {
  return ensureDashboardSnapshot({
    listingIdsHint: data.listingIdsHint as string[] | undefined,
    properties: data.properties as DashboardSnapshot['properties'],
    kpis: data.kpis as DashboardKpis,
    revenueChart: data.revenueChart as DashboardSnapshot['revenueChart'],
    sourceDistribution: data.sourceDistribution as DashboardSnapshot['sourceDistribution'],
    occupancyByProperty: data.occupancyByProperty as DashboardSnapshot['occupancyByProperty'],
    alerts: data.alerts as DashboardSnapshot['alerts'],
    checkFlow: data.checkFlow as DashboardSnapshot['checkFlow'],
    upcomingCheckIns: data.upcomingCheckIns as DashboardSnapshot['upcomingCheckIns'],
    upcomingCheckOuts: data.upcomingCheckOuts as DashboardSnapshot['upcomingCheckOuts'],
    recentBookings: data.recentBookings as DashboardSnapshot['recentBookings'],
    urgentTasks: data.urgentTasks as DashboardSnapshot['urgentTasks'],
    unreadMessages: data.unreadMessages as DashboardSnapshot['unreadMessages'],
    recentReviews: data.recentReviews as DashboardSnapshot['recentReviews'],
  });
}

function preferNonEmpty<T>(next: T[] | undefined, prev: T[]): T[] {
  return next && next.length > 0 ? next : prev;
}

/** Occupation portfolio — toujours bornée [0, 100]. */
export function clampOccupancyPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round(value * 10) / 10);
}

/** Recalcule occupation / RevPAR / properties actives si les extras arrivent incomplets. */
export function finalizeDashboardSnapshot(snapshot: DashboardSnapshot): DashboardSnapshot {
  const kpis = { ...snapshot.kpis };

  if (kpis.activeProperties.value <= 0) {
    const activeCount =
      snapshot.properties.filter((property) => property.isActive !== false).length ||
      snapshot.properties.length ||
      snapshot.listingIdsHint.length;
    if (activeCount > 0) {
      kpis.activeProperties = { value: activeCount, trend: '—' };
    }
  }

  if (kpis.occupancyRate.value <= 0 && snapshot.occupancyByProperty.length > 0) {
    const rates = snapshot.occupancyByProperty
      .map((row) => clampOccupancyPercent(row.occupancy))
      .filter((rate) => rate > 0);
    if (rates.length > 0) {
      const avg = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      const clamped = clampOccupancyPercent(avg);
      kpis.occupancyRate = {
        value: clamped,
        trend: `${clamped.toFixed(1)}%`,
      };
    }
  }

  if (
    kpis.occupancyRate.value <= 0 &&
    kpis.adr.value > 0 &&
    kpis.monthlyRevenue.value > 0 &&
    kpis.activeProperties.value > 0
  ) {
    const bookedNights = kpis.monthlyRevenue.value / kpis.adr.value;
    const estimatedOccupancy = clampOccupancyPercent(
      Math.round((bookedNights / (30 * kpis.activeProperties.value)) * 1000) / 10,
    );
    if (estimatedOccupancy > 0) {
      kpis.occupancyRate = {
        value: estimatedOccupancy,
        trend: `${estimatedOccupancy.toFixed(1)}%`,
      };
    }
  }

  if (kpis.occupancyRate.value > 0) {
    const clamped = clampOccupancyPercent(kpis.occupancyRate.value);
    kpis.occupancyRate = {
      value: clamped,
      trend: `${clamped.toFixed(1)}%`,
    };
  }

  if (kpis.revpar.value <= 0 && kpis.adr.value > 0 && kpis.occupancyRate.value > 0) {
    const revpar = Math.round((kpis.adr.value * kpis.occupancyRate.value) / 100);
    kpis.revpar = { value: revpar, trend: `${revpar} MAD` };
  } else if (
    kpis.revpar.value <= 0 &&
    kpis.monthlyRevenue.value > 0 &&
    kpis.activeProperties.value > 0
  ) {
    const revpar = Math.round(kpis.monthlyRevenue.value / (30 * kpis.activeProperties.value));
    if (revpar > 0) {
      kpis.revpar = { value: revpar, trend: `${revpar} MAD` };
    }
  }

  let occupancyByProperty = snapshot.occupancyByProperty.map((row) => ({
    ...row,
    occupancy: clampOccupancyPercent(row.occupancy),
  }));
  if (occupancyByProperty.length === 0 && kpis.occupancyRate.value > 0 && snapshot.properties.length > 0) {
    const adr = kpis.adr.value > 0 ? Math.round(kpis.adr.value) : undefined;
    occupancyByProperty = [
      {
        property: snapshot.properties.length === 1 ? snapshot.properties[0].name : 'Portfolio',
        occupancy: Number(kpis.occupancyRate.value.toFixed(1)),
        ...(adr ? { adr } : {}),
      },
    ];
  }

  if (kpis.averageRating.value <= 0 && snapshot.recentReviews.length > 0) {
    const ratings = snapshot.recentReviews
      .map((review) => Number(review.rating))
      .filter((rating) => Number.isFinite(rating) && rating > 0);
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      const formatted = formatDashboardRating(avg);
      kpis.averageRating = {
        value: Number(avg.toFixed(2)),
        trend: formatted.trend,
      };
    }
  }

  return ensureDashboardSnapshot({ ...snapshot, kpis, occupancyByProperty });
}

/** Affichage rating : Channex/Booking souvent sur /10 → montrer /5 + /10. */
export function formatDashboardRating(value: number): { display: string; trend: string } {
  if (!Number.isFinite(value) || value <= 0) {
    return { display: '—', trend: '—' };
  }
  if (value > 5.5) {
    const on10 = Number(value.toFixed(2));
    const on5 = Number((value / 2).toFixed(2));
    return { display: `${on5}`, trend: `${on5}/5 · ${on10}/10` };
  }
  const on5 = Number(value.toFixed(2));
  return { display: `${on5}`, trend: `${on5}/5` };
}

export function mergeDashboardSnapshots(
  base: DashboardSnapshot,
  patch: Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> },
): DashboardSnapshot {
  return ensureDashboardSnapshot({
    ...base,
    ...patch,
    kpis: patch.kpis ? { ...base.kpis, ...pickDefinedKpis(patch.kpis, base.kpis) } : base.kpis,
    revenueChart: preferNonEmpty(patch.revenueChart, base.revenueChart),
    sourceDistribution: preferNonEmpty(patch.sourceDistribution, base.sourceDistribution),
    occupancyByProperty: preferNonEmpty(patch.occupancyByProperty, base.occupancyByProperty),
    urgentTasks: preferNonEmpty(patch.urgentTasks, base.urgentTasks),
    unreadMessages: preferNonEmpty(patch.unreadMessages, base.unreadMessages),
    recentReviews: preferNonEmpty(patch.recentReviews, base.recentReviews),
    alerts: [...base.alerts, ...(patch.alerts ?? [])].filter(
      (alert, index, list) => list.findIndex((item) => item.id === alert.id) === index,
    ),
  });
}

/** Catalogue listings pour filtre dashboard (jusqu’à 500 actifs). */
export async function fetchDashboardListingDirectory(
  ownerId?: string | null,
  signal?: AbortSignal,
): Promise<DashboardPropertyOption[]> {
  const t0 = performance.now();
  logDashboard('fetchDashboardListingDirectory start', { ownerId });
  const params: Record<string, string | boolean> = { staging: false };
  if (ownerId) {
    params.ownerId = ownerId;
  }
  const url = `${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/dashboard-directory`;
  try {
    const response = await apiClient.get(url, { params, signal, timeout: 45_000 });
    const clientMs = Math.round(performance.now() - t0);
    const listings =
      (response.data as { data?: unknown[] })?.data ??
      (Array.isArray(response.data) ? response.data : []);

    const mapped = (listings as Array<Record<string, unknown>>)
      .map((listing) => {
        const id = String(listing.id ?? listing._id ?? '');
        const name = String(listing.name || '').trim();
        const city = String(
          (listing.city as { name?: string })?.name || listing.cityName || listing.city || '',
        ).trim();
        if (!id || !name) return null;
        return {
          id,
          name,
          label: String(listing.label || (city ? `${name} - ${city}` : name)),
          city: city || undefined,
          isActive: (listing.active ?? listing.isActive ?? true) as boolean,
        } satisfies DashboardPropertyOption;
      })
      .filter((listing): listing is DashboardPropertyOption => listing != null)
      .filter((listing) => listing.isActive !== false);

    logDashboard('fetchDashboardListingDirectory done', {
      clientMs,
      count: mapped.length,
    });
    logDashboardApiDetail('directory', {
      url: `${url}?${new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString()}`,
      clientMs,
      meta: { count: mapped.length },
    });
    return mapped;
  } catch (error) {
    if (!isAbortError(error)) {
      const clientMs = Math.round(performance.now() - t0);
      logDashboard('fetchDashboardListingDirectory failed', {
        clientMs,
        message: (error as Error)?.message,
      });
    }
    throw error;
  }
}

/** Premier paint — KPI + listes (~6s max côté serveur). */
export async function fetchDashboardV1Core(query: DashboardV1Query): Promise<DashboardSnapshot> {
  const { period, listingIds = [], ownerId, signal } = query;
  const t0 = performance.now();
  logDashboard('fetchDashboardV1Core start', { period, listingIds, ownerId });

  const url = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/dashboard/v1/snapshot`;
  const params = snapshotParams(period, listingIds, ownerId);
  const response = await apiClient.get(url, {
    params,
    signal,
    timeout: 25_000,
  });

  const snapshot = normalizeSnapshot(extractData<Record<string, unknown>>(response.data, 'core'));
  const meta = (response.data as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
  const clientMs = Math.round(performance.now() - t0);
  logDashboard('fetchDashboardV1Core done', {
    clientMs,
    serverProcessingMs: meta?.processingMs,
    cached: meta?.cached,
    partialBlocks: meta?.partialBlocks,
    listingIdsHintCount: meta?.listingIdsHintCount ?? snapshot.listingIdsHint?.length,
    propertiesCount: snapshot.properties.length,
    averageRating: snapshot.kpis.averageRating.value,
  });
  logDashboardApiDetail('core', {
    url: `${url}?${new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((item) => [k, item]) : [[k, String(v)]],
      ) as [string, string][],
    ).toString()}`,
    clientMs,
    meta,
    kpis: snapshot.kpis as unknown as Record<string, unknown>,
  });
  return snapshot;
}

/** Graphiques & blocs lourds — arrière-plan après affichage du core. */
export async function fetchDashboardV1Extras(
  query: DashboardV1Query,
): Promise<Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> }> {
  const { period, listingIds = [], listingIdsHint = [], ownerId, signal } = query;
  const t0 = performance.now();
  logDashboard('fetchDashboardV1Extras start', { period, listingIds, listingIdsHint, ownerId });

  const url = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/dashboard/v1/snapshot/extras`;
  const params = snapshotParams(period, listingIds, ownerId, listingIdsHint);
  const response = await apiClient.get(url, {
    params,
    signal,
    timeout: 90_000,
  });

  const data = extractData<Record<string, unknown>>(response.data, 'extras');
  const meta = (response.data as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
  const recentReviews = (data.recentReviews as unknown[]) ?? [];
  const extrasKpis = (data.kpis as Record<string, unknown>) ?? {};
  const clientMs = Math.round(performance.now() - t0);
  logDashboard('fetchDashboardV1Extras done', {
    clientMs,
    serverProcessingMs: meta?.processingMs,
    cached: meta?.cached,
    partialBlocks: meta?.partialBlocks,
    sourceCount: ((data.sourceDistribution as unknown[]) ?? []).length,
    occupancyCount: ((data.occupancyByProperty as unknown[]) ?? []).length,
    averageRating: (extrasKpis.averageRating as { value?: number })?.value,
    recentReviewsCount: recentReviews.length,
  });
  logDashboardApiDetail('extras', {
    url: `${url}?${new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((item) => [k, item]) : [[k, String(v)]],
      ) as [string, string][],
    ).toString()}`,
    clientMs,
    meta,
    kpis: extrasKpis,
    extrasKpisKeys: Object.keys(extrasKpis),
    recentReviewsCount: recentReviews.length,
    recentReviewsPreview: recentReviews.slice(0, 3),
  });

  return {
    kpis: data.kpis as Partial<DashboardKpis>,
    revenueChart: (data.revenueChart as DashboardSnapshot['revenueChart']) ?? [],
    sourceDistribution: (data.sourceDistribution as DashboardSnapshot['sourceDistribution']) ?? [],
    occupancyByProperty: (data.occupancyByProperty as DashboardSnapshot['occupancyByProperty']) ?? [],
    urgentTasks: (data.urgentTasks as DashboardSnapshot['urgentTasks']) ?? [],
    unreadMessages: (data.unreadMessages as DashboardSnapshot['unreadMessages']) ?? [],
    recentReviews: (data.recentReviews as DashboardSnapshot['recentReviews']) ?? [],
    alerts: (data.alerts as DashboardSnapshot['alerts']) ?? [],
  };
}

function patchHasData(patch: Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> }): boolean {
  if (patch.kpis && Object.keys(patch.kpis).length > 0) return true;
  const arrays: (keyof DashboardSnapshot)[] = [
    'revenueChart',
    'sourceDistribution',
    'occupancyByProperty',
    'urgentTasks',
    'unreadMessages',
    'recentReviews',
    'alerts',
  ];
  return arrays.some((key) => {
    const value = patch[key];
    return Array.isArray(value) && value.length > 0;
  });
}

/** Merge extras en 2 paints (KPIs puis graphiques) — plus fluide que 8 étapes. */
export async function applyDashboardExtrasProgressively(
  base: DashboardSnapshot,
  extras: Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> },
  onStep: (merged: DashboardSnapshot) => void,
): Promise<DashboardSnapshot> {
  const kpiPatch = finalizeDashboardSnapshot(
    mergeDashboardSnapshots(base, { kpis: extras.kpis }),
  );
  onStep(kpiPatch);

  const chartsPatch: Partial<DashboardSnapshot> = {
    revenueChart: extras.revenueChart,
    sourceDistribution: extras.sourceDistribution,
    occupancyByProperty: extras.occupancyByProperty,
    urgentTasks: extras.urgentTasks,
    unreadMessages: extras.unreadMessages,
    recentReviews: extras.recentReviews,
    alerts: extras.alerts,
  };

  const merged = finalizeDashboardSnapshot(mergeDashboardSnapshots(kpiPatch, chartsPatch));
  onStep(merged);
  return merged;
}

/** Snapshot complet — une requête, agrégation serveur (remplace core + extras). */
export async function fetchDashboardV1Full(query: DashboardV1Query): Promise<DashboardSnapshot> {
  const { period, listingIds = [], listingIdsHint = [], ownerId, mode = 'complete', signal } = query;
  const t0 = performance.now();
  logDashboard(`fetchDashboardV1Full start (${mode})`, {
    period,
    listingIds,
    listingIdsHint,
    ownerId,
    mode,
  });

  const url = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/dashboard/v1/snapshot/full`;
  const params = snapshotParams(period, listingIds, ownerId, listingIdsHint, mode);
  const timeout = mode === 'fast' ? 25_000 : mode === 'charts' ? 20_000 : 60_000;
  const response = await apiClient.get(url, {
    params,
    signal,
    timeout,
  });

  const snapshot = finalizeDashboardSnapshot(
    normalizeSnapshot(extractData<Record<string, unknown>>(response.data, mode)),
  );
  const meta = (response.data as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
  const clientMs = Math.round(performance.now() - t0);
  logDashboard(`fetchDashboardV1Full done (${mode})`, {
    clientMs,
    serverProcessingMs: meta?.processingMs,
    wave1Ms: meta?.wave1Ms,
    wave2Ms: meta?.wave2Ms,
    cached: meta?.cached,
    partialBlocks: meta?.partialBlocks,
    failedUpstreams: meta?.failedUpstreams,
    slowestUpstream: meta?.slowestUpstream,
    bottleneckHint: meta?.bottleneckHint,
    listingIdsHintCount: meta?.listingIdsHintCount ?? snapshot.listingIdsHint?.length,
    propertiesCount: snapshot.properties.length,
    occupancyByProperty: snapshot.occupancyByProperty.length,
    sourceDistribution: snapshot.sourceDistribution.length,
    averageRating: snapshot.kpis.averageRating.value,
    occupancyRate: snapshot.kpis.occupancyRate.value,
  });
  if (mode === 'complete') {
    logDashboardApiDetail('full', {
      url: `${url}?${new URLSearchParams(
        Object.entries(params).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((item) => [k, item]) : [[k, String(v)]],
        ) as [string, string][],
      ).toString()}`,
      clientMs,
      meta,
      kpis: snapshot.kpis as unknown as Record<string, unknown>,
    });
    logDashboardKpisSummary(snapshot.kpis as unknown as Record<string, { value?: number }>);
  }
  return snapshot;
}

export async function fetchDashboardV1Fast(query: DashboardV1Query): Promise<DashboardSnapshot> {
  return fetchDashboardV1Full({ ...query, mode: 'fast' });
}

export async function fetchDashboardV1Charts(
  query: DashboardV1Query,
): Promise<Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> }> {
  const snapshot = await fetchDashboardV1Full({ ...query, mode: 'charts' });
  return {
    kpis: snapshot.kpis,
    revenueChart: snapshot.revenueChart,
    sourceDistribution: snapshot.sourceDistribution,
    occupancyByProperty: snapshot.occupancyByProperty,
    unreadMessages: snapshot.unreadMessages,
    alerts: snapshot.alerts,
  };
}

/** @deprecated Utiliser fetchDashboardV1Full */
export async function fetchDashboardV1Snapshot(query: DashboardV1Query): Promise<DashboardSnapshot> {
  return fetchDashboardV1Full(query);
}
