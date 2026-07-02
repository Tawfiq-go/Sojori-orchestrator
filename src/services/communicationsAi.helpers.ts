import type { Message } from '../types/unifiedInbox.types';
import type { MessageExchange } from '../types/messages.types';

export function buildOtaThreadContextForAi(messages: Message[]): string {
  return messages
    .filter((m) => m.type !== 'day-separator' && m.type !== 'system-note')
    .map((m) => {
      const line = String(m.text || '').trim();
      if (!line) return null;
      const prefix = m.from === 'guest' ? 'Client' : 'Staff';
      return `${prefix}: ${line}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function getLastGuestMessageFromInbox(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.type === 'day-separator' || m.type === 'system-note') continue;
    if (m.from === 'guest') return String(m.text || '').trim();
  }
  return '';
}

export function buildWhatsappThreadContextForAi(exchanges: MessageExchange[] = []): string {
  return exchanges
    .map((ex) => {
      const user = String(ex.user_message || '').trim();
      const ai = String(ex.ai_response || '').trim();
      const parts: string[] = [];
      if (user) parts.push(`${ex.sent_by_admin ? 'Staff' : 'Client'}: ${user}`);
      if (ai) parts.push(`${ex.sent_by_admin ? 'Staff' : 'Sojori'}: ${ai}`);
      return parts.join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

export function getLastGuestMessageFromExchanges(exchanges: MessageExchange[] = []): string {
  for (let i = exchanges.length - 1; i >= 0; i--) {
    const ex = exchanges[i];
    const user = String(ex.user_message || '').trim();
    if (user && !ex.sent_by_admin) return user;
  }
  return '';
}

export function i18nLanguageToApiCode(lang?: string): string {
  if (!lang || typeof lang !== 'string') return 'fr';
  const base = lang.split('-')[0].toLowerCase();
  return base || 'fr';
}
