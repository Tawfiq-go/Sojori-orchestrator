// ════════════════════════════════════════════════════════════════════
// Sojori · Calendar Inventory — Atelier 2026
// _shared.ts — tokens, helpers, utils, types partagés
// ════════════════════════════════════════════════════════════════════

// Design Tokens Atelier 2026
export const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  primaryTint2: 'rgba(184,133,26,0.20)',
  primaryTint3: 'rgba(184,133,26,0.25)',
  ai: '#7c3aed',
  aiTint: 'rgba(124,58,237,0.10)',
  success: '#0a8f5e',
  successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506',
  warningTint: 'rgba(196,101,6,0.10)',
  error: '#c81e1e',
  errorTint: 'rgba(200,30,30,0.10)',
  info: '#0673b3',
  infoTint: 'rgba(6,115,179,0.10)',
  bg0: '#f6f5f1',
  bg1: '#fff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',
};

// Types
export interface InventoryDay {
  availableRoom?: number;
  basePrice?: number;
  calculatedPrice?: number;
  manualPrice?: number | null;
  applyManual?: boolean;
  stopSell?: boolean;
  useDynamicPrice?: boolean;
  minStay?: number;
  maxStay?: number;
  closedArrival?: boolean;
  closedDeparture?: boolean;
  reservations?: Reservation[];
}

export interface Reservation {
  reservationId?: string;
  id?: string;
  reservationNumber?: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  arrivalDate?: string;
  departureDate?: string;
  numberOfGuests?: number;
}

export interface RoomType {
  _id: string;
  name?: string;
  inventories?: Record<string, InventoryDay>; // dateStr → InventoryDay
}

export interface Listing {
  _id: string;
  name: string;
  currencyCode?: string;
  photoColor?: string;
  photoColorDeep?: string;
  roomTypes?: RoomType[];
}

export interface DayInfo {
  date: Date;
  iso: string;
  day: number;
  weekday: string;
  month: string;
  isWeekend: boolean;
  isToday: boolean;
}

export interface CellSelection {
  listingId: string;
  roomTypeId: string;
  dateStr: string;
  column: string;
}

export interface ColumnDef {
  id: string;
  label: string;
  short: string;
  excelSelectable: boolean;
  hasTooltip?: boolean;
}

/** Logique de prix unifiée (alignée legacy `priceOf(inv)`) */
export function priceOf(inv?: InventoryDay): number {
  if (!inv) return 0;

  // Si prix manuel appliqué, le retourner en priorité
  if (inv.applyManual && inv.manualPrice !== null && inv.manualPrice !== undefined) {
    return inv.manualPrice;
  }

  // Si prix dynamique activé, retourner le prix calculé
  if (inv.useDynamicPrice) {
    return inv.calculatedPrice ?? inv.basePrice ?? 0;
  }

  // Sinon, retourner le prix manuel s'il existe, sinon le prix de base
  if (inv.manualPrice !== null && inv.manualPrice !== undefined) {
    return inv.manualPrice;
  }

  return inv.basePrice ?? 0;
}

/** Liste de toutes les colonnes affichables dans le collapse */
export const ALL_COLUMNS: ColumnDef[] = [
  {
    id: 'availableRoom',
    label: 'Chambre disponible',
    short: 'Dispo',
    excelSelectable: true,
  },
  {
    id: 'rate',
    label: 'Tarif (avec détails)',
    short: 'Tarif',
    excelSelectable: true,
    hasTooltip: true,
  },
  {
    id: 'basePrice',
    label: 'Prix de base',
    short: 'Base',
    excelSelectable: true,
  },
  {
    id: 'manualPrice',
    label: 'Prix manuel',
    short: 'Manuel',
    excelSelectable: true,
  },
  {
    id: 'dynamicPrice',
    label: 'Prix Dynamique',
    short: 'Dynamique',
    excelSelectable: true,
  },
  {
    id: 'reservations',
    label: 'Réservations',
    short: 'Rés.',
    excelSelectable: false,
  },
  {
    id: 'stopSell',
    label: 'Arrêt des ventes',
    short: 'Stop',
    excelSelectable: true,
  },
  {
    id: 'minStay',
    label: 'Séjour minimum',
    short: 'Min',
    excelSelectable: true,
  },
  {
    id: 'maxStay',
    label: 'Séjour maximum',
    short: 'Max',
    excelSelectable: true,
  },
  {
    id: 'closedArrival',
    label: 'Arrivée fermée',
    short: 'Arr.',
    excelSelectable: true,
  },
  {
    id: 'closedDeparture',
    label: 'Départ fermé',
    short: 'Dép.',
    excelSelectable: true,
  },
];

/** Type de réservation pour le jour donné (arrival / departure / rotation) */
export function reservationDayType(
  reservation: Reservation,
  dayStr: string
): 'arrival' | 'departure' | 'rotation' {
  if (
    reservation.arrivalDate === dayStr &&
    reservation.departureDate !== dayStr
  )
    return 'arrival';
  if (
    reservation.departureDate === dayStr &&
    reservation.arrivalDate !== dayStr
  )
    return 'departure';
  return 'rotation';
}

export const RESERVATION_BADGE = {
  arrival: { icon: '🏠', label: 'Arrivée', bg: '#dcfce7', color: '#166534' },
  departure: { icon: '🚪', label: 'Départ', bg: '#fee2e2', color: '#991b1b' },
  rotation: { icon: '↔️', label: 'Rotation', bg: '#f0f9ff', color: '#1e40af' },
};

/** Palette de couleurs cycliques pour différencier les réservations */
export const RESERVATION_PALETTE = [
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  { bg: '#f3e8ff', border: '#d8b4fe', text: '#581c87' },
  { bg: '#dcfce7', border: '#86efac', text: '#14532d' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
  { bg: '#fff3e0', border: T.primary, text: '#c2410c' },
  { bg: '#cffafe', border: '#67e8f9', text: '#164e63' },
];

/** Format ISO YYYY-MM-DD d'une Date */
export function toIso(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** Génère un range de N jours à partir de startDate */
export function genDays(startDate: Date, count = 31): DayInfo[] {
  const days: DayInfo[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      iso: toIso(d),
      day: d.getDate(),
      weekday: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][
        (d.getDay() + 6) % 7
      ],
      month: [
        'jan',
        'fév',
        'mar',
        'avr',
        'mai',
        'juin',
        'juil',
        'août',
        'sep',
        'oct',
        'nov',
        'déc',
      ][d.getMonth()],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday: toIso(d) === toIso(new Date()),
    });
  }
  return days;
}

/** Clé unique pour une cellule (utilisée par le Set de sélection O(1)) */
export const cellKey = (c: CellSelection): string =>
  `${c.listingId}|${c.roomTypeId}|${c.dateStr}|${c.column}`;

/** Get currency symbol from currency code */
export function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    MAD: 'MAD',
    EUR: '€',
    USD: '$',
    GBP: '£',
  };
  return symbols[code] || code;
}
