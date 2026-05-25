// ════════════════════════════════════════════════════════════════════
// Sojori · Dynamic Pricing · Atelier 2026
// _tokens.ts — palette + types + helpers partagés
// ════════════════════════════════════════════════════════════════════

export const T = {
  gold: '#F4CF5E', goldDeep: '#c79b22', goldSoft: '#fae5a3',
  goldTint: 'rgba(244,207,94,0.14)', goldTint2: 'rgba(244,207,94,0.30)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.12)',
  successOver: '#22c55e',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.12)',
  error: '#dc2626', errorTint: 'rgba(220,38,38,0.10)',
  info: '#0673b3', infoTint: 'rgba(6,115,179,0.10)',
} as const;

/* ─── Types alignés API ──────────────────────────────────────── */
export type PricingMode = 'prudent' | 'balanced' | 'aggressive';
export type DayStatus = 'std' | 'prem' | 'clamp' | 'override' | 'anomaly' | 'blocked';

export interface Listing {
  _id: string;
  name: string;
  district: string;             // ex: 'Guéliz'
  city: string;                  // ex: 'Marrakech'
  photoUrl?: string;
  airroiZoneAvailable: boolean;
  /** Libellé district marché résolu (vue bien). */
  airroiZone?: string;
  bedrooms: number;
  bathrooms?: number;
  guests: number;
  /** personCapacityMax → bandeau + API AirROI */
  maxGuests?: number;
  /** personCapacity — tarif / occupancy de base (hors AirROI) */
  personCapacityPricing?: number;
  /** Ligne compacte profil envoyé à AirROI (sans adresse / GPS) */
  airroiApiProfile?: string;
  amenities: string[];
  position?: { lat: number; lng: number };
  /** ID RU (legacy dashboard) — ex. 4021713 */
  ruPropertyKey?: string | null;
  airbnbConnected?: boolean;
  airbnbListingId?: string | null;
  airbnbPublicUrl?: string | null;
  airbnbStatus?: string | null;
  airbnbMarkup?: number | null;
  otaVerifiedAt?: string | null;
}

export interface ListingPerformance {
  potentialAnnualMad: { p25: number; p50: number; p75: number };
  realizedTtmMad: number;
  occupancyTtm: number;          // 0..1
  adrTtm: number;
  reviews: number;
  starRating: number;
  scorePerformance: number;      // 0..100
}

/** Performance agrégée vue bien (StatsCards). */
export interface BienDetailPerformance {
  potentialAnnual: { p25: number; p50: number; p75: number; currency: 'MAD' };
  potentialUsd: number;
  ttm: {
    ttmRevenue: number;
    ttmUsd: number;
    occupancy: number;
    adr: number;
    nights: number;
    quartile: 'P25' | 'P50' | 'P75';
  };
  pacing: {
    fillRate: number;
    monthLabel: string;
    trendPct: number;
    compsCount: number;
    avgAdr: number;
    leadTimeDays: number;
    avgStayNights: number;
    cityFillRate?: number;
  };
}

/** Champs plats marché (GET /listings) — brut USD */
export type AirroiRawFields = {
  currency?: string | null;
  locality?: string | null;
  district?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  guests?: number | null;
  bedrooms?: number | null;
  beds?: number | null;
  baths?: number | null;
  num_reviews?: number | null;
  rating_overall?: number | null;
  min_nights?: number | null;
  cleaning_fee?: number | null;
  superhost?: boolean | null;
  ttm_revenue?: number | null;
  ttm_avg_rate?: number | null;
  ttm_occupancy?: number | null;
  ttm_adjusted_occupancy?: number | null;
  ttm_revpar?: number | null;
  ttm_adjusted_revpar?: number | null;
  ttm_total_days?: number | null;
  ttm_available_days?: number | null;
  ttm_blocked_days?: number | null;
  ttm_days_reserved?: number | null;
  ttm_avg_min_nights?: number | null;
  ttm_avg_length_of_stay?: number | null;
  l90d_revenue?: number | null;
  l90d_avg_rate?: number | null;
  l90d_occupancy?: number | null;
  l90d_adjusted_occupancy?: number | null;
  l90d_revpar?: number | null;
  l90d_adjusted_revpar?: number | null;
  l90d_total_days?: number | null;
  l90d_available_days?: number | null;
  l90d_blocked_days?: number | null;
  l90d_days_reserved?: number | null;
  l90d_avg_min_nights?: number | null;
  l90d_avg_length_of_stay?: number | null;
  metricsMonthsCount?: number | null;
  futureRatesDaysCount?: number | null;
  refreshErrors?: string[];
};

