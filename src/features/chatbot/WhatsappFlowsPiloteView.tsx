import './whatsappFlowsPilote.css';

/**
 * Pilote WhatsApp Flows — design handoff from Claude Design.
 * Static HTML prototype (phone mockups, flow steps, Meta payloads).
 */
export default function WhatsappFlowsPiloteView() {
  return (
    <div className="wa-flows-pilote-frame">
      <iframe
        title="Sojori WhatsApp Flows Pilote"
        src="/chatbot/whatsapp-flows-pilote.html"
        className="wa-flows-pilote-iframe"
      />
    </div>
  );
}
