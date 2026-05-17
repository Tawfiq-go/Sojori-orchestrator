import React from 'react';
import { Box } from '@mui/material';
import OwnerFilterField from './OwnerFilterField';

/** Fixed control height avoids floating label overflow being clipped by parent flex rows */
const OWNER_FILTER_TOOLBAR_HEIGHT = 40;

/**
 * Top strip or inline autofill for the admin « Propriétaire » filter.
 * @param {object} props
 * @param {boolean} [props.inline] — compact for toolbars; no full-width strip (deprecated: use <OwnerFilterField /> in-page)
 */
export default function OwnerFilterBar({ inline = false }) {
  if (inline) {
    return (
      <OwnerFilterField
        toolbarInputHeight={OWNER_FILTER_TOOLBAR_HEIGHT}
        sx={{ minWidth: 200, maxWidth: 360, flex: 1 }}
      />
    );
  }
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: { xs: 0.5, sm: 1 },
        overflow: 'visible',
        borderBottom: '1px solid rgba(255, 107, 53, 0.2)',
        bgcolor: 'rgba(255, 243, 224, 0.35)',
      }}
    >
      <OwnerFilterField
        toolbarInputHeight={OWNER_FILTER_TOOLBAR_HEIGHT}
        sx={{ minWidth: 220, maxWidth: 400, flex: 1 }}
      />
    </Box>
  );
}
