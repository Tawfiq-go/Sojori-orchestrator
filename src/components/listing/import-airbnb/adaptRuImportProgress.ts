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

/** Les étapes antérieures à la dernière active ne restent jamais pending. */
function cascadeStepStatuses(steps: StepState[], importSucceeded: boolean): StepState[] {
  let maxActiveIndex = -1;
  for (let i = 0; i < steps.length; i += 1) {
    if (steps[i].status !== 'pending') maxActiveIndex = i;
  }
  return steps.map((step, idx) => {
    if (importSucceeded && step.status === 'pending') {
      return { ...step, status: 'done' as StepStatus };
    }
    if (step.status === 'pending' && idx < maxActiveIndex) {
      return { ...step, status: 'done' as StepStatus };
    }
    return step;
  });
}

/** Parse le headline suite « Import 2/2 — Nom annonce ». */
export function parseImportSuiteHeadline(
  headline: string,
): { index: number; total: number; name: string } | null {
  const m = headline.trim().match(/Import\s+(\d+)\/(\d+)\s+—\s+(.+)/i);
  if (!m) return null;
  return { index: Math.max(0, Number(m[1]) - 1), total: Math.max(1, Number(m[2])), name: m[3].trim() };
}

/** Timeline vide en attendant le 1er poll (une annonce du batch). */
export function createPendingImportProgress(opts: {
  index: number;
  total: number;
  propertyName?: string;
}): ImportProgress {
  return {
    currentBatchIndex: Math.max(0, opts.index),
    totalBatch: Math.max(1, opts.total),
    currentPropertyName: opts.propertyName,
    steps: STEPS_ORDER.map((key) => ({ key, status: 'pending' as StepStatus })),
    completed: false,
    hasError: false,
  };
}

/** Mappe la réponse polling srv-channels → format UI Claude Design. */
export function adaptRuImportProgress(raw: RuImportProgressData | null): ImportProgress | null {
  if (!raw) return null;

  const byKey = new Map<string, { status: StepStatus; errorMessage?: string; meta?: Record<string, unknown> }>();
  for (const step of raw.steps ?? []) {
    if (!step?.key || !STEP_KEYS.has(step.key)) continue;
    const rawStep = step as {
      status?: string;
      detail?: string;
      meta?: Record<string, unknown>;
    };
    byKey.set(step.key, {
      status: normalizeStepStatus(rawStep.status),
      errorMessage: rawStep.detail || undefined,
      meta: rawStep.meta,
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

  const importCompleted = raw.status === 'success' || raw.status === 'error';
  const cascadedSteps = cascadeStepStatuses(steps, raw.status === 'success');

  return {
    currentBatchIndex: Math.max(0, index - 1),
    totalBatch: Math.max(1, total),
    currentPropertyName:
      raw.currentProperty?.listingName ||
      (raw.currentProperty?.ruPropertyId ? `Annonce #${raw.currentProperty.ruPropertyId}` : undefined),
    steps: cascadedSteps,
    completed: importCompleted,
    hasError: raw.status === 'error' || cascadedSteps.some((s) => s.status === 'error'),
  };
}
