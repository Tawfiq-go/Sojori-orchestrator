export type DashboardPeriod = 'Aujourd’hui' | 'Semaine' | 'Mois' | 'Année' | 'Personnalisé';

export interface DashboardPropertyOption {
  id: string;
  name: string;
}

export interface DashboardAlertItem {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  detail: string;
}

export interface DashboardSnapshot {
  properties: DashboardPropertyOption[];
  kpis: Record<string, { value: number; trend?: string }>;
  revenueChart: Array<Record<string, string | number>>;
  sourceDistribution: Array<Record<string, string | number>>;
  occupancyByProperty: Array<Record<string, string | number>>;
  alerts: DashboardAlertItem[];
  checkFlow: Array<Record<string, string | number>>;
  upcomingCheckIns: Array<Record<string, string>>;
  upcomingCheckOuts: Array<Record<string, string>>;
  recentBookings: Array<Record<string, string>>;
  urgentTasks: Array<Record<string, string>>;
  unreadMessages: Array<Record<string, string>>;
  recentReviews: Array<Record<string, string | number>>;
}
