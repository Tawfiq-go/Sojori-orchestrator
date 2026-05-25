/**
 * Listing check-in / check-out : Mongo & RU stockent des heures 0–23 (number).
 * Les inputs HTML type="time" attendent "HH:mm".
 */

export function hourNumberToTimeInput(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && value.includes(':')) {
    const [h, m] = value.split(':');
    const hour = Number(h);
    const min = Number(m ?? 0);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return '';
    return `${String(hour).padStart(2, '0')}:${String(Number.isFinite(min) ? min : 0).padStart(2, '0')}`;
  }
  const hour = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return '';
  return `${String(Math.floor(hour)).padStart(2, '0')}:00`;
}

export function timeInputToHourNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 23) {
    return Math.floor(value);
  }
  const s = String(value).trim();
  if (!s) return undefined;
  if (s.includes(':')) {
    const [h] = s.split(':');
    const hour = Number(h);
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return Math.floor(hour);
    return undefined;
  }
  const hour = Number(s);
  if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return Math.floor(hour);
  return undefined;
}

/** Fin de plage check-in pour RU : +2h par défaut si non définie ou ≤ début. */
export function resolveCheckInTimeEnd(startHour: number, previousEnd?: number): number {
  if (
    previousEnd != null &&
    Number.isFinite(previousEnd) &&
    previousEnd > startHour &&
    previousEnd <= 23
  ) {
    return Math.floor(previousEnd);
  }
  return Math.min(23, startHour + 2);
}
