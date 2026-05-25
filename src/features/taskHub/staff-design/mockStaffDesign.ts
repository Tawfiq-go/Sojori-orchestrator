import type { Staff } from './types';

/** Mock HTML preview — utilisé si API vide (dev) */
export const MOCK_STAFF_DESIGN: Staff[] = [
  {
    _id: 'mock-ahmed',
    fullName: 'Ahmed Benali',
    phoneE164: '+212612345678',
    whatsappE164: '+212 6 12 34 56 78',
    status: 'active',
    isAdmin: false,
    contractType: 'employee',
    allowedTaskTypes: ['cleaning_free', 'arrival_choose', 'departure_choose'],
    allowedListingIds: ['listing-majorelle', 'listing-riad'],
    maxTasksPerDay: 5,
    lang: 'fr',
    avatarColor: 1,
    schedule: {
      daysOfWeek: [0, 1, 2, 3, 4],
      timeWindows: [{ start: '08:00', end: '17:00' }],
    },
  },
  {
    _id: 'mock-sara',
    fullName: 'Sara Moutahir',
    phoneE164: '+212698765432',
    whatsappE164: '+212 6 98 76 54 32',
    status: 'active',
    isAdmin: true,
    contractType: 'freelance',
    rates: { cleaning_free: 150, arrival_choose: 80 },
    allowedTaskTypes: [
      'cleaning_free',
      'arrival_choose',
      'departure_choose',
      'concierge',
      'transport',
      'support',
    ],
    allowedListingIds: [],
    maxTasksPerDay: 12,
    lang: 'fr',
    avatarColor: 3,
    schedule: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timeWindows: [{ start: '00:00', end: '23:59' }],
    },
  },
  {
    _id: 'mock-karim',
    fullName: 'Karim Daoudi',
    phoneE164: '+212611223344',
    whatsappE164: '+212 6 11 22 33 44',
    status: 'off',
    isAdmin: false,
    contractType: 'freelance',
    rates: { transport: 80 },
    allowedTaskTypes: ['transport'],
    allowedListingIds: [],
    maxTasksPerDay: 3,
    lang: 'ar',
    avatarColor: 2,
    schedule: {
      daysOfWeek: [4, 5, 6],
      timeWindows: [{ start: '10:00', end: '18:00' }],
    },
  },
];

export const MOCK_LISTINGS_DESIGN = [
  { id: 'listing-majorelle', name: 'Villa Majorelle' },
  { id: 'listing-riad', name: 'Riad Atlas' },
  { id: 'listing-gueliz', name: 'Appart Guéliz' },
  { id: 'listing-hivernage', name: 'Maison Hivernage' },
];
