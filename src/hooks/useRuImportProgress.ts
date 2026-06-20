import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRuImportProgress } from '../services/channelsDashboardApi';

function randomToken(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRuImportCorrelationId(prefix = 'orchestrator-import'): string {
  return `${prefix}-${randomToken()}`;
}

export interface RuImportProgressData {
  status?: string;
  steps?: Array<{
    key: string;
    label: string;
    subtitle?: string;
    status: string;
    detail?: string;
  }>;
  lastMessage?: string;
  summary?: {
    totalProperties?: number;
    completedProperties?: number;
    succeededProperties?: number;
    failedProperties?: number;
  };
  currentProperty?: {
    ruPropertyId?: number;
    listingName?: string;
    index?: number;
    total?: number;
  };
}

export function getRuImportProgressPercent(progress: RuImportProgressData | null): number {
  const steps = Array.isArray(progress?.steps) ? progress.steps : [];
  const terminalStatuses = new Set(['done', 'skipped']);
  const completedSteps = steps.filter((step) => terminalStatuses.has(step.status)).length;

  if (steps.length > 0) {
    const raw = Math.round((completedSteps / steps.length) * 100);
    if (progress?.status === 'success') return 100;
    if (progress?.status === 'error') return Math.max(raw, 5);
    return Math.max(raw, completedSteps > 0 ? 8 : 3);
  }

  const total = Number(progress?.summary?.totalProperties || 0);
  const completed = Number(progress?.summary?.completedProperties || 0);
  if (total > 0) return Math.round((completed / total) * 100);
  return 0;
}

export function useRuImportProgress() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [correlationId, setCorrelationId] = useState('');
  const [progressData, setProgressData] = useState<RuImportProgressData | null>(null);
  const [progressError, setProgressError] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollOnce = useCallback(
    async (id: string) => {
      if (!id) return null;
      try {
        const res = await fetchRuImportProgress(id);
        if (res.data?.success && res.data?.data) {
          setProgressData(res.data.data);
          setProgressError('');
          if (['success', 'error'].includes(res.data.data.status)) {
            stopPolling();
          }
          return res.data.data;
        }
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
        if (err?.response?.status !== 404) {
          setProgressError(err?.response?.data?.error || err?.message || 'Progress unavailable');
        }
      }
      return null;
    },
    [stopPolling],
  );

  const startPolling = useCallback(
    (id: string) => {
      if (!id) return;
      stopPolling();
      setCorrelationId(id);
      setProgressData(null);
      setProgressError('');
      setIsPolling(true);

      void pollOnce(id);
      timerRef.current = setInterval(() => {
        void pollOnce(id);
      }, 1200);
    },
    [pollOnce, stopPolling],
  );

  const runTrackedImport = useCallback(
    async <T>({
      runImportRequest,
      prefix = 'orchestrator-import',
    }: {
      runImportRequest: (correlationId: string) => Promise<T>;
      prefix?: string;
    }) => {
      const nextCorrelationId = createRuImportCorrelationId(prefix);
      startPolling(nextCorrelationId);

      try {
        const response = await runImportRequest(nextCorrelationId);
        for (let i = 0; i < 5; i += 1) {
          const latest = await pollOnce(nextCorrelationId);
          if (latest && ['success', 'error'].includes(String(latest.status))) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        return { correlationId: nextCorrelationId, response };
      } catch (error) {
        await pollOnce(nextCorrelationId);
        throw error;
      }
    },
    [pollOnce, startPolling],
  );

  const resetProgress = useCallback(() => {
    stopPolling();
    setCorrelationId('');
    setProgressData(null);
    setProgressError('');
  }, [stopPolling]);

  useEffect(
    () => () => {
      stopPolling();
    },
    [stopPolling],
  );

  return {
    correlationId,
    progressData,
    progressError,
    isPolling,
    pollOnce,
    resetProgress,
    runTrackedImport,
    startPolling,
    stopPolling,
  };
}
