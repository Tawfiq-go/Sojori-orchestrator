/**
 * Taux EUR → MAD = `currencies.madRate` admin (Settings → Devises).
 * Prod actuel : EUR.madRate = 10.67
 */
import { useEffect, useState } from 'react';
import { getCurrencies } from '../features/setting/services/serverApi.adminConfig';

export const DEFAULT_EUR_MAD_ADMIN_RATE = 10.67;

type Cache = { rate: number; at: number; source: 'admin' | 'default' };

let cache: Cache | null = null;
let inflight: Promise<number> | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000;

function pickEurMadRate(payload: unknown): number | null {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as any)?.data)
      ? (payload as any).data
      : Array.isArray((payload as any)?.data?.data)
        ? (payload as any).data.data
        : Array.isArray((payload as any)?.currencies)
          ? (payload as any).currencies
          : [];
  for (const row of rows) {
    const code = String(row?.currencyCode || row?.code || '').toUpperCase();
    if (code !== 'EUR') continue;
    const rate = Number(row?.madRate);
    if (Number.isFinite(rate) && rate > 0) return rate;
  }
  return null;
}

/** Valeur synchrone (cache ou défaut admin). */
export function getCachedEurMadAdminRate(): number {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rate;
  return cache?.rate ?? DEFAULT_EUR_MAD_ADMIN_RATE;
}

/** Charge / rafraîchit le taux depuis srv-admin. */
export async function loadEurMadAdminRate(force = false): Promise<number> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rate;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await getCurrencies();
      const rate = pickEurMadRate(res?.data ?? res);
      if (rate != null) {
        cache = { rate, at: Date.now(), source: 'admin' };
        return rate;
      }
    } catch {
      // keep previous / default
    }
    if (!cache) cache = { rate: DEFAULT_EUR_MAD_ADMIN_RATE, at: Date.now(), source: 'default' };
    else cache = { ...cache, at: Date.now() };
    return cache.rate;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Hook React — rafraîchit le taux admin une fois monté. */
export function useEurMadAdminRate(): number {
  const [rate, setRate] = useState(getCachedEurMadAdminRate);
  useEffect(() => {
    let cancelled = false;
    loadEurMadAdminRate().then((r) => {
      if (!cancelled) setRate(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return rate;
}
