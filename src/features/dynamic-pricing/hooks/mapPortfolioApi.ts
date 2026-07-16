import type { PortfolioMapPin } from '../PortfolioMap';
import type { MarketCityKpis, PortfolioZoneStats } from '../PortfolioView';
import type { PortfolioMacro, PortfolioRow, Listing } from '../_tokens';
import type { PortfolioApiResponse, PortfolioListingDto } from '../../../services/dynamicPricingApi';
import { isExploitableListing } from '../listingFilters';
import { chartsFromApi } from '../utils/extractMarketChartsFromApi';
import type { SeasonalityPoint, PacingPoint, SupplyGrowthPoint } from '../bien/MarketCharts';

const USD_TO_MAD = 10;

function toListingRow(dto: PortfolioListingDto, index: number): PortfolioRow {
  const listing: Listing = {
    _id: dto.id,
    name: dto.name,
    district: dto.district ?? dto.airroiRaw?.district ?? '—',
    city: dto.city ?? 'Marrakech',
    airroiZoneAvailable: true,
    bedrooms: dto.bedrooms ?? dto.airroiRaw?.bedrooms ?? 0,
    bathrooms: dto.bathrooms ?? undefined,
    guests: dto.guests ?? dto.airroiRaw?.guests ?? 0,
    amenities: [],
    position:
      dto.lat != null && dto.lng != null
        ? { lat: dto.lat, lng: dto.lng }
        : undefined,
    ruPropertyKey: dto.ruPropertyKey ?? null,
    airbnbConnected: Boolean(dto.airbnbConnected ?? dto.airbnbListingId),
    airbnbListingId: dto.airbnbListingId ?? null,
    airbnbPublicUrl: dto.airbnbPublicUrl ?? null,
    airbnbStatus: dto.airbnbStatus ?? null,
    airbnbMarkup: dto.airbnbMarkup ?? null,
    otaVerifiedAt: dto.otaVerifiedAt ?? null,
  };
  return {
    listingActive: dto.active !== false,
    listing,
    airroiRaw: dto.airroiRaw ?? null,
    hasAirroiSnapshot: Boolean(dto.hasAirroiSnapshot),
    hasRevenueEstimate: Boolean(dto.hasRevenueEstimate),
    estimateSummary: dto.estimateSummary ?? null,
    airroiGeoUsed: dto.airroiGeoUsed ?? null,
    airroiSnapshotAt: dto.airroiSnapshotAt
      ? new Date(dto.airroiSnapshotAt).toISOString()
      : null,
    calendarAppliedAt: dto.calendarAppliedAt
      ? new Date(dto.calendarAppliedAt).toISOString()
      : null,
    otaPushedAt: dto.otaPushedAt ? new Date(dto.otaPushedAt).toISOString() : null,
    lastApplyDaysChanged: dto.lastApplyDaysChanged ?? null,
    airroiSnapshotCostUsd: dto.airroiSnapshotCostUsd ?? null,
    airroiComps: dto.airroiComps ?? [],
    airroiCompsCount: dto.airroiCompsCount ?? dto.airroiComps?.length ?? 0,
    airroiCalendarDays: dto.airroiCalendarDays ?? [],
    airroiCalendarDaysCount: dto.airroiCalendarDaysCount ?? dto.airroiCalendarDays?.length ?? 0,
    perfMeta: dto.perfMeta,
    aiEnabled: dto.pilotConfig?.enabled ?? dto.useDynamicPrice,
    mode: dto.pilotConfig?.mode as PortfolioRow['mode'],
    bounds: dto.pilotConfig
      ? { floor: dto.pilotConfig.floorNormal, ceiling: dto.pilotConfig.ceiling }
      : undefined,
    pilotConfig: dto.pilotConfig ?? null,
    thumbColor: dto.thumbColor ?? (((index % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6),
  };
}

export function mapPortfolioApiToView(data: PortfolioApiResponse): {
  macro: PortfolioMacro;
  cityKpis: MarketCityKpis;
  zoneStats: Record<string, PortfolioZoneStats>;
  mapPins: PortfolioMapPin[];
  rows: PortfolioRow[];
  marketCache?: PortfolioApiResponse['marketCache'];
  marketCharts: {
    seasonality: SeasonalityPoint[];
    pacing: PacingPoint[];
    supplyGrowth: SupplyGrowthPoint[];
    hasCharts: boolean;
  };
} {
  const rows = data.listings
    .filter((l) => l.active !== false && isExploitableListing(l.name))
    .map((l, i) => toListingRow(l, i));
  const mapPins: PortfolioMapPin[] = rows
    .map((row) => {
      const ar = row.airroiRaw;
      const lat = ar?.latitude ?? row.listing.position?.lat;
      const lng = ar?.longitude ?? row.listing.position?.lng;
      if (lat == null || lng == null) return null;
      const rev = ar?.ttm_revenue;
      return {
        id: row.listing._id,
        listingName: row.listing.name,
        performanceRatio: rev != null ? Math.min(1.2, rev / 50000) : 0,
        potentialMad: rev != null ? Math.round(rev * USD_TO_MAD) : 0,
        aiEnabled: row.aiEnabled,
        rating: ar?.rating_overall ?? 0,
        lat: Number(lat),
        lng: Number(lng),
      };
    })
    .filter((p): p is PortfolioMapPin => p != null);

  const zoneStats: Record<string, PortfolioZoneStats> = {};
  for (const [k, z] of Object.entries(data.zoneStats ?? {})) {
    zoneStats[k] = {
      zoneId: z.zoneId,
      zoneName: z.zoneName,
      airroiListings: z.airroiListings,
      adrMedian: z.adrMedian,
      occupancyAvg: z.occupancyAvg,
      myListingsCount: z.myListingsCount,
    };
  }

  return {
    macro: data.macro,
    cityKpis: data.cityKpis,
    zoneStats,
    mapPins,
    rows,
    marketCache: data.marketCache,
    marketCharts: chartsFromApi(data.marketCharts),
  };
}
