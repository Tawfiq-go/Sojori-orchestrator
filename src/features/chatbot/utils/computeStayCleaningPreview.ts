/**
 * Prévisualisation admin — alignée srv-fulltask / srv-fullchatbot cleaningAllowance.
 * Affiche quels jours sont inclus (frequency[]) vs payants (paidCleaningConfig).
 */

export type FrequencyTier = {
  startDay: number;
  endDay: number;
  numberOfCleaning: number;
};

export type CleaningTimeSlot = {
  start: number;
  end: number;
  default?: boolean;
};

export type PaidCleaningSnapshot = {
  enabled?: boolean;
  frequency?: 'all_days' | 'per_week';
  perWeekCount?: number;
  availableWeekdays?: number[];
  serviceTypes?: Array<{
    id?: string;
    enabled?: boolean;
    labelFr?: string;
    price?: number;
    timeslots?: CleaningTimeSlot[];
  }>;
};

export type ListingCleaningSnapshot = {
  frequency?: FrequencyTier[];
  tsClean?: CleaningTimeSlot[];
  includedDescriptionFr?: string;
  paidConfig?: PaidCleaningSnapshot;
};

export type StayCleaningDayKind =
  | 'free_included'
  | 'paid_eligible'
  | 'paid_blocked_weekday'
  | 'paid_disabled'
  | 'free_disabled';

export type StayCleaningDay = {
  date: string;
  dateLabel: string;
  weekdayLabel: string;
  dayOfStay: number;
  kind: StayCleaningDayKind;
  blockReason?: string;
};

export type StayCleaningPreview = {
  nights: number;
  tierLabel: string | null;
  freeOffered: number;
  freeEnabled: boolean;
  paidEnabled: boolean;
  midStayDayCount: number;
  freeDayCount: number;
  paidEligibleCount: number;
  paidBlockedWeekdayCount: number;
  paidFrequencyLabel: string;
  paidWeekdaysLabel: string;
  paidPerWeekMax: number | null;
  tsCleanSlots: Array<{ label: string; default: boolean }>;
  freeDays: StayCleaningDay[];
  paidEligibleDays: StayCleaningDay[];
  paidBlockedDays: StayCleaningDay[];
  minPaidPriceMad: number | null;
};

