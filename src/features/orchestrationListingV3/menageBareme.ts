/** Barème ménage — configuré vs réel (fenêtre 30 j).
 *  Logique pure (parse réponse fulltask + verdict) séparée du panneau — testable node:test.
 *  Route : GET /api/v1/admin/fulltask/tasks/menage/bareme?listingId=<id>. */

export type BaremeNature =
  | 'cleaning_stay'
  | 'cleaning_checkout'
  | 'cleaning_express'
  | 'cleaning_deep';

export type BaremeLevel = 'normal' | 'grand';

export type BaremeRow = {
  nature: BaremeNature;
  level: BaremeLevel;
  label: string;
  count: number;
  configuredMin: number | null;
  avgRealMin: number | null;
  minRealMin: number | null;
  maxRealMin: number | null;
};

export type BaremeResponse = { windowDays: number; rows: BaremeRow[] };

export const BAREME_LEVEL_LABELS: Record<BaremeLevel, string> = {
  normal: 'Normal',
  grand: 'Grand',
};

const NATURES: readonly string[] = [
  'cleaning_stay',
  'cleaning_checkout',
  'cleaning_express',
  'cleaning_deep',
];

function asNullableMin(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/** Parse tolérant — accepte le corps brut ou enveloppé { success, data }. */
export function parseBaremeResponse(raw: unknown): BaremeResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const body = (r.data && typeof r.data === 'object' ? r.data : raw) as Record<string, unknown>;
  const rowsRaw = Array.isArray(body.rows) ? body.rows : null;
  if (!rowsRaw) return null;
  const rows: BaremeRow[] = [];
  for (const item of rowsRaw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (!NATURES.includes(String(o.nature))) continue;
    if (o.level !== 'normal' && o.level !== 'grand') continue;
    rows.push({
      nature: o.nature as BaremeNature,
      level: o.level,
      label: typeof o.label === 'string' && o.label ? o.label : String(o.nature),
      count: typeof o.count === 'number' && Number.isFinite(o.count) ? Math.max(0, o.count) : 0,
      configuredMin: asNullableMin(o.configuredMin),
      avgRealMin: asNullableMin(o.avgRealMin),
      minRealMin: asNullableMin(o.minRealMin),
      maxRealMin: asNullableMin(o.maxRealMin),
    });
  }
  const windowDays =
    typeof body.windowDays === 'number' && Number.isFinite(body.windowDays) && body.windowDays > 0
      ? body.windowDays
      : 30;
  return { windowDays, rows };
}

export type BaremeVerdict =
  /** count < 10 — pas de conclusion. */
  | { kind: 'insufficient' }
  /** Configuré ou réel manquant — rien à comparer. */
  | { kind: 'no_data' }
  /** |écart| ≤ 15 % — durée configurée juste. */
  | { kind: 'juste'; deltaPct: number }
  /** |écart| > 15 % et count ≥ 20 — écart confirmé. */
  | { kind: 'ecart'; deltaPct: number }
  /** |écart| > 15 % mais 10 ≤ count < 20 — tendance à confirmer. */
  | { kind: 'tendance'; deltaPct: number };

/** Écart relatif réel vs configuré, en % arrondi (signé : + = réel plus long). */
export function baremeDeltaPct(configuredMin: number, avgRealMin: number): number {
  if (configuredMin <= 0) return 0;
  return Math.round(((avgRealMin - configuredMin) / configuredMin) * 100);
}

export function baremeVerdict(row: BaremeRow): BaremeVerdict {
  if (row.count < 10) return { kind: 'insufficient' };
  if (row.configuredMin == null || row.avgRealMin == null || row.configuredMin <= 0) {
    return { kind: 'no_data' };
  }
  const deltaPct = baremeDeltaPct(row.configuredMin, row.avgRealMin);
  if (Math.abs(deltaPct) <= 15) return { kind: 'juste', deltaPct };
  if (row.count >= 20) return { kind: 'ecart', deltaPct };
  return { kind: 'tendance', deltaPct };
}

/** Échelle (minutes) de la barre d'une ligne — max réel/configuré + marge. */
export function baremeScaleMax(row: BaremeRow): number {
  const candidates = [row.maxRealMin, row.avgRealMin, row.configuredMin].filter(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  if (!candidates.length) return 1;
  return Math.max(...candidates) * 1.15;
}

export type BaremeViewState =
  /** Backend sans la route (404) — « disponible après la prochaine mise à jour ». */
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'empty'; windowDays: number }
  | { kind: 'rows'; windowDays: number; rows: BaremeRow[] };

/** Résout l'état d'affichage depuis l'issue de l'appel réseau. */
export function resolveBaremeView(outcome: {
  ok: boolean;
  status?: number | null;
  body?: unknown;
}): BaremeViewState {
  if (!outcome.ok) {
    return outcome.status === 404 ? { kind: 'unavailable' } : { kind: 'error' };
  }
  const parsed = parseBaremeResponse(outcome.body);
  if (!parsed) return { kind: 'error' };
  if (!parsed.rows.length) return { kind: 'empty', windowDays: parsed.windowDays };
  return { kind: 'rows', windowDays: parsed.windowDays, rows: parsed.rows };
}
