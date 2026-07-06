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
  /** true = jour issu de InventoryArchive (lecture seule côté UI) */
  isArchived?: boolean;
  availableRoom?: number;
  basePrice?: number;
  calculatedPrice?: number;
  manualPrice?: number | null;
  applyManual?: boolean;
  priceMode?: PriceDisplayMode;
  setUseDynamicPriceManual?: boolean;
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

export type PriceDisplayMode = 'manual' | 'dynamic' | 'base';

export const PRICE_MODE_LABEL: Record<PriceDisplayMode, string> = {
  manual: 'Manuel',
  dynamic: 'Dynamique',
  base: 'Base',
};

/** Mode d'affichage — priceMode API ou flags legacy. */
export function resolvePriceMode(inv?: InventoryDay): PriceDisplayMode {
  if (!inv) return 'base';
  const pm = inv.priceMode;
  if (pm === 'manual' || pm === 'dynamic' || pm === 'base') return pm;
  if (inv.useDynamicPrice || inv.setUseDynamicPriceManual) return 'dynamic';
  if (inv.applyManual && inv.manualPrice != null && inv.manualPrice !== undefined) {
    return 'manual';
  }
  return 'base';
}

/** Logique de prix unifiée (alignée backend `resolveInventoryDayDisplayPrice`). */
export function priceOf(inv?: InventoryDay): number {
  if (!inv) return 0;
  const mode = resolvePriceMode(inv);
  const manual =
    inv.manualPrice != null && inv.manualPrice !== undefined && Number(inv.manualPrice) > 0
      ? Math.round(Number(inv.manualPrice))
      : 0;
  const calc =
    inv.calculatedPrice != null && Number(inv.calculatedPrice) > 0
      ? Math.round(Number(inv.calculatedPrice))
      : 0;
  const base =
    inv.basePrice != null && Number(inv.basePrice) > 0
      ? Math.round(Number(inv.basePrice))
      : 0;

  if (mode === 'manual' && manual > 0) return manual;
  if (mode === 'dynamic' && calc > 0) return calc;
  if (mode === 'dynamic' && manual > 0) return manual;
  if (manual > 0) return manual;
  if (calc > 0) return calc;
  return base;
}

/** Fond cellule historique (InventoryArchive) — aligné dashboard legacy */
export const ARCHIVE_CELL_BG = '#e8ecf1';
export const ARCHIVE_CELL_TEXT = '#475569';

export function isArchiveDay(inv?: InventoryDay): boolean {
  return Boolean(inv?.isArchived);
}

/** Au moins un champ inventaire renvoyé par l’API (≠ cellule vide `{}`). */
export function hasInventoryData(inv?: InventoryDay | null): boolean {
  if (!inv || typeof inv !== 'object') return false;
  if (Object.keys(inv).length === 0) return false;
  return (
    inv.isArchived === true ||
    inv.basePrice != null ||
    inv.availableRoom != null ||
    inv.stopSell != null ||
    inv.priceMode != null ||
    inv.useDynamicPrice != null ||
    inv.manualPrice != null ||
    inv.calculatedPrice != null ||
    inv.minStay != null ||
    inv.maxStay != null ||
    (Array.isArray(inv.reservations) && inv.reservations.length > 0)
  );
}

export type InventoryCellState = 'data' | 'archive' | 'out_of_window' | 'missing';

/** État d’affichage d’une cellule (évite les « 0 MAD » hors inventaire). */
export function resolveInventoryCellState(
  iso: string,
  inv?: InventoryDay | null,
  opts?: { futureHorizonDays?: number },
): InventoryCellState {
  if (isArchiveDay(inv)) return 'archive';
  if (hasInventoryData(inv)) return 'data';

  const horizon = opts?.futureHorizonDays ?? 1095;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const day = parseIsoLocal(iso);
  const futureEnd = new Date(today);
  futureEnd.setDate(futureEnd.getDate() + horizon);
  if (day.getTime() > futureEnd.getTime()) return 'out_of_window';

  return 'missing';
}

