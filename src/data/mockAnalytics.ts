export const analyticsPeriods = [
  { value: 'this-month', label: 'Ce mois' },
  { value: 'last-month', label: 'Mois dernier' },
  { value: 'this-year', label: 'Cette annee' },
  { value: 'last-year', label: 'Annee derniere' },
] as const;

export const analyticsSources = ['Tous', 'Airbnb', 'Booking.com', 'Direct', 'Vrbo'] as const;

export const mockAnalyticsKPIs = {
  performanceScore: 92,
  averageStay: 4.8,
  leadTime: 21,
  cancellationRate: 7.1,
  repeatGuestRate: 18,
  directShare: 15,
};

export const mockPropertyPerformance = [
  { id: 'perf-1', property: 'Villa Belvedere', revenue: 9120, occupancy: 94, adr: 184, revpar: 173, avgStay: 5.2, leadTime: 26, cancellations: 2 },
  { id: 'perf-2', property: 'Riad Atlas', revenue: 8340, occupancy: 91, adr: 152, revpar: 138, avgStay: 4.9, leadTime: 22, cancellations: 1 },
  { id: 'perf-3', property: 'Loft Port Lympia', revenue: 7680, occupancy: 86, adr: 164, revpar: 141, avgStay: 3.8, leadTime: 18, cancellations: 3 },
  { id: 'perf-4', property: 'Dar Sojori', revenue: 7215, occupancy: 88, adr: 129, revpar: 113, avgStay: 4.4, leadTime: 16, cancellations: 2 },
  { id: 'perf-5', property: 'Casa Azure', revenue: 5640, occupancy: 79, adr: 117, revpar: 92, avgStay: 3.5, leadTime: 13, cancellations: 4 },
];

export const mockRevenueEvolution = [
  { label: 'Jan', current: 28400, previous: 25100 },
  { label: 'Feb', current: 29650, previous: 26200 },
  { label: 'Mar', current: 33120, previous: 27540 },
  { label: 'Apr', current: 38420, previous: 30980 },
  { label: 'May', current: 45380, previous: 37150 },
  { label: 'Jun', current: 47240, previous: 38990 },
];

export const mockSeasonality = [
  { month: 'Jan', occupancy: 62, adr: 118 },
  { month: 'Feb', occupancy: 66, adr: 121 },
  { month: 'Mar', occupancy: 71, adr: 127 },
  { month: 'Apr', occupancy: 78, adr: 134 },
  { month: 'May', occupancy: 87, adr: 142 },
  { month: 'Jun', occupancy: 91, adr: 149 },
  { month: 'Jul', occupancy: 96, adr: 168 },
  { month: 'Aug', occupancy: 95, adr: 171 },
  { month: 'Sep', occupancy: 84, adr: 148 },
  { month: 'Oct', occupancy: 76, adr: 136 },
  { month: 'Nov', occupancy: 68, adr: 124 },
  { month: 'Dec', occupancy: 73, adr: 132 },
];

export const mockSourceBreakdown = [
  { source: 'Airbnb', bookings: 106, revenue: 20000, share: 45 },
  { source: 'Booking.com', bookings: 70, revenue: 13500, share: 30 },
  { source: 'Direct', bookings: 35, revenue: 6800, share: 15 },
  { source: 'Vrbo', bookings: 23, revenue: 5080, share: 10 },
];

export const mockGuestDemographics = [
  { country: 'France', guests: 128 },
  { country: 'United States', guests: 92 },
  { country: 'United Kingdom', guests: 66 },
  { country: 'Italy', guests: 54 },
  { country: 'Germany', guests: 43 },
];

export const mockLengthOfStay = [
  { bucket: '1-2 nuits', count: 48 },
  { bucket: '3-4 nuits', count: 91 },
  { bucket: '5-7 nuits', count: 62 },
  { bucket: '8-14 nuits', count: 25 },
  { bucket: '15+ nuits', count: 8 },
];

export const mockLeadTimeDistribution = [
  { bucket: '0-3 jours', count: 18 },
  { bucket: '4-7 jours', count: 37 },
  { bucket: '8-14 jours', count: 61 },
  { bucket: '15-30 jours', count: 72 },
  { bucket: '30+ jours', count: 46 },
];

export const mockReportTemplates = [
  {
    id: 'report-financial',
    name: 'Rapport financier',
    description: 'Revenus, commissions OTA, net owner et extras.',
    formats: ['PDF', 'Excel', 'CSV'],
  },
  {
    id: 'report-occupancy',
    name: 'Rapport occupancy',
    description: 'Taux d’occupation, nuits vendues, disponibilite restante.',
    formats: ['PDF', 'Excel', 'CSV'],
  },
  {
    id: 'report-maintenance',
    name: 'Rapport maintenance',
    description: 'Taches, couts, priorites et temps de resolution.',
    formats: ['PDF', 'Excel'],
  },
  {
    id: 'report-staff',
    name: 'Rapport staff',
    description: 'Heures, performance, SLA nettoyage et check-in.',
    formats: ['PDF', 'Excel', 'CSV'],
  },
  {
    id: 'report-guests',
    name: 'Rapport guests',
    description: 'Satisfaction, reviews, demandes et taux de rebooking.',
    formats: ['PDF', 'CSV'],
  },
];

export const mockGeneratedReports = [
  { id: 'gen-1', name: 'Executive Revenue Summary - May', type: 'Rapport financier', format: 'PDF', status: 'Genere', createdAt: '14 May 2026 - 09:18', owner: 'Admin Sojori' },
  { id: 'gen-2', name: 'Occupancy Weekly Pulse', type: 'Rapport occupancy', format: 'Excel', status: 'Envoye', createdAt: '13 May 2026 - 18:42', owner: 'Claire Martin' },
  { id: 'gen-3', name: 'Maintenance Cost Tracker', type: 'Rapport maintenance', format: 'CSV', status: 'Brouillon', createdAt: '12 May 2026 - 11:07', owner: 'Yasmine El Idrissi' },
];

export const mockReportPreview = {
  financial: [
    { label: 'Rental revenue', value: 'EUR 45,380' },
    { label: 'OTA commission', value: 'EUR 5,420' },
    { label: 'Net owner payout', value: 'EUR 31,960' },
    { label: 'Expenses & extras', value: 'EUR 3,860' },
  ],
  occupancy: [
    { label: 'Occupancy rate', value: '87.4%' },
    { label: 'Booked nights', value: '624' },
    { label: 'Available nights', value: '714' },
    { label: 'Average stay', value: '4.8 nights' },
  ],
};
