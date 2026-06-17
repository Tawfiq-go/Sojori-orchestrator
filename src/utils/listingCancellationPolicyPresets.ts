/**
 * Politiques d'annulation RU : ValidFrom/ValidTo = jours avant arrivée, value = % pénalité.
 * Les plages ne doivent pas se chevaucher (ex. modérée 5j : gratuit ≥5j, pénalité 0–4j).
 */

export type CancellationPolicyUi =
  | 'flexible'
  | 'moderate'
  | 'strict'
  | 'super_strict'
  | 'non_refundable';

export type CancellationPolicyRow = { from: number; to: number; value: number };

export const CANCELLATION_POLICY_PRESETS: Record<CancellationPolicyUi, CancellationPolicyRow[]> = {
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

export function encodeCancellationPolicyUi(ui: string | undefined): CancellationPolicyRow[] {
  const key = (ui || 'flexible') as CancellationPolicyUi;
  return CANCELLATION_POLICY_PRESETS[key] ?? CANCELLATION_POLICY_PRESETS.flexible;
}

export function decodeCancellationPolicyUi(
  policies: CancellationPolicyRow[] | undefined,
): CancellationPolicyUi {
  if (!policies?.length) return 'flexible';
  for (const [key, preset] of Object.entries(CANCELLATION_POLICY_PRESETS) as Array<
    [CancellationPolicyUi, CancellationPolicyRow[]]
  >) {
    if (rowsEqual(policies, preset)) return key;
  }
  return 'flexible';
}
