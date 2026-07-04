import type { WizardDraft } from './types';
import { WIZARD_STEP_LABELS } from './types';

/** Panels affichés (2 = owner auto, 4/5 = J-X/conditions fusionnés dans panel 3, 7 = import retiré du wizard). */
export const WIZARD_VISIBLE_PANELS = [0, 1, 3, 6, 8] as const;

export const WIZARD_STEP_COUNT = WIZARD_VISIBLE_PANELS.length;

export function stepIndexToPanel(stepIndex: number): number {
  return WIZARD_VISIBLE_PANELS[stepIndex] ?? 0;
}

export function panelToStepIndex(panel: number): number {
  const idx = (WIZARD_VISIBLE_PANELS as readonly number[]).indexOf(panel);
  if (idx >= 0) return idx;
  if (panel === 2) return 1;
  if (panel === 4 || panel === 5) return 2;
  if (panel === 7) return 4;
  return 0;
}

export function nextWizardPanel(current: number): number {
  if (current === 1) return 3;
  if (current === 3) return 6;
  if (current === 6) return 8;
  return Math.min(current + 1, 8);
}

export function prevWizardPanel(current: number): number {
  if (current === 3) return 1;
  if (current === 6) return 3;
  if (current === 8) return 6;
  return Math.max(current - 1, 0);
}

export function wizardVisibleProgressPercent(draft: WizardDraft): number {
  const done = WIZARD_VISIBLE_PANELS.filter((p) => draft.panelsValidated.includes(p)).length;
  return Math.min(100, Math.round((done / WIZARD_STEP_COUNT) * 100));
}

export function isPanelValidatedForStep(draft: WizardDraft, stepIndex: number): boolean {
  const panel = stepIndexToPanel(stepIndex);
  return draft.panelsValidated.includes(panel);
}

export function isPanelCurrentForStep(draft: WizardDraft, stepIndex: number): boolean {
  return draft.currentPanel === stepIndexToPanel(stepIndex);
}

/** Liens « modifier une étape » (récap Go live, panneau suivi). */
export const WIZARD_EDIT_STEPS = WIZARD_VISIBLE_PANELS.map((panel, stepIndex) => ({
  label: WIZARD_STEP_LABELS[stepIndex],
  panel,
})) as ReadonlyArray<{ label: (typeof WIZARD_STEP_LABELS)[number]; panel: number }>;

/** URL canonique du wizard PM (Équipe & Rôles). */
export const PM_ONBOARDING_WIZARD_PATH = '/admin/equipe?tab=onboarding';
