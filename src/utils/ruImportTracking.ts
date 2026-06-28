import { isAxiosError } from 'axios';
import type { ImportResultItem } from '../components/listing/import-airbnb/_tokens';
import { fetchRuImportProgress } from '../services/channelsDashboardApi';
import {
  createRuImportCorrelationId,
  type RuImportProgressData,
} from '../hooks/useRuImportProgress';

const POLL_INTERVAL_MS = 1200;
const MAX_POLL_MS = 30 * 60 * 1000;

function isGatewayOrTimeoutError(e: unknown): boolean {
  if (!isAxiosError(e)) return false;
  const status = e.response?.status;
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    e.code === 'ECONNABORTED' ||
    e.message.includes('timeout')
  );
}

async function pollRuImportLoop(
  correlationId: string,
  onProgress: ((data: RuImportProgressData | null) => void) | undefined,
  isActive: () => boolean,
): Promise<RuImportProgressData | null> {
  const started = Date.now();
  let last: RuImportProgressData | null = null;

  while (isActive() && Date.now() - started < MAX_POLL_MS) {
    try {
      const res = await fetchRuImportProgress(correlationId);
      if (res.data?.success && res.data?.data) {
        last = res.data.data as RuImportProgressData;
        onProgress?.(last);
        if (['success', 'error'].includes(String(last.status))) return last;
      }
    } catch {
      /* 404 early — retry */
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return last;
}

export async function pollRuImportUntilDone(
  correlationId: string,
  onProgress?: (data: RuImportProgressData | null) => void,
): Promise<RuImportProgressData | null> {
  return pollRuImportLoop(correlationId, onProgress, () => true);
}

/** Lance le polling **avant** la requête HTTP pour animer l'UI pendant l'import (comme la modale). */
export async function runTrackedRuImport<T>(params: {
  prefix: string;
  runImportRequest: (correlationId: string) => Promise<T>;
  onProgress?: (data: RuImportProgressData | null) => void;
}): Promise<{ correlationId: string; response: T | undefined; progress: RuImportProgressData | null }> {
  const correlationId = createRuImportCorrelationId(params.prefix);
  params.onProgress?.(null);

  let pollActive = true;
  const pollPromise = pollRuImportLoop(correlationId, params.onProgress, () => pollActive);

  let response: T | undefined;
  try {
    response = await params.runImportRequest(correlationId);
  } catch (e) {
    if (!isGatewayOrTimeoutError(e)) {
      pollActive = false;
      throw e;
    }
    // 504 ingress : le job async peut tourner côté serveur — on poll quand même.
  }

  const progress = await pollPromise;
  pollActive = false;
  return { correlationId, response, progress };
}

export function buildBatchResultsFromProgress(
  progress: RuImportProgressData | null,
  ruPropertyIds: number[],
  ruMeta: (ruPropertyId: string) => { name: string; city?: string },
): ImportResultItem[] {
  const byRu = new Map(
    (progress?.properties ?? []).map((p) => [String(p.ruPropertyId ?? ''), p]),
  );

  return ruPropertyIds.map((id) => {
    const ruId = String(id);
    const meta = ruMeta(ruId);
    const row = byRu.get(ruId);
    const success = row?.status === 'success';
    const errors = Array.isArray((row as { errors?: string[] })?.errors)
      ? (row as { errors: string[] }).errors
      : [];
    return {
      ruPropertyId: ruId,
      propertyName: row?.listingName?.trim() || meta.name,
      city: meta.city,
      success,
      listingId: (row as { listingId?: string })?.listingId,
      errorMessage: errors.length ? errors.join(' · ') : undefined,
    };
  });
}

export function extractBatchHttpResults(
  data: unknown,
  ruMeta: (ruPropertyId: string) => { name: string; city?: string },
): ImportResultItem[] | null {
  const payload = data as {
    results?: Array<{
      ruPropertyId: number;
      success: boolean;
      listingId?: string;
      errors?: string[];
    }>;
  };
  if (!Array.isArray(payload?.results) || payload.results.length === 0) return null;

  return payload.results.map((r) => {
    const ruId = String(r.ruPropertyId);
    const meta = ruMeta(ruId);
    return {
      ruPropertyId: ruId,
      propertyName: meta.name,
      city: meta.city,
      success: r.success,
      listingId: r.listingId,
      errorMessage: r.errors?.length ? r.errors.join(' · ') : undefined,
    };
  });
}
