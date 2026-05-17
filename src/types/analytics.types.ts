export const analyticsPeriodOptions = [
  { value: '7d', label: '7j' },
  { value: '30d', label: '30j' },
  { value: '3m', label: '3m' },
  { value: '1y', label: '1an' },
  { value: 'custom', label: 'Custom' },
] as const;

export type AnalyticsPeriodValue = (typeof analyticsPeriodOptions)[number]['value'];
export type AnalyticsComparison = 'vs-last-period' | 'vs-last-year';
export type AnalyticsGranularity = 'day' | 'week' | 'month';

export interface AnalyticsQuery {
  period: AnalyticsPeriodValue;
  comparison: AnalyticsComparison;
  source?: string;
  listingIds?: string[];
  customStartDate?: string;
  customEndDate?: string;
  staging?: boolean;
  active?: string[];
}

export interface AnalyticsPropertyOption {
  id: string;
  name: string;
  label: string;
  city?: string;
  isActive: boolean;
}

export interface AnalyticsMetric {
  value: number;
  trend: number;
}

export interface AnalyticsSummary {
  revenue: AnalyticsMetric;
  bookedNights: AnalyticsMetric;
  occupancyRate: AnalyticsMetric;
  averageDailyRate: AnalyticsMetric;
  averageRevenuePerStay: AnalyticsMetric;
}

export interface AnalyticsKpiCards {
  performanceScore: number;
  performanceScoreTrend: number;
  averageStay: number;
  averageStayTrend: number;
  leadTime: number;
  leadTimeTrend: number;
  cancellationRate: number;
  cancellationRateTrend: number;
}

export interface AnalyticsRevenuePoint {
  label: string;
  current: number;
  previous: number;
}

export interface AnalyticsChannelShareItem {
  source: string;
  bookings: number;
  revenue: number;
  share: number;
}

export interface AnalyticsOccupancyItem {
  property: string;
  occupancy: number;
}

export interface AnalyticsSeasonalityItem {
  month: string;
  occupancy: number;
}

export interface AnalyticsGuestDemographicsItem {
  country: string;
  guests: number;
}

export interface AnalyticsDistributionItem {
  bucket: string;
  count: number;
}

export interface AnalyticsPropertyPerformanceRow {
  id: string;
  property: string;
  revenue: number;
  occupancy: number;
  adr: number;
  leadTime: number;
  cancellations: number;
}

export interface AnalyticsSnapshot {
  periodLabel: string;
  availableSources: string[];
  properties: AnalyticsPropertyOption[];
  kpis: AnalyticsKpiCards;
  summary: AnalyticsSummary;
  revenueEvolution: AnalyticsRevenuePoint[];
  channelShare: AnalyticsChannelShareItem[];
  seasonality: AnalyticsSeasonalityItem[];
  occupancyByProperty: AnalyticsOccupancyItem[];
  guestDemographics: AnalyticsGuestDemographicsItem[];
  lengthOfStay: AnalyticsDistributionItem[];
  leadTimeDistribution: AnalyticsDistributionItem[];
  propertyPerformance: AnalyticsPropertyPerformanceRow[];
}

export interface AnalyticsApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  byItems?: T;
  totals?: Record<string, unknown>;
  reservationCounts?: AnalyticsReservationCountRaw[];
  result?: unknown;
}

export interface AnalyticsTimelineKey {
  year: number;
  month?: number;
  date?: number;
  week?: number;
}

export interface AnalyticsRevenueTimelineRaw {
  x: AnalyticsTimelineKey;
  y: number | string;
  [key: string]: unknown;
}

export interface AnalyticsChannelStatRaw {
  label: string;
  value: number | string;
}

export interface AnalyticsChannelMetricRaw {
  x: {
    month: string;
  };
  color?: string;
  y: number | string;
}

export interface AnalyticsReservationPercentageRaw {
  reservationTotal: number | string;
  graphData: AnalyticsChannelMetricRaw[];
}

export interface AnalyticsReservationCountRaw {
  _id: string;
  totalReservations: number | string;
}

export interface AnalyticsPerformanceRaw {
  itemId: string;
  itemName: string;
  totalRevenue: number | string;
  nightsBooked: number | string;
  totalCheckIns: number | string;
  cancelations: number | string;
  occupancyRate: number | string;
  averageNightlyRate: number | string;
  averageRevenuePerStay: number | string;
}

export interface AnalyticsReservationRowRaw {
  _id?: string;
  id?: string;
  sojoriId?: string;
  listingId?: string;
  listingName?: string;
  reservationDate?: string;
  createdAt?: string;
  arrivalDate?: string;
  departureDate?: string;
  guestCountry?: string;
  channelName?: string;
  status?: string;
  listing?: {
    name?: string;
  };
}
