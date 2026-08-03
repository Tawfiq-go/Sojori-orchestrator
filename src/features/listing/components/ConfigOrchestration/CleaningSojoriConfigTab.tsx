// Ménage Sojori — cleaningOrchestration (déclenchement · filet DIRTY · checklist)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import {
  Card,
  FormRow,
  ConfigIntroBar,
  Toggle,
  NumInput,
  TYPO,
} from './SHARED';
import {
  canPersistListingConfig,
  mapCleaningSojoriTriggersPatch,
  mapListingToCleaningSojoriConfig,
  type CleaningSojoriConfig,
} from './cleaningSojoriConfigTypes';
import CleaningChecklistPanel from './CleaningChecklistPanel';
import { logOrchConfig, orchConfigError } from '../../utils/orchConfigDebugLog';
import { V3BlockSaveBar } from '../../../orchestrationListingV3/V3BlockSaveBar';

const TRIGGER_OPTIONS = [
  { value: 0, label: 'J (checkout)' },
  { value: 1, label: 'J+1' },
  { value: 2, label: 'J+2' },
  { value: 3, label: 'J+3' },
];

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  templateMode?: boolean;
  /** Hub ménage : checklist dans onglet dédié. */
  showChecklist?: boolean;
  manualSaveMode?: boolean;
}

export default function CleaningSojoriConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
  showChecklist = true,
  manualSaveMode = false,
}: Props) {
  const [config, setConfig] = useState<CleaningSojoriConfig | null>(() =>
    mapListingToCleaningSojoriConfig(listingValues ?? {}),
  );
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const configRef = useRef<CleaningSojoriConfig | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
    setDirty(false);
  }, [listingId]);

  const orchSig = JSON.stringify((listingValues.cleaningOrchestration as object) || {});

  useEffect(() => {
    if (dirtyRef.current) return;
    const mapped = mapListingToCleaningSojoriConfig(listingValues ?? {});
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId, orchSig]);

  const patch = useCallback((fn: (c: CleaningSojoriConfig) => CleaningSojoriConfig) => {
    dirtyRef.current = true;
    setDirty(true);
    setConfig(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      configRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg) return;
    if (!canPersistListingConfig(listingId, templateMode)) {
      logOrchConfig('cleaning.sojori.persist SKIP (no listingId, not template)', {
        listingId,
        templateMode,
      });
      return;
    }
    const payload = mapCleaningSojoriTriggersPatch(cfg, listingValues);
    const orch = payload.cleaningOrchestration as Record<string, unknown> | undefined;
    logOrchConfig('cleaning.sojori.persist →', {
      listingId: listingId || '(template)',
      templateMode,
      preferredDayAfterCheckout: orch?.preferredDayAfterCheckout,
      safetyMaxDirtyDays: orch?.safetyMaxDirtyDays,
      enabled: orch?.enabled,
    });
    setSavingState('saving');
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      logOrchConfig('cleaning.sojori.persist ← OK', {
        listingId: listingId || '(template)',
        preferredDayAfterCheckout: orch?.preferredDayAfterCheckout,
      });
      setSavingState('saved');
      dirtyRef.current = false;
      setDirty(false);
    } catch (e) {
      orchConfigError('cleaning.sojori.persist ← FAIL', e, {
        listingId: listingId || '(template)',
        templateMode,
      });
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, listingValues, onListingPatch, templateMode]);

  useEffect(() => {
    if (manualSaveMode || !config || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist().finally(() => {
        dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, persist, manualSaveMode]);

  if (!config) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement ménage Sojori…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        {showChecklist
          ? 'Orchestration interne Sojori : tâche auto après checkout, filet si le logement reste DIRTY.'
          : 'Ménage Sojori : déclenchement automatique après checkout et filet de sécurité DIRTY.'}
      </ConfigIntroBar>

      <Card compact icon="🧼" title="Ménage Sojori" subtitle="Activer la création automatique des tâches">
        <FormRow compact label="Automatisation">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Toggle
              on={config.enabled}
              onChange={() => patch(c => ({ ...c, enabled: !c.enabled }))}
            />
            <Typography sx={{ fontSize: 12, color: T.text2, fontWeight: 600 }}>
              {config.enabled ? 'Activé' : 'Désactivé'}
            </Typography>
          </Stack>
        </FormRow>
      </Card>

      {config.enabled && (
        <>
          <Card compact icon="⏱" title="Déclenchement" subtitle="Date cible de la tâche si pas de prochaine réservation">
            <FormRow
              compact
              label="Jour après checkout"
              help="0 = jour J (checkout), 1 = J+1…"


            >
              <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                {TRIGGER_OPTIONS.map(opt => (
                  <PillButton
                    key={opt.value}
                    compact
                    active={config.preferredDayAfterCheckout === opt.value}
                    onClick={() => patch(c => ({ ...c, preferredDayAfterCheckout: opt.value }))}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </Stack>
            </FormRow>
          </Card>

          <Card
            compact
            icon="🛡"
            title="Filet de sécurité · max jours en statut DIRTY"
            subtitle="Alerte si non nettoyé après X jours"

          >
            <FormRow
              compact
              label="Max jours en statut DIRTY"
              help="Au-delà → ménage d'urgence créé automatiquement"


            >
              <Box sx={{ maxWidth: 160 }}>
                <NumInput
                  value={config.safetyMaxDirtyDays}
                  suffix="JOURS"
                  min={1}
                  max={4}
                  onChange={e =>
                    patch(c => ({
                      ...c,
                      safetyMaxDirtyDays: Math.min(4, Math.max(1, Number(e.target.value) || 4)),
                    }))
                  }
                />
              </Box>
            </FormRow>
          </Card>

          {showChecklist && (
            <CleaningChecklistPanel
              listingId={listingId}
              listingValues={listingValues}
              onListingPatch={onListingPatch}
              templateMode={templateMode}
            />
          )}
        </>
      )}
      {manualSaveMode ? (
        <V3BlockSaveBar
          label="Ménage Sojori · gestion owner_orchestrations"
          dirty={dirty}
          saving={savingState === 'saving'}
          onSave={() => void persist()}
        />
      ) : null}
    </Box>
  );
}
