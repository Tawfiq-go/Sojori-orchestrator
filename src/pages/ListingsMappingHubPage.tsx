import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Link, Tab, Tabs, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import { MappingHubView } from '../components/catalogue/MappingHubView';
import { LISTING_RU_MAPPING_GROUPS } from '../config/listingRuMappingCatalog';
import { AmenitiesConfigPage } from '../features/listingMapping/components/AmenitiesConfigPage';
import { ImagesConfigPage } from '../features/listingMapping/components/ImagesConfigPage';
import { PropertyTypesMappingPanel } from '../features/listingMapping/components/PropertyTypesMappingPanel';

const NATIVE_TABS = [
  { slug: '', label: 'Index' },
  { slug: 'amenities', label: 'Amenities' },
  { slug: 'images', label: 'Images' },
  { slug: 'property-types', label: 'Property types' },
] as const;

function MappingUrlHint() {
  const { pathname } = useLocation();
  const full =
    typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : pathname;

  return (
    <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
      <Typography sx={{ fontSize: 12 }}>
        URL directe :{' '}
        <Link href={full} underline="hover" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
          {full}
        </Link>
        {' · '}
        Amenities catalogue OTA :{' '}
        <Link
          href={`${typeof window !== 'undefined' ? window.location.origin : ''}/listings/mapping/amenities`}
          underline="hover"
          sx={{ fontFamily: 'monospace', fontSize: 12 }}
        >
          /listings/mapping/amenities
        </Link>
      </Typography>
    </Alert>
  );
}

function MappingSubNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sub = pathname.replace(/^\/listings\/mapping\/?/, '');
  const tabValue = sub.startsWith('amenities')
    ? 'amenities'
    : sub.startsWith('images')
      ? 'images'
      : sub.startsWith('property-types')
        ? 'property-types'
        : sub || '';

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={tabValue}
        onChange={(_, v) => {
          if (v === 'amenities') navigate('/listings/mapping/amenities');
          else if (v === 'images') navigate('/listings/mapping/images');
          else navigate(v ? `/listings/mapping/${v}` : '/listings/mapping');
        }}
        sx={{ minHeight: 40 }}
      >
        {NATIVE_TABS.map((t) => (
          <Tab key={t.slug || 'index'} value={t.slug} label={t.label} sx={{ minHeight: 40, fontSize: 13 }} />
        ))}
      </Tabs>
    </Box>
  );
}

function MappingIndex() {
  const navigate = useNavigate();
  return (
    <MappingHubView
      title="Mapping listing · RU"
      subtitle="Référentiels srv-listing pour import/publication RU. Les écrans marqués natif sont déjà migrés dans l’orchestrator."
      groups={LISTING_RU_MAPPING_GROUPS}
      searchPlaceholder="Rechercher (amenity, image, room, RU, tax…)"
      onOpenNative={(slug) =>
        navigate(slug === 'amenities' ? '/listings/mapping/amenities' : `/listings/mapping/${slug}`)
      }
    />
  );
}

export function ListingsMappingHubPage() {
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Mapping RU']}>
      <Box sx={{ width: '100%', pb: 3 }}>
        <CatalogueAnnoncesTabs />
        <MappingUrlHint />
        <MappingSubNav />
        <Box sx={{ pt: 0.5 }}>
          <Routes>
            <Route index element={<MappingIndex />} />
            <Route path="amenities/*" element={<AmenitiesConfigPage />} />
            <Route path="images/*" element={<ImagesConfigPage />} />
            <Route path="property-types" element={<PropertyTypesMappingPanel />} />
            <Route path="*" element={<Navigate to="/listings/mapping" replace />} />
          </Routes>
        </Box>
      </Box>
    </DashboardWrapper>
  );
}

export default ListingsMappingHubPage;
