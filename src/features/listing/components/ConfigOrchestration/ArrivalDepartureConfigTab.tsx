// Créneaux arrivée / départ — par capacité (choisir vs déclarer)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Box, Stack, Typography, CircularProgress } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { Card, ConfigIntroBar, TYPO } from './SHARED';
import {
  AddTimeslotDialog,
  DashedAddButton,
  TimeslotChip,
} from '../../../../components/listing/form-v2/components/cleaning/CleaningSlotDialogs';
import {
  mapArrivalDepartureToListingPatch,
  mapListingToArrivalDepartureConfig,
  type ArrivalDepartureConfig,
  type ArrivalDepartureScope,
} from './arrivalDepartureConfigTypes';
import type { TimeSlot } from './cleaningConfigTypes';
import { logV3Orch } from '../../../orchestrationListingV3/v3OrchestrationDebugLog';
import { V3BlockSaveBar } from '../../../orchestrationListingV3/V3BlockSaveBar';

interface Props {
  capabilityKey: ArrivalDepartureScope;
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  templateMode?: boolean;
  /** V3 orchestration : save manuel via barre sticky (pas d’auto-save). */
  manualSaveMode?: boolean;
}

const INTRO: Record<ArrivalDepartureScope, string> = {
  arrival_choose:
    'Choisir arrivée · créneaux proposés au voyageur (WhatsApp D1 · TS_CHECKIN). Heures par défaut → fiche listing.',
  departure_choose:
    'Choisir départ · créneaux proposés au voyageur (WhatsApp D2 · TS_CHECKOUT). Heure checkout → fiche listing.',
  arrival_declare:
    'Déclarer arrivée · le voyageur saisit son heure d\'arrivée sur les 24h dans WhatsApp (flow D3). Pas de créneaux à configurer.',
  departure_declare:
    'Déclarer départ · le voyageur saisit son heure de départ sur les 24h dans WhatsApp (flow D4). Pas de créneaux à configurer.',
};

