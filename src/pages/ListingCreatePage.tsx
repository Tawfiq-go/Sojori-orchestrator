import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import ListingFormV2 from '../components/listing/form-v2/ListingFormV2';
import { useMutation } from '@tanstack/react-query';
import listingsService from '../services/listingsService';
import { mergeFormV2ToCreatePropertyPayload } from '../utils/listingFormV2ApiAdapter';
import { toast } from 'react-toastify';
import { btnGhostSx, btnPrimarySx, Panel, tokens as t } from '../components/dashboard/DashboardV2.components';

const UNIT_OPTIONS = [
  {
    value: 'Single',
    title: 'Single unit',
    description: 'Un seul logement — chambres et équipements au niveau listing.',
  },
  {
    value: 'Multi',
    title: 'Multi unit',
    description: 'Plusieurs unités / room types — structure hôtelière ou multi-appartements.',
  },
] as const;

function buildEmptyCreateValues(propertyUnit: string): Record<string, unknown> {
  return {
    name: '',
    propertyUnit,
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
    roomTypes: [{
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
    }],
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
        <Panel title="Type de listing" desc="Choisissez Single ou Multi — comme sur le dashboard legacy.">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, mt: 1 }}>
            {UNIT_OPTIONS.map((opt) => (
              <Box
                key={opt.value}
                sx={{
                  border: `1px solid ${t.border}`,
                  borderRadius: '14px',
                  p: 2.5,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  '&:hover': { borderColor: t.primary, boxShadow: '0 8px 24px rgba(26,20,8,0.08)' },
                }}
                onClick={() => setSearchParams({ propertyUnit: opt.value })}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 0.5 }}>{opt.title}</Typography>
                <Typography sx={{ fontSize: 13, color: t.text2 }}>{opt.description}</Typography>
                <Button sx={{ ...btnPrimarySx, mt: 2 }} onClick={() => setSearchParams({ propertyUnit: opt.value })}>
                  Continuer
                </Button>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 3 }}>
            <Button sx={btnGhostSx} onClick={() => navigate('/listings')}>
              Retour à la liste
            </Button>
          </Box>
        </Panel>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Nouveau', propertyUnit]}>
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13, color: t.text2 }}>
          Création · <strong>{propertyUnit}</strong>
        </Typography>
        <Button size="small" sx={btnGhostSx} onClick={() => setSearchParams({})}>
          Changer le type
        </Button>
      </Box>
      <ListingFormV2
        initialValues={buildEmptyCreateValues(propertyUnit)}
        onSave={(values) => createListing(values as Record<string, unknown>)}
        isSaving={isSaving}
      />
    </DashboardWrapper>
  );
}

export default ListingCreatePage;
