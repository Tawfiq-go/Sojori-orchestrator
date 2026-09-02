/** Deep links Inbox Guest (WhatsApp / OTA / Résas). */

/**
 * Lien vers une conversation WhatsApp.
 *
 * On adresse la conversation par son NUMÉRO DE RÉSERVATION, jamais par le
 * téléphone du voyageur : une URL se retrouve dans l'historique du navigateur,
 * les logs serveur et l'en-tête `Referer` envoyé aux tiers. Un numéro de
 * téléphone n'a rien à faire dans une barre d'adresse.
 *
 * `opts.phone` reste accepté pour ne pas casser les appelants, mais il n'est
 * utilisé qu'en dernier recours, quand aucune réservation n'est connue.
 */
export function waInboxUrl(opts: { phone?: string; reservationNumber?: string }): string {
  const params = new URLSearchParams({ section: 'guest', tab: 'whatsapp' });
  if (opts.reservationNumber) {
    params.set('reservation', opts.reservationNumber);
  } else {
    const digits = (opts.phone || '').replace(/\D/g, '');
    if (digits) params.set('phone', digits);
  }
  return `/communications?${params.toString()}`;
}

export function otaInboxUrl(opts: { threadId?: number | string; reservationNumber?: string }): string {
  const params = new URLSearchParams({ section: 'guest', tab: 'ota' });
  if (opts.threadId != null && String(opts.threadId).trim()) {
    params.set('thread', String(opts.threadId));
  }
  if (opts.reservationNumber) params.set('reservation', opts.reservationNumber);
  return `/communications?${params.toString()}`;
}

export function resasInboxUrl(opts?: { reservationNumber?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (opts?.reservationNumber) params.set('reservation', opts.reservationNumber);
  if (opts?.q) params.set('q', opts.q);
  const qs = params.toString();
  return qs ? `/planning?${qs}` : '/planning';
}

export function last9Phone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9);
}
