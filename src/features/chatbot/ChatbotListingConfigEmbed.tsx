import React from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import ChatbotListingDetailTabs from './ChatbotListingDetailTabs';
import * as fullchatbotApi from '../../services/fullchatbotApi';
import listingsService from '../../services/listingsService';
import {
  mapApiToFormV2Values,
  mergeFormV2ToUpdatePropertyPayload,
} from '../../utils/listingFormV2ApiAdapter';

type Props = {
  listingId: string;
  snapshotUpdatedAt?: string;
  defaultTab?: string;
};

export default function ChatbotListingConfigEmbed({
  listingId,
  snapshotUpdatedAt,
  defaultTab = 'access-config',
}: Props) {
  const queryClient = useQueryClient();

  const { data: listingDoc, isLoading, error } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingsService.getListingDocument(listingId),
    enabled: Boolean(listingId),
  });

  const formValues = listingDoc ? mapApiToFormV2Values(listingDoc) : null;

  const { data: listingStructure } = useQuery({
    queryKey: ['listing-structure'],
    queryFn: () => listingsService.getListingStructure(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: roomTypeConfigs = [] } = useQuery({
    queryKey: ['room-type-configs'],
    queryFn: () => listingsService.getRoomTypeConfigs(),
    staleTime: 5 * 60 * 1000,
  });

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

  const { mutate: saveListing } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      listingsService.updateListingProperty(listingId, mergeFormV2ToUpdatePropertyPayload(values)),
    onSuccess: () => {
      toast.success('Listing enregistré');
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement');
    },
  });

  const { mutate: verifyRuChannels, isPending: verifyRuLoading } = useMutation({
    mutationFn: () => listingsService.verifyOtaChannels(listingId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Canaux OTA vérifiés');
        queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      } else {
        toast.error(result.error || 'Erreur vérification');
      }
    },
  });

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
        configDefaultTab={defaultTab}
        onSave={saveListing}
        onImagesPersisted={() => {
          queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
        }}
        onVerifyRuChannels={verifyRuChannels}
        verifyRuLoading={verifyRuLoading}
        listingStructure={listingStructure ?? null}
        roomTypeConfigs={roomTypeConfigs}
      />
    </Box>
  );
}
