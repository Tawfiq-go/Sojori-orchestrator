/** Logs dashboard / auth en dev (console navigateur). */
import { runtimeLog } from './runtimeLog';

const PREFIX = '[Sojori Orchestrator]';

/** `vite preview` (ex. :4174) = build prod → `import.meta.env.DEV` est false ; on garde les logs en local. */
function isBrowserLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
}

export const dashboardDebugEnabled =
  import.meta.env.DEV ||
  import.meta.env.VITE_DASHBOARD_DEBUG === 'true' ||
  isBrowserLocalhost();

export function logDashboard(message: string, data?: unknown): void {
  if (!dashboardDebugEnabled) return;
  if (data !== undefined) {
    console.log(`${PREFIX} ${message}`, data);
  } else {
    console.log(`${PREFIX} ${message}`);
  }
}

/** Toujours actif (diagnostic page blanche / 401). Filtrer la console sur « Sojori ». */
export function logAuth(message: string, data?: unknown): void {
  runtimeLog('info', 'Auth', message, data);
}

export function logAuthWarn(message: string, data?: unknown): void {
  runtimeLog('warn', 'Auth', message, data ?? '');
}

export function logAuthError(message: string, data?: unknown): void {
  runtimeLog('error', 'Auth', message, data ?? '');
}

const apiStartTimes = new Map<string, number>();

export function logApiStart(label: string): void {
  if (!dashboardDebugEnabled) return;
  apiStartTimes.set(label, performance.now());
}

/** Détail KPI / meta après snapshot core ou extras. */
export function logDashboardKpisSummary(kpis: Record<string, { value?: number }>): void {
  if (!dashboardDebugEnabled) return;
  console.info(
    `${PREFIX} KPIs finaux — résa=${kpis.totalReservations?.value ?? 0} revenus=${kpis.monthlyRevenue?.value ?? 0} occ=${kpis.occupancyRate?.value ?? 0}% ADR=${kpis.adr?.value ?? 0} rating=${kpis.averageRating?.value ?? 0} props=${kpis.activeProperties?.value ?? 0} RevPAR=${kpis.revpar?.value ?? 0}`,
  );
}

type UpstreamTimingRow = {
  label: string;
  ms: number;
  ok: boolean;
  error?: string;
};

/** Détail des appels amont srv-admin (triés par durée décroissante). */
export function logDashboardUpstreamTimings(meta: Record<string, unknown> | undefined): void {
  if (!dashboardDebugEnabled || !meta) return;

  const timings = Array.isArray(meta.upstreamTimings)
    ? (meta.upstreamTimings as UpstreamTimingRow[])
    : [];
  const processingMs = Number(meta.processingMs ?? 0);
  const wave1Ms = Number(meta.wave1Ms ?? 0);
  const wave2Ms = Number(meta.wave2Ms ?? 0);
  const partialBlocks = Array.isArray(meta.partialBlocks) ? (meta.partialBlocks as string[]) : [];
  const failedUpstreams = Array.isArray(meta.failedUpstreams) ? (meta.failedUpstreams as string[]) : [];
  const slowest = meta.slowestUpstream as { label?: string; ms?: number; ok?: boolean } | null;
  const bottleneckHint = typeof meta.bottleneckHint === 'string' ? meta.bottleneckHint : undefined;

  console.group(`${PREFIX} ⏱ Perf snapshot — total ${processingMs}ms (vague1 ${wave1Ms}ms + vague2 ${wave2Ms}ms)`);
  if (bottleneckHint) {
    console.warn(`${PREFIX} Goulot détecté:`, bottleneckHint);
  }
  if (partialBlocks.length > 0) {
    console.warn(`${PREFIX} Blocs partiels / manquants:`, partialBlocks);
  }
  if (failedUpstreams.length > 0) {
    console.warn(`${PREFIX} Upstreams en échec:`, failedUpstreams);
  }
  if (slowest?.label) {
    console.log(`${PREFIX} Plus lent: ${slowest.label} (${slowest.ms ?? 0}ms, ok=${slowest.ok ?? '?'})`);
  }
  if (timings.length > 0) {
    console.table(
      timings.map((row) => ({
        upstream: row.label,
        ms: row.ms,
        ok: row.ok ? '✓' : '✗',
        error: row.error ?? '',
      })),
    );
  } else {
    console.log(`${PREFIX} (pas de upstreamTimings dans meta — redeploy srv-admin ?)`);
  }
  console.groupEnd();
}

export function logDashboardApiDetail(
  tier: 'core' | 'extras' | 'full' | 'merged' | 'directory',
  payload: {
    url: string;
    clientMs?: number;
    meta?: Record<string, unknown>;
    kpis?: Record<string, unknown>;
    recentReviewsCount?: number;
    recentReviewsPreview?: unknown[];
    extrasKpisKeys?: string[];
  },
): void {
  if (!dashboardDebugEnabled) return;
  const kpiRows =
    payload.kpis && typeof payload.kpis === 'object'
      ? Object.entries(payload.kpis as Record<string, unknown>).map(([key, raw]) => {
          const o = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
          return {
            kpi: key,
            value: o.value ?? raw,
            trend: o.trend ?? '—',
          };
        })
      : [];
  console.groupCollapsed(`${PREFIX} [API ${tier}] ${payload.url} (${payload.clientMs ?? '?'}ms)`);
  if (payload.meta) {
    console.log('meta', payload.meta);
    if (tier === 'full') {
      logDashboardUpstreamTimings(payload.meta);
    }
  }
  if (kpiRows.length > 0) {
    console.table(kpiRows);
  }
  if (payload.extrasKpisKeys) {
    console.log('extras.kpis keys', payload.extrasKpisKeys);
  }
  if (payload.recentReviewsCount != null) {
    console.log('recentReviews', {
      count: payload.recentReviewsCount,
      preview: payload.recentReviewsPreview,
    });
  }
  console.groupEnd();
}

export function logApiOutcome(label: string, outcome: PromiseSettledResult<unknown>): void {
  if (!dashboardDebugEnabled) return;
  const duration = apiStartTimes.has(label)
    ? Math.round(performance.now() - apiStartTimes.get(label)!)
    : undefined;
  if (duration !== undefined) apiStartTimes.delete(label);

  if (outcome.status === 'fulfilled') {
    const value = outcome.value as { status?: number; data?: unknown };
    const status = value?.status ?? 200;
    const data = value?.data;
    const preview =
      data && typeof data === 'object'
        ? {
            success: (data as Record<string, unknown>).success,
            keys: Object.keys(data as object).slice(0, 12),
          }
        : data;
    console.log(`${PREFIX} [API] ✓ ${label}`, { status, preview, duration: duration ? `${duration}ms` : '?' });
  } else {
    const reason = outcome.reason as {
      code?: string
      name?: string
      response?: { status?: number; data?: unknown }
      message?: string
    }
    if (reason?.code === 'ERR_CANCELED' || reason?.name === 'CanceledError') return
    console.warn(`${PREFIX} [API] ✗ ${label}`, {
      status: reason?.response?.status,
      message: reason?.message,
      body: reason?.response?.data,
      duration: duration ? `${duration}ms` : '?',
    })
  }
}

export function maskToken(token: string | null | undefined): string {
  if (!token) return '(aucun)';
  if (token.length <= 12) return '***';
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}
