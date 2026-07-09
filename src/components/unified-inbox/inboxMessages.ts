import type { MessageExchange } from '../../types/messages.types';
import type { Message, QuickTemplate } from '../../types/unifiedInbox.types';
import { formatInboxDaySeparator } from './inboxFormat';
import { formatInboxMessageText } from './formatInboxMessageText';

export function outboundInboxExchange(text: string): MessageExchange {
  return {
    user_message: '',
    ai_response: text,
    ai_response_content_type: 'text',
    timestamp: new Date().toISOString(),
    sent_by_admin: true,
    ai_response_send_status: 'sent',
  };
}

export function buildInboxMessages(exchanges: MessageExchange[], isOta = false): Message[] {
  const sorted = [...exchanges].sort(
    (a, b) =>
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime(),
  );
  return sorted.flatMap((exchange, index) => {
    const msgs: Message[] = [];
    if (index === 0 || isDifferentDay(exchange.timestamp, sorted[index - 1]?.timestamp)) {
      msgs.push({
        id: `day-${index}`,
        from: 'guest',
        text: formatInboxDaySeparator(exchange.timestamp),
        time: '',
        type: 'day-separator',
      });
    }

    const userText = formatInboxMessageText(exchange.user_message?.trim());
    if (userText) {
      if (isOta && userText.startsWith('[Auto]')) {
        msgs.push({
          id: `sys-${index}`,
          from: 'sojori',
          text: userText.replace(/^\[Auto\]\s*/, '⚙ Auto · '),
          time: '',
          type: 'system-note',
        });
      } else {
        msgs.push({
          id: `user-${index}`,
          from: exchange.sent_by_admin ? 'you' : 'guest',
          text: userText,
          time: formatTime(exchange.timestamp),
          status: exchange.sent_by_admin ? exchange.user_message_status : undefined,
        });
      }
    }

    const aiText = formatInboxMessageText(exchange.ai_response?.trim());
    if (aiText) {
      const isAutoTemplate =
        isOta &&
        (exchange.ai_response_message_source === 'orchestrator' ||
          exchange.ai_response_content_type === 'template');
      if (isAutoTemplate && !userText) {
        msgs.push({
          id: `sys-ai-${index}`,
          from: 'sojori',
          text: `⚙ Auto · ${aiText.slice(0, 80)}`,
          time: '',
          type: 'system-note',
        });
      } else {
        const waStatus = exchange.ai_response_send_status;
        const waFailed = waStatus === 'failed';
        msgs.push({
          id: `ai-${index}`,
          from: exchange.sent_by_admin ? 'you' : 'sojori',
          text: aiText,
          time: formatTime(exchange.timestamp),
          isAI: !exchange.sent_by_admin,
          status: waFailed ? undefined : waStatus === 'sent' ? 'sent' : undefined,
          whatsappDelivery: waStatus,
          whatsappDeliveryError: exchange.ai_response_send_error ?? null,
          processingTrace: exchange.processing_trace,
          aiModel: exchange.ai_model,
          tokensUsed: exchange.tokens_used,
          contentType: exchange.ai_response_content_type,
        });
      }
    }
    return msgs;
  });
}

export const WA_QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'wa-1', label: '👋 Bienvenue', icon: '👋', text: 'Bienvenue !' },
  { id: 'wa-2', label: '🔑 Code accès', icon: '🔑', text: 'Voici votre code d\'accès :' },
  { id: 'wa-3', label: '📍 Itinéraire', icon: '📍', text: 'Itinéraire :' },
  { id: 'wa-4', label: '📶 Wifi', icon: '📶', text: 'Wifi :' },
  { id: 'wa-5', label: '+ Plus', icon: '+', text: '' },
];

export const OTA_QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'ota-1', label: '👋 Welcome', icon: '👋', text: 'Welcome!' },
  { id: 'ota-2', label: '🔑 Check-in', icon: '🔑', text: 'Check-in info:' },
  { id: 'ota-3', label: '📍 Directions', icon: '📍', text: 'Directions:' },
  { id: 'ota-4', label: '⭐ Review request', icon: '⭐', text: 'Thank you for your stay!' },
];

export const OTA_QUICK_REPLIES: QuickTemplate[] = [
  { id: 'qr-1', label: '✅ Oui, 18h ça marche', icon: '✅', text: 'Oui, 18h ça marche' },
  { id: 'qr-2', label: '⏰ Plutôt 19h ?', icon: '⏰', text: 'Plutôt 19h ?' },
];

function formatTime(timestamp?: string): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function isDifferentDay(ts1?: string, ts2?: string): boolean {
  if (!ts1 || !ts2) return true;
  return new Date(ts1).toDateString() !== new Date(ts2).toDateString();
}
