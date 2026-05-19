import {
  mockAlerts,
  mockCheckFlow,
  mockDashboardKPIs,
  mockOccupancyByProperty,
  mockRecentReviews,
  mockRevenueChart,
  mockSourceDistribution,
  mockUnreadMessages,
  mockUpcomingCheckIns,
  mockUpcomingCheckOuts,
  mockUrgentTasks,
} from '../data/mockDashboard';
import type { DashboardPeriod, DashboardSnapshot } from '../types/dashboard.types';

export const dashboardService = {
  async getSnapshot(_params: {
    period: DashboardPeriod;
    listingIds: string[];
  }): Promise<DashboardSnapshot> {
    return {
      properties: [],
      kpis: {
        totalReservations: mockDashboardKPIs.totalReservations,
        monthlyRevenue: mockDashboardKPIs.monthlyRevenue,
        occupancyRate: mockDashboardKPIs.occupancyRate,
        adr: mockDashboardKPIs.adr,
        revpar: mockDashboardKPIs.revpar,
        guestsThisMonth: mockDashboardKPIs.guestsThisMonth,
        activeProperties: mockDashboardKPIs.activeProperties,
        averageRating: mockDashboardKPIs.averageRating,
      },
      revenueChart: mockRevenueChart,
      sourceDistribution: mockSourceDistribution,
      occupancyByProperty: mockOccupancyByProperty,
      alerts: mockAlerts.map((a) => ({
        id: a.id,
        severity: a.severity as 'info' | 'warning' | 'error' | 'success',
        title: a.title,
        detail: a.detail,
      })),
      checkFlow: mockCheckFlow,
      upcomingCheckIns: mockUpcomingCheckIns,
      upcomingCheckOuts: mockUpcomingCheckOuts,
      recentBookings: [],
      urgentTasks: mockUrgentTasks,
      unreadMessages: mockUnreadMessages,
      recentReviews: mockRecentReviews,
    };
  },
};
