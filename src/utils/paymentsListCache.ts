import type { PaymentAuditRow } from '../services/paymentsService';

const TTL_MS = 3 * 60 * 1000;

type CacheEntry = {
  rows: PaymentAuditRow[];
  total: number;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry>();

export function paymentsCacheKey(params: {
  page: number;
  paymentStatus: string;
  cardOnly: boolean;
  search: string;
  ownerScope?: string;
}): string {
  return `${params.ownerScope ?? '__all__'}|${params.page}|${params.paymentStatus}|${params.cardOnly ? '1' : '0'}|${params.search.trim().toLowerCase()}`;
}

export function getCachedPaymentsList(key: string): { rows: PaymentAuditRow[]; total: number } | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return { rows: hit.rows, total: hit.total };
}

export function setCachedPaymentsList(
  key: string,
  rows: PaymentAuditRow[],
  total: number,
): void {
  store.set(key, { rows, total, fetchedAt: Date.now() });
}

export function invalidatePaymentsListCache(): void {
  store.clear();
}
