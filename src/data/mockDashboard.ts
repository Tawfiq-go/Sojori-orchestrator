export const dashboardPeriods = [
  'Aujourd’hui',
  'Semaine',
  'Mois',
  'Année',
  'Personnalisé',
] as const;

export const dashboardProperties = [
  'Villa Belvedere - Nice',
  'Dar Sojori - Marrakech',
  'Riad Atlas - Marrakech',
  'Casa Azure - Essaouira',
  'Loft Port Lympia - Nice',
];

export const mockDashboardKPIs = {
  totalReservations: { value: 234, trend: '+12% vs mois dernier' },
  monthlyRevenue: { value: 45380, trend: '+18% vs mois dernier' },
  occupancyRate: { value: 87.4, trend: '+4.1 pts' },
  adr: { value: 142, trend: '+6 EUR' },
  revpar: { value: 124, trend: '+11 EUR' },
  guestsThisMonth: { value: 482, trend: '+9%' },
  activeProperties: { value: 38, trend: '+3 activations' },
  averageRating: { value: 4.86, trend: '+0.08' },
};

export const mockRevenueChart = [
  { date: '01 May', revenue: 1180, bookings: 7 },
  { date: '03 May', revenue: 1520, bookings: 9 },
  { date: '05 May', revenue: 1360, bookings: 8 },
  { date: '07 May', revenue: 1810, bookings: 10 },
  { date: '09 May', revenue: 1690, bookings: 9 },
  { date: '11 May', revenue: 1920, bookings: 12 },
  { date: '13 May', revenue: 2140, bookings: 13 },
  { date: '15 May', revenue: 2285, bookings: 14 },
  { date: '17 May', revenue: 2050, bookings: 11 },
  { date: '19 May', revenue: 2360, bookings: 15 },
  { date: '21 May', revenue: 2480, bookings: 16 },
  { date: '23 May', revenue: 2315, bookings: 14 },
  { date: '25 May', revenue: 2540, bookings: 17 },
  { date: '27 May', revenue: 2670, bookings: 18 },
  { date: '29 May', revenue: 2810, bookings: 19 },
  { date: '31 May', revenue: 2965, bookings: 20 },
];

export const mockSourceDistribution = [
  { source: 'Airbnb', value: 45, revenue: 20000 },
  { source: 'Booking.com', value: 30, revenue: 13500 },
  { source: 'Direct', value: 15, revenue: 6800 },
  { source: 'Vrbo', value: 10, revenue: 5080 },
];

export const mockOccupancyByProperty = [
  { property: 'Villa Belvedere', occupancy: 94, adr: 184 },
  { property: 'Dar Sojori', occupancy: 88, adr: 129 },
  { property: 'Riad Atlas', occupancy: 91, adr: 152 },
  { property: 'Casa Azure', occupancy: 79, adr: 117 },
  { property: 'Loft Port Lympia', occupancy: 86, adr: 164 },
];

export const mockTopProperties = [
  { property: 'Villa Belvedere', revenue: 9120, occupancy: 94, source: 'Airbnb' },
  { property: 'Riad Atlas', revenue: 8340, occupancy: 91, source: 'Direct' },
  { property: 'Loft Port Lympia', revenue: 7680, occupancy: 86, source: 'Booking.com' },
  { property: 'Dar Sojori', revenue: 7215, occupancy: 88, source: 'Airbnb' },
];

export const mockCheckFlow = [
  { label: 'Aujourd’hui', checkIns: 12, checkOuts: 9 },
  { label: 'Demain', checkIns: 8, checkOuts: 11 },
  { label: 'J+2', checkIns: 10, checkOuts: 7 },
  { label: 'J+3', checkIns: 7, checkOuts: 10 },
];

