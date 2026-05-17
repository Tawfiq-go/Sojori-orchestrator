// Mock data for tasks
export interface Task {
  id: string;
  itemNumber: string; // Task code
  name: string;
  type: string;
  subType: string;
  status: 'CREATED' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_ADMIN' | 'CANCELLED_CUSTOMER' | 'ARCHIVED';
  priority: 'Normal' | 'Urgent' | 'Critical';

  // Dates
  createdAt: string;
  startDate: string;
  endDate: string;
  startHour: string;
  endHour: string;
  duration: number; // hours

  // Assignment
  staffId: string | null;
  staffName: string | null;
  assignmentStatus?: string;

  // Reservation link
  reservationId: string | null;
  reservationNumber: string | null;
  guestName: string | null;
  guestCountry?: string | null; // Pays du voyageur (pour drapeau)
  arrivalDate: string | null;
  departureDate: string | null;
  channelName?: string | null; // OTA source (Airbnb, Booking, etc.)

  // Listing
  listingId: string;
  listingName: string;
  roomTypeId?: string;
  roomTypeName?: string;

  // Pricing
  price: number;
  currency: string;
  paid: boolean;
  paymentMode: string;
  requestPayment: boolean;

  // Details
  emergency: 'Normal' | 'Urgent' | 'Critical';
  presence: 'Y' | 'N';
  descriptions: { description: string }[];
  images: { imageUrl: string }[];
  services: string[];

  // Timeslots
  TS: { start: number; end: number }[];
  TS_SEL: { start: number; end: number }[];
  TS_VAL: boolean;
  clientTimeslot?: string; // Hour chosen by client via WhatsApp
  timeslotSource?: 'default' | 'client' | 'admin';

  // Origin
  origin: 'task' | 'client';

  /** Scheduling mode (UI / orchestration) */
  mode?: 'Auto' | 'Manu';

  // Notes
  notes?: string;
}

