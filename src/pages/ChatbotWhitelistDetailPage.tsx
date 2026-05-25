import { DashboardWrapper } from '../components/DashboardWrapper';
import ChatbotWhitelistDetailView from '../features/chatbot/ChatbotWhitelistDetailView';

export default function ChatbotWhitelistDetailPage() {
  return (
    <DashboardWrapper breadcrumb={['Chatbot', 'Whitelist', 'Détail']}>
      <ChatbotWhitelistDetailView />
    </DashboardWrapper>
  );
}
