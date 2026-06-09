// Instructions départ + taxe de séjour — texte global + paragraphe taxe + aperçu message
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { Card, FormRow, TextArea, ConfigIntroBar } from './SHARED';
import CityTaxConfigPanel, { type CityTaxSaveState } from './CityTaxConfigPanel';
import {
  mapCityTaxToListingPatch,
  mapListingToCityTaxConfig,
  type CityTaxConfig,
} from './cityTaxConfigTypes';
import DepartureMessageLivePreview from './DepartureMessageLivePreview';
import { EXAMPLE_GLOBAL_INSTRUCTIONS } from './departureMessageExamples';

interface Props {
  listingId: string;
  ownerId?: string;
  /** Annonce de référence (page template orchestration PM). */
  referenceListingId?: string | null;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  templateMode?: boolean;
}

function mergeSaveState(
  a: 'idle' | 'saving' | 'saved',
  b: CityTaxSaveState,
): 'idle' | 'saving' | 'saved' {
  if (a === 'saving' || b === 'saving') return 'saving';
  if (a === 'saved' || b === 'saved') return 'saved';
  return 'idle';
}

export default function MessagesConfigTab({
  listingId,
  ownerId,
  referenceListingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
}: Props) {
  const [messageFr, setMessageFr] = useState('');
  const [liveTaxConfig, setLiveTaxConfig] = useState<CityTaxConfig | null>(null);
  const [msgSave, setMsgSave] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [taxSave, setTaxSave] = useState<CityTaxSaveState>('idle');
  const saveState = useMemo(() => mergeSaveState(msgSave, taxSave), [msgSave, taxSave]);

  const messageRef = useRef('');
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedTaxConfig = useMemo(
    () => mapListingToCityTaxConfig(listingValues),
    [listingValues],
  );

  const previewListingId = templateMode ? referenceListingId || undefined : listingId || undefined;
  const previewOwnerId = !previewListingId ? ownerId : undefined;
  const canPreview = Boolean(previewListingId || previewOwnerId);

  const previewDraft = useMemo(() => {
    const taxCfg = liveTaxConfig ?? savedTaxConfig;
    return {
      messageCheckout: [messageFr, messageFr],
      ...mapCityTaxToListingPatch(taxCfg),
      checkOutTime: listingValues.checkOutTime,
      name: listingValues.name ?? listingValues.listingName,
    };
  }, [
    messageFr,
    liveTaxConfig,
    savedTaxConfig,
    listingValues.checkOutTime,
    listingValues.name,
    listingValues.listingName,
  ]);

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
    setLiveTaxConfig(null);
  }, [listingId]);

  useEffect(() => {
    if (hydratedRef.current) return;
    const mc = (listingValues.messageCheckout as string[]) || ['', ''];
    const fr = mc[0] || mc[1] || '';
    setMessageFr(fr);
    messageRef.current = fr;
    hydratedRef.current = true;
  }, [listingValues.messageCheckout, listingId]);

  const persist = useCallback(async () => {
    if (!templateMode && !listingId) return;
    const fr = messageRef.current;
    const payload = { messageCheckout: [fr, fr] };
    setMsgSave('saving');
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      setMsgSave('saved');
    } catch {
      setMsgSave('idle');
      dirtyRef.current = true;
    }
  }, [listingId, onListingPatch, templateMode]);

  useEffect(() => {
    if (!hydratedRef.current || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist().finally(() => {
        dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messageFr, persist]);

  if (!listingValues || !Object.keys(listingValues).length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: T.text3 }}>
        <CircularProgress size={24} sx={{ color: T.primary, mb: 2 }} />
        <Typography>Chargement des instructions départ…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={saveState}>
        Consignes globales + paragraphe taxe (si activée) — envoyées ensemble la veille du départ.
      </ConfigIntroBar>

      <Card
        icon="🚪"
        title="Instructions départ — texte global"
        subtitle="Consignes avant de partir (frigo, clés, fenêtres…) · sans la taxe"
      >
        <FormRow label="Consignes départ">
          <TextArea
            rows={6}
            value={messageFr}
            onChange={e => {
              dirtyRef.current = true;
              setMessageFr(e.target.value);
              messageRef.current = e.target.value;
            }}
            placeholder={EXAMPLE_GLOBAL_INSTRUCTIONS}
          />
        </FormRow>
      </Card>

      <CityTaxConfigPanel
        listingId={listingId}
        templateMode={templateMode}
        listingValues={listingValues}
        onListingPatch={onListingPatch}
        onSaveStateChange={setTaxSave}
        onConfigChange={setLiveTaxConfig}
      />

      {canPreview ? (
        <DepartureMessageLivePreview
          listingId={previewListingId}
          ownerId={previewOwnerId}
          draft={previewDraft}
        />
      ) : (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: T.bg2, border: `1px dashed ${T.border}` }}>
          <Typography sx={{ fontSize: 12, color: T.text3, fontStyle: 'italic' }}>
            Sélectionnez un propriétaire (ou une annonce de référence) pour voir l’aperçu basé sur la
            dernière réservation.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
