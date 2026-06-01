// Créneaux arrivée / départ — TS_CHECKIN[] · TS_CHECKOUT[] (template admin + listing)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import { Card, FormRow, ConfigIntroBar, Toggle, TYPO } from './SHARED';
import {
  AddTimeslotDialog,
  DashedAddButton,
  TimeslotChip,
} from '../../../../components/listing/form-v2/components/cleaning/CleaningSlotDialogs';
import {
  mapCleaningConfigToListingPatch,
  mapListingToCleaningConfig,
  type CleaningListingConfig,
  type TimeSlot,
} from './cleaningConfigTypes';

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
  const [config, setConfig] = useState<CleaningListingConfig | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [checkinDialog, setCheckinDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const configRef = useRef<CleaningListingConfig | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
  }, [listingId, templateMode]);

  useEffect(() => {
    if (hydratedRef.current) return;
    const mapped = mapListingToCleaningConfig(listingValues || {});
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId]);

  const patch = useCallback((fn: (c: CleaningListingConfig) => CleaningListingConfig) => {
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
    const paidExisting = (listingValues.paidCleaningConfig as { enabled?: boolean }) || {};
    const payload = mapCleaningConfigToListingPatch(cfg, {
      preservePaidEnabled: paidExisting.enabled !== false,
    });
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
  }, [listingId, onListingPatch, listingValues, templateMode]);

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

  if (!config) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement créneaux…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Créneaux WhatsApp (flow D arrivée · départ). Template admin → sync PM → annonces →
        fullchatbot.
      </ConfigIntroBar>

      <Stack sx={{ gap: 1.5 }}>
        <Card compact icon="🛬" title="Créneaux d'arrivée" meta="TS_CHECKIN[]">
          <FormRow compact label="Activer les créneaux d'arrivée">
            <Toggle
              on={config.checkinTimeslotsEnabled}
              sm
              onChange={() =>
                patch(c => ({ ...c, checkinTimeslotsEnabled: !c.checkinTimeslotsEnabled }))
              }
            />
          </FormRow>
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
            <DashedAddButton label="+ Ajouter créneau" onClick={() => setCheckinDialog(true)} />
          </Stack>
        </Card>

        <Card compact icon="🛫" title="Créneaux de départ" meta="TS_CHECKOUT[]">
          <FormRow compact label="Activer les créneaux de départ">
            <Toggle
              on={config.checkoutTimeslotsEnabled}
              sm
              onChange={() =>
                patch(c => ({ ...c, checkoutTimeslotsEnabled: !c.checkoutTimeslotsEnabled }))
              }
            />
          </FormRow>
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
            <DashedAddButton label="+ Ajouter créneau" onClick={() => setCheckoutDialog(true)} />
          </Stack>
        </Card>

        <Typography sx={{ ...TYPO.monoHelp, px: 0.5, fontFamily: CONFIG_ORCH_FONT.mono }}>
          Fenêtre check-in {config.checkInTimeStart}h–{config.checkInTimeEnd}h · départ défaut{' '}
          {config.checkOutTime}h. Admin : bouton sync PM puis sync annonces. Puis resync
          fullchatbot.
        </Typography>
      </Stack>

      <AddTimeslotDialog
        open={checkinDialog}
        onClose={() => setCheckinDialog(false)}
        title="Créneau d'arrivée"
        onAdd={(slot: TimeSlot) => patch(c => ({ ...c, TS_CHECKIN: [...c.TS_CHECKIN, slot] }))}
      />
      <AddTimeslotDialog
        open={checkoutDialog}
        onClose={() => setCheckoutDialog(false)}
        title="Créneau de départ"
        onAdd={(slot: TimeSlot) => patch(c => ({ ...c, TS_CHECKOUT: [...c.TS_CHECKOUT, slot] }))}
      />
    </Box>
  );
}
