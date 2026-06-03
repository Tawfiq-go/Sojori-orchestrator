// Créneaux arrivée / départ — TS_CHECKIN[] · TS_CHECKOUT[]
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { Card, FormRow, ConfigIntroBar, NumInput, TYPO } from './SHARED';
import {
  AddTimeslotDialog,
  DashedAddButton,
  TimeslotChip,
} from '../../../../components/listing/form-v2/components/cleaning/CleaningSlotDialogs';
import {
  mapArrivalDepartureToListingPatch,
  mapListingToArrivalDepartureConfig,
  type ArrivalDepartureConfig,
} from './arrivalDepartureConfigTypes';

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  templateMode?: boolean;
}

export default function ArrivalDepartureConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
}: Props) {
  const [config, setConfig] = useState<ArrivalDepartureConfig | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [checkinDialog, setCheckinDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const configRef = useRef<ArrivalDepartureConfig | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
  }, [listingId]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!listingValues || !Object.keys(listingValues).length) return;
    const mapped = mapListingToArrivalDepartureConfig(listingValues);
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId]);

  const patch = useCallback((fn: (c: ArrivalDepartureConfig) => ArrivalDepartureConfig) => {
    dirtyRef.current = true;
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
    const payload = mapArrivalDepartureToListingPatch(cfg);
    setSavingState('saving');
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      setSavingState('saved');
    } catch {
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, onListingPatch, templateMode]);

  useEffect(() => {
    if (!config || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist().finally(() => {
        dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, persist]);

  if (!config || !Object.keys(listingValues).length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement créneaux A/D…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Créneaux proposés au voyageur via WhatsApp (arrivée · départ).
      </ConfigIntroBar>

      <Card compact icon="🕐" title="Fenêtres par défaut" meta="checkInTimeStart · checkOutTime">
        <Stack direction="row" useFlexGap sx={{ gap: 2, flexWrap: 'wrap' }}>
          <FormRow compact label="Arrivée de">
            <NumInput
              value={config.checkInTimeStart}
              min={0}
              max={23}
              onChange={v => patch(c => ({ ...c, checkInTimeStart: v }))}
            />
          </FormRow>
          <FormRow compact label="Arrivée jusqu'à">
            <NumInput
              value={config.checkInTimeEnd}
              min={1}
              max={24}
              onChange={v => patch(c => ({ ...c, checkInTimeEnd: v }))}
            />
          </FormRow>
          <FormRow compact label="Départ (checkout)">
            <NumInput
              value={config.checkOutTime}
              min={0}
              max={23}
              onChange={v => patch(c => ({ ...c, checkOutTime: v }))}
            />
          </FormRow>
        </Stack>
        <Typography sx={{ mt: 1, ...TYPO.monoHelp }}>
          Heures en format 24h · schéma listing TS_CHECKIN / TS_CHECKOUT
        </Typography>
      </Card>

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
            <DashedAddButton label="+ Créneau arrivée" onClick={() => setCheckinDialog(true)} />
          </Stack>
        )}
        <AddTimeslotDialog
          open={checkinDialog}
          onClose={() => setCheckinDialog(false)}
          title="Créneau d'arrivée"
          onAdd={slot => patch(c => ({ ...c, TS_CHECKIN: [...c.TS_CHECKIN, slot] }))}
        />
      </Card>

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
            <DashedAddButton label="+ Créneau départ" onClick={() => setCheckoutDialog(true)} />
          </Stack>
        )}
        <AddTimeslotDialog
          open={checkoutDialog}
          onClose={() => setCheckoutDialog(false)}
          title="Créneau de départ"
          onAdd={slot => patch(c => ({ ...c, TS_CHECKOUT: [...c.TS_CHECKOUT, slot] }))}
        />
      </Card>
    </Box>
  );
}
