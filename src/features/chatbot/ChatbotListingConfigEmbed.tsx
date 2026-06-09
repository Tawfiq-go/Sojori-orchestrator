import React from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ChatbotListingDetailTabs from './ChatbotListingDetailTabs';
import * as fullchatbotApi from '../../services/fullchatbotApi';
import listingsService from '../../services/listingsService';
import { mapApiToFormV2Values } from '../../utils/listingFormV2ApiAdapter';

type Props = {
  listingId: string;
  snapshotUpdatedAt?: string;
};

export default function ChatbotListingConfigEmbed({
  listingId,
  snapshotUpdatedAt,
}: Props) {
  const { data: listingDoc, isLoading, error } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingsService.getListingDocument(listingId),
    enabled: Boolean(listingId),
    staleTime: 2 * 60 * 1000,
  });

  const formValues = listingDoc ? mapApiToFormV2Values(listingDoc) : null;

  const { data: snapshotRes } = useQuery({
    queryKey: ['fullchatbot-snapshot', listingId],
    queryFn: () => fullchatbotApi.getListingSnapshot(listingId),
    enabled: Boolean(listingId),
    retry: false,
  });

  const snapshotData = snapshotRes?.data as Record<string, unknown> | undefined;
  const menuOptionsCount = Array.isArray(
    (snapshotData?.menu as { menuOptions?: unknown[] } | undefined)?.menuOptions,
  )
    ? (snapshotData?.menu as { menuOptions: unknown[] }).menuOptions.length
    : 0;

  if (isLoading) {
    return (
      <Box className="cb-config-embed" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: '#b8851a' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="cb-config-embed" sx={{ p: 2 }}>
        <Alert severity="error">
          {(error as Error)?.message || 'Erreur chargement du listing'}
        </Alert>
      </Box>
    );
  }

  if (!formValues || !listingDoc) {
    return (
      <Box className="cb-config-embed" sx={{ p: 2 }}>
        <Alert severity="warning">Listing introuvable</Alert>
      </Box>
    );
  }

  return (
    <Box className="cb-config-embed">
      <ChatbotListingDetailTabs
        listingId={listingId}
        formValues={formValues}
        rawDoc={listingDoc}
        snapshotUpdatedAt={snapshotUpdatedAt}
        menuOptionsCount={menuOptionsCount}
      />
    </Box>
  );
}
