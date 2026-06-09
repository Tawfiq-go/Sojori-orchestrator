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

export function parseCleaningIncludedGestion(
  gestion: Record<string, unknown> | undefined,
  listingValues: Record<string, unknown> = {},
): CleaningIncludedGestion {
  const g = gestion ?? {};
  const descFromG = typeof g.descriptionFr === 'string' ? g.descriptionFr : '';
  const descFromListing = (listingValues.includedCleaningDescription as { fr?: string } | undefined)?.fr;

  const rawFreq = (g.frequency ?? listingValues.frequency) as FrequencyTier[] | undefined;
  const rawSlots = (g.timeSlots ?? g.TS_CLEAN ?? listingValues.TS_CLEAN) as TimeSlot[] | undefined;

  return {
    frequency:
      Array.isArray(rawFreq) && rawFreq.length > 0
        ? rawFreq.map(normalizeTier)
        : DEFAULT_FREQUENCY.map(t => ({ ...t })),
    timeSlots:
      Array.isArray(rawSlots) && rawSlots.length > 0
        ? rawSlots.map(normalizeSlot)
        : DEFAULT_TS_CLEAN.map(s => ({ ...s })),
    descriptionFr:
      descFromG ||
      descFromListing ||
      'Ménage inclus pendant votre séjour selon la durée de votre réservation.',
    extras: Array.isArray(g.extras) ? g.extras : [],
  };
}

export function cleaningIncludedToGestion(state: CleaningIncludedGestion): Record<string, unknown> {
  return {
    frequency: state.frequency,
    timeSlots: state.timeSlots,
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

function normalizeSlot(s: TimeSlot): TimeSlot {
  return {
    start: Number(s.start) || 0,
    end: Number(s.end) || 0,
    type: s.type || 'Normal',
    price: Number(s.price) || 0,
    default: s.default === true,
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