const WEEKDAY_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Index config DayPills : 0=Lun … 6=Dim */
function frenchWeekdayIndex(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function computeStayNights(checkIn: Date, checkOut: Date): number {
  const a = startOfUtcDay(checkIn);
  const b = startOfUtcDay(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

function matchFrequencyRange(nights: number, frequency: FrequencyTier[]): FrequencyTier | null {
  if (!frequency?.length || nights <= 0) return null;
  const sorted = [...frequency].sort((a, b) => a.startDay - b.startDay);
  return sorted.find((r) => nights >= r.startDay && nights <= r.endDay) ?? null;
}

function eligibleFreeCleaningDays(checkIn: Date, checkOut: Date): Date[] {
  const days: Date[] = [];
  let cursor = addUtcDays(startOfUtcDay(checkIn), 1);
  const checkoutDay = startOfUtcDay(checkOut);
  while (cursor.getTime() < checkoutDay.getTime()) {
    days.push(new Date(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return days;
}

function pickDistributedIndices(eligibleCount: number, count: number): number[] {
  if (count <= 0 || eligibleCount <= 0) return [];
  const want = Math.min(count, eligibleCount);
  const indices: number[] = [];
  const used = new Set<number>();
  for (let k = 1; k <= want; k++) {
    let idx = Math.min(
      eligibleCount - 1,
      Math.max(0, Math.round((k * eligibleCount) / (want + 1)) - 1),
    );
    let guard = 0;
    while (used.has(idx) && guard < eligibleCount) {
      idx = (idx + 1) % eligibleCount;
      guard++;
    }
    used.add(idx);
    indices.push(idx);
  }
  return indices.sort((a, b) => a - b);
}

function formatFrDate(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00.000Z`);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function formatTsClean(ts: CleaningTimeSlot[]): Array<{ label: string; default: boolean }> {
  if (!ts?.length) {
    return [
      { label: '10h – 12h', default: true },
      { label: '14h – 16h', default: false },
    ];
  }
  return ts.map((s) => ({
    label: `${s.start}h – ${s.end}h`,
    default: Boolean(s.default),
  }));
}

function weekdaysConfigLabel(days: number[]): string {
  const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  if (!days?.length) return 'Aucun';
  if (days.length === 7) return 'Tous les jours';
  return [...days]
    .sort((a, b) => a - b)
    .map((i) => labels[i] ?? '?')
    .join(', ');
}

export function computeStayCleaningPreview(input: {
  checkIn: Date | string;
  checkOut: Date | string;
  cleaning?: ListingCleaningSnapshot | null;
  freeCleaningEnabled?: boolean;
  paidCleaningEnabled?: boolean;
}): StayCleaningPreview | null {
  const checkIn = startOfUtcDay(new Date(input.checkIn));
  const checkOut = startOfUtcDay(new Date(input.checkOut));
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) return null;

  const cleaning = input.cleaning ?? {};
  const frequency = cleaning.frequency ?? [];
  const paid = cleaning.paidConfig ?? {};
  const freeEnabled = input.freeCleaningEnabled !== false;
  const paidEnabled =
    input.paidCleaningEnabled !== false && paid.enabled !== false;

  const nights = computeStayNights(checkIn, checkOut);
  const tier = matchFrequencyRange(nights, frequency);
  const freeOffered = Math.max(0, Number(tier?.numberOfCleaning ?? 0));
  const tierLabel = tier ? `J${tier.startDay}–${tier.endDay} (${freeOffered} inclus)` : null;

  const checkInDay = startOfUtcDay(checkIn);
  const eligible = eligibleFreeCleaningDays(checkIn, checkOut);
  const indices = pickDistributedIndices(eligible.length, freeOffered);
  const freeDates = new Set(
    indices.map((idx) => eligible[idx].toISOString().slice(0, 10)),
  );

  const allowedWeekdays =
    Array.isArray(paid.availableWeekdays) && paid.availableWeekdays.length > 0
      ? paid.availableWeekdays
      : [0, 1, 2, 3, 4, 5, 6];

  const paidFrequencyLabel =
    paid.frequency === 'per_week'
      ? `Par semaine · max ${paid.perWeekCount ?? 1} / semaine`
      : 'Tous les jours du séjour (hors inclus)';

  const freeDays: StayCleaningDay[] = [];
  const paidEligibleDays: StayCleaningDay[] = [];
  const paidBlockedDays: StayCleaningDay[] = [];

  for (let i = 0; i < eligible.length; i++) {
    const d = eligible[i];
    const date = d.toISOString().slice(0, 10);
    const dayOfStay = Math.round((d.getTime() - checkInDay.getTime()) / 86_400_000);
    const wIdx = frenchWeekdayIndex(d);
    const base = {
      date,
      dateLabel: formatFrDate(date),
      weekdayLabel: WEEKDAY_FR[wIdx],
      dayOfStay,
    };

    if (freeDates.has(date)) {
      freeDays.push({
        ...base,
        kind: freeEnabled ? 'free_included' : 'free_disabled',
        blockReason: freeEnabled ? undefined : 'Ménage gratuit désactivé (orchestration)',
      });
      continue;
    }

    if (!paidEnabled) {
      paidBlockedDays.push({
        ...base,
        kind: 'paid_disabled',
        blockReason: 'Ménage payant désactivé',
      });
      continue;
    }

    if (!allowedWeekdays.includes(wIdx)) {
      paidBlockedDays.push({
        ...base,
        kind: 'paid_blocked_weekday',
        blockReason: `Jour non autorisé (${WEEKDAY_FR[wIdx]} absent de la config)`,
      });
      continue;
    }

    paidEligibleDays.push({
      ...base,
      kind: 'paid_eligible',
    });
  }

  const serviceTypes = (paid.serviceTypes ?? []).filter((s) => s.enabled !== false);
  const minPaidPriceMad =
    serviceTypes.length > 0
      ? Math.min(...serviceTypes.map((s) => Number(s.price ?? 0)).filter((p) => p > 0))
      : null;

  return {
    nights,
    tierLabel,
    freeOffered,
    freeEnabled,
    paidEnabled,
    midStayDayCount: eligible.length,
    freeDayCount: freeDays.filter((d) => d.kind === 'free_included').length,
    paidEligibleCount: paidEligibleDays.length,
    paidBlockedWeekdayCount: paidBlockedDays.filter((d) => d.kind === 'paid_blocked_weekday').length,
    paidFrequencyLabel,
    paidWeekdaysLabel: weekdaysConfigLabel(allowedWeekdays),
    paidPerWeekMax: paid.frequency === 'per_week' ? paid.perWeekCount ?? 1 : null,
    tsCleanSlots: formatTsClean(cleaning.tsClean ?? []),
    freeDays,
    paidEligibleDays,
    paidBlockedDays,
  };
}
