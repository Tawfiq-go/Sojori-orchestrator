// Hub ménage : tarifs v2 + paliers inclus + déclenchement checkout + checklist
import React, { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import CleaningConfigTab from './CleaningConfigTab';
import CleaningSojoriConfigTab from './CleaningSojoriConfigTab';
import CleaningChecklistPanel from './CleaningChecklistPanel';
import MenageOpsPanel from './MenageOpsPanel';

const HUB_TABS = [
  { id: 'levels', label: 'Tous les tarifs', icon: '💶' },
  { id: 'included', label: 'Inclus (paliers)', icon: '🎁' },
  { id: 'paid', label: 'Payant', icon: '💰' },
  { id: 'sojori', label: 'Checkout', icon: '🧼' },
  { id: 'checklist', label: 'Checklist', icon: '📋' },
] as const;

type HubTab = (typeof HUB_TABS)[number]['id'];

type Props = {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  templateMode?: boolean;
};

export default function CleaningHubTab({
  listingId,
  ownerId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
}: Props) {
  const [hubTab, setHubTab] = useState<HubTab>('levels');

  const common = { listingId, ownerId, listingValues, onListingPatch, templateMode };

  return (
    <Box>
      <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
        {HUB_TABS.map(t => (
          <Box
            key={t.id}
            component="button"
            type="button"
            onClick={() => setHubTab(t.id)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              px: 1.25,
              py: 0.65,
              borderRadius: 1,
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              ...(hubTab === t.id
                ? { bgcolor: T.primaryTint, color: T.primaryDeep, border: `1px solid ${T.primary}` }
                : { bgcolor: T.bg1, color: T.text2, border: `1px solid ${T.border}` }),
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </Box>
        ))}
      </Stack>

      {hubTab === 'levels' && (
        <MenageOpsPanel
          listingId={listingId}
          listingValues={listingValues}
          gestion={listingValues}
          onListingPatch={onListingPatch}
          templateMode={templateMode}
          focusTrack="all"
        />
      )}
      {hubTab === 'included' && (
        <Stack spacing={2}>
          <MenageOpsPanel
            {...common}
            gestion={listingValues}
            focusTrack="included"/>
          <CleaningConfigTab {...common} forcedSub="included" hideSubNav />
        </Stack>
      )}
      {hubTab === 'paid' && (
        <MenageOpsPanel
          {...common}
          gestion={listingValues}
          focusTrack="paid"/>
      )}
      {hubTab === 'sojori' && (
        <Stack spacing={2}>
          <MenageOpsPanel {...common} gestion={listingValues} focusTrack="checkout" />
          <CleaningSojoriConfigTab {...common} showChecklist={false} />
        </Stack>
      )}
      {hubTab === 'checklist' && <CleaningChecklistPanel {...common} />}
    </Box>
  );
}
