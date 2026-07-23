/**
 * Montant à afficher comme « prix / payé » d’une réservation.
 *
 * Source : `alreadyPaid` (MAD), déjà converti à l’ingest RU avec le taux admin
 * (`exchangerates.rate`) — pas un ×10 en dur côté UI.
 *
 * = total déjà payé (ex. ChannelTotal Booking), **hors taxes non payées**
 * (ex. taxe de séjour sur place dans ClientPrice mais pas dans AlreadyPaid).
 *
 * Fallback : `totalPrice` (loyer / RUPrice converti) si `alreadyPaid` absent.
 */
export function reservationPaidDisplay(r: {
  alreadyPaid?: number | null;
  totalPrice?: number | null;
  currency?: string | null;
}): { amount: number | null; currency: string; source: 'alreadyPaid' | 'totalPrice' | null } {
  const currency = (r.currency && String(r.currency).trim()) || 'MAD';
  const paid = Number(r.alreadyPaid);
  if (Number.isFinite(paid) && paid > 0) {
    return { amount: paid, currency, source: 'alreadyPaid' };
  }
  const total = Number(r.totalPrice);
  if (Number.isFinite(total) && total > 0) {
    return { amount: total, currency, source: 'totalPrice' };
  }
  return { amount: null, currency, source: null };
}

export function formatReservationPaid(r: {
  alreadyPaid?: number | null;
  totalPrice?: number | null;
  currency?: string | null;
}): string | null {
  const { amount, currency } = reservationPaidDisplay(r);
  if (amount == null) return null;
  return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
}
