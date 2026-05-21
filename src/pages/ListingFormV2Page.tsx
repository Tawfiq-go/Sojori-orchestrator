import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import ListingFormV2 from '../components/listing/form-v2/ListingFormV2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import listingsService from '../services/listingsService';
import {
  mapApiToFormV2Values,
  mergeFormV2ToUpdatePropertyPayload,
} from '../utils/listingFormV2ApiAdapter';
import { toast } from 'react-toastify';

export function ListingFormV2Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelParam = searchParams.get('level');
  const tabParam = searchParams.get('tab');
  const defaultLevel =
    levelParam === 'config-new' || levelParam === 'config' || levelParam === 'detail'
      ? levelParam
      : 'detail';
  const queryClient = useQueryClient();

  // Fetch listing data
  const { data: listingDoc, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsService.getListingDocument(id!),
    enabled: !!id,
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

  // Update listing mutation
  const { mutate: saveListing, isPending: isSaving } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      listingsService.updateListingProperty(
        id!,
        mergeFormV2ToUpdatePropertyPayload(values),
      ),
    onSuccess: () => {
      toast.success('Listing enregistré avec succès');
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de l\'enregistrement');
    },
  });

  // Verify Rental United OTA channels mutation
  const { mutate: verifyRuChannels, isPending: isVerifyingRu } = useMutation({
    mutationFn: () => listingsService.verifyOtaChannels(id!),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Canaux OTA vérifiés avec succès');
        queryClient.invalidateQueries({ queryKey: ['listing', id] });
      } else {
        toast.error(result.error || 'Erreur lors de la vérification');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la vérification des canaux OTA');
    },
  });

  if (isLoading) {
    return (
      <DashboardWrapper>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
        }}>
          <CircularProgress size={48} sx={{ color: '#b8851a' }} />
        </Box>
      </DashboardWrapper>
    );
  }

  if (error) {
    return (
      <DashboardWrapper>
        <Box sx={{ p: 4 }}>
          <Alert severity="error">
            Erreur lors du chargement du listing : {(error as Error)?.message}
          </Alert>
        </Box>
      </DashboardWrapper>
    );
  }

  if (!formValues) {
    return (
      <DashboardWrapper>
        <Box sx={{ p: 4 }}>
          <Alert severity="warning">
            Listing introuvable
          </Alert>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <ListingFormV2
        listingId={id!}
        initialValues={formValues}
        defaultLevel={defaultLevel}
        defaultTab={tabParam || undefined}
        onSave={saveListing}
        onImagesPersisted={() => {
          queryClient.invalidateQueries({ queryKey: ['listing', id] });
        }}
        isSaving={isSaving}
        onVerifyRuChannels={verifyRuChannels}
        verifyRuLoading={isVerifyingRu}
        listingStructure={listingStructure ?? null}
        roomTypeConfigs={roomTypeConfigs}
      />
    </DashboardWrapper>
  );
}

export default ListingFormV2Page;
