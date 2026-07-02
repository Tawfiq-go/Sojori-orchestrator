import React from 'react';
import { Box } from '@mui/material';
import OwnerFilterField from '../OwnerFilterBar/OwnerFilterField';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';

export function AdminBusinessScopeTopFilter() {
  const { showOwnerFilter } = useAdminOwnerFilter();
  if (!showOwnerFilter) return null;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        minWidth: 220,
        maxWidth: 420,
        px: 1,
      }}
    >
      <OwnerFilterField explicitScope toolbarInputHeight={36} sx={{ width: '100%', maxWidth: 400 }} />
    </Box>
  );
}
