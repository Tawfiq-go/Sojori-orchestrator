import { useCallback, useEffect, useRef, useState } from 'react';
import type { OwnerOnboarding } from '../../../services/crmService';
import { getWizardDraft, saveWizardDraft } from '../../../services/crmService';
import type { MockUser } from '../../../data/mockAuth';
import {
  createDefaultWizardDraft,
  defaultCapabilities,
  mergeWizardDraftFromServer,
  ownerFullMenuAccess,
} from '../defaults';
import type { WizardDraft } from '../types';
import { deriveConditionsFromJx, normalizeJxSettings } from '../wizardGuestAccess';
import {
  nextWizardPanel,
  prevWizardPanel,
  wizardVisibleProgressPercent,
} from '../wizardNavigation';
import { formatOnboardingWizardError } from '../onboardingOwnerUrl';
import { applyWizardDeadlinesToOwnerModel } from '../apply/applyWizardDeadlinesToOwnerModel';

export interface UsePmOnboardingWizardResult {
  loading: boolean;
  saving: boolean;
  error: string | null;
  draft: WizardDraft;
  onboarding: OwnerOnboarding | null;
  events: Array<{ title?: string; createdAt?: string; eventType?: string }>;
  lastSavedAt: string | null;
  progressPercent: number;
  setCurrentPanel: (panel: number) => void;
  updatePanel: <K extends keyof WizardDraft['panels']>(
    panel: K,
    patch: Partial<NonNullable<WizardDraft['panels'][K]>>,
  ) => void;
  setPath: (path: WizardDraft['path']) => void;
  /** Sauvegarde le brouillon sans changer d'étape */
  saveDraft: () => Promise<boolean>;
  /** Étape 6 : pousse délais → fulltask + owner_orchestrations (srv-listing) */
  applyDeadlinesToOwnerModel: () => Promise<{ ok: boolean; message?: string }>;
  /** Sauvegarde + valide l'étape courante + passe à la suivante */
  validateCurrentPanel: () => Promise<boolean>;
  saveAndExit: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Efface le suivi Suite + import fait, sauvegarde, prêt pour relancer apply. */
  relaunchSuiteApply: () => Promise<void>;
}

