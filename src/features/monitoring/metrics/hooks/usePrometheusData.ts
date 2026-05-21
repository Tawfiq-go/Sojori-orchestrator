import { useState, useEffect, useCallback } from 'react';
import { prometheusGet } from '../../../../utils/monitoringApi';

export function useOverview(timeRange = '1h') {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await prometheusGet<{ data?: unknown }>('/overview', { timeRange });
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useNodes() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await prometheusGet<{ data?: unknown }>('/nodes');
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function usePods() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsResponse, metadataResponse] = await Promise.all([
        prometheusGet<{ data?: Record<string, unknown> }>('/pods'),
        prometheusGet<{ data?: unknown }>('/pods/metadata'),
      ]);
      setData({
        ...metricsResponse.data.data,
        metadata: metadataResponse.data.data,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useBusinessMetrics(timeRange = '24h') {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await prometheusGet<{ data?: unknown }>('/business-metrics', { timeRange });
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useSecurityMetrics(timeRange = '1h') {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await prometheusGet<{ data?: unknown }>('/security-metrics', { timeRange });
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useChatbotMetrics(timeRange = '1h') {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await prometheusGet<{ data?: unknown }>('/chatbot-metrics', { timeRange });
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useRabbitMQMetrics() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await prometheusGet<{ data?: unknown }>('/rabbitmq');
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useTimeSeries(metric: string, timeRange = '1h', step = '30s') {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    if (!metric) return;
    setLoading(true);
    setError(null);
    try {
      const response = await prometheusGet<{ data?: unknown }>('/timeseries', {
        metric,
        timeRange,
        step,
      });
      setData(response.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [metric, timeRange, step]);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}
