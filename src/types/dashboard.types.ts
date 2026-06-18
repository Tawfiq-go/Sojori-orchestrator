export type DashboardPeriod = 'Aujourd’hui' | 'Semaine' | 'Mois' | 'Année' | 'Personnalisé';

export interface DashboardPropertyOption {
  id: string;
  label: string;
  name: string;
  city?: string;
  isActive?: boolean;
}

export interface DashboardListingStatsRaw {
  totalListing?: number;
  totalActive?: number;
  totalInactive?: number;
}

export interface DashboardReservationStatsRaw {
  totalRevenueLast30Days?: number;
  totalRevenuePercentageChange?: number | string;
  avgRevenueLast30Days?: number;
  avgRevenuePercentageChange?: number | string;
  reservationLast30Days?: number;
  reservationPercentageChange?: number | string;
  checkInsLast30Days?: number;
  checkInsPercentageChange?: number | string;
  checkInsToday?: number;
  checkOutsToday?: number;
  stayingGuests?: number;
  pendingReservations?: number;
  pendingInquiries?: number;
}

export interface DashboardMessageBucketRaw {
  total?: number;
  average?: number;
  change?: number | string;
}

export interface DashboardUnreadThreadRaw {
  id?: string;
  from?: string;
  preview?: string;
  channel?: string;
}

export interface DashboardMessageStatsRaw {
  sent?: DashboardMessageBucketRaw;
  received?: DashboardMessageBucketRaw;
  automation?: DashboardMessageBucketRaw;
  unreadThreads?: DashboardUnreadThreadRaw[];
}

export interface DashboardOccupancyRateRaw {
  occupancyRate?: number;
}

export interface DashboardAverageDailyRateRaw {
  averageDailyRate?: number;
}

export interface DashboardRevenueByChannelRaw {
  channelName?: string;
  channel?: string;
  color?: string;
  totalRevenue?: number;
  revenue?: number;
  reservationCount?: number;
  y?: number | string;
  x?: { month?: string };
  _id?: string;
}

export interface DashboardCheckinsByChannelRaw {
  _id?: string;
  date?: string;
  count?: number;
  checkIns?: number;
  revenue?: number;
  x?: {
    year?: number;
    month?: number;
    date?: number;
    week?: number;
  };
  y?: number;
  sojori?: number;
  BookingCom?: number;
  AirBNB?: number;
}

export interface DashboardListingMonthRaw {
  month?: string;
  occupancy?: number;
}

export interface DashboardOccupancyByListingRaw {
  listingId?: string;
  listingMonth?: DashboardListingMonthRaw[];
}

export interface DashboardKpiValue {
  value: number;
  trend: string;
}

export interface DashboardKpis {
  totalReservations: DashboardKpiValue;
  monthlyRevenue: DashboardKpiValue;
  occupancyRate: DashboardKpiValue;
  adr: DashboardKpiValue;
  revpar: DashboardKpiValue;
  guestsThisMonth: DashboardKpiValue;
  activeProperties: DashboardKpiValue;
  averageRating: DashboardKpiValue;
}

export interface DashboardRevenuePoint {
  date: string;
  revenue: number;
  bookings: number;
}

export interface DashboardSourceDistributionItem {
  source: string;
  value: number;
  revenue: number;
}

export interface DashboardOccupancyByPropertyItem {
  property: string;
  occupancy: number;
  adr?: number;
  /** Listing Mongo id — clé React stable quand `property` est un libellé générique. */
  listingId?: string;
}

export interface DashboardAlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export interface DashboardCheckFlowItem {
  label: string;
  checkIns: number;
  checkOuts: number;
}

export interface DashboardBookingItem {
  id: string;
  guest: string;
  property: string;
  when: string;
  source: string;
  type?: string;
}

export interface DashboardTaskItem {
  id: string;
  label: string;
  priority: string;
  owner: string;
  due: string;
}

export interface DashboardUnreadMessageItem {
  id: string;
  from: string;
  channel: string;
  preview: string;
}

export interface DashboardReviewItem {
  id: string;
  guest: string;
  property: string;
  rating: number;
  comment: string;
}

export interface DashboardOverviewRaw {
  averageRating?: number;
  checkFlow?: DashboardCheckFlowItem[];
  upcomingCheckIns?: DashboardBookingItem[];
  upcomingCheckOuts?: DashboardBookingItem[];
  recentBookings?: DashboardBookingItem[];
  urgentTasks?: DashboardTaskItem[];
  unreadMessages?: DashboardUnreadMessageItem[];
  recentReviews?: DashboardReviewItem[];
  /** Pré-agrégé côté srv-admin (calendrier + listings), évite le mock côté client */
  occupancyByProperty?: DashboardOccupancyByPropertyItem[];
}

export interface DashboardSnapshot {
  /** IDs listings (annuaire + check-in/out) quand `properties` est vide (timeout annuaire). */
  listingIdsHint?: string[];
  properties: DashboardPropertyOption[];
  kpis: DashboardKpis;
  revenueChart: DashboardRevenuePoint[];
  sourceDistribution: DashboardSourceDistributionItem[];
  occupancyByProperty: DashboardOccupancyByPropertyItem[];
  alerts: DashboardAlertItem[];
  checkFlow: DashboardCheckFlowItem[];
  upcomingCheckIns: DashboardBookingItem[];
  upcomingCheckOuts: DashboardBookingItem[];
  recentBookings: DashboardBookingItem[];
  urgentTasks: DashboardTaskItem[];
  unreadMessages: DashboardUnreadMessageItem[];
  recentReviews: DashboardReviewItem[];
}

export interface DashboardQuery {
  period: DashboardPeriod;
  listingIds?: string[];
  staging?: boolean;
  /** Annule les appels axios quand l’effet React est nettoyé (Strict Mode / changement de filtres). */
  signal?: AbortSignal;
}
