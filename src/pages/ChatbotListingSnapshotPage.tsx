import { DashboardWrapper } from '../components/DashboardWrapper';
import ChatbotListingSnapshotView from '../features/chatbot/ChatbotListingSnapshotView';

export default function ChatbotListingSnapshotPage() {
  return (
    <DashboardWrapper breadcrumb={['Chatbot', 'Listing sync']} compactMain>
      <ChatbotListingSnapshotView />
    </DashboardWrapper>
  );
}
