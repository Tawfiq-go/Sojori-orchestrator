import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import SyncStatusBanner from '../ChatbotMenuConfig/SyncStatusBanner';
import { T, menuBtnOutlined, menuBtnPrimary } from '../ChatbotMenuConfig/menuTheme';

export default function ConfigPanelToolbar({
  title,
  syncStatus,
  syncLoading,
  onSync,
  isSyncing,
  onCopyOwner,
  onRefresh,
  isFetching,
  onReset,
  copyLabel = 'Copier depuis le propriétaire',
  showReset = true,
}) {
  return (
    <Box
      sx={{
        mb: 2,
        py: 1.25,
        px: 1.5,
        borderRadius: 1.25,
        background: `linear-gradient(135deg, ${T.primaryTint} 0%, ${T.bg2} 55%)`,
        border: `1px solid ${T.border}`,
      }}
    >
      {title && (
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text, mb: 0.75 }}>{title}</Typography>
      )}
      <Stack direction="row" sx={{ alignItems: 'center',  flexWrap: 'wrap', gap: 1 }}>
        <SyncStatusBanner syncStatus={syncStatus} loading={syncLoading} onSync={onSync} isSyncing={isSyncing} />
        <Box sx={{ flex: 1, minWidth: 8 }} />
        {onCopyOwner && (
          <Button variant="contained" size="small" onClick={onCopyOwner} sx={menuBtnPrimary}>
            {copyLabel}
          </Button>
        )}
        {onRefresh && (
          <Button variant="outlined" size="small" onClick={onRefresh} disabled={isFetching} sx={menuBtnOutlined}>
            {isFetching ? '…' : 'Actualiser'}
          </Button>
        )}
        {showReset && onReset && (
          <Button
            variant="outlined"
            size="small"
            onClick={onReset}
            sx={{ ...menuBtnOutlined, color: T.error, borderColor: 'rgba(200,30,30,0.35)' }}
          >
            Réinit. admin
          </Button>
        )}
      </Stack>
    </Box>
  );
}
