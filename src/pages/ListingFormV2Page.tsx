import { useParams, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import ListingFormV2 from '../components/listing/form-v2/ListingFormV2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import listingsService from '../services/listingsService';
import calendarService from '../services/calendarService';
import {
  mapApiToFormV2Values,
  mergeFormV2ToUpdatePropertyPayload,
  normalizeLongStayDiscountsFromApi,
  normalizeLastMinuteDiscountsFromApi,
  discountsToApiPayload,
} from '../utils/listingFormV2ApiAdapter';
import { toast } from 'react-toastify';
import { useMemo } from 'react';

/**
 * Edit listing — une seule surface : ListingFormV2 + sidebar.
 * Multi : Infos (types/stock) · Photos · Pricing — sans onglet Types redondant.
 * Single : inchangé.
 */
export function ListingFormV2Page() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const levelParam = searchParams.get('level');
  const tabParamRaw = searchParams.get('tab');
  /** Ancien onglet « Montant & devise » fusionné dans Instructions départ ; channels retiré (RU géré ailleurs) */
  const tabParam =
    tabParamRaw === 'city-tax-config'
      ? 'messages-config'
      : tabParamRaw === 'channels' || tabParamRaw === 'direct'
        ? 'distribution'
        : tabParamRaw === 'rules' || tabParamRaw === 'rules-guest'
          ? 'availability'
          : tabParamRaw;
  const defaultLevel =
    levelParam === 'orchestration-v3' || levelParam === 'config-new' || levelParam === 'config'
      ? 'orchestration-v3'
      : levelParam === 'detail'
        ? 'detail'
        : 'detail';
  const legacyConfigTab =
    tabParam?.endsWith('-config') ||
    tabParam === 'orchestration-config' ||
    tabParam === 'whatsapp-config';
  const resolvedTab =
    defaultLevel === 'orchestration-v3' || legacyConfigTab
      ? undefined
      : tabParam || undefined;
  const queryClient = useQueryClient();

  const { data: listingDoc, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsService.getListingDocument(id!),
    enabled: !!id,
  });

  const formValues = listingDoc ? mapApiToFormV2Values(listingDoc) : null;

  const { data: pricingRule } = useQuery({
    queryKey: ['listing-pricing-discounts', id],
    queryFn: () => calendarService.getDynamicPricingRule(id!),
    enabled: !!id,
  });

  const initialFormValues = useMemo(() => {
    if (!formValues) return null;
    return {
      ...formValues,
      longStayDiscounts: normalizeLongStayDiscountsFromApi(pricingRule?.longStayDiscounts),
      lastMinuteDiscount: normalizeLastMinuteDiscountsFromApi(pricingRule?.lastMinuteDiscount),
    };
  }, [formValues, pricingRule]);

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

  const { mutate: saveListing, isPending: isSaving } = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      await listingsService.updateListingProperty(
        id!,
        mergeFormV2ToUpdatePropertyPayload(values),
      );
      const discounts = discountsToApiPayload(values);
      await calendarService.updatePricingDiscounts(id!, discounts);
    },
    onSuccess: () => {
      toast.success('Listing enregistré avec succès');
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['listing-pricing-discounts', id] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erreur lors de l'enregistrement");
    },
  });

  if (isLoading) {
    return (
      <DashboardWrapper>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
          }}
        >
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

  if (!initialFormValues) {
    return (
      <DashboardWrapper>
        <Box sx={{ p: 4 }}>
          <Alert severity="warning">Listing introuvable</Alert>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <ListingFormV2
        listingId={id!}
        initialValues={initialFormValues}
        importedFieldsSource={initialFormValues}
        defaultLevel={defaultLevel}
        defaultTab={resolvedTab}
        onSave={saveListing}
        onImagesPersisted={() => {
          queryClient.invalidateQueries({ queryKey: ['listing', id] });
        }}
        isSaving={isSaving}
        listingStructure={listingStructure ?? null}
        roomTypeConfigs={roomTypeConfigs}
      />
    </DashboardWrapper>
  );
}

export default ListingFormV2Page;
