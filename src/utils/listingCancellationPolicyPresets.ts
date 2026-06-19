/**
 * Politiques d'annulation RU : ValidFrom/ValidTo = jours avant arrivée, value = % pénalité.
 */

export type CancellationPolicyUi =
  | 'flexible'
  | 'moderate'
  | 'strict'
  | 'super_strict'
  | 'non_refundable'
  | 'custom';

export type CancellationPolicyRow = { from: number; to: number; value: number };

export const CANCELLATION_POLICY_PRESET_LABELS: Record<CancellationPolicyUi, string> = {
  flexible: 'Flexible · 24h avant',
  moderate: 'Modérée · 5 jours avant',
  strict: 'Strict · 14 jours avant',
  super_strict: 'Super strict · 30 j',
  non_refundable: 'Non remboursable',
  custom: 'Personnalisée (import RU)',
};

export const CANCELLATION_POLICY_PRESETS: Record<
  Exclude<CancellationPolicyUi, 'custom'>,
  CancellationPolicyRow[]
> = {
  flexible: [
    { from: 2, to: 365, value: 0 },
    { from: 0, to: 1, value: 100 },
  ],
  moderate: [
    { from: 5, to: 365, value: 0 },
    { from: 0, to: 4, value: 100 },
  ],
  strict: [
    { from: 14, to: 365, value: 0 },
    { from: 0, to: 13, value: 100 },
  ],
  super_strict: [
    { from: 30, to: 365, value: 0 },
    { from: 0, to: 29, value: 100 },
  ],
  non_refundable: [{ from: 0, to: 365, value: 100 }],
};

function normalizeRows(rows: CancellationPolicyRow[]): CancellationPolicyRow[] {
  return [...rows]
    .map((r) => ({ from: Number(r.from), to: Number(r.to), value: Number(r.value) }))
    .sort((a, b) => b.from - a.from || a.to - b.to);
}

function rowsEqual(a: CancellationPolicyRow[], b: CancellationPolicyRow[]): boolean {
  const na = normalizeRows(a);
  const nb = normalizeRows(b);
  if (na.length !== nb.length) return false;
  return na.every((row, i) => row.from === nb[i].from && row.to === nb[i].to && row.value === nb[i].value);
}

/** Distance heuristique entre paliers importés et un préréglage (0 = identique). */
function presetDistance(imported: CancellationPolicyRow[], preset: CancellationPolicyRow[]): number {
  const a = normalizeRows(imported);
  const b = normalizeRows(preset);
  if (a.length !== b.length) return 50 + Math.abs(a.length - b.length) * 20;
  let dist = 0;
  for (let i = 0; i < a.length; i += 1) {
    dist += Math.abs(a[i].from - b[i].from);
    dist += Math.abs(a[i].to - b[i].to);
    dist += Math.abs(a[i].value - b[i].value) * 2;
  }
  return dist;
}

export type CancellationPolicyDecodeResult = {
  exact: Exclude<CancellationPolicyUi, 'custom'> | null;
  suggested: Exclude<CancellationPolicyUi, 'custom'> | null;
  isCustom: boolean;
  matchScore: number;
};

const CLOSE_MATCH_MAX_DISTANCE = 12;

export function findClosestCancellationPreset(
  policies: CancellationPolicyRow[] | undefined,
): { key: Exclude<CancellationPolicyUi, 'custom'> | null; score: number } {
  if (!policies?.length) return { key: null, score: Infinity };
  let bestKey: Exclude<CancellationPolicyUi, 'custom'> | null = null;
  let bestScore = Infinity;
  for (const [key, preset] of Object.entries(CANCELLATION_POLICY_PRESETS) as Array<
    [Exclude<CancellationPolicyUi, 'custom'>, CancellationPolicyRow[]]
  >) {
    const score = presetDistance(policies, preset);
    if (score < bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return { key: bestKey, score: bestScore };
}

export function decodeCancellationPolicyUiDetailed(
  policies: CancellationPolicyRow[] | undefined,
): CancellationPolicyDecodeResult {
  if (!policies?.length) {
    return { exact: null, suggested: null, isCustom: false, matchScore: Infinity };
  }
  for (const [key, preset] of Object.entries(CANCELLATION_POLICY_PRESETS) as Array<
    [Exclude<CancellationPolicyUi, 'custom'>, CancellationPolicyRow[]]
  >) {
    if (rowsEqual(policies, preset)) {
      return { exact: key, suggested: key, isCustom: false, matchScore: 0 };
    }
  }
  const { key, score } = findClosestCancellationPreset(policies);
  const isCustom = score > CLOSE_MATCH_MAX_DISTANCE;
  return {
    exact: null,
    suggested: isCustom ? null : key,
    isCustom,
    matchScore: score,
  };
}

export function encodeCancellationPolicyUi(ui: string | undefined): CancellationPolicyRow[] {
  const key = String(ui || 'flexible').trim() as CancellationPolicyUi;
  if (key === 'custom') return [];
  return CANCELLATION_POLICY_PRESETS[key as Exclude<CancellationPolicyUi, 'custom'>] ?? CANCELLATION_POLICY_PRESETS.flexible;
}

/** @deprecated Préférer decodeCancellationPolicyUiDetailed */
export function decodeCancellationPolicyUi(
  policies: CancellationPolicyRow[] | undefined,
): CancellationPolicyUi {
  const r = decodeCancellationPolicyUiDetailed(policies);
  if (r.exact) return r.exact;
  if (r.isCustom) return 'custom';
  return r.suggested ?? 'flexible';
}