export const mockUpcomingCheckIns = [
  { id: 'ci-1', guest: 'Sarah Johnson', property: 'Villa Belvedere', when: 'Aujourd’hui · 16:00', source: 'Airbnb' },
  { id: 'ci-2', guest: 'Marco Rossi', property: 'Loft Port Lympia', when: 'Aujourd’hui · 18:30', source: 'Booking.com' },
  { id: 'ci-3', guest: 'Lina Kader', property: 'Dar Sojori', when: 'Demain · 14:00', source: 'Direct' },
  { id: 'ci-4', guest: 'Jules Martin', property: 'Riad Atlas', when: 'Demain · 15:30', source: 'Airbnb' },
  { id: 'ci-5', guest: 'Nora Salem', property: 'Casa Azure', when: 'J+2 · 13:00', source: 'Vrbo' },
];

export const mockUpcomingCheckOuts = [
  { id: 'co-1', guest: 'Ella Moreau', property: 'Villa Belvedere', when: 'Aujourd’hui · 11:00', source: 'Direct' },
  { id: 'co-2', guest: 'Tom Becker', property: 'Dar Sojori', when: 'Aujourd’hui · 10:30', source: 'Airbnb' },
  { id: 'co-3', guest: 'Amina Idrissi', property: 'Riad Atlas', when: 'Demain · 11:00', source: 'Booking.com' },
  { id: 'co-4', guest: 'Hugo Bernard', property: 'Loft Port Lympia', when: 'J+2 · 10:00', source: 'Airbnb' },
  { id: 'co-5', guest: 'Mia Collins', property: 'Casa Azure', when: 'J+2 · 12:00', source: 'Direct' },
];

export const mockUrgentTasks = [
  { id: 'task-1', label: 'Valider deux paiements Booking en attente', priority: 'Critique', owner: 'Finance', due: 'Avant 12:00' },
  { id: 'task-2', label: 'Assigner un menage de sortie a Casa Azure', priority: 'Haute', owner: 'Ops', due: 'Aujourd’hui' },
  { id: 'task-3', label: 'Verifier inventaire Villa Belvedere', priority: 'Haute', owner: 'Staff', due: '14:00' },
  { id: 'task-4', label: 'Repondre a 3 demandes speciales guest', priority: 'Moyenne', owner: 'Guest team', due: '16:30' },
  { id: 'task-5', label: 'Confirmer planning check-in de groupe', priority: 'Moyenne', owner: 'Front desk', due: '18:00' },
];

export const mockUnreadMessages = [
  { id: 'msg-1', from: 'Sarah Johnson', channel: 'WhatsApp', preview: 'Could we arrange a late checkout on Sunday?' },
  { id: 'msg-2', from: 'Booking.com inbox', channel: 'OTA', preview: 'Guest requested airport transfer details.' },
  { id: 'msg-3', from: 'Marie Dupont', channel: 'Staff', preview: 'Clean completed for Loft Port Lympia.' },
  { id: 'msg-4', from: 'Tom Becker', channel: 'WhatsApp', preview: 'Wi-Fi code is not working anymore.' },
];

export const mockRecentReviews = [
  { id: 'rev-1', guest: 'Lina Kader', property: 'Dar Sojori', rating: 5, comment: 'Amazing host communication and seamless check-in.' },
  { id: 'rev-2', guest: 'James Howard', property: 'Villa Belvedere', rating: 4.8, comment: 'Beautiful villa, pool was immaculate.' },
  { id: 'rev-3', guest: 'Nadia El Fassi', property: 'Riad Atlas', rating: 4.7, comment: 'Great location and responsive support team.' },
];

export const mockAlerts = [
  { id: 'alert-1', severity: 'critical', title: '2 reservations pending approval', detail: 'Airbnb payout hold on Villa Belvedere.' },
  { id: 'alert-2', severity: 'warning', title: 'Occupancy dip on Casa Azure', detail: 'Down 9 pts on the next 14 days.' },
  { id: 'alert-3', severity: 'info', title: 'ADR record this month', detail: 'Riad Atlas reached 152 EUR ADR.' },
];
