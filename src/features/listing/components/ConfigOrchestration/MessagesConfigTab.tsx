// Instructions départ — même éditeur que l’onglet listing (consignes + liste + taxes)
import React from 'react';
import { Box } from '@mui/material';
import ListingDepartureTab from '../../../../components/listing/form-v2/tabs/ListingDepartureTab';

interface Props {
  listingId: string;
  ownerId?: string;
  referenceListingId?: string | null;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  templateMode?: boolean;
}

export default function MessagesConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
}: Props) {
  return (
    <Box>
      <ListingDepartureTab
        values={listingValues}
        listingId={listingId}
        templateMode={templateMode}
        onChange={(arg1, arg2) => {
          const patch =
            typeof arg1 === 'string' ? { [arg1]: arg2 } : ((arg1 || {}) as Record<string, unknown>);
          void onListingPatch?.(patch);
        }}
      />
    </Box>
  );
}
