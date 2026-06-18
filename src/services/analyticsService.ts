import axios from 'axios';
import { runtimeLog } from '../utils/runtimeLog';
import type { AnalyticsQuery, AnalyticsSnapshot } from '../types/analytics.types';
import { buildAnalyticsSnapshotClient, enrichAnalyticsSnapshotWithLandR, snapshotToCsv } from './analyticsSnapshotBuilder';

export type AnalyticsSnapshotRequestOptions = {
  signal?: AbortSignal;
};

type AnalyticsExportFormat = 'csv' | 'pdf';

const buildParams = (query: AnalyticsQuery) => ({
  period: query.period,
  comparison: query.comparison,
  source: query.source ?? 'Tous',
  ...(query.listingIds?.length ? { listingIds: query.listingIds } : {}),
  ...(query.customStartDate ? { customStartDate: query.customStartDate } : {}),
  ...(query.customEndDate ? { customEndDate: query.customEndDate } : {}),
  ...(query.staging !== undefined ? { staging: query.staging } : {}),
  ...(query.ownerId ? { ownerId: query.ownerId } : {}),
});

/** Same query in flight → one HTTP call (React Strict Mode double-mount). */
const snapshotInflightByKey = new Map<string, Promise<AnalyticsSnapshot>>();

function snapshotDedupeKey(
  query: AnalyticsQuery,
  options?: AnalyticsSnapshotRequestOptions,
): string | null {
  if (options?.signal) return null;
  return JSON.stringify(buildParams(query));
}

class AnalyticsService {
  async getSnapshot(
    query: AnalyticsQuery,
    options?: AnalyticsSnapshotRequestOptions,
  ): Promise<AnalyticsSnapshot> {
    const key = snapshotDedupeKey(query, options);
    if (key) {
      const existing = snapshotInflightByKey.get(key);
      if (existing) {
        runtimeLog('info', 'AnalyticsAPI', 'GET snapshot — reuse in-flight (dedupe)', {
          keyPreview: key.length > 160 ? `${key.slice(0, 160)}…` : key,
        });
        return existing;
      }
    }

    const promise = this.executeGetSnapshot(query, options);
    if (key) {
      snapshotInflightByKey.set(key, promise);
      void promise.finally(() => {
        snapshotInflightByKey.delete(key);
      });
    }
    return promise;
  }

  private async executeGetSnapshot(
    query: AnalyticsQuery,
    options?: AnalyticsSnapshotRequestOptions,
  ): Promise<AnalyticsSnapshot> {
    runtimeLog('info', 'AnalyticsAPI', 'build snapshot (multi-API)', { params: buildParams(query) });

    try {
      const data = await buildAnalyticsSnapshotClient(query, { signal: options?.signal });
      runtimeLog('info', 'AnalyticsAPI', 'Snapshot OK', {
        periodLabel: data.periodLabel,
        properties: data.properties?.length,
        revenuePoints: data.revenueEvolution?.length,
        channelShare: data.channelShare.length,
      });
      return data;
    } catch (err) {
      if (axios.isCancel(err) || (err as { code?: string }).code === 'ERR_CANCELED') {
        runtimeLog('warn', 'AnalyticsAPI', 'GET snapshot annule (signal / navigation)', {});
        throw err;
      }
      runtimeLog('error', 'AnalyticsAPI', 'GET snapshot exception', {
        message: err instanceof Error ? err.message : String(err),
        axiosStatus: axios.isAxiosError(err) ? err.response?.status : undefined,
        axiosData: axios.isAxiosError(err) ? err.response?.data : undefined,
      });
      throw err;
    }
  }

  async enrichWithLandR(
    query: AnalyticsQuery,
    snapshot: AnalyticsSnapshot,
    options?: AnalyticsSnapshotRequestOptions,
  ): Promise<AnalyticsSnapshot> {
    return enrichAnalyticsSnapshotWithLandR(query, snapshot, {
      signal: options?.signal,
      timeoutMs: 25_000,
    });
  }

  private async downloadPerformanceFile(
    query: AnalyticsQuery,
    format: AnalyticsExportFormat,
  ): Promise<void> {
    runtimeLog('info', 'AnalyticsAPI', `export (${format}) client-side`, {
      params: { ...buildParams(query), format },
    });
    if (format === 'pdf') {
      throw new Error(
        'Export PDF serveur indisponible — endpoint /admin/analytics/export non déployé.',
      );
    }
    const snapshot = await buildAnalyticsSnapshotClient(query, {
      includeLandR: true,
      landRTimeoutMs: 90_000,
    });
    const blob = new Blob([snapshotToCsv(snapshot)], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `analytics-performance-${query.period}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    runtimeLog('info', 'AnalyticsAPI', 'export CSV OK', { rows: snapshot.propertyPerformance.length });
  }

  async downloadPerformanceCsv(query: AnalyticsQuery): Promise<void> {
    await this.downloadPerformanceFile(query, 'csv');
  }

  async downloadPerformancePdf(query: AnalyticsQuery): Promise<void> {
    await this.downloadPerformanceFile(query, 'pdf');
  }
}

export const analyticsService = new AnalyticsService();
