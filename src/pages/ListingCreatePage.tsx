import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import ListingFormV2 from '../components/listing/form-v2/ListingFormV2';
import {
  ListingTypeChooser,
  MultiListingCreateShell,
} from '../components/listing/multi';
import { useMutation } from '@tanstack/react-query';
import listingsService from '../services/listingsService';
import { mergeFormV2ToCreatePropertyPayload } from '../utils/listingFormV2ApiAdapter';
import { toast } from 'react-toastify';
import { btnGhostSx, tokens as t } from '../components/dashboard/DashboardV2.components';

/** Create Single — inchangé (UI gelée). */
function buildEmptySingleCreateValues(): Record<string, unknown> {
  return {
    name: '',
    propertyUnit: 'Single',
    active: false,
    directEnabled: false,
    atSojori: true,
    country: '',
    city: '',
    cityId: '',
    address: '',
    description: [],
    listingImages: [],
    listingAmenitiesIds: [],
    roomTypes: [
      {
        roomTypeName: 'Standard Room',
        basePrice: 0,
        ratePlanIds: [],
        amenitiesIds: [],
        roomTypeImages: [],
        bedTypes: [],
        useAddress: true,
        active: true,
        personCapacity: 0,
        bedroomsNumber: 0,
        bedsNumber: 0,
        bathroomsNumber: 0,
        roomNumber: 1,
        startCode: 0,
        ranking: 0,
        surface: 0,
        roomAmenities: [],
      },
    ],
    rulesAndInfo: { Rules: [], InfoUtils: [] },
  };
}

export function ListingCreatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const propertyUnit = searchParams.get('propertyUnit');

  const { mutate: createListing, isPending: isSaving } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      listingsService.createListingProperty(mergeFormV2ToCreatePropertyPayload(values)),
    onSuccess: (data) => {
      const newId = String(data._id ?? data.id ?? '');
      if (!newId) {
        toast.error('Listing créé mais ID introuvable dans la réponse');
        return;
      }
      toast.success('Listing créé avec succès');
      navigate(`/listings/${newId}`, { replace: true });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || 'Erreur lors de la création');
    },
  });

  if (!propertyUnit || !['Single', 'Multi'].includes(propertyUnit)) {
    return (
      <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Nouveau']}>
        <ListingTypeChooser
          onContinue={(unit) => setSearchParams({ propertyUnit: unit })}
          onBack={() => navigate('/listings')}
        />
      </DashboardWrapper>
    );
  }

  // ── Multi : parcours RoomType-first (maquette Claude Design) ──
  if (propertyUnit === 'Multi') {
    return (
      <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Nouveau', 'Multi']}>
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 13, color: t.text2 }}>
            Création · <strong>Multi</strong> — structure à chambres
          </Typography>
        </Box>
        <MultiListingCreateShell
          onSave={(values) => createListing(values)}
          isSaving={isSaving}
          onBack={() => setSearchParams({})}
        />
      </DashboardWrapper>
    );
  }

  // ── Single : formulaire existant (gelé) ──
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Nouveau', 'Single']}>
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13, color: t.text2 }}>
          Création · <strong>Single</strong>
          <Box
            component="span"
            sx={{
              ml: 1,
              fontSize: 10,
              fontWeight: 700,
              color: t.text3,
              background: '#f0eee8',
              px: 1,
              py: 0.3,
              borderRadius: '5px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            UI gelée
          </Box>
        </Typography>
        <Button size="small" sx={btnGhostSx} onClick={() => setSearchParams({})}>
          Changer le type
        </Button>
      </Box>
      <ListingFormV2
        initialValues={buildEmptySingleCreateValues()}
        onSave={(values) => createListing(values as Record<string, unknown>)}
        isSaving={isSaving}
      />
    </DashboardWrapper>
  );
}

export default ListingCreatePage;
