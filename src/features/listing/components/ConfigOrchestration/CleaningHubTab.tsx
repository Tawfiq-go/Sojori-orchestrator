// Hub ménage : inclus · payant · Sojori · checklist globale
import React, { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import CleaningConfigTab from './CleaningConfigTab';
import CleaningSojoriConfigTab from './CleaningSojoriConfigTab';
import CleaningChecklistPanel from './CleaningChecklistPanel';

const HUB_TABS = [
  { id: 'included', label: 'Ménage inclus', icon: '🎁' },
  { id: 'paid', label: 'Ménage payant', icon: '💰' },
  { id: 'sojori', label: 'Ménage Sojori', icon: '🧼' },
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
  const [hubTab, setHubTab] = useState<HubTab>('included');

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

      {hubTab === 'included' && (
        <CleaningConfigTab {...common} forcedSub="included" hideSubNav />
      )}
      {hubTab === 'paid' && (
        <CleaningConfigTab {...common} forcedSub="paid" hideSubNav />
      )}
      {hubTab === 'sojori' && (
        <CleaningSojoriConfigTab {...common} showChecklist={false} />
      )}
      {hubTab === 'checklist' && (
        <CleaningChecklistPanel {...common} />
      )}
    </Box>
  );
}
