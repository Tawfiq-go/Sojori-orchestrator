// Mock data for Reservations
export interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  passportNumber: string;
  dateOfBirth: string;
  status: 'COMPLETE' | 'DRAFT' | 'NOT_REGISTERED';
  passportPhoto?: string;
}

export interface Reservation {
  id: string;
  reservationNumber: string; // SJ-XXXXX
  guestName: string;
  guestInitials: string;
  guestMeta: string;
  guestColor: 'gold' | 'cyan' | 'pink' | 'purple' | 'blue' | 'green';
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  guestLanguage: string;

  listing: string;
  listingId: string;
  listingColor: string;
  location: string;
  roomTypeName?: string;

  checkIn: string; // Date display
  checkInDate: string; // ISO date
  checkInTime: string; // HH:mm
  checkOut: string; // Date display
  checkOutDate: string; // ISO date
  checkOutTime: string; // HH:mm
  nights: number;
  daysToGo: string;

  status: 'success' | 'warning' | 'error' | 'neutral';
  statusLabel: string;
  checkInOutStatus?: 'arrived' | 'departed';

  source: 'airbnb' | 'booking' | 'direct' | 'vrbo';
  otaCode?: string;
  voucherNo?: string;
  channelManager?: 'channex' | 'rentalsunited';

  revenue: string;
  totalPrice: number;
  currency: string;
  pricePerNight: number;
  cleaningFee: number;
  commission: number;
  commissionPercent: number;
  netOwner: number;

  paymentStatus: 'paid' | 'unpaid' | 'partial';

