import type { RuImportProgressData } from '../../../hooks/useRuImportProgress';
import type { ImportProgress, StepKey, StepState, StepStatus } from './_tokens';
import { STEPS_ORDER } from './_tokens';

const STEP_KEYS = new Set<string>(STEPS_ORDER);

function normalizeStepStatus(raw: string | undefined): StepStatus {
  if (raw === 'running' || raw === 'done' || raw === 'error' || raw === 'skipped') {
    return raw === 'skipped' ? 'done' : raw;
  }
  return 'pending';
}

/** Mappe la réponse polling srv-channels → format UI Claude Design. */
export function adaptRuImportProgress(raw: RuImportProgressData | null): ImportProgress | null {
  if (!raw) return null;

  const byKey = new Map<string, { status: StepStatus; errorMessage?: string; meta?: Record<string, unknown> }>();
  for (const step of raw.steps ?? []) {
    if (!step?.key || !STEP_KEYS.has(step.key)) continue;
    byKey.set(step.key, {
      status: normalizeStepStatus(step.status),
      errorMessage: step.detail || undefined,
    });
  }

  const steps: StepState[] = STEPS_ORDER.map((key) => ({
    key,
    status: byKey.get(key)?.status ?? 'pending',
    errorMessage: byKey.get(key)?.errorMessage,
    meta: byKey.get(key)?.meta,
  }));

  const total = Number(raw.summary?.totalProperties ?? raw.currentProperty?.total ?? 1);
  const index = Number(raw.currentProperty?.index ?? 1);

  return {
    currentBatchIndex: Math.max(0, index - 1),
    totalBatch: Math.max(1, total),
    currentPropertyName:
      raw.currentProperty?.listingName ||
      (raw.currentProperty?.ruPropertyId ? `Annonce #${raw.currentProperty.ruPropertyId}` : undefined),
    steps,
    completed: raw.status === 'success' || raw.status === 'error',
    hasError: raw.status === 'error' || steps.some((s) => s.status === 'error'),
  };
}
