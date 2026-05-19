import type { AnalyticsQuery, AnalyticsSnapshot } from '../types/analytics.types';
import {
  mockAnalyticsKPIs,
  mockGuestDemographics,
  mockLeadTimeDistribution,
  mockLengthOfStay,
  mockPropertyPerformance,
  mockRevenueEvolution,
  mockSeasonality,
  mockSourceBreakdown,
} from '../data/mockAnalytics';

const mockSnapshot: AnalyticsSnapshot = {
  periodLabel: 'Mock · 30 jours',
  kpis: {
    performanceScore: mockAnalyticsKPIs.performanceScore,
    performanceScoreTrend: 3.2,
    averageStay: mockAnalyticsKPIs.averageStay,
    averageStayTrend: 0.4,
    leadTime: mockAnalyticsKPIs.leadTime,
    leadTimeTrend: -2,
    cancellationRate: mockAnalyticsKPIs.cancellationRate,
    cancellationRateTrend: -0.8,
  },
  properties: mockPropertyPerformance.map((row) => ({
    id: row.id,
    label: row.property,
  })),
  channelShare: mockSourceBreakdown.map((item) => ({
    source: item.source,
    bookings: item.bookings,
    revenue: item.revenue,
    share: item.share,
    value: item.share,
  })),
  propertyPerformance: mockPropertyPerformance.map((row) => ({
    property: row.property,
    revenue: row.revenue,
    occupancy: row.occupancy,
    adr: row.adr,
    leadTime: row.leadTime,
    cancellations: row.cancellations,
  })),
  revenueEvolution: mockRevenueEvolution,
  seasonality: mockSeasonality,
  guestDemographics: mockGuestDemographics,
  lengthOfStay: mockLengthOfStay,
  leadTimeDistribution: mockLeadTimeDistribution,
};

export const analyticsService = {
  async getSnapshot(_query: AnalyticsQuery): Promise<AnalyticsSnapshot> {
    return mockSnapshot;
  },
  async downloadPerformanceCsv(_query: AnalyticsQuery): Promise<void> {
    console.info('[analytics] CSV export (mock)');
  },
};
