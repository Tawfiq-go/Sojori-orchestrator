// @deprecated — taxe intégrée dans MessagesConfigTab (onglet Instructions départ). Fichier conservé si import legacy.
import React, { useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import { ConfigIntroBar, TYPO } from './SHARED';
import CityTaxConfigPanel, { type CityTaxSaveState } from './CityTaxConfigPanel';

interface Props {
  listingId: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
}

export default function CityTaxConfigTab({ listingId, listingValues = {}, onListingPatch }: Props) {
  const [saveState, setSaveState] = useState<CityTaxSaveState>('idle');

  if (!listingValues || !Object.keys(listingValues).length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement taxe de séjour…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={saveState}>
        Montant, devise et règles de calcul de la taxe de séjour pour ce logement.
      </ConfigIntroBar>
      <CityTaxConfigPanel
        listingId={listingId}
        listingValues={listingValues}
        onListingPatch={onListingPatch}
        onSaveStateChange={setSaveState}
      />
    </Box>
  );
}
