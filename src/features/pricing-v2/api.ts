// ════════════════════════════════════════════════════════════════════════════
// Pricing v2 — client API (BFF srv-admin /pricing-v2 → srv-pricing-v2:4017)
// ────────────────────────────────────────────────────────────────────────────
// RÈGLE DU MODULE pricing-v2 (agent futur, lis ça d'abord) :
// - AUCUN import depuis features/dynamic-pricing (le pricing v1). Ce module est
//   greenfield ; si tu as besoin d'un composant v1, RECOPIE-le ici.
// - Les types ci-dessous sont le MIROIR EXACT du contrat de sortie du moteur
//   (apps/srv-pricing-v2/src/engine/types.ts, spec v2.7). Ne les « enrichis »
//   pas côté front : si le moteur ne le produit pas, l'UI ne l'affiche pas.
// - Vocabulaire à l'écran : JAMAIS de jargon nu (p25, ADR, momentum…) — voir la
//   table de traduction dans docs/dynamicprice/BRIEF_DESIGN_PRICING_V2.md §2.
// ════════════════════════════════════════════════════════════════════════════
import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/pricing-v2`;

// ── Miroir du contrat moteur (spec v2.7 §7) ──
export type PricingV2Day = {
  date: string; // YYYY-MM-DD
  price: number; // MAD, borné, arrondi
  comp: number; // marché BRUT du jour (repère « vous vs marché »)
  /** État réel de la nuit : vendue / fermée par le PM / à vendre. */
  status?: 'booked' | 'blocked' | 'free';
  /** Prix RÉELLEMENT payé, figé à la réservation (null si non vendue). */
  bookedPriceMad?: number | null;
  breakdown: {
    base: number;
    seasonal: number;
    dow: number;
    pacing: number;
    override: number;
    clamped: 'floor' | 'ceil' | null;
  };
  mode?: 'override';
};
export type PricingV2Result = {
  days: PricingV2Day[]; // 182 jours
  /** Valeurs EFFECTIVES des leviers (config du PM sinon marché) pour l'UI. */
  levers?: {
    seasonalCoefs: number[]; // 12, moyenne 1
    dowMult: number[]; // 7, index 0 = dimanche
    seasonalEdited: boolean;
    dowEdited: boolean;
  };
  minStay: number;
  suggestedBounds: { low: number; high: number };
  meta: {
    gamme: string;
    mode: string;
    currencyIn: string;
    outputCurrency: string;
    fxToOutput: number;
    asOfDate: string;
    benchmark: number;
    benchmarkRaw: number;
    momentum: number; // tendance 90 j (1.05 = « marché +5 % »)
    base: number;
    floor: number;
    ceil: number;
    compsetSize: number; // < 3 → afficher « faible confiance »
  };
};
export type PricingV2Config = {
  listingId: string;
  shadowEnabled: boolean;
  gamme: 'economique' | 'normal' | 'luxe';
  mode: 'prudent' | 'equilibre' | 'agressif';
  minPrice?: number | null;
  maxPrice?: number | null;
  /** Overrides datés posés par le PM (sélection de plage au drag). */
  dailyOverrides?: Record<string, { type: 'fixed' | 'mult'; value: number }> | null;
  /** Leviers édités par le PM. null = valeurs du marché. */
  seasonalCoefs?: number[] | null;
  dowMult?: Record<string, number> | null;
  /** Pacing fin (option B) — null tant que le PM n'a rien réglé : `mode` pilote. */
  pacingHighThreshold?: number | null;
  pacingHighMax?: number | null;
  pacingLowThreshold?: number | null;
  pacingLowMax?: number | null;
};

// ── Mode EXPERT : distribution du marché + comparables ──
// (route backend /market/:id — MÊMES comps que ceux qui font le prix)
export type PricingV2Comp = {
  listingId: string;
  similarity: number;
  bedrooms: number;
  guests: number;
  rating: number | null;
  superhost: boolean;
  minNights: number | null;
  locality: string;
  adrMad: number; // ce qu'il encaisse réellement (12 mois)
  adr90dMad: number; // tendance récente
  occupancy: number | null;
  adjustedMad: number; // ajusté à la qualité de VOTRE bien
  qualityScore: number;
  advantages: string[]; // aménités premium qu'il a et pas vous
  missing: string[]; // aménités premium que vous avez et pas lui
};
export type PricingV2Market = {
  success: boolean;
  error?: string;
  outputCurrency: string;
  subject: {
    bedrooms: number;
    guests: number;
    locality: string;
    rating: number;
    qualityScore: number;
    premiumAmenities: string[];
  };
  /** Échelle PERSONNELLE du bien (sur ses comps). null si aucun comp. */
  scale: { p25: number; p50: number; p75: number; p90: number } | null;
  /** Marché large AirROI — contexte uniquement, bien plus étalé. */
  marketWide: { p25: number; p50: number; p75: number; p90: number };
  compsetSize: number;
  comps: PricingV2Comp[];
};

// ── Historique shadow + comparateur ancien/nouveau ──
export type PricingV2Shadow = {
  success: boolean;
  runs: Array<{
    asOfDate: string;
    computedAt: string;
    engineVersion: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    compsetSize: number;
  }>;
  comparison: Array<{ date: string; v2: number; v1: number | null; deltaPct: number | null }>;
};

export async function fetchPricingV2Market(listingId: string) {
  return apiClient.get<PricingV2Market>(`${BASE}/market/${listingId}`);
}
export async function fetchPricingV2Shadow(listingId: string) {
  return apiClient.get<PricingV2Shadow>(`${BASE}/shadow/${listingId}`);
}

export async function fetchPricingV2Preview(listingId: string) {
  return apiClient.get<{ success: boolean; asOfDate: string; result: PricingV2Result; error?: string }>(
    `${BASE}/preview/${listingId}`,
  );
}
export async function fetchPricingV2Config(listingId: string) {
  return apiClient.get<{ success: boolean; config: PricingV2Config }>(`${BASE}/config/${listingId}`);
}
export async function savePricingV2Config(listingId: string, patch: Partial<PricingV2Config>) {
  return apiClient.put<{ success: boolean; config: PricingV2Config }>(
    `${BASE}/config/${listingId}`,
    patch,
  );
}
