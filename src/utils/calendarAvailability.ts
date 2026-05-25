import type { CalendarDay } from '../types/calendar.types';
import { tokens as t } from '../components/dashboard/DashboardV2.components';

export type DayStatus = 'available' | 'booked' | 'closed' | 'pending' | 'nodata';

export interface AvailabilityDayCell {
  date: string;
  day: number;
  weekday: number;
  inMonth: boolean;
  status: DayStatus;
  price: number;
  minNights?: number;
  isToday?: boolean;
  hasInventoryData: boolean;
  bookedBy?: { initials: string; name: string };
}

export interface InventoryDayRow {
  date: string | Date;
  availableRoom?: number;
  basePrice?: number;
  calculatedPrice?: number;
  manualPrice?: number;
  applyManual?: boolean;
  stopSell?: boolean;
  available?: boolean;
  min_stay_arrival?: number;
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
  reservations?: Array<{
    guestFirstName?: string;
    guestLastName?: string;
    status?: string;
  }>;
}

export const STATUS_COLORS: Record<
  DayStatus,
  { bg: string; border: string; text: string; emoji: string; label: string }
> = {
  available: {
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.28)',
    text: '#047857',
    emoji: '🟢',
    label: 'Libre',
  },
  booked: {
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.28)',
    text: '#b91c1c',
    emoji: '🔴',
    label: 'Réservé',
  },
  closed: {
    bg: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 4px, #f3f4f6 4px, #f3f4f6 8px)',
    border: t.borderStrong,
    text: t.text3,
    emoji: '🔒',
    label: 'Bloqué',
  },
  pending: {
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.28)',
    text: '#b45309',
    emoji: '⏳',
    label: 'En attente',
  },
  nodata: {
    bg: t.bg1,
    border: t.border,
    text: t.text3,
    emoji: '○',
    label: 'Sans donnée',
  },
};

/** Date locale YYYY-MM-DD (évite le décalage UTC de toISOString) */
export function toLocalDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseApiDateKey(raw: string | Date): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const d = new Date(raw);
  return toLocalDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDaysToDateKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return toLocalDateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export function getInventoryDayPrice(day: InventoryDayRow): number {
  if (day.applyManual && day.manualPrice != null && day.manualPrice > 0) {
    return Number(day.manualPrice);
  }
  if (day.calculatedPrice != null && day.calculatedPrice > 0) {
    return Number(day.calculatedPrice);
  }
  if (day.basePrice != null && day.basePrice > 0) {
    return Number(day.basePrice);
  }
  return 0;
}

export function mapInventoryDayToStatus(day: InventoryDayRow): DayStatus {
  const reservations = day.reservations ?? [];
  const activeResa = reservations.filter(
    r => r.status === 'Confirmed' || r.status === 'Pending',
  );

  if (day.stopSell === true || day.available === false) return 'closed';
  if (activeResa.some(r => r.status === 'Pending') && !activeResa.some(r => r.status === 'Confirmed')) {
    return 'pending';
  }
  if (activeResa.length > 0 || (day.availableRoom != null && day.availableRoom <= 0)) {
    return 'booked';
  }
  if (day.closed_to_arrival && day.closed_to_departure) return 'closed';
  return 'available';
}

export function mapApiDayToStatus(apiDay?: CalendarDay): DayStatus {
  if (!apiDay) return 'nodata';
  if (apiDay.status?.toLowerCase() === 'pending' || (apiDay.countPendingUnits ?? 0) > 0) {
    return 'pending';
  }
  if (!apiDay.isAvailable) return 'closed';
  if (apiDay.reservations && apiDay.reservations.length > 0) return 'booked';
  return 'available';
}

function buildMonthGrid(
  year: number,
  month: number,
  resolveDay: (dateStr: string, inMonth: boolean) => Omit<AvailabilityDayCell, 'date' | 'day' | 'weekday' | 'inMonth'>,
): AvailabilityDayCell[] {
  const last = new Date(year, month + 1, 0);
  const lastDate = last.getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDate) / 7) * 7;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const cells: AvailabilityDayCell[] = [];

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= lastDate;
    const dateStr = inMonth ? toLocalDateKey(year, month, dayNum) : toLocalDateKey(year, month, Math.max(1, dayNum));
    const wd = (new Date(year, month, Math.max(1, Math.min(dayNum, lastDate))).getDay() + 6) % 7;
    const extra = inMonth ? resolveDay(dateStr, true) : resolveDay(dateStr, false);

    cells.push({
      date: dateStr,
      day: inMonth ? dayNum : dayNum,
      weekday: wd,
      inMonth,
      ...extra,
      isToday: isCurrentMonth && today.getDate() === dayNum && inMonth,
    });
  }

  return cells;
}

