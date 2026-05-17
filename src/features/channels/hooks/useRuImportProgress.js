import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRuImportProgress } from '../../../services/channelsDashboardApi';

function randomToken() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRuImportCorrelationId(prefix = 'dashboard-import') {
  return `${prefix}-${randomToken()}`;
}

export function getRuImportProgressPercent(progress) {
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

export default function useRuImportProgress() {
  const timerRef = useRef(null);
  const [correlationId, setCorrelationId] = useState('');
  const [progressData, setProgressData] = useState(null);
  const [progressError, setProgressError] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollOnce = useCallback(async (id) => {
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
    } catch (e) {
      const status = e?.response?.status;
      if (status !== 404) {
        setProgressError(e?.response?.data?.error || e?.message || 'Progress unavailable');
      }
    }
    return null;
  }, [stopPolling]);

  const startPolling = useCallback((id) => {
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
  }, [pollOnce, stopPolling]);

  const runTrackedImport = useCallback(async ({
    runImportRequest,
    prefix = 'dashboard-import',
  }) => {
    const nextCorrelationId = createRuImportCorrelationId(prefix);
    startPolling(nextCorrelationId);

    try {
      const response = await runImportRequest(nextCorrelationId);
      await pollOnce(nextCorrelationId);
      stopPolling();
      return { correlationId: nextCorrelationId, response };
    } catch (error) {
      await pollOnce(nextCorrelationId);
      stopPolling();
      throw error;
    }
  }, [pollOnce, startPolling, stopPolling]);

  const resetProgress = useCallback(() => {
    stopPolling();
    setCorrelationId('');
    setProgressData(null);
    setProgressError('');
  }, [stopPolling]);

  useEffect(() => () => {
    stopPolling();
  }, [stopPolling]);

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