// Generate mock tasks
const now = new Date();
const today = now.toISOString().split('T')[0];
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const mockTasks: Task[] = [
  {
    id: 'task-001',
    itemNumber: 'TASK-2026-001',
    name: 'Ménage pré-arrivée',
    type: 'Ménage',
    subType: 'arrival',
    status: 'IN_PROGRESS',
    priority: 'Urgent',
    createdAt: `${today}T08:00:00Z`,
    startDate: today,
    endDate: today,
    startHour: '14:00',
    endHour: '16:00',
    duration: 2,
    staffId: 'staff-001',
    staffName: 'Yasmine K.',
    assignmentStatus: 'accepted',
    reservationId: 'res-123',
    reservationNumber: 'RES-2026-123',
    guestName: 'Sarah Johnson',
    guestCountry: 'United States',
    channelName: 'AirBNB',
    arrivalDate: today,
    departureDate: `${today.split('-')[0]}-${today.split('-')[1]}-${parseInt(today.split('-')[2]) + 7}`,
    listingId: 'listing-001',
    listingName: 'Villa Belvédère',
    price: 50,
    currency: 'EUR',
    paid: false,
    paymentMode: 'cash',
    requestPayment: true,
    emergency: 'Urgent',
    presence: 'N',
    descriptions: [{ description: 'Check-in à 16h, ménage complet requis' }],
    images: [],
    services: ['cleaning', 'laundry'],
    TS: [],
    TS_SEL: [{ start: 14, end: 16 }],
    TS_VAL: true,
    clientTimeslot: '14:00',
    timeslotSource: 'client',
    origin: 'task',
  },
  {
    id: 'task-002',
    itemNumber: 'TASK-2026-002',
    name: 'Réparation fuite SDB',
    type: 'Maintenance',
    subType: 'support',
    status: 'CREATED',
    priority: 'Critical',
    createdAt: `${today}T10:30:00Z`,
    startDate: today,
    endDate: today,
    startHour: '15:00',
    endHour: '17:00',
    duration: 2,
    staffId: null,
    staffName: null,
    reservationId: null,
    reservationNumber: null,
    guestName: null,
    arrivalDate: null,
    departureDate: null,
    listingId: 'listing-002',
    listingName: 'Studio Calvi',
    price: 80,
    currency: 'EUR',
    paid: false,
    paymentMode: 'bank_transfer',
    requestPayment: true,
    emergency: 'Critical',
    presence: 'Y',
    descriptions: [{ description: 'Fuite sous lavabo salle de bain, urgent' }],
    images: [],
    services: ['plumbing'],
    TS: [],
    TS_SEL: [{ start: 15, end: 17 }],
    TS_VAL: false,
    timeslotSource: 'default',
    origin: 'client',
  },
  {
    id: 'task-003',
    itemNumber: 'TASK-2026-003',
    name: 'Accueil Marco Rossi',
    type: 'Check-in',
    subType: 'arrival',
    status: 'ASSIGNED',
    priority: 'Normal',
    createdAt: `${yesterday}T15:00:00Z`,
    startDate: today,
    endDate: today,
    startHour: '16:30',
    endHour: '17:00',
    duration: 0.5,
    staffId: 'staff-002',
    staffName: 'Hassan M.',
    assignmentStatus: 'pending',
    reservationId: 'res-456',
    reservationNumber: 'RES-2026-456',
    guestName: 'Marco Rossi',
    guestCountry: 'Italy',
    channelName: 'BookingCom',
    arrivalDate: today,
    departureDate: `${today.split('-')[0]}-${today.split('-')[1]}-${parseInt(today.split('-')[2]) + 4}`,
    listingId: 'listing-003',
    listingName: 'Dar Sojori',
    roomTypeName: 'Suite VIP',
    price: 0,
    currency: 'EUR',
    paid: true,
    paymentMode: 'included',
    requestPayment: false,
    emergency: 'Normal',
    presence: 'Y',
    descriptions: [{ description: 'Famille 4 personnes, VIP guest' }],
    images: [],
    services: ['welcome', 'tour'],
    TS: [],
    TS_SEL: [{ start: 16, end: 17 }],
    TS_VAL: true,
    timeslotSource: 'admin',
    origin: 'task',
  },
  {
    id: 'task-004',
    itemNumber: 'TASK-2026-004',
    name: 'Validation photos ménage',
    type: 'Photos',
    subType: 'cleaning',
    status: 'IN_PROGRESS',
    priority: 'Normal',
    createdAt: `${today}T12:00:00Z`,
    startDate: today,
    endDate: today,
    startHour: '18:00',
    endHour: '18:30',
    duration: 0.5,
    staffId: 'staff-ai',
    staffName: 'Sojori AI',
    assignmentStatus: 'accepted',
    reservationId: 'res-789',
    reservationNumber: 'RES-2026-789',
    guestName: 'Yumi Kobayashi',
    guestCountry: 'Japan',
    channelName: 'AirBNB',
    arrivalDate: tomorrow,
    departureDate: `${today.split('-')[0]}-${today.split('-')[1]}-${parseInt(today.split('-')[2]) + 6}`,
    listingId: 'listing-004',
    listingName: 'Médina House',
    price: 0,
    currency: 'EUR',
    paid: true,
    paymentMode: 'included',
    requestPayment: false,
    emergency: 'Normal',
    presence: 'N',
    descriptions: [{ description: '12 photos uploadées, AI score 8.4/10' }],
    images: [
      { imageUrl: 'https://via.placeholder.com/400x300?text=Bedroom' },
      { imageUrl: 'https://via.placeholder.com/400x300?text=Bathroom' },
    ],
    services: ['photos', 'ai_validation'],
    TS: [],
    TS_SEL: [{ start: 18, end: 19 }],
    TS_VAL: false,
    timeslotSource: 'default',
    origin: 'task',
  },
  {
    id: 'task-005',
    itemNumber: 'TASK-2026-005',
    name: 'Mid-stay clean Villa Atlas',
    type: 'Ménage',
    subType: 'cleaning',
    status: 'ASSIGNED',
    priority: 'Normal',
    createdAt: `${yesterday}T10:00:00Z`,
    startDate: tomorrow,
    endDate: tomorrow,
    startHour: '10:00',
    endHour: '12:00',
    duration: 2,
    staffId: 'staff-003',
    staffName: 'Fatima M.',
    assignmentStatus: 'accepted',
    reservationId: 'res-321',
    reservationNumber: 'RES-2026-321',
    guestName: 'James Peterson',
    guestCountry: 'Canada',
    channelName: 'BookingCom',
    arrivalDate: `${today.split('-')[0]}-${today.split('-')[1]}-${parseInt(today.split('-')[2]) - 5}`,
    departureDate: `${today.split('-')[0]}-${today.split('-')[1]}-${parseInt(today.split('-')[2]) + 9}`,
    listingId: 'listing-005',
    listingName: 'Villa Atlas',
    price: 45,
    currency: 'EUR',
    paid: false,
    paymentMode: 'cash',
    requestPayment: true,
    emergency: 'Normal',
    presence: 'Y',
    descriptions: [{ description: 'Long séjour - J+5, ménage intermédiaire' }],
    images: [],
    services: ['cleaning'],
    TS: [],
    TS_SEL: [{ start: 10, end: 12 }],
    TS_VAL: true,
    timeslotSource: 'admin',
    origin: 'task',
  },
  {
    id: 'task-006',
    itemNumber: 'TASK-2026-006',
    name: 'Renouveler kit accueil',
    type: 'Inventaire',
    subType: 'support',
    status: 'ASSIGNED',
    priority: 'Normal',
    createdAt: `${today}T09:00:00Z`,
    startDate: today,
    endDate: today,
    startHour: '14:00',
    endHour: '15:00',
    duration: 1,
    staffId: 'staff-002',
    staffName: 'Hassan M.',
    assignmentStatus: 'pending',
    reservationId: null,
    reservationNumber: null,
    guestName: null,
    arrivalDate: null,
    departureDate: null,
    listingId: 'listing-multi',
    listingName: '3 listings',
    price: 30,
    currency: 'EUR',
    paid: false,
    paymentMode: 'cash',
    requestPayment: true,
    emergency: 'Normal',
    presence: 'N',
    descriptions: [{ description: '3 villas - stock bas shampoing et café' }],
    images: [],
    services: ['inventory', 'supplies'],
    TS: [],
    TS_SEL: [{ start: 14, end: 15 }],
    TS_VAL: false,
    timeslotSource: 'default',
    origin: 'task',
  },
  {
    id: 'task-007',
    itemNumber: 'TASK-2026-007',
    name: 'Inspection post-checkout',
    type: 'Inspection',
    subType: 'departure',
    status: 'COMPLETED',
    priority: 'Normal',
    createdAt: `${yesterday}T10:00:00Z`,
    startDate: yesterday,
    endDate: yesterday,
    startHour: '14:00',
    endHour: '14:30',
    duration: 0.5,
    staffId: 'staff-001',
    staffName: 'Yasmine K.',
    assignmentStatus: 'completed',
    reservationId: 'res-654',
    reservationNumber: 'RES-2026-654',
    guestName: 'James Peterson',
    guestCountry: 'Canada',
    channelName: 'BookingCom',
    arrivalDate: `${yesterday.split('-')[0]}-${yesterday.split('-')[1]}-${parseInt(yesterday.split('-')[2]) - 7}`,
    departureDate: yesterday,
    listingId: 'listing-001',
    listingName: 'Villa Belvédère',
    price: 0,
    currency: 'EUR',
    paid: true,
    paymentMode: 'included',
    requestPayment: false,
    emergency: 'Normal',
    presence: 'N',
    descriptions: [{ description: 'Dégâts mineurs détectés - rapport envoyé' }],
    images: [
      { imageUrl: 'https://via.placeholder.com/400x300?text=Minor+Damage+1' },
      { imageUrl: 'https://via.placeholder.com/400x300?text=Minor+Damage+2' },
    ],
    services: ['inspection'],
    TS: [],
    TS_SEL: [{ start: 14, end: 15 }],
    TS_VAL: true,
    timeslotSource: 'default',
    origin: 'task',
    notes: 'Dégâts: verre cassé cuisine, rayure parquet chambre',
  },
];

