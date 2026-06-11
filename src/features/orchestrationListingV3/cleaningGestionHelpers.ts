import {
  DEFAULT_FREQUENCY,
  DEFAULT_TS_CLEAN,
  type CleaningListingConfig,
  type FrequencyTier,
  type TimeSlot,
} from '../listing/components/ConfigOrchestration/cleaningConfigTypes';

export type CleaningIncludedGestion = {
  frequency: FrequencyTier[];
  timeSlots: TimeSlot[];
  descriptionFr: string;
  extras: unknown[];
};

/** Heures entières 0h → 24h (fin de journée). */
export const CLEANING_SLOT_HOURS = Array.from({ length: 25 }, (_, i) => i);

export function parseCleaningIncludedGestion(
  gestion: Record<string, unknown> | undefined,
  listingValues: Record<string, unknown> = {},
): CleaningIncludedGestion {
  const g = gestion ?? {};
  const descFromG = typeof g.descriptionFr === 'string' ? g.descriptionFr : '';
  const descFromListing = (listingValues.includedCleaningDescription as { fr?: string } | undefined)?.fr;

  const hasGestionFreq = g.frequency !== undefined;
  const rawFreq = (
    hasGestionFreq ? g.frequency : listingValues.frequency
  ) as FrequencyTier[] | undefined;

  const hasGestionSlots = g.timeSlots !== undefined || g.TS_CLEAN !== undefined;
  const rawSlots = (
    hasGestionSlots ? (g.timeSlots ?? g.TS_CLEAN) : listingValues.TS_CLEAN
  ) as TimeSlot[] | undefined;

  return {
    frequency:
      Array.isArray(rawFreq) && rawFreq.length > 0
        ? rawFreq.map(normalizeTier)
        : DEFAULT_FREQUENCY.map(t => ({ ...t })),
    timeSlots: Array.isArray(rawSlots)
      ? rawSlots.map(normalizeIncludedCleaningSlot)
      : DEFAULT_TS_CLEAN.map(s => normalizeIncludedCleaningSlot({ ...s })),
    descriptionFr:
      descFromG ||
      descFromListing ||
      'Ménage inclus pendant votre séjour selon la durée de votre réservation.',
    extras: Array.isArray(g.extras) ? g.extras : [],
  };
}

export function cleaningIncludedToGestion(state: CleaningIncludedGestion): Record<string, unknown> {
  const slots = state.timeSlots.map(normalizeIncludedCleaningSlot);
  return {
    frequency: state.frequency,
    timeSlots: slots,
    TS_CLEAN: slots,
    descriptionFr: state.descriptionFr,
    extras: state.extras,
  };
}

function normalizeTier(t: FrequencyTier): FrequencyTier {
  return {
    startDay: Number(t.startDay) || 1,
    endDay: Number(t.endDay) || 1,
    numberOfCleaning: Number(t.numberOfCleaning) || 0,
  };
}

/** Ménage inclus : pas de type Early/Late ni supplément. */
export function normalizeIncludedCleaningSlot(s: TimeSlot): TimeSlot {
  const start = clampCleaningHour(s.start, 0, 23);
  let end = clampCleaningHour(s.end, 1, 24);
  if (end <= start) end = Math.min(24, start + 2);
  return {
    start,
    end,
    price: 0,
    default: s.default === true,
  };
}

function clampCleaningHour(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Nouveau créneau : début = fin du précédent, fin = début + 2h. */
export function proposeNextIncludedCleaningSlot(slots: TimeSlot[]): TimeSlot {
  const normalized = slots.map(normalizeIncludedCleaningSlot);
  if (normalized.length === 0) {
    return { start: 9, end: 11, price: 0, default: true };
  }
  const last = normalized[normalized.length - 1];
  const start = last.end >= 24 ? 9 : last.end;
  const end = Math.min(24, start + 2);
  const hasDefault = normalized.some(s => s.default);
  return {
    start,
    end: end > start ? end : Math.min(24, start + 2),
    price: 0,
    default: !hasDefault,
  };
}

/** Ménages offerts pour N nuits (premier palier qui couvre la durée). */
export function cleaningsForNights(nights: number, tiers: FrequencyTier[]): number {
  if (!tiers.length || nights < 1) return 0;
  const sorted = [...tiers].sort((a, b) => a.startDay - b.startDay);
  const hit =
    sorted.find(t => nights >= t.startDay && nights <= t.endDay) ??
    sorted.filter(t => nights >= t.startDay).pop();
  return hit?.numberOfCleaning ?? 0;
}

export function formatHour(h: number): string {
  return `${String(Math.min(24, Math.max(0, h))).padStart(2, '0')}:00`;
}
