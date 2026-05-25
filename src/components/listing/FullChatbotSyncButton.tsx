import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import * as fullchatbotApi from '../../services/fullchatbotApi';

type Props = {
  listingId?: string;
  variant?: 'listing' | 'bulk';
  size?: 'small' | 'medium';
  sx?: Record<string, unknown>;
};

export default function FullChatbotSyncButton({
  listingId,
  variant = 'listing',
  size = 'small',
  sx,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (variant === 'bulk') {
        const res = await fullchatbotApi.syncAllListingSnapshots({ activeOnly: true });
        const synced = res?.data?.synced ?? 0;
        const total = res?.data?.total ?? 0;
        toast.success(`FullChatbot : ${synced}/${total} listings synchronisés`);
      } else {
        if (!listingId) {
          toast.error('Listing introuvable');
          return;
        }
        await fullchatbotApi.syncListingSnapshot(listingId);
        toast.success('Snapshot FullChatbot synchronisé');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur synchronisation FullChatbot';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const label =
    variant === 'bulk'
      ? loading
        ? 'Sync FullChatbot…'
        : 'Synchroniser tout → FullChatbot'
      : loading
        ? 'Sync…'
        : 'Sync FullChatbot';

  return (
    <Button
      type="button"
      size={size}
      disabled={loading || (variant === 'listing' && !listingId)}
      onClick={() => void handleClick()}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        fontSize: 12,
        ...sx,
      }}
    >
      {loading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
      {label}
    </Button>
  );
}
