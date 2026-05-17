import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type { DashboardKpis, DashboardPeriod, DashboardSnapshot } from '../types/dashboard.types';
import { logDashboard } from '../utils/dashboardDebug';

export interface DashboardV1Query {
  period: DashboardPeriod;
  listingIds?: string[];
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
  const data = ('data' in record ? record.data : record) as T | undefined;
  if (data == null || typeof data !== 'object') {
    throw new Error(`Données ${label} absentes`);
  }
  return data;
}

function snapshotParams(period: DashboardPeriod, listingIds: string[]) {
  const params: Record<string, string | string[]> = { period };
  if (listingIds.length > 0) {
    params.listingIds = listingIds;
  }
  return params;
}

function normalizeSnapshot(data: Record<string, unknown>): DashboardSnapshot {
  const kpis = data.kpis as DashboardSnapshot['kpis'];
  return {
    listingIdsHint: (data.listingIdsHint as string[] | undefined) ?? [],
    properties: (data.properties as DashboardSnapshot['properties']) ?? [],
    kpis,
    revenueChart: (data.revenueChart as DashboardSnapshot['revenueChart']) ?? [],
    sourceDistribution: (data.sourceDistribution as DashboardSnapshot['sourceDistribution']) ?? [],
    occupancyByProperty: (data.occupancyByProperty as DashboardSnapshot['occupancyByProperty']) ?? [],
    alerts: (data.alerts as DashboardSnapshot['alerts']) ?? [],
    checkFlow: (data.checkFlow as DashboardSnapshot['checkFlow']) ?? [],
    upcomingCheckIns: (data.upcomingCheckIns as DashboardSnapshot['upcomingCheckIns']) ?? [],
    upcomingCheckOuts: (data.upcomingCheckOuts as DashboardSnapshot['upcomingCheckOuts']) ?? [],
    recentBookings: (data.recentBookings as DashboardSnapshot['recentBookings']) ?? [],
    urgentTasks: (data.urgentTasks as DashboardSnapshot['urgentTasks']) ?? [],
    unreadMessages: (data.unreadMessages as DashboardSnapshot['unreadMessages']) ?? [],
    recentReviews: (data.recentReviews as DashboardSnapshot['recentReviews']) ?? [],
  };
}

function preferNonEmpty<T>(next: T[] | undefined, prev: T[]): T[] {
  return next && next.length > 0 ? next : prev;
}

export function mergeDashboardSnapshots(
  base: DashboardSnapshot,
  patch: Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> },
): DashboardSnapshot {
  return {
    ...base,
    kpis: patch.kpis ? { ...base.kpis, ...patch.kpis } : base.kpis,
    revenueChart: preferNonEmpty(patch.revenueChart, base.revenueChart),
    sourceDistribution: preferNonEmpty(patch.sourceDistribution, base.sourceDistribution),
    occupancyByProperty: preferNonEmpty(patch.occupancyByProperty, base.occupancyByProperty),
    urgentTasks: preferNonEmpty(patch.urgentTasks, base.urgentTasks),
    unreadMessages: preferNonEmpty(patch.unreadMessages, base.unreadMessages),
    recentReviews: preferNonEmpty(patch.recentReviews, base.recentReviews),
    alerts: [...base.alerts, ...(patch.alerts ?? [])].filter(
      (alert, index, list) => list.findIndex((item) => item.id === alert.id) === index,
    ),
  };
}

/** Premier paint — KPI + listes (~6s max côté serveur). */
export async function fetchDashboardV1Core(query: DashboardV1Query): Promise<DashboardSnapshot> {
  const { period, listingIds = [], signal } = query;
  const t0 = performance.now();
  logDashboard('fetchDashboardV1Core start', { period, listingIds });

  const response = await apiClient.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/dashboard/v1/snapshot`, {
    params: snapshotParams(period, listingIds),
    signal,
    timeout: 25_000,
  });

  const snapshot = normalizeSnapshot(extractData<Record<string, unknown>>(response.data, 'core'));
  const meta = (response.data as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
  logDashboard('fetchDashboardV1Core done', {
    clientMs: Math.round(performance.now() - t0),
    serverProcessingMs: meta?.processingMs,
    cached: meta?.cached,
    partialBlocks: meta?.partialBlocks,
    listingIdsHintCount: meta?.listingIdsHintCount ?? snapshot.listingIdsHint?.length,
    propertiesCount: snapshot.properties.length,
  });
  return snapshot;
}

/** Graphiques & blocs lourds — arrière-plan après affichage du core. */
export async function fetchDashboardV1Extras(
  query: DashboardV1Query,
): Promise<Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> }> {
  const { period, listingIds = [], signal } = query;
  const t0 = performance.now();
  logDashboard('fetchDashboardV1Extras start', { period, listingIds });

  const response = await apiClient.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/dashboard/v1/snapshot/extras`, {
    params: snapshotParams(period, listingIds),
    signal,
    timeout: 30_000,
  });

  const data = extractData<Record<string, unknown>>(response.data, 'extras');
  const meta = (response.data as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
  logDashboard('fetchDashboardV1Extras done', {
    clientMs: Math.round(performance.now() - t0),
    serverProcessingMs: meta?.processingMs,
    cached: meta?.cached,
    partialBlocks: meta?.partialBlocks,
    sourceCount: ((data.sourceDistribution as unknown[]) ?? []).length,
    occupancyCount: ((data.occupancyByProperty as unknown[]) ?? []).length,
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

const paintFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

/** Applique les blocs extras un par un (logs + paint intermédiaire pour le debug perf). */
export async function applyDashboardExtrasProgressively(
  base: DashboardSnapshot,
  extras: Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> },
  onStep: (merged: DashboardSnapshot) => void,
): Promise<DashboardSnapshot> {
  const steps: Array<{
    block: string;
    patch: Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> };
  }> = [
    { block: 'kpis', patch: { kpis: extras.kpis } },
    { block: 'revenueChart', patch: { revenueChart: extras.revenueChart } },
    { block: 'sourceDistribution', patch: { sourceDistribution: extras.sourceDistribution } },
    { block: 'occupancyByProperty', patch: { occupancyByProperty: extras.occupancyByProperty } },
    { block: 'urgentTasks', patch: { urgentTasks: extras.urgentTasks } },
    { block: 'unreadMessages', patch: { unreadMessages: extras.unreadMessages } },
    { block: 'recentReviews', patch: { recentReviews: extras.recentReviews } },
    { block: 'alerts', patch: { alerts: extras.alerts } },
  ];

  let current = base;
  for (const { block, patch } of steps) {
    if (!patchHasData(patch)) {
      logDashboard(`block: ${block} skip (vide)`);
      continue;
    }
    const t0 = performance.now();
    logDashboard(`block: ${block} merge start`);
    current = mergeDashboardSnapshots(current, patch);
    onStep(current);
    logDashboard(`block: ${block} merge done`, {
      ms: Math.round(performance.now() - t0),
      revenueChart: current.revenueChart.length,
      sourceDistribution: current.sourceDistribution.length,
      occupancyByProperty: current.occupancyByProperty.length,
    });
    await paintFrame();
  }
  return current;
}

/** @deprecated Utiliser fetchDashboardV1Core + fetchDashboardV1Extras */
export async function fetchDashboardV1Snapshot(query: DashboardV1Query): Promise<DashboardSnapshot> {
  const core = await fetchDashboardV1Core(query);
  try {
    const extras = await fetchDashboardV1Extras(query);
    return mergeDashboardSnapshots(core, extras);
  } catch {
    return core;
  }
}
