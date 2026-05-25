import React from 'react';
import '../planReservation/planReservation.css';
import './chatbotHub.css';

interface Props {
  children: React.ReactNode;
  crumb?: string;
}

/** Shell design Sojori 2026 — même grammaire que Plan réservation. */
export default function ChatbotHubShell({ children, crumb = 'Hub' }: Props) {
  return (
    <div className="so-plan-res so-chatbot-hub">
      <div className="cb-topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-name">
            Chatbot<span>srv-fullchatbot</span>
          </div>
        </div>
        <div className="crumb">
          <span>WhatsApp guest</span>
          <span className="sep">·</span>
          <b>{crumb}</b>
        </div>
        <div className="top-right">
          <span className="refresh-chip">LIVE CACHE</span>
        </div>
      </div>
      <div className="app">{children}</div>
    </div>
  );
}
