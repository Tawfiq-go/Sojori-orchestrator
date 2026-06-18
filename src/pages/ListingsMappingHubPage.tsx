import { DashboardWrapper } from '../components/DashboardWrapper';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import { MappingHubView } from '../components/catalogue/MappingHubView';
import { LISTING_RU_MAPPING_GROUPS } from '../config/listingRuMappingCatalog';

export function ListingsMappingHubPage() {
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Mapping RU']}>
      <CatalogueAnnoncesTabs />
      <MappingHubView
        title="Mapping listing · RU"
        subtitle="Référentiels utilisés à l’import et à la publication RU (amenities, photos, chambres, frais). Base principale srv-listing — à migrer ici progressivement."
        groups={LISTING_RU_MAPPING_GROUPS}
        searchPlaceholder="Rechercher (amenity, image, room, RU, tax…)"
      />
    </DashboardWrapper>
  );
}

export default ListingsMappingHubPage;
