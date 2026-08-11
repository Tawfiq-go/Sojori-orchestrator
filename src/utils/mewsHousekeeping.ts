/** Badges housekeeping Mews Resource.State (Multi rooms). */

export type MewsHousekeepingState =
  | 'Clean'
  | 'Dirty'
  | 'Inspected'
  | 'OutOfOrder'
  | 'OutOfService'
  | string;

const LABELS: Record<string, string> = {
  Clean: 'Clean',
  Dirty: 'Dirty',
  Inspected: 'Inspected',
  OutOfOrder: 'OOO',
  OutOfService: 'OOS',
};

const STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Clean: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  Dirty: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Inspected: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  OutOfOrder: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  OutOfService: { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' },
};

export function normalizeMewsHousekeepingState(
  state?: string | null,
): string | null {
  const s = String(state || '').trim();
  return s || null;
}

export function mewsHousekeepingShortLabel(state?: string | null): string | null {
  const s = normalizeMewsHousekeepingState(state);
  if (!s) return null;
  return LABELS[s] || s.slice(0, 6);
}

export function mewsHousekeepingBadgeStyle(state?: string | null): {
  label: string;
  bg: string;
  color: string;
  border: string;
} | null {
  const s = normalizeMewsHousekeepingState(state);
  if (!s) return null;
  const style = STYLES[s] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  return {
    label: LABELS[s] || s,
    ...style,
  };
}
