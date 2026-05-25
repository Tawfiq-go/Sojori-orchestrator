import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type {
  DashboardCheckFlowItem,
  DashboardKpiValue,
  DashboardKpis,
  DashboardPeriod,
  DashboardSnapshot,
} from '../types/dashboard.types';
import { logDashboard } from '../utils/dashboardDebug';

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

function pickDefinedKpis(kpis?: Partial<DashboardKpis>): Partial<DashboardKpis> {
  if (!kpis) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(kpis).filter(([, v]) => v != null),
  ) as Partial<DashboardKpis>;
}

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

function snapshotParams(period: DashboardPeriod, listingIds: string[]) {
  const params: Record<string, string | string[]> = { period };
  if (listingIds.length > 0) {
    params.listingIds = listingIds;
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

export function mergeDashboardSnapshots(
  base: DashboardSnapshot,
  patch: Partial<DashboardSnapshot> & { kpis?: Partial<DashboardKpis> },
): DashboardSnapshot {
  return ensureDashboardSnapshot({
    ...base,
    ...patch,
    kpis: patch.kpis ? { ...base.kpis, ...pickDefinedKpis(patch.kpis) } : base.kpis,
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
