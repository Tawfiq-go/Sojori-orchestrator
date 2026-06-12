/** Tooltip text for failed outbound WhatsApp messages in Communications inbox. */
export function formatWhatsAppDeliveryError(raw?: string | null): string {
  const text = raw?.trim()
  if (!text) {
    return 'Message enregistré en base mais non délivré sur WhatsApp.';
  }

  if (/#2\b|erreur #2|error.*#2/i.test(text)) {
    return [
      'Échec API WhatsApp (#2).',
      'Si le test Meta fonctionne : phone_number_id ou token ne correspondent pas.',
      'Attendu : ID 383912338140204 (+212 773 745388) + token srv-chatbot-secrets.',
      '',
      `Détail : ${text}`,
    ].join('\n');
  }

  if (/WHATSAPP_ACCESS_TOKEN|PHONE_NUMBER_ID|non configuré/i.test(text)) {
    return [
      'WhatsApp non configuré sur srv-fullchatbot.',
      'Vérifiez srv-fullchatbot-secrets (token + phone number ID).',
      '',
      `Détail : ${text}`,
    ].join('\n');
  }

  if (/#190\b/i.test(text)) {
    return [
      'Token WhatsApp expiré ou invalide (#190).',
      'Régénérez le token dans Meta Business → srv-fullchatbot-secrets.',
      '',
      `Détail : ${text}`,
    ].join('\n');
  }

  return text;
}