  adults: number;
  children: number;
  infants: number;
  travelers: Traveler[];

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export const mockGuests = [
  { id: 'g1', name: 'Sarah Johnson', email: 'sarah.j@example.com', phone: '+1 415 555 0123', country: '🇺🇸 USA' },
  { id: 'g2', name: 'Marco Rossi', email: 'marco.r@example.com', phone: '+39 06 1234 5678', country: '🇮🇹 Italy' },
  { id: 'g3', name: 'Aisha Khalil', email: 'aisha.k@example.com', phone: '+33 1 23 45 67 89', country: '🇫🇷 France' },
  { id: 'g4', name: 'John Smith', email: 'john.s@example.com', phone: '+44 20 1234 5678', country: '🇬🇧 UK' },
  { id: 'g5', name: 'Maria Garcia', email: 'maria.g@example.com', phone: '+34 91 123 4567', country: '🇪🇸 Spain' },
];

export const mockListings = [
  { id: 'L001', name: 'Villa Belvédère', city: 'Nice', color: 'gold' },
  { id: 'L002', name: 'Dar Sojori', city: 'Marrakech', color: 'blue' },
  { id: 'L003', name: 'Villa Atlas', city: 'Marrakech', color: 'purple' },
  { id: 'L004', name: 'Atlas Loft', city: 'Marrakech', color: 'green' },
  { id: 'L005', name: 'Médina House', city: 'Marrakech', color: 'pink' },
  { id: 'L006', name: 'Riad Zahra', city: 'Marrakech', color: 'cyan' },
  { id: 'L007', name: 'Côte d\'Azur Villa', city: 'Nice', color: 'gold' },
];

export const mockReservations: Reservation[] = [
  {
    id: 'r1',
    reservationNumber: 'SJ-2024-001',
    guestName: 'Sarah Johnson',
    guestInitials: 'SJ',
    guestMeta: '🇺🇸 · 1er séjour',
    guestColor: 'gold',
    guestEmail: 'sarah.j@example.com',
    guestPhone: '+1 415 555 0123',
    guestCountry: '🇺🇸',
    guestLanguage: 'EN',

    listing: 'Villa Belvédère · Nice',
    listingId: 'L001',
    listingColor: 'gold',
    location: 'Nice',

    checkIn: '15 mai',
    checkInDate: '2026-05-15',
    checkInTime: '16:00',
    checkOut: '22 mai',
    checkOutDate: '2026-05-22',
    checkOutTime: '11:00',
    nights: 7,
    daysToGo: 'J+2',

    status: 'success',
    statusLabel: 'Confirmée',

    source: 'airbnb',
    otaCode: 'HMXY42TZ8K',

    revenue: '€1,840',
    totalPrice: 1840,
    currency: 'EUR',
    pricePerNight: 250,
    cleaningFee: 90,
    commission: 276,
    commissionPercent: 15,
    netOwner: 1564,

    paymentStatus: 'paid',

    adults: 2,
    children: 1,
    infants: 0,
    travelers: [
      {
        id: 't1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        nationality: 'USA',
        passportNumber: 'P1234567',
        dateOfBirth: '1990-03-15',
        status: 'COMPLETE',
      },
      {
        id: 't2',
        firstName: 'Mike',
        lastName: 'Johnson',
        nationality: 'USA',
        passportNumber: 'P7654321',
        dateOfBirth: '1988-07-22',
        status: 'COMPLETE',
      },
      {
        id: 't3',
        firstName: 'Emma',
        lastName: 'Johnson',
        nationality: 'USA',
        passportNumber: '',
        dateOfBirth: '2020-01-10',
        status: 'DRAFT',
      },
    ],

    notes: 'Anniversaire de mariage - prévoir champagne',

    createdAt: '2026-05-10T10:14:32Z',
    updatedAt: '2026-05-12T15:22:10Z',
  },
  {
    id: 'r2',
    reservationNumber: 'SJ-2024-002',
    guestName: 'Marco Rossi',
    guestInitials: 'MR',
    guestMeta: '🇮🇹 · 3 séjours · ⭐ VIP',
    guestColor: 'cyan',
    guestEmail: 'marco.r@example.com',
    guestPhone: '+39 06 1234 5678',
    guestCountry: '🇮🇹',
    guestLanguage: 'IT',

    listing: 'Dar Sojori · Marrakech',
    listingId: 'L002',
    listingColor: 'blue',
    location: 'Marrakech',

    checkIn: '16 mai',
    checkInDate: '2026-05-16',
    checkInTime: '15:00',
    checkOut: '19 mai',
    checkOutDate: '2026-05-19',
    checkOutTime: '10:00',
    nights: 3,
    daysToGo: 'J+3',

    status: 'success',
    statusLabel: 'Confirmée',
    checkInOutStatus: 'arrived',

    source: 'booking',
    otaCode: 'BK-789456123',
    voucherNo: 'V-2024-456',

    revenue: '€720',
    totalPrice: 720,
    currency: 'EUR',
    pricePerNight: 220,
    cleaningFee: 60,
    commission: 108,
    commissionPercent: 15,
    netOwner: 612,

    paymentStatus: 'paid',

    adults: 2,
    children: 0,
    infants: 0,
    travelers: [
      {
        id: 't4',
        firstName: 'Marco',
        lastName: 'Rossi',
        nationality: 'Italy',
        passportNumber: 'IT123456',
        dateOfBirth: '1985-11-20',
        status: 'COMPLETE',
      },
      {
        id: 't5',
        firstName: 'Giulia',
        lastName: 'Rossi',
        nationality: 'Italy',
        passportNumber: 'IT654321',
        dateOfBirth: '1987-05-14',
        status: 'COMPLETE',
      },
    ],

    createdAt: '2026-05-08T14:30:15Z',
    updatedAt: '2026-05-15T09:10:00Z',
  },
  {
    id: 'r3',
    reservationNumber: 'SJ-2024-003',
    guestName: 'Aisha Khalil',
    guestInitials: 'AK',
    guestMeta: '🇫🇷 · 6 invités',
    guestColor: 'pink',
    guestEmail: 'aisha.k@example.com',
    guestPhone: '+33 1 23 45 67 89',
    guestCountry: '🇫🇷',
    guestLanguage: 'FR',

    listing: 'Villa Atlas · Marrakech',
    listingId: 'L003',
    listingColor: 'purple',
    location: 'Marrakech',
    roomTypeName: 'Suite Premium',

    checkIn: '18 mai',
    checkInDate: '2026-05-18',
    checkInTime: '16:00',
    checkOut: '25 mai',
    checkOutDate: '2026-05-25',
    checkOutTime: '11:00',
    nights: 7,
    daysToGo: 'J+5',

    status: 'warning',
    statusLabel: 'En attente paiement',

    source: 'direct',

    revenue: '€2,850',
    totalPrice: 2850,
    currency: 'EUR',
    pricePerNight: 380,
    cleaningFee: 190,
    commission: 0,
    commissionPercent: 0,
    netOwner: 2850,

    paymentStatus: 'unpaid',

    adults: 4,
    children: 2,
    infants: 0,
    travelers: [
      {
        id: 't6',
        firstName: 'Aisha',
        lastName: 'Khalil',
        nationality: 'France',
        passportNumber: '',
        dateOfBirth: '1992-08-12',
        status: 'NOT_REGISTERED',
      },
      {
        id: 't7',
        firstName: 'Omar',
        lastName: 'Khalil',
        nationality: 'France',
        passportNumber: '',
        dateOfBirth: '1990-02-28',
        status: 'NOT_REGISTERED',
      },
      {
        id: 't8',
        firstName: 'Yasmina',
        lastName: 'Khalil',
        nationality: 'France',
        passportNumber: '',
        dateOfBirth: '2018-06-15',
        status: 'NOT_REGISTERED',
      },
      {
        id: 't9',
        firstName: 'Karim',
        lastName: 'Khalil',
        nationality: 'France',
        passportNumber: '',
        dateOfBirth: '2020-11-03',
        status: 'NOT_REGISTERED',
      },
    ],

    createdAt: '2026-05-11T09:45:22Z',
    updatedAt: '2026-05-11T09:45:22Z',
  },
];

// Helper functions
export function generateReservationNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `SJ-${year}-${random}`;
}

export function calculateCommission(price: number, source: string): number {
  const rates: Record<string, number> = {
    airbnb: 0.15,
    booking: 0.15,
    vrbo: 0.12,
    direct: 0,
  };
  return Math.round(price * (rates[source] || 0));
}

export function calculateNetOwner(total: number, commission: number): number {
  return total - commission;
}
