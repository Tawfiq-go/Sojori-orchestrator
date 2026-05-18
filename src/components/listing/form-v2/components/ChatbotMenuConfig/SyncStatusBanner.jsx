import React from 'react';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { T, menuBtnOutlined } from './menuTheme';

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const SyncStatusBanner = ({ syncStatus, loading, onSync, isSyncing }) => {
  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={14} sx={{ color: T.primary }} />
        <Typography sx={{ fontSize: 12, color: T.text3 }}>Analyse…</Typography>
      </Stack>
    );
  }

  if (!syncStatus) return null;

  if (!syncStatus.needsSync) {
    return (
      <Typography sx={{ fontSize: 12, color: T.success, fontWeight: 600 }}>
        ✅ À jour · v{syncStatus.listingVersion} · Sync {formatDate(syncStatus.lastSyncedAt)}
      </Typography>
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
      <Typography sx={{ fontSize: 12, color: T.warning, fontWeight: 600 }}>
        ⚠️ v{syncStatus.listingVersion} → v{syncStatus.adminVersion}
      </Typography>
      <Button variant="outlined" size="small" onClick={onSync} disabled={isSyncing} sx={{ ...menuBtnOutlined, minWidth: 0, py: 0.25, height: 28 }}>
        {isSyncing ? '…' : 'Sync'}
      </Button>
    </Stack>
  );
};

export default SyncStatusBanner;