// Task types and subtypes configuration
export const taskTypes = [
  { value: 'Ménage', label: '🧹 Ménage' },
  { value: 'Maintenance', label: '🔧 Maintenance' },
  { value: 'Check-in', label: '🛬 Check-in' },
  { value: 'Check-out', label: '🛫 Check-out' },
  { value: 'Inspection', label: '🔍 Inspection' },
  { value: 'Photos', label: '📸 Photos' },
  { value: 'Inventaire', label: '📦 Inventaire' },
  { value: 'Conciergerie', label: '🎯 Conciergerie' },
  { value: 'Support', label: '🆘 Support' },
];

export const taskSubTypes: Record<string, { value: string; label: string }[]> = {
  Ménage: [
    { value: 'arrival', label: 'Pré-arrivée' },
    { value: 'departure', label: 'Post-départ' },
    { value: 'cleaning', label: 'Mid-stay' },
  ],
  Maintenance: [
    { value: 'plumbing', label: 'Plomberie' },
    { value: 'electrical', label: 'Électricité' },
    { value: 'hvac', label: 'Climatisation' },
    { value: 'appliance', label: 'Électroménager' },
    { value: 'other', label: 'Autre' },
  ],
  'Check-in': [
    { value: 'arrival', label: 'Arrivée standard' },
    { value: 'early', label: 'Early check-in' },
    { value: 'late', label: 'Late check-in' },
  ],
  'Check-out': [
    { value: 'departure', label: 'Départ standard' },
    { value: 'late', label: 'Late check-out' },
  ],
  Inspection: [
    { value: 'arrival', label: 'Pré-arrivée' },
    { value: 'departure', label: 'Post-départ' },
    { value: 'routine', label: 'Routine' },
  ],
  Photos: [
    { value: 'cleaning', label: 'Post-ménage' },
    { value: 'damage', label: 'Dégâts' },
    { value: 'inventory', label: 'Inventaire' },
  ],
  Inventaire: [
    { value: 'support', label: 'Réapprovisionnement' },
    { value: 'check', label: 'Vérification' },
  ],
  Conciergerie: [
    { value: 'welcome', label: 'Accueil' },
    { value: 'request', label: 'Demande guest' },
    { value: 'tour', label: 'Visite' },
  ],
  Support: [
    { value: 'support', label: 'Assistance' },
    { value: 'emergency', label: 'Urgence' },
  ],
};

export const mockListings = [
  { id: 'listing-001', name: 'Villa Belvédère' },
  { id: 'listing-002', name: 'Studio Calvi' },
  { id: 'listing-003', name: 'Dar Sojori' },
  { id: 'listing-004', name: 'Médina House' },
  { id: 'listing-005', name: 'Villa Atlas' },
  { id: 'listing-006', name: 'Riad Marrakech' },
  { id: 'listing-007', name: 'Appt Gueliz' },
  { id: 'listing-008', name: 'Studio Hivernage' },
];

export const mockStaff = [
  { id: 'staff-001', name: 'Yasmine K.', code: 'YK' },
  { id: 'staff-002', name: 'Hassan M.', code: 'HM' },
  { id: 'staff-003', name: 'Fatima M.', code: 'FM' },
  { id: 'staff-004', name: 'Mehdi R.', code: 'MR' },
  { id: 'staff-005', name: 'Karim E.', code: 'KE' },
  { id: 'staff-ai', name: 'Sojori AI', code: 'AI' },
];
