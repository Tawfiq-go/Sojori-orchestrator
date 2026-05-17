/**
 * Types pour AddTaskModal
 */

export type TaskType =
  | 'ARRIVAL'
  | 'DEPARTURE'
  | 'CLEANING'
  | 'REGISTRATION'
  | 'SUPPORT'
  | 'TRANSPORT'
  | 'GROCERIES'
  | 'CUSTOM'

export type Emergency = 'Normal' | 'Urgent' | 'Critical'
export type PaymentMode = '' | 'cash' | 'card' | 'transfer' | 'online'

export interface Listing {
  _id: string
  id: string
  name: string
  title?: string
  address?: string
  city?: string
  ownerId: string
}

export interface Reservation {
  _id: string
  id: string
  number: string
  reservationNumber: string
  guestName: string
  checkIn: Date | string
  checkOut: Date | string
  arrivalDate?: Date | string
  departureDate?: Date | string
  adults: number
  children: number
  listingId: string
  sojoriId?: string
  status: string
  checkinStatus?: string
}

export interface ClientRequestData {
  // Pour ARRIVAL/DEPARTURE
  date?: Date | string
  timeslot?: { start: number; end: number }

  // Pour CLEANING
  cleaningType?: 'free' | 'paid'
  price?: number
  serviceType?: string

  // Pour SUPPORT
  categoryId?: string
  categoryName?: string
  urgency?: 'immediate' | 'normal' | 'scheduled'
  description?: string
  photos?: string[]

  // Pour TRANSPORT
  from?: string
  to?: string
  flightNumber?: string
  passengers?: number
  pickupTime?: Date | string

  // Pour GROCERIES
  items?: string[]
  budget?: number
  deliveryWindow?: { start: Date | string; end: Date | string }
}

export interface TaskInfoData {
  startDate: Date | string
  endDate: Date | string
  duration: number
  staffId?: string
  staffCode?: string
  initialStatus?: 'CREATED' | 'ASSIGNED' | 'ACCEPTED'
  emergency: Emergency
  tags: string[]
  comment: string
  images: string[]
  paid: boolean
  price: number
  paymentMode: PaymentMode
}

// ── Listing client services (from srv-listing /client-services) ──────────────

export interface ListingConciergeService {
  id: string
  categoryId: string
  categoryGroup: 'TRANSPORT' | 'GROCERIES' | 'CUSTOM'
  name: string
  nameFr: string
  nameEn: string
  description: string
  price: number
  priceType: string
  currency: string
  capacity?: { maxPassengers: number }
  route?: { from: string; to: string }
  pricing?: any
  availability?: any
}

export interface ListingSupportCategory {
  id: string
  categoryId: string
  categoryGroup: string
  name: string
  nameFr: string
  nameEn: string
  icon: string
  priority: string
  description: string
}

export interface ListingClientServices {
  transport: ListingConciergeService[]
  grocery: ListingConciergeService[]
  custom: ListingConciergeService[]
  support: ListingSupportCategory[]
  hasConciergeServices: boolean
  hasSupportCategories: boolean
  allConcierge: ListingConciergeService[]
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TaskFormData {
  // Étape 1
  taskType: TaskType | null
  listing: Listing | null
  reservation: Reservation | null
  listingServices: ListingClientServices | null

  // Étape 2
  clientRequest: ClientRequestData

  // Étape 3
  taskInfo: TaskInfoData
}
