/**
 * Données mock Dynamic Pricing — alignées brief v36 + test Marrakech.
 */
import type { CalendarDay } from '../bien/YearlyCalendar';
import type { CompRow } from '../bien/CompsTable';
import type { CompMapPin } from '../bien/MarrakechMap';
import type { PricingEvent, PricingMode, PricingSuggestion } from '../bien/PricingControls';
import type {
  MarketKpis,
  MarketScope,
  PacingPoint,
  SeasonalityPoint,
  SupplyGrowthPoint,
} from '../bien/MarketCharts';
import type { PortfolioMapPin } from '../PortfolioMap';
import type { MarketCityKpis, PortfolioZoneStats } from '../PortfolioView';
import type {
  CompListing,
  Listing,
  ListingPerformance,
  PortfolioMacro,
  PortfolioRow,
  PricingMode as TokenPricingMode,
} from '../_tokens';

export const MAJORELLE_ID = '1307407809376429730';

const ZONE_META: Record<
  string,
  { district: string; pinX: number; pinY: number; zoneId: string }
> = {
  medina: { district: 'Médina', pinX: 720, pinY: 260, zoneId: 'medina' },
  gueliz: { district: 'Guéliz', pinX: 480, pinY: 200, zoneId: 'gueliz' },
  hivernage: { district: 'Hivernage', pinX: 340, pinY: 340, zoneId: 'hivernage' },
  menara: { district: 'Ménara', pinX: 170, pinY: 405, zoneId: 'menara' },
  palmeraie: { district: 'Palmeraie', pinX: 905, pinY: 170, zoneId: 'palmeraie' },
  agdal: { district: 'Agdal', pinX: 550, pinY: 380, zoneId: 'agdal' },
};

const ZONE_DIST: { key: keyof typeof ZONE_META; count: number }[] = [
  { key: 'medina', count: 12 },
  { key: 'gueliz', count: 11 },
  { key: 'hivernage', count: 5 },
  { key: 'menara', count: 4 },
  { key: 'palmeraie', count: 4 },
  { key: 'agdal', count: 2 },
];

const NAMES = [
  'Riad des Épices',
  'Villa Atlas View',
  'Sojori Majorelle pool and parking',
  'Loft Médina Premium',
  'Appartement Guéliz Centre',
  'Dar Hivernage Suite',
  'Studio Ménara Garden',
  'Palmeraie Oasis',
  'Agdal City Flat',
  'Riad Bahia',
  'Penthouse Guéliz',
  'Courtyard Médina',
];

export function buildPortfolioMacro(): PortfolioMacro {
  return {
    totalPotentialMad: 7_570_000,
    realizedTtmMad: 3_210_000,
    realizedPctOfPotential: 0.42,
    avgPacingPct: 38,
    pacingTrendPts: -4,
    aiEnabledCount: 24,
    totalListings: 38,
    aiOpportunityMad: 847_000,
  };
}

export function buildCityKpis(): MarketCityKpis {
  return {
    cityName: 'Marrakech',
    occupancyAvg24m: 0.44,
    adrMedianCity: 1542,
    pacingCurrent: { fillRate: 0.25, monthLabel: 'Mai 2026' },
    pacingNext: { fillRate: 0.13, monthLabel: 'Juin 2026' },
    supplyGrowthPct: 250,
    supplyGrowthMonths: 22,
  };
}

export function buildZoneStats(): Record<string, PortfolioZoneStats> {
  return {
    gueliz: {
      zoneId: 'gueliz',
      zoneName: 'Guéliz',
      airroiListings: 1522,
      adrMedian: 1097,
      occupancyAvg: 0.44,
      myListingsCount: 11,
    },
    medina: {
      zoneId: 'medina',
      zoneName: 'Médina',
      airroiListings: 1968,
      adrMedian: 1898,
      occupancyAvg: 0.47,
      myListingsCount: 12,
    },
    hivernage: {
      zoneId: 'hivernage',
      zoneName: 'Hivernage',
      airroiListings: 674,
      adrMedian: 1800,
      occupancyAvg: 0.42,
      myListingsCount: 5,
    },
    menara: {
      zoneId: 'menara',
      zoneName: 'Ménara',
      airroiListings: 255,
      adrMedian: 1280,
      occupancyAvg: 0.41,
      myListingsCount: 4,
    },
    palmeraie: {
      zoneId: 'palmeraie',
      zoneName: 'Palmeraie',
      airroiListings: 300,
      adrMedian: 2400,
      occupancyAvg: 0.38,
      myListingsCount: 4,
    },
    agdal: {
      zoneId: 'agdal',
      zoneName: 'Agdal',
      airroiListings: 150,
      adrMedian: 1100,
      occupancyAvg: 0.45,
      myListingsCount: 2,
    },
  };
}