/** Libellé tarif Rate TOP / vue simple — jamais « 0 » si pas de donnée inventaire. */
export function formatInventoryRateLabel(
  state: InventoryCellState,
  inv?: InventoryDay | null,
): { main: string; hint?: string; showCurrency: boolean } {
  if (state === 'data') {
    if (inv?.stopSell) return { main: '—', showCurrency: false };
    const p = priceOf(inv ?? undefined);
    return { main: String(p), showCurrency: true };
  }
  if (state === 'archive') {
    if (inv?.stopSell) return { main: '—', hint: 'historique', showCurrency: false };
    const p = priceOf(inv ?? undefined);
    return { main: String(p), showCurrency: true, hint: 'historique' };
  }
  if (state === 'out_of_window') {
    return { main: '—', hint: 'Hors fenêtre calendrier', showCurrency: false };
  }
  return { main: '—', hint: 'Pas de donnée inventaire', showCurrency: false };
}

export const OUT_OF_WINDOW_CELL_BG = 'repeating-linear-gradient(-45deg, #fafaf7, #fafaf7 4px, #f0eee8 4px, #f0eee8 8px)';

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
    id: 'minStay',
    label: 'Séjour minimum',
    short: 'Min stay',
    excelSelectable: true,
  },
  {
    id: 'basePrice',
    label: 'Prix de base',
    short: 'Base',
    excelSelectable: true,
  },
  {
    id: 'manualPrice',
    label: 'Prix manuel (valeur stockée)',
    short: 'Manuel',
    excelSelectable: true,
  },
  {
    id: 'priceMode',
    label: 'Mode prix (manuel / dynamique / base)',
    short: 'Mode',
    excelSelectable: true,
  },
  {
    id: 'dynamicPrice',
    label: 'Prix dynamique',
    short: 'Prix dyn.',
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
    id: 'maxStay',
    label: 'Séjour maximum',
    short: 'Max stay',
    excelSelectable: true,
  },
  {
    id: 'closedArrival',
    label: 'Arrivée fermée',
    short: 'Arrivée',
    excelSelectable: true,
  },
  {
    id: 'closedDeparture',
    label: 'Départ fermé',
    short: 'Départ',
    excelSelectable: true,
  },
];

/** Colonnes affichées sur la ligne principale (une seule ligne par défaut). */
export const CALENDAR_PRIMARY_ROW_COLUMNS = ['availableRoom', 'rate'] as const;

/** Colonnes prioritaires — ordre filtre + ligne principale */
export const CALENDAR_COLUMN_PRIORITY = ['availableRoom', 'rate'] as const;

const PRIMARY_ROW_SET = new Set<string>(CALENDAR_PRIMARY_ROW_COLUMNS);

/** Colonnes effectives (défaut prix + dispo si filtre vide). */
export function effectiveCalendarColumns(selectedColumns: string[]): string[] {
  return selectedColumns.length > 0 ? selectedColumns : [...CALENDAR_PRIMARY_ROW_COLUMNS];
}

export function calendarPrimaryColumns(selectedColumns: string[]): string[] {
  return sortCalendarColumns(
    effectiveCalendarColumns(selectedColumns).filter((id) => PRIMARY_ROW_SET.has(id)),
  );
}

export function calendarSelectableColumns(selectedColumns: string[]): string[] {
  return sortCalendarColumns(effectiveCalendarColumns(selectedColumns)).filter(
    (id) => ALL_COLUMNS.find((c) => c.id === id)?.excelSelectable,
  );
}

export function sortCalendarColumns(ids: string[]): string[] {
  const pinned = CALENDAR_COLUMN_PRIORITY.filter((id) => ids.includes(id));
  const rest = ids.filter((id) => !(CALENDAR_COLUMN_PRIORITY as readonly string[]).includes(id));
  return [...pinned, ...rest];
}

export function sortAllColumnsForPicker(columns: ColumnDef[] = ALL_COLUMNS): ColumnDef[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const pinned = CALENDAR_COLUMN_PRIORITY.map((id) => byId.get(id)).filter(Boolean) as ColumnDef[];
  const rest = columns.filter((c) => !(CALENDAR_COLUMN_PRIORITY as readonly string[]).includes(c.id));
  return [...pinned, ...rest];
}

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

/** Parse YYYY-MM-DD en date locale (évite le décalage UTC de `new Date('2026-05-22')`). */
export function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Nombre de jours calendaires entre deux ISO inclusives. */
export function daysBetweenIsoInclusive(fromIso: string, toIsoStr: string): number {
  const a = parseIsoLocal(fromIso).getTime();
  const b = parseIsoLocal(toIsoStr).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
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
