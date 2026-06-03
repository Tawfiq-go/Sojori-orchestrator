/** Créneaux arrivée / départ — TS_CHECKIN[] · TS_CHECKOUT[] (srv-listing). */

import type { TimeSlot } from './cleaningConfigTypes';

export type ArrivalDepartureConfig = {
  checkinTimeslotsEnabled: boolean;
  checkoutTimeslotsEnabled: boolean;
  checkInTimeStart: number;
  checkInTimeEnd: number;
  checkOutTime: number;
  TS_CHECKIN: TimeSlot[];
  TS_CHECKOUT: TimeSlot[];
};

export const DEFAULT_TS_CHECKIN: TimeSlot[] = [
  { start: 12, end: 14, type: 'Early', price: 200, default: false },
  { start: 15, end: 17, type: 'Normal', price: 0, default: true },
  { start: 17, end: 19, type: 'Normal', price: 0, default: false },
  { start: 19, end: 21, type: 'Normal', price: 0, default: false },
  { start: 21, end: 24, type: 'Late', price: 100, default: false },
];

export const DEFAULT_TS_CHECKOUT: TimeSlot[] = [
  { start: 8, end: 10, type: 'Early', price: 0, default: false },
  { start: 10, end: 12, type: 'Normal', price: 0, default: true },
  { start: 12, end: 14, type: 'Late', price: 200, default: false },
];

function normalizeSlots(raw: unknown, fallback: TimeSlot[]): TimeSlot[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback.map(s => ({ ...s }));
  return raw.map(row => {
    const r = row as Record<string, unknown>;
    return {
      start: Number(r.start) || 0,
      end: Number(r.end) || 0,
      type: String(r.type || 'Normal'),
      price: Number(r.price) || 0,
      default: r.default === true,
    };
  });
}

export function mapListingToArrivalDepartureConfig(raw: Record<string, unknown>): ArrivalDepartureConfig {
  return {
    checkinTimeslotsEnabled: raw.checkinTimeslotsEnabled !== false,
    checkoutTimeslotsEnabled: raw.checkoutTimeslotsEnabled !== false,
    checkInTimeStart: typeof raw.checkInTimeStart === 'number' ? raw.checkInTimeStart : 15,
    checkInTimeEnd: typeof raw.checkInTimeEnd === 'number' ? raw.checkInTimeEnd : 21,
    checkOutTime: typeof raw.checkOutTime === 'number' ? raw.checkOutTime : 11,
    TS_CHECKIN: normalizeSlots(raw.TS_CHECKIN, DEFAULT_TS_CHECKIN),
    TS_CHECKOUT: normalizeSlots(raw.TS_CHECKOUT, DEFAULT_TS_CHECKOUT),
  };
}

export function mapArrivalDepartureToListingPatch(cfg: ArrivalDepartureConfig): Record<string, unknown> {
  return {
    checkinTimeslotsEnabled: cfg.checkinTimeslotsEnabled,
    checkoutTimeslotsEnabled: cfg.checkoutTimeslotsEnabled,
    checkInTimeStart: cfg.checkInTimeStart,
    checkInTimeEnd: cfg.checkInTimeEnd,
    checkOutTime: cfg.checkOutTime,
    TS_CHECKIN: cfg.TS_CHECKIN.map(s => ({ ...s })),
    TS_CHECKOUT: cfg.TS_CHECKOUT.map(s => ({ ...s })),
  };
}
