import { addDays, startOfDay } from 'date-fns';

/** Visible day columns in StayView grid. */
export const PLANNING_VISIBLE_DAYS = 14;

/** Days before today on initial load (J-1 : seulement la veille). */
export const PLANNING_INITIAL_BACK_DAYS = 1;

/** History window for minimap / scroll buffer. */
export const PLANNING_LOOKBACK_DAYS = 7;

/** Forward window for minimap / scroll buffer. */
export const PLANNING_FORWARD_DAYS = 23;

export function getPlanningDefaultStartDate(now = new Date()): Date {
  return addDays(startOfDay(now), -PLANNING_INITIAL_BACK_DAYS);
}

export function getPlanningGridScrollLeft(todayIdx: number, cellWidth: number): number {
  return Math.max(0, (todayIdx - PLANNING_INITIAL_BACK_DAYS) * cellWidth);
}
