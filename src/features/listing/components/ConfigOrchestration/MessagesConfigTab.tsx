// Instructions départ + taxe de séjour (montant, devise, calcul) — un seul onglet Config Orch. NEW
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { Card, FormRow, TextArea, ConfigIntroBar, TYPO } from './SHARED';
import CityTaxConfigPanel, { type CityTaxSaveState } from './CityTaxConfigPanel';

interface Props {
  listingId: string;
  ownerId?: string;
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
  listingValues = {},
  onListingPatch,
  templateMode = false,
}: Props) {
  const [messageFr, setMessageFr] = useState('');
  const [msgSave, setMsgSave] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [taxSave, setTaxSave] = useState<CityTaxSaveState>('idle');
  const saveState = useMemo(() => mergeSaveState(msgSave, taxSave), [msgSave, taxSave]);

  const messageRef = useRef('');
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
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
        Consignes avant départ et taxe de séjour — envoyées ensemble au voyageur.
      </ConfigIntroBar>

      <Card
        icon="🚪"
        title="Instructions départ"
        subtitle="Reçues avec le rappel taxe de séjour · FR uniquement · EN = copie FR"

      >
        <FormRow label="Instructions départ">
          <TextArea
            rows={8}
            value={messageFr}
            onChange={e => {
              dirtyRef.current = true;
              setMessageFr(e.target.value);
              messageRef.current = e.target.value;
            }}
            placeholder="Avant votre départ, merci de : vider le réfrigérateur, fermer les fenêtres, déposer les clés…"
          />
        </FormRow>
      </Card>

      <CityTaxConfigPanel
        listingId={listingId}
        templateMode={templateMode}
        listingValues={listingValues}
        onListingPatch={onListingPatch}
        onSaveStateChange={setTaxSave}
      />
    </Box>
  );
}