export function buildAvailabilityMonthCellsFromInventory(
  inventoryDays: InventoryDayRow[],
  year: number,
  month: number,
): AvailabilityDayCell[] {
  const dayMap = new Map<string, InventoryDayRow>();
  inventoryDays.forEach(d => {
    dayMap.set(parseApiDateKey(d.date), d);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return buildMonthGrid(year, month, (dateStr, inMonth) => {
    if (!inMonth) {
      return { status: 'nodata', price: 0, hasInventoryData: false };
    }

    // Marquer les jours passés comme "closed"
    if (dateStr < todayKey) {
      return { status: 'closed', price: 0, hasInventoryData: true };
    }

    const row = dayMap.get(dateStr);
    if (!row) {
      return { status: 'nodata', price: 0, hasInventoryData: false };
    }

    const status = mapInventoryDayToStatus(row);
    let bookedBy: AvailabilityDayCell['bookedBy'];
    const res = row.reservations?.[0];
    if (res) {
      bookedBy = {
        initials: `${res.guestFirstName?.[0] || ''}${res.guestLastName?.[0] || ''}`.trim() || '?',
        name: `${res.guestFirstName || ''} ${res.guestLastName || ''}`.trim() || 'Résa',
      };
    }

    return {
      status,
      price: getInventoryDayPrice(row),
      minNights: row.min_stay_arrival,
      hasInventoryData: true,
      bookedBy,
    };
  });
}

export function buildAvailabilityMonthCells(
  apiDays: CalendarDay[],
  year: number,
  month: number,
): AvailabilityDayCell[] {
  const dayMap = new Map<string, CalendarDay>();
  apiDays.forEach(d => {
    dayMap.set(parseApiDateKey(d.date), d);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return buildMonthGrid(year, month, (dateStr, inMonth) => {
    if (!inMonth) {
      return { status: 'nodata', price: 0, hasInventoryData: false };
    }

    // Marquer les jours passés comme "closed"
    if (dateStr < todayKey) {
      return { status: 'closed', price: 0, hasInventoryData: true };
    }

    const apiDay = dayMap.get(dateStr);
    if (!apiDay) {
      return { status: 'nodata', price: 0, hasInventoryData: false };
    }

    let bookedBy: AvailabilityDayCell['bookedBy'];
    if (apiDay.reservations?.length) {
      const res = apiDay.reservations[0];
      bookedBy = {
        initials: `${res.guestFirstName?.[0] || ''}${res.guestLastName?.[0] || ''}`.trim() || '?',
        name: res.guestName || `${res.guestFirstName || ''} ${res.guestLastName || ''}`.trim() || 'Résa',
      };
    }

    return {
      status: mapApiDayToStatus(apiDay),
      price: apiDay.price ?? 0,
      minNights: apiDay.minimumStay,
      hasInventoryData: true,
      bookedBy,
    };
  });
}

export function isDateSelectableForCheckIn(cell: AvailabilityDayCell): boolean {
  if (!cell.inMonth || cell.status !== 'available') return false;

  // Bloquer les jours passés
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return cell.date >= todayKey;
}

export function isStayRangeValid(
  checkIn: string,
  checkOut: string,
  cells: AvailabilityDayCell[],
): boolean {
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;

  // Vérifier que le check-in n'est pas dans le passé
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  if (checkIn < todayKey) return false;

  const byDate = new Map(cells.filter(c => c.inMonth).map(c => [c.date, c]));
  let cursor = checkIn;
  while (cursor < checkOut) {
    const cell = byDate.get(cursor);
    if (!cell || cell.status !== 'available') return false;
    cursor = addDaysToDateKey(cursor, 1);
  }
  return true;
}

export function datesInRange(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cursor = checkIn;
  while (cursor < checkOut) {
    out.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return out;
}

/** Extrait les jours inventaire d'une réponse get-inventory */
export function pickInventoryDaysForListing(
  inventoryList: Array<{
    listingId?: string;
    _id?: string;
    roomTypes?: Array<{
      roomTypeId?: string;
      availableRoomsByDay?: InventoryDayRow[];
    }>;
  }>,
  listingId: string,
  roomTypeId?: string,
): InventoryDayRow[] {
  const listing = inventoryList.find(
    item => String(item.listingId ?? item._id) === String(listingId),
  );
  if (!listing?.roomTypes?.length) return [];

  const room =
    (roomTypeId
      ? listing.roomTypes.find(rt => String(rt.roomTypeId) === String(roomTypeId))
      : null) ?? listing.roomTypes[0];

  return room?.availableRoomsByDay ?? [];
}
