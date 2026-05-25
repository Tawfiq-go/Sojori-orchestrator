import { DashboardWrapper } from '../components/DashboardWrapper';
import ChatbotWhitelistView from '../features/chatbot/ChatbotWhitelistView';

export default function ChatbotWhitelistPage() {
  return (
    <DashboardWrapper breadcrumb={['Chatbot', 'Whitelist']}>
      <ChatbotWhitelistView />
    </DashboardWrapper>
  );
}
