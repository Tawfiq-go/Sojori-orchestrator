import { Navigate } from 'react-router-dom';

/** Redirige vers orchestration config · onglet Config (WhatsApp Meta). */
export default function TasksWhatsAppMessagesPage() {
  return <Navigate to="/tasks/orchestration-config?tab=config" replace />;
}
