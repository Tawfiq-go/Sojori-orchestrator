import type { StepState } from './_tokens';

/** Index de l'étape active (running, sinon première pending, sinon dernière). */
export function activeImportStepIndex(steps: StepState[]): number {
  const running = steps.findIndex((s) => s.status === 'running');
  if (running >= 0) return running;
  const pending = steps.findIndex((s) => s.status === 'pending');
  if (pending >= 0) return pending;
  return Math.max(0, steps.length - 1);
}

export function liveDetailForImportStep(step: StepState | undefined): string | undefined {
  if (!step) return undefined;
  if (step.key === 'reupload_images') {
    const total = Number(step.meta?.photosTotal ?? 0);
    const done = Number(step.meta?.photosDone ?? 0);
    if (total > 0) return `${done} / ${total} photos`;
    return 'Téléchargement des photos…';
  }
  if (step.key === 'apply_orchestration') {
    return 'Template owner + ville Sojori…';
  }
  if (step.key === 'post_import_sync') {
    return 'Réservations et avis RU…';
  }
  if (step.status === 'running') return 'En cours…';
  if (step.errorMessage) return step.errorMessage;
  return undefined;
}
