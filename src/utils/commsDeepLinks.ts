/** Deep links Inbox Guest (WhatsApp / OTA / Résas). */

export function waInboxUrl(opts: { phone?: string; reservationNumber?: string }): string {
  const params = new URLSearchParams({ section: 'guest', tab: 'whatsapp' });
  const digits = (opts.phone || '').replace(/\D/g, '');
  if (digits) params.set('phone', digits);
  if (opts.reservationNumber) params.set('reservation', opts.reservationNumber);
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
  const params = new URLSearchParams({ section: 'guest', tab: 'resas' });
  if (opts?.reservationNumber) params.set('reservation', opts.reservationNumber);
  if (opts?.q) params.set('q', opts.q);
  return `/communications?${params.toString()}`;
}

export function last9Phone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9);
}
