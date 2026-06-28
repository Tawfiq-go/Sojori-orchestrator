import type { StepKey, StepState, StepStatus } from './_tokens';

/** 6 phases lisibles pour la suite onboarding (défilement vertical). */
export type ImportDisplayPhase = {
  id: string;
  label: string;
  keys: StepKey[];
  status: StepStatus;
  runningStep?: StepState;
};

export const IMPORT_DISPLAY_PHASE_DEFS: Array<{ id: string; label: string; keys: StepKey[] }> = [
  {
    id: 'read',
    label: 'Lecture fiche Airbnb',
    keys: ['pull_spec', 'pull_prices', 'pull_calendar', 'pull_external'],
  },
  {
    id: 'photos',
    label: 'Import des photos',
    keys: ['reupload_images'],
  },
  {
    id: 'listing',
    label: 'Création du listing',
    keys: ['build_payload', 'create_listing'],
  },
  {
    id: 'calendar',
    label: 'Calendrier & disponibilités',
    keys: ['wait_inventory', 'apply_inventory'],
  },
  {
    id: 'sync',
    label: 'Sync réservations RU',
    keys: ['post_import_sync'],
  },
  {
    id: 'orch',
    label: 'Orchestration des réservations',
    keys: ['apply_orchestration', 'check'],
  },
];

function statusForKeys(steps: StepState[], keys: StepKey[]): {
  status: StepStatus;
  runningStep?: StepState;
} {
  const substeps = keys
    .map((key) => steps.find((s) => s.key === key))
    .filter((s): s is StepState => Boolean(s));

  if (substeps.length === 0) return { status: 'pending' };
  if (substeps.some((s) => s.status === 'error')) {
    return { status: 'error', runningStep: substeps.find((s) => s.status === 'error') };
  }
  if (substeps.some((s) => s.status === 'running')) {
    return { status: 'running', runningStep: substeps.find((s) => s.status === 'running') };
  }
  if (substeps.every((s) => s.status === 'done')) {
    return { status: 'done' };
  }
  const doneCount = substeps.filter((s) => s.status === 'done').length;
  if (doneCount > 0) {
    const next = substeps.find((s) => s.status === 'pending');
    return { status: 'running', runningStep: next };
  }
  return { status: 'pending' };
}

export function resolveImportDisplayPhases(steps: StepState[]): ImportDisplayPhase[] {
  return IMPORT_DISPLAY_PHASE_DEFS.map((def) => {
    const { status, runningStep } = statusForKeys(steps, def.keys);
    return { ...def, status, runningStep };
  });
}

export function activeImportDisplayPhaseIndex(phases: ImportDisplayPhase[]): number {
  const running = phases.findIndex((p) => p.status === 'running');
  if (running >= 0) return running;
  const pending = phases.findIndex((p) => p.status === 'pending');
  if (pending >= 0) return pending;
  return Math.max(0, phases.length - 1);
}

export function detailForImportDisplayPhase(phase: ImportDisplayPhase | undefined): string | undefined {
  if (!phase?.runningStep) return undefined;
  const step = phase.runningStep;
  if (step.key === 'reupload_images') {
    const total = Number(step.meta?.photosTotal ?? 0);
    const done = Number(step.meta?.photosDone ?? 0);
    if (total > 0) return `${done} / ${total} photos`;
    if (step.errorMessage) return step.errorMessage;
    return 'Téléchargement en cours…';
  }
  if (step.errorMessage) return step.errorMessage;
  return undefined;
}
