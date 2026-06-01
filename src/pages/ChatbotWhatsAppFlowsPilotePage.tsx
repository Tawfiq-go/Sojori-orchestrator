import { DashboardWrapper } from '../components/DashboardWrapper';
import WhatsappFlowsPiloteView from '../features/chatbot/WhatsappFlowsPiloteView';

export default function ChatbotWhatsAppFlowsPilotePage() {
  return (
    <DashboardWrapper breadcrumb={['Chatbot', 'Flows pilote']} compactMain>
      <WhatsappFlowsPiloteView />
    </DashboardWrapper>
  );
}
