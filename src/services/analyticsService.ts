import apiClient from './apiClient';
import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { runtimeLog } from '../utils/runtimeLog';
import type { AnalyticsQuery, AnalyticsSnapshot } from '../types/analytics.types';

export type AnalyticsSnapshotRequestOptions = {
  signal?: AbortSignal;
};

type AnalyticsEnvelope = {
  success: boolean;
  data?: AnalyticsSnapshot;
  error?: string;
  message?: string;
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
});

const parseFilename = (contentDisposition?: string): string | null => {
  if (!contentDisposition) return null;
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
  return match?.[1] ?? null;
};

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
    const url = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/analytics/snapshot`;
    runtimeLog('info', 'AnalyticsAPI', 'GET snapshot start', { url, params: buildParams(query) });

    try {
      const response = await apiClient.get<AnalyticsEnvelope>(url, {
        params: buildParams(query),
        timeout: 120_000,
        signal: options?.signal,
      });

      runtimeLog('info', 'AnalyticsAPI', 'GET snapshot response', {
        httpStatus: response.status,
        success: response.data?.success,
        hasData: Boolean(response.data?.data),
        error: response.data?.error,
        message: response.data?.message,
      });

      if (!response.data?.success || !response.data.data) {
        const msg = response.data?.error || response.data?.message || 'Analytics snapshot unavailable';
        runtimeLog('error', 'AnalyticsAPI', 'Snapshot payload invalide', { msg, raw: response.data });
        throw new Error(msg);
      }

      const data = response.data.data;
      runtimeLog('info', 'AnalyticsAPI', 'Snapshot OK', {
        periodLabel: data.periodLabel,
        properties: data.properties?.length,
        revenuePoints: data.revenueEvolution?.length,
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

  private async downloadPerformanceFile(
    query: AnalyticsQuery,
    format: AnalyticsExportFormat,
  ): Promise<void> {
    runtimeLog('info', 'AnalyticsAPI', `GET export (${format}) start`, {
      params: { ...buildParams(query), format },
    });
    try {
      const response = await apiClient.get<Blob>(
        `${MICROSERVICE_BASE_URL.SRV_ADMIN}/analytics/export`,
        {
          params: { ...buildParams(query), format },
          responseType: 'blob',
        },
      );

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8;',
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download =
        parseFilename(response.headers['content-disposition']) ??
        `analytics-export.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      runtimeLog('info', 'AnalyticsAPI', `GET export (${format}) OK`, { httpStatus: response.status });
    } catch (err) {
      runtimeLog('error', 'AnalyticsAPI', `GET export (${format}) failed`, {
        message: err instanceof Error ? err.message : String(err),
        axiosStatus: axios.isAxiosError(err) ? err.response?.status : undefined,
      });
      throw err;
    }
  }

  async downloadPerformanceCsv(query: AnalyticsQuery): Promise<void> {
    await this.downloadPerformanceFile(query, 'csv');
  }

  async downloadPerformancePdf(query: AnalyticsQuery): Promise<void> {
    await this.downloadPerformanceFile(query, 'pdf');
  }
}

export const analyticsService = new AnalyticsService();
