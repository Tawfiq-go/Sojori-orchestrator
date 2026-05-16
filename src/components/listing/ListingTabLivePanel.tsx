import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Panel, btnGhostSx, tokens as t } from '../dashboard/DashboardV2.components';
import type { ListingFormData } from '../../data/catalogueMock';
import { buildListingTabLivePayload } from '../../utils/listingTabLivePayload';

type ListingTabKey = keyof ListingFormData;

export type ListingTabLivePanelProps = {
  tabKey: ListingTabKey;
  tabLabel: string;
  rawApiDocument: Record<string, unknown> | null | undefined;
  onReload?: () => void | Promise<void>;
};

export function ListingTabLivePanel({
  tabKey,
  tabLabel,
  rawApiDocument,
  onReload,
}: ListingTabLivePanelProps) {
  const [reloading, setReloading] = useState(false);
  const payload = useMemo(
    () => buildListingTabLivePayload(tabKey, rawApiDocument ?? null),
    [tabKey, rawApiDocument],
  );

  const handleReload = async () => {
    if (!onReload) return;
    setReloading(true);
    try {
      await onReload();
    } finally {
      setReloading(false);
    }
  };

  return (
    <Panel
      sx={{
        p: 2,
        mb: 2.5,
        borderColor: t.primary,
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.primary }}>
            srv-listing — extrait document (live)
          </Typography>
          <Typography sx={{ fontSize: 11, color: t.text3 }}>{tabLabel}</Typography>
        </Box>
        {onReload && (
          <Button size="small" sx={btnGhostSx} disabled={reloading} onClick={() => void handleReload()}>
            {reloading ? '…' : 'Recharger'}
          </Button>
        )}
      </Stack>
      <Typography sx={{ fontSize: 10, color: t.text3, mb: 1, fontFamily: 'ui-monospace, monospace' }}>
        GET /api/v1/listing/listings/by-id/:id — champs filtrés pour cet onglet
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight: 420,
          overflow: 'auto',
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          bgcolor: t.bg2,
          borderRadius: '10px',
          border: `1px solid ${t.border}`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {JSON.stringify(payload, null, 2)}
      </Box>
      <Typography sx={{ fontSize: 10, color: t.text3, mt: 1, fontStyle: 'italic' }}>
        Lecture seule. Persistance complète : dashboard admin (update-property) ou endpoints dédiés (CONFIG).
      </Typography>
    </Panel>
  );
}