function DeclareJourneyInfo({ scope }: { scope: 'arrival_declare' | 'departure_declare' }) {
  const isArrival = scope === 'arrival_declare';
  return (
    <Alert severity="info" sx={{ fontSize: 12.5 }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
        {isArrival ? '📍 Déclarer arrivée' : '📍 Déclarer départ'}
      </Typography>
      {isArrival
        ? 'Flow WhatsApp D3 : le voyageur choisit une heure libre (0h–24h) le jour J. Aucun créneau TS_CHECKIN à définir ici — activez « Gérer » puis configurez l\'orchestration (relances, staff).'
        : 'Flow WhatsApp D4 : le voyageur choisit une heure libre (0h–24h) le jour du départ. Aucun créneau TS_CHECKOUT à définir ici — activez « Gérer » puis configurez l\'orchestration.'}
    </Alert>
  );
}

export default function ArrivalDepartureConfigTab({
  capabilityKey,
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
  manualSaveMode = false,
}: Props) {
  if (capabilityKey === 'arrival_declare' || capabilityKey === 'departure_declare') {
    return <DeclareJourneyInfo scope={capabilityKey} />;
  }

  return (
    <ArrivalDepartureSlotsEditor
      capabilityKey={capabilityKey}
      listingId={listingId}
      listingValues={listingValues}
      onListingPatch={onListingPatch}
      templateMode={templateMode}
      manualSaveMode={manualSaveMode}
    />
  );
}

function ArrivalDepartureSlotsEditor({
  capabilityKey,
  listingId,
  listingValues,
  onListingPatch,
  templateMode,
  manualSaveMode,
}: Omit<Props, 'capabilityKey'> & { capabilityKey: 'arrival_choose' | 'departure_choose' }) {
  const isArrival = capabilityKey === 'arrival_choose';
  const [config, setConfig] = useState<ArrivalDepartureConfig | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const [slotDialog, setSlotDialog] = useState(false);
  const configRef = useRef<ArrivalDepartureConfig | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
    setDirty(false);
  }, [listingId, templateMode, capabilityKey]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!templateMode && (!listingValues || !Object.keys(listingValues).length)) return;
    const mapped = mapListingToArrivalDepartureConfig(listingValues || {});
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId, templateMode, capabilityKey]);

  const patch = useCallback((fn: (c: ArrivalDepartureConfig) => ArrivalDepartureConfig) => {
    dirtyRef.current = true;
    setDirty(true);
    setConfig(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      configRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async (): Promise<boolean> => {
    const cfg = configRef.current;
    if (!cfg) return false;
    const payload = mapArrivalDepartureToListingPatch(cfg, capabilityKey);
    if (!Object.keys(payload).length) return false;
    setSavingState('saving');
    logV3Orch('gestion.slots.persist.start', {
      capabilityKey,
      templateMode,
      listingId: listingId || null,
      payload,
    });
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      setSavingState('saved');
      logV3Orch('gestion.slots.persist.ok', { capabilityKey, payload });
      dirtyRef.current = false;
      setDirty(false);
      return true;
    } catch (err) {
      setSavingState('idle');
      dirtyRef.current = true;
      logV3Orch('gestion.slots.persist.error', {
        capabilityKey,
        message: err instanceof Error ? err.message : String(err),
        payload,
      });
      return false;
    }
  }, [listingId, onListingPatch, templateMode, capabilityKey]);

  useEffect(() => {
    if (manualSaveMode || !config || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist().then(ok => {
        if (ok) dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, persist, manualSaveMode]);

  if (!config || (!templateMode && !Object.keys(listingValues).length)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>{INTRO[capabilityKey]}</ConfigIntroBar>

      {isArrival ? (
        <Card
          compact
          icon="🛬"
          title="Créneaux d'arrivée"
          meta="TS_CHECKIN[]"
          toggle={config.checkinTimeslotsEnabled}
          onToggleChange={v => patch(c => ({ ...c, checkinTimeslotsEnabled: v }))}
        >
          {config.checkinTimeslotsEnabled && (
            <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
              {config.TS_CHECKIN.map((ts, i) => (
                <TimeslotChip
                  key={`in-${ts.start}-${ts.end}-${i}`}
                  slot={ts}
                  onRemove={() =>
                    patch(c => ({
                      ...c,
                      TS_CHECKIN: c.TS_CHECKIN.filter((_, j) => j !== i),
                    }))
                  }
                />
              ))}
              <DashedAddButton
                label="+ Créneau arrivée"
                onClick={() => {
                  logV3Orch('gestion.slots.dialog.open', { capabilityKey, kind: 'checkin' });
                  setSlotDialog(true);
                }}
              />
            </Stack>
          )}
        </Card>
      ) : (
        <Card
          compact
          icon="🛫"
          title="Créneaux de départ"
          meta="TS_CHECKOUT[]"
          toggle={config.checkoutTimeslotsEnabled}
          onToggleChange={v => patch(c => ({ ...c, checkoutTimeslotsEnabled: v }))}
        >
          {config.checkoutTimeslotsEnabled && (
            <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
              {config.TS_CHECKOUT.map((ts, i) => (
                <TimeslotChip
                  key={`out-${ts.start}-${ts.end}-${i}`}
                  slot={ts}
                  onRemove={() =>
                    patch(c => ({
                      ...c,
                      TS_CHECKOUT: c.TS_CHECKOUT.filter((_, j) => j !== i),
                    }))
                  }
                />
              ))}
              <DashedAddButton
                label="+ Créneau départ"
                onClick={() => {
                  logV3Orch('gestion.slots.dialog.open', { capabilityKey, kind: 'checkout' });
                  setSlotDialog(true);
                }}
              />
            </Stack>
          )}
        </Card>
      )}

      <AddTimeslotDialog
        open={slotDialog}
        onClose={() => {
          logV3Orch('gestion.slots.dialog.close', { capabilityKey });
          setSlotDialog(false);
        }}
        title={isArrival ? "Créneau d'arrivée" : 'Créneau de départ'}
        existingSlots={isArrival ? config.TS_CHECKIN : config.TS_CHECKOUT}
        onAdd={(slot: TimeSlot) => {
          logV3Orch('gestion.slots.add', { capabilityKey, slot });
          patch(c =>
            isArrival
              ? { ...c, TS_CHECKIN: [...c.TS_CHECKIN, slot] }
              : { ...c, TS_CHECKOUT: [...c.TS_CHECKOUT, slot] },
          );
        }}
      />
      {manualSaveMode ? (
        <V3BlockSaveBar
          label={
            isArrival
              ? 'Créneaux arrivée · gestion owner_orchestrations'
              : 'Créneaux départ · gestion owner_orchestrations'
          }
          dirty={dirty}
          saving={savingState === 'saving'}
          onSave={() => void persist()}
        />
      ) : null}
    </Box>
  );
}
