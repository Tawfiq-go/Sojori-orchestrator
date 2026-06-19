import { DashboardWrapper } from '../components/DashboardWrapper';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import ChatbotListingSnapshotView from '../features/chatbot/ChatbotListingSnapshotView';

export default function ChatbotListingSnapshotPage() {
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Listing chatbot']} compactMain>
      <CatalogueAnnoncesTabs />
      <ChatbotListingSnapshotView />
    </DashboardWrapper>
  );
}
