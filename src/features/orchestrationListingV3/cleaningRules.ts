/** cleaningRules — doc NOMMOS §9. Merge partiel pour l’UI listing. */

export type CleaningStatusAccept = 'listing' | 'staff';

export type CleaningRules = {
  statusAccept: CleaningStatusAccept;
  defaults: { autoAccept: boolean; autoStart: boolean };
  types?: Partial<Record<string, { autoAccept?: boolean; autoStart?: boolean }>>;
  autoGenerate?: boolean;
  onDeparture?: { type?: string; enabled?: boolean };
  duringStay?: {
    type?: string;
    everyNDays?: number;
    skipArrivalDay?: boolean;
    skipDepartureDay?: boolean;
  };
  durations?: Partial<Record<string, number>>;
  canReportBlocker?: boolean;
};

export const CLEANING_CAP_TO_TYPE: Record<string, string> = {
  cleaning_sojori: 'cleaning_checkout',
  checkout_cleaning: 'cleaning_checkout',
  stay_cleaning: 'cleaning_stay',
  cleaning_stay: 'cleaning_stay',
  cleaning_checkout: 'cleaning_checkout',
  cleaning_express: 'cleaning_express',
  cleaning_deep: 'cleaning_deep',
  cleaning_free: 'cleaning_stay',
  cleaning_paid: 'cleaning_stay',
};

export function isCleaningCapabilityKey(capKey: string): boolean {
  return Boolean(CLEANING_CAP_TO_TYPE[capKey]);
}

export function mergeCleaningRulesPatch(existing: unknown, patch: unknown): CleaningRules {
  const base = normalize(existing);
  if (!patch || typeof patch !== 'object') return base;
  const p = patch as Record<string, unknown>;
  const next: CleaningRules = {
    ...base,
    types: { ...(base.types || {}) },
    durations: { ...(base.durations || {}) },
  };
  if (p.statusAccept === 'listing' || p.statusAccept === 'staff') next.statusAccept = p.statusAccept;
  if (p.defaults && typeof p.defaults === 'object') {
    const d = p.defaults as Record<string, unknown>;
    next.defaults = {
      autoAccept: typeof d.autoAccept === 'boolean' ? d.autoAccept : next.defaults.autoAccept,
      autoStart: typeof d.autoStart === 'boolean' ? d.autoStart : next.defaults.autoStart,
    };
  }
  if (p.types && typeof p.types === 'object') {
    for (const [k, v] of Object.entries(p.types as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const t = v as Record<string, unknown>;
      const prev = next.types?.[k] || {};
      next.types = {
        ...(next.types || {}),
        [k]: {
          ...prev,
          ...(typeof t.autoAccept === 'boolean' ? { autoAccept: t.autoAccept } : {}),
          ...(typeof t.autoStart === 'boolean' ? { autoStart: t.autoStart } : {}),
        },
      };
    }
  }
  if (typeof p.autoGenerate === 'boolean') next.autoGenerate = p.autoGenerate;
  return normalize(next);
}

function normalize(raw: unknown): CleaningRules {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const defaultsRaw =
    r.defaults && typeof r.defaults === 'object' ? (r.defaults as Record<string, unknown>) : {};
  const typesIn = r.types && typeof r.types === 'object' ? (r.types as Record<string, unknown>) : {};
  const types: CleaningRules['types'] = {};
  for (const [k, v] of Object.entries(typesIn)) {
    if (!v || typeof v !== 'object') continue;
    const t = v as Record<string, unknown>;
    types[k] = {
      ...(typeof t.autoAccept === 'boolean' ? { autoAccept: t.autoAccept } : {}),
      ...(typeof t.autoStart === 'boolean' ? { autoStart: t.autoStart } : {}),
    };
  }
  return {
    statusAccept: r.statusAccept === 'listing' ? 'listing' : 'staff',
    defaults: {
      autoAccept: defaultsRaw.autoAccept === true,
      autoStart: defaultsRaw.autoStart === true,
    },
    types,
    autoGenerate: r.autoGenerate === true,
    onDeparture:
      r.onDeparture && typeof r.onDeparture === 'object'
        ? (r.onDeparture as CleaningRules['onDeparture'])
        : { type: 'cleaning_checkout', enabled: false },
    duringStay:
      r.duringStay && typeof r.duringStay === 'object'
        ? (r.duringStay as CleaningRules['duringStay'])
        : { type: 'cleaning_stay', everyNDays: 1, skipArrivalDay: true, skipDepartureDay: true },
    durations:
      r.durations && typeof r.durations === 'object'
        ? (r.durations as CleaningRules['durations'])
        : {},
    canReportBlocker: r.canReportBlocker !== false,
  };
}

export function typeFlags(rules: CleaningRules, catalogType: string): { autoAccept: boolean; autoStart: boolean } {
  const over = rules.types?.[catalogType] || {};
  return {
    autoAccept: typeof over.autoAccept === 'boolean' ? over.autoAccept : rules.defaults.autoAccept,
    autoStart: typeof over.autoStart === 'boolean' ? over.autoStart : rules.defaults.autoStart,
  };
}