export function usePmOnboardingWizard(
  user: MockUser | null | undefined,
  targetOwnerId: string | null | undefined,
  opts?: { isOwnerSelfService?: boolean },
): UsePmOnboardingWizardResult {
  const ownerId = targetOwnerId ?? null;
  const isOwnerSelfService = opts?.isOwnerSelfService ?? false;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WizardDraft>(() => createDefaultWizardDraft());
  const [onboarding, setOnboarding] = useState<OwnerOnboarding | null>(null);
  const [events, setEvents] = useState<UsePmOnboardingWizardResult['events']>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const persist = useCallback(
    async (opts?: { emitEvent?: boolean; panelValidated?: number }): Promise<boolean> => {
      if (!ownerId) return false;
      setSaving(true);
      setError(null);
      try {
        const res = await saveWizardDraft(ownerId, {
          wizardDraft: draftRef.current,
          ownerName: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
          ownerEmail: user?.email,
          emitEvent: opts?.emitEvent,
          panelValidated: opts?.panelValidated,
          triggeredBy: user?.email || 'pm-wizard',
        });
        setOnboarding(res.data.onboarding);
        const savedAt = res.data.wizardDraft.lastSavedAt ?? new Date().toISOString();
        setLastSavedAt(savedAt);
        setDraft((prev) => ({
          ...prev,
          panelsValidated: res.data.wizardDraft.panelsValidated ?? prev.panelsValidated,
          lastSavedAt: savedAt,
        }));
        return true;
      } catch (e: unknown) {
        const msg = formatOnboardingWizardError(e, 'save', { isOwnerSelfService });
        setError(msg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [ownerId, user, isOwnerSelfService],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ownerId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await getWizardDraft(ownerId);
        if (cancelled) return;
        const remote = res.data.wizardDraft;
        const base = createDefaultWizardDraft(remote?.path ?? 'A');
        const merged = mergeWizardDraftFromServer(base, remote as Partial<WizardDraft> | null);
        const panel =
          merged.currentPanel === 2 ? 3 : merged.currentPanel === 5 ? 6 : merged.currentPanel;
        setDraft({ ...merged, currentPanel: panel });
        setOnboarding(res.data.onboarding);
        setLastSavedAt(remote?.lastSavedAt ?? null);
      } catch (e: unknown) {
        if (!cancelled) setError(formatOnboardingWizardError(e, 'load', { isOwnerSelfService }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId, isOwnerSelfService]);

  const setCurrentPanel = useCallback((panel: number) => {
    setDraft((prev) => ({ ...prev, currentPanel: panel }));
  }, []);

  const updatePanel = useCallback(
    <K extends keyof WizardDraft['panels']>(
      panel: K,
      patch: Partial<NonNullable<WizardDraft['panels'][K]>>,
    ) => {
      setDraft((prev) => ({
        ...prev,
        panels: {
          ...prev.panels,
          [panel]: { ...(prev.panels[panel] as object), ...patch } as WizardDraft['panels'][K],
        },
      }));
    },
    [],
  );

  const setPath = useCallback((path: WizardDraft['path']) => {
    setDraft((prev) => ({ ...prev, path }));
  }, []);

  const saveDraft = useCallback(async () => {
    return persist({ emitEvent: true });
  }, [persist]);

  const applyDeadlinesToOwnerModel = useCallback(async () => {
    if (!ownerId) return { ok: false, message: 'Owner introuvable' };
    if (draftRef.current.currentPanel !== 6) {
      return { ok: false, message: 'Disponible sur l’étape Délais & relances' };
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await persist({ emitEvent: true });
      if (!saved) return { ok: false, message: 'Brouillon non enregistré' };
      const result = await applyWizardDeadlinesToOwnerModel(ownerId, draftRef.current);
      if (result.warnings.length) {
        console.info('[onboarding-deadlines-apply]', result.warnings);
      }
      const parts = [
        result.deadlinesPatched > 0 ? `${result.deadlinesPatched} workflow(s) fulltask` : null,
        result.executionReplaced > 0 ? `${result.executionReplaced} execution(s) owner` : null,
        result.executionSynced > 0 ? `${result.executionSynced} sync fulltask→owner` : null,
      ].filter(Boolean);
      return {
        ok: result.deadlinesPatched > 0 || result.executionReplaced > 0 || result.executionSynced > 0,
        message: parts.length
          ? `Modèle orchestration owner mis à jour · ${parts.join(' · ')}`
          : result.warnings[0] ?? 'Aucune mise à jour — lancez d’abord l’étape Parcours client + Suite Plan',
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Apply délais impossible';
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setSaving(false);
    }
  }, [ownerId, persist]);

  const validateCurrentPanel = useCallback(async () => {
    const panel = draftRef.current.currentPanel;
    const next = nextWizardPanel(panel);
    let panelsValidated = draftRef.current.panelsValidated.includes(panel)
      ? [...draftRef.current.panelsValidated]
      : [...draftRef.current.panelsValidated, panel];

    let panels = draftRef.current.panels;

    if (panel === 1 && !panelsValidated.includes(2)) {
      panelsValidated = [...panelsValidated, 2].sort((a, b) => a - b);
      panels = {
        ...panels,
        '2': {
          guests: [],
          menuAccess: ownerFullMenuAccess(),
        },
      };
    }

    if (panel === 3 && !panelsValidated.includes(5)) {
      const caps = panels['3']?.capabilities ?? defaultCapabilities();
      const jx = normalizeJxSettings(panels['3']?.jx ?? panels['4']?.jx);
      panelsValidated = [...panelsValidated, 5].sort((a, b) => a - b);
      panels = {
        ...panels,
        '5': { conditions: deriveConditionsFromJx(jx, caps) },
      };
    }

    panelsValidated = [...new Set(panelsValidated)].sort((a, b) => a - b);

    const nextDraft: WizardDraft = {
      ...draftRef.current,
      panels,
      currentPanel: next,
      panelsValidated,
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    const persisted = await persist({ emitEvent: true, panelValidated: panel });
    if (persisted && panel === 6 && ownerId) {
      try {
        await applyWizardDeadlinesToOwnerModel(ownerId, nextDraft);
      } catch (e) {
        console.warn('[onboarding] apply deadlines on continue', e);
      }
    }
    return persisted;
  }, [persist, ownerId]);

  const saveAndExit = useCallback(async () => {
    await persist({ emitEvent: true });
  }, [persist]);

  const completeOnboarding = useCallback(async () => {
    await persist({ emitEvent: true, panelValidated: 8 });
  }, [persist]);

  const relaunchSuiteApply = useCallback(async () => {
    const p7 = draftRef.current.panels['7'];
    const next: WizardDraft = {
      ...draftRef.current,
      currentPanel: 8,
      suiteCompleted: [],
      applyLog: {},
      panels: {
        ...draftRef.current.panels,
        ...(p7 ? { '7': { ...p7, importedRuIds: [] } } : {}),
      },
    };
    draftRef.current = next;
    setDraft(next);
    await persist({ emitEvent: true, panelValidated: 8 });
  }, [persist]);

  return {
    loading,
    saving,
    error,
    draft,
    onboarding,
    events,
    lastSavedAt,
    progressPercent: wizardVisibleProgressPercent(draft),
    setCurrentPanel,
    updatePanel,
    setPath,
    saveDraft,
    applyDeadlinesToOwnerModel,
    validateCurrentPanel,
    saveAndExit,
    completeOnboarding,
    relaunchSuiteApply,
  };
}