function scoreForIndex(i: number): number {
  if (i % 5 === 0) return 78 + (i % 15);
  if (i % 3 === 0) return 52 + (i % 20);
  return 18 + (i % 22);
}

function modeForAiIndex(i: number): TokenPricingMode | undefined {
  const modes: TokenPricingMode[] = ['prudent', 'balanced', 'aggressive'];
  return modes[i % 3];
}

export function buildPortfolioRows(): PortfolioRow[] {
  const rows: PortfolioRow[] = [];
  let idx = 0;
  for (const { key, count } of ZONE_DIST) {
    const z = ZONE_META[key];
    for (let j = 0; j < count; j++) {
      const id = idx === 2 ? MAJORELLE_ID : `sj-mock-${idx + 1}`;
      const aiEnabled = idx < 24;
      const score = idx === 2 ? 25 : scoreForIndex(idx);
      const potentialP50 =
        idx === 2 ? 199_260 : 120_000 + (idx % 7) * 45_000 + (j % 3) * 12_000;
      const realized = idx === 2 ? 45_200 : Math.round(potentialP50 * (0.15 + (idx % 5) * 0.08));
      const name =
        idx === 2
          ? 'Sojori Majorelle pool and parking'
          : `${NAMES[idx % NAMES.length]} ${idx + 1}`;

      const listing: Listing = {
        _id: id,
        name,
        district: z.district,
        city: 'Marrakech',
        airroiZoneAvailable: key !== 'hivernage' && key !== 'palmeraie' && key !== 'agdal',
        bedrooms: 1 + (idx % 3),
        guests: 2 + (idx % 5),
        amenities: ['wifi', 'pool', 'parking'].slice(0, 1 + (idx % 3)),
        position: {
          lat: 31.62 + (idx % 10) * 0.004,
          lng: -8.01 - (idx % 8) * 0.003,
        },
      };

      const perf: ListingPerformance = {
        potentialAnnualMad: {
          p25: Math.round(potentialP50 * 0.82),
          p50: potentialP50,
          p75: Math.round(potentialP50 * 1.45),
        },
        realizedTtmMad: realized,
        occupancyTtm: idx === 2 ? 0.183 : 0.12 + (idx % 6) * 0.05,
        adrTtm: idx === 2 ? 1183 : 900 + (idx % 9) * 80,
        reviews: idx === 2 ? 1 : 5 + (idx % 40),
        starRating: idx === 2 ? 4.5 : 4.2 + (idx % 8) * 0.08,
        scorePerformance: score,
      };

      rows.push({
        listing,
        perf,
        aiEnabled,
        mode: aiEnabled ? modeForAiIndex(idx) : undefined,
        bounds: aiEnabled ? { floor: 800 + (idx % 5) * 100, ceiling: 2200 + (idx % 4) * 300 } : undefined,
        thumbColor: ((idx % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
      });
      idx++;
    }
  }
  return rows;
}

export function buildMapPins(rows: PortfolioRow[]): PortfolioMapPin[] {
  return rows.map((row, i) => {
    const zoneKey =
      Object.entries(ZONE_META).find(([, z]) => z.district === row.listing.district)?.[0] ?? 'gueliz';
    const z = ZONE_META[zoneKey as keyof typeof ZONE_META];
    const ratio = row.perf.potentialAnnualMad.p50
      ? row.perf.realizedTtmMad / row.perf.potentialAnnualMad.p50
      : 0;
    const lat = row.listing.position?.lat ?? 31.62 + (i % 5) * 0.015;
    const lng = row.listing.position?.lng ?? -8.02 + (i % 4) * 0.012;
    return {
      id: row.listing._id,
      listingName: row.listing.name,
      performanceRatio: Math.min(1.2, ratio),
      potentialMad: row.perf.potentialAnnualMad.p50,
      aiEnabled: row.aiEnabled,
      rating: row.perf.starRating,
      lat,
      lng,
    };
  });
}

export function generateYearlyMock(year = 2026): CalendarDay[] {
  const days: CalendarDay[] = [];
  const eventRanges = [
    { start: '2026-12-28', end: '2027-01-02', status: 'override' as const },
    { start: '2027-03-14', end: '2027-03-18', status: 'override' as const },
    { start: '2026-06-22', end: '2026-06-26', status: 'anomaly' as const },
  ];
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dayCount = isLeap(year) ? 366 : 365;

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(Date.UTC(year, 0, 1 + i));
    const iso = d.toISOString().slice(0, 10);
    let status: CalendarDay['status'] = 'std';
    if (d.getUTCDay() === 5 || d.getUTCDay() === 6) status = i % 7 === 0 ? 'prem' : 'std';
    if (i % 41 === 0) status = 'clamp';
    if (i % 53 === 0) status = 'blocked';
    for (const ev of eventRanges) {
      if (iso >= ev.start && iso <= ev.end) status = ev.status;
    }
    const base = 1500 + Math.sin((i / 365) * Math.PI * 2) * 280;
    days.push({
      date: iso,
      status,
      recommendedPrice: Math.round(base + (i % 13) * 12),
    });
  }
  return days;
}

const REAL_COMPS = [
  { name: 'GUELIZ & MEDINA – MARRAKECH', adr: 730, occ: 0.27, rating: 4.91, reviews: 120 },
  { name: 'Riad Cinema Marrakech Medina', adr: 915, occ: 0.27, rating: 4.57, reviews: 85 },
  { name: 'Apartment with rooftop pool.', adr: 1108, occ: 0.63, rating: 4.89, reviews: 210 },
  { name: 'Exclusive apartment in the city center', adr: 1140, occ: 0.39, rating: 4.85, reviews: 156 },
  { name: 'Mini Loft - Maxi Charm', adr: 943, occ: 0.13, rating: 4.72, reviews: 44 },
  { name: 'Gueliz Medina Apt', adr: 1750, occ: 0.27, rating: 4.91, reviews: 98 },
];

export function generateCompsMock(count = 25): CompListing[] {
  const out: CompListing[] = [];
  for (let i = 0; i < count; i++) {
    const base = REAL_COMPS[i % REAL_COMPS.length];
    out.push({
      _id: `comp-${i + 1}`,
      name: i < REAL_COMPS.length ? base.name : `Comp Guéliz ${i + 1}`,
      distance: 120 + i * 85,
      rating: base.rating,
      reviews: base.reviews + i,
      bedrooms: 2,
      adrTtm: base.adr + (i % 4) * 40,
      occTtm: base.occ,
      revenueTtm: Math.round(base.adr * base.occ * 365),
      position: { lat: 31.634 + (i % 5) * 0.002, lng: -8.008 + (i % 4) * 0.002 },
    });
  }
  return out;
}

export function buildCompRows(listingName: string): CompRow[] {
  const comps = generateCompsMock(25);
  const rows: CompRow[] = [
    {
      id: MAJORELLE_ID,
      isSelf: true,
      name: listingName,
      photoGradient: 1,
      distanceMeters: null,
      rating: 4.5,
      reviews: 1,
      bedrooms: 2,
      adrTtm: 1183,
      occupancyTtm: 0.183,
      revenueTtm: 45_200,
    },
    ...comps.map((c, i) => ({
      id: c._id,
      name: c.name,
      photoGradient: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      distanceMeters: c.distance,
      rating: c.rating,
      reviews: c.reviews,
      bedrooms: c.bedrooms,
      adrTtm: c.adrTtm,
      occupancyTtm: c.occTtm,
      revenueTtm: c.revenueTtm,
    })),
  ];
  return rows;
}

export function buildCompMapPins(): CompMapPin[] {
  const baseLat = 31.6295;
  const baseLng = -7.9811;
  return generateCompsMock(25).map((c, i) => {
    const angle = (i * 2.399) % (Math.PI * 2);
    const km = 0.003 + (i % 8) * 0.004;
    const dLat = (Math.cos(angle) * km) / 111;
    const dLng = (Math.sin(angle) * km) / (111 * Math.cos((baseLat * Math.PI) / 180));
    return {
      id: c._id,
      name: c.name,
      adr: c.adrTtm,
      occupancy: c.occTtm,
      rating: c.rating,
      lat: baseLat + dLat,
      lng: baseLng + dLng,
      ratingColor: c.rating >= 4.8 ? '#0a8f5e' : c.rating >= 4.5 ? '#c79b22' : '#a5d165',
    };
  });
}

export function buildMarketChartsData(): {
  kpis: MarketKpis;
  seasonality: SeasonalityPoint[];
  pacing: PacingPoint[];
  supplyGrowth: SupplyGrowthPoint[];
} {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return {
    kpis: {
      occupancyAvg: 0.44,
      adrMedianDistrict: 1097,
      adrMedianCity: 1542,
      supplyGrowthPct: 250,
      leadTimeDays: 18,
      avgStayNights: 3.2,
    },
    seasonality: months.map((month, i) => ({
      month,
      occupancy: 32 + Math.round(18 * Math.sin((i / 12) * Math.PI * 2 + 0.5)),
      adr: 950 + Math.round(350 * Math.sin((i / 12) * Math.PI * 2)),
    })),
    pacing: months.map((month, i) => ({
      month,
      fillRate: 15 + Math.round(22 * Math.sin((i / 12) * Math.PI * 2 + 1)),
    })),
    supplyGrowth: [
      { label: 'Jan 24', listingCount: 3200 },
      { label: 'Jul 24', listingCount: 4100 },
      { label: 'Jan 25', listingCount: 5200 },
      { label: 'Jul 25', listingCount: 6800 },
      { label: 'Jan 26', listingCount: 8220 },
    ],
  };
}

/** Mode UI PricingControls (équilibre) vs token (balanced) */
export function tokenModeToUi(mode: TokenPricingMode): PricingMode {
  if (mode === 'prudent') return 'prudent';
  if (mode === 'aggressive') return 'agressif';
  return 'equilibre';
}

export function uiModeToToken(mode: PricingMode): TokenPricingMode {
  if (mode === 'prudent') return 'prudent';
  if (mode === 'agressif') return 'aggressive';
  return 'balanced';
}

export function defaultEvents(): PricingEvent[] {
  return [
    {
      id: '1',
      emoji: '🎭',
      name: 'Marrakech du Rire',
      dateRange: '14-18 mars 2027',
      kind: 'fixed',
      fixedPrice: 3500,
      marketPercent: 100,
      minNights: 3,
    },
    {
      id: '2',
      emoji: '🎄',
      name: 'Nouvel An',
      dateRange: '28 déc 2026 – 2 jan 2027',
      kind: 'fixed',
      fixedPrice: 2800,
      marketPercent: 100,
      minNights: 4,
    },
  ];
}

export function defaultSuggestions(): PricingSuggestion[] {
  return [
    {
      id: 's1',
      dateRange: '22-26 juin 2026',
      reason: 'Anomalie de demande détectée (+47% vs baseline)',
      deltaPct: 47,
    },
  ];
}

export type BienPerformanceView = {
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
};

export function buildMajorelleListing(): Listing & { airroiZone: string; maxGuests: number } {
  return {
    _id: MAJORELLE_ID,
    name: 'Sojori Majorelle pool and parking',
    district: 'Guéliz',
    city: 'Marrakech',
    airroiZoneAvailable: true,
    airroiZone: 'Guéliz',
    bedrooms: 2,
    guests: 4,
    maxGuests: 4,
    amenities: ['pool', 'free_parking', 'wifi', 'ac', 'kitchen', 'washer', 'dryer', 'tv', 'bathtub'],
    position: { lat: 31.6413, lng: -8.0021 },
  };
}

export function buildMajorellePerformance(): BienPerformanceView {
  return {
    potentialAnnual: { p25: 165_000, p50: 199_260, p75: 288_850, currency: 'MAD' },
    potentialUsd: 19_926,
    ttm: {
      ttmRevenue: 45_200,
      ttmUsd: 4_520,
      occupancy: 0.183,
      adr: 1183,
      nights: 67,
      quartile: 'P25',
    },
    pacing: {
      fillRate: 0.42,
      monthLabel: 'Mai 2026',
      trendPct: -8,
      compsCount: 25,
      avgAdr: 1240,
      leadTimeDays: 18,
      avgStayNights: 3.1,
      cityFillRate: 0.44,
    },
  };
}

export const DEFAULT_MARKET_SCOPE: MarketScope = 'comps';