export interface PortfolioRow {
  /** false = listing Mongo inactive (exclu du portefeuille par défaut). */
  listingActive?: boolean;
  listing: Listing;
  /** @deprecated mode test — utiliser airroiRaw */
  perf?: ListingPerformance;
  airroiRaw?: AirroiRawFields | null;
  hasAirroiSnapshot?: boolean;
  hasRevenueEstimate?: boolean;
  estimateSummary?: {
    revenueP25Mad: number;
    revenueP50Mad: number;
    revenueP75Mad: number;
    adrP50Mad: number;
    occupancyP50: number;
  } | null;
  airroiGeoUsed?: {
    source: 'sojori_listing_mongo' | 'airroi_listing_snapshot';
    lat: number;
    lng: number;
    bedrooms: number;
    baths: number;
    guests: number;
  } | null;
  airroiSnapshotAt?: string | null;
  airroiSnapshotCostUsd?: number | null;
  airroiComps?: Array<{
    airbnbListingId: string | null;
    name: string;
    rating: number;
    reviews: number;
    bedrooms: number;
    adrTtmMad: number;
    occupancyTtm: number;
    revenueTtmMad: number;
    locality: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  airroiCompsCount?: number;
  airroiCalendarDays?: Array<{
    date: string;
    priceMad: number;
    status: 'std' | 'prem' | 'blocked';
    available: boolean;
  }>;
  airroiCalendarDaysCount?: number;
  perfMeta?: {
    source?: 'airroi_snapshot' | 'estimate';
    snapshotAt?: string | null;
    ttmPeriodLabel?: string;
    metricsPeriodLabel?: string;
    ttmPeriodStart?: string | null;
    ttmPeriodEnd?: string | null;
  };
  aiEnabled: boolean;
  mode?: PricingMode;
  bounds?: { floor: number; ceiling: number };
  pilotConfig?: {
    enabled: boolean;
    applyPrice?: boolean;
    applyMinStay?: boolean;
    modeEnabled: boolean;
    mode: string;
    floorNormal: number;
    ceiling: number;
    minStayDelta: number;
    minStayPlancher: number;
    eventsCount: number;
  } | null;
  thumbColor?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface MarketData {
  district: { adrMedian: number; occMedian: number; growth: number };
  city: { adrMedian: number; occMedian: number; growth: number };
  pacingByMonth: { month: number; year: number; fillRate: number; avgRate: number }[];
  seasonality: { month: number; occ: number; adr: number }[];
  leadTimeDays: number;
  avgStayNights: number;
  recoBounds?: { floor: number; ceiling: number };
  kpis?: {
    occupancyAvg: number;
    adrMedianDistrict: number;
    adrMedianCity: number;
    supplyGrowthPct: number;
    leadTimeDays: number;
    avgStayNights: number;
  };
}

export interface CompListing {
  _id: string;
  name: string;
  distance: number;              // meters
  rating: number;
  reviews: number;
  bedrooms: number;
  adrTtm: number;
  occTtm: number;
  revenueTtm: number;
  photoUrl?: string;
  position?: { lat: number; lng: number };
}

export interface EventOverride {
  _id: string;
  label: string;
  emoji: string;
  startDate: string;
  endDate: string;
  fixedPrice: number;
  minNights: number;
}

export interface AnomalySuggestion {
  startDate: string;
  endDate: string;
  description: string;
  deltaPercent: number;
}

export interface DayRecommendation {
  date: string;                  // ISO YYYY-MM-DD
  status: DayStatus;
  recommendedPrice: number;
  factors?: PriceFactor[];
}

export interface PriceFactor {
  key: string;
  label: string;
  sub?: string;
  value: number;
  kind: 'base' | 'plus' | 'minus' | 'neutral';
}

export interface PortfolioMacro {
  totalPotentialMad: number;
  realizedTtmMad: number;
  realizedPctOfPotential: number;  // 0..1
  avgPacingPct: number;
  pacingTrendPts: number;          // signed delta vs N-1
  aiEnabledCount: number;
  totalListings: number;
  aiOpportunityMad: number;        // potentiel additionnel sur biens AI OFF
}

/* ─── Keyframes (à injecter une fois dans index.css) ───────── */
export const KEYFRAMES = `
@keyframes sj-pulseGold { 0%,100%{box-shadow:0 0 0 0 rgba(244,207,94,0.55)} 50%{box-shadow:0 0 0 8px rgba(244,207,94,0)} }
@keyframes sj-pulseStar { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.85} }
@keyframes sj-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes sj-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes sj-drawBar { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@media (prefers-reduced-motion: reduce) { *{animation:none !important; transition:none !important} }
`;

/* ─── Helpers d'affichage ──────────────────────────────────── */
export const fmtMAD = (n: number) => n.toLocaleString('fr-FR') + ' MAD';
export const fmtMADCompact = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(2).replace('.', ',') + 'M MAD'
  : n >= 1000   ? Math.round(n / 1000) + 'k MAD'
  :                n + ' MAD';
export const fmtPct = (v: number, decimals = 0) => (v * 100).toFixed(decimals) + '%';
export const fmtUsd = (mad: number) => '≈ ' + Math.round(mad / 10).toLocaleString('en-US') + ' USD';

export function perfStatus(score: number): 'over' | 'par' | 'under' {
  if (score >= 75) return 'over';
  if (score >= 40) return 'par';
  return 'under';
}

export const MODE_META: Record<PricingMode, { label: string; emoji: string; chip: 'pr' | 'eq' | 'ag' }> = {
  prudent:    { label: 'PRUDENT',    emoji: '🛡', chip: 'pr' },
  balanced:   { label: 'ÉQUILIBRÉ',  emoji: '⚖', chip: 'eq' },
  aggressive: { label: 'AGRESSIF',   emoji: '🚀', chip: 'ag' },
};

export const DAY_COLORS: Record<DayStatus, string> = {
  std: '#a8e0a3', prem: '#3a8a3a', clamp: '#7fc4f7',
  override: '#ff9c40', anomaly: '#dc2626', blocked: '#f0eee8',
};
