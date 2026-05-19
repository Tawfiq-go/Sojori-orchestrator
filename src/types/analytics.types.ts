export const analyticsPeriodOptions = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: 'custom', label: 'Personnalisé' },
] as const;

export type AnalyticsPeriod = (typeof analyticsPeriodOptions)[number]['value'];

export interface AnalyticsQuery {
  period: AnalyticsPeriod;
  comparison: 'vs-last-period' | 'vs-last-year';
  source: string;
  listingIds: string[];
  customStartDate?: string;
  customEndDate?: string;
}

export interface AnalyticsPropertyOption {
  id: string;
  label: string;
}

export interface AnalyticsKPIs {
  performanceScore: number;
  performanceScoreTrend: number;
  averageStay: number;
  averageStayTrend: number;
  leadTime: number;
  leadTimeTrend: number;
  cancellationRate: number;
  cancellationRateTrend: number;
}

export interface AnalyticsDistributionItem {
  source?: string;
  value?: number;
  revenue?: number;
  bookings?: number;
  share?: number;
  bucket?: string;
  count?: number;
}

export interface AnalyticsPropertyPerformanceRow {
  property: string;
  revenue: number;
  occupancy: number;
  adr: number;
  leadTime: number;
  cancellations: number;
}

export interface AnalyticsRevenuePoint {
  label: string;
  current: number;
  previous: number;
}

export interface AnalyticsSeasonalityPoint {
  month: string;
  occupancy: number;
  adr?: number;
}

export interface AnalyticsGuestDemographic {
  country: string;
  guests: number;
}

export interface AnalyticsBucketCount {
  bucket: string;
  count: number;
}

export interface AnalyticsSnapshot {
  periodLabel: string;
  kpis: AnalyticsKPIs;
  properties: AnalyticsPropertyOption[];
  channelShare: AnalyticsDistributionItem[];
  propertyPerformance: AnalyticsPropertyPerformanceRow[];
  revenueEvolution: AnalyticsRevenuePoint[];
  seasonality: AnalyticsSeasonalityPoint[];
  guestDemographics: AnalyticsGuestDemographic[];
  lengthOfStay: AnalyticsBucketCount[];
  leadTimeDistribution: AnalyticsBucketCount[];
}
