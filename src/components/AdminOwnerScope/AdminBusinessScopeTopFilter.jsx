import React, { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { useLocation } from 'react-router-dom';
import OwnerFilterField from '../OwnerFilterBar/OwnerFilterField';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import TemplateAdminSyncPmsButton from './TemplateAdminSyncPmsButton';

/** Pages où le scope = Template Admin (référence) + PMs — pas « Tous (plateforme) ». */
function isTemplateAdminScopePath(pathname) {
  const p = String(pathname || '');
  return (
    p.startsWith('/listings/orchestration-model') ||
    p.startsWith('/orchestration/config')
  );
}

export function AdminBusinessScopeTopFilter() {
  const { showOwnerFilter } = useAdminOwnerFilter();
  const location = useLocation();
  const templateAdminFirst = useMemo(
    () => isTemplateAdminScopePath(location.pathname),
    [location.pathname],
  );

  if (!showOwnerFilter) return null;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        minWidth: 220,
        maxWidth: templateAdminFirst ? 560 : 420,
        px: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ width: '100%', maxWidth: templateAdminFirst ? 540 : 400 }}
      >
        <OwnerFilterField
          explicitScope
          templateAdminFirst={templateAdminFirst}
          toolbarInputHeight={36}
          sx={{ flex: 1, minWidth: 0, maxWidth: 'none' }}
        />
        {templateAdminFirst ? <TemplateAdminSyncPmsButton /> : null}
      </Stack>
    </Box>
  );
}
