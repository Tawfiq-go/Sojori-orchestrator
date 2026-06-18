import { DashboardWrapper } from '../components/DashboardWrapper';
import { MappingHubView } from '../components/catalogue/MappingHubView';
import { ADMIN_GLOBAL_MAPPING_GROUPS } from '../config/adminGlobalMappingCatalog';

export function AdminGlobalMappingHubPage() {
  return (
    <DashboardWrapper breadcrumb={['Administration', 'Mapping global']}>
      <MappingHubView
        title="Mapping global"
        subtitle="Villes, devises, langues, ordre catalogue — référentiels plateforme (srv-admin / srv-calendar), hors mapping champ RU listing."
        groups={ADMIN_GLOBAL_MAPPING_GROUPS}
        searchPlaceholder="Rechercher (ville, devise, langue, blog…)"
      />
    </DashboardWrapper>
  );
}

export default AdminGlobalMappingHubPage;
