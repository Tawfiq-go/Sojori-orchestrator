import type { OcrExtractedFields, OcrReferenceValues } from '../../services/ocrBenchmarkService';

export type FieldReviewStatus = 'unreviewed' | 'correct' | 'incorrect';

export type FieldReviewEntry = {
  status: FieldReviewStatus;
  correction?: string;
};

export type ReviewStore = Record<string, FieldReviewEntry>;

export type SessionRun = {
  runId: string;
  modelId: string;
};

export const OCR_REVIEW_FIELD_KEYS = [
  'document_type',
  'observed_document_type',
  'first_name',
  'last_name',
  'document_number',
  'nationality',
  'issuing_country',
  'residence_country',
  'gender',
  'birth_date',
  'place_of_birth',
  'document_issued_at',
  'document_issued_on',
  'document_expiry_date',
  'personal_number',
  'mrz_line1',
  'mrz_line2',
  'mrz_line3',
] as const satisfies ReadonlyArray<keyof OcrExtractedFields>;

export type OcrReviewFieldKey = (typeof OCR_REVIEW_FIELD_KEYS)[number];

export function reviewStorageKey(runId: string, fieldKey: string): string {
  return `${runId}|${fieldKey}`;
}

export function parseReviewKey(key: string): { runId: string; fieldKey: string } | null {
  const idx = key.indexOf('|');
  if (idx <= 0) return null;
  return { runId: key.slice(0, idx), fieldKey: key.slice(idx + 1) };
}

export function getFieldReview(
  store: ReviewStore,
  runId: string,
  fieldKey: string,
): FieldReviewEntry {
  return store[reviewStorageKey(runId, fieldKey)] ?? { status: 'unreviewed' };
}

export function computeReviewStats(
  store: ReviewStore,
  runId: string,
  fieldKeys: readonly string[] = OCR_REVIEW_FIELD_KEYS,
): {
  totalFields: number;
  reviewedCount: number;
  correctCount: number;
  incorrectCount: number;
  manualAccuracy: number | null;
  reviewStatus: 'not_reviewed' | 'partial' | 'complete';
} {
  const totalFields = fieldKeys.length;
  let reviewedCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;

  for (const fieldKey of fieldKeys) {
    const entry = getFieldReview(store, runId, fieldKey);
    if (entry.status === 'unreviewed') continue;
    reviewedCount++;
    if (entry.status === 'correct') correctCount++;
    if (entry.status === 'incorrect') incorrectCount++;
  }

  let reviewStatus: 'not_reviewed' | 'partial' | 'complete' = 'not_reviewed';
  if (reviewedCount === 0) reviewStatus = 'not_reviewed';
  else if (reviewedCount >= totalFields) reviewStatus = 'complete';
  else reviewStatus = 'partial';

  const manualAccuracy =
    reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : null;

  return {
    totalFields,
    reviewedCount,
    correctCount,
    incorrectCount,
    manualAccuracy,
    reviewStatus,
  };
}

export function formatManualAccuracyLabel(stats: ReturnType<typeof computeReviewStats>): string {
  if (stats.manualAccuracy == null) return 'Précision non évaluée';
  return `Précision manuelle : ${stats.manualAccuracy}% · ${stats.correctCount} corrects sur ${stats.reviewedCount} vérifiés`;
}

export function reviewStatusLabel(status: 'not_reviewed' | 'partial' | 'complete'): string {
  if (status === 'complete') return 'Complete';
  if (status === 'partial') return 'Partial';
  return 'Not reviewed';
}

const FIELD_TO_REFERENCE: Partial<Record<OcrReviewFieldKey, keyof OcrReferenceValues>> = {
  first_name: 'first_name',
  last_name: 'last_name',
  document_number: 'document_number',
  nationality: 'nationality',
  birth_date: 'birth_date',
  document_expiry_date: 'expiry_date',
  gender: 'gender',
  issuing_country: 'issuing_country',
};

/** Aggregate optional corrections from any run in this browser session (same image). */
export function correctionsToReference(store: ReviewStore): OcrReferenceValues | undefined {
  const out: OcrReferenceValues = {};
  for (const [key, entry] of Object.entries(store)) {
    if (entry.status !== 'incorrect') continue;
    const correction = String(entry.correction ?? '').trim();
    if (!correction) continue;
    const parsed = parseReviewKey(key);
    if (!parsed) continue;
    const refKey = FIELD_TO_REFERENCE[parsed.fieldKey as OcrReviewFieldKey];
    if (refKey) out[refKey] = correction;
  }
  return Object.keys(out).length ? out : undefined;
}

export function sortCompareResultsByManualReview<
  T extends {
    modelId: string;
    lastRun: { backendTotalMs: number } | null;
    aggregated: { avgEstimatedCostUsd: number | null };
  },
>(
  rows: T[],
  store: ReviewStore,
  runByModelId: Record<string, SessionRun | undefined>,
): T[] {
  return [...rows].sort((a, b) => {
    const statsA = runByModelId[a.modelId]
      ? computeReviewStats(store, runByModelId[a.modelId]!.runId)
      : null;
    const statsB = runByModelId[b.modelId]
      ? computeReviewStats(store, runByModelId[b.modelId]!.runId)
      : null;

    const reviewedA = statsA?.reviewedCount ?? 0;
    const reviewedB = statsB?.reviewedCount ?? 0;
    const accA = reviewedA > 0 ? (statsA?.manualAccuracy ?? -1) : -1;
    const accB = reviewedB > 0 ? (statsB?.manualAccuracy ?? -1) : -1;

    if (accA !== accB) return accB - accA;

    const timeA = a.lastRun?.backendTotalMs ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.lastRun?.backendTotalMs ?? Number.MAX_SAFE_INTEGER;
    if (timeA !== timeB) return timeA - timeB;

    const costA = a.aggregated.avgEstimatedCostUsd ?? Number.MAX_SAFE_INTEGER;
    const costB = b.aggregated.avgEstimatedCostUsd ?? Number.MAX_SAFE_INTEGER;
    return costA - costB;
  });
}
